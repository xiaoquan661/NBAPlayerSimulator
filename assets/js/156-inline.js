
/* ============================================================
 * 自建球员 · 生涯播报（替代原版「世界线/命运轨迹」）
 * 成长、比赛、球队、赛季四类消息流；预置球星仍保留原命运轨迹。
 * ============================================================ */
(function () {
  'use strict';

  var KIND = { attr: '成长', game: '比赛', team: '球队', season: '赛季', info: '动态' };

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

  function body() {
    try { window.__hookFeed(); } catch (e) {}
    var wire = Array.isArray(career.wire) ? career.wire : [];
    var feed = Array.isArray(career.feed) ? career.feed.filter(function (t) {
      return !feedNoise(t);
    }) : [];
    var seqMap = career.feedSeq || {};
    var st = career.seasonStats || {};
    var year = career.seasonYear || 0;
    var season = year + '-' + String((year + 1) % 100).padStart(2, '0');
    var gp = st.gp || 0;

    /* 成长/比赛/赛季消息 + 球队动态合成一条流；有 seq 的按时间倒序，
       旧存档没有 seq 的按原顺序轮流排在后面。 */
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
    var recent = items.slice(0, 12).map(function (e) {
      var cls = e.kind === 'attr' ? 'grow' : e.kind;
      return '<article class="wire-item ' + cls + '">'
        + '<span class="wire-tag">' + (KIND[e.kind] || '动态') + '</span>'
        + '<p>' + esc2(e.text) + '</p>'
        + (e.meta ? '<small>' + e.meta + '</small>' : '')
        + '</article>';
    }).join('');

    return '<section class="wire-season">'
      + '<div class="wire-season-head"><div><b>生涯播报</b></div>'
      + '<span>' + season + ' · ' + (career.wins || 0) + '胜' + (career.losses || 0) + '负 · ' + (gp ? gp + ' 场' : '尚未出场') + '</span></div>'
      + '<div class="wire-list" style="margin-top:14px">'
      + (recent || '<div class="wire-empty">还没有播报。打一场比赛，能力成长和球队动态会在这里更新。</div>')
      + '</div>'
      + '</section>';
  }

  /* 播报放到「赛季」页底部 */
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
        /* 生涯播报放到「本赛季个人数据」之前，而不是整页最底部。
           自建和明星模式共用同一条播报流。 */
        var wire = body();
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
      var r = prevRender.apply(this, arguments);
      try {
        var fab = document.getElementById('focus-fab');
        if (fab) fab.remove();
      } catch (e) {}
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
    '.wire-season .wire-empty{padding:16px 12px;font-size:11px}'
  ].join('');
  document.head.appendChild(css);

  try { if (document.getElementById('app')) render(); } catch (e) {}
})();
