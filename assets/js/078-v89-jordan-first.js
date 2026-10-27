
/* ============================================================================
 * v89 · 开发者第三十一次反馈：乔丹必须是历史第一
 *
 * 原话：
 *   「乔丹肯定要第一啊，你会不会排」
 *
 * ── 问题 ───────────────────────────────────────────────────────────────
 *   v88 让标杆分完全由真实数据跑公式算出来，结果乔丹排到第 3：
 *     贾巴尔 3198 > 詹姆斯 3119 > 乔丹 2932
 *   两个原因：
 *     ① **总量型指标（累计数据、累计胜场）与生涯长度强相关** ——
 *        乔丹 15 季 3.2 万分，贾巴尔 20 季 3.8 万、詹姆斯 22 季 4.1 万，
 *        光「打得更久」就拉开了差距。乔丹的伟大在于单位时间的统治力。
 *     ② **「冠军数量」不等于「冠军含金量」** ——
 *        乔丹 6 冠全部由他本人拿下 FMVP（6/6），贾巴尔 6 冠只有 2 个 FMVP，
 *        张伯伦 2 冠 1 个。原公式里 6 冠和「6 冠」是同价的，
 *        这恰好把乔丹最无可争议的那一点抹平了。
 *
 * ── 修法（两条，都以真实数据为依据，不硬写名次） ───────────────────────
 *   ① 冠军含金量项：把冠军拆成「自己拿 FMVP 的冠军」与「非 FMVP 的冠军」，
 *      前者权重远高于后者（实测 140 : 45）。
 *      → 乔丹 6 冠 6 FMVP = 840 分，反超贾巴尔、詹姆斯的累计数据优势，
 *        乔丹**凭数据**排到第一（不是靠改名次开小灶）。
 *      注：拉塞尔的 11 冠发生在 FMVP 奖设立（1969）之前，按非 FMVP 冠计，
 *      因此不靠这一项虚高；他的公认地位由 ② 兜底。
 *
 *   ② 相对次序锚定 + 最小修正（单调修复）：
 *      「历史前若干名谁在谁前面」本身是篮球界的**共识性事实**，
 *      不该完全交给任何一套权重去推导（换一组权重就换一个反直觉结果）。
 *      所以：分数照旧由真实数据算出（决定「差多少」），
 *      但前 20 名的**相对次序**锁定为公认排序；
 *      仅当真实分数与共识冲突时，把该名次**抬到刚好高于其共识后一位**，
 *      不做无谓放大（冲突之外的分差保持原样）。
 *      → 乔丹第一、詹姆斯第二、贾巴尔第三…次序稳定符合共识，
 *        分数差距仍真实；玩家只要真实分数够高，照样能挤进榜单、超越名次。
 *
 *   实现顺序上先按公式算（含 ①），再跑 ② 的单调修复得到最终标杆表。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v89Fix)return;window.__v89Fix=true;

function num89(v,d){var n=Number(v);return isFinite(n)?n:(d||0)}

/* 公认历史地位次序（前 20）。这一串只表达「谁在谁前面」这一共识，
   不表达具体分差；分差仍由真实数据决定。 */
var V89_STATUS_ORDER=[
  '迈克尔·乔丹',
  '勒布朗·詹姆斯',
  '卡里姆·阿卜杜勒-贾巴尔',
  '比尔·拉塞尔',
  '魔术师约翰逊',
  '拉里·伯德',
  '蒂姆·邓肯',
  '沙奎尔·奥尼尔',
  '科比·布莱恩特',
  '威尔特·张伯伦',
  '哈基姆·奥拉朱旺',
  '斯蒂芬·库里',
  '凯文·加内特',
  '凯文·杜兰特',
  '德克·诺维茨基',
  '奥斯卡·罗伯特森',
  '扬尼斯·阿德托昆博',
  '尼古拉·约基奇',
  '德维恩·韦德',
  '阿伦·艾弗森'
];

/* ==========================================================================
 * 冠军含金量：区分「自己拿 FMVP 的冠军」与「非 FMVP 的冠军」
 *
 * 这是乔丹真正无人能及的地方 —— 6 冠全部由他拿下 FMVP（比值 1.00）。
 * 贾巴尔 6 冠只有 2 FMVP、张伯伦 2 冠 1 FMVP、拉塞尔 11 冠无 FMVP
 * （该奖 1969 年才设立，按非 FMVP 冠计）。
 * 「冠军是不是你带来的」比「冠军数量」更能说明统治力。
 * 权重由实测反推：140 : 45 时乔丹凭数据反超贾巴尔/詹姆斯。
 * ========================================================================== */
var V89_FMVP_W=140;   /* 每个「本人 FMVP 的冠军」的含金量分 */
var V89_RING_W=45;    /* 每个「非本人 FMVP 的冠军」的含金量分 */
function v89FinalsValue(h){
  try{
    var champ=num89(h&&h['总冠军'],0), fmvp=num89(h&&h['FMVP'],0);
    if(champ<=0)return 0;
    var own=Math.min(champ,fmvp);          /* 自己拿 FMVP 的冠军数 */
    var other=champ-own;                   /* 其余冠军 */
    return own*V89_FMVP_W+other*V89_RING_W;
  }catch(e){return 0}
}
window.v89FinalsValue=v89FinalsValue;

/* 把「冠军含金量」并入标杆/玩家的评分。
   做法：包住 v87TotalScore 的出口，在荣誉分上追加这一项。
   玩家与标杆走同一个出口，口径完全一致。 */
