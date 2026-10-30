
/* ============================================================
 * 自建球员 · 生涯播报（替代原版「世界线/命运轨迹」）
 * 成长、比赛、球队、赛季四类消息流；预置球星仍保留原命运轨迹。
 * ============================================================ */
(function () {
  'use strict';

  var KIND = { attr: '成长', game: '比赛', team: '球队', season: '赛季', info: '动态' };
  var wireExpanded = false;
  var wireFilter = 'all';
  var wirePanelScroll = 0;

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
      /* 旧档里同一条赛季荣誉同时写进了 feed 和 wire，播报合并时会显示两遍。 */
      var m = /^赛季荣誉（(.+?)）：/.exec(String(t || ''));
      if (m && wire.some(function (e) { return String(e.text || '').indexOf(m[1]) >= 0; })) return false;
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

  function wireIcon(kind) {
    var d = {
      attr: '<path d="M2.4 9.4 5 6.8l1.8 1.8L10.8 4"/><path d="M8.6 4h2.2v2.2"/>',
      game: '<circle cx="6" cy="6" r="4.2"/><path d="M1.9 6h8.2M6 1.8v8.4M3 3.1c1.5 1.2 4.5 1.2 6 0M3 8.9c1.5-1.2 4.5-1.2 6 0"/>',
      team: '<path d="M6 1.6 9.7 2.9v3.2c0 2-1.5 3.6-3.7 4.3-2.2-.7-3.7-2.3-3.7-4.3V2.9L6 1.6Z"/><path d="M4.5 5.7 5.7 7l2.1-2.5"/>',
      season: '<path d="M3.2 1.9h5.6v2.3a2.8 2.8 0 0 1-5.6 0V1.9Z"/><path d="M3.2 3.1H1.7v.6c0 1.2 1 2.1 2.2 2.1M8.8 3.1h1.5v.6c0 1.2-1 2.1-2.2 2.1M6 7v1.9M4.1 10.2h3.8"/>',
      info: '<path d="M6 1.8a4.2 4.2 0 0 0-2.6 7.5L3 11h6l-.4-1.7A4.2 4.2 0 0 0 6 1.8Z"/><path d="M4.9 11h2.2"/>',
      important: '<path d="m6 1.5 1.35 2.75 3.05.45-2.2 2.15.52 3.05L6 8.45 4.28 9.9 4.8 6.85 2.6 4.7l3.05-.45L6 1.5Z"/>'
    };
    return '<svg viewBox="0 0 12 12" aria-hidden="true"' + (kind === 'important' ? ' class="is-star" fill="currentColor" stroke="none"' : ' fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"') + '>' + (d[kind] || d.info) + '</svg>';
  }

  function tagHTML(e) {
    var imp = isImportant(e);
    var kind = e.kind || 'info';
    return '<span class="wire-tag ' + kindCls(kind) + (imp ? ' is-important' : '') + '">'
      + wireIcon(imp ? 'important' : kind)
      + '<em>' + (KIND[kind] || '动态') + '</em></span>';
  }

  function itemHTML(e, hidden) {
    var cls = e.kind === 'attr' ? 'grow' : e.kind;
    return '<article class="v156-wire-row wire-item ' + cls + (isImportant(e) ? ' is-important' : '') + '"'
      + (hidden ? ' style="display:none"' : '')
      + ' data-kind="' + (e.kind || 'info') + '">'
      + tagHTML(e)
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
      + '<span class="v156-wirebar-tag ' + (latest ? kindCls(latest.kind) : 'info') + (imp ? ' is-important' : '') + '">'
      + wireIcon(imp ? 'important' : (latest ? latest.kind : 'info'))
      + '<em>' + (latest ? (KIND[latest.kind] || '动态') : '播报') + '</em></span>'
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
    /* 手动开合才加动画类，重绘出来的 open 面板直接到位，避免每场闪一下。 */
    panel.classList.add('v156-anim');
    if (panel.__v156AnimTimer) clearTimeout(panel.__v156AnimTimer);
    panel.__v156AnimTimer = setTimeout(function () { panel.classList.remove('v156-anim'); }, 360);
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

  /* 成长消息和重要消息从顶部滑入，多条纵向堆叠；其他普通消息只更新播报条。 */
  function toastLayer() {
    var layer = document.getElementById('v156-wire-toasts');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'v156-wire-toasts';
      layer.className = 'v156-wire-toasts';
      document.body.appendChild(layer);
    }
    return layer;
  }

  var toastQueue = [];
  var toastLive = 0;

  function closeBanner(el) {
    if (!el || el.__v156Closed) return;
    el.__v156Closed = true;
    el.classList.add('is-out');
    setTimeout(function () {
      if (el.parentNode) el.remove();
      toastLive = Math.max(0, toastLive - 1);
      pumpBanners();
    }, 220);
  }

  function openWireFromToast() {
    if (ui && ui.screen === 'career' && ui.tab !== 'season') {
      ui.tab = 'season';
      try { render(); } catch (e) {}
    }
    setTimeout(function () {
      var box = document.querySelector('.v156-wirebox');
      try { if (box && box.scrollIntoView) box.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
      if (window.v156WireOpen) window.v156WireOpen();
    }, 50);
  }

  function createBanner(item) {
    var layer = toastLayer();
    var kind = item && item.kind || 'info';
    var grow = kind === 'attr';
    var cls = grow ? 'is-attr' : 'is-important';
    var el = document.createElement('button');
    el.type = 'button';
    el.className = 'v156-wire-toast ' + cls;
    el.innerHTML = '<small class="' + cls + '">' + wireIcon(grow ? 'attr' : 'important') + '<em>' + (grow ? '成长' : '重要') + '</em></small><span></span><i>展开 ›</i>';
    el.querySelector('span').textContent = item && item.text || '';
    el.onclick = function () { closeBanner(el); openWireFromToast(); };
    /* 新消息插在最上面，旧消息整体往下挤。 */
    layer.insertBefore(el, layer.firstChild);
    setTimeout(function () { closeBanner(el); }, 5200);
  }

  function pumpBanners() {
    while (toastLive < 3 && toastQueue.length) {
      toastLive++;
      createBanner(toastQueue.shift());
    }
  }

  function enqueueBanner(item) {
    toastQueue.push(item);
    pumpBanners();
  }

  /* 成长消息不再按“是否重要”筛选，出现就排队弹；重要消息照旧弹。 */
  function toastWire() {
    try {
      if (!career || career.retired || !ui || ui.screen !== 'career' || ui.modal || ui.storyEvent) return;
      var d = gather();
      if (career.wireToastSeq == null) { career.wireToastSeq = d.maxSeq; return; }
      var known = Number(career.wireToastSeq) || 0;
      var fresh = d.items.filter(function (x) {
        if (!(x.seq > known)) return false;
        if (x.kind !== 'attr' && !isImportant(x)) return false;
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
      /* fresh 最新在前；倒序入队后逐条弹出，任意时刻最新的一条仍在最上面。 */
      fresh.slice().reverse().forEach(enqueueBanner);
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
        /* 播报条回到原位置：模拟区和「本赛季个人数据」之间。 */
        var wire = bar();
        var statAnchor = '<section class="v26-statbox"><header><b>本赛季个人数据</b>';
        if (h.indexOf(statAnchor) >= 0) h = h.replace(statAnchor, wire + statAnchor);
        else h += wire;
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
      try {
        var oldPanel = document.querySelector('.v156-wire-panel');
        if (oldPanel && wireExpanded) wirePanelScroll = Number(oldPanel.scrollTop) || 0;
      } catch (e) {}
      /* 连续模拟 + 播报面板展开时，只刷新播报本身。
         整页 innerHTML 重建会让展开的面板反复重排，这是屏闪的根源。 */
      var lightWire = false;
      try {
        lightWire = !!(ui && ui.sim && wireExpanded && typeof career !== 'undefined' && career
          && career.stage === 'regular' && !ui.modal && !ui.storyEvent);
        if (lightWire) {
          var oldBox = document.querySelector('.v156-wirebox');
          if (oldBox) {
            var tmp = document.createElement('div');
            tmp.innerHTML = bar();
            var newBox = tmp.firstElementChild;
            oldBox.parentNode.replaceChild(newBox, oldBox);
            var lp = newBox.querySelector('.v156-wire-panel');
            if (lp) lp.scrollTop = wirePanelScroll;
          } else {
            lightWire = false;
          }
        }
      } catch (e) { lightWire = false; }
      var r = lightWire ? undefined : prevRender.apply(this, arguments);
      try {
        var newPanel = document.querySelector('.v156-wire-panel');
        if (newPanel && wireExpanded) newPanel.scrollTop = wirePanelScroll;
      } catch (e) {}
      try {
        var fab = document.getElementById('focus-fab');
        if (fab) fab.remove();
      } catch (e) {}
      try { toastWire(); } catch (e) {}
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
    '.wire-tag{display:inline-flex;align-items:center;gap:4px;font-size:9px;font-weight:900;color:#ffd23f;background:#ffd23f14;border:1px solid #ffd23f44;border-radius:7px;padding:2px 7px;margin-right:6px;vertical-align:middle}',
    '.wire-tag em{font-style:normal}',
    '.wire-tag svg{width:11px;height:11px;flex:none;filter:drop-shadow(0 0 2px currentColor)}',
    /* 016 有 .wire-item.team/game/season .wire-tag!important，必须用更高优先级把分类色拿回来。 */
    '.v156-wire-row.wire-item .wire-tag.attr{color:#c4a6ff!important;background:#8b5cf618!important;border-color:#8b5cf655!important}',
    '.v156-wire-row.wire-item .wire-tag.game{color:#8bbcff!important;background:#4d8dff18!important;border-color:#4d8dff55!important}',
    '.v156-wire-row.wire-item .wire-tag.season{color:#7fe0a1!important;background:#4ade8016!important;border-color:#4ade8055!important}',
    '.v156-wire-row.wire-item .wire-tag.team{color:#ffb27a!important;background:#ff9f4318!important;border-color:#ff9f4355!important}',
    '.v156-wire-row.wire-item .wire-tag.info{color:#aab4c2!important;background:#5f6b7a18!important;border-color:#5f6b7a55!important}',
    '.v156-wire-row.wire-item .wire-tag.is-important{color:#ffd23f!important;background:#ffd23f1c!important;border-color:#ffd23f99!important;box-shadow:0 0 10px #ffd23f33}',
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
    '.v156-wirebox{margin:10px 0 12px}',
    '.v156-wirebox.open .v156-wirebar{border-radius:13px 13px 0 0;border-bottom-color:#232b35}',
    '.v156-wirebar{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;margin:0;padding:9px 12px;border:1px solid #2f3742;border-radius:13px;background:#141a22;color:#e8ecf1;text-align:left;font-family:inherit;cursor:pointer;box-shadow:0 6px 18px #0004;transition:border-color .18s ease}',
    '.v156-wirebar.is-important{border-color:#ffd23f88;box-shadow:inset 0 0 0 1px #ffd23f22,0 6px 20px #0005}',
    '.v156-wirebar b{flex:1;min-width:0;font-size:11.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#e8ecf1;line-height:1.4}',
    '.v156-wirebar em{flex:none;font-style:normal;font-size:9px;font-weight:900;color:#101318;background:#ffd23f;border-radius:999px;padding:3px 7px;white-space:nowrap}',
    '.v156-wirebar i{flex:none;font-style:normal;color:#8a93a3;font-size:13px;line-height:1;transition:transform .2s ease}',
    /* 覆盖 [class*="bar"] i 的蓝金渐变，否则箭头会变成一块色块。 */
    '.v156-wirebar .v156-wirebar-chev{display:inline-flex!important;align-items:center;justify-content:center;width:auto!important;height:auto!important;min-width:0!important;padding:0!important;border:0!important;border-radius:0!important;background:none!important;background-image:none!important;box-shadow:none!important;color:#8a93a3!important;font-size:13px!important;line-height:1!important}',
    '.v156-wirebar-tag{flex:none;display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:900;color:#ffd23f;background:#ffd23f14;border:1px solid #ffd23f44;border-radius:6px;padding:2px 7px;white-space:nowrap}',
    '.v156-wirebar-tag em{font-style:normal}',
    '.v156-wirebar-tag svg{width:11px;height:11px;flex:none;filter:drop-shadow(0 0 2px currentColor)}',
    /* 016 的 span{color:#d6dbe3!important} 会吃掉标签颜色，这里必须同样 !important。 */
    '.v156-wirebar-tag.attr{color:#c4a6ff!important;background:#8b5cf618!important;border-color:#8b5cf655!important}',
    '.v156-wirebar-tag.game{color:#8bbcff!important;background:#4d8dff18!important;border-color:#4d8dff55!important}',
    '.v156-wirebar-tag.season{color:#7fe0a1!important;background:#4ade8016!important;border-color:#4ade8055!important}',
    '.v156-wirebar-tag.team{color:#ffb27a!important;background:#ff9f4318!important;border-color:#ff9f4355!important}',
    '.v156-wirebar-tag.info{color:#aab4c2!important;background:#5f6b7a18!important;border-color:#5f6b7a55!important}',
    '.v156-wirebar-tag.is-important{color:#ffd23f!important;background:#ffd23f1c!important;border-color:#ffd23f99!important;box-shadow:0 0 10px #ffd23f33}',
    '.v156-wire-panel{max-height:0;opacity:0;overflow:hidden;border:1px solid transparent;border-top:0;border-radius:0 0 13px 13px;background:#10161d;transition:none;margin-top:-1px}',
    /* 只有玩家手动展开时才播放动画；模拟中的整页重绘不应把面板从 0 再展开一次。 */
    '.v156-wire-panel.v156-anim{transition:max-height .3s ease,opacity .18s ease,border-color .2s ease}',
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
    '.v156-wire-toasts{position:fixed;left:50%;top:calc(10px + env(safe-area-inset-top,0px));transform:translateX(-50%);z-index:200005;display:flex;flex-direction:column;gap:8px;width:min(440px,calc(100% - 28px));pointer-events:none}',
    '.v156-wire-toast{pointer-events:auto;display:flex;align-items:center;gap:9px;width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #ffd23f66;border-left:3px solid #ffd23f;border-radius:13px;background:#141a22;color:#e8ecf1;text-align:left;font-family:inherit;box-shadow:0 14px 40px #0008;cursor:pointer;animation:v156WireDrop .32s cubic-bezier(.2,1.15,.35,1)}',
    '.v156-wire-toast.is-out{animation:v156WireToastOut .22s ease-in forwards}',
    '.v156-wire-toast.is-attr{border-color:#8b5cf666;border-left-color:#c4a6ff}',
    '.v156-wire-toast.is-attr small{background:#c4a6ff!important;color:#101318!important}',
    '.v156-wire-toast small{flex:none;display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:900;color:#101318!important;background:#ffd23f;border-radius:6px;padding:2px 6px}',
    '.v156-wire-toast small em{font-style:normal}',
    '.v156-wire-toast small svg{width:10px;height:10px;flex:none}',
    '.v156-wire-toast span{flex:1;min-width:0;font-size:11px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.v156-wire-toast i{flex:none;font-style:normal;font-size:9px;color:#ffd23f}',
    '@keyframes v156WireDrop{0%{opacity:0;transform:translateY(-140%)}70%{opacity:1;transform:translateY(4px)}100%{opacity:1;transform:translateY(0)}}',
    '@keyframes v156WireToastOut{to{opacity:0;transform:translateY(-12px)}}',
    '@media(max-width:380px){.v156-wirebar b{font-size:11px}}'
  ].join('');
  document.head.appendChild(css);

  try { if (document.getElementById('app')) render(); } catch (e) {}
})();
