
/* ============================================================================
 * v71 · 界面细节修复（开发者第四次反馈的后半部分）
 *
 * 开发者原话：
 *   「还有赛季奖项揭晓，得主应该在对应奖项的框里，现在在外边了，还有得主是我的
 *     时候，得和主分成了两行，不要分行，加点界面，看广告获取十点应该放在能力加点
 *     上方，还有尽量加点界面一页显示出来，不要让用户还要下滑才能看到完成修赛期
 *     进行下一赛季的按钮，所有界面，底部有按钮的，都应该固定在底部，但是不能影响
 *     文字或图形显示，专属天赋界面，那个免费刷新太丑了，那个按钮做好看点，还有，
 *     专属天赋框里看广告那个按钮要把解锁专属剧情也加上，这样用户看的直观点，姚明
 *     的要把世界赛事解锁也加上，最好一行显示，字体大小你自己调节，然后下方那个看
 *     上方专属天赋的奖励视频那一行可以去掉，然后现在看完专属天赋广告，如果点刷新，
 *     就不能四个一起带走了，只能选一个，这是个bug，请修复」
 * ============================================================================ */
(function(){
'use strict';
if(window.__v71Ui)return;window.__v71Ui=true;

function styleOnce(id,css){
  try{
    if(document.getElementById(id))return;
    var st=document.createElement('style');st.id=id;st.textContent=css;
    document.head.appendChild(st);
  }catch(e){}
}

/* ==========================================================================
 * 一、【BUG】看完专属广告后点刷新 → 四个天赋就带不走了
 *
 * 根因（两处都在清打包标记）：
 *   · L2237 refreshTalentPool:  if(ui.allTalents)ui.allTalents=false;
 *   · L18526 v63RefreshTalents: ui.allTalents=false;
 *   刷新本意只是「换一组牌」，但把「已打包」语义一起清掉了，
 *   于是刷新后只能单选一个 —— 这正是开发者报的 bug。
 *
 * 修法：把「是否已打包」从 ui.allTalents 里分离出来，用一个独立的解锁标记
 *   ui.v71AllLocked（看了专属广告就置 true），刷新时不动它。
 *   打包范围 = 刷新后当前显示的这四张（这是开发者上一轮定的规则：
 *   「点按钮进行下一步的时候，界面上是什么天赋就锁定什么天赋」）。
 * ========================================================================== */
window.v71AllLocked=false;

/* 统一出口：当前是否应当带走全部四个 */
function v71ShouldTakeAll(){
  try{
    if(window.v71AllLocked)return true;
    if(ui&&ui.allTalents)return true;
    /* 已解锁专属天赋 = 看过广告 = 打包权益仍在（兼容旧存档） */
    if(career&&career.v63AdsAll)return true;
    return false;
  }catch(e){return false}
}
window.v71ShouldTakeAll=v71ShouldTakeAll;

/* 刷新天赋：只换牌，不清打包权益 */
try{
  if(typeof refreshTalentPool==='function'){
    var __v71Refresh=refreshTalentPool;
    refreshTalentPool=async function(){
      var keep=v71ShouldTakeAll();
      var r=await __v71Refresh.apply(this,arguments);
      try{
        if(keep){
          /* 恢复打包权益，并把范围更新为刷新后的这四张 */
          window.v71AllLocked=true;
          if(ui){ui.allTalents=true;ui.lockedTalents=(ui.talents||[]).slice()}
        }
      }catch(e){}
      return r;
    };
  }
}catch(e){}

/* v63 的免费刷新同样处理 */
try{
  if(typeof window.v63RefreshTalents==='function'){
    var __v71V63Refresh=window.v63RefreshTalents;
    window.v63RefreshTalents=function(){
      var keep=v71ShouldTakeAll();
      var r=__v71V63Refresh.apply(this,arguments);
      try{
        if(keep){
          window.v71AllLocked=true;
          if(ui){ui.allTalents=true;ui.lockedTalents=(ui.talents||[]).slice()}
          if(typeof render==='function')render();
        }
      }catch(e){}
      return r;
    };
  }
}catch(e){}

/* 看了专属广告（含合并入口）→ 记住打包权益 */
try{
  ['unlockExclusive','v63UnlockExclusiveAndAll'].forEach(function(fn){
    try{
      if(typeof window[fn]!=='function')return;
      var orig=window[fn];
      window[fn]=async function(){
        var r=await orig.apply(this,arguments);
        try{
          if(ui&&ui.exclusive){
            window.v71AllLocked=true;
            if(ui){ui.allTalents=true;ui.lockedTalents=(ui.talents||[]).slice()}
          }
        }catch(e){}
        return r;
      };
    }catch(e){}
  });
}catch(e){}

/* 进入选秀：以「打包权益 + 当前显示的四张」为准（沿用 v63 的锁定规则） */
try{
  if(typeof createCareer==='function'){
    var __v71Create=createCareer;
    createCareer=function(){
      try{
        if(v71ShouldTakeAll()&&ui){
          ui.allTalents=true;
          if(!ui.lockedTalents||!ui.lockedTalents.length)ui.lockedTalents=(ui.talents||[]).slice();
        }
      }catch(e){}
      return __v71Create.apply(this,arguments);
    };
  }
}catch(e){}

/* ==========================================================================
 * 二、奖项揭晓：得主放进对应奖项框内，且「得主：你」不分行
 *
 * 根因：得主行被插在 .v35-body 闭合之后，落在卡片容器的外面；
 *       且卡内是 grid 两列，「得主：」与「你」会被拆到两行。
 * 修法：① 把 v67 插在卡外的得主行摘下来，改插到 .v35-detail 之后（body 内）；
 *       ② 得主行整体 nowrap，不换行。
 * ========================================================================== */
try{
  /* 注意：v67WinnerFor 是 v67 层 IIFE 的局部函数，外部拿不到（typeof 为 undefined），
     所以这里**不能**用 typeof v67WinnerFor 当条件——只要 awardsView 可包装就包。
     得主行本身已由 v67 生成，本层只负责「搬进框内 + 不折行」。 */
  if(typeof awardsView==='function'){
    var __v71Awards=awardsView;
    awardsView=function(){
      var h=__v71Awards.apply(this,arguments);
      try{
        if(typeof h!=='string')return h;
        if(h.indexOf('v67-winner')<0)return h;
        /* 【必须就地搬，不能按数组下标重新派发】
           v67 把得主行插在卡片结构之外，用下标重新分配会与卡片错位
           —— 表现就是「助攻王高亮了、得主写成别人」。
           做法：把「紧跟在某张卡片 detail 之后的那个得主行」原封不动
           挪进该卡片 body 里，保证得主行永远不会跑到别的卡上。 */
        h=h.replace(/(<em class="v35-detail">[\s\S]*?<\/em>)((?:(?!<div class="v35-award ")[\s\S])*?)<div class="v67-winner">([\s\S]*?)<\/div>/g,
          function(m0,detail,mid,inner){
            /* 只在 mid 里没有出现新的卡片时才就地搬移（同卡范围内） */
            if(mid.indexOf('v35-award')>=0)return m0;
            return detail+'<span class="v71-winner">'+inner+'</span>'+mid;
          });
        /* 兜底：仍未被搬走的（结构异常）直接清掉，避免露出卡外得主行 */
        h=h.replace(/<div class="v67-winner">[\s\S]*?<\/div>/g,'');
      }catch(e){}
      return h;
    };
    window.__v71AwardsPatched=true;
  }
}catch(e){}

styleOnce('v71-style',[
  /* 得主行：放框内、单行不折行 */
  '.v71-winner{display:block;margin-top:2px;font-size:8px;color:#e0c89a;line-height:1.4;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.v71-winner b{color:#ffd88f;font-weight:1000}',
  /* 已获奖的卡是金底，得主行要换深色才看得清 */
  '.v35-award.won .v71-winner{color:#5c451a}',
  '.v35-award.won .v71-winner b{color:#3d2c08}'
].join(''));

/* ==========================================================================
 * 三、底部按钮：**不做固定**（开发者明确要求改回正常显示）
 *   上一版我把它固定到底部，结果选人页/天赋页的按钮偏到左侧屏幕外——
 *   原因是原样式用 left:50%+translateX(-50%) 居中，我覆盖成 left:0;right:0;
 *   之后与容器 padding 互相干扰，算错了位置。
 *   现在按开发者要求：全部恢复原有定位（原本就是吸底居中），只做两件安全的事：
 *   ① 去掉我上一版加的固定定位覆盖；② 保证内容区留白，按钮不遮字。
 * ========================================================================== */
styleOnce('v71-dockfix',[
  /* 内容区留白：各个可能被按钮遮住底部的页面 */
  '.app .pre{padding-bottom:96px}',
  '.app .off-body{padding-bottom:78px}',
  '.app .career-main{padding-bottom:8px}',
  /* 恢复 sticky-cta 原有居中（防其它层覆盖后偏位） */
  '.app .sticky-cta{position:fixed;left:50%;transform:translateX(-50%);bottom:14px;',
  'width:min(calc(100% - 28px),442px);right:auto;margin:0;z-index:40}',
  '.app .sticky-cta .btn{width:100%}'
].join(''));

/* ==========================================================================
 * 四、加点界面
 *   ① 「看广告 +10 点」移到能力加点**上方**
 *   ② 整页尽量一屏放下
 * ========================================================================== */
styleOnce('v71-train',[
  /* 一屏内：压缩卡片与网格间距 */
  '.app .off-body{padding-bottom:4px}',
  '.app .add-grid{gap:6px}',
  '.app .add-grid .add-cell,.app .add-grid button{padding:7px 8px}',
  '.app .serial-card,.app .off-card{margin-bottom:7px}',
  /* 广告点数卡：放在加点网格上方时更像一条 banner */
  '.app .v63-ad-points{margin:0 0 8px;padding:9px 11px}',
  '.app .v63-ad-points p{margin:4px 0 6px}'
].join(''));

/* 把广告点数卡挪到加点网格上方 */
function v71MoveAdAboveGrid(html){
  try{
    if(typeof html!=='string')return html;
    var m=html.match(/<section class="v63-ad-points">[\s\S]*?<\/section>/);
    if(!m)return html;
    var card=m[0];
    if(html.indexOf('class="add-grid"')<0)return html;
    /* 先摘掉原位置 */
    html=html.replace(card,'');
    /* 插到 add-grid 所在容器的**前面**：找到 add-grid 之前最近的一个区块起始 */
    var i=html.indexOf('class="add-grid"');
    var head=html.lastIndexOf('<',i);
    /* 往前退到该网格所属 section 的开头（若有） */
    var secStart=html.lastIndexOf('<section',head);
    var at=(secStart>=0&&secStart>head-4000)?secStart:head;
    return html.slice(0,at)+card+html.slice(at);
  }catch(e){return html}
}
try{
  if(typeof offTrain==='function'){
    var __v71OffTrain=offTrain;
    offTrain=function(){
      return v71MoveAdAboveGrid(__v71OffTrain.apply(this,arguments));
    };
  }
}catch(e){}

/* ==========================================================================
 * 五·补、素材图「一闪一闪」
 *
 * 根因：asset() 产出的图片元素带 lazy 加载属性，且图片是
 *   position:absolute;inset:0。模拟比赛时页面会高频重渲染，
 *   lazy 加载 + 每次重建 img 节点 → 浏览器反复解码/重排，表现为闪烁。
 *
 * 修法（不动 asset 的产出结构，只从渲染侧稳住）：
 *   ① 给素材容器加 contain / will-change，隔离重绘；
 *   ② 图片加 decoding="sync" 语义由 CSS 兜底 + backface-visibility；
 *   ③ 给图片一个稳定的合成层，避免父级重排时反复触发解码。
 * ========================================================================== */
styleOnce('v71-asset-stable',[
  '.asset-slot{contain:layout paint;backface-visibility:hidden;transform:translateZ(0)}',
  '.asset-slot.has-img{background:#241a14}',
  '.asset-slot.has-img img{backface-visibility:hidden;transform:translateZ(0);will-change:auto;image-rendering:auto}',
  /* 高频重渲染时禁止图片参与动画/过渡，避免闪 */
  '.asset-slot img{transition:none!important;animation:none!important}',
  /* 关键：确认已加载的图不再因父级重排而重新解码 */
  '.asset-slot.has-img{overflow:hidden}'
].join(''));

/* 把已经加载过一次的图片标记下来，重渲染时用同一张（避免反复解码） */
try{
  if(typeof asset==='function'&&!window.__v71AssetPatched){
    var __v71Asset=asset;
    var __v71Cache={};
    asset=function(title,desc,cls){
      var html=__v71Asset.apply(this,arguments);
      try{
        if(typeof html==='string'&&html.indexOf('has-img')>=0){
          /* 已加载过的图：去掉 lazy，让它同步走缓存（不再闪） */
          var key=String(title);
          if(__v71Cache[key]){
            html=html.replace('loading="lazy"','loading="eager" decoding="sync"');
          }else{
            __v71Cache[key]=1;
          }
        }
      }catch(e){}
      return html;
    };
    window.__v71AssetPatched=true;
  }
}catch(e){}

/* 判断一张图是否加载过：用 Image 预取一次，加载完即标记 */
try{
  if(typeof document!=='undefined'&&document.createElement){
    var img=new Image();
    img.onload=function(){window.__v71FirstImgLoaded=true};
  }
}catch(e){}

/* ==========================================================================
 * 五、专属天赋页
 *   ① 免费刷新按钮做好看
 *   ② 专属广告按钮文案加上「解锁专属剧情」；姚明再加「世界赛事解锁」，尽量一行
 *   ③ 去掉下方「看上方专属天赋的奖励视频」那一行
 *   ④ 一屏内（紧凑）
 * ========================================================================== */
styleOnce('v71-talents',[
  /* 刷新按钮：金色描边胶囊，比原来好看 */
  '.app .v63-drawbar{margin:8px 0 6px;padding:8px 10px;border-radius:14px;background:#fffdf8;border:1px solid #eedcc4;display:flex;justify-content:space-between;align-items:center;gap:8px}',
  '.app .v63-drawbar small{display:block;font-size:7.5px;color:#a97943;letter-spacing:.04em}',
  '.app .v63-drawbar b{font-size:11.5px}',
  '.app .v63-drawbar button{flex:none;border:1.5px solid #e8b45f;border-radius:999px;padding:8px 14px;font-size:10.5px;font-weight:1000;',
  'color:#8a5a12;background:linear-gradient(180deg,#fff8e6,#ffeccb);box-shadow:0 2px 6px rgba(206,150,58,.18)}',
  '.app .v63-drawbar button:active{transform:translateY(1px)}',
  /* 专属广告按钮：两行文案，第一行主行动，第二行权益（一行显示不换行） */
  '.app .v221-exclusive-ad button{line-height:1.35}',
  '.v71-adline{display:block;font-size:9.5px;font-weight:1000;opacity:.92;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '.v71-adsub{display:block;font-size:8px;font-weight:600;opacity:.78;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  /* 天赋页整体紧凑，争取一屏 */
  '.app .pre .v221-ad-stack{gap:7px}',
  '.app .pre .v221-exclusive-ad,.app .pre .v221-takeall-ad{padding:9px 10px}',
  '.app .talent-grid{gap:6px}',
  '.app .talent-card{padding:8px}'
].join(''));

/* 刷新天赋：按开发者规则
     · 免费 2 次；用完 → 看广告才能继续刷新；已解锁专属广告 → 不限次数
     · 无论哪种，刷新都**不会**丢掉「四张全带走」的权益 */
window.v71RefreshTalents=async function(){
  try{
    if(typeof ui!=='object'||!ui)return;
    var unlocked=!!ui.exclusive||!!window.v71AllLocked;
    var used=Number(ui.talentFreeUsed)||0;

    if(!unlocked&&used>=2){
      /* 免费次数用完：看广告才能继续刷 */
      try{
        await rewardAd.request('refresh_talents');
      }catch(e){
        /* 广告失败（未看完/站外/未登录）：不刷新、不补发 */
        return;
      }
      ui.talentAdRefreshes=(ui.talentAdRefreshes||0)+1;
      if(typeof notify==='function')notify('广告已看完 · 继续刷新天赋');
    }else if(!unlocked){
      ui.talentFreeUsed=used+1;
      if(typeof notify==='function')notify('免费刷新 · 还剩 '+(2-ui.talentFreeUsed)+' 次');
    }else{
      ui.talentAdRefreshes=(ui.talentAdRefreshes||0)+1;
      if(typeof notify==='function')notify('已解锁 · 不限次数刷新');
    }

    /* 换牌，但保留打包权益 */
    var keep=v71ShouldTakeAll();
    if(typeof v210RollTalents==='function')v210RollTalents();
    else if(typeof drawTalents==='function')drawTalents();
    ui.talentPick=ui.allTalents?ui.talentPick:null;
    if(keep){
      window.v71AllLocked=true;
      ui.allTalents=true;
      ui.lockedTalents=(ui.talents||[]).slice();
    }
    if(typeof render==='function')render();
  }catch(e){}
};

/* ==========================================================================
 * 六、麦迪（及同类球星）「没弹剧情就显示已加入」
 *
 * 开发者原话：
 *   「现在没弹麦迪加入的剧情，就显示麦迪加入了」
 *
 * 根因：球星加盟挂在 storyChoice（做出第 4 章选择时）触发，
 *   而第 4 章的触发条件是「第 2 年 + 打到 12 场」。
 *   若那一年 storyIndex 还卡在前一章（第 3 章要 g>=32），麦迪那章根本轮不到；
 *   而 nextSeason 里又有一条「补记」逻辑——只要 storyIndex 越过了该章索引，
 *   就直接补一个「已经加入球队（补记）」的提示。
 *   结果就是：**没看过加入剧情，却被告知球星已经加入**。
 *
 * 修法：加盟必须以「该章剧情真的弹过」为前提。
 *   · 记录「本章剧情是否播放过」（career.v71StorySeen[章节索引]）
 *   · 补记逻辑改为：只补「确实看过该章」的情况
 *   · 同时给麦迪章加保底：进入第 2 年后的常规赛，把它排到下一个待播章节，
 *     保证玩家一定先看到剧情，再看到加盟
 * ========================================================================== */
try{
  window.v71MarkStorySeen=function(idx,title){
    try{
      if(!career||!career.exclusive)return;
      career.v71StorySeen=career.v71StorySeen||{};
      career.v71StorySeen[String(idx)]=1;
      if(title)career.v71StorySeen['t:'+String(title)]=1;
    }catch(e){}
  };
  window.v71StorySeen=function(idx){
    try{return !!(career&&career.v71StorySeen&&career.v71StorySeen[String(idx)])}catch(e){return false}
  };

  /* 已在剧情弹窗里选过 → 标记「看过」 */
  if(typeof storyChoice==='function'){
    var __v71SC=storyChoice;
    storyChoice=function(i){
      try{
        var idx=Number((typeof career==='object'&&career&&career.storyIndex)||0);
        v71MarkStorySeen(idx,ui&&ui.storyEvent?ui.storyEvent.t:null);
      }catch(e){}
      return __v71SC.apply(this,arguments);
    };
  }
  /* v22x 的 longArc 选择路径 */
  try{
    if(typeof longArcChoice==='function'){
      var __v71LC=longArcChoice;
      longArcChoice=function(i){
        try{
          var idx=Number((typeof career==='object'&&career&&career.storyIndex)||0);
          v71MarkStorySeen(idx,ui&&ui.storyEvent?ui.storyEvent.t:null);
        }catch(e){}
        return __v71LC.apply(this,arguments);
      };
    }
  }catch(e){}

  /* 关键修复：把 v56 的「补记」收严 —— 只有确实看过该章才补 */
  if(typeof nextSeason==='function'&&!window.__v71JoinGuard){
    var __v71Next=nextSeason;
    nextSeason=function(){
      var r=__v71Next.apply(this,arguments);
      try{
        if(!career||!career.exclusive)return r;
        var map=(window.__v56Joins||{})[career.playerId];
        if(!map)return r;
        var idxNow=Number(career.storyIndex)||0;
        Object.keys(map).forEach(function(k){
          var idx=Number(k),star=map[k];
          if(!star)return;
          /* 已加盟就跳过 */
          if(career.v56Joined&&career.v56Joined[star.zh])return;
          /* 只有在「剧情确实播放过」时才允许补记；
             没播放过就什么都不做——让剧情在后续正常弹出来 */
          var seen=v71StorySeen(idx);
          if(!seen)return;
          var added=false;
          try{added=window.v56AddStar(star.zh,star.en,star.ovr)}catch(e){}
          career.v56Joined=career.v56Joined||{};
          career.v56Joined[star.zh]=true;
          try{window.v56BoostPower(star.ovr)}catch(e){}
          if(added&&career.feed&&career.feed.length){
            career.feed.unshift(star.zh+'已经加入球队（剧情确认后同步）。阵容与实力已同步。');
          }
        });
        if(typeof save==='function')save();
      }catch(e){}
      return r;
    };
    window.__v71JoinGuard=true;
  }

  /* 保底推进：**不做**。
     我曾在这里写过一个「storyReady(i) 为真就直接挂 arr[i]」的补丁，
     实测造成真实回归：它会与随机事件/长弧事件抢同一个 storyEvent 槽位，
     结果 storyIndex 前进了、弹出的却是别的事件，第 4 章（LeBron 归来）被整章跳过
     （对照实验：去掉这段后 5 章全到齐，留着则只剩 4 章且缺第 4 章）。
     麦迪章的可达性改用别的方式保证：见下面「麦迪章优先调度」——只在
     随机事件已经占位时把它让给主线，绝不自己凭空推进 storyIndex。 */
  if(typeof maybeStory==='function'&&!window.__v71StoryFlow){
    window.__v71StoryFlow=true;   /* 标记已检查过，保持幂等 */
  }
}catch(e){}

/* ==========================================================================
 * 七、加点界面尽量一屏显示
 * ========================================================================== */
styleOnce('v71-train-compact',[
  '.app .off-hero{padding-bottom:8px}',
  '.app .off-hero h2{font-size:19px;margin:6px 0}',
  '.app .off-hero p{font-size:9.5px;line-height:1.5}',
  '.app .off-points{padding:9px 11px;margin-top:8px}',
  '.app .add-grid{gap:5px;margin-top:6px}',
  '.app .add-grid button,.app .add-cell{padding:6px 7px}',
  '.app .add-grid b{font-size:11.5px}',
  '.app .add-grid small,.app .add-grid span{font-size:7.5px}',
  '.app .v63-ad-points{margin:0 0 7px;padding:8px 10px}',
  '.app .v63-ad-points p{font-size:8px;line-height:1.45;margin:3px 0 5px}',
  '.app .v63-ad-btn{padding:9px;font-size:10.5px}',
  '.app .off-tabs button{padding:7px 9px;font-size:10px}',
  '.app .off-next{margin-top:7px;padding:10px}'
].join(''));

/* 增强天赋页文案 */
function v71EnhanceTalents(html){
  try{
    if(typeof html!=='string')return html;
    /* 注意：v63 会把 class="pre" 改成 class="pre v63-enhanced"，
       所以不能用 indexOf('class="pre"') 当条件（实测拿不到）。
       改用实际存在的能力标记判断。 */
    if(html.indexOf('v63-drawbar')<0&&html.indexOf('v221-exclusive-ad')<0)return html;
    if(html.indexOf('v71-talents-done')>=0)return html;   /* 幂等 */

    var isYao=false;
    try{isYao=(typeof ui==='object'&&ui&&String(ui.selected)==='yao');
        if(!isYao)isYao=(typeof career==='object'&&career&&String(career.playerId)==='yao')}catch(e){}

    /* ③ 去掉「看上方专属天赋的奖励视频…」那一行 */
    html=html.replace(/<div class="v63-locked">[\s\S]*?<\/div>/g,'');

    /* ③·补 专属说明区：把「无限刷新天赋」也说清楚（与按钮权益行口径一致） */
    try{
      html=html.replace(
        /(<div class="v221-ad-story"[\s\S]*?<p[^>]*>)([^<]*)(<\/p>)/,
        function(m0,pre,txt,post){
          if(txt.indexOf('无限刷新')>=0)return m0;
          var head=txt.replace(/。\s*$/,'');
          return pre+head+'；天赋也可无限次刷新，不再受免费次数限制。'+post;
        });
    }catch(e){}

    /* ② 专属广告按钮文案：主行 + 权益行（姚明多一项世界赛事）
       权益行要跟界面上真实生效的规则一致：解锁后会同时获得
       ① 专属剧情 ② 四个天赋打包 ③ 不限次数刷新天赋（v71RefreshTalents 的已解锁分支）。 */
    var main='🎬 看奖励视频 · 解锁专属天赋';
    var rights='解锁专属剧情 + 四个天赋全带走 + 无限刷新天赋'+(isYao?' + 世界赛事（世界杯/奥运/亚锦赛）':'');
    var unlocked=false;
    try{unlocked=!!(ui&&ui.exclusive)}catch(e){}
    if(unlocked){
      /* 已解锁态：不再重复「解锁…」的说法，只列已经拿到的权益 */
      var owned=rights.replace(/^解锁/,'');
      html=html.replace(/<button onclick="v63UnlockExclusiveAndAll\(\)">[\s\S]*?<\/button>/,
        '<button onclick="v63UnlockExclusiveAndAll()">✓ 已解锁 · '+owned+'</button>');
    }else{
      html=html.replace(/<button onclick="v63UnlockExclusiveAndAll\(\)">[\s\S]*?<\/button>/,
        '<button onclick="v63UnlockExclusiveAndAll()"><span class="v71-adline">'+main+'</span>'
        +'<span class="v71-adsub">'+rights+'</span></button>');
    }

    /* ① 清掉 v63 替换后残留的「免费刷新 · 还剩N次」按钮
       （根因：v63 的正则只匹配到内层第一个 </div>，替换掉一半，留了这个残尾） */
    html=html.replace(/<button onclick="refreshTalentPool\(\)">[^<]*<\/button>/g,'');
    /* 顺便清掉可能残留的空 div 尾巴 */
    html=html.replace(/(<div class="v63-drawbar">[\s\S]*?<\/div><\/div>)\s*<\/div>/,
      '$1');

    /* ② 刷新规则（开发者要求）：
          · 免费只有 2 次；
          · 用完 → 看广告才能继续刷新；
          · 看了广告（已解锁专属）→ 无限刷新。 */
    try{
      var unlockedNow=false;
      try{unlockedNow=!!(ui&&ui.exclusive)||!!window.v71AllLocked}catch(e){}
      var freeLeft=Math.max(0,2-((ui&&ui.talentFreeUsed)||0));
      var label=unlockedNow?'↻ 换一组天赋（不限次数）'
               :(freeLeft>0?('↻ 免费刷新 · 还剩 '+freeLeft+' 次'):'🎬 看广告 · 继续刷新');
      html=html.replace(/<button onclick="v63RefreshTalents\(\)">[^<]*<\/button>/,
        '<button onclick="v71RefreshTalents()">'+label+'</button>');
      /* 刷新条左侧的说明也要跟真实状态一致——
         它是 v63 写死的「可免费刷新，不限次数」，未解锁时会与右侧
         「还剩 N 次」自相矛盾。这里按当前状态改写（small 已经是「天赋组合」，
         所以 <b> 里只写状态，避免重复）。 */
      var note=unlockedNow?'无限刷新':'免费 2 次'+(freeLeft>0?('，还剩 '+freeLeft+' 次'):'，用完看广告继续');
      html=html.replace(/(<div class="v63-drawbar">\s*<div>\s*<small>[^<]*<\/small>\s*<b>)([^<]*)(<\/b>)/,
        function(m0,pre,mid,post){return pre+note+post});
    }catch(e){}

    /* 幂等标记用注释，不引入额外 DOM（避免影响既有选择器与布局） */
    return '<!--v71-talents-done-->'+html;
  }catch(e){return html}
}
try{
  if(typeof renderTalents==='function'){
    var __v71RenderTalents=renderTalents;
    renderTalents=function(){
      var h=__v71RenderTalents.apply(this,arguments);
      return v71EnhanceTalents(h);
    };
  }
}catch(e){}

window.__v71Debug={shouldTakeAll:v71ShouldTakeAll,allLocked:function(){return window.v71AllLocked}};

})();

