/* ============================================================
 * 175 · 选秀之夜自动播放
 * 选秀台词自动逐段出现；最后一段停在“开始职业生涯”，需要玩家点击。
 * 只改选秀夜的播放方式，不改顺位、球队和选秀结果。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v175DraftAuto) return;
  window.__v175DraftAuto = true;

  var timer = null;
  var prevRenderDraft = renderDraft;

  function stopAuto() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function draftLinesNow() {
    try {
      var p = (typeof currentP === 'function') ? currentP() : null;
      var lines = (typeof draftLines === 'function') ? draftLines(p) : null;
      return Array.isArray(lines) ? lines : [];
    } catch (e) {
      return [];
    }
  }

  function renderDraftAuto() {
    var lines = draftLinesNow();
    if (!lines.length) return prevRenderDraft.apply(this, arguments);
    var step = Math.max(0, Math.min(Number(ui.draftStep) || 0, lines.length - 1));
    var last = step >= lines.length - 1;
    var dots = lines.map(function (_, i) {
      return '<i class="' + (i <= step ? 'on' : '') + '"></i>';
    }).join('');
    return '<section class="draft"><div class="draft-inner">'
      + asset('【素材位：选秀之夜舞台背景】', '用途：选秀舞台/灯光/观众虚化背景；不要具体球员和文字')
      + '<div class="draft-text v175-draft-text">' + esc(lines[step]) + '</div>'
      + '<div class="draft-dots">' + dots + '</div>'
      + (last
        ? '<button class="btn v175-draft-start" onclick="nextDraft()">开始职业生涯</button>'
        : '')
      + '</div></section>';
  }

  function play() {
    stopAuto();
    ui.draftStep = 0;
    render();
    var lines = draftLinesNow();
    if (!lines.length) return;
    var i = 0;
    function tick() {
      if (typeof ui === 'undefined' || ui.screen !== 'draft') {
        stopAuto();
        return;
      }
      if (i >= lines.length - 1) {
        stopAuto();
        return;
      }
      i++;
      ui.draftStep = i;
      render();
      if (i < lines.length - 1) {
        var delay = 1000 + Math.min(600, String(lines[i] || '').length * 18);
        timer = setTimeout(tick, delay);
      }
    }
    timer = setTimeout(tick, 900);
  }

  try {
    var prevEnterDraft = enterDraft;
    enterDraft = function () {
      prevEnterDraft.apply(this, arguments);
      if (typeof ui !== 'undefined' && ui.screen === 'draft') play();
    };
    window.enterDraft = enterDraft;
  } catch (e) {
    console.error('[175] enterDraft wrap failed', e);
  }

  try {
    renderDraft = renderDraftAuto;
    window.renderDraft = renderDraft;
  } catch (e) {
    console.error('[175] renderDraft wrap failed', e);
  }

  try {
    var prevCreateCareer = createCareer;
    createCareer = function () {
      stopAuto();
      return prevCreateCareer.apply(this, arguments);
    };
    window.createCareer = createCareer;
  } catch (e) {
    console.error('[175] createCareer wrap failed', e);
  }

  var st = document.createElement('style');
  st.id = 'v175-draft-auto-style';
  st.textContent = [
    '.v175-draft-text{min-height:150px!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center}',
    '.v175-draft-start{width:100%!important;margin-top:24px!important;background:#fff!important;color:#111!important}'
  ].join('');
  document.head.appendChild(st);
})();
