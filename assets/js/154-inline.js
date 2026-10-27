
/* ============================================================
 * 发帖 / 分享功能移除
 * v173/v174 已停用；这里再从输出层清掉退役海报的“分享到虎扑”
 * 以及任何旧层可能重新插入的分享卡/发帖按钮。
 * ============================================================ */
(function () {
  'use strict';

  // 退役海报的分享按钮由 v83 包装 renderRetired 注入，输出层直接删除
  try {
    var prevRetired = renderRetired;
    renderRetired = function () {
      var html = prevRetired.apply(this, arguments);
      return String(html).replace(/<button[^>]*class="[^"]*v83-share[^"]*"[\s\S]*?<\/button>/g, '');
    };
  } catch (e) {}

  // 兜底：任何分享/发帖 UI 在每次渲染后统一清除
  function purgePostUI() {
    try {
      document.querySelectorAll('.v174-share-card,.v174-share-btn,.v83-share,#v83-share-btn,#v173-notice-overlay').forEach(function (el) { el.remove(); });
      document.querySelectorAll('button').forEach(function (btn) {
        var t = btn.textContent || '';
        if (/分享到虎扑|发帖分享|分享生涯战报|领取成长点/.test(t)) btn.remove();
      });
      document.body.classList.remove('v173-notice-open');
    } catch (e) {}
  }

  var prevRender = render;
  render = function () {
    var r = prevRender.apply(this, arguments);
    purgePostUI();
    return r;
  };

  // 低层入口停用，避免旧按钮或旧代码路径继续发帖
  window.v83SharePoster = function () { return false; };
  window.v174Share = function () { return false; };
  purgePostUI();
})();
