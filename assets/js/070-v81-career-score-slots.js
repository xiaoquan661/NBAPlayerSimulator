
/* ============================================================================
 * v81 · 开发者第十八次反馈（四项）：
 *   ① 退役海报做得丑、展示杂乱
 *   ② 海报上缺：评级、NBA 历史排名、是否进入名人堂、本局游戏总得分
 *   ③ 本局游戏总得分 = 本局球员各项基础数据累计 + 各项荣誉 + 常规赛战绩等，
 *      算出的一个综合得分（不是球员生涯总得分），要展示在封面排行榜
 *   ④ 封面加排行榜；存档可同时进行三个，展示存档槽；排行榜要好看，
 *      不能因为加排行榜把封面搞丑
 *
 * ── 设计要点 ────────────────────────────────────────────────────────────
 *
 * 【本局游戏总得分】无上限。按开发者口径，三个来源相加：
 *   · 基础数据累计（本局比赛的得分/篮板/助攻/抢断/盖帽/出场/赛季数等）
 *   · 各项荣誉（总冠军、MVP、FMVP、最佳阵容…按权重，且用 sqrt 抑制刷次数）
 *   · 常规赛战绩（本局打赢的常规赛胜场，含胜率奖励）
 *   再乘一个「生涯高度」系数（峰值评分/赛季厚度），让强球员的天花板更高。
 *   量纲：普通生涯数百，巨星上千，历史级数千。
 *
 * 【NBA 历史排名】把本局总得分放进一张固定的「历史标杆」阶梯里比名次
 *   （乔丹、詹姆斯、贾巴尔…这些是不可超越的锚点，玩家是去挤进去，而不是重排他们）。
 *   这样「历史第 N」有真实手感，也不会出现玩家 1 分就排历史第 1。
 *
 * 【名人堂】按总得分 + 硬荣誉门槛（冠军/MVP 至少一项，或多次全明星）综合判定，
 *   分「入选 / 落选」并给出理由。
 *
 * 【三个存档槽】不动底层 save/load（v69 宿主桥依赖它们），而在其之上做
 *   「槽位路由」：每个槽有独立的存档键与内存镜像。老存档自动迁到 1 号槽。
 *   无宿主时走 localStorage 分键；有宿主时走统一存储 API 分键（不新增 localStorage 调用）。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v81Fix)return;window.__v81Fix=true;

function esc81(v){return String(v==null?'':v).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})}
function num81(v,d){var n=Number(v);return isFinite(n)?n:(d||0)}
function fmt81(n){try{return Math.round(num81(n)).toLocaleString()}catch(e){return String(Math.round(num81(n)))}}

/* ==========================================================================
 * 一、本局游戏总得分（无上限）
 * ========================================================================== */

/* 荣誉权重：与 v64 同源但更强调「本局打出来的成就」。
   用 1+0.5*sqrt(n-1) 抑制「刷次数」线性堆分。 */
var V81_HONOR_W={
  总冠军:62, FMVP:49, MVP:54, 最佳阵容:27, 最佳防阵:16,
  DPOY:27, 全明星:11.5, 最佳新秀:18, MIP:12.5,
  得分王:10, 篮板王:10, 助攻王:10, 盖帽王:10, 抢断王:10,
  '总冠军（世界赛）':40, '奥运会金牌':44
};

function v81HonorScore(h){
  var s=0;
  try{
    Object.keys(V81_HONOR_W).forEach(function(k){
      var n=num81(h&&h[k],0);
      if(n<=0)return;
      s+=V81_HONOR_W[k]*(1+0.5*Math.sqrt(n-1));
    });
  }catch(e){}
  return s;
}

/* 基础数据累计：把本局所有赛季的累计数据折算成分。
   注意：这里读的是「本局」的 careerTotals（本局生成的生涯累计），
   不是现实中该球员的生涯数据。 */
function v81DataScore(tot,avg,rec){
  var s=0;
  try{
    tot=tot||{};avg=avg||{};rec=rec||{};
    s+=num81(tot.points,0)*0.011;          /* 总得分：1 万分约 110 分 */
    s+=num81(tot.rebounds,0)*0.0055;
    s+=num81(tot.assists,0)*0.0072;
    s+=num81(tot.steals,0)*0.011;
    s+=num81(tot.blocks,0)*0.011;
    s+=num81(tot.games,0)*0.42;            /* 出场：耐久也是成就 */
    s+=num81(tot.seasons,0)*6.5;           /* 赛季厚度 */
    s+=num81(avg.pts,0)*2.1;               /* 生涯场均（峰值能力） */
    s+=num81(avg.reb,0)*1.1;
    s+=num81(avg.ast,0)*1.3;
    s+=num81(rec.gamePts,0)*0.42;          /* 单场最高分 */
    s+=num81(rec.bestPpg,0)*1.5;           /* 最好赛季场均 */
  }catch(e){}
  return s;
}

/* 常规赛战绩：本局赢下的常规赛（多赛季累计） */
function v81RecordScore(c){
  var s=0;
  try{
    var winsTotal=0,seasons=0;
    /* 优先用逐赛季历史（更真实），没有则退到本局总胜场 */
    var hist=(c&&c.history)||[];
    if(hist.length){
      hist.forEach(function(h){
        var w=num81(h&&(h.wins||h.w),0);
        if(w>0){winsTotal+=w;seasons++}
      });
    }
    if(!seasons){
      winsTotal=num81(c&&c.wins,0);
      seasons=winsTotal>0?1:0;
    }
    s+=winsTotal*0.85;                    /* 每个常规赛胜场 0.85 分 */
    if(seasons>0)s+=Math.min(140,(winsTotal/seasons)*1.15);  /* 平均胜场加成（封顶，避免单季刷） */
  }catch(e){}
  return s;
}

/* 生涯高度系数：峰值评分越高，同数据得分越高（放大强者天花板） */
function v81HeightMult(peakOvr){
  var p=Math.max(60,Math.min(99,num81(peakOvr,78)));
  return 0.72+(p-60)/39*0.78;             /* 60→0.72 倍，99→1.50 倍 */
}

/* 汇总本局总得分（明细一并返回，供海报/排行榜展示） */
function v81TotalScore(c){
  var out={total:0,data:0,honor:0,record:0,mult:1,peak:78};
  try{
    c=c||{};
    var avg={};
    try{avg=(typeof careerAverages==='function'&&c===career)?careerAverages():(c.avg||{})}catch(e){avg=c.avg||{}}
    var tot=c.tot||c.careerTotals||{};
    var rec=c.rec||c.records||{};
    var hon=c.honors||{};
    out.data=v81DataScore(tot,avg,rec);
    out.honor=v81HonorScore(hon);
    out.record=v81RecordScore(c);
    out.peak=Math.max(num81(rec.bestOvr,0),num81(c.ovr,0),78);
    out.mult=v81HeightMult(out.peak);
    out.total=Math.round((out.data+out.honor+out.record)*out.mult);
  }catch(e){}
  return out;
}
window.v81TotalScore=v81TotalScore;

/* 从当前存档取算分输入（与 v64CareerInput 同口径，但补上 avg/rec） */
function v81CurrentInput(){
  try{
    if(typeof career==='undefined'||!career)return null;
    return {
      honors:career.honors||{},
      careerTotals:career.careerTotals||{},
      tot:career.careerTotals||{},
      avg:(typeof careerAveragesV26==='function')?careerAveragesV26():(typeof careerAverages==='function'?careerAverages():{}),
      rec:career.records||{},
      ovr:career.ovr,
      wins:career.wins,
      history:career.history||[],
      playerId:career.playerId,
      seasonYear:career.seasonYear,
      draftYear:career.draftYear,
      retired:!!career.retired
    };
  }catch(e){return null}
}

/* ==========================================================================
 * 二、评级 / NBA 历史排名 / 名人堂
 * ========================================================================== */

