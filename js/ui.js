// ui.js - app shell, saves, title screen, new game, shared widgets
var UI = (function () {
  var A = {}, V = {};
  var st = { view: 'title', p: {} };
  var SLOTS = 3, KEY = 'nflr_slot_';
  function S() { return G.S; }

  // ---------- saves ----------
  // Saves are compressed (lz-string, about 8x smaller) because every game on
  // treyblade9to10-eng.github.io shares one ~5MB storage box. Writes are
  // batched (save soon) and flushed when the page is hidden or closed.
  var META = 'nflr_meta_', saveTimer = null;
  function meta(s) {
    var t = s.teams[s.user];
    return { team: t.city + ' ' + t.name, id: s.user, logo: t.logo, c1: t.c1, c2: t.c2, season: s.season, rec: t.w + '-' + t.l + (t.t ? '-' + t.t : ''), phase: s.phase, mode: s.mode, titles: s.history.filter(function (h) { return h.champ === s.user; }).length };
  }
  function saveNow() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    var s = S(); if (!s) return;
    s.saved = Date.now();
    try {
      localStorage.setItem(KEY + s.slot, 'z' + LZString.compressToUTF16(JSON.stringify(s)));
      localStorage.setItem(META + s.slot, JSON.stringify(meta(s)));
    } catch (e) { U.toast('Could not save (phone storage is full). Delete an old slot.'); }
  }
  function save() { if (!S()) return; if (saveTimer) clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 700); }
  function parseSave(j) { if (!j) return null; try { return JSON.parse(j.charAt(0) === 'z' ? LZString.decompressFromUTF16(j.slice(1)) : j); } catch (e) { return null; } }
  function load(slot) { return parseSave(localStorage.getItem(KEY + slot)); }
  function slotInfo(slot) {
    if (saveTimer) saveNow();
    if (!localStorage.getItem(KEY + slot)) return null;
    var m = localStorage.getItem(META + slot);
    if (m) { try { return JSON.parse(m); } catch (e) { } }
    var s = load(slot); if (!s) return null;
    try { return meta(s); } catch (e) { return null; }
  }
  window.addEventListener('pagehide', function () { if (saveTimer) saveNow(); });
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden' && saveTimer) saveNow(); });

  // ---------- small widgets ----------
  function logo(id, size) {
    var t = S() && S().teams[id]; size = size || 28;
    if (!t) { var nt = NFL_TEAMS.filter(function (x) { return x.id === id; })[0]; if (nt) t = nt; }
    if (t && t.logo) return '<img class="logo" loading="lazy" src="' + t.logo + '" width="' + size + '" height="' + size + '" alt="" onerror="this.style.visibility=\'hidden\'">';
    return badge(id || '?', t ? t.c1 : '#333', t ? t.c2 : '#fff', size);
  }
  function badge(ab, c1, c2, size) {
    return '<svg class="logo" width="' + size + '" height="' + size + '" viewBox="0 0 40 40"><path d="M20 2 L36 8 V21 C36 30 29 35.5 20 38 C11 35.5 4 30 4 21 V8 Z" fill="' + U.esc(c1) + '" stroke="' + U.esc(c2) + '" stroke-width="2.5"/><path d="M8 12 H32" stroke="' + U.esc(c2) + '" stroke-width="1.2" opacity=".55"/><text x="20" y="27" text-anchor="middle" font-family="Barlow Condensed" font-weight="900" font-style="italic" font-size="' + (ab.length > 3 ? 10 : 13) + '" fill="' + U.esc(c2) + '">' + U.esc(ab) + '</text></svg>';
  }
  function face(p, size) {
    size = size || 40;
    var t = S().teams[p.t], c = t ? t.c1 : '#2a3340';
    var ini = p.n.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('');
    var fb = '<span class="face ini" style="width:' + size + 'px;height:' + size + 'px;background:' + c + '">' + U.esc(ini) + '</span>';
    if (!p.hs) return fb;
    return '<span class="face" style="width:' + size + 'px;height:' + size + 'px;background:' + c + '"><img loading="lazy" src="https://a.espncdn.com/i/headshots/nfl/players/full/' + p.hs + '.png" onerror="this.remove()" alt=""></span>';
  }
  function ovrTag(v, cls) { var k = v >= 90 ? 'o5' : v >= 84 ? 'o4' : v >= 77 ? 'o3' : v >= 70 ? 'o2' : 'o1'; return '<span class="ovr ' + k + ' ' + (cls || '') + '">' + v + '</span>'; }
  function contractStr(p) { return p.sal && p.sal.length ? U.money(p.sal[0] || p.sal[1] || 0) + ' <span class="dim">x' + p.sal.filter(function (x) { return x > 0; }).length + '</span>' : (p.expiring ? '<span class="gold">EXPIRING</span>' : '<span class="dim">-</span>'); }
  function injTag(p) { return p.inj > 0 ? '<span class="inj">OUT ' + p.inj + 'W</span>' : ''; }
  function potStr(p) { return p.scout ? p.scout[0] + '-' + p.scout[1] : p.pot; }
  function statLine(p, st) {
    st = st || p.st; if (!st || !st.g) return '<span class="dim">-</span>';
    var v = function (k) { return st[k] || 0; };
    if (p.pos === 'QB') return v('py') + ' yds, ' + v('ptd') + ' TD, ' + v('int') + ' INT';
    if (p.pos === 'RB' || p.pos === 'FB') return v('ry') + ' rush, ' + (v('rtd') + v('rctd')) + ' TD';
    if (p.pos === 'WR' || p.pos === 'TE') return v('rec') + ' rec, ' + v('rcy') + ' yds, ' + v('rctd') + ' TD';
    if (p.pos === 'K') return v('fgm') + '/' + v('fga') + ' FG';
    if (p.pos === 'P') return v('punts') + ' punts';
    if (L.DEF.indexOf(p.pos) >= 0) return v('tkl') + ' tkl, ' + v('sk') + ' sk, ' + v('dint') + ' INT';
    return st.g + ' games';
  }
  function playerRow(p, extra, act, cls) {
    return '<div class="prow ' + (cls || '') + '" data-a="' + (act || 'player') + '" data-id="' + p.id + '">' + face(p, 38) +
      '<div class="pmain"><div class="pname">' + U.esc(p.n) + ' ' + injTag(p) + (p.tagged === S().season ? ' <span class="tagt">TAG</span>' : '') + '</div><div class="psub"><b class="pp">' + p.pos + '</b> &middot; ' + p.age + 'y &middot; ' + contractStr(p) + '</div></div>' +
      (extra || '') + '<div class="prat">' + ovrTag(p.ovr) + '<span class="pot">' + potStr(p) + '</span></div></div>';
  }
  function capBar(tid) {
    var cap = L.teamCap(tid), pay = L.payroll(tid), max = cap * 1.08, pct = function (x) { return Math.min(100, x / max * 100).toFixed(1) + '%'; };
    var dead = L.deadNow(tid), space = cap - pay;
    return '<div class="capbar"><div class="fill ' + (space < 0 ? 'hot' : '') + '" style="width:' + pct(pay) + '"></div><div class="dfill" style="width:' + pct(dead) + '"></div><i style="left:' + pct(cap) + '"></i></div>' +
      '<div class="caplbl"><b>' + U.money(pay) + '</b> of ' + U.money(cap) + ' &middot; ' + (space >= 0 ? '<span class="pos">' + U.money(space) + ' space</span>' : '<span class="neg">' + U.money(-space) + ' OVER</span>') + (dead > 0.5 ? ' &middot; <span class="dim">' + U.money(dead) + ' dead</span>' : '') + '</div>';
  }
  function modal(html) { var m = U.$('#modal'); m.innerHTML = '<div class="mbox">' + html + '</div>'; m.classList.add('show'); m.scrollTop = 0; }
  function closeModal() { var m = U.$('#modal'), sh = m.classList.contains('sheet'); m.classList.remove('show'); m.classList.remove('sheet'); m.innerHTML = ''; if (sh) { var y = window.scrollY; render(); window.scrollTo(0, y); } }
  function phaseName() {
    var s = S();
    return { tags: 'FRANCHISE TAGS', fantasy: s.fd && s.fd.type === 'expansion' ? 'EXPANSION DRAFT' : 'FANTASY DRAFT', pre: 'PRESEASON', regular: 'WEEK ' + Math.min(s.week + 1, (s.sched || []).length), playoffs: 'PLAYOFFS', draft: (s.dr ? s.dr.year : '') + ' DRAFT', resign: 'RE-SIGN', fa: 'FREE AGENCY DAY ' + (s.faDay || 1) }[s.phase] || s.phase.toUpperCase();
  }
  function rec(t) { return t.w + '-' + t.l + (t.t ? '-' + t.t : ''); }

  // ---------- render ----------
  var TABS = [['home', 'HOME'], ['roster', 'ROSTER'], ['trade', 'TRADE'], ['picks', 'PICKS'], ['league', 'LEAGUE'], ['more', 'MORE']];
  function go(view, p) { st.view = view; st.p = p || {}; render(); window.scrollTo(0, 0); }
  function render() {
    var app = U.$('#app'), s = S();
    if (st.view === 'title' || st.view === 'newgame' || !s) { app.innerHTML = V[st.view === 'newgame' ? 'newgame' : 'title'](st.p); return; }
    var t = s.teams[s.user];
    if (st.view === 'live') { app.innerHTML = '<main class="livem">' + V.live(st.p) + '</main>'; return; }
    var head = '<header class="top" style="--tc:' + t.c1 + '">' + logo(s.user, 36) + '<div class="tinfo"><div class="tname">' + U.esc(t.city + ' ' + t.name) + '</div><div class="tsub">' + s.season + ' &middot; ' + rec(t) + ' &middot; ' + phaseName() + '</div></div></header>';
    var body = (V[st.view] || V.home)(st.p);
    var nav = s.phase === 'fantasy' || s.phase === 'tags' ? '' : '<nav class="tabs">' + TABS.map(function (x) { return '<button data-a="tab" data-v="' + x[0] + '" class="' + (st.view === x[0] ? 'on' : '') + '">' + icon(x[0]) + '<span>' + x[1] + '</span></button>'; }).join('') + '</nav>';
    app.innerHTML = head + '<main>' + body + '</main>' + nav;
  }
  function icon(k) {
    var d = {
      home: 'M3 11 L12 3 L21 11 V21 H14 V15 H10 V21 H3 Z', roster: 'M8 7a4 4 0 1 0 8 0a4 4 0 1 0-8 0 M3 21c0-5 4-8 9-8s9 3 9 8z',
      trade: 'M4 8h13l-4-4 M20 16H7l4 4', picks: 'M5 4h14v16H5z M9 9h6 M9 13h6 M9 17h3',
      league: 'M4 20V10 M10 20V4 M16 20v-7 M22 20H2', more: 'M5 12h.01 M12 12h.01 M19 12h.01'
    }[k];
    return '<svg viewBox="0 0 24 24" width="20" height="20"><path d="' + d + '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  // ---------- title ----------
  V.title = function () {
    var h = '<div class="title"><div class="brand"><img class="applogo" src="icons/icon-192.png?v=1" width="120" height="120" alt=""><div class="b1">NFL</div><div class="b2">REBUILDER</div><div class="b3">REAL ROSTERS &middot; MADDEN RATINGS &middot; REAL CONTRACTS &middot; $301.2M CAP</div></div><div class="slots">';
    for (var i = 1; i <= SLOTS; i++) {
      var info = slotInfo(i);
      if (info) {
        h += '<div class="slot"><div class="slotl">' + (info.logo ? '<img class="logo" src="' + info.logo + '" width="46" height="46">' : badge(info.id, info.c1, info.c2, 46)) + '<div><div class="sn">SLOT ' + i + '</div><div class="st">' + U.esc(info.team) + '</div><div class="ss">' + info.season + ' &middot; ' + info.rec + (info.titles ? ' &middot; ' + info.titles + ' RING' + (info.titles > 1 ? 'S' : '') : '') + '</div></div></div>' +
          '<div class="slotb"><button class="btn gold" data-a="load" data-slot="' + i + '">CONTINUE</button><button class="btn ghost sm" data-a="delslot" data-slot="' + i + '">DELETE</button></div></div>';
      } else h += '<div class="slot empty"><div class="sn">SLOT ' + i + '</div><div class="st dim">Empty</div><button class="btn" data-a="newgame" data-slot="' + i + '">NEW GAME</button></div>';
    }
    h += '</div><div class="foot dim">Ratings: Madden 27 (EA, Nov 4 2026). Contracts and dead money: OverTheCap. Rosters and headshots: ESPN. The 2027 draft has real top prospects (our own ratings). Later draft classes and extra free agents are made-up players. Fan-made, not affiliated with the NFL or EA.</div></div>';
    return h;
  };
  A.load = function (d) { var s = load(+d.slot); if (!s) { U.toast('That save is broken.'); return; } G.S = s; L.dirty(); go(s.live ? 'live' : 'home'); };
  A.delslot = function (d) { modal('<h3>DELETE SLOT ' + d.slot + '?</h3><p>This erases that save for good.</p><div class="row"><button class="btn red" data-a="delyes" data-slot="' + d.slot + '">DELETE</button><button class="btn ghost" data-a="close">CANCEL</button></div>'); };
  A.delyes = function (d) { localStorage.removeItem(KEY + d.slot); localStorage.removeItem(META + d.slot); closeModal(); render(); };
  A.close = closeModal;
  A.newgame = function (d) { G.S = null; go('newgame', { slot: +d.slot, step: 'mode', len: 17 }); };

  // ---------- new game ----------
  var COLORS = ['#c8102e', '#0b162a', '#203731', '#4f2683', '#fb4f14', '#0085ca', '#ffb612', '#000000', '#ffffff', '#69be28', '#97233f', '#008e97', '#5a1414', '#a5acaf', '#d3bc8d', '#e31837', '#041e42', '#00a3ad'];
  function lenPick(p) {
    return '<div class="lbl">GAMES PER SEASON</div><div class="seg">' + [6, 10, 14, 17].map(function (n) { return '<button data-a="nglen" data-n="' + n + '" class="' + ((p.len || 17) === n ? 'on' : '') + '">' + n + '</button>'; }).join('') + '</div>';
  }
  function draftPick(p, create) {
    var d = p.dt || (create ? 'fantasy' : 'real'), tags = p.tags == null ? (d === 'expansion' ? 25 : 5) : p.tags;
    var h = '<div class="lbl">ROSTERS</div><div class="dtypes">';
    var opts = create ? [['fantasy', 'FANTASY DRAFT', 'Every real team keeps a few franchise players. Everyone else goes into one big pool and the whole league drafts. You get a head-start pick for every franchise tag they kept.'], ['expansion', 'EXPANSION DRAFT', 'Real rosters stay. Each team protects its best players and you pick from the rest (max 3 per team). The lower-level guys, but still pretty good.']]
      : [['real', 'REAL ROSTERS', 'Real 2026 rosters, contracts and cap.'], ['fantasy', 'FANTASY DRAFT', 'You and every team tag franchise players to keep. Everyone else goes into the pool and the league re-drafts.']];
    opts.forEach(function (o) { h += '<button class="dtype ' + (d === o[0] ? 'on' : '') + '" data-a="ngdt" data-d="' + o[0] + '"><b>' + o[1] + '</b><span>' + o[2] + '</span></button>'; });
    h += '</div>';
    if (d === 'fantasy') h += '<div class="lbl">FRANCHISE PLAYERS EACH TEAM KEEPS</div><div class="seg">' + [0, 3, 5, 8, 12].map(function (n) { return '<button data-a="ngtags" data-n="' + n + '" class="' + (tags === n ? 'on' : '') + '">' + n + '</button>'; }).join('') + '</div><div class="dim small">' + (tags ? 'Teams keep their top ' + tags + ' (QBs first). The pool is everyone else: lower-level but still pretty good.' : 'Zero = every player in the league goes into the pool.') + '</div>';
    if (d === 'expansion') h += '<div class="lbl">PLAYERS EACH TEAM PROTECTS</div><div class="seg">' + [18, 22, 25, 30].map(function (n) { return '<button data-a="ngtags" data-n="' + n + '" class="' + (tags === n ? 'on' : '') + '">' + n + '</button>'; }).join('') + '</div><div class="dim small">You draft 40 players. Fewer protected = better players for you.</div>';
    return h;
  }
  V.newgame = function (p) {
    var h = '<div class="ng"><button class="back" data-a="' + (p.step === 'mode' ? 'totitle' : 'ngback') + '">BACK</button>';
    if (p.step === 'mode') {
      h += '<h2>NEW GAME &middot; SLOT ' + p.slot + '</h2><div class="modes">' +
        '<button class="mode" data-a="ngmode" data-m="control"><div class="mt">CONTROL A TEAM</div><div class="md">Take over a real NFL team: real roster, real contracts, real cap and its draft picks. Or reset the league with a fantasy draft.</div></button>' +
        '<button class="mode" data-a="ngmode" data-m="create"><div class="mt">CREATE A TEAM</div><div class="md">Make your own franchise (name, colors, division). Build it in a fantasy draft or an expansion draft.</div></button></div>';
    } else if (p.step === 'control') {
      h += '<h2>PICK YOUR TEAM</h2>' + lenPick(p) + draftPick(p, false);
      ['AFC', 'NFC'].forEach(function (c) {
        ['East', 'North', 'South', 'West'].forEach(function (dv) {
          var list = NFL_TEAMS.filter(function (t) { return t.conf === c && t.div === dv; });
          h += '<div class="sect">' + c + ' ' + dv.toUpperCase() + '</div><div class="tgrid">' + list.map(function (t) {
            var ps = NFL_PLAYERS.filter(function (x) { return x.t === t.id; }), qb = ps.filter(function (x) { return x.pos === 'QB'; }).sort(function (a, b) { return b.ovr - a.ovr; })[0];
            return '<button class="tcard ' + (p.team === t.id ? 'on' : '') + '" data-a="ngteam" data-id="' + t.id + '" style="--tc:' + t.c1 + '"><img class="logo" loading="lazy" src="' + t.logo + '" width="40" height="40"><div class="tc1">' + U.esc(t.city) + '</div><div class="tc2">' + U.esc(t.name) + '</div><div class="tc3">' + (qb ? 'QB ' + U.esc(U.lastName(qb.n)) + ' ' + qb.ovr : '') + '</div></button>';
          }).join('') + '</div>';
        });
      });
      var tn = p.team ? NFL_TEAMS.filter(function (t) { return t.id === p.team; })[0] : null;
      h += '<div class="stick"><button class="btn gold big" data-a="ngstart" ' + (p.team ? '' : 'disabled') + '>' + (tn ? 'START WITH THE ' + U.esc(tn.name.toUpperCase()) : 'PICK A TEAM') + '</button></div>';
    } else if (p.step === 'create') {
      var c = p.c || (p.c = { city: '', name: '', id: '', c1: '#0b162a', c2: '#ffb612', conf: 'NFC', div: 'North' });
      h += '<h2>CREATE YOUR TEAM</h2><div class="form">' +
        '<div class="prev">' + badge(c.id || '???', c.c1, c.c2, 90) + '<div class="pvn">' + U.esc((c.city || 'CITY') + ' ' + (c.name || 'NAME')) + '<div class="dim small">' + c.conf + ' ' + c.div + '</div></div></div>' +
        '<label>CITY<input id="f_city" maxlength="18" value="' + U.esc(c.city) + '" placeholder="Milwaukee"></label>' +
        '<label>TEAM NAME<input id="f_name" maxlength="16" value="' + U.esc(c.name) + '" placeholder="Blades"></label>' +
        '<label>ABBREVIATION (2-4 letters)<input id="f_id" maxlength="4" value="' + U.esc(c.id) + '" placeholder="MKB"></label>' +
        '<div class="lbl">CONFERENCE</div><div class="seg">' + ['AFC', 'NFC'].map(function (x) { return '<button data-a="ngconf" data-c="' + x + '" class="' + (c.conf === x ? 'on' : '') + '">' + x + '</button>'; }).join('') + '</div>' +
        '<div class="lbl">DIVISION</div><div class="seg">' + ['East', 'North', 'South', 'West'].map(function (x) { return '<button data-a="ngdiv" data-c="' + x + '" class="' + (c.div === x ? 'on' : '') + '">' + x.toUpperCase() + '</button>'; }).join('') + '</div>' +
        '<div class="lbl">MAIN COLOR</div><div class="sw">' + COLORS.map(function (x) { return '<button data-a="ngcol" data-k="c1" data-c="' + x + '" style="background:' + x + '" class="' + (c.c1 === x ? 'on' : '') + '"></button>'; }).join('') + '</div>' +
        '<div class="lbl">SECOND COLOR</div><div class="sw">' + COLORS.map(function (x) { return '<button data-a="ngcol" data-k="c2" data-c="' + x + '" style="background:' + x + '" class="' + (c.c2 === x ? 'on' : '') + '"></button>'; }).join('') + '</div>' +
        lenPick(p) + draftPick(p, true) +
        '</div><div class="stick"><button class="btn gold big" data-a="ngcreate">START THE DRAFT</button></div>';
    }
    return h + '</div>';
  };
  function readForm() {
    var c = st.p.c; if (!c) return;
    ['city', 'name', 'id'].forEach(function (k) { var e = U.$('#f_' + k); if (e) c[k] = e.value.trim(); });
    c.id = c.id.toUpperCase().replace(/[^A-Z]/g, '');
  }
  function rerender() { readForm(); var y = window.scrollY; render(); window.scrollTo(0, y); }
  A.nglen = function (d) { st.p.len = +d.n; rerender(); };
  A.ngdt = function (d) { st.p.dt = d.d; st.p.tags = null; rerender(); };
  A.ngtags = function (d) { st.p.tags = +d.n; rerender(); };
  A.totitle = function () { G.S = null; go('title'); };
  A.ngback = function () { st.p.step = 'mode'; render(); };
  A.ngmode = function (d) { st.p.step = d.m; st.p.dt = d.m === 'create' ? 'fantasy' : 'real'; st.p.tags = null; render(); window.scrollTo(0, 0); };
  A.ngteam = function (d) { st.p.team = d.id; rerender(); };
  A.ngconf = function (d) { st.p.c.conf = d.c; rerender(); };
  A.ngdiv = function (d) { st.p.c.div = d.c; rerender(); };
  A.ngcol = function (d) { st.p.c[d.k] = d.c; rerender(); };
  function draftOpt(create) {
    var d = st.p.dt || (create ? 'fantasy' : 'real');
    if (d === 'real') return null;
    return { type: d, tags: st.p.tags == null ? (d === 'expansion' ? 25 : 5) : st.p.tags };
  }
  A.ngstart = function () {
    if (!st.p.team) return;
    L.newLeague({ mode: 'control', team: st.p.team, slot: st.p.slot, len: st.p.len || 17, draft: draftOpt(false) });
    save(); go('home');
  };
  A.ngcreate = function () {
    readForm(); var c = st.p.c;
    if (c.city.length < 2 || c.name.length < 2) { U.toast('Give your team a city and a name.'); return; }
    if (c.id.length < 2) { U.toast('Abbreviation needs 2-4 letters.'); return; }
    if (NFL_TEAMS.some(function (t) { return t.id === c.id; }) || ['FA', 'DC', 'POOL'].indexOf(c.id) >= 0) { U.toast(c.id + ' is taken. Pick another.'); return; }
    if (c.c1 === c.c2) { U.toast('Pick two different colors.'); return; }
    L.newLeague({ mode: 'create', slot: st.p.slot, len: st.p.len || 17, custom: { id: c.id, city: c.city, name: c.name, c1: c.c1, c2: c.c2, conf: c.conf, div: c.div }, draft: draftOpt(true) });
    save(); go('home');
  };
  A.tab = function (d) { go(d.v); };

  function init() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-a]'); if (!el) return;
      if (el.disabled) return;
      var f = A[el.dataset.a]; if (!f) return;
      if (el.tagName !== 'INPUT') e.preventDefault();
      f(el.dataset, el, e);
    });
    document.addEventListener('change', function (e) { var el = e.target; if (el.dataset && el.dataset.ch && A[el.dataset.ch]) A[el.dataset.ch](el.dataset, el); });
    document.addEventListener('input', function (e) { var el = e.target; if (el.dataset && el.dataset.in && A[el.dataset.in]) A[el.dataset.in](el.dataset, el); });
    U.$('#modal').addEventListener('click', function (e) { if (e.target.id === 'modal') closeModal(); });
    render();
  }
  return { A: A, V: V, st: st, go: go, render: render, save: save, saveNow: saveNow, logo: logo, badge: badge, face: face, ovrTag: ovrTag, contractStr: contractStr, injTag: injTag, potStr: potStr, statLine: statLine, playerRow: playerRow, capBar: capBar, modal: modal, closeModal: closeModal, init: init, phaseName: phaseName, rec: rec };
})();
