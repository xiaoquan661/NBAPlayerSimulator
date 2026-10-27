
/* ============================================================================
 * V111 · 修「后续没什么剧情，挺无聊」
 *
 * 玩家反馈：玩到后面没什么剧情。
 *
 * 根因（代码级，可量化）：
 *   赛季随机事件走的是 v42 的去重池 —— `career.v42EvUsed[球员]` 记下抽过的事件，
 *   `avail` 里一旦为空就回落到旧路径（也是空的）。而每位球员的事件池只有 20~22 条，
 *   按「大约每 10 场一次」的节奏，**两三个赛季就抽空**；
 *   可是一条生涯通常打 15~20 个赛季 —— 后面十几个赛季等于零剧情，
 *   玩家感受到的就是「无聊」。
 *   （主线章节：每人 9 章、罗斯 10 章，同样在前几个赛季就走完了。）
 *
 * 这一层先修机制：池子抽空后不再永久空白，而是进入第 N 遍 ——
 *   把「用过」的标记整体放行，并记一遍轮次，写成日报推给玩家。
 *   同一批事件在「球队换过、年龄不同、角色不同」的处境下重现，
 *   观感上是新的处境而不是硬重复。
 *   （内容量本身的扩充是另一件事，见交付说明里的清单与数量建议。）
 * ============================================================================ */
(function(){
'use strict';
if(window.__v111Fix)return;window.__v111Fix=true;

function poolSize(pid){
  try{return ((window.V42_EV_V2&&window.V42_EV_V2[pid])||[]).length}catch(e){return 0}
}
window.v111EvUsedCount=function(pid){
  try{return Object.keys((career&&career.v42EvUsed&&career.v42EvUsed[pid])||{}).length}catch(e){return 0}
};
window.v111EvRound=function(){try{return Number(career&&career.v42EvRound)||1}catch(e){return 1}};

try{
  if(typeof maybeStory==='function'&&!window.__v111Guard){
    var __v111Maybe=maybeStory;
    maybeStory=function(){
      try{
        if(typeof career!=='undefined'&&career&&!career.retired){
          var pid=career.playerId,n=poolSize(pid);
          career.v42EvUsed=career.v42EvUsed||{};
          var used=career.v42EvUsed[pid]||{};
          var usedN=Object.keys(used).length;
          if(n>0&&usedN>=n){
            /* 抽完了：整池放行，进入下一遍 */
            career.v42EvUsed[pid]={};
            career.v42EvRound=(Number(career.v42EvRound)||1)+1;
            career.feed=career.feed||[];
            career.feed.unshift('故事线进入第 '+career.v42EvRound+' 遍：这些处境会再来一次，但你已经不是当年的你。');
            try{if(window.v99Diag)window.v99Diag('story-loop:第'+career.v42EvRound+'遍 ('+pid+', 池'+n+')')}catch(e){}
          }
        }
      }catch(e){}
      return __v111Maybe.apply(this,arguments);
    };
    try{if(typeof window.maybeStory==='function')window.maybeStory=maybeStory}catch(e){}
    window.__v111Guard=true;
  }
}catch(e){}

window.__v111Debug={poolSize:poolSize};
})();

