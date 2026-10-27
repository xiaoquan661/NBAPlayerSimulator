
/* One game, one painted state, then the next game. No interval backlog. */
(function(){
'use strict';
let timer=null,frame=null,generation=0,running=false,owner=null,stepping=false;
const previousStop=stopSim;
function cancel(){generation++;running=false;owner=null;if(timer!==null)clearTimeout(timer);if(frame!==null)cancelAnimationFrame(frame);timer=frame=null;previousStop();}
stopSim=cancel;
function allowed(){return career&&career===owner&&!career.retired&&career.stage==='regular'&&ui.screen==='career'&&(!ui.tab||ui.tab==='season')&&!ui.modal&&!ui.storyEvent&&!ui.v130Popup&&!ui.v135Skill&&!document.hidden;}
function schedule(){const token=generation;timer=setTimeout(()=>{timer=null;if(token!==generation||!running)return;if(!allowed()){cancel();return;}stepping=true;try{simulateGame();}catch(e){cancel();ui.toast='模拟已暂停，当前进度已保留，请重试。';render();console.error(e);}finally{stepping=false;}if(token!==generation||!running)return;if(!allowed()){cancel();return;}frame=requestAnimationFrame(()=>{frame=null;if(token!==generation||!running)return;frame=requestAnimationFrame(()=>{frame=null;if(token===generation&&running)schedule();});});},45);}
function start(manual){if(stepping||document.hidden||!career||career.retired||career.stage!=='regular'||ui.screen!=='career'||(ui.tab&&ui.tab!=='season')||ui.modal||ui.storyEvent||ui.v130Popup||ui.v135Skill)return;if(!manual&&career.v31Await)return;if(running&&owner===career)return;cancel();if(manual)career.v31Await=false;if(career.games>=82){finishRegular();return;}owner=career;running=true;ui.sim=true;ui.speed=90;render();if(running)schedule();}
window.v221StartSim=()=>start(false);
window.v31ManualStart=()=>start(true);
toggleSim=()=>{
  if(running||ui.sim){
    if(career)career.v31Await=true;
    cancel();
    render();
    return;
  }
  start(true);
};
changeSpeed=function(){ui.speed=90;render();};
const previousRender=render;render=function(){if(running&&!allowed())cancel();return previousRender.apply(this,arguments);};
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(career)career.v31Await=true;cancel();save();}});
window.__v152Pacing={start,cancel,state:()=>({running,generation,timer,frame})};
})();

