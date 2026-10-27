/* ============================================================
 * 181 · 球馆夜场 Arena Night
 * 给现有深色 UI 加：球馆环境、球队 accent、事件材质。
 * 只改视觉，不碰数值、剧情、存档。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v181Arena) return;
  window.__v181Arena = true;

  var DEFAULT = ['#ffd23f', '#4d8dff'];
  var TEAM_COLORS = {
    ATL: ['#e03a3e', '#c1d32f'],
    BOS: ['#37b06b', '#ba9653'],
    BKN: ['#c9d2dc', '#8d9bab'],
    CHA: ['#8f6bd8', '#1fb3b8'],
    CHI: ['#e03a3e', '#c9d2dc'],
    CLE: ['#fdbb30', '#a33a5a'],
    DAL: ['#4d8dff', '#b8c4ca'],
    DEN: ['#fec524', '#5d76a9'],
    DET: ['#e03a3e', '#4d8dff'],
    GSW: ['#ffc72c', '#4d8dff'],
    HOU: ['#e03a3e', '#c4ced4'],
    IND: ['#fdbb30', '#4d8dff'],
    LAC: ['#e03a3e', '#4d8dff'],
    LAL: ['#b58cff', '#fdb927'],
    MEM: ['#8fa9dc', '#5d76a9'],
    MIA: ['#ff4d6d', '#f9a01b'],
    MIL: ['#37b06b', '#e8d9b5'],
    MIN: ['#6fa8ff', '#6b8fbd'],
    NOP: ['#d5aa54', '#4d8dff'],
    NYK: ['#4d8dff', '#f58426'],
    OKC: ['#4d8dff', '#ef5b3e'],
    ORL: ['#4d8dff', '#c4ced4'],
    PHI: ['#4d8dff', '#ed174c'],
    PHX: ['#9c7bff', '#e56020'],
    POR: ['#e03a3e', '#9aa3b2'],
    SAC: ['#9c7bff', '#9aa3b2'],
    SAS: ['#c4ced4', '#f0f3f6'],
    TOR: ['#e03a3e', '#c9d2dc'],
    UTA: ['#4d8dff', '#f9a01b'],
    WAS: ['#e8435f', '#4d8dff']
  };

  function hexRgb(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (!isFinite(n)) return '255, 210, 63';
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(', ');
  }

  function teamAbbr() {
    try {
      if (typeof career !== 'undefined' && career && career.team) return career.team;
      if (typeof ui !== 'undefined' && ui && ui.selected && typeof playerBy === 'function') {
        var p = playerBy(ui.selected);
        if (p && p.team) return p.team;
      }
    } catch (e) {}
    return 'NBA';
  }

  function refreshTeam() {
    var abbr = teamAbbr();
    var pal = TEAM_COLORS[abbr] || DEFAULT;
    var body = document.body;
    if (!body) return;
    body.classList.add('v181-arena');
    body.style.setProperty('--v181-primary', pal[0]);
    body.style.setProperty('--v181-primary-rgb', hexRgb(pal[0]));
    body.style.setProperty('--v181-secondary', pal[1]);
    body.style.setProperty('--v181-secondary-rgb', hexRgb(pal[1]));
    body.dataset.v181Team = abbr;
    try {
      body.dataset.v181Screen = (typeof ui !== 'undefined' && ui && ui.screen) || '';
      body.dataset.v181Stage = (typeof career !== 'undefined' && career && career.stage) || '';
    } catch (e) {}
  }

  function arenaBackground() {
    if (document.querySelector('.v181-arena-bg')) return;
    var bg = document.createElement('div');
    bg.className = 'v181-arena-bg';
    bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML = '<i class="v181-light v181-light-a"></i>'
      + '<i class="v181-light v181-light-b"></i>'
      + '<i class="v181-court"></i>'
      + '<i class="v181-crowd"></i>'
      + '<i class="v181-vignette"></i>';
    document.body.insertBefore(bg, document.body.firstChild);
  }

  /* 事件弹窗材质：第一幕更衣室 / 第二幕办公室 / 第三幕发布会 / 结果卡记分牌 */
  try {
    var prevOverlay = renderOverlay;
    if (typeof prevOverlay === 'function') {
      renderOverlay = function () {
        var h = prevOverlay.apply(this, arguments);
        try {
          if (typeof h !== 'string') return h;
          if (ui && ui.storyEvent && ui.storyEvent.__v167) {
            var act = ui.storyEvent.__act || 'prove';
            h = h.replace('class="sheet v167-sheet"', 'class="sheet v167-sheet v181-material-' + act + '"');
          }
          if (ui && ui.modal && ui.modal.kind === 'storyOutcome') {
            h = h.replace('class="sheet v167-outcome"', 'class="sheet v167-outcome v181-material-outcome"');
          }
        } catch (e) {}
        return h;
      };
      window.renderOverlay = renderOverlay;
    }
  } catch (e) {}

  try {
    var prevRender = render;
    render = function () {
      try { refreshTeam(); } catch (e) {}
      return prevRender.apply(this, arguments);
    };
    window.render = render;
  } catch (e) {}

  refreshTeam();
  arenaBackground();
})();