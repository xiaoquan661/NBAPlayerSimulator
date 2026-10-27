
/* =====================================================================
   V5.0 · 成长曲线（落实开发者目标：不看广告 92~95 / 看专属可达 99）

   为什么需要单独一层：
     OVR 是属性加权和（终结.16 防守.16 组织.14 投射.13 篮板.12 运动.11 耐久.09 心态.09）。
     从 78 涨到 93 需要约 90 点属性，而旧逻辑每季只给几点成长，
     加上 30 岁后开始扣身体，于是无论怎么打，姚明/奥登/富尔茨峰值都停在 86~88。

   做法：按年龄给出「赛季目标 OVR」，再按权重把属性补到目标。
     - 22 岁起步 → 28 岁前后到达生涯上限
     - 28~31 岁：维持峰值
     - 32 岁起：按天赋决定回落速度（专属天赋回落更慢 = 万里长城的价值）
     - 上限：没解锁专属天赋 92~95；解锁了 → 99
     - 表现好才给满成长；表现差成长打折（配合 v49 的下滑通道）
   ===================================================================== */
(function(){
if(window.__v50Ceiling)return;window.__v50Ceiling=true;

/* OVR 权重（与 calcOvr 一致） */
const W={finishing:.16,defense:.16,playmaking:.14,shooting:.13,rebounding:.12,athleticism:.11,durability:.09,mentality:.09};
const CORE=Object.keys(W);

function v50HasExclusive(){
  try{
    if(!career)return false;
    if(career.exclusive!==true)return false;
    const fx=(career.playerId||'')+'_x';
    return (career.talents||[]).indexOf(fx)>=0;
  }catch(e){return false}
}
function v50Ovr(){try{return Number(career&&career.ovr)||0}catch(e){return 0}}

/* 本赛季目标 OVR */
function v50Target(){
  const age=Number(career&&career.age)||22;
  const ceil=(career&&career.v50&&career.v50.ceil)||93;
  const start=(career&&career.v50&&career.v50.start)||(Number(career&&career.draftYear)?78:78);
  const PEAK_AGE=28, HOLD_END=31;
  if(age<=PEAK_AGE){
    /* 从起点线性爬到上限 */
    const span=Math.max(1,PEAK_AGE-(career.v50.startAge||22));
    const done=age-(career.v50.startAge||22);
    const t=Math.max(0,Math.min(1,done/span));
    return Math.round(start+(ceil-start)*t);
  }
  if(age<=HOLD_END)return ceil;
  /* 32 岁后回落 */
  const hasEx=v50HasExclusive();
  const over=age-HOLD_END;
  const perSeason=hasEx?0.5:1.5;             /* 专属天赋回落更慢 */
  return Math.max(60,Math.round(ceil-over*perSeason));
}

/* 按权重把属性补到目标 OVR。
   重要：这里「只补不削」。
   曾经的写法会在 OVR 超过年龄目标时从最高属性往下削，导致
   玩家手动加的点（例如终结 99）在下一季被吃掉（开发者反馈：
   「上一年看终结99，下一年看84了」）。手动加点必须永远保留，
   所以这里只在「不足」时补齐；要回落只有两个正当场景：
     ① 年龄自然衰退（v50Target 自己会降低，见下面 v50Drop）
     ② 下滑通道（另一个函数单独处理）
   两者都是「降目标值」而不是「砍已有点数」。 */
function v50Shape(target){
  let guard=0;
  while(v50Ovr()<target&&guard++<900){
    let best=null,bestScore=-1;
    CORE.forEach(k=>{
      const v=Number(career.attrs[k])||0;
      if(v>=99)return;
      const score=(W[k]||0)*(100-v);           /* 权重高、当前低 → 优先补 */
      if(score>bestScore){bestScore=score;best=k}
    });
    if(!best)break;
    career.attrs[best]=clamp((Number(career.attrs[best])||0)+1,30,99);
    if(typeof syncOvr==='function')syncOvr();
  }
}

/* 明确要求回落时使用（仅限：年龄衰退、下滑通道）。
   手段是「削最高项」，且幅度受 passes 限制，避免一次砍太多。 */
function v50Drop(passes){
  try{
    let n=Math.max(0,Number(passes)||0);
    let guard=0;
    while(n>0&&guard++<200){
      let hi=null,hv=-1;
      CORE.forEach(k=>{const v=Number(career.attrs[k])||0;if(v>55&&v>hv){hi=k;hv=v}});
      if(!hi)break;
      career.attrs[hi]=clamp(career.attrs[hi]-1,30,99);
      if(typeof syncOvr==='function')syncOvr();
      n--;
    }
  }catch(e){}
}

/* 建号：定上限与起点 */
try{
  const __v50Create=createCareer;
  createCareer=function(){
    __v50Create();
    try{
      if(!career)return;
      const hasEx=v50HasExclusive();
      career.v50={
        ceil:hasEx?99:(92+Math.floor(Math.random()*4)),   /* 92~95 或 99 */
        start:Number(career.ovr)||78,
        startAge:Number(career.age)||22
      };
      if(typeof save==='function')save();
    }catch(e){}
  };
}catch(e){}

/* 每季结算：走向赛季目标（表现差则打折） */
try{
  const __v50Age=ageCurve;
  ageCurve=function(){
    /* 先记录身体类属性：基础层从 30 岁起会自动扣这些项，
       而本层的年龄曲线要到 32 岁才开始回落 —— 两者矛盾会让玩家
       手动加的点（例如终结 99）在 29 岁那一年被基础层扣掉 1 点。
       统一口径：32 岁前一律由本层目标值说了算（不扣），
       32 岁起由 v50Drop 按年龄曲线统一回落。 */
    const phys={};
    try{
      if(career&&career.attrs){['athleticism','durability','finishing','defense'].forEach(k=>{phys[k]=career.attrs[k]})}
    }catch(e){}
    __v50Age();
    try{
      if(!career)return;
      career.v50=career.v50||{ceil:93,start:Number(career.ovr)||78,startAge:Number(career.age)||22};
      const ageNow=Number(career.age)||22;
      /* 基础层从 30 岁起就扣身体属性，而本层的年龄曲线要到 32 岁后才回落；
         两者口径不一致会让玩家手动加的点在 30/31 岁被吃掉 1 点。
         这里以「本层曲线说了算」为准：32 岁（含）之前撤回基础层的提前扣减，
         33 岁起才交给下面的 v50Drop 按年龄曲线统一回落。 */
      if(ageNow<=32){
        /* 撤回基础层的提前扣减（32 岁前不该衰退） */
        Object.keys(phys).forEach(k=>{
          const before=phys[k],now=career.attrs[k];
          if(typeof before==='number'&&typeof now==='number'&&now<before){
            career.attrs[k]=before;
          }
        });
      }
      /* 关键：nextSeason 会先清空 seasonStats，所以必须用 endSeason 存下的上季快照判定
         （否则读到的永远是空数据，烂赛季也会被判成好赛季而拿到满额成长） */
      const snap=career.v50Last||career.v49Last||{gp:0,pts:0,reb:0,ast:0};
      const gp=Number(snap.gp)||0;
      const prodGood=(Number(snap.pts)||0)>=14||(Number(snap.reb)||0)>=8||(Number(snap.ast)||0)>=4;
      /* 因伤缺阵不影响成长评定（耐久低的球员如姚明会打到一半就伤停，
         用出场数卡会把「打得好但伤了」误判成不达标） */
      const good=prodGood&&(gp>=40||Number(snap.games)>=70);
      const age=Number(career.age)||22;

      /* 已判定在下滑通道中：不给成长，并主动回落
         （用 v50Drop 明确扣，不再靠「把目标压低」间接触发削峰，
           避免误伤玩家手动加的点） */
      if(career.v49&&career.v49.declining){
        const rescue=Number(career.v49.rescue)||0;
        /* 还在挽救窗口内：小幅回落；窗口用尽：明显回落 */
        v50Drop(rescue>0?1:3);
        if(typeof syncOvr==='function')syncOvr();
        return;
      }
      let target=v50Target();
      /* 表现不达标：只给一小部分成长（烂赛季不该白拿巅峰评分） */
      if(!good)target=Math.round(v50Ovr()+Math.max(0,(target-v50Ovr())*0.25));
      v50Shape(Math.max(60,target));
      /* 年龄自然衰退：目标低于当前时，才明确回落。
         注意这里只在「目标确实比当前低」时扣（32 岁以后才会发生），
         不会误伤玩家手动加点。 */
      if(age>32){
        const gap=v50Ovr()-target;
        if(gap>0)v50Drop(gap);
      }
      if(typeof syncOvr==='function')syncOvr();
    }catch(e){}
  };
}catch(e){}

/* 赛季结束时把本季成绩存下来，供下一季的成长/下滑判定使用 */
try{
  const __v50End=endSeason;
  endSeason=function(result){
    const r=__v50End(result);
    try{
      if(career){
        const s=career.seasonStats||{};
        career.v50Last={
          ovr:Number(career.ovr)||0,
          games:Number(career.games)||82,
          gp:Number(s.gp)||0,
          pts:Number(s.pts)||0,reb:Number(s.reb)||0,ast:Number(s.ast)||0
        };
      }
    }catch(e){}
    return r;
  };
}catch(e){}

window.__v50Debug={W,v50HasExclusive,v50Target,v50Ovr,ceil:()=>career&&career.v50&&career.v50.ceil};

})();
