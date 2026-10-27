
/* =====================================================================
   V4.3 · 专属天赋重做
   开发者诉求（原话）：
     「不应该一听天赋名字很牛逼，能让这个状元的短板消失，才行吗？」
     「席梦思奥登太高了呀，整体应该解锁后 85 最多了都」
     「富尔茨终极射手，夸梅的建议和乔丹有关」→「神选之子，本内特的不变」

   五项改动：
     A. 富尔茨：投篮之神 → 终极射手（投射一次补到能用，「失灵」不再发生）
     B. 夸梅  ：不世出的少年天才 → 神选之子（技术项一次补到能用）
     C. 本内特：保持「六边形超巨」，机制与承诺对齐（每季 3 次），合并重复机制
     D. 奥登 / 西蒙斯：下调开局强度
     E. 新增「解锁后开局总评 ≤85」硬上限
   ===================================================================== */
(function(){
if(window.__v43Talents)return;window.__v43Talents=true;

/* ---------- A/B. 名字与描述覆盖（最后执行，覆盖前三层旧名） ---------- */
const V43_NAMES={
  fultz:{
    n:'终极射手',
    d:'【富尔茨刚需】把「投篮失灵」这件事永久解决：开局投射直接补到联盟水准（72），投篮稳定性锁在高位，越投越准；同时解锁从费城投篮异变开始、直到退役的完整专属故事。',
    perks:['开局投射补到 72（联盟水准）','投篮稳定性锁高位，不再失灵','解锁Brett Brown / Embiid / Simmons / Steve Clifford / Judy Seto主线']
  },
  kwame:{
    n:'神选之子',
    d:'【夸梅刚需】他是乔丹（篮球之神）亲手用状元签选中的那个人——把这份天赋真正兑现：开局技术四项（终结/投射/组织/防守）一次补到联盟水准（72），心态保底 68，从此不再是「技术粗糙的高中生」；同时解锁从乔丹时代开始、直到退役的完整专属故事。',
    perks:['技术四项补到 72（告别粗糙）','心态保底 68，不会被压力压垮','解锁Michael Jordan / Doug Collins / Kobe / Phil Jackson主线']
  }
};
try{
  Object.keys(V43_NAMES).forEach(k=>{
    const p=playerBy(k);
    if(p&&p.exclusive)Object.assign(p.exclusive,V43_NAMES[k]);
  });
}catch(e){}

/* ---------- C. 奥登 / 西蒙斯：不下调专属加成，由下面的 85 上限统一封顶 ----------
   说明：开发者要求「解锁后 85 最多」。直接砍属性会破坏两人的定位
        （奥登是天赋型中锋、西蒙斯是已进全明星的状元），
        改为保留原加成、由硬上限统一压到 85，既满足上限又保住梯度。 */
const V43_SOFTER={};

/* ---------- 核心：开局结算（短板补齐 + 85 上限） ---------- */
/* 及格线：72 = 联盟轮换球员水准。到这档，玩家一眼能看出「短板没了」。 */
const V43_FLOOR=72;
const V43_CAP=85;

/* 需要补到及格线的项目（按状元，只补「真实短板」，不动他的强项） */
const V43_FILL={
  fultz:['shooting'],
  kwame:['finishing','shooting','playmaking','defense'],
  bennett:[]   /* 本内特保持原机制（六项同步补强已由既有逻辑处理） */
};
const V43_FLOOR_MENTALITY={kwame:68};

/* 按权重把最高的能力降下来，直到 OVR ≤ 上限（保持相对强弱关系） */
function v43CapOvr(){
  try{
    let guard=0;
    while(career.ovr>V43_CAP&&guard++<200){
      /* 找最高的、且还能降的属性 */
      let best=null,bestV=-1;
      ['finishing','shooting','playmaking','defense','rebounding','athleticism','durability','mentality'].forEach(k=>{
        const v=career.attrs[k];
        if(v>60&&v>bestV){best=k;bestV=v}
      });
      if(!best)break;
      career.attrs[best]=clamp(career.attrs[best]-1,30,99);
      syncOvr();
    }
  }catch(e){}
}

function v43Apply(){
  if(!career)return;
  try{
    const pid=career.playerId;
    /* 1) 短板补齐 */
    (V43_FILL[pid]||[]).forEach(k=>{
      if(career.attrs[k]!=null&&career.attrs[k]<V43_FLOOR)career.attrs[k]=V43_FLOOR;
    });
    const fm=V43_FLOOR_MENTALITY[pid];
    if(fm!=null&&career.attrs.mentality<fm)career.attrs.mentality=fm;
    /* 2) 下调后的专属加成（奥登/西蒙斯） */
    /* 下调专属加成：把「原加成 - 新加成」的差额从当前属性里扣回（只扣一次） */
    const soft=V43_SOFTER[pid];
    if(soft&&career.exclusive&&career.talents&&career.talents.includes(pid+'_x')&&!career.v43SoftApplied){
      const ORIG={oden:{durability:8,strength:6,blocks:6,rebounding:5,defense:4},
                  simmons:{shooting:12,playmaking:3,defense:3,strength:3}}[pid];
      if(ORIG){
        Object.keys(ORIG).forEach(k=>{
          const cut=ORIG[k]-(soft[k]||0);
          if(cut>0&&career.attrs[k]!=null)career.attrs[k]=clamp(career.attrs[k]-cut,30,99);
        });
      }
      career.v43SoftApplied=true;
    }
    syncOvr();
    /* 3) 85 上限 */
    v43CapOvr();
  }catch(e){}
}

/* 包装 createCareer：原逻辑跑完后做补齐 + 封顶 */
try{
  const __v43Create=createCareer;
  createCareer=function(){
    __v43Create();
    v43Apply();
    try{save()}catch(e){}
  };
}catch(e){}

/* ---------- C. 本内特：机制与承诺对齐（每季 3 次）+ 合并重复机制 ---------- */
/* 现状：两套并行计数
     ① v221.seasonBennettStacks（4 层→最低项+2，每季 1 次）
     ② exclusiveRuntime.bennettStacks（6 层→OVR+1/自信+3，每季 3 次，且未写入解锁页）
   修法：统一到 ①，阈值 4 层、每季最多 3 次（与解锁页承诺一致）；
        移除 ② 的独立奖励，避免「同一天赋拿两份收益 + 两个名字」。 */
try{
  const __v43Sim=simulateGame;
  simulateGame=function(){
    const before=career?career.games:0;
    __v43Sim();
    try{
      if(!career||career.games===before)return;
      if(career.playerId!=='bennett'||!career.talents||!career.talents.includes('bennett_x'))return;
      const g=(career.gameLog||[])[0];
      if(!g||g.played===false)return;
      /* 每季重置计数（第一次进入本赛季时） */
      career.v43BennettSeason=career.v43BennettSeason||{season:0,count:0,streak:0};
      const st=career.v43BennettSeason;
      if(st.season!==career.seasonNo){st.season=career.seasonNo;st.count=0;st.streak=0}
      /* 输球或表现低于预期 → 积累一层逆风 */
      const expected=(typeof statExpect==='function')?statExpect().pts:10;
      const low=!g.win||((g.line&&g.line.pts)||0)<expected-3;
      if(!low)return;
      st.streak=(st.streak||0)+1;
      if(st.streak>=4&&st.count<3){
        /* 补最低项 +2，每季最多 3 次（与解锁页承诺一致） */
        const keys=['finishing','shooting','playmaking','defense','rebounding','athleticism','durability','mentality'];
        let lowKey=keys.slice().sort((a,b)=>career.attrs[a]-career.attrs[b])[0];
        career.attrs[lowKey]=clamp(career.attrs[lowKey]+2,30,99);
        st.streak=0;st.count++;
        career.exclusiveRuntime=career.exclusiveRuntime||{};
        career.exclusiveRuntime.procs=(career.exclusiveRuntime.procs||0)+1;
        career.exclusiveRuntime.seasonProcs=(career.exclusiveRuntime.seasonProcs||0)+1;
        career.exclusiveRuntime.lastProc=`【六边形超巨】逆风转化：${lowKey}+2（本季第 ${st.count}/3 次）`;
        career.feed.unshift(career.exclusiveRuntime.lastProc);
        if(typeof window.v222Pop==='function'){
          const CN={finishing:'终结',shooting:'投射',playmaking:'组织',defense:'防守',rebounding:'篮板',athleticism:'运动',durability:'耐久',mentality:'心态'}[lowKey]||lowKey;
          window.v222Pop('六边形超巨 · 逆风层',`扛过 4 场低谷：${CN} +2（本季 ${st.count}/3 次）`);
        }
        syncOvr();
      }
    }catch(e){}
  };
}catch(e){}

/* 屏蔽旧的「状元逆命」第二套机制
   现状：旧层在 simulateGame 里另有一套计数（6 层 → OVR+1/自信+3，每季最多 3 次），
        与本层的「逆风层」（4 层 → 最低项+2，每季最多 3 次）**并行生效**，
        玩家等于拿两份收益，且飘窗文案是旧名拼出来的。
   修法：把旧层那段的收益与飘窗都关掉，只保留「舆论抗压」（解锁页确有承诺），
        并把它的名字统一为「六边形超巨」。 */
try{
  if(typeof window.v222Pop==='function'&&!window.v43PopGuard){
    window.v43PopGuard=true;
    const __v43Pop=window.v222Pop;
    window.v222Pop=function(title,body){
      if(typeof title==='string'&&title.indexOf('状元逆命')>=0){
        /* 「嘘声燃尽」是已废弃的第二套奖励，直接不弹 */
        if(title.indexOf('嘘声燃尽')>=0)return;
        title=title.replace('状元逆命','六边形超巨');
      }
      return __v43Pop(title,body);
    };
  }
}catch(e){}

/* 同时把旧层的「6 层奖励」从数值上关掉：它直接加 ovrMod + 自信，会和逆风层重复。
   信号：旧层触发时会把 lastProc 写成「嘘声燃尽」（这是它独有的字符串），
        据此精确识别并回退它那一份收益。 */
try{
  const __v43Sim2=simulateGame;
  simulateGame=function(){
    const ovrModBefore=career?career.ovrMod:0;
    const confBefore=career?career.confidence:0;
    const simBefore=career?career.games:0;
    __v43Sim2();
    try{
      if(!career||career.games===simBefore)return;
      if(career.playerId!=='bennett')return;
      if(!career.talents||!career.talents.includes('bennett_x'))return;
      const lp=String((career.exclusiveRuntime&&career.exclusiveRuntime.lastProc)||'');
      if(lp.indexOf('嘘声燃尽')>=0){
        /* 旧层刚给了 ovrMod+1 与自信+3，这里回退，避免拿两份 */
        career.ovrMod=ovrModBefore;
        career.confidence=confBefore;
        career.exclusiveRuntime.lastProc='【六边形超巨】逆风层积累中';
        if(typeof syncOvr==='function')syncOvr();
      }
    }catch(e){}
  };
}catch(e){}

/* 解锁页文案：把本内特的机制说明对齐到「每季 3 次」 */
try{
  const b=playerBy('bennett');
  if(b&&b.exclusive){
    b.exclusive.d='把“水货状元”直接改造成没有明显短板的全能核心：开局六项核心能力获得额外成长；球队输球且你出场时积累“逆风层”，4层自动把当前最低核心能力+2，每季最多3次；负面舆论造成的自信损失减半。同时解锁从真实新秀困境开始、一直写到退役的专属生涯故事。';
  }
}catch(e){}

window.__v43Debug={V43_NAMES,V43_FILL,V43_FLOOR,V43_CAP,V43_SOFTER,v43Apply,v43CapOvr};

})();
