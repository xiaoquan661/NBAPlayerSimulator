
/* 生涯阶段、赛季承诺、比赛选择与跨赛季关系。所有状态随 career 保存。 */
(function(){
'use strict';
if(window.__v128CareerArcs)return;window.__v128CareerArcs=true;
function cap(n){return Math.max(0,Math.min(100,Number(n)||0))}
function name(abbr){try{return (teamBy(abbr)||{}).name||abbr}catch(e){return abbr||'对手'}}
function phase(c){return c.age>=31?'veteran':(c.age<=24&&c.seasonNo<=4?'young':'prime')}
var phases={young:['争取自己的位置','从兑现天赋到站稳角色，每个承诺都会影响球队信任。'],prime:['决定怎样赢球','数据、争冠与团队角色之间，需要做出取舍。'],veteran:['为生涯下一章而战','调整打法、保住身体，或者为最后一座奖杯冒险。']};
var plans={attack:{title:'承担进攻',desc:'预期得分 +8%，助攻 -8%，伤病概率 ×1.12。',pts:1.08,ast:.92,risk:1.12},team:{title:'组织与团队',desc:'预期得分 -6%，助攻 +16%，伤病概率 ×0.95。',pts:.94,ast:1.16,risk:.95},care:{title:'控制消耗',desc:'预期得分 -8%，篮板 -5%，伤病概率 ×0.8；每8场恢复1点健康。',pts:.92,reb:.95,risk:.8},mentor:{title:'转型场上导师',desc:'预期得分 -10%，助攻 +20%，伤病概率 ×0.9。',pts:.90,ast:1.20,risk:.9}};
function canChoose(){return ['preseason','regular','allstar','awards','postgate','playin','playoffs'].indexOf(career.stage)>=0}
function log(m,text){m.chronicle.unshift({year:career.seasonYear,text:text});m.chronicle=m.chronicle.slice(0,40);career.feed=career.feed||[];career.feed.unshift(text)}
function relation(m,abbr,won,season){
  if(!abbr||abbr===career.team)return;
  var r=m.rivals.find(function(x){return x.team===abbr});
  if(!r){r={team:abbr,wins:0,losses:0,lastSeason:0};m.rivals.push(r)}
  if(won)r.wins++;else r.losses++;
  r.lastSeason=season;
  m.rivals.sort(function(a,b){return b.lastSeason-a.lastSeason});m.rivals=m.rivals.slice(0,8);
}
function goals(m,s){
  var out=[],gp=Math.max(20,Math.min(55,82-s.startGames));
  function add(id,title,desc,target){out.push({id:id,title:title,desc:desc,target:target})}
  if(s.phase==='young'){
    add('role','把角色坐稳','出战至少'+gp+'场，赛季结束时球队信任达到65。',gp);
    add('breakout',career.playerId==='custom'?'打出名堂':'兑现天赋','出战至少'+gp+'场，赛季场均得分达到'+s.scoreTarget+'。',s.scoreTarget);
  }else if(s.phase==='prime'){
    add('contend','把球队带得更远','至少赢下一轮季后赛系列赛。',1);
    add('title','冲击总冠军','赢得本赛季NBA总冠军；失败会失去更多球队信任。',1);
  }else{
    add('longevity','把下一年留在球场','出战至少'+gp+'场，赛季结束健康达到65。',gp);
    add('mentor','做球队的场上导师','出战至少'+gp+'场，球队信任达到75。',gp);
    add('title','最后一次冲冠','赢得本赛季NBA总冠军；失败会失去更多球队信任。',1);
  }
  add('creator','让队友参与进来','出战至少'+gp+'场，场均助攻达到'+s.assistTarget+'。',s.assistTarget);
  var r=m.rivals.find(function(x){return x.team!==career.team&&x.losses>x.wins});
  if(!r)r=m.rivals.find(function(x){return x.team!==career.team});
  if(r)add('revenge','再遇'+name(r.team),'常规赛击败这支宿敌2次，或季后赛淘汰它。',r.team);
  if(m.formerTeam&&m.formerTeam!==career.team)add('former','向老东家证明自己','常规赛击败'+name(m.formerTeam)+'2次，或季后赛淘汰它。',m.formerTeam);
  return out;
}
function ensure(){
  if(typeof career==='undefined'||!career)return null;
  var c=career,m=c.v128;
  if(!m||typeof m!=='object'){
    m=c.v128={version:1,rivals:[],formerTeam:null,lastTeam:c.team,chronicle:[],history:[],reputation:0,seenSeries:{}};
    (c.playoffHistory||[]).slice(-24).forEach(function(h){relation(m,h.opp,!!h.won,parseInt(h.season,10)||0)});
  }
  if(m.lastTeam&&m.lastTeam!==c.team){m.formerTeam=m.lastTeam;log(m,'你离开了'+name(m.lastTeam)+'，与老东家的下一次碰面有了新的意义。');m.lastTeam=c.team}
  if(!m.season||m.season.no!==c.seasonNo){
    var prev=m.season;
    if(prev&&!prev.settled)settle(m,prev);
    var previous=(c.history&&c.history[c.history.length-1]||{}).stats||{};
    var base={pts:Number(c.seasonStats&&c.seasonStats.pts)||Number(previous.pts)||Math.max(8,(Number(c.ovr)-50)*.45),ast:Number(c.seasonStats&&c.seasonStats.ast)||Number(previous.ast)||2};
    var s=m.season={no:c.seasonNo,year:c.seasonYear,phase:phase(c),startTeam:c.team,startGames:Number(c.games)||0,scoreTarget:Math.round(Math.max(12,base.pts+1)),assistTarget:+(base.ast+.6).toFixed(1),goal:null,plan:null,regularWins:{},seriesWins:{},decisions:[],beats:[],pending:null,burst:null,settled:false};
    s.options=goals(m,s);
    var last=m.history[0];
    s.intro=last?(last.success?'上季你兑现了「'+last.goal+'」，管理层现在期待你走得更远。':'上季「'+last.goal+'」没有兑现。你要继续证明自己，还是调整方向？'):'这一年，先给自己的生涯一个值得追逐的目标。';
    if(prev&&prev.phase!==s.phase)log(m,'生涯进入「'+phases[s.phase][0]+'」阶段。以前的打法未必适合现在的你。');
  }
  /* 自建球员不是状元，旧的“兑现天赋”目标文案要随存档一起改掉。 */
  if(c.playerId==='custom'){
    if(Array.isArray(m.season.options))m.season.options.forEach(function(g){if(g&&g.id==='breakout'&&g.title==='兑现天赋')g.title='打出名堂'});
    if(m.season.goal&&m.season.goal.id==='breakout'&&m.season.goal.title==='兑现天赋')m.season.goal.title='打出名堂';
  }
  // Removed generic locker-room choices: retire pending/burst state from older saves.
  if(m.season.pending){m.season.pending=null;c.v31Await=false}
  m.season.burst=null;
  if(ui.v130Popup==='decision')ui.v130Popup=null;
  return m;
}
function stats(s){
  var h=(career.history||[]).find(function(x){return x.season===String(s.year)+'-'+String((s.year+1)%100).padStart(2,'0')});
  return h&&h.stats||career.seasonStats||{};
}
function achieved(s){
  if(!s.goal)return false;
  var g=s.goal,st=stats(s),gp=Number(st.gp)||0;
  if(g.id==='role')return gp>=g.target&&career.trust>=65;
  if(g.id==='breakout')return gp>=Math.max(20,Math.min(55,82-s.startGames))&&Number(st.pts)>=g.target;
  if(g.id==='creator')return gp>=Math.max(20,Math.min(55,82-s.startGames))&&Number(st.ast)>=g.target;
  if(g.id==='longevity')return gp>=g.target&&career.health>=65;
  if(g.id==='mentor')return gp>=g.target&&career.trust>=75;
  if(g.id==='revenge'||g.id==='former')return (s.regularWins[g.target]||0)>=2||!!s.seriesWins[g.target];
  if(g.id==='contend')return Object.keys(s.seriesWins).length>0;
  if(g.id==='title')return !!(career.playoff&&career.playoff.champion)||!!((career.history||[]).find(function(h){return h.season===String(s.year)+'-'+String((s.year+1)%100).padStart(2,'0')&&/总冠军/.test(h.result||'')}));
  return false;
}
function settle(m,s){
  if(s.settled||!s.goal)return;
  s.settled=true;s.success=achieved(s);
  var delta=s.success?5:(s.goal.id==='title'?-5:-2);
  career.trust=cap(career.trust+delta);career.confidence=cap(career.confidence+(s.success?3:-2));
  if(s.success){career.devPoints=(Number(career.devPoints)||0)+1;m.reputation++}
  var text='赛季目标「'+s.goal.title+'」'+(s.success?'完成：球队信任 +5，自信 +3，专精点 +1。':'未完成：球队信任 '+delta+'，自信 -2。');
  log(m,text);
  m.history.unshift({year:s.year,phase:s.phase,goal:s.goal.title,plan:s.plan,success:s.success,decisions:s.decisions.slice()});m.history=m.history.slice(0,25);
}
function readSeries(m,s){
  var po=career.playoff;
  (po&&po.rounds||[]).forEach(function(r,i){
    if((r.w||0)<4&&(r.l||0)<4)return;
    var key=s.no+':'+i+':'+r.opp;
    if(m.seenSeries[key])return;m.seenSeries[key]=true;
    var won=r.w>=4;
    if(won)s.seriesWins[r.opp]=true;
    relation(m,r.opp,won,s.year);
    log(m,(won?'你淘汰了':'你被淘汰于')+name(r.opp)+'，系列赛 '+r.w+'-'+r.l+'。这段交锋会留到下一季。');
  });
  var keys=Object.keys(m.seenSeries);if(keys.length>100)keys.slice(0,keys.length-100).forEach(function(k){delete m.seenSeries[k]});
}
function commit(){if(typeof save==='function')save();if(typeof render==='function')render()}
window.v128Choose=function(goal,plan){
  var m=ensure();if(!m)return false;var s=m.season;
  if(s.goal||s.settled||career.retired||!canChoose())return false;
  var g=s.options.find(function(x){return x.id===goal});
  if(!g||!plans[plan]||(plan==='mentor'&&s.phase!=='veteran'))return false;
  s.goal=g;s.plan=plan;log(m,'本季目标：'+g.title+'。你选择以「'+plans[plan].title+'」的方式迎接这一年。');commit();return true;
};
/* 赛季目标锁定后，打法策略可以在赛季中随时调整，下一场生效。 */
window.v128ChangePlan=function(plan,skipRender){
  var m=ensure();if(!m)return false;var s=m.season;
  if(!s.goal||s.settled||career.retired||!canChoose())return false;
  if(!plans[plan]||(plan==='mentor'&&s.phase!=='veteran'))return false;
  if(s.plan===plan)return true;
  var old=s.plan;
  s.plan=plan;
  log(m,'打法调整：从「'+(plans[old]?plans[old].title:'未定')+'」切换为「'+plans[plan].title+'」，下一场生效。');
  /* 弹窗内切换只落盘，不整页重绘，避免闪屏。 */
  if(skipRender){if(typeof save==='function')save();}else commit();
  return true;
};
function decision(s){}
window.v128Decide=function(){return false};
function blocked(){ui.v130Dismiss=null;var m=ensure();if(!m||career.retired)return false;var s=m.season;if(!s.goal||s.pending){career.v31Await=true;if(typeof stopSim==='function')stopSim();if(typeof notify==='function')notify(!s.goal?'先选择本赛季目标与打法，再开始比赛。':'先完成赛季中的关键决定，再继续比赛。');return true}return false}
function panel(){return ''}
var oldView=seasonView;seasonView=function(){return oldView.apply(this,arguments)};
var oldStory=storyView;storyView=function(){var h=oldStory.apply(this,arguments),m=ensure();return h+(m?'<section class="v128-panel"><h3>你选择过的那些赛季</h3>'+m.chronicle.slice(0,12).map(function(x){return '<p><b>'+x.year+'年</b> · '+esc(x.text)+'</p>'}).join('')+'</section>':'')};
var oldExpect=statExpect;statExpect=function(){var e=oldExpect.apply(this,arguments),m=ensure();if(!m)return e;var s=m.season,p=plans[s.plan],b=s.burst&&s.burst.left>0?s.burst:null;e=Object.assign({},e);if(p){e.pts*=p.pts||1;e.ast*=p.ast||1;e.reb*=p.reb||1}if(b){e.pts*=b.pts;e.ast*=b.ast}return e};
var oldRisk=injuryChance;injuryChance=function(){var n=oldRisk.apply(this,arguments),m=ensure();if(!m)return n;var s=m.season,p=plans[s.plan],b=s.burst&&s.burst.left>0?s.burst:null;return Math.max(.05,n*(p?p.risk:1)*(b?b.risk:1))};
var oldSim=simulateGame;simulateGame=function(){
  if(!career||career.stage!=='regular')return oldSim.apply(this,arguments);
  if(blocked())return;var c=career,m=ensure(),s=m.season,before=career.games;
  var rv=oldSim.apply(this,arguments);
  if(career===c&&career.games>before){
    var g=career.gameLog&&career.gameLog[0];if(g&&g.win&&g.opp)s.regularWins[g.opp]=(s.regularWins[g.opp]||0)+1;
    if(s.burst&&s.burst.left>0)s.burst.left--;
    if(s.plan==='care'&&career.games%8===0)career.health=cap(career.health+1);
    if(career.stage==='regular')decision(s);
    if(typeof save==='function')save();if(typeof render==='function')render();
  }
  return rv;
};
function poGames(){return (career&&career.playoff&&career.playoff.rounds||[]).reduce(function(n,r){return n+(r.games||[]).length},0)}
var oldPo=playoffGame;playoffGame=function(){if(blocked())return;var m=ensure(),s=m&&m.season,before=poGames();var rv=oldPo.apply(this,arguments);if(m&&s){if(poGames()>before&&s.burst&&s.burst.left>0)s.burst.left--;readSeries(m,s);if(typeof save==='function')save();if(typeof render==='function')render()}return rv};
var oldToggle=toggleSim;toggleSim=function(){if(!ui.sim&&career&&career.stage==='regular'&&blocked())return;return oldToggle.apply(this,arguments)};
if(typeof window.v31ManualStart==='function'){var manual=window.v31ManualStart;window.v31ManualStart=function(){if(blocked())return;return manual.apply(this,arguments)}}
if(typeof window.v221StartSim==='function'){var auto=window.v221StartSim;window.v221StartSim=function(){var m=ensure();if(m&&(!m.season.goal||m.season.pending))return;return auto.apply(this,arguments)}}
var oldSave=save;save=function(){var m=ensure();if(m){readSeries(m,m.season);if(['seasonrecap','offseason'].indexOf(career.stage)>=0)settle(m,m.season)}return oldSave.apply(this,arguments)};
var oldEnd=endSeason;endSeason=function(){var m=ensure();if(m)readSeries(m,m.season);return oldEnd.apply(this,arguments)};
window.__v128Debug={ensure:ensure,goals:goals,achieved:achieved,phase:phase,plans:plans};
try{
  var style=document.createElement('style');style.textContent='.v128-panel{margin:0 0 16px;padding:18px;border:1px solid #dcc9ad;border-radius:18px;background:linear-gradient(135deg,#fff8ed,#f4eadb);color:#342a21}.v128-panel small{color:#92724d}.v128-panel h3{margin:5px 0 9px;font-size:21px}.v128-panel p{font-size:13px;line-height:1.65;margin:8px 0}.v128-panel label{display:block;margin:12px 0;font-size:13px;font-weight:700}.v128-panel select{display:block;width:100%;max-width:100%;padding:12px;margin-top:6px;border-radius:10px;border:1px solid #cdb798;background:#fff;color:#342a21;font-size:13px}.v128-panel .btn{width:100%;margin-top:8px}.v128-goal,.v128-rivals,.v128-decision{padding:12px;margin-top:12px;border-radius:12px;background:#ffffffb8}.v128-goal span{font-size:12px;color:#8e6034}.v128-decision button{display:block;width:100%;padding:12px;text-align:left;white-space:normal;line-height:1.5;border:1px solid #cfb28c;border-radius:10px;background:#fff9ef;color:#493322;margin-top:8px;font-size:13px}.v128-decision h4{margin:0}';document.head.appendChild(style);
}catch(e){}
})();

