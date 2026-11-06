// ui_live.js - the play-calling game screen, box scores
(function () {
  var A = UI.A, V = UI.V;
  function S() { return G.S; }
  function T(id) { return L.team(id); }

  A.play = function (d) {
    var s = S();
    if (s.live) { UI.go('live'); return; }
    if (L.roster(s.user).length < L.ROSTER_MIN) { U.toast('You need ' + L.ROSTER_MIN + ' players to play.'); return; }
    var h, a, o = {};
    if (s.phase === 'regular') { var m = Sim.userGame(); if (!m) return; h = m[0]; a = m[1]; }
    else if (s.phase === 'playoffs') { var pg = Sim.userPlayoffGame(); if (!pg) return; h = pg.h; a = pg.a; o.playoff = true; o.neutral = !!pg.neutral; o.po = Sim.RNAME[pg.r]; }
    else return;
    s.live = Live.start(h, a, o);
    Live.step(s.live); // coin toss + opening kickoff
    UI.save(); UI.go('live');
  };
  A.resume = function () { UI.go('live'); };

  // ---------- field ----------
  function field(lv) {
    var off = lv.poss || 'h', dfs = off === 'h' ? 'a' : 'h', to = T(lv[off]), td = T(lv[dfs]);
    var W = 1200, H = 260, ez = 100, yd = (W - 2 * ez) / 100;
    var x = function (y) { return ez + y * yd; };
    var g = '<svg class="field" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">';
    for (var i = 0; i < 10; i++) g += '<rect x="' + x(i * 10) + '" y="0" width="' + (yd * 10) + '" height="' + H + '" fill="' + (i % 2 ? '#2f7d3a' : '#348a40') + '"/>';
    g += '<rect x="0" y="0" width="' + ez + '" height="' + H + '" fill="' + to.c1 + '"/><rect x="' + (W - ez) + '" y="0" width="' + ez + '" height="' + H + '" fill="' + td.c1 + '"/>';
    g += '<text x="' + ez / 2 + '" y="' + H / 2 + '" fill="' + to.c2 + '" font-family="Barlow Condensed" font-weight="900" font-style="italic" font-size="44" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ' + ez / 2 + ' ' + H / 2 + ')">' + U.esc(to.name.toUpperCase()) + '</text>';
    g += '<text x="' + (W - ez / 2) + '" y="' + H / 2 + '" fill="' + td.c2 + '" font-family="Barlow Condensed" font-weight="900" font-style="italic" font-size="44" text-anchor="middle" dominant-baseline="middle" transform="rotate(90 ' + (W - ez / 2) + ' ' + H / 2 + ')">' + U.esc(td.name.toUpperCase()) + '</text>';
    for (var y = 0; y <= 100; y += 5) g += '<line x1="' + x(y) + '" y1="0" x2="' + x(y) + '" y2="' + H + '" stroke="#ffffff' + (y % 10 ? '55' : 'aa') + '" stroke-width="' + (y % 10 ? 1.5 : 3) + '"/>';
    for (var y2 = 10; y2 < 100; y2 += 10) { var n = y2 <= 50 ? y2 : 100 - y2; g += '<text x="' + x(y2) + '" y="40" fill="#ffffffcc" font-family="Barlow Condensed" font-weight="800" font-size="30" text-anchor="middle">' + n + '</text><text x="' + x(y2) + '" y="' + (H - 18) + '" fill="#ffffffcc" font-family="Barlow Condensed" font-weight="800" font-size="30" text-anchor="middle">' + n + '</text>'; }
    if (lv.wait === 'play' && !lv.over) {
      var fd = Math.min(100, lv.yl + lv.togo);
      g += '<rect x="' + x(lv.yl) + '" y="0" width="' + Math.max(0, x(fd) - x(lv.yl)) + '" height="' + H + '" fill="#f6c31c18"/>';
      g += '<line x1="' + x(lv.yl) + '" y1="0" x2="' + x(lv.yl) + '" y2="' + H + '" stroke="#4aa3ff" stroke-width="5"/>';
      if (fd < 100) g += '<line x1="' + x(fd) + '" y1="0" x2="' + x(fd) + '" y2="' + H + '" stroke="#f6c31c" stroke-width="5"/>';
    }
    if (lv.prevYl != null && lv.prevPoss === lv.poss && lv.prevYl !== lv.yl) {
      var a0 = x(lv.prevYl), a1 = x(lv.yl), up = lv.yl > lv.prevYl;
      g += '<line x1="' + a0 + '" y1="' + (H / 2) + '" x2="' + a1 + '" y2="' + (H / 2) + '" stroke="' + (up ? '#ffffff' : '#ff6b5a') + '" stroke-width="6" stroke-dasharray="14 8" opacity=".85"/>';
    }
    var bx = x(U.clamp(lv.yl, 0, 100));
    g += '<ellipse cx="' + bx + '" cy="' + H / 2 + '" rx="20" ry="12" fill="#7a3f1d" stroke="#fff" stroke-width="2.5"/><line x1="' + (bx - 8) + '" y1="' + H / 2 + '" x2="' + (bx + 8) + '" y2="' + H / 2 + '" stroke="#fff" stroke-width="2"/>';
    g += '<polygon points="' + (W - 14) + ',' + (H / 2 - 12) + ' ' + (W - 2) + ',' + H / 2 + ' ' + (W - 14) + ',' + (H / 2 + 12) + '" fill="#fff" opacity=".0"/>';
    return g + '</svg>';
  }
  function bug(lv) {
    function side(k) {
      var id = lv[k], t = T(id), dots = '';
      for (var i = 0; i < 3; i++) dots += '<i class="' + (i < lv.to[k] ? 'on' : '') + '"></i>';
      return '<div class="bs ' + (lv.poss === k && !lv.over ? 'pos' : '') + '" style="--tc:' + t.c1 + '">' + UI.logo(id, 30) + '<div><div class="bab">' + U.esc(id) + '</div><div class="bto">' + dots + '</div></div><div class="bsc">' + lv.sc[k] + '</div></div>';
    }
    var q = lv.over ? 'FINAL' : lv.q <= 4 ? 'Q' + lv.q : 'OT';
    return '<div class="bug">' + side('a') + '<div class="bmid"><div class="bq">' + q + (lv.over && lv.ot ? '/OT' : '') + '</div><div class="bc">' + (lv.over ? '' : Live.clockStr(lv.clock)) + '</div></div>' + side('h') + '</div>';
  }
  V.live = function (p) {
    var s = S(), lv = s.live; if (!lv) return '<div class="card">No game.</div><button class="btn" data-a="tab" data-v="home">HOME</button>';
    var me = lv.me, opp = me === 'h' ? 'a' : 'h', o = Live.options(lv), tab = p.tab || 'pbp';
    var h = bug(lv);
    if (lv.po) h += '<div class="potag">' + U.esc(lv.po) + (lv.po === 'SUPER BOWL' ? ' ' + Sim.roman(s.season - 1965) : '') + '</div>';
    var dd = lv.wait === 'play' && !lv.over ? '<span class="ddb">' + Live.ddStr(lv) + '</span> at ' + Live.spot(lv) + ' &middot; <span class="' + (lv.poss === me ? 'gold' : 'dim') + '">' + (lv.poss === me ? 'YOUR BALL' : U.esc(L.shortName(lv[lv.poss])) + ' BALL') + '</span>' : '';
    h += '<div class="ddline">' + dd + '</div>' + field(lv);
    var last = lv.last;
    h += '<div class="lastplay k-' + (last ? last.k : '') + '">' + (last ? U.esc(last.t) : 'Kickoff!') + '</div>';
    if (lv.lastCalls && !lv.over && lv.lastShow) h += '<div class="callsee dim small">You: ' + U.esc(lv.lastShow.you) + ' &middot; They: ' + U.esc(lv.lastShow.them) + '</div>';
    if (o.mode === 'over') {
      var won = lv.sc[me] > lv.sc[opp], tie = lv.sc[me] === lv.sc[opp];
      h += '<div class="final ' + (won ? 'w' : tie ? '' : 'l') + '">' + (won ? 'YOU WIN' : tie ? 'TIE GAME' : 'YOU LOSE') + '</div>';
      h += qtable(lv.h, lv.a, lv.qs);
      h += '<button class="btn gold big" data-a="lvdone">CONTINUE</button>';
    } else if (o.mode === 'pat') {
      if (o.mine) h += '<div class="clbl act">TOUCHDOWN! GO FOR</div><div class="lgrid"><button class="pc2" data-a="lcall" data-k="xp"><b>EXTRA POINT</b><span>About 94%</span></button><button class="pc2" data-a="lcall" data-k="two"><b>GO FOR 2</b><span>About 47%</span></button></div>';
      else h += '<button class="btn gold big" data-a="lcall" data-k="">NEXT</button>';
    } else if (o.mode === 'coin') {
      h += '<button class="btn gold big" data-a="lcall" data-k="">COIN TOSS</button>';
    } else {
      h += '<div class="clbl act">' + (o.mode === 'off' ? 'CALL YOUR PLAY' : 'CALL YOUR DEFENSE') + '</div>';
      if (o.special && o.special.length) h += '<div class="lgrid sp">' + o.special.map(function (c) { return '<button class="pc2 spc" data-a="lcall" data-k="' + c.k + '"><b>' + U.esc(c.n.toUpperCase()) + '</b><span>' + U.esc(c.d) + '</span></button>'; }).join('') + '</div>';
      h += '<div class="lgrid">' + o.calls.map(function (c) { return '<button class="pc2 ' + (c.t || 'd') + '" data-a="lcall" data-k="' + c.k + '"><b>' + U.esc(c.n.toUpperCase()) + '</b><span>' + U.esc(c.d) + '</span></button>'; }).join('') + '</div>';
      h += '<div class="lbtns"><button class="btn" data-a="lto" ' + (lv.to[me] > 0 ? '' : 'disabled') + '>TIMEOUT (' + lv.to[me] + ')</button><button class="btn" data-a="ldrive">SIM DRIVE</button><button class="btn" data-a="lqtr">SIM QUARTER</button><button class="btn" data-a="lend">SIM TO END</button></div>';
    }
    h += '<div class="seg lt"><button data-a="ltab" data-t="pbp" class="' + (tab === 'pbp' ? 'on' : '') + '">PLAY-BY-PLAY</button><button data-a="ltab" data-t="box" class="' + (tab === 'box' ? 'on' : '') + '">BOX SCORE</button></div>';
    if (tab === 'pbp') h += '<div class="pbp">' + lv.pbp.slice(-30).reverse().map(function (e) { return '<div class="pl k-' + e.k + ' ' + (e.s === me ? 'mine' : '') + '"><span class="pc">' + (e.q <= 4 ? 'Q' + e.q : 'OT') + ' ' + e.c + '</span><span class="pt">' + U.esc(e.t) + '</span></div>'; }).join('') + '</div>';
    else h += boxHtml({ h: lv.h, a: lv.a, box: lv.box, tm: lv.tm, q: lv.qs, hs: lv.sc.h, as: lv.sc.a });
    if (!lv.over) h += '<button class="btn ghost wide" data-a="lexit">SAVE AND LEAVE (COME BACK LATER)</button>';
    return h;
  };
  function callName(k) { var c = Live.OFF.concat(Live.DEF).filter(function (x) { return x.k === k; })[0]; return c ? c.n : k === 'sneak' ? 'QB Sneak' : k === 'FG' ? 'Field Goal' : k === 'PUNT' ? 'Punt' : k === 'KNEEL' ? 'Kneel' : k; }
  function after() { var lv = S().live; UI.save(); var y = window.scrollY; UI.render(); window.scrollTo(0, Math.min(y, 0)); }
  A.lcall = function (d) {
    var lv = S().live; if (!lv) return;
    lv.prevYl = lv.yl; lv.prevPoss = lv.poss;
    var mine = lv.poss === lv.me, k = d.k || null;
    Live.step(lv, k);
    if (lv.lastCalls && k && k !== 'xp' && k !== 'two') lv.lastShow = mine ? { you: callName(lv.lastCalls.o), them: callName(lv.lastCalls.d) } : { you: callName(lv.lastCalls.d), them: callName(lv.lastCalls.o) };
    else lv.lastShow = null;
    after();
  };
  A.lto = function () { var lv = S().live; if (!Live.userTimeout(lv)) U.toast('No timeouts left.'); after(); };
  A.ldrive = function () { var lv = S().live; lv.prevYl = null; Live.simDrive(lv); lv.lastShow = null; after(); };
  A.lqtr = function () { var lv = S().live; lv.prevYl = null; Live.simQuarter(lv); lv.lastShow = null; after(); };
  A.lend = function () { var lv = S().live; lv.prevYl = null; Live.simAll(lv); lv.lastShow = null; after(); };
  A.ltab = function (d) { UI.st.p.tab = d.t; UI.render(); };
  A.lexit = function () { UI.save(); UI.go('home'); };
  A.lvdone = function () {
    var s = S(), lv = s.live; if (!lv || !lv.over) return;
    var r = Live.result(lv);
    s.live = null;
    if (s.phase === 'regular') Sim.finishUserGame(r);
    else if (s.phase === 'playoffs') { var pg = Sim.userPlayoffGame(); if (pg) Sim.finishPlayoffGame(pg, r); }
    UI.save(); UI.go('home');
    var g = s.games.filter(function (x) { return x.live && (x.h === s.user || x.a === s.user); }).pop();
    if (g) UI.boxModal(g);
  };

  // ---------- box score ----------
  function qtable(h, a, qs) {
    var n = Math.max(qs.h.length, qs.a.length, 4), th = '<tr><th></th>';
    for (var i = 0; i < n; i++) th += '<th>' + (i < 4 ? i + 1 : 'OT') + '</th>';
    th += '<th>T</th></tr>';
    var row = function (id, arr) { var t = 0, r = '<tr><td class="tn">' + UI.logo(id, 18) + ' ' + U.esc(id) + '</td>'; for (var i = 0; i < n; i++) { t += arr[i] || 0; r += '<td>' + (arr[i] || 0) + '</td>'; } return r + '<td><b>' + t + '</b></td></tr>'; };
    return '<table class="tbl qt">' + th + row(a, qs.a) + row(h, qs.h) + '</table>';
  }
  function boxHtml(g) {
    var h = '';
    if (g.q) h += qtable(g.h, g.a, g.q);
    if (g.tm) {
      var A1 = g.tm.a, H1 = g.tm.h, r = function (l, k, f) { f = f || function (x) { return x; }; return '<tr><td>' + l + '</td><td>' + f(A1[k] || 0) + '</td><td>' + f(H1[k] || 0) + '</td></tr>'; };
      h += '<table class="tbl tstat"><tr><th></th><th>' + U.esc(g.a) + '</th><th>' + U.esc(g.h) + '</th></tr>' + '<tr><td>Total yards</td><td>' + ((A1.py || 0) + (A1.ry || 0)) + '</td><td>' + ((H1.py || 0) + (H1.ry || 0)) + '</td></tr>' + r('Passing', 'py') + r('Rushing', 'ry') + r('First downs', 'fd') + r('Turnovers', 'to') + r('Sacks taken', 'sk') + r('Time of poss.', 'top', function (x) { return Math.floor(x / 60) + ':' + ('0' + (x % 60)).slice(-2); }) + '</table>';
    }
    if (!g.box) {
      if (g.ld) [g.a, g.h].forEach(function (tid) { h += '<div class="lbl">' + U.esc(L.shortName(tid)) + ' LEADERS</div>' + (g.ld[tid] || []).filter(Boolean).map(function (x) { var p = L.player(x[0]); return '<div class="mini">' + (p ? U.esc(p.n) : '?') + ' <span class="dim">' + U.esc(x[1]) + '</span></div>'; }).join(''); });
      return h;
    }
    var lines = Object.keys(g.box).map(function (k) { return g.box[k]; });
    [g.a, g.h].forEach(function (tid) {
      var mine = lines.filter(function (l) { return l.t === tid; }), nm = function (l) { var p = L.player(l.id); return p ? U.esc(p.n) : '?'; };
      var sect = function (title, list, cols, keyf) {
        list = list.filter(keyf); if (!list.length) return '';
        return '<div class="lbl">' + U.esc(L.shortName(tid).toUpperCase()) + ' ' + title + '</div><div class="bxw"><table class="tbl bx"><tr><th></th>' + cols.map(function (c) { return '<th>' + c[0] + '</th>'; }).join('') + '</tr>' + list.map(function (l) { return '<tr data-a="player" data-id="' + l.id + '"><td class="tn">' + nm(l) + '</td>' + cols.map(function (c) { return '<td>' + c[1](l) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div>';
      };
      var v = function (l, k) { return l[k] || 0; };
      h += sect('PASSING', mine.sort(function (a, b) { return v(b, 'att') - v(a, 'att'); }), [['C/A', function (l) { return v(l, 'cmp') + '/' + v(l, 'att'); }], ['YDS', function (l) { return v(l, 'py'); }], ['TD', function (l) { return v(l, 'ptd'); }], ['INT', function (l) { return v(l, 'int'); }]], function (l) { return v(l, 'att') > 0; });
      h += sect('RUSHING', mine.sort(function (a, b) { return v(b, 'ry') - v(a, 'ry'); }), [['CAR', function (l) { return v(l, 'car'); }], ['YDS', function (l) { return v(l, 'ry'); }], ['TD', function (l) { return v(l, 'rtd'); }]], function (l) { return v(l, 'car') > 0; });
      h += sect('RECEIVING', mine.sort(function (a, b) { return v(b, 'rcy') - v(a, 'rcy'); }), [['REC', function (l) { return v(l, 'rec'); }], ['YDS', function (l) { return v(l, 'rcy'); }], ['TD', function (l) { return v(l, 'rctd'); }], ['TGT', function (l) { return v(l, 'tgt'); }]], function (l) { return v(l, 'rec') > 0; });
      h += sect('DEFENSE', mine.sort(function (a, b) { return (v(b, 'sk') * 3 + v(b, 'dint') * 3 + v(b, 'tkl')) - (v(a, 'sk') * 3 + v(a, 'dint') * 3 + v(a, 'tkl')); }).slice(0, 8), [['TKL', function (l) { return v(l, 'tkl'); }], ['SK', function (l) { return v(l, 'sk'); }], ['INT', function (l) { return v(l, 'dint'); }]], function (l) { return v(l, 'tkl') + v(l, 'sk') + v(l, 'dint') > 0; });
      h += sect('KICKING', mine, [['FG', function (l) { return v(l, 'fgm') + '/' + v(l, 'fga'); }], ['XP', function (l) { return v(l, 'xpm') + '/' + v(l, 'xpa'); }]], function (l) { return v(l, 'fga') + v(l, 'xpa') > 0; });
    });
    return h;
  }
  UI.boxModal = function (g) {
    var s = S(), w = g.hs > g.as ? g.h : g.hs < g.as ? g.a : null;
    var h = '<div class="bxhead"><div>' + UI.logo(g.a, 40) + '<b class="' + (w === g.a ? 'win' : '') + '">' + g.as + '</b></div><div class="dim">' + (g.po ? U.esc(g.po) : g.w ? 'WEEK ' + g.w : '') + (g.ot ? ' &middot; OT' : '') + (g.live ? ' &middot; PLAYED' : g.set ? ' &middot; SCORE SET' : '') + '</div><div><b class="' + (w === g.h ? 'win' : '') + '">' + g.hs + '</b>' + UI.logo(g.h, 40) + '</div></div>';
    h += boxHtml(g);
    if (g.pbp && g.pbp.length) h += '<details class="pbpd"><summary>PLAY-BY-PLAY</summary><div class="pbp">' + g.pbp.slice(-60).map(function (e) { return '<div class="pl k-' + e[3] + '"><span class="pc">' + (e[0] <= 4 ? 'Q' + e[0] : 'OT') + ' ' + e[1] + '</span><span class="pt">' + U.esc(e[2]) + '</span></div>'; }).join('') + '</div></details>';
    h += '<div class="row"><button class="btn gold" data-a="close">CLOSE</button></div>';
    UI.modal(h);
  };
})();
