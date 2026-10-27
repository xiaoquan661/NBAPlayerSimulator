
/* ============================================================================
 * v76 · 选人页改为单页上下布局
 *
 * 开发者原话：
 *   「选择人物的界面，不要分成两个tab了，就一页，上下布局，
 *     意难平系列在上边，状元系列在下方」
 *
 * 改法：不再用「系列切换 tab + 按 tab 过滤卡片」，
 *   改为一次渲染全部 6 人，按两个分区上下排列：
 *     上：意难平（姚明）
 *     下：水货状元（本内特 / 奥登 / 夸梅 / 富尔茨 / 西蒙斯）
 *   原先的分组/过滤逻辑保留在数据里（GROUPS），只是不再用来隐藏卡片。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v76Select)return;window.__v76Select=true;

var V76_GROUPS=[
  {key:'regret',label:'意难平',desc:'被伤病和命运辜负的天才',ids:['yao']},
  {key:'bust',label:'水货状元',desc:'被贴上“水货”标签的人',ids:['bennett','oden','kwame','fultz','simmons']}
];
window.__v76SelectGroups=V76_GROUPS;

/* 从整段 HTML 里摘出每张 scenario-card，按 id 归队 */
function v76SplitCards(html){
  var cards={};
  String(html).replace(/<button class="scenario-card[\s\S]*?<\/button>/g,function(card){
    var m=card.match(/ui\.selected='([a-z]+)'/);
    if(m)cards[m[1]]=card;
    return card;
  });
  return cards;
}

/* 自己补一张卡片（与基础层模板同构）。
   为什么需要：上一层的包装会按「当前系列」把不属于该系列的卡片整块删掉，
   所以拿到的 HTML 里可能缺人（默认系列下缺姚明）。
   一页布局要求 6 人同屏，缺的这里按同样的结构补出来。 */
function v76Card(x){
  try{
    var img=(typeof asset==='function')?asset(x.zh+'人物形象',''):'';
    var tags=(x.tags||[]).map(function(t){return '<span>'+esc(t)+'</span>'}).join('');
    var selIs=(typeof ui==='object'&&ui&&ui.selected===x.id)?'selected':'';
    return '<button class="scenario-card '+selIs+'" onclick="ui.selected=\''+x.id+'\';window.v76Pick&&window.v76Pick(\''+x.id+'\');render()">'
      +img
      +'<div><div class="meta">'+x.year+' · '+teamBy(x.team).name+' · '+x.pos+'</div>'
      +'<h3>'+esc(x.zh)+'</h3>'
      +'<p><b>'+esc(x.title)+'</b><br>'+esc(x.tagline)+'</p>'
      +'<div class="scenario-tags">'+tags+'</div>'
      +'<div class="scenario-ovr"><b>'+x.ovr+'</b><small>初始 OVR</small></div></div></button>';
  }catch(e){return ''}
}

/* 点卡片时记住选的是谁——上一层的过滤依赖 window.v45Series，
   一页布局不再用它，所以这里同步一下，避免点到别系列球员时界面回退。 */
window.v76Pick=function(id){
  try{
    if(id==='yao')window.v45Series='regret';
    else window.v45Series='bust';
  }catch(e){}
};

try{
  if(typeof renderSelect==='function'&&!window.__v76RenderGuard){
    var __v76Render=renderSelect;
    renderSelect=function(){
      var html=null;
      try{html=__v76Render.apply(this,arguments)}catch(e){return __v76Render.apply(this,arguments)}
      try{
        if(typeof html!=='string')return html;
        /* 系列切换栏不再需要 */
        html=html.replace(/<div class="v45-series-bar">[\s\S]*?<\/div>/,'');
        var cards=v76SplitCards(html);
        /* 缺的球员自己补（上层按系列过滤会删掉不属于当前系列的人） */
        try{
          if(typeof P!=='undefined'&&Array.isArray(P)){
            P.forEach(function(x){
              if(!cards[x.id]){
                var c=v76Card(x);
                if(c)cards[x.id]=c;
              }
            });
          }
        }catch(e){}
        if(!cards.yao)return html;          /* 连姚明都拿不到就不动，避免改坏 */

        /* 组装两个分区（意难平在上、水货状元在下） */
        var sections=V76_GROUPS.map(function(g){
          var inner=g.ids.filter(function(id){return cards[id]}).map(function(id){return cards[id]}).join('');
          if(!inner)return '';
          return '<section class="v76-group">'
            +'<header class="v76-group-head"><b>'+g.label+'</b><span>'+g.desc+'</span>'
            +'<em>'+g.ids.filter(function(id){return cards[id]}).length+' 人</em></header>'
            +'<div class="scenario-deck v76-deck">'+inner+'</div>'
            +'</section>';
        }).join('');

        /* 用新结构替换掉原来的整个 scenario-deck 区块 */
        var start=html.indexOf('<div class="scenario-deck"');
        if(start>=0){
          var end=html.lastIndexOf('</div>',html.indexOf('<div class="sticky-cta"'));
          /* 更稳的做法：从 deck 起点开始配平 div，找到它自己的闭合 */
          var depth=0,i=start,done=-1;
          while(i<html.length){
            if(html.slice(i,i+4)==='<div')depth++;
            else if(html.slice(i,i+6)==='</div>'){depth--;if(depth===0){done=i+6;break}}
            i++;
          }
          if(done>0)html=html.slice(0,start)+sections+html.slice(done);
          else html=html.slice(0,start)+sections+html.slice(start);
        }else{
          html=html.replace('</section>',sections+'</section>');
        }

        /* 导语：一页里同时有 6 人，不再按系列切换措辞 */
        html=html.replace(/<h2>[^<]*<\/h2>/,'<h2>六个人，六种活法</h2>');
        html=html.replace(/(<p>)[^<]*(<\/p>)(?=[\s\S]*v76-group)/,
          '$1不是六张换皮卡。每个人拥有独立数值机制、专属主线、关键矛盾和不同的生涯风险。$2');
      }catch(e){}
      return html;
    };
    window.__v76RenderGuard=true;
  }
}catch(e){}

/* 样式：分区标题 + 单列布局 */
try{
  if(typeof document!=='undefined'&&document.createElement&&!document.getElementById('v76-select-style')){
    var st=document.createElement('style');
    st.id='v76-select-style';
    st.textContent=[
      /* 单页上下布局：卡片一行一张，撑满宽度 */
      '.v76-group{margin-top:4px}',
      '.v76-group-head{display:flex;align-items:baseline;gap:7px;padding:10px 16px 2px}',
      '.v76-group-head b{font-size:14.5px;font-weight:1000;color:#3d332c;letter-spacing:-.01em}',
      '.v76-group-head span{font-size:9px;color:#9c8b7d;flex:1;min-width:0}',
      '.v76-group-head em{font-size:8.5px;font-style:normal;font-weight:1000;color:#b7222c;background:#fdeceb;border-radius:999px;padding:3px 8px;flex:none}',
      '.v76-deck{padding-top:6px}',
      /* 分隔带：两个分区之间拉一条细线，强化上下关系 */
      '.v76-group + .v76-group{margin-top:6px;padding-top:6px;border-top:1px dashed #e9dccd}'
    ].join('');
    document.head.appendChild(st);
  }
}catch(e){}

window.__v76Debug={groups:V76_GROUPS};

})();

