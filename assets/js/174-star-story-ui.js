/* ============================================================
 * 174 · 明星模式主线页 UI 统一
 * 把明星模式的主线 / 命运轨迹页换成自建球员（167）的 .v167-* 卡面。
 * 只改渲染，不改事件内容、触发条件、路线判定和存档状态。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v174StarStoryUI) return;
  window.__v174StarStoryUI = true;

  function isCustom() {
    try {
      return typeof career !== 'undefined' && career && career.playerId === 'custom';
    } catch (e) { return false; }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function safe(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }

  function starStoryView() {
    var p = safe(currentP, null) || {};
    var arr = (typeof campaigns !== 'undefined' && campaigns && campaigns[career.playerId]) || [];
    var total = arr.length || 0;
    var idx = Math.min(Number(career.storyIndex) || 0, total);
    var route = safe(function () { return v28Route(); }, '未定');
    var goal = safe(function () { return storyGoal(); }, {}) || {};
    var tease = safe(function () { return v28NextTease(); }, '');
    var end = safe(function () { return mainlineEnding(); }, ['', '']) || ['', ''];
    var logs = (career.storyLog || []).slice().reverse();
    var recent = logs.slice(0, 6);
    var exclusive = !!career.exclusive;

    var head = exclusive
      ? '<div class="v167-story-head"><small>专属故事</small>'
        + '<h2>' + esc(p.zh || '') + ' · ' + esc(route) + '</h2>'
        + '<p>具体人名 + 历史锚点 + 多年连续分支。前面的选择会改变后面的人物关系、台词、球队去向和结局。</p></div>'
      : '<div class="v167-story-head"><small>纯生涯模拟</small>'
        + '<h2>' + esc(p.zh || '') + ' · 纯生涯模拟</h2>'
        + '<p>本局没有解锁专属主线。你仍然会遇到赛季事件，但不会出现专属人物关系、剧情分支和专属结局。</p></div>';

    var destiny = '<div class="v167-destiny-card"><small>命运轨迹</small>'
      + '<h3>' + esc(p.zh || '') + ' · ' + esc(route) + '</h3>'
      + '<p>' + esc(goal.title || '当前章节') + '：' + esc(goal.goal || tease || '继续推进赛季，下一段剧情会读取你之前的选择。') + '</p>'
      + '<span>核心章节 ' + idx + '/' + total + ' · 剧情节点 ' + logs.length + ' 个'
      + (exclusive ? ' · ' + esc((p.exclusive && p.exclusive.n) || '专属天赋') + ' 正在生效' : ' · 纯生涯模拟') + '</span></div>';

    if (!exclusive) {
      var ex = p.exclusive || {};
      var decline = (career.v30 && career.v30.decline) || {};
      return '<section class="v167-story-view">' + head
        + '<div class="v167-origin-card"><small>专属故事未解锁</small>'
        + '<b>' + esc(ex.n || '专属故事未解锁') + '</b>'
        + '<p>你没有解锁专属天赋，因此本局只有纯模拟，不会遇到' + esc(ex.cast || '专属人物') + '等真人关系剧情，也不会出现分支树。</p>'
        + '<span>未解锁 · 仍可继续纯生涯模拟</span>'
        + '<button class="v167-origin-btn" style="margin-top:10px" onclick="unlockStoryMidCareer()">🎬 看奖励视频 · 解锁专属剧情 + 专属天赋</button></div>'
        + '<div class="v167-origin-card"><small>PURE 纯生涯模拟</small>'
        + '<b>' + (decline.active ? '下滑通道 · 正在重走老路' : '生涯状态：稳定') + '</b>'
        + '<p>你仍然会遇到赛季事件。它们看起来是小事，但连续选错会让你一步步走回这位状元的老路。</p>'
        + '<span>连续失误 ' + (Number(decline.streak) || 0) + '/3 · 挽救窗口 '
        + (decline.active ? Math.max(0, Number(decline.rescue) || 0) : '—') + '</span></div>'
        + '</section>';
    }

    var chapters = arr.map(function (raw, i) {
      var e = {};
      try { e = v28Event(raw) || {}; } catch (err) { e = raw || {}; }
      var done = i < idx;
      var on = i === idx;
      var rec = null;
      for (var j = logs.length - 1; j >= 0; j--) {
        if (logs[j] && logs[j].title === e.t) { rec = logs[j]; break; }
      }
      var title = (done || on) ? (e.t || ('第 ' + (i + 1) + ' 章')) : '??? · 尚未揭晓';
      var small = done ? '已完成 · 第 ' + (i + 1) + ' 章' : on ? '当前章节' : '后续分支';
      var sceneLine = (done || on) && e.scene ? e.scene + ' · ' : '';
      var body = done
        ? (sceneLine + '你选择：' + ((rec && rec.choice) || '已完成') + ' · 路线：' + ((rec && rec.route) || route))
        : on ? (sceneLine + (tease || '达到条件后触发。'))
        : (i === idx + 1 ? '完成当前章后才会揭晓' : '这条分支仍被锁在未来');
      var em = done && rec && rec.impact ? rec.impact : '';
      var cls = done ? 'done' : on ? 'active' : '';
      var status = done ? '✓' : on ? '当前' : '待解锁';
      return '<div class="v167-main-act ' + cls + '">'
        + '<div class="v167-main-act-top"><small>' + esc(small) + '</small>'
        + '<b>' + esc(title) + '</b><span>' + esc(status) + '</span></div>'
        + '<p>' + esc(body) + '</p>'
        + (em ? '<em>' + esc(em) + '</em>' : '')
        + '</div>';
    }).join('');

    var w = career.worldline || {};
    var div = w.divergence;
    var divCard = div
      ? '<div class="v167-origin-card on"><small>首个历史分歧 · ' + esc(div.label || '') + '</small>'
        + '<b>' + esc(div.title || '') + '</b><p>' + esc(div.reason || '') + '</p></div>'
      : '';

    var saga = '';
    try {
      if (typeof v211Init === 'function') v211Init();
      var seasons = (career.seasonStorySeasons || []).slice().sort(function (a, b) { return b - a; });
      var sagaRows = seasons.map(function (sn) {
        var items = (career.storyLog || []).filter(function (x) { return x.seasonNo === sn; });
        return '<div class="v167-log-row"><b>YEAR ' + esc(sn) + '</b><span>'
          + esc(items.map(function (x) { return x.title; }).join(' / ') || '已写入世界线') + '</span></div>';
      }).join('');
      var sig = (career.signatureGames || []).slice(0, 6).map(function (x) {
        return '<div class="v167-log-row"><b>' + esc(x.season || '') + '</b><span>'
          + esc(x.title || '') + (x.detail ? ' · ' + esc(x.detail) : '') + '</span></div>';
      }).join('');
      if (sagaRows || sig) saga = '<div class="v167-log"><h3>赛季故事</h3>' + sagaRows + sig + '</div>';
    } catch (e2) {}

    var logBlock = recent.length
      ? '<div class="v167-log"><h3>最近的选择</h3>' + recent.map(function (x) {
        return '<div class="v167-log-row"><b>' + esc(x.label || '') + '</b>'
          + '<span>' + esc(x.title || '') + '</span>'
          + '<em>' + esc(x.choice || '') + (x.impact ? ' · ' + esc(x.impact) : '') + '</em></div>';
      }).join('') + '</div>'
      : '';

    var ex2 = p.exclusive || {};
    var runtime = career.exclusiveRuntime || {};
    var exclusiveCard = '<div class="v167-origin-card on"><small>专属天赋 · 直到退役</small>'
      + '<b>' + esc(ex2.n || '专属天赋') + '</b>'
      + '<p>' + esc(ex2.mechanism || ex2.d || '') + '</p>'
      + '<span>本季触发 ' + (Number(runtime.seasonProcs) || 0) + ' 次 · 生涯累计 '
      + (Number(runtime.procs) || 0) + ' 次</span></div>';

    var endCard = end && end[0]
      ? '<div class="v167-origin-card"><small>当前世界线评价</small>'
        + '<b>' + esc(end[0]) + '</b><p>' + esc(end[1] || '') + '</p></div>'
      : '';

    return '<section class="v167-story-view">' + head + destiny
      + '<div class="v167-main-list">' + chapters + '</div>'
      + divCard + exclusiveCard + saga + logBlock + endCard + '</section>';
  }

  function starMainlineCard() {
    var arr = (typeof campaigns !== 'undefined' && campaigns && campaigns[career.playerId]) || [];
    var total = arr.length || 0;
    var idx = Math.min((Number(career.storyIndex) || 0) + 1, total);
    var goal = safe(function () { return storyGoal(); }, {}) || {};
    var route = safe(function () { return v28Route(); }, '未定');
    var tease = safe(function () { return v28NextTease(); }, '');
    var p = safe(currentP, null) || {};
    var ex = p.exclusive || {};

    if (!career.exclusive) {
      return '<section class="mainline-now v167-mainline-now">'
        + '<header><small>纯生涯模拟</small><span>未解锁</span></header>'
        + '<h3>纯生涯模拟</h3>'
        + '<p><b>本局没有专属主线。</b>你仍会遇到赛季随机事件，但不会出现专属人物、分支树和专属结局。</p>'
        + '<div class="mainline-meta"><b>' + esc(ex.n || '专属故事未解锁') + '</b>'
        + '<button onclick="stopSim();ui.tab=\'story\';render()">查看主线 →</button></div>'
        + '<button class="v167-origin-btn" style="margin-top:10px" onclick="unlockStoryMidCareer()">🎬 看奖励视频 · 解锁专属剧情 + 专属天赋</button>'
        + '</section>';
    }

    var card = '<section class="mainline-now v167-mainline-now">'
      + '<header><small>专属主线 · ' + idx + '/' + total + '</small>'
      + '<span>' + (Number(goal.pct) || 0) + '%</span></header>'
      + '<h3>' + esc(goal.title || '当前主线') + '</h3>'
      + '<p><b>接下来：</b>' + esc(tease || goal.goal || '继续推进赛季，下一段剧情会读取你之前的选择。')
      + '<br><b>当前路线：</b>' + esc(route) + '</p>'
      + '<div class="mainline-progress"><i style="width:' + (Number(goal.pct) || 0) + '%"></i></div>'
      + '<div class="mainline-meta"><b>' + esc(ex.n || '专属天赋') + '</b>'
      + '<button onclick="stopSim();ui.tab=\'story\';render()">查看主线 →</button></div>'
      + '</section>';

    var seasonPanel = '';
    try {
      if (career.exclusive && typeof v211HasSeasonStory === 'function') {
        var done = v211HasSeasonStory();
        var logs = (career.storyLog || []).filter(function (x) { return x.seasonNo === career.seasonNo; });
        seasonPanel = '<div class="v167-origin-card ' + (done ? 'on' : '') + '">'
          + '<small>本季专属故事</small>'
          + '<b>' + esc(safe(seasonLabel, '')) + ' · 本季专属剧情</b>'
          + '<p>' + esc(done ? ((logs[logs.length - 1] || {}).title || '本季剧情已经改变世界线')
            : '本赛季一定会出现至少 1 个专属剧情。它会读取当前球队、合同、数据、关系和此前分支。') + '</p>'
          + '<span>' + (done ? '已发生' : '待触发') + '</span></div>';
      }
    } catch (e) {}

    return card + seasonPanel;
  }

  try {
    var prevStoryView = storyView;
    storyView = function () {
      try {
        if (!isCustom() && typeof career !== 'undefined' && career) return starStoryView();
      } catch (e) {
        console.error('[174] star story view failed', e);
      }
      return prevStoryView.apply(this, arguments);
    };
    window.storyView = storyView;
  } catch (e) {
    console.error('[174] storyView wrap failed', e);
  }

  try {
    var prevMainline = mainlineNowCard;
    mainlineNowCard = function () {
      try {
        if (!isCustom() && typeof career !== 'undefined' && career) return starMainlineCard();
      } catch (e) {
        console.error('[174] star mainline card failed', e);
      }
      return prevMainline.apply(this, arguments);
    };
    window.mainlineNowCard = mainlineNowCard;
  } catch (e) {
    console.error('[174] mainlineNowCard wrap failed', e);
  }
})();
