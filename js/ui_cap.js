// ui_cap.js - Create a Player: add your own made-up player to your team (and edit him later)
(function () {
  var A = UI.A;
  function S() { return G.S; }
  var POS = ['QB', 'RB', 'FB', 'WR', 'TE', 'OT', 'G', 'C', 'EDGE', 'DT', 'LB', 'CB', 'S', 'K', 'P', 'LS'];
  var SPD = { QB: 82, RB: 90, FB: 80, WR: 91, TE: 84, OT: 70, G: 68, C: 68, EDGE: 85, DT: 75, LB: 85, CB: 92, S: 89, K: 60, P: 60, LS: 60 };
  function clamp(v, a, b, d) { v = parseInt(v, 10); if (isNaN(v)) v = d; return Math.max(a, Math.min(b, v)); }

  function form(p) {
    var o = p || { n: '', pos: 'QB', age: 22, ovr: 80, pot: 90, spd: SPD.QB, num: 0 };
    var num = function (id, lbl, v, mn, mx) { return '<label>' + lbl + '<input type="number" inputmode="numeric" id="cp_' + id + '" min="' + mn + '" max="' + mx + '" value="' + v + '"></label>'; };
    var h = '<h3>' + (p ? 'EDIT PLAYER' : 'CREATE A PLAYER') + '</h3><div class="form cpf">' +
      '<label>NAME<input id="cp_n" maxlength="24" value="' + U.esc(o.n) + '" placeholder="Trey Howard"></label>' +
      '<div class="lbl">POSITION</div><div class="seg cpos">' + POS.map(function (x) { return '<button data-a="cppos" data-p="' + x + '" class="sm2 ' + (o.pos === x ? 'on' : '') + '">' + x + '</button>'; }).join('') + '</div>' +
      '<div class="cpg">' + num('ovr', 'OVERALL', o.ovr, 40, 99) + num('pot', 'POTENTIAL', o.pot, 40, 99) + num('age', 'AGE', o.age, 18, 45) + num('spd', 'SPEED', o.spd, 40, 99) + num('num', 'JERSEY #', o.num || '', 0, 99) +
      (p ? '' : '<label>CONTRACT YEARS<input type="number" inputmode="numeric" id="cp_yrs" min="1" max="5" value="3"></label>') + '</div>' +
      (p ? '' : '<div class="dim small">He signs for the league minimum (' + U.money(L.minSal(0)) + ' a year), so he fits under your cap. He counts toward your 53. Young players with high potential get better every offseason.</div>') +
      '</div><div class="row"><button class="btn gold" data-a="cpsave"' + (p ? ' data-id="' + p.id + '"' : '') + '>' + (p ? 'SAVE CHANGES' : 'ADD TO MY TEAM') + '</button><button class="btn ghost" data-a="close">CANCEL</button></div>';
    UI.modal(h);
  }
  A.cpnew = function () { form(null); };
  A.cpedit = function (d) { var p = L.player(+d.id); if (p) form(p); };
  A.cppos = function (d, el) {
    var cur = document.querySelector('.cpos .on'); if (cur) cur.classList.remove('on'); el.classList.add('on');
    var sp = U.$('#cp_spd'); if (sp && !sp.dataset.touched) sp.value = SPD[d.p];
  };
  document.addEventListener('input', function (e) { if (e.target.id === 'cp_spd') e.target.dataset.touched = '1'; });
  A.cpsave = function (d) {
    var s = S(), on = document.querySelector('.cpos .on');
    var name = (U.$('#cp_n').value || '').trim().replace(/\s+/g, ' ');
    if (name.length < 2) { U.toast('Give him a name.'); return; }
    var pos = on ? on.dataset.p : 'QB';
    var ovr = clamp(U.$('#cp_ovr').value, 40, 99, 80);
    var pot = Math.max(ovr, clamp(U.$('#cp_pot').value, 40, 99, ovr));
    var age = clamp(U.$('#cp_age').value, 18, 45, 22);
    var spd = clamp(U.$('#cp_spd').value, 40, 99, SPD[pos]);
    var num = clamp(U.$('#cp_num').value, 0, 99, 0);
    if (d.id) {
      var p = L.player(+d.id); if (!p) return;
      p.n = name; p.ovr = ovr; p.pot = pot; p.age = age; p.spd = spd; p.num = num;
      if (p.pos !== pos) { p.pos = pos; p.sp = pos; var t = L.team(p.t); if (t && t.depth) Object.keys(t.depth).forEach(function (k) { t.depth[k] = t.depth[k].filter(function (x) { return x !== p.id; }); }); }
      delete p.scout;
      L.dirty(); UI.closeModal(); UI.save(); UI.render(); U.toast(name + ' updated.');
      return;
    }
    var yrs = clamp(U.$('#cp_yrs').value, 1, 5, 3), sal = [];
    for (var i = 0; i < yrs; i++) sal.push(L.minSal(0));
    var np = Off.newPlayer({ n: name, t: s.user, pos: pos, ovr: ovr, pot: pot, age: age, spd: spd, num: num, sal: sal, exp: Math.max(0, age - 22) });
    np.cust = 1;
    L.dirty();
    (s.news = s.news || []).unshift({ d: 'Signing', m: L.teamName(s.user) + ' sign ' + pos + ' ' + name + ' (' + ovr + ').', k: 'you' });
    UI.closeModal(); UI.save(); UI.render();
    var n = L.roster(s.user).length, mx = L.rosterMax();
    U.toast(name + ' joins the team!' + (n > mx ? ' You are at ' + n + '/' + mx + ', cut someone before the season.' : ''));
  };

  // ================= ENTER STATS =================
  // Type the final score (optional) and the stats you know for any of your players.
  // Everything you leave blank gets simmed around what you typed.
  var FIELDS = {
    QB: [['cmp', 'CMP'], ['att', 'ATT'], ['py', 'PASS YDS'], ['ptd', 'PASS TD'], ['int', 'INT'], ['car', 'CARRIES'], ['ry', 'RUSH YDS'], ['rtd', 'RUSH TD']],
    RB: [['car', 'CARRIES'], ['ry', 'RUSH YDS'], ['rtd', 'RUSH TD'], ['rec', 'CATCHES'], ['rcy', 'REC YDS'], ['rctd', 'REC TD']],
    WR: [['rec', 'CATCHES'], ['rcy', 'REC YDS'], ['rctd', 'REC TD'], ['car', 'CARRIES'], ['ry', 'RUSH YDS'], ['rtd', 'RUSH TD']],
    DEF: [['tkl', 'TACKLES'], ['sk', 'SACKS'], ['dint', 'INT'], ['ff', 'FORCED FUM']],
    K: [['fgm', 'FG MADE'], ['fga', 'FG TRIED'], ['xpm', 'XP MADE'], ['xpa', 'XP TRIED']],
    P: [['punts', 'PUNTS']]
  };
  function fieldsFor(pos) { return pos === 'QB' ? FIELDS.QB : pos === 'RB' || pos === 'FB' ? FIELDS.RB : pos === 'WR' || pos === 'TE' ? FIELDS.WR : pos === 'K' ? FIELDS.K : pos === 'P' ? FIELDS.P : L.DEF.indexOf(pos) >= 0 ? FIELDS.DEF : null; }
  function matchup(k) {
    if (k === 'reg') return Sim.userGame();
    var pg = Sim.userPlayoffGame(); return pg ? [pg.h, pg.a] : null;
  }
  function readFx() {
    var fx = UI.st.fx; if (!fx) return;
    var a = U.$('#ss_a'), h = U.$('#ss_h'); if (a) fx.as = a.value; if (h) fx.hs = h.value;
    fx.rows.forEach(function (r) {
      (fieldsFor(L.player(r.id).pos) || []).forEach(function (f) { var e = U.$('#fx_' + r.id + '_' + f[0]); if (e) r.v[f[0]] = e.value; });
    });
  }
  function drawFx() {
    var s = S(), fx = UI.st.fx, m = matchup(fx.k); if (!m) return;
    var h = '<h3>ENTER STATS</h3><div class="dim small">Type what you know. Leave the rest blank and it gets simmed around your numbers.</div>';
    h += '<div class="lbl">FINAL SCORE <span class="dim">(optional)</span></div><div class="setsc">' +
      [m[1], m[0]].map(function (tid, i) { var k = i ? 'h' : 'a'; return '<div class="ssr">' + UI.logo(tid, 36) + '<b>' + U.esc(L.teamName(tid)) + (i ? ' <span class="dim">(home)</span>' : '') + '</b><input type="number" inputmode="numeric" min="0" max="99" id="ss_' + k + '" placeholder="sim" value="' + U.esc(fx[k + 's'] || '') + '"></div>'; }).join('') + '</div>';
    h += '<div class="lbl">YOUR PLAYERS\' STATS</div>';
    fx.rows.forEach(function (r) {
      var p = L.player(r.id), fl = fieldsFor(p.pos);
      h += '<div class="fxr"><div class="fxh">' + UI.face(p, 32) + '<div class="pmain"><div class="pname">' + U.esc(p.n) + '</div><div class="psub"><b class="pp">' + p.pos + '</b> &middot; ' + p.ovr + ' OVR</div></div><button class="x" data-a="fxdel" data-id="' + p.id + '">&times;</button></div><div class="fxg">' +
        fl.map(function (f) { return '<label>' + f[1] + '<input type="number" inputmode="numeric" min="0" max="999" id="fx_' + p.id + '_' + f[0] + '" value="' + U.esc(r.v[f[0]] == null ? '' : r.v[f[0]]) + '"></label>'; }).join('') + '</div></div>';
    });
    var have = {}; fx.rows.forEach(function (r) { have[r.id] = 1; });
    var ro = L.roster(s.user).filter(function (p) { return fieldsFor(p.pos) && !have[p.id]; });
    var order = ['QB', 'RB', 'FB', 'WR', 'TE', 'EDGE', 'DT', 'LB', 'CB', 'S', 'K', 'P'];
    ro.sort(function (a, b) { return (b.cust || 0) - (a.cust || 0) || order.indexOf(a.pos) - order.indexOf(b.pos) || b.ovr - a.ovr; });
    var cust = ro.filter(function (p) { return p.cust; });
    h += '<select data-ch="fxadd" class="fxadd"><option value="">+ ADD A PLAYER\'S STATS</option>' +
      (cust.length ? '<optgroup label="YOUR CREATED PLAYERS">' + cust.map(function (p) { return '<option value="' + p.id + '">' + p.pos + ' ' + U.esc(p.n) + ' (' + p.ovr + ')</option>'; }).join('') + '</optgroup>' : '') +
      order.map(function (pos) { var l = ro.filter(function (p) { return p.pos === pos && !p.cust; }); return l.length ? '<optgroup label="' + L.POSNAME[pos].toUpperCase() + '">' + l.map(function (p) { return '<option value="' + p.id + '">' + p.pos + ' ' + U.esc(p.n) + ' (' + p.ovr + ')</option>'; }).join('') + '</optgroup>' : ''; }).join('') + '</select>';
    h += '<div class="row"><button class="btn gold" data-a="fxgo">' + (fx.rows.length ? 'SIM THE REST' : 'SAVE') + '</button><button class="btn ghost" data-a="close">CANCEL</button></div>';
    UI.modal(h);
  }
  A.setscore = function (d) {
    if (!matchup(d.k)) return;
    UI.st.fx = { k: d.k, rows: [], hs: '', as: '' };
    var cust = L.roster(S().user).filter(function (p) { return p.cust && fieldsFor(p.pos); });
    cust.slice(0, 2).forEach(function (p) { UI.st.fx.rows.push({ id: p.id, v: {} }); });
    drawFx();
  };
  A.fxadd = function (d, el) { var id = +el.value; if (!id) return; readFx(); UI.st.fx.rows.push({ id: id, v: {} }); drawFx(); };
  A.fxdel = function (d) { readFx(); UI.st.fx.rows = UI.st.fx.rows.filter(function (r) { return r.id !== +d.id; }); drawFx(); };
  A.fxgo = function () {
    readFx();
    var s = S(), fx = UI.st.fx, m = matchup(fx.k); if (!m) return;
    var hsT = String(fx.hs).trim(), asT = String(fx.as).trim(), force = null;
    if (hsT !== '' || asT !== '') {
      var hs = parseInt(hsT, 10), as = parseInt(asT, 10);
      if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0 || hs > 99 || as > 99) { U.toast('Type both scores (0-99), or leave both blank to sim the score.'); return; }
      if (hs === 1 || as === 1) { U.toast('A team cannot score exactly 1 point in football.'); return; }
      if (fx.k !== 'reg' && hs === as) { U.toast('Playoff games cannot end in a tie.'); return; }
      force = { h: hs, a: as };
    }
    var fix = {}, n = 0, recTD = 0, rushTD = 0, ptd = 0, bad = null;
    fx.rows.forEach(function (r) {
      var p = L.player(r.id), o = {};
      Object.keys(r.v).forEach(function (k) { var t = String(r.v[k]).trim(); if (t === '') return; var v = parseInt(t, 10); if (isNaN(v) || v < 0 && k !== 'py' && k !== 'ry' && k !== 'rcy') return; o[k] = v; });
      if (o.cmp != null && o.att != null && o.cmp > o.att) bad = p.n + ': completions can\'t be more than attempts.';
      if (o.fgm != null && o.fga != null && o.fgm > o.fga) bad = p.n + ': FG made can\'t be more than FG tried.';
      if (o.xpm != null && o.xpa != null && o.xpm > o.xpa) bad = p.n + ': XP made can\'t be more than XP tried.';
      if (Object.keys(o).length) { fix[p.id] = o; n++; recTD += o.rctd || 0; rushTD += o.rtd || 0; ptd = Math.max(ptd, o.ptd || 0); }
    });
    if (bad) { U.toast(bad); return; }
    var side = m[0] === s.user ? 'h' : 'a';
    if (force) {
      var tds = Math.max(recTD, ptd) + rushTD;
      var cap = Math.floor(force[side] / 6);
      if (tds > cap) { U.toast('You typed ' + tds + ' touchdowns, but ' + force[side] + ' points only fits ' + cap + '.'); return; }
    }
    if (!force && !n) { U.toast('Type a score or some stats (or just tap SIM IT).'); return; }
    UI.closeModal(); UI.st.fx = null;
    var o = { fixSide: side }; if (force) o.force = force; if (n) o.fix = fix;
    if (fx.k === 'reg') { var g = Sim.play(m[0], m[1], o); if (force) { g.set = true; g.ot = false; } Sim.finishUserGame(g); UI.resultToast(g); }
    else { var pg = Sim.userPlayoffGame(); o.playoff = true; o.neutral = pg.neutral; var r = Sim.play(pg.h, pg.a, o); if (force) r.set = true; Sim.finishPlayoffGame(pg, r); UI.resultToast(r); }
    UI.save(); UI.render();
  };
})();