/* 评级：按本局总得分分档（无上限，所以最高档是开放式的） */
var V81_GRADES=[
  [6000,'一代传奇','GOAT 级生涯，足以改写这项运动的历史'],
  [3500,'历史级超巨','历史前十级别的统治力'],
  [2000,'超级巨星','常年联盟门面，历史榜单上的名字'],
  [1100,'全明星常客','多年全明星，一段被记住的生涯'],
  [600,'球队基石','带队多年，联盟稳定的一线球星'],
  [300,'合格首发','在联盟站稳了脚跟'],
  [120,'轮换球员','留下过属于自己的时刻'],
  [0,'生涯遗憾','这一段旅程提前结束了']
];
function v81Grade(total){
  for(var i=0;i<V81_GRADES.length;i++){if(total>=V81_GRADES[i][0])return {name:V81_GRADES[i][1],desc:V81_GRADES[i][2]}}
  return {name:'生涯遗憾',desc:''};
}

/* NBA 历史标杆阶梯：玩家是「挤进」这张榜，而不是重排历史。
   分数是标杆的「本局评分口径」等效值（越靠前越难超越）。 */
var V81_LEGENDS=[
  {n:'迈克尔·乔丹',s:9200},
  {n:'勒布朗·詹姆斯',s:9000},
  {n:'卡里姆·阿卜杜勒-贾巴尔',s:8400},
  {n:'比尔·拉塞尔',s:7800},
  {n:'魔术师约翰逊',s:7300},
  {n:'拉里·伯德',s:7000},
  {n:'蒂姆·邓肯',s:6800},
  {n:'沙奎尔·奥尼尔',s:6500},
  {n:'科比·布莱恩特',s:6300},
  {n:'威尔特·张伯伦',s:6000},
  {n:'哈基姆·奥拉朱旺',s:5400},
  {n:'奥斯卡·罗伯特森',s:5000},
  {n:'凯文·加内特',s:4600},
  {n:'德克·诺维茨基',s:4300},
  {n:'斯蒂芬·库里',s:4100},
  {n:'凯文·杜兰特',s:3900},
  {n:'扬尼斯·阿德托昆博',s:3300},
  {n:'尼古拉·约基奇',s:3200},
  {n:'德维恩·韦德',s:2900},
  {n:'阿伦·艾弗森',s:2400}
];
function v81HistoryRank(total){
  try{
    /* 标杆按分数降序排列；「名次 = 1 + 分数比我高的标杆数」。
       注意不能写成「从头比到第一个不达标就 break」——那样任何低于榜首的
       分数都会得到第 1（实测 2450 分被错算成历史第 1）。 */
    if(total>=V81_LEGENDS[0].s)return {rank:1,label:'历史第一人',tier:'goat'};
    var above=0;
    for(var i=0;i<V81_LEGENDS.length;i++){if(total<V81_LEGENDS[i].s)above++}
    if(above<V81_LEGENDS.length){
      var rank=above+1;
      return {rank:rank,label:'历史第 '+rank+' 位',tier:rank<=20?'elite':'elite'};
    }
    /* 连最后一位标杆都没超过：给一个「区间名次」，保留位次感但不冒充历史前 20 */
    var extra=Math.max(1,Math.floor((V81_LEGENDS[V81_LEGENDS.length-1].s-total)/260));
    var approx=V81_LEGENDS.length+extra;
    if(total>=1200)return {rank:approx,label:'现役顶级（约历史第 '+approx+' 位）',tier:'elite'};
    if(total>=450)return {rank:approx,label:'现役一线球星',tier:'star'};
    if(total>=120)return {rank:approx,label:'联盟轮换级别',tier:'role'};
    return {rank:null,label:'未进入历史讨论',tier:'none'};
  }catch(e){return {rank:null,label:'未进入历史讨论',tier:'none'}}
}

/* 名人堂：总分门槛 + 硬荣誉要求（避免「数据刷子」轻松入选） */
function v81HallOfFame(total,honors){
  try{
    honors=honors||{};
    var champ=num81(honors['总冠军'],0),mvp=num81(honors['MVP'],0),fmvp=num81(honors['FMVP'],0);
    var allstar=num81(honors['全明星'],0),allnba=num81(honors['最佳阵容'],0);
    var hard=(champ>0)||(mvp>0)||(fmvp>0)||(allnba>=3)||(allstar>=6);
    var enough=total>=900;
    if(total>=1700&&hard)return {ok:true,tier:'first',label:'名人堂 · 首轮入选',reason:'生涯成就与荣誉同时达标'};
    if(enough&&hard)return {ok:true,tier:'yes',label:'入选名人堂',reason:'总得分与硬荣誉均达标'};
    if(total>=1500&&!hard)return {ok:false,tier:'no',label:'未能入选名人堂',reason:'个人数据足够，但缺少冠军/MVP 这类决定性荣誉'};
    if(total>=900&&!hard)return {ok:false,tier:'no',label:'未能入选名人堂',reason:'生涯稳定，但缺少硬荣誉支撑'};
    return {ok:false,tier:'no',label:'未能入选名人堂',reason:'生涯成就尚不足以进入名人堂讨论'};
  }catch(e){return {ok:false,tier:'no',label:'未能入选名人堂',reason:''}}
}

/* ==========================================================================
 * 三、三个存档槽
 *
 * 做法：在底层 save/load 之上做槽位路由。
 *   · 1 号槽**直接映射到项目原有的存档键**（save_bust_no1_v4 / 宿主 career_save），
 *     这样老存档天然就在 1 号槽里，不需要额外迁移、也不会出现「空槽读到旧档」。
 *   · 2/3 号槽用新键（bust_slot_2_v4 / bust_slot_3_v4；宿主侧 career_save_slot2/3）。
 *   · 宿主侧读写通过 v69 暴露的 window.__v69Save 接口，不新增 ColorboxAI 调用种类。
 * ========================================================================== */
var V81_SLOTS=[1,2,3];
var V81_SLOT_NAMES={1:'存档一',2:'存档二',3:'存档三'};
var V81_LEGACY_LOCAL='save_bust_no1_v4';   /* 项目原有本地存档键 */
var V81_LEGACY_HOST='career_save';         /* v69 的宿主键名 */

function v81ActiveSlot(){
  try{
    var s=Number((typeof career!=='undefined'&&career&&career.__slot)||ui&&ui.slot||0);
    if(s>=1&&s<=3)return s;
  }catch(e){}
  try{if(typeof ui!=='undefined'&&ui&&ui.slot>=1&&ui.slot<=3)return ui.slot}catch(e){}
  return 1;
}
/* 切换槽位。必须同时清掉 v69 的内存镜像（memCache），
   否则切到空槽时 load() 会从镜像里把上一个槽的进度读回来
   （实测：槽 1 为空却 load 到槽 2 的球员）。 */
function v81SetSlot(n){
  try{
    if(typeof ui!=='undefined'&&ui)ui.slot=n;
  }catch(e){}
  try{if(typeof memCache!=='undefined')memCache=undefined}catch(e){}
  /* memCache 是 v69 IIFE 内的变量，外部改不到；用 v69 暴露的接口兜底 */
  try{if(window.__v81ClearMirror)window.__v81ClearMirror()}catch(e){}
}

/* 记录「镜像属于哪个槽」：load 时据此拒绝跨槽镜像 */
function v81MirrorSlot(){
  try{return Number(window.__v81MirrorSlotNum)||0}catch(e){return 0}
}
function v81SetMirrorSlot(n){try{window.__v81MirrorSlotNum=n}catch(e){}}

/* 每个槽的「当前内容」内存表。
   为什么需要它：游戏自己只维护**一个**内存镜像（v69 的 memCache），
   而 v69 的 load() 一旦命中镜像就直接返回、不再往下走校验链。
   于是「玩过槽 3 再切回槽 1」会读回槽 3 的球员（实测）。
   这里按槽各存一份，作为「当前内容」的事实源；
   localStorage 仍是持久层，冷启动（表里没有）时才走完整校验链回填。 */
