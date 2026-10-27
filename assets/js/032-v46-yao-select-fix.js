
/* =====================================================================
   V4.6 · 姚明选人流程卡死修复
   开发者报告：「点击就选姚明，开始准备，没反应，然后界面也点不动了」

   根因：
     专属天赋表 EX（renderTalents 用它取 boosts/mechanism）定义在早期 IIFE 内，
     只有 bennett/oden/kwame/fultz/simmons 五个键，**没有 yao**。
     点「开始准备」→ openTalents() → ui.screen='talents' → render() → renderTalents()
     → 读 EX['yao'].boost → 抛 TypeError。
     由于 ui.screen 已经切到 'talents'，之后每一次 render() 都派发到同一个崩掉的
     renderTalents，所以表现为「点了没反应，然后整个界面点不动」。

   修法：不改早期 IIFE（EX 外部不可达），改为在后期层包住 renderTalents /
     talentLivePanel——EX 里没有的球员走本层提供的等价模板。
     已登记的 5 位状元完全走原函数，行为零变化。
   ===================================================================== */
(function(){
if(window.__v46YaoSelectFix)return;window.__v46YaoSelectFix=true;

/* ---------- 1. EX 表缺失球员的等价描述（数值与 v45 实际生效的一致） ---------- */
const V46_FALLBACK={
  rose:{boost:{finishing:4,athleticism:6},extras:['一生 8 次超神机会，用一次少一次','常规赛 / 附加赛 / 季后赛都能用（含总决赛）','当场比赛：得分约 +30%、命中率 +6 点、赢球概率约 +10 个百分点','用完即止：不会再有任何额外惩罚'],mechanism:'玫瑰之名 · 八次超神：他天生第一步与终结顶级、投射上限低于同档；把仅有的八次机会留给你最想改写的那几场。'},
  yao:{
    boost:{durability:8,defense:2,rebounding:2},
    extras:['脚部伤病概率 −70%','休赛期健康 +12 · 耐久 +2','高负荷自动回补健康'],
    mechanism:'脚部耐久壁垒：脚部与下肢的伤病概率大幅下降；每个休赛期身体自动回补；单场高负荷会累计并被及时拉回，退役年龄明显延后。'
  }
};
/* 球员专属天赋的显示名优先取球员对象上的 exclusive（与解锁页、结局页一致） */
function v46Fallback(id){
  const f=V46_FALLBACK[id];
  if(!f)return null;
  let p=null;
  try{p=playerBy(id)}catch(e){}
  return {
    boost:f.boost,
    extras:f.extras,
    mechanism:f.mechanism,
    name:(p&&p.exclusive&&p.exclusive.n)||id
  };
}
function v46BoostText(f,sep){
  return Object.entries(f.boost).map(([k,v])=>`${ATTR[k]}+${v}`).join(sep);
}

/* ---------- 2. 天赋页（与 v221 模板同构，只把 ex 换成等价描述） ---------- */
function v46TalentsPage(p,f){
  const draw=ui.talentDrawCount||1,freeLeft=Math.max(0,3-draw);
  const boosts=[v46BoostText(f,' · ')].concat(f.extras).join(' · ');
  return `<section class="pre"><div class="pre-top"><button class="circle-btn" onclick="ui.screen='select';render()">←</button><strong>${p.zh} · 命运天赋</strong><span style="width:36px"></span></div><div class="pre-intro"><small>本局天赋</small><h2>先把最致命的短板补上</h2><p>3次免费抽取。用完后可看奖励视频继续刷新；两个奖励入口都放在这里，选择后会立即生效。</p></div><div class="v221-ad-stack"><div class="v221-exclusive-ad"><small>球员专属 · 直到退役</small><h2>${f.name}</h2><p>${boosts}</p><b>${f.mechanism}</b><div><span>✓ 开局立即生效</span><span>✓ 局内持续生效</span><span>✓ 解锁从选秀夜到退役的专属故事</span></div><div class="v221-ad-story"><b>专属故事 · 看广告一并解锁</b><p>解锁后，从真实职业生涯的关键节点开始；你的每次选择都会改变人物关系、球队角色、合同、季后赛和最终结局。</p><em>不看广告＝本局只有纯模拟，不会出现${p.zh}的专属剧情、专属选择和剧情分歧。</em></div><button onclick="unlockExclusive()">${ui.exclusive?'✓ 已获得 · 专属天赋加持中':'🎬 看奖励视频 · 解锁专属天赋'}</button></div><div class="v221-takeall-ad"><div><small>奖励视频</small><h3>四张随机天赋 · 一次全部拿下</h3><p>不用做取舍，当前4张直接全部加入本局。</p></div><button onclick="takeAll()">${ui.allTalents?'✓ 已全部获得':'🎬 看奖励视频 · 全部拿下'}</button></div></div><div class="v210-drawbar"><div><small>免费抽取</small><b>${draw<=3?`${draw}/3`:`额外刷新 ×${ui.talentAdRefreshes||0}`}</b></div><button onclick="refreshTalentPool()">${freeLeft>0?`免费刷新 · 还剩${freeLeft}次`:'看奖励视频 · 再刷一组'}</button></div><div class="talent-wrap"><div class="talent-grid">${ui.talents.map((t,i)=>`<button class="talent-card ${qClass(t.r)} ${ui.talentPick===i?'selected':''}" onclick="ui.talentPick=${i};render()"><div class="rarity">${t.r}</div><h3>${t.n}</h3><p>${t.d}</p><div class="ghost">0${i+1}</div></button>`).join('')}</div></div><div class="sticky-cta"><button class="btn primary" onclick="enterDraft()">进入选秀之夜</button></div></section>`;
}

/* 只拦「EX 里没有、且本层已登记等价描述」的球员：
   原有 5 位状元走原函数，渲染结果与修复前逐字节一致。 */
try{
  const __v46RenderTalents=renderTalents;
  renderTalents=function(){
    try{
      return __v46RenderTalents();
    }catch(e){
      let p=null,f=null;
      try{p=playerBy(ui.selected);f=p?v46Fallback(p.id):null}catch(_){}
      if(f)return v46TalentsPage(p,f);
      throw e;
    }
  };
}catch(e){}

/* ---------- 3. 赛季页天赋面板：让姚明的天赋在局内可见 ---------- */
try{
  const __v46Panel=talentLivePanel;
  talentLivePanel=function(){
    let html='';
    try{html=__v46Panel()}catch(e){html=''}
    try{
      const pid=career&&career.playerId;
      const f=v46Fallback(pid);
      const on=!!(career&&career.exclusive&&(career.talents||[]).indexOf(pid+'_x')>=0);
      if(f&&on&&String(html).indexOf('v221-exclusive-live')<0){
        const boosts=Object.entries(f.boost).map(([k,v])=>`<span>${ATTR[k]} +${v}</span>`).join('');
        const block=`<div class="v221-exclusive-live"><div class="v221-live-top"><div><small>专属天赋</small><b>${f.name}</b></div><strong>天赋加持中</strong></div><div class="v221-boosts">${boosts}</div><p>${f.mechanism}</p><em>${f.extras.join(' · ')}${career.exclusiveRuntime&&career.exclusiveRuntime.lastProc?`<br>最近一次：${career.exclusiveRuntime.lastProc}`:''}</em></div>`;
        const anchor='<div class="v26-live-talent-grid">';
        html=String(html).indexOf(anchor)>=0?String(html).replace(anchor,block+anchor):block+String(html);
      }
    }catch(e){}
    return html;
  };
}catch(e){}

/* ---------- 3.5 顺带修正：天赋页显示的天赋名是旧的 ----------
   背景：EX 表（早期 IIFE，外部不可达）里 kwame/fultz 还写着旧名
        「不世出的少年天才」「投篮之神」，而 v43 已把球员对象上的名字改成
        开发者最终确定的「神选之子」「终极射手」。选人页/剧情锁/结局页读的都是
        球员对象，于是同一个天赋在天赋页和选人页出现两个名字。
   处理：天赋页的名字统一以球员对象为准（所有页面单一事实源）。
        只改显示名，不动加成数值与机制文案（那些是真实生效的）。 */
const V46_STALE_NAMES={'不世出的少年天才':'神选之子','投篮之神':'终极射手'};
function v46FixNames(html){
  let s=String(html||'');
  for(const oldN in V46_STALE_NAMES){
    if(s.indexOf(oldN)>=0)s=s.split(oldN).join(V46_STALE_NAMES[oldN]);
  }
  return s;
}
try{
  const __v46Names=renderTalents;
  renderTalents=function(){
    let p=null;
    try{p=playerBy(ui.selected)}catch(e){}
    const realName=(p&&p.exclusive&&p.exclusive.n)||null;
    let html=__v46Names();
    try{
      if(realName){
        /* 把「球员专属」卡片里的 h2（旧名）替换成球员对象上的权威名 */
        const before=html;
        html=html.replace(/(球员专属 · 直到退役<\/small><h2>)[^<]*(<\/h2>)/,`$1${realName}$2`);
        if(html===before)html=v46FixNames(html);   /* 结构不符时退回全局替换旧名 */
      }
    }catch(e){}
    return html;
  };
}catch(e){}

/* ---------- 3.6 局内飘窗里的旧天赋名（十九岁重开 / 原装回归） ---------- */
try{
  const __v46Pop=window.v222Pop;
  if(typeof __v46Pop==='function'){
    window.v222Pop=function(title,body){
      return __v46Pop(v46FixNames(title),v46FixNames(body));
    };
  }
}catch(e){}

/* ---------- 4. 选秀之夜文案：draftLines 没有 yao 键，返回 undefined 会让 renderDraft 崩 ---------- */
try{
  const __v46DraftLines=draftLines;
  draftLines=function(p){
    const r=__v46DraftLines(p);
    if(Array.isArray(r)&&r.length)return r;
    /* 玩家对象兜底：id 不是已知状元时，用真实选秀夜文案 */
    const id=(p&&p.id)||'';
    const zh=(p&&p.zh)||'';
    const en=(p&&p.en)||'';
    const year=(p&&p.year)||'';
    return [
      `${year}年。`,
      '休斯顿握着第一顺位。',
      '一个两米二六的中锋站在台下，他不来自美国大学体系。',
      `${en}.`,
      '状元。',
      '质疑声几乎和掌声同时响起：他能跟上NBA的节奏吗？',
      '这一次，先让他健康地打完。'
    ];
  };
}catch(e){}

/* ---------- 5. 赛季成长：两处「按球员 id 查表」缺 yao 键会直接抛错 ----------
   浸泡测试（多赛季连打）抓到：
     L578-579 v23PrimaryGrowth：map 为 undefined → map.forEach 抛错。
               这是「赛季第 20/60 场」的成长事件，**每个赛季都会命中**，
               所以姚明打到第 20 场就会中断模拟。
     L695-696 另一处成长结算：maps 为 undefined → maps[i%maps.length] 抛错。
     L1006    v231SeasonGrowth 的 learn 天赋：career.attrs[undefined] 静默无效。
   这三处都在早期 IIFE 内、表结构不可达，因此改为在赛季成长的入口统一兜底：
   姚明没有登记成长侧重表时，按「内线」给一组合理默认（终结/篮板/防守/耐久）。 */
try{
  const __v46Primary=typeof v23PrimaryGrowth==='function'?v23PrimaryGrowth:null;
  if(__v46Primary){
    v23PrimaryGrowth=function(){
      try{return __v46Primary()}
      catch(err){
        try{
          if(career&&career.playerId==='yao'){
            ['finishing','rebounding','defense','durability'].forEach(k=>{
              if(career.attrs[k]!=null)career.attrs[k]=clamp(career.attrs[k]+1,30,99);
            });
            career.trust=clamp(career.trust+3);
            career.confidence=clamp(career.confidence+2);
            career.usageBoost=clamp(career.usageBoost+1.2,0,9);
            if(typeof syncOvr==='function')syncOvr();
            return;
          }
        }catch(e){}
        throw err;
      }
    };
  }
}catch(e){}

/* v231SeasonGrowth：learn 天赋的 map 缺键 —— 已有 v45 的 try/catch 兜底，
   这里再补上「姚明走内线四项」的等价成长，保证天赋不会静默失效。 */
try{
  const __v46SeasonGrowth=typeof v231SeasonGrowth==='function'?v231SeasonGrowth:null;
  if(__v46SeasonGrowth){
    v231SeasonGrowth=function(result){
      try{return __v46SeasonGrowth(result)}
      catch(err){
        try{
          if(career&&career.playerId==='yao'&&typeof hasTalent==='function'&&hasTalent('learn')&&career.age<24){
            ['finishing','rebounding','defense','durability'].forEach(k=>{
              if(career.attrs[k]!=null)career.attrs[k]=clamp(career.attrs[k]+1,30,99);
            });
            if(typeof syncOvr==='function')syncOvr();
            return;
          }
        }catch(e){}
        throw err;
      }
    };
  }
}catch(e){}

window.__v46YaoFixDebug={fallback:v46Fallback,table:Object.keys(V46_FALLBACK)};

})();
