
/* =====================================================================
   V3.1 · 赛季体验与界面整改
   1) 红绿豆缩小 + 赛季页去重（三张重复的「本季故事」卡只留一张）
   2) 补齐「当前球队时期主视觉」素材位（共用一张宽幅球馆图，比例匹配）
   3) 赛季开始 / 结束改为玩家手点（不再自动开跑、不直接跳奖项）
   4) 重做赛季奖项揭晓页（突出重点 + 其余压成三行，删掉重复统计）
   5) 修复球员页「本局天赋」显示（真名 + 品质颜色）
   ===================================================================== */
(function(){
if(window.__v31Ui)return;window.__v31Ui=true;

/* =====================================================================
   PART 1 · 红绿豆缩小 + 赛季页去重
   ===================================================================== */
const st1=document.createElement('style');
st1.textContent=`
/* 1.1 胜负圆点缩小：82 颗占高明显下降，语义不变（绿=胜/红=负/灰=伤停/暗=未模拟） */
.v26-beans{gap:3px!important;margin-top:7px!important}
.v26-bean{width:10px!important;height:10px!important;box-shadow:inset 0 -2px rgba(0,0,0,.10),0 1px 3px rgba(54,38,26,.07)!important}
.v26-bean-card{padding:9px 10px!important}
.v26-bean-head b{font-size:11px}
/* 1.2 赛季页去重：v220 / v211 两张「本季专属故事」卡与 v28 主线实时卡重复讲同一件事，
      结构上移除（下方 regularView / mainlineNowCard 补丁），CSS 隐藏作双保险 */
.v220-story-chain,.v211-season-story{display:none!important}
`;
document.head.appendChild(st1);

/* 1.3 结构级去重：mainlineNowCard 会同时输出 v28 实时卡与 v211 追加卡（两张都在讲本季故事）。
       只保留信息最全的第一张 v28 卡，避免赛季页同一件事出现两遍。 */
const __v31Mainline=mainlineNowCard;
mainlineNowCard=function(){
  let h=__v31Mainline();
  if(typeof h!=='string')return h;
  const first=h.indexOf('<section class="v28-story-live">');
  if(first<0)return h;
  /* 第一张 v28 卡结束之后，再出现的 v28/v211 故事卡都去掉 */
  const afterHead=h.slice(0,first);
  let tail=h.slice(first);
  const endTag='</section>';
  /* 找到第一张卡的结尾 */
  const cardEnd=tail.indexOf(endTag);
  if(cardEnd<0)return h;
  const kept=tail.slice(0,cardEnd+endTag.length);
  let rest=tail.slice(cardEnd+endTag.length);
  /* 去掉紧随其后的重复故事卡块 */
  rest=rest.replace(/<section class="(?:v28-story-live|v211-season-story|v220-story-chain)"[\s\S]*?<\/section>/g,'');
  return afterHead+kept+rest;
};

/* 1.4 去掉我在上一轮加进豆豆条头部的战绩重复（顶部主视觉与球队卡已显示战绩） */
const __v31Beans=v26Beans;
v26Beans=function(){
  const h=__v31Beans();
  if(typeof h!=='string')return h;
  return h.replace(/\s*／\s*当前\s*\d+胜\d+负/g,'');
};

/* =====================================================================
   PART 2 · 补齐「当前球队时期主视觉」素材位
   原先该展示位映射到 assets/season-{球员}.jpg，文件不存在 → 运行时是空白占位框。
   改为共用一张宽幅球馆图（3:1），展示位是高 132px 的横条且用 object-fit:cover，
   比例匹配、裁切几乎无损。
   ===================================================================== */
const V31_TEAM_ERA_ART='assets/allstar.jpg';
const __v31AssetFile=assetFile;
assetFile=function(title){
  const t=String(title||'').replace(/^【素材位：/,'').replace(/】$/,'').trim();
  if(/当前球队时期主视觉$/.test(t)){
    return (typeof ASSET_AVAILABLE!=='undefined'&&ASSET_AVAILABLE.indexOf(V31_TEAM_ERA_ART)>=0)?V31_TEAM_ERA_ART:null;
  }
  return __v31AssetFile(title);
};

/* =====================================================================
   PART 3 · 赛季开始 / 结束改为玩家手点
   规则（已确认）：只有赛季开始、赛季结束各停一次；
   剧情选择结束后、全明星看完、季后赛推进仍自动接续。
   ===================================================================== */

/* 3.1 赛季开始不再自动开跑：进入常规赛后停表，等玩家点「开始模拟」。
       用 v31Await 标记「本季还没由玩家点过开始」，自动续跑入口遇到它就放行。 */
function v31SeasonStart(){ if(career&&!career.retired){career.v31Await=true;stopSim()} }
const __v31Begin=beginSeason;
beginSeason=function(){ __v31Begin(); v31SeasonStart(); save(); render() };
const __v31Next=nextSeason;
nextSeason=function(){ __v31Next(); v31SeasonStart(); save(); render() };

/* 自动续跑入口：本季尚未由玩家点开始时不开跑（其余时候照旧自动接续） */
const __v31AutoStart=(typeof window.v221StartSim==='function')?window.v221StartSim:null;
if(__v31AutoStart){
  window.v221StartSim=function(){
    if(career&&career.v31Await)return;   /* 等玩家手点 */
    __v31AutoStart();
  };
  window.v31ManualStart=function(){      /* 玩家点「开始模拟」 */
    if(career)career.v31Await=false;
    __v31AutoStart();
  };
  /* 常规赛页面按钮改走手动入口 */
  const __v31Regular=regularView;
  regularView=function(){
    let h=__v31Regular();
    /* 去掉与 v28 主线实时卡重复的 v220 本季故事链卡（结构级移除） */
    h=h.replace(/<section class="v220-story-chain">[\s\S]*?<\/section>/g,'');
    if(career&&career.stage==='regular'){
      h=h.replace(/onclick="v221StartSim\(\)"/g,'onclick="v31ManualStart()"');
    }
    return h;
  };
}

/* 3.2 赛季结束停表：第 82 场打完停在「常规赛结算」，不直接跳到奖项揭晓 */
const __v31FinishRegular=finishRegular;
finishRegular=function(){
  __v31FinishRegular();     /* 内部已结算赛季奖项 */
  if(!career)return;
  career.stage='postgate';  /* 覆盖为停表页，等玩家点进奖项 */
  career.v31Await=false;
  stopSim();save();render();
};

/* 3.3 结算页按钮改为「揭晓本赛季奖项」，玩家点一下才进入奖项页 */
postGateView=function(){
  const s=career.seasonStats,seed=career.currentSeed;
  const next=seed<=6?'季后赛':seed<=10?'附加赛':'休赛期';
  return `${seasonHero()}<section class="stage-card" style="margin-top:10px">${asset('【素材位：常规赛结束阶段主视觉】','用途：球馆记分牌/赛季收官氛围图，不要文字','banner')}<div class="stage-copy"><span class="result-label">REGULAR SEASON COMPLETE</span><h2>${teamRecord()} · 东/西部第 ${seed}</h2><p>你完成了 ${s.gp} 场出战，场均 ${fmt(s.pts)} 分 ${fmt(s.reb)} 篮板 ${fmt(s.ast)} 助攻。${seed<=6?'球队直接进入季后赛。':seed<=10?'球队进入附加赛，下一场就是生死战。':'球队无缘季后赛，本赛季将进入休赛期。'}</p><button class="btn primary" onclick="career.stage='awards';stopSim();save();render()">揭晓本赛季奖项 →</button><p class="v31-wait">常规赛已停表 · 看完奖项再进入${next}</p></div></section>`;
};

/* =====================================================================
   PART 4 · 重做赛季奖项揭晓页
   重点荣誉突出显示；其余每项压成「奖项 / 结果 / 关键依据」三行；删掉重复统计与重复结语。
   ===================================================================== */
/* 三行结构的第三行：只给一条判断依据，且不与「结果」列重复 */
function v31ShortDetail(c){
  const s=career.seasonStats||{},gp=s.gp||0;
  switch(c.key){
    case 'MVP':      return `场均 ${fmt(s.pts)} 分 · 球队 ${career.wins} 胜`;
    case '最佳阵容':  return c.won?`场均 ${fmt(s.pts)} 分 · OVR ${career.ovr}`:`OVR ${career.ovr} · 出勤 ${gp} 场`;
    case 'DPOY':     return `防守 ${career.attrs.defense} · 抢断+盖帽 ${fmt((s.stl||0)+(s.blk||0))}`;
    case '最佳防阵':  return `防守 ${career.attrs.defense} · 出勤 ${gp} 场`;
    case '数据王':    return c.won?'':'本赛季没有单项数据领跑';
    default:         return career.seasonNo===1?'新秀赛季综合评价':`OVR 变化 ${(c._delta>=0?'+':'')+(c._delta||0)}`;
  }
}
awardsView=function(){
  v24Init();
  const cards=career.seasonAwards||[],won=cards.filter(x=>x.won);
  const label=(typeof seasonLabel==='function')?seasonLabel():'';
  const mvp=cards.find(x=>x.key==='MVP');
  const headline=won.length?`本季收获 ${won.length} 项荣誉`:'本季没有拿到个人奖项';
  const sub=won.length?won.map(x=>x.title).join(' · '):`MVP 排名：${mvp?.status||'未进入讨论'}`;
  const rows=cards.map(c=>`<div class="award-row ${c.won?'won':''}"><span class="ak">${c.title}</span><b class="as">${c.status}</b><p class="ad">${v31ShortDetail(c)}</p></div>`).join('');
  return `${seasonHero()}<section class="awards-stage" style="margin-top:9px">
    <div class="award-top"><small>NBA SEASON AWARDS · ${label}</small><h2>常规赛奖项揭晓</h2></div>
    <div class="award-hero ${won.length?'':'none'}">
      <div class="medal">${won.length?'★':'—'}</div>
      <div><small>${won.length?'本季最大收获':'本赛季'}</small><b>${headline}</b><span>${sub}</span></div>
    </div>
    <div class="award-rows">${rows}</div>
    <button class="btn primary" style="width:100%;margin-top:10px" onclick="enterPostseason()">奖项已揭晓 · 进入季后赛阶段 →</button>
  </section>`;
};
/* 为「最佳新秀 / MIP」补上 OVR 变化，供三行明细使用 */
const __v31AwardSeason=awardSeason;
awardSeason=function(){
  const before=career?(career.ovr-(career.seasonStartOvr||career.ovr)):0;
  const h=(career&&career.history)||[];
  const prev=h[h.length-1];
  const prevPts=(prev&&prev.stats&&prev.stats.pts!=null)?prev.stats.pts:null;
  __v31AwardSeason();
  if(!career||!Array.isArray(career.seasonAwards))return;
  const curPts=(career.seasonStats&&career.seasonStats.pts!=null)?career.seasonStats.pts:null;
  const d=(prevPts!=null&&curPts!=null)?Math.round((curPts-prevPts)*10)/10:0;
  career.seasonAwards.forEach(c=>{ if(c.key!=='数据王'&&c.key!=='MVP'&&c.key!=='DPOY') c._delta=Math.max(d,before) });
};

const st4=document.createElement('style');
st4.textContent=`
.v31-wait{margin-top:7px!important;font-size:8px!important;color:#a58b77!important;text-align:center}
.award-hero{display:grid;grid-template-columns:56px 1fr;gap:11px;align-items:center;margin:10px 0;padding:13px;border-radius:20px;background:linear-gradient(135deg,#fff4d8,#fffaf0);border:1px solid #efd39b}
.award-hero .medal{width:54px;height:54px;border-radius:18px;background:linear-gradient(145deg,#f6cb6c,#ffecb5);display:grid;place-items:center;font-size:24px;box-shadow:inset 0 0 0 1px rgba(128,92,40,.18)}
.award-hero small{display:block;font-size:7.5px;color:#a9835a;letter-spacing:.1em}
.award-hero b{display:block;font-size:16px;margin:3px 0 2px}
.award-hero span{display:block;font-size:8.5px;color:#8f7456}
.award-hero.none{background:linear-gradient(135deg,#f6f3ef,#fdfcfa);border-color:#e6ded4}
.award-hero.none .medal{background:linear-gradient(145deg,#e2dad1,#f2ece5);color:#a99a8c}
.award-rows{display:grid;gap:6px}
.award-row{display:grid;grid-template-columns:1fr auto;gap:2px 8px;padding:9px 10px;border-radius:15px;background:#faf6f1;border:1px solid #ece1d6}
.award-row .ak{font-size:8.5px;color:#9d8571;align-self:center}
.award-row .as{font-size:11px;font-weight:950;color:#8b7b6e;text-align:right;align-self:center;max-width:52%;line-height:1.25}
.award-row .ad{grid-column:1/-1;font-size:8px;color:#a1928a;margin:1px 0 0}
.award-row.won{background:linear-gradient(135deg,#fff5e2,#fffdf7);border-color:#eed6a8}
.award-row.won .ak{color:#a4763a}
.award-row.won .as{color:#c1781f}
.award-row.won .ad{color:#9b8560}
`;
document.head.appendChild(st4);

/* =====================================================================
   PART 5 · 修复球员页「本局天赋」显示
   根因：球员页 playerView 位于早期 IIFE 内，永久闭包了当时的旧 talentLivePanel；
       后续版本对全局 talentLivePanel 的覆盖到不了球员页。而旧渲染器内部
       talentEffect() 只查旧天赋表，本赛季抽取池的新天赋（如 r_dev）不在表内，
       于是显示成内部代号，且没有品质颜色。全局的 v221 版渲染器是好的（含品质色）。
   修法：在补丁层重写 playerView，改用当前全局的 talentLivePanel。
   ===================================================================== */
const __v31PlayerView=playerView;
playerView=function(){
  const h=__v31PlayerView();
  if(!career)return h;
  let panel='';
  try{ panel=(typeof talentLivePanel==='function')?talentLivePanel():'' }catch(e){ panel='' }
  if(!panel)return h;
  const i=h.indexOf('<section class="talent-live">');
  const j=h.indexOf('<div class="attr-grid">',i>=0?i:0);
  if(i<0||j<0)return h;
  return h.slice(0,i)+panel+h.slice(j);
};

if(career){save();render()}

})();