function v81CacheGet(n){try{var c=window.__v81SlotCareer&&window.__v81SlotCareer[n];if(!c||c.__slot&&Number(c.__slot)!==Number(n))return null;var local=v81LocalRead(n);if(local&&(!window.v169SameLife(c,local)||window.v167CompareSaves(local,c)>0))return null;return c}catch(e){return null}}
function v81CacheSet(n,obj){try{window.__v81SlotCareer=window.__v81SlotCareer||{};if(obj&&(!obj.__slot||Number(obj.__slot)===Number(n)))window.__v81SlotCareer[n]=obj}catch(e){}}
function v81CacheClear(n){try{if(window.__v81SlotCareer)delete window.__v81SlotCareer[n]}catch(e){}}

/* 槽位键：1 号槽复用项目原有键（老档即在槽 1），2/3 号槽用新键 */
function v81LocalKey(n){return n===1?V81_LEGACY_LOCAL:('bust_slot_'+n+'_v4')}
function v81HostKey(n){return n===1?V81_LEGACY_HOST:('career_save_slot'+n)}

/* 【给 v69 的钩子】告诉它「当前该写哪个云端键」。
   v69 的 hostSave 原本写死 career_save，导致在槽 2/3 玩时把槽 1 的云端档覆盖掉
   （实测：槽1 云端从第3季被改成槽2 的第1季）。有了这个钩子，
   v69 就会按当前槽写对应的云端键。 */
try{
  window.__v81HostKeyForSlot=function(){return v81HostKey(v81ActiveSlot())};
  window.__v166LocalSave=function(key){var n=key==='career_save'?1:Number((key.match(/^career_save_slot([23])$/)||[])[1]);return n?v81LocalRead(n):null};
}catch(e){}


/* 本地读写（沿用项目既有 localStorage 用法，不新增 API 种类） */
function v81LocalRead(n){
  try{if(localStorage.getItem('bust_deleted_'+n))return null}catch(e){}
  var main=null,best=null;
  function read(key,boxed){try{var o=JSON.parse(localStorage.getItem(key));return boxed?o&&o.career:o}catch(e){return null}}
  function newer(a,b){
    if(!b)return true;
    if(window.v167CompareSaves)return window.v167CompareSaves(a,b)>0;
    if(a.__saveAt&&b.__saveAt&&a.__saveAt!==b.__saveAt)return a.__saveAt>b.__saveAt;
    var ay=Number(a.seasonNo)||0,by=Number(b.seasonNo)||0;
    return ay>by||(ay===by&&(Number(a.games)||0)>(Number(b.games)||0));
  }
  main=read(v81LocalKey(n));
  if(main&&main.playerId&&(!main.__slot||Number(main.__slot)===Number(n)))best=main;
  ['bust_ckpt_','bust_backup_','bust_rescue_'].forEach(function(prefix){
    var o=read(prefix+n,prefix==='bust_ckpt_');
    if(!o||!o.playerId)return;
    if(o.__slot&&Number(o.__slot)!==Number(n))return;
    if(best){
      if(o.playerId!==best.playerId||o.draftYear!==best.draftYear)return;
      if((o.__saveId||best.__saveId)&&o.__saveId!==best.__saveId)return;
    }
    if(newer(o,best))best=o;
  });
  if(best){best.__slot=n;return best}
  return null;
}
function v81LocalWrite(n,obj,preserveStamp){
  if(!obj)return false;
  if(!obj.__saveId)obj.__saveId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
  if(!preserveStamp){obj.__saveAt=Math.max(Date.now(),Number(obj.__saveAt)||0);obj.__saveRev=(Number(obj.__saveRev)||0)+1;obj.__savePolicy=167;}
  var key=v81LocalKey(n),text,compact;
  try{
    text=JSON.stringify(obj);
    localStorage.setItem(key,text);try{localStorage.removeItem('bust_deleted_'+n)}catch(ignore){}
    return true;
  }catch(e){
    try{
      compact=JSON.parse(JSON.stringify(obj));
      if(Array.isArray(compact.feed))compact.feed=compact.feed.slice(0,60);
      if(Array.isArray(compact.storyLog))compact.storyLog=compact.storyLog.slice(-120);
      if(compact.worldline&&Array.isArray(compact.worldline.choices))compact.worldline.choices=compact.worldline.choices.slice(-120);
      text=JSON.stringify(compact);
      localStorage.setItem(key,text);try{localStorage.removeItem('bust_deleted_'+n)}catch(ignore){}
      if(window.v99Diag)window.v99Diag('save-retry-ok:slot'+n);
      return true;
    }catch(retryError){
      try{if(window.v99Diag)window.v99Diag('save-fail:slot'+n+' '+String(retryError&&retryError.message||retryError))}catch(ignore){}
      try{if(!window.__v81SaveWarning){window.__v81SaveWarning=true;if(typeof notify==='function')notify('进度未能保存，请先不要退出游戏，释放设备存储空间后重试。')}}catch(ignore){}
      return false;
    }
  }
}
function v81ClearRecovery(n){
  ['bust_ckpt_','bust_backup_','bust_rescue_'].forEach(function(prefix){try{localStorage.removeItem(prefix+n)}catch(e){}});
}
function v81LocalClear(n){try{localStorage.removeItem(v81LocalKey(n))}catch(e){};v81ClearRecovery(n);try{localStorage.setItem('bust_deleted_'+n,String(Date.now()))}catch(e){}}

/* 一个槽的「摘要」：给存档槽卡片用（不需要完整 career）。
   必须做与底层 load 相同的**合法性校验**：playerId 查不到就不算有效档，
   否则坏档（未知球员）会以「有效存档」出现在存档槽里，还能点「继续」
   —— 实测 v54 的「坏存档不再显示继续」断言就是被这个打破的。 */
function v81SlotSummary(obj){
  if(!obj||!obj.playerId)return null;
  var p=null;
  try{p=(typeof playerBy==='function')?playerBy(obj.playerId):null}catch(e){}
  if(typeof playerBy==='function'&&!p)return null;   /* 未知球员：不是有效档 */
  var tot=obj.careerTotals||{};
  var score=0,grade='';
  try{
    var r=v81TotalScore({honors:obj.honors||{},careerTotals:tot,tot:tot,rec:obj.records||{},ovr:obj.ovr,wins:obj.wins,history:obj.history||[]});
    score=r.total;grade=v81Grade(score).name;
  }catch(e){}
  return {
    name:(p&&p.zh)||obj.playerId,
    playerId:obj.playerId,
    mode:obj.playerId==='custom'?'custom':'star',
    year:obj.seasonYear||obj.draftYear||'',
    seasons:num81(tot.seasons,0),
    ovr:num81(obj.ovr,0),
    honors:obj.honors||{},
    score:score,
    grade:grade,
    retired:!!obj.retired
  };
}
window.v81SlotSummary=v81SlotSummary;

/* 读所有槽（本地 + 当前内存镜像） */
function v81ReadAllSlots(){
  var out={};
  try{
    V81_SLOTS.forEach(function(n){
      var o=null;
      try{if(n===v81ActiveSlot()&&typeof career!=='undefined'&&career)o=career}catch(e){}
      if(!o)o=v81LocalRead(n);
      if(!o)o=v81CacheGet(n);
      out[n]=v81SlotSummary(o);
    });
  }catch(e){}
  return out;
}
window.v81ReadAllSlots=v81ReadAllSlots;

/* 【宿主优先的槽位读取】
   虎扑 App 里存档存在**宿主侧**，本地 localStorage 可能是空的。
   只按本地判断会把「有进度」的槽显示成空存档 —— 玩家点了就被当成新开局、
   进度从零开始（实测复现）。这里先本地、再宿主，两处都查一遍。 */
