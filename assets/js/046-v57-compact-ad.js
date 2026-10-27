
/* =====================================================================
   V5.7 · 天赋页广告区紧凑化 + 去掉「威胁式」文案
   开发者反馈（原话）：
     「还有现在专属天赋广告太大了，只要足够显眼和吸引人就行了，不要这么大，
       还有不要出现不看广告=什么什么那个描述，感觉在威胁用户一样」

   体检（实测截图 + CSS 计算）：
     · 专属广告块单块约 310px 高；连「全部拿下」「免费抽取」在内，
       广告区总计约 420px，占了 844px 视口的**一半**，把天赋卡挤到屏幕外。
     · 块里堆了 8 类内容：标签 / 天赋名 / 加成 / 机制 / 4 个 ✓ 徽章 /
       一整段「专属故事」说明 / 一句「不看广告＝只有纯模拟」/ 大按钮。
     · 「不看广告＝本局只有纯模拟，不会出现 XX 的专属剧情…」是威胁式表达。

   修法：
     A. 删掉「不看广告＝…」那句（不再威胁用户）。
     B. 把「专属故事」整段收成一行短句，不再占一大块。
     C. 精简内容层级：标签 + 天赋名 + 加成一览 + 机制一句 + 按钮；
        去掉 4 个 ✓ 徽章（与按钮重复表达「立即生效」）。
     D. 收紧尺寸：padding / 圆角 / 字号 / 按钮高度整体下调约 35%，
        目标把广告区从约 420px 压到约 230px，天赋卡重新回到首屏。
     E. 保留「显眼」：仍用同一套暖色渐变与金色按钮，只是更紧凑。
   ===================================================================== */
(function(){
if(window.__v57CompactAd)return;window.__v57CompactAd=true;

/* ---------- D. 紧凑样式（覆盖旧规则，只改尺寸不改配色） ---------- */
try{
  const st=document.createElement('style');
  st.id='v57-compact-ad';
  st.textContent=[
    /* 整体留白收紧 */
    '.v221-ad-stack{gap:7px !important;margin:0 14px 6px !important}',
    /* 专属广告块：体积减半 */
    '.v221-exclusive-ad{border-radius:18px !important;padding:11px 12px !important;box-shadow:0 10px 22px rgba(94,42,24,.18) !important}',
    '.v221-exclusive-ad:after{width:110px !important;height:110px !important;right:-30px !important;bottom:-40px !important}',
    '.v221-exclusive-ad small{font-size:8px !important;opacity:.75 !important}',
    '.v221-exclusive-ad h2{font-size:18px !important;margin:3px 0 4px !important;letter-spacing:.01em}',
    '.v221-exclusive-ad p{font-size:9.5px !important;line-height:1.45 !important;margin:0 0 4px !important;font-weight:900 !important}',
    '.v221-exclusive-ad>b{font-size:8px !important;line-height:1.45 !important;margin-bottom:0 !important;display:block}',
    /* 徽章行压成一行小字 */
    '.v221-exclusive-ad>div{display:block !important;margin-top:5px !important}',
    '.v221-exclusive-ad>div span{display:inline !important;font-size:7.5px !important;padding:0 !important;border:0 !important;background:none !important;margin-right:8px}',
    /* 按钮：保留金色，高度下调 */
    '.v221-exclusive-ad button{margin-top:8px !important;height:37px !important;border-radius:11px !important;font-size:12.5px !important;animation:none !important}',
    /* 「全部拿下」压扁 */
    '.v221-takeall-ad{border-radius:15px !important;padding:8px 10px !important;gap:8px !important}',
    '.v221-takeall-ad h3{font-size:11.5px !important;margin:1px 0 !important}',
    '.v221-takeall-ad p{font-size:8px !important}',
    '.v221-takeall-ad button{padding:8px 9px !important;border-radius:10px !important;font-size:9px !important}',
    /* 免费抽取条也压一档 */
    '.v210-drawbar{padding:7px 10px !important}'
  ].join('');
  document.head.appendChild(st);
}catch(e){}

/* ---------- A+B+C. 模板精简：作用在渲染出的 HTML 上 ----------
   不直接改多个层的模板源码（层多且分散），而是在渲染函数出口统一处理：
   1) 删掉「不看广告＝…」的 <em>
   2) 把整段「专属故事」块替换成一行短句
   3) 去掉 4 个 ✓ 徽章，只留一行「开局即生效 · 解锁完整专属故事」
*/
function v57Slim(html){
  let s=String(html||'');

  /* 1) 去掉威胁式文案（<em>不看广告＝…</em>） */
  s=s.replace(/<em[^>]*>\s*不看广告[^<]*<\/em>/g,'');

  /* 2) 「专属故事」整段 → 一行短句 */
  s=s.replace(/<div class="v221-ad-story">[\s\S]*?<\/div>/g,
    '<div class="v221-ad-story" style="margin-top:6px;padding:0;border:0;background:none">'+
    '<p style="font-size:8px;line-height:1.45;color:#ffe3bf;margin:0">'+
    '解锁后可体验这名状元从选秀夜到退役的完整专属主线。</p></div>');

  /* 3) 4 个 ✓ 徽章 → 一行小字 */
  s=s.replace(/<div>\s*<span>✓ 开局立即生效<\/span>\s*<span>✓ 局内持续生效<\/span>\s*<span>✓ 解锁从选秀夜到退役的专属故事<\/span>\s*<\/div>/g,
    '<div><span>✓ 开局即生效</span><span>✓ 解锁完整专属故事</span></div>');

  return s;
}
window.v57Slim=v57Slim;

/* 包装 renderTalents：输出前过一遍精简 */
try{
  const __v57Render=renderTalents;
  renderTalents=function(){
    try{return v57Slim(__v57Render())}catch(e){return __v57Render()}
  };
}catch(e){}

/* v41 的中性弹层也含类似广告文案，一并处理（若存在） */
try{
  if(typeof renderOverlay==='function'){
    const __v57Overlay=renderOverlay;
    renderOverlay=function(){
      try{return v57Slim(__v57Overlay())}catch(e){return __v57Overlay()}
    };
  }
}catch(e){}

window.__v57Debug={slim:v57Slim};

})();
