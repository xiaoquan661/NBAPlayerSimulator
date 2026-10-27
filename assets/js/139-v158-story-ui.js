
/* Preserve the shared cream-white bottom sheet for all story events. */
(function(){'use strict';
const legacyWording={
 '这章决定你职业生涯的基本定位：先活下来，还是先证明上限。':'教练需要一件可以放心交给你的工作，你想从哪里开始？',
 '这条线决定你整个生涯的伤病风险曲线与出场量，后面每一次“要不要打”都在读取它。':'麦克米兰把片子留在桌上，等你说出怎样面对自己的身体。',
 '康复态度会决定你前三年能不能建立身体基础，也会影响后续伤病剧情的走向。':'罗伊的短信还在手机上，明早的训练需要你给出回答。',
 '这章决定你与新秀赛季的关系：被保护着慢慢来，还是尽早兑现。':'教练站在你身旁，等你说出今晚是否继续。',
 '这条线决定你在球队争冠期是“保障核心”还是“风险资产”。':'更衣室里的对阵图与队医的表格，都摆在你面前。',
 '这是本线最贵的一次赌注——这笔账在一年后一起还。':'罗尔·邓的话还在耳边，荣誉与身体都需要你认真回答。',
 '你选的不是属性，是前两年的篮球身份。后面的轮换、交易价值与球队定位都会读取这个选择。':'迈克·布朗没有收起战术板，他需要知道第四节可以把你放在哪里。',
 '这章决定你是继续追标签，还是开始建立属于自己的比赛方式。':'欧文把比赛用球交给你，问下周准备怎样继续。',
 '这是整条主线的分水岭：留在争冠球队争一个位置，或者去一支重建球队当核心。后续所有章节都会读取这个选择。':'格里芬等在桌子对面，留队的职责与离开的机会都需要说清楚。',
 '这章决定你是留在费城继续竞争，还是提前开启新的环境。':'布雷特·布朗允许你停下来，也愿意听你继续竞争的理由。',
 '导师路线：打开更多具体的技术成长剧情。':'与乔丹认真沟通，争取更具体的技术指导。',
 '天赋全开线：数据与统治力最快兑现，但重伤剧情的概率显著上升。':'加强比赛投入，数据成长更快，严重伤病的风险也更高。',
 '上限最高，但重大伤病章节会更危险。':'全力投入比赛，身体承受的伤病风险更高。',
 '体能受影响，但后面的章节会出现训练回报。':'持续加练，技术成长更快，短期体能消耗增加。'
};
const legacyEvent=v28Event;
v28Event=function(){const e=legacyEvent.apply(this,arguments);if(!e||e.v135)return e;e.stakes=legacyWording[e.stakes]||e.stakes;if(Array.isArray(e.c))e.c=e.c.map(c=>[c[0],legacyWording[c[1]]||c[1],...c.slice(2)]);return e;};
function storyHints(html){return html.replace(/下一章会读取你之前的选择。|后续剧情会沿着这条路继续，不重复。/g,'身边的人正在等你的回答。').replace(/核心分支已结束，接下来是只属于这条[^<]*?长期故事。/g,'新的赛季，还会有新的相遇。');}
const previousRegular=regularView;
regularView=function(){return storyHints(previousRegular.apply(this,arguments));};
const previousStoryView=storyView;
storyView=function(){return storyHints(previousStoryView.apply(this,arguments));};
const previousPop=window.v222Pop;
if(typeof previousPop==='function')window.v222Pop=function(title,body){if(String(title).startsWith('你选择了：'))body=String(body).split('\n').filter(line=>!/^下一章|^核心篇章|^核心分支/.test(line)).map(line=>legacyWording[line]||line).join('\n');return previousPop.call(this,title,body);};
const previousOverlay=renderOverlay;
renderOverlay=function(){
 if(ui.modal?.kind==='storyOutcome'&&ui.modal.data?.v158){const d=ui.modal.data;return '<div class="overlay"><div class="sheet"><div class="sheet-handle"></div><small>STORY CONSEQUENCE</small><h2>'+d.title+'</h2><p>你选择：<b>'+d.choice+'</b></p><div class="story-result-box"><div class="follow"><p>'+d.follow+'</p></div></div><button class="btn primary" style="width:100%;margin-top:10px" onclick="ui.modal=null;save();render()">继续这段生涯 →</button></div></div>';}
 let html=previousOverlay.apply(this,arguments);
 if(ui.storyEvent)html=html.replace('后面的故事会记住你现在的决定','下一步，由你决定').replace(/<i>不同选择会通往不同后续<\/i>/g,'').replace('这次选择会改变什么','此刻的你').replace('这次选择会影响后续故事和关系。','说出你想怎样做。');
 if(ui.modal?.kind==='storyOutcome'){
  html=html.replace('这个选择已经改变生涯','回应之后').replace('结果已写入属性 / 关系 / 后续剧情 · 继续 →','继续这段生涯 →').replace('继续这条世界线 →','继续这段生涯 →');
  if(/下一章|核心分支|章节|会读取|后续长期|只属于你的故事|顺着这条路/.test(String(ui.modal.data?.follow||'')))html=html.replace(/<div class="follow">[\s\S]*?<\/div>/,'');
 }
 return html;
};
window.__v158StoryUI={storyHints};
})();

