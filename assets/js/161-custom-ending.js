/* ============================================================
 * 自建球员结局章：名字的回声
 * 1. 按生涯数据判定结局类型（传奇 / 无冕 / 旗帜 / 归来 / 流星 / 流浪 / 长青 / 未竟 / 角色）
 * 2. 退役页顶部插入结局正文 +「如果当初」
 * 3. 退役页底部插入「下半场」四选一 + 名字的回声
 * 只对 career.playerId === 'custom' 生效。
 * ============================================================ */
(function () {
  'use strict';
  if (window.__customEndingPatched) return;

  function n(v) { v = Number(v); return isFinite(v) ? v : 0; }

  function flagOf(c, key) {
    try {
      if (!c) return '';
      if (c.storyFlags && c.storyFlags['cs_' + key]) return String(c.storyFlags['cs_' + key]);
      if (c.customStory && c.customStory.flags && c.customStory.flags[key]) return String(c.customStory.flags[key]);
    } catch (e) {}
    return '';
  }

  function branchOf(c) {
    return {
      proveRole: flagOf(c, 'prove_role'),
      proveWall: flagOf(c, 'prove_wall'),
      proveClutch: flagOf(c, 'prove_clutch'),
      becomeWay: flagOf(c, 'become_way'),
      becomeContract: flagOf(c, 'become_contract'),
      becomeRoom: flagOf(c, 'become_room'),
      becomeImage: flagOf(c, 'become_image'),
      becomeBody: flagOf(c, 'become_body'),
      becomeTeam: flagOf(c, 'become_team'),
      legacy: flagOf(c, 'legacy'),
      leaveBody: flagOf(c, 'leave_body'),
      leaveEnd: flagOf(c, 'leave_end')
    };
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function teamName(abbr) {
    try { return (typeof teamBy === 'function' && teamBy(abbr).name) || abbr || '这支球队'; }
    catch (e) { return abbr || '这支球队'; }
  }

  function fmtInt(v) {
    v = Math.round(n(v));
    try { return v.toLocaleString(); } catch (e) { return String(v); }
  }

  function countTeams(c) {
    var map = {}, max = 0;
    function add(ab) {
      if (!ab) return;
      map[ab] = (map[ab] || 0) + 1;
      if (map[ab] > max) max = map[ab];
    }
    (c.history || []).forEach(function (x) { add(x && x.team); });
    (c.tradeHistory || []).forEach(function (x) { if (x) { if (x.from) map[x.from] = map[x.from] || 0; if (x.to) map[x.to] = map[x.to] || 0; } });
    if (c.team) map[c.team] = map[c.team] || 0;
    return { count: Object.keys(map).length, max: max };
  }

  function metrics(c) {
    var t = c.careerTotals || {}, h = c.honors || {}, r = c.records || {};
    var teams = countTeams(c);
    var reason = String(c.retireReason || '');
    return {
      seasons: n(t.seasons) || n(c.seasonNo) || 1,
      games: n(t.games) || n(c.seasonStats && c.seasonStats.gp) || 0,
      points: n(t.points),
      peak: n(r.bestOvr) || n(c.ovr),
      fame: n(c.domesticFame),
      allstar: n(h['全明星']),
      allnba: n(h['最佳阵容']),
      alldef: n(h['最佳防阵']),
      mvp: n(h['MVP']),
      fmvp: n(h['FMVP']),
      rings: n(h['总冠军']),
      dpoy: n(h['DPOY']),
      roy: n(h['最佳新秀']),
      mip: n(h['MIP']),
      scoring: n(h['得分王']) + n(h['篮板王']) + n(h['助攻王']) + n(h['抢断王']) + n(h['盖帽王']),
      teams: teams.count,
      oneTeamSeasons: teams.max,
      trust: n(c.trust),
      age: n(c.age),
      injury: !!(c.__hadMajorInjury || /伤|病|报销|健康|膝|脚|背|踝/.test(reason)),
      vow: c.vow || (c.__arch && c.__arch.vow) || '',
      origin: (c.__arch && c.__arch.origin) || '',
      year: n(c.draftYear) || n(c.__arch && c.__arch.year),
      branch: branchOf(c)
    };
  }

  /* 结局权重：荣誉 + 巅峰 + 生涯长度 + 故事兑现。
     分数只用于分档，不直接展示，避免把生涯变成一道算术题。 */
  function scoreOf(m) {
    var honor = m.mvp * 12 + m.fmvp * 9 + m.rings * 4 + m.dpoy * 7 +
      m.allnba * 3 + m.alldef * 1.2 + m.allstar * 1.6 + m.roy * 1.5 +
      m.mip * 0.8 + m.scoring * 1.5;
    var peak = Math.max(0, m.peak - 70) * 1.1;
    var length = m.seasons * 1.7 + Math.min(m.games, 1100) / 120;
    var b = m.branch || {};
    var branch = (b.legacy === 'one_team' ? 1.3 : 0) +
      (b.legacy === 'path' ? 0.9 : 0) +
      (b.becomeRoom === 'captain' ? 0.7 : 0) +
      (b.becomeWay === 'mentor' ? 0.6 : 0) +
      (b.leaveEnd === 'tour' ? 0.8 : 0) +
      (b.proveRole === 'stopper' && m.alldef > 0 ? 0.5 : 0);
    var story = m.fame / 12 + (m.vow ? 1.2 : 0) + (m.injury ? 1.5 : 0) +
      (m.oneTeamSeasons >= 6 ? 2.2 : 0) + (m.teams <= 1 ? 1 : 0) +
      (m.trust >= 75 ? 1 : 0) + branch;
    return { honor: honor, peak: peak, length: length, story: story, total: honor + peak + length + story };
  }

  function typeOf(m) {
    if (m.games <= 0 || m.seasons <= 0) return 'unfinished';
    var b = m.branch || {};
    var s = scoreOf(m);
    var legend = m.mvp >= 1 || m.fmvp >= 1 ||
      (m.rings >= 2 && (m.allstar >= 2 || m.allnba >= 1)) ||
      s.honor >= 24;
    if (legend) return 'legend';
    if (m.rings === 0 && m.peak >= 86 && s.total >= 37 && (m.allstar >= 2 || m.allnba >= 1)) return 'ringless';
    if (m.rings === 0 && m.peak >= 84 && b.legacy === 'ring' && s.total >= 32 && (m.allstar >= 1 || m.allnba >= 1)) return 'ringless';
    /* 只打了一两年就离开：无论峰值多高，都先算「提前离场」。 */
    if (m.seasons <= 2 || (m.age <= 22 && m.seasons <= 3)) return 'unfinished';
    if (m.peak >= 86 && m.seasons <= 4 && s.total >= 25) return 'meteor';
    /* 没有兑现出高峰、又很早就离开的生涯 → 专门的「未竟 / 提前离场」。 */
    if (m.seasons <= 3 && (m.age <= 26 || m.games < 140)) return 'unfinished';
    /* 三幕选择会把某些生涯推向不同的结局。 */
    if (b.legacy === 'one_team' && m.oneTeamSeasons >= 8) return 'franchise';
    if (b.legacy === 'path' && m.fame >= 50) return 'franchise';
    if (b.leaveEnd === 'tour' && m.seasons >= 9 && s.total >= 24) return 'franchise';
    if (b.proveRole === 'stopper' && m.alldef >= 2 && s.total >= 24) return 'franchise';
    if (b.becomeRoom === 'mentor' && m.seasons >= 9 && m.allstar === 0) return 'ironman';
    /* 长青：没有个人荣誉，但把生涯拉得很长。 */
    if (m.seasons >= 10 && m.games >= 600 && m.allstar === 0 && m.allnba === 0) return 'ironman';
    /* 伤病归来优先于普通旗帜，因为故事本身就是这段生涯的主线。 */
    if (m.injury && m.seasons >= 3 && s.total >= 22 && m.mvp === 0) return 'returner';
    if (s.total >= 30 || m.allstar >= 1 || m.allnba >= 1) return 'franchise';
    if (m.teams >= 5 && m.seasons >= 5) return 'journeyman';
    if (m.seasons <= 2 || m.games < 100) return 'unfinished';
    return 'role';
  }

  function copyFor(type, m, c) {
    var team = teamName(c.team);
    var honor = [];
    if (m.mvp) honor.push('MVP');
    if (m.fmvp) honor.push('FMVP');
    if (m.rings) honor.push(m.rings + ' 座总冠军');
    if (m.dpoy) honor.push('DPOY');
    var honorLine = honor.length ? '你的荣誉柜里放着 ' + honor.join('、') + '。' : '';

    if (type === 'legend') {
      return {
        tag: '传奇结局',
        title: '门被你推开了',
        paragraphs: [
          '你退役那年，联盟发了一条很短的声明。没有形容词，只写了你的名字、选中你的年份，和一句：他改变过这支球队。',
          '很多年后，人们再讨论那个年代，会把你的名字和那些你曾经只能在电视里看的名字放在一起。你不再是「下一个谁」，你成了别人口中的「上一个」。' + honorLine,
          m.rings > 0
            ? '你走的时候，球馆的灯没有全灭。有人留下来，把你的球衣挂了上去。'
            : '你走的时候，没有冠军游行。但球馆门口那块写着「MVP」的旧海报，一直没有被撕掉。'
        ]
      };
    }
    if (type === 'ringless') {
      return {
        tag: '无冕结局',
        title: '数据记得你，戒指没有',
        paragraphs: [
          '你退役那年，联盟得分榜上还留着你的名字。没有冠军，没有游行，只有一条条被人反复调出来的比赛录像。',
          '有人说你生错了年代，有人说你差一个队友。你自己知道，你已经把能做的都做了。' + honorLine,
          '后来每次有人提起那几年的季后赛，总会有人说：如果当时那支球队再多一个人……话没说完，他们就想起了你。'
        ]
      };
    }
    if (type === 'franchise') {
      return {
        tag: '旗帜结局',
        title: '这座城市会记得你',
        paragraphs: [
          '你在' + team + '打了 ' + m.seasons + ' 个赛季。你来的那年，球馆上座率不高；你走的那年，季票要排队。',
          (m.allstar >= 1 ? '你进过 ' + m.allstar + ' 次全明星。' : '') + '你没有拿过 MVP，也没有被写进历史前十。但球馆门口卖热狗的人认识你，安保认识你，场边那个每场都举牌的孩子认识你。',
          '退役仪式上，球队送给你一件裱起来的球衣。你摸了摸上面的号码，想起第一次穿上它时，它还有点大。'
        ]
      };
    }
    if (type === 'returner') {
      return {
        tag: '归来结局',
        title: '医生说不能再打了，你打了',
        paragraphs: [
          '那次伤病之后，所有人都以为你的生涯结束了。包括你自己，在某个凌晨三点。',
          '但你又回来了。不是以原来的样子，是以一个更慢、更聪明、更知道每一次上场都可能是最后一次的样子。',
          '你退役时，队医和你握手，说：你是我见过最不听话的球员。你笑了，因为你知道那是他能给的最高的评价。'
        ]
      };
    }
    if (type === 'meteor') {
      return {
        tag: '流星结局',
        title: '你亮过，很短',
        paragraphs: [
          '你最好的那个赛季，像一场停电前的灯光。很短，但所有人都在那几秒里看清了你的脸。',
          '如果生涯可以重来，你也许会少跳一次，少冲一次，少在训练后加练那一组。但那样的话，你就不是你了。',
          '很多年后，有人在网上发了一段你的集锦。标题是：还有人记得他吗？下面第一条评论是：记得。'
        ]
      };
    }
    if (type === 'journeyman') {
      return {
        tag: '流浪结局',
        title: '你穿过太多件球衣',
        paragraphs: [
          '你效力过 ' + m.teams + ' 支球队。每到一座城市，你都要重新记住更衣室的位置、队友的名字和教练的战术板。',
          '你没有在任何一座城市退役球衣，但每座城市的球迷都记得你打过一年。你不是谁的旗帜，你是很多支球队的一段路。',
          '退役那天，你收拾柜子，发现里面有一半的东西不属于这支球队。你把它们装进箱子，像搬了很多次家之后再搬一次。'
        ]
      };
    }
    if (type === 'ironman') {
      return {
        tag: '长青结局',
        title: '你没有成为海报，你成了地板',
        paragraphs: [
          '你打了 ' + m.seasons + ' 个赛季，' + m.games + ' 场比赛。没有 MVP，没有得分王，甚至没有几次上头条。',
          '但教练换了一茬又一茬，战术从内线打到三分，只有你的更衣柜一直没动。你成了那支球队里唯一不变的东西。',
          '退役后，球队给你发了一张终身通行证。你偶尔回球馆，坐在最后一排，看那些年轻人跑你跑过的战术。'
        ]
      };
    }
    if (type === 'unfinished') {
      if (m.age && m.age <= 26 && m.seasons <= 3) {
        return {
          tag: '提前离场',
          title: '你走得太早了',
          paragraphs: [
            '你离开联盟那年，才 ' + m.age + ' 岁。只打了 ' + m.seasons + ' 个赛季，' + m.games + ' 场比赛。',
            '没有伤病发布会，没有告别巡演。你只是某一天没有再出现在训练馆，名单上你的名字被一行更年轻的名字替代。',
            '后来有人问起你，队友会说：他其实还能打。只是那个“其实”，再也没有机会被证明。'
          ]
        };
      }
      return {
        tag: '未竟结局',
        title: '那几页你翻得很慢',
        paragraphs: [
          '你的 NBA 生涯只有 ' + m.seasons + ' 个赛季，' + m.games + ' 场比赛。短到很多人还没来得及记住你的名字。',
          '但你记得每一次上场。记得第一次触球，第一次得分，第一次在客场听见有人喊你的名字。',
          '你不是没有努力过。你只是没有来得及。退役那天，你把球鞋擦干净，放进柜子，没有说再见。'
        ]
      };
    }
    return {
      tag: '生涯结局',
      title: '你确实来过',
      paragraphs: [
        '你没有成为巨星。大多数夜晚，你的名字出现在技术统计的最后几行。',
        '但你防过对面最好的球员，抢过关键篮板，投进过让主场站起来的三分。那些回合不会进集锦，但比赛需要它们。',
        '退役后，你回到普通生活。偶尔有人认出你，说：你是不是以前打过 NBA？你点点头，说：打过几年。'
      ]
    };
  }

  function branchReflect(m) {
    var b = m.branch || {};
    var out = [];
    if (b.legacy === 'one_team') out.push('你最后选择留在一座城市。不是因为没有别的报价，而是因为你想让一件球衣从头到尾都属于同一个人。');
    else if (b.legacy === 'ring') out.push('你把冠军放在第一位。你换过球队、换过角色，也接受过别人不理解的目光。');
    else if (b.legacy === 'path') out.push('你留下了一条路。后来的人不一定记得你的数据，但会记得你替他们推开过哪扇门。');
    if (b.becomeRoom === 'captain') out.push('你当过更衣室里的那个声音。赢球时你站在后面，输球时你站在前面。');
    else if (b.becomeWay === 'mentor') out.push('你把球交出去过。那不是退让，是你决定让更多人参与这场球。');
    else if (b.becomeWay === 'team') out.push('你为球队改过打法。有些夜晚你打得不舒服，但球队赢了。');
    else if (b.becomeWay === 'self') out.push('你坚持按自己的方式打。有人叫它固执，你叫它活着。');
    if (b.proveRole === 'stopper') out.push('你从防守开始。那些没有进集锦的回合，才是你真正站稳的地方。');
    else if (b.proveRole === 'scorer') out.push('你从要球开始。你相信解决问题的最好方式，是把球放进篮筐。');
    else if (b.proveRole === 'learner') out.push('你从提问开始。你一直记得自己是怎么活下来的。');
    if (b.becomeContract === 'money') out.push('你拿过最大的合同，也为此换过城市。你从不假装钱不重要。');
    else if (b.becomeContract === 'stay') out.push('你留下过。那份合同不一定最贵，但那是你自己签下的。');
    if (b.leaveEnd === 'tour') out.push('你办过告别巡演。每座城市都有人站起来，哪怕他们只记得你打过一场好球。');
    else if (b.leaveEnd === 'quiet') out.push('你安静地走了。没有巡演，没有发布会，只有一间清空的更衣柜。');
    else if (b.leaveEnd === 'handover') out.push('你把位置交给了年轻人。你离开时，球队没有因此停下来。');
    return out.slice(0, 2).join(' ');
  }

  function originReflect(c, m) {
    var base = {
      ncaa: '如果那年你没有留在大学打完最后一个赛季，而是提前进入职业联赛，你可能会在另一个体系里打完另一个十年。',
      cba: '如果那年总决赛结束后，你没有直接飞去纽约，你可能会留在五棵松，成为另一支球队的旗帜。',
      academy: '如果体校没有放你走，你可能会在省队打到退役，然后成为一名教练。',
      undrafted: '如果那个夏天你没有接下那张十天合同，你可能会在某个业余联赛里，慢慢忘记自己曾经离 NBA 那么近。',
      prep: '如果那场全美直播之后你选择留在预科再打一年，你可能会成为大学篮球最响的名字，也可能永远错过这扇门。',
      euro: '如果那年你没有付那笔买断费，你可能会在欧洲打完整个职业生涯，成为另一座城市的老队长。',
      nbl: '如果那年你接受了 NBL 的门面合同，你可能会在南半球成为联赛的脸，而不是在这里被别人介绍。',
      gleague: '如果那个凌晨你没有坐上发展联盟的大巴，你可能会在另一条路上，更早地承认自己打不了 NBA。'
    }[m.origin] || '如果那年你没有坐上那趟飞机，你可能会过上另一种安稳的生活。';
    var tail = m.games > 0
      ? '但你还是走进了那扇门。所以现在，你的名字留在了这里。'
      : '但你还是走进了那扇门。所以哪怕只有几页，那也是你自己写的。';
    return base + ' ' + tail;
  }

  var AFTERLIFE = [
    {
      id: 'youth', label: '回家乡，做青训', desc: '把名字留在水泥球场的篮板上',
      when: function () { return true; },
      text: '你回到家乡，接手了一块旧球场。第一批孩子里，有一个瘦得像根竹竿。你教他投篮，也教他系鞋带。很多年后，他站在选秀大会的绿房间里，手机里是你发来的短信：别紧张。'
    },
    {
      id: 'coach', label: '留在球队，做教练', desc: '从场边继续看比赛',
      when: function (m) { return m.seasons >= 4 || m.trust >= 60; },
      lock: '需要至少 4 个赛季，或更高的教练信任',
      text: '你留在了球队，从助教做起。你站在场边，看着另一个年轻人在最后时刻要球。你突然理解了你当年的教练，也原谅了他。'
    },
    {
      id: 'media', label: '做解说 / 内容', desc: '用另一种方式念出名字',
      when: function (m) { return m.fame >= 35; },
      lock: '需要更高的影响力',
      text: '你坐进演播室，开始解说。每次念到那些远道而来的新秀，你都会停半秒。搭档问你为什么，你说：没什么，想起一个人。'
    },
    {
      id: 'leave', label: '彻底离开篮球', desc: '把球鞋收进柜子',
      when: function () { return true; },
      text: '你把球鞋收进柜子，再也没有打开。偶尔路过球场，你会停下来看一会儿，但不再下场。你开始过一种没有比赛日的生活，发现日子也可以很长。'
    }
  ];

  function chosenAfterlife(c) {
    for (var i = 0; i < AFTERLIFE.length; i++) {
      if (AFTERLIFE[i].id === c.afterlife) return AFTERLIFE[i];
    }
    return null;
  }

  function echoFor(type, m) {
    var hof = m.mvp >= 1 || m.fmvp >= 1 || m.rings >= 2 || (m.allstar >= 5 && m.peak >= 88);
    if (hof) return '名人堂的铭牌上，你的名字和那些改变过比赛的人并排。旁边没有写你来自哪里，只写着你留下过什么。';
    var jersey = (type === 'franchise' || type === 'legend' || type === 'ironman') && m.oneTeamSeasons >= 6;
    if (jersey) return '球馆穹顶多了一件球衣。号码下面，写着你的名字。';
    if (m.fame >= 60) return '家乡的孩子在野球场喊你的名字。他们没见过你打球，只知道那个名字代表过一种可能。';
    if (m.fame >= 25) return '偶尔有人在评论区提起你的名字，下面会有人说：我记得他。';
    if (m.seasons <= 2 || m.games < 100) return '没有多少人记得你的名字。但你自己记得。';
    return '很多年后，有人在旧录像里看见你，问：这是谁？旁边的人说：一个打过 NBA 的人。';
  }

  function renderTop(c, m, type) {
    var copy = copyFor(type, m, c);
    var paras = copy.paragraphs.filter(Boolean).map(function (p) {
      return '<p>' + esc(p) + '</p>';
    }).join('');
    var branch = branchReflect(m);
    if (branch) paras += '<p>' + esc(branch) + '</p>';
    return '<section class="ending-top">'
      + '<small class="ending-kicker">生涯结局</small>'
      + '<div class="ending-tag">' + esc(copy.tag) + '</div>'
      + '<h2 class="ending-title">「' + esc(copy.title) + '」</h2>'
      + '<div class="ending-text">' + paras + '</div>'
      + '<div class="ending-reflect"><b>如果当初</b>' + esc(originReflect(c, m)) + '</div>'
      + '</section>';
  }

  function renderBottom(c, m, type) {
    var chosen = chosenAfterlife(c);
    if (chosen) {
      return '<section class="afterlife">'
        + '<h3>下半场 · ' + esc(chosen.label) + '</h3>'
        + '<div class="afterlife-text"><p>' + esc(chosen.text) + '</p></div>'
        + '<div class="ending-echo"><b>名字的回声</b><br>' + esc(echoFor(type, m)) + '</div>'
        + '</section>';
    }
    var cards = AFTERLIFE.map(function (a) {
      var ok = a.when(m);
      return '<button class="afterlife-card' + (ok ? '' : ' locked') + '" '
        + (ok ? 'onclick="__ENDING__.choose(\'' + a.id + '\')"' : 'disabled')
        + '><b>' + esc(a.label) + (ok ? '' : ' · 未解锁') + '</b>'
        + '<span>' + esc(ok ? a.desc : (a.lock || '尚未解锁')) + '</span></button>';
    }).join('');
    return '<section class="afterlife">'
      + '<h3>下半场</h3>'
      + '<p>篮球结束了，但人生还有下半场。选一条路，写进这份存档。选择后不可更改。</p>'
      + '<div class="afterlife-grid">' + cards + '</div>'
      + '</section>';
  }

  function choose(id) {
    if (typeof career === 'undefined' || !career || career.playerId !== 'custom') return;
    var m = metrics(career);
    var pick = null;
    for (var i = 0; i < AFTERLIFE.length; i++) {
      if (AFTERLIFE[i].id === id) pick = AFTERLIFE[i];
    }
    if (!pick || !pick.when(m) || career.afterlife) return;
    career.afterlife = id;
    try { save(); } catch (e) {}
    try { render(); } catch (e) {}
  }

  try {
    var prev = renderRetired;
    renderRetired = function () {
      var h = prev.apply(this, arguments);
      try {
        if (typeof h !== 'string') return h;
        if (typeof career === 'undefined' || !career || career.playerId !== 'custom' || !career.retired) return h;
        var m = metrics(career);
        var type = typeOf(m);
        var top = renderTop(career, m, type);
        var bottom = renderBottom(career, m, type);

        var anchor = h.indexOf('<section class="retired">');
        var h1 = h.indexOf('</h1>', anchor >= 0 ? anchor : 0);
        if (h1 >= 0) {
          h = h.slice(0, h1 + 5) + top + h.slice(h1 + 5);
        } else if (anchor >= 0) {
          var at = anchor + '<section class="retired">'.length;
          h = h.slice(0, at) + top + h.slice(at);
        }

        var j = h.indexOf('<div class="final-grid">');
        if (j >= 0) h = h.slice(0, j) + bottom + h.slice(j);
        else h += bottom;
        return h;
      } catch (e) { return h; }
    };
    window.__customEndingPatched = true;
    window.__ENDING__ = { choose: choose, type: function () { return typeOf(metrics(career)); }, metrics: function () { return metrics(career); }, classify: typeOf, score: scoreOf, copy: copyFor };
  } catch (e) {}
})();
