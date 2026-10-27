
/* v160: common league merit and persistent voting history. */
(function(){
'use strict';
const cap=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const draftIds=new Map();
function isRookie(m,p){
 const year=Number(career.seasonYear),q=m.players.find(q=>q.id===p.id);
 if(p.self&&career.seasonNo===1||Number(q?.draftYear)===year)return true;
 if(!draftIds.has(year)){const rows=window.V159_HISTORICAL_DRAFT?.[year]||window.V129_DATA?.draft?.[year]||[];draftIds.set(year,new Set(rows.map(r=>__v129Debug.canonical(r[1]))));}
 return draftIds.get(year).has(p.id);
}
function voteHistory(m){
 if(!m.v160Awards||!m.v160Awards.winners||typeof m.v160Awards.winners!=='object'||Array.isArray(m.v160Awards.winners)){const winners={};for(const h of career.history||[]){if(!h||typeof h!=='object')continue;const awards=Array.isArray(h.awards)?h.awards:[];if(awards.some(a=>typeof a==='string'&&['MVP','常规赛MVP','最有价值球员','常规赛最有价值球员'].includes(a.replace(/\s/g,'')))){const year=Number(String(h.season).match(/\d{4}/)?.[0]);if(year)winners[year]=__v129Debug.canonical(currentP().en);}}m.v160Awards={version:160,winners};}
 return m.v160Awards;
}
function streak(m,id){const winners=voteHistory(m).winners;let n=0;for(let y=Number(career.seasonYear)-1;winners[y]===id&&n<30;y--)n++;return n;}
function merit(p,w,n,share){
 const availability=Math.pow(cap(p.gp/Math.max(1,n),0,1),.65),eff=cap(p.ts,.45,.68);
 const production=Math.min(p.pts,36)*(.55+eff)+Math.min(p.reb,13)*.55+Math.min(p.ast,12)*1.45+Math.min(p.stl,2.5)*1.25+Math.min(p.blk,3)*1.05-Math.min(p.tov,8)*2;
 const success=.82+.32*cap(w/Math.max(1,n),0,1);
 return Math.max(0,production)*availability*success*(.9+.1*cap(share/.3,.5,1.15));
}
function fatigue(n){return Math.min(.28,Math.max(0,n)*.07);}
function scoreAwards(rows,m,n,st){
 const group={};for(const p of rows){(group[p.team]||(group[p.team]=[])).push(p);}
 for(const ps of Object.values(group)){const teamPoints=ps.reduce((s,p)=>s+p.pts,0);for(const p of ps){p.contribution=p.pts/Math.max(1,teamPoints);p.mvpRaw=merit(p,st[p.team]?.w||0,n,p.contribution);p.mvpStreak=streak(m,p.id);p.mvp=+(p.mvpRaw*(1-fatigue(p.mvpStreak))).toFixed(2);p.def=+((Math.min(p.reb,12)*.08+Math.min(p.stl,3)*3.1+Math.min(p.blk,4)*3.7)*Math.pow(cap(p.gp/Math.max(1,n),0,1),.65)*(.85+.25*cap((st[p.team]?.w||0)/Math.max(1,n),0,1))).toFixed(2);}}
 return rows;
}
function eligible(p,m,final=false){return p.ovr>=90&&p.gp>=(final?65:Math.max(1,Math.ceil(career.games*.7)))&&(__v129Debug.standings(m)[p.team]?.w||0)>=Math.ceil(career.games*.5);}
window.v160Balance={merit,fatigue,streak,voteHistory,scoreAwards,eligible,isRookie};
})();

