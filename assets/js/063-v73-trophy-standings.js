
/* ============================================================================
 * v73 · 开发者第六轮反馈
 *
 * ① 奖杯体验（姚明满配无冠）根因实测：
 *    v62Calibrate 在每季 nextSeason/beginSeason/load 时把球队 power 无条件
 *    标回时代基准值（HOU=72），v56 球星加盟加成（麦迪 +9）被冲掉；
 *    满配姚明 8 号种子每轮撞 93 分的湖人，四轮连过概率≈0 → 十几个赛季 0 冠。
 *    修法：calibrate 后重放已加盟球星的加成（career.v56Joined 里有记录）。
 *
 * ② 赛季页「投影」球队卡：开发者要求去掉（v26RankPanel），改为在用户数据
 *    下方加「东西部动态战绩排名」，球队头像用开发者提供的表格里的虎扑官方 logo。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v73Fix)return;window.__v73Fix=true;

/* --------------------------------------------------------------------------
 * 一、姚明无冠：球星加成持久化
 * -------------------------------------------------------------------------- */
var V73_JOINS={
  yao:{zh:'特雷西·麦克格雷迪',en:'Tracy McGrady',ovr:95},
  bennett:{zh:'勒布朗·詹姆斯',en:'LeBron James',ovr:97},
  fultz:{zh:'吉米·巴特勒',en:'Jimmy Butler',ovr:90}
};

/* 按当前已加盟名单重放「球星效应」加成（与 v56BoostPower 同口径）
   【核心补充】把「玩家自己」计入名单：原实现的联盟名单里有一个 73 OVR 的
   NPC「姚明」，而玩家的真实 OVR（可能已练到 95+）完全没有参与球队实力计算
   ——满配姚明带着 73 分的自己+70 的队友打球，结构性无冠。 */
function v73ReplayStarBoost(){
  try{
    if(!career)return;
    var t=(typeof teamBy==='function')?teamBy(career.team):null;
    if(!t)return;
    /* 1) 把名单里的同名 NPC 换成玩家的真实 OVR（姚明→姚明） */
    var myZh='';
    try{myZh=(typeof currentP==='function'&&currentP())?currentP().zh:''}catch(e){}
    var myOvr=Number(career.ovr)||80;
    var L=(career.v32League&&career.v32League.players)||[];
    if(myZh&&L.length){
      var me=L.find(function(p){return p&&(p.zh===myZh||p.name===myZh)&&p.team===career.team});
      if(me&&Math.abs((Number(me.ovr)||0)-myOvr)>1){
        me.ovr=myOvr;                 /* 名单里的我就是我 */
      }
      /* 若名单里没有我（被交易等），作为核心补进去 */
      if(!me){
        L.push({name:myZh,zh:myZh,team:career.team,age:career.age||24,
                potential:myOvr,ovr:myOvr,retired:false});
      }
    }
    /* 2) 重算球队实力（v32 口径：前 9 人平均 ×0.92 + 8） */
    var byTeam={};
    L.forEach(function(p){
      (byTeam[p.team]=byTeam[p.team]||[]).push(Number(p.ovr)||70);
    });
    var arr=((byTeam[t.abbr])||[]).slice().sort(function(a,b){return b-a}).slice(0,9);
    if(!arr.length)return;
    var avg=arr.reduce(function(a,b){return a+b},0)/arr.length;
    var base=Math.round(avg*0.92+8);
    /* 3) 巨星效应（真实篮球：一个 95 的巨星不是 1/9 张票，是建队核心）。
       按名单里每个 ≥88 OVR 球星超出队伍平均的部分给加成，封顶每人 +7：
       满配（95 姚明 + 95 麦迪，队友 70 档）→ base 78 + 7 + 7 ≈ 92（联盟 1~2 种子档）
       半配（85 玩家）→ ≈ 82~84（季后赛档）；不解锁（80）→ 72~78（附加赛档） */
    var want=base;
    arr.slice(0,3).forEach(function(o){          /* 只算前三核心 */
      if(o>=88)want+=Math.min(7,Math.round((o-avg)*0.42));
    });
    /* 4) 已加盟球星效应（若其 ovr 已含在名单里，这里只补一次身份加成） */
    try{
      if(career.v56Joined){
        Object.keys(career.v56Joined).forEach(function(zh){
          if(!career.v56Joined[zh])return;
          var starOvr=0;
          L.forEach(function(p){if((p.zh===zh||p.name===zh)&&p.team===t.abbr)starOvr=Math.max(starOvr,Number(p.ovr)||0)});
          if(starOvr>=88)want+=2;              /* 加盟球星的更衣室/体系加成 */
        });
      }
    }catch(e){}
    want=Math.max(60,Math.min(99,want));
    if(want>Number(t.power))t.power=want;
  }catch(e){}
}

