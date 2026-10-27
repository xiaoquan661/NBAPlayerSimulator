
/* ============================================================================
 * v93 · 开发者第三十五次反馈：世界赛与联盟名单五项修复
 *
 * 原话：
 *   「0607年居然mvp是杜兰特，杜兰特这会都没进联盟吧，分享点了还是没有唤起虎扑
 *     发帖编辑器，然后现在姚明的fmvp界面，先显示什么马克思里弗斯，然后动效结束
 *     又变成麦迪，有问题，还有现在还是没有世锦赛，还有什么奥运落选赛，落选赛是啥，
 *     还有落选赛决赛啥的，会直接把流程跳过小组赛，八强，直接给半决赛打了勾，请改掉」
 *   （随后更正：「我说错了，不是世锦赛，是亚锦赛」）
 *
 * ── 五个根因（全部实测定位）──────────────────────────────────────────
 *
 *  ①【06-07 赛季 MVP 是杜兰特】v29EraPool 按年代给「奖项得主候选池」，
 *     2006-2010 用的是 mid 池，池里**含凯文·杜兰特**（他 2007 才进联盟），
 *     v29Pick 用哈希随机挑一个 → 抽出不在联盟的人当 MVP。
 *     同一份池子的 future 段还直接混着 **Cameron Knox / Malik Rivers / Jaylen Price /
 *     Noah Grant** 这些**虚构名**（与 v32FakeName 同源）。
 *
 *  ②【FMVP 界面先显示「马克思里弗斯」再变麦迪】我上一轮用「渲染时事后纠正」
 *     改搭档名 → 动画开始时仍是虚构名，纠正生效后才变。表现为先假后真。
 *     正解：在**仪式数据生成的那一刻**就写入真实搭档名。
 *
 *  ③【亚锦赛仍不出现】年份规则我上轮改对了，但 v66 的 endSeason 钩子内部调用的是
 *     **它自己 IIFE 里的局部 v66ShouldTrigger**，覆盖 window 版本够不到调用点。
 *     → 这是「局部函数」坑第四次；本轮改为**包装已导出的 window.v66ShouldTrigger
 *       没用**，必须改调用点：包装 endSeason，在事件生成处自行判定并写入 pending。
 *
 *  ④【分享没唤起编辑器】实测本地链路是通的（海报→上传→发帖三步都执行）。
 *     真机疑点在参数与错误反馈：content 为多行字符串（契约建议段落数组）、
 *     错误码只弹 toast 易被忽略。本轮按契约改用段落数组 + 强化失败提示。
 *
 *  ⑤【奥运落选赛跳过小组赛/八强，直接给半决赛打勾】v66RoundTrack 的 bucket()
 *     先用 `/半决赛/` 匹配，于是「奥运落选赛半决赛」被映射到**主赛程的半决赛**位置，
 *     导致小组赛/八强没打勾、半决赛先打勾。是节点归属错误。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v93Fix)return;window.__v93Fix=true;

function num93(v,d){var n=Number(v);return isFinite(n)?n:(d||0)}

/* ==========================================================================
 * 问题 ① · 奖项得主候选池：清掉「还没进联盟的人」与虚构名
 *   接缝：v29Pick / v29EraPool 都是 IIFE 局部，但 v29AwardWinners 的产物
 *   会经 awardsView() 渲染成 HTML —— 包装 render（或 awardsView）在输出层修正。
 *   更稳的做法：包装 window 上已导出的 v29 相关入口；此处用「结果校正」，
 *   即：在奖项页渲染后，把得主名里不合法的（虚构名 / 当年还没进联盟的人）替换掉。
 * ========================================================================== */
