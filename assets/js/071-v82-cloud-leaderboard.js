
/* ============================================================================
 * v82 · 开发者第十九次反馈：全服排行榜 + 存档槽改到选人之后
 *
 * 原话：
 *   「我说的排行榜是所有玩家的排行榜，获取玩家的虎扑昵称然后展示，现在存档那个区域
 *     改成排行榜，展示全服top3，然后点击查看完整榜单，然后没上榜的展示当前用户的
 *     最高排名，然后存档槽在选好球员后出现，玩家选择一个存档槽开启本局游戏，然后在
 *     开始改写生涯下方那个按钮是继续存档，点击也展示存档槽，点击空的没反应，点击
 *     有的存档直接继续游戏」
 *
 * ── 与前一轮的区别（重要）──────────────────────────────────────────────
 *   v81 的「排行榜」是**本机 3 个存档**自比。开发者要的是**全服所有玩家**的榜，
 *   要显示别人的虎扑昵称 —— 这必须走云端（本机数据别人看不到）。
 *   所以本层：
 *     · 封面「存档槽」区块 → 换成「全服排行榜」区块（Top3 + 查看完整榜单 + 我的最高排名）
 *     · 存档槽移到**选好球员之后**（选人页 → 选槽 → 开始本局）
 *     · 封面「继续存档」按钮 → 打开存档槽选择
 *     · 每段生涯退役时，把「本局总得分」提交到全服榜
 *
 * ── 云端接口（activity/cloudfunctions/activity_api）────────────────────
 *   GET  /api/leaderboard?limit=N   全服榜（公开读）
 *   GET  /api/leaderboard/me        我的名次与最好成绩（需登录）
 *   POST /api/leaderboard/submit    提交生涯成绩（需登录，一人一条保留最高）
 *
 * ── 无宿主/无网络时 ────────────────────────────────────────────────────
 *   浏览器直接打开（扫码预览、本地双击）拿不到宿主能力：
 *   榜区块显示「需在虎扑 App 内查看」，**不伪造数据**、不影响游戏本身可玩。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v82Fix)return;window.__v82Fix=true;

/* 虎扑云端网关配置已移除：排行榜与云存档改走 LampsPlatform。 */

function esc82(v){return String(v==null?'':v).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})}
function fmt82(n){try{return Math.round(Number(n)||0).toLocaleString()}catch(e){return String(Math.round(Number(n)||0))}}

/* 网关域名与 EnvId 由部署后回写（见 deploy.md §B.5）。
   【必须在调用时读取，不能在 IIFE 初始化时缓存】——部署回写发生在页面加载顺序里，
   缓存会导致「域名写进去了但代码还用着空值」，表现为云端永远不可用。 */
function apiBase(){try{return String(window.ACTIVITY_API_BASE||'').replace(/\/$/,'')}catch(e){return ''}}
function envId(){try{return String(window.ACTIVITY_ENV_ID||'')}catch(e){return ''}}

function hasCloud(){
  /* 虎扑全服榜已移除；云端排行榜改走 LampsPlatform（见文件末尾 lamps 接入脚本） */
  return false;
}
function hasHostCaps(){
  try{return !!(window.ColorboxAI&&(window.ColorboxAI.cloud||window.ColorboxAI.auth))}catch(e){return false}
}

/* 统一的云端读/写（公开读不传 auth；我的数据与写传 auth:true） */
/* 虎扑云端请求通道已移除；保留空实现，调用方由 hasCloud()=false 短路。 */
function cloudGet(){ return Promise.resolve(null); }
function cloudPost(){ return Promise.resolve(null); }

/* 当前用户昵称（用于提交与「我的」展示）。未登录返回 ''。 */
function myNickname(){
  try{return window.__v82Nickname||''}catch(e){return ''}
}
function fetchMe(){
  if(!hasHostCaps())return Promise.resolve(null);
  if(!(window.ColorboxAI.auth&&typeof window.ColorboxAI.auth.getUserInfo==='function'))return Promise.resolve(null);
  return window.ColorboxAI.auth.getUserInfo().then(function(res){
    try{
      if(res&&res.code===200&&res.data&&res.data.nickname){
        window.__v82Nickname=String(res.data.nickname);
        return window.__v82Nickname;
      }
    }catch(e){}
    return null;
  }).catch(function(){return null});
}

/* ==========================================================================
 * 一、全服排行榜数据
 * ========================================================================== */
var LB_CACHE={top:null,me:null,at:0,err:''};
function loadLeaderboard(force){
  if(!hasCloud())return Promise.resolve({unavailable:true});
  if(!force&&LB_CACHE.top&&(Date.now()-LB_CACHE.at<30000))return Promise.resolve(LB_CACHE);
  return cloudGet('/leaderboard?limit=100').then(function(list){
    LB_CACHE.top=Array.isArray(list)?list:[];
    LB_CACHE.at=Date.now();
    LB_CACHE.err='';
    return LB_CACHE;
  }).catch(function(e){
    LB_CACHE.err=String(e&&e.message||e);
    return LB_CACHE;
  });
}
function loadMyRank(){
  if(!hasCloud())return Promise.resolve(null);
  return cloudGet('/leaderboard/me',true).then(function(d){
    LB_CACHE.me=d||null;
    return LB_CACHE.me;
  }).catch(function(){return null});
}
window.v82RefreshLeaderboard=function(){return loadLeaderboard(true)};

