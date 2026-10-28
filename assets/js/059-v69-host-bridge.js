
/* ============================================================================
 * v69 · 接入虎扑宿主能力：存档 + 激励视频广告
 *
 * 开发者原话：
 *   「接入虎扑存档以及广告，然后给我预览二维码」
 *
 * 改造前实测：全文件 ColorboxAI 调用 0 处。
 *   · 存档：save()/load() 直接读写 localStorage（第 261/262 行）
 *   · 广告：rewardAd = { request: async()=>({success:true,dev:true}) }（第 150 行）
 *           —— 6 处「看广告」全走它，永远立即成功、不播广告
 *
 * 本层只替换这两个实现，业务代码一行不改：
 *   · window.ColorboxAI.storage.setValue / getValue
 *   · window.ColorboxAI.vatask.completeRewardVideo / getActivityTaskState
 *
 * 关键约定（技能文档硬要求）：
 *   · 广告必须由用户点击触发；进行中禁用按钮；同时只允许一个流程
 *   · 只有 code===200 且 data.rewarded===true 才算成功，其余一律不发奖励
 *   · 失败用接口 message 提示，禁止自行补发奖励
 *   · 存档必须走统一的 storage API，禁止直接 localStorage
 *
 * 降级（开发者未回复提问，按推荐默认执行，见 decisions.json D43/D44/D45）：
 *   · 无虎扑容器（浏览器直接打开/扫码预览/本地双击）→ 存档退回 localStorage、
 *     广告直接放行。保证本地可测、预览不白屏。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v69HostBridge)return;window.__v69HostBridge=true;

/* 宿主能力探测：ColorboxAI 存在且 storage/vatask 子能力可用 */
function hasHost(){
  try{return typeof window.ColorboxAI==='object'&&window.ColorboxAI!==null}catch(e){return false}
}
function hasStorage(){
  try{return hasHost()&&!!(window.__v166CloudSave&&window.__v166CloudSave.available()||window.ColorboxAI.storage&&typeof window.ColorboxAI.storage.getValue==='function')}catch(e){return false}
}
function hasVatask(){ return false; }
window.__v69Host={hasHost:hasHost,hasStorage:hasStorage,hasVatask:hasVatask};

/* ==========================================================================
 * 一、存档接入
 *
 * 技能文档硬约束：「必须使用统一的存储 API，禁止直接使用 localStorage」。
 * 所以本层**不新增任何 localStorage 调用**：
 *   · 有宿主 → 走 window.ColorboxAI.storage.setValue / getValue
 *   · 无宿主 → 原样交给游戏原有的 save()/load()（它们的 localStorage 用法是
 *     改造前就有的、非本层新增；本层只做「有宿主时改道」）
 *
 * save()/load() 在游戏里被大量同步调用，而宿主接口是异步的，
 * 所以维护一份内存镜像：写 → 内存立即可读 + 异步落宿主；读 → 优先内存。
 * ========================================================================== */
var SAVE_KEY='career_save';          /* 宿主侧的键名，与旧存档键分离 */
var memCache=undefined;              /* undefined=未加载；null=确无存档 */

/* 先抓住原始 save/load：无容器时降级要用它们（也是旧存档迁移的读取来源） */
var __origSave=(typeof save==='function')?save:null;
var __origLoad=(typeof load==='function')?load:null;

/* 解析宿主返回值，区分三种情形：
     · undefined/null → 从未存过（可以迁移旧档）
     · 空串 ''        → **玩家主动清过档**（不能再迁移旧档，否则老进度复活）
     · 其它           → 正常存档；解析失败当无档 */
function hostParse(v){
  try{
    if(v==null)return null;
    var data=v;
    if(typeof data==='object'&&data[SAVE_KEY]!==undefined)data=data[SAVE_KEY];
    if(typeof data==='string'){
      if(!data)return CLEARED;          /* '' = 已清档哨兵 */
      var o=JSON.parse(data);
      return (o&&typeof o==='object')?o:null;
    }
    return (typeof data==='object')?data:null;
  }catch(e){return null}   /* 解析失败的坏档一律当无档 */
}
var CLEARED={__v69Cleared:true};

