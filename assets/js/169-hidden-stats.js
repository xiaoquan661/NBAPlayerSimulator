/* ============================================================
 * 169 · 隐藏状态显示
 *   在球队关系三格下面补一排：自信 / 健康 / 出手权重 / 球队信任 / 专属值
 *   只显示，不改变任何数值。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v169HiddenStats) return;
  window.__v169HiddenStats = true;

  function num(v, d) {
    v = Number(v);
    return isFinite(v) ? v : (d || 0);
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function usage() {
    try {
      if (typeof window.v52UsageWeight === 'function') return num(window.v52UsageWeight(), 1);
      if (career && career.v52Usage != null) return num(career.v52Usage, 1);
    } catch (e) {}
    return 1;
  }

  function cell(label, value, cls) {
    return '<span class="' + (cls || '') + '"><small>' + label + '</small><b>' + value + '</b></span>';
  }

  function hiddenRow() {
    if (typeof career === 'undefined' || !career) return '';
    var confidence = Math.round(clamp(num(career.confidence, 50), 0, 100));
    var health = Math.round(clamp(num(career.health, 80), 0, 100));
    var trust = Math.round(clamp(num(career.trust, 50), 0, 100));
    var w = usage();
    var wTxt = (Math.round(w * 100) / 100).toFixed(2);
    return '<div class="v169-hidden-stats">'
      + cell('自信', confidence, confidence < 40 ? 'low' : confidence >= 70 ? 'hot' : '')
      + cell('健康', health, health < 50 ? 'low' : health >= 80 ? 'good' : '')
      + cell('出手权重', wTxt, w >= 1.1 ? 'hot' : w < 0.85 ? 'low' : '')
      + cell('球队信任', trust, trust < 40 ? 'low' : trust >= 70 ? 'good' : '')
      + '</div>';
  }

  var style = document.createElement('style');
  style.id = 'v169-hidden-style';
  style.textContent = [
    '.v169-hidden-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-top:7px;grid-column:1/-1;width:100%;justify-self:stretch}',
    '.v169-hidden-stats>span{display:block;min-width:0;padding:6px 3px 5px;border-radius:10px;background:#1c2129;border:1px solid #2f3742;text-align:center}',
    '.v169-hidden-stats small{display:block;font-size:7px;line-height:1.2;color:#8fa1b5;white-space:nowrap}',
    '.v169-hidden-stats b{display:block;margin-top:2px;font-size:13px;line-height:1.1;color:#ffffff;font-variant-numeric:tabular-nums}',
    '.v169-hidden-stats .hot b{color:#ffd23f}',
    '.v169-hidden-stats .good b{color:#7fe0a1}',
    '.v169-hidden-stats .low b{color:#ff8a8f}'
  ].join('');
  document.head.appendChild(style);

  try {
    var prev = relationshipDock;
    relationshipDock = function () {
      var h = prev.apply(this, arguments);
      try {
        if (typeof career === 'undefined' || !career) return h;
        return String(h) + hiddenRow();
      } catch (e) {
        return h;
      }
    };
    window.relationshipDock = relationshipDock;
  } catch (e) {
    console.error('[169] relationshipDock wrap failed', e);
  }

  /* ---------- 国内声望统一改叫「名气」 ---------- */
  function cleanFameText(s) {
    if (!s || s.indexOf('国内声望') < 0) return s;
    return s.replace(/国内声望/g, '名气');
  }

  function hideFameText(root) {
    if (!root || !document.createTreeWalker) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var nodes = [], node;
    while ((node = walker.nextNode())) nodes.push(node);
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (!n.nodeValue || n.nodeValue.indexOf('国内声望') < 0) continue;
      var p = n.parentNode;
      if (p && /^(SCRIPT|STYLE)$/i.test(p.nodeName)) continue;
      n.nodeValue = cleanFameText(n.nodeValue);
    }
  }

  try {
    var prevRender169 = render;
    render = function () {
      var r = prevRender169.apply(this, arguments);
      try { hideFameText(document.getElementById('app')); } catch (e) {}
      return r;
    };
    window.render = render;
    window.__v169HideFameText = hideFameText;
    hideFameText(document.getElementById('app'));
  } catch (e) {
    console.error('[169] fame text hide failed', e);
  }
})();
