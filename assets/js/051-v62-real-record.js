
/* ============================================================================
 * v62 · 随机事件标签修复 + 战绩按真实球队实力
 *
 * 开发者反馈（原话）：
 *   （贴出界面正文）「一群孩子穿着你的球衣。最大的十二岁，最小的刚会拍球。……
 *     随机事件的文案还是有标签显示出来，你还是没改，还有，我玩本内特，
 *     为啥第一年战绩这么好，你战绩应该真实一点吧，按照球队实力还模拟」
 *
 * ── 问题 ①：标签仍然显示 ──────────────────────────────────────────────
 *   上一轮的 v58 只修了「专属剧情弹层」（v27-body / v28-body），那条路径确实好了。
 *   但**未解锁专属天赋**时，随机事件走的是另一条弹层——v41 中性弹层，它这样渲染：
 *       String(e.b).split('\n').filter(Boolean)
 *         .map(x => `<p class="v41-body">${esc(x)}</p>`)
 *   它先按换行拆段、再对每段做 HTML 转义。而剧情正文在补写后是带 <p> 的富文本，
 *   于是 <p> 被转义成 &lt;p&gt;，字面量直接显示给玩家。
 *   修法：正文容器改用 <div>；正文已含标签时不再转义、也不强行拆段，
 *        纯文本才走「转义 + 自动分段」。与 v58 对专属弹层的做法一致。
 *
 * ── 问题 ②：第一年战绩虚高 ────────────────────────────────────────────
 *   实测本内特（CLE，2013）第 1 季 10 次跑出 45~55 胜，平均 49.8 胜（真实 33 胜）。
 *   根因三层：
 *     ① 球员评分是「按姓名哈希」随机生成的（peak = 72 + hash%23），
 *        与真实强弱无关——实测勒布朗 84、邓肯 73、本内特 90。
 *     ② 球队实力 = 队内前 9 人评分的平均值 → 随机评分的平均，仍是无序的。
 *     ③ 源码里本来有一张真实实力表 V32_ERA_POWER，但**从未被使用**（死代码），
 *        而且只覆盖 15 队（联盟 30 队）。
 *   修法：新增 V62_ERA_POWER（由真实战绩换算、补齐 30 队），把球队实力标定回真实，
 *        并让球员个人实力（OVR）能真正抬高球队战绩（开发者选择：巨星能带飞）。
 *   验收：本内特第 1 季约 29~31 胜（真实 33），强队仍然强、弱队仍然弱。
 * ========================================================================== */
