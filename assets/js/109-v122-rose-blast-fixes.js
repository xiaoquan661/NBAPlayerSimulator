
/* ============================================================================
 * V122 · 修两处上线后反馈
 *   ① 游戏里还会弹旧机制的飘窗（「高光夜 / 硬扛出场 … 伤病概率 ×1.32」）
 *      —— 上一版只把旧机制的*效果*归零，没关掉它的*提示*。
 *   ② 季后赛/附加赛无法使用超神
 *      —— 上一版只用 regularView 插了卡片，季后赛走的是 playoffView，没有入口。
 *
 * 处理：
 *   ① 关提示：把旧机制的触发门槛设为不可能（LOAD_MAX=0），并在每场开打前清掉
 *      旧计数（v108Heavy），旧飘窗从此不再出现；旧代码保留但彻底静默。
 *   ② 补入口：把「玫瑰之名 · 八次超神」卡片同时插进季后赛 / 附加赛页面，
 *      三处（常规赛 / 附加赛 / 季后赛）用同一个生成器，行为一致。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v122Fix)return;window.__v122Fix=true;

/* ---------- ① 关掉旧机制的提示 ---------- */
try{ if(window.V108)window.V108.LOAD_MAX=0 }catch(e){}

/* ---------- ② 三处共用的超神卡片 ---------- */
function isRose(){try{return !!(typeof career!=='undefined'&&career&&career.playerId==='rose')}catch(e){return false}}
function left(){try{return Math.max(0,Number(career&&career.roseCharges!=null?career.roseCharges:8))}catch(e){return 0}}
function cardHTML(){
  try{
    if(!isRose())return '';
    var n=left(),st=String((career&&career.stage)||'');
    var canUse=(['regular','playin','playoffs'].indexOf(st)>=0);
    var dots='';
    for(var i=1;i<=8;i++)dots+='<i class="'+(i<=n?'on':'')+'"></i>';
    return '<section class="v120-blast-card">'
      +'<header><div><small>ROSE · ROSE NIGHTS</small><b>玫瑰之名 · 八次超神</b></div><em>'+n+' / 8</em></header>'
      +'<div class="v120-dots">'+dots+'</div>'
      +'<p>用掉一颗：当场比赛得分约 +30%、命中率 +6 点、赢球概率约 +10 个百分点。常规赛、附加赛、季后赛都能用；<b>用完即止，不会有任何额外惩罚</b>。</p>'
      +'<div class="v120-row"><button class="btn secondary" onclick="roseBlast()"'+(n<=0||!canUse?' disabled':'')+'>'
      +(n<=0?'八颗玫瑰已用完':(canUse?'今晚超神（剩 '+n+' 颗）':'比赛阶段才能使用'))+'</button>'
      +'<span>'+(career&&career.roseBlastNow?'本场已启用，开打即生效':'他的第一步与终结天生顶级，投射上限低于同档——改写历史靠这八颗玫瑰')+'</span></div>'
      +'</section>';
  }catch(e){return ''}
}
window.roseBlastCardHTML=cardHTML;

/* 插进季后赛页（放到比赛列表之前） */
try{
  if(typeof playoffView==='function'&&!window.__v122Po){
    var __v122P=playoffView;
    playoffView=function(){
      var h=__v122P.apply(this,arguments);
      try{
        var s=String(h);
        if(s.indexOf('v120-blast-card')>=0)return s;
        var card=cardHTML();
        if(!card)return s;
        var i=s.indexOf('<div class="po-games"');
        if(i>=0)return s.slice(0,i)+card+s.slice(i);
        return card+s;
      }catch(e){return h}
    };
    window.__v122Po=true;
  }
}catch(e){}
/* 插进附加赛页 */
try{
  if(typeof playInView==='function'&&!window.__v122In){
    var __v122I=playInView;
    playInView=function(){
      var h=__v122I.apply(this,arguments);
      try{
        var s=String(h),card=cardHTML();
        if(!card||s.indexOf('v120-blast-card')>=0)return s;
        return s.replace('</section>',card+'</section>');
      }catch(e){return h}
    };
    window.__v122In=true;
  }
}catch(e){}

/* ---------- 每场开打前清掉旧机制计数（旧飘窗彻底不再出现） ---------- */
try{
  if(typeof simulateGame==='function'&&!window.__v122Sim){
    var __v122S=simulateGame;
    simulateGame=function(){
      try{if(career){career.v108Heavy=0;career.v108Quiet=0}}catch(e){}
      return __v122S.apply(this,arguments);
    };
    window.__v122Sim=true;
  }
}catch(e){}
try{
  if(typeof playoffGame==='function'&&!window.__v122PoG){
    var __v122G=playoffGame;
    playoffGame=function(){
      try{if(career){career.v108Heavy=0;career.v108Quiet=0}}catch(e){}
      return __v122G.apply(this,arguments);
    };
    window.__v122PoG=true;
  }
}catch(e){}

window.__v122Debug={loadMax:(window.V108&&window.V108.LOAD_MAX),card:cardHTML};
})();

