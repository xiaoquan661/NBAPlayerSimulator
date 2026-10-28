/* ============================================================
 * 184 · 生涯节奏
 * 目标：一局完整生涯控制在 12–15 个赛季，而不是 20+ 年。
 * 规则：
 *   - 第 15 个赛季结束强制收束
 *   - 第 12 赛季起，状态明显下滑（相对个人峰值掉 8 点，或 OVR<78）提前退役
 *   - 第 14 赛季起，状态继续下滑（相对峰值掉 6 点，或 OVR<82）提前退役
 *   - 年龄线：37 岁且 OVR<86，或 39 岁，直接收束
 *   - 单季仍是完整 82 场，不改比赛节奏
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v184CareerPacing) return;
  window.__v184CareerPacing = true;

  var MAX_SEASONS = 15;
  var WARN_SEASON = 11;
  var DECISION_SEASON = 12;
  var FORCE_SEASON = 14;

  function num(v, d) {
    v = Number(v);
    return isFinite(v) ? v : d;
  }

  function paceReason(c) {
    if (!c || c.retired) return '';
    var sn = num(c.seasonNo, 1);
    var ovr = num(c.ovr, 0);
    var age = num(c.age, 0);
    var peak = Math.max(num(c.pacingPeak, 0), ovr);
    c.pacingPeak = peak;

    if (sn >= MAX_SEASONS) {
      return '选择在生涯第 ' + sn + ' 个赛季结束后退役';
    }
    if (age >= 39) {
      return '选择在 ' + age + ' 岁结束职业生涯';
    }
    if (age >= 37 && ovr < 86) {
      return '选择在 ' + age + ' 岁结束职业生涯';
    }
    if (sn >= FORCE_SEASON && (ovr < 82 || ovr <= peak - 6)) {
      return '选择在生涯第 ' + sn + ' 个赛季结束后退役';
    }
    if (sn >= DECISION_SEASON && (ovr < 78 || ovr <= peak - 8)) {
      return '选择在生涯第 ' + sn + ' 个赛季结束后退役';
    }
    return '';
  }

  function notifyPacing(c) {
    if (!c || c.retired) return;
    var sn = num(c.seasonNo, 1);
    if (sn === WARN_SEASON && !c.pacingWarn11) {
      c.pacingWarn11 = true;
      c.feed = c.feed || [];
      c.feed.unshift('第 ' + sn + ' 个赛季结束：生涯进入后段，之后的每一年都要算着用。');
      try { ui.toast = '生涯进入后段 · 还剩几个赛季'; } catch (e) {}
    }
    if (sn === FORCE_SEASON && !c.pacingWarn14) {
      c.pacingWarn14 = true;
      c.feed = c.feed || [];
      c.feed.unshift('第 ' + sn + ' 个赛季结束：再打一年，就是告别赛季。');
      try { ui.toast = '告别倒计时 · 下赛季可能是最后一年'; } catch (e) {}
    }
  }

  function finish(reason) {
    try {
      if (typeof retire === 'function') {
        retire(reason);
        return true;
      }
    } catch (e) { console.error('[184] retire failed', e); }
    return false;
  }

  /* 赛季结束时就收束，避免先弹合同、再立刻退役 */
  try {
    var prevEnd = endSeason;
    endSeason = function () {
      var out = prevEnd.apply(this, arguments);
      try {
        if (career && !career.retired) {
          notifyPacing(career);
          var why = paceReason(career);
          if (why) finish(why);
        }
      } catch (e) { console.error('[184] endSeason pacing failed', e); }
      return out;
    };
    window.endSeason = endSeason;
  } catch (e) { console.error('[184] endSeason wrap failed', e); }

  /* 兜底：旧存档直接从休赛期点「进入下一季」时也能收束 */
  try {
    var prevNext = nextSeason;
    nextSeason = function () {
      try {
        if (career && !career.retired) {
          var why = paceReason(career);
          if (why) {
            finish(why);
            return;
          }
        }
      } catch (e) { console.error('[184] nextSeason pacing failed', e); }
      return prevNext.apply(this, arguments);
    };
    window.nextSeason = nextSeason;
  } catch (e) { console.error('[184] nextSeason wrap failed', e); }

  window.__v184Debug = {
    paceReason: paceReason,
    constants: { MAX_SEASONS: MAX_SEASONS, WARN_SEASON: WARN_SEASON, DECISION_SEASON: DECISION_SEASON, FORCE_SEASON: FORCE_SEASON }
  };
})();
