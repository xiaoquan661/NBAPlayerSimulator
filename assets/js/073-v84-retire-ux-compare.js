
/* ============================================================================
 * v84 · 开发者第二十六次反馈（四项）
 *
 * 原话：
 *   「现在退役按钮太靠下了，不划到底根本看不见，应该在上方，然后赛季界面的右上角
 *     也加个退役按钮，然后退役报告要有本局生涯和球星真实生涯的对比，然后有个文案
 *     说明本剧生涯和球星真实生涯的差距，做完打成zip」
 *
 * ① 退役按钮太靠下 —— 它在「生涯数据库」页最底部，上面压着十来个区块，
 *    要滑到底才看得见。改：把退役按钮**同时**放到该页顶部，并在
 *    **赛季界面右上角（HUD）**加一个入口。底部原按钮保留（不动既有结构）。
 *
 * ② 赛季界面右上角加退役按钮 —— 挂在 renderHud 的 hud-right 里。
 *
 * ③ 退役报告加「本局生涯 vs 真实生涯」对比 —— 每位球员补一份真实生涯档案
 *    （赛季数 / 场均 / 总得分 / 主要荣誉 / 结局），与本局数据并排对比。
 *
 * ④ 加一段文案说明差距 —— 按本局相对真实的强弱，生成不同措辞的结论文案
 *    （远超真实 / 好于真实 / 接近真实 / 不如真实）。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v84Fix)return;window.__v84Fix=true;

function esc84(v){return String(v==null?'':v).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})}
function num84(v,d){var n=Number(v);return isFinite(n)?n:(d||0)}
function fmt84(v){try{return Math.round(num84(v)).toLocaleString()}catch(e){return String(Math.round(num84(v)))}}

/* ==========================================================================
 * 一、真实生涯档案（六位状元）
 *    字段：seasons 赛季数、team 主要球队、ppg/rpg/apg 生涯场均、
 *          totalPts 生涯总得分、honors 主要荣誉、ending 真实结局
 *    口径说明：均为现实公开生涯的约数，用于「本局 vs 现实」的对照参考。
 * ========================================================================== */
var V84_REAL={
  bennett:{
    seasons:4, team:'骑士/森林狼/猛龙/篮网', ppg:4.4, rpg:3.1, apg:0.5,
    totalPts:658, honors:'无主要荣誉', peak:'角色球员',
    ending:'4 个赛季后淡出联盟，被视为「史上最差状元」的典型案例。'
  },
  oden:{
    seasons:5, team:'开拓者/热火', ppg:8.0, rpg:6.2, apg:0.6,
    totalPts:840, honors:'无主要荣誉', peak:'受限的内线潜力',
    ending:'反复膝伤，始终没能打完一个完整赛季，30 岁前离开联盟。'
  },
  kwame:{
    seasons:12, team:'奇才/湖人/灰熊/活塞', ppg:6.6, rpg:5.5, apg:1.0,
    totalPts:4113, honors:'无主要荣誉', peak:'合格轮换内线',
    ending:'在联盟待了很久，但始终停在角色球员，没兑现状元期待。'
  },
  fultz:{
    seasons:8, team:'76人/魔术/国王', ppg:10.9, rpg:3.2, apg:4.6,
    totalPts:2385, honors:'无主要荣誉', peak:'重建中的首发后卫',
    ending:'投篮与伤病改变成长路径，后来在新球队重新找到角色。'
  },
  simmons:{
    seasons:8, team:'76人/篮网/快船', ppg:13.7, rpg:7.6, apg:7.2,
    totalPts:4135, honors:'3 次全明星 · 2 次最佳防守阵容', peak:'全明星级',
    ending:'早期迅速成为全明星，但进攻短板与伤病让生涯充满争议。'
  },
  yao:{
    seasons:8, team:'休斯顿火箭', ppg:19.0, rpg:9.2, apg:1.6,
    totalPts:9247, honors:'8 次全明星 · 5 次最佳阵容', peak:'联盟顶级中锋',
    ending:'巅峰赛季场均 22+10，但脚伤反复加常年无休，31 岁被迫退役。'
  }
};

