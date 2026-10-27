/* ============================================================
 * 171 · 明星模式成长页
 * 把 149 的新成长系统（比赛倾向 + 赛季预算 + 专精潜力）挂到明星球员页。
 * 只处理非 custom 生涯；自建球员仍由 165 挂载。
 * ============================================================ */
(function () {
  'use strict';

  function isStarCareer() {
    try {
      return typeof career !== 'undefined' && career && !career.retired
        && career.playerId !== 'custom';
    } catch (e) { return false; }
  }

  try {
    var prevPlayerView = playerView;
    playerView = function () {
      var h = prevPlayerView.apply(this, arguments);
      try {
        if (!isStarCareer()) return h;
        if (window.__GROWTH__ && typeof window.__GROWTH__.ensureGrowth === 'function') {
          window.__GROWTH__.ensureGrowth(career);
        }
        if (typeof window.__GROWTH_PAGE__ !== 'function') return h;
        if (String(h).indexOf('focus-page') >= 0) return h;
        h += window.__GROWTH_PAGE__();
      } catch (e) { console.error('[171] star growth page failed', e); }
      return h;
    };
    window.playerView = playerView;
  } catch (e) {
    console.error('[171] wrap failed', e);
  }
})();