/* ==========================================================================
 * 二、封面：排行榜区块（取代原来的「本机存档槽」区块）
 * ========================================================================== */
function lbRow(it,i,isMe){
  var cls='v82-lb-row'+(i===0?' top1':i===1?' top2':i===2?' top3':'')+(isMe?' me':'');
  var medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':('#'+(i+1));
  return '<div class="'+cls+'">'
    +'<i class="v82-lb-no">'+medal+'</i>'
    +'<div class="v82-lb-main">'
    +  '<b>'+esc82(it.nickname||'虎扑玩家')+(isMe?'<em>我</em>':'')+'</b>'
    +  '<small>'+esc82(it.playerName||'')+(it.grade?' · '+esc82(it.grade):'')+(it.seasons?' · '+it.seasons+' 赛季':'')+(it.slot?' · 存档'+it.slot:'')+'</small>'
    +'</div>'
    +'<em class="v82-lb-score">'+fmt82(it.score)+'</em>'
    +'</div>';
}

function leaderboardBlockHTML(){
  /* 虎扑全服排行榜卡片已移除：排行榜统一在「生涯」页的 Lamps 云端排行卡片展示 */
  return '';
}
function lbBodyLoading(){
  return '<div class="v82-lb-empty">正在加载全服数据…</div>';
}
function lbBodyHTML(){
  if(!hasCloud()){
    return '<div class="v82-lb-empty">'+(hasHostCaps()?'暂时拿不到榜单数据，请稍后重试':'需在虎扑 App 内查看全服排行')+'</div>';
  }
  var top=LB_CACHE.top;
  if(!top){
    return '<div class="v82-lb-empty">'+(LB_CACHE.err?('榜单加载失败：'+esc82(LB_CACHE.err)):'正在加载全服数据…')+'</div>';
  }
  if(!top.length)return '<div class="v82-lb-empty">还没有人上榜，打完一段生涯就能成为第一个。</div>';
  /* 一个存档一条：同一个人可能上榜多条，用「昵称+球员+分数」匹配哪些是我自己的 */
  var mine=[];try{mine=(LB_CACHE.me&&LB_CACHE.me.mine)||[]}catch(e){}
  /* 兼容旧版后端：它只回 {rank,best}、没有 mine，这里当作一条来展示，
     否则会误报「还没有成绩」。 */
  if(!mine.length&&LB_CACHE.me&&LB_CACHE.me.best){
    mine=[Object.assign({},LB_CACHE.me.best,{rank:LB_CACHE.me.rank})];
  }
  var mineKey={};
  mine.forEach(function(m){mineKey[String(m.nickname)+'|'+String(m.playerName)+'|'+Number(m.score)]=1});
  var top3=top.slice(0,3).map(function(it,i){
    var isMe=!!mineKey[String(it.nickname)+'|'+String(it.playerName)+'|'+Number(it.score)];
    return lbRow(it,i,isMe);
  }).join('');
  var extra='';
  if(mine.length){
    /* 展示我名下每个存档各自的名次（最多 3 个存档） */
    extra='<div class="v82-lb-me"><small>我的存档 · 共 '+mine.length+' 条</small>'
      + mine.map(function(m){
          return '<div class="v82-lb-me-row"><i>#'+(m.rank||'--')+'</i>'
            +'<b>'+esc82(String(m.playerName||'')+(m.grade?' · '+esc82(m.grade):'')+(m.slot?' · 存档'+m.slot:''))+'</b>'
            +'<em>'+fmt82(m.score)+'</em></div>';
        }).join('')
      +'</div>';
  }else{
    extra='<div class="v82-lb-me none"><small>我的存档</small><span>还没有成绩，打完一段生涯就能上榜</span></div>';
  }
  return top3+extra;
}
function paintLeaderboard(){
  try{
    var box=document.getElementById?document.getElementById('v82-lb-body'):null;
    if(box)box.innerHTML=lbBodyHTML();
  }catch(e){}
}
function refreshLeaderboardUI(){
  if(!hasCloud()){paintLeaderboard();return}
  Promise.all([loadLeaderboard(false),loadMyRank()]).then(function(){paintLeaderboard()});
}
window.v82LeaderboardBlock=leaderboardBlockHTML;

/* ==========================================================================
 * 三、完整榜单（弹层 / 独立屏）
 * ========================================================================== */
