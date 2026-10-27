
/* =====================================================================
   V4.8 · 剧情状态分支引擎（核心）
   开发者要求（原话）：
     「这个专属故事啊，你要动态的根据玩家目前游戏的现状来决定剧情，你懂吗？
       我姚明，明明健康状态没伤病，却给我脚步骨折的，还有我好好的没经历大伤病，
       却给我31岁退役的剧情，然后我点了退役也没退役，简直一团糟，你能不能检查
       所有剧情和当前游戏进度的关系啊，你预设多一些，到时候符合哪个用哪个啊，
       还有剧情一定要有连贯性，懂吗，彻底改掉」

   问题本质：章节正文全是「写死的假设」——
     第6章假定你受过脚伤、第8章假定你已经31岁要走下坡，
     但触发条件只看「打到多少场 / 第几季」，两者完全脱钩。

   本层提供四件东西：
     1) SNAP：把玩家真实状态算成一份快照（伤病/伤病史/年龄/评分档/球队/成就）
     2) PICK：按「从具体到宽泛」的优先级挑出最贴的那套变体，永不落到矛盾版本
     3) TONE：统一的阶段化措辞，保证不同变体读起来出自同一支笔
     4) 退役议题的前置判定（配合 v49：真的退役）
   ===================================================================== */
(function(){
if(window.__v48StoryDyn)return;window.__v48StoryDyn=true;

/* ---------- 0. 工具 ---------- */
const num=(v,d)=>{v=Number(v);return isFinite(v)?v:d};
const has=(v)=>{try{return v!=null&&v!==''}catch(e){return false}};

/* 腿脚部位关键词：姚明/奥登的伤病线都围绕这些 */
const LEG=/脚|踝|膝|腿|足|骨|跟腱|跖骨|舟骨/;
/* 重伤级 severity */
const SEV_MAJOR=['major','career-ending'];

/* ---------- 1. 状态快照 ---------- */
function v48InjuryHistory(){
  try{return Array.isArray(career&&career.injuryHistory)?career.injuryHistory:[]}catch(e){return []}
}
function v48Snap(){
  const c=career||{};
  const hist=v48InjuryHistory();
  const cur=c.injury||null;
  const majorCount=hist.filter(x=>x&&SEV_MAJOR.indexOf(x.severity)>=0).length;
  const legCount=hist.filter(x=>x&&LEG.test(String(x.name||''))).length;
  const curLeg=!!(cur&&LEG.test(String(cur.name||'')));
  const ovr=num(c.ovr,75);
  const age=num(c.age,22);
  const y=num(c.seasonNo,1);
  /* 评分档 */
  const tier=ovr>=93?'super':ovr>=87?'star':ovr>=80?'starter':'role';
  const tierZh={super:'巨星',star:'全明星',starter:'主力',role:'轮换'}[tier];
  /* 年龄档 */
  const ageBand=age>=31?'vet':age>=26?'prime':'young';
  const ageBandZh={vet:'老将',prime:'当打之年',young:'年轻'}[ageBand];
  /* 球队处境 */
  let teamMood='rebuild';
  try{
    const pw=num((typeof teamBy==='function'&&teamBy(c.team)||{}).power,80);
    const wp=c.games?num(c.wins,0)/num(c.games,1):.5;
    teamMood=pw>=89||wp>=.62?'contend':pw<80?'rebuild':'middle';
  }catch(e){}
  /* 成就 */
  const h=c.honors||{};
  const rings=num(h['总冠军'],0),mvps=num(h.MVP,0),allstar=num(h['全明星'],0);
  /* 是否正在走下坡（v49 写入；此处容错） */
  const declining=!!(c.v49&&c.v49.declining);
  return {
    ovr,age,y,tier,tierZh,ageBand,ageBandZh,teamMood,
    injury:cur,curLeg,curSev:cur?String(cur.severity||'minor'):'',
    injured:!!cur,
    majorCount,legCount,hist,histCount:hist.length,
    everMajor:majorCount>0,everLeg:legCount>0,
    rings,mvps,allstar,declining,
    /* 语义化小标：供变体条件直接读 */
    healthy:!cur,
    noMajor:majorCount===0,
    noLeg:legCount===0,
    peak:(ovr>=88&&!declining),
    fading:(declining||(age>=31&&ovr<86))
  };
}
window.v48Snap=v48Snap;

/* ---------- 2. 变体匹配 ----------
   变体：{when:snap=>bool, t, scene?, speaker?, cast?, b, stakes?, c}
   命中规则：按数组顺序取第一个 when 为真的；when 省略 = 兜底（永远为真）。
   这样作者只需把「最具体的」写在前面，把「兜底」写在最后。 */
function v48Pick(variants,snap){
  if(!Array.isArray(variants)||!variants.length)return null;
  for(const v of variants){
    try{
      if(typeof v.when!=='function')return v;      /* 兜底 */
      if(v.when(snap))return v;
    }catch(e){}
  }
  return variants[variants.length-1];
}
window.v48Pick=v48Pick;

/* ---------- 3. 把变体解析成「可直接渲染的章节」 ---------- */
/* 重要：变体里的 t/scene/b 可以是值或函数。函数一律以 (snap) 调用；
   若函数抛错（例如作者漏写了参数），必须让它「可见」——
   这里不静默回退到原章节（会导致「变体没生效却看不出原因」），
   而是把错误记进 window.__v48Errors，便于测试直接抓到。 */
window.__v48Errors=[];
function v48Safe(label,fn,fallback,snap){
  try{return fn(snap)}
  catch(e){
    try{window.__v48Errors.push(label+' → '+e.message)}catch(_){}
    return fallback;
  }
}
function v48Resolve(chapter,snap){
  const v=v48Pick(chapter.variants,snap);
  if(!v)return chapter;
  const pickVal=(x,fallback)=>{
    if(typeof x==='function')return v48Safe('value',x,fallback,snap);
    return x!=null?x:fallback;
  };
  const vid=String(v.id||'fallback');
  const baseT=()=>{try{return typeof chapter.t==='function'?chapter.t():chapter.t}catch(e){return ''}};
  const baseB=()=>{try{return typeof chapter.b==='function'?chapter.b():chapter.b}catch(e){return ''}};
  return {
    t:v48Safe('t['+vid+']',()=>pickVal(v.t,baseT()),'',snap),
    scene:v48Safe('scene['+vid+']',()=>pickVal(v.scene,(()=>{try{return typeof chapter.scene==='function'?chapter.scene():chapter.scene}catch(e){return ''}})()),'',snap),
    speaker:pickVal(v.speaker,chapter.speaker),
    cast:pickVal(v.cast,chapter.cast),
    b:()=>{
      if(typeof v.b==='function')return v48Safe('b['+vid+']',v.b,'',snap);
      if(typeof v.b==='string')return v.b;
      return baseB();
    },
    stakes:pickVal(v.stakes,chapter.stakes),
    c:chapter.c,
    _v48:true,_v48Variant:vid
  };
}
window.v48Resolve=v48Resolve;

/* ---------- 4. 注册表：playerId -> {chapterIndex: {variants:[...]}} ---------- */
const V48_REG={};
function v48Register(playerId,map){
  if(!playerId||!map)return;
  V48_REG[playerId]=V48_REG[playerId]||{};
  Object.assign(V48_REG[playerId],map);
}
window.v48Register=v48Register;
window.__v48Reg=V48_REG;

/* ---------- 5. 统一的阶段化措辞（保证多套变体像同一支笔写的） ---------- */
window.V48_TONE={
  /* 通用过渡：状态不明或都不符合时使用，永远安全 */
  neutral:(snap)=>{
    const s=snap||v48Snap();
    return `<p>这一段时间没有大起大落。你的${s.age}岁赛季按部就班地走着：训练、比赛、恢复，然后重复。</p>
<p>更衣室里的位置比上赛季稳了一些，教练组开始把一些不那么显眼的活交给你——挡拆落位、护框、在暂停时第一个说话。这些不会上新闻，但它们决定一支球队愿不愿意长期留一个人。</p>
<p>你偶尔会想起选秀那晚。现在的自己和那时的想象不完全一样，但你已经不再急着解释了。真正的问题不再是“我配不配”，而是“接下来这几年，我想把它打成什么样”。</p>`;
  }
};

window.__v48Debug={snap:v48Snap,pick:v48Pick,resolve:v48Resolve,registry:V48_REG,leg:LEG};

})();
