
/* ============================================================================
 * v80 · 开发者第十七次反馈：60 胜以上就大概率是联盟第一或第二，71 胜却排第三
 *
 * 原话：
 *   「60胜以上就大概率是联盟第一或第二了，现在我71胜才第三」
 *
 * ── 根因（实测）─────────────────────────────────────────────────────────
 *   常规赛结束时的「东/西部第 X 名」来自 career.currentSeed，而它是
 *   regularSeed() 生成的：
 *       w>=56 → rnd(1,3)      ← 纯随机，与胜场完全脱钩
 *       w>=50 → rnd(3,5)
 *       w>=45 → rnd(5,7) …
 *   所以 71 胜有 1/3 概率被算成第 3（实测 300 次：1/2/3 各约 100 次）。
 *   更矛盾的是：联盟排名页用 rankInfo()（按 projectedWins 排）在同一份存档里
 *   显示的是 **#1** —— 同一个赛季，一处说第 1、一处说第 3。
 *
 *   实测各档（修复前，种子 / 联盟排名）：
 *     56胜 → 随机#1~3 / 联盟#3
 *     60胜 → 随机#1~3 / 联盟#1
 *     71胜 → 随机#1~3 / 联盟#1      ← 开发者看到的「第三」
 *
 * ── 修法 ────────────────────────────────────────────────────────────────
 *   1) 种子改为**按胜场分档 + 只在档内做偏向靠前的浮动**，并保证与联盟排名口径一致：
 *        ≥70 胜 → 第 1（锁定）
 *        60~69  → 第 1~2（大概率第 1）
 *        56~59  → 第 2~3
 *        50~55  → 第 3~5
 *        45~49  → 第 5~7
 *        40~44  → 第 7~10
 *        <40    → 第 11~15
 *   2) 同时把 rankInfo 的名次**注入种子计算**：当联盟排名已经是第 1 时，
 *      种子不允许比它差两名以上（用 min 收敛），彻底消除「一处第 1、一处第 3」。
 *
 *   注意：不能直接把种子等于 rankInfo 名次 —— 那是「全联盟 30 队」的名次，
 *   而种子是「东西部前 8」语境（附带附加赛 9/10 名）。两者口径不同，
 *   但**强弱结论必须一致**：胜场越多，两边的名次都必须越靠前。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v80Fix)return;window.__v80Fix=true;

/* 按胜场决定种子区间（真实 NBA 的直觉：60 胜基本锁定分区前二） */
function v80SeedBand(w){
  if(w>=70)return [1,1];      /* 70 胜以上：直接第一 */
  if(w>=60)return [1,2];      /* 60 胜以上：大概率第一，最差第二 */
  if(w>=56)return [2,3];
  if(w>=50)return [3,5];
  if(w>=45)return [5,7];
  if(w>=40)return [7,10];
  return [11,15];
}

/* 用「我这一季打得多好」而不是纯随机来定种子。
   做法：先按胜场拿到区间 [lo,hi]，再让联盟排名（rankInfo）把名次往好里收，
   最后在收窄后的区间里做**偏向靠前**的随机（区间下限权重更高），
   这样「60 胜以上大概率第一、最差第二」成立，同时保留一点赛季间差异。 */
function v80Seed(){
  try{
    var w=Number((typeof career!=='undefined'&&career&&career.wins)||0);
    var band=v80SeedBand(w);
    var lo=band[0],hi=band[1];
    /* 与联盟排名口径对齐：联盟排名只允许让种子更靠前（不能更差） */
    try{
      var rk=(typeof rankInfo==='function')?rankInfo().rank:null;
      if(rk&&isFinite(rk)){
        var rkSeed=Math.max(1,Math.min(15,Math.round(rk)));
        if(rkSeed<lo)lo=rkSeed;
      }
    }catch(e){}
    if(hi<lo)hi=lo;
    if(lo===hi)return lo;
    var extra=hi-lo;
    /* 偏向靠前：把 [0, 2*extra] 折半映射到 [0, extra]，下限概率约为 (extra+1)/(2*extra+1) */
    var t=(typeof rnd==='function')?rnd(0,extra*2):0;
    var off=Math.min(extra,Math.floor(t/2));
    return Math.max(1,Math.min(15,lo+off));
  }catch(e){
    return 8;
  }
}

/* 接管 regularSeed：所有结算路径（finishRegular / v28 / v34 等）都会经过它 */
try{
  if(typeof regularSeed==='function'&&!window.__v80SeedGuard){
    var __v80RegularSeed=regularSeed;
    regularSeed=function(){
      try{
        /* 只要 career.wins 合理就用新口径；否则退回旧实现（保持兼容） */
        if(typeof career!=='undefined'&&career&&Number(career.wins)>0)return v80Seed();
      }catch(e){}
      return __v80RegularSeed.apply(this,arguments);
    };
    window.__v80SeedGuard=true;
  }
}catch(e){}

/* 保险：结算入口再兜一次（某些路径会直接写 career.currentSeed） */
try{
  if(typeof finishRegular==='function'&&!window.__v80FinishGuard){
    var __v80Finish=finishRegular;
    finishRegular=function(){
      var rv=__v80Finish.apply(this,arguments);
      try{
        if(career){
          var band=v80SeedBand(Number(career.wins)||0);
          if(Number(career.wins)>=60){
            /* 60 胜以上必须是前二：兜底纠正被别层覆写过的值 */
            if(!(career.currentSeed>=1&&career.currentSeed<=2))career.currentSeed=v80Seed();
          }
        }
      }catch(e){}
      return rv;
    };
    window.__v80FinishGuard=true;
  }
}catch(e){}

window.__v80Debug={band:v80SeedBand,seed:v80Seed,guards:{seed:!!window.__v80SeedGuard,finish:!!window.__v80FinishGuard}};

})();

