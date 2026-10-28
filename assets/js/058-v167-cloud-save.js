
/* Cloud saves: SDK identity, paced I/O, legacy migration, and explicit retry. */
(function(){
'use strict';
if(window.__v166CloudSave)return;
var cache=new Map(),reads=new Map(),pending=new Map(),blocked=new Map(),known=new Set(),staged=new Map(),syncing=new Map(),outcomes=new Map(),generations=new Map();
function parse(text){try{return text?JSON.parse(text):null}catch(e){return null}}
function compare(a,b){if(!a)return b?-1:0;if(!b)return 1;var same=a.__saveId&&a.__saveId===b.__saveId;if(same&&Number(a.__saveRev)>0&&Number(b.__saveRev)>0&&Number(a.__saveRev)!==Number(b.__saveRev))return Number(a.__saveRev)-Number(b.__saveRev);var at=Number(a.__saveAt)||0,bt=Number(b.__saveAt)||0;if(at&&bt&&at!==bt)return at-bt;return (Number(a.seasonNo)||0)-(Number(b.seasonNo)||0)||(Number(a.games)||0)-(Number(b.games)||0)}
window.v167CompareSaves=compare;
function sameLife(a,b){if(!a||!b||a.playerId!==b.playerId||a.draftYear&&b.draftYear&&Number(a.draftYear)!==Number(b.draftYear))return false;if(a.__saveId||b.__saveId)return !!a.__saveId&&a.__saveId===b.__saveId;return a.playerId===b.playerId&&a.draftYear===b.draftYear;}
window.v169SameLife=sameLife;
var tails={read:Promise.resolve(),write:Promise.resolve()},last={read:-Infinity,write:-Infinity},running=false;
function lampsReady(){try{return String(navigator.userAgent||'').indexOf('LampsSDK')!==-1&&window.LampsPlatform&&typeof window.LampsPlatform.saveGameProgress==='function'&&typeof window.LampsPlatform.getGameProgress==='function'}catch(e){return false}}
/* Lamps 的进度接口只会保存“当前用户最新一条进度”。
   本游戏有 3 个本机存档槽，所以云端记录统一存成 { version:2, slots:{键:文本} }，
   每次写入先合并已有槽位，避免槽 2 覆盖槽 1。旧版 { slot,text } 记录会自动迁移。 */
var bundleCache=null,bundleLoading=null,bundleWrite=Promise.resolve();
function loadBundle(force){
 if(!force&&bundleCache)return Promise.resolve(bundleCache);
 if(bundleLoading)return bundleLoading;
 bundleLoading=window.LampsPlatform.getGameProgress().then(function(r){
  if(!r||!r.ok)throw {code:'LAMPS_FAIL',message:(r&&r.message)||'云端读取失败'};
  var rec=r.data&&r.data.record&&r.data.record.gamePayload;
  var slots={};
  if(rec&&rec.slots&&typeof rec.slots==='object'){
   Object.keys(rec.slots).forEach(function(k){if(typeof rec.slots[k]==='string')slots[k]=rec.slots[k]});
  }else if(rec&&typeof rec.text==='string'&&rec.slot){
   slots[String(rec.slot)]=rec.text;
  }
  bundleCache={slots:slots};
  bundleLoading=null;
  return bundleCache;
 },function(e){bundleLoading=null;throw e});
 return bundleLoading;
}
function saveBundle(bundle){
 var payload={version:2,slots:Object.assign({},bundle.slots)};
 return window.LampsPlatform.saveGameProgress({game_payload:payload}).then(function(r){
  if(!r||!r.ok||!r.data)throw {code:'LAMPS_FAIL',message:(r&&r.message)||'云端保存失败'};
  bundleCache={slots:payload.slots};
  return r;
 });
}
function api(){
 if(!lampsReady())return null;
 var lp=window.LampsPlatform;
 return {
  setValue:function(o){
   bundleWrite=bundleWrite.catch(function(){}).then(function(){
    return loadBundle().then(function(b){
     var next={slots:Object.assign({},b.slots)};
     next.slots[o.key]=o.value;
     return saveBundle(next);
    });
   });
   return bundleWrite.then(function(){return {code:200,data:{key:o.key}}},function(e){return {code:'LAMPS_FAIL',message:(e&&e.message)||'云端保存失败'}});
  },
  getValue:function(o,force){
   return loadBundle(force).then(function(b){
    var v=o&&o.key?b.slots[o.key]:null;
    return {code:200,data:typeof v==='string'?v:null};
   },function(e){return {code:'LAMPS_FAIL',message:(e&&e.message)||'云端读取失败'}});
  }
 };
}
function wait(ms){return new Promise(function(resolve){setTimeout(resolve,ms)})}
function paced(kind,fn){var job=tails[kind].then(async function(){var delay=3100-(Date.now()-last[kind]);if(delay>0)await wait(delay);last[kind]=Date.now();return fn()});tails[kind]=job.catch(function(){});return job}
function failure(message,code){var e=new Error(message);e.code=code;return e}
function checked(r){if(!r||r.code!==200)throw failure(r&&r.message||'云存档服务暂不可用',r&&r.code||'NO_RESPONSE');return r.data}
function bytes(s){if(typeof TextEncoder!=='undefined')return new TextEncoder().encode(s).length;var n=0;for(var i=0;i<s.length;i++){var c=s.charCodeAt(i);if(c>=0xd800&&c<=0xdbff&&i+1<s.length&&s.charCodeAt(i+1)>=0xdc00&&s.charCodeAt(i+1)<=0xdfff){n+=4;i++}else n+=c<128?1:c<2048?2:3}return n}
function unpack(value){if(value===null||value==='')return value;if(typeof value!=='string')throw failure('云存档格式异常，已保留原存档','INVALID_DATA');var plain=window.__v129StorageCodec?window.__v129StorageCodec.unpack(value):value;if(typeof plain!=='string')throw failure('云存档校验失败，已保留原存档','INVALID_DATA');try{var c=JSON.parse(plain);if(!c||!c.playerId)throw Error()}catch(e){throw failure('云存档内容异常，已保留原存档','INVALID_DATA')}return plain}
function state(key,status,error){if(window.__v134Sync)window.__v134Sync.slots[key]={status:status,error:error&&error.message,code:error&&error.code,at:Date.now()}}
function trace(key,op,error){try{if(typeof window.__SHAPER_DEBUG_LOG__==='function')window.__SHAPER_DEBUG_LOG__({type:'customError',level:'error',message:'云存档操作失败',traceId:'save166-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),detail:{version:166,operation:op,key:key,code:String(error.code||'NETWORK')}})}catch(ignore){}}
function notice(){try{var d=document.getElementById('v166-save-status');if(!blocked.size){if(d)d.remove();return}if(!document.body)return;if(!d){d=document.createElement('div');d.id='v166-save-status';d.setAttribute('role','status');d.style.cssText='position:fixed;left:12px;right:12px;bottom:94px;z-index:99999;margin:auto;max-width:440px;background:#1c2129;border:1px solid #2f3742;color:#ffb4b4;border-radius:14px;padding:10px 12px;box-shadow:0 8px 24px #00000066;font-size:12px;display:flex;gap:10px;align-items:center;pointer-events:none';var text=document.createElement('span');text.style.flex='1';d.appendChild(text);var button=document.createElement('button');button.textContent='重试云存档';button.style.cssText='border:0;border-radius:9px;background:#ffd23f;color:#101318;padding:9px 12px;font-size:12px;font-weight:800;pointer-events:auto';button.onclick=function(){button.disabled=true;retry().finally(function(){button.disabled=false})};d.appendChild(button);document.body.appendChild(d)}d.firstChild.textContent='云存档未完成：'+String(blocked.values().next().value.message).slice(0,100)}catch(ignore){}}
function stop(key,op,e){blocked.set(key,e);state(key,'error',e);trace(key,op,e);notice()}
function mark(key){try{localStorage.setItem('bust_cloud_migrated_v166_'+key,'1')}catch(ignore){}}
function local(key){try{return typeof window.__v166LocalSave==='function'?window.__v166LocalSave(key):null}catch(e){return null}}
function chooseLegacy(key,legacy){var a=local(key),b=null;try{b=typeof legacy==='string'?JSON.parse(legacy):legacy}catch(ignore){}if(!a)return b&&b.playerId?b:null;if(!b||!b.playerId)return a;if(a.__saveId&&b.__saveId&&a.__saveId!==b.__saveId)return a;if(a.__saveAt&&b.__saveAt)return Number(a.__saveAt)>=Number(b.__saveAt)?a:b;return (Number(a.seasonNo)||0)>(Number(b.seasonNo)||0)||(Number(a.seasonNo)||0)===(Number(b.seasonNo)||0)&&(Number(a.games)||0)>=(Number(b.games)||0)?a:b}
async function commit(key,text){var s=api();if(!s)throw failure('当前页面尚不支持云存档，请更新后重试','SDK_UNAVAILABLE');var value=window.__v129StorageCodec?window.__v129StorageCodec.pack(text):text;if(bytes(value)>2*1024*1024)throw failure('存档超过云端容量限制，本机进度已保留',413);await paced('write',async function(){checked(await s.setValue({key:key,value:value}))});cache.set(key,text);known.add(key);mark(key);state(key,'saved')}
function read(key,refresh){
 if(!api())return Promise.resolve(null);
 if(reads.has(key))return reads.get(key);
 if(blocked.has(key))return Promise.reject(blocked.get(key));
 if(!refresh&&cache.has(key))return Promise.resolve(cache.get(key));
 var readGeneration=generations.get(key)||0;
 var job=(async function(){
  try{
   var s=api();if(!s)throw failure('当前页面尚不支持云存档，请更新后重试','SDK_UNAVAILABLE');
   var remote=await paced('read',async function(){return checked(await s.getValue({key:key},refresh))});
   if((generations.get(key)||0)!==readGeneration)return null;
   if(remote!==null){var text=unpack(remote);cache.set(key,text);known.add(key);mark(key);if(text&&typeof window.__v167AdoptCloud==='function')window.__v167AdoptCloud(key,parse(text));return text}
   var legacy=null,migrated=false;try{migrated=localStorage.getItem('bust_cloud_migrated_v166_'+key)==='1'}catch(ignore){}if(!migrated&&typeof window.v134ReadHostStorage==='function')legacy=await window.v134ReadHostStorage(key,true);
   if((generations.get(key)||0)!==readGeneration)return null;
   var candidate=local(key),legacySave=parse(legacy);if(legacySave?.playerId&&candidate&&!sameLife(legacySave,candidate)){var preserved=JSON.stringify(legacySave);cache.set(key,preserved);known.add(key);outcomes.set(key,'conflict');state(key,'error',failure('旧云端与本机是不同生涯，请选择需要继续的存档','LIFE_CONFLICT'));return preserved;}var chosen=legacy?chooseLegacy(key,legacy):null;
   if(chosen){var migrated=JSON.stringify(chosen);await commit(key,migrated);return migrated}
   cache.set(key,null);known.add(key);return null;
  }catch(e){if((generations.get(key)||0)!==readGeneration)return null;stop(key,'read-or-migrate',e);throw e}
 })();reads.set(key,job);job.then(function(){reads.delete(key)},function(){reads.delete(key)});return job;
}
function write(payload,explicit){if(!api())return Promise.resolve(false);var businessKey=Object.keys(payload)[0];var incoming=parse(payload[businessKey]),previous=parse(staged.get(businessKey));if(businessKey&&(payload[businessKey]===''||incoming?.__saveId&&previous?.__saveId&&incoming.__saveId!==previous.__saveId)){generations.set(businessKey,(generations.get(businessKey)||0)+1);cache.delete(businessKey);outcomes.delete(businessKey);staged.delete(businessKey);}if(businessKey&&payload[businessKey]!==''&&!explicit){staged.set(businessKey,payload[businessKey]);if(!blocked.has(businessKey))state(businessKey,'local');return Promise.resolve(true);}var key=Object.keys(payload)[0];if(!key)return Promise.resolve(false);if(blocked.has(key)){pending.set(key,{text:payload[key],waiters:[]});return Promise.resolve(false)}var promise=new Promise(function(resolve){var old=pending.get(key);pending.set(key,{text:payload[key],waiters:(old?old.waiters:[]).concat(resolve)})});state(key,'pending');pump();return promise}
async function pump(){if(running)return;running=true;try{while(true){var key=null;pending.forEach(function(p,k){if(key===null&&!blocked.has(k))key=k});if(key===null)break;
 var item=pending.get(key);
 try{
  if(item.text!==''&&!known.has(key))await read(key);
  // Pick the newest snapshot after waiting for initialization and the shared write slot.
  await paced('write',async function(){item=pending.get(key);pending.delete(key);var s=api();if(!s)throw failure('当前页面尚不支持云存档，请更新后重试','SDK_UNAVAILABLE');var value=window.__v129StorageCodec?window.__v129StorageCodec.pack(item.text):item.text;if(bytes(value)>2*1024*1024)throw failure('存档超过云端容量限制，本机进度已保留',413);checked(await s.setValue({key:key,value:value}));cache.set(key,item.text);known.add(key);mark(key);state(key,'saved')});
  item.waiters.forEach(function(r){r(true)});
 }catch(e){var newer=pending.get(key);pending.set(key,{text:newer?newer.text:item.text,waiters:[]});item.waiters.concat(newer&&newer!==item?newer.waiters:[]).forEach(function(r){r(false)});stop(key,'write',e)}
 }}finally{running=false;notice()}}
function sync(key,text){if(!api())return Promise.resolve(false);if(syncing.has(key))return syncing.get(key);var generation=generations.get(key)||0;var job=(async function(){blocked.delete(key);notice();try{var remote=await read(key,true);if((generations.get(key)||0)!==generation)return false;var cloud=parse(remote),candidate=local(key)||parse(text||staged.get(key)),provided=parse(text);if(provided&&(!candidate||sameLife(provided,candidate))&&compare(provided,candidate)>0)candidate=provided;if(cloud&&candidate&&!sameLife(cloud,candidate)){outcomes.set(key,'conflict');state(key,'error',failure('本机与云端是不同生涯，已停止覆盖，请到选择存档确认','LIFE_CONFLICT'));return false}if(cloud&&sameLife(cloud,candidate)&&compare(cloud,candidate)>0){if(window.__v167AdoptCloud)window.__v167AdoptCloud(key,cloud);outcomes.set(key,'restored');staged.delete(key);state(key,'saved');return true}if(!candidate)return false;if(cloud&&compare(cloud,candidate)===0&&cloud.__saveId===candidate.__saveId){outcomes.set(key,'unchanged');return true}var payload={};payload[key]=JSON.stringify(candidate);var ok=await write(payload,true);if(ok){outcomes.set(key,'saved');var latest=parse(staged.get(key));if(!latest||compare(latest,candidate)<=0)staged.delete(key)}return ok}catch(e){stop(key,'sync',e);return false}})();syncing.set(key,job);job.then(function(){syncing.delete(key)},function(){syncing.delete(key)});return job}
async function retry(){var keys=Array.from(blocked.keys());for(var i=0;i<keys.length;i++)await sync(keys[i]);}
window.__v166CloudSave={read:read,write:write,sync:sync,retry:retry,flush:function(){},snapshot:function(key){return parse(cache.get(key))},hasSnapshot:function(key){return cache.has(key)},result:function(key){return outcomes.get(key)},busy:function(key){return syncing.has(key)},waitForSync:function(key){return syncing.get(key)||Promise.resolve()},status:function(){return {pending:pending.size,blocked:blocked.size}},available:function(){return !!api()}};
})();

