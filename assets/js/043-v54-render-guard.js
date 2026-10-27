
/* =====================================================================
   V5.4 · 首屏崩溃兜底（白屏修复）
   开发者反馈（浏览器控制台）：
     index.html:480  Uncaught TypeError: Cannot read properties of undefined (reading 'zh')
       at renderHome (index.html:480:1210)
       at render (index.html:366:70)

   根因：主页「继续生涯」按钮读的是存档里的 playerId：
     `继续 ${esc(playerBy(s.playerId).zh)} · ...`
   当存档里的球员 ID 在当前名单里找不到时（旧版本存档、存档损坏、
   或日后删掉某位球员），playerBy() 返回 undefined，读 .zh 直接抛错。
   而 render() 是一整条三元链，renderHome 抛错 → 整个首屏渲染失败 → 白屏，
   且每次重渲染都在同一处崩溃，表现为「界面点不动」。

   修法（两层）：
     A. 源头：load() 增加存档合法性校验 —— playerId 必须能查到球员，
        否则视为无效存档（当作没有存档，不再显示「继续」按钮）。
     B. 兜底：包装 render()，任何一层抛错都不再白屏 ——
        清掉坏存档、回到封面、并把错误记进 window.__v54Errors。
   ===================================================================== */
(function(){
if(window.__v54RenderGuard)return;window.__v54RenderGuard=true;

window.__v54Errors=[];

/* ---------- B. render 兜底 ---------- */
try{
  const __v54Render=render;
  render=function(){
    try{
      return __v54Render();
    }catch(err){
      /* 记录错误（便于排查，不影响玩家） */
      try{window.__v54Errors.push(String(err&&err.message||err))}catch(e){}
      /* 恢复路径（务必克制）：
         只有「存档本身引用了不存在的球员」才是坏存档，那时才清。
         其它任何渲染异常都**不能动 career** —— 否则会把玩家正在进行的
         一局直接抹掉（实测：季后赛某处渲染报错曾导致整局被清空）。 */
      let badSave=false;
      try{
        const bad=load();
        if(bad&&(!bad.playerId||typeof playerBy!=='function'||!playerBy(bad.playerId))){
          badSave=true;
          try{localStorage.removeItem(SAVE)}catch(e){}
        }
      }catch(e){}
      try{
        if(badSave&&typeof career!=='undefined')career=null;
        /* 非坏存档时只清弹层，保留生涯继续渲染 */
        if(typeof ui!=='undefined'&&ui){ui.modal=null;}
        if(badSave&&typeof ui!=='undefined'&&ui){ui.screen='home';ui.storyEvent=null;}
      }catch(e){}
      try{
        /* 再渲染一次；若仍失败，至少给一个可交互的提示页，不再白屏。
           这里用 DOM 节点逐个拼装，不使用字符串写 DOM，避免引入注入面。 */
        __v54Render();
      }catch(e2){
        try{
          window.__v54Errors.push('二次渲染失败: '+String(e2&&e2.message||e2));
          const host=document.getElementById('app')||document.querySelector('#app');
          if(host){
            while(host.firstChild)host.removeChild(host.firstChild);
            const sec=document.createElement('section');
            sec.className='pre';
            sec.style.padding='24px';
            const h2=document.createElement('h2');
            h2.textContent='存档无法读取';
            const p=document.createElement('p');
            /* 只有「存档引用了不存在的球员」才是坏存档；其它渲染异常不该让玩家重开一局
               （实测反馈：玩几个赛季后卡在这一屏，只能点「重新开始」= 丢档）。 */
            p.textContent= badSave
              ? '这份存档引用的球员在当前版本里不存在，已经自动清除，重新开一局即可。'
              : '这一屏没能渲染出来，你的存档没有被改动。可以先退回封面，再重新进入存档继续。';
            const btn=document.createElement('button');
            btn.className='btn primary';
            btn.textContent= badSave?'重新开始':'回到封面';
            btn.onclick=function(){
              try{
                if(badSave){location.reload();return}
                if(typeof ui!=='undefined'&&ui){ui.storyEvent=null;ui.modal=null;ui.screen='home'}
                if(typeof window.v97Reset==='function')window.v97Reset();
                if(typeof render==='function')render();
              }catch(e){try{location.reload()}catch(e2){}}
            };
            const btn2=document.createElement('button');
            btn2.className='btn secondary';
            btn2.textContent='重新载入游戏';
            btn2.onclick=function(){try{location.reload()}catch(e){}};
            sec.appendChild(h2);sec.appendChild(p);sec.appendChild(btn);sec.appendChild(btn2);
            host.appendChild(sec);
          }
        }catch(e3){}
      }
    }
  };
}catch(e){}

window.__v54Debug={errors:()=>window.__v54Errors.slice()};

})();
