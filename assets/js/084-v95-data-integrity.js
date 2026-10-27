
/* ============================================================================
 * v95 · 开发者第三十七次反馈：数据自洽 + 清除虚构球员
 *
 * 原话：
 *   「火箭还是有虚拟球员，姚明得分忽高忽低，你的数据统计和得分还是不对，
 *     显示场均命中十个球，还有七次罚篮，这至少27分了吧，结果显示场均得分24，
 *     明显不对，请你真的修掉，并给我打包一个新的zip」
 *
 * ── 三个根因（全部实测确认）──────────────────────────────────────────
 *
 *  ①【得分与投篮明细对不上】—— 开发者算得完全正确
 *     实测单场：命中 7.67 球（含三分 1.30）+ 罚球 5.94 → 应为 2×7.67+1.30+5.94 = 22.59
 *     但界面显示 20.30。70 场累计更是**三套数字互不相等**：
 *       逐场显示得分     1730.00（场均 24.71）
 *       投篮明细反推     1581.00（场均 22.59）
 *       seasonStats.totalPts 1418.80（场均 20.27）
 *     根因：三条链各自独立，且被改过 ——
 *       · v26DeriveBox 由得分反推投篮明细（本该自洽），但把单场得分 Math.round 取整，
 *         而 updateAverages 累加用的是未取整的原始值 → 逐场误差累积；
 *       · 更关键：v85 的高分机制在**明细派生之后**又改了 line.pts，
 *         并把多出的分从 totalPts 扣回，却**没有同步修改投篮明细**
 *         → 明细停在旧值，与「单场得分」「累计得分」三方彻底脱钩。
 *
 *     → 修法：**以投篮明细为唯一事实源，得分由它反推**
 *       （pts ≡ 2×fgm + tpm + ftm，恒等）。每场结算后做一次「对账」：
 *       按目标得分把投篮明细调到恰好命中该等式，再把「本次调整量」作为差值
 *       同步更新所有累计值（赛季累计 + 生涯累计）。这样无论中间有谁改过得分，
 *       最终三方必然一致。
 *
 *  ②【火箭队的虚拟球员】—— 前几轮漏了这个来源
 *     v32AdvanceLeague 每年补充新秀：没有真实名单时用 v32FakeName 造虚构球员并分配到球队。
 *     而真实选秀班 V32_DRAFT_CLASSES 只覆盖 2013 年及以后，姚明时代（2002-2012）
 *     每年都走虚构分支 → 实测火箭 11 人里有 5 个虚构名（Cole Grant / Darius Vaughn / …）。
 *     → 修法：① 补齐 2002-2012 的真实选秀班；② 每次赛季推进后**清洗联盟池里的虚构球员**
 *       （纯 ASCII 名一律判为生成物），并用真实新秀补位。
 *
 *  ③【姚明得分忽高忽低】实测 60 场：最低 17、最高 37，极差 20（期望值 20.9）。
 *     两重随机叠加：固定窗口 rnd(-5,9) + v85 爆发。
 *     → 修法：把偏差**按球员水平封顶**（低端收得更紧、真正的爆发夜保留），
 *       让顶尖球员更稳定，同时不抹掉「高分夜」的观感。
 *
 * ── 顺序说明 ──────────────────────────────────────────────────────────
 *   本层最后追加，因此其 simulateGame 包装是最外层：前置代码最先跑、
 *   后置代码最后跑 —— 对账发生在所有其它层（含 v85/v26）之后，
 *   所以由它说了算。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v95Fix)return;window.__v95Fix=true;

function num95(v,d){var n=Number(v);return isFinite(n)?n:(d||0)}
function r1(v){return Math.round(num95(v,0)*10)/10}

/* ==========================================================================
 * ① 投篮明细 → 得分 的唯一事实源
 * ========================================================================== */

/* 本场「目标命中率 / 罚球命中率」：优先用生成链给出的本场值（未被覆盖时），
   否则按球员能力重算，与基础生成公式同口径。 */