/* 读取：宿主优先；宿主无档时尝试把旧档迁移上去；无宿主交给原 load() */
async function hostLoad(){
  try{
    if(hasStorage()){
      var v=await window.v134ReadHostStorage(SAVE_KEY);
      var data=hostParse(v);
      if(data===CLEARED)return null;           /* 明确清过档：不迁移、直接空 */
      if(data&&data.playerId)return data;
      /* 宿主从未存过 → 把游戏原有的旧档迁移上去（D44 自动迁移） */
      var legacy=null;
      try{if(__origLoad)legacy=__origLoad()}catch(e){}
      if(legacy&&legacy.playerId){
        await hostSave(legacy);
        return legacy;
      }
      return null;
    }
    /* 无宿主：原实现（本地） */
    try{return __origLoad?__origLoad():null}catch(e){return null}
  }catch(e){return null}
}

/* 写入：有宿主 → 统一存储 API；无宿主 → 原 save()。始终更新内存镜像。
   【云端键必须跟随当前存档槽】
   多存档槽（v81）下，槽 1 的云端键是 career_save、槽 2/3 是 career_save_slotN。
   若这里写死 SAVE_KEY，玩家在槽 2/3 玩时会把**槽 1 的云端存档覆盖掉**
   （实测：槽1 云端从第3季被改成槽2 的第1季）。
   槽位由 v81 通过 window.__v81HostKeyForSlot 提供；没有该钩子时退回单档行为。 */
