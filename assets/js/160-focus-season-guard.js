
/* 进入下一赛季 / 新秀赛季前，必须把本季专精点全部分配并确认 */
(function () {
  'use strict';
  try {
    function blocked() {
      try {
        if (window.__ORIGINAL_GROWTH__) return false;
        return !!(typeof career !== 'undefined' && career && !career.retired
          && window.__GROWTH__ && window.__GROWTH__.allocBlocked());
      } catch (e) { return false; }
    }
    function warn() {
      try { notify('先把本季专精点分配完并确认；每点专精 = 指定潜力 +1'); } catch (e) {}
      try { ui.tab = 'player'; render(); } catch (e) {}
    }
    try {
      var b = beginSeason;
      beginSeason = function () {
        if (blocked()) return warn();
        return b.apply(this, arguments);
      };
    } catch (e) {}
    try {
      var n = nextSeason;
      nextSeason = function () {
        if (blocked()) return warn();
        return n.apply(this, arguments);
      };
    } catch (e) {}
  } catch (e) {}
})();
