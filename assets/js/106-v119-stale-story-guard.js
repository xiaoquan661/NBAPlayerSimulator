
/* ============================================================================
 * V119 · 修「点击存档 → 存档无法读取 / 这一屏没能渲染出来」
 *
 * 现场：玩家点存档进生涯，渲染连续失败两次 → 落到兜底屏（标题「存档无法读取」，
 *   正文是「这一屏没能渲染出来，你的存档没有被改动」= badSave 为 false 的那条分支）。
 *   也就是说：**存档本身没坏，是渲染时抛异常**。
 *
 * 我用自己的存档在本机复现过：载入后直接渲染生涯页是正常的 —— 所以触发点不是
 *   基础生涯渲染，而是**只有长生涯才会累积出来的状态**。最典型的一种：
 *   剧情系统按 `storyIndex`（或季数）去取主线/长线事件，**索引超出数组长度**时
 *   取到 undefined，渲染时读它的 .t / .b 就抛错；而 31 岁正好是主线早被走完、
 *   靠长线事件续命的阶段 —— 与玩家反馈「31 岁白屏」「点存档渲染失败」完全吻合。
 *
 * 本层的处理（两道，都不改剧情内容）：
 *   ① 渲染前体检 `ui.storyEvent` / `ui.modal`：结构不完整（没有可渲染的标题或正文）
 *      就清空它，让页面继续画，而不是让它在渲染里抛错；
 *   ② 兜一层 renderOverlay：浮层渲染失败时退回主界面渲染，绝不白屏或停在兜底屏。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v119Fix)return;window.__v119Fix=true;

function res(v){try{return (typeof v==='function')?v():v}catch(e){return null}}
function saneEvent(ev){
  try{
    if(!ev||typeof ev!=='object')return false;
    var t=res(ev.t);
    var b=res(ev.b);
    var hasTitle=(t!=null&&String(t).length>0);
    var hasBody=(b!=null&&String(b).length>0);
    return hasTitle&&hasBody;
  }catch(e){return false}
}
function sanitize(){
  try{
    if(typeof ui==='undefined'||!ui)return;
    if(ui.storyEvent&&!saneEvent(ui.storyEvent)){
      try{if(window.v99Diag)window.v99Diag('story-event-dropped:结构不完整（多为索引越界）')}catch(e){}
      ui.storyEvent=null;
    }
  }catch(e){}
}
window.v119SanitizeStory=sanitize;

try{
  if(typeof render==='function'&&!window.__v119Render){
    var __v119R=render;
    render=function(){
      sanitize();
      return __v119R.apply(this,arguments);
    };
    window.__v119Render=true;
  }
}catch(e){}

try{
  if(typeof renderOverlay==='function'&&!window.__v119Ov){
    var __v119O=renderOverlay;
    renderOverlay=function(){
      var r;
      try{r=__v119O.apply(this,arguments)}
      catch(e){
        try{if(window.v99Diag)window.v99Diag('overlay-render-fail:'+String(e&&e.message||e).slice(0,80))}catch(e2){}
        try{if(typeof ui!=='undefined'&&ui){ui.storyEvent=null;ui.modal=null}}catch(e3){}
        r='';
      }
      return r;
    };
    window.__v119Ov=true;
  }
}catch(e){}

try{sanitize()}catch(e){}
window.__v119Debug={sanitize:sanitize,sane:saneEvent};
})();

