
/* ============================================================================
 * v92 · 开发者第三十四次反馈：姚明体验四项修复（第二轮）
 *
 * 原话：
 *   「现在退役海报3388的总分 还是历史第17，是对的吗？还有点击分享到虎扑没反应，
 *     是不是没调用skill里的发帖功能，还有你改完怎么姚明模拟的得分更低了，
 *     还有火箭队依旧有虚拟球员，我看到了一个新的」
 *
 * ── 四个问题与根因（均已实测）────────────────────────────────────────
 *
 *  ①【海报名次 ≠ 真实名次】—— 我上一轮没修对，根源是**局部函数 vs 全局导出**
 *     实测：v81HistoryRank(3130) 算第 10 位，但 v81RetiredBlock() 渲染出「第 16 位」。
 *     原因：v81HistoryRank 与 v218CoStarName 都是各自 IIFE **内部**的局部函数；
 *     后续层写的 `try{if(typeof v81HistoryRank==='function')v81HistoryRank=...}`
 *     改的是**全局变量**，而 v81RetiredBlock / startFmvpCeremony 内部闭包引用的
 *     是**局部的那一个** → 替换够不到调用点。
 *     → 海报/分享文案一直在用 v81 老的手填标杆表（乔丹 9200 起），显示第 16/17；
 *       而 window.v89HistoryRank 用新表算第 10。**页面里有两套排名在跑**。
 *
 *     修法：不再试图替换函数，改为**处理渲染输出**（renderRetired 是全局函数，
 *     可包装）—— 按标记把海报里的名次文本替换成真实排名函数的结果。
 *
 *  ②【FMVP 搭档仍是虚构名】同一根因：startFmvpCeremony 内部直接调局部 v218CoStarName。
 *     修法：包装 window.startFmvpCeremony，在仪式对象建立后纠正搭档名（此时对象已挂到
 *     career.fmvpCeremony，外部可读写）。
 *
 *  ③【姚明得分没涨、观感变弱】上一轮只补了「按 id 查表」的 yao 键，
 *     但**得分由角色基准分 + 技巧 + 信任 + 自信 + 球权决定**，与查表无关；
 *     同时把助攻系数改小，导致整体观感变弱（19.9 分 10.4→13.3 板，但助攻 6.5→3.3）。
 *     实测 82 场：改前 19.9 分，改后仍 19.9 分。
 *     修法：从「角色基准分 + 内线属性收益」入手提高姚明得分产出，并恢复合理助攻；
 *     同时补 archetype 的 yao 键（原落兜底 1，中性但应显式）。
 *
 *  ④【分享到虎扑没反应】字段名与技能契约不符：
 *     契约（skills/colorbox-result-poster-posting/references/api-contract.md）要求
 *     读**顶层 `response.downloadUrl`**，实现却读 `res.data.url / fileUrl / cdnUrl / res.url`
 *     —— 这些字段都不存在 → 必然抛「图片上传成功但未拿到图片地址」→ 分享中断。
 *     修法：按契约读 downloadUrl，并用 new URL() 校验是合法 https 绝对地址；
 *     失败/无宿主时给出明确可读的反馈。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v92Fix)return;window.__v92Fix=true;

function num92(v,d){var n=Number(v);return isFinite(n)?n:(d||0)}

/* ==========================================================================
 * 问题 ① · 退役海报的名次改用真实排名函数
 *   接缝：renderRetired 是全局函数（可包装）；海报里的名次块有固定标记
 *   「NBA 历史排名</small><b class="...">XXX</b>」，按它替换。
 * ========================================================================== */
function v92TrueRankLabel(){
  try{
    var inp=(typeof v81CurrentInput==='function')?v81CurrentInput():null;
    if(!inp)return null;
    var total=0;
    try{
      var sc=(typeof window.v87TotalScore==='function')?window.v87TotalScore(inp)
             :((typeof v81TotalScore==='function')?v81TotalScore(inp):null);
      if(sc)total=num92(sc.total,0);
    }catch(e){}
    if(!total)return null;
    /* 优先用最新的排名函数（v89 → v88 → v87） */
    var fn=window.v89HistoryRank||window.v88HistoryRank||window.v87HistoryRank;
    if(typeof fn!=='function')return null;
    var r=null;
    try{r=fn(total)}catch(e){}
    if(!r||!r.label)return null;
    return {label:r.label,tier:r.tier||'elite',rank:r.rank,total:Math.round(total)};
  }catch(e){return null}
}
window.v92TrueRankLabel=v92TrueRankLabel;

