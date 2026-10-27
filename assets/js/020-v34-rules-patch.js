
/* =====================================================================
   V3.4 · 转会落地 / 年代赛制 / 历史地位榜单
   1) 剧情里选择「被交易到某队」→ 立即真的换队，且只在交易截止日（第 55 场）之前
   2) 按年代真实赛制：附加赛只在其实施年份之后生效（早期东西部前 8 进季后赛）
   3) 新增历史地位榜单：历史 + 现役混合、前 20、玩家名次单列、
      球员库按开局年代截断、现役球员动态上升、GOAT 门槛
   ===================================================================== */
(function(){
if(window.__v34Rules)return;window.__v34Rules=true;

/* =====================================================================
   PART 1 · 剧情转会真正落地
   根因：剧情选项写 trade:'争冠球队' 这类字段，applyFx 只转成 career.tradeRequest
        （申请交易的意愿），并不会真的换队 —— 所以“选了去湖人却没被交易”。
   ===================================================================== */

/* 剧情里带明确去向的选项 → 目标球队缩写 */
const V34_ROUTE_TEAM={
  lakers:'LAL',          /* 去湖人（Kobe/Phil 线） */
  minnesota:'MIN',       /* 森林狼重启线 */
  orlando:'ORL',         /* 魔术后卫线 */
  philadelphia:'PHI',    /* 留守费城 */
  miami:'MIA',           /* 迈阿密重生线 */
  portland:'POR',        /* 波特兰王朝线 */
  cavs:'CLE',            /* 克利夫兰 */
  wolves:'MIN'
};
/* 从 effect.flags 推断去向：flags 形如 [['tradeEra','lakers']] / [['franchise','minnesota']] */
function v34TeamFromFlags(effect){
  const list=(effect&&effect.flags)||[];
  for(let i=0;i<list.length;i++){
    const kv=list[i];
    if(!Array.isArray(kv))continue;
    const val=kv[1];
    if(val&&V34_ROUTE_TEAM[val])return V34_ROUTE_TEAM[val];
    const key=kv[0];
    if(key&&V34_ROUTE_TEAM[key])return V34_ROUTE_TEAM[key];
  }
  return null;
}
/* 是否处于「可以发生交易」的窗口：交易截止日（第 55 场）之前 */
function v34TradeWindowOpen(){
  if(!career)return false;
  if(career.stage!=='regular')return false;      /* 只在常规赛期间 */
  return (career.games||0)<55;                    /* 截止日之前 */
}
/* 真正执行换队（与 acceptTrade 的落地口径一致） */
function v34ApplyTeamChange(toAbbr,reason,label){
  if(!career||!toAbbr||toAbbr===career.team)return false;
  const from=teamBy(career.team),to=teamBy(toAbbr);
  if(!to)return false;
  career.team=toAbbr;
  /* 换队后的关系与角色重置：沿用既有交易的结算口径（信任下降、交易压力清零） */
  career.trust=clamp((career.trust||50)-8,0,100);
  career.tradeRequest=null;
  career.teamTradePressure=0;
  career.feed.unshift(`${reason||'交易完成'}：你从${from.name}被送往${to.name}。`);
  /* 写入世界线，保持生涯轨迹可追溯 */
  try{
    if(typeof ensureWorldline==='function'){
      ensureWorldline();
      addWorldEvent('生涯发生交易',`${from.name} → ${to.name}`,'trade');
    }
  }catch(e){}
  /* 记录这笔交易，供退役报告与历史排名使用 */
  career.trades=career.trades||[];
  career.trades.push({season:career.seasonNo,label:(typeof seasonLabel==='function'?seasonLabel():''),from:from.abbr,to:to.abbr,reason:label||reason||''});
  if(typeof recordAchievement==='function'){
    recordAchievement(`被交易到${to.name}`,`${(typeof seasonLabel==='function'?seasonLabel():'')}：从${from.name}交易至${to.name}。`,'trade',`trade-${career.seasonNo}-${toAbbr}`,false);
  }
  /* 通知玩家 */
  if(typeof window.v222Pop==='function'){
    window.v222Pop(`交易完成 · ${to.name}`,`你已被交易到${to.name}，后续剧情与战绩都以新球队为准。`);
  }
  save();
  return true;
}

/* 包装 storyChoice：带明确去向的选项立即换队；且这类选择只在截止日前可执行 */
const V34_storyChoice=storyChoice;
storyChoice=function(i){
  const raw=ui.storyEvent;
  const ch=(raw&&raw.c&&raw.c[i])?raw.c[i]:null;
  const effect=ch&&ch[2];
  const wantTeam=v34TeamFromFlags(effect);
  const alreadyTradedThisSeason=career&&career.tradedSeason===career.seasonNo;
  V34_storyChoice(i);
  if(!career||!wantTeam)return;
  /* 只在截止日前且本季尚未交易过时执行 */
  if(!v34TradeWindowOpen()||alreadyTradedThisSeason){
    career.feed.unshift('这笔交易最终没有在截止日前完成，你留在了原球队。');
    save();render();
    return;
  }
  if(wantTeam===career.team)return;
  const ok=v34ApplyTeamChange(wantTeam,'交易完成',ch[0]);
  if(ok){career.tradedSeason=career.seasonNo;save();render()}
};

/* 截止日之后，剧情里不再出现「可执行转会」的选择：把带去向的选项替换为留队向 */
function v34StripLateTradeOptions(ev){
  if(!ev||!Array.isArray(ev.c))return ev;
  if(v34TradeWindowOpen())return ev;             /* 窗口开着，照常显示 */
  const cleaned=ev.c.map(ch=>{
    const effect=ch&&ch[2];
    if(!v34TeamFromFlags(effect))return ch;
    return [ch[0].replace(/去|被交易到|交易到/,'留在'),'交易截止日已过，这笔交易无法在本赛季完成。',{tr:2,a:{mentality:1},flags:(effect&&effect.flags)||[]}];
  });
  return Object.assign({},ev,{c:cleaned});
}
const V34_maybeStory=maybeStory;
maybeStory=function(){
  const hit=V34_maybeStory();
  if(hit&&ui.storyEvent&&typeof ui.storyEvent==='object')ui.storyEvent=v34StripLateTradeOptions(ui.storyEvent);
  return hit;
};

/* =====================================================================
   PART 2 · 按年代真实赛制
   根因：enterPostseason 写死“第 7~10 名进附加赛”，2001 年也会走附加赛；
        而附加赛是 2020 年才引入的赛制。
   ===================================================================== */
/* 附加赛生效年份（NBA 附加赛自 2019-20 赛季引入；2019-20 对应 seasonYear 2019/2020） */
const V34_PLAYIN_FROM_YEAR=2020;
function v34HasPlayin(year){
  const y=year==null?(career&&career.seasonYear):year;
  return (y||0)>=V34_PLAYIN_FROM_YEAR;
}
/* 该年代的季后赛名额：有附加赛 → 前 10 有机会；没有 → 只有前 8 */
function v34PostseasonPath(){
  const seed=(career&&career.currentSeed)||99;
  const playin=v34HasPlayin();
  if(seed<=6)return'playoffs';
  if(seed<=8)return'playoffs';                   /* 7、8 名都直接进季后赛 */
  if(playin&&seed<=10)return'playin';            /* 仅附加赛年代：9、10 名打附加赛 */
  return'out';
}
enterPostseason=function(){
  const path=v34PostseasonPath();
  if(path==='playoffs'){startPlayoffs();return}
  if(path==='playin'){career.stage='playin';save();render();return}
  endSeason('无缘季后赛');
};
/* 结算页文案随年代变化 */
const V34_postGate=postGateView;
postGateView=function(){
  let h=V34_postGate();
  const seed=(career&&career.currentSeed)||99;
  const playin=v34HasPlayin();
  const noPlayinLine=(!playin&&seed>=7&&seed<=10);
  const banner=playin
    ? (seed<=6?'球队直接进入季后赛。':seed<=10?'球队进入附加赛，下一场就是生死战。':'球队无缘季后赛，本赛季将进入休赛期。')
    : (seed<=8?'球队进入季后赛。':`本赛季东西部各取前 8 进入季后赛（${career?career.seasonYear:''} 赛季尚无附加赛制），球队无缘季后赛。`);
  h=h.replace(/你完成了[\s\S]*?<\/p>/,m=>{
    return m.replace(/(球队直接进入季后赛。|球队进入附加赛，下一场就是生死战。|球队无缘季后赛，本赛季将进入休赛期。)/,banner);
  });
  const btn=playin?(seed<=6?'进入季后赛 →':seed<=10?'进入附加赛 →':'进入休赛期 →'):(seed<=8?'进入季后赛 →':'进入休赛期 →');
  h=h.replace(/>(进入季后赛|进入附加赛|进入休赛期) →</,'>'+btn+'<');
  /* 停表提示里的后续阶段名也要随年代变（该年代无附加赛时不能写「再进入附加赛」） */
  const nextLabel=playin?(seed<=6?'季后赛':seed<=10?'附加赛':'休赛期'):(seed<=8?'季后赛':'休赛期');
  h=h.replace(/(常规赛已停表[^<]*?再进入)(季后赛|附加赛|休赛期)/,'$1'+nextLabel);
  if(noPlayinLine)h=h.replace('常规赛已停表','该年代无附加赛 · 常规赛已停表');
  return h;
};

/* =====================================================================
   PART 3 · 历史地位榜单
   历史 + 现役混合、展示前 20、玩家名次单列、球员库按开局年代截断、
   现役球员动态上升、GOAT 门槛（MVP>5 且 FMVP>6 且 得分王>10）
   ===================================================================== */

/* 3.1 历史球员库：首次出现年份 + 历史成就（用于评分） */
const V34_LEGENDS=[
  {n:'迈克尔·乔丹',from:1984,mvp:5,fmvp:6,ring:6,scoring:10,allstar:14,allnba:11,tier:'goat'},
  {n:'勒布朗·詹姆斯',from:2003,mvp:4,fmvp:4,ring:4,scoring:1,allstar:20,allnba:19,tier:'top'},
  {n:'卡里姆·阿卜杜尔-贾巴尔',from:1969,mvp:6,fmvp:2,ring:6,scoring:2,allstar:19,allnba:15,tier:'top'},
  {n:'比尔·拉塞尔',from:1956,mvp:5,fmvp:0,ring:11,scoring:0,allstar:12,allnba:11,tier:'top'},
  {n:'魔术师约翰逊',from:1979,mvp:3,fmvp:3,ring:5,scoring:0,allstar:12,allnba:10,tier:'top'},
  {n:'拉里·伯德',from:1979,mvp:3,fmvp:2,ring:3,scoring:0,allstar:12,allnba:10,tier:'top'},
  {n:'威尔特·张伯伦',from:1959,mvp:4,fmvp:1,ring:2,scoring:7,allstar:13,allnba:10,tier:'top'},
  {n:'沙奎尔·奥尼尔',from:1992,mvp:1,fmvp:3,ring:4,scoring:2,allstar:15,allnba:14,tier:'top'},
  {n:'蒂姆·邓肯',from:1997,mvp:2,fmvp:3,ring:5,scoring:0,allstar:15,allnba:15,tier:'top'},
  {n:'科比·布莱恩特',from:1996,mvp:1,fmvp:2,ring:5,scoring:2,allstar:18,allnba:15,tier:'top'},
  {n:'哈基姆·奥拉朱旺',from:1984,mvp:1,fmvp:2,ring:2,scoring:0,allstar:12,allnba:12,tier:'star'},
  {n:'摩西·马龙',from:1976,mvp:3,fmvp:1,ring:1,scoring:6,allstar:12,allnba:8,tier:'star'},
  {n:'凯文·加内特',from:1995,mvp:1,fmvp:0,ring:1,scoring:0,allstar:15,allnba:9,tier:'star'},
  {n:'德克·诺维茨基',from:1998,mvp:1,fmvp:1,ring:1,scoring:0,allstar:14,allnba:12,tier:'star'},
  {n:'杰里·韦斯特',from:1960,mvp:0,fmvp:1,ring:1,scoring:1,allstar:14,allnba:12,tier:'star'},
  {n:'奥斯卡·罗伯特森',from:1960,mvp:1,fmvp:0,ring:1,scoring:0,allstar:12,allnba:11,tier:'star'},
  {n:'朱利叶斯·欧文',from:1976,mvp:1,fmvp:0,ring:1,scoring:0,allstar:11,allnba:7,tier:'star'},
  {n:'大卫·罗宾逊',from:1989,mvp:1,fmvp:0,ring:2,scoring:1,allstar:10,allnba:10,tier:'star'},
  {n:'伊赛亚·托马斯',from:1981,mvp:0,fmvp:1,ring:2,scoring:0,allstar:12,allnba:5,tier:'star'},
  {n:'查尔斯·巴克利',from:1984,mvp:1,fmvp:0,ring:0,scoring:0,allstar:11,allnba:11,tier:'star'},
  {n:'卡尔·马龙',from:1985,mvp:2,fmvp:0,ring:0,scoring:0,allstar:14,allnba:14,tier:'star'},
  {n:'约翰·斯托克顿',from:1984,mvp:0,fmvp:0,ring:0,scoring:0,allstar:10,allnba:11,tier:'star'},
  {n:'斯科蒂·皮蓬',from:1987,mvp:0,fmvp:0,ring:6,scoring:0,allstar:7,allnba:7,tier:'star'},
  {n:'艾伦·艾弗森',from:1996,mvp:1,fmvp:0,ring:0,scoring:4,allstar:11,allnba:7,tier:'star'},
  {n:'保罗·皮尔斯',from:1998,mvp:0,fmvp:1,ring:1,scoring:0,allstar:10,allnba:4,tier:'star'},
  {n:'雷·阿伦',from:1996,mvp:0,fmvp:0,ring:2,scoring:0,allstar:10,allnba:2,tier:'star'},
  {n:'加里·佩顿',from:1990,mvp:0,fmvp:0,ring:1,scoring:0,allstar:9,allnba:9,tier:'star'},
  {n:'贾森·基德',from:1994,mvp:0,fmvp:0,ring:1,scoring:0,allstar:10,allnba:6,tier:'star'},
  {n:'史蒂夫·纳什',from:1996,mvp:2,fmvp:0,ring:0,scoring:0,allstar:8,allnba:7,tier:'star'},
  {n:'德维恩·韦德',from:2003,mvp:0,fmvp:1,ring:3,scoring:1,allstar:13,allnba:8,tier:'star'},
  {n:'克里斯·保罗',from:2005,mvp:0,fmvp:0,ring:0,scoring:0,allstar:12,allnba:11,tier:'star'},
  {n:'德怀特·霍华德',from:2004,mvp:0,fmvp:0,ring:1,scoring:0,allstar:8,allnba:8,tier:'star'},
  {n:'卡梅隆·安东尼',from:2003,mvp:0,fmvp:0,ring:0,scoring:1,allstar:10,allnba:6,tier:'star'},
  {n:'克里斯·波什',from:2003,mvp:0,fmvp:0,ring:2,scoring:0,allstar:11,allnba:1,tier:'star'},
  {n:'拉塞尔·威斯布鲁克',from:2008,mvp:1,fmvp:0,ring:0,scoring:2,allstar:9,allnba:9,tier:'star'},
  {n:'詹姆斯·哈登',from:2009,mvp:1,fmvp:0,ring:0,scoring:3,allstar:10,allnba:7,tier:'star'},
  {n:'凯文·杜兰特',from:2007,mvp:1,fmvp:2,ring:2,scoring:4,allstar:14,allnba:11,tier:'top'},
  {n:'斯蒂芬·库里',from:2009,mvp:2,fmvp:1,ring:4,scoring:2,allstar:10,allnba:10,tier:'top'},
  {n:'科怀·伦纳德',from:2011,mvp:0,fmvp:2,ring:2,scoring:0,allstar:6,allnba:6,tier:'star'},
  {n:'扬尼斯·阿德托昆博',from:2013,mvp:2,fmvp:1,ring:1,scoring:0,allstar:8,allnba:8,tier:'top'},
  {n:'尼古拉·约基奇',from:2015,mvp:3,fmvp:1,ring:1,scoring:0,allstar:6,allnba:6,tier:'top'},
  {n:'乔尔·恩比德',from:2014,mvp:1,fmvp:0,ring:0,scoring:2,allstar:6,allnba:5,tier:'star'},
  {n:'卢卡·东契奇',from:2018,mvp:0,fmvp:0,ring:0,scoring:1,allstar:5,allnba:5,tier:'star'},
  {n:'杰森·塔图姆',from:2017,mvp:0,fmvp:1,ring:1,scoring:0,allstar:5,allnba:4,tier:'star'},
  {n:'安东尼·爱德华兹',from:2020,mvp:0,fmvp:0,ring:0,scoring:0,allstar:3,allnba:2,tier:'star'},
  {n:'维克托·文班亚马',from:2023,mvp:0,fmvp:0,ring:0,scoring:0,allstar:2,allnba:1,tier:'star'},
  {n:'沙伊·吉尔杰斯-亚历山大',from:2018,mvp:1,fmvp:1,ring:1,scoring:1,allstar:3,allnba:3,tier:'top'}
];
/* 3.2 历史评分：荣誉加权（各分值不同，球员各不同） */
function v34ScoreOf(p){
  if(!p)return 0;
  const s=
    (p.mvp||0)*22 +
    (p.fmvp||0)*18 +
    (p.ring||0)*7 +
    (p.scoring||0)*6 +
    (p.allstar||0)*2.2 +
    (p.allnba||0)*3.4;
  return Math.round(s*10)/10;
}
/* 是否满足 GOAT 门槛：MVP>5 且 FMVP>6 且 得分王>=10（开发者指定） */
function v34IsGoat(p){
  /* 得分王：至少 10 次（>=10） */
  return !!(p&&(p.mvp||0)>5&&(p.fmvp||0)>6&&(p.scoring||0)>=10);
}
/* 3.3 玩家当前成就（从生涯荣誉读数） */
function v34PlayerLegacy(){
  if(!career)return null;
  const h=career.honors||{},p=currentP();
  return{
    n:p?p.zh:'你',
    me:true,
    mvp:h['MVP']||0,
    fmvp:h['FMVP']||0,
    ring:h['总冠军']||0,
    scoring:h['得分王']||0,
    allstar:h['全明星']||0,
    allnba:h['最佳阵容']||0,
    from:career.draftYear||0
  };
}
/* 3.4 现役球员动态累计：以年代联盟球员池里评分最高者作为「现役代表」，
       随赛季按表现累计成就（不是只有玩家在涨） */
function v34ActiveLegacy(){
  if(!career)return[];
  const out=[];
  /* 复用 v32 联盟生态里的球员池（按评分取头部，作为现役代表） */
  let pool=[];
  try{
    if(career.v32League&&Array.isArray(career.v32League.players))pool=career.v32League.players.slice();
  }catch(e){pool=[]}
  if(!pool.length)return out;
  pool.sort((a,b)=>b.ovr-a.ovr);
  const year=career.seasonYear||career.draftYear||2001;
  pool.slice(0,26).forEach((pl,i)=>{
    /* 每个球员按稳定哈希拥有自己的成就基线，并随赛季年数累计增长 */
    const seed=v34Seed(pl.n||pl.name||String(i));
    const yearsPlayed=Math.max(0,(year-(pl.age?year-pl.age+20:year))+1);
    const elite=pl.ovr>=90?1:pl.ovr>=86?0.6:pl.ovr>=82?0.3:0;
    const s=Math.min(14,Math.round(yearsPlayed*elite));
    const nm=pl.n||pl.name;
    const acc=career.v34ActiveAcc=career.v34ActiveAcc||{};
    if(!acc[nm])acc[nm]={mvp:0,fmvp:0,ring:0,scoring:0,allstar:0,allnba:0};
    const a=acc[nm];
    /* 赛季推进时按表现累计（幂等：按已推进年数上限控制） */
    if((career.seasonNo||1)>=(a._seen||0)){
      a._seen=career.seasonNo||1;
      const r1=seed%100;
      if(elite>=1&&r1<7)a.mvp++;
      if(elite>=1&&r1>=7&&r1<13)a.fmvp++;
      if(elite>=0.6&&r1>=13&&r1<22)a.ring++;
      if(elite>=0.6&&r1>=22&&r1<30)a.scoring++;
      if(elite>0)a.allstar++;
      if(elite>=0.6)a.allnba++;
    }
    out.push({n:nm,me:false,active:true,ovr:pl.ovr,
      mvp:a.mvp,fmvp:a.fmvp,ring:a.ring,scoring:a.scoring,allstar:a.allstar,allnba:a.allnba,from:year-(pl.age||25)});
  });
  return out;
}
function v34Seed(str){
  let h=2166136261;
  for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}
  return Math.abs(h>>>0);
}
/* 3.5 生成榜单：历史（按开局年代截断）+ 现役 + 玩家 */
function v34BuildRanking(){
  if(!career)return{list:[],me:null};
  const startYear=career.draftYear||career.seasonYear||2001;
  /* 历史球员：只纳入「截至开局年」已出现的球员（夸梅 2001 看不到詹杜库） */
  const hist=V34_LEGENDS
    .filter(x=>x.n&&x.tier!=='none'&&x.from<=startYear)
    .map(x=>Object.assign({},x,{active:false}));
  /* 现役球员：动态累计 */
  const act=v34ActiveLegacy();
  /* 玩家 */
  const me=v34PlayerLegacy();
  const all=hist.concat(act);
  if(me)all.push(me);
  /* 去重（同名只保留评分更高的那条：现役覆盖历史同名） */
  const byName={};
  all.forEach(x=>{
    const cur=byName[x.n];
    if(!cur||v34ScoreOf(x)>v34ScoreOf(cur))byName[x.n]=x;
  });
  const list=Object.keys(byName).map(k=>byName[k]);
  list.forEach(x=>{x.score=v34ScoreOf(x);x.goat=v34IsGoat(x)});
  /* 排序：GOAT 门槛优先（达标者置顶），其次按评分 */
  list.sort((a,b)=>(b.goat?1:0)-(a.goat?1:0)||b.score-a.score);
  list.forEach((x,i)=>{x.rank=i+1});
  const meRow=list.find(x=>x.me)||null;
  return{list,me:meRow,startYear};
}
/* 3.6 联盟页展示：前 20 + 玩家人名次单列 */
function v34RankingCard(){
  const r=v34BuildRanking();
  if(!r.list.length)return'';
  const top=r.list.slice(0,20);
  const me=r.me;
  const inTop=me&&me.rank<=20;
  const row=(x)=>`<div class="v34-rank-row ${x.me?'me':''} ${x.goat?'goat':''}">
      <span class="v34-rk">${x.goat?'GOAT':'#'+x.rank}</span>
      <b class="v34-rn">${esc(x.n)}</b>
      <span class="v34-rt">${x.me?'你':(x.active?'现役':'历史')}${x.goat?' · 历史第一':''}</span>
      <em class="v34-rs">${x.score}</em>
    </div>`;
  return `<section class="v34-rank-card">
    <header><div><small>ALL-TIME RANKING · 截至${r.startYear}年后的生涯</small><h3>历史地位榜单 · 前 20</h3></div><span>评分</span></header>
    <div class="v34-rank-list">${top.map(row).join('')}</div>
    ${me?`<div class="v34-me-line ${inTop?'in':'out'}">
      <span class="v34-rk">#${me.rank}</span>
      <b>${esc(me.n)}</b>
      <span>${inTop?'已进入前 20':'未进前 20'} · MVP ${me.mvp} · FMVP ${me.fmvp} · 得分王 ${me.scoring}</span>
      <em>${me.score}</em>
    </div>`:''}
    <p class="v34-goat-note">成为历史第一（GOAT）需要同时满足：MVP 超过 5 次、FMVP 超过 6 次、得分王至少 10 次。</p>
  </section>`;
}
/* 接入联盟页 */
const V34_leagueView=leagueView;
leagueView=function(){
  const h=V34_leagueView();
  return h+v34RankingCard();
};

const st34=document.createElement('style');
st34.textContent=`
.v34-rank-card{margin-top:10px;padding:12px;border-radius:22px;background:linear-gradient(145deg,#fff9ef,#fff);border:1px solid #e9d7c2;box-shadow:0 10px 26px rgba(96,64,40,.07)}
.v34-rank-card header{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-bottom:8px}
.v34-rank-card header small{font-size:7px;color:#a5773e;letter-spacing:.1em}
.v34-rank-card header h3{font-size:14.5px;margin:3px 0 0}
.v34-rank-card header span{font-size:7.5px;color:#a98d75}
.v34-rank-list{display:grid;gap:4px}
.v34-rank-row{display:grid;grid-template-columns:34px 1fr auto 40px;align-items:center;gap:6px;padding:6px 8px;border-radius:12px;background:#faf6f1;border:1px solid #efe5da}
.v34-rank-row.me{background:linear-gradient(135deg,#fff3dc,#fffaf0);border-color:#e9c978}
.v34-rank-row.goat{background:linear-gradient(135deg,#3a2410,#7a4a16 60%,#c08a2c);border-color:#c08a2c}
.v34-rank-row.goat .v34-rk,.v34-rank-row.goat .v34-rn,.v34-rank-row.goat .v34-rs{color:#ffe6ad}
.v34-rank-row.goat .v34-rt{color:#f3d9a8}
.v34-rk{font-size:8.5px;font-weight:1000;color:#a98b74}
.v34-rn{font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.v34-rt{font-size:7px;color:#a2928a;white-space:nowrap}
.v34-rs{font-size:10.5px;font-weight:1000;font-style:normal;color:#b0752c;text-align:right}
.v34-me-line{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:6px;margin-top:7px;padding:8px;border-radius:13px;background:#fff5e2;border:1px solid #eed6a8}
.v34-me-line b{font-size:10.5px}
.v34-me-line span{grid-column:2/3;font-size:7.5px;color:#9a8465}
.v34-me-line em{grid-column:3/4;font-size:11.5px;font-weight:1000;font-style:normal;color:#c1781f}
.v34-goat-note{margin:7px 0 0;font-size:7.5px;line-height:1.55;color:#a2928a}
`;
document.head.appendChild(st34);

/* 供自动化验收读取 */
window.__v34Debug={v34ApplyTeamChange,v34TradeWindowOpen,v34TeamFromFlags,v34HasPlayin,v34PostseasonPath,v34BuildRanking,v34ScoreOf,v34IsGoat,v34TradeWindowOpenFn:v34TradeWindowOpen};

if(career){save();render()}

})();

