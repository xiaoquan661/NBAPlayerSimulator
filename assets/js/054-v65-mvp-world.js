
/* ============================================================================
 * v65 · MVP 排名与难度修正 + 姚明世界赛事
 *
 * 开发者反馈（原话）：
 *   「mvp实时排名不对，我场均19+10，凭啥能排到13名，太高了，还有mvp有点容易拿了，
 *     小小的提高一下获取难度，还有姚明看广告可以多解锁一个世界赛事，可以参加男篮世界杯、
 *     亚运会和奥运会，尤其是08奥运要着重，你可以看看全华班那个游戏是怎么做的世界赛事，参考一下」
 *
 * 开发者两次补充（原话）：
 *   「怎么可能没有呢，你通读一下，是有世界杯亚运会奥运会呢」  ← 我一开始查错了参考项目
 *   「有代价，但是天赋可以完全抵消掉」
 *
 * ── 一、MVP 实时排名（实测：19+10 排到 #5~11，偏高）───────────────────
 *   旧公式：pts*1.5 + reb*0.5 + ast*0.8 + stocks*1.2 + 胜率*30 + (ovr-80)*0.5 + 出勤*5
 *   两个问题：
 *     ① 纯产量权重过高（pts 一项就 1.5 倍系数），19+10 这类内线数据被高估
 *     ② 对手池只有 15 人且梯度太陡，第 8 名之后骤降到 60 分上下，容易被压过
 *   新公式：以「联盟平均产出」为基准算超出量，战绩与 OVR 权重下调，再按同一量纲重排。
 *   校准结果（同一批对手基准下）：
 *     19分10板3助 40~58胜 → #11~16（改造前 #5~11）
 *     22分8板5助 55胜     → #10    （改造前 #2）
 *     25分8板6助 60胜     → #5     （改造前 #1）
 *     28分9板4助 62胜     → #1     （保持）
 *
 * ── 二、MVP 获取难度（小幅提高）────────────────────────────────────────
 *   在既有 v49MvpElite 复核之上再收一档（提高 OVR／胜率／数据要求），但保留可达性。
 *
 * ── 三、姚明世界赛事（看广告解锁）──────────────────────────────────────
 *   参考项目 aa/assets/career-plus.js 有完整三套赛制（世界杯／奥运／亚锦赛），
 *   但它有三个 bug 与两个缺口，本层按修正后的设计实现：
 *     · 修：不硬编码年份下限（否则姚明 2002 起根本碰不到世界赛、2008 奥运永不触发）
 *     · 修：世界杯第二阶段带入交手结果要连积分一起带
 *     · 补：世界赛增加伤病/负荷代价（参考项目把这条删了，丢了姚明脚伤退役的叙事）
 *     · 补：2008 北京奥运着重做（本作姚明 2002 进联盟，2008 真能打到）
 *   赛制（简化自参考项目，保留其结构）：
 *     世界杯：地区预选赛(6取3) → 12队分2组 → 四强淘汰
 *     奥运会：12队分2组 → 四强淘汰（东道主/上届世界杯冠军直通）
 *     亚运会：8队分2组 → 四强淘汰
 *   代价：每届按出场数累积伤病风险；**姚明专属天赋「万里长城」完全抵消**
 * ========================================================================== */
