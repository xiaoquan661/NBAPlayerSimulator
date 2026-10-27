
/* ============================================================
 * 新游戏《我的名字》· 选秀夜五档系统 v1 (M1.5)
 * 策划文档 04 实现：
 *   - 顺位计算：出身基础档 + 成长模板微调 + ±5 随机扰动 + 首局保护
 *   - 五档差异化剧本（天之骄子/首轮中坚/首轮末段/次轮寻宝/落选赌命）
 *   - 替换引擎 draftLines（词法赋值，引擎内部调用即走新逻辑）
 *   - 选秀结果写入存档：draftPick / draftTier / draftTeam
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- 顺位计算 ---------- */
  // 基础档（出身决定）：academy 5-14 | ncaa 3-10 | cba 18-35 | undrafted 落选
  function baseRange(origin) {
    switch (origin) {
      case 'academy': return [5, 14];
      case 'ncaa': return [3, 10];
      case 'prep': return [3, 10];
      case 'euro': return [15, 30];
      case 'nbl': return [10, 25];
      case 'gleague': return [20, 40];
      case 'cba': return [18, 35];
      case 'undrafted': return null; // 落选线
      default: return [10, 25];
    }
  }

  // 难度独立选择：只修正顺位偏移，不改出身的故事与资格
  const DIFF_SHIFT = { easy: -2, normal: 0, hard: 6, hell: 12 };

  function rollPick(origin, arch) {
    if (origin === 'undrafted') return 0; // 0 = 落选
    const [lo, hi] = baseRange(origin);
    let pick = lo + Math.floor(Math.random() * (hi - lo + 1));
    const diff = (window.__CREATOR__ && window.__CREATOR__.difficulty) || 'normal';
    pick += DIFF_SHIFT[diff] || 0;
    // 成长模板微调：S 档模板 -2（更被看好），C/D 档 +3
    if (arch && arch.key) {
      if (arch.key[0] === 'S') pick -= 2;
      else if (arch.key[0] === 'C' || arch.key === 'D') pick += 3;
    }
    // 随机扰动 ±5
    pick += Math.floor(Math.random() * 11) - 5;
    return Math.max(1, Math.min(60, pick));
  }

  function tierOf(pick) {
    if (pick === 0) return 'undrafted';
    if (pick <= 3) return 'elite';
    if (pick <= 14) return 'lottery';
    if (pick <= 30) return 'late1';
    return 'round2';
  }

  /* ---------- 五档剧本（全部原创文案） ---------- */
  const TIER_META = {
    elite:    { n: '天之骄子', pick: '第 1-3 顺位' },
    lottery:  { n: '首轮中坚', pick: '乐透区' },
    late1:    { n: '首轮末段', pick: '首轮后段' },
    round2:   { n: '次轮寻宝', pick: '第二轮' },
    undrafted: { n: '落选赌命', pick: '落选' }
  };

  // 选秀夜开场：按出身四选一，再按年代补一句时代背景
  const ERA_LINES = {
    2001: '电视里还在放上一代国际球员的新闻。轮到你的时候，镜头未必会停留。',
    2007: '国际球员已经不再是新鲜事。球探开始用同一套标准衡量你。',
    2013: '联盟正在重新评估国际新秀。有人说，这一步走得太早。',
    2016: '勇士刚用三分球改变了联盟。球探开始重新看待会投篮的大个子。',
    2017: '双向合同出现了。机会更多，也更像一张随时会到期的车票。',
    2026: '联盟已经没有传统位置。球探不知道把你放进哪一个模板。'
  };
  function draftOpening() {
    const CG = window.__CREATOR__ || {};
    const year = CG.year || 2026;
    const origin = CG.origin || 'ncaa';
    const openings = {
      ncaa: [
        `${year}年夏，布鲁克林巴克莱中心。`,
        '你刚打完疯狂三月。手机里是教练和经纪人的未接来电。',
        '绿房间里坐着六个人，没有一台摄像机对着你——他们拍的是别的新星。'
      ],
      cba: [
        `${year}年夏，纽约。`,
        '五棵松的灯光还没熄，你已经在飞往纽约的航班上。',
        '行李箱里放着总决赛的录像硬盘，奖杯留在俱乐部。经纪人只说了三个字：别紧张。'
      ],
      academy: [
        `${year}年夏，布鲁克林巴克莱中心。`,
        '三个月前，你还在体校宿舍看一台十四寸的电视。',
        '体校教练把一张球探名片放在你床上：“他们看了你在国青的那场球。”现在，你坐在绿房间里。'
      ],
      undrafted: [
        `${year}年夏，布鲁克林巴克莱中心。`,
        '你坐在绿房间最后一排，西装是借来的。',
        '经纪人一直在看手机。没有球队给你任何承诺。'
      ],
      prep: [
        `${year}年夏，布鲁克林巴克莱中心。`,
        '预科毕业照还放在行李箱最上层，全美排名的截图已经被转了几万次。',
        '你坐在绿房间前排，摄像机从进场起就没离开过你的脸。'
      ],
      euro: [
        `${year}年夏，纽约。`,
        '欧洲联赛的赛季刚结束，你拖着行李箱直接进了选秀现场。',
        '你的比赛录像里没有花哨集锦，只有一场又一场成年人的对抗。球探说：他不用教。'
      ],
      nbl: [
        `${year}年夏，布鲁克林巴克莱中心。`,
        '南半球的赛季结束时，你只带回来一件球衣和一双磨平的鞋。',
        '美国媒体很少提你的名字，但球探报告上写着：对抗成熟，防守可靠。'
      ],
      gleague: [
        `${year}年夏，布鲁克林巴克莱中心。`,
        '你刚从发展联盟的夜班车上下来，眼睛还没适应球馆的灯。',
        '没有球队承诺会念你的名字，但也没有人敢说你打不了。'
      ]
    };
    const open = openings[origin] || openings.ncaa;
    return open.concat([ERA_LINES[year] || ERA_LINES[2026]]);
  }

  function draftScript(pick, teamName, vowText) {
    const t = tierOf(pick);
    if (t === 'elite') return [...draftOpening(),
      `「第一顺位——」`,
      `念出的是你的名字。全场的快门声像一场暴雨。`,
      `${teamName}选择了你。你的名字在乐透区顶端被念响。`,
      `你想起那句自白：「${vowText}」——现在，全世界都听见了。`,
      `压力从这一刻开始计时。`
    ];
    if (t === 'lottery') return [...draftOpening(),
      `选秀进入乐透区后段。你的手机震动了一次，又安静了。`,
      `「第 ${pick} 顺位——」`,
      `是你的名字。${teamName}赌了一个还没有证明自己的年轻人，没有人确定这赌对不对。`,
      `你在心里说：「${vowText}」。`,
      `这支球队需要一个答案，而你只有一次机会成为它。`
    ];
    if (t === 'late1') return [...draftOpening(),
      `首轮过半，你没有抬头。念过的每一个名字都不是你。`,
      `「第 ${pick} 顺位——」`,
      `是你。${teamName}的选择让解说停顿了一秒。`,
      `在这个顺位被念到，意味着你从一开始就没有太多容错。你攥紧了拳：「${vowText}」。`,
      `首轮末段的合同没有保障，你的每一天都是证明题。`
    ];
    if (t === 'round2') return [...draftOpening(),
      `第二轮了。绿房间早就空了，你在后台看大屏幕。`,
      `「第 ${pick} 顺位——」`,
      `终于。${teamName}用一个次轮签捡到了你——他们自己也说不清这是捡还是赌。`,
      `次轮秀的更衣室柜子都比你大。你在心里重复：「${vowText}」。`,
      `训练营裁员的名单，永远不会提前公布。`
    ];
    return [...draftOpening(),
      `一轮又一轮。六十个名字念完了。`,
      `没有你的名字。`,
      `绿灯亮起，人流散场。有位球探在出口拍了拍你的肩：「夏季联赛，十天合同。来吗？」`,
      `你把西装外套拉链拉到顶：「${vowText}」。`,
      `没有顺位的人生，从最底层开始打。`
    ];
  }

  /* ---------- 接管引擎 draftLines（引擎源码已加 __DRAFTX__ 路由） ---------- */
  window.__DRAFTX__ = function (p) {
    // 顺位只算一次（演出中多次调用 draftLines）
    if (!window.__DRAFT_RESULT__) {
      const CG = window.__CREATOR__ || {};
      const arch = CG.archetype || {};
      const origin = CG.origin || 'academy';
      window.__DRAFT_CTX__ = { origin: origin, year: CG.year || 2026 };
      const pick = rollPick(origin, arch);
      // 选中球队：按球队战力升序排，高顺位去弱队，低顺位去强队。
      // 第 30 / 60 顺位固定给战力第一的球队；不改动任何球队的 power。
      let teamName = '某支球队';
      let teamAbbr = null;
      try {
        const probe = document.createElement('script');
        probe.textContent = 'window.__teamsProbe = (typeof teams !== "undefined" && Array.isArray(teams)) ? teams.map(function(t){return {abbr:t.abbr,name:t.name,power:t.power}}) : null';
        document.head.appendChild(probe);
        const list = window.__teamsProbe;
        if (list && list.length) {
          if (pick > 0 && pick <= 60) {
            const sorted = list.slice().sort(function (a, b) { return (a.power || 80) - (b.power || 80); });
            const team = sorted[(pick - 1) % sorted.length];
            teamName = team.name;
            teamAbbr = team.abbr;
          } else {
            const team = list[Math.floor(Math.random() * list.length)];
            teamName = team.name;
            teamAbbr = team.abbr;
          }
        }
      } catch (e) {}
      const vow = CG.vowText || '总有一天他们会念我的名字';
      const tier = tierOf(pick);
      window.__DRAFT_RESULT__ = { pick, tier, team: teamName, teamAbbr: teamAbbr, lines: draftScript(pick, teamName, vow) };
      CG.draftResult = window.__DRAFT_RESULT__;
    }
    return window.__DRAFT_RESULT__.lines;
  };
  /* ---------- 结果落盘：createCareer 之后写入选秀数据 ---------- */
  // 借成长模块的存档轮询器思路：独立轮询写入 draftPick（career 创建后）
  setInterval(function () {
    try {
      const CG = window.__CREATOR__;
      if (!CG || !CG.draftResult) return;
      const raw = localStorage.getItem('save_bust_no1_v4');
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.playerId !== 'custom' || s.draftPick !== undefined) { CG.draftResult = null; return; }
      s.draftPick = CG.draftResult.pick;
      s.draftTier = CG.draftResult.tier;
      s.draftTierName = TIER_META[CG.draftResult.tier] ? TIER_META[CG.draftResult.tier].n : '';
      s.draftTeamName = CG.draftResult.team;
      s.feed = s.feed || [];
      if (s.draftPick === 0) {
        s.feed.unshift('落选。夏季联赛十天合同，是你唯一的入场券。');
      } else {
        s.feed.unshift(`选秀夜：第 ${s.draftPick} 顺位被 ${s.draftTeamName} 选中（${s.draftTierName}）。`);
      }
      localStorage.setItem('save_bust_no1_v4', JSON.stringify(s));
      CG.draftResult = null;
    } catch (e) {}
  }, 800);

  /* ---------- 落选线的属性补偿（D 档原型之外的小额加成，让落选线可玩） ---------- */
  // 落选 = 更衣室地位低（trust -8），但饥饿感强（mentality +5）
  // 在存档轮询里一并处理
  setInterval(function () {
    try {
      const raw = localStorage.getItem('save_bust_no1_v4');
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.playerId !== 'custom' || s.draftPick !== 0 || s.undraftedBonusApplied) return;
      s.trust = Math.max(20, (s.trust || 50) - 8);
      s.confidence = Math.max(20, (s.confidence || 50) + 5);
      if (s.attrs && s.attrs.mentality) s.attrs.mentality = Math.min(99, s.attrs.mentality + 5);
      s.undraftedBonusApplied = true;
      localStorage.setItem('save_bust_no1_v4', JSON.stringify(s));
    } catch (e) {}
  }, 900);

  window.__DRAFT__ = { rollPick, tierOf, draftScript, TIER_META };

})(window);
