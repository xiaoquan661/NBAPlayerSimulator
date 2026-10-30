
(function(){
  function cleanAssetTitle(t){
    t=String(t||'').replace(/[【】]/g,'').replace(/^素材位[:：]?/,'').trim();
    return t||'视觉画面';
  }
  // All empty-art areas remain obvious, but no longer expose production instructions.
  // 有对应图片时直接渲染图片；没有图片才回退到友好占位框。
  asset=function(title,desc,cls=''){
    /* 2026-10-27：三张场景停用，不显示任何占位框 */
    if(/常规赛结束阶段主视觉|联盟页面顶部主视觉|联盟排名页面主视觉|本章剧情CG|本章剧情插图|该主线章节剧情插图|剧情插图/.test(String(title||'')))return '';
    const t=cleanAssetTitle(title);
    let friendly=t.replace(/主视觉/g,'主视觉').replace(/人物立绘/g,'人物形象').replace(/奖杯图标/g,'荣誉徽章');
    const ph=`<div class="asset-fallback"><b>${esc(friendly)}</b><span>画面将在这里呈现</span></div>`;
    const file=typeof assetFile==='function'?assetFile(title):null;
    if(file)return `<div class="asset-slot v212-asset ${cls} has-img"><img src="${file}" alt="${esc(String(title))}" loading="lazy" decoding="sync" onerror="this.parentNode.classList.remove('has-img');this.remove()">${ph}</div>`;
    return `<div class="asset-slot v212-asset ${cls}">${ph}</div>`;
  };

  renderHome=function(){
    let s=load();
    return `<section class="case-cover v212-cover">
      <div class="game-cover-head"><span class="eyebrow">REWRITE THE CAREER</span><span class="edition">五位状元 · 五种命运</span></div>
      <div class="game-logo-wrap"><h1 class="game-logo">拯救<span class="gold">水货状元</span></h1></div>
      <p class="game-tagline">历史已经写下结局。<b>这一次，由你把他们重新带回巅峰。</b></p>
      <div class="cover-poster">
        ${asset('封面主视觉','', 'tall')}
        <div class="poster-footer"><span>本内特</span><span>奥登</span><span>夸梅</span><span>富尔茨</span><span>西蒙斯</span></div>
      </div>
      <div class="cover-promise">
        <div><b>从选秀夜开始</b><span>亲手走过完整职业生涯</span></div>
        <div><b>每一年都不同</b><span>伤病、交易、荣誉与关键比赛</span></div>
        <div><b>直到自然退役</b><span>看看你最终能把他带到哪里</span></div>
      </div>
      <div class="case-actions"><button class="btn primary" onclick="startSelect()">开始拯救生涯 →</button>${s?`<button class="btn secondary" onclick="continueSave()">继续 ${esc((playerBy(s.playerId)||{}).zh||'未知球员')} · ${s.seasonYear}-${String((s.seasonYear+1)%100).padStart(2,'0')}</button>`:''}</div>
    </section>`;
  };

  // More natural scenario copy.
  renderSelect=function(){let p=playerBy(ui.selected);return `<section class="pre v212-natural-copy"><div class="pre-top"><button class="circle-btn" onclick="ui.screen='home';render()">←</button><strong>选择你的第一位状元</strong><span style="width:36px"></span></div><div class="pre-intro"><h2>12位球员，12种生涯</h2><p>有人输给伤病，有人迷失在压力里，也有人明明拥有顶级天赋，却始终没跨过最后一道坎。选一个人，把他的故事重新走一遍。</p></div><div class="scenario-deck">${P.map(x=>`<button class="scenario-card ${ui.selected===x.id?'selected':''}" onclick="ui.selected='${x.id}';render()">${asset(`${x.zh}人物形象`,'')}<div><div class="meta">${x.year} · ${teamBy(x.team).name} · ${x.pos}</div><h3>${x.zh}</h3><p><b>${x.title}</b><br>${x.tagline}</p><div class="scenario-tags">${x.tags.map(t=>`<span>${t}</span>`).join('')}</div><div class="scenario-ovr"><b>${x.ovr}</b><small>当前能力</small></div></div></button>`).join('')}</div><div class="sticky-cta"><button class="btn primary" onclick="openTalents()">就选 ${p.zh} · 开始准备 →</button></div></section>`};

  // Natural talent-page wording: no adapter/test/interface language.
  const _talentRender=renderTalents;
  renderTalents=function(){
    let h=_talentRender();
    const map=[
      ['DESTINY TALENTS · 68 CARDS','命运天赋 · 68种可能'],
      ['本局共有3次免费天赋抽取机会。当前第','开局共有3次免费刷新机会。当前第'],
      ['免费次数用完后，可看广告继续刷新。','免费次数用完后，还可以通过奖励视频再换一组。'],
      ['广告刷新','额外刷新'],
      ['状元专属 · 本局最关键广告','状元专属 · 本局最值得拿下'],
      ['刚需机制直接补齐','直击他的致命短板'],
      ['局内持续触发','整个生涯持续生效'],
      ['解锁直到退役 · 每赛季专属剧情','解锁直到退役的完整专属故事'],
      ['🎬 立即拿下 · 这才是真正的改命局','🎬 立即拿下 · 把真正的他救回来'],
      ['奖励视频 · 就在专属天赋下面','额外奖励'],
      ['专属剧情说明','这条故事会发生什么'],
      ['主线以真实选秀、伤病、球队关系、季后赛与交易节点为锚点改编；现实人物与事件基于真实经历，人物对白和玩家改写后的分支属于平行世界戏剧化演绎。','故事从他的真实职业经历出发。随着你的选择改变结果，后面的命运也会彻底走向新的方向。'],
    ];
    for(const [a,b] of map) h=h.split(a).join(b);
    return h;
  };

  const _storyView=storyView;
  storyView=function(){
    let h=_storyView();
    const map=[
      ['EXCLUSIVE CAMPAIGN','专属故事'],
      ['当前世界线倾向','现在的人生走向'],
      ['当前章节；只有达到属于这个剧本的条件才会触发。','这一章正在等待属于它的时刻。'],
      ['已经写入你的世界线。','这段经历已经成为生涯的一部分。'],
      ['尚未解锁。','未来仍未揭晓。'],
      ['LIFELONG CHARACTER SAGA','一生的故事'],
      ['前期沿真实经历改编；一旦世界线分叉，后续会根据你的球队、数据、合同、队友关系和此前选择原创，不再强行复刻现实。','故事从真实经历开始。等你改变了他的命运，后面的人生就会沿着你的选择继续写下去。'],
      ['已写入世界线','已经发生']
    ];
    for(const [a,b] of map) h=h.split(a).join(b);
    return h;
  };

  const _mainline=mainlineNowCard;
  mainlineNowCard=function(){let h=_mainline();return h
    .replace(/SEASON EXCLUSIVE EPISODE/g,'本季专属故事')
    .replace(/待触发/g,'等待发生')
    .replace(/本赛季一定会出现至少1个([^。]+)专属剧情。核心历史线结束后，故事会读取当前球队、合同、数据、关系、荣誉和此前分支继续原创。/g,'这个赛季还会发生属于$1的独特故事。过去的选择、现在的球队和场上表现，都会决定它会走向哪里。')
    .replace(/已有剧情赛季/g,'已有故事赛季')
    .replace(/剧情名场面/g,'生涯名场面')
    .replace(/剧情合同节点/g,'重要合同')};

  const _archive=careerArchiveView;
  careerArchiveView=function(){let h=_archive();return h
    .replace(/专属剧情合同 \/ 身份节点/g,'重要合同与身份变化')
    .replace(/剧情中的大合同、底薪与关键身份变化会记录在这里。/g,'大合同、底薪、被扶正和角色变化都会留在这里。')};
  legacyView=careerArchiveView;

  // Final pass over visible UI copy only.
  const _render=render;
  render=function(){
    _render();
    const root=document.getElementById('app')||document.body;
    const exact={
      '当前世界线倾向':'现在的人生走向',
      '分歧树':'生涯分岔',
      '世界线':'命运轨迹',
      '主线':'专属故事',
      '触发':'发生',
      '触发条件':'出现条件',
      '机制':'效果',
      '数值':'能力',
      '判定':'结果',
      '测试':'试玩',
      '开发':'',
      '接口':'',
      '适配':'',
      'BUFF':'加成',
      'DEBUFF':'影响'
    };
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(n=>{let v=n.nodeValue;for(const [a,b] of Object.entries(exact))v=v.split(a).join(b);n.nodeValue=v});
  };

const __v213RenderHome=renderHome;
renderHome=function(){let s=load();return `<section class="cover cover-v214"><div class="cover-topline"><span>五位状元 · 五次重来</span><i></i></div><div class="cover-title-v214"><h1><b>拯救</b><em>水货状元</em></h1><p>选一个被历史判了结局的人，把他的职业生涯重新打一遍。</p></div><div class="cover-hero-v214">${asset("选秀之夜舞台背景","选秀舞台灯光与观众虚化背景","tall")}<div class="cover-hero-caption"><strong>从状元夜开始</strong><span>常规赛 · 全明星 · 伤病 · 交易 · 季后赛 · 退役</span></div></div><div class="cover-story-strip"><span>本内特</span><span>奥登</span><span>夸梅</span><span>富尔茨</span><span>西蒙斯</span></div><div class="cover-actions"><button class="btn primary cover-main-cta" onclick="startSelect()">开始改写生涯</button>${s?`<button class="btn secondary" onclick="continueSave()">继续 ${esc((playerBy(s.playerId)||{}).zh||'未知球员')} · ${s.seasonYear}-${String((s.seasonYear+1)%100).padStart(2,'0')}</button>`:''}<div class="tiny" style="text-align:center">每一次选择，都会留下真正的职业生涯后果。· 修订版 61</div></div></section>`};
window.pickStoryChoice=function(i){try{if(typeof storyChoice==='function')storyChoice(i);}catch(err){console.error(err);ui.toast='这段故事暂时没有接上，已经为你重新打开当前章节';save&&save();render&&render();}};
const __v213StoryChoice=storyChoice;
storyChoice=function(i){
 try{
  if(!ui.storyEvent||!career)return;
  if(typeof v28Init==='function')v28Init();
  if(typeof v211Init==='function')v211Init();
  let raw=ui.storyEvent;
  let ev=(typeof v28Event==='function')?v28Event(raw):raw;
  let ch=ev&&ev.c&&ev.c[i];
  if(!ch)return;
  let before=(typeof impactSnapshot==='function')?impactSnapshot():null;
  if(typeof applyFx==='function')applyFx(ch[2]||{});
  if(typeof v28ApplyFlags==='function')v28ApplyFlags(ch[2]||{});
  let after=(typeof impactSnapshot==='function')?impactSnapshot():null;
  let imp=(before&&after&&typeof impactDiff==='function')?impactDiff(before,after):[];
  if(typeof ensureWorldline==='function')ensureWorldline();
  if(!career.storyLog)career.storyLog=[];
  if(!career.worldline||!career.worldline.choices)ensureWorldline();
  let isLong=!!raw._longArc;
  let isSide=!!raw._sideEvent;
  if(isLong){if(!career.worldline.longArcSeasons.includes(career.seasonNo))career.worldline.longArcSeasons.push(career.seasonNo);} else if(!isSide){career.storyIndex=(career.storyIndex||0)+1;}
  let rec={seasonNo:career.seasonNo,label:seasonLabel(),title:ev.t,scene:ev.scene,choice:ch[0],detail:ch[1],impact:(imp&&imp.length?imp.join(' · '):ch[1]),long:isLong,route:(typeof v28Route==='function'?v28Route():'未定'),cast:Array.isArray(ev.cast)?ev.cast.join(' / '):(ev.cast||'')};
  career.storyLog.push(rec);
  career.worldline.choices.push(rec);
  career.feed.unshift(`专属故事「${ev.t}」：${ch[0]}。${imp&&imp.length?imp.join('、'):ch[1]}`);
  career.lastStoryGame=career.games;
  career.lastStorySeason=career.seasonNo;
  if(career.exclusive&&typeof v211MarkSeasonStory==='function')v211MarkSeasonStory();
  let narrative=ch[2]&&ch[2].narrative;
  if(career.exclusive&&narrative&&typeof v211ApplyNarrative==='function')v211ApplyNarrative(narrative,ev,ch);
  ui.storyEvent=null;
  let follow=(career.storyIndex>=((campaigns[career.playerId]||[]).length||0))?'核心篇章已经走完，接下来每个赛季还会继续写出只属于你的故事。':'下一章会记住这次选择，并顺着这条路继续发展。';
  ui.modal={kind:'storyOutcome',data:{title:ev.t,choice:ch[0],effect:ch[1],impact:imp||[],follow}};
  career.fanHeat=Math.round(career.fanHeat||0);
  career.gmSatisfaction=Math.round(career.gmSatisfaction||0);
  career.trust=Math.round(career.trust||0);
  save&&save();
  render&&render();
 }catch(err){
  console.error(err);
  ui.toast='这段故事暂时没有接上，已经回到当前章节';
  save&&save();
  render&&render();
 }
};
const __v213OverlayBase=renderOverlay;
renderOverlay=function(){
 if(ui.storyEvent){
   // 进入生涯时旧层会短暂挂上首章；未解锁专属故事时直接交回普通界面，避免开局被剧情层打断。
   if(career && !career.exclusive) return __v213OverlayBase();
   let e=(typeof v28Event==='function')?v28Event(ui.storyEvent):ui.storyEvent;
   if(e && typeof e.c==='function') e.c=e.c();
   if(e && typeof e.cast==='function') e.cast=e.cast();
   if(e && typeof e.b==='function') e.b=e.b();
   if(e && typeof e.stakes==='function') e.stakes=e.stakes();
   const choices=Array.isArray(e?.c)?e.c:[];
   let idx=Math.min((career.storyIndex||0)+1,((campaigns[career.playerId]||[]).length||1)),cast=Array.isArray(e?.cast)?e.cast:[];
   return `<div class="overlay"><div class="sheet v28-sheet"><div class="sheet-handle"></div><div class="v28-scene-top"><div><small>专属故事</small><h2>${e?.t||'职业生涯故事'}</h2></div><span>${idx}/${((campaigns[career.playerId]||[]).length||idx)}</span></div>${asset('剧情插图','训练馆、更衣室、赛后通道、管理层办公室等剧情画面')}<div class="v28-cast-tags">${cast.map(x=>`<span>${x}</span>`).join('')}</div><div class="v28-speaker">${e?.speaker||'命运时刻'}</div><p class="v28-body">${e?.b||''}</p><div class="v28-stakes"><b>这次选择会改变什么</b><span>${e?.stakes||'这次选择会影响后续故事和关系。'}</span><em>当前路线：${typeof v28Route==='function'?v28Route():'未定'}</em></div><div class="choice-list">${choices.map((c,j)=>`<button type="button" class="choice v28-choice" onclick="pickStoryChoice(${j});return false;"><b>${c[0]}</b><span>${c[1]}</span><i>不同选择会通往不同后续</i></button>`).join('')}</div>${choices.length?'':'<div class="tiny">这段故事正在整理，返回赛季后可继续生涯。</div>'}<div class="sheet-footer"><span>后面的故事会记住你现在的决定</span><span>${currentP().exclusive.n}</span></div></div></div>`;
 }
 return __v213OverlayBase();
};
const __v213Render=render;
render=function(){
 __v213Render();
 const root=document.getElementById('app')||document.body;
 const exact={'当前世界线倾向':'现在的人生走向','分歧树':'生涯分岔','世界线':'命运轨迹','主线':'专属故事','触发':'发生','触发条件':'出现条件','机制':'效果','数值':'能力','判定':'结果','测试':'试玩','开发':'','接口':'','适配':'','BUFF':'加成','DEBUFF':'影响','EXCLUSIVE STORY LOCKED':'专属故事未解锁','PREMIUM MAINLINE':'专属故事','PREMIUM CHARACTER CAMPAIGN':'专属故事','ORIGINAL HISTORY × YOUR CAREER':'现实轨迹 × 你的生涯','ORIGINAL HISTORY × YOUR WORLDLINE':'现实轨迹 × 你的生涯','CAREER STORY':'专属故事','SEASON EXCLUSIVE EPISODE':'本季专属故事','COMPLETE CAREER DATABASE':'完整生涯档案','CAREER REWRITE':'','单文件版 · 双击即玩':'','用途：':'','透明PNG':'','本章剧情CG':'剧情插图','本章剧情插图':'剧情插图'};
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT); const nodes=[]; while(walker.nextNode())nodes.push(walker.currentNode);
 nodes.forEach(n=>{ let v=n.nodeValue; for(const [a,b] of Object.entries(exact)) v=v.split(a).join(b); v=v.replace(/平行世界/g,'故事世界'); v=v.replace(/核心历史线结束后，故事会读取当前球队、合同、数据、关系、荣誉和此前分支继续原创。/g,'核心篇章结束后，故事会继续顺着你当下的球队、合同、数据、关系和过往选择写下去。'); n.nodeValue=v; });
};
const st=document.createElement('style');
st.textContent=`.cover:before{content:"" !important}.cover-premium{background:radial-gradient(circle at 82% 10%,rgba(204,49,49,.18),transparent 28%),radial-gradient(circle at 14% 24%,rgba(255,213,130,.18),transparent 32%),linear-gradient(180deg,#fffaf3 0%,#f7e7cf 58%,#f0dbc0 100%)!important}.cover-kicker{gap:8px}.cover-kicker b{font-size:12.5px;color:#9b6a46;letter-spacing:.08em}.cover-kicker span{font-size:10.5px;color:#7e6857;background:rgba(255,255,255,.78);border:1px solid #e8d3bf}.premium-title small{display:block;font-size:11.5px;color:#9a7358;letter-spacing:.04em}.premium-logo{margin:10px 0 12px!important;font-size:44px!important;line-height:1!important;letter-spacing:0!important;white-space:nowrap!important}.premium-logo span{display:inline-block;padding:.08em .18em .12em;border-radius:18px;background:linear-gradient(180deg,#ffe6a2 0%,#f6be55 42%,#d86b2f 100%);color:#fff7da;-webkit-text-stroke:1.2px #7e241f;text-shadow:0 2px 0 rgba(100,24,24,.55),0 6px 20px rgba(146,53,33,.25);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 10px 26px rgba(122,49,32,.18)}.premium-cover-art .asset-slot{background:linear-gradient(145deg,rgba(255,255,255,.72),rgba(255,243,223,.92))!important;border:1px dashed #e8ceb2}.choice{cursor:pointer}.choice:active{transform:scale(.99)}.sheet small,.v28-cast-tags span,.v28-speaker,.sheet-footer span,.v28-stakes em{text-transform:none}.v28-scene-top small,.cover-kicker b,.cover-title small{font-family:inherit}@media(max-width:370px){.premium-logo{font-size:37px!important}}`;
document.head.appendChild(st);
// V2.16 剧情动态文案统一解析：任何函数字段必须先得到最终文字，再允许进入界面。
function v216ResolveValue(v, fallback=''){
  let guard=0;
  while(typeof v==='function' && guard<8){
    try{ v=v(); }catch(e){ console.error('story resolve failed',e); return fallback; }
    guard++;
  }
  if(v==null) return fallback;
  return v;
}
function v216ResolveText(v,fallback=''){
  v=v216ResolveValue(v,fallback);
  if(Array.isArray(v)) return v.map(x=>String(v216ResolveValue(x,''))).join(' / ');
  if(typeof v==='object') return fallback;
  let s=String(v);
  // 最后一层保险：代码片段绝不直接展示给玩家。
  if(/=>|\bcareer\.|\bui\.|\bF\(|\breturn\b|function\s*\(/.test(s)){
    console.error('blocked code leak in story text:',s);
    return fallback;
  }
  return s;
}
function v216ResolveChoices(v){
  v=v216ResolveValue(v,[]);
  if(!Array.isArray(v)) return [];
  return v.map(c=>{
    c=v216ResolveValue(c,[]);
    if(!Array.isArray(c)) return null;
    return [v216ResolveText(c[0],'继续'),v216ResolveText(c[1],'这个选择会影响后续故事。'),c[2]||{}];
  }).filter(Boolean);
}
const __v216EventBase = typeof v28Event==='function' ? v28Event : (x=>x);
v28Event=function(ev){
  let raw=ev||{};
  // 不依赖旧解析器，避免旧层只解析到一半。
  let out={...raw};
  out.t=v216ResolveText(raw.t,'职业生涯故事');
  out.scene=v216ResolveText(raw.scene,'职业生涯');
  out.speaker=v216ResolveText(raw.speaker,'命运时刻');
  let cast=v216ResolveValue(raw.cast,[]);
  out.cast=Array.isArray(cast)?cast.map(x=>v216ResolveText(x,'')).filter(Boolean):[];
  out.b=v216ResolveText(raw.b,'这一刻会影响接下来的职业生涯。');
  out.stakes=v216ResolveText(raw.stakes,'这次选择会改变后续故事和关系。');
  out.c=v216ResolveChoices(raw.c);
  return out;
};
function v216NoCodeLeak(root){
  root=root||document.getElementById('app')||document.body;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),bad=[];
  while(walker.nextNode()){
    const n=walker.currentNode,s=n.nodeValue||'';
    if(/=>|\bcareer\.|\bui\.|\bF\(|\breturn\b|function\s*\(/.test(s)) bad.push(n);
  }
  bad.forEach(n=>{console.error('removed leaked code text:',n.nodeValue);n.nodeValue='';});
  return bad.length;
}
window.__v216AuditCurrent=function(){
  const bad=[],scan=(e,label)=>{try{let x=v28Event(e);let vals=[x.t,x.scene,x.speaker,x.b,x.stakes,...(x.cast||[])];(x.c||[]).forEach(c=>vals.push(c[0],c[1]));vals.forEach(v=>{let z=String(v??'');if(/=>|\bcareer\.|\bui\.|\bF\(|\breturn\b|function\s*\(/.test(z))bad.push({label,text:z})});}catch(err){bad.push({label,error:String(err)})}};
  try{(campaigns[career.playerId]||[]).forEach((e,i)=>scan(e,'core-'+(i+1)));}catch(err){bad.push({label:'core-list',error:String(err)})}
  try{(v211SagaPool()||[]).forEach((x,i)=>scan(x.make(),'saga-'+x.id));}catch(err){bad.push({label:'saga-list',error:String(err)})}
  try{scan(v211GeneratedSaga(),'generated-saga');}catch(err){bad.push({label:'generated',error:String(err)})}
  try{scan(makeV211Game7Event(),'game7');}catch(err){bad.push({label:'game7',error:String(err)})}
  return bad;
};
const __v216Render=render;
render=function(){
  __v216Render();
  v216NoCodeLeak(document.getElementById('app')||document.body);
};

  render();
})();
