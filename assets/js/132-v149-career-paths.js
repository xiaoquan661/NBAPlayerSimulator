
/* v149: individual ordinary risks, earned exclusive growth and irreversible aging. */
(function(){
'use strict';
const profiles={
 zion:{decline:29,riskAge:24,risk:.8,drop:5,absence:28,name:'膝部负荷反复'},
 wiggins:{decline:30,riskAge:25,risk:.75,drop:3,absence:8,name:'进攻角色与稳定性瓶颈'},
 risacher:{decline:32,riskAge:25,risk:.4,drop:2,absence:0,name:'自主进攻成长瓶颈'},
 wall:{decline:28,riskAge:28,risk:.85,drop:9,absence:38,name:'跟腱与膝部恢复困难'},
 griffin:{decline:29,riskAge:29,risk:.85,drop:7,absence:25,name:'膝部伤病与爆发力下降'}
};
const isNew=()=>!!career&&!!profiles[career.playerId];
const unlocked=()=>isNew()&&__v135Players.active();
function state(){if(!isNew())return null;return career.v149||(career.v149={version:1,riskResolved:false,setback:0,absencePending:0,lastAge:career.age});}
function readiness(){if(!unlocked())return 0;const s=career.v135,log=s?.story?.log||[],k=s?.skills||{},route=s?.story?.route;let skill=0;
 if(career.playerId==='zion')skill=Math.min(1,(k.zionAwards||0)/4);
 if(career.playerId==='wiggins')skill=Math.min(1,(k.specialties||[]).length/2);
 if(career.playerId==='risacher')skill=Math.min(1,Math.max(0,career.attrs.shooting-76)/12);
 if(career.playerId==='wall')skill=Math.min(1,(k.partnerGames||0)/60);
 if(career.playerId==='griffin')skill=(k.griffinStage||0)/2;
 return Math.min(1,log.length/12*.45+(route ? .15 : 0)+skill*.4);
}
const oldAge=ageCurve;
ageCurve=function(){if(!isNew())return oldAge.apply(this,arguments);const attrs={...career.attrs},s=state(),before=career.age,oldSync=syncOvr;
 // The old shared curve also restores trained attributes and rewrites ceilings; use only its calendar bookkeeping.
 syncOvr=function(){};let result;try{result=oldAge.apply(this,arguments)}finally{syncOvr=oldSync;career.attrs=attrs}
 if(career.age>before){const p=profiles[career.playerId],special=unlocked();
 if(!s.riskResolved&&career.age>=p.riskAge){s.riskResolved=true;const prevention=special?readiness():0,probability=p.risk*(special?Math.max(.12,1-prevention*.85):1);
 if(Math.random()<probability){s.setback=special?Math.max(1,Math.round(p.drop*(1-prevention)*.45)):p.drop;s.absencePending=special?Math.round(p.absence*(1-prevention)*.4):p.absence;
 for(const attr of (['wiggins','risacher'].includes(career.playerId)?['finishing','shooting','playmaking']:['athleticism','durability','finishing','defense']))career.attrs[attr]=Math.max(30,career.attrs[attr]-s.setback);s.penaltyApplied=true;career.feed.unshift('生涯转折：'+p.name+'，相关能力下降 '+s.setback+'，可以通过后续训练恢复；'+(s.absencePending?'医疗组预计缺席 '+s.absencePending+' 场。':'需要重新适应球队角色。'));
 }else career.feed.unshift('生涯转折：你渡过了'+p.name+'的风险期，后续仍需要保持训练与健康。');}
 const start=special?Math.max(32,p.decline+3):p.decline;
 if(career.age>start){const loss=career.age>36?3:2;for(const k of ['athleticism','durability','finishing','defense'])career.attrs[k]=Math.max(30,career.attrs[k]-loss);}
 s.lastAge=career.age;syncOvr();}
 return result;};
function earlyAvailability(){if(!isNew()||unlocked()||career.retired)return;const s=state();if(s.availabilitySeason===career.seasonNo)return;s.availabilitySeason=career.seasonNo;
 let probability=0,min=0,max=0;if(career.playerId==='zion'&&career.age<=24){probability=.7;min=14;max=34;}
 if(career.playerId==='griffin'&&career.seasonNo===1){probability=.85;min=58;max=78;}
 if(probability&&Math.random()<probability){const n=min+Math.floor(Math.random()*(max-min+1));s.absencePending=Math.max(s.absencePending||0,n);career.feed.unshift('医疗评估：早期膝部恢复与负荷管理预计影响 '+n+' 场出场，已记录本季安排。');}}
function pending(){const s=state();if(!s?.absencePending||career.retired||career.injury)return;const n=s.absencePending;s.absencePending=0;career.injury={name:profiles[career.playerId].name,gamesLeft:n,baseGames:n,severity:n>=20?'major':'medium',v149:true};career.health=Math.max(40,career.health-12);career.v135.skills.majorInjury=n>=20||career.v135.skills.majorInjury;career.feed.unshift('医疗安排：'+career.injury.name+'，预计缺席 '+n+' 场。');save();}
for(const name of ['nextSeason','beginSeason']){const old=window[name];window[name]=function(){const result=old.apply(this,arguments);if(isNew()){earlyAvailability();pending();}return result};}
const oldRisk=injuryChance;injuryChance=function(){const value=oldRisk.apply(this,arguments);if(!isNew())return value;const p=profiles[career.playerId],extra=['zion','wall','griffin'].includes(career.playerId)?(career.age>=p.riskAge?.65:.2):.08;return Math.min(5.5,value+extra*(unlocked()?Math.max(.25,1-readiness()):1));};
const oldExpect=statExpect;statExpect=function(){const e=oldExpect.apply(this,arguments);if(!isNew())return e;const p=profiles[career.playerId],start=unlocked()?Math.max(32,p.decline+3):p.decline,years=Math.max(0,career.age-start),volume=Math.max(.55,1-years*.025);for(const k of ['pts','reb','ast'])e[k]*=volume;
 // Strong playmakers and wings retain their identity rather than growing into universal triple-double machines.
 if(career.playerId==='wiggins')e.reb=Math.min(e.reb,6.5*volume*(career.minutes/34));
 if(career.playerId==='wall'){e.reb=Math.min(e.reb,4.8*volume*(career.minutes/34));e.ast=Math.min(e.ast,11.5*volume);}
 return e;};
const oldTrainingView=offTrain;offTrain=function(){let h=oldTrainingView.apply(this,arguments);if(!isNew())return h;const p=profiles[career.playerId];return '<p class="tiny" style="color:#a15a46;line-height:1.8">'+(unlocked()?'专属生涯：培养与主线进度可降低关键风险。':'普通生涯：赛季自然成长点较少，广告加点仍可突破原有水平。')+' 加点可继续提高能力，'+(unlocked()?Math.max(32,p.decline+3):p.decline)+' 岁后开始自然衰退。</p>'+h;};
const oldMission=seasonMission;seasonMission=function(){const m=oldMission.apply(this,arguments);if(!isNew())return m;m.d=unlocked()?'专属培养与剧情路线降低个人风险，晚年仍会正常衰退。':'普通生涯保留个人成长瓶颈与伤病风险，训练和选择仍有机会改变走向。';return m;};
const oldEnd=endSeason;endSeason=function(){const no=career?.seasonNo,history=career?.history?.length||0,result=oldEnd.apply(this,arguments);if(!career||career.playerId==='custom'||(career.exclusive===true&&hasTalent(currentP().exclusive.fx))||career.retired||(career.history?.length||0)<=history)return result;const st=career.v150Points||(career.v150Points={});if(st.pointsSeason===no)return result;st.pointsSeason=no;
 const base=career.age>=35?3:career.age>=31?5:8,natural=career.age>=35?1:career.age>=28?2:3;
 career.devPoints=Math.max(0,career.devPoints-Math.max(0,base-natural));st.naturalPoints=natural;career.feed.unshift('普通生涯：本季基础成长点 '+natural+'，荣誉与其他奖励保留；广告训练点正常生效。');save();render();return result;};
window.__v149Paths={profiles,state,readiness,pending};
if(isNew()){state();syncOvr();}
})();

