/* ============================================================
 * 187 · 天赋 / 自白效果补全
 * 检查发现：部分天赋描述有文本，但在新成长系统里没有落点。
 *   修复：
 *   - 「关键先生」映射到 clutch
 *   - 「命运眷顾」改写每季第一次中/重伤
 *   - 「投篮工匠 / 防守直觉 / 健身房老鼠」在专精加点上真正触发
 *   - 「超级学习力」24 岁前成长效率 +35%，赛季结束补 1 点关键能力
 *   - 「第二春」自建球员 30 岁后生效（149 的 customAgeCurve）
 * 自白被动由 178 负责；这里不改事件数量，只保证文本与实际效果一致。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v187TalentAudit) return;
  window.__v187TalentAudit = true;

  function has(id) {
    try { return typeof hasTalent === 'function' && hasTalent(id); } catch (e) { return false; }
  }
  function isCustom() {
    try { return typeof career !== 'undefined' && career && career.playerId === 'custom'; } catch (e) { return false; }
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function label(k) {
    return ({
      finishing: '终结', shooting: '投射', playmaking: '组织', defense: '防守',
      steals: '抢断', blocks: '盖帽', strength: '力量', rebounding: '篮板',
      athleticism: '运动', durability: '耐久', mentality: '心态'
    })[k] || k;
  }

  /* 1. 关键先生：旧代码查 clutch，但天赋 id 是 heart */
  try {
    var prevHas = hasTalent;
    hasTalent = function (id) {
      try {
        if (id === 'clutch' && career && Array.isArray(career.talents) && career.talents.indexOf('heart') >= 0) return true;
      } catch (e) {}
      return prevHas.apply(this, arguments);
    };
    window.hasTalent = hasTalent;
  } catch (e) { console.error('[187] hasTalent wrap failed', e); }

  /* 2. 专精点：投篮工匠 / 防守直觉 / 健身房老鼠 */
  function pointBonus(k) {
    if (k === 'shooting' && (has('shot') || has('l_shooter'))) {
      return { k: 'shooting', label: has('l_shooter') ? '天生射手' : '投篮工匠' };
    }
    if (k === 'defense' && has('def')) return { k: 'defense', label: '防守直觉' };
    if ((k === 'athleticism' || k === 'durability') && has('gym')) return { k: 'durability', label: '健身房老鼠' };
    return null;
  }
  function applyPointBonus(k, beforeFocus) {
    try {
      if (!career || !career.focus) return;
      var afterFocus = Number(career.focus[k]) || 0;
      if (afterFocus <= beforeFocus) return;
      var b = pointBonus(k);
      if (!b) return;
      var old = Number(career.attrs[b.k]) || 0;
      var next = Math.min(110, old + 1);
      if (next === old) return;
      career.attrs[b.k] = next;
      career.feed = career.feed || [];
      career.feed.unshift('天赋【' + b.label + '】触发：' + label(b.k) + ' +1。');
      try { if (typeof syncOvr === 'function') syncOvr(); } catch (e) {}
      try { if (typeof save === 'function') save(); } catch (e) {}
      try { if (typeof render === 'function') render(); } catch (e) {}
    } catch (e) {}
  }
  try {
    if (window.__GROWTH__ && typeof window.__GROWTH__.plus === 'function') {
      var prevPlus = window.__GROWTH__.plus;
      window.__GROWTH__.plus = function (k) {
        var before = (career && career.focus && Number(career.focus[k])) || 0;
        var out = prevPlus.apply(this, arguments);
        applyPointBonus(k, before);
        return out;
      };
    }
  } catch (e) { console.error('[187] focus plus wrap failed', e); }

  /* 3. 命运眷顾：每季第一次中/重伤有 65% 概率降级 */
  function applyLucky() {
    try {
      if (!career || !career.injury || !has('lucky') || career.luckyUsedThisSeason) return false;
      var sev = career.injury.severity;
      if (sev !== 'major' && sev !== 'medium') return false;
      career.luckyUsedThisSeason = true;
      if (Math.random() >= 0.65) return false;
      var inj = career.injury;
      if (inj.severity === 'major') inj.severity = 'medium';
      else inj.severity = 'minor';
      inj.gamesLeft = Math.max(1, Math.ceil((Number(inj.gamesLeft) || 1) * (inj.severity === 'medium' ? 0.55 : 0.50)));
      inj.baseGames = inj.gamesLeft;
      career.feed = career.feed || [];
      career.feed.unshift('天赋【命运眷顾】触发：这次伤病的严重程度被改写，预计缺席缩短到 ' + inj.gamesLeft + ' 场。');
      try { if (typeof save === 'function') save(); } catch (e) {}
      try { if (typeof render === 'function') render(); } catch (e) {}
      return true;
    } catch (e) { return false; }
  }
  try {
    var prevTrigger = triggerInjury;
    triggerInjury = function () {
      var before = career ? career.injury : null;
      var out = prevTrigger.apply(this, arguments);
      try {
        if (career && career.injury && career.injury !== before) applyLucky();
      } catch (e) {}
      return out;
    };
    window.triggerInjury = triggerInjury;
  } catch (e) { console.error('[187] triggerInjury wrap failed', e); }

  try {
    var prevNext = nextSeason;
    nextSeason = function () {
      var out = prevNext.apply(this, arguments);
      try { if (career) career.luckyUsedThisSeason = false; } catch (e) {}
      return out;
    };
    window.nextSeason = nextSeason;
  } catch (e) { console.error('[187] nextSeason wrap failed', e); }

  /* 4. 超级学习力：24 岁前赛季结束补 1 点最接近潜力的能力 */
  function learnBonus() {
    try {
      if (!career || career.retired || !has('learn') || Number(career.age) >= 24) return false;
      if (career.__learnBonusSeason === career.seasonNo) return false;
      var keys = ['finishing', 'shooting', 'playmaking', 'defense', 'steals', 'blocks', 'strength', 'rebounding', 'athleticism', 'durability', 'mentality'];
      var best = null, bestGap = -1;
      keys.forEach(function (k) {
        var cur = Number(career.attrs[k]) || 0;
        var pot = Number(career.potentialCaps && career.potentialCaps[k]);
        if (!isFinite(pot)) pot = cur;
        var gap = Math.max(0, Math.min(110, pot) - cur);
        if (gap > bestGap) { bestGap = gap; best = k; }
      });
      if (!best) return false;
      var old = Number(career.attrs[best]) || 0;
      var next = Math.min(110, old + 1);
      if (next === old) return false;
      career.attrs[best] = next;
      career.__learnBonusSeason = career.seasonNo;
      career.feed = career.feed || [];
      career.feed.unshift('天赋【超级学习力】触发：赛季结束额外 +1 ' + label(best) + '。');
      try { if (typeof syncOvr === 'function') syncOvr(); } catch (e) {}
      try { if (typeof save === 'function') save(); } catch (e) {}
      return true;
    } catch (e) { return false; }
  }
  try {
    var prevEnd = endSeason;
    endSeason = function () {
      var out = prevEnd.apply(this, arguments);
      try { if (career && !career.retired) learnBonus(); } catch (e) {}
      return out;
    };
    window.endSeason = endSeason;
  } catch (e) { console.error('[187] endSeason wrap failed', e); }

  window.__v187Debug = {
    has: has,
    pointBonus: pointBonus,
    lucky: applyLucky,
    learnBonus: learnBonus
  };
})();