function fullListHTML(){
  if(!hasCloud()){
    return '<div class="v82-full-empty">'+(hasHostCaps()?'暂时拿不到榜单数据，请稍后重试':'需在虎扑 App 内查看全服排行')+'</div>';
  }
  var top=LB_CACHE.top;
  if(!top)return '<div class="v82-full-empty">'+(LB_CACHE.err?('榜单加载失败：'+esc82(LB_CACHE.err)):'正在加载…')+'</div>';
  if(!top.length)return '<div class="v82-full-empty">还没有人上榜。</div>';
  var mine=[],mineKey={};
  try{mine=(LB_CACHE.me&&LB_CACHE.me.mine)||[]}catch(e){}
  if(!mine.length&&LB_CACHE.me&&LB_CACHE.me.best){
    mine=[Object.assign({},LB_CACHE.me.best,{rank:LB_CACHE.me.rank})];   /* 旧版后端兼容 */
  }
  mine.forEach(function(m){mineKey[String(m.nickname)+'|'+String(m.playerName)+'|'+Number(m.score)]=1});
  var rows=top.map(function(it,i){
    var isMe=!!mineKey[String(it.nickname)+'|'+String(it.playerName)+'|'+Number(it.score)];
    return lbRow(it,i,isMe);
  }).join('');
  var mineBox='';
  if(mine.length){
    mineBox='<div class="v82-full-mine">我的存档（共 '+mine.length+' 条）：'
      + mine.map(function(m){return '#'+(m.rank||'--')+' '+esc82(String(m.playerName||'')+(m.slot?'·存档'+m.slot:''))+' <b>'+fmt82(m.score)+'</b>'}).join('　')
      +'</div>';
  }else{
    mineBox='<div class="v82-full-mine">你还没有上榜成绩。</div>';
  }
  return rows+mineBox;
}
function fullViewHTML(){
  return '<section class="v82-full"><header>'
    +'<button class="v82-full-back" onclick="v82CloseFull()">←</button>'
    +'<div><small>GLOBAL RANKING</small><b>全服排行榜</b></div>'
    +'<span class="v82-full-count">Top '+(LB_CACHE.top?Math.min(100,LB_CACHE.top.length):0)+'</span>'
    +'</header>'
    +'<p class="v82-full-note">每个存档各占一条（同一存档只保留最高分）。已按「本局游戏总得分」降序排列；同分时先达到者在前。</p>'
    +'<div class="v82-full-list">'+fullListHTML()+'</div></section>';
}
window.v82OpenFull=function(){
  try{
    ui.fullLbLoading=true;
    if(typeof ui!=='undefined')ui.v82FullRank=true;
    if(typeof render==='function')render();
  }catch(e){}
  var paint=function(){
    try{
      var box=document.getElementById?document.getElementById('v82-full-list-box'):null;
      if(box)box.innerHTML=fullListHTML();
      var cnt=document.getElementById?document.getElementById('v82-full-count'):null;
      if(cnt)cnt.textContent='Top '+(LB_CACHE.top?Math.min(100,LB_CACHE.top.length):0);
    }catch(e){}
  };
  if(hasCloud()){
    Promise.all([loadLeaderboard(false),loadMyRank()]).then(paint);
  }
};
window.v82CloseFull=function(){
  try{if(typeof ui!=='undefined')ui.v82FullRank=false;if(typeof render==='function')render()}catch(e){}
};

/* ==========================================================================
 * 四、存档槽：改到「选好球员之后」
 *
 * 流程：选人页选球员 → 点「进入天赋抽取」→ **先选存档槽** → 开本局。
 * 「继续存档」按钮（封面下方）也打开槽位选择：
 *   · 点空槽：没反应（开发者明确要求）
 *   · 点有档：直接继续游戏
 * ========================================================================== */
function slotCardHTML(n,sum,opt){
  var mode=(opt&&opt.mode)||'pickNew';   /* pickNew=开新局；pickLoad=继续 */
  if(mode==='pickLoad'){var loadingCard=window.v178LoadingCard?.(n,sum);if(loadingCard)return loadingCard;}
  if(sum&&mode==='pickLoad'&&window.v178HasConflict?.(n))return window.v178ConflictCard(n);
  if(!sum){
    if(mode==='pickLoad'){
      const status=window.__v176SlotChecks?.[n];if(status==='checking'||status==='error')return '<div class="v82-slot empty disabled"><small>存档'+n+'</small><div class="v82-slot-ico">…</div><b>'+(status==='checking'?'正在检查云端…':'云端暂未确认')+'</b><span>本机暂无存档'+(status==='error'?'，请稍后重新检查':'，有结果会自动显示')+'</span></div>';
      /* 继续存档时点空槽：没反应（开发者要求） */
      return '<div class="v82-slot empty disabled"><small>存档'+n+'</small>'
        +'<div class="v82-slot-ico">＋</div><b>空存档</b><span>暂无存档</span></div>';
    }
    var target=window.__GAME_MODE__==='custom'?'自建球员':window.__GAME_MODE__==='star'?'模拟明星':'';
    return '<div class="v82-slot empty" onclick="v82SlotPick('+n+',\'new\')"><small>存档'+n+'</small>'
      +'<div class="v82-slot-ico">＋</div><b>空存档</b><span>点这里开启本局'+(target?' · '+target:'')+'</span></div>';
  }
  var act=mode==='pickLoad'?'v82SlotPick('+n+',\'load\')':'v82SlotPick('+n+',\'overwrite\')';
  var modeTag=sum.mode==='custom'
    ? '<i class="v82-slot-mode custom">自建球员</i>'
    : '<i class="v82-slot-mode star">模拟明星</i>';
  return '<div class="v82-slot has" onclick="'+act+'">'
    +'<small>存档'+n+(window.v178SlotSource?.(n)||' · 本机缓存')+'</small>'
    +'<b>'+esc82(sum.name)+modeTag+'</b>'
    +'<span>'+esc82(String(sum.year||''))+' 年 · '+sum.seasons+' 赛季 · OVR '+sum.ovr+'</span>'
    +'<div class="v82-slot-score"><em>'+fmt82(sum.score)+'</em><i>'+esc82(sum.grade||'')+'</i></div>'
    +'<div class="v82-slot-tag">'+(sum.retired?'已退役':'进行中')+'</div>'
    +'</div>';
}

