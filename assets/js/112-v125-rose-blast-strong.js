
/* ============================================================================
 * V125 · 超神再调（玩家反馈五条）
 *   ① 增幅：得分从 +30% 提到约 2.4 倍（约 200%~250%）
 *   ② 必赢：用了超神这场一定赢（常规赛与季后赛都生效）
 *   ③ 常规赛用超神时**自动暂停模拟**，玩家关掉弹窗再继续
 *   ④ 弹窗里同时给「预计得分」与「实际得分」，把差距摆出来
 *   ⑤ 弹窗重做：玫瑰主题卡片 + 对比区 + 数据格，不再是大黑块
 * ============================================================================ */
(function(){
'use strict';
if(window.__v125Fix)return;window.__v125Fix=true;

var MULT=2.4;
window.ROSE_BLAST_MULT=MULT;
try{ window.__ROSE_BLAST_MULT=MULT }catch(e){}

function unlocked(){try{return !!(career&&career.playerId==='rose'&&career.talents&&career.talents.indexOf('rose_x')>=0)}catch(e){return false}}
function left(){try{return Math.max(0,Number(career&&career.roseCharges!=null?career.roseCharges:8))}catch(e){return 0}}
function stage(){try{return String(career&&career.stage||'')}catch(e){return ''}}
function usable(){
  try{
    if(!unlocked()||left()<=0)return false;
    var st=stage();
    if(st==='regular')return (Number(career.games)||0)<82;
    if(st==='playin')return true;
    if(st==='playoffs'){var po=career.playoff;if(!po)return false;return !po.review}
    return false;
  }catch(e){return false}
}
window.roseBlastUsable=usable;

/* ---------- 必赢：把这场结果改成赢（常规赛 / 季后赛都覆盖） ---------- */
function forceWin(beforeWins,isPO,r){
  try{
    if(isPO){
      var gs=(r&&r.games)||[];var g=gs[gs.length-1];
      if(!g)return;
      if(!g.win){g.win=true;if(g.sf<=g.sa){g.sf=g.sa+ (3+(g.sf%5))}r.l=Math.max(0,r.l-1);r.w=(r.w||0)+1}
      if(r.w>=4&&career.playoff&&!career.playoff.review){
        career.playoff.review={won:true,round:career.playoff.round,name:r.name||'季后赛',score:r.w+'-'+r.l,championship:career.playoff.round===3};
      }
    }else{
      var g2=(career.gameLog||[])[0];
      if(g2&&!g2.win){g2.win=true;if(g2.sf<=g2.sa)g2.sf=g2.sa+4;
        career.wins=(Number(career.wins)||0)+1;career.losses=Math.max(0,(Number(career.losses)||0)-1)}
    }
  }catch(e){}
}

/* ---------- 弹窗（重做样式） ---------- */
function esc(v){return String(v==null?'':v).replace(/[<>&]/g,function(m){return {'<':'&lt;','>':'&gt;','&':'&amp;'}[m]})}
function popup(o){
  try{
    var old=document.getElementById('v125-pop');if(old)old.remove();
    var d=document.createElement('div');
    d.id='v125-pop';
    var delta=(o.act!=null&&o.exp!=null)?(o.act-o.exp):null;
    var cells=[['得分',o.l.pts],['篮板',o.l.reb],['助攻',o.l.ast],['抢断',o.l.stl],['盖帽',o.l.blk]];
    var sh=(o.l.fgm!=null?o.l.fgm:'-')+'-'+(o.l.fga!=null?o.l.fga:'-');
    var tp=(o.l.tpm!=null?o.l.tpm:'-')+'-'+(o.l.tpa!=null?o.l.tpa:'-');
    var ft=(o.l.ftm!=null?o.l.ftm:'-')+'-'+(o.l.fta!=null?o.l.fta:'-');
    d.innerHTML=''
      +'<div class="v125-mask"></div>'
      +'<div class="v125-card">'
      + '<div class="v125-head"><small>ROSE NIGHT</small><b>玫瑰之名 · 超神夜</b><em>剩 '+o.left+'/8</em></div>'
      + '<div class="v125-line"><span>'+esc(o.stageName)+'</span><i>·</i><span>对阵 <b>'+esc(o.opp)+'</b></span></div>'
      + '<div class="v125-score"><b class="'+(o.win?'w':'l')+'">'+(o.win?'赢':'输')+'</b><span>'+(o.score||'')+'</span></div>'
      + '<div class="v125-vs">'
      +   '<div><small>预计得分</small><b>'+(o.exp!=null?o.exp:'-')+'</b></div>'
      +   '<div class="v125-arrow">→</div>'
      +   '<div class="hot"><small>实际得分</small><b>'+(o.act!=null?o.act:'-')+'</b></div>'
      +   (delta!=null?('<div class="v125-delta">x'+(o.exp>0?(o.act/o.exp).toFixed(2):'-')+'　+'+(delta>0?delta:0)+' 分</div>'):'')
      + '</div>'
      + '<div class="v125-grid">'+cells.map(function(c){return '<div><b>'+(c[1]!=null?c[1]:'-')+'</b><span>'+c[0]+'</span></div>'}).join('')+'</div>'
      + '<div class="v125-detail">投篮 <b>'+sh+'</b> · 三分 <b>'+tp+'</b> · 罚球 <b>'+ft+'</b>'+(o.l.min!=null?(' · 出场 <b>'+o.l.min+'</b> 分钟'):'')+'</div>'
      + '<button class="v125-ok" onclick="document.getElementById(\'v125-pop\').remove()">关掉，继续</button>'
      +'</div>';
    var st=document.createElement('style');
    st.id='v125-style';
    st.textContent=[
      '.v125-mask{position:fixed;inset:0;background:rgba(20,10,12,.55);z-index:2147482000}',
      '.v125-card{position:fixed;left:14px;right:14px;top:50%;transform:translateY(-50%);z-index:2147483000;border-radius:22px;overflow:hidden;background:linear-gradient(165deg,#2a1116,#4a1a22 55%,#7d2433);color:#ffe9ec;box-shadow:0 22px 50px rgba(0,0,0,.55);padding:14px 15px 15px;font:12.5px/1.6 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif}',
      '.v125-head{display:flex;align-items:baseline;gap:8px}',
      '.v125-head small{font-size:9.5px;letter-spacing:.14em;color:#e8a7b2}',
      '.v125-head b{font-size:15px;font-weight:1000}',
      '.v125-head em{margin-left:auto;font-style:normal;font-size:12px;color:#ffd0d7;font-weight:1000}',
      '.v125-line{margin-top:8px;color:#f3c9d1;font-size:12px;display:flex;gap:6px;align-items:center}',
      '.v125-line i{opacity:.5;font-style:normal}',
      '.v125-score{display:flex;align-items:baseline;gap:10px;margin:10px 0 4px}',
      '.v125-score b{font-size:22px;font-weight:1000;padding:1px 10px;border-radius:10px}',
      '.v125-score b.w{background:linear-gradient(180deg,#7ee2a8,#39b877);color:#0d2a1a}',
      '.v125-score b.l{background:linear-gradient(180deg,#ff9aa6,#e2525f);color:#2a0d10}',
      '.v125-score span{font-size:17px;font-weight:1000;letter-spacing:.02em}',
      '.v125-vs{display:flex;align-items:center;gap:10px;margin-top:10px;padding:9px 11px;border-radius:14px;background:rgba(255,255,255,.07)}',
      '.v125-vs div{text-align:center;min-width:64px}',
      '.v125-vs small{display:block;font-size:9.5px;color:#e8a7b2}',
      '.v125-vs b{font-size:19px;font-weight:1000}',
      '.v125-vs .hot b{color:#ffd88f}',
      '.v125-arrow{color:#e8a7b2;font-size:15px}',
      '.v125-delta{margin-left:auto;font-size:11.5px;color:#ffd88f;font-weight:1000;text-align:right}',
      '.v125-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:10px}',
      '.v125-grid div{background:rgba(255,255,255,.07);border-radius:11px;padding:7px 4px;text-align:center}',
      '.v125-grid b{display:block;font-size:15px;font-weight:1000}',
      '.v125-grid span{font-size:9px;color:#e8a7b2}',
      '.v125-detail{margin-top:9px;font-size:11px;color:#f3c9d1}',
      '.v125-ok{margin-top:13px;width:100%;border:0;border-radius:13px;padding:11px;font-size:13.5px;font-weight:1000;color:#3a1218;background:linear-gradient(180deg,#ffd0d7,#ff8a9a)}'
    ].join('');
    (document.head||document.documentElement).appendChild(st);
    (document.body||document.documentElement).appendChild(d);
  }catch(e){}
}

/* ---------- 使用：暂停 → 模拟一场 → 必赢 → 弹对比战报 ---------- */
window.roseBlastUse=function(){
  try{
    if(!unlocked())return false;
    if(!usable()){
      var st0=stage();
      if(typeof notify==='function')notify(left()<=0?'八颗玫瑰已经用完了':(st0==='playoffs'?'本轮系列赛已经打完，等下一轮再用':'现在没有比赛可以用'));
      return false;
    }
    /* ③ 常规赛先暂停自动模拟 */
    var st=stage();
    if(st==='regular'){try{if(typeof stopSim==='function')stopSim()}catch(e){}}

    /* ④ 预计得分 */
    var exp=null;
    try{
      var s=career.seasonStats||{};
      if(Number(s.pts)>0)exp=Math.round(Number(s.pts));
      else if(typeof statExpect==='function')exp=Math.round(Number(statExpect().pts)||0);
    }catch(e){}

    career.roseCharges=left()-1;
    career.roseBlastNow=true;

    var opp='对手',stageName='常规赛',score='',line=null,win=false,isPO=(st==='playoffs'),r=null;
    try{
      if(st==='regular'){
        if(typeof simulateGame==='function')simulateGame();
        var g=(career.gameLog||[])[0];
        if(g){opp=g.oppName||g.opp||'对手';score=(g.sf!=null&&g.sa!=null)?(g.sf+'-'+g.sa):'';line=g.line||null;win=!!g.win}
      }else if(st==='playin'){
        stageName='附加赛';
        if(typeof playInGame==='function')playInGame();
        var g2=(career.gameLog||[])[0];
        if(g2){opp=g2.oppName||g2.opp||'对手';score=(g2.sf!=null&&g2.sa!=null)?(g2.sf+'-'+g2.sa):'';line=g2.line||null;win=!!g2.win}
      }else if(isPO){
        var po=career.playoff;r=po&&po.rounds&&po.rounds[po.round];
        stageName=(r&&r.name)||'季后赛';opp=(r&&(r.oppName||r.opp))||'对手';
        if(typeof playoffGame==='function')playoffGame();
        var gs=(r&&r.games)||[];var g3=gs[gs.length-1];
        if(g3){score=(g3.sf!=null&&g3.sa!=null)?(g3.sf+'-'+g3.sa):'';line=g3.line||null;win=!!g3.win}
      }
    }catch(e){}

    /* ② 必赢（若不巧输了，改写这一场的结果） */
    if(!win){forceWin(0,isPO,r);try{
      if(isPO){var gs2=(r&&r.games)||[];var g4=gs2[gs2.length-1];if(g4){win=!!g4.win;score=(g4.sf!=null&&g4.sa!=null)?(g4.sf+'-'+g4.sa):score}}
      else{var g5=(career.gameLog||[])[0];if(g5){win=!!g5.win;score=(g5.sf!=null&&g5.sa!=null)?(g5.sf+'-'+g5.sa):score}}
    }catch(e){}}

    var l=line||{};
    var act=(l.pts!=null)?l.pts:null;
    popup({left:career.roseCharges,stageName:stageName,opp:opp,score:score,win:win,l:l,exp:exp,act:act});
    if(typeof window.v222Pop==='function')window.v222Pop('玫瑰之名 · 超神夜','用掉 1 颗，剩余 '+career.roseCharges+' 颗');

    if(typeof save==='function')save();
    if(typeof render==='function')render();
    return true;
  }catch(e){return false}
};
window.roseBlast=window.roseBlastUse;

/* 卡面（沿用紧凑条，按钮文案改为「使用」） */
function card(){
  try{
    if(!unlocked())return '';
    var n=left(),ok=usable(),st=stage();
    var dots='';for(var i=1;i<=8;i++)dots+='<i class="'+(i<=n?'on':'')+'"></i>';
    var label=(n<=0)?'八颗玫瑰已用完':(!ok?((st==='playoffs')?'本轮已结束':'比赛中才能用'):'使用');
    return '<section class="v123-bar">'
      +'<div class="v123-top"><b>玫瑰之名 · 八次超神</b><em>'+n+'/8</em></div>'
      +'<div class="v123-mid"><div class="v123-dots">'+dots+'</div>'
      +'<button class="v123-btn" onclick="roseBlastUse()"'+(ok?'':' disabled')+'>'+label+'</button></div>'
      +'<div class="v123-note">用一颗：当场得分约 2.4 倍、命中率 +6 点、<b>而且这场必赢</b>；用完不会有任何惩罚。</div>'
      +'</section>';
  }catch(e){return ''}
}
window.roseBlastCardHTML=card;

window.__v125Debug={mult:MULT,use:window.roseBlastUse};
})();

