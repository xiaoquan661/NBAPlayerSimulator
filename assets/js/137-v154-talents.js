
(function(){'use strict';
const prior=renderTalents;
renderTalents=function(){
 let html=prior.apply(this,arguments);
 if(!playerBy(ui.selected)?.v135)return html;
 const button=ui.exclusive
  ? '✓ 已解锁 · 专属剧情 + 四个天赋全带走 + 无限刷新天赋'
  : '<span class="v71-adline">🎬 看奖励视频 · 解锁专属天赋</span><span class="v71-adsub">解锁专属剧情 + 四个天赋全带走 + 无限刷新天赋</span>';
 html=html.replace(/(<button[^>]*onclick="v63UnlockExclusiveAndAll\(\)"[^>]*>)[\s\S]*?(<\/button>)/,(_,open,close)=>open+button+close);
 // The old drawbar replacement left this second, unstyled button behind.
 return html.replace(/<button[^>]*onclick="refreshTalentPool\(\)"[^>]*>[\s\S]*?<\/button>/g,'');
};
})();

