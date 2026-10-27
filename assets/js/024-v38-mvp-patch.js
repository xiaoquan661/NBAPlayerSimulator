
/* =====================================================================
   V3.8 · MVP 排名统一（修「一直第八」+ 两处名次对不上）
   根因（已实测复现）：
     赛季页实时榜与奖项揭晓页是两套独立实现，对手池与基准分完全不同：
       赛季页（原 v218MvpBoard）：7 名对手，基准分 130~102
       奖项揭晓页（v220MvpRace）：15 名对手，基准分 74~53
     玩家评分区间约 50~90 → 赛季页里永远打不过那 7 个 130+ 的对手 →
     名次恒定垫底「第八」；奖项页尺度正常 → 同一份数据能排到第 13。
     另外 v218MvpBoard 是 v218 块内的局部函数，外层改写同名变量不生效，
     所以此前 v220 层的改写也是死代码，问题一直存在。

   修法：
     1) 不再自建对手池：直接调用 v220 暴露在 window 上的 __v220MvpRace，
        即奖项揭晓页用的那一套名单与分数（唯一事实源）。
     2) 榜单「玩家行始终参与排序」：资格只决定「是否进入获奖讨论」，
        不再把玩家从榜里剔除，名次因此随数据真实变化，不会卡死在第八。
     3) 赛季页实时榜（改写最外层 regularView 产出的 HTML）与揭晓页
        （改写 awardSeason 写入的奖项卡）读同一份名次 → 两处一致。
   ===================================================================== */
