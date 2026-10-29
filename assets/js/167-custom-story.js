/* ============================================================
 * 167 · 自建球员事件系统 · 职业三幕 + 每季支线
 *
 * 设计目标：
 *   1. 自建球员不再落入 016 的状元兜底事件。
 *   2. 三幕主线：证明 → 成为谁 → 留下什么。
 *   3. 每次选择写 flag，并在 1 季后的回声事件里回收。
 *   4. 每幕固定 3 拍：第一幕按出身抽，第二幕按角色抽；每季最多 2 个事件。
 *   5. 看广告解锁“出身专属事件天赋”，只增加出身链，不破坏主三幕。
 *   6. 结局读取三幕选择，给出一段明确的“你选过的路”。
 *
 * 本文件必须最后加载，才能包住所有旧层。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v167Story) return;
  window.__v167Story = true;

  var EVENTS = {};
  var BY_ID = {};
  var ACTS = {
    prove: { n: '第一幕', t: '证明', d: '先活下来，再谈身份。' },
    become: { n: '第二幕', t: '成为谁', d: '你在这支球队到底是谁。' },
    leave: { n: '第三幕', t: '留下什么', d: '最后几年，你要什么。' }
  };
  var ACT_ORDER = ['prove', 'become', 'leave'];
  /* 每幕固定 3 拍，但每拍从对应池子里抽：第一幕按出身，第二幕按角色。 */
  var ACT_BEATS = { prove: 3, become: 3, leave: 3 };
  var ACT_MAIN_LIMIT = { prove: 1, become: 1, leave: 1 };
  var ORIGIN_FAMILY = {
    ncaa: 'school',
    cba: 'pro',
    academy: 'hype',
    undrafted: 'survive',
    prep: 'hype',
    euro: 'pro',
    nbl: 'pro',
    gleague: 'survive'
  };
  var ORIGIN_INFO = {
    ncaa: {
      n: '被看见的大学生',
      d: '你从美国大学打上来。教练、校友、母校会一直记得你。',
      chain: '教练的第二通电话 → 母校的筹款电话 → 提前退役球衣的条件 → 母校怎么介绍你',
      closing: '母校最后把你的名字写进了球馆，但没有写“NBA”。他们写的是：他在这里打过球。'
    },
    cba: {
      n: '国家队与球队',
      d: '你从国内联赛出来。国家队、舆论、老东家会一直看着你。',
      chain: '休赛期国家队征召 → 国内舆论 → 老东家告别赛 → 你给联赛留下了什么',
      closing: '你给国内联赛留下的，不是一句“我回来过”，而是一条后来的人可以照着走的路。'
    },
    academy: {
      n: '体系里出来的人',
      d: '你从体校一路打上来。招生片、编制、青训都和你有关。',
      chain: '体校的招生宣传片 → 体校给的编制 → 休赛期带一批孩子 → 体系里出来的人怎么回去',
      closing: '你从体系里出来，最后又走回体系里。你没有改变它，但你让几个孩子少走了几年弯路。'
    },
    undrafted: {
      n: '没有名字的人',
      d: '你没有在选秀夜被念到名字。十天合同、发展联盟、第一次被记住，都是你的线。',
      chain: '更衣柜上的名字 → 老队友的电话 → 看台上的牌子 → 没有名字的人怎么被记住',
      closing: '你退役时，大屏幕没有放你的集锦。但球馆里有人站起来，喊了你的名字。'
    },
    prep: {
      n: '被全美看见的人',
      d: '你从预科一路被看见。排名、媒体、母校会一直跟着你。',
      chain: '预科学校的招生片 → 下一届全美第一 → 预科学校的球衣仪式 → 你代表哪一代人',
      closing: '你退役时，预科学校把你的名字挂进了球馆。下面的孩子抬头看，不知道你曾经也在这里等过一辆迟到的校车。'
    },
    euro: {
      n: '从欧洲回来的人',
      d: '你从欧洲职业联赛回来。老东家、纪念赛、体系标签会一直跟着你。',
      chain: '欧洲老东家的纪念赛 → 欧洲媒体的标签 → 欧洲的告别邀请 → 你给欧洲联赛留下了什么',
      closing: '你没有把欧洲当成跳板。你把它当成一段真正的职业生涯，最后又回去看了一次。'
    },
    nbl: {
      n: '南半球来的明日之星',
      d: '你从 NBL 打上来。推广大使、曝光差距、下一批 Next Star 都和你有关。',
      chain: 'NBL 的推广大使邀请 → 南半球来的质疑 → NBL 的球衣仪式 → Next Star 的下一批人',
      closing: '你让 NBA 记住了 NBL 不只是一个跳板。后来的人沿着你的路，少被问了一句“那是哪里”。'
    },
    gleague: {
      n: '在发展联盟等电话的人',
      d: '你从发展联盟熬出来。轮换、夜班车、下一次电话会一直跟着你。',
      chain: '发展联盟的致敬夜 → 又一次被移出轮换 → 老队友被裁了 → 发展联盟怎么记住你',
      closing: '你退役后回去看过一次夜班车。车上坐着另一批人，你没有叫醒他们。'
    }
  };

  /* 出身 / 自白对三幕的“透镜”：不新增事件，只让同一幕读出不同含义。 */
  var ORIGIN_LENS = {
    ncaa: {
      label: '大学球馆',
      clause: '你从大学球馆里被看见',
      prove: '大学教练还在问你，什么时候回校看看那面墙。',
      become: '校友会想让你代表学校，球队想让你代表市场。',
      leave: '母校准备把你的名字挂进球馆，你要决定下面写什么。',
      ending: '你从大学球馆出发，最后把名字留在了那里。'
    },
    cba: {
      label: '国内联赛',
      clause: '你从国内职业联赛打上来',
      prove: '国内联赛的得分王身份，在 NBA 只够换来一次试训。',
      become: '休赛期国家队窗口期和球队的夏训计划撞在一起，你必须选一个。',
      leave: '老东家想给你办告别赛，国内联赛想知道你留下了什么。',
      ending: '你从国内联赛出发，最后又回头看了一眼。'
    },
    academy: {
      label: '体校体系',
      clause: '你从体校体系里走出来',
      prove: '体校想让你把名字借给招生片，教练说这是任务，也是机会。',
      become: '体育局的会议室里，你的名字和一套体制绑在一起。',
      leave: '体系里的孩子开始问你，怎么走出去。',
      ending: '你从体系里出来，最后又走回体系里。'
    },
    undrafted: {
      label: '落选秀',
      clause: '你从没有名字的地方出发',
      prove: '更衣室的柜子上还没有你的名字，十天合同随时会到期。',
      become: '你刚证明自己能留下，球队已经开始计算下一份合同。',
      leave: '你离开时，大屏幕不会为你放集锦。',
      ending: '你从没有名字的地方出发，最后让别人记住了你的名字。'
    },
    prep: {
      label: '全美预科',
      clause: '你从全美瞩目的聚光灯下出发',
      prove: '全美排名把你推到最前面，也把每一次失误放大。',
      become: '人们开始问，你到底是天赋，还是被包装出来的名字。',
      leave: '预科学校想把你写进招生册，你得决定怎么写。',
      ending: '你从聚光灯下出发，最后学会了怎么关掉它。'
    },
    euro: {
      label: '欧洲联赛',
      clause: '你从欧洲职业联赛回来',
      prove: '欧洲联赛的成熟是你的优势，也是别人认定你到头的理由。',
      become: '欧洲老东家想请你回去办纪念赛，NBA 球队在算你的年龄。',
      leave: '你开始想，退役后要不要回欧洲，把最后一场留给开始的地方。',
      ending: '你从欧洲出发，最后把那里当成了另一段真正的生涯。'
    },
    nbl: {
      label: '南半球',
      clause: '你从南半球打上来',
      prove: '美国媒体很少念你的名字，球探报告只写了一句：对抗成熟。',
      become: 'NBL 想请你做联赛门面，NBA 想让你继续当拼图。',
      leave: '下一批 Next Star 想知道，这条路到底能不能走通。',
      ending: '你从南半球出发，最后让 NBA 记住了 NBL 不只是一个跳板。'
    },
    gleague: {
      label: '发展联盟',
      clause: '你从发展联盟的夜班车上下来',
      prove: '你刚从夜班车上下来，球队随时可能把你移出轮换。',
      become: '你刚站稳轮换，管理层开始用双向合同计算你的价值。',
      leave: '夜班车上还坐着另一批人，你想给他们留下点什么。',
      ending: '你从发展联盟出发，最后回去看过一次那趟夜班车。'
    }
  };

  var VOW_LENS = {
    pure: {
      label: '我只为篮球而来',
      clause: '你只想为篮球本身打球',
      prove: '你不想让别的声音决定你为什么上场。',
      become: '球队要你当角色，你只想知道自己还能不能纯粹地打球。',
      leave: '你开始算，自己还剩几年可以只为篮球而活。',
      ending: '你没有把篮球变成别的东西。'
    },
    family: {
      label: '让家里过上好日子',
      clause: '你想让家里人过上好日子',
      prove: '你每一次上场，背后都有一家人在等。',
      become: '合同上的数字，第一次比战术地位更重要。',
      leave: '你想在离开前，给家里留下一个安稳的以后。',
      ending: '你打球的这些年，确实让一个家庭换了活法。'
    },
    prove: {
      label: '证明黄种人也能飞',
      clause: '你想证明黄种人也能飞',
      prove: '每次外媒提问，你都知道他们在问的不只是篮球。',
      become: '你打得好，他们说市场；你打得不好，他们说水平。',
      leave: '你想留下的不只是一个数据，而是一个答案。',
      ending: '你让下一个孩子少被问了一次“你行不行”。'
    },
    'one-min': {
      label: '打上 NBA，哪怕一分钟',
      clause: '你只想在 NBA 打上一分钟',
      prove: '你还在轮换名单外，任何一分钟都算赢。',
      become: '你刚得到保障合同，又开始担心下一次被裁。',
      leave: '你回头看见，自己已经打了远远不止一分钟。',
      ending: '你得到的从来不止那一分钟。'
    },
    name: {
      label: '总有一天他们会念我的名字',
      clause: '你想让所有人念对你的名字',
      prove: '选秀夜没被念到的名字，你要在这里讨回来。',
      become: '你开始在乎，别人念你名字时的语气。',
      leave: '你想知道，最后他们会用哪一句话介绍你。',
      ending: '他们最后还是念了你的名字。'
    },
    easy: {
      label: '就试试，不行就回去读书',
      clause: '你想着不行就回去读书',
      prove: '你没有把每一次上场都当成生死，反而打得更松。',
      become: '别人在为合同焦虑，你在想打完这季去哪里。',
      leave: '你发现，自己居然一站就是一整个赛季，然后又一年。',
      ending: '你没有把生涯过成战争，你把它过成了一段很长的夏天。'
    }
  };

  var ACT1_LENS = {
    scorer: '你先要了球，也接住了打不进的结果',
    stopper: '你先从防守做起，再谈球权',
    learner: '你先问老将怎么活下来，再谈出头'
  };
  var ACT2_LENS = {
    team: '你为了球队的目标改过自己的打法',
    self: '你坚持用自己的方式打，把目标自己扛',
    mentor: '你把球交出去，让别人因为你变得更好'
  };
  var ACT3_LENS = {
    one_team: '你想留在一座城市，最后也真的留下了',
    ring: '你把一个冠军当成唯一的答案',
    path: '你留下了一条后来的人能走的路'
  };
  var PROVE_METHOD = {
    rebuild: '新秀墙来的时候，你选择改动作，哪怕这个赛季更难。',
    body: '新秀墙来的时候，你用身体硬凿，先把分拿到。',
    wait: '新秀墙来的时候，你接受轮换缩短，等下一次机会。'
  };
  var CLUTCH_LENS = {
    take: '最后一球，你自己投。',
    pass: '最后一球，你按战术传给了空位。',
    drive: '最后一球，你选择突破造犯规。'
  };
  var CONTRACT_LENS = {
    stay: '合同桌上，你选择留下。',
    money: '合同桌上，你选择拿钱回家。',
    wait: '合同桌上，你把决定拖到赛季结束。'
  };
  var ROOM_LENS = {
    captain: '更衣室里，你站出来当了说话的人。',
    alone: '更衣室里，你只管自己的比赛。',
    mentor: '更衣室里，你开始带年轻人。'
  };
  var IMAGE_LENS = {
    embrace: '城市给你贴标签时，你接住了它。',
    resist: '城市给你贴标签时，你把它推开了。',
    use: '城市给你贴标签时，你把它变成了别的东西。'
  };
  var LOAD_LENS = {
    manage: '身体第一次报警时，你选择减负荷。',
    push: '身体第一次报警时，你选择继续打。',
    change: '身体第一次报警时，你选择改角色。'
  };
  var TEAM_LENS = {
    stay: '球队要换方向时，你选择留下。',
    ring: '球队要换方向时，你选择去争冠。',
    rebuild: '球队要换方向时，你选择留下来重建。'
  };
  var BODY_LENS = {
    push: '身体报警时，你选择继续打。',
    change: '身体报警时，你选择改角色，打久一点。',
    rest: '身体报警时，你选择休战。'
  };
  var END_LENS = {
    tour: '离开时，你要了一场告别巡演。',
    quiet: '离开时，你选择安静地走。',
    handover: '离开时，你把位置交给了年轻人。'
  };

  function destinyFor(c, cs) {
    var flags = (cs && cs.flags) || {};
    var id = (cs && cs.origin && cs.origin.id) || originId();
    var vow = (cs && cs.vow) || (c && c.vow) || (c && c.__arch && c.__arch.vow) || '';
    var origin = ORIGIN_LENS[id] || ORIGIN_LENS.undrafted;
    var vowInfo = VOW_LENS[vow] || null;
    return {
      originId: id,
      origin: origin,
      originName: (originInfo(id) || {}).n || id,
      vow: vow,
      vowInfo: vowInfo,
      vowName: vowInfo ? vowInfo.label : '还没有说出口的自白',
      flags: flags,
      act1: ACT1_LENS[flags.prove_role] || '',
      act2: ACT2_LENS[flags.become_way] || '',
      act3: ACT3_LENS[flags.legacy] || '',
      method1: PROVE_METHOD[flags.prove_wall] || '',
      clutch: CLUTCH_LENS[flags.prove_clutch] || '',
      contract: CONTRACT_LENS[flags.become_contract] || '',
      room: ROOM_LENS[flags.become_room] || '',
      image: IMAGE_LENS[flags.become_image] || '',
      load: LOAD_LENS[flags.become_body] || '',
      teamDirection: TEAM_LENS[flags.become_team] || '',
      body: BODY_LENS[flags.leave_body] || '',
      end: END_LENS[flags.leave_end] || ''
    };
  }

  function routeSentence(c, cs) {
    var d = destinyFor(c, cs);
    var opening = d.origin.clause + '，' + (d.vowInfo ? d.vowInfo.clause : '你带着一句还没说出口的话');
    var acts = [
      '第一幕，' + (d.act1 || '你还在证明自己'),
      '第二幕，' + (d.act2 || '你还没有决定自己是谁'),
      '第三幕，' + (d.act3 || '你还没有想好留下什么')
    ];
    return opening + '。' + acts.join('；') + '。';
  }

  function sentenceJoin(list) {
    var parts = (list || []).filter(Boolean).map(function (s) {
      return String(s).replace(/[。；，\s]+$/, '');
    });
    return parts.length ? parts.join('。') + '。' : '';
  }

  function v167FirstSentence(s) {
    s = String(s == null ? '' : s).trim();
    if (!s) return '';
    var i = s.search(/[。！？]/);
    return i >= 0 ? s.slice(0, i + 1) : s;
  }

  function v167ShortTag(s) {
    return String(s == null ? '' : s).split(/[，,]/)[0];
  }

  function lensBlock(c, ev, cs) {
    if (!ev || ev.__kind !== 'main') return '';
    var d = destinyFor(c, cs);
    var act = ev.__act || (cs && cs.act) || 'prove';
    var originLine = d.origin[act] || '';
    var vowLine = d.vowInfo ? (d.vowInfo[act] || '') : '';
    if (!originLine && !vowLine) return '';
    var tags = '<div class="v167-lens-tags"><span>出身 · ' + v167Esc(d.originName) + '</span>'
      + (d.vowInfo ? '<span>自白 · ' + v167Esc(v167ShortTag(d.vowInfo.label)) + '</span>' : '') + '</div>';
    return '<div class="v167-lens">' + tags + '<p>'
      + v167Esc(v167FirstSentence(originLine || vowLine))
      + '</p></div>';
  }

  function isCustom() {
    try { return typeof career !== 'undefined' && career && career.playerId === 'custom'; }
    catch (e) { return false; }
  }

  function v167Esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function v167Hash(str) {
    var h = 2166136261;
    str = String(str || '');
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h >>> 0);
  }

  function v167Val(v, c, cs) {
    try { return typeof v === 'function' ? v(c, cs) : v; }
    catch (e) { console.error('[167] text resolve failed', e); return ''; }
  }

  function v167EchoLine(s) {
    return String(s == null ? '' : s).replace(/[。！？；，,\s]+$/g, '');
  }

  function v167Num(v) {
    v = Number(v);
    return isFinite(v) ? v : 0;
  }

  function originId() {
    try {
      var CG = window.__CREATOR__ || {};
      if (career && career.__arch && career.__arch.origin) return career.__arch.origin;
      if (career && career.customStory && career.customStory.origin && career.customStory.origin.id) {
        return career.customStory.origin.id;
      }
      if (CG.originRoll) return CG.originRoll;
      if (CG.origin) return CG.origin;
    } catch (e) {}
    return 'undrafted';
  }

  function originInfo(id) {
    return ORIGIN_INFO[id] || ORIGIN_INFO.undrafted;
  }

  /* ---------------- 状态 ---------------- */

  function initState(c, origin, unlocked) {
    var sn = v167Num(c && c.seasonNo) || 1;
    var act = 'prove';
    var proveClosed = false;
    var becomeClosed = false;
    if (sn >= 8) { act = 'leave'; proveClosed = true; becomeClosed = true; }
    else if (sn >= 4) { act = 'become'; proveClosed = true; }

    var cs = {
      v: 1,
      origin: { id: origin || originId(), unlocked: !!unlocked, chainStep: 0 },
      vow: (c && (c.vow || (c.__arch && c.__arch.vow))) || '',
      act: act,
      acts: {
        prove: { started: !proveClosed, closed: proveClosed, beats: 0, choices: [] },
        become: { started: act === 'become', closed: becomeClosed, beats: 0, choices: [] },
        leave: { started: act === 'leave', closed: false, beats: 0, choices: [] }
      },
      actsClosed: (proveClosed ? 1 : 0) + (becomeClosed ? 1 : 0),
      choiceCount: 0,
      flags: {},
      used: {},
      echoQueue: [],
      next: act === 'prove' ? 'prove_01' : act === 'become' ? 'become_01' : 'leave_01',
      season: { no: sn, mainFired: false, mainCount: 0, sideFired: false, echoFired: false, eventCount: 0 },
      pending: null,
      outcome: null,
      seasonMod: null,
      lastEventGame: 0,
      lastEventSeason: 0,
      lastLegacySeason: 0,
      resumeSim: false
    };
    if (proveClosed) cs.acts.prove.started = true;
    if (becomeClosed) cs.acts.become.started = true;
    if (sn >= 4) cs.acts.leave.started = act === 'leave';
    return cs;
  }

  /* ---------------- 三幕节拍池 ---------------- */

  function originFamily(id) {
    return ORIGIN_FAMILY[id] || 'pro';
  }

  function roleGroup(c) {
    var r = String(c && c.role || '');
    if (c && c.injury && v167Num(c.injury.gamesLeft) > 0 && (v167Num(c.health) || 100) < 60) return 'injury';
    if (/联盟门面|超级巨星|全明星核心|球队核心/.test(r)) return 'core';
    if (/稳定首发/.test(r)) return 'starter';
    if (/边缘球员/.test(r)) return 'bench';
    return 'rotation';
  }

  function stableOrder(list, c, cs) {
    var seed = [
      c && c.draftYear,
      c && c.playerId,
      cs.origin.id,
      c && c.__arch && c.__arch.key,
      c && c.englishName
    ].join('|');
    return list.slice().sort(function (a, b) {
      return v167Hash(seed + ':' + a) - v167Hash(seed + ':' + b);
    });
  }

  function actPlan(act, c, cs) {
    if (act === 'prove') {
      var fam = originFamily(cs.origin.id);
      if (fam === 'pro') return ['prove_01', 'prove_02', 'prove_03'];
      return ['prove_' + fam + '_01', 'prove_' + fam + '_02', 'prove_' + fam + '_03'];
    }
    if (act === 'become') {
      var rg = roleGroup(c);
      var first = 'become_' + rg + '_01';
      var pool = ['become_02', 'become_03', 'become_04', 'become_05', 'become_06'];
      if (rg === 'core' || rg === 'starter') pool.unshift('become_01');
      if (rg === 'injury') pool = ['become_02', 'become_03', 'become_04', 'become_06'];
      var picks = stableOrder(pool, c, cs).filter(function (id) {
        return !cs.used[id] && id !== first;
      }).slice(0, 2);
      return [first].concat(picks);
    }
    return ['leave_01', 'leave_02', 'leave_03'];
  }

  function mainDefFor(c, cs, act) {
    act = act || cs.act || 'prove';
    var a = cs.acts[act];
    if (!a || a.closed) return null;
    var plan = actPlan(act, c, cs);
    var idx = Math.min(v167Num(a.beats), plan.length - 1);
    while (idx < plan.length && cs.used[plan[idx]]) idx++;
    if (idx >= plan.length) return null;
    return BY_ID[plan[idx]] || null;
  }

  function closeAct(act, c, cs, announce) {
    var a = cs.acts[act];
    if (!a || a.closed) return;
    a.closed = true;
    cs.actsClosed = v167Num(cs.actsClosed) + 1;
    var idx = ACT_ORDER.indexOf(act);
    var nextAct = ACT_ORDER[idx + 1];
    if (nextAct) {
      cs.act = nextAct;
      cs.acts[nextAct].started = true;
      if (announce) {
        c.feed = c.feed || [];
        c.feed.unshift(ACTS[act].n + '「' + ACTS[act].t + '」结束。' + ACTS[nextAct].n + '「' + ACTS[nextAct].t + '」开始。');
      }
    } else if (announce) {
      c.feed = c.feed || [];
      c.feed.unshift('第三幕「留下什么」结束。接下来的每一年，都是你自己写下的余波。');
    }
  }

  function refreshMainNext(c, cs, announce) {
    var guard = 0;
    while (guard++ < 4) {
      var act = cs.act || 'prove';
      var a = cs.acts[act];
      if (!a) break;
      if (!a.closed && v167Num(a.beats) >= (ACT_BEATS[act] || 3)) {
        closeAct(act, c, cs, !!announce);
        continue;
      }
      if (a.closed) {
        var idx = ACT_ORDER.indexOf(act);
        var nextAct = ACT_ORDER[idx + 1];
        if (!nextAct) break;
        cs.act = nextAct;
        cs.acts[nextAct].started = true;
        continue;
      }
      break;
    }
    var cur = cs.act || 'prove';
    var ca = cs.acts[cur];
    if (!ca || ca.closed) { cs.next = 'legacy_loop'; return; }
    var def = mainDefFor(c, cs, cur);
    cs.next = def ? def.id : 'legacy_loop';
  }

  function ensure(c) {
    if (!c) return null;
    if (!c.customStory || typeof c.customStory !== 'object') {
      c.customStory = initState(c, originId(), !!c.originStoryUnlocked);
      if (Array.isArray(c.feed)) c.feed.unshift('故事从你现在的阶段继续。');
    }
    var cs = c.customStory;
    if (c.playerId === 'custom') c.exclusive = false;
    if (!cs.origin || typeof cs.origin !== 'object') cs.origin = { id: originId(), unlocked: !!c.originStoryUnlocked, chainStep: 0 };
    if (!cs.origin.id) cs.origin.id = originId();
    if (!cs.origin.unlocked) {
      var realOrigin = originId();
      if (realOrigin && realOrigin !== cs.origin.id) cs.origin.id = realOrigin;
    }
    cs.origin.unlocked = !!(cs.origin.unlocked || c.originStoryUnlocked);
    if (!cs.acts || typeof cs.acts !== 'object') cs.acts = initState(c, cs.origin.id, cs.origin.unlocked).acts;
    ACT_ORDER.forEach(function (k) {
      if (!cs.acts[k] || typeof cs.acts[k] !== 'object') cs.acts[k] = { started: false, closed: false, beats: 0, choices: [] };
      if (!Array.isArray(cs.acts[k].choices)) cs.acts[k].choices = [];
    });
    /* 修复旧存档：只有当前幕及之前已经完成的幕算“已开始”，后面的幕不能提前亮起。 */
    var curIdx = ACT_ORDER.indexOf(cs.act || 'prove');
    if (curIdx < 0) { cs.act = 'prove'; curIdx = 0; }
    ACT_ORDER.forEach(function (k, i) {
      if (i <= curIdx) cs.acts[k].started = true;
      else if (!cs.acts[k].closed) cs.acts[k].started = false;
    });
    if (!cs.vow) cs.vow = c.vow || (c.__arch && c.__arch.vow) || '';
    if (!cs.flags || typeof cs.flags !== 'object') cs.flags = {};
    if (!cs.used || typeof cs.used !== 'object') cs.used = {};
    if (!Array.isArray(cs.echoQueue)) cs.echoQueue = [];
    if (!cs.season || typeof cs.season !== 'object') cs.season = { no: c.seasonNo || 1, mainFired: false, mainCount: 0, sideFired: false, echoFired: false, eventCount: 0 };
    if (v167Num(cs.season.no) !== v167Num(c.seasonNo)) {
      cs.season = { no: v167Num(c.seasonNo) || 1, mainFired: false, mainCount: 0, sideFired: false, echoFired: false, eventCount: 0 };
      cs.seasonMod = null;
      cs.lastEventGame = 0;
    }
    if (typeof cs.season.mainCount !== 'number') cs.season.mainCount = cs.season.mainFired ? 1 : 0;
    if (typeof cs.season.eventCount !== 'number') cs.season.eventCount = cs.season.mainCount + (cs.season.sideFired ? 1 : 0);
    if (typeof cs.choiceCount !== 'number') cs.choiceCount = 0;
    if (typeof cs.actsClosed !== 'number') cs.actsClosed = 0;
    refreshMainNext(c, cs, false);
    return cs;
  }

  /* ---------------- 事件注册 ---------------- */

  function reg(def) {
    if (!def || !def.id) return;
    def.act = def.act || 'prove';
    def.kind = def.kind || 'side';
    def.priority = def.priority || 0;
    EVENTS[def.id] = def;
    BY_ID[def.id] = def;
  }

  function inWindow(def, c) {
    var w = def.__window || def.window;
    if (!w) return true;
    return c.games >= (w[0] || 0) && c.games <= (w[1] || 999);
  }

  function eligible(def, c, cs) {
    if (!def) return false;
    if (def.once !== false && cs.used[def.id]) return false;
    if (def.cooldown && cs.used[def.id] && (c.seasonNo - cs.used[def.id]) < def.cooldown) return false;
    if (def.originOnly && (!cs.origin.unlocked || cs.origin.id !== def.origin)) return false;
    if (def.minSeason && c.seasonNo < def.minSeason) return false;
    if (def.maxSeason && c.seasonNo > def.maxSeason) return false;
    if (def.minGames && c.games < def.minGames) return false;
    if (def.requires && !def.requires(c, cs)) return false;
    if (def.showIf && !def.showIf(c, cs)) return false;
    if (def.excludes && def.excludes.some(function (id) { return !!cs.used[id]; })) return false;
    if (def.kind === 'main' && def.act && cs.acts[def.act] && cs.acts[def.act].closed) return false;
    return inWindow(def, c);
  }

  function normalizeChoice(ch) {
    if (Array.isArray(ch)) {
      return { key: 'c' + Math.random(), label: ch[0], effectText: ch[1] || '', fx: ch[2] || {} };
    }
    return {
      key: ch.key || ('c' + Math.random()),
      label: ch.label || ch[0] || '',
      effectText: ch.effectText || ch[1] || '',
      fx: ch.fx || ch[2] || {},
      flags: ch.flags,
      flag: ch.flag,
      echo: ch.echo,
      next: ch.next,
      seasonMod: ch.seasonMod,
      v128Log: ch.v128Log,
      showIf: ch.showIf
    };
  }

  function buildEvent(def, c, cs, extra) {
    extra = extra || {};
    var ev = {
      __v167: true,
      __defId: def.id,
      __act: def.act,
      __kind: def.kind,
      __priority: def.priority || 0,
      __slot: extra.slot || (def.kind === 'main' ? 'main' : 'side'),
      __echoIndex: extra.echoIndex,
      _longArc: true,
      t: v167Val(def.t, c, cs),
      scene: v167Val(def.scene, c, cs),
      speaker: v167Val(def.speaker, c, cs),
      cast: v167Val(def.cast, c, cs),
      b: v167Val(def.b, c, cs),
      stakes: v167Val(def.stakes, c, cs),
      c: [],
      __choices: []
    };
    if (def.kind !== 'main') ev._sideEvent = true;
    if (def.__mark) ev.__mark = def.__mark;
    if (def.__vowIdx !== undefined) ev.__vowIdx = def.__vowIdx;
    if (def.__vowSeasonKey) ev.__vowSeasonKey = def.__vowSeasonKey;
    if (def.originOnly) ev.__origin = def.origin;

    var raw = def.c || [];
    raw.forEach(function (item) {
      var ch = normalizeChoice(item);
      if (ch.showIf && !ch.showIf(c, cs)) return;
      var fx = Object.assign({}, ch.fx || {});
      var flags = [];
      if (Array.isArray(ch.flags)) flags = flags.concat(ch.flags);
      if (Array.isArray(fx.flags)) flags = flags.concat(fx.flags);
      if (ch.flag) flags.push(ch.flag);
      if (flags.length) fx.flags = flags;
      ev.c.push([ch.label, ch.effectText, fx]);
      ev.__choices.push({
        key: ch.key,
        label: ch.label,
        effectText: ch.effectText,
        fx: fx,
        echo: ch.echo,
        next: ch.next,
        seasonMod: ch.seasonMod,
        v128Log: ch.v128Log
      });
    });
    return ev;
  }

  /* ---------------- 触发挑选 ---------------- */

  function nextMainDef(c, cs) {
    refreshMainNext(c, cs, false);
    if (cs.acts.leave.closed) {
      var last = v167Num(cs.lastLegacySeason);
      if (!last || (c.seasonNo - last) >= 4) return BY_ID.legacy_loop || null;
      return null;
    }
    var act = cs.act || 'prove';
    var def = mainDefFor(c, cs, act);
    if (def) cs.next = def.id;
    return def;
  }

  function dueEcho(c, cs) {
    for (var i = 0; i < cs.echoQueue.length; i++) {
      var q = cs.echoQueue[i];
      if (!q || q.used) continue;
      if (c.seasonNo < v167Num(q.dueSeason)) continue;
      var def = BY_ID[q.id];
      if (!def) { q.used = true; continue; }
      def.__window = q.window || [24, 66];
      cs.__echoLabel = q.sourceLabel || '';
      var ev = buildEvent(def, c, cs, { slot: 'side', echoIndex: i });
      ev.__echoSource = q.sourceEvent;
      ev.__echoChoice = q.sourceChoice;
      ev.__echoLabel = q.sourceLabel || '';
      return ev;
    }
    return null;
  }

  function milestoneCandidates(c, cs) {
    var out = [];
    var pack = window.__STORYPACK__ || {};
    (pack.MILESTONES || []).forEach(function (m) {
      try {
        if (c[m.mark] || !m.when(c)) return;
        var def = {
          id: 'ms:' + m.id,
          act: cs.act,
          kind: 'milestone',
          priority: 330,
          t: m.t,
          scene: '里程碑',
          b: m.b,
          stakes: '这不是主线。但它是你生涯里真实发生的一刻。',
          c: m.c,
          once: true,
          __mark: m.mark,
          window: [24, 66]
        };
        out.push(buildEvent(def, c, cs, { slot: 'side' }));
      } catch (e) {}
    });
    return out;
  }

  function fameCandidates(c, cs) {
    var out = [];
    var pack = window.__STORYPACK__ || {};
    var fame = v167Num(c.domesticFame);
    (pack.FAME_EVENTS || []).forEach(function (f) {
      try {
        if (c[f.once] || fame < f.threshold) return;
        var def = {
          id: 'fm:' + f.id,
          act: cs.act,
          kind: 'fame',
          priority: 320,
          t: f.t,
          scene: '媒体',
          b: f.b,
          stakes: '你的名字正在被更多人念到。',
          c: f.c,
          once: true,
          __mark: f.once,
          window: [24, 66]
        };
        out.push(buildEvent(def, c, cs, { slot: 'side' }));
      } catch (e) {}
    });
    return out;
  }

  function vowCandidates(c, cs) {
    var out = [];
    var pack = window.__STORYPACK__ || {};
    var arch = c.__arch || {};
    var vowKey = arch.vow || c.vow || cs.vow;
    var pool = (pack.VOW_EVENTS || {})[vowKey];
    if (!pool || !pool.length) return out;
    var seasonKey = '__vowDone_s' + c.seasonNo;
    if (v167Num(c[seasonKey]) >= 1) return out;
    for (var i = 0; i < pool.length; i++) {
      var e = pool[i];
      if (c['__vowE' + i]) continue;
      if (c.seasonNo < (e.minSeason || 1)) continue;
      if (c.games < (e.minGames || 0)) continue;
      var def = {
        id: 'vow:' + vowKey + ':' + i,
        act: cs.act,
        kind: 'vow',
        priority: 340,
        t: e.t,
        scene: '自白',
        b: e.b,
        stakes: '这是你选的那句自白，正在变成现实。',
        c: e.c,
        once: true,
        __vowIdx: i,
        __vowSeasonKey: seasonKey,
        window: [24, 66]
      };
      out.push(buildEvent(def, c, cs, { slot: 'side' }));
      break;
    }
    return out;
  }

  function authoredSideCandidates(c, cs) {
    var out = [];
    Object.keys(EVENTS).forEach(function (id) {
      var def = EVENTS[id];
      if (def.kind !== 'side') return;
      if (def.originOnly) return;
      if (!eligible(def, c, cs)) return;
      out.push(buildEvent(def, c, cs, { slot: 'side' }));
    });
    return out;
  }

  function pool164Choices(raw) {
    return (raw || []).map(function (item) {
      if (Array.isArray(item)) {
        var a = item.slice();
        a[1] = String(a[1] || '').replace(/国内声望/g, '名气');
        return a;
      }
      var o = Object.assign({}, item);
      o.effectText = String(o.effectText || '').replace(/国内声望/g, '名气');
      return o;
    });
  }

  function pool164Candidates(c, cs) {
    var out = [];
    try {
      var api = window.__CUSTOM_EVENTS__;
      var pools = api && api.pools;
      if (!pools) return out;
      var arch = c.__arch || {};
      var originId = (cs.origin && cs.origin.id) || arch.origin || '';
      var year = String(c.draftYear || arch.year || '');
      var list = [];
      function add(arr) {
        (arr || []).forEach(function (e) {
          try {
            if (e.match && !e.match(c, arch, Number(year) || 0)) return;
            if (e.minSeason && c.seasonNo < e.minSeason) return;
            if (e.maxSeason && c.seasonNo > e.maxSeason) return;
            if (e.minGames && c.games < e.minGames) return;
            var id = e.__customEventId || '';
            /* 2001 / 2007 / 2013 的年代池写的是中国球员语境，只给 CBA / 体校出身。 */
            if (/^era:(2001|2007|2013):/.test(id) && ['cba', 'academy'].indexOf(originId) < 0) return;
            var key = 'p164:' + id;
            if (cs.used[key]) return;
            list.push({ e: e, id: key });
          } catch (err) {}
        });
      }
      /* 解锁 167 出身链后，不再抽 164 的同类出身池，避免同一段故事演两遍。 */
      if (!cs.origin.unlocked) add((pools.origin || {})[originId]);
      if (cs.origin.unlocked) add(pools.cross);
      add((pools.era || {})[year]);
      add((pools.style || {})[arch.style]);
      add((pools.difficulty || {})[arch.difficulty]);
      if (!list.length) return out;
      var seed = (c.seasonNo * 7 + c.games * 3 + String(originId).length + String(arch.style || '').length) % list.length;
      var pick = list[seed];
      var def = {
        id: pick.id,
        act: cs.act,
        kind: 'side',
        priority: 200,
        t: pick.e.t,
        scene: '环境事件',
        b: pick.e.b,
        stakes: '这件事和你的出身、年代或球风有关。',
        c: pool164Choices(pick.e.c),
        once: true,
        window: [24, 66]
      };
      out.push(buildEvent(def, c, cs, { slot: 'side' }));
    } catch (e) {}
    return out;
  }

  function contractLine(c) {
    var ct = (c && c.contract) || {};
    var years = Number(ct.years) || 0;
    var salary = Number(ct.salary) || 0;
    var ex = ct.exception;
    var kind = ex === 'minimum' ? '底薪合同'
      : ex === 'rookie' ? '新秀合同'
      : ex === 'renewal' ? '续约合同' : '合同';
    if (years <= 0) return '你的合同已经到期。';
    var pay = salary > 0 ? '，年薪 ' + salary + 'M' : '';
    if (ex === 'ten-day-converted') return '你从 10 天短合同转正，这份合同还剩 ' + years + ' 年' + pay + '。';
    return '你的' + kind + '还剩 ' + years + ' 年' + pay + '。';
  }

  function pickSide(c, cs) {
    var echo = dueEcho(c, cs);
    if (echo) return echo;

    var originCandidates = [];
    Object.keys(EVENTS).forEach(function (id) {
      var def = EVENTS[id];
      if (def.kind !== 'origin') return;
      if (!eligible(def, c, cs)) return;
      originCandidates.push(buildEvent(def, c, cs, { slot: 'side' }));
    });
    if (originCandidates.length) {
      originCandidates.sort(function (a, b) {
        return (b.__priority || 0) - (a.__priority || 0);
      });
      return originCandidates[0];
    }

    var list = []
      .concat(milestoneCandidates(c, cs))
      .concat(fameCandidates(c, cs))
      .concat(vowCandidates(c, cs))
      .concat(authoredSideCandidates(c, cs))
      .concat(pool164Candidates(c, cs));

    list = list.filter(function (ev) {
      return ev && ev.c && ev.c.length;
    });
    if (!list.length) return null;

    list.sort(function (a, b) {
      var pa = a.__priority || 0;
      var pb = b.__priority || 0;
      if (pb !== pa) return pb - pa;
      return v167Hash(c.seasonNo + ':' + c.games + ':' + a.__defId) - v167Hash(c.seasonNo + ':' + c.games + ':' + b.__defId);
    });
    return list[0];
  }

  function pickEvent(c, cs) {
    var act = cs.act;
    var maxEvents = act === 'become' ? 3 : 2;
    if (v167Num(cs.season.eventCount) >= maxEvents) return null;

    var mainLimit = ACT_MAIN_LIMIT[act] || 1;
    var mainCount = v167Num(cs.season.mainCount);
    var canMain = mainCount < mainLimit && c.games >= 6;
    /* 第二幕的第二拍放在赛季后段，避免和第一拍、副线挤在一起。 */
    if (canMain && act === 'become' && mainCount >= 1) {
      canMain = c.games >= 38 && c.games <= 70 && (c.games - v167Num(cs.lastEventGame)) >= 12;
    }
    if (canMain) {
      var main = nextMainDef(c, cs);
      if (main && eligible(main, c, cs)) {
        var ev = buildEvent(main, c, cs, { slot: 'main' });
        if (ev.c && ev.c.length) return ev;
      }
    }
    if (!cs.season.sideFired && c.games >= 24 && (c.games - v167Num(cs.lastEventGame)) >= 8) {
      return pickSide(c, cs);
    }
    return null;
  }

  function markSlot(c, cs, ev) {
    cs.resumeSim = !!ui.sim;
    cs.season.eventCount = v167Num(cs.season.eventCount) + 1;
    if (ev.__slot === 'main') {
      cs.season.mainFired = true;
      cs.season.mainCount = v167Num(cs.season.mainCount) + 1;
    } else {
      cs.season.sideFired = true;
      if (ev.__kind === 'echo') cs.season.echoFired = true;
    }
    if (ev.__echoIndex !== undefined && ev.__echoIndex !== null && cs.echoQueue[ev.__echoIndex]) {
      cs.echoQueue[ev.__echoIndex].used = true;
    }
    cs.lastEventGame = c.games;
    cs.lastEventSeason = c.seasonNo;
    c.lastStoryGame = c.games;
    c.lastStorySeason = c.seasonNo;
  }

  function snapshot(ev) {
    try { return JSON.parse(JSON.stringify(ev)); }
    catch (e) { return ev; }
  }

  /* ---------------- 选择结算 ---------------- */

  function applyChoiceState(ev, i) {
    var c = career;
    var cs = ensure(c);
    var ch = ev.__choices && ev.__choices[i];
    if (!ch) return null;

    var flags = (ch.fx && ch.fx.flags) || [];
    flags.forEach(function (pair) {
      if (!Array.isArray(pair) || pair.length < 2) return;
      cs.flags[pair[0]] = pair[1];
      if (!c.storyFlags) c.storyFlags = {};
      c.storyFlags['cs_' + pair[0]] = pair[1];
    });

    cs.used[ev.__defId] = c.seasonNo;
    cs.choiceCount = v167Num(cs.choiceCount) + 1;
    if (ev.__kind === 'origin') {
      cs.origin.chainStep = Math.min(4, v167Num(cs.origin.chainStep) + 1);
    }

    var act = ev.__act || cs.act;
    if (cs.acts[act]) {
      cs.acts[act].choices.push({
        id: ev.__defId,
        key: ch.key,
        label: ch.label,
        seasonNo: c.seasonNo
      });
      if (cs.acts[act].choices.length > 12) cs.acts[act].choices = cs.acts[act].choices.slice(-12);
      if (ev.__kind === 'main') cs.acts[act].beats = v167Num(cs.acts[act].beats) + 1;
    }

    if (ev.__kind === 'main') refreshMainNext(c, cs, true);
    else if (ch.next) cs.next = ch.next;

    if (ch.seasonMod) cs.seasonMod = Object.assign({}, cs.seasonMod || {}, ch.seasonMod);

    if (ch.echo && ch.echo.id) {
      var due = ch.echo.dueSeason === '+1' ? c.seasonNo + 1 : v167Num(ch.echo.dueSeason);
      if (!due || due <= c.seasonNo) due = c.seasonNo + 1;
      var exists = cs.echoQueue.some(function (q) {
        return q && !q.used && q.id === ch.echo.id && q.sourceEvent === ev.__defId && q.sourceChoice === ch.key;
      });
      if (!exists) {
        cs.echoQueue.push({
          id: ch.echo.id,
          sourceEvent: ev.__defId,
          sourceChoice: ch.key,
          sourceLabel: ch.label,
          dueSeason: due,
          window: ch.echo.window || [24, 66],
          used: false
        });
      }
    }

    if (ch.v128Log) {
      try {
        if (c.v128 && Array.isArray(c.v128.chronicle)) {
          c.v128.chronicle.unshift({ year: c.seasonYear, text: ch.v128Log });
          if (c.v128.chronicle.length > 40) c.v128.chronicle = c.v128.chronicle.slice(0, 40);
        }
      } catch (e) {}
    }

    return ch;
  }

  function outcomeData(cs) {
    var o = cs.outcome || {};
    return {
      __v167: true,
      title: o.title || '',
      act: o.act || '',
      actLabel: (ACTS[o.act] ? ACTS[o.act].n + ' · ' + ACTS[o.act].t : '生涯事件'),
      choiceLabel: o.choiceLabel || '',
      effectText: o.effectText || '',
      echoSeason: o.echoSeason || 0,
      echoLabel: o.echoLabel || '',
      nextTitle: o.nextTitle || ''
    };
  }

  function afterChoice(ev, i, ch) {
    var c = career;
    var cs = ensure(c);
    if (!ch) {
      cs.pending = null;
      ui.storyEvent = null;
      save(); render();
      return;
    }

    try {
      window.v222Pops = [];
      if (typeof window.v222RenderPops === 'function') window.v222RenderPops();
    } catch (e) {}

    var rec = c.storyLog && c.storyLog[c.storyLog.length - 1];
    if (rec) {
      rec.__v167 = true;
      rec.actId = ev.__act;
      rec.eventId = ev.__defId;
      rec.choiceKey = ch.key;
    }

    if (Array.isArray(c.feed)) {
      c.feed = c.feed.filter(function (x) {
        var s = String(x || '');
        return s.indexOf('专属故事「' + ev.t + '」') < 0 && s.indexOf('「' + ev.t + '」：你做出了选择。') < 0;
      });
      c.feed.unshift('「' + ev.t + '」：你选了“' + ch.label + '”。' + (ch.effectText || ''));
    }

    var echoSeason = 0;
    var echoLabel = '';
    if (ch.echo && ch.echo.id) {
      var due = ch.echo.dueSeason === '+1' ? c.seasonNo + 1 : v167Num(ch.echo.dueSeason);
      if (!due || due <= c.seasonNo) due = c.seasonNo + 1;
      echoSeason = due;
      var echoDef = BY_ID[ch.echo.id];
      echoLabel = echoDef ? echoDef.t : '下一季，会有人重新提起这件事。';
    }

    var nextDef = cs.next ? BY_ID[cs.next] : null;
    cs.outcome = {
      eventId: ev.__defId,
      act: ev.__act,
      title: ev.t,
      choiceLabel: ch.label,
      effectText: ch.effectText,
      echoSeason: echoSeason,
      echoLabel: echoLabel,
      nextTitle: (ev.__kind === 'main' && nextDef) ? v167Val(nextDef.t, c, cs) : ''
    };
    cs.pending = null;

    ui.storyEvent = null;
    ui.toast = '';
    ui.modal = { kind: 'storyOutcome', data: outcomeData(cs) };
    save();
    render();

    setTimeout(function () {
      try {
        if (!career || !career.customStory) return;
        if (career.customStory.outcome && !ui.modal && !ui.storyEvent) {
          ui.modal = { kind: 'storyOutcome', data: outcomeData(career.customStory) };
          render();
        }
      } catch (e) {}
    }, 700);
  }

  function closeOutcome() {
    try {
      if (!career || !career.customStory) return;
      var resume = !!career.customStory.resumeSim;
      career.customStory.outcome = null;
      career.customStory.resumeSim = false;
      ui.modal = null;
      ui.toast = '';
      save();
      render();
      if (resume && typeof toggleSim === 'function' && !ui.sim) {
        setTimeout(function () {
          try { if (career && career.stage === 'regular' && !ui.modal && !ui.storyEvent && !ui.sim) toggleSim(); } catch (e) {}
        }, 60);
      }
    } catch (e) {
      console.error('[167] closeOutcome failed', e);
    }
  }

  /* ---------------- UI ---------------- */

  function eventMeta(ev, cs) {
    if (ev.__kind === 'main') {
      var meta = ACTS[ev.__act] || ACTS.prove;
      var beats = cs.acts[ev.__act] ? v167Num(cs.acts[ev.__act].beats) : 0;
      var max = ACT_BEATS[ev.__act] || 3;
      return { kicker: meta.n + ' · ' + meta.t, badge: Math.min(max, beats + 1) + '/' + max };
    }
    if (ev.__kind === 'origin') {
      return { kicker: '出身线 · ' + originInfo(cs.origin.id).n, badge: Math.min(4, v167Num(cs.origin.chainStep) + 1) + '/4' };
    }
    if (ev.__kind === 'echo') return { kicker: '回声 · 后面发生的事', badge: '回声' };
    if (ev.__kind === 'milestone') return { kicker: '里程碑 · 生涯节点', badge: '里程碑' };
    if (ev.__kind === 'fame') return { kicker: '商业 · 代言', badge: '商业' };
    if (ev.__kind === 'vow') return { kicker: '自白 · 你选的那条路', badge: '自白' };
    return { kicker: '每季支线 · 生涯事件', badge: '支线' };
  }

  function renderStory(ev) {
    var cs = ensure(career);
    var em = eventMeta(ev, cs);
    var body = String(ev.b || '').split('\n').filter(function (x) { return String(x).trim(); })
      .map(function (x) { return '<p class="v167-body">' + v167Esc(x) + '</p>'; }).join('');
    var choices = (ev.__choices || []).map(function (ch, i) {
      return '<button type="button" class="v167-choice" onclick="storyChoice(' + i + ');return false">'
        + '<b>' + v167Esc(ch.label) + '</b>'
        + '<span>' + v167Esc(ch.effectText || '') + '</span>'
        + '</button>';
    }).join('');
    var lens = lensBlock(career, ev, cs);
    var scene = [ev.scene, ev.speaker].filter(Boolean).join(' · ');
    return '<div class="overlay v167-overlay"><div class="sheet v167-sheet"><div class="sheet-handle"></div>'
      + '<div class="v167-top"><div><small>' + v167Esc(em.kicker) + '</small><h2>' + v167Esc(ev.t) + '</h2></div><span>' + v167Esc(em.badge) + '</span></div>'
      + (scene ? '<div class="v167-scene">' + v167Esc(scene) + '</div>' : '')
      + lens
      + '<div class="v167-copy">' + body + '</div>'
      + '<p class="v167-stakes">' + v167Esc(v167FirstSentence(ev.stakes || '选择会写进后面的赛季。')) + '</p>'
      + '<div class="choice-list v167-choices">' + choices + '</div>'
      + '<div class="v167-foot"><span>第 ' + (v167Num(career.seasonNo) || 1) + ' 季</span></div>'
      + '</div></div>';
  }

  function renderOutcome(data) {
    var echo = data.echoSeason
      ? '<div class="v167-echo"><b>后面会怎样</b><span>' + v167Esc(data.echoLabel || '下一季会有人重新提起这件事。') + '</span><em>第 ' + data.echoSeason + ' 季</em></div>'
      : '';
    var next = data.nextTitle
      ? '<div class="v167-next">下一章：' + v167Esc(data.nextTitle) + '</div>'
      : '';
    return '<div class="overlay v167-overlay"><div class="sheet v167-outcome"><div class="sheet-handle"></div>'
      + '<small class="v167-kicker">' + v167Esc(data.actLabel || '生涯事件') + '</small>'
      + '<h2>' + v167Esc(data.title || '') + '</h2>'
      + '<p class="v167-pick">你选了：<b>' + v167Esc(data.choiceLabel || '') + '</b></p>'
      + '<div class="v167-effect">' + v167Esc(data.effectText || '') + '</div>'
      + echo + next
      + '<button class="btn primary v167-continue" onclick="v167CloseOutcome()">继续这段生涯 →</button>'
      + '</div></div>';
  }

  function actStatus(cs, key) {
    var a = cs.acts[key];
    var max = ACT_BEATS[key] || 3;
    if (!a) return '未开始';
    if (a.closed) return '已完成';
    if (cs.act === key && a.started) return '进行中 ' + Math.min(max, v167Num(a.beats)) + '/' + max;
    return '未开始 0/' + max;
  }

  function lastChoiceLine(cs, key) {
    var a = cs.acts[key];
    if (!a || !a.choices || !a.choices.length) return '';
    var last = a.choices[a.choices.length - 1];
    return last ? last.label : '';
  }

  function storyViewImpl(c) {
    var cs = ensure(c);
    var d = destinyFor(c, cs);
    var route = routeSentence(c, cs);
    var rows = ACT_ORDER.map(function (key) {
      var meta = ACTS[key];
      var last = lastChoiceLine(cs, key);
      var active = cs.act === key && cs.acts[key].started && !cs.acts[key].closed;
      return '<div class="v167-main-act ' + (cs.acts[key].closed ? 'done' : active ? 'active' : '') + '">'
        + '<div class="v167-main-act-top"><small>' + meta.n + '</small><b>' + meta.t + '</b><span>' + actStatus(cs, key) + '</span></div>'
        + '<p>' + meta.d + '</p>'
        + (last ? '<em>最近一次选择：' + v167Esc(last) + '</em>' : '')
        + '</div>';
    }).join('');
    var origin = originInfo(cs.origin.id);
    var originBlock = cs.origin.unlocked
      ? '<div class="v167-origin-card on"><div class="v167-origin-card-top"><small>出身故事</small><em>已解锁</em></div><b>' + v167Esc(origin.n) + '</b><p>' + v167Esc(origin.chain) + '</p><span>已解锁 · 进度 ' + cs.origin.chainStep + '/4</span></div>'
      : '<div class="v167-origin-card locked"><div class="v167-origin-card-top"><small>出身故事</small><em>🔒 未解锁</em></div><b>' + v167Esc(origin.n) + '</b><p>' + v167Esc(origin.d) + '</p><span>主三幕和每季支线照常进行；看广告后才会出现这条出身专属事件链。</span>'
        + '<button class="v167-origin-btn" style="margin-top:10px" onclick="v167UnlockOriginStoryMidCareer()">🎬 看奖励视频 · 解锁「' + v167Esc(origin.n) + '」事件链</button></div>';
    var logs = (c.storyLog || []).slice(-6).reverse().map(function (x) {
      return '<div class="v167-log-row"><b>' + v167Esc(x.label || '') + '</b><span>' + v167Esc(x.title || '') + '</span><em>' + v167Esc(x.choice || '') + '</em></div>';
    }).join('');
    var chronicle = (c.v128 && c.v128.chronicle || []).slice(0, 6).map(function (x) {
      return '<div class="v167-log-row"><b>' + v167Esc(x.year || '') + '</b><span>' + v167Esc(x.text || '') + '</span></div>';
    }).join('');
    return '<section class="v167-story-view">'
      + '<div class="v167-story-head"><small>三幕主线</small><h2>你的三幕</h2><p>三幕是骨架。每一拍的场景由你的出身和角色决定；你的选择，会在后面的赛季里被重新提起。</p></div>'
      + '<div class="v167-destiny-card"><small>命运轨迹</small>'
      + '<h3>' + v167Esc(d.originName) + ' · ' + v167Esc(d.vowName) + '</h3>'
      + '<p>' + v167Esc(route) + '</p>'
      + '<span>已记录 ' + v167Num(cs.choiceCount) + ' 个选择 · ' + (cs.origin.unlocked ? '出身链 ' + v167Num(cs.origin.chainStep) + '/4' : '出身链未解锁') + '</span></div>'
      + '<div class="v167-main-list">' + rows + '</div>'
      + originBlock
      + (logs ? '<div class="v167-log"><h3>最近的选择</h3>' + logs + '</div>' : '')
      + (chronicle ? '<div class="v167-log"><h3>赛季纪事</h3>' + chronicle + '</div>' : '')
      + '</section>';
  }

  function mainlineCard(c) {
    var cs = ensure(c);
    var meta = ACTS[cs.act] || ACTS.prove;
    var a = cs.acts[cs.act] || { beats: 0, closed: false };
    var max = ACT_BEATS[cs.act] || 3;
    var beats = a.closed ? max : Math.min(max, v167Num(a.beats));
    var nextDef = cs.next ? BY_ID[cs.next] : null;
    var nextTitle = nextDef ? v167Val(nextDef.t, c, cs) : '这一段已经走完';
    var d = destinyFor(c, cs);
    var origin = d.originName + ' · ' + d.vowName;
    var unlockBtn = cs.origin.unlocked ? '' : '<button class="v167-origin-btn" style="margin-top:10px" onclick="v167UnlockOriginStoryMidCareer()">🎬 看奖励视频 · 解锁「' + v167Esc(d.originName) + '」事件链</button>';
    return '<section class="mainline-now v167-mainline-now">'
      + '<header><small>三幕主线 · ' + v167Esc(meta.n) + '</small><span>' + beats + '/' + max + '</span></header>'
      + '<h3>' + v167Esc(meta.t) + '</h3>'
      + '<p><b>接下来：</b>' + v167Esc(nextTitle) + '<br><b>这一幕：</b>' + v167Esc(meta.d) + '</p>'
      + '<div class="mainline-progress"><i style="width:' + Math.round(beats / max * 100) + '%"></i></div>'
      + '<div class="mainline-meta"><b>' + v167Esc(origin) + '</b><button onclick="stopSim();ui.tab=\'story\';render()">查看三幕 →</button></div>'
      + unlockBtn
      + '</section>';
  }

  function epilogueBlock(c) {
    var cs = ensure(c);
    if (!cs) return '';
    var d = destinyFor(c, cs);
    var role = sentenceJoin([d.act1, d.method1, d.clutch]);
    var way = sentenceJoin([d.act2, d.contract, d.room, d.image, d.load, d.teamDirection]);
    var legacy = sentenceJoin([d.act3, d.body, d.end]);
    function row(key, text) {
      var meta = ACTS[key];
      var closed = cs.acts[key] && cs.acts[key].closed;
      return '<div class="v167-act"><b>' + meta.n + ' · ' + meta.t + '</b><p>'
        + (text || (closed ? '这条路你走完了。' : '这一幕没有走完：你在它结束前就离开了。'))
        + '</p></div>';
    }
    var origin = originInfo(cs.origin.id);
    var originChoice = '';
    if (cs.origin.chainStep) {
      originChoice = cs.flags['origin_' + cs.origin.id + '_' + cs.origin.chainStep] || '';
      if (/^[a-z_]+$/.test(originChoice)) originChoice = '';
    }
    var originLine = cs.origin.unlocked
      ? '<div class="v167-origin-end"><b>出身 · ' + v167Esc(origin.n) + '</b><p>'
        + v167Esc(cs.origin.chainStep >= 4 ? origin.closing : origin.chain)
        + (originChoice ? '<br><em>最后一步：' + v167Esc(originChoice) + '</em>' : '')
        + '</p></div>'
      : '';
    var final = {
      one_team: '这段生涯最后被记住的，是你一直没有离开。',
      ring: '这段生涯最后被记住的，是你把一座奖杯带回了这座城市。',
      path: '这段生涯最后被记住的，是你让后来的人少走了一段路。'
    }[cs.flags.legacy] || '这段生涯最后被记住的，不是你得了多少分，而是你让谁留了下来。';
    return '<section class="v167-epilogue"><small>命运轨迹 · 你选过的路</small>'
      + '<div class="v167-destiny-final"><p>' + v167Esc(routeSentence(c, cs)) + '</p></div>'
      + row('prove', role)
      + row('become', way)
      + row('leave', legacy)
      + originLine
      + '<p class="v167-final">' + v167Esc(final) + '</p>'
      + '</section>';
  }

  /* ---------------- 天赋页：出身事件天赋 ---------------- */

  function talentPageIsCustom() {
    try {
      var CG = window.__CREATOR__ || {};
      return !!((CG.player && CG.player.id === 'custom') || (career && career.playerId === 'custom') || (ui && ui.selected === 'custom'));
    } catch (e) { return false; }
  }

  function enhanceTalents(html) {
    if (typeof html !== 'string') return html;
    var origin = originId();
    var info = originInfo(origin);
    var unlocked = false;
    try {
      var cgNow = window.__CREATOR__ || {};
      unlocked = !!(origin && ((ui && ui.originStoryUnlockedFor === origin) || cgNow.originStoryUnlockedFor === origin));
    } catch (e) {}
    var btn = '<button class="v167-origin-btn" onclick="v167UnlockOriginStory()">'
      + (unlocked ? '✓ 已解锁 · 「' + v167Esc(info.n) + '」事件链已开启'
        : '🎬 看奖励视频 · 解锁「' + v167Esc(info.n) + '」事件链 + 四个天赋')
      + '</button>';
    html = html.replace(/<button[^>]*onclick="(?:v63UnlockExclusiveAndAll|unlockExclusive|v167UnlockOriginStory)\(\)"[^>]*>[\s\S]*?<\/button>/, btn);
    html = html
      .replace(/无人知晓的名字/g, v167Esc(info.n))
      .replace(/没有人认识你。你的每一分成长，都是从零挣来的。/g, v167Esc(info.d))
      .replace(/没有人认识你。心态与自信更坚韧，不易被舆论击倒——每一分成长都从零挣来。/g, v167Esc(info.d))
      .replace(/没有人认识你——每一分成长都从零挣来。/g, v167Esc(info.d))
      .replace(/心态 \+4 · 耐久 \+2/g, '出身事件链 · 四个天赋打包')
      .replace(/球员专属 · 直到退役/g, '出身事件 · 直到退役')
      .replace(/解锁后可体验这名状元从选秀夜到退役的完整专属生涯事件/g, '解锁后可体验你的出身专属事件链')
      .replace(/解锁后可体验这名状元从选秀夜到退役的完整专属主线/g, '解锁后可体验你的出身专属事件链')
      .replace(/这名状元/g, '你的出身')
      .replace(/完整专属生涯事件/g, '出身专属事件链')
      .replace(/完整专属主线/g, '出身专属事件链')
      .replace(/专属生涯事件/g, '出身专属事件链')
      .replace(/专属主线/g, '出身事件链')
      .replace(/解锁完整专属故事/g, '解锁出身事件链')
      .replace(/解锁完整生涯事件/g, '解锁出身事件链')
      .replace(/✓ 开局即生效/g, '✓ 生涯内生效')
      .replace(/状元专属/g, '出身事件天赋')
      .replace(/解锁专属天赋/g, '解锁出身事件链')
      .replace(/解锁专属剧情/g, '解锁出身事件链');
    if (html.indexOf('v167-origin-note') < 0) {
      var note = '<div class="v167-origin-note"><small>出身故事天赋</small><b>「' + v167Esc(info.n) + '」</b>'
        + '<p>' + v167Esc(info.d) + '</p>'
        + '<em>' + (unlocked ? '已开启：' + v167Esc(info.chain) : '未解锁：主三幕和每季支线仍然完整；解锁后增加出身专属事件链。') + '</em></div>';
      if (html.indexOf('<div class="sticky-cta">') >= 0) {
        html = html.replace('<div class="sticky-cta">', note + '<div class="sticky-cta">');
      } else {
        html = html.replace('</section>', note + '</section>');
      }
    }
    return html;
  }

  /* 广告会让页面短暂离开游戏；部分宿主回包时会顺带重置页面状态，
     导致捏人页跳回明星选人页。这里在广告前后各存/还原一次页面身份。 */
  function adPageSnapshot() {
    try {
      var C = window.__CREATOR__ || {};
      return {
        mode: window.__GAME_MODE__,
        screen: ui && ui.screen,
        tab: ui && ui.tab,
        selected: ui && ui.selected,
        awaiting: !!(ui && ui.starAwaitingPick),
        step: C.step,
        year: C.year,
        origin: C.origin,
        originRoll: C.originRoll,
        style: C.style,
        vow: C.vow,
        difficulty: C.difficulty,
        player: C.player,
        talentReady: C.talentReady,
        talents: ui && Array.isArray(ui.talents) ? ui.talents.slice() : null,
        talentPick: ui ? ui.talentPick : null,
        allTalents: !!(ui && ui.allTalents),
        talentFreeUsed: ui ? ui.talentFreeUsed : 0
      };
    } catch (e) { return null; }
  }

  function adRestorePage(snap) {
    if (!snap || snap.mode !== 'custom') return;
    try {
      window.__GAME_MODE__ = 'custom';
      if (typeof ui !== 'undefined' && ui) {
        ui.screen = snap.screen || 'select';
        ui.selected = 'custom';
        ui.starAwaitingPick = false;
        if (snap.tab) ui.tab = snap.tab;
        if (snap.talents) ui.talents = snap.talents;
        if (snap.talentPick !== undefined) ui.talentPick = snap.talentPick;
        ui.allTalents = !!snap.allTalents;
        if (snap.talentFreeUsed !== undefined) ui.talentFreeUsed = snap.talentFreeUsed;
      }
      var C = window.__CREATOR__ || {};
      ['step', 'year', 'origin', 'originRoll', 'style', 'vow', 'difficulty', 'player', 'talentReady'].forEach(function (k) {
        if (snap[k] !== undefined) C[k] = snap[k];
      });
    } catch (e) {}
  }

  window.v167UnlockOriginStory = async function () {
    var snap = adPageSnapshot();
    try {
      var currentOrigin = originId();
      if (ui && ui.originStoryUnlockedFor === currentOrigin) {
        notify('这个出身的专属事件链已经解锁');
        return;
      }
      if (typeof rewardAd === 'undefined' || !rewardAd || typeof rewardAd.request !== 'function') {
        notify('广告组件未就绪');
        return;
      }
      var r = await rewardAd.request('exclusive_talent');
      var ok = (r === true) || (r && r.success === true);
      /* 无论成功失败，先把页面还原回自建捏人流程，避免被宿主带回明星选人页。 */
      adRestorePage(snap);
      if (!ok) {
        render();
        notify('广告未完成，未解锁出身事件链');
        return;
      }
      var unlockedOrigin = originId();
      ui.originStoryUnlockedFor = unlockedOrigin;
      ui.originStoryUnlocked = true;
      ui.allTalents = true;
      if (Array.isArray(ui.talents)) ui.lockedTalents = ui.talents.slice();
      if (window.__CREATOR__) {
        window.__CREATOR__.originStoryUnlockedFor = unlockedOrigin;
        window.__CREATOR__.originStoryUnlocked = true;
      }
      render();
      notify('出身事件链已解锁 · 四个天赋一并打包');
    } catch (e) {
      adRestorePage(snap);
      try { render(); } catch (e2) {}
      var msg = String((e && e.message) || e || '');
      if (msg.indexOf('AD_NOT_REWARDED') >= 0) {
        notify('广告未完成，未解锁出身事件链');
        return;
      }
      console.error('[167] unlock origin story failed', e);
      notify('解锁失败，请稍后再试');
    }
  };

  /* 生涯中途补解锁：只开放出身事件链，不再补发开局四天赋。 */
  window.v167UnlockOriginStoryMidCareer = async function () {
    try {
      if (!career || career.playerId !== 'custom') return;
      var cs = ensure(career);
      if (!cs) return;
      if (cs.origin.unlocked) {
        notify('这个出身的专属事件链已经解锁');
        return;
      }
      if (typeof rewardAd === 'undefined' || !rewardAd || typeof rewardAd.request !== 'function') {
        notify('广告组件未就绪');
        return;
      }
      var r = null;
      try {
        r = await rewardAd.request('exclusive_talent');
      } catch (e) {
        notify('广告未完成，未解锁出身事件链');
        return;
      }
      var ok = (r === true) || (r && r.success === true);
      if (!ok) {
        notify('广告未完成，未解锁出身事件链');
        return;
      }
      career.originStoryUnlocked = true;
      cs.origin.unlocked = true;
      if (ui) ui.originStoryUnlocked = true;
      var info = originInfo(cs.origin.id);
      if (Array.isArray(career.feed)) career.feed.unshift('出身故事「' + info.n + '」已解锁，之后的赛季会出现专属事件。');
      save();
      render();
      notify('出身事件链已解锁');
    } catch (e) {
      console.error('[167] mid-career origin unlock failed', e);
      if (typeof notify === 'function') notify('解锁失败，请稍后再试');
    }
  };

  /* ---------------- 包装旧层 ---------------- */

  function maybeStoryImpl() {
    try {
      if (!career || career.retired) return false;
      if (career.stage !== 'regular') return false;
      if (ui.storyEvent || ui.modal) return false;
      if (career.games === 41 || career.games === 55) return false;
      var cs = ensure(career);
      var ev = pickEvent(career, cs);
      if (!ev) return false;
      markSlot(career, cs, ev);
      cs.pending = { id: ev.__defId, slot: ev.__slot, snapshot: snapshot(ev) };
      stopSim();
      ui.storyEvent = ev;
      save();
      render();
      return true;
    } catch (e) {
      console.error('[167] maybeStory failed', e);
      return false;
    }
  }

  try {
    var prevMaybeStory = maybeStory;
    maybeStory = function () {
      if (!isCustom()) return prevMaybeStory.apply(this, arguments);
      return maybeStoryImpl();
    };
    window.maybeStory = maybeStory;
  } catch (e) { console.error('[167] maybeStory wrap failed', e); }

  try {
    var prevStoryChoice = storyChoice;
    storyChoice = function (i) {
      var ev = (typeof ui !== 'undefined' && ui && ui.storyEvent) || null;
      if (!ev || !ev.__v167) return prevStoryChoice.apply(this, arguments);
      var ch = null;
      try {
        ch = applyChoiceState(ev, i);
        window.__v167Choosing = true;
        try {
          prevStoryChoice.call(this, i);
        } finally {
          window.__v167Choosing = false;
        }
        afterChoice(ev, i, ch);
      } catch (e) {
        window.__v167Choosing = false;
        console.error('[167] storyChoice failed', e);
        try { afterChoice(ev, i, ch); } catch (e2) {}
      }
    };
    window.storyChoice = storyChoice;
  } catch (e) { console.error('[167] storyChoice wrap failed', e); }

  try {
    var prevV222Pop = window.v222Pop;
    if (typeof prevV222Pop === 'function') {
      window.v222Pop = function (title, body) {
        if (window.__v167Choosing) return;
        return prevV222Pop.apply(this, arguments);
      };
    }
  } catch (e) { console.error('[167] v222Pop wrap failed', e); }

  try {
    var prevRenderOverlay = renderOverlay;
    renderOverlay = function () {
      try {
        if (isCustom()) {
          if (ui.storyEvent && ui.storyEvent.__v167) return renderStory(ui.storyEvent);
          if (ui.modal && ui.modal.kind === 'storyOutcome' && ui.modal.data && ui.modal.data.__v167) {
            return renderOutcome(ui.modal.data);
          }
        }
      } catch (e) { console.error('[167] overlay failed', e); }
      return prevRenderOverlay.apply(this, arguments);
    };
    window.renderOverlay = renderOverlay;
  } catch (e) { console.error('[167] renderOverlay wrap failed', e); }

  try {
    var prevStoryView = storyView;
    storyView = function () {
      try {
        if (isCustom() && career) return storyViewImpl(career);
      } catch (e) { console.error('[167] storyView failed', e); }
      return prevStoryView.apply(this, arguments);
    };
    window.storyView = storyView;
  } catch (e) { console.error('[167] storyView wrap failed', e); }

  try {
    var prevMainlineNowCard = mainlineNowCard;
    mainlineNowCard = function () {
      try {
        if (isCustom() && career) return mainlineCard(career);
      } catch (e) { console.error('[167] mainlineNowCard failed', e); }
      return prevMainlineNowCard.apply(this, arguments);
    };
    window.mainlineNowCard = mainlineNowCard;
  } catch (e) { console.error('[167] mainlineNowCard wrap failed', e); }

  try {
    var prevRenderRetired = renderRetired;
    renderRetired = function () {
      var h = prevRenderRetired.apply(this, arguments);
      try {
        if (typeof h !== 'string') return h;
        if (!isCustom() || !career || !career.retired) return h;
        var block = epilogueBlock(career);
        if (!block) return h;
        var anchor = h.indexOf('<div class="final-grid">');
        if (anchor >= 0) return h.slice(0, anchor) + block + h.slice(anchor);
        return h + block;
      } catch (e) {
        console.error('[167] retired failed', e);
        return h;
      }
    };
    window.renderRetired = renderRetired;
  } catch (e) { console.error('[167] renderRetired wrap failed', e); }

  try {
    var prevRenderTalents = renderTalents;
    renderTalents = function () {
      var html = prevRenderTalents.apply(this, arguments);
      try {
        if (talentPageIsCustom()) html = enhanceTalents(html);
      } catch (e) { console.error('[167] talents failed', e); }
      return html;
    };
    window.renderTalents = renderTalents;
  } catch (e) { console.error('[167] renderTalents wrap failed', e); }

  try {
    var prevCreateCareer = createCareer;
    createCareer = function () {
      var CG = window.__CREATOR__ || {};
      var capturedOrigin = CG.originRoll || CG.origin;
      var capturedVow = CG.vow;
      var capturedUnlocked = false;
      try {
        var originKey = capturedOrigin;
        capturedUnlocked = !!(originKey && (
          CG.originStoryUnlockedFor === originKey ||
          (ui && ui.originStoryUnlockedFor === originKey)
        ));
        /* 旧状态兼容：只有通用标记、且确实对应这个出身时才承认。 */
        if (!capturedUnlocked && CG.originStoryUnlocked === true && CG.origin === originKey) capturedUnlocked = true;
      } catch (e) {}
      var r = prevCreateCareer.apply(this, arguments);
      try {
        if (career && career.playerId === 'custom') {
          career.originStoryUnlocked = capturedUnlocked;
          career.customStory = initState(career, capturedOrigin || originId(), capturedUnlocked);
          if (capturedVow) {
            career.vow = capturedVow;
            career.customStory.vow = capturedVow;
          }
          career.exclusive = false;
          career.storyIndex = 0;
          if (Array.isArray(career.talents)) {
            career.talents = career.talents.filter(function (x) { return x !== 'custom_x'; });
          }
          ui.exclusive = false;
          ui.storyEvent = null;
          /* 这一局的解锁已经写进 career.originStoryUnlocked，创建器状态必须清掉，
             否则下一局会继承上一局的广告解锁。 */
          CG.originStoryUnlocked = false;
          CG.originStoryUnlockedFor = null;
          if (ui) { ui.originStoryUnlocked = false; ui.originStoryUnlockedFor = null; }
          if (Array.isArray(career.feed)) {
            career.feed = career.feed.filter(function (x) {
              return String(x).indexOf('本局未解锁状元专属天赋') < 0;
            });
            if (capturedUnlocked) {
              career.feed.unshift('你的出身故事被打开了：' + originInfo(career.customStory.origin.id).n + '。');
            }
          }
          save();
          render();
        }
      } catch (e) { console.error('[167] createCareer failed', e); }
      return r;
    };
    window.createCareer = createCareer;
  } catch (e) { console.error('[167] createCareer wrap failed', e); }

  try {
    var prevOpenModes = window.openModes;
    if (typeof prevOpenModes === 'function') {
      window.openModes = function () {
        try {
          if (window.__CREATOR__) {
            window.__CREATOR__.originStoryUnlocked = false;
            window.__CREATOR__.originStoryUnlockedFor = null;
          }
          if (typeof ui !== 'undefined' && ui) {
            ui.originStoryUnlocked = false;
            ui.originStoryUnlockedFor = null;
          }
        } catch (e) {}
        return prevOpenModes.apply(this, arguments);
      };
    }
  } catch (e) { console.error('[167] openModes wrap failed', e); }

  try {
    var prevContinueSave = continueSave;
    continueSave = function () {
      var r = prevContinueSave.apply(this, arguments);
      try {
        if (isCustom() && career) {
          ensure(career);
        }
      } catch (e) { console.error('[167] continueSave failed', e); }
      return r;
    };
    window.continueSave = continueSave;
  } catch (e) { console.error('[167] continueSave wrap failed', e); }

  try {
    var prevRender = render;
    render = function () {
      try {
        if (isCustom() && ui.storyEvent && !ui.storyEvent.__v167) ui.storyEvent = null;
        if (isCustom() && career && !career.retired && ui.screen === 'career' && !ui.storyEvent && !ui.modal) {
          var cs = ensure(career);
          if (cs.pending && cs.pending.snapshot) {
            ui.storyEvent = cs.pending.snapshot;
            stopSim();
          } else if (cs.outcome) {
            ui.modal = { kind: 'storyOutcome', data: outcomeData(cs) };
          }
        }
      } catch (e) { console.error('[167] restore failed', e); }
      return prevRender.apply(this, arguments);
    };
    window.render = render;
  } catch (e) { console.error('[167] render wrap failed', e); }

  try {
    var prevNextSeason = nextSeason;
    nextSeason = function () {
      try {
        if (isCustom() && career && career.customStory) {
          career.customStory.seasonMod = null;
          career.customStory.resumeSim = false;
        }
      } catch (e) {}
      return prevNextSeason.apply(this, arguments);
    };
    window.nextSeason = nextSeason;
  } catch (e) { console.error('[167] nextSeason wrap failed', e); }

  try {
    var prevStatExpect = statExpect;
    statExpect = function () {
      var e = prevStatExpect.apply(this, arguments);
      try {
        if (isCustom() && career && career.customStory && career.customStory.seasonMod) {
          var mod = career.customStory.seasonMod;
          e = Object.assign({}, e);
          if (mod.pts) e.pts *= mod.pts;
          if (mod.ast) e.ast *= mod.ast;
          if (mod.reb) e.reb *= mod.reb;
        }
      } catch (err) {}
      return e;
    };
    window.statExpect = statExpect;
  } catch (e) { console.error('[167] statExpect wrap failed', e); }

  try {
    var prevInjuryChance = injuryChance;
    injuryChance = function () {
      var n = prevInjuryChance.apply(this, arguments);
      try {
        if (isCustom() && career && career.customStory && career.customStory.seasonMod) {
          var risk = career.customStory.seasonMod.risk;
          if (risk) n *= risk;
        }
      } catch (err) {}
      return n;
    };
    window.injuryChance = injuryChance;
  } catch (e) { console.error('[167] injuryChance wrap failed', e); }

  /* ---------------- 内容：三幕主线 ---------------- */

  reg({
    id: 'prove_01', act: 'prove', kind: 'main', minSeason: 1, window: [6, 82], once: true, priority: 400,
    t: '教练把录像关了',
    scene: '训练馆 · 晚上',
    speaker: '主教练',
    cast: ['主教练'],
    b: function (c) {
      var role = c && c.role ? String(c.role) : '轮换边缘';
      if (role === '边缘球员') {
        return '训练结束，教练把录像倒回你被一步过掉的那一球，停住。\n他说：明天对面那个后卫场均 24 分。你要么让他难受，要么继续在这间屋子看录像。';
      }
      if (role === '轮换球员') {
        return '训练结束，教练把录像关了。\n他说：你现在只是轮换里的一员，但不是不可替代。想留下，先做一件事。';
      }
      return '训练结束，教练把录像关了。\n他说：你现在是' + role + '，但别以为位置稳了。想坐稳，先做一件事。';
    },
    stakes: '明天那个后卫场均 24 分。教练要看你今晚先做出哪种选择。',
    c: [
      { key: 'scorer', label: '给我球。打不进我认。', effectText: '自信 +6 · 信任 -2 · OVR 修正 +1', fx: { c: 6, tr: -2, o: 1 }, flags: [['prove_role', 'scorer']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] }, next: 'prove_02' },
      { key: 'stopper', label: '我先防守。教练让我防谁我就防谁。', effectText: '防守 +2 · 信任 +7', fx: { a: { defense: 2 }, tr: 7 }, flags: [['prove_role', 'stopper']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] }, next: 'prove_02' },
      { key: 'learner', label: '我去问老将，怎么在这支球队活下来。', effectText: '心态 +4 · 信任 +4', fx: { a: { mentality: 4 }, tr: 4 }, flags: [['prove_role', 'learner']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] }, next: 'prove_02' },
      { key: 'origin_ncaa', showIf: function (c, cs) { return cs.origin.id === 'ncaa'; }, label: '按大学那套来。先从防守和轮转做起。', effectText: '防守 +2 · 信任 +5', fx: { a: { defense: 2 }, tr: 5 }, flags: [['prove_role', 'stopper'], ['origin_route', 'ncaa']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] }, next: 'prove_02' },
      { key: 'origin_cba', showIf: function (c, cs) { return cs.origin.id === 'cba'; }, label: '用职业比赛那套。无球、卡位、少犯错。', effectText: '防守 +1 · 篮板 +2 · 信任 +4', fx: { a: { defense: 1, rebounding: 2 }, tr: 4 }, flags: [['prove_role', 'stopper'], ['origin_route', 'cba']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] }, next: 'prove_02' },
      { key: 'origin_academy', showIf: function (c, cs) { return cs.origin.id === 'academy'; }, label: '先把脏活做到极致。教练会看见。', effectText: '防守 +2 · 健康 +2 · 信任 +4', fx: { a: { defense: 2 }, h: 2, tr: 4 }, flags: [['prove_role', 'stopper'], ['origin_route', 'academy']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] }, next: 'prove_02' },
      { key: 'origin_undrafted', showIf: function (c, cs) { return cs.origin.id === 'undrafted'; }, label: '从抢篮板和造进攻犯规开始。我没有退路。', effectText: '篮板 +2 · 自信 +4 · 信任 +2', fx: { a: { rebounding: 2 }, c: 4, tr: 2 }, flags: [['prove_role', 'stopper'], ['origin_route', 'undrafted']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] }, next: 'prove_02' },
      { key: 'origin_prep', showIf: function (c, cs) { return cs.origin.id === 'prep'; }, label: '用天赋先打一个回合。让他们记住我。', effectText: '终结 +2 · 自信 +4 · 信任 -1', fx: { a: { finishing: 2 }, c: 4, tr: -1 }, flags: [['prove_role', 'scorer'], ['origin_route', 'prep']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] }, next: 'prove_02' },
      { key: 'origin_euro', showIf: function (c, cs) { return cs.origin.id === 'euro'; }, label: '按欧洲那套。先站对位置，再谈球权。', effectText: '防守 +1 · 组织 +2 · 信任 +4', fx: { a: { defense: 1, playmaking: 2 }, tr: 4 }, flags: [['prove_role', 'learner'], ['origin_route', 'euro']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] }, next: 'prove_02' },
      { key: 'origin_nbl', showIf: function (c, cs) { return cs.origin.id === 'nbl'; }, label: '先上身体。这里的对抗不会等我。', effectText: '防守 +2 · 终结 +1 · 健康 -2', fx: { a: { defense: 2, finishing: 1 }, h: -2 }, flags: [['prove_role', 'stopper'], ['origin_route', 'nbl']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] }, next: 'prove_02' },
      { key: 'origin_gleague', showIf: function (c, cs) { return cs.origin.id === 'gleague'; }, label: '从发展联盟那套开始。每个回合都当最后一次。', effectText: '防守 +2 · 心态 +3 · 信任 +3', fx: { a: { defense: 2, mentality: 3 }, tr: 3 }, flags: [['prove_role', 'learner'], ['origin_route', 'gleague']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] }, next: 'prove_02' }
    ]
  });

  reg({
    id: 'prove_02', act: 'prove', kind: 'main', minSeason: 1, window: [6, 82], once: true, priority: 400,
    t: '新秀墙',
    scene: function (c) { return '常规赛 · 第 ' + (v167Num(c.games) || 25) + ' 场'; },
    speaker: '助教',
    b: function (c) {
      var g = v167Num(c.games) || 25;
      return '第 ' + g + ' 场。对手知道你的惯用手，也知道你下一步要做什么。\n你的数据在掉。教练没有安慰你。';
    },
    stakes: '下一场开始，对手会继续放你一步。你要怎么把这一步拿回来。',
    c: [
      { key: 'rebuild', label: '改动作。哪怕这个赛季更难。', effectText: '投射 +3 · 自信 -3', fx: { a: { shooting: 3 }, c: -3 }, flags: [['prove_wall', 'rebuild']], next: 'prove_03' },
      { key: 'body', label: '用身体硬凿。先把分拿到。', effectText: '终结 +3 · 健康 -4', fx: { a: { finishing: 3 }, h: -4 }, flags: [['prove_wall', 'body']], next: 'prove_03' },
      { key: 'wait', label: '接受少打。把每次上场当成考试。', effectText: '心态 +4 · 信任 +3 · 自信 -2', fx: { a: { mentality: 4 }, tr: 3, c: -2 }, flags: [['prove_wall', 'wait']], next: 'prove_03' }
    ]
  });

  reg({
    id: 'prove_03', act: 'prove', kind: 'main', minSeason: 1, window: [6, 82], once: true, priority: 400,
    t: '最后两分钟',
    scene: '主场 · 第四节',
    speaker: '主教练',
    b: '比分咬住。教练把战术板递给你。\n最后一攻，球在你手里。',
    stakes: '这一次，教练会记住你怎么处理最后一球。',
    c: [
      { key: 'take', label: '我来。输了我认。', effectText: '自信 +6 · 信任 -1', fx: { c: 6, tr: -1 }, flags: [['prove_clutch', 'take']], echo: { id: 'prove_echo2', dueSeason: '+1', window: [24, 66] } },
      { key: 'pass', label: '按战术。把球给空位。', effectText: '信任 +6 · 组织 +2', fx: { tr: 6, a: { playmaking: 2 } }, flags: [['prove_clutch', 'pass']], echo: { id: 'prove_echo2', dueSeason: '+1', window: [24, 66] } },
      { key: 'drive', label: '突破。造犯规也行。', effectText: '终结 +2 · 健康 -2 · 自信 +3', fx: { a: { finishing: 2 }, h: -2, c: 3 }, flags: [['prove_clutch', 'drive']], echo: { id: 'prove_echo2', dueSeason: '+1', window: [24, 66] } }
    ]
  });

  reg({
    id: 'become_01', act: 'become', kind: 'main', minSeason: 4, window: [6, 82], once: true, priority: 390,
    requires: function (c) { return !!(window.__v128Debug && window.__v128Debug.ensure && window.__v128Debug.ensure().season.goal); },
    t: '球队把赛季目标放到桌上',
    scene: '管理层办公室',
    speaker: '总经理',
    cast: ['总经理', '主教练'],
    b: function () {
      var m = window.__v128Debug && window.__v128Debug.ensure();
      var g = m && m.season && m.season.goal;
      var planKey = m && m.season && m.season.plan;
      var planObj = planKey && window.__v128Debug && window.__v128Debug.plans && window.__v128Debug.plans[planKey];
      return '今年的目标是「' + (g ? g.title : '没有目标') + '」。\n你现在的打法是「' + (planObj ? planObj.title : (planKey || '尚未确定')) + '」。\n总经理问：为了这个目标，你愿意改自己的打法吗？';
    },
    stakes: '你的回答会改变这一季的球权、数据和伤病风险。',
    c: [
      { key: 'team', label: '按球队的目标打。我改。', effectText: '信任 +7 · 本季助攻上升、得分下降', fx: { tr: 7 }, flags: [['become_way', 'team']], seasonMod: { pts: 0.94, ast: 1.12, risk: 0.95 }, v128Log: '你为了球队目标改变了自己的打法。', echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] }, next: 'become_02' },
      { key: 'self', label: '按我的方式打。目标我自己扛。', effectText: '自信 +6 · OVR 修正 +1 · 本季得分上升、伤病风险上升', fx: { c: 6, o: 1 }, flags: [['become_way', 'self']], seasonMod: { pts: 1.10, ast: 0.92, risk: 1.12 }, v128Log: '你选择用自己的方式完成赛季目标。', echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] }, next: 'become_02' },
      { key: 'mentor', label: '把球交出去。我来决定谁出手。', effectText: '信任 +5 · 组织 +2 · 本季助攻上升', fx: { tr: 5, a: { playmaking: 2 } }, flags: [['become_way', 'mentor']], seasonMod: { pts: 0.90, ast: 1.18, risk: 0.90 }, v128Log: '你把球权交出去，改做组织者。', echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] }, next: 'become_02' },
      { key: 'vow_pure', showIf: function (c, cs) { return cs.vow === 'pure'; }, label: '我只打正确的球。目标可以等。', effectText: '心态 +5 · 信任 +4 · 本季更稳', fx: { a: { mentality: 5 }, tr: 4 }, flags: [['become_way', 'team'], ['vow_route', 'pure']], seasonMod: { pts: 0.96, ast: 1.02, risk: 0.92 }, v128Log: '你选择按自己的原则打球。', echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] }, next: 'become_02' },
      { key: 'vow_family', showIf: function (c, cs) { return cs.vow === 'family'; }, label: '先谈保障。家里需要一份确定的合同。', effectText: '信任 +3 · 自信 +2 · 本季更稳', fx: { tr: 3, c: 2 }, flags: [['become_way', 'team'], ['vow_route', 'family']], seasonMod: { pts: 0.98, ast: 1.00, risk: 0.94 }, v128Log: '你把家庭放在了战术之前。', echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] }, next: 'become_02' },
      { key: 'vow_prove', showIf: function (c, cs) { return cs.vow === 'prove'; }, label: '把球给我。我要让所有人看见。', effectText: '自信 +6 · OVR 修正 +1 · 本季得分上升', fx: { c: 6, o: 1 }, flags: [['become_way', 'self'], ['vow_route', 'prove']], seasonMod: { pts: 1.08, ast: 0.94, risk: 1.10 }, v128Log: '你决定用表现回应所有质疑。', echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] }, next: 'become_02' },
      { key: 'vow_one_min', showIf: function (c, cs) { return cs.vow === 'one-min'; }, label: '让我上场。哪怕只打一分钟。', effectText: '信任 +4 · 心态 +3 · 本季更稳', fx: { tr: 4, a: { mentality: 3 } }, flags: [['become_way', 'team'], ['vow_route', 'one-min']], seasonMod: { pts: 0.94, ast: 1.02, risk: 0.90 }, v128Log: '你接受任何角色，只要能站上球场。', echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] }, next: 'become_02' },
      { key: 'vow_name', showIf: function (c, cs) { return cs.vow === 'name'; }, label: '我要首发，要他们念我的名字。', effectText: '自信 +5 · OVR 修正 +1 · 本季得分上升', fx: { c: 5, o: 1 }, flags: [['become_way', 'self'], ['vow_route', 'name']], seasonMod: { pts: 1.06, ast: 0.96, risk: 1.05 }, v128Log: '你把“名字被念到”写进了这个赛季。', echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] }, next: 'become_02' },
      { key: 'vow_easy', showIf: function (c, cs) { return cs.vow === 'easy'; }, label: '不勉强。打不动就退一步。', effectText: '心态 +4 · 健康 +4 · 伤病风险下降', fx: { a: { mentality: 4 }, h: 4 }, flags: [['become_way', 'team'], ['vow_route', 'easy']], seasonMod: { pts: 0.96, ast: 1.00, risk: 0.85 }, v128Log: '你没有把自己逼到极限，而是留了余地。', echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] }, next: 'become_02' }
    ]
  });

  reg({
    id: 'become_02', act: 'become', kind: 'main', minSeason: 4, window: [6, 82], once: true, priority: 390,
    t: '下一份合同',
    scene: '经纪人办公室 · 赛季中',
    speaker: '经纪人',
    b: function (c) {
      return '经纪人把两份报价放在桌上。\n' + contractLine(c) + '\n一份是提前续约，留在这里，钱少一点。一份是等到自由市场，回家，钱很多。';
    },
    stakes: '这份合同会决定你接下来几年在哪座城市打球。',
    c: [
      { key: 'stay', label: '留下。我还没打完。', effectText: '信任 +6 · 自信 +4', fx: { tr: 6, c: 4 }, flags: [['become_contract', 'stay'], ['contract_intent', 'stay']], echo: { id: 'become_echo2', dueSeason: '+1', window: [24, 66] }, next: 'become_03' },
      { key: 'money', label: '拿钱。没什么可耻的。', effectText: '自信 +5 · 健康 +4', fx: { c: 5, h: 4 }, flags: [['become_contract', 'money'], ['contract_intent', 'market']], echo: { id: 'become_echo2', dueSeason: '+1', window: [24, 66] }, next: 'become_03' },
      { key: 'wait', label: '拖到赛季结束。先看球队怎么做。', effectText: '信任 -3 · 心态 +5', fx: { tr: -3, a: { mentality: 5 } }, flags: [['become_contract', 'wait'], ['contract_intent', 'wait']], echo: { id: 'become_echo2', dueSeason: '+1', window: [24, 66] }, next: 'become_03' },
      { key: 'secure', showIf: function (c) { var ex = c.contract && c.contract.exception; return ex === 'ten-day-converted' || ex === 'minimum'; }, label: '这次，我想要一份有保障的合同。', effectText: '信任 +3 · 自信 +4 · 合同谈判更硬', fx: { tr: 3, c: 4 }, flags: [['become_contract', 'secure'], ['contract_intent', 'stay']], echo: { id: 'become_echo2', dueSeason: '+1', window: [24, 66] }, next: 'become_03' }
    ]
  });

  reg({
    id: 'become_03', act: 'become', kind: 'main', minSeason: 4, window: [6, 82], once: true, priority: 390,
    t: '更衣室里的位置',
    scene: '更衣室 · 赛前',
    speaker: '老将',
    b: '年轻人开始问你问题。老将开始看你。\n这支球队需要一个说话的人。',
    stakes: '你在更衣室里成为谁，会跟到你退役。',
    c: [
      { key: 'captain', label: '我来当。赢了算大家的，输了算我的。', effectText: '信任 +8 · 自信 +3', fx: { tr: 8, c: 3 }, flags: [['become_room', 'captain']], next: 'become_04' },
      { key: 'alone', label: '我只管自己的比赛。', effectText: '自信 +5 · 信任 -4', fx: { c: 5, tr: -4 }, flags: [['become_room', 'alone']], next: 'become_04' },
      { key: 'mentor', label: '我带年轻人。球权可以少一点。', effectText: '信任 +5 · 心态 +5', fx: { tr: 5, a: { mentality: 5 } }, flags: [['become_room', 'mentor']], next: 'become_04' }
    ]
  });

  reg({
    id: 'become_04', act: 'become', kind: 'main', minSeason: 4, window: [6, 82], once: true, priority: 390,
    t: '城市开始给你贴标签',
    scene: '客场酒店 · 手机',
    speaker: '经纪人',
    b: '你的脸出现在两块广告牌上。\n经纪人说得直接：现在人们不只在看你打球，也在决定你代表什么。',
    stakes: '你可以接住这个标签，也可以把它推开。',
    c: [
      { key: 'embrace', label: '接住它。这就是我。', effectText: '自信 +5 · 名气 +6', fx: { c: 5, fame: 6 }, flags: [['become_image', 'embrace']], next: 'become_05' },
      { key: 'resist', label: '推掉。我只想打球。', effectText: '心态 +5 · 信任 +3', fx: { a: { mentality: 5 }, tr: 3 }, flags: [['become_image', 'resist']], next: 'become_05' },
      { key: 'use', label: '用它做点别的事。', effectText: '信任 +4 · 心态 +3 · 名气 +4', fx: { tr: 4, a: { mentality: 3 }, fame: 4 }, flags: [['become_image', 'use']], next: 'become_05' }
    ]
  });

  reg({
    id: 'become_05', act: 'become', kind: 'main', minSeason: 4, window: [6, 82], once: true, priority: 390,
    t: '身体第一次明确报警',
    scene: '医疗室 · 清晨',
    speaker: '队医',
    b: '队医把片子放在灯下。\n他说：不是不能打，但你要开始选，哪些比赛值得你拿以后去换。',
    stakes: '这是你第一次真正决定，身体和胜利哪个更重要。',
    c: [
      { key: 'manage', label: '减负荷。我还想打久一点。', effectText: '健康 +8 · 信任 -2', fx: { h: 8, tr: -2 }, flags: [['become_body', 'manage']], next: 'become_06' },
      { key: 'push', label: '继续打。现在不能停。', effectText: '信任 +5 · 健康 -6', fx: { tr: 5, h: -6 }, flags: [['become_body', 'push']], next: 'become_06' },
      { key: 'change', label: '改角色。少做一点，做久一点。', effectText: '心态 +5 · 健康 +4', fx: { a: { mentality: 5 }, h: 4 }, flags: [['become_body', 'change']], next: 'become_06' }
    ]
  });

  reg({
    id: 'become_06', act: 'become', kind: 'main', minSeason: 4, window: [6, 82], once: true, priority: 390,
    t: '球队方向和你不再一致',
    scene: '管理层办公室 · 赛季末',
    speaker: '总经理',
    b: '总经理说，球队要换一条路。\n他们需要你留下，或者需要你成为交易的一部分。',
    stakes: '你第一次要决定：是你跟着球队走，还是让球队跟着你走。',
    c: [
      { key: 'stay', label: '留下。我相信这条路。', effectText: '信任 +7 · 心态 +3', fx: { tr: 7, a: { mentality: 3 } }, flags: [['become_team', 'stay']] },
      { key: 'ring', label: '去一支能争冠的球队。', effectText: '自信 +5 · 球队交易压力 +2', fx: { c: 5, teamTrade: 2 }, flags: [['become_team', 'ring']] },
      { key: 'rebuild', label: '留下来重建。把年轻人带起来。', effectText: '信任 +5 · 心态 +4', fx: { tr: 5, a: { mentality: 4 } }, flags: [['become_team', 'rebuild']] }
    ]
  });

  reg({
    id: 'leave_01', act: 'leave', kind: 'main', minSeason: 8, window: [6, 82], once: true, priority: 380,
    requires: function (c, cs) { return cs.acts.prove.closed && cs.acts.become.closed; },
    t: '有人开始问你退役以后的事',
    scene: '赛后发布会',
    speaker: '记者',
    b: '一个记者问：退役以后，你希望别人怎么介绍你？\n更衣室突然很安静。',
    stakes: '你怎么回答，决定最后这几年你要什么。',
    c: [
      { key: 'one_team', label: '这支球队。我想在这里退役。', effectText: '信任 +8 · 结局记录“一人一城”', fx: { tr: 8 }, flags: [['legacy', 'one_team']], echo: { id: 'leave_echo', dueSeason: '+1', window: [24, 66] }, next: 'leave_02' },
      { key: 'ring', label: '一个冠军。没有冠军，别的都不算。', effectText: '自信 +5 · 球队交易压力 +2', fx: { c: 5, teamTrade: 2 }, flags: [['legacy', 'ring']], echo: { id: 'leave_echo', dueSeason: '+1', window: [24, 66] }, next: 'leave_02' },
      { key: 'path', label: '让更多后来的人走得更顺。', effectText: '名气 +8 · 心态 +5 · 结局记录“留下路”', fx: { fame: 8, a: { mentality: 5 } }, flags: [['legacy', 'path']], echo: { id: 'leave_echo', dueSeason: '+1', window: [24, 66] }, next: 'leave_02' },
      { key: 'origin_legacy_ncaa', showIf: function (c, cs) { return cs.origin.id === 'ncaa'; }, label: '回母校。让他们知道从这里出去的人能走多远。', effectText: '名气 +6 · 心态 +4', fx: { fame: 6, a: { mentality: 4 } }, flags: [['legacy', 'path'], ['origin_legacy', 'ncaa']], echo: { id: 'leave_echo', dueSeason: '+1', window: [24, 66] }, next: 'leave_02' },
      { key: 'origin_legacy_cba', showIf: function (c, cs) { return cs.origin.id === 'cba'; }, label: '回去。把在 NBA 学到的东西带回去。', effectText: '名气 +8 · 信任 +2', fx: { fame: 8, tr: 2 }, flags: [['legacy', 'path'], ['origin_legacy', 'cba']], echo: { id: 'leave_echo', dueSeason: '+1', window: [24, 66] }, next: 'leave_02' },
      { key: 'origin_legacy_academy', showIf: function (c, cs) { return cs.origin.id === 'academy'; }, label: '回体校。带一批孩子出来。', effectText: '名气 +6 · 心态 +5', fx: { fame: 6, a: { mentality: 5 } }, flags: [['legacy', 'path'], ['origin_legacy', 'academy']], echo: { id: 'leave_echo', dueSeason: '+1', window: [24, 66] }, next: 'leave_02' },
      { key: 'origin_legacy_undrafted', showIf: function (c, cs) { return cs.origin.id === 'undrafted'; }, label: '给落选秀留一条路。', effectText: '名气 +8 · 自信 +3', fx: { fame: 8, c: 3 }, flags: [['legacy', 'path'], ['origin_legacy', 'undrafted']], echo: { id: 'leave_echo', dueSeason: '+1', window: [24, 66] }, next: 'leave_02' },
      { key: 'origin_legacy_prep', showIf: function (c, cs) { return cs.origin.id === 'prep'; }, label: '回预科。告诉那些孩子，天赋之外还要什么。', effectText: '名气 +5 · 心态 +4', fx: { fame: 5, a: { mentality: 4 } }, flags: [['legacy', 'path'], ['origin_legacy', 'prep']], echo: { id: 'leave_echo', dueSeason: '+1', window: [24, 66] }, next: 'leave_02' },
      { key: 'origin_legacy_euro', showIf: function (c, cs) { return cs.origin.id === 'euro'; }, label: '回欧洲。让那里的孩子知道这条路能走通。', effectText: '名气 +6 · 信任 +2', fx: { fame: 6, tr: 2 }, flags: [['legacy', 'path'], ['origin_legacy', 'euro']], echo: { id: 'leave_echo', dueSeason: '+1', window: [24, 66] }, next: 'leave_02' },
      { key: 'origin_legacy_nbl', showIf: function (c, cs) { return cs.origin.id === 'nbl'; }, label: '回南半球。把那里当成起点，不是终点。', effectText: '名气 +6 · 自信 +2', fx: { fame: 6, c: 2 }, flags: [['legacy', 'path'], ['origin_legacy', 'nbl']], echo: { id: 'leave_echo', dueSeason: '+1', window: [24, 66] }, next: 'leave_02' },
      { key: 'origin_legacy_gleague', showIf: function (c, cs) { return cs.origin.id === 'gleague'; }, label: '回发展联盟。告诉还在等电话的人，别停。', effectText: '名气 +7 · 心态 +3', fx: { fame: 7, a: { mentality: 3 } }, flags: [['legacy', 'path'], ['origin_legacy', 'gleague']], echo: { id: 'leave_echo', dueSeason: '+1', window: [24, 66] }, next: 'leave_02' }
    ]
  });

  reg({
    id: 'leave_02', act: 'leave', kind: 'main', minSeason: 8, window: [6, 82], once: true, priority: 380,
    t: '身体先说了不行',
    scene: '训练馆 · 清晨',
    speaker: '队医',
    b: '早上起床，膝盖没有像以前那样听话。\n队医说：你可以打，但代价会留到以后。',
    stakes: '你还能打多久，从这里开始变得具体。',
    c: [
      { key: 'push', label: '打。这个赛季我不想停。', effectText: '自信 +5 · 健康 -8', fx: { c: 5, h: -8 }, flags: [['leave_body', 'push']], next: 'leave_03' },
      { key: 'change', label: '改角色。少打一点，打久一点。', effectText: '心态 +5 · 健康 +6', fx: { a: { mentality: 5 }, h: 6 }, flags: [['leave_body', 'change']], next: 'leave_03' },
      { key: 'rest', label: '休战。先把身体修好。', effectText: '健康 +10 · 信任 -4', fx: { h: 10, tr: -4 }, flags: [['leave_body', 'rest']], next: 'leave_03' }
    ]
  });

  reg({
    id: 'leave_03', act: 'leave', kind: 'main', minSeason: 8, window: [6, 82], once: true, priority: 380,
    t: '这可能是最后一个主场',
    scene: '主场 · 常规赛最后一场',
    speaker: '球馆播音',
    b: function (c) {
      return '球馆屏幕放起你的旧画面。\n' + contractLine(c) + '\n你开始想：如果这是最后一个主场，你要怎么走？';
    },
    stakes: '球馆屏幕已经切到你的旧画面。接下来两分钟，全场会记住你怎么走。',
    c: [
      { key: 'tour', label: '如果这是最后一年，我想要一场告别巡演。', effectText: '名气 +10 · 自信 +6 · 健康 -4', fx: { fame: 10, c: 6, h: -4 }, flags: [['leave_end', 'tour']], echo: { id: 'leave_echo2', dueSeason: '+1', window: [24, 66] } },
      { key: 'quiet', label: '如果这是最后一年，我想安静地走。', effectText: '心态 +8 · 名气 -4', fx: { a: { mentality: 8 }, fame: -4 }, flags: [['leave_end', 'quiet']], echo: { id: 'leave_echo2', dueSeason: '+1', window: [24, 66] } },
      { key: 'handover', label: '如果这是最后一年，我把位置交给年轻人。', effectText: '信任 +8 · 组织 +2 · 自信 -3', fx: { tr: 8, a: { playmaking: 2 }, c: -3 }, flags: [['leave_end', 'handover']], echo: { id: 'leave_echo2', dueSeason: '+1', window: [24, 66] } }
    ]
  });

  reg({
    id: 'legacy_loop', act: 'leave', kind: 'main', minSeason: 12, window: [6, 82], once: false, cooldown: 4, priority: 360,
    t: '又一年，你还在打',
    scene: '训练馆 · 又一个夏天',
    speaker: '年轻队友',
    b: '年轻人叫你老将。你的名字还在名单上。\n今年，你想怎么过？',
    stakes: '你已经不需要证明什么了。现在是你想留下什么。',
    c: [
      { key: 'teach', label: '带年轻人。把我的经验留下。', effectText: '信任 +6 · 心态 +5 · 名气 +4', fx: { tr: 6, a: { mentality: 5 }, fame: 4 }, flags: [['legacy_loop', 'teach']] },
      { key: 'push', label: '再冲一次。我还能打。', effectText: '自信 +6 · 健康 -4', fx: { c: 6, h: -4 }, flags: [['legacy_loop', 'push']] },
      { key: 'prepare', label: '准备退役。先把后面的事安排好。', effectText: '心态 +6 · 健康 +4', fx: { a: { mentality: 6 }, h: 4 }, flags: [['legacy_loop', 'prepare']] }
    ]
  });

  /* ---------------- 内容：第一幕按出身分叉 ---------------- */

  /* 生存线：落选 / 发展联盟 */
  reg({
    id: 'prove_survive_01', act: 'prove', kind: 'main', minSeason: 1, window: [6, 82], once: true, priority: 400,
    t: '十天合同的最后一天',
    scene: '训练馆 · 清晨',
    speaker: '经纪人',
    b: '十天合同明天到期。\n教练组还没有给你答复。经纪人问：如果球队让你去发展联盟打两场保持状态，你上不上？',
    stakes: '留下等名额，还是先去打上球，等下一次召回。',
    c: [
      { key: 'stay', label: '去。保持状态，等召回。', effectText: '心态 +4 · 信任 +3', fx: { a: { mentality: 4 }, tr: 3 }, flags: [['prove_role', 'learner']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] } },
      { key: 'ask', label: '去找教练，我要一个明确的答案。', effectText: '自信 +5 · 信任 -2', fx: { c: 5, tr: -2 }, flags: [['prove_role', 'scorer']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] } },
      { key: 'call', label: '先给家里打电话。让他们知道我还好。', effectText: '心态 +3 · 健康 +3', fx: { a: { mentality: 3 }, h: 3 }, flags: [['prove_role', 'stopper']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] } }
    ]
  });

  reg({
    id: 'prove_survive_02', act: 'prove', kind: 'main', minSeason: 1, window: [6, 82], once: true, priority: 400,
    t: '夜班车的记忆',
    scene: 'NBA 客场酒店 · 深夜',
    speaker: '老队友来电',
    b: '凌晨两点，你接到发展联盟老队友的电话。他还在夜班车上。\n他问你：你还会回来吗？',
    stakes: '你已经上了 NBA 的名单。但那趟车还在开。',
    c: [
      { key: 'sleep', label: '先睡。明天还有 NBA 的比赛。', effectText: '健康 +4 · 心态 +2', fx: { h: 4, a: { mentality: 2 } }, flags: [['prove_wall', 'wait']] },
      { key: 'talk', label: '陪他聊到天亮。', effectText: '信任 +3 · 心态 +3', fx: { tr: 3, a: { mentality: 3 } }, flags: [['prove_wall', 'wait']] },
      { key: 'watch', label: '告诉他：别等，自己打出来。', effectText: '防守 +2 · 自信 +3', fx: { a: { defense: 2 }, c: 3 }, flags: [['prove_wall', 'rebuild']] }
    ]
  });

  reg({
    id: 'prove_survive_03', act: 'prove', kind: 'main', minSeason: 1, window: [6, 82], once: true, priority: 400,
    t: '第二次被叫上去',
    scene: '球馆通道 · 赛前',
    speaker: '主教练',
    b: '伤病潮来了，你被召回。\n教练说：这次可能只有两场。',
    stakes: '两场比赛，够不够让教练记住你。',
    c: [
      { key: 'defend', label: '从防守开始。让教练舍不得换我下去。', effectText: '防守 +2 · 信任 +6', fx: { a: { defense: 2 }, tr: 6 }, flags: [['prove_clutch', 'pass']], echo: { id: 'prove_echo2', dueSeason: '+1', window: [24, 66] } },
      { key: 'score', label: '拿球就攻。两场也要打出名字。', effectText: '终结 +2 · 自信 +5 · 信任 -1', fx: { a: { finishing: 2 }, c: 5, tr: -1 }, flags: [['prove_clutch', 'take']], echo: { id: 'prove_echo2', dueSeason: '+1', window: [24, 66] } },
      { key: 'organize', label: '把第二阵容串起来。', effectText: '组织 +2 · 信任 +4', fx: { a: { playmaking: 2 }, tr: 4 }, flags: [['prove_clutch', 'pass']], echo: { id: 'prove_echo2', dueSeason: '+1', window: [24, 66] } }
    ]
  });

  /* 聚光灯线：预科 / 体校 */
  reg({
    id: 'prove_hype_01', act: 'prove', kind: 'main', minSeason: 1, window: [6, 82], once: true, priority: 400,
    t: '全美第一的标签',
    scene: '季前赛 · 主场',
    speaker: '看台',
    b: '媒体把你排进全美前十。\n第一场季前赛，你投丢前六球。看台上有人开始笑。',
    stakes: '标签是他们贴上的，也是他们要撕掉的。',
    c: [
      { key: 'keep_shooting', label: '继续投。标签不是他们撕就能撕掉的。', effectText: '自信 +5 · 投射 +2 · 信任 -1', fx: { c: 5, a: { shooting: 2 }, tr: -1 }, flags: [['prove_role', 'scorer']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] } },
      { key: 'drive', label: '先突破造犯规。把比赛找回来。', effectText: '终结 +2 · 自信 +3', fx: { a: { finishing: 2 }, c: 3 }, flags: [['prove_role', 'scorer']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] } },
      { key: 'defend', label: '先去防对面最好的。', effectText: '防守 +2 · 信任 +4', fx: { a: { defense: 2 }, tr: 4 }, flags: [['prove_role', 'stopper']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] } }
    ]
  });

  reg({
    id: 'prove_hype_02', act: 'prove', kind: 'main', minSeason: 1, window: [6, 82], once: true, priority: 400,
    t: '培养你的教练打来电话',
    scene: '酒店 · 晚上',
    speaker: '恩师',
    b: '培养你的教练打电话来：休赛期全运会 / 母校想请你回去打一场表演赛。\n球队说，别在赛季中分心，夏天再回去。',
    stakes: '你现在代表的是球队，还是那个把你养大的地方。',
    c: [
      { key: 'team', label: '留在球队。这里才是我的现在。', effectText: '信任 +5 · 自信 +2', fx: { tr: 5, c: 2 }, flags: [['prove_wall', 'wait']] },
      { key: 'go', label: '夏天回去打。我不能只为自己打。', effectText: '名气 +5 · 信任 -3', fx: { fame: 5, tr: -3 }, flags: [['prove_wall', 'wait']] },
      { key: 'compromise', label: '两边都谈。找一个不伤人的办法。', effectText: '心态 +4 · 信任 +2', fx: { a: { mentality: 4 }, tr: 2 }, flags: [['prove_wall', 'rebuild']] }
    ]
  });

  reg({
    id: 'prove_hype_03', act: 'prove', kind: 'main', minSeason: 1, window: [6, 82], once: true, priority: 400,
    t: '第一次被主场嘘',
    scene: '主场 · 第三节',
    speaker: '全场',
    b: '主场第一次嘘你。你听见了。\n教练没有叫暂停。',
    stakes: '被嘘之后，你选择成为什么样的球员。',
    c: [
      { key: 'answer', label: '用下一个回合回答。', effectText: '自信 +5 · 终结 +2', fx: { c: 5, a: { finishing: 2 } }, flags: [['prove_clutch', 'take']], echo: { id: 'prove_echo2', dueSeason: '+1', window: [24, 66] } },
      { key: 'hide', label: '先把球交出去。等他们忘了我。', effectText: '信任 +3 · 心态 +2', fx: { tr: 3, a: { mentality: 2 } }, flags: [['prove_clutch', 'pass']], echo: { id: 'prove_echo2', dueSeason: '+1', window: [24, 66] } },
      { key: 'talk', label: '赛后留下来加练。让他们看见。', effectText: '心态 +4 · 投射 +2', fx: { a: { mentality: 4, shooting: 2 } }, flags: [['prove_clutch', 'pass']], echo: { id: 'prove_echo2', dueSeason: '+1', window: [24, 66] } }
    ]
  });

  /* 校园线：NCAA */
  reg({
    id: 'prove_school_01', act: 'prove', kind: 'main', minSeason: 1, window: [6, 82], once: true, priority: 400,
    t: '大学教练的电话',
    scene: '公寓 · 晚上',
    speaker: '大学教练',
    b: '大学教练打电话来：学校想请你在休赛期回去参加球衣仪式，顺便打一场校友赛。\n球队说，别在赛季中分心。',
    stakes: '你已经在联盟里了，但母校还留着一个位置。',
    c: [
      { key: 'stay', label: '留在球队。我已经不是大学生了。', effectText: '信任 +5 · 自信 +2', fx: { tr: 5, c: 2 }, flags: [['prove_role', 'learner']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] } },
      { key: 'back', label: '休赛期回去。那件球衣还没还。', effectText: '名气 +4 · 信任 -2', fx: { fame: 4, tr: -2 }, flags: [['prove_role', 'learner']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] } },
      { key: 'ask', label: '问经纪人，哪条路对我最好。', effectText: '心态 +3 · 信任 +2', fx: { a: { mentality: 3 }, tr: 2 }, flags: [['prove_role', 'learner']], echo: { id: 'prove_echo', dueSeason: '+1', window: [24, 66] } }
    ]
  });

  reg({
    id: 'prove_school_02', act: 'prove', kind: 'main', minSeason: 1, window: [6, 82], once: true, priority: 400,
    t: '校友会',
    scene: '学校礼堂 · 周末',
    speaker: '校友会',
    b: '校友会想让你代表学校参加活动。\n球队训练撞期。',
    stakes: '你要代表学校，还是先代表这支球队。',
    c: [
      { key: 'school', label: '去。他们看着我长大。', effectText: '名气 +5 · 信任 -3', fx: { fame: 5, tr: -3 }, flags: [['prove_wall', 'wait']] },
      { key: 'team', label: '留在训练馆。', effectText: '信任 +5 · 防守 +1', fx: { tr: 5, a: { defense: 1 } }, flags: [['prove_wall', 'wait']] },
      { key: 'send', label: '录一段视频，人不出现。', effectText: '名气 +2 · 信任 +2', fx: { fame: 2, tr: 2 }, flags: [['prove_wall', 'rebuild']] }
    ]
  });

  reg({
    id: 'prove_school_03', act: 'prove', kind: 'main', minSeason: 1, window: [6, 82], once: true, priority: 400,
    t: '球馆里的名字',
    scene: '母校球馆',
    speaker: '校长',
    b: '母校想把你的名字挂进球馆。\n前提是你要在休赛期回去打一场表演赛。',
    stakes: '你的名字要以什么方式留在那面墙上。',
    c: [
      { key: 'accept', label: '休赛期回去。让那些孩子看见。', effectText: '名气 +6 · 心态 +3', fx: { fame: 6, a: { mentality: 3 } }, flags: [['prove_clutch', 'pass']], echo: { id: 'prove_echo2', dueSeason: '+1', window: [24, 66] } },
      { key: 'decline', label: '现在不是时候。', effectText: '自信 +3 · 信任 +2', fx: { c: 3, tr: 2 }, flags: [['prove_clutch', 'take']], echo: { id: 'prove_echo2', dueSeason: '+1', window: [24, 66] } },
      { key: 'later', label: '等我退役。', effectText: '心态 +4 · 名气 +2', fx: { a: { mentality: 4 }, fame: 2 }, flags: [['prove_clutch', 'pass']], echo: { id: 'prove_echo2', dueSeason: '+1', window: [24, 66] } }
    ]
  });

  /* ---------------- 内容：第二幕按角色分叉 ---------------- */

  reg({
    id: 'become_core_01', act: 'become', kind: 'main', minSeason: 4, window: [6, 82], once: true, priority: 390,
    t: '这支球队是不是你的',
    scene: '管理层办公室',
    speaker: '总经理',
    b: '总经理说，球队准备围绕你建队。\n但你要接受更高的使用率，和更重的舆论。',
    stakes: '成为核心，不只是多出手。',
    c: [
      { key: 'take', label: '给我钥匙。我扛。', effectText: '自信 +6 · 信任 +6 · 本季得分上升', fx: { c: 6, tr: 6 }, flags: [['become_way', 'self']], seasonMod: { pts: 1.10, ast: 0.95, risk: 1.08 }, echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] } },
      { key: 'share', label: '我可以是核心，但球要动起来。', effectText: '信任 +7 · 组织 +2 · 本季助攻上升', fx: { tr: 7, a: { playmaking: 2 } }, flags: [['become_way', 'team']], seasonMod: { pts: 0.96, ast: 1.12, risk: 0.95 }, echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] } },
      { key: 'ask_more', label: '先补强。没有帮手，核心只是靶子。', effectText: '信任 +3 · 自信 +4', fx: { tr: 3, c: 4 }, flags: [['become_way', 'self']], echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] } }
    ]
  });

  reg({
    id: 'become_starter_01', act: 'become', kind: 'main', minSeason: 4, window: [6, 82], once: true, priority: 390,
    t: '首发不是保证',
    scene: '训练馆 · 录像室',
    speaker: '主教练',
    b: '教练说，你的首发位置保不住了。\n球队要试另一个阵容。',
    stakes: '你要抢回位置，还是接受另一种角色。',
    c: [
      { key: 'fight', label: '我来抢回来。', effectText: '自信 +5 · 防守 +2 · 信任 +2', fx: { c: 5, a: { defense: 2 }, tr: 2 }, flags: [['become_way', 'self']], echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] } },
      { key: 'accept', label: '我去第二阵容。只要赢球。', effectText: '信任 +6 · 心态 +3', fx: { tr: 6, a: { mentality: 3 } }, flags: [['become_way', 'team']], echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] } },
      { key: 'expand', label: '让我打更多位置。', effectText: '组织 +2 · 信任 +4', fx: { a: { playmaking: 2 }, tr: 4 }, flags: [['become_way', 'mentor']], echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] } }
    ]
  });

  reg({
    id: 'become_rotation_01', act: 'become', kind: 'main', minSeason: 4, window: [6, 82], once: true, priority: 390,
    t: '轮换的边界',
    scene: '训练馆 · 早上',
    speaker: '助教',
    b: '你每场打 18 分钟。\n教练说，想多打，就得有一项让别人离不开你。',
    stakes: '你要成为 specialist，还是成为更完整的人。',
    c: [
      { key: 'specialize', label: '把防守练到极致。', effectText: '防守 +3 · 信任 +5', fx: { a: { defense: 3 }, tr: 5 }, flags: [['become_way', 'team']], echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] } },
      { key: 'expand', label: '我要能持球。', effectText: '组织 +2 · 自信 +3', fx: { a: { playmaking: 2 }, c: 3 }, flags: [['become_way', 'self']], echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] } },
      { key: 'accept', label: '18 分钟也能赢球。', effectText: '心态 +4 · 信任 +3', fx: { a: { mentality: 4 }, tr: 3 }, flags: [['become_way', 'team']], echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] } }
    ]
  });

  reg({
    id: 'become_bench_01', act: 'become', kind: 'main', minSeason: 4, window: [6, 82], once: true, priority: 390,
    t: '替补席上的火种',
    scene: '主场 · 第二节',
    speaker: '全场',
    b: '你从替补席起身，主场开始喊你的名字。\n教练说：这就是你的位置。',
    stakes: '你是接受这个角色，还是把它当成跳板。',
    c: [
      { key: 'embrace', label: '我就是干这个的。', effectText: '自信 +5 · 终结 +2 · 名气 +4', fx: { c: 5, a: { finishing: 2 }, fame: 4 }, flags: [['become_way', 'self']], echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] } },
      { key: 'mentor', label: '我带第二阵容。', effectText: '组织 +2 · 信任 +5', fx: { a: { playmaking: 2 }, tr: 5 }, flags: [['become_way', 'mentor']], echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] } },
      { key: 'push', label: '我不想一辈子打替补。', effectText: '自信 +4 · 信任 -2', fx: { c: 4, tr: -2 }, flags: [['become_way', 'self']], echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] } }
    ]
  });

  reg({
    id: 'become_injury_01', act: 'become', kind: 'main', minSeason: 4, window: [6, 82], once: true, priority: 390,
    t: '核磁结果出来，队医先看了一眼门口',
    scene: '医疗室 · 清晨',
    speaker: '队医',
    b: '队医把片子放在灯下，先看了一眼门口。\n他说：你可以打，但这一次，恢复时间会比以前长一倍。',
    stakes: '你还能赶上这轮系列赛，但代价可能会留到下个赛季。',
    c: [
      { key: 'manage', label: '减负荷。我还想打久一点。', effectText: '健康 +8 · 信任 -2', fx: { h: 8, tr: -2 }, flags: [['become_way', 'team']], echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] } },
      { key: 'push', label: '继续打。现在不能停。', effectText: '信任 +5 · 健康 -6', fx: { tr: 5, h: -6 }, flags: [['become_way', 'self']], echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] } },
      { key: 'change', label: '改角色。少做一点，做久一点。', effectText: '心态 +5 · 健康 +4', fx: { a: { mentality: 5 }, h: 4 }, flags: [['become_way', 'mentor']], echo: { id: 'become_echo', dueSeason: '+1', window: [24, 66] } }
    ]
  });

  /* ---------------- 内容：回声 ---------------- */

  reg({
    id: 'prove_echo', act: 'prove', kind: 'echo', minSeason: 1, window: [24, 66], once: true, priority: 500,
    requires: function (c, cs) { return !!cs.flags.prove_role; },
    t: '教练又提起那次谈话',
    scene: '训练馆 · 录像室',
    speaker: '主教练',
    b: function (c, cs) {
      var line = v167EchoLine(cs.__echoLabel || { scorer: '给我球，打不进我认', stopper: '我先防守，再谈球权', learner: '先问怎么活下来' }[cs.flags.prove_role] || '你想留下');
      return '一年前你在这间屋子说：「' + line + '」。\n今天教练把同一段录像又放了一遍。他问：还按那条路打吗？';
    },
    stakes: '你当年的回答，现在要变成这一季的轮换和球权。',
    c: [
      { key: 'kept', label: '继续按那条路打。位置变了，我认。', effectText: '信任 +4 · 自信 +3 · 本季风险上升', fx: { tr: 4, c: 3 }, seasonMod: { risk: 1.06 }, flags: [['prove_kept', 1]] },
      { key: 'changed', label: '改角色。先保住轮换。', effectText: '心态 +4 · 信任 +2 · 本季得分下降', fx: { a: { mentality: 4 }, tr: 2 }, seasonMod: { pts: 0.94, ast: 1.04, risk: 0.92 }, flags: [['prove_changed', 1]] }
    ]
  });

  reg({
    id: 'prove_echo2', act: 'prove', kind: 'echo', minSeason: 1, window: [24, 66], once: true, priority: 500,
    requires: function (c, cs) { return !!cs.flags.prove_clutch; },
    t: '最后一球又到你手里',
    scene: '客场 · 第四节',
    speaker: '队友',
    b: '又是最后两分钟。队友把球发给你，然后退到一边。\n他们没有说话，但意思很清楚：这次还是你。',
    stakes: '上一次你怎么处理最后一球，这次会有人记得。',
    c: [
      { key: 'again', label: '还是我来。', effectText: '自信 +5 · 信任 +1 · 健康 -2', fx: { c: 5, tr: 1, h: -2 }, flags: [['prove_clutch_again', 1]] },
      { key: 'share', label: '这次我传。', effectText: '信任 +5 · 组织 +2 · 自信 -2', fx: { tr: 5, a: { playmaking: 2 }, c: -2 }, flags: [['prove_clutch_share', 1]] }
    ]
  });

  reg({
    id: 'become_echo', act: 'become', kind: 'echo', minSeason: 4, window: [24, 66], once: true, priority: 500,
    requires: function (c, cs) { return !!cs.flags.become_way; },
    t: '球队真的按你说的方式用了你',
    scene: '赛季中段 · 录像课',
    speaker: '主教练',
    b: function (c, cs) {
      var line = v167EchoLine(cs.__echoLabel || { team: '按球队的目标打', self: '按自己的方式打', mentor: '把球交出去' }[cs.flags.become_way] || '按你的方式打');
      return '你当初说：「' + line + '」。\n球队真的这么做了。更衣室里有人开始服你，也有人开始抱怨。';
    },
    stakes: '你的打法已经写进轮换，现在要决定要不要继续付这个代价。',
    c: [
      { key: 'paid', label: '这就是我要的。继续。', effectText: '自信 +5 · 信任 +2 · 交易压力 +1', fx: { c: 5, tr: 2, teamTrade: 1 }, flags: [['become_paid', 1]] },
      { key: 'cost', label: '我错了。我得改。', effectText: '心态 +4 · 信任 +3 · 自信 -2', fx: { a: { mentality: 4 }, tr: 3, c: -2 }, flags: [['become_paid', 'cost']] }
    ]
  });

  reg({
    id: 'become_echo2', act: 'become', kind: 'echo', minSeason: 4, window: [24, 66], once: true, priority: 500,
    requires: function (c, cs) { return !!cs.flags.become_contract; },
    t: '那份合同变成了别人嘴里的标签',
    scene: '客场 · 赛前采访',
    speaker: '记者',
    b: function (c, cs) {
      var line = v167EchoLine(cs.__echoLabel || { stay: '留下', money: '拿钱', wait: '拖到赛季结束' }[cs.flags.become_contract] || '留下');
      return '一年前你选择「' + line + '」。\n现在有人说你忠诚，有人说你傻。你坐在采访席上，等自己回答。';
    },
    stakes: '这份合同已经变成别人评价你的标签，你要决定认不认。',
    c: [
      { key: 'worth', label: '我选的我认。', effectText: '自信 +4 · 心态 +2 · 交易压力 +1', fx: { c: 4, a: { mentality: 2 }, teamTrade: 1 }, flags: [['contract_worth', 1]] },
      { key: 'regret', label: '如果再来一次，我会走。', effectText: '心态 +3 · 信任 -1 · 自信 -2', fx: { a: { mentality: 3 }, tr: -1, c: -2 }, flags: [['contract_regret', 1]] }
    ]
  });

  reg({
    id: 'leave_echo', act: 'leave', kind: 'echo', minSeason: 8, window: [24, 66], once: true, priority: 500,
    requires: function (c, cs) { return !!cs.flags.legacy; },
    t: '你当年说的那句话被翻出来了',
    scene: '赛后 · 媒体区',
    speaker: '记者',
    b: function (c, cs) {
      var line = v167EchoLine(cs.__echoLabel || { one_team: '我想在这支球队退役', ring: '一个冠军，别的都不算', path: '让后来的人走得更顺' }[cs.flags.legacy] || '你想留下点什么');
      return '你当年说：「' + line + '」。\n现在他们把这句话翻出来，问你：现在还这么想吗？';
    },
    stakes: '你给这段生涯定的答案，会决定退役后别人怎么介绍你。',
    c: [
      { key: 'same', label: '一样。', effectText: '信任 +4 · 自信 +3 · 健康 -2', fx: { tr: 4, c: 3, h: -2 }, flags: [['legacy_true', 'same']] },
      { key: 'different', label: '人变了。答案也变了。', effectText: '心态 +4 · 名气 -2', fx: { a: { mentality: 4 }, fame: -2 }, flags: [['legacy_true', 'changed']] }
    ]
  });

  reg({
    id: 'leave_echo2', act: 'leave', kind: 'echo', minSeason: 8, window: [24, 66], once: true, priority: 500,
    requires: function (c, cs) { return !!cs.flags.leave_end; },
    t: '赛季结束后的电话',
    scene: '家里 · 早上',
    speaker: '电话那头',
    b: '赛季结束后的第一个月。闹钟没有响，你还是六点醒了。\n有人给你打电话，问你要不要回来做点事。',
    stakes: '篮球暂时停下了，但你和篮球的关系还没有。',
    c: [
      { key: 'yes', label: '回去。篮球还没结束。', effectText: '名气 +5 · 心态 +4 · 健康 -3', fx: { fame: 5, a: { mentality: 4 }, h: -3 }, flags: [['afterlife_ready', 1]] },
      { key: 'no', label: '先过一段没有比赛的日子。', effectText: '健康 +5 · 心态 +5 · 名气 -3', fx: { h: 5, a: { mentality: 5 }, fame: -3 }, flags: [['afterlife_ready', 0]] }
    ]
  });

  /* ---------------- 内容：手写支线 ---------------- */

  reg({
    id: 'side_boo', act: 'prove', kind: 'side', minSeason: 1, window: [24, 66], once: true, priority: 300,
    t: '主场开始嘘你', scene: '主场 · 第一节', speaker: '看台',
    b: '你第一次出手，球砸在篮筐前沿。\n主场看台传来嘘声。你听得很清楚。',
    stakes: '你可以躲，也可以把这一场打成回答。',
    c: [
      { key: 'work', label: '继续投。下一次我会进。', effectText: '自信 +4 · 投射 +1 · 信任 -1', fx: { c: 4, a: { shooting: 1 }, tr: -1 } },
      { key: 'defense', label: '先防下来。让嘘声停。', effectText: '防守 +2 · 信任 +4 · 健康 -2', fx: { a: { defense: 2 }, tr: 4, h: -2 } },
      { key: 'hide', label: '把球交出去。今晚不属于我。', effectText: '心态 +3 · 健康 +2 · 自信 -2', fx: { a: { mentality: 3 }, h: 2, c: -2 } }
    ]
  });

  reg({
    id: 'side_trade', act: 'become', kind: 'side', minSeason: 3, window: [24, 66], once: true, priority: 300,
    t: '你的名字出现在交易流言里', scene: '更衣室 · 手机', speaker: '经纪人',
    b: '经纪人发来一条链接：你的名字出现在交易流言里。\n球队没有否认。',
    stakes: '你是去问清楚，还是把这件事变成球场上的东西。',
    c: [
      { key: 'ask', label: '去找管理层，问清楚。', effectText: '信任 +3 · 心态 +3', fx: { tr: 3, a: { mentality: 3 } } },
      { key: 'public', label: '公开说我想留下。', effectText: '信任 +5 · 自信 -2', fx: { tr: 5, c: -2 } },
      { key: 'ignore', label: '不理。打球就是回答。', effectText: '自信 +5 · 信任 -2', fx: { c: 5, tr: -2 } }
    ]
  });

  reg({
    id: 'side_young', act: 'become', kind: 'side', minSeason: 4, window: [24, 66], once: true, priority: 300,
    t: '新秀抢了你的位置', scene: '训练馆 · 对抗赛', speaker: '教练',
    b: '新秀在对抗赛里连续打了你两个。\n教练没有叫停，他在看你怎么回应。',
    stakes: '你怎么对年轻人，会决定这支球队怎么看你。',
    c: [
      { key: 'teach', label: '教他。下一次我防回来。', effectText: '信任 +5 · 心态 +4', fx: { tr: 5, a: { mentality: 4 } } },
      { key: 'crush', label: '打回去。位置是我的。', effectText: '自信 +5 · 信任 -2', fx: { c: 5, tr: -2 } },
      { key: 'yield', label: '让位。他比我更需要机会。', effectText: '心态 +5 · 信任 +3 · 自信 -2', fx: { a: { mentality: 5 }, tr: 3, c: -2 } }
    ]
  });

  reg({
    id: 'side_family', act: 'prove', kind: 'side', minSeason: 1, window: [24, 66], once: true, priority: 300,
    t: '国内凌晨的比赛', scene: '客场酒店 · 深夜', speaker: '家人',
    b: '家里发来消息：他们定了闹钟，准备看你比赛。\n你看了一眼时间，国内是凌晨三点。',
    stakes: '你打球不只是为了自己。但这句话有时候很重。',
    c: [
      { key: 'call', label: '打电话让他们别等。', effectText: '心态 +5 · 健康 +2', fx: { a: { mentality: 5 }, h: 2 } },
      { key: 'play', label: '那今晚就打给他们看。', effectText: '自信 +5 · 健康 -2', fx: { c: 5, h: -2 } },
      { key: 'off', label: '关机。明天再说。', effectText: '心态 +3 · 信任 +2 · 自信 -2', fx: { a: { mentality: 3 }, tr: 2, c: -2 } }
    ]
  });

  reg({
    id: 'side_body', act: 'become', kind: 'side', minSeason: 3, window: [24, 66], once: true, priority: 300,
    t: '队医让你休战', scene: '医疗室', speaker: '队医',
    b: '队医看着片子说：再打，风险会变大。\n教练站在门口，没有进来。',
    stakes: '你现在的选择，会影响你生涯最后几年还能不能打。',
    c: [
      { key: 'rest', label: '休。听医生的。', effectText: '健康 +8 · 信任 -2', fx: { h: 8, tr: -2 } },
      { key: 'play', label: '打。球队现在需要我。', effectText: '信任 +5 · 健康 -6', fx: { tr: 5, h: -6 } },
      { key: 'limit', label: '减量。每场少打几分钟。', effectText: '健康 +4 · 信任 +2', fx: { h: 4, tr: 2 } }
    ]
  });

  reg({
    id: 'side_coach', act: 'become', kind: 'side', minSeason: 3, window: [24, 66], once: true, priority: 300,
    t: '教练要被解雇了', scene: '球馆走廊', speaker: '助教',
    b: '助教压低声音说：管理层想换教练。\n今晚之后，他可能就不在了。',
    stakes: '你可以说句话，也可以什么都不说。',
    c: [
      { key: 'support', label: '公开支持教练。', effectText: '信任 +6 · 管理层压力 +2', fx: { tr: 6, teamTrade: 2 } },
      { key: 'silent', label: '不说话。这是他们的事。', effectText: '心态 +4 · 信任 -1', fx: { a: { mentality: 4 }, tr: -1 } },
      { key: 'ask', label: '去找管理层，问球队方向。', effectText: '信任 +3 · 心态 +3', fx: { tr: 3, a: { mentality: 3 } } }
    ]
  });

  reg({
    id: 'side_media', act: 'become', kind: 'side', minSeason: 4, window: [24, 66], once: true, priority: 300,
    t: '外媒的尖锐提问', scene: '赛后发布会', speaker: '外媒记者',
    b: '一个外媒记者问：你觉得球队留下你，是因为实力，还是因为市场？\n发布会安静了两秒。',
    stakes: '你可以用数据回答，也可以用态度回答。',
    c: [
      { key: 'data', label: '用数据回答。', effectText: '自信 +5 · 信任 +3', fx: { c: 5, tr: 3 } },
      { key: 'push', label: '正面回击：这个话题到此为止。', effectText: '名气 +6 · 自信 +3', fx: { fame: 6, c: 3 } },
      { key: 'smile', label: '笑一下，明天用比赛说。', effectText: '心态 +5 · 信任 +2', fx: { a: { mentality: 5 }, tr: 2 } }
    ]
  });

  reg({
    id: 'side_contract', act: 'become', kind: 'side', minSeason: 3, window: [24, 66], once: true, priority: 300,
    t: '球队要你降薪', scene: '管理层办公室', speaker: '总经理',
    b: '总经理说：球队需要空间。你可以降薪留下，也可以去市场上看看。\n他没有催你。',
    stakes: '钱、位置、城市，你只能先选两个。',
    c: [
      { key: 'accept', label: '接受。我想留在这里。', effectText: '信任 +6 · 心态 +3 · 自信 -2', fx: { tr: 6, a: { mentality: 3 }, c: -2 } },
      { key: 'refuse', label: '拒绝。我值这个价。', effectText: '自信 +5 · 信任 -3', fx: { c: 5, tr: -3 } },
      { key: 'market', label: '去市场看看。', effectText: '自信 +4 · 球队交易压力 +2', fx: { c: 4, teamTrade: 2 } }
    ]
  });

  /* ---------------- 内容：出身专属链 ---------------- */

  function originEvent(o) {
    reg({
      id: o.id, act: o.act, kind: 'origin', originOnly: true, origin: o.origin,
      minSeason: o.minSeason, window: o.window || [24, 66], once: true, priority: 450,
      requires: o.requires || function (c, cs) {
        if (!cs.origin.unlocked || cs.origin.id !== o.origin) return false;
        return o.step <= 1 || v167Num(cs.origin.chainStep) >= (o.step - 1);
      },
      t: o.t, scene: o.scene, speaker: o.speaker, cast: o.cast, b: o.b, stakes: o.stakes,
      c: o.c.map(function (ch, i) {
        return {
          key: ch[0], label: ch[1], effectText: ch[2], fx: ch[3],
          flags: [['origin_' + o.origin + '_' + o.step, ch[1]]],
          next: null
        };
      })
    });
  }

  originEvent({
    id: 'origin_ncaa_1', origin: 'ncaa', step: 1, act: 'prove', minSeason: 1,
    t: '教练的第二通电话', scene: '客场酒店 · 电话', speaker: '大学教练',
    b: '大学教练又打来电话。这次不是让你回去打球，而是学校想用你的名字拍招生宣传。\n他说：只要你点头，海报下周就能挂出去。',
    stakes: '你的名字属于学校，还是属于你自己。',
    c: [
      ['poster', '可以。把学校带上。', '名气 +5 · 信任 +3', { fame: 5, tr: 3 }],
      ['once', '只拍一次，不绑长期。', '自信 +4 · 信任 +2', { c: 4, tr: 2 }],
      ['refuse', '不。我的名字先留给球队。', '信任 +4 · 自信 +3', { tr: 4, c: 3 }]
    ]
  });
  originEvent({
    id: 'origin_ncaa_2', origin: 'ncaa', step: 2, act: 'become', minSeason: 4,
    t: '母校的筹款电话', scene: '大学礼堂 · 筹款晚宴', speaker: '校友会主席',
    b: '校友会请你出席筹款晚宴。\n他们不只要你的人，还希望你能带来几个赞助商。',
    stakes: '母校需要你的名字，你需要决定怎么给。',
    c: [
      ['donate', '捐一笔。名字挂在捐赠墙上。', '名气 +6 · 信任 +3', { fame: 6, tr: 3 }],
      ['attend', '只出席，不捐钱。', '名气 +3 · 心态 +3', { fame: 3, a: { mentality: 3 } }],
      ['decline', '不去。我的名字不能一直借出去。', '自信 +4 · 信任 +2', { c: 4, tr: 2 }]
    ]
  });
  originEvent({
    id: 'origin_ncaa_3', origin: 'ncaa', step: 3, act: 'leave', minSeason: 8,
    t: '提前退役球衣的条件', scene: '大学球馆 · 办公室', speaker: '学校管理层',
    b: '学校想在你还在打球时退役你的球衣。\n条件是：退役后回校做一年助教。',
    stakes: '提前拿到那份荣誉，还是把未来留给自己。',
    c: [
      ['accept', '答应。退役后回去一年。', '名气 +7 · 信任 +4', { fame: 7, tr: 4 }],
      ['decline', '不答应。我的未来还没写完。', '自信 +5 · 心态 +3', { c: 5, a: { mentality: 3 } }],
      ['fund', '不任教。设一笔奖学金代替。', '名气 +5 · 心态 +4', { fame: 5, a: { mentality: 4 } }]
    ]
  });
  originEvent({
    id: 'origin_ncaa_4', origin: 'ncaa', step: 4, act: 'leave', minSeason: 10,
    t: '母校怎么介绍你', scene: '大学球馆 · 退役仪式', speaker: '主持人',
    b: '母校要给你做一个退役仪式。\n他们问你：介绍词里，要不要写“NBA”？',
    stakes: '你希望母校怎么记得你。',
    c: [
      ['model', '写。让后来的孩子知道这里能走到 NBA。', '名气 +8 · 心态 +4', { fame: 8, a: { mentality: 4 } }],
      ['warning', '写。也写我没走完的那些路。', '心态 +6 · 信任 +3', { a: { mentality: 6 }, tr: 3 }],
      ['none', '不写。就写我在这里打过球。', '心态 +5 · 健康 +3', { a: { mentality: 5 }, h: 3 }]
    ]
  });

  originEvent({
    id: 'origin_cba_1', origin: 'cba', step: 1, act: 'prove', minSeason: 1,
    t: '国家队征召', scene: '公寓 · 电话', speaker: '国家队教练',
    b: '国家队教练打来电话：休赛期窗口需要你回国集训。\n球队那边不太愿意放人，怕你夏天得不到休息。',
    stakes: '去国家队，还是留在美国备战新赛季。',
    c: [
      ['go', '去。国家队需要我。', '名气 +8 · 信任 -3', { fame: 8, tr: -3 }],
      ['stay', '留下。我现在更需要这里的训练。', '信任 +5 · 心态 -2', { tr: 5, a: { mentality: -2 } }],
      ['talk', '和球队协商。集训后期再报到。', '信任 +3 · 健康 -4', { tr: 3, h: -4 }]
    ]
  });
  originEvent({
    id: 'origin_cba_2', origin: 'cba', step: 2, act: 'become', minSeason: 4,
    t: '国内舆论', scene: '客场酒店 · 手机', speaker: '家人',
    b: '国内新闻把你的一句话放大了。\n评论区开始吵：你到底代表谁？',
    stakes: '你不可能让所有人满意。你只能选一个回答。',
    c: [
      ['represent', '代表那些看我打球的人。', '名气 +8 · 心态 +3', { fame: 8, a: { mentality: 3 } }],
      ['separate', '我只代表我自己。', '自信 +5 · 名气 -3', { c: 5, fame: -3 }],
      ['silent', '不回应。让比赛说完。', '心态 +5 · 信任 +2', { a: { mentality: 5 }, tr: 2 }]
    ]
  });
  originEvent({
    id: 'origin_cba_3', origin: 'cba', step: 3, act: 'leave', minSeason: 8,
    t: '老东家告别赛', scene: '国内球馆 · 休赛期', speaker: '老东家经理',
    b: '老东家想趁休赛期给你办一场告别赛。\n他们说：你从这里出去，也该从这里说再见。只打一场，不影响 NBA。',
    stakes: '休赛期回去，还是不回。',
    c: [
      ['go', '休赛期回去。那是我开始的地方。', '名气 +8 · 心态 +5', { fame: 8, a: { mentality: 5 } }],
      ['no', '不回。告别不需要一场比赛。', '心态 +4 · 健康 +4', { a: { mentality: 4 }, h: 4 }],
      ['charity', '回去。但把门票收入捐给青训。', '名气 +10 · 心态 +4', { fame: 10, a: { mentality: 4 } }]
    ]
  });
  originEvent({
    id: 'origin_cba_4', origin: 'cba', step: 4, act: 'leave', minSeason: 10,
    t: '你给国内联赛留下了什么', scene: '国内球馆 · 退役后', speaker: '年轻球员',
    b: '一个年轻球员问你：我该怎么走出去？\n你想起自己当年也是这么问别人的。',
    stakes: '你现在可以给他一个答案。',
    c: [
      ['youth', '留下来做青训。先把地基打好。', '名气 +8 · 心态 +5', { fame: 8, a: { mentality: 5 } }],
      ['league', '帮联赛搭桥。让更多人被看见。', '名气 +10 · 信任 +3', { fame: 10, tr: 3 }],
      ['none', '什么都没留。我只是走过。', '心态 +4 · 自信 +3', { a: { mentality: 4 }, c: 3 }]
    ]
  });

  originEvent({
    id: 'origin_academy_1', origin: 'academy', step: 1, act: 'prove', minSeason: 1,
    t: '体校的招生宣传片', scene: '体校 · 水泥球场', speaker: '体校教练',
    b: '体校想让你回来拍一部招生宣传片，站在你当年睡过的宿舍门口。\n教练说：不用打球，只要露个面。',
    stakes: '你可以把名字借给起点，也可以只寄一笔钱。',
    c: [
      ['go', '回去拍。让更多孩子看见。', '名气 +5 · 心态 +3', { fame: 5, a: { mentality: 3 } }],
      ['video', '只录视频，人不回去。', '名气 +3 · 健康 +2', { fame: 3, h: 2 }],
      ['decline', '不拍。我的路还没走完。', '自信 +4 · 信任 +2', { c: 4, tr: 2 }]
    ]
  });
  originEvent({
    id: 'origin_academy_2', origin: 'academy', step: 2, act: 'become', minSeason: 4,
    t: '体校给的编制', scene: '体育局 · 办公室', speaker: '体校领导',
    b: '体育局想给你一个编制，条件是你休赛期回省队带两次训练。\n经纪人说：签了，你就多一层身份。',
    stakes: '要一份体制内的保障，还是把夏天全留给 NBA。',
    c: [
      ['accept', '签。给起点一个交代。', '信任 +5 · 名气 +3', { tr: 5, fame: 3 }],
      ['negotiate', '签，但只挂名不带训。', '自信 +4 · 信任 +2', { c: 4, tr: 2 }],
      ['decline', '不签。我现在只属于球队。', '信任 +4 · 健康 +3', { tr: 4, h: 3 }]
    ]
  });
  originEvent({
    id: 'origin_academy_3', origin: 'academy', step: 3, act: 'leave', minSeason: 8,
    t: '休赛期带一批孩子', scene: '体校 · 水泥球场', speaker: '体校教练',
    b: '体校想请你在休赛期回去带一批孩子。\n没有编制，也没有多少钱，但只用待两周。',
    stakes: '你可以抽时间回去，也可以只寄一笔钱。',
    c: [
      ['coach', '休赛期回去。亲自带。', '名气 +8 · 心态 +5', { fame: 8, a: { mentality: 5 } }],
      ['money', '寄钱。我不回去。', '名气 +4 · 健康 +4', { fame: 4, h: 4 }],
      ['business', '做成商业训练营。能帮更多人。', '名气 +6 · 自信 +4', { fame: 6, c: 4 }]
    ]
  });
  originEvent({
    id: 'origin_academy_4', origin: 'academy', step: 4, act: 'leave', minSeason: 10,
    t: '体系里出来的人怎么回去', scene: '体校 · 退役后', speaker: '年轻教练',
    b: '年轻教练问你：我们这套东西，到底哪里不对？\n你知道答案，但说出来会得罪人。',
    stakes: '你可以改它，绕开它，也可以什么都不说。',
    c: [
      ['change', '说出来。能改一点是一点。', '名气 +8 · 心态 +4', { fame: 8, a: { mentality: 4 } }],
      ['bypass', '绕开它。自己建一条路。', '自信 +5 · 名气 +3', { c: 5, fame: 3 }],
      ['leave', '不说了。我已经出来了。', '心态 +5 · 健康 +3', { a: { mentality: 5 }, h: 3 }]
    ]
  });

  originEvent({
    id: 'origin_undrafted_1', origin: 'undrafted', step: 1, act: 'prove', minSeason: 1,
    t: '更衣柜上的名字', scene: '训练馆 · 更衣室', speaker: '装备经理',
    b: '球队终于把你的名字贴进更衣柜。\n第二天早上，装备经理又把它撕下来，说印错了一个字母。',
    stakes: '你还没有真正被记住。',
    c: [
      ['fix', '让他重印。我的名字不能错。', '自信 +5 · 心态 +2', { c: 5, a: { mentality: 2 } }],
      ['ignore', '不用重印。先打球。', '心态 +4 · 信任 +3', { a: { mentality: 4 }, tr: 3 }],
      ['keep', '把旧名牌收起来。留着提醒自己。', '心态 +5 · 健康 +2', { a: { mentality: 5 }, h: 2 }]
    ]
  });
  originEvent({
    id: 'origin_undrafted_2', origin: 'undrafted', step: 2, act: 'become', minSeason: 4,
    t: '老队友的电话', scene: '公寓 · 深夜', speaker: '发展联盟老队友',
    b: '发展联盟老队友打来电话，问你能不能把经纪人介绍给他。\n他说：你上去了，我还在等。',
    stakes: '你已经离开了那趟车，但车上还有人。',
    c: [
      ['help', '帮。把经纪人的电话给他。', '信任 +5 · 名气 +3', { tr: 5, fame: 3 }],
      ['advise', '不引荐，只告诉他怎么练。', '心态 +4 · 自信 +3', { a: { mentality: 4 }, c: 3 }],
      ['focus', '先挂电话。明天还有比赛。', '健康 +3 · 自信 +2', { h: 3, c: 2 }]
    ]
  });
  originEvent({
    id: 'origin_undrafted_3', origin: 'undrafted', step: 3, act: 'leave', minSeason: 8,
    t: '看台上的牌子', scene: '主场 · 热身', speaker: '看台',
    b: '热身时，你看见看台上有块手写牌子，上面歪歪扭扭写着你的名字。\n那是你第一次在 NBA 球馆里看见自己的名字被球迷举起来。',
    stakes: '你等了很久的东西，终于有人替你写出来。',
    c: [
      ['wave', '朝他挥手。', '名气 +6 · 心态 +3', { fame: 6, a: { mentality: 3 } }],
      ['focus', '不回应。先把比赛打好。', '自信 +5 · 健康 +2', { c: 5, h: 2 }],
      ['jersey', '赛后把球衣送给他。', '名气 +8 · 信任 +2', { fame: 8, tr: 2 }]
    ]
  });
  originEvent({
    id: 'origin_undrafted_4', origin: 'undrafted', step: 4, act: 'leave', minSeason: 10,
    t: '没有名字的人最后被怎么记住', scene: '球馆 · 退役后', speaker: '记者',
    b: '记者问：你希望别人怎么记住你？\n你想了很久，发现最难回答的是自己的名字。',
    stakes: '你终于可以自己写这个答案。',
    c: [
      ['name', '记住我的名字。就够了。', '名气 +6 · 自信 +5', { fame: 6, c: 5 }],
      ['story', '记住我走过的那条路。', '名气 +8 · 心态 +4', { fame: 8, a: { mentality: 4 } }],
      ['none', '不记住也没关系。我打过。', '心态 +6 · 健康 +3', { a: { mentality: 6 }, h: 3 }]
    ]
  });

  originEvent({
    id: 'origin_prep_1', origin: 'prep', step: 1, act: 'prove', minSeason: 1,
    t: '预科学校的招生片', scene: '预科球馆 · 拍摄日', speaker: '预科教练',
    b: '预科学校想让你出镜拍一部招生片，用你的名字招下一批孩子。\n教练说：只拍半天，不碰赛季。',
    stakes: '你的脸可以帮学校，也可以只属于你自己。',
    c: [
      ['shoot', '拍。让他们用我的名字。', '名气 +5 · 信任 +3', { fame: 5, tr: 3 }],
      ['limit', '只拍训练，不接商业。', '自信 +4 · 信任 +2', { c: 4, tr: 2 }],
      ['decline', '不拍。先专注球队。', '信任 +4 · 心态 +3', { tr: 4, a: { mentality: 3 } }]
    ]
  });
  originEvent({
    id: 'origin_prep_2', origin: 'prep', step: 2, act: 'become', minSeason: 4,
    t: '下一届全美第一', scene: '训练馆 · 录像室', speaker: '球队助教',
    b: '媒体把下一届全美第一拿来和你比较。\n助教把视频推给你：他说自己比你更配那个头衔。',
    stakes: '你要压住他，还是把路指给他。',
    c: [
      ['compete', '压住他。用比赛说话。', '自信 +5 · 投射 +1', { c: 5, a: { shooting: 1 } }],
      ['mentor', '教他。头衔不是终点。', '信任 +4 · 心态 +4', { tr: 4, a: { mentality: 4 } }],
      ['ignore', '不看。我的生涯不需要比较。', '心态 +5 · 健康 +2', { a: { mentality: 5 }, h: 2 }]
    ]
  });
  originEvent({
    id: 'origin_prep_3', origin: 'prep', step: 3, act: 'leave', minSeason: 8,
    t: '预科学校的球衣仪式', scene: '预科球馆 · 退役仪式', speaker: '校长',
    b: '预科学校想退役你的球衣。\n条件是你得先捐一笔钱，给新球馆。',
    stakes: '你的名字可以挂上去，但要看以什么方式。',
    c: [
      ['donate', '捐。名字挂上去。', '名气 +6 · 自信 +4', { fame: 6, c: 4 }],
      ['jersey', '只退役球衣，不捐馆。', '信任 +5 · 心态 +4', { tr: 5, a: { mentality: 4 } }],
      ['refuse', '拒绝。我不需要那面墙。', '心态 +6 · 自信 +3', { a: { mentality: 6 }, c: 3 }]
    ]
  });
  originEvent({
    id: 'origin_prep_4', origin: 'prep', step: 4, act: 'leave', minSeason: 10,
    t: '你代表哪一代人', scene: '预科球馆 · 退役后', speaker: '预科球员',
    b: '一个预科孩子问你：全美第一，真的能走到 NBA 吗？\n你想起自己当年也这么问过。',
    stakes: '你现在可以给他一个答案。',
    c: [
      ['camp', '建训练营。把路铺出来。', '名气 +8 · 心态 +4', { fame: 8, a: { mentality: 4 } }],
      ['truth', '把真话说给他听。', '心态 +6 · 信任 +2', { a: { mentality: 6 }, tr: 2 }],
      ['none', '不给承诺。让他自己走。', '自信 +5 · 健康 +3', { c: 5, h: 3 }]
    ]
  });

  originEvent({
    id: 'origin_euro_1', origin: 'euro', step: 1, act: 'prove', minSeason: 1,
    t: '欧洲老东家的纪念赛', scene: '经纪人办公室', speaker: '经纪人',
    b: '欧洲老东家发来邀请：想在你回 NBA 后的第一个休赛期，为你办一场纪念赛。\n经纪人提醒：曝光很大，但会打乱你的夏训。',
    stakes: '回去露一面，还是把整个夏天留给 NBA。',
    c: [
      ['go', '休赛期回去打纪念赛。', '名气 +7 · 健康 -3', { fame: 7, h: -3 }],
      ['stay', '不去。夏天只留给训练。', '信任 +5 · 自信 +3', { tr: 5, c: 3 }],
      ['video', '录一段视频致辞，人不去。', '名气 +3 · 健康 +1', { fame: 3, h: 1 }]
    ]
  });
  originEvent({
    id: 'origin_euro_2', origin: 'euro', step: 2, act: 'become', minSeason: 4,
    t: '欧洲媒体的标签', scene: '客场酒店 · 手机', speaker: '队友',
    b: '欧洲媒体写：他只是体系球员，离开欧洲的战术就不会打球。\n队友把链接发给你。',
    stakes: '你可以回击，也可以让比赛说话。',
    c: [
      ['answer', '用季后赛回答。', '自信 +6 · 信任 +3', { c: 6, tr: 3 }],
      ['fight', '公开回击。', '名气 +4 · 自信 +4 · 信任 -3', { fame: 4, c: 4, tr: -3 }],
      ['ignore', '关掉手机。', '心态 +5 · 健康 +3', { a: { mentality: 5 }, h: 3 }]
    ]
  });
  originEvent({
    id: 'origin_euro_3', origin: 'euro', step: 3, act: 'leave', minSeason: 8,
    t: '欧洲的告别邀请', scene: '欧洲球馆 · 休赛期', speaker: '老东家经理',
    b: '老东家问：退役后，要不要回欧洲办一场告别赛？\n他们说：不是让你离开 NBA，只是最后再穿一次那件球衣。',
    stakes: '把告别留到退役后，还是现在就答应。',
    c: [
      ['go', '答应。退役后回去打最后一场。', '名气 +8 · 心态 +5', { fame: 8, a: { mentality: 5 } }],
      ['no', '不答应。我在这里退役。', '自信 +5 · 健康 +4', { c: 5, h: 4 }],
      ['coach', '退役后回去，以教练身份。', '心态 +6 · 信任 +2', { a: { mentality: 6 }, tr: 2 }]
    ]
  });
  originEvent({
    id: 'origin_euro_4', origin: 'euro', step: 4, act: 'leave', minSeason: 10,
    t: '你给欧洲联赛留下了什么', scene: '欧洲球馆 · 退役后', speaker: '欧洲年轻后卫',
    b: '一个欧洲年轻后卫问你：去 NBA，最难的是什么？\n你想起自己第一次踏上那个球馆的晚上。',
    stakes: '你现在可以给他一个答案。',
    c: [
      ['bridge', '做桥梁。帮他们被看见。', '名气 +10 · 心态 +4', { fame: 10, a: { mentality: 4 } }],
      ['camp', '回去办训练营。', '名气 +6 · 自信 +4', { fame: 6, c: 4 }],
      ['none', '什么都不留。路要自己走。', '心态 +5 · 健康 +3', { a: { mentality: 5 }, h: 3 }]
    ]
  });

  originEvent({
    id: 'origin_nbl_1', origin: 'nbl', step: 1, act: 'prove', minSeason: 1,
    t: 'NBL 的推广大使邀请', scene: '公寓 · 电话', speaker: 'NBL 老东家',
    b: 'NBL 老东家打来电话：联赛想请你做推广大使。\n工作都在休赛期：揭幕战露个面，再带一次青训营，不影响 NBA 赛季。',
    stakes: '接下这份曝光，还是把夏天全部留给训练。',
    c: [
      ['go', '接。休赛期回去露一面。', '名气 +6 · 健康 -3', { fame: 6, h: -3 }],
      ['stay', '不接。夏天要训练。', '信任 +5 · 自信 +3', { tr: 5, c: 3 }],
      ['remote', '只远程参与，不飞回去。', '名气 +2 · 健康 +2', { fame: 2, h: 2 }]
    ]
  });
  originEvent({
    id: 'origin_nbl_2', origin: 'nbl', step: 2, act: 'become', minSeason: 4,
    t: '南半球来的质疑', scene: '赛后发布会', speaker: '美国记者',
    b: '美国媒体说：NBL 的数据水分太大。\n这句话被剪成短视频，转了几万次。',
    stakes: '你可以回击，也可以用防守回答。',
    c: [
      ['answer', '用防守回答。', '信任 +5 · 心态 +4', { tr: 5, a: { mentality: 4 } }],
      ['fight', '公开回击。', '自信 +5 · 名气 +4 · 信任 -3', { c: 5, fame: 4, tr: -3 }],
      ['ignore', '不看评论。', '心态 +5 · 健康 +3', { a: { mentality: 5 }, h: 3 }]
    ]
  });
  originEvent({
    id: 'origin_nbl_3', origin: 'nbl', step: 3, act: 'leave', minSeason: 8,
    t: 'NBL 的球衣仪式', scene: 'NBL 球馆 · 退役仪式', speaker: '老东家经理',
    b: '老东家想趁休赛期给你办一个球衣仪式。\n他们问：你愿意飞回来吗？只参加仪式，不打比赛。',
    stakes: '休赛期回去露一面，还是把记忆留在那里。',
    c: [
      ['go', '休赛期回去。那是我被看见的地方。', '名气 +7 · 心态 +4', { fame: 7, a: { mentality: 4 } }],
      ['no', '不回。记忆留在那里就好。', '健康 +4 · 心态 +3', { h: 4, a: { mentality: 3 } }],
      ['camp', '休赛期回去，带一批孩子。', '名气 +5 · 信任 +3', { fame: 5, tr: 3 }]
    ]
  });
  originEvent({
    id: 'origin_nbl_4', origin: 'nbl', step: 4, act: 'leave', minSeason: 10,
    t: 'Next Star 的下一批人', scene: 'NBL 球馆 · 退役后', speaker: 'NBL 年轻球员',
    b: '一个 NBL 的 Next Star 问你：我该不该去 NBA？\n你想起自己当年也是被这样问的。',
    stakes: '你可以给他一条路，也可以只给他一句真话。',
    c: [
      ['help', '帮他。把坑先告诉他。', '心态 +6 · 信任 +2', { a: { mentality: 6 }, tr: 2 }],
      ['honest', '只说一句：会比你想的难。', '心态 +4 · 自信 +3', { a: { mentality: 4 }, c: 3 }],
      ['none', '让他自己选。', '自信 +5 · 健康 +3', { c: 5, h: 3 }]
    ]
  });

  originEvent({
    id: 'origin_gleague_1', origin: 'gleague', step: 1, act: 'prove', minSeason: 1,
    t: '发展联盟的致敬夜', scene: '球队办公室', speaker: '发展联盟经理',
    b: '发展联盟老东家请你在休赛期回去参加致敬夜，顺便给年轻球员做一次分享。\n球队同意你去，但会占掉一部分夏训时间。',
    stakes: '回去接受那份认可，还是把夏天留给训练。',
    c: [
      ['go', '去。那是我熬出来的地方。', '信任 +3 · 自信 +4', { tr: 3, c: 4 }],
      ['stay', '不去。夏天要特训。', '信任 +5 · 心态 +2', { tr: 5, a: { mentality: 2 } }],
      ['remote', '只录一段视频。人不去。', '名气 +2 · 健康 +2', { fame: 2, h: 2 }]
    ]
  });
  originEvent({
    id: 'origin_gleague_2', origin: 'gleague', step: 2, act: 'become', minSeason: 4,
    t: '又一次被移出轮换', scene: '总经理办公室', speaker: '总经理',
    b: '球队把你移出了轮换名单。\n总经理说：不是放弃你，是让你先在场边看清楚。',
    stakes: '接受，还是要一个更明确的答案。',
    c: [
      ['accept', '接受。我从防守做起。', '信任 +4 · 自信 +3', { tr: 4, c: 3 }],
      ['demand', '要求交易。', '自信 +5 · 信任 -4', { c: 5, tr: -4 }],
      ['prove', '不抱怨。用训练打回来。', '心态 +4 · 自信 +4', { a: { mentality: 4 }, c: 4 }]
    ]
  });
  originEvent({
    id: 'origin_gleague_3', origin: 'gleague', step: 3, act: 'leave', minSeason: 8,
    t: '老队友被裁了', scene: '公寓 · 深夜', speaker: '发展联盟老队友',
    b: '发展联盟老队友被裁了。他打电话问你：能不能帮他找一份夏季联赛的邀请？\n他说：你是我认识的唯一一个真的上去了的人。',
    stakes: '你的一句话，可能会改变他接下来的几年。',
    c: [
      ['help', '帮。把我的训练师和经纪人介绍给他。', '信任 +5 · 名气 +3', { tr: 5, fame: 3 }],
      ['truth', '告诉他真话：名额很少，得自己抢。', '心态 +5 · 自信 +3', { a: { mentality: 5 }, c: 3 }],
      ['silent', '不承诺。让他自己决定。', '健康 +2 · 心态 +3', { h: 2, a: { mentality: 3 } }]
    ]
  });
  originEvent({
    id: 'origin_gleague_4', origin: 'gleague', step: 4, act: 'leave', minSeason: 10,
    t: '发展联盟怎么记住你', scene: '发展联盟球馆 · 退役后', speaker: '发展联盟教练',
    b: '发展联盟想请你回去做一次分享。\n台下坐着一群还在等电话的人。',
    stakes: '你可以回去，也可以继续往前走。',
    c: [
      ['coach', '回去做教练。', '名气 +5 · 心态 +5', { fame: 5, a: { mentality: 5 } }],
      ['money', '资助几个年轻人。', '名气 +6 · 信任 +3', { fame: 6, tr: 3 }],
      ['none', '不回去。我还在往前走。', '自信 +5 · 健康 +3', { c: 5, h: 3 }]
    ]
  });

  /* 供 148 的出身事件广告卡读取出身线名称与四段剧情。 */
  window.v167OriginStoryInfo = originInfo;

  /* ---------------- 调试 ---------------- */

  window.__v167Debug = {
    state: function () { return isCustom() ? ensure(career) : null; },
    events: function () { return Object.keys(EVENTS); },
    destiny: function () {
      if (!isCustom()) return null;
      var cs = ensure(career);
      return { data: destinyFor(career, cs), route: routeSentence(career, cs) };
    },
    epilogue: function () {
      return isCustom() ? epilogueBlock(career) : '';
    },
    next: function () {
      if (!isCustom()) return null;
      var cs = ensure(career);
      var ev = pickEvent(career, cs);
      return ev ? { id: ev.__defId, slot: ev.__slot, title: ev.t } : null;
    },
    pool164: function () {
      if (!isCustom()) return [];
      var cs = ensure(career);
      return pool164Candidates(career, cs).map(function (ev) {
        return { id: ev.__defId, title: ev.t, choices: (ev.c || []).map(function (x) { return x[0]; }) };
      });
    },
    force: function (id) {
      if (!isCustom() || !BY_ID[id]) return false;
      var cs = ensure(career);
      var ev = buildEvent(BY_ID[id], career, cs, { slot: BY_ID[id].kind === 'main' ? 'main' : 'side' });
      markSlot(career, cs, ev);
      cs.pending = { id: ev.__defId, slot: ev.__slot, snapshot: snapshot(ev) };
      stopSim();
      ui.storyEvent = ev;
      save();
      render();
      return true;
    }
  };

  window.v167CloseOutcome = closeOutcome;
})();