function activeSaveKey(){
  try{
    if(typeof window.__v81HostKeyForSlot==='function'){
      var k=window.__v81HostKeyForSlot();
      if(k)return String(k);
    }
  }catch(e){}
  return SAVE_KEY;
}
/* 按键串行写入，避免较早的异步请求最后落盘，覆盖新进度。 */
/* v134: bounded, coalesced host writes and checked atomic chunk manifests. */
/* v134: bounded, coalesced host writes and checked atomic chunk manifests. */
/* v134: bounded, coalesced host writes and checked atomic chunk manifests. */
/* v134: bounded, coalesced host writes and checked atomic chunk manifests. */
/* v134: bounded, coalesced host writes and checked atomic chunk manifests. */
/* v134: bounded, coalesced host writes and checked atomic chunk manifests. */
/* v134: bounded, coalesced host writes and checked atomic chunk manifests. */
/* v134: bounded, coalesced host writes and checked atomic chunk manifests. */
var hostWrites={};
var hostSequence=0;
window.__v134Sync={slots:{},flush:function(){Object.keys(hostWrites).forEach(function(k){hostDrain(k)})}};
function hostDelay(ms){return typeof setTimeout==='function'?new Promise(function(r){setTimeout(r,ms)}):Promise.resolve()}
function hostResult(result){if(result===false||result&&typeof result==='object'&&(result.ok===false||result.success===false||result.code!=null&&Number(result.code)!==200&&Number(result.code)!==0))throw new Error(result&&result.message||result&&result.error||('storage write rejected'+(result&&result.code!=null?' code '+result.code:'')))}
async function hostRaw(payload){hostResult(await window.ColorboxAI.storage.setValue(payload))}
async function hostVerify(key,value){
 var lastError=null;
 for(var i=0;i<6;i++){
  if(i)await hostDelay([0,100,200,400,800,1600][i]);
  try{var actual=await hostValue(key);if(actual===value||(value===''&&actual==null))return;lastError=null}catch(e){lastError=e}
 }
 throw new Error(lastError?'save verification failed: '+String(lastError.message||lastError):'save readback mismatch: '+key);
}
function hostChecksum(text){var h=2166136261;for(var i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
async function hostValue(key){var v=await window.ColorboxAI.storage.getValue(key);return v&&typeof v==='object'&&v[key]!==undefined?v[key]:v}
window.v134Deleted=function(n){try{return !!localStorage.getItem('bust_deleted_'+n)}catch(e){return false}};
async function v134ReadHostStorage(key,legacy){
 if(!legacy&&window.__v166CloudSave)return window.__v166CloudSave.read(key);
 if(legacy&&!(window.ColorboxAI&&window.ColorboxAI.storage&&typeof window.ColorboxAI.storage.getValue==='function'))return null;
 var slot=key==='career_save'?1:Number((key.match(/^career_save_slot(\d+)$/)||[])[1]);if(slot&&window.v134Deleted(slot))return '';
 for(var attempt=0;attempt<2;attempt++){
  var value=await hostValue(key);
  if(typeof value==='string'&&value.indexOf('b134chunks:')===0){
   try{var manifest=JSON.parse(value.slice(11));if(manifest.version!==1||!Array.isArray(manifest.keys)||manifest.keys.length>160||manifest.keys.some(function(k){return typeof k!=='string'||k.indexOf(key+'__v134_')!==0}))return null;
    var parts=[];for(var i=0;i<manifest.keys.length;i++){var part=await hostValue(manifest.keys[i]);if(typeof part!=='string'||!part)throw Error('missing save chunk');parts.push(part)}value=parts.join('');if(value.length!==manifest.length||hostChecksum(value)!==manifest.checksum)throw Error('save checksum mismatch');
   }catch(e){if(attempt===0)continue;return null}
  }
  if(typeof value==='string'&&window.__v129StorageCodec)value=window.__v129StorageCodec.unpack(value);
  return value;
 }
 return null;
}
window.v134ReadHostStorage=v134ReadHostStorage;
function hostPrepare(key,text){
 var packed=window.__v129StorageCodec?window.__v129StorageCodec.pack(text):text,parts=[];
 var single={};single[key]=packed;var wire=JSON.stringify(single),bytes=0;for(var b=0;b<wire.length;b++){var code=wire.charCodeAt(b);if(code>=0xd800&&code<=0xdbff&&b+1<wire.length&&wire.charCodeAt(b+1)>=0xdc00&&wire.charCodeAt(b+1)<=0xdfff){bytes+=4;b++}else bytes+=code<128?1:code<2048?2:3}
 if(typeof packed==='string'&&bytes>180000){var id=Date.now().toString(36)+'-'+(++hostSequence).toString(36)+'-'+Math.random().toString(36).slice(2,8);for(var start=0;start<packed.length;start+=12000){var k=key+'__v134_'+id+'_'+parts.length;parts.push({key:k,value:packed.slice(start,start+12000)})}packed='b134chunks:'+JSON.stringify({version:1,keys:parts.map(function(p){return p.key}),length:packed.length,checksum:hostChecksum(packed)})}
 return {text:text,root:packed,parts:parts};
}
async function hostStore(key,packet,state){
 packet.accepted=packet.accepted||{};
 if(!state.discovered){state.discovered=true;try{var old=await hostValue(key);if(typeof old==='string'&&old.indexOf('b134chunks:')===0){var previous=JSON.parse(old.slice(11));state.current=previous.keys.filter(function(k){return typeof k==='string'&&k.indexOf(key+'__v134_')===0})}}catch(e){}}
 for(var i=0;i<packet.parts.length;i++){var partKey=packet.parts[i].key;if(!packet.accepted[partKey]){var payload={};payload[partKey]=packet.parts[i].value;await hostRaw(payload);packet.accepted[partKey]=true}await hostVerify(partKey,packet.parts[i].value)}
 if(!packet.accepted[key]){var root={};root[key]=packet.root;await hostRaw(root);packet.accepted[key]=true}await hostVerify(key,packet.root); // Commit only after every piece has succeeded.
 var obsolete=(state.previous||[]).concat(state.orphans||[]);state.orphans=[];state.previous=state.current||[];state.current=packet.parts.map(function(p){return p.key});
 for(var j=0;j<obsolete.length;j++){try{var clear={};clear[obsolete[j]]='';await hostRaw(clear)}catch(e){}}
}
function hostWrite(payload){
 if(window.__v166CloudSave)return window.__v166CloudSave.write(payload);
 var key=Object.keys(payload)[0];if(!key)return Promise.resolve(false);
 var state=hostWrites[key]||(hostWrites[key]={running:false,pending:null,waiters:[],retry:null,discovered:false,current:[],previous:[]});
 if(state.retry&&typeof clearTimeout==='function'){clearTimeout(state.retry);state.retry=null}
 state.pending=hostPrepare(key,payload[key]);
 var promise=new Promise(function(resolve){state.waiters.push(resolve)});Promise.resolve().then(function(){hostDrain(key)});return promise;
}
async function hostDrain(key){
 var state=hostWrites[key];if(!state||state.running||!state.pending)return;state.running=true;
 while(state.pending){
  var packet=state.pending,waiters=state.waiters;state.pending=null;state.waiters=[];
  var success=false,error=null;window.__v134Sync.slots[key]={status:'syncing'};
  for(var attempt=0;attempt<3;attempt++){try{await hostStore(key,packet,state);success=true;break}catch(e){error=e;if(state.pending)break;if(attempt<2)await hostDelay((attempt+1)*150)}}
  waiters.forEach(function(resolve){resolve(success)});
  if(success){window.__v134Sync.slots[key]={status:'saved',at:Date.now()};continue}
  window.__v134Sync.slots[key]={status:'retrying',error:String(error&&error.message||error||'storage failure'),at:Date.now()};
  if(state.pending){state.orphans=(state.orphans||[]).concat(packet.parts.map(function(p){return p.key}));continue}packet.accepted={};state.pending=packet;
  if(!state.warned||Date.now()-state.warned>60000){state.warned=Date.now();var localSaved=false;try{var n=key==='career_save'?1:Number(key.replace('career_save_slot','')),raw=localStorage.getItem(n===1?'save_bust_no1_v4':'bust_slot_'+n+'_v4'),local=JSON.parse(raw),wanted=JSON.parse(packet.text);localSaved=!!(local&&wanted&&local.__saveId===wanted.__saveId&&local.__saveAt>=wanted.__saveAt)}catch(e){}
   try{if(typeof notify==='function')notify(localSaved?'本地进度已保存，云端同步暂未完成，正在重试。':'存档同步暂未完成，正在重试，请先不要退出游戏。')}catch(e){}
  }
  if(typeof setTimeout==='function')state.retry=setTimeout(function(){state.retry=null;hostDrain(key)},5000);
  break;
 }
 state.running=false;
}
if(typeof window.addEventListener==='function')window.addEventListener('online',function(){window.__v134Sync.flush()});

async function hostSave(obj){
  try{
    if(!obj)return false;
    memCache=obj;
    if(hasStorage()){
      var text=JSON.stringify(obj);
      var key=activeSaveKey();
      var payload={};payload[key]=text;  /* 存字符串，避免宿主做深比较/序列化差异 */
      return await hostWrite(payload);
    }
    /* 无宿主：交给原实现（不在此新增 localStorage 调用） */
    try{if(__origSave)__origSave()}catch(e){}
    return true;
  }catch(e){return false}
}

window.__v69Save={load:hostLoad,save:hostSave,write:hostWrite,key:SAVE_KEY,
  /* 【镜像控制】给上层（v81 多存档槽）用。
     load() 包装在内存镜像非空时会直接返回镜像、不再读 localStorage，
     而启动预取会把**宿主存档**灌进镜像。上层要把「某个槽的本地文本」
     交给下游校验链读一遍时，必须先把镜像让开，否则读到的永远是宿主那一份
     （实测：续玩槽1 读到的是宿主里的旧第1季档）。
     这里暴露三个原子操作：暂存镜像 / 清空镜像 / 还原镜像。 */
  stashMirror:function(){try{var m=memCache;memCache=undefined;return {had:true,v:m}}catch(e){return {had:false,v:undefined}}},
  restoreMirror:function(s){try{if(s&&s.had)memCache=s.v;else memCache=undefined}catch(e){}},
  getMirror:function(){try{return memCache}catch(e){return undefined}},
  setMirror:function(o){try{memCache=o}catch(e){}}};

/* 清档：只清本地会留下宿主里的旧档，下次进来「进度又回来了」。
   统一存储 API 只有 setValue 没有 remove，所以用空串哨兵覆盖：
   读取时把 '' 识别为「已清档」，不再触发旧档迁移。 */
async function hostClear(){
  try{
    memCache=null;
    if(hasStorage()){
      var payload={};payload[activeSaveKey()]='';
      return await hostWrite(payload);
    }
    return true;
  }catch(e){return false}
}
window.__v69Save.clear=hostClear;
window.v69ClearSave=hostClear;
/* 只清宿主那一份。本地那一份由游戏原有清档代码负责（改造前就有，
   本层不新增 localStorage 调用，符合 storage 技能的硬约束）。 */
window.v69ClearHostSave=hostClear;

/* 退役页「换一个状元重新开始」是内联 onclick：
     localStorage.removeItem('<SAVE>');career=null;ui.screen='home';render()
   它只清本地，宿主里的档还在 → 下次进来老进度又复活。
   处理：保留原有动作，在清理后追加宿主清理，两边一起清。 */
try{
  if(typeof renderRetired==='function'){
    var __v69Retired=renderRetired;
    renderRetired=function(){
      var h=__v69Retired.apply(this,arguments);
      try{
        if(typeof h==='string'&&h.indexOf('localStorage.removeItem')>=0&&h.indexOf('v69ClearHostSave')<0){
          h=h.replace(
            /onclick="(localStorage\.removeItem\([^"]*\));career=null;ui\.screen='home';render\(\)"/g,
            'onclick="$1;career=null;ui.screen=\'home\';typeof v69ClearHostSave===\'function\'&&v69ClearHostSave();render()"'
          );
        }
      }catch(e){}
      return h;
    };
  }
}catch(e){}