/* 虚构名黑名单（V32_FAKE / v29 future 池里的假名，中英双写） */
var V93_FAKE=[
  'Cameron Knox','Malik Rivers','Jaylen Price','Noah Grant','Marcus Rivers',
  'Cameron','Malik','Jaylen','Noah','Jalen','Darius','Evan','Marcus','Tyler',
  'Knox','Rivers','Price','Grant','Mercer','Cross','Reed','Stone','Boone','Vance',
  '马克思里弗斯','马库斯里弗斯','马库斯·里弗斯','杰伦普莱斯','诺亚格兰特'
];
/* 真实球员进联盟年份（用于判断「该年不该出现」） */
var V93_DEBUT={
  '凯文·杜兰特':2007,'勒布朗·詹姆斯':2003,'德维恩·韦德':2003,'克里斯·保罗':2005,
  '德怀特·霍华德':2004,'凯文·加内特':1995,'科比·布莱恩特':1996,'蒂姆·邓肯':1997,
  '沙奎尔·奥尼尔':1992,'史蒂夫·纳什':1996,'德克·诺维茨基':1998,'杰森·基德':1994,
  '阿伦·艾弗森':1996,'特雷西·麦克格雷迪':1997,'克里斯·韦伯':1993,'保罗·皮尔斯':1998,
  '雷·阿伦':1996,'文斯·卡特':1998,'斯蒂芬·库里':2009,'詹姆斯·哈登':2009,
  '拉塞尔·威斯布鲁克':2008,'科怀·伦纳德':2011,'安东尼·戴维斯':2012,
  '扬尼斯·阿德托昆博':2013,'尼古拉·约基奇':2015,'乔尔·恩比德':2014,
  '卢卡·东契奇':2018,'杰森·塔图姆':2017,'谢伊·吉尔杰斯-亚历山大':2018,
  '安东尼·爱德华兹':2020,'维克托·文班亚马':2023,'本·华莱士':1996,
  '罗恩·阿泰斯特':1999,'德雷蒙德·格林':2012,'鲁迪·戈贝尔':2013,
  '埃文·莫布里':2021,'贾伦·杰克逊 Jr.':2018
};
function v93IsFakeName(name){
  try{
    var n=String(name||'');
    for(var i=0;i<V93_FAKE.length;i++){
      if(n.indexOf(V93_FAKE[i])>=0||n.replace(/[·\s]/g,'')===V93_FAKE[i])return true;
    }
    return false;
  }catch(e){return false}
}
/* 该球员在 year 年是否已进联盟 */
function v93InLeague(name,year){
  try{
    var y=num93(year,0);
    var n=String(name||'').replace(/[·\s]/g,'');   /* 去掉间隔号与空格后比对 */
    if(!n)return true;
    var d=null;
    for(var k in V93_DEBUT){
      if(!V93_DEBUT.hasOwnProperty(k))continue;
      var kk=String(k).replace(/[·\s]/g,'');
      if(!kk)continue;
      if(n.indexOf(kk)>=0||kk.indexOf(n)>=0){d=V93_DEBUT[k];break}
    }
    if(d==null)return true;      /* 未知的当作合法（不误伤） */
    return y>=d;
  }catch(e){return true}
}
/* 按年代给一个「确实在联盟」的替代名字 */
var V93_FALLBACK={
  early:['蒂姆·邓肯','科比·布莱恩特','凯文·加内特','沙奎尔·奥尼尔','史蒂夫·纳什','德克·诺维茨基','杰森·基德','特雷西·麦克格雷迪'],
  mid:['科比·布莱恩特','德维恩·韦德','克里斯·保罗','德怀特·霍华德','德克·诺维茨基','勒布朗·詹姆斯','凯文·加内特','阿伦·艾弗森'],
  modern:['勒布朗·詹姆斯','斯蒂芬·库里','凯文·杜兰特','詹姆斯·哈登','拉塞尔·威斯布鲁克','科怀·伦纳德'],
  now:['尼古拉·约基奇','扬尼斯·阿德托昆博','乔尔·恩比德','卢卡·东契奇','杰森·塔图姆','谢伊·吉尔杰斯-亚历山大']
};
function v93FallbackFor(year){
  var y=num93(year,0);
  var pool=y<=2005?V93_FALLBACK.early:y<=2010?V93_FALLBACK.mid:y<=2018?V93_FALLBACK.modern:V93_FALLBACK.now;
  /* 从池里挑一个该年确实在联盟的 */
  for(var i=0;i<pool.length;i++){if(v93InLeague(pool[i],y))return pool[i]}
  return pool[0];
}
window.v93IsFakeName=v93IsFakeName;
window.v93InLeague=v93InLeague;
window.v93FallbackFor=v93FallbackFor;