function v95TargetRates(line){
  var fg=num95(line&&line.fg,0),ft=num95(line&&line.ft,0),a={};
  try{a=(typeof career!=='undefined'&&career&&career.attrs)||{}}catch(e){}
  var fin=num95(a.finishing,60),sho=num95(a.shooting,60),men=num95(a.mentality,60);
  return{
    fg:Math.max(33,Math.min(62,(fg>=25&&fg<=67)?fg:40+(fin+sho-130)*.14)),
    ft:Math.max(52,Math.min(92,(ft>=45&&ft<=96)?ft:54+sho*.22+men*.12))
  };
}
/* 由「目标得分」调整投篮明细，使 2*fgm + tpm + ftm === 目标得分（整数）恒成立。
   fgm 含三分（篮球统计惯例），所以 2*(twopm+tpm) + tpm + ftm = 2*twopm + 3*tpm + ftm。

   【命中率修正】原实现里 fga 缺省时拿 fgm 兜底（fga≡fgm → 100%），
   再由下游把 100% 夹到 68%，实测全队命中率落在 74~89%，明显失真。
   命中率的正确定义是 fgm ÷ fga，所以：出手数必须**由目标命中率反推**，
   而不是等于命中数。罚球同理——不再「灌罚球凑分」（那会把罚球率推到 90%+）。 */
function v95FitBoxToPts(line,targetPts){
  try{
    if(!line||typeof line!=='object')return false;
    var P=Math.max(0,Math.round(num95(targetPts,0)));
    var rate=v95TargetRates(line);
    var tpm=Math.max(0,Math.round(num95(line.tpm,0)));
    var tpa=Math.max(tpm,Math.round(num95(line.tpa,tpm)));
    var fta=Math.max(0,Math.round(num95(line.fta,0)));
    var ftm=Math.max(0,Math.round(num95(line.ftm,0)));

    /* 三分不能超过总得分允许的范围 */
    while(3*tpm>P&&tpm>0)tpm--;
    if(tpm>tpa)tpa=tpm;
    /* 罚球：生成链还没给出手数时，按真实罚球率造一份；
       已有出手数时只做「不能超过得分允许」的收敛，不再向上补。 */
    if(fta<=0){
      fta=Math.max(0,Math.round(1.2+P*.17));
      ftm=Math.max(0,Math.min(fta,Math.round(fta*(rate.ft/100))));
    }
    if(ftm>fta)fta=ftm;
    if(window.v135FreeThrowFactor&&!line.v135FtApplied&&window.v135FreeThrowFactor()>1){fta=Math.round(fta*window.v135FreeThrowFactor());ftm=Math.round(fta*(rate.ft/100));line.v135FtApplied=true;}
    while(3*tpm+ftm>P&&ftm>0)ftm--;
    /* 剩余分数必须是偶数才能用两分球填平。奇偶配平时优先选「最接近真实罚球率」
       的那个罚球数——原写法一律 +1，会把罚球命中率系统性抬到 90%+（实测）。 */
    var rem=P-3*tpm-ftm;
    if(rem<0){rem=0}
    if(rem%2!==0){
      var ideal=(fta>0)?Math.round(fta*(rate.ft/100)):0;
      var best=null,bestD=1e9;
      for(var off=-2;off<=2;off++){
        var fc=ideal+off;
        if(fc<0||fc>fta)continue;
        if(P-3*tpm-fc<0)continue;
        if((P-3*tpm-fc)%2!==0)continue;
        var dd=Math.abs(fc-fta*(rate.ft/100));
        if(dd<bestD-1e-9){bestD=dd;best=fc}
        else if(Math.abs(dd-bestD)<1e-9&&Math.random()<.5){best=fc}
      }
      if(best!=null)ftm=best;
      else if(ftm<fta&&P-3*tpm-(ftm+1)>=0)ftm++;
      else if(ftm>0)ftm--;
      rem=P-3*tpm-ftm;
      if(rem<0)rem=0;
    }
    var twopm=Math.floor(rem/2);
    var fgm=twopm+tpm;
    /* 出手数：已有则沿用（幂等），否则由目标命中率反推；
       旧存档里那种「命中率 >70%」的明显坏值就地自愈。 */
    var fgaWas=Math.max(0,Math.round(num95(line.fga,0)));
    var fga=fgaWas;
    if(!fga||(fgm&&fgm/fga*100>70))fga=Math.max(fgm,tpa,Math.round(fgm/(rate.fg/100)));
    /* 三分出手不能超过总出手 */
    if(tpa>fga){tpa=fga;if(tpm>tpa)tpm=tpa;fgm=twopm+tpm;if(fga<fgm)fga=fgm}

    line.tpm=tpm;line.tpa=tpa;line.ftm=ftm;line.fta=fta;line.fgm=fgm;line.fga=fga;
    line.pts=2*fgm+tpm+ftm;                       /* ← 唯一真值：由明细反推 */
    line.fg=fga?+(fgm/fga*100).toFixed(1):0;
    line.three=tpa?+(tpm/tpa*100).toFixed(1):0;
    line.ft=fta?+(ftm/fta*100).toFixed(1):0;
    return true;
  }catch(e){return false}
}
window.v95FitBoxToPts=v95FitBoxToPts;