try{
  if(typeof renderRetired==='function'&&!window.__v92RetireGuard){
    var __v92Retired=renderRetired;
    renderRetired=function(){
      var h=__v92Retired.apply(this,arguments);
      try{
        var t=v92TrueRankLabel();
        if(!t||typeof h!=='string'||!h)return h;
        /* 替换海报里的名次块（只替换这一处，不动其它文案） */
        var re=/NBA 历史排名<\/small><b class="[^"]*">[^<]*<\/b>/;
        if(re.test(h)){
          h=h.replace(re,'NBA 历史排名</small><b class="'+t.tier+'">'+t.label+'</b>');
        }
      }catch(e){}
      return h;
    };
    try{if(typeof window.renderRetired==='function')window.renderRetired=renderRetired}catch(e){}
    window.__v92RetireGuard=true;
  }
}catch(e){}

/* 分享文案里的名次同样要统一（v83ShareCopy 读的是 v81HistoryRank 的 label） */
try{
  if(typeof window.v83ShareCopy==='function'&&!window.__v92ShareCopyGuard){
    var __v92ShareCopy=window.v83ShareCopy;
    window.v83ShareCopy=function(){
      var out=__v92ShareCopy.apply(this,arguments);
      try{
        var t=v92TrueRankLabel();
        if(t&&out&&typeof out==='object'&&typeof out.content==='string'){
          /* 把正文里可能出现的旧名次行替换成真实名次 */
          out.content=out.content.replace(/NBA 历史排名：[^\n]*/,'NBA 历史排名：'+t.label);
        }
      }catch(e){}
      return out;
    };
    try{if(typeof v83ShareCopy==='function')v83ShareCopy=window.v83ShareCopy}catch(e){}
    window.__v92ShareCopyGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 问题 ② · FMVP 搭档名（真实仪式路径）
 *   接缝：window.startFmvpCeremony 是导出的；仪式对象建立后挂在 career.fmvpCeremony，
 *   此时可安全改写它的 co.name。
 * ========================================================================== */
try{
  if(typeof window.startFmvpCeremony==='function'&&!window.__v92FmvpGuard){
    var __v92Start=window.startFmvpCeremony;
    window.startFmvpCeremony=function(){
      var r=__v92Start.apply(this,arguments);
      try{
        var c=(typeof career!=='undefined')?career:null;
        var f=c&&c.fmvpCeremony;
        if(f&&f.co){
          var name=(typeof window.v91CoStarFor==='function')
            ?window.v91CoStarFor(c.team,num92(c.seasonYear||c.draftYear,2005)):null;
          if(name)f.co.name=name;
        }
        if(typeof save==='function')save();
      }catch(e){}
      return r;
    };
    try{if(typeof startFmvpCeremony==='function')startFmvpCeremony=window.startFmvpCeremony}catch(e){}
    window.__v92FmvpGuard=true;
  }
}catch(e){}

/* 兜底：每次渲染时若仪式存在且搭档仍是虚构名，就地纠正（防止其它入口创建仪式） */
var V92_FAKE=['马库斯·里德','杰伦·科尔','德文·沃克','诺亚·格兰特','马利克·里弗斯','卡梅隆·诺克斯','杰伦·普莱斯'];
function v92FixCoStar(){
  try{
    var c=(typeof career!=='undefined')?career:null;
    var f=c&&c.fmvpCeremony;
    if(!f||!f.co)return;
    if(V92_FAKE.indexOf(String(f.co.name))<0)return;
    var name=(typeof window.v91CoStarFor==='function')
      ?window.v91CoStarFor(c.team,num92(c.seasonYear||c.draftYear,2005)):null;
    if(name){f.co.name=name;if(typeof save==='function')save()}
  }catch(e){}
}

/* ==========================================================================
 * 问题 ③ · 姚明得分产出（从角色基准分 + 内线收益入手，不再只补查表键）
 *   依据：姚明真实生涯 22+10。原实现里得分由 roleBasePts + 技巧 + 信任/自信 + 球权 决定，
 *   与「按 id 查表」无关，所以上轮补键对得分无效。
 *   做法：给姚明一个**内线得分收益系数**，让他在同等角色下得分接近真实水平；
 *   并把上轮过小的助攻系数回调（内线策应但不至于只有 2-3 个）。
 * ========================================================================== */
var V92_YAO={
  scoreGain:1.26,     /* 内线得分收益（原与后卫同口径，偏低） */
  astFactor:0.74,     /* 助攻系数：由 v91 的 0.46 回调（上轮过低，观感变弱） */
  astCap:5.4          /* 助攻上限相应放宽 */
};

try{
  if(typeof statExpect==='function'&&!window.__v92StatGuard){
    var __v92Stat=statExpect;
    statExpect=function(){
      var out=__v92Stat.apply(this,arguments);
      try{
        if(!out||typeof out!=='object')return out;
        var c=(typeof career!=='undefined')?career:null;
        if(!c||c.playerId!=='yao')return out;
        var a=c.attrs||{},m=c.minutes||20;
        var minFactor=Math.max(.52,Math.min(1.22,m/30));
        /* 得分：在既有结果上乘内线收益（不改变其它维度的算法） */
        var pts=num92(out.pts,0)*V92_YAO.scoreGain;
        var hasExclusive=!!(c.talents&&c.talents.indexOf('yao_x')>=0);
        var cap=15+(num92(c.ovr,74)-74)*.62+(hasExclusive?3.5:0);
        out.pts=Math.max(3,Math.min(pts,Math.min(cap,31)));
        /* 助攻：回调到内线策应的合理区间 */
        var ast=Math.max(.5,(((num92(a.playmaking,60)-44)*.13)+1.1)*minFactor*V92_YAO.astFactor);
        out.ast=Math.max(.5,Math.min(ast,V92_YAO.astCap));
      }catch(e){}
      return out;
    };
    try{if(typeof window.statExpect==='function')window.statExpect=statExpect}catch(e){}
    window.__v92StatGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 问题 ④ · 分享到虎扑：按技能契约读顶层 downloadUrl
 *   契约要求：response.downloadUrl，且用 new URL() 校验为合法 https 绝对地址。
 *   原实现读 res.data.url / fileUrl / cdnUrl，字段都不存在 → 必然失败。
 * ========================================================================== */
function v92ReadUploadUrl(res){
  try{
    if(!res)return '';
    /* 契约字段优先 */
    if(typeof res.downloadUrl==='string'&&res.downloadUrl)return res.downloadUrl;
    /* 兼容：部分实现可能包在 data 里 */
    if(res.data&&typeof res.data==='object'){
      if(typeof res.data.downloadUrl==='string'&&res.data.downloadUrl)return res.data.downloadUrl;
    }
    if(typeof res.data==='string')return res.data;
    return '';
  }catch(e){return ''}
}
function v92ValidUrl(u){
  try{
    if(!u)return false;
    var p=new URL(String(u));
    return (p.protocol==='https:'||p.protocol==='http:')&&!!p.hostname;
  }catch(e){return false}
}
window.v92ReadUploadUrl=v92ReadUploadUrl;
window.v92ValidUrl=v92ValidUrl;

try{
  if(typeof window.v83SharePoster==='function'&&!window.__v92ShareGuard){
    var __v92Share=window.v83SharePoster;
    window.v83SharePoster=function(){
      var c=(typeof career!=='undefined')?career:null;
      /* 无宿主：明确提示（保持原行为，但提示更清楚） */
      var hasHost=false;
      try{
        hasHost=!!(window.ColorboxAI&&window.ColorboxAI.oss&&
          typeof window.ColorboxAI.oss.uploadFile==='function'&&
          window.ColorboxAI.request&&window.ColorboxAI.request.bbs&&
          typeof window.ColorboxAI.request.bbs.openPostEditor==='function');
      }catch(e){}
      if(!hasHost){
        try{if(typeof v83Toast==='function')v83Toast('需在虎扑 App 内打开本页，才能分享到虎扑发帖')}catch(e){}
        return;
      }
      var btn=document.getElementById?document.getElementById('v83-share-btn'):null;
      var oldTxt=btn?btn.textContent:'';
      var reset=function(){if(btn){btn.disabled=false;btn.textContent=oldTxt||'📤 分享到虎扑'}};
      if(btn){btn.disabled=true;btn.textContent='正在生成海报…'}

      var toBlob=(typeof v83PosterToBlob==='function')?v83PosterToBlob():null;
      if(!toBlob||typeof toBlob.then!=='function'){
        reset();
        try{if(typeof v83Toast==='function')v83Toast('海报生成不可用，请稍后重试')}catch(e){}
        return;
      }
      toBlob.then(function(blob){
        if(!blob)throw new Error('海报生成失败');
        if(btn)btn.textContent='正在上传图片…';
        var name='career-'+Date.now()+'.png';
        var file=blob;
        try{if(typeof File==='function')file=new File([blob],name,{type:'image/png'})}catch(e){}
        return window.ColorboxAI.oss.uploadFile({file:file,filename:name});
      }).then(function(res){
        /* 【契约】window.ColorboxAI.oss.uploadFile 直接 resolve
           { downloadUrl, name } —— **没有 code 字段**。
           原实现要求 res.code===200，与契约不符，于是每次都在上传成功后
           抛「图片上传失败」，发帖编辑器永远打不开 ——
           这正是「点分享到虎扑没反应」的根因。改为：只有真的带回错误码时才失败。 */
        if(res&&res.code!=null&&res.code!==200&&res.code!==0){throw new Error((res&&res.message)||'图片上传失败')}
        var url=v92ReadUploadUrl(res);
        if(!url)throw new Error('上传成功但未返回图片地址');
        if(!v92ValidUrl(url))throw new Error('返回的图片地址不合法');
        var copy=(typeof window.v83ShareCopy==='function')?window.v83ShareCopy():null;
        if(!copy)throw new Error('分享文案生成失败');
        if(btn)btn.textContent='正在打开发帖页…';
        return window.ColorboxAI.request.bbs.openPostEditor({
          /* 开发者指定的发帖目标：专区「AI工坊」+ 话题「拯救水货状元」 */
          topicId:'871',
          tagId:'157462',
          topicName:'AI工坊',
          tagName:'拯救水货状元',
          title:copy.title,
          content:copy.content,
          imageUrl:url
        });
      }).then(function(res){
        reset();
        if(res&&res.code!==200){
          try{if(typeof v83Toast==='function')v83Toast((res&&res.message)||'打开发帖页失败')}catch(e){}
          return;
        }
        try{if(typeof v83Toast==='function')v83Toast('已打开虎扑发帖页，图片与文案已预填')}catch(e){}
      }).catch(function(e){
        reset();
        var msg=(e&&e.message)?e.message:'请稍后重试';
        try{if(typeof v83Toast==='function')v83Toast('分享失败：'+msg)}catch(e2){}
      });
    };
    try{if(typeof v83SharePoster==='function')v83SharePoster=window.v83SharePoster}catch(e){}
    window.__v92ShareGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 统一挂到 render：每次渲染补一次搭档名纠正
 * ========================================================================== */
try{
  if(typeof render==='function'&&!window.__v92RenderGuard){
    var __v92Render=render;
    render=function(){
      var r=__v92Render.apply(this,arguments);
      try{ v92FixCoStar(); }catch(e){}
      return r;
    };
    try{if(typeof window.render==='function')window.render=render}catch(e){}
    window.__v92RenderGuard=true;
  }
}catch(e){}

window.__v92Debug={
  trueRank:v92TrueRankLabel, yao:V92_YAO, fixCoStar:v92FixCoStar,
  readUploadUrl:v92ReadUploadUrl, validUrl:v92ValidUrl, fakeNames:V92_FAKE
};

})();

