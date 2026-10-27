
/* ============================================================================
 * V108 · 「意难平」第二位：德里克·罗斯（Derrick Rose）
 *
 * 设计主题（和姚明刻意做成两种不同的「意难平」）：
 *   姚明输给的是「被用尽」——国家队 + 俱乐部连轴转；
 *   罗斯输给的是「自己的打法」——他的强大本身就在消耗膝盖。
 *   所以他的天赋不该是「自动免疫伤病」（那是姚明的答案），而应该是
 *   **把风险变成玩家每一次都能看见、并且必须自己做的选择**：
 *     想爆 → 负荷上升 → 数据更炸、但膝盖在报警；
 *     想稳 → 主动收着打 → 数据下滑，但能活到后面。
 *   真实历史里的 2012 那次落地、2013 的报销，都变成可改写的节点。
 *
 * 专属天赋「玫瑰之名」（rose_x）机制（全部可见、有数字）：
 *   ① 开局：终结 +4、运动 +6、健康 +6；负荷从 0 开始
 *   ② 高光夜：单场出手 ≥18 且得分 ≥25 → 负荷 +1（上限 5 层）
 *   ③ 每层负荷：伤病概率 ×1.15（叠加），同时场上效率 ×1.02（越爆越强、也越脆）
 *   ④ 负荷 ≥3 层：当季触发《膝盖在报警》专属节点，三选一（继续爆 / 收着打 / 提前封盘）
 *   ⑤ 「收着打」：每赛季 3 次，清空负荷、健康 +8，且本场出手 -40%
 *   ⑥ 落地保护：生涯前 4 个赛季里，第一次「报销级膝伤」被改写成短期伤（一次性）
 *   ⑦ 每个休赛期：负荷清零、健康 +6
 * ============================================================================ */