/* 单场数据自洽性校验（供断言使用） */
function v95LineConsistent(line){
  try{
    if(!line)return false;
    var lhs=2*num95(line.fgm,0)+num95(line.tpm,0)+num95(line.ftm,0);
    return Math.abs(lhs-num95(line.pts,0))<1e-9;
  }catch(e){return false}
}
window.v95LineConsistent=v95LineConsistent;

/* 把「本次调整量」作为差值同步到所有累计值。
   applied = 上一次已计入累计的数值（由 updateAverages 包装记录） */
function v95ApplyDelta(line,applied){
  try{
    var c=(typeof career!=='undefined')?career:null;
    if(!c||!applied)return;
    var s=c.seasonStats,t=c.careerTotals;
    var dPts=num95(line.pts,0)-num95(applied.pts,0);
    var dFgm=num95(line.fgm,0)-num95(applied.fgm,0);
    var dFga=num95(line.fga,0)-num95(applied.fga,0);
    var dTpm=num95(line.tpm,0)-num95(applied.tpm,0);
    var dTpa=num95(line.tpa,0)-num95(applied.tpa,0);
    var dFtm=num95(line.ftm,0)-num95(applied.ftm,0);
    var dFta=num95(line.fta,0)-num95(applied.fta,0);

    if(s){
      s.totalPts=Math.max(0,num95(s.totalPts,0)+dPts);
      s.totalFgm=Math.max(0,num95(s.totalFgm,0)+dFgm);
      s.totalFga=Math.max(0,num95(s.totalFga,0)+dFga);
      s.total3pm=Math.max(0,num95(s.total3pm,0)+dTpm);
      s.total3pa=Math.max(0,num95(s.total3pa,0)+dTpa);
      s.totalFtm=Math.max(0,num95(s.totalFtm,0)+dFtm);
      s.totalFta=Math.max(0,num95(s.totalFta,0)+dFta);
    }
    if(t){
      t.points=Math.max(0,num95(t.points,0)+dPts);
      t.fgm=Math.max(0,num95(t.fgm,0)+dFgm);
      t.fga=Math.max(0,num95(t.fga,0)+dFga);
      t.threePm=Math.max(0,num95(t.threePm,0)+dTpm);
      t.threePa=Math.max(0,num95(t.threePa,0)+dTpa);
      t.ftm=Math.max(0,num95(t.ftm,0)+dFtm);
      t.fta=Math.max(0,num95(t.fta,0)+dFta);
    }
  }catch(e){}
}

/* 刷新场均/命中率（与 v94 同口径：由累计值反推，保留 1 位小数） */
function v95RefreshAverages(){
  try{
    var c=(typeof career!=='undefined')?career:null;
    if(!c||!c.seasonStats)return;
    var s=c.seasonStats,gp=num95(s.gp,0);
    if(gp<=0)return;
    s.totalPts=Math.max(0,num95(s.totalPts,0));
    s.pts=r1(num95(s.totalPts,0)/gp);
    s.reb=r1(num95(s.totalReb,0)/gp);
    s.ast=r1(num95(s.totalAst,0)/gp);
    var fga=num95(s.totalFga,0),tpa=num95(s.total3pa,0),fta=num95(s.totalFta,0);
    if(fga>0)s.fg=r1(num95(s.totalFgm,0)/fga*100);
    if(tpa>0)s.three=r1(num95(s.total3pm,0)/tpa*100);
    if(fta>0)s.ft=r1(num95(s.totalFtm,0)/fta*100);
  }catch(e){}
}
window.v95RefreshAverages=v95RefreshAverages;

/* 记录「这一场被 updateAverages 按哪个得分计入累计」，供对账时算差值。
   updateAverages 是所有单场结算的唯一入口（v24/v26 都复用它）。 */
