/* ============================================================
 * 185 · 健康与负荷
 * 目标：健康不再是长期 100 的摆设。
 *   - 每打一场，按分钟、年龄、耐久扣除负荷
 *   - 低分钟/伤停期间会恢复
 *   - 休赛期恢复计划、下一季基础恢复仍然有效
 * 只改常规赛每场结算，不改比赛结果和属性成长。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v185Health) return;
  window.__v185Health = true;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function applyGameHealth(g) {
    if (!career || career.retired || !g) return null;
    var prev = clamp(Number(career.health) || 0, 0, 100);
    /* 健康用小数累积，界面仍显示整数；否则每场 -0.2 会被四舍五入吃掉。 */
    var exact = Number(career.healthExact);
    if (!isFinite(exact) || Math.abs(prev - Math.round(exact)) > 0.5) exact = prev;
    var played = g.played !== false && !!g.line;
    var delta = 0;

    if (!played) {
      /* 伤停 / 未出场：康复节奏，按场慢慢回血 */
      delta = 0.50;
    } else {
      var min = Math.max(6, Number(g.line.min) || Number(career.minutes) || 24);
      var dur = clamp(Number(career.attrs && career.attrs.durability) || 70, 30, 110);
      var age = Number(career.age) || 22;
      /* 分钟负荷是主因；年龄越大、耐久越低，恢复越差。 */
      var durFactor = clamp(1.18 - dur / 350, 0.80, 1.25);
      var wear = (min / 30) * 0.62 * durFactor;
      if (age >= 30) wear += 0.10 + (age - 30) * 0.025;
      if (age >= 34) wear += 0.12;
      var recover = 0.30 + (min < 24 ? 0.18 : 0) + (age <= 24 ? 0.05 : 0);
      delta = recover - wear + (Math.random() * 0.16 - 0.08);
      /* 本场已经触发伤病：不再叠加负荷，只保留一点恢复 */
      if (career.injury && Number(career.injury.gamesLeft) > 0) delta = 0.25;
    }

    delta = clamp(delta, -2.2, 1.2);
    exact = clamp(exact + delta, 0, 100);
    career.healthExact = Math.round(exact * 100) / 100;
    var next = Math.round(exact);
    career.health = next;

    try {
      if (prev >= 60 && next < 60 && career.healthWarnSeason !== career.seasonNo) {
        career.healthWarnSeason = career.seasonNo;
        career.feed = career.feed || [];
        career.feed.unshift('身体负荷报警：健康降到 ' + next + '，接下来的比赛伤病风险会上升。');
        if (typeof window.v222Pop === 'function') window.v222Pop('身体负荷', '健康 ' + prev + ' → ' + next + '，注意轮休或恢复。');
      } else if (prev >= 40 && next < 40 && career.healthWarnLowSeason !== career.seasonNo) {
        career.healthWarnLowSeason = career.seasonNo;
        career.feed = career.feed || [];
        career.feed.unshift('健康已经很低（' + next + '）：再硬撑，伤病概率会明显增加。');
      }
    } catch (e) {}

    try { if (typeof save === 'function') save(); } catch (e) {}
    return { before: prev, after: next, delta: next - prev };
  }

  try {
    var prevSim = simulateGame;
    simulateGame = function () {
      var beforeGames = (typeof career !== 'undefined' && career) ? career.games : -1;
      var out = prevSim.apply(this, arguments);
      try {
        if (career && !career.retired && career.games > beforeGames) {
          var g = career.gameLog && career.gameLog[0];
          if (g) applyGameHealth(g);
        }
      } catch (e) { console.error('[185] health update failed', e); }
      return out;
    };
    window.simulateGame = simulateGame;
  } catch (e) { console.error('[185] simulateGame wrap failed', e); }

  window.__v185Debug = { apply: applyGameHealth };
})();
