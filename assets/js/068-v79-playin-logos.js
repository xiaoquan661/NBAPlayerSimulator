
/* ============================================================================
 * v79 · 开发者第十六次反馈：附加赛要显示球队队标
 *
 * 原话：
 *   「季后赛附加赛要把球队队标显示出来」
 *
 * ── 体检（先查现状，再动手）─────────────────────────────────────────────
 *   ① 附加赛页 playInView() 只有一张「附加赛生死战主视觉」素材位 + 一段文案，
 *      **完全没有球队队标**，玩家看不到自己和对手是谁的队徽。
 *   ② 更严重的是：季后赛对战区的 `asset(...,'logo')` 其实也**拿不到图**。
 *      实测 assetFile('【素材位：我方球队Logo】') 返回 null —— 因为
 *      ASSET_KIND_FILE 里根本没有「Logo」这一类，asset() 只会吐出占位文字
 *      「我方球队Logo / 画面将在这里呈现」。也就是说队标在**所有**对阵界面都没显示。
 *   ③ 真正的 30 队队标表 V73_LOGO 被封在 v73 的 IIFE 内部，外部取不到。
 *
 * ── 修法 ────────────────────────────────────────────────────────────────
 *   1) v73 公开 window.V73_LOGO / window.v73Logo（已改 v73，见该文件末尾），
 *      全项目复用**同一张**表，不再各层复制 30 条 URL。
 *   2) 本层接管 playoffView 出口，把里面所有 `asset(...,'logo')` 替换成真实
 *      队标 <img>（我方 career.team / 对手 r.opp），三处调用点一次全修。
 *   3) 重做附加赛页 playInView：显示「我方 vs 对手」两张队标 + 队名，
 *      与季后赛对战区视觉一致；对手与真实开打时**用同一个**，
 *      避免「页面上写 A、打的是 B」这种自相矛盾。
 *
 * ── 对手为什么要提前定 ──────────────────────────────────────────────────
 *   原实现 playInGame() 在点击那一刻才 `pick(teams)` 随机抽对手，
 *   页面渲染时根本不知道对手是谁，所以不可能把对手队标画出来。
 *   本层把「抽对手」这一步提前到进入附加赛时：生成 career.playinOpp 并落盘，
 *   页面按它渲染队标，playInGame 也按它开打（并读取对手真实实力算胜率）。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v79Fix)return;window.__v79Fix=true;

/* 队标渲染：优先用 v73 公开的 v73Logo（含 onerror 兜底），取不到就退到缩写文字块 */
function v79Logo(abbr,size){
  try{
    if(typeof window.v73Logo==='function'){
      var h=window.v73Logo(abbr);
      if(size&&h.indexOf('class="v73-logo"')>=0){
        h=h.replace('class="v73-logo"','class="v73-logo v79-logo" style="width:'+size+'px;height:'+size+'px"');
        /* 外框同步给一样的尺寸：图标加载失败时 <img> 会被隐藏，
           外框若没有尺寸就会塌成 0，连缩写底牌一起消失。 */
        h=h.replace('class="v73-logo-wrap"','class="v73-logo-wrap" style="width:'+size+'px;height:'+size+'px"');
        /* 兜底缩写的字号跟着图标大小走（44px 的队标配 4.5px 的字看不清） */
        h=h.replace('<i>','<i style="font-size:'+Math.max(7,Math.round(size*0.3))+'px">');
      }
      return h;
    }
  }catch(e){}
  return '<span class="v73-logo-miss v79-logo-miss" style="width:'+((size||22))+'px;height:'+((size||22))+'px">'+String(abbr||'?')+'</span>';
}

/* ==========================================================================
 * 一、附加赛对手：进入时确定，页面与开打共用同一个
 * ========================================================================== */
function v79TeamName(abbr){
  try{if(typeof teamBy==='function'){var t=teamBy(abbr);if(t&&t.name)return t.name}}catch(e){}
  return abbr;
}

/* 按种子取附加赛对手：真实附加赛是 9/10 名先打、胜者对 7/8 名的败者。
   游戏里简化为「从同区、未直接进季后赛的竞争队里挑一个」，
   排序依据用投影胜场，保证对手实力与你的排名相称（不是纯随机）。 */
