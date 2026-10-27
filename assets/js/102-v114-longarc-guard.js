
/* ============================================================================
 * V114 · 修「每次到 31 岁就卡住，退出重进从头开始」
 *
 * 根因（已定位）：
 *   LONG_STORIES 这张「长线剧情」表**只写了 5 位水货状元**，姚明和罗斯都缺；
 *   而 makeLongArcEvent() 是这样取的：
 *       phase = career.age>=31 ? 'late' : career.ovr>=88 ? 'prime' : 'young'
 *       arr   = LONG_STORIES[p.id][phase]        // ← 姚明/罗斯这里直接 undefined
 *       x     = arr[(career.seasonNo-1)%arr.length]
 *   31 岁恰好是把阶段切成 'late' 的分界线，所以「每次到 31 岁」必然踩到这一步 →
 *   取不到表 → 抛异常 → 赛季推进中断（卡住）；若异常发生在存档写入之前，
 *   这份档就停在半截，重进时被当成空档 → 看起来「从第一年重新开始」。
 *
 * 修法：包住 makeLongArcEvent —— 任何球员/阶段缺表都不许把生涯打断，
 *   用一个通用的「赛季随笔」事件顶上（有选项、有效果、能继续推进），
 *   并把现场写进诊断，方便之后补真正的长线内容。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v114Fix)return;window.__v114Fix=true;

function fallbackEvent(){
  var p=(typeof currentP==='function')?currentP():null;
  var zh=(p&&p.zh)||'你';
  var age=(typeof career!=='undefined'&&career&&career.age)||30;
  var tm=(typeof career!=='undefined'&&career&&career.team)||'球队';
  return {
    t:'赛季随笔：' + (age>=33?'最后几年的活法':age>=31?'老将的位置':'更衣室里的位置'),
    scene:(typeof seasonLabel==='function'?seasonLabel():'') + ' · ' + tm,
    speaker:'主教练 / 队友',
    cast:['主教练','队友'],
    b:'<p>这一季没有新的长线剧情落到'+zh+'头上——训练、比赛、恢复，日子按部就班地过去。</p>'
      +'<p>但位置在悄悄变化：更衣室里开始有人问你战术细节，媒体的问题从“你能做到什么”变成“你还能做多久”。</p>'
      +'<p>你把注意力放回最简单的那件事上：今天这一场，怎么帮球队赢。</p>',
    stakes:'这次选择会影响你在队里的位置与身体负荷。',
    c:function(){return [
      ['主动承担更多更衣室责任','信任与心态提升。',{tr:5,a:{mentality:2}}],
      ['把重心放回自己的状态管理','健康与耐久提升。',{h:6,a:{durability:2}}],
      ['保持现状，专注比赛本身','自信提升，产出稳定。',{c:4}]
    ]}
  };
}
window.v114LongArcFallback=fallbackEvent;

try{
  if(typeof makeLongArcEvent==='function'&&!window.__v114Guard){
    var __v114Mk=makeLongArcEvent;
    makeLongArcEvent=function(){
      var r=null,err=null;
      try{r=__v114Mk.apply(this,arguments)}catch(e){err=e}
      if(r&&typeof r==='object'&&(r.b||r.t))return r;
      try{
        if(window.v99Diag)window.v99Diag('longarc-fallback:'+((err&&err.message)||'empty')+' pid='+((typeof career!=='undefined'&&career&&career.playerId)||'?')+' age='+((typeof career!=='undefined'&&career&&career.age)||'?'));
      }catch(e){}
      return fallbackEvent();
    };
    try{if(typeof window.makeLongArcEvent==='function')window.makeLongArcEvent=makeLongArcEvent}catch(e){}
    window.__v114Guard=true;
  }
}catch(e){}

window.__v114Debug={fallback:fallbackEvent};
})();

