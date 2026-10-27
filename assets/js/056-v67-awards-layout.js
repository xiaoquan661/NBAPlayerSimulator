
/* ============================================================================
 * v67 · 赛季奖项揭晓显示得主 + 赛季主界面重排
 *
 * 开发者反馈（原话）：
 *   「还有赛季奖项揭幕应该显示谁获得了那个奖，还有赛季主界面，
 *     mvp实时榜太大了，主要视觉应该是赛季红绿豆和球员数据上」
 *
 * ── 一、奖项揭晓显示得主 ─────────────────────────────────────────────
 *   现状：v35 的奖项页只列「你自己的」奖项卡片（奖项名 + 你的状态 + 说明），
 *        看不到每个奖是谁拿的。
 *   而 v29 层本来有得主数据（v29AwardWinners / v29Candidates），但被 v35 覆盖，
 *        得主信息就没显示出来。
 *   修法：在 v35 的每张奖项卡上补一行「得主：XXX」，并附上竞争者；
 *        自己拿到时高亮标「你」。
 *
 * ── 二、赛季主界面重排 ───────────────────────────────────────────────
 *   现状：MVP 实时榜（.v218-mvp）是整块大卡片（含标题 + 5 行列表 + 说明段），
 *        插在赛季页靠前，视觉上压过了红绿豆与球员数据。
 *   修法：
 *     · MVP 榜压缩成一行条形（名次 + 前 3 名极简 + 你自己的名次），
 *       移到球员数据区之后，不再抢版面。
 *     · 红绿豆（胜负轨迹）与球员数据保持在最前、最显眼。
 * ========================================================================== */
(function(){
'use strict';
if(window.__v67Fix)return;window.__v67Fix=true;

function esc67(v){return String(v==null?'':v).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})}

/* ==========================================================================
 * 一、奖项揭晓：给每张卡补「得主」
 * ========================================================================== */
function v67Winners(){
  /* 取该赛季各奖得主。优先复用 v29 的实现（它已考虑「我获奖则得主是我」）。 */
  try{
    if(typeof v29AwardWinners==='function'){
      var w=v29AwardWinners();
      if(w&&typeof w==='object')return w;
    }
  }catch(e){}
  return null;
}
window.v67Winners=v67Winners;

/* 把得主映射到「奖项 key」。v29 返回的是固定几个键（MVP/DPOY/ROY/SCORE…），
   v35 的卡片用的是中文标题，这里做一次对应。 */
function v67WinnerFor(card,w){
  try{
    if(!w)return null;
    var t=String(card&&card.title||'');
    var key=String(card&&card.key||'');
    /* 先按 key 精确取（得主表的键：MVP/DPOY/ROY/SCORE/REB/AST/BLK/STEAL）。
       必须放在前面：否则「助攻王」在遍历里匹配不上，会退到循环末尾拿到别的奖项。 */
    if(key&&w[key])return w[key];
    /* 再按中文标题精确匹配 label */
    var kk=Object.keys(w);
    for(var j=0;j<kk.length;j++){
      var cc=w[kk[j]];
      if(cc&&cc.label&&String(cc.label)===t)return cc;
    }
    /* 最后按「卡片标题包含 label」的宽松匹配（阵容类卡片走这里） */
    for(var m=0;m<kk.length;m++){
      var c2=w[kk[m]];
      if(!c2||!c2.label)continue;
      var lb=String(c2.label);
      if(t&&(t.indexOf(lb)>=0||lb.indexOf(t)>=0))return c2;
    }
    var cands=[];
    Object.keys(w).forEach(function(k){cands.push(w[k])});
    for(var i=0;i<cands.length;i++){
      var c=cands[i];
      if(!c||!c.label)continue;
      var lb2=String(c.label);
      if(lb2===t||lb2===key)return c;
    }
    /* 按 key 直接取 */
    if(key&&w[key])return w[key];
    return null;
  }catch(e){return null}
}

