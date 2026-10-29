
/* ===== V2.6 logic ===== */
function v26Init(){
 if(!career)return;
 ui.speed=145; // 固定3倍速
 const s=career.seasonStats||(career.seasonStats=blankStats());
 ['totalMin','totalFgm','totalFga','total3pm','total3pa','totalFtm','totalFta','totalTov','totalPf'].forEach(k=>{if(s[k]==null)s[k]=0});
 const c=career.careerTotals||(career.careerTotals={});
 ['minutes','fgm','fga','threePm','threePa','ftm','fta','turnovers','fouls'].forEach(k=>{if(c[k]==null)c[k]=0});
}
const __v26Blank=blankStats;
blankStats=function(){let s=__v26Blank();return Object.assign(s,{totalMin:0,totalFgm:0,totalFga:0,total3pm:0,total3pa:0,totalFtm:0,totalFta:0,totalTov:0,totalPf:0})};

/* 新秀赛季：所有五人都先像新秀，再根据成长逐年打开上限 */
const __v26StatExpect=statExpect;
statExpect=function(){
 let raw=__v26StatExpect(); if(!career)return raw;
 let id=career.playerId,y=career.seasonNo||1;
 const rookie={
  bennett:{pts:5.5,reb:4.7,ast:1.0,pc:8.8,rc:6.7,ac:2.3},
  oden:{pts:8.8,reb:7.8,ast:0.9,pc:11.8,rc:10.0,ac:2.1},
  kwame:{pts:5.7,reb:5.1,ast:.7,pc:8.2,rc:7.6,ac:1.8},
  fultz:{pts:8.2,reb:3.7,ast:4.6,pc:12.0,rc:5.5,ac:6.6},
  simmons:{pts:12.8,reb:7.5,ast:7.0,pc:15.5,rc:9.0,ac:8.5}
 }[id];
 if(!rookie)return raw;
 if(y===1){
  let talentLift=Math.max(0,career.ovr-currentP().ovr)*.18;
  raw.pts=Math.min(rookie.pc,rookie.pts+(raw.pts-rookie.pts)*.25+talentLift);
  raw.reb=Math.min(rookie.rc,rookie.reb+(raw.reb-rookie.reb)*.28);
  raw.ast=Math.min(rookie.ac,rookie.ast+(raw.ast-rookie.ast)*.30);
 }else if(y===2){
  raw.pts=Math.min(raw.pts,rookie.pc+4.5);raw.reb=Math.min(raw.reb,rookie.rc+1.4);raw.ast=Math.min(raw.ast,rookie.ac+1.3);
 }else if(y===3){
  raw.pts=Math.min(raw.pts,rookie.pc+8);raw.reb=Math.min(raw.reb,rookie.rc+2.1);raw.ast=Math.min(raw.ast,rookie.ac+2.0);
 }
 return raw;
};

/* 三分命中率目标：与基础生成公式同口径（含富尔茨/西蒙斯的专属修正）。
   不能再用 line.three 兜底 —— 上游 updateAverages 在投篮明细生成之前就把
   line.three 写成了 0（那时 tpa 还是 0），于是这里永远走 (0||30) 的 30% 兜底。
   实测：富尔茨解锁「投篮之神」后三分命中率依然卡在 30% 出头，就是这个原因。 */
function v26ThreePct(){
 try{
  let a=career.attrs||{},id=career.playerId,sh=Number(a.shooting);if(!isFinite(sh))sh=45;
  let sp=Number(career.special);if(!isFinite(sp))sp=0;
  let v=clamp(22+(sh-45)*.38,8,52);
  if(id==='fultz'){
   let fx=!!(career.talents&&career.talents.indexOf('fultz_x')>=0);
   v*=fx?(.94+sp/280):(.72+sp/180);
   v=clamp(v,8,46);
  }
  if(id==='simmons')v*=.55+sp/260;
  return clamp(v/100,.08,.58);
 }catch(e){return .33}
}
function v26DeriveBox(line){
 let id=career.playerId,min=clamp(Math.round((career.minutes||20)+rnd(-3,3)),6,40),a=career.attrs||{};
 let fin=Number(a.finishing);if(!isFinite(fin))fin=60;
 let sho=Number(a.shooting);if(!isFinite(sho))sho=60;
 let men=Number(a.mentality);if(!isFinite(men))men=60;
 /* ① 出手数：由「使用率」决定 —— 角色 + 得分能力 + 上场时间。
    原实现是 fga = 命中数 ÷ 命中率、而命中数又由得分反推，等于出手数完全跟着
    「得分预期」走：实测属性全 88 时，富尔茨（全明星核心）只出手 8.7 次、
    西蒙斯 14.5 次、姚明 24.1 次 —— 同为队内评分第一，出手数差三倍。 */
 let usage={边缘球员:4,轮换球员:7,稳定首发:10.5,球队核心:15,全明星核心:17.5,超级巨星:18.5,联盟门面:20.5}[career.role]||10;
 usage*=clamp(1+((fin+sho-120)/60)*.12,.85,1.15);
 usage*=clamp((Number(career.minutes)||24)/34,.6,1);
 if(id==='simmons'&&!(career.talents&&career.talents.indexOf('simmons_x')>=0))usage*=.9;
 /* ⓪ 早季使用率上限：新秀不该一上来就按核心球权出手。
    上面 statExpect 里本来就有每位状元的新秀/早季「得分上限」，
    但那段只作用于 e.pts，而这里是由使用率反推出手、再反推得分 ——
    等于上限被整条绕过：实测西蒙斯新秀季场均 24.6 分（本该 12~15），
    第二年就够到 MVP/最佳阵容门槛，其他状元完全追不上。
    改成从源头（球权）封顶，投篮明细与得分依然自洽。
    只对 5 位状元生效，姚明那条线不套用。 */
 let ycap=({1:11,2:13.5,3:15.5})[Number(career.seasonNo)||1];
 /* 罗斯是「新秀季就打主控」的得分型控卫，早季球权给得比其他人多一点（真实：新秀季 16.8 分 6.3 助） */
 if(id==='rose')ycap=({1:15,2:17,3:19})[Number(career.seasonNo)||1];
 if(ycap&&['bennett','oden','kwame','fultz','simmons','rose'].indexOf(id)>=0&&usage>ycap)usage=ycap;
 /* 罗斯「玫瑰之名」：膝盖负荷越高，场上吃得越多（越爆越强），也越脆；
    「收着打」那一场出手打六折。都在源头改使用率，得分与投篮明细天然自洽。 */
 if(id==='rose'){try{if(career.roseBlastNow)usage*=2.40}catch(e){}}
 let fga=clamp(Math.round(usage+rnd(-2,2)),4,(career&&career.roseBlastNow)?42:30);
 /* ② 命中率：完全由属性决定（与基础生成公式同口径：finishing + shooting） */
 let fgPct=clamp(40+(fin+sho-130)*.14,31,67)/100;
 /* ③ 三分：出手习惯 + 投射能力；占比不超过总出手的 55% */
 let threeBase={bennett:3.2,oden:.15,kwame:.10,fultz:3.3,simmons:.55,yao:.05,rose:2.2}[id]||2.5;
 /* 投篮之神：三分从「偶尔试一个」变成常规武器（实测原来场均只有 4~5 次出手） */
 if(id==='fultz'&&career.talents&&career.talents.indexOf('fultz_x')>=0)threeBase=5.6;
 threeBase+=Math.max(0,sho-65)*.055;
 if(id==='simmons'&&sho<55&&!(career.talents&&career.talents.indexOf('simmons_x')>=0))threeBase*=.55;
 let tpa=clamp(Math.round(threeBase+rnd(-1,2)),0,Math.max(0,Math.round(fga*.55)));
 let tpm=clamp(Math.round(tpa*v26ThreePct()),0,tpa);
 /* ④ 命中数 = 总出手 × 命中率；三分命中不能超过总命中 */
 let fgm=clamp(Math.round(fga*fgPct),0,fga);if(tpm>fgm)tpm=fgm;
 /* ⑤ 罚球：次数跟着出手量走，命中率按属性 */
 let ftSrc=(line.ft>=45&&line.ft<=96)?line.ft:(54+sho*.22+men*.12),ftPct=clamp(ftSrc/100,.52,.92);
 let fta=Math.max(0,Math.round(1+fga*.22+fin*.01+rnd(-1,2)));
 let ftm=clamp(Math.round(fta*ftPct),0,fta);
 /* ⑥ 得分由明细反推（唯一真值：pts ≡ 2*fgm + tpm + ftm）。
    这样「出手多 → 得分多、命中率高 → 得分高」是自然结果，而不是反过来由得分凑明细。 */
 let tov=Math.max(0,Math.round((Number(a.playmaking)>80?2.6:1.8)+rnd(-1,2))),pf=Math.max(0,Math.round(1.8+rnd(-1,2)));
 line.pts=2*fgm+tpm+ftm;
 line.min=min;line.fgm=fgm;line.fga=fga;line.tpm=tpm;line.tpa=tpa;line.ftm=ftm;line.fta=fta;line.tov=tov;line.pf=pf;
 line.reb=Math.round(line.reb||0);line.ast=Math.round(line.ast||0);line.stl=Math.round(line.stl||0);line.blk=Math.round(line.blk||0);
 line.fg=fga?+(fgm/fga*100).toFixed(1):0;line.three=tpa?+(tpm/tpa*100).toFixed(1):0;line.ft=fta?+(ftm/fta*100).toFixed(1):0;
 return line;
}
function v26AccumulateBox(g){
 if(!g||!g.line||g._v26box)return;v26Init();v26DeriveBox(g.line);g._v26box=true;let l=g.line,s=career.seasonStats,c=career.careerTotals;
 s.totalMin+=l.min;s.totalFgm+=l.fgm;s.totalFga+=l.fga;s.total3pm+=l.tpm;s.total3pa+=l.tpa;s.totalFtm+=l.ftm;s.totalFta+=l.fta;s.totalTov+=l.tov;s.totalPf+=l.pf;
 c.minutes+=l.min;c.fgm+=l.fgm;c.fga+=l.fga;c.threePm+=l.tpm;c.threePa+=l.tpa;c.ftm+=l.ftm;c.fta+=l.fta;c.turnovers+=l.tov;c.fouls+=l.pf;
}
const __v26Sim=simulateGame;
simulateGame=function(){let before=career?.games||0;__v26Sim();if(career&&career.games>before){let g=career.gameLog?.[0];if(g?.played!==false&&g?.line)v26AccumulateBox(g);save();render()}};
const __v26Create=createCareer;
createCareer=function(){__v26Create();v26Init();ui.speed=145;save();render()};
const __v26Begin=beginSeason;
beginSeason=function(){__v26Begin();v26Init();ui.speed=145;save();render()};
toggleSim=function(){if(ui.sim)stopSim();else{ui.speed=145;ui.sim=true;render();ui.interval=setInterval(()=>simulateGame(),145)}};
changeSpeed=function(){ui.speed=145;notify('本作固定使用3倍速模拟')};

