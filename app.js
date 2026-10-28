(function () {
  var cfg = window.CONFIG;
  var ev = cfg.EVENT;
  var $ = function (id) { return document.getElementById(id); };

  // Event details
  $("ev-name").textContent = ev.name;
  $("ev-year").textContent = ev.year;
  $("ev-date").textContent = ev.dateLabel;
  $("ev-time").textContent = ev.timeLabel;
  $("ev-venue").textContent = ev.venueName;
  $("ev-area").textContent = ev.venueArea;
  $("ev-map").href = ev.mapsUrl;
  $("ev-dress").textContent = ev.dressCode;
  document.title = ev.name + " " + ev.year;

  var states = ["loading", "invalid", "error", "summary"];
  function show(name) {
    states.forEach(function (s) { $("state-" + s).hidden = s !== name; });
    $("form").hidden = name !== "form";
  }

  function api(query) {
    return fetch(cfg.APPS_SCRIPT_URL + query).then(function (r) { return r.json(); });
  }

  // Ticker
  api("").then(function (d) {
    if (typeof d.count !== "number") return;
    $("ticker-n").textContent = d.count;
    $("ticker-label").textContent = d.count === 1 ? "guest coming" : "guests coming";
    $("ticker").hidden = false;
  }).catch(function () {});

  var code = (new URLSearchParams(location.search).get("g") || "").trim();
  var guest = null;
  var PREFS = [["liquor", "Liquor"], ["soft_drinks", "Non-alcoholic"], ["snacks", "Snacks"]];
  function picked(name) {
    return Array.prototype.filter.call(form.elements[name], function (el) { return el.checked; }).map(function (el) { return el.value; });
  }
  function setPicked(name, list) {
    Array.prototype.forEach.call(form.elements[name], function (el) { el.checked = (list || []).indexOf(el.value) >= 0; });
  }
  var form = $("form");

  if (!code) { show("invalid"); return; }

  api("?g=" + encodeURIComponent(code)).then(function (d) {
    if (!d || d.error || !d.name) { show("invalid"); return; }
    guest = d;
    setupForm();
    if (d.response) showSummary(); else show("form");
  }).catch(function () { show("error"); });

  function group() { return guest.party_size > 1; }

  function setupForm() {
    $("greet").textContent = guest.name + ", are you coming?";
    $("q-coming").textContent = group() ? "Will you be joining us?" : "Are you coming?";
    $("q-food").textContent = group() ? "Food preference for your group" : "Food preference";
    $("mixed").hidden = !group();
  }

  function syncFood() {
    var yes = form.elements.response.value === "Yes";
    $("food-set").hidden = !yes;
    $("prefs").hidden = !yes;
  }
  form.addEventListener("change", syncFood);

  function showSummary() {
    var yes = guest.response === "Yes";
    $("sum-title").textContent = guest.name + (yes ? ", you're in." : ", thanks for letting us know.");
    var text = "Your RSVP: No. We'll miss you.";
    if (yes) {
      text = "Your RSVP: Yes. Food: " + guest.food + ".";
      PREFS.forEach(function (p) {
        if (guest[p[0]] && guest[p[0]].length) text += " " + p[1] + ": " + guest[p[0]].join(", ") + ".";
      });
    }
    $("sum-text").textContent = text;
    show("summary");
  }

  $("change-btn").addEventListener("click", function () {
    setChecked("response", guest.response);
    setChecked("food", guest.food);
    PREFS.forEach(function (p) { setPicked(p[0], guest[p[0]]); });
    syncFood();
    $("form-error").hidden = true;
    show("form");
  });

  function setChecked(name, value) {
    Array.prototype.forEach.call(form.elements[name], function (el) { el.checked = el.value === value; });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var err = $("form-error");
    err.hidden = true;
    var response = form.elements.response.value;
    var food = form.elements.food.value;
    if (!response) { fail("Please choose Yes or No."); return; }
    if (response === "Yes" && !food) { fail("Please choose a food preference."); return; }

    var yes = response === "Yes";
    var btn = $("submit-btn");
    btn.disabled = true;
    btn.textContent = "Sending…";

    fetch(cfg.APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        code: code,
        response: response,
        food: response === "Yes" ? food : "",
        liquor: yes ? picked("liquor") : [],
        soft_drinks: yes ? picked("soft_drinks") : [],
        snacks: yes ? picked("snacks") : [],
        website: form.elements.website.value
      })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok) throw new Error((d && d.error) || "failed");
      guest.response = response;
      guest.food = yes ? food : "";
      PREFS.forEach(function (p) { guest[p[0]] = yes ? picked(p[0]) : []; });
      showSummary();
      $("sum-title").textContent = response === "Yes" ? "See you there, " + guest.name + "." : "Noted, " + guest.name + ".";
      api("").then(function (c) {
        if (typeof c.count === "number") {
          $("ticker-n").textContent = c.count;
          $("ticker-label").textContent = c.count === 1 ? "guest coming" : "guests coming";
        }
      }).catch(function () {});
    }).catch(function () {
      fail("Couldn't send your RSVP. Check your connection and try again. Your answers are still here.");
    }).then(function () {
      btn.disabled = false;
      btn.textContent = "Send RSVP";
    });

    function fail(msg) { err.textContent = msg; err.hidden = false; }
  });
})();