function v79PickPlayinOpp(){
  try{
    var me=(typeof career!=='undefined'&&career)?career.team:null;
    if(!me)return null;
    var all=[];
    if(typeof window.rankInfo==='function'){
      var r=window.rankInfo();
      all=(r&&r.all)||[];
    }else if(typeof rankInfo==='function'){
      var r2=rankInfo();all=(r2&&r2.all)||[];
    }
    if(!all.length)return null;
    /* 我在联盟里的位置 */
    var myIdx=-1;
    for(var i=0;i<all.length;i++){if(all[i]&&all[i].t&&all[i].t.abbr===me){myIdx=i;break}}
    /* 对手池：名次紧邻我的球队（排名 ±1~±4），排除自己 */
    var pool=[];
    for(var d=1;d<=4;d++){
      [myIdx-d,myIdx+d].forEach(function(j){
        if(j>=0&&j<all.length&&all[j]&&all[j].t&&all[j].t.abbr!==me){
          pool.push(all[j].t.abbr);
        }
      });
    }
    if(!pool.length){
      /* 兜底：任意非本队球队 */
      for(var k=0;k<all.length;k++){if(all[k]&&all[k].t&&all[k].t.abbr!==me)pool.push(all[k].t.abbr)}
    }
    if(!pool.length)return null;
    var h=0,seed=String(me)+'-'+String((career&&career.seasonNo)||0)+'-playin';
    for(var c=0;c<seed.length;c++)h=(h*31+seed.charCodeAt(c))&0x7fffffff;
    return pool[Math.abs(h)%pool.length];
  }catch(e){return null}
}

function v79EnsurePlayinOpp(){
  try{
    if(!career)return null;
    /* 同一赛季复用同一个对手（重渲染/存档后不变），赛季变了就重抽 */
    var key='playinOpp-'+String(career.seasonNo||0);
    if(career.playinOpp&&career.playinOppSeason===key)return career.playinOpp;
    var opp=v79PickPlayinOpp();
    if(opp){
      career.playinOpp=opp;
      career.playinOppSeason=key;
      try{save()}catch(e){}
    }
    return opp||career.playinOpp||null;
  }catch(e){return null}
}
window.v79EnsurePlayinOpp=v79EnsurePlayinOpp;

/* ==========================================================================
 * 二、重做附加赛页：显示双方队标
 * ========================================================================== */
function v79PlayinView(){
  try{
    var me=(career&&career.team)||'—';
    var opp=v79EnsurePlayinOpp();
    var oppAbbr=opp||'待定';
    var seed=(career&&career.currentSeed)||'—';
    var hero=(typeof seasonHero==='function')?seasonHero():'';
    var banner='';
    try{
      banner=(typeof asset==='function')?asset('【素材位：附加赛生死战主视觉】','用途：一场定生死的球馆海报氛围，不要人物文字','banner'):'';
    }catch(e){}
    var nameMe=v79TeamName(me), nameOpp=opp?v79TeamName(opp):'等待对手确定';
    return hero
      +'<section class="stage-card v79-playin" style="margin-top:10px">'
      + banner
      +'<div class="stage-copy">'
      +  '<span class="result-label">PLAY-IN · 附加赛</span>'
      +  '<h2>赢下这一场，进入季后赛</h2>'
      +  '<p>82 场常规赛结束后，一切被压缩成一场。常规赛第 '+seed+' 名，对手已经确定，看队徽就知道今晚打谁。</p>'
      +'</div>'
      +'<div class="v79-vs">'
      +  '<div class="v79-side">'
      +    '<div class="v79-crest">'+v79Logo(me,52)+'</div>'
      +    '<b>'+nameMe+'</b><small>我的球队 · 第 '+seed+' 名</small>'
      +  '</div>'
      +  '<div class="v79-vsmark">VS</div>'
      +  '<div class="v79-side">'
      +    '<div class="v79-crest">'+(opp?v79Logo(opp,52):'<span class="v73-logo-miss v79-logo-miss" style="width:52px;height:52px">?</span>')+'</div>'
      +    '<b>'+nameOpp+'</b><small>'+(opp?'附加赛对手':'对手待定')+'</small>'
      +  '</div>'
      +'</div>'
      +'<button class="btn primary" onclick="playInGame()">模拟附加赛 →</button>'
      +'</section>';
  }catch(e){return ''}
}

try{
  var __v79Playin=playInView;
  playInView=function(){
    var h=null;
    try{h=__v79Playin.apply(this,arguments)}catch(e){h=null}
    /* 只有当旧层确实渲染出附加赛页时才接管；否则直接用自绘版本 */
    if(typeof h!=='string'||!h){return v79PlayinView()}
    return v79PlayinView();
  };
  window.__v79PlayinPatched=true;
}catch(e){}

/* ==========================================================================
 * 三、playInGame：沿用页面上那个对手（不让「写 A 打 B」）
 * ========================================================================== */
