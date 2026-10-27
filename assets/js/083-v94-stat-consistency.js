
/* ============================================================================
 * v94 · 开发者第三十六次反馈：赛季页数据口径统一
 *
 * 原话：
 *   「还有赛季界面你下方的详细数据计算出来，和你显示的场均得分不一样」
 *
 * ── 问题（实测）──────────────────────────────────────────────────────
 *   赛季页同一屏里，命中率出现两个不同的值：
 *
 *     项        上方显示(seasonStats.fg/.three)   下方详细面板        差异
 *     命中 FG%   44.5                             44.2% (500/1131)    0.3
 *     三分 3P%   34.9                             37.0% (87/235)      2.1
 *
 *   根因：**两者口径不同**
 *     · seasonStats.fg/.three 存的是「逐场命中率的算术平均」
 *       （updateAverages 里 `s.fg=(s.fg*s.gp+line.fg)/n` 逐场递推平均）；
 *     · 详细面板 v26SeasonAdvanced() 算的是「总命中 ÷ 总出手」。
 *
 *   这两个在数学上**不等价**（例：三场 43.75%/50%/40%，逐场平均 44.6%，
 *   总和比 46.1%）。命中率的**正确定义是总和比**。
 *
 *   顺带：s.pts 用逐场递推平均、s.totalPts 用累加，长期有浮点漂移
 *   （实测 82 场后偏差约 0.05）。虽小，但同样应统一为「累计值反推」。
 *
 * ── 修法 ──────────────────────────────────────────────────────────────
 *   在「每次赛季数据变化后」把派生量统一由**累计值**反推：
 *     pts  = totalPts / gp
 *     fg   = totalFgm / totalFga * 100
 *     three= total3pm / total3pa * 100
 *   这样「上方显示」与「下方详细数据」在数学上**必然相等**，
 *   也彻底消除递推平均的浮点漂移。
 *
 *   接缝：包装 updateAverages（每次单场结算后的唯一入口）与几个读写点，
 *   在返回前统一口径；另在老存档载入时自愈一次。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v94Fix)return;window.__v94Fix=true;

function num94(v,d){var n=Number(v);return isFinite(n)?n:(d||0)}

/* 把 seasonStats 的派生量按「累计值 ÷ 场次 / 总出手」重算，保证口径唯一。
   只改派生量（pts/reb/ast/stl/blk/fg/three），不动累计值本身。
   注意：场均保留 1 位小数（沿用 v85 既有约定，避免显示 19.107142857 这类长尾）；
   v85 的单场高分机制也会按 (totalPts/gp) 取整到 1 位，两者一致。 */
function v94Round1(v){return Math.round(num94(v,0)*10)/10}
function v94Unify(){
  try{
    var c=(typeof career!=='undefined')?career:null;
    if(!c)return;
    var s=c.seasonStats;
    if(!s||typeof s!=='object')return;
    var gp=num94(s.gp,0);
    if(gp<=0)return;

    /* ① 场均：由累计值反推（保留 1 位小数，与 v85 的取整口径一致） */
    if(num94(s.totalPts,0)>0||num94(s.totalReb,0)>0||num94(s.totalAst,0)>0){
      s.pts=v94Round1(num94(s.totalPts,0)/gp);
      s.reb=v94Round1(num94(s.totalReb,0)/gp);
      s.ast=v94Round1(num94(s.totalAst,0)/gp);
    }
    if(num94(s.totalStl,0)>0)s.stl=v94Round1(num94(s.totalStl,0)/gp);
    if(num94(s.totalBlk,0)>0)s.blk=v94Round1(num94(s.totalBlk,0)/gp);

    /* ② 命中率：一律用「总命中 ÷ 总出手」（命中率的标准定义，保留 1 位小数） */
    var fga=num94(s.totalFga,0),tpa=num94(s.total3pa,0),fta=num94(s.totalFta,0);
    if(fga>0)s.fg=v94Round1(num94(s.totalFgm,0)/fga*100);
    if(tpa>0)s.three=v94Round1(num94(s.total3pm,0)/tpa*100);
    if(fta>0)s.ft=v94Round1(num94(s.totalFtm,0)/fta*100);
  }catch(e){}
}
window.v94Unify=v94Unify;

/* 包装 updateAverages：每次单场结算后立刻统一口径。
   注意：必须放在**原函数跑完之后**，因为原函数刚写完逐场平均。 */
try{
  if(typeof updateAverages==='function'&&!window.__v94AvgGuard){
    var __v94Avg=updateAverages;
    updateAverages=function(){
      var r=__v94Avg.apply(this,arguments);
      try{ v94Unify() }catch(e){}
      return r;
    };
    try{if(typeof window.updateAverages==='function')window.updateAverages=updateAverages}catch(e){}
    window.__v94AvgGuard=true;
  }
}catch(e){}

/* 赛季页渲染前再统一一次（兜住任何绕过 updateAverages 的写路径，
   例如自愈、读档、追加赛事等）。 */
try{
  if(typeof render==='function'&&!window.__v94RenderGuard){
    var __v94Render=render;
    render=function(){
      try{ v94Unify() }catch(e){}
      return __v94Render.apply(this,arguments);
    };
    try{if(typeof window.render==='function')window.render=render}catch(e){}
    window.__v94RenderGuard=true;
  }
}catch(e){}

/* 老存档兼容：载入后自愈一次（旧档的 fg/three 是逐场平均口径） */
try{
  if(typeof load==='function'&&!window.__v94LoadGuard){
    var __v94Load=load;
    load=function(){
      var r=__v94Load.apply(this,arguments);
      try{ v94Unify() }catch(e){}
      return r;
    };
    try{if(typeof window.load==='function')window.load=load}catch(e){}
    window.__v94LoadGuard=true;
  }
}catch(e){}

/* 自检用的一致性判定：显示值 vs 由累计值算出的值 */
function v94Consistency(){
  try{
    var c=(typeof career!=='undefined')?career:null;
    if(!c||!c.seasonStats)return null;
    var s=c.seasonStats,gp=num94(s.gp,0);
    if(gp<=0)return null;
    var byTot={pts:num94(s.totalPts,0)/gp,reb:num94(s.totalReb,0)/gp,ast:num94(s.totalAst,0)/gp};
    var byRate={
      fg:num94(s.totalFga,0)?num94(s.totalFgm,0)/num94(s.totalFga,0)*100:0,
      three:num94(s.total3pa,0)?num94(s.total3pm,0)/num94(s.total3pa,0)*100:0
    };
    return {
      ptsDiff:Math.abs(num94(s.pts,0)-v94Round1(byTot.pts)),
      rebDiff:Math.abs(num94(s.reb,0)-v94Round1(byTot.reb)),
      astDiff:Math.abs(num94(s.ast,0)-v94Round1(byTot.ast)),
      fgDiff:Math.abs(num94(s.fg,0)-v94Round1(byRate.fg)),
      threeDiff:Math.abs(num94(s.three,0)-v94Round1(byRate.three))
    };
  }catch(e){return null}
}
window.v94Consistency=v94Consistency;

window.__v94Debug={unify:v94Unify,consistency:v94Consistency,round1:v94Round1};

})();