/* 取真实档案 + 本局档案，算出对比结论 */
function v84Compare(){
  try{
    var p=(typeof currentP==='function'&&currentP())?currentP():null;
    if(!p)return null;
    var real=V84_REAL[p.id]||null;
    if(!real)return null;
    var tot={},avg={},honors={};
    try{
      var inp=(typeof v81CurrentInput==='function')?v81CurrentInput():null;
      if(inp){tot=inp.careerTotals||{};avg=inp.avg||{};honors=inp.honors||{}}
    }catch(e){}
    /* 本局荣誉条数（按 V81 权重键统计有值的项） */
    var honCount=0,honLine=[];
    try{
      Object.keys(honors||{}).forEach(function(k){var n=num84(honors[k],0);if(n>0){honCount+=n;honLine.push(k+'×'+n)}});
    }catch(e){}
    var mySeasons=num84(tot.seasons,0);
    var myPts=num84(tot.points,0);
    var myPpg=num84(avg.pts,0), myRpg=num84(avg.reb,0), myApg=num84(avg.ast,0);
    /* 综合差距：以「场均得分 + 场均篮板 + 荣誉数」三项相对真实值的比值为主 */
    var score=0,realScore=0;
    score=myPpg*1.0+myRpg*0.8+myApg*0.5+honCount*2.2;
    realScore=(real.ppg*1.0+real.rpg*0.8+real.apg*0.5)+ (real.honors.indexOf('无主要荣誉')>=0?0:6.6);
    var ratio=realScore>0?score/realScore:0;
    var tier='same', gapText='';
    if(ratio>=1.8){tier='far-above';gapText='你打出的生涯远超现实——现实里的这段路几乎没有高光，而你把它改写成了另一个故事。'}
    else if(ratio>=1.15){tier='above';gapText='你明显好过了现实。现实里被压住的天赋，在这一局里真的兑现了出来。'}
    else if(ratio>=0.85){tier='same';gapText='你的生涯和现实大致在同一档——你走出了一个更完整的版本，但并没有彻底改写结局。'}
    else {tier='below';gapText='这一局你甚至没能追上现实。现实里的那段生涯虽有遗憾，却也有它站住脚的地方。'}
    return {
      player:p.zh, real:real,
      mine:{seasons:mySeasons, ppg:myPpg, rpg:myRpg, apg:myApg, totalPts:myPts,
            honors:honLine.length?honLine.join(' · '):'无主要荣誉'},
      ratio:ratio, tier:tier, gapText:gapText
    };
  }catch(e){return null}
}
window.v84Compare=v84Compare;

function v84Row(label,real,mine,unit){
  unit=unit||'';
  return '<div class="v84-cmp-row">'
    +'<small>'+esc84(label)+'</small>'
    +'<div class="v84-cmp-real"><i>现实</i><b>'+esc84(real)+unit+'</b></div>'
    +'<div class="v84-cmp-mine"><i>本局</i><b>'+esc84(mine)+unit+'</b></div>'
    +'</div>';
}

function v84CompareBlock(){
  var c=v84Compare();
  if(!c)return '';
  var r=c.real,m=c.mine;
  var tierName={ 'far-above':'远超现实','above':'好于现实','same':'接近现实','below':'不如现实' }[c.tier]||'';
  return '<section class="v84-cmp">'
    +'<header><small>CAREER COMPARISON</small><b>本局生涯 vs 真实生涯</b>'
      +'<span class="v84-tier '+c.tier+'">'+esc84(tierName)+'</span></header>'
    + v84Row('生涯赛季', String(r.seasons), String(m.seasons), ' 季')
    + v84Row('场均得分', String(r.ppg), String(Math.round(m.ppg*10)/10), ' 分')
    + v84Row('场均篮板', String(r.rpg), String(Math.round(m.rpg*10)/10), ' 板')
    + v84Row('场均助攻', String(r.apg), String(Math.round(m.apg*10)/10), ' 助')
    + v84Row('生涯总得分', fmt84(r.totalPts), fmt84(m.totalPts), '')
    + v84Row('真实主要荣誉', r.honors, m.honors, '')
    +'<div class="v84-cmp-note">'
      +'<b>差距说明</b><p>'+esc84(c.gapText)+'</p>'
      +'<p class="v84-real-ending">现实结局：'+esc84(r.ending)+'</p>'
    +'</div>'
    +'</section>';
}
window.v84CompareBlock=v84CompareBlock;

