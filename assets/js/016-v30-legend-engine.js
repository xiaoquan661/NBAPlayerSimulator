
/* =====================================================================
   V3.0 · 生涯传奇主线引擎
   1) 修复「82 场豆豆后半段褪色」
   2) 修复「全明星看完还要手动再点一次」
   3) 专属主线改成贯穿生涯的连续分支故事（选择真正分叉 + 4~5 种结局）
   4) 未解锁玩家：每季随机事件 + 连续选错进入下滑、最终淡出联盟
   ===================================================================== */
(function(){
if(window.__v30Legend)return;window.__v30Legend=true;

/* ---------- 通用小工具 ---------- */
function v30Has(){return !!career}
function v30P(){return career?career.playerId:null}
function v30Rnd(a,b){return Math.floor(Math.random()*(b-a+1))+a}
function v30Clamp(v,a=0,b=100){a=a==null?0:a;b=b==null?100:b;return Math.max(a,Math.min(b,v))}
function v30LastRec(){let l=(career&&career.storyLog)||[];return l.length?l[l.length-1]:null}
function v30LastChoice(){let r=v30LastRec();return r&&r.choice?r.choice:''}

/* =====================================================================
   PART 1 · 两个问题修复
   ===================================================================== */

/* --- 1.1 豆豆褪色：整季逐场胜负单独留档，不再被 gameLog 的 30 条截断 --- */
if(career){career.v30Season=career.v30Season||{games:{},wins:0,losses:0}}

const __v30Sim=simulateGame;
simulateGame=function(){
  let before=career?career.games:0;
  __v30Sim();
  if(!v30Has())return;
  if(career.games===before)return;
  let g=(career.gameLog||[])[0];
  if(!g||typeof g.n!=='number')return;
  career.v30Season=career.v30Season||{games:{},wins:0,losses:0};
  if(!career.v30Season.games[g.n]){
    career.v30Season.games[g.n]={win:!!g.win,played:g.played!==false};
    if(g.win)career.v30Season.wins++;else career.v30Season.losses++;
  }
};

/* 整季 82 格：先读完整留档，缺失时才回落到 gameLog */
v26Beans=function(){
  if(!career)return'';
  career.v30Season=career.v30Season||{games:{},wins:0,losses:0};
  let played={};(career.gameLog||[]).forEach(g=>{if(typeof g.n==='number')played[g.n]={win:!!g.win,played:g.played!==false}});
  let cells='';
  for(let i=1;i<=82;i++){
    let g=career.v30Season.games[i]||played[i];
    cells+=g
      ?`<i class="v26-bean ${g.win?'win':'loss'} ${g.played===false?'dnp':''} ${g.roseBlast?'blast':''}" title="G${i} ${g.played===false?(g.win?'伤停 · 球队胜':'伤停 · 球队负'):(g.win?'胜':'负')}"></i>`
      :`<i class="v26-bean pending" title="G${i} 未模拟"></i>`;
  }
  let w=career.v30Season.wins||0,l=career.v30Season.losses||0;
  return `<div class="v26-bean-card"><div class="v26-bean-head"><b>常规赛 82 场</b><span>绿=胜 · 红=负 · 灰点=伤停（保留胜负色） · 暗=未模拟 ／ 当前 ${w}胜${l}负</span></div><div class="v26-beans">${cells}</div></div>`;
};

/* 新开一局：重置本局状态（专属解锁按「每开一局都要重新解锁」处理） */
const __v30Create=createCareer;
createCareer=function(){
  __v30Create();
  if(!career)return;
  career.v30={usedKeys:{},route:null,routeHistory:[],decline:{streak:0,active:false,rescue:0,stage:0},epIndex:0,eventsSinceGood:0,sagaPerSeason:0,eventPerSeason:0};
  career.v30Season={games:{},wins:0,losses:0};
  save();
};

/* 跨赛季清空逐场留档 */
const __v30Begin=beginSeason;
beginSeason=function(){let old=career?career.seasonNo:null;__v30Begin();if(v30Has()&&career.seasonNo===old){career.v30Season={games:{},wins:0,losses:0};save()}};
const __v30Next=nextSeason;
nextSeason=function(){let old=career?career.seasonNo:null;__v30Next();if(v30Has()&&career.seasonNo!==old){career.v30Season={games:{},wins:0,losses:0};save()}};

/* --- 1.2 全明星看完自动回到常规赛并自动继续模拟 --- */
function v30EnsureAutoSim(){
  if(!v30Has())return;
  if(career.stage!=='regular'||career.retired)return;
  if(ui.storyEvent||ui.modal)return;
  if(career.games>=82)return;
  if(ui.sim)return;
  if(typeof window.v221StartSim==='function')window.v221StartSim();
}

/* 全明星流程结束后回到常规赛，但不再自动开跑；和自建一样等玩家点“开始模拟”。 */
const __v30ResumeAllStar=typeof resumeAllStar==='function'?resumeAllStar:null;
if(__v30ResumeAllStar){
  resumeAllStar=function(){
    __v30ResumeAllStar();
  };
}

/* =====================================================================
   PART 2 · 路线与内容
   ===================================================================== */

/* 路线识别：从已累积的剧情选择里算出这位状元当前走在哪条路上 */
const V30_ROUTES={
  bennett:{
    alpha:{label:'球队第一选择',keys:['scorer','fire','usage','takeover','face','inside']},
    team:{label:'赢球万能拼图',keys:['reliable','steady','work','stay','mobile','stretch']},
    survivor:{label:'长线生存者',keys:['utility','survive','moveon','reset','bet']}
  },
  oden:{
    push:{label:'天赋全开线',keys:['push','balance','stretch']},
    protect:{label:'极致保护线',keys:['trust','conservative','longevity']},
    elsewhere:{label:'换队重生线',keys:['miami','elsewhere','leave']}
  },
  kwame:{
    anchor:{label:'防守支柱线',keys:['anchor','four','fundamentals','learn']},
    offense:{label:'低位进攻线',keys:['offense','compete','simple']},
    elder:{label:'更衣室领袖线',keys:['mentor','elder','team','utility']}
  },
  fultz:{
    shooter:{label:'投篮回归线',keys:['mechanics','shoot','locked','pullup']},
    floor:{label:'组织核心线',keys:['play','orlando','playmaking']},
    warrior:{label:'带伤证明线',keys:['medical','philly','warrior']}
  },
  simmons:{
    shoot:{label:'投射解禁线',keys:['shoot','shooter','balanced']},
    engine:{label:'组织中锋线',keys:['big','engine','defense']},
    reset:{label:'重新开始线',keys:['leave','repair','reset']}
  }
};

function v30Flags(){
  if(!career)return[];
  let f=career.storyFlags||{},out=[];
  Object.keys(f).forEach(k=>{if(typeof f[k]==='string')out.push(f[k]);else if(f[k]!=null)out.push(String(f[k]))});
  (career.storyLog||[]).forEach(x=>{if(x&&x.choice)out.push(String(x.choice))});
  return out;
}
/* 每位状元的三条路线，按「全力 / 折中 / 保守」排序 */
const V30_ROUTE_ORDER={
  bennett:["alpha","team","survivor"],
  oden:["push","protect","elsewhere"],
  kwame:["anchor","offense","elder"],
  fultz:["shooter","floor","warrior"],
  simmons:["shoot","engine","reset"]
};
/* 路线 → 该路线在 storyFlags 里使用的键名前缀 */
const V30_ROUTE_FLAG={
  bennett:{alpha:"v30alpha",team:"v30team",survivor:"v30surv"},
  oden:{push:"v30push",protect:"v30prot",elsewhere:"v30else"},
  kwame:{anchor:"v30anchor",offense:"v30off",elder:"v30elder"},
  fultz:{shooter:"v30shoot",floor:"v30floor",warrior:"v30war"},
  simmons:{shoot:"v30shoot",engine:"v30engine",reset:"v30reset"}
};
/* 选项序号 → 目标路线：0=继续当前路线，1=折中路线，2=保守/转向 */
function v30OptionRoute(p,baseRoute,idx){
  let order=V30_ROUTE_ORDER[p]||[];
  if(!order.length)return baseRoute;
  if(idx===0)return baseRoute;
  if(idx===1)return order[1];
  return order[2];
}

/* 选择 → 路线：每个选项写在 storyFlags 里的键名前缀就指明了它把故事推向哪条路
   （v30alpha=球队第一选择线 / v30team=赢球拼图线 / v30surv=长线生存线 …）。
   这样「这一次选择」会真的改变「下一段剧情属于哪条分支」，而不是只看玩家走了几段。 */
const V30_FLAG_ROUTE={
  bennett:{v30alpha:"alpha",v30team:"team",v30surv:"survivor"},
  oden:{v30push:"push",v30prot:"protect",v30else:"elsewhere"},
  kwame:{v30anchor:"anchor",v30off:"offense",v30elder:"elder"},
  fultz:{v30shoot:"shooter",v30floor:"floor",v30war:"warrior"},
  simmons:{v30shoot:"shoot",v30engine:"engine",v30reset:"reset"}
};

/* 从一个选项的 flags 里读出它把故事推向哪条路线（如 flags:[["v30alpha","clutch"]] → "alpha"） */
function v30PickedRoute(effect){
  let p=v30P(),fmap=V30_FLAG_ROUTE[p]||{};
  let list=(effect&&effect.flags)||[];
  for(let i=0;i<list.length;i++){
    let k=Array.isArray(list[i])?list[i][0]:list[i];
    if(k&&fmap[k])return fmap[k];
  }
  return null;
}

function v30RouteScore(){
  let p=v30P();if(!p)return{};
  let cfg=V30_ROUTES[p]||{},score={};
  Object.keys(cfg).forEach(r=>score[r]=0);
  /* 1) 已走完的分支：证明这段世界线走过这里 */
  let used=(career&&career.v30&&career.v30.usedKeys)||{};
  Object.keys(used).forEach(k=>{
    let m=k.split(":");
    if(m[0]===p&&score[m[1]]!=null)score[m[1]]+=2;
  });
  /* 2) 玩家实际选择记录：越近的选择权重越高，所以分支跟着玩家最新取向走 */
  let hist=(career&&career.v30&&career.v30.routeHistory)||[];
  hist.forEach((r,i)=>{if(score[r]!=null)score[r]+=3+(i/Math.max(1,hist.length))*6});
  /* 3) 兜底：读旧 storyFlags（早期章节留下的取向） */
  let fmap=V30_FLAG_ROUTE[p]||{},flags=(career&&career.storyFlags)||{};
  Object.keys(flags).forEach(k=>{let r=fmap[k];if(r&&score[r]!=null)score[r]+=2});
  return score;
}
function v30TopRoute(){
  let s=v30RouteScore(),best=null,bv=-1;
  Object.keys(s).forEach(r=>{if(s[r]>bv){bv=s[r];best=r}});
  return best;
}
function v30RouteLabel(route){
  let p=v30P(),cfg=(V30_ROUTES[p]||{})[route];
  return cfg?cfg.label:'未定路线';
}
/* 兼容旧的 routeLabels：仍是原来的路线，只是在专属主线里换成人话标签 */
function v30RouteText(){return v30RouteLabel(v30TopRoute())}

/* ---------- 专属主线 · 第二部：路线分支剧情（不重复，每个选择指向下一段不同的故事） ---------- */
const V30_EPS={
 bennett:{
  alpha:[
   {t:'球队第一次把最后一攻写在你的名字下面',scene:'赛季中段 · 更衣室战术板',speaker:'主教练 / 当家后卫',cast:['主教练','当家后卫'],b:'教练把最后一攻的板子推到你面前。三年了，这是第一次没有人再提“状元”，他们只说“你来”。你想起第一次被全场嘲笑的那个晚上，那时你连出手都要看别人的眼神。',stakes:'这会决定球队是否真的围绕你重建，也会决定你名字前面挂的到底是“水货”还是“核心”。',c:[['我来。以后关键回合都给我','接受第一选择的压力，球队会按核心待遇重组阵容。',{c:5,tr:4,flags:[['v30alpha','clutch']]}],['我来，但我要队友也参与','做核心但不独占球权，球队氛围更稳。',{tr:7,c:2,flags:[['v30alpha','share']]}],['今晚我来，之后再谈','先赢下这一场，合同和地位留到休赛期。',{c:3,tr:3,flags:[['v30alpha','wait']]}]]},
   {t:'报价来了：一支球队愿意用你当门面',scene:'休赛期 · 经纪人办公室',speaker:'经纪人',cast:['经纪人','球队总经理'],b:'一份顶薪摆在桌上，附带一句话：“我们要的是你当这支球队的脸。”另一支争冠球队同时给出更短、更低的报价，但那是冠军。你上一次做这种选择的时候，还没有任何人相信你能留在联盟。',stakes:'选择的不是钱，是你想被记住的方式：头号球星，还是冠军拼图。',c:[['签下去，我要当门面','成为球队招牌，个人荣誉路线全面打开。',{a:{mentality:2},c:4,o:1,flags:[['v30alpha','franchise']]}],['去争冠队，我要戒指','接受角色下降，但进入争冠讨论。',{tr:6,a:{defense:2},flags:[['v30alpha','ring']]}],['再打一年，我看清再决定','保持主动，球队会继续观察你的上限。',{c:2,h:3,flags:[['v30alpha','hold']]}]]},
   {t:'全国直播前，主持人念出了那个旧称呼',scene:'赛前 · 直播连线',speaker:'解说席 / 你的队友',cast:['解说席','队友'],b:'节目回顾“历史上最失败的状元”，你的照片被放在第一个。化妆间里没人敢说话。你握着毛巾，知道自己现在有回应它的资格——这是过去几年从来没有的东西。',stakes:'这条世界线已经走到能被公开比较的位置，接下来要决定的是怎么收尾这个评价。',c:[['打一场让他们改成“曾经”','用比赛改写标签，自信与心态大幅提升。',{c:8,a:{mentality:2},flags:[['v30alpha','rewrite']]}],['不谈过去，只谈这个赛季','保持专注，球队信任继续上升。',{tr:7,h:3,flags:[['v30alpha','focus']]}],['把这篇文章贴在更衣柜上','把羞辱当燃料，逆风值拉满。',{s:14,c:5,flags:[['v30alpha','fuel']]}]]}
  ],
  team:[
   {t:'教练想让你成为所有人都离不开的那个人',scene:'赛季中段 · 录像室',speaker:'主教练',cast:['主教练','内线搭档'],b:'教练把一段只有防守、掩护和补位的集锦放给你看：“这些不会上集锦，但赢球全靠它。”你曾是状元，现在他要你成为那块哪里缺就往哪里补的拼图。这不是降级，是另一种生存方式。',stakes:'决定你在球队里的真正价值来源，也决定你能不能长期留在这个联盟。',c:[['接受。我要成为赢球需要的任何角色','球队信任大涨，角色稳定。',{tr:9,a:{defense:1,rebounding:1},flags:[['v30team','glue']]}],['我愿意补位，但也要保留我的进攻','攻防兼顾，成长更全面但压力更大。',{a:{defense:1,finishing:1},tr:4,c:2,flags:[['v30team','balanced']]}],['我不想只做防守工兵','争取进攻地位，风险是失去现在的信任。',{c:4,tr:-3,a:{shooting:2},flags:[['v30team','demand']]}]]},
   {t:'季后赛里，教练把最难的防守交给你',scene:'季后赛 · 赛前会议',speaker:'主教练 / 当家球星',cast:['主教练','当家球星'],b:'对面最有威胁的得分点交给你。当家球星看着你：“他们不会记得你防得多好，只会记得我们赢没赢。”你忽然明白，这就是你现在最值钱的地方。',stakes:'这轮系列赛会决定外界对你的定位是“角色球员”还是“赢球必需”。',c:[['我接，让他难受四节','防守能力大幅提升，进入防守阵容讨论。',{a:{defense:3,durability:1},tr:6,flags:[['v30team','lockdown']]}],['我接，但我要在进攻端也被信任','攻防两端同时被要求，上限更高。',{a:{defense:2,shooting:2},tr:3,flags:[['v30team','twoWay']]}],['我更想用进攻帮球队','转向进攻路线，防守定位松动。',{a:{shooting:3},tr:-2,c:3,flags:[['v30team','offense']]}]]},
   {t:'一份长约摆在桌上，条款写着“球队文化”',scene:'休赛期 · 合同谈判',speaker:'球队总经理 / 主教练',cast:['球队总经理','主教练'],b:'四年的合同，年薪不算顶，但总经理说得很直白：“我们要的是带队里那群年轻人。”你从被拯救的人，变成了被要求去拯救别人的人。',stakes:'这会决定生涯后段的身份：稳定老将、球队领袖，还是另一次冒险。',c:[['签下去。我想留在这里','长期稳定，进入领袖与老将路线。',{tr:8,a:{mentality:3},flags:[['v30team','leader']]}],['签，但我要球员选项','保留主动权，管理层会更谨慎对待你。',{tr:4,flags:[['v30team','option']]}],['不签，我想试一次自由市场','进入市场，可能有更高上限也可能落空。',{c:4,teamTrade:1,flags:[['v30team','market']]}]]}
  ],
  survivor:[
   {t:'你被摆上货架，但这次你没有慌',scene:'赛季中段 · 交易截止日',speaker:'经纪人 / 球队总经理',cast:['经纪人','球队总经理'],b:'交易流言又来了。几年前，这条消息会让你整夜睡不着；现在你只是把行李收拾好。经纪人问你要不要去争取留下——你知道这次自己无论如何都能找到下一个位置。',stakes:'决定你是留队稳住，还是主动选择一条更舒服的生涯路线。',c:[['留下来。我在这里还有事没做完','稳住角色与信任，继续积累。',{tr:7,h:4,flags:[['v30surv','stay']]}],['让经纪人找一支真正需要我的球队','换到更适合的环境，可能重新起飞。',{a:{mentality:2},tr:-2,flags:[['v30surv','move']]}],['我不表态，看市场怎么报价','保持耐心，把主动权交给时间。',{h:5,c:2,flags:[['v30surv','calm']]}]]},
   {t:'一个更年轻的状元来到你的更衣室',scene:'训练营 · 更衣柜前',speaker:'年轻状元 / 主教练',cast:['年轻状元','主教练'],b:'他也是状元，也被全网嘲过。他在你旁边坐下，很轻地问了一句：“你当年是怎么熬过来的？”你突然发现，自己已经活成了别人想请教的那个人。',stakes:'这决定你生涯后段的价值形态：纯粹的球员，还是会留下来的那种人。',c:[['我把所有踩过的坑都告诉他','成为队内导师，更衣室地位上升。',{a:{mentality:3},tr:7,flags:[['v30surv','mentor']]}],['我只说一句：别听外面的话','专注自身，保持竞技状态。',{a:{mentality:1,durability:2},h:4,flags:[['v30surv','focus']]}],['我还在打，没空当老师','继续以球员身份竞争，角色更纯粹。',{c:4,a:{defense:2},flags:[['v30surv','competitor']]}]]},
   {t:'你第一次认真地考虑：生涯该怎么结束',scene:'深夜 · 客场酒店',speaker:'你自己',cast:['经纪人','家人'],b:'又一次客场，膝盖有点酸，你翻着手机里这些年的数据。你已经比所有人都预测的更久地留在了这里，现在要决定的是：撑到打不动，还是挑一个体面的时间自己走。',stakes:'这会决定这条世界线的终点形状——被淘汰，还是自己写下最后一行。',c:[['我要自己决定什么时候结束','进入生涯收官规划，健康与耐久优先。',{a:{durability:3},h:8,flags:[['v30surv','ownEnd']]}],['能打就打，我不设上限','继续高强度，荣誉上限更高风险也更高。',{c:5,h:-4,flags:[['v30surv','push']]}],['我想在还能打的时候去争一次冠军','转向争冠球队，接受角色下降。',{tr:5,teamTrade:1,flags:[['v30surv','ring']]}]]}
  ]
 },
 oden:{
  push:[
   {t:'医疗组的红线又被你踩到了',scene:'赛季中段 · 医疗室',speaker:'队医 / 主教练',cast:['队医','主教练'],b:'连续健康的这段日子让你几乎忘了过去。报告上的指标已经接近红线，但下一场是全美直播。队医只问了一句：“你要这一场，还是要那五年？”',stakes:'这是奥登主线真正的岔口：走天赋全开，还是走寿命优先。',c:[['我要这一场，也敢要那五年','冒险高强度，但要求更科学的负荷管理。',{a:{finishing:2},h:-4,s:3,flags:[['v30push','measured']]}],['全部拉满，我要证明健康版的自己','天赋彻底释放，身体风险显著上升。',{a:{finishing:3,rebounding:2},h:-9,s:12,c:5,flags:[['v30push','full']]}],['这一次我听医疗组','回到保护路线，健康回升。',{h:10,s:-8,tr:5,flags:[['v30push','back']]}]]},
   {t:'你终于打完了第一个完整赛季',scene:'常规赛收官 · 更衣室',speaker:'主教练 / 老队友',cast:['主教练','老队友'],b:'82 场，你一场没落。老队友拍着你的肩膀说：“你知道吗，对他们来说这很简单，对我们来说这是奇迹。”你笑了，但你也知道，身体记得每一次落地。',stakes:'联盟开始把你当成真正的球员而不是医学案例，接下来是兑现还是保守。',c:[['冲MVP，我要把这段健康用满','最高荣誉路线，健康消耗继续。',{o:1,a:{finishing:2},h:-6,c:5,flags:[['v30push','mvp']]}],['冲DPOY，用防守赢下信任','防守路线，球队依赖度提升。',{a:{defense:3,rebounding:2},tr:6,flags:[['v30push','dpoy']]}],['我要把这个状态留到季后赛','常规赛收着打，为季后赛蓄力。',{h:6,s:-4,tr:3,flags:[['v30push','bank']]}]]},
   {t:'季后赛第七场，教练看着你的分钟表',scene:'总决赛 · 更衣室',speaker:'主教练 / 队医',cast:['主教练','队医'],b:'抢七。教练想让你打满 40 分钟，队医把报告放在他手上不说话。整个球馆都在等一个健康的奥登做他当年没能做到的事。',stakes:'这一场会写进历史，也可能写进你的病历。',c:[['打满。我要这一场','全力抢七，历史地位与伤病风险同时拉满。',{c:9,h:-9,s:10,flags:[['v30push','game7']]}],['按计划 32 分钟，把最后一节留给队友','理性分担，球队整体更稳。',{tr:6,a:{mentality:2},h:2,flags:[['v30push','share']]}],['最后一节我上，前面交给替补','保留体能打决胜时刻，赌一次。',{c:5,h:-4,flags:[['v30push','clutch']]}]]}
  ],
  protect:[
   {t:'你把“健康”变成了自己的球风',scene:'赛季中段 · 训练馆',speaker:'运动医学主管',cast:['运动医学主管','主教练'],b:'你不再靠爆发力打球了。位置感、时机、落地方式——你把自己改造成了一个几乎不会受伤的版本。队医说：“这是我见过最聪明的自我改造。”',stakes:'这决定你是短暂的天赋，还是能持续十年的支撑。',c:[['继续。我要打十年','耐久大幅提升，进入长寿路线。',{a:{durability:4},h:9,s:-8,flags:[['v30prot','longevity']]}],['我还是要保留一点爆发力','平衡路线，技术与身体兼顾。',{a:{durability:2,finishing:2},h:4,flags:[['v30prot','balance']]}],['我想让球队别再限制我','争取更大自由，风险回升。',{c:4,s:6,flags:[['v30prot','free']]}]]},
   {t:'球队想给你一份长约，理由很现实',scene:'休赛期 · 总经理办公室',speaker:'球队总经理',cast:['球队总经理','经纪人'],b:'“我们知道你不会每场 30 分，但我们知道你能打。”总经理把长约推过来。这句话在别人听来是退步，在你听来，是你用四年换来的东西。',stakes:'长期保障会固定你的角色，也会固定这条世界线的形状。',c:[['签。我要在这里把生涯走完','长期稳定，队史地位路线开启。',{tr:9,a:{durability:2},flags:[['v30prot','franchise']]}],['签短约，保留选择权','保持机动，球队会更谨慎使用你。',{tr:4,c:2,flags:[['v30prot','short']]}],['我想去一支能争冠的球队','转向争冠，接受角色压缩。',{teamTrade:1,tr:2,flags:[['v30prot','contend']]}]]},
   {t:'一个年轻人的膝盖，和你当年一样',scene:'训练营 · 理疗室',speaker:'年轻内线 / 队医',cast:['年轻内线','队医'],b:'新秀中锋的核磁结果不好看。他坐在理疗床上，眼神和你当年一模一样。你知道那种“我可能废了”的恐惧，因为你就是从那里面爬出来的人。',stakes:'你会成为那条路的答案，还是只是另一个活下来的个例。',c:[['我把我的整套训练计划给他','成为队内精神支柱，历史评价提升。',{a:{mentality:3},tr:8,flags:[['v30prot','mentor']]}],['我带他一起复健','重建过程互相支撑，健康与信任双升。',{h:6,tr:5,flags:[['v30prot','partner']]}],['我自己的状态更重要','专注自身，保持竞技水平。',{a:{durability:2},h:3,flags:[['v30prot','selfish']]}]]}
  ],
  elsewhere:[
   {t:'离开波特兰的第一次媒体日',scene:'新球队 · 媒体日',speaker:'新队友 / 当地记者',cast:['新队友','当地记者'],b:'记者问：“你会不会永远是那个没能健康过的状元？”新队友在旁边接过话：“他现在是我们的人。”你第一次觉得，离开不是背叛，是重新开始。',stakes:'换个环境会改写叙事，但也会失去原本的球队地位。',c:[['我要在这里重新证明自己','全面重置状态，上限打开。',{c:5,tr:4,a:{mentality:2},flags:[['v30else','reboot']]}],['我只想安静地打好球','稳定角色，健康优先。',{h:6,tr:6,flags:[['v30else','quiet']]}],['我要把旧球队当成目标','带着情绪打球，对抗性提升。',{c:4,s:8,a:{defense:2},flags:[['v30else','revenge']]}]]},
   {t:'新球队把防守体系建在你身上',scene:'赛季中段 · 录像室',speaker:'主教练',cast:['主教练','防守助教'],b:'教练指着战术板：“这套体系只有一个人能撑起来。”所有人看向你。你在波特兰从来没被这样依赖过——不是因为你不能，而是因为他们不敢。',stakes:'决定你在新环境里是核心还是替补。',c:[['我来撑。这是我要的位置','防守核心路线，球队地位大幅提升。',{a:{defense:3,rebounding:2},tr:8,flags:[['v30else','anchor']]}],['我可以撑，但要控制出场时间','兼顾健康，体系仍以你为基础。',{a:{defense:2,durability:2},h:5,tr:4,flags:[['v30else','bounded']]}],['让别人来，我更想专注进攻','转向进攻路线，防守依赖下降。',{a:{finishing:3},tr:-2,c:3,flags:[['v30else','offense']]}]]},
   {t:'季后赛面对老东家',scene:'季后赛 · 球员通道',speaker:'旧队友 / 你自己',cast:['旧队友','主教练'],b:'对面就是你被放弃的地方。旧队友走过来拥抱你：“不管怎样，我们都希望你赢。”你点点头，然后走进那片曾经为你叹息过的球馆。',stakes:'这轮系列赛会决定这条换队世界线的最终评价。',c:[['我要赢，而且我要打爆对面','全力输出，荣誉与情绪同时拉满。',{c:7,a:{finishing:2},o:1,flags:[['v30else','statement']]}],['我只想赢，数据不重要','团队优先，信任与评价提升。',{tr:8,a:{defense:2},flags:[['v30else','team']]}],['无论结果，我想在赛后去见他们','格局打开，生涯收尾更完整。',{a:{mentality:4},tr:5,c:3,flags:[['v30else','grace']]}]]}
  ]
 },
 kwame:{
  anchor:[
   {t:'录像室里，你把一个回合倒放了六遍',scene:'赛季中段 · 录像室',speaker:'内线教练',cast:['内线教练','球队主教练'],b:'那个回合里你先换防，再保护篮板，最后跑到前场做掩护，却一次球都没碰。教练暂停画面：“所有人都在看得分，但这才是我能靠的东西。”十九岁被推上状元位置的那一年，没有人告诉过你这件事。',stakes:'这会决定你是被记住的防守支柱，还是又被当成失败的高顺位。',c:[['我接受。防守和篮板就是我的位置','防守与篮板大幅成长。',{a:{defense:3,rebounding:2},tr:6,flags:[['v30anchor','accept']]}],['我接受，但我也要低位机会','防守为底，同时争取进攻权重。',{a:{defense:2,finishing:2},tr:3,flags:[['v30anchor','both']]}],['我不想被定义成蓝领','争取进攻地位，风险是与教练理念冲突。',{c:4,tr:-3,flags:[['v30anchor','refuse']]}]]},
   {t:'第一次有人叫你“球队的定海神针”',scene:'赛前 · 更衣室',speaker:'当家球星',cast:['当家球星','主教练'],b:'当家球星在采访里说：“有他在，我们才敢往前压。”你听见的时候正在系鞋带。你想起那个被全国嘲笑的十九岁，忽然发现那已经是很久以前的人了。',stakes:'你是否成为球队长期计划的一部分，就在这一步。',c:[['继续做这块基石','防守荣誉路线，进入最佳防阵讨论。',{a:{defense:3,mentality:2},tr:7,flags:[['v30anchor','bedrock']]}],['我想顺便把进攻练出来','攻防双线成长，全面但更慢。',{a:{defense:1,finishing:2,shooting:1},h:-2,flags:[['v30anchor','develop']]}],['我更想成为年轻人愿意请教的人','领袖路线，更衣室地位上升。',{a:{mentality:3},tr:8,flags:[['v30anchor','leader']]}]]},
   {t:'一份养老合同，和一个真正的问题',scene:'休赛期 · 总经理办公室',speaker:'球队总经理',cast:['球队总经理','经纪人'],b:'“三到四年，薪水不高，但你是我们想把年轻人交给的那个人。”总经理说。你已经是联盟里待得比大多数状元都久的人了——只是你从来没这么算过。',stakes:'这会决定生涯尾巴是平稳落地还是继续冒险。',c:[['签。我要在这里结束生涯','长期稳定，成为球队文化一部分。',{tr:9,a:{mentality:3},flags:[['v30anchor','dynasty']]}],['签两年，之后再看','保留主动，管理更灵活。',{tr:5,a:{durability:2},flags:[['v30anchor','flex']]}],['去争一次冠军','转向争冠球队，接受角色下降。',{teamTrade:1,tr:2,flags:[['v30anchor','ring']]}]]}
  ],
  offense:[
   {t:'低位第一球，教练把战术画给你',scene:'赛季中段 · 暂停',speaker:'主教练 / 当家后卫',cast:['主教练','当家后卫'],b:'“给他们看看你的低位。”战术板上的箭头全部指向篮下。你在高中是王者，在 NBA 这张图上，第一次有人把那个版本的你画进去。',stakes:'进攻路线真正开始，得分上限和防守责任同时变化。',c:[['给我低位，我要硬吃','低位与终结大幅成长。',{a:{finishing:3,rebounding:2},c:5,flags:[['v30off','post']]}],['给我低位，但我也会传出来','内外结合，助攻与信任提升。',{a:{finishing:2,playmaking:2},tr:5,flags:[['v30off','inside_out']]}],['先别急，我怕破坏球队节奏','保持现角色，信任优先。',{tr:7,h:3,flags:[['v30off','patient']]}]]},
   {t:'一次 30 分，把过去的嘲笑打了回去',scene:'赛后 · 更衣室',speaker:'队友 / 记者',cast:['队友','记者'],b:'数据牌上写着你的名字和 30 分。记者问：“有人说你不该是状元，你怎么看？”你看着数据，忽然发现这句话已经没有几年前那么疼了。',stakes:'这是进攻路线的证明时刻，会直接影响荣誉与合同谈判。',c:[['我要一直这样打下去','进攻路线确定，进入得分手标签。',{a:{finishing:2,shooting:2},c:4,o:1,flags:[['v30off','scorer']]}],['这只是开始，我还要更全面','全面成长，攻防兼顾。',{a:{finishing:1,defense:1,playmaking:1},tr:4,flags:[['v30off','allround']]}],['我更在乎赢球','接受角色调整，信任优先。',{tr:8,a:{mentality:2},flags:[['v30off','win']]}]]},
   {t:'合同年：你要数据，还是要位置',scene:'赛季中段 · 经纪人电话',speaker:'经纪人',cast:['经纪人','球队总经理'],b:'经纪人说得很直：“如果这季你把数据打出来，下一份合同会完全不同。”但教练昨天刚说过：球队需要你多做一些不上数据的事。',stakes:'这次选择直接决定生涯后段是顶薪还是稳定角色。',c:[['把数据打出来，合同优先','个人数据提升，球队信任下降。',{a:{finishing:2,shooting:2},c:5,tr:-4,flags:[['v30off','numbers']]}],['按教练要求做，赢球优先','信任大涨，稳定路线。',{tr:10,a:{defense:2},flags:[['v30off','teamFirst']]}],['两者我都要','难度最高，全面成长。',{a:{finishing:1,defense:1},c:3,tr:3,h:-3,flags:[['v30off','both']]}]]}
  ],
  elder:[
   {t:'一个十九岁的乐透秀问你：怎么活下来',scene:'训练营 · 更衣室',speaker:'年轻乐透秀',cast:['年轻乐透秀','主教练'],b:'他坐在你旁边，声音很低：“网上都说我是水货。”你看着他，就像看到十几年前那个被 Michael Jordan 当着全队骂的自己。',stakes:'这会决定你生涯后段的价值是数据，还是影响力。',c:[['我把所有经验都给他','导师路线开启，更衣室地位稳固。',{a:{mentality:3},tr:8,flags:[['v30elder','mentor']]}],['我陪他一起加练','以身作则，健康与信任双升。',{h:5,tr:6,flags:[['v30elder','partner']]}],['我只想专注自己','保持竞技，影响力有限。',{a:{defense:2},c:3,flags:[['v30elder','self']]}]]},
   {t:'教练组要你退到替补，把时间给年轻人',scene:'赛季前 · 教练办公室',speaker:'主教练',cast:['主教练','球队总经理'],b:'“我们需要你在第二阵容里当那个稳定的人。”这句话可以是结束，也可以是转换。你比谁都清楚，当年没有人愿意给你这种体面。',stakes:'这是角色转型的关键节点，直接影响生涯长度。',c:[['我接受。我要把第二阵容带起来','老将续航路线，生涯拉长。',{a:{mentality:3,durability:2},tr:8,h:5,flags:[['v30elder','benchLeader']]}],['我不接受，我还能首发','维持竞技要求，风险与尊严并存。',{c:5,tr:-4,flags:[['v30elder','starter']]}],['给我助教身份，我边打边学','提前规划退役后，评价更完整。',{a:{mentality:2},tr:6,flags:[['v30elder','coachTrack']]}]]},
   {t:'退役巡演的第一站，球馆为你起立',scene:'客场 · 赛前入场',speaker:'全场观众 / 旧队友',cast:['旧队友','主教练'],b:'你走进球馆，全场起立。十几年前，同一个联盟用嘲笑迎接你。你在掌声里想起那个十九岁、什么都不懂、被所有人要求立刻成功的自己。',stakes:'这条世界线的结尾形状，在这里开始固定。',c:[['我想再打两年，好好告别','延长生涯，完整收尾。',{a:{durability:3},h:7,tr:5,flags:[['v30elder','goodbye']]}],['这季结束就退役，我已经够了','主动收尾，结局评价提升。',{a:{mentality:3},c:4,flags:[['v30elder','ownEnd']]}],['我还想再争一次冠军','转向争冠，最后一搏。',{teamTrade:1,tr:2,flags:[['v30elder','lastRing']]}]]}
  ]
 },
 fultz:{
  shooter:[
   {t:'投篮动作终于定型，你第一次不再想它',scene:'赛季中段 · 训练馆',speaker:'投篮教练',cast:['投篮教练','主教练'],b:'连续第 20 天，你的出手姿势没有变过。投篮教练说：“你知道最奇怪的是什么吗？你现在投得像一个普通人。”这句话你等了太久。',stakes:'这是从“修复投篮”走向“用投篮赢球”的分界线。',c:[['把它变成武器，我要大量出手','投射大幅成长，进入射手路线。',{a:{shooting:3},s:8,c:4,flags:[['v30shoot','weapon']]}],['稳着来，先保证不出问题','稳定优先，健康与自信回升。',{s:10,c:3,h:4,flags:[['v30shoot','steady']]}],['我要加练持球投','难度最高，上限也最高。',{a:{shooting:2,playmaking:2},s:4,flags:[['v30shoot','pullup']]}]]},
   {t:'关键时刻，教练第一次把球给你',scene:'比赛最后两分钟 · 暂停',speaker:'主教练 / 当家球星',cast:['主教练','当家球星'],b:'当家球星把球递到你手里：“他们不敢放你了，现在轮到你来决定。”你握着球，肩膀没有像几年前那样提醒你它的存在。',stakes:'这会决定你在球队的真实定位与关键球信任。',c:[['我来投，我一直等这一刻','关键球路线，自信大幅提升。',{c:8,tr:5,flags:[['v30shoot','clutch']]}],['我来投，但我先找最好的机会','组织与投射兼顾。',{a:{playmaking:2,shooting:1},tr:6,flags:[['v30shoot','smart']]}],['让队友来，我更相信他们','团队路线，更衣室关系上升。',{tr:8,a:{mentality:2},flags:[['v30shoot','team']]}]]},
   {t:'一份合同，上面写着“空间型后卫”',scene:'休赛期 · 总经理办公室',speaker:'球队总经理',cast:['球队总经理','经纪人'],b:'“我们要的就是那种能被放空也不会犹豫的人。”总经理说。几年前，所有人讨论的是你的肩膀还能不能投篮；现在他们讨论的是你能投多少个。',stakes:'这会固定你的生涯标签与最终评价。',c:[['签下去，我要做这个角色','稳定射手路线，荣誉与合同双升。',{a:{shooting:2},tr:7,flags:[['v30shoot','specialist']]}],['签，但我要更多球权','争取更大角色，风险与上限并存。',{c:5,tr:-2,flags:[['v30shoot','biggerRole']]}],['我想去一支真正需要我的球队','换队开启新阶段。',{teamTrade:1,tr:2,flags:[['v30shoot','move']]}]]}
  ],
  floor:[
   {t:'你决定不再把自己当成一个病人',scene:'赛季中段 · 训练馆',speaker:'主教练',cast:['主教练','队友'],b:'你不再每次出手都先想肩膀。教练看到了变化：“你现在打球的样子，像一个控卫，而不是一个康复中的案例。”',stakes:'组织路线正式打开，你的价值来源发生转移。',c:[['我要成为球队的组织核心','组织大幅成长，球队体系向你倾斜。',{a:{playmaking:3},tr:8,flags:[['v30floor','engine']]}],['组织为主，但也保留得分威胁','平衡路线，全面成长。',{a:{playmaking:2,shooting:1},tr:4,flags:[['v30floor','balanced']]}],['我还是想以得分为先','回到得分路线，组织成长放缓。',{a:{shooting:2},c:4,flags:[['v30floor','score']]}]]},
   {t:'一次 12 助攻的比赛，你终于笑了',scene:'赛后 · 球员通道',speaker:'队友',cast:['队友','主教练'],b:'数据牌上是 12 次助攻。队友撞了你一下：“你今晚像个开了天眼的控卫。”你笑了，很久没这么笑过。',stakes:'这决定你在联盟里的标签与长期角色。',c:[['我要一直做那个把所有人串起来的人','组织核心定位，助攻与信任持续上升。',{a:{playmaking:2,mentality:2},tr:8,flags:[['v30floor','conductor']]}],['我还能得分，我不想被定型','双能卫路线，攻防兼顾。',{a:{playmaking:1,shooting:2},c:3,flags:[['v30floor','combo']]}],['我更想赢球，角色随便','团队优先，评价稳定上升。',{tr:9,a:{defense:2},flags:[['v30floor','teamFirst']]}]]},
   {t:'旧球队想让你回去，说是“回家”',scene:'休赛期 · 经纪人电话',speaker:'经纪人 / 旧球队总经理',cast:['经纪人','旧球队总经理'],b:'那支你曾经背上所有期待与怀疑的球队，现在说要你回去当领袖。“这次不一样了。”经纪人说。你知道那意味着什么——也意味着你要重新面对那个最难受的自己。',stakes:'这是叙事闭合的关键选择，会影响最终结局。',c:[['回去。我要亲手把它写完','叙事闭合路线，最终评价加成。',{a:{mentality:3},tr:6,c:3,flags:[['v30floor','return']]}],['不回去，我要留在现在的地方','保持现状，稳定路线。',{tr:7,h:4,flags:[['v30floor','stay']]}],['去第三支球队，重新开始','再次重启，上限打开。',{teamTrade:1,c:4,flags:[['v30floor','fresh']]}]]}
  ],
  warrior:[
   {t:'医生说要停，你问的是“停多久”',scene:'赛季中段 · 医疗室',speaker:'队医 / 主教练',cast:['队医','主教练'],b:'肩膀和膝盖同时给出警告。队医说：“至少六周。”你问：“能压缩到三周吗？”他看了你很久，然后说：“你总是这样。”',stakes:'这是带伤证明路线的核心抉择：身体换地位。',c:[['三周。我要回去打','冒险复出，竞技状态与风险同时上升。',{c:6,h:-8,tr:4,flags:[['v30war','rush']]}],['听医生的，六周','完整康复，健康回升但失去位置。',{h:10,tr:-3,flags:[['v30war','heal']]}],['打封闭，撑完这个赛季','极限路线，短期上限最高。',{c:7,h:-12,s:5,flags:[['v30war','shot']]}]]},
   {t:'带伤上场，你打出了赛季最佳一战',scene:'赛后 · 更衣室',speaker:'主教练 / 队友',cast:['主教练','队友'],b:'膝盖上绑着冰袋，数据牌上是你赛季最好的表现。队医什么都没说，只是把冰袋又加了两个。主教练走过来，只说了一句：“你让我很难反对你。”',stakes:'荣誉和身体的账同时被记下。',c:[['我要继续这样打，荣誉值得','继续高强度，冲个人荣誉。',{a:{shooting:2},o:1,h:-6,c:5,flags:[['v30war','honor']]}],['我要开始控制出场','转向保护，延长生涯。',{a:{durability:3},h:8,s:-5,flags:[['v30war','protect']]}],['我要让球队给我更好的医疗保障','争取资源，健康与信任双升。',{h:5,tr:6,flags:[['v30war','support']]}]]},
   {t:'生涯最后一次进场，全场喊你的名字',scene:'客场 · 入场仪式',speaker:'全场观众 / 你自己',cast:['主教练','队友'],b:'你走进球馆，观众喊你的名字。你想起那个被慢放无数次罚球的夜晚，想起所有人都在讨论你的肩膀。现在他们喊的是你的名字，而不是你的伤。',stakes:'这条世界线的收尾方式在这里决定。',c:[['我想再拼一年，把这个故事写完','延长生涯，完整收尾。',{a:{mentality:3},h:5,tr:5,flags:[['v30war','oneMore']]}],['这季结束，我想带着尊重离开','主动收尾，结局评价提升。',{a:{mentality:4},c:4,flags:[['v30war','ownEnd']]}],['去争一次冠军，我想要戒指','转向争冠，最后一搏。',{teamTrade:1,tr:2,flags:[['v30war','ring']]}]]}
  ]
 },
 simmons:{
  shoot:[
   {t:'对手第三次放你两米，你终于抬手',scene:'赛季中段 · 比赛第二节',speaker:'主教练 / 当家球星',cast:['主教练','当家球星'],b:'防守者退到罚球线以下，全场都在等你犹豫。你想起那年季后赛篮下那个回合——这一次你抬手了，球进了。替补席全体站起来。',stakes:'这是你生涯最被讨论的短板的正面答案，会改写所有评价。',c:[['继续投，我不再躲这个问题','投射与出手欲望大幅提升。',{a:{shooting:3},s:9,c:5,flags:[['v30shoot','commit']]}],['空位投，其他时候我还是突破','平衡路线，投射稳定成长。',{a:{shooting:2,finishing:1},s:4,flags:[['v30shoot','balanced']]}],['这只是运气，我还是以组织为主','回到组织路线，投射成长放缓。',{a:{playmaking:2},tr:5,flags:[['v30shoot','pass']]}]]},
   {t:'季后赛第七场，还是同一个问题',scene:'季后赛 · 抢七赛前',speaker:'主教练 / 对手主帅',cast:['主教练','对手主帅'],b:'对手主帅在采访里说：“我们的策略不变，我们会放他投。”全联盟都在等你的回答。这一次你手里有的，不只是天赋。',stakes:'这会写进你的生涯定义，也可能成为最终结局的分水岭。',c:[['我要投，四个都投','关键球投射路线，结局倾向改写。',{a:{shooting:2},c:8,s:8,flags:[['v30shoot','game7']]}],['我投，但我先打内线制造杀伤','攻框为主，投射为辅。',{a:{finishing:3},c:5,flags:[['v30shoot','attack']]}],['我用组织解决，让队友来终结','组织路线，信任提升。',{a:{playmaking:3},tr:7,flags:[['v30shoot','create']]}]]},
   {t:'一个年轻后卫来问你：被放投是什么感觉',scene:'训练营 · 更衣室',speaker:'年轻后卫 / 主教练',cast:['年轻后卫','主教练'],b:'他看着你，眼神里全是恐惧：“如果他们一直放我投怎么办？”你曾经是那个被全网讨论的人，现在你成了能回答这个问题的人。',stakes:'这决定你的生涯最终价值形态。',c:[['我陪他把这个短板练掉','导师路线，评价完整度提升。',{a:{mentality:3},tr:8,flags:[['v30shoot','mentor']]}],['我告诉他：你必须自己面对','传递经验，更衣室尊重上升。',{a:{mentality:2},tr:6,flags:[['v30shoot','advice']]}],['我只想专注自己剩下的生涯','保持竞技，影响力有限。',{a:{shooting:1},c:4,flags:[['v30shoot','self']]}]]}
  ],
  engine:[
   {t:'教练把战术体系改成“你拿球”',scene:'赛季中段 · 录像室',speaker:'主教练',cast:['主教练','当家球星'],b:'教练不再要求你投篮，而是把整个进攻组织的责任交给你。“你不投三分也没关系，但你要让所有人都在对的位置。”这是第一次，你的“缺点”被体系真正接住。',stakes:'组织中锋路线正式成立，你的定位被彻底改写。',c:[['我接。让我来组织一切','组织与防守大幅成长，体系核心。',{a:{playmaking:3,defense:2},tr:9,flags:[['v30engine','hub']]}],['我可以组织，但也想练出投射','双线发展，成长更慢但更全面。',{a:{playmaking:2,shooting:1},h:-2,flags:[['v30engine','both']]}],['我更想成为防守端的答案','防守王牌路线。',{a:{defense:3,rebounding:2},tr:7,flags:[['v30engine','defense']]}]]},
   {t:'你是联盟里最特别的球员，也是最被争论的',scene:'赛季中段 · 电视节目',speaker:'解说席 / 主教练',cast:['解说席','主教练'],b:'节目在争论：一个不投篮的球员能不能夺冠。教练关掉电视：“他们会一直吵，直到你赢。”',stakes:'这会决定你是被体系定义，还是定义一种新的体系。',c:[['我要赢，赢到他们无话可说','争冠路线，团队荣誉上限提升。',{tr:8,a:{defense:2,playmaking:1},flags:[['v30engine','ring']]}],['我要进化成没法被质疑的版本','继续开发投射，风险与上限并存。',{a:{shooting:3},s:6,c:4,flags:[['v30engine','evolve']]}],['我不在乎他们怎么说','专注比赛，稳定成长。',{a:{mentality:3},h:3,flags:[['v30engine','focus']]}]]},
   {t:'球队要不要为了你重建阵容',scene:'休赛期 · 管理层会议',speaker:'球队总经理 / 主教练',cast:['球队总经理','主教练'],b:'总经理把两套阵容方案摊开：一套围绕你的组织能力补充射手，另一套把你交易出去换一个传统核心。所有人的目光都在你身上。',stakes:'这是这条世界线里最关键的一次地位确认。',c:[['围绕我建队，我会证明这条路能赢','球队围绕你重建，地位最高。',{tr:10,a:{playmaking:2},c:4,flags:[['v30engine','cornerstone']]}],['如果交易对球队更好，我接受','职业态度受认可，但地位下降。',{tr:-4,a:{mentality:3},flags:[['v30engine','acceptTrade']]}],['我想去一支已经能争冠的球队','加入强队，争冠路线。',{teamTrade:1,tr:3,flags:[['v30engine','contender']]}]]}
  ],
  reset:[
   {t:'离开费城之后，你第一次被当普通人对待',scene:'新球队 · 媒体日',speaker:'新队友',cast:['新队友','主教练'],b:'没有记者追问你的投篮，没有分析你的心理。新队友只是拍了拍你：“来打球就行。”你突然发现，那几年压在你身上的东西，有一半来自那座城市。',stakes:'重启会改写你的心理状态，也会重排你的能力优先级。',c:[['我要在这里从头开始','全面重置，上限重新打开。',{c:6,a:{mentality:2},tr:4,flags:[['v30reset','fresh']]}],['我想先把防守和组织做到最好','功能路线，角色稳定。',{a:{defense:2,playmaking:2},tr:6,flags:[['v30reset','function']]}],['我要证明当初交易我是错的','复仇路线，对抗性拉满。',{c:5,s:8,a:{finishing:2},flags:[['v30reset','revenge']]}]]},
   {t:'新体系不需要你成为别人',scene:'赛季中段 · 训练馆',speaker:'主教练',cast:['主教练','当家球星'],b:'教练说得很清楚：“我不要你变成射手。我要你把我们能赢球的那部分做到极致。”你第一次被告知：做你自己是可以的。',stakes:'这决定你的生涯第二段会以什么方式成功。',c:[['那我就把自己最强的一面拉到极限','专项能力大幅成长。',{a:{playmaking:3,defense:2},o:1,flags:[['v30reset','maxOut']]}],['我想补上短板，哪怕慢一点','均衡成长，长期收益更高。',{a:{shooting:2,mentality:1},h:-2,flags:[['v30reset','patch']]}],['我更想成为球队真正的领袖','领袖路线，信任大幅提升。',{a:{mentality:3},tr:9,flags:[['v30reset','leader']]}]]},
   {t:'季后赛又遇到费城',scene:'季后赛 · 赛前',speaker:'旧队友 / 你自己',cast:['旧队友','主教练'],b:'对面是你被交易、被质疑、被反复讨论的地方。旧队友走过来抱了你一下：“不管发生什么，我们都希望你过得好。”你点点头，走向那片你曾经最熟悉也最难受的场地。',stakes:'这是这条世界线的收束点，直接决定最终结局倾向。',c:[['我要赢，我要打爆他们','全力输出，叙事闭合。',{c:8,a:{finishing:2,defense:1},o:1,flags:[['v30reset','statement']]}],['我只想安安静静地赢','团队优先，评价稳定上升。',{tr:9,a:{mentality:2},flags:[['v30reset','calm']]}],['赛后我要去和他们握手，我放下了','格局路线，结局评价最高。',{a:{mentality:4},tr:6,c:4,flags:[['v30reset','peace']]}]]}
  ]
 }
};


/* ---------- 生涯后段弧线 · 5 个阶段，走完即自然退役 ---------- */
const V30_LATE_STAGES=[
 {k:'contend',zh:'争冠窗口'},
 {k:'twilight',zh:'生涯暮年'},
 {k:'lastdance',zh:'最后一舞'},
 {k:'decision',zh:'退役抉择'},
 {k:'farewell',zh:'告别赛季'}
];
const V30_LATE={
 bennett:{contend:['你终于成了争冠球队需要的那个人','一支真正的争冠球队找上门。他们不缺天赋，缺的是你这些年才练出来的东西：稳定、防守、和关键时刻不慌。当年没有人相信你能留在联盟，现在有人为了冠军来找你。','这可能是你生涯第一次真正接近冠军。'],
  twilight:['你第一次在球队名单上看到“老将”两个字','新赛季的名单里，你是年龄最大的那个。训练营第一天，年轻球员围着你要签名。你的身体还是当年的身体，但恢复需要的时间明显变长了。','生涯开始进入倒计时，接下来每一年都要算着用。'],
  lastdance:['你想清楚了：这是最后一舞','你给自己定了期限。不是为了数据，也不是为了合同，而是想在还能打的时候，把这段故事收在自己手里，而不是被别人决定。','这赛季的每一场都会被记住。'],
  decision:['休赛期：继续打，还是把球衣叠好','经纪人把两份东西放在你面前：一份一年合同，和一张退役申请。他说：“这次没有人替你决定。”你想起了那个被全场嘲笑的第一个人，也想起了这些年自己怎么把他救回来。','这决定这条世界线的最后一行怎么写。'],
  farewell:['最后一个主场，球馆为你起立','记分牌不再重要。观众站起来，队友把球交到你手里。你抬头看到当年那些写满嘲笑的标题，它们已经变成了历史资料里的一页。','这条世界线要收尾了。']},
 oden:{contend:['一支争冠球队愿意为“健康的你”赌一次','他们看过你所有病历，还是把合同递了过来。总经理说：“我们赌的不是天赋，是你这十年学会的那套东西。”','这可能是你生涯唯一一次真正的冠军机会。'],
  twilight:['你的膝盖开始提前告诉你答案','不用队医说，你自己知道：连续出战变得困难了。你比任何人都清楚这意味着什么，你已经和这个身体谈判了太多年。','接下来每一次出场都要算清楚代价。'],
  lastdance:['你决定给身体一个体面的结束','你不想再让它替你做决定了。你给自己定了一个赛季，一个可以说再见的长度。','这一次，是你自己选择什么时候停。'],
  decision:['队医把最后一份报告放在你面前','报告没有坏消息，但也没有好消息。队医说：“你还能打，但每一年都会更贵。”你看着窗外的球馆，想起第一次被抬下场的那一年。','这决定你的故事怎么结束。'],
  farewell:['最后一次走进那片曾经让你倒下的球馆','你站在球员通道，膝盖没有疼。你想起了所有“如果健康”的假设，然后发现，你已经不用再假设了。','这条世界线要在这里收尾。']},
 kwame:{contend:['争冠球队要你当那块冠军拼图','他们不要你的得分，要你的防守、篮板和更衣室里的声音。十九岁那年没人告诉过你，这些东西会是你最值钱的部分。','这可能是你生涯最好的夺冠机会。'],
  twilight:['你成了队里最老的那个人','年轻人在训练里向你请教怎么顶住压力。你想起 Michael Jordan 当着全队骂你的那个下午，忽然觉得那已经是别人的故事了。','生涯进入最后阶段，你开始想留下什么。'],
  lastdance:['你决定用一年时间好好告别','不是为了冠军，也不是为了合同。你想完整地走完一个赛季，然后自己合上这本档案。','这一年，你会被记住。'],
  decision:['球队问你要不要留下做教练','总经理说得很客气：球员合同和助教位置，你选一个。你十九岁进联盟时什么都没准备好，现在你已经能教别人怎么准备了。','这决定你以什么身份结束。'],
  farewell:['最后一个主场，全场喊你的名字','十几年前，同一个联盟用嘲笑迎接你。现在他们站起来，为一个打了这么多年的老将鼓掌。','这条世界线要收尾了。']},
 fultz:{contend:['一支争冠球队要你当最后的拼图','他们要的是你的组织、防守，和那手终于稳定的投篮。当年所有人都在讨论你的肩膀，现在教练在讨论怎么把你放进关键回合。','这可能离冠军最近的一次。'],
  twilight:['肩膀和膝盖同时提醒你时间到了','你已经比所有人预测的多打了很久。但每天早上醒来，身体都在重新算账。','生涯进入后段，你开始想怎么结束。'],
  lastdance:['你想用一个完整赛季说再见','不是为了证明什么。你只是想在还能投进球的时候，把那个曾经陌生的动作，变成最后一年的日常。','这一年属于你自己。'],
  decision:['经纪人问你：还要继续吗','他给了你两个选项，也都给了理由。你想起了新秀年那个连罚球都被慢放的自己，忽然发现，你已经很久没有害怕过出手了。','这决定你的故事怎么写最后一行。'],
  farewell:['最后一个主场，你投进最后一球','球进的时候没有人惊讶，因为所有人都知道你练了多少年。你抬头看记分牌，那个曾经让你恐惧的动作，现在是你最平常的样子。','这条世界线要收尾了。']},
 simmons:{contend:['争冠球队要你当最后一块拼图','他们要的是你的组织、防守和推进。教练说得很直接：“我们不需要你变成射手，我们需要你让所有人变好。”','这可能是你生涯唯一的冠军窗口。'],
  twilight:['运动能力开始给答案','你知道自己的第一步不再那么快了。你打了这么多年，第一次要认真考虑：当身体不再是优势，你还剩什么。','生涯进入后段，该决定怎么收尾。'],
  lastdance:['你想用一个赛季，给争论画上句号','所有人都在讨论你到底能不能夺冠。你不想再解释了，你想用一年时间把答案写出来。','这一年会定义你。'],
  decision:['球队问你要不要留到退役','他们愿意给你一年合同，也愿意在你退役后留个位置。你想起那个被放两米的夜晚，和后来自己做的每一个选择。','这决定你以什么方式结束。'],
  farewell:['最后一个主场，全场为你起立','你走进球馆，听见观众喊你的名字。曾经他们讨论的是你不会投篮，现在他们讨论的是你留下的东西。','这条世界线要收尾了。']}
};

/* 后加球星的通用后段弧线：没有单独写 5 段文案时，用同一套阶段骨架带入真实处境。
   这样锡安/维金斯/里萨谢/沃尔/格里芬也能走到“退役抉择 → 告别赛季”，而不是永远没有结局。 */
const V30_GENERIC_LATE={
 contend:['一支争冠球队来找你','他们不缺天赋，缺的是你这些年才学会的东西：稳定、防守、关键时刻不慌。','这可能是你生涯最后一次真正的争冠窗口。'],
 twilight:['身体开始提醒你时间','恢复变慢了，连续出战需要更长的代价。你知道自己还能打，但每一年都要算着用。','生涯进入后段，你开始想怎么收尾。'],
 lastdance:['你决定给自己一个期限','不是为了数据，也不是合同。你想在还能打的时候，把这段故事收在自己手里。','这一年会被记住。'],
 decision:['继续打，还是自己合上档案','经纪人把合同和退役申请放在你面前。他说：“这次没有人替你决定。”','这决定这条世界线最后一行怎么写。'],
 farewell:['最后一个主场，球馆为你起立','记分牌不再重要。观众站起来，队友把球交到你手里。那些旧标题已经变成历史资料里的一页。','这条世界线要收尾了。']
};

function v30NextLateStage(){
  v30Init();
  let p=v30P(),used=career.v30.usedKeys;
  for(let i=0;i<V30_LATE_STAGES.length;i++){
    let key=`late:${p}:${V30_LATE_STAGES[i].k}`;
    if(!used[key])return{key,stage:V30_LATE_STAGES[i],i};
  }
  return null;
}
/* 文案带入真实处境：所以每一季读起来都不同，不是同一段重播 */
function v30LateContext(){
  let h=career.honors||{},honors=[];
  if(h['总冠军'])honors.push(`${h['总冠军']} 次总冠军`);
  if(h['MVP'])honors.push(`${h['MVP']} 次 MVP`);
  if(h['全明星'])honors.push(`${h['全明星']} 次全明星`);
  if(h['最佳阵尚']){}
  if(h['最佳阵容'])honors.push(`${h['最佳阵容']} 次最佳阵容`);
  return{
    age:career.age,seasons:career.careerTotals?.seasons||career.seasonNo,
    team:teamBy(career.team).name,ovr:career.ovr,route:v30RouteLabel(v30TopRoute()),
    honorText:honors.length?honors.join('、'):'暂时还没有拿得出手的硬荣誉'
  };
}
function v30BuildLateEvent(found){
  let p=v30P(),tpl=(V30_LATE[p]||{})[found.stage.k];
  if(!tpl)tpl=V30_GENERIC_LATE[found.stage.k];
  if(!tpl)return null;
  let c=v30LateContext();
  let body=`${tpl[1]}

此时此刻：${c.age}岁、生涯第 ${c.seasons} 个赛季、效力${c.team}、OVR ${c.ovr}、当前路线「${c.route}」。你已经拿到：${c.honorText}。`;
  let tail=`${tpl[2]}

你已经拿到：${c.honorText}。`;
  let common=[
    ['我接受，继续往前走',`接受这个阶段，球队关系与心态继续上升。`,{tr:5,a:{mentality:2},flags:[[`v30late_${found.stage.k}`,'accept']]}],
    ['我要主动争取更多',`争取更大空间，能力继续提升，但消耗也更明显。`,{a:{defense:1,finishing:1},c:3,h:-3,flags:[[`v30late_${found.stage.k}`,'push']]}],
    ['我更看重生涯的长度',`健康与耐久优先，为后面几年留余地。`,{a:{durability:2},h:7,s:-3,flags:[[`v30late_${found.stage.k}`,'long']]}]
  ];
  if(found.stage.k==='decision'){
    common=[
      ['再打一年，我还想争一次',`延长生涯，继续追荣誉。`,{c:4,h:2,tr:4,flags:[['v30late_decision','oneMore']]}],
      ['就在这里结束，我自己合上档案',`主动收尾，结局评价提升。`,{a:{mentality:3},c:5,flags:[['v30late_decision','ownEnd']]}],
      ['转做管理或教练，留在球队',`以另一种身份留在联盟，评价更完整。`,{a:{mentality:3},tr:6,flags:[['v30late_decision','staff']]}]
    ];
  }
  if(found.stage.k==='farewell'){
    common=[
      ['我想在主场打完最后一场',`完整告别，结局评价提升。`,{a:{mentality:3},c:4,flags:[['v30late_farewell','home']]}],
      ['我想再拼一次季后赛',`最后冲击一次，荣誉上限提升。`,{c:5,tr:4,flags:[['v30late_farewell','playoff']]}],
      ['我想安静地离开',`低调收尾，与球队关系更稳。`,{tr:6,h:4,flags:[['v30late_farewell','quiet']]}]
    ];
  }
  return{
    _v30:true,_saga:true,_longArc:true,_late:true,_lateStage:found.stage.k,_key:found.key,
    t:tpl[0],scene:`${seasonLabel()} · ${c.team}`,speaker:'职业生涯后段',cast:['经纪人','主教练'],
    b:body,stakes:tail,c:common.map(x=>[x[0],x[1],x[2]])
  };
}

/* ---------- 五种结局（每位状元 5 种，按路线 + 生涯荣誉判定） ---------- */
const V30_ENDINGS={
 bennett:[
  {k:'rewrite',w:s=>s.ovr>=88&&s.honor>=3,t:'彻底翻案',d:'“最差状元”这个词已经无法解释这段生涯。你从被全场嘲笑的第一个人，走到了需要被认真研究的那个人。多年以后，人们讨论 2013 年选秀时，用的是另一种语气。'},
  {k:'star',w:s=>s.ovr>=84||s.honor>=2,t:'成为真正的球星',d:'你没有停留在“翻案”，而是走得更远。全明星、最佳阵容、甚至冠军讨论里都有你的名字。当年那次嘲笑，如今只是纪录片里的一段铺垫。'},
  {k:'solid',w:s=>s.ovr>=78,t:'站稳联盟',d:'你先救活了职业生涯，再谈状元身份。没有成为超级巨星，但你成了每支球队都想要的球员——这本身就已经是巨大的胜利。'},
  {k:'late',w:s=>s.seasons>=8,t:'漫长的证明',d:'你没有一夜翻身，而是用一年又一年把自己从标签里拖出来。这不是最耀眼的故事，但是最难的一种。'},
  {k:'old',w:()=>true,t:'仍在逆风里',d:'标签还在，世界线只是松动了一点。你没有完全翻身，但你确实在这条路上留下了自己的痕迹——比原本那条轨迹，已经远了很多。'}
 ],
 oden:[
  {k:'ruler',w:s=>s.health>=72&&s.seasons>=6&&s.special<=40,t:'健康的统治者',d:'你做到了最难的事：让天赋有时间留在球场上。多年以后，人们不再用“如果健康”开头，而是直接说——他统治过那个时代。'},
  {k:'peace',w:s=>s.special<=55,t:'和身体达成停战',d:'你没能完全摆脱伤病，但你学会了和它共处。你比任何人都清楚，能一直在场上，本身就是一种天赋。'},
  {k:'champ',w:s=>s.honor>=2,t:'用荣誉换来的答案',d:'你没能打满每一个赛季，但你把能打的时间都用在了最重要的地方。奖杯是你对那个“如果”的最终回应。'},
  {k:'long',w:s=>s.seasons>=7,t:'比预期更长的生涯',d:'当年的报告写得很悲观，你打了比所有人都预测的更久。这条世界线本身就是对医学判决的一次否决。'},
  {k:'race',w:()=>true,t:'仍在与身体赛跑',d:'每一次高负荷都还在向未来借时间。你没有赢下这场赛跑，但你没有退出赛道——这已经不同于原本那条轨迹。'}
 ],
 kwame:[
  {k:'delayed',w:s=>s.ovr>=86&&s.special>=65,t:'迟到的兑现',d:'你没有催熟他，最终等到了真正的成熟。十九岁被推上状元位置的那个人，多年以后终于长成了所有人当年期待的样子——只是晚了很多年。'},
  {k:'anchor',w:s=>s.attrsDefense>=88&&s.honor>=1,t:'防守支柱',d:'你用防守、篮板和对抗，把自己写进了球队的骨架里。状元身份不再是包袱，因为所有人都知道你在场上的价值不需要用得分解释。'},
  {k:'place',w:s=>s.ovr>=79,t:'找到自己的位置',d:'状元期待不再是唯一评价标准。你成了那种教练信任、队友依赖、时间越久越显价值的球员。'},
  {k:'elder',w:s=>s.seasons>=8,t:'更衣室里最懂压力的人',d:'曾被评为水货的十九岁，最后成了年轻球员请教如何活下来的人。这条世界线改写的不是数据，是你留下来的方式。'},
  {k:'grow',w:()=>true,t:'成长仍未完成',d:'压力和成熟度之间的拉扯还没有结束。但你已经比原本那条轨迹走得更远，也终于不必再向任何人证明自己配得上那个顺位。'}
 ],
 fultz:[
  {k:'back',w:s=>s.special>=75&&s.attrsShooting>=72,t:'投篮真的回来了',d:'你不再是在修动作，而是在正常打篮球。那个被慢放无数次的动作，最终变成了你最平常的一部分。'},
  {k:'core',w:s=>s.attrsPlaymaking>=85&&s.honor>=2,t:'成为球队的答案',d:'你没有被伤病定义成悲剧，反而用组织和比赛理解成为一支球队的核心。所有人都记得你的肩膀，但你让他们记住的是别的东西。'},
  {k:'brave',w:s=>s.special>=58,t:'重新敢投',d:'投篮仍不是武器，但它已经不再主宰整个生涯。你从“不敢出手的人”变成了“在关键时刻仍然敢承担的人”。'},
  {k:'warrior',w:s=>s.seasons>=7,t:'带伤走到了很远',d:'你的生涯从来没有真正轻松过。但你打了比所有人都预测的更久，也拿到了那些本该属于你的东西。'},
  {k:'search',w:()=>true,t:'仍在寻找熟悉感',d:'那个最普通的动作仍然需要被重新相信。但你已经不再是那个被伤病带走一切的年轻人——你还在打球，这本身就是答案。'}
 ],
 simmons:[
  {k:'complete',w:s=>s.attrsShooting>=62&&s.special>=68,t:'完全体版本',d:'你逼出了自己的第三种威胁，也把那个被讨论整个生涯的短板变成了武器。当年放你两米的防守策略，从此从战术板上消失。'},
  {k:'champion',w:s=>s.honor>=3,t:'用冠军定义自己',d:'你没有变成传统意义上的射手，但你赢到了最后。所有争论在你捧起奖杯的那一刻停止了。'},
  {k:'system',w:s=>s.attrsPlaymaking>=88,t:'定义了一种新体系',d:'你证明了一套围绕不投篮的组织核心也能赢球的体系。别人讨论你能不能夺冠的时候，你在改写这项运动对位置的理解。'},
  {k:'mature',w:s=>s.special>=55,t:'不再逃避关键回合',d:'没有变成射手，但不再主动退出比赛最重要的那部分。你把天赋里最大的缺口，填到了能被接受的程度。'},
  {k:'gap',w:()=>true,t:'天赋仍有缺口',d:'最强的能力和最大的弱点仍然同时存在。这条世界线没能改掉那个问题，但你确实在它旁边，打出了属于自己的东西。'}
 ]
};

/* ---------- 未解锁玩家：每季随机事件（不重复，选错会一路下滑） ---------- */
const V30_EVENTS={
 "bennett": [
  {
   "t": "训练营体测，你的体重又上头条",
   "b": "体测数据被媒体拿到，评论区又开始讨论“不自律的状元”。体能教练看着你：“你自己决定，是想反驳他们，还是真的改掉。”",
   "c": [
    [
     "加练减重，我要彻底改变自己",
     "体能路线，耐久与运动提升。",
     {
      "a": {
       "durability": 2,
       "athleticism": 2
      },
      "h": -3
     },
     "good"
    ],
    [
     "我不看评论，按计划走",
     "保持专注，状态稳定。",
     {
      "a": {
       "mentality": 2
      },
      "c": 2
     },
     "good"
    ],
    [
     "先在社媒回击",
     "情绪释放但分散精力。",
     {
      "c": -4,
      "tr": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "球队换帅，新教练不认识“状元”这三个字",
   "b": "新主帅第一次见面就问：“你能给我们带来什么？”没有客气，也没有包袱。",
   "c": [
    [
     "直接告诉他我的角色定位",
     "沟通路线，信任提升。",
     {
      "tr": 6
     },
     "good"
    ],
    [
     "先训练，用表现说",
     "稳健路线。",
     {
      "a": {
       "defense": 1
      },
      "tr": 3
     },
     "good"
    ],
    [
     "抱怨球队一直不稳定",
     "情绪化反应。",
     {
      "tr": -5,
      "c": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "一次防守漏人，被剪成短视频全网传",
   "b": "慢放、配乐、嘲笑。你很清楚接下来会发生什么。",
   "c": [
    [
     "加练防守，把漏洞补掉",
     "防守成长。",
     {
      "a": {
       "defense": 3
      },
      "tr": 4
     },
     "good"
    ],
    [
     "找教练要录像，我自己分析",
     "成长心态。",
     {
      "a": {
       "mentality": 2
      },
      "tr": 3
     },
     "good"
    ],
    [
     "在采访里抱怨队友不协防",
     "队内关系恶化。",
     {
      "tr": -6,
      "c": -2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "季前赛第一场，你手感冰凉",
   "b": "5 投 0 中，解说又提起了那个顺位。你自己很清楚这个开局意味着什么。",
   "c": [
    [
     "继续投，季前赛就是用来找状态的",
     "坚持出手，状态慢慢回来。",
     {
      "c": 3,
      "s": 2
     },
     "good"
    ],
    [
     "先做防守和篮板留在场上",
     "防守提升，教练看得见。",
     {
      "a": {
       "defense": 2,
       "rebounding": 1
      },
      "tr": 4
     },
     "good"
    ],
    [
     "开始怀疑自己的投篮",
     "自信心受挫。",
     {
      "c": -5,
      "s": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "球队把一名新秀交给你带",
   "b": "教练说：“教他一点你这些年学到的东西。”",
   "c": [
    [
     "认真带他，把自己的坑都讲清楚",
     "更衣室地位提升。",
     {
      "a": {
       "mentality": 2
      },
      "tr": 6
     },
     "good"
    ],
    [
     "带他一起加练防守",
     "防守与信任双升。",
     {
      "a": {
       "defense": 1
      },
      "tr": 5
     },
     "good"
    ],
    [
     "嫌他拖慢我的训练节奏",
     "队内关系变差。",
     {
      "tr": -6,
      "c": -2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "一个播客请你上“水货状元”专题",
   "b": "节目组说得很直白：想聊“最被高估的状元”。",
   "c": [
    [
     "我去，当面把话说清楚",
     "公开回应，心态与信心提升。",
     {
      "c": 5,
      "a": {
       "mentality": 2
      }
     },
     "good"
    ],
    [
     "不去，用比赛说话",
     "专注比赛，状态稳定。",
     {
      "c": 2,
      "tr": 3
     },
     "good"
    ],
    [
     "去了，然后情绪失控",
     "舆论反噬。",
     {
      "c": -6,
      "s": -2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "训练师建议你改投篮手型",
   "b": "不改会一直卡在现在的命中率，改则要痛半年。",
   "c": [
    [
     "改，我等得起",
     "短期波动，长期投射提升。",
     {
      "a": {
       "shooting": 3
      },
      "s": -4,
      "c": -2
     },
     "good"
    ],
    [
     "只做小幅微调",
     "稳步优化。",
     {
      "a": {
       "shooting": 1
      },
      "s": 2
     },
     "good"
    ],
    [
     "不改，现在这样就够用了",
     "错过提升窗口。",
     {
      "c": 1
     },
     "bad"
    ]
   ]
  },
  {
   "t": "客场球迷从头到尾嘘你",
   "b": "每次触球都被嘘，你听得清清楚楚。",
   "c": [
    [
     "用表现回应",
     "逆风成长。",
     {
      "c": 5,
      "s": 8,
      "a": {
       "mentality": 2
      }
     },
     "good"
    ],
    [
     "屏蔽噪音专心打球",
     "心态稳健。",
     {
      "a": {
       "mentality": 2
      },
      "tr": 3
     },
     "good"
    ],
    [
     "和球迷对着干",
     "情绪失控，形象受损。",
     {
      "c": -6,
      "tr": -4
     },
     "bad"
    ]
   ]
  },
  {
   "t": "休赛期有球队来问价",
   "b": "经纪人接到电话：对方想要你，但只肯出一个次轮签。",
   "c": [
    [
     "留队，我要在这里证明自己",
     "信任提升。",
     {
      "tr": 7,
      "c": 3
     },
     "good"
    ],
    [
     "认真考虑换个环境",
     "开放选择，心态更主动。",
     {
      "a": {
       "mentality": 2
      },
      "c": 3
     },
     "good"
    ],
    [
     "因为报价太低情绪低落",
     "信心受挫。",
     {
      "c": -5,
      "tr": -2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "训练里你扭到脚踝",
   "b": "不严重，但队医建议休两场。",
   "c": [
    [
     "听医生的，休两场",
     "健康优先。",
     {
      "h": 6,
      "s": -2
     },
     "good"
    ],
    [
     "带伤上，我不想丢位置",
     "短期保住位置，风险上升。",
     {
      "h": -5,
      "tr": 3
     },
     "bad"
    ],
    [
     "减量训练，边打边恢复",
     "折中处理。",
     {
      "h": 3,
      "tr": 2
     },
     "good"
    ]
   ]
  },
  {
   "t": "队友说你是更衣室最努力的人",
   "b": "这句话上了热搜，但你自己知道努力不等于结果。",
   "c": [
    [
     "把它当成动力",
     "心态提升。",
     {
      "a": {
       "mentality": 2
      },
      "c": 3
     },
     "good"
    ],
    [
     "保持低调继续练",
     "稳定成长。",
     {
      "a": {
       "defense": 1
      },
      "tr": 3
     },
     "good"
    ],
    [
     "开始过分在意别人的评价",
     "压力增加。",
     {
      "c": -3,
      "s": -2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "球队连败，媒体开始找替罪羊",
   "b": "镜头一次次给到你。",
   "c": [
    [
     "主动承担责任",
     "球队信任上升。",
     {
      "tr": 8,
      "a": {
       "mentality": 2
      }
     },
     "good"
    ],
    [
     "专心做好自己的事",
     "稳定应对。",
     {
      "tr": 3,
      "c": 2
     },
     "good"
    ],
    [
     "公开抱怨战术安排",
     "和教练组关系紧张。",
     {
      "tr": -7,
      "c": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "你被邀请参加社区活动",
   "b": "一群孩子穿着你的球衣，他们不知道“水货状元”是什么意思。",
   "c": [
    [
     "认真参加，多留两个小时",
     "心态与形象提升。",
     {
      "a": {
       "mentality": 3
      },
      "c": 3
     },
     "good"
    ],
    [
     "照流程走完",
     "正常完成。",
     {
      "tr": 2
     },
     "good"
    ],
    [
     "觉得浪费时间提前离开",
     "形象受损。",
     {
      "tr": -4,
      "c": -2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "管理层问你愿不愿意降薪留队",
   "b": "“我们想留住你，但薪资空间很紧。”",
   "c": [
    [
     "我愿意，留在这里更重要",
     "信任大涨，地位提升。",
     {
      "tr": 9,
      "a": {
       "mentality": 2
      }
     },
     "good"
    ],
    [
     "我要再想想",
     "保持谈判空间。",
     {
      "c": 2,
      "tr": 1
     },
     "good"
    ],
    [
     "直接拒绝并表达不满",
     "关系紧张。",
     {
      "tr": -8,
      "c": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "赛季中段，你的角色又变了",
   "b": "教练组调整轮换，你的出场时间被切碎。",
   "c": [
    [
     "接受并适应，随时准备好",
     "信任提升。",
     {
      "tr": 6,
      "a": {
       "mentality": 2
      }
     },
     "good"
    ],
    [
     "找教练问清定位",
     "沟通有效。",
     {
      "tr": 5,
      "c": 2
     },
     "good"
    ],
    [
     "公开表达不满",
     "关系恶化。",
     {
      "tr": -8,
      "c": -4
     },
     "bad"
    ]
   ]
  }
 ],
 "oden": [
  {
   "t": "一次落地，膝盖传来熟悉的感觉",
   "b": "不疼，但那种感觉你太熟悉了。队医问你哪里不舒服。",
   "c": [
    [
     "如实说，立刻做检查",
     "健康优先，长期收益。",
     {
      "h": 8,
      "s": -5
     },
     "good"
    ],
    [
     "说没事，继续打",
     "冒险，风险上升。",
     {
      "s": 10,
      "h": -6
     },
     "bad"
    ],
    [
     "主动要求减少背靠背",
     "负荷管理，身体受益。",
     {
      "h": 6,
      "a": {
       "durability": 1
      }
     },
     "good"
    ]
   ]
  },
  {
   "t": "球队想让你打满背靠背，队医不同意",
   "b": "教练组和医疗组第一次当面冲突，争论的焦点是你。",
   "c": [
    [
     "支持医疗组",
     "健康与信任双升。",
     {
      "h": 7,
      "tr": 4
     },
     "good"
    ],
    [
     "折中，只打一场",
     "平衡处理。",
     {
      "h": 3,
      "s": -2
     },
     "good"
    ],
    [
     "我要打，球迷买票是来看我的",
     "球迷好感但有代价。",
     {
      "h": -6,
      "s": 8,
      "c": 2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "复出后第一次对抗训练，你有点怕",
   "b": "你做完动作，身体没事，但脑子里还是响了。",
   "c": [
    [
     "找心理教练聊一聊",
     "心态成长。",
     {
      "a": {
       "mentality": 3
      },
      "h": 3
     },
     "good"
    ],
    [
     "不理会，继续练",
     "硬扛，短期无碍。",
     {
      "h": 2
     },
     "good"
    ],
    [
     "开始规避对抗",
     "影响竞技状态。",
     {
      "a": {
       "finishing": -2
      },
      "c": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "背靠背第二场，队医建议轮休",
   "b": "你已经连续出战 12 场，这在你的生涯里很少见。",
   "c": [
    [
     "轮休，把身体放到第一位",
     "健康大幅提升。",
     {
      "h": 9,
      "s": -4
     },
     "good"
    ],
    [
     "只打 20 分钟",
     "折中保护。",
     {
      "h": 5
     },
     "good"
    ],
    [
     "我要打满，状态正好",
     "冒险。",
     {
      "h": -6,
      "s": 6,
      "c": 3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "一次对抗中，对手撞到你的膝盖",
   "b": "你倒在地上，全场安静了一秒。",
   "c": [
    [
     "下场检查，宁可谨慎",
     "健康优先。",
     {
      "h": 7,
      "s": -3
     },
     "good"
    ],
    [
     "站起来继续打",
     "硬撑。",
     {
      "h": -4,
      "s": 4,
      "c": 2
     },
     "bad"
    ],
    [
     "下场后立刻冰敷和评估",
     "专业处理。",
     {
      "h": 5
     },
     "good"
    ]
   ]
  },
  {
   "t": "媒体又开始算你的出勤率",
   "b": "“如果他健康”这句话又被写进标题。",
   "c": [
    [
     "用出勤率回应",
     "专注赛季，健康优先。",
     {
      "h": 5,
      "a": {
       "mentality": 2
      }
     },
     "good"
    ],
    [
     "不看这些报道",
     "心态稳定。",
     {
      "a": {
       "mentality": 2
      },
      "c": 2
     },
     "good"
    ],
    [
     "这些话影响了情绪",
     "自信受挫。",
     {
      "c": -5,
      "s": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "球队想给你加装护具",
   "b": "护具会限制活动范围，但能降低受伤风险。",
   "c": [
    [
     "接受，安全第一",
     "健康明显提升。",
     {
      "h": 8,
      "s": -5
     },
     "good"
    ],
    [
     "只在训练时戴",
     "适度保护。",
     {
      "h": 4
     },
     "good"
    ],
    [
     "不戴，影响我打球",
     "风险上升。",
     {
      "h": -5,
      "a": {
       "finishing": 1
      }
     },
     "bad"
    ]
   ]
  },
  {
   "t": "复健师给你一套全新的落地训练",
   "b": "专门改你落地时的发力方式。",
   "c": [
    [
     "坚持练满整个休赛期",
     "耐久大幅提升。",
     {
      "a": {
       "durability": 3
      },
      "h": 6
     },
     "good"
    ],
    [
     "部分接受",
     "稳步改善。",
     {
      "a": {
       "durability": 1
      },
      "h": 3
     },
     "good"
    ],
    [
     "觉得太基础，跳过",
     "错过改善机会。",
     {
      "h": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "队内对抗赛，你打了完整强度",
   "b": "结束后身体没有异样，这是好消息。",
   "c": [
    [
     "继续保持当前负荷",
     "稳步前进。",
     {
      "h": 4,
      "a": {
       "durability": 1
      }
     },
     "good"
    ],
    [
     "趁势加练",
     "上限提升但风险增加。",
     {
      "a": {
       "finishing": 2
      },
      "h": -4,
      "s": 4
     },
     "bad"
    ],
    [
     "记录身体反馈，稳扎稳打",
     "专业管理。",
     {
      "h": 5,
      "a": {
       "mentality": 1
      }
     },
     "good"
    ]
   ]
  },
  {
   "t": "一位老将告诉你：别用身体换数据",
   "b": "他打了十七年，膝盖同样不好。",
   "c": [
    [
     "我把这句话记下来",
     "健康路线加强。",
     {
      "a": {
       "durability": 2
      },
      "h": 6,
      "s": -3
     },
     "good"
    ],
    [
     "听取部分建议",
     "适度调整。",
     {
      "h": 3
     },
     "good"
    ],
    [
     "我觉得自己不一样",
     "风险累积。",
     {
      "h": -4,
      "c": 3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "季后赛强度让身体发出警告",
   "b": "连着两场 35 分钟以后，恢复明显变慢。",
   "c": [
    [
     "主动要求减少时间",
     "健康保护。",
     {
      "h": 7,
      "s": -4,
      "tr": 2
     },
     "good"
    ],
    [
     "打完这轮再说",
     "硬撑过系列赛。",
     {
      "h": -6,
      "c": 3
     },
     "bad"
    ],
    [
     "和医疗组一起定新方案",
     "专业路线。",
     {
      "h": 6,
      "tr": 4
     },
     "good"
    ]
   ]
  },
  {
   "t": "有球队公开说：我们不敢赌他的健康",
   "b": "这句话传到了你耳朵里。",
   "c": [
    [
     "用出场记录回答",
     "专注自身。",
     {
      "h": 5,
      "a": {
       "mentality": 2
      }
     },
     "good"
    ],
    [
     "不去理会",
     "稳定应对。",
     {
      "a": {
       "mentality": 1
      },
      "c": 2
     },
     "good"
    ],
    [
     "开始自我怀疑",
     "信心下滑。",
     {
      "c": -6,
      "h": -2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "休赛期，你请了专门的体能团队",
   "b": "费用不低，但能长期压低受伤风险。",
   "c": [
    [
     "长期合作",
     "耐久持续提升。",
     {
      "a": {
       "durability": 3
      },
      "h": 5
     },
     "good"
    ],
    [
     "先试一个休赛期",
     "稳步改善。",
     {
      "a": {
       "durability": 1
      },
      "h": 3
     },
     "good"
    ],
    [
     "觉得没必要花这笔钱",
     "错过改善。",
     {
      "h": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "你第一次连续两个赛季打满 60 场",
   "b": "这在你生涯里是个里程碑。",
   "c": [
    [
     "继续保持节奏",
     "健康与自信提升。",
     {
      "h": 6,
      "c": 4
     },
     "good"
    ],
    [
     "趁状态好加练进攻",
     "上限提升，风险略增。",
     {
      "a": {
       "finishing": 2
      },
      "h": -3
     },
     "good"
    ],
    [
     "觉得还能再拼一点",
     "身体透支。",
     {
      "h": -6,
      "s": 5
     },
     "bad"
    ]
   ]
  },
  {
   "t": "医生说：你的膝盖状态比预想的好",
   "b": "这是这几年最好的消息。",
   "c": [
    [
     "但我不放松管理",
     "保持谨慎。",
     {
      "h": 4,
      "a": {
       "mentality": 1
      }
     },
     "good"
    ],
    [
     "可以适当放开一点",
     "适度释放。",
     {
      "a": {
       "finishing": 1
      },
      "h": 1,
      "s": 2
     },
     "good"
    ],
    [
     "彻底放开打",
     "风险重新累积。",
     {
      "h": -6,
      "s": 8,
      "c": 4
     },
     "bad"
    ]
   ]
  }
 ],
 "kwame": [
  {
   "t": "一个回合，你把球传给了空气",
   "b": "球评人立刻用慢放标记了那次失误，屏幕上的字幕只剩两个字：“黄油手”。",
   "c": [
    [
     "加练接球和传球",
     "技术成长。",
     {
      "a": {
       "finishing": 2,
       "playmaking": 1
      }
     },
     "good"
    ],
    [
     "找老将请教",
     "心态成长。",
     {
      "a": {
       "mentality": 2
      },
      "tr": 4
     },
     "good"
    ],
    [
     "在更衣室发火",
     "关系紧张。",
     {
      "tr": -6,
      "c": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "训练里，教练当众批评你“不够职业”",
   "b": "全队都听到了。十九岁那年你被这样批评过，你现在已经三十岁了。",
   "c": [
    [
     "当晚加练",
     "态度获得认可。",
     {
      "a": {
       "mentality": 3
      },
      "tr": 5
     },
     "good"
    ],
    [
     "私下找教练沟通",
     "信任提升。",
     {
      "tr": 6
     },
     "good"
    ],
    [
     "当场反驳",
     "冲突升级。",
     {
      "tr": -8,
      "c": -2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "合同年，经纪人要你多刷数据",
   "b": "“你不刷，市场就看不到你。”这句话很现实，也很危险。",
   "c": [
    [
     "按教练要求打，赢球优先",
     "团队信任上升。",
     {
      "tr": 8
     },
     "good"
    ],
    [
     "适度增加出手",
     "平衡路线。",
     {
      "a": {
       "finishing": 1
      },
      "tr": 2
     },
     "good"
    ],
    [
     "不听战术，只为自己打球",
     "球队信任崩塌。",
     {
      "tr": -9,
      "teamTrade": 1
     },
     "bad"
    ]
   ]
  },
  {
   "t": "一场季前赛，你被对手连续打爆",
   "b": "对面中锋在你头上拿了 20 分。",
   "c": [
    [
     "赛后加练防守脚步",
     "防守明显提升。",
     {
      "a": {
       "defense": 3
      },
      "tr": 4
     },
     "good"
    ],
    [
     "和教练一起看录像",
     "技术与信任提升。",
     {
      "a": {
       "mentality": 2
      },
      "tr": 5
     },
     "good"
    ],
    [
     "开始怀疑自己",
     "信心下滑。",
     {
      "c": -5,
      "tr": -2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "球队给你请了专职技术教练",
   "b": "专门纠正你的基本功。",
   "c": [
    [
     "每周四次，全勤",
     "技术大幅提升。",
     {
      "a": {
       "finishing": 2,
       "defense": 1
      }
     },
     "good"
    ],
    [
     "按计划完成",
     "稳步提升。",
     {
      "a": {
       "finishing": 1
      }
     },
     "good"
    ],
    [
     "嫌枯燥，经常缺席",
     "机会浪费。",
     {
      "tr": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "一名老将当着全队批评你态度不端正",
   "b": "话说得很重，但你心里知道不全错。",
   "c": [
    [
     "接受，从今天开始改",
     "心态与信任提升。",
     {
      "a": {
       "mentality": 3
      },
      "tr": 6
     },
     "good"
    ],
    [
     "私下找他聊清楚",
     "关系改善。",
     {
      "tr": 5,
      "a": {
       "mentality": 1
      }
     },
     "good"
    ],
    [
     "当场顶回去",
     "队内对立。",
     {
      "tr": -8,
      "c": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "你成了自由市场讨论的对象",
   "b": "有球队想要你，但开的价不高。",
   "c": [
    [
     "留下，继续成长",
     "信任提升。",
     {
      "tr": 6,
      "c": 2
     },
     "good"
    ],
    [
     "去一支愿意给机会的球队",
     "换环境，机会增加。",
     {
      "a": {
       "mentality": 2
      },
      "c": 3
     },
     "good"
    ],
    [
     "因为报价低心态失衡",
     "信心受挫。",
     {
      "c": -5,
      "tr": -2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "训练营第一天，教练说位置要靠抢",
   "b": "你的首发位置不再被保证。",
   "c": [
    [
     "用训练表现抢回来",
     "状态与信任提升。",
     {
      "a": {
       "defense": 1,
       "finishing": 1
      },
      "tr": 5
     },
     "good"
    ],
    [
     "接受替补，做好自己",
     "心态稳定。",
     {
      "a": {
       "mentality": 2
      },
      "tr": 3
     },
     "good"
    ],
    [
     "抱怨球队不尊重状元",
     "关系紧张。",
     {
      "tr": -7,
      "c": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "你在低位连续打成三个回合",
   "b": "教练在场边点头。",
   "c": [
    [
     "以后多要低位球",
     "低位能力提升。",
     {
      "a": {
       "finishing": 2
      },
      "c": 3
     },
     "good"
    ],
    [
     "保持耐心，机会自然会来",
     "信任提升。",
     {
      "tr": 5,
      "a": {
       "mentality": 1
      }
     },
     "good"
    ],
    [
     "开始强行单打",
     "效率下降。",
     {
      "tr": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "社交媒体又翻出你当年的选秀片段",
   "b": "评论区全是嘲笑。",
   "c": [
    [
     "用它提醒自己为什么还在打",
     "心态提升。",
     {
      "a": {
       "mentality": 3
      },
      "c": 2
     },
     "good"
    ],
    [
     "关掉手机专注训练",
     "稳健。",
     {
      "a": {
       "defense": 1
      },
      "tr": 2
     },
     "good"
    ],
    [
     "逐条回复评论",
     "情绪消耗严重。",
     {
      "c": -6,
      "s": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "球队进入重建期，年轻人开始打主力",
   "b": "你的出场时间被进一步压缩。",
   "c": [
    [
     "接受角色，做年轻人的后盾",
     "信任与口碑提升。",
     {
      "tr": 7,
      "a": {
       "mentality": 2
      }
     },
     "good"
    ],
    [
     "要求去一支有竞争力的球队",
     "换环境。",
     {
      "teamTrade": 1,
      "c": 3
     },
     "good"
    ],
    [
     "消极应对，出工不出力",
     "关系恶化。",
     {
      "tr": -8,
      "c": -4
     },
     "bad"
    ]
   ]
  },
  {
   "t": "你的合同只剩最后一年",
   "b": "这一年决定下一份合同的大小。",
   "c": [
    [
     "专注提升防守价值",
     "防守提升。",
     {
      "a": {
       "defense": 2
      },
      "tr": 5
     },
     "good"
    ],
    [
     "努力增加进攻数据",
     "进攻提升但信任下降。",
     {
      "a": {
       "finishing": 2
      },
      "tr": -3,
      "c": 3
     },
     "bad"
    ],
    [
     "和经纪人提前规划",
     "主动权提升。",
     {
      "a": {
       "mentality": 2
      },
      "tr": 3
     },
     "good"
    ]
   ]
  },
  {
   "t": "一个十九岁的新秀问你：被全网骂怎么办",
   "b": "他看着你，像看着十几年前的自己。",
   "c": [
    [
     "把经验全告诉他",
     "更衣室地位提升。",
     {
      "a": {
       "mentality": 3
      },
      "tr": 7
     },
     "good"
    ],
    [
     "带他一起训练",
     "信任与健康双升。",
     {
      "tr": 5,
      "h": 3
     },
     "good"
    ],
    [
     "不想多管",
     "错过建立关系的机会。",
     {
      "tr": -2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "休赛期你增重了 8 公斤",
   "b": "对抗更强了，但灵活性可能受影响。",
   "c": [
    [
     "配合专项训练保持机动",
     "对抗与机动兼顾。",
     {
      "a": {
       "rebounding": 2,
       "athleticism": 1
      }
     },
     "good"
    ],
    [
     "以力量为主",
     "对抗提升。",
     {
      "a": {
       "rebounding": 2,
       "defense": 1
      },
      "h": -3
     },
     "good"
    ],
    [
     "只增重不训练",
     "状态下滑。",
     {
      "a": {
       "athleticism": -2
      },
      "h": -4
     },
     "bad"
    ]
   ]
  },
  {
   "t": "季后赛里你防住了对面的明星内线",
   "b": "赛后教练专门点名表扬你。",
   "c": [
    [
     "把防守做成招牌",
     "防守大幅提升。",
     {
      "a": {
       "defense": 3
      },
      "tr": 7
     },
     "good"
    ],
    [
     "继续全面发展",
     "全面成长。",
     {
      "a": {
       "defense": 1,
       "finishing": 1
      }
     },
     "good"
    ],
    [
     "觉得自己已经够了",
     "停止进步。",
     {
      "c": -2,
      "tr": -2
     },
     "bad"
    ]
   ]
  }
 ],
 "fultz": [
  {
   "t": "训练里你又一次想不起那个动作",
   "b": "身体忽然不听话了。投篮教练停下来说：“今天先到这里。”",
   "c": [
    [
     "停下来，做基础恢复",
     "稳定提升。",
     {
      "s": 6,
      "h": 3
     },
     "good"
    ],
    [
     "继续练到手感回来",
     "硬撑，波动。",
     {
      "s": -4,
      "c": -3
     },
     "bad"
    ],
    [
     "去找医疗团队重新评估",
     "专业路线。",
     {
      "s": 4,
      "h": 4
     },
     "good"
    ]
   ]
  },
  {
   "t": "社媒上你的罚球视频又被翻出来",
   "b": "评论区在讨论“心理问题”。你关掉手机又打开。",
   "c": [
    [
     "彻底关闭社媒",
     "专注恢复。",
     {
      "c": 5,
      "s": 3
     },
     "good"
    ],
    [
     "公开谈自己的经历",
     "获得理解，心态提升。",
     {
      "a": {
       "mentality": 3
      },
      "c": 3
     },
     "good"
    ],
    [
     "逐条回复批评者",
     "情绪消耗。",
     {
      "c": -5,
      "s": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "一场比赛你 8 投 1 中",
   "b": "板凳席没人敢看你。教练还在考虑要不要继续把你放在场上。",
   "c": [
    [
     "继续投，我不躲",
     "自信路线。",
     {
      "c": 4,
      "s": 3
     },
     "good"
    ],
    [
     "先做组织和防守",
     "全面路线。",
     {
      "a": {
       "playmaking": 2
      }
     },
     "good"
    ],
    [
     "主动要求下场",
     "失去信任。",
     {
      "tr": -5,
      "c": -4
     },
     "bad"
    ]
   ]
  },
  {
   "t": "一次训练，你的投篮又卡了一下",
   "b": "只有半秒的停顿，但你自己知道。",
   "c": [
    [
     "马上停下来做基础动作",
     "稳定提升。",
     {
      "s": 6,
      "c": 2
     },
     "good"
    ],
    [
     "假装没发生继续练",
     "问题积累。",
     {
      "s": -4,
      "c": -2
     },
     "bad"
    ],
    [
     "找投篮教练重新拆解",
     "专业修复。",
     {
      "s": 5,
      "a": {
       "shooting": 1
      }
     },
     "good"
    ]
   ]
  },
  {
   "t": "球队安排你和心理教练定期沟通",
   "b": "教练说这不是软弱，是专业。",
   "c": [
    [
     "认真配合",
     "心态大幅提升。",
     {
      "a": {
       "mentality": 3
      },
      "c": 4
     },
     "good"
    ],
    [
     "偶尔去一次",
     "小幅改善。",
     {
      "a": {
       "mentality": 1
      },
      "c": 2
     },
     "good"
    ],
    [
     "拒绝，我不需要",
     "错过帮助。",
     {
      "c": -4
     },
     "bad"
    ]
   ]
  },
  {
   "t": "一场比赛你罚球 10 罚 9 中",
   "b": "对别人是正常表现，对你是里程碑。",
   "c": [
    [
     "继续巩固这个节奏",
     "稳定与自信提升。",
     {
      "s": 8,
      "c": 4
     },
     "good"
    ],
    [
     "把这种状态带进比赛",
     "投射提升。",
     {
      "a": {
       "shooting": 2
      },
      "s": 4
     },
     "good"
    ],
    [
     "觉得只是运气好",
     "信心没有积累。",
     {
      "c": 1
     },
     "bad"
    ]
   ]
  },
  {
   "t": "有人在社媒上重提“水货状元”",
   "b": "评论区一半在嘲笑，一半在为你说话。",
   "c": [
    [
     "只看支持我的那些",
     "心态提升。",
     {
      "c": 4,
      "a": {
       "mentality": 2
      }
     },
     "good"
    ],
    [
     "彻底不看社媒",
     "专注训练。",
     {
      "a": {
       "mentality": 2
      },
      "s": 2
     },
     "good"
    ],
    [
     "被负面评论影响",
     "信心受挫。",
     {
      "c": -6,
      "s": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "肩部旧伤在训练中复发",
   "b": "不严重，但需要重新评估。",
   "c": [
    [
     "立刻停训做检查",
     "健康优先。",
     {
      "h": 7,
      "s": -3
     },
     "good"
    ],
    [
     "降低训练量继续",
     "折中处理。",
     {
      "h": 4,
      "s": 1
     },
     "good"
    ],
    [
     "忍着继续高强度练",
     "伤情加重。",
     {
      "h": -8,
      "s": -4
     },
     "bad"
    ]
   ]
  },
  {
   "t": "教练让你改打无球",
   "b": "这会减少你持球出手的压力。",
   "c": [
    [
     "接受，从无球开始重建",
     "稳定与信任提升。",
     {
      "s": 6,
      "tr": 5
     },
     "good"
    ],
    [
     "我还是要持球",
     "坚持自我，风险更高。",
     {
      "c": 3,
      "a": {
       "playmaking": 1
      },
      "s": -2
     },
     "good"
    ],
    [
     "拒绝并产生抵触",
     "关系紧张。",
     {
      "tr": -6,
      "c": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "你在最后时刻投丢了关键球",
   "b": "但没有人再慢放你的动作了。",
   "c": [
    [
     "下次还投",
     "自信提升。",
     {
      "c": 5,
      "s": 4
     },
     "good"
    ],
    [
     "回去加练那个位置",
     "投射提升。",
     {
      "a": {
       "shooting": 2
      },
      "s": 3
     },
     "good"
    ],
    [
     "开始回避关键出手",
     "心理退步。",
     {
      "c": -6,
      "s": -4
     },
     "bad"
    ]
   ]
  },
  {
   "t": "球队交易来一个控卫，位置竞争加剧",
   "b": "教练说位置要靠表现拿。",
   "c": [
    [
     "用训练态度争取",
     "信任提升。",
     {
      "tr": 6,
      "a": {
       "mentality": 2
      }
     },
     "good"
    ],
    [
     "转做双能卫增加价值",
     "全面成长。",
     {
      "a": {
       "playmaking": 2,
       "shooting": 1
      }
     },
     "good"
    ],
    [
     "抱怨球队不信任我",
     "关系紧张。",
     {
      "tr": -7,
      "c": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "一个年轻球员问你：怎么克服投篮恐惧",
   "b": "你想起新秀年那个被慢放的自己。",
   "c": [
    [
     "认真讲自己的经历",
     "口碑与心态提升。",
     {
      "a": {
       "mentality": 3
      },
      "tr": 6
     },
     "good"
    ],
    [
     "带他一起练",
     "共同成长。",
     {
      "a": {
       "shooting": 1
      },
      "tr": 4
     },
     "good"
    ],
    [
     "不愿意多说",
     "错过连接。",
     {
      "tr": -2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "休赛期你第一次完整练完整个夏天",
   "b": "这是你生涯第一次没有康复任务的休赛期。",
   "c": [
    [
     "全力提升投射",
     "投射大幅提升。",
     {
      "a": {
       "shooting": 3
      },
      "s": 4
     },
     "good"
    ],
    [
     "均衡提升各项",
     "全面成长。",
     {
      "a": {
       "shooting": 1,
       "defense": 1,
       "playmaking": 1
      }
     },
     "good"
    ],
    [
     "先放松一下",
     "错过关键窗口。",
     {
      "c": 2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "媒体问你：还算不算状元级球员",
   "b": "这个问题你已经被问了八年。",
   "c": [
    [
     "我不需要再回答这个",
     "心态成熟。",
     {
      "a": {
       "mentality": 3
      },
      "c": 4
     },
     "good"
    ],
    [
     "用数据回答",
     "自信提升。",
     {
      "c": 3,
      "s": 3
     },
     "good"
    ],
    [
     "被问题激怒",
     "情绪失控。",
     {
      "c": -5,
      "tr": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "你连续 20 场打出稳定数据",
   "b": "“稳定”这个词，对你来说曾经是奢侈品。",
   "c": [
    [
     "继续保持",
     "状态稳定提升。",
     {
      "s": 6,
      "c": 4
     },
     "good"
    ],
    [
     "开始加练持球投",
     "上限提升。",
     {
      "a": {
       "shooting": 2
      },
      "s": 2
     },
     "good"
    ],
    [
     "觉得已经成功了",
     "松懈。",
     {
      "s": -4,
      "c": -2
     },
     "bad"
    ]
   ]
  }
 ],
 "simmons": [
  {
   "t": "对手在赛前采访里说：我们放他投",
   "b": "这句话被原样放到了更衣室的屏幕上。",
   "c": [
    [
     "今晚我就是要投",
     "投射与自信提升。",
     {
      "a": {
       "shooting": 2
      },
      "s": 6,
      "c": 3
     },
     "good"
    ],
    [
     "用突破和传球回应",
     "功能路线。",
     {
      "a": {
       "finishing": 2,
       "playmaking": 1
      },
      "tr": 4
     },
     "good"
    ],
    [
     "回避，让教练处理",
     "心理回避。",
     {
      "s": -4,
      "c": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "罚球线前，全场安静得可怕",
   "b": "你握着球，听到自己的呼吸。",
   "c": [
    [
     "深呼吸，按流程投",
     "心理稳定。",
     {
      "a": {
       "mentality": 3
      },
      "c": 3
     },
     "good"
    ],
    [
     "加快节奏快点投完",
     "仓促处理。",
     {
      "s": -3
     },
     "bad"
    ],
    [
     "把球传给裁判，重新调整",
     "找到自己的节奏。",
     {
      "c": 2,
      "s": 2
     },
     "good"
    ]
   ]
  },
  {
   "t": "更衣室里有队友公开质疑你的投入度",
   "b": "话说得很难听，但不算完全没道理。",
   "c": [
    [
     "正面沟通，把话说开",
     "关系修复。",
     {
      "tr": 6,
      "a": {
       "mentality": 2
      }
     },
     "good"
    ],
    [
     "加练到最晚",
     "以身作则。",
     {
      "a": {
       "shooting": 1
      },
      "tr": 4
     },
     "good"
    ],
    [
     "冷处理，各自为战",
     "队内裂痕扩大。",
     {
      "tr": -7
     },
     "bad"
    ]
   ]
  },
  {
   "t": "对手赛前布置：放他投",
   "b": "这句话被原样放到了更衣室屏幕上。",
   "c": [
    [
     "今晚我就投",
     "投射与自信提升。",
     {
      "a": {
       "shooting": 2
      },
      "s": 6,
      "c": 3
     },
     "good"
    ],
    [
     "用突破和组织回应",
     "功能路线。",
     {
      "a": {
       "finishing": 2,
       "playmaking": 1
      },
      "tr": 4
     },
     "good"
    ],
    [
     "不去看那块屏幕",
     "回避问题。",
     {
      "s": -3,
      "c": -2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "罚球线上，全场安静",
   "b": "你能听到自己的呼吸。",
   "c": [
    [
     "按流程深呼吸再投",
     "心态与稳定提升。",
     {
      "a": {
       "mentality": 3
      },
      "c": 3
     },
     "good"
    ],
    [
     "快点投完算了",
     "仓促。",
     {
      "s": -4
     },
     "bad"
    ],
    [
     "退一步重新调整节奏",
     "找到感觉。",
     {
      "s": 3,
      "c": 2
     },
     "good"
    ]
   ]
  },
  {
   "t": "队友在更衣室公开质疑你的投入度",
   "b": "话很难听，但不算完全没道理。",
   "c": [
    [
     "正面沟通，把话说开",
     "关系修复。",
     {
      "tr": 7,
      "a": {
       "mentality": 2
      }
     },
     "good"
    ],
    [
     "加练到最晚",
     "用行动回应。",
     {
      "a": {
       "shooting": 1
      },
      "tr": 5
     },
     "good"
    ],
    [
     "冷处理，各打各的",
     "裂痕扩大。",
     {
      "tr": -8,
      "c": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "教练把战术板交给你自己画",
   "b": "“他们退到罚球线了，你说怎么办。”",
   "c": [
    [
     "画一个我自己投篮的战术",
     "投射与担当提升。",
     {
      "a": {
       "shooting": 2
      },
      "c": 4,
      "s": 5
     },
     "good"
    ],
    [
     "画一个错位打击的战术",
     "组织与信任提升。",
     {
      "a": {
       "playmaking": 2
      },
      "tr": 6
     },
     "good"
    ],
    [
     "把板子还给教练",
     "回避责任。",
     {
      "tr": -4,
      "c": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "你的背部又出现不适",
   "b": "老问题，但每次都会让人紧张。",
   "c": [
    [
     "立刻做检查，谨慎处理",
     "健康提升。",
     {
      "h": 7,
      "s": -3
     },
     "good"
    ],
    [
     "减少对抗训练",
     "适度保护。",
     {
      "h": 4
     },
     "good"
    ],
    [
     "坚持全强度训练",
     "风险上升。",
     {
      "h": -6,
      "a": {
       "athleticism": 1
      }
     },
     "bad"
    ]
   ]
  },
  {
   "t": "有球队公开说：我们不想要他",
   "b": "理由写得很清楚——不会投篮。",
   "c": [
    [
     "用比赛改变这个说法",
     "动力提升。",
     {
      "c": 5,
      "s": 5,
      "a": {
       "mentality": 2
      }
     },
     "good"
    ],
    [
     "不去理会，专注自己",
     "稳定应对。",
     {
      "a": {
       "mentality": 2
      },
      "tr": 2
     },
     "good"
    ],
    [
     "公开发声回击",
     "舆论反噬。",
     {
      "c": -5,
      "tr": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "你在一场比赛里投进 3 个三分",
   "b": "全场都在讨论这件事。",
   "c": [
    [
     "继续保持出手",
     "投射大幅提升。",
     {
      "a": {
       "shooting": 3
      },
      "s": 5,
      "c": 4
     },
     "good"
    ],
    [
     "不因此改变打法",
     "保持平衡。",
     {
      "a": {
       "playmaking": 1
      },
      "tr": 4
     },
     "good"
    ],
    [
     "觉得已经够了",
     "停止进步。",
     {
      "s": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "球队想让你打小球五号位",
   "b": "这会增加对抗和伤病风险。",
   "c": [
    [
     "接受，为球队做任何事",
     "信任大幅提升。",
     {
      "tr": 8,
      "a": {
       "rebounding": 2
      },
      "h": -3
     },
     "good"
    ],
    [
     "可以，但要控制时间",
     "兼顾健康。",
     {
      "tr": 4,
      "a": {
       "rebounding": 1
      },
      "h": 2
     },
     "good"
    ],
    [
     "坚决不打内线",
     "和教练冲突。",
     {
      "tr": -7,
      "c": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "一个年轻后卫问你：被放投怎么办",
   "b": "他看着你，眼神里全是恐惧。",
   "c": [
    [
     "认真教他怎么面对",
     "口碑与心态提升。",
     {
      "a": {
       "mentality": 3
      },
      "tr": 7
     },
     "good"
    ],
    [
     "带他一起练投篮",
     "共同成长。",
     {
      "a": {
       "shooting": 1
      },
      "tr": 4
     },
     "good"
    ],
    [
     "不想多谈这个话题",
     "错过连接。",
     {
      "tr": -2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "季后赛数据又被拿出来对比",
   "b": "常规赛全能、季后赛缩水——这个模式又被提起了。",
   "c": [
    [
     "我要在季后赛证明自己",
     "动力与自信提升。",
     {
      "c": 5,
      "s": 5
     },
     "good"
    ],
    [
     "专注球队胜利",
     "团队信任提升。",
     {
      "tr": 7,
      "a": {
       "mentality": 2
      }
     },
     "good"
    ],
    [
     "被舆论影响状态",
     "心态下滑。",
     {
      "c": -6,
      "s": -3
     },
     "bad"
    ]
   ]
  },
  {
   "t": "你的合同进入最后一年",
   "b": "这一年决定下一份合同的级别。",
   "c": [
    [
     "打出最好的赛季",
     "状态与自信提升。",
     {
      "c": 4,
      "s": 4,
      "a": {
       "defense": 1
      }
     },
     "good"
    ],
    [
     "全面提升自己的价值",
     "均衡成长。",
     {
      "a": {
       "defense": 1,
       "playmaking": 1
      }
     },
     "good"
    ],
    [
     "开始担心未来",
     "心态受影响。",
     {
      "c": -5,
      "tr": -2
     },
     "bad"
    ]
   ]
  },
  {
   "t": "一位老将告诉你：你缺的不是天赋",
   "b": "“你缺的是愿不愿意承担失败。”",
   "c": [
    [
     "我把这句话记住",
     "心态成熟。",
     {
      "a": {
       "mentality": 3
      },
      "c": 4
     },
     "good"
    ],
    [
     "我需要时间消化",
     "稳步调整。",
     {
      "a": {
       "mentality": 1
      },
      "c": 2
     },
     "good"
    ],
    [
     "我觉得他在说教",
     "错过提醒。",
     {
      "c": -3,
      "tr": -2
     },
     "bad"
    ]
   ]
  }
 ]
};


/* 事件池走完后的兜底事件：12 个处境剧本按赛季轮换，标题带年龄，
   因此同一处境隔年再出现时读起来也是「又老了一岁的那件事」，不会变成同一段重播。 */
const V30_FALLBACK=[
 {k:"camp",    lead:"训练营名单上，你的名字滑到了第三阵容"},
 {k:"contract",lead:"经纪人打来电话，这次谈的是底薪"},
 {k:"bench",   lead:"垃圾时间上场 4 分钟，数据栏是空的"},
 {k:"young",   lead:"一个比你小十岁的新秀抢走了你的时间"},
 {k:"media",   lead:"一篇回顾文章把你写进了失败案例"},
 {k:"body",    lead:"早上醒来，身体第一次明确告诉你它不想再打了"},
 {k:"trade",   lead:"你的名字出现在交易流言的最后一行"},
 {k:"gym",     lead:"休赛期球馆里，只剩你和一个训练师"},
 {k:"hometown",lead:"回到当年选中你的那座城市，球迷还记得你"},
 {k:"call",    lead:"一位老队友退役了，打电话来劝你也想清楚"},
 {k:"agent",   lead:"经纪人问你：要不要趁还能打，去一支争冠球队做最后一块拼图"},
 {k:"mirror",  lead:"你看着更衣室镜子里的自己，第一次认真算了算还剩几年"}
];
function v30FallbackEvent(){
  let c=v30LateContext(),d=career.v30.decline;
  let idx=(career.seasonNo-1)%V30_FALLBACK.length;
  let picked=V30_FALLBACK[idx];
  let title=`${c.age}岁 · ${picked.lead}`;
  let tpl={
    camp:`助理教练念名单时，你的名字排在很后面。他给年轻球员讲战术，讲到你那个位置时只说了一句“老将经验”。`,
    contract:`经纪人的语气比往年谨慎：市场上没有球队愿意给你保障合同。他问你，要不要先接一份底薪留在联盟里。`,
    bench:`第四节最后 4 分钟你才上场。两次出手都没进，一次防守被过。终场哨响，没有人看你。`,
    young:`球队用首轮签选来的年轻人在训练里连续在你头上得分。教练组开始把原本属于你的时间给他。`,
    media:`一篇“重新审视历年状元”的专题把你放在失败案例第一位，最后一句是：“他后来就慢慢消失了。”`,
    body:`背靠背第二天的早上，膝盖和腰一起疼。队医说可以打，但你自己知道，这是在用后面的日子换今天。`,
    trade:`交易截止日前，流言里出现了你的名字，排在最后一行，后面跟着一个次轮签。`,
    gym:`休赛期的球馆空无一人，只有你和训练师。你练的还是那些最基础的东西。`,
    hometown:`你回到当年选中你的那座城市打客场。热身时有球迷喊你的名字，声音不大，但你听见了。`,
    call:`一个老队友宣布退役，打电话来问你打算怎么办。你们聊了很久，谁也没先挂。`,
    agent:`经纪人把争冠球队的报价推过来：“他们缺一个更衣室里稳得住的人。可能是你最后一个冠军窗口。”`,
    mirror:`更衣室镜子里的自己，比选秀夜那天老了很多。你第一次认真算了算，自己还剩几年。`
  };
  let body=`${tpl[picked.k]}

此时此刻：${c.age}岁、生涯第 ${c.seasons} 个赛季、效力${c.team}、OVR ${c.ovr}、球队信任 ${career.trust}、健康 ${career.health}。已经拿到：${c.honorText}。`;
  return{_v30:true,_event:true,_longArc:true,_fallback:true,_season:career.seasonNo,
    t:title,scene:`${seasonLabel()} · ${c.team}`,speaker:"职业生涯",cast:["主教练","经纪人"],b:body,
    stakes:"这决定你还能在这个联盟里留多久，也决定这条世界线的结尾。",
    c:[
      ["用训练把位置抢回来","态度与信任提升，状态回升。",{tr:5,a:{mentality:2},c:2},"good"],
      ["接受现实，转做球队更需要的角色","角色稳定，生涯拉长。",{a:{mentality:2,durability:1},tr:3,h:4},"good"],
      ["我还能打，我要更多机会","争取空间，但消耗与风险都更大。",{c:3,a:{defense:1},h:-4,tr:-2},"bad"]
    ]};
}

/* ---------- 下滑与淡出 ---------- */
const V30_DECLINE_NAMES={
  bad:['状态下滑，轮换位置开始动摇','媒体开始讨论你的合同是不是溢价','球队把你放上交易名单','你不再出现在球队的长期计划里','你收到的报价一年比一年少'],
  fatal:'没有球队再给你稳定的位置。训练营合同、十天短约、发展联盟——你终于明白，联盟已经不再等你了。'
};

/* =====================================================================
   PART 3 · 状态与流程
   ===================================================================== */
function v30Init(){
  if(!career)return;
  career.v30=career.v30||{};
  let s=career.v30;
  s.usedKeys=s.usedKeys||{};
  s.route=s.route||null;
  s.decline=s.decline||{streak:0,active:false,rescue:0,stage:0};
  s.epIndex=s.epIndex||0;
  s.routeHistory=s.routeHistory||[];
  s.eventsSinceGood=s.eventsSinceGood||0;
  career.v30Season=career.v30Season||{games:{},wins:0,losses:0};
}
if(career){v30Init();save()}

function v30EndingStats(){
  let p=v30P(),h=career.honors||{};
  let honor=(h['全明星']||0)+(h['最佳阵容']||0)+(h['最佳防阵']||0)+(h['MVP']||0)*2+(h['总冠军']||0)*2+(h['FMVP']||0)*2+(h['DPOY']||0)+(h['MIP']||0);
  return{
    ovr:career.ovr||0,seasons:career.careerTotals?.seasons||0,honor,
    special:career.special||0,health:career.health||0,
    attrsShooting:career.attrs?.shooting||0,attrsPlaymaking:career.attrs?.playmaking||0,
    attrsDefense:career.attrs?.defense||0,team:career.team,age:career.age
  };
}
/* 结局：专属主线按路线 + 荣誉；未解锁玩家按是否重走老路 */
function v30Ending(){
  let p=v30P(),list=V30_ENDINGS[p]||[],s=v30EndingStats(),route=v30TopRoute();
  if(!career)return['职业生涯结束',''];
  if(!career.exclusive){
    if(career.v30?.faded)return['重走了那位状元的老路',`和原本那条轨迹几乎一模一样：打了一段时间，就再也没有人认真讨论你了。${career.retireReason||''}`];
    if(s.seasons<=4&&s.ovr<76)return['淡出联盟',`你没能在这条世界线里站稳。几年之后，人们提起你时用的还是那句“当年的状元”。`];
    return['纯模拟生涯结束',`这一局你没有解锁专属主线。你以 ${s.ovr} 的评分结束了 ${s.seasons} 个赛季的生涯。`];
  }
  let hit=list.find(x=>{try{return x.w(s)}catch(e){return false}});
  let base=hit?[hit.t,hit.d]:['生涯结束','这条世界线走到这里。'];
  return[`${base[0]}｜${route?v30RouteLabel(route):'未定路线'}`,base[1]];
}

/* 触发一段路线分支剧情（不重复：用完的 episode 不再出现） */
function v30NextEpisode(){
  v30Init();
  let p=v30P(),byRoute=V30_EPS[p];if(!byRoute)return null;
  let score=v30RouteScore(),routes=Object.keys(byRoute);
  if(!routes.length)return null;
  let order=routes.slice().sort((a,b)=>(score[b]||0)-(score[a]||0));
  let s=career.v30;
  for(let r of order){
    let eps=byRoute[r]||[];
    for(let i=0;i<eps.length;i++){
      let key=`${p}:${r}:${i}`;
      if(!s.usedKeys[key])return{route:r,ep:eps[i],key};
    }
  }
  return null; /* 池子用完：后续交给结局收束，不再重复同一段剧情 */
}

/* =====================================================================
   PART 4 · 接管剧情触发与选择
   ===================================================================== */
/* 专属主线：先走原有 6 章核心章节（被改写为“承接前文”的连续版本），
   再进入按路线分叉、不重复的生涯长线剧情；未解锁玩家走随机事件。 */
const __v30MaybeStory=maybeStory;
maybeStory=function(){
  if(!career||career.retired)return false;
  if(career.stage!=='regular'||ui.storyEvent||ui.modal)return false;
  v30Init();

  /* --- 未解锁专属主线：赛季随机事件 + 下滑 --- */
  if(!career.exclusive){
    if(career.games<14)return false;
    let per=career.v30.eventPerSeason||0;
    let target=per===0?1:per===1?40:99;
    if(career.games>=target){
      let pool=V30_EVENTS[career.playerId]||[];
      let avail=pool.map((e,i)=>({e,i})).filter(x=>!career.v30.usedKeys[`ev:${career.playerId}:${x.i}`]);
      if(!avail.length){
        /* 池子用完：每季只给一次兜底处境，保证仍有抉择且不刷屏 */
        career.v30.eventPerSeason=2;
        stopSim();ui.storyEvent=v30FallbackEvent();save();render();return true;
      }
      let pickIdx=Math.floor(Math.random()*avail.length);
      let chosen=avail[pickIdx];
      career.v30.usedKeys[`ev:${career.playerId}:${chosen.i}`]=1;
      career.v30.eventPerSeason=per+1;
      let e=Object.assign({},chosen.e,{_v30:true,_event:true,_longArc:true,_season:career.seasonNo});
      stopSim();ui.storyEvent=e;save();render();return true;
    }
    return false;
  }

  /* --- 已解锁专属主线：完成原有 6 章后，进入路线长线剧情 --- */
  let arr=campaigns[career.playerId]||[];
  if(career.storyIndex<arr.length){
    if(storyReady(career.storyIndex)){
      stopSim();
      ui.storyEvent=v30Reframe(arr[career.storyIndex]);
      save();render();return true;
    }
    return false;
  }
  /* 核心章节完成 → 按路线走长线剧情，不重复 */
  let per=career.v30.sagaPerSeason||0;
  let target2=per===0?20:per===1?60:99;
  if(career.games>=target2){
    /* 1) 先走按路线分叉的分支剧情 */
    let pick=v30NextEpisode();
    if(pick){
      career.v30.usedKeys[pick.key]=1;
      career.v30.sagaPerSeason=per+1;
      career.v30.route=pick.route;
      stopSim();ui.storyEvent=v30BuildSagaEvent(pick);save();render();return true;
    }
    /* 2) 分支走完 → 生涯后段弧线（5 个阶段，每阶段只出现一次，文案带入真实处境） */
    /* 12–15 赛季节奏：后段弧线从第 10 季才开启，避免前几季一口气走完。 */
    let late=(career.seasonNo>=10)?v30NextLateStage():null;
    if(late){
      let e=v30BuildLateEvent(late);
      if(e){
        career.v30.usedKeys[late.key]=1;
        career.v30.sagaPerSeason=per+1;
        career.v30.lateStage=late.stage.k;
        stopSim();ui.storyEvent=e;save();render();return true;
      }
    }
  }
  return false;
};

/* 给核心章节加上“承接上一段选择”的开场，形成连续感而不是每章独立 */
function v30Reframe(ev){
  let o=Object.assign({},ev);
  let last=v30LastRec();
  if(last&&last.choice){
    let head=`上一段你选择了「${last.choice}」。`;
    if(typeof o.b==='string')o.b=head+o.b;
    o._v30=true;o._reframed=true;
  }
  return o;
}

/* 把一段路线剧情组装成事件（文案里带入玩家真实处境与前一次选择，保证连贯） */
function v30BuildSagaEvent(pick){
  let ep=pick.ep,routeLabel=v30RouteLabel(pick.route),last=v30LastRec();
  let lead=last&&last.choice?`你上一步选择了「${last.choice}」，这条世界线继续沿着「${routeLabel}」往前。`:'';
  return{
    _v30:true,_saga:true,_longArc:true,_route:pick.route,_key:pick.key,
    t:ep.t,scene:ep.scene,speaker:ep.speaker,cast:ep.cast,
    b:lead+ep.b,
    stakes:ep.stakes,
    c:ep.c.map((x,i)=>{
      let eff=Object.assign({},x[2]||{});
      let target=v30OptionRoute(v30P(),pick.route,i);
      let prefix=(V30_ROUTE_FLAG[v30P()]||{})[target];
      let oldFlags=(x[2]&&x[2].flags)||[];
      let keep=oldFlags.filter(f=>{let k=Array.isArray(f)?f[0]:f;return !V30_FLAG_ROUTE[v30P()]||!V30_FLAG_ROUTE[v30P()][k]});
      let tag=(oldFlags[0]&&oldFlags[0][1])||(opt+i);
      eff.flags=prefix?[[prefix,tag]].concat(keep):oldFlags;
      eff._v30route=target;
      return [x[0],x[1],eff];
    })
  };
}


/* 选择落定：记录路线、处理随机事件的后果与下滑 */
const __v30StoryChoice=(typeof storyChoice==='function')?storyChoice:null;
if(__v30StoryChoice){
  storyChoice=function(i){
    let raw=ui.storyEvent,isEvent=raw&&raw._event,isSaga=raw&&raw._saga;
    let effect=raw&&raw.c&&raw.c[i]?raw.c[i][2]:null;
    __v30StoryChoice(i);
    if(!career||career.retired){return}
    v30Init();
    let s=career.v30;
    if(isSaga){
      /* 玩家这次的取向优先于本段所属分支：选择真的决定下一段走哪条路 */
      let picked=v30PickedRoute(effect);
      s.route=picked||raw._route||s.route;
      if(picked){s.routeHistory.push(picked);if(s.routeHistory.length>24)s.routeHistory.shift()}
      /* 同步写入 storyFlags：让旧的剧情卡片/结局判定也能读到这次取向 */
      try{
        let prefix=(V30_ROUTE_FLAG[v30P()]||{})[picked]||null;
        if(prefix){career.storyFlags=career.storyFlags||{};career.storyFlags[prefix]=raw.c[i][0].slice(0,12)}
      }catch(e){}
      try{ui.toast=`「${raw.c[i][0]}」→ 世界线走向「${v30RouteLabel(s.route)}」`;}catch(e){}
      s.lastSagaKey=raw._key;
      career.feed.unshift(`生涯主线「${raw.t}」：你选择了“${raw.c[i][0]}”，世界线继续朝「${v30RouteLabel(s.route)}」推进。`);
      let recs=career.storyLog||[];
      if(recs.length){let lastRec=recs[recs.length-1];lastRec.v30Saga=true;lastRec.routeLabel=v30RouteLabel(s.route);
        let inSeason=(recs.filter(x=>x.seasonNo===career.seasonNo&&x.v30Saga)||[]).length;
        lastRec.v220SeasonEpisode=Math.min(2,inSeason);}
      career.v30.sagaCount=(career.v30.sagaCount||0)+1;
    }
    if(isEvent){
      let quality=(raw.c[i][3]||'neutral');
      if(quality==='bad'){
        try{ui.toast=`「${raw.c[i][0]}」→ 状态下滑（连续失误 ${s.decline.streak+1}/3）`;}catch(e){}
        s.decline.streak++;
        s.eventsSinceGood=0;
        career.feed.unshift(`随机事件「${raw.t}」：你选了“${raw.c[i][0]}”，状态出现波动。`);
        if(s.decline.streak>=3&&!s.decline.active){
          s.decline.active=true;s.decline.rescue=2;s.decline.stage=0;
          v30Pop('生涯警报 · 进入下滑通道',`连续 ${s.decline.streak} 次判断失误，你正在重走这位状元的老路。还有 2 个赛季可以救回来。`);
          career.feed.unshift('你连续做出不利选择，生涯进入下滑通道。');
        }
      }else if(quality==='good'){
        try{ui.toast=`「${raw.c[i][0]}」→ 生涯稳住`;}catch(e){}
        s.decline.streak=0;s.eventsSinceGood++;
        career.feed.unshift(`随机事件「${raw.t}」：你选了“${raw.c[i][0]}”，状态稳住了。`);
        if(s.decline.active&&s.eventsSinceGood>=2){
          s.decline.active=false;s.decline.rescue=0;s.decline.stage=0;
          v30Pop('下滑止住','你连续做对了选择，生涯重新稳住。');
          career.feed.unshift('你止住了下滑，重新回到稳定轨道。');
        }
      }
      /* 事件已消费，避免同季重复弹 */
      career.lastStoryGame=career.games;
    }
    save();
  };
}

function v30Pop(title,body){
  try{if(typeof window.v222Pop==='function')window.v222Pop(title,body)}catch(e){}
  try{if(typeof ui!=='undefined'){ui.toast=title;render()}}catch(e){}
}

/* ---------- 赛季推进时结算下滑 ---------- */
const __v30NextSeasonDecline=nextSeason;
nextSeason=function(){
  let hadActive=career&&career.v30&&career.v30.decline&&career.v30.decline.active;
  __v30NextSeasonDecline();
  if(!career||career.retired)return;
  v30Init();
  let s=career.v30;
  s.eventPerSeason=0;s.sagaPerSeason=0;
  if(!s.decline.active)return;
  /* 下滑通道：每季能力与信任下降，挽救窗口递减 */
  s.decline.stage++;
  let st=s.decline.stage;
  let hit=V30_DECLINE_NAMES.bad[Math.min(st-1,V30_DECLINE_NAMES.bad.length-1)];
  ['athleticism','finishing','defense','durability'].forEach(k=>{if(career.attrs[k]!=null)career.attrs[k]=v30Clamp(career.attrs[k]-2,30,99)});
  career.trust=v30Clamp((career.trust||50)-6);
  career.confidence=v30Clamp((career.confidence||60)-5);
  s.decline.rescue--;
  career.feed.unshift(`生涯下滑（第 ${st} 年）：${hit}。`);
  if(typeof syncOvr==='function')syncOvr();
  v30Pop('生涯下滑',`${hit}。剩余挽救窗口：${Math.max(0,s.decline.rescue)} 个赛季。`);
  if(career.playerId!=='custom'&&(s.decline.rescue<=0||career.ovr<72)){
    career.v30.faded=true;
    save();
    retire(V30_DECLINE_NAMES.fatal);
    return;
  }
  save();render();
};

/* ---------- 结局展示：退役页接入专属结局 ---------- */
mainlineEnding=function(){return v30Ending()};

const __v30RenderRetired=renderRetired;
renderRetired=function(){
  let h=__v30RenderRetired();
  if(!career)return h;
  /* 自建球员使用 161 的「名字的回声」结局，不再叠加原版状元的淡出/专属结局。 */
  if(career.playerId==='custom')return h;
  let ended=v30Ending(),route=v30TopRoute();
  let box=`<section class="ending-top v177-star-ending"><small class="ending-kicker">生涯结局</small><div class="ending-tag">${career.exclusive?'专属故事结局':'纯生涯结局'}</div><h2 class="ending-title">「${esc(ended[0])}」</h2><div class="ending-text"><p>${esc(ended[1])}</p></div>${career.exclusive?`<div class="v30-ending-meta"><span>最终路线：${esc(v30RouteLabel(route))}</span><span>核心章节：${Math.min(career.storyIndex,(campaigns[career.playerId]||[]).length)}/${(campaigns[career.playerId]||[]).length}</span><span>剧情节点：${(career.storyLog||[]).length} 个</span></div>`:''}</section>`;
  if(h.indexOf('</h1>')>=0)return h.replace('</h1>','</h1>'+box);
  if(h.indexOf('<div class="legacy-score">')>=0)return h.replace('<div class="legacy-score">',box+'<div class="legacy-score">');
  return h.replace('</div></section>',box+'</div></section>');
};

/* ---------- 主线页：显示连续故事与下滑状态 ---------- */
const __v30StoryView=storyView;
storyView=function(){
  let h=__v30StoryView();
  if(!career)return h;
  v30Init();
  let s=career.v30,route=v30TopRoute(),extra='';
  if(career.exclusive){
    let pool=V30_EPS[career.playerId]||{},total=0,done=0;
    Object.keys(pool).forEach(r=>{pool[r].forEach((_,i)=>{total++;if(s.usedKeys[`${career.playerId}:${r}:${i}`])done++})});
    extra=`<section class="v30-legend"><header><small>LIFELONG BRANCHING SAGA</small><h3>你的传奇还在继续</h3></header><p>核心六章已经把你的世界线推到了「${esc(v30RouteLabel(route))}」。从这里开始，每一段故事都由你之前的选择决定，而且不会重复——同一个选择不会再来第二次。</p><div class="v30-legend-grid"><div><b>${esc(v30RouteLabel(route))}</b><span>当前路线</span></div><div><b>${done}/${total||0}</b><span>已走过分支</span></div><div><b>${(career.storyLog||[]).length}</b><span>累计选择</span></div></div>${s.lastSagaKey?'':'<p class="v30-tip">继续推进赛季，下一段主线会在第 20 场前后出现。</p>'}</section>`;
  }else{
    let d=s.decline;
    extra=`<section class="v30-legend v30-locked-note"><header><small>纯生涯模拟</small><h3>本局没有解锁专属主线</h3></header><p>你仍然会遇到赛季随机事件。它们看起来是小事，但连续选错会让你一步步走回这位状元的老路。</p><div class="v30-legend-grid"><div><b>${d.streak}/3</b><span>连续失误</span></div><div><b>${d.active?'下滑中':'正常'}</b><span>生涯状态</span></div><div><b>${d.active?Math.max(0,d.rescue):'—'}</b><span>挽救窗口</span></div></div></section>`;
  }
  return extra+h;
};

/* 下滑状态卡：放在常规赛页面，让玩家随时看得到 */
const __v30RegularView=regularView;
regularView=function(){
  let h=__v30RegularView();
  if(!career||career.stage!=='regular')return h;
  v30Init();
  let s=career.v30;
  if(career.exclusive){
    let card=`<section class="v30-route-card"><small>当前路线</small><b>${esc(v30RouteLabel(v30TopRoute()))}</b><span>后续剧情会沿着这条路继续，不重复。</span></section>`;
    return h+card;
  }
  let d=s.decline;
  let cls=d.active?'declining':'stable';
  let card=`<section class="v30-route-card ${cls}"><small>生涯状态</small><b>${d.active?'下滑通道 · 正在重走老路':'稳定'}</b><span>${d.active?`连续失误 ${d.streak} 次，剩余挽救窗口 ${Math.max(0,d.rescue)} 个赛季。选对事件可以止住下滑。`:`连续失误 ${d.streak}/3。连续错 3 次会进入下滑通道。`}</span></section>`;
  return h+card;
};

/* =====================================================================
   PART 5 · 样式
   ===================================================================== */
const st30=document.createElement('style');
st30.textContent=`
.v30-route-card{margin:10px 0;padding:11px 12px;border-radius:18px;background:linear-gradient(145deg,#fff8ee,#fff);border:1px solid #ecdcC8;box-shadow:0 8px 20px rgba(96,64,40,.06)}
.v30-route-card small{display:block;font-size:7.5px;color:#a5836a;letter-spacing:.08em}
.v30-route-card b{display:block;font-size:13.5px;margin:3px 0}
.v30-route-card span{display:block;font-size:8.5px;line-height:1.55;color:#8a7566}
.v30-route-card.declining{background:linear-gradient(145deg,#fff0ee,#fff);border-color:#f0c7bd}
.v30-route-card.declining b{color:#c1493c}
.v30-route-card.stable b{color:#2f8a56}
.v30-legend{margin:10px 0;padding:13px;border-radius:22px;background:linear-gradient(145deg,#1d1a26,#3b2b4e 58%,#8c4a30);color:#fff;box-shadow:0 16px 36px rgba(46,31,63,.20)}
.v30-legend header small{font-size:7.5px;color:#d9c9ff;letter-spacing:.1em}
.v30-legend header h3{font-size:16px;margin:4px 0 6px}
.v30-legend p{font-size:9px;line-height:1.7;color:#eee6f7;margin:0 0 8px}
.v30-legend-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
.v30-legend-grid>div{background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.14);border-radius:13px;padding:8px}
.v30-legend-grid b{display:block;font-size:11.5px;color:#ffd66b}
.v30-legend-grid span{font-size:7.5px;color:#e6dcf0;line-height:1.4}
.v30-tip{font-size:8px!important;color:#ffd9a8!important}
.v30-locked-note{background:linear-gradient(145deg,#241f2c,#3a3346 60%,#5d4a3f)}
.v30-ending{margin:11px 0;padding:13px;border-radius:20px;background:linear-gradient(145deg,#fff8e8,#fff);border:1px solid #ead2a4}
.v30-ending small{font-size:7.5px;color:#a5773e;letter-spacing:.1em}
.v30-ending h3{font-size:17px;margin:5px 0}
.v30-ending p{font-size:9.5px;line-height:1.75;color:#6f6156;margin:0}
.v30-ending-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:9px}
.v30-ending-meta span{font-size:8px;background:#212730;border:1px solid #2f3742;border-radius:10px;padding:7px 6px;color:#d3a66f;text-align:center;line-height:1.4}
`;
document.head.appendChild(st30);

/* =====================================================================
   PART 6 · 全局自动推进钩子（含全明星后自动继续）
   ===================================================================== */
const __v30Render=render;
render=function(){
  __v30Render();
  /* 常规赛不再自动开跑；模拟由玩家点“开始模拟”或“模拟下一场”控制。 */
};

if(career){v30Init();if(typeof window.v221Migrate==='function')window.v221Migrate();save();render()}

})();

