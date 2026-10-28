
/* ============================================================================
 * v87 · 开发者第二十九次反馈：历史排名不合理
 *
 * 原话：
 *   「然后现在我四万分，九个mvp，13届总冠军，9个mvp，22次最佳阵容，结果才历史第17位，
 *     太不合理了」
 *
 * ── 根因（实测拆解）────────────────────────────────────────────────────
 *   以「4 万分 / 13 冠 / 9 MVP / 8 FMVP / 22 次最佳阵容 / 20 全明星」实测：
 *     总得分 = 3318 → 历史第 17（输给韦德 2900、艾弗森 2400）
 *   拆开看，问题有两处：
 *
 *   ① 荣誉权重太低，被「耐用性」压过：
 *        13 冠 169 + 8 FMVP 114 + 9 MVP 130 + 22 阵 89 + 5 DPOY 54 + 20 全明星 37 + 10 得分王 25
 *        = 荣誉合计约 418 分
 *      而单项「出场 1400 场 × 0.42」就有 588 分，赛季数 20×6.5=130。
 *      → **出场的分值比所有荣誉加起来还高**，历史地位被「打得久」主导，这与常识相反。
 *
 *   ② 历史标杆刻度偏高：乔丹 9200 起步，而顶级生涯算出来才 3318，
 *      于是「13 冠 9 MVP」也只能挤到第 17。
 *
 * ── 修法 ───────────────────────────────────────────────────────────────
 *   ① 荣誉权重整体上调（冠军/ MVP / FMVP 是历史地位的决定因素），
 *      并把「抑制刷次数」的强度调低一点，让多次夺冠能真实拉开差距。
 *   ② 降低「耐用性」类权重（出场数、赛季数），它应是加分项而非主导项。
 *   ③ 历史标杆刻度按新口径**重排**，让「历史前十」对应到真实的历史级生涯。
 *
 *   口径标定（修后实测，供核对）：
 *     4 万分 + 13 冠 + 9 MVP + 8 FMVP + 22 阵 → 历史前 3
 *     2 万分 + 3 冠 + 2 MVP                    → 历史前 12 左右
 *     1 万 5 千分 + 1 冠 + 1 全明星若干        → 历史前 25 左右
 *     纯数据无荣誉（2 万分、无冠无 MVP）        → 进不了历史前列（荣誉是硬通货）
 * ============================================================================ */
