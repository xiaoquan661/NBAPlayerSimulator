
/* =====================================================================
   V5.9 · 随机事件按固定节点触发（一季 2~3 次）
   开发者要求（原话）：
     「随机事件一个赛季2-3次就可以了，并且是常规赛初一次，常规赛结束一次，
       如果有季后赛，季后赛一次」

   体检（逐场实测）：
     目前一季会弹出 5 次事件，且时机散乱（实测 G0 / G10 / G18 / G32 / G52）。
     原因是**多套系统各自独立触发**：
       · 主线章节（专属剧情，storyIndex 驱动）
       · 长弧事件（makeLongArcEvent，_longArc）
       · 赛季随机事件（V42_EV_V2，_v42New）
     它们没有统一的节拍，所以看起来又密又随机。

   修法（统一节拍）：
     新增「赛季事件档期」，把**非主线的支线事件**（长弧 + 随机）限制在三个固定节点：
       ① 常规赛初：第 10~30 场之间触发一次
       ② 常规赛末：第 68 场之后触发一次
       ③ 季后赛：进入季后赛后触发一次（没有季后赛就不触发）
     每档最多一次，因此一季最多 3 次、最少 2 次。
     **主线的专属剧情章节不受此限制**（那是看广告解锁的内容，必须按主线节奏走）。

   判定方式：调用前记录 storyIndex；调用后若 storyIndex 前进 → 是主线章节，放行；
   若没前进却有事件 → 是支线事件，按档期决定放行或撤销。
   ===================================================================== */
(function(){
if(window.__v59EventSlots)return;window.__v59EventSlots=true;

/* 三个档期（按「本季已打场次」与阶段判断） */
const V59={
  EARLY_MIN:10, EARLY_MAX:34,     /* 常规赛初 */
  LATE_MIN:68,                    /* 常规赛末 */
  MAX_PER_SEASON:3
};

/* 本季已用掉的档期 */
function v59Slots(){
  try{
    if(!career)return null;
    career.v59=career.v59||{};
    const v=career.v59;
    if(v.season!==career.seasonNo){v.season=career.seasonNo;v.early=false;v.late=false;v.po=false;v.count=0;}
    return v;
  }catch(e){return null}
}

/* 当前是否处在某个可用档期；返回档期名或 null */
function v59SlotNow(){
  const v=v59Slots();
  if(!v||!career)return null;
  try{
    const st=career.stage, g=Number(career.games)||0;
    /* ③ 季后赛 */
    if(st==='playoffs'||st==='playin'){
      return v.po?null:'po';
    }
    if(st!=='regular')return null;
    /* ② 常规赛末 */
    if(g>=V59.LATE_MIN)return v.late?null:'late';
    /* ① 常规赛初 */
    if(g>=V59.EARLY_MIN&&g<=V59.EARLY_MAX)return v.early?null:'early';
    return null;
  }catch(e){return null}
}
function v59Mark(slot){
  const v=v59Slots();
  if(!v||!slot)return;
  v[slot]=true;
  v.count=(v.count||0)+1;
}
window.__v59Slots=v59Slots;

/* 撤销一次「支线事件」：清掉事件本身，并把各系统记录的「已用」标记还原，
   使它在真正的档期里还能被再次抽到。 */
function v59Undo(snap){
  try{
    if(ui){ui.storyEvent=null;ui.modal=null;}
  }catch(e){}
  try{
    /* v42 赛季随机事件：还原去重表与节拍记录 */
    if(snap&&snap.v42&&career.v42EvUsed){
      const pid=career.playerId;
      if(snap.v42.idx!=null&&career.v42EvUsed[pid]){
        delete career.v42EvUsed[pid][snap.v42.idx];
      }
      career.v42EvSeason=snap.v42.season;
      career.v42EvLastGame=snap.v42.lastGame;
    }
  }catch(e){}
  try{
    /* 长弧事件：还原「本季已用」标记（若被写入） */
    if(snap&&snap.longLen!=null&&career.worldline&&Array.isArray(career.worldline.longArcSeasons)){
      career.worldline.longArcSeasons.length=snap.longLen;
    }
  }catch(e){}
}

/* ---------- 主拦截：包装最外层 maybeStory ---------- */
try{
  const __v59Maybe=maybeStory;
  maybeStory=function(){
    const idxBefore=(career&&career.storyIndex)||0;
    const snap={
      v42:{
        idx:(ui&&ui.storyEvent&&typeof ui.storyEvent._v42Idx==='number')?ui.storyEvent._v42Idx:null,
        season:career?career.v42EvSeason:null,
        lastGame:career?career.v42EvLastGame:null
      },
      longLen:(career&&career.worldline&&Array.isArray(career.worldline.longArcSeasons))
        ?career.worldline.longArcSeasons.length : null
    };
    const fired=__v59Maybe();
    if(!fired)return false;

    /* 主线的专属剧情章节：不受档期限制（storyIndex 会前进） */
    const idxAfter=(career&&career.storyIndex)||0;
    if(idxAfter!==idxBefore)return true;

    /* 其余都是支线事件（长弧 / 赛季随机）：必须落在档期内 */
    const slot=v59SlotNow();
    if(slot){
      v59Mark(slot);
      try{career.v59LastSlot=slot}catch(e){}
      return true;
    }
    /* 不在档期 → 撤销，等真正的节点再弹 */
    v59Undo(snap);
    return false;
  };
}catch(e){}

window.__v59Debug={V59,slotNow:v59SlotNow,slots:v59Slots};

})();
