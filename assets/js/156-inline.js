
/* ============================================================
 * 自建球员 · 生涯播报（替代原版「世界线/命运轨迹」）
 * 成长、比赛、球队、赛季四类消息流；预置球星仍保留原命运轨迹。
 * ============================================================ */
(function () {
  'use strict';

  var KIND = { attr: '成长', game: '比赛', team: '球队', season: '赛季', info: '动态' };
  var wireExpanded = false;
  var wireFilter = 'all';

  function esc2(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function nm() {
    try { return (window.__wireName && window.__wireName()) || '自建球员'; } catch (e) { return '自建球员'; }
  }
  function teamName(abbr) {
    try { return teamBy(abbr).name || abbr; } catch (e) { return abbr || ''; }
  }
  function one(v) {
    v = Number(v) || 0;
    return (Math.round(v * 10) / 10).toFixed(1);
  }

  /* 球队动态（career.feed）和成长播报共用同一条消息流：
     给 feed 的 unshift 打上序号，才能按“最新在上”穿插排序。 */
  window.__hookFeed = function () {
    if (typeof career === 'undefined' || !career || !Array.isArray(career.feed)) return;
    var f = career.feed;
    if (f.__seqHooked) return;
    try {
      Object.defineProperty(f, '__seqHooked', { value: true, enumerable: false, configurable: true });
      var origUnshift = f.unshift;
      f.unshift = function () {
        if (career && Array.isArray(career.feed) && career.feed === f) {
          career.logSeq = (Number(career.logSeq) || 0) + 1;
          if (!career.feedSeq || typeof career.feedSeq !== 'object') career.feedSeq = {};
          for (var i = arguments.length - 1; i >= 0; i--) {
            if (typeof arguments[i] === 'string') career.feedSeq[arguments[i]] = career.logSeq;
          }
        }
        return origUnshift.apply(f, arguments);
      };
    } catch (e) {}
  };

  /* 生涯播报只保留和玩家有关的消息：
     其他球队的小额签约、系统说明和重复的结果文案不进播报。 */
  function feedNoise(text) {
    var t = String(text == null ? '' : text);
    if (!t) return true;
    if (/^技术成长：/.test(t)) return true;
    if (/^普通生涯：/.test(t)) return true;
    if (/^本局未解锁/.test(t)) return true;
    if (/^开局天赋生效/.test(t)) return true;
    if (/具体能力已写入本局属性与成长规则/.test(t)) return true;
    if (/广告训练点正常生效/.test(t)) return true;
    if (/^「.+」：你做出了选择。$/.test(t)) return true;
    var own = '';
    try { own = teamName(career.team); } catch (e) {}
    var m = t.match(/^(.+?)签下.+?，(\d+)年，年薪([\d.]+)M/);
    if (m) {
      var years = Number(m[2]) || 0;
      var salary = Number(m[3]) || 0;
      /* 主队签约保留；其他球队只保留多年或高薪的重要签约。 */
      if (m[1] !== own && years < 4 && salary < 8) return true;
    }
    var r = t.match(/^(.+?)与.+?续约(\d+)年/);
    if (r && r[1] !== own && (Number(r[2]) || 0) < 4) return true;
    return false;
  }

  /* 成长/比赛/球队/赛季消息合成一条流；有 seq 的按时间倒序，
     旧存档没有 seq 的按原顺序排在后面。 */
  function gather() {
    try { window.__hookFeed(); } catch (e) {}
    var wire = Array.isArray(career.wire) ? career.wire : [];
    var feed = Array.isArray(career.feed) ? career.feed.filter(function (t) {
      return !feedNoise(t);
    }) : [];
    var seqMap = career.feedSeq || {};
    var st = career.seasonStats || {};
    var year = career.seasonYear || 0;
    var season = year + '-' + String((year + 1) % 100).padStart(2, '0');
    var items = [];
    wire.forEach(function (e, i) {
      items.push({
        kind: e.kind || 'info',
        text: e.text,
        seq: Number(e.seq) || 0,
        meta: 'S' + (e.season || 1) + (e.g ? ' · G' + e.g : (e.year ? ' · ' + e.year : '')),
        legacy: -i
      });
    });
    feed.forEach(function (t, i) {
      items.push({
        kind: 'team',
        text: t,
        seq: Number(seqMap[t]) || 0,
        meta: '',
        legacy: -(i + 0.5)
      });
    });
    items.sort(function (a, b) {
      if (a.seq && b.seq) return b.seq - a.seq;
      if (a.seq || b.seq) return (b.seq ? 1 : 0) - (a.seq ? 1 : 0);
      return b.legacy - a.legacy;
    });
    var maxSeq = 0;
    items.forEach(function (x) { maxSeq = Math.max(maxSeq, x.seq || 0); });
    return {
      items: items,
      season: season,
      wins: career.wins || 0,
      losses: career.losses || 0,
      gp: st.gp || 0,
      maxSeq: maxSeq
    };
  }

  function readSeq(maxSeq) {
    var v = Number(career.wireReadSeq);
    return career.wireReadSeq == null || !isFinite(v) ? maxSeq : v;
  }

  function kindCls(k) {
    return k === 'attr' ? 'attr' : k === 'game' ? 'game' : k === 'season' ? 'season' : k === 'team' ? 'team' : 'info';
  }

  function importantText(t) {
    return /交易|签约|续约|报价|合同|伤病|受伤|复出|赛季报销|教练|更衣室|队长|冲突|目标|里程碑|纪录|新高|三双|绝杀|全明星|MVP|DPOY|最佳阵容|最佳防阵|总冠军|FMVP|奖项|荣誉|退役/.test(String(t || ''));
  }

  function isImportant(e) {
    if (!e) return false;
    if (e.kind === 'attr') return false;
    if (e.kind === 'season') return true;
    return importantText(e.text);
  }

  function itemHTML(e, hidden) {
    var cls = e.kind === 'attr' ? 'grow' : e.kind;
    return '<article class="v156-wire-row wire-item ' + cls + (isImportant(e) ? ' is-important' : '') + '"'
      + (hidden ? ' style="display:none"' : '')
      + ' data-kind="' + (e.kind || 'info') + '">'
      + '<span class="wire-tag">' + (isImportant(e) ? '重要' : (KIND[e.kind] || '动态')) + '</span>'
      + '<p>' + esc2(e.text) + '</p>'
      + (e.meta ? '<small>' + e.meta + '</small>' : '')
      + '</article>';
  }

  function markWireRead() {
    try {
      var d = gather();
      if (career.wireReadSeq !== d.maxSeq) {
        career.wireReadSeq = d.maxSeq;
        if (typeof save === 'function') save();
      }
      var em = document.querySelector('.v156-wirebar em');
      if (em) em.parentNode.removeChild(em);
    } catch (e) {}
  }

  /* 顶部常驻消息条 + 原地下拉展开面板 */
  function bar() {
    var d = gather();
    var latest = d.items[0];
    var unread = 0;
    var read = readSeq(d.maxSeq);
    d.items.forEach(function (x) { if (x.seq > read) unread++; });
    var imp = isImportant(latest);
    var filters = [['all', '全部'], ['team', '球队'], ['game', '比赛'], ['attr', '成长'], ['season', '赛季']];
    var rows = d.items.slice(0, 30).map(function (e) {
      return itemHTML(e, wireFilter !== 'all' && e.kind !== wireFilter);
    }).join('');
    return '<section class="v156-wirebox' + (wireExpanded ? ' open' : '') + '">'
      + '<button type="button" class="v156-wirebar' + (imp ? ' is-important' : '') + '" aria-expanded="' + (wireExpanded ? 'true' : 'false') + '" onclick="v156WireToggle()">'
      + '<span class="v156-wirebar-tag ' + (latest ? kindCls(latest.kind) : 'info') + '">' + (imp ? '重要' : (latest ? (KIND[latest.kind] || '动态') : '播报')) + '</span>'
      + '<b>' + (latest ? esc2(latest.text) : '还没有播报，打完一场比赛会更新') + '</b>'
      + (unread > 0 ? '<em>' + (unread > 9 ? '9+' : unread) + ' 条新</em>' : '')
      + '<i class="v156-wirebar-chev">' + (wireExpanded ? '▴' : '▾') + '</i>'
      + '</button>'
      + '<div class="v156-wire-panel' + (wireExpanded ? ' open' : '') + '" id="v156-wire-panel">'
      + '<div class="v156-wire-panel-head"><small>生涯播报</small><span>' + d.season + ' · ' + d.wins + '胜' + d.losses + '负 · ' + (d.gp ? d.gp + ' 场' : '尚未出场') + '</span></div>'
      + '<div class="v156-wire-filters">'
      + filters.map(function (f) {
          return '<button class="v156-wire-filter' + (wireFilter === f[0] ? ' on' : '') + '" onclick="v156WireFilter(\'' + f[0] + '\',this)">' + f[1] + '</button>';
        }).join('')
      + '</div>'
      + '<div class="v156-wire-body">'
      + (rows || '<div class="wire-empty">还没有播报。打一场比赛，能力成长和球队动态会在这里更新。</div>')
      + '</div></div></section>';
  }

  window.v156WireToggle = function () {
    var panel = document.getElementById('v156-wire-panel');
    if (!panel) return;
    wireExpanded = !wireExpanded;
    panel.classList.toggle('open', wireExpanded);
    var box = document.querySelector('.v156-wirebox');
    if (box) box.classList.toggle('open', wireExpanded);
    var bar = document.querySelector('.v156-wirebar');
    if (bar) {
      bar.setAttribute('aria-expanded', wireExpanded ? 'true' : 'false');
      var chev = bar.querySelector('.v156-wirebar-chev');
      if (chev) chev.textContent = wireExpanded ? '▴' : '▾';
    }
    if (wireExpanded) markWireRead();
  };
  window.v156WireOpen = function () {
    if (!wireExpanded) window.v156WireToggle();
    else markWireRead();
  };
  window.v156WireClose = function () {
    if (wireExpanded) window.v156WireToggle();
  };

  window.v156WireFilter = function (kind, btn) {
    wireFilter = kind;
    var panel = document.getElementById('v156-wire-panel');
    if (!panel) return;
    Array.prototype.forEach.call(panel.querySelectorAll('.v156-wire-filter'), function (b) {
      b.classList.toggle('on', b === btn);
    });
    Array.prototype.forEach.call(panel.querySelectorAll('.v156-wire-row'), function (row) {
      row.style.display = (kind === 'all' || row.getAttribute('data-kind') === kind) ? '' : 'none';
    });
    var box = panel.querySelector('.v156-wire-body');
    if (box) box.scrollTop = 0;
  };

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && wireExpanded) {
      event.preventDefault();
      window.v156WireClose();
    }
  });

  /* 重要消息从顶部滑入提示；普通消息只更新播报条。 */
  function toastImportant() {
    try {
      if (!career || career.retired || !ui || ui.screen !== 'career' || ui.modal || ui.storyEvent) return;
      var d = gather();
      if (career.wireToastSeq == null) { career.wireToastSeq = d.maxSeq; return; }
      var known = Number(career.wireToastSeq) || 0;
      var fresh = d.items.filter(function (x) {
        if (!(x.seq > known) || !isImportant(x)) return false;
        /* 玩家自己确认赛季目标的提示不用再弹一次。 */
        if (/^本季目标：/.test(String(x.text || ''))) return false;
        return true;
      });
      if (!fresh.length) return;
      career.wireToastSeq = Math.max.apply(null, fresh.map(function (x) { return x.seq; }));
      try { save(); } catch (e) {}
      /* 播报面板已经展开时，消息就在玩家眼前，不再弹顶部条。 */
      var openPanel = document.getElementById('v156-wire-panel');
      if (wireExpanded && openPanel && openPanel.classList.contains('open')) return;
      var now = Date.now();
      if (career.__v156ToastAt && now - career.__v156ToastAt < 1500) return;
      career.__v156ToastAt = now;
      var old = document.getElementById('v156-wire-toast');
      if (old) old.remove();
      var el = document.createElement('button');
      el.type = 'button';
      el.id = 'v156-wire-toast';
      el.className = 'v156-wire-toast';
      el.innerHTML = '<small>重要播报</small><span></span><i>展开 ›</i>';
      el.querySelector('span').textContent = fresh[0].text;
      el.onclick = function () {
        el.remove();
        if (ui && ui.screen === 'career' && ui.tab !== 'season') {
          ui.tab = 'season';
          try { render(); } catch (e) {}
        }
        setTimeout(function () { if (window.v156WireOpen) window.v156WireOpen(); }, 40);
      };
      document.body.appendChild(el);
      setTimeout(function () { if (el.parentNode) el.remove(); }, 5200);
    } catch (e) {}
  }

  /* 顶部一行消息条；完整播报在条下原地展开。 */
  var prevSeasonView = seasonView;
  seasonView = function () {
    var h = prevSeasonView.apply(this, arguments);
    try {
      if (typeof career !== 'undefined' && career && !career.retired) {
        if (career.stage === 'preseason') {
          /* 训练/专精归「专精」页：赛季页只保留赛季内容与开赛按钮。
             明星和自建使用同一套新秀训练营页面。 */
          h = h.replace(/<section class="off-hero"[\s\S]*?<\/section>/, '');
          h = h.replace(/<div class="off-body"[\s\S]*?(?=<button[^>]*off-next)/, '');
        }
        h = bar() + h;
      }
    } catch (e) {}
    return h;
  };
  /* 新赛季开赛播报 */
  try {
    var prevBegin = beginSeason;
    beginSeason = function () {
      var r = prevBegin.apply(this, arguments);
      try {
        if (career && !career.retired && window.__wireLog) {
          window.__wireLog('team', '新赛季 · ' + career.seasonYear + '-' + String((career.seasonYear + 1) % 100).padStart(2, '0')
            + ' · ' + teamName(career.team) + ' · 角色：' + (career.role || '轮换'));
        }
      } catch (e) {}
      return r;
    };
  } catch (e) {}

  /* 底部导航恢复原版：自建球员也保留「主线」页；播报仍挂在赛季页 */
  try {
    var prevRender = render;
    render = function () {
      try { window.__hookFeed(); } catch (e) {}
      var r = prevRender.apply(this, arguments);
      try {
        var fab = document.getElementById('focus-fab');
        if (fab) fab.remove();
      } catch (e) {}
      try { toastImportant(); } catch (e) {}
      try { if (wireExpanded) markWireRead(); } catch (e) {}
      return r;
    };
  } catch (e) {}

  var css = document.createElement('style');
  css.textContent = [
    '.wire-head{background:linear-gradient(145deg,#1b2028,#151a21);border:1px solid #2f3742;border-radius:24px;padding:20px}',
    '.wire-head>small{color:#ffd23f;letter-spacing:2px;font-size:9px}',
    '.wire-head h2{color:#ffffff;font-size:24px;line-height:1.35;margin:9px 0 6px}',
    '.wire-head p{color:#9aa3b2;font-size:11.5px;line-height:1.7;margin:0}',
    '.wire-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}',
    '.wire-kpis span{background:#212730;border:1px solid #2f3742;border-radius:14px;padding:10px;text-align:center;min-width:0}',
    '.wire-kpis small{display:block;color:#9aa3b2;font-size:9px}',
    '.wire-kpis b{display:block;color:#ffd23f;font-size:17px;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.wire-section{margin-top:16px}',
    '.wire-section h3{color:#ffffff;font-size:14px;display:flex;gap:8px;align-items:center;margin:0 0 8px}',
    '.wire-section h3 i{color:#ffd23f;font-style:normal;font-size:12px}',
    '.wire-note{color:#8a93a3;font-size:10px;line-height:1.7;margin:0 0 10px}',
    '.wire-list{display:grid;gap:8px}',
    '.wire-item{background:#1c2129;border:1px solid #2f3742;border-radius:14px;padding:12px 14px}',
    '.wire-item p{color:#e8ecf1;font-size:12.5px;line-height:1.65;margin:0;word-break:break-word}',
    '.wire-item small{display:block;color:#8a93a3;font-size:9px;margin-top:6px}',
    '.wire-tag{display:inline-block;font-size:9px;font-weight:800;color:#101318;background:#ffd23f;border-radius:7px;padding:2px 6px;margin-right:6px;vertical-align:1px}',
    '.wire-item.game .wire-tag{background:#4d8dff;color:#0b1220}',
    '.wire-item.season .wire-tag{background:#4ade80;color:#0b1a10}',
    '.wire-item.team .wire-tag{background:#9aa3b2;color:#101318}',
    '.wire-empty{background:#1c2129;border:1px dashed #2f3742;border-radius:14px;padding:22px 14px;color:#9aa3b2;font-size:12px;text-align:center;line-height:1.7}',
    '.wire-item.team p{color:#c9d1dc}',
    '.wire-item.grow{background:#211f16;border-color:#463c1d;border-left:3px solid #ffd23f}',
    '.wire-item.grow p{color:#ffe6a0!important}',
    '.wire-item.grow small{color:#a3935e}',
    '.wire-season{margin-top:16px;background:#1c2129;border:1px solid #2f3742;border-radius:20px;padding:16px}',
    '.wire-season-head{display:flex;justify-content:space-between;align-items:flex-end;gap:10px}',
    '.wire-season-head small{display:block;color:#ffd23f;letter-spacing:2px;font-size:9px}',
    '.wire-season-head b{display:block;color:#ffffff;font-size:18px;margin-top:3px}',
    '.wire-season-head>span{color:#9aa3b2;font-size:10px;text-align:right;line-height:1.5;flex:none}',
    '.wire-season h4{color:#e8ecf1;font-size:13px;display:flex;gap:7px;align-items:center;margin:14px 0 8px}',
    '.wire-season h4 i{color:#ffd23f;font-style:normal;font-size:11px}',
    '.wire-season .wire-item{padding:10px 12px}',
    '.wire-season .wire-item p{font-size:12px}',
    '.wire-season .wire-empty{padding:16px 12px;font-size:11px}',

    /* ---------- 顶部播报条 + 下拉面板 ---------- */
    '.v156-wirebox{position:sticky;top:0;z-index:35;margin:0 0 10px}',
    '.v156-wirebox.open .v156-wirebar{border-radius:13px 13px 0 0;border-bottom-color:#232b35}',
    '.v156-wirebar{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;margin:0;padding:9px 12px;border:1px solid #2f3742;border-radius:13px;background:#141a22;color:#e8ecf1;text-align:left;font-family:inherit;cursor:pointer;box-shadow:0 6px 18px #0004;transition:border-color .18s ease}',
    '.v156-wirebar.is-important{border-color:#ffd23f88;box-shadow:inset 0 0 0 1px #ffd23f22,0 6px 20px #0005}',
    '.v156-wirebar b{flex:1;min-width:0;font-size:11.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e8ecf1;line-height:1.4}',
    '.v156-wirebar em{flex:none;font-style:normal;font-size:9px;font-weight:900;color:#101318;background:#ffd23f;border-radius:999px;padding:3px 7px;white-space:nowrap}',
    '.v156-wirebar i{flex:none;font-style:normal;color:#8a93a3;font-size:13px;line-height:1;transition:transform .2s ease}',
    '.v156-wirebar-tag{flex:none;font-size:9px;font-weight:900;color:#101318;background:#ffd23f;border-radius:6px;padding:2px 6px;white-space:nowrap}',
    '.v156-wirebar-tag.attr{background:#ffd23f;color:#101318}',
    '.v156-wirebar-tag.game{background:#4d8dff;color:#0b1220}',
    '.v156-wirebar-tag.season{background:#4ade80;color:#0b1a10}',
    '.v156-wirebar-tag.team{background:#9aa3b2;color:#101318}',
    '.v156-wirebar-tag.info{background:#5f6b7a;color:#e8ecf1}',
    '.v156-wire-panel{max-height:0;opacity:0;overflow:hidden;border:1px solid transparent;border-top:0;border-radius:0 0 13px 13px;background:#10161d;transition:max-height .3s ease,opacity .18s ease,border-color .2s ease;margin-top:-1px}',
    '.v156-wire-panel.open{max-height:min(52dvh,460px);opacity:1;border-color:#2f3742;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}',
    '.v156-wire-panel-head{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:10px 12px 0}',
    '.v156-wire-panel-head small{font-size:9px;letter-spacing:1.5px;color:#ffd23f;font-weight:800}',
    '.v156-wire-panel-head span{font-size:9px;color:#8a93a3;text-align:right;line-height:1.5}',
    '.v156-wire-filters{position:sticky;top:0;z-index:1;display:flex;gap:6px;padding:8px 12px;overflow-x:auto;background:#10161d;scrollbar-width:none}',
    '.v156-wire-filters::-webkit-scrollbar{display:none}',
    '.v156-wire-filter{flex:none;border:1px solid #2f3742;border-radius:999px;background:#1a2028;color:#9aa3b2;font-size:10px;font-weight:800;padding:5px 10px;font-family:inherit;cursor:pointer}',
    '.v156-wire-filter.on{border-color:#ffd23f;background:#2a261b;color:#ffd23f}',
    '.v156-wire-body{display:grid;gap:8px;align-content:start;padding:2px 12px 12px}',
    '.v156-wire-row{margin:0}',
    '.v156-wire-row.is-important{border-left:3px solid #ffd23f;background:#211f16}',
    '.v156-wire-toast{position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:200005;display:flex;align-items:center;gap:9px;width:min(440px,calc(100% - 28px));box-sizing:border-box;padding:10px 12px;border:1px solid #ffd23f66;border-left:3px solid #ffd23f;border-radius:13px;background:#141a22;color:#e8ecf1;text-align:left;font-family:inherit;box-shadow:0 14px 40px #0008;cursor:pointer;animation:v156WireDrop .32s cubic-bezier(.2,1.15,.35,1)}',
    '.v156-wire-toast small{flex:none;font-size:9px;font-weight:900;color:#101318;background:#ffd23f;border-radius:6px;padding:2px 6px}',
    '.v156-wire-toast span{flex:1;min-width:0;font-size:11px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.v156-wire-toast i{flex:none;font-style:normal;font-size:9px;color:#ffd23f}',
    '@keyframes v156WireDrop{0%{opacity:0;transform:translate(-50%,-140%)}68%{opacity:1;transform:translate(-50%,4px)}100%{opacity:1;transform:translate(-50%,0)}}',
    '@media(max-width:380px){.v156-wirebar b{font-size:11px}}'
  ].join('');
  document.head.appendChild(css);

  try { if (document.getElementById('app')) render(); } catch (e) {}
})();