/* 插到退役海报里（v81 海报之后） */
try{
  if(typeof renderRetired==='function'&&!window.__v84RetirePatched){
    var __v84Retired=renderRetired;
    renderRetired=function(){
      var h=__v84Retired.apply(this,arguments);
      try{
        if(typeof h!=='string'||!h)return h;
        if(h.indexOf('v84-cmp')>=0)return h;
        var block=v84CompareBlock();
        if(!block)return h;
        /* 插在 v81 海报区块之后（紧贴着，玩家一进来就能看到对比） */
        var m=h.match(/<section class="v81-retire">[\s\S]*?<\/section>/);
        if(m){
          var at=h.indexOf(m[0])+m[0].length;
          return h.slice(0,at)+block+h.slice(at);
        }
        var a2=h.indexOf('<section class="retired">');
        if(a2>=0){
          var s2=h.indexOf('>',a2)+1;
          return h.slice(0,s2)+block+h.slice(s2);
        }
        return h+block;
      }catch(e){return h}
    };
    window.__v84RetirePatched=true;
  }
}catch(e){}

/* ==========================================================================
 * 二、退役按钮：页面上方 + 赛季界面右上角
 * ========================================================================== */

/* 统一的退役确认弹窗入口（复用游戏既有的 modal 机制） */
function v84RetireBtnHTML(cls){
  return '<button class="v84-retire-btn '+esc84(cls||'')+'" onclick="ui.modal={kind:\'retire\'};render()">宣布退役</button>';
}
window.v84RetireBtnHTML=v84RetireBtnHTML;

/* 赛季界面右上角（HUD）：加退役入口 */
try{
  if(typeof renderHud==='function'&&!window.__v84HudPatched){
    var __v84Hud=renderHud;
    renderHud=function(){
      var h=__v84Hud.apply(this,arguments);
      try{
        if(typeof h!=='string')return h;
        if(h.indexOf('v84-hud-retire')>=0)return h;
        var btn='<button class="v84-hud-retire" onclick="ui.modal={kind:\'retire\'};render()" title="宣布退役">退役</button>';
        var m=h.match(/<div class="hud-right">/);
        if(m){
          var at=h.indexOf(m[0])+m[0].length;
          return h.slice(0,at)+btn+h.slice(at);
        }
        /* hud-right 不存在时插到 header 结束前 */
        var hd=h.indexOf('</header>');
        if(hd>=0)return h.slice(0,hd)+btn+h.slice(hd);
        return h;
      }catch(e){return h}
    };
    window.__v84HudPatched=true;
  }
}catch(e){}

/* 生涯数据库页：把退役按钮搬到**顶部**（底部原按钮保留） */
try{
  if(typeof careerArchiveView==='function'&&!window.__v84ArchivePatched){
    var __v84Archive=careerArchiveView;
    careerArchiveView=function(){
      var h=__v84Archive.apply(this,arguments);
      try{
        if(typeof h!=='string'||!h)return h;
        if(h.indexOf('v84-top-retire')>=0)return h;
        var top='<div class="v84-top-retire">'
          +'<div><b>结束这段生涯</b><span>最终报告会用完整数据生成你的世界线评价</span></div>'
          +'<button onclick="ui.modal={kind:\'retire\'};render()">宣布退役</button>'
          +'</div>';
        /* 插到标题之后（最靠上的位置） */
        var m=h.match(/<h2[^>]*>[^<]*<\/h2>/);
        if(m){
          var at=h.indexOf(m[0])+m[0].length;
          return h.slice(0,at)+top+h.slice(at);
        }
        var sec=h.indexOf('>');
        return sec>=0?h.slice(0,sec+1)+top+h.slice(sec+1):top+h;
      }catch(e){return h}
    };
    window.__v84ArchivePatched=true;
  }
}catch(e){}

