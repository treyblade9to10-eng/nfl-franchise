// sbimport.js - bring real game stats from the Scoreboard app into the league.
// Scoreboard makes a "stat sheet" (.json) with the same stat names this game uses (py, ptd, ry, rcy, tkl, sk...).
// If you have a game "next up" on the schedule, the sheet can BE that game: real final score, both teams' stats in the box score.
(function () {
  var A = UI.A;
  function S() { return G.S; }
  var KEYS = ['cmp', 'att', 'py', 'ptd', 'int', 'car', 'ry', 'rtd', 'rec', 'rcy', 'rctd', 'tkl', 'sk', 'dint', 'ff', 'fgm', 'fga', 'punts'];
  var norm = function (x) { return String(x || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(); };
  var last = function (x) { var p = norm(x).split(' '); return p[p.length - 1]; };
  var POSG = { QB: ['QB'], RB: ['RB', 'FB'], FB: ['FB', 'RB'], WR: ['WR'], TE: ['TE'], K: ['K'], P: ['P'], LB: ['LB', 'MLB', 'OLB', 'ILB', 'EDGE'], DL: ['DT', 'EDGE', 'DE'], DT: ['DT', 'DE', 'EDGE'], DE: ['EDGE', 'DE', 'DT'], EDGE: ['EDGE', 'DE', 'LB'], CB: ['CB'], S: ['S', 'FS', 'SS'], FS: ['S', 'FS'], SS: ['S', 'SS'], DB: ['CB', 'S'], OL: ['OT', 'G', 'C'] };

  // the game that's "next up" for you (regular season or playoffs)
  function nextGame() {
    var s = S();
    if (s.live) return null;
    if (s.phase === 'regular') { var m = Sim.userGame(); return m ? { h: m[0], a: m[1], po: false, label: 'WEEK ' + (s.week + 1) } : null; }
    if (s.phase === 'playoffs') { var pg = Sim.userPlayoffGame(); return pg ? { h: pg.h, a: pg.a, po: true, pg: pg, label: 'PLAYOFFS' } : null; }
    return null;
  }
  function rosterOf(tid) { return L.roster(tid).sort(function (a, b) { return a.pos === b.pos ? b.ovr - a.ovr : a.pos < b.pos ? -1 : 1; }); }
  // what position a Scoreboard player most likely played, from the sheet or from his stats
  function guessPos(r) {
    var p = String(r.pos || '').toUpperCase(); if (POSG[p]) return p;
    var v = function (k) { return r[k] || 0; };
    if (v('att') >= 3 || (v('att') && v('att') >= v('car'))) return 'QB';
    if (v('fga') || v('xpa')) return 'K';
    if (v('punts')) return 'P';
    if (v('car') > v('rec')) return 'RB';
    if (v('rec')) return 'WR';
    if (v('sk')) return 'EDGE';
    if (v('dint')) return 'CB';
    if (v('tkl')) return 'LB';
    return '';
  }
  // match every sheet player on one side to a player on team tid: name first, then the best open player at his position
  function matchSide(rows, tid) {
    var roster = rosterOf(tid), used = {}, out = {};
    rows.forEach(function (x) {
      var n = norm(x.r.name), id = 0;
      if (n) { var ex = roster.filter(function (p) { return norm(p.n) === n; }); if (ex.length === 1) id = ex[0].id; }
      if (!id && n) { var ln = roster.filter(function (p) { return last(p.n) === last(x.r.name); }); if (ln.length === 1) id = ln[0].id; }
      if (id) { out[x.k] = id; used[id] = 1; }
    });
    rows.forEach(function (x) {
      if (out[x.k]) return;
      var pos = guessPos(x.r), group = POSG[pos] || [];
      var pick = roster.filter(function (p) { return !used[p.id] && p.inj <= 0 && group.indexOf(p.pos) >= 0; })
        .sort(function (a, b) { return group.indexOf(a.pos) - group.indexOf(b.pos) || b.ovr - a.ovr; })[0];
      if (pick) { out[x.k] = pick.id; used[pick.id] = 1; } else out[x.k] = 0;
    });
    return out;
  }
  function line(r) {
    var b = [], v = function (k) { return r[k] || 0; };
    if (v('att')) b.push(v('cmp') + '/' + v('att') + ' ' + v('py') + ' pass yds' + (v('ptd') ? ', ' + v('ptd') + ' TD' : '') + (v('int') ? ', ' + v('int') + ' INT' : ''));
    if (v('car')) b.push(v('car') + ' car ' + v('ry') + ' yds' + (v('rtd') ? ', ' + v('rtd') + ' TD' : ''));
    if (v('rec')) b.push(v('rec') + ' rec ' + v('rcy') + ' yds' + (v('rctd') ? ', ' + v('rctd') + ' TD' : ''));
    if (v('tkl') || v('sk') || v('dint')) b.push(v('tkl') + ' tkl' + (v('sk') ? ', ' + v('sk') + ' sk' : '') + (v('dint') ? ', ' + v('dint') + ' INT' : ''));
    if (v('fga')) b.push(v('fgm') + '/' + v('fga') + ' FG');
    return b.join(' · ') || 'no stats';
  }
  function rowsOf(g, gi, side) { var o = []; g.players.forEach(function (r, pi) { if (r.team === side) o.push({ r: r, k: gi + ':' + pi }); }); return o; }
  // which team in the sheet is you: the side whose names match your roster best (or the side with more players)
  function guessMine(g) {
    var mine = rosterOf(S().user), score = function (side) { return g.players.filter(function (r) { return r.team === side && r.name && mine.some(function (p) { return norm(p.n) === norm(r.name) || last(p.n) === last(r.name); }); }).length; };
    var a = score('away'), h = score('home');
    if (a !== h) return a > h ? 'away' : 'home';
    return g.players.filter(function (r) { return r.team === 'away'; }).length >= g.players.filter(function (r) { return r.team === 'home'; }).length ? 'away' : 'home';
  }
  function rematch(gi) {
    var st = UI.st.sbi, g = st.data.games[gi], mineSide = st.mine[gi], other = mineSide === 'away' ? 'home' : 'away', s = S();
    var m1 = matchSide(rowsOf(g, gi, mineSide), s.user);
    var m2 = st.asNext && gi === st.nextIdx ? matchSide(rowsOf(g, gi, other), st.opp) : {};
    rowsOf(g, gi, other).forEach(function (x) { if (!(x.k in m2)) m2[x.k] = 0; });
    Object.assign(st.map, m1, m2);
  }

  A.sbfile = function (d, el) {
    var f = el.files && el.files[0]; if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      var data; try { data = JSON.parse(rd.result); } catch (e) { data = null; }
      el.value = '';
      if (!data || data.format !== 'scoreboard-stats' || !data.games) return U.toast("That isn't a Scoreboard stat sheet.");
      var s = S(), done = s.sbImported || [], ng = nextGame();
      var st = { data: data, mine: {}, map: {}, next: ng, asNext: false, nextIdx: -1 };
      data.games.forEach(function (g, gi) { g.done = done.indexOf(g.id) >= 0; st.mine[gi] = guessMine(g); });
      var open = data.games.map(function (g, i) { return g.done ? -1 : i; }).filter(function (i) { return i >= 0; });
      if (ng && open.length) { st.nextIdx = open[0]; st.asNext = true; st.opp = ng.h === s.user ? ng.a : ng.h; }
      UI.st.sbi = st;
      data.games.forEach(function (g, gi) { rematch(gi); });
      show();
    };
    rd.readAsText(f);
  };
  function pickRow(x, tid) {
    var sel = UI.st.sbi.map[x.k];
    return '<div class="sbrow"><div><b>#' + U.esc(x.r.num) + ' ' + U.esc(x.r.name || '') + (x.r.pos ? ' <span class="dim">' + U.esc(x.r.pos) + '</span>' : '') + '</b><div class="small dim">' + line(x.r) + '</div></div>' +
      '<select data-ch="sbpick" data-k="' + x.k + '"><option value="0">Skip</option>' + rosterOf(tid).map(function (q) { return '<option value="' + q.id + '"' + (q.id === sel ? ' selected' : '') + '>' + q.pos + ' #' + (q.num || '-') + ' ' + U.esc(q.n) + '</option>'; }).join('') + '</select></div>';
  }
  function show() {
    var st = UI.st.sbi, s = S(), h = '<h3>IMPORT GAME STATS</h3>';
    st.data.games.forEach(function (g, gi) {
      var mineSide = st.mine[gi], other = mineSide === 'away' ? 'home' : 'away', isNext = st.asNext && gi === st.nextIdx;
      h += '<div class="card"><div class="lbl">' + U.esc(g.away.abbr) + ' ' + g.away.score + ' - ' + U.esc(g.home.abbr) + ' ' + g.home.score + ' &middot; ' + U.esc(g.date) + (g.title ? ' &middot; ' + U.esc(g.title) : '') + '</div>';
      if (g.done) { h += '<div class="small gold">Already imported. It will be skipped so stats don\'t count twice.</div></div>'; return; }
      h += '<div class="small dim">Which team is yours?</div><div class="seg">' + ['away', 'home'].map(function (side) { return '<button data-a="sbmine" data-g="' + gi + '" data-s="' + side + '" class="' + (mineSide === side ? 'on' : '') + '">' + U.esc(g[side].name) + '</button>'; }).join('') + '</div>';
      if (gi === st.nextIdx && st.next) {
        var ng = st.next, opp = st.opp, myScore = g[mineSide].score, oppScore = g[other].score;
        h += '<label class="sbnext"><input type="checkbox" data-ch="sbasnext" ' + (st.asNext ? 'checked' : '') + '> <span><b>This was my ' + ng.label + ' game vs ' + U.esc(L.teamName(opp)) + '</b><br><span class="small dim">Final ' + myScore + '-' + oppScore + ' goes on the schedule, standings and box score, with both teams\' stats. Off = just add stats to this season.</span></span></label>';
      }
      h += '<div class="lbl">' + U.esc(g[mineSide].name).toUpperCase() + ' &rarr; YOUR PLAYERS</div>' + rowsOf(g, gi, mineSide).map(function (x) { return pickRow(x, s.user); }).join('');
      if (isNext) h += '<div class="lbl">' + U.esc(g[other].name).toUpperCase() + ' &rarr; ' + U.esc(L.teamName(st.opp)).toUpperCase() + '</div>' + rowsOf(g, gi, other).map(function (x) { return pickRow(x, st.opp); }).join('');
      h += '</div>';
    });
    h += '<div class="row"><button class="btn ghost" data-a="close">CANCEL</button><button class="btn gold" data-a="sbgo">' + (st.asNext ? 'SAVE GAME + STATS' : 'ADD STATS') + '</button></div>';
    UI.modal(h);
  }
  A.sbmine = function (d) { UI.st.sbi.mine[+d.g] = d.s; rematch(+d.g); show(); };
  A.sbpick = function (d, el) { UI.st.sbi.map[d.k] = +el.value; };
  A.sbasnext = function (d, el) { var st = UI.st.sbi; st.asNext = el.checked; rematch(st.nextIdx); show(); };

  function addToSeason(p, row) { p.st = p.st || L.blankStats(); KEYS.forEach(function (k) { if (row[k]) p.st[k] = (p.st[k] || 0) + row[k]; }); }
  A.sbgo = function () {
    var s = S(), st = UI.st.sbi; if (!st) return;
    s.sbImported = s.sbImported || [];
    var counted = {}, games = 0, playedNext = null;
    st.data.games.forEach(function (g, gi) {
      if (g.done || s.sbImported.indexOf(g.id) >= 0) return;
      var mineSide = st.mine[gi], other = mineSide === 'away' ? 'home' : 'away';
      if (st.asNext && gi === st.nextIdx && st.next && nextGame()) { // the game on the schedule
        var ng = nextGame(), my = g[mineSide].score, op = g[other].score, userHome = ng.h === s.user;
        var hs = userHome ? my : op, as = userHome ? op : my;
        if (hs === 1 || as === 1 || hs > 99 || as > 99 || (ng.po && hs === as)) { U.toast(ng.po && hs === as ? 'Playoff games can\'t end in a tie, so stats were just added to the season.' : 'That score can\'t be used for the schedule, so stats were just added to the season.'); }
        else {
          var box = {};
          g.players.forEach(function (row, pi) {
            var pid = st.map[gi + ':' + pi], p = pid && L.player(pid); if (!p) return;
            var ln = box[p.id] = box[p.id] || { id: p.id, t: p.t };
            KEYS.forEach(function (k) { if (row[k]) ln[k] = (ln[k] || 0) + row[k]; });
          });
          var res = Sim.play(ng.h, ng.a, ng.po ? { force: { h: hs, a: as }, playoff: true } : { force: { h: hs, a: as } });
          res.box = box; res.set = true; res.real = true; res.ot = false; res.pbp = null;
          if (ng.po) Sim.finishPlayoffGame(ng.pg, res); else Sim.finishUserGame(res);
          s.sbImported.push(g.id); games++; playedNext = { my: my, op: op, opp: st.opp };
          Object.keys(box).forEach(function (id) { counted[id + ':' + gi] = 1; });
          return;
        }
      }
      var any = false;
      g.players.forEach(function (row, pi) {
        if (row.team !== mineSide) return;
        var p = L.player(st.map[gi + ':' + pi]); if (!p) return;
        addToSeason(p, row);
        if (!counted[p.id + ':' + gi]) { p.st.g = (p.st.g || 0) + 1; counted[p.id + ':' + gi] = 1; }
        any = true;
      });
      if (any) { s.sbImported.push(g.id); games++; }
    });
    UI.st.sbi = null; UI.closeModal(); UI.save(); UI.render();
    var n = Object.keys(counted).length;
    if (playedNext) { U.toast((playedNext.my > playedNext.op ? 'WIN ' : playedNext.my < playedNext.op ? 'LOSS ' : 'TIE ') + playedNext.my + '-' + playedNext.op + ' vs ' + L.shortName(playedNext.opp) + ' saved with real stats.'); L.news('Real game result from Scoreboard: ' + playedNext.my + '-' + playedNext.op + ' vs ' + L.teamName(playedNext.opp) + '.', 'you'); }
    else U.toast(n ? 'Added stats for ' + n + ' player game' + (n === 1 ? '' : 's') + ' from ' + games + ' game' + (games === 1 ? '' : 's') + '.' : 'Nothing was added. Match at least one player.');
  };
})();
