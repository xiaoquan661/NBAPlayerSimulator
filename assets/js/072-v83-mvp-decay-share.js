
/* ============================================================================
 * v83 · 开发者第二十五次反馈（三项）
 *
 * 原话：
 *   「现在mvp获得的太容易，然后32岁后衰退的太少，基本没感觉，当然有专属天赋的话
 *     保持现状，没有专属天赋的32岁后开始属性衰退，然后退役海报应该可以分享到虎扑
 *     发帖，海报作为图片一起发，标题和内容你来定」
 *
 * 补充确认：
 *   · 分享方式 = 一键拉起「已填好标题/正文/海报图」的虎扑发帖页
 *   · 衰退强度 = 32~35 岁幅度小，35 岁以后幅度大；有专属天赋的保持现状
 *
 * ── 一、MVP 太容易 ──────────────────────────────────────────────────────
 *   实测（走完整 awardSeason）：「很强」档（场均 28 分 11 板 6 助）从
 *   OVR 90 + 55 胜（67%）起就稳拿 MVP，而且几乎总是第 1 或第 2 —— 没有竞争感。
 *   根因：最终门槛 v65MvpPasses 只要 OVR≥90、胜率≥58%、数据达标就放行，
 *   而它的「数据达标」线偏低（28+11 或 23 分或 8.5 助即可）。
 *   修法：把门槛按「数据档次」分层抬升——想拿 MVP 必须同时满足
 *   ①OVR 门槛 ②战绩门槛 ③**高产数据**（而非单项达标）。具体见 V83_MVP。
 *
 * ── 二、32 岁后衰退太少 ────────────────────────────────────────────────
 *   实测（无专属天赋，20 次平均）：40 岁累计才掉 3.9 点，32~35 岁几乎无感
 *   （累计 0~0.8 点）。
 *   修法：无专属天赋者从 32 岁开始衰退，分两段——
 *     32~35 岁：小幅（每年约 1 点属性 + 少量 ovrMod）
 *     36 岁起：大幅（每年 2~3 点属性 + ovrMod 下滑，40 岁后更陡）
 *   有专属天赋（long / late）的球员**保持原有曲线**（更耐老）。
 *
 * ── 三、退役海报分享到虎扑 ──────────────────────────────────────────────
 *   退役海报顶部加「分享到虎扑」按钮：
 *     ① 把海报区域画成图片（Canvas，不依赖第三方库）
 *     ② 上传拿 CDN 地址（window.ColorboxAI.oss.uploadFile）
 *     ③ 拉起发帖页并预填标题/正文/图片（request.bbs.openPostEditor）
 *   标题与正文由本层按生涯成绩自动生成。
 *   无宿主（浏览器直开/扫码预览）时按钮提示「需在虎扑 App 内分享」，不报错。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v83Fix)return;window.__v83Fix=true;

function esc83(v){return String(v==null?'':v).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})}
function num83(v,d){var n=Number(v);return isFinite(n)?n:(d||0)}

/* ==========================================================================
 * 一、MVP 难度：分层抬高数据门槛
 * ========================================================================== */
var V83_MVP={
  OVR:91,            /* 原 90 → 91：必须有巨星档评分 */
  WIN_RATE:0.63,     /* 原 0.58 → 0.63：球队必须是真的强队 */
  GAMES_RATE:0.72,   /* 原 0.55 → 0.72：出勤要有分量（MVP 不能缺勤太多） */
  /* 高产线：至少满足其中一条（比原来的「单项达标」严格得多） */
  HIGH:function(s){
    var pts=num83(s.pts,0), reb=num83(s.reb,0), ast=num83(s.ast,0);
    var stl=num83(s.stl,0), blk=num83(s.blk,0);
    return (pts>=27&&reb>=9)            /* 得分+篮板双高 */
        || (pts>=27&&ast>=7)            /* 得分+组织双高 */
        || (pts>=24&&reb>=11&&ast>=5)   /* 全能内线 */
        || (pts>=21&&reb>=12&&blk>=1.6) /* 顶级护框 */
        || (pts>=22&&ast>=9.5)          /* 顶级组织 */
        || (pts>=30&&(reb>=6||ast>=5))  /* 得分爆炸且不偏科 */
        || (pts>=25&&(stl+blk)>=4.0);   /* 攻防一体 */
  }
};

