/* ============================================================
 * 186 · Lamps 全服排行榜页面
 * 只读 Lamps 榜单：前 50 名 + 总人数 + 我的最佳排名。
 * 不写 localStorage、不用 fetch，提交仍由 158 在赛季结束/退役时完成。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v186Leaderboard) return;
  window.__v186Leaderboard = true;

  var LB = {
    loading: false,
    list: [],
    mine: null,
    total: null,
    error: '',
    at: 0,
    req: 0,
    back: 'home'
  };

  function hasLamps() {
    try {
      return String(navigator.userAgent || '').indexOf('LampsSDK') !== -1
        && window.LampsPlatform
        && typeof window.LampsPlatform.getLeaderboard === 'function'
        && typeof window.LampsPlatform.getMyLeaderboardRecord === 'function'
        && typeof window.LampsPlatform.getLeaderboardInfo === 'function';
    } catch (e) { return false; }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function num(v, d) {
    v = Number(v);
    return isFinite(v) ? v : d;
  }

  function metaText(it) {
    var d = (it && it.dataLoad) || {};
    var parts = [];
    if (d.seasonNo) parts.push('S' + num(d.seasonNo, ''));
    else if (d.season) parts.push(String(d.season));
    if (d.ovr) parts.push('OVR ' + num(d.ovr, ''));
    if (d.team) parts.push(String(d.team));
    return parts.map(esc).join(' · ');
  }

  function rowHTML(it, index) {
    var rank = num(it && it.rank, index + 1);
    var cls = rank === 1 ? 'top1' : rank === 2 ? 'top2' : rank === 3 ? 'top3' : '';
    var meta = metaText(it);
    return '<div class="lb-row ' + cls + (it && it.isCurrentUser ? ' me' : '') + '">'
      + '<span class="lb-rank">' + (rank ? '#' + rank : '—') + '</span>'
      + '<span class="lb-name">' + esc((it && it.nickname) || '玩家')
      + (meta ? '<small>' + meta + '</small>' : '') + '</span>'
      + '<strong class="lb-score">' + num(it && it.score, 0) + '</strong>'
      + '</div>';
  }

  function mineHTML() {
    var m = LB.mine;
    if (!m) {
      return '<div class="lb-me empty"><div><small>我的排名</small><b>—</b></div>'
        + '<p>本局还没有上榜记录。赛季结束后会自动提交生涯总分。</p></div>';
    }
    var meta = metaText(m);
    return '<div class="lb-me"><div><small>我的最佳</small><b>#' + num(m.rank, '—') + '</b></div>'
      + '<div class="lb-me-score"><b>' + num(m.score, 0) + '</b><span>生涯总分</span></div>'
      + (meta ? '<p>' + meta + '</p>' : '') + '</div>';
  }

  function pageHTML() {
    var total = LB.total == null ? '—' : LB.total;
    var body;
    if (!hasLamps()) {
      body = '<div class="lb-empty">排行榜需要在 Lamps 内打开后读取。<br>在 Lamps 中进入游戏，这里会显示全服玩家的生涯总分排名。</div>';
    } else if (LB.loading && !LB.list.length) {
      body = '<div class="lb-empty">正在读取全服排行榜…</div>';
    } else if (LB.error && !LB.list.length) {
      body = '<div class="lb-error"><b>榜单读取失败</b><span>' + esc(LB.error) + '</span><button onclick="v186ReloadLeaderboard()">重新读取</button></div>';
    } else if (!LB.list.length) {
      body = '<div class="lb-empty">还没有人上榜。<br>打完一个赛季后，你的生涯总分会上报到全服排行榜。</div>';
    } else {
      body = '<div class="lb-list">' + LB.list.map(rowHTML).join('') + '</div>';
    }
    var errorBar = LB.error && LB.list.length
      ? '<div class="lb-error small"><span>' + esc(LB.error) + '</span><button onclick="v186ReloadLeaderboard()">重试</button></div>'
      : '';
    return '<section class="lb-page">'
      + '<header class="lb-top">'
      + '<button class="lb-back" onclick="v186CloseLeaderboard()" aria-label="返回">←</button>'
      + '<div><small>LAMPS GLOBAL RANKING</small><h1>全服排行榜</h1></div>'
      + '<button class="lb-refresh" onclick="v186ReloadLeaderboard()">' + (LB.loading ? '刷新中…' : '刷新') + '</button>'
      + '</header>'
      + '<div class="lb-summary">'
      + '<div><small>上榜人数</small><b>' + total + '</b></div>'
      + '<div><small>榜单口径</small><b>生涯总分</b></div>'
      + '<div><small>展示范围</small><b>前 50</b></div>'
      + '</div>'
      + mineHTML()
      + errorBar
      + body
      + '<p class="lb-note">排名由 Lamps 全服榜单提供 · 赛季结束和退役时自动上报</p>'
      + '</section>';
  }

  function call(name) {
    try {
      return Promise.resolve(window.LampsPlatform[name]());
    } catch (e) {
      return Promise.resolve({ ok: false, message: (e && e.message) || '榜单读取失败' });
    }
  }

  function load(force) {
    if (!hasLamps()) {
      LB.loading = false;
      LB.error = '';
      LB.at = Date.now();
      if (typeof render === 'function') render();
      return;
    }
    if (LB.loading) return;
    if (!force && Date.now() - LB.at < 20000 && (LB.list.length || LB.total != null)) return;
    LB.loading = true;
    LB.error = '';
    if (typeof render === 'function') render();
    var token = ++LB.req;
    Promise.all([call('getLeaderboard'), call('getMyLeaderboardRecord'), call('getLeaderboardInfo')])
      .then(function (res) {
        if (token !== LB.req) return;
        var board = res[0], mine = res[1], info = res[2];
        if (board && board.ok === true) {
          LB.list = (board.data && board.data.list) || [];
          LB.error = '';
        } else {
          LB.list = [];
          LB.error = (board && board.message) || '读取榜单失败';
        }
        LB.mine = (mine && mine.ok === true && mine.data) ? (mine.data.record || null) : null;
        LB.total = (info && info.ok === true && info.data) ? num(info.data.totalCount, 0) : null;
        LB.loading = false;
        LB.at = Date.now();
        if (typeof render === 'function') render();
      })
      .catch(function (e) {
        if (token !== LB.req) return;
        LB.loading = false;
        LB.error = (e && e.message) || '读取榜单失败';
        LB.at = Date.now();
        if (typeof render === 'function') render();
      });
  }

  window.v186OpenLeaderboard = function () {
    try {
      LB.back = (typeof ui !== 'undefined' && ui && ui.screen === 'career') ? 'career' : 'home';
      ui.screen = 'leaderboard';
      render();
      load(false);
    } catch (e) {}
  };
  window.v186CloseLeaderboard = function () {
    try {
      ui.screen = LB.back || 'home';
      render();
    } catch (e) {}
  };
  window.v186ReloadLeaderboard = function () {
    load(true);
  };

  /* 首页入口 */
  try {
    var prevHome = renderHome;
    renderHome = function () {
      var h = prevHome.apply(this, arguments);
      if (h.indexOf('v186-lb-entry') < 0) {
        var entry = '<button class="v186-lb-entry" onclick="v186OpenLeaderboard()">'
          + '<span class="v186-lb-icon">🏅</span>'
          + '<span class="v186-lb-copy"><b>全服排行榜</b><small>查看全服玩家的生涯总分排名</small></span>'
          + '<span class="v186-lb-go">查看 →</span>'
          + '</button>';
        var anchor = '<div class="cover-actions">';
        h = h.indexOf(anchor) >= 0 ? h.replace(anchor, entry + anchor) : h + entry;
      }
      return h;
    };
    window.renderHome = renderHome;
  } catch (e) { console.error('[186] renderHome wrap failed', e); }

  /* 生涯页排行榜卡片加「查看完整榜单」 */
  try {
    var prevLegacy = legacyView;
    legacyView = function () {
      var h = prevLegacy.apply(this, arguments);
      if (h.indexOf('v186-lb-inline') < 0 && h.indexOf('<div id="lamps-rank-body">') >= 0) {
        h = h.replace('<div id="lamps-rank-body">',
          '<button class="v186-lb-inline" onclick="v186OpenLeaderboard()">查看全服完整榜单 →</button><div id="lamps-rank-body">');
      }
      return h;
    };
    window.legacyView = legacyView;
  } catch (e) { console.error('[186] legacyView wrap failed', e); }

  /* 独立页面渲染，不进入原 render 的 screen 分支 */
  try {
    var prevRender = render;
    render = function () {
      try {
        if (typeof ui !== 'undefined' && ui && ui.screen === 'leaderboard') {
          var app = document.getElementById('app');
          if (app) app.innerHTML = pageHTML();
          return;
        }
      } catch (e) {}
      return prevRender.apply(this, arguments);
    };
    window.render = render;
  } catch (e) { console.error('[186] render wrap failed', e); }

  var style = document.createElement('style');
  style.id = 'v186-leaderboard-style';
  style.textContent = [
    '.v186-lb-entry{display:flex;align-items:center;gap:12px;width:calc(100% - 28px);margin:14px 14px 0;padding:13px 14px;border:1px solid rgba(255,210,63,.22);border-radius:18px;background:linear-gradient(135deg,rgba(255,210,63,.10),rgba(16,26,38,.78));color:#fff;text-align:left;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}',
    '.v186-lb-entry:active{transform:scale(.995)}',
    '.v186-lb-icon{width:38px;height:38px;border-radius:13px;background:rgba(255,210,63,.14);display:grid;place-items:center;font-size:19px;flex:none}',
    '.v186-lb-copy{flex:1;min-width:0;display:block}.v186-lb-copy b{display:block;font-size:14px;color:#fff}.v186-lb-copy small{display:block;margin-top:3px;font-size:10.5px;line-height:1.5;color:#9aa3b2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.v186-lb-go{font-size:10.5px;color:#ffd23f;font-weight:900;flex:none;white-space:nowrap}',
    '.lb-page{min-height:100vh;box-sizing:border-box;padding:0 14px 34px;background:linear-gradient(160deg,#111b28,#070b12);color:#e8ecf1}',
    '.lb-top{position:sticky;top:0;z-index:5;display:grid;grid-template-columns:34px 1fr auto;gap:10px;align-items:center;padding:14px 0 12px;background:rgba(7,11,18,.92);backdrop-filter:blur(10px)}',
    '.lb-top small{display:block;font-size:8.5px;letter-spacing:.18em;color:#ffd23f;font-weight:900}',
    '.lb-top h1{font-size:25px;line-height:1.1;margin:4px 0 0;color:#fff}',
    '.lb-back{width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;font-size:15px;cursor:pointer}',
    '.lb-refresh{border:1px solid rgba(255,210,63,.35);border-radius:11px;background:rgba(255,210,63,.12);color:#ffd23f;font-size:10px;font-weight:800;padding:8px 10px;cursor:pointer;white-space:nowrap}',
    '.lb-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:14px 0 10px}',
    '.lb-summary>div{background:#121c28;border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:9px 6px;text-align:center}',
    '.lb-summary small{display:block;font-size:8.5px;color:#8d9bab}.lb-summary b{display:block;margin-top:4px;font-size:20px;line-height:1;color:#ffe08a;font-variant-numeric:tabular-nums}',
    '.lb-me{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin:0 0 10px;padding:12px 13px;border-radius:17px;background:linear-gradient(135deg,rgba(255,210,63,.17),rgba(28,33,41,.94));border:1px solid rgba(255,210,63,.3)}',
    '.lb-me small{display:block;font-size:8.5px;color:#ffdca5}.lb-me>b,.lb-me>div>b{display:block;font-size:23px;line-height:1.1;color:#fff}',
    '.lb-me-score{text-align:right}.lb-me-score b{font-size:20px;color:#ffd23f}.lb-me-score span{display:block;font-size:8px;color:#c7b691}',
    '.lb-me p{grid-column:1/-1;margin:1px 0 0;font-size:9px;line-height:1.5;color:#c9d1dc}',
    '.lb-me.empty{grid-template-columns:1fr}.lb-me.empty p{margin:0;color:#9aa3b2}',
    '.lb-list{display:grid;gap:7px}',
    '.lb-row{display:grid;grid-template-columns:45px 1fr auto;gap:9px;align-items:center;padding:10px;border-radius:14px;background:#121c28;border:1px solid rgba(255,255,255,.07)}',
    '.lb-row.me{border-color:rgba(255,210,63,.5);background:rgba(255,210,63,.08)}',
    '.lb-row.top1{border-color:rgba(255,210,63,.5)}.lb-row.top2{border-color:rgba(198,210,225,.32)}.lb-row.top3{border-color:rgba(205,146,91,.4)}',
    '.lb-rank{font-size:12px;font-weight:900;color:#8d9bab;font-variant-numeric:tabular-nums}',
    '.lb-row.top1 .lb-rank{color:#ffd23f}.lb-row.top2 .lb-rank{color:#dfe7f2}.lb-row.top3 .lb-rank{color:#d99a62}',
    '.lb-name{min-width:0;font-size:12.5px;font-weight:800;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.lb-name small{display:block;margin-top:2px;font-size:9px;font-weight:500;color:#8d9bab;white-space:normal;line-height:1.4}',
    '.lb-score{font-size:15px;color:#ffe08a;font-variant-numeric:tabular-nums}',
    '.lb-empty{margin-top:10px;padding:22px 12px;border-radius:14px;border:1px dashed rgba(255,255,255,.14);background:#121c28;font-size:10.5px;line-height:1.6;color:#8d9bab;text-align:center}',
    '.lb-error{margin-top:10px;padding:16px 12px;border-radius:14px;background:#121c28;border:1px solid rgba(255,120,120,.28);font-size:10.5px;line-height:1.6;color:#ffb1b1;text-align:left}.lb-error b{display:block;font-size:12px;color:#ff8a8f;margin-bottom:4px}.lb-error span{display:block;line-height:1.6}',
    '.lb-error button{margin-top:9px;border:0;border-radius:10px;background:#ffd23f;color:#101318;padding:7px 12px;font-size:10px;font-weight:900;cursor:pointer}',
    '.lb-error.small{display:flex;gap:8px;align-items:center;justify-content:space-between;padding:8px 10px;margin:0 0 8px}.lb-error.small span{flex:1}.lb-error.small button{margin:0}',
    '.lb-note{margin:14px 0 0;text-align:center;font-size:8.5px;line-height:1.6;color:#66768a}',
    '.v186-lb-inline{width:100%;margin:0 0 8px;border:1px solid rgba(255,210,63,.3);border-radius:11px;background:rgba(255,210,63,.08);color:#ffd23f;font-size:10px;font-weight:800;padding:8px;cursor:pointer}'
  ].join('');
  document.head.appendChild(style);

  window.__v186Debug = {
    open: window.v186OpenLeaderboard,
    reload: window.v186ReloadLeaderboard,
    state: function () { return { list: LB.list, mine: LB.mine, total: LB.total, loading: LB.loading, error: LB.error }; }
  };
})();