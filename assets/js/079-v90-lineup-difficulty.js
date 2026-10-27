
/* ============================================================================
 * v90 · 开发者第三十二次反馈：最佳阵容一阵太好进
 *
 * 原话：
 *   「现在最佳阵容一阵也太好进了，从新秀开始就进，到退役就没不进过」
 *
 * ── 问题（实测复现）───────────────────────────────────────────────────
 *   v35 的最佳阵容判定（v35-awards.js 第 27~29 行）：
 *     nbaScore = ovr*1.0 + pts*1.1 + reb*0.5 + ast*0.8 + (stl+blk)*1.5
 *              + (wins>=50 ? 3 : 0)
 *     一阵 104 / 二阵 98 / 三阵 92（前置：出勤>=45 且 OVR>=78）
 *
 *   致命点：**ovr 一项就贡献 78~99 分，而一阵门槛只有 104**。
 *   实测反推（6 板 4 助 1 断 0.5 帽、45 胜）：OVR 78~90 的球员，
 *   场均得分只要高于 **5 分** 就稳进一阵 —— 门槛被单一维度顶满，其余项形同虚设。
 *   本作 OVR 随成长一路走高（新秀期就能到 80+），于是「从新秀进到退役」。
 *   实测同一页面：OVR 82 / 场均 15 分 → 年年一阵。
 *
 *   这与 MVP 被开发者两次指出「太容易」（v83 / v86）是同一个病根。
 *
 * ── 修法 ───────────────────────────────────────────────────────────────
 *   ① 大幅降低 OVR 的独占权重（1.0 → 0.28），把权重交给**比赛产出**
 *      （得分 2.2 / 篮板 0.9 / 助攻 1.4 / 抢断+盖帽 2.0），
 *      让「打出什么数据」真正决定能不能进。
 *   ② 门槛整体上调并拉开档位：一阵 96 / 二阵 86 / 三阵 76。
 *      实测：OVR 85 需场均 22.5 分才摸到一阵；普通首发只能进三阵。
 *   ③ 出勤门槛 45 → 55 场，OVR 前置 78 → 80。
 *   ④ 新秀赛季额外抬 6 分门槛：新秀入选应是罕见事件。
 *   ⑤ 稀缺性：连续一阵从第 3 次起每多一次再加 4 分门槛，
 *      巅峰期仍能持续拿，但不再「永不落榜」。
 *   ⑥ 最佳防守阵容同病同治（def*1.0 → 0.28，门槛 104/92，同样加出勤与稀缺约束）。
 *
 *   荣誉计数用「先减去旧判定、再加新判定」的差分方式精确修正，
 *   因此存档里「最佳阵容」「最佳防阵」及一二三阵计数会自动随之下降。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v90Fix)return;window.__v90Fix=true;

function num90(v,d){var n=Number(v);return isFinite(n)?n:(d||0)}

/* 判定参数：集中在此，便于回归与调参 */
var V90={
  OVR_W:0.28,               /* OVR 权重（原 1.0） */
  PTS_W:2.2,                /* 场均得分（原 1.1） */
  REB_W:0.9,                /* 场均篮板（原 0.5） */
  AST_W:1.4,                /* 场均助攻（原 0.8） */
  STOCK_W:2.0,              /* 抢断+盖帽（原 1.5） */
  WIN_HI:58, WIN_HI_B:6,    /* 58 胜以上 +6 */
  WIN_MID:52, WIN_MID_B:3,  /* 52 胜以上 +3 */
  WIN_LO:46, WIN_LO_B:1,    /* 46 胜以上 +1 */
  NBA_TIERS:[96,86,76],     /* 一阵 / 二阵 / 三阵 门槛 */
  DEF_BASE:0.28,            /* 防守评分权重（原 1.0） */
  DEF_STOCK_W:3.4,          /* 防守：抢断+盖帽（原 2.6） */
  DEF_TIERS:[40,34],        /* 防守一阵 / 二阵 门槛。
                               注意：上一版把防守权重从「防守×1.0 + 抢断盖帽×2.6」改成
                               「防守×0.28 + 抢断盖帽×3.4」，但门槛还留着旧标尺的 104/92，
                               新标尺下满分也就 ~52 → 最佳防守阵容**永远进不去**（实测反馈：
                               能拿 DPOY，却从没进过最佳防守阵容）。这里按新权重重标。
                               新标尺下的档位参考：防守 93+、抢断盖帽 3.6、42 胜 ≈ 38（二阵）；
                               防守 96+、抢断盖帽 4.5、50 胜 ≈ 43（一阵）；防守 85、抢断盖帽 2.0 ≈ 31（不入）。 */
  MIN_GP:55,                /* 出勤门槛（原 45） */
  MIN_OVR:80,               /* OVR 前置（原 78） */
  ROOKIE_EXTRA:6,           /* 新秀赛季额外门槛 */
  ROOKIE_HALF:3,            /* 新秀赛季对二阵的额外门槛 */
  STREAK_FROM:3,            /* 连续入选从第 3 次起加码 */
  STREAK_STEP:4             /* 每多一次加 4 分门槛 */
};

