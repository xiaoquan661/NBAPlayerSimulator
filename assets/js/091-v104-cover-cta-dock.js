
/* ============================================================================
 * v104 · 开发者反馈：封面榜单(前 3 名) + 下方「我的存档」(3 条) 一起把
 *        「开始改写生涯 / 继续 XXX」两个按钮顶到首屏之外，要往下滑才看得见
 *
 * 布局方案：两个按钮从「文档流末尾」改成「常驻屏幕底栏」
 *   · position:fixed 贴底 + 毛玻璃，无论榜单几条、屏幕多矮，一进封面就可见；
 *   · 封面按底栏实测高度动态留 padding-bottom，保证榜单最后一条不会被底栏压住；
 *   · 主视觉/美术素材一行不动，只收紧榜单卡片与「我的存档」的内边距（不改字号）；
 *   · 封面上的「我的存档」最多展示 3 条（= 3 个存档位），更多走「查看完整榜单」，
 *     避免历史存档累积（旧 cid 残留）把封面越撑越长。
 *   · 底栏 z-index 60，低于 .overlay(90)，弹层照常盖住它。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v104CtaDock)return;window.__v104CtaDock=true;

try{
  var st=document.createElement('style');
  st.id='v104-cover-cta-style';
  st.textContent=[
    /* 先给一个兜底高度，JS 量到真实高度后会覆盖它 */
    '.cover.cover-v214{padding-bottom:170px}',
    '.cover.cover-v214 .cover-actions{position:fixed;left:50%;transform:translateX(-50%);bottom:0;width:min(100%,470px);margin:0;padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));display:grid;gap:9px;border-radius:22px 22px 0 0;border-top:1px solid rgba(231,214,195,.9);background:linear-gradient(180deg,rgba(255,250,241,0),rgba(255,250,241,.94) 22%,#fffaf1 62%);box-shadow:0 -12px 26px rgba(91,62,35,.10);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);z-index:60}',
    '.cover.cover-v214 .cover-actions .btn{width:100%}',
    /* 榜单模块收紧：只动间距，不动字号 */
    '.cover .v82-lb{margin-top:10px;padding:11px 11px 10px}',
    '.cover .v82-lb-body{gap:5px}',
    '.cover .v82-lb-row{padding:6px 9px}',
    '.cover .v82-lb-me{padding:8px 10px;margin-top:5px}',
    '.cover .v82-lb-me-row{margin-top:3px}',
    /* 「我的存档」在封面上最多 3 行（子元素第 1 个是标题 small，故从第 5 个起隐藏） */
    '.cover .v82-lb-me-row:nth-child(n+5){display:none}'
  ].join('');
  (document.head||document.documentElement).appendChild(st);
}catch(e){}

var lastH=0,lastEl=null,raf=0;
function v104Sync(){
  raf=0;
  try{
    var bar=document.querySelector('.cover-v214 .cover-actions');
    if(!bar)return;
    var cover=bar.parentNode;
    if(!cover||String(cover.className).indexOf('cover-v214')<0)return;
    var h=Math.ceil(bar.getBoundingClientRect().height);
    /* 封面会被整块重建，所以「元素换了」也要重写一次内联 padding */
    if(h>0&&(cover!==lastEl||Math.abs(h-lastH)>0.5)){lastH=h;lastEl=cover;cover.style.paddingBottom=(h+14)+'px'}
  }catch(e){}
}
function v104Queue(){if(!raf)raf=requestAnimationFrame(v104Sync)}
window.v104CtaSync=v104Sync;
try{
  window.addEventListener('resize',v104Queue);
  window.addEventListener('orientationchange',v104Queue);
}catch(e){}
try{
  var mo=new MutationObserver(v104Queue);
  mo.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
}catch(e){}
try{
  if(document.readyState!=='loading')v104Queue();
  else document.addEventListener('DOMContentLoaded',v104Queue);
}catch(e){}
})();

