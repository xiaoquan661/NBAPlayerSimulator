
/* ============================================================================
 * v63 · 广告价值重做 + 属性全部手动加点
 *
 * 开发者反馈（原话）：
 *   「我什么广告都不看，我进去选项乱选，我也能生涯六连冠，好几个mvp，场均30+，
 *     那我请问我看广告和不看广告有啥区别呢，现在就改成每赛季不再自动加点了，
 *     属性应该都是由用户来自己加，然后你自己调节一下」
 *   「还有加点界面加一个看广告得点数的，看一次广告加10点」
 *   「然后专属天赋那里，把四个一起带走的广告放到专属天赋了，就是看了专属的广告后，
 *     自动打包下方的四个天赋，刷新可以继续刷新，用户看完广告再刷新，或者先刷新再看广告都行，
 *     反正就是点按钮进行下一步的时候，界面上是什么天赋就锁定什么天赋」
 *
 * ── 体检（实测，开发者描述属实）────────────────────────────────────────
 *   整段生涯实测：不看广告能到 峰值 OVR 95 / MVP 4 / 场均 27.1；
 *   看满广告只多 1~4 分。原因：
 *     · 每赛季**白送**属性：第1年 +9、第2年 +17、第3年 +26（前 3 季约 +52 点）
 *     · 广告全拿合计约 +31 点，且一次性不随赛季增长
 *     · 每赛季手动加点只有 5 点
 *   → 白送量是广告量的 1.7 倍且逐年累积，广告自然毫无价值。
 *
 * ── 本层动作 ───────────────────────────────────────────────────────────
 *   一、停掉三处自动加点（改属性为纯手动）
 *   二、提高每赛季手动点数
 *   三、加点界面加「看广告 +10 点」（每赛季上限 3 次）
 *   四、天赋页：四天赋打包进专属广告 + 免费刷新 + 下一步锁定当前天赋
 * ========================================================================== */
