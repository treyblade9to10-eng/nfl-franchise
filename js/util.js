// util.js - helpers shared by everything
var U = (function () {
  var seed = (Date.now() % 2147483647) || 1;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function setSeed(s) { seed = (s % 2147483646) + 1; }
  function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function gauss() { var u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function wpick(items, wf) { // weighted pick
    var tot = 0, i; for (i = 0; i < items.length; i++) tot += Math.max(0, wf(items[i]));
    var r = rnd() * tot; for (i = 0; i < items.length; i++) { r -= Math.max(0, wf(items[i])); if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }
  function money(m) {
    if (m == null) return '-';
    var neg = m < 0; m = Math.abs(m);
    var s = m >= 100 ? m.toFixed(0) : m >= 10 ? m.toFixed(1) : m.toFixed(2);
    return (neg ? '-' : '') + '$' + s + 'M';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sum(a, f) { var t = 0; for (var i = 0; i < a.length; i++) t += f ? f(a[i]) : a[i]; return t; }
  function avg(a, f) { return a.length ? sum(a, f) / a.length : 0; }
  function ord(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  function lastName(n) { return n.replace(/ (Jr\.?|Sr\.?|II|III|IV|V)$/, '').split(' ').slice(-1)[0]; }

  // name pools for made-up draft prospects and filler free agents
  var FIRST = ['Jalen', 'Marcus', 'Tyrese', 'Darius', 'Andre', 'Malik', 'Isaiah', 'Jordan', 'Cameron', 'Elijah', 'Xavier', 'Devin', 'Trevon', 'Javon', 'Caleb', 'Mason', 'Bryce', 'Keegan', 'Dillon', 'Aiden', 'Omari', 'Amari', 'Deshawn', 'Terrence', 'Quentin', 'Rashad', 'Jabari', 'Kendall', 'Brandon', 'Tyler', 'Ethan', 'Noah', 'Liam', 'Owen', 'Gavin', 'Jace', 'Micah', 'Ezra', 'Silas', 'Rowan', 'Dante', 'Cole', 'Reed', 'Brooks', 'Chase', 'Trey', 'Deon', 'Khalil', 'Jamir', 'Kyree', 'Nasir', 'Jaylin', 'Ty', 'Cade', 'Royce', 'Corey', 'Darnell', 'Emeka', 'Chidi', 'Tate', 'Beau', 'Colby', 'Hunter', 'Garrett', 'Logan', 'Wyatt', 'Carson', 'Brady', 'Drake', 'Jett', 'Kade', 'Zeke', 'Tre', 'DeMarcus', 'Jaquan', 'Lamar', 'Rodney', 'Cedric', 'Marquise', 'Keon', 'Jayden', 'Kobe', 'Damon', 'Isaac', 'Jonah', 'Grady', 'Luke', 'Sam', 'Nico', 'Tavion', 'Xzavier', 'Kamari', 'Bryson', 'Davion', 'Keshawn', 'Tariq', 'Malachi', 'Easton'];
  var LAST = ['Carter', 'Walker', 'Hayes', 'Brooks', 'Mitchell', 'Coleman', 'Freeman', 'Barnes', 'Sanders', 'Price', 'Bennett', 'Wood', 'Ross', 'Henderson', 'Powell', 'Jenkins', 'Perry', 'Russell', 'Sullivan', 'Fisher', 'Hamilton', 'Graham', 'Wallace', 'Woods', 'West', 'Owens', 'Reynolds', 'Ellis', 'Harrison', 'Gibson', 'McDonald', 'Cruz', 'Marshall', 'Ortiz', 'Murray', 'Wells', 'Webb', 'Simpson', 'Stevens', 'Tucker', 'Porter', 'Hunter', 'Hicks', 'Crawford', 'Henry', 'Boyd', 'Mason', 'Kennedy', 'Warren', 'Dixon', 'Burns', 'Gordon', 'Shaw', 'Holmes', 'Rice', 'Robertson', 'Hunt', 'Black', 'Daniels', 'Palmer', 'Mills', 'Nichols', 'Grant', 'Knight', 'Ferguson', 'Stone', 'Hawkins', 'Dunn', 'Perkins', 'Hudson', 'Spencer', 'Gardner', 'Stephens', 'Payne', 'Pierce', 'Berry', 'Matthews', 'Arnold', 'Wagner', 'Willis', 'Ray', 'Watkins', 'Olson', 'Carroll', 'Duncan', 'Snyder', 'Hart', 'Cunningham', 'Bradley', 'Lane', 'Andrews', 'Harper', 'Fox', 'Riley', 'Armstrong', 'Carpenter', 'Weaver', 'Greene', 'Lawrence', 'Elliott', 'Sims', 'Austin', 'Peters', 'Franklin', 'Lawson', 'Okafor', 'Adeyemi', 'Mensah', 'Boateng', 'Okeke', 'Thibodeaux', 'Fontenot', 'Kowalski', 'Lindqvist', 'Brandt', 'Holloway', 'McCray', 'Pruitt', 'Whitfield', 'Beasley', 'Tolbert', 'Langford', 'Ware', 'Booker', 'Sutton', 'Dorsey', 'Mayfield', 'Ruff', 'Tillman', 'Gaines', 'Hollins'];
  function makeName(used) {
    for (var i = 0; i < 60; i++) {
      var n = pick(FIRST) + ' ' + pick(LAST);
      if (!used || !used[n]) { if (used) used[n] = 1; return n; }
    }
    return pick(FIRST) + ' ' + pick(LAST) + ' Jr.';
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  var toastT;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  return { rnd: rnd, setSeed: setSeed, ri: ri, pick: pick, shuffle: shuffle, gauss: gauss, clamp: clamp, wpick: wpick, money: money, esc: esc, sum: sum, avg: avg, ord: ord, lastName: lastName, makeName: makeName, $: $, toast: toast };
})();
