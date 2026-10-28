
/* Fix V2.8 talent entry crash: V2.8 renderTalents referenced a closure-local helper. */
window.qClass=function(r){return r==='传奇'?'q-legend':r==='稀有'?'q-rare':r==='优秀'?'q-good':'q-common'};

function v29Init(){
 if(!career)return;
 v26Init();
 career.records=Object.assign({
  gamePts:0,gameReb:0,gameAst:0,gameMin:0,gameStl:0,gameBlk:0,
  gameFgm:0,gameFga:0,game3pm:0,game3pa:0,gameFtm:0,gameFta:0,gameTov:0,gamePf:0,
  bestPpg:0,bestRpg:0,bestApg:0,bestOvr:career.ovr||0,bestSeason:''
 },career.records||{});
 if(!career.seasonAwardWinners)career.seasonAwardWinners={};
}
function v29UpdateRecords(line){
 if(!career||!line)return;v29Init();
 let r=career.records;
 const pairs={gamePts:'pts',gameReb:'reb',gameAst:'ast',gameMin:'min',gameStl:'stl',gameBlk:'blk',gameFgm:'fgm',gameFga:'fga',game3pm:'tpm',game3pa:'tpa',gameFtm:'ftm',gameFta:'fta',gameTov:'tov',gamePf:'pf'};
 Object.entries(pairs).forEach(([rk,lk])=>{r[rk]=Math.max(Number(r[rk]||0),Number(line[lk]||0))});
}
const __v29Sim=simulateGame;
simulateGame=function(){let before=career?.games||0;__v29Sim();if(career&&career.games>before){let g=career.gameLog?.[0];if(g?.played!==false&&g?.line){if(g.line.fgm==null&&typeof v26DeriveBox==='function')v26DeriveBox(g.line);v29UpdateRecords(g.line)}save()}};

function v29EraPool(year,type){
 const pools={
  early:['蒂姆·邓肯','科比·布莱恩特','凯文·加内特','沙奎尔·奥尼尔','史蒂夫·纳什','德克·诺维茨基','杰森·基德'],
  mid:['勒布朗·詹姆斯','科比·布莱恩特','德维恩·韦德','克里斯·保罗','德怀特·霍华德','凯文·杜兰特','德克·诺维茨基'],
  modern:['勒布朗·詹姆斯','凯文·杜兰特','斯蒂芬·库里','詹姆斯·哈登','拉塞尔·威斯布鲁克','科怀·伦纳德','安东尼·戴维斯'],
  now:['尼古拉·约基奇','扬尼斯·阿德托昆博','乔尔·恩比德','卢卡·东契奇','杰森·塔图姆','谢伊·吉尔杰斯-亚历山大','安东尼·爱德华兹'],
  future:['维克托·文班亚马','卢卡·东契奇','安东尼·爱德华兹','Cameron Knox','Malik Rivers','Jaylen Price','Noah Grant']
 };
 let base=year<=2005?pools.early:year<=2010?pools.mid:year<=2018?pools.modern:year<=2027?pools.now:pools.future;
 if(type==='DPOY'){
   const d=year<=2010?['蒂姆·邓肯','凯文·加内特','德怀特·霍华德','本·华莱士','罗恩·阿泰斯特']:year<=2021?['科怀·伦纳德','德雷蒙德·格林','鲁迪·戈贝尔','安东尼·戴维斯','扬尼斯·阿德托昆博']:['维克托·文班亚马','扬尼斯·阿德托昆博','埃文·莫布里','贾伦·杰克逊 Jr.','Cameron Knox'];return d;
 }
 return base;
}
function v29Pick(year,type,offset=0){let p=v29EraPool(year,type);return p[Math.abs(stableHash(`${year}-${type}-${offset}`))%p.length]}
function v29RookieWinner(year){const exact={2001:['保罗·加索尔','托尼·帕克','杰森·理查德森','肖恩·巴蒂尔'],2007:['凯文·杜兰特','艾尔·霍福德','迈克·康利','杰夫·格林'],2013:['维克托·奥拉迪波','迈克尔·卡特-威廉姆斯','扬尼斯·阿德托昆博','CJ·麦科勒姆'],2016:['乔尔·恩比德','马尔科姆·布罗格登','贾马尔·穆雷','杰伦·布朗'],2017:['多诺万·米切尔','杰森·塔图姆','朗佐·鲍尔','凯尔·库兹马']};let p=exact[year]||['联盟新秀 Cameron Knox','联盟新秀 Malik Rivers','联盟新秀 Jaylen Price'];return p[Math.abs(stableHash(`${year}-ROY`))%p.length]}
function v29AwardWinners(){
 v29Init();let y=career.seasonYear||career.draftYear||2020,p=currentP(),cards=career.seasonAwards||[];
 let card=(key)=>cards.find(x=>x.key===key||x.title===key),data=card('数据王'),status=data?.status||'';
 let mvp=card('MVP'),dp=card('DPOY'),rook=cards.find(x=>x.key==='最佳新秀'||x.key==='MIP');
 const self=p.zh;
 return {
  MVP:{label:'MVP',winner:mvp?.won?self:v29Pick(y,'MVP',1),self:mvp?.status||'未进入讨论'},
  DPOY:{label:'最佳防守球员',winner:dp?.won?self:v29Pick(y,'DPOY',2),self:dp?.status||'未进入讨论'},
  ROY:{label:career.seasonNo===1?'最佳新秀':'最快进步球员',winner:rook?.won?self:(career.seasonNo===1?v29RookieWinner(y):v29Pick(y,'MVP',3)),self:rook?.status||'未获奖'},
  SCORE:{label:'得分王',winner:status.includes('得分王')?self:v29Pick(y,'MVP',4),self:status.includes('得分王')?'获奖':`${fmt(career.seasonStats.pts)} PPG`},
  REB:{label:'篮板王',winner:status.includes('篮板王')?self:v29Pick(y,'DPOY',5),self:status.includes('篮板王')?'获奖':`${fmt(career.seasonStats.reb)} RPG`},
  AST:{label:'助攻王',winner:status.includes('助攻王')?self:v29Pick(y,'MVP',6),self:status.includes('助攻王')?'获奖':`${fmt(career.seasonStats.ast)} APG`},
  BLK:{label:'盖帽王',winner:status.includes('盖帽王')?self:v29Pick(y,'DPOY',7),self:status.includes('盖帽王')?'获奖':`${fmt(career.seasonStats.blk)} BPG`}
 };
}
const __v29AwardSeason=awardSeason;
awardSeason=function(){__v29AwardSeason();if(!career)return;career.seasonAwardWinners=v29AwardWinners();save()};

function v29Candidates(y,key,winner,count){
 let pool=[];
 try{
  if(typeof window.__v220MvpRace==='function'){
   let r=window.__v220MvpRace(false);
   if(r&&Array.isArray(r.list))pool=r.list.map(x=>x&&x.name).filter(Boolean);
  }
 }catch(_){}
 if(!pool.length)pool=['联盟本赛季各队核心球员'];
 let out=[];
 let seed=Math.abs(stableHash(`${y}-${key}-cands`));
 let off=seed%Math.max(1,pool.length);
 for(let i=0;i<pool.length;i++){
  let n=pool[(off+i)%pool.length];
  if(!n)continue;
  if(winner&&n===winner)continue;
  if(out.indexOf(n)>=0)continue;
  out.push(n);
  if(out.length>=count)break;
 }
 if(winner)out=[winner].concat(out).slice(0,count);
 return out;
}
function v29TopTeam(y,key){
 return v29Candidates(y,key,null,5);
}
awardsView=function(){
 v29Init();let cards=career.seasonAwards||[],wins=career.seasonAwardWinners&&Object.keys(career.seasonAwardWinners).length?career.seasonAwardWinners:v29AwardWinners(),p=currentP();career.seasonAwardWinners=wins;
 let y=career.seasonYear||career.draftYear||2020;
 let mine=cards.filter(x=>x.won);
 let major=Object.values(wins);
 let wonBlock=mine.length
  ?`<div class="v29-mywin"><header><small>你本季获得的荣誉</small><b>${mine.length} 项</b></header><div class="v29-mywin-list">${mine.map(x=>`<div><i>🏆</i><b>${x.status==='获奖'?x.title:x.status}</b><span>${x.detail}</span></div>`).join('')}</div></div>`
  :`<div class="v29-mywin none"><header><small>你本季获得的荣誉</small><b>0 项</b></header><div class="v29-mywin-list"><div><i>·</i><b>本季没有个人大奖</b><span>下面的每个奖项都列出了得主与竞争者，方便你对照差距。</span></div></div></div>`;
 // per-award blocks with winner + full contenders
 let blocks=major.map(a=>{
  let key=a.label;
  let isTeam=/阵容/.test(key);
  let list=isTeam?v29TopTeam(y,key):v29Candidates(y,key,a.winner,4);
  return `<div class="v29-aw ${a.winner===p.zh?'mine':''}"><div class="v29-aw-top"><small>${key}</small><b>${a.winner}${a.winner===p.zh?' 🏆':''}</b></div><div class="v29-aw-self">你：${a.self}</div><div class="v29-aw-list">${list.map((n,i)=>`<span class="${n===p.zh?'me':''}">${isTeam?`第${i+1}位`:''}${n}</span>`).join('')}</div></div>`;
 }).join('');
 // also show the all-NBA / all-defense teams fully
 let allNba=v29TopTeam(y,'ALLNBA'),allDef=v29TopTeam(y,'ALLDEF');
 let teams=`<div class="v29-aw"><div class="v29-aw-top"><small>最佳阵容（一阵）</small><b>${allNba[0]||'—'}</b></div><div class="v29-aw-self">你：${(cards.find(x=>x.key==='最佳阵容')||{}).status||'未入选'}</div><div class="v29-aw-list">${allNba.map((n,i)=>`<span class="${n===p.zh?'me':''}">第${i+1}位${n}</span>`).join('')}</div></div><div class="v29-aw"><div class="v29-aw-top"><small>最佳防守阵容（一防）</small><b>${allDef[0]||'—'}</b></div><div class="v29-aw-self">你：${(cards.find(x=>x.key==='最佳防阵')||{}).status||'未入选'}</div><div class="v29-aw-list">${allDef.map((n,i)=>`<span class="${n===p.zh?'me':''}">第${i+1}位${n}</span>`).join('')}</div></div>`;
 return `${seasonHero()}<section class="awards-stage v29-awards-stage"><div class="award-top"><small>NBA SEASON AWARDS</small><h2>赛季奖项正式揭晓</h2><p>先看你自己拿了什么，再看每个奖的得主与竞争者。</p></div>${wonBlock}<div class="v29-aw-grid">${blocks}${teams}</div><div class="v29-award-note">最佳阵容 / 最佳防守阵容是五人名单，因此同时给出得主（第一位）与完整五人。</div><div class="award-grid">${cards.map(a=>`<div class="award-card ${a.won?'win':a.status.includes('排名')?'nom':''}"><span class="award-label">${a.title}</span><b>${a.status}</b><p>${a.detail}</p>${a.won?'<strong>已写入生涯荣誉</strong>':''}</div>`).join('')}</div><button class="btn primary" style="width:100%;margin-top:10px" onclick="career.stage='postgate';save();render()">我看完了 · 查看排名与季后赛资格 →</button></section>`;
};
const v29AwStyle=document.createElement('style');
v29AwStyle.textContent=`.v29-mywin{margin:10px 0;border-radius:20px;padding:11px;background:linear-gradient(145deg,#fff6d9,#fffaf0);border:1px solid #e8c15f}.v29-mywin.none{background:#fff;border-color:#eadfd5}.v29-mywin header{display:flex;justify-content:space-between;align-items:baseline}.v29-mywin header small{font-size:8.5px;color:#a1876f}.v29-mywin header b{font-size:13.5px;color:#b8860b}.v29-mywin-list{display:grid;gap:6px;margin-top:8px}.v29-mywin-list>div{display:grid;grid-template-columns:20px 1fr;gap:6px;align-items:start;padding:7px 8px;border-radius:12px;background:rgba(255,255,255,.72)}.v29-mywin-list i{font-size:13.5px;font-style:normal}.v29-mywin-list b{font-size:10.5px;display:block}.v29-mywin-list span{font-size:8px;color:#8b7869;grid-column:2;line-height:1.4}.v29-aw-grid{display:grid;gap:7px;margin:9px 0}.v29-aw{border-radius:16px;padding:9px 10px;background:#fff;border:1px solid #eadfd5}.v29-aw.mine{background:linear-gradient(145deg,#fff4cf,#fffaf1);border-color:#e8c15f}.v29-aw-top{display:flex;justify-content:space-between;align-items:baseline;gap:6px}.v29-aw-top small{font-size:8px;color:#a18875;white-space:nowrap}.v29-aw-top b{font-size:12.5px;text-align:right}.v29-aw-self{margin-top:3px;font-size:8px;color:#b05c4e;font-weight:900}.v29-aw-list{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}.v29-aw-list span{font-size:7.5px;padding:3px 6px;border-radius:9px;background:#f6f1eb;color:#7c6a5c}.v29-aw-list span.me{background:#ffe6a2;color:#8a5a10;font-weight:900}`;
document.head.appendChild(v29AwStyle);

const __v29EndSeason=endSeason;
endSeason=function(result){let aw=career?JSON.parse(JSON.stringify(career.seasonAwardWinners||{})):{};__v29EndSeason(result);if(career?.history?.length){career.history[career.history.length-1].awardWinners=aw;save()}};

