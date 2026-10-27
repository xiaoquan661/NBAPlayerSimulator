
/* 自建球员 · 球员页成长加点
 *   骑砍式主动学习：比赛涨能力，专精点提高学习效率。
 *   加点面板统一挂在「球员」页，不再占用赛季页与训练页。 */
(function () {
  'use strict';
  if (window.__playerGrowth165) return;
  window.__playerGrowth165 = true;

  function isCustomCareer() {
    try { return typeof career !== 'undefined' && career && !career.retired && career.playerId === 'custom'; }
    catch (e) { return false; }
  }

  try {
    var prevPlayerView = playerView;
    playerView = function () {
      var h = prevPlayerView.apply(this, arguments);
      try {
        if (!isCustomCareer()) return h;
        if (typeof window.__GROWTH_PAGE__ !== 'function') return h;
        if (String(h).indexOf('focus-page') >= 0) return h;
        // 只取绝对值用于显示：内部 career.teamNeed 仍保留正负，角色/分钟计算不变。
        var need = Math.abs(Number(career.teamNeed) || 0);
        var roleLine = '<div class="role-explain"><b>角色：' + (career.role || '—') + ' · ' + (career.minutes || 0) + ' 分钟</b>'
          + '<span>球队需求 ' + need.toFixed(2) + ' · 教练信任 ' + Math.round(Number(career.trust) || 0) + '</span></div>';
        h += roleLine + window.__GROWTH_PAGE__();
      } catch (e) {}
      return h;
    };
    window.playerView = playerView;
    var st = document.createElement('style');
    st.id = 'role-explain-style';
    st.textContent = '.role-explain{display:flex;justify-content:space-between;gap:10px;align-items:baseline;background:#1c2129;border:1px solid #2f3742;border-radius:14px;padding:10px 12px;margin:10px 0 0;color:#e8ecf1}.role-explain b{font-size:12px;color:#ffffff}.role-explain span{font-size:9.5px;color:#9aa3b2;text-align:right}@media(max-width:420px){.role-explain{flex-direction:column;align-items:flex-start}.role-explain span{text-align:left}}';
    document.head.appendChild(st);
  } catch (e) {}
})();
