// league.js - league state, cap, depth charts, team ratings, values, picks
var G = { S: null };
var L = (function () {
  var CAP0 = 301.2, FIRST_SEASON = 2026, GROW = 1.07, PICK_YEARS = 3, ROUNDS = 7;
  var ROSTER_MAX = 53, ROSTER_MIN = 46, OFF_MAX = 75; // 75 = offseason limit (draft + free agency)
  var OFF = ['QB', 'RB', 'FB', 'WR', 'TE', 'OT', 'G', 'C'], DEF = ['EDGE', 'DT', 'LB', 'CB', 'S'], ST = ['K', 'P', 'LS'];
  var ALLPOS = OFF.concat(DEF).concat(ST);
  var STARTERS = { QB: 1, RB: 1, WR: 3, TE: 1, OT: 2, G: 2, C: 1, EDGE: 2, DT: 2, LB: 2, CB: 3, S: 2, K: 1, P: 1 };
  var NEED = { QB: 3, RB: 3, FB: 0, WR: 6, TE: 3, OT: 4, G: 4, C: 2, EDGE: 4, DT: 4, LB: 5, CB: 5, S: 4, K: 1, P: 1, LS: 1 };
  // who can slide over when a spot is empty (and how much worse he plays there)
  var BACKUP = { QB: [], RB: ['FB', 'WR'], FB: ['RB', 'TE'], WR: ['TE', 'RB'], TE: ['FB', 'WR', 'OT'], OT: ['G'], G: ['C', 'OT'], C: ['G'], EDGE: ['DT', 'LB'], DT: ['EDGE'], LB: ['S', 'EDGE'], CB: ['S'], S: ['CB', 'LB'], K: ['P'], P: ['K'], LS: ['C', 'TE'] };
  // market price for a 90 OVR player at each spot ($M a year, 2026 cap)
  var TOP = { QB: 52, EDGE: 31, WR: 29, OT: 24, CB: 23, DT: 23, S: 15, LB: 14, TE: 14, G: 16, C: 12, RB: 11, K: 5, P: 3.6, FB: 2.2, LS: 1.3 };
  var POSNAME = { QB: 'Quarterback', RB: 'Running back', FB: 'Fullback', WR: 'Wide receiver', TE: 'Tight end', OT: 'Tackle', G: 'Guard', C: 'Center', EDGE: 'Edge rusher', DT: 'Defensive tackle', LB: 'Linebacker', CB: 'Cornerback', S: 'Safety', K: 'Kicker', P: 'Punter', LS: 'Long snapper' };

  function S() { return G.S; }
  function capFor(season) { return { cap: Math.round(CAP0 * Math.pow(GROW, (season || S().season) - FIRST_SEASON) * 10) / 10 }; }
  function capRatio() { return capFor().cap / CAP0; }
  function teamCap(tid, y) {
    var s = S(), t = team(tid), c = capFor(s.season + (y || 0)).cap;
    if (s.season + (y || 0) === FIRST_SEASON && t.carry) c += t.carry;
    return Math.round(c * 10) / 10;
  }
  function minSal(exp) { return Math.round((0.885 + Math.min(6, Math.max(0, exp || 0)) * 0.065) * capRatio() * 1000) / 1000; }
  function rookieDeal(slot) { // overall pick -> 4 yearly cap hits
    var r = capRatio(), base = slot <= 32 ? Math.max(3.2, 11.4 * Math.pow(0.957, slot - 1)) : slot <= 64 ? 2.1 - (slot - 33) * 0.017 : Math.max(1.0, 1.5 - (slot - 65) * 0.004);
    var out = []; for (var i = 0; i < 4; i++) out.push(Math.round(base * r * (0.85 + i * 0.1) * 1000) / 1000);
    return out;
  }

  function team(id) { return S().teams[id]; }
  function teamIds() { return Object.keys(S().teams); }
  function player(id) { return S().players[id]; }
  // roster index: rebuilt whenever a player changes teams (L.mv) or is added/removed (L.dirty)
  var idx = null, idxS = null;
  function dirty() { idx = null; }
  function mv(p, tid) { p.t = tid; idx = null; }
  function roster(tid) {
    var s = S();
    if (!idx || idxS !== s) { idx = {}; idxS = s; var P = s.players; for (var k in P) { var t = P[k].t; (idx[t] || (idx[t] = [])).push(P[k]); } }
    return (idx[tid] || []).slice();
  }
  function payroll(tid, y) {
    y = y || 0; var s = S(), t = team(tid), tot = 0, r = roster(tid), abs = s.season + y;
    for (var i = 0; i < r.length; i++) tot += r[i].sal[y] || 0;
    var oi = abs - FIRST_SEASON; if (t.other && t.other[oi]) tot += t.other[oi];
    (t.dead || []).forEach(function (d) { if (d.y === abs) tot += d.amt; });
    return Math.round(tot * 100) / 100;
  }
  function deadNow(tid) { var s = S(), t = team(tid), oi = s.season - FIRST_SEASON; return (t.other && t.other[oi] || 0) + U.sum((t.dead || []).filter(function (d) { return d.y === s.season; }), function (d) { return d.amt; }); }
  function capSpace(tid, y) { return Math.round((teamCap(tid, y) - payroll(tid, y)) * 100) / 100; }
  function rosterMax() { var ph = S().phase; return (ph === 'draft' || ph === 'resign' || ph === 'fa' || ph === 'pre') ? OFF_MAX : ROSTER_MAX; }

  // ---------- depth chart ----------
  function group(pos) { return OFF.indexOf(pos) >= 0 ? 'OFF' : DEF.indexOf(pos) >= 0 ? 'DEF' : 'ST'; }
  function byPos(tid) {
    var t = team(tid), out = {}, r = roster(tid);
    ALLPOS.forEach(function (p) { out[p] = []; });
    r.forEach(function (p) { (out[p.pos] = out[p.pos] || []).push(p); });
    var dc = (tid === S().user && t.depth) || {};
    ALLPOS.forEach(function (pos) {
      var order = dc[pos] || [];
      out[pos].sort(function (a, b) {
        var ia = order.indexOf(a.id), ib = order.indexOf(b.id);
        if (ia >= 0 && ib >= 0) return ia - ib;
        if (ia >= 0) return -1; if (ib >= 0) return 1;
        return b.ovr - a.ovr;
      });
    });
    return out;
  }
  function setDepth(tid, pos, ids) { var t = team(tid); t.depth = t.depth || {}; t.depth[pos] = ids.slice(); }
  // game-day starters by spot, healthy only, with fill-ins from other spots
  function starters(tid) {
    var bp = byPos(tid), used = {}, out = {};
    Object.keys(STARTERS).forEach(function (pos) {
      var need = STARTERS[pos], list = [];
      bp[pos].forEach(function (p) { if (list.length < need && !(p.inj > 0) && !used[p.id]) { list.push({ p: p, r: p.ovr }); used[p.id] = 1; } });
      (BACKUP[pos] || []).forEach(function (bk) {
        bp[bk].slice().reverse().forEach(function (p) { if (list.length < need && !(p.inj > 0) && !used[p.id]) { list.push({ p: p, r: p.ovr - 8, out: 1 }); used[p.id] = 1; } });
      });
      while (list.length < need) list.push({ p: null, r: 40 });
      out[pos] = list;
    });
    return out;
  }
  function wavg(list, w) { var t = 0, ws = 0; for (var i = 0; i < list.length; i++) { var k = w ? w[i] : 1; t += list[i].r * k; ws += k; } return ws ? t / ws : 50; }
  function ratingsFrom(st) {
    var off = 0.30 * st.QB[0].r + 0.09 * st.RB[0].r + 0.22 * wavg(st.WR, [0.45, 0.33, 0.22]) + 0.08 * st.TE[0].r + 0.31 * wavg(st.OT.concat(st.G).concat(st.C));
    var def = 0.26 * wavg(st.EDGE) + 0.17 * wavg(st.DT) + 0.13 * wavg(st.LB) + 0.28 * wavg(st.CB, [0.4, 0.35, 0.25]) + 0.16 * wavg(st.S);
    var stv = (st.K[0].r + st.P[0].r) / 2;
    return { off: off, def: def, st: stv, ovr: off * 0.5 + def * 0.47 + stv * 0.03 };
  }
  var rcache = {};
  function ratings(tid) { return ratingsFrom(starters(tid)); }
  function teamRating(tid) { return ratings(tid).ovr; }
  function ovrRank() { return teamIds().map(function (id) { return { id: id, r: teamRating(id) }; }).sort(function (a, b) { return b.r - a.r; }); }
  function setStrategies() {
    var rk = ovrRank(), n = rk.length;
    rk.forEach(function (x, i) {
      var t = team(x.id);
      if (t.id === S().user) { t.strat = t.strat || 'contend'; return; }
      var bp = byPos(x.id), qb = bp.QB[0];
      t.strat = (i < n * 0.5 || (qb && qb.ovr >= 88 && qb.age <= 33)) ? 'contend' : 'rebuild';
    });
  }

  // ---------- values ----------
  function apy(ovr, pos) {
    var top = TOP[pos] || 10, v = ovr > 90 ? top * (1 + (ovr - 90) * 0.045) : top * Math.exp((ovr - 90) / 9);
    return Math.max(minSal(0), Math.min(capFor().cap * 0.205, v * capRatio()));
  }
  function peakAge(pos) { return pos === 'RB' ? 26 : pos === 'QB' ? 31 : pos === 'K' || pos === 'P' ? 34 : 28; }
  function effRating(p, strat) {
    var yw = U.clamp((26 - p.age) / 5, 0, 1) * (strat === 'rebuild' ? 0.7 : 0.4);
    var e = p.ovr + (p.pot - p.ovr) * yw, pk = peakAge(p.pos) + 3;
    if (p.age > pk) e -= (p.age - pk) * (strat === 'rebuild' ? 1.8 : 1.0);
    return e;
  }
  function playerValue(p, tid) {
    var strat = tid && team(tid) ? (team(tid).strat || 'contend') : 'contend';
    var tal = apy(effRating(p, strat), p.pos) / capRatio() * (strat === 'contend' ? 1.08 : 1);
    var yrs = Math.max(1, Math.min(4, p.sal.length)), v = 0;
    for (var y = 0; y < yrs; y++) v += (tal - (p.sal[y] || 0) / capRatio() * 0.5) * Math.pow(0.88, y);
    v += tal * 0.3; // keeping his rights after the deal ends
    if (p.inj > 6) v *= 0.75;
    return Math.round(v * 10) / 10;
  }
  // Jimmy-Johnson-style chart, made smoother
  var JJ = [[1, 3000], [2, 2600], [3, 2200], [5, 1700], [10, 1300], [16, 1000], [20, 850], [32, 590], [40, 500], [50, 400], [64, 270], [80, 190], [100, 100], [130, 50], [160, 28], [200, 10], [260, 3]];
  function jj(n) {
    for (var i = 1; i < JJ.length; i++) if (n <= JJ[i][0]) { var a = JJ[i - 1], b = JJ[i], f = (n - a[0]) / (b[0] - a[0]); return a[1] + (b[1] - a[1]) * f; }
    return 2;
  }
  function projSlot(orig) { // 1 = worst team
    var s = S();
    if (s.draftOrder && s.draftOrder.indexOf(orig) >= 0) return s.draftOrder.indexOf(orig) + 1;
    var list = teamIds().map(function (id) {
      var t = team(id), gp = t.w + t.l + t.t, wp = gp ? (t.w + t.t / 2) / gp : 0.5;
      var rw = (teamRating(id) - 74) / 14 + 0.5, f = Math.min(1, gp / Math.max(4, (s.len || 17) * 0.8));
      return { id: id, k: wp * f + rw * (1 - f) };
    }).sort(function (a, b) { return a.k - b.k; });
    for (var i = 0; i < list.length; i++) if (list[i].id === orig) return i + 1;
    return 16;
  }
  function pickOverall(pk) {
    var s = S(), n = teamIds().length, slot = projSlot(pk.o), away = pk.y - s.season - (s.phase === 'draft' || s.phase === 'resign' || s.phase === 'fa' ? 1 : 0);
    if (pk.y > s.season && away > 0) slot = Math.round(slot + ((n + 1) / 2 - slot) * Math.min(0.8, away * 0.35));
    return (pk.r - 1) * n + slot;
  }
  function pickValue(pk, tid) {
    var strat = tid && team(tid) ? team(tid).strat : 'contend', s = S();
    var v = jj(pickOverall(pk)) * 0.027 * Math.pow(0.9, Math.max(0, pk.y - s.season - 1));
    v *= strat === 'rebuild' ? 1.25 : 0.88;
    return Math.round(v * 10) / 10;
  }
  function pickLabel(pk) { var s = pk.y + ' ' + U.ord(pk.r); if (pk.o !== pk.h) s += ' (' + pk.o + ')'; return s; }
  function picksOf(tid) { return S().picks.filter(function (p) { return p.h === tid; }).sort(function (a, b) { return a.y - b.y || a.r - b.r; }); }
  function addPicksForYear(y) { teamIds().forEach(function (id) { for (var r = 1; r <= ROUNDS; r++) S().picks.push({ id: y + '-' + r + '-' + id, y: y, r: r, o: id, h: id }); }); }

  function news(msg, kind) { var s = S(); s.news.unshift({ d: s.weekLabel || '', m: msg, k: kind || '' }); if (s.news.length > 160) s.news.length = 160; }
  function blankStats() { return { g: 0, gs: 0 }; }
  function teamName(id) { var t = team(id); return t ? t.city + ' ' + t.name : id; }
  function shortName(id) { var t = team(id); return t ? t.name : id; }

  // ---------- new league ----------
  function newLeague(o) {
    var s = { v: 1, len: o.len || 17, slot: o.slot, mode: o.mode, user: null, season: FIRST_SEASON, phase: 'pre', week: 0, teams: {}, players: {}, picks: [], news: [], history: [], nextPid: 1, created: Date.now(), tradeLog: [], games: [] };
    G.S = s;
    NFL_TEAMS.forEach(function (t) {
      s.teams[t.id] = { id: t.id, city: t.city, name: t.name, c1: t.c1, c2: t.c2, conf: t.conf, div: t.div, logo: t.logo, other: t.other.slice(), carry: t.carry, w: 0, l: 0, t: 0, pf: 0, pa: 0, dead: [], depth: null, strat: 'contend', last: [] };
    });
    if (o.mode === 'create') {
      var c = o.custom;
      s.teams[c.id] = { id: c.id, city: c.city, name: c.name, c1: c.c1, c2: c.c2, conf: c.conf, div: c.div, logo: null, custom: true, other: [], carry: 0, w: 0, l: 0, t: 0, pf: 0, pa: 0, dead: [], depth: null, strat: 'rebuild', last: [] };
      s.user = c.id;
    } else s.user = o.team;
    NFL_PLAYERS.forEach(function (p) {
      var q = JSON.parse(JSON.stringify(p));
      q.id = s.nextPid++; q.inj = 0; q.st = blankStats(); q.car = []; q.exp = Math.max(0, q.age - 22);
      if (!q.bon) q.bon = q.sal.map(function () { return 0; });
      s.players[q.id] = q;
    });
    for (var y = s.season + 1; y <= s.season + PICK_YEARS; y++) addPicksForYear(y);
    setStrategies();
    news('Welcome to the ' + s.season + ' season. You run the ' + teamName(s.user) + '.', 'big');
    if (o.draft) Off.setupFantasy(o.draft); // fantasy / expansion draft first
    else Off.preseason();
    return s;
  }

  return {
    CAP0: CAP0, FIRST_SEASON: FIRST_SEASON, GROW: GROW, PICK_YEARS: PICK_YEARS, ROUNDS: ROUNDS, ROSTER_MAX: ROSTER_MAX, ROSTER_MIN: ROSTER_MIN, OFF_MAX: OFF_MAX,
    OFF: OFF, DEF: DEF, ST: ST, ALLPOS: ALLPOS, STARTERS: STARTERS, NEED: NEED, TOP: TOP, POSNAME: POSNAME,
    capFor: capFor, capRatio: capRatio, teamCap: teamCap, minSal: minSal, rookieDeal: rookieDeal,
    team: team, teamIds: teamIds, player: player, roster: roster, dirty: dirty, mv: mv, payroll: payroll, deadNow: deadNow, capSpace: capSpace, rosterMax: rosterMax,
    group: group, byPos: byPos, setDepth: setDepth, starters: starters, ratings: ratings, teamRating: teamRating, ovrRank: ovrRank, setStrategies: setStrategies,
    apy: apy, peakAge: peakAge, effRating: effRating, playerValue: playerValue, jj: jj, projSlot: projSlot, pickOverall: pickOverall, pickValue: pickValue, pickLabel: pickLabel, picksOf: picksOf, addPicksForYear: addPicksForYear,
    news: news, blankStats: blankStats, teamName: teamName, shortName: shortName, newLeague: newLeague
  };
})();
