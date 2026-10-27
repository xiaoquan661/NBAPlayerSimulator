
function v23Init(){
 if(!career)return;
 if(career.usageBoost==null)career.usageBoost=0;
 if(!Array.isArray(career.v23Breakouts))career.v23Breakouts=[];
 if(career.injuryCount==null)career.injuryCount=0;
 if(career.lastInjuryGame==null)career.lastInjuryGame=-99;
 if(career.storyCountSeason==null)career.storyCountSeason=0;
 if(career.lastStoryGame==null)career.lastStoryGame=-99;
 if(career.lastStorySeason==null)career.lastStorySeason=0;
}
function careerPhaseLabel(){
 let y=career.seasonNo,a=career.age;
 if(y<=2)return '新秀适应期';
 if(a<=25)return '上升期';
 if(a<=29)return '巅峰窗口';
 if(a<=33)return '成熟期';
 return '生涯后段';
}
function recentForm(n=10){
 let arr=career.gameLog.filter(g=>g.played!==false&&g.line).slice(0,n);
 if(!arr.length)return {pts:0,reb:0,ast:0,gp:0};
 let sum=k=>arr.reduce((a,g)=>a+(+g.line[k]||0),0)/arr.length;
 return {pts:sum('pts'),reb:sum('reb'),ast:sum('ast'),gp:arr.length};
}
function trendClass(a,b){if(!b||Math.abs(a-b)<.6)return'';return a>b?'up':'down'}
function trendText(a,b){if(!b||Math.abs(a-b)<.6)return'近况持平';return a>b?'近10场 ↑':'近10场 ↓'}
function breakoutProgress(){
 v23Init();let p=Math.round(42+career.usageBoost*5+(career.trust-50)*.55+(career.confidence-50)*.35+(career.ovr-(career.seasonStartOvr||career.ovr))*8);
 return clamp(p,8,100)
}
function statExpect(){
 v23Init();let a=career.attrs,id=career.playerId,r=career.role,m=career.minutes||20;
 let base={'边缘球员':5.5,'轮换球员':9.5,'稳定首发':14.2,'球队核心':18.3,'全明星核心':22.4,'超级巨星':26.3,'联盟门面':29.2}[r]||10;
 let scoring=a.finishing*.42+a.shooting*.38+a.playmaking*.20;
 let skill=(scoring-72)*.18;
 let trust=(career.trust-55)*.035,conf=(career.confidence-55)*.028;
 let archetype={bennett:.97,oden:.86,kwame:.84,fultz:.96,simmons:.89}[id]||1;
 if(id==='fultz')archetype*=.90+career.special/360;
 if(id==='simmons')archetype*=.90+career.special/300;
 let pts=(base+skill+trust+conf+career.usageBoost*.72)*archetype;
 pts*=clamp(m/(minutesByRole(r)||m),.82,1.14);
 let rebFactor={oden:1.25,kwame:1.15,bennett:.95,fultz:.65,simmons:1.0}[id]||.8;
 let astFactor={oden:.45,kwame:.36,bennett:.65,fultz:1.15,simmons:1.30}[id]||.7;
 let blkFactor={oden:1.4,kwame:1.08,bennett:.65,fultz:.22,simmons:.56}[id]||.6;
 let minFactor=clamp(m/30,.55,1.2);
 let reb=Math.max(1,(((a.rebounding-50)*.13)+3.5)*minFactor*rebFactor);
 let ast=Math.max(.5,(((a.playmaking-45)*.12)+1)*minFactor*astFactor);
 let stl=Math.max(.2,(a.defense-48)*.027*minFactor+.45);
 let blk=Math.max(.1,((a.defense-45)*.03+Math.max(0,a.rebounding-62)*.012)*minFactor*blkFactor);
 return{pts:clamp(pts,3,33),reb:clamp(reb,1,14),ast:clamp(ast,.5,12),stl:clamp(stl,.2,3),blk:clamp(blk,.1,4)}
}
function syncOvr(){
 if(!career)return;v23Init();career.ovr=clamp(calcOvr(career.attrs)+career.ovrMod,50,99);career.role=roleByOvr(career.ovr);
 let tbonus=career.trust>=78?2:career.trust>=64?1:career.trust<38?-2:0;
 let ub=career.usageBoost>=6?1:0;
 career.minutes=Math.min(career.minutesLimit||99,clamp(minutesByRole(career.role)+tbonus+ub,10,37))
}
function injuryChance(){
 v23Init();let p=currentP();let cap=p.id==='oden'?3:2;if(career.injuryCount>=cap)return 0;
 if(career.games-career.lastInjuryGame<13)return 0;
 let base=.12+(100-career.attrs.durability)*.009+(100-career.health)*.007+Math.max(0,career.injuryRiskBuff)*.35;
 if(p.id==='oden')base+=.55+career.special*.006;
 if(p.id==='fultz')base+=.08;
 if(hasTalent('iron'))base*=.72;
 if(hasTalent('oden_x')&&p.id==='oden')base*=.55;
 return clamp(base,.08,p.id==='oden'?2.0:1.05)
}
function triggerInjury(){
 v23Init();let p=currentP(),r=Math.random()*100,majorCut=p.id==='oden'?18:6,mediumCut=p.id==='oden'?58:38,type=r<majorCut?'major':r<mediumCut?'medium':'minor';
 let pool=type==='minor'?[['脚踝轻度扭伤',2,4],['背部紧张',2,5],['膝部酸痛',2,5],['轻微肌肉拉伤',2,4]]:type==='medium'?[['腿筋拉伤',6,12],['肩部挫伤',5,10],['脚踝二级扭伤',7,13],['膝部炎症',7,14]]:[['膝部伤势',18,36],['足部应力反应',16,30],['严重腿部伤势',20,42]];
 let x=pick(pool),games=rnd(x[1],x[2]);if(hasTalent('recover'))games=Math.max(1,Math.ceil(games*.82));
 career.injury={name:x[0],gamesLeft:games,severity:type,baseGames:games};career.injuryCount++;career.lastInjuryGame=career.games;
 career.health=clamp(career.health-(type==='major'?14:type==='medium'?7:3));
 career.feed.unshift(`伤病：${x[0]}，预计缺席约${games}场。`);
 if(type==='minor'){save();render();return}
 stopSim();ui.modal={kind:'injury'};save();render()
}
function v23PrimaryGrowth(){
 let map={bennett:['finishing','shooting'],oden:['defense','rebounding'],kwame:['defense','rebounding'],fultz:['playmaking','shooting'],simmons:['playmaking',career.special>=55?'shooting':'defense']}[career.playerId];
 map.forEach(k=>career.attrs[k]=clamp(career.attrs[k]+1,30,99));
 if(career.playerId==='fultz')career.special=clamp(career.special+2);
 if(career.playerId==='simmons')career.special=clamp(career.special+2);
 career.trust=clamp(career.trust+3);career.confidence=clamp(career.confidence+2);career.usageBoost=clamp(career.usageBoost+1.2,0,9);syncOvr()
}
function v23Checkpoint(){
 v23Init();let g=career.games;if(![20,60].includes(g)||career.v23Breakouts.includes(g))return;
 career.v23Breakouts.push(g);let s=career.seasonStats,e=statExpect(),good=s.gp>=Math.max(12,g-8)&&(s.pts>=e.pts-1.8||career.trust>=62||career.confidence>=64);
 if(good){v23PrimaryGrowth();career.feed.unshift(`${g===20?'赛季第一阶段':'冲刺阶段'}成长：角色和比赛影响力开始上升。`)}else{career.usageBoost=clamp(career.usageBoost+.35,0,9);career.feed.unshift(`${g===20?'赛季第一阶段':'冲刺阶段'}结束：球队仍在给你机会，下一阶段需要更稳定的表现。`)}
}
const __v23MaybeStory=maybeStory;
maybeStory=function(){
 v23Init();if(career.stage!=='regular')return false;
 if(career.lastStorySeason!==career.seasonNo){career.storyCountSeason=0;career.lastStorySeason=career.seasonNo;career.lastStoryGame=-99}
 if(career.storyCountSeason>=2)return false;
 if(career.games-career.lastStoryGame<14)return false;
 return __v23MaybeStory()
};
const __v23StoryChoice=storyChoice;
storyChoice=function(i){let before=career?.games;__v23StoryChoice(i);if(career){v23Init();career.lastStoryGame=before??career.games;career.lastStorySeason=career.seasonNo;career.storyCountSeason=(career.storyCountSeason||0)+1;save()}};
const __v23Sim=simulateGame;
simulateGame=function(){
 if(career)v23Init();let before=career?.games||0;__v23Sim();if(!career||career.retired)return;
 if(career.games>before){let g=career.gameLog[0];if(g&&g.played!==false&&g.line){let e=statExpect(),score=(g.line.pts-e.pts)+(g.line.reb-e.reb)*.45+(g.line.ast-e.ast)*.55;if(score>4)career.usageBoost=clamp(career.usageBoost+.22,0,9);else if(score<-5)career.usageBoost=clamp(career.usageBoost-.10,0,9)}v23Checkpoint();save()}
};
const __v23NextSeason=nextSeason;
nextSeason=function(){let old=career?.seasonNo;__v23NextSeason();if(career&&!career.retired&&career.seasonNo!==old){career.usageBoost=Math.max(0,(career.usageBoost||0)*.35);career.v23Breakouts=[];career.injuryCount=0;career.lastInjuryGame=-99;career.storyCountSeason=0;career.lastStoryGame=-99;career.lastStorySeason=career.seasonNo;save();render()}};
function renderHud(){let p=currentP();return `<header class="career-hud"><div><small>${seasonLabel()} · ${seasonPhase()}</small><h2>${p.zh}<span> / ${teamBy(career.team).name}</span></h2><div class="hud-meta"><span>${careerPhaseLabel()}</span><span>YEAR ${career.seasonNo}</span><span>${career.role}</span></div></div><div class="hud-right"><div class="age-badge"><b>${career.age}</b><span>AGE / 岁</span></div><div class="ovr-orb"><span>OVR</span><b>${career.ovr}</b></div></div></header>`}
function seasonHero(){let p=currentP();return `<section class="season-brief"><div class="season-brief-art">${asset(`【素材位：${p.zh}当前赛季主视觉】`,'用途：当前球队时期人物+球馆横幅，不含文字；后续可按球队阶段替换。')}<div class="season-brief-copy"><small>${seasonLabel()} · ${career.age}岁</small><h2>${career.role}</h2></div><div class="season-brief-score"><b>${career.games}/82</b><span>${teamRecord()}</span></div></div><div class="season-brief-bottom"><div><b>${career.health}</b><span>健康</span></div><div><b>${career.confidence}</b><span>自信</span></div><div><b>${career.special}</b><span>${p.specialName}</span></div></div></section>`}
function regularView(){
 v23Init();let s=career.seasonStats,p=currentP(),nb=nextBeatData(),m=seasonMission(),r=recentForm(10),bp=breakoutProgress();
 return `${seasonHero()}<section class="focus-sim"><header><div><small>LIVE REGULAR SEASON</small><b>常规赛连续模拟</b></div><span class="tiny">重大节点自动停 · 其余不停表</span></header><div class="focus-actions"><button class="run ${ui.sim?'running':''}" onclick="toggleSim()">${ui.sim?'Ⅱ 暂停模拟':'▶ 继续这段生涯'}</button><button class="speed" onclick="changeSpeed()">${ui.speed===450?'1×':ui.speed===220?'2×':'4×'}</button></div><div class="beans-head"><b>最近20场</b><span>绿=胜 · 红=负 · 灰点=伤停</span></div>${renderBeans()}<div class="season-trackline"><i style="width:${clamp(career.games/82*100)}%"></i></div><div class="season-trackmeta"><span>G1</span><b>${career.games}/82 · ${teamRecord()}</b><span>G82</span></div></section><div class="focus-stats"><div><b>${fmt(s.pts)}</b><span>场均得分</span><em class="${trendClass(r.pts,s.pts)}">${r.gp?`${trendText(r.pts,s.pts)} ${fmt(r.pts)}`:'等待比赛'}</em></div><div><b>${fmt(s.reb)}</b><span>场均篮板</span><em class="${trendClass(r.reb,s.reb)}">${r.gp?`${trendText(r.reb,s.reb)} ${fmt(r.reb)}`:'等待比赛'}</em></div><div><b>${fmt(s.ast)}</b><span>场均助攻</span><em class="${trendClass(r.ast,s.ast)}">${r.gp?`${trendText(r.ast,s.ast)} ${fmt(r.ast)}`:'等待比赛'}</em></div></div><div class="breakout-card"><div class="breakout-head"><div><small>ROLE GROWTH</small><b>球权与球队地位正在变化</b></div><b>${bp}%</b></div><div class="breakout-track"><i style="width:${bp}%"></i></div><div class="breakout-foot"><span>信任 ${career.trust}</span><span>球权增益 +${fmt(career.usageBoost)}</span><span>OVR ${career.ovr}</span></div></div>${career.injury?`<div class="injury-mini"><b>${career.injury.name}</b> · 预计还缺席${career.injury.gamesLeft}场。伤病现在属于低频事件，轻伤不会再频繁打断模拟。</div>`:''}<div class="flow-strip"><div class="flow-chip"><small>NEXT BIG MOMENT</small><b>${nb[0]}</b><p>${nb[1]}</p></div><div class="flow-chip"><small>SEASON ARC</small><b>${m.t}</b><p>${m.d}</p></div></div><div class="main-note"><i>↗</i><div><small>CAREER FEEDBACK</small><b>${career.feed[0]||'新的赛季正在展开'}</b><p>${career.feed[1]||'连续高质量表现会提高球权、信任，并直接抬升后续比赛数据。'}</p></div></div>${compactRecentGames()}`
}


