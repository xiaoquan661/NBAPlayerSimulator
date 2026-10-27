
/* ============================================================================
 * v96 · FMVP 评选界面「右边队友」先显示虚构名、动效结束后才变成真人
 *
 * 现象（实测）：夺冠后进 FMVP 投票界面，右侧「队内另一位最佳球员」先显示
 *   诺亚·格兰特（v218CoStarName 的兜底虚构名），动效播完才变成麦迪。
 *
 * 根因：window.startFmvpCeremony 内部是
 *     career.fmvpCeremony = {...v218FinalsAverages()}   ← 此刻是虚构名
 *     render()                                          ← 第一次上色，画的就是虚构名
 *   而 v92/v93 的补丁挂在 startFmvpCeremony 的**返回之后**，只能改数据、不重绘，
 *   于是「先假后真」。v91 想去覆盖 window.v218FinalsAverages，但
 *   startFmvpCeremony 的闭包引用的是 IIFE 内部的局部同名函数，覆盖无效。
 *
 * 正解：在 renderOverlay 的入口（任何一次渲染之前）先把搭档名改成真实中文名，
 *   这样仪式内部那次渲染拿到的就已经是正确名字，不存在「先假后真」。
 *   另外把英文名统一换成中文译名 —— 整页 UI 都是中文，英文名在界面里很突兀。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v96Fix)return;window.__v96Fix=true;

var V96_ZH={
  'Joe Johnson':'乔·约翰逊','Trae Young':'特雷·杨','Paul Pierce':'保罗·皮尔斯','Jayson Tatum':'杰森·塔图姆',
  'Deron Williams':'德隆·威廉姆斯','Kevin Durant':'凯文·杜兰特','Gerald Wallace':'杰拉德·华莱士','Kemba Walker':'肯巴·沃克',
  'Derrick Rose':'德里克·罗斯','Jimmy Butler':'吉米·巴特勒','Kyrie Irving':'凯里·欧文','LeBron James':'勒布朗·詹姆斯',
  'Dirk Nowitzki':'德克·诺维茨基','Luka Doncic':'卢卡·东契奇','Carmelo Anthony':'卡梅隆·安东尼','Nikola Jokic':'尼古拉·约基奇',
  'Chauncey Billups':'昌西·比卢普斯','Cade Cunningham':'凯德·坎宁安','Baron Davis':'拜伦·戴维斯','Stephen Curry':'斯蒂芬·库里',
  'Tracy McGrady':'特雷西·麦克格雷迪','James Harden':'詹姆斯·哈登','Jermaine ONeal':'杰梅因·奥尼尔','Paul George':'保罗·乔治',
  'Elton Brand':'埃尔顿·布兰德','Chris Paul':'克里斯·保罗','Kobe Bryant':'科比·布莱恩特','Marc Gasol':'马克·加索尔',
  'Ja Morant':'贾·莫兰特','Dwyane Wade':'德维恩·韦德','Michael Redd':'迈克尔·里德','Giannis Antetokounmpo':'扬尼斯·阿德托昆博',
  'Kevin Garnett':'凯文·加内特','Karl-Anthony Towns':'卡尔-安东尼·唐斯','Anthony Davis':'安东尼·戴维斯','Brandon Ingram':'布兰登·英格拉姆',
  'Jalen Brunson':'杰伦·布伦森','Russell Westbrook':'拉塞尔·威斯布鲁克','Dwight Howard':'德怀特·霍华德','Paolo Banchero':'保罗·班凯罗',
  'Andre Iguodala':'安德烈·伊戈达拉','Joel Embiid':'乔尔·恩比德','Steve Nash':'史蒂夫·纳什','Devin Booker':'德文·布克',
  'Brandon Roy':'布兰登·罗伊','Damian Lillard':'达米安·利拉德','Peja Stojakovic':'佩贾·斯托贾科维奇','DeAaron Fox':'达龙·福克斯',
  'Tim Duncan':'蒂姆·邓肯','Kawhi Leonard':'科怀·伦纳德','Kyle Lowry':'凯尔·洛瑞','Pascal Siakam':'帕斯卡尔·西亚卡姆',
  'Donovan Mitchell':'多诺万·米切尔','Gilbert Arenas':'吉尔伯特·阿里纳斯','Bradley Beal':'布拉德利·比尔'
};

function v96ChineseName(en){
  try{
    if(!en)return '';
    if(V96_ZH[en])return V96_ZH[en];
    var s=String(en).replace(/[·\s]/g,'');
    for(var k in V96_ZH){if(!V96_ZH.hasOwnProperty(k))continue;if(String(k).replace(/[·\s]/g,'')===s)return V96_ZH[k]}
    return '';
  }catch(e){return ''}
}
window.v96ChineseName=v96ChineseName;

/* 当前该用哪个搭档名：优先「当赛季该队真实二当家」（联盟名单会变老/退役），
   找不到联盟数据才回退静态表 + 中文译名。 */