function v81ReadAllSlotsDeep(cb){
 var out={};window.__v176SlotChecks=window.__v176SlotChecks||{};var checks=window.__v176SlotChecks;
 V81_SLOTS.forEach(function(n){out[n]=v81SlotSummaryDeep(n);var key=n===1?'career_save':'career_save_slot'+n;checks[n]=!window.__v166CloudSave?.available()||window.__v166CloudSave.hasSnapshot(key)?'ready':'checking';});
 function emit(){V81_SLOTS.forEach(function(n){var fresh=v81SlotSummaryDeep(n);if(fresh)out[n]=fresh;});try{cb(Object.assign({},out))}catch(e){}}
 emit();
 V81_SLOTS.forEach(function(n){Promise.resolve().then(function(){return v81HostReadSlot(n)}).then(function(host){
  if(host){var local=v81LocalRead(n);if(!local||window.v169SameLife(host,local)&&window.v167CompareSaves(host,local)>0){v81CacheSet(n,host);v81LocalWrite(n,host,true);}}
  var key=n===1?'career_save':'career_save_slot'+n;checks[n]=window.__v134Sync?.slots?.[key]?.status==='error'?'error':'ready';out[n]=v81SlotSummaryDeep(n);emit();
 }).catch(function(){checks[n]='error';emit();});});
}

/* 单槽判定：内存 → 缓存 → 本地 */
function v81SlotSummaryDeep(n){
  var o=null;
  try{if(n===v81ActiveSlot()&&typeof career!=='undefined'&&career)o=career}catch(e){}
  if(!o)o=v81CacheGet(n);
  if(!o)o=v81LocalRead(n);
  return v81SlotSummary(o);
}
function v81HasSlotLocal(n){
  try{
    if(n===v81ActiveSlot()&&typeof career!=='undefined'&&career)return true;
    if(v81CacheGet(n))return true;
    if(v81LocalRead(n))return true;
  }catch(e){}
  return false;
}
window.v81ReadAllSlotsDeep=v81ReadAllSlotsDeep;
window.v81HasSlotLocal=v81HasSlotLocal;

/* 点击时兜底：本地判空但宿主可能有档，读完再决定，避免误判成新开局 */
function v81EnsureSlotLoaded(n){
  if(v81HasSlotLocal(n))return Promise.resolve(true);
  return Promise.resolve((typeof v81HostReadSlot==='function')?v81HostReadSlot(n):null)
    .then(function(host){
      if(host){try{v81CacheSet(n,host);v81LocalWrite(n,host,true)}catch(e){};return true}
      return false;
    }).catch(function(){return false});
}
window.v81EnsureSlotLoaded=v81EnsureSlotLoaded;

/* 老存档迁移：1 号槽直接复用项目原有键，所以老档天然就在槽 1，无需搬运。
   这里只做一件事：把早期误写的槽键清掉，避免与旧键并存产生歧义。 */
function v81MigrateLegacy(){
  try{
    if(window.__v81Migrated)return;
    window.__v81Migrated=true;
    /* 若曾经存在过 bust_slot_1_v4（本层早期版本的键），把它并回旧键 */
    try{
      var stray=localStorage.getItem('bust_slot_1_v4');
      if(stray){
        if(!localStorage.getItem(V81_LEGACY_LOCAL))localStorage.setItem(V81_LEGACY_LOCAL,stray);
        localStorage.removeItem('bust_slot_1_v4');
      }
    }catch(e){}
  }catch(e){}
}

/* 从宿主读指定槽（异步）。返回 career 对象或 null。
   通过 v69 暴露的 storage 能力读取，不新增调用种类。 */
async function v81HostReadSlot(n){
  try{
    if(!(window.__v69Host&&window.__v69Host.hasStorage&&window.__v69Host.hasStorage()))return null;
    var initial=v81LocalRead(n),initialId=initial&&initial.__saveId,initialAt=initial&&initial.__saveAt;
    var key=v81HostKey(n);
    var v=await window.v134ReadHostStorage(key);
    if(v==null)return null;
    var data=v;
    if(typeof data==='object'&&data[key]!==undefined)data=data[key];
    if(typeof data==='string'){
      if(!data)return null;                 /* 空串 = 已清档哨兵 */
      var o=JSON.parse(data);
      return v165ResolveHostSlot(n,(o&&o.playerId)?o:null,initialId,initialAt);
    }
    return v165ResolveHostSlot(n,(data&&data.playerId)?data:null,initialId,initialAt);
  }catch(e){return null}
}
/* A host response may arrive after a newer local save or a slot replacement. */
function v165ResolveHostSlot(n,host,initialId,initialAt){
 if(window.v134Deleted&&window.v134Deleted(n))return null;
 var local=v81LocalRead(n),cached=v81CacheGet(n);
 if(cached&&(!local||(Number(cached.__saveAt)||0)>(Number(local.__saveAt)||0)))local=cached;
 if(!host||!host.playerId||host.__slot&&Number(host.__slot)!==Number(n))return local||null;
 if(!local)return host;
 if(local.__saveId!==initialId&&initialId!==undefined)return local;
 if(window.v169SameLife&&!window.v169SameLife(host,local))return local;
 if(window.v167CompareSaves)return window.v167CompareSaves(host,local)>0?host:local;
 if(local.__saveId&&host.__saveId&&local.__saveId!==host.__saveId)return local;
 if(local.playerId!==host.playerId||local.draftYear!==host.draftYear)return local;
 if(local.__saveAt&&host.__saveAt)return Number(host.__saveAt)>Number(local.__saveAt)?host:local;
 var ly=Number(local.seasonNo)||0,hy=Number(host.seasonNo)||0;
 return hy>ly||hy===ly&&(Number(host.games)||0)>(Number(local.games)||0)?host:local;
}

/* 写指定槽到宿主（异步） */
async function v81HostWriteSlot(n,obj){
  try{
    if(!(window.__v69Host&&window.__v69Host.hasStorage&&window.__v69Host.hasStorage()))return false;
    var payload={};payload[v81HostKey(n)]=JSON.stringify(obj);
    return await window.__v69Save.write(payload);
  }catch(e){return false}
}

/* 清指定槽的宿主存档（空串哨兵，统一存储 API 没有 remove） */
async function v81HostClearSlot(n){
  try{
    if(!(window.__v69Host&&window.__v69Host.hasStorage&&window.__v69Host.hasStorage()))return false;
    var payload={};payload[v81HostKey(n)]='';
    return await window.__v69Save.write(payload);
  }catch(e){return false}
}
window.v81HostReadSlot=v81HostReadSlot;
window.__v178RestoreCloud=function(n,obj,expectedId,expectedRev){if(!obj||!obj.playerId||obj.__slot&&Number(obj.__slot)!==Number(n)||window.v134Deleted(n))return false;var existing=v81LocalRead(n);if((existing?.__saveId||null)!==expectedId||(existing?.__saveRev||0)!==expectedRev)return false;if(existing&&!window.v169SameLife(existing,obj)){var backup='bust_conflict_backup_'+n+'_'+Date.now();try{localStorage.setItem(backup,JSON.stringify(existing));var check=JSON.parse(localStorage.getItem(backup));if(check?.__saveId!==existing.__saveId)return false;}catch(e){return false;}}obj.__slot=n;if(!v81LocalWrite(n,obj,true))return false;v81CacheClear(n);v81CacheSet(n,obj);v81SetSlot(n);career=obj;ui.screen=obj.retired?'retired':'career';ui.tab='season';ui.v82Picker=null;ui.modal=null;ui.storyEvent=null;ui.v130Popup=null;ui.v135Skill=false;window.__v69Save?.setMirror(obj);return true;};
window.__v167AdoptCloud=function(key,obj){var n=key==='career_save'?1:Number((key.match(/^career_save_slot([23])$/)||[])[1]);if(!n||!obj||obj.__slot&&Number(obj.__slot)!==n||window.v134Deleted(n))return false;var existing=v81LocalRead(n),cached=v81CacheGet(n);if(cached&&(!existing||window.v167CompareSaves(cached,existing)>0))existing=cached;if(existing&&window.v169SameLife&&!window.v169SameLife(obj,existing))return false;if(existing&&window.v167CompareSaves(obj,existing)<=0)return false;obj.__slot=n;v81LocalWrite(n,obj,true);v81CacheSet(n,obj);if(typeof career!=='undefined'&&career&&Number(career.__slot||v81ActiveSlot())===n){stopSim();career=obj;ui.storyEvent=null;ui.modal=null;ui.v130Popup=null;}if(window.__v69Save)window.__v69Save.setMirror(obj);return true;};

