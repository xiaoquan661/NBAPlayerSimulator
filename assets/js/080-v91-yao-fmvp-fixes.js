
/* ============================================================================
 * v91 · 开发者第三十三次反馈：姚明体验五项修复
 *
 * 原话：
 *   「姚明 我是看了广告的 然后得分一直是二十分左右，好低啊，夺冠后我发现
 *     和我争fmvp的是什么杰伦科尔，马库斯里德什么的，根本不认识啊，不应该是
 *     麦迪吗，是不是虚构的没删掉，还有亚锦赛是不是没接进来？我玩的时候没有
 *     亚锦赛，还有有时候会玩着玩着突然白屏」
 *   「我也发现了一个问题，白屏之后我退出从新进来，进存档后卡在了fmvp选票
 *     那里，投了五张，然后后面的不动了，我现在什么也操作不了，就卡在这」
 *
 * ── 五个问题与根因（均已实测复现）─────────────────────────────────────
 *  ①【阻塞·最高优先】FMVP 选票死锁
 *     夺冠后 startFmvpCeremony() 靠 **setTimeout 链**逐张开票，这条链不落盘。
 *     开到一半页面重载（白屏/退出重进）后：存档里 fmvpCeremony.done 仍是 false、
 *     index 停在 5，但**开票循环没有任何地方被重新拉起**（v218RunVote 是 IIFE
 *     内部函数，不是全局，外部无法重启）；浮层见 done=false 只渲染
 *     「选票正在一张一张开出…」且**没有按钮**；v73 的补启动条件是
 *     `!career.fmvpCeremony`（对象存在，不触发）→ **永久卡死，无法操作**。
 *     → 修法（三重保险）：①「卡死检测」自动接管续投；②浮层兜底按钮
 *       「立即开出剩余选票」保证任何状态都有出口；③全局错误时补完选票。
 *
 *  ②【姚明数据失真】按球员 id 的查表全部缺 `yao` 键
 *     statExpect 的 rebFactor / astFactor / blkFactor / rebCap / astCap 都只有
 *     oden/kwame/bennett/fultz/simmons，姚明一律落兜底（rebFactor 0.8）→
 *     篮板被压在 4~8 个。姚明真实是 22+10 的顶级内线。
 *     → 修法：在 statExpect 出口对姚明做内线校正（篮板/盖帽放大、助攻收敛、
 *       得分上限放宽），并把专属天赋纳入上限计算。
 *
 *  ③【FMVP 对手是虚构名字】v218CoStarName 只给 4 支球队配了真实球员，
 *     其余 20+ 支（含姚明的 HOU）全部落到兜底虚构名单
 *     ['马库斯·里德','杰伦·科尔',…]。姚明夺冠时争 FMVP 的应是麦迪。
 *     → 修法：改用可覆盖的接缝 window.v218FinalsAverages，把搭档名替换为
 *       **全部 30 支球队**的真实球员（按年代切换），彻底删掉虚构兜底名。
 *
 *  ④【亚锦赛没触发】赛制已实现（v66），但挂在 endSeason，且夺冠赛季会被
 *     「FMVP 仪式未完成」拦下 —— 一旦仪式卡死（问题①），征召**永远弹不出来**。
 *     → 修法：修好死锁即恢复；并把补弹挂到每次渲染，刷新后不丢。
 *
 *  ⑤【白屏】v54 只兜住 render()，异步回调与浮层注入路径无兜底。
 *     → 修法：补全局错误捕获 + 恢复逻辑，任何抛错都降级为可交互提示。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v91Fix)return;window.__v91Fix=true;

function num91(v,d){var n=Number(v);return isFinite(n)?n:(d||0)}

/* ==========================================================================
 * 问题 ② · 姚明内线校正（按球员 id 查表全部缺 yao 键）
 *   校正依据：姚明真实生涯 22+10，篮板/盖帽顶级、助攻少（高位策应但不是组织核心）。
 *   参考档位：奥登（同类型内线，rebFactor 1.32 / astFactor 0.42 / blkFactor 1.46）。
 * ========================================================================== */
var V91_YAO={
  rebFactor:1.30,     /* 原落兜底 0.8 → 顶级内线 */
  astFactor:0.46,     /* 原落兜底 0.7 → 内线策应 */
  blkFactor:1.40,     /* 原落兜底 0.6 → 护框顶级 */
  rebCap:13.0,        /* 原落兜底 11 */
  astCap:4.2,         /* 原落兜底 9 */
  scoreCapBonus:3.5   /* 顶级内线不该被 17 分上限卡死 */
};

