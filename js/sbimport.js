// sbimport.js - bring real game stats from the Scoreboard app onto your players.
// Scoreboard makes a "stat sheet" (.json) with the same stat names this game uses (py, ptd, ry, rcy, tkl, sk...).
(function () {
  var A = UI.A;
  function S() { return G.S; }
  var KEYS = ['cmp', 'att', 'py', 'ptd', 'int', 'car', 'ry', 'rtd', 'rec', 'rcy', 'rctd', 'tkl', 'sk', 'dint', 'ff', 'fgm', 'fga', 'punts'];
  var norm = function (x) { return String(x || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim(); };
  var last = function (x) { var p = norm(x).split(' '); return p[p.length - 1]; };

  function myRoster() { return L.roster(S().user).sort(function (a, b) { return a.pos === b.pos ? b.ovr - a.ovr : a.pos < b.pos ? -1 : 1; }); }
  function autoMatch(row, roster) {
    var n = norm(row.name);
    if (n) { var ex = roster.filter(function (p) { return norm(p.n) === n; }); if (ex.length === 1) return ex[0].id; }
    if (n) { var ln = roster.filter(function (p) { return last(p.n) === last(row.name); }); if (ln.length === 1) return ln[0].id; }
    if (row.num && !n) { var nu = roster.filter(function (p) { return +p.num === +row.num; }); if (nu.length === 1) return nu[0].id; }
    return 0;
  }
  function line(r) {
    var b = [], v = function (k) { return r[k] || 0; };
    if (v('att')) b.push(v('cmp') + '/' + v('att') + ' ' + v('py') + ' pass yds' + (v('ptd') ? ', ' + v('ptd') + ' TD' : ''));
    if (v('car')) b.push(v('car') + ' car ' + v('ry') + ' yds' + (v('rtd') ? ', ' + v('rtd') + ' TD' : ''));
    if (v('rec')) b.push(v('rec') + ' rec ' + v('rcy') + ' yds' + (v('rctd') ? ', ' + v('rctd') + ' TD' : ''));
    if (v('tkl') || v('sk') || v('dint')) b.push(v('tkl') + ' tkl' + (v('sk') ? ', ' + v('sk') + ' sk' : '') + (v('dint') ? ', ' + v('dint') + ' INT' : ''));
    if (v('fga')) b.push(v('fgm') + '/' + v('fga') + ' FG');
    return b.join(' · ') || 'no stats';
  }

  A.sbfile = function (d, el) {
    var f = el.files && el.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      var data; try { data = JSON.parse(r.result); } catch (e) { data = null; }
      el.value = '';
      if (!data || data.format !== 'scoreboard-stats' || !data.games) return U.toast("That isn't a Scoreboard stat sheet.");
      var roster = myRoster(), done = S().sbImported || [];
      var st = { data: data, mine: {}, map: {} };
      data.games.forEach(function (g, gi) {
        var best = 'away', bestN = -1;
        ['away', 'home'].forEach(function (side) {
          var n = g.players.filter(function (p) { return p.team === side && autoMatch(p, roster); }).length;
          if (n > bestN) { bestN = n; best = side; }
        });
        st.mine[gi] = best;
        g.players.forEach(function (p, pi) { st.map[gi + ':' + pi] = autoMatch(p, roster); });
        g.done = done.indexOf(g.id) >= 0;
      });
      UI.st.sbi = st; show();
    };
    r.readAsText(f);
  };
  function show() {
    var st = UI.st.sbi, roster = myRoster(), h = '<h3>IMPORT GAME STATS</h3><p class="small dim">Pick which team is yours, then check each player is matched to the right player on your team. Stats get added to this season.</p>';
    st.data.games.forEach(function (g, gi) {
      h += '<div class="card"><div class="lbl">' + U.esc(g.away.abbr) + ' ' + g.away.score + ' - ' + U.esc(g.home.abbr) + ' ' + g.home.score + ' &middot; ' + U.esc(g.date) + (g.title ? ' &middot; ' + U.esc(g.title) : '') + '</div>';
      if (g.done) { h += '<div class="small gold">Already imported. It will be skipped so stats don\'t count twice.</div></div>'; return; }
      h += '<div class="seg">' + ['away', 'home'].map(function (side) { return '<button data-a="sbmine" data-g="' + gi + '" data-s="' + side + '" class="' + (st.mine[gi] === side ? 'on' : '') + '">' + U.esc(g[side].name) + '</button>'; }).join('') + '</div>';
      g.players.forEach(function (p, pi) {
        if (p.team !== st.mine[gi]) return;
        var sel = st.map[gi + ':' + pi];
        h += '<div class="sbrow"><div><b>#' + U.esc(p.num) + ' ' + U.esc(p.name || '') + '</b><div class="small dim">' + line(p) + '</div></div>' +
          '<select data-ch="sbpick" data-k="' + gi + ':' + pi + '"><option value="0">Skip</option>' + roster.map(function (q) { return '<option value="' + q.id + '"' + (q.id === sel ? ' selected' : '') + '>' + q.pos + ' #' + (q.num || '-') + ' ' + U.esc(q.n) + '</option>'; }).join('') + '</select></div>';
      });
      h += '</div>';
    });
    h += '<div class="row"><button class="btn ghost" data-a="close">CANCEL</button><button class="btn gold" data-a="sbgo">ADD STATS</button></div>';
    UI.modal(h);
  }
  A.sbmine = function (d) { UI.st.sbi.mine[+d.g] = d.s; show(); };
  A.sbpick = function (d, el) { UI.st.sbi.map[d.k] = +el.value; };
  A.sbgo = function () {
    var s = S(), st = UI.st.sbi; if (!st) return;
    s.sbImported = s.sbImported || [];
    var players = {}, games = 0;
    st.data.games.forEach(function (g, gi) {
      if (g.done || s.sbImported.indexOf(g.id) >= 0) return;
      var any = false;
      g.players.forEach(function (row, pi) {
        if (row.team !== st.mine[gi]) return;
        var p = L.player(st.map[gi + ':' + pi]); if (!p) return;
        p.st = p.st || L.blankStats();
        if (!players[p.id + ':' + gi]) { p.st.g = (p.st.g || 0) + 1; players[p.id + ':' + gi] = 1; }
        KEYS.forEach(function (k) { if (row[k]) p.st[k] = (p.st[k] || 0) + row[k]; });
        any = true;
      });
      if (any) { s.sbImported.push(g.id); games++; }
    });
    UI.st.sbi = null; UI.closeModal(); UI.save(); UI.render();
    var n = Object.keys(players).length;
    U.toast(n ? 'Added stats for ' + n + ' player game' + (n === 1 ? '' : 's') + ' from ' + games + ' game' + (games === 1 ? '' : 's') + '.' : 'Nothing was added. Match at least one player.');
    if (n) L.news('Imported real game stats from Scoreboard (' + games + ' game' + (games === 1 ? '' : 's') + ').');
  };
})();