/* 接管底层 save：把当前 career 落到**当前槽**。
   槽 1 即项目原有键，所以底层 v69 的宿主写入仍然有效；
   槽 2/3 由本层额外写一份宿主副本（异步，不阻塞同步 save）。 */
try{
  if(typeof save==='function'&&!window.__v81SaveGuard){
    var __v81Save=save;
    save=function(){
      var rv=null;
      var n=1;
      try{n=v81ActiveSlot()}catch(e){}
      try{if(career){career.__slot=n;if(!career.__saveId)career.__saveId=Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);career.__saveAt=Date.now()}}catch(e){}
      /* 【关键】底层 save() 永远写 1 号槽的键（旧存档键）。
         若不处理，玩 2/3 号槽时会把 1 号槽的进度覆盖掉。
         做法：非 1 号槽时先备份 1 号槽原始内容，底层写完立即还原。 */
      var backup=null,hadBackup=false;
      if(n!==1){
        try{backup=localStorage.getItem(V81_LEGACY_LOCAL);hadBackup=true}catch(e){}
      }
      try{rv=__v81Save.apply(this,arguments)}catch(e){}
      if(n!==1){
        try{
          if(hadBackup&&backup!=null)localStorage.setItem(V81_LEGACY_LOCAL,backup);
          else localStorage.removeItem(V81_LEGACY_LOCAL);
        }catch(e){}
      }
      try{
        if(typeof career!=='undefined'&&career){
          career.__slot=n;
          v81SetMirrorSlot(n);                /* 记录「镜像现在装的是哪个槽」 */
          v81CacheSet(n,career);              /* 该槽的当前内容 */
          rv=v81LocalWrite(n,career);         /* 返回真实的持久化结果 */
          if(rv)window.__v81SaveWarning=false;
          /* v69 已按当前槽同步宿主，不重复发起同一份写入。 */
        }
      }catch(e){}
      return rv;
    };
    window.__v81SaveGuard=true;
  }
}catch(e){}

/* 接管底层 load：读**当前槽**。
   注意两点：
   1) 绝不能回退到「任意有档的槽」——否则空槽会把别的槽的进度读回来
      （实测过：槽 1 为空时 load() 读到了槽 2 的档）。
   2) 2/3 号槽的数据必须**走完整的校验/修复链**（v39 脏档修复、v40 专属档校验、
      v54 未知球员拒绝、v62 标定…）。直接返回 JSON.parse 的结果会绕过这些校验，
      实测导致「未知 id 存档被接受」「脏存档场均 79 分」等回归。
      做法：把该槽的原始文本临时放到 1 号槽的键上，让下游链正常读一遍，读完整回来。 */
try{
  if(typeof load==='function'&&!window.__v81LoadGuard){
    var __v81Load=load;
    load=function(){
      var n=1;
      try{if(typeof ui!=='undefined'&&ui&&ui.slot>=1&&ui.slot<=3)n=ui.slot}catch(e){}
      try{
        /* 先看「该槽的当前内容」内存表：存在就直接返回，避免被 v69 的
           单例镜像短路（那会导致切槽读到上一个槽的球员）。 */
        var cached=v81CacheGet(n);
        if(cached&&cached.playerId){return cached}

        /* 【统一走完整校验链】
           所有槽（含 1 号槽）都必须经过下游的校验/修复链：
           v39 脏档修复、v40 专属档校验、v54 未知球员拒绝、v62 标定…
           做法统一为：把该槽的原始文本临时放到 1 号槽的键上，
           调用下游 load（它只认这个键），读完再把 1 号槽键还原。
           早期版本对 1 号槽直接返回 JSON.parse 的结果，绕过了校验，
           实测导致「未知 id 存档被接受」「脏存档场均 79 分」等回归。 */
        var raw=null;
        try{var latest=v81LocalRead(n);raw=latest?JSON.stringify(latest):null}catch(e){raw=null}
        if(raw==null)return null;             /* 该槽确实没档 */
        var saved=null,hadSaved=false;
        try{saved=localStorage.getItem(V81_LEGACY_LOCAL);hadSaved=true}catch(e){}
        try{localStorage.setItem(V81_LEGACY_LOCAL,raw)}catch(e){}
        /* 【必须让开内存镜像】
           v69 的 load 包装在镜像非空时直接返回镜像、不再读 localStorage；
           而启动预取会把宿主存档灌进镜像。若不让开，下面这次「读我刚暂存的
           本地文本」会变成「读宿主那一份」，表现为续玩槽 1 拿到旧档
           （实测：本地第 3 季，读到宿主第 1 季）。 */
        var stashed=null;
        try{if(window.__v69Save&&typeof window.__v69Save.stashMirror==='function')stashed=window.__v69Save.stashMirror()}catch(e){}
        var out=null;
        try{out=__v81Load.apply(this,arguments)}catch(e){out=null}
        /* 还原镜像与 1 号槽键 */
        try{if(window.__v69Save&&typeof window.__v69Save.restoreMirror==='function')window.__v69Save.restoreMirror(stashed)}catch(e){}
        try{
          if(hadSaved&&saved!=null)localStorage.setItem(V81_LEGACY_LOCAL,saved);
          else localStorage.removeItem(V81_LEGACY_LOCAL);
        }catch(e){}
        if(out&&out.playerId){
          out.__slot=n;v81SetMirrorSlot(n);v81CacheSet(n,out);return out;
        }
        return null;
      }catch(e){}
      return null;
    };
    window.__v81LoadGuard=true;
  }
}catch(e){}

/* 读指定槽。
   本地优先；本地没有时**回退宿主**（虎扑 App 里存档在宿主侧），
   并走一遍下游校验链，保证与前几轮的脏档修复/校验口径一致。 */
function v81LoadSlot(n){
  try{
    var o=v81LocalRead(n);
    if(o){o.__slot=n;return o}
  }catch(e){}
  /* 本地无：尝试宿主→落地到本地→再按本地读（这样能过校验链） */
  try{
    if(!v81SlotHostFallbackStarted[n]&&typeof v81HostReadSlot==='function'){
      v81SlotHostFallbackStarted[n]=1;
      Promise.resolve(v81HostReadSlot(n)).then(function(host){
        try{
          if(host){
            host.__slot=n;
            v81LocalWrite(n,host,true);
            v81CacheSet(n,host);
            /* 读到宿主档后刷新界面（选槽页/封面） */
            if(typeof render==='function')render();
          }
        }catch(e){}
        v81SlotHostFallbackStarted[n]=0;
      }).catch(function(){v81SlotHostFallbackStarted[n]=0});
    }
  }catch(e){}
  return null;
}
var v81SlotHostFallbackStarted={};
window.v81LoadSlot=v81LoadSlot;

/* 开新档：清空目标槽后从选人页开始 */
function v81StartSlot(n){
  try{
    v81SetSlot(n);
    /* 清掉该槽的本地档、宿主档与内存内容，避免旧进度在新建后复活 */
    try{localStorage.removeItem(v81LocalKey(n))}catch(e){}
    v81ClearRecovery(n);
    try{v81HostClearSlot(n)}catch(e){}
    v81CacheClear(n);
    if(typeof career!=='undefined')career=null;
    if(typeof startSelect==='function')startSelect();
  }catch(e){}
}
window.v81StartSlot=v81StartSlot;

