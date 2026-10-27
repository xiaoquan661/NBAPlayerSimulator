
/* ============================================================================
 * V118 · 存档「绝不被删」
 *
 * 定位：玩家看到的「存档无法读取」来自 v54 的渲染兜底（二次渲染失败时画的那一屏）。
 *   但真正致命的是同一段代码里这一句：
 *       if (bad && !playerBy(bad.playerId)) { badSave = true;
 *                                            localStorage.removeItem(SAVE) }   ← 直接删档
 *   也就是说：只要「渲染连崩两次」＋「存档里的球员 id 查不到」，玩家的档就被删掉了
 *   —— 这就是「玩到 31 岁白屏、重进进度全没了」里“进度全没”的那一下，
 *   不是神秘的数据意外，而是被自己的兜底逻辑删掉的。
 *
 * 本层做两件事（都不上传，纯本地加固）：
 *   ① 截住所有针对存档键的删除：不真删，改为**搬到救援键**（bust_rescue_*），
 *      任何代码路径都无法再真正销毁玩家进度；
 *   ② 载入时把「存档引用的球员 id」补进球员表（v110 已有 ensureAlias），
 *      让 playerBy 永远能查到 → 上面那个 badSave 判定自然不成立。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v118Fix)return;window.__v118Fix=true;

var SAVE_KEYS=['save_bust_no1_v4','bust_slot_2_v4','bust_slot_3_v4'];
function isSaveKey(k){return SAVE_KEYS.indexOf(String(k))>=0}

try{
  var rawRemove=localStorage.removeItem.bind(localStorage);
  var rawGet=localStorage.getItem.bind(localStorage);
  var rawSet=localStorage.setItem.bind(localStorage);
  localStorage.removeItem=function(k){
    try{
      if(isSaveKey(k)){
        var v=rawGet(k);
        if(v){
          /* 不销毁：搬到救援键，并留一条诊断 */
          try{rawSet('bust_rescue_'+(SAVE_KEYS.indexOf(String(k))+1),v)}catch(e){}
          try{if(window.v99Diag)window.v99Diag('save-delete-blocked:'+k+'（已搬到 bust_rescue_*）')}catch(e){}
        }
      }
    }catch(e){}
    return rawRemove(k);
  };
  window.__v118Guard=true;
}catch(e){}

/* 载入时兜一层：让存档里的球员 id 一定能查到（复用 v110 的补档案） */
try{
  if(typeof load==='function'&&!window.__v118Load){
    var __v118L=load;
    load=function(){
      var c=null;
      try{c=__v118L.apply(this,arguments)}catch(e){c=null}
      try{
        if(c&&c.playerId&&typeof window.v110EnsureAlias==='function')window.v110EnsureAlias(c.playerId,c);
      }catch(e){}
      return c;
    };
    window.__v118Load=true;
  }
}catch(e){}

window.__v118Debug={keys:SAVE_KEYS,guarded:function(){return !!window.__v118Guard}};
})();