function v29HonorShowcase(){
 let won=Object.entries(career.honors||{}).filter(([,v])=>v>0),sum=won.reduce((a,[,v])=>a+v,0);
 return `${asset('【素材位：生涯荣誉陈列馆背景】','用途：奖杯墙/球衣退役馆氛围，不放具体奖杯文字','tall-banner')}<section class="v29-honor-showcase"><header><div><small>CAREER TROPHY ROOM</small><h2>荣誉展览馆</h2></div><b>${sum}</b></header><div class="v29-honor-grid">${won.length?won.map(([k,v])=>`<div class="v29-honor-tile">${asset(`【素材位：${k}奖杯图标】`,'透明PNG')}<b>${k}</b><span>× ${v}</span></div>`).join(''):'<div class="v29-empty-honor">这里应该是玩家第一眼看到的地方。拿到全明星、最佳阵容、MVP、DPOY、总冠军等荣誉后会立即陈列。</div>'}</div></section>`;
}
function v29SeasonHistory(){return `<div class="season-table">${career.history.slice().reverse().map(h=>`<div class="season-line"><div><b>${h.season}</b><span>${h.age}岁</span></div><div class="season-data"><b>${teamBy(h.team).name} · ${h.record}</b><p>${fmt(h.stats.pts)}分 ${fmt(h.stats.reb)}板 ${fmt(h.stats.ast)}助 · ${fmt(h.stats.min||0)}分钟</p><div class="v26-shooting-row">投篮 ${fmt(h.stats.fgm||0)}/${fmt(h.stats.fga||0)} (${fmt(h.stats.fg||0)}%) · 三分 ${fmt(h.stats.tpm||0)}/${fmt(h.stats.tpa||0)} (${fmt(h.stats.three||0)}%) · 罚球 ${fmt(h.stats.ftm||0)}/${fmt(h.stats.fta||0)} (${fmt(h.stats.ft||0)}%)</div><p>${h.awards?.join(' / ')||'无主要奖项'} · ${h.result}</p></div><strong>${h.ovr}</strong></div>`).join('')||'<div class="tiny">赛季结束后自动记录。</div>'}</div>`}
careerArchiveView=function(){
 v29Init();let c=career.careerTotals,r=career.records,av=careerAveragesV26(),ach=career.worldline?.achievements||[];
 return `<section class="career-archive"><small style="font-size:8.5px;color:#a48774">COMPLETE CAREER DATABASE</small><h2 style="font-size:22px;margin:3px 0">我的完整生涯数据库</h2><p class="tiny">排序按玩家真正关心的顺序：先看荣誉，再看生涯核心数字，然后才是场均、累计、个人纪录和逐季履历。</p>
 ${v29HonorShowcase()}
 <section class="v29-section"><header><h3>生涯核心数字</h3><span>CAREER OVERVIEW</span></header><div class="v29-core-grid"><div class="hero"><b>${c.games||0}</b><span>出场 GP</span></div><div class="hero"><b>${c.seasons||0}</b><span>赛季</span></div><div><b>${Math.round(c.points||0).toLocaleString()}</b><span>总得分</span></div><div><b>${career.honors?.['全明星']||0}</b><span>全明星</span></div><div><b>${career.honors?.['总冠军']||0}</b><span>总冠军</span></div><div><b>${career.honors?.['MVP']||0}</b><span>MVP</span></div><div><b>${career.ovr}</b><span>当前 OVR</span></div><div><b>${career.age}</b><span>年龄</span></div></div></section>
 <section class="v29-section"><header><h3>生涯场均</h3><span>先核心产量，再效率</span></header><div class="v29-big3"><div><b>${fmt(av.pts)}</b><span>PTS 场均得分</span></div><div><b>${fmt(av.reb)}</b><span>REB 场均篮板</span></div><div><b>${fmt(av.ast)}</b><span>AST 场均助攻</span></div></div><div class="v29-stat-grid"><div><b>${fmt(av.min)}</b><span>MIN</span></div><div><b>${fmt(av.stl)}</b><span>STL</span></div><div><b>${fmt(av.blk)}</b><span>BLK</span></div><div><b>${fmt(av.tov)}</b><span>TOV</span></div><div><b>${fmt(av.fgm)}/${fmt(av.fga)}</b><span>FGM/FGA</span></div><div><b>${fmt(av.fg)}%</b><span>FG%</span></div><div><b>${fmt(av.tpm)}/${fmt(av.tpa)}</b><span>3PM/3PA</span></div><div><b>${fmt(av.three)}%</b><span>3P%</span></div><div><b>${fmt(av.ftm)}/${fmt(av.fta)}</b><span>FTM/FTA</span></div><div><b>${fmt(av.ft)}%</b><span>FT%</span></div><div><b>${fmt(av.pf)}</b><span>PF</span></div><div><b>${career.role}</b><span>当前角色</span></div></div></section>
 <section class="v29-section"><header><h3>生涯累计</h3><span>TOTALS</span></header><div class="v29-stat-grid"><div><b>${Math.round(c.minutes||0).toLocaleString()}</b><span>总分钟</span></div><div><b>${Math.round(c.points||0).toLocaleString()}</b><span>总得分</span></div><div><b>${Math.round(c.rebounds||0).toLocaleString()}</b><span>总篮板</span></div><div><b>${Math.round(c.assists||0).toLocaleString()}</b><span>总助攻</span></div><div><b>${Math.round(c.steals||0).toLocaleString()}</b><span>总抢断</span></div><div><b>${Math.round(c.blocks||0).toLocaleString()}</b><span>总盖帽</span></div><div><b>${Math.round(c.fgm||0).toLocaleString()}</b><span>命中球</span></div><div><b>${Math.round(c.fga||0).toLocaleString()}</b><span>投篮出手</span></div><div><b>${Math.round(c.threePm||0).toLocaleString()}</b><span>三分命中</span></div><div><b>${Math.round(c.threePa||0).toLocaleString()}</b><span>三分出手</span></div><div><b>${Math.round(c.ftm||0).toLocaleString()}</b><span>罚球命中</span></div><div><b>${Math.round(c.fta||0).toLocaleString()}</b><span>罚球出手</span></div><div><b>${Math.round(c.turnovers||0).toLocaleString()}</b><span>总失误</span></div><div><b>${Math.round(c.fouls||0).toLocaleString()}</b><span>总犯规</span></div></div></section>
 <section class="v29-section"><header><h3>常规赛个人纪录</h3><span>CAREER HIGHS</span></header><div class="v29-record-grid"><div class="v29-record primary"><b>${Math.round(r.gamePts||0)}</b><span>单场最高得分</span></div><div class="v29-record primary"><b>${Math.round(r.gameReb||0)}</b><span>单场最高篮板</span></div><div class="v29-record primary"><b>${Math.round(r.gameAst||0)}</b><span>单场最高助攻</span></div><div class="v29-record"><b>${Math.round(r.gameMin||0)}</b><span>单场最高上场时间</span></div><div class="v29-record"><b>${Math.round(r.gameStl||0)}</b><span>单场最高抢断</span></div><div class="v29-record"><b>${Math.round(r.gameBlk||0)}</b><span>单场最高盖帽</span></div><div class="v29-record"><b>${Math.round(r.gameFgm||0)}</b><span>单场最多投篮命中</span></div><div class="v29-record"><b>${Math.round(r.gameFga||0)}</b><span>单场最多投篮出手</span></div><div class="v29-record"><b>${Math.round(r.game3pm||0)}</b><span>单场最多三分命中</span></div><div class="v29-record"><b>${Math.round(r.game3pa||0)}</b><span>单场最多三分出手</span></div><div class="v29-record"><b>${Math.round(r.gameFtm||0)}</b><span>单场最多罚球命中</span></div><div class="v29-record"><b>${Math.round(r.gameFta||0)}</b><span>单场最多罚球出手</span></div><div class="v29-record"><b>${Math.round(r.gameTov||0)}</b><span>单场最高失误</span></div><div class="v29-record"><b>${fmt(r.bestPpg||0)}</b><span>最高赛季场均得分</span></div><div class="v29-record"><b>${fmt(r.bestRpg||0)}</b><span>最高赛季场均篮板</span></div><div class="v29-record"><b>${fmt(r.bestApg||0)}</b><span>最高赛季场均助攻</span></div></div></section>
 <section class="v29-section"><header><h3>逐赛季履历</h3><span>YEAR BY YEAR</span></header>${v29SeasonHistory()}</section>
 <section class="v29-section"><header><h3>重要里程碑</h3><span>ACHIEVEMENTS</span></header><div class="achievement-ledger">${ach.slice().reverse().map(a=>`<div class="achievement-item ${a.kind}"><i>${a.kind==='award'?'🏆':a.kind==='record'?'📈':'★'}</i><div><small>${a.label}${a.game?` · G${a.game}`:''}</small><b>${String(a.title).replace(/^\d{4}-\d{2}\s*/,'')}</b><p>${a.detail}</p></div></div>`).join('')||'<div class="tiny">达到生涯新高、数据里程碑或荣誉后会记录。</div>'}</div></section>
 <section class="v29-section"><header><h3>交易 / 伤病履历</h3><span>CAREER EVENTS</span></header><div class="transaction-list">${(career.tradeHistory||[]).map(t=>`<div><b>${t.season} · ${t.from} → ${t.to}</b><span>${t.type}</span></div>`).join('')||'<div class="tiny">暂未发生交易。</div>'}</div><div class="injury-list" style="margin-top:7px">${(career.injuryHistory||[]).map(i=>`<div><b>${i.season} · ${i.name}</b><span>G${i.game} · ${i.severity} · 缺席约${i.games}场</span></div>`).join('')||'<div class="tiny">暂未出现需要记录的伤病。</div>'}</div></section>
 <div class="retire-box"><b>主动退役</b><p>最终报告会使用以上完整数据生成你的世界线评价。</p><button onclick="ui.modal={kind:'retire'};render()">宣布退役</button></div></section>`;
};
legacyView=careerArchiveView;

if(career){v29Init();save();render()}

/* === V2.10 OPENING / TALENT POOL / 4X SIM / TRUE-STORY TUNING === */
const V210_TALENTS=[{"id":"c_fin","n":"篮下手感","r":"普通","d":"终结+2。","eff":{"attrs":{"finishing":2}}},{"id":"c_shoot","n":"投篮手感","r":"普通","d":"投射+2。","eff":{"attrs":{"shooting":2}}},{"id":"c_play","n":"传球基本功","r":"普通","d":"组织+2。","eff":{"attrs":{"playmaking":2}}},{"id":"c_def","n":"防守脚步","r":"普通","d":"防守+2。","eff":{"attrs":{"defense":2}}},{"id":"c_reb","n":"卡位意识","r":"普通","d":"篮板+2。","eff":{"attrs":{"rebounding":2}}},{"id":"c_ath","n":"第一步","r":"普通","d":"运动+2。","eff":{"attrs":{"athleticism":2}}},{"id":"c_dur","n":"体能储备","r":"普通","d":"耐久+2，健康+3。","eff":{"attrs":{"durability":2},"h":3}},{"id":"c_ment","n":"心理建设","r":"普通","d":"心态+2，自信+3。","eff":{"attrs":{"mentality":2},"c":3}},{"id":"c_health","n":"睡眠管理","r":"普通","d":"健康+6。","eff":{"h":6}},{"id":"c_conf","n":"自信投手","r":"普通","d":"自信+6。","eff":{"c":6}},{"id":"c_trust","n":"训练态度","r":"普通","d":"教练信任+6。","eff":{"tr":6}},{"id":"c_minutes","n":"轮换争取","r":"普通","d":"同评分下场均时间+1分钟。","eff":{"minutes":1}},{"id":"c_pts","n":"主动攻击","r":"普通","d":"常规赛得分期望+0.6分。","eff":{"exp":{"pts":0.6}}},{"id":"c_rebexp","n":"追板习惯","r":"普通","d":"常规赛篮板期望+0.7个。","eff":{"exp":{"reb":0.7}}},{"id":"c_astexp","n":"提前阅读","r":"普通","d":"常规赛助攻期望+0.7次。","eff":{"exp":{"ast":0.7}}},{"id":"pressure","n":"抗压者","r":"普通","d":"负面剧情造成的自信损失减少50%。","eff":{"confLossMult":0.5}},{"id":"fin","n":"终结专家","r":"优秀","d":"终结+3。","eff":{"attrs":{"finishing":3}}},{"id":"u_shoot","n":"稳定射手","r":"优秀","d":"投射+4。","eff":{"attrs":{"shooting":4}}},{"id":"u_play","n":"控场者","r":"优秀","d":"组织+4。","eff":{"attrs":{"playmaking":4}}},{"id":"u_def","n":"外线锁链","r":"优秀","d":"防守+4。","eff":{"attrs":{"defense":4}}},{"id":"rebound","n":"篮板嗅觉","r":"优秀","d":"篮板+3。","eff":{"attrs":{"rebounding":3}}},{"id":"u_ath","n":"转换引擎","r":"优秀","d":"运动+4。","eff":{"attrs":{"athleticism":4}}},{"id":"u_dur","n":"强壮底盘","r":"优秀","d":"耐久+4，健康+5。","eff":{"attrs":{"durability":4},"h":5}},{"id":"u_ment","n":"比赛阅读","r":"优秀","d":"心态+4，自信+4。","eff":{"attrs":{"mentality":4},"c":4}},{"id":"recover","n":"科学康复","r":"优秀","d":"所有伤病预计缺席场次减少20%。","eff":{}},{"id":"leader","n":"更衣室纽带","r":"优秀","d":"管理层主动交易风险-6%；每个新赛季教练信任+2、管理层满意度+3。","eff":{}},{"id":"u_ironlight","n":"轻伤免疫","r":"优秀","d":"常规伤病概率-18%。","eff":{"injMult":0.82}},{"id":"u_minutes","n":"轮换优先","r":"优秀","d":"同评分下场均时间+2分钟。","eff":{"minutes":2}},{"id":"u_pts","n":"得分嗅觉","r":"优秀","d":"得分期望+1.2分。","eff":{"exp":{"pts":1.2}}},{"id":"u_rebexp","n":"篮板机器","r":"优秀","d":"篮板期望+1.2个。","eff":{"exp":{"reb":1.2}}},{"id":"u_astexp","n":"串联核心","r":"优秀","d":"助攻期望+1.2次。","eff":{"exp":{"ast":1.2}}},{"id":"u_ft","n":"罚球功课","r":"优秀","d":"投射+2，自信+4。","eff":{"attrs":{"shooting":2},"c":4}},{"id":"u_floor","n":"稳定心态","r":"优秀","d":"自信不会低于55。","eff":{"confFloor":55}},{"id":"u_trustfloor","n":"教练爱将","r":"优秀","d":"教练信任不会低于55。","eff":{"trustFloor":55}},{"id":"u_dev","n":"加练名额","r":"优秀","d":"开局额外+1成长点。","eff":{"dev":1}},{"id":"u_two","n":"双向基础","r":"优秀","d":"终结+2、防守+2。","eff":{"attrs":{"finishing":2,"defense":2}}},{"id":"shot","n":"投篮工匠","r":"稀有","d":"每次给“投射”加点时额外+1投射。","eff":{}},{"id":"def","n":"防守直觉","r":"稀有","d":"每次给“防守”加点时额外+1防守。","eff":{}},{"id":"gym","n":"健身房老鼠","r":"稀有","d":"给“运动”或“耐久”加点时，额外+1耐久。","eff":{}},{"id":"core","n":"核心待遇","r":"稀有","d":"同评分下场均时间+2分钟，更容易维持首发/核心角色。","eff":{}},{"id":"adapt","n":"即插即用","r":"稀有","d":"被交易后不掉适应期信任，交易后教练信任至少65。","eff":{}},{"id":"r_fin","n":"禁区杀手","r":"稀有","d":"终结+5，得分期望+0.8分。","eff":{"attrs":{"finishing":5},"exp":{"pts":0.8}}},{"id":"r_play","n":"高阶视野","r":"稀有","d":"组织+5，助攻期望+1.0次。","eff":{"attrs":{"playmaking":5},"exp":{"ast":1.0}}},{"id":"r_reb","n":"玻璃清洁工","r":"稀有","d":"篮板+5，篮板期望+1.0个。","eff":{"attrs":{"rebounding":5},"exp":{"reb":1.0}}},{"id":"r_lock","n":"抢断预判","r":"稀有","d":"防守+5，抢断期望+0.25次。","eff":{"attrs":{"defense":5},"exp":{"stl":0.25}}},{"id":"r_rim","n":"护框本能","r":"稀有","d":"防守+3、篮板+3，盖帽期望+0.30次。","eff":{"attrs":{"defense":3,"rebounding":3},"exp":{"blk":0.3}}},{"id":"r_health","n":"耐操体质","r":"稀有","d":"耐久+6、健康+8，伤病概率-18%。","eff":{"attrs":{"durability":6},"h":8,"injMult":0.82}},{"id":"r_ment","n":"冷血心态","r":"稀有","d":"心态+5、自信+8，自信最低60。","eff":{"attrs":{"mentality":5},"c":8,"confFloor":60}},{"id":"r_guard","n":"双能卫模板","r":"稀有","d":"组织+3、投射+3、心态+2。","eff":{"attrs":{"playmaking":3,"shooting":3,"mentality":2}}},{"id":"r_big","n":"内线轴心","r":"稀有","d":"终结+3、篮板+3、防守+2。","eff":{"attrs":{"finishing":3,"rebounding":3,"defense":2}}},{"id":"r_tw","n":"攻防一体","r":"稀有","d":"终结+2、防守+4、运动+2。","eff":{"attrs":{"finishing":2,"defense":4,"athleticism":2}}},{"id":"r_playoff","n":"季后赛模式","r":"稀有","d":"季后赛得分期望+1.8分、篮板+0.5、助攻+0.5。","eff":{"playoff":{"pts":1.8,"reb":0.5,"ast":0.5}}},{"id":"r_dev","n":"训练狂","r":"稀有","d":"开局额外+2成长点；以后每个休赛期额外+1成长点。","eff":{"dev":2,"offseasonDev":1}},{"id":"r_floor","n":"稳定核心","r":"稀有","d":"自信与教练信任最低都锁在60。","eff":{"confFloor":60,"trustFloor":60}},{"id":"iron","n":"钢铁之躯","r":"传奇","d":"常规伤病概率-25%。","eff":{}},{"id":"heart","n":"关键先生","r":"传奇","d":"关键/胶着比赛更稳定，分差≤7时有机会额外得到1~5分。","eff":{}},{"id":"learn","n":"超级学习力","r":"传奇","d":"24岁前成长判定效率+35%，且赛季成长额外+1关键能力。","eff":{}},{"id":"late","n":"第二春","r":"传奇","d":"30岁后首次明显衰退时：OVR+1、心态+2、投射+1。","eff":{}},{"id":"lucky","n":"命运眷顾","r":"传奇","d":"每赛季第一次重大伤病有65%概率降级，预计缺席场次缩短约62%。","eff":{}},{"id":"long","n":"长青树","r":"传奇","d":"32岁后年龄衰退速度降低20%。","eff":{}},{"id":"l_shooter","n":"天生射手","r":"传奇","d":"投射+7；投射加点额外+1；得分期望+1.2分。","eff":{"attrs":{"shooting":7},"pointBonus":{"shooting":1},"exp":{"pts":1.2}}},{"id":"l_inside","n":"禁区霸主","r":"传奇","d":"终结+6、篮板+5；得分+0.8、篮板+1.0期望。","eff":{"attrs":{"finishing":6,"rebounding":5},"exp":{"pts":0.8,"reb":1.0}}},{"id":"l_engine","n":"全能发动机","r":"传奇","d":"组织+7；助攻期望+1.5次；场均时间+1分钟。","eff":{"attrs":{"playmaking":7},"exp":{"ast":1.5},"minutes":1}},{"id":"l_lock","n":"年度防守模板","r":"传奇","d":"防守+7；抢断+0.30、盖帽+0.30期望。","eff":{"attrs":{"defense":7},"exp":{"stl":0.3,"blk":0.3}}},{"id":"l_body","n":"黄金身体","r":"传奇","d":"运动+5、耐久+7、健康+10，伤病概率-20%。","eff":{"attrs":{"athleticism":5,"durability":7},"h":10,"injMult":0.8}},{"id":"l_star","n":"天选核心","r":"传奇","d":"OVR修正+2，自信+8、教练信任+8。","eff":{"o":2,"c":8,"tr":8}},{"id":"l_growth","n":"无限加练","r":"传奇","d":"开局额外+3成长点；以后每个休赛期额外+1成长点。","eff":{"dev":3,"offseasonDev":1}},{"id":"l_floor","n":"绝对自信","r":"传奇","d":"自信和教练信任最低都锁在65。","eff":{"confFloor":65,"trustFloor":65}}];
function v210Talent(id){return V210_TALENTS.find(x=>x.id===id)}
function v210Effs(){return (career?.talents||[]).map(v210Talent).filter(Boolean).map(x=>x.eff||{})}
function v210Sum(field){return v210Effs().reduce((s,e)=>s+(Number(e[field])||0),0)}
function v210Mul(field){return v210Effs().reduce((m,e)=>m*(Number(e[field])||1),1)}
function v210Exp(field,playoff=false){let n=0;for(const e of v210Effs()){n+=Number(e.exp?.[field]||0);if(playoff)n+=Number(e.playoff?.[field]||0)}return n}
function v210EnforceFloors(){if(!career)return;let cf=0,tf=0;for(const e of v210Effs()){cf=Math.max(cf,Number(e.confFloor||0));tf=Math.max(tf,Number(e.trustFloor||0))}if(cf)career.confidence=Math.max(career.confidence,cf);if(tf)career.trust=Math.max(career.trust,tf)}
function v210ApplyImmediate(){if(!career||career._v210TalentApplied)return;for(const t of (career.talents||[]).map(v210Talent).filter(Boolean)){let e=t.eff||{};if(e.attrs)for(const [k,v] of Object.entries(e.attrs))career.attrs[k]=clamp(career.attrs[k]+v,30,99);if(e.h)career.health=clamp(career.health+e.h);if(e.c)career.confidence=clamp(career.confidence+e.c);if(e.tr)career.trust=clamp(career.trust+e.tr);if(e.o)career.ovrMod+=e.o;if(e.dev)career.devPoints+=e.dev}
 if(career.playerId==='simmons'&&hasTalent('simmons_x')){career.attrs.shooting=clamp(career.attrs.shooting+2,30,99);career.special=Math.max(career.special,72);career.confidence=clamp(career.confidence+3)}
 career._v210TalentApplied=true;v210EnforceFloors();syncOvr();let names=(career.talents||[]).map(id=>v210Talent(id)?.n).filter(Boolean);if(names.length)career.feed.unshift(`开局天赋生效：${names.join(' / ')}。具体数值已写入本局属性与成长规则。`);save()}

