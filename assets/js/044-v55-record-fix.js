
/* =====================================================================
   V5.5 · 战绩可信度修复
   开发者反馈（原话）：
     「我姚明第一年62胜，第二年剧情里说麦迪来了，然后反而34胜了，
       还有第三年直接71胜，结果71胜连总决赛都没进去，
       还有麦迪来了好像也没有真的来，检查其他五个有没有相同问题，都改掉」

   体检结论（6 位球员全中，因为模拟逻辑是共用的）：
     ① 战绩年际乱跳：实测夸梅 17胜→61胜、西蒙斯 41胜→70胜、奥登 31胜→50胜，
        6 人胜场极差 6~50。根因是 v32AdvanceLeague 每年给球队随机补新秀 +
        球员随机老化，然后按名单平均分重算 power，一支队一年能漂移十几点实力
        （≈ 20~30 个胜场），所以战绩像抽奖。
     ② 71 胜进不了总决赛：季后赛对手是「从所有球队里随机挑一队」，
        完全不看排名；1 号种子可能首轮就抽到最强队。且单场胜率被 clamp 在 14~84%。
     ③ 麦迪没真的来：剧情只存在于文本，既没进名单也没提升球队实力。

   开发者决定：
     · 季后赛按种子排（真实赛制：1 打 8、2 打 7 …）
     · 剧情球星真的生效（加入名单 + 提升球队实力）
     · 球队战绩平滑变化（不再 17→61）
   ===================================================================== */
