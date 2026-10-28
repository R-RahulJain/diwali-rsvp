// RSVP web app. Bound to the Sheet that has a "Guests" tab:
// name | party_size | code | link | (timestamp | response | food are added automatically)

var GUESTS_SHEET = "Guests";
var RESPONSE_HEADERS = ["timestamp", "response", "food"];

function doGet(e) {
  var code = normCode_(e && e.parameter && e.parameter.g);
  var ctx = load_();
  if (!code) {
    var count = 0;
    ctx.rows.forEach(function (r) {
      if (String(r[ctx.col.response]).trim() === "Yes") count += toSize_(r[ctx.col.party_size]);
    });
    return json_({ count: count });
  }
  var i = findRow_(ctx, code);
  if (i < 0) return json_({ error: "invalid" });
  var r = ctx.rows[i];
  return json_({
    name: String(r[ctx.col.name]).trim(),
    party_size: toSize_(r[ctx.col.party_size]),
    response: String(r[ctx.col.response] || "").trim(),
    food: String(r[ctx.col.food] || "").trim()
  });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: "bad request" }); }
  if (body.website) return json_({ ok: true }); // honeypot: pretend success, write nothing

  var response = String(body.response || "");
  var food = String(body.food || "");
  if (response !== "Yes" && response !== "No") return json_({ ok: false, error: "bad response" });

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ctx = load_();
    var i = findRow_(ctx, normCode_(body.code));
    if (i < 0) return json_({ ok: false, error: "invalid" });
    var size = toSize_(ctx.rows[i][ctx.col.party_size]);

    if (response === "No") {
      food = "";
    } else {
      var allowed = size > 1 ? ["Veg", "Non-veg", "Mixed"] : ["Veg", "Non-veg"];
      if (allowed.indexOf(food) < 0) return json_({ ok: false, error: "bad food" });
    }
    var rowNum = i + 2; // rows[] starts after the header row
    ctx.sheet.getRange(rowNum, ctx.col.timestamp + 1, 1, 3).setValues([[new Date(), response, food]]);
    SpreadsheetApp.flush();
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// Reads the Guests tab, adding any missing response columns to the header row.
function load_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GUESTS_SHEET);
  if (!sheet) throw new Error('Missing "' + GUESTS_SHEET + '" tab');
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); });
  RESPONSE_HEADERS.forEach(function (h) {
    if (headers.indexOf(h) < 0) {
      sheet.getRange(1, headers.length + 1).setValue(h);
      headers.push(h);
    }
  });
  var col = {};
  ["name", "party_size", "code", "timestamp", "response", "food"].forEach(function (h) { col[h] = headers.indexOf(h); });
  if (col.name < 0 || col.party_size < 0 || col.code < 0) throw new Error("Guests tab needs name, party_size, code columns");
  var n = sheet.getLastRow() - 1;
  var rows = n > 0 ? sheet.getRange(2, 1, n, headers.length).getValues() : [];
  return { sheet: sheet, col: col, rows: rows };
}

function findRow_(ctx, code) {
  if (!code) return -1;
  for (var i = 0; i < ctx.rows.length; i++) {
    if (normCode_(ctx.rows[i][ctx.col.code]) === code) return i;
  }
  return -1;
}

function normCode_(c) { return String(c || "").trim().toUpperCase(); }
function toSize_(v) { var n = parseInt(v, 10); return n > 0 ? n : 1; }
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