/* Simmons begins as a gifted but incomplete prospect */
(function(){
 let s=playerBy('simmons');Object.assign(s,{ovr:83,confidence:68,trust:74});Object.assign(s.attrs,{finishing:84,shooting:36,playmaking:88,defense:87,rebounding:83,athleticism:89,durability:76,mentality:69});
 Object.assign(playerBy('bennett').exclusive,{n:'状元翻案外挂·嘘声就是经验值',d:'【本内特刚需】开局自信+8、心态+3、逆风值总计+20；低谷累计6层就永久+1 OVR，每季最多3次；负面舆论造成的自信损失大幅返还。并解锁基于真实骑士→森林狼经历改编的完整专属剧情树。'});
 Object.assign(playerBy('oden').exclusive,{n:'健康奥登·钢铁神躯',d:'【奥登刚需】开局耐久+6、健康+8、身体风险总计-32；免疫生涯报销级伤病；所有伤病发生概率降低90%；每次伤病复出后耐久+2。并解锁基于波特兰伤病史与复出经历改编的完整专属剧情树。'});
 Object.assign(playerBy('kwame').exclusive,{n:'19岁完全重养·把状元重新练一遍',d:'【夸梅刚需】开局心态+6、成长耐心总计+25、教练信任+5；23岁前每次加点额外+1，每年自动补强2项最低能力，自信最低55。并解锁基于乔丹奇才时期与后续湖人生涯改编的完整专属剧情树。'});
 Object.assign(playerBy('fultz').exclusive,{n:'状元投篮包·把大学手感直接还给他',d:'【富尔茨刚需】开局投射+6、投篮稳定直接拉到65、自信+8；每次投射加点额外+1；稳定≥80后赛季末再+2投射并额外获得+1 OVR成长。并解锁基于肩部问题、TOS诊断与奥兰多重启改编的完整专属剧情树。'});
 Object.assign(playerBy('simmons').exclusive,{n:'完全体西蒙斯·敢投＋会投',d:'【西蒙斯刚需】开局投射总计+10、出手欲望至少72、自信总计+8；每次投射加点额外+1；季后赛每场自动额外制造2~4分，出手欲望不再跌破72。并解锁基于费城崛起、2021季后赛与交易风波改编的完整专属剧情树。'});
 if(playerBy('fultz').exclusive.cast)playerBy('fultz').exclusive.cast=playerBy('fultz').exclusive.cast.replace(/ · Judy Seto/g,'');
})();

function v210WeightedRarity(){let x=Math.random()*100;return x<38?'普通':x<72?'优秀':x<94?'稀有':'传奇'}
function v210RollTalents(){let used=new Set(),arr=[];while(arr.length<4){let r=v210WeightedRarity(),pool=V210_TALENTS.filter(t=>t.r===r&&!used.has(t.id));if(!pool.length)pool=V210_TALENTS.filter(t=>!used.has(t.id));let t=pick(pool);used.add(t.id);arr.push(t)}if(!arr.some(t=>t.r==='稀有'||t.r==='传奇')){let pool=V210_TALENTS.filter(t=>t.r==='稀有'||t.r==='传奇');arr[0]=pick(pool)}ui.talents=arr;ui.talentPick=null;ui.allTalents=false}
drawTalents=function(){v210RollTalents()};
openTalents=function(){ui.talentDrawCount=1;ui.talentAdRefreshes=0;ui.exclusive=false;ui.allTalents=false;v210RollTalents();ui.screen='talents';render()}
async function refreshTalentPool(){if(ui.allTalents)ui.allTalents=false;if((ui.talentDrawCount||1)<3){ui.talentDrawCount=(ui.talentDrawCount||1)+1;v210RollTalents();notify(`第${ui.talentDrawCount}/3次免费天赋抽取`)}else{await rewardAd.request('refresh_talents');ui.talentAdRefreshes=(ui.talentAdRefreshes||0)+1;v210RollTalents();notify(`广告刷新成功 · 已额外刷新${ui.talentAdRefreshes}次`)}render()}

const __v210Create=createCareer;
createCareer=function(){__v210Create();if(career){v210ApplyImmediate();v210EnforceFloors();save();render()}};
const __v210Stat=statExpect;
statExpect=function(){let x=__v210Stat();if(!career)return x;let po=career.stage==='playoffs';for(const k of ['pts','reb','ast','stl','blk'])x[k]=Math.max(0,(x[k]||0)+v210Exp(k,po));return x};
const __v210InjuryChance=injuryChance;
injuryChance=function(){return clamp(__v210InjuryChance()*v210Mul('injMult'),.08,5.5)};
const __v210TriggerInjury=triggerInjury;
triggerInjury=function(){__v210TriggerInjury();if(!career?.injury)return;let m=v210Mul('recoverMult');if(m<.999){career.injury.gamesLeft=Math.max(1,Math.ceil(career.injury.gamesLeft*m));career.injury.baseGames=career.injury.gamesLeft;career.feed.unshift(`天赋康复加成生效：预计缺席缩短到${career.injury.gamesLeft}场。`);save();render()}};
const __v210Sync=syncOvr;
syncOvr=function(){__v210Sync();if(!career)return;let b=Math.round(v210Sum('minutes'));if(b)career.minutes=Math.min(career.minutesLimit||99,clamp(career.minutes+b,10,38));v210EnforceFloors()};
const __v210AddPoint=addPoint;
addPoint=function(k){if(!career||career.devPoints<=0)return;let d0=career.devPoints;__v210AddPoint(k);if(!career||career.devPoints===d0)return;let bonus=0;for(const e of v210Effs())bonus+=Number(e.pointBonus?.[k]||0);if(bonus){career.attrs[k]=clamp(career.attrs[k]+bonus,30,99);career.feed.unshift(`天赋加点触发：${ATTR[k]}额外+${bonus}。`);syncOvr();save();render()}};
const __v210EndSeason=endSeason;
endSeason=function(result){__v210EndSeason(result);if(!career||career.retired)return;let extra=Math.round(v210Sum('offseasonDev'));if(extra){career.devPoints+=extra;career.feed.unshift(`天赋训练加成：本休赛期额外获得${extra}成长点。`);save();render()}};
const __v210Sim=simulateGame;
simulateGame=function(){__v210Sim();if(career){v210EnforceFloors();save()}};
const __v210StoryChoice=storyChoice;
storyChoice=function(i){__v210StoryChoice(i);if(career){v210EnforceFloors();save();render()}};

/* Fixed 4x pace, hidden from UI */
toggleSim=function(){if(ui.sim)stopSim();else{ui.speed=95;ui.sim=true;render();ui.interval=setInterval(()=>simulateGame(),95)}};
changeSpeed=function(){ui.speed=95};
const __v210Regular=regularView;
regularView=function(){let h=__v210Regular();h=h.replace('▶ 3× 模拟常规赛','▶ 开始模拟常规赛').replace(/<div class="v26-fixed-speed">[\s\S]*?<\/div>/,'');return h};

v26TalentEffect=function(id){let t=v210Talent(id);if(t)return[t.n,t.d,t.r];let p=currentP();if(id===p.exclusive.fx)return[p.exclusive.n,p.exclusive.d,'状元专属'];return[id,'正在影响你的生涯。','特殊']};
v26TalentClass=function(id){let t=v210Talent(id);if(!t)return 'q-exclusive';return t.r==='传奇'?'q-legend':t.r==='稀有'?'q-rare':t.r==='优秀'?'q-good':'q-common'};

renderTalents=function(){
 let p=playerBy(ui.selected),draw=ui.talentDrawCount||1,freeLeft=Math.max(0,3-draw);
 return `<section class="pre">
 <div class="pre-top"><button class="circle-btn" onclick="ui.screen='select';render()">←</button><strong>${p.zh} · 命运天赋</strong><span style="width:36px"></span></div>
 <div class="pre-intro"><small>DESTINY TALENTS · 68 CARDS</small><h2>先把这一局最值钱的东西拿到手</h2><p>本局共有3次免费天赋抽取机会。当前第 <b>${Math.min(draw,3)}/3</b> 次；免费次数用完后，可看广告继续刷新。四张卡至少保底1张稀有或传奇。</p></div>
 <div class="v210-drawbar"><div><small>本次抽取</small><b>${draw<=3?`免费 ${draw}/3`:`广告刷新 ×${ui.talentAdRefreshes||0}`}</b></div><button onclick="refreshTalentPool()">${freeLeft>0?`↻ 免费刷新 · 还剩${freeLeft}次`:'🎬 看广告 · 再刷一组'}</button></div>
 <div class="talent-wrap"><div class="talent-grid">${ui.talents.map((t,i)=>`<button class="talent-card ${qClass(t.r)} ${ui.talentPick===i?'selected':''}" onclick="ui.talentPick=${i};render()"><div class="rarity">${t.r}</div><h3>${t.n}</h3><p>${t.d}</p><div class="ghost">0${i+1}</div></button>`).join('')}</div></div>
 <div class="ad-hero v210-exclusive ${ui.exclusive?'unlocked':''}"><div class="ad-kicker">★ 状元专属 · 本局最关键广告</div><h3>${p.exclusive.n}</h3><p>${p.exclusive.d}</p><div class="ad-bonus"><span>刚需机制直接补齐</span><span>局内持续触发</span><span>解锁真实经历改编主线</span></div><button onclick="unlockExclusive()">${ui.exclusive?'✓ 已拿下专属天赋':'🎬 立即拿下 · 这才是真正的改命局'}</button></div>
 <div class="takeall-ad v210-takeall"><div class="reward-icon">×4</div><div><small>奖励视频 · 就在专属天赋下面</small><strong>不做四选一：当前四张随机天赋全部带走</strong></div><button onclick="takeAll()">${ui.allTalents?'✓ 已获得':'🎬 全部拿下'}</button></div>
 <div class="v210-story-note"><b>专属剧情说明</b><span>主线以真实选秀、伤病、球队关系、季后赛与交易节点为锚点改编；现实人物与事件基于真实经历，人物对白和玩家改写后的分支属于平行世界戏剧化演绎。</span></div>
 <div class="sticky-cta"><button class="btn primary" onclick="enterDraft()">进入选秀之夜 →</button></div></section>`;
};

const __v210StoryView=storyView;
storyView=function(){let h=__v210StoryView();if(career?.exclusive)h=h.replace('具体人名 + 历史锚点 + 多年连续分支。','真实经历改编 + 具体人物 + 多年连续分支。');return h};
const __v210Home=renderHome;
renderHome=function(){return __v210Home().replace('V2.2 · WORLDLINE','V2.10 · TALENT REBUILD')};
if(career){v210EnforceFloors();save()}
render();

/* === V2.11 LIFELONG EXCLUSIVE SAGA === */
function v211Init(){
 if(!career)return;
 career.records=Object.assign({gamePts:0,gameReb:0,gameAst:0,bestPpg:0,bestRpg:0,bestApg:0,bestOvr:career.ovr||0,bestSeason:''},career.records||{});
 career.gmSatisfaction=Math.round(career.gmSatisfaction==null?Math.round(((career.trust||50)+(career.confidence||50))/2):career.gmSatisfaction);
 career.fanHeat=Math.round(career.fanHeat==null?Math.round(38+(career.confidence||50)*.35+(career.ovr-70)*.8):career.fanHeat);
 career.seasonStorySeasons=career.seasonStorySeasons||[];
 career.seasonSagaUsed=career.seasonSagaUsed||[];
 career.seasonSagaKinds=career.seasonSagaKinds||[];
 career.contractHistory=career.contractHistory||[];
 career.signatureGames=career.signatureGames||[];
 career.playoffStoryKeys=career.playoffStoryKeys||[];
 if(career.fanHeat!=null)career.fanHeat=Math.round(career.fanHeat);
}
function v211HasSeasonStory(){v211Init();return career.seasonStorySeasons.includes(career.seasonNo)}
function v211MarkSeasonStory(){v211Init();if(!career.seasonStorySeasons.includes(career.seasonNo))career.seasonStorySeasons.push(career.seasonNo)}
function v211Ctx(){
 v211Init();let s=career.seasonStats||{},sat=teamSatisfaction(),t=teamBy(career.team),p=currentP();
 return{p,s,sat,t,year:career.seasonYear,season:career.seasonNo,age:career.age,role:career.role,ppg:+(s.pts||0).toFixed(1),rpg:+(s.reb||0).toFixed(1),apg:+(s.ast||0).toFixed(1),record:teamRecord(),fan:Math.round(career.fanHeat||0),gm:Math.round(career.gmSatisfaction||0),trust:Math.round(career.trust||0),route:v28Route(),bestPts:Math.round(career.records?.gamePts||0),bestReb:Math.round(career.records?.gameReb||0),bestAst:Math.round(career.records?.gameAst||0)}
}
function v211Fx(flags,extra={},narrative=null){return Object.assign({},extra,{flags,narrative})}
function v211Unique(pool){v211Init();let fresh=pool.filter(x=>!career.seasonSagaUsed.includes(x.id));if(!fresh.length)return null;let idx=(career.seasonNo*7+career.age*3+Math.round(career.ovr))%fresh.length;let x=fresh[idx];career.seasonSagaUsed.push(x.id);career.seasonSagaKinds.push(x.id);return x}
function v211OriginalName(label){return `<b>${label}</b>`}

function v211BennettSaga(){let c=v211Ctx(),team=c.t.name;return [
 {id:'ben-career-night',make:()=>({t:`克利夫兰旧记者又来了——这一次，他问你能不能把生涯最高分留在${team}`,scene:`${seasonLabel()} · 全国直播赛前`,speaker:'Kyrie Irving / Marcus Hale（平行世界发展教练）',cast:['Kyrie Irving','Marcus Hale（平行世界）'],b:`赛前通道里，你认出了那个从2013年就一直报道你的记者。他没有再问“为什么你会成为状元”，而是指着数据板上的生涯最高分 <b>${c.bestPts||'—'}</b>：“今晚如果手感来了，你会不会追纪录？”发展教练 <b>Marcus Hale</b> 把战术纸递给你，第一节有三套战术直接写着你的号码。`,stakes:'你可以主动追一次真正的生涯之夜，也可以拒绝为了纪录破坏现在的角色。',c:[['把前六次进攻都交给我，我要狠狠干一场','高风险高回报：直接冲击新的生涯最高分。',v211Fx([['sagaTone','revenge']],{c:5,tr:-1},{type:'careerHighPts',min:38,bonus:8,label:'状元翻案之夜'})],['不追分，我要用赢球让他换标题','球队关系上升，路线更偏成熟核心。',v211Fx([['sagaTone','win']],{tr:6,c:3},{type:'franchiseTrust',label:'拒绝刷纪录，选择赢球'})],['前三节正常打，第四节如果接近纪录再开火','折中路线：有机会刷新纪录，同时控制风险。',v211Fx([['sagaTone','balanced']],{c:3},{type:'careerHighPts',min:33,bonus:5,label:'第四节接管'})]]})},
 {id:'ben-franchise',make:()=>({t:`主教练把白板最上方的名字擦掉，又写上了你`,scene:`${seasonLabel()} · ${team}录像室`,speaker:'主教练 / Jalen Mercer（平行世界新秀锋线）',cast:['主教练','Jalen Mercer（平行世界）'],b:`球队最近十场开始把更多半场进攻交给你。训练后，主教练把战术板上原来的第一选项擦掉，写上你的号码。与此同时，球队刚选中的年轻锋线 <b>Jalen Mercer</b> 也在迅速成长。管理层必须决定：围绕你继续投入，还是提前把未来交给新人。`,stakes:'这是“被扶正”与“被替代”的真正分岔。',c:[['告诉教练：关键球给我，我承担结果','若球队认同，你会正式被扶正为核心。',v211Fx([['franchiseStatus','alpha']],{tr:6,c:5},{type:'franchise',label:'被球队正式扶正'})],['主动带Mercer训练，我愿意和他共存','降低冲突，建立领袖路线。',v211Fx([['franchiseStatus','mentor']],{tr:8},{type:'mentor',label:'从被质疑者变成导师'})],['让经纪人问清楚：如果不是核心，就把我送走','球队满意度下降，但你会拿回生涯主动权。',v211Fx([['franchiseStatus','ultimatum']],{tr:-6,teamTrade:3},{type:'feud',label:'向管理层下最后通牒'})]]})},
 {id:'ben-contract',make:()=>({t:`经纪人把三份报价摆成一排：第一次，钱不是“施舍”`,scene:`${seasonLabel()} · 合同谈判日`,speaker:'经纪人 / ${team}总经理',cast:['经纪人',`${team}总经理`],b:`早年你签任何合同都要先听一段“风险说明”。现在桌上第一次同时出现长约、争冠队邀约和高球权承诺。经纪人把最高的那份推到你面前：“你终于不是在求一个位置，而是在决定下一段人生值多少钱。”`,stakes:'结果可能是超级大合同、降薪争冠，也可能因为赌自己而进入合同风险。',c:[['要最长、最大的合同——我要把身价钉死','如果当前表现够强，直接签下生涯最大合同。',v211Fx([['moneyPath','max']],{c:5},{type:'contract',tier:'max'})],['少拿钱去争冠队，我要季后赛留下名字','合同金额下降，但冠军路线显著加强。',v211Fx([['moneyPath','title']],{tr:3},{type:'contract',tier:'title'})],['只签短约，我赌明年还能涨','高风险：表现下滑可能直接沦落底薪。',v211Fx([['moneyPath','bet']],{c:3},{type:'contract',tier:'bet'})]]})},
 {id:'ben-feud',make:()=>({t:`暂停结束，你没有上场——助教告诉你这是管理层的决定`,scene:`${seasonLabel()} · 第四节替补席`,speaker:'主教练 / Marcus Hale / 管理层',cast:['主教练','Marcus Hale（平行世界）','球队总经理'],b:`你已经连续三场第四节被换下。今晚比分只差2分，主教练却再次叫了别人的名字。发展教练 Marcus Hale低声告诉你：管理层希望给年轻资产更多时间。你突然意识到，这不是战术问题，而是球队方向变了。`,stakes:'你可以直接决裂、公开争位置，也可以把愤怒留在球场。',c:[['赛后直接进总经理办公室：给我解释','冲突升级，可能触发交易。',v211Fx([['teamConflict','frontoffice']],{tr:-7,teamTrade:4},{type:'feud',label:'与管理层公开决裂'})],['不说话，下一场用数据把位置打回来','自信提升，触发生涯之夜机会。',v211Fx([['teamConflict','court']],{c:6},{type:'careerNight',label:'用比赛回应管理层'})],['接受短期替补，但要求明确季后赛角色','关系修复，角色更稳定。',v211Fx([['teamConflict','repair']],{tr:6},{type:'franchiseTrust',label:'谈判拿回季后赛角色'})]]})},
 {id:'ben-minimum',make:()=>({t:`电话安静了整整三天，第四天只有一份老将底薪`,scene:`${seasonLabel()} · 自由市场`,speaker:'经纪人 / 老球队总经理',cast:['经纪人','球队总经理'],b:`你曾经以为翻案之后就再也不会经历这种等待。但年龄和状态让市场重新冷下来。经纪人的手机到第四天才响：一份一年老将底薪，没有保证首发，没有承诺轮换。电话那头只说：“训练营里自己抢。”`,stakes:'这是晚年最残酷的选择：接受底薪延续生涯、退一步当导师，或赌还有更好的机会。',c:[['签。只要还有球馆，我就继续打','接受底薪，进入老将求生线。',v211Fx([['latePath','minimum']],{c:3},{type:'contract',tier:'minimum'})],['接受，但我要把年轻人带出来','底薪+导师路线，球队关系显著提升。',v211Fx([['latePath','mentor']],{tr:8},{type:'contract',tier:'minimumMentor'})],['拒绝，我再等两周','高风险：可能拿到更好报价，也可能没人再打电话。',v211Fx([['latePath','wait']],{c:-3},{type:'contract',tier:'wait'})]]})},
 {id:'ben-playoff',make:()=>({t:`季后赛前夜，Kyrie发来一句：“这次别让他们替你写结局。”`,scene:`${seasonLabel()} · 酒店房间`,speaker:'Kyrie Irving / 你',cast:['Kyrie Irving'],b:`手机亮起，是 <b>Kyrie Irving</b>。你们已经不一定还在同一支球队，但他只发了一句：“这次别让他们替你写结局。”窗外是客场球馆的灯。你想起新秀年那些笑声，也想起自己已经走了多远。`,stakes:'这会把本季季后赛变成一段真正的个人叙事，而不是普通系列赛。',c:[['我要打一场所有人都记得的代表作','写入“季后赛代表作”里程碑，信心提升。',v211Fx([['playoffMind','hero']],{c:7},{type:'careerNight',label:'季后赛代表作'})],['只要赢，不管我拿几分','球队信任明显提升。',v211Fx([['playoffMind','team']],{tr:8},{type:'franchiseTrust',label:'季后赛团队核心'})],['我想在克利夫兰面前结束这轮系列赛','若对阵旧主，世界线评价显著提升。',v211Fx([['playoffMind','closure']],{c:5},{type:'record',label:'旧主终结战'})]]})}
]}