function v96CoStarName(){
  try{
    var c=(typeof career!=='undefined')?career:null;
    if(!c)return '';
    var meZh='';
    try{meZh=(typeof currentP==='function'&&currentP())?currentP().zh:''}catch(e){}
    if(typeof window.v91LeagueMate==='function'){
      var m=window.v91LeagueMate(c.team,meZh);
      if(m&&m.name)return String(m.name);
    }
    var en=(typeof window.v91CoStarFor==='function')?window.v91CoStarFor(c.team,Number(c.seasonYear||c.draftYear)||2005):null;
    return v96ChineseName(en)||String(en||'');
  }catch(e){return ''}
}
window.v96CoStarName=v96CoStarName;

/* 把「当前仪式搭档名」修正为当赛季该队的真实二当家。幂等，可反复调用。 */
function v96FixCostar(){
  try{
    var c=(typeof career!=='undefined')?career:null;
    var f=c&&c.fmvpCeremony;
    if(!f||!f.co)return false;
    var want=v96CoStarName();
    if(want&&f.co.name!==want){f.co.name=want;return true}
  }catch(e){}
  return false;
}
window.v96FixCostar=v96FixCostar;

/* 关键接缝：renderOverlay 的入口。仪式浮层就是由它产出的，
   在它跑之前把名字改好，第一次上色即正确。 */
try{
  if(typeof renderOverlay==='function'&&!window.__v96OverlayGuard){
    var __v96Overlay=renderOverlay;
    renderOverlay=function(){
      try{v96FixCostar()}catch(e){}
      return __v96Overlay.apply(this,arguments);
    };
    try{if(typeof window.renderOverlay==='function')window.renderOverlay=renderOverlay}catch(e){}
    window.__v96OverlayGuard=true;
  }
}catch(e){}

/* 兜底：每次整页渲染前再修一次（覆盖任何绕过 renderOverlay 的入口，
   例如 v93 在 startFmvpCeremony 返回后写入英文名，下一次渲染即被汉化）。 */
try{
  if(typeof render==='function'&&!window.__v96RenderGuard){
    var __v96Render=render;
    render=function(){
      try{v96FixCostar()}catch(e){}
      var r=__v96Render.apply(this,arguments);
      /* 渲染之后再修一次：v93 的补丁挂在 startFmvpCeremony 返回后，
         会把名字写回英文，这里让中文名最终生效。 */
      try{v96FixCostar()}catch(e){}
      return r;
    };
    try{if(typeof window.render==='function')window.render=render}catch(e){}
    window.__v96RenderGuard=true;
  }
}catch(e){}

window.__v96Debug={fix:v96FixCostar,zh:v96ChineseName};

/* ==========================================================================
 * 选人页 OVR 与进游戏后的 OVR 对不上（席梦思：卡片 83 → 进去后 89）
 *
 * 实测（同一份属性，两条链）：
 *   选人卡：P[].ovr，由 v221CalcOvr(p.attrs) 得来 → 席梦思 83
 *   进游戏：createCareer 结束那一刻 career.ovr = 78，
 *          但并不等于 v221CalcOvr(career.attrs)（=83）；
 *          只要玩家动一点属性（训练营加点）就会跳回正确值 → 表现为「进去就变了」。
 *   另外 P[].ovr 是各层补丁之前算的，姚明等被后续层改过属性却没跟着重算。
 *
 * 修法：两边统一到「按当前属性推导」的唯一口径 v221CalcOvr ——
 *   ① 建号结束后强制对齐一次（含 v221 的「首季角色上限」，避免出现 83 却显示低角色）；
 *   ② 启动时把 P[].ovr 按当前属性重算，保证卡片数字就是你会拿到的数字（未看广告时）。
 * ========================================================================== */