/* 继续某个槽（同步读本地；本地没有则尝试宿主，读到后再切界面） */
function v81ContinueSlot(n){
  try{
    v81SetSlot(n);
    var o=v81LoadSlot(n);
    if(!o){
      /* 本地无档：先查宿主（异步）。读到就继续；确实没有才提示，**绝不自动清档重开**
         —— 早期写法在「读不到」时直接调 v81StartSlot（会删除该槽），
         一旦本地读取失败（虎扑 App 里存档在宿主侧），玩家的进度就被清掉了。 */
      try{
        Promise.resolve(v81HostReadSlot(n)).then(function(host){
          try{
            if(host){
              host.__slot=n;
              v81LocalWrite(n,host,true);v81CacheSet(n,host);
              if(typeof career!=='undefined')career=host;
              ui.screen=host.retired?'retired':'career';ui.tab='season';render();
              return;
            }
            /* 宿主也没有：说明这个槽真的是空的，回到选槽页并提示，不清档 */
            if(typeof ui!=='undefined'){ui.v82Picker='pickLoad'}
            try{if(typeof v222Pop==='function')v222Pop('该存档位是空的','换一个存档位，或从「开始改写生涯」开一段新生涯。')}catch(e){}
            if(typeof render==='function')render();
          }catch(e){}
        });
        return;
      }catch(e){}
      /* 宿主不可用：同样不动存档，只提示 */
      try{if(typeof v222Pop==='function')v222Pop('暂时读不到这个存档','请稍后重试，或换一个存档位。')}catch(e){}
      if(typeof render==='function')render();
      return;
    }
    v81CacheSet(n,o);
    if(typeof career!=='undefined')career=o;
    if(typeof ui!=='undefined'){ui.screen=o.retired?'retired':'career';ui.tab='season'}
    if(typeof render==='function')render();
  }catch(e){}
}
window.v81ContinueSlot=v81ContinueSlot;

/* 删除某个槽（本地 + 宿主 + 内存内容一起清） */
function v81DeleteSlot(n){
  try{
    v81LocalClear(n);
    try{v81HostClearSlot(n)}catch(e){}
    v81CacheClear(n);
    try{if(typeof ui!=='undefined'&&ui&&ui.slot===n&&typeof career!=='undefined'&&career)career=null}catch(e){}
    /* 清掉后若当前就在这个槽，内存镜像也要失效（否则 load 又读回旧内容） */
    try{if(v81MirrorSlot()===n)v81SetMirrorSlot(0)}catch(e){}
    if(typeof render==='function')render();
  }catch(e){}
}
window.v81DeleteSlot=v81DeleteSlot;

/* 启动时迁移老档 */
try{v81MigrateLegacy()}catch(e){}

/* ==========================================================================
 * 四、退役海报重做
 *
 * 现状问题（开发者原话「做的很丑，展示的也很杂乱」）：
 *   原页把所有东西平铺：立绘 + 一大段文字 + 2×3 数据格 + 两个按钮，
 *   没有视觉层级，也没有评级/历史排名/名人堂/本局总得分。
 * 重做思路：分层。
 *   ① 顶部：海报主视觉 + 名字 + 评级徽章（一眼看到「这是几级生涯」）
 *   ② 中部：本局总得分大数字 + 历史排名 + 名人堂结论（三张卡并列）
 *   ③ 下部：得分构成（数据/荣誉/战绩 三项条形）+ 生涯数据格 + 结局
 *   ④ 底部：按钮
 * ========================================================================== */
function v81ScoreBar(label,val,max,cls){
  var w=max>0?Math.max(2,Math.min(100,Math.round(val/max*100))):0;
  return '<div class="v81-bar"><span>'+esc81(label)+'</span><i><b class="'+cls+'" style="width:'+w+'%"></b></i><em>'+fmt81(val)+'</em></div>';
}

function v81RetiredBlock(){
  var inp=v81CurrentInput();
  if(!inp)return '';
  var sc=v81TotalScore(inp);
  var grade=v81Grade(sc.total);
  var rank=v81HistoryRank(sc.total);
  var hof=v81HallOfFame(sc.total,inp.honors);
  var tot=inp.careerTotals||{};
  var avg=inp.avg||{};
  var honRows=[];
  try{
    Object.keys(V81_HONOR_W).forEach(function(k){
      var n=num81(inp.honors[k],0);
      if(n>0)honRows.push(esc81(k)+' <b>×'+n+'</b>');
    });
  }catch(e){}
  var maxPart=Math.max(sc.data,sc.honor,sc.record,1);
  return '<section class="v81-retire">'
    /* ① 总分三卡 */
    +'<div class="v81-hero">'
    +  '<div class="v81-total"><small>本局游戏总得分</small><strong>'+fmt81(sc.total)+'</strong>'
    +    '<span class="v81-grade">'+esc81(grade.name)+'</span></div>'
    +  '<div class="v81-outcome">'
    +    '<div class="v81-oc"><small>NBA 历史排名</small><b class="'+rank.tier+'">'+esc81(rank.label)+'</b></div>'
    +    '<div class="v81-oc"><small>名人堂</small><b class="'+(hof.ok?'hof-yes':'hof-no')+'">'+esc81(hof.label)+'</b>'
    +      '<span>'+esc81(hof.reason)+'</span></div>'
    +  '</div>'
    +'</div>'
    /* ② 得分构成 */
    +'<div class="v81-parts">'
    +  '<header><small>评分构成</small><b>得分构成</b>'
    +    '<span>生涯高度 ×'+(Math.round(sc.mult*100)/100)+'</span></header>'
    +  v81ScoreBar('基础数据累计',sc.data,maxPart,'p-data')
    +  v81ScoreBar('荣誉成就',sc.honor,maxPart,'p-honor')
    +  v81ScoreBar('常规赛战绩',sc.record,maxPart,'p-rec')
    +'</div>'
    /* ③ 生涯数据 */
    +'<div class="v81-stats">'
    +  '<div><b>'+fmt81(tot.seasons)+'</b><span>赛季</span></div>'
    +  '<div><b>'+fmt81(tot.games)+'</b><span>出场</span></div>'
    +  '<div><b>'+fmt81(tot.points)+'</b><span>生涯总得分</span></div>'
    +  '<div><b>'+(Math.round(num81(avg.pts,0)*10)/10)+'</b><span>场均得分</span></div>'
    +  '<div><b>'+(Math.round(num81(avg.reb,0)*10)/10)+'</b><span>场均篮板</span></div>'
    +  '<div><b>'+(Math.round(num81(avg.ast,0)*10)/10)+'</b><span>场均助攻</span></div>'
    +  '<div><b>'+num81(inp.rec&&inp.rec.bestOvr,0)+'</b><span>峰值评分</span></div>'
    +  '<div><b>'+num81(inp.wins,0)+'</b><span>本季胜场</span></div>'
    +'</div>'
    /* ④ 荣誉清单 */
    +(honRows.length?('<div class="v81-honors"><small>本局荣誉</small><p>'+honRows.join('<em>·</em>')+'</p></div>'):'')
    +'</section>';
}
window.v81RetiredBlock=v81RetiredBlock;

/* 接管退役页：把新海报插在原「生涯报告」之前，并去掉重复的旧评分块 */
try{
  if(typeof renderRetired==='function'&&!window.__v81RetirePatched){
    var __v81Retired=renderRetired;
    renderRetired=function(){
      var h=null;
      try{h=__v81Retired.apply(this,arguments)}catch(e){return h}
      try{
        if(typeof h!=='string')return h;
        var block=v81RetiredBlock();
        if(!block)return h;
        /* 插到 v32-report 之前（存在则插，否则插到 retired-card 之后） */
        var anchor=h.indexOf('<section class="v32-report"');
        if(anchor>=0)return h.slice(0,anchor)+block+h.slice(anchor);
        var rc=h.indexOf('</div><button class="btn primary"');
        if(rc>=0)return h.slice(0,rc)+block+h.slice(rc);
        return h+block;
      }catch(e){return h}
    };
    window.__v81RetirePatched=true;
  }
}catch(e){}

