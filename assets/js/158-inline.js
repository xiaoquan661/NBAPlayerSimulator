
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

  /* 云端进度统一由 058-v167-cloud-save.js 负责（LampsPlatform.saveGameProgress /
     getGameProgress），这里不再重复写云，避免同一次保存产生两条记录。 */

  /* ---------- 云端排行：生涯总分 ---------- */
  function lampsScore() {
    try {
      if (typeof v81TotalScore === 'function') {
        var input = null;
        try { if (typeof v81CurrentInput === 'function') input = v81CurrentInput(); } catch (e) {}
        var s = v81TotalScore(input || career);
        if (s && isFinite(s.total)) return Math.max(0, Math.round(s.total));
      }
    } catch (e) {}
    try { return Math.max(0, Math.round((career.ovr || 60) * 10 + (career.seasonNo || 1) * 50)); } catch (e) { return 0; }
  }
  var lastSubmitted = -1;
  function lampsRankState() {
    if (!career) return null;
    if (!career.lampsRank || typeof career.lampsRank !== 'object') career.lampsRank = { status: 'idle', score: 0 };
    return career.lampsRank;
  }
  function lampsSubmit(force) {
    try {
      if (!career) return Promise.resolve(false);
      var st = lampsRankState();
      var score = lampsScore();
      if (!lampsReady()) {
        st.status = 'unavailable';
        st.message = 'Lamps 云端排行需在 Lamps 内打开后可用';
        return Promise.resolve(false);
      }
      if (score <= 0) {
        st.status = 'idle';
        return Promise.resolve(false);
      }
      if (!force && (st.status === 'submitting' || st.status === 'error' || st.status === 'unavailable'
        || (st.status === 'ok' && Number(st.score) >= score))) {
        return Promise.resolve(false);
      }
      st.status = 'submitting';
      st.score = score;
      st.message = '';
      st.rank = null;
      st.best = null;
      st.at = Date.now();
      if (career.retired && typeof render === 'function') {
        setTimeout(function () { try { render(); } catch (e) {} }, 0);
      }
      return window.LampsPlatform.submitLeaderboardScore(score, '', {
        season: career.seasonYear || 0, seasonNo: career.seasonNo || 1, ovr: career.ovr || 0, team: career.team || ''
      }).then(function (res) {
        if (res && res.ok === true) {
          lastSubmitted = score;
          st.status = 'ok';
          st.score = score;
          st.action = (res.data && res.data.action) || '';
          st.at = Date.now();
          return window.LampsPlatform.getMyLeaderboardRecord('').then(function (r3) {
            if (r3 && r3.ok && r3.data && r3.data.record) {
              st.rank = r3.data.record.rank;
              st.best = r3.data.record.score;
            }
            if (career.retired && typeof render === 'function') render();
            return true;
          }).catch(function () {
            if (career.retired && typeof render === 'function') render();
            return true;
          });
        }
        st.status = 'error';
        st.message = (res && res.message) || '提交失败，请稍后重试';
        st.at = Date.now();
        if (career.retired && typeof render === 'function') render();
        return false;
      }).catch(function (e) {
        st.status = 'error';
        st.message = (e && e.message) || '提交失败，请稍后重试';
        st.at = Date.now();
        if (career.retired && typeof render === 'function') render();
        return false;
      });
    } catch (e) { return Promise.resolve(false); }
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
      var totalCount = null, myRecord = null;
      function paintInfo() {
        if (!info) return;
        if (myRecord) {
          info.textContent = '我的最佳：#' + myRecord.rank + ' · ' + myRecord.score + ' 分'
            + (totalCount != null ? ' · 共 ' + totalCount + ' 人' : '');
        } else if (totalCount != null) {
          info.textContent = '共 ' + totalCount + ' 人上榜';
        }
      }
      window.LampsPlatform.getLeaderboardInfo().then(function (r2) {
        if (r2 && r2.ok && r2.data) totalCount = r2.data.totalCount || 0;
        paintInfo();
      }).catch(function () {});
      window.LampsPlatform.getMyLeaderboardRecord().then(function (r3) {
        myRecord = r3 && r3.ok && r3.data ? r3.data.record : null;
        paintInfo();
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

  function escRank(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function lampsRetireStrip() {
    if (!career || !career.retired) return '';
    var st = career.lampsRank || { status: 'idle' };
    if (!lampsReady()) {
      return '<div class="lamps-retire-strip na"><div><b>LAMPS CLOUD RANKING</b>'
        + '<span>Lamps 云端排行需在 Lamps 内打开后可用</span></div></div>';
    }
    if (st.status === 'submitting') {
      return '<div class="lamps-retire-strip pending"><div><b>LAMPS CLOUD RANKING</b>'
        + '<span>正在提交 Lamps 云端排行 · ' + Number(st.score || 0) + ' 分…</span></div></div>';
    }
    if (st.status === 'ok') {
      var line = 'Lamps 云端排行已提交 · 本局 ' + Number(st.score || 0) + ' 分';
      if (st.rank) line += ' · 我的最佳 #' + st.rank;
      if (st.best != null && Number(st.best) > Number(st.score || 0)) line += '（' + st.best + ' 分）';
      return '<div class="lamps-retire-strip ok"><div><b>LAMPS CLOUD RANKING</b>'
        + '<span>' + line + '</span></div></div>';
    }
    if (st.status === 'error') {
      return '<div class="lamps-retire-strip err"><div><b>LAMPS CLOUD RANKING</b>'
        + '<span>Lamps 云端排行提交失败：' + escRank(st.message || '请稍后重试') + '</span></div>'
        + '<button onclick="v158RetryLampsRank()">重试</button></div>';
    }
    return '<div class="lamps-retire-strip pending"><div><b>LAMPS CLOUD RANKING</b>'
      + '<span>正在准备提交 Lamps 云端排行…</span></div></div>';
  }

  window.v158RetryLampsRank = function () {
    try { return lampsSubmit(true); } catch (e) { return Promise.resolve(false); }
  };
  window.__v158Debug = { strip: lampsRetireStrip, submit: lampsSubmit, retry: window.v158RetryLampsRank };

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
    /* 退役页 Lamps 云端排行状态条 */
    '.lamps-retire-strip{margin:12px 14px;padding:12px 14px;border-radius:16px;background:#1c2129;border:1px solid #2f3742;display:flex;align-items:center;gap:10px;justify-content:space-between;flex-wrap:wrap;line-height:1.5}',
    '.lamps-retire-strip b{display:block;color:#ffd23f;font-size:8.5px;letter-spacing:.14em;font-weight:900}',
    '.lamps-retire-strip span{display:block;margin-top:3px;color:#e8ecf1;font-size:11.5px}',
    '.lamps-retire-strip.pending{border-color:#ffd23f44;background:#211f18}',
    '.lamps-retire-strip.pending span{color:#ffe08a}',
    '.lamps-retire-strip.ok{border-color:#2f7d5066;background:#16251d}',
    '.lamps-retire-strip.ok span{color:#8fe0b0}',
    '.lamps-retire-strip.err{border-color:#a34b4b77;background:#241719}',
    '.lamps-retire-strip.err span{color:#ffb4b4}',
    '.lamps-retire-strip.na{opacity:.82}',
    '.lamps-retire-strip button{flex:none;border:1px solid #ffd23f66;background:#ffd23f12;color:#ffd23f;border-radius:999px;padding:7px 11px;font-size:10px;font-weight:900}',
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

  /* 退役页：用 Lamps 云端排行状态条替换旧平台提示条。 */
  try {
    var prevRetiredRank = renderRetired;
    if (typeof prevRetiredRank === 'function') {
      renderRetired = function () {
        var h = prevRetiredRank.apply(this, arguments);
        try {
          if (typeof h === 'string' && career && career.retired && h.indexOf('lamps-retire-strip') < 0) {
            h += lampsRetireStrip();
          }
        } catch (e) {}
        return h;
      };
      window.renderRetired = renderRetired;
    }
  } catch (e) {}

  try {
    var prevRender3 = render;
    render = function () {
      var r = prevRender3.apply(this, arguments);
      try { lampsAfterRender(); } catch (e) {}
      return r;
    };
  } catch (e) {}
})();
