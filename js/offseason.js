// offseason.js - fantasy/expansion draft, preseason cut-down, NFL draft, re-sign + franchise tag, free agency, aging
var Off = (function () {
  function S() { return G.S; }
  var SCHOOLS = ['Alabama', 'Georgia', 'Ohio State', 'Michigan', 'Texas', 'LSU', 'Oregon', 'Clemson', 'Penn State', 'Notre Dame', 'USC', 'Florida', 'Miami', 'Oklahoma', 'Tennessee', 'Auburn', 'Florida State', 'Texas A&M', 'Wisconsin', 'Iowa', 'Utah', 'Washington', 'Ole Miss', 'Missouri', 'Kentucky', 'South Carolina', 'Arkansas', 'Baylor', 'TCU', 'Kansas State', 'Iowa State', 'Minnesota', 'Nebraska', 'Purdue', 'Indiana', 'Illinois', 'UCLA', 'Arizona', 'Arizona State', 'Colorado', 'BYU', 'Boise State', 'Tulane', 'Memphis', 'Toledo', 'Louisville', 'NC State', 'Virginia Tech', 'Pitt', 'Syracuse', 'Duke', 'North Carolina', 'West Virginia', 'Cincinnati', 'Houston', 'Oklahoma State', 'Texas Tech', 'SMU', 'Stanford', 'Cal', 'Fresno State', 'App State', 'North Dakota State', 'Jackson State', 'Howard'];
  var DIST = { QB: 14, RB: 20, WR: 34, TE: 14, OT: 20, G: 16, C: 8, EDGE: 28, DT: 24, LB: 24, CB: 30, S: 20, K: 4, P: 4, FB: 2, LS: 2 };
  var SPD = { QB: [78, 90], RB: [86, 95], FB: [76, 84], WR: [87, 96], TE: [80, 89], OT: [66, 76], G: [64, 73], C: [64, 72], EDGE: [80, 90], DT: [70, 80], LB: [81, 90], CB: [88, 96], S: [86, 93], K: [55, 70], P: [55, 70], LS: [55, 65] };

  // ---------- players we make up ----------
  function used() { var u = {}, P = S().players; for (var k in P) u[P[k].n] = 1; return u; }
  function newPlayer(o) {
    var s = S(), p = { id: s.nextPid++, n: o.n, t: o.t, pos: o.pos, sp: o.pos, ovr: o.ovr, spd: o.spd || U.ri(SPD[o.pos][0], SPD[o.pos][1]), age: o.age, num: o.num || 0, pot: Math.max(o.ovr, o.pot || o.ovr), sal: o.sal || [], bon: (o.sal || []).map(function () { return 0; }), inj: 0, st: L.blankStats(), car: [], exp: o.exp || 0, made: 1 };
    if (o.school) p.school = o.school;
    s.players[p.id] = p; L.dirty(); return p;
  }
  function makeFiller(n) {
    var u = used(), pos = [];
    Object.keys(DIST).forEach(function (k) { for (var i = 0; i < DIST[k]; i++) pos.push(k); });
    for (var i = 0; i < n; i++) {
      var ps = U.pick(pos), age = U.ri(23, 31), ovr = U.ri(50, 67);
      newPlayer({ n: U.makeName(u), t: 'FA', pos: ps, ovr: ovr, age: age, pot: ovr + (age < 25 ? U.ri(0, 5) : 0), exp: age - 22 });
    }
  }
  function makeDraftClass(year) {
    var s = S(); if (s.players && Object.keys(s.players).some(function (k) { var p = s.players[k]; return p.t === 'DC' && p.dy === year; })) return;
    var u = used(), list = [], real = (year === 2027 && typeof REAL_2027 !== 'undefined') ? REAL_2027 : [];
    real.forEach(function (r) {
      var ovr = Math.round(r[2] * 0.85 + 6), pot = Math.min(99, ovr + ({ A: 13, B: 10, C: 7 }[r[4]] || 8) + U.ri(-2, 2));
      list.push({ n: r[1], pos: r[0], ovr: ovr, pot: pot, school: r[3], age: r[5] || 21, real: 1 });
      u[r[1]] = 1;
    });
    var pos = [];
    Object.keys(DIST).forEach(function (k) { for (var i = 0; i < DIST[k]; i++) pos.push(k); });
    U.shuffle(pos);
    var N = 262;
    for (var i = list.length; i < N; i++) {
      var g = i / N, ovr = Math.round(76 - 20 * Math.pow(g, 0.7) + U.gauss() * 2.6), ps = pos[i % pos.length];
      if ((ps === 'K' || ps === 'P' || ps === 'LS') && g < 0.35) ps = 'WR';
      var pot = Math.min(97, ovr + Math.round(6 + (1 - g) * 10 + U.gauss() * 3));
      list.push({ n: U.makeName(u), pos: ps, ovr: U.clamp(ovr, 44, 82), pot: Math.max(ovr + 1, pot), school: U.pick(SCHOOLS), age: U.ri(21, 23) });
    }
    list.forEach(function (x) {
      var p = newPlayer({ n: x.n, t: 'DC', pos: x.pos, ovr: x.ovr, pot: x.pot, age: x.age, school: x.school });
      p.dy = year; if (x.real) p.real = 1;
      var f = U.ri(2, 5); p.scout = [Math.max(p.ovr, p.pot - f - U.ri(0, 3)), Math.min(99, p.pot + U.ri(1, 5))];
    });
  }
  function draftClass() { return L.roster('DC').sort(function (a, b) { return grade(b) - grade(a); }); }
  function grade(p) { var pm = { QB: 3, EDGE: 2, OT: 1.5, CB: 1, WR: 1, DT: 0.5, K: -14, P: -15, LS: -20, FB: -10, RB: -1, G: -1, C: -1.5 }[p.pos] || 0; return p.ovr * 0.55 + p.pot * 0.45 + pm; }
  function freeAgents() { return L.roster('FA').sort(function (a, b) { return b.ovr - a.ovr; }); }

  // ---------- needs-based scoring (CPU drafting / signing) ----------
  function needScore(p, tid, mode) {
    var have = L.roster(tid).filter(function (q) { return q.pos === p.pos; }).length, st = L.STARTERS[p.pos] || 0, nd = L.NEED[p.pos] || 0;
    var base = mode === 'draft' ? grade(p) : p.ovr + (p.age <= 25 ? (p.pot - p.ovr) * 0.3 : 0) - Math.max(0, p.age - 31) * 1.5;
    var posv = { QB: 4, EDGE: 2, OT: 1.5, WR: 1, CB: 1, DT: 0.5, S: 0, LB: -0.5, TE: -0.5, G: -1, C: -1.5, RB: -1.5, K: -6, P: -7, FB: -9, LS: -12 }[p.pos] || 0;
    if (mode === 'draft') posv = 0;
    var b = base + posv;
    if (have < st) b += 5; else if (have >= nd) b -= 8 + (have - nd) * 6;
    if ((p.pos === 'K' || p.pos === 'P' || p.pos === 'LS') && have >= 1) b -= 40;
    if (p.pos === 'QB' && have >= 2) b -= 12;
    return b + U.rnd() * 1.5;
  }

  // ---------- fantasy + expansion drafts ----------
  // o = { type: 'fantasy'|'expansion', tags: N franchise players each real team keeps (fantasy) or protects (expansion) }
  function setupFantasy(o) {
    var s = S();
    s.fd = { type: o.type, tags: o.tags, log: [], i: 0, list: [], taken: {} };
    if (o.type === 'fantasy' && s.mode === 'control' && o.tags > 0) { s.phase = 'tags'; autoTag(true); return; }
    autoTag(false);
    beginFantasy();
  }
  function tagScore(p) { return L.playerValue(p) * 0.35 + p.ovr * 2 + (p.pos === 'QB' ? 25 : 0) - (p.age >= 32 ? (p.age - 31) * 6 : 0); }
  function autoTag(skipUser) {
    var s = S(), n = s.fd.tags;
    L.teamIds().forEach(function (tid) {
      var t = L.team(tid); if (t.custom) return;
      if (skipUser && tid === s.user) { t.tags = t.tags || L.roster(tid).sort(function (a, b) { return tagScore(b) - tagScore(a); }).slice(0, n).map(function (p) { return p.id; }); return; }
      if (s.fd.type === 'expansion') t.tags = L.roster(tid).sort(function (a, b) { return tagScore(b) - tagScore(a); }).slice(0, n).map(function (p) { return p.id; });
      else t.tags = L.roster(tid).sort(function (a, b) { return tagScore(b) - tagScore(a); }).slice(0, n).map(function (p) { return p.id; });
    });
  }
  function beginFantasy() {
    var s = S(), fd = s.fd, ids = L.teamIds();
    s.phase = 'fantasy';
    if (fd.type === 'fantasy') {
      for (var k in s.players) { var p = s.players[k], t = L.team(p.t); if (t && !(t.tags || []).some(function (x) { return x === p.id; })) L.mv(p, 'POOL'); }
      for (k in s.players) if (s.players[k].t === 'FA') L.mv(s.players[k], 'POOL');
      var custom = ids.filter(function (id) { return L.team(id).custom; });
      var order = U.shuffle(ids.slice()), R = 50 - fd.tags;
      custom.forEach(function (c) { for (var i = 0; i < fd.tags; i++) fd.list.push({ t: c, r: 0 }); });
      for (var r = 1; r <= R; r++) { var ro = r % 2 ? order : order.slice().reverse(); ro.forEach(function (tid) { fd.list.push({ t: tid, r: r }); }); }
      fd.rounds = R;
      L.news('Fantasy draft! Every team kept ' + fd.tags + ' franchise player' + (fd.tags === 1 ? '' : 's') + ' and everyone else is up for grabs.', 'big');
    } else {
      for (var k2 in s.players) { var q = s.players[k2], tm = L.team(q.t); if (tm && !tm.custom) q.prot = (tm.tags || []).indexOf(q.id) >= 0; }
      fd.rounds = 40; fd.maxPer = 3;
      for (var i = 0; i < fd.rounds; i++) fd.list.push({ t: s.user, r: i + 1 });
      L.news('Expansion draft! Every team protected ' + fd.tags + ' players. You can take up to 3 from each team.', 'big');
    }
  }
  function pool() {
    var s = S(), fd = s.fd, P = s.players, out = [];
    if (!fd) return out;
    for (var k in P) {
      var p = P[k];
      if (fd.type === 'fantasy') { if (p.t === 'POOL') out.push(p); }
      else if (L.team(p.t) && !L.team(p.t).custom && !p.prot && (fd.taken[p.t] || 0) < fd.maxPer) out.push(p);
    }
    return out.sort(function (a, b) { return b.ovr - a.ovr; });
  }
  function fdCurrent() { var fd = S().fd; return fd && fd.list[fd.i] || null; }
  function fdPick(pid) {
    var s = S(), fd = s.fd, cur = fdCurrent(); if (!cur) return;
    var p = L.player(pid); if (!p) return;
    if (fd.type === 'expansion') { fd.taken[p.t] = (fd.taken[p.t] || 0) + 1; fd.log.unshift({ n: fd.i + 1, t: cur.t, p: pid, from: p.t }); }
    else fd.log.unshift({ n: fd.i + 1, t: cur.t, p: pid });
    L.mv(p, cur.t); fd.i++;
    if (fd.log.length > 60) fd.log.length = 60;
    if (fd.i >= fd.list.length) finishFantasy();
  }
  function cpuFdPick() {
    var cur = fdCurrent(); if (!cur) return;
    var best = null, bs = -1e9;
    pool().slice(0, 140).forEach(function (p) { var sc = needScore(p, cur.t, 'fd'); if (sc > bs) { bs = sc; best = p; } });
    if (best) fdPick(best.id); else S().fd.i = S().fd.list.length, finishFantasy();
  }
  function fdSimToUser() { var s = S(), g = 0; while (s.phase === 'fantasy' && fdCurrent() && fdCurrent().t !== s.user && g++ < 5000) cpuFdPick(); }
  function fdAutoAll() { var s = S(), g = 0; while (s.phase === 'fantasy' && fdCurrent() && g++ < 6000) cpuFdPick(); }
  function finishFantasy() {
    var s = S(), fd = s.fd;
    if (s.phase !== 'fantasy') return;
    for (var k in s.players) { var p = s.players[k]; if (p.t === 'POOL') L.mv(p, 'FA'); delete p.prot; }
    L.news(fd.type === 'expansion' ? 'The expansion draft is done. Fill out the roster in free agency.' : 'The fantasy draft is done.', 'big');
    s.fdDone = { type: fd.type, log: fd.log.slice(0, 40) };
    s.fd = null;
    L.teamIds().forEach(function (id) { L.team(id).tags = null; L.team(id).depth = null; });
    preseason();
  }

  // ---------- preseason ----------
  function preseason() {
    var s = S();
    s.phase = 'pre'; s.weekLabel = 'Preseason';
    if (freeAgents().length < 120) makeFiller(160 - freeAgents().length);
    makeDraftClass(s.season + 1);
    L.teamIds().forEach(function (tid) { if (tid !== s.user) cutDown(tid, L.ROSTER_MAX); });
    cpuFillRosters();
    L.teamIds().forEach(function (tid) { if (tid !== s.user) capFix(tid, 2); });
    cpuFillRosters();
    L.setStrategies();
  }
  function cutDown(tid, max) {
    var r = L.roster(tid);
    if (r.length <= max) return;
    var bp = L.byPos(tid), keep = {};
    // keep the starters + one backup QB
    Object.keys(L.STARTERS).forEach(function (pos) { bp[pos].slice(0, L.STARTERS[pos] + (pos === 'QB' ? 1 : 0)).forEach(function (p) { keep[p.id] = 1; }); });
    var cand = r.filter(function (p) { return !keep[p.id]; }).sort(function (a, b) { return cutScore(a) - cutScore(b); });
    var n = r.length - max;
    for (var i = 0; i < n && i < cand.length; i++) release(cand[i].id, true);
  }
  function cutScore(p) { var have = L.roster(p.t).filter(function (q) { return q.pos === p.pos; }).length; return p.ovr + (p.pot - p.ovr) * (p.age <= 24 ? 0.4 : 0) - (have > (L.NEED[p.pos] || 2) ? 6 : 0) + deadIf(p) * 0.6; }
  function deadIf(p) { return Math.round(U.sum(p.bon || [], function (x) { return x || 0; }) * 1000) / 1000; }
  function release(pid, quiet) {
    var s = S(), p = L.player(pid); if (!p) return 'No player.';
    var t = L.team(p.t); if (!t) return 'Not on a team.';
    var dead = deadIf(p);
    if (dead > 0.01) { t.dead = t.dead || []; t.dead.push({ n: p.n, y: s.season + (s.phase === 'draft' ? 1 : 0), amt: dead }); }
    if (!quiet || p.t === s.user) L.news((p.t === s.user ? 'You release ' : L.shortName(p.t) + ' release ') + p.pos + ' ' + p.n + (dead > 0.5 ? ' (' + U.money(dead) + ' dead money)' : '') + '.', p.t === s.user ? 'you' : '');
    L.mv(p, 'FA'); p.sal = []; p.bon = []; delete p.ask;
    if (t.depth) Object.keys(t.depth).forEach(function (k) { t.depth[k] = t.depth[k].filter(function (x) { return x !== pid; }); });
    return null;
  }
  // turn part of this year's pay into bonus spread over the deal (real NFL move)
  function canRestructure(p) { return p.sal.length >= 2 && (p.sal[0] || 0) > L.minSal(p.exp) + 3 && !p.rs; }
  function restructure(pid) {
    var p = L.player(pid); if (!p || !canRestructure(p)) return 0;
    var n = Math.min(5, p.sal.length), conv = Math.round(((p.sal[0] - L.minSal(p.exp)) * 0.8) * 1000) / 1000, per = conv / n;
    p.bon = p.bon || p.sal.map(function () { return 0; });
    for (var i = 0; i < n; i++) { p.sal[i] = Math.round((p.sal[i] + per - (i === 0 ? conv : 0)) * 1000) / 1000; p.bon[i] = Math.round(((p.bon[i] || 0) + per) * 1000) / 1000; }
    p.rs = S().season;
    return Math.round((conv - per) * 100) / 100;
  }
  function capFix(tid, buffer) {
    var g = 0;
    while (L.capSpace(tid) < buffer && g++ < 12) {
      var r = L.roster(tid).filter(canRestructure).sort(function (a, b) { return b.sal[0] - a.sal[0]; });
      if (r.length) { restructure(r[0].id); continue; }
      break;
    }
    g = 0;
    while (L.capSpace(tid) < Math.min(0, buffer) + 0.01 && g++ < 45) {
      var bp = L.byPos(tid), keep = {};
      Object.keys(L.STARTERS).forEach(function (pos) { bp[pos].slice(0, L.STARTERS[pos]).forEach(function (p) { if (p.ovr >= 84) keep[p.id] = 1; }); });
      var c = L.roster(tid).filter(function (p) { return !keep[p.id] && (p.sal[0] || 0) - deadIf(p) > 0.8; })
        .sort(function (a, b) { return (L.playerValue(a, tid) / ((a.sal[0] - deadIf(a)) + 1)) - (L.playerValue(b, tid) / ((b.sal[0] - deadIf(b)) + 1)); });
      if (!c.length) break;
      release(c[0].id, true);
    }
  }
  // CPU teams sign cheap players when they get thin
  function cpuFillRosters() {
    var s = S();
    L.teamIds().forEach(function (tid) {
      if (tid === s.user) return;
      var g = 0;
      while (L.roster(tid).length < L.ROSTER_MIN && g++ < 30) {
        var fas = freeAgents(); if (!fas.length) { makeFiller(40); fas = freeAgents(); }
        var best = null, bs = -1e9;
        fas.slice(0, 120).forEach(function (p) { var sc = needScore(p, tid, 'fa'); if (sc > bs) { bs = sc; best = p; } });
        if (!best) break;
        L.mv(best, tid); best.sal = [L.minSal(best.exp)]; best.bon = [0]; delete best.ask;
      }
      // also fill any empty starting spot (injuries)
      var bp = L.byPos(tid);
      ['QB', 'K', 'P'].forEach(function (pos) {
        var healthy = bp[pos].filter(function (p) { return !(p.inj > 0); });
        if (!healthy.length && L.roster(tid).length < L.rosterMax()) {
          var f = freeAgents().filter(function (p) { return p.pos === pos; })[0];
          if (f) { L.mv(f, tid); f.sal = [L.minSal(f.exp)]; f.bon = [0]; delete f.ask; }
        }
      });
    });
  }
  function startSeason() {
    var s = S();
    if (L.roster(s.user).length > L.ROSTER_MAX) return 'Cut down to ' + L.ROSTER_MAX + ' players first.';
    if (L.roster(s.user).length < L.ROSTER_MIN) return 'You need at least ' + L.ROSTER_MIN + ' players.';
    if (L.capSpace(s.user) < 0) return 'You are ' + U.money(-L.capSpace(s.user)) + ' over the cap. Cut, trade or restructure someone (or tap FIX MY CAP).';
    L.teamIds().forEach(function (tid) { if (tid !== s.user) { cutDown(tid, L.ROSTER_MAX); capFix(tid, 0.5); } });
    cpuFillRosters();
    if (s.lenNext) { s.len = s.lenNext; s.lenNext = null; }
    s.phase = 'regular';
    Sim.newSeason();
    L.setStrategies();
    L.news('The ' + s.season + ' season kicks off.', 'big');
    return null;
  }

  // ---------- NFL draft ----------
  function startDraft() {
    var s = S(), po = s.po, ids = L.teamIds();
    var exitRound = {}; po.games.forEach(function (g) { var loser = g.hs > g.as ? g.a : g.h; exitRound[loser] = g.r + 1; });
    if (po.champ) exitRound[po.champ] = 5;
    var order = ids.slice().sort(function (a, b) {
      var ea = exitRound[a] || 0, eb = exitRound[b] || 0;
      if (ea !== eb) return ea - eb;
      var ta = L.team(a), tb = L.team(b);
      return Sim.wp(ta) - Sim.wp(tb) || (ta.pf - ta.pa) - (tb.pf - tb.pa);
    });
    s.draftOrder = order;
    var year = s.season + 1;
    makeDraftClass(year);
    var list = [];
    for (var r = 1; r <= L.ROUNDS; r++) order.forEach(function (o, i) {
      var pk = s.picks.filter(function (x) { return x.y === year && x.r === r && x.o === o; })[0];
      if (pk) list.push({ pid: pk.id, r: r, slot: i + 1, n: (r - 1) * order.length + i + 1, h: pk.h, o: o });
    });
    s.dr = { year: year, list: list, i: 0, log: [] };
    s.phase = 'draft'; s.weekLabel = year + ' Draft';
    var mine = list.filter(function (x) { return x.h === s.user; });
    L.news('The ' + year + ' NFL Draft is here. You have ' + mine.length + ' pick' + (mine.length === 1 ? '' : 's') + (mine.length ? ', first at #' + mine[0].n : '') + '.', 'you big');
  }
  function drCurrent() { var d = S().dr; if (!d) return null; var c = d.list[d.i]; if (c) { var pk = Trade.pk(c.pid); if (pk) c.h = pk.h; } return c || null; }
  function draftPlayer(pid) {
    var s = S(), d = s.dr, cur = drCurrent(); if (!cur) return;
    var p = L.player(pid); if (!p || p.t !== 'DC') return;
    L.mv(p, cur.h); p.sal = L.rookieDeal(cur.n).map(function (x) { return x / Math.pow(L.GROW, 0); }); p.bon = p.sal.map(function (x) { return Math.round(x * (cur.r <= 2 ? 0.45 : 0.15) * 1000) / 1000; });
    p.exp = 0; p.dp = cur.n; p.dr = cur.r; p.dyr = d.year; delete p.scout;
    // rookie deal starts next season (the season flips after the draft), so add a blank year for now
    p.sal.unshift(0); p.bon.unshift(0);
    d.log.unshift({ n: cur.n, r: cur.r, t: cur.h, p: pid });
    if (cur.h === s.user || (cur.n <= 5)) L.news((cur.h === s.user ? 'You draft ' : L.shortName(cur.h) + ' take ') + p.pos + ' ' + p.n + ' (' + (p.school || '') + ') at #' + cur.n + '.', cur.h === s.user ? 'you' : '');
    s.picks = s.picks.filter(function (x) { return x.id !== cur.pid; });
    d.i++;
    if (d.i >= d.list.length) endDraft();
  }
  function cpuDraftPick() {
    var cur = drCurrent(); if (!cur) return;
    var best = null, bs = -1e9;
    draftClass().slice(0, 60).forEach(function (p) { var sc = needScore(p, cur.h, 'draft') + (U.rnd() - 0.5) * 3; if (sc > bs) { bs = sc; best = p; } });
    if (best) draftPlayer(best.id); else { S().dr.i = S().dr.list.length; endDraft(); }
  }
  function drSimToUser() { var s = S(), g = 0; while (s.phase === 'draft' && drCurrent() && drCurrent().h !== s.user && g++ < 400) cpuDraftPick(); }
  function drAutoAll() { var s = S(), g = 0; while (s.phase === 'draft' && drCurrent() && g++ < 400) cpuDraftPick(); }
  function endDraft() {
    var s = S();
    if (s.phase !== 'draft') return;
    // undrafted prospects: a few become free agents, the rest go home
    draftClass().forEach(function (p, i) { if (i < 25) { L.mv(p, 'FA'); p.sal = []; p.bon = []; delete p.scout; p.exp = 0; } else { delete s.players[p.id]; L.dirty(); } });
    s.lastDraft = { year: s.dr.year, log: s.dr.log.slice(0, 260).reverse() };
    s.dr = null;
    newLeagueYear();
  }

  // ---------- new league year: contracts, aging, retirements ----------
  function progress(p) {
    var pk = L.peakAge(p.pos), d;
    if (p.age <= pk - 3) d = U.ri(1, 5) + (p.pot - p.ovr > 12 ? U.ri(0, 3) : 0);
    else if (p.age <= pk) d = U.ri(-1, 3);
    else d = -U.ri(0, 2) - Math.max(0, Math.round((p.age - pk) * 0.7 + U.rnd() * 2)) - (p.pos === 'RB' ? 1 : 0);
    if (p.ovr + d > p.pot && d > 0) d = Math.max(0, p.pot - p.ovr + (U.rnd() < 0.15 ? 2 : 0));
    p.ovr = U.clamp(p.ovr + d, 35, 99); p.pot = Math.max(p.ovr, p.age >= pk ? p.ovr : p.pot - (U.rnd() < 0.3 ? 1 : 0));
    if (p.pos !== 'K' && p.pos !== 'P') p.spd = U.clamp(p.spd - (p.age >= 28 ? U.ri(0, 2) : 0) + (p.age <= 23 ? U.ri(0, 1) : 0), 40, 99);
    p.prog = d;
  }
  function retires(p) {
    var late = p.pos === 'QB' || p.pos === 'K' || p.pos === 'P' || p.pos === 'LS' ? 4 : 0;
    if (p.age >= 37 + late) return true;
    if (p.age >= 33 + late && p.ovr < 76 && U.rnd() < 0.45) return true;
    if (p.age >= 30 + late && p.ovr < 62 && U.rnd() < 0.5) return true;
    if (p.age >= 35 + late && U.rnd() < 0.35) return true;
    return false;
  }
  function newLeagueYear() {
    var s = S();
    s.season++;
    s.po = null;
    var gone = [];
    Object.keys(s.players).forEach(function (k) {
      var p = s.players[k];
      if (p.t === 'DC') return;
      var rookie = !!p.dyr;
      p.age++; p.exp = (p.exp || 0) + 1; if (p.dyr) { p.exp = 0; p.dyr = null; p.rook = s.season + 1; }
      if (p.sal && p.sal.length) { p.sal.shift(); p.bon = (p.bon || []).slice(1); }
      if (p.pst) p.pst = null;
      if (retires(p)) { if (p.ovr >= 82 || p.t === s.user) gone.push(p); delete s.players[k]; L.dirty(); return; }
      if (!rookie) progress(p); else p.prog = 0;
      if (p.t === 'FA' && (p.ovr < 60 || p.age >= 33)) { delete s.players[k]; L.dirty(); return; }
      if (L.team(p.t) && !p.sal.length) p.expiring = true;
    });
    if (gone.length) L.news('Retired: ' + gone.slice(0, 8).map(function (p) { return p.n; }).join(', ') + (gone.length > 8 ? ' and more' : '') + '.', '');
    L.teamIds().forEach(function (tid) { var t = L.team(tid); t.dead = (t.dead || []).filter(function (d) { return d.y >= s.season; }); t.tagUsed = false; });
    var fa = freeAgents(); fa.slice(320).forEach(function (p) { delete s.players[p.id]; }); L.dirty();
    L.teamIds().forEach(function (tid) { if (tid !== s.user) capFix(tid, 4); });
    L.addPicksForYear(s.season + L.PICK_YEARS);
    s.draftOrder = null;
    s.phase = 'resign'; s.weekLabel = 'Re-sign';
    expiring().forEach(setAsk);
    L.setStrategies();
  }
  function expiring(tid) { var P = S().players, out = []; for (var k in P) if (P[k].expiring && (!tid || P[k].t === tid)) out.push(P[k]); return out.sort(function (a, b) { return b.ovr - a.ovr; }); }
  function setAsk(p) {
    var ageF = p.age >= 33 ? 0.6 : p.age >= 30 ? 0.82 : 1, amt = L.apy(p.ovr + (p.age <= 25 ? (p.pot - p.ovr) * 0.3 : 0), p.pos) * ageF * (0.92 + U.rnd() * 0.2);
    amt = Math.max(L.minSal(p.exp), Math.round(amt * 100) / 100);
    var yrs = p.age >= 32 ? 1 : p.age >= 29 ? U.ri(1, 3) : U.ri(2, 5);
    p.ask = { amt: amt, yrs: yrs };
    return p.ask;
  }
  function tagAmount(pos) {
    var sal = []; for (var k in S().players) { var p = S().players[k]; if (p.pos === pos && L.team(p.t) && p.sal[0]) sal.push(p.sal[0]); }
    sal.sort(function (a, b) { return b - a; });
    return Math.round(U.avg(sal.slice(0, 5)) * 100) / 100 || L.minSal(4);
  }
  function sign(p, tid, amt, yrs, bonusPct) {
    var s = S(), sal = [];
    for (var i = 0; i < yrs; i++) sal.push(Math.round(amt * (1 + i * 0.04) * 1000) / 1000);
    L.mv(p, tid); p.sal = sal; p.bon = sal.map(function (x) { return Math.round(x * (bonusPct || 0.25) * 1000) / 1000; }); delete p.ask; p.expiring = false;
  }
  function resign(pid, tag) {
    var s = S(), p = L.player(pid); if (!p || !p.expiring) return 'Not expiring.';
    var t = L.team(p.t);
    if (tag) {
      if (t.tagUsed) return 'You already used your franchise tag this year.';
      var amt = Math.max(tagAmount(p.pos), (p.ask ? p.ask.amt : 0) * 1.05);
      if (L.capSpace(p.t) < amt) return 'Not enough cap space for the tag (' + U.money(amt) + ').';
      sign(p, p.t, amt, 1, 0); t.tagUsed = true; p.tagged = s.season;
      L.news((p.t === s.user ? 'You franchise tag ' : L.shortName(p.t) + ' franchise tag ') + p.n + ' for ' + U.money(amt) + '.', p.t === s.user ? 'you' : '');
      return null;
    }
    var ask = p.ask || setAsk(p);
    if (L.capSpace(p.t) < ask.amt) return 'Not enough cap space (' + U.money(ask.amt) + ' needed, you have ' + U.money(L.capSpace(p.t)) + ').';
    sign(p, p.t, ask.amt, ask.yrs);
    if (p.t === s.user) L.news('You re-sign ' + p.n + ': ' + ask.yrs + ' yrs, ' + U.money(ask.amt) + ' a year.', 'you');
    return null;
  }
  function letGo(pid) { var p = L.player(pid); if (!p) return; p.expiring = false; L.mv(p, 'FA'); p.sal = []; p.bon = []; setAsk(p); }
  function cpuResign() {
    var s = S();
    L.teamIds().forEach(function (tid) {
      if (tid === s.user) return;
      var t = L.team(tid);
      expiring(tid).forEach(function (p) {
        var ask = p.ask || setAsk(p), v = L.playerValue(p, tid);
        if (!t.tagUsed && p.ovr >= 86 && p.age <= 30 && L.capSpace(tid) > tagAmount(p.pos) + 6 && U.rnd() < 0.6) { resign(p.id, true); return; }
        if (v > ask.amt * 0.6 && p.ovr >= 66 && L.capSpace(tid) > ask.amt + 4 && U.rnd() < 0.8) resign(p.id);
        else letGo(p.id);
      });
    });
  }
  function toFreeAgency() {
    var s = S();
    cpuResign();
    expiring(s.user).forEach(function (p) { letGo(p.id); });
    s.phase = 'fa'; s.faDay = 1; s.weekLabel = 'Free agency';
    freeAgents().forEach(function (p) { if (!p.ask) setAsk(p); });
    var top = freeAgents().slice(0, 3).map(function (p) { return p.n; });
    L.news('Free agency is open. Top names: ' + top.join(', ') + '.', 'big');
  }
  // you make an offer: yes / no right away
  function offer(pid, amt, yrs) {
    var s = S(), p = L.player(pid); if (!p || p.t !== 'FA') return { ok: false, msg: 'He is not a free agent.' };
    if (L.roster(s.user).length >= L.rosterMax()) return { ok: false, msg: 'Your roster is full.' };
    var ask = p.ask || setAsk(p), isMin = amt <= L.minSal(p.exp) + 0.001;
    if (!isMin && L.capSpace(s.user) < amt) return { ok: false, msg: 'Not enough cap space. You have ' + U.money(L.capSpace(s.user)) + '.' };
    var need = ask.amt * ({ 1: 1, 2: 0.9, 3: 0.78 }[s.faDay || 1] || 0.7) * (s.phase === 'regular' || s.phase === 'pre' ? 0.85 : 1);
    var yf = Math.abs(yrs - ask.yrs) <= 1 ? 1 : 0.92;
    if (amt * yf + 0.001 < need) return { ok: false, msg: p.n + ' wants about ' + U.money(need) + ' a year (' + ask.yrs + ' yrs).' };
    sign(p, s.user, amt, yrs, 0.2);
    L.news('You sign ' + p.pos + ' ' + p.n + ': ' + yrs + ' yr' + (yrs > 1 ? 's' : '') + ', ' + U.money(amt) + ' a year.', 'you');
    return { ok: true };
  }
  function cpuFaDay() {
    var s = S(), ids = U.shuffle(L.teamIds().filter(function (id) { return id !== s.user; }));
    var mult = { 1: 1, 2: 0.9, 3: 0.78 }[s.faDay] || 0.75;
    for (var pass = 0; pass < 3; pass++) ids.forEach(function (tid) {
      if (L.roster(tid).length >= 60) return;
      var fas = freeAgents().filter(function (p) { return p.ovr >= 64; }).slice(0, 80), best = null, bs = -1e9;
      fas.forEach(function (p) { var a = (p.ask || setAsk(p)).amt * mult; if (a > L.capSpace(tid) - 2) return; var sc = needScore(p, tid, 'fa') - a * 0.12; if (sc > bs) { bs = sc; best = p; } });
      if (best && bs > 62) {
        var a = best.ask.amt * mult;
        sign(best, tid, Math.round(a * 100) / 100, best.ask.yrs);
        if (best.ovr >= 80) L.news(L.shortName(tid) + ' sign ' + best.pos + ' ' + best.n + ' (' + best.ovr + '): ' + best.sal.length + ' yrs, ' + U.money(best.sal[0]) + '.', '');
      }
    });
  }
  function nextFaDay() {
    var s = S();
    cpuFaDay();
    s.faDay++;
    if (s.faDay > 3) { preseason(); L.news('Free agency is winding down. Time for cut-down day.', 'big'); }
  }

  return { newPlayer: newPlayer, makeFiller: makeFiller, makeDraftClass: makeDraftClass, draftClass: draftClass, grade: grade, freeAgents: freeAgents, needScore: needScore,
    setupFantasy: setupFantasy, autoTag: autoTag, beginFantasy: beginFantasy, pool: pool, fdCurrent: fdCurrent, fdPick: fdPick, cpuFdPick: cpuFdPick, fdSimToUser: fdSimToUser, fdAutoAll: fdAutoAll, tagScore: tagScore,
    preseason: preseason, canRestructure: canRestructure, restructure: restructure, capFix: capFix, cutDown: cutDown, deadIf: deadIf, release: release, cpuFillRosters: cpuFillRosters, startSeason: startSeason,
    startDraft: startDraft, drCurrent: drCurrent, draftPlayer: draftPlayer, cpuDraftPick: cpuDraftPick, drSimToUser: drSimToUser, drAutoAll: drAutoAll,
    expiring: expiring, setAsk: setAsk, tagAmount: tagAmount, resign: resign, letGo: letGo, toFreeAgency: toFreeAgency, offer: offer, nextFaDay: nextFaDay };
})();
