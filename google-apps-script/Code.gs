/**
 * Sourdough Squad order log + owner dashboard API.
 *
 * Paste this into a Google Apps Script project attached to your Google Sheet
 * (Extensions > Apps Script), then deploy it as a Web app. See README.md.
 *
 * - The website POSTs orders and revival votes here; they land on the
 *   "Orders" and "Votes" tabs (created automatically).
 * - GET ?action=votes returns public vote counts for the storefront.
 * - The owner dashboard (dashboard.html) reads orders and marks them
 *   paid / picked up. Those calls need DASHBOARD_KEY, which you set in
 *   Project Settings > Script Properties, so customers can't read the list.
 */

// Must match MENU in js/config.js. Totals are recalculated here so a
// tampered request can't log a fake price.
var PRICES = {
  classic:  { name: 'Classic Sourdough',          price: 8.00 },
  jalapeno: { name: 'Jalapeño Cheddar',            price: 12.00 },
  pumpkin:  { name: 'The Pumpkin King (Limited)', price: 12.00 }
};
var MENU_IDS = Object.keys(PRICES);

// Retired loaves people can vote to bring back. Must match RETIRED in js/config.js.
var RETIRED = ['The Garlic Goblin'];

var ORDER_HEADERS = [
  'Timestamp', 'Order ID', 'Name', 'Email', 'Phone', 'Pickup Date',
  'Items', 'Loaf Count', 'Total ($)', 'Payment Method', 'Paid?', 'Picked Up?', 'Notes'
].concat(MENU_IDS.map(function (id) { return 'qty_' + id; }));
var VOTE_HEADERS = ['Timestamp', 'Flavor'];

var COL = {};
ORDER_HEADERS.forEach(function (h, i) { COL[h] = i; });

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.type === 'order') {
      logOrder_(data);
    } else if (data.type === 'vote') {
      logVote_(data);
    } else if (data.type === 'update') {
      requireKey_(data.key);
      updateOrder_(data);
    } else {
      return json_({ ok: false, error: 'unknown type' });
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

// GET ?action=votes returns vote counts (public).
// GET ?key=... returns all orders and vote counts for the dashboard.
function doGet(e) {
  if (e.parameter.action === 'votes') {
    return json_({ ok: true, votes: tallyVotes_() });
  }
  try {
    requireKey_(e.parameter.key);
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
  var rows = sheet_('Orders', ORDER_HEADERS).getDataRange().getDisplayValues().slice(1);
  var orders = rows.map(function (r) {
    var items = {};
    MENU_IDS.forEach(function (id) { items[id] = Number(r[COL['qty_' + id]]) || 0; });
    return {
      timestamp: r[COL['Timestamp']],
      orderId: r[COL['Order ID']],
      name: r[COL['Name']],
      email: r[COL['Email']],
      phone: r[COL['Phone']],
      pickupDate: r[COL['Pickup Date']],
      total: Number(r[COL['Total ($)']]) || 0,
      paymentMethod: r[COL['Payment Method']],
      paid: r[COL['Paid?']] === 'Yes',
      pickedUp: r[COL['Picked Up?']] === 'Yes',
      notes: r[COL['Notes']],
      items: items
    };
  });

  return json_({ ok: true, orders: orders, votes: tallyVotes_() });
}

function tallyVotes_() {
  var votes = {};
  RETIRED.forEach(function (name) { votes[name] = 0; });
  sheet_('Votes', VOTE_HEADERS).getDataRange().getDisplayValues().slice(1).forEach(function (r) {
    if (r[1] in votes) votes[r[1]]++;
  });
  return votes;
}

function logOrder_(data) {
  var qty = {};
  var lines = [];
  var count = 0;
  var total = 0;
  (data.items || []).forEach(function (item) {
    var menuItem = PRICES[item.id];
    var n = Math.floor(Number(item.qty));
    if (!menuItem || !(n > 0) || n > 50) return;
    qty[item.id] = (qty[item.id] || 0) + n;
    lines.push(n + ' x ' + menuItem.name);
    count += n;
    total += n * menuItem.price;
  });
  if (count === 0) throw new Error('order has no valid items');

  sheet_('Orders', ORDER_HEADERS).appendRow([
    new Date(),
    clean_(data.orderId),
    clean_(data.name),
    clean_(data.email),
    clean_(data.phone),
    // Leading apostrophe keeps the date as typed text (YYYY-MM-DD).
    "'" + clean_(data.pickupDate),
    lines.join(', '),
    count,
    total.toFixed(2),
    clean_(data.paymentMethod),
    'No',
    'No',
    clean_(data.notes)
  ].concat(MENU_IDS.map(function (id) { return qty[id] || 0; })));
}

function updateOrder_(data) {
  var field = { paid: 'Paid?', pickedUp: 'Picked Up?' }[data.field];
  if (!field) throw new Error('unknown field');
  var sheet = sheet_('Orders', ORDER_HEADERS);
  var ids = sheet.getRange(2, COL['Order ID'] + 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === data.orderId) {
      sheet.getRange(i + 2, COL[field] + 1).setValue(data.value ? 'Yes' : 'No');
      return;
    }
  }
  throw new Error('order not found');
}

function logVote_(data) {
  if (RETIRED.indexOf(data.flavor) === -1) throw new Error('unknown flavor');
  sheet_('Votes', VOTE_HEADERS).appendRow([new Date(), clean_(data.flavor)]);
}

function requireKey_(key) {
  var expected = PropertiesService.getScriptProperties().getProperty('DASHBOARD_KEY');
  if (!expected) throw new Error('DASHBOARD_KEY is not set in Script Properties');
  if (key !== expected) throw new Error('wrong dashboard key');
}

function sheet_(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

// Trim, cap length, and stop values starting with = + - @ from running as
// spreadsheet formulas.
function clean_(value) {
  var s = String(value == null ? '' : value).trim().slice(0, 500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
