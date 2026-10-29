/* ============================================================
 * 189 · 球员随机姓名
 *   - 英译中：虚构英文名 + 中文音译（如「卡梅隆·诺克斯」）
 *   - 中文名：常见姓 + 双字名（如「林浩然」）
 *   - CBA / 体校出身更偏向中文名，其他出身两种混合
 *   - 同一个 seed 会得到同一个名字，旧存档可稳定补名
 * ============================================================ */
(function () {
  'use strict';
  if (window.__v189Names) return;
  window.__v189Names = true;

  /* 虚构英文名 → 中文音译。只使用通用名，不绑定现实球星。 */
  var WESTERN = [
    ['卡梅隆·诺克斯', 'Cameron Knox'],
    ['马利克·里弗斯', 'Malik Rivers'],
    ['杰伦·普莱斯', 'Jaylen Price'],
    ['诺亚·格兰特', 'Noah Grant'],
    ['杰伦·默瑟', 'Jalen Mercer'],
    ['达里厄斯·科尔', 'Darius Cole'],
    ['埃文·克罗斯', 'Evan Cross'],
    ['马库斯·里德', 'Marcus Reed'],
    ['泰勒·斯通', 'Tyler Stone'],
    ['安德烈·海斯', 'Andre Hayes'],
    ['朱利安·布恩', 'Julian Boone'],
    ['梅森·万斯', 'Mason Vance'],
    ['特雷·埃利斯', 'Tre Ellis'],
    ['凯·弗罗斯特', 'Kai Frost'],
    ['德文·纳什', 'Devin Nash'],
    ['以赛亚·奎因', 'Isaiah Quinn'],
    ['科尔·罗兹', 'Cole Rhodes'],
    ['布莱斯·斯莱特', 'Bryce Slater'],
    ['阿马里·沃恩', 'Amari Vaughn'],
    ['利亚姆·福斯特', 'Liam Foster'],
    ['伊桑·布鲁克斯', 'Ethan Brooks'],
    ['洛根·皮尔斯', 'Logan Pierce'],
    ['卢卡斯·贝内特', 'Lucas Bennett'],
    ['加布里埃尔·肖', 'Gabriel Shaw'],
    ['塞缪尔·沃德', 'Samuel Ward'],
    ['亚历山大·科尔', 'Alexander Cole'],
    ['马修·黑尔', 'Matthew Hale'],
    ['凯莱布·罗斯', 'Caleb Ross'],
    ['杰克逊·格雷', 'Jackson Grey'],
    ['欧文·布莱克', 'Owen Blake'],
    ['瑞安·霍尔特', 'Ryan Holt'],
    ['艾登·克罗斯', 'Aiden Cross'],
    ['奥斯汀·里德', 'Austin Reed'],
    ['扎克·迈尔斯', 'Zach Miles'],
    ['内森·弗罗斯特', 'Nathan Frost'],
    ['伊莱亚斯·斯通', 'Elias Stone'],
    ['利奥·万斯', 'Leo Vance'],
    ['迈尔斯·奎因', 'Miles Quinn'],
    ['诺兰·海斯', 'Nolan Hayes'],
    ['帕克·埃利斯', 'Parker Ellis'],
    ['德鲁·默瑟', 'Drew Mercer'],
    ['杰西·罗兹', 'Jesse Rhodes'],
    ['埃利奥特·纳什', 'Elliot Nash'],
    ['哈维·布恩', 'Harvey Boone'],
    ['莫里斯·格兰特', 'Maurice Grant'],
    ['雷吉·科尔', 'Reggie Cole'],
    ['特洛伊·斯莱特', 'Troy Slater'],
    ['科迪·里夫斯', 'Cody Reeves'],
    ['德肖恩·里弗斯', 'Deshawn Rivers'],
    ['泰瑞斯·诺克斯', 'Tyrese Knox'],
    ['多诺万·普莱斯', 'Donovan Price'],
    ['肯德里克·斯通', 'Kendrick Stone'],
    ['韦斯利·海斯', 'Wesley Hayes'],
    ['布雷迪·克罗斯', 'Brady Cross'],
    ['卡森·里德', 'Carson Reed'],
    ['科林·弗罗斯特', 'Colin Frost'],
    ['迪伦·纳什', 'Dylan Nash'],
    ['布莱克·默瑟', 'Blake Mercer'],
    ['乔丹·埃利斯', 'Jordan Ellis'],
    ['迈尔斯·格兰特', 'Myles Grant'],
    ['泽维尔·科尔', 'Xavier Cole'],
    ['特伦斯·肖', 'Terrence Shaw'],
    ['贾马尔·里弗斯', 'Jamal Rivers'],
    ['科里·万斯', 'Corey Vance'],
    ['特伦特·福斯特', 'Trent Foster'],
    ['贾冯·布鲁克斯', 'Javon Brooks']
  ];

  var SURNAMES = ('林陈周王李赵孙吴郑徐胡高何郭马罗梁宋唐许韩冯邓曹彭曾萧田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤').split('');
  var GIVEN = [
    '浩然', '子轩', '宇航', '俊杰', '明轩', '天佑', '嘉豪', '一鸣', '泽宇', '文博',
    '思远', '晨阳', '皓宇', '子墨', '雨辰', '柏霖', '承宇', '奕辰', '睿泽', '景行',
    '志远', '家豪', '俊熙', '子豪', '天磊', '若飞', '云帆', '星宇', '亦辰', '铭轩',
    '弘文', '致远', '泽楷', '子昂', '俊宇', '浩宇', '宇轩', '梓豪', '一航', '锦程',
    '嘉诚', '立轩', '博文', '思源', '晨曦', '昊然', '子健', '俊驰', '天宇', '睿轩',
    '浩铭', '承泽', '景铄', '沐阳', '予安', '知远', '行舟', '修远', '清越', '望舒',
    '星河', '亦航', '云舟', '启明', '子谦', '嘉树', '明远', '予辰', '泽安', '峻熙'
  ];

  function hash(str) {
    var h = 2166136261;
    str = String(str == null ? '' : str);
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0);
  }

  function pick(arr, n) {
    return arr[Math.abs(Number(n) || 0) % arr.length];
  }

  /* seed 为空时真随机；传入 seed 时按 seed 稳定生成，供旧存档补名。 */
  function randomName(origin, seed) {
    var hasSeed = seed !== undefined && seed !== null && String(seed) !== '';
    var n = hasSeed ? hash(String(seed) + '|' + String(origin || '')) : Math.floor(Math.random() * 2147483647);
    var chineseBias = (origin === 'cba' || origin === 'academy') ? 100 : 45;
    var isChinese = (n % 100) < chineseBias;

    if (isChinese) {
      var surname = pick(SURNAMES, hash(n + '-s'));
      var given = pick(GIVEN, hash(n + '-g'));
      var zh = surname + given;
      return { zh: zh, en: zh, kind: 'cn' };
    }

    var pair = pick(WESTERN, hash(n + '-w'));
    return { zh: pair[0], en: pair[1], kind: 'western' };
  }

  window.v189RandomName = randomName;
  window.v189NameDebug = { western: WESTERN.length, surnames: SURNAMES.length, given: GIVEN.length };
})();
