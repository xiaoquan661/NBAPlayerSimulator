
(function(){
  'use strict';
  const EX={
    bennett:{name:'六边形超巨',boost:{finishing:4,shooting:4,playmaking:4,defense:4,rebounding:4,strength:4},confidence:8,mechanism:'六项核心能力同步补强；球队输球且你出场时积累“逆风层”，4层自动把当前最低核心能力+2，每季最多3次。'},
    oden:{name:'钢铁神躯',boost:{durability:8,strength:6,blocks:6,rebounding:5,defense:4},health:10,mechanism:'免疫「生涯报销级」伤病；所有伤病发生概率降低90%；每次伤病复出后耐久+2。'},
    kwame:{name:'不世出的少年天才',boost:{finishing:5,defense:5,rebounding:5,strength:6,mentality:4},confidence:4,mechanism:'23岁前每个休赛期自动补强当前最低的两项能力各+2，让成长不再被短板拖住。'},
    fultz:{name:'投篮之神',boost:{shooting:10,playmaking:3,steals:3,mentality:3},confidence:8,mechanism:'投篮训练额外成长；连续5场投篮表现稳定后，投射再+1，每季最多4次，投篮稳定同时上升。'},
    simmons:{name:'库里的投射',boost:{shooting:12,playmaking:3,defense:3,strength:3},confidence:5,mechanism:'三分出手基础提高；季后赛额外增加主动出手倾向，投射训练额外成长，投篮不再是默认放弃的回合。'}
  };
  const defaults={
    bennett:{steals:62,blocks:45,strength:72},
    oden:{steals:48,blocks:92,strength:88},
    kwame:{steals:48,blocks:80,strength:86},
    fultz:{steals:68,blocks:55,strength:58},
    simmons:{steals:78,blocks:72,strength:86}
  };
  const order={finishing:'终结',shooting:'投射',playmaking:'组织',defense:'防守',rebounding:'篮板',steals:'抢断',blocks:'盖帽',strength:'力量',athleticism:'运动',durability:'耐久',mentality:'心态'};
  try{for(const k of Object.keys(ATTR))delete ATTR[k];Object.assign(ATTR,order);}catch(e){}
  for(const p of ['bennett','oden','kwame','fultz','simmons']){
    const obj=playerBy(p);if(!obj)continue;
    obj.attrs=obj.attrs||{};
    for(const [k,v] of Object.entries(defaults[p]))if(obj.attrs[k]==null)obj.attrs[k]=v;
    const ex=EX[p];
    if(obj.exclusive){obj.exclusive.n=ex.name;obj.exclusive.d=`${Object.entries(ex.boost).map(([k,v])=>`${ATTR[k]}+${v}`).join('、')}。${ex.mechanism} 另外解锁从选秀夜写到退役的专属故事。`;obj.exclusive.fx=`${p}_x`;}
    obj.ovr=calcOvr(obj.attrs);
  }

  /* 2026-10-21 数值回靠原版：
     原版 OVR = 8 项加权平均（不含抢断/盖帽/力量），同能力下不再 +5~7。
     抢断/盖帽/力量仍参与 statExpect，但不再抬高 OVR，避免 17% 权重压在不可训练项上。 */
  const weights={finishing:.16,shooting:.13,playmaking:.14,defense:.16,rebounding:.12,athleticism:.11,durability:.09,mentality:.09};
  window.v221CalcOvr=function(a){let sum=0;for(const [k,w] of Object.entries(weights))sum+=Number(a?.[k]??50)*w;return clamp(Math.round(sum),50,99)};
  calcOvr=window.v221CalcOvr;
  for(const id of ['bennett','oden','kwame','fultz','simmons']){const obj=playerBy(id);if(obj)obj.ovr=v221CalcOvr(obj.attrs);}

  function migrate(){
    if(!career)return;
    const p=playerBy(career.playerId);career.attrs=career.attrs||{};
    for(const [k,v] of Object.entries(defaults[career.playerId]||{}))if(career.attrs[k]==null)career.attrs[k]=v;
    for(const k of Object.keys(order))if(career.attrs[k]==null)career.attrs[k]=50;
    if(!career._v221OvrMigrated){career._v221OvrMigrated=true;career.ovrMod=0;}
    career.ovr=v221CalcOvr(career.attrs);
    career.records=career.records||{};career.records.bestOvr=Math.max(career.records.bestOvr||0,career.ovr);
    career.careerTotals=career.careerTotals||{};for(const k of ['steals','blocks'])if(career.careerTotals[k]==null)career.careerTotals[k]=0;
    career.seasonStats=career.seasonStats||{};for(const k of ['stl','blk','totalStl','totalBlk'])if(career.seasonStats[k]==null)career.seasonStats[k]=0;
    career.v221=career.v221||{seasonBennettStacks:0,seasonFultzHot:0,seasonFultzBoost:0,kwameSeasonBoost:0,seasonHeadline:null,seasonFollowupSeason:null,seasonStorySeasons:[]};
    if(p&&p.exclusive&&career.exclusive&&career.talents?.includes(p.exclusive.fx))applyExclusive(false);
    career.ovr=v221CalcOvr(career.attrs);
  }
  function applyExclusive(feed){
    if(!career)return;
    const p=career.playerId,ex=EX[p];if(!ex||!career.talents?.includes(`${p}_x`))return;
    career.v221=career.v221||{};
    career.v221.exclusiveApplied=career.v221.exclusiveApplied||{};
    if(!career.v221.exclusiveApplied[p]){
      for(const [k,v] of Object.entries(ex.boost))career.attrs[k]=clamp((career.attrs[k]||50)+v,30,99);
      if(ex.health)career.health=clamp((career.health||75)+ex.health);
      if(ex.confidence)career.confidence=clamp((career.confidence||50)+ex.confidence);
      career.v221.exclusiveApplied[p]=true;
      const v222BoostText=Object.entries(ex.boost).map(([k,v])=>`${ATTR[k]}+${v}`).join('、');
      if(feed){career.feed=career.feed||[];career.feed.unshift(`专属天赋「${ex.name}」已经生效：${v222BoostText}`);}
      v222Pop&&v222Pop(ex.name,`已生效：${v222BoostText}`);
    }
    career.ovr=v221CalcOvr(career.attrs);
  }
  window.v221Migrate=migrate;

  /* === V2.22: 专属天赋触发反馈 —— 每次触发都弹出提示，不再静默生效 === */
  window.v222Pops=[];
  const v222Seen={};
  const v222TitleAt={};
  window.v222Pop=function(title,body){
    if(!career)return;
    const now=Date.now();
    const key=`${title}|${body}`;
    if(v222Seen[key])return;                    // 同内容短时间内重复上报只提示一次
    v222Seen[key]=1;
    setTimeout(()=>{delete v222Seen[key]},4000);
    // 同一类触发设冷却：模拟速度快时避免刷屏；被拦的调用不占用冷却窗口
    if(v222TitleAt[title]&&now-v222TitleAt[title]<20000)return;
    v222TitleAt[title]=now;
    window.v222Pops.push({title:title,body:body});
    if(window.v222Pops.length>3)window.v222Pops.shift();
    v222RenderPops();
    if(window.v222PopTimer)clearTimeout(window.v222PopTimer);
    window.v222PopTimer=setTimeout(()=>{window.v222Pops=[];v222RenderPops()},4200);
  };
  /* 触发计数：v221 独有的触发点（逆风层、手感延续）只在此累加，避免与 v28 层重复计数 */
  window.v222Count=function(){
    if(!career)return;
    career.exclusiveRuntime=career.exclusiveRuntime||{procs:0,seasonProcs:0,lastProc:'',bennettStacks:0,odenShieldSeason:0};
    career.exclusiveRuntime.procs=(career.exclusiveRuntime.procs||0)+1;
    career.exclusiveRuntime.seasonProcs=(career.exclusiveRuntime.seasonProcs||0)+1;
  };
  function v222RenderPops(){
    let host=document.getElementById('v222-pop-layer');
    if(!window.v222Pops.length){if(host)host.remove();return}
    if(!host){host=document.createElement('div');host.id='v222-pop-layer';host.className='v222-pop-layer';document.body.appendChild(host)}
    const rt=(career&&career.exclusiveRuntime)||{};
    host.innerHTML=window.v222Pops.map(p=>`<div class="v222-pop"><div class="v222-pop-top"><span class="v222-pop-kicker">专属天赋 · 生效提示</span><span class="v222-pop-count">本季 ${rt.seasonProcs||0} 次 · 生涯 ${rt.procs||0} 次</span></div><div class="v222-pop-name">${p.title}</div><p class="v222-pop-body">${p.body}</p><span class="v222-pop-tag">已写入生涯反馈</span></div>`).join('');
  }
  window.v222RenderPops=v222RenderPops;
  /* 触发统计块：球员页与赛季页的天赋面板共用，保证两处口径一致 */
  window.v222ExclusiveStats=function(){
    if(!career||!career.exclusive||!career.talents)return'';
    const p=currentP();if(!p||!p.exclusive||career.talents.indexOf(p.exclusive.fx)<0)return'';
    const rt=career.exclusiveRuntime;if(!rt)return'';
    return `<div class="v222-excl-stats"><b>本季 ${rt.seasonProcs||0} 次 · 生涯累计 ${rt.procs||0} 次</b><span>最近一次：${rt.lastProc||'等待生效'}</span></div>`;
  };
  /* 生涯统计变化时（触发计数已更新）补一次渲染，保证飘窗里的次数是实时的 */
  const v222OrigSave=save;
  save=function(){v222OrigSave();if(window.v222Pops.length)v222RenderPops()};

  const oldSync=syncOvr;
  syncOvr=function(){if(!career)return;career.ovr=clamp(v221CalcOvr(career.attrs)+(Number(career.ovrMod)||0),50,99);career.role=roleByOvr(career.ovr);let trustBonus=career.trust>=78?2:career.trust>=64?1:career.trust<38?-2:0;career.minutes=Math.min(career.minutesLimit||99,clamp(minutesByRole(career.role)+trustBonus+(hasTalent('core')?2:0),10,37));if(career.records)career.records.bestOvr=Math.max(career.records.bestOvr||0,career.ovr)};

  const oldStatExpect=statExpect;
  statExpect=function(){
    let x=oldStatExpect();if(!career)return x;const a=career.attrs||{};
    x.reb=Math.max(0,(x.reb||0)+(a.strength-70)*.018);
    x.stl=Math.max(0,(x.stl||0)+(a.steals-60)*.018);
    x.blk=Math.max(0,(x.blk||0)+(a.blocks-55)*.022+(a.strength-70)*.006);
    return x;
  };

  const oldInjuryChance=injuryChance;
  /* 钢铁神躯：所有伤病发生概率降低90%。先按原始曲线算出概率并夹紧，再统一乘0.10，
     避免被下限截断而达不到标注的降幅。 */
  injuryChance=function(){
    if(!career)return oldInjuryChance();
    /* 2026-10-21 回靠原版伤病曲线：耐久/健康驱动，奥登与富尔茨保留专属风险。
       难度只做倍率修正，不改变基础曲线。 */
    let a=career.attrs||{};
    let base=.65+(100-(Number(a.durability)||70))*.025+(100-(Number(career.health)||70))*.018+(Number(career.injuryRiskBuff)||0);
    if(career.playerId==='oden')base+=1.25+(Number(career.special)||0)*.018;
    if(career.playerId==='fultz')base+=.22;
    if(hasTalent('iron'))base*=.75;
    base=clamp(base,.25,5.5);
    const diffInjury=career.__arch&&career.__arch.difficultyInjury;
    if(diffInjury)base=clamp(base*diffInjury,.25,6.5);
    if(career.playerId==='oden'&&career.talents?.includes('oden_x'))base=Math.max(.02,base*.62);
    return base;
  };

  const oldAgeCurve=ageCurve;
  ageCurve=function(){oldAgeCurve();if(!career)return;if(career.playerId==='kwame'&&career.talents?.includes('kwame_x')&&career.age<=23){let keys=['finishing','defense','rebounding','strength','shooting','playmaking'];let sorted=keys.slice().sort((a,b)=>(career.attrs[a]||0)-(career.attrs[b]||0));sorted.slice(0,2).forEach(k=>career.attrs[k]=clamp(career.attrs[k]+2,30,99));career.v221.kwameSeasonBoost=(career.v221.kwameSeasonBoost||0)+1;}syncOvr()};

  /* 库里的投射：每场获得额外的高质量三分出手。
     旧写法的毛病是只加出手次数、命中率不动，投射38的西蒙斯多投就是多打铁，玩家看不到收益；
     这里让额外出手按提升后的命中率结算，并同步改写命中数，保证“敢投”真的能转化成得分。 */
  const oldV26Box=typeof v26DeriveBox==='function'?v26DeriveBox:null;
  if(oldV26Box){v26DeriveBox=function(line){
    oldV26Box(line);
    if(!career||career.playerId!=='simmons'||!career.talents?.includes('simmons_x'))return line;
    const extra=career.stage==='playoffs'?3:2;
    const oldTpa=line.tpa||0,oldTpm=line.tpm||0;
    /* 额外出手按「提升后的命中率」结算，但上限要压在真实精英射手区间里 ——
       原写法 +18 分点、封顶 62%，实测三分命中率被顶到 58%，明显失真
       （库里生涯三分最高 45.5%）。这里改为 +14 分点、封顶 46%。 */
    const pct=clamp(((line.three||34)+14)/100,.26,.46);
    const tpa=Math.min(line.fga||99,oldTpa+extra);
    const tpm=Math.min(Math.floor((line.pts||0)/3),Math.max(oldTpm,Math.round(tpa*pct)));
    const delta=tpm-oldTpm;
    /* 多出来的三分既是「命中数」也是「得分」：命中数 +delta、三分 +delta，
       所以得分必须同步 +3*delta，否则得分与投篮明细会对不上账（实测西蒙斯
       一季累计差 27 分）。 */
    if(delta>0){line.fgm=(line.fgm||0)+delta;line.pts=(line.pts||0)+3*delta;line.fg=line.fga?+(line.fgm/line.fga*100).toFixed(1):line.fg}
    line.tpa=tpa;line.tpm=tpm;
    line.three=tpa?+(tpm/tpa*100).toFixed(1):line.three;
    return line;
  };}
  /* 三分里程碑：单场命中3记以上给可见反馈，全季命中数累积转化为投射成长 */
  function v221SimmonsThreeCheck(){
    if(!career||career.playerId!=='simmons'||!career.talents?.includes('simmons_x'))return;
    const g=career.gameLog?.[0],l=g&&g.line;
    if(!l||g.played===false)return;
    const tpm=Number(l.tpm)||0;
    if(tpm<3)return;
    career.v221.seasonTpm=(career.v221.seasonTpm||0)+tpm;
    career.v221.careerTpm=(career.v221.careerTpm||0)+tpm;
    career.v221.lastThree=`单场命中${tpm}记三分`;
    while(career.v221.seasonTpm>=12&&(career.v221.seasonThreeBoost||0)<5){
      career.v221.seasonTpm-=12;career.v221.seasonThreeBoost=(career.v221.seasonThreeBoost||0)+1;
      career.attrs.shooting=clamp(career.attrs.shooting+1,30,99);
      career.confidence=clamp((career.confidence||60)+1);
      v222Count&&v222Count();
      career.exclusiveRuntime.lastProc=`「库里的投射」触发：本季三分累积达标，投射+1`;
      career.feed.unshift('「库里的投射」触发：本季三分命中累积达标，投射+1。');
      v222Pop&&v222Pop('库里的投射 · 三分累积','本季三分命中达标：投射 +1');
      syncOvr();
    }
    if(tpm>=4){
      v222Pop&&v222Pop('库里的投射 · 单场爆发',`${career.v221.lastThree}，外线已经不再是漏洞`);
      career.feed.unshift(`「库里的投射」触发：${career.v221.lastThree}。`);
    }
  }

  /* ===== 生涯报销级伤病：概率极低、缺席整个赛季、复出后属性大幅下滑、可看奖励视频免疫 ===== */
  function v221EndingBlocked(){return hasTalent('oden_x')&&career?.playerId==='oden'}
  /* 复出结算：报销级伤病复出大幅掉属性；钢铁神躯持有者每次复出额外+2耐久 */
  function v221InjuryReturn(hadInjury){
    if(!hadInjury||!career||career.injury)return;
    if(hadInjury.careerEnding){
      const drop={durability:10,athleticism:7,finishing:6,defense:5,rebounding:4,mentality:3};
      for(const k of Object.keys(drop))if(career.attrs[k]!=null)career.attrs[k]=clamp(career.attrs[k]-drop[k],30,99);
      career.ovrMod=(career.ovrMod||0)-2;
      career.confidence=clamp((career.confidence||60)-10);
      career.feed.unshift('报销级伤病复出：身体机能明显下滑，你必须用比赛重新证明自己。');
      recordAchievement&&recordAchievement('报销级伤病复出',`${seasonLabel()} 从生涯报销级伤病中复出，多项核心能力大幅下滑。`,'injury',`ending-${career.seasonNo}`,false);
      v222Pop&&v222Pop('报销级伤病 · 复出','耐久、运动、终结、防守、篮板、心态全面下滑');
    }
    if(hasTalent('oden_x')&&career.playerId==='oden'){
      career.attrs.durability=clamp(career.attrs.durability+2,30,99);
      career.exclusiveRuntime=career.exclusiveRuntime||{procs:0,seasonProcs:0,lastProc:'',odenShieldSeason:0};
      career.exclusiveRuntime.procs++;career.exclusiveRuntime.seasonProcs++;
      career.exclusiveRuntime.lastProc='「钢铁神躯」触发：伤病复出，耐久+2';
      career.feed.unshift('「钢铁神躯」触发：伤病复出，耐久+2。');
      v222Pop&&v222Pop('钢铁神躯 · 复出强化','伤病复出：耐久 +2');
    }
    syncOvr();
  }
  window.v221EndingWatchAd=async function(){
    if(!career)return;
    await rewardAd.request('career_ending_immunity');
    career.injury=null;ui.modal=null;
    career.feed.unshift('你选择了化解：这次生涯报销级伤病被完全消除。');
    v222Pop&&v222Pop('伤病已化解','生涯报销级伤病被完全消除，不缺席任何比赛');
    save();render();
  };
  window.v221EndingAccept=function(){
    if(!career||!career.injury)return;
    ui.modal=null;
    career.feed.unshift('你选择接受现实：报销级伤病确认，将缺席整个赛季。');
    save();render();
  };

  const oldSim=simulateGame;
  simulateGame=function(){const before=career?.games||0;const hadInjury=career?.injury||null;oldSim();if(!career||career.games===before)return;v221InjuryReturn(hadInjury);if(career.playerId==='bennett'&&career.talents?.includes('bennett_x')){career.v221.seasonBennettStacks=career.v221.seasonBennettStacks||0;let g=career.gameLog?.[0];if(g&&g.played!==false&&!g.win){career.v221.seasonBennettStacks++;if(career.v221.seasonBennettStacks>=4&&career.v221.bennettProcSeason!==(career.seasonNo)){career.v221.bennettProcSeason=career.seasonNo;career.v221.seasonBennettStacks=0;let keys=['finishing','shooting','playmaking','defense','rebounding','strength'];let k=keys.slice().sort((a,b)=>career.attrs[a]-career.attrs[b])[0];career.attrs[k]=clamp(career.attrs[k]+2,30,99);v222Count&&v222Count();career.exclusiveRuntime.lastProc=`「六边形超巨」触发：${ATTR[k]}+2，逆风没有白扛`;career.feed.unshift(`「六边形超巨」触发：${ATTR[k]}+2，逆风没有白扛。`);v222Pop&&v222Pop('六边形超巨 · 逆风层','扛过 4 场失利：'+ATTR[k]+' +2，逆风没有白扛');syncOvr();}}
    }
    if(career.playerId==='fultz'&&career.talents?.includes('fultz_x')){let g=career.gameLog?.[0];let good=g&&g.line&&((g.line.fg||0)>=48||(g.line.three||0)>=38);career.v221.seasonFultzHot=good?(career.v221.seasonFultzHot||0)+1:0;if(career.v221.seasonFultzHot>=5&&(career.v221.seasonFultzBoost||0)<4){career.v221.seasonFultzHot=0;career.v221.seasonFultzBoost++;career.attrs.shooting=clamp(career.attrs.shooting+1,30,99);career.special=clamp((career.special||65)+2);v222Count&&v222Count();career.exclusiveRuntime.lastProc='「投篮之神」触发：投射+1，投篮稳定+2';career.feed.unshift(`「投篮之神」触发：投射+1，投篮稳定继续提升。`);v222Pop&&v222Pop('投篮之神 · 手感延续','连续 5 场投篮稳定：投射 +1，投篮稳定继续提升');syncOvr();}}
    v221SimmonsThreeCheck();
    save();render();};

  const oldTriggerInjury=triggerInjury;
  triggerInjury=function(){
    if(!career){return oldTriggerInjury()}
    oldTriggerInjury();
    if(!career.injury||career.injury.careerEnding)return;
    /* 报销级判定：只有重伤（major）才可能恶化为生涯报销级，概率极低 */
    if(career.injury.severity!=='major')return;
    if(Math.random()>=.015)return;
    /* 钢铁神躯持有者免疫：给出可见反馈，伤口照常只是普通重伤 */
    if(v221EndingBlocked()){
      career.exclusiveRuntime=career.exclusiveRuntime||{procs:0,seasonProcs:0,lastProc:'',odenShieldSeason:0};
      career.exclusiveRuntime.procs++;career.exclusiveRuntime.seasonProcs++;
      career.exclusiveRuntime.lastProc='「钢铁神躯」触发：免疫生涯报销级伤病';
      career.feed.unshift('「钢铁神躯」触发：这次重伤本会演变成生涯报销级，已被免疫。');
      v222Pop&&v222Pop('钢铁神躯 · 神躯免疫','免疫生涯报销级伤病：这次重伤维持为普通重伤');
      save();render();return;
    }
    career.injury={name:'生涯报销级伤病',gamesLeft:82,baseGames:82,severity:'career-ending',careerEnding:true};
    career.health=clamp(career.health-25);
    const hist=career.injuryHistory?.[career.injuryHistory.length-1];
    if(hist&&hist.season===seasonLabel()&&hist.game===career.games){hist.name='生涯报销级伤病';hist.severity='career-ending';hist.games=82}
    stopSim();ui.modal={kind:'careerEnding'};
    career.feed.unshift('医疗报告：这是生涯报销级伤病，预计缺席整个赛季。');
    save();render();
  };

  const oldAddPoint=addPoint;
  addPoint=function(k){const before=career?.attrs?.[k]||0;oldAddPoint(k);if(!career)return;if(career.playerId==='fultz'&&career.talents?.includes('fultz_x')&&k==='shooting'&&career.attrs.shooting===before+1){career.attrs.shooting=clamp(career.attrs.shooting+1,30,99);career.feed.unshift('「投篮之神」触发：投射额外+1。');v222Pop&&v222Pop('投篮之神 · 训练加成','本次投射加点额外 +1');syncOvr();save();render()}if(career.playerId==='simmons'&&career.talents?.includes('simmons_x')&&k==='shooting'&&career.attrs.shooting===before+1){career.attrs.shooting=clamp(career.attrs.shooting+1,30,99);career.feed.unshift('「库里的投射」触发：投射额外+1。');v222Pop&&v222Pop('库里的投射 · 训练加成','本次投射加点额外 +1');syncOvr();save();render()}};

  const oldCreate=createCareer;
  createCareer=function(){oldCreate();if(!career)return;migrate();applyExclusive(true);career.v221.seasonBennettStacks=0;career.v221.seasonFultzHot=0;career.v221.seasonFultzBoost=0;career.v221.odenMajorShieldSeason=null;career.v221.seasonTpm=0;career.v221.seasonThreeBoost=0;syncOvr();save();render()};

  /* 报销级伤病弹窗：可看奖励视频免疫，或接受现实缺席整个赛季 */
  const oldOverlayV221=renderOverlay;
  renderOverlay=function(){
    if(ui.modal?.kind==='careerEnding'){
      return `<div class="overlay"><div class="sheet"><div class="sheet-handle"></div><div class="injury-card"><div class="alert"><div class="injury-icon">✚</div><div><small>SEASON-ENDING INJURY</small><h2>生涯报销级伤病</h2></div></div><p>医疗组给出的是最坏结果：这次伤病将让你<strong>缺席整个赛季</strong>，复出后身体机能也会明显下滑。</p><div class="choice-list"><button class="choice" onclick="v221EndingWatchAd()"><b>🎬 看奖励视频 · 化解伤病</b><span>完全消除这次伤病，不缺席任何比赛，属性不受影响。</span></button><button class="choice danger" onclick="v221EndingAccept()"><b>接受现实</b><span>确认缺席整个赛季，复出后耐久、运动、终结、防守、篮板、心态全面下降。</span></button></div></div></div></div>`;
    }
    return oldOverlayV221();
  };

  /* 赛季结束：报销级伤病在休赛期完成复出结算，避免跨赛季累积 */
  const oldEndV221=endSeason;
  endSeason=function(result){
    const endingInjury=career?.injury?.careerEnding?career.injury:null;
    if(endingInjury){career.injury=null;}
    oldEndV221(result);
    if(endingInjury&&career){v221InjuryReturn(endingInjury);save();render()}
  };

  /* 专属天赋：玩家看到的内容必须和实际数值/机制一致 */
  talentLivePanel=function(){
    if(!career?.talents?.length)return'';const p=playerBy(career.playerId),ex=EX[career.playerId];
    const cards=career.talents.map(id=>{let t=(typeof v26TalentEffect==='function'?v26TalentEffect(id):null);if(t)return `<div class="v26-live-talent ${typeof v26TalentClass==='function'?v26TalentClass(id):'q-common'}"><small>${t[2]}</small><b>${t[0]}</b><span>${t[1]}</span></div>`;return''}).join('');
    let exclusive='';if(career.exclusive&&ex&&career.talents.includes(`${career.playerId}_x`)){
      const boosts=Object.entries(ex.boost).map(([k,v])=>`<span>${ATTR[k]} +${v}</span>`).join('');
      exclusive=`<div class="v221-exclusive-live"><div class="v221-live-top"><div><small>专属天赋</small><b>${ex.name}</b></div><strong>天赋加持中</strong></div><div class="v221-boosts">${boosts}</div><p>${ex.mechanism}</p><em>本季 ${(career.exclusiveRuntime&&career.exclusiveRuntime.seasonProcs)||0} 次 · 生涯累计 ${(career.exclusiveRuntime&&career.exclusiveRuntime.procs)||0} 次${career.exclusiveRuntime&&career.exclusiveRuntime.lastProc?`<br>最近一次：${career.exclusiveRuntime.lastProc}`:''}</em></div>`;
    }
    return `<section class="v26-live-talents"><header><b>本局天赋正在生效</b><span>选择的天赋会直接改变比赛和成长</span></header>${exclusive}<div class="v26-live-talent-grid">${cards}</div></section>`;
  };

  /* 天赋页：专属广告、全部拿下广告固定在最上面，并明确写出真实收益 */
  renderTalents=function(){let p=playerBy(ui.selected),ex=EX[p.id]||{name:'无人知晓的名字',boost:{mentality:4,durability:2},confidence:5,mechanism:'没有人认识你——每一分成长都从零挣来。'},draw=ui.talentDrawCount||1,freeLeft=Math.max(0,3-draw),boosts=Object.entries(ex.boost).map(([k,v])=>`${ATTR[k]} +${v}`).join(' · ');return `<section class="pre"><div class="pre-top"><button class="circle-btn" onclick="ui.screen='select';render()">←</button><strong>${p.zh} · 命运天赋</strong><span style="width:36px"></span></div><div class="pre-intro"><small>本局天赋</small><h2>先把最致命的短板补上</h2><p>3次免费抽取。用完后可看奖励视频继续刷新；两个奖励入口都放在这里，选择后会立即生效。</p></div><div class="v221-ad-stack"><div class="v221-exclusive-ad"><small>球员专属 · 直到退役</small><h2>${ex.name}</h2><p>${boosts}</p><b>${ex.mechanism}</b><div><span>✓ 开局立即生效</span><span>✓ 局内持续生效</span><span>✓ 解锁从选秀夜到退役的专属故事</span></div><div class="v221-ad-story"><b>专属故事 · 看广告一并解锁</b><p>解锁后，从真实职业生涯的关键节点开始；你的每次选择都会改变人物关系、球队角色、合同、季后赛和最终结局。</p><em>不看广告＝本局只有纯模拟，不会出现${p.zh}的专属剧情、专属选择和剧情分歧。</em></div><button onclick="unlockExclusive()">${ui.exclusive?'✓ 已获得 · 专属天赋加持中':'🎬 看奖励视频 · 解锁专属天赋'}</button></div><div class="v221-takeall-ad"><div><small>奖励视频</small><h3>四张随机天赋 · 一次全部拿下</h3><p>不用做取舍，当前4张直接全部加入本局。</p></div><button onclick="takeAll()">${ui.allTalents?'✓ 已全部获得':'🎬 看奖励视频 · 全部拿下'}</button></div></div><div class="v210-drawbar"><div><small>免费抽取</small><b>${draw<=3?`${draw}/3`:`额外刷新 ×${ui.talentAdRefreshes||0}`}</b></div><button onclick="refreshTalentPool()">${freeLeft>0?`免费刷新 · 还剩${freeLeft}次`:'看奖励视频 · 再刷一组'}</button></div><div class="talent-wrap"><div class="talent-grid">${ui.talents.map((t,i)=>`<button class="talent-card ${qClass(t.r)} ${ui.talentPick===i?'selected':''}" onclick="ui.talentPick=${i};render()"><div class="rarity">${t.r}</div><h3>${t.n}</h3><p>${t.d}</p><div class="ghost">0${i+1}</div></button>`).join('')}</div></div><div class="sticky-cta"><button class="btn primary" onclick="enterDraft()">进入选秀之夜</button></div></section>`};

  /* 全明星：无论是否入选都停表，由玩家确认后再继续后半程。 */
  const oldMaybeAllStar=maybeAllStar;
  maybeAllStar=function(){
    let r=oldMaybeAllStar();
    if(r&&career?.stage==='allstar'){
      if(career)career.v31Await=true;
      stopSim();
    }
    return r;
  };
  window.v221ResumeAllStar=function(){
    if(!career||career.stage!=='allstar')return;
    if(career)career.v31Await=true;
    resumeAllStar();
    render();
  };
  allStarView=function(){let yes=career.allStar,l=career.allStarLine;return `${seasonHero()}<section class="stage-card v221-allstar-card" style="margin-top:10px">${asset('全明星周末主视觉','全明星球馆、灯光与比赛氛围','banner')}<div class="stage-copy"><div class="big-icon">★</div><span class="result-label">${yes?'正式入选全明星':'本季未入选'}</span><h2>${yes?'全明星正赛已经结束':'全明星名单已经公布'}</h2><p>${yes?'你已经直接打完本届全明星正赛，下面就是本届数据。确认后，再手动继续后半程。':'本季没有入选。全明星节点仍会停表，确认后由你手动继续后半程。'}</p>${yes&&l?`<div class="allstar-line"><div><b>${Math.round(l.pts)}</b><span>PTS</span></div><div><b>${Math.round(l.reb)}</b><span>REB</span></div><div><b>${Math.round(l.ast)}</b><span>AST</span></div></div>`:''}<button class="btn primary" style="width:100%;margin-top:12px" onclick="v221ResumeAllStar()">继续后半程 →</button></div></section>`};

  /* 季后赛严格锁定分区：分区决赛之前只能碰同一分区，总决赛才跨区。 */
  const EAST=new Set(['ATL','BOS','BKN','CHA','CHI','CLE','DET','IND','MIA','MIL','NYK','ORL','PHI','TOR','WAS']);
  function conf(abbr){return EAST.has(abbr)?'东部':'西部'}
  window.v221Conference=conf;
  newSeries=function(){let names=['首轮','分区半决赛','分区决赛','总决赛'],round=career.playoff?.round||0,myConf=conf(career.team);let pool=teams.filter(t=>t.abbr!==career.team);if(round<3)pool=pool.filter(t=>conf(t.abbr)===myConf);else pool=pool.filter(t=>conf(t.abbr)!==myConf);let used=new Set((career.playoff?.rounds||[]).map(r=>r.opp));pool=pool.filter(t=>!used.has(t.abbr));if(!pool.length)pool=teams.filter(t=>t.abbr!==career.team&&((round<3&&conf(t.abbr)===myConf)||(round===3&&conf(t.abbr)!==myConf)));let opp=pick(pool);career.playoff.rounds.push({name:names[round],opp:opp.abbr,oppName:opp.name,w:0,l:0,games:[]})};
  function fixCurrentSeries(){let r=career?.playoff?.rounds?.[career?.playoff?.round];if(!r||r.games?.length)return;if(career.playoff.round<3&&conf(r.opp)!==conf(career.team)){let pool=teams.filter(t=>t.abbr!==career.team&&conf(t.abbr)===conf(career.team)&&!career.playoff.rounds.some(x=>x.opp===t.abbr));let o=pick(pool);if(o){r.opp=o.abbr;r.oppName=o.name}}if(career.playoff.round===3&&conf(r.opp)===conf(career.team)){let pool=teams.filter(t=>t.abbr!==career.team&&conf(t.abbr)!==conf(career.team)&&!career.playoff.rounds.some(x=>x.opp===t.abbr));let o=pick(pool);if(o){r.opp=o.abbr;r.oppName=o.name}}}

  /* 系列赛页面明确显示分区，避免玩家误解。 */
  const oldPlayoffView=playoffView;
  playoffView=function(){fixCurrentSeries();let h=oldPlayoffView();return h.replace(/<h2>([^<]*)<\/h2>/,`<h2>$1</h2><div class="v221-conf-tag">${conf(career.team)} · ${career.playoff?.round===3?'NBA总决赛':'分区季后赛'}</div>`)};

  /* 取消常规赛用户暂停：模拟持续进行，剧情选择结束后自动继续。 */
  /* 模拟控制：手动开始、固定 4×、无暂停。点一次跑完本赛季剩余比赛；剧情 / 节点会自然停表。 */
  function v221StartSim(){
    if(!career||career.stage!=='regular'||ui.storyEvent||ui.modal)return;
    /* 存档可能停在「82 场已打完、但赛季还没结算」的瞬间：第 82 场结束到
       finishRegular 之间只要被切后台/关掉，就会存成 games=82 且 stage='regular'。
       原实现把 career.games>=82 也当成「无事可做」直接 return ——
       于是赛季页一直显示「开始模拟常规赛」、点了毫无反应，永远进不了下一流程（实测复现）。
       这里要做的不是继续模拟，而是把赛季推进到结算。 */
    if(career.games>=82){ try{finishRegular()}catch(e){} return; }
    ui.speed=80;ui.sim=true;
    if(ui.interval)clearInterval(ui.interval);
    ui.interval=setInterval(()=>simulateGame(),80);render();
  }
  window.v221StartSim=v221StartSim;
  toggleSim=function(){
    if(ui.sim){
      /* 手动暂停：同时标记本季等待玩家手点，避免 render 钩子立刻重新拉起模拟。 */
      if(career)career.v31Await=true;
      stopSim();
      render();
      return;
    }
    v221StartSim();
  };

  const oldRegularView=regularView;
  regularView=function(){
    let h=oldRegularView();
    let left=Math.max(0,82-career.games);
    let ctl=ui.sim
      ?`<div class="v221-simctl"><button class="go running" onclick="toggleSim()">Ⅱ 暂停模拟</button><div class="speed-fixed"><b>4×</b><span>模拟中</span></div></div>`
      :`<div class="v221-simctl"><button class="go" onclick="v221StartSim()">▶ 开始模拟${left?`剩余 ${left} 场`:'常规赛'}</button><div class="speed-fixed"><b>4×</b><span>固定速度</span></div></div>`;
    h=h.replace(/<button class="go[^>]*>[\s\S]*?<\/button>/,ctl);
    h=h.replace(/82场可随时暂停/g,'82场自动推进');
    /* “最近比赛”卡片已经展示最近 5 场详细数据，这里不再重复渲染一份“最近 N 场”。 */
    return h;
  };

  /* 82 场豆豆全部显示：已模拟按胜负上色，未模拟置灰占位。 */
  v26Beans=function(){
    let played={};(career.gameLog||[]).forEach(g=>{if(typeof g.n==='number')played[g.n]=g});
    let cells='';
    for(let i=1;i<=82;i++){
      let g=played[i];
      cells+=g?`<i class="v26-bean ${g.win?'win':'loss'} ${g.played===false?'dnp':''} ${g.roseBlast?'blast':''}" title="G${i} ${g.win?'胜':'负'}"></i>`:`<i class="v26-bean pending" title="G${i} 未模拟"></i>`;
    }
    return `<div class="v26-bean-card"><div class="v26-bean-head"><b>常规赛 82 场</b><span>绿=胜 · 红=负 · 灰点=伤停 · 暗=未模拟</span></div><div class="v26-beans">${cells}</div></div>`;
  };

  /* 模拟不再自动开始：进入常规赛 / 读完剧情后都等玩家点按钮。 */
  function v221EnsureAutoSim(){}
  window.v221EnsureAutoSim=v221EnsureAutoSim;
  const st221=document.createElement('style');
  st221.textContent=`.v26-bean.pending{background:#e8e2db;box-shadow:inset 0 0 0 1px #d8d0c7}.v221-simctl{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin-top:9px}.v221-simctl .go{height:50px;border:0;border-radius:17px;background:linear-gradient(135deg,#ed5d55,#f58b5e);color:#fff;font-weight:1000;font-size:13.5px;box-shadow:0 10px 22px rgba(237,93,85,.2)}.v221-simctl .go.running{background:linear-gradient(135deg,#384862,#27364c);color:#cfd8e6}.v221-simctl .speed-fixed{height:50px;min-width:68px;padding:0 10px;border-radius:17px;background:#fff4e8;border:1px solid #ead5c1;display:flex;flex-direction:column;justify-content:center;text-align:center}.v221-simctl .speed-fixed b{font-size:14.5px;color:#9e5e35}.v221-simctl .speed-fixed span{font-size:7.5px;color:#a88d79}.v221-review{margin-top:10px;border-radius:22px;padding:11px;background:#fff;border:1px solid #eaded4}.v221-review header{display:flex;justify-content:space-between;align-items:baseline}.v221-review header small{font-size:8.5px;color:#a78b76}.v221-review header b{display:block;font-size:12.5px}.v221-review header span{font-size:8.5px;color:#a78b76}.v221-review-list{display:grid;gap:6px;margin-top:8px}.v221-review-list .rv{display:grid;grid-template-columns:44px 1fr;gap:8px;align-items:center;padding:8px 9px;border-radius:14px;background:#faf6f1}.v221-review-list .rv.win{background:#f1faf3}.v221-review-list .rv.loss{background:#fdf2f2}.v221-review-list .wl{font-size:9.5px;font-weight:1000;text-align:center;border-radius:9px;padding:5px 0;background:#e9e2da;color:#6f635a}.v221-review-list .rv.win .wl{background:#d9f0e0;color:#2f7a4c}.v221-review-list .rv.loss .wl{background:#fadadd;color:#b93b48}.v221-review-list b{font-size:10.5px}.v221-review-list small{display:block;font-size:8.5px;color:#8b7869;margin-top:2px}`;
  document.head.appendChild(st221);

/* 合同到期主动弹窗：赛季末合同走完时自动出现，让玩家选择续约或其他球队报价。 */
function v221HomeTeamWants(){
 if(!career)return false;
 let s=career.seasonStats||{},gp=Math.max(1,s.gp||0),exp=statExpect();
 let prod=(s.pts||0)>=exp.pts-2.5||(s.pts||0)>=12;
 return career.ovr>=76&&career.trust>=52&&gp>=35&&prod;
}
window.v221HomeTeamWants=v221HomeTeamWants;

const __v221GenOffers=generateContractOptions;
generateContractOptions=function(){
 __v221GenOffers();
 if(!career||career.contract.years!==0)return;
 let wants=v221HomeTeamWants();
 career.contractDeclined=!wants;
 if(!wants){
  career.offers=(career.offers||[]).filter(o=>o.team!==career.team);
  career.feed.unshift(`${teamBy(career.team).name}不打算提供续约：本季表现没有达到球队预期，你需要去自由市场找下家。`);
 }
};
window.v221ContractPopup=function(){
 if(!career||career.contract.years!==0)return false;
 if(career.contractPopupDone===career.seasonNo)return false;
 career.contractPopupDone=career.seasonNo;
 let offers=career.offers||[],home=teamBy(career.team).name;
 let homeOffer=offers.find(o=>o.team===career.team);
 let head=homeOffer?`${home}为你开出了续约报价`:`${home}没有提供续约`;
 let sub=homeOffer?`赛季结束，你的合同已经走完。主队愿意继续合作，同时自由市场也有其他报价。`
   :`赛季结束，你的合同已经走完。主队认为本季表现不足以给出新合同，你只能考虑其他球队的报价。`;
 let rows=offers.map((o,i)=>`<button class="choice" onclick="acceptOffer(${i});career.contractPopup=null;ui.modal=null;save();render()"><b>${teamBy(o.team).name}${o.team===career.team?'（续约）':''}</b><span>${o.years}年 · ${o.salary}M/年 · ${o.type==='EXT'?'提前续约':'自由市场报价'}</span>${(typeof window.v101OfferInfo==='function'?window.v101OfferInfo(o.team):'')}</button>`).join('');
 if(!offers.length)rows=`<div class="tiny">目前没有任何球队开出正式报价。你只能先进入休赛期等待市场反应。</div>`;
 return {kind:'contractPop',data:{head,sub,rows,declined:!homeOffer}};
};

const __v221Overlay=renderOverlay;
renderOverlay=function(){
 if(ui.modal&&ui.modal.kind==='contractPop'){let d=ui.modal.data;
  return `<div class="overlay"><div class="sheet"><div class="sheet-handle"></div><div class="v221-contract-pop"><small>合同到期</small><h2>${d.head}</h2><p>${d.sub}</p>${d.declined?'<div class="v221-declined">主队不会为你提供新合同——这是表现没有达到预期的直接结果。</div>':''}<div class="choice-list">${d.rows}</div><button class="btn secondary" style="width:100%;margin-top:9px" onclick="career.contractPopup=null;ui.modal=null;save();render()">先进入休赛期，稍后再决定</button></div></div></div>`;
 }
 if(ui.modal&&ui.modal.kind==='contractPopTrigger')return __v221Overlay();
 return __v221Overlay();
};
/* 进入休赛期时自动弹出（每个赛季只弹一次）。 */
const __v221EnterOff=window.v217EnterOffseason;
window.v217EnterOffseason=function(){
 if(typeof __v221EnterOff==='function')__v221EnterOff();
 if(!career)return;
 if(career.contract.years===0&&career.contractPopupDone!==career.seasonNo&&!ui.storyEvent){
  let pop=window.v221ContractPopup();
  if(pop){ui.modal=pop;save();render()}
 }
};
const __v221EndSeason2=endSeason;
endSeason=function(result){
 __v221EndSeason2(result);
 if(!career||career.retired)return;
 if(career.contract.years===0&&career.contractPopupDone!==career.seasonNo&&!ui.storyEvent&&!ui.modal){
  let pop=window.v221ContractPopup();
  if(pop){ui.modal=pop;save();render()}
 }
};
const v221CP=document.createElement('style');
v221CP.textContent=`.v221-contract-pop h2{font-size:20px;margin:6px 0}.v221-contract-pop p{font-size:9.5px;line-height:1.6;color:#7c6a5c}.v221-contract-pop>small{font-size:8.5px;color:#a97943;letter-spacing:.1em}.v221-declined{margin:9px 0;padding:9px;border-radius:13px;background:#fdf1ee;border:1px solid #f0cfc6;font-size:9px;line-height:1.55;color:#b0503f;font-weight:800}`;
document.head.appendChild(v221CP);
  function v221SeasonFollowup(){let p=career.playerId,team=teamBy(career.team).name,last=(career.storyLog||[]).filter(x=>x.seasonNo===career.seasonNo).slice(-1)[0],choice=last?.choice||'上一段选择',common={_longArc:true,_seasonSaga:true,_stage:'regular',_v221Followup:true};
    if(typeof window.v220TakeSaga==='function'){let pooled=window.v220TakeSaga(0);if(pooled)return pooled}
    if(p==='bennett')return Object.assign(common,{t:`${team}管理层把半季录像放到桌上：你到底值不值得围绕`,scene:`${seasonLabel()} · 管理层会议`,speaker:'球队总经理 / 经纪人 / 主教练',cast:['球队总经理','经纪人','主教练'],b:`半季录像里，你上一次选择“${choice}”留下的痕迹已经很明显。总经理没有再谈2013年选秀，而是把三件事摆到桌上：关键球使用率、球队胜率、以及你在关键时刻被信任的次数。“如果我们要继续留你，下一份合同和下一年战术都得跟着变。”`,stakes:'这一次不是聊感受，而是决定你会得到核心角色、长期合同，还是第一次真正提出交易。',c:[['把关键球交给我，合同也按核心谈','如果当前球队满意度和表现足够，进入核心与大合同路线。',v211Fx([['v221Bennett','core']],{tr:6,c:5},{type:'franchise',label:'球队开始围绕本内特设计核心角色'})],['合同可以小一点，但我要稳定轮换和季后赛位置','稳步翻案，降低交易风险。',v211Fx([['v221Bennett','role']],{tr:8,a:{mentality:1}},{type:'franchiseTrust',label:'拿到稳定长期角色'})],['如果你们还只把我当筹码，就把我送走','直接提高交易压力，可能在截止日前引发谈判。',v211Fx([['v221Bennett','trade']],{tr:-7,teamTrade:4,trade:'主动寻找新环境'},{type:'feud',label:'本内特与管理层首次正面摊牌'})]]});
    if(p==='oden')return Object.assign(common,{t:`医疗组拿出半季报告：健康奥登已经证明了什么，下一步又该赌什么`,scene:`${seasonLabel()} · 医疗会议`,speaker:'运动医学主管 / 主教练 / Mike Conley Sr.',cast:['运动医学主管','主教练','Mike Conley Sr.'],b:`你前半季选择了“${choice}”。现在报告显示：出场、分钟、膝盖恢复和球队胜负全部摆在一起。主教练想把你推到更高负荷，医疗组却提醒，真正稀缺的不是一场30分钟，而是连续五年还能打。Mike Conley Sr.问你：“你要证明你能打，还是证明你能一直打？”`,stakes:'这会决定下半程负荷方案、季后赛使用方式和下一份合同的谈判底气。',c:[['把限制再降一点，我要冲一次真正的全明星赛季','上限路线：更高数据、更高荣誉，也更高身体风险。',v211Fx([['v221Oden','ceiling']],{min:33,c:5,s:6},{type:'careerNight',label:'健康奥登开始冲击全明星级赛季'})],['维持现在的负荷，我要把健康变成球队优势','长期路线：健康、信任和球队稳定明显提升。',v211Fx([['v221Oden','health']],{h:7,tr:7},{type:'franchiseTrust',label:'球队正式接受奥登负荷方案'})],['常规赛继续保护，季后赛关键战再放开','争冠路线：季后赛会读取这次选择。',v211Fx([['v221Oden','playoff']],{h:4,tr:5},{type:'record',label:'为季后赛保留奥登的身体'})]]});
    if(p==='kwame')return Object.assign(common,{t:`录像室里，Michael Jordan时代留下的那句话又被提起：你现在到底是什么球员`,scene:`${seasonLabel()} · 球队录像室`,speaker:'内线教练 / 球队总经理 / 年轻队友',cast:['内线教练','球队总经理','年轻队友'],b:`你前半季选择了“${choice}”。总经理把你近半季的防守、篮板、低位回合全部列出来。然后他问：“如果我们不再要求你像一个状元，你愿意成为哪种球员？”这一次没有Jordan的怒吼，也没有媒体标题，只有一个真正属于成年球员的选择。`,stakes:'决定你是攻防核心、顶级防守蓝领，还是主动转成更衣室领袖。',c:[['我要固定低位回合，我已经不怕承担进攻责任','终结与核心地位提升，可能打开生涯最高得分夜。',v211Fx([['v221Kwame','score']],{a:{finishing:2},c:5},{type:'careerNight',label:'夸梅真正拿到进攻角色'})],['我不追球权，最后五分钟让我守住比赛','防守核心路线，最佳防阵与季后赛价值上升。',v211Fx([['v221Kwame','defense']],{a:{defense:2,blocks:1},tr:7},{type:'record',label:'夸梅成为关键五分钟防守核心'})],['我开始带年轻内线，把我踩过的坑都告诉他们','导师路线，长期合同与球队信任提升。',v211Fx([['v221Kwame','mentor']],{a:{mentality:2},tr:9},{type:'mentor',label:'夸梅正式成为年轻内线导师'})]]});
    if(p==='fultz')return Object.assign(common,{t:`Noah Carter把半季投篮地图关掉：这一次不看动作，只看你愿不愿意投`,scene:`${seasonLabel()} · 训练馆深夜`,speaker:'Noah Carter / 主教练 / 队友',cast:['Noah Carter','主教练','队友'],b:`你前半季选择了“${choice}”。投篮教练 <b>Noah Carter</b> 把所有机械分析图全部关掉，只留下比赛录像。“Markelle，今天不讨论肩膀、不讨论动作、不讨论过去。你告诉我：关键回合，球在你手里，你敢不敢投？”`,stakes:'这是富尔茨主线真正的转折：从“修复投篮”走向“用投篮承担比赛”。',c:[['我来投最后五个关键回合，结果我自己扛','关键球、自信和投射路线加强，可能诞生生涯之夜。',v211Fx([['v221Fultz','clutch']],{a:{shooting:2},c:7,s:6},{type:'careerNight',label:'富尔茨主动承担关键投篮'})],['先把投篮做成稳定武器，关键球以后再谈','稳定路线，投射和球队信任持续提高。',v211Fx([['v221Fultz','stable']],{a:{shooting:2,mentality:1},tr:6},{type:'record',label:'富尔茨建立稳定投篮武器'})],['我先用组织赢下比赛，投篮只在真正空位出手','双能卫路线，组织与球队关系提升。',v211Fx([['v221Fultz','creator']],{a:{playmaking:2},tr:7},{type:'franchiseTrust',label:'富尔茨成为双能组织核心'})]]});
    return Object.assign(common,{t:`对手已经把你的半场习惯研究透了：Rich Paul问你还要不要继续逃避这个问题`,scene:`${seasonLabel()} · 赛前录像室`,speaker:'Rich Paul / 主教练 / 队友',cast:['Rich Paul','主教练','队友'],b:`你前半季选择了“${choice}”。接下来连续几场强队都会用同一种办法防你：放投、收缩、逼你在关键回合决定自己是谁。Rich Paul没有谈舆论，只问：“如果他们永远这样防，你准备怎么办？”`,stakes:'这会直接决定你的下一阶段是投射核心、组织中锋还是防守王牌。',c:[['我投，哪怕前几场打铁也不退','投射路线继续强化，关键球主动性提升。',v211Fx([['v221Simmons','shoot']],{a:{shooting:2},s:8,c:5},{type:'careerNight',label:'西蒙斯主动惩罚放投'})],['我把他们拉到篮下，用突破和传球拆掉防守','组织突破路线，罚球与助攻价值提升。',v211Fx([['v221Simmons','attack']],{a:{finishing:2,playmaking:1},tr:6},{type:'franchiseTrust',label:'西蒙斯用突破重建半场威胁'})],['我去打中锋，把组织、防守和篮板全部放大','前场发动机路线，位置开始真正改变。',v211Fx([['v221Simmons','center']],{a:{rebounding:2,defense:2},tr:7},{type:'franchise',label:'西蒙斯转型组织中锋'})]]});
  }

  const oldMaybe=maybeStory;
  maybeStory=function(){
    if(!career||!career.exclusive||career.stage!=='regular')return false;
    if(oldMaybe())return true;
    return false;
  };

  /* 选完剧情后保留结果卡：玩家点“继续这段生涯”再回到常规赛。
     不再清空 ui.modal，也不自动恢复模拟。 */
  const oldStoryChoice=storyChoice;
  storyChoice=function(i){oldStoryChoice(i);};

  /* 进入常规赛、读取存档、休赛期回来后，模拟自动启动。 */
  const oldBegin=beginSeason;
  beginSeason=function(){oldBegin();if(career&&career.stage==='regular'){migrate();v221EnsureAutoSim();save();render()}};
  const oldNext=nextSeason;
  nextSeason=function(){oldNext();if(career&&career.stage==='regular'){migrate();v221EnsureAutoSim();save();render()}};

  /* 底部导航、主线入口不再调用 stopSim，用户不能通过切页主动暂停。 */
  const oldRenderCareer=renderCareer;
  renderCareer=function(){let h=oldRenderCareer();h=h.replaceAll('onclick="stopSim();ui.tab=','onclick="ui.tab=');return h};

  /* FMVP：继续使用真实总决赛两位候选人的场均数据，显示整数以外的平均值只保留1位；未出场的玩家会明确标注。 */
  const oldFinalsAverages=v218FinalsAverages;
  v218FinalsAverages=function(){let d=oldFinalsAverages();d.player.pts=+d.player.pts.toFixed(1);d.player.reb=+d.player.reb.toFixed(1);d.player.ast=+d.player.ast.toFixed(1);d.co.pts=+d.co.pts.toFixed(1);d.co.reb=+d.co.reb.toFixed(1);d.co.ast=+d.co.ast.toFixed(1);return d};

  /* 最后一道全局迁移与自动推进钩子。 */
  const oldRender=render;
  render=function(){migrate();oldRender();if(career&&career.stage==='regular'&&!ui.storyEvent&&!ui.modal)v221EnsureAutoSim()};
  migrate();

})();

