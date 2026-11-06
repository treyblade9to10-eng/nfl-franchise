// sim.js - schedule, quick game sim (drive by drive, with player stats), standings, playoffs, awards
var Sim = (function () {
  function S() { return G.S; }

  // ---------- schedule ----------
  // week by week: give everyone one bye, then match the rest each week (division rivals first)
  function makeSchedule(len) {
    var ids = L.teamIds(), N = ids.length, W = len + 1;
    var key = function (a, b) { return a < b ? a + '|' + b : b + '|' + a; };
    var sameDiv = function (a, b) { var x = L.team(a), y = L.team(b); return x.conf === y.conf && x.div === y.div; };
    var divTimes = len >= 14 ? 2 : len >= 7 ? 1 : 0;
    for (var att = 0; att < 80; att++) {
      // byes: weeks 4..W-3 (or anywhere for short seasons), always an even number of teams playing
      var bye = {}, order = U.shuffle(ids.slice()), lo = W >= 10 ? 4 : 1, hi = W >= 10 ? W - 3 : W - 1, span = hi - lo + 1;
      for (var w0 = 0; w0 < W; w0++) bye[w0] = [];
      var i0 = 0;
      if (N % 2 === 0) {
        while (i0 < order.length) { var wk = lo + Math.floor((i0 / 2) % span); bye[wk].push(order[i0], order[i0 + 1]); i0 += 2; }
      } else {
        // odd number of teams: every week needs an odd number of byes, so each week gets one first
        for (var w2 = 0; w2 < W && i0 < order.length; w2++) bye[w2].push(order[i0++]);
        var k2 = 0;
        while (i0 < order.length) {
          var wk2 = lo + (k2++ % span);
          if (i0 + 1 < order.length) { bye[wk2].push(order[i0], order[i0 + 1]); i0 += 2; }
          else { var other = order.filter(function (t) { return bye[wk2].indexOf(t) < 0 && t !== order[i0]; })[0]; bye[wk2].push(order[i0], other); i0++; }
        }
      }
      var pc = {}, home = {}, played = {}, weeks = [], fail = false;
      ids.forEach(function (id) { home[id] = 0; played[id] = 0; });
      for (var w = 0; w < W && !fail; w++) {
        var act = ids.filter(function (id) { return bye[w].indexOf(id) < 0; }), left = W - w;
        var got = null;
        for (var tr = 0; tr < 60 && !got; tr++) {
          var pool = U.shuffle(act.slice()), games = [], ok = true, usedK = {};
          // teams with the fewest options go first
          while (pool.length && ok) {
            var a = pool.shift();
            var opts = pool.filter(function (b) { var c = pc[key(a, b)] || 0; return sameDiv(a, b) ? c < divTimes : c < 1; });
            if (!opts.length) opts = pool.filter(function (b) { return (pc[key(a, b)] || 0) < (sameDiv(a, b) ? divTimes + 1 : 2); });
            if (!opts.length) { ok = false; break; }
            var b = U.wpick(opts, function (x) {
              var dr = sameDiv(a, x) ? divTimes - (pc[key(a, x)] || 0) : 0;
              return 1 + (dr > 0 ? 6 + 40 / left : 0) + (L.team(a).conf === L.team(x).conf ? 1.5 : 0);
            });
            pool.splice(pool.indexOf(b), 1);
            games.push([a, b]);
          }
          if (ok) got = games;
        }
        if (!got) { fail = true; break; }
        weeks.push(got.map(function (m) {
          pc[key(m[0], m[1])] = (pc[key(m[0], m[1])] || 0) + 1; played[m[0]]++; played[m[1]]++;
          var h = home[m[0]] < home[m[1]] ? m[0] : home[m[1]] < home[m[0]] ? m[1] : (U.rnd() < 0.5 ? m[0] : m[1]), aw = h === m[0] ? m[1] : m[0];
          home[h]++; return [h, aw];
        }));
      }
      if (fail) continue;
      var dm = 0; ids.forEach(function (a) { ids.forEach(function (b) { if (a < b && sameDiv(a, b) && (pc[key(a, b)] || 0) < divTimes) dm++; }); });
      if (dm > 2 && att < 60) continue;
      return weeks;
    }
    return [];
  }
  function newSeason() {
    var s = S();
    s.sched = makeSchedule(s.len || 17); s.week = 0; s.games = []; s.po = null; s.draftOrder = null;
    s.deadline = Math.max(2, Math.round(s.sched.length * 0.5));
    L.teamIds().forEach(function (id) { var t = L.team(id); t.w = t.l = t.t = t.pf = t.pa = 0; t.dw = t.dl = t.cw = t.cl = 0; t.last = []; });
    for (var k in s.players) s.players[k].st = L.blankStats();
    s.weekLabel = 'Week 1';
  }
  function tradeOpen() { var s = S(); return s.phase === 'regular' ? s.week < s.deadline : s.phase === 'draft' || s.phase === 'resign' || s.phase === 'fa' || s.phase === 'pre'; }

  // ---------- quick game sim ----------
  function rnd2(a, b) { return a + U.rnd() * (b - a); }
  function driveOut(offR, defR, kR, hfa) {
    var e = (offR - defR + hfa) / 10;
    var pTD = U.clamp(0.222 + e * 0.065, 0.07, 0.45), pFG = U.clamp(0.15 + e * 0.01, 0.08, 0.2), pTO = U.clamp(0.112 - e * 0.028, 0.035, 0.2), pDn = 0.045;
    var r = U.rnd();
    if (r < pTD) return 'TD';
    r -= pTD; if (r < pFG) return U.rnd() < U.clamp(0.6 + (kR - 60) * 0.009, 0.5, 0.95) ? 'FG' : 'MFG';
    r -= pFG; if (r < pTO) return 'TO';
    r -= pTO; if (r < pDn) return 'DOWNS';
    return 'PUNT';
  }
  // split a final score into drive results (used when you type a score in yourself)
  function splitScore(pts) {
    for (var td = Math.floor(pts / 7); td >= 0; td--) {
      var r = pts - td * 7;
      if (r % 3 === 0) return { td: td, fg: r / 3, x: [] };
      if (td > 0 && (r + 1) % 3 === 0) return { td: td, fg: (r + 1) / 3, x: ['miss'] }; // one missed XP
      if (td > 0 && r >= 1 && (r - 1) % 3 === 0) return { td: td, fg: (r - 1) / 3, x: ['two'] }; // one 2-pt try
      if (r >= 2 && (r - 2) % 3 === 0) return { td: td, fg: (r - 2) / 3, x: ['saf'] };
    }
    return { td: 0, fg: 0, x: [] };
  }
  function lineup(tid) {
    var bp = L.byPos(tid), st = L.starters(tid);
    function hl(pos) { return bp[pos].filter(function (p) { return !(p.inj > 0); }); }
    return { st: st, qb: st.QB[0].p, rbs: hl('RB').concat(hl('FB')).slice(0, 3), wrs: hl('WR').slice(0, 5), tes: hl('TE').slice(0, 2), k: st.K[0].p, p: st.P[0].p,
      def: ['EDGE', 'DT', 'LB', 'CB', 'S'].reduce(function (o, pos) { o[pos] = hl(pos).slice(0, pos === 'CB' ? 4 : 3); return o; }, {}) };
  }
  function line(box, p) { if (!p) return null; return box[p.id] || (box[p.id] = { id: p.id, t: p.t }); }
  function inc(o, k, v) { if (o) o[k] = (o[k] || 0) + v; }
  function giveStats(box, lu, opp, drives, rt, ot) {
    var tm = { py: 0, ry: 0, fd: 0, to: 0, sk: 0, plays: 0, top: 0 };
    var qb = lu.qb, qbR = qb ? qb.ovr : 50, passShare = U.clamp(0.63 + (qbR - 80) * 0.005 + rnd2(-0.08, 0.08), 0.42, 0.8);
    var targets = [], wts = [0.25, 0.19, 0.12, 0.05, 0.03];
    lu.wrs.forEach(function (p, i) { targets.push({ p: p, w: wts[i] * (0.6 + p.ovr / 200), ypc: 12.8 }); });
    lu.tes.forEach(function (p, i) { targets.push({ p: p, w: (i ? 0.05 : 0.17) * (0.6 + p.ovr / 200), ypc: 10.6 }); });
    lu.rbs.forEach(function (p, i) { targets.push({ p: p, w: (i ? 0.04 : 0.11), ypc: 7.6 }); });
    var rushers = lu.rbs.map(function (p, i) { return { p: p, w: i === 0 ? U.clamp(0.6 + (p.ovr - 80) * 0.012, 0.45, 0.82) : i === 1 ? 0.24 : 0.05 }; });
    if (qb) rushers.push({ p: qb, w: qb.spd >= 86 ? 0.16 : 0.06 });
    if (lu.wrs[0]) rushers.push({ p: lu.wrs[0], w: 0.025 });
    var qline = line(box, qb), acc = U.clamp(0.6 + (qbR - 75) * 0.0035, 0.5, 0.74);
    drives.forEach(function (d) {
      var y = d === 'TD' ? U.ri(48, 80) : d === 'FG' || d === 'MFG' ? U.ri(30, 58) : d === 'TO' ? U.ri(0, 38) : d === 'DOWNS' ? U.ri(15, 50) : U.ri(-4, 34);
      var plays = Math.max(3, Math.round(y / 6.2 + rnd2(1, 3)));
      tm.plays += plays; tm.top += plays * 28 + U.ri(10, 40); tm.fd += Math.max(0, Math.round(y / 11 + rnd2(-0.6, 0.8)));
      var py = Math.round(y * passShare + rnd2(-5, 5)), ry = y - py;
      if (py < 0) { ry += py; py = 0; }
      // passing
      var cmpN = Math.max(0, Math.round(py / 11.2 + rnd2(-0.4, 0.6))), att = Math.max(cmpN, Math.round(cmpN / acc + rnd2(0, 1)));
      inc(qline, 'cmp', cmpN); inc(qline, 'att', att); inc(qline, 'py', py); tm.py += py;
      var left = py;
      for (var c = 0; c < cmpN; c++) {
        var tg = U.wpick(targets, function (x) { return x.w; }), l = line(box, tg.p), yd = c === cmpN - 1 ? left : Math.min(left, Math.max(-2, Math.round(tg.ypc * rnd2(0.3, 1.7))));
        left -= yd; inc(l, 'rec', 1); inc(l, 'tgt', 1); inc(l, 'rcy', yd);
      }
      for (var z = cmpN; z < att; z++) { var tg2 = U.wpick(targets, function (x) { return x.w; }); inc(line(box, tg2.p), 'tgt', 1); }
      // rushing
      var carries = Math.max(1, Math.round(plays - att + rnd2(-0.5, 0.5))), rl = ry;
      for (var c2 = 0; c2 < carries; c2++) {
        var ru = U.wpick(rushers, function (x) { return x.w; }), l2 = line(box, ru.p), yd2 = c2 === carries - 1 ? rl : Math.round(rl / (carries - c2) * rnd2(0.2, 1.8));
        rl -= yd2; inc(l2, 'car', 1); inc(l2, 'ry', yd2);
      }
      tm.ry += ry;
      if (d === 'TD') {
        if (U.rnd() < U.clamp(0.55 + (qbR - 80) * 0.008, 0.35, 0.75)) { inc(qline, 'ptd', 1); var tg3 = U.wpick(targets, function (x) { return x.w * (x.ypc > 9 ? 1.1 : 0.8); }); inc(line(box, tg3.p), 'rctd', 1); }
        else { var ru2 = U.wpick(rushers, function (x) { return x.w * (x.p === qb ? 1.6 : 1); }); inc(line(box, ru2.p), 'rtd', 1); }
      }
      if (d === 'TO') {
        tm.to++;
        if (U.rnd() < 0.6) { inc(qline, 'int', 1); var dp = U.wpick(['CB', 'CB', 'S', 'S', 'LB'], function () { return 1; }), dl = opp.def[dp]; if (dl && dl.length) inc(line(box, U.pick(dl)), 'dint', 1); }
        else { var fd = U.wpick(rushers, function (x) { return x.w; }); inc(line(box, fd.p), 'fum', 1); var ff = opp.def.LB.concat(opp.def.EDGE); if (ff.length) inc(line(box, U.pick(ff)), 'ff', 1); }
      }
    });
    // sacks: pass rush vs blockers
    var prs = U.avg(opp.st.EDGE.concat(opp.st.DT), function (x) { return x.r; }), olb = U.avg(lu.st.OT.concat(lu.st.G).concat(lu.st.C), function (x) { return x.r; });
    var sacks = Math.max(0, Math.round(2.4 + (prs - olb) * 0.09 + U.gauss() * 1.1));
    for (var sk = 0; sk < sacks; sk++) {
      var pos = U.wpick(['EDGE', 'DT', 'LB', 'CB', 'S'], function (x) { return { EDGE: 56, DT: 24, LB: 14, CB: 3, S: 3 }[x]; }), list = opp.def[pos];
      if (list && list.length) inc(line(box, U.wpick(list, function (p) { return p.ovr - 55; })), 'sk', 1);
      tm.sk++; var ly = U.ri(5, 9); inc(qline, 'py', -ly); tm.py -= ly;
    }
    // tackles for the other defense
    var tk = Math.round(tm.plays * 0.88);
    for (var t = 0; t < tk; t++) {
      var pos2 = U.wpick(['LB', 'S', 'CB', 'DT', 'EDGE'], function (x) { return { LB: 34, S: 22, CB: 19, DT: 13, EDGE: 12 }[x]; }), l3 = opp.def[pos2];
      if (l3 && l3.length) inc(line(box, U.wpick(l3, function (p, i) { return p.ovr - 50; })), 'tkl', 1);
    }
    return tm;
  }
  // full game. o = {neutral, force:{h,a} final score, playoff, noStats}
  function play(hid, aid, o) {
    o = o || {};
    var luH = lineup(hid), luA = lineup(aid), rH = L.ratingsFrom ? null : null;
    var RH = L.ratings(hid), RA = L.ratings(aid), hfa = o.neutral ? 0 : 1.6;
    var kH = luH.k ? luH.k.ovr : 55, kA = luA.k ? luA.k.ovr : 55;
    var out = { h: hid, a: aid, hs: 0, as: 0, ot: false, q: { h: [0, 0, 0, 0], a: [0, 0, 0, 0] } };
    var dH = [], dA = [], pts = { h: 0, a: 0 }, fgs = { h: 0, a: 0 }, xps = { h: [0, 0], a: [0, 0] }, two = { h: 0, a: 0 };
    function score(side, d, qi) {
      var p = 0;
      if (d === 'TD') { p = 6; if (U.rnd() < 0.05) { if (U.rnd() < 0.48) p += 2; two[side]++; } else { xps[side][1]++; if (U.rnd() < 0.955) { p += 1; xps[side][0]++; } } }
      else if (d === 'FG') { p = 3; fgs[side]++; }
      pts[side] += p; out.q[side][qi] += p;
    }
    if (o.force) {
      ['h', 'a'].forEach(function (side) {
        var sp = splitScore(o.force[side]), list = [];
        for (var i = 0; i < sp.td; i++) list.push('TD');
        for (i = 0; i < sp.fg; i++) list.push('FG');
        var n = Math.max(list.length + 3, U.ri(10, 12));
        while (list.length < n) list.push(U.rnd() < 0.2 ? 'TO' : U.rnd() < 0.1 ? 'MFG' : 'PUNT');
        list = U.shuffle(list);
        (side === 'h' ? dH : dA).push.apply(side === 'h' ? dH : dA, list);
        list.forEach(function (d, i) { var qi = Math.min(3, Math.floor(i / list.length * 4)); if (d === 'TD') { xps[side][1]++; xps[side][0]++; } if (d === 'FG') fgs[side]++; out.q[side][qi] += d === 'TD' ? 7 : d === 'FG' ? 3 : 0; });
        // make quarter scores add up to the typed total
        var sumq = out.q[side][0] + out.q[side][1] + out.q[side][2] + out.q[side][3], diff = o.force[side] - sumq;
        out.q[side][U.ri(0, 3)] += diff; for (var qq = 0; qq < 4; qq++) if (out.q[side][qq] < 0) { out.q[side][(qq + 1) % 4] += out.q[side][qq]; out.q[side][qq] = 0; }
        pts[side] = o.force[side];
        if (sp.x[0] === 'miss') xps[side][0]--;
        if (sp.x[0] === 'two') { xps[side][0]--; xps[side][1]--; two[side]++; }
      });
    } else {
      var n = U.ri(10, 12);
      for (var i = 0; i < n; i++) {
        var qi = Math.min(3, Math.floor(i / n * 4));
        var d1 = driveOut(RA.off, RH.def, kA, -hfa); dA.push(d1); score('a', d1, qi);
        var d2 = driveOut(RH.off, RA.def, kH, hfa); dH.push(d2); score('h', d2, qi);
      }
      // late-game pressure: trailing team gets an extra shot sometimes
      if (pts.h !== pts.a && Math.abs(pts.h - pts.a) <= 8 && U.rnd() < 0.5) {
        var tr = pts.h < pts.a ? 'h' : 'a', dd = tr === 'h' ? driveOut(RH.off, RA.def, kH, hfa) : driveOut(RA.off, RH.def, kA, -hfa);
        (tr === 'h' ? dH : dA).push(dd); score(tr, dd, 3);
      }
      if (pts.h === pts.a) { // overtime
        out.ot = true; out.q.h.push(0); out.q.a.push(0);
        var rounds = o.playoff ? 12 : 3;
        for (var r = 0; r < rounds && pts.h === pts.a; r++) {
          var first = r % 2 === 0 ? 'h' : 'a', order = first === 'h' ? ['h', 'a'] : ['a', 'h'];
          for (var z = 0; z < 2 && pts.h === pts.a; z++) {
            var sd = order[z], dz = sd === 'h' ? driveOut(RH.off, RA.def, kH, hfa) : driveOut(RA.off, RH.def, kA, -hfa);
            (sd === 'h' ? dH : dA).push(dz); score(sd, dz, 4);
          }
        }
        if (o.playoff && pts.h === pts.a) { pts.h += 3; out.q.h[4] += 3; fgs.h++; }
      }
    }
    out.hs = pts.h; out.as = pts.a;
    var box = {};
    var th = giveStats(box, luH, luA, dH), ta = giveStats(box, luA, luH, dA);
    // kicking
    [['h', luH, dH], ['a', luA, dA]].forEach(function (x) {
      var k = line(box, x[1].k), side = x[0], miss = x[2].filter(function (d) { return d === 'MFG'; }).length;
      inc(k, 'fgm', fgs[side]); inc(k, 'fga', fgs[side] + miss); inc(k, 'xpm', xps[side][0]); inc(k, 'xpa', xps[side][1]);
      inc(line(box, x[1].p), 'punts', x[2].filter(function (d) { return d === 'PUNT'; }).length);
    });
    out.box = box; out.tm = { h: th, a: ta };
    var tt = th.top + ta.top; th.top = Math.round(th.top / tt * 3600); ta.top = 3600 - th.top;
    return out;
  }

  // ---------- record a finished game ----------
  function record(g, wk) {
    var s = S(), th = L.team(g.h), ta = L.team(g.a);
    th.pf += g.hs; th.pa += g.as; ta.pf += g.as; ta.pa += g.hs;
    var sameDiv = th.conf === ta.conf && th.div === ta.div, sameConf = th.conf === ta.conf;
    if (g.hs === g.as) { th.t++; ta.t++; th.last.push('T'); ta.last.push('T'); }
    else {
      var w = g.hs > g.as ? th : ta, l = w === th ? ta : th;
      w.w++; l.l++; w.last.push('W'); l.last.push('L');
      if (sameDiv) { w.dw = (w.dw || 0) + 1; l.dl = (l.dl || 0) + 1; }
      if (sameConf) { w.cw = (w.cw || 0) + 1; l.cl = (l.cl || 0) + 1; }
    }
    [th, ta].forEach(function (t) { if (t.last.length > 6) t.last.shift(); });
    applyBox(g, false);
    var mine = g.h === s.user || g.a === s.user;
    s.games.push(compact(g, wk, mine));
    injuries(g);
  }
  function applyBox(g, po) {
    var box = g.box, started = {};
    [g.h, g.a].forEach(function (tid) { var st = L.starters(tid); Object.keys(st).forEach(function (pos) { st[pos].forEach(function (x) { if (x.p) started[x.p.id] = 1; }); }); });
    [g.h, g.a].forEach(function (tid) {
      L.roster(tid).forEach(function (p) {
        if (p.inj > 0) return;
        var st = po ? (p.pst = p.pst || L.blankStats()) : p.st, ln = box[p.id];
        st.g++; if (started[p.id]) st.gs++;
        if (ln) for (var k in ln) if (k !== 'id' && k !== 't') st[k] = (st[k] || 0) + ln[k];
      });
    });
  }
  function leaders(g) {
    var b = g.box, out = {};
    [g.h, g.a].forEach(function (tid) {
      var lines = Object.keys(b).map(function (k) { return b[k]; }).filter(function (l) { return l.t === tid; });
      var best = function (k) { return lines.slice().sort(function (x, y) { return (y[k] || 0) - (x[k] || 0); })[0]; };
      var p = best('py'), r = best('ry'), c = best('rcy');
      out[tid] = [p && p.py ? [p.id, (p.cmp || 0) + '/' + (p.att || 0) + ', ' + p.py + ' yds' + (p.ptd ? ', ' + p.ptd + ' TD' : '') + (p.int ? ', ' + p.int + ' INT' : '')] : null,
        r && r.ry ? [r.id, r.car + ' car, ' + r.ry + ' yds' + (r.rtd ? ', ' + r.rtd + ' TD' : '')] : null,
        c && c.rcy ? [c.id, c.rec + ' rec, ' + c.rcy + ' yds' + (c.rctd ? ', ' + c.rctd + ' TD' : '')] : null];
    });
    return out;
  }
  function compact(g, wk, full) {
    var c = { h: g.h, a: g.a, hs: g.hs, as: g.as, ot: g.ot, w: wk, q: g.q, ld: leaders(g), live: g.live || false, set: g.set || false, po: g.po || null };
    if (full) { c.box = g.box; c.tm = g.tm; if (g.pbp) c.pbp = g.pbp.slice(-80); }
    return c;
  }
  function injuries(g) {
    var s = S();
    [g.h, g.a].forEach(function (tid) {
      var st = L.starters(tid);
      Object.keys(st).forEach(function (pos) {
        st[pos].forEach(function (x) {
          var p = x.p; if (!p || p.inj > 0) return;
          var risk = (pos === 'RB' ? 0.03 : pos === 'K' || pos === 'P' ? 0.002 : 0.016) * (p.age >= 31 ? 1.3 : 1);
          if (U.rnd() < risk) {
            var wks = U.rnd() < 0.08 ? U.ri(8, 17) : U.rnd() < 0.35 ? U.ri(3, 6) : U.ri(1, 2);
            p.inj = wks;
            if (wks >= 3 && (p.ovr >= 80 || tid === s.user)) L.news(L.shortName(tid) + ' ' + p.pos + ' ' + p.n + ' is hurt and out ' + wks + ' weeks' + (wks >= 8 ? ' (could be the season)' : '') + '.', tid === s.user ? 'you' : '');
          }
        });
      });
    });
  }
  function heal() { var P = S().players; for (var k in P) if (P[k].inj > 0) P[k].inj--; }

  // ---------- weeks ----------
  function userGame() { var s = S(); if (s.phase !== 'regular' || !s.sched[s.week]) return null; return s.sched[s.week].filter(function (m) { return m[0] === s.user || m[1] === s.user; })[0] || null; }
  function simWeek(skipUser) {
    var s = S(); if (s.phase !== 'regular') return;
    var wk = s.sched[s.week] || [];
    wk.forEach(function (m) {
      if (skipUser && (m[0] === s.user || m[1] === s.user)) return;
      record(play(m[0], m[1]), s.week + 1);
    });
    endWeek();
  }
  function endWeek() {
    var s = S();
    heal();
    s.week++;
    s.weekLabel = 'Week ' + (s.week + 1);
    if (s.week === s.deadline) L.news('The trade deadline has passed.', 'big');
    if (s.phase === 'regular' && s.week < s.deadline) Trade.cpuWeekly();
    Off.cpuFillRosters();
    if (s.week >= s.sched.length) startPlayoffs();
  }
  // a game the user played live or typed in: record it, then sim the rest of the week
  function finishUserGame(g) {
    var s = S(); g.live = g.live || false;
    record(g, s.week + 1);
    var wk = s.sched[s.week] || [];
    wk.forEach(function (m) { if (m[0] === s.user || m[1] === s.user) return; record(play(m[0], m[1]), s.week + 1); });
    endWeek();
  }

  // ---------- standings ----------
  function wp(t) { var g = t.w + t.l + t.t; return g ? (t.w + t.t / 2) / g : 0; }
  function sorter(a, b) {
    return wp(b) - wp(a) || ((b.dw || 0) - (b.dl || 0)) - ((a.dw || 0) - (a.dl || 0)) || ((b.cw || 0) - (b.cl || 0)) - ((a.cw || 0) - (a.cl || 0)) || (b.pf - b.pa) - (a.pf - a.pa) || (a.id < b.id ? -1 : 1);
  }
  function divisions(conf) {
    var out = {};
    L.teamIds().forEach(function (id) { var t = L.team(id); if (t.conf !== conf) return; (out[t.div] = out[t.div] || []).push(t); });
    Object.keys(out).forEach(function (d) { out[d].sort(sorter); });
    return out;
  }
  function seeds(conf) {
    var dv = divisions(conf), winners = Object.keys(dv).map(function (d) { return dv[d][0]; }).sort(sorter);
    var rest = L.teamIds().map(L.team).filter(function (t) { return t.conf === conf && winners.indexOf(t) < 0; }).sort(sorter);
    return winners.concat(rest);
  }
  function standings(conf) { return seeds(conf); }

  // ---------- playoffs ----------
  var RNAME = ['WILD CARD', 'DIVISIONAL', 'CONFERENCE', 'SUPER BOWL'];
  function startPlayoffs() {
    var s = S();
    s.phase = 'playoffs'; s.weekLabel = 'Playoffs';
    s.po = { r: 0, seeds: { AFC: seeds('AFC').slice(0, 7).map(function (t) { return t.id; }), NFC: seeds('NFC').slice(0, 7).map(function (t) { return t.id; }) }, games: [], champ: null };
    s.po.alive = { AFC: s.po.seeds.AFC.slice(), NFC: s.po.seeds.NFC.slice() };
    var me = s.po.seeds[L.team(s.user).conf].indexOf(s.user);
    L.news('Regular season over. ' + (me >= 0 ? 'You made the playoffs as the ' + U.ord(me + 1) + ' seed!' : 'You missed the playoffs.'), me >= 0 ? 'you big' : 'big');
    makeRound();
  }
  function seedOf(conf, id) { return S().po.seeds[conf].indexOf(id) + 1; }
  function makeRound() {
    var s = S(), po = s.po, r = po.r;
    if (r === 3) {
      var a = po.alive.AFC[0], n = po.alive.NFC[0];
      var ha = L.team(a), hn = L.team(n), home = wp(ha) >= wp(hn) ? a : n;
      po.games.push({ r: 3, h: home, a: home === a ? n : a, done: false, neutral: true });
      return;
    }
    ['AFC', 'NFC'].forEach(function (c) {
      var al = po.alive[c].slice().sort(function (x, y) { return seedOf(c, x) - seedOf(c, y); });
      var list = r === 0 ? al.slice(1) : al; // 1 seed has a bye in the wild card round
      for (var i = 0; i < list.length / 2; i++) po.games.push({ r: r, h: list[i], a: list[list.length - 1 - i], done: false, conf: c });
    });
  }
  function roundGames() { var po = S().po; return po ? po.games.filter(function (g) { return g.r === po.r; }) : []; }
  function userPlayoffGame() { var s = S(); return roundGames().filter(function (g) { return !g.done && (g.h === s.user || g.a === s.user); })[0] || null; }
  function finishPlayoffGame(pg, g) {
    pg.done = true; pg.hs = g.hs; pg.as = g.as; pg.ot = g.ot; pg.live = g.live; pg.set = g.set;
    applyBox(g, true);
    var s = S(), mine = g.h === s.user || g.a === s.user;
    var c = compact(g, 'PO', mine); c.po = RNAME[pg.r]; s.games.push(c);
    var loser = g.hs > g.as ? g.a : g.h;
    ['AFC', 'NFC'].forEach(function (cf) { var i = s.po.alive[cf].indexOf(loser); if (i >= 0) s.po.alive[cf].splice(i, 1); });
    if (pg.r === 3) { s.po.champ = g.hs > g.as ? g.h : g.a; s.po.runner = loser; }
    injuries(g);
  }
  function simRoundRest() { roundGames().forEach(function (pg) { if (!pg.done) finishPlayoffGame(pg, play(pg.h, pg.a, { playoff: true, neutral: pg.neutral })); }); }
  function advanceRound() {
    var s = S(), po = s.po;
    if (roundGames().some(function (g) { return !g.done; })) return;
    heal();
    if (po.r === 3) { endSeason(); return; }
    po.r++; makeRound();
    s.weekLabel = RNAME[po.r];
  }

  // ---------- awards + season end ----------
  function allPlayers() { var P = S().players; return Object.keys(P).map(function (k) { return P[k]; }); }
  function v(st, k) { return st[k] || 0; }
  function score(p) {
    var st0 = p.st, t = L.team(p.t); if (!st0 || !st0.g || !t) return 0;
    var st = {}; ['py', 'ptd', 'int', 'ry', 'rtd', 'rcy', 'rctd', 'sk', 'dint', 'tkl', 'ff'].forEach(function (k) { st[k] = v(st0, k); });
    var wins = wp(t) * 30;
    return st.py * 0.04 + st.ptd * 4 - st.int * 3 + st.ry * 0.1 + st.rtd * 6 + st.rcy * 0.1 + st.rctd * 6 + st.sk * 4 + st.dint * 5 + st.tkl * 0.3 + st.ff * 3 + wins + p.ovr * 0.6;
  }
  function dscore(p) { var st = p.st; if (!st || !st.g) return 0; return v(st, 'sk') * 6 + v(st, 'dint') * 6 + v(st, 'tkl') * 0.3 + v(st, 'ff') * 4 + p.ovr * 1.2; }
  function awards() {
    var s = S(), P = allPlayers().filter(function (p) { return L.team(p.t) && p.st && p.st.g >= 4; });
    var top = function (list, f) { return list.slice().sort(function (a, b) { return f(b) - f(a); })[0] || null; };
    var defs = P.filter(function (p) { return L.DEF.indexOf(p.pos) >= 0; }), offs = P.filter(function (p) { return L.OFF.indexOf(p.pos) >= 0; });
    var rook = P.filter(function (p) { return p.exp === 0; });
    var mvp = top(offs.filter(function (p) { return p.pos === 'QB'; }).concat(offs.filter(function (p) { return (v(p.st, 'ry') + v(p.st, 'rcy')) > 1600; })), function (p) { return score(p) * (p.pos === 'QB' ? 1.15 : 1); });
    var opoy = top(offs.filter(function (p) { return p !== mvp; }), score);
    var dpoy = top(defs, dscore);
    var roy = top(rook, function (p) { return L.DEF.indexOf(p.pos) >= 0 ? dscore(p) : score(p); });
    var out = { mvp: mvp, opoy: opoy, dpoy: dpoy, roy: roy };
    [['mvp', 'MVP'], ['opoy', 'Offensive POY'], ['dpoy', 'Defensive POY'], ['roy', 'Rookie of the Year']].forEach(function (k) { var p = out[k[0]]; if (p) { p.aw = p.aw || []; p.aw.push(s.season + ' ' + k[1]); } });
    return out;
  }
  function endSeason() {
    var s = S(), a = awards(), t = L.team(s.user);
    var champ = s.po.champ, finish;
    var conf = t.conf, sd = s.po.seeds[conf].indexOf(s.user);
    if (champ === s.user) finish = 'Won the Super Bowl';
    else if (s.po.runner === s.user) finish = 'Lost the Super Bowl';
    else if (sd < 0) finish = 'Missed playoffs';
    else {
      var lost = s.games.filter(function (g) { return g.po && (g.h === s.user || g.a === s.user); }).pop();
      finish = lost ? 'Lost in ' + lost.po.toLowerCase() + ' round' : 'Playoffs';
    }
    s.history.unshift({ season: s.season, champ: champ, runner: s.po.runner, mvp: a.mvp && { n: a.mvp.n, id: a.mvp.id, t: a.mvp.t }, opoy: a.opoy && { n: a.opoy.n, t: a.opoy.t }, dpoy: a.dpoy && { n: a.dpoy.n, t: a.dpoy.t }, roy: a.roy && { n: a.roy.n, t: a.roy.t }, rec: t.w + '-' + t.l + (t.t ? '-' + t.t : ''), finish: finish });
    L.news(L.teamName(champ) + ' win Super Bowl ' + roman(s.season - 1966) + '!', 'big');
    if (a.mvp) L.news(a.mvp.n + ' (' + L.shortName(a.mvp.t) + ') is the MVP.', 'big');
    // season stats into careers
    allPlayers().forEach(function (p) {
      var st = p.st; if (!st || !st.g) return;
      var c = { y: s.season, t: p.t, g: st.g, ovr: p.ovr };
      ['cmp', 'att', 'py', 'ptd', 'int', 'car', 'ry', 'rtd', 'rec', 'rcy', 'rctd', 'tkl', 'sk', 'dint', 'fgm', 'fga'].forEach(function (k) { if (st[k]) c[k] = st[k]; });
      p.car.push(c);
      if (p.car.length > 12) p.car.shift();
    });
    Off.startDraft();
  }
  function roman(n) { var v = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1], r = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'], o = ''; for (var i = 0; i < v.length; i++) while (n >= v[i]) { o += r[i]; n -= v[i]; } return o; }

  return { makeSchedule: makeSchedule, newSeason: newSeason, tradeOpen: tradeOpen, play: play, splitScore: splitScore, record: record, simWeek: simWeek, finishUserGame: finishUserGame, userGame: userGame,
    wp: wp, standings: standings, divisions: divisions, seeds: seeds, RNAME: RNAME, roundGames: roundGames, userPlayoffGame: userPlayoffGame, finishPlayoffGame: finishPlayoffGame, simRoundRest: simRoundRest, advanceRound: advanceRound, seedOf: seedOf, roman: roman, lineup: lineup, endWeek: endWeek };
})();