function v211OdenSaga(){let c=v211Ctx(),team=c.t.name;return [
 {id:'od-health60',make:()=>({t:`第60场结束，队医第一次把“健康”两个字写进赛季报告`,scene:`${seasonLabel()} · ${team}医疗室`,speaker:'Mike Conley Sr. / Aaron Weiss（平行世界运动医学主管）',cast:['Mike Conley Sr.','Aaron Weiss（平行世界）'],b:`你打完了本季第60场。运动医学主管 <b>Aaron Weiss</b> 把检查报告递给你，Mike Conley Sr.坐在旁边。报告上没有“手术”、没有“停赛”，只有一句：稳定。对别人来说这只是普通词，对你来说像一座奖杯。`,stakes:'你可以开始追求更高负荷，也可以把健康本身当成职业生涯最大优势。',c:[['解除大部分分钟限制，我想看看完整奥登能到哪','提高上限，也重新打开风险。',v211Fx([['odenLate','ceiling']],{min:34,c:5,s:7},{type:'careerHighReb',min:18,bonus:4,label:'健康奥登篮板之夜'})],['继续限制分钟——我要把健康带进五月','健康、耐久继续提高。',v211Fx([['odenLate','protect']],{h:8,s:-6},{type:'record',label:'生涯首次健康60场'})],['常规赛保护，季后赛再解除限制','冠军路线，季后赛会额外触发关键剧情。',v211Fx([['odenLate','playoffs']],{h:4,tr:4},{type:'franchiseTrust',label:'球队接受奥登负荷方案'})]]})},
 {id:'od-record-board',make:()=>({t:`记分台说你已经17个篮板，Aldridge问：要不要把纪录拿了？`,scene:`${seasonLabel()} · 第四节还剩6分钟`,speaker:'LaMarcus Aldridge / 内线教练',cast:['LaMarcus Aldridge','内线教练'],b:`暂停回来，技术台显示你已经抓下17个篮板。<b>LaMarcus Aldridge</b> 朝你笑：“你那生涯纪录是多少来着？”对手开始两个人卡你。内线教练则提醒，膝盖今天的负荷已经接近上限。`,stakes:'这是最典型的奥登选择：纪录就在眼前，身体也在提醒你。',c:[['我要20+，这场不下','直接冲击生涯篮板纪录。',v211Fx([['recordRisk','push']],{h:-3,c:5,s:4},{type:'careerHighReb',min:20,bonus:3,label:'20篮板之夜'})],['够了，最后六分钟保护身体','健康上升，错过纪录。',v211Fx([['recordRisk','stop']],{h:7,s:-4},{type:'record',label:'主动放弃个人纪录'})],['只打关键防守回合','兼顾胜负与负荷。',v211Fx([['recordRisk','situational']],{tr:5,h:2},{type:'franchiseTrust',label:'关键防守使用方案'})]]})},
 {id:'od-medical-split',make:()=>({t:`两份医疗意见完全相反：一个说能打，一个说必须停`,scene:`${seasonLabel()} · 赛前医学会议`,speaker:'Aaron Weiss / 主教练 / Mike Conley Sr.',cast:['Aaron Weiss（平行世界）','主教练','Mike Conley Sr.'],b:`MRI没有出现明确结构损伤，但你的膝盖连续两天肿胀。Aaron Weiss认为可以限制出场，另一位顾问坚持至少休两周。主教练看着你：“最后决定你自己做。”`,stakes:'这里会影响球队是否继续把你视为可长期依赖的核心。',c:[['休两周，我不再和身体赌概率','健康大增，球队信任你的成熟。',v211Fx([['medicalSplit','rest']],{h:10,tr:5,s:-5},{type:'record',label:'主动休战保护生涯'})],['限制20分钟继续打','折中路线。',v211Fx([['medicalSplit','limit']],{min:20,h:3},{type:'franchiseTrust',label:'医学限制下继续贡献'})],['打满，我知道自己的身体','短期冲刺，风险明显增加。',v211Fx([['medicalSplit','play']],{c:6,h:-5,s:9},{type:'careerNight',label:'带风险出战'})]]})},
 {id:'od-contract',make:()=>({t:`合同里第一次出现“伤病保护条款”——你盯着那一页看了很久`,scene:`${seasonLabel()} · 续约谈判`,speaker:'Mike Conley Sr. / ${team}总经理',cast:['Mike Conley Sr.',`${team}总经理`],b:`球队愿意给长约，但合同里写着与出场场次、膝部检查挂钩的保障条款。Mike Conley Sr.把笔放下：“钱很多，但这份合同等于每天提醒你，他们仍然不完全相信这双膝盖。”`,stakes:'你可以换保障、换年限、换球队信任。',c:[['接受保护条款，拿五年长约','锁定大合同和稳定环境。',v211Fx([['contractPath','protectedMax']],{tr:4},{type:'contract',tier:'max'})],['少拿一年，删掉大部分伤病条款','证明身体路线，风险更高。',v211Fx([['contractPath','clean']],{c:5},{type:'contract',tier:'shortStar'})],['拒绝续约，去真正愿意无条件赌我的球队','进入自由市场高风险线。',v211Fx([['contractPath','market']],{teamTrade:2},{type:'feud',label:'因伤病条款与球队谈崩'})]]})},
 {id:'od-veteran-min',make:()=>({t:`你已经不是“如果健康的状元”，而是一个球队愿不愿意给第15个名额的老中锋`,scene:`${seasonLabel()} · 九月训练馆`,speaker:'Mike Conley Sr. / 争冠队总经理',cast:['Mike Conley Sr.','争冠队总经理'],b:`训练馆里没有媒体，只有几支球队的球探。对方愿意给一份非保障底薪，要求你在训练营证明还能连续移动。Mike Conley Sr.没有安慰你，只问：“你还想打吗？”`,stakes:'可能沦落底薪，也可能用最后一次机会成为季后赛奇兵。',c:[['签底薪，我只需要一次季后赛机会','接受底薪，进入最后争冠线。',v211Fx([['latePath','minimum']],{c:3},{type:'contract',tier:'minimum'})],['要求保障合同，否则不去','可能失去报价，但保留尊严。',v211Fx([['latePath','guarantee']],{c:2},{type:'contract',tier:'wait'})],['接受训练营，但主动把角色改成替补护框','降低负荷、延长生涯。',v211Fx([['latePath','backup']],{h:6,min:18},{type:'contract',tier:'minimumMentor'})]]})},
 {id:'od-legacy',make:()=>({t:`波特兰大屏幕同时放出Roy、Aldridge和你——观众终于看到那支“本来可能存在”的球队`,scene:`${seasonLabel()} · 重返波特兰`,speaker:'Brandon Roy / LaMarcus Aldridge / 现场播报',cast:['Brandon Roy','LaMarcus Aldridge'],b:`暂停期间，大屏幕播放旧录像：Roy的后仰、Aldridge的中投、你在篮下的封盖。全场起立。赛后Roy在通道里抱了你一下：“我们至少让他们真的看到了几次。”你发现，“如果健康”已经不再是唯一描述。`,stakes:'决定你的后半生是继续追冠军、追数据，还是接受自己成为一段球队历史。',c:[['我还要再打一次西决甚至总决赛','继续追冠军。',v211Fx([['legacyLate','title']],{c:5,tr:4},{type:'record',label:'奥登继续追逐冠军'})],['我想把生涯篮板纪录再往上抬','个人纪录路线。',v211Fx([['legacyLate','records']],{c:4},{type:'careerHighReb',min:18,bonus:5,label:'老将篮板纪录'})],['我想帮助下一个脆弱的大个子少走弯路','导师与健康文化路线。',v211Fx([['legacyLate','mentor']],{tr:8},{type:'mentor',label:'奥登成为年轻中锋导师'})]]})}
]}

function v211KwameSaga(){let c=v211Ctx(),team=c.t.name;return [
 {id:'kw-core',make:()=>({t:`主教练把最后5分钟的防守任务交给你：这一次不是因为身高，是因为信任`,scene:`${seasonLabel()} · ${team}赛前录像会`,speaker:'主教练 / Terrence Cole（平行世界内线教练）',cast:['主教练','Terrence Cole（平行世界）'],b:`录像结束，主教练没有讨论你的选秀顺位，只把对方最难防的内线圈出来：“最后五分钟，你负责。”内线教练 <b>Terrence Cole</b> 朝你点头。年轻时你最害怕犯错，现在教练却把最不能犯错的回合交给你。`,stakes:'这是从“不要犯错”到“球队依赖你”的身份变化。',c:[['我要守住他，也要在另一端要球','攻防核心路线。',v211Fx([['kwRole','twoWay']],{tr:7,c:4},{type:'franchise',label:'夸梅被扶正为攻防核心'})],['只管防守和篮板，最后五分钟我不抢戏','稳定赢球路线。',v211Fx([['kwRole','defense']],{a:{defense:2,rebounding:1},tr:8},{type:'franchiseTrust',label:'关键防守核心'})],['我要教年轻内线怎么守这种人','领袖路线。',v211Fx([['kwRole','mentor']],{tr:7},{type:'mentor',label:'夸梅成为内线导师'})]]})},
 {id:'kw-hands',make:()=>({t:`连续三场零黄油手，Kobe当年那句骂声却又在脑子里响起来`,scene:`${seasonLabel()} · 训练结束`,speaker:'Kobe Bryant（记忆） / Terrence Cole',cast:['Kobe Bryant（回忆）','Terrence Cole（平行世界）'],b:`你连续三场没有出现低级接球失误。训练结束后，Terrence Cole把球一遍遍砸向你的胸口。你忽然想起洛杉矶那些最刺耳的声音——包括Kobe在高压训练里的怒吼。很多年后，你终于能把那段经历和“我就是不行”分开。`,stakes:'你可以把旧创伤变成技术仪式、公开讲出来，或彻底不再提。',c:[['每天训练后再接100次高速传球','手感和终结成长。',v211Fx([['handsLegacy','routine']],{a:{finishing:2,mentality:1},c:3},{type:'record',label:'连续稳定接球成为新标签'})],['第一次公开讲那段压力到底是什么感觉','球迷支持大幅提升。',v211Fx([['handsLegacy','speak']],{c:6,tr:3},{type:'mentor',label:'公开谈论年轻球员心理压力'})],['不回忆了，我只看现在','心态提升。',v211Fx([['handsLegacy','moveon']],{a:{mentality:3}},{type:'franchiseTrust',label:'夸梅彻底摆脱旧标签'})]]})},
 {id:'kw-2020',make:()=>({t:`记分员抬头：18分18篮板。队友问你，要不要把20+20拿了？`,scene:`${seasonLabel()} · 第四节`,speaker:'队友 / 主教练',cast:['球队控卫','主教练'],b:`比赛还剩4分12秒，你已经18分18篮板。全场开始意识到一个数字：20+20。主教练原本准备把你换下，队内控卫却问：“要不要再打两个回合？”`,stakes:'一次很具体的生涯纪录机会。',c:[['别换我，我要20+20','冲击生涯之夜。',v211Fx([['recordPush','20x20']],{c:5},{type:'double20',label:'生涯20+20之夜'})],['赢了就行，换年轻人上','领袖与球队关系提升。',v211Fx([['recordPush','team']],{tr:8},{type:'mentor',label:'放弃20+20让年轻人收尾'})],['只再打两个防守回合','可能刷新篮板纪录但控制负荷。',v211Fx([['recordPush','boards']],{c:2},{type:'careerHighReb',min:20,bonus:2,label:'篮板生涯新高'})]]})},
 {id:'kw-conflict',make:()=>({t:`年轻中锋在采访里说“球队需要更现代的五号位”——你知道他在说谁`,scene:`${seasonLabel()} · 更衣室`,speaker:'年轻中锋 Malik Foster（平行世界） / 主教练',cast:['Malik Foster（平行世界）','主教练'],b:`球队新秀 <b>Malik Foster</b> 在采访里谈到空间、换防和三分，最后说：“球队需要更现代的五号位。”回到更衣室，所有人都安静了一秒。你清楚这不是战术讨论，而是在抢位置。`,stakes:'可以正面决裂、用训练说话，或主动转型导师。',c:[['当面问他：你想要位置就来训练里拿','竞争升级，可能形成更衣室矛盾。',v211Fx([['youngConflict','fight']],{tr:-4,c:5,teamTrade:2},{type:'feud',label:'与年轻中锋公开竞争'})],['不回应媒体，用连续比赛证明我还能首发','数据与角色路线。',v211Fx([['youngConflict','court']],{c:4},{type:'careerNight',label:'老将用表现守住首发'})],['主动教他防守细节，接受轮换变化','导师路线，球队满意度显著上升。',v211Fx([['youngConflict','mentor']],{tr:9},{type:'mentor',label:'从竞争者变成导师'})]]})},
 {id:'kw-contract',make:()=>({t:`一份4年合同摆在面前——19岁的你从没想过自己还能决定球队未来`,scene:`${seasonLabel()} · 续约谈判`,speaker:'经纪人 / ${team}总经理',cast:['经纪人',`${team}总经理`],b:`总经理说球队愿意用四年合同把你留下，不是因为状元履历，而是因为防守、出勤和更衣室价值。经纪人提醒你：这是职业生涯第一次真正意义上的长期安全感。`,stakes:'大合同、争冠降薪和短约再赌一次会进入不同后续。',c:[['签下这份大合同，我要稳定下来','获得长期高额合同。',v211Fx([['moneyPath','security']],{tr:6},{type:'contract',tier:'big'})],['少拿钱去更强球队，我想打更深的季后赛','冠军路线。',v211Fx([['moneyPath','title']],{c:3},{type:'contract',tier:'title'})],['只签两年，我还想证明自己不只是蓝领','风险与上限并存。',v211Fx([['moneyPath','bet']],{c:5},{type:'contract',tier:'bet'})]]})},
 {id:'kw-minimum',make:()=>({t:`训练营名单第15个名字是你——没有保证合同，也没有状元光环`,scene:`${seasonLabel()} · 九月训练营`,speaker:'主教练 / Terrence Cole',cast:['主教练','Terrence Cole（平行世界）'],b:`合同只是一年最低薪，甚至不是完全保障。训练营第一天，教练把所有中锋叫到一起：“四个人，最后留三个。”你看着比你年轻十岁的竞争者，突然回到职业生涯最原始的问题：还能不能留在联盟？`,stakes:'可能沦落底薪、抢回轮换，或主动转成导师。',c:[['我就从第15人打起','接受底薪并争取轮换。',v211Fx([['latePath','minimum']],{c:4},{type:'contract',tier:'minimum'})],['告诉教练我愿意只负责防守和掩护','提高留队概率。',v211Fx([['latePath','role']],{tr:7,min:16},{type:'franchiseTrust',label:'底薪老将赢得功能角色'})],['如果只想让我坐板凳，我宁愿等别队','可能直接失去合同。',v211Fx([['latePath','wait']],{c:2},{type:'contract',tier:'wait'})]]})}
]}

