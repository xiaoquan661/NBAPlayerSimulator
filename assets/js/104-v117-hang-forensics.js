
/* ============================================================================
 * V117 · 针对「31 岁白屏 + 重进进度全没」
 *
 * 诚实说明：这个 bug 我在本机**复现不出来**（用姚明在 31 岁跑过，不崩）。
 *   但现象可以拆成两件事分别兜住，并把现场证据留下来：
 *
 *   ① 「重进进度全没」= 存档问题，而且必然可以防：
 *      在每次赛季切换（唯一会大改 state 的时刻）之前先写一份**断点存档**；
 *      载入时若主存档读不出来/为空，用断点恢复 —— 最多退回上一季，不再归零。
 *
 *   ② 「白屏」有两种可能，表现一样但成因相反：
 *      · 抛异常 → v106 看门狗能自愈（已在线）；
 *      · 死循环 → 主线程被占住，**所有定时器都不再触发，看门狗也救不了**，
 *        只能杀进程 —— 这正好解释"白屏且不自愈"。
 *      所以加一条**面包屑**：在每个可能卡住的阶段前写一句「我正要做 X」到本机，
 *      正常走完就清掉。下次白屏重进时，最后留下的那句就是卡死位置，
 *      直接显示在封面顶部，截图给我即可（不用连电脑看控制台）。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v117Fix)return;window.__v117Fix=true;

var CRUMB='bust_crumb';
function slotKey(n){n=Number(n)||1;return n===1?'save_bust_no1_v4':('bust_slot_'+n+'_v4')}
function ckptKey(n){n=Number(n)||1;return 'bust_ckpt_'+n}
function curSlot(){
  try{if(typeof career!=='undefined'&&career&&career.__slot)return Number(career.__slot)||1}catch(e){}
  try{if(typeof ui!=='undefined'&&ui&&ui.slot>=1)return Number(ui.slot)}catch(e){}
  return 1;
}
function crumb(msg){
  try{localStorage.setItem(CRUMB,String(msg)+' @ '+new Date().toISOString().slice(5,19))}catch(e){}
}
function crumbClear(){try{localStorage.removeItem(CRUMB)}catch(e){}}
window.v117Crumb=crumb;

function checkpoint(why){
  try{
    if(typeof career==='undefined'||!career)return;
    var n=curSlot();
    crumb('before '+(why||'transition'));
    localStorage.setItem(ckptKey(n),JSON.stringify({at:Date.now(),why:why||'',career:career}));
  }catch(e){}
}
window.v117Checkpoint=checkpoint;

try{
  if(typeof nextSeason==='function'&&!window.__v117Next){
    var __v117N=nextSeason;
    nextSeason=function(){checkpoint('nextSeason');return __v117N.apply(this,arguments)};
    window.__v117Next=true;
  }
}catch(e){}
try{
  if(typeof beginSeason==='function'&&!window.__v117Begin){
    var __v117B=beginSeason;
    beginSeason=function(){checkpoint('beginSeason');var r=__v117B.apply(this,arguments);crumbClear();return r};
    window.__v117Begin=true;
  }
}catch(e){}

/* 载入时：主存档读不出来就用断点恢复（最多退回上一季，不再归零） */
try{
  if(typeof load==='function'&&!window.__v117Load){
    var __v117L=load;
    load=function(){
      var c=null;
      try{c=__v117L.apply(this,arguments)}catch(e){c=null}
      if(c)return c;
      try{
        var n=curSlot();
        var raw=localStorage.getItem(ckptKey(n));
        if(raw){
          var box=JSON.parse(raw);
          var cc=box&&box.career;
          if(cc&&cc.playerId){
            try{if(window.v99Diag)window.v99Diag('restore-from-checkpoint:'+(box.why||''))}catch(e){}
            try{localStorage.setItem(slotKey(n),JSON.stringify(cc))}catch(e){}
            window.__v117Restored=(box.why||'')+' @'+new Date(box.at||Date.now()).toISOString().slice(5,16);
            return cc;
          }
        }
      }catch(e){}
      return null;
    };
    window.__v117Load=true;
  }
}catch(e){}

/* 中断诊断仅供后台排查，不向首页注入开发提示。 */
window.__v117Debug={crumb:crumb,checkpoint:checkpoint,restored:function(){return window.__v117Restored||null}};
})();

