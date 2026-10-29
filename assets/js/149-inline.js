
/* ============================================================
 * 新游戏《我的名字》· 成长系统 v1 (M1.5) —— 骑砍式主动学习
 *
 * 2026-10-22 重新启用：只保留自建球员，成长回到骑砍式主动学习。
 *   - 比赛表现驱动成长（打球涨球）
 *   - 赛季结束发专精点，1 点专精 = 指定属性潜力 +1（无单项上限）
 *   - 潜力线 / 硬上限 / 比赛 XP 全部生效
 *   - 加点入口放在「球员」页
 * ============================================================ */
(function () {
  'use strict';
  window.__ORIGINAL_GROWTH__ = false;

  const ATTR_NAMES = { finishing: '终结', shooting: '投射', playmaking: '组织', defense: '防守', steals: '抢断', blocks: '盖帽', strength: '力量', rebounding: '篮板', athleticism: '运动', durability: '耐久', mentality: '心态' };
  const ATTR_KEYS = Object.keys(ATTR_NAMES);

  /* ---------- 存档字段初始化（对 custom 球员） ---------- */
  const CAP_STEP = 4;        // 每 1 点专精提升的上限（仅用于兼容旧逻辑）
  const CAP_EFF_FULL = 20;   // 差距达到 20 时学习效率 100%

  function ensureGrowth(career) {
    if (!career) return;
    if (!career.focus) career.focus = {};
    ATTR_KEYS.forEach(k => { if (typeof career.focus[k] !== 'number') career.focus[k] = 0; });
    if (!career.focusLocked) career.focusLocked = {};
    ATTR_KEYS.forEach(k => { if (typeof career.focusLocked[k] !== 'number') career.focusLocked[k] = 0; });
    /* 旧档迁移：模板名称与曲线以当前表为准，避免旧版字段缺失。 */
    try {
      if (career.playerId === 'custom' && career.__arch && career.__arch.key && window.__ARCHETYPES__) {
        const meta = window.__ARCHETYPES__[career.__arch.key];
        if (meta) {
          career.__arch.cap = meta.cap;
          career.__arch.n = meta.n;
          career.__arch.d = meta.d || '';
          const routeGroup = window.__STAR_ROUTE_GROUP__ && window.__STAR_ROUTE_GROUP__[career.__arch.style];
          const starMap = window.__STAR_TEMPLATES__ && window.__STAR_TEMPLATES__[career.__arch.key];
          if (starMap) {
            career.__arch.route = routeGroup || career.__arch.route || 'wing';
            career.__arch.star = starMap[career.__arch.route] || starMap.wing || career.__arch.star || '';
          }
        }
      }
    } catch (e) {}
    if (typeof career.focusPts !== 'number') {
      // 自建球员训练营 4 点；明星保留同等起点，旧成长点按 2:1 折算后取 4 点下限。
      const dp = Number(career.devPoints) || 0;
      career.focusPts = career.playerId === 'custom' ? 4 : Math.max(4, Math.ceil(dp / 2));
      if (career.playerId !== 'custom') career.devPoints = 0;
    } else if (career.playerId !== 'custom' && (Number(career.devPoints) || 0) > 0) {
      career.focusPts += Math.ceil((Number(career.devPoints) || 0) / 2);
      career.devPoints = 0;
    }
    if (!career.skillXp) career.skillXp = {};
    ATTR_KEYS.forEach(k => { if (typeof career.skillXp[k] !== 'number') career.skillXp[k] = 0; });
    /* 原版潜力上限：沿用原作 profile 的 ceiling 公式（年轻 +3，封顶 94），
       作为技能条上的黄条；能力超过黄条后学习效率下降。 */
    if (typeof career.ceiling !== 'number' || !Number.isFinite(career.ceiling)) {
      if (career.playerId === 'custom') {
        career.ceiling = Math.min(94, Math.max(60, Math.round((career.ovr || 70) + ((career.age || 20) < 25 ? 3 : 0))));
      } else {
        const ovr = Number(career.ovr) || 75;
        const age = Number(career.age) || 22;
        career.ceiling = Math.min(99, Math.max(ovr + 3, ovr + (age <= 20 ? 9 : age <= 23 ? 7 : age <= 26 ? 5 : age <= 29 ? 3 : 1)));
      }
    }
    if (career.playerId !== 'custom') initStarCaps(career);
    /* 模板不再限制潜力上限；所有出身最终都能成长到 110。 */
    if (career.playerId === 'custom' && career.__arch && career.potentialCaps) {
      const hard = hardCapFor(career);
      ATTR_KEYS.forEach(k => {
        const val = Number(career.attrs && career.attrs[k]) || 0;
        if (typeof career.potentialCaps[k] === 'number') {
          career.potentialCaps[k] = Math.max(val, Math.min(hard, career.potentialCaps[k]));
        }
      });
    }
    initDynCaps(career);
  }

  /* 明星模式没有捏人阶段的潜力表：按当前 OVR / 年龄生成一套。 */
  function initStarCaps(c) {
    if (!c || c.playerId === 'custom') return;
    if (!c.potentialCaps) c.potentialCaps = {};
    const ovr = Number(c.ovr) || 75;
    const ceil = Number(c.ceiling) || ovr;
    ATTR_KEYS.forEach(k => {
      const val = Number(c.attrs[k]) || ovr;
      if (typeof c.potentialCaps[k] !== 'number') {
        const bonus = (val - ovr) * 0.4;
        c.potentialCaps[k] = Math.min(99, Math.max(val + 4, Math.round(ceil + bonus + 2)));
      } else {
        c.potentialCaps[k] = Math.max(c.potentialCaps[k], val);
      }
    });
  }

  function hardCapFor(c) {
    /* 所有出身统一 110 硬上限；出身只影响初始能力与初始潜力，不再限制天花板。 */
    return 110;
  }

  /* ---------- 赛季分配锁定 ----------
     每季结束后发放专精点；本季点数全部分配并确认后锁定，不能撤回。
     下一季只会新增可分配点数，已锁定部分永久保留。 */
  function lockedOf(k) {
    if (!career) return 0;
    const f = (career.focus && career.focus[k]) || 0;
    return Math.max(0, Math.min(f, (career.focusLocked && career.focusLocked[k]) || 0));
  }
  function pendingFocus() {
    if (!career) return 0;
    return ATTR_KEYS.reduce((sum, k) => sum + Math.max(0, ((career.focus && career.focus[k]) || 0) - lockedOf(k)), 0);
  }
  function hasSpendablePoint() {
    if (!career || (career.focusPts || 0) <= 0) return false;
    if (career.playerId === 'custom' && career.__arch) {
      const hard = hardCapFor(career);
      return ATTR_KEYS.some(k => {
        const pot = Math.min(Number(career.potentialCaps && career.potentialCaps[k]) || 0, hard);
        return pot < hard || dynCapFor(career, k) < hard;
      });
    }
    // 明星模式沿用原来的 110 潜力规则。
    return ATTR_KEYS.some(k => potentialFor(k) < POT_MAX);
  }

  function allocBlocked() {
    if (!career || career.retired) return false;
    return hasSpendablePoint() || pendingFocus() > 0;
  }

  const CAP_VERSION = 5;

  function initDynCaps(c) {
    if (!c) return;
    if (!c.dynCap) c.dynCap = {};
    const hard = hardCapFor(c);
    /* 不再按出身 / 模板设置成长上限：所有属性都可以自然成长到 110。
       出身只影响初始能力和初始潜力，专精点只影响潜力线与成长效率。 */
    if (c.dynCapVersion !== CAP_VERSION) {
      c.dynCap = {};
      ATTR_KEYS.forEach(k => { c.dynCap[k] = hard; });
      c.dynCapVersion = CAP_VERSION;
      return;
    }
    ATTR_KEYS.forEach(k => { c.dynCap[k] = hard; });
  }

  function dynCapFor(c, k) {
    if (!c) return 0;
    initDynCaps(c);
    return c.dynCap[k];
  }

  function cap() {
    // 技能天花板：成长模板 cap；无模板数据时 92 兜底
    try { return (career.__arch && career.__arch.cap) || 92; } catch (e) { return 92; }
  }

  function threshold(val) {
    // 升级所需经验：越高越难；潜力线以上进一步陡增，堆数值非常困难。
    // 档位做平滑处理，避免 84→85、91→92 出现断崖式变慢。
    if (val < 60) return 70;
    if (val < 70) return 110;
    if (val < 75) return 150;
    if (val < 80) return 190;
    if (val < 85) return 235;
    if (val < 90) return 300;
    if (val < 95) return 400;
    if (val < 99) return 520;
    if (val < 105) return 800;
    return 1300;
  }

  /* 潜力上限直接使用 110 硬上限；不再单独卡 99。 */
  const MAX_ATTR = 110;   // 全局硬天花板
  const POT_MAX = MAX_ATTR; // 潜力线最高也是 110

  function hardFor(k) { return MAX_ATTR; }
  function potentialFor(k) {
    ensureGrowth(career);
    /* 可见潜力：捏人时生成，专精点每点 +1，最高 110。 */
    try {
      if (career && career.potentialCaps && typeof career.potentialCaps[k] === 'number') {
        return Math.max(40, Math.min(POT_MAX, Math.round(career.potentialCaps[k])));
      }
    } catch (e) {}
    const base = Number(career.ceiling) || 75;
    let p = base;
    try { if (k === 'shooting' && typeof hasTalent === 'function' && hasTalent('shot')) p += 4; } catch (e) {}
    return Math.max(40, Math.min(POT_MAX, p));
  }

  function learnRate(k) {
    if (!career) return 0;
    ensureGrowth(career);
    const val = career.attrs[k] || 0;
    const pot = potentialFor(k);
    // 直接按「距潜力差多少」计算：差距越大，学习效率越高。
    // gap 0 → 0.35；gap 10 → 0.65；gap 20 → 0.95；gap 22+ → 1.00。
    // 超过潜力后效率骤降，越往上越难。
    let base;
    if (val < pot) {
      const gap = pot - val;
      base = Math.min(1, Math.max(0.30, 0.35 + gap * 0.03));
    } else {
      base = Math.max(0.015, 0.28 * Math.pow(0.45, val - pot));
    }
    // 专精点不再直接乘学习效率；它改为把潜力线向右推 1 点。
    // 潜力线提高后，val/pot 下降，学习效率会自然回升。
    let r = base;
    /* 传奇天赋【超级学习力】：24 岁前成长效率 +35%。 */
    try {
      if (career.age <= 24 && typeof hasTalent === 'function' && hasTalent('learn')) r *= 1.35;
    } catch (e) {}
    try {
      const mods = career.__arch && career.__arch.mods;
      if (mods && mods[k]) r *= mods[k];
      const dg = career.__arch && career.__arch.difficultyGrowth;
      if (dg) r *= dg;
      /* 到达 110 硬上限后不再常规成长。 */
      if (career.playerId === 'custom' && career.__arch) {
        const dc = dynCapFor(career, k);
        if (val >= dc) r *= 0.55;
        else if (val >= dc - 2) r *= 0.80;
      }
    } catch (e) {}
    return Math.max(0.03, Math.min(1.3, r));
  }

  /* ---------- 每场成长结算（打球涨球） ----------
     比赛表现是主要成长来源：
       · 每 36 分钟效率 × 实际出场机会
       · 胜负、年龄、专精、潜力线共同修正
       · 稳定首发一季目标 +3~5 OVR；替补按效率打折，不会白拿首发成长
     不再用赛季目标值直接补属性，避免“打得好不好都自动长到某评分”。 */
  const MATCH_XP_SCALE = 1.65;

  function opportunityMult(min) {
    // 实际出场机会：30 分钟为标准首发，替补按分钟数打折，超负荷略增。
    return Math.max(0.38, Math.min(1.12, (Number(min) || 20) / 30));
  }

  function ageGrowthMult() {
    const age = Number(career && career.age) || 22;
    if (age <= 20) return 1.18;
    if (age <= 22) return 1.14;
    if (age <= 24) return 1.08;
    if (age <= 26) return 1.02;
    if (age <= 30) return 0.94;
    if (age <= 33) return 0.78;
    if (age <= 36) return 0.58;
    return 0.38;
  }

  function per36(l, key, min) {
    return (Number(l && l[key]) || 0) * 36 / Math.max(6, min);
  }

  function efficiencyMult(l, min) {
    // 先换算成每 36 分钟，避免“替补时间少 → 永远长不动”。
    // 效率只给温和加成，真正的机会差距仍由实际数据体现。
    const score = per36(l, 'pts', min) * 1.0 +
      per36(l, 'reb', min) * 1.15 +
      per36(l, 'ast', min) * 1.35 +
      (per36(l, 'stl', min) + per36(l, 'blk', min)) * 1.8;
    return Math.max(0.84, Math.min(1.35, 0.90 + (score - 35) * 0.012));
  }

  function maybeBreakthrough(g, l, min, eff) {
    if (!career || career.retired) return;
    const candidates = ATTR_KEYS.filter(k => (Number(career.attrs[k]) || 0) >= 99 && potentialFor(k) >= 95 && (career.playerId !== 'custom' || !career.__arch || (Number(career.attrs[k]) || 0) < hardCapFor(career)));
    if (!candidates.length) return;
    const perf = Math.max(0.5, Math.min(1.8, eff * (g.win ? 1.08 : 1) * (min / 30)));
    // 每个 99 属性、每场约 0.08% × 表现系数；真正的“生涯之夜”才会发生。
    if (Math.random() > 0.0008 * perf) return;
    const k = candidates[Math.floor(Math.random() * candidates.length)];
    const before = Number(career.attrs[k]) || 99;
    if (before >= 110) return;
    career.attrs[k] = before + 1;
    career.feed = career.feed || [];
    const text = '极稀有突破：' + ATTR_NAMES[k] + ' 从 ' + before + ' 突破到 ' + career.attrs[k] + '。这样的夜晚不会经常出现。';
    career.feed.unshift(text);
    if (window.__wireLog) window.__wireLog('attr', window.__wireName() + ' · ' + text);
    try { syncOvr(); } catch (e) {}
  }

  function matchGrowth(g) {
    if (!career || career.retired) return;
    ensureGrowth(career);
    ensureHonorSnapshot();
    if (!g || g.played === false || !g.line) {
      // 伤停/未出场：只保留很小的战术学习，仍按同一套固定概率判断是否落点。
      const idle = 0.18 * ageGrowthMult() * MATCH_XP_SCALE;
      gainXp('mentality', 2.0 * learnRate('mentality') * idle);
      gainXp('durability', 1.2 * learnRate('durability') * idle);
      trySeasonGrowth();
      return;
    }
    const l = g.line;
    const min = Math.max(6, Number(l.min) || Number(career.minutes) || 20);
    const eff = efficiencyMult(l, min);
    const age = ageGrowthMult();
    const win = g.win ? 1.06 : 0.97;
    const opp = opportunityMult(min);
    const scale = MATCH_XP_SCALE * eff * age * win * opp;

    // 实际数据已经包含出场时间；per-36 效率在上面的 eff 里单独修正。
    // 这样 15 分钟的高效替补能拿到“效率认可”，但仍受实际机会限制。
    const pool = {
      finishing: (l.pts || 0) * 1.1,
      shooting: (l.pts || 0) * 0.9,
      rebounding: (l.reb || 0) * 2.2,
      playmaking: (l.ast || 0) * 2.6,
      defense: ((l.stl || 0) * 4 + (l.blk || 0) * 3),
      steals: (l.stl || 0) * 4.5,
      blocks: (l.blk || 0) * 3.5,
      strength: (l.reb || 0) * 0.9 + (l.pts || 0) * 0.15,
      athleticism: (l.pts || 0) * 0.35,
      durability: 8, mentality: 7 + (g.win ? 2 : 0)
    };
    ATTR_KEYS.forEach(k => {
      gainXp(k, (pool[k] || 0) * learnRate(k) * scale);
    });
    const gains = trySeasonGrowth() || [];
    const grew = gains.map(x => ATTR_NAMES[x.k] + (x.to - x.from > 1 ? '+' + (x.to - x.from) : ''));
    // 记录本场成长，供球员页/赛季总结解释“为什么涨/为什么不涨”。
    career.lastGrowth = {
      min: Math.round(min), eff: Math.round(eff * 100) / 100,
      opp: Math.round(opp * 100) / 100, age: Math.round(age * 100) / 100, win: !!g.win,
      labels: grew.slice(), chance: growthChance(), used: career.growthUsed || 0
    };
    maybeBreakthrough(g, l, min, eff);
    if (grew.length) career.feed && career.feed.unshift && career.feed.unshift('技术成长：' + grew.join('、') + '。');
    if (window.__wireLog) {
      let hi = '';
      if ((l.pts || 0) >= 30) hi = '单场 ' + l.pts + ' 分，进攻端打疯了';
      else if ((l.pts || 0) >= 20) hi = '单场 ' + l.pts + ' 分，成为主要火力点';
      else if ((l.reb || 0) >= 15) hi = '单场 ' + l.reb + ' 个篮板，统治禁区';
      else if ((l.ast || 0) >= 12) hi = '单场 ' + l.ast + ' 次助攻，串联全队';
      else if (((l.stl || 0) + (l.blk || 0)) >= 6) hi = '防守端存在感拉满';
      if (hi) window.__wireLog('game', window.__wireName() + ' · ' + hi);
    }
  }

  /* ---------- 角色与出场时间：OVR + 球队需求 + 教练信任 ----------
     同样评分的人，在缺人的弱队会被推上更重要的位置；
     在强队则要跟更多高评分队友分球权。球队影响保持“中等”，不压过 OVR。 */
  function teamNeedFactor(myOvr) {
    let power = 80;
    try { power = Number(teamBy(career.team).power) || 80; } catch (e) {}
    let mates = [];
    try {
      const L = career.v32League;
      if (L && Array.isArray(L.players)) {
        const myName = String(career.playerName || (window.__wireName && window.__wireName()) || '');
        mates = L.players.filter(p => {
          if (!p || p.team !== career.team) return false;
          if (p.self || p.id === 'custom' || p.id === career.playerId) return false;
          const n = String(p.zh || p.name || '');
          return !myName || n !== myName;
        });
      }
    } catch (e) {}
    const top = mates.map(p => Number(p.ovr) || 70).sort((a, b) => b - a).slice(0, 5);
    let need = 0;
    if (power < 78) need += 0.55;
    else if (power < 83) need += 0.25;
    else if (power >= 89) need -= 0.30;
    if (top.length) {
      const avgTop = top.reduce((a, b) => a + b, 0) / top.length;
      need += Math.max(-0.35, Math.min(0.45, (myOvr - avgTop) / 18));
      const better = top.filter(o => o > myOvr + 1).length;
      need += better === 0 ? 0.55 : better === 1 ? 0.22 : better === 2 ? -0.05 : -0.28;
    } else {
      // 没有完整联盟名单时，用球队评分做保守估计。
      need += myOvr >= power ? 0.35 : -0.15;
    }
    return Math.max(-1, Math.min(1, need));
  }

  function applyCustomRole() {
    if (!career || career.playerId !== 'custom') return;
    const ovr = Number(career.ovr) || 70;
    const trust = Number(career.trust) || 50;
    const need = teamNeedFactor(ovr);
    const trustAdj = Math.max(-1, Math.min(1, (trust - 50) / 45));
    const score = ovr + need * 2.4 + trustAdj * 1.6;
    const role = roleByOvr(clamp(score, 50, 99));
    const trustBonus = trust >= 80 ? 2 : trust >= 65 ? 1 : trust < 35 ? -2 : trust < 45 ? -1 : 0;
    let minutes = minutesByRole(role) + trustBonus + (hasTalent('core') ? 2 : 0);
    // 新秀季先保护：不因球队需求直接给到 35 分钟。
    if ((Number(career.seasonNo) || 1) === 1) minutes = Math.min(minutes, 32);
    career.role = role;
    career.minutes = Math.min(career.minutesLimit || 99, clamp(minutes, 10, 37));
    career.roleScore = Math.round(score * 10) / 10;
    career.teamNeed = Math.round(need * 100) / 100;
  }

  try {
    const __gOldSyncOvr = syncOvr;
    syncOvr = function () {
      const r = __gOldSyncOvr.apply(this, arguments);
      try { applyCustomRole(); } catch (e) {}
      return r;
    };
    if (typeof window !== 'undefined') window.syncOvr = syncOvr;
  } catch (e) {}

  /* ---------- 生涯播报（自建球员的动态消息流） ---------- */
  window.__wireName = function () {
    try {
      const p = (typeof currentP === 'function') ? currentP() : null;
      return (p && (p.zh || p.name)) || (career && career.name) || '自建球员';
    } catch (e) { return '自建球员'; }
  };
  window.__wireLog = function (kind, text) {
    if (!career) return;
    if (!Array.isArray(career.wire)) career.wire = [];
    career.logSeq = (Number(career.logSeq) || 0) + 1;
    career.wire.unshift({
      kind: kind || 'info',
      text: String(text || ''),
      season: career.seasonNo || 1,
      year: career.seasonYear || 0,
      g: career.games || 0,
      stage: career.stage || '',
      seq: career.logSeq
    });
    if (career.wire.length > 80) career.wire.length = 80;
    if (window.__hookFeed) { try { window.__hookFeed(); } catch (e) {} }
  };

  function gainXp(k, amount) {
    ensureGrowth(career);
    const val = career.attrs[k];
    const top = hardFor(k);
    if (val >= top) { career.skillXp[k] = 0; return; }
    // 只累积「成长倾向」；真正 +1 由每场固定概率触发。
    // 上限 1.5 倍阈值，避免单项长期囤积后吃掉所有成长点。
    const capXp = threshold(val) * 1.5;
    career.skillXp[k] = Math.min(capXp, (career.skillXp[k] || 0) + amount);
  }

  /* ---------- 每场成长概率 ----------
     不再设「每季固定几点」的预算，也不使用动态概率。
     每场比赛结束后按固定公式掷一次成长机会；长期平均接近原版每季 5–7 点：
       · 基础 6.8% / 场（82 场期望约 5.6 点）；
       · 年轻、出场时间多 → 略高；31 岁后逐年下降；
       · 具体涨哪一项仍由 XP 成长倾向 + 已投入专精决定。 */
  const GROWTH_CHANCE_BASE = 0.068;

  function growthChance() {
    if (!career) return 0;
    const age = Number(career.age) || 22;
    let p = GROWTH_CHANCE_BASE;
    if (age <= 20) p *= 1.15;
    else if (age <= 22) p *= 1.10;
    else if (age <= 24) p *= 1.05;
    else if (age <= 27) p *= 1.00;
    else if (age <= 30) p *= 0.92;
    else if (age <= 33) p *= 0.72;
    else if (age <= 36) p *= 0.52;
    else p *= 0.35;
    try {
      if (career.playerId === 'custom' && career.__arch) {
        const meta = (window.__ARCHETYPES__ && window.__ARCHETYPES__[career.__arch.key]) || {};
        const front = Number(career.__arch.front) || Number(meta.front) || 1;
        const slope = Number(career.__arch.slope) || Number(meta.slope) || 1.8;
        const cap = Number(career.__arch.cap) || Number(meta.cap) || 92;
        /* 模板只影响成长曲线和早晚熟；所有模板的硬上限统一为 110。 */
        const capBoost = cap >= 97 ? 2.3 : cap >= 93 ? 2.0 : cap >= 88 ? 1.7 : cap >= 84 ? 1.4 : 1.2;
        p *= capBoost;
        if (age <= 23) p *= Math.max(0.90, Math.min(1.12, 0.82 + front * 0.18));
        else if (age >= 27) p *= Math.max(0.72, Math.min(1.08, 1 - (slope - 1.5) * 0.08));
      }
    } catch (e) {}
    const min = Math.max(6, Number(career.minutes) || 20);
    p *= Math.max(0.75, Math.min(1.15, 0.75 + min / 100));
    const capChance = (career.playerId === 'custom' && career.__arch) ? 0.22 : 0.14;
    return Math.max(0.015, Math.min(capChance, p));
  }

  function ensureSeasonGrowth(c) {
    if (!c) return;
    const season = Number(c.seasonNo) || 1;
    if (c.growthSeason !== season) {
      c.growthSeason = season;
      c.growthUsed = 0;
      c.growthLog = [];
    }
    if (typeof c.growthUsed !== 'number') c.growthUsed = 0;
    if (!Array.isArray(c.growthLog)) c.growthLog = [];
    // 清掉旧版赛季预算字段，避免旧档继续显示/参与计算。
    try { delete c.growthBudget; } catch (e) { c.growthBudget = undefined; }
  }

  function growthWeight(k) {
    const val = Number(career.attrs[k]) || 0;
    const th = threshold(val);
    const xp = Number(career.skillXp[k]) || 0;
    const focus = Number(career.focus && career.focus[k]) || 0;
    // 比赛经验是主权重；已投入专精给一点额外倾斜。
    return xp / th + focus * 0.015;
  }

  function pickGrowthAttr() {
    let best = null, bestScore = 0;
    ATTR_KEYS.forEach(k => {
      const val = Number(career.attrs[k]) || 0;
      if (val >= hardFor(k)) return;
      /* dynCap 现在统一为 110；只有硬上限会停止常规成长。 */
      if (career.playerId === 'custom' && career.__arch && val >= dynCapFor(career, k)) return;
      const s = growthWeight(k);
      if (s > bestScore) { bestScore = s; best = k; }
    });
    return best;
  }

  function grantGrowthPoint(k, reason) {
    if (!career || !k) return null;
    const before = Number(career.attrs[k]) || 0;
    if (before >= hardFor(k)) return null;
    if (career.playerId === 'custom' && career.__arch && before >= dynCapFor(career, k)) return null;
    career.attrs[k] = before + 1;
    const th = threshold(before);
    career.skillXp[k] = Math.max(0, (Number(career.skillXp[k]) || 0) - th);
    career.growthUsed = (Number(career.growthUsed) || 0) + 1;
    career.growthLog = career.growthLog || [];
    career.growthLog.push({
      season: career.seasonNo, game: career.games,
      k: k, from: before, to: career.attrs[k], reason: reason || 'match'
    });
    if (career.growthLog.length > 120) career.growthLog = career.growthLog.slice(-120);
    try { syncOvr(); } catch (e) {}
    if (window.__wireLog) {
      window.__wireLog('attr', window.__wireName() + ' · ' + ATTR_NAMES[k] + ' +1，现能力 ' + career.attrs[k] + ' / ' + MAX_ATTR + '（潜力 ' + potentialFor(k) + '）');
    }
    return { k: k, from: before, to: career.attrs[k] };
  }

  function trySeasonGrowth() {
    if (!career || career.retired) return null;
    ensureGrowth(career);
    ensureSeasonGrowth(career);
    // 固定概率：不随剩余场次变化，也没有赛季总量上限。
    if (Math.random() >= growthChance()) return null;
    const k = pickGrowthAttr();
    if (!k) return null;
    const gain = grantGrowthPoint(k, 'match');
    return gain ? [gain] : null;
  }

  function settleSeasonGrowth() {
    // 赛季末不再强制补齐任何预算；成长只由每场概率决定。
    return [];
  }

  /* ---------- 专精操作 ---------- */
  function ensurePotentialCaps() {
    if (!career) return;
    if (!career.potentialCaps) career.potentialCaps = {};
    const hard = (career.playerId === 'custom' && career.__arch) ? hardCapFor(career) : POT_MAX;
    ATTR_KEYS.forEach(k => {
      if (typeof career.potentialCaps[k] !== 'number') {
        career.potentialCaps[k] = Math.max(Number(career.attrs && career.attrs[k]) || 0, Math.min(hard, potentialFor(k)));
      }
    });
  }

  function addFocus(k) {
    ensureGrowth(career);
    if (career.focusPts <= 0) return notify('没有剩余专精点了');
    ensurePotentialCaps();
    const customArch = career.playerId === 'custom' && career.__arch;
    const hard = customArch ? hardCapFor(career) : POT_MAX;
    const pot = potentialFor(k);
    const dyn = customArch ? dynCapFor(career, k) : hard;
    if (pot >= hard && dyn >= hard) return notify(ATTR_NAMES[k] + ' 已经到硬上限 110');
    career.focus[k] = (career.focus[k] || 0) + 1;
    career.potentialCaps[k] = Math.min(hard, POT_MAX, pot + 1);
    if (customArch) {
      career.dynCap[k] = Math.min(hard, Math.max(Number(career.attrs[k]) || 0, dyn + CAP_STEP));
    }
    career.focusPts--;
    const t = tierInfo(k);
    notify(ATTR_NAMES[k] + ' 潜力 ' + pot + ' → ' + career.potentialCaps[k] + '（学习效率 ' + t.pct + '%）');
    save(); render();
  }
  function removeFocus(k) {
    ensureGrowth(career);
    const locked = lockedOf(k);
    if (career.focus[k] <= locked) return notify('已确认的专精不能撤回');
    ensurePotentialCaps();
    career.focus[k]--;
    career.focusPts++;
    const customArch = career.playerId === 'custom' && career.__arch;
    career.potentialCaps[k] = Math.max(40, (Number(career.potentialCaps[k]) || potentialFor(k)) - 1);
    if (customArch) {
      const hard = hardCapFor(career);
      career.dynCap[k] = Math.min(hard, Math.max(Number(career.attrs[k]) || 0, (Number(career.dynCap[k]) || 0) - CAP_STEP));
    }
    const t = tierInfo(k);
    notify(ATTR_NAMES[k] + ' 潜力已撤回 1 点（当前学习效率 ' + t.pct + '%）');
    save(); render();
  }

  /* ---------- 完成分配（确认后不可撤回） ---------- */
  let confirmOpen = false;

  function askConfirm() {
    /* 不再二次确认：点「完成分配」直接锁定本季专精。 */
    return confirmAlloc();
  }
  function cancelConfirm() {
    confirmOpen = false;
    render();
  }
  function confirmAlloc() {
    ensureGrowth(career);
    if (career.focusPts > 0 && hasSpendablePoint()) {
      confirmOpen = false;
      notify('还有 ' + career.focusPts + ' 点专精未分配，先全部分配完');
      return render();
    }
    const pending = pendingFocus();
    if (pending <= 0) {
      confirmOpen = false;
      notify('没有新的专精分配需要确认');
      return render();
    }
    ATTR_KEYS.forEach(k => { career.focusLocked[k] = career.focus[k] || 0; });
    career.focusConfirmedSeason = career.seasonNo || 1;
    confirmOpen = false;
    notify('专精分配已确认 · 本季不可撤回');
    save(); render();
  }

  /* ---------- 面板 UI ---------- */
  const PANEL_CSS = `
<style id="focus-css">
#focus-fab{position:fixed;right:14px;bottom:88px;z-index:99900;width:52px;height:52px;border-radius:50%;border:1px solid #ffd23f55;background:#1c2129ee;color:#ffd23f;font-size:11px;font-weight:700;cursor:pointer;backdrop-filter:blur(4px);line-height:1.15;padding:0;box-shadow:0 4px 14px #00000055}
#focus-fab:active{transform:scale(.94)}
#focus-panel{position:fixed;inset:0;z-index:99901;background:#0a0c0fcc;display:flex;align-items:flex-end;justify-content:center}
#focus-panel .fp-sheet{width:min(100%,560px);max-height:86vh;overflow-y:auto;background:#181c23;border-radius:18px 18px 0 0;padding:18px 16px 26px;color:#e8ecf1;border-top:1px solid #2f3742}
#focus-panel .fp-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
#focus-panel .fp-head small{display:block;color:#4d8dff;letter-spacing:2px;font-weight:700}
#focus-panel .fp-head b{display:block;font-size:17px;color:#ffffff;margin-top:2px}
#focus-panel .fp-close{background:none;border:0;color:#9aa3b2;font-size:22px;cursor:pointer;padding:4px 8px}
#focus-panel .fp-note{font-size:11px;color:#9aa3b2;line-height:1.7;margin:0 0 12px}
#focus-panel .fp-pts{font-size:12px;color:#9aa3b2;margin:0 0 14px}
#focus-panel .fp-pts b{color:#ffd23f;font-size:16px;margin:0 2px}
#focus-panel .sk{margin-bottom:13px}
#focus-panel .sk-top{display:flex;align-items:baseline;gap:8px;margin-bottom:5px}
#focus-panel .sk-top .n{font-size:14px;font-weight:700;color:#ffffff;min-width:30px}
#focus-panel .sk-top .fx{font-size:10px;color:#4d8dff;font-weight:700;letter-spacing:1px}
#focus-panel .sk-top .fx .fd{color:#ffd23f;letter-spacing:0;margin-right:2px}
#focus-panel .sk-top .xp{flex:1;text-align:right;font-size:10px;color:#9aa3b2}
#focus-panel .sk-top .v{font-size:19px;font-weight:800;color:#ffffff;min-width:64px;text-align:right;white-space:nowrap}
#focus-panel .sk-top .v .cap{font-size:11px;color:#9aa3b2;font-weight:600}
#focus-panel .sk-track{position:relative;height:16px;border-radius:9px;background:#212730;border:1px solid #2f3742;overflow:hidden}
#focus-panel .sk-track .notch{position:absolute;top:0;bottom:0;width:1px;background:#181c23;z-index:1}
#focus-panel .sk-track .fill{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#2d5be3cc,#4d8dff);z-index:2;transition:width .3s}
#focus-panel .sk-track .ovf{position:absolute;top:0;bottom:0;background:#ffd23f;z-index:3;opacity:.9}
#focus-panel .sk-track .capmark{position:absolute;top:-2px;bottom:-2px;width:3px;background:#ff5a5f;border-radius:2px;z-index:4;box-shadow:0 0 6px #ff5a5f88}
#focus-panel .sk-track.maxed .fill{background:linear-gradient(90deg,#ff5a5f,#ff8a6a)}
#focus-panel .sk-bot{display:flex;align-items:center;justify-content:space-between;margin-top:5px}
#focus-panel .sk-bot .pct{font-size:9.5px;color:#9aa3b2}
#focus-panel .sk-bot .btns{display:flex;gap:6px}
#focus-panel .sk-bot button{min-width:56px;height:26px;border-radius:13px;border:1px solid #2f3742;background:#212730;color:#e8ecf1;font-size:11px;cursor:pointer;padding:0 10px}
#focus-panel .sk-bot button:not(:disabled):hover{border-color:#ffd23f}
#focus-panel .sk-bot button:disabled{opacity:.3;cursor:default}
#focus-panel .sk-bot button.on{border-color:#ffd23f88;color:#ffd23f}
.fp-ad{margin:12px 0;padding:12px 13px;border-radius:15px;background:linear-gradient(135deg,rgba(255,210,63,.10),rgba(28,33,41,.94));border:1px solid rgba(255,210,63,.24)}
.fp-ad header{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap}
.fp-ad header b{color:#ffffff;font-size:12.5px}
.fp-ad header span{color:#ffd23f;font-size:9.5px;font-weight:900}
.fp-ad p{margin:5px 0 8px;color:#9aa3b2;font-size:10.5px;line-height:1.6}
.fp-ad button{width:100%;height:38px;border:0;border-radius:12px;background:linear-gradient(135deg,#ffd23f,#f0a92e);color:#101318;font-size:11.5px;font-weight:900;cursor:pointer}
.fp-ad button:disabled{opacity:.45;cursor:default}
</style>`;

  // 面板 CSS 在模块初始化时就注入，保证右下角「专精面板」按钮在首次打开面板前也是深色样式
  try { if (!document.getElementById('focus-css')) document.head.insertAdjacentHTML('beforeend', PANEL_CSS); } catch (e) {}

  let panelOpen = false;

  /* 技能行：蓝条 = 能力 / 原版上限；黄条 = 原版潜力上限 */
  function focusRows() {
    ensureGrowth(career);
    return ATTR_KEYS.map(k => {
      const val = career.attrs[k];
      const customArch = career.playerId === 'custom' && career.__arch;
      const hard = customArch ? Math.max(hardCapFor(career), val) : hardFor(k);
      const pot = Math.min(potentialFor(k), hard);
      const dyn = customArch ? dynCapFor(career, k) : hard;
      const focusMaxed = customArch ? (pot >= hard && dyn >= hard) : pot >= POT_MAX;
      const th = threshold(val);
      const xp = career.skillXp[k] || 0;
      const pctXp = Math.min(100, Math.round(xp / th * 100));
      const f = career.focus[k] || 0;
      const locked = lockedOf(k);
      const canMinus = f > locked;
      const tier = tierInfo(k);
      const fillWn = Math.min(100, val / hard * 100);
      const potWn = Math.min(100, pot / hard * 100);
      const fillW = fillWn.toFixed(2);
      const potW = potWn.toFixed(2);
      const roomW = Math.max(0, potWn - fillWn).toFixed(2);
      const over = val > pot;
      return `<div class="sk">
<div class="sk-top"><span class="n">${ATTR_NAMES[k]}</span><span class="fx">${f ? '<span class="fd">潜力 +' + f + '</span>' : ''}×${rateMult(tier.pct)}</span><span class="xp">成长倾向 ${pctXp}%</span><span class="v"><b class="cur">${val}</b><span class="sep">/</span><em class="potv">${pot}</em><span class="cap">/ ${hard}</span></span></div>
<div class="sk-track ${over ? 'over' : ''}"><i class="room" style="left:${fillW}%;width:${roomW}%"></i><i class="fill" style="width:${fillW}%"></i><i class="pot" style="left:${potW}%"></i></div>
<div class="sk-bot"><span class="pct">${tier.label}（学习效率 ${tier.pct}%） · 潜力 ${pot}${over ? ' · 超出 ' + tier.over : ' · 距潜力 ' + tier.gap}${customArch ? ' · 成长上限 ' + dyn : ''} · 已投入 ${f} 点 · 硬上限 ${hard}</span><span class="btns"><button onclick="__GROWTH__.minus('${k}')" ${canMinus ? '' : 'disabled'}>− 专精</button><button onclick="__GROWTH__.plus('${k}')" class="${f > 0 ? 'on' : ''}" ${career.focusPts <= 0 || focusMaxed ? 'disabled' : ''}>+ 专精</button></span></div>
</div>`;
    }).join('');
  }

  function adPointsHTML() {
    try {
      if (!career || typeof window.v63AdLeft !== 'function' || typeof window.v63WatchAdForPoints !== 'function') return '';
      var left = Number(window.v63AdLeft()) || 0;
      var used = (typeof window.v63AdSeen === 'function') ? Number(window.v63AdSeen()) || 0 : 0;
      var limit = 3;
      var points = 5;
      return '<section class="fp-ad">'
        + '<header><b>需要更多专精点？</b><span>看奖励视频 · +' + points + ' 专精点</span></header>'
        + '<p>本赛季还可看 ' + left + ' 次（已看 ' + used + '/' + limit + '）。奖励直接加入当前专精点。</p>'
        + '<button onclick="v63WatchAdForPoints()"' + (left <= 0 ? ' disabled' : '') + '>'
        + (left > 0 ? '🎬 看奖励视频 · 获得 ' + points + ' 个专精点' : '本赛季次数已用完')
        + '</button></section>';
    } catch (e) { return ''; }
  }

  /* 广告现在直接发专精点：不再经过训练点，也不再做 2:1 换算。 */
  let focusAdBusy = false;
  const __gFocusAdWatch = async function () {
    try {
      if (!career || focusAdBusy) return false;
      if (typeof window.v63AdLeft !== 'function') return false;
      if (Number(window.v63AdLeft()) <= 0) {
        notify('本赛季看广告得专精点的次数已用完');
        return false;
      }
      if (typeof rewardAd === 'undefined' || !rewardAd || typeof rewardAd.request !== 'function') {
        notify('广告组件未就绪');
        return false;
      }
      focusAdBusy = true;
      const owner = career, season = career.seasonNo, year = career.seasonYear;
      try {
        const rewarded = await rewardAd.request('dev_points');
        if (!(rewarded === true || (rewarded && rewarded.success === true))) {
          notify('广告未完成，未发放专精点');
          return false;
        }
        if (career !== owner || owner.seasonNo !== season || owner.seasonYear !== year) {
          notify('生涯或赛季已变化，本次奖励未计入其他存档');
          return false;
        }
        career.v63AdCount = (typeof window.v63AdSeen === 'function' ? Number(window.v63AdSeen()) || 0 : Number(career.v63AdCount) || 0) + 1;
        career.focusPts = (Number(career.focusPts) || 0) + 5;
        career.feed = career.feed || [];
        career.feed.unshift('奖励视频：获得 5 个专精点（本赛季第 ' + career.v63AdCount + '/3 次）。');
        save();
        render();
        notify('已获得 5 个专精点 · 本赛季还剩 ' + Math.max(0, 3 - career.v63AdCount) + ' 次');
        return true;
      } catch (e) {
        const msg = String((e && e.message) || e || '');
        notify(msg === 'AD_NOT_REWARDED' ? '广告未完成，未发放专精点' : (msg || '广告暂时未完成，请稍后重试'));
        return false;
      } finally {
        focusAdBusy = false;
      }
    } catch (e) {
      focusAdBusy = false;
      return false;
    }
  };
  window.v63WatchAdForPoints = __gFocusAdWatch;
  try { v63WatchAdForPoints = __gFocusAdWatch; } catch (e) {}

  function renderFocusPage() {
    ensureGrowth(career);
    ensureSeasonGrowth(career);
    const focused = ATTR_KEYS.reduce((a, k) => a + (career.focus[k] || 0), 0);
    const locked = ATTR_KEYS.reduce((a, k) => a + lockedOf(k), 0);
    const pending = pendingFocus();
    const canDone = (career.focusPts <= 0 || !hasSpendablePoint()) && pending > 0;
    let hint;
    if (career.focusPts > 0 && hasSpendablePoint()) hint = '还有 ' + career.focusPts + ' 点未分配，分配完才能完成本季专精。';
    else if (career.focusPts > 0 && !hasSpendablePoint()) hint = '所有潜力已到硬上限 ' + POT_MAX + '，剩余 ' + career.focusPts + ' 点专精已无法使用；确认已投入的点即可进入下一赛季。';
    else if (pending > 0) hint = '本次已投入 ' + pending + ' 点，点击「完成分配」后本季锁定。';
    else if (locked > 0) hint = '本季专精已确认，不能撤回。下赛季结束后会发放新的专精点。';
    else hint = '本赛季还没有分配专精点。';
    const confirmPanel = '';
    const lg = career.lastGrowth;
    const lastLine = lg ? `<p class="fp-last">上一场成长结算：${lg.min} 分钟 · 每 36 分钟效率 ${lg.eff.toFixed(2)} · 机会系数 ${(lg.opp || 1).toFixed(2)} · 年龄系数 ${lg.age.toFixed(2)} · ${lg.win ? '胜' : '负'}${lg.labels && lg.labels.length ? ' · ' + lg.labels.join('、') : ''}</p>` : '';
    return `<section class="focus-page">
<div class="fp-page-head"><div><h2>技能 · 专精</h2></div><span class="fp-badge">剩余专精点<b>${career.focusPts}</b>${pending ? '<em>本次投入 ' + pending + ' 点</em>' : ''}</span></div>
${lastLine}
${adPointsHTML()}
<div class="fp-legend"><span><i class="lg-fill"></i>当前能力</span><span><i class="lg-pot"></i>潜力黄条</span><span>已投入 ${focused} 点</span><span>已锁定 ${locked} 点</span><span>本次投入 ${pending} 点</span></div>
<div class="fp-list">${focusRows()}</div>
${confirmPanel}
<div class="fp-actions">
<button class="fp-reset" onclick="__GROWTH__.resetAll()" ${pending > 0 ? '' : 'disabled'}>↺ 撤销本次未确认</button>
<button class="fp-done ${canDone ? 'on' : ''}" onclick="__GROWTH__.confirmAlloc()" ${canDone ? '' : 'disabled'}>完成分配</button>
</div>
<div class="fp-hint">${hint}</div>
</section>`;
  }
  window.__GROWTH_PAGE__ = renderFocusPage;

  const PAGE_CSS = `
.focus-page{background:#181c23;border:1px solid #2f3742;border-radius:20px;padding:18px 16px 22px;color:#e8ecf1}
.focus-page .fp-page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:10px}
.focus-page .fp-page-head .kicker{display:block;color:#4d8dff;letter-spacing:2px;font-size:9px;font-weight:700}
.focus-page .fp-page-head h2{color:#ffffff;font-size:22px;margin:4px 0 0}
.focus-page .fp-badge{background:#212730;border:1px solid #2f3742;border-radius:12px;padding:8px 11px;font-size:10px;color:#9aa3b2;flex:none;white-space:nowrap}
.focus-page .fp-badge b{color:#ffd23f;font-size:16px;margin-left:5px}
.focus-page .fp-note{font-size:11px;color:#9aa3b2;line-height:1.75;margin:12px 0 6px}
.focus-page .fp-note .gold{color:#ffd23f}
.focus-page .fp-last{font-size:9.5px;line-height:1.6;color:#c9d1dc;background:#212730;border:1px solid #2f3742;border-radius:10px;padding:7px 9px;margin:8px 0 2px}
.focus-page .fp-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:9.5px;color:#9aa3b2;margin:4px 0 2px}
.focus-page .fp-legend span{display:flex;align-items:center;gap:5px}
.focus-page .fp-legend i{display:inline-block;width:10px;height:4px;border-radius:2px}
.focus-page .lg-fill{background:#4d8dff}
.focus-page .lg-pot{background:#ffd23f;width:3px!important;height:12px!important}
.focus-page .sk{margin-top:14px}
.focus-page .sk-top{display:flex;align-items:baseline;gap:8px;margin-bottom:5px}
.focus-page .sk-top .n{font-size:14px;font-weight:700;color:#ffffff;min-width:30px}
.focus-page .sk-top .fx{font-size:10px;color:#4d8dff;font-weight:700;letter-spacing:1px}
.focus-page .sk-top .fx .fd{color:#ffd23f;letter-spacing:0;margin-right:2px}
.focus-page .sk-top .xp{flex:1;text-align:right;font-size:10px;color:#9aa3b2}
.focus-page .sk-top .v{font-size:19px;font-weight:800;color:#ffffff;min-width:104px;text-align:right;white-space:nowrap;display:flex;align-items:baseline;justify-content:flex-end;gap:3px}
.focus-page .sk-top .v .cur{color:#4d8dff!important;font-size:19px}
.focus-page .sk-top .v .sep{color:#5b6573!important;font-size:12px;font-weight:600}
.focus-page .sk-top .v .potv{color:#ffd23f!important;font-size:16px;font-style:normal}
.focus-page .sk-top .v .cap{font-size:11px;color:#9aa3b2!important;font-weight:600}
.focus-page .sk-track{position:relative;height:16px;border-radius:9px;background:#212730;border:1px solid #2f3742;overflow:hidden}
.focus-page .sk-track .room{position:absolute;top:0;bottom:0;background:rgba(255,210,63,.22);z-index:1}
.focus-page .sk-track .fill{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#2d5be3cc,#4d8dff);z-index:2;transition:width .3s}
.focus-page .sk-track .pot{position:absolute;top:-3px;bottom:-3px;width:3px;background:#ffd23f;border-radius:2px;z-index:4;box-shadow:0 0 6px #ffd23f99}
.focus-page .sk-track.over .fill{background:linear-gradient(90deg,#2d5be3cc,#ffd23f)}
.focus-page .sk-bot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:6px}
.focus-page .sk-bot .pct{font-size:9.5px;color:#9aa3b2;line-height:1.5}
.focus-page .sk-bot .btns{display:flex;gap:6px;flex:none}
.focus-page .sk-bot button{min-width:56px;height:26px;border-radius:13px;border:1px solid #2f3742;background:#212730;color:#e8ecf1;font-size:11px;cursor:pointer;padding:0 10px}
.focus-page .sk-bot button:not(:disabled):hover{border-color:#ffd23f}
.focus-page .sk-bot button:disabled{opacity:.3;cursor:default}
.focus-page .sk-bot button.on{border-color:#ffd23f88;color:#ffd23f}
.focus-page .fp-badge em{display:block;margin-top:4px;font-style:normal;font-size:9px;color:#ffd23f;letter-spacing:.5px;text-align:right}
.focus-page .fp-rule{margin-top:2px;padding-top:8px;border-top:1px dashed #2f3742}
.focus-page .fp-actions{margin-top:18px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.focus-page .fp-actions button{height:36px;padding:0 16px;border-radius:18px;border:1px solid #2f3742;background:transparent;color:#9aa3b2;font-size:11px;cursor:pointer}
.focus-page .fp-actions button:disabled{opacity:.32;cursor:default}
.focus-page .fp-actions .fp-reset:not(:disabled){border-color:#d6454188;color:#d69a45}
.focus-page .fp-actions .fp-done{background:#ffd23f;border-color:#ffd23f;color:#101318;font-weight:900}
.focus-page .fp-actions .fp-done:not(.on){background:#212730;border-color:#2f3742;color:#6b7484;font-weight:700}
.focus-page .fp-actions .fp-done.on:hover{background:#ffe066}
.focus-page .fp-hint{margin-top:9px;text-align:center;font-size:9.5px;line-height:1.6;color:#9aa3b2}
.focus-page .fp-confirm{margin-top:14px;padding:13px 14px;border-radius:16px;background:#241a1c;border:1px solid #d6454166}
.focus-page .fp-confirm b{display:block;color:#ffffff;font-size:13px}
.focus-page .fp-confirm p{margin:6px 0 10px;color:#d6dbe3;font-size:10.5px;line-height:1.7}
.focus-page .fp-confirm-actions{display:flex;gap:8px}
.focus-page .fp-confirm-actions button{flex:1;height:34px;border-radius:16px;border:1px solid #2f3742;background:#212730;color:#e8ecf1;font-size:11px;cursor:pointer}
.focus-page .fp-confirm-actions .ok{background:#ff5a5f;border-color:#ff5a5f;color:#ffffff;font-weight:900}
@media(max-width:420px){.focus-page{padding:16px 12px 18px}.focus-page .sk-bot{flex-direction:column;align-items:flex-start}.focus-page .sk-bot .btns{width:100%}.focus-page .sk-bot button{flex:1}}
`;
  try {
    if (!document.getElementById('focus-page-css')) {
      const st = document.createElement('style'); st.id = 'focus-page-css'; st.textContent = PAGE_CSS;
      document.head.appendChild(st);
    }
  } catch (e) {}

  function openPanel() { try { ui.tab = 'player'; render(); } catch (e) {} }
  function closePanel() { try { if (ui.tab === 'player') { ui.tab = 'season'; render(); } } catch (e) {} }
  function refreshPanel() { /* 独立页面模式，渲染时整页刷新 */ }

  /* ---------- 挂载：悬浮按钮（仅 career 屏且非退役） ---------- */
  function ensureFab() {
    const has = document.getElementById('focus-fab');
    const inCareer = career && !career.retired && (ui.screen === 'career');
    if (inCareer && !has) {
      document.body.insertAdjacentHTML('beforeend', `<button id="focus-fab" onclick="__GROWTH__.open()">专精<br>面板</button>`);
    } else if (!inCareer && has) {
      has.remove();
      closePanel();
    }
  }

  /* ---------- 引擎接管（直接赋值词法绑定） ---------- */

  // 1. render 包装：追加 FAB 与面板刷新（FAB 由 156 隐藏，成长页挂在球员页）
  const __gOldRender = render;
  render = function () {
    const r = __gOldRender.apply(this, arguments);
    try {
      if (career && !career.retired) ensureGrowth(career);
      ensureFab();
      if (panelOpen) refreshPanel();
    } catch (e) {}
    return r;
  };

  // 2. simulateGame 包装：每场后结算技能成长（自建 + 明星）
  const __gOldSim = simulateGame;
  simulateGame = function () {
    const before = career ? career.games : 0;
    const r = __gOldSim.apply(this, arguments);
    try {
      if (career && career.games > before) {
        const g = career.gameLog && career.gameLog[0];
        matchGrowth(g);
        save();
      }
    } catch (e) {}
    return r;
  };

  /* ---------- 年龄曲线：29 岁后开始衰退，配合 12–15 赛季节奏 ----------
     自建球员不再走 v50 的“赛季目标自动补属性”。
     成长全部来自比赛；休赛期只处理年龄带来的身体下滑。 */
  function customAgeCurve() {
    if (!career) return;
    career.age = (Number(career.age) || 22) + 1;
    const age = career.age;
    const long = (() => { try { return hasTalent('long'); } catch (e) { return false; } })();
    career.flags = career.flags || {};
    if (age >= 30 && !career.flags.secondSpring && typeof hasTalent === 'function' && hasTalent('late')) {
      career.flags.secondSpring = true;
      career.attrs.mentality = clamp((Number(career.attrs.mentality) || 50) + 2, 30, 110);
      career.attrs.shooting = clamp((Number(career.attrs.shooting) || 50) + 1, 30, 110);
      career.ovrMod = (Number(career.ovrMod) || 0) + 1;
      career.feed.unshift('天赋【第二春】触发：30 岁后第一次明显衰退被改写，心态 +2、投射 +1、OVR 修正 +1。');
    }
    if (age >= 29) {
      const phys = ['athleticism', 'durability', 'finishing', 'defense'];
      let chance = age >= 38 ? 0.96 : age >= 35 ? 0.84 : age >= 32 ? 0.66 : age >= 30 ? 0.52 : 0.40;
      if (long) chance *= 0.78;
      phys.forEach(k => {
        if (Math.random() >= chance) return;
        let drop = 1;
        if (age >= 35 && !long && Math.random() < 0.32) drop = 2;
        career.attrs[k] = clamp((Number(career.attrs[k]) || 50) - drop, 30, 110);
      });
      if (age >= 31) {
        const skillChance = (long ? 0.22 : 0.34) + (age >= 36 ? 0.16 : 0);
        ['shooting', 'playmaking', 'rebounding'].forEach(k => {
          if (Math.random() < skillChance) career.attrs[k] = clamp((Number(career.attrs[k]) || 50) - 1, 30, 110);
        });
      }
      if (age >= 34 && Math.random() < 0.26) career.attrs.mentality = clamp((Number(career.attrs.mentality) || 50) - 1, 30, 110);
      if (age === 29) career.feed.unshift('29 岁：身体恢复开始变慢，之后每个休赛期都会出现自然下滑。');
    }
    syncOvr();
    if (typeof save === 'function') save();
  }

  try {
    const __gOldAgeCurve = ageCurve;
    ageCurve = function () {
      try {
        if (career && career.playerId === 'custom' && !career.retired) { customAgeCurve(); return; }
      } catch (e) {}
      return __gOldAgeCurve.apply(this, arguments);
    };
  } catch (e) {}

  /* ---------- 赛季奖励成长 ----------
     荣誉、季后赛轮次、赛季目标不再直接加属性，改为额外专精点。
     属性成长由每场固定概率决定，长期平均保持在原版每季 5–7 点左右。 */
  const HONOR_BONUS = {
    'MVP': 0.80, 'DPOY': 0.50, 'FMVP': 0.60, '总冠军': 0.60,
    '最佳阵容': 0.35, '最佳防阵': 0.20, '全明星': 0.25, 'MIP': 0.20,
    '最佳新秀': 0.20, '得分王': 0.15, '篮板王': 0.12, '助攻王': 0.12, '抢断王': 0.10, '盖帽王': 0.10
  };

  function ensureHonorSnapshot() {
    if (!career) return;
    if (career.__growthHonorSeason !== career.seasonNo) {
      career.__growthHonorSeason = career.seasonNo;
      try { career.__growthHonorBase = JSON.parse(JSON.stringify(career.honors || {})); }
      catch (e) { career.__growthHonorBase = Object.assign({}, career.honors || {}); }
    }
  }

  function bonusFocusPoints(points, reason) {
    if (!career || !(points > 0)) return 0;
    // 荣誉不直接增加属性，只额外发专精点（提高潜力与成长倾向）。
    const n = Math.min(2, Math.round(points));
    if (n <= 0) return 0;
    career.focusPts = (Number(career.focusPts) || 0) + n;
    career.feed = career.feed || [];
    career.feed.unshift('赛季荣誉（' + reason + '）：额外获得 ' + n + ' 个专精点。');
    if (window.__wireLog) window.__wireLog('season', '赛季荣誉 · ' + reason + ' · 专精点 +' + n);
    return n;
  }

  function seasonGrowthBonus() {
    ensureHonorSnapshot();
    let bonus = 0;
    const notes = [];
    const before = career.__growthHonorBase || {};
    Object.keys(HONOR_BONUS).forEach(k => {
      const now = Number(career.honors && career.honors[k]) || 0;
      const was = Number(before[k]) || 0;
      const add = Math.max(0, now - was);
      if (add > 0) {
        bonus += HONOR_BONUS[k] * add;
        notes.push(k + (add > 1 ? '×' + add : ''));
      }
    });
    // 季后赛每赢一轮给一点额外成长；总冠军已在荣誉里单独计算。
    let roundsWon = 0;
    try {
      (career.playoff && career.playoff.rounds || []).forEach(r => { if (r && Number(r.w) >= 4) roundsWon++; });
    } catch (e) {}
    if (roundsWon > 0) {
      bonus += Math.min(0.50, roundsWon * 0.12);
      notes.push('季后赛 ' + roundsWon + ' 轮');
    }
    // 赛季目标：v128 在跨赛季时结算，这里优先读已经结算的结果。
    try {
      const s = career.v128 && career.v128.season;
      if (s && s.settled && s.success && career.__growthGoalSeason !== career.seasonNo) {
        career.__growthGoalSeason = career.seasonNo;
        bonus += 0.40;
        notes.push('赛季目标完成');
      }
    } catch (e) {}
    if (bonus > 0) bonusFocusPoints(bonus, notes.join(' · '));
    return bonus;
  }

  // 3. endSeason 包装：属性成长已完全由每场概率决定，这里只处理专精点发放
  const __gOldEnd = endSeason;
  endSeason = function (result) {
    const r = __gOldEnd.apply(this, arguments);
    try {
      if (career && !career.retired) {
        ensureGrowth(career);
        const s = career.seasonStats || {};
        const gp = Number(s.gp) || 0;
        // 专精点 = 基础 3 点 + 表现奖励（出勤/产量/战绩/季后赛/全明星）。
        let perf = 0;
        const why = [];
        if (gp >= 60) { perf++; why.push('出勤'); }
        if ((Number(s.pts) || 0) >= 18 || (Number(s.reb) || 0) >= 10 || (Number(s.ast) || 0) >= 7) { perf++; why.push('产量'); }
        if ((Number(career.wins) || 0) >= 45) { perf++; why.push('战绩'); }
        let roundsWon = 0;
        try { (career.playoff && career.playoff.rounds || []).forEach(x => { if (x && Number(x.w) >= 4) roundsWon++; }); } catch (e) {}
        if (roundsWon > 0) { perf++; why.push('季后赛'); }
        if (career.allStar) { perf++; why.push('全明星'); }
        let pts = 3 + Math.min(4, perf);
        if (career.age >= 35) pts = Math.min(pts, 3); else if (career.age >= 31) pts = Math.min(pts, 4);
        // 052 在赛季结束统一把基础训练点设为 8（+全明星/+OVR90），且发生在 004 的年龄封顶之后；
        // 属性成长已改由每场固定概率接管，这部分不能再换专精点。只把超出该基础值的额外奖励（赛季目标、
        // 联盟奖励等）按 2:1 转换。注意：这里不要按年龄再封顶，否则会把 052 留下的 8 点误当奖励。
        const baseDp = 8 + (career.allStar ? 1 : 0) + ((Number(career.ovr) || 0) >= 90 ? 1 : 0);
        const extraDp = Math.max(0, (Number(career.devPoints) || 0) - baseDp);
        const extraFocus = extraDp > 0 ? Math.ceil(extraDp / 2) : 0;
        career.devPoints = 0;
        const gain = pts + extraFocus;
        career.focusPts = (career.focusPts || 0) + gain;
        career.feed.unshift(`休赛期：获得 ${gain} 个专精点（基础 3 + 表现奖励 ${Math.min(4, perf)}${why.length ? '：' + why.join('/') : ''}${extraFocus ? ' + 天赋成长点转化 ' + extraFocus : ''}）。`);
        seasonGrowthBonus();
        if (window.__wireLog) {
          const rec = (career.wins || 0) + '胜' + (career.losses || 0) + '负';
          window.__wireLog('season', '赛季结束 · ' + career.seasonYear + '-' + String((career.seasonYear + 1) % 100).padStart(2, '0') + ' · ' + rec + (result ? ' · ' + result : '') + ' · 获得 ' + gain + ' 个专精点');
        }
        save(); render();
      }
    } catch (e) {}
    return r;
  };

  // 4. addPoint 替换：加 1 点专精（提高学习效率，不再直接改属性）
  addPoint = function (k) { addFocus(k); };

  // 5. 学习效率分层与专精操作
  function rateMult(pct) {
    return pct % 10 === 0 ? (pct / 100).toFixed(1) : (pct / 100).toFixed(2);
  }

  function tierInfo(k) {
    const val = career ? (career.attrs[k] || 0) : 0;
    const customArch = career && career.playerId === 'custom' && career.__arch;
    const hard = customArch ? Math.max(hardCapFor(career), val) : hardFor(k);
    const pot = Math.min(potentialFor(k), hard);
    const rate = learnRate(k);
    const pct = Math.round(rate * 100);
    let label;
    if (val >= hard) label = '已达硬上限';
    else if (customArch && val >= dynCapFor(career, k)) label = '已达成长上限 · 专精可提高';
    else if (val > pot) label = '超出潜力 · 成长放缓';
    else if (val === pot) label = '潜力线 · 开始放缓';
    else label = '潜力内 · 成长加速';
    return { label, pct, rate, cap: hard, pot, gap: Math.max(0, pot - val), over: Math.max(0, val - pot) };
  }

  function resetAllFocus() {
    ensureGrowth(career);
    ensurePotentialCaps();
    const customArch = career.playerId === 'custom' && career.__arch;
    let refunded = 0;
    ATTR_KEYS.forEach(k => {
      const locked = lockedOf(k);
      const f = career.focus[k] || 0;
      if (f <= locked) return;
      const remove = f - locked;
      refunded += remove;
      career.focus[k] = locked;
      career.potentialCaps[k] = Math.max(40, (Number(career.potentialCaps[k]) || potentialFor(k)) - remove);
      if (customArch) {
        const hard = hardCapFor(career);
        career.dynCap[k] = Math.min(hard, Math.max(Number(career.attrs[k]) || 0, (Number(career.dynCap[k]) || 0) - remove * CAP_STEP));
      }
    });
    if (!refunded) return notify('没有可撤销的未确认专精');
    career.focusPts += refunded;
    confirmOpen = false;
    notify('已撤销本次未确认的 ' + refunded + ' 点专精，对应潜力也已回退');
    save(); render();
  }

  function minusFocusTrain(k) {
    return removeFocus(k);
  }

  // 6. 训练页只保留入口说明：加点统一在「球员」页
  offTrain = function () {
    ensureGrowth(career);
    return `<style>
.tr-moved{background:#1c2129;border:1px solid #2f3742;border-radius:20px;padding:22px 18px;text-align:center}
.tr-moved small{display:block;color:#ffd23f;letter-spacing:2px;font-size:9px}
.tr-moved h3{color:#ffffff;font-size:17px;margin:9px 0 7px;line-height:1.5}
.tr-moved p{color:#9aa3b2;font-size:11.5px;line-height:1.8;margin:0 auto;max-width:320px}
.tr-moved button{margin-top:15px;height:40px;padding:0 22px;border:0;border-radius:20px;background:#ffd23f;color:#101318;font-size:12.5px;font-weight:800;cursor:pointer}
</style><section class="tr-moved"><h3>技能成长与专精分配，都在「球员」页</h3><button onclick="ui.tab='player';render()">打开球员页 →</button></section>${adPointsHTML()}`;
  };

  // 7. offseasonView 文案适配（成长点 → 专精点）
  const __gOldOffView = offseasonView;
  offseasonView = function () {
    let html = __gOldOffView.apply(this, arguments);
    try {
      if (career) {
        ensureGrowth(career);
        if (career.devPoints > 0) {
          career.focusPts = (career.focusPts || 0) + Math.ceil(career.devPoints / 2);
          career.devPoints = 0;
          save();
        }
        html = html.replace(/还有成长点可用/g, '还有专精点可分配').replace(/成长点已用完/g, '专精点已投完');
      }
    } catch (e) {}
    return html;
  };

  // 8. beginSeason 守卫解除：devPoints 已换算成专精点（自建 + 明星）
  const __gOldBegin = beginSeason;
  beginSeason = function () {
    try {
      if (career) {
        ensureGrowth(career);
        if (career.devPoints > 0) {
          career.focusPts = (career.focusPts || 0) + Math.ceil(career.devPoints / 2);
          career.devPoints = 0;
          save();
        }
      }
    } catch (e) {}
    return __gOldBegin.apply(this, arguments);
  };

  // 9. 存档轮询器：初始化新档字段 + 把引擎发的 devPoints 换算为专精点
  setInterval(function () {
    try {
      const raw = localStorage.getItem('save_bust_no1_v4');
      if (!raw) return;
      const s = JSON.parse(raw);
      if (!s.playerId) return;
      let dirty = false;
      if (!s.focus || typeof s.focusPts !== 'number' || !s.dynCap || s.dynCapVersion !== CAP_VERSION) { ensureGrowth(s); dirty = true; }
      if (s.devPoints > 0) {
        s.focusPts = (s.focusPts || 0) + Math.ceil(s.devPoints / 2);
        s.devPoints = 0;
        dirty = true;
      }
      if (dirty) localStorage.setItem('save_bust_no1_v4', JSON.stringify(s));
    } catch (e) {}
  }, 1000);

  /* ---------- 导出 ---------- */
  window.__GROWTH__ = { open: openPanel, close: closePanel, plus: addFocus, minus: removeFocus, ensureGrowth: ensureGrowth, resetAll: resetAllFocus, minusTrain: minusFocusTrain, askConfirm: askConfirm, cancelConfirm: cancelConfirm, confirmAlloc: confirmAlloc, pending: pendingFocus, locked: lockedOf, allocBlocked: allocBlocked, potential: potentialFor, hard: hardFor };
  window.__GROWTH_DEBUG__ = {
    matchGrowth: matchGrowth, learnRate: learnRate, threshold: threshold,
    efficiencyMult: efficiencyMult, ageGrowthMult: ageGrowthMult, customAgeCurve: customAgeCurve,
    growthChance: growthChance,
    seasonState: function () {
      if (!career) return null;
      ensureSeasonGrowth(career);
      return {
        season: career.growthSeason,
        used: career.growthUsed || 0,
        chance: growthChance(),
        log: career.growthLog || []
      };
    },
    trySeasonGrowth: trySeasonGrowth,
    settleSeasonGrowth: settleSeasonGrowth
  };
  // 训练页按钮用的全局函数（onclick 字符串走全局作用域）
  window.resetAllFocus = resetAllFocus;
  window.minusFocusTrain = minusFocusTrain;

})(window);
