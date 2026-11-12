// ui_hub.js - home, schedule, roster/depth chart, player card, league, compare, more
(function () {
  var A = UI.A, V = UI.V;
  function S() { return G.S; }
  function divRank(id) { var t = L.team(id), d = Sim.divisions(t.conf)[t.div]; return d.indexOf(t) + 1; }
  function confSeed(id) { var t = L.team(id); return Sim.seeds(t.conf).map(function (x) { return x.id; }).indexOf(id) + 1; }

  V.home = function (p) {
    var s = S();
    var ph = { tags: V.tags, fantasy: V.fantasy, pre: V.pre, playoffs: V.playoffs, draft: V.draft, resign: V.resign, fa: V.fa }[s.phase];
    if (ph) return ph(p);
    var t = L.team(s.user), h = '', R = L.ratings(s.user);
    var last = t.last || [], streak = 0;
    for (var i = last.length - 1; i >= 0 && last[i] === last[last.length - 1]; i--) streak++;
    var gp = t.w + t.l + t.t;
    h += '<div class="hero" style="--tc:' + t.c1 + ';--tc2:' + t.c2 + '">' + UI.logo(s.user, 66) + '<div class="hrec"><div class="hw">' + t.w + '<span>-</span>' + t.l + (t.t ? '<span>-</span>' + t.t : '') + '</div><div class="hsub">' + U.ord(divRank(s.user)) + ' IN ' + t.conf + ' ' + t.div.toUpperCase() + ' &middot; ' + U.ord(confSeed(s.user)) + ' SEED' + (streak && gp ? ' &middot; ' + last[last.length - 1] + streak : '') + '</div></div>' +
      '<div class="hstats"><div><b>' + Math.round(R.ovr) + '</b><span>OVR</span></div><div><b>' + Math.round(R.off) + '</b><span>OFFENSE</span></div><div><b>' + Math.round(R.def) + '</b><span>DEFENSE</span></div><div data-a="strat" class="link"><b>' + (t.strat === 'rebuild' ? 'REBUILD' : 'WIN NOW') + '</b><span>MODE</span></div></div></div>';
    if (s.live) {
      var lv = s.live;
      h += '<div class="card next live"><div class="lbl">GAME IN PROGRESS</div><div class="mu">' + UI.logo(lv.a, 42) + '<div class="vs">' + lv.sc.a + ' - ' + lv.sc.h + '</div>' + UI.logo(lv.h, 42) + '<div class="mut dim">' + (lv.q <= 4 ? 'Q' + lv.q : 'OT') + ' ' + Live.clockStr(lv.clock) + '</div></div><button class="btn gold big" data-a="resume">RESUME GAME</button></div>';
    } else {
      var m = Sim.userGame();
      if (m) h += gameCard(m[0], m[1], 'WEEK ' + (s.week + 1), 'reg');
      else if (s.phase === 'regular') h += '<div class="card"><div class="lbl">WEEK ' + (s.week + 1) + '</div><div class="byeweek">BYE WEEK</div><div class="dim small">You are off this week. Rest up, make a trade, then sim the week.</div><button class="btn gold big" data-a="sim" data-n="week">SIM BYE WEEK</button></div>';
    }
    var n = L.roster(s.user).length;
    if (n < L.ROSTER_MIN) h += '<div class="warn">You need at least ' + L.ROSTER_MIN + ' players (you have ' + n + '). <button class="btn sm gold" data-a="autofill">SIGN CHEAP PLAYERS</button></div>';
    h += '<div class="simgrid3"><button class="btn" data-a="sim" data-n="week">SIM WEEK</button>' +
      (s.week < s.deadline ? '<button class="btn" data-a="sim" data-n="deadline">TO DEADLINE</button>' : '') +
      '<button class="btn" data-a="sim" data-n="season">TO PLAYOFFS</button></div>';
    if (s.week < s.deadline) h += '<div class="dim small center">Trade deadline after week ' + s.deadline + '</div>';
    var mine = s.games.filter(function (g) { return g.h === s.user || g.a === s.user; }).slice(-6).reverse();
    h += '<div class="card"><div class="hrow"><div class="lbl">RECENT GAMES</div><button class="btn ghost sm" data-a="tab" data-v="sched">SCHEDULE</button></div>' + (mine.length ? '<div class="recent">' + mine.map(gameChip).join('') + '</div>' : '<div class="dim small">No games yet.</div>') + '</div>';
    h += divCard(t.conf, t.div);
    h += '<div class="card"><div class="lbl">SALARY CAP ' + s.season + '</div>' + UI.capBar(s.user) + '</div>';
    h += newsList(6);
    return h;
  };
  // the next-game card (regular season or playoffs)
  function gameCard(hid, aid, label, kind) {
    var s = S(), home = hid === s.user, opp = home ? aid : hid, ot = L.team(opp), ro = L.ratings(opp), me = L.ratings(s.user);
    var win = Math.round(100 / (1 + Math.exp(-((me.ovr - ro.ovr) + (home ? 1.6 : kind === 'sb' ? 0 : -1.6)) / 3.2)));
    return '<div class="card next"><div class="lbl">' + label + '</div><div class="mu">' + UI.logo(s.user, 48) + '<div class="vs">' + (home ? 'VS' : '@') + '</div>' + UI.logo(opp, 48) + '<div class="mut"><div class="b">' + U.esc(L.teamName(opp)) + '</div><div class="dim">' + UI.rec(ot) + ' &middot; OVR ' + Math.round(ro.ovr) + ' &middot; you win ' + win + '%</div></div></div>' +
      '<button class="btn gold big" data-a="play" data-k="' + kind + '">PLAY THE GAME</button>' +
      '<div class="g3"><button class="btn" data-a="simgame" data-k="' + kind + '">SIM IT</button><button class="btn" data-a="setscore" data-k="' + kind + '">ENTER STATS</button><button class="btn" data-a="compare" data-id="' + opp + '">MATCHUP</button></div>' +
      '<div class="dim small">Played it somewhere else (Madden, Bobble Bowl, in the yard)? ENTER STATS: type the final and/or the stats you know, and the rest gets simmed.</div></div>';
  }
  V.gameCard = gameCard;
  function divCard(conf, div) {
    var s = S(), list = Sim.divisions(conf)[div];
    return '<div class="card"><div class="lbl">' + conf + ' ' + div.toUpperCase() + '</div><table class="tbl stand">' + list.map(function (t) {
      return '<tr class="' + (t.id === s.user ? 'me' : '') + '" data-a="teamv" data-id="' + t.id + '"><td class="tn">' + UI.logo(t.id, 20) + ' ' + U.esc(t.name) + '</td><td>' + UI.rec(t) + '</td><td class="dim">' + (t.pf - t.pa > 0 ? '+' : '') + (t.pf - t.pa) + '</td></tr>';
    }).join('') + '</table></div>';
  }
  function gameChip(g) {
    var s = S(), me = g.h === s.user, ms = me ? g.hs : g.as, os = me ? g.as : g.hs, opp = me ? g.a : g.h, r = ms > os ? 'w' : ms < os ? 'l' : 't';
    return '<div class="gchip ' + r + '" data-a="gbox" data-i="' + s.games.indexOf(g) + '">' + UI.logo(opp, 26) + '<div class="gr">' + r.toUpperCase() + '</div><div class="gs">' + ms + '-' + os + '</div>' + (g.live ? '<div class="gp">PLAYED</div>' : g.set ? '<div class="gp">SET</div>' : g.po ? '<div class="gp">' + g.po.split(' ')[0] + '</div>' : '') + '</div>';
  }
  A.gbox = function (d) { UI.boxModal(S().games[+d.i]); };
  V.sched = function () {
    var s = S(), h = '<h2>SCHEDULE</h2>';
    if (s.phase !== 'regular') return h + '<div class="card dim">The regular season is over.</div>';
    h += '<div class="dim small">' + s.len + '-game season over ' + s.sched.length + ' weeks. Tap a game for the box score.</div>';
    s.sched.forEach(function (wk, wi) {
      var m = wk.filter(function (x) { return x[0] === s.user || x[1] === s.user; })[0];
      if (!m) { h += '<div class="srow up"><span class="sn2">' + (wi + 1) + '</span><span class="so dim">BYE</span></div>'; return; }
      var home = m[0] === s.user, opp = home ? m[1] : m[0];
      var g = s.games.filter(function (x) { return x.w === wi + 1 && (x.h === s.user || x.a === s.user); })[0];
      if (g) {
        var ms = home ? g.hs : g.as, os = home ? g.as : g.hs, r = ms > os ? 'w' : ms < os ? 'l' : 't';
        h += '<div class="srow" data-a="gbox" data-i="' + s.games.indexOf(g) + '"><span class="sn2">' + (wi + 1) + '</span>' + UI.logo(opp, 24) + '<span class="so">' + (home ? 'vs ' : '@ ') + U.esc(L.shortName(opp)) + '</span><span class="res ' + r + '">' + r.toUpperCase() + '</span><b>' + ms + '-' + os + (g.ot ? ' OT' : '') + '</b>' + (g.live ? '<span class="gp">PLAYED</span>' : g.set ? '<span class="gp">SET</span>' : '') + '</div>';
      } else {
        var t = L.team(opp);
        h += '<div class="srow up' + (wi === s.week ? ' nx' : '') + '"><span class="sn2">' + (wi + 1) + '</span>' + UI.logo(opp, 24) + '<span class="so">' + (home ? 'vs ' : '@ ') + U.esc(L.shortName(opp)) + '</span><span class="dim">' + UI.rec(t) + '</span>' + (wi === s.week && !s.live ? '<button class="btn gold sm" data-a="play" data-k="reg">PLAY</button>' : '') + '</div>';
      }
    });
    return h;
  };
  function newsList(n) {
    var s = S();
    return '<div class="card"><div class="lbl">LEAGUE NEWS</div>' + (s.news.slice(0, n).map(function (x) { return '<div class="news ' + x.k + '"><span class="nd">' + U.esc(x.d) + '</span> ' + U.esc(x.m) + '</div>'; }).join('') || '<div class="dim">Nothing yet.</div>') + (n < 50 ? '<button class="btn ghost sm" data-a="tab" data-v="news">ALL NEWS</button>' : '') + '</div>';
  }
  V.newsList = newsList;
  V.news = function () { return '<h2>NEWS</h2>' + newsList(160); };
  A.strat = function () {
    var t = L.team(S().user); t.strat = t.strat === 'rebuild' ? 'contend' : 'rebuild'; UI.save(); UI.render();
    U.toast(t.strat === 'rebuild' ? 'Rebuild mode: trade values now favor young players and picks.' : 'Win-now mode: trade values favor players who help now.');
  };
  A.autofill = function () {
    var s = S(), g = 0;
    while (L.roster(s.user).length < L.ROSTER_MIN && g++ < 40) {
      var bp = L.byPos(s.user), fas = Off.freeAgents(); if (!fas.length) { Off.makeFiller(40); fas = Off.freeAgents(); }
      var best = fas.slice(0, 150).sort(function (a, b) { return Off.needScore(b, s.user, 'fa') - Off.needScore(a, s.user, 'fa'); })[0];
      L.mv(best, s.user); best.sal = [L.minSal(best.exp)]; best.bon = [0]; delete best.ask;
      L.news('You sign ' + best.pos + ' ' + best.n + ' to a minimum deal.', 'you');
    }
    UI.save(); UI.render();
  };
  A.sim = function (d) {
    var s = S();
    if (s.live) { U.toast('Finish or sim your game in progress first.'); return; }
    if (L.roster(s.user).length < L.ROSTER_MIN) { U.toast('Sign players first: you need ' + L.ROSTER_MIN + '.'); return; }
    var w0 = s.week;
    if (d.n === 'week') Sim.simWeek();
    else if (d.n === 'deadline') { var g = 0; while (s.phase === 'regular' && s.week < s.deadline && g++ < 30) Sim.simWeek(); }
    else if (d.n === 'season') { var g2 = 0; while (s.phase === 'regular' && g2++ < 30) Sim.simWeek(); }
    var wks = s.week - w0;
    if (s.phase === 'regular' && Sim.tradeOpen() && wks > 0 && U.rnd() < Math.min(0.5, wks * 0.14)) {
      var off = Trade.incomingOffer();
      if (off) { UI.st.offer = off; UI.save(); UI.render(); showOffer(off); return; }
    }
    UI.save(); UI.render();
  };
  A.simgame = function (d) {
    var s = S();
    if (d.k === 'reg') { var m = Sim.userGame(); if (!m) return; Sim.finishUserGame(Sim.play(m[0], m[1])); var g = s.games.filter(function (x) { return x.h === s.user || x.a === s.user; }).pop(); UI.save(); UI.render(); if (g) resultToast(g); }
    else { var pg = Sim.userPlayoffGame(); if (!pg) return; var r = Sim.play(pg.h, pg.a, { playoff: true, neutral: pg.neutral }); Sim.finishPlayoffGame(pg, r); UI.save(); UI.render(); resultToast(r); }
  };
  function resultToast(g) { var s = S(), me = g.h === s.user, ms = me ? g.hs : g.as, os = me ? g.as : g.hs; U.toast((ms > os ? 'WIN ' : ms < os ? 'LOSS ' : 'TIE ') + ms + '-' + os + ' vs ' + L.shortName(me ? g.a : g.h)); }
  // ENTER STATS (score + known player stats) lives in ui_cap.js
  UI.resultToast = resultToast;
  function showOffer(tr) {
    UI.modal('<h3>TRADE CALL</h3><div class="mu">' + UI.logo(tr.b, 42) + '<div><b>' + U.esc(L.teamName(tr.b)) + '</b><div class="dim">want to make a deal</div></div></div>' +
      '<div class="lbl">YOU GET</div>' + tr.bp.map(function (id) { return UI.playerRow(L.player(id)); }).join('') + tr.bpk.map(function (id) { return '<div class="pkrow">' + L.pickLabel(Trade.pk(id)) + '</div>'; }).join('') +
      '<div class="lbl">YOU SEND</div>' + tr.ap.map(function (id) { return UI.playerRow(L.player(id)); }).join('') + tr.apk.map(function (id) { return '<div class="pkrow">' + L.pickLabel(Trade.pk(id)) + '</div>'; }).join('') +
      '<div class="row"><button class="btn gold" data-a="offeryes">ACCEPT</button><button class="btn" data-a="offeredit">EDIT IN TRADE</button><button class="btn ghost" data-a="close">NO THANKS</button></div>');
  }
  A.offeryes = function () {
    var tr = UI.st.offer; UI.closeModal(); if (!tr) return;
    var errs = Trade.validate(tr); if (errs.length) { U.toast(errs[0]); return; }
    Trade.execute(tr); UI.st.offer = null; UI.save(); UI.render(); U.toast('Trade done.');
  };
  A.offeredit = function () { var tr = UI.st.offer; UI.closeModal(); UI.st.offer = null; UI.go('trade', { b: tr.b, ap: tr.ap, bp: tr.bp, apk: tr.apk, bpk: tr.bpk }); };

  // ---------- roster / depth chart ----------
  var GROUPS = [['OFF', 'OFFENSE'], ['DEF', 'DEFENSE'], ['ST', 'SPECIAL'], ['ALL', 'ALL']];
  V.roster = function (p) {
    var s = S(), g = p.g || 'OFF', bp = L.byPos(s.user), n = L.roster(s.user).length, mx = L.rosterMax();
    var h = '<div class="hrow"><h2>ROSTER <span class="dim ' + (n > mx ? 'neg' : '') + '">' + n + '/' + mx + '</span></h2><div><button class="btn sm" data-a="compare">MATCHUP</button> <button class="btn sm" data-a="autodepth">BEST DEPTH</button> <button class="btn sm" data-a="sbsend">TO SCOREBOARD</button></div></div>';
    h += '<button class="btn gold wide" data-a="cpnew">+ CREATE A PLAYER</button>';
    h += '<div class="subtabs">' + GROUPS.map(function (x) { return '<button data-a="rgrp" data-g="' + x[0] + '" class="' + (g === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
    if (g === 'ALL') {
      h += L.roster(s.user).sort(function (a, b) { return b.ovr - a.ovr; }).map(function (q) { return UI.playerRow(q, '<div class="pst">' + UI.statLine(q) + '</div>'); }).join('');
    } else {
      var list = g === 'OFF' ? L.OFF : g === 'DEF' ? L.DEF : L.ST;
      h += '<div class="dim small">Gold = starter. Tap a player to move him up the depth chart, restructure, trade or cut him.</div>';
      list.forEach(function (pos) {
        var ps = bp[pos], need = L.STARTERS[pos] || 0;
        if (!ps.length && !need) return;
        h += '<div class="sect">' + L.POSNAME[pos].toUpperCase() + (need ? ' <span class="dim">(' + need + ' start)</span>' : '') + '</div>';
        if (!ps.length) h += '<div class="warn small">Nobody here. Someone from another spot fills in (and plays worse). Sign one in LEAGUE &gt; FREE AGENTS.</div>';
        var healthyIdx = 0;
        ps.forEach(function (q) {
          var starter = !(q.inj > 0) && healthyIdx < need; if (!(q.inj > 0)) healthyIdx++;
          h += UI.playerRow(q, '<div class="pst">' + UI.statLine(q) + '</div>', 'player', starter ? 'starter' : '');
        });
      });
    }
    h += '<div class="card"><div class="lbl">CAP</div>' + UI.capBar(s.user) + '</div>';
    return h;
  };
  A.rgrp = function (d) { UI.go('roster', { g: d.g }); };
  A.autodepth = function () { L.team(S().user).depth = null; UI.save(); UI.render(); U.toast('Depth chart set by overall.'); };
  A.dmove = function (d) {
    var s = S(), p = L.player(+d.id), bp = L.byPos(s.user), ids = bp[p.pos].map(function (x) { return x.id; }), i = ids.indexOf(p.id);
    if (d.dir === 'top') { ids.splice(i, 1); ids.unshift(p.id); }
    else { var j = i + (+d.dir); if (j < 0 || j >= ids.length) return; ids[i] = ids[j]; ids[j] = p.id; }
    L.setDepth(s.user, p.pos, ids); UI.save(); UI.closeModal(); UI.render();
  };

  // ---------- player card ----------
  function statTable(p, st, title) {
    if (!st || !st.g) return '';
    var v = function (k) { return st[k] || 0; }, rows;
    if (p.pos === 'QB') rows = [['CMP', v('cmp') + '/' + v('att')], ['YDS', v('py')], ['TD', v('ptd')], ['INT', v('int')], ['RUSH', v('ry')]];
    else if (p.pos === 'RB' || p.pos === 'FB') rows = [['CAR', v('car')], ['YDS', v('ry')], ['YPC', v('car') ? (v('ry') / v('car')).toFixed(1) : '-'], ['TD', v('rtd')], ['REC', v('rec') + '-' + v('rcy')]];
    else if (p.pos === 'WR' || p.pos === 'TE') rows = [['REC', v('rec')], ['TGT', v('tgt')], ['YDS', v('rcy')], ['TD', v('rctd')], ['YPR', v('rec') ? (v('rcy') / v('rec')).toFixed(1) : '-']];
    else if (p.pos === 'K') rows = [['FG', v('fgm') + '/' + v('fga')], ['XP', v('xpm') + '/' + v('xpa')]];
    else if (p.pos === 'P') rows = [['PUNTS', v('punts')]];
    else if (L.DEF.indexOf(p.pos) >= 0) rows = [['TKL', v('tkl')], ['SACK', v('sk')], ['INT', v('dint')], ['FF', v('ff')]];
    else rows = [];
    return '<div class="lbl">' + title + '</div><table class="tbl"><tr><th>G</th>' + rows.map(function (r) { return '<th>' + r[0] + '</th>'; }).join('') + '</tr><tr><td>' + st.g + '</td>' + rows.map(function (r) { return '<td>' + r[1] + '</td>'; }).join('') + '</tr></table>';
  }
  A.player = function (d) {
    var p = L.player(+d.id); if (!p) return;
    var s = S(), mine = p.t === s.user, t = L.team(p.t);
    var where = t ? L.teamName(p.t) : p.t === 'DC' ? 'DRAFT PROSPECT' + (p.school ? ' &middot; ' + U.esc(p.school) : '') : p.t === 'POOL' ? 'IN THE DRAFT POOL' : 'FREE AGENT';
    var h = '<div class="pc"><div class="pchead" style="--tc:' + (t ? t.c1 : '#333') + '">' + UI.face(p, 86) + '<div><div class="pcn">' + U.esc(p.n) + '</div><div class="dim">' + where + '</div><div class="dim">' + L.POSNAME[p.pos] + (p.num ? ' &middot; #' + p.num : '') + ' &middot; ' + p.age + ' yrs &middot; ' + (p.exp <= 0 ? 'ROOKIE' : p.exp + ' YR EXP') + '</div>' + (p.xf ? '<div class="xf">X-FACTOR: ' + U.esc(p.xf.toUpperCase()) + '</div>' : '') + '</div></div>';
    h += '<div class="pcr"><div><b>' + p.ovr + '</b><span>OVR</span></div><div><b>' + UI.potStr(p) + '</b><span>POT</span></div><div><b>' + p.spd + '</b><span>SPEED</span></div><div><b>' + Math.max(0, L.playerValue(p, s.user)).toFixed(0) + '</b><span>VALUE</span></div></div>';
    if (p.inj > 0) h += '<div class="warn">Injured: out about ' + p.inj + ' more week' + (p.inj > 1 ? 's' : '') + '.</div>';
    if (p.prog) h += '<div class="dim small">Offseason change: ' + (p.prog > 0 ? '+' : '') + p.prog + ' OVR</div>';
    var yrs = (p.sal || []).map(function (x, i) { return { y: s.season + i, x: x, b: (p.bon || [])[i] || 0 }; }).filter(function (o) { return o.x > 0; });
    if (yrs.length) {
      h += '<div class="lbl">CONTRACT (CAP HIT)</div><div class="bxw"><table class="tbl"><tr><th></th>' + yrs.map(function (o) { return '<th>' + o.y + '</th>'; }).join('') + '</tr><tr><td class="dim">CAP</td>' + yrs.map(function (o) { return '<td>' + U.money(o.x) + '</td>'; }).join('') + '</tr><tr><td class="dim">BONUS</td>' + yrs.map(function (o) { return '<td class="dim">' + U.money(o.b) + '</td>'; }).join('') + '</tr></table></div>';
      if (t) h += '<div class="dim small">Cut him now: ' + U.money(Off.deadIf(p)) + ' dead money, saves ' + U.money(Math.max(0, (p.sal[0] || 0) - Off.deadIf(p))) + ' this year.' + (p.tagged === s.season ? ' On the franchise tag.' : '') + '</div>';
    } else if (p.ask) h += '<div class="lbl">ASKING FOR</div><div>' + U.money(p.ask.amt) + ' a year, ' + p.ask.yrs + ' yr' + (p.ask.yrs > 1 ? 's' : '') + '</div>';
    h += statTable(p, p.st, 'THIS SEASON') + statTable(p, p.pst, 'PLAYOFFS');
    if (p.car && p.car.length) h += '<div class="lbl">CAREER (THIS SAVE)</div><div class="bxw"><table class="tbl"><tr><th>YR</th><th>TM</th><th>G</th><th>OVR</th><th>STATS</th></tr>' + p.car.slice().reverse().map(function (c) { return '<tr><td>' + c.y + '</td><td>' + c.t + '</td><td>' + c.g + '</td><td>' + c.ovr + '</td><td class="small">' + UI.statLine(p, c) + '</td></tr>'; }).join('') + '</table></div>';
    if (p.aw && p.aw.length) h += '<div class="lbl">AWARDS</div><div>' + p.aw.map(U.esc).join(', ') + '</div>';
    if (p.dp) h += '<div class="dim small">Drafted #' + p.dp + ' overall' + (p.school ? ' out of ' + U.esc(p.school) : '') + '</div>';
    h += '<div class="row wrap">';
    if (mine) {
      h += '<button class="btn" data-a="dmove" data-id="' + p.id + '" data-dir="top">MAKE STARTER</button><button class="btn" data-a="dmove" data-id="' + p.id + '" data-dir="-1">UP</button><button class="btn" data-a="dmove" data-id="' + p.id + '" data-dir="1">DOWN</button>';
      if (Off.canRestructure(p)) h += '<button class="btn" data-a="restr" data-id="' + p.id + '">RESTRUCTURE</button>';
      if (Sim.tradeOpen()) h += '<button class="btn gold" data-a="shop" data-id="' + p.id + '">FIND TRADES</button>';
      if (p.cust) h += '<button class="btn gold" data-a="cpedit" data-id="' + p.id + '">EDIT PLAYER</button>';
      h += '<button class="btn red" data-a="release" data-id="' + p.id + '">RELEASE</button>';
    } else if (t && Sim.tradeOpen()) h += '<button class="btn gold" data-a="tradefor" data-id="' + p.id + '">TRADE FOR HIM</button>';
    else if (p.t === 'FA' && s.phase !== 'fantasy') h += '<button class="btn gold" data-a="faoffer" data-id="' + p.id + '">OFFER CONTRACT</button>';
    h += '<button class="btn ghost" data-a="close">CLOSE</button></div></div>';
    UI.modal(h);
  };
  A.restr = function (d) {
    var p = L.player(+d.id), save = Off.restructure(p.id);
    UI.closeModal(); UI.save(); UI.render();
    U.toast(save ? 'Restructured ' + p.n + ': ' + U.money(save) + ' cap space this year (more later).' : 'Could not restructure.');
  };
  A.release = function (d) {
    var p = L.player(+d.id), dead = Off.deadIf(p);
    UI.modal('<h3>RELEASE ' + U.esc(p.n.toUpperCase()) + '?</h3><p>' + (dead > 0.01 ? U.money(dead) + ' of signing bonus hits your cap right away as dead money. ' : 'No dead money. ') + 'You save ' + U.money(Math.max(0, (p.sal[0] || 0) - dead)) + ' this year.</p><div class="row"><button class="btn red" data-a="releaseyes" data-id="' + p.id + '">RELEASE</button><button class="btn ghost" data-a="close">CANCEL</button></div>');
  };
  A.releaseyes = function (d) { var err = Off.release(+d.id); UI.closeModal(); if (err) U.toast(err); UI.save(); UI.render(); };
  A.tradefor = function (d) { var p = L.player(+d.id); UI.closeModal(); UI.go('trade', { b: p.t, bp: [p.id] }); };
  A.shop = function (d) { UI.closeModal(); UI.go('trade', { b: null, ap: [+d.id], find: true }); };
  A.faoffer = function (d) {
    var p = L.player(+d.id), s = S(); if (!p.ask) Off.setAsk(p);
    var ask = p.ask, mult = s.phase === 'fa' ? ({ 1: 1, 2: 0.9, 3: 0.78 }[s.faDay] || 0.75) : 0.85;
    var amt = Math.round(ask.amt * mult * 100) / 100;
    UI.modal('<h3>OFFER ' + U.esc(p.n.toUpperCase()) + '</h3><div class="dim small">' + p.pos + ' &middot; ' + p.ovr + ' OVR &middot; ' + p.age + ' yrs. He wants about ' + U.money(amt) + ' a year for ' + ask.yrs + ' yr' + (ask.yrs > 1 ? 's' : '') + '. You have ' + U.money(L.capSpace(s.user)) + ' of cap space.</div>' +
      '<div class="lbl">PER YEAR: <b id="fo_v">' + U.money(amt) + '</b></div><input type="range" id="fo_amt" min="' + L.minSal(p.exp) + '" max="' + Math.max(amt * 1.5, L.minSal(p.exp) + 1).toFixed(2) + '" step="0.05" value="' + amt + '" data-in="foamt">' +
      '<div class="lbl">YEARS</div><div class="seg" id="fo_y">' + [1, 2, 3, 4, 5].map(function (y) { return '<button data-a="foyrs" data-y="' + y + '" class="' + (y === ask.yrs ? 'on' : '') + '">' + y + '</button>'; }).join('') + '</div>' +
      '<div class="row"><button class="btn gold" data-a="fosend" data-id="' + p.id + '">SEND OFFER</button><button class="btn" data-a="fomin" data-id="' + p.id + '">MIN DEAL</button><button class="btn ghost" data-a="close">CANCEL</button></div>');
    UI.st.foY = ask.yrs;
  };
  A.foamt = function (d, el) { U.$('#fo_v').textContent = U.money(+el.value); };
  A.foyrs = function (d) { UI.st.foY = +d.y; document.querySelectorAll('#fo_y button').forEach(function (b) { b.classList.toggle('on', +b.dataset.y === +d.y); }); };
  A.fosend = function (d) { var r = Off.offer(+d.id, +U.$('#fo_amt').value, UI.st.foY || 1); if (r.ok) { UI.closeModal(); UI.save(); UI.render(); U.toast('Signed!'); } else U.toast(r.msg); };
  A.fomin = function (d) { var p = L.player(+d.id), r = Off.offer(+d.id, L.minSal(p.exp), 1); if (r.ok) { UI.closeModal(); UI.save(); UI.render(); U.toast('Signed!'); } else U.toast(r.msg); };

  // ---------- league ----------
  var SUBS = [['stand', 'STANDINGS'], ['seeds', 'PLAYOFF PICTURE'], ['teams', 'POWER'], ['leaders', 'LEADERS'], ['fa', 'FREE AGENTS'], ['prospects', 'PROSPECTS'], ['history', 'HISTORY'], ['moves', 'TRADES']];
  V.league = function (p) {
    var sub = p.sub || 'stand', s = S(), conf = p.conf || L.team(s.user).conf;
    var h = '<div class="subtabs">' + SUBS.map(function (x) { return '<button data-a="lsub" data-s="' + x[0] + '" class="' + (sub === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>';
    var cseg = '<div class="seg">' + ['AFC', 'NFC'].map(function (c) { return '<button data-a="lconf" data-s="' + sub + '" data-c="' + c + '" class="' + (conf === c ? 'on' : '') + '">' + c + '</button>'; }).join('') + '</div>';
    if (sub === 'stand') {
      h += cseg;
      var dv = Sim.divisions(conf);
      ['East', 'North', 'South', 'West'].forEach(function (d) {
        if (!dv[d]) return;
        h += '<div class="card"><div class="lbl">' + conf + ' ' + d.toUpperCase() + '</div><table class="tbl stand"><tr><th>TEAM</th><th>W-L</th><th>DIV</th><th>PF</th><th>PA</th><th>STRK</th></tr>' + dv[d].map(function (t) {
          var l = t.last || [], k = 0; for (var i = l.length - 1; i >= 0 && l[i] === l[l.length - 1]; i--) k++;
          return '<tr class="' + (t.id === s.user ? 'me' : '') + '" data-a="teamv" data-id="' + t.id + '"><td class="tn">' + UI.logo(t.id, 20) + ' ' + U.esc(t.name) + '</td><td>' + UI.rec(t) + '</td><td class="dim">' + (t.dw || 0) + '-' + (t.dl || 0) + '</td><td>' + t.pf + '</td><td>' + t.pa + '</td><td class="dim">' + (l.length ? l[l.length - 1] + k : '-') + '</td></tr>';
        }).join('') + '</table></div>';
      });
    } else if (sub === 'seeds') {
      h += cseg;
      var sd = Sim.seeds(conf);
      h += '<div class="card"><div class="lbl">' + conf + ' PLAYOFF PICTURE</div><table class="tbl stand">' + sd.map(function (t, i) {
        return '<tr class="' + (t.id === s.user ? 'me' : '') + (i === 3 || i === 6 ? ' cut' : '') + '" data-a="teamv" data-id="' + t.id + '"><td>' + (i + 1) + '</td><td class="tn">' + UI.logo(t.id, 20) + ' ' + U.esc(t.name) + '</td><td>' + UI.rec(t) + '</td><td class="dim">' + (i < 4 ? 'DIV' : i < 7 ? 'WILD CARD' : '') + '</td></tr>';
      }).join('') + '</table><div class="dim small">Top 4 = division winners. 5-7 = wild cards. The 1 seed gets a bye.</div></div>';
    } else if (sub === 'teams') {
      h += L.ovrRank().map(function (x, i) { var t = L.team(x.id), R = L.ratings(x.id); return '<div class="trow" data-a="teamv" data-id="' + x.id + '"><span class="sn2">' + (i + 1) + '</span>' + UI.logo(x.id, 32) + '<div class="pmain"><div class="pname">' + U.esc(L.teamName(x.id)) + '</div><div class="psub">' + UI.rec(t) + ' &middot; OFF ' + Math.round(R.off) + ' DEF ' + Math.round(R.def) + ' &middot; ' + U.money(L.capSpace(x.id)) + ' space &middot; ' + (t.strat === 'rebuild' ? 'Rebuilding' : 'Contending') + '</div></div><div class="prat">' + UI.ovrTag(Math.round(x.r)) + '</div></div>'; }).join('');
    } else if (sub === 'leaders') {
      var P = Object.keys(s.players).map(function (k) { return s.players[k]; }).filter(function (q) { return L.team(q.t) && q.st && q.st.g; });
      var cats = [['py', 'PASSING YARDS'], ['ptd', 'PASSING TD'], ['ry', 'RUSHING YARDS'], ['rcy', 'RECEIVING YARDS'], ['rec', 'RECEPTIONS'], ['tds', 'TOUCHDOWNS'], ['sk', 'SACKS'], ['dint', 'INTERCEPTIONS'], ['tkl', 'TACKLES']];
      if (!P.length) h += '<div class="card dim">No games played yet. Here are the best players in the league.</div>' + Object.keys(s.players).map(function (k) { return s.players[k]; }).filter(function (q) { return L.team(q.t); }).sort(function (a, b) { return b.ovr - a.ovr; }).slice(0, 25).map(function (q) { return UI.playerRow(q, '<div class="pst">' + U.esc(L.shortName(q.t)) + '</div>'); }).join('');
      else cats.forEach(function (c) {
        var val = function (q) { return c[0] === 'tds' ? (q.st.rtd || 0) + (q.st.rctd || 0) : (q.st[c[0]] || 0); };
        var top = P.slice().sort(function (a, b) { return val(b) - val(a); }).slice(0, 6).filter(function (q) { return val(q) > 0; });
        h += '<div class="card"><div class="lbl">' + c[1] + '</div>' + (top.map(function (q, i) { return '<div class="lrow" data-a="player" data-id="' + q.id + '"><span class="sn2">' + (i + 1) + '</span>' + UI.logo(q.t, 18) + '<span class="ln">' + U.esc(q.n) + ' <span class="dim">' + q.pos + '</span></span><b>' + val(q) + '</b></div>'; }).join('') || '<div class="dim">-</div>') + '</div>';
      });
    } else if (sub === 'fa') {
      var fas = Off.freeAgents(), f = p.f || 'ALL';
      h += '<div class="dim small">' + (s.phase === 'fa' ? 'Free agency is open: offer anyone you have cap space for.' : 'Free agents. Anyone left can be signed any time (a cheap deal or what they ask, if you have the space).') + ' You have ' + U.money(L.capSpace(s.user)) + ' of space.</div>';
      h += '<div class="chips">' + ['ALL'].concat(L.ALLPOS).map(function (x) { return '<button class="chip ' + (f === x ? 'on' : '') + '" data-a="faf" data-f="' + x + '">' + x + '</button>'; }).join('') + '</div>';
      h += fas.filter(function (q) { return f === 'ALL' || q.pos === f; }).slice(0, 80).map(function (q) { if (!q.ask) Off.setAsk(q); return UI.playerRow(q, '<div class="pst">' + U.money(q.ask.amt) + '<br><span class="dim">' + q.ask.yrs + ' yr</span></div>'); }).join('') || '<div class="dim">Nobody here.</div>';
    } else if (sub === 'prospects') {
      var dc = Off.draftClass();
      h += '<div class="dim small">The ' + (s.dr ? s.dr.year : s.season + 1) + ' draft class. POT is a scouting range.' + (s.season + 1 === 2027 ? ' The 2027 class has the real top prospects (our own ratings); the rest are made-up.' : ' Made-up players.') + '</div>' + dc.slice(0, 60).map(function (q, i) { return UI.playerRow(q, '<div class="pst">#' + (i + 1) + '<br><span class="dim">' + U.esc(q.school || '') + '</span></div>'); }).join('');
    } else if (sub === 'history') {
      h += s.history.length ? s.history.map(function (x) { return '<div class="card hist"><div class="lbl">' + x.season + ' SEASON</div><div class="hr">' + UI.logo(x.champ, 34) + '<div><b>' + U.esc(L.teamName(x.champ)) + '</b> won the Super Bowl<div class="dim">beat ' + U.esc(L.shortName(x.runner)) + '</div><div class="dim small">MVP ' + U.esc(x.mvp ? x.mvp.n : '-') + ' &middot; OPOY ' + U.esc(x.opoy ? x.opoy.n : '-') + ' &middot; DPOY ' + U.esc(x.dpoy ? x.dpoy.n : '-') + ' &middot; ROY ' + U.esc(x.roy ? x.roy.n : '-') + '</div><div class="small">You: ' + x.rec + ', ' + x.finish + '</div></div></div></div>'; }).join('') : '<div class="dim">No seasons finished yet.</div>';
      if (s.lastDraft) h += '<div class="card"><div class="lbl">' + s.lastDraft.year + ' DRAFT: FIRST ROUND</div>' + s.lastDraft.log.slice(0, 32).map(function (x) { var q = L.player(x.p); return '<div class="lrow"' + (q ? ' data-a="player" data-id="' + q.id + '"' : '') + '><span class="sn2">' + x.n + '</span>' + UI.logo(x.t, 18) + '<span class="ln">' + (q ? U.esc(q.n) + ' <span class="dim">' + q.pos + '</span>' : 'retired') + '</span></div>'; }).join('') + '</div>';
    } else if (sub === 'moves') {
      h += s.tradeLog.length ? s.tradeLog.slice(0, 60).map(function (x) { return '<div class="news">' + x.season + ' ' + U.esc(x.d || '') + ': ' + U.esc(x.txt) + '</div>'; }).join('') : '<div class="dim">No trades yet.</div>';
    }
    return h;
  };
  A.lsub = function (d) { UI.go('league', { sub: d.s }); };
  A.lconf = function (d) { UI.go('league', { sub: d.s, conf: d.c }); };
  A.faf = function (d) { var y = window.scrollY; UI.st.p.f = d.f; UI.render(); window.scrollTo(0, y); };
  A.teamv = function (d) { UI.go('team', { id: d.id }); };
  V.team = function (p) {
    var s = S(), t = L.team(p.id), R = L.ratings(p.id), bp = L.byPos(p.id);
    var h = '<button class="back" data-a="tab" data-v="league">BACK</button><div class="thead" style="--tc:' + t.c1 + '">' + UI.logo(p.id, 58) + '<div><h2>' + U.esc(L.teamName(p.id)) + '</h2><div class="dim">' + UI.rec(t) + ' &middot; ' + t.conf + ' ' + t.div + ' &middot; OVR ' + Math.round(R.ovr) + ' (OFF ' + Math.round(R.off) + ', DEF ' + Math.round(R.def) + ') &middot; ' + (t.strat === 'rebuild' ? 'Rebuilding' : 'Contending') + '</div></div></div>';
    if (p.id !== s.user) h += '<div class="row"><button class="btn" data-a="compare" data-id="' + p.id + '">MATCHUP VS YOU</button>' + (Sim.tradeOpen() ? '<button class="btn gold" data-a="tradewith" data-id="' + p.id + '">TRADE WITH THEM</button>' : '') + '</div>';
    h += '<div class="row"><button class="btn" data-a="sbsend" data-id="' + p.id + '">SEND TO SCOREBOARD</button></div>';
    h += '<div class="card">' + UI.capBar(p.id) + '</div>';
    L.ALLPOS.forEach(function (pos) {
      if (!bp[pos].length) return;
      h += '<div class="sect">' + L.POSNAME[pos].toUpperCase() + '</div>' + bp[pos].map(function (q, i) { return UI.playerRow(q, '<div class="pst">' + UI.statLine(q) + '</div>', 'player', i < (L.STARTERS[pos] || 0) ? 'starter' : ''); }).join('');
    });
    h += '<div class="card"><div class="lbl">DRAFT PICKS</div>' + (L.picksOf(p.id).map(function (k) { return '<span class="chip">' + L.pickLabel(k) + '</span>'; }).join('') || '<div class="dim">None</div>') + '</div>';
    return h;
  };
  // ---------- matchup / compare ----------
  function cmpRow(lbl, a, b, fmt, lowGood) {
    var w = a === b ? 0 : (a > b) !== !!lowGood ? 1 : 2;
    return '<div class="crow"><b class="' + (w === 1 ? 'cw' : '') + '">' + fmt(a) + '</b><span>' + lbl + '</span><b class="' + (w === 2 ? 'cw' : '') + '">' + fmt(b) + '</b></div>';
  }
  function pcell(x) {
    if (!x || !x.p) return '<div class="cp empty">-</div>';
    var p = x.p;
    return '<div class="cp" data-a="player" data-id="' + p.id + '">' + UI.ovrTag(p.ovr) + '<div class="pmain"><div class="pname">' + U.esc(p.n) + '</div><div class="psub">' + p.pos + (x.out ? ' (fill-in)' : '') + ' &middot; ' + p.age + 'y</div></div></div>';
  }
  V.compare = function (p) {
    var s = S(), a = s.user, b = p.id;
    var ids = L.teamIds().filter(function (id) { return id !== a; }).sort(function (x, y) { return L.teamName(x).localeCompare(L.teamName(y)); });
    if (!b) { var m = Sim.userGame(); if (m) b = m[0] === a ? m[1] : m[0]; var pg = Sim.userPlayoffGame && Sim.userPlayoffGame(); if (!b && pg) b = pg.h === a ? pg.a : pg.h; }
    if (!b) b = ids[0];
    var h = '<button class="back" data-a="tab" data-v="home">BACK</button><h2>MATCHUP</h2><div class="tpart">' + UI.logo(b, 36) + '<select data-ch="cmpteam">' + ids.map(function (id) { return '<option value="' + id + '"' + (id === b ? ' selected' : '') + '>' + U.esc(L.teamName(id)) + '</option>'; }).join('') + '</select></div>';
    var ta = L.team(a), tb = L.team(b), RA = L.ratings(a), RB = L.ratings(b), SA = L.starters(a), SB = L.starters(b);
    h += '<div class="chead"><div>' + UI.logo(a, 46) + '<b>' + U.esc(L.shortName(a)) + '</b><span>' + UI.rec(ta) + '</span></div><div class="cvs">VS</div><div>' + UI.logo(b, 46) + '<b>' + U.esc(L.shortName(b)) + '</b><span>' + UI.rec(tb) + '</span></div></div>';
    var gp = function (t) { return t.w + t.l + t.t; };
    var f1 = function (x) { return x.toFixed(1); }, f0 = function (x) { return Math.round(x); };
    h += '<div class="card">' + cmpRow('TEAM OVR', RA.ovr, RB.ovr, f1) + cmpRow('OFFENSE', RA.off, RB.off, f1) + cmpRow('DEFENSE', RA.def, RB.def, f1) +
      cmpRow('QB', SA.QB[0].r, SB.QB[0].r, f0) + cmpRow('O-LINE', U.avg(SA.OT.concat(SA.G, SA.C), function (x) { return x.r; }), U.avg(SB.OT.concat(SB.G, SB.C), function (x) { return x.r; }), f1) +
      cmpRow('PASS RUSH', U.avg(SA.EDGE.concat(SA.DT), function (x) { return x.r; }), U.avg(SB.EDGE.concat(SB.DT), function (x) { return x.r; }), f1) + cmpRow('SECONDARY', U.avg(SA.CB.concat(SA.S), function (x) { return x.r; }), U.avg(SB.CB.concat(SB.S), function (x) { return x.r; }), f1) +
      cmpRow('PTS / GAME', gp(ta) ? ta.pf / gp(ta) : 0, gp(tb) ? tb.pf / gp(tb) : 0, function (x) { return x ? x.toFixed(1) : '-'; }) + cmpRow('ALLOWED / GAME', gp(ta) ? ta.pa / gp(ta) : 0, gp(tb) ? tb.pa / gp(tb) : 0, function (x) { return x ? x.toFixed(1) : '-'; }, true) +
      cmpRow('CAP SPACE', L.capSpace(a), L.capSpace(b), U.money) + '</div>';
    function grid(title, keys) {
      var g = '<div class="lbl">' + title + '</div><div class="cgrid">';
      keys.forEach(function (pos) { SA[pos].forEach(function (xa, i) { var xb = SB[pos][i], d = (xa.p ? xa.r : 0) - (xb && xb.p ? xb.r : 0); g += pcell(xa) + '<div class="cd ' + (d > 0 ? 'pos' : d < 0 ? 'neg' : 'dim') + '">' + (d > 0 ? '+' + d : d < 0 ? d : '=') + '</div>' + pcell(xb); }); });
      return g + '</div>';
    }
    h += grid('OFFENSE STARTERS', ['QB', 'RB', 'WR', 'TE', 'OT', 'G', 'C']) + grid('DEFENSE STARTERS', ['EDGE', 'DT', 'LB', 'CB', 'S']) + grid('SPECIAL TEAMS', ['K', 'P']);
    if (Sim.tradeOpen()) h += '<button class="btn gold wide" data-a="tradewith" data-id="' + b + '">TRADE WITH THEM</button>';
    return h;
  };
  A.compare = function (d) { UI.closeModal(); UI.go('compare', { id: d.id || null }); };
  A.cmpteam = function (d, el) { UI.go('compare', { id: el.value }); };
  A.tradewith = function (d) { UI.go('trade', { b: d.id }); };

  // ---------- more ----------
  V.more = function () {
    var s = S(), h = '<h2>FRONT OFFICE</h2>';
    var ln = s.len || 17;
    h += '<div class="card"><div class="lbl">GAMES PER SEASON</div><div class="seg">' + [6, 10, 14, 17].map(function (n) { return '<button data-a="setlen" data-n="' + n + '" class="' + ((s.lenNext || ln) === n ? 'on' : '') + '">' + n + '</button>'; }).join('') + '</div><div class="dim small">' + (s.phase === 'regular' || s.phase === 'playoffs' ? 'This season is ' + ln + ' games. A change starts next season.' : 'Next season: ' + (s.lenNext || ln) + ' games.') + '</div></div>';
    h += '<div class="card"><div class="lbl">CAP BY YEAR</div><table class="tbl"><tr><th>YEAR</th><th>CAP</th><th>COMMITTED</th><th>ROOM</th></tr>';
    for (var y = 0; y < 5; y++) { var cap = L.teamCap(s.user, y), pay = L.payroll(s.user, y); h += '<tr><td>' + (s.season + y) + '</td><td>' + U.money(cap) + '</td><td>' + U.money(pay) + '</td><td class="' + (pay > cap ? 'neg' : 'pos') + '">' + U.money(cap - pay) + '</td></tr>'; }
    h += '</table><div class="dim small">The cap grows about 7% a year. Future years only count contracts already signed. Restructure a big contract on the player card to free space now (it pushes money into later years).</div>';
    if (L.capSpace(s.user) < 0) h += '<button class="btn gold wide" data-a="fixcap">FIX MY CAP</button>';
    h += '</div>';
    var dead = (L.team(s.user).dead || []).filter(function (d) { return d.y >= s.season; });
    if (dead.length || L.deadNow(s.user) > 0) h += '<div class="card"><div class="lbl">DEAD MONEY ' + s.season + '</div><div class="lrow"><span class="ln">Old deals + IR (real)</span><b>' + U.money(L.deadNow(s.user) - U.sum(dead.filter(function (d) { return d.y === s.season; }), function (d) { return d.amt; })) + '</b></div>' + dead.map(function (d) { return '<div class="lrow"><span class="ln">' + U.esc(d.n) + ' <span class="dim">' + d.y + '</span></span><b>' + U.money(d.amt) + '</b></div>'; }).join('') + '</div>';
    h += '<div class="card"><div class="lbl">HOW IT WORKS</div><div class="small">Each week: PLAY your game (you call every play), SIM it, or ENTER STATS if you played it somewhere else (type what you know, the rest gets simmed). Trades close after the deadline. After the Super Bowl: the 7-round NFL Draft, re-sign or franchise-tag your expiring players, 3 days of free agency, then cut-down day (53 players). Hard cap: you have to be under it to start the season. Trades need the other team at 80% or more.</div></div>';
    h += '<div class="card"><div class="lbl">SEND A TEAM TO SCOREBOARD</div><div class="small">Play a real game with your starters and keep stats in the Scoreboard app. Any team works: open them from the League tab and tap Send to Scoreboard.</div><button class="btn wide" data-a="sbsend">SEND MY TEAM</button></div>';
    h += '<div class="card"><div class="lbl">IMPORT SCOREBOARD STATS</div><div class="small">Played a real game and kept stats in the Scoreboard app? In Scoreboard, open the game (or season), tap <b>Stat sheet for NFL Rebuilder</b> and save it to Files. Then pick it here and the stats get added to your players.' + ((s.sbImported || []).length ? ' <span class="dim">(' + s.sbImported.length + ' game' + (s.sbImported.length === 1 ? '' : 's') + ' imported so far)</span>' : '') + '</div><label class="btn wide">CHOOSE STAT SHEET<input type="file" accept=".json,application/json" data-ch="sbfile" hidden></label></div>';
    h += '<div class="row"><button class="btn" data-a="tab" data-v="news">NEWS</button><button class="btn" data-a="tab" data-v="sched">SCHEDULE</button><button class="btn gold" data-a="exit">SAVE &amp; EXIT</button></div>';
    return h;
  };
  A.fixcap = function () {
    var s = S(), before = L.capSpace(s.user);
    Off.capFix(s.user, 0.5); UI.save(); UI.render();
    U.toast('Cap: ' + U.money(before) + ' to ' + U.money(L.capSpace(s.user)) + ' (restructures first, then cuts).');
  };
  A.setlen = function (d) {
    var s = S(), n = +d.n;
    if (s.phase === 'regular' || s.phase === 'playoffs') { s.lenNext = n === s.len ? null : n; U.toast(n === s.len ? 'Staying at ' + n + ' games.' : 'Next season will be ' + n + ' games.'); }
    else { s.lenNext = n; U.toast('Next season will be ' + n + ' games.'); }
    UI.save(); UI.render();
  };
  A.exit = function () { UI.saveNow(); G.S = null; UI.go('title'); };
})();