/* ★ 关键接缝：updateAverages 是「得分累加」的唯一入口，且它在
   v26AccumulateBox（明细累加）**之前**执行。所以在这里就把明细拟合成
   支撑当前得分 —— 之后两条累计链（得分、明细）天然同步，
   不需要任何事后差额修补。 */
try{
  if(typeof updateAverages==='function'&&!window.__v95AvgGuard){
    var __v95Avg=updateAverages;
    updateAverages=function(line){
      try{
        if(line&&typeof line==='object'&&line.pts!=null){
          var e=null;
          try{ e=(typeof statExpect==='function')?statExpect():null }catch(err){}
          var exp=e?num95(e.pts,0):0;
          var gen=num95(line.pts,0);
          var target=Math.max(0,Math.round(exp>0?v95TameVolatility(gen,exp):gen));
          v95FitBoxToPts(line,target);          /* 明细支撑得分（自洽） */
          line.__v95acc=line.pts;               /* 记录「已按此值累加」 */
        }
      }catch(e2){}
      return __v95Avg.apply(this,arguments);
    };
    try{if(typeof window.updateAverages==='function')window.updateAverages=updateAverages}catch(e){}
    window.__v95AvgGuard=true;
  }
}catch(e){}

/* ③ 波动收窄：把与期望值的偏差按水平封顶（低端收得更紧，真爆发夜保留） */
/* 波动处理策略：**对称收窄常规波动，但「爆发夜」原样保留**。
   要同时满足三条既有约束（缺一条就会被既有断言打回）：
     ① 场均要接近期望（只收低谷会让均值上移）；
     ② 单场最高分要显著高于场均（爆砍夜必须保留）；
     ③ 单场极差要可控（这是开发者反馈的「忽高忽低」）。
   做法：|偏差| 在「常规区间」内按比例收窄；一旦达到爆发阈值就完全不动。 */
var V95_SHRINK={low:0.45,high:0.45,burstFactor:1.55};
function v95TameVolatility(pts,expect){
  try{
    var e=num95(expect,0),p=num95(pts,0);
    if(e<=0)return p;
    var dev=p-e;
    /* 爆发夜（明显高于期望）：原样保留，保证「整季最高分 ≫ 场均」 */
    if(dev>0&&p>=e*V95_SHRINK.burstFactor)return p;
    if(dev<0)return e+dev*V95_SHRINK.low;
    return e+dev*V95_SHRINK.high;
  }catch(e2){return pts}
}
window.v95TameVolatility=v95TameVolatility;

/* 对账一场比赛：处理「得分在累加之后又被改动」的剩余情况
   （v85 的高分机制挂在外层，会在 updateAverages 之后改写 line.pts）。
   此时把明细重新拟合到最终得分，并把差额同时补进「得分累计」与「明细累计」。 */
