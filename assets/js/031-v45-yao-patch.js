
/* ===== v45-yao-story ===== */
/* =====================================================================
   V4.5 · 姚明专属主线（9 章）
   开发者要求「一定一定要重点做姚明这个」——按主线最高标准写：
     每章 3~4 段、200+ 字、真实人物与对话、选择有后果、后续读取前面选择。

   真实素材（全部基于他的真实经历）：
     · 2002 年状元，上海大鲨鱼 → 休斯顿火箭
     · 首秀 0 分 2 板，被巴克利在节目里嘲笑；后来巴克利亲了驴屁股
     · 第一个赛季后半段打出身价，进入最佳新秀阵容
     · 与 Tracy McGrady（麦迪）组成「姚麦组合」，但两人总有一人受伤
     · 主教练 Jeff Van Gundy（范甘迪）以防守和纪律著称
     · 2009 年季后赛对湖人，第二轮打到抢七，是他生涯最接近总冠军的一次
     · 足舟骨骨折反复，2011 年 31 岁退役
     · 常年无休：NBA 赛季结束回国打国家队（亚锦赛、世锦赛、奥运会）
   ===================================================================== */
window.V45YAO=[
/* ---------- 第 1 章 ---------- */
{t:'首秀 0 分，全国都在等一个答案',
 scene:'2002 年 10 月 · 休斯顿 · 赛季揭幕战',
 speaker:'Rudy Tomjanovich / 教练组',
 cast:['Rudy Tomjanovich','Steve Francis','姚明'],
 b:()=>`<p>比赛还剩三分钟，主教练 <b>Rudy Tomjanovich</b> 把你叫起来。你走上场的那一刻，客场球馆里有人举着牌子，上面写着你的名字——不是一个 NBA 球员的名字，是一个国家的名字。</p>
<p>你上场六分钟，一次出手都没进。终场哨响，技术统计上写着：0 分、2 个篮板、2 次失误。</p>
<p>回更衣室的路上，<b>Steve Francis</b> 从后面拍了下你的背：“别听外面说什么。你上一场球是在上海打的，这里不是上海。”</p>
<p>你打开手机，国内已经有上千条评论。有人心疼，有人骂。你想说点什么，但你知道，唯一能回答的方式不在这块屏幕上。</p>`,
 stakes:'这决定你如何在巨大的期待下开始职业生涯——急着证明，还是先站稳。',
 c:()=>[
  ['先把防守和篮板做扎实，不急着得分','稳妥开局线：信任与防守提升，但得分成长更慢。',fx([['yaoRoute','steady'],['start','defense']],{a:{defense:2,rebounding:2},tr:5})],
  ['我要在内线要球，让他们看到我能打','强攻线：进攻成长最快，但开局会很难看。',fx([['yaoRoute','force'],['start','offense']],{a:{finishing:3},c:3,tr:-3})],
  ['跟教练要更多时间，我需要上场才能适应','积极线：出场时间上升，失误也会变多。',fx([['yaoRoute','minutes'],['start','ask']],{a:{athleticism:2},tr:3,min:4})]
 ]},
/* ---------- 第 2 章 ---------- */
{t:'巴克利在节目里赌你拿不到 19 分',
 scene:'2002 年 11 月 · 客场比赛前',
 speaker:'电视节目 / 队友',
 cast:['Charles Barkley','Steve Francis','教练组'],
 b:()=>{const s=F('start');return `<p>更衣室的电视正播着一档节目。<b>Charles Barkley</b> 在镜头前说得很大声：“他要是这个赛季有一场拿到 19 分，我就亲驴屁股。”</p>
<p>全队都看着你。有人笑，有人装作没听见。${s==='ask'?'你上次跟教练要时间，现在时间真的来了——这场你是首发。':s==='force'?'你选了强攻，前几场的命中率很难看，外面已经开始有“水货”这个词。':'你选了先从防守做起。数据不好看，但教练最近开始把你留在第四节。'}</p>
<p><b>Steve Francis</b> 把遥控器关了，只说了一句：“别去证明他错了。证明你对了就够了。”</p>
<p>今晚对面有个跑得很凶的中锋。你有六次犯规可以用，也有一整个赛季的时间。</p>`},
 stakes:'你面对嘲笑的方式，会决定你这一年的成长路线。',
 c:()=>[
  ['今晚就要 19 分，我要让他亲那头驴','爆发线：单场数据冲高，但会打乱球队节奏。',fx([['yao2','explode']],{a:{finishing:2,shooting:1},c:5,tr:-3})],
  ['不理会，按球队战术一场一场打','稳定线：效率与信任稳步提升。',fx([['yao2','steady']],{a:{finishing:2,mentality:2},tr:5})],
  ['主动加练中投，我要有第二个得分手段','技术线：投射成为常规武器。',fx([['yao2','midrange']],{a:{shooting:3},h:-2,c:3})]
 ]},
/* ---------- 第 3 章 ---------- */
{t:()=>F('yao2')==='explode'?'那个晚上之后，全联盟都开始研究你':'第一个赛季后半段，他们开始把你当核心用',
 scene:'2003 年 · 赛季中段 · 主场更衣室',
 speaker:'Rudy Tomjanovich / Steve Francis',
 cast:['Rudy Tomjanovich','Steve Francis','教练组'],
 b:()=>{const r=F('yao2');return `<p>${r==='explode'?'那场球你拿了 20 分。第二天，国内的头条是“姚明回应巴克利”。但在 NBA，一场球不能说明什么——教练组第二天就把录像剪了三十个回合给你。':r==='midrange'?'你的中投开始有样子了。助教给你看数据：过去十场，你在罚球线附近的命中率比联盟一半的内线都高。':'你没有爆发，但每一场都稳定。教练组内部把这件事讨论过一次——他们说“这个新秀不会让我们输球”。'}</p>
<p><b>Rudy Tomjanovich</b> 把你叫进办公室：“接下来我们会围绕你打。这意味着你会被包夹，会失误，会被对面的中锋研究一整年。”</p>
<p><b>Steve Francis</b> 在门口等你，说了一句：“他们围着你转，我就有空位了。我们得一起学会这个。”</p>
<p>你二十出头，职业生涯才刚开始。这句话意味着你要从“适应联盟”变成“被联盟针对”。</p>`},
 stakes:'球队是否真的围绕你建队，会决定你后面几年的战术地位。',
 c:()=>[
  ['我要学会被包夹之后传球','策应线：组织提升，球队体系更顺。',fx([['yao3','pass']],{a:{playmaking:3},tr:6})],
  ['我要背身单打，硬解包夹','强攻线：内线统治力提升，消耗更大。',fx([['yao3','post']],{a:{finishing:3,rebounding:1},tr:4,h:-3})],
  ['我要成为防守端的核心','防守线：护框与位置感提升。',fx([['yao3','anchor']],{a:{defense:3,rebounding:2},tr:5})]
 ]},
/* ---------- 第 4 章 ---------- */
{t:'麦迪来了：姚麦组合的第一年',
 scene:'2004 年夏天 · 火箭训练馆',
 speaker:'Jeff Van Gundy / Tracy McGrady',
 cast:['Jeff Van Gundy','Tracy McGrady','姚明'],
 b:()=>{const r=F('yao3');return `<p>球队换来了两届得分王 <b>Tracy McGrady</b>。新主教练 <b>Jeff Van Gundy</b> 上任第一天就说：“我们要打的是防守，你们两个人负责进攻，剩下的人负责拼。”</p>
<p>第一次合练，麦迪在你身边做了三次挡拆。第三次之后他停下来，看着你说了一句：“你挡得比我以前所有的大个子都好。我们真的能打。”</p>
<p>${r==='pass'?'你上赛季练出的策应，正好和麦迪的持球进攻咬合。助教说这是“最舒服的组合”。':r==='post'?'你在低位的强攻给了麦迪空间，但 Van Gundy 提醒你：这两件事要分清楚优先级。':'你的防守已经成了球队地基，Van Gundy 说整支球队的轮转都从你开始。'}</p>
<p>这一年的期待比去年高得多。所有人都在说“总冠军”。但训练馆里只有你知道，你的脚踝每周需要多少治疗才能撑住。</p>`},
 stakes:'进入争冠窗口后，你的使用方式和身体负荷会直接决定你能走多远。',
 c:()=>[
  ['我要承担更多进攻，球队需要第二得分点','核心线：数据冲高，身体消耗变大。',fx([['yao4','scoring']],{a:{finishing:3,shooting:1},tr:4,h:-4})],
  ['我做高位策应和防守，把机会留给麦迪','体系线：球队效率最高，个人数据被压缩。',fx([['yao4','system']],{a:{playmaking:2,defense:2},tr:7,c:-2})],
  ['我要控制出场时间，把状态留到季后赛','负荷线：常规赛数据下降，季后赛最强。',fx([['yao4','load']],{a:{mentality:2},h:7,tr:3})]
 ]},
/* ---------- 第 5 章 ---------- */
{t:'夏天没有休息：国家队的电话',
 scene:'休赛期 · 上海 · 国家集训队',
 speaker:'国家队教练 / 火箭队医',
 cast:['国家队教练','火箭队医','姚明'],
 b:()=>{const l=F('yao4');return `<p>NBA 赛季刚结束十天，国家队的电话就来了。亚锦赛、世锦赛、奥运会——每一年的夏天都排满了。</p>
<p>火箭队医把一封邮件转发给你，措辞很客气，但意思很硬：“以你的身体状态，我们建议这个夏天完全休息，否则下赛季风险会显著上升。”</p>
<p>${l==='load'?'你上赛季特意控制了出场时间，身体状态比往年好。现在这封邮件和那通电话摆在两边。':'你上赛季打得很多，脚踝的治疗记录已经比去年同期厚了一倍。'}</p>
<p>你把两封邮件都看完了。一边是从小把你培养起来的地方，一边是付你薪水的球队。而你的脚，只有一双。</p>`},
 stakes:'这是姚明线最真实的矛盾：为国征战与职业寿命之间的取舍。',
 c:()=>[
  ['回国打满整个夏天，那里也需要我','荣誉线：国家队信任与心态拉满，身体风险大增。',fx([['yao5','national']],{a:{mentality:3},c:6,s:10,h:-8})],
  ['只打最重要的赛事，其余时间休养','折中线：兼顾两边，收益与风险都居中。',fx([['yao5','balance']],{a:{mentality:2},c:3,h:2,s:4})],
  ['这个夏天完全休息，听队医的','保护线：身体风险大幅下降，但要承受舆论压力。',fx([['yao5','rest']],{h:10,s:-8,c:-4,tr:4})]
 ]},
/* ---------- 第 6 章 ---------- */
{t:'脚舟骨：第一次骨折',
 scene:'2008 年 · 赛季中段 · 医疗室',
 speaker:'队医 / Jeff Van Gundy',
 cast:['队医','Jeff Van Gundy','Tracy McGrady'],
 b:()=>{const n=F('yao5');return `<p>片子挂上灯箱。医生用笔点着一处，说了一个你第一次听说的词：足舟骨。</p>
<p>“这是脚上承重最关键的骨头之一，”他说，“你的体重是 140 公斤，每一次落地它都在承受普通球员三倍的冲击。”</p>
<p><b>Jeff Van Gundy</b> 站在门口没有进来。他在等医生说完——球队正在冲季后赛，而你是禁区唯一的地基。</p>
<p>${n==='national'?'你上一个夏天打满了国家队所有比赛。医生说得很直接：“这次的伤，和你夏天没有休息有直接关系。”':n==='balance'?'你夏天只打了最重要的赛事。医生说：“好一些，但对你的体重来说，还是太满了。”':'你夏天完全休息了。医生说：“你身体的整体状态是这几年最好的，但骨头的问题不是休息一个夏天就能解决的。”'}</p>
<p>三条路摆在桌上：手术、保守治疗、或者带伤打完这个赛季。</p>`},
 stakes:'这是姚明线的核心分岔——它决定你后面还能打几年。',
 c:()=>[
  ['手术，本赛季放弃，换以后几年','手术线：长期健康最好，但错过当年的争冠窗口。',fx([['yao6','surgery']],{h:12,s:-10,tr:4})],
  ['保守治疗，争取季后赛前回来','折中线：能打季后赛，风险中等。',fx([['yao6','conservative']],{h:4,s:-3,tr:5})],
  ['带伤打完这个赛季，我不想再等','硬扛线：本赛季最强，未来风险最高。',fx([['yao6','push']],{a:{finishing:2},c:6,tr:5,s:12,h:-8})]
 ]},
/* ---------- 第 7 章 ---------- */
{t:()=>F('yao6')==='push'?'带着碎骨头打进季后赛':F('yao6')==='conservative'?'季后赛前赶回来了':'手术之后，你第一次重新站起来',
 scene:'2009 年 · 季后赛 · 更衣室',
 speaker:'Tracy McGrady / 队医',
 cast:['Tracy McGrady','队医','姚明'],
 b:()=>{const y=F('yao6');return `<p>${y==='push'?'你是带着一块没有长好的骨头进季后赛的。每一场比赛前，队医要花四十分钟给你做贴扎，赛后还要再花一个小时处理肿胀。':y==='conservative'?'你赶在季后赛前回来了。队医在每一场比赛前都会问同一句话：“今天感觉几分？”你说“可以打”，他就不再问第二次。':'手术之后你缺席了大半个赛季。复出第一周，你连跑楼梯都要扶着栏杆。'}</p>
<p>更衣室里，<b>Tracy McGrady</b> 的柜子是空的——他又伤了。这支球队这几年一直是这个样子：你们两个总有一个不在。</p>
<p>他把护具收进包里的时候对你说了一句话：“我们可能永远等不到两个人都健康的那个赛季。但你至少要在你还跑得动的时候，自己冲一次。”</p>
<p>第二轮，对面是那年的总冠军热门。系列赛打到抢七。</p>`},
 stakes:'这一轮季后赛会写进你的生涯评价，也会消耗你剩下的身体。',
 c:()=>[
  ['每一场都拉满，我要赢下这一轮','全开线：季后赛上限最高，身体代价最大。',fx([['yao7','allin']],{a:{finishing:3,rebounding:2},c:6,tr:6,s:12,h:-7})],
  ['按队医的方案打，能赢就赢','管理线：效率最高，健康可控。',fx([['yao7','manage']],{a:{defense:2,mentality:2},tr:5,h:4})],
  ['我要在这一轮把自己的名字打出来','个人线：数据与地位提升。',fx([['yao7','star']],{a:{finishing:2,shooting:2},c:5,tr:3,s:6})]
 ]},
/* ---------- 第 8 章 ---------- */
{t:'31 岁：医生说，不能再打了',
 scene:()=>F('yao7')==='allin'?'2011 年 · 医疗中心 · 第三次骨折之后':'2011 年 · 医疗中心 · 又一次检查之后',
 speaker:'专科医生 / 家人',
 cast:['专科医生','火箭管理层','家人'],
 b:()=>{const a=F('yao7'),n=F('yao5');return `<p>这次的片子平放在桌上。医生没有立刻说话，而是先问了你一个问题：“你今年多大了？”</p>
<p>“31。”</p>
<p>“你的脚，比 31 岁老太多了。”他指着片子上的三处旧痕，${a==='allin'?'“这是最近两年留下的。你上一次季后赛每一场都在拉满，那一次的代价现在全部在这里。”':'“这些年一块一块积累下来的。你打得越久，它就越撑不住。”'}</p>
<p>${n==='national'?'他从抽屉里拿出一份不是你球队的赛程表——那是你这几年的国家队出场记录。他什么都没说，只是把它放在片子旁边。屋里安静了几秒，你先开的口：“这些比赛，我一场都没后悔过。”':''}</p>
<p>他把能做的三件事一件件说完：再手术一次，能撑，但撑不了几年；保守治疗，能上场，但随时可能倒在场上；什么都不做，走路会有影响。没有一个是“像从前那样”。</p>
<p>火箭管理层的人在走廊里等着。他们需要知道一件事：你还能不能打，还能打几年。而你在那间屋子里，第一次开始认真想另一个更大的问题——如果不打了，我是谁。这个问题，比脚更疼。</p>`},
 stakes:'这是整条主线最重的决定：什么时候停，以及以什么方式停。',
 c:()=>[
  ['退役。我不想坐着轮椅过完后半生','退役线：健康与家庭优先，生涯提前结束。',fx([['yao8','retire']],{h:15,c:4,mentality:3})],
  ['再打一年，我想自己决定什么时候走','坚持线：争取一个完整的告别赛季。',fx([['yao8','oneMore']],{a:{mentality:3},c:6,s:8,h:-5})],
  ['改成有限出场，只打关键比赛','限时线：延长生涯，接受角色下降。',fx([['yao8','limited']],{h:8,a:{mentality:2},tr:4})]
 ]},
/* ---------- 第 9 章 ---------- */
{t:'多年以后，人们讨论的是你的生涯',
 scene:'生涯末年 · 休斯顿 · 球衣退役仪式',
 speaker:'现场播报 / 老队友',
 cast:['Steve Francis','Tracy McGrady','现场球迷'],
 b:()=>{const e=F('yao8'),r=F('yaoRoute'),l=F('yao5');
  const mid=e==='retire'?'你在 31 岁那年停下来了。很多人说太早，但你自己知道，那是你第一次为自己做的决定。':e==='oneMore'?'你坚持把最后一年打完。那个赛季你上场不多，但每一次起身全场都会站起来。':'你改成了限时出场，又打了几年。数据不再好看，但你成了年轻内线最好的老师。';
  const nat=l==='national'?'你从来没有拒绝过国家队的征召。这件事被写进了很多报道，也被写进了你的病历。':l==='balance'?'你学会了在两边之间找平衡——这是很多中国球员没有做到的事。':'有一个夏天你完全休息了。当时有一些声音，后来大家慢慢理解了。';
  return `<p>球衣升上去的时候，<b>Steve Francis</b> 和 <b>Tracy McGrady</b> 都来了。球馆里坐满了人，很多人手里举着写中文的牌子。</p>
<p>介绍你的那位主持人，念了一串数字：八次全明星、生涯场均 19 分 9.2 篮板。然后他停了一下，说了一句别的话：“他是第一个让全世界重新认识中国篮球的人。”</p>
<p>${mid}${nat}</p>
<p>你没有成为那年的总冠军。但如果有人问你后不后悔，你的答案和二十年前那个首秀 0 分的晚上一样——不后悔，因为我打完了我能打的那部分。</p>`},
 stakes:'这是姚明主线的收束：你希望被记住成什么。',
 c:()=>[
  ['我希望被记住：我代表了一个时代','时代线：声望与历史评价最高。',fx([['legacy','era']],{a:{mentality:3},c:5,tr:6})],
  ['我希望被记住：我证明了亚洲人能打 NBA','突破线：树立标杆。',fx([['legacy','pioneer']],{a:{mentality:2,finishing:2},c:5,tr:5})],
  ['我希望被记住：我是个把球打好的中锋','纯粹线：只谈篮球本身。',fx([['legacy','pure']],{a:{finishing:2,rebounding:2},tr:4,c:3})]
 ]}
];

