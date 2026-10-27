
/* ============================================================================
 * V108b · 罗斯专属主线（10 章）＋ 赛季随机事件（8 条）＋ 系统接入
 *
 * 真实节点全部可考：
 *   2008-06-26 芝加哥第一顺位（他是芝加哥 Englewood 长大的孩子）
 *   2009-04 最佳新秀；2009 季后赛首轮 vs 凯尔特人 G1 砍 36 分（追平新秀季后赛首战纪录），
 *            系列赛打到抢七、多场加时
 *   2010 夏 Tom Thibodeau 上任；2010-11 公牛 62 胜，罗斯场均 25.0 分
 *   2011-05-03 22 岁 191 天，史上最年轻 MVP
 *   2011 东决 1-4 负热火三巨头，罗斯命中率被压到 35%
 *   2012-04-28 季后赛首轮 G1 对大比分领先的 76 人，最后 1 分多钟仍在场上 →
 *            左膝前交叉韧带撕裂（整个 2012-13 赛季报销）——本线最大偏移点
 *   2013-11-23 复出第 10 场，右膝半月板撕裂，赛季报销
 *   2015-05-08 季后赛对骑士 G3 打板三分绝杀
 *   2016-06-22 被交易到纽约尼克斯
 *   2018-10-31 明尼苏达，生涯最高 50 分，赛后落泪
 *   2024-09 宣布退役
 *
 * 设计原则：现实里他从来没得选（伤病替他做了所有决定）；
 *          这条线的全部意义，就是把这些决定交回玩家手里。
 * ============================================================================ */
