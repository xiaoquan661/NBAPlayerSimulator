
/* ============================================================================
 * v102 · 补上 DPOY 的荣誉计数
 *
 * 实测：同样是通过「奖项卡片」判定的荣誉，MVP 有专门的写入层
 *   （v220 里 career.honors.MVP = 旧值 + 是否获奖），
 *   而 **DPOY 全流程没有任何一处写入** career.honors.DPOY ——
 *   结果是：赛季奖项页显示「最佳防守球员 · 获奖」，但荣誉墙里没有这一项，
 *   退役评分/历史排名也不把它算进去。
 *
 * 这里按与 MVP 完全相同的口径补一个写入器：本季首次结算时置为
 * 「上赛季的值 + 本季是否获奖」，重复调用不会重复累加。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v102Fix)return;window.__v102Fix=true;
try{
  if(typeof awardSeason==='function'&&!window.__v102Guard){
    var __v102Award=awardSeason;
    awardSeason=function(){
      var before=(typeof career!=='undefined'&&career&&career.honors&&career.honors.DPOY)||0;
      var season=(typeof career!=='undefined'&&career)?career.seasonNo:null;
      var r=__v102Award.apply(this,arguments);
      try{
        if(typeof career==='undefined'||!career||career.seasonNo!==season)return r;
        if(!career.honors)career.honors={};
        var cards=career.seasonAwards||[],card=null;
        for(var i=0;i<cards.length;i++){
          var c=cards[i];
          if(c&&(c.key==='DPOY'||c.title==='最佳防守球员')){card=c;break}
        }
        if(career.dpoyHonorSeason!==career.seasonNo){
          career.dpoyHonorSeason=career.seasonNo;
          career.honors.DPOY=before+((card&&card.won)?1:0);
        }
        if(card&&card.won&&typeof recordAchievement==='function'){
          recordAchievement('最佳防守球员',
            (typeof seasonLabel==='function'?seasonLabel():'')+'：'+String(card.detail||''),
            'award','award-'+career.seasonNo+'-DPOY',false);
        }
        if(typeof save==='function')save();
      }catch(e){}
      return r;
    };
    try{if(typeof window.awardSeason==='function')window.awardSeason=awardSeason}catch(e){}
    window.__v102Guard=true;
  }
}catch(e){}
window.__v102Debug={fixed:true};
})();