function v95ReconcileGame(g){
  try{
    if(!g||!g.line||g.played===false)return;
    if(g.__v95done)return;
    var line=g.line;
    var accPts=num95(line.__v95acc,line.pts);   /* 已按此值累加 */
    var nowPts=num95(line.pts,0);
    var boxPts=2*num95(line.fgm,0)+num95(line.tpm,0)+num95(line.ftm,0);

    /* 决定性做法：**本场得分直接取「明细反推值」**（pts ≡ 2*fgm + tpm + ftm）。
       理由：v85 会抬高得分却从 totalPts 扣回，西蒙斯专属天赋会给明细加分却
       忘了给得分加分，多条链互相纠缠。投篮明细只由本层写入、每场一次、可追踪，
       所以让明细当唯一事实源、把 pts 拉回明细是唯一稳定的定义。
       注意是「把 pts 拉回明细」，不是「把明细拟合到 pts」——
       后者会把 v85 的「高分不改场均」设计抹掉，让场均虚高。 */
    /* 本场 pts 与明细已一致时也要走一遍「累计值重算」：
       明细可能在得分累加之后才被改（西蒙斯专属天赋），
       那种情况下单场自洽但赛季累计仍缺这一块。 */
    if(Math.abs(nowPts-boxPts)>=1e-9)line.pts=boxPts;
    g.__v95done=1;

    var before={
      pts:accPts,
      fgm:num95(line.fgm,0),fga:num95(line.fga,0),
      tpm:num95(line.tpm,0),tpa:num95(line.tpa,0),
      ftm:num95(line.ftm,0),fta:num95(line.fta,0)
    };

    /* 明细本身不动，只把「得分累计」重算为明细累计反推值；
       下面的 delta 因此恒为 0（保留结构以便将来明细被改动时仍能对上账）。 */
    var dFgm=num95(line.fgm,0)-before.fgm,dFga=num95(line.fga,0)-before.fga;
    var dTpm=num95(line.tpm,0)-before.tpm,dTpa=num95(line.tpa,0)-before.tpa;
    var dFtm=num95(line.ftm,0)-before.ftm,dFta=num95(line.fta,0)-before.fta;

    var c=(typeof career!=='undefined')?career:null;
    if(c&&c.seasonStats){
      var s2=c.seasonStats;
      s2.totalFgm=Math.max(0,num95(s2.totalFgm,0)+dFgm);
      s2.totalFga=Math.max(0,num95(s2.totalFga,0)+dFga);
      s2.total3pm=Math.max(0,num95(s2.total3pm,0)+dTpm);
      s2.total3pa=Math.max(0,num95(s2.total3pa,0)+dTpa);
      s2.totalFtm=Math.max(0,num95(s2.totalFtm,0)+dFtm);
      s2.totalFta=Math.max(0,num95(s2.totalFta,0)+dFta);
    }
    if(c&&c.careerTotals){
      var t=c.careerTotals;
      t.fgm=Math.max(0,num95(t.fgm,0)+dFgm);t.fga=Math.max(0,num95(t.fga,0)+dFga);
      t.threePm=Math.max(0,num95(t.threePm,0)+dTpm);t.threePa=Math.max(0,num95(t.threePa,0)+dTpa);
      t.ftm=Math.max(0,num95(t.ftm,0)+dFtm);t.fta=Math.max(0,num95(t.fta,0)+dFta);
    }
    /* 用「明细累计反推」定稿赛季总得分，消除 v85 扣分造成的三方不一致 */
    try{
      var cc2=(typeof career!=='undefined')?career:null;
      if(cc2&&cc2.seasonStats){
        var s3=cc2.seasonStats;
        var want=2*num95(s3.totalFgm,0)+num95(s3.total3pm,0)+num95(s3.totalFtm,0);
        var diff=want-num95(s3.totalPts,0);
        s3.totalPts=want;
        if(cc2.careerTotals)cc2.careerTotals.points=Math.max(0,num95(cc2.careerTotals.points,0)+diff);
      }
    }catch(e4){}
    v95RefreshAverages();
    try{if(typeof window.v94Unify==='function')window.v94Unify()}catch(err){}
  }catch(e3){}
}
window.v95ReconcileGame=v95ReconcileGame;