window.V108ROSE=[

/* ---------- 第 1 章 ---------- */
{t:'芝加哥的孩子，穿上了芝加哥的球衣',
 scene:'2008 年 6 月 26 日 · 纽约 · 选秀大会',
 speaker:'John Paxson / 你的哥哥',
 cast:['John Paxson','Reggie Rose','David Stern'],
 b:()=>`<p>大卫·斯特恩念出你的名字时，你听见的不是欢呼，是整座城市松了一口气的声音。芝加哥用第一顺位选了一个从恩格尔伍德（Englewood）走出来的孩子。</p>
<p>三天后，总经理 <b>John Paxson</b> 在办公室里看着你——“我们不是在找最好的球员，我们是在找能把这座城市扛起来的人。你先告诉我，你想成为哪一种？”</p>
<p>你的哥哥 <b>Reggie</b> 在走廊里等你。他从小就负责替你挡掉那些不该你听的话。他说了一句：“别急着回答他。你要先想清楚，你要的是不受伤的职业生涯，还是不留遗憾的那种。”</p>`,
 stakes:'先在“稳妥”和“拼命”之间定基调——这会一路影响你的负荷与成长曲线。',
 c:()=>[
  ['回到家乡，我要做这座城市的那个人','领袖线：信任与心态大涨，球队围绕你建。',fx([['rose1','home'],['roseTone','lead']],{a:{mentality:3,playmaking:2},tr:8,c:4})],
  ['我只想好好打球，别的不重要','纯粹线：成长最稳，媒体关系更淡。',fx([['rose1','ball'],['roseTone','pure']],{a:{finishing:2,athleticism:2},c:3,tr:3})],
  ['身体是本钱，我要先学会管理自己','自保线：耐久与健康更好，短期数据被压。',fx([['rose1','body'],['roseTone','careful']],{a:{durability:3,mentality:2},h:6,tr:-2})]
 ]},

/* ---------- 第 2 章 ---------- */
{t:()=>F('rose1')==='home'?'全城都在等你把凯尔特人拉下来':'新秀季的最后一课',
 scene:'2009 年 4 月 · 波士顿 · 季后赛首轮第一场',
 speaker:'Vinny Del Negro / Joakim Noah',
 cast:['Joakim Noah','Vinny Del Negro','Rajon Rondo'],
 b:()=>{const r=F('rose1');return `<p>你刚刚拿下最佳新秀。但这里是季后赛，对面的波士顿是卫冕冠军级别的球队，主场广播念你的名字时，带着那种“欢迎来到真正的赛场”的语气。</p>
<p>第一场，你砍下 36 分，追平了新秀季后赛首战的得分纪录。整个系列赛打到第七场，好几场进了加时——每一次你以为要结束了，都还有下一个回合。</p>
<p><b>Joakim Noah</b> 在第七场赛前拍着你的背说：“${r==='careful'?'你这两年最聪明的选择就是没在常规赛把身体拼光。今晚不一样，今晚必须拼。':'你已经不是新秀了，他们知道你会怎么打，你还是打出来了。今晚再证明一次。'}</p>
<p>主教练 <b>Vinny Del Negro</b> 只问了你一句：这轮系列赛，你想怎么用自己？</p>`},
 stakes:'第一轮季后赛的用法，会决定球队对你的定位，也会决定你的负荷从哪里开始累积。',
 c:()=>[
  ['每一场都打满，我来扛这一轮','英雄线：季后赛数据爆表，负荷第一层从这里开始。',fx([['rose2','carry']],{a:{finishing:2,athleticism:2},c:6,h:-5,s:4})],
  ['让队友也参与进来，我负责串联','串联线：组织提升，季后赛走得更远。',fx([['rose2','share']],{a:{playmaking:3},tr:6})],
  ['只做球队需要我做的事','体系线：效率最稳，个人数据一般。',fx([['rose2','system']],{a:{mentality:2,defense:2},tr:4})]
 ]},

/* ---------- 第 3 章 ---------- */
{t:()=>F('rose2')==='carry'?'你把球队扛进了争冠讨论':'Thibodeau 上任：先立规矩，再谈冠军',
 scene:'2010 年夏天 · 芝加哥 · 球队训练馆',
 speaker:'Tom Thibodeau / Joakim Noah',
 cast:['Tom Thibodeau','Joakim Noah','Luol Deng'],
 b:()=>{const r=F('rose2');return `<p>新主教练 <b>Tom Thibodeau</b> 上任第一天，把所有人叫到录像室。他放了两个小时的防守剪辑，然后说了他在这里的唯一规矩：“谁不防，谁就别打。”</p>
<p>这一年你们赢了 62 场，是联盟最好战绩。你场均 25 分——${r==='share'?'上一年季后赛练出的串联，现在变成了整支球队的进攻骨架。':r==='system'?'你按体系打球，效率高得让对手没法针对。':'你一个人扛下了大部分关键回合，球迷开始喊你 MVP。'}</p>
<p><b>Luol Deng</b> 提醒你：“Thibs 会一直让你打，他不在乎你累不累，他只在乎赢。你自己得有个数。”</p>
<p>三月的新闻发布会上，记者第一次把“最有价值球员”这个词，直接放在了你面前。</p>`},
 stakes:'MVP 年份怎么用身体，是本线最贵的一次赌注——历史上，这笔账在一年后一起还。',
 c:()=>[
  ['全力争 MVP，我要把这个奖拿下来','冲刺线：MVP 概率最高，但负荷和伤病风险同步上升。',fx([['rose3','mvp'],['roseLoadIn','1']],{a:{finishing:3,playmaking:2},c:6,h:-6,s:6})],
  ['该歇就歇，季后赛才是目标','负荷线：常规赛数据略降，季后赛状态最好。',fx([['rose3','manage']],{a:{mentality:2},h:8,tr:3})],
  ['先把球队体系打顺，个人荣誉排后面','体系线：球队胜率最高，MVP 竞争吃亏。',fx([['rose3','team']],{a:{playmaking:3,defense:2},tr:8,c:-3})]
 ]},

/* ---------- 第 4 章 ---------- */
{t:'2011 年 5 月 3 日：史上最年轻的 MVP',
 scene:'2011 年 5 月 · 芝加哥 · MVP 发布会',
 speaker:'Tom Thibodeau / 你的哥哥',
 cast:['Tom Thibodeau','Reggie Rose','LeBron James'],
 b:()=>{const r=F('rose3');return `<p>22 岁 191 天。你成为 NBA 历史上最年轻的 MVP。发布会现场有人问你：“你觉得自己到极限了吗？”你说没有。</p>
<p>${r==='manage'?'你这一年少打了十几场，数据比不过东部那几个名字，但你把状态留到了最后——球队走得很远。':r==='team'?'你没有拿奖，但整支球队的进攻和防守都围着体系转，这是 Thibodeau 嘴里“最像冠军”的一年。':'你是带着一身负荷拿到这座奖杯的——没人知道你在三月份之后每天早上要花多久才能把膝盖“打开”。'}</p>
<p>然后是东部决赛。对面是迈阿密那三个人：<b>LeBron James</b>、Dwyane Wade、Chris Bosh。你场均 23.4 分，但命中率被压到 35%。系列赛 1-4。</p>
<p>你哥在通道里等你，说了我们家里那句老话：“赢不了的时候，你要么换招，要么换命。”</p>`},
 stakes:'被针对之后的选择，会决定你后面几年是“更难的球星”还是“更脆的核心”。',
 c:()=>[
  ['夏天练投射，我要让他们没法收缩','技术线：投射成为真武器，长期收益最大。',fx([['rose4','shoot']],{a:{shooting:4},h:-3,c:3})],
  ['增重对抗，我要顶住那些身体接触','对抗线：终结与防守提升，膝盖负担更重。',fx([['rose4','bulk']],{a:{finishing:3,defense:2,strength:3},h:-6,s:5})],
  ['维持我的打法，我不改','本色线：风格不变，信任与球迷支持最高，风险最高。',fx([['rose4','same']],{a:{athleticism:2},c:8,s:7})]
 ]},

/* ---------- 第 5 章（最大偏移点） ---------- */
{t:()=>F('rose5')?'':'2012 年 4 月 28 日 · 最后 1 分 10 秒',
 scene:'2012 年 4 月 · 芝加哥 · 季后赛首轮第一场的最后时刻',
 speaker:'Tom Thibodeau / 队医',
 cast:['Tom Thibodeau','队医','Doug Collins'],
 b:()=>{const r=F('rose4');return `<p>缩水赛季的季后赛首轮第一场，你们领先 12 分。比赛还剩 1 分 10 秒，对面的 76 人已经开始换下主力。</p>
<p>Thibodeau 站在场边，没有看你。他的规矩你比谁都清楚：他不换人。${r==='same'?'你这一年一直这么打——每一次落地都是这么落。':r==='bulk'?'你夏天增了重，起跳落地时身上的分量比以前多。':'你按 Thibodeau 的体系打了整整一年，你从没在这种时候要求下场。'}</p>
<p>队医看了你一眼，那眼神很轻，意思却不轻：这球已经赢了，你不必再上。</p>
<p><b>这就是你生涯最重要的一个回合。现实里，下一个回合他冲起来了——然后他再也没有回到原来的样子。</b></p>`},
 stakes:'留不留在这块地板上，是把这条世界线分成两半的一刀。',
 c:()=>[
  ['举手要求下场，这一场已经赢了','改写线：避开那次落地，代价是被贴上“不够狠”的标签。',fx([['rose5','off'],['roseAvoid','1']],{tr:-4,c:-2,a:{mentality:2},h:8})],
  ['继续留在场上，我来收比赛','史实线：赢下这场，走历史上那一步。',fx([['rose5','stay'],['roseLoadIn','2']],{a:{finishing:2},c:5,s:8,h:-10})],
  ['不主动要下场，但改成只做策应，不冲篮筐','折中线：数据不好看，但风险明显降低。',fx([['rose5','pass']],{a:{playmaking:2},c:-2,h:3,s:3})]
 ]},

/* ---------- 第 6 章（偏移点） ---------- */
{t:()=>F('rose5')==='off'?'那年没有落地，可膝盖还是响了':'术后：医生把康复表推到你面前',
 scene:'2012 年夏 · 芝加哥 · 康复中心',
 speaker:'主治医生 / Reggie Rose',
 cast:['主治医生','Reggie Rose','Tom Thibodeau'],
 b:()=>{const off=F('rose5')==='off';return `<p>${off?'你躲开了那一下。但整个赛季的高负荷没有消失——夏天体检时，医生指着片子上的一处阴影说：这不是意外，这是账单。':'你被抬出球馆的那一晚，全联盟都知道了结果：左膝前交叉韧带撕裂。这是能毁掉一个球员职业生涯的伤，尤其是靠爆发力吃饭的那种球员。'}</p>
<p>医生把一张康复时间表推到你面前：“最保守是一年，最快八个月。八个月能赶上新赛季揭幕战，但前交叉韧带在八个月时还很脆。”</p>
<p><b>Reggie</b> 在旁边说：“你二十几岁，只有一副膝盖。别让他们替你决定这件事。”</p>
<p>Thibodeau 打来电话，只说了两句：“球队等你。你想什么时候回来都行。”——你知道他说的是真心话，你也知道他有多想让你早一点回来。</p>`},
 stakes:'康复节奏决定你复出后的爆发力还剩多少，也决定后面会不会有第二次。',
 c:()=>[
  ['按最完整的方案来，缺席一年也认','稳妥线：爆发力保留最多，但这一年完全空掉。',fx([['rose6','slow'],['roseRehab','full']],{a:{durability:3,mentality:3},h:12,c:-3,tr:2})],
  ['八个月就回来，我不能缺席整个赛季','冒险线：回归最快，膝盖留下隐患。',fx([['rose6','fast'],['roseRehab','fast']],{a:{athleticism:2},h:-8,s:5,c:4})],
  ['借这段时间重建投篮动作，不再只靠第一步','转型线：投射与组织质变，爆发力换一种活法。',fx([['rose6','new'],['roseRehab','rebuild']],{a:{shooting:5,playmaking:3},h:6,c:2})]
 ]},

/* ---------- 第 7 章（偏移点） ---------- */
{t:'复出第 10 场：右膝也响了',
 scene:'2013 年 11 月 · 芝加哥 · 复出后的第九场比赛之后',
 speaker:'队医 / Joakim Noah',
 cast:['队医','Joakim Noah','Tom Thibodeau'],
 b:()=>{const p=F('roseRehab');return `<p>你回来了。${p==='fast'?'比医生建议的八个月还早了两周，主场介绍你的时候，整座球馆都在喊你的名字。':p==='rebuild'?'新的出手点更省膝盖，但你还在适应它，命中率起起伏伏。':'你休了整整一年，回来时身体是干净的，但比赛节奏需要重新找。'}</p>
<p>第九场之后，右膝开始有那种熟悉的感觉——不是疼，是“不听话”。拍片结果出来：半月板撕裂。</p>
<p><b>Joakim Noah</b> 在停车场拦住你，说了一句很重的话：“你可以再拼一次，但没有人会替你疼。这次你得自己选。”</p>
<p>历史在这里有个分叉：现实中，他做了手术，赛季又一次结束；之后四年，他的膝盖一直在替他做决定。</p>`},
 stakes:'第二次伤的处理方式，会决定你的生涯是“两条腿的球星”还是“一条腿的竞争者”。',
 c:()=>[
  ['立刻手术，这个赛季不要了','清创线：长期最稳，本季数据归零。',fx([['rose7','surgery']],{a:{durability:3},h:10,c:-4,tr:2})],
  ['保守治疗，我还能打','硬扛线：本季继续出场，风险持续累积。',fx([['rose7','play']],{a:{finishing:2},c:5,s:6,h:-8})],
  ['降低对抗，转型组织控卫','转型线：组织与投射提升，得分下降，生涯更长。',fx([['rose7','floor']],{a:{playmaking:4,shooting:2},s:-3,tr:6,h:6})]
 ]},

/* ---------- 第 8 章 ---------- */
{t:()=>F('rose7')==='floor'?'你成了场上那个“让所有人变好的人”':'2016 年 6 月 22 日：那个电话',
 scene:'2016 年 6 月 · 芝加哥 · 训练馆办公室',
 speaker:'Gar Forman / 你的经纪人',
 cast:['Gar Forman','经纪人','Phil Jackson'],
 b:()=>{const t=F('rose7'),st=F('rose5');return `<p>${t==='floor'?'这两年你换了活法：不再每个回合都冲进去，靠节奏和传球让队友变好。球队赢了一些球，但管理层在重建。':t==='play'?'你带着膝盖继续打，打出了几个漂亮的夜晚——但球队每年春天都在做交易传闻。':'你做完手术又回来了，数据和以前不在一个量级，但你还站在场上。'}</p>
<p>总经理 <b>Gar Forman</b> 把电话递给你：“纽约那边想要你，然后<em>他们会和你谈续约</em>。”</p>
<p>你是芝加哥人。你八岁那年在恩格尔伍德的水泥场上打球，你从来没有想过穿别的球衣。${st==='off'?'你躲过了那次落地，可七年之后，你还是要面对同一个问题：你要的到底是什么？':'那一次落地之后，这座城市给了你四年时间，也给了你四年质疑。'}</p>
<p>经纪人的电话在震动。你还有 24 小时可以回答。</p>`},
 stakes:'留在这座城市，还是去别处重新证明自己——这决定你后面的角色与风险结构。',
 c:()=>[
  ['留下，我要在芝加哥把这个故事讲完','忠诚线：信任与球迷支持拉满，球队重建期战绩吃亏。',fx([['rose8','stay']],{tr:10,c:8})],
  ['去纽约，换个地方重新开始','重启线：使用率上升、数据回升，但适应成本高。',fx([['rose8','ny']],{a:{finishing:2},c:4})],
  ['告诉经纪人：我要去一支能争冠的球队','争冠线：角色缩水，但球队战绩与冠军概率最高。',fx([['rose8','contend']],{a:{mentality:2},tr:-2,c:-3})]
 ]},

/* ---------- 第 9 章 ---------- */
{t:'50 分那一夜',
 scene:'2018 年 10 月 31 日 · 明尼苏达 · 主场',
 speaker:'Tom Thibodeau / 现场解说',
 cast:['Tom Thibodeau','Karl-Anthony Towns','你的队友'],
 b:()=>{const p=F('rose8');return `<p>${p==='contend'?'你成了争冠球队里的老将，出场时间不多，但每天最早到训练馆。':p==='ny'?'到了新地方，你重新拿回了球权，也重新开始累积负荷。':'你留在了芝加哥，把最难的几年陪着这支球队一起过完。'}</p>
<p>这一晚，<b>Tom Thibodeau</b> 又站在你身边——联盟里最会“用狠”你的那个人，也是唯一一个从来没怀疑过你的教练。</p>
<p>你砍下 50 分，生涯最高。终场哨响，你把脸埋进毛巾，肩膀在抖。全场观众站起来的时候，镜头扫到你——那不是庆祝的表情，是一个人把这些年全还回去了。</p>
<p>赛后有人问你：“这是不是你最好的夜晚？”你说：“我只是证明我还在。”</p>`},
 stakes:'把这一夜当成句号还是起点，决定你生涯最后几年的活法。',
 c:()=>[
  ['把这一夜当句号，从此以老将身份带年轻人','传承线：信任与心态拉满，数据回落，生涯最稳。',fx([['rose9','mentor']],{a:{mentality:3},tr:8,c:5,h:4})],
  ['当作起点，我还想再打一次高水平的球','再燃线：继续高强度使用，数据与风险同时上去。',fx([['rose9','again']],{a:{finishing:2,athleticism:2},c:6,s:5,h:-6})],
  ['我只想健康地打完剩下的每一场','自保线：耐久与健康优先，出场时间自动收紧。',fx([['rose9','health']],{a:{durability:3},h:9,tr:2})]
 ]},

/* ---------- 第 10 章（终章） ---------- */
{t:'最后一枚玫瑰',
 scene:'生涯末年 · 你的球场',
 speaker:'你自己',
 cast:['Reggie Rose','Joakim Noah','Tom Thibodeau'],
 b:()=>{const off=F('rose5')==='off',save=F('roseAvoid'),rj=F('roseRehab'),t7=F('rose7'),end=F('rose9');
 let head=off?'2012 年那个夜晚，你没有走回场上。':'2012 年那个夜晚，你选择了留在场上。';
 let body='';
 if(off&&rj==='full')body='你把整整一年还给了膝盖。没有人知道你躲过了什么，只有你自己清楚那一下有多近。';
 else if(off)body='你躲过了那次落地，但后面的每一次复出、每一次起跳，你都在重新签那张账单。';
 else if(rj==='fast')body='你八个月就回来了——这是你最骄傲也最后悔的一个决定。';
 else body='你按最慢的节奏康复，回来时爆发力只剩下七成，但那是真的留下来了。';
 return `<p>${head}${body}</p>
<p>${t7==='floor'?'后来你把打法彻底换了一遍：不靠冲、靠节奏。很多人说这不是罗斯了。也有人说，这才是他活到今天的原因。':t7==='play'?'你的膝盖替你做了很多次决定，但你从来没有对训练迟到过一次。':'你打过球馆最安静的夜晚，也打过它最响的夜晚。'}</p>
<p>${end==='mentor'?'明尼苏达那 50 分之后，你把位置让给了年轻人。他们问你最多的一句话是：怎么在伤过之后还敢往里冲。你说：因为我记得我没伤的时候是什么样。':end==='again'?'你还在冲。有人劝你，你说：我只有这一种打法。':'你把最后几年过得很轻，出场时间不多，但每一场都完整地打完了。'}</p>
<p><b>Joakim Noah</b> 说：“你从来不是被打败的。你只是把所有的选择都自己扛了。”</p>
<p>${save==='1'?'很多人以为这条世界线的关键，是 2012 年那次落地。其实关键是你每一次都知道代价，还愿意自己选。':'如果那一下没有落地——这句话在你生涯里出现过一千次。现在你已经知道答案了：落地会变，选择不会。'}</p>`},
 stakes:'这是最后一章：你之前所有的选择，会在这里汇总成一条属于你的历史结论。',
 c:()=>[
  ['我改写了那一次落地，但我从来没有躲过比赛','终局定调：改写者的玫瑰。',fx([['roseEnd','rewrite']],{a:{mentality:2},c:4})],
  ['我走完了现实里那条最难的路','终局定调：史实的玫瑰。',fx([['roseEnd','real']],{a:{mentality:3,durability:2},c:5})],
  ['我不在乎结论，我只在乎我每一场都上过场','终局定调：不服的玫瑰。',fx([['roseEnd','fight']],{a:{finishing:2},c:6})]
 ]}
];

