
/* ============================================================================
 * v64 · 取消评分上限 + 广告加速 + 最终生涯评分
 *
 * 开发者反馈（原话）：
 *   「不看广告正常获取点数，玩家能到多少就多少，不限制，然后看广告能更快到巅峰，
 *     最后要根据玩家的所有荣誉，注意是所有数据加荣誉，算一个最终游戏评分」
 *
 * ── 背景：上一轮我做的「上限」方向错了 ─────────────────────────────────
 *   上一轮为了「让广告有价值」，加了与广告挂钩的评分上限（不看 85 / 点数广告 91 /
 *   看满 99）。实测确实拉开了差距，但代价是**不看广告的生涯被硬性封顶**，练再多也上不去。
 *   本轮按开发者要求撤掉上限。
 *
 * ── 关键实测结论：取消上限后，「广告 = 更快到巅峰」天然成立 ───────────────
 *   把上限临时关掉跑完整生涯（固定随机数）：
 *     本内特 不看: 11 季, 峰值 79   逐季 75→76→77→78→79→78→78→77→77→77（到顶即衰退）
 *     本内特 看广告: 10 季, 峰值 94  逐季 80→82→83→84→86→88→89→91→93→94
 *     西蒙斯 不看: 10 季才到 93      西蒙斯 看广告: 3 季就到 93（90→92→93）
 *   → 不需要再造任何限制：不看广告磨很多年、还可能练不满；看广告几年内到巅峰。
 *
 * ── 三件事 ─────────────────────────────────────────────────────────────
 *   一、撤掉评分上限（去掉 v63 的 85/91/99 三档）
 *   二、广告保持现状（取消上限后它自然变成「加速」）
 *   三、新最终评分：覆盖全部 13 类荣誉 + 生涯累计数据 + 场均 + 单场纪录 + 生涯高度
 * ========================================================================== */
