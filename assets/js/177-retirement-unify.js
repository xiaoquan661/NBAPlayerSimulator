
/* ============================================================
 * 退役页统一层
 *   明星和自建共用同一套阅读顺序：
 *   结局正文 → 生涯 / 命运回响 → 生涯报告 → 命运评分 → 数据总览
 *   只调整结构顺序，不改各模式原有内容。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__retirementUnify177) return;
  window.__retirementUnify177 = true;

  var prev = renderRetired;
  renderRetired = function () {
    var h = prev.apply(this, arguments);
    try {
      if (typeof h !== 'string') return h;
      var box = document.createElement('div');
      box.innerHTML = h;
      var legacy = box.querySelector('.legacy-score');
      if (!legacy) return h;
      /* 生涯报告、自白、下半场、三幕回响统一排在命运评分之前。 */
      ['.vow-final', '.afterlife', '.v167-epilogue', '.v32-report'].forEach(function (sel) {
        var el = box.querySelector(sel);
        if (el && el.parentNode) el.parentNode.insertBefore(el, legacy);
      });
      return box.innerHTML;
    } catch (e) {
      return h;
    }
  };
})();
