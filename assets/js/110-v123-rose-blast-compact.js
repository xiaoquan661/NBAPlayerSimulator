
/* ============================================================================
 * V123 · 超神卡两处修正（玩家反馈）
 *   ① 没解锁专属天赋也显示了「八次超神」卡 —— 判断条件只看了 playerId，
 *      没看天赋是否真的解锁。改为必须 持有 rose_x。
 *   ② 卡面太大 —— 压成两行紧凑条：标题 + 8 个点 + 按钮，
 *      规则说明收成一行小字，不再占半个屏幕。
 *   三处（常规赛 / 附加赛 / 季后赛）统一用这一个紧凑版。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v123Fix)return;window.__v123Fix=true;

function unlocked(){
  try{
    return !!(typeof career!=='undefined'&&career&&career.playerId==='rose'
      &&career.talents&&career.talents.indexOf('rose_x')>=0);
  }catch(e){return false}
}
function left(){try{return Math.max(0,Number(career&&career.roseCharges!=null?career.roseCharges:8))}catch(e){return 0}}

function compact(){
  try{
    if(!unlocked())return '';
    var n=left(),st=String((career&&career.stage)||'');
    var canUse=(['regular','playin','playoffs'].indexOf(st)>=0);
    var dots='';
    for(var i=1;i<=8;i++)dots+='<i class="'+(i<=n?'on':'')+'"></i>';
    var btn=(n<=0?'八颗玫瑰已用完':(canUse?'今晚超神 · 剩 '+n:'比赛阶段可用'));
    return '<section class="v123-bar">'
      +'<div class="v123-top"><b>玫瑰之名 · 八次超神</b><em>'+n+'/8</em></div>'
      +'<div class="v123-mid"><div class="v123-dots">'+dots+'</div>'
      +'<button class="v123-btn" onclick="roseBlast()"'+(n<=0||!canUse?' disabled':'')+'>'+btn+'</button></div>'
      +'<div class="v123-note">用掉一颗：当场得分约 +30%、命中率 +6 点、赢球率约 +10 个百分点；用完不会有任何惩罚。</div>'
      +'</section>';
  }catch(e){return ''}
}
window.roseBlastCardHTML=compact;
window.roseBlastUnlocked=unlocked;

function inject(fnName,anchorSelector,pick){
  try{
    if(typeof window[fnName]!=='function')return;
    var key='__v123_'+fnName;
    if(window[key])return;
    var prev=window[fnName];
    window[fnName]=function(){
      var h=prev.apply(this,arguments);
      try{
        var s=String(h);
        /* 清掉旧的大卡（v120 / v122 版本） */
        s=s.replace(/<section class="v120-blast-card">[\s\S]*?<\/section>/,'');
        s=s.replace(/<section class="v123-bar">[\s\S]*?<\/section>/,'');
        var c=compact();
        if(!c)return s;
        var i=(anchorSelector&&s.indexOf(anchorSelector)>=0)?s.indexOf(anchorSelector):-1;
        if(i>=0)return s.slice(0,i)+c+s.slice(i);
        return c+s;
      }catch(e){return h}
    };
    window[key]=true;
  }catch(e){}
}
/* 三处页面各自插到合适位置 */
inject('regularView','<section class="season-command">');
inject('playoffView','<div class="po-games"');
inject('playInView',null);
/* 三处也显式指到同一个包装（静态赋值，不使用任何动态执行） */
try{regularView=window.regularView}catch(e){}
try{playoffView=window.playoffView}catch(e){}
try{playInView=window.playInView}catch(e){}

try{
  var st=document.createElement('style');
  st.id='v123-style';
  st.textContent=[
    '.v123-bar{margin:8px 16px 0;padding:8px 10px;border-radius:16px;background:linear-gradient(150deg,#2a1116,#5a1f29);color:#ffe9ec;box-shadow:0 8px 18px rgba(90,20,32,.20)}',
    '.v123-top{display:flex;align-items:center;justify-content:space-between}',
    '.v123-top b{font-size:12.5px;font-weight:1000}',
    '.v123-top em{font-style:normal;font-size:12.5px;font-weight:1000;color:#ffd0d7}',
    '.v123-mid{display:flex;align-items:center;gap:8px;margin-top:6px}',
    '.v123-dots{display:flex;gap:3px;flex:1}',
    '.v123-dots i{flex:1;height:6px;border-radius:99px;background:rgba(255,255,255,.16)}',
    '.v123-dots i.on{background:linear-gradient(90deg,#ff8a9a,#ff4d63)}',
    '.v123-btn{flex:none;border:0;border-radius:99px;padding:5px 11px;font-size:11px;font-weight:1000;color:#3a1218;background:linear-gradient(180deg,#ffd0d7,#ff8a9a)}',
    '.v123-btn[disabled]{background:rgba(255,255,255,.18);color:#e8a7b2}',
    '.v123-note{margin-top:5px;font-size:9.5px;line-height:1.45;color:#e8a7b2}'
  ].join('');
  (document.head||document.documentElement).appendChild(st);
}catch(e){}

window.__v123Debug={unlocked:unlocked,left:left};
})();

