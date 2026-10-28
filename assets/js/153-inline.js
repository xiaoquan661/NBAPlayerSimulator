
/* ============================================================
 * M2：首页「本次更新」卡 → 公告栏；封面从「扮演球星」改为「玩自己」
 * 说明：v164 会在 renderHome 后插入 v164-updates 卡片，这里在链尾
 *       整体替换为公告栏，并把封面文案/人物条改为自创球员叙事。
 * ============================================================ */
(function () {
  'use strict';

  // 公告内容暂不下发（正式公告由运营后续发布）；
  // 保留「移除原版本次更新块」的逻辑，公告栏先留空。
  function notice() { return ''; }

  var previous = renderHome;
  renderHome = function () {
    var html = previous.apply(this, arguments);
    try {
      // 1) 整块移除「本次更新」，换成公告栏
      html = html.replace(/<details class="v164-updates"[\s\S]*?<\/details>/, notice());

      var pairs = [
        ['十二位球员 · 十二种活法', '模拟我的篮球生涯'],
        ['五位状元 · 五次重来', '模拟我的篮球生涯'],
        ['<b>拯救</b><em>水货状元</em>', '<b>没人相信我</b><em>打美职篮</em>'],
        ['选一个被历史判了结局的人，把他的职业生涯重新打一遍。', '从选秀夜开始，写下你自己的结局。'],
        ['<strong>从状元夜开始</strong>', '<strong>从选秀夜开始</strong>'],
        ['常规赛 · 全明星 · 伤病 · 交易 · 季后赛 · 退役', '选秀 · 新秀赛季 · 全明星 · 交易 · 季后赛 · 退役'],
        ['<span>本内特</span><span>奥登</span><span>夸梅</span><span>富尔茨</span><span>西蒙斯</span>',
         '<span>体校</span><span>NCAA</span><span>CBA</span><span>落选</span><span>预科</span><span>欧洲</span><span>NBL</span><span>发展联盟</span>'],
        ['开始改写生涯', '新生涯']
      ];
      for (var i = 0; i < pairs.length; i++) html = html.split(pairs[i][0]).join(pairs[i][1]);
      /* 首页底部那句“每一次选择……”不是玩家在生涯里会看到的话，整块去掉。 */
      html = html.replace(/<div class="tiny" style="text-align:center">每一次选择[\s\S]*?<\/div>/, '');
    } catch (e) {}
    return html;
  };

  // 原版「本次更新」弹窗（VOL.174）与本次重制无关，且含原版球员说明：
  // 首次加载时直接按「已读」关闭，不再自动弹出。
  try { if (typeof window.v173CloseNotice === 'function') window.v173CloseNotice(); } catch (e) {}

  // 首屏已用旧 renderHome 渲染过，重绘一次让改动立即生效
  try { if (document.getElementById('app')) render(); } catch (e) {}
  // 我们的界面已就绪，解除启动遮罩（原版画面不再闪现）
  try { window.__rebrandReady = true; } catch (e) {}
  try { document.documentElement.className = String(document.documentElement.className || '').replace(/\s*__booting\b/, ''); } catch (e) {}
})();
