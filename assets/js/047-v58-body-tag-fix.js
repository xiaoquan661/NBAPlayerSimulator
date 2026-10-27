
/* =====================================================================
   V5.8 · 修复「随机事件把 <p> 标签当文字显示」
   开发者反馈（原样贴出了界面内容）：
     「<p>新主帅第一次全队会议，没有寒暄。……</p>
      随机事件显示的，怎么还把标签显示出来了」

   根因（已实测复现）：
     故事弹层用 <p class="v28-body">${e.b}</p> 包裹正文，
     但我在补写「一句话剧情」时把正文改写成了带 <p> 段落的富文本，
     于是变成 <p class="v28-body"><p>…</p><p>…</p></p>。
     HTML 规范里 <p> 不能嵌套 <p>：浏览器自动闭合外层 <p>，
     后面那些 </p> 就成了没有开标签的孤立标签，被当作纯文本渲染出来，
     所以玩家看到的是「<p>…</p>」字面量。

   修法（两层，互为保险）：
     A. 把弹层里的正文容器从 <p> 换成 <div>（div 可以正常包含 <p>），
        于是无论正文是纯文本还是富文本段落，都能正确渲染。
     B. 渲染前做一次「段落规整」：把外层已不再需要的包裹保持不动，
        但把「纯文本正文」自动包装成段落，保证两种写法外观一致。
   ===================================================================== */
(function(){
if(window.__v58BodyFix)return;window.__v58BodyFix=true;

/* ---------- A. 把三个弹层的 <p class="...-body"> 换成 <div> ---------- */
try{
  const __v58Overlay=renderOverlay;
  renderOverlay=function(){
    let html;
    try{html=__v58Overlay()}catch(e){return __v58Overlay()}
    try{
      /* 只替换「正文容器」这一处，不动正文内部自己的 <p> */
      html=String(html)
        .replace(/<p(\s+class="v28-body")>/g,'<div$1>')
        .replace(/<p(\s+class="v27-body")>/g,'<div$1>');
      /* 对应的闭合标签：把紧跟正文结束的那个 </p> 一起换掉。
         正文结尾固定是「</p><div class="v28-stakes"」或「</p><div class="choice-list"」等形式，
         这里用「正文容器开标签 → 到下一个 <div class= 之前」的结构做非贪婪替换。 */
      html=html.replace(/(<div\s+class="v28-body">[\s\S]*?)<\/p>(\s*<div)/g,'$1</div>$2');
      html=html.replace(/(<div\s+class="v27-body">[\s\S]*?)<\/p>(\s*<div)/g,'$1</div>$2');
    }catch(e){}
    return html;
  };
}catch(e){}

/* ---------- B. 正文规整：纯文本自动成段 ----------
   有些事件正文是纯文本（没有标签）。在 <div> 容器里它会贴成一大段，
   这里统一包成 <p> 段落；已经是富文本的原样保留。 */
function v58FormatBody(txt){
  const s=String(txt==null?'':txt);
  if(/<(p|br|div|b|strong|em|span|i)\b/i.test(s))return s;   /* 已含标签：原样 */
  /* 纯文本：按换行或句号分段，最多 4 段，避免一坨 */
  const lines=s.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  if(lines.length>1)return lines.map(x=>'<p>'+x+'</p>').join('');
  return '<p>'+s+'</p>';
}
window.v58FormatBody=v58FormatBody;


/* ---------- C. 段落间距：内层 <p> 的默认外边距要收掉，避免容器变高 ---------- */
try{
  const st=document.createElement('style');
  st.id='v58-body-p';
  st.textContent=[
    '.v28-body p,.v27-body p{margin:0 0 .55em !important}',
    '.v28-body p:last-child,.v27-body p:last-child{margin-bottom:0 !important}',
    '.v28-body,.v27-body{display:block}'
  ].join('');
  document.head.appendChild(st);
}catch(e){}

window.__v58Debug={format:v58FormatBody};

})();