(function(){
if(window.__v38MvpUnify)return;window.__v38MvpUnify=true;

/* v220 不可达时的兜底对手池：与奖项页同名同基准，保证口径不漂移 */
const V38_BASE=[74,72.5,71,69.5,68,66.5,65,63.5,62,60.5,59,57.5,56,54.5,53];
function v38Names(year){
  if(year<=2005)return ['蒂姆·邓肯','科比·布莱恩特','凯文·加内特','沙奎尔·奥尼尔','史蒂夫·纳什','德克·诺维茨基','杰森·基德','阿伦·艾弗森','特雷西·麦克格雷迪','克里斯·韦伯','保罗·皮尔斯','雷·阿伦','杰梅因·奥尼尔','文斯·卡特','加里·佩顿'];
  if(year<=2011)return ['勒布朗·詹姆斯','科比·布莱恩特','德维恩·韦德','克里斯·保罗','德怀特·霍华德','凯文·杜兰特','德克·诺维茨基','蒂姆·邓肯','史蒂夫·纳什','卡梅隆·安东尼','克里斯·波什','保罗·皮尔斯','凯文·加内特','德隆·威廉姆斯','布兰登·罗伊'];
  if(year<=2021)return ['勒布朗·詹姆斯','凯文·杜兰特','斯蒂芬·库里','詹姆斯·哈登','拉塞尔·威斯布鲁克','科怀·伦纳德','安东尼·戴维斯','克里斯·保罗','达米安·利拉德','扬尼斯·阿德托昆博','吉米·巴特勒','保罗·乔治','乔尔·恩比德','尼古拉·约基奇','凯里·欧文'];
  if(year<=2028)return ['尼古拉·约基奇','扬尼斯·阿德托昆博','乔尔·恩比德','卢卡·东契奇','杰森·塔图姆','谢伊·吉尔杰斯-亚历山大','安东尼·爱德华兹','维克托·文班亚马','杰伦·布伦森','德文·布克','多诺万·米切尔','泰瑞斯·哈利伯顿','贾·莫兰特','凯德·坎宁安','切特·霍姆格伦'];
  return ['维克托·文班亚马','卢卡·东契奇','安东尼·爱德华兹','Cameron Knox','Malik Rivers','Jaylen Price','Noah Grant','Jalen Mercer','Darius Cole','Evan Cross','Marcus Reed','Tyler Stone','Andre Knox','Julian Price','Mason Grant'];
}
function v38Seed(name){
  try{return (Math.abs(stableHash(`${career.seasonYear}-${name}-mvp-final`))%31-15)/10}catch(_){return 0}
}

/* 统一榜单：对手池/分数取自奖项揭晓页同一实现，玩家行始终参与排序 */
function v38Race(finalMode){
  const me=currentP().zh;
  let list=[],eligible=false,src=null;
  try{ if(typeof window.__v220MvpRace==='function')src=window.__v220MvpRace(!!finalMode); }catch(_){src=null}
  if(src&&Array.isArray(src.list)&&src.list.length){
    list=src.list.filter(x=>x&&x.name&&x.name!==me).map(x=>({name:x.name,score:x.score}));
    eligible=src.list.some(x=>x&&x.name===me);
  }
  if(!list.length){
    const names=v38Names(career.seasonYear||career.draftYear);
    list=names.map((n,i)=>({name:n,score:(V38_BASE[i]==null?50:V38_BASE[i])+v38Seed(n)}));
  }
  const meScore=(typeof v218MvpScore==='function')?v218MvpScore():0;
  list.push({name:me,score:meScore,me:true});
  list.sort((a,b)=>b.score-a.score);
  const idx=list.findIndex(x=>x.me);
  return{eligible,score:meScore,rank:idx<0?null:idx+1,list,top:list.slice(0,5)};
}

function v38BoardHTML(){
  if(!career)return'';
  const gp=(career.seasonStats&&career.seasonStats.gp)||0;
  if(gp<5)return `<section class="v218-mvp"><header><div><small>常规赛实时更新</small><h3>MVP榜</h3></div><b>样本不足</b></header><p>至少打 5 场后开始显示。个人数据、球队战绩和出勤会一起影响排名。</p></section>`;
  const r=v38Race(false),rank=r.rank||16,top=r.top;
  const inTop5=rank<=5;
  const note=!r.eligible?'还没达到MVP讨论门槛，把数据或战绩再抬一档。':rank===1?'你现在领跑MVP竞争。':rank<=5?'你已经进入MVP最前列。':rank<=10?'你已经进入MVP讨论区。':rank<=15?'你在MVP榜内，距离争奖区还有差距。':'暂时排在MVP榜后段，需要更高产量或更多胜场。';
  return `<section class="v218-mvp"><header><div><small>实时更新 · G${career.games}</small><h3>MVP榜</h3></div><b class="${inTop5?'hot':''}">你 #${rank}</b></header>`
    +`<div class="v218-mvp-list">${top.map((x,i)=>`<div class="${x.me?'me':''}"><span>#${i+1}</span><b>${x.name}</b><em>${x.me?'你':Math.round(x.score)}</em></div>`).join('')}</div>`
    +`${inTop5?'':`<div class="v218-me-rank"><span>#${rank}</span><b>${currentP().zh}</b><em>你</em></div>`}`
    +`<p>${note}</p></section>`;
}

/* 赛季页实时榜：最外层 regularView 产出 HTML 后，替换掉旧的 MVP 区块 */
const __v38Regular=regularView;
regularView=function(){
  let h=__v38Regular();
  try{
    if(!career||career.stage!=='regular')return h;
    if(h.indexOf('<section class="v218-mvp">')<0)return h;
    return h.replace(/<section class="v218-mvp">[\s\S]*?<\/section>/,v38BoardHTML());
  }catch(e){return h}
};

/* 奖项揭晓页：用同一份统一名次改写 MVP 奖项卡，保证两处显示同一个数字 */
const __v38AwardSeason=awardSeason;
awardSeason=function(){
  __v38AwardSeason();
  if(!career||!Array.isArray(career.seasonAwards))return;
  const card=career.seasonAwards.find(x=>x.key==='MVP'||x.title==='最有价值球员');
  if(!card)return;
  const r=v38Race(true),rank=r.rank||16;
  const prevWon=!!card.won,before=career.honors.MVP||0;
  card.won=!!(r.eligible&&rank===1);
  card.status=card.won?'获奖':`最终排名 第${rank}`;
  /* v220 层已按自己的判定记过一次，这里只补差额，避免重复计数 */
  if(card.won&&!prevWon)career.honors.MVP=before+1;
  if(!card.won&&prevWon)career.honors.MVP=Math.max(0,before-1);
  career.mvpFinalRace={rank:rank,eligible:r.eligible,score:r.score,top:r.top.map((x,i)=>({rank:i+1,name:x.name}))};
  save();
};
window.__v38Debug={v38Race,v38BoardHTML,v38Names,V38_BASE};

})();