/* 包装 save()：保持同步返回（老代码不 await），后台异步落宿主 */
try{
  if(typeof save==='function'){
    var __v69Save=save;
    save=function(){
      try{
        if(typeof career!=='undefined'&&career){
          hostSave(career);          /* 异步，不 await：save() 必须保持同步语义 */
        }
      }catch(e){}
      try{return __v69Save.apply(this,arguments)}catch(e){}
    };
  }
}catch(e){}

/* 包装 load()：内存镜像优先，否则回落到原实现（读 localStorage）。
   注意：镜像里的档也要按原逻辑校验，否则底层「坏档保护」清了 localStorage、
   这里却继续从镜像返回坏档，坏档会一直复活。 */
try{
  if(typeof load==='function'){
    var __v69Load=load;
    load=function(){
      try{
        if(memCache!==undefined){
          var m=memCache;
          if(m===null)return null;
          if(m&&m.playerId){
            if(typeof playerBy!=='function')return m;
            if(playerBy(m.playerId))return m;
          }
          /* 镜像里是坏档：置空并交回底层判定 */
          memCache=null;
          return null;
        }
      }catch(e){}
      try{return __v69Load.apply(this,arguments)}catch(e){return null}
    };
  }
}catch(e){}

/* 启动预取：把宿主存档读进内存镜像，并触发一次 render 让首页「继续」按钮出现 */
function v69Bootstrap(){
  try{
    hostLoad().then(function(data){
      /* 坏档保护：宿主里的档如果连 playerId 都查不到，就两边一起清掉，
         否则每次进来都会把坏档读回来（底层只清 localStorage，清不掉宿主）。 */
      try{
        if(data&&(!data.playerId||typeof playerBy!=='function'||!playerBy(data.playerId))){
          memCache=null;
          hostClear();
          data=null;
        }
      }catch(e){}
      /* 只有玩家还没开始这一局时才覆盖，避免把开局后的进度盖回旧快照 */
      try{
        var busy=(typeof career!=='undefined')&&career;
        if(!busy){memCache=data||null}
      }catch(e){memCache=data||null}
      try{window.__v69LoadState=data?'loaded':'empty'}catch(e){}
      try{if(typeof render==='function')render()}catch(e){}
    });
  }catch(e){}
}

