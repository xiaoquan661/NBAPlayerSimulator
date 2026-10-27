
/* ============================================================================
 * v105 · 平衡：5 位状元的新秀季不能按「球队老大」的球权打
 *
 * 开发者反馈：西蒙斯第一年就 88 分、场均 20+9+8，第二年开始垄断 MVP / 总冠军，
 *             其他状元完全追不上。
 *
 * 实测定位到两条漏口：
 *   ① 新秀季「角色上限」原本写在早期 syncOvr 里，后来几层重写 syncOvr 时把它丢了：
 *      建号那一刻角色是「球队核心」，一进常规赛就变成「全明星核心 / 35 分钟」
 *      —— 出手权与上场时间直接按球队老大发。
 *   ② statExpect 里的新秀得分上限只作用于 e.pts，而 v26DeriveBox 是「使用率 →
 *      出手 → 得分」反推的，把上限整条绕过（已在 v26DeriveBox 从球权源头封顶）。
 *   本层补回 ①：新秀季的角色上限对整季生效，minutes 同步重算。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v105Cap)return;window.__v105Cap=true;
var ORDER=['边缘球员','轮换球员','稳定首发','球队核心','全明星核心','超级巨星','联盟门面'];
var CAP={bennett:'轮换球员',oden:'稳定首发',kwame:'轮换球员',fultz:'稳定首发',simmons:'球队核心'};
function v105Apply(){
  try{
    if(typeof career==='undefined'||!career)return;
    if(Number(career.seasonNo)!==1)return;
    var cap=CAP[career.playerId];
    if(!cap)return;
    if(ORDER.indexOf(career.role)<=ORDER.indexOf(cap))return;
    career.role=cap;
    if(typeof minutesByRole==='function'){
      var tb=career.trust>=78?2:career.trust>=64?1:career.trust<38?-2:0;
      var extra=0;
      try{extra=(typeof hasTalent==='function'&&hasTalent('core'))?2:0}catch(e){}
      career.minutes=Math.min(career.minutesLimit||99,Math.max(10,Math.min(37,minutesByRole(cap)+tb+extra)));
    }
  }catch(e){}
}
window.v105RookieRoleCap=v105Apply;
try{
  if(typeof syncOvr==='function'&&!window.__v105SyncGuard){
    var __v105Sync=syncOvr;
    syncOvr=function(){
      var r=__v105Sync.apply(this,arguments);
      v105Apply();
      return r;
    };
    try{if(typeof window.syncOvr==='function')window.syncOvr=syncOvr}catch(e){}
    window.__v105SyncGuard=true;
  }
}catch(e){}
try{v105Apply()}catch(e){}
})();

