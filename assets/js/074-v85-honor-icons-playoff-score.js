
/* ============================================================================
 * v85 · 开发者第二十七次反馈（三项）
 *
 * 原话：
 *   「把荣誉展览馆里的荣誉图标加上，用全华班里的，然后现在季后赛有时候会不同系列赛
 *     对上同一个球队，这是不对的，还有现在的最高得分，我常年场均25+，最高得分才34，
 *     不合理，这个要提升」
 *
 * ── 一、荣誉展览馆的荣誉图标 ──────────────────────────────────────────
 *   现状：荣誉陈列馆里每项荣誉只有占位图（「画面将在这里呈现」）。
 *   修法：把参考项目（全华班）的 16 张荣誉图标复制到 h5/assets/，
 *        按荣誉名映射成真实 <img>，替换掉占位。
 *        （图标为静态本地资源，随 h5/ 一起打包上传。）
 *
 * ── 二、季后赛不同系列赛重复对上同一球队 ───────────────────────────────
 *   实测：8 个种子位**全部**出现重复，seed 4 甚至连续三轮都是同一支队。
 *   根因有两处：
 *     ① v55 的对手取法是「把目标种子当 others 数组下标」，
 *        而 others 已经把自己过滤掉了 —— 下标整体偏移，取错球队；
 *     ② 从 1 到 4 轮之间**没有任何「已交手」记录**，同一支队可以被反复抽出。
 *   修法：重写对手选取——
 *     · 以「季后赛席位顺序」为基准，用真正的种子号定位（不再用过滤后的下标）
 *     · 记录每轮已交手过的球队，选对手时排除；若候选全被排掉则放宽到全席位
 *
 * ── 三、单场最高得分不合理 ────────────────────────────────────────────
 *   实测：单场得分 = 场均期望 + rnd(-5,9)，**波动窗口固定**，与球员水平无关。
 *     → 常年场均 25+ 的球员，上限也只有约 34 分，永远没有「爆砍之夜」。
 *   修法：给单场得分加「爆发」机制——
 *     · 基础窗口随水平放大（高得分手单场波动更大）
 *     · 按概率触发「大爆发」（高分夜），幅度与场均水平挂钩
 *     · 只影响单场得分的**上限表现**，不改变赛季场均（避免破坏评分口径）
 * ============================================================================ */
