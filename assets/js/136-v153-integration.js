
(function(){'use strict';
let creating=false;
function migrate(){if(creating||!career?.v32League?.players||career.v153Roster===153)return false;const d=V153_ROSTERS[career.playerId],m=career.v129;if(!d||career.seasonNo!==1||career.games!==0||career.draftYear!==d.year||career.team!==d.team||(career.history||[]).length||(career.careerTotals?.games||0)>0||(m?.transactions||[]).length||m?.off||['offseason','seasonrecap','playoffs'].includes(career.stage))return false;
career.v32League.players=v153OpeningLeague(career.v32League.players,career);if(m){m.players=career.v32League.players;__v129Debug.normalize(m);__v129Debug.fillRosters(m);}return true;}
const oldCreate=createCareer;createCareer=function(){const before=career;creating=true;let rv;try{rv=oldCreate.apply(this,arguments)}finally{creating=false}if(career&&career!==before&&career.v32League&&V153_ROSTERS[career.playerId]){const m=__v129Debug.ensure();m.players=v153OpeningLeague(m.players,career);career.v32League.players=m.players;career.v153Roster=153;__v129Debug.normalize(m);__v129Debug.fillRosters(m);teams.forEach(t=>t.power=__v129Debug.power(m,t.abbr));save();render();}return rv;};
const oldRender=render;render=function(){if(migrate())save();return oldRender.apply(this,arguments)};
const oldTalents=renderTalents;renderTalents=function(){let html=oldTalents.apply(this,arguments);if(!playerBy(ui.selected)?.v135)return html;if(ui.exclusive)html=html.replace(/(<button[^>]*onclick="v63UnlockExclusiveAndAll\(\)"[^>]*>)[\s\S]*?(<\/button>)/,'$1✓ 已获得 · 专属天赋加持中$2');if(ui.allTalents)html=html.replace(/(<button[^>]*onclick="takeAllTalents\(\)"[^>]*>)[\s\S]*?(<\/button>)/,'$1✓ 已全部获得$2');return html;};
window.__v153={migrate};if(career&&migrate())save();
})();


