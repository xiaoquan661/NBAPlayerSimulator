
/* One saved bracket controls both preview and games; preserve already-played old series. */
(function(){
'use strict';
function lock(){const po=career?.playoff,m=career?.v129,r=po?.rounds?.[po.round],bracket=m?.season?.bracket;if(!r||!bracket)return;if(r.games?.length){bracket[po.round]=r.opp;}else if(bracket[po.round]&&r.opp!==bracket[po.round]){r.opp=bracket[po.round];r.oppName=teamBy(r.opp)?.name||r.opp;}r.v151Locked=true;}
const oldView=playoffView;playoffView=function(){lock();return oldView.apply(this,arguments);};
const oldStart=startPlayoffs;startPlayoffs=function(){const result=oldStart.apply(this,arguments);lock();if(career?.playoff){save();render();}return result;};
window.v151LockOpponent=lock;
})();

