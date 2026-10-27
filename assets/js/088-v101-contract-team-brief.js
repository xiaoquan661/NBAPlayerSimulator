
/* ============================================================================
 * v101 · 合同报价补上「球队情报」
 *
 * 开发者原话：休赛期展示合约时（主队报价 + 其他球队报价），要能看到
 *   ① 这支球队的实力　② 我去了之后是什么地位　③ 除我之外评分最高的队友是谁
 *
 * 数据来源：球队实力 = teamBy(abbr).power（联盟每年重算）；
 *   队友 = career.v32League.players 里该队的人（这份名单会随赛季变老/退役/进新秀，
 *   所以「首席队友」是真的当赛季该队最强的人，不是写死的）。
 *   地位 = 我的 OVR 在该队（含我）里的排名：第 1 → 球队第一人，2~3 → 核心之一，
 *   4~5 → 稳定首发，6~7 → 轮换球员，其余 → 边缘球员。
 *
 * 接缝：这个函数在**渲染时**才被两个报价列表调用（offContract 的卡片 + v221 的到期弹窗），
 * 所以放在文件末尾定义也没问题。
 * ============================================================================ */
(function(){
'use strict';
if(window.__v101Fix)return;window.__v101Fix=true;
function esc101(v){return String(v==null?'':v).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})}
function v101TeamBrief(abbr){
  try{
    if(!abbr)return null;
    var t=null;try{t=(typeof teamBy==='function')?teamBy(abbr):null}catch(e){}
    var power=t?(Number(t.power)||80):80;
    var tier=power>=91?'争冠级':power>=86?'强队':power>=81?'季后赛级':power>=75?'中游球队':'重建中';
    var me=80;try{me=Number(career&&career.ovr)||80}catch(e){}
    var myZh='';try{myZh=(typeof currentP==='function'&&currentP())?currentP().zh:''}catch(e){}
    var mates=[];
    try{
      mates=((career&&career.v32League&&career.v32League.players)||[])
        .filter(function(p){return p&&p.team===abbr&&!p.retired&&p.name!==myZh})
        .map(function(p){return {name:String(p.name||''),ovr:Number(p.ovr)||0,age:Number(p.age)||0}})
        .sort(function(a,b){return b.ovr-a.ovr});
    }catch(e){}
    var rank=1;mates.forEach(function(m){if(m.ovr>me)rank++});
    var role=rank===1?'球队第一人':rank<=3?'核心之一':rank<=5?'稳定首发':rank<=7?'轮换球员':'边缘球员';
    return {abbr:abbr,power:power,tier:tier,role:role,rank:rank,mate:mates[0]||null,mateCount:mates.length};
  }catch(e){return null}
}
window.v101TeamBrief=v101TeamBrief;
window.v101OfferInfo=function(abbr){
  try{
    var b=v101TeamBrief(abbr);
    if(!b)return '';
    var s='球队实力 '+b.power+'（'+esc101(b.tier)+'） · 你的地位：'+esc101(b.role);
    if(b.mateCount)s+='（队内第 '+b.rank+'）';
    s+= b.mate ? (' · 首席队友：'+esc101(b.mate.name)+' '+b.mate.ovr) : ' · 暂无队友数据';
    return '<span class="v101-info">'+s+'</span>';
  }catch(e){return ''}
};
try{
  var st=document.createElement('style');
  st.id='v101-style';
  st.textContent='.v101-info{display:block;font-size:9px;line-height:1.6;color:#9b8878;margin-top:4px;padding-top:4px;border-top:1px dashed rgba(155,136,120,.4)}';
  document.head.appendChild(st);
}catch(e){}
window.__v101Debug={brief:v101TeamBrief,info:window.v101OfferInfo};
})();

