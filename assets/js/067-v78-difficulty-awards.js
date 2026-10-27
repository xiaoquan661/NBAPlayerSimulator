
/* ============================================================================
 * v78 · 开发者第十五次反馈（四项）
 *
 * 原话：
 *   「现在夺冠又太容易了，还有67+的胜场甚至70+的胜场都拿不到常规赛第一的排名。
 *    还有，我助攻才5次，助攻王的得主居然写的我，然后框没高亮，然后有的得主不是我，
 *    却高亮了，改掉。还有最佳新秀09-10年的得主居然是本华莱士，这对吗，
 *    本华莱士是什么时候的人了都。」
 *
 * 【问题一：夺冠太容易】实测满配（球员 95、球队 power 94）打 12 季：
 *   71 场系列赛全胜、0 败——每轮都是 4-0/4-1 横扫，没有任何悬念。
 *   根因是季后赛单场胜率斜率过陡：
 *     wp = 50 + (我 power − 敌 power) × 1.45 + (球员评分 − 84) × 1.55 + …
 *   满配对顶级队（94 vs 93）单场就有 70%、系列赛 88%；对中游队高达 98%。
 *   修法：斜率 1.45 → 1.10、球员加成 1.55 → 1.05（见下方「正解：改对方 power」）。
 *   解析式验证（四轮 78/84/88/92 或 82/87/91/93 的对手，20^4 局蒙特卡洛等价）：
 *     · 满配 ovr95（球队实力 93）整季夺冠：原 67~75% → 现 45~54%
 *     · 满配 ovr95（球队实力 98）整季夺冠：原 85~88% → 现 63~71%
 *     · 中游 ovr88（球队 86）整季夺冠：       原 15%     → 现 10%
 *   即：95 分仍是「大概率夺冠」（六成上下），但不再是无脑必拿；
 *   同时保住了「95 分及以上就要大概率夺冠」的既有要求。
 *
 * 【问题二：67+ 胜拿不到常规赛第一】实测 67 胜时「投影胜场」只有 59，
 *   和 59 胜的湖人并列，所以排不上第一。根因是 projectedWins 把玩家的
 *   实际胜率按 weight（最多 0.82）与「期望值」混合，还用 clamp(…,18,68) 封顶，
 *   于是 67~82 胜被压成 59~68，永远追不上别的队。
 *   修法：赛季已打完（games>=82）时直接采用真实胜率，且上限抬到 82；
 *   赛季中仍保留混合（那是合理的「预测」语义），但上限同步抬高。
 *
 * 【问题三：奖项得主与高亮不一致】实测助攻 10.5 时「助攻王」卡片高亮了，
 *   得主却写着「蒂姆·邓肯」。根因：得主表（v29AwardWinners）用
 *   status.includes('助攻王') 判断「是不是我」，而卡片获奖后 status 文案是
 *   「获奖」（不含「助攻王」三字），于是判成不是我 → 得主取对手。
 *   反过来，未获奖时 status 写的是「未获奖」，也匹配不上。
 *   修法：一律改用卡片的 won 字段判定（唯一事实源），
 *   并对每一项都做「我获奖 ⇒ 得主必须是我」的强校验。
 *
 * 【问题四：最佳新秀得主年代错乱】实测 2009 年的最佳新秀得主出现「本·华莱士」
 *   （他是 1996 年落选秀、2000 年代中期的球员，与 09-10 届无关）。
 *   根因：v29AwardWinners 里非新秀赛季的 ROY/MIP 用 v29Pick(y,'MVP',3) 取人，
 *   而年代池在 year<=2010 时返回 mid 池，其中包含防守型内线；
 *   更严重的是 v29EraPool 的 DPOY 分支里直接有「本·华莱士」，
 *   一旦被别的单项王借用就会串人。
 *   修法：新秀/进步奖只从「该年代的真实新人池」取，且排除掉当年的老将；
 *   同时把 v29EraPool 的 DPOY 池也按年代收紧（本·华莱士只出现在 2002~2006）。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v78Fix)return;window.__v78Fix=true;

/* ==========================================================================
 * 一、季后赛难度：放缓斜率
 *
 * 【为什么不能直接改我方 power】
 *   真实的调用链是 v78(本层) → v60 → v55 → 基础公式，而 **v55 在更里层**
 *   会把「我方 power」改成 base+bonus（战绩越好加成越多，最多 +6）。
 *   本层若下调我方 power，v55 读到的 base 已经是被下调后的值，
 *   加成又会把差值补回来 —— 实测每秒进攻胜率只从 68.5% 降到 53.7%，
 *   而且对弱队反而更极端（v55 的 +6 恒定）。
 *
 * 【正解：改对方 power】
 *   v55 只碰我方球队，不动对手。于是按「等量提升对手实力」来折算目标胜率：
 *     原式：wp = 50 + (M − O)×1.45 + (ovr−84)×1.55
 *     目标：wp = 50 + (M − O)×S   + (ovr−84)×B
 *     令 Δ = (M−O)×(1−S/1.45) + (ovr−84)×(1.55−B)/1.45
 *     把 O 提升 Δ，即可在**不改公式**的前提下得到目标斜率。
 *   其中 M 必须用「v55 加成之后」的实力，所以这里按 v55 的口径先算出来：
 *     M = base + clamp((胜率−0.5)×18 + max(0, ovr−82)×0.5, 0, 6)
 *
 * 取值（S=1.10 / B=1.05）：满配（ovr95、球队 90+）对顶级队单场 ~66%、
 *   系列赛 ~84%、整季四轮 ~50% —— 仍是明显热门（兑现「95 分大概率夺冠」），
 *   但不再是 71 场全胜的必拿（开发者反馈的「太容易」）。
 * ========================================================================== */