function v211FultzSaga(){let c=v211Ctx(),team=c.t.name;return [
 {id:'fz-30',make:()=>({t:`第四节还剩7分钟，你已经27分——教练问：今晚要不要把30分这道坎跨过去？`,scene:`${seasonLabel()} · ${team}主场`,speaker:'主教练 / Noah Carter（平行世界投篮教练）',cast:['主教练','Noah Carter（平行世界）'],b:`你过去最熟悉的是别人分析你的动作。今晚全场却只在等一个数字：30。投篮教练 <b>Noah Carter</b> 在板凳边说：“别为了30改变动作。”主教练则把下一回合的球权交给你。`,stakes:'这是富尔茨线最重要的心理翻转之一：为了得分主动投，而不是为了证明动作正常。',c:[['我要30，而且最后一球我自己来','冲击生涯得分新高。',v211Fx([['fultzScorer','attack']],{c:6,s:4},{type:'careerHighPts',min:30,bonus:7,label:'富尔茨30+之夜'})],['正常打，空位就投，不追数字','投篮稳定和球队信任提高。',v211Fx([['fultzScorer','flow']],{s:7,tr:5},{type:'franchiseTrust',label:'不再被数字和动作绑架'})],['我想冲三双，不只证明能得分','组织路线，可能写入三双里程碑。',v211Fx([['fultzScorer','triple']],{c:4},{type:'tripleDouble',label:'富尔茨三双之夜'})]]})},
 {id:'fz-shotcoach',make:()=>({t:`Noah Carter把你的大学录像和现在并排：终于不是“修复”，而是“升级”`,scene:`${seasonLabel()} · 夏季训练馆`,speaker:'Noah Carter（平行世界投篮教练）',cast:['Noah Carter（平行世界）'],b:`过去所有训练都在问“怎么回到原来的动作”。这一次，Noah Carter却说：“别回去。你的身体、肩部和节奏都变了，我们做一套属于现在的投篮。”他把出手点、脚步和接球角度全部重新标注。`,stakes:'可以追求真正的稳定三分、继续以突破组织为主，或做中距离杀手。',c:[['我要把接球三分练到对手不敢放','投射显著成长。',v211Fx([['shotIdentity','spotup']],{a:{shooting:3},s:8},{type:'record',label:'投篮包升级为稳定接球三分'})],['三分够用就行，我要把挡拆组织做到顶级','组织核心路线。',v211Fx([['shotIdentity','creator']],{a:{playmaking:3,mentality:1}},{type:'franchise',label:'球队把富尔茨扶正为组织核心'})],['我要做中距离和抛投，不跟三分死磕','独特得分路线。',v211Fx([['shotIdentity','midrange']],{a:{finishing:2,shooting:2},c:3},{type:'careerNight',label:'富尔茨开发中距离杀招'})]]})},
 {id:'fz-contract',make:()=>({t:`四年前没人敢给你的身体下注，现在桌上出现了九位数合同`,scene:`${seasonLabel()} · 经纪人办公室`,speaker:'经纪人 / ${team}总经理',cast:['经纪人',`${team}总经理`],b:`总经理把长期续约放在桌上，数字已经来到九位数级别。经纪人看着你：“当年所有合同都在问你的肩膀，现在他们在问怎么把你留住。”你知道这不只是一份钱，更像一张职业生涯翻案证明。`,stakes:'可签超级长约、短约继续赌上限，或降薪争冠。',c:[['签下最大长期合同，我要把这里变成家','获得超级合同与球队核心地位。',v211Fx([['moneyPath','max']],{tr:7,c:5},{type:'contract',tier:'max'})],['签短约，我还没到真正巅峰','赌下一份更大的合同。',v211Fx([['moneyPath','bet']],{c:5},{type:'contract',tier:'bet'})],['少拿钱去争冠阵容，我想打六月篮球','冠军路线。',v211Fx([['moneyPath','title']],{tr:3},{type:'contract',tier:'title'})]]})},
 {id:'fz-guardbattle',make:()=>({t:`球队用乐透签选了控卫 Eli Brooks——发布会第一句就是“未来后场核心”`,scene:`${seasonLabel()} · 选秀后训练馆`,speaker:'Eli Brooks（平行世界新秀） / 主教练',cast:['Eli Brooks（平行世界）','主教练'],b:`新秀 <b>Eli Brooks</b> 第一次训练就敢跟你对位。他快、年轻、合同便宜。媒体把你们的每次训练都写成“新旧控卫之争”。主教练告诉你：球队不会因为过去的故事保证任何人的位置。`,stakes:'可以与新秀竞争、共存，或主动要求更明确的球队定位。',c:[['训练里狠狠干他，首发位置谁也别让','竞争线，表现上限更高，关系风险增加。',v211Fx([['guardBattle','fight']],{c:6,tr:-2},{type:'feud',label:'与乐透控卫公开竞争'})],['主动带他做挡拆阅读，我们可以双控','双控共存，球队满意度提高。',v211Fx([['guardBattle','pair']],{tr:8,a:{playmaking:1}},{type:'mentor',label:'富尔茨带新人组成双控'})],['跟管理层谈：如果要重建，请提前告诉我','成熟谈判，可能触发交易。',v211Fx([['guardBattle','clarity']],{teamTrade:2},{type:'feud',label:'要求管理层明确未来'})]]})},
 {id:'fz-clutch',make:()=>({t:`最后8秒，没有暂停。你从后场接球，曾经“不会投篮”的人现在要决定比赛`,scene:`${seasonLabel()} · 客场最后一攻`,speaker:'主教练 / Noah Carter',cast:['主教练','Noah Carter（平行世界）'],b:`比分打平，没有暂停。你从后场接球，过半场时防守人后退一步——那是过去对手最熟悉的防法。Noah Carter在场边没有喊战术。你可以在弧顶直接拔、冲到篮下，或者把球交出去。`,stakes:'可能产生超远绝杀、生涯关键球标签，或者把旧心理阴影重新翻出来。',c:[['过LOGO一步就拔——我要用最不可能的方式结束比赛','高风险：成功会写入超远绝杀里程碑。',v211Fx([['clutchIdentity','logo']],{c:6},{type:'buzzer',style:'logo',label:'超远距离压哨绝杀'})],['直接杀篮下，我信我的第一步','更稳定的关键球路线。',v211Fx([['clutchIdentity','drive']],{c:4},{type:'buzzer',style:'drive',label:'突破压哨绝杀'})],['吸引包夹后传底角，我不需要证明自己必须投','组织核心路线，球队信任提升。',v211Fx([['clutchIdentity','pass']],{tr:8},{type:'franchiseTrust',label:'关键回合做出正确传球'})]]})},
 {id:'fz-minimum',make:()=>({t:`又一次伤病后，自由市场只剩一年底薪——但这次你知道自己怎么重新开始`,scene:`${seasonLabel()} · 夏天`,speaker:'经纪人 / Noah Carter',cast:['经纪人','Noah Carter（平行世界）'],b:`电话不再像巅峰时那么多。唯一明确的报价是一年底薪，球队希望你当替补控卫。Noah Carter没有安慰，只问：“你当年从不会自然抬手投篮都走回来了，现在还怕从替补开始吗？”`,stakes:'底薪、等待或者转型导师，都会进入不同生涯晚期。',c:[['签底薪，我再重启一次','接受底薪，继续生涯。',v211Fx([['latePath','minimum']],{c:4},{type:'contract',tier:'minimum'})],['等一支真正缺控卫的球队','有机会拿更大角色，也可能失去市场。',v211Fx([['latePath','wait']],{c:2},{type:'contract',tier:'wait'})],['接受替补，但我要负责带年轻后卫','导师路线。',v211Fx([['latePath','mentor']],{tr:8},{type:'contract',tier:'minimumMentor'})]]})}
]}

function v211SimmonsSaga(){let c=v211Ctx(),team=c.t.name;return [
 {id:'sim-threes',make:()=>({t:`第三节你已经命中2记三分，Embiid在板凳席喊：再投一个！`,scene:`${seasonLabel()} · 全国直播`,speaker:'Joel Embiid / 投篮教练 Mason Reed（平行世界）',cast:['Joel Embiid','Mason Reed（平行世界）'],b:`你本场前两次空位三分都进了。第三节暂停，<b>Joel Embiid</b> 隔着两个座位冲你喊：“再投一个，他们还敢放！”投篮教练 Mason Reed只说：“动作别变。”全场已经开始等第三次。`,stakes:'这是西蒙斯线里最直观的“封印解除”时刻。',c:[['第三个空位我还投，而且以后也这么打','投射和出手欲望继续提高。',v211Fx([['shootIdentity','real']],{a:{shooting:2},s:8,c:4},{type:'record',label:'单场命中3记三分'})],['这场够了，我不想为了故事乱投','稳定路线，球队信任提高。',v211Fx([['shootIdentity','controlled']],{tr:6,s:2},{type:'franchiseTrust',label:'投篮成为武器而非表演'})],['下一次我直接拔超远三分','极高风险，成功会成为世界线名场面。',v211Fx([['shootIdentity','logo']],{c:5},{type:'buzzer',style:'logo',label:'西蒙斯超远三分名场面'})]]})},
 {id:'sim-30td',make:()=>({t:`28分11篮板10助攻——最后两分钟，数据板告诉你还差2分就是30分三双`,scene:`${seasonLabel()} · 第四节`,speaker:'Joel Embiid / 主教练',cast:['Joel Embiid','主教练'],b:`你已经拿到三双，比分也领先。数据板上是28分、11篮板、10助攻。Embiid在罚球线看向你：“30分三双，拿不拿？”过去所有人都说你不够主动，这次答案就在两次进攻里。`,stakes:'可能打出生涯之夜，也可以主动把球交给队友结束比赛。',c:[['我要30分三双，而且最后一攻也给我','直接写入生涯之夜。',v211Fx([['triplePath','attack']],{c:6,s:5},{type:'tripleDouble30',label:'30分三双生涯之夜'})],['三双够了，别为了数字受伤','健康和成熟度提升。',v211Fx([['triplePath','safe']],{h:4,a:{mentality:1}},{type:'record',label:'主动放弃30分三双'})],['让替补阵容打完，我去给他们喊战术','领袖路线。',v211Fx([['triplePath','leader']],{tr:8},{type:'mentor',label:'核心主动让出个人纪录'})]]})},
 {id:'sim-spacing-feud',make:()=>({t:`球队头号得分手在录像会上暂停画面：你站的位置，把我的突破路线堵死了`,scene:`${seasonLabel()} · 录像室`,speaker:'球队头号得分手 / 主教练 / Rich Paul',cast:['球队头号得分手','主教练','Rich Paul'],b:`录像停在一个半场回合。对方中锋站在油漆区，你的防守人也缩在里面。球队头号得分手指着屏幕：“这就是问题。”房间瞬间安静。你知道这不是第一次有人谈空间，但这是第一次队友当面把它摆到你面前。`,stakes:'可以正面开发投射、接受无球转型，或者关系彻底破裂。',c:[['从今天开始每场必须出手三分','正面解决空间问题。',v211Fx([['spacingConflict','shoot']],{a:{shooting:3},s:10},{type:'record',label:'强制投射纪律启动'})],['我改打更多中锋和掩护人，不占持球空间','位置重塑路线。',v211Fx([['spacingConflict','center']],{a:{rebounding:2,defense:2},tr:5},{type:'franchiseTrust',label:'主动转型前场中枢'})],['告诉管理层：如果他觉得不能共存，就交易一个','关系决裂，高概率交易。',v211Fx([['spacingConflict','break']],{tr:-8,teamTrade:5},{type:'feud',label:'与球队核心公开决裂'})]]})},
 {id:'sim-max',make:()=>({t:`Rich Paul把合同翻到最后一页：5年顶薪，外加球队围绕你的承诺`,scene:`${seasonLabel()} · Klutch会议室`,speaker:'Rich Paul / ${team}总经理',cast:['Rich Paul',`${team}总经理`],b:`Rich Paul把报价放在桌面中央。金额已经是超级合同级别，但真正重要的是附带的承诺：首发控球权、季后赛收官阵容、球队引援会考虑你的打法。你突然发现，签字意味着球队真的要把未来押在“这个版本的Ben Simmons”身上。`,stakes:'签超级合同会大幅提升地位，也会把季后赛责任全部压回来。',c:[['签。我要这支球队围绕我赢','超级大合同+核心地位。',v211Fx([['moneyPath','max']],{tr:7,c:6},{type:'contract',tier:'max'})],['少拿一点，但要求阵容必须有四个射手','阵容适配优先。',v211Fx([['moneyPath','fit']],{tr:5},{type:'franchise',label:'球队按西蒙斯打法重建阵容'})],['只签短约，我不想再被长期合同锁死','短约高风险路线。',v211Fx([['moneyPath','bet']],{c:4},{type:'contract',tier:'bet'})]]})},
 {id:'sim-clutch',make:()=>({t:`最后1.1秒，边线球发到你手里——离篮筐还有11米`,scene:`${seasonLabel()} · 客场最后一攻`,speaker:'主教练 / Joel Embiid（旧友短信）',cast:['主教练','Joel Embiid（旧友）'],b:`比分打平，只剩1.1秒。你在接近LOGO的位置接到球，根本没有时间突破。过去的你可能会第一时间找队友。现在，全场都知道只剩一种选择。就在发球前，你手机里还躺着Embiid赛前发来的那句：“有机会就别想，投。”`,stakes:'这是最极端的西蒙斯世界线名场面：超远出手、传球，或叫暂停重开。',c:[['接球转身直接拔——我投','成功会写入超远压哨绝杀。',v211Fx([['clutchIdentity','logo']],{c:8,s:5},{type:'buzzer',style:'logo',label:'LOGO压哨绝杀'})],['假投吸引两人，甩给底角','组织核心路线，成功会写入绝杀助攻。',v211Fx([['clutchIdentity','assist']],{tr:7},{type:'buzzer',style:'assist',label:'压哨绝杀助攻'})],['叫暂停，把最后一球画成低位强攻','更稳的核心打法。',v211Fx([['clutchIdentity','post']],{c:4},{type:'buzzer',style:'post',label:'最后一攻低位绝杀'})]]})},
 {id:'sim-minimum',make:()=>({t:`曾经的顶薪状元，现在只收到一份老将底薪——Rich Paul没有替你遮数字`,scene:`${seasonLabel()} · 自由市场`,speaker:'Rich Paul / 争冠队总经理',cast:['Rich Paul','争冠队总经理'],b:`Rich Paul把手机放到桌上：“这是目前唯一正式报价。”一年老将底薪，定位是替补防守和组织。没有首发承诺，没有球权承诺。你曾拿过大合同，也曾被讨论成建队核心，现在市场只问你还愿不愿意接受角色。`,stakes:'这决定生涯晚期是底薪求生、角色转型还是提前离开联盟。',c:[['签。我要用季后赛重新抬价','底薪求生路线。',v211Fx([['latePath','minimum']],{c:5},{type:'contract',tier:'minimum'})],['接受底薪，但我要当替补中锋而不是控卫','彻底位置转型。',v211Fx([['latePath','center']],{a:{defense:2,rebounding:2},tr:5},{type:'contract',tier:'minimumMentor'})],['拒绝，我等更大的角色','可能失去全部市场。',v211Fx([['latePath','wait']],{c:-2},{type:'contract',tier:'wait'})]]})}
]}

/* 剧情与球队现状绑定：每条剧情记录它属于哪支球队，交易后不再出现旧球队的人与地名。 */
const V211_TEAM_PIN={
 'ben-career-night':'CLE','ben-playoff':'CLE',
 'od-health60':'POR','od-record-board':'POR','od-medical-split':'POR','od-contract':'POR','od-veteran-min':'POR','od-legacy':'POR',
 'kw-hands':'LAL',
 'sim-threes':'PHI','sim-30td':'PHI','sim-clutch':'PHI'
};
function v211TeamOK(pin,ev){
 if(!pin)return true;
 if(!career)return true;
 return career.team===pin;
}
window.v211TeamOK=v211TeamOK;

function v211SagaPool(){return ({bennett:v211BennettSaga,oden:v211OdenSaga,kwame:v211KwameSaga,fultz:v211FultzSaga,simmons:v211SimmonsSaga}[career.playerId]||v211BennettSaga)()}

