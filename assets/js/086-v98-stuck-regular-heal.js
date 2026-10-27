
/* ============================================================================
 * v98 · 「常规赛打完了但进不了下一流程」自愈
 *
 * 复现：存档停在 games=82 且 stage='regular'（第 82 场结束到 finishRegular
 *   之间的那一瞬间被切后台/关掉就会存成这样）。此时赛季页仍显示
 *   「▶ 开始模拟常规赛」，点下去也毫无反应 —— 因为 v221StartSim 把
 *   career.games>=82 当成「无事可做」直接 return（已在该处修正）。
 *
 * 这一层是兜底：不管从哪个入口回到赛季页（按钮、自动续跑钩子、读档后直接
 * 渲染），只要发现「场次已满但阶段还停在常规赛」，就把赛季推进到结算页，
 * 保证永远不会卡死在最后一场。只在常规赛页、且没有剧情/弹窗时触发。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v98Fix)return;window.__v98Fix=true;
try{
  if(typeof render==='function'&&!window.__v98RenderGuard){
    var __v98Render=render;
    render=function(){
      var r=__v98Render.apply(this,arguments);
      try{
        if(typeof career!=='undefined'&&career&&career.stage==='regular'
           &&Number(career.games)>=82&&!(typeof ui!=='undefined'&&ui&&(ui.storyEvent||ui.modal))
           &&!window.__v98Advancing){
          window.__v98Advancing=true;
          try{if(typeof finishRegular==='function')finishRegular()}catch(e){try{window.__v91Errors&&window.__v91Errors.push('v98: '+e.message)}catch(e2){}}
          window.__v98Advancing=false;
        }
      }catch(e){}
      return r;
    };
    try{if(typeof window.render==='function')window.render=render}catch(e){}
    window.__v98RenderGuard=true;
  }
}catch(e){}
window.__v98Debug={heal:function(){return window.__v98Advancing===true},fixed:true};
})();

