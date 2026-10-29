
(function(){
'use strict';
if(window.__v167SaveUI)return;window.__v167SaveUI=true;
let saving=false,loading=false;
const api=window.__v166CloudSave;
function key(n){return n===1?'career_save':'career_save_slot'+n}
function slot(){return Number(career?.__slot||ui.slot)||1}
function escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function saveButton(){const busy=!!saving;return '<button class="v170-save-button" onclick="v167SaveNow()" '+(busy?'disabled':'')+' title="本机自动保存；点击同步云端">'+(busy?'正在保存…':'保存存档')+'</button>';}
function setSaveStatus(text,kind){
  try{
    var el=document.getElementById('v167-save-status');
    if(!el){
      var tools=document.querySelector('.v170-retired-tools');
      if(tools){el=document.createElement('span');el.id='v167-save-status';el.className='v170-save-status';tools.appendChild(el)}
    }
    if(el){el.textContent=text||'';el.className='v170-save-status '+(kind||'')}
  }catch(e){}
}
window.v167SaveNow=async function(){
  if(saving){setSaveStatus('正在保存，请稍候…','pending');return false}
  if(!career){setSaveStatus('当前没有可保存的生涯','warn');notify('当前没有可保存的生涯');return false}
  saving=true;
  var n=slot(),k=key(n),onRetired=!!(ui&&ui.screen==='retired'),msg='',kind='';
  try{
    stopSim();
    save();
    try{render()}catch(e){}
    setSaveStatus('本机已保存，正在同步云端…','pending');
    if(!api||typeof api.sync!=='function'||typeof api.available==='function'&&!api.available()){
      msg='本机已保存（当前未连接云端）';kind='ok';
      setSaveStatus(msg,kind);return true;
    }
    var result=await Promise.race([
      api.sync(k,JSON.stringify(career)),
      new Promise(function(resolve){setTimeout(function(){resolve('__timeout__')},8000)})
    ]);
    if(result==='__timeout__'){msg='本机已保存；云端同步超时';kind='warn';return false}
    var ok=!!result,out=api.result?api.result(k):'';
    if(ok)msg=out==='unchanged'?'云端已是最新进度':'已保存到云端';
    else if(out==='conflict')msg='云端存在另一段生涯，已保留本机存档';
    else msg='本机已保存；云端同步失败';
    kind=ok?'ok':'warn';
    return ok;
  }catch(e){
    msg='本机已保存；云端同步失败';kind='warn';return false;
  }finally{
    if(msg){setSaveStatus(msg,kind);if(!onRetired)notify(msg)}
    saving=false;
    try{render()}catch(e){}
    if(msg)setSaveStatus(msg,kind);
  }
};
const end=endSeason;endSeason=function(){const before=career?.history?.length||0,rv=end.apply(this,arguments);if(career&&(career.history?.length||0)>before){const id=career.seasonYear+':'+career.seasonNo;if(career.__v167AutoSyncSeason!==id){career.__v167AutoSyncSeason=id;save();api.sync(key(slot()),JSON.stringify(career)).finally(()=>{if(career)render()})}}return rv};
const continueSlot=window.v81ContinueSlot;
window.v81ContinueSlot=async function(n){if(loading)return;const local=window.__v166LocalSave?.(key(n));if(local){const result=continueSlot(n);if(api.available())api.read(key(n),true).then(()=>{if(career&&Number(career.__slot||ui.slot)===Number(n)&&career.__saveId===local.__saveId&&v167CompareSaves(career,local)>0)render()}).catch(()=>{});return result;}loading=true;ui.v167LoadingSlot=n;render();try{if(api.available()){try{await api.read(key(n),true)}catch(e){if(!window.__v166LocalSave?.(key(n))){notify('暂时无法读取云存档，请重试；原存档未清除。');return}}}return continueSlot(n)}finally{loading=false;ui.v167LoadingSlot=null;render()}};
const home=renderHome;renderHome=function(){let h=home.apply(this,arguments);if(!/onclick="(?:continueSave|v82OpenContinue)\(/.test(h)){const button='<button class="btn secondary v167-slots-button" onclick="v82OpenContinue()">读取存档</button>';const anchor=/<button\b[^>]*onclick="startSelect\(\)"[^>]*>[\s\S]*?<\/button>/;h=anchor.test(h)?h.replace(anchor,m=>m+button):h+button}return h.replace(/(<button\b[^>]*onclick="(?:continueSave|v82OpenContinue)\(\)"[^>]*>)[\s\S]*?(<\/button>)/g,'$1读取存档$2')};
const hud=renderHud;renderHud=function(){return hud.apply(this,arguments).replace('<header class="career-hud">','<header class="career-hud v172-hud">').replace('<div class="hud-right">','<div class="hud-right">'+saveButton())};
const retired=renderRetired;renderRetired=function(){return '<div class="v170-retired-tools">'+saveButton()+'<span id="v167-save-status" class="v170-save-status"></span></div>'+retired.apply(this,arguments)};
const beforeRender=render;render=function(){const result=beforeRender.apply(this,arguments);if(ui.v167LoadingSlot){const root=document.querySelector('#app');root?.insertAdjacentHTML('beforeend','<div role="status" style="position:fixed;bottom:94px;left:20px;right:20px;max-width:420px;margin:auto;padding:14px;border-radius:14px;background:#1c2129;color:#e8ecf1;border:1px solid #2f3742;box-shadow:0 8px 24px #00000066;z-index:99998;text-align:center;font-size:13px;pointer-events:none">正在比较本机与云端存档，请稍候…</div>')}return result};
const style=document.createElement('style');style.textContent='.v172-hud>div:first-child{min-width:0}.v172-hud h2{white-space:normal;overflow:visible;text-overflow:clip;line-height:1.4;overflow-wrap:anywhere}.v172-hud h2 span{display:block}.v172-hud small{white-space:normal;line-height:1.5}.v172-hud .hud-right{display:flex;flex-wrap:wrap;justify-content:flex-end;width:110px;gap:6px}.v172-hud .age-badge,.v172-hud .ovr-orb{order:0;flex-shrink:0}.v172-hud .v84-hud-retire{order:1;align-self:center;flex:0 0 30px;padding:5px 2px}.v172-hud .v170-save-button{order:2;min-width:70px;padding:8px 6px}.v170-save-button{align-self:flex-start;flex-shrink:0;min-height:34px;padding:8px 10px;border:1px solid #e8beb4;border-radius:11px;background:#fff4e6;color:#b63f45;font-size:11px;font-weight:800;white-space:nowrap;cursor:pointer}.v170-save-button:disabled{opacity:.55;cursor:wait}.v170-retired-tools{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:10px;padding:10px 12px;background:#fffaf2}.v170-save-status{font-size:11px;line-height:1.4;color:#9aa3b2}.v170-save-status.ok{color:#3f9b68}.v170-save-status.warn{color:#b63f45}.v170-save-status.pending{color:#a9782a}';document.head.appendChild(style);
})();