function v211GeneratedSaga(){
 let c=v211Ctx(),m=career.seasonNo%5,team=c.t.name,p=career.playerId;
 if(p==='bennett'){
  if(m===0&&career.team==='CLE')return{_seasonSaga:true,_longArc:true,t:`老记者Daniel Rowe问：如果今天是最后一次回克利夫兰，你希望球迷记住哪一幕？`,scene:`${seasonLabel()} · 客场克利夫兰`,speaker:'Daniel Rowe（平行世界记者） / 骑士老工作人员',cast:['Daniel Rowe（平行世界）','骑士老工作人员'],b:`从2013年选秀夜起，记者 <b>Daniel Rowe</b> 几乎见证了你每一次被嘲笑、被交易和重新站起来。赛前他把录音笔关掉，私下问：“如果这是你最后一次在这里打球，你想留下一场什么样的比赛？”`,stakes:'老将阶段不再只追成长，而是在选择自己留下什么记忆。',c:[['我要把生涯最高分留在这里','冲击新的单场得分纪录。',v211Fx([['lateMemory','scoring']],{c:5},{type:'careerHighPts',min:36,bonus:6,label:'克利夫兰告别之夜'})],['我要赢球，不追任何数字','成熟核心路线。',v211Fx([['lateMemory','win']],{tr:7},{type:'franchiseTrust',label:'旧主面前只求胜利'})],['赛后留下来和老工作人员合影','和解与传承路线。',v211Fx([['lateMemory','peace']],{tr:5},{type:'mentor',label:'与克利夫兰旧时代和解'})]]};
  if(m===1)return{_seasonSaga:true,_longArc:true,t:`Jalen Mercer已经成为全明星——当年抢你位置的新秀现在想让你留下`,scene:`${seasonLabel()} · ${team}训练馆`,speaker:'Jalen Mercer（平行世界） / 主教练',cast:['Jalen Mercer（平行世界）','主教练'],b:`几年前，Jalen Mercer还是那个让管理层考虑取代你的年轻人。现在他已经成为球队全明星，却在续约会议前主动找你：“我希望你留下。季后赛我需要你告诉我什么时候该慢下来。”`,stakes:'旧竞争关系回收：继续竞争、接受导师身份，或再次争取核心地位。',c:[['我留下，但关键时刻我还要在场','老将收官核心。',v211Fx([['mercerReturn','closer']],{tr:7},{type:'franchiseTrust',label:'成为球队老将收官核心'})],['以后这是你的球队，我负责让你少犯错','正式导师路线。',v211Fx([['mercerReturn','mentor']],{tr:9},{type:'mentor',label:'昔日竞争者成为你的门徒'})],['我还没准备把球队交给你','重新点燃竞争。',v211Fx([['mercerReturn','rival']],{c:5,tr:-2},{type:'careerNight',label:'老将再次证明自己'})]]};
  if(m===2)return{_seasonSaga:true,_longArc:true,t:`球队提出把你放进交易包，换一个更年轻的首发——总经理先把消息告诉了你`,scene:`${seasonLabel()} · 管理层办公室`,speaker:`${team}总经理 / 经纪人`,cast:[`${team}总经理`,'经纪人'],b:`总经理没有绕弯：“我们在谈一笔能让球队年轻五岁的交易，你的名字在里面。”和生涯早期不同，这一次他先告诉你，是因为你已经赢得了这个尊重。`,stakes:'接受交易、要求留队或自己挑下一站，都会改变晚年路线。',c:[['让我去争冠球队，别把我送去重建队','主动控制交易方向。',v211Fx([['lateTrade','title']],{trade:'争冠球队'},{type:'record',label:'主动要求争冠交易'})],['我想留下，我愿意降角色','忠诚线。',v211Fx([['lateTrade','stay']],{tr:7,min:18},{type:'franchiseTrust',label:'降角色留守球队'})],['你们做决定吧，我不会公开施压','成熟开放路线。',v211Fx([['lateTrade','open']],{c:3},{type:'record',label:'把交易决定交给球队'})]]};
  if(m===3)return{_seasonSaga:true,_longArc:true,t:`全国直播前，节目组终于把标题从“水货状元”改成“联盟最顽强的生涯之一”`,scene:`${seasonLabel()} · 全国直播演播室`,speaker:'Daniel Rowe / 主持人',cast:['Daniel Rowe（平行世界）','全国直播主持人'],b:`你走进演播室，看见大屏幕上的标题已经完全不同。Daniel Rowe把多年前的旧采访放出来，年轻的你几乎不敢看镜头。主持人问：“如果能给2013年的自己一句话，你会说什么？”`,stakes:'这是整条本内特线的精神回收，会决定最终退役评价。',c:[['别急着证明状元，先证明你属于NBA','成熟翻案结局。',v211Fx([['finalNarrative','belong']],{a:{mentality:2}},{type:'record',label:'重新定义状元生涯'})],['把每一句嘘声都记住，它们会变成燃料','逆风传奇结局。',v211Fx([['finalNarrative','fuel']],{c:6},{type:'careerNight',label:'逆风老将代表作'})],['你会有一天不再需要回答这个问题','彻底和解结局。',v211Fx([['finalNarrative','peace']],{tr:5},{type:'mentor',label:'不再被选秀顺位定义'})]]};
  return{_seasonSaga:true,_longArc:true,t:`最后一份合同谈判，球队不问潜力，只问你还能帮他们赢几场`,scene:`${seasonLabel()} · 经纪人办公室`,speaker:'经纪人 / 球队总经理',cast:['经纪人','球队总经理'],b:`没有人再谈天赋和上限。对方只问三件事：能不能守两个位置、能不能接受DNP、年轻球员犯错时会不会帮忙。职业生涯走到这里，合同已经变成对角色的选择。`,stakes:'可能拿底薪续命、退让角色换保障，或最后再赌一次。',c:[['底薪也签，我还想打','继续职业生涯。',v211Fx([['finalContract','minimum']],{}, {type:'contract',tier:'minimum'})],['我要两年保障，但可以完全接受替补','稳定晚年。',v211Fx([['finalContract','secure']],{tr:4},{type:'contract',tier:'minimumMentor'})],['只签争冠队，其他不考虑','最后一搏。',v211Fx([['finalContract','title']],{c:3},{type:'contract',tier:'title'})]]};
 }
 if(p==='oden'){
  if(m===0)return{_seasonSaga:true,_longArc:true,t:`年轻中锋Milo Grant拿着你的MRI报道来问：我也该限制出场吗？`,scene:`${seasonLabel()} · ${team}医疗室`,speaker:'Milo Grant（平行世界新秀中锋） / Aaron Weiss',cast:['Milo Grant（平行世界）','Aaron Weiss（平行世界）'],b:`19岁的 <b>Milo Grant</b> 刚被球队选中，他膝盖也有轻微结构风险。他没有先问教练，而是拿着报告来找你：“你经历过这一切，我到底该不该少打？”你突然从病历上的名字变成了别人的答案。`,stakes:'你会把自己的痛苦变成球队健康文化，也可能鼓励他赌天赋。',c:[['告诉他：少打十场比少打一生划算','健康导师路线。',v211Fx([['mentorHealth','protect']],{tr:8},{type:'mentor',label:'奥登成为年轻中锋健康导师'})],['每个人身体不同，让他自己和医生决定','尊重选择。',v211Fx([['mentorHealth','neutral']],{a:{mentality:1}},{type:'record',label:'奥登拒绝替别人决定身体'})],['如果你真想成为巨星，有些风险躲不掉','高风险竞技文化。',v211Fx([['mentorHealth','push']],{c:4},{type:'careerNight',label:'奥登仍选择竞技上限'})]]};
  if(m===1)return{_seasonSaga:true,_longArc:true,t:`Aaron Weiss说你本季膝盖数据是生涯最好——主教练想把季后赛分钟提到34`,scene:`${seasonLabel()} · 季后赛前医学会议`,speaker:'Aaron Weiss / 主教练 / Mike Conley Sr.',cast:['Aaron Weiss（平行世界）','主教练','Mike Conley Sr.'],b:`医学团队给出绿灯，但不是无限绿灯。主教练认为球队需要你每场34分钟，Mike Conley Sr.则问：“你想拿冠军，还是想确保明年还能回来？”`,stakes:'冠军窗口与生涯长度再次正面冲突。',c:[['季后赛34分钟，我接受风险','冠军冲刺。',v211Fx([['lateLoad','push']],{min:34,c:5,s:6},{type:'careerNight',label:'奥登季后赛完全体'})],['限制28分钟，不为一轮系列赛赌未来','长期健康。',v211Fx([['lateLoad','limit']],{min:28,h:6,s:-4},{type:'franchiseTrust',label:'坚持负荷管理'})],['只在生死战解除限制','建立特殊季后赛规则。',v211Fx([['lateLoad','game7']],{tr:5},{type:'record',label:'生死战解除分钟限制'})]]};
  if(m===2&&career.team==='POR')return{_seasonSaga:true,_longArc:true,t:`波特兰宣布Roy之夜，Brandon Roy点名希望你和Aldridge都回来`,scene:`${seasonLabel()} · 波特兰纪念夜`,speaker:'Brandon Roy / LaMarcus Aldridge',cast:['Brandon Roy','LaMarcus Aldridge'],b:`Brandon Roy的纪念夜，大屏幕又一次把你们三个人放在一起。Roy在致辞里说：“我们没得到想象中的全部，但那段未来是真的存在过。”观众随后开始喊你的名字。`,stakes:'决定是否把波特兰作为最终归宿，或继续追自己的世界线。',c:[['如果有机会，我想最后一年回波特兰','归乡路线。',v211Fx([['homecoming','portland']],{c:5},{type:'record',label:'奥登计划生涯末年归乡'})],['我已经有自己的球队了，这里是回忆不是终点','独立世界线。',v211Fx([['homecoming','own']],{tr:4},{type:'franchiseTrust',label:'奥登选择自己的新球队'})],['我只想告诉Roy：我们真的已经改变很多了','和解路线。',v211Fx([['homecoming','peace']],{a:{mentality:2}},{type:'mentor',label:'波特兰三人组完成和解'})]]};
  if(m===3)return{_seasonSaga:true,_longArc:true,t:`单场8次盖帽以后，媒体第一次问：健康奥登能不能冲DPOY？`,scene:`${seasonLabel()} · 赛后发布会`,speaker:'主教练 / 全国记者',cast:['主教练','全国记者'],b:`你一晚送出8次封盖。发布会没有人问伤病，第一题就是DPOY。主教练在旁边笑：“终于有人问篮球了。”你可以趁热追个人荣誉，也可以继续控制分钟。`,stakes:'荣誉冲刺会提高负荷，也可能正式改写奥登的历史定位。',c:[['我要冲DPOY，防守端全部开满','防守荣誉路线。',v211Fx([['awardPush','dpoy']],{a:{defense:2},c:5},{type:'record',label:'8盖帽生涯之夜'})],['不追奖，保持原分钟方案','健康优先。',v211Fx([['awardPush','health']],{h:5},{type:'franchiseTrust',label:'拒绝为奖项增加负荷'})],['季后赛再把防守拉满','冠军优先。',v211Fx([['awardPush','playoff']],{tr:4},{type:'careerNight',label:'把最佳防守留给季后赛'})]]};
  return{_seasonSaga:true,_longArc:true,t:`老将底薪之外，${team}给了你一份“退役前最后一年”合同`,scene:`${seasonLabel()} · 自由市场`,speaker:'Mike Conley Sr. / 球队管理层',cast:['Mike Conley Sr.','球队管理层'],b:`报价不大，角色也只是替补。但合同上有${team}的名字。Mike Conley Sr.问：“如果最后一年能自己选，你想在哪里把它结束？”`,stakes:'归乡、争冠或继续留在当前球队，形成不同退役线。',c:[['回起点球队，最后一年从那里结束','归乡底薪。',v211Fx([['finalYear','portland']],{c:5},{type:'contract',tier:'minimumMentor'})],['去争冠队，我还欠自己一次总决赛','最后争冠。',v211Fx([['finalYear','title']],{c:4},{type:'contract',tier:'title'})],['留在最信任我的球队','忠诚收尾。',v211Fx([['finalYear','loyal']],{tr:7},{type:'contract',tier:'minimumMentor'})]]};
 }
 if(p==='kwame'){
  if(m===0)return{_seasonSaga:true,_longArc:true,t:`高中状元热门Malik Foster问你：Jordan当年真的每天那么狠吗？`,scene:`${seasonLabel()} · 训练馆`,speaker:'Malik Foster（平行世界） / Terrence Cole',cast:['Malik Foster（平行世界）','Terrence Cole（平行世界）'],b:`Malik Foster只有18岁，媒体已经把他叫作“下一个高中状元”。训练结束后他偷偷问你：“Jordan当年真的像传说里那么狠吗？如果是我，我应该怎么扛？”你看着他，像看见十几年前的自己。`,stakes:'你可以复制过去的强硬文化，也可以给下一代完全不同的成长方式。',c:[['告诉他真相，但不让羞辱成为训练方法','导师路线。',v211Fx([['mentorCulture','healthy']],{tr:9},{type:'mentor',label:'夸梅改变年轻状元培养方式'})],['年轻人就该扛住压力，否则进不了NBA','强硬文化路线。',v211Fx([['mentorCulture','hard']],{c:3},{type:'record',label:'夸梅延续强硬训练文化'})],['别听任何标签，先学会每天做一件事','稳定成长路线。',v211Fx([['mentorCulture','routine']],{a:{mentality:2}},{type:'mentor',label:'把自己的教训变成新秀守则'})]]};
  if(m===1&&career.team==='WAS')return{_seasonSaga:true,_longArc:true,t:`重返华盛顿，球馆第一次播放的是你的成熟期集锦而不是2001选秀夜`,scene:`${seasonLabel()} · 华盛顿客场`,speaker:'现场播报 / 老工作人员',cast:['奇才老工作人员','现场播报'],b:`你以为大屏幕又会播放Jordan选中你的画面，结果出现的是你后来的防守、篮板和老将比赛。一个老工作人员在通道里说：“我们以前太着急想看到状元了。”`,stakes:'这是一段迟来的和解，也可能成为一场复仇式代表战。',c:[['我要在这里打出生涯最好的篮板夜','冲击篮板纪录。',v211Fx([['dcReturn','record']],{c:5},{type:'careerHighReb',min:18,bonus:4,label:'华盛顿回归篮板之夜'})],['不追纪录，只想赢','成熟路线。',v211Fx([['dcReturn','win']],{tr:6},{type:'franchiseTrust',label:'旧主面前只求胜利'})],['赛后去见当年青训工作人员','和解与传承。',v211Fx([['dcReturn','peace']],{tr:5},{type:'mentor',label:'与华盛顿完成和解'})]]};
  if(m===2)return{_seasonSaga:true,_longArc:true,t:`球队年轻核心抱怨你“太慢”——更衣室第一次需要你处理代际冲突`,scene:`${seasonLabel()} · 更衣室`,speaker:'年轻核心 Darius Knox（平行世界） / 主教练',cast:['Darius Knox（平行世界）','主教练'],b:`年轻核心 <b>Darius Knox</b> 在输球后抱怨球队半场节奏太慢，话里明显包含你的名字。所有人都看向你。年轻时你会把这种话全部吞下去，现在你是房间里最老的人。`,stakes:'冲突、沟通或让权，会定义晚年领袖形象。',c:[['当面告诉他：赢球不是只看速度','正面冲突，可能影响关系。',v211Fx([['generation','confront']],{tr:-2,c:4},{type:'feud',label:'与年轻核心发生代际冲突'})],['拉他去录像室，把每个回合讲清楚','领袖沟通路线。',v211Fx([['generation','teach']],{tr:8},{type:'mentor',label:'化解更衣室代际冲突'})],['主动让出部分首发时间','牺牲角色换球队稳定。',v211Fx([['generation','yield']],{min:18,tr:6},{type:'franchiseTrust',label:'主动让权稳定更衣室'})]]};
  if(m===3)return{_seasonSaga:true,_longArc:true,t:`你已经16个篮板，主教练说再抢4个就让比赛停下来给你留球`,scene:`${seasonLabel()} · 第四节`,speaker:'主教练 / Terrence Cole',cast:['主教练','Terrence Cole（平行世界）'],b:`比赛进入最后阶段，你已经16个篮板。队友开始刻意帮你卡人，主场观众也知道你正在接近20。Terrence Cole提醒：“别让纪录变成受伤原因。”`,stakes:'可以冲20篮板、冲20+20或主动休息。',c:[['我要20个篮板','刷新篮板纪录机会。',v211Fx([['lateRecord','reb']],{c:4},{type:'careerHighReb',min:20,bonus:3,label:'老将20篮板之夜'})],['我要20+20，一次拿够','生涯之夜。',v211Fx([['lateRecord','2020']],{c:6},{type:'double20',label:'老将20+20'})],['换我下去，纪录不值得赌身体','健康与成熟。',v211Fx([['lateRecord','rest']],{h:5,tr:4},{type:'record',label:'主动放弃20篮板纪录'})]]};
  return{_seasonSaga:true,_longArc:true,t:`自由市场最后一天，你必须决定：底薪再打一季，还是让职业生涯停在这里`,scene:`${seasonLabel()} · 经纪人办公室`,speaker:'经纪人 / Terrence Cole',cast:['经纪人','Terrence Cole（平行世界）'],b:`电话只剩一份一年底薪。Terrence Cole说球队愿意让你兼任年轻内线导师，但上场时间没有保证。你已经证明自己能在联盟活很久，现在问题是还想不想继续。`,stakes:'晚年合同会直接写进专属生涯档案。',c:[['签底薪，我还能帮球队','延续生涯。',v211Fx([['finalContract','minimum']],{}, {type:'contract',tier:'minimumMentor'})],['只要有稳定轮换我才签','等待更好机会。',v211Fx([['finalContract','role']],{c:2},{type:'contract',tier:'wait'})],['接受导师定位，比赛时间随缘','领袖收尾。',v211Fx([['finalContract','mentor']],{tr:8},{type:'contract',tier:'minimumMentor'})]]};
 }
 if(p==='fultz'){
  if(m===0)return{_seasonSaga:true,_longArc:true,t:`年轻后卫Eli Brooks突然说“我不敢投了”——整个更衣室都下意识看向你`,scene:`${seasonLabel()} · 训练结束`,speaker:'Eli Brooks（平行世界） / Noah Carter',cast:['Eli Brooks（平行世界）','Noah Carter（平行世界）'],b:`Eli Brooks连续几场投篮变形，训练后一个人坐在场边。他抬头问你：“如果有一天你发现自己连最自然的动作都不敢做，怎么办？”这个问题你比任何人都懂。`,stakes:'你可以把自己的康复经历转化成真正的队友关系。',c:[['把我当年所有录像和康复笔记给他','导师路线。',v211Fx([['mentorShot','open']],{tr:9},{type:'mentor',label:'富尔茨帮助年轻后卫走出投篮恐惧'})],['先带他找医生，别急着改动作','医学优先文化。',v211Fx([['mentorShot','medical']],{tr:7},{type:'mentor',label:'富尔茨建立先诊断后训练原则'})],['陪他连续投100球，但一句动作都不讲','心理信任路线。',v211Fx([['mentorShot','feel']],{c:3,tr:6},{type:'record',label:'把康复经验变成球队文化'})]]};
  if(m===1&&career.team==='ORL')return{_seasonSaga:true,_longArc:true,t:`回到奥兰多，现场播放你第一记“完全没想动作”的三分`,scene:`${seasonLabel()} · 奥兰多客场`,speaker:'现场播报 / 老工作人员',cast:['魔术老工作人员','现场播报'],b:`大屏幕放出那记你几乎忘记的普通三分——接球、起跳、命中，没有停顿。观众起立时你才意识到，这座城市记住的不是状元失败，而是你怎么重新学会打球。`,stakes:'可以追一场得分纪录，也可以把它当成真正的回家。',c:[['今晚我想打出生涯最高分','冲击纪录。',v211Fx([['orlandoReturn','record']],{c:5},{type:'careerHighPts',min:32,bonus:7,label:'奥兰多回归生涯新高'})],['正常打，赢球后留下来谢球迷','和解路线。',v211Fx([['orlandoReturn','peace']],{tr:6},{type:'franchiseTrust',label:'与奥兰多完成回归之夜'})],['我想给年轻球迷签完最后一张名牌再走','传承路线。',v211Fx([['orlandoReturn','legacy']],{tr:5},{type:'mentor',label:'富尔茨成为重启象征'})]]};
  if(m===2)return{_seasonSaga:true,_longArc:true,t:`最后2秒，你已经不再害怕投篮——现在问题只是投哪一种`,scene:`${seasonLabel()} · 最后一攻`,speaker:'Noah Carter / 主教练',cast:['Noah Carter（平行世界）','主教练'],b:`比分打平，边线球发到你手里。防守人退一步防突破，侧翼协防已经收进来。Noah Carter在场边没有任何动作——这是他最满意的地方，因为你不再需要别人告诉你怎么抬手。`,stakes:'可能出现超远绝杀、急停中投绝杀或组织绝杀助攻。',c:[['后撤一步，直接投三分','三分压哨绝杀机会。',v211Fx([['lateClutch','three']],{c:5},{type:'buzzer',style:'logo',label:'富尔茨超远压哨绝杀'})],['突破到罚球线急停','中距离绝杀机会。',v211Fx([['lateClutch','mid']],{c:4},{type:'buzzer',style:'post',label:'富尔茨急停压哨绝杀'})],['吸引协防传底角','绝杀助攻机会。',v211Fx([['lateClutch','pass']],{tr:6},{type:'buzzer',style:'assist',label:'富尔茨压哨绝杀助攻'})]]};
  if(m===3)return{_seasonSaga:true,_longArc:true,t:`肩膀检查结果完全正常，但你还是在赛前多抬了三次手`,scene:`${seasonLabel()} · 赛前医疗室`,speaker:'Noah Carter / 队医',cast:['Noah Carter（平行世界）','队医'],b:`所有检查都说正常。可赛前你还是下意识多做了三次肩部动作。Noah Carter看见了，却没有戳破。身体已经恢复，记忆却不会自动消失。`,stakes:'面对心理残留：接受它、再检查，或者彻底不再把它当问题。',c:[['让它存在，但照常打','成熟心理路线。',v211Fx([['bodyMemory','accept']],{a:{mentality:2},c:4},{type:'record',label:'富尔茨接受身体记忆'})],['再做一次完整检查，我需要确定','医学安全感。',v211Fx([['bodyMemory','check']],{h:4},{type:'franchiseTrust',label:'主动完成健康复查'})],['以后赛前不再做额外肩部测试','彻底放下旧问题。',v211Fx([['bodyMemory','release']],{c:6},{type:'careerNight',label:'彻底摆脱投篮恐惧'})]]};
  return{_seasonSaga:true,_longArc:true,t:`自由市场只给你一份底薪，但球队承诺：替补控卫完全由你带`,scene:`${seasonLabel()} · 合同谈判`,speaker:'经纪人 / 球队总经理',cast:['经纪人','球队总经理'],b:`合同数字已经远不如巅峰，但总经理说得很明确：替补阵容需要一个能稳定组织、还能告诉年轻人怎么从伤病回来的人。你过去最怕别人只看身体，现在这份合同反而因为你经历过一切而存在。`,stakes:'底薪不再只是失败，也可能是另一种职业价值。',c:[['签，接受替补和导师双角色','底薪导师路线。',v211Fx([['finalContract','mentor']],{tr:8},{type:'contract',tier:'minimumMentor'})],['我要争取首发机会，否则继续等','高风险市场路线。',v211Fx([['finalContract','starter']],{c:3},{type:'contract',tier:'wait'})],['少拿钱去争冠队，我想再打一次深季后赛','最后争冠路线。',v211Fx([['finalContract','title']],{c:4},{type:'contract',tier:'title'})]]};
 }
 // Simmons
 if(m===0)return{_seasonSaga:true,_longArc:true,t:`年轻“高大控卫”Jalen Cross问你：所有人都逼我投三分，我真的必须变成射手吗？`,scene:`${seasonLabel()} · 训练馆`,speaker:'Jalen Cross（平行世界新秀） / Mason Reed',cast:['Jalen Cross（平行世界）','Mason Reed（平行世界）'],b:`Jalen Cross身高2米06，媒体从选秀夜开始就拿他和你比较。训练后他问：“如果我不会成为射手，是不是永远会被说不完整？”这个问题曾经定义你很多年。`,stakes:'你怎么回答，会反过来定义自己最终如何看待投篮。',c:[['你不需要当射手，但必须敢投该投的球','成熟版本西蒙斯哲学。',v211Fx([['mentorGuard','balanced']],{tr:8},{type:'mentor',label:'西蒙斯指导下一代高大控卫'})],['把三分练出来，别给季后赛留下弱点','技术警告路线。',v211Fx([['mentorGuard','shoot']],{a:{shooting:1},tr:6},{type:'record',label:'把自己的教训交给下一代'})],['先把最强项做到联盟顶级，别被模板绑架','天赋路线。',v211Fx([['mentorGuard','strength']],{a:{mentality:2}},{type:'mentor',label:'拒绝单一模板评价'})]]};
 if(m===1&&career.team==='PHI')return{_seasonSaga:true,_longArc:true,t:`重返费城，Embiid没有拥抱，也没有冷脸——他只问：“今天你投不投？”`,scene:`${seasonLabel()} · 费城客场通道`,speaker:'Joel Embiid / 你',cast:['Joel Embiid'],b:`你和 <b>Joel Embiid</b> 在通道里碰面。过去所有争议都浓缩成一句很像玩笑的话：“今天你投不投？”你们都笑了一下，但谁都知道这句话背后有多少年。`,stakes:'可以用比赛完成和解，也可以把旧关系重新点燃成竞争。',c:[['今晚空位三分我全部投','正面回应旧问题。',v211Fx([['phillyReturn','shoot']],{a:{shooting:1},s:6,c:4},{type:'careerNight',label:'费城回归主动进攻之夜'})],['我只想赢，投不投不是主题','成熟路线。',v211Fx([['phillyReturn','win']],{tr:6},{type:'franchiseTrust',label:'费城旧友面前只谈赢球'})],['告诉Embiid：最后一球你防我，我也防你','竞争和解。',v211Fx([['phillyReturn','rival']],{c:5},{type:'record',label:'与Embiid完成竞争式和解'})]]};
 if(m===2)return{_seasonSaga:true,_longArc:true,t:`主教练正式问：你愿不愿意把位置改成中锋，彻底放弃“控卫”标签？`,scene:`${seasonLabel()} · 战术会议`,speaker:'主教练 / Mason Reed',cast:['主教练','Mason Reed（平行世界）'],b:`球队的数据团队认为，你现在打中锋时净效率最高。主教练把两套阵容摆出来：一套你继续控球，一套你作为中锋掩护、短挡拆策应和换防。年轻时你最骄傲的是自己“不属于任何位置”，现在必须真正选一个。`,stakes:'位置转型会改变晚年统计与球队价值。',c:[['改打中锋，我要把传球带进五号位','前场发动机路线。',v211Fx([['latePosition','center']],{a:{rebounding:2,defense:2},tr:6},{type:'franchise',label:'西蒙斯正式转型组织中锋'})],['继续控卫，我还可以掌控节奏','大控卫路线。',v211Fx([['latePosition','guard']],{a:{playmaking:2},c:4},{type:'franchiseTrust',label:'坚持大控卫身份'})],['根据对手切换位置，不固定','万能拼图路线。',v211Fx([['latePosition','hybrid']],{a:{mentality:2,durability:1},tr:5},{type:'record',label:'西蒙斯成为多位置老将'})]]};
 if(m===3)return{_seasonSaga:true,_longArc:true,t:`最后1.4秒，LOGO附近接球——全场知道你年轻时最不会做的就是这一件事`,scene:`${seasonLabel()} · 全国直播最后一攻`,speaker:'Mason Reed / 主教练',cast:['Mason Reed（平行世界）','主教练'],b:`比分打平。发球只能到接近中线的位置，时间只剩1.4秒。没有突破空间，也没有传第二次球的时间。你年轻时最被诟病的是不投，现在全世界只剩一个问题：敢不敢在这个距离出手？`,stakes:'成功就是整个平行世界最有象征意义的镜头之一。',c:[['接球就拔，我投','超远压哨绝杀机会。',v211Fx([['lateClutch','logo']],{c:8},{type:'buzzer',style:'logo',label:'西蒙斯超远压哨绝杀'})],['尽可能往前运一步再投','降低难度但时间风险更高。',v211Fx([['lateClutch','step']],{c:5},{type:'buzzer',style:'post',label:'西蒙斯压哨跳投'})],['假投传给提前切入的队友','绝杀助攻路线。',v211Fx([['lateClutch','assist']],{tr:7},{type:'buzzer',style:'assist',label:'西蒙斯压哨绝杀助攻'})]]};
 return{_seasonSaga:true,_longArc:true,t:`Rich Paul把唯一报价放桌上：一年底薪，角色是替补防守中锋`,scene:`${seasonLabel()} · 合同谈判`,speaker:'Rich Paul / 球队总经理',cast:['Rich Paul','球队总经理'],b:`Rich Paul没有包装市场：“这是正式报价。一年底薪，替补，更多时间打中锋。”曾经所有人讨论的是顶薪和建队核心，现在职业生涯只问一个问题：你愿不愿意用完全不同的身份继续？`,stakes:'可能沦落底薪，也可能靠角色转型重新延长职业生涯。',c:[['签，我接受这个版本的自己','底薪转型路线。',v211Fx([['finalContract','minimum']],{c:4},{type:'contract',tier:'minimumMentor'})],['只去争冠队，底薪也可以','最后争冠路线。',v211Fx([['finalContract','title']],{c:4},{type:'contract',tier:'title'})],['拒绝，继续等能给持球角色的球队','高风险等待。',v211Fx([['finalContract','wait']],{c:-2},{type:'contract',tier:'wait'})]]};
}