function v96CalcOvrOf(attrs){
  try{return (typeof window.v221CalcOvr==='function')?window.v221CalcOvr(attrs):null}catch(e){return null}
}
function v96RoleCapFor(id,role){
  try{
    var cap={bennett:'轮换球员',oden:'稳定首发',kwame:'轮换球员',fultz:'稳定首发',simmons:'球队核心'}[id];
    var order=['边缘球员','轮换球员','稳定首发','球队核心','全明星核心','超级巨星','联盟门面'];
    if(cap&&order.indexOf(role)>order.indexOf(cap))return cap;
  }catch(e){}
  return role;
}
function v96AlignOvr(){
  try{
    if(typeof career==='undefined'||!career||!career.attrs)return;
    var want=v96CalcOvrOf(career.attrs);
    if(want==null||career.ovr===want)return;
    career.ovr=want;
    if(typeof roleByOvr==='function'){
      var r=roleByOvr(want);
      if(Number(career.seasonNo)===1)r=v96RoleCapFor(career.playerId,r);
      career.role=r;
    }
  }catch(e){}
}
window.v96AlignOvr=v96AlignOvr;
/* 新秀起始上限：与 v43Apply 的 v43CapOvr / V43_CAP 同口径（85）。
   为什么必须在这里重跑：v43CapOvr 的循环条件是「career.ovr > 85」，
   而它读到的正是那个偏低的旧值（席梦思 82），于是判定「不用压」→ 属性没降、
   真实推导值其实到 87。把 ovr 对齐到推导值之后必须补跑一次上限，
   否则专属天赋会把新秀开局顶到 85 以上，破坏既有平衡。 */
var V96_START_CAP=85;
function v96ApplyStartCap(){
  try{
    if(typeof career==='undefined'||!career||!career.attrs)return;
    var guard=0;
    while((Number(career.ovr)||0)>V96_START_CAP&&guard++<200){
      var best=null,bestV=-1;
      ['finishing','shooting','playmaking','defense','rebounding','athleticism','durability','mentality'].forEach(function(k){
        var v=career.attrs[k];
        if(v>60&&v>bestV){best=k;bestV=v}
      });
      if(!best)break;
      career.attrs[best]=Math.max(30,career.attrs[best]-1);
      var nv=v96CalcOvrOf(career.attrs);
      if(nv==null)break;
      career.ovr=nv;
    }
    if(typeof roleByOvr==='function')career.role=v96RoleCapFor(career.playerId,roleByOvr(career.ovr));
  }catch(e){}
}
window.v96ApplyStartCap=v96ApplyStartCap;
function v96SyncPlayerOvr(){
  try{
    /* kwame/fultz 在建号时会被「真实短板补齐到 72」（v43Apply 的 V43_FILL/V43_FLOOR）
       抬过属性，卡片如果只看原始属性就会比实际低 6 分。这里用同一口径把选人页
       的属性先补齐，卡片数字才等于你真正会拿到的数字。
       常量与 v43Apply 保持一致（V43_FLOOR=72、V43_FLOOR_MENTALITY.kwame=68）。 */
    var FILL={fultz:['shooting'],kwame:['finishing','shooting','playmaking','defense']};
    var MENT={kwame:68};
    ['bennett','oden','kwame','fultz','simmons','yao'].forEach(function(id){
      var o=(typeof playerBy==='function')?playerBy(id):null;
      if(!o||!o.attrs)return;
      (FILL[id]||[]).forEach(function(k){
        if(o.attrs[k]!=null&&o.attrs[k]<72)o.attrs[k]=72;
      });
      if(MENT[id]!=null&&o.attrs.mentality!=null&&o.attrs.mentality<MENT[id])o.attrs.mentality=MENT[id];
      var v=v96CalcOvrOf(o.attrs);
      if(v!=null)o.ovr=v;
    });
  }catch(e){}
}
window.v96SyncPlayerOvr=v96SyncPlayerOvr;
v96SyncPlayerOvr();
try{
  if(typeof createCareer==='function'&&!window.__v96CreateGuard){
    var __v96Create=createCareer;
    createCareer=function(){
      var r=__v96Create.apply(this,arguments);
      try{
        v96AlignOvr();
        if(Number(career&&career.seasonNo)===1)v96ApplyStartCap();
        v96AlignOvr();
        v96SyncPlayerOvr();
        if(typeof save==='function')save();
      }catch(e){}
      return r;
    };
    try{if(typeof window.createCareer==='function')window.createCareer=createCareer}catch(e){}
    window.__v96CreateGuard=true;
  }
}catch(e){}
/* 读档时对齐一次：老存档里存的正是那个偏低的值（且只在「还没开始打」时补跑上限） */
try{
  if(typeof load==='function'&&!window.__v96LoadGuard){
    var __v96Load=load;
    load=function(){
      var x=__v96Load.apply(this,arguments);
      try{
        v96AlignOvr();
        if(career&&Number(career.seasonNo)===1&&!(Number(career.games)||0))v96ApplyStartCap();
        v96SyncPlayerOvr();
      }catch(e){}
      return x;
    };
    try{if(typeof window.load==='function')window.load=load}catch(e){}
    window.__v96LoadGuard=true;
  }
}catch(e){}

})();

