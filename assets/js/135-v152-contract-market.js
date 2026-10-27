
/* Stable, signable offers. Minimum exceptions never masquerade as cap-space contracts. */
(function(){
'use strict';
const F=v152Finance,D=__v129Debug;
function service(){return Math.max(0,(career?.seasonNo||1)-1);}
function count(r){return r>=95?12:r>=90?10:r>=85?8:r>=80?6:r>=75?4:3;}
function valid(o,m){if(!career||!o||!teams.some(t=>t.abbr===o.team)||!Number.isFinite(o.salary)||o.salary<=0||!Number.isInteger(o.years)||o.years<1||o.years>(o.team===career.team?5:4))return false;
 if(o.salary>F.maximum(service())+.001)return false;
 if(o.exception==='minimum')return o.years===1&&o.salary<=F.minimum()+.001;
 if(o.team===career.team)return true;
 return o.salary<=D.budget(m,o.team)+.001;
}
function generate(m){D.off(m);const limit=count(career.ovr),max=F.maximum(service()),minimum=F.minimum(),rate=Math.max(.01,Math.min(1,Math.pow(Math.max(0,career.ovr-55)/42,2))),ask=F.money(Math.max(minimum,max*rate));
 const candidates=teams.map(t=>{const room=D.budget(m,t.abbr),home=t.abbr===career.team;const position=D.roster(m,t.abbr).filter(p=>!p.self&&p.pos===currentP().pos);const need=position.length?Math.max(0,career.ovr-Math.max(...position.map(p=>p.ovr))):15;return {t,room,home,score:(home?1000:0)+Math.min(room/ask,1)*100+need};}).sort((a,b)=>b.score-a.score||a.t.abbr.localeCompare(b.t.abbr));
 career.offers=candidates.slice(0,limit).map(({t,room,home},i)=>{const desired=F.money(Math.min(max,ask*(1-.025*(i%4)))),affordable=home||room>=minimum;return {team:t.abbr,years:affordable?(home?4:3):1,salary:affordable?F.money(home?desired:Math.min(desired,room)):minimum,type:'FA',exception:home?'renewal':affordable?null:'minimum',v152:true};});
 career.v152Market={version:152,season:career.seasonNo,year:career.seasonYear,rating:career.ovr,count:limit};
 delete career.v152OffersPending;
}
function scaleExtensions(){for(const o of career.offers||[]){if(o.v152)continue;o.salary=F.money(Math.max(F.minimum(),Math.min(F.maximum(service()),F.maximum(service())*Math.pow(Math.max(0,career.ovr-55)/42,2))));o.years=Math.max(1,Math.min(o.team===career.team?5:4,o.years||3));o.v152=true;o.exception=o.team===career.team?'renewal':null;}}
function refresh(m){if(!career||!m)return;
 if(career.contract.years===0){const market=career.v152Market;if(!market||market.season!==career.seasonNo||market.year!==career.seasonYear){generate(m);return;}
  career.offers=(career.offers||[]).filter(o=>valid(o,m));const target=market.count||count(market.rating);if(career.offers.length<target){const used=new Set(career.offers.map(o=>o.team));for(const t of teams){if(used.has(t.abbr))continue;career.offers.push({team:t.abbr,years:1,salary:F.minimum(),type:'FA',exception:'minimum',v152:true});used.add(t.abbr);if(career.offers.length>=target)break;}}
 }else{scaleExtensions();career.offers=(career.offers||[]).filter(o=>valid(o,m));}
}
window.v152OfferValid=valid;window.v152RefreshOffers=refresh;
const oldGenerate=generateContractOptions;generateContractOptions=function(){if(career?.contract.years===0){generate(D.ensure());return;}const r=oldGenerate.apply(this,arguments);refresh(D.ensure());return r;};
const oldRenewal=requestRenewal;requestRenewal=function(){const r=oldRenewal.apply(this,arguments);if(career){refresh(D.ensure());save();render();}return r;};
const oldAccept=acceptOffer;acceptOffer=function(i){const o=career?.offers?.[i],m=D.ensure();refresh(m);if(career?.offers?.[i]!==o||!valid(o,m)){notify('报价已变化，请重新选择可签约合同。');save();render();return false;}const result=oldAccept.apply(this,arguments);if(career.team===o.team&&career.contract.salary===o.salary){career.contract.exception=o.exception||null;career.contract.signedYear=career.seasonYear;D.ensure();save();render();}return result;};
const oldContract=offContract;offContract=function(){const m=D.ensure();refresh(m);const h=oldContract.apply(this,arguments);return '<section class="v152-contract-scale"><small>'+career.seasonYear+' 年自由市场</small><b>工资帽 '+F.cap(career.seasonYear).toFixed(2)+'M</b><span>你的年薪上限 '+F.maximum(service()).toFixed(2)+'M · 每年薪资尺度增长7%</span></section>'+h;};
const oldInfo=window.v101OfferInfo;window.v101OfferInfo=function(team){const o=career?.offers?.find(o=>o.team===team);return (oldInfo?oldInfo.apply(this,arguments):'')+(o?'<div class="v152-offer-rule">'+(o.exception==='minimum'?'底薪例外 · 可超帽签约':o.exception==='renewal'?'本队续约 · 续约例外':'薪资空间签约')+'</div>':'');};
const oldLoad=load;load=function(){const c=oldLoad.apply(this,arguments);if(c&&c.contract?.years===0&&!c.v152Market)c.v152OffersPending=true;return c;};
const oldCreate=createCareer;createCareer=function(){const before=career,r=oldCreate.apply(this,arguments);if(career&&career!==before){career.contract.salary=F.money(Math.max(F.minimum(),Math.min(F.maximum(0),career.contract.salary*F.cap(career.seasonYear)/150)));career.contract.exception='rookie';career.contract.signedYear=career.seasonYear;D.ensure();save();render();}return r;};
const style=document.createElement('style');style.textContent='.v152-contract-scale{padding:15px 17px;margin:12px 0;border:1px solid #e5c9b6;border-radius:17px;background:#fff7ec;color:#974035}.v152-contract-scale small,.v152-contract-scale b,.v152-contract-scale span{display:block}.v152-contract-scale b{font-size:21px;margin:5px 0}.v152-contract-scale span,.v152-offer-rule{font-size:10px;line-height:1.6;color:#a2614a}.v152-offer-rule{margin-top:5px}';document.head.appendChild(style);
window.__v152Contracts={count,refresh,generate,valid};
})();

