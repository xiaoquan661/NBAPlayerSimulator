
/* =====================================================================
   V4.1 · 未解锁时的事件弹窗不再带专属外观
   根因（已实测复现）：
     未解锁状态下弹出「赛季随机事件」时，渲染走了 v28 那套**剧情章模板**，
     它没有专属守卫，于是把随机事件包装成了专属剧情的样子：
       · 右上角章节计数  1/9        （取的是专属主线章节总数）
       · 页脚署名        六边形超巨  （取的是专属天赋名）
       · 栏头            CAREER STORY / 专属故事
       再加上一层文本替换把「主线」改写成「专属故事」。
     玩家看到的就是「专属剧情」，但它其实是普通随机事件 —— 这正是
     「没看广告仍有专属剧情」的真正来源。
   修法：未解锁时，随机事件改用一套**中性弹窗**（只有事件标题 / 正文 /
     选项），不显示章节计数、不显示专属天赋名、不出现「专属故事」字样。
   ===================================================================== */
(function(){
if(window.__v41NeutralEvent)return;window.__v41NeutralEvent=true;

function v41IsExclusive(){
  try{return !!(typeof career!=='undefined'&&career&&career.exclusive)}catch(e){return false}
}

/* 把事件对象的动态字段（函数式）解析成静态值 */
function v41Resolve(ev){
  let e=ev;
  try{if(typeof v28Event==='function')e=v28Event(ev)||ev}catch(err){e=ev}
  const out={t:e&&e.t,scene:e&&e.scene,b:e&&e.b,stakes:e&&e.stakes,speaker:e&&e.speaker,c:[]};
  try{out.c=(typeof e.c==='function'?e.c():(e.c||[]))}catch(err){out.c=e&&e.c||[]}
  try{out.b=typeof out.b==='function'?out.b():out.b}catch(err){}
  try{out.stakes=typeof out.stakes==='function'?out.stakes():out.stakes}catch(err){}
  if(!Array.isArray(out.c))out.c=[];
  return out;
}

/* 中性弹窗：只有标题、正文、选项——不带任何专属剧情的痕迹 */
function v41NeutralOverlay(ev){
  const e=v41Resolve(ev);
  const body=String(e.b||'').split('\n').filter(Boolean).map(x=>`<p class="v41-body">${esc(x)}</p>`).join('');
  const choices=e.c.map((c,i)=>
    `<button class="choice" onclick="storyChoice(${i})"><b>${esc(c[0])}</b><span>${esc(c[1]||'')}</span></button>`
  ).join('');
  const speaker=e.speaker?`<div class="v41-speaker">${esc(e.speaker)}</div>`:'';
  const when=esc(`${seasonLabel?seasonLabel():''}${career&&career.games?` · G${career.games}`:''}`);
  return `<div class="overlay v41-overlay"><div class="sheet v41-sheet"><div class="sheet-handle"></div>`
    +`<div class="v41-top"><small>赛季事件</small><h2>${esc(e.t||'赛季里的一件事')}</h2><span>${when}</span></div>`
    +speaker
    +`<div class="v41-copy">${body}</div>`
    +`<div class="choice-list">${choices}</div>`
    +`</div></div>`;
}

let styled=false;
function v41InjectStyle(){
  if(styled)return;styled=true;
  try{
    const st=document.createElement('style');
    st.id='v41-neutral-event-style';
    st.textContent=[
      '.v41-overlay .v41-sheet{border-radius:24px}',
      '.v41-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}',
      '.v41-top small{font-size:8.5px;letter-spacing:.12em;color:#a98a6f}',
      '.v41-top h2{font-size:20px;margin:4px 0 0;line-height:1.35}',
      '.v41-top span{font-size:8.5px;color:#a08a79;white-space:nowrap;margin-top:3px}',
      '.v41-speaker{margin-top:9px;font-size:9.5px;font-weight:900;color:#8a6a4e}',
      '.v41-copy{margin-top:9px}',
      '.v41-body{font-size:11.5px;line-height:1.75;color:#5f5148;margin:0 0 7px}'
    ].join('');
    document.head.appendChild(st);
  }catch(e){}
}

/* 包住最终生效的 renderOverlay：未解锁 + 有事件 → 用中性弹窗 */
try{
  const __v41Overlay=renderOverlay;
  renderOverlay=function(){
    try{
      if(!v41IsExclusive()&&typeof ui!=='undefined'&&ui&&ui.storyEvent){
        v41InjectStyle();
        return v41NeutralOverlay(ui.storyEvent);
      }
    }catch(e){}
    return __v41Overlay();
  };
}catch(e){}

/* 文本替换字典会把「主线」改写成「专属故事」，未解锁时不该发生 */
try{
  const __v41Render=render;
  render=function(){
    __v41Render();
    try{
      if(v41IsExclusive())return;
      const root=document.getElementById('app')||document.body;
      if(!root||typeof document.createTreeWalker!=='function')return;
      const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      const nodes=[];
      while(w.nextNode())nodes.push(w.currentNode);
      nodes.forEach(n=>{
        let v=n.nodeValue;
        if(!v)return;
        /* 只回改「专属」类措辞，不动其它文案 */
        v=v.split('专属故事').join('生涯事件');
        v=v.split('专属剧情').join('生涯事件');
        n.nodeValue=v;
      });
    }catch(e){}
  };
}catch(e){}

window.__v41Debug={v41NeutralOverlay,v41IsExclusive};

})();
