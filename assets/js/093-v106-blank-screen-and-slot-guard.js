
/* ============================================================================
 * v106 · 开发者反馈（三项）
 *   ① 玩着玩着白屏；退出后点存档，进度被清空
 *   ② 连着 10 个赛季总决赛都是勇士（季后赛对手每年一模一样）
 *
 * 白屏的真正元凶（代码级定位）：
 *   v97 的渲染守卫在「连续两次渲染异常」后会把 render 永久闩死（stopped=true），
 *   之后任何跳转、任何点击都画不出东西 —— 页面就停在白屏，而且只弹一次提示。
 *   玩家此时如果去点存档，恰好撞上「槽位被误判为空 → 当成开新局」的路径，
 *   进度就被清空了（两条 bug 是连锁的）。
 *
 * 本层做四件事：
 *   ① 看门狗：页面空白时自动解开 v97 的闩锁并重画（白屏自愈），仍失败才画恢复页，
 *      并把现场写进 hupu_diag（下次白屏能直接看到原因）；
 *   ② 槽位防误清：点「看着是空」的槽时先问一次宿主，宿主其实有档 → 走「覆盖需确认」
 *      流程，绝不静默清空；真覆盖前把旧档另存一份（bust_backup_<槽>）兜底；
 *   ③ 存档体积收敛：feed 只留最近 200 条，避免长生涯把存档写到配额上限；
 *   ④ 本赛季球队实力（v106TeamPower）：静态 teams[].power 让每年最强 8 队完全相同，
 *      按「球队+赛季年」做确定性浮动，季后赛对手逐年变化。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v106Fix)return;window.__v106Fix=true;

/* ---------- ④ 本赛季球队实力：同一赛季固定，跨赛季浮动 ---------- */
function v106Hash(str){
  var h=2166136261,i;
  for(i=0;i<str.length;i++){h^=str.charCodeAt(i);h=(h*16777619)>>>0}
  return h;
}
function v106TeamPower(abbr,year){
  try{
    var t=(typeof teamBy==='function')?teamBy(abbr):null;
    var base=Number(t&&t.power)||80;
    var y=Number(year)||0;
    if(!y){try{y=Number(career&&career.seasonYear)||0}catch(e){}}
    if(!y){try{y=Number(career&&career.draftYear)+((Number(career&&career.seasonNo)||1)-1)}catch(e){y=0}}
    if(!y)return base;
    /* 注意：运行期的 teamBy(x).power 不是数据表里的静态值 —— 联盟层会按阵容重算
       （实测运行期区间 68~96，勇士常年 96 全联盟第一，这就是「年年总决赛打勇士」的原因）。
       所以漂移叠加在「运行期实力」上，并且不能用 99 封顶，否则强队全顶到上限、
       排序退化成固定顺序（等于没改）。 */
    var drift=(v106Hash(String(abbr)+'#'+y)%11)-5;   /* -5 ~ +5 */
    return Math.max(62,Math.min(104,base+drift));
  }catch(e){
    try{return Number(teamBy&&teamBy(abbr)&&teamBy(abbr).power)||80}catch(e2){return 80}
  }
}
window.v106TeamPower=v106TeamPower;

/* ---------- ③ 存档体积：feed 收敛 ---------- */
try{
  if(typeof save==='function'&&!window.__v106SaveGuard){
    var __v106Save=save;
    save=function(){
      try{
        if(typeof career!=='undefined'&&career&&career.feed instanceof Array&&career.feed.length>200){
          career.feed.length=200;
        }
      }catch(e){}
      try{return __v106Save.apply(this,arguments)}catch(e){return undefined}
    };
    try{if(typeof window.save==='function')window.save=save}catch(e){}
    window.__v106SaveGuard=true;
  }
}catch(e){}

/* ---------- ② 槽位防误清 ---------- */
/* 槽位本地键：v81LocalKey 在 v81 的 IIFE 里，外面拿不到（用 typeof 探测会静默走错分支），
   所以这里自己维护一份映射：1 号槽复用项目原有键，2/3 号槽用新键。 */