/* ===== V2.3.1 · 生涯手感重构：低频伤病 / 数据爬升 / 五段赛季节奏 ===== */
function v231Init(){
 if(!career)return;v23Init();
 if(career.lastUsageCheckpoint==null)career.lastUsageCheckpoint=0;
 if(!Array.isArray(career.flowMilestones))career.flowMilestones=[];
 if(career.seasonStartUsage==null)career.seasonStartUsage=career.usageBoost||0;
 if(career.injuryCount==null)career.injuryCount=0;
}
function seasonArc(){
 let g=career?.games||0;
 if(g<16)return {id:'opening',name:'开季磨合',range:'G1—G15',desc:'先把角色和轮换稳定下来',pct:g/15*100};
 if(g<41)return {id:'rise',name:'建立位置',range:'G16—G40',desc:'用连续表现换来更多球权',pct:(g-15)/25*100};
 if(g===41)return {id:'allstar',name:'全明星节点',range:'G41',desc:'联盟开始重新评价你的赛季',pct:100};
 if(g<61)return {id:'stretch',name:'赛季中盘',range:'G42—G60',desc:'角色已经成型，开始冲击更高层级',pct:(g-41)/19*100};
 return {id:'push',name:'季后赛冲刺',range:'G61—G82',desc:'排名、荣誉与健康都进入最后博弈',pct:(g-60)/22*100};
}
function seasonArcStrip(){
 let g=career.games,items=[['开季',1,15],['立足',16,40],['全明星',41,41],['中盘',42,60],['冲刺',61,82]];
 return `<div class="arc-strip">${items.map(([n,a,b],i)=>{let done=g>b,active=g>=a&&g<=b;return `<div class="arc-step ${done?'done':''} ${active?'active':''}"><i>${done?'✓':i+1}</i><span>${n}</span></div>`}).join('')}</div>`
}
function roleBasePts(r){return {'边缘球员':4.5,'轮换球员':7.5,'稳定首发':11.3,'球队核心':15.7,'全明星核心':17.8,'超级巨星':21.5,'联盟门面':25.5}[r]||8.5}
function statExpect(){
 v231Init();let a=career.attrs,id=career.playerId,r=career.role,m=career.minutes||20;
 let scoring=a.finishing*.43+a.shooting*.37+a.playmaking*.20;
 let skill=(scoring-70)*.16;
 let trust=(career.trust-55)*.042,conf=(career.confidence-55)*.032;
 let usage=career.usageBoost*.45;
 let archetype={bennett:.97,oden:.92,kwame:.90,fultz:.98,simmons:.88}[id]||1;
 if(id==='fultz')archetype*=.91+career.special/380;
 if(id==='simmons')archetype*=.91+career.special/330;
 let pts=(roleBasePts(r)+skill+trust+conf+usage)*archetype;
 let ideal=minutesByRole(r)||m;pts*=clamp(m/ideal,.82,1.16);
 let minFactor=clamp(m/30,.52,1.22);
 let rebFactor={oden:1.32,kwame:1.22,bennett:.98,fultz:.60,simmons:.82}[id]||.8;
 let astFactor={oden:.42,kwame:.34,bennett:.62,fultz:.95,simmons:.92}[id]||.7;
 let blkFactor={oden:1.46,kwame:1.12,bennett:.66,fultz:.22,simmons:.58}[id]||.6;
 let reb=Math.max(1,(((a.rebounding-48)*.14)+3.7)*minFactor*rebFactor);
 let ast=Math.max(.5,(((a.playmaking-44)*.13)+1.1)*minFactor*astFactor);
 let stl=Math.max(.2,(a.defense-47)*.028*minFactor+.48);
 let blk=Math.max(.1,((a.defense-44)*.031+Math.max(0,a.rebounding-60)*.013)*minFactor*blkFactor);
 let scoreCap=15+(career.ovr-74)*.62;if(id==='simmons'&&a.shooting<55)scoreCap-=2.2;if(id==='oden'||id==='kwame')scoreCap+=.3;let rebCap={oden:13.4,kwame:12.6,bennett:10.2,fultz:7.0,simmons:10.4}[id]||11;let astCap={oden:4.0,kwame:3.5,bennett:5.0,fultz:10.2,simmons:10.5}[id]||9;return{pts:clamp(Math.min(pts,scoreCap),3,31),reb:clamp(Math.min(reb,rebCap),1,rebCap),ast:clamp(Math.min(ast,astCap),.5,astCap),stl:clamp(stl,.2,3.2),blk:clamp(blk,.1,4.2)}
}
function injuryChance(){
 v231Init();let p=currentP(),cap=p.id==='oden'?2:1;
 if(career.injuryCount>=cap)return 0;
 if(career.games-career.lastInjuryGame<(p.id==='oden'?18:26))return 0;
 let base=.055+(100-career.attrs.durability)*.0045+(100-career.health)*.0035+Math.max(0,career.injuryRiskBuff)*.22;
 if(p.id==='oden')base+=.30+career.special*.0032;
 if(p.id==='fultz')base+=.035;
 if(hasTalent('iron'))base*=.68;
 if(hasTalent('oden_x')&&p.id==='oden')base*=.52;
 return clamp(base,.03,p.id==='oden'?1.05:.42)
}
function triggerInjury(){
 v231Init();let p=currentP(),roll=Math.random()*100;
 let majorCut=p.id==='oden'?11:2.5,mediumCut=p.id==='oden'?47:24;
 let type=roll<majorCut?'major':roll<mediumCut?'medium':'minor';
 let pool=type==='minor'?[['脚踝轻微扭伤',1,2],['背部紧张',1,2],['膝部轻微酸痛',1,3],['肌肉紧张',1,2]]:type==='medium'?[['腿筋拉伤',5,9],['肩部挫伤',4,8],['脚踝二级扭伤',5,10],['膝部炎症',6,11]]:[['膝部严重伤势',16,31],['足部应力反应',13,25],['严重腿部伤势',17,34]];
 let x=pick(pool),games=rnd(x[1],x[2]);if(hasTalent('recover'))games=Math.max(1,Math.ceil(games*.8));
 career.injury={name:x[0],gamesLeft:games,severity:type,baseGames:games};career.injuryCount++;career.lastInjuryGame=career.games;
 career.health=clamp(career.health-(type==='major'?13:type==='medium'?6:2));
 career.feed.unshift(`${type==='minor'?'身体状态':'伤病'}：${x[0]}，预计缺席${games}场。`);
 if(type==='minor'){save();render();return}
 stopSim();ui.modal={kind:'injury'};save();render()
}
function usageCap(){return {'边缘球员':2.0,'轮换球员':3.5,'稳定首发':4.5,'球队核心':5.5,'全明星核心':6.0,'超级巨星':6.5,'联盟门面':7.0}[career.role]||4}
function v231UsageCheckpoint(){
 v231Init();let g=career.games;if(g<10||g%10!==0||career.lastUsageCheckpoint===g)return;
 career.lastUsageCheckpoint=g;let s=career.seasonStats,base=roleBasePts(career.role),delta=s.pts-base;
 let add=0;if(delta>=4)add=.95;else if(delta>=1.5)add=.58;else if(delta>=-.5)add=.25;else if(delta<-3)add=-.18;
 if(career.trust>=65)add+=.15;if(career.confidence>=70)add+=.10;
 career.usageBoost=clamp(career.usageBoost+add,0,usageCap());
 if(add>=.5){career.trust=clamp(career.trust+1);career.feed.unshift(`${g}场节点：稳定表现换来了更多战术份额，球权正在上升。`)}
 else if(add<0)career.feed.unshift(`${g}场节点：近期效率下滑，球队暂时收紧了你的战术份额。`);
 syncOvr()
}
function v231SeasonGrowth(result){
 v231Init();let age=career.age,s=career.seasonStats;if(s.gp<20)return;
 let e=statExpect(),quality=(s.pts-e.pts*.86)+(career.trust-55)*.035+(career.confidence-55)*.025;
 let points=0;if(age<=22)points=quality>2?4:quality>-1?3:2;else if(age<=25)points=quality>2?3:quality>-1?2:1;else if(age<=28&&quality>2)points=1;
 if(!points)return;
 let maps={bennett:['finishing','shooting','defense','durability'],oden:['defense','rebounding','finishing','durability'],kwame:['defense','rebounding','finishing','mentality'],fultz:['playmaking','shooting','finishing','mentality'],simmons:['playmaking','defense','shooting','finishing']}[career.playerId];
 for(let i=0;i<points;i++){let k=maps[i%maps.length];career.attrs[k]=clamp(career.attrs[k]+1,30,99)}
 if(career.playerId==='fultz')career.special=clamp(career.special+Math.min(4,points));
 if(career.playerId==='simmons')career.special=clamp(career.special+Math.min(3,points));
 syncOvr();career.feed.unshift(`赛季成长结算：${age}岁的你把比赛经验转化成了${points}点长期成长。`)
}
const __v231EndSeason=endSeason;
endSeason=function(result){v231SeasonGrowth(result);__v231EndSeason(result)};
const __v231Sim=simulateGame;
simulateGame=function(){
 if(career)v231Init();let before=career?.games||0;__v231Sim();if(!career||career.retired)return;
 if(career.games>before){v231UsageCheckpoint();career.usageBoost=clamp(career.usageBoost,0,usageCap());evaluateWorldline();save()}
};
const __v231MaybeStory=maybeStory;
maybeStory=function(){
 v231Init();if(career.stage!=='regular')return false;
 let g=career.games,windowA=g>=12&&g<=32,windowB=g>=52&&g<=72;
 if(career.storyIndex>=6){ensureWorldline();let target=career.seasonNo%2?28:62;if(g>=target&&!career.worldline.longArcSeasons.includes(career.seasonNo)){stopSim();ui.storyEvent=makeLongArcEvent();save();render();return true}return false}
 if(!(windowA||windowB))return false;
 if(career.lastStorySeason!==career.seasonNo){career.storyCountSeason=0;career.lastStorySeason=career.seasonNo;career.lastStoryGame=-99}
 if(career.storyCountSeason>=2||g-career.lastStoryGame<18)return false;
 return __v231MaybeStory()
};
const __v231NextSeason=nextSeason;
nextSeason=function(){let old=career?.seasonNo;__v231NextSeason();if(career&&!career.retired&&career.seasonNo!==old){career.lastUsageCheckpoint=0;career.seasonStartUsage=career.usageBoost||0;career.flowMilestones=[];save();render()}};
function seasonHero(){let p=currentP(),arc=seasonArc();return `<section class="season-brief"><div class="season-brief-art">${asset(`【素材位：${p.zh}当前赛季主视觉】`,'用途：当前球队时期人物+球馆横幅，不含文字；后续可按球队阶段替换。')}<div class="season-brief-copy"><small>${seasonLabel()} · ${career.age}岁 · ${careerPhaseLabel()}</small><h2>${career.role}</h2><p>${arc.name} · ${arc.desc}</p></div><div class="season-brief-score"><b>${career.games}/82</b><span>${teamRecord()}</span></div></div>${seasonArcStrip()}<div class="season-brief-bottom"><div><b>${career.health}</b><span>健康</span></div><div><b>${career.confidence}</b><span>自信</span></div><div><b>${career.special}</b><span>${p.specialName}</span></div></div></section>`}

