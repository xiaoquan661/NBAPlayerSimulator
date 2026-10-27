
/* =====================================================================
   V5.6 · 剧情球星真的加盟
   开发者反馈（原话）：
     「第二年剧情里说麦迪来了，然后反而34胜了……还有麦迪来了好像也没有真的来」

   体检结论：麦迪只存在于剧情文本里 —— 既没进球队名单，也没提升球队实力。
   因此「剧情说球队变强、战绩反而更差」这种矛盾必然发生。

   修法：给「球星加盟」类章节挂上真实效果：
     1) 把该球星加入我方球队名单（联盟数据里）
     2) 同步提升我方球队实力（立刻生效，后续战绩随之变好）
     3) 写一条生涯反馈，让玩家看得见
   覆盖（6 位球员里剧情涉及球星加盟的章节）：
     · 姚明  第 4 章「麦迪来了」          → Tracy McGrady
     · 本内特 第 4 章「LeBron 回来了」     → LeBron James
     · 富尔茨 第 3 章「Jimmy Butler 的交易」→ Jimmy Butler
   其余球员的章节不含球星加盟，无需处理。
   ===================================================================== */
(function(){
if(window.__v56StarJoin)return;window.__v56StarJoin=true;

const clampNum=(v,a,b)=>{v=Number(v);if(!isFinite(v))v=a;return Math.max(a,Math.min(b,v))};

/* 章节索引（0-based）→ 加盟球星。
   注意：人名的匹配必须用「联盟里实际使用的写法」——
   实测联盟名单用的是中文名（如「特雷西·麦克格雷迪」），不是英文名；
   因此这里同时给出 zh（联盟中文名）与 en（英文名，用于新建时显示），
   匹配时两者都比对。 */
const V56_JOINS={
  yao:{4:{zh:'特雷西·麦克格雷迪',en:'Tracy McGrady',ovr:95}},
  bennett:{3:{zh:'勒布朗·詹姆斯',en:'LeBron James',ovr:97}},
  fultz:{2:{zh:'吉米·巴特勒',en:'Jimmy Butler',ovr:90}}
};
window.__v56Joins=V56_JOINS;

/* 把球星加进我方球队名单。
   注意：该球星通常已经在联盟名单里（效力别的球队），
   所以不能只做「不存在才新增」——那样永远加不进来。
   正确做法：若已在名单 → 改换球队（转会到我方）；若不在 → 新增。 */
function v56AddStar(zh,name,ovr){
  try{
    if(!career)return false;
    if(!career.v32League||!Array.isArray(career.v32League.players))return false;
    const L=career.v32League;
    const hit=L.players.find(p=>p&&(p.name===zh||p.zh===zh||(name&&p.name===name)));
    if(hit){
      /* 已经在别的队 → 转会过来 */
      if(hit.team===career.team)return false;   /* 已经在我队里 */
      hit.team=career.team;
      if(Number(hit.ovr)||0 < ovr)hit.ovr=clampNum(ovr,45,99);
      hit.retired=false;
      return true;
    }
    const age=clampNum((Number(career.seasonYear)||2003)-1979,20,36);
    L.players.push({
      name:name,zh:zh,team:career.team,age:age,
      potential:clampNum(ovr+2,60,99),ovr:clampNum(ovr,45,99),retired:false
    });
    return true;
  }catch(e){return false}
}
window.v56AddStar=v56AddStar;

/* 球星加盟带来的球队实力提升。
   说明：v32 的 power = 名单前 9 人平均 ×0.92 + 8，单个球星会被平均稀释
   （实测加盟 95 分的麦迪后，前 9 平均只从 84.6 抬到 85.6），
   而「剧情说球队变强」应该是玩家能明显感受到的，所以额外给一个
   「球星效应」加成：按球星评分高出球队平均的程度给 1~5 点。 */
function v56BoostPower(starOvr){
  try{
    if(!career)return;
    const byTeam={};
    career.v32League.players.forEach(p=>{(byTeam[p.team]=byTeam[p.team]||[]).push(Number(p.ovr)||70)});
    const t=teamBy(career.team);
    const arr=(byTeam[t.abbr]||[]).slice().sort((a,b)=>b-a).slice(0,9);
    if(!arr.length)return;
    const avg=arr.reduce((a,b)=>a+b,0)/arr.length;
    let want=clampNum(Math.round(avg*0.92+8),60,99);
    const so=Number(starOvr);
    if(isFinite(so)){
      const starEffect=clampNum(Math.round((so-avg)*0.55),1,5);
      want=clampNum(want+starEffect,60,99);
    }
    /* 加盟是「立刻生效」的，不受平滑限速约束，但只升不降 */
    if(want>Number(t.power))t.power=want;
  }catch(e){}
}
window.v56BoostPower=v56BoostPower;

/* 在剧情选择生效后触发（与 v49「选退役」同一挂点） */
try{
  const __v56Choice=storyChoice;
  storyChoice=function(i){
    const r=__v56Choice(i);
    try{
      if(!career||!career.exclusive)return r;
      const pid=career.playerId;
      const map=V56_JOINS[pid];
      if(!map)return r;
      /* 刚推进完的章节索引 = storyIndex-1 */
      const justIdx=(Number(career.storyIndex)||0)-1;
      const star=map[justIdx];
      if(!star)return r;
      career.v56Joined=career.v56Joined||{};
      if(career.v56Joined[star.zh])return r;         /* 只生效一次 */
      const added=v56AddStar(star.zh,star.en,star.ovr);
      if(added)career.v56Joined[star.zh]=true;
      else return r;                                    /* 没成功就不记标记，下次还能补 */
      v56BoostPower(star.ovr);
      if(added){
        career.feed=career.feed||[];
        career.feed.unshift(`${star.zh}正式加入${teamBy(career.team).name}。球队阵容与实力已经更新，接下来的战绩会体现这一点。`);
        if(typeof window.v222Pop==='function')window.v222Pop('球星加盟',`${star.zh}（${star.ovr}）加入${teamBy(career.team).name}`);
      }
      if(typeof syncOvr==='function')syncOvr();
      if(typeof save==='function')save();
    }catch(e){}
    return r;
  };
}catch(e){}

/* 兼容：老存档在「麦迪来了」之后没写 joined 标记的，
   在下一次进入赛季时补一次（避免只有在剧情当场才生效）。 */
try{
  const __v56Next=nextSeason;
  nextSeason=function(){
    const r=__v56Next();
    try{
      if(!career||!career.exclusive)return r;
      const map=V56_JOINS[career.playerId];
      if(!map)return r;
      career.v56Joined=career.v56Joined||{};
      /* 已经看过对应章节但没加盟 → 补 */
      Object.keys(map).forEach(k=>{
        const idx=Number(k);
        const star=map[k];
        if(!star)return;
        if((Number(career.storyIndex)||0)>idx&&!career.v56Joined[star.zh]){
          const added=v56AddStar(star.zh,star.en,star.ovr);
          career.v56Joined[star.zh]=true;
          v56BoostPower(star.ovr);
          if(added&&career.feed){
            career.feed.unshift(`${star.zh}已经加入球队（补记）。阵容与实力已同步。`);
          }
        }
      });
      if(typeof save==='function')save();
    }catch(e){}
    return r;
  };
}catch(e){}

window.__v56Debug={addStar:v56AddStar,boost:v56BoostPower,joins:V56_JOINS};

})();