function pickerHeader(mode){
  if(mode==='pickLoad')return {t:'读取哪一段生涯？',s:'本机缓存先显示，云端存档逐个更新；模拟明星 / 自建球员会分别标明'};
  return {t:'选择一个存档位开启新生涯',s:'可同时保存 3 段生涯；有进度的存档点击可覆盖重开'};
}
function slotPickerHTML(mode){
  var all={};
  try{all=(typeof v81ReadAllSlots==='function')?v81ReadAllSlots():{}}catch(e){}
  var hd=pickerHeader(mode);
  return '<section class="v82-pick"><header>'
    +'<button class="v82-pick-back" onclick="v82ClosePicker()">←</button>'
    +'<div><small>SAVE SLOTS</small><b>'+esc82(hd.t)+'</b></div>'
    +'<span class="v82-pick-sub">'+esc82(hd.s)+'</span>'
    +'</header>'+(mode==='pickLoad'?(window.v178LoadingHTML?.()||''):'')+'<div class="v82-pick-grid" id="v82-pick-grid">'
    + [1,2,3].map(function(n){return slotCardHTML(n,all[n],{mode:mode})}).join('')
    +'</div></section>';
}

/* 【宿主优先刷新】
   虎扑 App 里存档在宿主侧，只按本地读会把有进度的槽显示成空档。
   渲染后异步补一次「本地+宿主」的完整判定，把误判为空的有档槽补回来。 */
function refreshPickerFromHost(mode){
  try{
    if(typeof v81ReadAllSlotsDeep!=='function')return;
    v81ReadAllSlotsDeep(function(all){
      try{
        var box=document.getElementById?document.getElementById('v82-pick-grid'):null;
        if(!box||ui.v82Picker!==mode)return;
        var loading=document.getElementById('v178-slot-loading');if(loading)loading.outerHTML=window.v178LoadingHTML?.()||'';
        box.innerHTML=[1,2,3].map(function(n){return slotCardHTML(n,all[n],{mode:mode})}).join('');
      }catch(e){}
    });
  }catch(e){}
}
window.v82ClosePicker=function(){
  try{if(typeof ui!=='undefined')ui.v82Picker=null;if(typeof render==='function')render()}catch(e){}
};
window.v82OpenPicker=function(mode){
  try{if(typeof ui!=='undefined')ui.v82Picker=mode||'pickLoad';if(typeof render==='function')render()}catch(e){}
};
window.v82OpenContinue=function(){window.v82OpenPicker('pickLoad')};
/* 选人页点「进入天赋抽取」：先让玩家选一个存档位（空槽才能开新局） */
window.v82OpenPickerForNew=function(){
  try{if(typeof ui!=='undefined')ui.v82Picker='pickNew';if(typeof render==='function')render()}catch(e){}
};
window.v82GoTalents=function(){
  try{if(typeof ui!=='undefined')ui.v82Picker=null;if(typeof openTalents==='function')openTalents()}catch(e){}
};

/* 选槽后的动作 */
window.v82SlotPick=function(n,mode){
  try{
    /* 【必须先关掉选槽页】
       选槽页是靠 ui.v82Picker 是否非空驱动的（render 拦截时若该标记还在就整屏重绘选槽页）。
       早期写法没清这个标记，导致「点有档后游戏其实已经加载了，但页面又被画回选槽页」
       —— 玩家看到的正是「点了没反应」（实测复现）。 */
    var leavePicker=function(){
      try{if(typeof ui!=='undefined'&&ui)ui.v82Picker=null}catch(e){}
    };
    if(mode==='load'||mode==='overwrite-keep'){
      /* 继续模式：点有档 → 直接继续游戏；点空档 → 什么都不做（开发者明确要求）。
         注意：本地可能读不到（虎扑里存档在宿主侧），所以先本地判定，
         判为空时**再查一次宿主**才决定 —— 否则有进度的槽会被误判为空、
         玩家点了就被当新开局、进度从零开始（实测复现的正是这个）。 */
      var has=false;
      try{
        var all=(typeof v81ReadAllSlots==='function')?v81ReadAllSlots():{};
        has=!!(all&&all[n]);
      }catch(e){has=true}      /* 读取异常：按有档处理，避免误吞点击 */
      if(has){
        if(typeof v81SetSlot==='function')v81SetSlot(n);
        leavePicker();
        if(typeof v81ContinueSlot==='function')v81ContinueSlot(n);
        return;
      }
      /* 本地判空：再问一次宿主 */
      var ensure=(typeof v81EnsureSlotLoaded==='function')?v81EnsureSlotLoaded(n):Promise.resolve(false);
      Promise.resolve(ensure).then(function(ok){
        if(!ok)return;                       /* 宿主也确实没有 → 空档，无反应 */
        if(typeof v81SetSlot==='function')v81SetSlot(n);
        leavePicker();
        if(typeof v81ContinueSlot==='function')v81ContinueSlot(n);
      }).catch(function(){});
      return;
    }
    if(mode==='new'){
      /* 开新局：占用这个空槽，然后继续「选球员 → 天赋」流程 */
      if(typeof v81SetSlot==='function')v81SetSlot(n);
      try{if(typeof career!=='undefined')career=null}catch(e){}
      try{localStorage.removeItem((typeof v81LocalKey==='function')?v81LocalKey(n):('bust_slot_'+n+'_v4'))}catch(e){}
      leavePicker();
      window.v82GoTalents();
      return;
    }
    if(mode==='overwrite'){
      /* 已有存档：覆盖前确认 */
      try{
        if(typeof confirm==='function'&&!confirm('这个存档已有进度，确定覆盖并重开本局？'))return;
      }catch(e){}
      if(typeof v81SetSlot==='function')v81SetSlot(n);
      try{if(typeof career!=='undefined')career=null}catch(e){}
      try{localStorage.removeItem((typeof v81LocalKey==='function')?v81LocalKey(n):('bust_slot_'+n+'_v4'))}catch(e){}
      try{if(typeof v81HostClearSlot==='function')v81HostClearSlot(n)}catch(e){}
      try{if(typeof v81CacheClear==='function')v81CacheClear(n)}catch(e){}
      leavePicker();
      window.v82GoTalents();
    }
  }catch(e){}
};