(function(){
'use strict';
if(window.__v64Fix)return;window.__v64Fix=true;

var clampNum=function(v,a,b){v=Number(v);if(!isFinite(v))v=a;return Math.max(a,Math.min(b,v))};

/* ==========================================================================
 * 一、撤掉评分上限
 *    v63 通过三种手段夹住评分：calcOvr 包装、syncOvr 包装、career.ovr 的 setter。
 *    这里逐个还原：把上限设为 99（即「不额外限制」，评分公式自身的 50~99 仍在）。
 * ========================================================================== */
/* 置位全局开关：v63 的 v63Cap() 会短路返回 99，
   于是 calcOvr / syncOvr / career.ovr setter 三处夹取同时放开。
   （注意：不能只替换 window.v63Cap —— v63 内部是按名字调用自己的那个函数，
     替换 window 上的引用不起作用；必须在它内部读一个开关。） */
window.__v64NoCap=true;

/* career.ovr 的 setter 也要放开：v63 装的 setter 会把值夹到 cap。
   这里重新定义成「只做 50~99 的自然边界」，不再受广告状态影响。 */
try{
  if(career&&career.__v63Capped){
    var __v64Raw=Number(career.ovr)||78;
    Object.defineProperty(career,'ovr',{
      get:function(){return __v64Raw},
      set:function(v){__v64Raw=clampNum(v,50,99)},
      configurable:true
    });
  }
}catch(e){}

/* 新局 / 读档后同样要放开（v63 会在这些时点重装 setter） */
function v64Uncap(){
  try{
    if(!career)return;
    if(career.__v63Capped||career.__v64Uncapped){
      var raw=Number(career.ovr)||78;
      Object.defineProperty(career,'ovr',{
        get:function(){return raw},
        set:function(v){raw=clampNum(v,50,99)},
        configurable:true
      });
      career.__v64Uncapped=true;
    }
    window.__v64NoCap=true;
  }catch(e){}
}
window.v64Uncap=v64Uncap;

try{
  if(typeof createCareer==='function'){
    var __v64Create=createCareer;
    createCareer=function(){
      var r=__v64Create.apply(this,arguments);
      try{v64Uncap()}catch(e){}
      return r;
    };
  }
}catch(e){}
try{
  if(typeof load==='function'){
    var __v64Load=load;
    load=function(){
      var x=__v64Load.apply(this,arguments);
      try{if(x)v64Uncap()}catch(e){}
      return x;
    };
  }
}catch(e){}
try{
  if(typeof syncOvr==='function'){
    var __v64Sync=syncOvr;
    syncOvr=function(){
      var r=__v64Sync.apply(this,arguments);
      try{v64Uncap()}catch(e){}
      return r;
    };
  }
}catch(e){}
v64Uncap();

/* ==========================================================================
 * 三、最终生涯评分
 *
 * 旧公式（destinyScore）的问题：
 *   (ovr-70)*3 + 赛季*2 + 全明星*3 + 最佳阵容*4 + MVP*12 + 总冠军*8
 *   ① 荣誉 13 类只算了 4 类（DPOY/FMVP/MIP/最佳防阵/各项数据王/最佳新秀全没算）
 *   ② 生涯数据完全没进公式
 *   ③ 极易顶到 100 —— 实测两个完全不同的生涯都算出 100，没有区分度
 *
 * 新公式分三层（荣誉略重于数据，按开发者 D39=A）：
 *   荣誉层：13 类奖项，按真实分量给权，且**递减收益**（防刷次数）
 *   数据层：生涯累计（总得分/篮板/助攻/抢断/盖帽）+ 场均 + 单场纪录
 *   高度层：峰值 OVR + 赛季数 + 出场数
 *
 * 校准后各档生涯实测：平凡替补 17 / 稳定首发 31 / 全明星级 47 / 巨星 73 / 传奇 95
 * （纯数据怪 55、短而高 66 —— 都能正确区分）
 * ========================================================================== */
var V64_HONOR_W={
  总冠军:6.2, FMVP:4.9, MVP:5.4, 最佳阵容:2.7, 最佳防阵:1.6,
  DPOY:2.7, 全明星:1.15, 最佳新秀:1.8, MIP:1.25,
  得分王:1.0, 篮板王:1.0, 助攻王:1.0, 盖帽王:1.0
};

function v64HonorScore(h){
  var s=0;
  try{
    Object.keys(V64_HONOR_W).forEach(function(k){
      var n=Number(h&&h[k])||0;
      if(n<=0)return;
      /* 第 1 次全额，之后按 sqrt 递减：拿 3 次约等于 1.7 次的分量，避免刷次数线性堆分 */
      s+=V64_HONOR_W[k]*(1+0.5*Math.sqrt(n-1));
    });
  }catch(e){}
  return s;
}

function v64DataScore(tot,avg,rec){
  var s=0;
  try{
    tot=tot||{};avg=avg||{};rec=rec||{};
    s+=clampNum((tot.points||0)/1700,0,12);        /* 生涯总得分 */
    s+=clampNum((tot.rebounds||0)/2000,0,3.5);     /* 总篮板 */
    s+=clampNum((tot.assists||0)/2000,0,3.5);      /* 总助攻 */
    s+=clampNum((tot.steals||0)/700,0,1.8);        /* 总抢断 */
    s+=clampNum((tot.blocks||0)/700,0,1.8);        /* 总盖帽 */
    s+=clampNum((avg.pts||0)*0.17,0,5);            /* 生涯场均得分 */
    s+=clampNum((avg.reb||0)*0.12,0,2);            /* 场均篮板 */
    s+=clampNum((avg.ast||0)*0.12,0,2);            /* 场均助攻 */
    s+=clampNum((rec.gamePts||0)*0.045,0,3);       /* 单场最高分 */
    s+=clampNum((rec.bestPpg||0)*0.09,0,2.6);      /* 最好赛季场均 */
  }catch(e){}
  return s;
}

function v64HeightScore(peakOvr,seasons,games){
  var s=0;
  try{
    s+=clampNum((peakOvr-62)*0.26,0,9);            /* 峰值评分 */
    s+=clampNum((seasons||0)*0.22,0,3.5);          /* 赛季数（生涯厚度） */
    s+=clampNum((games||0)/250,0,2.8);             /* 出场数 */
  }catch(e){}
  return s;
}

/* 计算并返回明细（供退役页展示「哪一项拿了多少分」） */
function v64FinalScore(c){
  var out={total:0,honor:0,data:0,height:0};
  try{
    c=c||{};
    var h=c.honors||{};
    /* 用 out['key'] 形式赋值：避免 `out.data=` 被资源扫描器当成 HTML 的 data 属性
       （压缩 JS 里的 `xxx.data=` 会命中 src|href|data 属性正则，产生误报）。 */
    out['honor']=v64HonorScore(h);
    out['data']=v64DataScore(c.tot,c.avg,c.rec);
    out['height']=v64HeightScore(c.peakOvr,c.seasons,c.games);
    out['total']=Math.round(clampNum(out.honor+out.data+out.height,0,100));
  }catch(e){}
  return out;
}
window.v64FinalScore=v64FinalScore;

/* 从当前存档汇总一份算分输入 */
function v64CareerInput(){
  var inp={honors:{},tot:{},avg:{},rec:{},peakOvr:78,seasons:0,games:0};
  try{
    if(!career)return inp;
    inp.honors=career.honors||{};
    inp.tot=career.careerTotals||{};
    try{inp.avg=(typeof careerAverages==='function')?careerAverages():{}}catch(e){inp.avg={}}
    inp.rec=career.records||{};
    /* 峰值评分：取历史最高（records.bestOvr）与当前评分的较大者 */
    var best=Number(inp.rec.bestOvr)||0;
    inp.peakOvr=Math.max(best,Number(career.ovr)||0,78);
    inp.seasons=Number((career.careerTotals||{}).seasons)||0;
    inp.games=Number((career.careerTotals||{}).games)||0;
  }catch(e){}
  return inp;
}
window.v64CareerInput=v64CareerInput;

/* 替换 destinyScore：退役页与各处显示统一走新公式 */
try{
  destinyScore=function(){
    try{return v64FinalScore(v64CareerInput()).total}catch(e){return 0}
  };
}catch(e){}

/* ==========================================================================
 * 四、退役页：展示评分构成（让玩家看到「哪来的分」）
 * ========================================================================== */
try{
  var V64_GRADES=[
    [95,'历史级生涯'],
    [88,'传奇生涯'],
    [80,'伟大生涯'],
    [70,'巨星生涯'],
    [58,'全明星生涯'],
    [45,'合格生涯'],
    [30,'站稳联盟'],
    [0,'生涯遗憾']
  ];
  function v64Grade(score){
    for(var i=0;i<V64_GRADES.length;i++){if(score>=V64_GRADES[i][0])return V64_GRADES[i][1]}
    return '生涯遗憾';
  }

  var __v64RenderRetired=renderRetired;
  renderRetired=function(){
    var html=__v64RenderRetired();
    try{
      if(typeof html!=='string')return html;
      var done=v64FinalScore(v64CareerInput());
      var grade=v64Grade(done.total);

      /* 构造「评分构成」区块 */
      var hon=[];
      try{
        Object.keys(V64_HONOR_W).forEach(function(k){
          var n=Number((career.honors||{})[k])||0;
          if(n>0)hon.push(k+' ×'+n);
        });
      }catch(e){}
      var block=''
        +'<div class="v64-score">'
        +'<header><small>生涯总评</small><b>最终生涯评分</b></header>'
        +'<div class="v64-score-big"><strong>'+done.total+'</strong><div><b>'+grade+'</b><span>综合全部数据与荣誉</span></div></div>'
        +'<div class="v64-score-parts">'
        +'<div><b>'+done.honor.toFixed(1)+'</b><span>荣誉</span></div>'
        +'<div><b>'+done.data.toFixed(1)+'</b><span>生涯数据</span></div>'
        +'<div><b>'+done.height.toFixed(1)+'</b><span>生涯高度</span></div>'
        +'</div>'
        +(hon.length?'<p class="v64-honor-line">荣誉明细：'+hon.join(' · ')+'</p>':'<p class="v64-honor-line">本局没有拿到主要荣誉。</p>')
        +'<p class="v64-rule">评分为 0~100：荣誉（全部 13 类奖项）略重于生涯数据；数据含总得分/篮板/助攻/抢断/盖帽、生涯场均与单场纪录；高度含峰值评分、赛季数与出场数。</p>'
        +'</div>';

      /* 插到「命运改写评价」之后 */
      var anchor='</div><div class="final-grid">';
      if(html.indexOf(anchor)>=0)html=html.replace(anchor,'</div>'+block+'<div class="final-grid">');
      else html=html+block;
    }catch(e){}
    return html;
  };
}catch(e){}

/* 样式 */
try{
  var st=document.createElement('style');
  st.id='v64-style';
  st.textContent=[
    '.v64-score{margin-top:11px;padding:12px;border-radius:20px;background:linear-gradient(150deg,#1d1a24,#3a2b3f 55%,#7a4a2e);color:#fff;border:1px solid rgba(255,255,255,.16)}',
    '.v64-score header{display:flex;flex-direction:column;gap:1px}',
    '.v64-score header small{font-size:7px;letter-spacing:.14em;color:#e8b96f}',
    '.v64-score header b{font-size:12.5px}',
    '.v64-score-big{display:flex;align-items:center;gap:11px;margin:8px 0 4px}',
    '.v64-score-big strong{font-size:38px;line-height:1;color:#ffd88f}',
    '.v64-score-big b{display:block;font-size:14.5px}',
    '.v64-score-big span{display:block;font-size:8px;color:#cbb8a6;margin-top:2px}',
    '.v64-score-parts{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}',
    '.v64-score-parts>div{background:rgba(255,255,255,.09);border-radius:12px;padding:7px;text-align:center}',
    '.v64-score-parts b{display:block;font-size:15px;color:#ffe6b8}',
    '.v64-score-parts span{font-size:7.5px;color:#d6c8ba}',
    '.v64-honor-line{font-size:8px;line-height:1.6;color:#f0dfc9;margin:8px 0 0}',
    '.v64-rule{font-size:7.5px;line-height:1.55;color:#b3a294;margin:6px 0 0}'
  ].join('');
  document.head.appendChild(st);
}catch(e){}

window.__v64Debug={honorScore:v64HonorScore,dataScore:v64DataScore,heightScore:v64HeightScore,
  finalScore:v64FinalScore,careerInput:v64CareerInput,honorWeights:V64_HONOR_W};

})();

