
/* ============================================================================
 * V126 · 超神四处收尾（玩家反馈）
 *   ① 常规赛用超神时**必须真的停表**（此前只调了 stopSim，仍可能被间隔重启）
 *   ② 用了超神的那一场，赛季页的小圆点改成**深粉色**（和超神卡面同色）
 *   ③ 卡上按钮就叫「使用」
 *   ④ 倍率落到 **2.0~2.5 倍**：不确定就按结果校正 —— 算完若不足 2 倍，
 *      把这一场补到约 2.2 倍（同时同步命中数与赛季累计，保证账目自洽）
 * ============================================================================ */
(function(){
'use strict';
if(window.__v126Fix)return;window.__v126Fix=true;

/* ② 深粉圆点样式 */
try{
  var st=document.createElement('style');
  st.id='v126-style';
  st.textContent='.v26-bean.blast{background:linear-gradient(145deg,#ff9ab8,#c2185b)!important;box-shadow:0 0 0 2px rgba(194,24,91,.28),0 2px 6px rgba(194,24,91,.35)!important}';
  (document.head||document.documentElement).appendChild(st);
}catch(e){}

function avgPts(){
  try{var s=career.seasonStats||{};var v=Number(s.pts)||0;if(v>0)return v}catch(e){}
  try{if(typeof statExpect==='function')return Number(statExpect().pts)||0}catch(e){}
  return 0;
}
function fixTotals(delta){
  try{
    if(!delta)return;
    var s=career.seasonStats;if(!s)return;
    if(typeof s.totalPts==='number')s.totalPts=Math.max(0,s.totalPts+delta);
    var gp=Number(s.gp)||0;if(gp>0&&typeof s.totalPts==='number')s.pts=Math.round((s.totalPts/gp)*10)/10;
  }catch(e){}
}

/* ④ 结果校正：把这一场补到 2.0~2.5 倍（自洽：pts ≡ 2*fgm + tpm + ftm） */
function ensureMultiplier(g){
  try{
    if(!g||!g.line)return;
    var l=g.line,avg=avgPts();
    if(!(avg>0))return;
    var want=Math.round(avg*2.2);
    var cap=Math.round(avg*2.5);
    if(want>cap)want=cap;
    var cur=Number(l.pts)||0;
    if(cur>=Math.round(avg*2.0))return;                 /* 已达标，不动 */
    var tpm=Number(l.tpm)||0,ftm=Number(l.ftm)||0;
    var fgm=Math.max(0,Math.round((want-tpm-ftm)/2));
    var pts=2*fgm+tpm+ftm;
    var before=cur;
    l.fgm=fgm;
    if(l.fga==null||l.fga<fgm)l.fga=fgm;
    if(!(Number(l.fga)>0))l.fga=fgm;
    l.pts=pts;
    l.fg=l.fga?+(fgm/l.fga*100).toFixed(1):l.fg;
    fixTotals(pts-before);
  }catch(e){}
}

/* ① 真停表 + 事后补标记/校正 */
function hardStop(){
  try{if(typeof ui!=='undefined'&&ui){ui.sim=false;if(ui.interval){clearInterval(ui.interval);ui.interval=null}}}catch(e){}
}
try{
  if(typeof window.roseBlastUse==='function'&&!window.__v126Use){
    var prev=window.roseBlastUse;
    window.roseBlastUse=function(){
      var st='';try{st=String(career&&career.stage||'')}catch(e){}
      if(st==='regular')hardStop();                      /* 先停表，再模拟这一场 */
      var r=prev.apply(this,arguments);
      try{
        var g=null;
        if(st==='playoffs'){
          var po=career.playoff,r2=po&&po.rounds&&po.rounds[po.round],gs=(r2&&r2.games)||[];
          g=gs[gs.length-1]||null;
        }else{
          g=(career.gameLog||[])[0]||null;
        }
        if(g){
          g.roseBlast=true;                              /* ② 打标记 → 深粉圆点 */
          ensureMultiplier(g);                           /* ④ 补到 2.0~2.5 倍 */
        }
        if(st==='regular')hardStop();                    /* 保证弹窗期间保持停表 */
        if(typeof save==='function')save();
      }catch(e){}
      return r;
    };
    window.roseBlast=window.roseBlastUse;
    window.__v126Use=true;
  }
}catch(e){}

/* 卡面：确保按钮文案是「使用」 */
function card(){
  try{
    if(typeof window.roseBlastUnlocked==='function'&&!window.roseBlastUnlocked())return '';
    var n=8;try{n=Math.max(0,Number(career&&career.roseCharges!=null?career.roseCharges:8))}catch(e){}
    var ok=(typeof window.roseBlastUsable==='function')?window.roseBlastUsable():false;
    var stageName='';try{stageName=String(career&&career.stage||'')}catch(e){}
    var dots='';for(var i=1;i<=8;i++)dots+='<i class="'+(i<=n?'on':'')+'"></i>';
    var label=(n<=0)?'八颗玫瑰已用完':(!ok?((stageName==='playoffs')?'本轮已结束':'比赛中才能用'):'使用');
    return '<section class="v123-bar">'
      +'<div class="v123-top"><b>玫瑰之名 · 八次超神</b><em>'+n+'/8</em></div>'
      +'<div class="v123-mid"><div class="v123-dots">'+dots+'</div>'
      +'<button class="v123-btn" onclick="roseBlastUse()"'+(ok?'':' disabled')+'>'+label+'</button></div>'
      +'<div class="v123-note">用一颗：当场得分约 2.2 倍（不低于 2 倍、不超过 2.5 倍）、<b>这场必赢</b>；用完没有任何惩罚。</div>'
      +'</section>';
  }catch(e){return ''}
}
window.roseBlastCardHTML=card;

window.__v126Debug={hardStop:hardStop,ensure:ensureMultiplier,avg:avgPts};
})();