/* ==========================================================================
 * 五、封面：排行榜 + 三个存档槽
 *
 * 约束（开发者原话「不要因为加入排行榜把封面搞丑了，好好设计」）：
 *   · 排行榜放在封面最下方，作为一个「折叠感」的独立区块，不挤占主视觉
 *   · 三个存档槽做成横向卡片，有档显示摘要（球员/赛季/评分），无档显示「开始新生涯」
 *   · 整体沿用封面既有的暖色卡面与圆角，不引入新的视觉语言
 * ========================================================================== */
function v81ModeBadge(sum){
  if(!sum||!sum.mode)return '';
  return sum.mode==='custom'
    ? '<i class="v82-slot-mode custom">自建球员</i>'
    : '<i class="v82-slot-mode star">模拟明星</i>';
}
function v81SlotCard(n,sum,isActive){
  if(!sum){
    return '<div class="v81-slot empty"><small>'+esc81(V81_SLOT_NAMES[n])+'</small>'
      +'<div class="v81-slot-empty-ico">＋</div>'
      +'<b>空存档</b><span>点击开始新的生涯</span>'
      +'<button class="v81-slot-btn" onclick="v81StartSlot('+n+')">开始新生涯</button></div>';
  }
  return '<div class="v81-slot'+(isActive?' active':'')+(sum.retired?' retired':'')+'">'
    +'<small>'+esc81(V81_SLOT_NAMES[n])+'</small>'
    +'<b>'+esc81(sum.name)+v81ModeBadge(sum)+'</b>'
    +'<span>'+esc81(String(sum.year))+' 年 · '+sum.seasons+' 赛季 · OVR '+sum.ovr+'</span>'
    +'<div class="v81-slot-score"><em>'+fmt81(sum.score)+'</em><i>'+esc81(sum.grade||'')+'</i></div>'
    +'<div class="v81-slot-acts">'
    +  '<button class="v81-slot-btn" onclick="v81ContinueSlot('+n+')">'+(sum.retired?'查看生涯':'继续')+'</button>'
    +  '<button class="v81-slot-del" onclick="v81DeleteSlot('+n+')" title="删除该存档">✕</button>'
    +'</div></div>';
}

function v81LeaderBoard(){
  try{
    var all=v81ReadAllSlots();
    var rows=[];
    V81_SLOTS.forEach(function(n){
      var s=all[n];
      if(s&&s.score>0)rows.push({slot:n,sum:s});
    });
    if(!rows.length)return '';
    rows.sort(function(a,b){return b.sum.score-a.sum.score});
    var top=rows[0].sum.score;
    var body=rows.map(function(r,i){
      var w=top>0?Math.max(6,Math.round(r.sum.score/top*100)):0;
      return '<div class="v81-lb-row">'
        +'<i class="v81-lb-no'+(i===0?' gold':'')+'">'+(i+1)+'</i>'
        +'<div class="v81-lb-main">'
        +  '<b>'+esc81(r.sum.name)+'</b>'
        +  '<div class="v81-lb-bar"><span style="width:'+w+'%"></span></div>'
        +  '<small>'+esc81(r.sum.grade||'')+' · '+r.sum.seasons+' 赛季 · 存档'+r.slot+'</small>'
        +'</div>'
        +'<em>'+fmt81(r.sum.score)+'</em>'
        +'</div>';
    }).join('');
    return '<section class="v81-cover-lb">'
      +'<header><div><small>MY CAREER RANKING</small><b>生涯排行榜</b></div>'
      +'<span>本机 3 个存档</span></header>'
      +'<div class="v81-lb-list">'+body+'</div>'
      +'<p class="v81-lb-note">按「本局游戏总得分」排序 —— 基础数据累计 + 荣誉成就 + 常规赛战绩综合计算。</p>'
      +'</section>';
  }catch(e){return ''}
}
window.v81LeaderBoard=v81LeaderBoard;

/* 接管封面：插入存档槽与排行榜（放在承诺区之后、动作区之前/之后） */
try{
  if(typeof renderHome==='function'&&!window.__v81HomePatched){
    var __v81Home=renderHome;
    renderHome=function(){
      var h=null;
      try{h=__v81Home.apply(this,arguments)}catch(e){return h}
      try{
        if(typeof h!=='string'||h.indexOf('v81-slot')>=0)return h;
        var all=v81ReadAllSlots();
        var active=v81ActiveSlot();
        var slots='<section class="v81-slots"><header><small>SAVE SLOTS</small><b>存档槽</b>'
          +'<span>可同时保存 3 段生涯</span></header><div class="v81-slot-grid">'
          + V81_SLOTS.map(function(n){return v81SlotCard(n,all[n],n===active)}).join('')
          +'</div></section>';
        var lb=v81LeaderBoard()||'';
        /* 存档槽插在按钮区之前；排行榜放到整段封面最末，
           保证主视觉不被挤压（开发者要求「不要因为加排行榜把封面搞丑」）。
           按钮区的类名随层不同：cover-actions（v212 封面）/ case-actions（早期封面）。 */
        var act=-1,cls='';
        ['cover-actions','case-actions'].forEach(function(k){
          if(act<0){var i=h.indexOf('<div class="'+k+'"');if(i>=0){act=i;cls=k}}
        });
        if(act>=0){
          var end=h.lastIndexOf('</section>');
          if(end>act)return h.slice(0,act)+slots+h.slice(act,end)+lb+h.slice(end);
          return h.slice(0,act)+slots+h.slice(act)+lb;
        }
        return h+slots+lb;
      }catch(e){return h}
    };
    window.__v81HomePatched=true;
  }
}catch(e){}

/* ==========================================================================
 * 六、样式
 * ========================================================================== */
