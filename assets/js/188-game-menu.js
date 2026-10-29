/* ============================================================
 * 188 · 游戏内菜单
 *   · 右上角原来的「保存存档」「退役」两个按钮，收进一个 ☰ 菜单
 *   · 中间弹窗：读取存档 / 宣布退役 / 保存并退出到主页 / 取消
 *   · 保存并退出会先保存本机，再尝试同步云端，然后回首页
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v188GameMenu) return;
  window.__v188GameMenu = true;

  var ICONS = {
    load: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M4 8h16v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/>'
      + '<path d="M4 8l2-3h12l2 3"/>'
      + '<path d="M9 12h6"/></svg>',
    retire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M6 21V4"/>'
      + '<path d="M6 5h9l-2 3 2 3H6"/></svg>',
    exit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M4 11l8-6 8 6"/>'
      + '<path d="M6 10v10h12V10"/>'
      + '<path d="M10 20v-5h4v5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">'
      + '<path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  function close() {
    try {
      var el = document.getElementById('v188-game-menu');
      if (el && el.parentNode) el.parentNode.removeChild(el);
    } catch (e) {}
  }

  function open() {
    try {
      if (document.getElementById('v188-game-menu')) return;
      var d = document.createElement('div');
      d.id = 'v188-game-menu';
      d.className = 'v188-menu-overlay';
      d.setAttribute('role', 'dialog');
      d.setAttribute('aria-modal', 'true');
      d.innerHTML = '<div class="v188-menu-card" onclick="event.stopPropagation()">'
        + '<div class="v188-menu-head"><div><small>CAREER MENU</small><h2>生涯菜单</h2></div>'
        + '<button class="v188-menu-close" onclick="v188CloseGameMenu()" aria-label="关闭">' + ICONS.close + '</button></div>'
        + '<div class="v188-menu-list">'
        + '<button class="v188-menu-item" onclick="v188MenuLoad()"><span class="v188-menu-icon">' + ICONS.load + '</span><span><b>读取存档</b><small>切换到其他存档位</small></span><em>→</em></button>'
        + '<button class="v188-menu-item danger" onclick="v188MenuRetire()"><span class="v188-menu-icon">' + ICONS.retire + '</span><span><b>宣布退役</b><small>结束当前生涯并生成最终报告</small></span><em>→</em></button>'
        + '<button class="v188-menu-item primary" onclick="v188MenuSaveExit()"><span class="v188-menu-icon">' + ICONS.exit + '</span><span><b>保存并退出到主页</b><small>先保存本机，再尝试同步云端</small></span><em>→</em></button>'
        + '</div>'
        + '<button class="v188-menu-cancel" onclick="v188CloseGameMenu()">取消</button>'
        + '</div>';
      d.onclick = function (e) { if (e.target === d) close(); };
      document.body.appendChild(d);
    } catch (e) { console.error('[188] open menu failed', e); }
  }

  window.v188OpenGameMenu = open;
  window.v188CloseGameMenu = close;

  window.v188MenuLoad = function () {
    close();
    try { stopSim(); } catch (e) {}
    try { if (typeof save === 'function') save(); } catch (e) {}
    try {
      ui.screen = 'home';
      ui.v82Picker = 'pickLoad';
      ui.v82FullRank = false;
      ui.modal = null;
      ui.storyEvent = null;
      render();
    } catch (e) {}
  };

  window.v188MenuRetire = function () {
    close();
    try { stopSim(); } catch (e) {}
    try {
      ui.modal = { kind: 'retire' };
      render();
    } catch (e) {}
  };

  window.v188MenuSaveExit = async function () {
    close();
    try { stopSim(); } catch (e) {}
    try { if (typeof save === 'function') save(); } catch (e) {}
    try {
      if (typeof window.v167SaveNow === 'function') {
        await window.v167SaveNow();
      }
    } catch (e) {
      try { if (typeof notify === 'function') notify('本机进度已保存，云端同步暂未完成'); } catch (err) {}
    }
    try {
      if (typeof career !== 'undefined') career = null;
      ui.screen = 'home';
      ui.tab = 'season';
      ui.v82Picker = null;
      ui.v82FullRank = false;
      ui.modal = null;
      ui.storyEvent = null;
      render();
    } catch (e) {}
  };

  /* 把右上角的两个按钮替换成一个 ☰ */
  try {
    var prevHud = renderHud;
    renderHud = function () {
      var h = prevHud.apply(this, arguments);
      try {
        if (typeof h !== 'string') return h;
        h = h.replace(/<button\b[^>]*class="[^"]*v170-save-button[^"]*"[\s\S]*?<\/button>/g, '');
        h = h.replace(/<button\b[^>]*class="[^"]*v84-hud-retire[^"]*"[\s\S]*?<\/button>/g, '');
        if (h.indexOf('v188-menu-btn') < 0) {
          var btn = '<button class="v188-menu-btn" onclick="v188OpenGameMenu()" aria-label="打开生涯菜单" title="生涯菜单">'
            + '<svg class="v188-burger" viewBox="0 0 24 24" aria-hidden="true">'
            + '<path d="M5 7h14M5 12h9M5 17h14"/>'
            + '<circle cx="18" cy="12" r="1.45"/>'
            + '</svg></button>';
          h = h.replace('<div class="hud-right">', '<div class="hud-right">' + btn);
        }
      } catch (e) {}
      return h;
    };
    window.renderHud = renderHud;
  } catch (e) { console.error('[188] renderHud wrap failed', e); }

  var style = document.createElement('style');
  style.id = 'v188-game-menu-style';
  style.textContent = [
    '.v188-menu-btn{width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.15);background:rgba(16,26,38,.82);color:#e8ecf1;font-size:17px;line-height:1;display:grid;place-items:center;cursor:pointer;flex:none;margin-right:4px;transition:background .15s,border-color .15s,transform .15s}',
    '.v188-menu-btn:hover{background:rgba(255,210,63,.12);border-color:rgba(255,210,63,.42)}',
    '.v188-menu-btn:active{transform:scale(.94)}',
    '.v188-burger{width:18px;height:18px;display:block;overflow:visible}',
    '.v188-burger path{fill:none;stroke:#ffd23f;stroke-width:2;stroke-linecap:round}',
    '.v188-burger circle{fill:#ffd23f}',
    '.v188-menu-overlay{position:fixed;inset:0;z-index:100002;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(3,6,10,.72);backdrop-filter:blur(9px)}',
    '.v188-menu-card{width:min(100%,360px);max-height:calc(100vh - 40px);overflow:auto;background:linear-gradient(160deg,#111b28,#070b12);border:1px solid rgba(255,210,63,.22);border-radius:22px;padding:18px;color:#e8ecf1;box-shadow:0 28px 80px rgba(0,0,0,.62)}',
    '.v188-menu-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px}',
    '.v188-menu-head small{display:block;font-size:8.5px;letter-spacing:.18em;color:#ffd23f;font-weight:900}',
    '.v188-menu-head h2{margin:4px 0 0;color:#fff;font-size:25px;line-height:1.1}',
    '.v188-menu-close{flex:none;width:32px;height:32px;border-radius:50%;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);color:#fff;font-size:18px;line-height:1;cursor:pointer;display:grid;place-items:center}',
    '.v188-menu-close svg{width:14px;height:14px;display:block}',
    '.v188-menu-list{display:grid;gap:7px}',
    '.v188-menu-item{display:grid;grid-template-columns:34px 1fr auto;gap:9px;align-items:center;width:100%;padding:11px 10px;border-radius:14px;border:1px solid rgba(255,255,255,.08);background:#121c28;color:#fff;text-align:left;cursor:pointer}',
    '.v188-menu-item:active{transform:scale(.995)}',
    '.v188-menu-icon{width:34px;height:34px;border-radius:11px;background:rgba(255,210,63,.10);border:1px solid rgba(255,210,63,.14);display:grid;place-items:center;color:#ffd23f;flex:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}',
    '.v188-menu-icon svg{width:18px;height:18px;display:block;color:#ffd23f;stroke:#ffd23f}',
    '.v188-menu-item b{display:block;font-size:12.5px;color:#fff;line-height:1.4}',
    '.v188-menu-item small{display:block;margin-top:2px;font-size:9px;line-height:1.45;color:#8d9bab}',
    '.v188-menu-item em{font-style:normal;color:#8d9bab;font-size:12px}',
    '.v188-menu-item.primary{border-color:rgba(255,210,63,.34);background:linear-gradient(135deg,rgba(255,210,63,.14),#121c28)}',
    '.v188-menu-item.danger .v188-menu-icon{background:rgba(255,120,120,.10);border-color:rgba(255,120,120,.18);color:#ff8a8f}',
    '.v188-menu-item.danger .v188-menu-icon svg{color:#ff8a8f;stroke:#ff8a8f}',
    '.v188-menu-cancel{width:100%;margin-top:11px;height:40px;border:1px solid rgba(255,255,255,.12);border-radius:12px;background:rgba(255,255,255,.04);color:#9aa3b2;font-size:10.5px;font-weight:800;cursor:pointer}'
  ].join('');
  document.head.appendChild(style);
})();