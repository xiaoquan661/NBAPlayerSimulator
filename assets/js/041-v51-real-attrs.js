
/* =====================================================================
   V5.1 · 盖帽 / 抢断 / 力量 = 真属性
   开发者反馈（原话）：
     「姚明，我加点盖帽，下赛季再到加点的时候，发现之前加的盖帽点数没了，
       还有姚明怎么会只有50的初始盖帽值呢」

   体检结论（实测）：
     1) 加点界面（ATTR）里确实能加「盖帽/抢断/力量」三项；
     2) 但游戏内部把这三个键当「不存在的垃圾属性」，常量写着
        V32_JUNK = ['strength','blocks','steals']
        每次换季/读档/开局都调用 v32CleanJunkAttrs() 把它们 delete 掉
        → 实测 blocks 70 → undefined（换季后消失）
     3) 读档路径又会补一个 50 的兜底值 → 这就是「只有 50」的来源
     4) 而 6 位球员的默认属性表里只有原生 5 人有这三项，姚明是后加的、漏配

   修法：
     A. 把这三项从「垃圾属性」名单里移除，改为受保护的真属性
     B. 姚明补齐初始盖帽/抢断/力量（按两米二六中锋的合理值）
     C. 让它们真正参与比赛数据（盖帽→blk、抢断→stl、力量→篮板/终结）
     D. 计入评分：给它们小权重，作为「防守威慑」的补充
        （不抢掉原有八项的主导地位，只是让加点有真实回报）
   ===================================================================== */
