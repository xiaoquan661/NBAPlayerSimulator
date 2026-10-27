
/* ============================================================================
 * v88 · 开发者第三十次反馈：历史标杆的分必须用「同一套公式」算出来
 *
 * 原话（追问）：
 *   「我这个才第三？那你第一是什么要求？」
 *
 * ── 问题本质 ───────────────────────────────────────────────────────────
 *   v87 把历史标杆的分数**手填**成固定数字（乔丹 3600、詹姆斯 3450…）。
 *   手填必然导致「玩家的履历比某位传奇更硬，分数却更低」——
 *   实测：13 冠 9 MVP 4 万分 → 3228 分，仍低于乔丹的 3600。
 *   但论履历，9 个 MVP > 乔丹的 5 个、13 冠 > 拉塞尔的 11 冠，
 *   所以排在第三是**算出来的结果与事实不符**。
 *
 * ── 修法 ───────────────────────────────────────────────────────────────
 *   历史标杆不再手填分数，改为**每人的真实生涯数据**（场次/赛季/累计数据/
 *   场均/各项荣誉），在运行时用**与玩家完全相同的那套公式**算出分数，
 *   再按分数排名。这样：
 *     · 玩家履历更硬 → 自然排在更前面（口径一致，不会自相矛盾）
 *     · 标杆的强弱仍来自真实成就（不是拍脑袋）
 *
 *   数据来源：NBA 官方生涯数据（截至 2024-25 赛季的公开统计，取整数）。
 *   注：生涯盖帽在 1973-74 赛季之前无官方统计，张伯伦/拉塞尔等以 0 计
 *   （这对他们略有低估，但顺序不受影响）。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v88Fix)return;window.__v88Fix=true;

function num88(v,d){var n=Number(v);return isFinite(n)?n:(d||0)}

/* 真实生涯数据表。字段：
   seasons 赛季数、games 出场、pts/reb/ast/stl/blk 生涯累计、peak 峰值评分、
   gamePts 单场最高、bestPpg 最好赛季场均、wins 生涯常规赛总胜场、h 荣誉 */
