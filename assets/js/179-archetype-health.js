
/* ============================================================
 * 成长模板 · 伤病风险
 *   __arch.healthRisk 0.7 ~ 1.6，归一化后再乘到伤病概率上。
 *   放在所有 injuryChance 包装的最外层，避免被 015 的基础曲线绕过。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v179ArchetypeHealth) return;
  window.__v179ArchetypeHealth = true;

  function isCustom() {
    try { return typeof career !== 'undefined' && career && career.playerId === 'custom'; } catch (e) { return false; }
  }

  try {
    var prevInjuryChance = injuryChance;
    injuryChance = function () {
      var n = prevInjuryChance.apply(this, arguments);
      try {
        if (isCustom() && career.__arch) {
          var meta = (window.__ARCHETYPES__ && window.__ARCHETYPES__[career.__arch.key]) || {};
          var hr = Number(career.__arch.healthRisk) || Number(meta.healthRisk) || 1;
          var factor = Math.max(0.90, Math.min(1.15, 0.85 + hr * 0.15));
          n *= factor;
        }
      } catch (e) {}
      return n;
    };
    window.injuryChance = injuryChance;
  } catch (e) {
    console.error('[179] injury risk wrap failed', e);
  }
})();
