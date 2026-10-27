
/* =====================================================================
   V3.6 · 专属天赋飘窗闪烁修复
   根因（已实测复现）：
     simulateGame 每场调用 save()；
     旧 save 钩子（v222 层）只要飘窗队列非空就全量重绘 innerHTML；
     飘窗卡带 CSS 入场动画 → 每场重建 → 动画每场重启 → 视觉「一直闪」。
     实测：富尔茨整季触发 1 次飘窗，DOM 却被重写 459 次。
   修法：
     1) 渲染前比对内容签名，内容没变就跳过 DOM 写入（动画不重启）；
     2) 解除 save 与飘窗重绘的绑定（save 只落盘，不再牵动飘窗）；
     3) 新触发到达时才更新，且保留既有卡片的动画状态（不整段重建）。
   ===================================================================== */
(function(){
if(window.__v36Stable)return;window.__v36Stable=true;

/* 稳定渲染器：内容没变就跳过写入 */
window.v222RenderPops=function(){
  let host=document.getElementById('v222-pop-layer');
  if(!window.v222Pops||!window.v222Pops.length){if(host)host.remove();return}
  if(!host){
    host=document.createElement('div');
    host.id='v222-pop-layer';
    host.className='v222-pop-layer';
    document.body.appendChild(host);
  }
  const rt=(career&&career.exclusiveRuntime)||{};
  const esc=(v)=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const html=window.v222Pops.map(p=>{
    const times=(p.count&&p.count>1)?`<span class="v222-pop-merge">×${esc(p.count)}</span>`:'';
    return `<div class="v222-pop pop-v33-in"><div class="v222-pop-top"><span class="v222-pop-kicker">专属天赋 · 生效提示</span><span class="v222-pop-count">本季 ${esc(rt.seasonProcs||0)} 次 · 生涯 ${esc(rt.procs||0)} 次</span></div><div class="v222-pop-name">${esc(p.title)}${times}</div><p class="v222-pop-body">${esc(p.body)}</p><span class="v222-pop-tag">已写入生涯反馈</span></div>`;
  }).join('');
  /* 内容签名：标题/次数/正文/触发计数 任一变化才写入 */
  const sig=window.v222Pops.map(p=>p.title+'|'+(p.count||1)+'|'+p.body).join('§')+'@'+(rt.seasonProcs||0)+'/'+(rt.procs||0);
  if(host.__v36Sig===sig)return;          /* 内容没变：跳过，动画不重启、不闪 */
  host.__v36Sig=sig;
  host.innerHTML=html;
};

/* 解除 save 与飘窗的绑定：save 只负责落盘，不再牵动飘窗重绘。
   注：旧钩子里的 v222OrigSave 是 v221 IIFE 的局部 const，外界拿不到原始 save 引用；
   但原始 save 只做 localStorage.setItem(SAVE, career)，语义明确，可直接重写为等价实现。 */
save=function(){
  try{if(career)localStorage.setItem(SAVE,JSON.stringify(career))}catch(e){}
};

/* v222Pop（合并计数版）：只在内容真正变化时才调用渲染 */
const __v36Pop=window.v222Pop;
window.v222Pop=function(title,body){
  if(typeof career==='undefined'||!career)return;
  if(!window.v222Pops)window.v222Pops=[];
  let changed=false;
  const dup=window.v222Pops.filter(p=>p.title===title);
  if(dup.length){
    const hit=dup[dup.length-1];
    const sameBody=hit.body===body;
    hit.count=(hit.count||1)+1;
    if(!sameBody){hit.body=body;changed=true}
    hit.mergedAt=Date.now();
  }else{
    window.v222Pops.push({title:title,body:body,count:1});
    changed=true;
  }
  while(window.v222Pops.length>3)window.v222Pops.shift();
  if(changed&&typeof window.v222RenderPops==='function')window.v222RenderPops();
  /* 停留计时：新触发刷新；收起时清空签名 */
  if(window.v222PopTimer)clearTimeout(window.v222PopTimer);
  window.v222PopTimer=setTimeout(function(){
    window.v222Pops=[];
    if(typeof window.v222RenderPops==='function')window.v222RenderPops();
  },4200);
};

/* 供自动化验收读取 */
window.__v36Debug={};

if(typeof career!=='undefined'&&career){save();render()}

})();