/* 包住 v62Calibrate：每次标回基准后立即重放球星加成。
   注意：这只对「之后新注册的调用点」有效——v62 自己的 nextSeason/beginSeason/load
   包装在本层之前注册，闭包里存的是原始引用，内层调用绕过这里。
   所以再对 nextSeason/beginSeason/load/startPlayoffs 各挂一层外层兜底：
   这些函数执行完所有内层包装后返回，此处重放必然是最后一步。 */
try{
  if(typeof v62Calibrate==='function'&&!window.__v73CalibGuard){
    var __v73Calib=v62Calibrate;
    v62Calibrate=function(){
      var r=__v73Calib.apply(this,arguments);
      try{v73ReplayStarBoost()}catch(e){}
      return r;
    };
    window.__v73CalibGuard=true;
  }
}catch(e){}

/* 最外层兜底：这些函数在执行完所有内层包装后调用，此处重放必然是最后一步。
   注意：不能用 eval（安全门禁 SR-004 禁止动态执行），
   每个函数显式包装；vm 环境下 window 属性赋值即可覆盖同名绑定。 */
function v73GuardFn(name,getCurrent){
  try{
    var orig=getCurrent();
    if(typeof orig!=='function')return;
    var wrapped=function(){
      var r=orig.apply(this,arguments);
      try{v73ReplayStarBoost()}catch(e){}
      return r;
    };
    window[name]=wrapped;
  }catch(e){}
}
v73GuardFn('nextSeason',function(){return (typeof nextSeason==='function')?nextSeason:window.nextSeason});
v73GuardFn('beginSeason',function(){return (typeof beginSeason==='function')?beginSeason:window.beginSeason});
v73GuardFn('startPlayoffs',function(){return (typeof startPlayoffs==='function')?startPlayoffs:window.startPlayoffs});
v73GuardFn('load',function(){return (typeof load==='function')?load:window.load});

/* ==========================================================================
 * 三、冠军落账防御层
 *
 * 实测：总决赛赢下后，advancePlayoffStage 的冠军分支（启动 FMVP 仪式）
 * 会被更早注册的 v217 剧情层抢占——tryCore('playoff_round_end') 命中时直接
 * return，仪式不启动、冠军不落账。10 个冠军级赛季里约 6 个被这样吞掉。
 *
 * 【修复方式必须是「补跑仪式」，绝不能「直接结算」】
 *   第一版我图省事，在守卫里直接把冠军落账并调用 endSeason('NBA总冠军')，
 *   结果跳过了 FMVP 投票动画——玩家刚模拟完总决赛，还没看到 FMVP 得主，
 *   赛季就结束了，下一届世界杯的征召弹窗抢先冒出来（开发者实测反馈）。
 *   正确做法：守卫只负责把**本该执行的仪式补启动**（与 v218 的行为一致），
 *   由仪式自己的按钮走 finishFmvpCeremony → 落账 → endSeason，
 *   这样动画顺序和提示时机都跟正常路径完全一样。
 * ========================================================================== */
try{
  if(typeof advancePlayoffStage==='function'&&!window.__v73ChampGuard){
    var __v73Adv=advancePlayoffStage;
    advancePlayoffStage=function(){
      var r=__v73Adv.apply(this,arguments);
      try{
        var po=(typeof career!=='undefined'&&career&&career.playoff)||null;
        var rv=po&&po.review;
        /* 只做一件事：内层被剧情抢占了冠军分支（review 还在、仪式没起）
           → 把仪式补启动，让流程回到与正常路径完全一致的状态。
           绝不在这里直接落账/endSeason：那会跳过 FMVP 动画，
           让下一届世界杯的征召弹窗抢在颁奖前面（开发者实测反馈）。 */
        if(rv&&rv.won&&rv.championship&&rv.round===3&&!career.fmvpCeremony){
          if(typeof window.startFmvpCeremony==='function'){
            window.startFmvpCeremony();
          }
        }
      }catch(e){}
      return r;
    };
    window.__v73ChampGuard=true;
  }
}catch(e){}

