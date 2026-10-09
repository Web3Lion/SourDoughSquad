// ==================== SQUAD HQ OWNER DASHBOARD ====================
(function () {
  var config = window.SQUAD_CONFIG;
  var MENU = config.MENU;
  var MENU_IDS = Object.keys(MENU);
  var KEY_STORE = 'squadDashKey';
  var REFRESH_MS = 60000;

  var state = {
    key: '',
    demo: false,
    orders: [],
    votes: {},
    dateFilter: 'upcoming',
    statusFilter: 'all',
    search: ''
  };
  var refreshTimer = null;

  var $ = function (sel) { return document.querySelector(sel); };

  function money(n) { return '$' + n.toFixed(2); }

  function isoDate(d) {
    var pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function today() { return isoDate(new Date()); }

  function prettyDate(iso) {
    var d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(message) {
    var el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  function storage(action, value) {
    try {
      if (action === 'get') return localStorage.getItem(KEY_STORE) || '';
      if (action === 'set') localStorage.setItem(KEY_STORE, value);
      if (action === 'clear') localStorage.removeItem(KEY_STORE);
    } catch (e) {}
    return '';
  }

  // ---------- Data ----------
  function fetchOrders() {
    if (state.demo) return Promise.resolve();
    if (!config.ORDER_LOG_URL) {
      return Promise.reject(new Error('ORDER_LOG_URL is empty in js/config.js. Try sample data, or see README.md.'));
    }
    var url = config.ORDER_LOG_URL + '?key=' + encodeURIComponent(state.key);
    return fetch(url).then(function (res) { return res.json(); }).then(function (data) {
      if (!data.ok) throw new Error(data.error || 'Could not load orders');
      state.orders = data.orders;
      state.votes = data.votes || {};
      $('#last-updated').textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    });
  }

  function sendUpdate(order, field, value) {
    if (state.demo) return;
    // text/plain + no-cors avoids the CORS preflight Apps Script can't answer.
    fetch(config.ORDER_LOG_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ type: 'update', key: state.key, orderId: order.orderId, field: field, value: value })
    }).catch(function () {
      order[field] = !value;
      render();
      toast('Could not save that change. Check your connection.');
    });
  }

  // ---------- Filtering ----------
  function inDateFilter(order) {
    var f = state.dateFilter;
    if (f === 'all') return true;
    if (f === 'upcoming') return order.pickupDate >= today() || !order.pickedUp;
    return order.pickupDate === f;
  }

  function inStatusFilter(order) {
    var f = state.statusFilter;
    if (f === 'waiting') return !order.pickedUp;
    if (f === 'unpaid') return !order.paid;
    if (f === 'done') return order.pickedUp;
    return true;
  }

  function matchesSearch(order) {
    var q = state.search.trim().toLowerCase();
    if (!q) return true;
    return [order.orderId, order.name, order.email, order.phone, order.notes]
      .join(' ').toLowerCase().indexOf(q) !== -1;
  }

  // ---------- Rendering ----------
  function render() {
    var scoped = state.orders.filter(inDateFilter);
    renderDateChips();
    renderKpis(scoped);
    renderBakeList(scoped);
    renderRing(scoped);
    renderStatusChips();
    renderOrders(scoped.filter(inStatusFilter).filter(matchesSearch));
    renderVotes();
  }

  function renderDateChips() {
    var dates = {};
    state.orders.forEach(function (o) { if (o.pickupDate) dates[o.pickupDate] = true; });
    var t = today();
    var options = [['upcoming', 'Upcoming'], ['all', 'All Time']].concat(
      Object.keys(dates).sort().filter(function (d) { return d >= t; }).map(function (d) {
        return [d, d === t ? 'Today' : prettyDate(d)];
      })
    );
    chipRow('#date-chips', options, state.dateFilter, function (v) { state.dateFilter = v; render(); });
  }

  function renderStatusChips() {
    chipRow('#status-chips', [
      ['all', 'All'], ['waiting', 'Waiting'], ['unpaid', 'Unpaid'], ['done', 'Picked Up']
    ], state.statusFilter, function (v) { state.statusFilter = v; render(); });
  }

  function chipRow(sel, options, active, onPick) {
    var box = $(sel);
    box.innerHTML = '';
    options.forEach(function (opt) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip' + (opt[0] === active ? ' active' : '');
      b.textContent = opt[1];
      b.addEventListener('click', function () { onPick(opt[0]); });
      box.appendChild(b);
    });
  }

  function renderKpis(orders) {
    var loaves = 0, revenue = 0, paidRevenue = 0, done = 0, paid = 0;
    orders.forEach(function (o) {
      MENU_IDS.forEach(function (id) { loaves += o.items[id] || 0; });
      revenue += o.total;
      if (o.paid) { paid++; paidRevenue += o.total; }
      if (o.pickedUp) done++;
    });
    var tiles = [
      ['Orders', orders.length, done + ' picked up'],
      ['Loaves', loaves, 'to bake in this view'],
      ['Sales', money(revenue), money(paidRevenue) + ' collected'],
      ['Paid', orders.length ? Math.round(paid / orders.length * 100) + '%' : '—', paid + ' of ' + orders.length + ' orders']
    ];
    $('#kpis').innerHTML = tiles.map(function (t) {
      return '<div class="kpi"><div class="label">' + t[0] + '</div><div class="value">' + t[1] +
        '</div><div class="sub">' + t[2] + '</div></div>';
    }).join('');
  }

  function renderBakeList(orders) {
    var html = MENU_IDS.map(function (id) {
      var need = 0, handedOut = 0;
      orders.forEach(function (o) {
        var n = o.items[id] || 0;
        need += n;
        if (o.pickedUp) handedOut += n;
      });
      var pct = need ? Math.round(handedOut / need * 100) : 0;
      var icons = need > 24 ? MENU[id].emoji + ' × ' + need : new Array(need + 1).join(MENU[id].emoji);
      return '<div class="bake-item">' +
        '<div class="bake-head"><span class="bake-name">' + escapeHtml(MENU[id].name) + '</span>' +
        '<span class="bake-count">' + need + ' <small>loaves</small></span></div>' +
        '<div class="loaf-row" aria-hidden="true">' + (icons || '<span class="hint">None ordered</span>') + '</div>' +
        '<div class="bar"><span style="width:' + pct + '%"></span></div>' +
        '<div class="bar-label">' + handedOut + ' of ' + need + ' picked up</div>' +
        '</div>';
    }).join('');
    $('#bake-list').innerHTML = html;
  }

  function renderRing(orders) {
    var done = orders.filter(function (o) { return o.pickedUp; }).length;
    var pct = orders.length ? Math.round(done / orders.length * 100) : 0;
    var circumference = 2 * Math.PI * 80;
    $('#ring-fill').setAttribute('stroke-dashoffset', circumference * (1 - pct / 100));
    $('#ring-pct').textContent = pct + '%';
    var note;
    if (!orders.length) note = '<p class="hint">No orders in this view yet.</p>';
    else if (pct === 100) note = '<div class="pow">POW! ALL DELIVERED!</div>';
    else note = '<p class="hint">' + done + ' of ' + orders.length + ' orders picked up. ' +
      (orders.length - done) + ' to go!</p>';
    $('#ring-note').innerHTML = note;
  }

  function renderOrders(orders) {
    var box = $('#orders');
    box.innerHTML = '';
    if (!orders.length) {
      box.innerHTML = '<p class="empty">No orders match. The city is quiet... for now.</p>';
      return;
    }
    orders.slice().sort(function (a, b) {
      if (a.pickedUp !== b.pickedUp) return a.pickedUp ? 1 : -1;
      return (a.pickupDate || '').localeCompare(b.pickupDate || '');
    }).forEach(function (o) {
      var card = document.createElement('div');
      card.className = 'order' + (o.pickedUp ? ' done' : '');
      var items = MENU_IDS.filter(function (id) { return o.items[id]; }).map(function (id) {
        return '<li>' + MENU[id].emoji + ' ' + o.items[id] + ' × ' + escapeHtml(MENU[id].name) + '</li>';
      }).join('');
      card.innerHTML =
        '<div class="total">' + money(o.total) + '</div>' +
        '<div class="oid">' + escapeHtml(o.orderId) + '</div>' +
        '<div class="who">' + escapeHtml(o.name) + '</div>' +
        '<div class="meta">Pickup ' + escapeHtml(prettyDate(o.pickupDate)) + ' · ' +
          escapeHtml(o.email) + (o.phone ? ' · ' + escapeHtml(o.phone) : '') + '</div>' +
        '<ul>' + items + '</ul>' +
        (o.notes ? '<div class="note">“' + escapeHtml(o.notes) + '”</div>' : '') +
        (o.pickedUp ? '<div class="stamp">DELIVERED!</div>' : '') +
        '<div class="toggles">' +
          '<button type="button" class="toggle' + (o.paid ? ' on' : '') + '" data-field="paid">' +
            (o.paid ? '✔ Paid' : '$ Mark Paid') + '</button>' +
          '<button type="button" class="toggle' + (o.pickedUp ? ' on' : '') + '" data-field="pickedUp">' +
            (o.pickedUp ? '✔ Picked Up' : '🛍 Mark Picked Up') + '</button>' +
        '</div>';
      card.querySelectorAll('[data-field]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var field = btn.dataset.field;
          o[field] = !o[field];
          sendUpdate(o, field, o[field]);
          render();
          if (field === 'pickedUp' && o.pickedUp) toast('Mission complete for ' + o.name + '! 💥');
        });
      });
      box.appendChild(card);
    });
  }

  function renderVotes() {
    var names = Object.keys(state.votes);
    if (!names.length) {
      $('#votes').innerHTML = '<p class="empty">No revival votes yet.</p>';
      return;
    }
    var max = Math.max.apply(null, [1].concat(names.map(function (n) { return state.votes[n]; })));
    $('#votes').innerHTML = names.sort(function (a, b) { return state.votes[b] - state.votes[a]; }).map(function (n) {
      return '<div class="vote-row"><span class="name">' + escapeHtml(n) + '</span>' +
        '<div class="bar"><span style="width:' + Math.round(state.votes[n] / max * 100) + '%"></span></div>' +
        '<span class="n">' + state.votes[n] + '</span></div>';
    }).join('');
  }

  // ---------- Demo data ----------
  function loadDemo() {
    var names = ['Maya R.', 'Coach Davis', 'Leo P.', 'Ms. Kim', 'Jordan T.', 'Priya S.', 'Sam W.', 'Ava L.', 'Mr. Ortiz', 'Eli B.'];
    var d = new Date();
    var days = [0, 0, 0, 1, 1, 2];
    state.orders = names.map(function (name, i) {
      var day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + days[i % days.length]);
      var items = { classic: (i % 3) + 1, jalapeno: i % 2, pumpkin: i % 4 === 0 ? 2 : 0 };
      var total = MENU_IDS.reduce(function (sum, id) { return sum + (items[id] || 0) * MENU[id].price; }, 0);
      return {
        orderId: 'SQ-DEMO' + i,
        name: name,
        email: name.toLowerCase().replace(/[^a-z]/g, '') + '@example.com',
        phone: '',
        pickupDate: isoDate(day),
        total: total,
        paid: i % 3 !== 2,
        pickedUp: days[i % days.length] === 0 && i < 3,
        notes: i === 1 ? 'Extra crispy please!' : '',
        items: items
      };
    });
    state.votes = { 'The Garlic Goblin': 14 };
  }

  // ---------- Session ----------
  function enter(key, demo) {
    state.key = key;
    state.demo = demo;
    $('#login-error').textContent = '';
    if (demo) loadDemo();
    fetchOrders().then(function () {
      if (!demo) storage('set', key);
      $('#login').hidden = true;
      $('#dash').hidden = false;
      $('#header-tools').hidden = false;
      $('#refresh-btn').hidden = demo;
      $('#demo-banner').hidden = !demo;
      render();
      clearInterval(refreshTimer);
      if (!demo) refreshTimer = setInterval(refresh, REFRESH_MS);
    }).catch(function (err) {
      storage('clear');
      $('#login-error').textContent = err.message;
    });
  }

  function refresh() {
    fetchOrders().then(render).catch(function (err) { toast(err.message); });
  }

  function lock() {
    storage('clear');
    clearInterval(refreshTimer);
    state.orders = [];
    state.votes = {};
    $('#key-input').value = '';
    $('#dash').hidden = true;
    $('#header-tools').hidden = true;
    $('#demo-banner').hidden = true;
    $('#login').hidden = false;
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('#login-btn').addEventListener('click', function () {
      var key = $('#key-input').value.trim();
      if (key) enter(key, false);
    });
    $('#key-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') $('#login-btn').click();
    });
    $('#demo-btn').addEventListener('click', function () { enter('', true); });
    $('#refresh-btn').addEventListener('click', function () { refresh(); toast('Refreshed!'); });
    $('#logout-btn').addEventListener('click', lock);
    $('#search').addEventListener('input', function (e) { state.search = e.target.value; render(); });

    var saved = storage('get');
    if (saved) enter(saved, false);
  });
})();