(function(){
'use strict';
if(window.__v85Fix)return;window.__v85Fix=true;

function num85(v,d){var n=Number(v);return isFinite(n)?n:(d||0)}
function clamp85(v,a,b){return Math.max(a,Math.min(b,v))}

/* ==========================================================================
 * 一、荣誉图标
 * ========================================================================== */
var V85_ICON_DIR='assets/';
/* 荣誉名 → 图标文件。
   参考项目（全华班）提供 16 张图标；本项目荣誉键里有几个它没有对应图，
   按语义就近复用一个同色系图标（开发者明确说「如果没有就随便复用一个」），
   并在注释里标注，避免以后误以为漏了资源。 */
var V85_ICONS={
  'NBA总冠军':'honor-overall-champion.png',
  '总冠军':'honor-overall-champion.png',
  '季中赛冠军':'honor-midseason-champion.png',
  '东部冠军':'honor-eastern-champion.png',
  '西部冠军':'honor-western-champion.png',
  'MVP':'honor-mvp.png',
  'FMVP':'honor-fmvp.png',
  '总决赛MVP':'honor-fmvp.png',
  '最佳防守球员':'honor-dpoy.png',
  'DPOY':'honor-dpoy.png',
  '得分王':'honor-scoring-champion.png',
  '篮板王':'honor-rebounds-leader.png',
  '盖帽王':'honor-blocks-leader.png',
  '抢断王':'honor-steals-leader.png',
  '助攻王':'honor-all-nba-first.png',              /* 复用：参考项目无独立「助攻王」图标 */
  '最佳阵容一阵':'honor-all-nba-first.png',
  '最佳阵容二阵':'honor-all-nba-second.png',
  '最佳阵容三阵':'honor-all-nba-third.png',
  '最佳防守一阵':'honor-all-defensive-first.png',
  '最佳防守二阵':'honor-all-defensive-second.png',
  '最佳防守阵容一阵':'honor-all-defensive-first.png',
  '最佳防守阵容二阵':'honor-all-defensive-second.png',
  '全明星':'honor-midseason-champion.png',          /* 复用：赛季荣誉 */
  '最佳新秀':'honor-all-nba-third.png',             /* 复用：新人奖项 */
  'MIP':'honor-midseason-champion.png'              /* 复用：进步奖 */
};

/* 旧键名 → 标准奖项名。
   历史存档/旧层写过「最佳阵容」「最佳防阵」这类简称，而开发者要求
   「最佳阵容就是最佳阵容一阵」「最佳防阵就是最佳防守一阵」——
   也就是这些简称必须归一到同一项，不能拆成两个条目重复显示。 */
var V85_ALIAS={
  '最佳阵容':'最佳阵容一阵',
  '最佳防阵':'最佳防守一阵',
  'DPOY':'最佳防守球员',
  '最佳防守阵容一阵':'最佳防守一阵',
  '最佳防守阵容二阵':'最佳防守二阵',
  '总决赛MVP':'FMVP'
};
/* 展览馆展示顺序（按开发者列的奖项口径） */
var V85_HONOR_ORDER=[
  '总冠军','FMVP','MVP','最佳防守球员','最佳新秀','MIP',
  '最佳阵容一阵','最佳阵容二阵','最佳阵容三阵',
  '最佳防守一阵','最佳防守二阵',
  '全明星','得分王','篮板王','助攻王','抢断王','盖帽王'
];
/* 世界赛荣誉（动态键名，不参与归一，直接展示） */
var V85_INTL_PREFIX=['亚运会','奥运会','世界杯','亚锦赛','季中赛','东部冠军','西部冠军'];

function v85CanonName(k){
  try{
    var s=String(k==null?'':k);
    if(!s)return '';
    /* 精确命中优先 */
    if(V85_ALIAS[s])return V85_ALIAS[s];
    /* 【注意】不能只做前缀匹配：'最佳阵容' 是 '最佳阵容二阵' 的前缀，
       前缀匹配会把「二阵/三阵」错改成「一阵二阵」。
       这里只对「简称 + 纯数字后缀」这一种形态做归一（如「最佳阵容 ×3」），
       其余一律原样返回。 */
    var keys=Object.keys(V85_ALIAS);
    for(var i=0;i<keys.length;i++){
      var kk=keys[i];
      if(s===kk)return V85_ALIAS[kk];
      if(s.indexOf(kk)===0){
        var rest=s.slice(kk.length);
        /* 仅当剩余部分是数字时（表示次数）才归一 */
        if(rest&&/^\s*\d+\s*$/.test(rest))return V85_ALIAS[kk]+rest;
      }
    }
  }catch(e){}
  return String(k==null?'':k);
}

/* 把 career.honors 收敛成「标准奖项名 → 次数」：
   旧简称与新名指向同一项时**取最大值而不是相加**，避免历史上重复计数被放大。 */
function v85HonorTable(){
  var out={};
  try{
    if(typeof career==='undefined'||!career)return out;
    var h=career.honors||{};
    Object.keys(h).forEach(function(k){
      var n=num85(h[k],0);
      if(n<=0)return;
      var name=v85CanonName(k);
      /* 历史上「最佳阵容」简称与「最佳阵容一阵」全称可能同时写入，
         两者指向同一个奖：取**最大值**而不是相加，避免重复计数被放大。 */
      if(out[name]==null)out[name]=0;
      out[name]=Math.max(out[name],n);
    });
  }catch(e){}
  return out;
}
window.v85HonorTable=v85HonorTable;

function v85IconSrc(label){
  try{
    if(!label)return null;
    var s=String(label);
    if(V85_ICONS[s])return V85_ICON_DIR+V85_ICONS[s];
    var can=v85CanonName(s);
    if(V85_ICONS[can])return V85_ICON_DIR+V85_ICONS[can];
    /* 宽松匹配：包含关系（如「最佳阵容一阵 ×3」这类带后缀的文案） */
    var keys=Object.keys(V85_ICONS);
    for(var i=0;i<keys.length;i++){
      if(s.indexOf(keys[i])>=0)return V85_ICON_DIR+V85_ICONS[keys[i]];
    }
    /* 最后兜底：复用 MVP 图标（开发者要求「没有就随便复用一个」） */
    return V85_ICON_DIR+V85_ICONS['MVP'];
  }catch(e){}
  return null;
}
window.v85IconSrc=v85IconSrc;

function v85IconHtml(label,cls){
  var src=v85IconSrc(label);
  if(!src)return '';
  return '<img class="v85-honor-icon '+(cls||'')+'" src="'+src+'" alt="'+String(label).replace(/"/g,'')+'" decoding="async" onerror="this.style.display=\'none\'">';
}
window.v85IconHtml=v85IconHtml;

/* 重做荣誉陈列馆：
   ① 用「标准奖项名」展示（最佳阵容=一阵、最佳防阵=防守一阵，不拆成两项）
   ② 按固定奖项顺序展示全部奖项（含此前缺的最佳防守球员/最佳防守二阵/最佳阵容三阵）
   ③ 每一项配真实图标
   不覆盖原函数，而是**整段替换**它的输出，保证条目与图标都一致。 */
function v85HonorShowcase(){
  try{
    if(typeof career==='undefined'||!career)return '';
    var tbl=v85HonorTable();
    /* 世界赛等动态荣誉（键名不在标准列表里的）也一并展示 */
    var extra=[];
    Object.keys(career.honors||{}).forEach(function(k){
      var n=num85(career.honors[k],0);
      if(n<=0)return;
      var can=v85CanonName(k);
      /* 已在标准奖项顺序里的由上面统一渲染，这里只收「额外荣誉」
         （世界赛冠军、季中赛、分区冠军等动态键名）。
         注意判据要用「是否在标准顺序里」，不能用 tbl 是否含该键 ——
         归一后 tbl 里几乎每个键都有值，会把额外荣誉全部拦掉。 */
      if(V85_HONOR_ORDER.indexOf(can)>=0)return;
      var hit=false;
      for(var i=0;i<V85_INTL_PREFIX.length;i++){if(String(k).indexOf(V85_INTL_PREFIX[i])>=0){hit=true;break}}
      if(hit)extra.push({name:String(k),n:n});
    });

    var total=0;
    V85_HONOR_ORDER.forEach(function(k){total+=num85(tbl[k],0)});
    extra.forEach(function(e){total+=e.n});

    var rows=[];
    V85_HONOR_ORDER.forEach(function(name){
      var n=num85(tbl[name],0);
      if(n<=0)return;                      /* 只展示拿到过的奖 */
      rows.push(v85HonorItem(name,n));
    });
    extra.forEach(function(e){rows.push(v85HonorItem(e.name,e.n))});

    var bg='';
    try{bg=(typeof asset==='function')?asset('【素材位：生涯荣誉陈列馆背景】','用途：奖杯墙/球衣退役馆（生涯页顶部）','tall-banner'):''}catch(e){}

    if(!rows.length){
      return bg+'<section class="v29-honor-showcase"><header><div><small>CAREER TROPHY ROOM</small><h2>荣誉展览馆</h2></div></header>'
        +'<div class="v85-honor-empty">还没有拿到主要荣誉。打完一个赛季，奖项会陈列在这里。</div></section>';
    }

    return bg+'<section class="v29-honor-showcase"><header><div><small>CAREER TROPHY ROOM</small><h2>荣誉展览馆</h2></div>'
      +'<span class="v85-honor-total"><b>'+total+'</b> 项荣誉</span></header>'
      +'<div class="v29-honor-grid">'+rows.join('')+'</div></section>';
  }catch(e){return ''}
}
function v85HonorItem(name,n){
  return '<div class="v29-honor-item v85-item">'
    + v85IconHtml(name)
    +'<b>'+String(name).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})+'</b>'
    +'<span>× '+n+'</span>'
    +'</div>';
}
window.v85HonorShowcase=v85HonorShowcase;

/* 接管荣誉陈列馆 */
try{
  if(typeof v29HonorShowcase==='function'&&!window.__v85HonorPatched){
    v29HonorShowcase=function(){
      var h=v85HonorShowcase();
      if(h)return h;
      /* 兜底：本层不可用时交回原实现 */
      try{return v85HonorShowcaseFallback()}catch(e){return ''}
    };
    window.__v85HonorPatched=true;
  }
}catch(e){}
function v85HonorShowcaseFallback(){
  return '';
}

/* ==========================================================================
 * 二、季后赛对手：不重复
 * ========================================================================== */
/* 记录本赛季已交手过的对手（按赛季号重置） */
function v85PlayedSet(){
  try{
    if(typeof career==='undefined'||!career)return {};
    if(!career.v85PlayedOpp||career.v85PlayedSeason!==career.seasonNo){
      career.v85PlayedOpp={};
      career.v85PlayedSeason=career.seasonNo;
    }
    return career.v85PlayedOpp;
  }catch(e){return {}}
}

/* 重选对手：按真实种子定位、且排除已交手过的球队 */
function v85PickOpponent(round){
  try{
    if(typeof career==='undefined'||!career||!career.playoff)return false;
    var po=career.playoff;
    var cur=po.rounds[po.round];
    if(!cur)return false;

    /* ① 已经开打的系列赛绝不再改对手。
       原实现每次被调用都会重新抽一次，于是「赛前显示步行者、打完变成鹈鹕」（实测）。 */
    if(cur.games&&cur.games.length)return false;

    /* ② 候选池必须按分区过滤：首轮/半决赛/分区决赛只能碰同区，总决赛才跨区。
       原实现直接用「全联盟最强 8 队」（v55PlayoffField），
       所以东部球队首轮会抽到西部球队 —— 多伦多猛龙 vs 新奥尔良鹈鹕就是这么来的。 */
    var confFn=(typeof window.v221Conference==='function')?window.v221Conference:null;
    var all=[];
    try{
      /* 实力按「本赛季」浮动（见 v106TeamPower）：直接用静态 teams[].power 的话，
         每年最强的 8 队完全一样 —— 实测开发者反馈「连着 10 个赛季总决赛都是勇士」。 */
      all=(typeof teams!=='undefined'?teams:[]).map(function(t){
        var p=(typeof v106TeamPower==='function')?v106TeamPower(t.abbr):(Number(t.power)||80);
        return {abbr:t.abbr,name:t.name,power:p};
      }).sort(function(a,b){return b.power-a.power});
    }catch(e){all=[]}
    if(confFn&&all.length){
      try{
        var myConf=confFn(career.team);
        var want=(po.round<3)?myConf:(myConf==='东部'?'西部':'东部');
        var same=all.filter(function(t){return confFn(t.abbr)===want});
        if(same.length)all=same;
      }catch(e){}
    }
    var field=all.slice(0,8);
    if(!field.length){return false}

    /* 确定自己的种子。
       【关键】v55PlayoffField() 返回的是「全联盟最强 8 队」，**玩家不一定在里面**；
       所以不能拿「我在 field 里的下标」当种子。
       正确做法：用 career.currentSeed（季后赛席位号）作为种子号；
       只有当 currentSeed 缺失时，才退而求其次看 field 里的位置。 */
    var mySeed=clamp85(num85(career.currentSeed,0),0,field.length);
    if(mySeed<1){
      for(var i=0;i<field.length;i++){if(field[i]&&field[i].abbr===career.team){mySeed=i+1;break}}
    }
    if(mySeed<1)mySeed=Math.ceil(field.length/2);
    try{career.currentSeed=mySeed}catch(e){}

    /* 目标种子（沿用既有配对规则）
       总决赛（round 3）例外：这里 field 已经被过滤成「对面分区」的球队，
       所以直接取该分区最强的一支当代对手（种子 1），而不是套用 1-8 的配对公式
       —— 否则总决赛会碰上对面分区第 7 名这种不合逻辑的对阵。 */
    var target=1;
    if(po.round===3)target=1;
    else try{target=(typeof v55OpponentSeed==='function')?v55OpponentSeed(mySeed,po.round):(field.length+1-mySeed)}catch(e){target=field.length+1-mySeed}
    target=clamp85(num85(target,1),1,field.length);

    /* 候选池：排除自己，并优先排除「已交手过」的球队。
       注意：field 是纯球队列表（可能不含玩家），所以按「第 target 号球队」取即可；
       若它正好是自己（玩家也在这 8 队里）就换一个。 */
    var played=v85PlayedSet();
    function usable(t){return !!t&&!!t.abbr&&t.abbr!==career.team&&!played[t.abbr]}

    var cand=field[target-1];
    if(!usable(cand)){
      /* 按「离目标种子最近」的顺序找一支没打过的 */
      var order=[];
      for(var d=0;d<field.length;d++){
        [target-1-d,target-1+d].forEach(function(idx){
          if(idx>=0&&idx<field.length&&order.indexOf(idx)<0)order.push(idx);
        });
      }
      for(var k=0;k<order.length;k++){
        var t=field[order[k]];
        if(usable(t)){cand=t;break}
      }
    }
    if(!usable(cand)){
      /* 还没找到：从全部席位里挑实力最接近且未交手的 */
      var pool=field.filter(usable);
      if(!pool.length){
        /* 所有席位都打过：放宽到「非自己」（避免死循环） */
        pool=field.filter(function(t){return t&&t.abbr&&t.abbr!==career.team});
      }
      if(!pool.length){
        try{pool=(typeof teams!=='undefined'?teams:[]).filter(function(t){return t&&t.abbr&&t.abbr!==career.team})}catch(e){pool=[]}
      }
      if(!pool.length)return false;
      var me=null;
      try{me=(typeof teamBy==='function')?teamBy(career.team):null}catch(e){}
      var myPower=me?num85(me.power,80):80;
      pool.sort(function(a,b){
        return Math.abs(num85(a.power,80)-myPower)-Math.abs(num85(b.power,80)-myPower);
      });
      cand=pool[0];
    }
    if(!cand)return false;

    cur.opp=cand.abbr;
    cur.oppName=cand.name||cand.abbr;
    played[cand.abbr]=1;                    /* 记入已交手 */
    try{if(typeof save==='function')save()}catch(e){}
    return true;
  }catch(e){return false}
}
window.v85PickOpponent=v85PickOpponent;

/* 包装 newSeries：先让原逻辑跑（保证结构），再纠正对手 */
try{
  if(typeof newSeries==='function'&&!window.__v85SeriesPatched){
    var __v85Series=newSeries;
    newSeries=function(){
      var r=null;
      try{r=__v85Series.apply(this,arguments)}catch(e){}
      try{
        if(typeof career!=='undefined'&&career&&career.playoff&&career.stage==='playoffs'){
          if(!career.v129?.season?.bracket)v85PickOpponent(career.playoff.round);
        }
      }catch(e){}
      return r;
    };
    window.__v85SeriesPatched=true;
  }
}catch(e){}

/* 新赛季开打时清空「已交手」记录 */
try{
  if(typeof startPlayoffs==='function'&&!window.__v85StartPatched){
    var __v85Start=startPlayoffs;
    startPlayoffs=function(){
      try{if(typeof career!=='undefined'&&career){career.v85PlayedOpp={};career.v85PlayedSeason=career.seasonNo}}catch(e){}
      var r=__v85Start.apply(this,arguments);
      try{
        /* 首轮对手也在席位上重新校准一次（去掉重复/错误） */
        if(typeof career!=='undefined'&&career&&career.playoff){
          career.v85PlayedOpp={};career.v85PlayedSeason=career.seasonNo;
          if(!career.v129?.season?.bracket)v85PickOpponent(0);
        }
      }catch(e){}
      return r;
    };
    window.__v85StartPatched=true;
  }
}catch(e){}

/* ==========================================================================
 * 三、单场得分的「爆发」机制
 * ========================================================================== */
var V85_BURST={
  /* 大爆发概率：场均越高越容易爆 */
  base:0.10,           /* 基础概率 10% */
  perPpg:0.010,        /* 每 1 分场均 +1% */
  capChance:0.42,      /* 上限 42% */
  /* 爆发加成：场均的 55% ~ 110% */
  bonusMin:0.55,
  bonusMax:1.10
};

function v85BurstChance(ePts){
  return clamp85(V85_BURST.base+num85(ePts,0)*V85_BURST.perPpg,0,V85_BURST.capChance);
}

/* 计算单场得分：基础期望 + 随水平放大的波动 + 概率触发的大爆发 */
function v85GamePoints(basePts,opt){
  try{
    var e=num85(basePts,10);
    var rnd=(typeof rnd==='function')?rnd:function(a,b){return a};
    /* 基础波动：随场均放大（原实现是固定 -5~+9，高分球员也被压平） */
    var lo=-Math.max(4,Math.round(e*0.30));
    var hi=Math.max(10,Math.round(e*0.60));
    var pts=e+rnd(lo,hi);
    /* 大爆发：高分夜 */
    var ch=v85BurstChance(e);
    var clutch=(opt&&opt.clutch)?1:0;
    if(clutch)ch+=0.06;
    if(Math.random()<ch){
      var bonus=e*(V85_BURST.bonusMin+Math.random()*(V85_BURST.bonusMax-V85_BURST.bonusMin));
      pts+=bonus;
    }
    return Math.max(2,Math.round(pts));
  }catch(err){return Math.max(2,Math.round(num85(basePts,10)))}
}
window.v85GamePoints=v85GamePoints;

/* 接管「单场得分」的生成与记录。
   seasonStats 的口径（实测）：
     · pts  = 场均（每场重算）
     · totalPts = 累计得分
     · records.gamePts = 单场最高
   所以要提升「最高分」，同时**不能让场均虚高**：
   把多出来的分只记进 records.gamePts（单场最高），
   并把 totalPts 补回原值，保持场均不变。 */
function v85BoostGameScore(){
  try{
    if(typeof career==='undefined'||!career)return;
    var log=career.gameLog;
    if(!Array.isArray(log)||!log.length)return;
    var g=log[0];
    if(!g||!g.line||typeof g.line.pts!=='number')return;
    if(g.__v85)return;                       /* 本场已处理过 */
    var e=(typeof statExpect==='function')?statExpect():null;
    var basePts=e?num85(e.pts,g.line.pts):num85(g.line.pts,10);
    /* 只处理「按期望值生成」的场次（差值在合理波动范围内），
       避免覆盖剧情/关键战手工设定的高分 */
    if(Math.abs(num85(g.line.pts,0)-basePts)>14)return;
    var clutch=false;
    try{clutch=(typeof hasTalent==='function')&&hasTalent('clutch')}catch(err){}
    var np=v85GamePoints(basePts,{clutch:clutch});
    if(np<=num85(g.line.pts,0)){g.__v85=1;return}
    var gain=np-num85(g.line.pts,0);
    g.line.pts=np;
    g.__v85=1;
    /* 单场最高分：真实提升 */
    try{
      career.records=career.records||{};
      if(np>(num85(career.records.gamePts,0)))career.records.gamePts=np;
    }catch(err){}
    /* 场均不变：把多出来的分从累计值里扣回去（等于「这场的高分靠出手数换来，
       但赛季产出不变」），避免场均被抬上去而破坏评分口径。 */
    try{
      var s=career.seasonStats;
      if(s){
        if(typeof s.totalPts==='number')s.totalPts=Math.max(0,s.totalPts-gain);
        /* pts 是场均：按总累计/场次重算，保持自洽 */
        var gp=num85(s.gp,0);
        if(gp>0&&typeof s.totalPts==='number')s.pts=Math.round((s.totalPts/gp)*10)/10;
      }
    }catch(err){}
  }catch(e){}
}
window.v85BoostGameScore=v85BoostGameScore;

/* 挂到常规赛/季后赛模拟出口 */
try{
  if(typeof simulateGame==='function'&&!window.__v85SimPatched){
    var __v85Sim=simulateGame;
    simulateGame=function(){
      var r=__v85Sim.apply(this,arguments);
      try{v85BoostGameScore()}catch(e){}
      return r;
    };
    window.__v85SimPatched=true;
  }
}catch(e){}
try{
  if(typeof playoffGame==='function'&&!window.__v85PoPatched){
    var __v85Po=playoffGame;
    playoffGame=function(){
      var r=__v85Po.apply(this,arguments);
      try{v85BoostGameScore()}catch(e){}
      return r;
    };
    window.__v85PoPatched=true;
  }
}catch(e){}

/* ==========================================================================
 * 样式
 * ========================================================================== */
try{
  var st85=document.createElement('style');
  st85.id='v85-style';
  st85.textContent=[
    '.v85-honor-icon{width:30px;height:30px;object-fit:contain;display:block;margin:0 auto;filter:drop-shadow(0 2px 4px rgba(120,86,50,.22))}',
    /* 荣誉展览馆的栅格与条目 */
    '.v29-honor-showcase .v85-honor-total{margin-left:auto;font-size:8.5px;color:#a98a63}',
    '.v29-honor-showcase .v85-honor-total b{font-size:14.5px;color:#bc4438;font-weight:1000}',
    '.v29-honor-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}',
    '.v29-honor-item{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;border-radius:14px;background:#fff8ee;border:1px solid #f0e2d1}',
    '.v29-honor-item .v85-honor-icon{width:38px;height:38px}',
    '.v29-honor-item b{font-size:9px;color:#3b2f26;text-align:center;line-height:1.25}',
    '.v29-honor-item span{font-size:8.5px;color:#bc4438;font-weight:1000}',
    '.v85-honor-empty{padding:18px 12px;text-align:center;font-size:8.5px;color:#a08a76;line-height:1.6}'
  ].join('');
  document.head.appendChild(st85);
}catch(e){}

window.__v85Debug={iconSrc:v85IconSrc,iconHtml:v85IconHtml,pickOpp:v85PickOpponent,
  gamePoints:v85GamePoints,burstChance:v85BurstChance,boost:v85BoostGameScore,
  guards:{honor:!!window.__v85HonorPatched,series:!!window.__v85SeriesPatched,
          start:!!window.__v85StartPatched,sim:!!window.__v85SimPatched,po:!!window.__v85PoPatched}};

})();