/* ---------- 罗斯的赛季随机事件（结构与其他 6 人一致：[标题,正文,选项,后续标记]） ---------- */
window.V108ROSE_EV=[
 ['Thibodeau 把出场时间表贴在了更衣室','主教练的规矩很简单：能打就打。队医在你的名字后面写了一个数字。',
  [['按队医的管理打','健康+6，耐久+2。',{a:{durability:2},h:6}],
   ['我需要的是比赛，不是休息','终结+2，负荷风险上升。',{a:{finishing:2},s:5}],
   ['跟教练谈一次，我要自己决定节奏','信任+4，心态+2。',{tr:4,a:{mentality:2}}]]],

 ['一次落地之后，你自己听见了那声轻响','没有人看见，你也没有立刻站起来。',
  [['马上告诉队医','健康+5，信任+3。',{h:5,tr:3}],
   ['继续打，我自己知道分寸','状态维持，风险上升。',{a:{finishing:2},s:6}],
   ['改一下落地方式，宁可慢一点','耐久+3。',{a:{durability:3}}]]],

 ['芝加哥的媒体开始讨论“他还能不能做核心”','训练结束后，两个记者在通道里等你。',
  [['正面回应，我知道自己要什么','自信+6，球迷支持+4。',{c:6,h:2}],
   ['不回应，让比赛说话','心态+3，信任+2。',{a:{mentality:3},tr:2}],
   ['把话说重一点：这支球队是我的','自信+8，信任-3。',{c:8,tr:-3}]]],

 ['Joakim Noah 在训练里冲你吼了一句','他说你不能每次都自己扛，你回了他一句。',
  [['听他的，多分球','组织+3，信任+4。',{a:{playmaking:3},tr:4}],
   ['我有我的方式','终结+2，自信+3。',{a:{finishing:2},c:3}],
   ['当晚找他吃个饭，把话讲开','信任+6，心态+2。',{tr:6,a:{mentality:2}}]]],

 ['训练师给你看了一段你巅峰期的录像','画面里那个人跑起来的样子，你自己都不敢看太久。',
  [['按旧动作练回去','运动+3，负荷上升。',{a:{athleticism:3},s:5}],
   ['接受现在这个版本，把技术练细','投射+3，心态+2。',{a:{shooting:3,mentality:2}}],
   ['把录像关掉，我的生涯还没结束','自信+7。',{c:7}]]],

 ['一个孩子在球馆外等了你两个小时','他穿着你的球衣，说他妈妈让他告诉你一句话。',
  [['蹲下来跟他聊十分钟','球迷支持+6，心态+3。',{c:6,a:{mentality:3}}],
   ['送他一件签名球衣','球迷支持+8。',{c:8}],
   ['跟他说：回去练球，别学我拼命','球迷支持+3，心态+5。',{c:3,a:{mentality:5}}]]],

 ['“你为什么不换个打法？”','这是你这几年被问得最多的一句话。',
  [['因为我只有这一种打法','自信+6，风险上升。',{c:6,s:5}],
   ['因为我在改，只是慢','心态+3，信任+3。',{a:{mentality:3},tr:3}],
   ['因为我不想让那些孩子觉得受伤就该放弃','球迷支持+8，心态+4。',{c:8,a:{mentality:4}}]]],

 ['兄弟们在电话里吵了一架','他们说你不该再这么打了，你说那你说我该怎么打。',
  [['听家里的，收一点','健康+7，耐久+2。',{h:7,a:{durability:2}}],
   ['我停不下来','自信+5，风险上升。',{c:5,s:6}],
   ['你们看着我就行','信任+4，心态+3。',{tr:4,a:{mentality:3}}]]]
];

