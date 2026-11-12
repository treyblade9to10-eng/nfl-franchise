// sbsend.js - send a team (starters + the rest of the roster) to the Scoreboard app.
// Makes a short code / link; Scoreboard shows "Is this your team?" and you check the players there.
(function () {
  var A = UI.A;
  function S() { return G.S; }
  var POS = ['QB', 'RB', 'FB', 'WR', 'TE', 'OT', 'G', 'C', 'EDGE', 'DT', 'LB', 'CB', 'S', 'K', 'P', 'LS'];
  function pack(tid) {
    var s = S(), t = L.team(tid), bp = L.byPos(tid), rows = [];
    POS.forEach(function (pos) {
      var need = L.STARTERS[pos] || 0;
      (bp[pos] || []).forEach(function (p) {
        var hurt = p.inj > 0, st = !hurt && need > 0; if (st) need--;
        rows.push([p.n, p.num || 0, pos, p.ovr, st ? 1 : 0, hurt ? 1 : 0]);
      });
    });
    return { f: 'sbteam', v: 1, from: 'NFL Rebuilder', slot: s.slot || 0, season: s.season, mine: tid === s.user ? 1 : 0, rec: UI.rec(t),
      t: { id: t.id, city: t.city, name: t.name, c1: t.c1, c2: t.c2, logo: t.logo || '' }, p: rows };
  }
  function code(tid) { return LZString.compressToEncodedURIComponent(JSON.stringify(pack(tid))); }
  function link(tid) { return new URL('../scoreboard/#/import/code/' + code(tid), location.href).href; }
  A.sbsend = function (d) {
    var tid = d.id || S().user, t = L.team(tid), n = 0;
    Object.keys(L.STARTERS).forEach(function (k) { n += L.STARTERS[k]; });
    UI.modal('<h3>SEND TO SCOREBOARD</h3><div class="sbsend" style="--tc:' + t.c1 + '">' + UI.logo(tid, 54) + '<div><b>' + U.esc(L.teamName(tid)) + '</b><div class="dim small">' + n + ' starters + the rest of the roster. In Scoreboard you check every player, pick starters only or the whole team, then play and keep stats.</div></div></div>' +
      '<a class="btn gold wide" href="' + link(tid) + '" target="_blank" rel="noopener">OPEN IN SCOREBOARD</a>' +
      '<button class="btn wide" data-a="sbcopy" data-id="' + tid + '">COPY TEAM CODE</button>' +
      '<div class="dim small">Scoreboard on a home screen icon? Copy the code, then in Scoreboard tap Import and paste it.</div>' +
      '<button class="btn ghost wide" data-a="close">CANCEL</button>');
  };
  A.sbcopy = function (d) {
    var c = code(d.id);
    var done = function () { U.toast('Team code copied. In Scoreboard: Import, then paste.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(c).then(done, function () { window.prompt('Copy this team code:', c); });
    else window.prompt('Copy this team code:', c);
  };
})();