function makeV211SeasonSagaEvent(){
 v211Init();let pool=v211SagaPool();let sat=teamSatisfaction();
 let preferred=[];
 if(career.contract?.years<=1)preferred=pool.filter(x=>/contract|minimum|max/.test(x.id));
 else if(sat<48||career.trust<48)preferred=pool.filter(x=>/feud|conflict|battle|spacing/.test(x.id));
 else if(career.age>=32)preferred=pool.filter(x=>/minimum|legacy|mentor/.test(x.id));
 else if(career.ovr>=88)preferred=pool.filter(x=>/franchise|career|record|2020|30|clutch|health60|threes/.test(x.id));
 let picked=v211Unique(preferred.length?preferred:pool);if(!picked)return v211GeneratedSaga();let e=picked.make();e._seasonSaga=true;e._longArc=true;e._sagaId=picked.id;return e;
}
function makeV211Game7Event(){
 let c=v211Ctx(),opp=career.playoff?.rounds?.[career.playoff.round]?.oppName||'对手';
 const G7_PROSE={
  bennett:{cast:['Kyrie Irving（旧友短信）','主教练'],v:[
   [`抢七最后36秒，你第一次听见全场喊你的名字而不是“水货”`,`系列赛3-3，最后36秒只领先1分。暂停里主教练把战术板递给你。赛前Kyrie的短信还停在锁屏：“这种比赛，别躲。”你知道一旦赢下这场，过去那个标签会被真正压到身后。`],
   [`抢七上半场你4投0中，走回通道时队友都在等你`,`系列赛3-3。上半场结束时你4投0中，客队球迷又开始喊那个旧称呼。走回通道时，队友刻意放慢脚步等你。下半场还有24分钟，你是继续躲，还是把球要过来。`],
   [`抢七最后一分钟，进攻篮板被拨到你手里`,`系列赛3-3，最后58秒还落后1分。进攻篮板被拨到你手里，防守人已经扑上来。这一球投出去，要么救回赛季，要么又成为别人剪辑里的素材。`],
   [`抢七第四节，全场只有你还在追那个分差`,`系列赛3-3，第四节落后9分。主教练把所有人叫到一起，只问了一句：“谁还想继续打？”暂停结束，战术板最上面写的是你的号码。`]]},
  oden:{cast:['Mike Conley Sr.','主教练'],v:[
   [`抢七最后一防，对手把所有人拉开，只想和你一对一`,`系列赛3-3。最后一攻，对方后卫点名挡拆把你换到外线。Mike Conley Sr.赛前只说了一句：“健康让你来到这里，现在篮球决定剩下的。”你可以退守护框，也可以直接换防到三分线。`],
   [`抢七打到加时，医疗组的眼神比对手更让你难受`,`系列赛3-3进入加时。你打了41分钟，膝盖的反馈已经很明显。医疗组在场边摇头，主教练却还在看你。你要不要继续留在场上。`],
   [`抢七第一回合，对方就用挡拆把你吊到三分线`,`系列赛3-3。第一回合对方就专门用挡拆把你吊到外线，试探你还能不能移动。全世界都在看你的腿，而不是看比分。`],
   [`抢七最后两分钟，篮板球决定了一切`,`系列赛3-3，最后两分钟每一次投篮不中都是生死。对方连续冲抢前场篮板，禁区里全是身体。球队需要你留在篮下，可你的膝盖已经打满42分钟。`]]},
  kwame:{cast:['主教练','内线教练 Terrence Cole'],v:[
   [`抢七最后一攻，战术不是给明星，而是给你争前场篮板`,`比分打平。暂停里主教练画完第一选择后，又在篮下圈了一个位置：“如果没进，Kwame，这球是你的。”过去所有人怕你接不住球，现在球队把赛季最后一次机会交给你的手。`],
   [`抢七最后一分钟，你被换上场只有一个任务`,`系列赛3-3，最后1分钟你才被换上场，任务写在战术板上只有两个字：篮板。全场的聚光灯从来没有为你亮过，这一次也不会有。`],
   [`抢七中场休息，主教练在战术板背面写了你的名字`,`系列赛3-3。中场休息时主教练把战术板翻过来，背面只写了你的名字和一句话：“今天由你来守住禁区。”这句话在华盛顿从来没人对你说过。`],
   [`抢七最后40秒，对手的中锋在你面前要球`,`系列赛3-3，最后40秒领先1分。对方把球塞给内线，整轮系列赛他都在这块区域得分。主教练没有叫暂停，也没有换人，只是看着你。`]]},
  fultz:{cast:['投篮教练 Noah Carter','主教练'],v:[
   [`抢七最后7秒，你从弧顶拿球——没人再讨论你的投篮动作`,`比分落后1分，最后7秒。主教练没有叫暂停。Noah Carter在场边只做了一个“呼吸”的手势。你运球到弧顶，防守人后退半步。全场没有人在看你的肩膀，他们只在等这一球。`],
   [`抢七第三节，肩膀又紧了一下——但球还是得投`,`系列赛3-3。第三节一次落地后，肩膀那种熟悉的紧感又回来了。防守人退到罚球线等你出手。全场屏住呼吸看你的下一个动作。`],
   [`抢七最后两分钟，Noah Carter没有做任何手势`,`系列赛3-3，最后两分钟。Noah Carter没有像往常一样比手型，他只是抱着手臂站着看你。你意识到：他已经在让你自己处理这件事了。`],
   [`抢七开局你就被放空两步`,`系列赛3-3。第一回合对方就退到两步之外，明摆着赌你不敢投。这是他本赛季第无数次面对的防守，也是最重要的一次。`]]},
  simmons:{cast:['Rich Paul','球队核心'],v:[
   [`又是抢七，又是篮下——但这一次历史不会替你做决定`,`比分打平，最后6秒。你突破吸引协防，篮筐就在面前，底角也有人空位。这个画面太像某段所有人都反复播放过的旧历史。不同的是，这一次，决定权真的在你手上。`],
   [`抢七第四节，对手把五个人全部塞进禁区`,`系列赛3-3。第四节对手干脆把五个人全部收进禁区，连底角都不管。球在你手里，罚球线外三步空得能站下一个人。`],
   [`抢七最后30秒，Embiid把球直接塞给你`,`系列赛3-3，最后30秒落后2分。Embiid在篮下被两个人夹住，他把球往外一推，直接塞到你手里。没有暂停，也没有第二次机会。`],
   [`抢七最后12秒，你已经站在罚球线上了`,`系列赛3-3。最后一次犯规把你送上罚球线，两罚决定赛季。整个球馆的噪音突然变成一种很具体的注视。`]]}
 };
 const _g=G7_PROSE[career.playerId],_i=((career.seasonNo||1)+((career.playoff?.round)||0))%_g.v.length,_p=_g.v[_i];
 const data={cast:_g.cast,title:_p[0],body:_p[1]};
 return{_seasonSaga:true,_longArc:true,_game7:true,t:data.title,scene:`${seasonLabel()} · ${c.t.name} vs ${opp} · GAME 7`,speaker:data.cast.join(' / '),cast:data.cast,b:data.body,stakes:'选择会直接影响抢七胜率，并写入你的季后赛世界线。',c:[['我要亲手结束系列赛','英雄球路线：下一场抢七获得显著加成；赢球会写入“抢七英雄”。',v211Fx([['game7Choice','hero']],{c:6},{type:'game7Choice',mode:'hero'})],['先把最稳的战术执行到底','稳健路线：球队胜率小幅上升，关系显著提高。',v211Fx([['game7Choice','team']],{tr:7},{type:'game7Choice',mode:'team'})],['我要在防守端决定最后一球','防守路线：防守球员会获得更高抢七加成。',v211Fx([['game7Choice','defense']],{a:{defense:1},c:3},{type:'game7Choice',mode:'defense'})]]}
}