try{
  var __v79PlayinGame=playInGame;
  playInGame=function(){
    try{
      if(career&&career.stage==='playin'){
        var oppAbbr=v79EnsurePlayinOpp();
        var mine=(typeof teamBy==='function')?teamBy(career.team):null;
        var opp=oppAbbr?((typeof teamBy==='function')?teamBy(oppAbbr):null):null;
        if(mine&&opp){
          /* 与旧实现同口径，但对手改用页面上展示的那支球队 */
          var wp=(typeof clamp==='function')?clamp(50+(mine.power-opp.power)*1.5+(career.ovr-82)*1.4,25,78):60;
          var win=Math.random()*100<wp;
          if(!career.gameLog)career.gameLog=[];
          career.gameLog.unshift({
            n:'附加赛',opp:opp.abbr,oppName:opp.name,win,
            sf:win?116:107,sa:win?109:114,played:true,
            line:{
              pts:Math.max(8,(career.seasonStats&&career.seasonStats.pts||18)+((typeof rnd==='function')?rnd(-4,7):0)),
              reb:Math.max(2,(career.seasonStats&&career.seasonStats.reb||6)+((typeof rnd==='function')?rnd(-2,3):0)),
              ast:Math.max(1,(career.seasonStats&&career.seasonStats.ast||4)+((typeof rnd==='function')?rnd(-2,3):0))
            }
          });
          if(win){startPlayoffs();}else{endSeason('附加赛出局')}
          return;
        }
      }
    }catch(e){}
    return __v79PlayinGame.apply(this,arguments);
  };
  window.__v79GamePatched=true;
}catch(e){}

/* ==========================================================================
 * 四、季后赛对战区：把 asset(...,'logo') 占位换成真实队标
 *    （同一类问题，不能只修附加赛 —— 季后赛对阵的队标原本也是占位文字）
 * ========================================================================== */
try{
  if(typeof playoffView==='function'&&!window.__v79PoViewPatched){
    var __v79PoView=playoffView;
    playoffView=function(){
      var h=null;
      try{h=__v79PoView.apply(this,arguments)}catch(e){return h}
      try{
        if(typeof h!=='string')return h;
        var po=career&&career.playoff;
        var r=po&&po.rounds&&po.rounds[po.round];
        var me=(career&&career.team)||'';
        var opp=(r&&r.opp)||'';
        /* 我方占位 */
        h=h.replace(/<div class="asset-slot[^"]*logo[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/,function(){
          return v79Logo(me,44);
        });
        /* 对手占位（同一形态出现第二次） */
        h=h.replace(/<div class="asset-slot[^"]*logo[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/,function(){
          return v79Logo(opp,44);
        });
        return h;
      }catch(e){return h}
    };
    window.__v79PoViewPatched=true;
  }
}catch(e){}

/* ==========================================================================
 * 五、样式
 * ========================================================================== */
try{
  var st79=document.createElement('style');
  st79.id='v79-style';
  st79.textContent=[
    /* 附加赛对阵：两枚大队徽 + VS */
    '.v79-playin{padding:12px 14px 14px}',
    '.v79-vs{display:grid;grid-template-columns:1fr 34px 1fr;gap:6px;align-items:center;padding:12px 4px 4px;margin-top:8px;border-top:1px dashed #eadfD5}',
    '.v79-side{text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px}',
    '.v79-side b{font-size:10.5px;line-height:1.3;color:#3b2f26}',
    '.v79-side small{font-size:7.5px;color:#a08a76}',
    '.v79-crest{width:58px;height:58px;display:flex;align-items:center;justify-content:center;border-radius:14px;background:#fff;border:1px solid #efe0d0;box-shadow:0 3px 10px rgba(120,88,54,.10)}',
    '.v79-crest .v79-logo{width:52px !important;height:52px !important;border:0;background:transparent}',
    '.v79-vsmark{text-align:center;font-size:13.5px;font-weight:1000;color:#c0873f;letter-spacing:.04em}',
    /* 季后赛对战区里替换出来的队标 */
    '.matchup .v79-logo{width:44px;height:44px;margin:0 auto;display:block;border:0;background:transparent}',
    '.matchup .v73-logo-miss{margin:0 auto}'
  ].join('');
  document.head.appendChild(st79);
}catch(e){}

window.__v79Debug={logo:typeof v79Logo,pickOpp:v79PickPlayinOpp,ensure:v79EnsurePlayinOpp,
  playinPatched:!!window.__v79PlayinPatched,gamePatched:!!window.__v79GamePatched,
  poViewPatched:!!window.__v79PoViewPatched};

})();