/* ==========================================================================
 * 样式
 * ========================================================================== */
try{
  var st84=document.createElement('style');
  st84.id='v84-style';
  st84.textContent=[
    /* 赛季界面右上角退役按钮：小、不抢视觉 */
    '.v84-hud-retire{flex:none;height:24px;padding:0 9px;border-radius:999px;border:1px solid #e6cdb4;',
    'background:#fff8f0;color:#9c6a3c;font-size:8.5px;font-weight:1000;letter-spacing:.02em}',
    '.v84-hud-retire:active{transform:translateY(1px)}',
    /* 生涯数据库顶部退役条 */
    '.v84-top-retire{display:flex;align-items:center;gap:10px;justify-content:space-between;',
    'margin:9px 0 4px;padding:11px 12px;border-radius:16px;background:#fff7ee;border:1px solid #f0dcc6}',
    '.v84-top-retire>div{min-width:0}',
    '.v84-top-retire b{display:block;font-size:11.5px;color:#3b2f26}',
    '.v84-top-retire span{display:block;font-size:7.5px;color:#a08a76;margin-top:2px}',
    '.v84-top-retire button{flex:none;padding:8px 13px;border-radius:999px;border:1px solid #e0a94f;',
    'background:linear-gradient(180deg,#fff3d8,#ffe4b3);color:#8a5a12;font-size:9.5px;font-weight:1000}',
    /* 对比区块 */
    '.v84-cmp{margin-top:10px;padding:12px;border-radius:20px;background:linear-gradient(158deg,#fffaf2,#fff);',
    'border:1px solid #eeddc8;box-shadow:0 8px 22px rgba(120,86,50,.07)}',
    '.v84-cmp header{display:flex;align-items:baseline;gap:7px;margin-bottom:8px;flex-wrap:wrap}',
    '.v84-cmp header small{font-size:7px;color:#b08a58;letter-spacing:.1em}',
    '.v84-cmp header b{font-size:13.5px;color:#3b2f26}',
    '.v84-tier{margin-left:auto;font-size:8.5px;font-weight:1000;padding:3px 9px;border-radius:999px;background:#fff0df;color:#ad6335}',
    '.v84-tier.far-above{background:#ffe0b2;color:#8a4a06}',
    '.v84-tier.above{background:#e8f5e3;color:#2f7a3f}',
    '.v84-tier.same{background:#eef1f6;color:#4c5c73}',
    '.v84-tier.below{background:#f3e9e6;color:#96564a}',
    '.v84-cmp-row{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:7px 0;border-top:1px dashed #f0e2d1}',
    '.v84-cmp-row>small{grid-column:1/-1;font-size:7.5px;color:#a98a63;letter-spacing:.05em}',
    '.v84-cmp-real,.v84-cmp-mine{display:flex;align-items:baseline;gap:5px}',
    '.v84-cmp-real i,.v84-cmp-mine i{font-style:normal;font-size:7px;color:#b3a08c}',
    '.v84-cmp-real b{font-size:10.5px;color:#8b7565;font-weight:700}',
    '.v84-cmp-mine b{font-size:11.5px;color:#bc4438;font-weight:1000}',
    '.v84-cmp-note{margin-top:9px;padding:10px;border-radius:14px;background:#fff8ec;border:1px dashed #e8d2ad}',
    '.v84-cmp-note>b{display:block;font-size:7.5px;color:#b08a58;letter-spacing:.08em;margin-bottom:4px}',
    '.v84-cmp-note p{margin:0;font-size:9px;line-height:1.7;color:#5c4a38}',
    '.v84-real-ending{margin-top:6px !important;font-size:8px !important;color:#9c8b79 !important}'
  ].join('');
  document.head.appendChild(st84);
}catch(e){}

window.__v84Debug={compare:v84Compare,block:v84CompareBlock,real:V84_REAL,
  guards:{retire:!!window.__v84RetirePatched,hud:!!window.__v84HudPatched,archive:!!window.__v84ArchivePatched}};

})();