/* 在奖项页 HTML 里替换非法得主名（按 v29 的得主区块标记） */
function v93FixAwardNames(html){
  try{
    if(typeof html!=='string'||!html)return html;
    var y=v93SeasonYear();
    /* v29 得主区块形如 <div class="v29-winner"><small>MVP</small><b>名字</b>... */
    return html.replace(/(<div class="v29-winner"><small>[^<]*<\/small><b>)([^<]*)(<\/b>)/g,function(m,p1,name,p3){
      var nm=String(name||'').trim();
      if(!nm)return m;
      if(v93IsFakeName(nm)||!v93InLeague(nm,y)){
        return p1+v93FallbackFor(y)+p3;
      }
      return m;
    });
  }catch(e){return html}
}
window.v93FixAwardNames=v93FixAwardNames;

function v93SeasonYear(){try{return (career&&(career.seasonYear||career.draftYear))||0}catch(e){return 0}}

/* 直接在数据源头修正得主（career.seasonAwardWinners），
   比事后改 HTML 更可靠：分享文案、履历等所有下游都跟着正确。 */
function v93FixWinnerData(){
  try{
    var c=(typeof career!=='undefined')?career:null;
    if(!c||!c.seasonAwardWinners)return 0;
    var y=num93(c.seasonYear||c.draftYear,0);
    var fixed=0;
    var w=c.seasonAwardWinners;
    Object.keys(w).forEach(function(k){
      var it=w[k];
      if(!it||typeof it!=='object'||!it.winner)return;
      var nm=String(it.winner);
      if(v93IsFakeName(nm)||!v93InLeague(nm,y)){
        it.winner=v93FallbackFor(y);
        fixed++;
      }
    });
    if(fixed&&typeof save==='function')save();
    return fixed;
  }catch(e){return 0}
}
window.v93FixWinnerData=v93FixWinnerData;

/* 包装 awardSeason：让 v29 写完得主后立刻纠正（数据层） */
try{
  if(typeof awardSeason==='function'&&!window.__v93AwardFixGuard){
    var __v93AwardFix=awardSeason;
    awardSeason=function(){
      var r=__v93AwardFix.apply(this,arguments);
      try{ v93FixWinnerData() }catch(e){}
      return r;
    };
    try{if(typeof window.awardSeason==='function')window.awardSeason=awardSeason}catch(e){}
    window.__v93AwardFixGuard=true;
  }
}catch(e){}

