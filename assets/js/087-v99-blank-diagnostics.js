
/* ============================================================================
 * v99 · 白屏诊断（把「看不到的报错」变成能读到的东西）
 *
 * 背景：开发者反馈「玩着玩着还是会白屏」。我在真浏览器里跑了 9 个赛季、
 *   923 步（每场都真实渲染），0 报错 0 空白，无法复现 —— 说明触发条件在
 *   我这边缺的环境里（虎扑 WebView 的宿主能力 / 特定存档状态）。
 *
 * 既然复现不了，就先让「故障现场」自己留下来：
 *   ① 所有未捕获错误与渲染失败写入 localStorage 环形缓冲（hupu_diag，保留 8 条），
 *      刷新页面也不丢 —— 白屏后重进游戏就能读到上一次的原因；
 *   ② 启动看门狗：加载后 4 秒如果 #app 还是空的（字面意义上的白屏），
 *      直接画可点的恢复页，并把诊断信息显示在下面；
 *   ③ 恢复页显示最近两条诊断，玩家截图即可，不用连电脑看控制台。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v99Fix)return;window.__v99Fix=true;
var KEY='hupu_diag';
function v99Diag(msg){
  try{
    var arr=[];
    try{arr=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){arr=[]}
    if(!(arr instanceof Array))arr=[];
    arr.push(new Date().toISOString().slice(5,19)+' '+String(msg||'').slice(0,220));
    while(arr.length>8)arr.shift();
    localStorage.setItem(KEY,JSON.stringify(arr));
  }catch(e){}
}
window.v99Diag=v99Diag;
window.__diagTail=function(){
  try{
    var arr=JSON.parse(localStorage.getItem(KEY)||'[]');
    return (arr instanceof Array)?arr.slice(-2).join(' ／ '):'';
  }catch(e){return ''}
};
window.__diagClear=function(){try{localStorage.removeItem(KEY)}catch(e){}};

function v99State(){
  try{
    return 'sn='+(typeof career!=='undefined'&&career?career.seasonNo:'-')
      +' stage='+(typeof career!=='undefined'&&career?career.stage:'-')
      +' games='+(typeof career!=='undefined'&&career?career.games:'-')
      +' screen='+(typeof ui!=='undefined'&&ui?ui.screen:'-')
      +' tab='+(typeof ui!=='undefined'&&ui?ui.tab:'-')
      +' ev='+(typeof ui!=='undefined'&&ui&&ui.storyEvent?1:0)
      +' modal='+(typeof ui!=='undefined'&&ui&&ui.modal?1:0);
  }catch(e){return ''}
}
window.v99State=v99State;

/* 记录未捕获错误与 promise 拒绝（不改任何行为，只做记录） */
try{
  window.addEventListener('error',function(e){
    v99Diag('onerror: '+(e&&e.message)+' @'+(e&&e.filename||'')+':'+(e&&e.lineno)+' | '+v99State());
  });
  window.addEventListener('unhandledrejection',function(e){
    v99Diag('reject: '+((e&&e.reason&&e.reason.message)||(e&&e.reason))+' | '+v99State());
  });
}catch(e){}

/* 渲染失败也记一笔（v97 已会吞掉并画恢复页，这里补上持久化） */
try{
  if(typeof render==='function'&&!window.__v99RenderGuard){
    var __v99Render=render;
    render=function(){
      try{
        var r=__v99Render.apply(this,arguments);
        window.__v99RenderFails=0;
        return r;
      }catch(e){
        window.__v99RenderFails=(window.__v99RenderFails||0)+1;
        if(window.__v99RenderFails<=3)v99Diag('render: '+((e&&e.message)||e)+' | '+v99State());
        throw e;
      }
    };
    try{if(typeof window.render==='function')window.render=render}catch(e){}
    window.__v99RenderGuard=true;
  }
}catch(e){}

/* 启动看门狗：加载后 #app 一直是空的 = 字面白屏 → 给可点恢复页。
   （抽成函数是为了能重复调用排查，也方便自动验证。） */
function v99Watch(){
  try{
    var app=document.getElementById('app');
    var h=app?app.innerHTML:'';
    if(!app||(h&&h.length>=200))return false;
    v99Diag('boot-blank: #app 为空 | '+v99State());
    var pas=document.createElement('section');
    pas.className='pre';pas.style.padding='24px';
    var t=document.createElement('h2');t.textContent='游戏没能正常打开';
    var p=document.createElement('p');
    p.textContent='你的存档没有被改动。先点下面按钮回到封面；如果反复出现，请把下方诊断信息截图反馈。';
    var b=document.createElement('button');b.className='btn primary';b.textContent='回到封面';
    b.onclick=function(){try{window.v97GoHome?window.v97GoHome():location.reload()}catch(e){location.reload()}};
    var b2=document.createElement('button');b2.className='btn secondary';b2.textContent='重新载入游戏';
    b2.onclick=function(){try{location.reload()}catch(e){}};
    var d=document.createElement('div');
    d.style.cssText='padding:0 20px 22px;font-size:8.5px;color:#a08a76;word-break:break-all';
    d.textContent=window.__diagTail()||'（暂无诊断记录）';
    pas.appendChild(t);pas.appendChild(p);pas.appendChild(b);pas.appendChild(b2);pas.appendChild(d);
    while(app.firstChild)app.removeChild(app.firstChild);
    app.appendChild(pas);
    return true;
  }catch(e){return false}
}
window.v99Watch=v99Watch;
try{setTimeout(v99Watch,4000)}catch(e){}

window.__v99Debug={diag:v99Diag,tail:window.__diagTail,clear:window.__diagClear,state:v99State,watch:v99Watch};
})();

