
/* ============================================================================
 * v86 · 开发者第二十八次反馈（两项）
 *
 * 原话：
 *   「mvp实时榜去掉，还有mvp还是太容易了，场均25分就能拿mvp了」
 *
 * ── 一、去掉赛季页的 MVP 实时榜 ─────────────────────────────────────────
 *   赛季页会插一块「MVP 竞争 / 实时更新 · G40」的榜单（v218 层渲染，
 *   v65/v67 又各自包装过一次）。开发者要求**整块去掉**。
 *   修法：在 regularView 出口把这块整体移除（连同 v67 可能加的紧凑条），
 *   并且把 v218MvpBoard 本身置空，防止其它渲染路径再插进来。
 *   注意：**奖项页的 MVP 名次保留**（那是赛季结算信息，不是实时榜）。
 *
 * ── 二、MVP 还是太容易 ──────────────────────────────────────────────────
 *   实测（当前门槛 OVR≥91 / 胜率≥63% / 出勤≥72% + 「高产线」任一条）：
 *     · 25 分 8 板 10.5 助 → 过
 *     · 25 分 10 板 9.5 助 → 过
 *     · 25 分 12 板 5 助  → 过
 *     · 27 分 9 板 7 助 + 55 胜 → 过
 *   原因是「高产线」里存在几个宽口（22 分+9.5 助、24 分+11 板、21 分+12 板…），
 *   得分不是硬门槛，靠助攻/篮板就能凑过去。
 *
 *   修法：MVP 改成**得分硬门槛 + 综合分达标**双条件：
 *     ① OVR ≥ 92、胜率 ≥ 66%、出勤 ≥ 76%（球队要真的顶级、且基本全勤）
 *     ② 场均得分 ≥ 26（MVP 不能没有得分威胁）
 *     ③ 综合分（得分/篮板/助攻/断帽加权）达到 MVP 级
 *   这样 25 分无论配多少助攻篮板都拿不到，而真正的统治级数据仍能拿。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v86Fix)return;window.__v86Fix=true;

function num86(v,d){var n=Number(v);return isFinite(n)?n:(d||0)}
function clamp86(v,a,b){return Math.max(a,Math.min(b,v))}

/* ==========================================================================
 * 一、去掉赛季页 MVP 实时榜
 * ========================================================================== */
function v86StripMvpBoard(h){
  try{
    if(typeof h!=='string'||!h)return h;
    var out=h;
    /* ① 去掉完整的 v218-mvp 区块（含 header/列表/说明） */
    out=out.replace(/<section class="v218-mvp">[\s\S]*?<\/section>/g,'');
    /* ② 去掉 v67 的紧凑条（如果它单独插了） */
    out=out.replace(/<section class="v67-mvp-bar">[\s\S]*?<\/section>/g,'');
    out=out.replace(/<div class="v67-mvp-bar">[\s\S]*?<\/div>\s*<\/div>/g,'');
    /* ③ 兜底：残留的 MVP 榜单标记 */
    out=out.replace(/<[^>]*class="[^"]*v218-mvp[^"]*"[^>]*>[\s\S]*?<\/section>/g,'');
    return out;
  }catch(e){return h}
}
window.v86StripMvpBoard=v86StripMvpBoard;

/* 把 v218MvpBoard 本身置空 —— 这样无论哪条路径调用它都不会再产出榜单 */
try{
  if(typeof v218MvpBoard==='function'&&!window.__v86BoardOff){
    v218MvpBoard=function(){return ''};
    window.__v86BoardOff=true;
  }
}catch(e){}

/* regularView 出口再兜一次（防止别层把榜单拼回来） */
try{
  if(typeof regularView==='function'&&!window.__v86RegularPatched){
    var __v86Regular=regularView;
    regularView=function(){
      var h=__v86Regular.apply(this,arguments);
      return v86StripMvpBoard(h);
    };
    window.__v86RegularPatched=true;
  }
}catch(e){}

