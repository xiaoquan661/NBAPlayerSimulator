/* ============================================================
 * 自建球员页定制
 * 1. 所有「存档球员」显示改成「我」
 * 2. 去掉立绘素材位，改成「我」的字卡
 * 3. 属性条恢复原版样式（成长体系回退原版）
 * 只对 career.playerId === 'custom' 生效。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__customPlayerPatched) return;

  function nameHash(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  /* 旧存档没有 englishName 时，按生涯固定信息生成一个可复现的英文名，
     不再把「MY NAME」当成占位文字显示在球员页上。 */
  function fallbackEn() {
    var c = null;
    try { if (typeof career !== 'undefined' && career) c = career; } catch (e) {}
    if (!c) return 'Rookie';
    var arch = c.__arch || {};
    var seed = [c.draftYear, c.origin, arch.origin, arch.style, arch.vow, c.team, c.seasonYear || c.seasonNo].join('|');
    var n = nameHash(seed) % 997;
    var nm = '';
    try {
      if (window.v180EnglishName) nm = window.v180EnglishName(Number(c.draftYear) || 2001, n, null);
    } catch (e) {}
    if (!nm) nm = 'Rookie ' + (100 + (n % 900));
    try { c.englishName = nm; } catch (e) {}
    return nm;
  }

  function displayEn() {
    try {
      if (typeof career !== 'undefined' && career && career.englishName) return career.englishName;
    } catch (e) {}
    return fallbackEn();
  }

  function fallbackZh() {
    var c = null;
    try { if (typeof career !== 'undefined' && career) c = career; } catch (e) {}
    if (!c) return '无名新秀';
    if (c.playerNameZh && c.playerNameZh !== '我') return c.playerNameZh;
    var arch = c.__arch || {};
    var seed = [c.draftYear, c.origin, arch.origin, arch.style, arch.vow, c.team, c.seasonYear || c.seasonNo].join('|');
    var picked = null;
    try {
      if (typeof window.v189RandomName === 'function') {
        picked = window.v189RandomName(arch.origin || c.origin || '', seed);
      }
    } catch (e) {}
    var zh = (picked && picked.zh) || c.englishName || '无名新秀';
    try { c.playerNameZh = zh; } catch (e) {}
    return zh;
  }

  function displayZh() {
    try {
      if (typeof career !== 'undefined' && career && career.playerNameZh && career.playerNameZh !== '我') return career.playerNameZh;
    } catch (e) {}
    return fallbackZh();
  }

  function fixProfile() {
    try {
      if (typeof career === 'undefined' || !career || career.playerId !== 'custom') return;
      career.playerName = displayZh();
      var arr = (typeof P !== 'undefined' && Array.isArray(P)) ? P : [];
      for (var i = 0; i < arr.length; i++) {
        var p = arr[i];
        if (!p || String(p.id) !== 'custom') continue;
        p.zh = displayZh();
        p.en = displayEn();
        p.pos = '自建球员';
        p.title = '我的生涯';
        p.tagline = '';
        p.desc = '你从选秀夜开始，自己写下了这条生涯。';
        p.tags = ['自建球员'];
        p.reality = '这是一段没有人写过的人生。';
      }
    } catch (e) {}
  }

  /* 统一 playerBy('custom') 的档案字段，HUD / 存档槽 / 球员页都会读到 */
  try {
    var prevPlayerBy = playerBy;
    playerBy = function (id) {
      var p = prevPlayerBy.apply(this, arguments);
      try {
        if (String(id) === 'custom' && p) {
          p.zh = displayZh();
          p.en = displayEn();
          p.pos = '自建球员';
          p.title = '我的生涯';
          p.tagline = '';
          p.desc = '你从选秀夜开始，自己写下了这条生涯。';
          p.tags = ['自建球员'];
          p.reality = '这是一段没有人写过的人生。';
        }
      } catch (e) {}
      return p;
    };
  } catch (e) {}

  /* playerBy 是 const 箭头函数，直接赋值不会生效；
     改成每次渲染前同步一次 P 里的自建球员档案。 */
  try {
    var prevRenderProfile = render;
    render = function () {
      try { fixProfile(); } catch (e) {}
      return prevRenderProfile.apply(this, arguments);
    };
  } catch (e) {}

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function portrait() {
    return '<div class="me-portrait"><span class="me-word">我</span><small>' + esc(displayEn()) + '</small></div>';
  }

  function attrGrid() {
    var names = (typeof ATTR !== 'undefined' && ATTR) ? ATTR : {};
    var G = window.__GROWTH__;
    var rows = Object.keys(names).map(function (k) {
      var val = Number((career.attrs && career.attrs[k]) || 0);
      var hard = 110, pot = val;
      try {
        if (G && typeof G.hard === 'function') hard = Number(G.hard(k)) || 110;
        if (G && typeof G.potential === 'function') pot = Number(G.potential(k));
      } catch (e) {}
      hard = Math.max(1, hard);
      pot = Math.max(0, Math.min(hard, isFinite(pot) ? pot : val));
      var fill = Math.max(0, Math.min(100, val / hard * 100));
      var potW = Math.max(0, Math.min(100, pot / hard * 100));
      var diff = pot - val;
      var foot = diff >= 0 ? '距潜力 ' + diff : '超出潜力 ' + Math.abs(diff);
      return '<div class="me-attr">'
        + '<div class="me-attr-top"><span class="me-n">' + esc(names[k]) + '</span>'
        + '<span class="me-v">' + val + '<small> / ' + hard + '</small></span></div>'
        + '<div class="me-track"><i class="me-fill" style="width:' + fill.toFixed(2) + '%"></i>'
        + '<i class="me-pot" style="left:' + potW.toFixed(2) + '%"></i></div>'
        + '<div class="me-attr-foot"><span>潜力 ' + pot + '</span><span>' + foot + '</span></div>'
        + '</div>';
    }).join('');
    return '<div class="me-legend"><span><i></i>当前能力</span><span><i class="me-lg-pot"></i>潜力黄条</span><span>硬上限 110</span></div>'
      + '<div class="attr-grid me-attr-grid">' + rows + '</div>';
  }

  try {
    var prevPlayerView = playerView;
    playerView = function () {
      var h = prevPlayerView.apply(this, arguments);
      try {
        if (typeof career === 'undefined' || !career || career.playerId !== 'custom') return h;
        fixProfile();
        /* 自建球员不再展示左侧「我」字卡，资料文案直接铺满整行。 */
        h = h.replace(/<div class="asset-slot[^"]*">[\s\S]*?<span>画面将在这里呈现<\/span><\/div><\/div>/, '');
        h = h.replace('<div class="profile-grid">', '<div class="profile-grid no-portrait">');
        h = h.replace('<small>custom · —</small>', '<small>' + esc(displayEn()) + ' · 自建球员</small>');
        h = h.replace('<h2>存档球员</h2>', '<h2>我</h2>');
        h = h.replace(/<p>球员 id「custom」[^<]*<\/p>/, '<p class="me-desc">你从选秀夜开始，自己写下了这条生涯。</p>');
      } catch (e) {}
      return h;
    };
  } catch (e) {}

  try {
    var prevRender = render;
    render = function () {
      fixProfile();
      return prevRender.apply(this, arguments);
    };
  } catch (e) {}

  fixProfile();
  window.__customPlayerPatched = true;
})();