/* ==========================================================================
 * 二、激励视频接入
 *   替换 rewardAd.request —— 6 个业务点位自动全部变成真广告。
 * ========================================================================== */
var adBusy=false;
window.__v69AdBusy=function(){return adBusy};

var REASON_LABEL={
  exclusive_talent:'解锁专属天赋',
  take_all_talents:'拿下全部天赋',
  refresh_talents:'再刷一组天赋',
  dev_points:'获得训练点数',
  career_ending_immunity:'化解报销级伤病',
  exclusive_story_midcareer:'激活专属主线'
};

function v69Toast(msg){
  try{
    if(typeof notify==='function')return notify(msg);
    if(typeof ui!=='undefined'&&ui){ui.toast=msg;if(typeof render==='function')render()}
  }catch(e){}
}

/* 失败原因 → 面向用户的说法（技能文档原文取值） */
function v69ReasonText(reason,fallback){
  var map={
    APP_REQUIRED:'请在 Lamps 内打开才能观看',
    LOGIN_REQUIRED:'请先登录 Lamps 账号',
    UNAVAILABLE:'广告暂时不可用，请稍后再试',
    NOT_REWARDED:'需完整看完广告才能获得奖励',
    REQUEST_FAILED:'广告任务查询失败，请稍后再试',
    REWARD_FLOW_FAILED:'广告拉起失败，请稍后再试',
    GAME_ID_REQUIRED:'游戏信息缺失，无法播放激励视频',
    '2001':'广告能力未就绪，请稍后再试',
    '2002':'广告能力不可用，请稍后再试',
    '2003':'暂无可用广告，请稍后再试',
    '2004':'暂无可用广告，请稍后再试',
    '2005':'广告正在进行中，请稍候',
    '2006':'广告位配置异常，请稍后再试',
    '2007':'获取广告失败，请稍后再试',
    '2008':'广告加载超时，请稍后再试',
    '2009':'广告加载失败，请稍后再试'
  };
  return map[reason]||fallback||'广告未完成，奖励未发放';
}

