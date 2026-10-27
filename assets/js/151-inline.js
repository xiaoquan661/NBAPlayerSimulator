
/* ============================================================
 * 新游戏《我的名字》· 故事线事件包 v1 (M1.5 → M2 预产)
 * 兑现捏人页承诺：
 *   - 自白分线：6 条线 × 3-4 事件（家庭/复仇/纯粹/证明/边缘/洒脱）
 *   - 里程碑包：首次首发/生涯新高/第一个两双/绝杀/大伤归来 等
 *   - 名气消费：阈值触发代言事件
 * 触发机制：包装引擎 maybeStory 链（词法赋值，引擎内部调用可见——
 *   引擎原版补丁曾用赋值式重定义过 maybeStory，同 draftLines 先例）
 * 事件格式与 campaigns 完全同构：{t, b, c:[[文案,效果描述,fx],...]}
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- 事件定义 ---------- */

  // 自白分线（按 vow 过滤触发）
  const VOW_EVENTS = {
    // 「让家里过上好日子」——家庭线：汇款、探亲、抉择
    family: [
      { t: '第一笔工资', minSeason: 1, minGames: 5, b: '工资到账的短信在训练后弹出来。你盯着那串数字看了很久——这是你人生第一笔这么大数额的钱，而家里还在为日常开销精打细算。', c: [['把一半寄回家', '名气+5 心态+4', { fame: 5, a: { mentality: 4 } }], ['先给自己租个像样的公寓', '自信+4 健康+3', { c: 4, h: 3 }], ['全部存起来，以后再说', '心态+6', { a: { mentality: 6 } }]] },
      { t: '家里的电话', minSeason: 2, minGames: 8, b: '视频里母亲把手机举得很近，问你吃得好不好。她身后是老家熟悉的墙。她没提钱，但你知道那通电话是掐着你训练结束后的时间打的。', c: [['让她别担心，这里一切都好', '心态+5', { a: { mentality: 5 } }], ['给家里换个新房子', '名气+8 自信+3', { fame: 8, c: 3 }], ['教她用视频通话，每天打', '心态+3 健康+4', { a: { mentality: 3 }, h: 4 }]] },
      { t: '家人的现场首秀', minSeason: 3, minGames: 10, b: '机票和行程终于定下来了。母亲和姐姐坐在观众席第三排——她们这辈子第一次现场看你打职业比赛。热身时你投丢了两个球，因为总是忍不住往那边看。', c: [['为她打出最好的一场', '自信+8 OVR+1', { c: 8, o: 1 }], ['赛前把球票钱退给她们', '心态+6 名气+5', { a: { mentality: 6 }, fame: 5 }], ['装作不认识，赛后拥抱', '心态+8', { a: { mentality: 8 } }]] }
    ],
    // 「总有一天他们会念我的名字」——复仇线：老东家、正名
    name: [
      { t: '对阵选中你的球队', minSeason: 1, minGames: 15, b: '赛程表上这支队被你圈了三个月。当初用那个顺位选你、又在季前赛把你按在板凳上的教练，现在站在对面。解说正在念他队里新星的名字。', c: [['打出统治级表现', '自信+8 信任+4', { c: 8, tr: 4 }], ['赛前握手时平静问好', '心态+6 名气+4', { a: { mentality: 6 }, fame: 4 }], ['什么也不说，赢球就是回答', 'OVR+1 心态+4', { o: 1, a: { mentality: 4 } }]] },
      { t: '旧报道被翻出来了', minSeason: 2, minGames: 12, b: '一篇两年前的选秀报告又被媒体翻出来，标题还是当初那句质疑。评论区有人贴了你现在的数据，有人说样本太小。', c: [['转发并只回一个句号', '自信+6 名气+6', { c: 6, fame: 6 }], ['让数据继续说话', 'OVR+1 心态+3', { o: 1, a: { mentality: 3 } }], ['逐条反驳', '自信+4 心态-3 名气+8', { c: 4, a: { mentality: -3 }, fame: 8 }]] },
      { t: '全明星投票名单', minSeason: 3, minGames: 20, b: '你的名字第一次出现在全明星候选名单上。五年前选秀夜没被念到名字的人，现在离全明星只差一轮投票。', c: [['拉票，用母语发一条', '名气+10 自信+5', { fame: 10, c: 5 }], ['不拉票，看结果', '心态+6', { a: { mentality: 6 } }], ['把这个消息告诉当初质疑你的人', '名气+6 心态+5', { fame: 6, a: { mentality: 5 } }]] }
    ],
    // 「我只为篮球而来」——纯粹线：低谷心态稳、专注加成
    pure: [
      { t: '舆论风暴中的训练馆', minSeason: 1, minGames: 20, b: '媒体的批评铺天盖地，但训练馆里只有球鞋摩擦地板的声音。你加练到闭馆——这里的规则很简单：进或者不进，没有第三个答案。', c: [['继续加练', '投射+2 心态+3', { a: { shooting: 2, mentality: 3 } }], ['看录像找问题', '组织+2 信任+3', { a: { playmaking: 2 }, tr: 3 }], ['什么都不想，睡觉', '健康+5 心态+2', { h: 5, a: { mentality: 2 } }]] },
      { t: '代言邀约', minSeason: 2, minGames: 15, b: '经纪人带来一个综艺邀约，报酬抵得上几个月工资。档期正好卡在休赛期特训计划中间。', c: [['拒绝，篮球之外都是噪音', '心态+6 投射+2', { a: { mentality: 6, shooting: 2 } }], ['接下，钱也是安全感', '名气+8 自信+3', { fame: 8, c: 3 }], ['折中：只拍一天广告', '名气+4 心态+3', { fame: 4, a: { mentality: 3 } }]] },
      { t: '十年后你还爱这项运动吗', minSeason: 4, minGames: 10, b: '一个小学记者的问题，在更衣室门口拦住你。你愣了一下——上一个问你「为什么打球」的人，是十年前的自己。', c: [['告诉他：因为热爱', '心态+8 自信+4', { a: { mentality: 8 }, c: 4 }], ['告诉他：因为我擅长', '自信+6 心态+3', { c: 6, a: { mentality: 3 } }], ['把签名球送给他，不回答', '名气+5 心态+4', { fame: 5, a: { mentality: 4 } }]] }
    ],
    // 「证明被低估的人也能飞」——证明线：大场面、外媒、名气快涨
    prove: [
      { t: '外媒的尖锐提问', minSeason: 1, minGames: 18, b: '赛后采访，一个外媒记者的问题藏着刺：「你觉得自己是实力打上首发，还是球队的商业考量？」整个发布会安静了两秒。', c: [['用数据和表现回答', '自信+6 信任+5', { c: 6, tr: 5 }], ['正面回击：这个话题到此为止', '名气+8 自信+3', { fame: 8, c: 3 }], ['微笑回避，明天用表现说', '心态+5 信任+3', { a: { mentality: 5 }, tr: 3 }]] },
      { t: '旧友德比之夜', minSeason: 2, minGames: 25, b: '又一名你认识的球员进入了联盟。今晚你们首次对决，很多人的目光都聚在这场比赛上。赛前他在球员通道冲你点了点头。', c: [['打出最高水平的对决', '自信+8 OVR+1', { c: 8, o: 1 }], ['赛后交换球衣', '名气+10 心态+4', { fame: 10, a: { mentality: 4 } }], ['赢下比赛比什么都重要', 'OVR+1 信任+4', { o: 1, tr: 4 }]] },
      { t: '被剪进纪录片的那个球', minSeason: 3, minGames: 15, b: '你的隔人暴扣被官方账号置顶，配文是当年形容某位前辈的词。社交媒体的转发热潮里，有人开始用「下一个」称呼你。', c: [['那是团队战术的功劳', '信任+6 名气+6', { tr: 6, fame: 6 }], ['这就是我每天训练的意义', '自信+8', { c: 8 }], ['把荣誉置顶改成家乡青训营', '名气+12 心态+3', { fame: 12, a: { mentality: 3 } }]] }
    ],
    // 「打上 NBA，哪怕一分钟」——边缘线：轮换、机会、执念
    'one-min': [
      { t: '轮换名单外的名字', minSeason: 1, minGames: 10, b: '教练的白板上，轮换名单十个名字里没有你。助教拍拍你：G联赛的出场时间也是时间。', c: [['去 G 联赛打出统治力', '终结+3 自信+4', { a: { finishing: 3 }, c: 4 }], ['留在 NBA 跟队训练', '投射+2 信任+4', { a: { shooting: 2 }, tr: 4 }], ['找教练当面谈', '信任+6 心态-2', { tr: 6, a: { mentality: -2 } }]] },
      { t: '垃圾时间的十二分钟', minSeason: 1, minGames: 30, b: '球队大比分落后，还剩十二分钟，教练终于朝你点了点头。你脱下训练服的速度快过任何一次热身。', c: [['每一球都当最后一球打', '自信+6 终结+2', { c: 6, a: { finishing: 2 } }], ['展示组织能力', '组织+3 信任+3', { a: { playmaking: 3 }, tr: 3 }], ['全力防守刷存在感', '防守+3 信任+4', { a: { defense: 3 }, tr: 4 }]] },
      { t: '第一份保障合同', minSeason: 2, minGames: 8, b: '经纪人打来电话，声音在抖：「全额保障，两年。」两年前的夏天，没有一支球队愿意给你一张十天合同。', c: [['签字，然后继续训练', '心态+8 OVR+1', { a: { mentality: 8 }, o: 1 }], ['把这个消息告诉家人', '名气+6 心态+5', { fame: 6, a: { mentality: 5 } }], ['请全队吃饭', '信任+8 自信+3', { tr: 8, c: 3 }]] }
    ],
    // 「就试试，不行就回去读书」——洒脱线：压力小、闲适事件
    easy: [
      { t: '客场城市的深夜食堂', minSeason: 1, minGames: 12, b: '背靠背第二场输球，队友们都回酒店了。你在客场城市找到一家营业到凌晨的拉面店，老板不认识你，只是问：加不加蛋。', c: [['加双蛋，管他呢', '心态+6 健康+3', { a: { mentality: 6 }, h: 3 }], ['和老板聊了半小时篮球', '心态+5 名气+3', { a: { mentality: 5 }, fame: 3 }], ['拍照发了个动态', '名气+5 自信+3', { fame: 5, c: 3 }]] },
      { t: '「认真的吗」', minSeason: 2, minGames: 20, b: '某天早训结束，队友突然问你：你打球的时候居然是认真的？你以为自己一直藏着的那种松弛感，原来所有人都看在眼里。', c: [['对，我认真但我不痛苦', '心态+8 自信+4', { a: { mentality: 8 }, c: 4 }], ['人嘛，开心最重要', '心态+6 健康+4', { a: { mentality: 6 }, h: 4 }], ['其实我偷偷加练很多', '投射+3 自信+3', { a: { shooting: 3 }, c: 3 }]] },
      { t: '赛季结束的那天', minSeason: 3, minGames: 40, b: '常规赛 82 场打完。更衣室里有人哭，有人立刻订了度假机票。你收拾柜子，突然意识到：自己居然一站就是一整个赛季。', c: [['订机票，去海边', '健康+8 心态+6', { h: 8, a: { mentality: 6 } }], ['加练整个休赛期', 'OVR+1 投射+2', { o: 1, a: { shooting: 2 } }], ['回家，吃妈妈做的饭', '名气+8 心态+8', { fame: 8, a: { mentality: 8 } }]] }
    ]
  };

  // 里程碑包（条件触发，与自白无关）
  const MILESTONES = [
    { id: 'ms-first-start', t: '第一次首发', when: function (c) { return !c.__msFirstStart && c.careerTotals && c.careerTotals.games >= 1 && c.trust >= 62; }, b: '首发名单念到你名字的那一刻，你下意识看了一眼替补席——那里坐了你太久了。今晚，你是先发五人之一。', c: [['把这场比赛当作起点', '自信+8 信任+5', { c: 8, tr: 5 }], ['打得低调，稳住位置', '心态+5 信任+6', { a: { mentality: 5 }, tr: 6 }], ['火力全开证明自己', '自信+10 心态-3', { c: 10, a: { mentality: -3 } }]], mark: '__msFirstStart' },
    { id: 'ms-double-double', t: '第一个两双', when: function (c) { return !c.__msDoubleDouble && c.seasonStats && Number(c.seasonStats.pts) >= 10 && Number(c.seasonStats.reb) >= 10; }, b: '技术台确认：两双。你的名字和大帝、约基奇出现在同一份统计里。社交媒体上有人翻出你的球探报告，在「可能无法适应 NBA」下面划了重点。', c: [['这只是常规操作的开始', '自信+6 OVR+1', { c: 6, o: 1 }], ['把比赛用球留下来', '心态+5 名气+5', { a: { mentality: 5 }, fame: 5 }], ['采访时感谢队友', '信任+6 名气+4', { tr: 6, fame: 4 }]], mark: '__msDoubleDouble' },
    { id: 'ms-career-high', t: '生涯新高之夜', when: function (c) { return !c.__msCareerHigh && c.gameLog && c.gameLog[0] && c.gameLog[0].line && Number(c.gameLog[0].line.pts) >= 30; }, b: '终场哨响，大屏幕定格在你的得分上——生涯新高。观众的声浪里，有人开始念你的名字，用各种口音。', c: [['享受这一刻，明天归零', '自信+8 心态+4', { c: 8, a: { mentality: 4 } }], ['把这个夜晚献给家人', '名气+8 心态+6', { fame: 8, a: { mentality: 6 } }], ['「我还想要更多」', '自信+10 信任+3', { c: 10, tr: 3 }]], mark: '__msCareerHigh' },
    { id: 'ms-injury-return', t: '大伤归来', when: function (c) { return !c.__msInjuryReturn && c.__hadMajorInjury && !c.injury; }, b: '队医在康复单上签了字：可以复出。过去这些天，你学会了看懂每一份检查报告，也学会了在没有掌声的日子里保持训练。', c: [['复出即全力以赴', '自信+6 健康-4', { c: 6, h: -4 }], ['聪明地找回节奏', '心态+6 健康+4', { a: { mentality: 6 }, h: 4 }], ['把康复经历讲给年轻球员', '信任+5 心态+8', { tr: 5, a: { mentality: 8 } }]], mark: '__msInjuryReturn' },
    { id: 'ms-allstar-first', t: '第一次全明星', when: function (c) { return !c.__msAllstar && c.allStar; }, b: '全明星周末。你的球衣挂在更衣室，和那些你曾在游戏里操控过的名字并排。小时候贴在房间墙上的海报，现在成了你的队友和对手。', c: [['认真打好每一分钟', 'OVR+1 自信+6', { o: 1, c: 6 }], ['享受节日，交朋友', '心态+8 名气+6', { a: { mentality: 8 }, fame: 6 }], ['社交媒体全程直播', '名气+12 自信+4', { fame: 12, c: 4 }]], mark: '__msAllstar' }
  ];

  // 名气阈值事件（代言阶梯）
  const FAME_EVENTS = [
    { id: 'fm-l1', threshold: 20, once: '__fmL1', t: '第一支本土品牌', b: '本地运动品牌发来第一份代言合同——不大，但这是你名字第一次被印在商品上。合同附则写着：需要有基本的出场次数保证。', c: [['签约，把名字印上去', '名气+5 心态+4', { fame: 5, a: { mentality: 4 } }], ['再等等，先站稳脚跟', '心态+6 信任+3', { a: { mentality: 6 }, tr: 3 }]] },
    { id: 'fm-l2', threshold: 40, once: '__fmL2', t: '能量饮料的广告板', b: '主场广告牌上出现了你的形象照。经纪人说这是大众品牌的第一步。你在广告里的动作是那个招牌急停跳投。', c: [['拍出最好的版本', '名气+6 自信+4', { fame: 6, c: 4 }], ['要求广告费部分捐给青训', '名气+10 心态+5', { fame: 10, a: { mentality: 5 } }]] },
    { id: 'fm-l3', threshold: 60, once: '__fmL3', t: '车企的年度代言', b: '电话会议里，车企市场部把「知名度」三个字说了五遍。这份合同的金额，超出了你对「打球赚钱」的全部想象。', c: [['签约，商业帝国第一步', '名气+8 自信+6', { fame: 8, c: 6 }], ['把时间留给篮球', '心态+6 OVR+1', { a: { mentality: 6 }, o: 1 }]] },
    { id: 'fm-l4', threshold: 80, once: '__fmL4', t: '现象级', b: '你登上了一本主流杂志的封面。标题没有提篮球——他们讨论的是「现象」。你的球衣销量曲线，被做成了财经新闻的配图。', c: [['接住这泼天的流量', '名气+10 自信+8', { fame: 10, c: 8 }], ['保持距离，专注赛场', 'OVR+1 心态+8', { o: 1, a: { mentality: 8 } }]] }
  ];

  /* ---------- 触发引擎接入 ---------- */

  const ORIGIN_FAME = { academy: 30, ncaa: 20, cba: 40, undrafted: 5, prep: 25, euro: 35, nbl: 15, gleague: 10 };

  // fx 扩展：支持 fame（名气）字段
  function applyExtendedFx(ch) {
    try {
      if (ch && ch.fame && typeof career !== 'undefined' && career) {
        // 内存兜底（新档首存可能没带 domesticFame）
        if (typeof career.domesticFame !== 'number') {
          const org = (career.__arch && career.__arch.origin) || 'academy';
          career.domesticFame = ORIGIN_FAME[org] != null ? ORIGIN_FAME[org] : 20;
        }
        career.domesticFame = Math.min(100, Math.max(0, career.domesticFame + ch.fame));
      }
    } catch (e) {}
  }

  // 选事件的优先级：里程碑 > 声望阈值 > 自白分线（每场最多弹一个）
  function pickStoryEvent() {
    try {
      /* 事件系统先沿用原版：关闭自白/里程碑/声望/背景事件池。 */
      if (window.__ORIGINAL_EVENTS__ !== false) return null;
      if (typeof career === 'undefined' || !career || career.playerId !== 'custom' || career.retired) return null;
      // 弹窗互斥：引擎已有弹窗时不抢
      if (typeof ui !== 'undefined' && ui && (ui.storyEvent || ui.modal)) return null;

      // 1. 里程碑
      for (const m of MILESTONES) {
        if (!career[m.mark] && m.when(career)) {
          return { t: m.t, b: m.b, c: m.c, __mark: m.mark, _sideEvent: true };
        }
      }
      // 2. 声望阈值
      const fame = career.domesticFame || 0;
      for (const f of FAME_EVENTS) {
        if (!career[f.once] && fame >= f.threshold) {
          return { t: f.t, b: f.b, c: f.c, __mark: f.once, _sideEvent: true };
        }
      }
      // 3. 自白分线（低频：每季最多 1-2 个，用 games 节流）
      const arch = career.__arch || {};
      const vowKey = arch.vow;
      const pool = VOW_EVENTS[vowKey];
      if (pool && pool.length) {
        const seasonKey = '__vowDone_s' + career.seasonNo;
        const done = career[seasonKey] || 0;
        // 每季最多 1 个自白事件，且在已解锁的事件里挑
        if (done < 1) {
          const avail = pool.filter((e, i) => !career['__vowE' + i] && career.seasonNo >= e.minSeason && career.games >= e.minGames);
          if (avail.length) {
            const e = avail[0];
            const idx = pool.indexOf(e);
            return { t: e.t, b: e.b, c: e.c, __vowIdx: idx, __vowSeasonKey: seasonKey, _sideEvent: true };
          }
        }
      }
      // 4. 捏人维度背景事件（出身 / 年代 / 球风 / 难度 / 交叉）
      if (window.__CUSTOM_EVENTS__ && typeof window.__CUSTOM_EVENTS__.pick === 'function') {
        const bg = window.__CUSTOM_EVENTS__.pick(career);
        if (bg) return bg;
      }
      return null;
    } catch (e) { return null; }
  }

  // 包装 storyChoice：应用扩展 fx 并打标记
  try {
    const __eOldChoice = storyChoice;
    storyChoice = function (i) {
      try {
        const ev = (typeof ui !== 'undefined' && ui && ui.storyEvent) || null;
        if (ev) {
          const ch = ev.c[i] && ev.c[i][2];
          if (ch) applyExtendedFx(ch);
          // 打标记（防重复触发）
          if (ev.__mark) career[ev.__mark] = true;
          if (ev.__vowIdx !== undefined) {
            career['__vowE' + ev.__vowIdx] = true;
            career[ev.__vowSeasonKey] = (career[ev.__vowSeasonKey] || 0) + 1;
          }
          career.feed = career.feed || [];
          career.feed.unshift('「' + ev.t + '」：你做出了选择。');
        }
      } catch (e) {}
      return __eOldChoice.apply(this, arguments);
    };
  } catch (e) {}

  // 包装 simulateGame：每场后尝试触发（走引擎 storyEvent 弹窗渲染管线）
  try {
    const __eOldSim = simulateGame;
    simulateGame = function () {
      const before = (typeof career !== 'undefined' && career) ? career.games : 0;
      const r = __eOldSim.apply(this, arguments);
      try {
        if (typeof career !== 'undefined' && career && !career.retired && career.games > before) {
          // 大伤标记（供 ms-injury-return 用）
          if (career.injury && career.injury.severity === 'major') career.__hadMajorInjury = true;
          const ev = pickStoryEvent();
          if (ev) {
            stopSim();
            ui.storyEvent = ev;
            save();
            render();
          }
        }
      } catch (e) {}
      return r;
    };
  } catch (e) {}

  // 存档补齐：旧档/竞态档没有 domesticFame 时按出身兜底初始化
  try {
    setInterval(function () {
      const raw = localStorage.getItem('save_bust_no1_v4');
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.playerId !== 'custom') return;
      let dirty = false;
      if (typeof s.domesticFame !== 'number') {
        const org = (s.__arch && s.__arch.origin) || 'academy';
        s.domesticFame = ORIGIN_FAME[org] != null ? ORIGIN_FAME[org] : 20;
        dirty = true;
      }
      if (dirty) localStorage.setItem('save_bust_no1_v4', JSON.stringify(s));
    }, 1500);
  } catch (e) {}

  window.__STORYPACK__ = { VOW_EVENTS, MILESTONES, FAME_EVENTS };
  window.__CUSTOM_STORY_PICK__ = pickStoryEvent;

})(window);