/* ==========================================================================
 * 五、接管屏幕渲染：封面排行榜 + 选人后选槽 + 完整榜单
 * ========================================================================== */
try{
  if(typeof render==='function'&&!window.__v82RenderPatched){
    var __v82Render=render;
    render=function(){
      try{if(typeof ui!=='undefined'&&ui){
        if(!ui.v82Picker)ui.v82Picker=null;
        if(!ui.v82FullRank)ui.v82FullRank=false;
        /* 【兜底】一旦已经进入对局（career 存在且不在封面/选人/天赋流程），
           必须清掉选槽页与榜单页标记 —— 否则残留标记会把整屏重绘回选槽页，
           表现为「点了存档没反应」（实测复现过）。 */
        var inGame=(typeof career!=='undefined')&&career;
        if(inGame&&(ui.screen==='career'||ui.screen==='retired')){ui.v82Picker=null;ui.v82FullRank=false}
      }}catch(e){}
      /* 完整榜单 / 存档槽选择：整屏替换（在 render 出口拦截） */
      try{
        var app=(typeof $==='function')?$('#app'):null;
        if(app&&typeof ui!=='undefined'&&ui){
          if(ui.v82FullRank){
            __v82Render.apply(this,arguments);
            app.innerHTML=fullViewHTML().replace('<div class="v82-full-list">','<div class="v82-full-list" id="v82-full-list-box">');
            return;
          }
          if(ui.v82Picker){
            if(typeof stopSim==='function')stopSim();
            app.innerHTML=slotPickerHTML(ui.v82Picker);
            /* 有宿主时补一次完整判定：虎扑里存档在宿主侧，
               只按本地读会把有进度的槽画成空档。 */
            refreshPickerFromHost(ui.v82Picker);
            return;
          }
        }
      }catch(e){}
      var rv=__v82Render.apply(this,arguments);
      /* 封面：把 v81 的「本机存档槽」+「本机排行榜」换成全服排行榜。
         注意：区块内容必须由 render 时**已有的缓存**生成 ——
         早期写法恒为「正在加载」，而异步数据回来后 render 会重建 HTML
         把区块重置回加载态，导致榜永远画不出来（实测）。 */
      try{
        var app2=(typeof $==='function')?$('#app'):null;
        if(app2&&typeof ui!=='undefined'&&ui&&ui.screen==='home'&&typeof app2.innerHTML==='string'){
          var h=app2.innerHTML;
          h=h.replace(/<section class="v81-slots">[\s\S]*?<\/section>/,'');
          h=h.replace(/<section class="v81-cover-lb">[\s\S]*?<\/section>/,'');
          if(h.indexOf('v82-lb')<0){
            /* 【位置】排行榜放在「主视觉图下方、开始改写生涯按钮上方」那一块空白处。
               封面结构：cover-hero-v214(主视觉) → cover-story-strip → cover-actions(按钮)。
               所以插到 cover-actions 之前；找不到该锚点再退回末尾。 */
            var act=h.indexOf('<div class="cover-actions"');
            if(act<0)act=h.indexOf('<div class="case-actions"');
            if(act>=0)h=h.slice(0,act)+leaderboardBlockHTML()+h.slice(act);
            else h=h+leaderboardBlockHTML();
          }
          h=h.replace(/onclick="continueSave\(\)"/g,'onclick="v82OpenContinue()"');
          app2.innerHTML=h;
          /* 缓存为空时触发一次异步加载；数据回来后只更新榜单容器，
             不整页重绘（避免打断玩家当前操作）。 */
          if(hasCloud()&&(!LB_CACHE.top||!LB_CACHE.me))refreshLeaderboardUI();
        }
      }catch(e){}
      /* 选人页：把「进入天赋抽取」改为「先选存档槽」 */
      try{
        var app3=(typeof $==='function')?$('#app'):null;
        if(app3&&typeof ui!=='undefined'&&ui&&ui.screen==='select'&&typeof app3.innerHTML==='string'){
          var hs=app3.innerHTML;
          if(hs.indexOf('openTalents()')>=0){
            hs=hs.replace(/onclick="openTalents\(\)"/g,'onclick="v82OpenPickerForNew()"');
            app3.innerHTML=hs;
          }
        }
      }catch(e){}
      return rv;
    };
    window.__v82RenderPatched=true;
  }
}catch(e){}

/* ==========================================================================
 * 六、退役时提交成绩到全服榜
 * ========================================================================== */