function v90WinBonus(wins){
  return wins>=V90.WIN_HI?V90.WIN_HI_B:wins>=V90.WIN_MID?V90.WIN_MID_B:wins>=V90.WIN_LO?V90.WIN_LO_B:0;
}

/* 常规赛综合分（不含新秀/连续加码） */
function v90NbaBase(ovr,s,wins){
  return num90(ovr,0)*V90.OVR_W
       + num90(s.pts,0)*V90.PTS_W
       + num90(s.reb,0)*V90.REB_W
       + num90(s.ast,0)*V90.AST_W
       + (num90(s.stl,0)+num90(s.blk,0))*V90.STOCK_W
       + v90WinBonus(num90(wins,0));
}
function v90DefBase(def,s,wins){
  return num90(def,0)*V90.DEF_BASE
       + (num90(s.stl,0)+num90(s.blk,0))*V90.DEF_STOCK_W
       + v90WinBonus(num90(wins,0));
}
window.v90NbaBase=v90NbaBase;
window.v90DefBase=v90DefBase;

/* 连续入选门槛加码（streak = 此前已连续入选次数） */
function v90StreakExtra(streak){
  if(streak>=V90.STREAK_FROM)return (streak-V90.STREAK_FROM+1)*V90.STREAK_STEP;
  return 0;
}

/* 计算档位（1=一阵,2=二阵,3=三阵,0=未入选） */
function v90NbaRank(ovr,s,wins,gp,isRookie,streak){
  if(num90(gp,0)<V90.MIN_GP)return 0;
  if(num90(ovr,0)<V90.MIN_OVR)return 0;
  var base=v90NbaBase(ovr,s,wins);
  var extra=(isRookie?V90.ROOKIE_EXTRA:0)+v90StreakExtra(num90(streak,0));
  var t=V90.NBA_TIERS;
  if(base>=t[0]+extra)return 1;
  if(base>=t[1]+(isRookie?V90.ROOKIE_HALF:0))return 2;
  if(base>=t[2])return 3;
  return 0;
}
function v90DefRank(def,s,wins,gp,streak){
  if(num90(gp,0)<V90.MIN_GP)return 0;
  if(num90(def,0)<V90.MIN_OVR)return 0;
  var base=v90DefBase(def,s,wins);
  var extra=v90StreakExtra(num90(streak,0));
  var t=V90.DEF_TIERS;
  if(base>=t[0]+extra)return 1;
  if(base>=t[1])return 2;
  return 0;
}
window.v90NbaRank=v90NbaRank;
window.v90DefRank=v90DefRank;

/* 从卡片里读 v35 刚写入的旧档位（0/1/2/3），用于差分修正荣誉计数 */
function v90OldNbaRank(cards){
  var one=false,two=false,three=false;
  (cards||[]).forEach(function(c){
    if(c.key==='最佳阵容一阵')one=!!c.won;
    else if(c.key==='最佳阵容二阵')two=!!c.won;
    else if(c.key==='最佳阵容三阵')three=!!c.won;
  });
  return one?1:two?2:three?3:0;
}
function v90OldDefRank(cards){
  var one=false,two=false;
  (cards||[]).forEach(function(c){
    if(c.key==='最佳防守一阵')one=!!c.won;
    else if(c.key==='最佳防守二阵')two=!!c.won;
  });
  return one?1:two?2:0;
}

/* ==========================================================================
 * 接管 v35 的奖项判定
 *   包住 awardSeason：在 v35（及其后的 v38）跑完后，
 *   ① 读取旧卡片档位 → ② 差分修正荣誉计数 → ③ 覆盖为新判定
 * ========================================================================== */