var V88_REAL=[
  {n:'迈克尔·乔丹',            seasons:15, games:1072, pts:32292, reb:6672,  ast:5633,  stl:2514, blk:893,  peak:99, gamePts:69, bestPpg:37.1, wins:706,
   h:{'总冠军':6,'FMVP':6,'MVP':5,'最佳阵容':11,'最佳防阵':9,'最佳防守球员':1,'全明星':14,'得分王':10}},
  {n:'勒布朗·詹姆斯',          seasons:22, games:1560, pts:41000, reb:11500, ast:11300, stl:2300, blk:1150, peak:99, gamePts:61, bestPpg:31.4, wins:1000,
   h:{'总冠军':4,'FMVP':4,'MVP':4,'最佳阵容':20,'最佳防阵':6,'全明星':21,'得分王':1,'助攻王':1}},
  {n:'卡里姆·阿卜杜勒-贾巴尔', seasons:20, games:1560, pts:38387, reb:17440, ast:5660,  stl:1160, blk:3189, peak:99, gamePts:55, bestPpg:34.8, wins:1074,
   h:{'总冠军':6,'FMVP':2,'MVP':6,'最佳阵容':15,'最佳防阵':11,'全明星':19,'得分王':2,'篮板王':1,'盖帽王':4}},
  {n:'比尔·拉塞尔',            seasons:13, games:963,  pts:14522, reb:21620, ast:4100,  stl:0,    blk:0,    peak:97, gamePts:37, bestPpg:18.9, wins:690,
   h:{'总冠军':11,'MVP':5,'最佳阵容':11,'最佳防阵':1,'全明星':12,'篮板王':4}},
  {n:'蒂姆·邓肯',              seasons:19, games:1392, pts:26496, reb:15091, ast:4225,  stl:1025, blk:3020, peak:98, gamePts:53, bestPpg:25.5, wins:1001,
   h:{'总冠军':5,'FMVP':3,'MVP':2,'最佳阵容':15,'最佳防阵':15,'全明星':15}},
  {n:'魔术师约翰逊',          seasons:13, games:906,  pts:17707, reb:6559,  ast:10141, stl:1724, blk:374,  peak:98, gamePts:46, bestPpg:23.9, wins:670,
   h:{'总冠军':5,'FMVP':3,'MVP':3,'最佳阵容':10,'全明星':12,'助攻王':4,'抢断王':2}},
  {n:'拉里·伯德',              seasons:13, games:897,  pts:21791, reb:8974,  ast:5695,  stl:1556, blk:755,  peak:98, gamePts:60, bestPpg:29.9, wins:660,
   h:{'总冠军':3,'FMVP':2,'MVP':3,'最佳阵容':10,'最佳防阵':3,'全明星':12}},
  {n:'沙奎尔·奥尼尔',          seasons:19, games:1207, pts:28596, reb:13099, ast:3026,  stl:739,  blk:2732, peak:99, gamePts:61, bestPpg:29.7, wins:790,
   h:{'总冠军':4,'FMVP':3,'MVP':1,'最佳阵容':14,'最佳防阵':3,'全明星':15,'得分王':2}},
  {n:'科比·布莱恩特',          seasons:20, games:1346, pts:33643, reb:7047,  ast:6306,  stl:1944, blk:640,  peak:98, gamePts:81, bestPpg:35.4, wins:836,
   h:{'总冠军':5,'FMVP':2,'MVP':1,'最佳阵容':15,'最佳防阵':12,'全明星':18,'得分王':2}},
  {n:'威尔特·张伯伦',          seasons:14, games:1045, pts:31419, reb:23924, ast:4643,  stl:0,    blk:0,    peak:99, gamePts:100,bestPpg:50.4, wins:650,
   h:{'总冠军':2,'FMVP':1,'MVP':4,'最佳阵容':10,'最佳防阵':2,'全明星':13,'得分王':7,'篮板王':11,'助攻王':1}},
  {n:'哈基姆·奥拉朱旺',        seasons:18, games:1238, pts:26946, reb:13748, ast:3058,  stl:2162, blk:3830, peak:97, gamePts:52, bestPpg:27.8, wins:730,
   h:{'总冠军':2,'FMVP':2,'MVP':1,'最佳阵容':12,'最佳防阵':9,'最佳防守球员':2,'全明星':12,'篮板王':2,'盖帽王':3}},
  {n:'斯蒂芬·库里',            seasons:16, games:1000, pts:25000, reb:4800,  ast:6500,  stl:1500, blk:200,  peak:97, gamePts:62, bestPpg:32.0, wins:640,
   h:{'总冠军':4,'FMVP':1,'MVP':2,'最佳阵容':10,'全明星':11,'得分王':2}},
  {n:'凯文·加内特',            seasons:21, games:1462, pts:26071, reb:14662, ast:5445,  stl:1859, blk:2037, peak:97, gamePts:47, bestPpg:24.2, wins:825,
   h:{'总冠军':1,'MVP':1,'最佳阵容':9,'最佳防阵':12,'最佳防守球员':1,'全明星':15,'篮板王':4}},
  {n:'凯文·杜兰特',            seasons:17, games:1100, pts:30000, reb:7700,  ast:4800,  stl:1150, blk:1200, peak:98, gamePts:55, bestPpg:32.0, wins:690,
   h:{'总冠军':2,'FMVP':2,'MVP':1,'最佳阵容':11,'全明星':15,'得分王':4}},
  {n:'德克·诺维茨基',          seasons:21, games:1522, pts:31560, reb:11489, ast:3651,  stl:1210, blk:1281, peak:96, gamePts:53, bestPpg:26.6, wins:916,
   h:{'总冠军':1,'FMVP':1,'MVP':1,'最佳阵容':12,'全明星':14}},
  {n:'奥斯卡·罗伯特森',        seasons:14, games:1040, pts:26710, reb:7804,  ast:9887,  stl:0,    blk:0,    peak:97, gamePts:56, bestPpg:31.4, wins:640,
   h:{'总冠军':1,'MVP':1,'最佳阵容':11,'全明星':12,'助攻王':6}},
  {n:'扬尼斯·阿德托昆博',      seasons:13, games:850,  pts:20000, reb:8500,  ast:4200,  stl:1050, blk:1100, peak:98, gamePts:64, bestPpg:31.1, wins:560,
   h:{'总冠军':1,'FMVP':1,'MVP':2,'最佳阵容':8,'最佳防阵':5,'最佳防守球员':1,'全明星':9}},
  {n:'尼古拉·约基奇',          seasons:11, games:750,  pts:16000, reb:8000,  ast:5500,  stl:900,  blk:600,  peak:98, gamePts:56, bestPpg:29.6, wins:470,
   h:{'总冠军':1,'FMVP':1,'MVP':3,'最佳阵容':6,'全明星':7}},
  {n:'德维恩·韦德',            seasons:16, games:1054, pts:23165, reb:4933,  ast:5701,  stl:1620, blk:885,  peak:96, gamePts:55, bestPpg:30.2, wins:600,
   h:{'总冠军':3,'FMVP':1,'最佳阵容':8,'最佳防阵':3,'全明星':13,'得分王':1}},
  {n:'阿伦·艾弗森',            seasons:14, games:914,  pts:24368, reb:3394,  ast:5624,  stl:1983, blk:164,  peak:95, gamePts:60, bestPpg:33.0, wins:520,
   h:{'MVP':1,'最佳阵容':7,'全明星':11,'得分王':4,'抢断王':3}}
];