function submitMyCareer(manual){
  /* 虎扑榜提交已移除：Lamps 排行榜由文件末尾的接入脚本统一上报 */
  return Promise.resolve(false);
  try{
    if(!hasCloud()){
      if(manual&&typeof v83Toast==='function')v83Toast('需在虎扑 App 内打开本页，才能提交成绩到全服榜');
      return Promise.resolve(false);
    }
    if(typeof v81TotalScore!=='function'||typeof v81CurrentInput!=='function')return Promise.resolve(false);
    var inp=v81CurrentInput();
    if(!inp)return Promise.resolve(false);
    var sc=v81TotalScore(inp);
    var grade='';
    try{grade=(typeof v81Grade==='function')?v81Grade(sc.total).name:''}catch(e){}
    var pName='';
    try{pName=(typeof currentP==='function'&&currentP())?currentP().zh:''}catch(e){}
    return fetchMe().then(function(nick){
      return cloudPost('/leaderboard/submit',{
        nickname:nick||myNickname()||'虎扑玩家',
        playerId:inp.playerId||'',
        playerName:pName,
        /* 一个存档一条：slot = 本局所在的存档槽（1~3），服务端按 (用户, 存档) 保留最高分 */
        slot:(typeof career!=='undefined'&&career&&career.__slot)||1,
        /* 【关键】entryKey = 本局生涯的唯一 id。存档槽默认为 1，所以「退役后重开一局」
           常常还是 1 号槽 —— 只按槽位去重会把新那局直接丢掉（实测反馈：打完退役，
           榜上还是旧分）。带上 entryKey 后，**每一局各占一行**，同一局重复提交才去重。 */
        entryKey:(typeof career!=='undefined'&&career&&career.cid)||'',
        score:sc.total,
        grade:grade,
        seasons:(inp.careerTotals&&inp.careerTotals.seasons)||0,
        honors:inp.honors||{}
      }).then(function(res){
        /* 提交成功后必须让榜单缓存立即失效并重拉：
           LB_CACHE 有 30s TTL，而封面只有在缓存为空时才重新加载 ——
           否则退役后回到封面读到的还是「退役前那一份旧榜」，
           玩家会以为自己的成绩没上榜（实测反馈「排行榜没有增加」）。 */
        try{
          if(typeof career!=='undefined'&&career){
            career.v82SubmitOk=1;
            /* 服务端在「旧口径（每人只保留最高分）」下会回 kept-higher，
               此时 data.score 是它保留下来的**旧高分**，不是本局分数。
               注意：cloudPost 只把 data 交回来（message 拿不到），
               所以用「服务端回的分 > 本局分」判断它是否保留了更高的旧分 ——
               这个判断对新旧两种后端都成立。 */
            /* 注意：cloudPost 已经把网关响应的 data 拆出来交给这里了，
               所以直接读 res.score（不是 res.data.score）。 */
            var srvScore=(res&&res.score!=null)?Number(res.score):sc.total;
            career.v82SubmitKept=!!(isFinite(srvScore)&&srvScore>sc.total);
            career.v82SubmitLocal=sc.total;
            career.v82SubmitScore=isFinite(srvScore)?srvScore:sc.total;
            career.v82SubmitSlot=(typeof career.__slot==='number'?career.__slot:1);
            career.v82SubmitAt=Date.now();
            delete career.v82SubmitErr;
            if(typeof save==='function')save();
          }
        }catch(e){}
        try{LB_CACHE.top=null;LB_CACHE.me=null;LB_CACHE.at=0;refreshLeaderboardUI()}catch(e){}
        /* 自动提交也要重绘一次：否则退役页那条状态条会停在「还没提交」不动 */
        try{if(typeof render==='function')render()}catch(e){}
        return true;
      });
    }).catch(function(err){
      try{
        if(typeof career!=='undefined'&&career){
          career.v82SubmitErr=String((err&&err.message)||err||'提交失败');
          if(typeof save==='function')save();
        }
      }catch(e){}
      if(manual&&typeof v83Toast==='function')v83Toast('提交失败：'+String((err&&err.message)||'请稍后重试'));
      try{if(typeof render==='function')render()}catch(e){}
      return false;
    });
  }catch(e){return Promise.resolve(false)}
}
window.v82Submit=submitMyCareer;

/* 退役页：提交成绩 + 状态条 + 手动重试入口
   ── 为什么必须改 ──────────────────────────────────────────────────────
   原实现用 career 上的「只提交一次」标记去重，而且是**先打标记、再发请求**：
   第一次提交失败（未登录 / 网络抖动 / 提交时不在虎扑容器里）之后就永远不会再试，
   玩家看到的现象就是「退役了，但排行榜上没有」。
   服务端是「一人一条、保留最高」的幂等写入，重复提交完全安全，
   所以这里改成：没成功就下次进退役页再试（15 秒节流），并给一个手动重试按钮 ——
   老存档（标记已打上但没上榜）也会在下次打开退役页时补交。 */