function coreStoryFallbackReady(i){
 let g=career.games,y=career.seasonNo;
 let seasonNeed=[0,1,2,2,3,4][i]||1;
 let gameNeed=[0,18,18,55,28,30][i]||18;
 return y>=seasonNeed&&g>=gameNeed
}
/* 成功路线也必须继续写主线：没有遭遇原历史坏节点时，章节会改为“你已经绕开它之后怎么办”。 */
maybeStory=function(){
 v231Init();if(career.stage!=='regular')return false;
 let g=career.games;
 if(career.lastStorySeason!==career.seasonNo){career.storyCountSeason=0;career.lastStorySeason=career.seasonNo;career.lastStoryGame=-99}
 if(career.storyIndex>=6){ensureWorldline();let target=career.seasonNo%2?28:62;if(g>=target&&!career.worldline.longArcSeasons.includes(career.seasonNo)){stopSim();ui.storyEvent=makeLongArcEvent();save();render();return true}return false}
 if(career.storyCountSeason>=2||g-career.lastStoryGame<18)return false;
 let windowA=g>=12&&g<=36,windowB=g>=50&&g<=74;if(!(windowA||windowB))return false;
 let i=career.storyIndex,minSeason=[0,1,2,2,3,4][i]||1;if(career.seasonNo>=minSeason&&(storyReady(i)||coreStoryFallbackReady(i))){stopSim();ui.storyEvent=campaigns[career.playerId][i];save();render();return true}
 return false
};
const __v231AgeCurve2=ageCurve;
ageCurve=function(){
 __v231AgeCurve2();if(!career)return;
 let a=career.age,long=hasTalent('long');
 if(a>=35){career.ovrMod-=long?.35:.7;}
 if(a>=38){career.ovrMod-=long?.55:1.0;for(const k of ['athleticism','durability'])if(Math.random()<(long?.35:.65))career.attrs[k]=clamp(career.attrs[k]-1,30,99)}
 if(a>=41){career.ovrMod-=long?.65:1.15;for(const k of ['finishing','defense'])if(Math.random()<(long?.32:.58))career.attrs[k]=clamp(career.attrs[k]-1,30,99)}
 syncOvr()
};
const __v231EndSeason2=endSeason;
endSeason=function(result){
 __v231EndSeason2(result);if(!career||career.retired||career.stage!=='offseason')return;
 if(career.age>=35)career.devPoints=Math.min(career.devPoints,2);else if(career.age>=31)career.devPoints=Math.min(career.devPoints,3);
 save();render()
};

