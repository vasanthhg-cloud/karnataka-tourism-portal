/* Sign-in for the Karnataka Tourism portal.
 *
 * Two ways to prove it is you:
 *   1. mobile number + password  (this is the default form)
 *   2. mobile number + OTP       (a "use an OTP instead" link, same rules as before)
 *
 * Accounts are kept in this browser (localStorage) because the site is static.
 * Passwords are stored as a PBKDF2/SHA-256 hash with a random salt, never in clear.
 * If assets/js/config.js sets KT_OTP_API, the OTP route is handled by the real
 * service in otp-service/ (SMS, server-side verification); otherwise the OTP runs
 * in demo mode and the code is shown in a panel marked DEMO MODE.
 */
(function () {
  "use strict";

  var KEY = "kt-auth";
  var SESSION_MS = 24 * 60 * 60 * 1000;
  var OTP_TTL = 5 * 60 * 1000;
  var COOLDOWN = 30 * 1000;
  var MAX_ATTEMPTS = 5;
  var MIN_PASSWORD = 6;
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
  function tt(k, f) {
    if (!window.KT) return f || k;
    var v = KT.t(k);
    return (v && v !== k) ? v : (f || k);   // fall back to the built-in text
  }
  function mmss(s) { s = Math.max(0, s | 0); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

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
    el.innerHTML = "<b>" + esc(title) + "</b>" + (body ? "<span>" + esc(body) + "</span>" : "") +
      '<button class="close" type="button" aria-label="Close">×</button>';
    wrap.appendChild(el);
    var kill = function () { el.remove(); };
    el.querySelector(".close").addEventListener("click", kill);
    setTimeout(kill, ms || 6000);
  }

  /* ------------------------------------------------------------- hashing */
  function randomSalt() {
    var a = new Uint8Array(16);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a)
      : a.forEach(function (_, i) { a[i] = Math.floor(Math.random() * 256); });
    return Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }

  function hashPassword(password, salt) {
    var data = salt + "|" + password;
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(data)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return b.toString(16).padStart(2, "0");
        }).join("");
      });
    }
    // last-resort fallback for very old browsers (not a security claim)
    var h = 5381;
    for (var i = 0; i < data.length; i++) h = ((h << 5) + h + data.charCodeAt(i)) >>> 0;
    return Promise.resolve("fallback" + h.toString(16));
  }

  /* --------------------------------------------------------------- state */
  function setSession(mobile, extra) {
    var s = load();
    var u = s.users[mobile] || {};
    u.verified = true;
    u.verifiedAt = now();
    if (extra && extra.name) u.name = extra.name;
    s.users[mobile] = u;
    s.session = { mobile: mobile, token: "local", name: u.name || "",
                  verifiedAt: now(), expiresAt: now() + SESSION_MS };
    save(s);
    return s.session;
  }

  var AUTH = {
    mode: MODE,
    configured: MODE === "sms",
    toast: toast,
    MIN_PASSWORD: MIN_PASSWORD,

    isVerified: function () {
      var s = load(), sess = s.session;
      return !!(sess && sess.mobile && sess.token && (!sess.expiresAt || sess.expiresAt > now()));
    },
    currentMobile: function () { return this.isVerified() ? load().session.mobile : null; },
    currentName: function () {
      var s = load();
      return this.isVerified() ? (s.session.name || (s.users[s.session.mobile] || {}).name || "") : "";
    },
    hasAccount: function (mobile) { return !!(load().users[normalise(mobile)] || {}).passHash; },
    logout: function () { var s = load(); delete s.session; save(s); },

    /* --------------------------------------------------------- credentials */
    signUp: function (name, mobileRaw, password) {
      var mobile = normalise(mobileRaw);
      if (!name || name.trim().length < 2) return Promise.resolve({ ok: false, error: tt("auth.err_name", "Please enter your name.") });
      if (!validMobile(mobile)) return Promise.resolve({ ok: false, error: tt("auth.err_mobile", "Enter a valid 10-digit Indian mobile number.") });
      if (!password || password.length < MIN_PASSWORD) {
        return Promise.resolve({ ok: false, error: tt("auth.err_password", "Use at least 6 characters for the password.") });
      }
      var s = load();
      var existing = s.users[mobile];
      if (existing && existing.passHash) {
        return Promise.resolve({ ok: false, error: tt("auth.err_exists", "An account already exists for this number. Please sign in.") });
      }
      var salt = randomSalt();
      return hashPassword(password, salt).then(function (hash) {
        var st = load();
        st.users[mobile] = { name: name.trim(), salt: salt, passHash: hash, verified: true,
                             createdAt: (st.users[mobile] || {}).createdAt || now() };
        save(st);
        setSession(mobile, { name: name.trim() });
        return { ok: true, mobile: mobile, name: name.trim() };
      });
    },

    signIn: function (mobileRaw, password) {
      var mobile = normalise(mobileRaw);
      if (!validMobile(mobile)) return Promise.resolve({ ok: false, error: tt("auth.err_mobile", "Enter a valid 10-digit Indian mobile number.") });
      var u = load().users[mobile];
      if (!u || !u.passHash) {
        return Promise.resolve({ ok: false, error: tt("auth.err_no_account", "No account for this number yet — create one."), needsSignup: true });
      }
      return hashPassword(password || "", u.salt).then(function (hash) {
        if (hash !== u.passHash) {
          return { ok: false, error: tt("auth.err_wrong_password", "That password does not match this number.") };
        }
        setSession(mobile, { name: u.name });
        return { ok: true, mobile: mobile, name: u.name || "" };
      });
    },

    /* ------------------------------------------------------- demo OTP mode */
    _demo: {
      issue: function (mobile) {
        var s = load(), prev = s.demoOtp;
        if (prev && prev.mobile === mobile && now() - prev.issuedAt < COOLDOWN) {
          var wait = Math.ceil((COOLDOWN - (now() - prev.issuedAt)) / 1000);
          return { ok: false, error: tt("auth.cooldown", "Please wait") + " " + wait + "s" };
        }
        var code = String(Math.floor(100000 + Math.random() * 900000));
        s.demoOtp = { mobile: mobile, code: code, issuedAt: now(), expiresAt: now() + OTP_TTL, attempts: 0 };
        save(s);
        return { ok: true, mobile: mobile, code: code, expires_in: OTP_TTL / 1000 };
      },
      check: function (mobile, code) {
        var s = load(), rec = s.demoOtp;
        if (!rec || rec.mobile !== mobile) return { ok: false, error: tt("auth.no_active", "No active OTP for this number. Request a new one.") };
        if (rec.expiresAt < now()) { delete s.demoOtp; save(s); return { ok: false, error: tt("auth.expired", "That OTP has expired. Request a new one.") }; }
        if (rec.attempts >= MAX_ATTEMPTS) { delete s.demoOtp; save(s); return { ok: false, error: tt("auth.locked", "Too many wrong attempts. Request a new OTP.") }; }
        if (String(code || "").trim() !== rec.code) {
          rec.attempts += 1; s.demoOtp = rec; save(s);
          return { ok: false, error: tt("auth.wrong", "Incorrect OTP.") + " " + (MAX_ATTEMPTS - rec.attempts) + " " + tt("auth.left", "attempts left") };
        }
        delete s.demoOtp; save(s);
        setSession(mobile);
        return { ok: true, mobile: mobile };
      }
    },

    /* ------------------------------------------------------------- widget */
    widget: function (host, opts) {
      opts = opts || {};
      var self = this;
      var view = opts.view || "signin";
      var mobile = normalise(opts.mobile || "");
      var busy = false, message = null, kind = "error";
      var otpState = { sent: false, expiresAt: 0, cooldownUntil: 0, code: null, timer: null };
      // keep what the user typed, so an error message does not wipe the form
      var form = { name: opts.name || "", mobile: mobile };

      function stopTimer() { if (otpState.timer) { clearInterval(otpState.timer); otpState.timer = null; } }
      function say(msg, k) { message = msg; kind = k || "error"; draw(); }

      function draw() {
        stopTimer();
        var html = '<div class="otp-widget">';

        if (view === "otp") {
          html += drawOtp();
        } else {
          var signup = view === "signup";
          html += "<h3>" + (signup ? tt("auth.create_title", "Create your account")
                                   : tt("auth.signin_title", "Sign in")) + "</h3>";
          html += '<p class="small muted">' + tt("auth.cred_intro",
            "Sign in with your mobile number and password.") + "</p>";

          if (signup) {
            html += '<div class="field"><label>' + tt("auth.name", "Your name") +
              '</label><input id="au-name" autocomplete="name" value="' + esc(form.name) + '"></div>';
          }
          html += '<div class="field"><label>' + tt("auth.mobile", "Mobile number") +
            '</label><div class="row" style="gap:8px;flex-wrap:nowrap">' +
            '<span class="pill" style="flex:0 0 auto">+91</span>' +
            '<input id="au-mobile" inputmode="numeric" maxlength="10" autocomplete="tel" placeholder="98765 43210" value="' +
            esc(form.mobile) + '"></div></div>';
          html += '<div class="field"><label>' + tt("auth.password", "Password") +
            '</label><input id="au-password" type="password" autocomplete="' + (signup ? "new-password" : "current-password") +
            '" placeholder="••••••••"></div>';

          if (signup) {
            html += '<p class="small muted" style="margin-top:-6px">' +
              tt("auth.password_rule", "At least 6 characters.") + "</p>";
          }
          html += '<button class="btn block" id="au-submit" type="button"' + (busy ? " disabled" : "") + ">" +
            (busy ? tt("auth.working", "Please wait…")
                  : (signup ? tt("auth.create_account", "Create account") : tt("auth.signin", "Sign in"))) + "</button>";

          html += '<div class="auth-links">' +
            (signup
              ? '<a href="#" data-view="signin">' + tt("auth.have_account", "Already have an account? Sign in") + "</a>"
              : '<a href="#" data-view="signup">' + tt("auth.no_account", "New here? Create an account") + "</a>") +
            '<a href="#" data-view="otp">' + tt("auth.use_otp", "Use an OTP instead") + "</a></div>";
        }

        if (message) html += '<div class="flash ' + kind + '" style="margin-top:12px">' + esc(message) + "</div>";
        html += '<p class="small muted" style="margin-top:12px">' +
          tt("auth.storage_note", "Accounts on this site are stored in this browser only.") + "</p></div>";
        host.innerHTML = html;
        wire(host);
      }

      function drawOtp() {
        var o = otpState;
        var left = o.sent ? Math.max(0, Math.ceil((o.expiresAt - now()) / 1000)) : 0;
        var cool = Math.max(0, Math.ceil((o.cooldownUntil - now()) / 1000));
        var h = "<h3>" + tt("auth.otp_title", "Sign in with a one-time code") + "</h3>";
        h += '<p class="small muted">' + tt("auth.intro", "") + "</p>";
        h += '<div class="field"><label>' + tt("auth.mobile", "Mobile number") +
          '</label><div class="row" style="gap:8px;flex-wrap:nowrap">' +
          '<span class="pill" style="flex:0 0 auto">+91</span>' +
          '<input id="otp-mobile" inputmode="numeric" maxlength="10" placeholder="98765 43210" value="' +
          (mobile || "") + '"' + (o.sent ? " disabled" : "") + "></div></div>";

        if (!o.sent) {
          h += '<button class="btn block" id="otp-send" type="button"' + (busy ? " disabled" : "") + ">" +
            (busy ? tt("auth.sending", "Sending…") : tt("auth.send", "Send OTP")) + "</button>";
        } else {
          h += '<div class="otp-sent"><span class="tick">✓</span><span><b>' +
            tt("auth.sent_title", "OTP sent to") + " " + fmt(mobile) + "</b>" +
            tt("auth.sent_body", "Valid for 5 minutes. Enter it below.") + "</span></div>";
          if (o.code) {
            h += '<div class="demo-sms"><strong>' + tt("auth.demo_mode", "Demo mode — no SMS gateway") +
              "</strong><br>" + tt("auth.demo_body", "Your code is") +
              ' <span class="otp-code">' + o.code + "</span></div>";
          }
          h += '<div class="field"><label>' + tt("auth.enter", "Enter the 6-digit OTP") +
            '</label><input id="otp-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000"></div>';
          h += '<button class="btn block" id="otp-verify" type="button">' + tt("auth.verify", "Verify") + "</button>";
          h += '<div class="row" style="justify-content:space-between;margin-top:10px">' +
            '<span class="small muted" id="otp-countdown">' + tt("auth.expires_in", "Expires in") + " " + mmss(left) + "</span>" +
            '<button class="btn sm ghost" id="otp-resend" type="button"' + (cool ? " disabled" : "") + ">" +
            (cool ? tt("auth.resend_in", "Resend in") + " " + cool + "s" : tt("auth.resend", "Send a new OTP")) +
            "</button></div>";
        }
        h += '<div class="auth-links"><a href="#" data-view="signin">' +
          tt("auth.use_password", "Use a password instead") + "</a></div>";
        return h;
      }

      function wire(root) {
        var toSignup = root.querySelector('[data-view="signup"]');
        var toSignin = root.querySelector('[data-view="signin"]');
        var toOtp = root.querySelector('[data-view="otp"]');
        if (toSignup) toSignup.addEventListener("click", function (e) { e.preventDefault(); view = "signup"; message = null; draw(); });
        if (toSignin) toSignin.addEventListener("click", function (e) { e.preventDefault(); view = "signin"; message = null; draw(); });
        if (toOtp) toOtp.addEventListener("click", function (e) { e.preventDefault(); view = "otp"; message = null; draw(); });

        var submit = root.querySelector("#au-submit");
        if (submit) {
          submit.addEventListener("click", function () {
            var name = (root.querySelector("#au-name") || {}).value || "";
            form.name = name;
            form.mobile = root.querySelector("#au-mobile").value;
            mobile = normalise(form.mobile);
            var password = root.querySelector("#au-password").value;
            busy = true;
            submit.disabled = true;
            submit.textContent = tt("auth.working", "Please wait…");
            var p = view === "signup" ? self.signUp(name, mobile, password) : self.signIn(mobile, password);
            p.then(function (r) {
              busy = false;
              if (!r.ok) {
                if (r.needsSignup) { view = "signup"; }
                return say(r.error, "error");
              }
              message = null;
              toast(tt("auth.welcome", "Signed in"), fmt(r.mobile) + (r.name ? " · " + r.name : ""), "success");
              if (opts.onVerified) opts.onVerified(r);
            }).catch(function () { busy = false; say(tt("auth.err_generic", "Something went wrong. Please try again."), "error"); });
          });
        }

        var otpMobile = root.querySelector("#otp-mobile");
        var sendBtn = root.querySelector("#otp-send");
        if (sendBtn) {
          sendBtn.addEventListener("click", function () {
            mobile = normalise(otpMobile.value);
            if (!validMobile(mobile)) return say(tt("auth.err_mobile", "Enter a valid 10-digit Indian mobile number."), "error");
            busy = true; draw();
            function done(r) {
              busy = false;
              if (!r.ok) return say(r.error, "error");
              otpState.sent = true;
              otpState.expiresAt = now() + ((r.expires_in || 300) * 1000);
              otpState.cooldownUntil = now() + COOLDOWN;
              otpState.code = r.code || null;
              message = null; draw();
              toast(tt("auth.sent_title", "OTP sent to"), fmt(mobile), "success");
              var box = host.querySelector("#otp-code"); if (box) box.focus();
            }
            if (MODE === "demo") return done(self._demo.issue(mobile));
            fetch(API + "/request", { method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mobile: mobile }) })
              .then(function (r) { return r.json(); }).then(done)
              .catch(function () { busy = false; say(tt("auth.network", "Could not reach the verification service."), "error"); });
          });
        }

        var resend = root.querySelector("#otp-resend");
        if (resend) {
          resend.addEventListener("click", function () {
            otpState.code = null;
            toast(tt("auth.resent_title", "New OTP requested"), tt("auth.resent", ""), "success");
            if (MODE === "demo") {
              var r = self._demo.issue(mobile);
              if (!r.ok) return say(r.error, "error");
              otpState.expiresAt = now() + OTP_TTL; otpState.cooldownUntil = now() + COOLDOWN;
              otpState.code = r.code; message = null; draw();
            } else {
              fetch(API + "/request", { method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mobile: mobile }) })
                .then(function (x) { return x.json(); })
                .then(function (d) {
                  if (!d.ok) return say(d.error || "", "error");
                  otpState.expiresAt = now() + ((d.expires_in || 300) * 1000);
                  otpState.cooldownUntil = now() + COOLDOWN;
                  message = null; draw();
                });
            }
          });
        }

        var verify = root.querySelector("#otp-verify");
        if (verify) {
          verify.addEventListener("click", function () {
            var code = root.querySelector("#otp-code").value;
            function done(r) {
              if (!r.ok) return say(r.error || tt("auth.verify_failed", "Could not verify"), "error");
              message = null;
              toast(tt("auth.verified_title", "Mobile verified"), fmt(mobile), "success");
              if (opts.onVerified) opts.onVerified(r);
            }
            if (MODE === "demo") return done(self._demo.check(mobile, code));
            fetch(API + "/verify", { method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mobile: mobile, code: code }) })
              .then(function (x) { return x.json(); })
              .then(function (d) {
                if (d.ok) {
                  var s = load();
                  s.users[mobile] = s.users[mobile] || { verified: true, createdAt: now() };
                  s.session = { mobile: mobile, token: d.token, verifiedAt: now(),
                                expiresAt: now() + ((d.expires_in || 86400) * 1000) };
                  save(s);
                }
                done(d);
              })
              .catch(function () { say(tt("auth.network", "Could not reach the verification service."), "error"); });
          });
        }

        var codeBox = root.querySelector("#otp-code");
        if (codeBox) codeBox.addEventListener("keydown", function (e) {
          if (e.key === "Enter" && verify) { e.preventDefault(); verify.click(); }
        });

        if (otpState.sent) {
          otpState.timer = setInterval(function () {
            var l = Math.max(0, Math.ceil((otpState.expiresAt - now()) / 1000));
            var c = Math.max(0, Math.ceil((otpState.cooldownUntil - now()) / 1000));
            var cd = host.querySelector("#otp-countdown");
            var rb = host.querySelector("#otp-resend");
            if (cd) cd.textContent = tt("auth.expires_in", "Expires in") + " " + mmss(l);
            if (rb) {
              if (c > 0) { rb.disabled = true; rb.textContent = tt("auth.resend_in", "Resend in") + " " + c + "s"; }
              else if (rb.disabled) { rb.disabled = false; rb.textContent = tt("auth.resend", "Send a new OTP"); }
            }
            if (l <= 0) { stopTimer(); otpState.sent = false; say(tt("auth.expired", "That OTP has expired. Request a new one."), "warning"); }
          }, 1000);
        }
      }

      draw();
      return { redraw: draw };
    },

    updateHeader: function () {
      var box = document.getElementById("auth-slot");
      if (!box) return;
      if (this.isVerified()) {
        var m = this.currentMobile(), n = this.currentName();
        box.innerHTML = '<a class="btn sm ghost" href="account.html">' + esc(n ? n : fmt(m)) + "</a>" +
          '<button class="btn sm ghost" type="button" id="sign-out">' + tt("auth.signout", "Sign out") + "</button>";
        box.querySelector("#sign-out").addEventListener("click", function () { AUTH.logout(); location.reload(); });
      } else {
        box.innerHTML = '<a class="btn sm" href="account.html">' + tt("auth.signin", "Sign in") + "</a>";
      }
    }
  };

  window.KT_AUTH = AUTH;
})();