/* --------------------------------------------------------------------------
 * 二、赛季页：去掉「投影」球队卡，在用户数据下方加东西部动态排名
 *    球队头像用开发者提供的表格（虎扑官方 logo）。
 * -------------------------------------------------------------------------- */
/* 队徽已本地化：assets/logos/<ABBR>.png（素材来自用户提供的「NBA 队徽（新版）」），
   不再外链虎扑图床——外链在本地与 Lamps 平台环境都加载不到。 */
var V73_LOGO={"ATL":"assets/logos/ATL.png","BOS":"assets/logos/BOS.png","BKN":"assets/logos/BKN.png","CHA":"assets/logos/CHA.png","CHI":"assets/logos/CHI.png","CLE":"assets/logos/CLE.png","DAL":"assets/logos/DAL.png","DEN":"assets/logos/DEN.png","DET":"assets/logos/DET.png","GSW":"assets/logos/GSW.png","HOU":"assets/logos/HOU.png","IND":"assets/logos/IND.png","LAC":"assets/logos/LAC.png","LAL":"assets/logos/LAL.png","MEM":"assets/logos/MEM.png","MIA":"assets/logos/MIA.png","MIL":"assets/logos/MIL.png","MIN":"assets/logos/MIN.png","NOP":"assets/logos/NOP.png","NYK":"assets/logos/NYK.png","OKC":"assets/logos/OKC.png","ORL":"assets/logos/ORL.png","PHI":"assets/logos/PHI.png","PHX":"assets/logos/PHX.png","POR":"assets/logos/POR.png","SAC":"assets/logos/SAC.png","SAS":"assets/logos/SAS.png","TOR":"assets/logos/TOR.png","UTA":"assets/logos/UTA.png","WAS":"assets/logos/WAS.png"};
/* 连续模拟每场都会重建赛季页。第一次画榜单时把队徽解码进缓存，
   避免之后新 <img> 在绘制时先闪出一排空白/白底方块。 */
var V73_LOGO_CACHE={},V73_LOGO_CACHE_READY=false;
function v73WarmLogos(){
  if(V73_LOGO_CACHE_READY)return;
  V73_LOGO_CACHE_READY=true;
  try{Object.keys(V73_LOGO).forEach(function(k){var im=new Image();im.decoding='sync';im.src=V73_LOGO[k];V73_LOGO_CACHE[k]=im})}catch(e){}
}
window.__v73LogoCache=V73_LOGO_CACHE;

/* 东/西部划分（与表格 conference 对应） */
var V73_EAST=['ATL','BOS','BKN','CHA','CHI','CLE','DET','IND','MIA','MIL','NYK','ORL','PHI','TOR','WAS'];
var V73_WEST=['DAL','DEN','GSW','HOU','LAC','LAL','MEM','MIN','NOP','OKC','PHX','POR','SAC','SAS','UTA'];

function v73Logo(abbr){
  v73WarmLogos();
  var u=V73_LOGO[abbr];
  /* 活动页在虎扑容器里是 https：http 图会被按「混合内容」直接拦掉（实测全部裂图）。
     统一升到 https；外面再套一层缩写底牌，图真挂掉时仍能看到球队标识。 */
  if(u&&u.indexOf('http://')===0)u='https://'+u.slice(7);
  if(!u)return '<span class="v73-logo v73-logo-miss">'+abbr+'</span>';
  return '<span class="v73-logo-wrap"><i>'+abbr+'</i><img class="v73-logo" src="'+u+'" alt="'+abbr+'" loading="eager" decoding="sync" onerror="this.style.display=\'none\'"></span>';
}