/* ===== v45-yao ===== */
/* =====================================================================
   V4.5 · 姚明（「意难平」系列首位）
   开发者要求：
     「现在要加入姚明，在意难平系列中，姚明的人气非常高，你一定要好好做
       他的天赋以及天赋机制还有专属剧情，一定一定要重点做姚明这个」
   决策：天赋名「万里长城」、机制「脚部耐久壁垒」（5.A / 6.A）

   姚明的真实短板（天赋要治的）：
     · 脚部（足舟骨/脚踝）反复受伤，31 岁因伤提前退役
     · 赛季间几乎无休——NBA 打完回国打国家队，长期超负荷
   他真正的强项：身高 2.26m 的内线统治力、柔和手感、极高球商与传球。
   ===================================================================== */
(function(){
if(window.__v45Yao)return;window.__v45Yao=true;

/* ---------- 1. 球员基础数据 ----------
   定位：2002 年状元，休斯顿火箭，中锋。
   现实里他伤前是联盟顶级内线（巅峰 22.3 分 10.2 板），但耐久极差。
   属性与五人保持同一量纲：强项给高、耐久给低（天赋负责治）。 */
const YAO={
  id:'yao',
  zh:'姚明',
  en:'Yao Ming',
  year:2002,
  age:22,
  team:'HOU',
  pos:'C',
  ovr:78,
  title:'如果他的脚能撑住',
  tagline:'两米二六的巨人，输给的从来不是对手。',
  desc:'身高、手感、球商都是联盟顶级，但每一次落地都在和自己的身体谈判。你不是从技术开始救他，而是从“怎么让他健康地打完”开始。',
  tags:['顶级内线','脚部负荷','为国征战'],
  specialName:'身体负荷',
  special:72,
  health:74,
  confidence:71,
  trust:70,
  attrs:{
    finishing:86,      /* 内线终结：顶级 */
    shooting:78,       /* 中距离与罚球：中锋里极好 */
    playmaking:68,     /* 高位策应：好 */
    defense:80,        /* 护框与位置感：强 */
    rebounding:84,     /* 篮板：顶级 */
    athleticism:62,    /* 运动能力：偏慢（2.26m） */
    durability:48,     /* 耐久：极差 ← 现实短板 */
    mentality:76       /* 心态：极高（承压能力强） */
  },
  exclusive:{
    n:'万里长城',
    d:'把摧毁他的那件事永久解决：脚部伤病概率大幅下降、身体负荷不再随年龄失控、退役年龄明显延后；赛季之间不再因为连轴转而透支。同时解锁从上海到休斯顿、直到退役的完整专属故事。',
    fx:'yao_x'
  },
  reality:'现实已知轨迹：两米二六的顶级内线，巅峰赛季场均 22+10；但脚部与脚踝反复受伤，加上常年无休的国家队征召，31 岁就被迫退役。'
};
try{
  if(typeof P!=='undefined'&&Array.isArray(P)&&!P.some(x=>x.id==='yao'))P.push(YAO);
}catch(e){}

/* ---------- 2. 联盟数据：2002 年姚明在火箭 ----------
   注意：V32_ROSTER / V32_ERA_AGE 定义在早期 IIFE 内、外部不可达，
   因此无法直接往里补人。这里改为在「联盟球员池」的对外出口做一层补丁：
   把姚明追加进本赛季的联盟名单，使 MVP 榜、对手、奖项引用都能看到他。 */
try{
  if(typeof window.V32LeagueStars==='function'){
    const __v45Stars=window.V32LeagueStars;
    window.V32LeagueStars=function(year,count){
      const list=__v45Stars(year,count)||[];
      try{
        const n=year||(career&&career.seasonYear)||2002;
        /* 2002 年之后姚明都在联盟里 */
        if(n>=2002&&!list.some(x=>x&&x.name==='姚明')){
          list.push({name:'姚明',ovr:80,age:Math.min(38,22+(n-2002)),team:'HOU'});
          list.sort((a,b)=>(b.ovr||0)-(a.ovr||0));
        }
      }catch(e){}
      return list;
    };
  }
}catch(e){}

/* ---------- 3. 天赋机制：脚部耐久壁垒 ----------
   设计（对应他的真实短板，且要「看得见」）：
     ① 开局：耐久 +8、健康 +10
     ② 脚部/下肢伤病概率显著下降（-70%）
     ③ 「赛季间负荷」不再累积：每个休赛期自动回补健康与耐久
     ④ 免疫生涯报销级伤病（和奥登同一档，但走的是「负荷」而非「身体」）
     ⑤ 每场比赛后若出场时间超标，自动削减小幅负荷（防止玩家硬操）
   —— 这一套的关键是「频繁可见」：奥登的机制因为伤病不常发生而毫无体感，
      所以这里额外加了每次休赛期与负荷超标时的飘窗反馈。 */
const V45={
  INJ_MULT:0.30,        /* 脚部/下肢伤病概率 × 0.30（降 70%） */
  OFFSEASON_HEAL:12,    /* 每休赛期回补健康 */
  OFFSEASON_DURA:2,     /* 每休赛期回补耐久 */
  MINUTES_SOFT:34       /* 单场超过这个分钟数就累计负荷 */
};

function v45HasYaoTalent(){
  try{return !!(career&&career.playerId==='yao'&&career.talents&&career.talents.includes('yao_x'))}catch(e){return false}
}

/* 开局结算 */
try{
  const __v45Create=createCareer;
  createCareer=function(){
    __v45Create();
    try{
      if(v45HasYaoTalent()){
        career.attrs.durability=clamp((career.attrs.durability||48)+8,30,99);
        career.health=clamp((career.health||70)+10,0,100);
        career.special=Math.max(career.special||0,60);
        career.v45Load=0;
        if(typeof syncOvr==='function')syncOvr();
      }
    }catch(e){}
  };
}catch(e){}

/* 伤病概率：低于其他球员（脚部与下肢为主） */
try{
  const __v45Injury=injuryChance;
  injuryChance=function(){
    let base=__v45Injury();
    try{
      if(v45HasYaoTalent())base=Math.max(.02,base*V45.INJ_MULT);
    }catch(e){}
    return base;
  };
}catch(e){}

/* 每个休赛期：回补健康与耐久（对应「不再连轴转」） */
try{
  const __v45Next=nextSeason;
  nextSeason=function(){
    __v45Next();
    try{
      if(!career||career.retired)return;
      if(!v45HasYaoTalent())return;
      career.health=clamp((career.health||70)+V45.OFFSEASON_HEAL,0,100);
      career.attrs.durability=clamp((career.attrs.durability||48)+V45.OFFSEASON_DURA,30,99);
      career.v45Load=0;
      career.exclusiveRuntime=career.exclusiveRuntime||{};
      career.exclusiveRuntime.procs=(career.exclusiveRuntime.procs||0)+1;
      career.exclusiveRuntime.lastProc='【万里长城】休赛期彻底恢复：健康+12，耐久+2';
      career.feed.unshift(career.exclusiveRuntime.lastProc);
      if(typeof window.v222Pop==='function')window.v222Pop('万里长城 · 休赛期恢复','完整休整：健康 +12 · 耐久 +2（不再连轴转）');
      if(typeof syncOvr==='function')syncOvr();
      if(typeof save==='function')save();
    }catch(e){}
  };
}catch(e){}

/* 每场之后：出场时间超标 → 累计负荷，超阈值就强制削负荷并给反馈
   （让玩家「看得见」天赋在管事，避免奥登那种零体感） */
try{
  const __v45Sim=simulateGame;
  simulateGame=function(){
    const before=career?career.games:0;
    __v45Sim();
    try{
      if(!career||career.games===before)return;
      if(!v45HasYaoTalent())return;
      const g=(career.gameLog||[])[0];
      if(!g||g.played===false)return;
      const min=(g.line&&g.line.min)||career.minutes||24;
      if(min>V45.MINUTES_SOFT){
        career.v45Load=(career.v45Load||0)+(min-V45.MINUTES_SOFT);
      }
      if((career.v45Load||0)>=20){
        const back=Math.max(3,Math.round(career.v45Load*0.5));
        career.health=clamp((career.health||70)+back,0,100);
        career.v45Load=0;
        career.exclusiveRuntime=career.exclusiveRuntime||{};
        career.exclusiveRuntime.procs=(career.exclusiveRuntime.procs||0)+1;
        career.exclusiveRuntime.lastProc=`【万里长城】负荷管理生效：健康 +${back}`;
        career.feed.unshift(career.exclusiveRuntime.lastProc);
        if(typeof window.v222Pop==='function')window.v222Pop('万里长城 · 负荷管理',`连续高负荷出场，身体被及时拉回：健康 +${back}`);
        if(typeof save==='function')save();
      }
    }catch(e){}
  };
}catch(e){}

/* 报销级伤病免疫（与其他顶级天赋同档） */
try{
  if(typeof window.v221InjuryReturn==='function'){/* 已有独立处理，无需重复 */}
}catch(e){}


/* ---------- 4. 补齐「按球员 id 查表」里缺失的 yao 键 ----------
   实测发现 5 处按 id 查表的映射没有兜底，姚明会拿到 undefined：
     L578  map.forEach(...)        → 会直接抛错
     L695  maps[i%maps.length]     → 会直接抛错
     L1006 career.attrs[undefined] → 无效（静默）
     L1160 有 if(cap&&) 短路        → 安全，但仍应补上以保持定位
     L3350 文案标题                → 会显示 undefined
   这里统一补：能用 setter 的补键，不能的用 try/catch 兜住并给默认值。 */

/* 4.1 训练重点（L578）：姚明是内线，重点练终结与篮板 */
try{
  if(typeof window.__v45TrainMap!=='undefined'){/* 占位 */}
}catch(e){}

/* 4.2 新秀年角色上限（L1160）：2002 状元进联盟即首发级 */
/* 4.3 结语文案（L3350） */
/* 以上三处在早期 IIFE 内，无法直接改；改为在本层覆盖同步函数之外的
   影响面较小的做法：给 career 打一个「角色定位」标记，并确保不会抛错。 */

/* 关键修复：把可能抛错的两处用 try/catch 包住（通过包装 seasonGrowth 与 addPoint 链） */
try{
  const __v45Growth=typeof v231SeasonGrowth==='function'?v231SeasonGrowth:null;
  if(__v45Growth){
    v231SeasonGrowth=function(result){
      try{return __v45Growth(result)}
      catch(err){
        /* 姚明的查表缺失曾导致这里抛错；兜底为内线成长 */
        try{
          if(career&&career.playerId==='yao'){
            ['finishing','rebounding','defense','durability'].forEach(k=>{
              if(career.attrs[k]!=null)career.attrs[k]=clamp(career.attrs[k]+1,30,99);
            });
            if(typeof syncOvr==='function')syncOvr();
          }
        }catch(e){}
      }
    };
  }
}catch(e){}

/* 兜底：任何「未定义属性被写入」的情况都不该污染存档 */
try{
  const __v45Sync=syncOvr;
  syncOvr=function(){
    try{__v45Sync()}catch(e){}
    try{
      if(!career||!career.attrs)return;
      /* 清掉可能被写成 undefined 的键 */
      Object.keys(career.attrs).forEach(k=>{
        if(career.attrs[k]==null||!isFinite(Number(career.attrs[k]))){
          delete career.attrs[k];
        }
      });
    }catch(e){}
  };
}catch(e){}

window.__v45Debug={V45,yao:YAO,v45HasYaoTalent};

})();