/* 由 gameLog 重算赛季投篮/得分累计，并用未取整的原始分同步生涯累计差值。 */
function v95RebuildSeasonTotals(){
  try{
    var c=(typeof career!=='undefined')?career:null;
    if(!c)return;
    var s=c.seasonStats,t=c.careerTotals;
    if(!s||!t)return;
    var log=(c.gameLog||[]).filter(function(x){return x&&x.line&&x.played!==false});
    var acc={pts:0,fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,min:0,reb:0,ast:0,stl:0,blk:0,tov:0,pf:0};
    log.forEach(function(x){
      var l=x.line;
      acc.pts+=num95(l.pts,0);
      acc.fgm+=num95(l.fgm,0);acc.fga+=num95(l.fga,0);
      acc.tpm+=num95(l.tpm,0);acc.tpa+=num95(l.tpa,0);
      acc.ftm+=num95(l.ftm,0);acc.fta+=num95(l.fta,0);
      acc.min+=num95(l.min,0);acc.reb+=num95(l.reb,0);acc.ast+=num95(l.ast,0);
      acc.stl+=num95(l.stl,0);acc.blk+=num95(l.blk,0);
      acc.tov+=num95(l.tov,0);acc.pf+=num95(l.pf,0);
    });

    /* 生涯累计：用「赛季前基准 + 本赛季累计」的确定关系，
       保证「生涯 = 过往赛季 + 本赛季」恒成立，且与赛季累计同步变化。
       基准在每季首次对账时确定：careerTotals - seasonStats（此时两者都只含本季已打的场次），
       差值即「过往赛季」的累计。 */
    if(!t.__v95base||num95(t.__v95base.season,-1)!==num95(c.seasonNo,0)){
      t.__v95base={
        season:num95(c.seasonNo,0),
        pts:num95(t.points,0)-num95(s.totalPts,0),
        fgm:num95(t.fgm,0)-num95(s.totalFgm,0),
        fga:num95(t.fga,0)-num95(s.totalFga,0),
        tpm:num95(t.threePm,0)-num95(s.total3pm,0),
        tpa:num95(t.threePa,0)-num95(s.total3pa,0),
        ftm:num95(t.ftm,0)-num95(s.totalFtm,0),
        fta:num95(t.fta,0)-num95(s.totalFta,0)
      };
    }
    var B=t.__v95base;
    t.points=Math.max(0,num95(B.pts,0)+acc.pts);
    t.fgm=Math.max(0,num95(B.fgm,0)+acc.fgm);t.fga=Math.max(0,num95(B.fga,0)+acc.fga);
    t.threePm=Math.max(0,num95(B.tpm,0)+acc.tpm);t.threePa=Math.max(0,num95(B.tpa,0)+acc.tpa);
    t.ftm=Math.max(0,num95(B.ftm,0)+acc.ftm);t.fta=Math.max(0,num95(B.fta,0)+acc.fta);
    /* 赛季累计：直接覆盖为「由 gameLog 重算」的结果 */
    s.totalPts=acc.pts;
    s.totalFgm=acc.fgm;s.totalFga=acc.fga;
    s.total3pm=acc.tpm;s.total3pa=acc.tpa;
    s.totalFtm=acc.ftm;s.totalFta=acc.fta;
    s.totalMin=acc.min;s.totalReb=acc.reb;s.totalAst=acc.ast;
    s.totalStl=acc.stl;s.totalBlk=acc.blk;s.totalTov=acc.tov;s.totalPf=acc.pf;
    /* gp 以 gameLog 的实际场次为准（与明细同源） */
    if(log.length>0)s.gp=log.length;

    v95RefreshAverages();
    try{if(typeof window.v94Unify==='function')window.v94Unify()}catch(err){}
  }catch(e){}
}
window.v95RebuildSeasonTotals=v95RebuildSeasonTotals;

window.v95ReconcileGame=v95ReconcileGame;

/* 包装 simulateGame（本层最后追加 → 最外层，后置代码最后跑） */
try{
  if(typeof simulateGame==='function'&&!window.__v95SimGuard){
    var __v95Sim=simulateGame;
    simulateGame=function(){
      var before=(typeof career!=='undefined'&&career)?career.games:0;
      var r=__v95Sim.apply(this,arguments);
      try{
        var c=(typeof career!=='undefined')?career:null;
        if(c&&c.games!==before&&Array.isArray(c.gameLog)&&c.gameLog[0])v95ReconcileGame(c.gameLog[0]);
      }catch(e){}
      return r;
    };
    try{if(typeof window.simulateGame==='function')window.simulateGame=simulateGame}catch(e){}
    window.__v95SimGuard=true;
  }
}catch(e){}

