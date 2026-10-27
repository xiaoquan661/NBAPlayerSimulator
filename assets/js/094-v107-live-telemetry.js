
/* ============================================================================
 * v107 · 活动数据上报（只上报事实，不含任何游戏进度）
 *   · 在线心跳：页面打开期间每 60 秒一条，落 presence.last_seen
 *   · 奖励视频完成：rewardAd.request 真正「看完且已发奖」时上报一条 ad_events
 *
 * 口径：在线 = 最近 2 分钟有心跳的不同玩家；广告完成 = 成功发放奖励的次数。
 *
 * 自门控：接口还没部署时（404/405）会自动静默停掉，不再发请求，
 *   并在本机记 6 小时（避免每次开局都白试一轮）。所以这段代码可以先随包发出去，
 *   后端不上线时对玩家完全无感；后端上线后自动开始计数。
 * 无容器（浏览器直开预览）时直接不上报。
 * ============================================================================ */
(function(){
'use strict';
return; /* 虎扑活动数据上报已移除，Lamps 平台不需要该埋点 */
if(window.__v107Fix)return;window.__v107Fix=true;

var OFF_KEY='bust_tel_off_until';
var offUntil=0;
try{offUntil=Number(localStorage.getItem(OFF_KEY))||0}catch(e){offUntil=0}
function off(){return offUntil>Date.now()}
function shutOff(why){
  offUntil=Date.now()+6*3600*1000;
  try{localStorage.setItem(OFF_KEY,String(offUntil))}catch(e){}
  try{if(window.v99Diag)window.v99Diag('telemetry-off:'+why)}catch(e){}
}
function hasCloud(){ return false; }
function post(){ return Promise.resolve(null); }
function send(path,body){
  if(off()||!hasCloud())return;
  try{
    Promise.resolve(post(path,body)).then(function(res){
      var sc=res&&res.statusCode;
      if(sc===404||sc===405)shutOff('not-deployed');
    }).catch(function(e){
      var m=String((e&&e.message)||e);
      if(/404|not found|405/i.test(m))shutOff('not-deployed');
    });
  }catch(e){}
}
window.__v107Send=send;

function myState(){
  var id='',sn=0;
  try{id=(typeof career!=='undefined'&&career&&career.playerId)||''}catch(e){}
  try{sn=(typeof career!=='undefined'&&career&&career.seasonNo)||0}catch(e){}
  var nick='';
  try{nick=window.__v82Nickname||''}catch(e){}
  return {nickname:nick,playerId:id,seasonNo:sn};
}

/* ① 在线心跳 */
function beat(){
  try{if(document.hidden)return}catch(e){}      /* 切后台不算在线 */
  var s=myState();
  send('/presence',s);
}
try{window.addEventListener('visibilitychange',function(){setTimeout(beat,800)})}catch(e){}
setTimeout(beat,3000);
setInterval(beat,60000);

/* ② 奖励视频完成：包住 rewardAd.request（v69 已把真实桥接装在这个方法上） */
try{
  if(typeof rewardAd!=='undefined'&&rewardAd&&typeof rewardAd.request==='function'&&!window.__v107AdPatch){
    var prev=rewardAd.request;
    /* 铁律：上报绝不能影响广告与发奖。
       · 先原样调用原方法；抛错就原样抛（与改造前一致）
       · 返回值非 Promise 时同步原样返回（不偷换成 Promise）
       · 是 Promise 时，成功/失败都原样透传，上报只在成功分支里做，且整段包 try/catch */
    rewardAd.request=function(reason){
      var p=prev.apply(this,arguments);
      var thenable=!!(p&&typeof p.then==='function');
      var report=function(res){
        try{
          if(res===true||(res&&(res.success||res.rewarded))){
            var s=myState(),cnt=0,pts=0;
            try{cnt=Number(career&&career.v63AdCount)||0}catch(e){}
            try{pts=Number((typeof V63_AD_POINTS!=='undefined')?V63_AD_POINTS:0)||0}catch(e){}
            send('/ad-complete',{playerId:s.playerId,seasonNo:s.seasonNo,adCountSeason:cnt,points:pts,reason:String(reason||'')});
          }
        }catch(e){}
      };
      if(!thenable){report(p);return p}
      return p.then(function(res){report(res);return res},function(err){throw err});
    };
    window.__v107AdPatch=true;
  }
}catch(e){}

window.__v107Debug={off:off,shutOff:shutOff,beat:beat,state:myState};
})();

