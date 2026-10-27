
/* =====================================================================
   V3.9 · 四项体验修正
   ① 不解锁专属剧情时仍出现专属内容   → 每开一局重新解锁要真正生效
   ② 79 评分却场均 79.2+8.5+2.8      → 数据可信度校验与自愈
   ③ 连续失误显示 (4/3)              → 计数封顶 + 不再显示该计数（开发者定）
   ④ 满意度/信任/球迷全 100%          → 赢球加分、输球减分（开发者定）
   每个问题都先实测复现过，根因见下。
   ===================================================================== */
(function(){
if(window.__v39Fixes)return;window.__v39Fixes=true;

const v39clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const v39num=(v,fallback,lo,hi)=>{const n=Number(v);return isFinite(n)?v39clamp(n,lo,hi):fallback};

/* =====================================================================
   ① 解锁状态跨局泄漏
   根因：ui.exclusive 只在「选人页 → 天赋页」那一个入口重置；从退役页
         「换一个状元重新开始」回到首页再开一局时，上一局的解锁状态会被
         直接带进新的一局（实测：第二局未看广告，career.exclusive 仍为
         true，天赋里还带着 _x 专属天赋）。刷新页面因 ui 重新初始化而正常，
         所以表现为时有时无。
   修法：建号（createCareer）用掉 ui.exclusive 之后立刻清零——解锁只在
         本局有效，下一局必须重新解锁。这是「每开一局都要重新解锁」的
         正确落地。
   ===================================================================== */
try{
  const __v39Create=createCareer;
  createCareer=function(){
    __v39Create();
    /* 本局的解锁状态已经写进 career.exclusive / career.talents，
       这里清掉 ui 上的标记，避免被带进下一局 */
    ui.exclusive=false;
    ui.allTalents=false;
  };
}catch(e){}

/* =====================================================================
   ② 数据可信度：statExpect 产生 NaN，以及存档脏值直接上屏
   根因 A：statExpect 的最终生效层引用了 strength / steals / blocks 三个
           **不存在的属性**（游戏只有 8 项有效属性，这 3 个键会被
           v32CleanJunkAttrs 清除）→ (undefined-70)*.018 = NaN →
           篮板/抢断/盖帽期望值全是 NaN，开赛前就被写进赛季统计。
   根因 B：赛季场均字段在某些路径下会被写成累计值；旧存档字段缺失时
           Math.max(1, undefined) = NaN。页面完全没有合理性校验，
           存档里是什么就直接显示什么（实测能显示场均 79.2 / 449.8 等）。
   修法：① 在最外层把 statExpect 的返回值统一消毒（有限数 + 合理区间）；
         ② 读取存档时做一次自愈：字段缺失补齐、越界归位、场均与累计互校。
   ===================================================================== */
try{
  const __v39Stat=statExpect;
  statExpect=function(){
    let x=null;
    try{x=__v39Stat()}catch(e){x=null}
    if(!x||typeof x!=='object')x={};
    /* 篮球比赛的单场合理区间：得分 0~45、篮板 0~25、助攻 0~20、抢断/盖帽 0~10 */
    return{
      pts:v39num(x.pts,5,0,45),
      reb:v39num(x.reb,4,0,25),
      ast:v39num(x.ast,1,0,20),
      stl:v39num(x.stl,.5,0,10),
      blk:v39num(x.blk,.3,0,10)
    };
  };
}catch(e){}

/* 存档自愈：读取后立刻校验，坏数据就地修好，不要求玩家重开 */
/* 本作单场得分上限约 30~34（statExpect 自带 scoreCap），赛季场均不可能到 79；
   用 36 作为「可信上限」，超过就判定这段数据不可信，而不是简单地截断。 */
const V39_AVG_CEIL=36;
function v39plausible(v){return isFinite(v)&&v>=0&&v<=V39_AVG_CEIL}
function v39HealCareer(c){
  if(!c||typeof c!=='object')return c;
  const s=c.seasonStats=c.seasonStats||{};
  const t=c.careerTotals=c.careerTotals||{};
  ['gp','pts','reb','ast','stl','blk','fg','three','totalPts','totalReb','totalAst'].forEach(k=>{
    if(!isFinite(Number(s[k])))s[k]=0;
  });
  /* 优先用逐场留档重算场均——这是最可信的一手数据 */
  let fromLog=null;
  try{
    const arr=(c.gameLog||[]).filter(g=>g&&g.line&&g.played!==false&&isFinite(Number(g.line.pts)));
    if(arr.length>=3){
      const n=arr.length;
      fromLog={
        n:n,
        pts:arr.reduce((a,g)=>a+Number(g.line.pts||0),0)/n,
        reb:arr.reduce((a,g)=>a+Number(g.line.reb||0),0)/n,
        ast:arr.reduce((a,g)=>a+Number(g.line.ast||0),0)/n,
        stl:arr.reduce((a,g)=>a+Number(g.line.stl||0),0)/n,
        blk:arr.reduce((a,g)=>a+Number(g.line.blk||0),0)/n
      };
    }
  }catch(e){}
  if(fromLog&&v39plausible(fromLog.pts)){
    /* 逐场留档可信：以它为准覆盖被写坏的场均字段 */
    if(!v39plausible(s.pts)||Math.abs(fromLog.pts-s.pts)>1)s.pts=fromLog.pts;
    if(!v39plausible(s.reb)||Math.abs(fromLog.reb-s.reb)>1)s.reb=fromLog.reb;
    if(!v39plausible(s.ast)||Math.abs(fromLog.ast-s.ast)>1)s.ast=fromLog.ast;
    if(!v39plausible(s.stl))s.stl=fromLog.stl;
    if(!v39plausible(s.blk))s.blk=fromLog.blk;
  }else if(s.gp>0){
    /* 没有可信留档：用「累计/场次」交叉验证；仍然不可信就只能归零重算 */
    const byTotal=(isFinite(s.totalPts)&&s.totalPts>0)?s.totalPts/s.gp:null;
    if(!v39plausible(s.pts)){
      s.pts=(byTotal!=null&&v39plausible(byTotal))?byTotal:0;
    }
    if(!v39plausible(s.reb))s.reb=0;
    if(!v39plausible(s.ast))s.ast=0;
    if(!v39plausible(s.stl))s.stl=0;
    if(!v39plausible(s.blk))s.blk=0;
  }
  if(s.gp>0){
    s.fg=v39num(s.fg,0,0,100);s.three=v39num(s.three,0,0,100);
  }else{
    s.pts=0;s.reb=0;s.ast=0;s.stl=0;s.blk=0;
  }
  /* --- 生涯累计：场次与累计得分必须配套 --- */
  ['games','points','rebounds','assists','seasons','minutes'].forEach(k=>{
    if(!isFinite(Number(t[k])))t[k]=0;
  });
  if(t.games<=0&&t.points>0)t.games=Math.max(1,Math.round(s.gp||0))||1;
  if(t.games>0){
    const ppg=t.points/t.games;
    if(!v39plausible(ppg)){
      /* 生涯场均不可信：按当前赛季水平回推（保持「打了很久」的形状，但数字可信） */
      const per=v39plausible(s.pts)?s.pts:0;
      if(per>0){
        t.points=per*t.games;
        t.rebounds=(v39plausible(s.reb)?s.reb:0)*t.games;
        t.assists=(v39plausible(s.ast)?s.ast:0)*t.games;
      }else{
        t.points=0;t.rebounds=0;t.assists=0;
      }
    }
  }else{
    t.games=0;t.points=0;t.rebounds=0;t.assists=0;
  }
  /* 三项关系值：越界归位 */
  c.trust=v39num(c.trust,50,0,100);
  c.gmSatisfaction=v39num(c.gmSatisfaction,50,0,100);
  c.fanHeat=v39num(c.fanHeat,50,0,100);
  c.ovr=v39num(c.ovr,70,30,99);
  return c;
}
try{
  const __v39Load=load;
  load=function(){
    let c=null;
    try{c=__v39Load()}catch(e){c=null}
    return c?v39HealCareer(c):c;
  };
}catch(e){}
/* 已在局内的存档也要修一次（老版本可能已经载入内存） */
try{if(typeof career!=='undefined'&&career)v39HealCareer(career)}catch(e){}

/* =====================================================================
   ③ 连续失误：计数封顶 + 不再显示（开发者指定「不需要显示出来」）
   根因：进入下滑通道后 streak 仍继续 +1，文案却写死 /3，出现 4/3、6/3。
   修法：落盘前把计数夹到上限（后台判定照旧：错 3 次进下滑通道、2 季挽救
         窗口）；页面上的「连续失误 N/3」整块移除，只保留状态本身。
   ===================================================================== */
try{
  const __v39Save=save;
  save=function(){
    try{
      if(typeof career!=='undefined'&&career&&career.v30&&career.v30.decline){
        const d=career.v30.decline;
        if(!isFinite(Number(d.streak)))d.streak=0;
        if(d.streak>3)d.streak=3;          /* 计数封顶，不再出现 4/3 */
        if(d.streak<0)d.streak=0;
      }
      /* 飘窗/提示里若带越界计数，一并换成不露数字的说法 */
      if(typeof ui!=='undefined'&&ui&&typeof ui.toast==='string'&&/连续失误/.test(ui.toast)){
        ui.toast=ui.toast.replace(/（?连续失误\s*\d+\s*\/\s*3）?/,u=>u.indexOf('（')===0?'':'');
        if(/^\s*$/.test(String(ui.toast).replace(/「[^」]*」|→|状态下滑|生涯稳住|^[（\s]*$/g,'')))ui.toast='状态出现波动。';
      }
    }catch(e){}
    __v39Save();
  };
}catch(e){}

/* 页面文案：去掉「连续失误 N/3」这类越界计数 */
function v39CleanStreakText(h){
  if(typeof h!=='string')return h;
  try{
    /* 1) 状态卡里的「连续失误 N/3。连续错 3 次会进入下滑通道。」→ 只留状态说明 */
    h=h.replace(/连续失误\s*\d+\s*次，剩余挽救窗口\s*(\d+)\s*个赛季。/g,
                '已进入下滑通道，还有 $1 个赛季可以救回来。');
    h=h.replace(/连续失误\s*\d+\s*\/\s*3。连续错\s*3\s*次会进入下滑通道。/g,
                '保持正确选择，状态就会一直稳定。');
    h=h.replace(/连续失误\s*\d+\s*\/\s*3/g,'');
    h=h.replace(/连续失误\s*\d+\s*次/g,'');
    h=h.replace(/连续错\s*3\s*次(?=[，。、])/g,'');
    /* 2) 状态面板里的「N/3 · 连续失误」整格移除 */
    h=h.replace(/<div><b>\s*\d+\s*\/\s*3\s*<\/b><span>连续失误<\/span><\/div>/g,'');
    /* 3) 残留的重复标点与空标签清理 */
    h=h.replace(/<span>\s*<\/span>/g,'');
  }catch(e){}
  return h;
}
try{
  const __v39Story=storyView;
  storyView=function(){return v39CleanStreakText(__v39Story())};
}catch(e){}
try{
  const __v39Regular=regularView;
  regularView=function(){return v39CleanStreakText(__v39Regular())};
}catch(e){}

/* =====================================================================
   ④ 球队满意度 / 教练信任 / 球迷支持：赢球加分、输球减分（开发者定）
   根因（实测）：这两项不是「几乎不扣」，而是**赢球加分项太多**——除了每场
         赢球加分，还有一堆里程碑事件一次性 +5 / +8 / +9（实测一个赛季里
         8 次 >2 的大跳变，最大 +9）。这些一次性加成把三项一路抬到 100，
         之后长期停住（实测连打 3 季 100/100/100）。
   修法：让这三项**跟着战绩走**，而不是跟着事件走——
         每场比赛后按当季胜率算出一个目标值（胜率高→目标高），再让当前值
         向目标靠拢。这样：
           · 赢球 → 目标上移 → 当前值上调（加分）
           · 输球 → 目标下移 → 当前值下调（减分）
           · 想要停在 100，必须长期保持极高胜率；里程碑的一次性加成会被
             随后几场比赛拉回目标附近，不会再「一跳到位、永久停住」。
   ===================================================================== */
/* 目标区间：胜率 0 → 下限；胜率 1 → 上限。上限刻意不到 100，满值极难达成。 */
const V39_REL_ANCHOR={trust:[30,95],gmSatisfaction:[26,94],fanHeat:[32,92]};
const V39_REL_EASE=0.22;                    /* 每场向目标靠拢的比例 */
try{
  const __v39Sim=simulateGame;
  simulateGame=function(){
    const before=(typeof career!=='undefined'&&career)?career.games:0;
    __v39Sim();
    try{
      if(typeof career==='undefined'||!career)return;
      if(career.games===before)return;                 /* 本场没有推进：不结算 */
      const g=(career.gameLog||[])[0];
      if(!g||g.played===false)return;                  /* 伤停缺阵：不计入 */
      const games=Math.max(1,career.games||1);
      const wr=v39clamp((career.wins||0)/games,0,1);    /* 当季胜率 */
      for(const key of Object.keys(V39_REL_ANCHOR)){
        const span=V39_REL_ANCHOR[key];
        const target=span[0]+(span[1]-span[0])*wr;
        const cur=isFinite(Number(career[key]))?Number(career[key]):target;
        /* 输球额外多扣一点：让「输球减分」的手感明显强于赢球加分 */
        const push=(target-cur)*V39_REL_EASE+(g.win?0.35:-0.75);
        career[key]=v39clamp(cur+push,0,100);
      }
    }catch(e){}
  };
}catch(e){}

window.__v39Debug={v39HealCareer,v39CleanStreakText,statExpect,V39_REL_ANCHOR};

})();
