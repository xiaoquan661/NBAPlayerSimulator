/* ============================================================
 * 172 · 球队战力
 * 在生涯 HUD 的关系卡里补一项「球队战力」，直接读当前球队强度。
 * 只做展示，不参与胜负计算。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v172TeamPower) return;
  window.__v172TeamPower = true;

  function currentPower() {
    try {
      if (typeof career === 'undefined' || !career) return null;
      if (typeof teamBy !== 'function') return null;
      var t = teamBy(career.team);
      if (!t || typeof t.power !== 'number' || !isFinite(t.power)) return null;
      return Math.round(t.power * 10) / 10;
    } catch (e) { return null; }
  }

  var css = document.createElement('style');
  css.id = 'v172-team-power-style';
  css.textContent = [
    '.franchise-status.v172-dock{grid-template-columns:repeat(4,minmax(0,1fr))!important}',
    '.v172-power header b{color:#ffd23f!important}',
    '.v172-power.weak header b{color:#ff9b7a!important}',
    '.v172-power.elite header b{color:#7ee0a8!important}',
    '.v172-power .mini-track i{background:linear-gradient(90deg,#ff9b7a,#ffd23f)!important}',
    '.v172-power.elite .mini-track i{background:linear-gradient(90deg,#ffd23f,#7ee0a8)!important}',
    '@media(max-width:420px){.franchise-status.v172-dock{grid-template-columns:1fr 1fr!important}}'
  ].join('');
  document.head.appendChild(css);

  function pill(v) {
    var cls = v >= 88 ? 'elite' : v >= 82 ? 'good' : 'weak';
    var pct = Math.max(4, Math.min(100, (v - 70) / 25 * 100));
    return '<div class="rel-pill v172-power ' + cls + '"><header><span>球队战力</span><b>' + v + '</b></header>'
      + '<div class="mini-track"><i style="width:' + pct.toFixed(1) + '%"></i></div></div>';
  }

  try {
    var prevRenderHud = renderHud;
    renderHud = function () {
      var h = prevRenderHud.apply(this, arguments);
      try {
        if (typeof career === 'undefined' || !career) return h;
        if (String(h).indexOf('franchise-status') < 0) return h;
        if (String(h).indexOf('v172-power') >= 0) return h;
        var v = currentPower();
        if (v == null) return h;
        h = h.replace('<div class="franchise-status">', '<div class="franchise-status v172-dock">');
        h = h.replace(/(<div class="franchise-status v172-dock">[\s\S]*?)(<\/div>\s*<div class="v169-hidden-stats">)/, '$1' + pill(v) + '$2');
        if (String(h).indexOf('v172-power') < 0) {
          h = h.replace(/(<div class="franchise-status v172-dock">[\s\S]*?)(<\/div><\/header>)/, '$1' + pill(v) + '$2');
        }
      } catch (e) { console.error('[172] team power hud failed', e); }
      return h;
    };
    window.renderHud = renderHud;
  } catch (e) {
    console.error('[172] wrap renderHud failed', e);
  }
})();
