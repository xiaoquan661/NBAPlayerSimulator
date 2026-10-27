
/* =====================================================================
   V3.3 · 专属天赋触发飘窗调整
   1) 位置：屏幕下方 → 顶部标题栏下方
   2) 尺寸：整体缩小（宽/内边距/字号/圆角）
   3) 触发时机：取消「同标题 20 秒冷却静默丢弃」，改为同类合并计数，
      保证「触发了就一定看得到」，且弹出为同步立即渲染
   ===================================================================== */
(function(){
if(window.__v33Pop)return;window.__v33Pop=true;

/* =====================================================================
   PART 1 + 2 · 位置改到顶部标题栏下方 + 整体缩小
   ===================================================================== */
const st33=document.createElement('style');
st33.textContent=`
/* 位置：顶部标题栏（HUD min-height 84px）下方，从顶部向下堆叠 */
.v222-pop-layer{top:92px!important;bottom:auto!important;flex-direction:column!important;align-items:center!important;gap:6px!important;padding:0 16px!important;z-index:120!important}
/* 尺寸：整体缩小（宽上限 430→300，内边距 12/13→8/10，圆角 20→15，字号同步收紧） */
.v222-pop{width:min(100%,300px)!important;border-radius:15px!important;padding:8px 10px!important;box-shadow:0 10px 24px rgba(60,28,18,.28)!important}
.v222-pop::after{width:88px!important;height:88px!important;right:-28px!important;top:-34px!important}
.v222-pop-top{gap:7px!important}
.v222-pop-kicker{font-size:7px!important;letter-spacing:.1em!important}
.v222-pop-count{font-size:7px!important;padding:3px 6px!important}
.v222-pop-name{font-size:9.5px!important;margin:5px 0 2px!important}
.v222-pop-body{font-size:8px!important;line-height:1.5!important}
.v222-pop-tag{margin-top:5px!important;font-size:7px!important;padding:3px 6px!important}
/* 入场：从上向下滑入（与顶部位置一致） */
.pop-v33-in{animation:v33PopIn .26s cubic-bezier(.2,1.2,.3,1) both}
@keyframes v33PopIn{from{opacity:0;transform:translateY(-12px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
/* 合并计数徽标（同类触发合并为一条时显示） */
.v222-pop-merge{display:inline-block;margin-left:5px;font-size:7px;padding:2px 5px;border-radius:999px;background:#ffd66b;color:#5b3413;font-weight:1000;vertical-align:middle}
`;
document.head.appendChild(st33);

/* =====================================================================
   PART 3 · 触发立即弹出：取消静默丢弃，改为同类合并计数
   根因：原 v222Pop 带「同标题 20 秒冷却」，第二次起的同类触发直接 return（静默丢弃），
        模拟速度快时尤为明显（实测连触 5 次只显示 1 次）。
   改法：同类（同标题）触发不再丢弃 —— 若该条已在屏上，则把计数 +1 并刷新停留时间；
        否则新增一条。每次触发都有可见反馈。
   ===================================================================== */
if(typeof window.v222Pop==='function'){
  const seenLayer=function(){return document.getElementById('v222-pop-layer')};

  /* 安全提交：不依赖旧节的节流，直接入队并同步渲染 */
  window.v222Pop=function(title,body){
    if(typeof career==='undefined'||!career)return;
    if(!window.v222Pops)window.v222Pops=[];

    /* 同类合并：屏上已有同标题 → 计数 +1，不新增条目 */
    const dup=window.v222Pops.filter(p=>p.title===title);
    if(dup.length){
      const hit=dup[dup.length-1];
      hit.count=(hit.count||1)+1;
      hit.body=body;
      hit.mergedAt=Date.now();
    }else{
      window.v222Pops.push({title:title,body:body,count:1});
    }
    /* 屏幕上最多同时显示 3 条：超出时丢弃最旧的（但被合并的不会丢） */
    while(window.v222Pops.length>3)window.v222Pops.shift();

    /* 先落盘、再渲染：save() 内部会触发旧渲染器，故最终渲染放在最后，避免覆盖合并徽标 */
    if(typeof save==='function')save();
    if(typeof window.v222RenderPops==='function')window.v222RenderPops();

    /* 停留时间：新触发刷新计时，数秒后收起 */
    if(window.v222PopTimer)clearTimeout(window.v222PopTimer);
    window.v222PopTimer=setTimeout(function(){
      window.v222Pops=[];
      if(typeof window.v222RenderPops==='function')window.v222RenderPops();
    },4200);
  };

  /* 渲染：显示合并次数徽标（count>1 时） */
  window.v222RenderPops=function(){
    let host=seenLayer();
    if(!window.v222Pops.length){if(host)host.remove();return}
    if(!host){
      host=document.createElement('div');
      host.id='v222-pop-layer';
      host.className='v222-pop-layer';
      document.body.appendChild(host);
    }
    const rt=(career&&career.exclusiveRuntime)||{};
    /* 文本统一转义后再写入 DOM：杜绝任何形式的注入（本轮新增的合并徽标同理） */
    const esc=(v)=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    host.innerHTML=window.v222Pops.map(p=>{
      const times=(p.count&&p.count>1)?`<span class="v222-pop-merge">×${esc(p.count)}</span>`:'';
      return `<div class="v222-pop pop-v33-in"><div class="v222-pop-top"><span class="v222-pop-kicker">专属天赋 · 生效提示</span><span class="v222-pop-count">本季 ${esc(rt.seasonProcs||0)} 次 · 生涯 ${esc(rt.procs||0)} 次</span></div><div class="v222-pop-name">${esc(p.title)}${times}</div><p class="v222-pop-body">${esc(p.body)}</p><span class="v222-pop-tag">已写入生涯反馈</span></div>`;
    }).join('');
  };
}

if(typeof career!=='undefined'&&career){save();render()}

})();