function v26SeasonAdvanced(){v26Init();let s=career.seasonStats,g=Math.max(1,s.gp);return{gp:s.gp,min:s.totalMin/g,fgm:s.totalFgm/g,fga:s.totalFga/g,fg:s.totalFga?s.totalFgm/s.totalFga*100:(s.fg||0),tpm:s.total3pm/g,tpa:s.total3pa/g,three:s.total3pa?s.total3pm/s.total3pa*100:(s.three||0),ftm:s.totalFtm/g,fta:s.totalFta/g,ft:s.totalFta?s.totalFtm/s.totalFta*100:0,tov:s.totalTov/g,pf:s.totalPf/g}};
function v26CareerAdvanced(){v26Init();let c=career.careerTotals,g=Math.max(1,c.games);return{gp:c.games,min:c.minutes/g,fgm:c.fgm/g,fga:c.fga/g,fg:c.fga?c.fgm/c.fga*100:0,tpm:c.threePm/g,tpa:c.threePa/g,three:c.threePa?c.threePm/c.threePa*100:0,ftm:c.ftm/g,fta:c.fta/g,ft:c.fta?c.ftm/c.fta*100:0,tov:c.turnovers/g,pf:c.fouls/g}};
function seasonFunctionalTrack(){let g=career.games,nodes=[['揭幕',1],['全明星',41],['交易截止',55],['收官',82],['季后赛',83]];let active=0;if(g>=41)active=1;if(g>=55)active=2;if(g>=82)active=3;if(g>=82&&['postgate','playin','playoffs','seasonrecap','offseason'].includes(career.stage))active=4;if(g>=83)active=4;return `<div class="functional-track"><div class="functional-line">${nodes.map(([n,v],i)=>{let done=i<active,on=i===active;return `<div class="functional-node ${done?'done':''} ${on?'on':''}"><i>${done?'✓':'•'}</i><b>${n}</b><span>${v===83?'赛后':`G${v}`}</span></div>`}).join('')}</div></div>`}
function v26Beans(){let arr=(career.gameLog||[]).filter(g=>typeof g.n==='number').slice(0,30).reverse();return `<div class="v26-bean-card"><div class="v26-bean-head"><b>最近30场 · 红绿豆</b><span>绿=胜 · 红=负 · 灰点=你因伤DNP</span></div><div class="v26-beans">${arr.map(g=>`<i class="v26-bean ${g.win?'win':'loss'} ${g.played===false?'dnp':''} ${g.roseBlast?'blast':''}" title="G${g.n} ${g.played===false?'伤停 · ':''}${g.win?'胜':'负'}"></i>`).join('')||'<span class="tiny">常规赛开始后生成胜负轨迹。</span>'}</div></div>`}
syncOvr=function(){if(!career)return;career.ovr=clamp(calcOvr(career.attrs)+career.ovrMod,50,99);let r=roleByOvr(career.ovr);if(career.seasonNo===1){let cap={bennett:'轮换球员',oden:'稳定首发',kwame:'轮换球员',fultz:'稳定首发',simmons:'球队核心'}[career.playerId],order=['边缘球员','轮换球员','稳定首发','球队核心','全明星核心','超级巨星','联盟门面'];if(cap&&order.indexOf(r)>order.indexOf(cap))r=cap}career.role=r;let trustBonus=career.trust>=78?2:career.trust>=64?1:career.trust<38?-2:0;career.minutes=Math.min(career.minutesLimit||99,clamp(minutesByRole(r)+trustBonus+(hasTalent('core')?2:0),10,37))}
renderHud=function(){v26Init();let p=currentP();return `<header class="career-hud"><div><small>${seasonLabel()} · ${career.age}岁 · ${seasonPhase()}</small><h2>${p.zh}<span> / ${teamBy(career.team).name}</span></h2><div class="hud-meta"><span>${career.role}</span><span>YEAR ${career.seasonNo}</span><span>${career.contract?.years??'-'}年合同</span></div></div><div class="hud-right"><div class="age-badge"><b>${career.age}</b><span>AGE / 岁</span></div><div class="ovr-orb"><span>OVR</span><b>${career.ovr}</b></div></div>${relationshipDock()}</header>`}
function v26SeasonTotalsBar(){let s=career.seasonStats;return `<div class="v26-season-totals"><div><b>${Math.round(s.totalPts||0)}</b><span>总得分</span></div><div><b>${Math.round(s.totalReb||0)}</b><span>总篮板</span></div><div><b>${Math.round(s.totalAst||0)}</b><span>总助攻</span></div><div><b>${Math.round(s.totalFgm||0)}</b><span>命中球</span></div><div><b>${Math.round(s.total3pm||0)}</b><span>三分命中</span></div><div><b>${Math.round(s.totalFtm||0)}</b><span>罚球命中</span></div></div>`}
function v26RankPanel(){let r=rankInfo(),me=teamBy(career.team),sample=[...r.all.slice(0,3),r.all[r.rank-1]].filter((x,i,a)=>x&&a.findIndex(y=>y.t.abbr===x.t.abbr)===i);return `<section class="v26-team-card"><div class="v26-team-main"><div class="v26-logo-slot">【素材位】<br>当前球队队徽</div><div class="v26-team-copy"><small>CURRENT TEAM · ${seasonLabel()}</small><h2>${me.name}</h2><div class="record"><b>${teamRecord()}</b><span>已赛 ${career.games}/82 · 预计 ${r.projected} 胜</span></div></div><div class="v26-rank-badge"><small>联盟模拟排名</small><b>#${r.rank}</b><span>${r.rank<=6?'季后赛区':r.rank<=10?'附加赛区':'追赶区'}</span></div></div><div class="v26-rank-context">${sample.map((x,i)=>`<div class="v26-rank-mini ${x.t.abbr===career.team?'me':''}"><b>#${r.all.findIndex(y=>y.t.abbr===x.t.abbr)+1} ${x.t.abbr}</b><span>${x.w}胜投影</span></div>`).join('')}</div></section>`}
function compactGameListV26(){let arr=(career.gameLog||[]).filter(g=>typeof g.n==='number').slice(0,5);return `<div class="v26-games">${arr.map(g=>`<div class="v26-game ${g.win?'win':'loss'}"><div class="v26-game-top"><span>G${g.n} · ${g.win?'WIN':'LOSS'} · vs ${g.opp}</span><b>${g.sf} : ${g.sa}</b></div>${g.played===false?`<div class="v26-game-dnp">DNP · 伤病缺阵</div>`:`<div class="v26-game-line"><strong>${Math.round(g.line?.pts||0)}分 · ${Math.round(g.line?.reb||0)}板 · ${Math.round(g.line?.ast||0)}助</strong><small>${g.line?.min||career.minutes}分钟<br>${g.line?.fgm??'-'}/${g.line?.fga??'-'} 投篮 · ${g.line?.tpm??'-'}/${g.line?.tpa??'-'} 三分 · ${g.line?.ftm??'-'}/${g.line?.fta??'-'} 罚球</small></div>`}</div>`).join('')||'<div class="tiny">开始常规赛后，这里会以比赛卡展示最近5场。</div>'}</div>`}
function rankInfo(){let all=teams.map(t=>({t,w:projectedWins(t)})).sort((a,b)=>b.w-a.w),idx=all.findIndex(x=>x.t.abbr===career.team);return{rank:idx+1,projected:all[idx]?.w||0,all}}
function teamSatisfaction(){let gm=career.gmSatisfaction??Math.round((career.trust+career.confidence)/2),fan=career.fanHeat??career.confidence,req=career.tradeRequest?-12:0;return clamp(Math.round(career.trust*.42+gm*.38+fan*.20+req),0,100)}
function relationshipDock(){let sat=teamSatisfaction(),gm=career.gmSatisfaction??Math.round((career.trust+career.confidence)/2),fan=career.fanHeat??career.confidence;let one=(name,v)=>`<div class="rel-pill ${v>=72?'good':''}"><header><span>${name}</span><b>${Math.round(v)}</b></header><div class="mini-track"><i style="width:${clamp(v)}%"></i></div></div>`;return `<div class="franchise-status">${one('球队满意度',sat)}${one('教练信任',career.trust)}${one('球迷支持',fan)}</div>`}
function v26TalentEffect(id){let t=talents.find(x=>x.id===id);if(t)return[t.n,t.d,t.r];let p=currentP();if(id===p.exclusive.fx)return[p.exclusive.n,p.exclusive.d,'状元专属'];return[id,'正在影响你的生涯。','特殊']}
function v26TalentClass(id){let t=talents.find(x=>x.id===id);if(!t)return 'q-exclusive';return t.r==='传奇'?'q-legend':t.r==='稀有'?'q-rare':t.r==='优秀'?'q-good':'q-common'}
talentLivePanel=function(){if(!career?.talents?.length)return'';return `<section class="v26-live-talents"><header><b>本局天赋正在生效</b><span>卡面颜色 = 品质 · 触发时会写入反馈</span></header><div class="v26-live-talent-grid">${career.talents.map(id=>{let [n,d,r]=v26TalentEffect(id);return `<div class="v26-live-talent ${v26TalentClass(id)}"><small>${r}</small><b>${n}</b><span>${d}</span></div>`}).join('')}</div></section>`};
mainlineNowCard=function(){let p=currentP();if(!career.exclusive)return `<section class="story-lock"><div class="lock-icon">★</div><small style="font-size:7.5px;color:#a97943">EXCLUSIVE STORY LOCKED</small><h2>本局为纯生涯模拟</h2><p>未解锁【${p.exclusive.n}】，因此不会出现${p.zh}的专属主线剧情和独家分歧。</p><button onclick="unlockStoryMidCareer()">🎬 解锁专属天命 + 整条主线</button></section>`;let x=storyGoal();return `<section class="mainline-now"><header><small>${career.storyIndex>=6?'LONG CAREER ARC':`EXCLUSIVE MAINLINE · CHAPTER ${career.storyIndex+1}/6`}</small><span>${x.pct}%</span></header><h3>${x.title}</h3><p><b>当前目标：</b>${x.goal}<br><b>剧情作用：</b>${x.impact}</p><div class="mainline-progress"><i style="width:${x.pct}%"></i></div><div class="mainline-meta"><b>${career.storyIndex>=6?'故事会一直延续到退役':'达到条件后自动停表，由你决定'}</b><button onclick="stopSim();ui.tab='story';render()">查看主线 →</button></div></section>`};

regularView=function(){v26Init();let s=career.seasonStats,a=v26SeasonAdvanced(),sat=teamSatisfaction(),m=career.lastMilestone;return `${seasonHero()}${v26RankPanel()}<section class="season-command"><div class="v26-simbar"><button class="go ${ui.sim?'running':''}" onclick="toggleSim()">${ui.sim?'Ⅱ 暂停模拟 · 查看刚才发生了什么':'▶ 3× 模拟常规赛'}</button><div class="v26-fixed-speed"><b>3×</b><span>固定模拟速度</span></div></div>${v26Beans()}${seasonFunctionalTrack()}</section><section class="v26-statbox"><header><b>本赛季个人数据</b><span>${s.gp}场 · ${career.role}</span></header><div class="v26-big3"><div><b>${fmt(s.pts)}</b><span>PTS</span></div><div><b>${fmt(s.reb)}</b><span>REB</span></div><div><b>${fmt(s.ast)}</b><span>AST</span></div></div><div class="v26-detail-grid"><div><b>${s.gp}</b><span>出场 GP</span></div><div><b>${fmt(a.min)}</b><span>时间 MIN</span></div><div><b>${fmt(a.fgm)}/${fmt(a.fga)}</b><span>投篮 FGM/FGA</span></div><div><b>${fmt(a.fg)}%</b><span>命中 FG%</span></div><div><b>${fmt(a.tpm)}/${fmt(a.tpa)}</b><span>三分 3PM/3PA</span></div><div><b>${fmt(a.three)}%</b><span>三分 3P%</span></div><div><b>${fmt(a.ftm)}/${fmt(a.fta)}</b><span>罚球 FTM/FTA</span></div><div><b>${fmt(a.ft)}%</b><span>罚球 FT%</span></div><div><b>${fmt(s.stl)}</b><span>抢断 STL</span></div><div><b>${fmt(s.blk)}</b><span>盖帽 BLK</span></div><div><b>${fmt(a.tov)}</b><span>失误 TOV</span></div><div><b>${fmt(a.pf)}</b><span>犯规 PF</span></div></div>${v26SeasonTotalsBar()}</section><section class="v26-statbox"><header><b>球队关系</b><span>${managementStance()[0]}</span></header>${relationshipDock()}</section>${m?`<div class="milestone-strip"><i>★</i><div><small>最近写入世界线的成就</small><b>${m.title}</b><p>${m.detail}</p></div></div>`:''}${talentLivePanel()}${mainlineNowCard()}<section class="news-stage"><header><h3>最近比赛</h3><small>LAST 5 · BOX SCORE</small></header>${compactGameListV26()}</section><section class="news-stage"><header><h3>生涯反馈</h3><small>CAREER FEEDBACK</small></header><div class="headline"><div class="stamp">NOW</div><p><b>${career.feed[0]||'赛季正在展开'}</b><br>${career.feed[1]||'暂停后先看数据、关系和故事变化，再决定要不要继续。'}</p></div></section>`};

/* 联盟页同步重做球队排名层级 */
leagueView=function(){v26Init();let r=rankInfo(),top=r.all.slice(0,10),me=teamBy(career.team);return `<section class="league-stage">${asset('【素材位：联盟排名页面主视觉】','用途：联盟球馆/赛季竞争氛围，不出现具体球队文字','banner')}<div class="league-team-hero"><small style="font-size:8.5px;color:#9d806a">YOUR TEAM POSITION</small><span class="bigrank">#${r.rank}</span><h2>${me.name}</h2><div class="bigrec">${teamRecord()}</div><div class="tiny">已赛${career.games}场 · 82场投影 ${r.projected}胜</div></div><div class="standings" style="margin-top:9px">${top.map((x,i)=>`<div class="standing" style="${x.t.abbr===career.team?'background:#fff0e8;border-color:#f0b9aa':''}"><i>${i+1}</i><strong>${x.t.name}${x.t.abbr===career.team?' · 你的球队':''}</strong><span>${x.w}胜投影</span></div>`).join('')}${r.rank>10?`<div class="standing" style="background:#fff0e8;border-color:#f0b9aa"><i>${r.rank}</i><strong>${me.name} · 你的球队</strong><span>${r.projected}胜投影</span></div>`:''}</div></section><section class="news-stage"><header><h3>管理层关系</h3><small>FRANCHISE</small></header><div class="headline"><div class="stamp">GM</div><p><b>${managementStance()[0]} · 满意度 ${teamSatisfaction()}</b><br>${managementStance()[1]}</p></div></section>`};

/* 赛季结束时把完整投篮拆分写进年度履历 */
const __v26End=endSeason;
endSeason=function(result){let snap=career?Object.assign({},v26SeasonAdvanced(),career.seasonStats):null;__v26End(result);if(career&&snap&&career.history?.length){let h=career.history[career.history.length-1];h.stats=Object.assign({},h.stats,snap)}save();render()};

function careerAveragesV26(){let c=career.careerTotals,g=Math.max(1,c.games);return{pts:c.points/g,reb:c.rebounds/g,ast:c.assists/g,stl:(c.steals||0)/g,blk:(c.blocks||0)/g,...v26CareerAdvanced()}}
careerArchiveView=function(){v26Init();let ct=career.careerTotals,r=career.records,av=careerAveragesV26(),ach=career.worldline.achievements,maxP=Math.max(1,...career.history.map(h=>h.stats?.pts||0));return `<section class="career-archive"><small style="font-size:8.5px;color:#a48774">COMPLETE CAREER DATABASE</small><h2 style="font-size:22px;margin:3px 0">我的完整生涯数据库</h2><p class="tiny">常规赛总数据、投篮拆分、出场时间、个人纪录、荣誉、逐季履历、交易与伤病全部永久记录。</p><div class="data-kpis"><div><b>${ct.games}</b><span>生涯比赛</span></div><div><b>${ct.seasons}</b><span>完整赛季</span></div><div><b>${career.honors['全明星']||0}</b><span>全明星</span></div><div><b>${Object.values(career.honors).reduce((a,b)=>a+b,0)}</b><span>荣誉总数</span></div></div><div class="v26-archive-section"><h3>生涯场均 · 完整数据</h3><div class="v26-career-table"><div><b>${fmt(av.pts)}</b><span>PTS</span></div><div><b>${fmt(av.reb)}</b><span>REB</span></div><div><b>${fmt(av.ast)}</b><span>AST</span></div><div><b>${fmt(av.min)}</b><span>MIN</span></div><div><b>${fmt(av.stl)}</b><span>STL</span></div><div><b>${fmt(av.blk)}</b><span>BLK</span></div><div><b>${fmt(av.tov)}</b><span>TOV</span></div><div><b>${fmt(av.pf)}</b><span>PF</span></div><div><b>${fmt(av.fgm)}/${fmt(av.fga)}</b><span>FGM/FGA</span></div><div><b>${fmt(av.fg)}%</b><span>FG%</span></div><div><b>${fmt(av.tpm)}/${fmt(av.tpa)}</b><span>3PM/3PA</span></div><div><b>${fmt(av.three)}%</b><span>3P%</span></div><div><b>${fmt(av.ftm)}/${fmt(av.fta)}</b><span>FTM/FTA</span></div><div><b>${fmt(av.ft)}%</b><span>FT%</span></div><div><b>${career.ovr}</b><span>当前OVR</span></div><div><b>${career.age}</b><span>当前年龄</span></div></div></div><div class="v26-archive-section"><h3>生涯累计</h3><div class="v26-career-table"><div><b>${Math.round(ct.points).toLocaleString()}</b><span>总得分</span></div><div><b>${Math.round(ct.rebounds).toLocaleString()}</b><span>总篮板</span></div><div><b>${Math.round(ct.assists).toLocaleString()}</b><span>总助攻</span></div><div><b>${Math.round(ct.minutes||0).toLocaleString()}</b><span>总分钟</span></div><div><b>${Math.round(ct.fgm||0).toLocaleString()}</b><span>命中球</span></div><div><b>${Math.round(ct.fga||0).toLocaleString()}</b><span>投篮次数</span></div><div><b>${Math.round(ct.threePm||0).toLocaleString()}</b><span>三分命中</span></div><div><b>${Math.round(ct.threePa||0).toLocaleString()}</b><span>三分出手</span></div><div><b>${Math.round(ct.ftm||0).toLocaleString()}</b><span>罚球命中</span></div><div><b>${Math.round(ct.fta||0).toLocaleString()}</b><span>罚球次数</span></div><div><b>${Math.round(ct.steals||0).toLocaleString()}</b><span>总抢断</span></div><div><b>${Math.round(ct.blocks||0).toLocaleString()}</b><span>总盖帽</span></div></div></div><div class="v26-archive-section"><h3>个人纪录</h3><div class="record-wall"><div><small>单场最高得分</small><b>${Math.round(r.gamePts||0)}</b></div><div><small>单场最高篮板</small><b>${Math.round(r.gameReb||0)}</b></div><div><small>单场最高助攻</small><b>${Math.round(r.gameAst||0)}</b></div><div><small>最高赛季得分</small><b>${fmt(r.bestPpg)}</b></div><div><small>最高赛季篮板</small><b>${fmt(r.bestRpg)}</b></div><div><small>最高赛季助攻</small><b>${fmt(r.bestApg)}</b></div></div></div><div class="v26-archive-section"><h3>逐赛季完整履历</h3><div class="season-table">${career.history.slice().reverse().map(h=>`<div class="season-line"><div><b>${h.season}</b><span>${h.age}岁</span></div><div class="season-data"><b>${teamBy(h.team).name} · ${h.record}</b><p>${fmt(h.stats.pts)}分 ${fmt(h.stats.reb)}板 ${fmt(h.stats.ast)}助 · ${fmt(h.stats.min||0)}分钟</p><div class="v26-shooting-row">投篮 ${fmt(h.stats.fgm||0)}/${fmt(h.stats.fga||0)} (${fmt(h.stats.fg||0)}%) · 三分 ${fmt(h.stats.tpm||0)}/${fmt(h.stats.tpa||0)} (${fmt(h.stats.three||0)}%) · 罚球 ${fmt(h.stats.ftm||0)}/${fmt(h.stats.fta||0)} (${fmt(h.stats.ft||0)}%)</div><p>${h.awards?.join(' / ')||'无主要奖项'} · ${h.result}</p></div><strong>${h.ovr}</strong></div>`).join('')||'<div class="tiny">赛季结束后自动记录。</div>'}</div></div><div class="v26-archive-section"><h3>荣誉墙</h3><div class="honor-wall">${Object.entries(career.honors).filter(([,v])=>v>0).map(([k,v])=>`<div class="honor">${asset(`【素材位：${k}奖杯图标】`,'透明PNG')}<b>${k}</b><span>× ${v}</span></div>`).join('')||'<div class="tiny">暂时还没有主要荣誉。</div>'}</div></div><div class="v26-archive-section"><h3>重要里程碑</h3><div class="achievement-ledger">${ach.slice().reverse().map(a=>`<div class="achievement-item ${a.kind}"><i>${a.kind==='award'?'🏆':a.kind==='record'?'📈':'★'}</i><div><small>${a.label}${a.game?` · G${a.game}`:''}</small><b>${a.title}</b><p>${a.detail}</p></div></div>`).join('')||'<div class="tiny">达到生涯新高、数据里程碑或荣誉后会记录。</div>'}</div></div><div class="v26-archive-section"><h3>交易 / 伤病履历</h3><div class="transaction-list">${career.tradeHistory.map(t=>`<div><b>${t.season} · ${t.from} → ${t.to}</b><span>${t.type}</span></div>`).join('')||'<div class="tiny">暂未发生交易。</div>'}</div><div class="injury-list" style="margin-top:7px">${career.injuryHistory.map(i=>`<div><b>${i.season} · ${i.name}</b><span>G${i.game} · ${i.severity} · 缺席约${i.games}场</span></div>`).join('')||'<div class="tiny">暂未出现需要记录的伤病。</div>'}</div></div><div class="retire-box"><b>主动退役</b><p>最终报告会使用以上完整数据生成你的世界线评价。</p><button onclick="ui.modal={kind:'retire'};render()">宣布退役</button></div></section>`};
legacyView=careerArchiveView;

/* === V2.7 STORY REWRITE === */
(function(){
const V27={
 bennett:[
  {t:'第一天就没人知道该把你放哪',scene:'2013 · 克利夫兰训练馆 · 选秀后一周',speaker:'球员发展会议',b:()=>`战术板上写着三个位置：三号位、四号位、小球五号位。教练组争了十分钟，没人能给出一句确定答案。你是状元，却连“你到底是什么球员”都没有答案。会议散了以后，一位老将把战术板擦掉，只留下一句话：先别管状元，先想办法让教练愿意在第四节把你留在场上。`,stakes:'这不是加属性，而是在决定你整个前两年的身份。',c:()=>[
   ['把体重降下来，做能换防的机动四号位','以后剧情更偏防守、速度和稳定轮换。',{a:{athleticism:2,defense:1,durability:2},s:5,flag:['identity','mobile']}],
   ['保留力量，做低位和篮板型四号位','以后会更容易获得内线轮换，但外线成长更慢。',{a:{finishing:2,rebounding:2},h:-2,flag:['identity','inside']}],
   ['我就是状元，我要把三分练出来','风险最高；如果前半年顶住低命中率，后面上限更高。',{a:{shooting:3},c:-4,s:4,flag:['identity','stretch']}]
  ]},
  {t:'第七次空位，球馆开始笑了',scene:'新秀赛季 · 客场第四节',speaker:'替补席',b:()=>`你又得到一个完全空的底角。球刚离手，看台已经有人在笑。球砸在篮筐前沿。回防时你能听见第一排有人喊“NUMBER ONE”。暂停回来，老将没有安慰你，只问：下一次他们还放，你还投不投？`,stakes:'如果你开始躲球，教练会更快把你从轮换里拿走。',c:()=>[
   ['下一次还投，而且投完不低头','短期会继续难看，但自信不会被彻底打断。',{c:7,a:{mentality:2},s:6,flag:['pressure','face']}],
   ['先把空位让给队友，我靠篮板和防守留在场上','角色更稳定，但“状元得分手”的路线会提前结束。',{a:{defense:2,rebounding:2},tr:6,flag:['pressure','survive']}],
   ['赛后留下来加练到工作人员关灯','体能受影响，但下一章会出现训练成果回报。',{a:{shooting:2},h:-3,c:3,flag:['pressure','work']}]
  ]},
  {t:'终于打出一场像样的比赛',scene:'新秀赛季后半程 · 主场更衣室',speaker:'赛后',b:()=>{let r=career.storyFlags?.pressure;return `你第一次在主场打出让观众真正站起来的比赛。赛后记者围过来，第一个问题却还是“你是否觉得自己配得上状元”。${r==='work'?'训练师站在走廊尽头看着你——只有你们知道这场比赛前那些凌晨投篮。':r==='survive'?'你靠防守和篮板留在了场上，得分反而自然来了。':'你没有躲掉那些空位，今晚终于有几个球进了。'} 现在你必须决定，这场比赛是一个证明，还是一段新习惯的开始。`},stakes:'这章决定你是继续追标签，还是开始建立自己的比赛方式。',c:()=>[
   ['不庆祝，继续按现在的角色打','稳定成长，教练信任上升。',{tr:7,c:3,flag:['breakout','steady']}],
   ['公开说：我会让所有人后悔笑我','媒体压力会上升，但专属成长加速。',{c:6,s:10,flag:['breakout','fire']}],
   ['让经纪人推动更多球权','数据可能上涨，球队满意度可能下降。',{o:1,tr:-3,teamTrade:1,flag:['breakout','usage']}]
  ]},
  {t:'球队突然不再有时间等你',scene:'第二年夏天 · 管理层办公室',speaker:'球队方向改变',b:()=>`一夜之间，球队从“重建”变成了“现在就要赢”。会议里第一次出现“打包交易”的字眼。你看着桌上的深度图，发现属于你的成长时间被压缩成了几周。管理层没有说一定会交易你，只说了一句：如果你留下，你必须马上能帮一支争冠球队。`,stakes:'这一章决定你是留在最高压力环境里证明自己，还是去一个允许犯错的地方重启。',c:()=>[
   ['留下，接受争冠球队的最低容错','信任提升，但球权下降；如果打出来，翻案速度最快。',{tr:6,c:2,flag:['contender','stay']}],
   ['让经纪人明确表示欢迎交易','更容易换到有时间培养你的球队。',{trade:'更多机会',flag:['contender','leave']}],
   ['不表态，只把休赛期练到最好','不主动改变环境，靠实力等待决定。',{a:{durability:2,shooting:1,defense:1},flag:['contender','wait']}]
  ]},
  {t:'换了球衣，标签却跟着来了',scene:'生涯第二阶段 · 新球队媒体日',speaker:'第一次重新介绍自己',b:()=>`新更衣柜、新号码、新战术本。可记者的问题没变：“你还在乎别人叫你最差状元吗？”这一次，没有人替你回答。你终于意识到，换队只能换环境，不能自动换掉你的身份。真正的重启必须发生在比赛里。`,stakes:'你要选择新的职业标签：得分手、蓝领、还是全能轮换。',c:()=>[
   ['我先成为教练每天都敢用的人','防守、耐久和信任成长更快。',{a:{defense:3,durability:2},tr:8,flag:['reinvent','reliable']}],
   ['我还没放弃成为高产得分手','投射和终结继续冲上限，但波动更大。',{a:{shooting:2,finishing:2},c:2,flag:['reinvent','scorer']}],
   ['我不再追固定位置，什么能让我上场就做什么','综合成长更平均，角色切换更顺。',{a:{playmaking:1,defense:1,rebounding:1,shooting:1},flag:['reinvent','utility']}]
  ]},
  {t:'合同名单上，你第一次排在边缘',scene:'生涯中段 · 训练营最后一天',speaker:'裁员名单',b:()=>`训练结束后，经理让你留下。桌上放着最终名单，你的名字在最后两行。不是因为你今天打得差，而是因为球队已经不愿意为“也许”付钱。你第一次面对一个比嘲笑更现实的问题：明天，你可能不是NBA球员了。`,stakes:'这是生涯生存章。选择会显著影响合同、球队信任和后续定位。',c:()=>[
   ['主动接受更小角色，只要留下','放弃球权，换稳定合同和信任。',{tr:10,a:{durability:2},flag:['survival','role']}],
   ['要求训练赛最后一场给我完整球权','高风险证明战，成功上限更高。',{c:6,o:1,h:-3,flag:['survival','bet']}],
   ['让经纪人寻找海外/发展联盟以外的第二条路','减少球队控制，后续更可能出现“重返NBA”剧情。',{trade:'新环境',flag:['survival','reset']}]
  ]},
  {t:'第一次面对老东家，全场都在等一个答案',scene:'生涯转折年 · 对阵克利夫兰',speaker:'赛前采访',b:()=>`赛前热身时，大屏幕放出了你选秀夜的画面。有人鼓掌，也有人笑。记者问你：“如果今天打得好，这算复仇吗？”你抬头看见当年坐过的替补席。真正的问题不是复仇，而是你还需不需要那座城市承认你。`,stakes:'决定你是继续与过去绑定，还是彻底摆脱它。',c:()=>[
   ['我要打到他们闭嘴','比赛爆发概率提升，但健康消耗增加。',{c:8,s:8,h:-3,flag:['closure','revenge']}],
   ['这只是一场普通比赛','心态和稳定性提升，旧标签影响减弱。',{a:{mentality:3},c:4,flag:['closure','moveon']}],
   ['赛后去和老工作人员打招呼','球队与球迷关系提升，剧情更偏和解。',{tr:4,c:5,flag:['closure','peace']}]
  ]},
  {t:'终于有人不再问“为什么是状元”',scene:'生涯成熟期 · 全国直播赛后',speaker:'职业生涯回望',b:()=>`采访快结束时，你突然发现，记者整晚没有问过选秀顺位。他们问的是防守、季后赛、合同、你如何帮助年轻队友。那个曾经压在每一场比赛上的问题，第一次没有出现。你等了很多年，真正的翻案却安静得几乎没有声音。`,stakes:'核心故事收束。之后剧情会进入“你如何定义余下职业生涯”。',c:()=>[
   ['我要冲一次真正的全明星','继续推高个人上限。',{o:1,a:{shooting:2,finishing:2},flag:['legacy','star']}],
   ['我要成为争冠球队最可靠的第四个人','防守与耐久成长，冠军适配更高。',{a:{defense:3,durability:2},tr:5,flag:['legacy','winner']}],
   ['我要让职业生涯尽可能长','降低后期衰退风险。',{a:{durability:4,mentality:2},h:7,flag:['legacy','longevity']}]
  ]}
 ],
 oden:[
  {t:'体检室里，所有人突然不说话了',scene:'2007 · 波特兰 · 选秀后体检',speaker:'医疗组',b:()=>`几小时前，你还是球队未来十年的中锋。现在，医生把扫描片挂在灯箱上，房间里安静得只剩空调声。没人说你不能打NBA，但每个人都开始用“长期”“负荷”“风险”这些词。你第一次意识到：你的对手可能不是另一个中锋，而是自己的身体。`,stakes:'第一章决定你之后对医疗团队的信任方式。',c:()=>[
   ['完全相信医疗组，哪怕整个赛季都要等','身体风险大幅下降，早期出场减少。',{h:10,s:-12,min:22,flag:['medical','trust']}],
   ['接受治疗，但我要尽快回到球场','折中方案，成长和风险都保留。',{h:5,s:-5,min:27,flag:['medical','balance']}],
   ['只要能打，我就不想被“保护”','信心提升，但后续高负荷事件更危险。',{c:7,s:10,min:33,flag:['medical','push']}]
  ]},
  {t:'康复中心的第147天',scene:'新秀赛季 · 空球馆上午7:10',speaker:'康复师',b:()=>{let r=career.storyFlags?.medical;return `球队在客场比赛，你留在空球馆做第147天康复。康复师把今天的跳跃次数写在白板上。${r==='trust'?'你已经学会不再问“什么时候复出”，只问“今天能不能比昨天多做一次”。':r==='push'?'你每完成一组都会问能不能加量，康复师开始故意把秒表藏起来。':'你一直在“快一点”和“别再受伤”之间摇摆。'} 更难受的是，你知道球队正在学会没有你也能赢。`},stakes:'决定你如何面对漫长康复和“被球队遗忘”的恐惧。',c:()=>[
   ['严格完成计划，不偷偷加量','耐久、健康提升，身体风险继续下降。',{a:{durability:2},h:7,s:-6,flag:['rehab','patient']}],
   ['每周多加一组对抗训练','复出能力更强，但风险上升。',{a:{finishing:2,rebounding:1},s:5,h:-2,flag:['rehab','extra']}],
   ['把时间用来学录像和防守站位','身体不冒险，防守阅读提升。',{a:{defense:3,mentality:2},flag:['rehab','study']}]
  ]},
  {t:'终于上场，却在第一晚又感到不对劲',scene:'第一次NBA常规赛 · 中场休息',speaker:'队医',b:()=>`你真的站上NBA球场了。第一次挡拆、第一次封盖、第一次听见主场为你的名字吼起来。可中场走回更衣室时，脚踝和膝盖同时出现让你熟悉又讨厌的紧绷感。队医问你：“下半场还打吗？” 这是你第一次在真正比赛里决定“现在”和“以后”。`,stakes:'选择会成为整个奥登主线反复回收的核心原则。',c:()=>[
   ['今天到此为止','健康与医疗信任上升，短期数据受损。',{h:8,s:-5,tr:3,flag:['gameday','stop']}],
   ['限制到20分钟，我还想回去','折中处理，风险小幅上升。',{c:3,s:2,min:20,flag:['gameday','limit']}],
   ['我等了这么久，不下场','球场信心大涨，但风险显著增加。',{c:8,s:10,h:-5,flag:['gameday','play']}]
  ]},
  {t:'你开始打得像所有人想象的那样',scene:'第二个健康阶段 · 连续首发',speaker:'教练组',b:()=>`过去十场，你的护框和篮板正在改变球队。媒体终于开始讨论篮球，而不是伤病。主教练却在录像会结束后留下你：“这正是最危险的时候。因为你现在会觉得自己已经好了。” 你看着下一周四场比赛的赛程，其中有一场背靠背。`,stakes:'决定你是否主动接受负荷管理。',c:()=>[
   ['背靠背第二场轮休','长期健康显著受益，数据和奖项略受影响。',{h:6,s:-6,a:{durability:2},flag:['load','rest']}],
   ['只限制第四节分钟','保留大部分表现，风险可控。',{s:-2,min:30,flag:['load','smart']}],
   ['全部打，我需要建立比赛节奏','冲上限最快，但后续伤病章节更严峻。',{o:1,c:4,s:8,flag:['load','full']}]
  ]},
  {t:'球场上那一下，所有人都听见了',scene:'赛季中段 · 一次篮下落地',speaker:'更衣室通道',b:()=>`你倒下以后没有立刻起来。队友围过来，观众也安静了。你坐在地板上摸着膝盖，脑子里不是疼，而是那张体检室的扫描片。担架还没推过来，你已经知道这不是普通扭伤。`,stakes:'重大伤病章。你如何处理这次打击，会改变后半生的身体与心态。',c:()=>[
   ['接受最保守方案：彻底治疗，不设复出日期','健康和耐久恢复最大，短期生涯停滞。',{h:18,s:-15,a:{durability:2},c:-3,flag:['major','surgery']}],
   ['标准治疗，目标下赛季揭幕战','折中恢复。',{h:10,s:-7,flag:['major','standard']}],
   ['只要医生允许，我就提前复出','保持球员身份感，但身体风险继续累积。',{c:8,h:4,s:12,flag:['major','rush']}]
  ]},
  {t:'合同不再是关于天赋，而是关于你还能不能打',scene:'复出年夏天 · 经纪人办公室',speaker:'自由市场',b:()=>`几年前，你是所有球队都想要的中锋。现在，经纪人把报价摆在桌上：有球队愿意给你机会，却没有人愿意保证首发、分钟或未来。你第一次要用“证明自己还能打”的方式重新进入联盟。`,stakes:'选择你的第二段职业生涯：争冠队、重建队或长期康复。',c:()=>[
   ['去争冠球队，接受20分钟角色','减少负荷，冠军机会提高。',{tr:6,min:22,s:-5,flag:['comeback','contender']}],
   ['去愿意给首发的球队','数据上限更高，伤病风险也更高。',{min:30,s:5,flag:['comeback','starter']}],
   ['再等一年，只签最适合身体的合同','健康提升，但年龄和机会在流失。',{h:10,a:{durability:2},flag:['comeback','wait']}]
  ]},
  {t:'第一次完整走完季后赛系列赛',scene:'季后赛更衣室 · 深夜',speaker:'医疗组与教练组',b:()=>`系列赛打到第六场，你没有被担架抬走，也没有因为膝盖提前结束赛季。比赛结束以后，队医把冰袋递给你，没有说“希望没事”，只说“明天九点恢复”。这句普通的话让你突然意识到：也许你的职业生涯终于可以被当成普通篮球生涯来讨论。`,stakes:'你要决定是否把健康换成最后的上限。',c:()=>[
   ['继续严格负荷管理','长期生涯最稳。',{h:8,s:-8,a:{durability:2},flag:['playoff','protect']}],
   ['只有淘汰赛生死战才解除限制','季后赛上限提高，风险中等。',{c:4,s:3,flag:['playoff','selective']}],
   ['我等了这么多年，就是为了这种比赛','冠军冲击最大，风险也最大。',{o:1,c:7,s:10,h:-4,flag:['playoff','allin']}]
  ]},
  {t:'“如果健康”终于不再是句式',scene:'生涯成熟期 · 赛季总结会',speaker:'职业生涯回望',b:()=>`媒体过去介绍你，总要先说“如果健康”。现在有人开始直接说你的防守、篮板、季后赛表现。伤病史没有消失，但它终于从故事的主语变成了背景。你赢下的不是一场比赛，而是让身体允许你拥有“普通球员才有的烦恼”：合同、角色、冠军、年龄。`,stakes:'核心故事收束。之后每个赛季都会围绕身体老化和荣誉目标继续。',c:()=>[
   ['冲DPOY和防守传奇','防守与篮板继续推高。',{a:{defense:3,rebounding:2},flag:['legacy','defense']}],
   ['冲冠军，把常规赛当成准备','耐久与健康提升，争冠适配更高。',{a:{durability:3},h:6,flag:['legacy','title']}],
   ['把生涯长度放第一位','后期衰退更慢。',{a:{durability:4,mentality:2},h:8,flag:['legacy','longevity']}]
  ]}
 ],
 kwame:[
  {t:'十九岁，状元，队里还有迈克尔·乔丹',scene:'2001 · 华盛顿训练营',speaker:'第一堂职业训练课',b:()=>`你刚从高中毕业。训练馆另一端，是全世界最熟悉的篮球运动员。记者把“历史第一位高中状元”和“乔丹亲自选择的人”写在同一个标题里。你甚至还没学会NBA的防守口令，所有人已经在问你什么时候成为明星。`,stakes:'你是选择证明“我现在就行”，还是先承认自己还只是19岁。',c:()=>[
   ['主动要求从替补开始学','成长耐心提升，短期外界评价下降。',{s:14,tr:4,c:2,flag:['start','learn']}],
   ['我要和所有成年人一样竞争首发','自信提高，但压力与失误容忍度更低。',{c:7,a:{mentality:1},flag:['start','compete']}],
   ['把训练全部押在基本功，不讨论角色','成长稳定，但上场时间增长更慢。',{a:{finishing:2,defense:2},flag:['start','fundamentals']}]
  ]},
  {t:'一句批评能传遍全国',scene:'新秀赛季 · 一次训练后',speaker:'媒体区',b:()=>`训练结束后，关于你“准备不足”的评价被写进第二天头版。真正刺痛你的不是批评，而是你知道里面有一部分是真的。回到公寓，你第一次认真想：如果我不是状元，我是不是可以安静地学两年？`,stakes:'决定你如何处理羞耻感与公开压力。',c:()=>[
   ['第二天提前两小时到馆，不回应媒体','长期成长和心态受益。',{a:{mentality:3,durability:1},s:6,flag:['criticism','work']}],
   ['主动找教练谈清楚我到底差在哪','球队关系大幅改善，后续技术章更具体。',{tr:9,c:2,flag:['criticism','talk']}],
   ['公开回应：给我时间，我会证明','自信提升，但舆论关注继续放大。',{c:7,s:4,flag:['criticism','answer']}]
  ]},
  {t:'乔丹退役以后，那个最巨大的影子突然没了',scene:'生涯第三阶段 · 更衣室',speaker:'球队变化',b:()=>`曾经所有问题都可以归结为“你能不能跟上乔丹的标准”。现在那个标准离开了，你却第一次不知道该拿什么要求自己。新教练问你：你想成为哪一种内线？不是“状元该是什么”，而是“你真正能成为什么”。`,stakes:'第一次真正由你自己选择技术身份。',c:()=>[
   ['护框和篮板，先成为可靠中锋','防守路线更稳。',{a:{defense:3,rebounding:3},flag:['role','anchor']}],
   ['保留四号位机动性和中投','技术上限更高，但成长更慢。',{a:{shooting:2,athleticism:2},flag:['role','four']}],
   ['低位终结和掩护，把简单的事做到极致','终结、信任提高。',{a:{finishing:3},tr:5,flag:['role','simple']}]
  ]},
  {t:'交易电话来的时候，你居然有一点轻松',scene:'生涯中段 · 经纪人来电',speaker:'离开华盛顿',b:()=>`你以为被交易会像失败，可挂掉电话以后，肩膀反而松了一点。新城市不会忘记你是状元，但至少每天训练不会再经过那面记录选秀夜的墙。问题是：换环境能给你新机会，也会给你新的比较。`,stakes:'选择新球队时最看重什么。',c:()=>[
   ['去愿意让我稳定首发的球队','上场时间和成长更稳定。',{trade:'更多机会',tr:4,flag:['trade','minutes']}],
   ['去强队，接受蓝领角色','数据降低，但季后赛和口碑机会更好。',{trade:'争冠球队',a:{defense:2,durability:1},flag:['trade','winner']}],
   ['不主动要求去哪，先接受命运','适应能力和心态提升。',{a:{mentality:3},c:3,flag:['trade','accept']}]
  ]},
  {t:'“黄油手”三个字开始跟着每一次失误',scene:'新球队 · 主场嘘声',speaker:'球迷与媒体',b:()=>`你连续丢了两个本该接住的传球。下一次球传来以前，全场已经先吸了一口气。篮球变得像烫手一样。赛后，一个年轻队友把球放到你柜子里：“明天我们练一百次同样的传球。”你突然意识到，羞耻感最可怕的不是别人笑，而是你开始预判自己会失败。`,stakes:'这是“能不能重新相信基本动作”的章节。',c:()=>[
   ['和队友每天加练接球与终结','终结、自信和队友信任上升。',{a:{finishing:3},c:6,tr:4,flag:['hands','train']}],
   ['减少持球，专心掩护、篮板、防守','降低失误暴露，角色更稳定。',{a:{defense:2,rebounding:2},tr:5,flag:['hands','simplify']}],
   ['不改变打法，我不能因为嘘声缩手','心态提升，但短期波动更大。',{a:{mentality:3},c:5,flag:['hands','face']}]
  ]},
  {t:'第一次有人把你当“可靠老将”而不是“失败状元”',scene:'生涯第六年以后 · 更衣室',speaker:'年轻中锋求助',b:()=>`一个刚进联盟的年轻内线训练后问你：“如果所有人都说我不行，怎么办？”你愣了一下，因为过去几年你一直在等别人告诉你答案。现在你发现，自己已经活过了那些最糟的年份。`,stakes:'选择你后半生的价值：上限、稳定、还是领导力。',c:()=>[
   ['继续冲个人上限，我还没结束','OVR和进攻继续提升。',{o:1,a:{finishing:2},flag:['veteran','ceiling']}],
   ['做最稳定的首发/轮换中锋','耐久、信任和防守提升。',{a:{durability:3,defense:2},tr:6,flag:['veteran','stable']}],
   ['开始主动带年轻人','心态和球队满意度显著提升。',{a:{mentality:3},tr:8,flag:['veteran','mentor']}]
  ]},
  {t:'季后赛第一次不再有人讨论你的选秀顺位',scene:'季后赛系列赛 · 赛后发布会',speaker:'篮球评价终于取代标签',b:()=>`记者问的是挡拆防守、篮板位置、对手怎么针对你。发布会快结束时你才反应过来：没有人提“2001年状元”。你花了很多年才得到一个普通职业球员最理所当然的权利——只因为篮球表现被评价。`,stakes:'这是夸梅线真正的“翻案点”。',c:()=>[
   ['我要把防守做到联盟前列','冲最佳防阵路线。',{a:{defense:3,rebounding:2},flag:['playoff','defense']}],
   ['我要把进攻补到能惩罚错位','终结和投射继续提升。',{a:{finishing:2,shooting:2},flag:['playoff','offense']}],
   ['我只想帮球队赢，不再追任何标签','球队信任和长期稳定度最高。',{tr:8,a:{durability:2},flag:['playoff','team']}]
  ]},
  {t:'你终于不用证明“状元没有选错”',scene:'生涯成熟期 · 夏天',speaker:'职业生涯回望',b:()=>`很多年以后，你看见一档节目又讨论“历史水货状元”。屏幕里出现年轻的你。你没有关掉电视，也没有生气。那已经是另一个人的问题。现在你真正关心的是下赛季还能不能防挡拆、还能不能帮助球队、还能不能再打一轮季后赛。`,stakes:'核心故事收束。后续转入“职业寿命与老将价值”的长期主线。',c:()=>[
   ['做防守型长青内线','防守、耐久继续增长。',{a:{defense:2,durability:3},flag:['legacy','anchor']}],
   ['最后冲一次全明星级别','OVR和进攻上限提升。',{o:1,a:{finishing:2,shooting:1},flag:['legacy','star']}],
   ['成为年轻球员最需要的老将','心态、信任、长期合同概率提升。',{a:{mentality:3},tr:9,flag:['legacy','mentor']}]
  ]}
 ],
 fultz:[
  {t:'你发现自己不会“自然地投篮”了',scene:'2017 · 费城训练馆 · 新秀训练营',speaker:'投篮教练',b:()=>`训练结束后，其他人都走了。你站在罚球线，连续做了三次完全不同的出手动作。投篮教练没有纠正，只把录像倒回去看。你问：“我刚才为什么会那样？” 他没有马上回答。最可怕的不是投不进，而是一个从小做了几十万次的动作突然需要思考。`,stakes:'第一章决定你是保护动作、强行比赛，还是立刻全面检查身体。',c:()=>[
   ['减少远投，只保留最自然的近距离出手','稳定与自信恢复，短期数据下降。',{s:12,c:4,a:{finishing:1},flag:['shot','protect']}],
   ['继续正常训练，我不能让队友看出我怕了','比赛节奏保留，但稳定波动更大。',{c:5,s:2,flag:['shot','playthrough']}],
   ['停止投篮训练，要求完整身体检查','更早进入医疗路线，短期信任下降。',{h:5,tr:-3,s:7,flag:['shot','medical']}]
  ]},
  {t:'慢镜头开始比比赛本身更出名',scene:'新秀赛季 · 全国直播后',speaker:'舆论风暴',b:()=>`比赛结束后，社交媒体没有讨论你的突破，而是在逐帧播放一个罚球。每个人都有解释：肩膀、心理、动作、训练方式。你手机不停震动。真正的问题是，连你自己都不知道哪个解释才是真的。`,stakes:'你要决定谁有资格继续影响你的恢复。',c:()=>[
   ['关掉社媒，只听球队医疗和训练团队','自信、稳定提高，外界反馈影响降低。',{c:7,s:8,a:{mentality:2},flag:['noise','inside']}],
   ['找独立专家做第二套诊断','更可能提前触发明确医疗结论。',{h:4,s:9,flag:['noise','secondopinion']}],
   ['继续比赛，用真实对抗找答案','球权保留，但健康和稳定风险增加。',{o:1,h:-3,s:-2,flag:['noise','game']}]
  ]},
  {t:'医生终于给问题一个名字',scene:'生涯第二阶段 · 专科诊室',speaker:'医疗诊断',b:()=>`你已经听过太多猜测。今天，医生第一次把检查结果、神经路径和肩颈模型一起摆在桌上，告诉你：这不是一句“你不会投了”能够解释的事。一个明确的诊断不会自动治好你，但至少让你知道敌人长什么样。`,stakes:'选择治疗与比赛优先级。',c:()=>[
   ['完全停赛，先把身体处理清楚','健康和投篮稳定大幅提升，出勤受损。',{h:14,s:15,c:3,flag:['diagnosis','rehab']}],
   ['边治疗边打有限分钟','折中恢复。',{h:7,s:8,min:24,flag:['diagnosis','limited']}],
   ['只要能上，我不想再缺席','短期存在感最高，但恢复更慢。',{c:6,h:-2,s:3,flag:['diagnosis','compete']}]
  ]},
  {t:'球队开始赢球，而你的时间越来越少',scene:'费城争冠窗口 · 管理层办公室',speaker:'交易截止日前',b:()=>`球队正在变强，目标从“培养未来”变成“现在争冠”。你理解这个逻辑，也知道它对你意味着什么：他们没有无限时间等你的投篮。经理没有逼你走，只问：“你觉得自己最需要的是争冠环境，还是能犯错的环境？”`,stakes:'决定费城是否还是你最适合的恢复地点。',c:()=>[
   ['留下，我要在这里把问题解决完','球队信任提高，球权更难拿。',{tr:8,s:5,flag:['philly','stay']}],
   ['接受交易，去愿意长期等我的球队','进入重启路线，适应后成长更顺。',{trade:'更多机会',c:4,flag:['philly','reset']}],
   ['让经纪人寻找最重视医疗团队的球队','健康优先，后续更偏恢复剧情。',{trade:'新环境',h:5,flag:['philly','medical']}]
  ]},
  {t:'第一次投进那个你没有思考过的三分',scene:'新环境 · 第一次完整复出',speaker:'比赛第四节',b:()=>`挡拆以后，防守者从掩护下方绕过去。以前这一幕会让你脑子瞬间塞满动作提示：手肘、肩膀、出手点。今天你什么都没想。你接球、起跳、投进。回防跑到中线时，你才意识到刚才发生了什么。`,stakes:'这是“投篮是否重新变回本能”的关键节点。',c:()=>[
   ['下一回合有空位继续投','出手信心和投射上限上升。',{a:{shooting:3},s:12,c:5,flag:['return','shoot']}],
   ['不追求连续命中，继续按比赛阅读','稳定性最高。',{s:10,a:{mentality:2},flag:['return','calm']}],
   ['把突破和组织放在第一位，投篮只做惩罚','组织与终结路线强化。',{a:{playmaking:3,finishing:2},s:5,flag:['return','creator']}]
  ]},
  {t:'身体又一次把你从正在变好的故事里拽出来',scene:'复出后阶段 · 一次膝部重伤',speaker:'赛季突然中断',b:()=>`你终于不再每天解释投篮，却在一次普通突破里倒下。更衣室里没有人敢立刻说“没事”。你看着天花板，第一反应不是疼，而是愤怒：为什么每当事情开始正常，身体总会要求你重新开始？`,stakes:'这章不是修投篮，而是决定你还能不能接受又一次长期康复。',c:()=>[
   ['不设复出日期，重新从零开始','健康、耐久和长期稳定最高。',{h:15,a:{durability:3},c:-2,flag:['acl','patient']}],
   ['目标明确：下赛季中段回来','折中路线。',{h:8,a:{durability:1},flag:['acl','target']}],
   ['我要尽快回来，不想再失去一年','自信提升，但耐久风险上升。',{c:7,h:3,a:{durability:-1},flag:['acl','rush']}]
  ]},
  {t:'有一天，记者问的终于不是你的投篮',scene:'生涯成熟期 · 赛后发布会',speaker:'身份改变',b:()=>`你刚送出12次助攻，关键时刻连续两次突破得分。发布会第一个问题是“你如何读对方的夹击”，第二个问题是“球队为什么最后让你持球”。没有人问肩膀，也没有人问罚球动作。你花了很多年，终于重新成为一个篮球问题，而不是医疗谜题。`,stakes:'选择你真正要成为的球员类型。',c:()=>[
   ['持球组织核心','组织与心态继续提升。',{a:{playmaking:3,mentality:2},o:1,flag:['identity','point']}],
   ['攻防双能卫','防守、投射同步提升。',{a:{defense:2,shooting:2},flag:['identity','two-way']}],
   ['突破优先的节奏型后卫','终结、耐久提升。',{a:{finishing:3,durability:2},flag:['identity','rim']}]
  ]},
  {t:'你不需要把大学时期的自己找回来',scene:'生涯后段 · 夏季训练馆',speaker:'职业生涯回望',b:()=>`年轻时你一直想“恢复成原来的富尔茨”。现在你终于明白，经历过肩部问题、交易、康复和膝伤以后，那个人已经不存在了。真正的胜利不是复制18岁的动作，而是接受现在这副身体，再创造一套能赢球的版本。`,stakes:'核心故事收束。之后剧情围绕老化、球队角色和荣誉继续。',c:()=>[
   ['把组织变成生涯后期第一武器','组织和心态提升，年龄影响减弱。',{a:{playmaking:3,mentality:3},flag:['legacy','floor-general']}],
   ['继续把投篮练成稳定武器','投射、稳定继续提高。',{a:{shooting:3},s:8,flag:['legacy','shot']}],
   ['转型攻防均衡老将','防守、耐久提升。',{a:{defense:2,durability:3},flag:['legacy','veteran']}]
  ]}
 ],
 simmons:[
  {t:'第一年，你连NBA首秀都还没等到',scene:'2016 · 费城 · 训练营前后',speaker:'脚部伤情',b:()=>`状元发布会还没过去多久，脚伤就把你按在场边。球队把整个未来都放在你和另一位年轻核心身上，可你第一年只能穿西装坐在替补席。恢复过程中，你第一次有时间听清外界对你的两个评价：“天赋惊人”和“不会投篮”。`,stakes:'决定你新秀年如何利用：身体、投射，还是纯粹强化现有优势。',c:()=>[
   ['完全康复优先，顺便从近距离重做投篮动作','健康与投射基础改善，复出更稳。',{h:10,a:{shooting:2},s:7,flag:['rookie','rebuild']}],
   ['不碰投篮大改，我先把组织和防守练到极致','现有优势更快成为明星级。',{a:{playmaking:2,defense:2},flag:['rookie','strength']}],
   ['我要尽快复出，不想再等一年','自信提升，但健康风险增加。',{c:6,h:-3,s:3,flag:['rookie','rush']}]
  ]},
  {t:'你太快成功了，以至于弱点看起来不重要',scene:'真正的新秀赛季 · 全明星周末前',speaker:'球队内部会议',b:()=>`你能推转换、换防五个位置、送出不可思议的传球。球队开始赢球，“不会投”像一个可以以后再解决的小问题。投篮教练却提醒你：成功会让最难改的东西更容易被拖延。`,stakes:'现在是最容易错过的窗口：要不要在赢球时主动改变。',c:()=>[
   ['每场必须出手至少一个中距离','出手欲望提升，短期效率波动。',{a:{shooting:2},s:10,c:2,flag:['window','mid']}],
   ['每个休赛期再练，赛季里不破坏节奏','保持效率，但投射成长更慢。',{c:4,a:{playmaking:1},flag:['window','later']}],
   ['我不需要变成射手，把优势做到历史级','组织、防守进一步提升，后续季后赛被针对更严重。',{a:{playmaking:2,defense:2},flag:['window','identity']}]
  ]},
  {t:'季后赛第一次有人真的不防你了',scene:'季后赛系列赛 · 半场阵地战',speaker:'对手战术调整',b:()=>`对手后卫站在罚球线附近，完全放掉你两米。常规赛里这种空间能让你加速冲框，季后赛里他们每个回合都提前站好。暂停时，教练在战术板上画了三种解决办法，却没有一种能绕开同一个问题：你愿不愿意主动投。`,stakes:'确定你季后赛身份：投、切、或改打无球内线。',c:()=>[
   ['空位就投，哪怕连续打铁','出手欲望大幅提升，心态成长。',{s:15,a:{mentality:2,shooting:2},flag:['playoffs','shoot']}],
   ['用更强的突破和罚球制造惩罚','终结提升，但罚球压力会更大。',{a:{finishing:3},c:3,flag:['playoffs','attack']}],
   ['更多做掩护和短顺下，减少持球停滞','组织、篮板提升，角色更偏前场发动机。',{a:{playmaking:2,rebounding:2},flag:['playoffs','screen']}]
  ]},
  {t:'Game 7，篮下两步，没有人挡在你面前',scene:'2021式关键回合 · 系列赛生死战',speaker:'所有人都会记住的一秒',b:()=>`你突破到篮下，面前出现一个几乎空的终结窗口。身后是追防，底角有队友。这个决定只需要不到一秒，却可能被反复播放很多年。你不是在选择一个传球或上篮，而是在告诉所有人：关键时刻，你愿不愿意承担失败的可能。`,stakes:'这是西蒙斯线最大的历史分歧点。',c:()=>[
   ['起跳，直接扣','出手欲望和自信大涨；无论进不进，后续剧情不再围绕“逃避”。',{s:18,c:8,a:{finishing:2},flag:['game7','attack']}],
   ['读防守，传给更好的机会','组织提升，但如果球队输球，这个选择会成为长期舆论节点。',{a:{playmaking:2},s:-8,flag:['game7','pass']}],
   ['强行造犯规，接受去罚球线的压力','心态和出手欲望提升，罚球相关剧情开启。',{a:{mentality:3},s:10,c:4,flag:['game7','foul']}]
  ]},
  {t:'一个回合之后，整个夏天都变了',scene:'休赛期 · 球队关系破裂边缘',speaker:'经纪人与管理层',b:()=>{let g=career.storyFlags?.game7;return `赛季结束以后，所有采访都绕不开那个回合。${g==='attack'?'你至少知道自己没有躲，但球队仍然需要决定如何围绕你继续建队。':g==='pass'?'每一次重播都把那个传球变成性格审判，你开始不想再解释。':'罚球线上的结果没有解决所有问题，但你至少主动承担了那个回合。'} 经纪人问你一个简单问题：你还想回到这间更衣室吗？`},stakes:'决定费城关系是修复、重建，还是彻底结束。',c:()=>[
   ['留下，和教练组重新设计我的半场角色','球队信任恢复，后续进入重塑路线。',{tr:10,a:{mentality:2},flag:['philly','repair']}],
   ['正式申请交易','进入离队路线；短期满意度下降。',{trade:'重新定义自己',tr:-8,flag:['philly','leave']}],
   ['暂不表态，先把身体和比赛状态处理好','避免立即冲突，但不确定性持续。',{h:5,c:3,flag:['philly','pause']}]
  ]},
  {t:'换了球队以后，问题没有自动消失',scene:'新球队 · 第一次训练营',speaker:'新教练组',b:()=>`新队友不会每天提旧季后赛，但防守录像不会撒谎。第一次队内对抗，防守者仍然退到禁区。新教练暂停训练，把球递给你：“这里没有费城的问题，只有篮球问题。你想怎么解决？”`,stakes:'真正决定重塑方向。',c:()=>[
   ['接受大前锋/中锋发动机角色','篮板、终结、防守提升，减少持球停滞。',{a:{rebounding:3,finishing:2,defense:1},flag:['reinvent','big']}],
   ['继续当控球核心，但必须增加投射','组织、投射和出手欲望同步提升。',{a:{playmaking:2,shooting:3},s:10,flag:['reinvent','guard']}],
   ['成为防守王牌+转换核心，半场进攻做减法','防守、耐久和球队信任提升。',{a:{defense:3,durability:2},tr:5,flag:['reinvent','defense']}]
  ]},
  {t:'背部开始限制你曾经最理所当然的动作',scene:'生涯中段 · 康复训练馆',speaker:'身体变化',b:()=>`过去你从后场起速，几步就能冲进禁区。现在有些早晨，弯腰系鞋带都需要先活动几分钟。运动能力曾经让很多技术问题可以被绕开，而身体下滑会逼你面对它们。`,stakes:'选择后半生的技术迁移。',c:()=>[
   ['把组织和低位策应练成第一武器','组织、心态提高，减少对爆发力依赖。',{a:{playmaking:3,mentality:2},flag:['aging','pass']}],
   ['继续开发定点投篮，必须拉开空间','投射与出手欲望提升。',{a:{shooting:3},s:8,flag:['aging','shoot']}],
   ['彻底转型防守内线和掩护人','防守、篮板、耐久提升。',{a:{defense:2,rebounding:3,durability:2},flag:['aging','big']}]
  ]},
  {t:'你最终不是“会不会投篮”这一道题',scene:'生涯成熟期 · 赛季总结',speaker:'职业生涯回望',b:()=>`年轻时，所有讨论都像一道选择题：如果会投篮，你是不是超级巨星？后来你才发现职业生涯不是一道题。健康、角色、球队关系、关键回合、接受失败的能力，都会决定一个球员最后是谁。你不一定需要变成别人期待的模板，但必须主动选择自己是谁。`,stakes:'核心故事收束。后续每年围绕球队角色、身体与冠军目标继续。',c:()=>[
   ['成为组织型前场核心','组织、防守和心态继续加强。',{a:{playmaking:3,defense:2,mentality:2},flag:['legacy','point-forward']}],
   ['把投射练到真正不可放空','投射、出手欲望继续提高。',{a:{shooting:4},s:10,flag:['legacy','shooter']}],
   ['转型防守中锋式核心','防守、篮板、耐久继续提升。',{a:{defense:3,rebounding:3,durability:2},flag:['legacy','center']}]
  ]}
 ]
};

for(const k of Object.keys(V27))campaigns[k]=V27[k];

function v27Init(){if(!career)return;career.storyFlags=career.storyFlags||{};career.storyLog=career.storyLog||[]}
function v27Resolve(ev){v27Init();return{...ev,b:typeof ev.b==='function'?ev.b():ev.b,c:typeof ev.c==='function'?ev.c():ev.c}}
function v27Flag(fx){if(!fx?.flag)return;v27Init();let [k,v]=fx.flag;career.storyFlags[k]=v}
function v27ChapterCount(){return campaigns[career.playerId]?.length||8}

storyReady=function(i){
 if(i===0)return false;
 let schedule=[[1,14],[1,42],[2,12],[2,48],[3,16],[4,18],[5,20],[6,16]];
 let [sy,g]=schedule[i]||[Math.max(2,i),18];
 if(career.seasonNo>sy)return career.games>=8;
 return career.seasonNo===sy&&career.games>=g;
};
maybeStory=function(){
 if(!career||!career.exclusive||career.stage!=='regular')return false;v27Init();let arr=campaigns[career.playerId]||[];
 if(career.storyIndex<arr.length&&storyReady(career.storyIndex)){
  stopSim();ui.storyEvent=arr[career.storyIndex];save();render();return true;
 }
 if(career.storyIndex>=arr.length){ensureWorldline();let target=career.seasonNo%2?30:60;if(career.games>=target&&!career.worldline.longArcSeasons.includes(career.seasonNo)){stopSim();ui.storyEvent=makeLongArcEvent();save();render();return true}}
 return false;
};

storyGoal=function(){
 if(!career?.exclusive)return{title:'专属主线未解锁',goal:'本局不会出现人物剧情。',impact:'纯模拟生涯',pct:0};
 let arr=campaigns[career.playerId]||[],i=career.storyIndex;if(i>=arr.length)return{title:'核心故事已经走完',goal:'之后每个赛季仍会出现后职业阶段剧情。',impact:'角色 / 健康 / 球队关系 / 生涯结局',pct:100};
 let e=v27Resolve(arr[i]);let schedule=[[1,0],[1,14],[1,42],[2,12],[2,48],[3,16],[4,18],[5,20],[6,16]],target=schedule[i]||[career.seasonNo,18];let pct=career.seasonNo>target[0]?90:career.seasonNo<target[0]?Math.min(55,20+(career.seasonNo-1)*8):clamp(Math.round(career.games/Math.max(1,target[1])*85),8,95);
 return{title:e.t,goal:e.scene,impact:e.stakes,pct};
};

storyChoice=function(i){
 v27Init();let raw=ui.storyEvent;if(!raw)return;let ev=v27Resolve(raw),ch=ev.c[i];if(!ch)return;let before=impactSnapshot(),isLong=!!raw._longArc;applyFx(ch[2]);v27Flag(ch[2]);let after=impactSnapshot(),imp=impactDiff(before,after);ensureWorldline();
 if(isLong){if(!career.worldline.longArcSeasons.includes(career.seasonNo))career.worldline.longArcSeasons.push(career.seasonNo)}else career.storyIndex++;
 let rec={seasonNo:career.seasonNo,label:seasonLabel(),title:ev.t,scene:ev.scene,choice:ch[0],detail:ch[1],impact:imp.join(' · ')||ch[1],long:isLong};career.storyLog.push(rec);career.worldline.choices.push(rec);career.feed.unshift(`主线「${ev.t}」：${ch[0]}。${imp.join('、')||ch[1]}`);career.lastStoryGame=career.games;career.lastStorySeason=career.seasonNo;ui.storyEvent=null;
 let next=storyGoal();ui.modal={kind:'storyOutcome',data:{title:ev.t,choice:ch[0],effect:ch[1],impact:imp,follow:career.storyIndex>=v27ChapterCount()?'核心故事已经完成，之后将进入后职业阶段连续剧情。':`下一章「${next.title}」会记住这次选择。不是重置。`}};save();render();
};

mainlineNowCard=function(){let p=currentP();if(!career.exclusive)return `<section class="story-lock"><div class="lock-icon">★</div><small>EXCLUSIVE STORY LOCKED</small><h2>没有解锁，就没有剧情护航</h2><p>本局只会进行纯职业生涯模拟。解锁【${p.exclusive.n}】后，才会出现贯穿多年的真实人物主线、连续选择和分支回收。</p><button onclick="unlockStoryMidCareer()">🎬 解锁专属天命 + 连续剧情</button></section>`;let x=storyGoal(),arr=campaigns[career.playerId]||[];return `<section class="v27-story-card"><div class="v27-story-index">${Math.min(career.storyIndex+1,arr.length)}<small>/${arr.length}</small></div><div><small>正在推进的专属故事</small><h3>${x.title}</h3><p>${x.goal}</p><div class="v27-story-progress"><i style="width:${x.pct}%"></i></div><b>${x.impact}</b></div><button onclick="stopSim();ui.tab='story';render()">进入剧情档案 →</button></section>`};

storyView=function(){v27Init();let p=currentP(),arr=campaigns[p.id]||[],w=career.worldline,div=w.divergence,end=mainlineEnding();return `<section class="v27-story-header"><small>CHARACTER CAMPAIGN</small><h2>${p.zh} · 一条会记住你选择的生涯故事</h2><p>剧情配角与私下对话为游戏化虚构，历史节点以真实生涯环境为锚点。每一章会读取前面的路线，不是独立事件。</p></section>${!career.exclusive?mainlineNowCard():`<div class="v27-chapter-list">${arr.map((e,i)=>{let r=v27Resolve(e),done=i<career.storyIndex,on=i===career.storyIndex;return `<div class="v27-chapter ${done?'done':''} ${on?'on':''}"><span>${done?'✓':String(i+1).padStart(2,'0')}</span><div><small>${r.scene}</small><b>${r.t}</b><p>${done?(career.storyLog.find(x=>x.title===r.t)?.choice||'这一章已经写入你的世界线'):on?'这是你现在正在走向的剧情节点':'后续章节会读取前面的选择继续发展'}</p></div></div>`}).join('')}</div>`}<section class="v27-choice-history"><h3>你的故事不是“数值记录”</h3>${career.storyLog.slice().reverse().map(x=>`<div><small>${x.label}${x.scene?` · ${x.scene}`:''}</small><b>${x.title}</b><p>你选择：${x.choice}</p><strong>${x.impact}</strong></div>`).join('')||'<p class="tiny">第一章做出选择后，这里会记录每一次决定和它真正造成的结果。</p>'}</section>${div?`<div class="divergence-card"><div class="fork">Y</div><div><small>首个历史分歧 · ${div.label}</small><b>${div.title}</b><p>${div.reason}</p></div></div>`:''}<div class="story-outcome"><div class="seal">◆</div><div><small>当前世界线倾向</small><b>${end[0]}</b><p>${end[1]}</p></div></div>`};

const __v27OverlayBase=renderOverlay;
renderOverlay=function(){
 if(ui.storyEvent){let e=v27Resolve(ui.storyEvent),idx=Math.min(career.storyIndex+1,v27ChapterCount());return `<div class="overlay"><div class="sheet v27-sheet"><div class="sheet-handle"></div><div class="v27-scene-top"><div><small>${e.scene||'CAREER STORY'}</small><h2>${e.t}</h2></div><span>${idx}/${v27ChapterCount()}</span></div>${asset('【素材位：本章剧情插图】','用途：对应当前章节的真实篮球场景；不要文字')}<div class="v27-speaker">${e.speaker||'剧情节点'}</div><p class="v27-body">${e.b}</p><div class="v27-stakes"><b>这次选择会留下后果</b><span>${e.stakes||'后续章节会读取你的选择。'}</span></div><div class="choice-list">${e.c.map((c,i)=>`<button class="choice v27-choice" onclick="storyChoice(${i})"><b>${c[0]}</b><span>${c[1]}</span></button>`).join('')}</div><div class="sheet-footer"><span>前面的选择会改变后面的故事文本和路线</span><span>专属主线</span></div></div></div>`}
 return __v27OverlayBase();
};

/* richer long arcs after core story */
makeLongArcEvent=function(){v27Init();let p=currentP(),age=career.age,flags=career.storyFlags||{},phase=age>=33?'生涯后段':age>=28?'巅峰期':'成长后段';let cfg={
 bennett:['旧标签又被写进了赛前专题',`你已经不是当年那个新秀，可电视节目又把“最差状元”四个字放在你名字旁边。${flags.closure==='moveon'?'你发现自己几乎没有情绪，只关心明天的对位。':'你还是会在看到那几个字时停一下。'}`],
 oden:['训练师把你的生涯出场数写在白板上',`曾经“打一整个赛季”都是奢望。现在真正的问题变成：${phase}还要不要继续为了更高荣誉冒险使用身体。`],
 kwame:['更衣室里又来了一个被骂得很惨的年轻内线',`他问你怎么熬过第一份合同。你突然发现，自己的失败经验已经变成别人最需要的经验。`],
 fultz:['年轻队友问你为什么罚球前总会深呼吸一下',`你已经很久没解释过当年的投篮问题。现在你必须决定，那段经历是你想隐藏的旧伤，还是可以拿来帮助别人的东西。`],
 simmons:['对手又一次在季后赛收缩禁区',`年龄和伤病让你不再能靠第一步解决所有问题。${flags.reinvent==='guard'?'你已经练出的投射现在必须真正经受季后赛检验。':'你必须依靠重新定义后的角色解决空间问题。'}`]
 }[p.id];let opts={
 bennett:[['不回应节目，只准备比赛','心态+2，耐久+1',{a:{mentality:2,durability:1}}],['把它当燃料','自信+4，逆风值+5',{c:4,s:5}],['主动接受采访，完整讲自己的故事','球队与球迷支持提升',{tr:5,c:3}]],
 oden:[['常规赛继续限负荷','健康+6，风险-5',{h:6,s:-5}],['只在季后赛拉满','防守+2，风险+2',{a:{defense:2},s:2}],['最后几年不再保留','终结+2，篮板+2，风险+7',{a:{finishing:2,rebounding:2},s:7}]],
 kwame:[['主动带他训练','心态+2，球队信任+6',{a:{mentality:2},tr:6}],['告诉他先找到一个能留在场上的技能','防守+2，耐久+1',{a:{defense:2,durability:1}}],['不当导师，我还想为自己竞争','终结+2，自信+3',{a:{finishing:2},c:3}]],
 fultz:[['把当年的康复笔记给他看','心态+3，信任+5',{a:{mentality:3},tr:5}],['不谈过去，只教比赛阅读','组织+2',{a:{playmaking:2}}],['我还想继续把投篮练得更好','投射+2，稳定+3',{a:{shooting:2},s:3}]],
 simmons:[['继续投，不再躲任何空位','投射+2，出手欲望+5',{a:{shooting:2},s:5}],['彻底以内线发动机解决空间','篮板+2，组织+2',{a:{rebounding:2,playmaking:2}}],['防守和转换依然是我的比赛','防守+2，耐久+2',{a:{defense:2,durability:2}}]]
 }[p.id];return{_longArc:true,t:`${seasonLabel()} · ${cfg[0]}`,scene:`${phase} · 长期主线`,speaker:'职业生涯继续',b:cfg[1],stakes:'这不是重复事件，会根据你前面的路线继续塑造后半生。',c:opts};
};

const style=document.createElement('style');style.textContent=`
.v27-story-card{margin-top:10px;background:linear-gradient(135deg,#1f2937,#4b5563 60%,#7c3aed);color:#fff;border-radius:22px;padding:12px;display:grid;grid-template-columns:52px 1fr auto;gap:10px;align-items:center;box-shadow:0 18px 40px rgba(48,43,80,.18)}.v27-story-index{width:52px;height:52px;border-radius:16px;background:rgba(255,255,255,.12);display:grid;place-items:center;font-size:23px;font-weight:1000}.v27-story-index small{font-size:9.5px}.v27-story-card small{font-size:7.5px;color:#ddd6fe}.v27-story-card h3{font-size:13.5px;margin:2px 0}.v27-story-card p{font-size:8.5px;line-height:1.45;margin:0;color:#f5f3ff}.v27-story-card b{font-size:7.5px;color:#fde68a}.v27-story-card button{border:0;border-radius:12px;padding:9px;background:#fff;color:#312e81;font-weight:1000}.v27-story-progress{height:5px;background:rgba(255,255,255,.18);border-radius:99px;margin:7px 0}.v27-story-progress i{display:block;height:100%;background:linear-gradient(90deg,#fbbf24,#fb7185);border-radius:99px}
.v27-story-header{background:linear-gradient(145deg,#fff7ed,#fff);border:1px solid #efd7c1;border-radius:24px;padding:13px}.v27-story-header small{font-size:7.5px;color:#b36e47}.v27-story-header h2{font-size:20px;margin:3px 0}.v27-story-header p{font-size:9.5px;line-height:1.55;color:#76655b}.v27-chapter-list{display:grid;gap:7px;margin-top:9px}.v27-chapter{display:grid;grid-template-columns:42px 1fr;gap:8px;padding:10px;background:#fff;border:1px solid #eadfd5;border-radius:17px;opacity:.62}.v27-chapter.done,.v27-chapter.on{opacity:1}.v27-chapter.on{border-color:#e88a68;box-shadow:0 0 0 2px #fff0e8}.v27-chapter>span{width:38px;height:38px;border-radius:12px;background:#eee5dd;display:grid;place-items:center;font-size:10.5px;font-weight:1000}.v27-chapter.done>span{background:#dff4e7;color:#268a55}.v27-chapter.on>span{background:#fff0e8;color:#d45b4e}.v27-chapter small{font-size:6.5px;color:#aa8f7d}.v27-chapter b{display:block;font-size:10.5px;margin:2px 0}.v27-chapter p{font-size:7.5px;line-height:1.4;color:#87766c;margin:0}.v27-choice-history{margin-top:10px;background:#fff;border:1px solid #eadfd5;border-radius:20px;padding:11px}.v27-choice-history h3{font-size:12.5px;margin:0 0 8px}.v27-choice-history>div{padding:8px 0;border-top:1px dashed #eadfd5}.v27-choice-history small{font-size:6.5px;color:#aa8f7d}.v27-choice-history b{font-size:10.5px;display:block}.v27-choice-history p{font-size:8.5px;margin:2px 0}.v27-choice-history strong{font-size:7.5px;color:#c15d49}.v27-sheet .asset-slot{height:150px}.v27-scene-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.v27-scene-top small{font-size:7.5px;color:#b27652}.v27-scene-top h2{font-size:20px;margin:3px 0}.v27-scene-top>span{font-size:9.5px;background:#231f20;color:#fff;border-radius:999px;padding:5px 8px}.v27-speaker{display:inline-block;margin:8px 0 4px;background:#fff1e6;color:#b4573f;padding:5px 8px;border-radius:99px;font-size:7.5px;font-weight:1000}.v27-body{font-size:10.5px!important;line-height:1.75!important;color:#55483f!important}.v27-stakes{background:#231f20;color:#fff;border-radius:14px;padding:9px;margin:9px 0}.v27-stakes b{display:block;font-size:9.5px}.v27-stakes span{font-size:7.5px;color:#e9dfd8}.v27-choice{background:#fff!important;border:1px solid #e6d8ce!important}.v27-choice:hover{border-color:#e67e5c!important}
`;document.head.appendChild(style);

if(career){v27Init();save();render()}
})();



/* === V2.8 PREMIUM STORY + EXCLUSIVE DESTINY === */
(function(){
const P=id=>playerBy(id);
const F=k=>career?.storyFlags?.[k];
const routeLabels={
  bennett:{mobile:'机动四号位',inside:'力量内线',stretch:'空间四号位',reliable:'稳定轮换',scorer:'得分翻案',utility:'万能拼图'},
  oden:{trust:'极致保护',balance:'医学折中',push:'天赋全开',portland:'波特兰王朝线',miami:'迈阿密重生线'},
  kwame:{learn:'慢养成',compete:'正面竞争',fundamentals:'基本功重建',anchor:'防守支柱',four:'机动四号位',simple:'简化进攻'},
  fultz:{medical:'医学真相线',mechanics:'动作重构线',play:'带伤证明线',orlando:'奥兰多重启',philly:'费城坚持'},
  simmons:{shoot:'投射解禁线',big:'前场发动机线',defense:'防守王牌线',repair:'费城修复',leave:'离开费城'}
};

Object.assign(P('bennett').exclusive,{
 n:'状元逆命·嘘声越响，我越强',
 d:'【立刻生效】自信+8、心态+3、逆风值+12。每次低谷都会积累“逆命层数”，6层自动+1 OVR，每季最多触发3次；负面舆论自信损失减半。并解锁长篇真实人物分支主线。',
 perks:['低谷可转化为OVR成长','负面舆论损失减半','解锁Mike Brown / Kyrie / LeBron / Wiggins等人物主线'],
 cast:'Mike Brown · Kyrie Irving · Dion Waiters · Tristan Thompson · Luol Deng · LeBron James · Andrew Wiggins'
});
Object.assign(P('oden').exclusive,{
 n:'神躯重铸·健康版奥登',
 d:'【立刻生效】耐久+6、健康+8、身体风险-20。免疫生涯报销级伤病；所有伤病发生概率降低90%；每次伤病复出后耐久+2。并解锁长篇“如果奥登真的健康”分支主线。',
 perks:['免疫生涯报销级伤病','伤病概率-90%','伤病复出后耐久+2','解锁Roy / Aldridge / McMillan / Miami重生线'],
 cast:'Nate McMillan · Brandon Roy · LaMarcus Aldridge · Mike Conley Sr. · Erik Spoelstra · Dwyane Wade · LeBron James'
});
Object.assign(P('kwame').exclusive,{
 n:'十九岁重开·把状元重新养一遍',
 d:'【立刻生效】心态+6、成长耐心+15、教练信任+5。23岁前每个休赛期专精额外+1；每年自动补强2项最低能力；自信最低锁在55。并解锁长篇乔丹—科比双时代人物主线。',
 perks:['23岁前专精翻倍','每年补强2项最低能力','解锁Michael Jordan / Doug Collins / Kobe / Phil Jackson主线'],
 cast:'Michael Jordan · Doug Collins · Brendan Haywood · Jared Jeffries · Kobe Bryant · Phil Jackson'
});
Object.assign(P('fultz').exclusive,{
 n:'原装回归·大学时期完整投篮包',
 d:'【立刻生效】投射+6、投篮稳定直接65、自信+8。投射专精额外+1；稳定≥80时赛季末再强化投射并获得额外OVR成长。并解锁长篇从费城迷失到奥兰多重生的悬念主线。',
 perks:['开局投射+6 / 稳定65','投射专精额外+1','解锁Brett Brown / Embiid / Simmons / Steve Clifford / Judy Seto主线'],
 cast:'Brett Brown · Joel Embiid · Ben Simmons · JJ Redick · Jimmy Butler · Steve Clifford · Jeff Weltman · Judy Seto'
});
Object.assign(P('simmons').exclusive,{
 n:'完全体西帝·投篮封印解除',
 d:'【立刻生效】投射+8、出手欲望至少68、自信+5。投射专精额外+1；季后赛每场都会获得“主动进攻”加成，额外制造2~4分，出手欲望不会跌破68。并解锁长篇费城崩塌与重建分支主线。',
 perks:['开局投射+8 / 出手欲望≥68','季后赛每场主动进攻+2~4分','解锁Embiid / Butler / Doc Rivers / Trae Young / Morey / Harden主线'],
 cast:'Brett Brown · Joel Embiid · Jimmy Butler · Doc Rivers · Daryl Morey · Trae Young · Matisse Thybulle · James Harden'
});

function fx(flags,extra={}){return Object.assign({},extra,{flags})}
function bodyName(name,text){return `<b class="story-name">${name}</b>${text}`}

const V28={
bennett:[
 {t:'Mike Brown把你叫到战术板前：状元不是位置',scene:'2013 · 克利夫兰训练馆 · 选秀后一周',speaker:'Mike Brown / Kyrie Irving / Tristan Thompson',cast:['Mike Brown','Kyrie Irving','Tristan Thompson'],b:()=>`训练结束后，主教练 <b>Mike Brown</b> 没让你走。他在战术板上写下“SF / PF / small-ball C”三个位置，然后把笔递给你：“媒体可以叫你状元，但我得知道第四节把你放在哪。”另一边，<b>Kyrie Irving</b> 和 <b>Tristan Thompson</b> 还在加练挡拆。你第一次意识到：这里没人会因为第一顺位自动给你球权。`,stakes:'你选的不是一项属性，而是前两年的篮球身份；后面Mike Brown的轮换、Kyrie的配合和交易价值都会读取这个选择。',c:()=>[
  ['减重，跟Tristan竞争机动四号位','路线：机动四号位。防守、移动、长期轮换更稳。',fx([['identity','mobile'],['route','mobile']],{a:{athleticism:2,defense:2,durability:1},tr:4})],
  ['保留力量，我要在内线撞出位置','路线：力量内线。篮板终结更快，但空间问题会反复回来。',fx([['identity','inside'],['route','inside']],{a:{finishing:2,rebounding:2},c:3})],
  ['我要让Kyrie相信我能拉开空间','路线：空间四号位。前期最痛苦，但上限最高。',fx([['identity','stretch'],['route','stretch']],{a:{shooting:3},c:-2,s:4})]
 ]},
 {t:'Dion Waiters把球又传给了你——全场都知道你前六次没进',scene:'新秀赛季 · 客场第四节',speaker:'Dion Waiters / Mike Brown',cast:['Dion Waiters','Mike Brown'],b:()=>`你在底角已经连续投丢。暂停时，<b>Mike Brown</b> 只说了一句：“空位就是空位。”重新上场，<b>Dion Waiters</b> 突破吸引协防，球第七次飞到你手里。第一排有人已经站起来等着嘘。你看见Dion没回防——他在等你决定到底投不投。`,stakes:'这次决定会改变队友是否继续信任你，也会改变“逆命层数”的触发方式。',c:()=>[
  ['不犹豫，接球就投','如果继续打铁会更难看，但队友会知道你没躲。',fx([['pressure','face']],{c:7,tr:3,s:5})],
  ['把球砸进内线，先靠篮板和防守活下来','路线更偏“先成为NBA球员，再谈状元”。',fx([['pressure','survive']],{a:{defense:2,rebounding:2},tr:6})],
  ['赛后找Dion加练，投到球馆关灯','下一章会出现加练回报；短期体能下降。',fx([['pressure','work']],{a:{shooting:2},h:-3,c:4})]
 ]},
 {t:'19分10篮板之后，Mike Brown第一次在记者面前替你说话',scene:'2014 · 对国王赛后 · 骑士更衣室',speaker:'Mike Brown / Kyrie Irving / Luol Deng',cast:['Mike Brown','Kyrie Irving','Luol Deng'],b:()=>`你终于打出一场所有人都无法忽略的比赛：19分、10篮板。赛后 <b>Mike Brown</b> 在发布会上说，大家现在开始看到训练里那个有天赋的年轻人。回更衣室时，<b>Kyrie Irving</b> 把比赛用球扔给你，<b>Luol Deng</b> 却提醒：“一场好球只能让他们安静一晚。”你知道他说得对。`,stakes:'这是第一场“翻案证据”。你可以追数据、追稳定，或者追一个真正的角色。',c:()=>[
  ['我不要热搜，我要连续20场进轮换','稳定线：信任与耐久显著提升。',fx([['breakout','steady']],{tr:8,a:{durability:2,mentality:1}})],
  ['让Kyrie多给我做外弹，我要把三分练成武器','空间线继续加深，后面和LeBron体系适配更高。',fx([['breakout','spacing']],{a:{shooting:3},c:4})],
  ['我想要更多球权，证明19+10不是偶然','高风险得分线，管理层会重新评估你。',fx([['breakout','usage']],{o:1,tr:-2,teamTrade:1,c:5})]
 ]},
 {t:'LeBron回来了。David Griffin把“Kevin Love”写在白板上',scene:'2014夏天 · 骑士管理层会议',speaker:'David Griffin / LeBron James',cast:['David Griffin','LeBron James','Kevin Love','Andrew Wiggins'],b:()=>`总经理 <b>David Griffin</b> 的办公室里，深度图一夜之间完全变了。<b>LeBron James</b> 回到克利夫兰，球队不再讨论“培养三年”，而是讨论“今年怎么进总决赛”。桌上摆着一套交易框架：<b>Kevin Love</b>，以及你和新科状元 <b>Andrew Wiggins</b> 的名字。你第一次发现，成为状元也可能只是交易筹码的一部分。`,stakes:'这里会把你的世界线分成“留在LeBron身边”或“去明尼苏达重启”两条大支线。',c:()=>[
  ['告诉David Griffin：给我训练营，我能留在LeBron体系','进入“克利夫兰争冠留队线”。容错极低，成功收益极高。',fx([['franchise','cleveland'],['majorRoute','cavs']],{tr:5,a:{defense:1,shooting:1}})],
  ['接受交易，去明尼苏达和Wiggins从零开始','进入“森林狼重启线”。球权和犯错空间更大。',fx([['franchise','minnesota'],['majorRoute','wolves']],{trade:'更多机会',c:4,s:4})],
  ['不表态，让经纪人只争取“必须有稳定轮换”','开放路线：去哪里都可以，但必须拿到角色承诺。',fx([['franchise','role-first'],['majorRoute','open']],{tr:2,a:{mentality:2}})]
 ]},
 {t:()=>F('majorRoute')==='cavs'?'LeBron在训练后问你：你能不能成为我身边那个不犯错的人？':'Flip Saunders把你和Wiggins留到最后：这里没人替你背状元标签',scene:()=>F('majorRoute')==='cavs'?'2014-15 · 克利夫兰训练馆':'2014-15 · 明尼苏达训练馆',speaker:()=>F('majorRoute')==='cavs'?'LeBron James / Kyrie Irving':'Flip Saunders / Andrew Wiggins',cast:()=>F('majorRoute')==='cavs'?['LeBron James','Kyrie Irving']:['Flip Saunders','Andrew Wiggins'],b:()=>F('majorRoute')==='cavs'?`训练结束，<b>LeBron James</b> 没走。他让你连续做了十几次弱侧轮转，然后问：“你想要球权，还是想要季后赛里我还能把你留在场上？”旁边 <b>Kyrie Irving</b> 正在练终结。你知道在这支队，错误会被无限放大。`:`<b>Flip Saunders</b> 把你和 <b>Andrew Wiggins</b> 留在场边。他没有提“最差状元”，只问：“你俩谁先学会在82场里稳定做一件事？”Wiggins拥有所有聚光灯，而你第一次得到一种奇怪的自由：没人再要求你马上像状元。`,stakes:'同一个角色，不同球队会走完全不同的第二阶段。',c:()=>F('majorRoute')==='cavs'?[
  ['接受3D+篮板角色，先让LeBron信任我','争冠适配线。',fx([['reinvent','reliable']],{a:{defense:3,rebounding:1},tr:8})],
  ['坚持空间四号位，我要让对手不能收缩','投射线。',fx([['reinvent','scorer']],{a:{shooting:3,finishing:1},c:3})],
  ['什么脏活都做，只要季后赛还在轮换','万能拼图线。',fx([['reinvent','utility']],{a:{defense:2,durability:2,playmaking:1},tr:6})]
 ]:[
  ['和Wiggins一起跑转换，做高能量四号位','运动、防守与篮板成长。',fx([['reinvent','reliable']],{a:{athleticism:2,defense:2,rebounding:1},tr:5})],
  ['我要把球权抢回来，重新证明状元不是误会','得分翻案线。',fx([['reinvent','scorer']],{a:{shooting:2,finishing:2},c:6})],
  ['接受第六人，什么位置都能顶','万能拼图线。',fx([['reinvent','utility']],{a:{playmaking:1,defense:1,rebounding:1,durability:1},tr:7})]
 ]},
 {t:'“最差状元”又上了全国节目，但这次更衣室里有人先笑了',scene:'生涯第三阶段 · 全国直播赛前',speaker:'队友 / 电视评论席',cast:['Kyrie Irving','Andrew Wiggins'],b:()=>`赛前电视节目又拿你的选秀顺位做标题。你进更衣室时，有队友先把电视静音。${F('majorRoute')==='cavs'?'<b>Kyrie Irving</b> 说：“今晚赢球，明天他们就得找别的素材。”':'<b>Andrew Wiggins</b> 把遥控器扔到一边：“你还真每天看这个？”'}你突然意识到：标签还在，但它已经不再决定房间里的空气。`,stakes:'这是心理分支：复仇、无视，或主动夺回叙事权。',c:()=>[
  ['今晚我要打到节目组改标题','爆发线，自信和逆风值上升。',fx([['narrative','revenge']],{c:8,s:8,h:-2})],
  ['关电视。我们只看对位录像','成熟线，心态和稳定性提升。',fx([['narrative','ignore']],{a:{mentality:3},tr:3})],
  ['赛后主动接受长访谈，把整个过程讲清楚','叙事权线，球迷支持与信任提升。',fx([['narrative','own']],{c:4,tr:5})]
 ]},
 {t:'经纪人说：这是你职业生涯第一次真正有“选择”',scene:'合同年 · 经纪人办公室',speaker:'经纪人 / 球队管理层',cast:['球队总经理','经纪人'],b:()=>`桌上不再只有底薪或训练营邀请。你面前出现三种合同：更高的钱、更稳定的轮换、以及真正能打季后赛的球队。经纪人把文件推过来：“以前你是在争取留下，现在你终于可以问自己想去哪。”这句话比任何一场20分都更像翻案。`,stakes:'从“证明自己”进入“选择生涯”的分界点。',c:()=>[
  ['选保证时间最多的合同','数据和角色优先。',fx([['contractPath','minutes']],{tr:5,o:1})],
  ['去争冠球队，哪怕少拿球','荣誉和季后赛优先。',fx([['contractPath','title']],{a:{defense:2,durability:1},tr:4})],
  ['留在最信任我的球队','稳定和长期关系优先。',fx([['contractPath','loyalty']],{c:4,tr:8})]
 ]},
 {t:'回到克利夫兰，大屏幕放出了2013年选秀夜',scene:'生涯中段 · 客场克利夫兰',speaker:'现场播报 / 老工作人员',cast:['Kyrie Irving','Tristan Thompson'],b:()=>`热身时，大屏幕突然切回2013年。年轻的你戴着骑士帽，现场响起复杂的声音。通道里，一位当年就认识你的工作人员拍了拍你。${F('majorRoute')==='cavs'?'你没有离开过这座城市太久，但那张脸依然像另一个人。':'你已经穿着另一件球衣回来了。'}赛前记者问：“这场球对你是不是特别？”`,stakes:'决定你最终如何处理“状元失败”这个旧身份。',c:()=>[
  ['特别。我不会假装不在乎','复仇和解并存，比赛爆发概率提高。',fx([['closure','honest']],{c:6,s:4})],
  ['已经不是了，我只想赢','彻底脱钩旧标签。',fx([['closure','moveon']],{a:{mentality:3},tr:3})],
  ['赛后去找Mike Brown时代的工作人员','和解线，球迷与球队关系提升。',fx([['closure','peace']],{c:4,tr:5})]
 ]},
 {t:'第一次有人介绍你时，没有提“状元”两个字',scene:'生涯成熟期 · 全国直播赛后',speaker:'赛后采访',cast:['队友','主教练'],b:()=>`采访结束时你才反应过来：主持人整晚没有问2013、没有问第一顺位、没有问“最差”。他问的是你的季后赛防守、最近十场三分、以及年轻队友为什么愿意听你说话。你等了很多年，真正的翻案却安静得不像电影。`,stakes:'核心故事收束；最后路线决定后续长期剧情的目标。',c:()=>[
  ['我还想进一次全明星','个人上限路线。',fx([['legacy','star']],{o:1,a:{shooting:2,finishing:2}})],
  ['我要成为冠军队最后五分钟敢用的人','争冠拼图路线。',fx([['legacy','winner']],{a:{defense:3,durability:2},tr:5})],
  ['我要把生涯打得尽可能长','长青路线。',fx([['legacy','longevity']],{a:{durability:4,mentality:2},h:6})]
 ]}
],
oden:[
 {t:'Nate McMillan没谈战术，先把核磁片推到你面前',scene:'2007 · 波特兰 · 选秀后体检',speaker:'Nate McMillan / LaMarcus Aldridge',cast:['Nate McMillan','LaMarcus Aldridge','Brandon Roy'],b:()=>`你刚和 <b>Brandon Roy</b>、<b>LaMarcus Aldridge</b> 被媒体称作波特兰的未来。可主教练 <b>Nate McMillan</b> 没先画战术，而是让医生把膝盖扫描片放在桌上。“我们可以赌十年，也可以赌十个月。”房间里没人笑。`,stakes:'这是整条奥登线的第一条原则：保护身体、折中，还是让天赋全开。',c:()=>[
  ['完全相信医疗组，哪怕新秀年都不打','极致保护线。后续Roy和Aldridge会等你，但球队也会学会没有你。',fx([['medical','trust'],['route','trust']],{h:10,s:-15,min:22})],
  ['接受手术和限制，但每个节点都争取提前一步','医学折中线。',fx([['medical','balance'],['route','balance']],{h:6,s:-6,min:27})],
  ['只要医生没禁止，我就要打','天赋全开线。上限最高，伤病分支最凶。',fx([['medical','push'],['route','push']],{c:8,s:10,min:33})]
 ]},
 {t:'Brandon Roy给你发来短信：别急，我们还在这里',scene:'微骨折手术后 · 康复第147天',speaker:'Brandon Roy / Mike Conley Sr.',cast:['Brandon Roy','Mike Conley Sr.'],b:()=>`球队在客场，康复中心只剩跑步机声音。你的导师兼经纪人 <b>Mike Conley Sr.</b> 刚结束电话，手机又亮了：<b>Brandon Roy</b> 发来一句“别急，我们还在这里”。你盯着波特兰的比赛直播，看 <b>LaMarcus Aldridge</b> 在内线继续成长。最难受的不是疼，是怕他们等不到你。`,stakes:'决定你是把康复当停赛，还是当成重新学习NBA的第一年。',c:()=>[
  ['严格执行计划，连偷偷加量都不做','身体风险持续下降。',fx([['rehab','patient']],{a:{durability:2},h:7,s:-6})],
  ['每周多一组对抗，我要保留比赛感觉','技术成长更快，但风险回升。',fx([['rehab','extra']],{a:{finishing:2,rebounding:1},s:5,h:-2})],
  ['跟Nate McMillan看录像，学Roy怎么读协防','防守阅读与心态提升。',fx([['rehab','study']],{a:{defense:3,mentality:2}})]
 ]},
 {t:'第一次真正站上NBA地板，LaMarcus先把球塞给你',scene:'NBA首秀 · 第一节',speaker:'LaMarcus Aldridge / Brandon Roy',cast:['LaMarcus Aldridge','Brandon Roy'],b:()=>`第一回合，<b>LaMarcus Aldridge</b> 没自己打，把球塞进你手里。第二回合，<b>Brandon Roy</b> 借你的掩护杀进禁区。主场第一次真正为“Greg Oden”欢呼。中场回更衣室，你的膝盖却出现那种熟悉的紧绷感。队医看着你：“下半场？”`,stakes:'这会成为未来所有季后赛、背靠背、复出节点反复回收的原则。',c:()=>[
  ['今天到此为止','医疗信任与长期健康上升。',fx([['gameday','stop']],{h:8,s:-5,tr:4})],
  ['限制20分钟，我要回去','折中路线。',fx([['gameday','limit']],{c:3,s:2,min:20})],
  ['我等了一年，不下','竞技自信大涨，风险显著提高。',fx([['gameday','play']],{c:8,s:10,h:-5})]
 ]},
 {t:'Roy、Aldridge和你终于同时健康——波特兰开始谈总冠军',scene:'第二个健康阶段 · 录像室',speaker:'Nate McMillan / Brandon Roy / LaMarcus Aldridge',cast:['Nate McMillan','Brandon Roy','LaMarcus Aldridge'],b:()=>`录像室里第一次出现“西部前四”的字样。<b>Nate McMillan</b> 暂停画面：你护框，Roy持球，Aldridge罚球线跳投——这是管理层当年想象的三人组。可下一页赛程写着四天三赛。McMillan说：“最危险的时候，就是你开始觉得自己已经完全好了。”`,stakes:'真正的王朝线从负荷管理开始，而不是从数据开始。',c:()=>[
  ['背靠背第二场固定轮休','长期健康显著受益。',fx([['load','rest']],{h:6,s:-7,a:{durability:2}})],
  ['只限制末节分钟','兼顾战绩与健康。',fx([['load','smart']],{s:-2,min:30})],
  ['全部打，我们要建立三人组节奏','上限最高，重大伤病章节更危险。',fx([['load','full']],{o:1,c:4,s:9})]
 ]},
 {t:'落地那一声之后，Roy第一个冲到你身边',scene:'赛季中段 · 禁区落地',speaker:'Brandon Roy / Nate McMillan',cast:['Brandon Roy','Nate McMillan'],b:()=>`你倒下的瞬间，<b>Brandon Roy</b> 第一个冲过来，<b>Nate McMillan</b> 在场边没有动。你摸着膝盖，脑子里突然闪回2007年的那张核磁片。更衣室里，医生说需要进一步检查。Roy坐在旁边，什么都没说。`,stakes:'如果专属天赋“健康版奥登”仍有本季护盾，这里可能直接改写现实最残酷的一章。',c:()=>[
  ['按最保守方案处理，不设复出日期','最大化未来。',fx([['major','surgery']],{h:18,s:-16,a:{durability:2},c:-2})],
  ['标准治疗，目标下赛季揭幕战','折中恢复。',fx([['major','standard']],{h:10,s:-7})],
  ['只要能跑就回来，我不想再看队友等我','情绪最强，风险最高。',fx([['major','rush']],{c:8,h:4,s:12})]
 ]},
 {t:()=>career.team==='POR'?'Mike Conley Sr.问：还要不要继续把人生押在波特兰？':'Pat Riley的电话：迈阿密愿意赌你一次',scene:'生涯转折期 · 经纪人办公室',speaker:()=>career.team==='POR'?'Mike Conley Sr.':'Pat Riley / Erik Spoelstra',cast:()=>career.team==='POR'?['Mike Conley Sr.','Nate McMillan']:['Pat Riley','Erik Spoelstra'],b:()=>career.team==='POR'?`经纪人 <b>Mike Conley Sr.</b> 把几份报价摊开。波特兰仍然最懂你的身体，但过去几年也让这里充满伤病记忆。他问：“你是想在Roy和Aldridge身边把没完成的事做完，还是去一个没人把你当伤病史的地方？”`:`<b>Pat Riley</b> 的电话很直接：迈阿密不需要你打35分钟，只需要你在 <b>Erik Spoelstra</b> 的体系里提供真正的禁区尺寸。你听见背景里训练馆的声音——那支球队有LeBron、Wade、Bosh。`,stakes:'大分支：波特兰王朝线 or 迈阿密第二次生命。',c:()=>[
  ['留在波特兰，我要和Roy/Aldridge完成最初计划','进入波特兰王朝线。',fx([['cityRoute','portland']],{tr:8,h:4})],
  ['去迈阿密，只打最适合身体的20分钟','进入迈阿密重生线。',fx([['cityRoute','miami']],{trade:'争冠球队',min:22,h:5,s:-4})],
  ['去能给首发的球队，我还想证明上限','高负荷证明线。',fx([['cityRoute','starter']],{trade:'更多机会',min:30,s:6,c:5})]
 ]},
 {t:()=>F('cityRoute')==='miami'?'Spoelstra只给你18分钟，但Wade说季后赛会需要你':'波特兰终于第一次把你当普通首发中锋使用',scene:'第二段职业生涯 · 更衣室',speaker:()=>F('cityRoute')==='miami'?'Erik Spoelstra / Dwyane Wade':'Nate McMillan / LaMarcus Aldridge',cast:()=>F('cityRoute')==='miami'?['Erik Spoelstra','Dwyane Wade','Chris Bosh']:['Nate McMillan','LaMarcus Aldridge'],b:()=>F('cityRoute')==='miami'?`<b>Erik Spoelstra</b> 把你的轮换写得很死：每节短时间、绝不连续高负荷。你有点不爽。<b>Dwyane Wade</b> 却说：“五月份还有腿，比十一月拿20分重要。”旁边 <b>Chris Bosh</b> 已经在研究你俩的双塔站位。`:`训练结束，没人再问膝盖。<b>LaMarcus Aldridge</b> 只问你明天挡拆怎么防。那一刻你突然发现，“普通首发中锋”原来是你等了很多年的奢侈。`,stakes:'决定后半生是追数据、追冠军，还是追生涯长度。',c:()=>[
  ['严格服从分钟管理','长生涯路线。',fx([['secondLife','protect']],{h:8,s:-6,a:{durability:2}})],
  ['常规赛保守，季后赛解除限制','冠军路线。',fx([['secondLife','playoffs']],{c:5,s:3})],
  ['我还能打更多，我要重新拿回首发分钟','上限路线。',fx([['secondLife','ceiling']],{o:1,min:30,s:7})]
 ]},
 {t:'第一次完整打完一轮季后赛，队医只说“明天九点恢复”',scene:'季后赛更衣室 · 深夜',speaker:'队医 / 主教练',cast:['队医','主教练'],b:()=>`系列赛结束，你没有被担架抬走，也没有因为膝盖提前离开。队医递给你冰袋，没有说“希望没事”，只说：“明天九点恢复。”这句普通到不能再普通的话，让你坐在更衣柜前很久。你终于拥有了普通球员才有的烦恼：下一轮怎么打。`,stakes:'这章不是奖励，而是诱惑——健康之后，你是否又要把身体押回上限。',c:()=>[
  ['继续限负荷，别因为顺利就忘记过去','健康线。',fx([['playoffMind','protect']],{h:7,s:-5})],
  ['只有生死战解除限制','选择性冲顶。',fx([['playoffMind','selective']],{c:4,s:3})],
  ['这就是我等这么多年的比赛，全部拉满','冠军上限最高，风险回升。',fx([['playoffMind','allin']],{o:1,c:7,s:9,h:-3})]
 ]},
 {t:'“如果健康”终于不再是你名字前面的固定前缀',scene:'生涯成熟期 · 赛季总结会',speaker:'媒体 / 队友',cast:['队友','主教练'],b:()=>`多年以后，电视主持人介绍你时第一次没有先说“如果健康”。他们讨论你的护框、篮板、季后赛对位和合同。伤病史仍然存在，但它终于从故事主语变成背景。你看着膝盖上的手术疤，知道这条世界线真正被改写了。`,stakes:'核心故事收束。后续长期剧情会根据“防守传奇 / 冠军 / 长青”继续。',c:()=>[
  ['我要冲DPOY，把防守做到历史级','防守传奇路线。',fx([['legacy','defense']],{a:{defense:3,rebounding:2}})],
  ['我要冠军，常规赛可以让','冠军路线。',fx([['legacy','title']],{a:{durability:3},h:6})],
  ['我要打到所有人忘记我曾经是玻璃人','长青路线。',fx([['legacy','longevity']],{a:{durability:4,mentality:2},h:8})]
 ]}
],
kwame:[
 {t:'Michael Jordan亲手把5号球衣递给你：从今天起，全世界都看着你',scene:'2001 · MCI Center · 状元见面会',speaker:'Michael Jordan / Doug Collins',cast:['Michael Jordan','Doug Collins'],b:()=>`你19岁，从高中直接来到NBA。发布会上，篮球运营负责人 <b>Michael Jordan</b> 亲手把5号球衣递给你。主教练 <b>Doug Collins</b> 在旁边谈你的脚步和潜力。记者的问题却只有一个：乔丹亲自选中的高中状元，什么时候能成为明星？你还没打一场职业比赛，已经像欠全世界一个答案。`,stakes:'第一章决定你是否接受“我是19岁新秀”，还是立刻背起状元和乔丹的双重标准。',c:()=>[
  ['告诉Doug Collins：先从替补学，我接受慢一点','慢养成线。',fx([['start','learn'],['route','learn']],{s:14,tr:5,c:2})],
  ['我就是状元，我要和成年人竞争首发','正面竞争线。',fx([['start','compete'],['route','compete']],{c:8,a:{mentality:1}})],
  ['不谈角色，先把脚步、接球、卡位每天练到位','基本功重建线。',fx([['start','fundamentals'],['route','fundamentals']],{a:{finishing:2,defense:2},tr:3})]
 ]},
 {t:'Jordan复出了——现在选你的人，成了每天训练里骂你的人',scene:'2001训练营 · 队内对抗',speaker:'Michael Jordan / Doug Collins',cast:['Michael Jordan','Doug Collins','Brendan Haywood'],b:()=>`九月，<b>Michael Jordan</b> 宣布复出。突然之间，那个在办公室决定选你的人，穿着训练服站到你对面。一次防守轮转慢了，Jordan当场停球。旁边的 <b>Brendan Haywood</b> 和 <b>Doug Collins</b> 都没说话。你知道所有人都在看你怎么接住这句话。`,stakes:'这会改变你和Jordan的关系：导师、压力源，还是你必须反抗的权威。',c:()=>[
  ['不解释，下一回合直接把位置站对','Jordan路线：用执行回应。',fx([['jordan','earn']],{tr:6,a:{mentality:2,defense:1}})],
  ['训练后主动找Jordan问：到底哪里不够','导师路线，会打开更多具体训练剧情。',fx([['jordan','mentor']],{tr:8,c:2})],
  ['当场说我需要犯错才能学','冲突路线，自信更高，关系更危险。',fx([['jordan','pushback']],{c:8,tr:-4,s:5})]
 ]},
 {t:'Brendan Haywood抢走了你的分钟，但Jared Jeffries说你们可以一起长大',scene:'新秀后半段 · 更衣室',speaker:'Brendan Haywood / Jared Jeffries',cast:['Brendan Haywood','Jared Jeffries','Etan Thomas'],b:()=>`轮换越来越现实：<b>Brendan Haywood</b> 更熟悉NBA中锋该做什么，<b>Etan Thomas</b> 更强硬。你坐在板凳上，开始怀疑“状元”是不是只让一切更难。年轻队友 <b>Jared Jeffries</b> 却说：“我们都20岁，别装得像生涯已经结束。”这句话比任何鸡汤更有用。`,stakes:'决定你是争位置、建基本功，还是寻找一个能先稳定上场的技能。',c:()=>[
  ['先把防守和篮板做到教练没理由换我','防守支柱路线。',fx([['role','anchor']],{a:{defense:3,rebounding:3},tr:6})],
  ['继续保留四号位机动性和中投','机动四号位路线。',fx([['role','four']],{a:{shooting:2,athleticism:2}})],
  ['把掩护、吃饼、卡位做到最简单最稳定','简化进攻路线。',fx([['role','simple']],{a:{finishing:3,durability:1},tr:5})]
 ]},
 {t:'Jordan最后一个赛季结束：最大的影子突然从更衣室消失了',scene:'2003 · 华盛顿休赛期',speaker:'Michael Jordan / Jerry Stackhouse',cast:['Michael Jordan','Jerry Stackhouse','Larry Hughes'],b:()=>`<b>Michael Jordan</b> 打完最后一个赛季。更衣室里属于他的柜子空了。<b>Jerry Stackhouse</b> 和 <b>Larry Hughes</b> 开始承担更多球权。过去每次失误，你都能把压力归结为“Jordan的标准太高”；现在没人替你定义标准了。球队问你：下一步到底要成为什么内线？`,stakes:'真正独立成长章。前面和Jordan的关系会影响你对压力的态度。',c:()=>[
  ['把Jordan最苛刻的训练标准留下','高要求成长线。',fx([['postJordan','standard']],{a:{mentality:2,durability:2},c:3})],
  ['彻底放下比较，按自己的节奏成长','自我重建线。',fx([['postJordan','own']],{s:8,c:5})],
  ['我要把球权拿回来，证明当年不是选错人','上限冲刺线。',fx([['postJordan','prove']],{o:1,c:7,tr:-2})]
 ]},
 {t:'华盛顿终于把你的名字放进交易电话里',scene:'2005 · 经纪人来电',speaker:'经纪人 / 湖人管理层',cast:['Kobe Bryant','Phil Jackson','Caron Butler'],b:()=>`经纪人告诉你，华盛顿正在谈一笔交易：你可能去洛杉矶，<b>Caron Butler</b> 会成为筹码的一部分。电话另一头是有 <b>Kobe Bryant</b> 和 <b>Phil Jackson</b> 的湖人。你第一反应不是害怕，而是轻松——终于可以在一座没有“Jordan亲手选中的状元”历史墙的城市重新开始。`,stakes:'大分支：去湖人接受Kobe/Phil标准，还是争取去一个能稳定首发的地方。',c:()=>[
  ['去湖人。我想看看Kobe的标准和Jordan有什么不同','湖人高压线。',fx([['tradeEra','lakers']],{trade:'争冠球队',c:4})],
  ['让经纪人争取能给30分钟的球队','稳定首发线。',fx([['tradeEra','minutes']],{trade:'更多机会',min:30})],
  ['不挑城市，只要对方明确我的角色','角色优先线。',fx([['tradeEra','role']],{tr:4,a:{mentality:2}})]
 ]},
 {t:()=>F('tradeEra')==='lakers'?'Kobe把一次漏接球砸回你怀里：下一次还会传':'新球队第一次把你写进首发名单',scene:()=>F('tradeEra')==='lakers'?'洛杉矶训练馆 · 队内对抗':'新球队 · 训练营',speaker:()=>F('tradeEra')==='lakers'?'Kobe Bryant / Phil Jackson':'主教练',cast:()=>F('tradeEra')==='lakers'?['Kobe Bryant','Phil Jackson']:['主教练'],b:()=>F('tradeEra')==='lakers'?`队内对抗，你又一次没接稳 <b>Kobe Bryant</b> 的传球。球飞出界，Kobe捡回来直接塞进你怀里：“下一次我还会传。”场边 <b>Phil Jackson</b> 没叫暂停。你知道真正的问题不是手滑，而是你会不会因为害怕失误开始躲球。`:`深度图上，你的名字第一次稳定写在首发中锋旁边。没有Jordan，也没有Kobe，只有一个更普通但更残酷的问题：给了你时间以后，你到底能打成什么。`,stakes:'决定“黄油手”标签会成为心理枷锁，还是技术问题。',c:()=>[
  ['每天让助教高速砸球500次，专练接球','技术修复线。',fx([['hands','train']],{a:{finishing:2,mentality:2},tr:4})],
  ['减少复杂进攻，只做掩护顺下和前场板','简化角色线。',fx([['hands','simple']],{a:{rebounding:2,durability:1},tr:6})],
  ['不躲任何传球，哪怕继续失误','心理突破线。',fx([['hands','face']],{c:7,a:{mentality:2}})]
 ]},
 {t:'湖人谈Pau Gasol时，你第一次知道自己可能又是筹码',scene:'2008交易截止日前后',speaker:'Phil Jackson / Kobe Bryant',cast:['Pau Gasol','Kobe Bryant','Phil Jackson'],b:()=>`管理层在讨论 <b>Pau Gasol</b>。你很快听见自己的名字也在方案里。${F('tradeEra')==='lakers'?'<b>Phil Jackson</b> 没给承诺，<b>Kobe Bryant</b> 也只说“这是生意”。':'即使你不在洛杉矶，Gasol交易的新闻仍让你看到一个现实：联盟永远会用更好的球员替代你。'}你可以把这当羞辱，也可以把它当职业生涯下一次重启。`,stakes:'从“证明状元”转向“决定自己还想在NBA留下什么”。',c:()=>[
  ['接受交易，去新队争稳定角色','生存与稳定。',fx([['gasolEra','accept']],{trade:'更多机会',tr:3})],
  ['告诉管理层：我愿意降角色，只想留在争冠环境','冠军拼图。',fx([['gasolEra','stay']],{a:{defense:2,durability:1},tr:6})],
  ['把交易当最后一次证明上限的机会','个人数据路线。',fx([['gasolEra','prove']],{o:1,c:6})]
 ]},
 {t:'一个19岁的年轻内线问你：被全世界骂水货是什么感觉？',scene:'生涯后段 · 更衣室',speaker:'年轻队友',cast:['年轻队友'],b:()=>`训练结束，一个刚进联盟的年轻内线坐到你旁边。他说自己最近被媒体骂得很惨，然后小声问：“你当年怎么熬过来的？”你突然发现，自己最不愿回忆的那些年，已经变成另一个孩子最需要的经验。`,stakes:'这章决定你后半生是继续为自己竞争，还是成为真正的老将。',c:()=>[
  ['把我当年的训练笔记给他','导师路线。',fx([['veteran','mentor']],{a:{mentality:2},tr:7})],
  ['告诉他：先找一个能让你每天上场的技能','务实路线。',fx([['veteran','practical']],{a:{defense:2,durability:1}})],
  ['我还没准备当导师，我还要抢位置','竞争路线。',fx([['veteran','compete']],{a:{finishing:2},c:4})]
 ]},
 {t:'最后，人们开始讨论你的生涯，而不是Jordan当年为什么选你',scene:'生涯成熟期 · 退役前采访',speaker:'记者 / 老队友',cast:['老队友','记者'],b:()=>`很多年以后，记者终于不再把问题开头写成“Michael Jordan当年选错了吗”。他们问你在华盛顿、洛杉矶和后来那些球队学到了什么。你没有成为别人想象中的状元，但你第一次能完整讲述这段生涯，而不是替选秀夜辩护。`,stakes:'核心故事收束。后续长期剧情按导师、冠军拼图或长青角色发展。',c:()=>[
  ['成为年轻内线的导师','导师结局。',fx([['legacy','mentor']],{a:{mentality:3},tr:5})],
  ['去争一次真正的冠军轮换','争冠老将。',fx([['legacy','winner']],{a:{defense:2,durability:2}})],
  ['把生涯长度打到极致','长青老将。',fx([['legacy','longevity']],{a:{durability:4},h:6})]
 ]}
],
fultz:[
 {t:'Brett Brown第一次看到你的罚球动作时，没有立刻说话',scene:'2017 · 费城训练营',speaker:'Brett Brown / Joel Embiid / Ben Simmons',cast:['Brett Brown','Joel Embiid','Ben Simmons'],b:()=>`队内训练结束，主教练 <b>Brett Brown</b> 把你留下。录像里，你的出手和华盛顿大学时期不一样。<b>Joel Embiid</b> 在旁边看了一会，<b>Ben Simmons</b> 也没开玩笑。Brown问得很谨慎：“是疼，还是你在改动作？”最可怕的是，你自己也说不清。`,stakes:'第一章决定你把问题当成身体、技术，还是“先打再说”。三条路线后面会完全不同。',c:()=>[
  ['先停投篮训练，找真正的医学原因','医学真相线。',fx([['fultzRoute','medical'],['route','medical']],{h:6,s:8,c:2})],
  ['保留比赛，但推倒重做投篮动作','动作重构线。',fx([['fultzRoute','mechanics'],['route','mechanics']],{a:{shooting:2},s:7,c:-2})],
  ['我能打，别把事情放大','带伤证明线。短期上场更多，后续风险最大。',fx([['fultzRoute','play'],['route','play']],{c:6,tr:3,h:-3})]
 ]},
 {t:()=>F('fultzRoute')==='medical'?'Joel Embiid挡住记者：先把他当伤员，不要当笑话':F('fultzRoute')==='mechanics'?'JJ Redick把大学录像投到墙上：你的手臂以前不是这样走的':'Brett Brown准备继续给你上场时间，但全国都在等下一次罚球',scene:'新秀赛季 · 主场赛后',speaker:()=>F('fultzRoute')==='medical'?'Joel Embiid / 医疗团队':F('fultzRoute')==='mechanics'?'JJ Redick / Brett Brown':'Brett Brown / Joel Embiid',cast:()=>F('fultzRoute')==='medical'?['Joel Embiid','医疗团队']:F('fultzRoute')==='mechanics'?['JJ Redick','Brett Brown']:['Brett Brown','Joel Embiid'],b:()=>F('fultzRoute')==='medical'?`你主动停掉部分投篮训练后，舆论反而更大。一次罚球动作被慢放、剪辑、反复转发。<b>Joel Embiid</b> 在更衣室门口替你挡住记者，球队医疗组则开始把问题从“动作”往神经与肩部方向排查。你第一次感觉有人相信这可能不只是心理问题。`:F('fultzRoute')==='mechanics'?`<b>JJ Redick</b> 把你在华盛顿大学的投篮录像和现在的动作并排放在墙上。停顿、抬肘、出手点，全都不一样。<b>Brett Brown</b> 愿意给你时间重构，但警告你：改动作意味着比赛里可能更难看。你必须决定要不要继续把问题当纯技术课题。`:`你坚持继续比赛。<b>Brett Brown</b> 没撤掉你的轮换，但每一次罚球都会引发全场手机举起。<b>Joel Embiid</b> 私下问你：“你是真的不疼，还是不想让所有人觉得你受伤？”继续上场给了你证明机会，也让诊断被进一步拖后。`,stakes:'这里会锁定你的“支持系统”：队友、动作重构，还是医学团队；后续诊断节奏会读取第一章路线。',c:()=>[
  ['跟JJ Redick做最简单的定点动作，不追三分','技术稳定线。',fx([['support','redick']],{a:{shooting:2},s:6,tr:4})],
  ['让球队安排更多专科检查','医学线继续加深。',fx([['support','medical']],{h:5,s:8})],
  ['告诉Brett Brown我想继续正常轮换','比赛证明线。',fx([['support','minutes']],{tr:5,c:5,h:-2})]
 ]},
 {t:'Brett Brown把你放回首发，但Jimmy Butler交易改变了一切',scene:'2018-19赛季 · 费城录像室',speaker:'Brett Brown / Ben Simmons / Jimmy Butler',cast:['Brett Brown','Ben Simmons','Jimmy Butler'],b:()=>`赛季初你终于回到首发，和 <b>Ben Simmons</b>、<b>Joel Embiid</b> 一起打。可 <b>Jimmy Butler</b> 的交易让球队立刻进入争冠模式。<b>Brett Brown</b> 告诉你，球队没有无限时间等一个状元慢慢找投篮。你的问题从“能不能恢复”变成“费城还愿不愿意等”。`,stakes:'决定你是争夺费城时间、主动停赛查明真相，还是接受角色后退。',c:()=>[
  ['主动停下来，把诊断搞清楚再说','医学线进入关键节点。',fx([['phillyDecision','diagnose']],{h:6,s:10,c:-2})],
  ['继续打，哪怕从替补开始','留队竞争线。',fx([['phillyDecision','bench']],{tr:4,c:4})],
  ['让经纪人开始了解其他球队兴趣','提前开启交易分支。',fx([['phillyDecision','market']],{teamTrade:2,c:2})]
 ]},
 {t:'终于有了一个名字：胸廓出口综合征',scene:'2018年12月 · 专科诊断后',speaker:'医疗团队 / 家人',cast:['医疗团队'],b:()=>`几个月的争论之后，问题终于有了具体名字：神经源性胸廓出口综合征。那一刻你甚至不是害怕，而是松了一口气——至少这不再只是“你突然不会投篮”。你把诊断发给家人，然后关掉手机。下一步是漫长康复，也可能是离开费城。`,stakes:'这里决定你是否把“恢复原来投篮”当唯一目标，还是开始接受新的球员身份。',c:()=>[
  ['彻底治疗，直到身体允许完整动作再回来','原装回归路线。',fx([['diagnosis','full-rehab']],{h:10,s:12,a:{durability:1}})],
  ['治疗同时重建一套更短、更简单的投篮','新动作路线。',fx([['diagnosis','new-shot']],{a:{shooting:3},s:8})],
  ['先接受突破组织核心身份，投篮以后再说','角色重塑路线。',fx([['diagnosis','playmaker']],{a:{playmaking:2,finishing:2},tr:3})]
 ]},
 {t:'Jeff Weltman的电话：奥兰多不会催你什么时候上场',scene:'2019交易截止日 · 飞往奥兰多前',speaker:'Jeff Weltman / Steve Clifford',cast:['Jeff Weltman','Steve Clifford'],b:()=>`费城最终把你交易到奥兰多。篮球运营负责人 <b>Jeff Weltman</b> 在电话里没有问“什么时候能复出”，只说球队愿意先把你治好。主教练 <b>Steve Clifford</b> 的第一句话也是：“我们会先弄清楚你能做什么。”这和过去一年完全不同。`,stakes:'大分支：奥兰多重启会给你耐心，但也意味着正式告别费城状元计划。',c:()=>[
  ['彻底接受奥兰多重启，不设复出日期','奥兰多重启线。',fx([['cityRoute','orlando']],{trade:'新环境',h:8,tr:6})],
  ['我想尽快回到球场证明费城看错了','复仇线，短期风险更高。',fx([['cityRoute','orlando-fast']],{trade:'新环境',c:7,h:-2})],
  ['如果有机会，我还想证明自己能当真正首发控卫','核心控卫线。',fx([['cityRoute','orlando-pg']],{trade:'更多机会',a:{playmaking:2},c:4})]
 ]},
 {t:'Judy Seto让你把篮球放下：今天只练肩胛和呼吸',scene:'南加州康复训练 · 奥兰多首秀前',speaker:'Judy Seto / Steve Clifford',cast:['Judy Seto','Steve Clifford'],b:()=>`你在南加州和理疗师 <b>Judy Seto</b> 做康复。最难的一天，她甚至没让你摸篮球，只练肩胛控制、神经滑动和呼吸。你很烦躁。几个月后，<b>Steve Clifford</b> 来看训练，问的不是三分命中率，而是“你现在抬手还会不会先想疼不疼？”`,stakes:'决定你如何定义“恢复”：动作回到从前，还是身体重新信任动作。',c:()=>[
  ['动作不必一模一样，只要身体不再害怕','身体信任线。',fx([['rehabMind','trust-body']],{s:10,c:5,a:{mentality:2}})],
  ['我要把大学时期的出手完整找回来','原装投篮线。',fx([['rehabMind','old-shot']],{a:{shooting:3},s:6})],
  ['先把突破和组织练到能稳定赢球','比赛功能线。',fx([['rehabMind','game']],{a:{playmaking:2,finishing:2},tr:4})]
 ]},
 {t:'Steve Clifford说：别想动作——然后你投进了一个最普通的三分',scene:'2019-20赛季 · 奥兰多主场',speaker:'Steve Clifford / Nikola Vucevic',cast:['Steve Clifford','Nikola Vucevic','Aaron Gordon'],b:()=>`下半场，<b>Nikola Vucevic</b> 高位策应把球回给你。你接球、起跳、出手，整个过程没有停顿。球进。暂停时 <b>Steve Clifford</b> 没夸动作，只说：“很好，下一回合。”旁边 <b>Aaron Gordon</b> 拍了你一下。你突然发现，真正的恢复也许就是不再需要解释投篮。`,stakes:'这章决定你会不会重新增加外线出手，还是继续以突破组织为核心。',c:()=>[
  ['从现在开始，空位三分一律出手','投射彻底解封。',fx([['returnStyle','shoot']],{a:{shooting:3},s:10,c:5})],
  ['继续少投，但不再犹豫','稳定控卫路线。',fx([['returnStyle','balanced']],{s:6,a:{playmaking:2}})],
  ['我不需要变成射手，突破组织已经能赢','非传统核心路线。',fx([['returnStyle','drive']],{a:{finishing:2,playmaking:2},tr:5})]
 ]},
 {t:'膝盖倒下的那一刻，你最先想到的竟然是肩膀',scene:'2021 · 对骑士 · ACL重伤',speaker:'Steve Clifford / 队医',cast:['Steve Clifford'],b:()=>`你在一次突破后倒地。队医检查膝盖时，你脑子里第一反应居然是：“至少不是肩膀。”随后结果出来：ACL撕裂。你刚把一个看似解决不了的问题熬过去，身体又把你拉回康复室。<b>Steve Clifford</b> 来看你，没有讲鸡汤，只问：“这一次，你还知道怎么熬吗？”`,stakes:'这是整条主线的二次打击。前面建立的心理和康复路线会决定你怎么处理它。',c:()=>[
  ['按上一次的方法，一天一天来','成熟康复线。',fx([['acl','patient']],{h:12,a:{mentality:2,durability:1}})],
  ['把这次康复当成身体全面重建','身体升级线。',fx([['acl','rebuild']],{h:9,a:{athleticism:1,durability:3}})],
  ['我要比计划提前回来','高风险竞争线。',fx([['acl','rush']],{c:7,h:4,s:4})]
 ]},
 {t:'年轻队友问：你到底是怎么把“不会投篮”熬成一段旧新闻的？',scene:'生涯成熟期 · 奥兰多更衣室',speaker:'年轻队友',cast:['年轻队友'],b:()=>`一个年轻后卫在训练后问你，当年全网都在分析你的罚球动作时，你每天怎么进球馆。你愣了一下，因为你已经很久没主动想那段日子。你可以把那段经历当伤疤，也可以把它变成一种经验。`,stakes:'决定你后半生是继续追个人上限，还是成为能改变队友的老将。',c:()=>[
  ['把康复笔记和录像全部给他看','导师路线。',fx([['veteran','mentor']],{a:{mentality:3},tr:6})],
  ['告诉他别模仿我，先搞清楚自己的身体','成熟领袖路线。',fx([['veteran','leader']],{tr:7,c:3})],
  ['我还没结束，我还要继续把三分练上去','个人上限路线。',fx([['veteran','ceiling']],{a:{shooting:2},s:5})]
 ]},
 {t:'你最终不需要“变回大学时期的Fultz”才能证明自己',scene:'生涯成熟期 · 赛季总结',speaker:'职业生涯回望',cast:['队友','主教练'],b:()=>`很多年里，你一直把“恢复”理解成回到华盛顿大学时那个动作、那个手感、那个状元模板。现在你终于明白，职业生涯不是把过去复制回来。你可以成为一个新的Markelle Fultz——只要这个版本能健康、敢打、能赢。`,stakes:'核心故事收束。长期剧情会根据射手、组织核心或领袖路线继续。',c:()=>[
  ['把投射练到对手不能放','射手重生结局。',fx([['legacy','shooter']],{a:{shooting:4},s:8})],
  ['成为真正的组织型首发控卫','控场核心结局。',fx([['legacy','pg']],{a:{playmaking:3,mentality:2}})],
  ['成为球队里最懂“重新开始”的老将','领袖结局。',fx([['legacy','leader']],{a:{mentality:3,durability:2},tr:6})]
 ]}
],
simmons:[
 {t:'Brett Brown把你写在控卫位置：2米08的人来掌控整支球队',scene:'2016 · 费城训练营',speaker:'Brett Brown / Joel Embiid',cast:['Brett Brown','Joel Embiid'],b:()=>`主教练 <b>Brett Brown</b> 在战术板上把你的名字写到“PG”。旁边的 <b>Joel Embiid</b> 还在等待自己的正式NBA首秀。Brown说，球队不想把你当传统大前锋——你要从后场拿球、发动转换、决定比赛节奏。唯一没人愿意当场讨论的，是你的投篮。`,stakes:'第一章决定你从一开始就正面处理投射，还是用其他天赋把它隐藏起来。',c:()=>[
  ['每天固定200记空位三分，命中率难看也不删','投射解禁线。',fx([['simmonsRoute','shoot'],['route','shoot']],{a:{shooting:2},s:10})],
  ['先把控卫能力做到极致，投篮以后补','全能发动机线。',fx([['simmonsRoute','big'],['route','big']],{a:{playmaking:2,finishing:1},tr:4})],
  ['防守、篮板、转换先做到全明星级','防守王牌线。',fx([['simmonsRoute','defense'],['route','defense']],{a:{defense:2,rebounding:1},tr:4})]
 ]},
 {t:'脚伤让你整季报销，Embiid却终于开始打NBA了',scene:'2016-17 · 费城康复期',speaker:'Joel Embiid / Brett Brown',cast:['Joel Embiid','Brett Brown'],b:()=>`你在场边看着 <b>Joel Embiid</b> 终于完成NBA首秀。每当他打出疯狂表现，镜头也会扫到西装坐在场边的你。<b>Brett Brown</b> 让你参与录像会，把这一年当成“控卫研究生课程”。你可以焦虑，也可以偷走一整年的比赛理解。`,stakes:'伤停年决定你复出后是靠身体碾压，还是带着更成熟的阅读回归。',c:()=>[
  ['跟Brett Brown参加所有控卫录像会','组织和比赛阅读提升。',fx([['redshirt','study']],{a:{playmaking:3,mentality:2}})],
  ['把全年都用来强化身体，回来就冲击篮筐','终结与运动能力路线。',fx([['redshirt','body']],{a:{finishing:2,athleticism:2}})],
  ['在康复后半段就开始固定投篮课','投射线继续推进。',fx([['redshirt','shoot']],{a:{shooting:2},s:8})]
 ]},
 {t:'新秀赛季太成功了——成功反而让所有人暂时忘了你不会投',scene:'2017-18 · 全明星周末前后',speaker:'Joel Embiid / JJ Redick',cast:['Joel Embiid','JJ Redick','Brett Brown'],b:()=>`你在转换进攻里几乎无解，<b>JJ Redick</b> 的跑动给你拉开空间，<b>Joel Embiid</b> 在内线吸引防守。赢球让所有问题看起来都不急。更衣室里没人会在连胜时逼你改打法。真正危险的是：如果现在不练，对手总有一天会逼你。`,stakes:'决定你是否主动在“还没失败”时解决投射问题。',c:()=>[
  ['现在就增加空位投篮，哪怕影响效率','提前解决弱点。',fx([['successTrap','shoot-now']],{a:{shooting:3},s:10,c:2})],
  ['继续发挥最强项，季后赛再说','短期收益最大，后面针对更严重。',fx([['successTrap','delay']],{a:{finishing:2,playmaking:1},tr:4})],
  ['把罚球先练到对手不敢砍','折中路线。',fx([['successTrap','ft']],{a:{shooting:2,mentality:2},s:5})]
 ]},
 {t:'Brad Stevens让凯尔特人退到禁区：第一次，有人把你的“不投”做成完整战术',scene:'2018季后赛 · 对波士顿系列赛',speaker:'Brett Brown / Joel Embiid',cast:['Brett Brown','Joel Embiid','Brad Stevens'],b:()=>`波士顿主帅 <b>Brad Stevens</b> 的防守越来越大胆：你的对位者直接往禁区退。<b>Joel Embiid</b> 在低位拿球时，空间被挤得越来越小。暂停里 <b>Brett Brown</b> 把战术板转向你：“他们在赌你永远不出手。”这是第一次，投篮问题不再是个人讨论，而是整个球队的空间问题。`,stakes:'你可以正面投、改成无球掩护人，或者继续持球用传球惩罚收缩。',c:()=>[
  ['空位就投，不再等“最舒服的机会”','投射解禁线强化。',fx([['celtics','shoot']],{a:{shooting:3},s:12,c:4})],
  ['改打更多掩护顺下和低位','前场发动机线强化。',fx([['celtics','big']],{a:{finishing:2,rebounding:2}})],
  ['继续控球，用传球找底角射手','组织路线，但对手会更敢收缩。',fx([['celtics','pass']],{a:{playmaking:3},s:-4})]
 ]},
 {t:'Jimmy Butler来了，他在训练里直接问：最后两分钟谁拿球？',scene:'2018-19 · 费城训练馆',speaker:'Jimmy Butler / Joel Embiid / Brett Brown',cast:['Jimmy Butler','Joel Embiid','Brett Brown'],b:()=>`交易后，<b>Jimmy Butler</b> 第一次参加关键球训练。他没有绕弯：“最后两分钟谁拿球？”<b>Joel Embiid</b> 看着战术板，<b>Brett Brown</b> 想平衡所有人。你突然发现，球权不是“控卫”三个字自动拥有的——半场打不开时，球队会把球交给能创造投篮的人。`,stakes:'决定你和Butler的共存方式，也决定后面关键球自信。',c:()=>[
  ['让Butler打关键球，我做挡拆和二次组织','团队共存线。',fx([['butler','share']],{a:{playmaking:2,defense:1},tr:5})],
  ['我也要练关键球持球，不能永远交出去','主动进攻线。',fx([['butler','compete']],{a:{finishing:2,shooting:2},s:8,c:5})],
  ['我去做防守和转换核心，不抢最后一攻','防守王牌线。',fx([['butler','defense']],{a:{defense:3,durability:1},tr:5})]
 ]},
 {t:'Doc Rivers来了，Daryl Morey也来了——所有人都说这是争冠窗口',scene:'2020-21 · 费城季前会议',speaker:'Doc Rivers / Daryl Morey / Joel Embiid',cast:['Doc Rivers','Daryl Morey','Joel Embiid'],b:()=>`新主教练 <b>Doc Rivers</b> 和篮球运营负责人 <b>Daryl Morey</b> 把目标说得很直接：争冠。<b>Joel Embiid</b> 已经进入MVP级别。球队愿意最大化你的防守和组织，但季后赛最后五分钟不会给任何人藏弱点。你必须选择今年到底要解决哪一个问题。`,stakes:'这是进入亚特兰大系列赛前最后一次主动选择。',c:()=>[
  ['罚球和攻框：对手砍我，我也要站上罚球线','抗压进攻线。',fx([['docPlan','attack']],{a:{mentality:2,finishing:2},s:8})],
  ['三分不求多，每场必须至少一次空位出手','投射纪律线。',fx([['docPlan','one-shot']],{a:{shooting:2},s:10})],
  ['把防守做到DPOY级，进攻交给Embiid','防守极致线。',fx([['docPlan','defense']],{a:{defense:3},tr:4})]
 ]},
 {t:'Game 7，篮下只有Trae Young——Matisse Thybulle就在你身边',scene:'2021东部半决赛G7 · 最后阶段',speaker:'Joel Embiid / Doc Rivers / Matisse Thybulle',cast:['Trae Young','Matisse Thybulle','Joel Embiid','Doc Rivers'],b:()=>`你转身进入禁区，篮下附近是身材远小于你的 <b>Trae Young</b>。<b>Matisse Thybulle</b> 从弱侧切进来。整个回合只有一两秒，但它会被慢放很多年。你可以起跳终结，可以传球，也可以主动制造犯规。真正的问题不是哪一个篮球选择“理论上正确”，而是你愿不愿意承担结果。`,stakes:'这是整条西蒙斯主线最大的分歧点。后续费城关系、媒体、交易、甚至专属结局都会读取这里。',c:()=>[
  ['起跳，直接扣','彻底改写现实节点；后续不再围绕“关键时刻逃避”。',fx([['game7','attack'],['historicFork','dunk']],{s:18,c:8,a:{finishing:2}})],
  ['读防守，传给Thybulle','如果球队输球，这个传球会成为长期舆论节点。',fx([['game7','pass'],['historicFork','pass']],{a:{playmaking:2},s:-8})],
  ['强攻造犯规，自己去罚球线','主动承担压力，罚球剧情继续。',fx([['game7','foul'],['historicFork','ft']],{a:{mentality:3},s:10,c:4})]
 ]},
 {t:()=>F('game7')==='attack'?'Embiid第一次主动替你挡住所有问题：那个回合你没躲':'Embiid和Doc Rivers的赛后回答，让整个费城瞬间变了',scene:'2021休赛期 · 训练馆没有开灯',speaker:'Joel Embiid / Doc Rivers / Rich Paul / Daryl Morey',cast:['Joel Embiid','Doc Rivers','Rich Paul','Daryl Morey'],b:()=>F('game7')==='attack'?`赛季仍然结束了，但那个最刺眼的回合没有发生。<b>Joel Embiid</b> 在采访里把责任分到全队，<b>Doc Rivers</b> 也没有把问题集中到你身上。你的经纪团队告诉你：费城仍愿意围绕你和Embiid重新设计进攻。现在，留下不是屈服，而是真正的选择。`:`赛后，关于那个回合的问题席卷所有节目。<b>Joel Embiid</b> 谈到比赛转折，<b>Doc Rivers</b> 的回答也没有给未来一个明确保证。经纪人 <b>Rich Paul</b> 和 <b>Daryl Morey</b> 开始进入漫长谈判。你甚至不想回训练馆拿东西。`,stakes:'大分支：修复费城关系、正式申请交易，或先暂停对抗。',c:()=>[
  ['留下，和Embiid/教练组把半场角色重做','费城修复线。',fx([['philly','repair'],['majorRoute','repair']],{tr:10,a:{mentality:2}})],
  ['让Rich Paul正式提出交易请求','离开费城线。',fx([['philly','leave'],['majorRoute','leave']],{trade:'重新定义自己',tr:-8})],
  ['先不回训练营，优先处理身体和状态','停战线，短期关系继续恶化。',fx([['philly','pause'],['majorRoute','pause']],{h:5,c:3,tr:-3})]
 ]},
 {t:()=>F('majorRoute')==='leave'?'James Harden交易完成：你到了布鲁克林，Kevin Durant和Kyrie Irving都在等你':'费城没有交易你——Joel Embiid把战术板推到你面前',scene:()=>F('majorRoute')==='leave'?'2022 · 布鲁克林更衣室':'下一赛季 · 费城录像室',speaker:()=>F('majorRoute')==='leave'?'Steve Nash / Kevin Durant / Kyrie Irving':'Joel Embiid / Doc Rivers',cast:()=>F('majorRoute')==='leave'?['James Harden','Kevin Durant','Kyrie Irving','Steve Nash']:['Joel Embiid','Doc Rivers'],b:()=>F('majorRoute')==='leave'?`交易终于发生：<b>James Harden</b> 去费城，你来到布鲁克林。更衣室里有 <b>Kevin Durant</b>、<b>Kyrie Irving</b>，主教练 <b>Steve Nash</b> 问你的第一件事不是过去，而是“我们怎么让你重新打球？”新城市能换掉舆论，却换不掉半场篮球问题。`:`你最终留在费城。<b>Joel Embiid</b> 把战术板推过来：“别再谈去年，告诉我今年你要站哪。”<b>Doc Rivers</b> 给了三套方案：更多掩护顺下、更多低位策应、或者继续控球但必须出手。`,stakes:'真正的第二职业阶段：换队或留队都不能逃避篮球本身。',c:()=>[
  ['转型前场发动机：掩护、顺下、短挡拆策应','前场发动机路线。',fx([['reinvent','big']],{a:{rebounding:3,finishing:2,playmaking:1}})],
  ['继续控球，但每场强制外线出手','控卫+投射路线。',fx([['reinvent','guard']],{a:{playmaking:2,shooting:3},s:10})],
  ['防守王牌+转换核心，半场进攻做减法','防守核心路线。',fx([['reinvent','defense']],{a:{defense:3,durability:2},tr:5})]
 ]},
 {t:'背部让你第一次明白：运动能力不是永远免费的',scene:'生涯中段 · 康复训练馆',speaker:'医疗团队 / 主教练',cast:['医疗团队','主教练'],b:()=>`过去你从后场起速，三步就能进禁区。现在有些早晨，弯腰系鞋带都要先活动。身体下滑把一个事实摆到你面前：以前可以用尺寸和爆发力绕开的技术问题，后半生都会回来。你必须把比赛迁移到不依赖巅峰运动能力的地方。`,stakes:'决定30岁以后还能靠什么留在场上。',c:()=>[
  ['低位策应+组织，做大号控场者','组织型前场。',fx([['aging','pass']],{a:{playmaking:3,mentality:2}})],
  ['继续开发定点投篮，必须真正拉开空间','空间化路线。',fx([['aging','shoot']],{a:{shooting:3},s:8})],
  ['彻底转型防守中锋和掩护人','内线防守路线。',fx([['aging','center']],{a:{defense:2,rebounding:3,durability:2}})]
 ]},
 {t:'最后，你的生涯不再只是“如果Ben Simmons会投篮”这道题',scene:'生涯成熟期 · 赛季总结',speaker:'职业生涯回望',cast:['队友','主教练'],b:()=>`年轻时，所有讨论都像一道选择题：如果你会投篮，是不是超级巨星？后来你才知道，健康、关键回合、球队关系、角色接受度和主动承担，都一样会决定职业生涯。你不需要变成别人想象中的模板，但必须亲手选择最后那个版本。`,stakes:'核心故事收束。后续长期剧情会按组织核心、空间型前场或防守中锋路线继续。',c:()=>[
  ['成为组织型前场核心','组织、防守、心态继续加强。',fx([['legacy','point-forward']],{a:{playmaking:3,defense:2,mentality:2}})],
  ['把投射练到真正不可放空','投射与出手欲望继续提高。',fx([['legacy','shooter']],{a:{shooting:4},s:10})],
  ['成为防守中锋式核心','防守、篮板、耐久继续提升。',fx([['legacy','center']],{a:{defense:3,rebounding:3,durability:2}})]
 ]}
]};

for(const k of Object.keys(V28))campaigns[k]=V28[k];

function v28Init(){
 if(!career)return;
 career.storyFlags=career.storyFlags||{};
 career.storyLog=career.storyLog||[];
 career.exclusiveRuntime=career.exclusiveRuntime||{procs:0,seasonProcs:0,lastProc:'尚未触发',bennettStacks:0,odenShieldSeason:0};
}
function v28Event(ev){
 v28Init();
 let o={...ev};
 ['t','scene','speaker','cast','b','c','stakes'].forEach(k=>{if(typeof o[k]==='function')o[k]=o[k]()});
 return o;
}
function v28ApplyFlags(effect){
 if(!effect)return;
 if(effect.flag){career.storyFlags[effect.flag[0]]=effect.flag[1]}
 if(Array.isArray(effect.flags))effect.flags.forEach(([k,v])=>career.storyFlags[k]=v);
}
function v28Route(){
 let p=currentP(),r=F('route')||F('reinvent')||'未定',mr=F('majorRoute'),label=routeLabels[p.id]?.[r]||r;
 if(mr&&['cavs','wolves','repair','leave'].includes(mr))label+=` · ${mr==='cavs'?'克利夫兰':mr==='wolves'?'明尼苏达':mr==='repair'?'留守费城':'离开费城'}`;
 return label;
}
function v28ExclusiveText(){
 let p=currentP(),rt=career?.exclusiveRuntime;
 return rt?`本季触发 ${rt.seasonProcs||0} 次 · 生涯触发 ${rt.procs||0} 次 · ${rt.lastProc||'等待触发'}`:'进入生涯后会实时显示触发记录';
}

const __v28Create=createCareer;
createCareer=function(){
 __v28Create();
 if(!career)return;
 v28Init();
 career.exclusiveRuntime.seasonProcs=0;
 if(career.exclusive&&hasTalent(currentP().exclusive.fx)){
   const firstMsg={
    bennett:'开局生效：自信+8 / 心态+3 / 逆风值+12；低谷开始积累逆命层数',
    oden:'开局生效：耐久+6 / 健康+8 / 身体风险-20；已免疫生涯报销级伤病，伤病概率大幅下降',
    kwame:'开局生效：心态+6 / 成长耐心+15 / 信任+5；23岁前成长加速已开启',
    fultz:'开局生效：投射+6 / 投篮稳定直接65 / 自信+8；完整投篮包已恢复',
    simmons:'开局生效：投射+8 / 出手欲望至少68 / 自信+5；季后赛主动进攻加成已开启'
   }[career.playerId]||'专属天赋已装备';
   career.exclusiveRuntime.procs=Math.max(1,career.exclusiveRuntime.procs||0);
   career.exclusiveRuntime.seasonProcs=Math.max(1,career.exclusiveRuntime.seasonProcs||0);
   career.exclusiveRuntime.lastProc=firstMsg;career.feed.unshift(`专属天赋触发：${firstMsg}`);
   v222Pop&&v222Pop(currentP().exclusive.n,firstMsg);
 }else career.exclusiveRuntime.lastProc='等待解锁';
 save();render();
};

const __v28ApplyImmediate=applyImmediateTalent;
applyImmediateTalent=function(){
 __v28ApplyImmediate();
 if(!career)return;v28Init();
 if(hasTalent('bennett_x')){career.confidence=clamp(career.confidence+8);career.attrs.mentality=clamp(career.attrs.mentality+3,30,99);career.special=clamp(career.special+12)}
 if(hasTalent('oden_x')){career.attrs.durability=clamp(career.attrs.durability+6,30,99);career.health=clamp(career.health+8);career.special=clamp(career.special-20)}
 if(hasTalent('kwame_x')){career.attrs.mentality=clamp(career.attrs.mentality+6,30,99);career.special=clamp(career.special+15);career.trust=clamp(career.trust+5);career.confidence=Math.max(career.confidence,55)}
 if(hasTalent('fultz_x')){career.attrs.shooting=clamp(career.attrs.shooting+6,30,99);career.special=Math.max(career.special,65);career.confidence=clamp(career.confidence+8)}
 if(hasTalent('simmons_x')){career.attrs.shooting=clamp(career.attrs.shooting+8,30,99);career.special=Math.max(career.special,68);career.confidence=clamp(career.confidence+5)}
 syncOvr();
};

/* 钢铁神躯的伤病概率统一由最外层（v221）计算，这里只保留“复出后耐久+2”的挂钩。 */

const __v28AddPoint=addPoint;
addPoint=function(k){
 if(!career)return;let before=career.attrs[k],used=career.devPoints;
 __v28AddPoint(k);
 if(!career||career.devPoints===used)return;
 v28Init();
 let msg='';
 if(hasTalent('kwame_x')&&career.playerId==='kwame'&&career.age<=23){career.attrs[k]=clamp(career.attrs[k]+1,30,99);msg='【十九岁重开】23岁前专精额外+1'}
 if(hasTalent('fultz_x')&&career.playerId==='fultz'&&k==='shooting'){career.attrs.shooting=clamp(career.attrs.shooting+1,30,99);career.special=clamp(career.special+2);msg='【原装回归】投射额外+1，投篮稳定+2'}
 if(hasTalent('simmons_x')&&career.playerId==='simmons'&&k==='shooting'){career.attrs.shooting=clamp(career.attrs.shooting+1,30,99);career.special=clamp(career.special+2);msg='【完全体西帝】投射额外+1，出手欲望+2'}
 if(msg){career.exclusiveRuntime.procs++;career.exclusiveRuntime.seasonProcs++;career.exclusiveRuntime.lastProc=msg;career.feed.unshift(msg);v222Pop&&v222Pop(currentP().exclusive.n+' · 训练加成',msg);syncOvr();save();render()}
};

const __v28AgeCurve=ageCurve;
ageCurve=function(){
 let preAge=career?.age||0;
 __v28AgeCurve();
 if(!career)return;v28Init();
 if(hasTalent('kwame_x')&&career.playerId==='kwame'&&career.age<=24){
   let low=Object.entries(career.attrs).sort((a,b)=>a[1]-b[1]).slice(0,2);
   low.forEach(([k])=>career.attrs[k]=clamp(career.attrs[k]+1,30,99));
   career.confidence=Math.max(career.confidence,55);
   career.exclusiveRuntime.procs++;career.exclusiveRuntime.seasonProcs++;
   career.exclusiveRuntime.lastProc='【十九岁重开】年终自动补强2项最低能力';
   v222Pop&&v222Pop('不世出的少年天才 · 十九岁重开','年终自动补强当前最低的 2 项能力，成长不再被短板拖住');
   career.feed.unshift(career.exclusiveRuntime.lastProc);syncOvr();
 }
};

const __v28End=endSeason;
endSeason=function(result){
 let beforeSeason=career?.seasonNo;
 __v28End(result);
 if(!career||career.retired)return;v28Init();
 if(hasTalent('fultz_x')&&career.playerId==='fultz'&&career.special>=80){
   career.attrs.shooting=clamp(career.attrs.shooting+2,30,99);career.ovrMod+=1;career.special=clamp(career.special+3);
   career.exclusiveRuntime.procs++;career.exclusiveRuntime.seasonProcs++;
   career.exclusiveRuntime.lastProc='【原装回归】稳定≥80：赛季末投射+2、额外+1 OVR成长';
   v222Pop&&v222Pop('投篮之神 · 原装回归','赛季末结算：投射 +2、额外 +1 OVR 成长');
   career.feed.unshift(career.exclusiveRuntime.lastProc);syncOvr();
 }
 save();render();
};

const __v28BeginSeason=beginSeason;
beginSeason=function(){__v28BeginSeason();if(career){v28Init();career.exclusiveRuntime.seasonProcs=0;career.exclusiveRuntime.bennettStacks=0;save();render()}};
const __v28NextSeason=nextSeason;
nextSeason=function(){__v28NextSeason();if(career&&!career.retired){v28Init();career.exclusiveRuntime.seasonProcs=0;career.exclusiveRuntime.bennettStacks=0;save();render()}};

const __v28Sim=simulateGame;
simulateGame=function(){
 let before=career?.games||0,beforeConfidence=career?.confidence;
 __v28Sim();
 if(!career||career.games<=before)return;
 v28Init();
 let g=career.gameLog?.[0];
 if(hasTalent('bennett_x')&&career.playerId==='bennett'&&beforeConfidence!=null&&career.confidence<beforeConfidence){
   let lost=beforeConfidence-career.confidence,refund=Math.ceil(lost/2);career.confidence=clamp(career.confidence+refund);
   career.exclusiveRuntime.procs++;career.exclusiveRuntime.seasonProcs++;career.exclusiveRuntime.lastProc=`【状元逆命】舆论抗压：返还${refund}点自信损失`;career.feed.unshift(career.exclusiveRuntime.lastProc);
   v222Pop&&v222Pop('状元逆命 · 舆论抗压',`负面舆论损失减半，返还 ${refund} 点自信`);
 }
 if(hasTalent('bennett_x')&&career.playerId==='bennett'&&g?.played!==false){
   let expected=statExpect().pts,low=!g.win||((g.line?.pts||0)<expected-3);
   if(low){
     career.exclusiveRuntime.bennettStacks=(career.exclusiveRuntime.bennettStacks||0)+1;
     if(career.exclusiveRuntime.bennettStacks>=6&&(career.exclusiveRuntime.seasonProcs||0)<3){
       career.exclusiveRuntime.bennettStacks=0;career.ovrMod+=1;career.confidence=clamp(career.confidence+3);
       career.exclusiveRuntime.procs++;career.exclusiveRuntime.seasonProcs++;
       career.exclusiveRuntime.lastProc='【状元逆命】6层嘘声燃尽：OVR永久+1，自信+3';
       career.feed.unshift(career.exclusiveRuntime.lastProc);
       v222Pop&&v222Pop('状元逆命 · 嘘声燃尽','攒满 6 层逆命：OVR 永久 +1，自信 +3');syncOvr();
     }else{
       career.exclusiveRuntime.lastProc=`【状元逆命】低谷转化：逆命层数 ${career.exclusiveRuntime.bennettStacks}/6`;
     }
   }
 }
 if(hasTalent('kwame_x')&&career.playerId==='kwame'&&career.age<=23&&career.confidence<55)career.confidence=55;
 if(hasTalent('simmons_x')&&career.playerId==='simmons'&&career.special<68)career.special=68;
 save();
};

storyReady=function(i){
 if(i===0)return false;
 const schedule=[[1,0],[1,12],[1,48],[2,16],[2,58],[3,20],[4,18],[5,20],[6,24],[8,18]];
 let [sy,g]=schedule[i]||[Math.max(2,i),18];
 if(career.seasonNo>sy)return career.games>=8;
 return career.seasonNo===sy&&career.games>=g;
};
maybeStory=function(){
 if(!career||!career.exclusive||career.stage!=='regular')return false;
 v28Init();let arr=campaigns[career.playerId]||[];
 if(career.storyIndex<arr.length&&storyReady(career.storyIndex)){stopSim();ui.storyEvent=arr[career.storyIndex];save();render();return true}
 if(career.storyIndex>=arr.length){ensureWorldline();let target=career.seasonNo%2?28:58;if(career.games>=target&&!career.worldline.longArcSeasons.includes(career.seasonNo)){stopSim();ui.storyEvent=makeLongArcEvent();save();render();return true}}
 return false;
};
storyGoal=function(){
 if(!career?.exclusive)return{title:'专属主线未解锁',goal:'本局不会出现人物剧情。',impact:'纯模拟生涯',pct:0};
 let arr=campaigns[career.playerId]||[],i=career.storyIndex;if(i>=arr.length)return{title:'核心分支已经走完',goal:'后续每季继续出现与你当前路线对应的长期剧情。',impact:`当前路线：${v28Route()}`,pct:100};
 let e=v28Event(arr[i]),schedule=[[1,0],[1,12],[1,48],[2,16],[2,58],[3,20],[4,18],[5,20],[6,24],[8,18]],target=schedule[i]||[career.seasonNo,18];
 let pct=career.seasonNo>target[0]?90:career.seasonNo<target[0]?Math.min(58,16+(career.seasonNo-1)*8):clamp(Math.round(career.games/Math.max(1,target[1])*85),8,95);
 return{title:e.t,goal:e.scene,impact:`${e.stakes} · 当前路线：${v28Route()}`,pct};
};

storyChoice=function(i){
 v28Init();let raw=ui.storyEvent;if(!raw)return;let ev=v28Event(raw),ch=ev.c[i];if(!ch)return;
 let before=impactSnapshot(),isLong=!!raw._longArc;applyFx(ch[2]);v28ApplyFlags(ch[2]);let after=impactSnapshot(),imp=impactDiff(before,after);ensureWorldline();
 if(isLong){if(!career.worldline.longArcSeasons.includes(career.seasonNo))career.worldline.longArcSeasons.push(career.seasonNo)}else career.storyIndex++;
 let rec={seasonNo:career.seasonNo,label:seasonLabel(),title:ev.t,scene:ev.scene,choice:ch[0],detail:ch[1],impact:imp.join(' · ')||ch[1],long:isLong,route:v28Route(),cast:(ev.cast||[]).join(' / ')};
 career.storyLog.push(rec);career.worldline.choices.push(rec);career.feed.unshift(`专属主线「${ev.t}」：${ch[0]}。${imp.join('、')||ch[1]}`);career.lastStoryGame=career.games;career.lastStorySeason=career.seasonNo;ui.storyEvent=null;
 let next=storyGoal();ui.modal={kind:'storyOutcome',data:{title:ev.t,choice:ch[0],effect:ch[1],impact:imp,follow:career.storyIndex>=campaigns[career.playerId].length?`核心分支完成。你最终走向【${v28Route()}】，后续长期剧情会沿这条路线继续。`:`下一章「${next.title}」会读取你刚才的选择。当前路线：【${v28Route()}】`}};save();render();
};

function v28NextTease(){
 let arr=campaigns[career.playerId]||[],i=career.storyIndex;if(i>=arr.length)return '核心分支已结束，接下来是只属于这条世界线的长期故事。';
 const tease={
  bennett:['Mike Brown要你先证明自己是NBA球员','一次全场嘲笑会逼你回答“还投不投”','一场19+10可能成为第一个翻案证据','LeBron回归会让整个球队瞬间失去耐心','你会在“争冠队留队”与“去Wiggins身边重启”之间被迫选择','旧标签会再次登上全国节目','第一次真正有合同选择','重返克利夫兰','直到某一天，没人再提状元'],
  oden:['核磁片比战术板更早决定你的新秀年','Roy会在你最孤独的康复日发来消息','第一次NBA出场就要做健康选择','Roy+Aldridge+你终于可能同时健康','一次落地会再次把所有人拉回现实','Mike Conley Sr.会问你还要不要把人生押在波特兰','另一支争冠队可能给你第二次生命','第一次完整打完季后赛系列赛','直到“如果健康”不再是前缀'],
  kwame:['Michael Jordan将从选你的人变成每天训练里要求你的人','Haywood和Jeffries会让你第一次学会“成长不是排名”','Jordan退役后你必须自己定义标准','华盛顿会把你放进交易电话','洛杉矶可能出现Kobe和Phil Jackson','“黄油手”会从笑话变成真正的心理战','Pau Gasol交易会再次把你变成筹码','一个年轻内线会来问你如何熬过失败','最终你会重新讲述自己的生涯'],
  fultz:['一个罚球会被全国反复慢放','Jimmy Butler交易会让费城失去等待时间','真正的医学诊断终于会出现','Jeff Weltman会给你一个不催复出的城市','Judy Seto会让你重新学习如何相信肩膀','一个最普通的三分可能成为真正的回归','ACL会再次把你拉回康复室','后来会有年轻人来问你怎么熬过那段日子','最终你会决定：恢复不等于回到过去'],
  simmons:['脚伤会让你整季旁观Embiid起飞','过于成功会让投射问题被暂时掩盖','Brad Stevens会把“不投”变成完整战术','Jimmy Butler会直接问“最后两分钟谁拿球”','Doc Rivers和Morey会把争冠窗口摆到面前','亚特兰大Game 7的一秒会成为整个生涯分叉点','那个回合之后，费城关系可能彻底改变','James Harden交易可能把你送去布鲁克林','最后身体会逼你重新定义篮球']
 }[career.playerId]||[];
 return tease[Math.min(i,tease.length-1)]||'下一章会读取你之前的选择。';
}

renderTalents=function(){
 let p=playerBy(ui.selected),perk=p.exclusive.perks||[];
 return `<section class="pre"><div class="pre-top"><button class="circle-btn" onclick="ui.screen='select';render()">←</button><strong>${p.zh} · 命运天赋</strong><span style="width:36px"></span></div>
 <div class="pre-intro"><small>DESTINY TALENTS</small><h2>普通天赋改变数值，专属天赋直接改命</h2><p>免费四选一。专属天赋不是“+几点属性”：它会持续在比赛、成长、伤病或关键回合中触发，并解锁一整棵只属于这名状元的真人关系分支树。</p></div>
 <div class="v28-ad ${ui.exclusive?'unlocked':''}">
   <div class="v28-ad-top"><div><small>★ 奖励视频 · 本局唯一</small><h3>${p.exclusive.n}</h3></div><span>${ui.exclusive?'已解锁':'未解锁'}</span></div>
   <p>${p.exclusive.d}</p>
   <div class="v28-perks">${perk.map(x=>`<div><i>✓</i><b>${x}</b></div>`).join('')}</div>
   <div class="v28-cast"><small>专属剧情人物</small><b>${p.exclusive.cast}</b></div><div class="v28-cast"><small>局内如何感知</small><b>赛季主页会常驻显示：本季触发次数 / 生涯触发次数 / 最近一次具体触发效果；每次触发同时写入生涯反馈。</b></div>
   <button onclick="unlockExclusive()">${ui.exclusive?'✓ 专属命运已装备':`🎬 看广告解锁 · 强BUFF + ${(campaigns[p.id]||[]).length}章真人分支主线`}</button>
 </div>
 <div class="talent-wrap"><div class="talent-grid">${ui.talents.map((t,i)=>`<button class="talent-card ${qClass(t.r)} ${ui.talentPick===i?'selected':''}" onclick="ui.talentPick=${i};render()"><div class="rarity">${t.r}</div><h3>${t.n}</h3><p>${t.d}</p><div class="ghost">0${i+1}</div></button>`).join('')}</div></div>
 <div class="takeall-ad"><div class="reward-icon">×4</div><div><small>奖励视频 · 一次打包</small><strong>四张随机天赋全带走，本局直接叠满开局BUFF</strong></div><button onclick="takeAll()">${ui.allTalents?'✓ 已获得':'🎬 全部拿下'}</button></div>
 <div class="sticky-cta"><button class="btn primary" onclick="enterDraft()">进入选秀之夜 →</button></div></section>`;
};

mainlineNowCard=function(){
 let p=currentP();if(!career.exclusive)return `<section class="story-lock"><div class="lock-icon">★</div><small>PREMIUM STORY LOCKED</small><h2>${p.exclusive.n}</h2><p>你没有解锁专属天赋，因此本局只有纯模拟，不会遇到${p.exclusive.cast}等真人关系剧情，也不会出现分支树。</p><button onclick="unlockStoryMidCareer()">🎬 现在补解锁 · 强BUFF + 完整真人主线</button></section>`;
 let x=storyGoal(),arr=campaigns[career.playerId]||[],rt=career.exclusiveRuntime;
 return `<section class="v28-story-live"><div class="v28-story-live-top"><div><small>PREMIUM MAINLINE · ${Math.min(career.storyIndex+1,arr.length)}/${arr.length}</small><h3>${x.title}</h3></div><span>${x.pct}%</span></div><p>${x.goal}</p><div class="v28-route"><b>当前分支：${v28Route()}</b><span>悬念：${v28NextTease()}</span></div><div class="v28-story-progress"><i style="width:${x.pct}%"></i></div><div class="v28-live-bottom"><div><small>${p.exclusive.n} 正在生效</small><b>${v28ExclusiveText()}</b></div><button onclick="stopSim();ui.tab='story';render()">进入剧情树 →</button></div></section>`;
};

storyView=function(){
 v28Init();let p=currentP(),arr=campaigns[p.id]||[],w=career.worldline,div=w.divergence,end=mainlineEnding();
 if(!career.exclusive)return `${mainlineNowCard()}<section class="v28-story-intro"><small>为什么值得解锁</small><h2>不是几段一次性弹窗，而是一棵会记住你的职业生涯树</h2><p>具体人物、真实历史节点、持续关系、分支回收、后续悬念全部锁在专属主线里。</p></section>`;
 let current=Math.min(career.storyIndex,arr.length-1);
 return `<section class="v28-story-head"><small>PREMIUM CHARACTER CAMPAIGN</small><h2>${p.zh} · ${v28Route()}</h2><p>具体人名 + 历史锚点 + 多年连续分支。前面的选择会改变后面的人物关系、台词、球队去向和结局。真实生涯节点作为锚点，人物对话与平行分支为游戏化演绎。</p><div class="v28-cast"><small>本线重要人物</small><b>${p.exclusive.cast}</b></div></section>
 <section class="v28-branch-status"><div><small>当前路线</small><b>${v28Route()}</b></div><div><small>核心章节</small><b>${Math.min(career.storyIndex,arr.length)}/${arr.length}</b></div><div><small>下一悬念</small><b>${v28NextTease()}</b></div></section>
 <div class="v28-chapters">${arr.map((raw,i)=>{let e=v28Event(raw),done=i<career.storyIndex,on=i===career.storyIndex;let rec=career.storyLog.find(x=>x.title===e.t);return `<div class="v28-ch ${done?'done':''} ${on?'on':''} ${i>career.storyIndex+1?'fog':''}"><span>${done?'✓':String(i+1).padStart(2,'0')}</span><div><small>${done?e.scene:on?'当前章节':'后续分支'}</small><b>${done?e.t:on?e.t:'??? · 尚未揭晓'}</b><p>${done?`你选择：${rec?.choice||'已完成'} · 路线：${rec?.route||v28Route()}`:on?v28NextTease():i===career.storyIndex+1?'完成当前章后才会揭晓':'这条分支仍被锁在未来'}</p></div></div>`}).join('')}</div>
 <section class="v28-history"><h3>你的选择已经造成这些后果</h3>${career.storyLog.slice().reverse().map(x=>`<div><small>${x.label} · ${x.cast||'人物剧情'}</small><b>${x.title}</b><p>你选择：${x.choice}</p><strong>${x.impact}</strong><em>路线：${x.route||'未定'}</em></div>`).join('')||'<p class="tiny">第一章完成后，这里会开始记录你的独家世界线。</p>'}</section>
 ${div?`<div class="divergence-card"><div class="fork">Y</div><div><small>首个历史分歧 · ${div.label}</small><b>${div.title}</b><p>${div.reason}</p></div></div>`:''}
 <div class="story-outcome"><div class="seal">◆</div><div><small>当前世界线评价</small><b>${end[0]}</b><p>${end[1]}</p></div></div>`;
};

const __v28OverlayBase=renderOverlay;
renderOverlay=function(){
 if(ui.storyEvent){
   let e=v28Event(ui.storyEvent),idx=Math.min(career.storyIndex+1,campaigns[career.playerId].length),cast=Array.isArray(e.cast)?e.cast:[];
   return `<div class="overlay"><div class="sheet v28-sheet"><div class="sheet-handle"></div>
   <div class="v28-scene-top"><div><small>${e.scene||'CAREER STORY'}</small><h2>${e.t}</h2></div><span>${idx}/${campaigns[career.playerId].length}</span></div>
   ${asset('【素材位：本章剧情CG】','用途：对应当前人物与场景，例如训练馆、赛后通道、管理层办公室；不要文字')}
   <div class="v28-cast-tags">${cast.map(x=>`<span>${x}</span>`).join('')}</div>
   <div class="v28-speaker">${e.speaker||'职业生涯节点'}</div>
   <p class="v28-body">${e.b}</p>
   <div class="v28-stakes"><b>这一章为什么重要</b><span>${e.stakes}</span><em>当前路线：${v28Route()}</em></div>
   <div class="choice-list">${e.c.map((c,i)=>`<button class="choice v28-choice" onclick="storyChoice(${i})"><b>${c[0]}</b><span>${c[1]}</span><i>选择后会进入不同后续</i></button>`).join('')}</div>
   <div class="sheet-footer"><span>后续章节会读取本章选择，不会重置</span><span>${currentP().exclusive.n}</span></div></div></div>`;
 }
 return __v28OverlayBase();
};

const __v28TalentEffect=v26TalentEffect;
v26TalentEffect=function(id){
 let p=currentP();if(id===p.exclusive.fx)return[p.exclusive.n,`${p.exclusive.d}｜${v28ExclusiveText()}`,'状元专属·神话'];
 return __v28TalentEffect(id);
};
const __v28TalentPanel=talentLivePanel;
talentLivePanel=function(){
 if(!career?.talents?.length)return'';
 return `<section class="v26-live-talents"><header><b>本局天赋正在生效</b><span>触发会直接写入生涯反馈</span></header><div class="v26-live-talent-grid">${career.talents.map(id=>{let [n,d,r]=v26TalentEffect(id);return `<div class="v26-live-talent ${v26TalentClass(id)} ${id===currentP().exclusive.fx?'v28-exclusive-live':''}"><small>${r}</small><b>${n}</b><span>${d}</span>${id===currentP().exclusive.fx?`<em>${v28ExclusiveText()}</em>`:''}</div>`}).join('')}</div></section>`;
};


const __v28PlayoffGame=playoffGame;
playoffGame=function(){
 let poBefore=career?.playoff,roundBefore=poBefore?.round,gameCount=poBefore?.rounds?.[roundBefore]?.games?.length||0;
 __v28PlayoffGame();
 if(!career||!hasTalent('simmons_x')||career.playerId!=='simmons')return;
 let po=career.playoff;if(!po)return;let round=roundBefore??po.round,r=po.rounds?.[round],g=r?.games?.[gameCount];
 if(g?.played!==false&&g?.line){
   v28Init();let bonus=rnd(2,4);g.line.pts=Math.round((g.line.pts||0)+bonus);career.special=Math.max(68,clamp(career.special+1));
   career.exclusiveRuntime.procs++;career.exclusiveRuntime.seasonProcs++;career.exclusiveRuntime.lastProc=`【完全体西帝】季后赛主动进攻：本场额外制造${bonus}分，出手欲望+1`;career.feed.unshift(career.exclusiveRuntime.lastProc);v222Pop&&v222Pop('库里的投射 · 完全体西帝',`季后赛主动进攻：本场额外制造 ${bonus} 分，出手欲望 +1`);save();render();
 }
};
const __v28UnlockMid=unlockStoryMidCareer;
unlockStoryMidCareer=async function(){
 await __v28UnlockMid();
 if(career?.exclusive){v28Init();career.exclusiveRuntime.procs=Math.max(1,career.exclusiveRuntime.procs||0);career.exclusiveRuntime.seasonProcs=Math.max(1,career.exclusiveRuntime.seasonProcs||0);career.exclusiveRuntime.lastProc=`中途觉醒：${currentP().exclusive.n} 已开始改变本局生涯`;career.feed.unshift(career.exclusiveRuntime.lastProc);
   v222Pop&&v222Pop('中途觉醒',`${currentP().exclusive.n} 已开始改变本局生涯`);save();render()}
};

const style28=document.createElement('style');style28.textContent=`
.story-name{color:#d85b48}.v28-ad{margin:12px 14px 8px;padding:16px;border-radius:28px;color:#fff;background:
radial-gradient(circle at 15% 5%,rgba(255,255,255,.28),transparent 26%),
linear-gradient(135deg,#16111f 0%,#482566 40%,#b64b35 72%,#f4b64f 100%);
box-shadow:0 22px 48px rgba(67,31,72,.30);position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.22)}
.v28-ad:before{content:"";position:absolute;inset:-90% -25%;background:linear-gradient(112deg,transparent 43%,rgba(255,255,255,.32) 49%,transparent 55%);transform:rotate(9deg);animation:v25shine 2.4s linear infinite}.v28-ad>*{position:relative;z-index:2}.v28-ad-top{display:flex;justify-content:space-between;gap:10px}.v28-ad-top small{font-size:8.5px;color:#ffe7a8;letter-spacing:.12em;font-weight:1000}.v28-ad-top h3{font-size:24px;margin:5px 0 6px;line-height:1.05}.v28-ad-top>span{height:28px;padding:0 9px;border-radius:999px;background:rgba(255,255,255,.14);display:flex;align-items:center;font-size:8.5px;font-weight:1000}.v28-ad>p{font-size:9.5px;line-height:1.65;color:rgba(255,255,255,.92)}
.v28-perks{display:grid;gap:6px;margin:10px 0}.v28-perks>div{display:grid;grid-template-columns:24px 1fr;align-items:center;gap:7px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:7px 8px}.v28-perks i{font-style:normal;width:22px;height:22px;border-radius:8px;background:#ffd66b;color:#5e3815;display:grid;place-items:center;font-weight:1000}.v28-perks b{font-size:9.5px}.v28-cast{padding:9px;border-radius:14px;background:rgba(0,0,0,.16);margin:9px 0}.v28-cast small{display:block;font-size:7.5px;opacity:.7}.v28-cast b{font-size:8.5px;line-height:1.5}.v28-ad button{width:100%;height:52px;border:0;border-radius:16px;background:linear-gradient(135deg,#fff7c9,#ffd45e);color:#4d2a12;font-weight:1000;box-shadow:0 10px 28px rgba(0,0,0,.20);animation:v25pulse 1.45s ease-in-out infinite}
.v28-story-live{margin-top:10px;padding:13px;border-radius:24px;background:linear-gradient(145deg,#171521,#35274d 54%,#8e4930);color:#fff;box-shadow:0 18px 42px rgba(46,31,63,.22)}.v28-story-live-top{display:flex;justify-content:space-between;gap:10px}.v28-story-live-top small{font-size:7.5px;color:#d8c8ff}.v28-story-live-top h3{font-size:15px;margin:3px 0}.v28-story-live-top>span{font-size:11.5px;font-weight:1000;color:#ffd66b}.v28-story-live>p{font-size:8.5px;color:#eee7f7;margin:4px 0}.v28-route{background:rgba(255,255,255,.09);border-radius:13px;padding:8px;margin:8px 0}.v28-route b{display:block;font-size:9.5px;color:#ffd66b}.v28-route span{display:block;font-size:7.5px;line-height:1.5;margin-top:2px}.v28-story-progress{height:6px;border-radius:99px;background:rgba(255,255,255,.15);overflow:hidden}.v28-story-progress i{display:block;height:100%;background:linear-gradient(90deg,#ffd24d,#ff755e)}.v28-live-bottom{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-top:9px}.v28-live-bottom small{font-size:6.5px;color:#e2d8ee}.v28-live-bottom b{font-size:7.5px;line-height:1.4}.v28-live-bottom button{border:0;border-radius:12px;padding:9px;background:#fff;color:#4c2b63;font-weight:1000}
.v28-story-head,.v28-story-intro{background:linear-gradient(145deg,#fff7ed,#fff);border:1px solid #ead5c2;border-radius:24px;padding:13px}.v28-story-head small,.v28-story-intro small{font-size:7.5px;color:#a66d4f}.v28-story-head h2,.v28-story-intro h2{font-size:21px;margin:4px 0}.v28-story-head p,.v28-story-intro p{font-size:9.5px;line-height:1.6;color:#74645a}.v28-story-head .v28-cast{background:#fff0e8;color:#6f5545}
.v28-branch-status{display:grid;grid-template-columns:.8fr .55fr 1.2fr;gap:6px;margin-top:8px}.v28-branch-status>div{background:#fff;border:1px solid #eadfd5;border-radius:14px;padding:8px}.v28-branch-status small{display:block;font-size:6.5px;color:#a28a78}.v28-branch-status b{font-size:8.5px;line-height:1.35}
.v28-chapters{display:grid;gap:7px;margin-top:9px}.v28-ch{display:grid;grid-template-columns:40px 1fr;gap:8px;padding:10px;background:#fff;border:1px solid #eadfd5;border-radius:17px}.v28-ch>span{width:36px;height:36px;border-radius:12px;background:#eee5dd;display:grid;place-items:center;font-size:10.5px;font-weight:1000}.v28-ch.done>span{background:#dff4e7;color:#268a55}.v28-ch.on{border-color:#c67858;box-shadow:0 0 0 2px #ffede5}.v28-ch.on>span{background:#fff0e8;color:#c45546}.v28-ch.fog{filter:saturate(.4);opacity:.48}.v28-ch small{font-size:6.5px;color:#a88e7b}.v28-ch b{display:block;font-size:10.5px;margin:2px 0}.v28-ch p{font-size:7.5px;line-height:1.45;color:#88766c;margin:0}
.v28-history{margin-top:10px;background:#fff;border:1px solid #eadfd5;border-radius:20px;padding:11px}.v28-history h3{font-size:12.5px;margin:0 0 7px}.v28-history>div{padding:8px 0;border-top:1px dashed #eadfd5}.v28-history small{font-size:6.5px;color:#aa8f7d}.v28-history b{font-size:10.5px;display:block}.v28-history p{font-size:8.5px;margin:2px 0}.v28-history strong{font-size:7.5px;color:#c15d49}.v28-history em{display:block;margin-top:3px;font-size:6.5px;color:#6d5f84}
.v28-sheet .asset-slot{height:145px}.v28-scene-top{display:flex;justify-content:space-between;gap:9px}.v28-scene-top small{font-size:7.5px;color:#a56e51}.v28-scene-top h2{font-size:21px;margin:3px 0}.v28-scene-top>span{height:26px;padding:0 9px;border-radius:999px;background:#201a28;color:#fff;display:flex;align-items:center;font-size:9.5px}.v28-cast-tags{display:flex;flex-wrap:wrap;gap:4px;margin:8px 0}.v28-cast-tags span{font-size:7.5px;background:#eee8ff;color:#5b4382;border-radius:99px;padding:5px 7px;font-weight:900}.v28-speaker{display:inline-block;background:#fff0e6;color:#ad553d;padding:5px 8px;border-radius:99px;font-size:7.5px;font-weight:1000}.v28-body{font-size:10.5px!important;line-height:1.8!important;color:#4f433c!important}.v28-stakes{margin:9px 0;padding:10px;border-radius:15px;background:#201a28;color:#fff}.v28-stakes b{display:block;font-size:9.5px}.v28-stakes span{display:block;font-size:7.5px;line-height:1.5;color:#e6dceb;margin-top:2px}.v28-stakes em{display:block;font-size:7.5px;color:#ffd66b;margin-top:5px}.v28-choice{position:relative;padding-right:48px!important}.v28-choice i{position:absolute;right:9px;top:50%;transform:translateY(-50%);font-style:normal;font-size:6.5px;color:#b35f4e;width:34px}.v28-exclusive-live{grid-column:1/-1!important;background:radial-gradient(circle at 18% 8%,rgba(255,255,255,.28),transparent 26%),linear-gradient(135deg,#171521,#4b2662 45%,#c15b32 78%,#f2b94f)!important;box-shadow:0 15px 30px rgba(70,35,78,.22)!important}.v28-exclusive-live em{display:block;margin-top:7px;padding-top:6px;border-top:1px solid rgba(255,255,255,.2);font-size:7px;font-style:normal;color:#ffe09a}
`;document.head.appendChild(style28);

if(career){v28Init();save();render()}
})();

v26Init();if(career){ui.speed=145;save();render()}
