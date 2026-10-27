
/* Shared game salary scale. 2025 anchor: NBA official 154.647M; 7% annual game growth. */
(function(){
'use strict';
const money=n=>Math.round(n*1000)/1000;
function cap(year){return money(154.647*Math.pow(1.07,(Number(year)||2025)-2025));}
function year(){return Number(career?.seasonYear)||2025;}
function minimum(y=year()){return money(cap(y)*.01);}
function maximum(service=0,y=year()){return money(cap(y)*(service>=10?.35:service>=7?.30:.25));}
function salary(p,y=year()){const service=Math.max(0,y-(p.draftYear||y-Math.max(0,(p.age||20)-20)));return money(Math.max(minimum(y),Math.min(maximum(service,y),cap(y)*.25*Math.pow(Math.max(0,Math.min(1,((p.ovr||55)-55)/42)),2))));}
window.v152Finance={cap,year,minimum,maximum,salary,money};
})();