/* 非玩家球队的 projectedWins 是「整季投影」—— 一个赛季里一场都不变，
   所以榜上写着「实时战绩」，实际只有玩家自己那支队在动（实测）。
   这里把 82 场投影按已打场次摊到当前进度，再叠一个与
   (球队, 赛季, 场次) 绑定的确定性抖动来模拟赛程起伏；
   打到 82 场时正好回到投影值，与联盟页口径一致。
   玩家自己那支队沿用真实战绩（projectedWins 已按真实胜率处理）。 */
function v73LiveWins(t,g){
  var full=0;
  try{full=Number(projectedWins(t))||0}catch(e){return 0}
  if(!g)return full;
  var prog=Math.max(0,Math.min(1,g/82)),play=Math.round(full*prog);
  var seed=(typeof stableHash==='function')?stableHash(t.abbr+'|'+((typeof career!=='undefined'&&career)?career.seasonNo:0)+'|'+g):0;
  var wave=(seed%11)-5;
  wave=Math.round(wave*Math.min(1,prog*2));          /* 开局振幅收小 */
  var span=Math.max(2,Math.round(g*.06));
  return Math.max(Math.max(0,play-span),Math.min(Math.min(g,play+span),play+wave));
}

/* 东西部动态排名（基于 rankInfo().all 的实时投影胜场） */
function v73ConfBoard(){
  try{
    if(typeof rankInfo!=='function')return '';
    var all=rankInfo().all||[];
    var g=(typeof career!=='undefined'&&career)?(Number(career.games)||0):0;
    var myW=(typeof career!=='undefined'&&career)?(Number(career.wins)||0):0;
    function isMe(t){return !!(typeof career!=='undefined'&&career&&t.abbr===career.team)}
    /* 赛季没开打时一律显示整季投影；开打后一律显示「当前胜场」。
       绝不能一边放 82 场投影、一边放当前胜场 —— 两个量纲混在一张榜里，
       表现就是「我 15 胜却排在 19 胜的队前面」（实测）。 */
    function winsOf(t,proj){ return g>0 ? (isMe(t)?myW:proj) : proj; }
    function confList(confs){
      return all.filter(function(x){return confs.indexOf(x.t.abbr)>=0})
        .map(function(x){return{t:x.t,w:winsOf(x.t,isMe(x.t)?x.w:v73LiveWins(x.t,g))}})
        .sort(function(a,b){return (b.w-a.w)||String(a.t.abbr).localeCompare(String(b.t.abbr))});
    }
    function rows(list){
      return list.map(function(x,i){
        var me=isMe(x.t);
        return '<div class="v73-row'+(me?' me':'')+'"><i>'+(i+1)+'</i>'+v73Logo(x.t.abbr)+'<b>'+x.t.name+'</b><span>'+x.w+'</span></div>';
      }).join('');
    }
    var east=confList(V73_EAST),west=confList(V73_WEST);
    return '<section class="v73-conf"><div class="v73-conf-cols">'
      +'<div class="v73-col"><header><small>东部 · 实时战绩</small></header>'+rows(east)+'</div>'
      +'<div class="v73-col"><header><small>西部 · 实时战绩</small></header>'+rows(west)+'</div>'
      +'</div></section>';
  }catch(e){return ''}
}

/* 包装最终层的 regularView：
   ① 摘掉 v26RankPanel（球队卡，含「投影」字样）
   ② 在「本赛季个人数据」卡片（v26-statbox 第一块）之后插入东西部排名 */