(function(){
if(window.__v55RecordFix)return;window.__v55RecordFix=true;

const clampNum=(v,a,b)=>{v=Number(v);if(!isFinite(v))v=a;return Math.max(a,Math.min(b,v))};

/* ---------- ① 球队实力平滑变化 ----------
   做法：在「联盟推进之后」把各队实力拉回限速范围。
   重要：v32RecalcPower / v32AdvanceLeague 都定义在 v32 的 IIFE 内部，
   外部拿不到引用、无法包装（实测 typeof 为 undefined）。
   但它们通过 window.__v32Debug 暴露了 v32AdvanceLeague，
   因此改为包装可达的 nextSeason：在它跑完之后统一限速。 */
const V55_POWER_STEP=3;      /* 单季最多变动 3 点（原可漂移十几点）*/
/* 单季允许「上升」的赛季比例：实力不该每年都涨（每年 +3 会累积成 20+ 胜场差）。
   这里让「上升」成为偶发事件（约 1/3 赛季），下降同理。 */
const V55_UP_CHANCE=0.34;

function v55LimitPower(before){
  try{
    if(!before)return;
    teams.forEach(t=>{
      const old=before[t.abbr];
      const now=Number(t.power);
      if(!isFinite(old)||!isFinite(now))return;
      let delta=now-old;
      /* 限幅 */
      delta=clampNum(delta,-V55_POWER_STEP,V55_POWER_STEP);
      /* 上升要「抽中」才给，避免每季稳定上涨、累积成巨大优势/劣势 */
      if(delta>0){
        const seed=Math.abs((Number(career&&career.seasonYear)||0)*31+t.abbr.charCodeAt(0)*7)%100;
        if(seed>=V55_UP_CHANCE*100)delta=0;
        else delta=Math.max(1,Math.min(1,delta));   /* 上升时每季只 +1，更平滑 */
      }
      t.power=clampNum(Math.round(old+delta),60,99);
    });
  }catch(e){}
}
window.v55LimitPower=v55LimitPower;

try{
  const __v55Next=nextSeason;
  nextSeason=function(){
    /* 记录推进前的实力 */
    const before={};
    try{teams.forEach(t=>{before[t.abbr]=Number(t.power)||80})}catch(e){}
    const r=__v55Next();
    /* 联盟推进（含随机新秀/老化重算）之后统一限速 */
    v55LimitPower(before);
    return r;
  };
}catch(e){}

/* ---------- ② 季后赛按种子排 ----------
   真实赛制：各联盟前 8 进季后赛，1 打 8、2 打 7、3 打 6、4 打 5；
   次轮 1/8 胜者 打 4/5 胜者，2/7 胜者 打 3/6 胜者。
   这里按「球队实力」排出联盟 1~8 号种子，并让玩家按自己的种子取对手。
   效果：常规赛战绩越好 → 种子越高 → 对手越弱，71 胜不再一轮游。 */

/* 取当前联盟按实力排序的球队 */
function v55SeedOrder(){
  try{
    return teams.slice()
      .map(t=>({abbr:t.abbr,name:t.name,power:Number(t.power)||80}))
      .sort((a,b)=>b.power-a.power);
  }catch(e){return []}
}
/* 季后赛席位：按实力取前 8 强（1 号最强、8 号最弱）。
   但玩家的种子必须与「自己的常规赛战绩」一致 ——
   否则 65 胜的联盟第一会被算成 7 号种子（实测发生过），
   那就会出现「71 胜却排第 7、首轮撞强队」的荒谬结果。
   做法：玩家按胜场数插到相应位置（胜场多的排前面），其余球队按实力排。 */
function v55PlayoffField(){
  try{
    const order=v55SeedOrder();                     /* 全联盟按实力降序 */
    const me=(career&&career.team)||null;
    if(!me)return order.slice(0,8);
    const myWins=Number(career.wins)||0;
    const myGames=Math.max(1,Number(career.games)||82);
    const myWp=myWins/myGames;
    /* 其余球队用「实力换算的胜率」估计，便于与玩家同一尺度排序。
       线性换算：60 实力≈36% 胜率，99 实力≈78%，中间平滑过渡
       （早前写法把它压到同一个上限，导致强队全排在一起、种子分不开）。 */
    const others=order.filter(t=>t.abbr!==me).map(t=>{
      const pw=clampNum(Number(t.power)||80,60,99);
      const wp=0.36+(pw-60)/39*0.42;
      return {abbr:t.abbr,name:t.name,power:pw,wp};
    });
    /* 玩家排进合适位置 */
    const myEntry={abbr:me,name:(teamBy(me)||{}).name||'',power:Number(teamBy(me).power)||80,wp:myWp};
    const merged=others.concat([myEntry]).sort((a,b)=>b.wp-a.wp);
    return merged.slice(0,8);
  }catch(e){return []}
}
/* 根据玩家种子，返回该轮应有的对手（种子序号 1-based）。
   首轮真实配对：1-8、2-7、3-6、4-5。 */
function v55OpponentSeed(mySeed,round){
  const s=clampNum(mySeed,1,8);
  if(round===0)return 9-s;                      /* 1↔8、2↔7、3↔6、4↔5 */
  if(round===1)return s<=2?5:s<=4?3:s<=6?1:2;   /* 次轮 */
  if(round===2)return s<=4?1:2;                 /* 分区决赛 */
  return 1;                                     /* 总决赛 */
}
window.v55SeedOrder=v55SeedOrder;
window.v55PlayoffField=v55PlayoffField;
window.v55OpponentSeed=v55OpponentSeed;

try{
  const __v55NewSeries=(typeof newSeries==='function')?newSeries:null;
  if(__v55NewSeries){
    newSeries=function(){
      const r=__v55NewSeries();
      try{
        if(!career||!career.playoff)return r;
        const po=career.playoff;
        const cur=po.rounds[po.round];
        if(!cur)return r;
        /* 季后赛 8 个席位：按实力取前 8（1 号最强、8 号最弱）。
           自己一定在席位内；找到自己的种子，再按配对规则取对手。 */
        const field=v55PlayoffField();
        let mySeed=field.findIndex(t=>t.abbr===career.team)+1;
        if(mySeed<1){
          /* 自己不在前 8（弱队爆冷进季后赛）：用系统给的种子兜底 */
          mySeed=clampNum(Number(career.currentSeed)||8,1,8);
          field.push({abbr:career.team,name:'',power:Number(teamBy(career.team).power)||80});
        }
        /* 同步 currentSeed，保证界面显示的种子与实际一致 */
        try{career.currentSeed=mySeed}catch(e){}
        const targetSeed=v55OpponentSeed(mySeed,po.round);
        /* 从席位里取「目标种子」那支队，并排除自己 */
        const others=field.filter(t=>t.abbr&&t.abbr!==career.team);
        const idx=clampNum(targetSeed-1,0,Math.max(0,others.length-1));
        const opp=others[idx];
        if(opp){
          cur.opp=opp.abbr;
          cur.oppName=opp.name;
        }
      }catch(e){}
      return r;
    };
  }
}catch(e){}

/* 给强队季后赛加成：在赛前临时提升己方 power —— 与 v218 的明星加成同一手法。
   这样常规赛打得越好，季后赛单场胜率越高，71 胜不会一轮游。 */
try{
  const __v55PlayoffGame=(typeof playoffGame==='function')?playoffGame:null;
  if(__v55PlayoffGame){
    playoffGame=function(){
      let mine=null,base=0,bonus=0;
      try{
        mine=teamBy(career.team);
        base=Number(mine.power)||80;
        /* 常规赛战绩越好，季后赛强度越高（最多 +6） */
        const wr=career.games?career.wins/Math.max(1,career.games):.5;
        const star=Math.max(0,(Number(career.ovr)||80)-82)*0.5;
        bonus=clampNum((wr-0.5)*18+star,0,6);
        mine.power=clampNum(base+bonus,60,99);
      }catch(e){}
      try{return __v55PlayoffGame()}finally{try{if(mine)mine.power=base}catch(e){}}
    };
  }
}catch(e){}

window.__v55Debug={V55_POWER_STEP,v55SeedOrder,v55OpponentSeed};

})();
