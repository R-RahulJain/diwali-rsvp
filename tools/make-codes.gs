// Adds an "RSVP" menu to the Sheet. Paste into the same Apps Script project as Code.gs.

// Set this to your GitHub Pages URL (no trailing slash needed).
var BASE_URL = "https://r-rahuljain.github.io/diwali-rsvp/";

var CODE_LENGTH = 6;
// No 0/O/1/I/L so codes survive being read out or retyped.
var CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function onOpen() {
  SpreadsheetApp.getUi().createMenu("RSVP").addItem("Generate links", "generateLinks").addToUi();
}

function generateLinks() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Guests");
  if (!sheet) { SpreadsheetApp.getUi().alert('No "Guests" tab found.'); return; }
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) { SpreadsheetApp.getUi().alert("Add guest names first."); return; }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var nameCol = headers.indexOf("name") + 1, codeCol = headers.indexOf("code") + 1, linkCol = headers.indexOf("link") + 1;
  if (!nameCol || !codeCol || !linkCol) { SpreadsheetApp.getUi().alert("Guests tab needs name, party_size, code, link headers."); return; }

  var n = lastRow - 1;
  var names = sheet.getRange(2, nameCol, n, 1).getValues();
  var codes = sheet.getRange(2, codeCol, n, 1).getValues();
  var used = {};
  codes.forEach(function (r) { var c = String(r[0]).trim().toUpperCase(); if (c) used[c] = true; });

  var base = BASE_URL.replace(/\/+$/, "") + "/";
  var added = 0;
  var links = codes.map(function (r, i) {
    if (!String(names[i][0]).trim()) { r[0] = ""; return [""]; }
    var c = String(r[0]).trim().toUpperCase();
    if (!c) {
      do { c = randomCode_(); } while (used[c]);
      used[c] = true;
      added++;
    }
    r[0] = c;
    return [base + "?g=" + c];
  });
  sheet.getRange(2, codeCol, n, 1).setValues(codes);
  sheet.getRange(2, linkCol, n, 1).setValues(links);
  SpreadsheetApp.getActiveSpreadsheet().toast(added + " new code(s) generated.", "RSVP");
}

function randomCode_() {
  var s = "";
  for (var i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET.charAt(Math.floor(Math.random() * CODE_ALPHABET.length));
  return s;
}
