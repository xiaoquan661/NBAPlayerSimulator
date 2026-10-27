
/* ============================================================================
 * v61 · 场均数据与评分自洽
 *
 * 开发者反馈：「我玩本内特，83的评分凭啥能场均21.7分八篮板呢，你的评分应该是
 *               用九项属性平均的来的吧，你的场均数据也应该和评分，属性，出手权
 *               相关才对」
 *
 * 实测到的两个原因：
 *   ① 出手权被乘了两次：基础得分公式内建一层「按角色的出手权重」（0.82~1.22），
 *      v52 层随后又按队内排名独立乘了第二次（0.55~1.45）。两者叠乘最高约 1.77 倍。
 *      83 评分那一季基础 19.6 分被 v52 再乘 1.16 → 约 22.7 分，与实测 21.7 吻合。
 *   ② 评分与数据各用一套属性：评分看 11 项加权，得分只看终结/投射/组织 3 项。
 *      于是「进攻顶尖、防守与心态很差」的球员评分被拉到 83，得分却按顶尖进攻算。
 *
 * 本层做法（包在 statExpect 最外层，前面所有层（天赋/新秀上限/球权）都先算完）：
 *   本层只做「向下校准」，不抬高：
 *     allowed = min( 评分硬顶(OVR), 评分锚定期望 × 1.18 )
 *     final   = min( 内层结果, allowed )
 *   评分锚定期望 = 基线(OVR) × 得分属性结构修正 × 出场时间系数。
 *   1.18 的宽容系数留给天赋与球权：它们能把产量往上推，但推不过评分的上限。
 *   只向下是本层的安全边界——避免顶破内层的硬约束（新秀上限等）。
 *
 * 硬顶按「赛季场均」标定（不是单场期望值）：
 *   每场数据 = e.pts + rnd(-5,7) + form，其中 rnd(-5,7) 均值 +1、form 约 +0.6，
 *   所以玩家看到的赛季场均会比 e.pts 系统性地高出约 1.6 分。硬顶把这个正偏扣掉：
 *   cap(OVR) = 0.813×OVR − 50.1  →  83→17.4（显示场均约 19.0）、
 *   86→19.8（约 21.4）、90→23.1（约 24.7）、99→30.4（约 32.0）。
 *   于是 83 评分最多约 19 分，超级球星的产量留给 90+。
 * 篮板/助攻不改公式，只按评分档位加一道上限，保留球员定位差异。
 * ========================================================================== */
