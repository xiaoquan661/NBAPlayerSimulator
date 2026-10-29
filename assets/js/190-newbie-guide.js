/* ============================================================
 * 190 · 新手导引
 *   - 首次进入时，按当前页面框选必要操作，箭头 + 文字说明
 *   - 只指引关键步骤：选模式 → 选球员/捏人 → 天赋 → 选秀 → 比赛 → 专精
 *   - 点击「跳过」后不再自动出现；window.v190Guide.reset() 可重看
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v190Guide) return;
  window.__v190Guide = true;

  var KEY = 'nba_newbie_guide_v1';
  var done = false;
  try { done = localStorage.getItem(KEY) === '1'; } catch (e) {}

  var spot = null;
  var tip = null;
  var arrow = null;
  var current = -1;
  var finished = {};
  var lastKey = '';
  var pendingPlace = 0;
  var retryTimer = 0;
  var warnTimer = 0;

  function clearPending() {
    if (pendingPlace) {
      try { clearTimeout(pendingPlace); } catch (e) {}
      pendingPlace = 0;
    }
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = 0;
    }
  }

  function uiSafe() {
    try { return typeof ui !== 'undefined' && ui ? ui : null; } catch (e) { return null; }
  }
  function careerSafe() {
    try { return typeof career !== 'undefined' && career ? career : null; } catch (e) { return null; }
  }
  function mode() {
    try { return window.__GAME_MODE__ || ''; } catch (e) { return ''; }
  }
  function blocked() {
    var u = uiSafe();
    if (!u) return true;
    if (u.storyEvent || u.modal) return true;
    if (document.getElementById('v188-game-menu')) return true;
    if (u.screen === 'leaderboard' || u.screen === 'retired') return true;
    return false;
  }

  function playerTab() {
    try {
      var btns = document.querySelectorAll('.dock button');
      for (var i = 0; i < btns.length; i++) {
        if (String(btns[i].textContent || '').indexOf('球员') >= 0) return btns[i];
      }
    } catch (e) {}
    return document.querySelector('.dock button:nth-child(2)');
  }

  var STEPS = [
    {
      id: 'mode',
      target: function () { return document.querySelector('.v163-mode-row') || document.querySelector('.cover-actions'); },
      title: '先选一个开始方式',
      text: '想直接玩真实球星，点「模拟明星球员」；想自己捏一个人，点「自建球员」。',
      placement: 'bottom',
      nextText: '知道了',
      ready: function () { return true; }
    },
    {
      id: 'select',
      target: function () {
        return mode() === 'star'
          ? (document.querySelector('.scenario-card') || document.querySelector('.scenario-deck'))
          : (document.querySelector('.creator-grid') || document.querySelector('.creator-hero') || document.querySelector('.creator-wrap'));
      },
      title: function () {
        return mode() === 'star' ? '选一位球星' : '把这个人捏出来';
      },
      text: function () {
        return mode() === 'star'
          ? '点一位球星卡片，查看他的能力、天赋和专属故事，然后点底部按钮继续。'
          : '按页面里的 01—04 步完成出身、打法、天赋和难度。每一步都会决定这段生涯的起点。';
      },
      placement: 'top',
      nextText: function () {
        return mode() === 'star' ? '选好球星后继续' : '完成 01—04 后继续';
      },
      ready: function () {
        if (mode() === 'star') {
          var u = uiSafe();
          return !!(u && !u.starAwaitingPick);
        }
        var CG = window.__CREATOR__ || {};
        return Number(CG.step) >= 3;
      },
      hint: function () {
        return mode() === 'star' ? '先在下面点一位球星，再继续。' : '先完成出身、打法、难度和确认。';
      }
    },
    {
      id: 'talents',
      target: function () { return document.querySelector('.v184-talents') || document.querySelector('.v184-sec'); },
      title: '选一个天赋',
      text: '四张天赋选 1 张；免费刷新用完后，可以看奖励视频再换一组。天赋会影响这一整段生涯。',
      placement: 'top',
      nextText: '选好天赋后继续',
      ready: function () {
        var u = uiSafe();
        return !!(u && (u.talentPick != null || u.allTalents));
      },
      hint: '先点一张天赋，再继续。'
    },
    {
      id: 'draft',
      target: function () { return document.querySelector('.draft-text') || document.querySelector('.draft-inner'); },
      title: '看完选秀夜',
      text: '台词会自动播放，最后一步会停在「开始职业生涯」，点一下正式进入联盟。',
      placement: 'top',
      nextText: '看完后继续',
      ready: function () { return true; }
    },
    {
      id: 'season',
      target: function () {
        return document.querySelector('.v168-next') || document.querySelector('.v168-run') || document.querySelector('.sim-main') || document.querySelector('.season-actions');
      },
      title: '开始打比赛',
      text: '点「模拟下一场」推进一场；想连续看结果就用「连续模拟」，随时可以暂停。',
      placement: 'top',
      nextText: '打完一场后继续',
      ready: function () {
        var c = careerSafe();
        return !!(c && (Number(c.games) || 0) >= 1);
      },
      hint: '先点「模拟下一场」打完一场，再继续。'
    },
    {
      id: 'focus',
      target: function () { return document.getElementById('focus-fab') || playerTab(); },
      title: '专精点用在这里',
      text: '赛季结束会发专精点。点「专精面板」或底部「球员」页，把点数投到你想提升的能力上。',
      placement: 'top',
      nextText: '完成',
      ready: function () { return true; }
    }
  ];

  function stepIndex() {
    var u = uiSafe();
    var c = careerSafe();
    if (!u || blocked()) return -1;
    if (u.screen === 'home') return 0;
    if (u.screen === 'select') return 1;
    if (u.screen === 'talents') return 2;
    if (u.screen === 'draft') return 3;
    if (u.screen === 'career') {
      if (u.tab === 'season' && (!c || (Number(c.games) || 0) < 1)) return 4;
      if (c && (Number(c.games) || 0) >= 1) return 5;
    }
    return -1;
  }

  function ensureNodes() {
    if (!spot) {
      spot = document.createElement('div');
      spot.className = 'v190-spot';
      spot.setAttribute('aria-hidden', 'true');
      document.body.appendChild(spot);
    }
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'v190-tip';
      tip.setAttribute('role', 'dialog');
      tip.setAttribute('aria-live', 'polite');
      document.body.appendChild(tip);
    }
  }

  function tipHTML(step, idx) {
    var title = typeof step.title === 'function' ? step.title() : step.title;
    var text = typeof step.text === 'function' ? step.text() : step.text;
    var nextText = typeof step.nextText === 'function' ? step.nextText() : (step.nextText || '下一步');
    return '<div class="v190-arrow" aria-hidden="true"></div>'
      + '<div class="v190-kicker">NEW PLAYER GUIDE · ' + (idx + 1) + '/' + STEPS.length + '</div>'
      + '<h3>' + title + '</h3>'
      + '<p>' + text + '</p>'
      + '<div class="v190-warn" aria-live="polite"></div>'
      + '<div class="v190-actions"><button class="v190-skip" onclick="v190Guide.skip()">跳过</button>'
      + '<button class="v190-next" onclick="v190Guide.next()">' + nextText + '</button></div>';
  }

  function warn(step) {
    ensureNodes();
    var msg = typeof step.hint === 'function' ? step.hint() : (step.hint || '先完成这一步，再点下一步。');
    var box = tip.querySelector('.v190-warn');
    if (box) box.textContent = msg;
    tip.classList.add('is-warn');
    if (warnTimer) clearTimeout(warnTimer);
    warnTimer = setTimeout(function () {
      if (tip) tip.classList.remove('is-warn');
    }, 1900);
  }

  function place(step, idx, attempt) {
    attempt = attempt || 0;
    var target = step.target();
    var r = target && target.getBoundingClientRect ? target.getBoundingClientRect() : null;
    if (!r || r.width < 2 || r.height < 2) {
      /* 新页面可能还没渲染完，短暂重试，避免导引直接消失。 */
      if (attempt < 6) {
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(function () {
          retryTimer = 0;
          place(step, idx, attempt + 1);
        }, 80);
      } else {
        hide();
      }
      return;
    }
    retryTimer = 0;
    ensureNodes();
    var pad = 4;
    spot.style.display = 'block';
    spot.style.left = (r.left - pad) + 'px';
    spot.style.top = (r.top - pad) + 'px';
    spot.style.width = Math.max(4, r.width + pad * 2) + 'px';
    spot.style.height = Math.max(4, r.height + pad * 2) + 'px';

    tip.style.display = 'block';
    tip.innerHTML = tipHTML(step, idx);
    tip.style.maxWidth = Math.min(330, window.innerWidth - 32) + 'px';
    tip.style.left = '0px';
    tip.style.top = '0px';
    tip.style.visibility = 'hidden';
    arrow = tip.querySelector('.v190-arrow');

    var tw = tip.offsetWidth || 300;
    var th = tip.offsetHeight || 150;
    var place = step.placement === 'top' ? 'top' : 'bottom';
    var left = Math.max(16, Math.min(window.innerWidth - tw - 16, r.left + r.width / 2 - tw / 2));
    var top;
    if (place === 'top') {
      top = Math.max(12, r.top - th - 16);
      /* 上方空间不足时翻到下方，箭头也跟着换方向。 */
      if (top + th > r.top - 8) {
        place = 'bottom';
        top = r.bottom + 16;
        if (top + th > window.innerHeight - 12) top = Math.max(12, r.top - th - 16);
      }
    } else {
      top = r.bottom + 16;
      if (top + th > window.innerHeight - 12) {
        place = 'top';
        top = Math.max(12, r.top - th - 16);
      }
    }
    tip.className = 'v190-tip ' + (place === 'top' ? 'is-top' : 'is-bottom');
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    tip.style.visibility = 'visible';
    if (arrow) {
      var ax = Math.max(16, Math.min(tw - 28, r.left + r.width / 2 - left - 7));
      arrow.style.left = ax + 'px';
    }
    current = idx;
  }

  function hide() {
    clearPending();
    if (warnTimer) {
      clearTimeout(warnTimer);
      warnTimer = 0;
    }
    if (spot) spot.style.display = 'none';
    if (tip) {
      tip.style.display = 'none';
      tip.innerHTML = '';
      tip.classList.remove('is-warn');
    }
    current = -1;
    lastKey = '';
  }

  function refresh() {
    try {
      if (done) { hide(); return; }
      var idx = stepIndex();
      if (idx < 0) { hide(); return; }
      /* 到了后面的页面，前面的步骤自动算完成，避免返回首页又弹一次。 */
      for (var i = 0; i < idx; i++) finished[STEPS[i].id] = true;
      var step = STEPS[idx];
      if (finished[step.id]) { hide(); return; }
      var key = idx + ':' + step.id;
      if (key === lastKey) {
        if (!pendingPlace) place(step, idx);
        return;
      }
      /* 跨页面时先把旧高亮收掉，等新页面完成布局后再出现，
         避免高亮框从上一页的位置滑到新位置。 */
      hide();
      lastKey = key;
      /* 等新页面完成布局后再定位。用 setTimeout 而不是 rAF：
         后台标签页/部分 WebView 会暂停 rAF，导致导引不出现。 */
      pendingPlace = setTimeout(function () {
        pendingPlace = 0;
        if (done) return;
        try { place(step, idx); } catch (e) { hide(); }
      }, 60);
    } catch (e) { hide(); }
  }

  function start() {
    done = false;
    finished = {};
    try { localStorage.removeItem(KEY); } catch (e) {}
    refresh();
  }

  function finish() {
    done = true;
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    hide();
  }

  function next() {
    var idx = stepIndex();
    if (idx < 0) { refresh(); return; }
    var step = STEPS[idx];
    if (!step) { refresh(); return; }
    if (current < 0) { refresh(); return; }
    var ready = true;
    try {
      if (typeof step.ready === 'function') ready = !!step.ready();
    } catch (e) { ready = true; }
    if (!ready) {
      warn(step);
      return;
    }
    finished[step.id] = true;
    var allDone = true;
    for (var i = 0; i < STEPS.length; i++) {
      if (!finished[STEPS[i].id]) { allDone = false; break; }
    }
    if (allDone) { finish(); return; }
    refresh();
  }

  window.v190Guide = {
    start: start,
    reset: start,
    next: next,
    skip: finish,
    refresh: refresh,
    state: function () { return { done: done, current: current, steps: STEPS.length }; }
  };

  /* 每次渲染后重新定位；页面切换时自动换到下一条指引。 */
  try {
    var prevRender = render;
    render = function () {
      var out = prevRender.apply(this, arguments);
      try { refresh(); } catch (e) {}
      return out;
    };
    window.render = render;
  } catch (e) {}

  window.addEventListener('resize', function () { if (!done) refresh(); });
  window.addEventListener('scroll', function () { if (!done) refresh(); }, true);

  var st = document.createElement('style');
  st.id = 'v190-guide-style';
  st.textContent = [
    '.v190-spot{position:fixed;z-index:200000;pointer-events:none;border:2px solid #ffd23f;border-radius:15px;box-shadow:0 0 0 9999px rgba(2,5,10,.74),0 0 28px rgba(255,210,63,.26);display:none}',
    '.v190-tip{position:fixed;z-index:200001;box-sizing:border-box;padding:14px 15px 13px;border-radius:17px;border:1px solid rgba(255,210,63,.34);background:linear-gradient(160deg,#111b28,#070b12);color:#e8ecf1;box-shadow:0 20px 60px rgba(0,0,0,.55);display:none}',
    '.v190-kicker{font-size:8px;letter-spacing:.16em;color:#ffd23f;font-weight:900}',
    '.v190-tip h3{margin:5px 0 0;font-size:16px;line-height:1.25;color:#fff}',
    '.v190-tip p{margin:7px 0 0;font-size:11px;line-height:1.65;color:#b8c3cf}',
    '.v190-warn{display:none;margin-top:8px;padding:7px 8px;border-radius:9px;border:1px solid rgba(255,210,63,.30);background:rgba(255,210,63,.08);color:#ffd98a;font-size:10.5px;line-height:1.55}',
    '.v190-tip.is-warn .v190-warn{display:block}',
    '.v190-tip.is-warn{animation:v190Nudge .32s ease}',
    '@keyframes v190Nudge{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}',
    '.v190-actions{display:flex;gap:8px;margin-top:12px}',
    '.v190-actions button{flex:1;height:36px;border-radius:11px;font-family:inherit;font-size:10.5px;font-weight:900;cursor:pointer}',
    '.v190-skip{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.04);color:#9aa3b2}',
    '.v190-next{border:1px solid #ffcf5a;background:linear-gradient(135deg,#ffe066,#ffbf2e);color:#101318}',
    '.v190-arrow{position:absolute;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent}',
    '.v190-tip.is-bottom .v190-arrow{top:-8px;border-bottom:8px solid #ffd23f}',
    '.v190-tip.is-top .v190-arrow{bottom:-8px;border-top:8px solid #ffd23f}',
    '@media(max-width:360px){.v190-tip{padding:12px}.v190-tip h3{font-size:15px}.v190-tip p{font-size:10.5px}}'
  ].join('');
  document.head.appendChild(st);

  /* 首次进入首页时自动显示；用户已有的新手标记会跳过。 */
  if (!done) {
    setTimeout(function () {
      try {
        if (uiSafe() && uiSafe().screen === 'home') refresh();
      } catch (e) {}
    }, 700);
  }
})();
