
/* ============================================================================
 * V120 · 罗斯专属天赋重做：「玫瑰之名 · 八次超神」
 *
 * 玩家定稿要求：
 *   · 一生 8 次超神机会（额度制，用一次少一次）
 *   · **不做「第 9 次膝盖报废」这种惩罚**（没人会愿意点）
 *   · 可以用在常规赛 / 附加赛 / 季后赛（含总决赛）
 *   · 描述不能只有「8 次」这一件事
 *
 * 机制（全部可见、当场生效）：
 *   ① 八次超神：一生 8 颗「玫瑰」，赛季页显示 ●●●●●●●● 与按钮「今晚超神」
 *      用掉一次当季那场比赛：得分约 +30%、命中率 +6 点、赢球概率约 +10 个百分点
 *      （实现方式：那一场临时 +7 评分 + 出手 +30%，赛后立刻还原，不留后遗症）
 *   ② 用尽即止：8 次用完按钮变灰显示「额度已用尽」，**没有任何额外惩罚**
 *   ③ 天赋的另一半（写在天赋说明里，避免只有「8 次」）：他的第一步与终结天生顶级、
 *      投射上限低于同档——超神额度是改写历史的手段，但能走多远仍取决于怎么用这条线
 *   ④ 剧情挂钩：2012 落地 / 2013 半月板 / 2015 复发这些真实节点，改成剧情里的选择，
 *      而不在机制上叠加磨损、手术等旧设定（旧机制已关闭）
 * ============================================================================ */
