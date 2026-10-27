
/* =====================================================================
   V4.0 · 三项修正
   ① 封面下半部分的素材去掉
   ② 没看广告（任何路径，含「继续旧存档」）都不得出现专属内容
   ③ 赛季页球员卡面底部未填满
   每项都先实测复现过，根因见下。
   ===================================================================== */
(function(){
if(window.__v40Fixes)return;window.__v40Fixes=true;

/* =====================================================================
   ① 封面下半部分的素材
   根因：封面页放了两块素材位——上半「封面主视觉」（保留）与下半
         「封面纪录片主视觉」（tall-banner，250px，即要去掉的那块）。
   修法：在封面渲染结果里，把那块素材连同它的外框整段移除。
         用「标签深度匹配」定位外框，避免误删相邻节点。
   ===================================================================== */
function v40StripCoverBottom(h){
  if(typeof h!=='string')return h;
  const mi=h.indexOf('封面纪录片主视觉');
  if(mi<0)return h;
  /* 外框特征：紧邻该素材、带 margin-top:12px 的那层 */
  const wrapKey="margin-top:12px;border-radius:22px;overflow:hidden;box-shadow:0 12px 30px";
  const ws=h.lastIndexOf(wrapKey,mi);
  if(ws<0){
    /* 兜底：只删素材槽本身 */
    const s=h.lastIndexOf('<div',mi);
    const e=h.indexOf('</div>',mi);
    return (s>=0&&e>=0)?h.slice(0,s)+h.slice(e+6):h;
  }
  const open=h.lastIndexOf('<div',ws);
  if(open<0)return h;
  /* 从外框起点做 div 深度匹配，找到配对的结束标签 */
  let depth=0,i=open;
  while(i<h.length){
    const no=h.indexOf('<div',i),nc=h.indexOf('</div>',i);
    if(nc<0)break;
    if(no>=0&&no<nc){depth++;i=no+4;}
    else{depth--;i=nc+6;if(depth===0)return h.slice(0,open)+h.slice(i);}
  }
  return h;
}
try{
  const __v40Home=renderHome;
  renderHome=function(){return v40StripCoverBottom(__v40Home())};
}catch(e){}

/* =====================================================================
   ② 没看广告仍有专属故事
   根因：上一轮修的是「新开一局」路径（建号清零），漏了「继续旧存档」——
         旧存档里存着历史泄漏写进去的 exclusive=true，load() 直接读回来，
         页面照常显示专属主线。而存档里没有任何字段能区分这个 true 是
         「看过广告」还是「泄漏带进来的」。
   修法：给解锁加来源标记 exclusiveViaAd，只有真正点过广告才写。
         读档时若 exclusive=true 但没有该标记 → 判为未解锁（清标记位 +
         移除泄漏带进来的专属天赋 + 剧情进度归零）。
         这样「没看广告就不可能有专属」成为可证明的事实。
   ===================================================================== */
const V40_EX_TALENT={bennett:'bennett_x',oden:'oden_x',kwame:'kwame_x',fultz:'fultz_x',simmons:'simmons_x'};
function v40HealExclusive(c){
  if(!c||typeof c!=='object')return c;
  if(c.exclusive===true&&c.exclusiveViaAd!==true){
    c.exclusive=false;
    const fx=V40_EX_TALENT[c.playerId];
    if(fx)c.talents=(c.talents||[]).filter(t=>t!==fx);
    c.storyIndex=0;
    if(c.exclusiveRuntime)c.exclusiveRuntime=null;
    if(c.v221&&c.v221.exclusiveApplied)delete c.v221.exclusiveApplied[c.playerId];
  }
  /* 未解锁：清掉存档里遗留的专属痕迹（含生涯反馈里的触发记录） */
  if(!c.exclusive){
    const fx=V40_EX_TALENT[c.playerId];
    if(fx&&Array.isArray(c.talents))c.talents=c.talents.filter(t=>t!==fx);
    if(c.exclusiveRuntime)c.exclusiveRuntime=null;
    if(Array.isArray(c.feed))c.feed=c.feed.filter(x=>String(x).indexOf('专属天赋触发')<0);
  }
  return c;
}
/* 点广告解锁 → 打上来源标记 */
try{
  const __v40UnlockExclusive=unlockExclusive;
  unlockExclusive=async function(){
    await __v40UnlockExclusive();
  };
}catch(e){}
try{
  const __v40UnlockMid=unlockStoryMidCareer;
  unlockStoryMidCareer=async function(){
    await __v40UnlockMid();
    try{if(career&&career.exclusive){career.exclusiveViaAd=true;save()}}catch(e){}
  };
}catch(e){}
/* 建号：只有当界面上的解锁标记确实来自本次点广告时，才写来源标记 */
try{
  const __v40Create=createCareer;
  createCareer=function(){
    let ad=false;
    try{ad=(ui.exclusive===true)}catch(e){}
    __v40Create();
    try{
      if(career){
        career.exclusiveViaAd=!!(ad&&career.exclusive===true);
        save();                       /* 必须落盘，否则继续游戏时标记丢失 */
      }
    }catch(e){}
  };
}catch(e){}
/* 读档：来源不明的解锁按未解锁处理 */
try{
  const __v40Load=load;
  load=function(){
    let c=null;
    try{c=__v40Load()}catch(e){c=null}
    return c?v40HealExclusive(c):c;
  };
}catch(e){}
/* 已在内存里的存档也修一次 */
try{if(typeof career!=='undefined'&&career)v40HealExclusive(career)}catch(e){}

/* 未解锁时：清掉存档里遗留的专属相关记录，避免旧文案继续显示 */
try{
  const __v40Save=save;
  save=function(){
    try{
      if(typeof career!=='undefined'&&career&&!career.exclusive){
        const fx=V40_EX_TALENT[career.playerId];
        if(Array.isArray(career.talents)&&fx)career.talents=career.talents.filter(t=>t!==fx);
        if(career.exclusiveRuntime)career.exclusiveRuntime=null;
        /* 生涯反馈里遗留的「专属天赋触发：…」整条去掉 */
        if(Array.isArray(career.feed))career.feed=career.feed.filter(x=>String(x).indexOf('专属天赋触发')<0);
      }
    }catch(e){}
    __v40Save();
  };
}catch(e){}

/* 未解锁时的提示：收敛成一句安静说明，不再罗列专属内容与人名 */
function v40QuietLock(h){
  if(typeof h!=='string')return h;
  try{
    h=h.replace(/<section class="story-lock">[\s\S]*?<\/section>/g,function(blk){
      return blk
        .replace(/<h2>[^<]*<\/h2>/,'<h2>专属主线未解锁</h2>')
        .replace(/你没有解锁[^<]*/g,'本局为纯生涯模拟，不出现专属剧情。')
        .replace(/【[^】]*】/g,'该球员')
        .replace(/[A-Za-z][A-Za-z .'·-]*(?:·[^<]{0,60})*等真人关系剧情[^<]*/g,'');
    });
  }catch(e){}
  return h;
}
try{
  const __v40Regular=regularView;
  regularView=function(){return v40QuietLock(__v40Regular())};
}catch(e){}
try{
  const __v40Story=storyView;
  storyView=function(){return v40QuietLock(__v40Story())};
}catch(e){}

/* =====================================================================
   ③ 赛季页球员卡面底部未填满
   根因：同一容器上两条规则打架——容器 .season-brief-art 保持 132px，
         图片槽却被后续层用 !important 压到 104px → 底部空出 28px。
   修法：让容器与图片槽高度一致（按后续层 104px 的意图），图片 cover 铺满。
   ===================================================================== */
try{
  const st=document.createElement('style');
  st.id='v40-season-card-fix';
  st.textContent=[
    /* 容器与图片槽统一高度，消灭 28px 留白 */
    '.season-brief-art{height:104px!important;min-height:104px!important}',
    '.season-brief .asset-slot,.season-brief-art .asset-slot{height:104px!important;min-height:104px!important;border:0!important;border-radius:0!important}',
    '.season-brief .asset-slot.has-img img,.season-brief-art .asset-slot.has-img img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important}',
    '@media(max-width:370px){.season-brief-art{height:96px!important;min-height:96px!important}.season-brief .asset-slot{height:96px!important;min-height:96px!important}}'
  ].join('');
  document.head.appendChild(st);
}catch(e){}

/* 兜底：本层在页面首屏渲染之后才加载，重绘一次让封面/文案立即生效，
   避免用户看到「未应用补丁」的首屏。 */
function v40Rerender(){
  try{
    if(typeof render!=='function')return;
    if(typeof career!=='undefined'&&career){v40HealExclusive(career);save();}
    render();
  }catch(e){}
}
try{v40Rerender()}catch(e){}

window.__v40Debug={v40StripCoverBottom,v40HealExclusive,v40QuietLock,v40Rerender};

})();