(function(){
'use strict';

/* ---------- 评分反推所需的权重（与 live calcOvr 一致） ---------- */
var W8={finishing:.14,shooting:.12,playmaking:.14,defense:.14,rebounding:.10,
        steals:.06,blocks:.05,strength:.06,athleticism:.08,durability:.06,mentality:.05};

function v61Ovr(a){
  if(!a)return 70;
  var s=0,k;
  for(k in W8)s+=((Number(a[k])||50)-50)*W8[k];
  return Math.max(50,Math.min(99,Math.round(57+s*0.95)));
}

/* ---------- 评分档位 → 产出基线（反解自真实 NBA 档位） ---------- */
var ROLES={'联盟门面':36,'超级巨星':35,'全明星核心':34,'球队核心':32,'稳定首发':29,'轮换球员':22,'边缘球员':14};

function v61RoleOf(o){
  if(o>=94)return '联盟门面';
  if(o>=90)return '超级巨星';
  if(o>=86)return '全明星核心';
  if(o>=82)return '球队核心';
  if(o>=78)return '稳定首发';
  if(o>=74)return '轮换球员';
  return '边缘球员';
}
function v61AnchorPts(o){return Math.max(3.5,Math.min(31,0.813*o-50.7))}
/* 硬顶：按「赛季场均」标定，而不是按「单场期望值」。
   每场数据是 e.pts + rnd(-5,7) + form，其中 rnd(-5,7) 均值 +1、form 约 +0.6，
   所以显示的赛季场均会比 e.pts 系统性高出约 1.6 分。硬顶必须把这 1.6 分扣掉，
   否则 83 评分标定为 19 分，玩家实际看到的是 20.6 分。
   → cap(83) = 17.4，显示场均约 19.0 分。 */
function v61CapPts(o){return 0.813*o-50.1}
function v61AnchorReb(o){return Math.max(2.5,Math.min(14,0.30*o-18.1))}
function v61AnchorAst(o){return Math.max(0.8,Math.min(10,0.235*o-16.5))}

function v61Clamp(v,lo,hi){return v<lo?lo:(v>hi?hi:v)}

/* 属性结构修正：把球员在「与该项相关的属性」上的相对位置映射到 ±span。
   基准是「该评分下联盟平均属性值」——由 OVR 公式反推：属性全为 X 时 OVR=57+(X−50)×0.95。 */
function v61Shape(a,ovr,keys,span){
  var m=0,r=0,i;
  for(i=0;i<keys.length;i++){m+=(Number(a[keys[i][0]])||50)*keys[i][1];r+=keys[i][1];}
  if(r<=0)return 1;
  var avg=50+(ovr-57)/0.95;
  return 1+v61Clamp((m/r-avg)*0.012,-span,span);
}

var V61_SK=[['finishing',.45],['shooting',.40],['playmaking',.15]];   /* 得分结构 */

/* 基础公式（与底层 L293 完全一致）——只用来做 ratio 的分母 */
function v61OldBasePts(a,role,min,id,conf,spec){
  var u=({'联盟门面':1.22,'超级巨星':1.16,'全明星核心':1.09,'球队核心':1.04,'稳定首发':.96}[role]||.82);
  if(id==='simmons')u*=0.95+(Number(spec)||0)/350;
  if(id==='bennett')u*=0.78+(Number(conf)||0)/500;
  var scoring=(Number(a.finishing)||50)*0.45+(Number(a.shooting)||50)*0.40+(Number(a.playmaking)||50)*0.15;
  return Math.min(31,Math.max(3,(scoring-40)*0.36*((Number(min)||30)/30)*u+3));
}

try{
  var __v61Stat=statExpect;

  statExpect=function(){
    var inner=null;
    try{inner=__v61Stat()}catch(e){inner=null}
    if(!inner||typeof inner!=='object')inner={pts:6,reb:3,ast:1,stl:.5,blk:.3};
    try{
      if(!career||!career.attrs)return inner;
      var a=career.attrs;
      var ovr=Math.max(50,Math.min(99,Math.round(Number(career.ovr)||v61Ovr(a))));
      var role=career.role||v61RoleOf(ovr);
      var min=Number(career.minutes)||30;

      /* ---------- 得分：只做「向下校准」 ----------
         内层已经算完（含天赋、球权、新秀上限等）。本层的职责是把「评分撑不起
         的高产量」压回评分能解释的范围，而不是反过来把低产量抬上去——否则会
         顶破新秀上限这类内层硬约束。

           allowed = min( 评分硬顶(OVR), 评分锚定期望 × 1.18 )
           final   = min( 内层结果, allowed )

         两道限制各有分工：
           硬顶     —— 对全联盟统一，保证「83 评分最多约 19 分」这条线。
           锚定期望 —— 对个体，按他的进攻属性结构与出场时间算出的合理产量；
                       防守型/组织型球员进攻属性低，锚定期望自然低于硬顶，
                       于是同一评分下他们的得分上限更低（这正是要的差异）。
         1.18 的宽容系数留给天赋与球权：它们能把产量往上推，但推不过上面两条线。 */
      var natural=ROLES[role]||32;
      var minAdj=v61Clamp(min/Math.max(1,natural),0.55,1.25);
      var anchor=v61AnchorPts(ovr)*v61Shape(a,ovr,V61_SK,0.20)*minAdj;
      var cap=v61CapPts(ovr);
      var allowed=Math.min(cap,anchor*1.18);
      var want=Number(inner.pts)||0;
      var pts=Math.min(want,allowed);
      inner.pts=+Math.max(1.5,pts).toFixed(1);

      /* ---------- 篮板/助攻：同样只向下校准，保留球员定位差异 ----------
         上限 = 评分档位基准 × 1.45；下限不动（内层已经考虑了位置与时间）。 */
      var minScale=v61Clamp(min/Math.max(1,natural),0.6,1.15);
      var aReb=v61AnchorReb(ovr)*minScale, aAst=v61AnchorAst(ovr)*minScale;
      var r0=Number(inner.reb)||0, s0=Number(inner.ast)||0;
      inner.reb=+Math.max(0.5,Math.min(r0,aReb*1.45)).toFixed(1);
      inner.ast=+Math.max(0.3,Math.min(s0,aAst*1.60)).toFixed(1);

      /* 供界面解释「为什么是这个数据」 */
      career.v61=career.v61||{};
      career.v61.anchor=Math.round(anchor*10)/10;
      career.v61.cap=Math.round(cap*10)/10;
      career.v61.allowed=Math.round(allowed*10)/10;
      career.v61.want=Math.round(want*10)/10;
      career.v61.trimmed=want>allowed+0.05;
      career.v61.ovr=ovr;
    }catch(e){}
    return inner;
  };
}catch(e){}

window.__v61Debug={
  ovrOf:v61Ovr, roleOf:v61RoleOf, anchorPts:v61AnchorPts, capPts:v61CapPts,
  anchorReb:v61AnchorReb, anchorAst:v61AnchorAst, shape:v61Shape
};

})();