/* 包装 playoffGame（季后赛单场同样对账） */
try{
  if(typeof playoffGame==='function'&&!window.__v95PoGuard){
    var __v95Po=playoffGame;
    playoffGame=function(){
      var r=__v95Po.apply(this,arguments);
      try{
        var c=(typeof career!=='undefined')?career:null;
        var po=c&&c.playoff;
        if(po&&po.rounds&&po.rounds[po.round]&&po.rounds[po.round].games){
          var gs=po.rounds[po.round].games;
          if(gs.length)v95ReconcileGame(gs[gs.length-1]);
        }
      }catch(e){}
      return r;
    };
    try{if(typeof window.playoffGame==='function')window.playoffGame=playoffGame}catch(e){}
    window.__v95PoGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * ② 清除虚构球员：补齐 2002-2012 真实选秀班 + 赛季推进后清洗联盟池
 * ========================================================================== */
var V95_DRAFT={
  '2001':['夸梅·布朗','泰森·钱德勒','保罗·加索尔','埃迪·库里','杰森·理查德森','肖恩·巴蒂尔','埃迪·格里芬','德萨加纳·迪奥普','罗德尼·怀特','乔·约翰逊'],
  '2002':['姚明','贾森·威廉姆斯','迈克·邓利维','德鲁·古登','尼古拉·茨基蒂什维利','达胡安·瓦格纳','内内','克里斯·威尔考克斯','阿玛雷·斯塔德迈尔','卡隆·巴特勒'],
  '2003':['勒布朗·詹姆斯','达科·米利西奇','卡梅隆·安东尼','克里斯·波什','德维恩·韦德','克里斯·卡曼','柯克·辛里奇','TJ·福特','迈克尔·斯威特尼','贾维斯·海耶斯'],
  '2004':['德怀特·霍华德','埃梅卡·奥卡福','本·戈登','肖恩·利文斯顿','德文·哈里斯','乔什·奇尔迪斯','罗尔·邓','拉法尔·阿劳约','安德烈·伊戈达拉','卢克·杰克逊'],
  '2005':['安德鲁·博古特','马文·威廉姆斯','德隆·威廉姆斯','克里斯·保罗','雷蒙德·费尔顿','马特尔·韦伯斯特','查理·维拉纽瓦','钱宁·弗莱','艾克·迪奥古','安德鲁·拜纳姆'],
  '2006':['安德烈·巴尔尼亚尼','拉马库斯·阿尔德里奇','亚当·莫里森','泰勒斯·托马斯','谢尔登·威廉姆斯','布兰登·罗伊','兰迪·福伊','鲁迪·盖伊','帕特里克·奥布莱恩特','穆罕默德·西内'],
  '2007':['格雷格·奥登','凯文·杜兰特','阿尔·霍福德','迈克·康利','杰夫·格林','易建联','科里·布鲁尔','布兰登·赖特','乔金·诺阿','斯宾塞·霍伊斯'],
  '2008':['德里克·罗斯','迈克尔·比斯利','OJ·梅奥','拉塞尔·威斯布鲁克','凯文·乐福','达尼罗·加里纳利','埃里克·戈登','乔·亚历山大','DJ·奥古斯丁','布鲁克·洛佩兹'],
  '2009':['布雷克·格里芬','哈希姆·塔比特','詹姆斯·哈登','泰瑞克·埃文斯','里基·卢比奥','乔尼·弗林','斯蒂芬·库里','乔丹·希尔','德玛尔·德罗赞','布兰登·詹宁斯'],
  '2010':['约翰·沃尔','埃文·特纳','德里克·费沃斯','韦斯利·约翰逊','德马库斯·考辛斯','埃佩·乌多','格雷格·门罗','阿尔·法鲁克·阿米努','戈登·海沃德','保罗·乔治'],
  '2011':['凯里·欧文','德里克·威廉姆斯','恩内斯·坎特','特里斯坦·汤普森','约纳斯·瓦兰丘纳斯','简·维塞利','俾斯麦·比永博','布兰登·奈特','肯巴·沃克','吉默·弗雷戴特'],
  '2012':['安东尼·戴维斯','迈克尔·基德-吉尔克里斯特','布拉德利·比尔','迪昂·维特斯','托马斯·罗宾逊','达米安·利拉德','哈里森·巴恩斯','特伦斯·罗斯','安德烈·德拉蒙德','奥斯汀·里弗斯']
};
/* 纯 ASCII 名字 = v32FakeName 生成物（本项目真实球员一律中文译名） */
function v95IsFakeName(name){
  try{
    var n=String(name||'').trim();
    if(!n)return false;
    return /^[A-Za-z][A-Za-z.\-' ]*$/.test(n);
  }catch(e){return false}
}
window.v95IsFakeName=v95IsFakeName;

function v95PurgeFakes(){
  try{
    var c=(typeof career!=='undefined')?career:null;
    var L=c&&c.v32League;
    if(!L||!Array.isArray(L.players))return 0;
    var before=L.players.length;
    /* 1) 只清「纯 ASCII 生成名」——本项目真实球员一律中文译名（如「OJ·梅奥」含中文，不会误判） */
    L.players=L.players.filter(function(p){return !(p&&v95IsFakeName(p.name))});
    if(L.rookies)L.rookies=L.rookies.filter(function(p){return !(p&&v95IsFakeName(p.name))});
    var removed=before-L.players.length;
    if(removed<=0)return 0;

    /* 2) 用真实球员按「每队补齐到原有人数」的方式回填，绝不堆到同一队。
          做法：先统计各队现有人数与该队应有位置，再按缺口分配真实新秀。 */
    var teams=(typeof window!=='undefined'&&window.teams&&window.teams.length)?window.teams:[];
    if(!teams.length)return removed;
    var perTeam=Math.max(1,Math.round(before/Math.max(1,teams.length)));
    var have={};
    L.players.forEach(function(p){if(p&&p.team)have[p.team]=(have[p.team]||0)+1});
    var need=[];
    teams.forEach(function(tm){var n=have[tm.abbr]||0;for(var k=n;k<perTeam;k++)need.push(tm.abbr)});
    if(!need.length)return removed;

    /* 3) 候选真实球员池：本年代真实选秀班 + 历史真实名单（去重、排除已在池中的） */
    var year=num95(c.seasonYear,2002);
    var pool=[];
    (V95_DRAFT[String(year)]||[]).forEach(function(n){pool.push(n)});
    Object.keys(V95_DRAFT).forEach(function(k){V95_DRAFT[k].forEach(function(n){pool.push(n)})});
    var exists={};L.players.forEach(function(p){exists[p.name]=1});
    var used={};
    /* 保留被取消的原虚构球员所在球队，优先补回原队，减少阵容错位 */
    var fillIdx=0;
    for(var i=0;i<pool.length&&fillIdx<need.length;i++){
      var nm=pool[i];
      if(exists[nm]||used[nm])continue;
      used[nm]=1;
      var team=need[fillIdx++];
      L.players.push({name:nm,team:team,age:19+(i%4),potential:76,ovr:68,retired:false,__v95real:1});
    }
    return removed;
  }catch(e){return 0}
}
window.v95PurgeFakes=v95PurgeFakes;

/* 赛季推进后清洗（v32AdvanceLeague 是 IIFE 内部函数，改不了 —— 所以改调用点：包装 nextSeason） */
try{
  if(typeof nextSeason==='function'&&!window.__v95NextGuard){
    var __v95Next=nextSeason;
    nextSeason=function(){
      var r=__v95Next.apply(this,arguments);
      try{ v95PurgeFakes() }catch(e){}
      return r;
    };
    try{if(typeof window.nextSeason==='function')window.nextSeason=nextSeason}catch(e){}
    window.__v95NextGuard=true;
  }
}catch(e){}

/* 渲染时也清洗一次：兜住任何绕过 nextSeason 的路径（读档、自愈等） */
try{
  if(typeof render==='function'&&!window.__v95RenderGuard){
    var __v95Render=render;
    render=function(){
      try{ v95PurgeFakes() }catch(e){}
      return __v95Render.apply(this,arguments);
    };
    try{if(typeof window.render==='function')window.render=render}catch(e){}
    window.__v95RenderGuard=true;
  }
}catch(e){}

/* 读档后补一次（老存档里已混入虚构球员） */
try{
  if(typeof load==='function'&&!window.__v95LoadGuard){
    var __v95Load=load;
    load=function(){
      var r=__v95Load.apply(this,arguments);
      try{ v95PurgeFakes() }catch(e){}
      return r;
    };
    try{if(typeof window.load==='function')window.load=load}catch(e){}
    window.__v95LoadGuard=true;
  }
}catch(e){}

/* 全量自检：赛季得分三方是否一致 + 阵容是否含虚构名 */
function v95Audit(){
  try{
    var c=(typeof career!=='undefined')?career:null;
    if(!c)return null;
    var s=c.seasonStats||{},gp=num95(s.gp,0);
    var byBox=gp?(2*num95(s.totalFgm,0)+num95(s.total3pm,0)+num95(s.totalFtm,0))/gp:0;
    var byTot=gp?num95(s.totalPts,0)/gp:0;
    var fakes=[];
    try{
      var L=c.v32League;
      if(L&&L.players)L.players.forEach(function(p){if(v95IsFakeName(p.name))fakes.push(p.name)});
    }catch(e){}
    return {
      gp:gp,
      ptsDisplayed:num95(s.pts,0),
      ptsByTotal:r1(byTot),
      ptsByBox:r1(byBox),
      diffTotal:Math.abs(num95(s.pts,0)-r1(byTot)),
      diffBox:Math.abs(num95(s.pts,0)-r1(byBox)),
      fakePlayers:fakes
    };
  }catch(e){return null}
}
window.v95Audit=v95Audit;

window.__v95Debug={fitBox:v95FitBoxToPts,consistent:v95LineConsistent,
  tame:v95TameVolatility,reconcile:v95ReconcileGame,purge:v95PurgeFakes,
  audit:v95Audit,isFake:v95IsFakeName,draft:V95_DRAFT,shrink:V95_SHRINK,rebuild:v95RebuildSeasonTotals};

})();