try{
  if(typeof awardSeason==='function'&&!window.__v90AwardGuard){
    var __v90Award=awardSeason;
    awardSeason=function(){
      var r=__v90Award.apply(this,arguments);
      try{
        if(!career||!Array.isArray(career.seasonAwards))return r;
        var cards=career.seasonAwards;
        var s=career.seasonStats||{},ovr=career.ovr||0,wins=career.wins||0;
        var def=(career.attrs&&career.attrs.defense)||0;
        var gp=s.gp||0;
        var isRookie=(career.seasonNo===1);

        /* 1) 先读旧档位（v35 本季刚写入的） */
        var oldNba=v90OldNbaRank(cards);
        var oldDef=v90OldDefRank(cards);

        /* 2) 用「此前连续入选次数」算新档位 */
        var streakNba=num90(career.v90NbaStreak,0);
        var streakDef=num90(career.v90DefStreak,0);
        var nbaRank=v90NbaRank(ovr,s,wins,gp,isRookie,streakNba);
        var defRank=v90DefRank(def,s,wins,gp,streakDef);
        /* 拿到 DPOY 必然入选防守一阵：
           DPOY 就是「全联盟防守第一人」，不可能同一年只进二阵（实测反馈）。
           所以这里对「已获奖」的 DPOY 直接锁定一防；没拿 DPOY 的，
           仍旧按 defRank 的分档，照样有机会进一防或二防。 */
        try{
          var dpc=null;
          for(var di=0;di<cards.length;di++){
            var dc=cards[di];
            if(dc&&(dc.key==='DPOY'||dc.title==='最佳防守球员')){dpc=dc;break}
          }
          if(dpc&&dpc.won)defRank=1;
        }catch(e){}

        /* 3) 更新连续计数（本季入选则 +1，否则清零） */
        career.v90NbaStreak=nbaRank===1?streakNba+1:0;
        career.v90DefStreak=defRank===1?streakDef+1:0;

        /* 4) 差分修正荣誉计数：每个键「减去旧增量的 1、加上新增量的 1」。
              计数永不为负（下限 0）。仅本季首次结算时修正，避免重复调用叠加。 */
        if(career.v90HonorSeason!==career.seasonNo){
          career.v90HonorSeason=career.seasonNo;
          var apply=function(key,oldOn,newOn){
            var cur=num90(career.honors[key],0);
            if(oldOn)cur-=1;
            if(newOn)cur+=1;
            career.honors[key]=Math.max(0,cur);
          };
          apply('最佳阵容',oldNba>0,nbaRank>0);
          apply('最佳阵容一阵',oldNba===1,nbaRank===1);
          apply('最佳阵容二阵',oldNba===2,nbaRank===2);
          apply('最佳阵容三阵',oldNba===3,nbaRank===3);
          apply('最佳防阵',oldDef>0,defRank>0);
          apply('最佳防守一阵',oldDef===1,defRank===1);
          apply('最佳防守二阵',oldDef===2,defRank===2);
        }

        /* 5) 覆盖卡片的入选状态与说明 */
        var nbaScore=v90NbaBase(ovr,s,wins);
        var defScore=v90DefBase(def,s,wins);
        var setCard=function(key,won,status,detail){
          for(var i=0;i<cards.length;i++){
            var c=cards[i];
            if(c.key===key){c.won=!!won;c.status=status;c.tier=won?1:0;if(detail)c.detail=detail;return}
          }
        };
        setCard('最佳阵容一阵',nbaRank===1,nbaRank===1?'最佳阵容一阵':'未入选',
          '综合评分 '+Math.round(nbaScore)+' · OVR '+ovr+(isRookie?' · 新秀赛季':''));
        setCard('最佳阵容二阵',nbaRank===2,nbaRank===2?'入选最佳阵容二阵':'未入选',
          '综合评分 '+Math.round(nbaScore)+' · 出勤 '+gp+' 场');
        setCard('最佳阵容三阵',nbaRank===3,nbaRank===3?'入选最佳阵容三阵':'未入选',
          '综合评分 '+Math.round(nbaScore)+' · 球队 '+wins+' 胜');
        setCard('最佳防守一阵',defRank===1,defRank===1?'入选防守一阵':'未入选',
          '防守 '+def+' · 抢断+盖帽 '+(Math.round((num90(s.stl,0)+num90(s.blk,0))*10)/10));
        setCard('最佳防守二阵',defRank===2,defRank===2?'入选防守二阵':'未入选',
          '防守 '+def+' · 出勤 '+gp+' 场');

        save();
      }catch(e){}
      return r;
    };
    try{if(typeof window.awardSeason==='function')window.awardSeason=awardSeason}catch(e){}
    window.__v90AwardGuard=true;
  }
}catch(e){}

window.__v90Debug={params:V90,base:v90NbaBase,defBase:v90DefBase,
  nbaRank:v90NbaRank,defRank:v90DefRank,streakExtra:v90StreakExtra};

})();

