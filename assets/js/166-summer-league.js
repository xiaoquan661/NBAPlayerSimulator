
/* ============================================================
 * 落选线 · 10 天短合同
 *   落选 → 直接给 10 天短合同 → 3 场试用期 → 转正 或 离队
 *   不再打夏季联赛，不模拟 G 联赛，不额外造一个完整联盟。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__summerLeague166) return;
  window.__summerLeague166 = true;

  function rnd(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function teamList() {
    var arr = [];
    try {
      if (typeof teams !== 'undefined' && Array.isArray(teams)) {
        arr = teams.map(function (t) { return { abbr: t.abbr, name: t.name, power: Number(t.power) || 80 }; });
      }
    } catch (e) {}
    if (!arr.length) {
      try {
        var probe = document.createElement('script');
        probe.textContent = 'window.__SUMMER_TEAMS__=(typeof teams!=="undefined"&&Array.isArray(teams))?teams.map(function(t){return{abbr:t.abbr,name:t.name,power:t.power||80}}):null';
        document.head.appendChild(probe);
        arr = window.__SUMMER_TEAMS__ || [];
      } catch (e) {}
    }
    if (!arr.length) arr = [{ abbr: 'NOP', name: '新奥尔良鹈鹕', power: 80 }];
    return arr.sort(function (a, b) { return a.power - b.power; });
  }

  function pickTeam() {
    var list = teamList();
    // 落选球员通常从重建队/缺人球队拿到机会。
    return list[rnd(0, Math.min(5, list.length - 1))] || list[0];
  }

  function minSalary() {
    try { if (window.v152Finance && typeof window.v152Finance.minimum === 'function') return window.v152Finance.minimum(); } catch (e) {}
    return 1.0;
  }

  function simulateGames(n) {
    var a = (career && career.attrs) || {};
    var games = [];
    for (var i = 0; i < n; i++) {
      var pts = Math.round(8 + ((Number(a.finishing) || 60) + (Number(a.shooting) || 60) - 140) * 0.08 + rnd(-3, 5));
      var reb = Math.round(2 + ((Number(a.rebounding) || 60) - 50) * 0.06 + rnd(0, 4));
      var ast = Math.round(1 + ((Number(a.playmaking) || 60) - 50) * 0.06 + rnd(0, 3));
      games.push({ pts: clamp(pts, 0, 40), reb: clamp(reb, 0, 20), ast: clamp(ast, 0, 15), win: Math.random() < 0.45 });
    }
    return games;
  }

  function scoreOf(games) {
    if (!games || !games.length) return 0;
    var sum = 0, wins = 0;
    games.forEach(function (g) {
      sum += (Number(g.pts) || 0) + (Number(g.reb) || 0) * 0.5 + (Number(g.ast) || 0) * 0.7;
      if (g.win) wins++;
    });
    return sum / games.length + wins * 2;
  }

  function ensureSummer() {
    if (!career) return null;
    if (!career.summer) career.summer = { phase: 'trial', games: [], trialGames: [], attempts: 0, team: '' };
    var s = career.summer;
    if (!Array.isArray(s.games)) s.games = [];
    if (!Array.isArray(s.trialGames)) s.trialGames = [];
    /* 旧档的夏季联赛阶段迁移为 10 天短合同，不再显示夏季联赛。 */
    if (s.phase === 'summer') {
      s.phase = 'trial';
      s.games = [];
      s.trialGames = [];
    }
    if (!s.team) s.team = pickTeam().abbr;
    return s;
  }

  function finishSign(team, kind) {
    var s = ensureSummer();
    career.team = team.abbr;
    career.draftTeamName = team.name;
    /* 落选球员从未效力过初始占位球队，清掉“离开老东家”的错误叙事。 */
    try {
      if (career.v128) {
        career.v128.lastTeam = team.abbr;
        career.v128.formerTeam = null;
        career.v128.rivals = [];
        career.v128.history = [];
        career.v128.reputation = 0;
      }
      career.v129 = null;
    } catch (e) {}
    career.contract = { salary: minSalary(), years: 1, exception: kind === 'trial' ? 'ten-day-converted' : 'minimum' };
    career.stage = 'preseason';
    career.__summerDone = true;
    s.done = true;
    s.phase = 'signed';
    s.signedTeam = team.name;
    career.feed = (career.feed || []).filter(function (t) { return !/你离开了新奥尔良鹈鹕/.test(String(t)); });
    career.feed.unshift(kind === 'trial'
      ? '10 天短合同试用期结束：你留了下来，球队转成一年底薪合同。'
      : '夏季联赛结束：你拿到一份正式底薪合同，进入训练营。');
    try { if (typeof syncOvr === 'function') syncOvr(); } catch (e) {}
    ui.screen = 'career';
    ui.tab = 'season';
    save();
    render();
  }

  function release() {
    var s = ensureSummer();
    s.phase = 'released';
    career.feed = career.feed || [];
    career.feed.unshift('10 天短合同结束，球队没有续约。');
    save();
    render();
  }

  window.__SUMMER__ = {
    play: function () {
      var s = ensureSummer();
      if (!s || s.phase !== 'summer' || s.games.length) return;
      s.team = s.team || pickTeam().abbr;
      s.games = simulateGames(3);
      s.score = scoreOf(s.games);
      save();
      render();
    },
    acceptMin: function () {
      var s = ensureSummer();
      if (!s || s.phase !== 'summer' || !s.games.length) return;
      var t = teamList().find(function (x) { return x.abbr === s.team; }) || pickTeam();
      finishSign(t, 'summer');
    },
    startTrial: function () {
      var s = ensureSummer();
      if (!s || (s.phase !== 'summer' && s.phase !== 'trial') || s.trialGames.length) return;
      s.team = s.team || pickTeam().abbr;
      s.phase = 'trial';
      s.trialGames = simulateGames(3);
      s.trialScore = scoreOf(s.trialGames);
      s.trialTeam = s.team;
      save();
      render();
    },
    signTrial: function () {
      var s = ensureSummer();
      if (!s || s.phase !== 'trial' || !s.trialGames.length) return;
      var t = teamList().find(function (x) { return x.abbr === s.trialTeam; }) || pickTeam();
      finishSign(t, 'trial');
    },
    leave: function () { release(); },
    retire: function () {
      try { retire('落选后未能留在 NBA'); } catch (e) {}
    },
    retry: function () {
      var s = ensureSummer();
      if (!s || s.phase !== 'released') return;
      if ((s.attempts || 0) >= 1) return;
      s.attempts = (s.attempts || 0) + 1;
      career.age = (Number(career.age) || 19) + 1;
      career.seasonYear = (Number(career.seasonYear) || 2001) + 1;
      s.phase = 'trial';
      s.games = [];
      s.trialGames = [];
      s.trialScore = 0;
      s.trialTeam = '';
      s.team = '';
      career.stage = 'summer';
      ui.screen = 'summer';
      save();
      render();
    }
  };

  function gamesTable(games, label) {
    if (!games || !games.length) return '';
    var rows = games.map(function (g, i) {
      return '<div class="summer-row"><span>G' + (i + 1) + '</span><b>' + (g.win ? '胜' : '负') + '</b><em>' + g.pts + '分 · ' + g.reb + '板 · ' + g.ast + '助</em></div>';
    }).join('');
    return '<div class="summer-games"><div class="summer-games-head"><b>' + label + '</b><span>3 场</span></div>' + rows + '</div>';
  }

  function summerView() {
    var s = ensureSummer();
    if (!s) return '';
    var phase = s.phase || 'summer';
    var team = teamList().find(function (x) { return x.abbr === s.team; });
    var body = '';
    if (phase === 'summer' && !s.games.length) {
      body = '<p class="summer-copy">选秀夜没有念到你的名字。夏季联赛的邀请放在桌上——这是你唯一能自己争取的机会。</p>'
        + '<button class="summer-primary" onclick="__SUMMER__.play()">开始夏季联赛 · 3 场</button>';
    } else if (phase === 'summer') {
      var good = (s.score || 0) >= 16.5;
      body = gamesTable(s.games, '夏季联赛结果')
        + '<div class="summer-result"><small>综合表现</small><b>' + (s.score || 0).toFixed(1) + '</b><p>' + (good ? '你打动了球队。他们愿意给一份正式底薪合同。' : '表现没有完全说服球队。你只拿到一份 10 天短合同。') + '</p></div>'
        + (good
          ? '<button class="summer-primary" onclick="__SUMMER__.acceptMin()">接受正式底薪合同 →</button>'
          : '<button class="summer-primary" onclick="__SUMMER__.startTrial()">接受 10 天短合同 · 3 场试用期 →</button>');
    } else if (phase === 'trial' && !s.trialGames.length) {
      body = '<p class="summer-copy">落选后，球队只愿意给一份 10 天短合同。没有夏季联赛，也没有保障。<br>3 场试用期，球队只看你能不能立刻帮上忙。</p>'
        + '<button class="summer-primary" onclick="__SUMMER__.startTrial()">开始 10 天合同 · 3 场 →</button>';
    } else if (phase === 'trial') {
      var keep = (s.trialScore || 0) >= 15;
      body = gamesTable(s.trialGames, '10 天短合同 · 试用期')
        + '<div class="summer-result"><small>试用期表现</small><b>' + (s.trialScore || 0).toFixed(1) + '</b><p>' + (keep ? '球队决定留下你，转成一年底薪合同。' : '球队没有续约。你的第一次 NBA 尝试停在这里。') + '</p></div>'
        + (keep
          ? '<button class="summer-primary" onclick="__SUMMER__.signTrial()">签下一年底薪合同 →</button>'
          : '<button class="summer-secondary" onclick="__SUMMER__.retry()">再试一次 10 天合同</button><button class="summer-primary" onclick="__SUMMER__.retire()">结束这段生涯</button>');
    } else if (phase === 'released') {
      body = '<p class="summer-copy">10 天短合同结束，没有球队续约。你还可以再争取一次，或者在这里结束。</p>'
        + '<button class="summer-secondary" onclick="__SUMMER__.retry()">再试一次 10 天合同</button>'
        + '<button class="summer-primary" onclick="__SUMMER__.retire()">结束这段生涯</button>';
    } else {
      body = '<p class="summer-copy">合同已经签下。</p><button class="summer-primary" onclick="ui.screen=\'career\';ui.tab=\'season\';render()">进入训练营 →</button>';
    }
    var title = phase === 'trial' ? '10 天短合同' : phase === 'released' ? '没有续约' : '落选后的 10 天';
    var sub = phase === 'released' ? '第一次 NBA 尝试停在这里' : team ? team.name : '等待一份 10 天合同';
    return '<style>'
      + '.summer-wrap{min-height:100dvh;background:#12151a;color:#e8ecf1;padding:22px 16px 40px;max-width:720px;margin:0 auto}'
      + '.summer-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}'
      + '.summer-top strong{font-size:14px;letter-spacing:1px;color:#fff}'
      + '.summer-top span{font-size:9px;color:#6b7484;letter-spacing:2px}'
      + '.summer-hero small{display:block;color:#4d8dff;letter-spacing:3px;font-size:10px;font-weight:700}'
      + '.summer-hero h1{font-size:28px;line-height:1.2;margin:7px 0 5px;color:#fff}'
      + '.summer-hero p{margin:0 0 17px;color:#9aa3b2;font-size:12px}'
      + '.summer-card{background:#1c2129;border:1px solid #2f3742;border-radius:20px;padding:18px}'
      + '.summer-copy{font-size:12.5px;line-height:1.8;color:#c9d1dc;margin:0 0 14px}'
      + '.summer-primary,.summer-secondary{display:block;width:100%;border:0;border-radius:14px;padding:14px;font-size:14px;font-weight:800;cursor:pointer;margin-top:10px;font-family:inherit}'
      + '.summer-primary{background:#ffd23f;color:#101318}.summer-secondary{background:#212730;color:#e8ecf1;border:1px solid #2f3742}'
      + '.summer-games{background:#181c23;border:1px solid #2f3742;border-radius:14px;padding:12px;margin:0 0 12px}'
      + '.summer-games-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}'
      + '.summer-games-head b{font-size:12px;color:#fff}.summer-games-head span{font-size:9px;color:#6b7484}'
      + '.summer-row{display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid #2a3038;font-size:11px}'
      + '.summer-row span{color:#6b7484;width:24px}.summer-row b{color:#ffd23f;width:22px}.summer-row em{font-style:normal;color:#c9d1dc}'
      + '.summer-result{background:#211f16;border:1px solid #463c1d;border-radius:14px;padding:13px;margin:0 0 12px}'
      + '.summer-result small{display:block;color:#a3935e;font-size:9px;letter-spacing:2px}'
      + '.summer-result b{display:block;color:#ffd23f;font-size:26px;margin:4px 0}'
      + '.summer-result p{margin:0;color:#e8ecf1;font-size:11.5px;line-height:1.7}'
      + '</style>'
      + '<section class="summer-wrap"><div class="summer-top"><strong>UNDRAFTED · 10-DAY CONTRACT</strong><span>落选线</span></div>'
      + '<div class="summer-hero"><small>NO PICK. NO GUARANTEE.</small><h1>' + title + '</h1><p>' + sub + '</p></div>'
      + '<div class="summer-card">' + body + '</div></section>';
  }

  var prevRender = render;
  render = function () {
    try {
      if (typeof career !== 'undefined' && career && ui && ui.screen === 'summer') {
        var app = document.getElementById('app');
        if (app) { app.innerHTML = summerView(); return; }
      }
    } catch (e) {}
    return prevRender.apply(this, arguments);
  };

  try {
    var prevLoad = load;
    load = function () {
      var c = prevLoad.apply(this, arguments);
      try { if (c && c.stage === 'summer') { ui.screen = 'summer'; render(); } } catch (e) {}
      return c;
    };
  } catch (e) {}
  try {
    var prevContinue = continueSave;
    continueSave = function () {
      var r = prevContinue.apply(this, arguments);
      try { if (typeof career !== 'undefined' && career && career.stage === 'summer') { ui.screen = 'summer'; render(); } } catch (e) {}
      return r;
    };
  } catch (e) {}
})();
