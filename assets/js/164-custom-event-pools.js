
/* ============================================================
 * 自建球员 · 捏人维度事件池
 *
 * 事件按捏人选择分池：
 *   - 出身：ncaa / cba / academy / undrafted
 *   - 年代：2001 / 2007 / 2013 / 2016 / 2017 / 2026
 *   - 球风：10 种
 *   - 难度：easy / normal / hard / hell
 *   - 自白：已有 151-inline.js 的 6 条线，不在这里重复
 *   - 交叉：少量出身 × 年代事件
 *
 * 触发：
 *   - 常规赛早段 G12～G34 一次
 *   - 常规赛末段 G60+ 一次
 *   - 每季最多 2 个“背景事件”
 *   - 走 151 的 pickStoryEvent，优先级低于 151 的里程碑/声望/自白
 *
 * 事件效果只使用现有字段：a / h / c / tr / s / o / fame / flag
 * ============================================================ */
(function () {
  'use strict';
  if (window.__CUSTOM_EVENT_POOLS__) return;
  window.__CUSTOM_EVENT_POOLS__ = true;

  function mk(id, dim, key, t, b, c, opt) {
    return Object.assign({
      __customEventId: id,
      __customDim: dim,
      __customKey: key,
      _sideEvent: true,
      t: t,
      b: b,
      c: c
    }, opt || {});
  }

  var ORIGIN = {
    ncaa: [
      mk('origin:ncaa:1', 'origin', 'ncaa', '大学教练的电话', '大学教练在电话里说，学校愿意为你保留一个夏天的训练馆。那里没有 NBA 的摄像机，只有你熟悉的篮筐和一群还没被联盟改变的人。', [
        ['回学校练一个夏天', '投射 +2 · 心态 +2 · 名气 +3', { a: { shooting: 2, mentality: 2 }, fame: 3 }],
        ['留在 NBA 训练馆', '防守 +2 · 信任 +4', { a: { defense: 2 }, tr: 4 }],
        ['两边都不去，自己练', '自信 +4 · 健康 +3', { c: 4, h: 3 }]
      ], { minSeason: 1, minGames: 12 }),
      mk('origin:ncaa:2', 'origin', 'ncaa', '媒体又把你当成外来者', '赛后采访，记者第三次问你“美国篮球教会了你什么”。你明明是在这里读完大学的，但他们还是习惯先问你的来处。', [
        ['用防守回应', '防守 +2 · 信任 +4', { a: { defense: 2 }, tr: 4 }],
        ['在采访里把话说清楚', '名气 +6 · 自信 +3', { fame: 6, c: 3 }],
        ['不回应，继续打球', '心态 +4', { a: { mentality: 4 } }]
      ], { minSeason: 2, minGames: 10 })
    ],
    cba: [
      mk('origin:cba:1', 'origin', 'cba', '国家队的征召', '篮协的征召函在休赛期送到。回去，意味着缩短夏训和休息；不回去，国内舆论不会轻易放过你。', [
        ['回国参赛', '名气 +8 · 健康 -4 · 信任 +3', { fame: 8, h: -4, tr: 3 }],
        ['沟通，只打关键场', '名气 +4 · 信任 +2', { fame: 4, tr: 2 }],
        ['留在美国备战新赛季', '健康 +4 · 信任 -4', { h: 4, tr: -4 }]
      ], { minSeason: 1, minGames: 18 }),
      mk('origin:cba:2', 'origin', 'cba', '老东家想让你回去', 'CBA 老东家的经理打来电话：休赛期想请你回去打一场告别赛，票已经卖完了。你想起当年离开时，球馆里那些没来得及说再见的人。', [
        ['回去打一场告别赛', '名气 +6 · 心态 +4', { fame: 6, a: { mentality: 4 } }],
        ['拒绝，专注 NBA', '自信 +3 · 信任 +3', { c: 3, tr: 3 }],
        ['投资家乡青训', '名气 +8 · 健康 -2', { fame: 8, h: -2 }]
      ], { minSeason: 2, minGames: 12 })
    ],
    academy: [
      mk('origin:academy:1', 'origin', 'academy', '体校教练来了', '体校教练第一次来美国看你。他站在训练馆门口，手里还是那个旧保温杯。你突然想起十四岁那年，他把你从宿舍叫起来加练的早晨。', [
        ['带他看完整堂训练', '信任 +3 · 心态 +4', { tr: 3, a: { mentality: 4 } }],
        ['请他吃饭，聊过去', '名气 +4 · 自信 +3', { fame: 4, c: 3 }],
        ['训练优先，改天再约', '投射 +2 · 信任 -2', { a: { shooting: 2 }, tr: -2 }]
      ], { minSeason: 1, minGames: 12 }),
      mk('origin:academy:2', 'origin', 'academy', '体制内的会议', '体育局的会议室里，桌上摊着休赛期全运会的名单。他们说，你是从这里出去的，应该回来帮一次，只打一个窗口。经纪人坐在旁边，一直没有说话。', [
        ['服从安排', '名气 +5 · 信任 +2 · 健康 -3', { fame: 5, tr: 2, h: -3 }],
        ['争取只打重要比赛', '名气 +3 · 自信 +2', { fame: 3, c: 2 }],
        ['坚持 NBA 优先', '自信 +4 · 信任 -3', { c: 4, tr: -3 }]
      ], { minSeason: 2, minGames: 15 })
    ],
    undrafted: [
      mk('origin:undrafted:1', 'origin', 'undrafted', '第一份十天合同到期', '十天到了。球队没有裁你，也没有给你新的保障，只问你要不要先去发展联盟等机会。更衣室的柜子还没写你的名字。', [
        ['接受发展联盟', '能力 +2 · 信任 +3', { a: { athleticism: 2 }, tr: 3 }],
        ['要求一份保障合同', '自信 +4 · 信任 -2', { c: 4, tr: -2 }],
        ['去其他球队试训', '健康 -3 · 自信 +3', { h: -3, c: 3 }]
      ], { minSeason: 1, minGames: 10 }),
      mk('origin:undrafted:2', 'origin', 'undrafted', '夏季联赛的更衣室', '更衣室里坐着五个落选秀，每个人都在等一个电话。有人已经订好了回国的机票，有人还在反复看自己的集锦。', [
        ['带着他们一起练', '信任 +5 · 心态 +3', { tr: 5, a: { mentality: 3 } }],
        ['只顾自己表现', '自信 +4 · 信任 -2', { c: 4, tr: -2 }],
        ['找老将请教', '能力 +2 · 信任 +3', { a: { defense: 2 }, tr: 3 }]
      ], { minSeason: 1, minGames: 15 })
    ]
  };

  var ERA = {
    '2001': [
      mk('era:2001:1', 'era', '2001', '电视里又在放王治郅的新闻', '年代还在试探中国球员能走多远。每一次国家队征召、每一次回国，都会被写成“态度问题”。你知道自己打的不是一场普通的球。', [
        ['接受比较', '名气 +5 · 心态 +2', { fame: 5, a: { mentality: 2 } }],
        ['拒绝被代表', '自信 +4', { c: 4 }],
        ['去找前辈聊聊', '能力 +2 · 心态 +3', { a: { shooting: 2, mentality: 3 } }]
      ], { minSeason: 1, minGames: 14 })
    ],
    '2007': [
      mk('era:2007:1', 'era', '2007', '“下一个姚明”又上了头条', '姚明已经是全明星，所有中国内线都被拿来和他比较。你打得好，他们说“下一个姚明”；你打得不好，他们说“差得远”。', [
        ['接受期待', '名气 +6 · 自信 +3', { fame: 6, c: 3 }],
        ['把标签放下', '心态 +5', { a: { mentality: 5 } }],
        ['去找姚明聊聊', '能力 +2 · 信任 +2', { a: { finishing: 2 }, tr: 2 }]
      ], { minSeason: 1, minGames: 14 })
    ],
    '2013': [
      mk('era:2013:1', 'era', '2013', '国家队低谷，媒体问你为什么走', '国家队刚经历低谷。有人说，这个时候去 NBA 是逃避；也有人说，只有去更高的地方，才知道差距在哪。', [
        ['正面回应', '名气 +6 · 自信 +2', { fame: 6, c: 2 }],
        ['只谈 NBA', '信任 +3 · 心态 +3', { tr: 3, a: { mentality: 3 } }],
        ['捐钱给青训', '名气 +8 · 健康 -2', { fame: 8, h: -2 }]
      ], { minSeason: 1, minGames: 14 })
    ],
    '2016': [
      mk('era:2016:1', 'era', '2016', '勇士用三分球改变了联盟', '球探报告上多了一行字：不会投三分的内线，会被时代淘汰。你每天加练，但动作还是不够顺。', [
        ['每天加练三分', '投射 +3 · 健康 -2', { a: { shooting: 3 }, h: -2 }],
        ['坚持内线打法', '终结 +2 · 篮板 +2', { a: { finishing: 2, rebounding: 2 } }],
        ['做空间型内线', '投射 +2 · 篮板 +1', { a: { shooting: 2, rebounding: 1 } }]
      ], { minSeason: 1, minGames: 16 })
    ],
    '2017': [
      mk('era:2017:1', 'era', '2017', '双向合同时代', '联盟里到处是双向合同。机会更多，也更像一张随时会到期的车票。经纪人问你，要不要先接受一份双向，留在联盟里。', [
        ['接受双向合同', '信任 +4 · 健康 +2', { tr: 4, h: 2 }],
        ['要求正式名额', '自信 +4 · 信任 -2', { c: 4, tr: -2 }],
        ['赌一个夏天', '能力 +2 · 自信 +3', { a: { athleticism: 2 }, c: 3 }]
      ], { minSeason: 1, minGames: 14 })
    ],
    '2026': [
      mk('era:2026:1', 'era', '2026', '流量比数据更快', '你的一场季前赛集锦在社交平台上爆了。评论里有人叫你“下一个”，也有人问你下一步去哪。经纪人建议你趁现在做个人品牌。', [
        ['经营个人品牌', '名气 +8 · 自信 +2', { fame: 8, c: 2 }],
        ['关掉社媒', '心态 +5', { a: { mentality: 5 } }],
        ['用平台做青训', '名气 +6 · 心态 +3', { fame: 6, a: { mentality: 3 } }]
      ], { minSeason: 1, minGames: 14 })
    ]
  };

  var STYLE = {
    'floor-general': [mk('style:floor-general:1', 'style', 'floor-general', '最后一攻，球在你手里', '暂停回来，主教练把战术板递给你。所有人都拉开，等你决定这一球怎么打。', [
      ['传给空位队友', '信任 +5 · 组织 +2', { tr: 5, a: { playmaking: 2 } }],
      ['自己投', '自信 +4 · 投射 +2', { c: 4, a: { shooting: 2 } }],
      ['叫挡拆，重新组织', '组织 +2 · 信任 +2', { a: { playmaking: 2 }, tr: 2 }]
    ], { minSeason: 1, minGames: 18 })],
    'combo-guard': [mk('style:combo-guard:1', 'style', 'combo-guard', '第一步过掉人之后', '你已经把防守人甩在身后，补防的大个子正在往篮下退。现在要决定，是直接上，还是停下来。', [
      ['冲击篮筐', '终结 +3 · 健康 -2', { a: { finishing: 3 }, h: -2 }],
      ['急停跳投', '投射 +2 · 自信 +2', { a: { shooting: 2 }, c: 2 }],
      ['分底角', '组织 +2 · 信任 +3', { a: { playmaking: 2 }, tr: 3 }]
    ], { minSeason: 1, minGames: 16 })],
    'catch-shoot': [mk('style:catch-shoot:1', 'style', 'catch-shoot', '绕了三道掩护', '你从底线绕出来，防守人追得很紧。球已经在空中，你只有半秒决定接球后的第一个动作。', [
      ['接球就投', '投射 +3 · 自信 +2', { a: { shooting: 3 }, c: 2 }],
      ['假投突破', '终结 +2 · 自信 +2', { a: { finishing: 2 }, c: 2 }],
      ['重新跑位', '投射 +1 · 信任 +3', { a: { shooting: 1 }, tr: 3 }]
    ], { minSeason: 1, minGames: 16 })],
    'three-d': [mk('style:three-d:1', 'style', 'three-d', '对方头号得分手在你面前', '教练把对方最强的得分手交给你。全场都知道，这一轮系列赛会从你这次防守开始。', [
      ['全场贴防', '防守 +3 · 健康 -3', { a: { defense: 3 }, h: -3 }],
      ['协防收缩', '防守 +2 · 信任 +3', { a: { defense: 2 }, tr: 3 }],
      ['换防内线', '防守 +1 · 篮板 +2', { a: { defense: 1, rebounding: 2 } }]
    ], { minSeason: 1, minGames: 20 })],
    'point-forward': [mk('style:point-forward:1', 'style', 'point-forward', '什么都会一点，也什么都不精', '教练说你像一把瑞士军刀：什么都能做，但没有一项能杀死比赛。你自己也知道，这句话一半是夸奖。', [
      ['专精一项', '投射 +2 · 自信 +3', { a: { shooting: 2 }, c: 3 }],
      ['保持全能', '组织 +2 · 防守 +2', { a: { playmaking: 2, defense: 2 } }],
      ['做更衣室领袖', '信任 +5 · 心态 +3', { tr: 5, a: { mentality: 3 } }]
    ], { minSeason: 1, minGames: 18 })],
    'stretch-four': [mk('style:stretch-four:1', 'style', 'stretch-four', '对方中锋放你两步', '防守你的中锋退到禁区边缘，意思很明确：投吧，我们不信你能进。', [
      ['出手三分', '投射 +3 · 自信 +2', { a: { shooting: 3 }, c: 2 }],
      ['背身打内线', '终结 +2 · 篮板 +2', { a: { finishing: 2, rebounding: 2 } }],
      ['冲抢篮板', '篮板 +3 · 健康 -2', { a: { rebounding: 3 }, h: -2 }]
    ], { minSeason: 1, minGames: 16 })],
    'paint-anchor': [mk('style:paint-anchor:1', 'style', 'paint-anchor', '挡拆后你被拉到三分线', '对方后卫连续叫挡拆，把你从禁区拉出来。你退一步，他就投；你上前，他就突。', [
      ['沉退护框', '防守 +2 · 篮板 +2', { a: { defense: 2, rebounding: 2 } }],
      ['换防后卫', '防守 +1 · 健康 -3', { a: { defense: 1 }, h: -3 }],
      ['犯规也要拦住', '防守 +2 · 自信 +2 · 信任 -1', { a: { defense: 2 }, c: 2, tr: -1 }]
    ], { minSeason: 1, minGames: 18 })],
    'mismatch-wing': [mk('style:mismatch-wing:1', 'style', 'mismatch-wing', '换防之后，你面前是小个子', '对方换防，你低头看见一个比你矮半头的后卫。队友把球吊进来，全场都在等你怎么处理这个错位。', [
      ['背身单打', '终结 +3', { a: { finishing: 3 } }],
      ['面框突破', '终结 +1 · 运动 +2', { a: { finishing: 1, athleticism: 2 } }],
      ['拉到外线投', '投射 +2 · 自信 +2', { a: { shooting: 2 }, c: 2 }]
    ], { minSeason: 1, minGames: 16 })],
    'lockdown': [mk('style:lockdown:1', 'style', 'lockdown', '教练把对方核心交给你', '录像课上，教练只放了一个人的集锦。然后他关掉投影，看着你说：今晚，你跟着他。', [
      ['锁死他', '防守 +3 · 健康 -3', { a: { defense: 3 }, h: -3 }],
      ['团队防守', '防守 +2 · 信任 +3', { a: { defense: 2 }, tr: 3 }],
      ['攻防都抓', '防守 +2 · 终结 +1 · 健康 -2', { a: { defense: 2, finishing: 1 }, h: -2 }]
    ], { minSeason: 1, minGames: 18 })],
    'microwave': [mk('style:microwave:1', 'style', 'microwave', '替补席站起来，两分钟改变比赛', '第二节还剩两分钟，球队落后 12 分。教练回头看了一眼替补席，你已经在脱训练服。', [
      ['连续出手', '投射 +2 · 自信 +3', { a: { shooting: 2 }, c: 3 }],
      ['先防一个', '防守 +2 · 信任 +3', { a: { defense: 2 }, tr: 3 }],
      ['带动队友', '组织 +2 · 信任 +3', { a: { playmaking: 2 }, tr: 3 }]
    ], { minSeason: 1, minGames: 14 })]
  };

  var DIFFICULTY = {
    easy: [mk('diff:easy:1', 'difficulty', 'easy', '媒体开始把你排进未来全明星', '一份赛季预测把你放进了“未来全明星”名单。你自己知道，现在离那里还很远。', [
      ['保持谦逊', '心态 +4 · 信任 +3', { a: { mentality: 4 }, tr: 3 }],
      ['享受关注', '自信 +4 · 名气 +4', { c: 4, fame: 4 }],
      ['把目标定为全明星', '自信 +3 · 能力 +2', { c: 3, a: { shooting: 2 } }]
    ], { minSeason: 1, minGames: 16 })],
    normal: [mk('diff:normal:1', 'difficulty', 'normal', '没有人特别照顾你', '没有媒体追着你，也没有球队为你清空位置。你只是一个需要自己挣时间的普通新秀。', [
      ['从防守做起', '防守 +2 · 信任 +4', { a: { defense: 2 }, tr: 4 }],
      ['主动要球', '自信 +3 · 信任 -2', { c: 3, tr: -2 }],
      ['等机会', '心态 +3', { a: { mentality: 3 } }]
    ], { minSeason: 1, minGames: 16 })],
    hard: [mk('diff:hard:1', 'difficulty', 'hard', '轮换边缘的夜晚', '大名单上有你的名字，但轮换名单上没有。教练说，机会会来的；你知道，机会不会自己来。', [
      ['加练', '能力 +2 · 健康 -2', { a: { athleticism: 2 }, h: -2 }],
      ['找教练谈', '信任 +4 · 自信 +2', { tr: 4, c: 2 }],
      ['申请交易', '自信 +3 · 信任 -4', { c: 3, tr: -4 }]
    ], { minSeason: 1, minGames: 18 })],
    hell: [mk('diff:hell:1', 'difficulty', 'hell', '所有人都在等你失败', '论坛里已经有人给你取好了外号。每次你上场，弹幕都在等一个失误。', [
      ['用比赛回应', '自信 +5 · 能力 +2', { c: 5, a: { shooting: 2 } }],
      ['关掉外界', '心态 +5', { a: { mentality: 5 } }],
      ['给家里打电话', '健康 +3 · 心态 +3', { h: 3, a: { mentality: 3 } }]
    ], { minSeason: 1, minGames: 18 })]
  };

  var CROSS = [
    mk('cross:academy-2001:1', 'cross', 'academy-2001', '体制与 NBA，只能选一个', '体育局希望你先打完全运会，球队希望你按时报到。两边都说，这是“为了你好”。', [
      ['服从安排', '名气 +6 · 信任 +2 · 自信 -2', { fame: 6, tr: 2, c: -2 }],
      ['和两边谈条件', '名气 +4 · 自信 +3', { fame: 4, c: 3 }],
      ['坚持 NBA 优先', '自信 +5 · 信任 -4', { c: 5, tr: -4 }]
    ], {
      minSeason: 2, minGames: 16,
      match: function (c, a, y) { return a.origin === 'academy' && Number(y) === 2001; }
    }),
    mk('cross:undrafted-2026:1', 'cross', 'undrafted-2026', '落选秀的流量', '一段你在夏季联赛追帽的视频爆了。经纪人说，这是机会；教练说，别被这些东西分心。', [
      ['做内容，接住流量', '名气 +8 · 自信 +2', { fame: 8, c: 2 }],
      ['只打球', '心态 +5', { a: { mentality: 5 } }],
      ['用流量换一次试训', '名气 +5 · 信任 +2', { fame: 5, tr: 2 }]
    ], {
      minSeason: 1, minGames: 12,
      match: function (c, a, y) { return a.origin === 'undrafted' && Number(y) === 2026; }
    })
  ];

  var POOLS = { origin: ORIGIN, era: ERA, style: STYLE, difficulty: DIFFICULTY, cross: CROSS };

  function arch(c) { return (c && c.__arch) || {}; }
  function yearOf(c) { return Number((c && c.draftYear) || arch(c).year) || 0; }

  function slotOf(c) {
    if (!c || c.retired || c.stage !== 'regular') return null;
    var s = c.__customEvSlot;
    if (!s || s.season !== c.seasonNo) {
      s = { season: c.seasonNo, early: false, late: false };
      c.__customEvSlot = s;
    }
    if (c.games >= 12 && c.games <= 34 && !s.early) return 'early';
    if (c.games >= 60 && !s.late) return 'late';
    return null;
  }

  function eligible(e, c) {
    var used = c.__customEvUsed || {};
    if (used[e.__customEventId]) return false;
    if (e.minSeason && c.seasonNo < e.minSeason) return false;
    if (e.maxSeason && c.seasonNo > e.maxSeason) return false;
    if (e.minGames && c.games < e.minGames) return false;
    return true;
  }

  function poolFor(c) {
    var a = arch(c), y = yearOf(c), out = [];
    function add(list) {
      (list || []).forEach(function (e) {
        if (!e.match || e.match(c, a, y)) out.push(e);
      });
    }
    add(POOLS.cross);
    add(POOLS.origin[a.origin] || []);
    add(POOLS.era[String(y)] || []);
    add(POOLS.style[a.style] || []);
    add(POOLS.difficulty[a.difficulty] || []);
    return out;
  }

  function pick(c) {
    if (!c || c.playerId !== 'custom') return null;
    var slot = slotOf(c);
    if (!slot) return null;
    var list = poolFor(c).filter(function (e) { return eligible(e, c); });
    if (!list.length) return null;
    var a = arch(c);
    var seed = (c.seasonNo * 7 + c.games * 3 + String(a.origin || '').length + String(a.style || '').length) % list.length;
    var ev = list[seed];
    if (!c.__customEvUsed) c.__customEvUsed = {};
    c.__customEvUsed[ev.__customEventId] = 1;
    c.__customEvSlot[slot] = true;
    return Object.assign({}, ev, { _sideEvent: true, __customSlot: slot });
  }

  window.__CUSTOM_EVENTS__ = {
    pools: POOLS,
    pick: pick,
    slot: slotOf,
    eligible: eligible,
    debug: function (c) {
      if (!c) return null;
      return {
        slot: slotOf(c),
        year: yearOf(c),
        arch: arch(c),
        used: c.__customEvUsed || {},
        slots: c.__customEvSlot || null,
        pool: poolFor(c).map(function (e) { return e.__customEventId; })
      };
    }
  };
})();
