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

  /* 中文排版：按标点/空格找断点，把长句拆成均衡的两到四行，
     避免最后一行只剩一个字。 */
  function draftBreakPoint(chars, target) {
    var punct = '，。；：、！？…—,.!?;:';
    for (var d = 0; d <= 5; d++) {
      var r = target + d;
      if (r < chars.length && punct.indexOf(chars[r]) >= 0) return r + 1;
      var l = target - d;
      if (l > 1 && punct.indexOf(chars[l - 1]) >= 0) return l;
    }
    for (var s = 0; s <= 7; s++) {
      var rs = target + s;
      if (rs < chars.length && chars[rs] === ' ') return rs;
      var ls = target - s;
      if (ls > 0 && chars[ls - 1] === ' ') return ls - 1;
    }
    return target;
  }

  function balancedDraft(text) {
    var chars = Array.from(String(text == null ? '' : text).trim());
    var n = chars.length;
    if (n <= 14) return [chars.join('')];
    var count = n <= 32 ? 2 : n <= 50 ? 3 : 4;
    var cuts = [];
    for (var i = 1; i < count; i++) {
      var target = Math.round(n * i / count);
      var p = draftBreakPoint(chars, target);
      if (p <= 0) p = 1;
      if (p >= n) p = n - 1;
      if (cuts.length && p <= cuts[cuts.length - 1]) p = Math.min(n - 1, cuts[cuts.length - 1] + 1);
      cuts.push(p);
    }
    /* 最后一行少于 3 个字时，把断点往前挪，保证不以单字收尾。 */
    if (cuts.length) {
      var lastStart = cuts[cuts.length - 1];
      if (n - lastStart < 3) cuts[cuts.length - 1] = Math.max(1, n - 3);
    }
    var out = [];
    var start = 0;
    cuts.concat([n]).forEach(function (end) {
      var part = chars.slice(start, end).join('').trim();
      if (part) out.push(part);
      start = end;
    });
    return out.length ? out : [chars.join('')];
  }

  function draftTextHTML(text) {
    return balancedDraft(text).map(esc).join('<br>');
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
      + '<div class="draft-text v175-draft-text">' + draftTextHTML(lines[step]) + '</div>'
      + '<div class="draft-dots">' + dots + '</div>'
      + (last
        ? '<button class="btn v175-draft-start" onclick="nextDraft()">开始职业生涯</button>'
        : '<button class="v175-draft-skip" onclick="v175DraftSkip()">跳过动画，直接进入生涯 ›</button>')
      + '</div></section>';
  }

  window.v175DraftSkip = function () {
    stopAuto();
    try {
      ui.draftStep = Math.max(0, draftLinesNow().length - 1);
      createCareer();
    } catch (e) {
      console.error('[175] draft skip failed', e);
      render();
    }
  };

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
        /* 每段至少停 2 秒，长句再多给一点阅读时间。 */
        var delay = 2000 + Math.min(900, String(lines[i] || '').length * 22);
        timer = setTimeout(tick, delay);
      }
    }
    timer = setTimeout(tick, 1400);
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
    '.draft-inner{position:relative!important}',
    '.v175-draft-text{width:100%!important;max-width:340px!important;margin:0 auto!important;padding:0 4px!important;min-height:170px!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;font-size:clamp(16px,4.8vw,18px)!important;line-height:1.85!important;font-weight:700!important;letter-spacing:.02em!important;overflow-wrap:break-word!important;word-break:normal!important;line-break:strict!important;text-wrap:balance}',
    '.v175-draft-skip{display:block!important;width:100%!important;height:44px!important;margin-top:14px!important;padding:0 12px!important;border-radius:14px!important;border:1px solid #3a4452!important;background:#171d26!important;color:#c3cbd6!important;font-size:11.5px!important;font-weight:800!important;cursor:pointer!important;box-shadow:none!important}',
    '.v175-draft-skip:active{background:#0f141b!important}',
    '.v175-draft-start{width:100%!important;margin-top:24px!important;background:#fff!important;color:#111!important}'
  ].join('');
  document.head.appendChild(st);
})();
