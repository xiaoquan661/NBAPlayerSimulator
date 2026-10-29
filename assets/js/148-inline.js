
/* ============================================================
 * 新游戏《我的名字》· 捏人系统 v1 (M1)
 * 策划文档 03 实现：四步捏人（出身/球风/自白）+ 成长模板映射
 * 挂载方式：完全外挂式——不动原版函数，只重定向入口
 * ============================================================ */
(function () {
  'use strict';

  /* ---------- 设计数据（策划文档 03/06） ---------- */

  // 出身：8 选 1（映射成长模板池 + 开局资源）
  const ORIGINS = [
    { id: 'ncaa',      n: 'NCAA 大学派',   diff: '简单', diffCls: 'std', age: 19, d: '高中留美，在大学的球馆里打出名堂。球探报告写着你的名字，模板一栏是某个前辈。美国大学履历让你自动获得参选资格。', note: '美国大学履历，自动获得参选资格。天赋池稳健，媒体压力较小。', pool: ['S2', 'A3', 'B3'], health: 84, confidence: 62, trust: 60, fame: 20 },
    { id: 'cba',       n: 'CBA 联赛打出来', diff: '普通', diffCls: 'chal', age: 22, d: '在国内联赛杀疯了，得分王或最佳新人。你决定去撞一撞那扇更高的门。22 岁，CBA 的履历让你有资格申报参选。', note: '职业履历，22 岁申报参选。即战力强，但年龄偏大、顺位偏低。', pool: ['A2', 'B1', 'C2'], health: 86, confidence: 66, trust: 68, fame: 40 },
    { id: 'academy',   n: '体校青训嫡系', diff: '困难', diffCls: 'hard', age: 19, d: '从小进体系，被当作宝贝养大。天赋肉眼可见，代价是聚光灯从来早于你成熟。U19 世界杯的表现让球探找到了你——但放不放人，不由你决定。', note: '国青 / U19 被球探发现，经推荐申报。天赋上限最高，但放不放人不由你决定。', pool: ['S1', 'A1', 'A2'], health: 78, confidence: 55, trust: 55, fame: 30 },
    { id: 'undrafted', n: '落选赌命者',     diff: '地狱', diffCls: 'hell', age: 19, d: '你报名参选，却没有球队承诺会念你的名字。10 天短合同，是你唯一的入场券。', note: '报名参选但无人承诺。只能从 10 天短合同和 3 场试用开始。', pool: ['C3', 'D'], health: 88, confidence: 45, trust: 40, fame: 5 },
    { id: 'prep',      n: '全美预科天才',   diff: '普通', diffCls: 'chal', age: 19, d: '高中毕业后再读一年预科，全美排名把你推到了球探名单最上面。天赋是这一届最亮的，身体和比赛阅读还没长齐。', note: '全美顶级天赋，参选资格来自预科履历。上限最高，即战力最生涩。', pool: ['S1', 'A1', 'B2'], health: 82, confidence: 60, trust: 45, fame: 25 },
    { id: 'euro',      n: '欧洲联赛成品',   diff: '普通', diffCls: 'chal', age: 23, d: '你在欧洲顶级联赛打了两年，防过成名后卫，也在客场嘘声里投过关键球。NBA 球队知道你能用，只是不确定你还能长多少。', note: '成年职业比赛打磨，即战力高。基本功扎实，运动天赋上限一般，买断费是障碍。', pool: ['A2', 'B1', 'C1'], health: 87, confidence: 70, trust: 72, fame: 35 },
    { id: 'nbl',       n: 'NBL 明日之星',   diff: '普通', diffCls: 'chal', age: 20, d: '你以南半球联赛的“明日之星”身份打了一年。对抗不吃亏，防守愿意干脏活，但美国媒体很少在黄金时段提到你。', note: '职业联赛一年，身体对抗和防守习惯好。曝光少，顺位多在中段。', pool: ['A3', 'B3', 'B2'], health: 86, confidence: 62, trust: 58, fame: 15 },
    { id: 'gleague',   n: '发展联盟熬出来', diff: '困难', diffCls: 'hard', age: 20, d: '你在发展联盟和一群等电话的人抢饭吃。数据不算漂亮，但每个球探都知道：你从不躲对抗。', note: '成年比赛强度，韧性和防守起家。数据不稳定，选秀行情最波动。', pool: ['B2', 'C1', 'D'], health: 84, confidence: 55, trust: 48, fame: 10 }
  ];

  // 难度：与出身解耦。出身决定故事、资格、基础顺位；难度修正起步资源、顺位偏移、伤病与成长。
  const DIFFICULTIES = [
    { id: 'easy',   n: '简单', cls: 'std',  title: '规则站在你这边', d: '起步资源更好，顺位更靠前，伤病更少。', note: '健康+6 · 自信+8 · 信任+8 · 顺位↑ · 伤病×0.85 · 成长×1.05', health: 6, confidence: 8, trust: 8, draftShift: -2, injury: 0.85, growth: 1.05 },
    { id: 'normal', n: '普通', cls: 'chal', title: '按 NBA 的标准来', d: '没有额外照顾，也没有额外针对。', note: '全部标准 · 无额外加成', health: 0, confidence: 0, trust: 0, draftShift: 0, injury: 1, growth: 1 },
    { id: 'hard',   n: '困难', cls: 'hard', title: '每一步都要自己挣', d: '起步信任更低，顺位更靠后，伤病更频繁。', note: '健康-5 · 自信-6 · 信任-8 · 顺位↓ · 伤病×1.18 · 成长×0.96', health: -5, confidence: -6, trust: -8, draftShift: 6, injury: 1.18, growth: 0.96 },
    { id: 'hell',   n: '地狱', cls: 'hell', title: '从最不被看好的地方开始', d: '资源、顺位、舆论全部逆风。', note: '健康-10 · 自信-12 · 信任-14 · 顺位↓↓ · 伤病×1.35 · 成长×0.92', health: -10, confidence: -12, trust: -14, draftShift: 12, injury: 1.35, growth: 0.92 }
  ];

  /* 难度逐级解锁：完成上一难度的一段生涯后才开放下一档。 */
  const DIFF_ORDER = DIFFICULTIES.map(x => x.id);
  const DIFF_UNLOCK_KEY = 'nba_difficulty_unlock_v1';
  let diffUnlockCache = null;

  function readDiffUnlock() {
    if (diffUnlockCache) return diffUnlockCache;
    const out = { easy: true };
    try {
      const raw = localStorage.getItem(DIFF_UNLOCK_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          DIFF_ORDER.forEach(id => { if (saved[id]) out[id] = true; });
        }
      }
    } catch (e) {}
    /* 老存档兼容：已经玩过更高难度的玩家不被降级锁回去。 */
    try {
      const c = (typeof load === 'function') ? load() : null;
      const d = c && c.__arch && c.__arch.difficulty;
      const idx = DIFF_ORDER.indexOf(d);
      if (idx >= 0) for (let i = 0; i <= idx; i++) out[DIFF_ORDER[i]] = true;
    } catch (e) {}
    diffUnlockCache = out;
    return out;
  }

  function isDiffUnlocked(id) {
    if (!id) return true;
    return !!readDiffUnlock()[id];
  }

  function unlockDifficulty(completedId) {
    const idx = DIFF_ORDER.indexOf(completedId);
    if (idx < 0) return false;
    const out = readDiffUnlock();
    let changed = false;
    /* 完成当前难度，同时开放下一难度。 */
    const last = Math.min(DIFF_ORDER.length - 1, idx + 1);
    for (let i = 0; i <= last; i++) {
      if (!out[DIFF_ORDER[i]]) { out[DIFF_ORDER[i]] = true; changed = true; }
    }
    if (changed) {
      try { localStorage.setItem(DIFF_UNLOCK_KEY, JSON.stringify(out)); } catch (e) {}
    }
    diffUnlockCache = out;
    return changed;
  }

  // 位置球风：10 选 1（八维初始分布，总值恒定 600±10）
  // 顺序：finishing, shooting, playmaking, defense, rebounding, athleticism, durability, mentality
  const STYLES = [
    { id: 'floor-general', n: '传统控卫',   d: '节奏大师。先看人，再看筐。', gain: '组织 82 · 心态 88', weak: '运动 62 · 篮板 55', a: [62, 66, 82, 68, 55, 62, 72, 88] },
    { id: 'combo-guard',   n: '攻击型双能卫', d: '美式后卫。第一步过你，第二步上篮。', gain: '终结 82 · 运动 84', weak: '防守 58 · 篮板 55', a: [82, 70, 72, 58, 55, 84, 66, 68] },
    { id: 'catch-shoot',   n: '无球射手',   d: '移动炮台。绕过三道掩护，出手只要半秒。', gain: '投射 88', weak: '组织 58 · 篮板 52', a: [72, 88, 58, 62, 52, 74, 68, 72] },
    { id: 'three-d',       n: '3D 侧翼',   d: '冠军拼图。锁死对位人，底角等球。', gain: '投射 80 · 防守 84', weak: '组织 56 · 篮板 60', a: [66, 80, 56, 84, 60, 76, 72, 72] },
    { id: 'point-forward', n: '全能前锋',   d: '万金油。什么都会一点，什么都不拔尖——现在是。', gain: '六项均衡（无短板）', weak: '无尖刀项（最高仅 74）', a: [70, 68, 74, 70, 68, 70, 70, 70] },
    { id: 'stretch-four',  n: '空间型四号位', d: '现代内线。把对面的大个子拽出禁区。', gain: '投射 78 · 篮板 78', weak: '组织 60 · 运动 66', a: [68, 78, 60, 72, 78, 66, 70, 68] },
    { id: 'paint-anchor',  n: '传统中锋',   d: '禁区守门员。最后一道墙，最后一传。', gain: '篮板 86 · 防守 84 · 耐久 80', weak: '投射 48（明显短板）', a: [74, 48, 58, 84, 86, 68, 80, 72] },
    { id: 'mismatch-wing', n: '错位锋线',   d: '小球克星。换防谁都错位。', gain: '终结 80 · 运动 86', weak: '投射 60 · 耐久 66', a: [80, 60, 64, 76, 70, 86, 66, 70] },
    { id: 'lockdown',      n: '防守大闸',   d: '锁匠。把对方的头号得分手防到怀疑人生。', gain: '防守 90 · 耐久 84 · 心态 80', weak: '投射 58 · 组织 60', a: [62, 58, 60, 90, 66, 76, 84, 80] },
    { id: 'microwave',     n: '第六人火种', d: '微波炉得分手。替补席起身，两分钟改变比赛。', gain: '终结 84 · 心态 78', weak: '耐久 66 · 篮板 54', a: [84, 72, 62, 56, 54, 76, 58, 78] }
  ];

  // 自白：6 选 1（自带被动 + 对应事件线）
  const VOWS = [
    { id: 'pure',    t: '我只为篮球而来',     d: '纯粹路线。别的声音进不来。', fx: '被动：负面舆论与自信损失减半。事件线：低谷、专注、取舍' },
    { id: 'family',  t: '让家里过上好日子',   d: '家庭的重量，也是燃料。', fx: '被动：合同报价 +5%，伤病风险略降。事件线：家庭、汇款、探亲' },
    { id: 'prove',   t: '证明被低估的人也能飞', d: '你背负的不只是自己的期待。', fx: '被动：名气 +20%，得分略升；伤病风险略升。事件线：外媒、大场面' },
    { id: 'one-min', t: '打上 NBA，哪怕一分钟', d: '边缘人的执念，比天赋更硬。', fx: '被动：伤病风险 ×0.9，替补角色得分略升。事件线：轮换、机会' },
    { id: 'name',    t: '总有一天他们会念我的名字', d: '选秀夜的遗憾，你要亲手讨回来。', fx: '被动：名气 +10%，得分 +2%。事件线：复仇、正名' },
    { id: 'easy',    t: '就试试，不行就回去读书', d: '洒脱路线。心态崩了？不存在的。', fx: '被动：负面心态效果减半，伤病风险 ×0.95。事件线：松弛、闲适' }
  ];

  /* 成长模板：球探报告里展示的名字与曲线。
     cap 仅保留旧存档兼容；所有出身实际硬上限统一 110。
     front/slope 决定早熟或晚熟，healthRisk 影响伤病。 */
  const ARCHETYPES = {
    S1: { n: '世代门面',  cap: 99, slope: 2.4, front: 1.35, healthRisk: 1.6, d: '从第一年就被当作核心培养，成长窗口来得早，能摸到这一届最高的天花板。' },
    S2: { n: '常青巨木',  cap: 97, slope: 1.9, front: 1.0,  healthRisk: 0.8, d: '成长不急，曲线很长；别人下滑的年纪，他还在往上走。' },
    A1: { n: '燃烧的天才', cap: 95, slope: 2.2, front: 1.3,  healthRisk: 1.4, d: '前几年涨得最快，身体消耗也最大；巅峰来得早，要和时间抢。' },
    A2: { n: '风暴中心',  cap: 94, slope: 1.8, front: 1.1,  healthRisk: 1.1, d: '上升期稳定，越接近核心角色，成长越顺。' },
    A3: { n: '大器晚成',  cap: 93, slope: 1.5, front: 0.75, healthRisk: 0.8, d: '前期成长偏慢，25 岁以后还有第二次上升。' },
    B1: { n: '高光常客',  cap: 91, slope: 1.7, front: 1.0,  healthRisk: 1.0, d: '起起伏伏，但总能在一段高光里把自己拉回轮换。' },
    B2: { n: '流星',      cap: 90, slope: 2.0, front: 1.25, healthRisk: 1.3, d: '爆发来得猛，退得也快；前几个赛季决定他能留下什么。' },
    B3: { n: '稳步兑现',  cap: 88, slope: 1.5, front: 1.0,  healthRisk: 0.8, d: '没有跳跃式爆发，每年补一块短板，慢慢把位置站稳。' },
    C1: { n: '优质拼图',  cap: 86, slope: 1.4, front: 1.0,  healthRisk: 0.8, d: '不是主角的曲线，靠防守和细节一点点留在场上。' },
    C2: { n: '逆袭剧本',  cap: 84, slope: 1.3, front: 0.7,  healthRisk: 0.9, d: '起步低，成长慢，但越被低估越不肯停。' },
    C3: { n: '蓝领一生',  cap: 82, slope: 1.1, front: 1.0,  healthRisk: 1.0, d: '起点不高，胜在耐用和稳定，能把角色球员打到很久。' },
    D:  { n: '搏命者',    cap: 80, slope: 2.8, front: 1.4,  healthRisk: 0.7, d: '天赋最薄，靠强度和运气抢时间；每一分都要自己挣。' }
  };
  try { window.__ARCHETYPES__ = ARCHETYPES; } catch (e) {}

  /* 路线分组：同一成长曲线下，不同位置/球风对应不同真实球星模板。
     这样"大器晚成 + 传统控卫"不会显示成库里的名字。 */
  const STAR_ROUTE_GROUP = {
    'floor-general': 'guard',
    'combo-guard': 'guard',
    'catch-shoot': 'wing',
    'three-d': 'wing',
    'point-forward': 'wing',
    'stretch-four': 'big',
    'paint-anchor': 'big',
    'mismatch-wing': 'wing',
    'lockdown': 'wing',
    'microwave': 'bench'
  };
  const STAR_TEMPLATES = {
    S1: { guard: '安芬尼·哈达威', wing: '凯文·杜兰特', big: '锡安·威廉森', bench: '詹姆斯·哈登' },
    S2: { guard: '克里斯·保罗', wing: '勒布朗·詹姆斯', big: '蒂姆·邓肯', bench: '马努·吉诺比利' },
    A1: { guard: '德里克·罗斯', wing: '特雷西·麦克格雷迪', big: '布雷克·格里芬', bench: '吉尔伯特·阿里纳斯' },
    A2: { guard: '杰森·基德', wing: '保罗·乔治', big: '凯文·加内特', bench: '杰森·特里' },
    A3: { guard: '史蒂夫·纳什', wing: '斯蒂芬·库里', big: '德克·诺维茨基', bench: '凯尔·科沃尔' },
    B1: { guard: '凯里·欧文', wing: '卡梅隆·安东尼', big: '克里斯·波什', bench: '贾马尔·克劳福德' },
    B2: { guard: '以赛亚·托马斯', wing: '布兰登·罗伊', big: '阿玛雷·斯塔德迈尔', bench: '蒙塔·埃利斯' },
    B3: { guard: '凯尔·洛瑞', wing: '朱·霍勒迪', big: '艾尔·霍福德', bench: '马库斯·斯玛特' },
    C1: { guard: '德里克·费舍尔', wing: '安德烈·伊戈达拉', big: '丹尼斯·罗德曼', bench: '路易斯·威廉姆斯' },
    C2: { guard: '昌西·比卢普斯', wing: '吉米·巴特勒', big: '德雷蒙德·格林', bench: '林书豪' },
    C3: { guard: '帕特里克·贝弗利', wing: '布鲁斯·鲍文', big: '本·华莱士', bench: '乌杜尼斯·哈斯勒姆' },
    D:  { guard: '弗雷德·范弗利特', wing: '亚历克斯·卡鲁索', big: '哈桑·怀特塞德', bench: '帕蒂·米尔斯' }
  };
  try {
    window.__STAR_ROUTE_GROUP__ = STAR_ROUTE_GROUP;
    window.__STAR_TEMPLATES__ = STAR_TEMPLATES;
  } catch (e) {}

  // 年代：2001–2025 使用原作真实年代名单；2026+ 使用英文虚拟名
  const ERAS = [
    { year: 2001, range: '2001–2003', n: '旧王时代', d: '乔丹、科比、邓肯、奥尼尔仍在巅峰。你从 2001 年的选秀夜进入联盟。', note: '真实数据：2001 年代真实球队名单与 2001 选秀。' },
    { year: 2007, range: '2004–2009', n: '群雄并起', d: '科比、詹姆斯、韦德、诺维茨基——一个没有绝对霸主的年代。', note: '真实数据：2007 年代真实球队名单。' },
    { year: 2013, range: '2010–2014', n: '热火与马刺', d: '詹姆斯的热火、GDP 的马刺，库里刚刚崛起。', note: '真实数据：2013 年代真实球队名单。' },
    { year: 2016, range: '2015–2016', n: '勇士王朝', d: '73 胜勇士、骑士 1-3 逆转、杜兰特加盟。', note: '真实数据：2016 年代真实球队名单。' },
    { year: 2017, range: '2017–2025', n: '三分时代', d: '库里、字母哥、约基奇、东契奇——联盟进入新的秩序。', note: '真实数据：2017 年代真实球队名单与 2017–2025 真实选秀。' },
    { year: 2026, range: '2026+', n: '未来联盟', d: '没有真实名单的未来。所有球员由英文虚拟名生成器创建。', note: '虚拟数据：英文名生成器；适合完全架空的生涯。' }
  ];

  /* ---------- 捏人状态 ---------- */

  const CG = { step: 0, year: null, origin: null, difficulty: null, style: null, vow: null, originRoll: null, originRerolls: 2, englishName: null, playerNameZh: null, nameKind: '', talentReady: false };
  window.__CREATOR__ = CG;

  function ensureOriginRollState() {
    if (!CG.originRoll && CG.origin) CG.originRoll = CG.origin;
    if (!CG.originRoll) CG.originRoll = ORIGINS[Math.floor(Math.random() * ORIGINS.length)].id;
    if (typeof CG.originRerolls !== 'number') CG.originRerolls = 2;
  }

  function pickYear(year) {
    CG.year = Number(year) || null;
    window.render && render();
  }

  function rerollOrigin() {
    ensureOriginRollState();
    if (CG.originRerolls <= 0) { try { notify('没有剩余的重抽次数，可以看广告刷新'); } catch (e) {} return; }
    CG.originRerolls--;
    let cur = CG.originRoll, next = cur, n = 0;
    while (next === cur && n++ < 20) next = ORIGINS[Math.floor(Math.random() * ORIGINS.length)].id;
    CG.originRoll = next;
    window.render && render();
  }

  /* 免费两次用完后，看广告把重抽次数刷新回 2 次。 */
  async function adRefreshOrigin() {
    ensureOriginRollState();
    if (CG.originRerolls > 0) { try { notify('还有重抽次数，直接换就行'); } catch (e) {} return; }
    if (typeof rewardAd === 'undefined' || !rewardAd || typeof rewardAd.request !== 'function') {
      try { notify('广告组件未就绪'); } catch (e) {}
      return;
    }
    try {
      /* 复用已有广告点位，避免宿主侧出现未配置的新 reason。 */
      const r = await rewardAd.request('refresh_talents');
      const ok = (r === true) || (r && r.success === true);
      if (!ok) { try { notify('广告未完成，未刷新'); } catch (e) {} return; }
      CG.originRerolls = 2;
      window.render && render();
      try { notify('出身重抽次数已刷新 · 剩 2 次'); } catch (e) {}
    } catch (e) {
      const msg = String((e && e.message) || e || '');
      if (msg.indexOf('AD_NOT_REWARDED') >= 0) {
        try { notify('广告未完成，未刷新'); } catch (e2) {}
        return;
      }
      console.error('[148] origin ad refresh failed', e);
      try { notify('刷新失败，请稍后再试'); } catch (e2) {}
    }
  }

  function resetBuildState(keepSelection) {
    if (!keepSelection) {
      CG.style = null;
      CG.vow = null;
    }
    CG.difficulty = null;
    CG.player = null;
    CG.playerJson = null;
    CG.archetype = null;
    CG.potentialCaps = null;
    CG.potentialOvr = null;
    CG.pendingArch = null;
    CG.talentReady = false;
    try {
      ui.talentPick = null;
      ui.allTalents = false;
      ui.talents = [];
      ui.talentDrawCount = 1;
      ui.talentAdRefreshes = 0;
      ui.talentFreeUsed = 0;
      ui.lockedTalents = null;
      window.v71AllLocked = false;
    } catch (e) {}
  }

  function confirmOrigin() {
    ensureOriginRollState();
    if (!CG.year) { try { notify('先选一个起始年代'); } catch (e) {} return; }
    CG.origin = CG.originRoll;
    resetBuildState();
    try { ui.selected = 'custom'; } catch (e) {}
    CG.step = 1;
    window.render && render();
  }

  /* 兼容旧入口；新流程由 confirmOrigin 确认随机出身。 */
  function pickOrigin(id) {
    CG.originRoll = id;
    CG.origin = id;
    resetBuildState();
    CG.step = 1;
    window.render && render();
  }

  function ensureCombinedTalents(force) {
    if (!CG.player) return;
    if (force || !CG.talentReady || !Array.isArray(ui.talents) || !ui.talents.length) {
      try {
        ui.talentDrawCount = 1;
        ui.talentAdRefreshes = 0;
        ui.talentFreeUsed = 0;
        ui.lockedTalents = null;
        window.v71AllLocked = false;
        ui.allTalents = false;
        ui.talentPick = null;
        ui.exclusive = false;
        if (typeof v210RollTalents === 'function') v210RollTalents();
      } catch (e) {}
      CG.talentReady = true;
    }
  }

  function buildForCombined(forceTalents) {
    if (!CG.style) return;
    ensureEnglishName();
    if (!CG.player) {
      try { buildPlayer(); } catch (e) { console.error('[148] buildPlayer failed', e); }
    }
    ensureCombinedTalents(!!forceTalents || !CG.talentReady);
  }

  function scrollToBuild(id) {
    try {
      setTimeout(function () {
        var el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    } catch (e) {}
  }

  function pickStyle(id) {
    const changed = !!(CG.style && CG.style !== id);
    if (changed) resetBuildState(true);
    CG.style = id;
    buildForCombined(changed);
    window.render && render();
    scrollToBuild('v182-sec-vow');
  }

  function pickVow(id) {
    CG.vow = id;
    if (CG.player) {
      const v = VOWS.find(x => x.id === id) || VOWS[0];
      CG.player.tagline = v.t;
      CG.player.desc = v.d;
      CG.vowText = v.t;
      CG.playerJson = JSON.stringify(CG.player);
      if (CG.pendingArch) CG.pendingArch.vow = id;
      try {
        if (typeof P !== 'undefined' && Array.isArray(P)) {
          const idx = P.findIndex(x => x && x.id === 'custom');
          if (idx >= 0) P[idx] = CG.player;
        }
      } catch (e) {}
    } else if (CG.style) {
      buildForCombined(false);
    }
    window.render && render();
  }

  function pickDifficulty(id) {
    if (id && !isDiffUnlocked(id)) {
      try { notify('完成上一难度的一段生涯后解锁'); } catch (e) {}
      return;
    }
    applyDifficulty(id);
    window.render && render();
  }

  function toDifficulty() {
    if (!CG.style) { try { notify('先选择一个位置'); } catch (e) {} return; }
    if (!CG.vow) { try { notify('先选一句自白'); } catch (e) {} return; }
    if (!ui.allTalents && ui.talentPick == null) { try { notify('先选择一个天赋'); } catch (e) {} return; }
    CG.step = 2;
    window.render && render();
  }

  function toConfirm() {
    if (!CG.difficulty) { try { notify('先选择难度'); } catch (e) {} return; }
    CG.step = 3;
    window.render && render();
  }

  /* 难度是独立模块：只调整起步状态，不重新随机潜力。 */
  function applyDifficulty(id) {
    if (!CG.player) { CG.difficulty = id || null; return; }
    const next = DIFFICULTIES.find(x => x.id === id) || DIFFICULTIES[1];
    const prev = DIFFICULTIES.find(x => x.id === CG.difficulty) || DIFFICULTIES[1];
    const p = CG.player;
    const clamp = v => Math.max(0, Math.min(100, Math.round(v)));
    p.health = clamp((Number(p.health) || 0) - (prev.health || 0) + (next.health || 0));
    p.confidence = clamp((Number(p.confidence) || 0) - (prev.confidence || 0) + (next.confidence || 0));
    p.trust = clamp((Number(p.trust) || 0) - (prev.trust || 0) + (next.trust || 0));
    if (CG.pendingArch) {
      CG.pendingArch.difficulty = next.id;
      CG.pendingArch.difficultyName = next.n;
      CG.pendingArch.draftShift = next.draftShift;
      CG.pendingArch.difficultyInjury = next.injury;
      CG.pendingArch.difficultyGrowth = next.growth;
    }
    CG.difficulty = id || null;
    CG.playerJson = JSON.stringify(p);
    try {
      if (typeof P !== 'undefined' && Array.isArray(P)) {
        const idx = P.findIndex(x => x && x.id === 'custom');
        if (idx >= 0) P[idx] = p;
      }
    } catch (e) {}
  }

  function startCareer() {
    if (!ui.allTalents && ui.talentPick == null) {
      try { notify('先选择一个天赋'); } catch (e) {}
      return;
    }
    if (!CG.difficulty) {
      CG.step = 2;
      window.render && render();
      return;
    }
    /* 必须走当前全局 enterDraft，才能带上 175 的自动播放包装；
       直接调 __ORIG_ENTER_DRAFT__ 会绕过 175，选秀页就停在第一句。 */
    const fn = window.enterDraft || window.__ORIG_ENTER_DRAFT__;
    if (typeof fn === 'function') fn();
  }

  /* ---------- 成长模板抽取（球探报告显示名称与描述） ---------- */

  function rollArchetype(originId, styleId) {
    const o = ORIGINS.find(x => x.id === originId);
    const pick = o.pool[Math.floor(Math.random() * o.pool.length)];
    const arch = Object.assign({}, ARCHETYPES[pick]);
    // 球风修正：斜率 ±15%
    const styleMod = { 'catch-shoot': { shooting: 1.15 }, 'lockdown': { defense: 1.15 }, 'paint-anchor': { rebounding: 1.12 }, 'combo-guard': { finishing: 1.12 }, 'three-d': { shooting: 1.1, defense: 1.08 }, 'floor-general': { playmaking: 1.15 }, 'stretch-four': { shooting: 1.12 }, 'mismatch-wing': { athleticism: 1.12 }, 'point-forward': {}, 'microwave': { finishing: 1.1 } }[styleId] || {};
    arch.slopeMods = styleMod;
    arch.key = pick;
    /* 真实球星模板 = 随机曲线 + 已选路线；不是再随机一次球星。 */
    arch.route = STAR_ROUTE_GROUP[styleId] || 'wing';
    const stars = STAR_TEMPLATES[pick] || {};
    arch.star = stars[arch.route] || stars.wing || '';
    return arch;
  }

  /* ---------- 生成虚拟 P 对象（喂给原版 createCareer） ---------- */
  /* 原版 createCareer 吃 currentP()（原12人结构）。我们构造一个同构对象，
     playerId 用 'custom'，让原版按通用分支走（避开球星专属逻辑）。 */

  const POT_KEYS = ['finishing', 'shooting', 'playmaking', 'defense', 'steals', 'blocks', 'strength', 'rebounding', 'athleticism', 'durability', 'mentality'];
  const START_RANGES = { ncaa: [70, 73], cba: [72, 75], academy: [68, 71], undrafted: [66, 69], prep: [69, 72], euro: [73, 76], nbl: [70, 73], gleague: [67, 70] };
  const POT_RANGES = { ncaa: [82, 92], cba: [79, 89], academy: [78, 96], undrafted: [76, 94], prep: [84, 96], euro: [79, 88], nbl: [81, 92], gleague: [80, 94] };

  function rollInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); }

  function makePotential(origin, attrs, ovr, arch) {
    const range = POT_RANGES[origin] || [80, 90];
    /* 不再用成长模板截断潜力：所有出身的硬上限都是 110。
       出身只决定初始潜力区间，模板只影响成长曲线和早期/晚期速度。 */
    const target = Math.max(ovr, rollInt(range[0], range[1]));
    const avg = POT_KEYS.reduce((sum, k) => sum + (Number(attrs[k]) || 0), 0) / POT_KEYS.length;
    const caps = {};
    POT_KEYS.forEach(k => {
      // 出身给总潜力预算，球风决定这些潜力更偏向哪些能力。
      const styleBias = (Number(attrs[k]) - avg) * 0.15;
      const room = Math.max(0, target - ovr + styleBias + rollInt(-2, 2));
      caps[k] = Math.max(attrs[k], Math.min(110, Math.round(attrs[k] + room)));
    });
    let potentialOvr = target;
    try { potentialOvr = window.calcOvr ? Math.round(window.calcOvr(caps)) : target; } catch (e) {}
    return { target, caps, potentialOvr };
  }

  function buildPlayer() {
    const o = ORIGINS.find(x => x.id === CG.origin);
    const s = STYLES.find(x => x.id === CG.style);
    const v = VOWS.find(x => x.id === CG.vow) || VOWS[0];
    const df = DIFFICULTIES.find(x => x.id === CG.difficulty) || DIFFICULTIES[1];
    const arch = rollArchetype(CG.origin, CG.style);
    const clampStat = (v) => Math.max(1, Math.min(99, Math.round(v)));
    const attrs = {
      finishing: s.a[0], shooting: s.a[1], playmaking: s.a[2], defense: s.a[3],
      steals: clampStat(s.a[3] * 0.50 + s.a[5] * 0.30 + s.a[2] * 0.20),
      blocks: clampStat(s.a[3] * 0.45 + s.a[4] * 0.35 + s.a[5] * 0.20),
      strength: clampStat(s.a[0] * 0.40 + s.a[4] * 0.40 + s.a[5] * 0.20),
      rebounding: s.a[4], athleticism: s.a[5], durability: s.a[6], mentality: s.a[7]
    };
    let ovr = 74;
    try { ovr = window.calcOvr ? window.calcOvr(attrs) : Math.round(s.a.reduce((x, y) => x + y, 0) / 8); } catch (e) { ovr = 74; }

    // 出身决定起点区间；球风决定分布，难度不改变这里的起点和潜力。
    const startRange = START_RANGES[CG.origin] || [68, 74];
    const targetStart = rollInt(startRange[0], startRange[1]);
    const delta = targetStart - ovr;
    if (delta) {
      POT_KEYS.forEach(k => { attrs[k] = clampStat(attrs[k] + delta); });
      try { ovr = window.calcOvr ? window.calcOvr(attrs) : targetStart; } catch (e) { ovr = targetStart; }
    }
    const potential = makePotential(CG.origin, attrs, ovr, arch);

    const player = {
      id: 'custom',
      zh: CG.playerNameZh || CG.englishName || '无名新秀',
      en: CG.englishName || (v.id === 'name' ? 'The Unnamed' : 'Rookie'),
      year: CG.year || 2026, age: o.age || (o.id === 'cba' ? 22 : 19),
      team: 'NOP', pos: s.id.includes('guard') ? 'PG' : s.id.includes('four') || s.id.includes('anchor') ? 'PF' : 'SF',
      ovr: Math.max(50, Math.min(99, Math.round(ovr))),
      title: s.n, tagline: v.t,
      attrs,
      potentialCaps: potential.caps,
      potentialOvr: potential.potentialOvr,
      potentialHard: 110,
      health: clampStat(o.health + df.health), confidence: clampStat(o.confidence + df.confidence), trust: clampStat(o.trust + df.trust),
      special: Math.round(40 + (ovr - 70) * 1.5),
      tags: [o.n.replace(/ .*/, ''), s.n, '自创球员'],
      desc: v.d,
      exclusive: { n: '无人知晓的名字', d: '没有人认识你。你的每一分成长，都是从零挣来的。', fx: 'custom_x' },
      reality: '这是一段没有人写过的人生。'
    };
    CG.archetype = arch;
    CG.player = player;
    CG.potentialCaps = potential.caps;
    CG.potentialOvr = potential.potentialOvr;
    CG.vowText = v.t; // 选秀模块读取自白文案用
    // 渲染钩子用：career 创建后由钩子写入存档（引擎 createCareer 不可外部覆盖）
    CG.pendingArch = { key: arch.key, n: arch.n, d: arch.d || '', star: arch.star || '', route: arch.route || '', cap: arch.cap, slope: arch.slope, front: arch.front, healthRisk: arch.healthRisk, mods: arch.slopeMods || {}, origin: CG.origin, style: CG.style, vow: CG.vow, fame: o.fame, difficulty: df.id, difficultyName: df.n, draftShift: df.draftShift, difficultyInjury: df.injury, difficultyGrowth: df.growth, potentialCaps: potential.caps, potentialOvr: potential.potentialOvr };
    // 注册进引擎 P 表 + EX/defaults 表（引擎块词法变量，跨块不可见 → 动态 script 注入）
    try {
      CG.playerJson = JSON.stringify(player);
      const probe = document.createElement('script');
      probe.textContent = [
        'try{',
        'if(typeof P!=="undefined"&&Array.isArray(P)&&!P.some(function(x){return x.id==="custom"})){P.push(JSON.parse(window.__CREATOR__.playerJson))}',
        // EX：专属天赋表加 custom（v221/v46 等补丁读 EX[playerId].boost，无守卫会崩）
        'if(typeof EX!=="undefined"&&EX&&!EX.custom){EX.custom={name:"无人知晓的名字",boost:{mentality:4,durability:2},confidence:5,mechanism:"没有人认识你——每一分成长都从零挣来。心态与自信更坚韧，不易被舆论击倒。"}}',
        // defaults：属性缺省表加 custom（引擎某补丁按 playerId 查 defaults 补属性）
        'if(typeof defaults!=="undefined"&&defaults&&!defaults.custom){defaults.custom={finishing:50,shooting:50,playmaking:50,defense:50,rebounding:50,athleticism:50,durability:50,mentality:50}}',
        '}catch(e){}'
      ].join('');
      document.head.appendChild(probe);
    } catch (e) {}
    return player;
  }

  /* ---------- UI 渲染（白板×档案风·M1.5 专属样式） ---------- */

  const CREATOR_CSS = `
<style id="creator-css">
.creator-wrap{min-height:100vh;background:#12151a;color:#e8ecf1;padding:18px 16px 110px;max-width:750px;margin:0 auto}
.creator-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
.creator-top strong{font-size:15px;letter-spacing:1px;color:#ffffff}
.creator-back{width:36px;height:36px;border-radius:50%;border:1px solid #2f3742;background:#1c2129;color:#ffffff;font-size:16px;cursor:pointer}
.creator-hero{margin-bottom:16px}
.creator-hero small{color:#4d8dff;font-size:11px;letter-spacing:3px;font-weight:700}
.creator-hero h2{margin:6px 0 4px;font-size:24px;color:#ffffff}
.creator-hero p{margin:0;color:#9aa3b2;font-size:13px;line-height:1.7}
.creator-grid{display:grid;grid-template-columns:1fr;gap:12px}
.creator-card{position:relative;text-align:left;background:#1c2129;border:1px solid #2f3742;border-radius:14px;padding:15px 56px 13px 15px;cursor:pointer;color:#e8ecf1;transition:border-color .15s,transform .15s;font-family:inherit;display:flex;flex-direction:column;gap:2px}
.creator-card:hover{border-color:#4d8dff;transform:translateY(-2px)}
.creator-card.sel{border-color:#ffd23f;box-shadow:0 0 0 1px #ffd23f55 inset;background:#211f19}
.creator-card.locked{opacity:.55;cursor:not-allowed;border-style:dashed;background:#171b21}
.creator-card.locked:hover{transform:none;border-color:#2f3742}
.creator-card.locked .ck{color:#8d9bab;border-color:#3a4652;background:#ffffff08}
.creator-card.locked .cnum{opacity:.55}
.creator-card .lock-note{display:block;margin-top:6px;color:#ffd23f!important;font-size:10.5px;line-height:1.5}
.difficulty-unlock-note{margin:0 0 12px;padding:10px 12px;border-radius:12px;background:#ffd23f0d;border:1px solid #ffd23f33;color:#b9c3cf;font-size:11px;line-height:1.65}
.difficulty-unlock-note b{display:block;margin-bottom:2px;color:#ffd23f;font-size:9px;letter-spacing:.12em}
.creator-card .ck{display:inline-block;font-size:10px;letter-spacing:2px;color:#ffd23f;border:1px solid #ffd23f55;border-radius:4px;padding:2px 7px;margin-bottom:10px;align-self:flex-start}
.creator-card h3{margin:0 0 6px;font-size:16px;line-height:1.4;color:#ffffff}
.creator-card p{margin:0;font-size:12px;line-height:1.65;color:#9aa3b2}
.creator-card .cnum{position:absolute;right:12px;top:10px;font-size:34px;font-weight:800;color:#ffffff0d;line-height:1}
.creator-cta{position:fixed;left:0;right:0;bottom:0;padding:14px 16px calc(14px + env(safe-area-inset-bottom));background:linear-gradient(transparent,#12151a 30%);max-width:750px;margin:0 auto}
.creator-cta button{width:100%;border:0;border-radius:12px;background:#ffd23f;color:#101318;font-size:15px;font-weight:800;padding:15px;cursor:pointer}
.creator-sum{display:flex;gap:8px;flex-wrap:wrap;margin:4px 0 14px}
.creator-sum span{font-size:11px;color:#ffd23f;background:#ffd23f14;border:1px solid #ffd23f44;border-radius:20px;padding:3px 11px}
.ck.hard{color:#ff7a5c;border-color:#ff7a5c66;background:#ff7a5c0d}
.ck.std{color:#5fce8a;border-color:#5fce8a66;background:#5fce8a0d}
.ck.chal{color:#ffd23f;border-color:#ffd23f66;background:#ffd23f0d}
.ck.hell{color:#ff5a5f;border-color:#ff5a5f88;background:#ff5a5f0d}
.cdiff{margin-top:9px;padding-top:8px;border-top:1px dashed #2f3742;font-size:10.5px;line-height:1.6;color:#9aa3b2}
.cvals{margin-top:9px;padding-top:8px;border-top:1px dashed #2f3742;font-size:10px;line-height:1.4;color:#9aa3b2;white-space:nowrap;overflow-x:auto;scrollbar-width:none;letter-spacing:0}
.cvals::-webkit-scrollbar{display:none}
.cstats{margin-top:9px;padding-top:8px;border-top:1px dashed #2f3742;display:flex;flex-direction:column;gap:3px}
.cstats .up{font-size:10.5px;color:#5fce8a}
.cstats .down{font-size:10.5px;color:#ffb84d}
.cvow{margin-top:9px;padding-top:8px;border-top:1px dashed #2f3742;font-size:10.5px;line-height:1.6;color:#6fa3ff}
.creator-pot{margin-top:14px;padding:14px;border:1px solid #2f3742;border-radius:16px;background:#1c2129}
.creator-pot-head{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-bottom:10px}
.creator-pot-head small{display:block;color:#4d8dff;letter-spacing:2px;font-size:9px;font-weight:700}
.creator-pot-head b{display:block;color:#ffffff;font-size:15px;margin-top:3px}
.creator-pot-head span{color:#9aa3b2;font-size:9px;text-align:right;line-height:1.5}
.creator-pot-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.creator-pot-row{background:#212730;border:1px solid #2f3742;border-radius:10px;padding:8px 10px;display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.creator-pot-row span{font-size:10.5px;color:#c9d1dc}
.creator-pot-row b{font-size:14px;color:#ffffff}
.creator-pot-row em{font-style:normal;font-size:9.5px;color:#9aa3b2;white-space:nowrap}
.creator-pot-row em strong{color:#ffd23f}
.creator-pot-note{margin:9px 0 0;color:#6b7484;font-size:9.5px;line-height:1.7}
.v181-scout{background:#151a21;border:1px solid #2f3742;border-radius:18px;overflow:hidden;margin-top:2px;box-shadow:0 18px 40px #0006}
.v181-scout-top{position:relative;padding:17px 16px 14px;background:linear-gradient(135deg,#1b2430,#11151b 72%);border-bottom:1px solid #2f3742}
.v181-scout-top small{display:block;font-size:9px;letter-spacing:3px;color:#4d8dff;font-weight:800}
.v181-scout-top h2{font-size:25px;line-height:1.15;margin:6px 0 4px;color:#ffffff;letter-spacing:.01em;padding-right:70px}
.v181-scout-top p{margin:0;font-size:11px;color:#9aa3b2;padding-right:70px}
.v181-stamp{position:absolute;right:15px;top:14px;width:62px;height:62px;border:2px solid #ffd23f;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ffd23f;transform:rotate(-9deg);background:#ffd23f0a;box-shadow:0 0 0 3px #ffd23f12 inset}
.v181-stamp b{font-size:23px;line-height:1;font-weight:900}
.v181-stamp small{font-size:7px;letter-spacing:1px;color:#ffd23f;margin-top:2px}
.v181-chips{display:flex;flex-wrap:wrap;gap:6px;padding:11px 16px 0}
.v181-chips span{font-size:9.5px;color:#c9d1dc;background:#1c2129;border:1px solid #2f3742;border-radius:20px;padding:3px 9px}
.v181-grades{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:12px 16px 4px}
.v181-grade{background:#1c2129;border:1px solid #2f3742;border-radius:12px;padding:9px 10px}
.v181-grade small{display:block;font-size:9px;color:#8fa1b5;letter-spacing:1px}
.v181-grade b{display:block;font-size:18px;line-height:1.1;color:#ffd23f;margin-top:2px}
.v181-grade em{font-style:normal;font-size:8.5px;color:#6b7484}
.v181-block{padding:12px 16px 0}
.v181-block-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:8px}
.v181-block-head h3{margin:0;font-size:10px;letter-spacing:2px;color:#8fa1b5;font-weight:800}
.v181-block-head span{font-size:8.5px;color:#5f6b7a;text-align:right}
.v181-template{background:linear-gradient(135deg,#1d2430,#1a1f27);border:1px solid #3a4655;border-left:3px solid #ffd23f;border-radius:12px;padding:11px 12px}
.v181-template b{display:block;color:#ffd23f;font-size:14px;line-height:1.3;margin-bottom:5px}
.v181-template p{margin:0;color:#9aa3b2;font-size:10px;line-height:1.7}
.v181-template small{display:block;margin-top:6px;color:#6b7484;font-size:9px;line-height:1.5}
.v181-pick{display:flex;align-items:baseline;justify-content:space-between;gap:10px;background:#1c2129;border:1px solid #3a4655;border-radius:12px;padding:10px 11px}
.v181-pick b{font-size:14px;color:#ffffff}
.v181-pick span{font-size:8.5px;color:#8fa1b5;text-align:right;line-height:1.4}
.v181-tags{display:flex;flex-wrap:wrap;gap:6px}
.v181-tags span{font-size:10px;border-radius:20px;padding:4px 9px;border:1px solid #3a4655;background:#1c2129;color:#c9d1dc}
.v181-tags .up{border-color:#5fce8a55;color:#5fce8a}
.v181-tags .down{border-color:#ff7a5c55;color:#ff7a5c}
.v181-attrs{display:flex;flex-direction:column;gap:8px}
.v181-attr-top{display:flex;align-items:baseline;gap:7px;font-size:10.5px;color:#c9d1dc}
.v181-attr-top span{flex:1}
.v181-attr-top b{color:#ffffff;font-size:11px}
.v181-attr-top em{font-style:normal;color:#8fa1b5;font-size:9px}
.v181-bar{position:relative;height:5px;background:#2a313b;border-radius:5px;margin-top:4px;overflow:hidden}
.v181-scout .v181-bar i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#2d5be3,#4d8dff)!important;border-radius:5px}
.v181-bar u{position:absolute;top:-2px;bottom:-2px;width:2px;background:#ffd23f;box-shadow:0 0 6px #ffd23f}
.v181-note{margin:0;font-size:10px;line-height:1.7;color:#9aa3b2;background:#1c2129;border:1px dashed #2f3742;border-radius:12px;padding:10px}
.v181-sign{padding:12px 16px 16px;font-size:8.5px;line-height:1.6;color:#5f6b7a;letter-spacing:.04em}
.v182-build-wrap{padding-bottom:116px}
.v182-sec{margin-top:20px;padding-top:16px;border-top:1px solid #2f3742;scroll-margin-top:10px}
.v182-sec:first-of-type{margin-top:0;padding-top:0;border-top:0}
.v182-sec-head{display:flex;align-items:flex-start;gap:10px;margin-bottom:11px}
.v182-sec-head>span{font-size:24px;line-height:1;font-weight:900;color:#ffd23f22;min-width:36px}
.v182-sec-head>div{flex:1;min-width:0}
.v182-sec-head b{display:block;font-size:13px;color:#ffffff;letter-spacing:.02em}
.v182-sec-head p{margin:3px 0 0;font-size:9.5px;line-height:1.6;color:#8fa1b5}
.v182-sec-head em{font-style:normal;font-size:9px;color:#6b7484;text-align:right;max-width:118px;line-height:1.4}
.v182-sec-head em.on{color:#ffd23f}
.v182-sec .creator-grid{gap:9px}
.v182-locked{border:1px dashed #3a4655;border-radius:14px;padding:22px 14px;text-align:center;font-size:11px;line-height:1.6;color:#8fa1b5;background:#171c23}
.v182-talent-embed .pre{min-height:0!important;padding:0!important;background:transparent!important}
.v182-talent-embed .pre-top,.v182-talent-embed .pre-intro,.v182-talent-embed .v210-story-note,.v182-talent-embed .sticky-cta{display:none!important}
.v182-talent-embed .talent-wrap{padding:0!important}
.v182-talent-embed .v210-drawbar{margin-bottom:10px}
.v182-talent-embed .ad-hero,.v182-talent-embed .takeall-ad,.v182-talent-embed .v167-origin-note{margin-top:10px}
.creator-cta button:disabled{background:#2a3038!important;color:#6b7484!important;cursor:not-allowed}
.v183-wizard{padding-bottom:116px}
.v183-progress{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px;margin:0 0 16px;padding:10px 8px 9px;background:#171c23;border:1px solid #2f3742;border-radius:14px}
.v183-progress>div{text-align:center;font-size:8.5px;line-height:1.25;color:#5f6b7a;white-space:nowrap}
.v183-progress .n{display:flex;align-items:center;justify-content:center;width:19px;height:19px;margin:0 auto 4px;border-radius:50%;border:1px solid #3a4655;background:#1c2129;color:#6b7484;font-size:8px;font-weight:800}
.v183-progress .done{color:#5fce8a}
.v183-progress .done .n{border-color:#5fce8a;color:#5fce8a;background:#5fce8a10}
.v183-progress .on{color:#ffd23f;font-weight:800}
.v183-progress .on .n{border-color:#ffd23f;background:#ffd23f;color:#101318}
.v183-grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.v183-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.v183-choice{text-align:center;background:#1c2129;border:1px solid #2f3742;border-radius:10px;padding:8px 4px;color:#c9d1dc;font-family:inherit;cursor:pointer;display:flex;align-items:center;justify-content:center;min-height:38px}
.v183-choice.on{border-color:#ffd23f;background:#211f19;box-shadow:0 0 0 1px #ffd23f55 inset}
.v183-choice b{font-size:10px;color:#ffffff;line-height:1.25;font-weight:700}
.v183-detail{margin-top:10px;padding:2px 2px 0;border:0;background:transparent}
.v183-detail b{display:block;font-size:12px;color:#ffd23f}
.v183-detail p{margin:4px 0;font-size:10px;line-height:1.6;color:#c9d1dc}
.v183-detail span{font-size:9px;color:#8fa1b5}
.v183-opts{display:flex;flex-direction:column;gap:7px}
.v183-opt{text-align:left;background:#1c2129;border:1px solid #2f3742;border-radius:11px;padding:8px 9px;color:#c9d1dc;font-family:inherit;cursor:pointer;display:flex;align-items:center;min-height:44px}
.v183-opt.on{border-color:#ffd23f;background:#211f19;box-shadow:0 0 0 1px #ffd23f55 inset}
.v183-opt b{font-size:10.5px;color:#ffffff;line-height:1.35;font-weight:700}
.v183-opt span{font-size:8.5px;line-height:1.4;color:#9aa3b2}
.v183-opt em{font-style:normal;font-size:8px;line-height:1.4;color:#6fa3ff}
.v184-sec{margin-top:14px;padding-top:12px;border-top:1px solid #2f3742}
.v184-sec:first-of-type{margin-top:0;padding-top:0;border-top:0}
.v184-sec-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:7px}
.v184-sec-head b{font-size:10px;letter-spacing:2px;color:#8fa1b5;font-weight:800}
.v184-sec-head span{font-size:9px;color:#ffd23f;text-align:right;max-width:150px;line-height:1.4}
.v184-talents{display:grid;grid-template-columns:1fr 1fr;gap:7px}
.v184-talent{text-align:left;background:#1c2129;border:1px solid #2f3742;border-radius:11px;padding:8px 9px;color:#c9d1dc;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;gap:2px;min-height:64px}
.v184-talent.common{background:linear-gradient(135deg,#1b2d24,#171c23);border-color:#3f7a5a55}
.v184-talent.good{background:linear-gradient(135deg,#1a2940,#171c23);border-color:#4d8dff55}
.v184-talent.rare{background:linear-gradient(135deg,#2c1f3d,#171c23);border-color:#a06cff66}
.v184-talent.legend{background:linear-gradient(135deg,#3a2c17,#171c23);border-color:#ffd23f88}
.v184-talent.on{border-color:#ffd23f!important;box-shadow:0 0 0 1px #ffd23f66 inset,0 6px 18px #0005}
.v184-talent small{font-size:7.5px;letter-spacing:1px;color:#ffd23f}
.v184-talent.common small{color:#7fe0a1}
.v184-talent.good small{color:#6fa3ff}
.v184-talent.rare small{color:#c39bff}
.v184-talent.legend small{color:#ffd23f}
.v184-talent b{font-size:11px;color:#ffffff;line-height:1.25}
.v184-talent span{font-size:8px;line-height:1.35;color:#9aa3b2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.v184-talent em{font-style:normal;font-size:7.5px;color:#5fce8a}
.v184-talent-bar{display:flex;align-items:center;gap:8px;margin-top:8px}
.v184-talent-bar button{border:1px solid #3a4655;background:#232b35;color:#ffd23f;border-radius:9px;padding:7px 9px;font-size:9px;font-weight:800;font-family:inherit;cursor:pointer;white-space:nowrap}
.v184-talent-bar span{font-size:8px;color:#6b7484}
.v184-origin-card{margin-top:9px;padding:10px 11px;border:1px solid #ffd23f55;border-radius:12px;background:linear-gradient(135deg,#241f12,#1a1d24)}
.v184-origin-card small{display:block;font-size:7.5px;letter-spacing:2px;color:#ffd23f;font-weight:800}
.v184-origin-card b{display:block;font-size:11.5px;color:#ffffff;margin-top:3px}
.v184-origin-card p{margin:3px 0 7px;font-size:8.5px;line-height:1.55;color:#9aa3b2}
.v184-origin-card button{width:100%;border:1px solid #ffd23f;border-radius:9px;background:#ffd23f;color:#101318;font-size:9px;font-weight:900;padding:8px;font-family:inherit;cursor:pointer}
.v184-origin-card.on{border-color:#5fce8a55;background:linear-gradient(135deg,#13231a,#171c23)}
.v184-origin-card.on small{color:#5fce8a}
.v184-origin-card.on p{margin-bottom:0}
@media(max-width:360px){.v183-grid2,.v184-talents{grid-template-columns:1fr}.v183-progress>div{font-size:7.5px}}
.origin-roll-card{background:linear-gradient(145deg,#1c2129,#202a36);border:1px solid #ffd23f55;border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:8px}
.origin-roll-top{display:flex;justify-content:space-between;align-items:center}
.origin-roll-top .ck{margin:0}
.origin-age{font-size:10px;color:#9aa3b2}
.origin-roll-card h3{margin:2px 0 0;font-size:20px;line-height:1.35;color:#ffffff}
.origin-roll-card>p{margin:0;font-size:12px;line-height:1.7;color:#c9d1dc}
.origin-traits{display:flex;flex-direction:column;gap:6px;margin-top:4px;padding-top:9px;border-top:1px dashed #2f3742}
.origin-traits>div{display:grid;grid-template-columns:52px minmax(0,1fr);gap:7px;align-items:start}
.origin-traits small{font-size:9px;color:#8fa1b5;letter-spacing:.06em;padding-top:2px}
.origin-traits span{font-size:10.5px;line-height:1.55;color:#dbe4ee}
.origin-reroll{border:1px solid #3a4655;background:#232b35;color:#ffd23f;border-radius:12px;padding:10px;font-size:11.5px;font-weight:800;font-family:inherit;cursor:pointer;margin-top:2px}
.origin-reroll:disabled{opacity:.45;color:#8fa1b5;cursor:not-allowed}
.origin-ad{width:100%;border:1px solid #4d8dff66;background:#16243a;color:#8fb7ff;border-radius:12px;padding:10px;font-size:11.5px;font-weight:800;font-family:inherit;cursor:pointer;margin-top:2px}
.year-block{background:#1c2129;border:1px solid #2f3742;border-radius:16px;padding:13px}
.year-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px}
.year-head b{font-size:12px;color:#ffffff}
.year-head span{font-size:9px;color:#8fa1b5;text-align:right}
.year-chips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px}
.year-chip{border:1px solid #3a4655;background:#212730;color:#c9d1dc;border-radius:10px;padding:9px 4px;font-size:11px;font-weight:800;font-family:inherit;cursor:pointer}
.year-chip.on{border-color:#ffd23f;background:#2a261b;color:#ffd23f;box-shadow:0 0 0 1px #ffd23f33 inset}
.year-note{margin:8px 0 0;font-size:9.5px;line-height:1.6;color:#8fa1b5}
.creator-id{background:#1c2129;border:1px solid #2f3742;border-radius:16px;padding:13px}
.creator-id-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.creator-id-head b{font-size:12px;color:#ffffff}
.creator-id-head span{font-size:9px;color:#8fa1b5}
.creator-id-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:7px}
.creator-id-row b{font-size:15px;color:#ffd23f;letter-spacing:.02em}
.creator-id-row button{border:1px solid #3a4655;background:#232b35;color:#e8ecf1;border-radius:10px;padding:8px 10px;font-size:10px;font-family:inherit;cursor:pointer;white-space:nowrap}
.origin-confirm{width:100%;border:0;border-radius:14px;padding:15px;background:#ffd23f;color:#101318;font-size:14px;font-weight:900;font-family:inherit;cursor:pointer}
.origin-confirm:disabled{background:#2a3038;color:#6b7484;cursor:not-allowed}
@media(max-width:360px){.creator-pot-grid{grid-template-columns:1fr}.year-chips{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>`;

  // 步骤回退：0 出身 / 1 难度 / 2 球风 / 3 自白 / 4 确认
  CG.stepBack = function () {
    if (CG.step <= 0) {
      ui.screen = 'home';
      window.render && render();
      return;
    }
    if (CG.step === 2) applyDifficulty(null);
    CG.step--;
    window.render && render();
  };

  function creatorShell(stepLabel, en, h2, p, cardsHtml, topLabel, backAction) {
    const top = topLabel || ('创建你的球员 · 第 ' + stepLabel);
    const back = backAction || '__CREATOR__.stepBack()';
    return `${CREATOR_CSS}<section class="creator-wrap"><div class="creator-top"><button class="creator-back" onclick="${back}">←</button><strong>${top}</strong><span style="width:36px"></span></div><div class="creator-hero"><small>${en}</small><h2>${h2}</h2><p>${p}</p></div><div class="creator-grid">${cardsHtml}</div></section>`;
  }

    function ccard(num, tag, h3, desc, onclick, extra, cls) {
    return `<button class="creator-card ${cls || ''}" onclick="${onclick}"><span class="cnum">${num}</span><span class="ck">${tag}</span><h3>${h3}</h3>${desc ? `<p>${desc}</p>` : ''}${extra || ''}</button>`;
  }

  function eraCard(e, i) {
    /* 「真实数据…」等开发说明不再暴露给玩家 */
    return ccard('0' + (i + 1), '年代 · ' + e.range, e.n, e.d, `__CREATOR__.pick('${e.year}')`);
  }

  // 出身卡：只讲来路与参选资格，难度在下一步单独选
  function originCard(o, i) {
    const pr = POT_RANGES[o.id] || [80, 90];
    return ccard('0' + (i + 1), '出身 · 参选资格', o.n, o.d, `__CREATOR__.pick('${o.id}')`,
      `<div class="cdiff">${o.note}<br>起点 OVR ${START_RANGES[o.id][0]}–${START_RANGES[o.id][1]} · 潜力 OVR ${pr[0]}–${pr[1]}</div>`);
  }

  // 难度卡：只保留标题和一行数值；未解锁时禁用并显示前置条件
  function difficultyCard(x, i) {
    if (!isDiffUnlocked(x.id)) {
      const prev = DIFFICULTIES[DIFF_ORDER.indexOf(x.id) - 1];
      return `<button class="creator-card locked" disabled>
        <span class="cnum">0${i + 1}</span>
        <span class="ck">难度 · ${x.n}</span>
        <h3>🔒 ${x.title}</h3>
        <div class="cvals ${x.cls}">${x.note}<b class="lock-note">完成「${prev ? prev.n : '上一'}」难度的一段生涯后解锁</b></div>
      </button>`;
    }
    return ccard('0' + (i + 1), '难度 · ' + x.n, x.title, '', `__CREATOR__.pick('${x.id}')`,
      `<div class="cvals ${x.cls}">${x.note}</div>`,
      CG.difficulty === x.id ? 'sel' : '');
  }

  // 球风卡的增益/短板
  function styleCard(s, i) {
    return ccard('0' + (i + 1), '位置 · 球风', s.n, s.d, `__CREATOR__.pickStyle('${s.id}')`,
      `<div class="cstats"><span class="up">▲ ${s.gain}</span><span class="down">▽ ${s.weak}</span></div>`,
      CG.style === s.id ? 'sel' : '');
  }

  // 自白卡（附事件倾向说明）
  function vowCard(v, i) {
    return ccard('0' + (i + 1), '自白', '「' + v.t + '」', v.d, `__CREATOR__.pickVow('${v.id}')`,
      `<div class="cvow">${v.fx}</div>`, CG.vow === v.id ? 'sel' : '');
  }

  function styleChoice(s) {
    return '<button class="v183-choice ' + (CG.style === s.id ? 'on' : '') + '" onclick="__CREATOR__.pickStyle(\'' + s.id + '\')">'
      + '<b>' + s.n + '</b>'
      + '</button>';
  }

  function vowChoice(v) {
    return '<button class="v183-opt ' + (CG.vow === v.id ? 'on' : '') + '" onclick="__CREATOR__.pickVow(\'' + v.id + '\')">'
      + '<b>「' + v.t + '」</b>'
      + '</button>';
  }

  function talentChoice(t, i) {
    const on = ui.allTalents || ui.talentPick === i;
    const rarity = t.r === '传奇' ? 'legend' : t.r === '稀有' ? 'rare' : t.r === '优秀' ? 'good' : 'common';
    return '<button class="v184-talent ' + rarity + ' ' + (on ? 'on' : '') + '" onclick="ui.talentPick=' + i + ';render()">'
      + '<small>' + t.r + '</small><b>' + t.n + '</b><span>' + t.d + '</span>'
      + (ui.allTalents ? '<em>已打包</em>' : '')
      + '</button>';
  }

  function originStoryInfo(originKey) {
    const id = originKey || CG.originRoll || CG.origin || 'undrafted';
    try {
      if (typeof window.v167OriginStoryInfo === 'function') return window.v167OriginStoryInfo(id);
    } catch (e) {}
    return { n: '出身专属剧情', chain: '四段只属于你这个出身的故事', d: '解锁后会在生涯中增加出身专属剧情。' };
  }

  function potentialTable() {
    const p = CG.player;
    if (!p || !p.potentialCaps) return '';
    const names = { finishing: '终结', shooting: '投射', playmaking: '组织', defense: '防守', steals: '抢断', blocks: '盖帽', strength: '力量', rebounding: '篮板', athleticism: '运动', durability: '耐久', mentality: '心态' };
    const rows = POT_KEYS.map(k => {
      const cur = Number(p.attrs[k]) || 0;
      const pot = Number(p.potentialCaps[k]) || cur;
      return `<div class="creator-pot-row"><span>${names[k]}</span><b>${cur}</b><em>潜力 <strong>${pot}</strong> / 110</em></div>`;
    }).join('');
    return `<div class="creator-pot"><div class="creator-pot-head"><div><small>POTENTIAL REPORT</small><b>潜力报告</b></div><span>初始潜力 OVR ${p.potentialOvr || '—'}<br>专精点提高潜力线</span></div><div class="creator-pot-grid">${rows}</div><p class="creator-pot-note">初始潜力由出身和球风决定；成长模板只影响成长曲线，不再限制天花板。能力到达潜力线后成长放缓，专精点可以提高潜力线、加快成长。所有出身的硬上限统一为 110。</p></div>`;
  }

  const ATTR_NAMES = { finishing: '终结', shooting: '投射', playmaking: '组织', defense: '防守', steals: '抢断', blocks: '盖帽', strength: '力量', rebounding: '篮板', athleticism: '运动', durability: '耐久', mentality: '心态' };
  function gradeOf(v) {
    v = Number(v) || 0;
    return v >= 90 ? 'S' : v >= 86 ? 'A' : v >= 82 ? 'B+' : v >= 78 ? 'B' : v >= 74 ? 'C+' : 'C';
  }
  function draftProjection(o, df) {
    if (!o || o.id === 'undrafted') return null;
    const base = {
      ncaa: [3, 10], prep: [3, 10], academy: [5, 14], cba: [18, 35],
      euro: [15, 30], nbl: [10, 25], gleague: [20, 40]
    }[o.id] || [10, 25];
    const shift = Number(df && df.draftShift) || 0;
    const lo = Math.max(1, Math.min(60, base[0] + shift));
    const hi = Math.max(1, Math.min(60, base[1] + shift));
    return [Math.min(lo, hi), Math.max(lo, hi)];
  }
  function draftProjectionText(dr) {
    if (!dr) return '落选 / 10 天合同';
    const lo = dr[0], hi = dr[1];
    if (hi <= 14) return '乐透区 · 第 ' + lo + '–' + hi + ' 顺位';
    if (lo <= 30 && hi <= 30) return '首轮 · 第 ' + lo + '–' + hi + ' 顺位';
    if (lo <= 30) return '首轮末 – 次轮 · 第 ' + lo + '–' + hi + ' 顺位';
    return '次轮 · 第 ' + lo + '–' + hi + ' 顺位';
  }

  function scoutingReport() {
    const p = CG.player;
    if (!p) return potentialTable();
    const o = ORIGINS.find(x => x.id === CG.origin) || ORIGINS[0];
    const s = STYLES.find(x => x.id === CG.style) || STYLES[0];
    const v = VOWS.find(x => x.id === CG.vow) || VOWS[0];
    const df = DIFFICULTIES.find(x => x.id === CG.difficulty) || DIFFICULTIES[1];
    const era = ERAS.find(e => e.year === CG.year) || ERAS[5];
    const arch = CG.archetype || CG.pendingArch || {};
    const archMeta = (window.__ARCHETYPES__ && window.__ARCHETYPES__[arch.key]) || {};
    const archName = arch.n || archMeta.n || '待评估';
    const archDesc = arch.d || archMeta.d || '球探还没有给出稳定的成长曲线。';
    const starGroup = (window.__STAR_ROUTE_GROUP__ && window.__STAR_ROUTE_GROUP__[s.id]) || arch.route || 'wing';
    const starMap = (window.__STAR_TEMPLATES__ && window.__STAR_TEMPLATES__[arch.key]) || {};
    const star = arch.star || starMap[starGroup] || starMap.wing || '';
    const starLabel = star || archName;
    const rows = POT_KEYS.map(k => {
      const cur = Number(p.attrs[k]) || 0;
      const pot = Number(p.potentialCaps && p.potentialCaps[k]) || cur;
      const curW = Math.max(0, Math.min(100, cur / 110 * 100));
      const potW = Math.max(0, Math.min(100, pot / 110 * 100));
      let fill;
      if (cur > pot) {
        /* 过线后整条平滑过渡：潜力线附近开始由蓝转金，避免硬切一块黄色。 */
        const potInFill = curW > 0 ? Math.min(100, potW / curW * 100) : 0;
        const blendStart = Math.max(0, potInFill - 14);
        fill = '<i class="over" style="width:' + curW.toFixed(1) + '%;background:linear-gradient(90deg,#2d5be3 0%,#4d8dff ' + blendStart.toFixed(1) + '%,#ffd23f ' + potInFill.toFixed(1) + '%,#ff9d2e 100%)!important"></i>';
      } else {
        fill = '<i style="width:' + curW.toFixed(1) + '%"></i>';
      }
      return '<div class="v181-attr">'
        + '<div class="v181-attr-top"><span>' + ATTR_NAMES[k] + '</span><b>' + cur + '</b><em>潜力 ' + pot + '</em></div>'
        + '<div class="v181-bar">' + fill + '<u style="left:' + potW.toFixed(1) + '%"></u></div>'
        + '</div>';
    }).join('');
    const sorted = POT_KEYS.map(k => ({ k: k, v: Number(p.attrs[k]) || 0 })).sort((a, b) => b.v - a.v);
    const strengths = sorted.slice(0, 2);
    const weaknesses = sorted.slice(-2).reverse();
    const ovrG = gradeOf(p.ovr);
    const potG = gradeOf(p.potentialOvr || p.ovr);
    const risk = df.id === 'hell' ? '极高' : df.id === 'hard' ? '偏高' : df.id === 'easy' ? '低' : '中';
    const dr = draftProjection(o, df);
    const summary = o.n + '出身，' + s.n + '打法。' + ATTR_NAMES[strengths[0].k] + '是现在最可靠的武器，' + ATTR_NAMES[weaknesses[0].k] + '是进联盟后最先被针对的地方。';
    return `${CREATOR_CSS}<section class="creator-wrap v181-report-wrap">`
      + '<div class="creator-top"><button class="creator-back" onclick="__CREATOR__.stepBack()">←</button><strong>新的生涯 · 第 4/4 步</strong><span style="width:36px"></span></div>'
      + progressBar(3)
      + '<div class="v181-scout">'
      +   '<div class="v181-scout-top"><small>SCOUTING REPORT · 球探报告</small><h2>' + (CG.playerNameZh || CG.englishName || 'Rookie') + '</h2><p>' + (CG.englishName && CG.englishName !== CG.playerNameZh ? CG.englishName + ' · ' : '') + p.age + ' 岁 · ' + o.n + ' · ' + s.n + '</p>'
      +     '<div class="v181-stamp"><b>' + potG + '</b><small>UPSIDE</small></div></div>'
      +   '<div class="v181-chips"><span>' + era.range + ' · ' + era.n + '</span><span>' + o.n + '</span><span>' + s.n + '</span><span>「' + v.t + '」</span><span>难度 · ' + df.n + '</span></div>'
      +   '<div class="v181-grades">'
      +     '<div class="v181-grade"><small>即战力</small><b>' + ovrG + '</b><em>OVR ' + p.ovr + '</em></div>'
      +     '<div class="v181-grade"><small>初始潜力</small><b>' + potG + '</b><em>潜力 OVR ' + (p.potentialOvr || '—') + '</em></div>'
      +     '<div class="v181-grade"><small>风险</small><b>' + risk + '</b><em>' + df.n + '难度</em></div>'
      +   '</div>'
      +   '<div class="v181-block"><div class="v181-block-head"><h3>球星模板</h3><span>球探内部评估</span></div>'
      +     '<div class="v181-template"><b>' + starLabel + '</b><p>' + archDesc + '</p><small>路线：' + s.n + ' · 曲线：' + archName + '</small></div></div>'
      +   '<div class="v181-block"><div class="v181-block-head"><h3>选秀预测</h3><span>球探初判</span></div>'
      +     '<div class="v181-pick"><b>' + draftProjectionText(dr) + '</b><span>' + (dr ? '随机扰动与球队需求会影响最终顺位' : '没有球队承诺，先从 10 天合同开始') + '</span></div></div>'
      +   '<div class="v181-block"><div class="v181-block-head"><h3>优势 / 短板</h3><span>当前能力</span></div>'
      +     '<div class="v181-tags">' + strengths.map(x => '<span class="up">▲ ' + ATTR_NAMES[x.k] + ' ' + x.v + '</span>').join('') + weaknesses.map(x => '<span class="down">▽ ' + ATTR_NAMES[x.k] + ' ' + x.v + '</span>').join('') + '</div></div>'
      +   '<div class="v181-block"><div class="v181-block-head"><h3>能力报告</h3><span>蓝条当前 · 黄线初始潜力 · 硬上限 110</span></div><div class="v181-attrs">' + rows + '</div></div>'
      +   '<div class="v181-block"><div class="v181-block-head"><h3>球探结论</h3><span>' + v.t + '</span></div><p class="v181-note">' + summary + '</p></div>'
      +   '<div class="v181-sign">' + era.range + ' · ' + era.n + ' · 难度 ' + df.n + '<br>专精点提高潜力线，模板决定成长曲线；所有出身硬上限统一 110。</div>'
      + '</div>'
      + '<div class="creator-cta"><button onclick="__CREATOR__.startCareer()">开启生涯 →</button></div>'
      + '</section>';
  }

  function progressBar(step) {
    const labels = ['出身', '打法', '难度', '确认'];
    return '<div class="v183-progress">'
      + labels.map((t, i) => '<div class="' + (i < step ? 'done' : i === step ? 'on' : '') + '"><b class="n">' + (i + 1) + '</b><span>' + t + '</span></div>').join('')
      + '</div>';
  }

  function wizardShell(step, en, h2, p, body, cta, backAction) {
    const back = backAction || '__CREATOR__.stepBack()';
    return `${CREATOR_CSS}<section class="creator-wrap v183-wizard">`
      + '<div class="creator-top"><button class="creator-back" onclick="' + back + '">←</button><strong>新的生涯 · 第 ' + (step + 1) + '/4 步</strong><span style="width:36px"></span></div>'
      + progressBar(step)
      + '<div class="creator-hero"><small>' + en + '</small><h2>' + h2 + '</h2><p>' + p + '</p></div>'
      + body
      + (cta || '')
      + '</section>';
  }

  function buildView(o, era) {
    const style = STYLES.find(x => x.id === CG.style);
    const vow = VOWS.find(x => x.id === CG.vow);
    const talentPicked = !!(ui.allTalents || ui.talentPick != null);
    const talents = Array.isArray(ui.talents) ? ui.talents : [];
    const freeUsed = Number(ui.talentFreeUsed) || 0;
    const refreshText = freeUsed < 2 ? '刷新天赋 · 免费 ' + (2 - freeUsed) + ' 次' : '看广告刷新天赋';
    const originKey = (o && o.id) || CG.originRoll || CG.origin;
    const originUnlocked = !!(originKey && (
      (ui && ui.originStoryUnlockedFor === originKey) ||
      CG.originStoryUnlockedFor === originKey
    ));
    const info = originStoryInfo(originKey);

    const positionSec = '<section class="v184-sec">'
      + '<div class="v184-sec-head"><b>01 位置</b><span>' + (style ? style.n : '未选择') + '</span></div>'
      + '<div class="v183-grid3">' + STYLES.map(styleChoice).join('') + '</div>'
      + '<div class="v183-detail">' + (style
        ? '<b>' + style.n + '</b><p>' + style.d + '</p><span>▲ ' + style.gain + ' · ▽ ' + style.weak + '</span>'
        : '<b>先选一个位置</b><p>长板决定你靠什么吃饭，短板决定对手怎么针对你。</p><span>点击上面的位置卡</span>') + '</div>'
      + '</section>';

    const vowSec = '<section class="v184-sec">'
      + '<div class="v184-sec-head"><b>02 自白</b><span>' + (vow ? '「' + vow.t + '」' : '未选择') + '</span></div>'
      + '<div class="v183-grid2">' + VOWS.map(vowChoice).join('') + '</div>'
      + '<div class="v183-detail">' + (vow
        ? '<b>「' + vow.t + '」</b><p>' + vow.d + '</p><span>' + vow.fx + '</span>'
        : '<b>先选一句自白</b><p>自白不改数值，只决定你会遇到什么样的故事。</p><span>点击上面的自白卡</span>') + '</div>'
      + '</section>';

    const talentBody = talents.length
      ? '<div class="v184-talents">' + talents.map(talentChoice).join('') + '</div>'
      : '<div class="v182-locked">先选一个位置，天赋池才会打开。</div>';
    const talentSec = '<section class="v184-sec">'
      + '<div class="v184-sec-head"><b>03 天赋</b><span>' + (ui.allTalents ? '四张全拿' : (ui.talentPick != null ? '已选 1 个' : '未选择')) + '</span></div>'
      + talentBody
      + (talents.length ? '<div class="v184-talent-bar"><button onclick="v71RefreshTalents()">↻ ' + refreshText + '</button><span>4 选 1</span></div>' : '')
      + (talents.length ? (originUnlocked
        ? '<div class="v184-origin-card on"><small>出身故事 · 已解锁</small><b>「' + info.n + '」</b><p>四段出身专属剧情已经加入生涯；当前四张天赋也已打包。</p></div>'
        : '<div class="v184-origin-card"><small>出身故事 · 专属剧情</small><b>「' + info.n + '」</b><p>解锁后，生涯里会多出 4 段只属于你这个出身的故事：' + info.chain + '。</p><button onclick="v167UnlockOriginStory()">🎬 看广告 · 解锁这 4 段出身剧情 + 当前四天赋</button></div>') : '')
      + '</section>';

    const cta = '<div class="creator-cta"><button ' + (style && vow && talentPicked ? '' : 'disabled') + ' onclick="__CREATOR__.toDifficulty()">下一步：难度 →</button></div>';
    return wizardShell(1, 'BUILD · 打法', '位置、自白、天赋，一页定下来',
      `年代：${era.range} · ${era.n}。出身：${o.n}。先选位置，再选自白，最后拿一个天赋。`,
      positionSec + vowSec + talentSec, cta);
  }

  function difficultyView(o, era) {
    const s = STYLES.find(x => x.id === CG.style) || STYLES[0];
    const unlocked = readDiffUnlock();
    const next = DIFFICULTIES.find(x => !unlocked[x.id]);
    const names = DIFFICULTIES.filter(x => unlocked[x.id]).map(x => x.n).join(' · ');
    const note = next
      ? `已解锁：${names}。完成「${(DIFFICULTIES[DIFF_ORDER.indexOf(next.id) - 1] || {}).n || '上一'}」难度的一段生涯，解锁「${next.n}」。`
      : `已解锁：${names}。全部难度已开放。`;
    const body = '<div class="difficulty-unlock-note"><b>难度进度</b><span>' + note + '</span></div>'
      + '<div class="creator-grid">' + DIFFICULTIES.map((x, i) => difficultyCard(x, i)).join('') + '</div>';
    const cta = '<div class="creator-cta"><button ' + (CG.difficulty ? '' : 'disabled') + ' onclick="__CREATOR__.toConfirm()">下一步：确认 →</button></div>';
    return wizardShell(2, 'DIFFICULTY MODULE · 独立模块', '这一局有多难', `年代：${era.range} · ${era.n}。出身：${o.n}。球风：${s.n}。`, body, cta);
  }

  function ensureOriginRoll() {
    if (!CG.originRoll && CG.origin) CG.originRoll = CG.origin;
    if (!CG.originRoll) CG.originRoll = ORIGINS[Math.floor(Math.random() * ORIGINS.length)].id;
    if (typeof CG.originRerolls !== 'number') CG.originRerolls = 2;
  }

  function ensureEnglishName() {
    if (!CG.englishName || !CG.playerNameZh) rerollName(true);
  }

  function rerollName(silent) {
    const year = CG.year || 2026;
    const i = Math.floor(Math.random() * 1000000);
    var picked = null;
    try {
      if (typeof window.v189RandomName === 'function') {
        picked = window.v189RandomName(CG.origin || CG.originRoll || '', null);
      }
    } catch (e) {}
    if (picked && picked.zh) {
      CG.playerNameZh = picked.zh;
      CG.englishName = picked.en || picked.zh;
      CG.nameKind = picked.kind || '';
    } else {
      try {
        CG.englishName = window.v180EnglishName ? window.v180EnglishName(year, i, null) : ('Rookie ' + (100 + (i % 900)));
      } catch (e) {
        CG.englishName = 'Rookie ' + (100 + (i % 900));
      }
      CG.playerNameZh = CG.englishName;
      CG.nameKind = 'western';
    }
    if (!silent && window.render) render();
  }

  function originRollCard(o) {
    const pr = POT_RANGES[o.id] || [80, 90];
    const sr = START_RANGES[o.id] || [68, 74];
    const age = o.age || (o.id === 'cba' ? 22 : 19);
    return '<div class="origin-roll-card">'
      + '<div class="origin-roll-top"><span class="ck">出身 · 参选资格</span><span class="origin-age">' + age + ' 岁</span></div>'
      + '<h3>' + o.n + '</h3>'
      + '<p>' + o.d + '</p>'
      + '<div class="origin-traits">'
      +   '<div><small>特点</small><span>' + o.note + '</span></div>'
      +   '<div><small>起点</small><span>OVR ' + sr[0] + '–' + sr[1] + ' · 潜力 OVR ' + pr[0] + '–' + pr[1] + '</span></div>'
      +   '<div><small>初始状态</small><span>健康 ' + o.health + ' · 自信 ' + o.confidence + ' · 信任 ' + o.trust + '</span></div>'
      + '</div>'
      + (CG.originRerolls > 0
        ? '<button class="origin-reroll" onclick="__CREATOR__.rerollOrigin()">🎲 换个出身（剩 ' + CG.originRerolls + ' 次）</button>'
        : '<button class="origin-ad" onclick="__CREATOR__.adRefreshOrigin()">📺 看广告 · 刷新 2 次重抽</button>')
      + '</div>';
  }

  function yearPicker(era) {
    return '<div class="year-block">'
      + '<div class="year-head"><b>起始年代</b><span>' + (era ? era.range + ' · ' + era.n : '先选一个年代') + '</span></div>'
      + '<div class="year-chips">' + ERAS.map(e => '<button class="year-chip ' + (CG.year === e.year ? 'on' : '') + '" onclick="__CREATOR__.pickYear(' + e.year + ')">' + e.year + '</button>').join('') + '</div>'
      + '<p class="year-note">' + (era ? era.d : '每个年代对应不同的真实名单与选秀背景。') + '</p>'
      + '</div>';
  }

  function nameBlock() {
    ensureEnglishName();
    var zh = CG.playerNameZh || CG.englishName || '无名新秀';
    var sub = CG.englishName && CG.englishName !== zh
      ? '英译中 · ' + CG.englishName
      : '中文名随机生成';
    return '<div class="creator-id">'
      + '<div class="creator-id-head"><b>球员姓名</b><span>系统生成，可重抽</span></div>'
      + '<div class="creator-id-row"><b>' + zh + '</b><button onclick="__CREATOR__.rerollName()">🎲 换个名字</button></div>'
      + '<div style="margin-top:4px;font-size:10px;color:#8d9bab;letter-spacing:.02em">' + sub + '</div>'
      + '</div>';
  }

  function confirmOriginButton() {
    return '<button class="origin-confirm" ' + (CG.year ? '' : 'disabled') + ' onclick="__CREATOR__.confirmOrigin()">就是我了 →</button>';
  }

  function renderCreator() {
    if (typeof CG.step !== 'number' || CG.step < 0 || CG.step > 3) CG.step = 0;
    const era = ERAS.find(e => e.year === CG.year) || null;

    if (CG.step === 0) {
      ensureOriginRoll();
      const o = ORIGINS.find(x => x.id === CG.originRoll) || ORIGINS[0];
      const cta = '<div class="creator-cta"><button ' + (CG.year ? '' : 'disabled') + ' onclick="__CREATOR__.confirmOrigin()">就是我了 →</button></div>';
      return wizardShell(0, 'ORIGIN · 出身', '你从哪一年、以什么身份进来',
        '出身随机，可换两次；用完后可看广告刷新。年代由你决定。',
        originRollCard(o) + yearPicker(era) + nameBlock(), cta);
    }

    const o = ORIGINS.find(x => x.id === CG.origin);
    if (!o || !CG.year) { CG.step = 0; return renderCreator(); }

    if (CG.step === 1) return buildView(o, era);
    if (CG.step === 2) return difficultyView(o, era);

    if (!CG.player) { ensureEnglishName(); try { buildPlayer(); } catch (e) { /* 渲染不因构建失败而崩 */ } }
    return scoutingReport();
  }

  // M1.5: 天赋页溢出修复（reward-card 按钮列收敛 + sticky-cta 加安全边距）
  (function talentOverflowFix() {
    const css = document.createElement('style');
    css.textContent = [
      '.talent-wrap{padding-bottom:96px!important}',
      '.reward-card{grid-template-columns:44px minmax(0,1fr) auto!important;overflow:hidden}',
      '.reward-card>div{min-width:0}',
      '.reward-card strong{word-break:break-all;display:block;font-size:11.5px;line-height:1.45}',
      '.reward-card small{white-space:normal}',
      '.reward-card button{white-space:nowrap;padding:6px 2px}',
      '.sticky-cta{width:min(calc(100% - 24px),420px)!important;padding-bottom:env(safe-area-inset-bottom)}',
      '.sticky-cta .btn{padding:13px 10px!important;font-size:13.5px!important;line-height:1.4!important}'
    ].join('');
    document.head.appendChild(css);
  })();

  function toTalents() {
    // 关键：把引擎 ui.selected 切到 custom + 确保 P 里有 custom（天赋/选秀页的 playerBy 依据）
    try { window.__DRAFT_RESULT__ = null; } catch (e) {}
    try {
      if (!CG.playerJson && CG.player) CG.playerJson = JSON.stringify(CG.player);
      const probe = document.createElement('script');
      probe.textContent = [
        'try{',
        'if(typeof ui!=="undefined"){ui.selected="custom"}',
        'if(typeof P!=="undefined"&&Array.isArray(P)&&!P.some(function(x){return x.id==="custom"})&&window.__CREATOR__&&window.__CREATOR__.playerJson){P.push(JSON.parse(window.__CREATOR__.playerJson))}',
        'if(typeof EX!=="undefined"&&EX&&!EX.custom){EX.custom={name:"无人知晓的名字",boost:{mentality:4,durability:2},confidence:5,mechanism:"没有人认识你——每一分成长都从零挣来。"}}',
        '}catch(e){}'
      ].join('');
      document.head.appendChild(probe);
    } catch (e) {}
    window.openTalents && openTalents();
  }

  /* ---------- 接管选人界面 ---------- */

  const _origRenderSelect = window.renderSelect;
  window.__ORIG_RENDER_SELECT__ = _origRenderSelect;
  const __customRenderSelect = function () {
    // M1：捏人三步完成后走原版天赋界面；天赋后 createCareer 由补丁接管
    return renderCreator();
  };
  window.__CUSTOM_RENDER_SELECT__ = __customRenderSelect;
  window.renderSelect = __customRenderSelect;
  try { renderSelect = __customRenderSelect; } catch (e) {}

  const _origCreateCareer = window.createCareer;
  window.__ORIG_CREATE_CAREER__ = _origCreateCareer;
  const __customCreateCareer = function () {
    /* 模拟明星模式走原版 createCareer，不经过自建球员的潜力/专精初始化。 */
    if (window.__GAME_MODE__ === 'star') {
      return _origCreateCareer.call(window);
    }
    // 复用确认页已经生成并展示过的球员，避免进入生涯时重新随机一次潜力。
    const p = CG.player || buildPlayer();
    // 选秀球队 = 实际球队；低顺位由强队选中，避免选秀夜说一套、进联盟后是另一套。
    const dr = CG.draftResult || window.__DRAFT_RESULT__;
    if (dr && dr.teamAbbr) p.team = dr.teamAbbr;
    // 临时把 currentP 指向自创球员
    const _origCurrentP = window.currentP;
    window.currentP = function () { return p; };
    // 原版 createCareer 内部调用 currentP()（我们已重定向）
    _origCreateCareer.call(window);
    window.currentP = _origCurrentP;
    // 生涯对象附加成长模板（球探报告展示名称与描述）
    if (typeof career !== 'undefined' && career) {
      if (dr && dr.teamAbbr) career.team = dr.teamAbbr;
      if (dr && dr.team) career.draftTeamName = dr.team;
      const df = DIFFICULTIES.find(x => x.id === CG.difficulty) || DIFFICULTIES[1];
      career.__arch = { key: CG.archetype.key, n: CG.archetype.n, d: CG.archetype.d || '', star: CG.archetype.star || '', route: CG.archetype.route || '', cap: CG.archetype.cap, slope: CG.archetype.slope, front: CG.archetype.front, healthRisk: CG.archetype.healthRisk, mods: CG.archetype.slopeMods, origin: CG.origin, style: CG.style, vow: CG.vow, fame: ORIGINS.find(x => x.id === CG.origin).fame, difficulty: df.id, difficultyName: df.n, draftShift: df.draftShift, difficultyInjury: df.injury, difficultyGrowth: df.growth, potentialCaps: CG.potentialCaps, potentialOvr: CG.potentialOvr };
      career.potentialCaps = CG.potentialCaps;
      career.potentialOvr = CG.potentialOvr;
      career.potentialHard = 110;
      career.englishName = CG.englishName || '';
      career.playerNameZh = CG.playerNameZh || CG.englishName || '';
      career.playerName = career.playerNameZh || '我';
      career.nameKind = CG.nameKind || '';
      /* 自建球员使用专精点，不再沿用原版 5 点训练营成长点；
         否则初始会变成 4 + ceil(5/2) = 7 点，与策划口径不符。 */
      career.devPoints = 0;
      career.focusPts = 4;
      career.domesticFame = ORIGINS.find(x => x.id === CG.origin).fame;
      // 开局 feed 定制
      career.feed = ['机票、护照、一双球鞋。你的名字还没有人认识。'];
    }
    CG.step = 0; CG.year = null; CG.origin = null; CG.difficulty = null; CG.style = null; CG.vow = null;
    CG.originRoll = null; CG.originRerolls = 2; CG.englishName = null; CG.playerNameZh = null; CG.nameKind = '';
    CG.player = null; CG.playerJson = null; CG.archetype = null; CG.talentReady = false;
    // 保留 CG.pendingArch：1 秒轮询还要把它写入存档 __arch
  };
  window.__CUSTOM_CREATE_CAREER__ = __customCreateCareer;
  window.createCareer = __customCreateCareer;
  try { createCareer = __customCreateCareer; } catch (e) {}

  /* 完成一段生涯（至少打过一场）后，解锁下一难度。 */
  try {
    const _diffRetire = retire;
    if (typeof _diffRetire === 'function') {
      retire = function (reason) {
        const before = (typeof career !== 'undefined' && career) ? career : null;
        const r = _diffRetire.apply(this, arguments);
        try {
          if (before && before.playerId === 'custom') {
            const d = (before.__arch && before.__arch.difficulty) || before.difficulty;
            const games = Number((before.careerTotals && before.careerTotals.games) || before.games || 0);
            if (d && games > 0) unlockDifficulty(d);
          }
        } catch (e) {}
        return r;
      };
      window.retire = retire;
    }
  } catch (e) {}

  /* 天赋抽取作为合并页的一段；独立打开时也显示正确的步骤文案。 */
  try {
    const _origTalents = window.renderTalents || renderTalents;
    window.__ORIG_RENDER_TALENTS__ = _origTalents;
    const wrappedTalents = function () {
      let html = _origTalents.apply(this, arguments);
      try {
        if (window.__GAME_MODE__ === 'custom' && CG.player && !career) {
          html = html.replace(/<strong>[^<]*·\s*命运天赋<\/strong>/, '<strong>创建你的球员 · 天赋</strong>');
          html = html.replace(/DESTINY TALENTS · 68 CARDS/, '选择天赋');
          html = html.replace(/进入选秀之夜/g, '下一步：选择难度');
          html = html.replace(/走向选秀之夜/g, '下一步：选择难度');
        }
      } catch (e) {}
      return html;
    };
    window.renderTalents = wrappedTalents;
    try { renderTalents = wrappedTalents; } catch (e) {}
  } catch (e) {}

  /* 天赋页 CTA 先进入独立难度模块；确认页的「开启生涯」再走原版选秀。 */
  try {
    const _origEnterDraft = window.enterDraft;
    window.__ORIG_ENTER_DRAFT__ = _origEnterDraft;
    const wrappedEnterDraft = function () {
      try {
        if (window.__GAME_MODE__ === 'custom' && CG.player && !career && !CG.difficulty) {
          if (!CG.style || !CG.vow) { notify('先完成位置和自白'); return; }
          if (!ui.allTalents && ui.talentPick == null) { notify('先选择一个天赋'); return; }
          CG.step = 2;
          ui.screen = 'select';
          window.render && render();
          return;
        }
      } catch (e) {}
      return _origEnterDraft.apply(this, arguments);
    };
    window.enterDraft = wrappedEnterDraft;
    try { enterDraft = wrappedEnterDraft; } catch (e) {}
  } catch (e) {}

  CG.pickYear = pickYear;
  CG.rerollOrigin = rerollOrigin;
  CG.adRefreshOrigin = adRefreshOrigin;
  CG.confirmOrigin = confirmOrigin;
  CG.rerollName = rerollName;
  CG.startCareer = startCareer;
  CG.toDifficulty = toDifficulty;
  CG.toConfirm = toConfirm;
  CG.pickDifficulty = pickDifficulty;
  CG.pickStyle = pickStyle;
  CG.pickVow = pickVow;
  CG.toTalents = toTalents;
  CG.buildPlayer = buildPlayer;

  /* 调试入口：查看/重置难度解锁进度（不参与正常玩法）。 */
  CG.diffUnlocks = readDiffUnlock;
  CG.unlockDifficulty = unlockDifficulty;
  CG.resetDiffUnlock = function () {
    try { localStorage.removeItem(DIFF_UNLOCK_KEY); } catch (e) {}
    diffUnlockCache = { easy: true };
    return diffUnlockCache;
  };

  // 通用入口：合并页的卡片走 pickStyle / pickVow，这里保留难度兜底。
  CG.pick = function (id) {
    if (CG.step === 0) {
      if (ERAS.some(e => e.year === Number(id))) pickYear(id);
      else { CG.originRoll = id; window.render && render(); }
    } else if (CG.step === 1) {
      if (STYLES.some(s => s.id === id)) pickStyle(id);
      else if (VOWS.some(v => v.id === id)) pickVow(id);
    } else if (CG.step === 2) {
      if (DIFFICULTIES.some(d => d.id === id)) pickDifficulty(id);
    }
  };


  /* ---------- 选秀夜剧本覆盖：自创球员版（策划文档 04 · M1 简化档） ----------
     M1 先做统一剧本（五档顺位差异化剧本在 M1.5 实现）；
     覆盖 draftLines 全局函数（onclick 内联可解析到 window 上的覆盖）。 */
  const CUSTOM_DRAFT_LINES = [
    '2026年夏，布鲁克林巴克莱中心。',
    '你坐在绿房间的角落。西装是母亲昨夜熨的。',
    '没有一个镜头预设在你的脸上——他们拍的是别的新星。',
    '你攥着裤缝，把那句自白在心里又说了一遍。',
    '「有请本轮第——顺位——」',
    '他们会念出你的名字吗？',
    '点击继续，看看这个世界怎么写你的开头。'
  ];

  /* ---------- custom 主线剧情（6 事件，全原创文案，M1 通用版） ----------
     修复：createCareer 里 campaigns[p.id][0] 对 custom 报错。
     storyReady 对 custom 走通用条件（games 阈值）。 */
  const CUSTOM_CAMPAIGN = [
    { t: '第一堂训练课', b: '你的 locker 上只有号码，没有名字。助教念战术时你听了两遍才敢确认——他说的位置是你的。这里的每一个人都比你想的更快、更壮、更不留情面。', c: [['加练到球馆熄灯', '投射+2 耐久+1 自信+3', { a: { shooting: 2, durability: 1 }, c: 3 }], ['缠着录像师要对手录像', '组织+2 信任+4', { a: { playmaking: 2 }, tr: 4 }], ['什么也不说，先看三天', '心态+4 健康+2', { a: { mentality: 4 }, h: 2 }]] },
    { t: '新秀墙', b: '第二十五场。联盟把你研究透了——你的惯用手、你的启动脚、你接球前的呼吸。数据下滑，质疑开始出现在中文论坛的深夜。', c: [['改技术动作，哪怕赛季报废', '投射+4 自信-4', { a: { shooting: 4 }, c: -4 }], ['用身体硬凿出空间', '终结+3 健康-4', { a: { finishing: 3 }, h: -4 }], ['接受轮换缩短，等待机会', '心态+5 信任+3', { a: { mentality: 5 }, tr: 3 }]] },
    { t: '母语之外的更衣室', b: '队友的笑话你总慢半拍才反应过来。你的翻译在门外，你的家人在地球另一面。今天是客场背靠背的第二晚。', c: [['把孤独写进训练计划', '防守+2 耐久+2', { a: { defense: 2, durability: 2 } }], ['主动约队友吃饭', '信任+6 自信+2', { tr: 6, c: 2 }], ['和家人视频两小时', '心态+6 健康+3', { a: { mentality: 6 }, h: 3 }]] },
    { t: '第一份真正的合同年', b: '经纪人把两份报价放在你面前：一份是家乡球队的天价，一份是这里的底薪留队。没有人能替你选。', c: [['留下，赌一个位置', '自信+8 OVR+1', { c: 8, o: 1 }], ['拿钱回家，没什么可耻的', '心态+5 健康+5', { a: { mentality: 5 }, h: 5 }], ['拖着不签，打完赛季再说', '信任-4 心态+8', { tr: -4, a: { mentality: 8 } }]] },
    { t: '家乡的头条', b: '国内媒体把你的每一分钟上场都做成推送。有人说你是希望，有人说你占着名额。你的名字第一次被这么多人念起。', c: [''].slice(0, 0).concat([['接受采访，说出你的自白', '自信+8 国内声望+10', { c: 8 }], ['沉默，只打球', '心态+4 信任+5', { a: { mentality: 4 }, tr: 5 }], ['把质疑截图存进手机', '心态+2 自信+12', { a: { mentality: 2 }, c: 12 }]]) },
    { t: '无人知晓的名字，无人预写的结局', b: '没有人给你写过结局——这既是自由，也是空旷。你所到的每一步，都是这条世界线的第一次。接下来，你想走到哪里？', c: [['冲击属于自己的荣誉', 'OVR+2 自信+5', { o: 2, c: 5 }], ['成为球队赢球的一块砖', '防守+2 信任+8', { a: { defense: 2 }, tr: 8 }], ['把生涯拉到最长', '耐久+4 健康+8', { a: { durability: 4 }, h: 8 }]] }
  ];
  (function injectCampaign() {
    try {
      // campaigns 是引擎全局 let/const —— 通过函数可见性检查后直接赋值
      // 全局 const campaigns 在严格脚本里可通过全局作用域访问（脚本非模块）
      if (typeof campaigns !== 'undefined' && campaigns) {
        if (!campaigns.custom) campaigns.custom = CUSTOM_CAMPAIGN;
      }
    } catch (e) {
      // 兜底：延迟到 DOM 后重试（引擎加载顺序差异）
      setTimeout(function () { try { if (typeof campaigns !== 'undefined' && campaigns && !campaigns.custom) campaigns.custom = CUSTOM_CAMPAIGN; } catch (e2) {} }, 0);
    }
  })();
  const _origDraftLines = window.draftLines;
  window.draftLines = function (p) {
    if (p && p.id === 'custom') {
      // 五档系统（__DRAFTX__ 由选秀模块提供：顺位计算+档位剧本）；不可用时回退旧占位
      if (window.__DRAFTX__) return window.__DRAFTX__(p);
      return CUSTOM_DRAFT_LINES;
    }
    return _origDraftLines ? _origDraftLines.apply(this, arguments) : CUSTOM_DRAFT_LINES;
  };

  /* ---------- 存档轮询：生涯创建后补挂成长模板 ----------
     引擎函数是词法绑定，window 层拦截无效（函数声明虽挂 window，
     但引擎内部调用优先词法绑定）。改用 localStorage 轮询：
     createCareer 内部 save() 落盘后 1s 内补写 __arch。
     注意：内存中 career 对象不带 __arch，读档（刷新页面）后生效。
     退役报告等消费方一律从存档读取。 */
  (function attachArchPoll() {
    setInterval(function () {
      try {
        if (!CG.pendingArch) return;
        const raw = window.localStorage.getItem('save_bust_no1_v4');
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved.playerId !== 'custom') { CG.pendingArch = null; return; }
        if (saved.__arch) { CG.pendingArch = null; return; }
        saved.__arch = CG.pendingArch;
        saved.domesticFame = CG.pendingArch.fame;
        if (!saved.feed || !saved.feed.length || saved.feed[0].indexOf('选秀夜结束') >= 0) {
          saved.feed = ['机票、护照、一双球鞋。你的名字还没有人认识。'];
        }
        window.localStorage.setItem('save_bust_no1_v4', JSON.stringify(saved));
        CG.pendingArch = null;
      } catch (e) { /* 静默 */ }
    }, 1000);
  })();

})(window);