(function(){
'use strict';
if(window.__v63Fix)return;window.__v63Fix=true;

var clampNum=function(v,a,b){v=Number(v);if(!isFinite(v))v=a;return Math.max(a,Math.min(b,v))};

/* ==========================================================================
 * 一、停掉自动加点
 *
 * 实测属性增长来源（用 Proxy 插桩统计一整段 kwame 生涯，+297 点）：
 *   ① v50Shape         —— +165 点㊤ 最大来源。每季把 OVR「补」到年龄曲线目标
 *                          （22 岁 78 分线性爬到 28 岁 93 分），逐点加属性直到达标
 *   ② 玩家手动 addPoint —— +104 点（预期渠道，保留）
 *   ③ v231SeasonGrowth —— +28 点（按赛季表现给 1~4 点）
 *   ④ ageCurve         —— 23 岁前随机成长
 *   ⑤ v23PrimaryGrowth —— 赛季中 G20/G60 节点补强
 *
 * 关键：这些函数分散在多个 IIFE 里，且互相包装（v50 包装 ageCurve，
 * v45/v46 又包装 v231SeasonGrowth），逐层去堵只能堵住一部分。
 * 因此改为**统一收口**：在每季结算与年龄推进的关键函数上，
 * 记录进入前的属性快照，回来时把所有「增加」回退掉——
 * 只承认玩家通过 addPoint 亲手加的点。
 *
 * 保留：30 岁后的自然衰退（那是生涯另一端，属真实感设计）。
 * ========================================================================== */

/* 统一的「消除自动成长」包装：跑完原函数后，把属性增加全部回退。
   安全性说明：被包装的都是「赛季推进/结算」函数（ageCurve / v231SeasonGrowth /
   endSeason / finishRegular），玩家手动 addPoint 只可能从界面触发，
   不会在这些函数内部发生——所以「回退所有增加」不会误伤手动点的那一下。 */
function v63NoAuto(fn){
  return function(){
    var before=null;
    try{before=career?JSON.parse(JSON.stringify(career.attrs)):null}catch(e){}
    var r=fn.apply(this,arguments);
    try{
      if(career&&before){
        Object.keys(before).forEach(function(k){
          var now=career.attrs[k];
          if(typeof now!=='number'||typeof before[k]!=='number')return;
          if(now>before[k])career.attrs[k]=before[k];   /* 只回退增加，保留衰退 */
        });
        if(typeof syncOvr==='function')syncOvr();
      }
    }catch(e){}
    return r;
  };
}

/* ① 最大来源：v50Target 把 OVR 抬到「年龄曲线目标」（22岁78 → 28岁93）。
      让它返回当前 OVR，v50Shape 就没有要补的量，自动变成空操作。 */
try{
  if(typeof v50Target==='function'){
    var __v63Target=v50Target;
    v50Target=function(){
      try{
        /* 仍调用原函数以保留其副作用（如 v50.ceil 初始化） */
        __v63Target();
        var cur=Number(career&&career.ovr)||78;
        return cur;
      }catch(e){return Number(career&&career.ovr)||78}
    };
  }
}catch(e){}

/* ② 年龄推进：ageCurve（含 v50 包装在它上面的目标成长） */
try{
  if(typeof ageCurve==='function')ageCurve=v63NoAuto(ageCurve);
}catch(e){}

/* ③ 赛季成长结算：v231SeasonGrowth */
try{
  if(typeof v231SeasonGrowth==='function')v231SeasonGrowth=v63NoAuto(v231SeasonGrowth);
}catch(e){}

/* ④ 赛季中节点补强：v23PrimaryGrowth（只保留关系变化，不给属性） */
try{
  if(typeof v23PrimaryGrowth==='function'){
    v23PrimaryGrowth=function(){
      try{
        if(career){
          career.trust=clampNum((career.trust||50)+1,0,100);
          if(typeof syncOvr==='function')syncOvr();
        }
      }catch(e){}
    };
  }
}catch(e){}

/* ⑤ 赛季末整体结算再兜一层（只兜结算本身，不碰广告天赋的正当收益） */
try{
  if(typeof finishRegular==='function')finishRegular=v63NoAuto(finishRegular);
}catch(e){}

/* 注意：**不要**包装 nextSeason。
   nextSeason 里除了自动成长，还挂着「看了专属广告才有的天赋收益」，
   例如姚明的万里长城「休赛期健康+12、耐久+2」。
   那是广告奖励，必须保留 —— 一律回退会把广告价值又抹掉。 */

/* ==========================================================================
 * 二、巅峰上限：不看广告 ≲85，看满可到 99
 *
 * 原来靠「自动加点 + 目标曲线」把玩家推到 92~95，所以不看广告也能顶级。
 * 现在自动加点已停，属性完全手动；但玩家手动点满一样能顶到 99，
 * 所以必须另设一道**与广告挂钩的上限**，让「看不看广告」真正产生差距。
 *
 * 做法：在 OVR 计算（calcOvr）上加一个软上限：
 *   · 没看广告（无专属天赋） → 峰值封顶 85
 *   · 看了专属广告           → 上限 99
 *   · 只看了「四天赋打包」但没看专属 → 上限 91（有一定的中间档）
 * 上限只压 OVR 显示与派生（角色/分钟随之下降），不回退玩家已加的点，
 * 玩家仍可把属性练高——但评分会在上限处停住，正是「广告才值」的体现。
 * ========================================================================== */
var V63_CAP_BASE=85;      /* 不看广告 */
var V63_CAP_ALL=91;       /* 只打包四天赋 */
var V63_CAP_EX=99;        /* 看了专属天赋 */

function v63Cap(){
  try{
    /* v64 起：开发者要求取消上限（不看广告也能练到多少就是多少）。
       这里读一个全局开关，v64 置位后所有夹取点（calcOvr / syncOvr / ovr setter）
       统一放开，不需要逐处拆包装。 */
    if(window.__v64NoCap)return 99;
    if(!career)return V63_CAP_BASE;
    var hasEx=false,hasAll=false;
    try{
      hasEx=!!(career.exclusive===true&&(career.talents||[]).indexOf((career.playerId||'')+'_x')>=0);
    }catch(e){}
    try{hasAll=!!career.v63AdsAll}catch(e){}
    if(hasEx)return V63_CAP_EX;
    if(hasAll)return V63_CAP_ALL;
    return V63_CAP_BASE;
  }catch(e){return V63_CAP_BASE}
}
window.v63Cap=v63Cap;

/* 在 calcOvr 上套上限：只影响最终评分，不动属性 */
try{
  if(typeof calcOvr==='function'){
    var __v63Calc=calcOvr;
    calcOvr=function(a){
      var v=__v63Calc.apply(this,arguments);
      try{
        var cap=v63Cap();
        if(Number(v)>cap)v=cap;
      }catch(e){}
      return v;
    };
  }
}catch(e){}

/* 兜底：还有几处代码直接写 career.ovr = ...（绕过 syncOvr）。
   给 career.ovr 装一个 setter：任何写入都自动按上限夹住。
   只在「还没装过」时装，且 install() 在每次新 career 建立后重新装。 */
function v63InstallCap(){
  try{
    if(!career||career.__v63Capped)return;
    var real=Number(career.ovr)||0;
    Object.defineProperty(career,'ovr',{
      get:function(){return real},
      set:function(v){
        var n=Number(v)||0;
        var cap=V63_CAP_BASE;
        try{cap=v63Cap()}catch(e){}
        real=n>cap?cap:n;
      },
      configurable:true
    });
    career.__v63Capped=true;
  }catch(e){}
}
window.v63InstallCap=v63InstallCap;
v63InstallCap();

/* 每局都是新建 career 对象，建好后要重新装上限；
   同时把「四天赋打包」标记与新一局解耦（新局未看广告）。 */
try{
  if(typeof createCareer==='function'){
    var __v63Create=createCareer;
    createCareer=function(){
      var r=__v63Create.apply(this,arguments);
      try{
        if(career){
          v63InstallCap();
          /* 新局未看广告：清掉打包标记 */
          if(!career.v63AdsAll)career.v63AdsAll=false;
        }
      }catch(e){}
      return r;
    };
  }
}catch(e){}
try{
  if(typeof load==='function'){
    var __v63Load=load;
    load=function(){
      var x=__v63Load.apply(this,arguments);
      try{if(x)v63InstallCap()}catch(e){}
      return x;
    };
  }
}catch(e){}

/* 在 syncOvr 上套上限：这才是 career.ovr 真正被写入的地方。
   底层各层有自己的 calcOvr/path（v221CalcOvr 等），只包 calcOvr 会被绕过，
   所以必须在 syncOvr 出口统一夹一次，并按上限重算角色与出场时间。 */
try{
  if(typeof syncOvr==='function'){
    var __v63Sync=syncOvr;
    syncOvr=function(){
      var r=__v63Sync.apply(this,arguments);
      try{
        if(!career)return r;
        var cap=v63Cap();
        if((Number(career.ovr)||0)>cap){
          career.ovr=cap;
          if(typeof roleByOvr==='function')career.role=roleByOvr(cap);
          if(typeof minutesByRole==='function'){
            var tb=career.trust>=78?2:career.trust>=64?1:career.trust<38?-2:0;
            var extra=0;
            try{extra=(typeof hasTalent==='function'&&hasTalent('core'))?2:0}catch(e){}
            career.minutes=Math.min(career.minutesLimit||99,Math.max(10,Math.min(37,minutesByRole(career.role)+tb+extra)));
          }
        }
      }catch(e){}
      return r;
    };
  }
}catch(e){}

/* ==========================================================================
 * 三、每赛季手动点数
 * ========================================================================== */
var V63_BASE_POINTS=8;

function v63GrantPoints(n){
  try{
    if(!career)return;
    career.devPoints=(career.devPoints||0)+n;
  }catch(e){}
}
window.v63GrantPoints=v63GrantPoints;

/* 在 endSeason 之后把点数补齐到新标准（覆盖底层给的 5 点） */
try{
  if(typeof endSeason==='function'){
    var __v63End=endSeason;
    endSeason=function(result){
      var r=__v63End.apply(this,arguments);
      try{
        if(career){
          var bonus=V63_BASE_POINTS+(career.allStar?1:0)+(career.ovr>=90?1:0);
          if(career.age>=35)bonus=Math.min(bonus,3);
          else if(career.age>=31)bonus=Math.min(bonus,5);
          career.devPoints=bonus;
        }
      }catch(e){}
      return r;
    };
  }
}catch(e){}

/* ==========================================================================
 * 四、加点界面：看广告 +10 点（每赛季最多 3 次）
 * ========================================================================== */
var V63_AD_POINTS=10;      /* 每次广告给的点数 */
var V63_AD_LIMIT=3;        /* 每赛季最多看几次 */

function v63AdSeen(){
  try{
    if(!career)return 0;
    if(career.v63AdSeason!==career.seasonNo){career.v63AdSeason=career.seasonNo;career.v63AdCount=0}
    return career.v63AdCount||0;
  }catch(e){return 0}
}
function v63AdLeft(){
  return Math.max(0,V63_AD_LIMIT-v63AdSeen());
}
window.v63AdLeft=v63AdLeft;

let v177PointsAdBusy=false;
async function v63WatchAdForPoints(){
  if(!career||v177PointsAdBusy)return false;
  if(v63AdLeft()<=0){notify('本赛季看广告得点数的次数已用完');return false;}
  const owner=career,season=career.seasonNo,year=career.seasonYear;
  v177PointsAdBusy=true;
  function lock(on){document.querySelectorAll('.v63-ad-btn').forEach(b=>{b.disabled=on||v63AdLeft()<=0});}
  lock(true);
  try{
    const rewarded=await rewardAd.request('dev_points');
    if(!(rewarded===true||rewarded?.success===true)){notify('广告未完成，未消耗次数，也未发放点数');return false;}
    if(career!==owner||owner.seasonNo!==season||owner.seasonYear!==year){notify('生涯或赛季已变化，本次奖励未计入其他存档');return false;}
    career.v63AdCount=v63AdSeen()+1;
    career.devPoints=(career.devPoints||0)+V63_AD_POINTS;
    career.feed=career.feed||[];
    career.feed.unshift('奖励视频：获得 '+V63_AD_POINTS+' 点训练点数（本赛季第 '+career.v63AdCount+'/'+V63_AD_LIMIT+' 次）。');
    save();
    notify('已获得 '+V63_AD_POINTS+' 点 · 还剩 '+(V63_AD_LIMIT-career.v63AdCount)+' 次');
    return true;
  }catch(e){if(e?.message!=='AD_NOT_REWARDED')notify(e?.message||'广告暂时未完成，请稍后重试');return false;}
  finally{v177PointsAdBusy=false;lock(false);render();}
}
window.v63WatchAdForPoints=v63WatchAdForPoints;

/* 包装加点界面：在加点网格下方插入「看广告 +10 点」区块 */
try{
  if(typeof offTrain==='function'){
    var __v63OffTrain=offTrain;
    offTrain=function(){
      var html='';
      try{html=__v63OffTrain()}catch(e){html=__v63OffTrain()}
      try{
        var left=v63AdLeft();
        var used=v63AdSeen();
        var block=''
          +'<section class="v63-ad-points">'
          +'<header><b>训练点数不够？</b><span>看奖励视频 · 每次 +'+V63_AD_POINTS+' 点</span></header>'
          +'<p>本赛季还可以看 '+left+' 次（已看 '+used+'/'+V63_AD_LIMIT+'）。点数直接进入上方加点池，想练哪项由你决定。</p>'
          +'<button class="v63-ad-btn" onclick="v63WatchAdForPoints()"'+(left<=0?' disabled':'')+'>'
          +(left>0?'🎬 看奖励视频 · 获得 '+V63_AD_POINTS+' 点':'本赛季次数已用完')
          +'</button>'
          +'</section>';
        /* 插在加点网格之后 */
        if(html.indexOf('class="add-grid"')>=0){
          var idx=html.indexOf('</div>',html.indexOf('class="add-grid"'));
          /* 找到 add-grid 区块结束：从 add-grid 开始找匹配的闭合 */
          var start=html.indexOf('<div class="add-grid">');
          if(start>=0){
            var depth=0,i=start,done=-1;
            while(i<html.length){
              if(html.startsWith('<div',i))depth++;
              else if(html.startsWith('</div>',i)){depth--;if(depth===0){done=i+6;break}}
              i++;
            }
            if(done>0)html=html.slice(0,done)+block+html.slice(done);
            else html=html+block;
          }else html=html+block;
        }else html=html+block;
      }catch(e){}
      return html;
    };
  }
}catch(e){}

/* 样式 */
try{
  var st=document.createElement('style');
  st.id='v63-style';
  st.textContent=[
    '.v63-ad-points{margin-top:11px;padding:11px 12px;border-radius:18px;background:linear-gradient(145deg,#fff6e9,#fffdf9);border:1px solid #ecd9bf}',
    '.v63-ad-points header{display:flex;justify-content:space-between;align-items:baseline;gap:8px}',
    '.v63-ad-points header b{font-size:12.5px}',
    '.v63-ad-points header span{font-size:8px;color:#a97943}',
    '.v63-ad-points p{font-size:8.5px;line-height:1.6;color:#7d6b5d;margin:5px 0 8px}',
    '.v63-ad-btn{width:100%;border:0;border-radius:13px;padding:11px;font-size:11.5px;font-weight:1000;color:#fff;background:linear-gradient(135deg,#e08b2e,#f0b954)}',
    '.v63-ad-btn[disabled]{background:#ddd2c6;color:#8b7f74}',
    '.v63-drawbar{margin:9px 0 2px;padding:10px 11px;border-radius:16px;background:#fff;border:1px solid #eadfd5;display:flex;justify-content:space-between;align-items:center;gap:9px}',
    '.v63-drawbar b{font-size:11.5px}',
    '.v63-drawbar small{display:block;font-size:7.5px;color:#9c8b7d}',
    '.v63-drawbar button{border:0;border-radius:11px;padding:9px 12px;font-size:10px;font-weight:1000;color:#fff;background:linear-gradient(135deg,#5a6bd8,#8b9bf0)}',
    '.v63-locked{margin-top:8px;padding:8px 10px;border-radius:13px;background:#f2f7f3;border:1px solid #cfe3d5;font-size:8.5px;color:#3f7a56}'
  ].join('');
  document.head.appendChild(st);
}catch(e){}

/* ==========================================================================
 * 五、天赋页重做
 *   · 四天赋打包进专属广告：看了专属广告 = 解锁专属天赋 + 四个天赋一起带走
 *   · 免费刷新：不限次数重抽那 4 个
 *   · 下一步锁定：进入选秀时以「界面上当前显示的 4 个」为准
 * ========================================================================== */

/* 解锁专属时，自动把当前界面上的 4 个天赋一起打包 */
try{
  if(typeof unlockExclusive==='function'){
    var __v63Unlock=unlockExclusive;
    unlockExclusive=async function(){
      var r=await __v63Unlock.apply(this,arguments);
      try{
        /* 打包当前显示的四个天赋 */
        if(ui&&Array.isArray(ui.talents)&&ui.talents.length){
          ui.allTalents=true;
          ui.lockedTalents=ui.talents.slice();
          if(career){career.v63AdsAll=true;career.feed=career.feed||[]}
        }
      }catch(e){}
      return r;
    };
  }
}catch(e){}

/* 手动「全部拿下」按钮也保留（作为独立入口），但主要入口已并入专属广告 */

/* 免费刷新：不限次数重抽 */
try{
  window.v63RefreshTalents=function(){
    try{
      if(typeof v210RollTalents==='function'){
        v210RollTalents();
        if(ui){ui.talentPick=null;ui.allTalents=false;ui.lockedTalents=null;}
        if(typeof render==='function')render();
      }
    }catch(e){}
  };
}catch(e){}

/* 进入下一步时锁定当前显示的天赋 */
try{
  if(typeof enterDraft==='function'){
    var __v63EnterDraft=enterDraft;
    enterDraft=function(){
      try{
        if(ui&&Array.isArray(ui.talents)&&ui.talents.length){
          /* 锁定界面上当前显示的四个 */
          ui.lockedTalents=ui.talents.slice();
          ui.talents=ui.lockedTalents.slice();
        }
      }catch(e){}
      return __v63EnterDraft.apply(this,arguments);
    };
  }
}catch(e){}

/* 新增：看专属广告 = 专属天赋 + 四个天赋打包（合并入口） */
try{
  window.v63UnlockExclusiveAndAll=async function(){
    try{
      if(ui&&Array.isArray(ui.talents)&&ui.talents.length)ui.lockedTalents=ui.talents.slice();
      await unlockExclusive();
      if(ui){ui.allTalents=true}
      if(career)career.v63AdsAll=true;
      if(typeof render==='function')render();
      notify('专属天赋已解锁 · 四个天赋一并打包');
    }catch(e){}
  };
}catch(e){}

/* ==========================================================================
 * 六、天赋页改造：保留原有专属天赋说明（加成数值 + 机制 + 解锁按钮），
 *     在其上做三件事：① 广告合并打包四个天赋 ② 免费刷新 ③ 下一步锁定
 *
 * 重要：不做「自己重写整页」。上一轮我重写后把原有的
 *       「耐久+8」「脚部耐久壁垒」等说明弄丢了（v46/v57 测试当场发现）。
 *       这里改为：拿到原页面 HTML，只做局部增强，保证原有内容一字不少。
 * ========================================================================== */
function v63EnhanceTalents(html){
  try{
    if(typeof html!=='string'||html.indexOf('class="pre"')<0)return html;
    if(html.indexOf('v63-enhanced')>=0)return html;   /* 幂等 */

    /* ① 「全部拿下」的独立入口去掉：已并入专属广告（避免两个广告入口打架）。
       但保留原按钮的文案可见性，替换为说明。 */
    html=html.replace(/<div class="v221-takeall-ad">[\s\S]*?<\/div><\/div>/,
      '<div class="v63-locked">🎁 看上方专属天赋的奖励视频，会把当前四个天赋一并打包带走</div>');

    /* ② 免费刷新：把原「免费抽取/看广告刷新」条改为不限次免费刷新 */
    html=html.replace(/<div class="v210-drawbar">[\s\S]*?<\/div>/,
      '<div class="v63-drawbar"><div><small>天赋组合</small><b>可免费刷新，不限次数</b></div>'
      +'<button onclick="v63RefreshTalents()">↻ 换一组天赋</button></div>');

    /* ③ 专属广告按钮：改为「解锁专属 + 四个天赋打包」 */
    html=html.replace(/<button onclick="unlockExclusive\(\)">([\s\S]*?)<\/button>/,
      '<button onclick="v63UnlockExclusiveAndAll()">🎬 看奖励视频 · 解锁专属天赋 + 四个天赋全带走</button>');

    /* ④ 已解锁时按钮状态 */
    try{
      if(ui&&ui.exclusive){
        html=html.replace(/<button onclick="v63UnlockExclusiveAndAll\(\)">[\s\S]*?<\/button>/,
          '<button onclick="v63UnlockExclusiveAndAll()">✓ 已解锁 · 四个天赋已打包</button>');
      }
    }catch(e){}

    /* ⑤ 打包提示 */
    try{
      if(ui&&ui.allTalents&&html.indexOf('已打包：')<0){
        html=html.replace('<div class="sticky-cta">',
          '<div class="v63-locked">已打包：当前四个天赋都会带入本局</div><div class="sticky-cta">');
      }
    }catch(e){}

    return html.replace('<section class="pre">','<section class="pre v63-enhanced">');
  }catch(e){return html}
}
window.v63EnhanceTalents=v63EnhanceTalents;

try{
  var __v63RenderTalents=renderTalents;
  renderTalents=function(){
    var html=null;
    try{html=__v63RenderTalents()}catch(e){return __v63RenderTalents()}
    return v63EnhanceTalents(html);
  };
}catch(e){}

window.__v63Debug={V63_AD_POINTS:V63_AD_POINTS,V63_AD_LIMIT:V63_AD_LIMIT,V63_BASE_POINTS:V63_BASE_POINTS,adLeft:v63AdLeft};

})();

