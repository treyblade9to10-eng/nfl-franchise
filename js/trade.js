// trade.js - trade rules (hard cap + roster limits), CPU trade brain, offers
var Trade = (function () {
  function S() { return G.S; }
  function salOf(ids) { return U.sum(ids.map(L.player), function (p) { return p.sal[0] || 0; }); }
  function pk(id) { return S().picks.filter(function (p) { return p.id === id; })[0]; }

  // tr = {a, b, ap:[pids a gives], bp:[pids b gives], apk:[pick ids a gives], bpk:[]}
  function validate(tr) {
    var errs = [];
    [['a', 'ap', 'bp'], ['b', 'bp', 'ap']].forEach(function (x) {
      var tid = tr[x[0]], out = tr[x[1]], inc = tr[x[2]];
      var n = L.roster(tid).length - out.length + inc.length, mx = L.rosterMax();
      if (n > mx && inc.length > out.length) errs.push(L.shortName(tid) + ' would have ' + n + ' players (max ' + mx + ').');
      var so = salOf(out), si = salOf(inc), space = L.capSpace(tid);
      if (si > so && space - (si - so) < 0) errs.push(L.shortName(tid) + ' do not have the cap space: taking on ' + U.money(si - so) + ' more with ' + U.money(Math.max(0, space)) + ' of room.');
    });
    if (!tr.ap.length && !tr.bp.length && !tr.apk.length && !tr.bpk.length) errs.push('Add something to the trade.');
    if (!Sim.tradeOpen()) errs.push(S().phase === 'regular' ? 'The trade deadline has passed.' : 'Trades are closed right now.');
    return errs;
  }
  function need(tid, pos, delta) { // how much a team wants a position right now
    var bp = L.byPos(tid), list = bp[pos] || [], st = L.STARTERS[pos] || 0;
    var cnt = list.length + (delta || 0);
    return cnt < st ? 1.15 : cnt < (L.NEED[pos] || 0) ? 1.0 : 0.85;
  }
  // how the CPU team (tr.b) feels about it
  function evaluate(tr) {
    var b = tr.b;
    var vin = U.sum(tr.ap.map(L.player), function (p) { return L.playerValue(p, b) * need(b, p.pos); }) + U.sum(tr.apk.map(pk), function (p) { return L.pickValue(p, b); });
    var vout = U.sum(tr.bp.map(L.player), function (p) { return L.playerValue(p, b) * need(b, p.pos, -1); }) + U.sum(tr.bpk.map(pk), function (p) { return L.pickValue(p, b); });
    // they hate giving up their starting QB
    tr.bp.forEach(function (id) { var p = L.player(id), qb = L.byPos(b).QB[0]; if (qb && qb.id === id && L.team(b).strat === 'contend') vout *= 1.2; });
    var extra = L.roster(b).length - tr.bp.length + tr.ap.length - L.rosterMax();
    if (extra > 0) vin -= extra * 1.5;
    var margin = 1 + Math.abs(vout) * 0.05;
    var scale = Math.max(10, (Math.abs(vin) + Math.abs(vout)) / 2);
    var pct = Math.round(U.clamp(80 + 100 * (vin - vout - margin) / scale, 0, 100));
    return { vin: vin, vout: vout, pct: pct, ok: pct >= 80 };
  }
  function execute(tr) {
    var s = S();
    tr.ap.forEach(function (id) { var p = L.player(id); L.mv(p, tr.b); p.traded = s.season; });
    tr.bp.forEach(function (id) { var p = L.player(id); L.mv(p, tr.a); p.traded = s.season; });
    tr.apk.forEach(function (id) { pk(id).h = tr.b; });
    tr.bpk.forEach(function (id) { pk(id).h = tr.a; });
    [tr.a, tr.b].forEach(function (tid) { var t = L.team(tid); if (t.depth) Object.keys(t.depth).forEach(function (k) { t.depth[k] = t.depth[k].filter(function (x) { var p = L.player(x); return p && p.t === tid; }); }); });
    var desc = describe(tr);
    s.tradeLog.unshift({ season: s.season, d: s.weekLabel, txt: desc });
    if (s.tradeLog.length > 120) s.tradeLog.length = 120;
    L.news('TRADE: ' + desc, (tr.a === s.user || tr.b === s.user) ? 'you' : 'trade');
  }
  function describe(tr) {
    function side(pl, pks) { return pl.map(function (id) { var p = L.player(id); return p.pos + ' ' + p.n; }).concat(pks.map(function (id) { return L.pickLabel(pk(id)); })).join(', ') || 'nothing'; }
    return L.shortName(tr.a) + ' get ' + side(tr.bp, tr.bpk) + '. ' + L.shortName(tr.b) + ' get ' + side(tr.ap, tr.apk) + '.';
  }

  // CPU team "b" builds a package for what "a" is giving
  function buildOffer(a, b, ap, apk) {
    var tr = { a: a, b: b, ap: ap.slice(), bp: [], apk: apk.slice(), bpk: [] };
    var target = evaluate(tr).vin;
    if (target <= 1.5) return null;
    var t = L.team(b), bp = L.byPos(b), core = {};
    if (bp.QB[0]) core[bp.QB[0].id] = 1;
    L.roster(b).sort(function (x, y) { return y.ovr - x.ovr; }).slice(0, t.strat === 'contend' ? 4 : 0).forEach(function (p) { core[p.id] = 1; });
    var incPos = ap.map(function (id) { return L.player(id).pos; });
    var assets = L.roster(b).filter(function (p) { return !core[p.id] && p.ovr >= 60; }).map(function (p) { return { k: 'p', id: p.id, v: L.playerValue(p, b) * need(b, p.pos, -1), sal: p.sal[0] || 0, pos: p.pos }; })
      .concat(L.picksOf(b).map(function (p) { return { k: 'k', id: p.id, v: L.pickValue(p, b), sal: 0 }; }))
      .filter(function (x) { return x.v > 0.4; });
    // prefer giving back a player at the same spot (swap), then the best fits
    var cap = (target - 1.2) / 1.06, got = 0, spaceA = L.capSpace(a) + salOf(ap), spaceB = L.capSpace(b) - salOf(ap), gotSal = 0;
    assets.sort(function (x, y) { return (incPos.indexOf(y.pos) >= 0) - (incPos.indexOf(x.pos) >= 0) || y.v - x.v; });
    // need to send salary back if B is tight
    for (var i = 0; i < assets.length && spaceB + gotSal < 0; i++) {
      var x = assets[i]; if (x.k !== 'p' || x.v > cap || x.sal > spaceA - gotSal) continue;
      tr.bp.push(x.id); got += x.v; gotSal += x.sal; x.used = 1;
    }
    var rest = assets.filter(function (x) { return !x.used; }).sort(function (x, y) { return y.v - x.v; });
    for (i = 0; i < rest.length && got < cap * 0.82; i++) {
      x = rest[i]; if (got + x.v > cap) continue;
      if (x.k === 'p' && x.sal > spaceA - gotSal) continue;
      if (x.k === 'p') { tr.bp.push(x.id); gotSal += x.sal; } else tr.bpk.push(x.id);
      got += x.v;
      if (tr.bp.length + tr.bpk.length >= 4) break;
    }
    if (!tr.bp.length && !tr.bpk.length) return null;
    if (validate(tr).length || !evaluate(tr).ok) return null;
    return tr;
  }
  function offersFor(ap, apk) {
    var s = S(), out = [];
    L.teamIds().forEach(function (b) {
      if (b === s.user) return;
      var tr = buildOffer(s.user, b, ap, apk);
      if (tr) { tr.myV = U.sum(tr.bp.map(L.player), function (p) { return L.playerValue(p, s.user); }) + U.sum(tr.bpk.map(pk), function (p) { return L.pickValue(p, s.user); }); out.push(tr); }
    });
    return out.sort(function (x, y) { return y.myV - x.myV; }).slice(0, 6);
  }
  // CPU asks for more from you until it works
  function whatTheyWant(tr) {
    var g = 0, a = tr.a;
    while (!evaluate(tr).ok && g++ < 6) {
      var ev = evaluate(tr), gap = ev.vout - ev.vin + 2 + Math.abs(ev.vout) * 0.05;
      var cands = L.roster(a).filter(function (p) { return tr.ap.indexOf(p.id) < 0; }).map(function (p) { return { k: 'p', id: p.id, v: L.playerValue(p, tr.b) * need(tr.b, p.pos) }; })
        .concat(L.picksOf(a).filter(function (p) { return tr.apk.indexOf(p.id) < 0; }).map(function (p) { return { k: 'k', id: p.id, v: L.pickValue(p, tr.b) }; }))
        .filter(function (x) { return x.v > 0.5; }).sort(function (x, y) { return x.v - y.v; });
      if (!cands.length) return false;
      var one = cands.filter(function (x) { return x.v >= gap; })[0] || cands[cands.length - 1];
      var test = JSON.parse(JSON.stringify(tr));
      if (one.k === 'p') test.ap.push(one.id); else test.apk.push(one.id);
      if (validate(test).some(function (e) { return /cap space|players \(max/.test(e); })) {
        var pks = cands.filter(function (x) { return x.k === 'k'; });
        if (!pks.length) return false;
        one = pks.filter(function (x) { return x.v >= gap; })[0] || pks[pks.length - 1];
        test = JSON.parse(JSON.stringify(tr)); test.apk.push(one.id);
      }
      tr.ap = test.ap; tr.apk = test.apk;
    }
    return evaluate(tr).ok;
  }

  function cpuWeekly() { for (var k = 0; k < 2; k++) if (U.rnd() < 0.35) cpuTry(); }
  function cpuTry() {
    var s = S(), ids = L.teamIds().filter(function (id) { return id !== s.user; });
    var sellers = ids.filter(function (id) { return L.team(id).strat === 'rebuild'; }), buyers = ids.filter(function (id) { return L.team(id).strat === 'contend'; });
    if (!sellers.length || !buyers.length) return;
    var sel = U.pick(sellers), vets = L.roster(sel).filter(function (p) { return p.age >= 27 && p.ovr >= 78 && p.pos !== 'K' && p.pos !== 'P'; });
    if (!vets.length) return;
    var v = U.pick(vets), tries = U.shuffle(buyers.slice()).slice(0, 5);
    for (var i = 0; i < tries.length; i++) {
      var tr = buildOffer(sel, tries[i], [v.id], []);
      if (!tr) continue;
      var rev = { a: tr.b, b: tr.a, ap: tr.bp, bp: tr.ap, apk: tr.bpk, bpk: tr.apk };
      if (evaluate(rev).pct >= 60) { execute(tr); return; }
    }
  }
  function incomingOffer() {
    var s = S(); if (!Sim.tradeOpen()) return null;
    var mine = L.roster(s.user).filter(function (p) { return p.ovr >= 76 && p.pos !== 'K' && p.pos !== 'P'; });
    if (!mine.length) return null;
    var p = U.pick(mine), offs = offersFor([p.id], []);
    return offs[0] || null;
  }
  return { validate: validate, evaluate: evaluate, execute: execute, describe: describe, offersFor: offersFor, whatTheyWant: whatTheyWant, cpuWeekly: cpuWeekly, incomingOffer: incomingOffer, pk: pk, salOf: salOf, buildOffer: buildOffer };
})();
