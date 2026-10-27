
/* ============================================================================
 * V124 · 超神卡交互升级（玩家反馈）
 *   ① 卡上给一个明确的「使用」小按钮
 *   ② 用掉后**弹窗展示**：这场和谁打（对手/主客/阶段）+ 详细数据（分板助断帽、
 *      投篮命中数-出手数、三分、罚球）+ 最终比分与胜负
 *   ③ 季后赛 / 附加赛：点「使用」**直接自动模拟下一场**
 *   ④ 本轮系列赛打完（已有系列赛结算）→ 按钮**置灰**，等下一轮；八颗用完也置灰
 * ============================================================================ */
(function(){
'use strict';
if(window.__v124Fix)return;window.__v124Fix=true;

function unlocked(){try{return !!(career&&career.playerId==='rose'&&career.talents&&career.talents.indexOf('rose_x')>=0)}catch(e){return false}}
function left(){try{return Math.max(0,Number(career&&career.roseCharges!=null?career.roseCharges:8))}catch(e){return 0}}
function stage(){try{return String(career&&career.stage||'')}catch(e){return ''}}
/* 当前是否还能用：比赛阶段 + 有额度 + （季后赛）本轮没打完 */
function usable(){
  try{
    if(!unlocked()||left()<=0)return false;
    var st=stage();
    if(st==='regular')return (Number(career.games)||0)<82;
    if(st==='playin')return true;
    if(st==='playoffs'){
      var po=career.playoff;
      if(!po)return false;
      if(po.review)return false;                 /* 本轮已打完 → 置灰 */
      return true;
    }
    return false;
  }catch(e){return false}
}
window.roseBlastUsable=usable;

/* 卡面：紧凑两行 + 明确的「使用」按钮 */
function card(){
  try{
    if(!unlocked())return '';
    var n=left(),ok=usable(),st=stage();
    var dots='';
    for(var i=1;i<=8;i++)dots+='<i class="'+(i<=n?'on':'')+'"></i>';
    var label;
    if(n<=0)label='八颗玫瑰已用完';
    else if(!ok)label=(st==='playoffs')?'本轮已结束':'比赛中才能用';
    else label='使用';
    return '<section class="v123-bar">'
      +'<div class="v123-top"><b>玫瑰之名 · 八次超神</b><em>'+n+'/8</em></div>'
      +'<div class="v123-mid"><div class="v123-dots">'+dots+'</div>'
      +'<button class="v123-btn" onclick="roseBlastUse()"'+(ok?'':' disabled')+'>'+label+'</button></div>'
      +'<div class="v123-note">用一颗：当场得分约 +30%、命中率 +6 点、赢球率约 +10 个百分点；不会影响其它场次。</div>'
      +'</section>';
  }catch(e){return ''}
}
window.roseBlastCardHTML=card;

/* 战报弹窗（自绘浮层，不依赖弹窗系统） */
function popup(html){
  try{
    var old=document.getElementById('v124-pop');if(old)old.remove();
    var d=document.createElement('div');
    d.id='v124-pop';
    d.style.cssText='position:fixed;left:12px;right:12px;top:50%;transform:translateY(-50%);z-index:2147483000;background:#1d1416;color:#ffe9ec;border-radius:18px;padding:14px 15px;box-shadow:0 18px 40px rgba(0,0,0,.5);font:12.5px/1.65 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif';
    d.innerHTML=html+'<div style="margin-top:12px"><button onclick="document.getElementById(\'v124-pop\').remove()" style="width:100%;border:0;border-radius:12px;padding:10px;font-weight:1000;background:linear-gradient(180deg,#ffd0d7,#ff8a9a);color:#3a1218">知道了</button></div>';
    (document.body||document.documentElement).appendChild(d);
  }catch(e){}
}

function reportLine(g,oppName,stageName,score){
  var l=(g&&g.line)||{};
  var fg=(l.fgm!=null?l.fgm:'-')+'-'+(l.fga!=null?l.fga:'-');
  var tp=(l.tpm!=null?l.tpm:'-')+'-'+(l.tpa!=null?l.tpa:'-');
  var ft=(l.ftm!=null?l.ftm:'-')+'-'+(l.fta!=null?l.fta:'-');
  return '<div style="font-size:13px;font-weight:1000;margin-bottom:6px">今晚超神 · '+stageName+'</div>'
    +'<div style="color:#e8a7b2">对阵：<b style="color:#ffe9ec">'+oppName+'</b>'+(score?(' · 最终比分 <b style="color:#ffe9ec">'+score+'</b>'):'')+'</div>'
    +'<div style="color:'+(g&&g.win?'#7ee2a8':'#ff9aa6')+';margin-top:2px">结果：'+(g&&g.win?'<b>赢下这场</b>':'<b>这场输了</b>')+'</div>'
    +'<div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap">'
    +'<span>得分 <b>'+(l.pts!=null?l.pts:'-')+'</b></span><span>篮板 <b>'+(l.reb!=null?l.reb:'-')+'</b></span>'
    +'<span>助攻 <b>'+(l.ast!=null?l.ast:'-')+'</b></span><span>抢断 <b>'+(l.stl!=null?l.stl:'-')+'</b></span>'
    +'<span>盖帽 <b>'+(l.blk!=null?l.blk:'-')+'</b></span>'
    +'</div>'
    +'<div style="margin-top:6px;color:#e8a7b2">投篮 <b style="color:#ffe9ec">'+fg+'</b> · 三分 <b style="color:#ffe9ec">'+tp+'</b> · 罚球 <b style="color:#ffe9ec">'+ft+'</b>'
    +(l.min!=null?(' · 出场 '+l.min+' 分钟'):'')+'</div>';
}

/* 使用：扣一颗 → 自动模拟这一场 → 弹战报 */
window.roseBlastUse=function(){
  try{
    if(!unlocked())return false;
    if(!usable()){
      var st=stage();
      if(typeof notify==='function')notify(left()<=0?'八颗玫瑰已经用完了':(st==='playoffs'?'本轮系列赛已经打完，等下一轮再用':'现在没有比赛可以用'));
      return false;
    }
    career.roseCharges=left()-1;
    career.roseBlastNow=true;

    var oppName='对手',stageName='常规赛',score='',g=null;
    try{
      if(stage()==='regular'||stage()==='playin'){
        var isIn=(stage()==='playin');
        if(isIn)stageName='附加赛';
        if(isIn){if(typeof playInGame==='function')playInGame()}else if(typeof simulateGame==='function')simulateGame();
        g=(career.gameLog||[])[0]||null;
        if(g){oppName=g.oppName||g.opp||'对手';score=(g.sf!=null&&g.sa!=null)?(g.sf+'-'+g.sa):''}
      }else if(stage()==='playoffs'){
        var po=career.playoff,r=po&&po.rounds&&po.rounds[po.round];
        stageName=(r&&r.name)||'季后赛';
        oppName=(r&&(r.oppName||r.opp))||'对手';
        if(typeof playoffGame==='function')playoffGame();
        var gs=(r&&r.games)||[];
        g=gs[gs.length-1]||null;
        if(g)score=(g.sf!=null&&g.sa!=null)?(g.sf+'-'+g.sa):'';
      }
    }catch(e){}

    var head='「玫瑰之名」用掉 1 颗（剩余 '+career.roseCharges+' 颗）<br>';
    if(typeof window.v222Pop==='function')window.v222Pop('玫瑰之名 · 超神夜','用掉 1 颗，剩余 '+career.roseCharges+' 颗');
    popup(head+reportLine(g,oppName,stageName,score));

    if(typeof save==='function')save();
    if(typeof render==='function')render();
    return true;
  }catch(e){return false}
};

/* 旧入口（roseBlast）保留为「只武装不模拟」，避免其它代码调用出错 */
window.roseBlast=window.roseBlastUse;

try{
  var st2=document.createElement('style');
  st2.id='v124-style';
  st2.textContent='.v123-btn{min-width:56px}';
  (document.head||document.documentElement).appendChild(st2);
}catch(e){}

window.__v124Debug={usable:usable,use:window.roseBlastUse};
})();

