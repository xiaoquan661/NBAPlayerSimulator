
(function(){'use strict';
// All transient toast producers, including legacy direct assignments, share one lifetime.
const state=ui,ttl=1800;
let message=null,timer=null,generation=0,deadline=0,sourceCareer=career;
const initial=state.toast;
function cancel(){generation++;if(timer!==null)clearTimeout(timer);timer=null;}
function expire(){if(message&&Date.now()>=deadline){state.toast=null;return true}return false;}
Object.defineProperty(state,'toast',{configurable:true,enumerable:true,
 get(){return message},
 set(value){
  cancel();message=value==null||value===''?null:String(value);sourceCareer=career;
  if(!message){deadline=0;return}
  deadline=Date.now()+ttl;const ticket=generation;
  timer=setTimeout(()=>{if(ticket!==generation)return;timer=null;state.toast=null;render();},ttl);
 }
});
// The previous notify had a second, text-equality timer that could close a newer identical toast.
notify=function(text){state.toast=text;render();};
const previousRender=render;
render=function(){if(message&&sourceCareer!==career)state.toast=null;expire();return previousRender.apply(this,arguments);};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&expire())render();});
window.addEventListener('pagehide',()=>{state.toast=null;});
if(initial)state.toast=initial;
})();