window.v82Resubmit=function(){ try{return submitMyCareer(true)}catch(e){return Promise.resolve(false)} };
function v82SubmitStrip(){
  try{
    if(typeof career==='undefined'||!career)return '';
    var slot=Number(career.__slot)||1;
    if(!hasCloud())return '<div class="v82-submit-note">需在虎扑 App 内打开，才能把成绩提交到全服榜</div>';
    if(career.v82SubmitOk){
      var local=Number(career.v82SubmitLocal||0), kept=Number(career.v82SubmitScore||0);
      if(career.v82SubmitKept&&kept>local){
        /* 服务端是「每人只保留最高分」口径：本局分数没被采用，榜上留的是历史最高那条。
           必须说清楚，否则玩家只会看到「榜上没变化」。 */
        return '<div class="v82-submit-note kept">本局 '+fmt82(local)+' 分已提交 · 榜上保留了你更高的 '+fmt82(kept)+' 分'
          +'<button class="v82-submit-btn" onclick="v82Resubmit()">重新提交</button></div>';
      }
      return '<div class="v82-submit-note ok">存档'+slot+' 已上榜 · '+fmt82(kept||local)+' 分'
        +'<button class="v82-submit-btn" onclick="v82Resubmit()">重新提交</button></div>';
    }
    return '<div class="v82-submit-note'+(career.v82SubmitErr?' err':'')+'">'
      +(career.v82SubmitErr?('上次提交失败：'+esc82(career.v82SubmitErr)):('存档'+slot+' 的成绩还没提交到全服榜'))
      +'<button class="v82-submit-btn" onclick="v82Resubmit()">提交成绩</button></div>';
  }catch(e){return ''}
}
try{
  if(typeof renderRetired==='function'&&!window.__v82RetirePatched){
    var __v82Retire=renderRetired;
    renderRetired=function(){
      var h=__v82Retire.apply(this,arguments);
      try{
        if(typeof career!=='undefined'&&career&&career.retired){
          if(typeof h==='string')h=h+v82SubmitStrip();
          if(!career.v82SubmitOk){
            var now=Date.now();
            if(!window.__v82LastTry||now-window.__v82LastTry>15000){
              window.__v82LastTry=now;
              submitMyCareer(false);
            }
          }
        }
      }catch(e){}
      return h;
    };
    window.__v82RetirePatched=true;
  }
}catch(e){}

/* ==========================================================================
 * 七、样式（沿用封面暖色体系，不引入新视觉语言）
 * ========================================================================== */
