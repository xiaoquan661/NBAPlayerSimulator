
// 跨版本剧情兼容：后期生涯故事仍需读取当前路线。
var v28Route = function(){
  if(!career) return '未定';
  var flags=career.storyFlags||{};
  var p=career.playerId;
  var r=flags.route||flags.reinvent||'未定';
  var labels={
    bennett:{mobile:'机动四号位',inside:'力量内线',stretch:'空间四号位',reliable:'稳定轮换',scorer:'得分翻案',utility:'万能拼图'},
    oden:{trust:'极致保护',balance:'医学折中',push:'天赋全开',portland:'波特兰王朝线',miami:'迈阿密重生线'},
    kwame:{learn:'慢养成',compete:'正面竞争',fundamentals:'基本功重建',anchor:'防守支柱',four:'机动四号位',simple:'简化进攻'},
    fultz:{medical:'医学真相线',mechanics:'动作重构线',play:'带伤证明线',orlando:'奥兰多重启',philly:'费城坚持'},
    simmons:{shoot:'投射解禁线',big:'前场发动机线',defense:'防守王牌线',repair:'费城修复',leave:'离开费城'}
  };
  var label=(labels[p]&&labels[p][r])||r||'未定';
  var mr=flags.majorRoute;
  if(mr==='cavs') label+=' · 克利夫兰';
  else if(mr==='wolves') label+=' · 明尼苏达';
  else if(mr==='repair') label+=' · 留守费城';
  else if(mr==='leave') label+=' · 离开费城';
  return label;
};