try{
  if(typeof regularView==='function'&&!window.__v73RvGuard){
    var __v73Rv=regularView;
    regularView=function(){
      var h=__v73Rv.apply(this,arguments);
      try{
        if(typeof h!=='string')return h;
        /* ① 摘掉 v26 球队卡（整块，含「投影」） */
        h=h.replace(/<section class="v26-team-card">[\s\S]*?<\/section>\s*/,'');
        /* 摘掉残留的 rank-mini（若有） */
        h=h.replace(/<div class="v26-rank-context">[\s\S]*?<\/div>\s*/,'');
        /* ② 找第一个 v26-statbox 的闭合（= 本赛季个人数据卡之后），插入排名 */
        var marker='</section>';
        var first=h.indexOf('<section class="v26-statbox"');
        if(first<0)first=h.indexOf('<section class="v26-statbox\'');
        if(first>=0){
          /* 从 first 开始配平找该 section 的闭合 */
          var depth=0,i=first,done=-1;
          while(i<h.length){
            if(h.slice(i,i+8)==='<section')depth++;
            else if(h.slice(i,i+9)==='</section'){
              depth--;
              if(depth===0){
                /* 必须含结束标签的 '>' —— 原写法 done=i+9 停在 '>' 之前，
                   插入后变成「</section + \n + <section class="v73-conf">」，
                   浏览器把 </section\n<section class="v73-conf"> 解析成同一个结束标签，
                   v73-conf 的开标签被整段吃掉、榜单卡片样式全部失效（实测）。 */
                var gt=h.indexOf('>',i);
                done=(gt>=0?gt+1:i+9);
                break;
              }
            }
            i++;
          }
          if(done>0){
            h=h.slice(0,done)+'\n'+v73ConfBoard()+h.slice(done);
          }
        }else{
          /* 找不到锚点就追加在 MVP 榜后（保持可见） */
          h=h+v73ConfBoard();
        }
      }catch(e){}
      return h;
    };
    window.__v73RvGuard=true;
  }
}catch(e){}

/* 样式 */
try{
  if(typeof document!=='undefined'&&document.createElement&&!document.getElementById('v73-style')){
    var st=document.createElement('style');
    st.id='v73-style';
    st.textContent=[
      '.v73-conf{margin:9px 0}',
      '.v73-conf-cols{display:grid;grid-template-columns:1fr 1fr;gap:7px}',
      '.v73-col{background:#fff;border:1px solid #eadfd4;border-radius:16px;padding:8px}',
      '.v73-col header{margin-bottom:5px}',
      '.v73-col header small{font-size:8.5px;font-weight:1000;color:#a48b78;letter-spacing:.06em}',
      '.v73-row{display:flex;align-items:center;gap:6px;padding:3px 4px;border-radius:9px;font-size:9.5px}',
      '.v73-row i{width:14px;color:#b7a494;font-style:normal;font-weight:1000;text-align:center;flex:none;font-size:9px}',
      '.v73-row b{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:9.5px;font-weight:700;color:#4d4036}',
      '.v73-row span{flex:none;font-weight:1000;color:#6d5c50;font-size:10px}',
      '.v73-row.me{background:#fff0e8;outline:1px solid #f0c7b9}',
      '.v73-row.me b{color:#b3543e;font-weight:1000}',
      '.v73-logo{width:14px;height:14px;flex:none;object-fit:contain;border-radius:3px;background:#fff;border:0.5px solid #eee0d4;backface-visibility:hidden;transform:translateZ(0);transition:none!important;animation:none!important}',
      '.v73-logo-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center;flex:none;line-height:0;vertical-align:middle;min-width:14px;min-height:14px;contain:layout paint;backface-visibility:hidden}',
      '.v73-logo-wrap>i{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#f4ece3;border-radius:3px;font-size:6px;font-style:normal;color:#8b7565;font-weight:1000}',
      /* 图片保持「在流内」→ 外框尺寸跟着图片走。
         写死宽高会被调用方（v79 用行内样式放大到 44×44）顶破，
         图标溢出后正好压住下面的队名（实测季后赛就是这样）。 */
      '.v73-logo-wrap>img{position:relative;z-index:1;display:block;width:14px;height:14px;object-fit:contain}',
      '.v73-logo-miss{width:14px;height:14px;flex:none;display:inline-flex;align-items:center;justify-content:center;background:#f4ece3;border-radius:3px;font-size:6.5px;color:#8b7565;font-weight:1000}'
    ].join('');
    document.head.appendChild(st);
  }
}catch(e){}

window.__v73Debug={replay:v73ReplayStarBoost,board:v73ConfBoard,logos:Object.keys(V73_LOGO).length};

/* 对外公开队标能力：HUD、季后赛对阵、附加赛对阵都必须用同一张表，
   否则各层只能各自复制一份 30 队 URL（v79 层由此复用，避免第二份数据）。 */
try{
  window.V73_LOGO=V73_LOGO;
  window.v73Logo=v73Logo;
  window.V73_EAST=V73_EAST;
  window.V73_WEST=V73_WEST;
}catch(e){}

})();

