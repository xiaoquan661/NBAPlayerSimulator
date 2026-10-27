
/* v140: in-game overwrite confirmation; old progress survives until a new career is saved. */
(function(){
'use strict';
const legacyPick=window.v82SlotPick,legacyRender=render;
let request=0;
function validSlot(n){return Number.isInteger(n)&&n>=1&&n<=3}
function begin(n){if(!validSlot(n)||!playerBy(ui.selected))return false;stopSim();
// Do not delete local/cloud progress while the player is still choosing talents.
if(typeof v106BackupSlot==='function')v106BackupSlot(n);
career=null;if(typeof v81SetSlot==='function')v81SetSlot(n);else{ui.slot=n;window.__v81ClearMirror?.()}
ui.v140Overwrite=null;ui.storyEvent=null;ui.modal=null;ui.v135Skill=false;ui.v130Dialog=null;ui.v133Dialog=null;ui.v82Picker=null;
window.v82GoTalents();return true;}
window.v140CancelOverwrite=function(){request++;ui.v140Overwrite=null;render();};
window.v140ConfirmOverwrite=function(){const d=ui.v140Overwrite;if(!d)return false;request++;return begin(d.slot);};
function ask(n){stopSim();ui.v140Overwrite={slot:n};render();return false;}
window.v82SlotPick=async function(value,mode){const n=Number(value);if(!validSlot(n))return false;
if(mode!=='new'&&mode!=='overwrite'){request++;ui.v140Overwrite=null;return legacyPick.apply(this,arguments)}
const token=++request,selected=ui.selected;if(mode==='overwrite')return ask(n);
const all=typeof v81ReadAllSlots==='function'?v81ReadAllSlots():{};if(all?.[n])return ask(n);
const occupied=typeof v81EnsureSlotLoaded==='function'?await v81EnsureSlotLoaded(n):false;
if(token!==request||ui.v82Picker!=='pickNew'||ui.selected!==selected)return false;
return occupied?ask(n):begin(n);};
function dialog(){const n=ui.v140Overwrite.slot;return '<div class="overlay" id="v140-overwrite"><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="v140-overwrite-title"><div class="sheet-handle"></div><small>存档 '+n+'</small><h2 id="v140-overwrite-title">覆盖这段生涯？</h2><p>新游戏将使用存档 '+n+'。原进度会在新生涯保存后被替换，其他存档不受影响。</p><div class="choice-list"><button class="btn primary" onclick="v140ConfirmOverwrite()">确认覆盖 · 开始新游戏</button><button class="btn secondary" onclick="v140CancelOverwrite()">取消 · 保留原存档</button></div></div></div>';}
render=function(){const rv=legacyRender.apply(this,arguments);if(ui.v140Overwrite)document.getElementById('app')?.insertAdjacentHTML('beforeend',dialog());return rv;};
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&ui.v140Overwrite)v140CancelOverwrite()});
})();

