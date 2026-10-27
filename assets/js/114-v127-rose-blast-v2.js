
/* ============================================================================
 * V127 · 超神三处收尾
 *   ① 常规赛用超神后：关掉弹窗会「显示模拟中但不动」——因为停表后 UI 还留着
 *      旧的“模拟中”状态。修法：关弹窗时统一收尾（停表 + 清间隔 + 重绘），
 *      点遮罩关闭也走同一条路。
 *   ② 弹窗升级：深粉渐变 + 金色细边 + 玫瑰纹样 + 更大比分，做质感。
 *   ③ 季后赛「用了超神那一场」的比赛框：套用同一套深粉配色（原先是普通胜/负色）。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v127Fix)return;window.__v127Fix=true;

/* ① 关弹窗收尾：停表 + 清间隔 + 重绘（治“显示模拟中却不动”） */
window.v127ClosePop=function(){
  try{var d=document.getElementById('v125-pop');if(d)d.remove()}catch(e){}
  try{if(typeof ui!=='undefined'&&ui){ui.sim=false;if(ui.interval){clearInterval(ui.interval);ui.interval=null}}}catch(e){}
  try{if(typeof stopSim==='function')stopSim()}catch(e){}
  try{if(typeof render==='function')render()}catch(e){}
};

/* ③ 季后赛超神场次 + 弹窗质感样式 */
try{
  var st=document.createElement('style');
  st.id='v127-style';
  st.textContent=[
    /* 季后赛：超神那一场 —— 与超神卡同色系 */
    '.po-game.blast{background:linear-gradient(150deg,#3a141c,#6b1f2e 55%,#a12b44)!important;border:1px solid rgba(255,154,184,.45)!important;box-shadow:0 10px 26px rgba(122,20,48,.35),inset 0 0 0 1px rgba(255,255,255,.06)!important;color:#ffe9ec!important}',
    '.po-game.blast .wl{background:linear-gradient(180deg,#ffd0d7,#ff8a9a)!important;color:#3a1218!important}',
    '.po-game.blast strong{color:#fff5f7!important}',
    '.po-game.blast small{color:#f3c9d1!important}',
    /* 弹窗升级 */
    '.v125-card{padding:16px 16px 15px!important;border:1px solid rgba(255,205,160,.22);background:radial-gradient(120% 80% at 12% 0%,rgba(255,138,154,.22),transparent 55%),linear-gradient(168deg,#2b1013,#4c1a24 48%,#7d2433)!important;box-shadow:0 26px 60px rgba(0,0,0,.6),inset 0 0 0 1px rgba(255,255,255,.05)!important}',
    '.v125-head b{font-size:16px!important;letter-spacing:.01em}',
    '.v125-score b{font-size:24px!important;border-radius:12px;box-shadow:0 6px 16px rgba(0,0,0,.25)}',
    '.v125-score span{font-size:19px!important}',
    '.v125-vs{background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.05))!important;border:1px solid rgba(255,205,160,.18)}',
    '.v125-grid div{background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.04))!important;border:1px solid rgba(255,205,160,.12)}',
    '.v125-ok{background:linear-gradient(180deg,#ffe1b8,#ffb457)!important;color:#3a2410!important;box-shadow:0 8px 18px rgba(0,0,0,.28)}'
  ].join('');
  (document.head||document.documentElement).appendChild(st);
}catch(e){}

/* 弹窗按钮/遮罩统一走 v127ClosePop：把旧的 onclick 覆盖掉 */
try{
  var mo=new MutationObserver(function(){
    try{
      var d=document.getElementById('v125-pop');
      if(!d)return;
      var ok=d.querySelector('.v125-ok');
      if(ok&&ok.getAttribute('onclick')!=='window.v127ClosePop()')ok.setAttribute('onclick','window.v127ClosePop()');
      var mask=d.querySelector('.v125-mask');
      if(mask&&!mask.__v127)mask.__v127=true,mask.addEventListener('click',function(){window.v127ClosePop()});
    }catch(e){}
  });
  mo.observe(document.documentElement,{childList:true,subtree:true});
  window.__v127Mo=mo;
}catch(e){}

window.__v127Debug={close:window.v127ClosePop};
})();

