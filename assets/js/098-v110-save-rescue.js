
/* ============================================================================
 * V110 · 修「读取不了存档」
 *
 * 玩家反馈：存档读不出来。
 *
 * 根因（base 实现）：
 *   function load(){ let x=JSON.parse(localStorage.getItem(SAVE));
 *                   if(x&&x.playerId&&playerBy(x.playerId))return x; return null }
 *   —— 只要 `playerBy(存档里的球员 id)` 查不到，整份存档就直接被当成「不存在」。
 *     触发条件很宽：球员 id 改名 / 版本回滚 / 存档被截断 / JSON 损坏，
 *     都会让玩家的进度「看起来没了」；而槽位页随后把该槽显示成「空存档」，
 *     玩家一点就真的把它覆盖掉了。
 *
 * 这一层做四件事：
 *   ① JSON 容错：截断/多尾巴的存档，截到最后一个 } 重试；
 *   ② 未知球员 id 也照常读出来（并用兜底档案对象兜住 playerBy，避免后续崩）；
 *   ③ 主键读不到时，从 bust_backup_<槽> 抢救（v106 覆盖前留的那份）；
 *   ④ 存档写失败（配额/异常）时先精简再重试，最后额外留一份备份 —— 不允许静默丢档。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v110Fix)return;window.__v110Fix=true;

var SLOT_KEYS=['save_bust_no1_v4','bust_slot_2_v4','bust_slot_3_v4'];

function activeKey(){
  try{
    var n=1;
    try{if(typeof career!=='undefined'&&career&&career.__slot)n=Number(career.__slot)||1}catch(e){}
    try{if(typeof ui!=='undefined'&&ui&&ui.slot>=1)n=Number(ui.slot)}catch(e){}
    return SLOT_KEYS[n-1]||SLOT_KEYS[0];
  }catch(e){return SLOT_KEYS[0]}
}
function slotOfKey(k){var i=SLOT_KEYS.indexOf(k);return i<0?1:i+1}

/* 容错解析：先按原样，再截到最后一段完整对象 */
function parseLoose(raw){
  if(!raw||typeof raw!=='string')return null;
  try{var o=JSON.parse(raw);if(o&&typeof o==='object')return o}catch(e){}
  try{
    var cut=raw.lastIndexOf('}');
    while(cut>0){
      try{var o2=JSON.parse(raw.slice(0,cut+1));if(o2&&typeof o2==='object')return o2}catch(e){}
      cut=raw.lastIndexOf('}',cut-1);
    }
  }catch(e){}
  return null;
}
window.v110ParseLoose=parseLoose;

/* 未知球员 id：往球员表里补一份兜底档案
   （playerBy 是 const 箭头函数，包不了 —— 实测赋值会被静默吞掉；
     但 P 是数组，推一条进去 playerBy 自然就能查到） */
function v110NameHash(s){var h=0;s=String(s||'');for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h}
/* 旧自建存档没有 englishName：按生涯固定信息生成稳定英文名，避免显示 MY NAME。 */
function v110CustomEn(c){
  if(!c)return 'Rookie';
  if(c.englishName)return c.englishName;
  var a=c.__arch||{};
  var seed=[c.draftYear,c.origin,a.origin,a.style,a.vow,c.team,c.seasonYear||c.seasonNo].join('|');
  var n=v110NameHash(seed)%997,nm='';
  try{if(window.v180EnglishName)nm=window.v180EnglishName(Number(c.draftYear)||2001,n,null)}catch(e){}
  if(!nm)nm='Rookie '+(100+(n%900));
  try{c.englishName=nm}catch(e){}
  return nm;
}
function ensureAlias(id,careerObj){
  try{
    if(id==null)return null;
    var cid=String(id);
    var arr=(typeof P!=='undefined'&&Array.isArray(P))?P:null;
    if(!arr)return null;
    var found=null;
    arr.forEach(function(x){if(x&&x.id===cid)found=x});
    if(found)return found;
    var c=careerObj||((typeof career!=='undefined')?career:null);
    var base=arr[0]||{};
    var isCustom=String(cid)==='custom';
    var stub={
      id:cid,
      zh:isCustom?'我':((c&&c.playerName)||(c&&c.zh)||'存档球员'),
      en:isCustom?v110CustomEn(c):cid,
      year:(c&&c.draftYear)||2008,
      age:(c&&c.age)||20,
      team:(c&&c.team)||base.team||'CHI',
      pos:isCustom?'自建球员':'—',
      ovr:(c&&c.ovr)||75,
      title:isCustom?'我的生涯':'这份存档来自另一个版本',
      tagline:isCustom?'你从选秀夜开始，自己写下了这条生涯。':'数据完整保留，档案按联盟平均补齐。',
      desc:isCustom?'你从选秀夜开始，自己写下了这条生涯。':'球员 id「'+cid+'」在当前版本查不到（改名/回滚/跨版本存档）。系统已按你现在这份存档继续运行，进度不会丢。',
      tags:isCustom?['自建球员']:['版本兼容'],
      specialName:'状态',
      special:(c&&c.special)||40,
      health:(c&&c.health)||70,
      confidence:(c&&c.confidence)||60,
      trust:(c&&c.trust)||60,
      attrs:(c&&c.attrs)||{finishing:70,shooting:60,playmaking:65,defense:65,rebounding:65,athleticism:70,durability:70,mentality:65},
      exclusive:{n:'（原版专属天赋）',d:'当前版本没有该球员的专属天赋数据，机制按通用规则运行；存档进度不受影响。',fx:cid+'_x'},
      reality:isCustom?'这是一段没有人写过的人生。':''
    };
    arr.push(stub);
    try{if(window.v99Diag)window.v99Diag('alias-player:'+cid)}catch(e){}
    return stub;
  }catch(e){return null}
}
window.v110EnsureAlias=ensureAlias;

