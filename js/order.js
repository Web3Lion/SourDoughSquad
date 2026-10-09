// ==================== CART, CHECKOUT & ORDER LOG ====================
(function () {
  var config = window.SQUAD_CONFIG;
  var MENU = config.MENU;
  var CART_KEY = 'squadCart';
  var cart = loadCart();

  function loadCart() {
    try {
      var saved = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
      Object.keys(saved).forEach(function (id) {
        if (!MENU[id] || !(saved[id] > 0)) delete saved[id];
      });
      return saved;
    } catch (e) {
      return {};
    }
  }

  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {}
  }

  function money(n) { return '$' + n.toFixed(2); }

  function cartCount() {
    return Object.keys(cart).reduce(function (sum, id) { return sum + cart[id]; }, 0);
  }

  function cartTotal() {
    return Object.keys(cart).reduce(function (sum, id) { return sum + cart[id] * MENU[id].price; }, 0);
  }

  function addToCart(id) {
    cart[id] = (cart[id] || 0) + 1;
    saveCart();
    render();
    toast(MENU[id].name + ' added to your cart!');
  }

  function changeQty(id, delta) {
    cart[id] = (cart[id] || 0) + delta;
    if (cart[id] <= 0) delete cart[id];
    saveCart();
    render();
  }

  // ---------- Rendering ----------
  var $ = function (sel) { return document.querySelector(sel); };

  function render() {
    $('#cart-count').textContent = cartCount();
    var list = $('#cart-items');
    list.innerHTML = '';
    var ids = Object.keys(cart);
    if (ids.length === 0) {
      list.innerHTML = '<p class="cart-empty">Your cart is empty. Recruit some loaves!</p>';
    }
    ids.forEach(function (id) {
      var row = document.createElement('div');
      row.className = 'cart-row';
      row.innerHTML =
        '<span class="cart-name"></span>' +
        '<span class="cart-qty">' +
          '<button type="button" data-qty="-1" aria-label="Remove one">−</button>' +
          '<b>' + cart[id] + '</b>' +
          '<button type="button" data-qty="1" aria-label="Add one">+</button>' +
        '</span>' +
        '<span class="cart-line">' + money(cart[id] * MENU[id].price) + '</span>';
      row.querySelector('.cart-name').textContent = MENU[id].name;
      row.querySelectorAll('[data-qty]').forEach(function (btn) {
        btn.addEventListener('click', function () { changeQty(id, Number(btn.dataset.qty)); });
      });
      list.appendChild(row);
    });
    $('#cart-total').textContent = money(cartTotal());
    $('#checkout-submit').disabled = ids.length === 0;
  }

  function toast(message) {
    var el = $('#toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  function openCart() {
    $('#checkout-step').hidden = false;
    $('#confirm-step').hidden = true;
    $('#cart-modal').hidden = false;
  }

  function closeCart() { $('#cart-modal').hidden = true; }

  // ---------- Order log ----------
  function sendToLog(payload) {
    if (!config.ORDER_LOG_URL) {
      console.warn('ORDER_LOG_URL is not set in js/config.js; not logging:', payload);
      return Promise.resolve();
    }
    // text/plain + no-cors avoids the CORS preflight Apps Script can't answer.
    return fetch(config.ORDER_LOG_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
  }

  function makeOrderId() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var id = 'SQ-';
    for (var i = 0; i < 5; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  }

  // ---------- Payment ----------
  function paymentButtons(total) {
    var box = $('#pay-buttons');
    box.innerHTML = '';
    if (config.PAYMENT_PROVIDER === 'paypal' && config.PAYPAL_ME_USERNAME) {
      box.appendChild(payLink(
        'https://paypal.me/' + encodeURIComponent(config.PAYPAL_ME_USERNAME) + '/' + total.toFixed(2) + 'USD',
        'Pay ' + money(total) + ' with PayPal'
      ));
    } else if (config.PAYMENT_PROVIDER === 'square') {
      Object.keys(cart).forEach(function (id) {
        var url = config.SQUARE_LINKS[id];
        if (!url) return;
        var link = payLink(url, 'Pay for ' + MENU[id].name);
        box.appendChild(link);
        if (cart[id] > 1) {
          var note = document.createElement('small');
          note.textContent = 'Set quantity to ' + cart[id] + ' on the Square page.';
          box.appendChild(note);
        }
      });
    }
    if (!box.children.length) {
      box.innerHTML = '<p>Online payment isn\'t set up yet. Please pay when you pick up your bread.</p>';
    }
  }

  function payLink(href, label) {
    var a = document.createElement('a');
    a.className = 'btn-action pay-link';
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = label;
    return a;
  }

  // ---------- Checkout ----------
  function onSubmit(event) {
    event.preventDefault();
    if (cartCount() === 0) return;
    var form = event.target;
    var submit = $('#checkout-submit');
    var orderId = makeOrderId();
    var total = cartTotal();

    var payload = {
      type: 'order',
      orderId: orderId,
      name: form.elements['name'].value,
      email: form.elements['email'].value,
      phone: form.elements['phone'].value,
      pickupDate: form.elements['pickupDate'].value,
      notes: form.elements['notes'].value,
      paymentMethod: config.PAYMENT_PROVIDER,
      items: Object.keys(cart).map(function (id) { return { id: id, qty: cart[id] }; })
    };

    submit.disabled = true;
    submit.textContent = 'Sending order...';
    sendToLog(payload).then(function () {
      $('#confirm-id').textContent = orderId;
      $('#confirm-total').textContent = money(total);
      paymentButtons(total);
      $('#checkout-step').hidden = true;
      $('#confirm-step').hidden = false;
      cart = {};
      saveCart();
      render();
      form.reset();
    }).catch(function () {
      alert('Uh oh, the order didn\'t go through. Check your connection and try again.');
    }).then(function () {
      submit.textContent = 'Place Order';
      submit.disabled = cartCount() === 0;
    });
  }

  // ---------- Wire up ----------
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-add]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        addToCart(btn.dataset.add);
      });
    });

    document.querySelectorAll('[data-vote]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.disabled = true;
        sendToLog({ type: 'vote', flavor: btn.dataset.vote }).then(function () {
          toast('Vote received! The Squad will consider summoning this flavor back.');
        }, function () {
          btn.disabled = false;
          toast('Vote didn\'t send. Try again!');
        });
      });
    });

    $('#cart-button').addEventListener('click', openCart);
    $('#cart-close').addEventListener('click', closeCart);
    $('#confirm-close').addEventListener('click', closeCart);
    $('#cart-modal').addEventListener('click', function (e) {
      if (e.target.id === 'cart-modal') closeCart();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeCart();
    });
    $('#checkout-form').addEventListener('submit', onSubmit);

    // Pickup must be at least tomorrow.
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    $('#pickup-date').min = tomorrow.getFullYear() + '-' + pad(tomorrow.getMonth() + 1) + '-' + pad(tomorrow.getDate());

    render();
  });
})();
