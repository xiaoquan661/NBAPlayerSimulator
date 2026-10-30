/* ============================================================
 * 173 · 明星模式事件 UI 统一
 * 把明星模式的事件 / 结果页换成自建球员（167）的 .v167-* 样式。
 * 只改渲染，不改事件内容、触发条件、属性结算和存档状态。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v173SharedEventUI) return;
  window.__v173SharedEventUI = true;

  function isCustom() {
    try {
      return typeof career !== 'undefined' && career && career.playerId === 'custom';
    } catch (e) { return false; }
  }

  function resolveValue(v, fallback) {
    try {
      if (typeof v216ResolveValue === 'function') return v216ResolveValue(v, fallback);
    } catch (e) {}
    try {
      var guard = 0;
      while (typeof v === 'function' && guard++ < 8) v = v();
    } catch (e) { v = fallback; }
    return v == null ? fallback : v;
  }

  function resolveText(v, fallback) {
    try {
      if (typeof v216ResolveText === 'function') return v216ResolveText(v, fallback || '');
    } catch (e) {}
    var x = resolveValue(v, fallback || '');
    return x == null ? (fallback || '') : String(x);
  }

  function resolveChoices(v) {
    try {
      if (typeof v216ResolveChoices === 'function') return v216ResolveChoices(v);
    } catch (e) {}
    var arr = resolveValue(v, []);
    return Array.isArray(arr) ? arr : [];
  }

  function plain(s) {
    return String(s == null ? '' : s)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?[a-zA-Z][^>]*>/g, '')
      .replace(/\r/g, '');
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function firstSentence(s) {
    s = plain(s).trim();
    if (!s) return '';
    var i = s.search(/[。！？]/);
    return i >= 0 ? s.slice(0, i + 1) : s;
  }

  function meta(ev) {
    var total = 1;
    try { total = ((campaigns && campaigns[career.playerId]) || []).length || 1; } catch (e) {}
    var idx = Math.min((Number(career.storyIndex) || 0) + 1, total);
    var kicker = '专属故事';
    var badge = total > 1 ? idx + '/' + total : '故事';
    // 未解锁专属线的随机事件：保持“赛季事件”语义，不包装成专属剧情。
    if (ev && ev._event) { kicker = '赛季事件'; badge = '随机'; }
    else if (!career.exclusive) { kicker = '赛季事件'; badge = '随机'; }
    else if (ev && ev._sideEvent) { kicker = '支线故事'; badge = '支线'; }
    else if (ev && ev._seasonSaga) { kicker = '本季故事'; badge = '本季'; }
    else if (ev && (ev._saga || ev._longArc || ev._v221Followup)) { kicker = '生涯故事'; badge = '生涯'; }
    return { kicker: kicker, badge: badge };
  }

  function castLine(ev, speaker) {
    var raw = resolveValue(ev && ev.cast, []);
    var list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    return list.map(function (x) { return plain(resolveText(x, '')); })
      .filter(function (x) { return x && x !== speaker; })
      .join(' / ');
  }

  function renderStory(ev) {
    var m = meta(ev);
    var title = plain(resolveText(ev && ev.t, '职业生涯故事'));
    var scene = plain(resolveText(ev && ev.scene, ''));
    var speaker = plain(resolveText(ev && ev.speaker, ''));
    var cast = castLine(ev, speaker);
    var metaLine = [scene, cast, speaker].filter(Boolean).join(' · ');
    var exclusiveName = '';
    if (career.exclusive) {
      try { exclusiveName = (currentP().exclusive && currentP().exclusive.n) || ''; } catch (e) {}
    }
    var lens = exclusiveName
      ? '<div class="v167-lens"><div class="v167-lens-tags"><span>专属 · ' + esc(exclusiveName) + '</span></div></div>'
      : '';
    var bodyText = plain(resolveText(ev && ev.b, ''));
    var body = bodyText.split('\n').filter(function (x) { return String(x).trim(); })
      .map(function (x) { return '<p class="v167-body">' + esc(x) + '</p>'; }).join('');
    var stakes = firstSentence(resolveText(ev && ev.stakes, '这次选择会影响后续故事和关系。'));
    var choices = resolveChoices(ev && ev.c);
    var choicesHtml = choices.map(function (c, i) {
      if (!Array.isArray(c)) return '';
      var label = plain(resolveText(c[0], '继续'));
      return '<button type="button" class="v167-choice" onclick="pickStoryChoice(' + i + ');return false">'
        + '<b>' + esc(label) + '</b>'
        + '</button>';
    }).join('');

    return '<div class="overlay v167-overlay"><div class="sheet v167-sheet"><div class="sheet-handle"></div>'
      + '<div class="v167-top"><div><small>' + esc(m.kicker) + '</small><h2>' + esc(title) + '</h2></div><span>' + esc(m.badge) + '</span></div>'
      + (metaLine ? '<div class="v167-scene">' + esc(metaLine) + '</div>' : '')
      + lens
      + '<div class="v167-copy">' + body + '</div>'
      + (stakes ? '<p class="v167-stakes">' + esc(stakes) + '</p>' : '')
      + '<div class="choice-list v167-choices">' + choicesHtml + '</div>'
      + (choices.length ? '' : '<div class="tiny" style="margin-top:10px">这段故事正在整理，返回赛季后可继续生涯。</div>')
      + '<div class="v167-foot"><span>第 ' + (Number(career.seasonNo) || 1) + ' 季</span></div>'
      + '</div></div>';
  }

  function renderOutcome(data) {
    data = data || {};
    var title = plain(resolveText(data.title, '故事结果'));
    var choice = plain(resolveText(data.choice, ''));
    var effect = plain(resolveText(data.effect, ''));
    var impact = Array.isArray(data.impact)
      ? data.impact.map(function (x) { return plain(resolveText(x, '')); }).filter(Boolean).join(' · ')
      : '';
    var follow = plain(resolveText(data.follow, ''));
    var kicker = '故事结果';
    try { if (!career.exclusive) kicker = '事件结果'; } catch (e) {}
    return '<div class="overlay v167-overlay"><div class="sheet v167-outcome"><div class="sheet-handle"></div>'
      + '<small class="v167-kicker">' + esc(kicker) + '</small>'
      + '<h2>' + esc(title) + '</h2>'
      + (choice ? '<p class="v167-pick">你选了：<b>' + esc(choice) + '</b></p>' : '')
      + (impact || effect ? '<div class="v167-effect">' + esc(impact || effect) + '</div>' : '')
      + (follow ? '<div class="v167-echo"><b>后面会怎样</b><span>' + esc(follow) + '</span></div>' : '')
      + '<button class="btn primary v167-continue" onclick="ui.modal=null;save();render()">继续这段生涯 →</button>'
      + '</div></div>';
  }

  try {
    var prevOverlay = renderOverlay;
    renderOverlay = function () {
      try {
        // 自建仍由 167 处理；这里只接管明星模式。
        if (isCustom()) return prevOverlay.apply(this, arguments);
        if (typeof career === 'undefined' || !career) return prevOverlay.apply(this, arguments);
        // 未解锁专属线时仍有赛季随机事件，同样套用这套 UI，但标题保留“赛季事件”。
        // 这里只负责渲染，不主动创建事件，原版“不强行弹剧情”的规则不变。

        if (ui.storyEvent) {
          var ev = ui.storyEvent;
          try { if (typeof v28Event === 'function') ev = v28Event(ev); } catch (e) {}
          return renderStory(ev || ui.storyEvent);
        }
        if (ui.modal && ui.modal.kind === 'storyOutcome' && ui.modal.data) {
          return renderOutcome(ui.modal.data);
        }
      } catch (e) {
        console.error('[173] shared story ui failed', e);
      }
      return prevOverlay.apply(this, arguments);
    };
    window.renderOverlay = renderOverlay;
  } catch (e) {
    console.error('[173] wrap renderOverlay failed', e);
  }
})();