/* ==========================================================================
 * 白屏兜底（「玩了几个赛季突然白屏」）
 *
 * 现状：v91 注册的 window error 监听里每次报错都会调一次 render()。
 *   如果错误本身**就是 render 抛的**（存档里某个字段结构异常、某层取到
 *   undefined 再往下算…），就会「报错 → render → 报错」原地循环，
 *   整屏既不更新也不恢复，表现就是**卡住的白屏**。
 *   另外 save() 在存储写满/隐私模式下会抛 QuotaExceededError，
 *   一路炸到渲染链里，同样白屏。
 *
 * 这一层只做两件事，不改任何玩法数值：
 *   1) save 永不抛错（写不进去就静默降级，游戏照常玩）；
 *   2) render 出错先自动清掉可疑的浮层状态重试一次；连续失败就停止自动重绘，
 *      并画一个「可点回到封面」的恢复面板 —— 任何情况下都不是空白页。
 * ========================================================================== */
(function(){
'use strict';
if(window.__v97Fix)return;window.__v97Fix=true;

try{
  if(typeof save==='function'&&!window.__v97SaveGuard){
    var __v97Save=save;
    save=function(){
      try{return __v97Save.apply(this,arguments)}
      catch(e){
        window.__v97SaveErr=String(e&&e.message||e);
        try{ if(!window.__v97SaveWarned){window.__v97SaveWarned=1;console.warn('[v97] 存档写入失败（已降级继续）：',e&&e.message)} }catch(e2){}
      }
    };
    try{if(typeof window.save==='function')window.save=save}catch(e){}
    window.__v97SaveGuard=true;
  }
}catch(e){}

var fails=0, stopped=false;
window.v97GoHome=function(){
  try{
    if(typeof ui!=='undefined'&&ui){ui.storyEvent=null;ui.modal=null;ui.screen='home'}
    if(typeof window.v97Reset==='function')window.v97Reset();
    if(typeof render==='function')render();
  }catch(e){}
};
function v97Panel(msg){
  try{
    var app=document.getElementById('app');
    if(!app)return;
    app.innerHTML='<section class="pre"><div class="pre-intro"><small>RECOVERY</small><h2>这一屏没能渲染出来</h2>'
      +'<p>你的存档没有被改动。点下面按钮回到封面，再重新进入存档即可继续。</p></div>'
      +'<div class="sticky-cta"><button class="btn primary" onclick="v97GoHome()">回到封面</button></div>'
      +'<div style="padding:0 16px 24px;font-size:8.5px;color:#a08a76;word-break:break-all">'+String(msg||'').slice(0,300)+'</div></section>';
  }catch(e){}
}
window.v97Reset=function(){fails=0;stopped=false;window.__v97PanelShown=false};
try{
  if(typeof render==='function'&&!window.__v97RenderGuard){
    var __v97Render=render;
    render=function(){
      if(stopped)return;
      try{
        var r=__v97Render.apply(this,arguments);
        fails=0;
        return r;
      }catch(e){
        fails++;
        try{window.__v91Errors&&window.__v91Errors.push('v97 render#'+fails+': '+(e&&e.message))}catch(e2){}
        if(fails<2){
          /* 一次重试：先清掉最可能让渲染崩掉的临时浮层状态 */
          try{if(typeof ui!=='undefined'&&ui){ui.storyEvent=null;ui.modal=null}}catch(e3){}
          try{ var r2=__v97Render.apply(this,arguments); fails=0; return r2 }catch(e4){ fails++ }
        }
        stopped=true;
        window.__v97LastCrash={msg:String(e&&e.message||e),stack:String(e&&e.stack||'').split('\n').slice(0,4).join(' | ')};
        if(!window.__v97PanelShown){window.__v97PanelShown=true;try{v97Panel(e&&e.message)}catch(e5){}}
      }
    };
    try{if(typeof window.render==='function')window.render=render}catch(e){}
    window.__v97RenderGuard=true;
  }
}catch(e){}

window.__v97Debug={reset:window.v97Reset,fails:function(){return fails},stopped:function(){return stopped},
  saveErr:function(){return window.__v97SaveErr||null},lastCrash:function(){return window.__v97LastCrash||null}};

})();