/* 给 v35 奖项页补得主行（纯字符串后处理，不改既有逻辑） */
try{
  if(typeof awardsView==='function'){
    var __v67Awards=awardsView;
    awardsView=function(){
      var html=null;
      try{html=__v67Awards()}catch(e){return __v67Awards()}
      try{
        if(typeof html!=='string'||html.indexOf('v35-award')<0)return html;
        var w=v67Winners();
        if(!w)return html;
        var p=(typeof currentP==='function'&&currentP())?currentP():null;
        var meName=p?p.zh:'你';
        var cards=(career&&career.seasonAwards)||[];

        /* 逐张卡：在 v35-status 后插入得主行 */
        var idx=0;
        html=html.replace(/<div class="v35-award ([^"]*)"([\s\S]*?)<\/div>\s*(?=<div class="v35-award|<\/div>)/g,function(m0,cls,body){
          return m0;
        });

        /* 更稳的做法：按卡片逐个处理（用 split 保留结构） */
        var parts=html.split('<div class="v35-award ');
        if(parts.length<2)return html;
        var out=[parts[0]];
        for(var i=1;i<parts.length;i++){
          var seg=parts[i];
          /* 【必须按「这张卡自己的名字」取数据，不能按数组下标】
             实测：奖项卡的渲染顺序与 career.seasonAwards 的下标顺序并不一致，
             用 cards[i-1] 会把别的奖项的得主写到这张卡上
             —— 表现就是「助攻王高亮了、得主却写着别人」。
             这里从这段 HTML 里读出 v35-name，再按名字找回对应的奖项卡。 */
          var nameInSeg=(seg.match(/v35-name">([^<]*)</)||[])[1]||'';
          var card=null;
          for(var ci=0;ci<cards.length;ci++){
            var cc=cards[ci];
            if(cc&&(cc.title===nameInSeg||cc.key===nameInSeg)){card=cc;break}
          }
          if(!card)card=cards[i-1]||{};
          var win=v67WinnerFor(card,w);
          var won=seg.indexOf('v35-award')<0&&seg.indexOf('won"')>=0;
          if(win&&win.winner){
            var isMe=(String(win.winner)===String(meName));
            var line='<div class="v67-winner">'+(isMe?'🏆 得主：<b>你</b>':'得主：<b>'+esc67(win.winner)+'</b>')+'</div>';
            /* 【必须插在 v35-body 内部、并且用配平方式找它的闭合】
               旧写法 seg.indexOf('</div>', indexOf('class="v35-body"')) 只是
               「往后找第一个 </div>」，当卡片里还有 v35-seal 等嵌套节点时
               会把得主行插到卡片外面 —— 表现就是那张卡的得主行漏掉/串位。
               这里从 v35-body 起点开始做 div 配平，找到它真正的闭合再插入。 */
            var bs=seg.indexOf('<div class="v35-body"');
            if(bs>=0){
              var dep=0,pos=bs,closed=-1;
              while(pos<seg.length){
                if(seg.slice(pos,pos+4)==='<div')dep++;
                else if(seg.slice(pos,pos+6)==='</div>'){dep--;if(dep===0){closed=pos+6;break}}
                pos++;
              }
              if(closed>0)seg=seg.slice(0,closed-6)+line+seg.slice(closed-6);
              else seg=seg+line;
            }else seg=seg+line;
          }
          out.push(seg);
        }
        html=out.join('<div class="v35-award ');
        return html;
      }catch(e){}
      return html;
    };
  }
}catch(e){}

/* 得主行样式 */
try{
  var st=document.createElement('style');
  st.id='v67-style';
  st.textContent=[
    '.v67-winner{margin-top:5px;padding-top:5px;border-top:1px dashed rgba(214,170,96,.35);font-size:8px;color:#e0c89a;line-height:1.5}',
    '.v67-winner b{color:#ffd88f;font-weight:1000}',
    /* MVP 榜紧凑版：一条条形 */
    '.v67-mvp-bar{margin:8px 0;padding:8px 10px;border-radius:14px;background:#fff8ee;border:1px solid #efdfc9;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
    '.v67-mvp-bar>small{font-size:7px;color:#a97943;letter-spacing:.08em}',
    '.v67-mvp-bar>b{font-size:12.5px;color:#bc4438}',
    '.v67-mvp-bar>span{font-size:8px;color:#8b7565}',
    '.v67-mvp-bar .v67-seq{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto}',
    '.v67-mvp-bar .v67-seq i{font-style:normal;font-size:7.5px;color:#8b7565}',
    '.v67-mvp-bar .v67-seq i.me{color:#bc4438;font-weight:1000}',
    /* 压缩原 MVP 榜：内边距收紧、列表行变矮、说明段缩小 —— 保留结构但不再抢版面 */
    '.v218-mvp{margin:7px 0 !important;padding:8px 10px !important;border-radius:14px !important;box-shadow:none !important}',
    '.v218-mvp h3{font-size:12.5px !important}',
    '.v218-mvp header small{font-size:7px !important}',
    '.v218-mvp header>b{font-size:8.5px !important;padding:3px 7px !important}',
    '.v218-mvp-list>div{padding:3px 0 !important;font-size:8.5px !important}',
    '.v218-mvp>p{font-size:7.5px !important;line-height:1.45 !important;margin:4px 0 0 !important}',
    '.v218-me-rank{padding:3px 0 !important;font-size:8.5px !important}'
  ].join('');
  document.head.appendChild(st);
}catch(e){}

/* ==========================================================================
 * 二、赛季主界面：MVP 榜压缩成一行，并移到球员数据之后
 * ========================================================================== */
