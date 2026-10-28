
(function(){
/* 兼容天赋 id / fx，修复“大心脏”等天赋选了却不生效的问题 */
hasTalent=function(id){if(!career?.talents)return false;if(career.talents.includes(id))return true;return career.talents.some(tid=>{let t=talents.find(x=>x.id===tid);return t?.fx===id})};
const __v25AddPoint2=addPoint;
addPoint=function(k){if(!career||career.devPoints<=0)return;let old=career.attrs[k];__v25AddPoint2(k);if(hasTalent('def')&&k==='defense'&&career.attrs[k]-old<2){career.attrs.defense=clamp(career.attrs.defense+1,30,99);career.talentProcs.def=(career.talentProcs.def||0)+1;career.feed.unshift('天赋【防守直觉】触发：防守加点额外+1。');syncOvr();ui.toast='防守直觉触发 · 防守额外+1';save();render()}};
const __v25StoryChoice2=storyChoice;
storyChoice=function(i){let before=career?.confidence;__v25StoryChoice2(i);if(career&&hasTalent('pressure')&&before!=null&&career.confidence<before){let lost=before-career.confidence,refund=Math.ceil(lost/2);career.confidence=clamp(career.confidence+refund);career.talentProcs.pressure=(career.talentProcs.pressure||0)+1;career.feed.unshift(`天赋【抗压者】触发：返还${refund}点自信损失。`);save();render()}};
const __v25MgmtRisk=managementTradeRisk;
managementTradeRisk=function(){let r=__v25MgmtRisk();if(hasTalent('leader'))r-=6;return clamp(r,1,88)};
const __v25Trigger2=triggerInjury;
triggerInjury=function(){__v25Trigger2();if(career?.injury&&hasTalent('lucky')&&!career.luckyUsedThisSeason&&career.injury.severity==='major'){career.luckyUsedThisSeason=true;if(Math.random()<.65){career.injury.severity='medium';career.injury.gamesLeft=Math.max(5,Math.ceil(career.injury.gamesLeft*.38));career.health=clamp(career.health+7);career.talentProcs.lucky=(career.talentProcs.lucky||0)+1;career.feed.unshift(`传奇天赋【幸运儿】改写了重大伤病：伤势被降级，预计仅缺席${career.injury.gamesLeft}场。`);ui.modal=null;ui.toast='幸运儿触发 · 重大伤病被改写';save();render()}}};
const __v25Next2=nextSeason;
nextSeason=function(){__v25Next2();if(career){career.luckyUsedThisSeason=false;if(hasTalent('leader')){career.trust=clamp(career.trust+2);career.gmSatisfaction=clamp((career.gmSatisfaction||50)+3);career.feed.unshift('天赋【更衣室领袖】生效：新赛季球队关系更加稳定。')}save();render()}};
/* 单场比赛全部整数展示：全明星也不再出现 18.7 分这种数据 */
playAllStar=function(){if(!career.allStar||career.allStarLine)return;let e=statExpect();career.allStarLine={pts:Math.round(Math.max(4,e.pts*.7+rnd(2,12))),reb:Math.round(Math.max(1,e.reb*.65+rnd(0,4))),ast:Math.round(Math.max(1,e.ast*.7+rnd(0,5)))};career.feed.unshift(`全明星正赛：你得到${career.allStarLine.pts}分 ${career.allStarLine.reb}板 ${career.allStarLine.ast}助。`);if(window.v25RecordAchievement)window.v25RecordAchievement('全明星正赛登场',`${career.allStarLine.pts}分 ${career.allStarLine.reb}板 ${career.allStarLine.ast}助。`,'award',`ASgame-${career.seasonNo}`);save();render()};
allStarView=function(){let yes=career.allStar,l=career.allStarLine;return `${seasonHero()}<section class="stage-card" style="margin-top:10px">${asset('【素材位：全明星周末主视觉】','用途：全明星球馆、灯光、星形舞台；不出现具体球员文字','banner')}<div class="stage-copy"><div class="big-icon">★</div><span class="result-label">${yes?'正式入选全明星':'本季未入选'}</span><h2>${yes?'你的名字出现在全明星名单里':'名单公布，没有你的名字'}</h2><p>${yes?'这项成就会直接写入生涯分歧树、荣誉墙和完整数据库。':'落选不会结束赛季，后半程表现仍会影响最佳阵容、MVP讨论和球队地位。'}</p>${yes&&l?`<div class="allstar-line"><div><b>${Math.round(l.pts)}</b><span>PTS</span></div><div><b>${Math.round(l.reb)}</b><span>REB</span></div><div><b>${Math.round(l.ast)}</b><span>AST</span></div></div>`:''}${yes&&!l?`<button class="btn gold" style="width:100%;margin-top:12px" onclick="playAllStar()">出战全明星正赛 ★</button>`:`<button class="btn primary" style="width:100%;margin-top:12px" onclick="resumeAllStar()">我看完了 · 继续后半程 →</button>`}</div></section>`};
/* 奖项排名给出明确名次，不再用模糊区间；低产量直接不进入讨论 */
mvpRankStatus=function(score,candidate){if(!candidate)return'未进入前15讨论';if(score>=103)return'最终排名 第1';if(score>=98)return`最终排名 第${rnd(2,3)}`;if(score>=93)return`最终排名 第${rnd(4,5)}`;if(score>=88)return`最终排名 第${rnd(6,8)}`;if(score>=82)return`最终排名 第${rnd(9,12)}`;return`最终排名 第${rnd(13,15)}`};
/* 主线故事结果面板增加“剧情回响”提示 */
const __v25Overlay2=renderOverlay;
renderOverlay=function(){let base=__v25Overlay2();if(ui.modal?.kind==='storyOutcome'&&career?.exclusive){return base.replace('继续这条世界线 →','结果已写入属性 / 关系 / 后续剧情 · 继续 →')}return base};
if(career){save();render()}
})();
