
/* v164: release notes and featured newcomers use the existing cover/card templates. */
(function(){'use strict';
if(window.__v164Presentation)return;window.__v164Presentation=true;
const newcomers=['zion','wiggins','risacher','wall','griffin'],newSet=new Set(newcomers);
const groups=window.__v76SelectGroups;
if(Array.isArray(groups)){
 const previous=groups.filter(g=>g.key!=='newcomers').map(g=>({...g,ids:g.ids.filter(id=>!newSet.has(id))})).filter(g=>g.ids.length);
 groups.splice(0,groups.length,{key:'newcomers',label:'新生涯',desc:'五位新加入的球员，五种不同的可能',ids:newcomers.slice()},...previous);
}
function updates(){
 const portraits=newcomers.map(id=>{const p=playerBy(id),file=window.v135PortraitFile(id);return '<div class="v164-update-player"><img src="'+esc(file)+'" alt="" loading="lazy" decoding="async"><span>'+esc({zion:'蔡恩',wiggins:'维金斯',risacher:'里萨谢',wall:'沃尔',griffin:'格里芬'}[id])+'</span></div>'}).join('');
 return '<details class="v164-updates"><summary><div class="v164-update-heading"><small>本次更新</small><strong>五位球员，五段全新生涯</strong><p>蔡恩 · 维金斯 · 里萨谢 · 沃尔 · 格里芬</p><div class="v164-update-preview"><span>荣誉竞争升级</span><span>选秀名单焕新</span></div></div><span class="v164-update-toggle" aria-hidden="true"></span></summary><div class="v164-update-body"><div class="v164-update-portraits">'+portraits+'</div><div class="v164-update-item"><i>01</i><div><b>选择你的新主角</b><p>五位球员拥有各自的专属技能与生涯故事。解锁专属天赋后，亲手决定他们接下来要走的路。</p></div></div><div class="v164-update-item"><i>02</i><div><b>伟大，需要经得起时间</b><p>荣誉评选更重视效率、出勤与球队表现。历史地位也更看重持续的巅峰和核心冠军贡献。</p></div></div><div class="v164-update-item"><i>03</i><div><b>选秀夜，迎来熟悉与未知</b><p>2001—2025 年使用真实选秀名单与完整中文姓名；之后的新秀来自不同国家，拥有正常且不重名的姓名。</p></div></div><div class="v164-update-footer">展开新生涯，写下自己的下一章。</div></div></details>';
}
const previousHome=renderHome;
renderHome=function(){
 let html=previousHome.apply(this,arguments);
 html=html.replace('五位状元 · 五次重来','十二位球员 · 十二种活法').replace(/·\s*修订版\s*\d+/g,'');
 const anchor='<div class="cover-hero-v214">';
 return html.includes(anchor)?html.replace(anchor,updates()+anchor):html.replace('<div class="cover-actions">',updates()+'<div class="cover-actions">');
};
const previousSelect=renderSelect;
renderSelect=function(){
 let html=previousSelect.apply(this,arguments).replace('选择你的第一位状元','选择你的生涯主角');
 html=html.replace('不是六张换皮卡。每个人拥有独立数值机制、专属主线、关键矛盾和不同的生涯风险。','从新加入的五位球员开始，或重写一段熟悉的生涯。每个人都有自己的天赋、故事与选择。');
 return html;
};
if(ui.screen==='home'||ui.screen==='select')render();
})();