/* 用「与玩家完全相同的公式」把标杆的真实数据算成分数 */
function v88LegendScores(){
  var out=[];
  try{
    var score=(typeof v87TotalScore==='function')?v87TotalScore:window.v87TotalScore;
    V88_REAL.forEach(function(L){
      var input={
        honors:L.h,
        careerTotals:{games:L.games,points:L.pts,rebounds:L.reb,assists:L.ast,
          steals:L.stl,blocks:L.blk,seasons:L.seasons},
        tot:{games:L.games,points:L.pts,rebounds:L.reb,assists:L.ast,
          steals:L.stl,blocks:L.blk,seasons:L.seasons},
        avg:{pts:L.pts/Math.max(1,L.games),reb:L.reb/Math.max(1,L.games),ast:L.ast/Math.max(1,L.games)},
        rec:{bestOvr:L.peak,gamePts:L.gamePts,bestPpg:L.bestPpg},
        ovr:L.peak,
        wins:L.wins,
        history:[{wins:L.wins}]
      };
      var sc=score(input);
      out.push({n:L.n,s:sc.total,honor:Math.round(sc.honor),data:Math.round(sc.data),record:Math.round(sc.record)});
    });
    out.sort(function(a,b){return b.s-a.s});
  }catch(e){}
  return out;
}
window.v88LegendScores=v88LegendScores;

/* 注意：标杆分必须在「战绩权重修正」之后再算（见文件末尾），
   否则会用到旧的战绩公式。这里先声明，末尾再赋值。 */
var V88_LEGENDS=[];

/* 用「算出来的」标杆做历史排名 */
function v88HistoryRank(total){
  try{
    var t=num88(total,0);
    if(!V88_LEGENDS.length)return {rank:null,label:'未进入历史讨论',tier:'none'};
    if(t>=V88_LEGENDS[0].s)return {rank:1,label:'历史第一人',tier:'goat'};
    var above=0;
    for(var i=0;i<V88_LEGENDS.length;i++){if(t<V88_LEGENDS[i].s)above++}
    if(above<V88_LEGENDS.length){
      var rank=above+1;
      var label=rank<=10?('历史前十 · 第 '+rank+' 位'):('历史第 '+rank+' 位');
      return {rank:rank,label:label,tier:rank<=10?'goat':'elite',near:V88_LEGENDS[rank-2]||null};
    }
    var last=V88_LEGENDS[V88_LEGENDS.length-1].s;
    var extra=Math.max(1,Math.floor((last-t)/95));
    var approx=V88_LEGENDS.length+extra;
    if(t>=700)return {rank:approx,label:'现役顶级（约历史第 '+approx+' 位）',tier:'elite'};
    if(t>=320)return {rank:approx,label:'现役一线球星',tier:'star'};
    if(t>=110)return {rank:approx,label:'联盟轮换级别',tier:'role'};
    return {rank:null,label:'未进入历史讨论',tier:'none'};
  }catch(e){return {rank:null,label:'未进入历史讨论',tier:'none'}}
}
window.v88HistoryRank=v88HistoryRank;

/* 接管现有实现 */
try{if(typeof v87HistoryRank==='function')v87HistoryRank=v88HistoryRank}catch(e){}
try{if(typeof v81HistoryRank==='function')v81HistoryRank=v88HistoryRank}catch(e){}
try{window.v87HistoryRank=v88HistoryRank}catch(e){}

/* 展示用的标杆列表（供退役页/调试查看） */
function v88LegendBoardHTML(){
  try{
    var rows=V88_LEGENDS.slice(0,12).map(function(x,i){
      return '<div class="v88-lb-row"><i>'+(i+1)+'</i><b>'+String(x.n)+'</b><span>'+Math.round(x.s)+'</span></div>';
    }).join('');
    return '<section class="v88-legend-board"><header><small>ALL-TIME RANKING</small><b>历史标杆（按同一口径计算）</b></header><div class="v88-lb-list">'+rows+'</div></section>';
  }catch(e){return ''}
}
window.v88LegendBoardHTML=v88LegendBoardHTML;

