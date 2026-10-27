
/* ============================================================
 * 2026+ 英文虚拟名
 * 1) v156Names.identity 对 draft:2026+ 走英文生成器
 * 2) 旧档 2026plus 联盟里的中文虚拟名迁移为英文
 * ============================================================ */
(function () {
  'use strict';

  function hash(text) {
    let h = 2166136261;
    for (const c of String(text)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
    h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // 让 chineseName 放过 2026+ 的英文虚拟名：不再转写成中文
  window.__v180KeepEnglish = function (name, key) {
    try {
      const text = String(name || '');
      if (!text || !/[A-Za-z]/.test(text) || /[一-龥]/.test(text)) return false;
      if (typeof career !== 'undefined' && career && career.v32League && career.v32League.eraKey === '2026plus') return true;
      const probe = String(key || '') + ' ' + text;
      const m = probe.match(/draft[:\-\s]?(\d{4})/i);
      if (m && Number(m[1]) >= 2026) return true;
      if (/^reserve/i.test(String(key || ''))) return true;
    } catch (e) {}
    return false;
  };

  try {
    if (window.v156Names && window.v180EnglishName && !window.__v180NamesOverride) {
      const oldIdentity = window.v156Names.identity;
      window.v156Names.identity = function (key) {
        const text = String(key || '');
        /* draft:2026:12 / reserve:2026:ATL:0:1 / draft-2026-... 都走英文生成器。
           2026+ 的联盟不再生成中文音译名。 */
        const m = text.match(/^(?:draft|reserve)[:\-](\d{4})/i);
        if (m && Number(m[1]) >= 2026) {
          const year = Number(m[1]);
          const id = text.toLowerCase().replace(/[^a-z0-9]/g, '');
          let c = null;
          try { c = (typeof career !== 'undefined') ? career : null; } catch (e) {}
          const registry = c ? (c.v156Names || (c.v156Names = {})) : null;
          if (registry && registry[id]) {
            const held = String(registry[id].name || '');
            if (/[A-Za-z]/.test(held) && !/[一-龥]/.test(held)) return registry[id];
            /* 旧版生成的中文音译名就地覆盖，避免 apply() 再次写回中文 */
          }
          const used = {};
          if (registry) for (const v of Object.values(registry)) if (v && v.name && !/[一-龥]/.test(String(v.name))) used[v.name] = 1;
          try {
            const lists = [c && c.v32League && c.v32League.players, c && c.v129 && c.v129.players, c && c.v129 && c.v129.retired];
            for (const arr of lists) if (Array.isArray(arr)) for (const p of arr) if (p && p.name && !/[一-龥]/.test(String(p.name))) used[p.name] = 1;
          } catch (e) {}
          const name = window.v180EnglishName(year, hash(id) % 997, used);
          const result = { name: name, country: '美国', countryCode: 'US' };
          if (registry) registry[id] = result;
          return result;
        }
        return oldIdentity.apply(this, arguments);
      };
      /* identity 是 IIFE 内的词法函数，apply 调的是闭包里的 identity，
         所以同时接管 apply：2026+ 的 draft/reserve 身份直接写英文名。 */
      const oldApply = window.v156Names.apply;
      window.v156Names.apply = function (p) {
        try {
          const key = String((p && (p.realName || p.id)) || '');
          const m = key.match(/^(?:draft|reserve)[:\-](\d{4})/i);
          if (m && Number(m[1]) >= 2026) {
            const x = window.v156Names.identity(key);
            if (x && /[A-Za-z]/.test(String(x.name || ''))) {
              p.name = x.name;
              p.country = x.country || '美国';
              p.countryCode = x.countryCode || 'US';
              p.v156Name = 156;
              return p;
            }
          }
        } catch (e) {}
        return oldApply.apply(this, arguments);
      };
      window.__v180NamesOverride = true;
    }
  } catch (e) {}

  function migrateEnglishNames(c) {
    if (!c || c.playerId !== 'custom') return;
    if (!c.v32League || c.v32League.eraKey !== '2026plus') return;
    let me = '';
    try { me = (typeof currentP === 'function' && currentP()) ? currentP().zh : ''; } catch (e) {}
    const needs = c.v32League.players.some(p => p && p.id !== 'custom' && p.name !== me && /[一-龥]/.test(String(p.name || '')));
    if (c.v180EnglishNames && !needs) return;
    const used = {};
    if (me) used[me] = 1;
    const year = Number(c.draftYear) || 2026;
    const arrays = [c.v32League.players, c.v129 && c.v129.players, c.v129 && c.v129.retired];
    let changed = false;
    for (const arr of arrays) {
      if (!Array.isArray(arr)) continue;
      for (const p of arr) {
        if (!p || p.id === 'custom' || (me && p.name === me)) continue;
        if (!/[一-龥]/.test(String(p.name || ''))) continue;
        const key = String(p.realName || p.id || p.name || '');
        const name = window.v180EnglishName(year, hash(key) % 997, used);
        p.name = name;
        p.v180English = true;
        used[name] = 1;
        changed = true;
      }
    }
    c.v180EnglishNames = true;
    if (changed) { try { if (typeof save === 'function') save(); } catch (e) {} }
  }

  try {
    const oldRender = render;
    render = function () {
      try { if (typeof career !== 'undefined' && career) migrateEnglishNames(career); } catch (e) {}
      return oldRender.apply(this, arguments);
    };
  } catch (e) {}
})();
