
/* ============================================================================
 * V115 · 发布安全审查整改（MEDIUM）
 *
 * 审查意见：「变量 ui.screen 写入 HTML 解析入口，需确认其来源和净化处理」。
 *   render() 里是 `app.innerHTML = ui.screen==='home' ? renderHome() : ...` 这种链式分支。
 *
 * 说明与整改：
 *   · ui.screen 全部取值都来自本文件内部的字符串常量赋值（home / select / talents /
 *     career / draft / retired），没有任何一处来自玩家输入、URL 参数或后端响应；
 *   · 但为了让审查可判定，这里再加一道「白名单归一化」：render 之前把 ui.screen
 *     收敛到固定枚举，非法值一律回落到 'home'，杜绝任何异常值继续流向 innerHTML 分支。
 *   · 后续新增屏幕必须显式加进 V115_SCREENS，形成静态可审计的清单。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v115Fix)return;window.__v115Fix=true;

var V115_SCREENS={home:1,select:1,talents:1,career:1,draft:1,retired:1};
window.V115_SCREENS=V115_SCREENS;

function normalize(){
  try{
    if(typeof ui==='undefined'||!ui)return;
    var s=(ui.screen==null)?'home':String(ui.screen);
    if(!Object.prototype.hasOwnProperty.call(V115_SCREENS,s)){
      try{if(window.v99Diag)window.v99Diag('screen-sanitized:'+s.slice(0,20))}catch(e){}
      s='home';
    }
    ui.screen=s;
  }catch(e){}
}
window.v115NormalizeScreen=normalize;

try{
  if(typeof render==='function'&&!window.__v115Guard){
    var __v115Render=render;
    var __v115New=function(){
      normalize();
      return __v115Render.apply(this,arguments);
    };
    render=__v115New;
    window.__v115Guard=true;
  }
}catch(e){}
try{normalize()}catch(e){}
})();