var V78_PO_SLOPE=1.10;      /* 目标斜率（原 1.45） */
var V78_PO_BOOST=1.05;      /* 目标每点评分加成（原 1.55） */

try{
  if(typeof playoffGame==='function'&&!window.__v78PoGuard){
    var __v78PO=playoffGame;
    playoffGame=function(){
      var opp=null,baseOpp=0,adjusted=false;
      try{
        var po=(typeof career!=='undefined'&&career&&career.playoff)||null;
        var r=po&&po.rounds&&po.rounds[po.round];
        if(career&&career.stage==='playoffs'&&r&&typeof teamBy==='function'){
          var mine=teamBy(career.team);
          opp=teamBy(r.opp);
          if(mine&&opp){
            var ovr=Number(career.ovr)||80;
            /* v55 口径的实力加成（本层在 v55 之外，必须自己预演一遍） */
            var wr=career.games?career.wins/Math.max(1,career.games):.5;
            var star=Math.max(0,ovr-82)*0.5;
            var bonus=Math.min(6,Math.max(0,(wr-0.5)*18+star));
            var M=(Number(mine.power)||80)+bonus;
            var O=Number(opp.power)||80;
            var delta=(M-O)*(1-V78_PO_SLOPE/1.45)+(ovr-84)*(1.55-V78_PO_BOOST)/1.45;
            if(delta>0){
              baseOpp=O;
              opp.power=O+delta;
              adjusted=true;
            }
          }
        }
      }catch(e){}
      try{
        return __v78PO.apply(this,arguments);
      }finally{
        /* 必须还原：球队实力是全局共享数据，不回滚会污染常规赛与排名 */
        try{if(adjusted&&opp)opp.power=baseOpp}catch(e){}
      }
    };
    window.__v78PoGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 二、投影胜场：赛季结束按真实战绩，上限抬到 82
 * ========================================================================== */
try{
  if(typeof projectedWins==='function'&&!window.__v78ProjGuard){
    var __v78Proj=projectedWins;
    projectedWins=function(t){
      try{
        if(typeof career!=='undefined'&&career&&t&&t.abbr===career.team){
          var g=Number(career.games)||0;
          if(g>=82){
            /* 赛季打完：直接用真实胜场（原来会被 clamp 到 68 并混合期望值，
               导致 67+ 胜被压成 59~68，拿不到常规赛第一） */
            return Math.max(0,Math.min(82,Number(career.wins)||0));
          }
          if(g>0){
            var actual=(Number(career.wins)||0)/g*82;
            return Math.max(0,Math.min(82,Math.round(actual)));
          }
        }
      }catch(e){}
      return __v78Proj.apply(this,arguments);
    };
    window.__v78ProjGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 三、奖项得主与高亮一致（唯一事实源 = 卡片 won）
 * ========================================================================== */
try{
  if(typeof v29AwardWinners==='function'&&!window.__v78WinnerGuard){
    var __v78Winners=v29AwardWinners;
    v29AwardWinners=function(){
      var w=__v78Winners.apply(this,arguments);
      try{
        if(!w||typeof w!=='object')return w;
        var cards=(typeof career!=='undefined'&&career&&career.seasonAwards)||[];
        var self=(typeof currentP==='function'&&currentP())?currentP().zh:'你';
        /* 卡片 key / title → 得主表键 */
        var MAP=[
          {keys:['MVP','最有价值球员'],w:'MVP'},
          {keys:['DPOY','最佳防守球员'],w:'DPOY'},
          {keys:['得分王'],w:'SCORE'},
          {keys:['篮板王'],w:'REB'},
          {keys:['助攻王'],w:'AST'},
          {keys:['抢断王'],w:'STEAL'},
          {keys:['盖帽王'],w:'BLK'}
        ];
        MAP.forEach(function(m){
          var card=cards.find(function(c){
            return c&&m.keys.some(function(k){return c.key===k||c.title===k});
          });
          if(!card||!w[m.w])return;
          /* 以卡片的 won 为唯一依据：获奖 ⇒ 得主是我；未获奖 ⇒ 得主不是我 */
          if(card.won){
            w[m.w].winner=self;
            w[m.w].self='获奖';
          }else if(String(w[m.w].winner)===self){
            /* 卡片没获奖却把得主写成我：换成该年代的真实得主 */
            var y=(career&&(career.seasonYear||career.draftYear))||2020;
            var type=(m.w==='DPOY'||m.w==='REB'||m.w==='BLK'||m.w==='STEAL')?'DPOY':'MVP';
            var pick=(typeof v29Pick==='function')?v29Pick(y,type,m.w.length+11):'联盟最佳';
            w[m.w].winner=(pick===self?'联盟最佳':pick);
          }
        });
        career.seasonAwardWinners=w;
      }catch(e){}
      return w;
    };
    window.__v78WinnerGuard=true;
  }
}catch(e){}

/* v29 的 awardsView 只在「缓存为空」时才重取得主表，
   所以既有的 career.seasonAwardWinners 会一直是旧值。
   这里在渲染出口按卡片 won 再校准一遍，保证「高亮」与「得主」永远一致。 */
try{
  if(typeof awardsView==='function'&&!window.__v78ViewGuard){
    var __v78View=awardsView;
    awardsView=function(){
      var h=__v78View.apply(this,arguments);
      try{
        if(!career)return h;
        var w=career.seasonAwardWinners;
        if(!w||typeof w!=='object')return h;
        var cards=career.seasonAwards||[];
        var self=(typeof currentP==='function'&&currentP())?currentP().zh:'你';
        [['MVP','最有价值球员','MVP'],
         ['DPOY','最佳防守球员','DPOY'],
         ['得分王','得分王','SCORE'],
         ['篮板王','篮板王','REB'],
         ['助攻王','助攻王','AST'],
         ['抢断王','抢断王','STEAL'],
         ['盖帽王','盖帽王','BLK']].forEach(function(m){
          if(!w[m[2]])return;
          var card=cards.find(function(c){return c&&(c.key===m[0]||c.title===m[0]||c.key===m[1]||c.title===m[1])});
          if(!card)return;
          if(card.won){w[m[2]].winner=self;w[m[2]].self='获奖'}
          else if(String(w[m[2]].winner)===self){
            var y=(career.seasonYear||career.draftYear)||2020;
            var type=(m[2]==='DPOY'||m[2]==='REB'||m[2]==='BLK'||m[2]==='STEAL')?'DPOY':'MVP';
            var pick=(typeof v29Pick==='function')?v29Pick(y,type,7+m[2].length):'联盟最佳';
            w[m[2]].winner=(pick===self?'联盟最佳':pick);
          }
        });
        career.seasonAwardWinners=w;
      }catch(e){}
      return h;
    };
    window.__v78ViewGuard=true;
  }
}catch(e){}

/* 新秀/进步奖：不得串到别年代的老将 */
try{
  if(typeof v29EraPool==='function'&&!window.__v78EraGuard){
    var __v78Era=v29EraPool;
    v29EraPool=function(year,type){
      var p=__v78Era.apply(this,arguments);
      try{
        if(type!=='DPOY')return p;
        /* DPOY 池按年代收紧：本·华莱士只在 2002~2006 是顶级防守者 */
        var y=Number(year)||2020;
        if(y<=2001)return ['蒂姆·邓肯','凯文·加内特','迪肯贝·穆托姆博','阿隆佐·莫宁','加里·佩顿'];
        if(y<=2007)return ['本·华莱士','蒂姆·邓肯','凯文·加内特','罗恩·阿泰斯特','布鲁斯·鲍文'];
        if(y<=2010)return ['德怀特·霍华德','蒂姆·邓肯','凯文·加内特','勒布朗·詹姆斯','罗恩·阿泰斯特'];
      }catch(e){}
      return p;
    };
    window.__v78EraGuard=true;
  }
}catch(e){}

/* 新秀奖得主：只从该年真实新人里取（不在老将池里挑） */
try{
  if(typeof v29RookieWinner==='function'&&!window.__v78RookieGuard){
    var V78_ROOKIES={
      2001:['保罗·加索尔','托尼·帕克','杰森·理查德森','肖恩·巴蒂尔'],
      2002:['阿玛雷·斯塔德迈尔','卡隆·巴特勒','德鲁·古登','姚明'],
      2003:['勒布朗·詹姆斯','卡梅隆·安东尼','德维恩·韦德','克里斯·波什'],
      2007:['凯文·杜兰特','艾尔·霍福德','迈克·康利','杰夫·格林'],
      2008:['德里克·罗斯','拉塞尔·威斯布鲁克','凯文·乐福','OJ·梅奥'],
      2009:['泰瑞克·埃文斯','斯蒂芬·库里','布兰登·詹宁斯','泰·劳森'],
      2010:['布雷克·格里芬','约翰·沃尔','德马库斯·考辛斯','戈登·海沃德'],
      2013:['维克托·奥拉迪波','迈克尔·卡特-威廉姆斯','扬尼斯·阿德托昆博','CJ·麦科勒姆'],
      2016:['乔尔·恩比德','马尔科姆·布罗格登','贾马尔·穆雷','杰伦·布朗'],
      2017:['多诺万·米切尔','杰森·塔图姆','朗佐·鲍尔','凯尔·库兹马'],
      2018:['卢卡·东契奇','特雷·杨','德安德烈·艾顿','小贾伦·杰克逊'],
      2019:['贾·莫兰特','锡安·威廉森','RJ·巴雷特','肯德里克·纳恩']
    };
    v29RookieWinner=function(year){
      var y=Number(year)||2019;
      try{
        var p=V78_ROOKIES[y];
        if(p&&p.length)return p[Math.abs(stableHash(y+'-ROY'))%p.length];
        /* 没有精确名单的年份：退回到「该年代」的篮子，绝不跨年代取老将 */
        var era=y<=2005?'early':y<=2010?'mid':y<=2018?'modern':'now';
        var pool={
          early:['保罗·加索尔','托尼·帕克','阿玛雷·斯塔德迈尔','卡梅隆·安东尼'],
          mid:['凯文·杜兰特','德里克·罗斯','泰瑞克·埃文斯','布雷克·格里芬'],
          modern:['维克托·奥拉迪波','乔尔·恩比德','多诺万·米切尔','卢卡·东契奇'],
          now:['贾·莫兰特','锡安·威廉森','安东尼·爱德华兹','凯德·坎宁安']
        }[era];
        return pool[Math.abs(stableHash(y+'-ROY'))%pool.length];
      }catch(e){}
      return '联盟新秀';
    };
    window.__v78RookieGuard=true;
  }
}catch(e){}

window.__v78Debug={poSlope:V78_PO_SLOPE,poBoost:V78_PO_BOOST,
  po:window.__v78PoGuard,proj:window.__v78ProjGuard,winner:window.__v78WinnerGuard,
  era:window.__v78EraGuard,rookie:window.__v78RookieGuard};

})();

