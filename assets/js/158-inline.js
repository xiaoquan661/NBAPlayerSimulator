
/* ============================================================
 * Lamps 平台接入（按 lamps 能力包规范）
 *   云端进度：window.LampsPlatform.saveGameProgress / getGameProgress
 *   云端排行：window.LampsPlatform.submitLeaderboardScore / getLeaderboard ...
 *   激励视频：window.LampsGame.showRewardedVideo（发奖只认 ok === true）
 * 虎扑 ColorboxAI / WebGuard / 本地云存档垫片已全部移除。
 * ============================================================ */
(function () {
  'use strict';

  function lampsReady() {
    try {
      return String(navigator.userAgent || '').indexOf('LampsSDK') !== -1
        && window.LampsPlatform
        && typeof window.LampsPlatform.saveGameProgress === 'function';
    } catch (e) { return false; }
  }

  /* ---------- 云端进度：save() 后防抖推送 ---------- */
  var pushTimer = null, pushing = false;
  function activeKey() {
    try {
      if (typeof window.__v81HostKeyForSlot === 'function') {
        var k = window.__v81HostKeyForSlot(); if (k) return String(k);
      }
    } catch (e) {}
    return 'career_save';
  }
  function pushProgress() {
    if (!lampsReady() || pushing || !career) return;
    pushing = true;
    var payload = null;
    try {
      var text = JSON.stringify(career);
      var packed = window.__v129StorageCodec ? window.__v129StorageCodec.pack(text) : text;
      payload = { game_payload: { slot: activeKey(), text: packed, season: career.seasonNo || 1, year: career.seasonYear || 0, ovr: career.ovr || 0 } };
    } catch (e) { pushing = false; return; }
    window.LampsPlatform.saveGameProgress(payload).then(function (res) {
      pushing = false;
      if (!res || res.ok !== true) {
        try { if (res && res.message) console.warn('[Lamps] 进度云端保存失败：' + res.message); } catch (e) {}
      }
    }).catch(function () { pushing = false; });
  }
  function queueProgress() {
    if (!lampsReady()) return;
    if (pushTimer) { try { clearTimeout(pushTimer); } catch (e) {} }
    pushTimer = setTimeout(function () { pushTimer = null; pushProgress(); }, 2500);
  }
  try {
    var prevSave = save;
    save = function () {
      var r = prevSave.apply(this, arguments);
      try { queueProgress(); } catch (e) {}
      return r;
    };
  } catch (e) {}

  /* ---------- 开局恢复：本机无存档且云端有进度时读回 ---------- */
  (function restoreFromCloud() {
    try {
      if (!lampsReady()) return;
      if (localStorage.getItem('save_bust_no1_v4')) return;
      window.LampsPlatform.getGameProgress().then(function (res) {
        try {
          if (!res || res.ok !== true || !res.data || !res.data.record) return;
          var rec = res.data.record.gamePayload || {};
          if (typeof rec.text !== 'string' || !rec.text) return;
          var plain = window.__v129StorageCodec ? window.__v129StorageCodec.unpack(rec.text) : rec.text;
          var data = JSON.parse(plain);
          if (!data || !data.playerId) return;
          localStorage.setItem('save_bust_no1_v4', plain);
          location.reload();
        } catch (e) {}
      }).catch(function () {});
    } catch (e) {}
  })();

  /* ---------- 云端排行：生涯总分 ---------- */
  function lampsScore() {
    try {
      if (typeof v81TotalScore === 'function') {
        var s = v81TotalScore(career);
        if (s && isFinite(s.total)) return Math.max(0, Math.round(s.total));
      }
    } catch (e) {}
    try { return Math.max(0, Math.round((career.ovr || 60) * 10 + (career.seasonNo || 1) * 50)); } catch (e) { return 0; }
  }
  var lastSubmitted = -1;
  function lampsSubmit() {
    try {
      if (!lampsReady() || !career || career.retired === undefined) return;
      var score = lampsScore();
      if (score <= lastSubmitted) return;
      window.LampsPlatform.submitLeaderboardScore(score, '', {
        season: career.seasonYear || 0, seasonNo: career.seasonNo || 1, ovr: career.ovr || 0, team: career.team || ''
      }).then(function (res) {
        if (res && res.ok === true) lastSubmitted = score;
        else if (res && res.message) console.warn('[Lamps] 排行榜上报失败：' + res.message);
      }).catch(function () {});
    } catch (e) {}
  }
  try {
    var prevEnd2 = endSeason;
    endSeason = function () {
      var r = prevEnd2.apply(this, arguments);
      try { lampsSubmit(); } catch (e) {}
      return r;
    };
  } catch (e) {}

  /* ---------- 生涯页追加云端排行卡片 ---------- */
  try {
    var prevLegacy = legacyView;
    legacyView = function () {
      var h = prevLegacy.apply(this, arguments);
      try {
        h += '<section class="lamps-rank"><header><small>CLOUD RANKING</small><b>云端排行 · 生涯总分</b><span id="lamps-rank-info"></span></header><div id="lamps-rank-body"><p class="lamps-rank-loading">正在读取云端排行…</p></div></section>';
      } catch (e) {}
      return h;
    };
  } catch (e) {}

  var rankFetchedAt = 0;
  function esc2(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function lampsRenderRank() {
    var box = document.getElementById('lamps-rank-body');
    if (!box || !career) return;
    var info = document.getElementById('lamps-rank-info');
    if (!lampsReady()) {
      if (box.dataset.done !== 'na') { box.dataset.done = 'na'; box.innerHTML = '<p class="lamps-rank-loading">排行榜需在 Lamps 内打开后可用。</p>'; }
      return;
    }
    if (Date.now() - rankFetchedAt < 20000 && box.dataset.done === '1') return;
    rankFetchedAt = Date.now();
    box.dataset.done = '0';
    window.LampsPlatform.getLeaderboard().then(function (board) {
      if (!document.getElementById('lamps-rank-body')) return;
      if (!board || board.ok !== true) {
        box.innerHTML = '<p class="lamps-rank-loading">' + esc2((board && board.message) || '读取榜单失败') + '</p>';
        return;
      }
      var list = (board.data && board.data.list) || [];
      var rows = list.map(function (it) {
        return '<div class="lamps-rank-row' + (it.isCurrentUser ? ' me' : '') + '"><b>#' + it.rank + '</b><span>' + esc2(it.nickname || '玩家') + '</span><strong>' + it.score + '</strong></div>';
      }).join('');
      box.innerHTML = rows
        ? rows
        : '<p class="lamps-rank-loading">还没有人上榜，打完一个赛季就会写入云端排行。</p>';
      box.dataset.done = '1';
      if (info) {
        window.LampsPlatform.getLeaderboardInfo().then(function (r2) {
          if (info && r2 && r2.ok && r2.data) info.textContent = '共 ' + (r2.data.totalCount || 0) + ' 人上榜';
        }).catch(function () {});
      }
      window.LampsPlatform.getMyLeaderboardRecord().then(function (r3) {
        var rec = r3 && r3.ok && r3.data ? r3.data.record : null;
        if (info && rec) info.textContent = '我的最佳：#' + rec.rank + ' · ' + rec.score + ' 分' + (list.length ? ' · 共 ' + (list.length ? '' : '') : '');
      }).catch(function () {});
    }).catch(function () {});
  }

  function lampsAfterRender() {
    try {
      if (document.getElementById('lamps-rank-body')) lampsRenderRank();
      /* 退役时上报最终总分 */
      if (career && career.retired) lampsSubmit();
    } catch (e) {}
  }

  /* ---------- 生涯评分相关旧版米色卡片 → 深夜主题 ---------- */
  var css = document.createElement('style');
  css.textContent = [
    /* v81 生涯评分 / 退役报告 */
    '.v81-retire{background:#1c2129!important;border-color:#2f3742!important;box-shadow:none!important}',
    '.v81-oc,.v81-parts,.v81-stats>div,.v81-honors{background:#212730!important;border-color:#2f3742!important}',
    '.v81-oc b,.v81-parts header b,.v81-stats b,.v81-honors p{color:#e8ecf1!important}',
    '.v81-oc small,.v81-oc span,.v81-parts header small,.v81-parts header span,.v81-bar>span,.v81-stats span,.v81-honors small{color:#9aa3b2!important}',
    '.v81-parts header span{color:#9aa3b2!important}',
    '.v81-bar>i{background:#181c23!important;border:1px solid #2f3742!important}',
    '.v81-bar>em{color:#ffd23f!important}',
    '.v81-honors{border-style:dashed!important}',
    '.v81-honors p b{color:#ffd23f!important}',
    '.v81-slots{background:#1c2129!important;border-color:#2f3742!important}',
    '.v81-slots header b{color:#e8ecf1!important}',
    /* 保存存档按钮与退役工具条 */
    '.v170-save-button{background:#212730!important;border-color:#2f3742!important;color:#ffd23f!important}',
    '.v170-retired-tools{background:transparent!important}',
    /* Lamps 云端排行卡片 */
    '.lamps-rank{margin-top:14px;padding:14px;border-radius:20px;background:#1c2129;border:1px solid #2f3742}',
    '.lamps-rank header{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:10px}',
    '.lamps-rank header small{color:#ffd23f;letter-spacing:2px;font-size:9px}',
    '.lamps-rank header b{color:#ffffff;font-size:14px}',
    '.lamps-rank header span{margin-left:auto;color:#9aa3b2;font-size:9.5px}',
    '.lamps-rank-row{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;border-bottom:1px solid #2a3038;font-size:12px}',
    '.lamps-rank-row:last-child{border-bottom:0}',
    '.lamps-rank-row b{width:34px;color:#ffd23f;font-size:11px;flex:none}',
    '.lamps-rank-row span{flex:1;min-width:0;color:#e8ecf1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.lamps-rank-row strong{color:#e8ecf1;font-size:13px;font-variant-numeric:tabular-nums}',
    '.lamps-rank-row.me{background:#ffd23f12;outline:1px solid #ffd23f44}',
    '.lamps-rank-row.me span{color:#ffe08a}',
    '.lamps-rank-loading{color:#9aa3b2;font-size:11.5px;text-align:center;padding:14px 0;margin:0}',
    /* 云存档槽加载/冲突提示（旧版米色） */
    '.v178-loading{background:#1c2129!important;border-color:#2f3742!important;color:#e8ecf1!important}',
    '.v178-loading span{color:#9aa3b2!important}',
    '.v178-spinner{border-color:#2f3742!important;border-top-color:#ffd23f!important}',
    '.v178-loading-card{background:#1c2129!important;border-color:#2f3742!important}',
    '.v178-loading-card>small,.v178-loading-card p,.v178-cache-name{color:#9aa3b2!important}',
    '.v178-loading-title{color:#ffd23f!important}',
    '.v178-loading-card button{background:#212730!important;border-color:#2f3742!important;color:#e8ecf1!important}',
    '.v178-conflict{background:#212730!important;border-color:#ffd23f55!important;color:#e8ecf1!important}',
    '.v178-conflict small{color:#9aa3b2!important}',
    '.v178-conflict .v178-local{background:#1c2129!important;color:#9aa3b2!important;border-color:#2f3742!important}'
  ].join('');
  document.head.appendChild(css);

  try {
    var prevRender3 = render;
    render = function () {
      var r = prevRender3.apply(this, arguments);
      try { lampsAfterRender(); } catch (e) {}
      return r;
    };
  } catch (e) {}
})();
