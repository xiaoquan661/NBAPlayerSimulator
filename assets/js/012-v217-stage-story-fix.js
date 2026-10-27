
(function(){
const CORE_PHASES={
 bennett:['preseason','regular','regular','offseason','preseason','preseason','regular','regular'],
 oden:['preseason','regular','regular','regular','regular','offseason','playoff_round_end','offseason'],
 kwame:['preseason','regular','regular','regular','regular','regular','playoff_round_end','offseason'],
 fultz:['preseason','regular','regular','regular','regular','regular','regular','offseason'],
 simmons:['preseason','regular','playoffs','game7','offseason','preseason','regular','offseason']
};
const SAGA_PHASE={
 'ben-contract':'offseason','ben-minimum':'offseason','ben-playoff':'playoffs',
 'od-contract':'offseason','od-veteran-min':'offseason',
 'kw-contract':'offseason','kw-minimum':'offseason',
 'fz-shotcoach':'offseason','fz-contract':'offseason','fz-guardbattle':'preseason','fz-minimum':'offseason',
 'sim-max':'offseason','sim-minimum':'offseason'
};
const PHASE_NAME={regular:'常规赛',preseason:'新赛季开始前',playoffs:'季后赛',game7:'抢七生死战',playoff_round_end:'一轮季后赛结束后',offseason:'休赛期'};
function corePhase(i){return (CORE_PHASES[career?.playerId]||[])[i]||'regular'}
function storyText(ev){try{let e=typeof v28Event==='function'?v28Event(ev):ev||{};return [e.t,e.scene,e.b,e.stakes].join(' ')}catch(e){return''}}
function inferPhase(ev,id=''){
 if(SAGA_PHASE[id])return SAGA_PHASE[id];
 if(ev?._stage)return ev._stage;
 let x=storyText(ev);
 if(/Game\s*7|GAME\s*7|抢七|生死战/.test(x))return'game7';
 if(/完整.*季后赛.*系列赛|完整打完一轮季后赛|系列赛.*赛后发布会|季后赛更衣室.*深夜/.test(x))return'playoff_round_end';
 if(/季后赛|系列赛|总决赛|西决|东决/.test(x))return'playoffs';
 if(/自由市场|续约谈判|合同谈判|合同名单|经纪人办公室|夏季训练馆|第二年夏天|休赛期|夏天/.test(x))return'offseason';
 if(/训练营|媒体日|选秀后训练馆/.test(x))return'preseason';
 return'regular';
}
function readyCore(i){
 try{
  if(i===0)return true;
  const schedule=[[1,0],[1,12],[1,48],[2,16],[2,58],[3,20],[4,18],[5,20],[6,24],[8,18]];
  const sy=(schedule[i]||[Math.max(2,i),18])[0],ph=corePhase(i);
  if(ph==='offseason')return career.seasonNo>=Math.max(1,sy-1);
  if(ph==='preseason'||ph==='playoffs'||ph==='game7'||ph==='playoff_round_end')return career.seasonNo>=sy;
  return (typeof storyReady==='function'&&storyReady(i));
 }catch(e){return true}
}
function currentRound(){return career?.playoff?.rounds?.[career?.playoff?.round]||null}
function phaseCondition(phase){
 if(!career)return false;
 if(phase==='regular')return career.stage==='regular'&&career.games>0;
 if(phase==='preseason')return career.stage==='regular'&&career.games<=2;
 if(phase==='playoffs')return career.stage==='playoffs';
 if(phase==='game7'){let r=currentRound();return career.stage==='playoffs'&&r&&r.w===3&&r.l===3}
 if(phase==='playoff_round_end')return career.stage==='playoffs'&&!!career.playoff?.review;
 if(phase==='offseason')return career.stage==='offseason';
 return false;
}
function tryCore(phase){
 if(!career?.exclusive||ui.storyEvent||ui.modal)return false;
 let arr=campaigns[career.playerId]||[],i=career.storyIndex||0;
 if(i>=arr.length||corePhase(i)!==phase||!phaseCondition(phase)||!readyCore(i))return false;
 stopSim&&stopSim();ui.storyEvent=arr[i];save();render();return true;
}
function regularFallbackSaga(){
 const p=career.playerId,team=teamBy(career.team).name;
 const common={_seasonSaga:true,_longArc:true,_stage:'regular'};
 if(p==='oden')return Object.assign(common,{t:'背靠背第二晚，医疗组把你的名字圈了起来',scene:`${seasonLabel()} · ${team}赛前医疗会`,speaker:'队医 / 主教练',cast:['队医','主教练'],b:'昨晚你刚打了高强度比赛，今天膝盖没有伤，但恢复指标明显下降。主教练本想照常让你首发，医疗组却建议临时减量。对别人只是一次轮休，对你却永远会牵动“到底还能不能放心打”的问题。',stakes:'这是常规赛负荷选择，只影响今晚和后续健康，不会冒充季后赛故事。',c:[['照常首发，我感觉能打','提高今晚表现上限，但身体风险增加。',v211Fx([['regularLoad','push']],{c:3,s:4,h:-2},{type:'careerNight',label:'背靠背坚持出战'})],['分钟压到24，我接受医疗建议','健康和球队信任提升。',v211Fx([['regularLoad','limit']],{min:24,h:5,tr:3},{type:'franchiseTrust',label:'常规赛主动控负荷'})],['今晚休战，把身体留给后半程','健康显著提升，但会少一次出场。',v211Fx([['regularLoad','rest']],{h:7,c:-1},{type:'record',label:'主动轮休保护身体'})]]});
 if(p==='simmons')return Object.assign(common,{t:'对手连续三个回合退到罚球线，你的队友开始看向你',scene:`${seasonLabel()} · 常规赛第三节`,speaker:'主教练 / 球队核心',cast:['主教练','球队核心'],b:'对手不是临时收缩，而是明确把你的防守人留在禁区。第三个回合结束后，球队核心在暂停时拍了拍战术板：“他们就是等你自己放弃进攻。”这还不是季后赛，却已经是一次提前考试。',stakes:'只处理眼前这场常规赛的空间问题，结果会影响之后的打法和队友信任。',c:[['下一个空位我就投','投射与出手欲望上升。',v211Fx([['regularSpacing','shoot']],{a:{shooting:1},s:5,c:2},{type:'record',label:'常规赛主动回应放投'})],['改成掩护顺下，我用别的方式惩罚他们','球队信任提升。',v211Fx([['regularSpacing','screen']],{tr:5,a:{playmaking:1}},{type:'franchiseTrust',label:'用掩护破解收缩'})],['把球给我，我直接冲禁区找身体对抗','侵略性上升。',v211Fx([['regularSpacing','attack']],{c:4,s:3},{type:'careerNight',label:'主动冲击禁区'})]]});
 if(p==='fultz')return Object.assign(common,{t:'连续五场以后，投篮教练第一次没在赛前提醒你的手型',scene:`${seasonLabel()} · 常规赛赛前热身`,speaker:'投篮教练 / 你',cast:['投篮教练'],b:'过去每次热身，他都会站在旁边盯着肩膀、脚步和出手点。今天他只是把球扔给你，然后走去看别人训练。你投完十几个球才发现：他第一次觉得这套动作不需要被看护了。',stakes:'这是常规赛里的恢复节点，决定你接下来更偏得分、组织还是继续保护投篮稳定。',c:[['今晚多打几个持球投','投射和自信小幅提升。',v211Fx([['regularShot','pullup']],{a:{shooting:1},c:3,s:3},{type:'careerNight',label:'持球投信心之夜'})],['保持现在节奏，不主动追投篮戏份','稳定与球队信任提升。',v211Fx([['regularShot','flow']],{tr:4,s:4},{type:'franchiseTrust',label:'投篮恢复进入稳定期'})],['把精力放在挡拆组织，我不需要每场证明投篮','组织成长。',v211Fx([['regularShot','create']],{a:{playmaking:1},tr:3},{type:'record',label:'用组织带动比赛'})]]});
 if(p==='kwame')return Object.assign(common,{t:'对手中锋前三节已经拿了26分，第四节教练把任务交给你',scene:`${seasonLabel()} · 常规赛第四节前`,speaker:'主教练 / 内线教练',cast:['主教练','内线教练'],b:'你年轻时最怕教练在关键时刻点你的名字，因为那通常意味着又要证明什么。现在主教练只说：“最后一节你防他。”没有状元、没有旧标签，只有一个正在打爆球队的对手。',stakes:'这是常规赛防守任务，会影响你的角色、信任和个人防守评价。',c:[['全场顶防，不让他舒服接球','防守与信任提升。',v211Fx([['regularDefense','front']],{a:{defense:1},tr:5},{type:'franchiseTrust',label:'第四节锁住对手核心'})],['放他投中距离，守死篮下','篮板和防守阅读提升。',v211Fx([['regularDefense','paint']],{a:{rebounding:1,defense:1},tr:3},{type:'record',label:'改变防守策略完成限制'})],['我要同时在进攻端惩罚他','侵略性提高，可能打出生涯之夜。',v211Fx([['regularDefense','twoway']],{c:4},{type:'careerNight',label:'攻防两端回应对手'})]]});
 return Object.assign(common,{t:'客场嘘声又起来了，但这一次队友把下一攻直接交给你',scene:`${seasonLabel()} · 常规赛第二节`,speaker:'球队控卫 / 你',cast:['球队控卫'],b:'一次投丢以后，客场开始拿你的选秀顺位起哄。暂停回来，控卫没有避开你，而是在过半场时直接把球塞到你手里：“下一球还是你。”早年的你可能会希望球别再来，现在整支球队在看你怎么回应。',stakes:'这是常规赛的现场回应，不会提前借用季后赛或休赛期剧情。',c:[['继续要球，投到他们闭嘴','自信提高，有机会形成代表战。',v211Fx([['regularPressure','attack']],{c:5},{type:'careerNight',label:'嘘声中的回应之夜'})],['先做防守和篮板，把比赛重新稳下来','球队信任提升。',v211Fx([['regularPressure','steady']],{tr:5,a:{mentality:1}},{type:'franchiseTrust',label:'用稳定表现回应嘘声'})],['给队友做掩护，先让球队打顺','成熟度与球队关系提升。',v211Fx([['regularPressure','team']],{tr:6},{type:'mentor',label:'不再被外界牵着走'})]]});
}
function makeSagaFor(stage){
 let pool=(v211SagaPool?.()||[]).filter(x=>inferPhase(null,x.id)===stage&&v211TeamOK(V211_TEAM_PIN[x.id],x));
 let fresh=pool.filter(x=>!career.seasonSagaUsed?.includes(x.id));
 if(fresh.length){let idx=(career.seasonNo*5+career.age+career.games)%fresh.length,x=fresh[idx];career.seasonSagaUsed.push(x.id);let e=x.make();e._stage=stage;return e}
 let g;try{g=v211GeneratedSaga()}catch(e){g=null}
 if(g&&inferPhase(g)===stage){g._stage=stage;return g}
 return stage==='regular'?regularFallbackSaga():null;
}
const oldMaybe=maybeStory;
maybeStory=function(){
 if(!career||!career.exclusive||career.stage!=='regular')return false;
 if(career.games<=2&&tryCore('preseason'))return true;
 if(tryCore('regular'))return true;
 v211Init&&v211Init();
 if(typeof window.v220TakeSaga==='function')return false;
 let target=(career.storyIndex<(campaigns[career.playerId]||[]).length)?34:(career.seasonNo%2?24:46);
 if(!v211HasSeasonStory()&&career.games>=target){let e=makeSagaFor('regular');if(e){stopSim();ui.storyEvent=e;save();render();return true}}
 return false;
};
const oldPlayoffGame=playoffGame;
playoffGame=function(){
 if(!career||career.stage!=='playoffs')return oldPlayoffGame();
 let r=currentRound();
 if(r&&r.w===3&&r.l===3&&tryCore('game7'))return;
 if(r&&r.games?.length===0&&tryCore('playoffs'))return;
 return oldPlayoffGame();
};
const oldAdvance=advancePlayoffStage;
advancePlayoffStage=function(){
 if(tryCore('playoff_round_end'))return;
 return oldAdvance();
};
window.v217EnterOffseason=function(){
 if(!career)return;career.stage='offseason';save();
 if(tryCore('offseason'))return;
 render();
};
if(typeof v24SeasonRecapView==='function'){
 const oldRecap=v24SeasonRecapView;
 v24SeasonRecapView=function(){return oldRecap().replace(/onclick="career\.stage='offseason';save\(\);render\(\)"/g,'onclick="v217EnterOffseason()"')};
}
const oldNext=nextSeason;
nextSeason=function(){
 let before=career?.seasonNo;oldNext();
 if(career&&!career.retired&&career.seasonNo!==before&&career.stage==='regular'&&career.games===0){tryCore('preseason')}
};
const oldGoal=storyGoal;
storyGoal=function(){
 let g=oldGoal();
 if(!career?.exclusive)return g;
 let arr=campaigns[career.playerId]||[],i=career.storyIndex||0;if(i>=arr.length)return g;
 let ph=corePhase(i),active=(ph==='regular'&&career.stage==='regular')||(ph==='preseason'&&career.stage==='regular'&&career.games<=2)||(ph==='playoffs'&&career.stage==='playoffs')||(ph==='game7'&&phaseCondition('game7'))||(ph==='playoff_round_end'&&phaseCondition('playoff_round_end'))||(ph==='offseason'&&career.stage==='offseason');
 if(!active){let e=v28Event(arr[i]);return{title:`下一章将在${PHASE_NAME[ph]||'合适的时候'}出现`,goal:`「${e.t}」不会提前发生。先把当前${career.stage==='regular'?'常规赛':career.stage==='playoffs'?'季后赛':'阶段'}打完，故事会在真正对应的时间点接上。`,impact:`等待阶段：${PHASE_NAME[ph]||ph}`,pct:g.pct||0}}
 return g;
};
window.__v217InferPhase=inferPhase;
window.__v217Audit=function(){
 let issues=[];
 Object.entries(CORE_PHASES).forEach(([pid,phs])=>{let arr=campaigns[pid]||[];arr.forEach((e,i)=>{let inferred=inferPhase(e),explicit=phs[i]||'regular';if(explicit==='regular'&&['playoffs','game7','playoff_round_end','offseason'].includes(inferred))issues.push({pid,i,title:v28Event(e).t,explicit,inferred})})});
 (v211SagaPool?.()||[]).forEach(x=>{let ph=inferPhase(null,x.id),actual=inferPhase(x.make(),x.id);if(ph!==actual&&!(ph==='regular'&&actual==='preseason'))issues.push({saga:x.id,ph,actual})});
 return issues;
};
})();