/* ---------- 系统接入 ---------- */
(function(){
'use strict';
if(window.__v108Wire)return;window.__v108Wire=true;
var ROSE_ID='rose';
var STORY=window.V108ROSE||[];
var EVS=window.V108ROSE_EV||[];

/* 1. 主线注册（必须在任何 createCareer 之前，base 里会读 campaigns[pid][0]） */
try{
  if(STORY.length&&typeof campaigns==='object'&&campaigns&&!campaigns[ROSE_ID])campaigns[ROSE_ID]=STORY;
}catch(e){}

/* 2. 赛季随机事件注册 */
try{
  if(EVS.length&&window.V42_EV_V2&&!window.V42_EV_V2[ROSE_ID])window.V42_EV_V2[ROSE_ID]=EVS;
}catch(e){}

/* 3. 章节触发门槛：罗斯的节奏围绕「负荷」和「两次膝伤」 */
try{
  if(typeof storyReady==='function'){
    var __v108Ready=storyReady;
    storyReady=function(i){
      try{
        if(career&&career.playerId===ROSE_ID){
          var g=career.games||0,y=career.seasonNo||1,load=Math.max(0,Number(career.v108Load)||0);
          var arr=[
            true,                                   /* 1 选秀夜：建号即挂 */
            y>=1&&g>=12,                            /* 2 新秀季季后赛前 */
            y>=2&&g>=10,                            /* 3 Thibodeau 上任 */
            (y>=3&&g>=20)||load>=3,                 /* 4 MVP 与东决 */
            y>=4&&g>=30,                            /* 5 2012 那个夜晚 */
            career.stage==='offseason'||career.stage==='preseason'||y>=4&&g>=50, /* 6 术后 */
            y>=5&&g>=10,                            /* 7 复出第 10 场 */
            y>=7||career.age>=27,                   /* 8 交易 */
            y>=10||career.age>=30,                  /* 9 50 分之夜 */
            y>=12||career.age>=33                   /* 10 终章 */
          ];
          return !!arr[i];
        }
      }catch(e){}
      return __v108Ready(i);
    };
  }
}catch(e){}

/* 4. 路线标签 */
try{
  if(typeof routeLabels==='object'&&routeLabels&&!routeLabels[ROSE_ID]){
    routeLabels[ROSE_ID]={
      home:'家乡领袖',ball:'只想打球',body:'身体优先',
      carry:'独自扛队',share:'串联全队',system:'体系优先',
      mvp:'全力争 MVP',manage:'负荷管理',team:'体系为先',
      shoot:'补投射',bulk:'增重对抗',same:'保持本色',
      off:'请求下场',stay:'留在场上',pass:'只做策应',
      slow:'完整康复',fast:'提前复出',new:'重建投篮',
      surgery:'手术停赛',play:'带伤硬打',floor:'转型控卫',
      stay_chi:'留在芝加哥',ny:'去纽约',contend:'加入争冠队',
      mentor:'老将传承',again:'再燃一次',health:'健康优先',
      rewrite:'改写着',real:'史实者',fight:'不服者'
    };
  }
}catch(e){}

/* 5. 联盟名单：2008 年之后罗斯都在（公牛，后来换队） */
try{
  if(typeof window.V32LeagueStars==='function'){
    var __v108Stars=window.V32LeagueStars;
    window.V32LeagueStars=function(year,count){
      var list=__v108Stars(year,count)||[];
      try{
      // 罗斯同样受上线开关控制：隐藏时连联盟名单里也不出现
      if(window.__V108_ROSE_LIVE){
        var n=Number(year)||((career&&career.seasonYear)||2008);
        if(n>=2008&&!list.some(function(x){return x&&x.name==='德里克·罗斯'})){
          var team=n<=2015?'CHI':n<=2017?'NYK':n<=2018?'MIN':n<=2020?'DET':'NYK';
          var age=Math.min(36,19+(n-2008));
          var ovr=n<=2015?Math.max(78,90-Math.max(0,(n-2012))*2):82-Math.max(0,n-2016);
          list.push({name:'德里克·罗斯',ovr:ovr,age:age,team:team});
          list.sort(function(a,b){return (b.ovr||0)-(a.ovr||0)});
        }
      }
      }catch(e){}
      return list;
    };
  }
}catch(e){}

/* 6. 立绘素材位：名字 → 文件 id（素材未提供时 asset() 会显示占位框） */
try{
  if(typeof ASSET_NAME_ID==='object'&&ASSET_NAME_ID&&!ASSET_NAME_ID['德里克·罗斯'])ASSET_NAME_ID['德里克·罗斯']=ROSE_ID;
}catch(e){}

/* 7. 选人界面：「意难平」分组加入罗斯，并把「六个人」改成按实际人数
   ⚠️ 上线开关：V108_ROSE_LIVE=true 时罗斯不出现在选人页（先隐藏，做完了再开）。
      开放时改这一处即可：把 false 改成 true。 */
var V108_ROSE_LIVE=true;
window.__V108_ROSE_LIVE=V108_ROSE_LIVE;
try{
  var G=window.__v76SelectGroups;
  if(V108_ROSE_LIVE&&G&&G[0]&&G[0].ids&&G[0].ids.indexOf(ROSE_ID)<0)G[0].ids.push(ROSE_ID);
}catch(e){}
try{
  if(typeof renderSelect==='function'){
    var __v108Select=renderSelect;
    var CN=['零','一','二','三','四','五','六','七','八','九','十'];
    renderSelect=function(){
      var html=__v108Select.apply(this,arguments);
      try{
        /* 人数按「分组里实际会出现的卡」数，不按 P.length：
           跨版本存档会往 P 里补兜底档案（不会出卡），按 P.length 会多报人数。 */
        var total=0;
        try{
          var G=window.__v76SelectGroups||[];
          var seen={};
          G.forEach(function(g){(g&&g.ids?g.ids:[]).forEach(function(id){if(!seen[id]){seen[id]=1;total++}})});
        }catch(e){}
        if(!total)total=(typeof P!=='undefined'&&Array.isArray(P))?P.length:0;
        var word=CN[total]||String(total);
        html=String(html).replace(/<h2>[^<]*个人，[^<]*种活法<\/h2>/,'<h2>'+word+'个人，'+word+'种活法</h2>');
      }catch(e){}
      return html;
    };
  }
}catch(e){}

/* 8. 赛季界面：加一张「玫瑰之名」负荷卡（含收着打按钮，次数用尽自动隐藏） */
try{
  if(typeof regularView==='function'){
    var __v108Regular=regularView;
    regularView=function(){
      var html=__v108Regular.apply(this,arguments);
      try{
        if(!v108Has()||String(html).indexOf('v108-load-card')>=0)return html;
        var l=v108Load(),left=v108Left();
        var inj=(1+0.15*l);
        var card='<section class="v108-load-card">'
          +'<header><div><small>ROSE · KNEE LOAD</small><b>膝盖负荷</b></div><em>'+l+' / '+V108.LOAD_MAX+'</em></header>'
          +'<div class="v108-bars">'+[1,2,3,4,5].map(function(i){return '<i class="'+(i<=l?'on':'')+'"></i>'}).join('')+'</div>'
          +'<p>+1 层：① 高光夜（单场 21+ 分）；② 累计 8 场出场 ≥37 分钟（硬扛）。−1 层：连续 6 场都平稳出战。每层：场上使用率 +2%，伤病概率 ×'+(1+V108.INJ_PER_LOAD).toFixed(2)+'（当前 ×'+inj.toFixed(2)+'）。</p>'
          +'<div class="v108-row"><button class="btn secondary" onclick="v108EaseUp()" '+(left<=0?'disabled':'')+'>收着打（本赛季剩 '+left+' 次）</button>'
          +'<span>'+(career.v108Saved?'落地保护已用掉':'落地保护：未使用（生涯前 4 季，一次改写报销级膝伤）')+'</span></div>'
          +'</section>';
        var anchor='</section><section class="season-command">';
        if(String(html).indexOf(anchor)>=0)return String(html).replace(anchor,'</section>'+card+'<section class="season-command">');
        return card+html;
      }catch(e){return html}
    };
  }
}catch(e){}
try{
  var st=document.createElement('style');
  st.id='v108-style';
  st.textContent=[
    '.v108-load-card{margin:10px 16px 0;padding:12px 13px;border-radius:22px;background:linear-gradient(150deg,#2a1116,#4a1a22 55%,#7d2433);color:#ffe9ec;box-shadow:0 12px 28px rgba(90,20,32,.25)}',
    '.v108-load-card header{display:flex;align-items:flex-start;justify-content:space-between}',
    '.v108-load-card header small{display:block;font-size:9.5px;color:#e8a7b2;letter-spacing:.1em}',
    '.v108-load-card header b{display:block;font-size:16px;margin-top:2px}',
    '.v108-load-card header em{font-style:normal;font-size:20px;font-weight:1000;color:#ffd0d7}',
    '.v108-bars{display:flex;gap:5px;margin:9px 0 7px}',
    '.v108-bars i{flex:1;height:9px;border-radius:99px;background:rgba(255,255,255,.16)}',
    '.v108-bars i.on{background:linear-gradient(90deg,#ff8a9a,#ff4d63)}',
    '.v108-load-card p{margin:0;font-size:11.5px;line-height:1.6;color:#f6ccd3}',
    '.v108-row{display:flex;align-items:center;gap:9px;margin-top:10px}',
    '.v108-row .btn{flex:none}',
    '.v108-row span{font-size:10.5px;color:#e8a7b2;line-height:1.4}'
  ].join('');
  (document.head||document.documentElement).appendChild(st);
}catch(e){}

window.__v108WireDebug={story:STORY.length,events:EVS.length,groups:(window.__v76SelectGroups&&window.__v76SelectGroups[0])?window.__v76SelectGroups[0].ids:null};
})();

