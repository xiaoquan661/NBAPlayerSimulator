
/* ============================================================================
 * v74 · 奖项口径修复（开发者第九次反馈）
 *
 * 开发者原话：
 *   「mvp最终排名显示1，但是却没有得奖，现在抢断王没有公布得主」
 *
 * 【问题一：MVP 显示第 1 却不获奖】
 *   实测根因：两套判定各自算各自的，口径不一致。
 *     · v65MvpRank()：只用「MVP 分数」跟 15 个对手分数比大小，第一名就返回 1，
 *       完全不看获奖门槛；
 *     · 实际发奖要过 v65MvpPasses()（OVR≥90、胜率≥58%、出勤≥55%、数据达标）。
 *   于是出现「分数最高 → 排名显示 #1，但门槛没过 → 不获奖」。
 *   而且 v65 自己的注释里就写着「获奖必须等价于 rank===1」——它按这个把
 *   卡片的 won 改回 false，却没管排名数字，矛盾留在界面上。
 *
 *   修法：排名与发奖共用同一判定。分数再高，只要没达获奖门槛，
 *   名次就不允许是 1（顺位往下让给达标的对手），从根上消除「第1不获奖」。
 *
 * 【问题二：抢断王没有得主】
 *   实测根因：v29AwardWinners() 只返回 7 项（MVP/DPOY/新秀/得分王/篮板王/
 *   助攻王/盖帽王），**整条 STEAL（抢断王）缺失**，
 *   所以奖项页的「得主：XXX」在抢断王那张卡上取不到人，留空。
 *
 *   修法：补上抢断王得主（含「我获奖则得主是我」的既有规则）。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v74AwardFix)return;window.__v74AwardFix=true;

/* --------------------------------------------------------------------------
 * 一、MVP：排名必须与获奖一致
 * -------------------------------------------------------------------------- */
try{
  if(typeof v65MvpRank==='function'&&!window.__v74MvpRankGuard){
    var __v74Rank=v65MvpRank;
    v65MvpRank=function(){
      var rank=__v74Rank.apply(this,arguments);
      try{
        if(rank==null)return rank;
        /* 没达获奖门槛 → 不允许占着第 1 */
        var passes=false;
        try{passes=(typeof v65MvpPasses==='function')&&v65MvpPasses()}catch(e){}
        if(rank===1&&!passes){
          rank=2;                          /* 让位：界面显示 #2，与「未获奖」自洽 */
        }
        /* 同步 mvpFinalRace，保证赛季页/奖项页/其它界面读同一个数字 */
        try{
          career.mvpFinalRace=career.mvpFinalRace||{};
          career.mvpFinalRace.rank=rank;
          career.mvpFinalRace.eligible=(typeof v65MvpEligible==='function')?v65MvpEligible():career.mvpFinalRace.eligible;
          career.mvpFinalRace.awardPassed=passes;
        }catch(e){}
      }catch(e){}
      return rank;
    };
    window.__v74MvpRankGuard=true;
  }
}catch(e){}

/* 奖项页的 MVP 卡：状态文案与真实获奖状态对齐（避免「第1」+「未获奖」并存） */
try{
  if(typeof awardSeason==='function'&&!window.__v74AwardCardGuard){
    var __v74Award=awardSeason;
    awardSeason=function(){
      var before=career?Number(career.honors&&career.honors.MVP)||0:0;
      var r=__v74Award.apply(this,arguments);
      try{
        if(!career||!Array.isArray(career.seasonAwards))return r;
        var card=career.seasonAwards.find(function(x){return x.key==='MVP'||x.title==='最有价值球员'});
        if(!card)return r;
        var passes=false;
        try{passes=(typeof v65MvpPasses==='function')&&v65MvpPasses()}catch(e){}
        var rank=null;
        try{rank=(typeof v65MvpRank==='function')?v65MvpRank():null}catch(e){}
        /* 最终一致性：won 与 rank===1 必须同真同假 */
        var shouldWin=(rank===1)&&passes;
        if(shouldWin&&!card.won){
          card.won=true;
          career.honors=career.honors||{};
          career.honors.MVP=(Number(career.honors.MVP)||0)+1;
        }else if(!shouldWin&&card.won){
          card.won=false;
          career.honors=career.honors||{};
          var cur=Number(career.honors.MVP)||0;
          if(cur>before)career.honors.MVP=before;
        }
        card.status=card.won?'获奖':(rank==null?'未进入 MVP 讨论':'最终排名 第'+rank);
        card.detail=(card.detail||'')+(passes?'':' · 未达到巨星档评选标准');
        if(typeof save==='function')save();
      }catch(e){}
      return r;
    };
    window.__v74AwardCardGuard=true;
  }
}catch(e){}

/* --------------------------------------------------------------------------
 * 二、抢断王得主
 *   v29AwardWinners 缺 STEAL 项。这里给它补一条（保持与其它单项王同样的规则：
 *   本赛季我获奖 → 得主是我；否则按年代池取一位）。
 * -------------------------------------------------------------------------- */
try{
  if(typeof v29AwardWinners==='function'&&!window.__v74StealGuard){
    var __v74Winners=v29AwardWinners;
    v29AwardWinners=function(){
      var w=__v74Winners.apply(this,arguments);
      try{
        if(!w||typeof w!=='object')return w;
        if(w.STEAL)return w;                    /* 已有就不重复补 */
        var cards=(career&&career.seasonAwards)||[];
        var card=cards.find(function(x){return x.key==='抢断王'||x.title==='抢断王'});
        var self=(typeof currentP==='function'&&currentP())?currentP().zh:'你';
        var mine=!!(card&&card.won);
        var opp=null;
        try{
          var y=(career&&(career.seasonYear||career.draftYear))||2020;
          opp=(typeof v29Pick==='function')?v29Pick(y,'DPOY',8):'联盟抢断王';
        }catch(e){}
        var stl=(career&&career.seasonStats&&Number(career.seasonStats.stl))||0;
        w.STEAL={label:'抢断王',winner:mine?self:(opp||'联盟抢断王'),
                 self:mine?'获奖':(stl.toFixed(1)+' SPG')};
      }catch(e){}
      return w;
    };
    window.__v74StealGuard=true;
  }
}catch(e){}

window.__v74Debug={mvpRankGuard:window.__v74MvpRankGuard,awardCardGuard:window.__v74AwardCardGuard,stealGuard:window.__v74StealGuard};

})();

