
/* ============================================================
 * 新游戏《我的名字》· 天赋页文案 custom 化 v1 (M2)
 * renderTalents 被 16 层补丁包装，改任何一层都会被后层绕过。
 * 方案：链尾输出后处理——包装最终 renderTalents，对输出 HTML 做
 *       custom 球员的文案替换（原版球星不受影响）。
 * ============================================================ */
(function () {
  'use strict';
  try {
    const __tcOld = renderTalents;
    renderTalents = function () {
      let html = __tcOld.apply(this, arguments);
      try {
        const CG = window.__CREATOR__ || {};
        // CG.player 只在本次捏人流程中存在；读档后要从 career/ui 判断，
        // 否则读档进入天赋页会退回原版文案（如「进入选秀之夜」）。
        const isCustom = (CG.player && CG.player.id === 'custom')
          || (typeof career !== 'undefined' && career && career.playerId === 'custom')
          || (typeof ui !== 'undefined' && ui && ui.selected === 'custom');
        if (!isCustom) return html;
        const R = [
          // 标题/引导
          [/命运天赋/g, '出发天赋'],
          [/\$\{p\.zh\}|存档球员/g, '你'],
          [/这一局，你准备带走什么命\？/g, '出发前，最后带一样东西'],
          [/四张随机天赋免费选1?张。?品质越高，整张卡颜色越稀有；?后续比赛里会明确显示天赋何时、如何生效。/g, '四张随机天赋免费选 1 张。它不会决定你的上限——但会让某段路好走一点。'],
          [/先把最致命的短板补上/g, '选一件陪你漂洋过海的东西'],
          [/本局天赋/g, '出发天赋'],
          [/3次免费抽取。用完后可看奖励视频继续刷新/g, '3 次免费抽取，用完可看视频续刷'],
          // 专属横幅
          [/状元专属/g, '无人知晓的名字'],
          [/这局才算真正改命/g, '带上它出发'],
          [/已解锁专属天命/g, '已解锁专属天赋'],
          [/解锁整条专属主线/g, '解锁你的个人故事线'],
          // 兜底球员专属文案（P 注入失败时也显示正确内容）
          [/（原版专属天赋）/g, '无人知晓的名字'],
          [/当前版本没有该球员的专属天赋数据，机制按通用规则运行；存档进度不受影响。/g, '没有人认识你。心态与自信更坚韧，不易被舆论击倒——每一分成长都从零挣来。'],
          // 拿下卡
          [/四张随机天赋全带走，本局直接叠满开局BUFF/g, '四张全带走，给漂洋过海多一分底气'],
          [/全部拿下/g, '全部带走'],
          // CTA
          [/进入选秀之夜/g, '走向选秀之夜']
        ];
        for (const [re, to] of R) html = html.replace(re, to);
      } catch (e) {}
      return html;
    };
  } catch (e) {}
})(window);
