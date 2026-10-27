
/* =====================================================================
   V6.0 · 姚明的赛季随机事件池 + 支线事件按档期足量触发
   开发者要求（原话）：
     「随机事件一个赛季2-3次就可以了，并且是常规赛初一次，常规赛结束一次，
       如果有季后赛，季后赛一次」

   体检发现两个问题：
     ① 【档期】原先一季弹 5 次、时机散乱（G0/G10/G18/G32/G52），因为多套
        系统各自触发。已在 v59 统一为三个固定档期。
     ② 【池子空】姚明（意难平系列）在 V42_EV_V2 里**没有自己的事件分组**
        （V42_EV_V2 只有 bennett/oden/kwame/fultz/simmons 五组，共 102 条），
        长弧事件又要 storyIndex≥6 才启用 —— 所以刚开局几个赛季几乎抽不到
        支线事件，一季只有 0~1 次，达不到「2~3 次」。

   修法：
     A. 给姚明补一组专属赛季随机事件（20 条，含 6 条后续链），
        放在他真实生涯的处境里（脚部负荷、国家队、内线对抗、姚麦组合、
        中国市场关注度、语言与文化适应等），风格与其余 5 人一致。
     B. 让档期「主动触发」：进入档期且本季该档未用时，主动抽一条事件，
        保证常规赛初 / 常规赛末各一次、季后赛一次（有季后赛）。
   ===================================================================== */