function v83MvpPasses(){
  try{
    var c=(typeof career!=='undefined'&&career)||{};
    var s=c.seasonStats||{};
    var ovr=num83(c.ovr,0);
    var gp=num83(s.gp,0);
    var games=Math.max(1,num83(c.games,82));
    var wp=num83(c.wins,0)/games;
    if(ovr<V83_MVP.OVR)return false;
    if(wp<V83_MVP.WIN_RATE)return false;
    if(gp<Math.max(3,Math.floor(games*V83_MVP.GAMES_RATE)))return false;
    return !!V83_MVP.HIGH(s);
  }catch(e){return false}
}
window.v83MvpPasses=v83MvpPasses;

/* 接管 awardSeason 出口：用更严的门槛再复核一次（跑在所有既有层之后） */
try{
  if(typeof awardSeason==='function'&&!window.__v83AwardGuard){
    var __v83Award=awardSeason;
    awardSeason=function(){
      var before=(typeof career!=='undefined'&&career&&career.honors&&Number(career.honors.MVP))||0;
      var r=__v83Award.apply(this,arguments);
      try{
        if(!career||!Array.isArray(career.seasonAwards))return r;
        if(!v83MvpPasses()){
          var card=career.seasonAwards.find(function(x){return x.key==='MVP'||x.title==='最有价值球员'});
          if(card&&card.won){
            card.won=false;
            card.status='未达到 MVP 评选线';
            career.honors=career.honors||{};
            var cur=Number(career.honors.MVP)||0;
            if(cur>before)career.honors.MVP=before;
            /* 同步世界线成就，避免「荣誉撤了但成就还留着」 */
            try{
              if(career.achievementState&&career.achievementState.keys){
                career.achievementState.keys=career.achievementState.keys.filter(function(k){
                  return k!=='award-'+career.seasonNo+'-最有价值球员'&&k!=='award-'+career.seasonNo+'-MVP';
                });
              }
            }catch(e){}
            if(typeof save==='function')save();
          }
        }
      }catch(e){}
      return r;
    };
    window.__v83AwardGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 二、32 岁后衰退（无专属天赋者才算；有 long/late 的保持原样）
 * ========================================================================== */
var V83_DECAY={
  START:32,            /* 衰退起点（无专属天赋） */
  MID_END:35,          /* 32~35 为「小幅」段；36 起为「大幅」段 */
  MID_ATTR_PER_YEAR:1, /* 小幅段：物理属性每年掉约 1 点（且不是每年必掉） */
  MID_SKILL_CHANCE:0.28,
  BIG_ATTR_MIN:2,      /* 大幅段：物理属性每年掉 2~3 点 */
  BIG_ATTR_MAX:3,
  BIG_SKILL_CHANCE:0.60
};

function v83HasAgeTalent(){
  try{
    /* 【三种情况都算「有专属天赋」】
       ① long=生涯长（耐老）② late=大器晚成（30 岁后还涨）
       ③ career.exclusive=true —— 球员专属主线（如姚明的 yao_x）。
       开发者要求「有专属天赋的话保持现状」，专属天赋必须包括第③类；
       早期只判 long/late，导致姚明（exclusive=true、talents 里没有 long/late）
       被当成无天赋球员施加衰退（实测被既有测试抓到，已修）。 */
    if(typeof career!=='undefined'&&career&&career.exclusive)return true;
    if(typeof hasTalent!=='function')return false;
    return !!(hasTalent('long')||hasTalent('late'));
  }catch(e){return false}
}

function v83ApplyDecay(){
  try{
    if(typeof career==='undefined'||!career)return;
    var age=Number(career.age)||0;
    if(age<V83_DECAY.START)return;              /* 32 岁之前不衰退 */
    if(v83HasAgeTalent())return;                /* 有专属天赋：保持原曲线 */

    var physical=['athleticism','durability','finishing','defense','strength'];
    var skill=['shooting','playmaking','rebounding'];
    var isBig=age>V83_DECAY.MID_END;            /* 36 岁起幅度大 */
    var rnd=(typeof rnd==='function')?rnd:function(a,b){return a};

    physical.forEach(function(k){
      if(typeof career.attrs[k]!=='number')return;
      if(isBig){
        var drop=rnd(V83_DECAY.BIG_ATTR_MIN,V83_DECAY.BIG_ATTR_MAX);
        if(age>=38)drop+=1;                     /* 38 岁后更陡 */
        if(age>=40)drop+=1;                     /* 40 岁后每年掉 4~5 点 */
        career.attrs[k]=(typeof clamp==='function')?clamp(career.attrs[k]-drop,30,99):Math.max(30,career.attrs[k]-drop);
      }else{
        /* 32~35：小幅，且不是每年必掉 */
        if((typeof Math.random==='function'?Math.random():0)<0.72){
          career.attrs[k]=(typeof clamp==='function')?clamp(career.attrs[k]-V83_DECAY.MID_ATTR_PER_YEAR,30,99):Math.max(30,career.attrs[k]-1);
        }
      }
    });
    skill.forEach(function(k){
      if(typeof career.attrs[k]!=='number')return;
      var ch=isBig?V83_DECAY.BIG_SKILL_CHANCE:V83_DECAY.MID_SKILL_CHANCE;
      if((typeof Math.random==='function'?Math.random():0)<ch){
        career.attrs[k]=(typeof clamp==='function')?clamp(career.attrs[k]-1,30,99):Math.max(30,career.attrs[k]-1);
      }
    });
    /* 评分修正：35 岁后逐年下滑（小幅段基本不动，避免「刚过 32 就崩」） */
    if(isBig){
      var modDrop=1;
      if(age>=38)modDrop=2;
      if(age>=40)modDrop=3;
      career.ovrMod=(Number(career.ovrMod)||0)-modDrop;
    }else if(age>=35&&(typeof Math.random==='function'?Math.random():0)<0.4){
      career.ovrMod=(Number(career.ovrMod)||0)-1;
    }
    if(typeof syncOvr==='function')syncOvr();
    if(typeof save==='function')save();
  }catch(e){}
}
window.v83ApplyDecay=v83ApplyDecay;

/* 挂到 ageCurve 之后（ageCurve 里已有原版衰退；本层只对「无专属天赋」补强） */
try{
  if(typeof ageCurve==='function'&&!window.__v83AgeGuard){
    var __v83Age=ageCurve;
    ageCurve=function(){
      var r=__v83Age.apply(this,arguments);
      try{v83ApplyDecay()}catch(e){}
      return r;
    };
    window.__v83AgeGuard=true;
  }
}catch(e){}

/* ==========================================================================
 * 三、退役海报：一键分享到虎扑（海报作为图片）
 * ========================================================================== */
function v83SharePosterHTML(){
  return '<button class="v83-share" id="v83-share-btn" onclick="v83SharePoster()">📤 分享到虎扑</button>';
}
window.v83SharePosterHTML=v83SharePosterHTML;

/* 生成分享文案（标题 + 正文），由本层按生涯成绩自动生成 */
function v83ShareCopy(){
  var p=(typeof currentP==='function'&&currentP())?currentP():{zh:'我'};
  var total=0,grade='',rank='',hof='';
  try{
    var inp=(typeof v81CurrentInput==='function')?v81CurrentInput():null;
    if(inp){
      var sc=(typeof v81TotalScore==='function')?v81TotalScore(inp):{total:0};
      total=num83(sc.total,0);
      grade=((typeof v81Grade==='function')?v81Grade(total).name:'')||'';
      rank=(((typeof v81HistoryRank==='function')?v81HistoryRank(total):{})||{}).label||'';
      hof=(((typeof v81HallOfFame==='function')?v81HallOfFame(total,inp.honors):{})||{}).label||'';
    }
  }catch(e){}
  var tot={},avg={},honors={};
  try{
    var inp2=(typeof v81CurrentInput==='function')?v81CurrentInput():null;
    if(inp2){tot=inp2.careerTotals||{};avg=inp2.avg||{};honors=inp2.honors||{}}
  }catch(e){}
  var honLine='';
  try{
    var arr=[];
    Object.keys(honors||{}).forEach(function(k){var n=num83(honors[k],0);if(n>0)arr.push(k+'×'+n)});
    honLine=arr.join('、');
  }catch(e){}

  var title='【没人相信我打美职篮】我把'+p.zh+'的生涯打到了「'+(grade||'一段传奇')+'」';
  var lines=[
    '球员：'+p.zh,
    '本局游戏总得分：'+Math.round(total)+'（'+(grade||'')+'）',
    rank?('联盟历史排名：'+rank):'',
    hof?('名人堂：'+hof):'',
    '赛季 ' + Math.round(num83(tot.seasons,0)) + ' 个 · 出场 ' + Math.round(num83(tot.games,0)) + ' 场',
    '生涯场均 ' + (Math.round(num83(avg.pts,0)*10)/10) + ' 分 ' + (Math.round(num83(avg.reb,0)*10)/10) + ' 板 ' + (Math.round(num83(avg.ast,0)*10)/10) + ' 助',
    honLine?('主要荣誉：'+honLine):'',
    '',
    '这是我在《没人相信我打美职篮》里打出来的一段生涯。从选秀夜开始，这条路由我自己写。',
    '你也来试试？'
  ].filter(function(x){return x!==''&&x!=null});
  return {title:title,content:lines.join('\n')};
}
window.v83ShareCopy=v83ShareCopy;

/* 把海报区域画成 PNG Blob（纯 Canvas，无第三方库）。
   为什么不用 html2canvas：项目是单文件、禁止引入外部依赖。 */
/* ============================================================================
 * 退役海报（分享用图片）
 *
 * 旧实现是纯 canvas 手画的一段文字列表 —— 没有人物图、没有游戏内的配色与荣誉，
 * 所以分享出去「很简陋很丑」。
 * 现在改成**用游戏内退役海报的那张素材合成**：
 *   · 上半部是玩家立绘（本地 assets/portrait-*.jpg，与游戏内同一张）
 *   · 下半部是游戏内同套暖色体系 + 金字
 *   · 内容与退役页一致：本局总得分 / 评级 / 联盟历史排名 / 名人堂 / 荣誉 / 生涯数据
 * 素材是本地同源资源，不会污染 canvas；万一图片加载失败或环境受限，自动降级为
 * 「无图版」再导出一次，保证分享功能不会因此失效。
 * ========================================================================== */
function v83PosterPng(cv){
  return new Promise(function(resolve,reject){
    if(!cv||typeof cv.toBlob!=='function'){reject(new Error('当前环境不支持生成海报图片'));return}
    try{
      cv.toBlob(function(b){b?resolve(b):reject(new Error('toBlob failed'))},'image/png',0.92);
    }catch(e){reject(e)}   /* 图片跨域污染 canvas 时会抛 SecurityError */
  });
}
function v83PosterToBlob(){
  return new Promise(function(resolve,reject){
    try{
      var p=(typeof currentP==='function'&&currentP())?currentP():{zh:''};
      var zh=String(p.zh||'');
      var file=null;
      try{
        if(typeof assetFile==='function'){
          file=assetFile(zh+'退役生涯海报')||assetFile(zh+'人物立绘')||assetFile(zh+'人物形象');
        }
      }catch(e){}
      var img=null,started=false;
      function start(){
        if(started)return;started=true;
        var cv;
        try{ cv=v83DrawPoster(img); }catch(e){ reject(e); return }
        v83PosterPng(cv).then(resolve).catch(function(){
          /* 降级：去掉图片再画一次（跨域污染 / file:// 场景） */
          try{ v83PosterPng(v83DrawPoster(null)).then(resolve).catch(reject) }catch(e){reject(e)}
        });
      }
      if(file){
        img=new Image();
        img.onload=start;
        img.onerror=function(){img=null;start()};
        img.src=file;
        setTimeout(start,1500);      /* 兜底：图片迟迟不返回也要能出图 */
      }else{
        start();
      }
    }catch(e){reject(e)}
  });
}
function v83DrawPoster(img){
  var W=900,M=48;
  var SCRATCH=3400;
  var cv=document.createElement('canvas');cv.width=W;cv.height=SCRATCH;
  var g=cv.getContext('2d');
  if(!g)throw new Error('canvas unsupported');
  function rr(x,y,w,h,r){
    g.beginPath();g.moveTo(x+r,y);
    g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);
    g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);
    g.closePath();
  }
  /* ── 取数与退役页完全同源 ───────────────────────────────────────── */
  var p=(typeof currentP==='function'&&currentP())?currentP():{zh:''};
  var inp=null;try{inp=(typeof v81CurrentInput==='function')?v81CurrentInput():null}catch(e){}
  var sc=null;try{sc=(inp&&typeof v81TotalScore==='function')?v81TotalScore(inp):null}catch(e){}
  var total=(sc&&sc.total)||0;
  var grade='';try{grade=(typeof v81Grade==='function')?v81Grade(total).name:''}catch(e){}
  var rankL='';try{rankL=(typeof v81HistoryRank==='function')?v81HistoryRank(total).label:''}catch(e){}
  var hofL='';try{hofL=(typeof v81HallOfFame==='function')?v81HallOfFame(total,(inp&&inp.honors)||{}).label:''}catch(e){}
  var tot=(inp&&inp.careerTotals)||{},avg=(inp&&inp.avg)||{};
  var team='';try{team=(typeof teamBy==='function'&&career)?teamBy(career.team).name:''}catch(e){}
  /* 荣誉清单：**与游戏内退役页同一套汇总键**（不用全部键，否则「最佳防阵」会和
     「最佳防守一阵/二阵」重复列出）。全部列出、自动折行，不做省略。 */
  var HON_KEYS=['总冠军','FMVP','MVP','最佳阵容','最佳防阵','DPOY','全明星','最佳新秀','MIP','得分王','篮板王','助攻王','盖帽王','抢断王','总冠军（世界赛）','奥运会金牌'];
  var hon=[];
  try{
    if(inp&&inp.honors){
      HON_KEYS.forEach(function(k){var n=Number(inp.honors[k])||0;if(n>0)hon.push(k+'×'+n)});
    }
  }catch(e){}

  /* ── 底：与游戏内同一套暖色体系 ─────────────────────────────────── */
  var grad=g.createLinearGradient(0,0,0,SCRATCH);
  grad.addColorStop(0,'#12100e');grad.addColorStop(.35,'#241c14');grad.addColorStop(1,'#4a3219');
  g.fillStyle=grad;g.fillRect(0,0,W,SCRATCH);

  /* ① 顶部：游戏内退役海报素材（同一张）+ 底部渐隐 */
  var HERO=760;
  if(img&&img.width&&img.height){
    var s=Math.max(W/img.width,HERO/img.height);
    var dw=img.width*s,dh=img.height*s;
    g.drawImage(img,(W-dw)/2,(HERO-dh)/2-HERO*0.04,dw,dh);
    var fade=g.createLinearGradient(0,HERO*0.40,0,HERO);
    fade.addColorStop(0,'rgba(18,16,14,0)');fade.addColorStop(.68,'rgba(18,16,14,.8)');fade.addColorStop(1,'#241c14');
    g.fillStyle=fade;g.fillRect(0,HERO*0.40,W,HERO*0.60);
  }
  var topShade=g.createLinearGradient(0,0,0,190);
  topShade.addColorStop(0,'rgba(0,0,0,.6)');topShade.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle=topShade;g.fillRect(0,0,W,190);

  /* 头部标识 */
  g.textAlign='center';
  g.fillStyle='#ffd88f';g.font='bold 30px sans-serif';g.fillText('没人相信我打美职篮',W/2,86);
  g.fillStyle='rgba(224,191,140,.85)';g.font='18px sans-serif';g.fillText('CAREER COMPLETE',W/2,118);

  /* 姓名 + 年份/球队/位置（压在立绘下沿） */
  var nameY=HERO-96;
  g.fillStyle='rgba(0,0,0,.38)';g.fillRect(0,nameY-66,W,152);
  g.fillStyle='#fff6e6';g.font='bold 68px sans-serif';g.fillText(String(p.zh||''),W/2,nameY);
  var sub=[];try{ if(career)sub.push(career.draftYear+'—'+career.seasonYear) }catch(e){}
  if(team)sub.push(team);
  if(p.pos)sub.push(p.pos);
  g.fillStyle='#e6cfa8';g.font='22px sans-serif';g.fillText(sub.join(' · '),W/2,nameY+40);

  var y=HERO+48;

  /* ② 本局游戏总得分（与退役页同一块） */
  g.fillStyle='#c4a679';g.font='20px sans-serif';g.fillText('本局游戏总得分',W/2,y);
  y+=104;
  g.fillStyle='#ffd88f';g.font='bold 108px sans-serif';
  g.fillText(String(Math.round(total)).replace(/\B(?=(\d{3})+(?!\d))/g,','),W/2,y);
  y+=46;
  if(grade){g.fillStyle='#ffeccb';g.font='bold 28px sans-serif';g.fillText(grade,W/2,y)}
  y+=42;

  /* ③ 三项档案卡：联盟历史排名 / 名人堂 / 峰值评分 */
  var cw=(W-M*2-40)/3,ch=112;
  [['联盟历史排名',rankL||'—'],['名人堂',hofL||'—'],['峰值评分',String(num81v((inp&&inp.rec&&inp.rec.bestOvr)||0))]].forEach(function(it,i){
    var cx=M+i*(cw+20);
    g.fillStyle='rgba(255,255,255,.06)';rr(cx,y,cw,ch,14);g.fill();
    g.strokeStyle='rgba(255,216,143,.28)';g.lineWidth=1.5;rr(cx,y,cw,ch,14);g.stroke();
    g.fillStyle='#c4a679';g.font='18px sans-serif';g.fillText(it[0],cx+cw/2,y+42);
    g.fillStyle='#ffeccb';g.font='bold 26px sans-serif';g.fillText(String(it[1]).slice(0,10),cx+cw/2,y+84);
  });
  y+=ch+56;

  /* ④ 得分构成（基础数据累计 / 荣誉成就 / 常规赛战绩） */
  var maxPart=Math.max((sc&&sc.data)||0,(sc&&sc.honor)||0,(sc&&sc.record)||0,1);
  g.textAlign='left';
  g.fillStyle='#c4a679';g.font='bold 22px sans-serif';g.fillText('得分构成',M,y);
  g.textAlign='right';
  g.fillStyle='#c4a679';g.font='18px sans-serif';g.fillText('生涯高度 ×'+Math.round(((sc&&sc.mult)||1)*100)/100,W-M,y);
  g.textAlign='center';
  y+=30;
  [['基础数据累计',(sc&&sc.data)||0,'#e0a12f'],['荣誉成就',(sc&&sc.honor)||0,'#d9762f'],['常规赛战绩',(sc&&sc.record)||0,'#c9553f']].forEach(function(it){
    var bh=30,bw=W-M*2;
    g.textAlign='left';g.fillStyle='#e6cfa8';g.font='20px sans-serif';g.fillText(it[0],M,y+22);
    g.textAlign='right';g.fillStyle='#ffd88f';g.font='bold 22px sans-serif';g.fillText(num81v(it[1]),W-M,y+22);
    g.fillStyle='rgba(255,255,255,.10)';rr(M,y+32,bw,bh,10);g.fill();
    var w=Math.max(6,Math.round(bw*Math.min(1,num81vraw(it[1])/maxPart)));
    g.fillStyle=it[2];rr(M,y+32,w,bh,10);g.fill();
    y+=32+bh+16;
  });
  g.textAlign='center';
  y+=16;

  /* ⑤ 生涯数据（与退役页同一组 8 项） */
  g.fillStyle='#c4a679';g.font='bold 22px sans-serif';g.fillText('生涯数据',W/2,y);
  y+=34;
  var cells=[['赛季',num81v(tot.seasons)],['出场',num81v(tot.games)],['生涯总得分',num81v(tot.points)],['场均得分',String(Math.round(num81vraw(avg.pts)*10)/10)],
             ['场均篮板',String(Math.round(num81vraw(avg.reb)*10)/10)],['场均助攻',String(Math.round(num81vraw(avg.ast)*10)/10)],['峰值评分',num81v((inp&&inp.rec&&inp.rec.bestOvr)||0)],['本季胜场',num81v((inp&&inp.wins)||0)]];
  var gw=(W-M*2)/4;
  cells.forEach(function(c,i){
    var cx=M+(i%4)*gw+gw/2, cy=y+Math.floor(i/4)*86;
    g.fillStyle='#ffeccb';g.font='bold 30px sans-serif';g.fillText(String(c[1]),cx,cy);
    g.fillStyle='#c4a679';g.font='16px sans-serif';g.fillText(String(c[0]),cx,cy+26);
  });
  y+=Math.ceil(cells.length/4)*86+30;

  /* ⑥ 本局荣誉：**全部列出**，按宽度自动折行，不省略 */
  g.fillStyle='#c4a679';g.font='bold 22px sans-serif';g.fillText('本局荣誉',W/2,y);
  y+=40;
  if(hon.length){
    g.font='bold 24px sans-serif';
    var maxW=W-M*2-40,lines=[],cur='';
    hon.forEach(function(t){
      var cand=cur?(cur+' · '+t):t;
      if(g.measureText(cand).width>maxW&&cur){lines.push(cur);cur=t}
      else cur=cand;
    });
    if(cur)lines.push(cur);
    g.fillStyle='#f0dcc0';
    lines.forEach(function(ln){ g.fillText(ln,W/2,y); y+=38 });
  }else{
    g.fillStyle='#9b8878';g.font='22px sans-serif';g.fillText('本局没有拿到个人奖项',W/2,y);y+=38;
  }
  y+=34;

  /* ⑦ 页脚 */
  g.fillStyle='rgba(196,166,121,.8)';g.font='20px sans-serif';
  g.fillText('历史已经写下结局 · 这一次由你重新带回巅峰',W/2,y+20);
  y+=72;

  /* ── 按实际用掉的高度裁掉多余背景 ─────────────────────────────── */
  var H=Math.max(900,Math.ceil(y));
  var out=document.createElement('canvas');out.width=W;out.height=H;
  var og=out.getContext('2d');
  og.drawImage(cv,0,0);
  /* 金框画在最终画布上 */
  og.strokeStyle='rgba(255,216,143,.5)';og.lineWidth=3;og.strokeRect(22,22,W-44,H-44);
  return out;
}
function num81vraw(v){var n=Number(v);return isFinite(n)?n:0}
function num81v(v){var n=Number(v);return isFinite(n)?Math.round(n).toLocaleString():'0'}
window.v83PosterToBlob=v83PosterToBlob;

