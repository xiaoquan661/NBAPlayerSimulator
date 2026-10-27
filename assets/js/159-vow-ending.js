
/* ============================================================
 * 一句自白 → 生涯结局
 * 6 条自白各有一段收束文案；退役报告插入「自白兑现」卡片，
 * 根据赛季数、出场数、荣誉、国内声望、峰值评分判定兑现程度。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__vowEndingPatched) return;
  try {

    var VOW_LINES = {
      pure: {
        q: '我只为篮球而来',
        tiers: [
          '训练馆的灯，你关了十年。你没有把篮球变成别的东西，也没有让别的东西替你决定篮球。走的时候，它还是你最初看见的样子。',
          '你有过动摇，也接住过一些本不必接的东西。但每一次低谷，你还是回到了球馆。那句「只为篮球而来」，不算完全食言。',
          '后来你才发现，纯粹是一种奢侈。你没能一直做到，但你至少知道它长什么样。'
        ]
      },
      family: {
        q: '让家里过上好日子',
        tiers: [
          '你兑现了那句话。家里人不再需要为钱低头，母亲的菜摊早就收了。你打球的这些年，确实让一个家庭换了活法。',
          '你寄回家的钱不算多，但每一笔都准时。家人没有大富大贵，只是终于不用再替你担心下个月。',
          '你把最好的年头给了篮球，家里人一直在等一个更安稳的以后。这个以后来得不算早。'
        ]
      },
      prove: {
        q: '证明被低估的人也能飞',
        tiers: [
          '你把「能不能」打成了「已经」。后来再有人问被低估的人能不能飞，答案不再是论证，而是你的比赛录像。',
          '你没能一个人改变所有偏见，但你让下一个孩子少被问了一次「你行不行」。',
          '你证明了自己能站在这块地板上，但没能证明更多。那句话，后来被更年轻的人接了过去。'
        ]
      },
      'one-min': {
        q: '打上 NBA，哪怕一分钟',
        labels: ['超出那句自白', '兑现', '兑现'],
        tiers: [
          '你要的从来不是一分钟。你留下来，打了很久，久到没人再记得你曾经随时会被裁掉。',
          '你打上了 NBA。不是一分钟，是很多个夜晚。对一个曾经没有保障合同的人来说，这已经是一种胜利。',
          '你确实得到了那一分钟。它很短，短到不够改变什么——但足够让你在余生里反复想起。'
        ]
      },
      name: {
        q: '总有一天他们会念我的名字',
        tiers: [
          '他们念你名字的时候，用的是最高音量。不是选秀夜那种礼貌的念法，是全场起立的那种。',
          '他们开始念你的名字了。不是每个人，不是每一次，但足够让你确定自己来过。',
          '你的名字始终没有被念得很响。你把这句话留给了退役之后——也许下一代人替你念。'
        ]
      },
      easy: {
        q: '就试试，不行就回去读书',
        tiers: [
          '你玩得认真，也玩得开心。别人把生涯过成战争，你把它过成了一段很长的夏天。',
          '你没有把自己逼到崩溃，也没有半途逃走。「不行就回去读书」，最后变成了「行，那就再打一年」。',
          '你试过了。结果不算好，但你走的时候没有恨这项运动。'
        ]
      }
    };

    function n(v) { v = Number(v); return isFinite(v) ? v : 0; }

    function metrics(c) {
      var t = c.careerTotals || {}, h = c.honors || {}, r = c.records || {};
      return {
        seasons: n(t.seasons) || n(c.seasonNo),
        games: n(t.games),
        peak: n(r.bestOvr) || n(c.ovr),
        fame: n(c.domesticFame),
        allstar: n(h['全明星']),
        allnba: n(h['最佳阵容']),
        mvp: n(h['MVP']),
        rings: n(h['总冠军'])
      };
    }

    function vowChoices(c) {
      var k = 0;
      for (var i = 0; i < 9; i++) { if (c['__vowE' + i]) k++; }
      return k;
    }

    function tierFor(id, m) {
      var ok = false, near = false;
      if (!m.games) return 2;
      if (id === 'pure') {
        ok = m.peak >= 88 && (m.allstar >= 1 || m.allnba >= 1) && m.seasons >= 4;
        near = m.seasons >= 3;
      } else if (id === 'family') {
        ok = m.seasons >= 6 && m.games >= 350;
        near = m.seasons >= 3;
      } else if (id === 'prove') {
        ok = (m.allstar >= 1 || m.mvp >= 1 || m.peak >= 88) && m.fame >= 50;
        near = m.fame >= 30 || m.seasons >= 4;
      } else if (id === 'one-min') {
        ok = m.games >= 300;
        near = m.games >= 50;
      } else if (id === 'name') {
        ok = m.mvp >= 1 || m.rings >= 1 || m.allstar >= 2 || m.peak >= 90;
        near = m.allstar >= 1 || m.allnba >= 1 || m.games >= 200;
      } else if (id === 'easy') {
        ok = m.seasons >= 5 && m.peak >= 80;
        near = m.seasons >= 3;
      }
      return ok ? 0 : near ? 1 : 2;
    }

    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
      });
    }

    function block(c) {
      if (!c || c.playerId !== 'custom') return '';
      var id = c.vow || (c.__arch && c.__arch.vow) || '';
      var def = VOW_LINES[id];
      if (!def) return '';
      var m = metrics(c);
      var tier = tierFor(id, m);
      var labels = def.labels || ['兑现', '接近', '未竟'];
      var choices = vowChoices(c);
      /* 实际走过自白事件，至少把「未竟」抬到「接近」，让选择真的影响自白结局。 */
      if (m.games && choices >= 2 && tier === 2) tier = 1;
      var foot = '这句话陪你走过了 ' + m.seasons + ' 个赛季 · ' + m.games + ' 场'
        + (choices ? ' · ' + choices + ' 次相关选择' : '');
      return '<section class="vow-final">'
        + '<header><small>一句自白</small><span>' + esc(labels[tier]) + '</span></header>'
        + '<blockquote>「' + esc(def.q) + '」</blockquote>'
        + '<p>' + esc(def.tiers[tier]) + '</p>'
        + '<footer>' + esc(foot) + '</footer>'
        + '</section>';
    }

    var prev = renderRetired;
    renderRetired = function () {
      var h = prev.apply(this, arguments);
      try {
        if (typeof h !== 'string') return h;
        var b = block(typeof career !== 'undefined' ? career : null);
        if (!b) return h;
        var anchor = '<div class="final-grid">';
        var i = h.indexOf(anchor);
        if (i >= 0) return h.slice(0, i) + b + h.slice(i);
        var anchor2 = '<div class="story-outcome">';
        var j = h.indexOf(anchor2);
        if (j >= 0) return h.slice(0, j) + b + h.slice(j);
        return h + b;
      } catch (e) { return h; }
    };
    window.__vowEndingPatched = true;

    var css = document.createElement('style');
    css.textContent = [
      '.vow-final{margin:11px 0;padding:14px 16px;border-radius:20px;background:linear-gradient(145deg,#1b2028,#151a21);border:1px solid #ffd23f44;border-left:3px solid #ffd23f;color:#e8ecf1;box-shadow:0 10px 28px #00000055}',
      '.vow-final header{display:flex;justify-content:space-between;align-items:center;gap:8px}',
      '.vow-final header small,.retired-card .vow-final header small{font-size:8px;letter-spacing:1.6px;color:#ffd23f!important;font-weight:900}',
      '.vow-final header span{font-size:9px;font-weight:900;color:#101318!important;background:#ffd23f;border-radius:999px;padding:3px 8px}',
      '.vow-final blockquote{margin:10px 0 8px;padding:0;border:0;font-size:15px;line-height:1.5;color:#ffffff!important;font-weight:900}',
      '.vow-final p,.retired-card .vow-final p{color:#c9d1dc!important;margin:0;font-size:11px;line-height:1.85}',
      '.vow-final footer,.retired-card .vow-final footer{margin-top:9px;padding-top:8px;border-top:1px dashed #2f3742;font-size:9px;color:#9aa3b2!important}'
    ].join('');
    document.head.appendChild(css);

  } catch (e) {}
})();