(function(){
if(window.__v60YaoEvents)return;window.__v60YaoEvents=true;

/* ---------- A. 姚明的赛季随机事件（结构与 V42_EV_V2 一致：[标题,正文,选项,后续标记]） ---------- */
const YAO_EV=[
 ['队医把你的出场时间圈了起来','训练结束，队医在名单上给每一场比赛都写了个数字。',
  [['接受管理，打得更久','耐久+2，健康+6。',{a:{durability:2},h:6}],
   ['不接受，我要打满','终结+2，风险上升。',{a:{finishing:2},s:5}],
   ['先试一个月再说','心态+2。',{a:{mentality:2}}]]],

 ['又一次在落地时皱了一下眉','没人看见，但你自己知道那一下不对劲。',
  [['立刻告诉队医','健康+5，信任+3。',{h:5,tr:3}],
   ['装作没事继续打','状态维持，风险上升。',{a:{finishing:2},s:6}],
   ['改练落地方式','耐久+2。',{a:{durability:2}}]]],

 ['国家队又打来电话','八月名单的事，还是老问题。',
  [['答应回去打','球迷支持+5，健康-5。',{c:5,h:-5}],
   ['申请只打热身赛','心态+2，信任+2。',{a:{mentality:2},tr:2}],
   ['这个夏天只想休息','健康+8，球迷支持-3。',{h:8,c:-3}]]],

 ['有人把你和另一个中锋放在一起比','对比图做得很难看，两条曲线摆在一起。',
  [['不看这些','心态+2。',{a:{mentality:2}}],
   ['用下一场回应','终结+2，自信+3。',{a:{finishing:2},c:3}],
   ['主动聊这件事','球迷支持+4。',{c:4}]]],

 ['媒体问你会不会说英语','这个问题你已经回答过很多次。',
  [['用英语回答','心态+2，信任+3。',{a:{mentality:2},tr:3}],
   ['让翻译来','专注训练。',{a:{defense:2}}],
   ['干脆开个玩笑','球迷支持+4。',{c:4}]]],

 ['更衣室里响起一首你没听过的歌','队友们笑得很开心，你只能跟着点头。',
  [['主动问这是什么','团队关系+4。',{tr:4}],
   ['回去自己查','心态+2。',{a:{mentality:2}}],
   ['放一首中文歌','球迷支持+3，团队关系+2。',{c:3,tr:2}]]],

 ['主教练想让你练一个新的低位动作','他画了一整套脚步，比你现在用的复杂得多。',
  [['整个夏天磨这个动作','终结+3，健康-3。',{a:{finishing:3},h:-3}],
   ['先用现有动作打稳','防守+2。',{a:{defense:2}}],
   ['只要一个简单的版本','心态+2，信任+3。',{a:{mentality:2},tr:3}]]],

 ['一个中国小球员想见你','他坐了十几个小时飞机，就在球馆外面等着。',
  [['见，聊一个小时','球迷支持+5。',{c:5}],
   ['训练结束后再见','心态+2。',{a:{mentality:2}}],
   ['让球队安排一次正式见面','信任+3，球迷支持+3。',{tr:3,c:3}]]],

 ['对手开始用绕前防你','球传不进来，外线的人开始犹豫。',
  [['要求高位接球','组织+2，终结+2。',{a:{playmaking:2,finishing:2}}],
   ['干脆去抢篮板','篮板+2。',{a:{rebounding:2}}],
   ['让队友来解决','团队关系+4。',{tr:4}]]],

 ['一场背靠背，你的移动明显慢了','录像里你自己都看出来了。',
  [['申请轮休一场','健康+7，信任-2。',{h:7,tr:-2}],
   ['照常上，硬扛','终结+2，风险上升。',{a:{finishing:2},s:5}],
   ['减少上场时间','耐久+2，健康+3。',{a:{durability:2},h:3}]]],

 ['（后续）身体管理方案开始见效','那套被写进计划表的东西，第一次显出效果。',
  [['继续按方案走','耐久+2，健康+3。',{a:{durability:2},h:3}],
   ['加大训练量','终结+2，风险上升。',{a:{finishing:2},s:4}],
   ['让队医再评估一次','信任+3。',{tr:3}]],'yao_f1'],

 ['（后续）国家队的事有了结果','两边最终谈成了一个方案。',
  [['接受安排','心态+2，球迷支持+3。',{a:{mentality:2},c:3}],
   ['坚持自己的判断','自信+3。',{c:3}],
   ['把话留给球队去说','信任+3。',{tr:3}]],'yao_f1'],

 ['（后续）新的低位动作进了比赛','那个夏天磨的东西，第一次用在正式比赛里。',
  [['继续用','终结+2。',{a:{finishing:2}}],
   ['只做备用','心态+2。',{a:{mentality:2}}],
   ['教给队友','团队关系+4。',{tr:4}]],'yao_f2'],

 ['（后续）那个小球员进了青年队','他发来一条消息，句子很短。',
  [['回他一句','球迷支持+4。',{c:4}],
   ['记住了这件事','心态+2。',{a:{mentality:2}}]]],

 ['（后续）绕前防守有了对策','球队专门为这一招做了调整。',
  [['继续打高位','组织+2。',{a:{playmaking:2}}],
   ['回到低位硬打','终结+2，风险上升。',{a:{finishing:2},s:3}],
   ['让外线承担更多','团队关系+3，信任+2。',{tr:5}]],'yao_f2'],

 ['（后续）轮休带来的变化','那几场休息，让后面一段明显不一样。',
  [['保持这个节奏','健康+5，耐久+1。',{h:5,a:{durability:1}}],
   ['回到满出场','终结+2，风险上升。',{a:{finishing:2},s:4}]]],

 ['一次访谈被问到你希望被怎么记住','问题很轻，但你答了很久。',
  [['说是一个把球打好的中锋','心态+3。',{a:{mentality:3}}],
   ['说是一座桥','球迷支持+5。',{c:5}],
   ['说还没打完，先不回答','自信+3。',{c:3}]]],

 ['球队想在训练里加一套双塔战术','教练把你和另一名内线同时放在场上。',
  [['在高位策应','组织+3。',{a:{playmaking:3}}],
   ['守住内线','防守+2，篮板+2。',{a:{defense:2,rebounding:2}}],
   ['告诉教练这不合适','信任+2，心态+2。',{tr:2,a:{mentality:2}}]]],

 ['你的球衣成了那年中国销量第一','市场部把报表递过来，数字很大。',
  [['把它当成责任','心态+2，球迷支持+5。',{a:{mentality:2},c:5}],
   ['尽量不受影响','专注训练。',{a:{finishing:2}}],
   ['用这笔影响力做点事','球迷支持+4，信任+3。',{c:4,tr:3}]]],

 ['休赛期有人请你去带一次训练营','地点在你小时候练球的那个馆。',
  [['去，待满两周','球迷支持+5，心态+2。',{c:5,a:{mentality:2}}],
   ['只去一天','心态+2。',{a:{mentality:2}}],
   ['今年先不去了，要养身体','健康+6。',{h:6}]]]
];

/* 注册进 V42_EV_V2（保持与其余 5 人完全一致的结构） */
try{
  if(window.V42_EV_V2&&typeof window.V42_EV_V2==='object'&&!window.V42_EV_V2.yao){
    window.V42_EV_V2.yao=YAO_EV;
  }
}catch(e){}
/* 兜底：万一张表在别的引用上，也尝试补进 v42BuildPool 的数据源 */
try{
  if(typeof V42_EV_V2!=='undefined'&&V42_EV_V2&&!V42_EV_V2.yao)V42_EV_V2.yao=YAO_EV;
}catch(e){}

/* ---------- B. 档期主动触发 ----------
   v59 只做「拦」——不在档期就撤销。但如果那一档本来没人来触发（例如姚明
   的池子为空、长弧又没到条件），就会整季空着。
   这里补「主动触发」：进入档期、且本季该档未用时，直接抽一条事件挂上。 */
try{
  const __v60Maybe=maybeStory;
  maybeStory=function(){
    const hit=__v60Maybe();
    if(hit)return true;
    try{
      if(!career||career.retired)return false;
      if(ui.storyEvent||ui.modal)return false;
      if(!career.exclusive)return false;              /* 未解锁走原有 v42 路径 */
      if(career.stage!=='regular'&&career.stage!=='playoffs'&&career.stage!=='playin')return false;
      if(typeof window.__v59Debug!=='object')return false;
      const slot=window.__v59Debug.slotNow();
      if(!slot)return false;
      /* 从姚明/该球员的随机池抽一条没用过的 */
      const pid=career.playerId;
      const pool=(window.V42_EV_V2&&window.V42_EV_V2[pid])||[];
      if(!pool.length)return false;
      career.v60Used=career.v60Used||{};
      const used=career.v60Used[pid]||{};
      /* 后续链：带第 4 项标记的条目，需对应标记已解锁 */
      const avail=[];
      pool.forEach((row,i)=>{
        if(used[i])return;
        const need=row&&row[3];
        if(need&&!(career.v42EvFlags&&career.v42EvFlags[need]))return;
        avail.push({i,row});
      });
      if(!avail.length)return false;
      const pickIdx=(career.seasonNo*3+pool.length)%avail.length;
      const chosen=avail[pickIdx];
      const row=chosen.row;
      used[chosen.i]=1;
      career.v60Used[pid]=used;
      const ev={
        t:row[0],b:row[1],
        c:row[2].map(x=>[x[0],x[1],x[2]]),
        _v42New:true,_v42Idx:chosen.i,_v60:true
      };
      /* 标记档期已用（复用 v59 的档期状态） */
      try{const v=window.__v59Slots();if(v)v[slot]=true;}catch(e){}
      stopSim&&stopSim();
      ui.storyEvent=ev;
      save();render();
      return true;
    }catch(e){}
    return false;
  };
}catch(e){}

/* ---------- C. 季后赛也要检查事件档期 ----------
   实测发现：季后赛**从不调用 maybeStory**，所以「季后赛一次」这个档期
   永远等不到触发时机。而且「一键模拟本轮」走的是 v218AutoSeriesGame
   （v218 IIFE 内部、外部不可达），包装 playoffGame 也拦不到那条路径。
   因此改为在可达的两个入口外侧补检查：
     · simSeries（一键模拟整轮）
     · playoffView 里「模拟下一场」按钮最终也走 playoffGame
   两者都在这里显式补一次档期检查。 */
function v60CheckPlayoffSlot(){
  try{
    if(!career||career.retired)return;
    if(ui&&(ui.storyEvent||ui.modal))return;
    if(career.stage!=='playoffs')return;
    if(typeof maybeStory==='function')maybeStory();
  }catch(e){}
}
try{
  const __v60SimSeries=(typeof simSeries==='function')?simSeries:null;
  if(__v60SimSeries){
    simSeries=function(){
      const r=__v60SimSeries();
      v60CheckPlayoffSlot();
      return r;
    };
  }
}catch(e){}
try{
  const __v60PO=(typeof playoffGame==='function')?playoffGame:null;
  if(__v60PO){
    playoffGame=function(){
      const r=__v60PO();
      v60CheckPlayoffSlot();
      return r;
    };
  }
}catch(e){}
try{
  if(typeof advancePlayoffStage==='function'){
    const __v60Adv=advancePlayoffStage;
    advancePlayoffStage=function(){
      const r=__v60Adv();
      v60CheckPlayoffSlot();
      return r;
    };
  }
}catch(e){}

window.__v60Debug={yaoPool:YAO_EV.length,pool:()=>YAO_EV};

})();
