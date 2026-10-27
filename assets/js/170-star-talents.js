/* ============================================================
 * 170 · 明星模式天赋页
 * 把明星球员的天赋页做成与自建球员一致的结构：
 *   四张天赋 2×2 选 1 → 刷新条 → 「专属生涯 + 当前四天赋」广告卡 → 选秀
 * 只接管明星模式；自建球员仍走 167 的事件天赋页。
 * ============================================================ */
(function () {
  'use strict';

  function isStarTalents() {
    try {
      if (typeof ui === 'undefined' || !ui || ui.screen !== 'talents') return false;
      if (window.__GAME_MODE__ === 'custom') return false;
      if (ui.selected === 'custom') return false;
      if (typeof career !== 'undefined' && career && career.playerId === 'custom') return false;
      return true;
    } catch (e) { return false; }
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function rarityClass(r) {
    return r === '传奇' ? 'legend' : r === '稀有' ? 'rare' : r === '优秀' ? 'good' : 'common';
  }

  function talentCard(t, i) {
    var on = !!(ui.allTalents || ui.talentPick === i);
    return '<button class="v184-talent ' + rarityClass(t.r) + (on ? ' on' : '') + '"'
      + ' onclick="ui.talentPick=' + i + ';render()">'
      + '<small>' + esc(t.r) + '</small>'
      + '<b>' + esc(t.n) + '</b>'
      + '<span>' + esc(t.d) + '</span>'
      + (ui.allTalents ? '<em>已打包</em>' : '')
      + '</button>';
  }

  function starsLeft() {
    return Math.max(0, 3 - Number(ui.talentDrawCount || 1));
  }

  function view() {
    var p = null;
    try { p = playerBy(ui.selected); } catch (e) {}
    var talents = Array.isArray(ui.talents) ? ui.talents : [];
    var left = starsLeft();
    var picked = ui.talentPick != null;
    var ex = (p && p.exclusive) || {};
    var exName = ex.n || '球员专属天赋';
    var exDesc = ex.d || '解锁后，从选秀夜到退役会出现只属于他的生涯事件、专属选择和剧情分歧。';
    var refreshText = left > 0
      ? '刷新天赋 · 免费 ' + left + ' 次'
      : '🎬 看广告刷新天赋';
    var headRight = ui.allTalents ? '四张全拿' : (picked ? '已选 1 个' : '四选一');

    var cards = talents.length
      ? '<div class="v184-talents">' + talents.map(talentCard).join('') + '</div>'
      : '<div class="v182-locked">天赋池加载中…</div>';

    return '<section class="pre v170-talents">'
      + '<div class="pre-top"><button class="circle-btn" onclick="ui.screen=\'select\';render()">←</button>'
      + '<strong>' + esc(p ? p.zh : '命运') + ' · 命运天赋</strong><span style="width:36px"></span></div>'
      + '<div class="pre-intro"><small>命运天赋</small>'
      + '<h2>出发前，最后带一样东西</h2>'
      + '<p>四张随机天赋选 1 张。它不会决定你的上限，但会让某段路好走一点。</p></div>'
      + '<section class="v184-sec">'
      + '<div class="v184-sec-head"><b>01 天赋</b><span>' + headRight + '</span></div>'
      + cards
      + '<div class="v184-talent-bar"><button onclick="refreshTalentPool()">↻ ' + refreshText + '</button><span>4 选 1</span></div>'
      + '<div class="v184-origin-card' + (ui.exclusive ? ' on' : '') + '">'
      + '<small>' + (ui.exclusive ? '专属生涯 · 已解锁' : '专属生涯') + '</small>'
      + '<b>「' + esc(exName) + '」</b>'
      + '<p>' + esc(exDesc) + '</p>'
      + '<em>' + (ui.exclusive
        ? '已解锁：专属生涯事件已加入本局，当前四张天赋也已打包。'
        : '解锁后：从选秀夜到退役的专属生涯事件 + 当前四张天赋全部打包。') + '</em>'
      + (ui.exclusive
        ? ''
        : '<div class="v170-ad-warn">不看广告＝本局只有纯模拟，不会出现这名球员的专属事件、专属选择和剧情分歧。</div>'
          + '<button onclick="v170UnlockStar()">🎬 看奖励视频 · 解锁专属生涯 + 当前四天赋</button>')
      + '</div></section>'
      + '<div class="sticky-cta"><button class="btn primary"'
      + ((!ui.allTalents && ui.talentPick == null) ? ' disabled' : '')
      + ' onclick="enterDraft()">进入选秀之夜 →</button></div>'
      + '</section>';
  }

  window.v170UnlockStar = async function () {
    try {
      if (ui && ui.exclusive) {
        notify('专属生涯已经解锁');
        return;
      }
      if (typeof rewardAd === 'undefined' || !rewardAd || typeof rewardAd.request !== 'function') {
        notify('广告组件未就绪');
        return;
      }
      var r = await rewardAd.request('exclusive_talent');
      var ok = (r === true) || (r && r.success === true);
      if (!ok) {
        notify('广告未完成，未解锁专属生涯');
        return;
      }
      ui.exclusive = true;
      ui.allTalents = true;
      if (Array.isArray(ui.talents)) ui.lockedTalents = ui.talents.slice();
      render();
      notify('专属生涯已解锁 · 四个天赋一并打包');
    } catch (e) {
      var msg = String((e && e.message) || e || '');
      if (msg.indexOf('AD_NOT_REWARDED') >= 0) {
        notify('广告未完成，未解锁专属生涯');
        return;
      }
      console.error('[170] unlock star story failed', e);
      notify('解锁失败，请稍后再试');
    }
  };

  try {
    var prev = renderTalents;
    renderTalents = function () {
      if (isStarTalents()) {
        try { return view(); } catch (e) { console.error('[170] star talents failed', e); }
      }
      return prev.apply(this, arguments);
    };
    window.renderTalents = renderTalents;
  } catch (e) {
    console.error('[170] wrap failed', e);
  }
})();
