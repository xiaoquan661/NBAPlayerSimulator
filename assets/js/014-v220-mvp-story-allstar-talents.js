
(function(){
/* === V2.20: one MVP race, one-click All-Star, premium talent ad order, two-part seasonal story === */
const EX_NAMES={
 bennett:['六边形超巨','把“水货状元”直接改造成没有明显短板的全能核心：开局六项核心能力获得额外成长，逆风时仍能继续涨；同时解锁安东尼·本内特从真实新秀困境开始、一直写到退役的专属生涯故事。'],
 oden:['钢铁神躯','奥登最缺的从来不是天赋，而是能打球的身体：显著压低伤病风险，每季第一次重大伤病会被削弱，并提高健康与耐久成长；同时解锁从波特兰伤病线开始、直到退役的专属故事。'],
 kwame:['不世出的少年天才','把19岁的夸梅按真正的天才内线重新培养：23岁前成长速度大幅提高，最低能力会持续被补齐，自信不会轻易崩盘；同时解锁从乔丹时代开始、直到退役的完整专属故事。'],
 fultz:['投篮之神','直接解决富尔茨最致命的刚需：投射、投篮稳定和自信同步提高，投射训练额外成长，稳定度达到高位后继续抬升上限；同时解锁从费城投篮异变开始、直到退役的专属故事。'],
 simmons:['库里的投射','把西蒙斯唯一会被对手放空的短板直接变成武器：投射大幅提高、出手欲望锁在高位，投篮训练额外成长，季后赛主动进攻得到额外加成；同时解锁从费城真实经历开始、直到退役的完整专属故事。']
};
P.forEach(p=>{let x=EX_NAMES[p.id];if(x){p.exclusive.n=x[0];p.exclusive.d=x[1]}});

/* ---------- Unified MVP race ---------- */
function v220MvpNames(year){
 if(year<=2005)return ['蒂姆·邓肯','科比·布莱恩特','凯文·加内特','沙奎尔·奥尼尔','史蒂夫·纳什','德克·诺维茨基','杰森·基德','阿伦·艾弗森','特雷西·麦克格雷迪','克里斯·韦伯','保罗·皮尔斯','雷·阿伦','杰梅因·奥尼尔','文斯·卡特','加里·佩顿'];
 if(year<=2011)return ['勒布朗·詹姆斯','科比·布莱恩特','德维恩·韦德','克里斯·保罗','德怀特·霍华德','凯文·杜兰特','德克·诺维茨基','蒂姆·邓肯','史蒂夫·纳什','卡梅隆·安东尼','克里斯·波什','保罗·皮尔斯','凯文·加内特','德隆·威廉姆斯','布兰登·罗伊'];
 if(year<=2021)return ['勒布朗·詹姆斯','凯文·杜兰特','斯蒂芬·库里','詹姆斯·哈登','拉塞尔·威斯布鲁克','科怀·伦纳德','安东尼·戴维斯','克里斯·保罗','达米安·利拉德','扬尼斯·阿德托昆博','吉米·巴特勒','保罗·乔治','乔尔·恩比德','尼古拉·约基奇','凯里·欧文'];
 if(year<=2028)return ['尼古拉·约基奇','扬尼斯·阿德托昆博','乔尔·恩比德','卢卡·东契奇','杰森·塔图姆','谢伊·吉尔杰斯-亚历山大','安东尼·爱德华兹','维克托·文班亚马','杰伦·布伦森','德文·布克','多诺万·米切尔','泰瑞斯·哈利伯顿','贾·莫兰特','凯德·坎宁安','切特·霍姆格伦'];
 return ['维克托·文班亚马','卢卡·东契奇','安东尼·爱德华兹','Cameron Knox','Malik Rivers','Jaylen Price','Noah Grant','Jalen Mercer','Darius Cole','Evan Cross','Marcus Reed','Tyler Stone','Andre Knox','Julian Price','Mason Grant'];
}
function v220MvpScore(){
 if(!career)return 0;let s=career.seasonStats||{},games=Math.max(1,career.games||s.gp||1),wp=(career.wins||0)/games,avail=Math.min(1,(s.gp||0)/games),stocks=(s.stl||0)+(s.blk||0);
 return (s.pts||0)*1.5+(s.reb||0)*.5+(s.ast||0)*.8+stocks*1.2+wp*30+Math.max(0,(career.ovr||0)-80)*.5+avail*5;
}
function v220MvpEligible(finalMode=false){
 /* V3.2 放宽（开发者选择"宽松"）：数据进联盟前几即可进入讨论 */
 let s=career?.seasonStats||{},games=Math.max(1,career?.games||1),wp=(career?.wins||0)/games;
 let gpNeed=Math.max(3,Math.floor(games*.5));
 if((s.gp||0)<gpNeed||wp<.35||(career.ovr||0)<80)return false;
 return (s.pts||0)>=15||(s.ast||0)>=6.5||(s.reb||0)>=9||((s.pts||0)>=13&&(s.ast||0)>=5.5);
}
function v220RivalScore(name,index,live=true){
 /* V3.2：基准下压，与放宽一致，使打出场均级的球员能争第一 */
 /* V3.2：基准按"宽松"再下调，使数据进联盟前几的球员能真正争到 MVP */
 const finalBase=[74,72.5,71,69.5,68,66.5,65,63.5,62,60.5,59,57.5,56,54.5,53];
 let seed=(Math.abs(stableHash(`${career.seasonYear}-${name}-mvp-final`))%31-15)/10;
 let score=finalBase[index]+seed;
 if(live&&career.games<82){let swing=(Math.abs(stableHash(`${career.seasonYear}-${name}-${Math.floor(career.games/6)}`))%25-12)/10;score+=swing*Math.max(0,1-career.games/82)}
 return score;
}
function v220MvpRace(finalMode=false){
 let names=v220MvpNames(career.seasonYear||career.draftYear),eligible=v220MvpEligible(finalMode),meScore=v220MvpScore();
 let list=names.map((name,i)=>({name,score:v220RivalScore(name,i,!finalMode)}));
 if(eligible)list.push({name:currentP().zh,score:meScore,me:true});
 list.sort((a,b)=>b.score-a.score);
 let idx=list.findIndex(x=>x.me),rank=idx<0?null:idx+1;
 return{eligible,score:meScore,rank,list,top:list.slice(0,5)};
}
v218MvpScore=v220MvpScore;
v218MvpBoard=function(){
 if(!career)return'';let gp=career.seasonStats?.gp||0;
 if(gp<5)return `<section class="v218-mvp"><header><div><small>常规赛实时更新</small><h3>MVP榜</h3></div><b>样本不足</b></header><p>至少打5场后开始显示。个人数据、球队战绩和出勤会一起影响排名。</p></section>`;
 let r=v220MvpRace(false),tag=!r.eligible?'未进前15':`你 #${r.rank}`,top=r.top;
 return `<section class="v218-mvp"><header><div><small>实时更新 · G${career.games}</small><h3>MVP榜</h3></div><b class="${r.rank&&r.rank<=5?'hot':''}">${tag}</b></header><div class="v218-mvp-list">${top.map((x,i)=>`<div class="${x.me?'me':''}"><span>#${i+1}</span><b>${x.name}</b><em>${x.me?'你':Math.round(x.score)}</em></div>`).join('')}</div>${r.eligible&&r.rank>5&&r.rank<=15?`<div class="v218-me-rank"><span>#${r.rank}</span><b>${currentP().zh}</b><em>你</em></div>`:''}<p>${!r.eligible?'目前还没有进入MVP前15讨论。':r.rank===1?'你现在领跑MVP竞争。':r.rank<=5?'你已经进入MVP最前列。':r.rank<=10?'你已经进入MVP讨论区。':'你已经进入前15，但距离真正的争奖区还有差距。'}</p></section>`;
};

const __v220AwardSeason=awardSeason;
awardSeason=function(){
 let before=career?.honors?.MVP||0,season=career?.seasonNo;
 __v220AwardSeason();
 if(!career||career.seasonNo!==season)return;
 let r=v220MvpRace(true),card=(career.seasonAwards||[]).find(x=>x.key==='MVP'||x.title==='最有价值球员');
 if(card){
   card.won=!!(r.eligible&&r.rank===1);
   card.status=!r.eligible?'未进入前15讨论':card.won?'获奖':`最终排名 第${r.rank}`;
   card.detail=`${fmt(career.seasonStats.pts)}分 · ${fmt(career.seasonStats.reb)}板 · ${fmt(career.seasonStats.ast)}助 · ${career.wins}胜`;
 }
 /* 荣誉计数只在本季首次结算时更新，重复调用不会重复加 MVP */
 if(career.mvpHonorSeason!==career.seasonNo){career.mvpHonorSeason=career.seasonNo;career.honors.MVP=before+(card?.won?1:0)}
 if(career.worldline?.achievements){career.worldline.achievements=career.worldline.achievements.filter(a=>!(a.seasonNo===career.seasonNo&&(a.title==='最有价值球员'||a.title==='MVP')))}
 if(career.achievementState?.keys)career.achievementState.keys=career.achievementState.keys.filter(k=>k!==`award-${career.seasonNo}-最有价值球员`&&k!==`award-${career.seasonNo}-MVP`);
 if(card?.won&&typeof recordAchievement==='function')recordAchievement('最有价值球员',`${seasonLabel()}：${card.detail}`,'award',`award-${career.seasonNo}-MVP`,false);
 if(typeof v29AwardWinners==='function')career.seasonAwardWinners=v29AwardWinners();
 career.mvpFinalRace={rank:r.rank,eligible:r.eligible,score:r.score,top:r.top.map((x,i)=>({rank:i+1,name:x.name}))};
 save();
};

/* ---------- All-Star: one stop, result already played ---------- */
function v220AllStarLine(){
 let e=statExpect(),boost=Math.max(0,(career.ovr-84)*.22);return{pts:Math.max(4,Math.round(e.pts*.66+rnd(3,11)+boost)),reb:Math.max(1,Math.round(e.reb*.68+rnd(0,4))),ast:Math.max(0,Math.round(e.ast*.72+rnd(0,5)))};
}
maybeAllStar=function(){
 if(career.games===41&&!career.allstarChecked){
   career.allstarChecked=true;let s=career.seasonStats,score=career.ovr+(s.pts-15)*.55+(career.wins-career.losses)*.06+(career.role.includes('全明星')?4:0);
   career.allStar=score>=87||career.ovr>=89||s.pts>=24;stopSim();career.stage='allstar';
   if(career.allStar){career.honors['全明星']++;career.allStarLine=v220AllStarLine();career.feed.unshift(`全明星正赛：你得到${career.allStarLine.pts}分 ${career.allStarLine.reb}板 ${career.allStarLine.ast}助。`);if(typeof recordAchievement==='function')recordAchievement(career.honors['全明星']>1?`第${career.honors['全明星']}次入选全明星`:'首次入选全明星',`${seasonLabel()}：${career.allStarLine.pts}分 ${career.allStarLine.reb}板 ${career.allStarLine.ast}助。`,'award',`AS-${career.seasonNo}`,false)}
   else career.feed.unshift('全明星名单公布：你本季没有入选。');
   save();render();return true;
 }
 return false;
};
allStarView=function(){let yes=career.allStar,l=career.allStarLine;return `${seasonHero()}<section class="stage-card" style="margin-top:10px">${asset('全明星周末主视觉','全明星球馆、灯光与比赛氛围','banner')}<div class="stage-copy"><div class="big-icon">★</div><span class="result-label">${yes?'正式入选全明星':'本季未入选'}</span><h2>${yes?'全明星正赛已经结束':'名单公布，没有你的名字'}</h2><p>${yes?'入选与本届正赛数据都已经写进你的生涯档案，不需要再点一次“出战”。':'后半程仍然可以继续冲击最佳阵容、MVP讨论和季后赛。'}</p>${yes&&l?`<div class="allstar-line"><div><b>${l.pts}</b><span>PTS</span></div><div><b>${l.reb}</b><span>REB</span></div><div><b>${l.ast}</b><span>AST</span></div></div>`:''}<button class="btn primary" style="width:100%;margin-top:12px" onclick="resumeAllStar()">继续后半程常规赛</button></div></section>`};

/* ---------- Talent page: both ad hooks at the top ---------- */
renderTalents=function(){
 let p=playerBy(ui.selected),draw=ui.talentDrawCount||1,freeLeft=Math.max(0,3-draw);
 return `<section class="pre"><div class="pre-top"><button class="circle-btn" onclick="ui.screen='select';render()">←</button><strong>${p.zh} · 命运天赋</strong><span style="width:36px"></span></div>
 <div class="pre-intro"><small>本局天赋</small><h2>先决定这条生涯最重要的底牌</h2><p>你有3次免费抽取机会。免费次数用完后，还可以看奖励视频继续刷新。</p></div>
 <div class="v220-ad-stack"><div class="ad-hero v210-exclusive ${ui.exclusive?'unlocked':''}"><div class="ad-kicker">★ 球员专属天赋</div><h3>${p.exclusive.n}</h3><p>${p.exclusive.d}</p><div class="ad-bonus"><span>解决这个球员最致命的短板</span><span>整段生涯持续生效</span><span>解锁直到退役的专属故事</span></div><button onclick="unlockExclusive()">${ui.exclusive?'✓ 已获得专属天赋':'🎬 解锁专属天赋'}</button></div>
 <div class="takeall-ad v210-takeall"><div class="reward-icon">×4</div><div><small>奖励视频</small><strong>当前四张随机天赋全部拿走，不再四选一</strong></div><button onclick="takeAll()">${ui.allTalents?'✓ 已全部获得':'🎬 四张全部拿下'}</button></div></div>
 <div class="v210-drawbar"><div><small>本次抽取</small><b>${draw<=3?`免费 ${draw}/3`:`额外刷新 ×${ui.talentAdRefreshes||0}`}</b></div><button onclick="refreshTalentPool()">${freeLeft>0?`↻ 免费刷新 · 还剩${freeLeft}次`:'🎬 看视频再刷一组'}</button></div>
 <div class="talent-wrap"><div class="talent-grid">${ui.talents.map((t,i)=>`<button class="talent-card ${qClass(t.r)} ${ui.talentPick===i?'selected':''}" onclick="ui.talentPick=${i};render()"><div class="rarity">${t.r}</div><h3>${t.n}</h3><p>${t.d}</p><div class="ghost">0${i+1}</div></button>`).join('')}</div></div>
 <div class="v210-story-note"><b>专属故事</b><span>前期从真实职业生涯经历切入；当你的选择真正改变原本轨迹后，故事会沿着新的球队、人物关系、合同、季后赛和个人纪录继续发展。</span></div>
 <div class="sticky-cta"><button class="btn primary" onclick="enterDraft()">进入选秀之夜</button></div></section>`;
};

/* ---------- Mainline: two regular-season episodes, second one pays off the first ---------- */
function v220SeasonLogs(){return (career?.storyLog||[]).filter(x=>x.seasonNo===career.seasonNo&&x.v220SeasonEpisode)}
function v220NamedPeople(){
 const map={
  bennett: career.team==='CLE'?['Kyrie Irving','Mike Brown']:['Marcus Hale','Jalen Mercer'],
  oden: career.team==='POR'?['LaMarcus Aldridge','Mike Conley Sr.']:['Mike Conley Sr.','Aaron Weiss'],
  kwame: career.team==='WAS'&&career.seasonNo<=3?['Michael Jordan','Doug Collins']:['Terrence Cole','球队主教练'],
  fultz: career.team==='PHI'&&career.seasonNo<=3?['Joel Embiid','Brett Brown']:['Noah Carter','球队主教练'],
  simmons: career.team==='PHI'&&career.seasonNo<=5?['Joel Embiid','Doc Rivers']:['Rich Paul','球队核心']
 };return map[career.playerId]||['主教练','球队核心'];
}
function v220OpeningEpisode(){
 let [a,b]=v220NamedPeople(),team=teamBy(career.team).name,p=career.playerId,base={_longArc:true,_seasonSaga:true,_stage:'regular',_v220Episode:1};
 const E={
  bennett:{t:`${a}把最后一攻的战术板推到你面前：今晚还躲不躲？`,scene:`${seasonLabel()} · ${team}更衣室`,speaker:`${a} / ${b}`,cast:[a,b],b:`过去你一旦连续投丢，整座球馆就会重新谈起“状元”。今晚你前三节手感很差，但球队只落后2分。${a}没有安慰你，只把最后一攻的战术板推过来：“你要是想把这条生涯改掉，就别等别人替你承担。”`,stakes:'这个决定会在本赛季后半程被重新提起：你是主动接管，还是把价值建立在赢球之外。',c:[['最后一攻给我，我要自己投','后半程会继续追问你能不能真正成为球队第一选择。',v211Fx([['v220SeasonChoice','takeover']],{c:5,tr:1},{type:'careerNight',label:'关键球主动请战'})],['我来掩护，让手感最好的人终结','后半程会检验你能不能靠全能性赢得球队信任。',v211Fx([['v220SeasonChoice','team']],{tr:6,a:{mentality:1}},{type:'franchiseTrust',label:'关键回合选择团队'})],['我要先在防守端把球抢回来','后半程会沿攻防核心路线发展。',v211Fx([['v220SeasonChoice','defense']],{a:{defense:1},tr:4},{type:'record',label:'关键回合从防守开始'})]]},
  oden:{t:`${b}把你的膝盖报告放在战术板旁边：今晚只准选一个`,scene:`${seasonLabel()} · ${team}赛前`,speaker:`${a} / ${b}`,cast:[a,b],b:`连续健康出场让所有人开始忘记过去。今晚对手内线正好是你最想证明自己的类型，可医疗组写得很清楚：恢复指标已经接近红线。${a}看着你：“你想证明自己能统治比赛，还是证明自己终于学会保护整个职业生涯？”`,stakes:'后半程会根据你这次对身体的态度，进入完全不同的负荷与球队信任剧情。',c:[['把限制拿掉，我要狠狠干一场','上限更高，但后半程医疗组会重新评估你。',v211Fx([['v220SeasonChoice','push']],{c:5,h:-2,s:5},{type:'careerHighReb',min:17,bonus:3,label:'解除限制后的统治夜'})],['严格按医疗计划打，不多一分钟','健康路线，后半程会检验球队是否愿意继续相信这套方案。',v211Fx([['v220SeasonChoice','protect']],{h:7,s:-5,tr:3},{type:'franchiseTrust',label:'坚持负荷计划'})],['常规赛保护，最后五分钟再放开','折中路线，后半程进入“关键时刻奥登”方向。',v211Fx([['v220SeasonChoice','clutch']],{h:2,c:3,tr:3},{type:'record',label:'关键时刻解除限制'})]]},
  kwame:{t:`${a}在录像室里把一个回合倒放了六遍`,scene:`${seasonLabel()} · ${team}录像会`,speaker:`${a} / ${b}`,cast:[a,b],b:`那个回合你先完成换防，再保护篮板，最后跑到前场做出掩护，却一次球都没碰。${a}突然暂停：“所有人都在看得分，但这才是你真正能让球队离不开你的东西。”问题是，你还愿不愿意继续追逐那个“状元应该成为得分明星”的版本？`,stakes:'后半程会直接回收：你会被扶成攻防核心、顶级蓝领，还是重新索要进攻地位。',c:[['我不要只当蓝领，我也要低位球权','后半程会出现真正的核心地位谈判。',v211Fx([['v220SeasonChoice','offense']],{a:{finishing:1},c:4},{type:'careerNight',label:'主动争取低位球权'})],['把防守和篮板做到联盟顶级','后半程沿最佳防阵/球队不可替代路线发展。',v211Fx([['v220SeasonChoice','anchor']],{a:{defense:1,rebounding:1},tr:5},{type:'franchiseTrust',label:'接受防守支柱身份'})],['我要变成能带年轻人的内线领袖','后半程重点转向更衣室地位和长期合同。',v211Fx([['v220SeasonChoice','leader']],{tr:7,a:{mentality:1}},{type:'mentor',label:'主动成为更衣室领袖'})]]},
  fultz:{t:`${a}突然让所有人停下训练，只留下你一个人在三分线`,scene:`${seasonLabel()} · ${team}训练馆`,speaker:`${a} / ${b}`,cast:[a,b],b:`你已经连续多场正常出手，但今天训练里又有一次动作停顿。以前所有人会立刻围过来分析肩膀，现在${a}却把球重新传给你：“别告诉我动作哪里不对。告诉我下一球你想怎么投。”`,stakes:'这是“继续修动作”还是“终于不再把自己当病人”的分叉，后半程会用比赛结果回收。',c:[['继续逐帧修，我要把动作彻底练稳','后半程会以稳定度和投篮纪录回收。',v211Fx([['v220SeasonChoice','mechanics']],{s:7,a:{shooting:1}},{type:'record',label:'继续精修投篮动作'})],['不再分析，下一场空位我全部出手','后半程进入敢投与关键球路线。',v211Fx([['v220SeasonChoice','freedom']],{c:5,s:4},{type:'careerNight',label:'停止过度思考'})],['把组织放第一，投篮只做正常武器','后半程转向双能卫/球队核心路线。',v211Fx([['v220SeasonChoice','creator']],{a:{playmaking:1},tr:5},{type:'franchiseTrust',label:'以组织重建身份'})]]},
  simmons:{t:`${a}在暂停时把战术笔塞给你：“他们又退到罚球线了，你自己画。”`,scene:`${seasonLabel()} · ${team}常规赛`,speaker:`${a} / ${b}`,cast:[a,b],b:`对手连续四个回合完全放掉你。你可以继续靠传球找队友，也可以把这当成提前到来的季后赛考题。${a}没有替你决定，而是把战术笔塞到手里。`,stakes:'后半程会严格根据这次选择继续：敢投、强攻，或者彻底把自己改造成组织中锋。',c:[['空位三分全部投，他们敢放我就敢出手','后半程直接回收你的投射选择。',v211Fx([['v220SeasonChoice','shoot']],{a:{shooting:1},s:7,c:3},{type:'careerNight',label:'主动惩罚放投'})],['不投三分，我每次都直接冲篮下','后半程转向侵略性与罚球压力。',v211Fx([['v220SeasonChoice','attack']],{a:{finishing:1},s:4,c:4},{type:'careerNight',label:'用突破回应收缩'})],['我去打中锋，让他们的中锋根本没法站篮下','后半程转入位置重构路线。',v211Fx([['v220SeasonChoice','center']],{a:{playmaking:1,rebounding:1},tr:5},{type:'franchiseTrust',label:'主动改造成组织中锋'})]]}
 };
 return Object.assign(base,E[p]);
}
function v220FollowupEpisode(){
 let p=career.playerId,[a,b]=v220NamedPeople(),team=teamBy(career.team).name,logs=v220SeasonLogs(),first=logs.find(x=>x.v220SeasonEpisode===1)||logs[0],choice=first?.choice||'之前的决定';
 let branch=career.v220SeasonBranch||career.storyFlags?.v220SeasonChoice||'team',base={_longArc:true,_seasonSaga:true,_stage:'regular',_v220Episode:2};
 const title={bennett:'那次关键回合没有过去，它变成了你在球队里的身份',oden:'医疗组把半个赛季的数据摊开：你当时的选择现在有结果了',kwame:'教练组终于要决定：你到底是角色球员，还是阵容里的支柱',fultz:'几十场比赛过去，投篮不再是训练问题，而是比赛身份',simmons:'对手已经研究了你半个赛季，现在没有任何借口说“没准备好”'}[p];
 const body={
  bennett:`你在前半季选择了“${choice}”。现在管理层把半季录像剪成十分钟，${a}也坐在会议室里。所有人都想知道：这只是一次情绪化选择，还是你真的已经成为可以长期依赖的球员？`,
  oden:`前半季你选择了“${choice}”。现在已经过去几十场，${b}把健康曲线、分钟数和胜负记录摆在一起。奥登生涯里最奢侈的问题终于出现：身体没有先替你做决定，现在轮到球队决定要不要真正把未来押在你身上。`,
  kwame:`前半季你选择了“${choice}”。这个选择改变了教练组看你的方式。${a}现在要在赛季后半段给你一个正式定位，而不是“状元培养对象”这种空话。`,
  fultz:`前半季你选择了“${choice}”。现在录像里已经有足够多正常比赛，${a}把一张投篮分布图放到你面前：这一次不讨论动作，只讨论你要成为哪种后卫。`,
  simmons:`前半季你选择了“${choice}”。对手已经拿到几十场样本，${a}直接告诉你：接下来的强队都会照着这一点防。你不能再把答案留到季后赛。`
 }[p];
 let choices;
 if(p==='bennett')choices=branch==='takeover'?[['正式要求关键球战术，我要把第一选择坐实','球队会真正决定是否扶正你。',v211Fx([['v220Payoff','alpha']],{tr:4,c:4},{type:'franchise',label:'被球队扶正为关键球核心'})],['我不需要每晚30分，但我要成为最全面的首发','六边形路线继续成长。',v211Fx([['v220Payoff','allround']],{a:{defense:1,playmaking:1,rebounding:1},tr:5},{type:'franchiseTrust',label:'全能核心身份成形'})],['如果球队还不信我，让经纪人问交易市场','可能直接走向决裂与交易。',v211Fx([['v220Payoff','trade']],{tr:-5,teamTrade:3},{type:'feud',label:'因核心地位与球队摊牌'})]]:[['把自己变成每晚最可靠的赢球拼图','长期信任明显提高。',v211Fx([['v220Payoff','trust']],{tr:7},{type:'franchiseTrust',label:'成为球队最可靠的拼图'})],['现在再去争关键球，我已经证明不只会刷分','后半程开始争第一选择。',v211Fx([['v220Payoff','lateAlpha']],{c:5,tr:3},{type:'careerNight',label:'成熟后再争关键球'})],['把更多精力放到防守和组织','继续六边形成长。',v211Fx([['v220Payoff','twoWay']],{a:{defense:1,playmaking:1},tr:5},{type:'record',label:'攻防组织全面升级'})]];
 else if(p==='oden')choices=branch==='push'?[['接受医疗组重新限时，我已经证明过上限','健康回升，球队更敢长期押注。',v211Fx([['v220Payoff','protect']],{h:8,s:-6,tr:5},{type:'franchiseTrust',label:'证明上限后重新保护身体'})],['继续高负荷，我要把这个赛季打成巨星年','直接冲个人荣誉，但风险继续增加。',v211Fx([['v220Payoff','star']],{c:5,s:5},{type:'careerHighReb',min:19,bonus:3,label:'巨星负荷下的篮板之夜'})],['常规赛开始降负荷，季后赛再全部释放','争冠路线。',v211Fx([['v220Payoff','playoffs']],{h:4,tr:4},{type:'record',label:'为季后赛保存身体'})]]:[['保持整季负荷方案，不被排名诱惑','健康路线继续积累。',v211Fx([['v220Payoff','long']],{h:7,a:{durability:1}},{type:'record',label:'完成健康赛季计划'})],['只在强队和关键战解除限制','关键战核心路线。',v211Fx([['v220Payoff','selective']],{c:4,tr:4},{type:'careerNight',label:'关键战解除限制'})],['让球队正式把我列为建队核心','健康和球队地位同时兑现。',v211Fx([['v220Payoff','franchise']],{tr:6},{type:'franchise',label:'健康奥登被正式扶正'})]];
 else if(p==='kwame')choices=branch==='offense'?[['给我固定低位回合，我要证明我也能得分','进攻地位提高。',v211Fx([['v220Payoff','scorer']],{a:{finishing:1},c:4},{type:'careerNight',label:'低位进攻代表战'})],['如果影响赢球，我愿意把得分放在第二位','球队信任大幅提高。',v211Fx([['v220Payoff','team']],{tr:8},{type:'franchiseTrust',label:'主动接受赢球角色'})],['我需要一支真正给我进攻空间的球队','可能进入交易路线。',v211Fx([['v220Payoff','trade']],{teamTrade:3,tr:-4},{type:'feud',label:'因进攻角色与球队分歧'})]]:[['把防守做到最佳防阵级别','防守路线彻底坐实。',v211Fx([['v220Payoff','defense']],{a:{defense:1,rebounding:1},tr:6},{type:'record',label:'防守核心身份确立'})],['要求一份长期合同，稳定比数据更重要','进入合同与球队承诺线。',v211Fx([['v220Payoff','contract']],{tr:5},{type:'contract',tier:'big'})],['继续带年轻人，我要成为更衣室真正的老大哥','领袖路线。',v211Fx([['v220Payoff','mentor']],{tr:8},{type:'mentor',label:'更衣室领袖地位确立'})]];
 else if(p==='fultz')choices=branch==='mechanics'?[['保持这套动作，不再改一个细节','稳定继续提升。',v211Fx([['v220Payoff','locked']],{s:7,c:3},{type:'record',label:'投篮动作正式定型'})],['现在开始增加持球三分','投射上限继续打开。',v211Fx([['v220Payoff','pullup']],{a:{shooting:2},s:3},{type:'careerNight',label:'持球投代表战'})],['动作已经够了，我要把注意力转回比赛阅读','组织和球队地位上升。',v211Fx([['v220Payoff','creator']],{a:{playmaking:1},tr:6},{type:'franchiseTrust',label:'不再被投篮定义'})]]:[['空位、急停、关键球都不再回避','直接进入投篮自由路线。',v211Fx([['v220Payoff','free']],{a:{shooting:1},c:5,s:4},{type:'careerNight',label:'完全放开出手之夜'})],['把投篮变成正常武器，不再证明给任何人看','成熟路线。',v211Fx([['v220Payoff','normal']],{tr:6,s:5},{type:'record',label:'投篮重新变成普通技能'})],['把球权拿回来，我要做真正的持球核心','球队地位与组织路线。',v211Fx([['v220Payoff','lead']],{a:{playmaking:1},c:4},{type:'franchise',label:'富尔茨成为持球核心'})]];
 else choices=branch==='shoot'?[['继续投，哪怕连续三个不进也不能停','真正把“不敢投”从生涯里删除。',v211Fx([['v220Payoff','shooter']],{a:{shooting:2},s:6,c:4},{type:'careerNight',label:'连续外线回应放投'})],['空位投，但关键时刻仍以突破为第一选择','平衡版本西蒙斯。',v211Fx([['v220Payoff','balanced']],{a:{finishing:1,shooting:1},tr:4},{type:'franchiseTrust',label:'投突平衡开始成形'})],['让教练给我设计无球三分，不只站着等球','打法真正改变。',v211Fx([['v220Payoff','offball']],{a:{shooting:1,mentality:1},tr:5},{type:'record',label:'西蒙斯开始无球投射'})]]:branch==='center'?[['正式改打组织中锋','位置路线永久改变。',v211Fx([['v220Payoff','center']],{a:{rebounding:1,playmaking:1},tr:6},{type:'franchise',label:'正式转型组织中锋'})],['只在收官阵容打中锋，常规时间继续控球','万能阵容路线。',v211Fx([['v220Payoff','hybrid']],{tr:5,a:{mentality:1}},{type:'franchiseTrust',label:'成为多位置终结阵容核心'})],['还是回到控卫，我要正面解决投射','重新回到投射线。',v211Fx([['v220Payoff','backShoot']],{a:{shooting:1},s:6,c:3},{type:'careerNight',label:'重新正面面对投射'})]]:[['把冲框做成每晚固定任务','侵略性继续提升。',v211Fx([['v220Payoff','rim']],{a:{finishing:1},s:5,c:4},{type:'careerNight',label:'持续冲击篮筐'})],['练罚球和短中距离，让收缩付出代价','半场技术补强。',v211Fx([['v220Payoff','short']],{a:{shooting:1,finishing:1},s:4},{type:'record',label:'短区进攻开始成形'})],['关键回合我要自己承担结果','直接进入关键球责任线。',v211Fx([['v220Payoff','clutch']],{c:6,tr:3},{type:'franchise',label:'主动承担关键回合'})]];
 return Object.assign(base,{t:title,scene:`${seasonLabel()} · ${team}赛季后半程`,speaker:`${a} / ${b}`,cast:[a,b],b:body,stakes:'这是前半季选择的直接后果，不是另一件无关的新事件。选完以后会继续影响季后赛、合同和下赛季的人物关系。',c:choices});
}
const __v220StoryChoice=storyChoice;
storyChoice=function(i){
 let raw=ui.storyEvent,ep=raw?._v220Episode||0,effect=raw?.c?.[i]?.[2],branch=null;
 if(effect?.flags){let hit=effect.flags.find(x=>x&&x[0]==='v220SeasonChoice');if(hit)branch=hit[1]}
 __v220StoryChoice(i);
 if(career&&ep){
   if(branch)career.v220SeasonBranch=branch;
   if(career.storyLog?.length){let rec=career.storyLog[career.storyLog.length-1];rec.v220SeasonEpisode=ep;rec.v220SeasonBranch=branch||career.v220SeasonBranch||'';rec.route=typeof v28Route==='function'?v28Route():rec.route}
   save();
 }
};
/* 半季剧情优先消费现有专属剧情池，池用尽后再回落到程序生成文本，避免同一段文案每季重复。 */
function v220TakeSaga(tag){
 try{
  v211Init();
  career.v220SeasonTitles=career.v220SeasonTitles||{};
  let sn=career.seasonNo,used=career.v220SeasonTitles[sn]||(career.v220SeasonTitles[sn]=[]);
  let pool=v211SagaPool()||[];
  try{
   if(typeof window.__v217InferPhase==='function'){
    let reg=pool.filter(x=>window.__v217InferPhase(null,x.id)==='regular');
    if(reg.length)pool=reg;
   }
  }catch(_){}
  let cands=[];
  const PINS=(typeof V211_TEAM_PIN!=='undefined')?V211_TEAM_PIN:{};
  pool.forEach(x=>{try{
   if(typeof v211TeamOK==='function'&&!v211TeamOK(PINS[x.id],x))return;
   let t=x.make();if(t&&t.t){t._pinId=x.id;cands.push({ev:t,id:x.id})}
  }catch(_){}});
  try{let g=v211GeneratedSaga();if(g&&g.t)cands.push({ev:g,id:null})}catch(_){}
  if(!cands.length)return null;
  let call=used.length,off=(sn*7+call*3)%cands.length,c=null;
  for(let i=0;i<cands.length;i++){
   let x=cands[(off+i)%cands.length];
   if(used.indexOf(x.ev.t)<0){c=x;break}
  }
  if(!c)return null;
  if(c.id&&career.seasonSagaUsed.indexOf(c.id)<0)career.seasonSagaUsed.push(c.id);
  let e=c.ev;
  used.push(e.t);
  e._longArc=true;e._seasonSaga=true;
  if(c.id)e._sagaId=c.id;
  if(tag===1||tag===2)e._v220Episode=tag;
  if(tag===2){
   try{
    let logs=(career.storyLog||[]).filter(x=>x.seasonNo===career.seasonNo);
    let first=logs.filter(x=>x.v220SeasonEpisode===1)[0]||logs[logs.length-1];
    if(first){
     let team=teamBy(career.team).name;
     e.b=String(e.b||'')+`<br><br>赛季前半段你选择了“${first.choice}”。现在球队战绩、你在${team}的角色和更衣室态度都已经跟着这个选择发生了变化——这一次的问题不是重新开始，而是它接下来会把你推向哪里。`;
     e.stakes=`这是前半季选择的直接后果，不是另一件无关的新事件。选完以后会继续影响季后赛、合同和下赛季的人物关系。`;
    }
   }catch(_){}
  }
  return e;
 }catch(err){return null}
}
window.v220TakeSaga=v220TakeSaga;

const __v220MaybeStory=maybeStory;
maybeStory=function(){
 let hit=__v220MaybeStory();if(hit)return true;
 if(!career?.exclusive||career.stage!=='regular'||ui.storyEvent||ui.modal)return false;
 let logs=v220SeasonLogs();
 if(career.games>=18&&!logs.some(x=>x.v220SeasonEpisode===1)){let e=v220TakeSaga(1)||v220OpeningEpisode();stopSim();ui.storyEvent=e;save();render();return true}
 if(career.games>=58&&logs.some(x=>x.v220SeasonEpisode===1)&&!logs.some(x=>x.v220SeasonEpisode===2)){let e=v220TakeSaga(2)||v220FollowupEpisode();stopSim();ui.storyEvent=e;save();render();return true}
 return false;
};
function v220StoryProgressCard(){
 if(!career?.exclusive)return'';let logs=v220SeasonLogs(),a=logs.find(x=>x.v220SeasonEpisode===1),b=logs.find(x=>x.v220SeasonEpisode===2),next=!a?'前半季会出现本季第一段专属故事':!b?'后半季会直接回收你前面的选择':'本季两段连续故事已经完成，后续会继续影响季后赛与休赛期';
 return `<section class="v220-story-chain"><header><div><small>${seasonLabel()} 专属故事</small><h3>本季剧情 ${logs.filter(x=>x.v220SeasonEpisode).length}/2</h3></div><b>${b?'已完成':a?'等待后续':'尚未开始'}</b></header>${a?`<div class="v220-story-step done"><span>上半季</span><strong>${a.title}</strong><p>你的选择：${a.choice}</p></div>`:''}${b?`<div class="v220-story-step done"><span>下半季</span><strong>${b.title}</strong><p>你的选择：${b.choice}</p></div>`:''}<footer>${next}</footer></section>`;
}
const __v220Regular=regularView;
regularView=function(){let h=__v220Regular();if(career?.exclusive){let m='</section><section class="season-command">';if(h.includes(m))h=h.replace(m,`</section>${v220StoryProgressCard()}<section class="season-command">`);else h=v220StoryProgressCard()+h}return h};

const st=document.createElement('style');st.textContent=`
.v220-ad-stack{display:grid;gap:9px;margin:0 16px 11px}.v220-ad-stack .ad-hero,.v220-ad-stack .takeall-ad{margin:0}.v220-story-chain{margin:10px 0;padding:11px;border-radius:20px;background:linear-gradient(145deg,#fff7ef,#fff);border:1px solid #ead5c4}.v220-story-chain header{display:flex;justify-content:space-between;align-items:center}.v220-story-chain header small{font-size:7.5px;color:#a77b5f}.v220-story-chain h3{font-size:14.5px;margin:2px 0}.v220-story-chain header>b{font-size:8.5px;padding:5px 8px;border-radius:999px;background:#fff0e7;color:#b95045}.v220-story-step{margin-top:7px;padding:8px 9px;border-radius:13px;background:#fff;border:1px solid #eee0d4}.v220-story-step span{font-size:7.5px;color:#9d806d}.v220-story-step strong{display:block;font-size:9.5px;margin:2px 0}.v220-story-step p{font-size:8.5px;color:#7c6b60;margin:0}.v220-story-chain footer{font-size:8.5px;color:#8b7565;line-height:1.5;margin-top:7px}
`;document.head.appendChild(st);
const __v220BeginSeason=beginSeason;beginSeason=function(){let old=career?.seasonNo;__v220BeginSeason();if(career&&career.seasonNo===old){career.v220SeasonBranch=null;save()}};
const __v220NextSeason=nextSeason;nextSeason=function(){let old=career?.seasonNo;__v220NextSeason();if(career&&career.seasonNo!==old){career.v220SeasonBranch=null;save()}};
window.__v220MvpRace=v220MvpRace;window.__v220OpeningEpisode=v220OpeningEpisode;window.__v220FollowupEpisode=v220FollowupEpisode;window.__v220SeasonLogs=v220SeasonLogs;
window.__v220MvpRace=v220MvpRace;window.__v220OpeningEpisode=v220OpeningEpisode;window.__v220FollowupEpisode=v220FollowupEpisode;window.__v220SeasonLogs=v220SeasonLogs;
if(career){P.forEach(p=>{let x=EX_NAMES[p.id];if(x){p.exclusive.n=x[0];p.exclusive.d=x[1]}});save();render()}
})();
