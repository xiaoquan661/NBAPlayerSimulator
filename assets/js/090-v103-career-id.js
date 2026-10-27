
/* ============================================================================
 * v103 · 给每一局生涯一个唯一 id（cid），让「一局一条」真正成立
 *
 * 实测根因：新建生涯的 career.__slot 默认就是 1，而「退役后重开一局」通常还是落在
 * 1 号槽。服务端若只按 (用户, 存档槽) 去重，新那局会被判成「同一存档、分数更低」
 * 直接丢弃 —— 表现就是「打完退役，榜上还是那条旧的 6077」。
 *
 * 所以每局生涯生成一个稳定 cid（写进存档），提交时带上；服务端按 (用户, cid) 存，
 * 每局各占一行，同一局重复提交才去重。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v103Fix)return;window.__v103Fix=true;
function v103EnsureCid(){
  try{
    if(typeof career==='undefined'||!career)return;
    if(!career.cid)career.cid='c'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  }catch(e){}
}
window.v103EnsureCid=v103EnsureCid;
try{
  if(typeof createCareer==='function'&&!window.__v103CreateGuard){
    var __v103Create=createCareer;
    createCareer=function(){
      var r=__v103Create.apply(this,arguments);
      try{v103EnsureCid();if(typeof save==='function')save()}catch(e){}
      return r;
    };
    try{if(typeof window.createCareer==='function')window.createCareer=createCareer}catch(e){}
    window.__v103CreateGuard=true;
  }
}catch(e){}
try{
  if(typeof load==='function'&&!window.__v103LoadGuard){
    var __v103Load=load;
    load=function(){
      var x=__v103Load.apply(this,arguments);
      try{v103EnsureCid()}catch(e){}
      return x;
    };
    try{if(typeof window.load==='function')window.load=load}catch(e){}
    window.__v103LoadGuard=true;
  }
}catch(e){}
window.__v103Debug={cid:v103EnsureCid};
})();