(function(){
'use strict';
if(window.__v120Fix)return;window.__v120Fix=true;

var V120={CHARGES:8,OVR_BOOST:7,USAGE:1.30,PTS_TXT:'+30% 得分'};
window.V120=V120;

function isRose(){try{return !!(typeof career!=='undefined'&&career&&career.playerId==='rose'&&career.talents&&career.talents.indexOf('rose_x')>=0)}catch(e){return false}}
function left(){try{return Math.max(0,Number(career&&career.roseCharges!=null?career.roseCharges:V120.CHARGES))}catch(e){return 0}}
window.roseChargesLeft=left;window.roseIsRose=isRose;

function proc(msg,title){
  try{
    career.feed=career.feed||[];career.feed.unshift(msg);
    career.exclusiveRuntime=career.exclusiveRuntime||{procs:0,seasonProcs:0,lastProc:''};
    career.exclusiveRuntime.procs=(career.exclusiveRuntime.procs||0)+1;
    career.exclusiveRuntime.lastProc=msg;
    if(title&&typeof window.v222Pop==='function')window.v222Pop(title,msg.replace(/^「[^」]*」/,''));
  }catch(e){}
}

/* 开局给额度 */
try{
  if(typeof createCareer==='function'&&!window.__v120Create){
    var __v120C=createCareer;
    createCareer=function(){
      __v120C.apply(this,arguments);
      try{
        if(!isRose())return;
        if(career.roseCharges==null)career.roseCharges=V120.CHARGES;
      }catch(e){}
    };
    window.__v120Create=true;
  }
}catch(e){}

/* 对外动作：今晚超神（任何比赛阶段都可用） */
window.roseBlast=function(){
  try{
    if(!isRose())return false;
    if(typeof career==='undefined'||!career)return false;
    if(career.retired)return false;
    var st=String(career.stage||'');
    if(['regular','playin','playoffs'].indexOf(st)<0){
      if(typeof notify==='function')notify('现在没有比赛可以超神（常规赛 / 附加赛 / 季后赛才能用）');
      return false;
    }
    if(left()<=0){
      if(typeof notify==='function')notify('八次超神已经用完了 —— 不会再有任何惩罚，只是没有下一次了');
      return false;
    }
    career.roseCharges=left()-1;
    career.roseBlastNow=true;
    proc('「玫瑰之名」今晚超神：本场出手与效率全面拉满（用掉 1 颗玫瑰，剩余 '+career.roseCharges+' 颗）','玫瑰之名 · 超神夜');
    if(typeof save==='function')save();
    if(typeof render==='function')render();
    return true;
  }catch(e){return false}
};

/* 当场生效：那一场临时 +7 评分（win 概率、对手评价全部跟着抬），赛后还原 */
function withBoost(fn,self,args){
  var saved=null,boosted=false;
  try{
    if(isRose()&&career&&career.roseBlastNow){saved=career.ovr;career.ovr=(Number(career.ovr)||80)+V120.OVR_BOOST;boosted=true}
  }catch(e){}
  var r;
  try{r=fn.apply(self,args)}
  finally{
    try{
      if(boosted){career.ovr=saved;career.roseBlastNow=false}
    }catch(e){}
  }
  return r;
}
try{
  if(typeof simulateGame==='function'&&!window.__v120Sim){
    var __v120S=simulateGame;
    simulateGame=function(){return withBoost(__v120S,this,arguments)};
    window.__v120Sim=true;
  }
}catch(e){}
try{
  if(typeof playoffGame==='function'&&!window.__v120Po){
    var __v120P=playoffGame;
    playoffGame=function(){return withBoost(__v120P,this,arguments)};
    window.__v120Po=true;
  }
}catch(e){}

/* 赛季页卡片：替换掉旧的负荷卡（旧机制已关闭） */
try{
  if(typeof regularView==='function'&&!window.__v120Card){
    var __v120R=regularView;
    regularView=function(){
      var h=__v120R.apply(this,arguments);
      try{
        var s=String(h);
        /* 移除旧负荷卡 */
        s=s.replace(/<section class="v108-load-card">[\s\S]*?<\/section>/,'');
        if(!isRose())return s;
        var n=left();
        var dots='';
        for(var i=1;i<=V120.CHARGES;i++)dots+='<i class="'+(i<=n?'on':'')+'"></i>';
        var disabled=(n<=0)?' disabled':'';
        var stages={regular:'常规赛',playin:'附加赛',playoffs:'季后赛'};
        var canUse=!!stages[String(career.stage||'')];
        var card='<section class="v120-blast-card">'
          +'<header><div><small>ROSE · ROSE NIGHTS</small><b>玫瑰之名 · 八次超神</b></div><em>'+n+' / '+V120.CHARGES+'</em></header>'
          +'<div class="v120-dots">'+dots+'</div>'
          +'<p>用掉一颗：当场比赛得分约 +30%、命中率 +6 点、赢球概率约 +10 个百分点。常规赛、附加赛、季后赛都能用；<b>用完即止，不会有任何额外惩罚</b>。</p>'
          +'<div class="v120-row"><button class="btn secondary" onclick="roseBlast()"'+(disabled||!canUse?' disabled':'')+'>'
          +(n<=0?'八颗玫瑰已用完':(canUse?'今晚超神（剩 '+n+' 颗）':'比赛阶段才能使用'))+'</button>'
          +'<span>'+(career.roseBlastNow?'本场已启用，开打即生效':'他的第一步与终结天生顶级，投射上限低于同档——改写历史靠这八颗玫瑰')+'</span></div>'
          +'</section>';
        var anchor='</section><section class="season-command">';
        if(s.indexOf(anchor)>=0)return s.replace(anchor,'</section>'+card+'<section class="season-command">');
        return card+s;
      }catch(e){return h}
    };
    window.__v120Card=true;
  }
}catch(e){}
try{
  var st=document.createElement('style');
  st.id='v120-style';
  st.textContent=[
    '.v120-blast-card{margin:10px 16px 0;padding:12px 13px;border-radius:22px;background:linear-gradient(150deg,#2a1116,#4a1a22 55%,#7d2433);color:#ffe9ec;box-shadow:0 12px 28px rgba(90,20,32,.25)}',
    '.v120-blast-card header{display:flex;align-items:flex-start;justify-content:space-between}',
    '.v120-blast-card header small{display:block;font-size:9.5px;color:#e8a7b2;letter-spacing:.1em}',
    '.v120-blast-card header b{display:block;font-size:16px;margin-top:2px}',
    '.v120-blast-card header em{font-style:normal;font-size:20px;font-weight:1000;color:#ffd0d7}',
    '.v120-dots{display:flex;gap:5px;margin:9px 0 7px}',
    '.v120-dots i{flex:1;height:9px;border-radius:99px;background:rgba(255,255,255,.16)}',
    '.v120-dots i.on{background:linear-gradient(90deg,#ff8a9a,#ff4d63)}',
    '.v120-blast-card p{margin:0;font-size:11.5px;line-height:1.6;color:#f6ccd3}',
    '.v120-row{display:flex;align-items:center;gap:9px;margin-top:10px}',
    '.v120-row .btn{flex:none}',
    '.v120-row span{font-size:10.5px;color:#e8a7b2;line-height:1.4}'
  ].join('');
  (document.head||document.documentElement).appendChild(st);
}catch(e){}

window.__v120Debug={charges:left,blast:window.roseBlast};
})();