/* 世界赛/其它可能带 MVP 榜的页面也顺手清一下（只清「实时榜」，不动奖项页） */
try{
  if(typeof renderCareer==='function'&&!window.__v86CareerPatched){
    var __v86Career=renderCareer;
    renderCareer=function(){
      var h=__v86Career.apply(this,arguments);
      try{
        if(typeof h==='string'&&h.indexOf('v218-mvp')>=0)return v86StripMvpBoard(h);
      }catch(e){}
      return h;
    };
    window.__v86CareerPatched=true;
  }
}catch(e){}

/* ==========================================================================
 * 二、MVP 难度：得分硬门槛 + 综合分
 * ========================================================================== */
var V86_MVP={
  OVR:92,
  WIN_RATE:0.66,
  GAMES_RATE:0.76,
  MIN_PTS:26,          /* 得分硬门槛：低于这个分不可能是 MVP */
  /* 综合分门槛：pts*1.0 + reb*0.75 + ast*0.6 + (stl+blk)*0.8 */
  SCORE:33
};

function v86MvpScore(s){
  try{
    s=s||{};
    return num86(s.pts,0)*1.0+num86(s.reb,0)*0.75+num86(s.ast,0)*0.6
      +(num86(s.stl,0)+num86(s.blk,0))*0.8;
  }catch(e){return 0}
}

function v86MvpPasses(){
  try{
    var c=(typeof career!=='undefined'&&career)||{};
    var s=c.seasonStats||{};
    var ovr=num86(c.ovr,0);
    var gp=num86(s.gp,0);
    var games=Math.max(1,num86(c.games,82));
    var wp=num86(c.wins,0)/games;
    if(ovr<V86_MVP.OVR)return false;
    if(wp<V86_MVP.WIN_RATE)return false;
    if(gp<Math.max(3,Math.floor(games*V86_MVP.GAMES_RATE)))return false;
    /* ① 得分硬门槛 */
    if(num86(s.pts,0)<V86_MVP.MIN_PTS)return false;
    /* ② 综合分达标 */
    if(v86MvpScore(s)<V86_MVP.SCORE)return false;
    return true;
  }catch(e){return false}
}
window.v86MvpPasses=v86MvpPasses;
window.v86MvpScore=v86MvpScore;

/* 接管 awardSeason：本层跑在所有既有层之后，做最终复核 */
try{
  if(typeof awardSeason==='function'&&!window.__v86AwardGuard){
    var __v86Award=awardSeason;
    awardSeason=function(){
      var before=(typeof career!=='undefined'&&career&&career.honors&&Number(career.honors.MVP))||0;
      var r=__v86Award.apply(this,arguments);
      try{
        if(!career||!Array.isArray(career.seasonAwards))return r;
        if(v86MvpPasses())return r;         /* 达标：保留既有结果 */
        var card=career.seasonAwards.find(function(x){return x.key==='MVP'||x.title==='最有价值球员'});
        if(card&&card.won){
          card.won=false;
          card.status='未达到 MVP 评选线';
          career.honors=career.honors||{};
          var cur=Number(career.honors.MVP)||0;
          if(cur>before)career.honors.MVP=before;
          /* 同步撤销对应成就，避免「荣誉撤了成就还留着」 */
          try{
            if(career.achievementState&&career.achievementState.keys){
              career.achievementState.keys=career.achievementState.keys.filter(function(k){
                return k!=='award-'+career.seasonNo+'-最有价值球员'&&k!=='award-'+career.seasonNo+'-MVP';
              });
            }
          }catch(e){}
          try{
            if(career.worldline&&career.worldline.achievements){
              career.worldline.achievements=career.worldline.achievements.filter(function(a){
                return !(a.seasonNo===career.seasonNo&&(a.title==='最有价值球员'||a.title==='MVP'));
              });
            }
          }catch(e){}
          if(typeof save==='function')save();
        }
      }catch(e){}
      return r;
    };
    window.__v86AwardGuard=true;
  }
}catch(e){}

window.__v86Debug={passes:v86MvpPasses,score:v86MvpScore,strip:v86StripMvpBoard,
  guards:{board:!!window.__v86BoardOff,regular:!!window.__v86RegularPatched,
          career:!!window.__v86CareerPatched,award:!!window.__v86AwardGuard}};

})();