function v83Toast(msg){
  try{
    if(typeof notify==='function'){notify(msg);return}
    if(typeof window.v222Pop==='function'){window.v222Pop('分享',msg);return}
  }catch(e){}
  try{alert(msg)}catch(e){}
}

function v83HasHost(kind){
  try{
    if(kind==='oss')return !!(window.ColorboxAI&&window.ColorboxAI.oss&&typeof window.ColorboxAI.oss.uploadFile==='function');
    if(kind==='bbs')return !!(window.ColorboxAI&&window.ColorboxAI.request&&window.ColorboxAI.request.bbs&&typeof window.ColorboxAI.request.bbs.openPostEditor==='function');
  }catch(e){}
  return false;
}

window.v83SharePoster=function(){
  /* 无宿主：明确提示，不报错、不伪造 */
  if(!v83HasHost('oss')||!v83HasHost('bbs')){
    v83Toast('需在虎扑 App 内分享到虎扑发帖');
    return;
  }
  var btn=document.getElementById?document.getElementById('v83-share-btn'):null;
  var oldTxt=btn?btn.textContent:'';
  if(btn){btn.disabled=true;btn.textContent='正在生成海报…'}
  var done=function(){if(btn){btn.disabled=false;btn.textContent=oldTxt||'📤 分享到虎扑'}};

  v83PosterToBlob().then(function(blob){
    if(btn)btn.textContent='正在上传图片…';
    var name='career-'+(Date.now())+'.png';
    var file=blob;
    try{
      if(typeof File==='function')file=new File([blob],name,{type:'image/png'});
    }catch(e){}
    return window.ColorboxAI.oss.uploadFile({file:file,filename:name});
  }).then(function(res){
    if(!res||res.code!==200){throw new Error((res&&res.message)||'图片上传失败')}
    var url='';
    try{
      url=(res.data&&(res.data.url||res.data.fileUrl||res.data.cdnUrl))||res.url||'';
    }catch(e){}
    if(!url&&res&&res.data&&typeof res.data==='string')url=res.data;
    if(!url)throw new Error('图片上传成功但未拿到图片地址');
    var copy=v83ShareCopy();
    if(btn)btn.textContent='正在打开发帖页…';
    return window.ColorboxAI.request.bbs.openPostEditor({
      title:copy.title,
      content:copy.content,
      imageUrl:url
    });
  }).then(function(res){
    done();
    if(res&&res.code!==200){v83Toast((res&&res.message)||'打开发帖页失败');return}
    /* 成功：发帖页已拉起，不需要额外提示 */
  }).catch(function(e){
    done();
    v83Toast('分享失败：'+(e&&e.message?e.message:'请稍后重试'));
  });
};

