
/* =====================================================================
   V3.7 · 切页暂停模拟
   需求：切到其它页面 → 赛季模拟自动暂停（不再后台跑、不再弹剧情）；
        切回赛季页 → 停在赛季页，由玩家手点「继续模拟」才恢复。

   根因（已定位）：
     1) 底部导航原本是 stopSim();ui.tab='x';render()，但被一层包装
        （renderCareer 的 replaceAll）主动删掉了 stopSim —— 原注释写明
        「用户不能通过切页主动暂停」，与现在的需求相反；
     2) 全局自动续跑钩子（v30 的 render 钩子 → v30EnsureAutoSim → window.v221StartSim）
        在常规赛且无弹层时会自动拉起模拟，所以切页后仍在后台跑。

   修法（选可靠接缝）：
     v30EnsureAutoSim 是 v30 IIFE 内的私有函数、拿不到引用，但它唯一的启动动作是
     调用 window.v221StartSim()（已被 v31 包装）。因此在这一层加守卫：
       · 不在赛季页 → 不启动（切页期间彻底停表）
       · 本季未由玩家手点 → 不启动（复用 v31 既有 await 机制）
   ===================================================================== */
(function(){
if(window.__v37TabPause)return;window.__v37TabPause=true;

function v37OnSeasonTab(){
  return !!(typeof ui!=='undefined'&&ui&&ui.tab==='season');
}

/* 切页入口：切到非赛季页先停表；切回赛季页保持停表等手点 */
window.v37SwitchTab=function(tab){
  if(typeof ui==='undefined'||!ui)return;
  const from=ui.tab;
  if(tab!==from){
    if(from==='season'&&typeof stopSim==='function')stopSim();   /* 从赛季页切走：立即暂停 */
    ui.tab=tab;
    if(tab==='season'&&typeof career!=='undefined'&&career&&career.stage==='regular'){
      career.v31Await=true;    /* 复用 v31 手点机制：未手点前不自动跑 */
    }
  }
  if(typeof render==='function')render();
};

/* 关键守卫：包住 window.v221StartSim —— 非赛季页一律不启动模拟 */
const __v37Start=(typeof window.v221StartSim==='function')?window.v221StartSim:null;
if(__v37Start){
  window.v221StartSim=function(){
    if(!v37OnSeasonTab())return;          /* 切页期间：不启动 */
    return __v37Start.apply(this,arguments);
  };
  /* v31 的手点入口同样加一道守卫（在非赛季页点不到，但防止其它路径误触发） */
  if(typeof window.v31ManualStart==='function'){
    const __v37Manual=window.v31ManualStart;
    window.v31ManualStart=function(){
      if(!v37OnSeasonTab())return;
      return __v37Manual.apply(this,arguments);
    };
  }
}

/* 把底部导航/入口的 ui.tab=...;render() 换成统一入口（这样"切走"能被捕获） */
const __v37RenderCareer=renderCareer;
renderCareer=function(){
  let h=__v37RenderCareer();
  try{
    /* 形如 onclick="stopSim();ui.tab='story';render()" 或 onclick="ui.tab='player';render()" */
    h=h.replace(/onclick="(?:stopSim\(\);)?ui\.tab='([a-z]+)';render\(\)"/g,function(m,tab){
      return `onclick="v37SwitchTab('${tab}')"`;
    });
  }catch(e){}
  return h;
};

/* 兜底：若因任何路径在非赛季页跑起了模拟，立刻停表 */
const __v37Render=render;
render=function(){
  __v37Render();
  try{
    if(typeof career!=='undefined'&&career&&career.stage==='regular'&&!v37OnSeasonTab()){
      if(ui.sim&&typeof stopSim==='function')stopSim();
    }
  }catch(e){}
};

window.__v37Debug={v37OnSeasonTab};

if(typeof career!=='undefined'&&career){save();render()}

})();

