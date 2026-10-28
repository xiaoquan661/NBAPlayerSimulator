/* ============================================================
 * 183 · 模拟明星生涯收尾
 * 修复：后段弧线里选了「就在这里结束」「转做管理」「告别赛季」，
 * 只写剧情 flag，没有真正触发退役，导致生涯可以一直打下去。
 * 现在：选择生效后，本赛季结束进入下一季时生成退役结局。
 * 只影响非自建球员；自建球员仍由玩家在生涯档案里主动退役。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v183StarEnding) return;
  window.__v183StarEnding = true;

  function isStar() {
    try {
      return !!(typeof career !== 'undefined' && career
        && career.playerId && career.playerId !== 'custom'
        && !career.retired);
    } catch (e) { return false; }
  }

  function ensureV30() {
    if (!career) return null;
    if (!career.v30 || typeof career.v30 !== 'object') career.v30 = {};
    return career.v30;
  }

  function firstFlag(effect) {
    try {
      var fl = effect && effect.flags;
      if (!Array.isArray(fl)) return '';
      for (var i = 0; i < fl.length; i++) {
        var f = fl[i];
        if (Array.isArray(f) && f[1] != null) return String(f[1]);
      }
    } catch (e) {}
    return '';
  }

  function markEnd(reason, announce) {
    if (!isStar()) return false;
    var v = ensureV30();
    if (!v || v.endAfterSeason) return false;
    v.endAfterSeason = reason || '职业生涯结束';
    if (announce && typeof career.feed !== 'undefined') {
      career.feed.unshift('这段生涯已经走到收尾阶段：本赛季结束后生成最终报告。');
      try { ui.toast = '生涯进入收尾阶段 · 本赛季结束后生成结局'; } catch (e) {}
    }
    try { if (typeof save === 'function') save(); } catch (e) {}
    return true;
  }

  /* 记录后段选择：decision 的 ownEnd/staff 与 farewell 都应在赛季结束后退役 */
  try {
    var prevChoice = storyChoice;
    storyChoice = function (i) {
      var ev = null;
      try { ev = ui && ui.storyEvent; } catch (e) {}
      var out = prevChoice.apply(this, arguments);
      try {
        if (isStar() && ev && ev._late && ev._lateStage) {
          var effect = ev.c && ev.c[i] ? ev.c[i][2] : null;
          var flag = firstFlag(effect);
          if (ev._lateStage === 'farewell') {
            markEnd('告别赛季结束，职业生涯谢幕', true);
          } else if (ev._lateStage === 'decision' && (flag === 'ownEnd' || flag === 'staff')) {
            markEnd(flag === 'staff' ? '转做管理或教练，球员生涯结束' : '在退役抉择中主动结束职业生涯', true);
          }
        }
      } catch (e) {}
      return out;
    };
    window.storyChoice = storyChoice;
  } catch (e) { console.error('[183] storyChoice wrap failed', e); }

  /* 在进入下一季之前结算退役，避免又多打一个赛季 */
  try {
    var prevNext = nextSeason;
    nextSeason = function () {
      try {
        if (isStar() && career.v30 && career.v30.endAfterSeason) {
          var reason = career.v30.endAfterSeason;
          delete career.v30.endAfterSeason;
          if (typeof retire === 'function') {
            retire(reason);
            return;
          }
        }
      } catch (e) { console.error('[183] retire on nextSeason failed', e); }
      return prevNext.apply(this, arguments);
    };
    window.nextSeason = nextSeason;
  } catch (e) { console.error('[183] nextSeason wrap failed', e); }

  /* 旧存档修复：已经选过 farewell / ownEnd / staff，但没有触发退役 */
  function repair() {
    if (!isStar()) return;
    try {
      var v = ensureV30();
      if (!v || v.endAfterSeason) return;
      var flags = career.storyFlags || {};
      var used = v.usedKeys || {};
      var p = career.playerId;
      var reason = '';
      if (flags.v30late_farewell) reason = '告别赛季结束，职业生涯谢幕';
      else if (flags.v30late_decision === 'ownEnd') reason = '在退役抉择中主动结束职业生涯';
      else if (flags.v30late_decision === 'staff') reason = '转做管理或教练，球员生涯结束';
      else if (used['late:' + p + ':farewell']) reason = '告别赛季结束，职业生涯谢幕';
      if (reason) markEnd(reason, true);
    } catch (e) {}
  }

  try {
    var prevRender = render;
    render = function () {
      try { repair(); } catch (e) {}
      return prevRender.apply(this, arguments);
    };
    window.render = render;
  } catch (e) {}

  window.__v183Debug = {
    isStar: isStar,
    repair: repair,
    state: function () { return career && career.v30 ? { endAfterSeason: career.v30.endAfterSeason || null, used: career.v30.usedKeys || {} } : null; }
  };
})();