/* 把分享按钮插到退役海报顶部。
   【注意】v81 里的 v81RetiredBlock 是 IIFE 局部引用，改 window.v81RetiredBlock
   影响不到它的调用点（实测插不进去）。所以这里包装**最外层 renderRetired**，
   在输出里按标记插入按钮 —— 这条路径对任何渲染顺序都成立。 */
try{
  if(typeof renderRetired==='function'&&!window.__v83RetirePatched){
    var __v83Retired=renderRetired;
    renderRetired=function(){
      var h=__v83Retired.apply(this,arguments);
      try{
        if(typeof h!=='string'||!h)return h;
        if(h.indexOf('v83-share')>=0)return h;
        /* 插到 v81 海报区块的第一个子元素之前（按钮在海报顶部） */
        var anchor='<section class="v81-retire">';
        if(h.indexOf(anchor)>=0)return h.replace(anchor,anchor+v83SharePosterHTML());
        /* 兜底：插到退役页容器开头 */
        var a2=h.indexOf('<section class="retired">');
        if(a2>=0)return h.slice(0,a2+'<section class="retired">'.length)+v83SharePosterHTML()+h.slice(a2+'<section class="retired">'.length);
        return h+v83SharePosterHTML();
      }catch(e){return h}
    };
    window.__v83RetirePatched=true;
  }
}catch(e){}

/* ==========================================================================
 * 样式
 * ========================================================================== */
try{
  var st83=document.createElement('style');
  st83.id='v83-style';
  st83.textContent=[
    '.v83-share{width:100%;margin:0 0 10px;padding:11px;border:1px solid #e8b45f;border-radius:14px;',
    'font-size:12.5px;font-weight:1000;color:#8a5a12;background:linear-gradient(180deg,#fff8e6,#ffeccb);',
    'box-shadow:0 2px 8px rgba(206,150,58,.2)}',
    '.v83-share:disabled{opacity:.6}'
  ].join('');
  document.head.appendChild(st83);
}catch(e){}

window.__v83Debug={mvp:v83MvpPasses,decay:v83ApplyDecay,copy:v83ShareCopy,
  poster:v83PosterToBlob,share:v83SharePoster,
  guards:{award:!!window.__v83AwardGuard,age:!!window.__v83AgeGuard,retire:!!window.__v83RetirePatched}};

})();

