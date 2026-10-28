
/* ============================================================
 * 自白被动 + 名气 + 合同意向
 *   1. 六条自白在局内真正生效，不再只在退役页判定
 *   2. 名气统一显示，事件里的「国内声望」改叫「名气」
 *   3. 第二幕合同选择写入 contract_intent，影响休赛期报价
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v178VowPassives) return;
  window.__v178VowPassives = true;

  var PASSIVE = {
    pure: { n: '纯粹', d: '负面舆论与自信损失减半。' },
    family: { n: '家庭', d: '合同报价 +5%，伤病风险略降。' },
    prove: { n: '证明', d: '名气增长 +20%，得分略升；负面舆论更伤自信，伤病风险略升。' },
    'one-min': { n: '一分钟', d: '伤病风险 ×0.9；替补角色下得分略升。' },
    name: { n: '名字', d: '名字被更多人记住：名气增长 +10%，得分 +2%。' },
    easy: { n: '洒脱', d: '负面心态效果减半，自信损失降低，伤病风险 ×0.95。' }
  };

  function isCustom() {
    try { return typeof career !== 'undefined' && career && career.playerId === 'custom'; } catch (e) { return false; }
  }
  function vowOf(c) {
    return (c && (c.vow || (c.__arch && c.__arch.vow))) || '';
  }
  function flagOf(c, key) {
    try {
      if (!c) return '';
      if (c.storyFlags && c.storyFlags['cs_' + key]) return String(c.storyFlags['cs_' + key]);
      if (c.customStory && c.customStory.flags && c.customStory.flags[key]) return String(c.customStory.flags[key]);
    } catch (e) {}
    return '';
  }
  function branchOf(c) {
    return {
      proveRole: flagOf(c, 'prove_role'),
      proveWall: flagOf(c, 'prove_wall'),
      proveClutch: flagOf(c, 'prove_clutch'),
      becomeWay: flagOf(c, 'become_way'),
      becomeContract: flagOf(c, 'become_contract'),
      becomeRoom: flagOf(c, 'become_room'),
      becomeImage: flagOf(c, 'become_image'),
      becomeBody: flagOf(c, 'become_body'),
      becomeTeam: flagOf(c, 'become_team'),
      legacy: flagOf(c, 'legacy'),
      leaveBody: flagOf(c, 'leave_body'),
      leaveEnd: flagOf(c, 'leave_end')
    };
  }
  function passiveOf(c) {
    return PASSIVE[vowOf(c)] || { n: '自白', d: '这条自白会随着你的选择慢慢生效。' };
  }
  function fameOf(c) {
    var n = Number(c && c.domesticFame);
    if (!isFinite(n)) n = 20;
    return Math.max(0, Math.min(100, Math.round(n)));
  }
  function round3(n) { return Math.round((Number(n) || 0) * 1000) / 1000; }

  /* ---------- 比赛数据与伤病 ---------- */
  try {
    var prevStatExpect = statExpect;
    statExpect = function () {
      var e = prevStatExpect.apply(this, arguments);
      try {
        if (!isCustom() || !e) return e;
        var v = vowOf(career);
        var o = Object.assign({}, e);
        if (v === 'prove') o.pts *= 1.03;
        if (v === 'name') o.pts *= 1.02;
        if (v === 'one-min' && (career.role === '边缘球员' || career.role === '轮换球员')) o.pts *= 1.02;
        return o;
      } catch (err) { return e; }
    };
  } catch (e) {}

  try {
    var prevInjuryChance = injuryChance;
    injuryChance = function () {
      var n = prevInjuryChance.apply(this, arguments);
      try {
        if (!isCustom()) return n;
        var v = vowOf(career);
        if (v === 'one-min') n *= 0.90;
        else if (v === 'easy') n *= 0.95;
        else if (v === 'family') n *= 0.97;
        else if (v === 'prove') n *= 1.05;
      } catch (e) {}
      return n;
    };
  } catch (e) {}

  /* ---------- 负面效果修正 ---------- */
  try {
    var prevApplyFx = applyFx;
    applyFx = function (f) {
      try {
        if (!isCustom() || !f) return prevApplyFx.apply(this, arguments);
        f = Object.assign({}, f);
        var v = vowOf(career);
        if (v === 'pure') {
          if (typeof f.c === 'number' && f.c < 0) f.c *= 0.5;
          if (typeof f.fame === 'number' && f.fame < 0) f.fame *= 0.5;
        } else if (v === 'easy') {
          if (f.a) {
            f.a = Object.assign({}, f.a);
            if (typeof f.a.mentality === 'number' && f.a.mentality < 0) f.a.mentality *= 0.5;
          }
          if (typeof f.c === 'number' && f.c < 0) f.c *= 0.75;
        } else if (v === 'prove') {
          if (typeof f.c === 'number' && f.c < 0) f.c *= 1.1;
        }
        return prevApplyFx(f);
      } catch (e) {
        return prevApplyFx.apply(this, arguments);
      }
    };
  } catch (e) {}

  /* ---------- 名气增长：prove / name / pure ---------- */
  try {
    var prevStoryChoice = storyChoice;
    storyChoice = function (i) {
      try {
        if (isCustom() && ui.storyEvent && ui.storyEvent.c && ui.storyEvent.c[i]) {
          var fx = ui.storyEvent.c[i][2];
          if (fx && typeof fx.fame === 'number') {
            var v = vowOf(career);
            if (v === 'prove' && fx.fame > 0) fx.fame = Math.round(fx.fame * 1.2);
            else if (v === 'name' && fx.fame > 0) fx.fame = Math.round(fx.fame * 1.1);
            else if (v === 'pure' && fx.fame < 0) fx.fame = Math.round(fx.fame * 0.5);
          }
        }
      } catch (e) {}
      return prevStoryChoice.apply(this, arguments);
    };
  } catch (e) {}

  /* ---------- 合同：家庭被动 + 合同意向 ---------- */
  try {
    var prevGenerate = generateContractOptions;
    generateContractOptions = function () {
      var r = prevGenerate.apply(this, arguments);
      try {
        if (!isCustom() || !career || !Array.isArray(career.offers)) return r;
        var v = vowOf(career);
        var season = Number(career.seasonNo) || 0;
        if (v === 'family' && career.v178FamilySeason !== season && career.offers.length) {
          career.offers.forEach(function (o) {
            if (o && typeof o.salary === 'number') o.salary = round3(o.salary * 1.05);
          });
          career.v178FamilySeason = season;
        }
        var intent = career.storyFlags && career.storyFlags.cs_contract_intent;
        if (intent === 'stay' && career.v178IntentSeason !== season) {
          var home = null;
          for (var i = 0; i < career.offers.length; i++) {
            if (career.offers[i] && career.offers[i].team === career.team) { home = career.offers[i]; break; }
          }
          if (home) {
            home.years = Math.min(5, Math.max(3, Number(home.years) || 3));
            if (typeof home.salary === 'number') home.salary = round3(home.salary * 1.03);
          }
          career.v178IntentSeason = season;
        }

        /* 三幕选择影响报价：合同不是只看 OVR，也看你在故事里怎么选。 */
        var branch = branchOf(career);
        /* 与 135 的合同长度上限保持一致：生涯后段不能再被剧情加成拉回 5 年。 */
        var maxYears = Math.max(1, 16 - season);
        if (career.v178BranchSeason !== season && career.offers.length) {
          career.offers.forEach(function (o) {
            if (!o) return;
            var years = Number(o.years) || 3;
            var salary = Number(o.salary) || 0;
            if (branch.proveRole === 'scorer') salary *= 1.06;
            else if (branch.proveRole === 'stopper') { salary *= 1.02; years += 1; }
            else if (branch.proveRole === 'learner') years += 1;

            if (branch.becomeWay === 'team' || branch.becomeWay === 'mentor') years += 1;
            else if (branch.becomeWay === 'self') { salary *= 1.05; years -= 1; }

            if (branch.becomeContract === 'money') salary *= 1.08;
            else if (branch.becomeContract === 'wait') salary *= 0.96;
            else if (branch.becomeContract === 'secure') years = Math.max(3, years);

            if (branch.becomeRoom === 'captain') { salary *= 1.02; years += 1; }
            else if (branch.becomeRoom === 'alone') salary *= 1.03;
            else if (branch.becomeRoom === 'mentor') years += 1;

            if (branch.becomeBody === 'manage' || branch.becomeBody === 'change') years += 1;
            else if (branch.becomeBody === 'push') salary *= 1.04;

            if (branch.becomeTeam === 'stay' || branch.becomeTeam === 'rebuild') years += 1;
            else if (branch.becomeTeam === 'ring') salary *= 1.02;

            if (branch.legacy === 'one_team' && o.team === career.team) {
              years = Math.max(4, years);
              salary *= 1.04;
            } else if (branch.legacy === 'path') {
              salary *= 1.01;
            }

            if (branch.leaveEnd === 'tour') { years = Math.min(2, years); salary *= 1.03; }
            else if (branch.leaveEnd === 'handover') years += 1;

            o.years = Math.max(1, Math.min(maxYears, Math.min(5, Math.round(years))));
            o.salary = round3(Math.max(0.8, salary));
          });

          /* 第三幕选择“冠军”时，多给一份争冠球队报价。 */
          if (branch.legacy === 'ring') {
            var power = {};
            try { (teams || []).forEach(function (t) { power[t.abbr] = Number(t.power) || 80; }); } catch (e) {}
            var hasContender = career.offers.some(function (o) { return o && power[o.team] >= 86; });
            if (!hasContender) {
              var cand = [];
              try { cand = (teams || []).filter(function (t) { return t.abbr !== career.team && (Number(t.power) || 80) >= 86; }); } catch (e) {}
              if (cand.length) {
                var ct = cand[0];
                var base = Math.max(10, Math.round(((Number(career.ovr) || 75) - 70) * 2.6));
                career.offers.push({ team: ct.abbr, years: 2, salary: round3(base * 1.05), type: 'FA' });
              }
            }
          }
          career.v178BranchSeason = season;
        }
      } catch (e) {}
      return r;
    };
  } catch (e) {}

  /* ---------- 三幕选择影响球队关系 ---------- */
  function applyTeamBranch() {
    if (!isCustom() || !career || career.retired) return;
    var b = branchOf(career);
    var sig = [b.proveRole, b.becomeWay, b.becomeRoom, b.becomeTeam, b.legacy, b.leaveEnd].join('|');
    if (career.v178TeamSig === sig) return;
    career.v178TeamSig = sig;

    var trust = 0, conf = 0, press = 0, fame = 0;
    var notes = [];
    if (b.proveRole === 'stopper') { trust += 1; notes.push('教练更信任你的防守'); }
    else if (b.proveRole === 'scorer') { conf += 1; trust -= 1; notes.push('球队接受你的得分方式，但教练仍要求你分享球'); }
    else if (b.proveRole === 'learner') { trust += 1; notes.push('教练愿意继续教你'); }

    if (b.becomeWay === 'team') { trust += 2; notes.push('你为球队改过打法'); }
    else if (b.becomeWay === 'self') { conf += 1; press += 1; notes.push('你坚持自己的方式，管理层开始感到压力'); }
    else if (b.becomeWay === 'mentor') { trust += 1; notes.push('你把更衣室带了起来'); }

    if (b.becomeRoom === 'captain') { trust += 3; notes.push('你成为更衣室的声音'); }
    else if (b.becomeRoom === 'alone') { trust -= 2; notes.push('你和更衣室保持了距离'); }
    else if (b.becomeRoom === 'mentor') { trust += 1; }

    if (b.becomeTeam === 'stay') { trust += 2; notes.push('你选择留下'); }
    else if (b.becomeTeam === 'ring') { press += 2; notes.push('你的争冠选择让管理层感到压力'); }
    else if (b.becomeTeam === 'rebuild') { trust += 1; notes.push('你愿意陪球队重建'); }

    if (b.legacy === 'one_team') { trust += 2; notes.push('你公开表达了终老球队的意愿'); }
    else if (b.legacy === 'ring') { press += 2; notes.push('你把冠军放在第一位'); }
    else if (b.legacy === 'path') { fame += 1; }

    if (b.leaveEnd === 'tour') { fame += 2; notes.push('球队开始准备你的告别巡演'); }
    else if (b.leaveEnd === 'handover') { trust += 2; notes.push('你把位置交给了年轻人'); }

    if (trust) career.trust = Math.max(0, Math.min(100, (Number(career.trust) || 50) + trust));
    if (conf) career.confidence = Math.max(0, Math.min(100, (Number(career.confidence) || 50) + conf));
    if (press) career.teamTradePressure = (Number(career.teamTradePressure) || 0) + press;
    if (fame) career.domesticFame = Math.max(0, Math.min(100, (Number(career.domesticFame) || 0) + fame));
    if (notes.length && Array.isArray(career.feed)) career.feed.unshift('球队反应：' + notes.join('；') + '。');
  }

  try {
    var prevNextSeason178 = nextSeason;
    nextSeason = function () {
      var before = Number(career && career.seasonNo) || 0;
      var r = prevNextSeason178.apply(this, arguments);
      try {
        if (isCustom() && career && !career.retired && Number(career.seasonNo) !== before) applyTeamBranch();
      } catch (e) {}
      return r;
    };
    window.nextSeason = nextSeason;
  } catch (e) {}

  /* ---------- 命运轨迹页：自白被动 + 名气 ---------- */
  function passiveCard() {
    var p = passiveOf(career);
    return '<div class="v178-vow-passive">'
      + '<header><small>自白被动</small><span>名气 ' + fameOf(career) + '</span></header>'
      + '<b>' + p.n + '</b><p>' + p.d + '</p></div>';
  }

  try {
    var prevStoryView = storyView;
    storyView = function () {
      var h = prevStoryView.apply(this, arguments);
      try {
        if (!isCustom() || typeof h !== 'string') return h;
        if (h.indexOf('v178-vow-passive') >= 0) return h;
        var card = passiveCard();
        var anchor = '<div class="v167-main-list">';
        if (h.indexOf(anchor) >= 0) return h.replace(anchor, card + anchor);
        return h + card;
      } catch (e) { return h; }
    };
  } catch (e) {}

  window.__v178Debug = { applyTeamBranch: applyTeamBranch, branchOf: branchOf, flagOf: flagOf };

  var style = document.createElement('style');
  style.textContent = [
    '.v178-vow-passive{margin:12px 0;padding:14px 15px;border-radius:16px;background:#1c2129;border:1px solid #2f3742;border-left:3px solid #ffd23f;color:#e8ecf1}',
    '.v178-vow-passive header{display:flex;justify-content:space-between;align-items:center;gap:10px}',
    '.v178-vow-passive header small{color:#ffd23f;font-size:9px;letter-spacing:2px;font-weight:900}',
    '.v178-vow-passive header span{flex:none;border:1px solid #4a3b1c;border-radius:9px;padding:4px 7px;color:#ffd98a;font-size:10px;font-weight:800}',
    '.v178-vow-passive b{display:block;margin-top:7px;font-size:15px;color:#ffffff}',
    '.v178-vow-passive p{margin:5px 0 0;font-size:11px;line-height:1.65;color:#c9d1dc}'
  ].join('');
  document.head.appendChild(style);
})();
