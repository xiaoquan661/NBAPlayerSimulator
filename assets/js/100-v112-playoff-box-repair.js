
/* ============================================================================
 * V112 · 真正修掉「（总决赛）季后赛一直 0 分」
 *
 * 真凶不是「没写数据」，而是被对账逻辑抹掉：
 *   v95 的 playoffGame 包装层每打完一场季后赛都会调 v95ReconcileGame(g)，
 *   而它里面是：
 *       boxPts = 2*line.fgm + line.tpm + line.ftm;   // ← 以「投篮明细」为唯一事实源
 *       if (pts !== boxPts) line.pts = boxPts;
 *   常规赛的 line 带完整明细（v26DeriveBox 写的），所以没事；
 *   但**季后赛的 line 只有 {pts,reb,ast,stl,blk}，没有 fgm/tpm/ftm** →
 *   boxPts 恒等于 0 → line.pts 被改写成 0。
 *   为什么玩家反馈集中在总决赛：前面几轮多数人点「一键模拟本轮」（走 v218 路径，
 *   不经过这个对账），到总决赛会一场一场点「模拟下一场」（正是 playoffGame 路径），
 *   于是场场被抹成 0。
 *
 * 修法：在对账之前，先把缺明细的 line 用 v95FitBoxToPts 按它自己的得分补出
 *   一份自洽明细（pts ≡ 2*fgm + tpm + ftm）。补完再进对账：
 *   明细与得分一致 → 得分不会被改写，且累计值的 delta 恒为 0，不影响赛季/生涯场均。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v112Fix)return;window.__v112Fix=true;

function repairLine(g){
  try{
    var line=g&&g.line;
    if(!line||g.played===false)return false;
    var hasDetail=(line.fgm!=null)||(line.tpm!=null)||(line.ftm!=null)||(line.fga!=null);
    var pts=Number(line.pts);
    if(hasDetail||!(pts>0))return false;
    if(typeof v95FitBoxToPts!=='function')return false;
    v95FitBoxToPts(line,pts);      /* 按得分反推明细，保证 pts ≡ 2*fgm+tpm+ftm */
    return true;
  }catch(e){return false}
}
window.v112RepairLine=repairLine;

/* ① 对账前先补明细（覆盖 playoffGame 路径） */
try{
  if(typeof v95ReconcileGame==='function'&&!window.__v112RecGuard){
    var __v112Rec=v95ReconcileGame;
    v95ReconcileGame=function(g){
      try{repairLine(g)}catch(e){}
      return __v112Rec.apply(this,arguments);
    };
    try{if(typeof window.v95ReconcileGame==='function')window.v95ReconcileGame=v95ReconcileGame}catch(e){}
    window.__v112RecGuard=true;
  }
}catch(e){}

/* ② 每打完一场/一轮季后赛都扫一遍：把被对账逻辑抹成 0 的数据当场重建
      （v95 的抹零发生在它自己的 IIFE 里，外面钩不到，只能在它之后补救）
      注：这里刻意用「显式静态分支」，不用 eval / 动态字符串执行 —— 发布安全审查要求。 */
function v112Wrap(fn){
  var w=function(){
    var r=fn.apply(this,arguments);
    try{if(typeof v109Backfill==='function')v109Backfill()}catch(e){}
    return r;
  };
  return w;
}
try{
  if(typeof playoffGame==='function'&&!window.__v112W_po){
    var __v112PoNew=v112Wrap(playoffGame);
    playoffGame=__v112PoNew;
    window.__v112W_po=true;
  }
}catch(e){}
try{
  if(typeof simSeries==='function'&&!window.__v112W_sim){
    var __v112SimNew=v112Wrap(simSeries);
    simSeries=__v112SimNew;
    window.__v112W_sim=true;
  }
}catch(e){}
try{
  if(typeof advancePlayoffStage==='function'&&!window.__v112W_adv){
    var __v112AdvNew=v112Wrap(advancePlayoffStage);
    advancePlayoffStage=__v112AdvNew;
    window.__v112W_adv=true;
  }
}catch(e){}

/* ③ 一次性扫历史：老存档里已经被抹成 0 的季后赛比赛同样重建 */
try{
  if(typeof career!=='undefined'&&career&&typeof window.v109Backfill==='function')window.v109Backfill();
}catch(e){}

window.__v112Debug={repair:repairLine};
})();