(function(){
'use strict';
if(window.__v108Rose)return;window.__v108Rose=true;

/* ---------- 1. 球员对象 ---------- */
var ROSE={
  id:'rose',
  zh:'德里克·罗斯',
  en:'Derrick Rose',
  year:2008,
  age:19,
  team:'CHI',
  pos:'PG',
  ovr:78,
  title:'如果那一下没有落地',
  tagline:'他从来没有打不过对手，只输给了自己的落地。',
  desc:'联盟最快的第一步、最不怕对抗的起步、最暴力的变向。你能把他变成历史级控卫，代价是每一次起跳，都在向膝盖借时间。',
  tags:['爆炸第一步','暴力变向','膝盖负债'],
  specialName:'膝盖负荷',
  special:70,
  health:78,
  confidence:74,
  trust:66,
  attrs:{
    finishing:88,      /* 篮下终结与对抗：顶级 */
    shooting:56,       /* 投射：新秀期不稳定（真实短板） */
    playmaking:84,     /* 组织：优秀 */
    defense:70,        /* 防守：早期一般 */
    rebounding:56,     /* 篮板：后卫里偏弱 */
    athleticism:96,    /* 运动能力：联盟最顶级的那一档 */
    durability:62,     /* 耐久：中等，但打法是高风险打法 */
    mentality:80,      /* 心态：极高（他从不躲） */
    steals:78,
    blocks:40,
    strength:62
  },
  exclusive:{
    n:'玫瑰之名',
    d:'一生只有 8 次超神机会：常规赛、附加赛、季后赛都能用，用掉当场比赛得分约 +30%、命中率 +6 点、赢球概率约 +10 个百分点；用完即止，不会有任何惩罚。他的第一步与终结天生顶级、投射上限低于同档——八颗玫瑰是改写历史的手段，能走多远仍取决于你怎么用。同时解锁从芝加哥选秀夜到明尼苏达 50 分的完整专属故事。',
    fx:'rose_x'
  },
  reality:'现实轨迹：2008 年状元（芝加哥本地人回到家乡球队），2009 最佳新秀，2011 年 22 岁成为史上最年轻 MVP；2012 年季后赛首轮第一场最后时刻左膝前交叉韧带撕裂，此后四年三次膝伤，辗转尼克斯、骑士、森林狼、活塞、尼克斯、灰熊；2018 年在明尼苏达砍下生涯最高 50 分。'
};
try{
  if(typeof P!=='undefined'&&Array.isArray(P)&&!P.some(function(x){return x.id==='rose'}))P.push(ROSE);
}catch(e){}

/* ---------- 2. 按 id 查表的兜底 ----------
   两张成长表直接 map.forEach / maps[i%len]，表里没有的 id 会抛 TypeError
   （新球员、以及任何漏键的情况都会炸在这一行）。这里既补键，也加默认兜底。 */
try{
  if(typeof v23PrimaryGrowth==='function'){
    var __v108Primary=v23PrimaryGrowth;
    v23PrimaryGrowth=function(){
      try{
        var id=(typeof career!=='undefined'&&career)?career.playerId:'';
        var hasMap=({bennett:1,oden:1,kwame:1,fultz:1,simmons:1,yao:1})[id];
        if(!hasMap){
          /* 未知球员：按「后卫线」给一份默认成长，绝不抛错 */
          ['finishing','athleticism'].forEach(function(k){
            try{career.attrs[k]=clamp(career.attrs[k]+1,30,99)}catch(e){}
          });
          career.trust=clamp(career.trust+3);career.confidence=clamp(career.confidence+2);
          career.usageBoost=clamp((career.usageBoost||0)+1.2,0,9);
          if(typeof syncOvr==='function')syncOvr();
          return;
        }
      }catch(e){}
      return __v108Primary.apply(this,arguments);
    };
  }
}catch(e){}
try{
  if(typeof v231SeasonGrowth==='function'){
    var __v108Growth=v231SeasonGrowth;
    v231SeasonGrowth=function(result){
      try{
        var id=(typeof career!=='undefined'&&career)?career.playerId:'';
        var hasMap=({bennett:1,oden:1,kwame:1,fultz:1,simmons:1,yao:1})[id];
        /* 自建球员走 149 的成长系统；这里只处理旧球星。 */
        if(!hasMap && id !== 'custom'){
          var age=Number(career.age)||22,s=career.seasonStats||{},pts=Number(s.pts)||0;
          var isR=(career.playerId==="rose");var points=isR?(age<=24?(pts>=16?4:3):(age<=27?2:1)):(age<=22?(pts>=14?3:2):(age<=25?(pts>=14?2:1):0));
          if(!points)return;
          career.attrs.finishing=clamp(career.attrs.finishing+1,30,99);
          if(points>1)career.attrs.athleticism=clamp(career.attrs.athleticism+1,30,99);
          if(points>2)career.attrs.playmaking=clamp(career.attrs.playmaking+1,30,99);
          if(career.playerId==="rose"){career.attrs.shooting=clamp((career.attrs.shooting||56)+1,30,99);if(points>3)career.attrs.mentality=clamp((career.attrs.mentality||72)+1,30,99);}
          if(typeof syncOvr==='function')syncOvr();
          return;
        }
      }catch(e){}
      return __v108Growth.apply(this,arguments);
    };
  }
}catch(e){}

/* ---------- 3. 天赋机制 ---------- */
var V108={
  LOAD_MAX:5,
  INJ_PER_LOAD:0,     /* 每层负荷：伤病概率 +15%（叠乘） */
  EFF_PER_LOAD:0.02,     /* 每层负荷：场上效率 +2% */
  NIGHT_FGA:18,          /* 高光夜判定：出手 */
  NIGHT_PTS:25,          /* 高光夜判定：得分 */
  EASE_PER_SEASON:3,     /* 「收着打」每赛季次数 */
  EASE_HEAL:8,           /* 收着打回补健康 */
  EASE_USAGE:0.60,       /* 收着打当场出手倍率 */
  OFFSEASON_HEAL:6,
  SAVE_SEASONS:4         /* 落地保护生效的赛季数 */
};
function v108Has(){
  try{return !!(typeof career!=='undefined'&&career&&career.playerId==='rose'&&career.talents&&career.talents.indexOf('rose_x')>=0)}catch(e){return false}
}
function v108Load(){return 0}   /* 旧负荷机制已废弃（v120 改为八次超神） */
function v108Left(){try{return Math.max(0,Number(career&&career.v108EaseLeft)||0)}catch(e){return 0}}
window.v108Has=v108Has;window.v108Load=v108Load;window.v108Left=v108Left;window.V108=V108;
function v108Proc(msg,title){
  try{
    career.exclusiveRuntime=career.exclusiveRuntime||{procs:0,seasonProcs:0,lastProc:''};
    career.exclusiveRuntime.procs=(career.exclusiveRuntime.procs||0)+1;
    career.exclusiveRuntime.lastProc=msg;
    career.feed=career.feed||[];career.feed.unshift(msg);
    if(title&&typeof window.v222Pop==='function')window.v222Pop(title,msg.replace(/^「[^」]*」/,''));
  }catch(e){}
}

/* 3.1 开局 */
try{
  if(typeof createCareer==='function'){
    var __v108Create=createCareer;
    createCareer=function(){
      __v108Create.apply(this,arguments);
      try{
        if(!v108Has())return;
        career.attrs.finishing=clamp((career.attrs.finishing||88)+4,30,99);
        career.attrs.athleticism=clamp((career.attrs.athleticism||96)+6,30,99);
        career.health=clamp((career.health||78)+6,0,100);
        career.v108Load=0;career.v108EaseLeft=V108.EASE_PER_SEASON;career.v108Saved=false;
        if(typeof syncOvr==='function')syncOvr();
      }catch(e){}
    };
  }
}catch(e){}

/* 3.2 伤病概率随负荷上升 */
try{
  if(typeof injuryChance==='function'){
    var __v108InjChance=injuryChance;
    injuryChance=function(){
      var base=__v108InjChance.apply(this,arguments);
      try{
        if(!v108Has())return base;
        var l=v108Load();
        if(l>0)base=base*Math.pow(1+V108.INJ_PER_LOAD,l);
      }catch(e){}
      return base;
    };
  }
}catch(e){}

/* 3.3 高光夜累积负荷 + 效率加成（效率通过 usageBoost 的等价改写在 3.4 里做） */
try{
  if(typeof simulateGame==='function'){
    var __v108Sim=simulateGame;
    simulateGame=function(){
      var before=(typeof career!=='undefined'&&career)?career.games:0;
      __v108Sim.apply(this,arguments);
      try{
        if(!career||career.games===before||!v108Has())return;
        var g=(career.gameLog||[])[0];
        if(!g||g.played===false||!g.line)return;
        var fga=Number(g.line.fga)||0,pts=Number(g.line.pts)||0,min=Number(g.line.min)||career.minutes||0;
        /* 高光夜的判定必须「跟着他自己的出手基准走」：
           固定阈值（如出手 ≥18）在新秀季永远触发不了（那时球权被压到 12 次），
           机制等于不存在。改成两个都能触发的通路：
             ① 超额输出：出手 ≥ 自己赛季场均出手 ×1.35 且得分 ≥15
             ② 硬扛出场：单场 ≥34 分钟，累计 3 场 → +1 层 */
        var gp=Math.max(1,Number(career.seasonStats&&career.seasonStats.gp)||1);
        var avgFga=(Number(career.seasonStats&&career.seasonStats.totalFga)||0)/gp;
        if(!(avgFga>0))avgFga=fga;
        /* 阈值按他自己的真实分布定（实测 30 场：得分中位 18、p85 是 20、上限 21；
           出场时间 31~37 分钟、p85 是 36）：高光夜 = 20+ 分，硬扛 = 累计 6 场 37 分钟。
           如果按「连续 3 场」这类连击判定，实际几乎永远触发不到（实测 0 次），
           机制会变成摆设。 */
        var bigNight=(pts>=21)||(pts>=18&&fga>=avgFga*1.35);
        if(!bigNight){
          if(min>=37)career.v108Heavy=(career.v108Heavy||0)+1;
          if((career.v108Heavy||0)>=8){career.v108Heavy=0;bigNight=true;
            v108Proc('「玫瑰之名」累计 6 场 37 分钟以上：负荷 +1（这才是他真实的那条路）','玫瑰之名 · 硬扛出场')}
        }else{career.v108Heavy=0}
        /* 回落通路：连续 8 场没有高光夜 / 硬扛 → 膝盖缓过来，负荷 -1 */
        if(bigNight){career.v108Quiet=0}
        else{
          career.v108Quiet=(career.v108Quiet||0)+1;
          if(career.v108Quiet>=6){
            career.v108Quiet=0;
            if(v108Load()>0){
              career.v108Load=v108Load()-1;
              v108Proc('「玫瑰之名」连续 8 场平稳出战：膝盖缓过来一点，负荷 -1（现在 '+v108Load()+'/'+V108.LOAD_MAX+'）','玫瑰之名 · 负荷回落');
            }
          }
        }
        if(bigNight&&v108Load()<V108.LOAD_MAX){
          career.v108Load=v108Load()+1;
          var l=v108Load();
          var why=(fga>=Math.max(V108.NIGHT_FGA,avgFga*1.35))?('高光夜：'+pts+' 分（'+fga+' 次出手，赛季场均 '+avgFga.toFixed(1)+' 次）'):('硬扛出场：'+min+' 分钟');
          v108Proc('「玫瑰之名」'+(why.indexOf('硬扛')>=0?why:why)+'，膝盖负荷 '+l+'/'+V108.LOAD_MAX
            +'（伤病概率 ×'+(Math.pow(1+V108.INJ_PER_LOAD,l)).toFixed(2)+'）','玫瑰之名 · 负荷 '+l);
        }
      }catch(e){}
    };
  }
}catch(e){}

/* 3.4 负荷 / 收着打 对出手的影响，统一写进 v26DeriveBox 的「使用率」源头
       （不在派生之后改点数，避免得分与投篮明细对不上账） */

/* 3.5 对外动作：收着打（每赛季 3 次） */
window.v108EaseUp=function(){
  try{
    if(!v108Has())return false;
    if(v108Left()<=0){if(typeof notify==='function')notify('本赛季「收着打」的次数已经用完了');return false}
    career.v108EaseLeft=v108Left()-1;
    career.v108Load=0;
    career.health=clamp((career.health||78)+V108.EASE_HEAL,0,100);
    career.v108EaseNow=true;
    v108Proc('「玫瑰之名」收着打：负荷清零、健康 +'+V108.EASE_HEAL+'，下一场出手明显减少（本赛季还剩 '+career.v108EaseLeft+' 次）','玫瑰之名 · 收着打');
    if(typeof save==='function')save();
    if(typeof render==='function')render();
    return true;
  }catch(e){return false}
};

/* 3.6 休赛期：负荷清零 + 回补健康 */
try{
  if(typeof nextSeason==='function'){
    var __v108Next=nextSeason;
    nextSeason=function(){
      __v108Next.apply(this,arguments);
      try{
        if(!career||career.retired||!v108Has())return;
        var had=v108Load();
        career.v108Load=0;
        career.v108EaseLeft=V108.EASE_PER_SEASON;
        career.health=clamp((career.health||78)+V108.OFFSEASON_HEAL,0,100);
        if(had>0)v108Proc('「玫瑰之名」休赛期：'+had+' 层膝盖负荷清零，健康 +'+V108.OFFSEASON_HEAL,'玫瑰之名 · 休赛期');
        if(typeof syncOvr==='function')syncOvr();
      }catch(e){}
    };
  }
}catch(e){}

/* 3.55 罗斯的「新秀即门面」规则
       事实依据：2008-09 赛季他 80 场全部首发、场均 37 分钟，是公牛的进攻发起点。
       而系统按 OVR（79-80）只会给他「稳定首发 / 29 分钟」，出手被压到 9 次左右，
       完全不像罗斯。这里按事实把他生涯前两季的角色与出场时间托底。 */
try{
  if(typeof syncOvr==='function'){
    var __v108Sync=syncOvr;
    var V108_ORDER=['边缘球员','轮换球员','稳定首发','球队核心','全明星核心','超级巨星','联盟门面'];
    syncOvr=function(){
      var r=__v108Sync.apply(this,arguments);
      try{
        if(!career||career.playerId!=='rose')return r;
        var y=Number(career.seasonNo)||1;
        if(y>2)return r;
        if(V108_ORDER.indexOf(career.role)<V108_ORDER.indexOf('球队核心')){
          career.role='球队核心';
          if(typeof minutesByRole==='function'){
            var tb=career.trust>=78?2:career.trust>=64?1:career.trust<38?-2:0;
            career.minutes=Math.min(career.minutesLimit||99,Math.max(34,minutesByRole(career.role)+tb));
          }
        }
      }catch(e){}
      return r;
    };
    try{if(typeof window.syncOvr==='function')window.syncOvr=syncOvr}catch(e){}
  }
}catch(e){}

/* 3.65 校准：把整条链算出来的罗斯数据拉回他的真实区间
       （后面几层会给所有人套「球权权重」「内线溢价」等修正，罗斯作为持球型控卫
         被压得偏低：实测助攻只有 3.8，而他新秀季真实是 6.3。）
       只抬不压：低于真实区间才补，避免把已经偏高的数据再推上去。 */
try{
  if(typeof statExpect==='function'){
    var __v108Stat=statExpect;
    var __v108AstBase=null;
    statExpect=function(){
      var out=__v108Stat.apply(this,arguments);
      try{
        if(!career||career.playerId!=='rose'||!out||typeof out!=='object')return out;
        var pla=Number(career.attrs&&career.attrs.playmaking)||70;
        var m=Number(career.minutes)||30;
        /* 组织核心的助攻区间：playmaking 84 → 约 6.0 次，95 → 约 6.8 次 */
        var wantAst=Math.max(3.6,Math.min(10,pla*0.072*(m/30)));
        if(Number(out.ast)<wantAst)out.ast=wantAst;
        /* 抢断：他的生涯标签之一（真实 1.5~1.6 次），链上给得偏低时补一点 */
        var stl=Number(out.stl);
        if(isFinite(stl)&&stl<1.2)out.stl=1.2;
      }catch(e){}
      return out;
    };
    try{if(typeof window.statExpect==='function')window.statExpect=statExpect}catch(e){}
  }
}catch(e){}

/* 3.7 落地保护：生涯前 4 季，第一次报销级膝伤被改写（一次性） */
try{
  if(typeof triggerInjury==='function'){
    var __v108Inj=triggerInjury;
    triggerInjury=function(){
      __v108Inj.apply(this,arguments);
      try{
        if(!career||!v108Has()||career.v108Saved)return;
        var inj=career.injury;
        if(!inj)return;
        if((Number(career.seasonNo)||1)>V108.SAVE_SEASONS)return;
        var knee=/膝|半月板|十字|交叉|韧带|ACL/i.test(String(inj.name||''));
        if(!knee&&inj.severity!=='major'&&!inj.careerEnding)return;
        career.v108Saved=true;
        var was=(inj.gamesLeft||12);
        inj.name='膝盖过度伸展（落地那一下被改写了）';
        inj.severity='minor';
        inj.careerEnding=false;
        inj.gamesLeft=Math.max(4,Math.round(was*0.4));
        v108Proc('「玫瑰之名」落地保护触发：这一次本可能变成报销级膝伤，被改写成短期伤（缺席 '+inj.gamesLeft+' 场，一生只有一次）','玫瑰之名 · 落地保护');
        if(typeof save==='function')save();
      }catch(e){}
    };
  }
}catch(e){}

window.__v108Debug={V108:V108,has:v108Has,load:v108Load,left:v108Left,ease:window.v108EaseUp,rose:ROSE};
})();