function v211ApplyNarrative(n,ev,ch){
 if(!n||!career)return;v211Init();let c=v211Ctx(),detail='';
 const pushSig=(title,d)=>{career.signatureGames.unshift({season:seasonLabel(),title,detail:d});career.signatureGames=career.signatureGames.slice(0,40);recordAchievement(title,d,'record',`story-${career.seasonNo}-${title}-${career.signatureGames.length}`,true)};
 if(n.type==='careerHighPts'){
  let val=Math.max((career.records.gamePts||0)+rnd(2,Math.max(3,n.bonus||6)),n.min||30);career.records.gamePts=val;detail=`剧情代表战：你轰下${val}分，刷新个人单场得分纪录。`;pushSig(n.label||`生涯新高 ${val} 分`,detail);
 }else if(n.type==='careerHighReb'){
  let val=Math.max((career.records.gameReb||0)+rnd(1,Math.max(2,n.bonus||4)),n.min||18);career.records.gameReb=val;detail=`剧情代表战：单场抓下${val}个篮板，刷新生涯纪录。`;pushSig(n.label||`生涯新高 ${val} 篮板`,detail);
 }else if(n.type==='tripleDouble'){
  let pts=Math.max(18,Math.round(c.ppg+8)),reb=Math.max(10,Math.round(c.rpg+5)),ast=Math.max(10,Math.round(c.apg+5));detail=`剧情代表战：${pts}分 ${reb}篮板 ${ast}助攻，完成生涯代表性三双。`;pushSig(n.label||'生涯三双之夜',detail);
 }else if(n.type==='tripleDouble30'){
  let pts=Math.max(30,(career.records.gamePts||0)+2),reb=Math.max(10,Math.round(c.rpg+4)),ast=Math.max(10,Math.round(c.apg+4));career.records.gamePts=Math.max(career.records.gamePts||0,pts);detail=`剧情代表战：${pts}分 ${reb}篮板 ${ast}助攻，打出生涯30分三双。`;pushSig(n.label||'30分三双生涯之夜',detail);
 }else if(n.type==='double20'){
  career.records.gamePts=Math.max(career.records.gamePts||0,20);career.records.gameReb=Math.max(career.records.gameReb||0,20);detail='剧情代表战：20+分、20+篮板，完成生涯罕见20+20。';pushSig(n.label||'20+20生涯之夜',detail);
 }else if(n.type==='careerNight'){
  let pts=Math.max(28,Math.round(c.ppg+10));career.records.gamePts=Math.max(career.records.gamePts||0,pts);detail=`剧情代表战：${pts}分 ${Math.max(5,Math.round(c.rpg+2))}板 ${Math.max(3,Math.round(c.apg+2))}助，成为本赛季个人代表作。`;pushSig(n.label||'生涯之夜',detail);
 }else if(n.type==='buzzer'){
  let success=Math.random()<(n.style==='logo'?.58:n.style==='assist'?.78:.7);if(success){let name=n.style==='logo'?'超远距离压哨绝杀':n.style==='assist'?'压哨绝杀助攻':'压哨绝杀';detail=`${seasonLabel()}，你在最后一攻完成${name}，这段镜头永久写入世界线。`;pushSig(n.label||name,detail);career.fanHeat=Math.min(100,Math.round((career.fanHeat||50)+10));}else{detail='最后一攻弹框而出。失败没有结束这条线，但会在后续关键球剧情里被重新提起。';recordAchievement('关键球憾失',detail,'milestone',`miss-${career.seasonNo}-${career.games}`,false);career.confidence=clamp(career.confidence-2)}
 }else if(n.type==='franchise'){
  career.role=['联盟门面','超级巨星','全明星核心'].includes(career.role)?career.role:'球队核心';career.trust=Math.max(career.trust,78);career.gmSatisfaction=Math.max(career.gmSatisfaction||0,78);career.fanHeat=Math.max(Math.round(career.fanHeat||0),75);detail=`${c.t.name}正式把你列为长期核心，关键球与阵容规划都会优先考虑你的角色。`;recordAchievement(n.label||'被球队正式扶正',detail,'role',`franchise-${career.seasonNo}`,true);
 }else if(n.type==='franchiseTrust'){
  career.trust=clamp(career.trust+5);career.gmSatisfaction=clamp((career.gmSatisfaction||60)+5);career.fanHeat=Math.round(clamp((career.fanHeat||60)+4));detail=n.label||'球队内部信任明显提高。';recordAchievement(n.label||'球队信任升级',detail,'role',`trust-${career.seasonNo}-${career.games}`,false);
 }else if(n.type==='mentor'){
  career.trust=clamp(career.trust+6);career.fanHeat=Math.round(clamp((career.fanHeat||60)+6));detail=n.label||'你开始成为更衣室里年轻球员主动寻求建议的人。';recordAchievement(n.label||'更衣室导师',detail,'milestone',`mentor-${career.seasonNo}-${career.games}`,false);
 }else if(n.type==='feud'){
  career.gmSatisfaction=clamp((career.gmSatisfaction||60)-10);career.fanHeat=Math.round(clamp((career.fanHeat||60)-3));career.teamTradePressure=(career.teamTradePressure||0)+3;detail=n.label||'球队关系出现裂痕，交易风险明显上升。';recordAchievement(n.label||'球队关系决裂',detail,'milestone',`feud-${career.seasonNo}-${career.games}`,true);
 }else if(n.type==='contract'){
  let tier=n.tier||'big',years=1,salary=2.2,label='老将底薪';if(tier==='max'){years=5;salary=Math.max(42,Math.round((career.ovr-72)*2.1));label='生涯超级大合同'}else if(tier==='big'){years=4;salary=Math.max(24,Math.round((career.ovr-72)*1.7));label='长期大合同'}else if(tier==='title'){years=3;salary=Math.max(12,Math.round((career.ovr-72)*1.15));label='降薪争冠合同'}else if(tier==='bet'){years=2;salary=Math.max(10,Math.round((career.ovr-72)*1.4));label='短约再赌一年'}else if(tier==='shortStar'){years=3;salary=Math.max(25,Math.round((career.ovr-72)*1.6));label='短期高薪合同'}else if(tier==='minimumMentor'){years=1;salary=3.1;label='导师型老将底薪'}else if(tier==='wait'){let hit=Math.random()<.42;if(hit){years=2;salary=Math.max(8,Math.round((career.ovr-72)*1.1));label='等待后拿到保障合同'}else{years=1;salary=2.1;label='市场冷却后只剩底薪'}}
  career.contract={years,salary};career.contractHistory.unshift({season:seasonLabel(),team:career.team,years,salary,label});detail=`${label}：${years}年，约${salary}M/年。`;recordAchievement(label,detail,'milestone',`contract-${career.seasonNo}-${tier}`,true);
 }else if(n.type==='record'){
  detail=n.label||'这件事被写入你的专属生涯档案。';recordAchievement(detail,`${seasonLabel()} · ${detail}`,'milestone',`storyrec-${career.seasonNo}-${detail}`,false);
 }else if(n.type==='game7Choice'){
  career.pendingGame7Choice=n.mode;detail=`抢七策略锁定：${n.mode==='hero'?'你要亲手终结系列赛':n.mode==='defense'?'你要在防守端决定系列赛':'优先执行球队最稳战术'}。`;
 }
 if(detail){career.feed.unshift(`专属剧情反馈：${detail}`);career.fanHeat=Math.round(career.fanHeat||0)}
}

const __v211MaybeStory=maybeStory;
maybeStory=function(){
 if(!career||!career.exclusive||career.stage!=='regular')return false;v211Init();let arr=campaigns[career.playerId]||[];
 if(career.storyIndex<arr.length&&storyReady(career.storyIndex)){stopSim();ui.storyEvent=arr[career.storyIndex];save();render();return true}
 let target=career.storyIndex>=arr.length?24:34;
 if(typeof window.v220TakeSaga==='function')return false;
 if(!v211HasSeasonStory()&&career.games>=target){stopSim();ui.storyEvent=makeV211SeasonSagaEvent();save();render();return true}
 return false;
};

const __v211StoryChoice=storyChoice;
storyChoice=function(i){
 let raw=ui.storyEvent,e=raw?v28Event(raw):null,ch=e?.c?.[i],n=ch?.[2]?.narrative,wasExclusive=!!career?.exclusive;
 __v211StoryChoice(i);
 if(career&&wasExclusive){v211Init();v211MarkSeasonStory();if(n)v211ApplyNarrative(n,e,ch);career.fanHeat=Math.round(career.fanHeat||0);save();render()}
};

const __v211BeginSeason=beginSeason;
beginSeason=function(){__v211BeginSeason();if(career){v211Init();career.fanHeat=Math.round(career.fanHeat||0);save();render()}};
const __v211NextSeason=nextSeason;
nextSeason=function(){__v211NextSeason();if(career&&!career.retired){v211Init();career.fanHeat=Math.round(career.fanHeat||0);save();render()}};
const __v211Sim=simulateGame;
simulateGame=function(){__v211Sim();if(career){career.fanHeat=Math.round(career.fanHeat||0);career.gmSatisfaction=Math.round(career.gmSatisfaction||0);save()}};

const __v211RelationshipDock=relationshipDock;
relationshipDock=function(){if(!career)return'';career.fanHeat=Math.round(career.fanHeat||0);career.trust=Math.round(career.trust||0);career.gmSatisfaction=Math.round(career.gmSatisfaction||0);let sat=Math.round(teamSatisfaction()),fan=Math.round(career.fanHeat||0),trust=Math.round(career.trust||0);let one=(name,v)=>`<div class="rel-pill ${v>=72?'good':''}"><header><span>${name}</span><b>${Math.round(v)}</b></header><div class="mini-track"><i style="width:${clamp(Math.round(v))}%"></i></div></div>`;return `<div class="franchise-status">${one('球队满意度',sat)}${one('教练信任',trust)}${one('球迷支持',fan)}</div>`};

const __v211PlayoffGame=playoffGame;
playoffGame=function(){
 if(!career)return __v211PlayoffGame();v211Init();let po=career.playoff,r=po?.rounds?.[po?.round],key=`${career.seasonNo}-${po?.round}`;
 if(career.exclusive&&career.playerId!=='custom'&&po&&career.stage==='playoffs'&&r&&r.w===3&&r.l===3&&!career.playoffStoryKeys.includes(key)&&!ui.storyEvent&&!ui.modal){career.playoffStoryKeys.push(key);stopSim();ui.storyEvent=makeV211Game7Event();save();render();return}
 let pending=career.pendingGame7Choice,ovr=career.ovr;if(pending){career.ovr=ovr+(pending==='hero'?7:pending==='defense'?5:4)}
 __v211PlayoffGame();
 if(pending&&career){career.ovr=ovr;let rr=career.playoff?.rounds?.[career.playoff?.round]||r,g=rr?.games?.[rr.games.length-1];if(g){if(g.win){let label=pending==='hero'?'抢七英雄':pending==='defense'?'抢七最后一防':'抢七稳健终结';recordAchievement(label,`${seasonLabel()} 抢七战胜 ${r?.oppName||'对手'}，你选择的路线直接影响了系列赛最后一场。`,'playoff',`g7-${career.seasonNo}-${po?.round}`,true)}else recordAchievement('抢七憾负',`${seasonLabel()} 抢七惜败，之前的关键选择会在后续剧情被重新提起。`,'playoff',`g7loss-${career.seasonNo}-${po?.round}`,false)}career.pendingGame7Choice=null;save();render()}
};

const __v211Retire=retire;
retire=function(reason='玩家主动宣布退役'){
 if(career?.exclusive){v211Init();let finalTitle=career.age>=35?'最后一次把球衣叠好':'这条世界线提前停在这里';let finalDetail=`${career.age}岁，${currentP().zh}结束职业生涯。最终路线：${v28Route()}。生涯专属剧情覆盖${career.seasonStorySeasons.length}个赛季。`;recordAchievement(finalTitle,finalDetail,'season',`retire-story-${career.seasonNo}`,false);career.storyLog.push({seasonNo:career.seasonNo,label:seasonLabel(),title:finalTitle,scene:'退役更衣室',choice:'结束职业生涯',detail:finalDetail,impact:'专属主线正式收束',long:true,route:v28Route(),cast:'职业生涯回望'})}
 __v211Retire(reason)
};

function v211SeasonStoryPanel(){
 if(!career?.exclusive)return'';v211Init();let done=v211HasSeasonStory();let logs=(career.storyLog||[]).filter(x=>x.seasonNo===career.seasonNo);return `<section class="v211-season-story"><header><div><small>SEASON EXCLUSIVE EPISODE</small><h3>${seasonLabel()} · 本季专属剧情</h3></div><span class="${done?'done':''}">${done?'已发生':'待触发'}</span></header><p>${done?(logs[logs.length-1]?.title||'本季剧情已经改变世界线'):`本赛季一定会出现至少1个${currentP().zh}专属剧情。核心历史线结束后，故事会读取当前球队、合同、数据、关系、荣誉和此前分支继续原创。`}</p><div class="v211-season-meta"><b>${career.seasonStorySeasons.length}</b><span>已有剧情赛季</span><b>${career.signatureGames.length}</b><span>剧情名场面</span><b>${career.contractHistory.length}</b><span>剧情合同节点</span></div></section>`
}
const __v211Mainline=mainlineNowCard;
mainlineNowCard=function(){let h=__v211Mainline();return career?.exclusive?`${h}${v211SeasonStoryPanel()}`:h};

const __v211StoryView=storyView;
storyView=function(){let h=__v211StoryView();if(!career?.exclusive)return h;v211Init();let seasons=career.seasonStorySeasons.slice().sort((a,b)=>b-a);let saga=`<section class="v211-lifelong"><header><small>LIFELONG CHARACTER SAGA</small><h2>从新秀到自然退役 · 每一季都有故事</h2><p>前期沿真实经历改编；一旦世界线分叉，后续会根据你的球队、数据、合同、队友关系和此前选择原创，不再强行复刻现实。</p></header><div class="v211-saga-list">${seasons.map(sn=>{let items=(career.storyLog||[]).filter(x=>x.seasonNo===sn);return `<div class="v211-saga-year"><b>YEAR ${sn}</b><div>${items.map(x=>`<span>${x.title}</span>`).join('')||'<span>已写入世界线</span>'}</div></div>`}).join('')||'<div class="tiny">第一季剧情发生后，这里会逐年展开。</div>'}</div>${career.signatureGames.length?`<div class="v211-signatures"><h3>剧情名场面</h3>${career.signatureGames.slice(0,12).map(x=>`<div><small>${x.season}</small><b>${x.title}</b><p>${x.detail}</p></div>`).join('')}</div>`:''}</section>`;return h+saga};

const __v211CareerArchive=careerArchiveView;
careerArchiveView=function(){let h=__v211CareerArchive();if(!career)return h;v211Init();let extra=`<section class="v26-archive-section v211-contracts"><h3>专属剧情合同 / 身份节点</h3>${career.contractHistory.map(x=>`<div><b>${x.season} · ${x.label}</b><span>${teamBy(x.team).name} · ${x.years}年 · ${x.salary}M/年</span></div>`).join('')||'<div class="tiny">剧情中的大合同、底薪与关键身份变化会记录在这里。</div>'}</section>`;return h.replace('<div class="retire-box">',extra+'<div class="retire-box">')};legacyView=careerArchiveView;

const style211=document.createElement('style');style211.textContent=`
.v211-season-story{margin-top:9px;padding:12px;border-radius:22px;background:linear-gradient(145deg,#fff8ed,#fff);border:1px solid #ead7c4;box-shadow:0 9px 24px rgba(76,53,36,.06)}.v211-season-story header{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.v211-season-story small{font-size:7px;color:#9f7457;letter-spacing:.1em}.v211-season-story h3{font-size:13.5px;margin:3px 0}.v211-season-story header>span{font-size:7.5px;border-radius:99px;background:#fff0df;color:#ad633f;padding:6px 8px;font-weight:1000}.v211-season-story header>span.done{background:#e1f4e7;color:#24834f}.v211-season-story>p{font-size:8.5px;line-height:1.55;color:#79685b}.v211-season-meta{display:grid;grid-template-columns:auto 1fr auto 1fr auto 1fr;gap:5px;align-items:center;margin-top:8px;background:#f8f2eb;border-radius:13px;padding:7px}.v211-season-meta b{font-size:12.5px;color:#bd5542}.v211-season-meta span{font-size:7px;color:#927c6b}.v211-lifelong{margin-top:10px;background:#fff;border:1px solid #eadfd5;border-radius:22px;padding:12px}.v211-lifelong header small{font-size:7px;color:#9d765c}.v211-lifelong header h2{font-size:19px;margin:3px 0}.v211-lifelong header p{font-size:8.5px;line-height:1.55;color:#7d6c60}.v211-saga-list{display:grid;gap:6px;margin-top:9px}.v211-saga-year{display:grid;grid-template-columns:56px 1fr;gap:7px;padding:8px;border-radius:13px;background:#faf5ef}.v211-saga-year>b{font-size:8.5px;color:#b65e45}.v211-saga-year span{display:block;font-size:8.5px;line-height:1.5}.v211-signatures{margin-top:10px;border-top:1px dashed #dfd0c3;padding-top:9px}.v211-signatures h3{font-size:11.5px}.v211-signatures>div{padding:7px 0;border-top:1px dashed #eee0d5}.v211-signatures small{font-size:6.5px;color:#a58b78}.v211-signatures b{display:block;font-size:9.5px;margin:2px 0}.v211-signatures p{font-size:7.5px;color:#826f61;margin:0}.v211-contracts>div{display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px dashed #eadfd5}.v211-contracts b{font-size:8.5px}.v211-contracts span{font-size:7.5px;color:#927e6f;text-align:right}
`;
document.head.appendChild(style211);

/* === V2.11 FINAL POLISH === */
const __v211FinalHome=renderHome;
renderHome=function(){return __v211FinalHome().replace('V2.10 · TALENT REBUILD','V2.11 · LIFELONG SAGA')};
const __v211FinalTalents=renderTalents;
renderTalents=function(){return __v211FinalTalents().replace('解锁真实经历改编主线','解锁直到退役 · 每赛季专属剧情')};
const __v211NarrativeFinal=v211ApplyNarrative;
v211ApplyNarrative=function(n,ev,ch){
 __v211NarrativeFinal(n,ev,ch);
 if(career&&n?.type==='feud'){
  let sat=Math.round(teamSatisfaction()),pressure=career.teamTradePressure||0;
  if(sat<48||pressure>=5){career.tradeRequest='剧情决裂';career.feed.unshift('关系警报：更衣室/管理层矛盾已经升级，球队开始认真评估交易你的可能。');recordAchievement('关系破裂进入交易阶段',`${seasonLabel()} · 这次冲突已从口角升级为真实的交易风险。`,'milestone',`story-feud-trade-${career.seasonNo}-${career.games}`,true)}
 }
 if(career){career.fanHeat=Math.round(career.fanHeat||0);career.gmSatisfaction=Math.round(career.gmSatisfaction||0);save()}
};

if(career){v211Init();career.fanHeat=Math.round(career.fanHeat||0);save()}
render();