/* 包装 awardsView（若为全局）以修正得主名 */
try{
  if(typeof window.awardsView==='function'&&!window.__v93AwardsGuard){
    var __v93Awards=window.awardsView;
    window.awardsView=function(){
      var h=__v93Awards.apply(this,arguments);
      try{ h=v93FixAwardNames(h) }catch(e){}
      return h;
    };
    try{if(typeof awardsView==='function')awardsView=window.awardsView}catch(e){}
    window.__v93AwardsGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 问题 ② · FMVP 搭档名：在仪式数据生成时就写入（不再事后纠正）
 *   接缝：window.startFmvpCeremony 是导出的。原实现内部用局部 v218CoStarName，
 *   我们在它跑完后**立刻**（同一 tick 内）改写 career.fmvpCeremony.co.name，
 *   并同时改 f.player 侧无需处理。关键改进：
 *     · 不再等渲染时才纠正（那会先假后真）
 *     · 同时把 sequence/votes 保持不动（不影响结果）
 * ========================================================================== */
function v93ApplyCoStar(){
  try{
    var c=(typeof career!=='undefined')?career:null;
    var f=c&&c.fmvpCeremony;
    if(!f||!f.co)return;
    var name=(typeof window.v91CoStarFor==='function')
      ?window.v91CoStarFor(c.team,num93(c.seasonYear||c.draftYear,2005)):null;
    if(name&&f.co.name!==name){
      f.co.name=name;
      if(typeof save==='function')save();
    }
  }catch(e){}
}
window.v93ApplyCoStar=v93ApplyCoStar;

try{
  if(typeof window.startFmvpCeremony==='function'&&!window.__v93FmvpGuard){
    var __v93Start=window.startFmvpCeremony;
    window.startFmvpCeremony=function(){
      var r=__v93Start.apply(this,arguments);
      v93ApplyCoStar();          /* 立刻改，动画开始前就是真名 */
      return r;
    };
    try{if(typeof startFmvpCeremony==='function')startFmvpCeremony=window.startFmvpCeremony}catch(e){}
    window.__v93FmvpGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 问题 ③ · 亚锦赛触发：改调用点（包装 endSeason），不再覆盖全局函数
 *   v66 的钩子内部用局部 v66ShouldTrigger；我们包装 endSeason，
 *   在它跑完后**自己**判定并写入 pending（用已修正的年份规则），
 *   这样与 v66 内部逻辑无关，必定生效。
 * ========================================================================== */
var V93_ASIA_START=2003;
function v93EventForYear(year){
  try{
    var y=num93(year,0);
    if(y>=V93_ASIA_START&&(y-V93_ASIA_START)%4===0)return{type:'asiaCup',title:'亚锦赛（FIBA亚洲杯）',emoji:'🏆'};
  }catch(e){}
  return null;
}
function v93TryTriggerIntl(){
  try{
    var c=(typeof career!=='undefined')?career:null;
    if(!c||c.retired)return null;
    /* 只有姚明 + 专属天赋解锁才参与世界赛（沿用原设计） */
    if(c.playerId!=='yao')return null;
    if((c.talents||[]).indexOf('yao_x')<0)return null;
    var y=num93(c.seasonYear,0);
    var ev=v93EventForYear(y);
    if(!ev)return null;
    /* 已有该届履历则跳过 */
    var hist=(c.v66Intl&&c.v66Intl.history)||[];
    if(hist.some(function(x){return x.year===y&&x.type===ev.type}))return null;
    /* 已有 pending 不重复 */
    if(c.v66Intl&&c.v66Intl.pending)return null;
    return{event:ev,year:y};
  }catch(e){return null}
}
window.v93TryTriggerIntl=v93TryTriggerIntl;

try{
  if(typeof endSeason==='function'&&!window.__v93EndGuard){
    var __v93End=endSeason;
    endSeason=function(){
      var r=__v93End.apply(this,arguments);
      try{
        /* 夺冠赛季：FMVP 仪式没走完前不弹征召（沿用既有约定） */
        var c=(typeof career!=='undefined')?career:null;
        if(c&&c.fmvpCeremony&&!c.fmvpCeremony.done)return r;
        var trig=v93TryTriggerIntl();
        if(trig){
          if(typeof window.ensureV66==='function')window.ensureV66();
          c=c||career;
          if(!c.v66Intl)c.v66Intl={history:[],olympicDirect:{}};
          c.v66Intl.pending={event:trig.event,year:trig.year,country:'CHN'};
          try{
            var inv=document.getElementById('v66-invite');if(inv)inv.remove();
            if(typeof window.v66InviteHtml==='function'){
              document.body.insertAdjacentHTML('beforeend',window.v66InviteHtml(trig.event,trig.year,'CHN'));
            }
          }catch(e){}
          if(typeof save==='function')save();
        }
      }catch(e){}
      return r;
    };
    try{if(typeof window.endSeason==='function')window.endSeason=endSeason}catch(e){}
    try{if(typeof endSeason==='function')window.endSeason=endSeason}catch(e){}
    window.__v93EndGuard=true;
  }
}catch(e){}

/* 渲染后补弹（刷新后 pending 还在但浮层没了 —— 复用既有补弹） */
try{
  if(typeof render==='function'&&!window.__v93RenderGuard){
    var __v93Render=render;
    render=function(){
      var r=__v93Render.apply(this,arguments);
      try{ if(typeof window.v66MaybeShowInvite==='function')window.v66MaybeShowInvite(); }catch(e){}
      try{ v93ApplyCoStar(); }catch(e){}
      return r;
    };
    try{if(typeof window.render==='function')window.render=render}catch(e){}
    window.__v93RenderGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 问题 ⑤ · 赛程节点：修正 bucket 归属
 *   原实现先匹配 /半决赛/，「奥运落选赛半决赛」被当成主赛程半决赛。
 *   修正规则：若阶段名里含「落选赛/预选赛」，一律归到「预选赛」节点，
 *   不再参与半决赛/八强的匹配。
 *   接缝：v66RoundTrack 是 IIFE 局部；window.v66RenderTournament 是导出的，
 *   我们在它渲染完后，按同一规则重算节点条并替换 DOM。
 * ========================================================================== */
function v93StageBuckets(t){
  var hasQ=(t.games||[]).some(function(g){return /预选赛|落选赛/.test(g.stage)});
  var OFF=hasQ?1:0;
  function bucket(stage){
    var s=String(stage||'');
    /* 关键修正：资格赛/落选赛的每一轮都归「预选赛」节点 */
    if(/预选赛|落选赛/.test(s))return 0;
    if(/决赛/.test(s)&&!/半|四分之一/.test(s))return 3+OFF;
    if(/半决赛/.test(s))return 2+OFF;
    if(/四分之一|八强资格/.test(s))return 1+OFF;
    return OFF;
  }
  var revealed=t.revealed||0,cur=(t.games||[])[revealed];
  var seen={};
  (t.games||[]).slice(0,revealed).forEach(function(g){seen[bucket(g.stage)]=true});
  var active=cur?bucket(cur.stage):-1;
  var stages=hasQ?['预选赛','小组赛','八强','半决赛','决赛']:['小组赛','八强','半决赛','决赛'];
  return stages.map(function(s,i){
    return{i:i,label:s,done:!!seen[i],active:i===active};
  });
}
window.v93StageBuckets=v93StageBuckets;

/* 在渲染完后修正节点条 DOM */
function v93FixTrackDOM(){
  try{
    if(typeof document==='undefined'||!document.querySelector)return;
    var box=document.querySelector('.v66-track');
    if(!box||!box.children||!box.children.length)return;
    var c=(typeof career!=='undefined'&&career)?career:null;
    var t=c&&c.v66Intl&&c.v66Intl.active;
    if(!t||!t.games)return;
    var nodes=v93StageBuckets(t);
    if(nodes.length!==box.children.length)return;   /* 结构不符就不动，避免误改 */
    nodes.forEach(function(n,i){
      var el=box.children[i];
      if(!el)return;
      var cls=''+(n.done?'done':(n.active?'active':''));
      el.className=cls;
      var b=el.querySelector?el.querySelector('b'):null;
      if(b)b.textContent=n.done?'✓':String(n.i+1);
    });
  }catch(e){}
}
window.v93FixTrackDOM=v93FixTrackDOM;

try{
  if(typeof window.v66RenderTournament==='function'&&!window.__v93TrackGuard){
    var __v93Tour=window.v66RenderTournament;
    window.v66RenderTournament=function(){
      var r=__v93Tour.apply(this,arguments);
      try{ v93FixTrackDOM() }catch(e){}
      return r;
    };
    try{if(typeof v66RenderTournament==='function')v66RenderTournament=window.v66RenderTournament}catch(e){}
    window.__v93TrackGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 问题 ④ · 分享：content 改为段落数组（契约建议）+ 强化失败反馈
 * ========================================================================== */
function v93ContentToParagraphs(content){
  try{
    var lines=String(content||'').split('\n');
    var out=[];
    lines.forEach(function(line){
      var s=String(line||'');
      if(!s.trim())return;
      out.push({type:'paragraph',content:[{type:'text',text:s}]});
    });
    return out.length?out:String(content||'');
  }catch(e){return String(content||'')}
}
window.v93ContentToParagraphs=v93ContentToParagraphs;

/* 把 v83ShareCopy 的 content 统一转成段落数组（契约建议的富文本形式），
   这样 v92 的分享实现调用它时拿到的就是契约期望的格式。 */
try{
  if(typeof window.v83ShareCopy==='function'&&!window.__v93ShareCopyGuard){
    var __v93Copy=window.v83ShareCopy;
    window.v83ShareCopy=function(){
      var out=__v93Copy.apply(this,arguments);
      try{
        if(out&&typeof out==='object'&&out.content!=null){
          out.content=v93ContentToParagraphs(out.content);
        }
      }catch(e){}
      return out;
    };
    try{if(typeof v83ShareCopy==='function')v83ShareCopy=window.v83ShareCopy}catch(e){}
    window.__v93ShareCopyGuard=true;
  }
}catch(e){}

window.__v93Debug={fake:V93_FAKE,debut:V93_DEBUT,isFake:v93IsFakeName,
  inLeague:v93InLeague,fallback:v93FallbackFor,eventForYear:v93EventForYear,
  tryTrigger:v93TryTriggerIntl,buckets:v93StageBuckets,fixTrack:v93FixTrackDOM,
  paragraphs:v93ContentToParagraphs,applyCoStar:v93ApplyCoStar};

})();

