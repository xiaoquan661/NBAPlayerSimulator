
(function(){
function v218StarImpact(){
 if(!career)return 0;
 const role=Math.max(.45,Math.min(1.08,(career.minutes||24)/34));
 const health=Math.max(.65,Math.min(1,(career.health||75)/100));
 return Math.max(0,Math.min(10.5,(career.ovr-82)*.62*role*health));
}
function v218ExpectedWins(){
 if(!career)return 41;
 const t=teamBy(career.team),star=Math.max(0,career.ovr-80);
 return clamp(Math.round(34+(t.power-82)*1.25+star*1.25+(career.trust-60)*.06),20,66);
}
const __v218ProjectedWins=projectedWins;
projectedWins=function(t){
 if(!career||t.abbr!==career.team)return __v218ProjectedWins(t);
 const expected=v218ExpectedWins();
 if(career.games<=0)return expected;
 const actual=career.wins/Math.max(1,career.games)*82;
 const weight=Math.min(.82,career.games/100);
 return clamp(Math.round(expected*(1-weight)+actual*weight),18,68);
};

/* Superstar impact is applied to the team before every regular-season game. */
const __v218Sim=simulateGame;
simulateGame=function(){
 if(!career||career.stage!=='regular')return __v218Sim();
 const mine=teamBy(career.team),base=mine.power,boost=v218StarImpact();
 mine.power=base+boost;
 try{return __v218Sim()}finally{mine.power=base}
};

function v218MvpScore(){
 if(!career)return 0;
 const s=career.seasonStats||{},g=Math.max(1,career.games||1),wp=(career.wins||0)/g;
 return (s.pts||0)*2.3+(s.reb||0)*1.0+(s.ast||0)*1.25+((s.stl||0)+(s.blk||0))*2.0+wp*35+Math.max(0,career.ovr-80)*1.1+Math.min(4,(s.gp||0)/15);
}
function v218MvpBoard(){
 if(!career)return'';
 const gp=career.seasonStats?.gp||0;
 if(gp<5)return `<section class="v218-mvp"><header><div><small>MVP RACE</small><h3>实时MVP榜</h3></div><b>样本不足</b></header><p>打满5场后开始更新。数据、球队战绩、出勤和个人影响力都会实时改变排名。</p></section>`;
 const pool=(typeof v29EraPool==='function'?v29EraPool(career.seasonYear||career.draftYear,'MVP'):['联盟核心A','联盟核心B','联盟核心C','联盟核心D','联盟核心E','联盟核心F','联盟核心G','联盟核心H']).slice(0,8);
 const base=[130,126,122,118,114,110,106,102];
 let cand=pool.map((name,i)=>({name,score:base[i]+((Math.abs(stableHash(`${career.seasonYear}-${name}-${Math.floor(career.games/8)}`))%7)-3)}));
 cand.push({name:currentP().zh,score:v218MvpScore(),me:true});
 cand.sort((a,b)=>b.score-a.score);
 const meRank=cand.findIndex(x=>x.me)+1,top=cand.slice(0,5);
 return `<section class="v218-mvp"><header><div><small>实时更新 · G${career.games}</small><h3>MVP竞争</h3></div><b class="${meRank<=5?'hot':''}">${meRank<=15?`你 #${meRank}`:'未进前15'}</b></header><div class="v218-mvp-list">${top.map((x,i)=>`<div class="${x.me?'me':''}"><span>#${i+1}</span><b>${x.name}</b><em>${Math.round(x.score)}</em></div>`).join('')}</div>${meRank>5&&meRank<=15?`<div class="v218-me-rank"><span>#${meRank}</span><b>${currentP().zh}</b><em>${Math.round(v218MvpScore())}</em></div>`:''}<p>${meRank<=3?'你已经进入最核心的MVP竞争。':meRank<=8?'你正在进入MVP讨论区。':'想往前冲，个人产量和球队胜场都还要继续提高。'}</p></section>`;
}
const __v218Regular=regularView;
regularView=function(){
 let h=__v218Regular();
 const marker='</section><section class="season-command">';
 if(h.includes(marker))h=h.replace(marker,`</section>${v218MvpBoard()}<section class="season-command">`);
 else h=v218MvpBoard()+h;
 return h;
};

function v218SeriesWinProb(opp){
 const mine=teamBy(career.team),active=!career.injury;
 const star=v218StarImpact();
 const player=active?Math.max(-4,(career.ovr-84)*1.45+(career.health-75)*.07+(hasTalent('clutch')?4:0)):-10;
 /* 与 v85PickOpponent 用同一套「本赛季实力」，否则会出现「遇上弱队却按强队算胜率」 */
 const pf=function(t){try{return (typeof v106TeamPower==='function'&&t)?v106TeamPower(t.abbr):(t&&t.power)||80}catch(e){return (t&&t.power)||80}};
 return clamp(50+(pf(mine)+star-pf(opp))*1.35+player,12,88)/100;
}
function v218AutoSeriesGame(r){
 const opp=teamBy(r.opp),active=!career.injury;
 const win=Math.random()<v218SeriesWinProb(opp);
 let sf=rnd(98,124),sa=rnd(98,124);if(win&&sf<=sa)sf=sa+rnd(1,8);if(!win&&sf>=sa)sa=sf+rnd(1,8);
 if(win)r.w++;else r.l++;
 let line=null,played=active;
 if(active){let e=statExpect();line={pts:Math.round(Math.max(2,e.pts+rnd(-5,9)+(hasTalent('clutch')?2:0))),reb:Math.round(Math.max(1,e.reb+rnd(-2,4))),ast:Math.round(Math.max(0,e.ast+rnd(-2,4))),stl:Math.max(0,Math.round((e.stl||1)+rnd(-1,2))),blk:Math.max(0,Math.round((e.blk||1)+rnd(-1,2)))};if(typeof v26DeriveBox==='function')v26DeriveBox(line)}
 else if(career.injury){career.injury.gamesLeft--;if(career.injury.gamesLeft<=0){career.injury=null;career.health=clamp(career.health+5)}}
 r.games.push({win,sf,sa,line,played});
}
simSeries=function(){
 if(!career?.playoff||career.playoff.review||career.stage!=='playoffs')return;
 const po=career.playoff,r=po.rounds[po.round];
 let guard=0;
 while(r.w<4&&r.l<4&&guard++<7)v218AutoSeriesGame(r);
 const won=r.w>=4;
 po.review={won,round:po.round,name:r.name,score:`${r.w}-${r.l}`,championship:won&&po.round===3};
 career.playoffHistory=career.playoffHistory||[];
 career.playoffHistory.push({season:seasonLabel(),round:r.name,score:`${r.w}-${r.l}`,won,opp:r.opp});
 career.feed.unshift(`${r.name}结束：${r.w}-${r.l}${won?'晋级':'出局'}。系列赛已经一次模拟到底。`);
 if(won&&typeof recordAchievement==='function')recordAchievement(`${r.name}晋级`,`系列赛 ${r.w}-${r.l} 淘汰 ${r.oppName}。`,'playoff',`po-${career.seasonNo}-${po.round}`);
 save();render();
};

function v218CoStarName(){
 const y=career.seasonYear||career.draftYear,team=career.team,p=career.playerId;
 if(team==='POR'&&p==='oden')return y<=2010?'Brandon Roy':'LaMarcus Aldridge';
 if(team==='PHI'&&(p==='fultz'||p==='simmons'))return 'Joel Embiid';
 if(team==='CLE'&&p==='bennett')return y>=2014?'LeBron James':'Kyrie Irving';
 if(team==='WAS'&&p==='kwame')return y<=2002?'Michael Jordan':'Gilbert Arenas';
 const names=['马库斯·里德','杰伦·科尔','德文·沃克','诺亚·格兰特','马利克·里弗斯','卡梅隆·诺克斯','杰伦·普莱斯'];
 return names[Math.abs(stableHash(`${team}-${y}-costar`))%names.length];
}
function v218FinalsAverages(){
 const po=career.playoff,r=po?.rounds?.[3]||po?.rounds?.[po?.round];
 const games=r?.games||[],played=games.filter(g=>g.played!==false&&g.line);
 const avg=k=>played.length?played.reduce((a,g)=>a+(g.line?.[k]||0),0)/played.length:0;
 const player={name:currentP().zh,gp:played.length,pts:avg('pts'),reb:avg('reb'),ast:avg('ast')};
 const seed=Math.abs(stableHash(`${career.seasonYear}-${career.team}-finals`));
 const base=teamBy(career.team).power;
 const co={name:v218CoStarName(),gp:games.length,pts:Math.max(16,Math.min(34,22+(base-82)*.38+(seed%8)-2+(career.ovr<86?3:0))),reb:Math.max(4,Math.min(13,5+((seed>>3)%7))),ast:Math.max(3,Math.min(10,3+((seed>>6)%7)))};
 const pScore=(player.gp/Math.max(1,games.length))*8+player.pts*1.25+player.reb*.72+player.ast*.9+Math.max(0,career.ovr-82)*.35;
 const cScore=co.pts*1.25+co.reb*.72+co.ast*.9+Math.max(0,base-82)*.3+7;
 let pv=Math.round(11*pScore/Math.max(1,pScore+cScore));pv=clamp(pv,0,11);if(pv===5.5)pv=6;let cv=11-pv;
 if(pv===cv){pv++;cv--}
 const seq=[],a=pv,b=cv;for(let i=0;i<a;i++)seq.push('p');for(let i=0;i<b;i++)seq.push('c');
 for(let i=seq.length-1;i>0;i--){let j=Math.abs(stableHash(`${career.seasonYear}-${i}-${career.playerId}`))%(i+1);[seq[i],seq[j]]=[seq[j],seq[i]]}
 return {player,co,targetP:pv,targetC:cv,sequence:seq};
}
window.v218FinalsAverages=v218FinalsAverages;
window.startFmvpCeremony=function(){
 if(!career?.playoff?.review?.championship)return;
 const d=v218FinalsAverages();
 career.fmvpCeremony={...d,pVotes:0,cVotes:0,index:0,done:false,winner:null};
 save();render();setTimeout(v218RunVote,450);
};
function v218RunVote(){
 let f=career?.fmvpCeremony;if(!f||f.done)return;
 if(f.index>=f.sequence.length){f.done=true;f.winner=f.pVotes>f.cVotes?'player':'co';save();render();return}
 const who=f.sequence[f.index++];if(who==='p')f.pVotes++;else f.cVotes++;
 const pEl=document.getElementById('fmvp-p-votes'),cEl=document.getElementById('fmvp-c-votes');
 if(pEl)pEl.textContent=f.pVotes;if(cEl)cEl.textContent=f.cVotes;
 const card=document.getElementById(who==='p'?'fmvp-player':'fmvp-costar');if(card){card.classList.remove('bump');void card.offsetWidth;card.classList.add('bump')}
 save();setTimeout(v218RunVote,260);
}
window.finishFmvpCeremony=function(){
 const f=career?.fmvpCeremony;if(!f?.done||career._v218TitleDoneSeason===career.seasonNo)return;
 career._v218TitleDoneSeason=career.seasonNo;
 career.honors['总冠军']=(career.honors['总冠军']||0)+1;
 if(typeof recordAchievement==='function')recordAchievement('NBA总冠军',`${seasonLabel()}，你随${teamBy(career.team).name}夺得总冠军。`,'award',`champ-${career.seasonNo}`,false);
 if(f.winner==='player'){
   career.honors['FMVP']=(career.honors['FMVP']||0)+1;
   if(typeof recordAchievement==='function')recordAchievement('总决赛MVP',`FMVP媒体票 ${f.pVotes}-${f.cVotes}，你力压${f.co.name}当选。`,'award',`fmvp-${career.seasonNo}`,false);
   career.feed.unshift(`总决赛MVP：${currentP().zh}，选票 ${f.pVotes}-${f.cVotes}。`);
 }else{
   career.feed.unshift(`总决赛MVP：${f.co.name}，选票 ${f.cVotes}-${f.pVotes}。你随队夺冠，但FMVP属于队友。`);
 }
 career.playoff.champion=true;career.playoff.review=null;career.fmvpCeremony=null;save();endSeason('NBA总冠军');
};
const __v218Advance=advancePlayoffStage;
advancePlayoffStage=function(){
 const rv=career?.playoff?.review;
 if(rv?.championship&&rv.won){startFmvpCeremony();return}
 return __v218Advance();
};

const __v218Overlay=renderOverlay;
renderOverlay=function(){
 const f=career?.fmvpCeremony;
 if(f){
  const winner=f.done?(f.winner==='player'?currentP().zh:f.co.name):'选票统计中…';
  return `<div class="overlay v218-title-overlay"><div class="v218-confetti">${Array.from({length:24},(_,i)=>`<i style="--i:${i};left:${((i*37+7)%100)}%;animation-delay:${(-(i*0.19)%2.8).toFixed(2)}s"></i>`).join('')}</div><div class="sheet v218-title-sheet"><div class="v218-trophy">🏆</div><small>NBA FINALS · CHAMPIONS</small><h2>${teamBy(career.team).name}<br>夺得总冠军</h2><p class="v218-title-sub">冠军已经属于球队，现在只剩最后一个悬念：谁是这轮总决赛最有价值的球员？</p><div class="v218-vote-title"><b>FMVP媒体选票</b><span>${f.done?`最终结果 · ${winner}`:`已开出 ${f.index}/11 票`}</span></div><div class="v218-vote-grid"><div id="fmvp-player" class="v218-candidate ${f.done&&f.winner==='player'?'winner':''}"><small>你扮演的球员</small><b>${currentP().zh}</b><strong id="fmvp-p-votes">${f.pVotes}</strong><span>${f.player.pts.toFixed(1)}分 · ${f.player.reb.toFixed(1)}板 · ${f.player.ast.toFixed(1)}助${f.player.gp===0?' · 总决赛未出场':''}</span></div><div id="fmvp-costar" class="v218-candidate ${f.done&&f.winner==='co'?'winner':''}"><small>队内另一位最佳球员</small><b>${f.co.name}</b><strong id="fmvp-c-votes">${f.cVotes}</strong><span>${f.co.pts.toFixed(1)}分 · ${f.co.reb.toFixed(1)}板 · ${f.co.ast.toFixed(1)}助</span></div></div>${f.done?`<div class="v218-winner"><small>FINALS MVP</small><b>${winner}</b><span>${f.winner==='player'?`${f.pVotes}-${f.cVotes} · 你拿下FMVP`:`${f.cVotes}-${f.pVotes} · 队友获得FMVP，你获得总冠军`}</span></div><button class="btn primary" style="width:100%;margin-top:12px" onclick="finishFmvpCeremony()">捧起总冠军奖杯 · 进入赛季总结</button>`:`<div class="v218-counting"><i></i><span>选票正在一张一张开出…</span></div>`}</div></div>`;
 }
 return __v218Overlay();
};

const st=document.createElement('style');
st.textContent=`
.v218-mvp{margin:10px 0;background:linear-gradient(145deg,#fffdf8,#fff3df);border:1px solid #ead7bc;border-radius:20px;padding:11px;box-shadow:0 7px 22px rgba(87,56,31,.06)}.v218-mvp header{display:flex;align-items:center;justify-content:space-between}.v218-mvp header small{font-size:7.5px;color:#a77c56}.v218-mvp h3{font-size:15px;margin:2px 0}.v218-mvp header>b{font-size:10.5px;padding:6px 9px;border-radius:999px;background:#eee6dc;color:#7a6a5d}.v218-mvp header>b.hot{background:#ffe3d6;color:#bc4438}.v218-mvp-list{display:grid;gap:5px;margin-top:8px}.v218-mvp-list>div,.v218-me-rank{display:grid;grid-template-columns:30px 1fr 38px;align-items:center;padding:7px 8px;border-radius:12px;background:rgba(255,255,255,.76)}.v218-mvp-list>div.me,.v218-me-rank{background:#fff0e9;outline:1px solid #efc6b8}.v218-mvp-list span,.v218-me-rank span{font-size:9.5px;font-weight:950;color:#a47a5a}.v218-mvp-list b,.v218-me-rank b{font-size:10.5px}.v218-mvp-list em,.v218-me-rank em{font-style:normal;font-size:9.5px;text-align:right;color:#9a6b47}.v218-mvp>p{font-size:8.5px;line-height:1.5;color:#7f6e61;margin:8px 1px 0}
.v218-title-overlay{overflow:hidden}.v218-title-sheet{position:relative;text-align:center;background:linear-gradient(180deg,#fffaf0,#fff);border-top:1px solid #efd9b3}.v218-trophy{font-size:47px;animation:v218Float 1.6s ease-in-out infinite}.v218-title-sheet>small{font-size:8.5px;color:#a07145;letter-spacing:.12em}.v218-title-sheet h2{font-size:25px;margin:5px 0;color:#33261f}.v218-title-sub{font-size:9.5px;color:#7b6a5f;line-height:1.55}.v218-vote-title{display:flex;justify-content:space-between;align-items:center;margin:14px 0 7px}.v218-vote-title b{font-size:11.5px}.v218-vote-title span{font-size:8.5px;color:#9b7d68}.v218-vote-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.v218-candidate{background:#fff;border:1px solid #ead9c8;border-radius:18px;padding:11px 8px;min-height:138px;display:flex;flex-direction:column;align-items:center}.v218-candidate small{font-size:7.5px;color:#9a8270}.v218-candidate>b{font-size:12.5px;margin-top:5px}.v218-candidate strong{font-size:44px;line-height:1;color:#c94e43;margin:10px 0 6px;font-variant-numeric:tabular-nums}.v218-candidate span{font-size:8px;line-height:1.45;color:#806f63}.v218-candidate.bump{animation:v218Bump .22s ease}.v218-candidate.winner{border-color:#e4b752;background:linear-gradient(145deg,#fff8df,#fff);box-shadow:0 0 0 2px rgba(228,183,82,.13)}.v218-winner{margin-top:11px;border-radius:17px;padding:11px;background:linear-gradient(135deg,#3b2b22,#6f4d31);color:white}.v218-winner small{font-size:7.5px;color:#e9c990}.v218-winner b{display:block;font-size:20px;margin:2px}.v218-winner span{font-size:8.5px;color:#f7e6ce}.v218-counting{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:12px;font-size:8.5px;color:#8c7868}.v218-counting i{width:7px;height:7px;border-radius:50%;background:#c94e43;animation:v218Pulse .65s infinite}.v218-confetti{position:absolute;inset:0;pointer-events:none;overflow:hidden}.v218-confetti i{position:absolute;top:-12px;width:6px;height:11px;border-radius:2px;background:hsl(calc(var(--i)*31),72%,58%);animation:v218Fall 2.8s linear infinite;opacity:.72}@keyframes v218Fall{to{transform:translateY(105vh) rotate(540deg)}}@keyframes v218Float{50%{transform:translateY(-5px) rotate(-2deg)}}@keyframes v218Bump{50%{transform:scale(1.05);box-shadow:0 0 0 3px rgba(201,78,67,.12)}}@keyframes v218Pulse{50%{transform:scale(1.7);opacity:.45}}
`;
document.head.appendChild(st);
if(career){save();render()}
})();