/* 返回 true 表示「可以发放奖励」；任何失败都返回 false 并已提示 */
async function v69RewardRequest(reason){
  var label=REASON_LABEL[reason]||'奖励';
  if(adBusy){v69Toast('广告正在进行中，请稍候');return false}
  var lampsSDK=String(navigator.userAgent||'').indexOf('LampsSDK')!==-1;
  if(!lampsSDK||!(window.LampsGame&&typeof window.LampsGame.showRewardedVideo==='function')){
    v69Toast('激励视频需在 Lamps 内打开后可用');return false;
  }
  adBusy=true;
  try{var btn=document.querySelector('.v69-ad-lock');if(btn)btn.setAttribute('disabled','')}catch(e){}
  try{
    /* 发奖只认 Lamps 父页面回包 ok === true */
    var res=await window.LampsGame.showRewardedVideo({source:reason||'None'});
    if(res&&res.ok===true){return true}
    v69Toast((res&&res.message)||v69ReasonText(res&&res.code,'广告未完成，奖励未发放'));
    return false;                     /* 绝不自行补发奖励 */
  }catch(e){
    v69Toast('广告未完成，奖励未发放');
    return false;
  }finally{
    adBusy=false;
    try{var b2=document.querySelector('.v69-ad-lock');if(b2)b2.removeAttribute('disabled')}catch(e){}
  }
}
window.__v69RewardRequest=v69RewardRequest;

/* Lamps 平台无任务状态查询，保留空实现供旧调用点使用 */
function v69RefreshTaskState(){}
window.__v69RefreshTaskState=v69RefreshTaskState;

/* 替换 rewardAd：语义与旧实现一致（返回对象带 success 布尔），
   但失败时 success=false —— 现有 6 处调用点都不检查返回值，
   所以失败必须由这里拦住奖励发放：改为抛出，让调用点的 try/catch 或
   后续逻辑不执行。业务代码里 await rewardAd.request() 后紧跟发奖励，
   因此失败时抛出异常即可阻止发奖。 */
try{
  var oldAd=rewardAd;
  window.__v69OldAd=oldAd;
  var bridge={
    request:async function(reason){
      var ok=await v69RewardRequest(reason);
      if(!ok)throw new Error('AD_NOT_REWARDED');
      return {success:true};
    }
  };
  /* rewardAd 是 IIFE 内 const，外部改不了引用；但它是 const 对象，
     可以改它的 request 方法（对象属性可写）。 */
  try{
    if(oldAd&&typeof oldAd==='object'){
      oldAd.request=bridge.request;
      window.__v69AdPatched='method';
    }else{
      throw new Error('no-object');
    }
  }catch(e){
    /* 兜底：尝试整体替换（非严格模式下可能生效） */
    try{rewardAd=bridge;window.__v69AdPatched='rebind'}catch(e2){window.__v69AdPatched='failed'}
  }
}catch(e){}

/* ==========================================================================
 * 三、启动
 * ========================================================================== */
try{
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',v69Bootstrap,false);
  else v69Bootstrap();
}catch(e){try{v69Bootstrap()}catch(e2){}}

window.__v69Debug={hasStorage:hasStorage(),hasVatask:hasVatask(),patched:window.__v69AdPatched,
  load:hostLoad,save:hostSave,reward:v69RewardRequest,SAVE_KEY:SAVE_KEY};

})();