(function(){
'use strict';
if(window.__v87Fix)return;window.__v87Fix=true;

function num87(v,d){var n=Number(v);return isFinite(n)?n:(d||0)}

/* ==========================================================================
 * 一、重校评分口径：荣誉加重、耐用性减重
 * ========================================================================== */

/* 荣誉权重（新）。相比 v81：
   冠/ MVP / FMVP / 最佳阵容/ DPOY 全面上调；「刷次数」抑制从 0.5 降到 0.34，
   让「多次夺冠」的真实分量体现出来。 */
var V87_HONOR_W={
  总冠军:150, FMVP:120, MVP:135, 最佳阵容:52, 最佳防阵:30,
  最佳防守球员:60, 全明星:20, 最佳新秀:26, MIP:18,
  得分王:30, 篮板王:22, 助攻王:22, 盖帽王:22, 抢断王:22,
  '总冠军（世界赛）':70, '奥运会金牌':80
};
var V87_SQRT_K=0.34;    /* 刷次数抑制（原 0.5） */

function v87HonorScore(h){
  var s=0;
  try{
    Object.keys(V87_HONOR_W).forEach(function(k){
      var n=num87(h&&h[k],0);
      if(n<=0)return;
      s+=V87_HONOR_W[k]*(1+V87_SQRT_K*Math.sqrt(n-1));
    });
  }catch(e){}
  return s;
}

/* 数据分（新）：数据仍然重要，但**不再让「出场数」压过荣誉**。
   出场/赛季数的权重下调到原来的约 1/4。 */
function v87DataScore(tot,avg,rec){
  var s=0;
  try{
    tot=tot||{};avg=avg||{};rec=rec||{};
    s+=num87(tot.points,0)*0.0075;         /* 总得分：1 万分约 75 分 */
    s+=num87(tot.rebounds,0)*0.0040;
    s+=num87(tot.assists,0)*0.0050;
    s+=num87(tot.steals,0)*0.0080;
    s+=num87(tot.blocks,0)*0.0080;
    s+=num87(tot.games,0)*0.10;            /* 出场：由 0.42 降到 0.10（加分项，不主导） */
    s+=num87(tot.seasons,0)*4.0;           /* 赛季厚度：适配 12–15 赛季节奏（原 3.0） */
    s+=num87(avg.pts,0)*2.4;               /* 生涯场均（峰值能力）仍然重视 */
    s+=num87(avg.reb,0)*1.1;
    s+=num87(avg.ast,0)*1.3;
    s+=num87(rec.gamePts,0)*0.40;
    s+=num87(rec.bestPpg,0)*1.5;
  }catch(e){}
  return s;
}

/* 战绩分：略有提升（强队战绩是历史地位的一部分） */
function v87RecordScore(c){
  var s=0;
  try{
    var winsTotal=0,seasons=0;
    var hist=(c&&c.history)||[];
    if(hist.length){
      hist.forEach(function(h){
        var w=num87(h&&(h.wins||h.w),0);
        if(w>0){winsTotal+=w;seasons++}
      });
    }
    if(!seasons){
      winsTotal=num87(c&&c.wins,0);
      seasons=winsTotal>0?1:0;
    }
    s+=winsTotal*1.0;
    if(seasons>0)s+=Math.min(160,(winsTotal/seasons)*1.3);
  }catch(e){}
  return s;
}

/* 生涯高度系数：峰值越高，天花板越高（保持原口径） */
function v87HeightMult(peakOvr){
  var p=Math.max(60,Math.min(99,num87(peakOvr,78)));
  return 0.72+(p-60)/39*0.78;
}

/* 汇总（与 v81 同结构，便于替换与展示） */
function v87TotalScore(c){
  var out={total:0,data:0,honor:0,record:0,mult:1,peak:78};
  try{
    c=c||{};
    var avg={};
    try{avg=(typeof careerAverages==='function'&&c===career)?careerAverages():(c.avg||{})}catch(e){avg=c.avg||{}}
    var tot=c.tot||c.careerTotals||{};
    var rec=c.rec||c.records||{};
    var hon=c.honors||{};
    out.data=v87DataScore(tot,avg,rec);
    out.honor=v87HonorScore(hon);
    out.record=v87RecordScore(c);
    out.peak=Math.max(num87(rec.bestOvr,0),num87(c.ovr,0),78);
    out.mult=v87HeightMult(out.peak);
    out.total=Math.round((out.data+out.honor+out.record)*out.mult);
  }catch(e){}
  return out;
}
window.v87TotalScore=v87TotalScore;

/* 接管 v81 的评分函数（退役海报、排行榜、历史排名都走它） */
try{
  if(typeof v81TotalScore==='function'&&!window.__v87ScoreGuard){
    v81TotalScore=function(c){
      /* 保持与 v81 相同的入参风格：不传时取当前生涯 */
      try{
        if(!c){
          var inp=(typeof v81CurrentInput==='function')?v81CurrentInput():null;
          if(inp)return v87TotalScore(inp);
          return {total:0,data:0,honor:0,record:0,mult:1,peak:78};
        }
        return v87TotalScore(c);
      }catch(e){return {total:0,data:0,honor:0,record:0,mult:1,peak:78}}
    };
    window.__v87ScoreGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 二、历史标杆刻度重排
 *
 * 校准思路：让「历史前十」对应真正统治级的生涯。
 * 标杆分数 = 用新口径估算该球员的等效生涯分（含荣誉与数据量级）。
 * 顺序与真实历史评价基本一致。
 * ========================================================================== */
var V87_LEGENDS=[
  {n:'迈克尔·乔丹',s:3600},
  {n:'勒布朗·詹姆斯',s:3450},
  {n:'卡里姆·阿卜杜勒-贾巴尔',s:3100},
  {n:'比尔·拉塞尔',s:2850},
  {n:'蒂姆·邓肯',s:2600},
  {n:'魔术师约翰逊',s:2500},
  {n:'拉里·伯德',s:2400},
  {n:'沙奎尔·奥尼尔',s:2250},
  {n:'科比·布莱恩特',s:2150},
  {n:'威尔特·张伯伦',s:2050},
  {n:'哈基姆·奥拉朱旺',s:1750},
  {n:'斯蒂芬·库里',s:1700},
  {n:'凯文·加内特',s:1620},
  {n:'凯文·杜兰特',s:1580},
  {n:'德克·诺维茨基',s:1500},
  {n:'奥斯卡·罗伯特森',s:1430},
  {n:'扬尼斯·阿德托昆博',s:1360},
  {n:'尼古拉·约基奇',s:1300},
  {n:'德维恩·韦德',s:1180},
  {n:'阿伦·艾弗森',s:1050}
];

function v87HistoryRank(total){
  try{
    var t=num87(total,0);
    if(t>=V87_LEGENDS[0].s)return {rank:1,label:'历史第一人',tier:'goat'};
    var above=0;
    for(var i=0;i<V87_LEGENDS.length;i++){if(t<V87_LEGENDS[i].s)above++}
    if(above<V87_LEGENDS.length){
      var rank=above+1;
      /* 历史前十给「历史前十」的措辞（更有分量） */
      var label=rank<=10?('历史前十 · 第 '+rank+' 位'):('历史第 '+rank+' 位');
      return {rank:rank,label:label,tier:rank<=10?'goat':'elite'};
    }
    /* 没超过最后一个标杆：给区间名次（不与历史前 20 混同） */
    var extra=Math.max(1,Math.floor((V87_LEGENDS[V87_LEGENDS.length-1].s-t)/95));
    var approx=V87_LEGENDS.length+extra;
    if(t>=700)return {rank:approx,label:'现役顶级（约历史第 '+approx+' 位）',tier:'elite'};
    if(t>=320)return {rank:approx,label:'现役一线球星',tier:'star'};
    if(t>=110)return {rank:approx,label:'联盟轮换级别',tier:'role'};
    return {rank:null,label:'未进入历史讨论',tier:'none'};
  }catch(e){return {rank:null,label:'未进入历史讨论',tier:'none'}}
}
window.v87HistoryRank=v87HistoryRank;
try{if(typeof v81HistoryRank==='function')v81HistoryRank=v87HistoryRank}catch(e){}

/* ==========================================================================
 * 三、评级与名人堂门槛按新刻度同步
 * ========================================================================== */
var V87_GRADES=[
  [3200,'一代传奇','GOAT 级生涯，足以改写这项运动的历史'],
  [2200,'历史级超巨','历史前十级别的统治力'],
  [1400,'超级巨星','常年联盟门面，历史榜单上的名字'],
  [850,'全明星常客','多年全明星，一段被记住的生涯'],
  [480,'球队基石','带队多年，联盟稳定的一线球星'],
  [240,'合格首发','在联盟站稳了脚跟'],
  [95,'轮换球员','留下过属于自己的时刻'],
  [0,'生涯遗憾','这一段旅程提前结束了']
];
function v87Grade(total){
  var t=num87(total,0);
  for(var i=0;i<V87_GRADES.length;i++){if(t>=V87_GRADES[i][0])return {name:V87_GRADES[i][1],desc:V87_GRADES[i][2]}}
  return {name:'生涯遗憾',desc:''};
}
window.v87Grade=v87Grade;
try{if(typeof v81Grade==='function')v81Grade=v87Grade}catch(e){}

function v87HallOfFame(total,honors){
  try{
    honors=honors||{};
    var t=num87(total,0);
    var champ=num87(honors['总冠军'],0),mvp=num87(honors['MVP'],0),fmvp=num87(honors['FMVP'],0);
    var allstar=num87(honors['全明星'],0),allnba=num87(honors['最佳阵容'],0);
    var hard=(champ>0)||(mvp>0)||(fmvp>0)||(allnba>=3)||(allstar>=6);
    if(t>=2200&&hard)return {ok:true,tier:'first',label:'名人堂 · 首轮入选',reason:'生涯成就与荣誉同时达标'};
    if(t>=700&&hard)return {ok:true,tier:'yes',label:'入选名人堂',reason:'总得分与硬荣誉均达标'};
    if(t>=1100&&!hard)return {ok:false,tier:'no',label:'未能入选名人堂',reason:'个人数据足够，但缺少冠军/MVP 这类决定性荣誉'};
    if(t>=700&&!hard)return {ok:false,tier:'no',label:'未能入选名人堂',reason:'生涯稳定，但缺少硬荣誉支撑'};
    return {ok:false,tier:'no',label:'未能入选名人堂',reason:'生涯成就尚不足以进入名人堂讨论'};
  }catch(e){return {ok:false,tier:'no',label:'未能入选名人堂',reason:''}}
}
window.v87HallOfFame=v87HallOfFame;
try{if(typeof v81HallOfFame==='function')v81HallOfFame=v87HallOfFame}catch(e){}

/* 对比区块里的「评分」也要跟着走新口径 */
try{
  if(typeof window.v84Compare==='function'&&!window.__v87CompareGuard){
    var __v87Compare=window.v84Compare;
    window.v84Compare=function(){
      var r=__v87Compare.apply(this,arguments);
      try{
        /* 对比用的是「新口径总分」，这里重算一遍替换掉其中沿用的旧值 */
        if(r&&r.real){
          var inp=(typeof v81CurrentInput==='function')?v81CurrentInput():null;
          if(inp){
            var sc=v87TotalScore(inp);
            r.score=sc.total;
            r.realScore=null;
          }
        }
      }catch(e){}
      return r;
    };
    window.__v87CompareGuard=true;
  }
}catch(e){}

window.__v87Debug={total:v87TotalScore,honor:v87HonorScore,data:v87DataScore,
  rank:v87HistoryRank,grade:v87Grade,hof:v87HallOfFame,legends:V87_LEGENDS,
  guards:{score:!!window.__v87ScoreGuard,compare:!!window.__v87CompareGuard}};

})();