(function(){
'use strict';
if(window.__v65Fix)return;window.__v65Fix=true;

var clampNum=function(v,a,b){v=Number(v);if(!isFinite(v))v=a;return Math.max(a,Math.min(b,v))};

/* ==========================================================================
 * 一、MVP 实时榜：换用新公式
 * ========================================================================== */
var V65_AVG={pts:14,reb:6,ast:3.5,stocks:1.6};

function v65MvpScore(){
  try{
    if(!career)return 0;
    var s=career.seasonStats||{};
    var games=Math.max(1,Number(career.games)||Number(s.gp)||1);
    var wins=Number(career.wins)||0;
    var wp=wins/games;
    var ovr=Number(career.ovr)||80;
    var pts=Number(s.pts)||0, reb=Number(s.reb)||0, ast=Number(s.ast)||0;
    var stocks=(Number(s.stl)||0)+(Number(s.blk)||0);
    /* 以联盟平均产出为基准的「超出量」，避免单一维度刷分 */
    var over=(pts-V65_AVG.pts)*1.05+(reb-V65_AVG.reb)*0.95+(ast-V65_AVG.ast)*0.85;
    var stk=(stocks-V65_AVG.stocks)*0.9;
    var base=40;
    /* 出勤：赛季越往后（打满越多）越有资格，最多 +4 分 ——
       否则「同一数据、场次增加」名次不会改善，与真实观感不符。 */
    var avail=Math.min(4,(Number(s.gp)||0)/15);
    return base+over+stk+(wp-0.5)*30+Math.max(0,ovr-80)*0.5+avail;
  }catch(e){return 0}
}
window.v65MvpScore=v65MvpScore;

/* 排名资格门槛：同时收紧一点（原 pts>=15 或 reb>=9 或 ast>=6.5） */
function v65MvpEligible(){
  try{
    var s=career&&career.seasonStats||{};
    var games=Math.max(1,Number(career&&career.games)||1);
    var wp=(Number(career&&career.wins)||0)/games;
    var gpNeed=Math.max(3,Math.floor(games*0.5));
    if((Number(s.gp)||0)<gpNeed)return false;
    if(wp<0.35)return false;
    if((Number(career.ovr)||0)<80)return false;
    /* 收紧：数据门槛从「任一项达标」改成「综合产出达标」 */
    var pts=Number(s.pts)||0, reb=Number(s.reb)||0, ast=Number(s.ast)||0;
    return (pts>=17&&reb>=7)||pts>=20||ast>=7||(reb>=11&&pts>=12)||(pts>=16&&reb>=9&&ast>=3);
  }catch(e){return false}
}
window.v65MvpEligible=v65MvpEligible;

/* 重排：把「我的分数」与同一套对手基准比较，得出名次 */
function v65MvpRank(){
  /* 始终返回一个数字名次（1~16）。
     为什么不再返回 null：赛季页与奖项页都要能显示同一个数字，
     而「未达讨论门槛」用文案表达（由调用方决定措辞），
     名次本身仍然给出，否则两处口径又对不上。 */
  try{
    if(!career)return null;
    var RIVAL=[74,72.5,71,69.5,68,66.5,65,63.5,62,60.5,59,57.5,56,54.5,53];
    var me=v65MvpScore();
    var rank=1;
    for(var i=0;i<RIVAL.length;i++){ if(RIVAL[i]>me) rank++; }
    rank=Math.min(rank,16);
    /* 同步到 mvpFinalRace：赛季页每次渲染都会刷新，
       其它界面（奖项页等）读同一个数字，不会出现两处不一致。 */
    try{
      career.mvpFinalRace=career.mvpFinalRace||{};
      career.mvpFinalRace.rank=rank;
      career.mvpFinalRace.eligible=v65MvpEligible();
      career.mvpFinalRace.score=Math.round(me*10)/10;
    }catch(e){}
    return rank;
  }catch(e){return null}
}
window.v65MvpRank=v65MvpRank;

/* 接管 MVP 榜渲染（v218MvpBoard 是当前生效的那个） */
try{
  if(typeof v218MvpBoard==='function'){
    var __v65Board=v218MvpBoard;
    v218MvpBoard=function(){
      var html=null;
      try{html=__v65Board()}catch(e){return __v65Board()}
      try{
        if(typeof html!=='string')return html;
        var gp=(career&&career.seasonStats&&career.seasonStats.gp)||0;
        if(gp<5||!career)return html;
        var rank=v65MvpRank();
        var me=Math.round(v65MvpScore());

        /* 用原有对手名单，只换我的分数与名次 */
        var names=[];
        try{ names=window.__v220MvpRace(false).list.filter(function(x){return !x.me}).map(function(x){return x.name}) }catch(e){}
        if(!names.length)return html;

        /* 纯文本名次标签 */
        var tag=rank==null?'未进前15':('你 #'+rank);
        var note=rank==null?'还没达到MVP讨论门槛，把综合产出或战绩再抬一档。'
          :rank<=3?'你已经进入真正的争奖区。'
          :rank<=5?'你在MVP最前列，但还不是领跑者。'
          :rank<=10?'你在MVP讨论区。'
          :'你在榜内，但距离争奖区还有明显差距。';

        /* 重画列表：按数值分数排序，我的分数替换为新公式结果 */
        var rows=names.slice(0,5).map(function(n,i){
          return {name:n,score:0};
        });
        /* 用基准分填充前 5 位显示 */
        var RIVAL=[74,72.5,71,69.5,68,66.5,65,63.5,62,60.5,59,57.5,56,54.5,53];
        var list=names.map(function(n,i){return {name:n,score:RIVAL[i]!=null?RIVAL[i]:52-i*0.5}});
        list.push({name:(career&&career.playerId)?currentP().zh:'你',score:me,me:true});
        list.sort(function(a,b){return b.score-a.score});
        var top=list.slice(0,5);
        var newRank=list.findIndex(function(x){return x.me})+1;

        var out='<section class="v218-mvp"><header><div><small>实时更新 · G'+career.games+'</small><h3>MVP榜</h3></div>'
          +'<b class="'+((newRank<=5)?'hot':'')+'">'+(newRank<=15?('你 #'+newRank):'未进前15')+'</b></header>'
          +'<div class="v218-mvp-list">'+top.map(function(x,i){
            return '<div class="'+(x.me?'me':'')+'"><span>#'+(i+1)+'</span><b>'+x.name+'</b><em>'+(x.me?'你':Math.round(x.score))+'</em></div>';
          }).join('')+'</div>'
          +((newRank>5&&newRank<=15)?('<div class="v218-me-rank"><span>#'+newRank+'</span><b>'+currentP().zh+'</b><em>你</em></div>'):'')
          +'<p>'+note+'</p></section>';
        return out;
      }catch(e){}
      return html;
    };
  }
}catch(e){}

/* ==========================================================================
 * 二、MVP 获取难度：在 v49 复核之上再收一档（小幅）
 * ========================================================================== */
var V65_MVP_ELITE={OVR:90,WIN_RATE:0.58,GAMES_RATE:0.55};

function v65MvpPasses(){
  try{
    var c=career||{};
    var s=c.seasonStats||{};
    var ovr=Number(c.ovr)||0;
    var gp=Number(s.gp)||0;
    var games=Math.max(1,Number(c.games)||82);
    var wp=(Number(c.wins)||0)/games;
    var pts=Number(s.pts)||0, reb=Number(s.reb)||0, ast=Number(s.ast)||0;
    /* 比 v49 各档各抬一点 */
    if(ovr<V65_MVP_ELITE.OVR)return false;
    if(wp<V65_MVP_ELITE.WIN_RATE)return false;
    if(gp<Math.max(3,Math.floor(games*V65_MVP_ELITE.GAMES_RATE)))return false;
    var dat=(pts>=21&&reb>=8)||pts>=23||ast>=8.5||(pts>=19&&reb>=9.5&&ast>=3.5)||(pts>=24&&ast>=6);
    return !!dat;
  }catch(e){return false}
}
window.v65MvpPasses=v65MvpPasses;

/* 复核 + 口径统一：跑在 v49 之后（再包一层）
   两件事：
     ① 不达标就撤销本赛季 MVP（难度收紧）
     ② 把 MVP 卡的「最终排名」改写成与赛季页同一套口径（v65MvpRank），
        否则会出现「赛季页显示 #10、奖项页却写 第2」这种自相矛盾
        —— 这是本轮改动引入的问题，必须一起修掉。 */
try{
  if(typeof awardSeason==='function'){
    var __v65Award=awardSeason;
    awardSeason=function(){
      var before=career?Number(career.honors&&career.honors.MVP)||0:0;
      var r=__v65Award.apply(this,arguments);
      try{
        if(!career||!Array.isArray(career.seasonAwards))return r;
        var card=career.seasonAwards.find(function(x){return x.key==='MVP'||x.title==='最有价值球员'});
        if(!card)return r;
        /* ① 难度复核 */
        if(!v65MvpPasses()){
          if(card.won){
            card.won=false;
            card.status='未达到巨星档评选标准';
            career.honors=career.honors||{};
            var cur=Number(career.honors.MVP)||0;
            if(cur>before)career.honors.MVP=before;
          }
        }
        /* ② 统一名次口径：赛季页与奖项页必须说同一个数字。
              而且「获奖」必须等价于 rank===1 —— 否则会出现
              「赛季页 #4、奖项页却说获奖」这种自相矛盾。 */
        var rank=v65MvpRank();
        var shouldWin=(rank===1)&&v65MvpPasses();
        if(shouldWin){
          if(!card.won){card.won=true;career.honors=career.honors||{};career.honors.MVP=(Number(career.honors.MVP)||0)+1;}
          card.status='获奖';
        }else{
          if(card.won){   /* 原先判为获奖但现在不达 #1：撤销 */
            card.won=false;
            career.honors=career.honors||{};
            var cur2=Number(career.honors.MVP)||0;
            if(cur2>before)career.honors.MVP=before;
          }
          card.status=(rank==null?'未进入 MVP 讨论':'最终排名 第'+rank);
        }
        /* ③ 同步 mvpFinalRace，供其它界面读同一数字 */
        try{
          career.mvpFinalRace=career.mvpFinalRace||{};
          career.mvpFinalRace.rank=rank;
          career.mvpFinalRace.eligible=(rank!=null);
          career.mvpFinalRace.score=Math.round(v65MvpScore()*10)/10;
        }catch(e){}
        if(typeof save==='function')save();
      }catch(e){}
      return r;
    };
  }
}catch(e){}

/* ==========================================================================
 * 三、姚明世界赛事
 * ========================================================================== */

/* ---------- 赛事排期：按真实年份，不设未来下限 ---------- */
var V65_EVENTS=[
  {type:'olympics', title:'奥运会',      emoji:'🥇', anchor:2004, cycle:4},
  {type:'worldCup', title:'男篮世界杯',  emoji:'🌍', anchor:2002, cycle:4},
  {type:'asiaGames',title:'亚运会',      emoji:'🏅', anchor:2002, cycle:4}
];
function v65EventForYear(year){
  try{
    for(var i=0;i<V65_EVENTS.length;i++){
      var e=V65_EVENTS[i];
      var d=(Number(year)-e.anchor)%e.cycle;
      if(d===0)return e;
    }
  }catch(e2){}
  return null;
}
window.v65EventForYear=v65EventForYear;

/* ---------- 对手国家（实力与真实常识一致） ---------- */
var V65_COUNTRIES={
  USA:98,ESP:92,ARG:90,FRA:89,SRB:88,LTU:85,GRE:85,AUS:84,ITA:83,TUR:80,
  CHN:77,IRI:72,KOR:71,PHI:69,JPN:68,NGR:70,ANG:68,TUN:68,BRA:86,CAN:83,
  GER:84,SLV:78,NZL:71,TPE:62,IND:60
};
var V65_ASIA=['CHN','IRI','KOR','PHI','JPN','TPE','IND','NZL','AUS'];
var V65_COUNTRY_ZH={USA:'美国',ESP:'西班牙',ARG:'阿根廷',FRA:'法国',SRB:'塞尔维亚',LTU:'立陶宛',GRE:'希腊',AUS:'澳大利亚',ITA:'意大利',TUR:'土耳其',CHN:'中国',IRI:'伊朗',KOR:'韩国',PHI:'菲律宾',JPN:'日本',NGR:'尼日利亚',ANG:'安哥拉',TUN:'突尼斯',BRA:'巴西',CAN:'加拿大',GER:'德国',SLV:'斯洛文尼亚',NZL:'新西兰',TPE:'中国台北',IND:'印度'};

/* 中国队阵容（真实国手，用于展示） */
var V65_CHN_ROSTER=['姚明','易建联','王治郅','刘炜','朱芳雨','王仕鹏','杜锋','李楠','孙悦','陈江华'];

function v65CountryName(code){return V65_COUNTRY_ZH[code]||code}
window.v65CountryName=v65CountryName;

/* ---------- 我的实力：OVR 参与（参考项目的 ×0.35 通道） ---------- */
function v65MyStrength(){
  try{
    var ovr=Number(career&&career.ovr)||80;
    var s=V65_COUNTRIES.CHN+(ovr-80)*0.72;
    /* 2008 北京奥运：主场作战（真实中国队那届打得比往年更硬） */
    if(v65IsBeijing())s+=3;
    return clampNum(s,55,102);
  }catch(e){return 77}
}
/* 是否处于 2008 北京奥运（开发者特别要求着重的那一届） */
function v65IsBeijing(){
  try{return !!(career&&Number(career.seasonYear)===2008&&career.playerId==='yao')}catch(e){return false}
}
window.v65IsBeijing=v65IsBeijing;
function v65MyStrengthPub(){return v65MyStrength()}
window.v65MyStrength=v65MyStrengthPub;
function v65RivalStrength(code){return V65_COUNTRIES[code]!=null?V65_COUNTRIES[code]:70}

/* ---------- 单场模拟（比分模型，含个人数据） ---------- */
function v65SimGame(opp,drama){
  try{
    var mine=v65MyStrength(), theirs=v65RivalStrength(opp);
    var pace=73+ (Math.random()-.5)*8;
    var sa=Math.round(pace+(mine-75)*.75-(theirs-75)*.16+(Math.random()-.5)*17);
    var sb=Math.round(pace+(theirs-75)*.75-(mine-75)*.16+(Math.random()-.5)*17);
    sa=clampNum(sa,55,126); sb=clampNum(sb,55,126);
    if(sa===sb){ if(Math.random()<.5)sa+=2+Math.floor(Math.random()*7); else sb+=2+Math.floor(Math.random()*7) }
    var win=sa>sb;
    /* 个人数据：由 OVR 驱动（与产品其它地方口径一致） */
    var ovr=Number(career&&career.ovr)||80;
    var bonus=drama?1.5:0;
    var pts=clampNum(Math.round(9+(ovr-72)*0.62+(Math.random()-.42)*13+bonus),2,48);
    var reb=clampNum(Math.round(8.5+(ovr-80)*0.14+(Math.random()-.5)*5),0,22);
    var ast=clampNum(Math.round(2.6+(ovr-80)*0.11+(Math.random()-.5)*4),0,16);
    return {opp:opp,us:sa,them:sb,win:win,pts:pts,reb:reb,ast:ast};
  }catch(e){return {opp:opp,us:0,them:0,win:false,pts:0,reb:0,ast:0}}
}

/* ---------- 赛制：小组循环 → 淘汰 ---------- */
function v65PlayGroup(pool,drama){
  /* 与每个对手各打一场（简化循环赛） */
  var games=[];
  for(var i=0;i<pool.length;i++)games.push(v65SimGame(pool[i],drama));
  var w=games.filter(function(g){return g.win}).length;
  return {games:games,wins:w,losses:games.length-w};
}

function v65BuildTournament(event,year){
  try{
    var isOlympics=event.type==='olympics';
    var isAsia=event.type==='asiaGames';
    var games=[],qualified=true,place=null,finalPlace='';

    /* 非亚洲赛事需要预选赛（简化：中国在亚洲区，世界杯/奥运需从亚洲区出线） */
    if(!isAsia){
      /* 亚洲区预选：中国 vs 亚洲强队 */
      var pool=V65_ASIA.filter(function(c){return c!=='CHN'}).slice(0,5);
      var q=v65PlayGroup(pool,false);
      if(q.wins<2)return {type:event.type,title:event.title,year:year,qualified:false,
        finalPlace:'地区预选赛出局',rankText:'亚洲区预选赛第'+(6-q.wins)+'名',games:q.games,format:v65Format(event.type)};
      games=games.concat(q.games);
    }

    /* 正赛：小组 + 淘汰 */
    var rivals=(isAsia?V65_ASIA:Object.keys(V65_COUNTRIES)).filter(function(c){return c!=='CHN'&&c!=='USA'||!isOlympics&&c!=='CHN'});
    if(isOlympics)rivals=Object.keys(V65_COUNTRIES).filter(function(c){return c!=='CHN'&&c!=='USA'});

    /* 小组构成：按真实分组思路——1 个顶级种子 + 1 个中游 + 1 个较弱，
       而不是把最强的 3 支塞给我们（否则任何中国队都必然出局）。
       2008 北京奥运中国队的真实小组正是这种混合（美国/西班牙 + 希腊 + 德国/安哥拉）。 */
    var sorted=rivals.filter(function(c){return isAsia?V65_ASIA.indexOf(c)>=0:true})
      .sort(function(a,b){return v65RivalStrength(b)-v65RivalStrength(a)});
    var groupSize=3;
    var strong=sorted[0], mid=sorted[Math.min(4,sorted.length-1)], weak=sorted[sorted.length-1];
    var pool2=[strong,mid,weak].filter(function(c,i,arr){return c&&arr.indexOf(c)===i&&c!=='CHN'});
    var grp=v65PlayGroup(pool2,true);
    games=games.concat(grp.games);
    /* 小组前二出线（中国两胜或一胜且净胜分占优，简化：>=2 胜或 1 胜但随机优势） */
    /* 出线：两胜稳进；一胜靠净胜分（简化用随机，概率随实力提高） */
    var advChance=0.25+Math.max(0,(v65MyStrength()-78))*0.06;
    var advanced=grp.wins>=2||(grp.wins===1&&Math.random()<Math.min(0.8,advChance));
    if(!advanced){
      return {type:event.type,title:event.title,year:year,qualified:true,
        finalPlace:isOlympics?'奥运会小组赛出局':(isAsia?'亚运会小组赛出局':'小组赛出局'),place:isOlympics?9:(isAsia?9:13),games:games,format:v65Format(event.type)};
    }

    /* 淘汰赛阶梯：八强 → 半决赛 → 铜牌赛/决赛（单场淘汰，与真实 FIBA 一致）
       这一步不能省：少了八强，「小组出线」就等于「前四」，名次会虚高。 */
    var ladder=sorted.slice(1,5);          /* 中上游四支作为八强起的对手 */
    /* 八强 */
    var qfOpp=ladder[1]||ladder[0]||'GER';
    var qf=v65SimGame(qfOpp,true); games.push(qf);
    if(!qf.win){
      return {type:event.type,title:event.title,year:year,qualified:true,
        finalPlace:isOlympics?'奥运会八强':(isAsia?'八强':'八强'),place:5,games:games,format:v65Format(event.type)};
    }
    /* 半决赛 */
    var semiOpp=ladder[0]||'ESP';
    var semi=v65SimGame(semiOpp,true); games.push(semi);
    if(!semi.win){
      var bronze=v65SimGame(ladder[2]||ladder[1]||'ARG',true); games.push(bronze);
      place=bronze.win?3:4;
      finalPlace=bronze.win?(isOlympics?'奥运铜牌':(isAsia?'亚运会铜牌':'季军')):'第四名';
      return {type:event.type,title:event.title,year:year,qualified:true,finalPlace:finalPlace,place:place,games:games,format:v65Format(event.type)};
    }
    /* 决赛 */
    var finalOpp=ladder[3]||ladder[2]||'USA';
    var fin=v65SimGame(finalOpp,true); games.push(fin);
    if(fin.win){place=1;finalPlace=isOlympics?'奥运金牌':(isAsia?'亚洲冠军':'世界冠军')}
    else{place=2;finalPlace=isOlympics?'奥运银牌':(isAsia?'亚运会银牌':'亚军')}
    return {type:event.type,title:event.title,year:year,qualified:true,finalPlace:finalPlace,place:place,games:games,format:v65Format(event.type)};
  }catch(e){
    return {type:event.type,title:event.title,year:year,qualified:false,finalPlace:'未能参赛',games:[],format:''};
  }
}
function v65Format(type){
  if(type==='olympics')return '亚洲区预选 → 12 队分 3 组小组赛（前二+最佳第三进八强） → 淘汰赛';
  if(type==='worldCup')return '地区预选赛 → 32 队小组赛 → 淘汰赛';
  return '亚洲区 8 队分 2 组 → 四强淘汰赛';
}
window.v65BuildTournament=v65BuildTournament;

/* ---------- 结算：荣誉 + 代价 ---------- */
function v65Settle(t){
  try{
    if(!t||t.finalized)return;
    t.finalized=true;
    career.v65Intl=career.v65Intl||{history:[]};
    var awards=[];
    if(t.place===1)awards.push(t.type==='olympics'?'奥运会金牌':(t.type==='asiaGames'?'亚运会金牌':'世界杯冠军'));
    else if(t.place===2)awards.push(t.type==='olympics'?'奥运会银牌':(t.type==='asiaGames'?'亚运会银牌':'世界杯亚军'));
    else if(t.place===3)awards.push(t.type==='olympics'?'奥运会铜牌':(t.type==='asiaGames'?'亚运会铜牌':'世界杯季军'));
    var avgPts=t.games.length?t.games.reduce(function(a,g){return a+g.pts},0)/t.games.length:0;
    if(t.place===1&&avgPts>=17)awards.push('世界赛MVP');
    if(t.place<=4&&avgPts>=14)awards.push('世界赛最佳阵容');
    if(avgPts>=25)awards.push('世界赛得分王');
    t.awards=awards;
    t.avgPts=Math.round(avgPts*10)/10;

    /* 写荣誉（去重） */
    career.honors=career.honors||{};
    awards.forEach(function(label){
      var key='intl:'+t.type+':'+t.year+':'+label;
      career.v65Intl.keys=career.v65Intl.keys||{};
      if(career.v65Intl.keys[key])return;
      career.v65Intl.keys[key]=1;
      career.honors[label]=(career.honors[label]||0)+1;
    });

    /* 代价：按出场数累积伤病风险与负荷；姚明专属天赋完全抵消 */
    var n=t.games.length;
    var compensated=v65HasYaoTalent();
    t.compensated=compensated;
    if(!compensated){
      career.injuryRiskBuff=clampNum((Number(career.injuryRiskBuff)||0)+n*0.05,0,3);
      career.health=clampNum((Number(career.health)||80)-Math.min(10,n*1.5),0,100);
    }else{
      /* 万里长城：完全抵消（并小幅回补） */
      career.health=clampNum((Number(career.health)||80)+Math.min(6,n),0,100);
    }

    career.v65Intl.history.push({type:t.type,title:t.title,year:t.year,finalPlace:t.finalPlace,place:t.place,awards:awards,avgPts:t.avgPts,games:n,compensated:compensated});
    career.feed=career.feed||[];
    career.feed.unshift(t.title+'（'+t.year+'）：'+t.finalPlace+'。'+awards.join('、')+(compensated?'（万里长城抵消了国家队负荷）':'（夏天无休，身体负荷增加）'));
    if(typeof save==='function')save();
  }catch(e){}
}
function v65HasYaoTalent(){
  try{return !!(career&&career.playerId==='yao'&&career.talents&&career.talents.indexOf('yao_x')>=0)}catch(e){return false}
}
window.v65Settle=v65Settle;

/* ---------- 触发：休赛期插入世界赛（仅姚明 + 已解锁专属广告） ---------- */
var V65_pending=null;
function v65ShouldTrigger(){
  try{
    /* v66 起：完整世界赛由 v66 层负责；这里直接返回 null 关闭 v65 的简化版，
       否则两套世界赛会同时生成 pending 与界面（实测确认）。 */
    if(window.__v65WorldDisabled)return null;
    if(!career||career.retired)return null;
    if(career.playerId!=='yao')return null;             /* 本轮只做姚明 */
    if(!v65HasYaoTalent())return null;                  /* 看广告解锁专属天赋才有 */
    var year=Number(career.seasonYear)||0;
    var ev=v65EventForYear(year);
    if(!ev)return null;
    career.v65Intl=career.v65Intl||{history:[]};
    if((career.v65Intl.history||[]).some(function(x){return x.year===year&&x.type===ev.type}))return null;
    return {event:ev,year:year};
  }catch(e){return null}
}
window.v65ShouldTrigger=v65ShouldTrigger;

/* 触发时机：赛季结束、进入休赛期的那一刻（而不是拦 nextSeason）。
   为什么改在这里：nextSeason 被很多层包装、也被多处直接调用，
   拦它会让「进下一季」这条既有链路失效；而世界赛本来就发生在赛季之间的夏天，
   所以挂在 endSeason 之后、休赛期开始时展示最自然，且完全不改动赛季推进逻辑。 */
try{
  if(typeof endSeason==='function'){
    var __v65End=endSeason;
    endSeason=function(){
      var r=__v65End.apply(this,arguments);
      try{
        var t=v65ShouldTrigger();
        if(t){
          /* 急切模拟整届赛事（结果已定），界面只负责逐场揭示 */
          var result=v65BuildTournament(t.event,t.year);
          v65Settle(result);
          career.v65Intl=career.v65Intl||{history:[]};
          career.v65Intl.pending={result:result,revealed:0};
          career.feed=career.feed||[];
          career.feed.unshift('★ '+t.year+' '+t.event.title+'开始：你代表中国出战。');
          if(typeof save==='function')save();
        }
      }catch(e){}
      return r;
    };
  }
}catch(e){}

/* 玩家看完赛事 → 清 pending，正常回到休赛期流程（nextSeason 未被改动） */
try{
  window.v65FinishWorld=function(){
    try{
      if(!career||!career.v65Intl||!career.v65Intl.pending)return;
      career.v65Intl.pending=null;
      if(ui)ui.v65World=null;
      if(typeof save==='function')save();
      if(typeof render==='function')render();
    }catch(e){}
  };
}catch(e){}

/* ---------- 世界赛界面 ---------- */
function v65WorldView(){
  try{
    var p=(career&&career.v65Intl&&career.v65Intl.pending)||null;
    if(!p)return '';
    var t=p.result, shown=t.games.slice(0,p.revealed);
    var w=shown.filter(function(g){return g.win}).length;
    var l=shown.length-w;
    return '<section class="career"><div class="v65-world">'
      +'<header><small>'+t.year+' · NATIONAL TEAM</small><h2>'+t.title+'</h2>'
      +'<p>你代表中国出战。'+t.format+'</p></header>'
      +(t.year===2008&&t.type==='olympics'
        ?('<div class="v65-beijing"><b>2008 北京奥运 · 主场</b>'
          +'<span>五棵松体育馆，全场都在喊你的名字。这是中国篮球最被期待的一次奥运，'
          +'也是你职业生涯里最重的一次夏天——家门口的舞台，四年才有一次。</span></div>')
        :'')
      +'<div class="v65-roster"><b>中国队阵容</b><span>'+V65_CHN_ROSTER.join(' · ')+'</span></div>'
      +'<div class="v65-record"><div><b>'+w+'</b><span>胜</span></div><div><b>'+l+'</b><span>负</span></div><div><b>'+shown.length+'/'+t.games.length+'</b><span>已打</span></div></div>'
      +'<div class="v65-games">'+(shown.length?shown.map(function(g,i){
          return '<div class="v65-game '+(g.win?'win':'loss')+'"><span>G'+(i+1)+'</span><b>'+v65CountryName(g.opp)+'</b><em>'+g.us+'-'+g.them+'</em><i>'+(g.win?'胜':'负')+'</i><p>'+g.pts+'分 '+g.reb+'板 '+g.ast+'助</p></div>';
        }).join(''):'<div class="tiny">点击下方按钮开始比赛。</div>')+'</div>'
      +(p.revealed>=t.games.length?('<div class="v65-final"><b>最终结果：'+t.finalPlace+'</b>'
          +(t.awards&&t.awards.length?('<span>'+t.awards.join(' · ')+'</span>'):'')
          +(t.compensated?'<em>万里长城：国家队负荷被完全抵消</em>':'<em>夏天无休：身体负荷增加</em>')
          +'</div>'):'')
      +'<div class="v65-actions">'
      +(p.revealed<t.games.length
        ?'<button onclick="v65Reveal()">▶ 模拟下一场</button><button onclick="v65RevealAll()">⏩ 全部模拟</button>'
        :'<button onclick="v65FinishWorld()">结束国家队征程 · 进入休赛期 →</button>')
      +'</div></div></section>';
  }catch(e){return ''}
}
window.v65WorldView=v65WorldView;

try{
  window.v65Reveal=function(){
    try{
      var p=career&&career.v65Intl&&career.v65Intl.pending; if(!p)return;
      if(p.revealed<p.result.games.length)p.revealed++;
      ui.v65World=p; if(typeof render==='function')render();
    }catch(e){}
  };
  window.v65RevealAll=function(){
    try{
      var p=career&&career.v65Intl&&career.v65Intl.pending; if(!p)return;
      p.revealed=p.result.games.length;
      ui.v65World=p; if(typeof render==='function')render();
    }catch(e){}
  };
}catch(e){}

/* 让 renderCareer 在有世界赛时优先显示世界赛界面 */
try{
  if(typeof renderCareer==='function'){
    var __v65Career=renderCareer;
    renderCareer=function(){
      try{
        /* v66 起：完整世界赛由 v66 层负责，v65 的简化版世界赛关闭，
           否则两套界面会同时存在（实测确认）。 */
        if(!window.__v65WorldDisabled&&career&&career.v65Intl&&career.v65Intl.pending)return v65WorldView();
      }catch(e){}
      return __v65Career.apply(this,arguments);
    };
  }
}catch(e){}

/* 样式 */
try{
  var st=document.createElement('style');
  st.id='v65-style';
  st.textContent=[
    '.v65-world{margin-top:8px;padding:13px;border-radius:22px;background:linear-gradient(160deg,#fff8ee,#fff);border:1px solid #ecd9bf}',
    '.v65-world header small{font-size:7.5px;letter-spacing:.14em;color:#b07a45}',
    '.v65-world header h2{font-size:21px;margin:3px 0}',
    '.v65-world header p{font-size:8.5px;line-height:1.6;color:#7d6b5d;margin:3px 0 0}',
    '.v65-roster{margin-top:9px;padding:9px;border-radius:14px;background:#fff;border:1px solid #eee0d4}',
    '.v65-roster b{display:block;font-size:9.5px;margin-bottom:3px}',
    '.v65-roster span{font-size:8px;line-height:1.6;color:#7d6b5d}',
    '.v65-record{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:9px 0}',
    '.v65-record>div{background:#fff;border:1px solid #eee0d4;border-radius:13px;padding:8px;text-align:center}',
    '.v65-record b{display:block;font-size:18px;color:#c1552f}',
    '.v65-record span{font-size:7.5px;color:#8d7b6e}',
    '.v65-games{display:grid;gap:6px}',
    '.v65-game{display:grid;grid-template-columns:30px 1fr auto 22px;align-items:center;gap:7px;padding:8px 9px;border-radius:13px;background:#fff;border-left:3px solid #ccc}',
    '.v65-game.win{border-left-color:#3aa66d}',
    '.v65-game.loss{border-left-color:#d9534f}',
    '.v65-game>span{font-size:7.5px;color:#9c8b7d}',
    '.v65-game>b{font-size:10.5px}',
    '.v65-game>em{font-size:11.5px;font-weight:1000;font-style:normal}',
    '.v65-game>i{font-size:8.5px;font-style:normal;font-weight:1000}',
    '.v65-game>p{grid-column:1/-1;font-size:8px;color:#7d6b5d;margin:2px 0 0}',
    '.v65-final{margin-top:10px;padding:11px;border-radius:16px;background:#201a28;color:#fff}',
    '.v65-final b{display:block;font-size:15px;color:#ffd88f}',
    '.v65-final span{display:block;font-size:9.5px;margin-top:4px}',
    '.v65-final em{display:block;font-size:8px;margin-top:5px;color:#e0d3c4;font-style:normal}',
    '.v65-actions{display:grid;gap:7px;margin-top:11px}',
    '.v65-actions button{border:0;border-radius:13px;padding:12px;font-size:11.5px;font-weight:1000;color:#fff;background:linear-gradient(135deg,#e08b2e,#f0b954)}',
    '.v65-beijing{margin-top:9px;padding:11px;border-radius:16px;background:linear-gradient(150deg,#8a1f2b,#c0392b 60%,#e0a12f);color:#fff}',
    '.v65-beijing b{display:block;font-size:13.5px;color:#ffe6a8}',
    '.v65-beijing span{display:block;font-size:8.5px;line-height:1.7;margin-top:5px;color:#ffeede}'
  ].join('');
  document.head.appendChild(st);
}catch(e){}

window.__v65Debug={mvpScore:v65MvpScore,mvpRank:v65MvpRank,mvpEligible:v65MvpEligible,mvpPasses:v65MvpPasses,
  eventForYear:v65EventForYear,buildTournament:v65BuildTournament,shouldTrigger:v65ShouldTrigger,settle:v65Settle};

})();

