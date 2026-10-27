/* Mobile + OTP sign-in for the Karnataka Tourism portal.
 *
 * Two modes, chosen by assets/js/config.js:
 *
 *   sms  — window.KT_OTP_API points at the OTP service (otp-service/), which
 *          generates the code, texts it to the phone and verifies it. The browser
 *          never sees the code. This is the production path.
 *
 *   demo — no service configured. The same rules run in the browser so the flow
 *          can be demonstrated on a static host: one active OTP, 5-minute expiry,
 *          resend rotates, only the newest verifies, 5 attempts. The code is shown
 *          on screen in a panel clearly marked DEMO MODE, because there is no SMS
 *          gateway to send it. This is not a security boundary.
 */
(function () {
  "use strict";

  var KEY = "kt-auth";
  var SESSION_MS = 24 * 60 * 60 * 1000;
  var OTP_TTL = 5 * 60 * 1000;
  var COOLDOWN = 30 * 1000;
  var MAX_ATTEMPTS = 5;
  var API = (window.KT_OTP_API || "").replace(/\/+$/, "");
  var MODE = API ? "sms" : "demo";

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "{}");
      s.users = s.users || {};
      return s;
    } catch (e) { return { users: {} }; }
  }
  function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
  function normalise(m) { return String(m || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").slice(-10); }
  function validMobile(m) { return /^[6-9]\d{9}$/.test(m); }
  function fmt(m) { return "+91 " + m.slice(0, 5) + " " + m.slice(5); }
  function now() { return Date.now(); }
  function tt(k, f) { return window.KT ? KT.t(k) : f; }
  function mmss(s) { s = Math.max(0, s | 0); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }

  function toast(title, body, kind, ms) {
    var wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    var header = document.querySelector("header.site");
    if (header) wrap.style.top = Math.round(header.getBoundingClientRect().bottom + 12) + "px";
    var el = document.createElement("div");
    el.className = "toast " + (kind || "");
    el.innerHTML = "<b>" + title + "</b>" + (body ? "<span>" + body + "</span>" : "") +
      '<button class="close" type="button" aria-label="Close">×</button>';
    wrap.appendChild(el);
    var kill = function () { el.remove(); };
    el.querySelector(".close").addEventListener("click", kill);
    setTimeout(kill, ms || 6000);
  }

  function post(path, payload) {
    return fetch(API + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; })
        .then(function (data) { return { status: r.status, data: data }; });
    });
  }

  /* ------------------------------------------------------- demo-mode engine */
  var DEMO = {
    issue: function (mobile) {
      var s = load();
      var prev = s.demoOtp;
      if (prev && prev.mobile === mobile && now() - prev.issuedAt < COOLDOWN) {
        var wait = Math.ceil((COOLDOWN - (now() - prev.issuedAt)) / 1000);
        return { ok: false, error: tt("auth.cooldown", "Please wait") + " " + wait + "s" };
      }
      var code = String(Math.floor(100000 + Math.random() * 900000));
      // overwriting the single record is what makes the previous code invalid
      s.demoOtp = { mobile: mobile, code: code, issuedAt: now(), expiresAt: now() + OTP_TTL, attempts: 0 };
      if (!s.users[mobile]) s.users[mobile] = { verified: false, createdAt: now() };
      save(s);
      return { ok: true, mobile: mobile, code: code, demo: true, expires_in: OTP_TTL / 1000 };
    },
    check: function (mobile, code) {
      var s = load();
      var rec = s.demoOtp;
      if (!rec || rec.mobile !== mobile) {
        return { ok: false, error: tt("auth.no_active", "No active OTP for this number. Request a new one.") };
      }
      if (rec.expiresAt < now()) {
        delete s.demoOtp; save(s);
        return { ok: false, error: tt("auth.expired", "That OTP has expired. Request a new one.") };
      }
      if (rec.attempts >= MAX_ATTEMPTS) {
        delete s.demoOtp; save(s);
        return { ok: false, error: tt("auth.locked", "Too many wrong attempts. Request a new OTP.") };
      }
      if (String(code || "").trim() !== rec.code) {
        rec.attempts += 1; s.demoOtp = rec; save(s);
        var left = MAX_ATTEMPTS - rec.attempts;
        return { ok: false, error: tt("auth.wrong", "Incorrect OTP.") + " " + left + " " + tt("auth.left", "attempts left") };
      }
      delete s.demoOtp;                         // single use
      s.users[mobile] = { verified: true, verifiedAt: now() };
      s.session = { mobile: mobile, token: "demo", verifiedAt: now(), expiresAt: now() + SESSION_MS };
      save(s);
      return { ok: true, mobile: mobile };
    }
  };

  var AUTH = {
    mode: MODE,
    configured: MODE === "sms",
    toast: toast,

    isVerified: function () {
      var s = load();
      var sess = s.session;
      if (!sess || !sess.mobile || !sess.token) return false;
      if (sess.expiresAt && sess.expiresAt < now()) return false;
      return true;
    },
    currentMobile: function () { return this.isVerified() ? load().session.mobile : null; },
    logout: function () { var s = load(); delete s.session; save(s); },

    widget: function (host, opts) {
      opts = opts || {};
      var self = this;
      var mobile = normalise(opts.mobile || "");
      var state = "idle";            // idle | sending | sent | verifying
      var expiresAt = 0, cooldownUntil = 0, demoCode = null, timer = null;

      function stop() { if (timer) { clearInterval(timer); timer = null; } }

      function draw(message, kind) {
        stop();
        var sent = state === "sent" || state === "verifying";
        var left = sent ? Math.max(0, Math.ceil((expiresAt - now()) / 1000)) : 0;
        var cool = Math.max(0, Math.ceil((cooldownUntil - now()) / 1000));

        var html = '<div class="otp-widget">';
        if (!opts.compact) html += "<h3>" + tt("auth.title", "Verify your mobile number") + "</h3>";
        html += '<p class="small muted">' + tt("auth.intro", "") + "</p>";

        html += '<div class="field"><label>' + tt("auth.mobile", "Mobile number") +
          '</label><div class="row" style="gap:8px;flex-wrap:nowrap">' +
          '<span class="pill" style="flex:0 0 auto">+91</span>' +
          '<input id="otp-mobile" inputmode="numeric" autocomplete="tel" maxlength="10" ' +
          'placeholder="98765 43210" value="' + (mobile || "") + '"' + (sent ? " disabled" : "") + "></div></div>";

        if (!sent) {
          html += '<button class="btn block" id="otp-send" type="button"' +
            (state === "sending" ? " disabled" : "") + ">" +
            (state === "sending" ? tt("auth.sending", "Sending…") : tt("auth.send", "Send OTP")) + "</button>";
        } else {
          html += '<div class="otp-sent"><span class="tick">✓</span><span><b>' +
            tt("auth.sent_title", "OTP sent to") + " " + fmt(mobile) + "</b>" +
            tt("auth.sent_body", "Valid for 5 minutes. Enter it below.") + "</span></div>";

          if (demoCode) {
            html += '<div class="demo-sms"><strong>' + tt("auth.demo_mode", "Demo mode — no SMS gateway") +
              '</strong><br>' + tt("auth.demo_body", "Your code is") +
              ' <span class="otp-code">' + demoCode + "</span></div>";
          }

          html += '<div class="field"><label>' + tt("auth.enter", "Enter the 6-digit OTP") +
            '</label><input id="otp-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" ' +
            'placeholder="000000"></div>';
          html += '<button class="btn block" id="otp-verify" type="button"' +
            (state === "verifying" ? " disabled" : "") + ">" +
            (state === "verifying" ? tt("auth.verifying", "Verifying…") : tt("auth.verify", "Verify")) + "</button>";
          html += '<div class="row" style="justify-content:space-between;margin-top:10px">' +
            '<span class="small muted" id="otp-countdown">' + tt("auth.expires_in", "Expires in") + " " +
            mmss(left) + "</span>" +
            '<button class="btn sm ghost" id="otp-resend" type="button"' + (cool ? " disabled" : "") + ">" +
            (cool ? tt("auth.resend_in", "Resend in") + " " + cool + "s" : tt("auth.resend", "Send a new OTP")) +
            "</button></div>";
        }

        if (message) html += '<div class="flash ' + (kind || "error") + '" style="margin-top:12px">' + message + "</div>";
        html += '<p class="small muted" style="margin-top:12px">' +
          (MODE === "demo" ? tt("auth.demo_note_short", "") : tt("auth.demo_note", "")) + "</p></div>";
        host.innerHTML = html;

        var sendBtn = host.querySelector("#otp-send");
        var resendBtn = host.querySelector("#otp-resend");
        var verifyBtn = host.querySelector("#otp-verify");
        var mobileInput = host.querySelector("#otp-mobile");

        function issue() {
          var m = normalise(mobileInput ? mobileInput.value : mobile);
          if (!validMobile(m)) return draw(tt("auth.err_mobile", "Enter a valid 10-digit Indian mobile number."), "error");
          mobile = m;
          state = "sending"; draw("", "");

          if (MODE === "demo") {
            var r = DEMO.issue(m);
            if (!r.ok) { state = "idle"; return draw(r.error, "error"); }
            state = "sent"; demoCode = r.code;
            expiresAt = now() + OTP_TTL; cooldownUntil = now() + COOLDOWN;
            draw("", "");
            toast(tt("auth.sent_title", "OTP sent to"), fmt(m), "success");
            var b1 = host.querySelector("#otp-code"); if (b1) b1.focus();
            return;
          }

          post("/request", { mobile: m }).then(function (res) {
            var d = res.data || {};
            if (!res.status || res.status >= 400 || !d.ok) {
              state = "idle";
              return draw(d.error || tt("auth.send_failed", "We could not send the SMS just now."), "error");
            }
            state = "sent"; expiresAt = now() + ((d.expires_in || 300) * 1000);
            cooldownUntil = now() + COOLDOWN;
            draw("", "");
            toast(tt("auth.sent_title", "OTP sent to"), fmt(m) + " · " + tt("auth.sent_body", ""), "success");
            var b2 = host.querySelector("#otp-code"); if (b2) b2.focus();
          }).catch(function () {
            state = "idle";
            draw(tt("auth.network", "Could not reach the verification service."), "error");
          });
        }

        function verify() {
          var code = host.querySelector("#otp-code").value;
          state = "verifying"; draw("", "");

          function done(r) {
            if (!r.ok) {
              state = "sent";
              draw(r.error || tt("auth.verify_failed", "Could not verify"), "error");
              toast(tt("auth.verify_failed", "Could not verify"), r.error || "", "error", 5000);
              return;
            }
            var s = load();
            if (MODE === "sms") {
              s.users[mobile] = { verified: true, verifiedAt: now() };
              s.session = { mobile: mobile, token: r.token, verifiedAt: now(),
                            expiresAt: now() + ((r.expires_in || 86400) * 1000) };
              save(s);
            }
            toast(tt("auth.verified_title", "Mobile verified"), fmt(mobile), "success");
            if (opts.onVerified) opts.onVerified({ mobile: mobile });
          }

          if (MODE === "demo") return done(DEMO.check(mobile, code));
          post("/verify", { mobile: mobile, code: code }).then(function (res) {
            done(res.data || { ok: false });
          }).catch(function () {
            state = "sent";
            draw(tt("auth.network", "Could not reach the verification service."), "error");
          });
        }

        if (sendBtn) sendBtn.addEventListener("click", issue);
        if (resendBtn) resendBtn.addEventListener("click", function () {
          toast(tt("auth.resent_title", "New OTP requested"), tt("auth.resent", ""), "success");
          demoCode = null;
          issue();
        });
        if (verifyBtn) verifyBtn.addEventListener("click", verify);

        var codeBox = host.querySelector("#otp-code");
        if (codeBox) codeBox.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); verifyBtn.click(); }
        });

        if (sent) {
          timer = setInterval(function () {
            var l = Math.max(0, Math.ceil((expiresAt - now()) / 1000));
            var c = Math.max(0, Math.ceil((cooldownUntil - now()) / 1000));
            var cd = host.querySelector("#otp-countdown");
            var rb = host.querySelector("#otp-resend");
            if (cd) cd.textContent = tt("auth.expires_in", "Expires in") + " " + mmss(l);
            if (rb) {
              if (c > 0) { rb.disabled = true; rb.textContent = tt("auth.resend_in", "Resend in") + " " + c + "s"; }
              else if (rb.disabled) { rb.disabled = false; rb.textContent = tt("auth.resend", "Send a new OTP"); }
            }
            if (l <= 0) { stop(); draw(tt("auth.expired", "That OTP has expired. Request a new one."), "warning"); }
          }, 1000);
        }
      }

      draw("", "");
      return { redraw: draw };
    },

    updateHeader: function () {
      var box = document.getElementById("auth-slot");
      if (!box) return;
      if (this.isVerified()) {
        var m = this.currentMobile();
        box.innerHTML = '<a class="btn sm ghost" href="account.html">' + fmt(m) + "</a>" +
          '<button class="btn sm ghost" type="button" id="sign-out">' + tt("auth.signout", "Sign out") + "</button>";
        box.querySelector("#sign-out").addEventListener("click", function () {
          AUTH.logout(); location.reload();
        });
      } else {
        box.innerHTML = '<a class="btn sm" href="account.html">' + tt("auth.signin", "Sign in") + "</a>";
      }
    }
  };

  window.KT_AUTH = AUTH;
})();