function regularView(){
 v231Init();let s=career.seasonStats,p=currentP(),nb=nextBeatData(),m=seasonMission(),r=recentForm(10),bp=breakoutProgress(),arc=seasonArc();
 return `${seasonHero()}<section class="focus-sim"><header><div><small>${arc.range} · ${arc.name}</small><b>${arc.desc}</b></div><span class="tiny">剧情 / 全明星 / 重要伤病自动停表</span></header><div class="focus-actions"><button class="run ${ui.sim?'running':''}" onclick="toggleSim()">${ui.sim?'Ⅱ 暂停':'▶ 模拟到下一重大节点'}</button><button class="speed" onclick="changeSpeed()">${ui.speed===450?'1×':ui.speed===220?'2×':'4×'}</button></div><div class="beans-head"><b>最近20场</b><span>绿=胜 · 红=负 · 灰点=伤停</span></div>${renderBeans()}<div class="season-trackline"><i style="width:${clamp(career.games/82*100)}%"></i></div><div class="season-trackmeta"><span>G1</span><b>${career.games}/82 · ${teamRecord()}</b><span>G82</span></div></section><div class="focus-stats"><div><b>${fmt(s.pts)}</b><span>场均得分</span><em class="${trendClass(r.pts,s.pts)}">${r.gp?`${trendText(r.pts,s.pts)} ${fmt(r.pts)}`:'等待比赛'}</em></div><div><b>${fmt(s.reb)}</b><span>场均篮板</span><em class="${trendClass(r.reb,s.reb)}">${r.gp?`${trendText(r.reb,s.reb)} ${fmt(r.reb)}`:'等待比赛'}</em></div><div><b>${fmt(s.ast)}</b><span>场均助攻</span><em class="${trendClass(r.ast,s.ast)}">${r.gp?`${trendText(r.ast,s.ast)} ${fmt(r.ast)}`:'等待比赛'}</em></div></div><div class="breakout-card"><div class="breakout-head"><div><small>ROLE & USAGE</small><b>表现会直接改变下一阶段的数据上限</b></div><b>${bp}%</b></div><div class="breakout-track"><i style="width:${bp}%"></i></div><div class="breakout-foot"><span>信任 ${career.trust}</span><span>球权 +${fmt(career.usageBoost)}</span><span>${career.minutes}分钟</span></div></div>${career.injury?`<div class="injury-mini"><b>${career.injury.name}</b> · 还缺席${career.injury.gamesLeft}场。普通伤病现在每季通常不超过1次；奥登仍保留明显更高的身体风险。</div>`:''}<div class="flow-strip"><div class="flow-chip"><small>NEXT STOP</small><b>${nb[0]}</b><p>${nb[1]}</p></div><div class="flow-chip"><small>SEASON GOAL</small><b>${m.t}</b><p>${m.d}</p></div></div><div class="main-note"><i>↗</i><div><small>CAREER FEEDBACK</small><b>${career.feed[0]||'新的赛季正在展开'}</b><p>${career.feed[1]||'连续稳定表现会增加球权与分钟，场均数据会跟着角色一起爬升。'}</p></div></div>${compactRecentGames()}`
}
v231Init();

v23Init();syncOvr();render();