try{
  var st81=document.createElement('style');
  st81.id='v81-style';
  st81.textContent=[
    /* —— 退役海报 —— */
    '.v81-retire{margin-top:10px;padding:13px;border-radius:22px;background:linear-gradient(158deg,#fffaf2,#fff);border:1px solid #eeddc8;box-shadow:0 10px 26px rgba(120,86,50,.08)}',
    '.v81-hero{display:grid;grid-template-columns:1.05fr 1fr;gap:9px}',
    '.v81-total{padding:13px;border-radius:18px;background:linear-gradient(150deg,#2a2118,#4a361f 52%,#7b5626);color:#ffeccb;display:flex;flex-direction:column;justify-content:center;gap:2px}',
    '.v81-total small{font-size:7.5px;letter-spacing:.1em;color:#e0bf8c}',
    '.v81-total strong{font-size:34px;line-height:1;font-weight:1000;color:#ffd88f;font-variant-numeric:tabular-nums}',
    '.v81-grade{align-self:flex-start;margin-top:5px;font-size:9.5px;font-weight:1000;padding:3px 9px;border-radius:999px;background:rgba(255,216,143,.16);border:1px solid rgba(255,216,143,.4);color:#ffe0a6}',
    '.v81-outcome{display:flex;flex-direction:column;gap:7px}',
    '.v81-oc{padding:9px 10px;border-radius:14px;background:#fff;border:1px solid #f0e2d1;flex:1;display:flex;flex-direction:column;justify-content:center;gap:2px}',
    '.v81-oc small{font-size:7px;color:#a98a63;letter-spacing:.06em}',
    '.v81-oc b{font-size:10.5px;line-height:1.25}',
    '.v81-oc span{font-size:7px;color:#9c8b79;line-height:1.35}',
    '.v81-oc b.goat{color:#b8801f}.v81-oc b.elite{color:#bc4438}.v81-oc b.star{color:#c0692f}.v81-oc b.role{color:#8b7565}.v81-oc b.none{color:#a89a8c}',
    '.v81-oc b.hof-yes{color:#2b8a52}.v81-oc b.hof-no{color:#a89a8c}',
    '.v81-parts{margin-top:9px;padding:10px 11px;border-radius:16px;background:#fff;border:1px solid #f0e2d1}',
    '.v81-parts header{display:flex;align-items:baseline;gap:6px;margin-bottom:7px}',
    '.v81-parts header small{font-size:7px;color:#b08a58;letter-spacing:.08em}',
    '.v81-parts header b{font-size:11.5px}',
    '.v81-parts header span{margin-left:auto;font-size:7.5px;color:#a08a76}',
    '.v81-bar{display:grid;grid-template-columns:64px 1fr 46px;align-items:center;gap:7px;margin:5px 0}',
    '.v81-bar>span{font-size:8px;color:#7d6a58}',
    '.v81-bar>i{height:8px;border-radius:999px;background:#f4ece2;overflow:hidden;display:block}',
    '.v81-bar>i>b{display:block;height:100%;border-radius:999px}',
    '.v81-bar>i>b.p-data{background:linear-gradient(90deg,#6fa8dc,#3d7ebf)}',
    '.v81-bar>i>b.p-honor{background:linear-gradient(90deg,#f0c257,#d99a26)}',
    '.v81-bar>i>b.p-rec{background:linear-gradient(90deg,#7fc79a,#3d9a63)}',
    '.v81-bar>em{font-size:8.5px;font-weight:1000;color:#5c4a38;text-align:right;font-variant-numeric:tabular-nums}',
    '.v81-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:9px}',
    '.v81-stats>div{padding:8px 4px;border-radius:12px;background:#fffdf9;border:1px solid #f2e6d6;text-align:center}',
    '.v81-stats b{display:block;font-size:12.5px;color:#3b2f26;font-variant-numeric:tabular-nums}',
    '.v81-stats span{display:block;font-size:7px;color:#a08a76;margin-top:2px}',
    '.v81-honors{margin-top:9px;padding:9px 10px;border-radius:14px;background:#fff8ec;border:1px dashed #e8d2ad}',
    '.v81-honors small{font-size:7px;color:#b08a58;letter-spacing:.08em}',
    '.v81-honors p{margin:4px 0 0;font-size:8.5px;color:#5c4a38;line-height:1.7}',
    '.v81-honors p b{color:#b8801f}',
    '.v81-honors p em{font-style:normal;color:#d9c3a1;margin:0 5px}',
    /* —— 封面：存档槽 —— */
    '.v81-slots{margin:14px 14px 0;padding:12px 12px 13px;border-radius:22px;background:linear-gradient(160deg,#fffaf1,#fff);border:1px solid #eeddc8;box-shadow:0 8px 22px rgba(120,86,50,.06)}',
    '.v81-slots header{display:flex;align-items:baseline;gap:7px;margin-bottom:9px}',
    '.v81-slots header small{font-size:7px;color:#b08a58;letter-spacing:.1em}',
    '.v81-slots header b{font-size:13.5px;color:#3b2f26}',
    '.v81-slots header span{margin-left:auto;font-size:7.5px;color:#a08a76}',
    '.v81-slot-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}',
    '.v81-slot{position:relative;padding:10px 9px;border-radius:16px;background:#fff;border:1px solid #f0e2d1;display:flex;flex-direction:column;gap:3px;min-height:104px}',
    '.v81-slot.active{border-color:#e5b263;box-shadow:0 0 0 1px #f0d5a6 inset}',
    '.v81-slot.retired{background:linear-gradient(160deg,#fff8ec,#fff)}',
    '.v81-slot>small{font-size:7px;color:#b08a58;letter-spacing:.08em}',
    '.v81-slot>b{font-size:12.5px;color:#3b2f26;line-height:1.2}',
    '.v81-slot>span{font-size:7px;color:#a08a76;line-height:1.4}',
    '.v81-slot-score{margin-top:auto;display:flex;align-items:baseline;gap:4px}',
    '.v81-slot-score em{font-style:normal;font-size:16px;font-weight:1000;color:#bc4438;font-variant-numeric:tabular-nums}',
    '.v81-slot-score i{font-style:normal;font-size:7px;color:#a08a76}',
    '.v81-slot-acts{display:flex;gap:4px;margin-top:5px}',
    '.v81-slot-btn{flex:1;border:1px solid #e8b45f;border-radius:9px;padding:5px 4px;font-size:8.5px;font-weight:1000;color:#8a5a12;background:linear-gradient(180deg,#fff8e6,#ffeccb)}',
    '.v81-slot-del{flex:none;width:22px;border:1px solid #ecd9c6;border-radius:9px;background:#fff;color:#c0a48c;font-size:9.5px}',
    '.v81-slot.empty{border-style:dashed;align-items:center;justify-content:center;text-align:center}',
    '.v81-slot-empty-ico{font-size:23px;color:#dcc7ac;line-height:1}',
    '.v81-slot.empty>b{color:#a08a76}',
    '.v81-slot.empty .v81-slot-btn{width:100%;margin-top:4px}',
    /* —— 封面：排行榜 —— */
    '.v81-cover-lb{margin:10px 14px 0;padding:12px 12px 11px;border-radius:22px;background:linear-gradient(160deg,#241c14,#3d2c1c 58%,#5c3f22);color:#f6e6cc;box-shadow:0 10px 26px rgba(48,30,14,.22)}',
    '.v81-cover-lb header{display:flex;align-items:baseline;gap:7px;margin-bottom:9px}',
    '.v81-cover-lb header small{font-size:7px;color:#d8b478;letter-spacing:.1em}',
    '.v81-cover-lb header b{font-size:13.5px;color:#ffeccb}',
    '.v81-cover-lb header span{margin-left:auto;font-size:7.5px;color:#c4a679}',
    '.v81-lb-list{display:flex;flex-direction:column;gap:6px}',
    '.v81-lb-row{display:grid;grid-template-columns:20px 1fr auto;align-items:center;gap:8px;padding:7px 8px;border-radius:13px;background:rgba(255,255,255,.06);border:1px solid rgba(255,216,143,.14)}',
    '.v81-lb-no{font-style:normal;font-size:11.5px;font-weight:1000;text-align:center;color:#c4a679}',
    '.v81-lb-no.gold{color:#ffd88f;text-shadow:0 0 8px rgba(255,216,143,.5)}',
    '.v81-lb-main{min-width:0}',
    '.v81-lb-main>b{display:block;font-size:10.5px;color:#ffeccb}',
    '.v81-lb-bar{height:5px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden;margin:3px 0}',
    '.v81-lb-bar>span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#f0c257,#e08c2a)}',
    '.v81-lb-main>small{font-size:7px;color:#c4a679}',
    '.v81-lb-row>em{font-style:normal;font-size:14.5px;font-weight:1000;color:#ffd88f;font-variant-numeric:tabular-nums}',
    '.v81-lb-note{margin:8px 0 0;font-size:7px;line-height:1.5;color:#b89a70}'
  ].join('');
  document.head.appendChild(st81);
}catch(e){}

window.__v81Debug={total:function(){return v81TotalScore(v81CurrentInput()||{})},
  grade:v81Grade,rank:v81HistoryRank,hof:v81HallOfFame,slots:v81ReadAllSlots,
  retireBlock:v81RetiredBlock,leaderBoard:v81LeaderBoard};

/* 对外暴露（排行榜/退役页/测试都要用；也避免各层重复实现） */
try{
  window.v81CurrentInput=v81CurrentInput;
  window.v81Grade=v81Grade;
  window.v81HistoryRank=v81HistoryRank;
  window.v81HallOfFame=v81HallOfFame;
  window.v81ActiveSlot=v81ActiveSlot;
  window.v81SetSlot=v81SetSlot;
  window.v81SlotSummary=v81SlotSummary;
  window.v81ReadAllSlots=v81ReadAllSlots;
  window.v81TotalScore=v81TotalScore;
}catch(e){}

})();