/* ③ 主键读不到 → 备份抢救 */
function rescueFrom(key){
  try{
    var n=slotOfKey(key);
    var b=localStorage.getItem('bust_backup_'+n);
    var o=parseLoose(b);
    if(o&&o.playerId)return {career:o,from:'backup'};
  }catch(e){}
  return null;
}
try{
  if(typeof load==='function'&&!window.__v110LoadGuard){
    var __v110Load=load;
    load=function(){
      var c=null;
      try{c=__v110Load.apply(this,arguments)}catch(e){c=null}
      if(c){try{ensureAlias(c.playerId,c)}catch(e){}return c};
      try{
        var key=null;
        try{key=(typeof SAVE!=='undefined')?SAVE:null}catch(e){}
        /* 主键里其实有东西（只是解析/球员 id 不认）→ 宽松解析后再走一次 */
        var raw=key?localStorage.getItem(key):null;
        var loose=parseLoose(raw);
        if(loose&&loose.playerId){
          ensureAlias(loose.playerId,loose);   /* 未知球员 id 先补档案，再放行 */
          window.__v110Recovered='主键宽松解析';
          return loose;
        }
        var r=rescueFrom(key||activeKey());
        if(r){ensureAlias(r.career.playerId,r.career);window.__v110Recovered=r.from;return r.career}
      }catch(e){}
      return null;
    };
    try{if(typeof window.load==='function')window.load=load}catch(e){}
    window.__v110LoadGuard=true;
  }
}catch(e){}

/* ④ 写档加固：失败就精简重试，最后再留一份备份 */
try{
  if(typeof save==='function'&&!window.__v110SaveGuard){
    var __v110Save=save;
    save=function(){
      try{return __v110Save.apply(this,arguments)}
      catch(e){
        try{if(window.v99Diag)window.v99Diag('save-fail:'+((e&&e.message)||e))}catch(e2){}
        try{
          if(typeof career!=='undefined'&&career){
            /* 精简非必要字段后再试一次（长生涯最容易顶到配额） */
            if(career.feed instanceof Array)career.feed.length=Math.min(career.feed.length,60);
            if(career.storyLog instanceof Array)career.storyLog.length=Math.min(career.storyLog.length,120);
            try{if(career.worldline&&career.worldline.choices instanceof Array)career.worldline.choices.length=Math.min(career.worldline.choices.length,120)}catch(e3){}
            var retry=__v110Save.apply(this,arguments);
            /* 成功后再补一份备份，下一次读不出来时能救 */
            try{localStorage.setItem('bust_backup_'+slotOfKey(activeKey()),JSON.stringify(career))}catch(e4){}
            return retry;
          }
        }catch(e5){}
        return undefined;
      }
    };
    try{if(typeof window.save==='function')window.save=save}catch(e){}
    window.__v110SaveGuard=true;
  }
}catch(e){}

window.__v110Debug={keys:SLOT_KEYS,parseLoose:parseLoose,recovered:function(){return window.__v110Recovered||null}};
})();

