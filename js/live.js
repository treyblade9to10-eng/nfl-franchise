// live.js - play-by-play football game you call yourself (offense AND defense)
var Live = (function () {
  function S() { return G.S; }
  var OFF = [
    { k: 'inside', n: 'Inside Zone', t: 'run', d: 'Run between the tackles' },
    { k: 'outside', n: 'Outside Toss', t: 'run', d: 'Get the RB to the edge' },
    { k: 'keeper', n: 'QB Keeper', t: 'run', d: 'QB runs it (fast QBs)' },
    { k: 'quick', n: 'Quick Slants', t: 'pass', dp: 's', d: 'Fast and safe, short gain' },
    { k: 'screen', n: 'RB Screen', t: 'pass', dp: 'scr', d: 'Beats the blitz' },
    { k: 'mid', n: 'Crossers', t: 'pass', dp: 'm', d: 'Middle of the field, 10-15' },
    { k: 'deep', n: 'Four Verticals', t: 'pass', dp: 'd', d: 'Go deep. Boom or bust' },
    { k: 'pa', n: 'Play Action', t: 'pass', dp: 'd', pa: 1, d: 'Fake run, deep shot' }
  ];
  var DEF = [
    { k: 'run', n: 'Run Blitz', d: 'Stack the box vs the run' },
    { k: 'c2', n: 'Cover 2', d: 'Two deep, tough on deep balls' },
    { k: 'c3', n: 'Cover 3', d: 'Balanced zone' },
    { k: 'man', n: 'Cover 1 Man', d: 'Tight coverage, one safety' },
    { k: 'blitz', n: 'Zero Blitz', d: 'Send everyone. Sacks or big plays' },
    { k: 'prevent', n: 'Prevent', d: 'Give up short, stop the deep ball' }
  ];
  // yards bonus for each offense call vs each defense call
  var MOD = {
    inside: { run: -2.6, c2: 1.0, c3: 0.2, man: 0.4, blitz: -1.2, prevent: 2.6 },
    outside: { run: -2.0, c2: 0.6, c3: 0.0, man: 0.8, blitz: 0.5, prevent: 2.2 },
    keeper: { run: -1.6, c2: 1.2, c3: 0.6, man: 2.0, blitz: -0.5, prevent: 2.5 },
    quick: { run: 1.5, c2: 0.4, c3: 1.4, man: -1.2, blitz: 2.0, prevent: 1.8 },
    screen: { run: -1.5, c2: 0.6, c3: 0.0, man: 0.5, blitz: 5.0, prevent: 1.5 },
    mid: { run: 2.5, c2: 2.2, c3: -0.6, man: -1.0, blitz: 1.0, prevent: 0.6 },
    deep: { run: 5.0, c2: -5.0, c3: -2.0, man: 3.5, blitz: 5.0, prevent: -7.0 },
    pa: { run: 7.0, c2: -4.0, c3: -2.5, man: 2.0, blitz: -1.0, prevent: -7.0 }
  };
  function find(list, k) { return list.filter(function (x) { return x.k === k; })[0]; }

  // ---------- setup ----------
  function rosterFor(tid) {
    var lu = Sim.lineup(tid), st = lu.st;
    function ids(a) { return a.filter(Boolean).map(function (p) { return p.id; }); }
    return {
      qb: lu.qb ? lu.qb.id : null, rbs: ids(lu.rbs), wrs: ids(lu.wrs), tes: ids(lu.tes), k: lu.k ? lu.k.id : null, p: lu.p ? lu.p.id : null,
      ol: U.avg(st.OT.concat(st.G).concat(st.C), function (x) { return x.r; }), rush: U.avg(st.EDGE.concat(st.DT), function (x) { return x.r; }),
      lb: U.avg(st.LB, function (x) { return x.r; }), cb: U.avg(st.CB, function (x) { return x.r; }), sf: U.avg(st.S, function (x) { return x.r; }),
      def: { EDGE: ids(lu.def.EDGE), DT: ids(lu.def.DT), LB: ids(lu.def.LB), CB: ids(lu.def.CB), S: ids(lu.def.S) }
    };
  }
  function start(h, a, o) {
    o = o || {};
    var s = S(), lv = { h: h, a: a, sc: { h: 0, a: 0 }, qs: { h: [0, 0, 0, 0], a: [0, 0, 0, 0] }, q: 1, clock: 900, poss: null, yl: 25, down: 1, togo: 10,
      to: { h: 3, a: 3 }, box: {}, tm: { h: tmBlank(), a: tmBlank() }, pbp: [], me: h === s.user ? 'h' : 'a', ro: { h: rosterFor(h), a: rosterFor(a) },
      playoff: !!o.playoff, neutral: !!o.neutral, over: false, ot: false, wait: 'coin', last: null, hist: [], warn2: false, po: o.po || null };
    return lv;
  }
  function tmBlank() { return { py: 0, ry: 0, fd: 0, to: 0, sk: 0, plays: 0, top: 0, pen: 0 }; }
  function other(side) { return side === 'h' ? 'a' : 'h'; }
  function tid(lv, side) { return side === 'h' ? lv.h : lv.a; }
  function P(id) { return id ? L.player(id) : null; }
  function nm(id) { var p = P(id); return p ? U.lastName(p.n) : 'Somebody'; }
  function line(lv, id) { if (!id) return null; var p = P(id); return lv.box[id] || (lv.box[id] = { id: id, t: p ? p.t : null }); }
  function inc(o, k, v) { if (o) o[k] = (o[k] || 0) + v; }
  function clockStr(c) { c = Math.max(0, Math.round(c)); return Math.floor(c / 60) + ':' + ('0' + (c % 60)).slice(-2); }
  function spot(lv) { var o = tid(lv, lv.poss), d = tid(lv, other(lv.poss)); return lv.yl === 50 ? '50' : lv.yl < 50 ? o + ' ' + lv.yl : d + ' ' + (100 - lv.yl); }
  function ddStr(lv) { var g = lv.yl + lv.togo >= 100; return U.ord(lv.down) + ' & ' + (g ? 'Goal' : lv.togo); }
  function log(lv, txt, kind) {
    var e = { q: lv.q, c: clockStr(lv.clock), t: txt, k: kind || '', s: lv.poss };
    lv.pbp.push(e); if (lv.pbp.length > 220) lv.pbp.shift();
    lv.last = e;
  }
  function addScore(lv, side, pts) { lv.sc[side] += pts; var qi = Math.min(lv.q - 1, 4); if (lv.qs[side][qi] == null) lv.qs[side][qi] = 0; lv.qs[side][qi] += pts; }

  // ---------- kickoffs ----------
  function kickoff(lv, recv, freeKick) {
    lv.poss = recv; var kt = tid(lv, other(recv));
    var r = U.rnd(), ret = P(lv.ro[recv].wrs[2] || lv.ro[recv].rbs[1] || lv.ro[recv].rbs[0]);
    if (!freeKick && r < 0.62) { lv.yl = 35; log(lv, L.shortName(kt) + ' kick off. Touchback, ball at the 35.', 'kick'); }
    else if (r < 0.996) { lv.yl = U.clamp(Math.round((freeKick ? 38 : 27) + U.gauss() * 7 + (ret ? (ret.spd - 88) * 0.4 : 0)), 8, 60); log(lv, (ret ? nm(ret.id) : 'Returner') + ' brings the kick back to the ' + (lv.yl < 50 ? tid(lv, recv) + ' ' + lv.yl : tid(lv, other(recv)) + ' ' + (100 - lv.yl)) + '.', 'kick'); }
    else { log(lv, (ret ? nm(ret.id) : 'Returner') + ' takes the kick ALL THE WAY BACK! Touchdown!', 'td'); lv.yl = 100; touchdown(lv, ret ? ret.id : null, 'ret'); return; }
    lv.down = 1; lv.togo = 10; lv.drive = { yl: lv.yl, n: 0, t: lv.clock };
    lv.clock -= freeKick ? 5 : 4;
    lv.wait = 'play';
  }
  function touchdown(lv, scorer, how) {
    var side = lv.poss;
    addScore(lv, side, 6);
    lv.wait = 'pat';
    lv.tdBy = scorer;
    if (sideIsCpu(lv, side)) pat(lv, cpuPat(lv));
  }
  function sideIsCpu(lv, side) { return lv.auto || side !== lv.me; }
  function cpuPat(lv) {
    var side = lv.poss, diff = lv.sc[side] - lv.sc[other(side)], late = lv.q >= 4 && lv.clock < 600;
    if (late && [-2, -5, -10, -13, 1, 5].indexOf(diff) >= 0) return 'two';
    return U.rnd() < 0.03 ? 'two' : 'xp';
  }
  function pat(lv, kind) {
    var side = lv.poss, ro = lv.ro[side], k = P(ro.k), kl = line(lv, ro.k);
    if (kind === 'two') {
      var ok = U.rnd() < 0.47;
      if (ok) { addScore(lv, side, 2); log(lv, 'Two-point try is GOOD.', 'score'); } else log(lv, 'Two-point try fails.', 'bad');
    } else {
      var make = U.rnd() < U.clamp(0.9 + ((k ? k.ovr : 60) - 75) * 0.003, 0.82, 0.99);
      inc(kl, 'xpa', 1);
      if (make) { inc(kl, 'xpm', 1); addScore(lv, side, 1); log(lv, (k ? nm(k.id) : 'Kicker') + ' extra point is good.', 'score'); }
      else log(lv, (k ? nm(k.id) : 'Kicker') + ' MISSES the extra point!', 'bad');
    }
    if (lv.ot) { endGame(lv); return; }
    afterScore(lv);
  }
  function afterScore(lv) { if (checkClock(lv)) return; kickoff(lv, other(lv.poss)); }

  // ---------- plays ----------
  function rnd2(a, b) { return a + U.rnd() * (b - a); }
  function pickTarget(lv, side, dp) {
    var ro = lv.ro[side], list = [];
    ro.wrs.slice(0, 4).forEach(function (id, i) { var p = P(id); list.push({ id: id, w: [1, 0.8, 0.55, 0.25][i] * (dp === 'd' ? (p.spd - 75) / 12 : 1) * (0.6 + p.ovr / 200), p: p }); });
    ro.tes.slice(0, 1).forEach(function (id) { var p = P(id); list.push({ id: id, w: (dp === 'd' ? 0.25 : 0.7) * (0.6 + p.ovr / 200), p: p }); });
    ro.rbs.slice(0, 1).forEach(function (id) { var p = P(id); list.push({ id: id, w: dp === 'scr' ? 9 : dp === 's' ? 0.35 : 0.12, p: p }); });
    return U.wpick(list, function (x) { return x.w; });
  }
  function defender(lv, side, kinds, wts) { var d = lv.ro[side].def, k = U.wpick(kinds, function (x, i) { return wts ? wts[kinds.indexOf(x)] : 1; }), l = d[k] || []; return l.length ? U.pick(l) : null; }
  function tackle(lv, dside, kind) {
    var id = kind === 'run' ? defender(lv, dside, ['LB', 'S', 'DT', 'EDGE', 'CB'], [40, 18, 16, 14, 12]) : defender(lv, dside, ['CB', 'S', 'LB'], [42, 32, 26]);
    inc(line(lv, id), 'tkl', 1); return id;
  }
  // resolve one snap
  function snap(lv, oc, dc) {
    var off = lv.poss, dfs = other(off), ro = lv.ro[off], rd = lv.ro[dfs], call = find(OFF, oc) || OFF[0], dcall = find(DEF, dc) || DEF[2];
    var qb = P(ro.qb), qbl = line(lv, ro.qb), tm = lv.tm[off], m = (MOD[call.k] || {})[dcall.k] || 0;
    var hurry = lv.q >= 2 && lv.clock <= 120 && (lv.q === 2 || lv.q >= 4) && lv.sc[off] <= lv.sc[dfs] + (lv.q === 2 ? 99 : 0);
    var res = { yds: 0, clk: 41, txt: '', kind: '', inc: false, out: false }, pre = ddStr(lv) + ' at ' + spot(lv) + '. ';
    lv.hist.push(oc); if (lv.hist.length > 8) lv.hist.shift();
    tm.plays++;
    var qbr = qb ? qb.ovr : 50;
    if (call.k === 'sneak') {
      var y = U.rnd() < 0.78 ? U.ri(1, 3) : U.ri(-1, 0);
      inc(qbl, 'car', 1); inc(qbl, 'ry', y); tm.ry += y; res.yds = y; res.txt = nm(ro.qb) + ' QB sneak for ' + yd(y); tackle(lv, dfs, 'run');
    } else if (call.t === 'run') {
      var rid = call.k === 'keeper' ? ro.qb : ro.rbs[0], rb = P(rid) || qb, rl = line(lv, rid);
      var rr = rb ? rb.ovr : 60, sp = rb ? rb.spd : 80;
      var mean = 3.1 + (rr - 80) * 0.05 + (ro.ol - rd.rush) * 0.07 + (ro.ol - rd.lb) * 0.03 + m + (call.k === 'keeper' ? (sp - 84) * 0.12 : 0);
      var y2 = Math.round(mean + U.gauss() * 3.4);
      if (U.rnd() < 0.03 + (sp - 85) * 0.0015 + (dcall.k === 'run' || dcall.k === 'blitz' ? 0.015 : 0)) y2 += U.ri(10, 45);
      if (U.rnd() < 0.08 + (dcall.k === 'run' ? 0.08 : 0)) y2 = U.ri(-4, 0);
      y2 = Math.min(y2, 100 - lv.yl);
      if (U.rnd() < 0.007) { // fumble
        inc(rl, 'car', 1); inc(rl, 'ry', Math.max(0, y2)); tm.ry += Math.max(0, y2);
        var ff = defender(lv, dfs, ['LB', 'EDGE', 'S'], [1, 1, 1]); inc(line(lv, ff), 'ff', 1); inc(rl, 'fum', 1);
        lv.yl += Math.max(0, y2); res.txt = nm(rid) + ' runs ' + yd(Math.max(0, y2)) + ' and FUMBLES! ' + nm(ff) + ' forces it, ' + L.shortName(tid(lv, dfs)) + ' recover.'; res.kind = 'to';
        return turnover(lv, res, 0);
      }
      inc(rl, 'car', 1); inc(rl, 'ry', y2); tm.ry += y2; res.yds = y2;
      res.txt = nm(rid) + ' ' + (call.k === 'outside' ? 'around the edge' : call.k === 'keeper' ? 'keeps it' : 'up the middle') + ' for ' + yd(y2);
      if (lv.yl + y2 < 100) { var tk = tackle(lv, dfs, 'run'); if (y2 <= 0 && U.rnd() < 0.6) res.txt += ', stuffed by ' + nm(tk); }
      res.out = call.k === 'outside' && U.rnd() < 0.25;
      if (y2 >= 20) res.kind = 'big';
    } else {
      // pass
      var dp = call.dp, rushPow = rd.rush + (dcall.k === 'blitz' ? 12 : dcall.k === 'prevent' ? -8 : dcall.k === 'run' ? 3 : 0);
      var sackP = U.clamp(0.055 + (rushPow - ro.ol) * 0.004 + (dp === 'd' ? 0.03 : 0) - (dp === 's' || dp === 'scr' ? 0.035 : 0) - (qb && qb.spd > 86 ? 0.012 : 0) + (call.pa && dcall.k === 'run' ? -0.04 : 0), 0.01, 0.22);
      if (U.rnd() < sackP) {
        var sy = -U.ri(4, 10), sk = defender(lv, dfs, dcall.k === 'blitz' ? ['EDGE', 'DT', 'LB', 'S', 'CB'] : ['EDGE', 'DT', 'LB'], dcall.k === 'blitz' ? [40, 20, 22, 10, 8] : [60, 28, 12]);
        if (lv.yl + sy < 0) sy = -lv.yl;
        inc(line(lv, sk), 'sk', 1); inc(line(lv, sk), 'tkl', 1); inc(qbl, 'py', 0); tm.sk++; tm.py += sy; inc(qbl, 'sky', -sy);
        res.yds = sy; res.txt = nm(ro.qb) + ' is SACKED by ' + nm(sk) + ' for a loss of ' + (-sy); res.kind = 'sack';
        if (U.rnd() < 0.06) { res.txt += '. FUMBLE! ' + L.shortName(tid(lv, dfs)) + ' have it!'; lv.yl += sy; inc(line(lv, sk), 'ff', 1); return turnover(lv, res, 0); }
      } else {
        var tg = pickTarget(lv, off, dp), wr = tg.p, cov = dp === 'd' ? (rd.cb * 0.6 + rd.sf * 0.4) : dp === 'scr' ? rd.lb : (rd.cb * 0.7 + rd.lb * 0.3);
        var base = { s: 0.69, scr: 0.8, m: 0.57, d: 0.35 }[dp];
        var cp = U.clamp(base + (qbr - 80) * 0.006 + ((wr ? wr.ovr : 70) - cov) * 0.004 + m * 0.018, 0.12, 0.93);
        var ip = U.clamp({ s: 0.016, scr: 0.008, m: 0.024, d: 0.045 }[dp] - (qbr - 80) * 0.0009 + (m < -2 ? 0.02 : 0), 0.004, 0.09);
        inc(qbl, 'att', 1); inc(line(lv, tg.id), 'tgt', 1);
        var r = U.rnd();
        if (r < ip) {
          var pk = defender(lv, dfs, dp === 'd' ? ['CB', 'S'] : ['CB', 'S', 'LB'], dp === 'd' ? [55, 45] : [45, 30, 25]);
          inc(qbl, 'int', 1); inc(line(lv, pk), 'dint', 1);
          var air = dp === 'd' ? U.ri(18, 40) : U.ri(5, 15);
          res.txt = nm(ro.qb) + ' pass for ' + nm(tg.id) + ' is INTERCEPTED by ' + nm(pk) + '!'; res.kind = 'to';
          lv.yl = Math.min(99, lv.yl + air);
          var ret = U.rnd() < 0.05 ? 200 : U.ri(0, 22);
          return turnover(lv, res, ret);
        } else if (r < ip + cp) {
          var ay = dp === 's' ? 4 + U.gauss() * 2 : dp === 'scr' ? -1.5 + U.gauss() * 1.5 : dp === 'm' ? 8 + U.gauss() * 3 : 17 + U.gauss() * 7;
          var yac = (dp === 'scr' ? 3.5 + m * 0.5 : 1.2 + m * 0.25) + U.gauss() * 2.2 + ((wr ? wr.spd : 85) - 86) * 0.12;
          if (U.rnd() < (dp === 'scr' ? 0.06 : 0.03)) yac += U.ri(8, 40);
          var y3 = Math.round(Math.max(dp === 'scr' ? -4 : 1, ay + Math.max(-2, yac)));
          y3 = Math.min(y3, 100 - lv.yl);
          inc(qbl, 'cmp', 1); inc(qbl, 'py', y3); inc(line(lv, tg.id), 'rec', 1); inc(line(lv, tg.id), 'rcy', y3); tm.py += y3;
          res.yds = y3; res.txt = nm(ro.qb) + ' pass ' + (dp === 'd' ? 'deep ' : '') + 'to ' + nm(tg.id) + ' for ' + yd(y3);
          res.rcv = tg.id;
          if (lv.yl + y3 < 100) { tackle(lv, dfs, 'pass'); res.out = U.rnd() < 0.22; }
          res.clk = res.out ? 8 : 38;
          if (y3 >= 20) res.kind = 'big';
        } else {
          var why = U.pick(dp === 'd' ? ['overthrown', 'just out of reach', 'broken up', 'dropped'] : ['incomplete', 'broken up', 'thrown away', 'dropped', 'off his fingertips']);
          var bu = defender(lv, dfs, ['CB', 'S', 'LB'], [55, 25, 20]);
          res.txt = nm(ro.qb) + ' pass for ' + nm(tg.id) + ' ' + why + (why === 'broken up' ? ' by ' + nm(bu) : ''); res.inc = true; res.clk = 6;
        }
      }
    }
    if (hurry && !res.inc) res.clk = res.out ? 7 : 14;
    // first downs / scoring
    lv.yl += res.yds;
    lv.clock -= res.clk;
    tm.top += res.clk;
    lv.drive.n++;
    if (lv.yl >= 100) {
      var who = res.rcv || (call.k === 'keeper' || call.k === 'sneak' ? ro.qb : ro.rbs[0]);
      if (res.rcv) { inc(qbl, 'ptd', 1); inc(line(lv, res.rcv), 'rctd', 1); } else inc(line(lv, who), 'rtd', 1);
      log(lv, pre + res.txt + '. TOUCHDOWN ' + L.shortName(tid(lv, off)).toUpperCase() + '!', 'td');
      tm.fd++;
      touchdown(lv, who);
      return;
    }
    if (lv.yl <= 0) { // safety
      log(lv, pre + res.txt + '. SAFETY! 2 points for ' + L.shortName(tid(lv, dfs)) + '.', 'score');
      addScore(lv, dfs, 2);
      if (lv.ot) { endGame(lv); return; }
      if (checkClock(lv)) return;
      kickoff(lv, dfs, true);
      return;
    }
    lv.lastRun = res.inc ? 0 : Math.max(0, res.clk - 6);
    lv.togo -= res.yds;
    if (lv.togo <= 0) { lv.down = 1; lv.togo = Math.min(10, 100 - lv.yl); tm.fd++; log(lv, pre + res.txt + '. FIRST DOWN.', res.kind || 'fd'); }
    else if (lv.down === 4) { log(lv, pre + res.txt + '. Turnover on downs.', 'to'); flip(lv, 100 - lv.yl); }
    else { lv.down++; log(lv, pre + res.txt + '.', res.kind); }
    two(lv);
    checkClock(lv);
  }
  function yd(y) { return y === 0 ? 'no gain' : y < 0 ? 'a loss of ' + (-y) : y + ' yard' + (y === 1 ? '' : 's'); }
  function two(lv) { if (!lv.warn2 && (lv.q === 2 || lv.q === 4) && lv.clock <= 120 && lv.clock > 0) { lv.warn2 = true; lv.clock = Math.min(lv.clock, 120); log(lv, 'Two-minute warning.', 'neu'); } }
  function turnover(lv, res, ret) {
    var off = lv.poss, dfs = other(off);
    lv.tm[off].to++;
    lv.clock -= 7; lv.tm[off].top += 7;
    log(lv, ddStr(lv) + '. ' + res.txt, 'to');
    var ny = 100 - lv.yl;
    if (ret >= 200 || ny + ret >= 100) { lv.poss = dfs; lv.yl = 100; log(lv, 'Returned for a TOUCHDOWN!', 'td'); touchdown(lv, null, 'def'); return; }
    flip(lv, ny + ret);
    checkClock(lv);
  }
  function flip(lv, yl) { lv.poss = other(lv.poss); lv.yl = U.clamp(yl, 1, 99); lv.down = 1; lv.togo = Math.min(10, 100 - lv.yl); lv.drive = { yl: lv.yl, n: 0, t: lv.clock }; }
  function punt(lv) {
    var off = lv.poss, ro = lv.ro[off], p = P(ro.p), pr = p ? p.ovr : 55;
    var net = Math.round(41 + (pr - 75) * 0.12 + U.gauss() * 6), land = lv.yl + net;
    inc(line(lv, ro.p), 'punts', 1);
    lv.clock -= 7; lv.tm[off].top += 7;
    var txt;
    if (land >= 100) { txt = nm(ro.p) + ' punts into the end zone. Touchback.'; flip(lv, 20); }
    else if (land >= 90) { txt = nm(ro.p) + ' pins them deep, downed at the ' + (100 - land) + '.'; flip(lv, 100 - land); }
    else { txt = nm(ro.p) + ' punts ' + net + ' yards.'; flip(lv, 100 - land); }
    log(lv, '4th & ' + lv.togo + '. ' + txt, 'kick');
    checkClock(lv);
  }
  function fgDist(lv) { return 100 - lv.yl + 17; }
  function fgChance(lv, side) { var k = P(lv.ro[side || lv.poss].k), kr = k ? k.ovr : 55, d = fgDist(lv); return U.clamp(1.06 - Math.max(0, d - 22) * 0.0125 - Math.max(0, d - 48) * 0.012 + (kr - 80) * 0.0045, 0.03, 0.99); }
  function fieldGoal(lv) {
    var off = lv.poss, ro = lv.ro[off], d = fgDist(lv), make = U.rnd() < fgChance(lv), kl = line(lv, ro.k);
    inc(kl, 'fga', 1); lv.clock -= 5; lv.tm[off].top += 5;
    if (make) { inc(kl, 'fgm', 1); addScore(lv, off, 3); log(lv, nm(ro.k) + ' ' + d + '-yard field goal is GOOD.', 'score'); if (lv.ot) { endGame(lv); return; } afterScore(lv); }
    else { log(lv, nm(ro.k) + ' ' + d + '-yard field goal is NO GOOD.', 'bad'); flip(lv, Math.max(20, 100 - lv.yl - 7)); checkClock(lv); }
  }
  function kneel(lv) {
    var off = lv.poss; inc(line(lv, lv.ro[off].qb), 'car', 1); inc(line(lv, lv.ro[off].qb), 'ry', -1);
    lv.yl -= 1; lv.clock -= 42; lv.tm[off].top += 40;
    var pre = ddStr(lv) + '. ';
    lv.togo += 1;
    if (lv.down === 4) { log(lv, pre + 'Kneel down. Turnover on downs.', ''); flip(lv, 100 - lv.yl); }
    else { lv.down++; log(lv, pre + nm(lv.ro[off].qb) + ' takes a knee.', ''); }
    checkClock(lv);
  }
  function timeout(lv, side) {
    if (lv.to[side] <= 0) return false;
    lv.to[side]--; lv.clock += lv.lastRun || 0; lv.lastRun = 0; log(lv, L.shortName(tid(lv, side)) + ' call timeout (' + lv.to[side] + ' left).', 'neu');
    lv.stopped = true;
    return true;
  }

  // ---------- quarters ----------
  function checkClock(lv) {
    if (lv.over) return true;
    if (lv.clock > 0) return false;
    lv.clock = 0;
    if (lv.ot) {
      if (!lv.playoff) { log(lv, 'Overtime ends in a tie.', 'neu'); endGame(lv); return true; }
      lv.q++; lv.clock = 600; log(lv, 'Another overtime period.', 'neu'); return false;
    }
    if (lv.q === 1 || lv.q === 3) { lv.q++; lv.clock = 900; log(lv, 'End of the ' + U.ord(lv.q - 1) + ' quarter.', 'neu'); return false; }
    if (lv.q === 2) {
      lv.q = 3; lv.clock = 900; lv.warn2 = false; lv.to = { h: 3, a: 3 };
      log(lv, 'HALFTIME. ' + lv.h + ' ' + lv.sc.h + ', ' + lv.a + ' ' + lv.sc.a + '.', 'neu');
      kickoff(lv, lv.recv2);
      return true;
    }
    if (lv.q >= 4) {
      if (lv.sc.h !== lv.sc.a) { endGame(lv); return true; }
      lv.q = 5; lv.ot = true; lv.clock = 600; lv.to = { h: 2, a: 2 }; lv.qs.h.push(0); lv.qs.a.push(0);
      var w = U.rnd() < 0.5 ? 'h' : 'a';
      log(lv, 'OVERTIME! Sudden death. ' + L.shortName(tid(lv, w)) + ' get the ball.', 'neu');
      kickoff(lv, w);
      return true;
    }
    return false;
  }
  function endGame(lv) {
    lv.over = true; lv.wait = 'over';
    log(lv, 'FINAL: ' + L.shortName(lv.h) + ' ' + lv.sc.h + ', ' + L.shortName(lv.a) + ' ' + lv.sc.a + (lv.ot ? ' (OT)' : '') + '.', 'neu');
  }

  // ---------- CPU coaching ----------
  function cpuOff(lv) {
    var off = lv.poss, diff = lv.sc[off] - lv.sc[other(off)], late = lv.q >= 4 && lv.clock < 300, ro = lv.ro[off];
    if (lv.down === 4) {
      var d = fgDist(lv), need = late && diff < 0;
      if (late && diff < -3 && lv.clock < 180) return lv.togo <= 10 ? pass(lv, off) : 'deep';
      if (d <= 55 && fgChance(lv) > 0.55 && !(late && diff < -3)) return 'FG';
      if (lv.togo <= 1 && lv.yl >= 40) return 'sneak';
      if (lv.togo <= 2 && lv.yl >= 55 && U.rnd() < 0.5) return U.rnd() < 0.5 ? 'inside' : 'quick';
      if (need) return pass(lv, off);
      return 'PUNT';
    }
    if (late && diff > 0 && diff <= 16 && lv.clock < 110 && lv.down < 4) return 'KNEEL';
    if (late && diff > 0) return U.rnd() < 0.72 ? (U.rnd() < 0.6 ? 'inside' : 'outside') : 'quick';
    if (late && diff < 0) return pass(lv, off);
    if (lv.togo <= 1 && U.rnd() < 0.45) return 'sneak';
    var qb = P(ro.qb), passW = 0.56 + ((qb ? qb.ovr : 70) - 82) * 0.006;
    if (lv.down === 3 && lv.togo >= 6) passW = 0.88; else if (lv.togo <= 3) passW = 0.4;
    if (U.rnd() < passW) return pass(lv, off);
    var keep = qb && qb.spd >= 86 && U.rnd() < 0.2;
    return keep ? 'keeper' : U.rnd() < 0.6 ? 'inside' : 'outside';
  }
  function pass(lv, off) {
    var t = lv.togo, r = U.rnd();
    if (t >= 15) return r < 0.5 ? 'deep' : 'mid';
    if (t >= 8) return r < 0.25 ? 'deep' : r < 0.7 ? 'mid' : r < 0.85 ? 'pa' : 'quick';
    return r < 0.45 ? 'quick' : r < 0.65 ? 'screen' : r < 0.85 ? 'mid' : 'pa';
  }
  function cpuDef(lv) {
    var t = lv.togo, r = U.rnd(), off = lv.poss, diff = lv.sc[off] - lv.sc[other(off)];
    var w = { run: 1, c2: 1, c3: 1.3, man: 1, blitz: 0.6, prevent: 0.1 };
    if (t <= 2) { w.run = 3; w.man = 1.5; w.prevent = 0; }
    if (t >= 8) { w.c2 = 2; w.c3 = 1.8; w.run = 0.3; w.blitz = 0.9; }
    if (lv.q >= 4 && lv.clock < 150 && diff < 0 && diff >= -8) { w.prevent = 3; w.c2 = 2; w.run = 0.1; }
    // learns your habits
    if (lv.me === off && !lv.auto) {
      var h = lv.hist.slice(-6), cnt = {};
      h.forEach(function (k) { cnt[k] = (cnt[k] || 0) + 1; });
      var runs = (cnt.inside || 0) + (cnt.outside || 0) + (cnt.keeper || 0), deeps = (cnt.deep || 0) + (cnt.pa || 0), shorts = (cnt.quick || 0) + (cnt.screen || 0);
      if (runs >= 4) w.run += runs - 2;
      if (deeps >= 3) { w.c2 += deeps; w.prevent += deeps * 0.4; }
      if (shorts >= 4) { w.man += shorts - 2; }
      if ((cnt.screen || 0) >= 2) w.blitz = 0.2;
      if ((cnt.mid || 0) >= 4) w.c3 += 3;
    }
    var keys = Object.keys(w);
    return U.wpick(keys, function (k) { return w[k]; });
  }

  // ---------- one step (user or auto) ----------
  // userCall: offense key (when you have the ball) or defense key (when they do)
  function step(lv, userCall) {
    if (lv.over) return;
    if (lv.wait === 'coin') {
      var w = U.rnd() < 0.5 ? 'h' : 'a';
      lv.recv2 = other(w);
      log(lv, L.shortName(tid(lv, w)) + ' win the toss and receive.', 'neu');
      kickoff(lv, w); return;
    }
    if (lv.wait === 'pat') { pat(lv, sideIsCpu(lv, lv.poss) ? cpuPat(lv) : (userCall === 'two' ? 'two' : 'xp')); return; }
    var off = lv.poss, userOff = !lv.auto && off === lv.me;
    var oc, dc;
    if (lv.auto) { oc = cpuOff(lv); dc = cpuDef(lv); }
    else if (userOff) { oc = userCall || cpuOff(lv); dc = cpuDef(lv); }
    else { dc = userCall || cpuDef(lv); oc = cpuOff(lv); }
    lv.lastCalls = { o: oc, d: dc };
    // CPU uses timeouts late when trailing on defense
    if (oc === 'PUNT') { punt(lv); return; }
    if (oc === 'FG') { fieldGoal(lv); return; }
    if (oc === 'KNEEL') { kneel(lv); return; }
    if (oc === 'sneak') { snapSneak(lv, dc); return; }
    snap(lv, oc, dc);
    cpuTimeouts(lv);
  }
  function snapSneak(lv, dc) { OFF.push({ k: 'sneak', n: 'QB Sneak', t: 'run' }); snap(lv, 'sneak', dc); OFF.pop(); }
  function cpuTimeouts(lv) {
    if (lv.over || lv.wait !== 'play') return;
    ['h', 'a'].forEach(function (side) {
      if (!sideIsCpu(lv, side)) return;
      var diff = lv.sc[side] - lv.sc[other(side)];
      if (lv.q >= 4 && lv.clock < 130 && lv.clock > 5 && diff < 0 && diff >= -16 && lv.to[side] > 0 && U.rnd() < 0.5) {
        if (side !== lv.poss || lv.clock < 40) timeout(lv, side);
      }
    });
  }
  function simDrive(lv) {
    var p0 = lv.poss, g = 0, wasAuto = lv.auto; lv.auto = true;
    while (!lv.over && g++ < 40) { step(lv); if (lv.poss !== p0 && lv.wait === 'play') break; if (lv.wait === 'pat' && !sideIsCpu(lv, lv.poss)) { pat(lv, 'xp'); break; } }
    lv.auto = wasAuto;
  }
  function simQuarter(lv) { var q0 = lv.q, g = 0, wasAuto = lv.auto; lv.auto = true; while (!lv.over && lv.q === q0 && g++ < 400) step(lv); lv.auto = wasAuto; }
  function simAll(lv) { var g = 0; lv.auto = true; while (!lv.over && g++ < 2000) step(lv); }
  function result(lv) {
    var tt = lv.tm.h.top + lv.tm.a.top || 1; lv.tm.h.top = Math.round(lv.tm.h.top / tt * 3600); lv.tm.a.top = 3600 - lv.tm.h.top;
    return { h: lv.h, a: lv.a, hs: lv.sc.h, as: lv.sc.a, ot: lv.ot, q: lv.qs, box: lv.box, tm: lv.tm, live: true, pbp: lv.pbp.map(function (e) { return [e.q, e.c, e.t, e.k, e.s]; }) };
  }
  function userTimeout(lv) { if (lv.over || lv.wait !== 'play') return false; return timeout(lv, lv.me); }
  // what you can call right now
  function options(lv) {
    if (lv.over) return { mode: 'over' };
    if (lv.wait === 'coin') return { mode: 'coin' };
    if (lv.wait === 'pat') return { mode: 'pat', mine: lv.poss === lv.me };
    var mine = lv.poss === lv.me;
    if (!mine) return { mode: 'def', calls: DEF };
    var calls = OFF.slice(), qb = P(lv.ro[lv.poss].qb);
    if (!(qb && qb.spd >= 82)) calls = calls.filter(function (c) { return c.k !== 'keeper'; });
    var sp = [];
    if (lv.togo <= 2) sp.push({ k: 'sneak', n: 'QB Sneak', d: 'Push for the first down' });
    if (lv.down === 4 || (lv.clock < 30 && (lv.q === 2 || lv.q >= 4))) { if (fgDist(lv) <= 66) sp.push({ k: 'FG', n: 'Field Goal ' + fgDist(lv), d: Math.round(fgChance(lv) * 100) + '% to make' }); }
    if (lv.down === 4) sp.push({ k: 'PUNT', n: 'Punt', d: 'Flip the field' });
    if (lv.q >= 4 && lv.sc[lv.me] > lv.sc[other(lv.me)]) sp.push({ k: 'KNEEL', n: 'Kneel', d: 'Run the clock' });
    return { mode: 'off', calls: calls, special: sp };
  }
  return { OFF: OFF, DEF: DEF, start: start, step: step, simDrive: simDrive, simQuarter: simQuarter, simAll: simAll, result: result, options: options, clockStr: clockStr, spot: spot, ddStr: ddStr, userTimeout: userTimeout, fgChance: fgChance, fgDist: fgDist };
})();
