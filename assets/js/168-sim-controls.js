/* ============================================================
 * 168 · 常规赛模拟控制
 *   · 模拟下一场：只推进 1 场
 *   · 连续模拟：持续推进，可随时暂停
 *   · 事件/伤病/交易/赛季节点会自动停下
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v168SimControls) return;
  window.__v168SimControls = true;

  function canStep() {
    try {
      return !!(typeof career !== 'undefined' && career && !career.retired
        && career.stage === 'regular'
        && typeof ui !== 'undefined' && ui
        && ui.screen === 'career'
        && !ui.modal && !ui.storyEvent);
    } catch (e) { return false; }
  }

  window.v168SimNext = function () {
    try {
      if (!canStep()) return;
      if (ui.sim) stopSim();
      if (career.games >= 82) {
        stopSim();
        if (typeof finishRegular === 'function') finishRegular();
        return;
      }
      simulateGame();
    } catch (e) {
      console.error('[168] sim next failed', e);
    }
  };

  var style = document.createElement('style');
  style.id = 'v168-sim-style';
  style.textContent = [
    '.v26-simbar{grid-template-columns:1fr!important}',
    '.v26-simbar>.v26-bean-card,.v26-simbar>.functional-track{grid-column:1/-1!important}',
    '.v168-simctl{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px;width:100%!important;grid-column:1/-1!important}',
    '.v168-next,.v168-run{height:50px;border:0;border-radius:16px;font-size:13px;font-weight:1000;font-family:inherit;cursor:pointer;transition:transform .12s,filter .12s}',
    '.v168-next:active,.v168-run:active{transform:scale(.985)}',
    '.v168-next{background:linear-gradient(135deg,#ffd23f,#f0a92e);color:#171208}',
    '.v168-run{background:#26303c;color:#e8ecf1;border:1px solid #3a4655}',
    '.v168-run.pause{background:#3a2727;color:#ffc0c0;border-color:#6b3a3a}',
    '.v168-simleft{grid-column:1/-1;text-align:center;font-size:9px;color:#8fa1b5;margin-top:-2px}'
  ].join('');
  document.head.appendChild(style);

  var prevRegularView = regularView;
  regularView = function () {
    var h = prevRegularView.apply(this, arguments);
    try {
      if (!career || career.stage !== 'regular') return h;
      var left = Math.max(0, 82 - (Number(career.games) || 0));
      var run = ui.sim
        ? '<button class="v168-run pause" onclick="toggleSim()">Ⅱ 暂停连续</button>'
        : '<button class="v168-run" onclick="toggleSim()">⏩ 连续模拟</button>';
      var bar = '<div class="v168-simctl">'
        + '<button class="v168-next" onclick="v168SimNext()">▶ 模拟下一场</button>'
        + run
        + '<span class="v168-simleft">剩余 ' + left + ' 场 · 遇到剧情/伤病/交易会自动停下</span>'
        + '</div>';
      if (h.indexOf('v221-simctl') >= 0) {
        h = h.replace(/<div class="v221-simctl[^"]*">[\s\S]*?<\/div><\/div>/, bar);
      } else if (h.indexOf('v26-simbar') >= 0) {
        h = h.replace(/<div class="v26-simbar">[\s\S]*?<\/div><\/div>/, bar);
      }
    } catch (e) {
      console.error('[168] regularView failed', e);
    }
    return h;
  };
  window.regularView = regularView;
})();