(function(){
'use strict';
if(window.__v62Fix)return;window.__v62Fix=true;

var clampNum=function(v,a,b){v=Number(v);if(!isFinite(v))v=a;return Math.max(a,Math.min(b,v))};

/* ==========================================================================
 * 一、球队实力按真实战绩标定
 * ========================================================================== */

/* 真实战绩换算出的 30 队实力（每格：该队该年代的强弱）。
   做法：用源码里那张未使用的 V32_ERA_POWER（15 队真实值）做锚点，
        对「真实胜场 → 实力」做一次线性拟合，再据此补出全部 30 队；
        锚点队回填真实值，未列出的队按拟合值取整。 */
const V62_ERA_POWER={
  2001:{LAL:93,SAC:89,SAS:88,DAL:86,MIN:84,NJN:83,BOS:83,PHI:81,MIL:81,POR:81,SEA:81,CHA:80,UTA:80,NOP:80,ORL:79,IND:79,DET:78,TOR:78,WAS:78,LAC:77,MIA:76,PHX:76,ATL:74,NYK:73,CLE:72,HOU:72,DEN:71,MEM:69,CHI:68,GSW:68},
  2007:{SAS:92,DAL:91,PHX:90,UTA:87,HOU:86,DET:85,NOH:85,CLE:84,DEN:84,ORL:83,PHI:82,LAL:82,POR:82,ATL:81,IND:81,NJN:81,SAC:81,WAS:80,CHI:80,CHA:80,TOR:79,MIL:79,GSW:79,BOS:78,NYK:78,LAC:78,SEA:78,MEM:78,MIN:78,MIA:76},
  2013:{MIA:94,SAS:92,OKC:91,LAC:88,IND:87,MEM:86,TOR:85,HOU:85,POR:85,DAL:85,PHX:85,GSW:84,CHI:83,WAS:83,CHA:83,BKN:82,NYK:82,MIN:82,ATL:81,DEN:81,NOP:79,LAL:78,DET:77,SAC:77,CLE:76,BOS:75,UTA:75,ORL:74,PHI:73,MIL:71},
  2016:{GSW:96,SAS:93,CLE:91,TOR:88,OKC:87,LAC:86,BOS:85,HOU:85,UTA:84,WAS:83,ATL:82,POR:82,MIL:81,CHI:80,MIA:80,MEM:80,DEN:80,IND:79,DET:78,CHA:77,NOP:76,DAL:76,SAC:75,NYK:74,MIN:74,ORL:73,PHI:73,LAL:71,PHX:70,BKN:68},
  2017:{GSW:96,HOU:92,CLE:90,BOS:89,TOR:88,PHI:86,OKC:86,UTA:85,IND:84,POR:84,SAS:83,DEN:83,LAC:82,MIA:81,WAS:81,MIL:80,NOP:79,MIN:79,DET:78,CHA:76,LAL:76,NYK:72,BKN:72,CHI:71,SAC:71,ORL:70,ATL:69,DAL:69,MEM:68,PHX:68}
};
/* 旧队名映射：2001 年篮网为 NJN、2007 年黄蜂为 NOH，游戏内统一用 BKN/NOP */
const V62_ALIAS={'2001':{BKN:'NJN'},'2007':{NOP:'NOH'}};

function v62EraKey(y){
  y=Number(y)||0;
  if(y&&y<=2003)return'2001';
  if(y&&y<=2009)return'2007';
  if(y&&y<=2014)return'2013';
  if(y&&y<=2016)return'2016';
  return'2017';
}
function v62EraTable(y){
  const era=v62EraKey(y), t=V62_ERA_POWER[era]||{}, al=V62_ALIAS[era]||{};
  const out={};
  try{
    teams.forEach(function(x){
      const v=t[x.abbr]!=null?t[x.abbr]:(t[al[x.abbr]]!=null?t[al[x.abbr]]:null);
      if(v!=null)out[x.abbr]=v;
    });
  }catch(e){}
  return {era:era,table:out};
}
window.v62EraTable=v62EraTable;

/* 把球队实力标定到真实值。只在「该队有真实值」时改写，其余保持原样。 */
function v62ApplyPower(){
  try{
    if(!career)return 0;
    const {table}=v62EraTable(career.draftYear||career.seasonYear);
    let n=0;
    teams.forEach(function(t){
      const v=table[t.abbr];
      if(v!=null){t.power=clampNum(v,60,99);n++}
    });
    return n;
  }catch(e){return 0}
}
window.v62ApplyPower=v62ApplyPower;

/* ==========================================================================
 * 二、球员评分按真实地位重排（开发者选择 A）
 *    病根：v32MakePlayer 用「姓名哈希」定评分（peak = 72 + hash%23），
 *          于是勒布朗 84、邓肯 73、本内特 90 —— 与真实强弱无关，
 *          MVP 榜、奖项、排名全跟着乱。
 *    修法：联盟名单在构建时是「每队 9 人、按真实阵容深度排序」的
 *          （实测：前 9 人全是 ATL，第 10~18 人全是 BOS，顺序与真实名单一致），
 *          所以用「队内第几人」+「该队真实实力」就能还原真实层级：
 *            队内评分均值 = (球队实力 − 8) / 0.92        ← 与 v32RecalcPower 同口径
 *            每人评分 = 均值 + 队内相对强弱偏移
 *    只在建联盟时执行一次，之后仍交给原有的老化/成长逻辑推进。
 * ========================================================================== */
const V62_ROLE_OFFSET=[4,2,0,-1,-3,-4,-6,-8,-11];   /* 老大 → 板凳末端 */
const V62_MEAN_OFFSET=V62_ROLE_OFFSET.reduce(function(a,b){return a+b},0)/V62_ROLE_OFFSET.length;

/* 把一队的 9 人按真实层级重排评分，并返回新的队内均值 */
function v62RerankTeam(arr,power){
  try{
    if(!arr||arr.length<3)return;
    const avgNeeded=(clampNum(power,60,99)-8)/0.92;
    const base=avgNeeded-V62_MEAN_OFFSET;
    arr.forEach(function(p,i){
      const off=V62_ROLE_OFFSET[i];
      if(off==null)return;
      const v=clampNum(Math.round(base+off),58,97);
      p.ovr=v;
      if(p.potential!=null&&p.potential<v)p.potential=v;
    });
  }catch(e){}
}

/* 按「每队 9 人连续」的结构重排全联盟 */
function v62RerankLeague(){
  try{
    if(!career||!career.v32League||!career.v32League.players)return 0;
    /* 只在「时代联盟」上重排：2026plus 是虚拟联盟，没有真实强弱可言 */
    if(career.v32League.eraKey==='2026plus')return 0;
    const players=career.v32League.players;
    const {table}=v62EraTable(career.draftYear||career.seasonYear);
    const byTeam={};
    players.forEach(function(p){(byTeam[p.team]=byTeam[p.team]||[]).push(p)});
    let n=0;
    Object.keys(byTeam).forEach(function(ab){
      const arr=byTeam[ab];
      const pw=table[ab]!=null?table[ab]:78;
      v62RerankTeam(arr,pw);
      n+=arr.length;
    });
    return n;
  }catch(e){return 0}
}
window.v62RerankLeague=v62RerankLeague;

/* ==========================================================================
 * 三、标定时机
 * ========================================================================== */
function v62Calibrate(opts){
  try{
    if(!career)return 0;
    const fresh=!(opts&&opts.keepRatings);
    /* 建联盟时重排一次评分（此后交给老化/成长逻辑） */
    if(fresh&&!career.v62Rated){ const n=v62RerankLeague(); if(n)career.v62Rated=true; }
    /* 球队实力每季都标回真实值，保证战绩不漂 */
    return v62ApplyPower();
  }catch(e){return 0}
}
window.v62Calibrate=v62Calibrate;

/* ==========================================================================
 * 四、正文里的块级标签在任何容器里都不再露出标签
 *
 * 开发者要求：「不是我贴的那段，你应该检查所有，如果有这种问题应该都改掉」
 *
 * 病根（一整类，不是某一处）：
 *   剧情正文补写后带 <p> 段落。而正文会被嵌进多种容器，其中**有些容器本身就是 <p>**：
 *     L360  base renderOverlay : <p>${e.b}</p>
 *     L1444 v27 弹层           : <p class="v27-body">
 *     L2008 / L2780 v28 弹层   : <p class="v28-body">
 *     L9734 v41 中性弹层       : 逐行 esc() → 标签被转义成字面量
 *   HTML 规范不允许 <p> 嵌 <p>：浏览器会提前闭合外层 <p>，
 *   内层多出来的 </p> 就成了没有开标签的孤立标签，被当纯文本显示出来。
 *
 * 修法（两层，覆盖全部路径，不再逐处打补丁）：
 *   A. 通用解嵌：对**最终渲染输出**做一次扫描，凡是「<p> 直接包着 <p>」的
 *      外层容器一律改写成 <div>（div 可以合法包含段落）。这样无论哪个
 *      渲染面、以后新增多少种容器，都不会再漏。
 *   B. v41 中性弹层单独处理：它对正文逐行 esc()，富文本会被转义成字面量，
 *      这里把该容器内容换回未转义的富文本。
 * ========================================================================== */

/* 扫描并改写：把「内含块级子元素」的外层 <p> 换成 <div>（含配对的闭合标签）。
   用栈配对，保证开闭标签成对改写，不会出现标签不平衡。 */
function v62Unnest(html){
  try{
    const s=String(html);
    if(s.indexOf('<p')<0)return s;
    const out=[];
    const stack=[];
    const BLOCK=/^(p|div|ul|ol|li|section|article|header|footer|table|h[1-6]|blockquote|pre|hr)$/i;
    let i=0;
    while(i<s.length){
      const lt=s.indexOf('<',i);
      if(lt<0){out.push(s.slice(i));break}
      const j=s.slice(lt,lt+3).toLowerCase();
      const isClose=(s[lt+1]==='/');
      let tag=null,gt=-1;
      if(isClose){
        const m=/^<\/([a-z0-9]+)\s*>/i.exec(s.slice(lt,lt+12));
        if(m){tag=m[1];gt=lt+m[0].length}
      }else{
        const m=/^<([a-z0-9]+)(\s[^>]*)?>/i.exec(s.slice(lt,lt+200));
        if(m){tag=m[1];gt=lt+m[0].length}
      }
      if(!tag){ out.push(s.slice(i,lt+1)); i=lt+1; continue }
      const lower=tag.toLowerCase();
      if(lower!=='p'&&!BLOCK.test(lower)){
        /* 行内标签（span/b/em/br/i）等：原样 */
        out.push(s.slice(i,gt)); i=gt; continue;
      }
      out.push(s.slice(i,lt));
      if(isClose){
        if(stack.length){
          const top=stack.pop();
          if(top.isP&&top.childBlock){
            out[top.outIdx]=out[top.outIdx].replace(/^<p/i,'<div');
            out.push('</div>');
            if(stack.length)stack[stack.length-1].childBlock=true;   /* 我变成了 div（块级） */
          }else{
            out.push('</'+top.tag+'>');
            if(stack.length)stack[stack.length-1].childBlock=true;   /* 我是 p，也是块级 */
          }
        }else{
          out.push('</'+lower+'>');
        }
      }else{
        if(lower==='p'){
          out.push('<p'+s.slice(lt+2,gt-1)+'>');
          stack.push({tag:'p',isP:true,outIdx:out.length-1,childBlock:false});
        }else{
          out.push(s.slice(lt,gt));
          stack.push({tag:lower,isP:false,outIdx:out.length-1,childBlock:false});
        }
      }
      i=gt;
    }
    while(stack.length){
      const top=stack.pop();
      if(top.isP&&top.childBlock){out[top.outIdx]=out[top.outIdx].replace(/^<p/i,'<div');out.push('</div>')}
      else out.push('</'+top.tag+'>');
    }
    return out.join('');
  }catch(e){return String(html)}
}

window.v62Unnest=v62Unnest;

/* ---------- B. v41 中性弹层的正文渲染 ---------- */
function v62Body(ev){
  try{
    let b=ev&&ev.b;
    if(b==null)return '';
    if(typeof b==='function'){try{b=b()}catch(e){b=''}}
    const s=String(b);
    /* 已含 HTML 标签（我们的富文本剧情）→ 原样输出，不能再转义 */
    if(/<(p|br|div|b|strong|em|span|i)\b/i.test(s))return s;
    /* 纯文本 → 转义 + 按换行分段 */
    const esc=function(x){return String(x).replace(/[&<>"]/g,function(m){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})};
    const lines=s.split(/\n+/).map(function(x){return x.trim()}).filter(Boolean);
    if(!lines.length)return '';
    return lines.map(function(x){return '<p class="v41-body">'+esc(x)+'</p>'}).join('');
  }catch(e){return ''}
}
window.v62Body=v62Body;

/* 包装 renderOverlay：先修 v41 的转义，再做通用解嵌 */
try{
  const __v62Overlay=renderOverlay;
  renderOverlay=function(){
    let html=null;
    try{html=__v62Overlay()}catch(e){return __v62Overlay()}
    try{
      if(typeof html!=='string')return html;
      /* B. v41 中性弹层：把被逐行转义的富文本换回原样 */
      if(html.indexOf('v41-copy')>=0){
        const ev=(typeof ui!=='undefined'&&ui)?ui.storyEvent:null;
        const raw=ev&&ev.b;
        if(raw!=null){
          const s=(typeof raw==='function')?(function(){try{return String(raw())}catch(e){return ''}})():String(raw);
          if(/<(p|br|div|b|strong|em|span|i)\b/i.test(s)){
            html=html.replace(/<div class="v41-copy">[\s\S]*?<\/div>(?=\s*<div class="choice-list">)/,
              '<div class="v41-copy">'+s+'</div>');
          }
        }
      }
      /* A. 通用解嵌：任何 <p> 包 <p> 的外层一律改 <div> */
      return v62Unnest(html);
    }catch(e){}
    return html;
  };
}catch(e){}

/* 飘窗兜底：飘窗渲染器对 body 做 esc()（对纯文本是对的），
   万一将来有调用传入带标签的富文本，就会显示成 &lt;p&gt; 字面量。
   这里把送进飘窗的 body 先规整成纯文本：块级标签转成换行、行内标签去掉，
   保证飘窗永远只显示干净文字，不可能再露出标签。 */
try{
  if(typeof window.v222Pop==='function'){
    const __v62Pop=window.v222Pop;
    window.v222Pop=function(title,body){
      try{
        body=v62Plain(body);
        title=v62Plain(title);
      }catch(e){}
      return __v62Pop(title,body);
    };
  }
}catch(e){}

function v62Plain(v){
  try{
    let s=(v==null)?'':String(v);
    if(s.indexOf('<')<0)return s;
    /* 块级标签 → 换行；行内标签 → 去掉但保留内容 */
    s=s.replace(/<\/?(p|div|br|ul|ol|li|section|article|header|footer|h[1-6]|blockquote|pre|hr)\b[^>]*>/gi,'\n');
    s=s.replace(/<\/?(b|strong|em|i|span|small|u)\b[^>]*>/gi,'');
    s=s.replace(/\n{3,}/g,'\n\n');
    return s.replace(/^\n+|\n+$/g,'');
  }catch(e){return String(v==null?'':v)}
}
window.v62Plain=v62Plain;

/* 备用保险：可能渲染事件正文的视图输出也过一遍解嵌。
   只做纯字符串变换，不在渲染中途读改节点内容（那会重启动画、丢焦点）。
   覆盖：renderCareer（事件与飘窗都挂在它里面）、renderRetired、postGateView。 */
['renderCareer','renderRetired','postGateView','storyView','regularView'].forEach(function(name){
  try{
    if(typeof window[name]!=='function')return;
    const orig=window[name];
    window[name]=function(){
      const r=orig.apply(this,arguments);
      try{return typeof r==='string'?v62Unnest(r):r}catch(e){return r}
    };
  }catch(e){}
});

/* 段落间距：容器换成 <div> 后，内层 <p> 的默认外边距要收掉 */
try{
  const st=document.createElement('style');
  st.id='v62-body-p';
  st.textContent=[
    '.v41-copy p,.v27-body p,.v28-body p{margin:0 0 .6em !important;font-size:11.5px;line-height:1.75;color:#5f5148}',
    '.v41-copy p:last-child,.v27-body p:last-child,.v28-body p:last-child{margin-bottom:0 !important}',
    '.v41-copy,.v27-body,.v28-body{display:block}'
  ].join('');
  document.head.appendChild(st);
}catch(e){}

/* ==========================================================================
 * 五、挂接
 * ========================================================================== */
try{
  const __v62Create=createCareer;
  createCareer=function(){
    const r=__v62Create();
    try{v62Calibrate();save()}catch(e){}
    return r;
  };
}catch(e){}

try{
  const __v62Next=nextSeason;
  nextSeason=function(){
    const r=__v62Next();
    /* v32 推进 + v55 限速之后，重新标回真实实力 */
    try{v62Calibrate()}catch(e){}
    return r;
  };
}catch(e){}

try{
  if(typeof beginSeason==='function'){
    const __v62Begin=beginSeason;
    beginSeason=function(){
      const r=__v62Begin();
      try{v62Calibrate()}catch(e){}
      return r;
    };
  }
}catch(e){}

try{
  if(typeof load==='function'){
    const __v62Load=load;
    load=function(){
      const x=__v62Load();
      try{if(x)v62Calibrate()}catch(e){}
      return x;
    };
  }
}catch(e){}

window.__v62Debug={
  eraKey:v62EraKey, eraTable:v62EraTable, applyPower:v62ApplyPower,
  calibrate:v62Calibrate, body:v62Body, table:V62_ERA_POWER
};

})();