function v67CompactMvp(){
  /* 只保留**一个** MVP 榜，且用 v65 的评分口径（与奖项页同口径），
     避免「赛季页一个数字、奖项页另一个数字」自相矛盾。
     结构上仍保留 v218-mvp 容器与必要元素（其它层/测试依赖），
     只是改成紧凑排版、并把标题统一为「MVP榜」。 */
  try{
    if(!career)return '';
    var gp=(career.seasonStats&&career.seasonStats.gp)||0;
    var total=(career.seasonStats&&career.seasonStats.gp)||career.games||0;
    /* 出场不足：保留「样本不足」提示（既有结构） */
    if(gp<5){
      return '<section class="v218-mvp"><header><div><small>常规赛实时更新</small><h3>MVP榜</h3></div><b>样本不足</b></header><p>至少打 5 场后开始显示。个人数据、球队战绩和出勤会一起影响排名。</p></section>';
    }
    var rank=(typeof v65MvpRank==='function')?v65MvpRank():null;
    var top=[];
    try{
      var r=window.__v220MvpRace(false);
      if(r&&Array.isArray(r.list))top=r.list.filter(function(x){return !x.me}).slice(0,3).map(function(x){return x.name});
    }catch(e){}
    /* rank 为 null = 未达 MVP 讨论门槛。这里必须给出与奖项页一致的结论，
       不能再让赛季页没有名次（否则两处口径又对不上）。 */
    var tag=(rank==null)?'你 #--':('你 #'+rank);
    var note=(rank==null)?'还没达到 MVP 讨论门槛':(rank<=3?'争奖区':rank<=5?'最前列':rank<=10?'讨论区':'榜内后段');

    /* 前 3 名极简列表 + 玩家行（保留 class="me" 结构） */
    var seq=top.map(function(n,i){return '<i>#'+(i+1)+' '+esc67(n)+'</i>'}).join('');
    var meRow=(rank!=null&&rank>3)?('<div class="v218-me-rank"><span>#'+rank+'</span><b>'+esc67((currentP()||{}).zh||'你')+'</b><em>你</em></div>'):'';

    return '<section class="v218-mvp">'
      +'<header><div><small>实时更新 · G'+career.games+'</small><h3>MVP榜</h3></div>'
      +'<b class="'+((rank!=null&&rank<=5)?'hot':'')+'">'+tag+'</b></header>'
      +'<div class="v218-mvp-list">'+(rank==null?'':'<div class="me"><span>#'+rank+'</span><b>'+esc67((currentP()||{}).zh||'你')+'</b><em>你</em></div>')
      +top.map(function(n,i){return '<div><span>#'+(i+1)+'</span><b>'+esc67(n)+'</b><em>·</em></div>'}).join('')+'</div>'
      +meRow
      +'<p>'+note+'。个人数据、球队战绩与出勤共同决定排名。</p>'
      +'</section>';
  }catch(e){return ''}
}
window.v67CompactMvp=v67CompactMvp;

/* 接管赛季页：去掉原大块 MVP 榜，把自己的紧凑条插到球员数据之后 */
try{
  if(typeof regularView==='function'){
    var __v67Regular=regularView;
    regularView=function(){
      var html=null;
      try{html=__v67Regular()}catch(e){return __v67Regular()}
      try{
        if(typeof html!=='string')return html;
        /* 1) 摘掉原 MVP 榜（它用的是旧口径，会与奖项页数字不一致）。
              稍后用 v67CompactMvp() 生成的**同一口径**紧凑榜替代，
              保证赛季页与奖项页说同一个名次。 */
        var mvpMatch=html.match(/<section class="v218-mvp">[\s\S]*?<\/section>/);
        if(mvpMatch){html=html.replace(mvpMatch[0],'');}
        /* 2) 把紧凑条插到「球员数据」区块之后。
              不同层的数据区类名不同（season-statboard / v26-statbox / dashboard），
              这里按优先级找第一个可用的锚点。 */
        /* 2) 把「压缩后的原榜 + 一行摘要」插到球员数据区之后 */
        var insert=v67CompactMvp()||'';
        if(insert){
          var anchors=['</section><section class="team-scoreboard">',
                       '</section><section class="v26-statbox">',
                       '</section><div class="season-statboard">',
                       '</div><section class="v26-statbox">'];
          var done=false;
          for(var i=0;i<anchors.length&&!done;i++){
            var a=anchors[i];
            if(html.indexOf(a)>=0){
              var pos=html.indexOf(a);
              html=html.slice(0,pos)+insert+html.slice(pos);
              done=true;
            }
          }
          if(!done)html=html+insert;   /* 兜底：放到最后，同样不抢主视觉 */
        }
        return html;
      }catch(e){}
      return html;
    };
  }
}catch(e){}

window.__v67Debug={winners:v67Winners,winnerFor:v67WinnerFor,compactMvp:v67CompactMvp};

})();