function v106SlotKey(n){
  var k=null;
  try{k=(typeof window.v81LocalKey==='function')?window.v81LocalKey(n):null}catch(e){}
  if(!k)k=(Number(n)===1)?'save_bust_no1_v4':('bust_slot_'+n+'_v4');
  return k;
}
function v106BackupSlot(n){
  try{
    var raw=localStorage.getItem(v106SlotKey(n));
    if(!raw)return false;
    localStorage.setItem('bust_backup_'+n,String(raw));
    return true;
  }catch(e){return false}
}
window.v106BackupSlot=v106BackupSlot;
try{
  if(typeof window.v82SlotPick==='function'&&!window.__v106PickGuard){
    var __v106Pick=window.v82SlotPick;
    window.v82SlotPick=function(n,mode){
      try{
        if(mode==='new'){
          var all={};
          try{all=(typeof v81ReadAllSlots==='function')?v81ReadAllSlots():{}}catch(e){}
          if(all&&all[n]){
            v106BackupSlot(n);
            return __v106Pick.call(this,n,'overwrite');
          }
          if(typeof v81EnsureSlotLoaded==='function'){
            return Promise.resolve(v81EnsureSlotLoaded(n)).then(function(ok){
              if(ok){
                try{if(window.v99Diag)window.v99Diag('slot'+n+' 本地判空但宿主有档：已改为覆盖确认，避免误清')}catch(e){}
                v106BackupSlot(n);
                return __v106Pick.call(null,n,'overwrite');
              }
              return __v106Pick.call(null,n,'new');
            }).catch(function(){return __v106Pick.call(null,n,'new')});
          }
        }
        if(mode==='overwrite'){v106BackupSlot(n)}
      }catch(e){}
      return __v106Pick.apply(this,arguments);
    };
    window.__v106PickGuard=true;
  }
}catch(e){}

/* ---------- ① 白屏看门狗：解开 v97 闩锁 → 重画 → 仍空白才画恢复页 ---------- */
var v106Busy=false,v106Recovered=0;
function v106Blank(){
  try{
    var app=document.getElementById('app');
    return !!app&&app.children.length===0;
  }catch(e){return false}
}
function v106Recover(reason){
  var app=document.getElementById('app');
  if(!app)return false;
  try{if(window.v97Reset)window.v97Reset()}catch(e){}
  try{if(typeof render==='function')render()}catch(e){}
  if(!v106Blank()){
    v106Recovered++;
    try{
      if(v106Recovered<=3&&window.v99Diag){
        window.v99Diag('blank-selfheal('+reason+') | '+(window.v99State?window.v99State():''));
      }
    }catch(e){}
    return true;
  }
  /* 还是空白：进「安全模式」—— 把临时浮层状态清掉、退回封面再画一次。
     这一步能把玩家从坏状态里救出来，且不碰存档。 */
  try{
    if(typeof ui!=='undefined'&&ui){ui.storyEvent=null;ui.modal=null;ui.v82Picker=null;ui.v82FullRank=false;ui.screen='home'}
    if(typeof render==='function')render();
  }catch(e){}
  if(!v106Blank()){
    v106Recovered++;
    try{if(window.v99Diag)window.v99Diag('blank-safehome('+reason+') | '+(window.v99State?window.v99State():''))}catch(e){}
    return true;
  }
  try{
    if(window.v99Diag)window.v99Diag('blank:'+reason+' | '+(window.v99State?window.v99State():''));
  }catch(e){}
  try{if(typeof v97Panel==='function')v97Panel('页面没能渲染出来（已自动拦截）：'+reason)}catch(e){}
  return false;
}
window.v106Recover=v106Recover;
try{
  setInterval(function(){
    if(v106Busy)return;
    if(!window.__v99Fix)return;                 /* 诊断层就绪前不介入，避免启动瞬间误判 */
    if(typeof ui==='undefined')return;
    if(!v106Blank())return;
    v106Busy=true;
    try{v106Recover('watchdog')}catch(e){}
    setTimeout(function(){v106Busy=false},2000);
  },1500);
}catch(e){}

try{
  window.addEventListener('error',function(){
    setTimeout(function(){try{if(v106Blank())v106Recover('onerror')}catch(e){}},60);
  });
  window.addEventListener('unhandledrejection',function(){
    setTimeout(function(){try{if(v106Blank())v106Recover('reject')}catch(e){}},60);
  });
}catch(e){}

window.__v106Debug={teamPower:v106TeamPower,recover:v106Recover,recovered:function(){return v106Recovered}};
})();

