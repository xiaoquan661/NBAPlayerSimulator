
/* =====================================================================
   V4.7 · 姚明专属主线推进修复
   浸泡测试（连打 9 个赛季）发现：

   问题 1（严重）：主线卡在第 4 章，永远走不下去。
     第 5 章的条件是 stage==='offseason'，但 maybeStory 只在**常规赛模拟中**
     （simulateGame 的末尾）被调用；进入休赛期后不再有人检查剧情，
     于是「第 5 章待触发」永久成立却永不弹出，后面 6~9 章全被堵死。
     实测：连打 9 季，storyIndex 停在 4，只触发了 4/9 章。

   问题 2：第 5 章的条件包含了 preseason，导致第 1 年休赛期之前就可能成立。

   修法：
     A. 把姚明第 5 章的条件从「休赛期」改成「常规赛中的等价进度点」
        （第 3 季起、打到 20 场），使它在 maybeStory 真正会被调用的时机成立。
     B. 去掉 preseason 泄漏，只在真正的 offeason 且赛季数≥2 时算成立
        （作为另一条可用路径）。
     C. 补一个「赛季结束时的剧情检查」：在进入休赛期时也跑一次主线判定，
        避免将来再有章节因为绑在非常规赛阶段而被堵死。
   ===================================================================== */
(function(){
if(window.__v47YaoStoryFix)return;window.__v47YaoStoryFix=true;

try{
  /* ---------- A + B：修正姚明的章节门槛 ---------- */
  const __v47Ready=storyReady;
  storyReady=function(i){
    try{
      if(career&&career.playerId==='yao'){
        const g=career.games||0,y=career.seasonNo||1;
        const off=(career.stage==='offseason'&&y>=2);     /* 只在第2年以后的休赛期才算 */
        const arr=[
          false,                                  /* 第1章：建号时挂上 */
          g>=10,                                  /* 第2章：打了10场 */
          y>=1&&g>=32,                            /* 第3章：赛季中后段 */
          y>=2&&g>=12,                            /* 第4章：第2年（麦迪来了） */
          /* 第5章（国家队负荷）：休赛期 或 第3年打到20场 —— 
             后者保证它一定能在常规赛里被 maybeStory 检查到 */
          off||(y>=3&&g>=20),
          (career.injury&&career.injury.severity)||g>=40,   /* 第6章：受伤或40场 */
          /* 第7章（季后赛抢七）：季后赛 或 第3年打到50场 —— 同样保证可达 */
          career.stage==='playoffs'||(y>=3&&g>=50),
          y>=6||career.age>=30,                   /* 第8章：第6年 / 30岁 */
          y>=8||career.age>=32                    /* 第9章：第8年 / 32岁 */
        ];
        return !!arr[i];
      }
    }catch(e){}
    return __v47Ready(i);
  };
}catch(e){}

/* ---------- C：赛季末也检查一次主线（修掉「绑在非常规赛阶段就永不触发」） ---------- */
try{
  const __v47End=(typeof finishRegular==='function')?finishRegular:null;
  if(__v47End){
    finishRegular=function(){
      const r=__v47End();
      try{
        if(career&&!career.retired&&career.exclusive&&typeof storyReady==='function'){
          const arr=(typeof campaigns!=='undefined'&&campaigns&&campaigns[career.playerId])||[];
          const i=career.storyIndex;
          if(i<arr.length&&storyReady(i))ui.storyEvent=arr[i];
        }
      }catch(e){}
      return r;
    };
  }
}catch(e){}

window.__v47YaoStoryDebug={ready:storyReady};

})();
