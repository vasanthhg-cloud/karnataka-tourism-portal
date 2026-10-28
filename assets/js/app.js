/* Smart Local Tourism Business Portal – Karnataka
   Static website engine: theming, translation, search, rendering, demo booking flow.
   All data comes from assets/js/data.js; all bookings are stored in localStorage and
   are demonstration records only. No payment gateway, no server, no real money. */
(function () {
  "use strict";

  var DATA = window.KT_DATA || { destinations: [], homestays: [], guides: [], experiences: [], districts: [] };
  var I18N = window.KT_I18N || { en: {} };
  var CONTENT = window.KT_CONTENT || {};

  var STORE_BOOKINGS = "kt-bookings";
  var STORE_THEME = "kt-theme";
  var STORE_LANG = "kt-lang";
  var PER_PAGE = 12;

  /* ---------------------------------------------------------------- utilities */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function money(n) { return "₹" + Number(n || 0).toLocaleString("en-IN"); }
  function param(name, fallback) {
    var v = new URLSearchParams(location.search).get(name);
    return v === null || v === "" ? (fallback || "") : v;
  }
  function t(key, fallback) {
    var pack = I18N[state.lang] || I18N.en || {};
    if (pack[key] != null) return pack[key];
    if (I18N.en && I18N.en[key] != null) return I18N.en[key];
    return fallback != null ? fallback : key;
  }
  function stars(n) {
    var r = Math.round(Number(n) || 0);
    return "★★★★★".slice(0, r) + "☆☆☆☆☆".slice(0, 5 - r);
  }
  function districtName(id) {
    var d = DATA.districts.filter(function (x) { return x.id === Number(id); })[0];
    return d ? d.name : "";
  }
  function byId(list, id) {
    return list.filter(function (x) { return x.id === Number(id); })[0];
  }
  function photo(item, i) {
    return (item.photos && item.photos[Math.min(i || 0, item.photos.length - 1)]) || null;
  }
  function imgTag(item, i, cls, lazy) {
    var p = photo(item, i);
    if (!p) return '<div class="' + (cls || "") + '" style="background:var(--surface-2)"></div>';
    return '<img class="' + (cls || "") + '" src="' + esc(p.url) + '" alt="' + esc(item.name) +
      '" ' + (lazy === false ? "" : 'loading="lazy" ') + 'referrerpolicy="no-referrer">';
  }

  /* ------------------------------------------------------------- theme + lang */
  var state = {
    lang: localStorage.getItem(STORE_LANG) || "en",
    theme: localStorage.getItem(STORE_THEME) ||
      (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  };
  if (!I18N[state.lang]) state.lang = "en";

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", state.theme);
    var btn = $("#theme-toggle");
    if (btn) {
      btn.textContent = state.theme === "dark" ? "☀" : "☾";
      btn.setAttribute("aria-label", state.theme === "dark" ? t("common.light_mode") : t("common.dark_mode"));
      btn.title = btn.getAttribute("aria-label");
    }
    document.dispatchEvent(new CustomEvent("themechange", { detail: state.theme }));
  }

  function applyI18n() {
    document.documentElement.setAttribute("lang", state.lang);
    $$("[data-i18n]").forEach(function (n) { n.textContent = t(n.getAttribute("data-i18n")); });
    $$("[data-i18n-html]").forEach(function (n) { n.innerHTML = t(n.getAttribute("data-i18n-html")); });
    $$("[data-i18n-ph]").forEach(function (n) { n.setAttribute("placeholder", t(n.getAttribute("data-i18n-ph"))); });
    $$("[data-i18n-aria]").forEach(function (n) { n.setAttribute("aria-label", t(n.getAttribute("data-i18n-aria"))); });
    var sel = $("#lang-select");
    if (sel) sel.value = state.lang;
  }

  function setLang(code) {
    state.lang = I18N[code] ? code : "en";
    localStorage.setItem(STORE_LANG, state.lang);
    applyI18n();
    applyTheme();
    render();
  }

  /* ---------------------------------------------------------------- bookings */
  function allBookings() {
    try { return JSON.parse(localStorage.getItem(STORE_BOOKINGS) || "[]"); }
    catch (e) { return []; }
  }
  function saveBookings(list) { localStorage.setItem(STORE_BOOKINGS, JSON.stringify(list)); }
  function bookingByRef(ref) {
    return allBookings().filter(function (b) { return b.ref === ref; })[0];
  }
  function newRef() {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", s = "";
    for (var i = 0; i < 8; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    return "KT-" + s;
  }
  function newTxn() {
    var s = "DEMOTXN";
    for (var i = 0; i < 10; i++) s += Math.floor(Math.random() * 10);
    return s;
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function addDays(iso, n) {
    var d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
  }
  var SERVICE_FEE = 25;

  /* ------------------------------------------------------------------ cards */
  function destCard(d) {
    var p = photo(d);
    return '<article class="card">' +
      '<a class="thumb" href="destination.html?id=' + d.id + '">' +
        (p ? '<img src="' + esc(p.url) + '" alt="' + esc(d.name) + '" loading="lazy" referrerpolicy="no-referrer">' : "") +
        '<span class="badge-float pill brand">' + esc(d.category) + "</span>" +
        (d.bookable ? '<span class="badge-float right pill price">' + money(d.demo_price) + "</span>" : "") +
      "</a>" +
      '<div class="body"><h3><a href="destination.html?id=' + d.id + '">' + esc(d.name) + "</a></h3>" +
      '<div class="meta"><span>' + esc(d.district) + "</span></div>" +
      '<p class="desc">' + esc(d.description) + "</p>" +
      '<div class="foot"><span class="small muted">' + esc(d.season || "") + "</span>" +
      '<a class="btn sm" href="destination.html?id=' + d.id + '">' + t("common.view_details") + "</a></div>" +
      "</div></article>";
  }

  function homestayCard(h) {
    var p = photo(h);
    return '<article class="card">' +
      '<a class="thumb" href="homestay.html?id=' + h.id + '">' +
        (p ? '<img src="' + esc(p.url) + '" alt="' + esc(h.name) + '" loading="lazy" referrerpolicy="no-referrer">' : "") +
        '<span class="badge-float pill demo">' + t("common.demo_listing") + "</span>" +
        '<span class="badge-float right pill price">' + money(h.price) + " " + t("common.per_night") + "</span>" +
      "</a>" +
      '<div class="body"><h3><a href="homestay.html?id=' + h.id + '">' + esc(h.name) + "</a></h3>" +
      '<div class="meta"><span>' + esc(h.district) + "</span><span>·</span><span>★ " +
        Number(h.rating || 0).toFixed(1) + " (" + h.reviews + ")</span></div>" +
      '<p class="desc">' + esc(h.description) + "</p>" +
      '<div class="foot"><span class="small muted">' + t("common.guests") + " ≤ " + h.max_guests + "</span>" +
      '<a class="btn sm" href="homestay.html?id=' + h.id + '">' + t("common.view_details") + "</a></div>" +
      "</div></article>";
  }

  /* ------------------------------------------------------------------- home */
  function renderHome() {
    var featured = DATA.destinations.filter(function (d) { return d.bookable; }).slice(0, 8);
    var popular = DATA.homestays.slice().sort(function (a, b) { return b.rating - a.rating; }).slice(0, 4);
    var recent = DATA.destinations.slice(-4).reverse();
    var exps = DATA.experiences.slice(0, 4);

    var hero = featured[0] || DATA.destinations[0];
    var heroImg = $("#hero-img");
    if (heroImg && photo(hero)) { heroImg.src = photo(hero).url; }

    setHTML("#featured", featured.map(destCard).join(""));
    setHTML("#popular", popular.map(homestayCard).join(""));
    setHTML("#recent", recent.map(destCard).join(""));
    setHTML("#experiences", exps.map(function (e) {
      return '<article class="card"><div class="body">' +
        '<span class="pill brand">' + esc(e.district) + "</span>" +
        "<h3>" + esc(e.name) + "</h3>" +
        '<p class="desc">' + esc(e.description) + "</p>" +
        '<div class="foot"><span class="pill price">' + money(e.price) + " " + t("common.per_person") +
        '</span><span class="small muted">' + esc(e.duration) + "</span></div></div></article>";
    }).join(""));

    setHTML("#district-grid", DATA.districts.map(function (d) {
      var n = DATA.destinations.filter(function (x) { return x.districtId === d.id; }).length;
      return '<a href="destinations.html?district=' + d.id + '">' + esc(d.name) +
        "<span>" + n + "</span></a>";
    }).join(""));

    setText("#stat-destinations", DATA.destinations.length);
    setText("#stat-districts", DATA.districts.length);
    setText("#stat-homestays", DATA.homestays.length);
    setText("#stat-experiences", DATA.experiences.length);
  }

  function setHTML(sel, html) { var n = $(sel); if (n) n.innerHTML = html; }
  function setText(sel, txt) { var n = $(sel); if (n) n.textContent = txt; }

  /* ----------------------------------------------------------- destinations */
  function filterDestinations(q) {
    var list = DATA.destinations.slice();
    var query = (q.q || "").toLowerCase().trim();
    if (query) {
      list = list.filter(function (d) {
        return (d.name + " " + d.district + " " + d.category + " " + d.description).toLowerCase().indexOf(query) >= 0;
      });
    }
    if (q.district) list = list.filter(function (d) { return d.districtId === Number(q.district); });
    if (q.category) list = list.filter(function (d) { return d.category === q.category; });
    if (q.max_price) {
      list = list.filter(function (d) { return !d.bookable || d.demo_price <= Number(q.max_price); });
    }
    if (q.sort === "name") list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    else if (q.sort === "price_low") list.sort(function (a, b) { return (a.demo_price || 0) - (b.demo_price || 0); });
    else if (q.sort === "price_high") list.sort(function (a, b) { return (b.demo_price || 0) - (a.demo_price || 0); });
    else list.sort(function (a, b) { return (b.bookable ? 1 : 0) - (a.bookable ? 1 : 0) || a.name.localeCompare(b.name); });
    return list;
  }

  function filterHomestays(q) {
    var list = DATA.homestays.slice();
    var query = (q.q || "").toLowerCase().trim();
    if (query) {
      list = list.filter(function (h) {
        return (h.name + " " + h.district + " " + h.description + " " + h.amenities.join(" ")).toLowerCase().indexOf(query) >= 0;
      });
    }
    if (q.district) list = list.filter(function (h) { return h.districtId === Number(q.district); });
    if (q.max_price) list = list.filter(function (h) { return h.price <= Number(q.max_price); });
    if (q.guests) list = list.filter(function (h) { return h.max_guests >= Number(q.guests); });
    if (q.amenity) {
      list = list.filter(function (h) {
        return h.amenities.join(" ").toLowerCase().indexOf(q.amenity.toLowerCase()) >= 0;
      });
    }
    if (q.sort === "price_low") list.sort(function (a, b) { return a.price - b.price; });
    else if (q.sort === "price_high") list.sort(function (a, b) { return b.price - a.price; });
    else if (q.sort === "name") list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    else list.sort(function (a, b) { return b.rating - a.rating; });
    return list;
  }

  function fillDistrictSelect(sel, value) {
    var node = $(sel);
    if (!node) return;
    node.innerHTML = '<option value="">' + t("search.all_districts") + "</option>" +
      DATA.districts.map(function (d) {
        return '<option value="' + d.id + '"' + (String(value) === String(d.id) ? " selected" : "") + ">" +
          esc(d.name) + "</option>";
      }).join("");
  }

  function renderPager(sel, page, pages, go) {
    var node = $(sel);
    if (!node) return;
    if (pages <= 1) { node.innerHTML = ""; return; }
    var html = "";
    for (var p = 1; p <= pages; p++) {
      if (pages > 9 && Math.abs(p - page) > 2 && p !== 1 && p !== pages) {
        if (p === 2 || p === pages - 1) html += '<span>…</span>';
        continue;
      }
      html += '<button type="button" data-page="' + p + '" class="' + (p === page ? "on" : "") + '">' + p + "</button>";
    }
    node.innerHTML = html;
    $$("button[data-page]", node).forEach(function (b) {
      b.addEventListener("click", function () { go(Number(b.getAttribute("data-page"))); });
    });
  }

  function renderDestinationsPage() {
    var q = {
      q: param("q"), district: param("district"), category: param("category"),
      max_price: param("max_price"), sort: param("sort"), page: Number(param("page", "1")) || 1
    };
    var list = filterDestinations(q);
    var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    q.page = Math.min(q.page, pages);
    var slice = list.slice((q.page - 1) * PER_PAGE, q.page * PER_PAGE);

    setText("#result-count", list.length + " " + t("home.stat_destinations").toLowerCase());
    setHTML("#results", slice.length ? slice.map(destCard).join("")
      : '<div class="empty">' + t("search.no_results") + "</div>");
    renderPager("#pager", q.page, pages, function (p) { q.page = p; goDestinations(q); });

    fillDistrictSelect("#f-district", q.district);
    var cat = $("#f-category");
    if (cat) {
      cat.innerHTML = '<option value="">' + t("search.all_categories") + "</option>" +
        DATA.categories.map(function (c) {
          return '<option value="' + esc(c) + '"' + (c === q.category ? " selected" : "") + ">" + esc(c) + "</option>";
        }).join("");
    }
    var mp = $("#f-max");
    if (mp) mp.value = q.max_price;
    var sort = $("#f-sort");
    if (sort) sort.value = q.sort;
    var search = $("#f-q");
    if (search) search.value = q.q;
  }

  function goDestinations(q) {
    var p = new URLSearchParams();
    Object.keys(q).forEach(function (k) { if (q[k]) p.set(k, q[k]); });
    history.replaceState(null, "", "destinations.html" + (p.toString() ? "?" + p : ""));
    renderDestinationsPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderHomestaysPage() {
    var q = {
      q: param("q"), district: param("district"), max_price: param("max_price"),
      guests: param("guests"), amenity: param("amenity"), sort: param("sort"),
      page: Number(param("page", "1")) || 1
    };
    var list = filterHomestays(q);
    var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    q.page = Math.min(q.page, pages);
    var slice = list.slice((q.page - 1) * PER_PAGE, q.page * PER_PAGE);
    setText("#result-count", list.length);
    setHTML("#results", slice.length ? slice.map(homestayCard).join("")
      : '<div class="empty">' + t("search.no_results") + "</div>");
    renderPager("#pager", q.page, pages, function (p) { q.page = p; goHomestays(q); });
    fillDistrictSelect("#f-district", q.district);
    ["#f-q", "#f-guests", "#f-max", "#f-amenity", "#f-sort"].forEach(function (id, i) {
      var key = ["q", "guests", "max_price", "amenity", "sort"][i];
      var node = $(id);
      if (node) node.value = q[key] || "";
    });
  }

  function goHomestays(q) {
    var p = new URLSearchParams();
    Object.keys(q).forEach(function (k) { if (q[k]) p.set(k, q[k]); });
    history.replaceState(null, "", "homestays.html" + (p.toString() ? "?" + p : ""));
    renderHomestaysPage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ------------------------------------------------------- destination detail */
  function translatedDesc(item) {
    var c = CONTENT[item.id];
    if (state.lang !== "en" && c && c[state.lang]) return { text: c[state.lang], translated: true };
    return { text: item.description, translated: state.lang === "en" };
  }

  function renderDestinationDetail() {
    var d = byId(DATA.destinations, param("id", "1"));
    if (!d) { setHTML("#detail", '<div class="empty">Not found. <a href="destinations.html">' +
      t("nav.destinations") + "</a></div>"); return; }
    document.title = d.name + " · " + t("app.name");
    var desc = translatedDesc(d);
    var related = DATA.destinations.filter(function (x) {
      return x.districtId === d.districtId && x.id !== d.id;
    }).slice(0, 4);
    var stays = DATA.homestays.filter(function (h) { return h.districtId === d.districtId; })
      .sort(function (a, b) { return b.rating - a.rating; }).slice(0, 3);

    var gallery = d.photos.slice(0, 5).map(function (p, i) {
      return '<img class="' + (i === 0 ? "main" : "") + '" src="' + esc(p.url) + '" alt="' + esc(d.name) +
        '" ' + (i ? 'loading="lazy" ' : "") + 'referrerpolicy="no-referrer">';
    }).join("");

    var credits = d.photos.slice(0, 3).map(function (p) {
      return t("common.photo_credit") + ": " + esc(p.credit) + " (" + esc(p.license) + ")";
    }).join(" · ");

    var html =
      '<div class="crumb"><a href="index.html">' + t("nav.home") + '</a> › <a href="destinations.html?district=' +
        d.districtId + '">' + esc(d.district) + "</a> › " + esc(d.name) + "</div>" +
      '<div class="gallery">' + gallery + "</div>" +
      '<p class="photo-credit">' + credits + "</p>" +
      '<div class="detail-grid" style="margin-top:16px"><div>' +
        '<span class="pill brand">' + esc(d.category) + "</span>" +
        '<h1 style="font-size:2rem;margin-top:10px">' + esc(d.name) + "</h1>" +
        '<p class="muted">' + esc(d.district) + " " + t("common.district") + " · " + esc(d.headquarters) +
          " · " + esc(d.region) + " region</p>" +
        (!desc.translated ? '<div class="note" style="margin-bottom:14px">' + t("common.translation_missing") + "</div>" : "") +
        "<p>" + esc(desc.text) + "</p>" +
        '<div class="panel"><h3>' + t("common.details") + "</h3><dl class=\"dl\">" +
          "<dt>" + t("common.opening_hours") + "</dt><dd>" + esc(d.hours || "—") + "</dd>" +
          "<dt>" + t("common.entry_fee") + "</dt><dd>" + esc(d.fee_note || "—") + "</dd>" +
          "<dt>" + t("common.best_season") + "</dt><dd>" + esc(d.season || "—") + "</dd>" +
          "<dt>" + t("common.facilities") + "</dt><dd>" + esc(d.facilities || "—") + "</dd>" +
          "<dt>" + t("common.accessibility") + "</dt><dd>" + esc(d.accessibility || "—") + "</dd>" +
          "<dt>" + t("common.coordinates") + "</dt><dd>" + Number(d.lat).toFixed(4) + ", " +
            Number(d.lon).toFixed(4) + ' <span class="small muted">(' +
            (d.coord_source === "openstreetmap" ? t("common.verified_coords") : t("common.est_coords")) +
            ")</span></dd></dl>" +
          '<div class="row" style="margin-top:14px">' +
            '<a class="btn ghost sm" target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=' +
              d.lat + "&mlon=" + d.lon + "#map=14/" + d.lat + "/" + d.lon + '">' + t("common.directions") + "</a>" +
            '<a class="btn ghost sm" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' +
              d.lat + "," + d.lon + '">Google Maps</a></div>' +
          (d.source && d.source !== "curated"
            ? '<p class="small" style="margin:12px 0 0">' + t("common.source") + ": " +
              (d.article ? '<a href="' + esc(d.article) + '" target="_blank" rel="noopener" style="color:var(--brand)">' +
                (d.source === "wikipedia" ? "Wikipedia" : "Wikidata") + "</a>" : (d.source === "wikipedia" ? "Wikipedia" : "Wikidata")) +
              (d.district_source === "nearest" ? " · " + t("common.district_est") : "") + "</p>"
            : "") +
          '<p class="small muted" style="margin:12px 0 0">' + t("common.data_note") + "</p></div>" +
        (related.length ? '<section class="block"><h2>' + t("common.related") + '</h2><div class="grid tight">' +
          related.map(function (r) {
            return '<article class="card"><div class="body"><h3><a href="destination.html?id=' + r.id + '">' +
              esc(r.name) + "</a></h3><div class=\"meta\">" + esc(r.category) + "</div></div></article>";
          }).join("") + "</div></section>" : "") +
      "</div><aside>" +
        '<div class="panel sticky">' +
          (d.bookable
            ? "<h3>" + t("booking.title") + '</h3><p class="pill price" style="margin-bottom:10px">' +
              money(d.demo_price) + " " + t("common.per_person") + '</p><p class="small muted">' +
              t("pay.banner") + '</p><a class="btn block" href="destination.html?id=' + d.id +
              '#book">' + t("common.book_now") + "</a>"
            : "<h3>" + t("common.free") + '</h3><p class="small muted">' + t("common.no_ticket") + "</p>") +
          '<hr style="border:none;border-top:1px solid var(--line);margin:16px 0">' +
          "<h4>" + t("nav.homestays") + "</h4>" +
          (stays.length ? stays.map(function (h) {
            return '<p class="small" style="margin:0 0 8px"><a href="homestay.html?id=' + h.id +
              '" style="color:var(--brand)">' + esc(h.name) + '</a><br><span class="muted">' +
              money(h.price) + " " + t("common.per_night") + " · ★ " + Number(h.rating).toFixed(1) + "</span></p>";
          }).join("") : '<p class="small muted">—</p>') +
        "</div></aside></div>";

    if (d.bookable) html += bookingPanelHTML("destination", d);
    setHTML("#detail", html);
    if (d.bookable) wireBookingForm("destination", d);
    mountGate();
  }

  /* ---------------------------------------------------------- homestay detail */
  function renderHomestayDetail() {
    var h = byId(DATA.homestays, param("id", "1"));
    if (!h) { setHTML("#detail", '<div class="empty">Not found. <a href="homestays.html">' +
      t("nav.homestays") + "</a></div>"); return; }
    document.title = h.name + " · " + t("app.name");
    var desc = translatedDesc(h);
    var nearby = DATA.destinations.filter(function (x) { return x.districtId === h.districtId; }).slice(0, 4);
    var gallery = h.photos.slice(0, 5).map(function (p, i) {
      return '<img class="' + (i === 0 ? "main" : "") + '" src="' + esc(p.url) + '" alt="' + esc(h.name) +
        '" ' + (i ? 'loading="lazy" ' : "") + 'referrerpolicy="no-referrer">';
    }).join("");

    var html =
      '<div class="crumb"><a href="index.html">' + t("nav.home") + '</a> › <a href="homestays.html?district=' +
        h.districtId + '">' + t("nav.homestays") + "</a> › " + esc(h.name) + "</div>" +
      '<div class="gallery">' + gallery + "</div>" +
      '<p class="photo-credit">' + t("common.photo_credit") + ": " + esc(h.photos[0].credit) + " (" +
        esc(h.photos[0].license) + ")</p>" +
      '<div class="detail-grid" style="margin-top:16px"><div>' +
        '<span class="pill demo">' + t("common.demo_listing") + "</span>" +
        '<h1 style="font-size:2rem;margin-top:10px">' + esc(h.name) + "</h1>" +
        '<p class="muted">' + esc(h.address) + "</p>" +
        '<p class="rating">★ ' + Number(h.rating).toFixed(1) + ' <span class="muted small">(' + h.reviews +
          " " + t("common.reviews") + ")</span></p>" +
        (!desc.translated ? '<div class="note" style="margin-bottom:14px">' + t("common.translation_missing") + "</div>" : "") +
        "<p>" + esc(desc.text) + "</p>" +
        '<p class="small muted">' + t("common.nearby") + ": " + esc(h.nearby) + "</p>" +
        '<div class="panel"><h3>' + t("common.amenities") + '</h3><div class="chips">' +
          h.amenities.map(function (a) { return '<span class="chip">' + esc(a) + "</span>"; }).join("") + "</div>" +
          '<dl class="dl" style="margin-top:16px">' +
          "<dt>" + t("common.rooms") + "</dt><dd>" + h.room_types.map(esc).join(" · ") + "</dd>" +
          "<dt>" + t("common.checkin") + " / " + t("common.checkout") + "</dt><dd>" + esc(h.checkin) + " / " +
            esc(h.checkout) + "</dd>" +
          "<dt>" + t("common.guests") + "</dt><dd>" + h.max_guests + "</dd>" +
          "<dt>" + t("common.house_rules") + "</dt><dd>" + esc(h.house_rules) + "</dd>" +
          "<dt>" + t("common.cancellation") + "</dt><dd>" + esc(h.cancellation) + "</dd>" +
          "<dt>" + t("common.host") + "</dt><dd>" + esc(h.host_name) + " · " + esc(h.host_phone) + "</dd>" +
          "<dt>" + t("common.coordinates") + "</dt><dd>" + Number(h.lat).toFixed(4) + ", " +
            Number(h.lon).toFixed(4) + "</dd></dl>" +
          '<p class="small muted" style="margin:12px 0 0">' + t("common.demo_note") + "</p></div>" +
        (nearby.length ? '<section class="block"><h2>' + t("common.nearby") + '</h2><div class="grid tight">' +
          nearby.map(function (x) {
            return '<article class="card"><div class="body"><h3><a href="destination.html?id=' + x.id + '">' +
              esc(x.name) + "</a></h3><div class=\"meta\">" + esc(x.category) + "</div></div></article>";
          }).join("") + "</div></section>" : "") +
      "</div><aside><div class=\"panel sticky\"><h3>" + money(h.price) +
        ' <span class="small muted">' + t("common.per_night") + "</span></h3>" +
        '<p class="small muted">' + t("common.guests") + " ≤ " + h.max_guests + "</p>" +
        '<a class="btn block" href="homestay.html?id=' + h.id + '#book">' + t("common.book_now") + "</a>" +
        '<p class="small muted" style="margin-top:10px">' + t("pay.banner") + "</p></div></aside></div>";

    html += bookingPanelHTML("homestay", h);
    setHTML("#detail", html);
    wireBookingForm("homestay", h);
    mountGate();
  }

  function mountGate() {
    var host = document.getElementById("book-gate");
    if (host && window.KT_AUTH) {
      KT_AUTH.widget(host, { onVerified: function () { KT_AUTH.updateHeader(); render(); } });
    }
  }

  /* ----------------------------------------------------------------- account */
  function renderAccount() {
    var host = $("#account");
    if (!host) return;
    if (window.KT_AUTH && KT_AUTH.isVerified()) {
      var mobile = KT_AUTH.currentMobile();
      var nm = KT_AUTH.currentName();
      host.innerHTML = '<div class="panel"><h3>' + t("auth.account") + "</h3>" +
        '<dl class="dl">' +
        (nm ? '<dt>' + t("auth.name") + "</dt><dd>" + esc(nm) + "</dd>" : "") +
        '<dt>' + t("auth.mobile") + "</dt><dd>+91 " + esc(mobile) + "</dd>" +
        '<dt>' + t("common.status") + '</dt><dd class="status confirmed">' + t("auth.verified") + "</dd>" +
        '<dt>' + t("nav.bookings") + "</dt><dd>" + allBookings().length + "</dd></dl>" +
        '<div class="row" style="margin-top:16px">' +
        '<a class="btn" href="bookings.html">' + t("nav.bookings") + "</a>" +
        '<a class="btn ghost" href="destinations.html">' + t("nav.destinations") + "</a>" +
        '<button class="btn ghost" type="button" id="acct-signout">' + t("auth.signout") + "</button></div></div>";
      $("#acct-signout").addEventListener("click", function () {
        KT_AUTH.logout(); renderAccount(); KT_AUTH.updateHeader();
      });
    } else {
      host.innerHTML = '<div class="panel" id="acct-widget"></div>';
      KT_AUTH.widget($("#acct-widget"), {
        onVerified: function () { renderAccount(); KT_AUTH.updateHeader(); }
      });
    }
  }

  /* ---------------------------------------------------------------- booking */
  function bookingPanelHTML(kind, item) {
    // Booking needs a verified mobile; browsing stays open to everyone.
    if (window.KT_AUTH && !KT_AUTH.isVerified()) {
      return '<section class="block" id="book"><h2>' + t("booking.title") + "</h2>" +
        '<div class="demo-banner">' + t("pay.banner") + "</div>" +
        '<div class="panel"><div class="note" style="margin-bottom:14px">' + t("auth.gate_note") + "</div>" +
        '<div id="book-gate"></div></div></section>';
    }
    var today = todayISO();
    var rooms = kind === "homestay"
      ? '<div class="field"><label>' + t("common.rooms") + '</label><select name="room_type">' +
        item.room_types.map(function (r) { return "<option>" + esc(r) + "</option>"; }).join("") + "</select></div>"
      : "";
    var dates = kind === "homestay"
      ? '<div class="two-col"><div class="field"><label>' + t("common.checkin") +
        '</label><input type="date" name="checkin" min="' + today + '" value="' + today + '" required></div>' +
        '<div class="field"><label>' + t("common.checkout") +
        '</label><input type="date" name="checkout" min="' + today + '" value="' + addDays(today, 2) +
        '" required></div></div>' +
        '<div class="two-col"><div class="field"><label>' + t("common.guests") +
        '</label><input type="number" name="guests" min="1" max="' + item.max_guests + '" value="2"></div>' +
        rooms + "</div>"
      : '<div class="two-col"><div class="field"><label>' + t("booking.visit_date") +
        '</label><input type="date" name="visit_date" min="' + today + '" value="' + addDays(today, 7) +
        '" required></div><div class="field"><label>' + t("booking.qty") +
        '</label><input type="number" name="qty" min="1" max="20" value="2" required></div></div>';

    return '<section class="block" id="book"><h2>' + t("booking.title") + '</h2>' +
      '<div class="demo-banner">' + t("pay.banner") + "</div>" +
      '<div class="detail-grid"><form class="panel" id="book-form" novalidate>' +
        dates +
        '<div class="two-col"><div class="field"><label>' + t("booking.name") +
          '</label><input name="name" required></div>' +
          '<div class="field"><label>' + t("booking.phone") + '</label><input name="phone"></div></div>' +
        '<div class="field"><label>' + t("booking.email") + '</label><input type="email" name="email" required></div>' +
        '<div class="flash error hide" id="book-error"></div>' +
        '<button class="btn block" type="submit">' + t("booking.continue") + "</button></form>" +
        '<aside class="panel"><h3>' + t("booking.breakdown") + '</h3><dl class="dl" id="book-summary"></dl>' +
        '<p class="small muted" style="margin-top:12px">' + t("common.data_note") + "</p></aside></div></section>";
  }

  function wireBookingForm(kind, item) {
    var form = $("#book-form");
    if (!form) return;
    var summary = $("#book-summary");
    function calc() {
      var total = 0, rows = "";
      if (kind === "destination") {
        var qty = Math.max(1, Number(form.qty.value) || 1);
        total = qty * item.demo_price + SERVICE_FEE;
        rows = "<dt>" + t("booking.ticket_adult") + "</dt><dd>" + money(item.demo_price) + " × " + qty + "</dd>";
      } else {
        var ci = form.checkin.value, co = form.checkout.value;
        var nights = ci && co ? Math.round((new Date(co) - new Date(ci)) / 86400000) : 0;
        if (!(nights > 0)) nights = 0;
        total = nights * item.price + SERVICE_FEE;
        rows = "<dt>" + t("booking.night_stay") + "</dt><dd>" + money(item.price) + " × " + nights + "</dd>";
      }
      summary.innerHTML = rows + "<dt>" + t("booking.fee") + "</dt><dd>" + money(SERVICE_FEE) + "</dd>" +
        "<dt>" + t("common.total") + "</dt><dd><strong>" + money(total) + "</strong></dd>";
      return total;
    }
    form.addEventListener("input", calc);
    form.addEventListener("change", calc);
    calc();

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var err = $("#book-error");
      function fail(msg) { err.textContent = msg; err.classList.remove("hide"); }
      err.classList.add("hide");

      var name = (form.name.value || "").trim();
      var email = (form.email.value || "").trim();
      var phone = (form.phone.value || "").trim();
      if (!name) return fail(t("booking.err_name"));
      if (!/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email)) return fail(t("booking.err_email"));

      var b = {
        ref: newRef(), kind: kind, itemId: item.id, title: item.name,
        district: item.district, districtId: item.districtId,
        name: name, email: email, phone: phone,
        qty: 1, nights: 0, guests: 1, room_type: "",
        amount: 0, status: "Pending", txn: "", created: new Date().toISOString(),
        items: []
      };

      if (kind === "destination") {
        var visit = form.visit_date.value;
        var qty = Number(form.qty.value) || 0;
        if (!visit || visit < todayISO()) return fail(t("booking.invalid_date"));
        if (qty < 1 || qty > 20) return fail(t("booking.err_qty"));
        b.visit_date = visit; b.qty = qty; b.guests = qty;
        b.items = [{ label: t("booking.ticket_adult"), qty: qty, unit: item.demo_price }];
        b.amount = qty * item.demo_price + SERVICE_FEE;
      } else {
        var ci = form.checkin.value, co = form.checkout.value;
        var guests = Number(form.guests.value) || 0;
        if (!ci || !co || ci < todayISO() || co <= ci) return fail(t("booking.err_dates"));
        if (guests < 1 || guests > item.max_guests) return fail(t("booking.err_guests").replace("{n}", item.max_guests));
        var nights = Math.round((new Date(co) - new Date(ci)) / 86400000);
        b.checkin = ci; b.checkout = co; b.guests = guests; b.nights = nights;
        b.room_type = form.room_type ? form.room_type.value : "";
        b.items = [{ label: t("booking.night_stay") + " (" + nights + ")", qty: nights, unit: item.price }];
        b.amount = nights * item.price + SERVICE_FEE;
      }
      b.items.push({ label: t("booking.fee"), qty: 1, unit: SERVICE_FEE });

      var list = allBookings();
      list.push(b);
      saveBookings(list);
      location.href = "pay.html?ref=" + encodeURIComponent(b.ref);
    });
  }

  /* ---------------------------------------------------------------- payment */
  function renderPay() {
    var b = bookingByRef(param("ref"));
    if (!b) { setHTML("#pay", '<div class="empty">' + t("booking.not_found") +
      ' <a href="bookings.html">' + t("my.title") + "</a></div>"); return; }
    var rows = b.items.map(function (i) {
      return "<tr><td>" + esc(i.label) + "</td><td>" + i.qty + "</td><td>" + money(i.qty * i.unit) + "</td></tr>";
    }).join("");
    var html =
      '<div class="section-head" style="margin-top:24px"><h1 style="font-size:1.7rem">' + t("pay.title") +
        '</h1><span class="muted small">' + esc(b.ref) + "</span></div>" +
      '<div class="demo-banner">' + t("pay.banner") + "</div>" +
      '<div class="note" style="margin-bottom:16px">' + t("pay.notice") + "</div>" +
      '<div class="detail-grid"><form class="panel" id="pay-form">' +
        "<h3>" + t("pay.method") + "</h3>" +
        '<div class="field"><label>' + t("pay.method") + '</label><select name="method">' +
          '<option value="upi">' + t("pay.upi") + "</option>" +
          '<option value="card">' + t("pay.card") + "</option>" +
          '<option value="netbanking">' + t("pay.netbanking") + "</option></select></div>" +
        '<div class="field"><label>UPI ID (simulated)</label><input name="vpa" placeholder="demo@upi" autocomplete="off"></div>' +
        '<div class="field"><label>Card number (simulated)</label><input name="card" placeholder="9999 9999 9999 9999" autocomplete="off"></div>' +
        '<div class="field"><label>Bank (simulated)</label><select name="bank"><option>Demo Bank 1</option>' +
          "<option>Demo Bank 2</option><option>Demo Bank 3</option></select></div>" +
        '<p class="small muted">' + t("pay.dummy_hint") + "</p>" +
        '<div class="field" style="margin-top:16px"><label>' + t("pay.simulate") + '</label>' +
          '<select name="outcome"><option value="success">' + t("pay.simulate_success") + "</option>" +
          '<option value="failed">' + t("pay.simulate_failure") + "</option>" +
          '<option value="cancelled">' + t("pay.simulate_cancel") + "</option></select></div>" +
        '<button class="btn accent block" type="submit">' + t("pay.pay_now") + "</button></form>" +
        '<aside class="panel"><h3>' + t("booking.summary") + "</h3><p><strong>" + esc(b.title) +
        '</strong><br><span class="small muted">' + esc(b.district) + " " + t("common.district") + "</span></p>" +
        '<dl class="dl">' +
        (b.visit_date ? "<dt>" + t("booking.visit_date") + "</dt><dd>" + esc(b.visit_date) + "</dd>" : "") +
        (b.checkin ? "<dt>" + t("common.checkin") + "</dt><dd>" + esc(b.checkin) + " → " + esc(b.checkout) + "</dd>" : "") +
        "<dt>" + t("common.guests") + "</dt><dd>" + b.guests + "</dd></dl>" +
        '<table class="data" style="margin-top:14px"><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead>' +
        "<tbody>" + rows + '</tbody><tfoot><tr><th colspan="2">' + t("common.total") + "</th><th>" +
        money(b.amount) + "</th></tr></tfoot></table></aside></div>";
    setHTML("#pay", html);

    $("#pay-form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var outcome = ev.target.outcome.value;
      var method = ev.target.method.value;
      var list = allBookings();
      list.forEach(function (x) {
        if (x.ref === b.ref) {
          x.status = outcome === "success" ? "Confirmed (Demo)" : (outcome === "failed" ? "Payment Failed" : "Cancelled");
          x.txn = outcome === "success" ? newTxn() : "";
          x.method = method;
          x.paid_at = new Date().toISOString();
        }
      });
      saveBookings(list);
      location.href = "booking.html?ref=" + encodeURIComponent(b.ref);
    });
  }

  /* ----------------------------------------------------------- confirmation */
  function statusClass(s) {
    return s === "Confirmed (Demo)" ? "confirmed" : (s === "Pending" ? "pending" : "cancelled");
  }

  function renderBooking() {
    var b = bookingByRef(param("ref"));
    if (!b) { setHTML("#booking", '<div class="empty">' + t("booking.not_found") +
      ' <a href="bookings.html">' + t("my.title") + "</a></div>"); return; }
    var ok = b.status === "Confirmed (Demo)";
    var title = ok ? t("pay.success_title")
      : (b.status === "Payment Failed" ? t("pay.failed_title")
      : (b.status === "Cancelled" ? t("pay.cancelled_title") : t("booking.summary")));
    var html =
      '<div class="section-head" style="margin-top:24px"><h1 style="font-size:1.7rem">' + title +
        '</h1><span class="pill ' + (ok ? "brand" : "demo") + '">' + esc(b.status) + "</span></div>" +
      '<div class="demo-banner">' + (b.kind === "homestay" ? t("ticket.not_reservation") : t("ticket.not_valid")) +
      "</div>" +
      '<div class="detail-grid"><div class="panel"><h3>' + esc(b.title) + '</h3><dl class="dl">' +
        "<dt>Booking ID</dt><dd><strong>" + esc(b.ref) + "</strong></dd>" +
        "<dt>" + t("common.date") + "</dt><dd>" +
          (b.visit_date || (esc(b.checkin) + " → " + esc(b.checkout))) + "</dd>" +
        "<dt>" + t("common.guests") + "</dt><dd>" + b.guests + "</dd>" +
        (b.room_type ? "<dt>" + t("common.rooms") + "</dt><dd>" + esc(b.room_type) + "</dd>" : "") +
        "<dt>" + t("common.total") + "</dt><dd>" + money(b.amount) + "</dd>" +
        "<dt>" + t("common.status") + '</dt><dd class="status ' + statusClass(b.status) + '">' +
          esc(b.status) + "</dd>" +
        "<dt>" + t("pay.txn") + "</dt><dd>" + (b.txn ? esc(b.txn) : "—") + "</dd>" +
        "<dt>Contact</dt><dd>" + esc(b.name) + " · " + esc(b.email) + "</dd></dl>" +
        '<div class="row" style="margin-top:16px">' +
        (ok ? '<a class="btn" href="ticket.html?ref=' + encodeURIComponent(b.ref) + '">' +
          (b.kind === "homestay" ? t("ticket.confirm_download") : t("ticket.download")) + "</a>"
          : (b.status === "Pending" ? '<a class="btn accent" href="pay.html?ref=' +
            encodeURIComponent(b.ref) + '">' + t("pay.title") + "</a>" : "")) +
        ((b.status === "Pending" || ok)
          ? '<button class="btn ghost" type="button" id="cancel-b">' + t("my.cancel") + "</button>" : "") +
        '<a class="btn ghost" href="bookings.html">' + t("nav.bookings") + "</a></div></div>" +
      '<aside class="panel"><h3>' + t("pay.txn") + "</h3><dl class=\"dl\">" +
        "<dt>ID</dt><dd>" + (b.txn ? esc(b.txn) : "—") + "</dd>" +
        "<dt>" + t("pay.method") + "</dt><dd>" + esc(b.method || "—") + "</dd>" +
        "<dt>" + t("common.total") + "</dt><dd>" + money(b.amount) + "</dd></dl>" +
        '<p class="small muted" style="margin-top:12px">' + t("pay.notice") + "</p></aside></div>";
    setHTML("#booking", html);
    var cancel = $("#cancel-b");
    if (cancel) {
      cancel.addEventListener("click", function () {
        if (!confirm(t("my.cancel_confirm"))) return;
        var list = allBookings();
        list.forEach(function (x) { if (x.ref === b.ref) x.status = "Cancelled"; });
        saveBookings(list);
        renderBooking();
      });
    }
  }

  /* ------------------------------------------------------------------ ticket */
  function renderTicket() {
    var b = bookingByRef(param("ref"));
    if (!b) { setHTML("#ticket", '<div class="empty">' + t("booking.not_found") + "</div>"); return; }
    if (b.status !== "Confirmed (Demo)") {
      setHTML("#ticket", '<div class="empty">' + t("ticket.only_confirmed") +
        ' <a href="booking.html?ref=' + encodeURIComponent(b.ref) + '">' + t("booking.summary") + "</a></div>");
      return;
    }
    var rows = [
      ["Booking ID", b.ref],
      [b.kind === "homestay" ? "Property" : "Destination", b.title],
      [t("common.district"), b.district],
      b.kind === "homestay"
        ? [t("common.checkin") + " → " + t("common.checkout"), b.checkin + " → " + b.checkout]
        : [t("booking.visit_date"), b.visit_date],
      [b.kind === "homestay" ? t("common.guests") : t("booking.qty"), b.kind === "homestay" ? b.guests : b.qty],
      [t("booking.name"), b.name],
      [t("common.total"), money(b.amount)],
      [t("common.status"), b.status],
      [t("pay.txn"), b.txn || "—"],
      ["Issued", new Date(b.created).toLocaleString()]
    ];
    var items = b.items.map(function (i) {
      return "<tr><td>" + esc(i.label) + "</td><td>" + i.qty + "</td><td>" + money(i.qty * i.unit) + "</td></tr>";
    }).join("");

    setHTML("#ticket",
      '<div class="no-print" style="margin:20px 0"><button class="btn" id="print-btn">' +
        t("ticket.print") + '</button> <a class="btn ghost" href="bookings.html">' + t("nav.bookings") + "</a></div>" +
      '<div class="ticket"><div class="t-head"><div><strong>' + t("app.name") + "</strong>" +
        '<div class="small muted">' + t("app.tagline") + '</div></div><div class="small muted" style="text-align:right">' +
        (b.kind === "homestay" ? t("ticket.stay_title") : t("ticket.title")) + "<br>" + esc(b.ref) + "</div></div>" +
      '<div class="stamp">' + (b.kind === "homestay" ? t("ticket.not_reservation") : t("ticket.not_valid")) + "</div>" +
      '<div class="t-body"><div><table>' + rows.map(function (r) {
        return "<tr><td>" + esc(r[0]) + "</td><td><strong>" + esc(String(r[1])) + "</strong></td></tr>";
      }).join("") + "</table>" +
      '<table style="margin-top:14px"><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>' +
      items + "</tbody></table>" +
      '<p class="small muted" style="margin-top:12px">' + t("ticket.terms") + "</p></div>" +
      '<div><div class="qr" id="qr"></div><p class="small muted center" style="margin-top:6px">' +
        t("ticket.qr_note") + "</p></div></div></div>");

    $("#print-btn").addEventListener("click", function () { window.print(); });

    var holder = $("#qr");
    if (window.qrcode && holder) {
      try {
        var qr = window.qrcode(0, "M");
        qr.addData("DEMO-BOOKING:" + b.ref + "|" + (b.txn || "NA"));
        qr.make();
        holder.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0 });
      } catch (e) { holder.textContent = b.ref; }
    } else if (holder) {
      holder.textContent = b.ref;
    }
  }

  /* ---------------------------------------------------------------- bookings */
  function renderBookingsPage() {
    var q = { q: param("q"), status: param("status"), kind: param("kind") };
    var list = allBookings().slice().reverse();
    if (q.q) {
      var s = q.q.toLowerCase();
      list = list.filter(function (b) {
        return (b.ref + " " + b.title).toLowerCase().indexOf(s) >= 0;
      });
    }
    if (q.status) list = list.filter(function (b) { return b.status === q.status; });
    if (q.kind) list = list.filter(function (b) { return b.kind === q.kind; });

    ["#f-q", "#f-status", "#f-kind"].forEach(function (id, i) {
      var node = $(id);
      if (node) node.value = [q.q, q.status, q.kind][i] || "";
    });

    setText("#booking-count", list.length);
    if (!list.length) {
      setHTML("#bookings", '<div class="empty">' + t("my.empty") +
        '<div style="margin-top:14px"><a class="btn" href="destinations.html">' + t("nav.destinations") + "</a></div></div>");
      return;
    }
    var rows = list.map(function (b) {
      return "<tr><td><a href=\"booking.html?ref=" + encodeURIComponent(b.ref) +
        '" style="color:var(--brand)"><strong>' + esc(b.ref) + "</strong></a></td>" +
        "<td>" + esc(b.title) + '<br><span class="small muted">' + esc(b.kind) + "</span></td>" +
        "<td>" + esc(b.visit_date || (b.checkin + " → " + b.checkout)) + "</td>" +
        "<td>" + money(b.amount) + "</td>" +
        '<td class="status ' + statusClass(b.status) + '">' + esc(b.status) + "</td>" +
        '<td class="small">' + (b.txn ? esc(b.txn) : "—") + "</td>" +
        "<td>" + (b.status === "Confirmed (Demo)"
          ? '<a class="btn sm ghost" href="ticket.html?ref=' + encodeURIComponent(b.ref) + '">' +
            t("common.download") + "</a>" : "") + "</td></tr>";
    }).join("");
    setHTML("#bookings",
      '<div class="table-wrap"><table class="data"><thead><tr><th>Booking ID</th><th>Item</th><th>' +
      t("common.date") + "</th><th>Amount</th><th>" + t("common.status") + "</th><th>" + t("pay.txn") +
      "</th><th></th></tr></thead><tbody>" + rows + "</tbody></table></div>");
  }

  function exportCsv() {
    var rows = [["Booking ID", "Type", "Title", "District", "Visit date", "Check-in", "Check-out",
      "Guests", "Qty", "Nights", "Amount (INR)", "Status", "Demo transaction ID", "Created"]];
    allBookings().forEach(function (b) {
      rows.push([b.ref, b.kind, b.title, b.district, b.visit_date || "", b.checkin || "", b.checkout || "",
        b.guests, b.qty, b.nights, b.amount, b.status, b.txn || "", b.created]);
    });
    var csv = rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"'; }).join(",");
    }).join("\r\n");
    var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "my-bookings.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  /* --------------------------------------------------------------------- map */
  function renderMap() {
    if (!window.L) return;
    var map = window.L.map("map").setView([14.9, 76.2], 7);
    var tiles = null, layer = window.L.layerGroup().addTo(map);

    function setTiles(theme) {
      if (tiles) map.removeLayer(tiles);
      tiles = window.L.tileLayer(
        theme === "dark"
          ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          : "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 18,
          attribution: theme === "dark"
            ? '&copy; OpenStreetMap contributors &copy; CARTO'
            : '&copy; OpenStreetMap contributors'
        }).addTo(map);
    }
    setTiles(state.theme);
    document.addEventListener("themechange", function (e) { setTiles(e.detail); });

    var selD = $("#f-district"), selC = $("#f-category"), selK = $("#f-kind");
    selD.innerHTML = '<option value="">' + t("search.all_districts") + "</option>" +
      DATA.districts.map(function (d) { return '<option value="' + d.id + '">' + esc(d.name) + "</option>"; }).join("");
    selC.innerHTML = '<option value="">' + t("search.all_categories") + "</option>" +
      DATA.categories.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("");

    function load() {
      var dId = selD.value, cat = selC.value, kind = selK.value;
      var items = [];
      if (kind !== "homestays") {
        items = items.concat(DATA.destinations.filter(function (d) {
          return (!dId || d.districtId === Number(dId)) && (!cat || d.category === cat);
        }).map(function (d) {
          return { name: d.name, district: d.district, cat: d.category, lat: d.lat, lon: d.lon,
            price: d.demo_price, kind: "destination", url: "destination.html?id=" + d.id };
        }));
      }
      if (kind !== "destinations" && !cat) {
        items = items.concat(DATA.homestays.filter(function (h) {
          return !dId || h.districtId === Number(dId);
        }).map(function (h) {
          return { name: h.name, district: h.district, cat: "Homestay (demo)", lat: h.lat, lon: h.lon,
            price: h.price, kind: "homestay", url: "homestay.html?id=" + h.id };
        }));
      }
      layer.clearLayers();
      var bounds = [];
      items.forEach(function (i) {
        if (i.lat == null || i.lon == null) return;
        var color = i.kind === "homestay" ? "#b45309" : "#14532d";
        window.L.circleMarker([i.lat, i.lon], {
          radius: 7, color: "#fff", weight: 2, fillColor: color, fillOpacity: 0.95
        }).bindPopup(
          '<div class="map-pop"><b>' + esc(i.name) + "</b><br>" +
          '<span style="color:#6b7280;font-size:12px">' + esc(i.district) + " · " + esc(i.cat) + "</span><br>" +
          '<span style="font-size:12px">' + (i.price ? money(i.price) + (i.kind === "homestay" ? " " + t("common.per_night") : "") : t("common.free")) +
          '</span><br><a href="' + i.url + '" style="color:#14532d;font-weight:600">' +
          t("common.view_details") + "</a></div>").addTo(layer);
        bounds.push([i.lat, i.lon]);
      });
      if (bounds.length) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 11 });
      setText("#map-count", items.length);
    }
    $("#apply").addEventListener("click", load);
    load();
  }

  /* ---------------------------------------------------------------- suggest */
  function wireSuggest(input) {
    var box = document.getElementById(input.getAttribute("data-suggest"));
    if (!box) return;
    var timer = null;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) { box.classList.remove("show"); box.innerHTML = ""; return; }
      timer = setTimeout(function () {
        var items = [];
        DATA.destinations.forEach(function (d) {
          if (d.name.toLowerCase().indexOf(q) >= 0 && items.length < 6) {
            items.push({ label: d.name, hint: d.district, url: "destination.html?id=" + d.id });
          }
        });
        DATA.homestays.forEach(function (h) {
          if (h.name.toLowerCase().indexOf(q) >= 0 && items.length < 9) {
            items.push({ label: h.name, hint: h.district + " (demo)", url: "homestay.html?id=" + h.id });
          }
        });
        DATA.districts.forEach(function (d) {
          if (d.name.toLowerCase().indexOf(q) >= 0 && items.length < 11) {
            items.push({ label: d.name + " district", hint: t("nav.destinations"),
              url: "destinations.html?district=" + d.id });
          }
        });
        if (!items.length) { box.classList.remove("show"); box.innerHTML = ""; return; }
        box.innerHTML = items.map(function (i) {
          return '<a href="' + i.url + '">' + esc(i.label) + ' <span class="hint">· ' + esc(i.hint) + "</span></a>";
        }).join("");
        box.classList.add("show");
      }, 120);
    });
    document.addEventListener("click", function (e) {
      if (!box.contains(e.target) && e.target !== input) box.classList.remove("show");
    });
    input.addEventListener("keydown", function (e) { if (e.key === "Escape") box.classList.remove("show"); });
  }

  /* ------------------------------------------------------------------- init */
  function render() {
    var page = document.body.getAttribute("data-page");
    if (page === "home") renderHome();
    else if (page === "destinations") renderDestinationsPage();
    else if (page === "homestays") renderHomestaysPage();
    else if (page === "destination") renderDestinationDetail();
    else if (page === "homestay") renderHomestayDetail();
    else if (page === "guides") renderGuides();
    else if (page === "experiences") renderExperiences();
    else if (page === "map") renderMap();
    else if (page === "pay") renderPay();
    else if (page === "booking") renderBooking();
    else if (page === "ticket") renderTicket();
    else if (page === "bookings") renderBookingsPage();
    else if (page === "account") renderAccount();
  }

  function renderGuides() {
    var dId = param("district");
    var list = DATA.guides.filter(function (g) { return !dId || g.districtId === Number(dId); });
    fillDistrictSelect("#f-district", dId);
    setHTML("#results", list.map(function (g) {
      return '<article class="card"><div class="body">' +
        '<span class="pill demo">' + t("common.demo_listing") + "</span><h3>" + esc(g.name) + "</h3>" +
        '<div class="meta"><span>' + esc(g.district) + "</span><span>·</span><span>★ " +
        Number(g.rating).toFixed(1) + "</span></div>" +
        '<p class="desc">' + esc(g.bio) + "</p>" +
        '<p class="small muted" style="margin:0">' + esc(g.languages) + "</p>" +
        '<div class="foot"><span class="pill price">' + money(g.day_rate) + " / day</span>" +
        '<span class="small muted">' + g.years + " yrs</span></div></div></article>";
    }).join("") || '<div class="empty">' + t("search.no_results") + "</div>");
    setText("#result-count", list.length);
  }

  function renderExperiences() {
    setHTML("#results", DATA.experiences.map(function (e) {
      return '<article class="card"><div class="body"><span class="pill brand">' + esc(e.district) +
        "</span><h3>" + esc(e.name) + "</h3>" +
        '<p class="desc">' + esc(e.description) + "</p>" +
        '<div class="foot"><span class="pill price">' + money(e.price) + " " + t("common.per_person") +
        '</span><span class="small muted">' + esc(e.duration) + "</span></div></div></article>";
    }).join(""));
    setText("#result-count", DATA.experiences.length);
  }

  // a photo that fails to load should not leave a broken-image icon behind
  document.addEventListener("error", function (e) {
    var el = e.target;
    if (el && el.tagName === "IMG") {
      el.style.visibility = "hidden";
      if (el.parentElement) el.parentElement.classList.add("img-missing");
    }
  }, true);

  document.addEventListener("DOMContentLoaded", function () {
    applyI18n();
    applyTheme();

    var themeBtn = $("#theme-toggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", function () {
        state.theme = state.theme === "dark" ? "light" : "dark";
        localStorage.setItem(STORE_THEME, state.theme);
        applyTheme();
      });
    }
    var langSel = $("#lang-select");
    if (langSel) langSel.addEventListener("change", function () { setLang(langSel.value); });

    $$("[data-suggest]").forEach(wireSuggest);

    var dForm = $("#filters-destinations");
    if (dForm) {
      dForm.addEventListener("submit", function (ev) {
        ev.preventDefault();
        goDestinations({
          q: $("#f-q").value, district: $("#f-district").value, category: $("#f-category").value,
          max_price: $("#f-max").value, sort: $("#f-sort").value, page: 1
        });
      });
      $("#f-clear").addEventListener("click", function () { goDestinations({ page: 1 }); });
    }
    var hForm = $("#filters-homestays");
    if (hForm) {
      hForm.addEventListener("submit", function (ev) {
        ev.preventDefault();
        goHomestays({
          q: $("#f-q").value, district: $("#f-district").value, guests: $("#f-guests").value,
          max_price: $("#f-max").value, amenity: $("#f-amenity").value, sort: $("#f-sort").value, page: 1
        });
      });
      $("#f-clear").addEventListener("click", function () { goHomestays({ page: 1 }); });
    }
    var bForm = $("#filters-bookings");
    if (bForm) {
      bForm.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var p = new URLSearchParams();
        ["q", "status", "kind"].forEach(function (k) {
          var v = $("#f-" + k).value;
          if (v) p.set(k, v);
        });
        history.replaceState(null, "", "bookings.html" + (p.toString() ? "?" + p : ""));
        renderBookingsPage();
      });
      $("#f-clear").addEventListener("click", function () {
        history.replaceState(null, "", "bookings.html");
        renderBookingsPage();
      });
      var csv = $("#export-csv");
      if (csv) csv.addEventListener("click", exportCsv);
    }
    var gSel = $("#f-district");
    if (document.body.getAttribute("data-page") === "guides" && gSel) {
      gSel.addEventListener("change", function () {
        location.href = "guides.html" + (gSel.value ? "?district=" + gSel.value : "");
      });
    }

    if (window.KT_AUTH) KT_AUTH.updateHeader();
    render();
  });

  window.KT = { t: t, money: money, state: state, bookings: allBookings };
})();