try{
  if(typeof statExpect==='function'&&!window.__v91StatGuard){
    var __v91Stat=statExpect;
    statExpect=function(){
      var out=__v91Stat.apply(this,arguments);
      try{
        if(!out||typeof out!=='object')return out;
        var c=(typeof career!=='undefined')?career:null;
        if(!c||c.playerId!=='yao')return out;
        var a=c.attrs||{},m=c.minutes||20;
        var minFactor=Math.max(.52,Math.min(1.22,m/30));
        var reb=Math.max(1,(((num91(a.rebounding,60)-48)*.14)+3.7)*minFactor*V91_YAO.rebFactor);
        var ast=Math.max(.5,(((num91(a.playmaking,60)-44)*.13)+1.1)*minFactor*V91_YAO.astFactor);
        var blk=Math.max(.1,((num91(a.defense,60)-44)*.031+Math.max(0,num91(a.rebounding,60)-60)*.013)*minFactor*V91_YAO.blkFactor);
        out.reb=Math.max(1,Math.min(reb,V91_YAO.rebCap));
        out.ast=Math.max(.5,Math.min(ast,V91_YAO.astCap));
        out.blk=Math.max(.1,blk);
        var hasExclusive=false;
        try{hasExclusive=!!(c.talents&&c.talents.indexOf('yao_x')>=0)}catch(e){}
        if(hasExclusive){
          var cap=15+(num91(c.ovr,74)-74)*.62+V91_YAO.scoreCapBonus;
          out.pts=Math.max(3,Math.min(out.pts,Math.min(cap,31)));
        }
      }catch(e){}
      return out;
    };
    try{if(typeof window.statExpect==='function')window.statExpect=statExpect}catch(e){}
    window.__v91StatGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 问题 ③ · FMVP 搭档真实球员表（覆盖全部 30 支球队，删除虚构兜底）
 *   接缝：v218CoStarName 是 IIFE 内部函数、无法覆盖；
 *   但它产出的结果通过 v218FinalsAverages 返回，而后者是 window 导出 —— 在此替换。
 * ========================================================================== */
var V91_COSTAR={
  ATL:{sw:2017,a:'Joe Johnson',b:'Trae Young'},
  BOS:{sw:2016,a:'Paul Pierce',b:'Jayson Tatum'},
  BKN:{sw:2019,a:'Deron Williams',b:'Kevin Durant'},
  CHA:{sw:2011,a:'Gerald Wallace',b:'Kemba Walker'},
  CHI:{sw:2014,a:'Derrick Rose',b:'Jimmy Butler'},
  CLE:{sw:2014,a:'Kyrie Irving',b:'LeBron James'},
  DAL:{sw:2018,a:'Dirk Nowitzki',b:'Luka Doncic'},
  DEN:{sw:2015,a:'Carmelo Anthony',b:'Nikola Jokic'},
  DET:{sw:2021,a:'Chauncey Billups',b:'Cade Cunningham'},
  GSW:{sw:2009,a:'Baron Davis',b:'Stephen Curry'},
  HOU:{sw:2012,a:'Tracy McGrady',b:'James Harden'},
  IND:{sw:2010,a:'Jermaine ONeal',b:'Paul George'},
  LAC:{sw:2011,a:'Elton Brand',b:'Chris Paul'},
  LAL:{sw:2018,a:'Kobe Bryant',b:'LeBron James'},
  MEM:{sw:2019,a:'Marc Gasol',b:'Ja Morant'},
  MIA:{sw:2019,a:'Dwyane Wade',b:'Jimmy Butler'},
  MIL:{sw:2013,a:'Michael Redd',b:'Giannis Antetokounmpo'},
  MIN:{sw:2015,a:'Kevin Garnett',b:'Karl-Anthony Towns'},
  NOP:{sw:2019,a:'Anthony Davis',b:'Brandon Ingram'},
  NYK:{sw:2022,a:'Carmelo Anthony',b:'Jalen Brunson'},
  OKC:{sw:2016,a:'Kevin Durant',b:'Russell Westbrook'},
  ORL:{sw:2022,a:'Dwight Howard',b:'Paolo Banchero'},
  PHI:{sw:2016,a:'Andre Iguodala',b:'Joel Embiid'},
  PHX:{sw:2015,a:'Steve Nash',b:'Devin Booker'},
  POR:{sw:2012,a:'Brandon Roy',b:'Damian Lillard'},
  SAC:{sw:2017,a:'Peja Stojakovic',b:'DeAaron Fox'},
  SAS:{sw:2011,a:'Tim Duncan',b:'Kawhi Leonard'},
  TOR:{sw:2019,a:'Kyle Lowry',b:'Pascal Siakam'},
  UTA:{sw:2017,a:'Deron Williams',b:'Donovan Mitchell'},
  WAS:{sw:2010,a:'Gilbert Arenas',b:'Bradley Beal'}
};

/* sw = 后期搭档接班的年份；早于它用 a，否则用 b */
function v91CoStarFor(team,year){
  var e=V91_COSTAR[team];
  if(!e)return null;
  return year<e.sw?e.a:e.b;
}
window.v91CoStarFor=v91CoStarFor;

/* 从「当前联盟名单」里找该队真实二当家：联盟球员会随赛季变老、下滑、退役，
   所以这里拿到的名字天然是当赛季该队的人。找不到（老存档没有联盟数据）时才回退静态表。
   ── 为什么必须这么改：静态表里快船的搭档永远写「克里斯·保罗」，
   实测打到第 29 年、保罗早已退役，FMVP 页面还在写保罗场均 30+10+6。 */
function v91LeagueMate(team,meZh){
  try{
    var c=(typeof career!=='undefined')?career:null;
    var L=c&&c.v32League&&c.v32League.players;
    if(!L||!L.length)return null;
    var best=null;
    L.forEach(function(p){
      if(!p||p.team!==team||p.retired)return;
      if(p.name===meZh||p.zh===meZh)return;              /* 排除玩家自己 */
      if(!best||Number(p.ovr)>Number(best.ovr))best=p;
    });
    return best;
  }catch(e){return null}
}
window.v91LeagueMate=v91LeagueMate;

try{
  if(typeof window.v218FinalsAverages==='function'&&!window.__v91CoStarGuard){
    var __v91Finals=window.v218FinalsAverages;
    window.v218FinalsAverages=function(){
      var d=__v91Finals.apply(this,arguments);
      try{
        var c=(typeof career!=='undefined')?career:null;
        if(!c||!d||!d.co)return d;
        var meZh='';
        try{meZh=(typeof currentP==='function'&&currentP())?currentP().zh:''}catch(e){}
        var mate=v91LeagueMate(c.team,meZh);
        if(mate){
          /* 名字用当赛季该队的真实二当家；数据也按他的评分给，
             而不是给一个和球员无关的固定高分（原来谁都能场均 30+10+6）。 */
          d.co.name=mate.name;
          d.co.ovr=Number(mate.ovr)||80;
          d.co.age=Number(mate.age)||26;
          var seed=Math.abs((typeof stableHash==='function')?stableHash(String(c.seasonYear)+'-'+c.team+'-mate'):0);
          var j=function(n){return (seed>>n)%5-2};
          var ovr=d.co.ovr,arch=seed%3;   /* 0=内线 1=锋线 2=后卫 */
          d.co.pts=Math.max(8,Math.min(32,Math.round(11+(ovr-70)*.8+j(2))));
          d.co.reb=Math.max(3,Math.min(15,Math.round((arch===0?9:arch===1?5.5:3.5)+(ovr-70)*(arch===0?.12:arch===1?.10:.07)+j(5))));
          d.co.ast=Math.max(2,Math.min(12,Math.round((arch===2?6:arch===1?3.5:2)+(ovr-70)*(arch===2?.16:arch===1?.10:.06)+j(8))));
        }else{
          var name=v91CoStarFor(c.team,num91(c.seasonYear||c.draftYear,2005));
          if(name)d.co.name=name;
        }
      }catch(e){}
      return d;
    };
    try{if(typeof v218FinalsAverages==='function')v218FinalsAverages=window.v218FinalsAverages}catch(e){}
    window.__v91CoStarGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 问题 ① · FMVP 选票断点续投
 *   三重保险：
 *     A. 卡死检测：仪式未完成、且观察到「票数不再推进」→ 自动接管把剩余票开完
 *     B. 浮层兜底按钮：任何未完成状态都给「立即开出剩余选票」（保证有出口）
 *     C. 全局错误恢复：出错时补完选票，避免停在半路
 *   注：v32 的 finishFmvpCeremony 会以 expectedP/expectedC 覆盖最终票数，
 *      所以动画期间的票数漂移不影响最终结果的正确性。
 * ========================================================================== */
try{
  if(typeof career!=='undefined'&&career===null){/* noop */}
}catch(e){}
/* ==========================================================================
 * 问题 ④ · 亚锦赛年份规则修正（真正的「没接进来」）
 *
 * 原实现（v66-world-port.js 的 v66EventForYear）：
 *   if(year>=2004&&(year-2004)%4===0)return 奥运会;      // 2004,2008,2012…
 *   if(year>=2002&&(year-2002)%4===0)return 世界杯;      // 2002,2006,2010…
 *   if(year>=2002&&(year-2002)%4===2)return 亚锦赛;      // 2004,2008,2012…
 *                                    ↑ 与奥运会的年份**完全重合**，
 *                                      而奥运会在前面先返回 → 亚锦赛永远不可达。
 * 这就是开发者「我玩的时候没有亚锦赛」的确切原因。
 *
 * 修法：给亚锦赛独立的年份（2003 起每 4 年，即 2003/2007/2011/2015…），
 * 与奥运会（…2004/2008…）、世界杯（…2002/2006/2010…）互不冲突。
 * 姚明 2002 年进入联盟，第 2 季（2003）就能遇到首届亚锦赛。
 * ========================================================================== */
/* 修正年份规则 + 重写触发判定。
   注意：v66 层内部调用的是**局部** v66EventForYear，只覆盖 window 上的
   同名导出对真实触发路径无效（实测确认），所以这里连 v66ShouldTrigger 一起接管。 */
var V91_ASIA_START=2003;   /* 亚锦赛：2003 起每 4 年（2003/2007/2011…） */

function v91EventForYear(year){
  try{
    year=Number(year)||0;
    if(year>=V91_ASIA_START&&(year-V91_ASIA_START)%4===0){
      return{type:'asiaCup',title:'亚锦赛（FIBA亚洲杯）',emoji:'🏆'};
    }
  }catch(e){}
  try{
    if(typeof window.__v91OrigEventForYear==='function')return window.__v91OrigEventForYear(year);
  }catch(e){}
  return null;
}

try{
  if(typeof window.v66EventForYear==='function'&&!window.__v91EventGuard){
    window.__v91OrigEventForYear=window.v66EventForYear;
    window.v66EventForYear=v91EventForYear;
    window.__v91EventGuard=true;
  }
}catch(e){}

try{
  if(typeof window.v66ShouldTrigger==='function'&&!window.__v91TriggerGuard){
    var __v91Should=window.v66ShouldTrigger;
    window.v66ShouldTrigger=function(){
      try{
        var c=(typeof career!=='undefined')?career:null;
        if(!c||c.retired)return null;
        if(c.playerId!=='yao')return null;
        if((c.talents||[]).indexOf('yao_x')<0)return null;
        var year=Number(c.seasonYear)||0;
        var ev=v91EventForYear(year);        /* 用修正后的年份规则 */
        if(!ev)return null;
        var hist=(c.v66Intl&&c.v66Intl.history)||[];
        if(hist.some(function(x){return x.year===year&&x.type===ev.type}))return null;
        return{event:ev,year:year};
      }catch(e){}
      return __v91Should.apply(this,arguments);
    };
    try{if(typeof v66ShouldTrigger==='function')v66ShouldTrigger=window.v66ShouldTrigger}catch(e){}
    window.__v91TriggerGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 问题 ① · FMVP 选票断点续投（三重保险）
 *   A. 确定性宽限计时器：仪式未完成 → 挂一个宽限计时器；
 *      宽限期内若正常开票链把它开完就撤掉，否则由我们补完（不依赖渲染次数）
 *   B. 浮层兜底按钮：任何未完成状态都给「立即开出剩余选票」（保证有出口）
 *   C. 全局错误恢复：出错时补完选票
 *   注：v32 的 finishFmvpCeremony 会以 expectedP/expectedC 覆盖最终票数，
 *      所以动画期间票数提前补完不影响最终结果正确性。
 * ========================================================================== */
var _v91GraceTimer=null;
var V91_GRACE_MS=4500;   /* 正常开票 260ms/张 × 11 张 ≈ 2.9s，留足余量 */

function v91Ceremony(){
  try{return (typeof career!=='undefined'&&career)?career.fmvpCeremony:null}catch(e){return null}
}

/* 把剩余的票一次开完（幂等） */
function v91CompleteVotes(){
  try{
    var f=v91Ceremony();
    if(!f||f.done)return false;
    if(!Array.isArray(f.sequence))return false;
    while(f.index<f.sequence.length){
      var w=f.sequence[f.index++];
      if(w==='p')f.pVotes++;else f.cVotes++;
    }
    f.done=true;f.winner=f.pVotes>f.cVotes?'player':'co';
    if(typeof save==='function')save();
    return true;
  }catch(e){return false}
}
window.v91CompleteVotes=v91CompleteVotes;

/* A. 宽限计时器：每次渲染后确保「未完成的仪式」有一个兜底截止时间 */
function v91Watch(){
  try{
    var f=v91Ceremony();
    if(!f||f.done){
      if(_v91GraceTimer){try{clearTimeout(_v91GraceTimer)}catch(e){}_v91GraceTimer=null}
      return;
    }
    if(_v91GraceTimer)return;   /* 已在计时中，不重复挂 */
    _v91GraceTimer=setTimeout(function(){
      _v91GraceTimer=null;
      try{
        var g=v91Ceremony();
        if(g&&!g.done){
          /* 宽限期到仍未完成 → 开票链已断（例如中途重载），直接补完 */
          if(v91CompleteVotes()&&typeof render==='function')render();
        }
      }catch(e){}
    },V91_GRACE_MS);
  }catch(e){}
}

/* ==========================================================================
 * 问题 ⑤ · 全局错误恢复（白屏兜底）
 * ========================================================================== */
window.__v91Errors=window.__v91Errors||[];
window.v91Recover=function(){
  try{ v91CompleteVotes(); }catch(e){}
};
try{
  if(typeof window.addEventListener==='function'&&!window.__v91ErrGuard){
    window.addEventListener('error',function(ev){
      try{window.__v91Errors.push(String((ev&&ev.message)||ev))}catch(e){}
      try{window.v91Recover()}catch(e){}
      try{if(typeof render==='function')render()}catch(e){}
    });
    window.__v91ErrGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 问题 ①B · 包装 renderOverlay：未完成时补可点出口
 * ========================================================================== */
try{
  if(typeof renderOverlay==='function'&&!window.__v91OverlayGuard){
    var __v91Overlay=renderOverlay;
    renderOverlay=function(){
      var h=__v91Overlay.apply(this,arguments);
      try{
        var f=v91Ceremony();
        if(f&&!f.done&&typeof h==='string'&&h.indexOf('选票正在一张一张开出')>=0){
          var btn='<button class="btn primary" style="width:100%;margin-top:12px" onclick="v91CompleteVotes();render()">立即开出剩余选票</button>';
          h=h.replace(/<div class="v218-counting"><i><\/i><span>选票正在一张一张开出…<\/span><\/div>/,
            '<div class="v218-counting"><i></i><span>选票正在一张一张开出…</span></div>'+btn);
        }
      }catch(e){}
      return h;
    };
    try{if(typeof window.renderOverlay==='function')window.renderOverlay=renderOverlay}catch(e){}
    window.__v91OverlayGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 问题 ①A + ④ · 包装 render：每次渲染后挂兜底计时器 + 补弹征召
 * ========================================================================== */
try{
  if(typeof render==='function'&&!window.__v91RenderGuard){
    var __v91Render=render;
    render=function(){
      var r=__v91Render.apply(this,arguments);
      try{ v91Watch(); }catch(e){}
      try{ if(typeof window.v66MaybeShowInvite==='function')window.v66MaybeShowInvite(); }catch(e){}
      return r;
    };
    try{if(typeof window.render==='function')window.render=render}catch(e){}
    window.__v91RenderGuard=true;
  }
}catch(e){}

/* 启动补一次（首次进入存档即触发；此时渲染可能还没跑） */
try{
  setTimeout(function(){
    try{ v91Watch(); }catch(e){}
    try{if(typeof window.v66MaybeShowInvite==='function')window.v66MaybeShowInvite()}catch(e){}
  },800);
}catch(e){}

window.__v91Debug={costar:V91_COSTAR,yao:V91_YAO,coStarFor:v91CoStarFor,
  complete:v91CompleteVotes,watch:v91Watch,recover:window.v91Recover,grace:V91_GRACE_MS};

})();