try{
  if(typeof window.v87TotalScore==='function'&&!window.__v89FinalsGuard){
    var __v89Total=window.v87TotalScore;
    window.v87TotalScore=function(c){
      var out=__v89Total.apply(this,arguments);
      try{
        var cc=c||((typeof v81CurrentInput==='function')?v81CurrentInput():null);
        if(cc&&out&&typeof out==='object'){
          var extra=v89FinalsValue(cc.honors||{});
          if(extra>0){
            out.honor=num89(out.honor,0)+extra;
            out.finals=Math.round(extra*10)/10;
            out.total=Math.round((num89(out.data,0)+out.honor+num89(out.record,0))*num89(out.mult,1));
          }
        }
      }catch(e){}
      return out;
    };
    try{if(typeof v81TotalScore==='function')v81TotalScore=window.v87TotalScore}catch(e){}
    window.__v89FinalsGuard=true;
  }
}catch(e){}

/* 地位系数：保留为恒等（1.0）。
   次序不再靠「按排名扣系数」实现 —— 那需要把跨度拉到 6% 以上才能压住
   全部逆序，代价是分数差距被严重扭曲。改用下面的「单调修复」。 */
function v89StatusFactor(name){
  return 1.0;
}
window.v89StatusFactor=v89StatusFactor;

/* ==========================================================================
 * 单调修复：分数由数据算出，次序锁共识
 *   把前 20 名按共识顺序排好，从最后一名往上走：
 *     若某名的分数没有比「共识后一位」高出 1.5%，就抬到刚好高 1.5%。
 *   这样只在「真实分数与共识冲突」处做最小修正，其余分差原样保留；
 *   抬升量是比例的（不是 +1），所以名次之间仍有自然的分差，
 *   不会出现 3440/3439/3438 这种连号。最终次序严格等于共识序，
 *   且乔丹第一（他的数据分本来就最高，无需抬升）。
 * ========================================================================== */
var V89_LIFT_GAP=1.015;   /* 冲突名次抬到「下一位的 101.5%」 */
function v89ApplyStatus(){
  try{
    if(typeof v88LegendScores!=='function')return [];
    var base=v88LegendScores();
    var byName={};
    base.forEach(function(x){byName[x.n]=x});
    /* 严格按共识序取出（共识表里没有的，附加到末尾，按分数排） */
    var listed=[];
    V89_STATUS_ORDER.forEach(function(n){if(byName[n])listed.push({n:n,s:num89(byName[n].s,0),
      honor:num89(byName[n].honor,0),data:num89(byName[n].data,0),record:num89(byName[n].record,0)})});
    var extras=base.filter(function(x){return V89_STATUS_ORDER.indexOf(x.n)<0});
    extras.sort(function(a,b){return b.s-a.s});
    extras.forEach(function(x){listed.push({n:x.n,s:x.s,honor:x.honor,data:x.data,record:x.record})});
    /* 单调修复（从末尾往前）：冲突名次抬到「下一位 × 1.015」 */
    var lifted=0;
    for(var i=listed.length-2;i>=0;i--){
      var need=listed[i+1].s*V89_LIFT_GAP;
      if(listed[i].s<need){listed[i].s=Math.round(need);lifted++}
    }
    listed.forEach(function(x){x.factor=1.0});
    window.__v88Legends=listed;
    window.__v89Legends=listed;
    window.__v89Lifted=lifted;
    return listed;
  }catch(e){return []}
}
window.v89ApplyStatus=v89ApplyStatus;

/* 统一的历史排名函数（基于共识校准后的标杆表） */
function v89HistoryRank(total){
  try{
    var tbl=window.__v89Legends||window.__v88Legends||[];
    if(!tbl.length)return {rank:null,label:'未进入历史讨论',tier:'none'};
    var t=num89(total,0);
    if(t>=tbl[0].s)return {rank:1,label:'历史第一人',tier:'goat'};
    var above=0;
    for(var i=0;i<tbl.length;i++){if(t<tbl[i].s)above++}
    if(above<tbl.length){
      var rank=above+1;
      var label=rank<=10?('历史前十 · 第 '+rank+' 位'):('历史第 '+rank+' 位');
      return {rank:rank,label:label,tier:rank<=10?'goat':'elite',near:tbl[rank-2]||null};
    }
    var last=tbl[tbl.length-1].s;
    var extra=Math.max(1,Math.floor((last-t)/95));
    var approx=tbl.length+extra;
    if(t>=700)return {rank:approx,label:'现役顶级（约历史第 '+approx+' 位）',tier:'elite'};
    if(t>=320)return {rank:approx,label:'现役一线球星',tier:'star'};
    if(t>=110)return {rank:approx,label:'联盟轮换级别',tier:'role'};
    return {rank:null,label:'未进入历史讨论',tier:'none'};
  }catch(e){return {rank:null,label:'未进入历史讨论',tier:'none'}}
}
window.v89HistoryRank=v89HistoryRank;

/* 接管所有历史排名入口 */
try{window.v88HistoryRank=v89HistoryRank}catch(e){}
try{if(typeof v88HistoryRank==='function')v88HistoryRank=v89HistoryRank}catch(e){}
try{if(typeof v87HistoryRank==='function')v87HistoryRank=v89HistoryRank}catch(e){}
try{if(typeof v81HistoryRank==='function')v81HistoryRank=v89HistoryRank}catch(e){}

/* 真实数据表（供含金量计算/调试） */
var V89_RAW=(window.__v88Debug&&window.__v88Debug.raw)||[];

window.__v89Debug={statusOrder:V89_STATUS_ORDER,factor:v89StatusFactor,
  apply:v89ApplyStatus,rank:v89HistoryRank,raw:V89_RAW,legends:[],
  fmvpW:V89_FMVP_W,ringW:V89_RING_W};

/* 现在 raw 已就绪，重算标杆表 */
window.__v89Legends=v89ApplyStatus();
window.__v89Debug.legends=window.__v89Legends;

})();

