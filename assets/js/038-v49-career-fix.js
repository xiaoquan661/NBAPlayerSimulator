
/* =====================================================================
   V4.9 · 退役真退役 + 下滑通道 + 成长曲线修正
   开发者决定（原话）：
     「要做：有下滑风险，选错真会变水货」
     「玩家放宽到 41~42 岁」
     「看了专属都能到 99，不看的统一 92-95」
     「评分必须达到巨星档 + 数据战绩都要顶尖」（MVP）
   ===================================================================== */
(function(){
if(window.__v49CareerFix)return;window.__v49CareerFix=true;

const V49={
  /* 年龄退役：配合 12–15 赛季总节奏，32 岁开始提示，37 岁强制收束 */
  AGE_ALERT:32,          /* 开始提示「退役倒计时」 */
  AGE_FORCE:35,          /* 35 岁起：若状态不佳则退役 */
  AGE_HARD:37,           /* 37 岁：无论状态如何都退役 */
  /* 成长目标：不看广告峰值 92~95；看专属可达 99 */
  CAP_BASE:95,           /* 没有专属天赋时的软上限 */
  CAP_TALENT:99,         /* 有专属天赋时的上限 */
  /* 下滑通道 */
  DECLINE_TRIGGER:3,     /* 连续 3 个赛季表现不达标 → 进入下滑 */
  DECLINE_RESCUE:2       /* 进入下滑后有 2 个赛季的挽救窗口 */
};

function v49HasExclusive(){
  try{
    if(!career||!career.exclusive)return false;
    const fx=(career.playerId||'')+'_x';
    return (career.talents||[]).indexOf(fx)>=0;
  }catch(e){return false}
}

/* ---------- 1. 成长曲线已移至 v50-growth（专责一层，避免多层互相干扰） ---------- */

/* ---------- 2. 下滑通道 ----------
   注意：nextSeason 会把 seasonStats 重置为空白，所以判定必须用
   「上一季结束时存下的快照」，否则读到的永远是空数据（好季也会被误判下滑）。 */
try{
  const __v49End=endSeason;
  endSeason=function(result){
    const r=__v49End(result);
    try{
      if(career){
        const s=career.seasonStats||{};
        career.v49Last={
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
try{
  const __v49Next=nextSeason;
  nextSeason=function(){
    const y0=(career&&career.seasonNo)||0;
    __v49Next();
    try{
      if(!career||career.retired||career.seasonNo===y0)return;
      career.v49=career.v49||{};
      const v=career.v49;
      /* 用上一季真实成绩判定。
         注意：因伤缺阵导致的出场数下降 ≠ 水平下滑（姚明耐久低，容易被误判），
         所以「出场不足」只在同时数据也差、或连续两季出场都不足时才计入。 */
      const last=career.v49Last||{ovr:Number(career.ovr)||0,gp:0,pts:0,reb:0,ast:0};
      const injured=(()=>{try{return career.injuryHistory&&career.injuryHistory.some(x=>x&&x.season===career.v49LastSeason)}catch(e){return false}})();
      const lowGP=last.gp<40;
      const lowProd=!(last.pts>=12||last.reb>=7||last.ast>=4);
      const ok=(last.ovr>=80)&&(lowGP?(injured&&!lowProd):true)&&!lowProd;
      if(last.ovr>=80&&lowGP&&lowProd)v.shortSeason=(v.shortSeason||0)+1;else v.shortSeason=0;
      if(ok||v.shortSeason<2&&last.ovr>=80&&lowGP&&!lowProd){
        v.badSeasons=0;v.declining=false;v.rescue=V49.DECLINE_RESCUE;
        return;
      }
      v.badSeasons=(v.badSeasons||0)+1;
      if(!v.declining&&v.badSeasons>=V49.DECLINE_TRIGGER){
        v.declining=true;v.rescue=V49.DECLINE_RESCUE;
        career.feed=career.feed||[];
        career.feed.unshift('联盟对你的评价开始下滑：如果接下来两个赛季没有明显改变，位置会越来越难。');
        if(typeof window.v222Pop==='function')window.v222Pop('生涯预警','连续走下坡：接下来两个赛季是关键窗口');
      }
      if(v.declining){
        if(v.rescue>0)v.rescue--;
        else{
          /* 挽救窗口用尽：明显退步（这就是「重走老路」的代价） */
          ['finishing','shooting','athleticism','defense'].forEach(k=>{
            career.attrs[k]=clamp((Number(career.attrs[k])||50)-2,30,99);
          });
          if(typeof syncOvr==='function')syncOvr();
        }
        if((Number(career.ovr)||0)<74&&career.playerId!=='custom'){
          career.feed=career.feed||[];
          career.feed.unshift('没有球队再给你稳定的位置。训练营合同、十天短约、发展联盟——联盟已经不再等你了。');
          if(typeof retire==='function')retire('长期下滑后没有球队再提供稳定位置');
        }
      }
    }catch(e){}
  };
}catch(e){}

/* ---------- 3. 剧情里选「退役」要真的退役 ----------
   现状：姚明第 8 章的「退役」选项只写了一个 storyFlags 标记，从没调用 retire()，
   开发者点完发现还在打球。这里在剧情选择生效后检查该标记并真正结束生涯。 */
try{
  const __v49StoryChoice=storyChoice;
  storyChoice=function(i){
    const r=__v49StoryChoice(i);
    try{
      if(!career||career.retired)return r;
      const f=career.storyFlags||{};
      /* 姚明第 8 章的退役线；其它球员如有同类退役选项，也在这里统一收口 */
      const wantsRetire=(f.yao8==='retire');
      if(wantsRetire){
        career.feed=career.feed||[];
        career.feed.unshift('你宣布结束职业生涯。更衣室里的最后一次讲话很短，但每个人都记住了。');
        if(typeof retire==='function')retire('你选择在还能走的时候离开球场');
      }
    }catch(e){}
    return r;
  };
}catch(e){}

/* 年龄退役：在 v49 的 nextSeason 之后检查（用包装后的 nextSeason 已含下滑，
   这里再挂一层做年龄判定，保证顺序在成长之后） */
try{
  const __v49Next2=nextSeason;
  nextSeason=function(){
    const y0=(career&&career.seasonNo)||0;
    __v49Next2();
    try{
      if(!career||career.retired||career.seasonNo===y0)return;
      const age=Number(career.age)||0;
      const ovr=Number(career.ovr)||0;
      if(age>=V49.AGE_ALERT&&age<V49.AGE_FORCE){
        career.feed=career.feed||[];
        career.feed.unshift(`${age} 岁：退役已经是可以被讨论的事了。你还能打，但每一年都需要重新证明自己。`);
      }
      /* 35 岁起：状态撑不住就退；37 岁无条件。自建球员由 184 的赛季节奏单独处理。 */
      if(career.playerId!=='custom'&&(age>=V49.AGE_HARD||(age>=V49.AGE_FORCE&&ovr<84))){
        career.feed.unshift(`${age} 岁：身体已经给不出往年的东西了。你决定在这里画上句号。`);
        if(typeof retire==='function')retire(`${age} 岁，身体状态不再支持继续征战`);
      }
    }catch(e){}
  };
}catch(e){}

/* ---------- 4. MVP 门槛：评分必须到巨星档 + 数据战绩都顶尖 ----------
   现状：v220MvpEligible 只要求 OVR>=80、胜率>=35%、一项数据达标，
        实测 85 分就能连拿 8 个 MVP。
   修法：真正的判定在 v38（最后生效层，读 v38Race 的 rank 与 eligible）。
        这里包装 v38 的 awardSeason —— 它跑完之后再按「巨星档门槛」复核一次，
        不达标就直接取消该赛季的 MVP，并把荣誉数改回去。 */
function v49MvpElite(){
  try{
    const c=career||{};
    const s=c.seasonStats||{};
    const ovr=Number(c.ovr)||0;
    const gp=Number(s.gp)||0;
    const games=Math.max(1,Number(c.games)||82);
    const wp=(Number(c.wins)||0)/games;
    const pts=Number(s.pts)||0, reb=Number(s.reb)||0, ast=Number(s.ast)||0;
    /* 1) 必须是巨星档 */
    if(ovr<89)return false;
    /* 2) 球队必须是强队 */
    if(wp<.55)return false;
    /* 3) 出勤要过半 */
    if(gp<Math.max(3,Math.floor(games*.5)))return false;
    /* 4) 数据要在联盟前列 */
    const dat=(pts>=20&&reb>=8)||pts>=22||ast>=8||(pts>=18&&reb>=9&&ast>=3);
    if(!dat)return false;
    return true;
  }catch(e){return false}
}
try{
  const __v49Award=awardSeason;
  awardSeason=function(){
    const before=career?Number(career.honors&&career.honors.MVP)||0:0;
    const r=__v49Award();
    try{
      if(!career||!Array.isArray(career.seasonAwards))return r;
      if(v49MvpElite())return r;                 /* 达标：保持 v38 的判定 */
      /* 不达标：撤销本赛季 MVP */
      const card=career.seasonAwards.find(x=>x.key==='MVP'||x.title==='最有价值球员');
      if(card&&card.won){
        card.won=false;
        card.status='未达到巨星档评选标准';
        career.honors=career.honors||{};
        const cur=Number(career.honors.MVP)||0;
        if(cur>before)career.honors.MVP=before;   /* 回滚本次计数 */
        if(career.mvpFinalRace)career.mvpFinalRace=Object.assign({},career.mvpFinalRace,{eligible:false,revokedByV49:true});
        if(typeof save==='function')save();
      }
    }catch(e){}
    return r;
  };
}catch(e){}

/* ---------- 5. 生涯季数 / 履历记录修正 ----------
   现状：只有「夺冠」或「无缘季后赛」才 endSeason，正常出局不记录，导致 season 数常为 0。
   修法：在 player 结束季后赛（出局）与每季末端都补记一次，并保证不重复。 */
try{
  const __v49End=endSeason;
  endSeason=function(result){
    const had=(career&&career.history&&career.history.length)||0;
    __v49End(result);
    try{
      if(!career)return;
      const now=(career.history&&career.history.length)||0;
      if(now>had){
        /* 本次已记录，把生涯季数对齐 */
        career.careerTotals=career.careerTotals||{};
        career.careerTotals.seasons=now;
      }
    }catch(e){}
  };
}catch(e){}

window.__v49Debug={V49,v49HasExclusive};

})();