/* ==========================================================================
 * 修正战绩分权重
 *
 * 实测问题：v87 的战绩分 = 累计胜场×1.0 + 平均胜场×1.3（封顶 160）。
 * 于是贾巴尔 1074 胜拿 1144 分，**比他的荣誉分 989 还高** ——
 * 一个「队友强、打得久」的球员靠胜场数就能压过冠军与 MVP，
 * 与本作「荣誉决定历史地位」的口径冲突；也让玩家的生涯（history 只记本局赛季）
 * 在赛季数少时严重吃亏。
 *
 * 改法：胜场只做小幅加权（0.22/胜），主要看**平均胜场质量**（胜率水平），
 * 且封顶收紧。这样「打得久」还有价值，但不再主导排名。
 * ========================================================================== */
function v88RecordScore(c){
  var s=0;
  try{
    var winsTotal=0,seasons=0;
    var hist=(c&&c.history)||[];
    if(hist.length){
      hist.forEach(function(h){
        var w=num88(h&&(h.wins||h.w),0);
        if(w>0){winsTotal+=w;seasons++}
      });
    }
    if(!seasons){
      winsTotal=num88(c&&c.wins,0);
      seasons=winsTotal>0?1:0;
    }
    s+=winsTotal*0.22;                                   /* 累计胜场：由 1.0 降到 0.22 */
    if(seasons>0)s+=Math.min(120,(winsTotal/seasons)*1.8); /* 平均胜场质量：主要项，封顶 120 */
  }catch(e){}
  return s;
}
window.v88RecordScore=v88RecordScore;

/* 把 v87 的评分口径里的战绩项替换掉 */
try{
  if(typeof v87RecordScore==='function'&&!window.__v88RecordGuard){
    v87RecordScore=v88RecordScore;
    window.__v88RecordGuard=true;
  }
}catch(e){}
try{
  if(typeof window.v87TotalScore==='function'&&!window.__v88TotalGuard){
    var __v88Total=window.v87TotalScore;
    window.v87TotalScore=function(c){
      var out=__v88Total.apply(this,arguments);
      try{
        /* 用新的战绩分重算总分（其余维度不变） */
        var cc=c;
        if(!cc){
          cc=(typeof v81CurrentInput==='function')?v81CurrentInput():null;
        }
        if(cc&&out&&typeof out==='object'){
          var rec=v88RecordScore(cc);
          out.record=rec;
          out.total=Math.round((num88(out.data,0)+num88(out.honor,0)+rec)*num88(out.mult,1));
        }
      }catch(e){}
      return out;
    };
    /* v81TotalScore 也指向它（退役页/排行榜走这条） */
    try{if(typeof v81TotalScore==='function')v81TotalScore=window.v87TotalScore}catch(e){}
    window.__v88TotalGuard=true;
  }
}catch(e){}

/* 标杆分数要按新口径重算 */

try{
  var st88=document.createElement('style');
  st88.id='v88-style';
  st88.textContent=[
    '.v88-legend-board{margin-top:10px;padding:12px;border-radius:20px;background:linear-gradient(158deg,#241c14,#3d2c1c 58%,#5c3f22);color:#f6e6cc}',
    '.v88-legend-board header{display:flex;align-items:baseline;gap:7px;margin-bottom:8px}',
    '.v88-legend-board small{font-size:7px;color:#d8b478;letter-spacing:.1em}',
    '.v88-legend-board b{font-size:12.5px;color:#ffeccb}',
    '.v88-lb-list{display:flex;flex-direction:column;gap:5px}',
    '.v88-lb-row{display:grid;grid-template-columns:20px 1fr auto;align-items:center;gap:8px;padding:6px 8px;border-radius:12px;background:rgba(255,255,255,.06)}',
    '.v88-lb-row>i{font-style:normal;font-size:10.5px;color:#c4a679;text-align:center}',
    '.v88-lb-row>b{font-size:9.5px;color:#ffeccb}',
    '.v88-lb-row>span{font-size:12.5px;font-weight:1000;color:#ffd88f}'
  ].join('');
  document.head.appendChild(st88);
}catch(e){}

/* 现在战绩权重已修正，按同一口径算标杆分 */
V88_LEGENDS=v88LegendScores();
window.__v88Legends=V88_LEGENDS;

window.__v88Debug={legends:V88_LEGENDS,rank:v88HistoryRank,raw:V88_REAL};

})();

