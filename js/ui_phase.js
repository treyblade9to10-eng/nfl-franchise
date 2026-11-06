// ui_phase.js - franchise tags, fantasy/expansion draft, preseason, playoffs, NFL draft, re-sign, free agency
(function () {
  var A = UI.A, V = UI.V;
  function S() { return G.S; }
  var POSF = ['ALL', 'QB', 'RB', 'WR', 'TE', 'OT', 'G', 'C', 'EDGE', 'DT', 'LB', 'CB', 'S', 'K', 'P'];
  function posChips(cur, act) { return '<div class="chips sc">' + POSF.map(function (x) { return '<button class="chip ' + (cur === x ? 'on' : '') + '" data-a="' + act + '" data-f="' + x + '">' + x + '</button>'; }).join('') + '</div>'; }
  function needLine(tid) {
    var bp = L.byPos(tid);
    return '<div class="needs">' + Object.keys(L.STARTERS).map(function (pos) { var n = bp[pos].length, st = L.STARTERS[pos]; return '<span class="nd2 ' + (n < st ? 'bad' : n < (L.NEED[pos] || st) ? 'mid' : 'ok') + '">' + pos + ' ' + n + '</span>'; }).join('') + '</div>';
  }

  // ---------- pick your franchise players ----------
  V.tags = function () {
    var s = S(), t = L.team(s.user), n = s.fd.tags, sel = t.tags || [];
    var h = '<h2>TAG YOUR FRANCHISE PLAYERS</h2><div class="card"><div class="small">Pick the <b>' + n + '</b> players you keep. Everyone else goes into the fantasy draft pool, and every other team keeps its own ' + n + '. <b>' + sel.length + '/' + n + '</b> picked.</div></div>';
    h += L.roster(s.user).sort(function (a, b) { return Off.tagScore(b) - Off.tagScore(a); }).map(function (p) {
      var on = sel.indexOf(p.id) >= 0;
      return '<div class="srow2 ' + (on ? 'on' : '') + '" data-a="tagtog" data-id="' + p.id + '"><span class="ck"></span>' + UI.face(p, 34) + '<div class="pmain"><div class="pname">' + U.esc(p.n) + '</div><div class="psub">' + p.pos + ' &middot; ' + p.age + 'y &middot; ' + UI.contractStr(p) + '</div></div>' + UI.ovrTag(p.ovr) + '</div>';
    }).join('');
    h += '<div class="stick"><button class="btn gold big" data-a="tagsgo" ' + (sel.length === n ? '' : 'disabled') + '>' + (sel.length === n ? 'START THE FANTASY DRAFT' : 'PICK ' + (n - sel.length) + ' MORE') + '</button></div><div style="height:70px"></div>';
    return h;
  };
  A.tagtog = function (d) {
    var s = S(), t = L.team(s.user), id = +d.id, i = (t.tags = t.tags || []).indexOf(id);
    if (i >= 0) t.tags.splice(i, 1); else if (t.tags.length < s.fd.tags) t.tags.push(id); else { U.toast('You already picked ' + s.fd.tags + '. Tap one to drop him first.'); return; }
    var y = window.scrollY; UI.render(); window.scrollTo(0, y);
  };
  A.tagsgo = function () { Off.beginFantasy(); UI.save(); UI.go('home'); };

  // ---------- fantasy / expansion draft ----------
  V.fantasy = function (p) {
    var s = S(), fd = s.fd, cur = Off.fdCurrent(), mine = cur && cur.t === s.user, f = p.f || 'ALL';
    var exp = fd.type === 'expansion', total = fd.list.length;
    var h = '<div class="dhead"><div><div class="lbl">' + (exp ? 'EXPANSION DRAFT' : 'FANTASY DRAFT') + '</div><div class="pickno">PICK ' + (fd.i + 1) + ' <span class="dim">/ ' + total + '</span></div><div class="dim small">' + (cur && cur.r === 0 ? 'Expansion head start pick' : cur ? 'Round ' + cur.r : '') + '</div></div>' + (cur ? '<div class="onclock ' + (mine ? 'me' : '') + '">' + UI.logo(cur.t, 44) + '<div>' + (mine ? '<b>YOU ARE UP</b>' : 'ON THE CLOCK<br><b>' + U.esc(L.shortName(cur.t)) + '</b>') + '</div></div>' : '') + '</div>';
    h += '<div class="g3"><button class="btn" data-a="fdauto1">' + (mine ? 'AUTO PICK' : 'NEXT PICK') + '</button><button class="btn" data-a="fdsim">TO MY PICK</button><button class="btn" data-a="fdall">AUTO REST</button></div>';
    h += '<div class="card"><div class="lbl">YOUR TEAM (' + L.roster(s.user).length + ')</div>' + needLine(s.user) + '</div>';
    if (exp) h += '<div class="dim small">You can take up to 3 players from each team. Teams protected their best ' + fd.tags + '.</div>';
    h += posChips(f, 'fdf');
    var list = Off.pool().filter(function (q) { return f === 'ALL' || q.pos === f; }).slice(0, 60);
    h += list.map(function (q) { return '<div class="drow">' + UI.playerRow(q, '<div class="pst">' + (exp ? UI.logo(q.t, 20) : '') + ' ' + U.money(q.sal[0] || 0) + '</div>') + (mine ? '<button class="btn gold sm" data-a="fdpick" data-id="' + q.id + '">TAKE</button>' : '') + '</div>'; }).join('');
    if (fd.log.length) h += '<div class="card"><div class="lbl">LAST PICKS</div>' + fd.log.slice(0, 12).map(function (x) { var q = L.player(x.p); return q ? '<div class="lrow"><span class="sn2">' + x.n + '</span>' + UI.logo(x.t, 18) + '<span class="ln">' + U.esc(q.n) + ' <span class="dim">' + q.pos + ' ' + q.ovr + (x.from ? ' from ' + x.from : '') + '</span></span></div>' : ''; }).join('') + '</div>';
    return h;
  };
  A.fdf = function (d) { UI.go('home', { f: d.f }); };
  A.fdpick = function (d) { Off.fdPick(+d.id); cpuUntilMe(); UI.save(); UI.render(); };
  function cpuUntilMe() { var s = S(), g = 0; while (s.phase === 'fantasy' && Off.fdCurrent() && Off.fdCurrent().t !== s.user && g++ < 40) Off.cpuFdPick(); }
  A.fdauto1 = function () { Off.cpuFdPick(); UI.save(); UI.render(); };
  A.fdsim = function () { Off.fdSimToUser(); UI.save(); UI.render(); };
  A.fdall = function () { Off.fdAutoAll(); UI.save(); UI.go('home'); };

  // ---------- preseason / cut-down day ----------
  V.pre = function () {
    var s = S(), n = L.roster(s.user).length, space = L.capSpace(s.user), t = L.team(s.user), R = L.ratings(s.user);
    var h = '<div class="hero" style="--tc:' + t.c1 + ';--tc2:' + t.c2 + '">' + UI.logo(s.user, 66) + '<div class="hrec"><div class="hw sm">' + s.season + '</div><div class="hsub">PRESEASON &middot; CUT-DOWN DAY</div></div><div class="hstats"><div><b>' + Math.round(R.ovr) + '</b><span>OVR</span></div><div><b>' + Math.round(R.off) + '</b><span>OFFENSE</span></div><div><b>' + Math.round(R.def) + '</b><span>DEFENSE</span></div><div><b>' + (L.ovrRank().map(function (x) { return x.id; }).indexOf(s.user) + 1) + '</b><span>RANK</span></div></div></div>';
    if (s.fdDone) { h += '<div class="card"><div class="lbl">' + (s.fdDone.type === 'expansion' ? 'EXPANSION' : 'FANTASY') + ' DRAFT RESULTS</div><div class="small">Your team is built. Check the ROSTER tab, make trades, sign free agents, then start the season.</div><button class="btn ghost sm" data-a="fdclose">GOT IT</button></div>'; }
    h += '<div class="card"><div class="lbl">GET READY FOR WEEK 1</div>' +
      '<div class="chk ' + (n <= L.ROSTER_MAX && n >= L.ROSTER_MIN ? 'ok' : 'bad') + '">ROSTER: ' + n + ' players (' + L.ROSTER_MIN + '-' + L.ROSTER_MAX + ')</div>' +
      '<div class="chk ' + (space >= 0 ? 'ok' : 'bad') + '">CAP: ' + (space >= 0 ? U.money(space) + ' under' : U.money(-space) + ' OVER') + '</div>' + needLine(s.user);
    if (n > L.ROSTER_MAX) h += '<button class="btn wide" data-a="autocut">AUTO CUT TO ' + L.ROSTER_MAX + '</button>';
    if (n < L.ROSTER_MIN) h += '<button class="btn wide" data-a="autofill">SIGN CHEAP PLAYERS TO ' + L.ROSTER_MIN + '</button>';
    if (space < 0) h += '<button class="btn wide" data-a="fixcap">FIX MY CAP (RESTRUCTURE, THEN CUT)</button>';
    h += '<button class="btn gold big" data-a="startseason">START THE ' + s.season + ' SEASON</button></div>';
    h += '<div class="row"><button class="btn" data-a="tab" data-v="roster">ROSTER</button><button class="btn" data-a="tab" data-v="trade">TRADE</button><button class="btn" data-a="lsub" data-s="fa">FREE AGENTS</button></div>';
    h += '<div class="card"><div class="lbl">SALARY CAP ' + s.season + '</div>' + UI.capBar(s.user) + '</div>';
    h += V.newsList(6);
    return h;
  };
  A.fdclose = function () { S().fdDone = null; UI.save(); UI.render(); };
  A.autocut = function () { var s = S(); Off.cutDown(s.user, L.ROSTER_MAX); UI.save(); UI.render(); U.toast('Cut to ' + L.roster(s.user).length + '. Released players are free agents now.'); };
  A.startseason = function () { var e = Off.startSeason(); if (e) { U.toast(e); return; } UI.save(); UI.go('home'); U.toast('Week 1 is here!'); };

  // ---------- playoffs ----------
  V.playoffs = function () {
    var s = S(), po = s.po, h = '<h2>' + Sim.RNAME[po.r] + (po.r === 3 ? ' ' + Sim.roman(s.season - 1965) : ' ROUND') + '</h2>';
    var ug = Sim.userPlayoffGame();
    if (s.live) h += '<div class="card next live"><div class="lbl">GAME IN PROGRESS</div><button class="btn gold big" data-a="resume">RESUME GAME</button></div>';
    else if (ug) h += V.gameCard(ug.h, ug.a, Sim.RNAME[po.r] + (po.r === 3 ? '' : ' ROUND'), po.r === 3 ? 'sb' : 'po');
    var rg = Sim.roundGames(), left = rg.filter(function (g) { return !g.done; }).length;
    if (!s.live && left && !ug) h += '<button class="btn gold big" data-a="poround">SIM THE ' + Sim.RNAME[po.r] + (po.r === 3 ? '' : ' ROUND') + '</button>';
    else if (!s.live && left && ug) h += '<button class="btn wide" data-a="poround">SIM EVERYTHING (YOUR GAME TOO)</button>';
    if (!left) h += '<button class="btn gold big" data-a="ponext">' + (po.r === 3 ? 'ON TO THE DRAFT' : 'NEXT ROUND') + '</button>';
    if (po.r === 3 && po.champ) h += '<div class="champ" style="--tc:' + L.team(po.champ).c1 + '">' + UI.logo(po.champ, 90) + '<div class="ct">' + U.esc(L.teamName(po.champ)) + '</div><div class="cs">SUPER BOWL ' + Sim.roman(s.season - 1965) + ' CHAMPIONS</div></div>';
    // bracket
    [0, 1, 2, 3].forEach(function (r) {
      var gs = po.games.filter(function (g) { return g.r === r; });
      if (!gs.length) return;
      h += '<div class="card"><div class="lbl">' + Sim.RNAME[r] + '</div>' + gs.map(function (g) {
        var me = g.h === s.user || g.a === s.user, cf = g.conf || L.team(g.h).conf;
        var row = function (id, sc, win) { return '<div class="sr ' + (win ? 'win' : '') + '"><span class="sd">' + (g.r < 3 ? Sim.seedOf(L.team(id).conf, id) : '') + '</span>' + UI.logo(id, 24) + '<span>' + U.esc(L.shortName(id)) + '</span><b>' + (g.done ? sc : '') + '</b></div>'; };
        return '<div class="series ' + (me ? 'me' : '') + '">' + row(g.a, g.as, g.done && g.as > g.hs) + row(g.h, g.hs, g.done && g.hs > g.as) + (g.done && (g.live || g.set || g.ot) ? '<div class="gp">' + (g.live ? 'PLAYED' : g.set ? 'SET' : '') + (g.ot ? ' OT' : '') + '</div>' : '') + '</div>';
      }).join('') + '</div>';
    });
    ['AFC', 'NFC'].forEach(function (c) { if (po.r === 0) h += '<div class="dim small">' + c + ' 1 seed (' + L.shortName(po.seeds[c][0]) + ') has a bye.</div>'; });
    return h;
  };
  A.poround = function () { var s = S(); if (s.live) return; Sim.simRoundRest(); UI.save(); UI.render(); };
  A.ponext = function () {
    var s = S(), r = s.po.r; Sim.advanceRound(); UI.save(); UI.go('home');
    if (s.phase === 'draft') { var hs = s.history[0]; UI.modal('<h3>' + hs.season + ' SEASON OVER</h3><div class="champ sm" style="--tc:' + L.team(hs.champ).c1 + '">' + UI.logo(hs.champ, 70) + '<div class="ct">' + U.esc(L.teamName(hs.champ)) + '</div><div class="cs">SUPER BOWL CHAMPIONS</div></div><table class="tbl"><tr><td>MVP</td><td>' + U.esc(hs.mvp ? hs.mvp.n : '-') + '</td></tr><tr><td>Offensive POY</td><td>' + U.esc(hs.opoy ? hs.opoy.n : '-') + '</td></tr><tr><td>Defensive POY</td><td>' + U.esc(hs.dpoy ? hs.dpoy.n : '-') + '</td></tr><tr><td>Rookie of the Year</td><td>' + U.esc(hs.roy ? hs.roy.n : '-') + '</td></tr><tr><td>You</td><td>' + hs.rec + ', ' + U.esc(hs.finish) + '</td></tr></table><div class="row"><button class="btn gold" data-a="close">TO THE DRAFT</button></div>'); }
  };

  // ---------- NFL draft ----------
  V.draft = function (p) {
    var s = S(), d = s.dr, cur = Off.drCurrent(), mine = cur && cur.h === s.user, f = p.f || 'ALL';
    var myPicks = d.list.slice(d.i).filter(function (x) { var pk = Trade.pk(x.pid); return pk && pk.h === s.user; });
    var h = '<div class="dhead"><div><div class="lbl">' + d.year + ' NFL DRAFT</div><div class="pickno">PICK ' + (cur ? cur.n : '-') + ' <span class="dim">/ ' + d.list.length + '</span></div><div class="dim small">' + (cur ? 'Round ' + cur.r + ', pick ' + cur.slot : '') + '</div></div>' + (cur ? '<div class="onclock ' + (mine ? 'me' : '') + '">' + UI.logo(cur.h, 44) + '<div>' + (mine ? '<b>YOU ARE ON THE CLOCK</b>' : 'ON THE CLOCK<br><b>' + U.esc(L.shortName(cur.h)) + '</b>') + (cur.h !== cur.o ? '<div class="dim small">pick from ' + U.esc(L.shortName(cur.o)) + '</div>' : '') + '</div></div>' : '') + '</div>';
    h += '<div class="g3"><button class="btn" data-a="drauto1">' + (mine ? 'AUTO PICK' : 'NEXT PICK') + '</button><button class="btn" data-a="drsim">TO MY PICK</button><button class="btn" data-a="drall">AUTO REST</button></div>';
    h += '<div class="dim small center">Your picks left: ' + (myPicks.map(function (x) { return '#' + x.n; }).join(', ') || 'none') + '. You can trade picks on the TRADE tab during the draft.</div>';
    h += '<div class="card"><div class="lbl">YOUR NEEDS</div>' + needLine(s.user) + '</div>';
    h += posChips(f, 'drf');
    var list = Off.draftClass().filter(function (q) { return f === 'ALL' || q.pos === f; }).slice(0, 60);
    h += list.map(function (q, i) { return '<div class="drow">' + UI.playerRow(q, '<div class="pst">' + U.esc(q.school || '') + (q.real ? '<br><span class="gold">REAL</span>' : '') + '</div>') + (mine ? '<button class="btn gold sm" data-a="drpick" data-id="' + q.id + '">DRAFT</button>' : '') + '</div>'; }).join('');
    if (d.log.length) h += '<div class="card"><div class="lbl">PICKS SO FAR</div>' + d.log.slice(0, 16).map(function (x) { var q = L.player(x.p); return q ? '<div class="lrow ' + (x.t === s.user ? 'mine' : '') + '" data-a="player" data-id="' + q.id + '"><span class="sn2">' + x.n + '</span>' + UI.logo(x.t, 18) + '<span class="ln">' + U.esc(q.n) + ' <span class="dim">' + q.pos + ', ' + U.esc(q.school || '') + '</span></span>' + UI.ovrTag(q.ovr) + '</div>' : ''; }).join('') + '</div>';
    return h;
  };
  A.drf = function (d) { UI.go('home', { f: d.f }); };
  A.drpick = function (d) { Off.draftPlayer(+d.id); var s = S(), g = 0; while (s.phase === 'draft' && Off.drCurrent() && Off.drCurrent().h !== s.user && g++ < 8) Off.cpuDraftPick(); UI.save(); UI.render(); };
  A.drauto1 = function () { Off.cpuDraftPick(); UI.save(); UI.render(); };
  A.drsim = function () { Off.drSimToUser(); UI.save(); UI.render(); };
  A.drall = function () { Off.drAutoAll(); UI.save(); UI.go('home'); };

  // ---------- re-sign ----------
  V.resign = function () {
    var s = S(), list = Off.expiring(s.user), t = L.team(s.user);
    var h = '<h2>RE-SIGN YOUR PLAYERS</h2><div class="card"><div class="small">These contracts are up. Re-sign them for what they ask, use your one <b>franchise tag</b> (1 year at the top-5 salary for his spot), or let them walk into free agency. Cap space: <b>' + U.money(L.capSpace(s.user)) + '</b></div></div>';
    if (!list.length) h += '<div class="card dim">Nobody left to decide on.</div>';
    list.forEach(function (p) {
      var ask = p.ask || Off.setAsk(p), tg = Math.max(Off.tagAmount(p.pos), ask.amt * 1.05);
      h += '<div class="card rs">' + UI.playerRow(p, '<div class="pst">wants<br><b>' + U.money(ask.amt) + '</b> x' + ask.yrs + '</div>') + '<div class="row"><button class="btn gold" data-a="rsyes" data-id="' + p.id + '">RE-SIGN</button>' + (t.tagUsed ? '' : '<button class="btn" data-a="rstag" data-id="' + p.id + '">TAG ' + U.money(tg) + '</button>') + '<button class="btn ghost" data-a="rsno" data-id="' + p.id + '">LET GO</button></div></div>';
    });
    h += '<button class="btn gold big" data-a="tofa">ON TO FREE AGENCY</button><div class="dim small center">Anyone you have not re-signed becomes a free agent.</div>';
    return h;
  };
  A.rsyes = function (d) { var e = Off.resign(+d.id); if (e) U.toast(e); UI.save(); UI.render(); };
  A.rstag = function (d) { var e = Off.resign(+d.id, true); if (e) U.toast(e); UI.save(); UI.render(); };
  A.rsno = function (d) { Off.letGo(+d.id); UI.save(); UI.render(); };
  A.tofa = function () { Off.toFreeAgency(); UI.save(); UI.go('home'); };

  // ---------- free agency ----------
  V.fa = function (p) {
    var s = S(), f = p.f || 'ALL', mult = { 1: 1, 2: 0.9, 3: 0.78 }[s.faDay] || 0.75;
    var h = '<h2>FREE AGENCY &middot; DAY ' + s.faDay + ' OF 3</h2><div class="card"><div class="small">Make offers. Each day other teams sign players and prices drop (day 2: 10% off, day 3: 22% off). Cap space: <b>' + U.money(L.capSpace(s.user)) + '</b> &middot; roster ' + L.roster(s.user).length + '</div>' + needLine(s.user) + '</div>';
    h += '<button class="btn gold big" data-a="fanext">' + (s.faDay >= 3 ? 'FINISH FREE AGENCY' : 'NEXT DAY') + '</button>';
    h += posChips(f, 'faf2');
    h += Off.freeAgents().filter(function (q) { return f === 'ALL' || q.pos === f; }).slice(0, 70).map(function (q) { if (!q.ask) Off.setAsk(q); return UI.playerRow(q, '<div class="pst">' + U.money(q.ask.amt * mult) + '<br><span class="dim">' + q.ask.yrs + ' yr</span></div>', 'faoffer'); }).join('');
    return h;
  };
  A.faf2 = function (d) { UI.go('home', { f: d.f }); };
  A.fanext = function () { Off.nextFaDay(); UI.save(); UI.go('home'); };
})();
