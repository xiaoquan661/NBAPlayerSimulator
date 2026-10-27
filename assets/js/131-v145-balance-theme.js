
/* v145: actual training limits and a shared cream/red popup palette. */
(function(){
'use strict';
// Player training is bounded only by the universal attribute maximum, not a personal OVR ceiling.
window.v145Potential=function(){return 99};
function repairTrainingCredits(c){if(!c||c.v150CreditsMigrated)return;c.v150CreditsMigrated=true;let n=0;for(const [k,v] of Object.entries(c.v145Training||{})){if(Object.hasOwn(c.attrs||{},k)&&Number.isInteger(v)&&v>0&&v<=3)n+=v;}c.v145Training={};if(n){c.devPoints=(Number(c.devPoints)||0)+n;c.feed=c.feed||[];c.feed.unshift('训练修复：返还尚未完成的属性积累 '+n+' 点。');}}
window.v150RepairTrainingCredits=repairTrainingCredits;
const priorLoadTraining=load;load=function(){const c=priorLoadTraining.apply(this,arguments);repairTrainingCredits(c);return c;};
const priorAdd=addPoint;
addPoint=function(k){repairTrainingCredits(career);if(!career||career.devPoints<=0||!Object.hasOwn(career.attrs,k))return;const cap=k==='shooting'&&hasTalent('shot')?103:99;if(career.attrs[k]>=cap){ui.toast='该项能力已满，请选择其他能力';render();return;}return priorAdd.apply(this,arguments);};
const priorTraining=offTrain;offTrain=function(){repairTrainingCredits(career);return '<p class="tiny" style="color:#a15a46;line-height:1.8">训练点真实增加属性，综合评分按实际能力计算，最高99。已满的能力不再消耗点数。</p>'+priorTraining.apply(this,arguments)};
function validOffer(o,m){return window.v152OfferValid?window.v152OfferValid(o,m):o&&Number.isFinite(o.salary)&&o.salary>0&&o.years>0&&(o.team===career.team||o.salary<=__v129Debug.budget(m,o.team))}
function filterOffers(){if(!career)return;const m=__v129Debug.ensure();if(!m)return;if(window.v152RefreshOffers){v152RefreshOffers(m);return;}career.offers=(career.offers||[]).filter(o=>validOffer(o,m));if(career.contract.years===0&&!career.offers.some(o=>o.team===career.team))career.offers.unshift({team:career.team,years:2,salary:Math.max(1,Math.round((career.ovr-70)*2)),type:'FA',exception:'renewal'})}
const priorOffers=generateContractOptions;generateContractOptions=function(){const result=priorOffers.apply(this,arguments);filterOffers();return result};
const priorContractView=offContract;offContract=function(){filterOffers();return priorContractView.apply(this,arguments)};
const priorAccept=acceptOffer;acceptOffer=function(i){const m=__v129Debug.ensure(),offer=career?.offers?.[i];if(!validOffer(offer,m)){filterOffers();notify('该报价超出球队薪资空间，已更新可签约报价');save();render();return false}const renewal=offer.team===career.team;const result=priorAccept.apply(this,arguments);career.contract.exception=offer.exception||(renewal?'renewal':null);return result};
// Legacy season and contract actions may append roster entries after the league hook.
for(const action of ['beginSeason','acceptOffer','nextSeason']){const old=window[action];window[action]=function(){const result=old.apply(this,arguments);if(career){__v129Debug.ensure();save()}return result}}
const css=document.createElement('style');css.textContent=`
.v28-sheet,.v133-dialog.sheet,.v130-dialog,.v135-dialog{background:linear-gradient(145deg,#fffaf2,#fff3e5)!important;color:#633d32!important;border-color:#ead5c2!important}
.v28-stakes,.v28-sheet .v28-stakes,.v133-dialog .v28-stakes,.v130-goat,.v135-status{background:#f9e8d8!important;border:1px solid #e5c7b4!important;color:#693d32!important}
.v28-cast-tags span{background:#f8e4d0!important;color:#9b4939!important}.v28-stakes em{color:#a5543e!important}
.v28-stakes b,.v28-stakes span,.v28-stakes small,.v28-scene-top span,.v130-goat strong,.v130-goat em,.v130-goat span,.v130-goat small,.v130-goat div,.v130-goat p{color:#934339!important}
.v28-scene-top>span,.v130-dialog>header,.v135-dialog header,.v135-talent-copy{background:linear-gradient(120deg,#fff3e5,#f6deca)!important;color:#963b32!important;border-color:#e7c5b1!important}
.v130-dialog header small,.v135-dialog header small,.v28-scene-top small{color:#a5614b!important}
.v130-close,.v135-dialog header button{background:#fff8ef!important;color:#a63c32!important;border-color:#dfb8a6!important}
.v130-primary,.v130-option.is-selected,.v130-choice:hover{background:#a63c32!important;color:#fff8ee!important;border-color:#a63c32!important}
.v130-option.is-selected small,.v130-option.is-selected b{color:#fff8ee!important}
.v135-skill-strip{background:linear-gradient(110deg,#fff7ec,#f9e3d0)!important;color:#923e33!important;border-color:#e3bea6!important}.v135-skill-strip small{color:#a56e56!important}
.v133-dialog .v133-draft-stage{background:radial-gradient(ellipse at top,#edc5a455,transparent 65%),linear-gradient(145deg,#fff7ec,#f9e1cf)!important;color:#833c33!important;border-color:#dab299!important}
.v133-draft-stage p,.v133-draft-stage>small,.v133-pick-number,.v133-draft-chip{color:#9d4a3b!important}.v133-draft-chip{background:#fffaf2!important;border-color:#dcb99f!important}
.v130-overlay,.v135-overlay{background:rgba(59,44,33,.48)!important}
`;document.head.appendChild(css);
})();

