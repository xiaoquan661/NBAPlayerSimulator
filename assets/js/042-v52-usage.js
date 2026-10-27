
/* =====================================================================
   V5.2 · 出手权重：得分要看「你在队里排第几」
   开发者反馈（原话）：
     「得分虽然看进攻能力，但也要看这个评分在队内能获得多少出手权重，
       现在游戏内所有球员都是有评分的对吧」

   体检结论（实测）：
     - 联盟里 273 名球员每人都有 ovr（career.v32League.players[i].ovr）
     - 姚明在火箭的队友评分：94 / 92 / 91 / 82 / 80 / 79 / 77 / 74
       → 队里有 3 个人比姚明（81）强，但旧公式完全没考虑这件事
     - 旧公式得分只由「终结/投射/组织 + 分钟 + 角色」决定，
       角色又只由 OVR 档位给出，与队友强弱无关
       → 于是「80 分球员」也能拿到 23 分，等于把球权全吃掉却不讲道理

   修法：
     出手权重 = 基于「你在队内的评分排序」+「与队友的实力差」
        - 队内第 1 得分点 → 权重最高
        - 队里有明显更强的球星 → 权重被合理压缩
        - 队友普遍弱 → 你获得更多球权（当家球星待遇）
     再乘进 statExpect 的得分与助攻，让「得分」与「队内地位」自洽。
   ===================================================================== */
(function(){
if(window.__v52Usage)return;window.__v52Usage=true;

/* 取我方队友评分（不含自己） */
function v52TeamMates(){
  try{
    const L=career&&career.v32League;
    if(!L||!Array.isArray(L.players))return [];
    const myTeam=career.team;
    const myName=(typeof currentP==='function'&&currentP())?(currentP().zh||currentP().name):null;
    return L.players.filter(p=>p&&p.team===myTeam&&(p.name||p.zh)!==myName);
  }catch(e){return []}
}

/* 计算出手权重（1.0 = 正常；>1 球权更多；<1 球权被分走） */
function v52UsageWeight(){
  try{
    if(!career)return 1;
    const myOvr=Number(career.ovr)||75;
    const mates=v52TeamMates();
    if(!mates.length)return 1;
    /* 队内前 5 的评分（对位真实的球权竞争者） */
    const tops=mates.map(p=>Number(p.ovr)||70).sort((a,b)=>b-a).slice(0,5);
    /* 比我强的有几个人 */
    const better=tops.filter(o=>o>myOvr+1).length;
    const betterSum=tops.filter(o=>o>myOvr+1).reduce((a,o)=>a+(o-myOvr),0);
    const avgTop=tops.reduce((a,b)=>a+b,0)/tops.length;

    /* 基础权重：按「队内排名」给档 */
    let w=better===0?1.22:better===1?1.06:better===2?0.92:better===3?0.80:0.70;
    /* 实力差修正：队友比你强得多 → 再压一点；你比队友强得多 → 再加一点 */
    const gap=(myOvr-avgTop);
    w+=(gap/100)*0.55;
    /* 与球队实力挂钩：弱队当核心球权更多（旧逻辑用 role 表达，这里强化） */
    try{
      const pw=Number((typeof teamBy==='function'&&teamBy(career.team)||{}).power)||80;
      if(pw<78)w+=0.10;else if(pw<84)w+=0.04;else if(pw>=90)w-=0.05;
    }catch(e){}
    return Math.max(0.55,Math.min(1.45,w));
  }catch(e){return 1}
}
window.v52UsageWeight=v52UsageWeight;
window.__v52Debug={usageWeight:v52UsageWeight,mates:v52TeamMates};

/* 把权重乘进得分与助攻（得分受影响最大，助攻次之；篮板不受球权影响） */
try{
  const __v52Stat=statExpect;
  statExpect=function(){
    const x=__v52Stat();
    try{
      if(!career||!x)return x;
      const w=v52UsageWeight();
      if(Math.abs(w-1)<0.001)return x;
      /* 得分对球权最敏感；助攻次之；篮板/防守数据基本不受影响 */
      const pts=Number(x.pts)||0;
      x.pts=Math.max(2,Math.min(34,pts*(0.45+0.55*w)));
      const ast=Number(x.ast)||0;
      x.ast=Math.max(0.4,ast*(0.75+0.25*w));
      /* 把权重记下来，供界面解释「为什么我的出手变多了/变少了」 */
      career.v52Usage=Math.round(w*100)/100;
    }catch(e){}
    return x;
  };
}catch(e){}

/* 赛季页显示当前球权（让玩家看得见原因） */
try{
  if(typeof regularView==='function'){
    const __v52View=regularView;
    regularView=function(){
      let h=__v52View();
      try{
        const w=v52UsageWeight();
        const mates=v52TeamMates().map(p=>Number(p.ovr)||70).sort((a,b)=>b-a).slice(0,3);
        const myOvr=Number(career.ovr)||75;
        const better=mates.filter(o=>o>myOvr+1).length;
        const label=w>=1.15?'球队第一选择':w>=1.0?'主要出手点':w>=0.85?'第二/第三选择':'轮换内分享球权';
        const note=`出手权重 ${w.toFixed(2)} · ${label}`+
          (better?`（队内 ${better} 人评分高于你）`:'（队内评分最高）');
        /* 插到「本赛季个人数据」卡片之前 */
        const anchor='<section class="v26-statbox">';
        h=String(h).indexOf(anchor)>=0
          ?String(h).replace(anchor,`<div class="v52-usage">${note}</div>`+anchor)
          :`<div class="v52-usage">${note}</div>`+String(h);
      }catch(e){}
      return h;
    };
    try{
      const st=document.createElement('style');
      st.id='v52-usage-style';
      st.textContent='.v52-usage{margin:8px 0 0;padding:7px 10px;border-radius:12px;background:#fffaf5;border:1px solid #efe0d2;font-size:9.5px;color:#7b6a5f}';
      document.head.appendChild(st);
    }catch(e){}
  }
}catch(e){}

})();