try{
  var st82=document.createElement('style');
  st82.id='v82-style';
  st82.textContent=[
    /* 封面排行榜：深色卡片，与主视觉区分但不抢版面 */
    '.v82-lb{margin:12px 14px 0;padding:12px 12px 11px;border-radius:22px;background:linear-gradient(160deg,#241c14,#3d2c1c 58%,#5c3f22);color:#f6e6cc;box-shadow:0 10px 26px rgba(48,30,14,.22)}',
    /* 标题：英文在上、中文在下（竖排），右侧放「查看完整榜单」入口 */
    '.v82-lb header{display:flex;align-items:flex-start;gap:8px;margin-bottom:9px}',
    '.v82-lb header>div{min-width:0;display:flex;flex-direction:column}',
    '.v82-lb header small{display:block;font-size:7px;color:#d8b478;letter-spacing:.1em;line-height:1.2}',
    '.v82-lb header b{display:block;font-size:13.5px;color:#ffeccb;margin-top:2px;line-height:1.2}',
    '.v82-lb-more{margin-left:auto;flex:none;border:1px solid rgba(255,216,143,.45);background:rgba(255,216,143,.10);color:#ffd88f;border-radius:999px;padding:5px 10px;font-size:8px;font-weight:1000}',
    '.v82-lb-body{display:flex;flex-direction:column;gap:6px}',
    '.v82-lb-row{display:grid;grid-template-columns:26px 1fr auto;align-items:center;gap:8px;padding:8px 9px;border-radius:14px;background:rgba(255,255,255,.06);border:1px solid rgba(255,216,143,.14)}',
    '.v82-lb-row.top1{background:linear-gradient(120deg,rgba(255,216,143,.20),rgba(255,255,255,.06));border-color:rgba(255,216,143,.45)}',
    '.v82-lb-row.top2{background:linear-gradient(120deg,rgba(226,232,240,.16),rgba(255,255,255,.06))}',
    '.v82-lb-row.top3{background:linear-gradient(120deg,rgba(214,160,110,.16),rgba(255,255,255,.06))}',
    '.v82-lb-row.me{outline:1px solid rgba(255,216,143,.55)}',
    '.v82-lb-no{font-style:normal;font-size:14.5px;text-align:center}',
    '.v82-lb-main{min-width:0}',
    '.v82-lb-main>b{display:block;font-size:10.5px;color:#ffeccb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.v82-lb-main>b em{font-style:normal;margin-left:5px;font-size:7px;color:#3d2c14;background:#ffd88f;border-radius:99px;padding:1px 5px}',
    '.v82-lb-main>small{display:block;font-size:7px;color:#c4a679;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.v82-lb-score{font-style:normal;font-size:15px;font-weight:1000;color:#ffd88f;font-variant-numeric:tabular-nums}',
    '.v82-lb-empty{padding:14px 10px;text-align:center;font-size:8.5px;color:#c4a679;line-height:1.6}',
    '.v82-lb-me{margin-top:6px;padding:9px 10px;border-radius:14px;background:rgba(255,216,143,.10);border:1px dashed rgba(255,216,143,.42)}',
    '.v82-lb-me>small{font-size:7px;color:#d8b478;letter-spacing:.08em}',
    '.v82-lb-me-row{display:flex;align-items:baseline;gap:8px;margin-top:4px}',
    '.v82-lb-me-row i{font-style:normal;font-size:13.5px;font-weight:1000;color:#ffd88f}',
    '.v82-lb-me-row b{font-size:10.5px;color:#ffeccb;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.v82-lb-me-row em{font-style:normal;font-size:14.5px;font-weight:1000;color:#ffd88f}',
    '.v82-lb-me.none span{display:block;font-size:8px;color:#c4a679;margin-top:4px}',
    /* 完整榜单 */
    '.v82-full{padding:14px 14px 20px}',
    '.v82-full header{display:flex;align-items:center;gap:8px;margin-bottom:8px}',
    '.v82-full-back{flex:none;width:30px;height:30px;border-radius:999px;border:1px solid #eeddc8;background:#fff;font-size:14.5px;color:#8a6a44}',
    '.v82-full header div{flex:1;min-width:0}',
    '.v82-full header small{display:block;font-size:7px;color:#b08a58;letter-spacing:.1em}',
    '.v82-full header b{font-size:14.5px;color:#3b2f26}',
    '.v82-full-count{font-size:8.5px;color:#a08a76}',
    '.v82-full-note{font-size:8px;color:#9c8b79;line-height:1.6;margin:0 0 9px}',
    '.v82-full-list{display:flex;flex-direction:column;gap:6px}',
    '.v82-full .v82-lb-row{background:#fff8ee;border:1px solid #f0e2d1}',
    '.v82-full .v82-lb-row.top1{background:linear-gradient(120deg,#fff3d8,#fff8ee);border-color:#e8c574}',
    '.v82-full .v82-lb-row.me{outline:2px solid #e5b263}',
    '.v82-full .v82-lb-main>b{color:#3b2f26}',
    '.v82-full .v82-lb-main>small{color:#a08a76}',
    '.v82-full .v82-lb-score{color:#bc4438}',
    '.v82-full-empty{padding:24px 10px;text-align:center;font-size:9.5px;color:#a08a76}',
    '.v82-full-mine{margin-top:10px;padding:10px;border-radius:14px;background:#fff8ec;border:1px dashed #e8d2ad;font-size:9px;color:#5c4a38;text-align:center}',
    '.v82-full-mine b{color:#bc4438}',
    /* 存档槽选择（选人之后 / 继续存档） */
    '.v82-pick{padding:14px 14px 22px}',
    '.v82-pick header{display:flex;align-items:center;gap:8px;margin-bottom:12px}',
    '.v82-pick-back{flex:none;width:30px;height:30px;border-radius:999px;border:1px solid #eeddc8;background:#fff;font-size:14.5px;color:#8a6a44}',
    '.v82-pick header div{flex:1;min-width:0}',
    '.v82-pick header small{display:block;font-size:7px;color:#b08a58;letter-spacing:.1em}',
    '.v82-pick header b{font-size:14.5px;color:#3b2f26}',
    '.v82-pick-sub{font-size:7.5px;color:#a08a76}',
    '.v82-pick-grid{display:grid;gap:9px}',
    '.v82-slot{position:relative;padding:13px;border-radius:18px;background:#fff;border:1px solid #f0e2d1;display:flex;flex-direction:column;gap:3px;min-height:96px}',
    '.v82-slot>small{font-size:7.5px;color:#b08a58;letter-spacing:.08em}',
    '.v82-slot>b{font-size:14.5px;color:#3b2f26}',
    '.v82-slot>span{font-size:8px;color:#a08a76}',
    '.v82-slot-score{display:flex;align-items:baseline;gap:5px;margin-top:2px}',
    '.v82-slot-score em{font-style:normal;font-size:18px;font-weight:1000;color:#bc4438;font-variant-numeric:tabular-nums}',
    '.v82-slot-score i{font-style:normal;font-size:7.5px;color:#a08a76}',
    '.v82-slot-tag{position:absolute;right:11px;top:11px;font-size:7px;padding:2px 7px;border-radius:99px;background:#fff0df;color:#ad6335}',
    '.v82-slot.has{background:linear-gradient(160deg,#fffaf1,#fff);box-shadow:0 6px 18px rgba(120,86,50,.07)}',
    '.v82-slot.empty{border-style:dashed;align-items:center;justify-content:center;text-align:center}',
    '.v82-slot.empty.disabled{opacity:.5}',
    '.v82-slot-ico{font-size:25px;color:#dcc7ac;line-height:1}',
    '.v82-slot.empty>b{color:#a08a76;font-size:12.5px}',
    /* 退役页：成绩提交状态条 + 手动重试 */
    '.v82-submit-note{margin:12px 14px 0;padding:10px 12px;border-radius:14px;background:#fff8ee;border:1px dashed #e8d2ad;font-size:9.5px;color:#7a6552;display:flex;align-items:center;gap:8px;justify-content:space-between;line-height:1.5}',
    '.v82-submit-note.ok{background:#f2fbf4;border-color:#bfe3c8;color:#2c7a48}',
    '.v82-submit-note.err{background:#fff4f4;border-color:#efc8c9;color:#b3453f}',
    '.v82-submit-note.kept{background:#fffaf0;border-color:#e8d2ad;color:#8a6a35}',
    '.v82-submit-btn{flex:none;border:1px solid currentColor;background:transparent;color:inherit;border-radius:999px;padding:5px 11px;font-size:9.5px;font-weight:1000}'
  ].join('');
  document.head.appendChild(st82);
}catch(e){}

window.__v82Debug={hasCloud:hasCloud,lb:function(){return LB_CACHE},block:leaderboardBlockHTML,
  picker:slotPickerHTML,submit:submitMyCareer,refresh:function(){return loadLeaderboard(true)}};

})();

