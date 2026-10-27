
/* =====================================================================
   V3.5 · 赛季奖项页重做
   1) 奖项扩到 13 项：MVP、得分王、DPOY、最佳新秀、篮板王、助攻王、
      抢断王、盖帽王、最佳阵容一阵/二阵/三阵、最佳防守阵容一阵/二阵
   2) UI 升级：金属质感、荣誉台、得奖/未得奖分层
   3) 一页显示全：去掉顶部大图，紧凑两列栅格
   4) 逐项依次揭晓动效（不是一次性全展示）
   ===================================================================== */
(function(){
if(window.__v35Awards)return;window.__v35Awards=true;

/* =====================================================================
   PART 1 · 奖项判定与荣誉写入（13 项，覆盖旧 6 项卡片）
   ===================================================================== */
function v35Fmt(v){return (Math.round((Number(v)||0)*10)/10).toFixed(1)}

/* 生成 13 项奖项卡片 */
const __v35AwardSeason=awardSeason;
awardSeason=function(){
  __v35AwardSeason();
  if(!career||!Array.isArray(career.seasonAwards))return;
  const s=career.seasonStats||{},h=career.honors||{},ovr=career.ovr||0,wins=career.wins||0,
        def=career.attrs?career.attrs.defense:0,gp=s.gp||0;
  const first=career.seasonNo===1;
  /* 每项按「数据 + 评分 + 出勤 + 战绩」判定，并给出档位 */
  const rankOf=(score,tiers)=>{for(let i=0;i<tiers.length;i++)if(score>=tiers[i])return i+1;return 0};
  /* 最佳阵容：按综合分档 一阵/二阵/三阵 */
  const nbaScore=ovr*1.0+(s.pts||0)*1.1+(s.reb||0)*.5+(s.ast||0)*.8+((s.stl||0)+(s.blk||0))*1.5+(wins>=50?3:0);
  const nbaRank=(gp>=45&&ovr>=78)?rankOf(nbaScore,[104,98,92]):0;
  /* 最佳防守阵容：按防守类数据分档 防守一阵/二阵 */
  const defScore=def*1.0+((s.stl||0)+(s.blk||0))*2.6+(wins>=48?3:0);
  const defRank=(gp>=45&&def>=80)?rankOf(defScore,[108,100]):0;

  /* 单项王判定（含抢断王） */
  const titles={
    scoring:(s.pts||0)>=28.5,
    rebounding:(s.reb||0)>=12.2,
    assists:(s.ast||0)>=9.6,
    steals:(s.stl||0)>=2.1,
    blocks:(s.blk||0)>=2.6
  };
  const titleName={scoring:'得分王',rebounding:'篮板王',assists:'助攻王',steals:'抢断王',blocks:'盖帽王'};
  const titleShort={scoring:'得分',rebounding:'篮板',assists:'助攻',steals:'抢断',blocks:'盖帽'};
  const titleVal={scoring:s.pts,rebounding:s.reb,assists:s.ast,steals:s.stl,blocks:s.blk};

  const mk=(key,title,won,status,detail,extra)=>Object.assign({key,title,won,status,detail},extra||{});

  const cards=[];
  /* 1 MVP */
  const mvp=(career.seasonAwards.find(x=>x.key==='MVP')||{});
  cards.push(mk('MVP','最有价值球员',!!mvp.won,mvp.status||'未进入讨论',
    `${v35Fmt(s.pts)}分 · ${wins}胜 · OVR ${ovr}`,{tier:mvp.won?1:0}));
  /* 2 得分王 */
  cards.push(mk('得分王','得分王',titles.scoring,titles.scoring?'获奖':'未获奖',
    `场均 ${v35Fmt(s.pts)} 分（达标线 28.5）`,{tier:titles.scoring?1:0}));
  /* 3 DPOY */
  const dp=(career.seasonAwards.find(x=>x.key==='DPOY')||{});
  cards.push(mk('DPOY','最佳防守球员',!!dp.won,dp.status||'未进入讨论',
    `防守 ${def} · 抢断+盖帽 ${v35Fmt((s.stl||0)+(s.blk||0))}`,{tier:dp.won?1:0}));
  /* 4 最佳新秀 */
  const roy=career.seasonAwards.find(x=>x.key==='最佳新秀');
  if(first){
    cards.push(mk('最佳新秀','最佳新秀',!!(roy&&roy.won),(roy&&roy.status)||'未获奖',
      '新秀赛季综合评价',{tier:roy&&roy.won?1:0}));
  }else{
    /* 非新秀赛季不参与该奖：以「已过新秀期」呈现，视觉弱化 */
    cards.push(mk('最佳新秀','最佳新秀',false,'已过新秀期','该奖项只在新秀赛季参与',{tier:0,inactive:true}));
  }
  /* 5-8 四个单项王（各自独立） */
  ['rebounding','assists','steals','blocks'].forEach(k=>{
    cards.push(mk(titleName[k],titleName[k],titles[k],titles[k]?'获奖':'未获奖',
      `场均 ${v35Fmt(titleVal[k])} ${titleShort[k]}`,{tier:titles[k]?1:0}));
  });
  /* 9-11 最佳阵容 一阵/二阵/三阵 */
  const nbaLabel=['未入选','最佳阵容一阵','最佳阵容二阵','最佳阵容三阵'];
  cards.push(mk('最佳阵容一阵','最佳阵容一阵',nbaRank===1,nbaLabel[nbaRank===1?1:0],
    `综合评分 ${Math.round(nbaScore)} · OVR ${ovr}`,{tier:nbaRank===1?1:0}));
  cards.push(mk('最佳阵容二阵','最佳阵容二阵',nbaRank===2,nbaRank===2?'入选最佳阵容二阵':'未入选',
    `综合评分 ${Math.round(nbaScore)} · 出勤 ${gp} 场`,{tier:nbaRank===2?1:0}));
  cards.push(mk('最佳阵容三阵','最佳阵容三阵',nbaRank===3,nbaRank===3?'入选最佳阵容三阵':'未入选',
    `综合评分 ${Math.round(nbaScore)} · 球队 ${wins} 胜`,{tier:nbaRank===3?1:0}));
  /* 12-13 最佳防守阵容 一阵/二阵 */
  cards.push(mk('最佳防守一阵','最佳防守阵容一阵',defRank===1,defRank===1?'入选防守一阵':'未入选',
    `防守 ${def} · 抢断+盖帽 ${v35Fmt((s.stl||0)+(s.blk||0))}`,{tier:defRank===1?1:0}));
  cards.push(mk('最佳防守二阵','最佳防守阵容二阵',defRank===2,defRank===2?'入选防守二阵':'未入选',
    `防守 ${def} · 出勤 ${gp} 场`,{tier:defRank===2?1:0}));

  career.seasonAwards=cards;

  /* 荣誉写入：本季首次结算时一次性累加（含新增奖项） */
  if(career.v35HonorSeason!==career.seasonNo){
    career.v35HonorSeason=career.seasonNo;
    const add=(k,n)=>{if(n)career.honors[k]=(career.honors[k]||0)+n};
    /* MVP 由 v220 排名判定写入，此处不重复 */
    add('得分王',titles.scoring?1:0);
    /* DPOY 由既有判定写入，此处不重复 */
    add('最佳新秀',first&&cards[3].won?1:0);
    add('篮板王',titles.rebounding?1:0);
    add('助攻王',titles.assists?1:0);
    add('抢断王',titles.steals?1:0);
    add('盖帽王',titles.blocks?1:0);
    add('最佳阵容',nbaRank?1:0);
    add('最佳防阵',defRank?1:0);
    add('最佳阵容一阵',nbaRank===1?1:0);
    add('最佳阵容二阵',nbaRank===2?1:0);
    add('最佳阵容三阵',nbaRank===3?1:0);
    add('最佳防守一阵',defRank===1?1:0);
    add('最佳防守二阵',defRank===2?1:0);
  }
  save();
};

/* =====================================================================
   PART 2 · 奖项页重做：13 项 + 一屏 + 依次揭晓
   ===================================================================== */
let v35SeqTimer=null;
function v35ClearSeq(){
  if(v35SeqTimer){clearInterval(v35SeqTimer);v35SeqTimer=null}
}
/* 启动逐项揭晓：给每个卡片按顺序加上入场类 */
function v35RevealSeq(){
  v35ClearSeq();
  if(typeof document==='undefined')return;
  const reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nodes=document.querySelectorAll?document.querySelectorAll('.v35-award'):null;
  if(!nodes||!nodes.length)return;
  const list=Array.prototype.slice.call(nodes);
  if(reduce){list.forEach(n=>n.classList.add('v35-in'));return}
  let i=0;
  v35SeqTimer=setInterval(function(){
    if(i>=list.length){clearInterval(v35SeqTimer);v35SeqTimer=null;return}
    list[i].classList.add('v35-in');
    i++;
  },110);
}
window.v35RevealSeq=v35RevealSeq;

awardsView=function(){
  if(typeof v24Init==='function')v24Init();
  const cards=career.seasonAwards||[];
  const won=cards.filter(x=>x.won);
  const label=(typeof seasonLabel==='function')?seasonLabel():'';
  const mvp=cards.find(x=>x.key==='MVP');
  const headline=won.length?`本季 ${won.length} 项荣誉`:'本季无个人荣誉';
  const sub=won.length?won.map(x=>x.title).join(' · '):`MVP：${(mvp&&mvp.status)||'未进入讨论'}`;

  /* 徽记：按奖项类别给不同图形（纯样式化，不用图片） */
  const glyphOf=(k)=>{
    if(k==='MVP')return'★';
    if(k==='最佳防守球员')return'⛨';
    if(k==='最佳新秀')return'✦';
    if(/最佳阵容/.test(k))return'◆';
    if(/最佳防守/.test(k))return'⛨';
    if(k==='得分王')return'⚡';
    if(k==='篮板王')return'⬢';
    if(k==='助攻王')return'➤';
    if(k==='抢断王')return'✦';
    if(k==='盖帽王')return'▲';
    return'·';
  };
  const row=(c)=>`<div class="v35-award ${c.won?'won':''} ${c.inactive?'inactive':''}">
      <div class="v35-glyph">${glyphOf(c.title)}</div>
      <div class="v35-body">
        <b class="v35-name">${esc?esc(c.title):c.title}</b>
        <span class="v35-status">${esc?esc(c.status):c.status}</span>
        <em class="v35-detail">${esc?esc(c.detail):c.detail}</em>
      </div>
      ${c.won?'<div class="v35-seal">已写入</div>':''}
    </div>`;

  return `<section class="v35-stage">
    <div class="v35-head">
      <div><small>NBA SEASON AWARDS · ${label}</small><h2>赛季奖项揭晓</h2></div>
      <div class="v35-headline ${won.length?'':'none'}">
        <b>${headline}</b><span>${sub}</span>
      </div>
    </div>
    <div class="v35-grid">${cards.map(row).join('')}</div>
    <button class="btn primary v35-cta" onclick="enterPostseason()">奖项已揭晓 · 进入季后赛阶段 →</button>
  </section>`;
};

/* 每次进入奖项页启动动效（render 后调用） */
const __v35Render=render;
render=function(){
  __v35Render();
  try{
    if(career&&career.stage==='awards'){
      if(typeof requestAnimationFrame==='function')requestAnimationFrame(v35RevealSeq);
      else v35RevealSeq();
    }else v35ClearSeq();
  }catch(e){}
};

/* =====================================================================
   PART 3 · 样式：金属质感 + 一屏紧凑两列
   ===================================================================== */
const st35=document.createElement('style');
st35.textContent=`
/* 整页：深色荣誉台，压缩高度以容纳 13 项 */
.v35-stage{margin-top:6px;padding:11px 11px 12px;border-radius:22px;position:relative;overflow:hidden;
  background:radial-gradient(circle at 88% 4%,rgba(255,214,122,.16),transparent 42%),linear-gradient(158deg,#1d1712,#2b2119 46%,#3a2a1c 100%);
  border:1px solid rgba(214,170,96,.28);box-shadow:0 16px 38px rgba(40,24,12,.28)}
.v35-head{display:flex;align-items:flex-end;justify-content:space-between;gap:8px;margin-bottom:9px}
.v35-head small{font-size:7px;letter-spacing:.1em;color:#d8b072}
.v35-head h2{font-size:17px;margin:3px 0 0;color:#ffeccb;letter-spacing:.02em}
.v35-headline{text-align:right;max-width:52%}
.v35-headline b{display:block;font-size:10.5px;color:#ffd88f}
.v35-headline span{display:block;font-size:7px;color:#c9ab84;margin-top:2px;line-height:1.4}
.v35-headline.none b{color:#bda98d}

/* 13 项：两列紧凑栅格（一屏可见） */
.v35-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.v35-award{display:grid;grid-template-columns:22px 1fr;gap:6px;align-items:center;padding:6px 7px;border-radius:12px;
  background:linear-gradient(150deg,rgba(255,255,255,.055),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.09);
  opacity:0;transform:translateY(7px);position:relative;overflow:hidden}
/* 逐项揭晓：加上 v35-in 才显示 */
.v35-award.v35-in{animation:v35AwardIn .34s cubic-bezier(.2,1.1,.3,1) forwards}
@keyframes v35AwardIn{from{opacity:0;transform:translateY(7px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
.v35-glyph{width:22px;height:22px;border-radius:8px;display:grid;place-items:center;font-size:11.5px;
  background:linear-gradient(150deg,#5a4630,#33271b);color:#c9a978;box-shadow:inset 0 0 0 1px rgba(255,255,255,.07)}
.v35-body{min-width:0}
.v35-name{display:block;font-size:9px;color:#e8d6ba;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.v35-status{display:block;font-size:8px;color:#9c8b76;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.v35-detail{display:block;font-size:7px;font-style:normal;color:#7e7060;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.v35-seal{position:absolute;right:-18px;top:5px;transform:rotate(38deg);font-size:6px;padding:2px 16px;
  background:linear-gradient(90deg,#e0b25c,#f5d78a);color:#3a2810;font-weight:1000;letter-spacing:.04em}

/* 得奖：金属卡面 + 光泽 */
.v35-award.won{background:linear-gradient(150deg,#7a5620,#c08f36 46%,#f0cf78 96%);border-color:#f2d589;
  box-shadow:0 6px 16px rgba(196,140,44,.26),inset 0 1px 0 rgba(255,255,255,.34)}
.v35-award.won .v35-glyph{background:linear-gradient(150deg,#fff2cc,#e3b95f);color:#5c3b12;box-shadow:none}
.v35-award.won .v35-name{color:#40300f}
.v35-award.won .v35-status{color:#5c451a;font-weight:1000}
.v35-award.won .v35-detail{color:#6d5525}
.v35-award.won::after{content:"";position:absolute;top:-60%;left:-30%;width:38%;height:220%;transform:rotate(20deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent);animation:v35Shine 3.4s ease-in-out infinite}
@keyframes v35Shine{0%{left:-40%}55%{left:118%}100%{left:118%}}
/* 未参与（已过新秀期等）：更弱 */
.v35-award.inactive{opacity:.42}

.v35-cta{width:100%;margin-top:9px!important;background:linear-gradient(135deg,#ffd46d,#e8a52c)!important;color:#4a2c0d!important;height:42px!important}

@media(prefers-reduced-motion:reduce){
  .v35-award{opacity:1;transform:none}
  .v35-award.v35-in,.v35-award.won::after{animation:none}
}
`;
document.head.appendChild(st35);

/* 供自动化验收读取 */
window.__v35Debug={v35Fmt,v35RevealSeq};

if(career){save();render()}

})();

