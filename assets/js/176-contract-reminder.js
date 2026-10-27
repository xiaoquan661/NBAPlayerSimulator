
/* ============================================================
 * 合同到期 / 提前续约提醒
 *   - 合同最后一年：赛季页顶部出现一次提醒
 *   - 底薪、10 天短合同转正、新秀合同、续约合同分别说明
 *   - 球队愿意时可以直接谈提前续约
 * ============================================================ */
(function () {
  'use strict';
  if (window.__contractReminder176) return;
  window.__contractReminder176 = true;

  function teamName(abbr) {
    try { return teamBy(abbr).name || abbr; } catch (e) { return abbr || ''; }
  }

  function contractKind(exception) {
    if (exception === 'ten-day-converted') return '10 天短合同转正';
    if (exception === 'minimum') return '底薪合同';
    if (exception === 'rookie') return '新秀合同';
    if (exception === 'renewal') return '续约合同';
    return '标准合同';
  }

  function extensionOffers() {
    var out = [];
    (career && career.offers || []).forEach(function (o, i) {
      if (o && o.type === 'EXT' && o.team === career.team) out.push({ i: i, team: o.team, years: o.years, salary: o.salary });
    });
    return out;
  }

  function canTalk() {
    if (!career || !career.contract) return false;
    if (extensionOffers().length > 0) return true;
    /* 和 requestRenewal 的判定保持一致，避免“球队愿意谈”却没有按钮。 */
    var score = (Number(career.ovr) || 0)
      + (Number(career.trust) || 0) * 0.12
      + (Number(career.health) || 0) * 0.04
      - (Number(career.age) || 0) * 0.12;
    var need = 82 + (Number(career.contract.years) > 2 ? 7 : 0);
    return score >= need;
  }

  function explain(exception) {
    if (exception === 'ten-day-converted') {
      return '这份合同来自 10 天短合同转正，只有一年保障。赛季结束后，你需要重新签约才能继续留队。';
    }
    if (exception === 'minimum') {
      return '这是一份一年底薪合同。赛季结束后，球队没有义务自动续约。';
    }
    return '这份合同只剩最后一年。赛季结束后，你需要重新签约才能进入下一季。';
  }

  function alertHtml() {
    if (!career || !career.contract || career.retired) return '';
    var ct = career.contract;
    var years = Number(ct.years) || 0;
    var talk = canTalk();
    var ext = extensionOffers();
    /* 最后一年必提醒；还剩两年时，只在球队愿意提前续约时提醒。 */
    if (years !== 1 && !(years === 2 && talk)) return '';
    if (career.stage === 'offseason' || career.stage === 'retired' || career.stage === 'summer') return '';
    if (career.contractAlertDismissed === career.seasonNo) return '';
    var kind = contractKind(ct.exception);
    var finalYear = years === 1;
    var note = finalYear
      ? explain(ct.exception) + (talk ? '球队目前愿意谈提前续约。' : '以你现在的表现，球队还没有给出提前续约的意向。')
      : '这份合同还剩两年。球队愿意现在谈提前续约。';
    var action = ext.length
      ? '<button class="v176-primary" onclick="v176ContractTalk()">查看续约报价</button>'
      : (talk ? '<button class="v176-primary" onclick="v176ContractTalk()">谈提前续约</button>' : '');
    return '<section class="v176-contract-alert">'
      + '<div class="v176-ca-top"><div><small>合同提醒</small><b>' + (finalYear ? '最后一年' : '还剩两年') + '</b></div><span>' + kind + '</span></div>'
      + '<p>' + note + '</p>'
      + '<div class="v176-ca-meta">'
      + '<span>剩余 ' + ct.years + ' 年</span>'
      + '<span>年薪 ' + (Number(ct.salary) || 0) + 'M</span>'
      + '<span>' + teamName(career.team) + '</span>'
      + '</div>'
      + '<div class="v176-ca-actions">' + action
      + '<button class="v176-secondary" onclick="v176DismissContract()">赛季结束后再说</button></div>'
      + '</section>';
  }

  function inject(h) {
    try {
      var alert = alertHtml();
      if (!alert) return h;
      var anchors = [
        '<section class="wire-season">',
        '<section class="v26-statbox">',
        '<button class="btn primary off-next"'
      ];
      for (var i = 0; i < anchors.length; i++) {
        if (h.indexOf(anchors[i]) >= 0) return h.replace(anchors[i], alert + anchors[i]);
      }
      return h + alert;
    } catch (e) { return h; }
  }

  var prevSeasonView = seasonView;
  seasonView = function () {
    return inject(prevSeasonView.apply(this, arguments));
  };

  window.v176DismissContract = function () {
    if (!career) return;
    career.contractAlertDismissed = career.seasonNo;
    try { save(); } catch (e) {}
    try { render(); } catch (e) {}
  };

  window.v176ContractTalk = function () {
    if (!career) return;
    var ext = extensionOffers();
    if (!ext.length) {
      try { requestRenewal(); } catch (e) {}
      ext = extensionOffers();
    }
    if (!ext.length) {
      try { notify('球队暂时没有提前续约的意向。'); } catch (e) {}
      return;
    }
    ui.modal = { kind: 'contractExtend', data: { offers: ext } };
    try { render(); } catch (e) {}
  };

  window.v176AcceptExtension = function (i) {
    if (!career || !career.offers) return;
    var offers = career.offers;
    var o = offers[i];
    if (!o || o.type !== 'EXT') {
      i = offers.findIndex(function (x) { return x && x.type === 'EXT'; });
      o = offers[i];
    }
    if (!o) return;
    ui.modal = null;
    var ok = true;
    try { ok = acceptOffer(i); } catch (e) { ok = false; }
    if (ok !== false && career.contract && career.contract.years === o.years && career.contract.salary === o.salary) {
      try { notify('已签下 ' + o.years + ' 年续约合同。'); } catch (e) {}
    }
  };

  var prevOverlay = renderOverlay;
  renderOverlay = function () {
    if (ui.modal && ui.modal.kind === 'contractExtend') {
      var d = ui.modal.data || {};
      var rows = (d.offers || []).map(function (o) {
        return '<button class="choice" onclick="v176AcceptExtension(' + o.i + ')">'
          + '<b>' + teamName(o.team) + ' · 提前续约</b>'
          + '<span>' + o.years + ' 年 · ' + o.salary + 'M/年</span>'
          + '</button>';
      }).join('');
      return '<div class="overlay"><div class="sheet"><div class="sheet-handle"></div>'
        + '<div class="v176-ext"><small>提前续约</small><h2>球队愿意继续合作</h2>'
        + '<p>这份报价会从下赛季开始执行，当前赛季不会中断。</p>'
        + '<div class="choice-list">' + rows + '</div>'
        + '<button class="btn secondary" style="width:100%;margin-top:9px" onclick="ui.modal=null;render()">暂不续约</button>'
        + '</div></div></div>';
    }
    return prevOverlay.apply(this, arguments);
  };

  var css = document.createElement('style');
  css.textContent = [
    '.v176-contract-alert{margin:0 0 14px;padding:15px 16px;border:1px solid #4a3b1c;border-radius:18px;background:linear-gradient(145deg,#241f14,#1b1a17);color:#f3e9d2}',
    '.v176-ca-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}',
    '.v176-ca-top small{display:block;color:#ffd23f;font-size:9px;letter-spacing:2px}',
    '.v176-ca-top b{display:block;color:#fff;font-size:19px;margin-top:4px}',
    '.v176-ca-top>span{flex:none;border:1px solid #5a4a24;border-radius:9px;padding:4px 7px;color:#ffd98a;font-size:10px;font-weight:800}',
    '.v176-contract-alert p{margin:9px 0;color:#c9d1dc;font-size:12px;line-height:1.7}',
    '.v176-ca-meta{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0 12px}',
    '.v176-ca-meta span{border-radius:8px;background:#2b2a24;border:1px solid #3a382e;padding:5px 8px;color:#d8d1c0;font-size:10px}',
    '.v176-ca-actions{display:flex;gap:8px;flex-wrap:wrap}',
    '.v176-ca-actions button{flex:1;min-width:120px;border-radius:11px;padding:10px 12px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer}',
    '.v176-primary{border:0;background:#ffd23f;color:#101318}',
    '.v176-secondary{border:1px solid #4a4750;background:#24262d;color:#e8ecf1}',
    '.v176-ext h2{font-size:20px;margin:6px 0}.v176-ext p{font-size:11px;line-height:1.7;color:#9aa3b2}',
    '.v176-ext>small{font-size:9px;color:#ffd23f;letter-spacing:2px}'
  ].join('');
  document.head.appendChild(css);
})();
