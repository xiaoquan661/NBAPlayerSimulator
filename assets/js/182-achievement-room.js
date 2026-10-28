/* ============================================================
 * 182 · 成就收藏室
 *   首页入口 + 弹层。读取本机 3 个存档槽和当前生涯，
 *   汇总荣誉、里程碑、纪录，按成就标题去重展示。
 *   只读存档，不修改存档，不引入用户输入。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v182AchievementRoom) return;
  window.__v182AchievementRoom = true;

  var ICON = {
    award: '🏆',
    record: '📈',
    milestone: '★',
    season: '📅',
    role: '🧩',
    playoff: '🏀',
    trade: '🔁',
    injury: '🩹'
  };
  var KIND_NAME = {
    award: '荣誉',
    record: '纪录',
    milestone: '里程碑',
    season: '赛季',
    role: '身份',
    playoff: '季后赛',
    trade: '交易',
    injury: '伤病'
  };
  var KIND_ORDER = { award: 0, record: 1, milestone: 2, season: 3, playoff: 4, role: 5, trade: 6, injury: 7 };
  var HONOR_ORDER = ['总冠军', 'FMVP', 'MVP', 'DPOY', '最佳阵容', '最佳防阵', '全明星', 'MIP'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function teamName(t) {
    try {
      if (typeof teamBy === 'function' && teamBy(t)) return teamBy(t).name || t;
    } catch (e) {}
    return t || '';
  }

  function sameLife(a, b) {
    if (!a || !b) return false;
    if (a.__saveId && b.__saveId) return a.__saveId === b.__saveId;
    return a.playerId === b.playerId && a.draftYear === b.draftYear;
  }

  function readSaves() {
    var out = [];
    var slots = [
      { key: 'save_bust_no1_v4', slot: 1 },
      { key: 'bust_slot_2_v4', slot: 2 },
      { key: 'bust_slot_3_v4', slot: 3 }
    ];
    slots.forEach(function (x) {
      try {
        var raw = localStorage.getItem(x.key);
        if (!raw) return;
        var save = JSON.parse(raw);
        if (save && save.playerId) out.push({ slot: x.slot, save: save });
      } catch (e) {}
    });
    try {
      if (typeof career !== 'undefined' && career && career.playerId) {
        var exists = out.some(function (x) { return sameLife(x.save, career); });
        if (!exists) out.push({ slot: career.__slot || 1, save: career });
      }
    } catch (e) {}
    return out;
  }

  function collect() {
    var saves = readSaves();
    var map = {};
    var honors = {};
    var careers = 0;
    var total = 0;

    saves.forEach(function (x) {
      var c = x.save;
      if (!c || !c.playerId) return;
      careers++;
      var h = c.honors || {};
      Object.keys(h).forEach(function (k) {
        var n = Number(h[k]) || 0;
        if (n > 0) honors[k] = (Number(honors[k]) || 0) + n;
      });
      var list = (c.worldline && c.worldline.achievements) || [];
      list.forEach(function (a) {
        if (!a || !a.title) return;
        var kind = a.kind || 'milestone';
        var key = kind + '|' + a.title;
        var item = map[key];
        if (!item) {
          item = {
            key: key,
            title: a.title,
            kind: kind,
            detail: a.detail || '',
            label: a.label || '',
            game: a.game,
            team: a.team || '',
            count: 0
          };
          map[key] = item;
        }
        item.count++;
        if (a.detail) item.detail = a.detail;
        if (a.label) item.label = a.label;
        if (a.game !== undefined && a.game !== null) item.game = a.game;
        if (a.team) item.team = a.team;
        total++;
      });
    });

    var items = Object.keys(map).map(function (k) { return map[k]; });
    items.sort(function (a, b) {
      return (KIND_ORDER[a.kind] || 9) - (KIND_ORDER[b.kind] || 9)
        || b.count - a.count
        || String(a.title).localeCompare(String(b.title), 'zh');
    });

    var honorTotal = Object.keys(honors).reduce(function (n, k) { return n + (Number(honors[k]) || 0); }, 0);
    return {
      saves: saves.length,
      careers: careers,
      total: total,
      unique: items.length,
      items: items,
      honors: honors,
      honorTotal: honorTotal
    };
  }

  function entryHTML() {
    var d = collect();
    var line = d.unique
      ? '已收录 ' + d.unique + ' 项成就 · ' + d.careers + ' 段生涯'
      : '还没有成就，开始一段生涯后会收进这里';
    return '<button class="v182-ach-entry" onclick="openAchievementRoom()">'
      + '<span class="v182-ach-entry-icon">🏆</span>'
      + '<span class="v182-ach-entry-copy"><b>成就收藏室</b><em>' + esc(line) + '</em></span>'
      + '<span class="v182-ach-entry-go">查看 →</span>'
      + '</button>';
  }

  function honorHTML(d) {
    var keys = HONOR_ORDER.slice();
    Object.keys(d.honors).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
    var chips = keys.filter(function (k) { return Number(d.honors[k]) > 0; }).map(function (k) {
      return '<span class="v182-ach-honor"><b>' + esc(k) + '</b><em>× ' + Number(d.honors[k]) + '</em></span>';
    }).join('');
    if (!chips) return '<div class="v182-ach-empty-line">还没有主要荣誉。</div>';
    return '<div class="v182-ach-honor-list">' + chips + '</div>';
  }

  function itemHTML(a) {
    var meta = [];
    if (a.label) meta.push(a.label);
    if (a.game !== undefined && a.game !== null) meta.push('G' + a.game);
    if (a.team) meta.push(teamName(a.team));
    if (a.count > 1) meta.push('×' + a.count);
    return '<div class="v182-ach-row">'
      + '<i class="v182-ach-row-icon">' + (ICON[a.kind] || '★') + '</i>'
      + '<div class="v182-ach-row-copy">'
      + '<small>' + esc(KIND_NAME[a.kind] || '成就') + '</small>'
      + '<b>' + esc(a.title) + '</b>'
      + (a.detail ? '<p>' + esc(a.detail) + '</p>' : '')
      + (meta.length ? '<em>' + esc(meta.join(' · ')) + '</em>' : '')
      + '</div></div>';
  }

  function renderRoom() {
    var d = collect();
    var items = d.items.slice(0, 200);
    var list = items.length
      ? items.map(itemHTML).join('')
      : '<div class="v182-ach-empty"><b>收藏室还是空的</b><p>开始一段生涯，荣誉、纪录和里程碑会自动收进这里。</p></div>';
    var more = d.items.length > items.length
      ? '<div class="v182-ach-more">仅显示前 200 项，共 ' + d.items.length + ' 项。</div>'
      : '';
    return '<div class="overlay v182-ach-overlay"><div class="sheet v182-ach-sheet">'
      + '<div class="sheet-handle"></div>'
      + '<header class="v182-ach-head">'
      + '<div><small>CAREER COLLECTION</small><h2>成就收藏室</h2>'
      + '<p>本机 3 个存档槽与当前生涯汇总，按成就去重展示。</p></div>'
      + '<button class="v182-ach-close" onclick="closeAchievementRoom()">✕</button>'
      + '</header>'
      + '<div class="v182-ach-stats">'
      + '<div><b>' + d.careers + '</b><span>生涯</span></div>'
      + '<div><b>' + d.unique + '</b><span>成就</span></div>'
      + '<div><b>' + d.total + '</b><span>记录次数</span></div>'
      + '<div><b>' + d.honorTotal + '</b><span>荣誉</span></div>'
      + '</div>'
      + '<section class="v182-ach-section"><header><b>荣誉陈列</b><span>HONORS</span></header>' + honorHTML(d) + '</section>'
      + '<section class="v182-ach-section"><header><b>成就记录</b><span>' + d.unique + ' 项</span></header>'
      + '<div class="v182-ach-list">' + list + '</div>' + more + '</section>'
      + '<button class="btn primary v182-ach-back" onclick="closeAchievementRoom()">返回首页</button>'
      + '</div></div>';
  }

  window.openAchievementRoom = function () {
    try {
      ui.modal = { kind: 'achievements' };
      if (typeof render === 'function') render();
    } catch (e) {}
  };
  window.closeAchievementRoom = function () {
    try {
      ui.modal = null;
      if (typeof render === 'function') render();
    } catch (e) {}
  };

  try {
    var prevHome = renderHome;
    renderHome = function () {
      var h = prevHome.apply(this, arguments);
      try {
        if (typeof h === 'string' && h.indexOf('v182-ach-entry') < 0) {
          var entry = entryHTML();
          var marker = '<div class="cover-actions">';
          if (h.indexOf(marker) >= 0) h = h.replace(marker, entry + marker);
          else h += entry;
        }
      } catch (e) {}
      return h;
    };
    window.renderHome = renderHome;
  } catch (e) {}

  try {
    var prevOverlay = renderOverlay;
    renderOverlay = function () {
      try {
        if (typeof ui !== 'undefined' && ui && ui.modal && ui.modal.kind === 'achievements') return renderRoom();
      } catch (e) {}
      return prevOverlay.apply(this, arguments);
    };
    window.renderOverlay = renderOverlay;
  } catch (e) {}

  /* 首页本身不渲染 renderOverlay，这里在首页出口补挂成就弹层。 */
  try {
    var prevRender = render;
    render = function () {
      var r = prevRender.apply(this, arguments);
      try {
        if (typeof ui !== 'undefined' && ui && ui.screen === 'home' && ui.modal && ui.modal.kind === 'achievements') {
          var app = document.getElementById('app');
          if (app && !app.querySelector('.v182-ach-overlay')) {
            app.insertAdjacentHTML('beforeend', renderOverlay());
          }
        }
      } catch (e) {}
      return r;
    };
    window.render = render;
  } catch (e) {}

  var st = document.createElement('style');
  st.id = 'v182-achievement-room-style';
  st.textContent = [
    '.v182-ach-entry{display:flex;align-items:center;gap:12px;width:calc(100% - 28px);margin:14px 14px 0;padding:13px 14px;border:1px solid rgba(255,210,63,.22);border-radius:18px;background:linear-gradient(135deg,rgba(255,210,63,.10),rgba(16,26,38,.78));color:#fff;text-align:left;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}',
    '.v182-ach-entry-icon{width:38px;height:38px;border-radius:13px;background:rgba(255,210,63,.14);display:grid;place-items:center;font-size:19px;flex:none}',
    '.v182-ach-entry-copy{flex:1;min-width:0;display:block}',
    '.v182-ach-entry-copy b{display:block;font-size:14px;color:#fff}',
    '.v182-ach-entry-copy em{display:block;font-style:normal;font-size:10.5px;color:#9aa3b2;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.v182-ach-entry-go{font-size:10.5px;font-weight:900;color:#ffd23f;flex:none}',
    '.v182-ach-overlay{z-index:95;align-items:flex-end}',
    '.v182-ach-sheet{width:min(100%,470px);max-height:90dvh;overflow:auto;background:linear-gradient(160deg,#111b28,#070b12)!important;border:1px solid rgba(255,210,63,.18)!important;border-bottom:0!important;border-radius:26px 26px 0 0!important;padding:16px 16px calc(20px + env(safe-area-inset-bottom))!important;box-shadow:0 -24px 60px rgba(0,0,0,.55)}',
    '.v182-ach-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}',
    '.v182-ach-head small{display:block;color:#ffd23f!important;font-size:8.5px;letter-spacing:.18em;font-weight:900}',
    '.v182-ach-head h2{margin:4px 0 0;color:#fff!important;font-size:25px;line-height:1.1}',
    '.v182-ach-head p{margin:6px 0 0;color:#9aa3b2!important;font-size:11px;line-height:1.6}',
    '.v182-ach-close{flex:none;width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:#fff;font-size:15px}',
    '.v182-ach-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:14px}',
    '.v182-ach-stats>div{background:#121c28;border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:9px 6px;text-align:center}',
    '.v182-ach-stats b{display:block;color:#ffe08a;font-size:20px;line-height:1;font-variant-numeric:tabular-nums}',
    '.v182-ach-stats span{display:block;color:#8d9bab;font-size:8.5px;margin-top:4px}',
    '.v182-ach-section{margin-top:14px}',
    '.v182-ach-section>header{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:7px}',
    '.v182-ach-section>header b{color:#fff;font-size:13px}',
    '.v182-ach-section>header span{color:#8d9bab;font-size:9px;letter-spacing:.12em}',
    '.v182-ach-honor-list{display:flex;flex-wrap:wrap;gap:6px}',
    '.v182-ach-honor{display:inline-flex;align-items:center;gap:6px;padding:6px 8px;border-radius:999px;background:rgba(255,210,63,.08);border:1px solid rgba(255,210,63,.22)}',
    '.v182-ach-honor b{color:#ffe08a;font-size:10.5px}',
    '.v182-ach-honor em{font-style:normal;color:#9aa3b2;font-size:9px}',
    '.v182-ach-empty-line{color:#8d9bab;font-size:11px;padding:6px 0}',
    '.v182-ach-list{display:grid;gap:7px}',
    '.v182-ach-row{display:grid;grid-template-columns:34px minmax(0,1fr);gap:9px;align-items:flex-start;padding:10px;border-radius:14px;background:#121c28;border:1px solid rgba(255,255,255,.07)}',
    '.v182-ach-row-icon{width:34px;height:34px;border-radius:11px;background:rgba(255,210,63,.10);display:grid;place-items:center;font-style:normal;font-size:16px}',
    '.v182-ach-row-copy small{display:block;color:#ffd23f!important;font-size:8px;letter-spacing:.10em;font-weight:900}',
    '.v182-ach-row-copy b{display:block;color:#fff!important;font-size:12.5px;line-height:1.4;margin-top:2px}',
    '.v182-ach-row-copy p{margin:4px 0 0;color:#9fadbd!important;font-size:10px;line-height:1.55}',
    '.v182-ach-row-copy em{display:block;font-style:normal;color:#8d9bab!important;font-size:9px;margin-top:4px}',
    '.v182-ach-empty{padding:22px 12px;text-align:center;border:1px dashed rgba(255,255,255,.14);border-radius:14px}',
    '.v182-ach-empty b{color:#fff;font-size:13px}',
    '.v182-ach-empty p{color:#8d9bab;font-size:10.5px;line-height:1.6;margin:5px 0 0}',
    '.v182-ach-more{color:#8d9bab;font-size:9.5px;text-align:center;padding:8px 0 0}',
    '.v182-ach-back{width:100%;margin-top:16px;min-height:48px}',
    '@media(max-width:380px){.v182-ach-stats{grid-template-columns:repeat(2,1fr)}.v182-ach-head h2{font-size:22px}}'
  ].join('');
  document.head.appendChild(st);
})();
