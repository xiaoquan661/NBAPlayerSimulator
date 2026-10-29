
/* ============================================================
 * 模式分流：模拟明星球员 / 自建球员
 *   - 首页主按钮 -> 模式选择
 *   - star   : 原版选人 + 原版事件链
 *   - custom : 四步进度条捏人 + 自建事件链
 *   其他系统（比赛、成长、伤病、合同、结局）共用。
 * ============================================================ */
(function () {
  'use strict';

  if (window.__modeSplit163) return;
  window.__modeSplit163 = true;
  /* 事件系统先沿用原版：151 的自白/里程碑/声望/背景事件池暂停。 */
  window.__ORIGINAL_EVENTS__ = true;

  function currentMode() {
    return window.__GAME_MODE__ || null;
  }
  window.__gameMode = currentMode;

  function resetCreator() {
    var CG = window.__CREATOR__;
    if (!CG) return;
    CG.step = 0;
    CG.year = null;
    CG.origin = null;
    CG.difficulty = null;
    CG.style = null;
    CG.vow = null;
    CG.step = 0;
    CG.originRoll = null;
    CG.originRerolls = 2;
    CG.englishName = null;
    CG.playerNameZh = null;
    CG.nameKind = '';
    CG.talentReady = false;
    CG.player = null;
    CG.playerJson = null;
    CG.potentialCaps = null;
    CG.potentialOvr = null;
    CG.archetype = null;
    CG.pendingArch = null;
    CG.draftResult = null;
    try { window.__DRAFT_RESULT__ = null; } catch (e) {}
  }

  /* 首页「新生涯」先进入模式选择：模拟明星球员 / 自建球员。 */
  function openModes() {
    try { window.stopSim && window.stopSim(); } catch (e) {}
    try { ui.storyEvent = null; ui.modal = null; } catch (e) {}
    window.__GAME_MODE__ = null;
    /* 开始新生涯时清掉内存里的旧生涯，避免 currentP() 继续读到上一局球员。 */
    try { career = null; } catch (e) {}
    resetCreator();
    try {
      ui.selected = 'bennett';
      ui.starAwaitingPick = false;
      ui.exclusive = false;
      ui.allTalents = false;
      ui.talentPick = null;
      ui.talentDrawCount = 1;
      ui.talentAdRefreshes = 0;
    } catch (e) {}
    ui.screen = 'modes';
    render();
  }
  window.openModes = openModes;

  function pickMode(mode) {
    try { window.stopSim && window.stopSim(); } catch (e) {}
    if (mode === 'star') {
      window.__GAME_MODE__ = 'star';
      try {
        ui.starAwaitingPick = true;
        ui.selected = 'bennett';
        ui.exclusive = false;
        ui.allTalents = false;
        ui.talentPick = null;
      } catch (e) {}
      /* 原版选人页：五位状元，沿用原版天赋 / 主线 / 事件。 */
      if (typeof startSelect === 'function') startSelect();
      else { ui.screen = 'select'; ui.selected = 'bennett'; render(); }
      return;
    }
    window.__GAME_MODE__ = 'custom';
    try { career = null; } catch (e) {}
    resetCreator();
    try {
      ui.selected = 'custom';
      ui.starAwaitingPick = false;
      ui.exclusive = false;
      ui.allTalents = false;
      ui.originStoryUnlocked = false;
    } catch (e) {}
    ui.screen = 'select';
    render();
  }
  window.pickMode = pickMode;
  window.__pickGameMode = pickMode;

  var MODE_CSS = [
    '.mode-wrap{min-height:100dvh;background:#12151a;color:#e8ecf1;padding:20px 16px 44px;max-width:750px;margin:0 auto}',
    '.mode-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}',
    '.mode-top strong{font-size:15px;letter-spacing:1px;color:#ffffff}',
    '.mode-back{width:36px;height:36px;border-radius:50%;border:1px solid #2f3742;background:#1c2129;color:#ffffff;font-size:16px;cursor:pointer}',
    '.mode-hero small{color:#4d8dff;font-size:11px;letter-spacing:3px;font-weight:700}',
    '.mode-hero h2{font-size:27px;line-height:1.2;margin:8px 0 8px;color:#ffffff}',
    '.mode-hero p{font-size:13px;line-height:1.75;color:#9aa3b2;margin:0 0 20px}',
    '.mode-grid{display:grid;gap:14px}',
    '.mode-card{position:relative;text-align:left;background:#1c2129;border:1px solid #2f3742;border-radius:18px;padding:18px 18px 16px;color:#e8ecf1;cursor:pointer;transition:border-color .15s,transform .15s;font-family:inherit}',
    '.mode-card:hover{border-color:#ffd23f;transform:translateY(-2px)}',
    '.mode-card .tag{display:inline-block;font-size:10px;letter-spacing:2px;color:#ffd23f;border:1px solid #ffd23f55;border-radius:5px;padding:2px 8px;margin-bottom:10px}',
    '.mode-card h3{font-size:19px;line-height:1.3;margin:0 0 8px;color:#ffffff}',
    '.mode-card p{font-size:12px;line-height:1.7;color:#9aa3b2;margin:0}',
    '.mode-card .meta{margin-top:10px;font-size:11px;color:#6fa3ff;line-height:1.6}',
    '.mode-card .arrow{position:absolute;right:16px;bottom:14px;color:#ffd23f;font-size:20px;line-height:1}',
    '.mode-note{margin-top:18px;font-size:11px;color:#6b7484;line-height:1.7}',
    '@media(max-width:370px){.mode-hero h2{font-size:23px}.mode-card{padding:16px}}'
  ].join('');
  var MODE_STYLE_ID = 'mode-split-style';

  function modeView() {
    return '<style id="' + MODE_STYLE_ID + '">' + MODE_CSS + '</style>'
      + '<section class="mode-wrap">'
      + '<div class="mode-top"><button class="mode-back" onclick="ui.screen=\'home\';render()">←</button><strong>选择生涯模式</strong><span style="width:36px"></span></div>'
      + '<div class="mode-hero"><small>CHOOSE YOUR PATH</small><h2>你想怎么开始</h2>'
      + '<p>两种模式共用比赛、伤病与合同系统。区别只有两个：出生是否确定，以及故事与结局由哪一套事件系统来写。</p></div>'
      + '<div class="mode-grid">'
      + '<button class="mode-card" onclick="pickMode(\'star\')"><span class="tag">MODE 01 · 原版主线</span>'
      + '<h3>模拟明星球员</h3><p>选一位真实状元，沿着原版专属主线，把他的职业生涯重新打一遍。出生、球队、年代都是确定的。</p>'
      + '<div class="meta">固定出生 · 原版专属剧情 · 命运改写</div><span class="arrow">→</span></button>'
      + '<button class="mode-card" onclick="pickMode(\'custom\')"><span class="tag">MODE 02 · 自建生涯</span>'
      + '<h3>选择自建球员</h3><p>从出身、年代、球风、自白、天赋、难度开始，创造一名没有人写过的球员。出生不确定，故事由你的选择长出来。</p>'
      + '<div class="meta">自选出生 · 自白 / 里程碑 / 声望事件 · 名字的回声</div><span class="arrow">→</span></button>'
      + '</div>'
      + '<p class="mode-note">首页点「读取存档」可以直接继续；「新生涯」才需要重新选模式。</p>'
      + '</section>';
  }

  /* 模式选择页：ui.screen='modes' 时由 163 接管渲染。 */
  try {
    var prevRenderModes = render;
    render = function () {
      try {
        if (typeof ui !== 'undefined' && ui && ui.screen === 'modes') {
          var app = document.getElementById('app');
          if (app) { app.innerHTML = modeView(); return; }
        }
      } catch (e) {}
      return prevRenderModes.apply(this, arguments);
    };
    window.render = render;
  } catch (e) {}

  /* 事件系统先沿用原版：不再渲染自建 6 章主线页。 */
  var prevStoryView = storyView;
  storyView = function () {
    return prevStoryView.apply(this, arguments);
  };
  window.storyView = storyView;

  /* 首页：开局直接选模式，不再先点「新生涯」。 */
  try {
    var homeStyle = document.createElement('style');
    homeStyle.id = 'v163-home-modes-style';
    homeStyle.textContent = [
      '.v163-mode-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
      '.v163-mode-row .btn{width:100%!important;height:48px!important;font-size:13.5px!important}',
      '.v163-custom-cta{background:#1c2129!important;color:#ffffff!important;border:1px solid #3a4655!important;box-shadow:none!important}'
    ].join('');
    document.head.appendChild(homeStyle);
  } catch (e) {}

  var prevHome = renderHome;
  renderHome = function () {
    var h = prevHome.apply(this, arguments);
    try {
      var modeBlock = '<div class="v163-mode-row">'
        + '<button class="btn primary cover-main-cta" onclick="pickMode(\'star\')">模拟明星球员</button>'
        + '<button class="btn secondary cover-main-cta v163-custom-cta" onclick="pickMode(\'custom\')">自建球员</button>'
        + '</div>';
      var next = h.replace(/<button[^>]*onclick="startSelect\(\)"[^>]*>[\s\S]*?<\/button>/, modeBlock);
      if (next !== h) h = next;
      else h = h.replace(/onclick="startSelect\(\)"/g, "onclick=\"pickMode('star')\"");
      h = h.replace(/开始我的生涯/g, '选择模式');
      h = h.replace(/选择存档/g, '读取存档');
      h = h.replace('从选秀夜开始，写下你自己的结局。', '');
      h = h.replace(/<p>\s*<\/p>/g, '');
    } catch (e) {}
    return h;
  };

  /* 选人页：明星模式走原版五位状元；自建模式走四步进度条捏人。 */
  var prevRenderSelect = renderSelect;
  renderSelect = function () {
    if (currentMode() === 'star' && typeof window.__ORIG_RENDER_SELECT__ === 'function') {
      var h = window.__ORIG_RENDER_SELECT__.apply(this, arguments);
      try {
        if (ui && ui.starAwaitingPick) {
          /* 原版默认选中本内特；这里只做视觉取消，不破坏页面构建。 */
          h = h.replace(/class="([^"]*)"/g, function (_, cls) {
            var tokens = cls.split(/\s+/).filter(function (x) { return x && x !== 'selected'; });
            return 'class="' + tokens.join(' ') + '"';
          });
          h = h.replace(/onclick="ui\.selected='/g, "onclick=\"ui.starAwaitingPick=false;ui.selected='");
          h = h.replace(/<div class="sticky-cta">[\s\S]*?<\/div>/,
            '<div class="sticky-cta"><button class="btn primary" disabled style="opacity:.45;cursor:not-allowed">先选择一位球星</button>'
            + '<p style="margin:8px 0 0;text-align:center;font-size:10px;color:#9aa3b2">点击上方球星卡片后继续</p></div>');
        }
      } catch (e) {}
      return h;
    }
    return prevRenderSelect.apply(this, arguments);
  };
  window.renderSelect = renderSelect;

  /* 未选球星时禁止进入天赋页。 */
  try {
    var prevOpenTalents = openTalents;
    openTalents = function () {
      try {
        if (currentMode() === 'star' && ui && ui.starAwaitingPick) {
          notify('先选择一位球星');
          return;
        }
      } catch (e) {}
      return prevOpenTalents.apply(this, arguments);
    };
    window.openTalents = openTalents;
  } catch (e) {}

  /* 其它入口直接调用 startSelect 时，也让明星模式先处于未选状态。 */
  try {
    var prevStartSelect = startSelect;
    startSelect = function () {
      try {
        if (currentMode() === 'star' && typeof ui !== 'undefined' && ui) ui.starAwaitingPick = true;
      } catch (e) {}
      return prevStartSelect.apply(this, arguments);
    };
    window.startSelect = startSelect;
  } catch (e) {}

  /* 创建生涯：明星模式走原版；自建模式走自建初始化。 */
  var prevCreateCareer = createCareer;
  createCareer = function () {
    var mode = currentMode();
    if (mode !== 'star') window.__GAME_MODE__ = 'custom';
    var capturedEnglishName = window.__CREATOR__ && window.__CREATOR__.englishName;
    var result = prevCreateCareer.apply(this, arguments);
    if (mode === 'star') return result;
    try {
      if (career && career.playerId === 'custom') {
        career.englishName = capturedEnglishName || career.englishName || '';
        /* 新档在内存里补齐 __arch。 */
        var CG = window.__CREATOR__ || {};
        var arch = career.__arch || CG.pendingArch || null;
        if (arch) {
          if (!arch.year) arch.year = CG.year || career.draftYear || 0;
          career.__arch = arch;
          if (typeof career.domesticFame !== 'number') career.domesticFame = arch.fame;
        }
        career.feed = (career.feed || []).filter(function (t) {
          return String(t).indexOf('本局未解锁状元专属天赋') < 0;
        });
        /* 兜底：把捏人时生成的可见潜力带进生涯。 */
        if (!career.potentialCaps && CG.potentialCaps) {
          career.potentialCaps = CG.potentialCaps;
          career.potentialOvr = CG.potentialOvr;
          career.potentialHard = 110;
        }
        /* 落选线：不再打夏季联赛，直接给 10 天短合同，3 场试用。 */
        var dr = CG.draftResult || window.__DRAFT_RESULT__;
        if (dr && dr.pick === 0 && !career.__summerDone) {
          career.stage = 'summer';
          career.summer = { phase: 'trial', games: [], trialGames: [], attempts: 0, team: '' };
          ui.screen = 'summer';
          save();
        }
        /* 162 的球员页补丁会在 render 时把 P.custom 改成「我」；
           这里补一次渲染，保证进生涯第一屏就是「我」而不是「无名新秀」。 */
        try { render(); } catch (e) {}
      }
    } catch (e) {}
    return result;
  };
  window.createCareer = createCareer;

  /* 事件系统先沿用原版：不再拦截 custom 的 maybeStory。 */
  var prevMaybeStory = maybeStory;
  maybeStory = function () {
    return prevMaybeStory.apply(this, arguments);
  };

  /* 自建捏人第一步返回：回到模式选择，而不是首页 */
  try {
    var CG = window.__CREATOR__;
    if (CG && typeof CG.stepBack === 'function') {
      var prevStepBack = CG.stepBack;
      CG.stepBack = function () {
        var noSelection = !CG.year && !CG.origin && !CG.difficulty && !CG.style && !CG.vow;
        if (noSelection && currentMode() === 'custom') {
          ui.screen = 'home';
          render();
          return;
        }
        return prevStepBack.apply(this, arguments);
      };
    }
  } catch (e) {}

  /* 读档/继续时按存档里的球员类型恢复模式 */
  try {
    var prevLoad = load;
    load = function () {
      var c = prevLoad.apply(this, arguments);
      if (c) window.__GAME_MODE__ = c.playerId === 'custom' ? 'custom' : 'star';
      return c;
    };
  } catch (e) {}
  try {
    var prevContinue = continueSave;
    continueSave = function () {
      var r = prevContinue.apply(this, arguments);
      if (typeof career !== 'undefined' && career) {
        window.__GAME_MODE__ = career.playerId === 'custom' ? 'custom' : 'star';
      }
      return r;
    };
  } catch (e) {}

  /* 首次渲染（部分旧层会覆盖 render，这里确保首页按钮已被替换） */
  try { if (document.getElementById('app') && ui && ui.screen === 'home') render(); } catch (e) {}
})();
