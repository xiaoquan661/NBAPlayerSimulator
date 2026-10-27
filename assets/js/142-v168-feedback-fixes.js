
(function(){'use strict';
window.v168TrainingReason=function(attr){
 if(!career||career.playerId!=='wiggins')return '';
 const k=career.v135?.skills;
 if(!career.exclusive)return '需先解锁专属天赋';
 if(career.stage!=='offseason')return '仅休赛期可培养，已解锁专精持续生效';
 if((Number(career.attrs?.[attr])||0)>=99)return '该项能力已达99上限，请选择其他方向';
 if((k?.trainingSpent?.[attr]||0)>=3)return '该方向本年3点已用完，下个休赛期恢复';
 if(!(k?.trainingLeft>0))return '本年6点专项额度已用完，下个休赛期恢复';
 return '';
};
const skillAction=window.v135SkillAction;
window.v135SkillAction=function(kind,attr){if(kind==='train'&&career?.playerId==='wiggins'){const reason=v168TrainingReason(attr);if(reason){notify(reason);return false;}}return skillAction.apply(this,arguments);};
// A restored or interrupted result always has a durable escape route.
const allStar=allStarView;
allStarView=function(){return allStar.apply(this,arguments).replace('后半程即将自动开始','后半程即将开始；也可以点击下方按钮继续')+'<button class="btn primary" style="width:100%;margin-top:12px" onclick="v168ContinueAllStar()">继续后半程常规赛 →</button>';};
window.v168ContinueAllStar=function(){if(!career||career.stage!=='allstar'||ui.modal||ui.storyEvent||ui.v130Popup)return false;resumeAllStar();return career.stage==='regular';};
})();