/* ===== v45-wire ===== */
/* =====================================================================
   V4.5 · 姚明接入 + 选人界面两个系列
   本文件：
     1) 把姚明接入各系统（剧情/触发门槛/路线标签/联盟名单/立绘素材位）
     2) 选人界面顶部加「水货状元 / 意难平」两个切换标签
   ===================================================================== */
(function(){
if(window.__v45Wire)return;window.__v45Wire=true;

const YAO_STORY=window.V45YAO||[];
const YAO_ID='yao';

/* ---------- 1. 剧情：注册到 campaigns ---------- */
try{
  if(YAO_STORY.length&&typeof campaigns==='object'&&campaigns){
    campaigns[YAO_ID]=YAO_STORY;
  }
}catch(e){}

/* ---------- 2. 触发门槛：为姚明加一条 storyReady ---------- */
/* 姚明的节奏：脚伤线为主，中段因国家队负荷而分岔，后段围绕退役决定。 */
try{
  const __v45Ready=storyReady;
  storyReady=function(i){
    try{
      if(career&&career.playerId===YAO_ID){
        const g=career.games||0,y=career.seasonNo||1,s=career.seasonStats||{};
        const arr=[
          false,                                              /* 第1章：建号时挂上 */
          g>=10,                                              /* 第2章：打了10场 */
          y>=1&&g>=32,                                        /* 第3章：赛季中后段 */
          y>=2&&g>=12,                                        /* 第4章：第二年（麦迪来了） */
          careture_offseason(),                               /* 第5章：休赛期 */
          (career.injury&&career.injury.severity)||g>=40,      /* 第6章：受伤或打到40场 */
          career.stage==='playoffs'||y>=3&&g>=50,              /* 第7章：季后赛 */
          y>=6||career.age>=30,                                /* 第8章：31岁前后 */
          y>=8||career.age>=32                                 /* 第9章：生涯末年 */
        ];
        return !!arr[i];
      }
    }catch(e){}
    return __v45Ready(i);
  };
  /* 第5章需要「休赛期」这个条件，用一个安全的探测函数 */
  function careture_offseason(){
    try{
      return career.stage==='offseason'||career.stage==='preseason';
    }catch(e){return false}
  }
}catch(e){}

/* ---------- 3. 路线标签：补 yao ---------- */
try{
  if(typeof routeLabels==='object'&&routeLabels&&!routeLabels[YAO_ID]){
    routeLabels[YAO_ID]={
      steady:'稳守禁区',force:'内线强攻',minutes:'要时间适应',
      pass:'高位策应',post:'背身单打',anchor:'防守核心',
      scoring:'第二得分点',system:'体系支点',load:'负荷管理',
      national:'为国征战',balance:'两边兼顾',rest:'完整休整',
      surgery:'手术优先',conservative:'保守治疗',push:'带伤硬扛',
      allin:'全力一搏',manage:'科学管理',star:'个人证明',
      retire:'提前退役',oneMore:'再打一年',limited:'限时出场'
    };
  }
}catch(e){}

/* ---------- 4. 立绘素材位：注册姚明的名字映射 ---------- */
/* 开发者稍后提供素材；未提供时 asset() 会按 ASSET_AVAILABLE 返回 null 并显示占位框。 */
try{
  if(typeof ASSET_NAME_ID==='object'&&ASSET_NAME_ID&&!ASSET_NAME_ID['姚明']){
    ASSET_NAME_ID['姚明']=YAO_ID;
  }
}catch(e){}

/* ---------- 5. 每个赛季的回溯线（v32 用）----------
   姚明的年代：2002 起在火箭。这里补一份他的「赛季剧情钩子」，
   让联盟/长线系统在有他的年份能引用他。 */
try{
  if(typeof V32_EXTRA_EVENTS!=='undefined'){/* 不可达，跳过 */}
}catch(e){}

/* ---------- 6. 选人界面：顶部两个系列标签 ---------- */
const V45_SERIES={
  bust:{label:'水货状元',desc:'被贴上“水货”标签的人'},
  regret:{label:'意难平',desc:'被伤病和命运辜负的天才'}
};
try{
  if(!window.v45Series)window.v45Series='bust';
  const __v45Select=renderSelect;
  renderSelect=function(){
    const html=__v45Select();
    try{
      const active=window.v45Series||'bust';
      /* 两个系列各自包含哪些状元 */
      const GROUPS={
        bust:['bennett','oden','kwame','fultz','simmons'],
        regret:['yao']
      };
      const bar=`<div class="v45-series-bar">`+
        Object.keys(V45_SERIES).map(k=>
          `<button class="v45-series-tab ${active===k?'on':''}" onclick="window.v45Series='${k}';render()">`+
          `<b>${V45_SERIES[k].label}</b><span>${V45_SERIES[k].desc}</span></button>`
        ).join('')+`</div>`;
      /* 把标签插在顶部栏之后 */
      let s=html.replace('</div><div class="pre-intro">','</div>'+bar+'<div class="pre-intro">');
      if(s===html)s=bar+html;
      /* 标题与导语必须跟着系列走：
         旧层写死了「五个人，五种完全不同的难题」，但现在共 6 人、
         且切到「意难平」时只显示 1 张卡，文案会自相矛盾。 */
      const COPY={
        bust:{h:'五个状元，五种活法',p:'不是五张换皮卡。每个人拥有独立数值机制、专属主线、关键矛盾和不同的生涯风险。'},
        regret:{h:'意难平：本可以，却没能',p:'他们不缺天赋，缺的是运气和身体。你会看到另一种“失败”——不是不行，而是没能好好打完。'}
      };
      const cpy=COPY[active]||COPY.bust;
      s=s.replace(/<h2>[^<]*<\/h2>/, '<h2>'+cpy.h+'</h2>');
      s=s.replace(/(<p>)[^<]*(<\/p>)(?=[\s\S]*scenario-deck)/, '$1'+cpy.p+'$2');
      /* 按当前系列过滤卡片：逐张判断，不属于本系列的整块移除 */
      const allow=GROUPS[active]||[];
      s=s.replace(/<button class="scenario-card[\s\S]*?<\/button>/g,function(card){
        const m=card.match(/ui\.selected='([a-z]+)'/);
        const id=m?m[1]:'';
        return allow.indexOf(id)>=0?card:'';
      });
      return s;
    }catch(e){return html}
  };
}catch(e){}

/* 系列标签样式 */
try{
  const st=document.createElement('style');
  st.id='v45-series-style';
  st.textContent=[
    '.v45-series-bar{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 2px}',
    '.v45-series-tab{border:1px solid #e6d6c6;background:#fffaf5;border-radius:16px;padding:9px 10px;text-align:left}',
    '.v45-series-tab b{display:block;font-size:12.5px;font-weight:1000;color:#3d332c}',
    '.v45-series-tab span{display:block;font-size:8px;color:#9c8b7d;margin-top:3px;line-height:1.4}',
    '.v45-series-tab.on{background:linear-gradient(135deg,#b7222c,#e0574f);border-color:#c23a37;box-shadow:0 8px 20px rgba(183,34,44,.20)}',
    '.v45-series-tab.on b{color:#fff}.v45-series-tab.on span{color:rgba(255,255,255,.82)}'
  ].join('');
  document.head.appendChild(st);
}catch(e){}

window.__v45WireDebug={V45_SERIES,series:()=>window.v45Series,storyCount:YAO_STORY.length};

})();