(function(){
if(window.__v51RealAttrs)return;window.__v51RealAttrs=true;

/* ---------- A. 让清理函数不再删这三项 ----------
   v32CleanJunkAttrs 在 v32 IIFE 内、外部不可达，但它读的是同一个
   V32_JUNK 数组对象引用。若该数组暴露在 __v32Debug 里就能清空它。 */
try{
  const dbg=window.__v32Debug;
  if(dbg&&Array.isArray(dbg.V32_FMVP_GAP)){/* 仅探测，不依赖 */}
}catch(e){}

/* 兜底做法：清空 __v32Debug 暴露的引用不可靠，
   改为在赛季/读档的关键出口「重新装回」这三项 —— 见 C/D 的包装。 */
const REAL3=['blocks','steals','strength'];

/* 这三项的显示名与合理区间 */
const V51_SPEC={
  blocks:{zh:'盖帽',lo:30,hi:99},
  steals:{zh:'抢断',lo:30,hi:99},
  strength:{zh:'力量',lo:30,hi:99}
};

/* ---------- B. 补齐姚明的初始值（两米二六顶级护框中锋）---------- */
try{
  if(typeof playerBy==='function'){
    const yao=playerBy('yao');
    if(yao){
      yao.attrs=yao.attrs||{};
      /* 盖帽：顶级护框（与奥登 92 同档，略低）；抢断：中锋里偏低；力量：重型中锋 */
      if(yao.attrs.blocks==null)yao.attrs.blocks=88;
      if(yao.attrs.steals==null)yao.attrs.steals=52;
      if(yao.attrs.strength==null)yao.attrs.strength=90;
    }
    /* 其余 5 人若缺项也补上（原表在 v221 内部，可能未覆盖到所有路径） */
    const FILL={bennett:{blocks:45,steals:62,strength:72},
                oden:{blocks:92,steals:48,strength:88},
                kwame:{blocks:80,steals:48,strength:86},
                fultz:{blocks:55,steals:68,strength:58},
                simmons:{blocks:72,steals:78,strength:86}};
    Object.keys(FILL).forEach(id=>{
      const p=playerBy(id);if(!p)return;
      p.attrs=p.attrs||{};
      Object.keys(FILL[id]).forEach(k=>{if(p.attrs[k]==null)p.attrs[k]=FILL[id][k]});
    });
  }
}catch(e){}

/* ---------- C. 每次「建号/读档/换季」后把三项装回来 ----------
   因为旧的清理函数会删它们，这里在落盘与渲染前补回，
   并保留玩家此前的成长（从 career.v51Kept 里取回）。 */
function v51SnapshotReal3(){
  try{
    if(!career||!career.attrs)return;
    career.v51Kept=career.v51Kept||{};
    REAL3.forEach(k=>{
      const v=career.attrs[k];
      if(v!=null&&isFinite(Number(v)))career.v51Kept[k]=Number(v);
    });
  }catch(e){}
}
function v51RestoreReal3(){
  try{
    if(!career)return;
    career.attrs=career.attrs||{};
    /* 优先用上一季保存值；否则用球员模板值；再否则用合理默认 */
    const p=(typeof playerBy==='function')?playerBy(career.playerId):null;
    const kept=career.v51Kept||{};
    REAL3.forEach(k=>{
      if(career.attrs[k]==null||!isFinite(Number(career.attrs[k]))){
        let v=kept[k];
        if(v==null&&p&&p.attrs&&p.attrs[k]!=null)v=p.attrs[k];
        if(v==null)v=k==='blocks'?65:k==='steals'?58:75;
        career.attrs[k]=clamp(Number(v),V51_SPEC[k].lo,V51_SPEC[k].hi);
      }
    });
  }catch(e){}
}
window.v51RestoreReal3=v51RestoreReal3;
window.v51SnapshotReal3=v51SnapshotReal3;

/* 换季：先存后补 */
try{
  const __v51Next=nextSeason;
  nextSeason=function(){
    v51SnapshotReal3();
    const r=__v51Next();
    v51RestoreReal3();
    try{if(typeof save==='function')save()}catch(e){}
    return r;
  };
}catch(e){}
/* 读档：补回 */
try{
  const __v51Load=load;
  load=function(){
    const r=__v51Load();
    v51RestoreReal3();
    return r;
  };
}catch(e){}
/* 建号：补回 */
try{
  const __v51Create=createCareer;
  createCareer=function(){
    __v51Create();
    v51RestoreReal3();
    try{if(typeof save==='function')save()}catch(e){}
  };
}catch(e){}
/* 任意保存前先存一份（避免被删后无从恢复） */
try{
  const __v51Save=save;
  save=function(){
    v51SnapshotReal3();
    return __v51Save();
  };
}catch(e){}

/* ---------- D. 三项真正影响比赛数据 ----------
   盖帽 → blk（护框威慑）；抢断 → stl（预判）；力量 → 篮板与终结加成 */
try{
  const __v51Stat=statExpect;
  statExpect=function(){
    const x=__v51Stat();
    try{
      if(!career||!career.attrs||!x)return x;
      const a=career.attrs;
      const blk=Number(a.blocks), stl=Number(a.steals), str=Number(a.strength);
      const m=Number(career.minutes)||30;
      /* 盖帽：以 60 为联盟中位，每高出 10 点约 +0.35 帽 */
      if(isFinite(blk))x.blk=Math.max(0,(Number(x.blk)||0)+(blk-60)*0.035*(m/30));
      /* 抢断：以 60 为基准，每高出 10 点约 +0.22 断 */
      if(isFinite(stl))x.stl=Math.max(0,(Number(x.stl)||0)+(stl-60)*0.022*(m/30));
      /* 力量：重型内线在篮板上更占优（最多 +8%），终结更稳 */
      if(isFinite(str)&&str>60)x.reb=(Number(x.reb)||0)*(1+Math.min(.08,(str-60)*0.002));
    }catch(e){}
    return x;
  };
}catch(e){}

/* ---------- E. 三项计入评分 ----------
   OVR 原本只看八项。这里给盖帽/抢断/力量各一个**小权重**（合计约 6%），
   口径是「防守威慑与对抗强度也算能力」；同时把八项权重等比微调，
   保证总分结构不变、不会因为补了这三项就凭空涨一大截。 */
try{
  /* 记录原始八项权重（与 calcOvr 一致） */
  const W8={finishing:.16,shooting:.13,playmaking:.14,defense:.16,rebounding:.12,athleticism:.11,durability:.09,mentality:.09};
  /* 从八项里各让出一点，给三项腾出 6%：0.62 缩放 + 三项小权重 */
  const V51_W={blocks:.028,steals:.018,strength:.014};   /* 合计 0.06 */
  const SCALE=0.94;                                       /* 八项合计 0.94 */
  const __v51Calc=calcOvr;
  calcOvr=function(a){
    try{
      if(a&&isFinite(Number(a.blocks))){
        let sum=0;
        Object.keys(W8).forEach(k=>{sum+=(Number(a[k])||0)*W8[k]*SCALE});
        Object.keys(V51_W).forEach(k=>{sum+=(Number(a[k])||0)*V51_W[k]});
        return Math.round(sum);
      }
    }catch(e){}
    return __v51Calc(a);
  };
}catch(e){}

window.__v51Debug={REAL3,V51_SPEC,v51RestoreReal3,v51SnapshotReal3,has:()=>!!career};

})();
