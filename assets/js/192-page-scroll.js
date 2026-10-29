/* ============================================================
 * 192 · 页面滚动定位
 *   - 每个页面/每个 tab 单独记滚动位置，互不串用
 *   - 首次进入某个页面（新存档 / 刷新后重开）默认在最顶上
 *   - 只有再次回到已经看过的同一页面，才恢复该页面自己的位置
 *   - “下一步”导致页面身份变化时，自动回到新页面顶部
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v192PageScroll) return;
  window.__v192PageScroll = true;

  var positions = Object.create(null);
  var displayedKey = '';
  var navToken = 0;

  function uiSafe() {
    try { return typeof ui !== 'undefined' && ui ? ui : null; } catch (e) { return null; }
  }

  function pageKey() {
    var u = uiSafe();
    if (!u) return 'boot';
    var s = u.screen || 'boot';
    if (s === 'select') {
      var mode = window.__GAME_MODE__ || '';
      if (mode === 'custom') {
        var CG = window.__CREATOR__ || {};
        return 'select:custom:' + (Number(CG.step) || 0);
      }
      return 'select:' + mode;
    }
    if (s === 'career') return 'career:' + (u.tab || 'season');
    if (s === 'talents') return 'talents:' + (window.__GAME_MODE__ || '');
    return s;
  }

  /* 自定义捏人页自带内部滚动容器：部分宿主会锁住页面本身滚动。
     这类页面统一以 .creator-wrap 的 scrollTop 为准。 */
  function creatorScroller() {
    try { return document.querySelector('.creator-wrap'); } catch (e) { return null; }
  }

  function currentY() {
    try {
      var c = creatorScroller();
      if (c) return Number(c.scrollTop) || 0;
      return Number(window.scrollY) || Number(document.documentElement.scrollTop) || Number(document.body.scrollTop) || 0;
    } catch (e) { return 0; }
  }

  function scrollToY(y) {
    try {
      var c = creatorScroller();
      if (c) {
        c.scrollTop = Math.max(0, Number(y) || 0);
        return;
      }
      window.scrollTo(0, Math.max(0, Number(y) || 0));
    } catch (e) {}
  }

  function reset() {
    positions = Object.create(null);
    displayedKey = pageKey();
    positions[displayedKey] = 0;
    navToken++;
    scrollToY(0);
  }

  /* 浏览器自带的刷新滚动恢复会和这里的页面定位打架。 */
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}

  try {
    var prevRender = render;
    render = function () {
      /* 调用方通常先改 ui.tab / ui.screen 再 render，
         所以这里不能再用 pageKey() 判断旧页面；要记住当前 DOM 对应的页面。 */
      var beforeKey = displayedKey || pageKey();
      var beforeY = currentY();
      if (beforeKey) positions[beforeKey] = beforeY;

      var out = prevRender.apply(this, arguments);

      var afterKey = pageKey();
      displayedKey = afterKey;
      var target = positions[afterKey] || 0;
      if (afterKey !== beforeKey) {
        var token = ++navToken;
        scrollToY(target);
        /* 页面高度刚变化时，浏览器可能先夹住滚动值；稍后再补一次。 */
        setTimeout(function () {
          if (token === navToken && pageKey() === afterKey) scrollToY(target);
        }, 35);
      } else {
        /* 同一页面内的重渲染（选位置/自白/天赋）会重建 DOM，
           内部滚动容器会回到 0，这里恢复玩家刚才的位置。 */
        scrollToY(target);
      }
      return out;
    };
    window.render = render;
  } catch (e) {
    console.error('[192] page scroll wrap failed', e);
  }

  /* 新存档、重新读档、切换模式时清空页面位置，避免继承上一局。 */
  ['openModes', 'pickMode', 'createCareer', 'continueSave', 'startSelect', 'v81ContinueSlot'].forEach(function (name) {
    try {
      var fn = window[name];
      if (typeof fn !== 'function' || fn.__v192Wrapped) return;
      var wrapped = function () {
        reset();
        return fn.apply(this, arguments);
      };
      wrapped.__v192Wrapped = true;
      window[name] = wrapped;
    } catch (e) {}
  });

  displayedKey = pageKey();
  positions[displayedKey] = 0;
  scrollToY(0);

  window.__v192Scroll = {
    key: pageKey,
    reset: reset,
    positions: function () { return Object.assign({}, positions); },
    displayed: function () { return displayedKey; }
  };
})();
