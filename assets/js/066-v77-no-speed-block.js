
/* ============================================================================
 * v77 · 去掉「4× 固定速度」那一块
 *
 * 开发者原话：「4*锁定速度那个去掉」
 *
 * 实测：赛季页模拟条里除了「开始模拟」按钮，右侧还有一个只读方块显示
 *   「4× / 固定速度」（.speed-fixed，由 v221 层的 regularView 渲染）。
 *   它只是展示「速度是固定的」这个信息，不带任何操作，开发者要求删掉。
 *
 * 修法：在 regularView 出口移除该方块，并把模拟条的栅格从
 *   「1fr auto」（按钮 + 速度块）改回单列，让按钮恢复整宽。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v77NoSpeed)return;window.__v77NoSpeed=true;

/* 只读速度方块：<div class="speed-fixed">…</div> */
var RE_SPEED=/<div class="speed-fixed">[\s\S]*?<\/div>/g;

function v77Strip(html){
  try{
    if(typeof html!=='string')return html;
    if(html.indexOf('speed-fixed')<0)return html;
    return html.replace(RE_SPEED,'');
  }catch(e){return html}
}
window.__v77Strip=v77Strip;

try{
  if(typeof regularView==='function'&&!window.__v77RenderGuard){
    var __v77Regular=regularView;
    regularView=function(){
      var h=__v77Regular.apply(this,arguments);
      try{
        h=v77Strip(h);
        /* 速度块移除后，模拟条只剩按钮：把栅格并成单列，按钮才会占满 */
        if(typeof h==='string'&&h.indexOf('v221-simctl')>=0){
          h=h.replace(/<div class="v221-simctl">/g,'<div class="v221-simctl v77-solo">');
        }
      }catch(e){}
      return h;
    };
    window.__v77RenderGuard=true;
  }
}catch(e){}

/* 样式：单列栅格 + 兜底隐藏（万一个别路径漏掉替换） */
try{
  if(typeof document!=='undefined'&&document.createElement&&!document.getElementById('v77-style')){
    var st=document.createElement('style');
    st.id='v77-style';
    st.textContent=[
      '.v221-simctl.v77-solo{grid-template-columns:1fr}',
      '.speed-fixed{display:none!important}'
    ].join('');
    document.head.appendChild(st);
  }
}catch(e){}

window.__v77Debug={guard:window.__v77RenderGuard};

})();

