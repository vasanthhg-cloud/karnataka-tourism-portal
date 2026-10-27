/* Mobile + OTP verification for the static site.
 *
 * Rules implemented here, matching the server version:
 *   - only ONE active OTP per mobile number at any time;
 *   - an OTP is valid for 5 minutes from issue;
 *   - requesting a new OTP always generates a different code and invalidates the
 *     previous one (the old code stops working immediately);
 *   - only the latest OTP can be verified; 5 wrong attempts lock that code;
 *   - a 30-second cooldown stops accidental double-sends;
 *   - booking is only allowed once the mobile is verified.
 *
 * IMPORTANT: this is a browser-side demonstration. There is no server and no SMS
 * gateway on a static site, so the code is shown on screen instead of being texted.
 * The Flask version of this project sends it by SMS and stores only a hash.
 */
(function () {
  "use strict";

  var KEY = "kt-auth";
  var OTP_TTL_MS = 5 * 60 * 1000;      // 5 minutes
  var RESEND_COOLDOWN_MS = 30 * 1000;  // 30 seconds
  var MAX_ATTEMPTS = 5;
  var SESSION_MS = 24 * 60 * 60 * 1000;

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "{}");
      s.users = s.users || {};
      return s;
    } catch (e) {
      return { users: {} };
    }
  }
  function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

  function normalise(mobile) {
    return String(mobile || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "").slice(-10);
  }
  function validMobile(m) { return /^[6-9]\d{9}$/.test(m); }
  function now() { return Date.now(); }
  function fmt(m) { return "+91 " + m.slice(0, 5) + " " + m.slice(5); }

  function toast(title, body, kind, ms) {
    var wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    // keep the message clear of the sticky header (it can be two rows tall)
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

  var AUTH = {
    toast: toast,
    OTP_TTL_MS: OTP_TTL_MS,
    MAX_ATTEMPTS: MAX_ATTEMPTS,

    isVerified: function () {
      var s = load();
      var sess = s.session;
      if (!sess || !sess.mobile) return false;
      if (sess.expiresAt && sess.expiresAt < now()) return false;
      var u = s.users[sess.mobile];
      return !!(u && u.verified);
    },

    currentMobile: function () {
      var s = load();
      return this.isVerified() ? s.session.mobile : null;
    },

    userName: function () {
      var s = load();
      var m = this.currentMobile();
      return m && s.users[m] ? s.users[m].name || "" : "";
    },

    knownUser: function (mobile) {
      var s = load();
      return !!s.users[normalise(mobile)];
    },

    /** Seconds left before another OTP may be requested (0 = allowed). */
    cooldownLeft: function (mobile) {
      var s = load();
      var otp = s.otp;
      if (!otp || otp.mobile !== normalise(mobile)) return 0;
      var left = otp.issuedAt + RESEND_COOLDOWN_MS - now();
      return left > 0 ? Math.ceil(left / 1000) : 0;
    },

    /** Seconds left on the current OTP (0 = expired / none). */
    otpSecondsLeft: function (mobile) {
      var s = load();
      var otp = s.otp;
      if (!otp || otp.mobile !== normalise(mobile)) return 0;
      var left = otp.expiresAt - now();
      return left > 0 ? Math.ceil(left / 1000) : 0;
    },

    /** Issue a new OTP. Any previous code for this number is destroyed. */
    requestOtp: function (mobileRaw, name) {
      var mobile = normalise(mobileRaw);
      if (!validMobile(mobile)) {
        return { ok: false, error: "Enter a valid 10-digit Indian mobile number." };
      }
      var s = load();
      var prev = s.otp;
      if (prev && prev.mobile === mobile) {
        var wait = Math.ceil((prev.issuedAt + RESEND_COOLDOWN_MS - now()) / 1000);
        if (wait > 0) {
          return { ok: false, error: "Please wait " + wait + "s before requesting another OTP." };
        }
      }
      var code = String(Math.floor(100000 + Math.random() * 900000));
      s.otp = {
        id: "otp_" + now() + "_" + Math.floor(Math.random() * 1e6),
        mobile: mobile,
        code: code,
        issuedAt: now(),
        expiresAt: now() + OTP_TTL_MS,
        attempts: 0
      };
      // a first-time number gets an unverified user record; an existing user keeps their data
      if (!s.users[mobile]) {
        s.users[mobile] = { name: name || "", verified: false, createdAt: now() };
      } else if (name && !s.users[mobile].name) {
        s.users[mobile].name = name;
      }
      save(s);
      return { ok: true, mobile: mobile, code: code, expiresIn: OTP_TTL_MS / 1000,
               isNewUser: !s.users[mobile].verified && !s.users[mobile].lastVerifiedAt };
    },

    /** Verify the code the user typed. Only the latest code is accepted. */
    verifyOtp: function (mobileRaw, code) {
      var mobile = normalise(mobileRaw);
      var s = load();
      var otp = s.otp;
      if (!otp || otp.mobile !== mobile) {
        return { ok: false, error: "No active OTP for this number. Request a new one." };
      }
      if (otp.expiresAt < now()) {
        return { ok: false, error: "That OTP has expired. Request a new one.", expired: true };
      }
      if (otp.attempts >= MAX_ATTEMPTS) {
        return { ok: false, error: "Too many wrong attempts. Request a new OTP.", locked: true };
      }
      if (String(code || "").trim() !== otp.code) {
        otp.attempts += 1;
        s.otp = otp;
        save(s);
        var left = MAX_ATTEMPTS - otp.attempts;
        return { ok: false, error: "Incorrect OTP. " + left + " attempt" + (left === 1 ? "" : "s") + " left." };
      }
      var u = s.users[mobile] || { name: "", createdAt: now() };
      u.verified = true;
      u.lastVerifiedAt = now();
      s.users[mobile] = u;
      delete s.otp;                      // a used OTP can never be replayed
      s.session = { mobile: mobile, verifiedAt: now(), expiresAt: now() + SESSION_MS };
      save(s);
      return { ok: true, mobile: mobile, isNewUser: !u.returning };
    },

    logout: function () {
      var s = load();
      delete s.session;
      save(s);
    },

    /* ---------------------------------------------------------------- UI ---- */
    /** Render a self-contained verification widget into `host`.
     *  opts: { compact: bool, onVerified: fn, mobile: string, note: string } */
    widget: function (host, opts) {
      opts = opts || {};
      var self = this;
      var mobile = normalise(opts.mobile || "");
      var sent = null;      // last request result
      var timer = null;

      function stop() { if (timer) { clearInterval(timer); timer = null; } }

      function draw(message, kind) {
        stop();
        var cooldown = mobile ? self.cooldownLeft(mobile) : 0;
        var left = mobile ? self.otpSecondsLeft(mobile) : 0;
        var showCode = !!(sent && sent.ok && left > 0);
        var html = "";
        html += '<div class="otp-widget">';
        if (!opts.compact) {
          html += '<h3>' + (window.KT ? KT.t("auth.title") : "Verify your mobile") + "</h3>";
        }
        html += '<p class="small muted">' + (window.KT ? KT.t("auth.intro") : "") + "</p>";
        html += '<div class="field"><label>' + (window.KT ? KT.t("auth.mobile") : "Mobile number") +
                '</label><div class="row" style="gap:8px;flex-wrap:nowrap">' +
                '<span class="pill" style="flex:0 0 auto">+91</span>' +
                '<input id="otp-mobile" inputmode="numeric" autocomplete="tel" maxlength="10" placeholder="98765 43210" value="' +
                (mobile || "") + '"' + (showCode ? " disabled" : "") + "></div></div>";
        if (!showCode) {
          html += '<button class="btn block" id="otp-send" type="button"' + (cooldown ? " disabled" : "") + ">" +
                  (cooldown ? (window.KT ? KT.t("auth.resend_in") : "Resend in") + " " + cooldown + "s"
                            : (window.KT ? KT.t("auth.send") : "Send OTP")) + "</button>";
        } else {
          html += '<div class="otp-sent"><span class="tick">✓</span><span><b>' +
                  (window.KT ? KT.t("auth.sent_title") : "OTP sent") + " " + fmt(sent.mobile) + "</b>" +
                  (window.KT ? KT.t("auth.sent_body") : "Valid for 5 minutes. Enter it below.") +
                  "</span></div>";
          html += '<div class="demo-sms"><strong>' + (window.KT ? KT.t("auth.demo_sms") : "Simulated SMS") +
                  "</strong><br>" + fmt(sent.mobile) + " · " +
                  (window.KT ? KT.t("auth.demo_body") : "Your OTP is") + " <b class=\"otp-code\">" +
                  sent.code + "</b> · " + (window.KT ? KT.t("auth.valid_for") : "valid for") + " 5 " +
                  (window.KT ? KT.t("auth.minutes") : "minutes") + "</div>";
          html += '<div class="field"><label>' + (window.KT ? KT.t("auth.enter") : "Enter the 6-digit OTP") +
                  '</label><input id="otp-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000"></div>';
          html += '<button class="btn block" id="otp-verify" type="button">' +
                  (window.KT ? KT.t("auth.verify") : "Verify") + "</button>";
          html += '<div class="row" style="justify-content:space-between;margin-top:10px">' +
                  '<span class="small muted" id="otp-countdown">' +
                  (window.KT ? KT.t("auth.expires_in") : "Expires in") + " " + mmss(left) + "</span>" +
                  '<button class="btn sm ghost" id="otp-resend" type="button"' + (cooldown ? " disabled" : "") + ">" +
                  (cooldown ? (window.KT ? KT.t("auth.resend_in") : "Resend in") + " " + cooldown + "s"
                            : (window.KT ? KT.t("auth.resend") : "Send a new OTP")) + "</button></div>";
        }
        if (message) {
          html += '<div class="flash ' + (kind || "error") + '" style="margin-top:12px">' + message + "</div>";
        }
        html += '<p class="small muted" style="margin-top:12px">' +
                (window.KT ? KT.t("auth.demo_note") : "") + "</p></div>";
        host.innerHTML = html;

        var sendBtn = host.querySelector("#otp-send");
        var resendBtn = host.querySelector("#otp-resend");
        var verifyBtn = host.querySelector("#otp-verify");
        var mobileInput = host.querySelector("#otp-mobile");

        if (sendBtn) sendBtn.addEventListener("click", function () {
          mobile = normalise(mobileInput.value);
          var r = self.requestOtp(mobile);
          if (!r.ok) return draw(r.error, "error");
          sent = r;
          draw("", "");
          toast(window.KT ? KT.t("auth.sent_title") : "OTP sent",
                fmt(r.mobile) + " · " + (window.KT ? KT.t("auth.sent_body") : "Valid for 5 minutes."),
                "success");
          var box = host.querySelector("#otp-code");
          if (box) box.focus();
        });

        if (resendBtn) resendBtn.addEventListener("click", function () {
          var r = self.requestOtp(mobile);          // always a NEW code, old one dies here
          if (!r.ok) return draw(r.error, "error");
          sent = r;
          draw(window.KT ? KT.t("auth.resent") : "A new OTP has been generated. The previous one no longer works.", "success");
          toast(window.KT ? KT.t("auth.resent_title") : "New OTP sent",
                (window.KT ? KT.t("auth.resent") : "The previous code no longer works."), "success");
        });

        if (verifyBtn) verifyBtn.addEventListener("click", function () {
          var code = host.querySelector("#otp-code").value;
          var r = self.verifyOtp(mobile, code);
          if (!r.ok) {
            draw(r.error, "error");
            toast(window.KT ? KT.t("auth.verify_failed") : "Could not verify",
                  r.error, "error", 5000);
            return;
          }
          if (opts.onVerified) opts.onVerified(r);
        });

        var codeBox = host.querySelector("#otp-code");
        if (codeBox) codeBox.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); verifyBtn.click(); }
        });

        // live countdowns
        if (mobile && (showCode || cooldown)) {
          timer = setInterval(function () {
            var l = self.otpSecondsLeft(mobile);
            var c = self.cooldownLeft(mobile);
            var cd = host.querySelector("#otp-countdown");
            var rb = host.querySelector("#otp-resend");
            if (cd) cd.textContent = (window.KT ? KT.t("auth.expires_in") : "Expires in") + " " + mmss(l);
            if (rb && c > 0) {
              rb.disabled = true;
              rb.textContent = (window.KT ? KT.t("auth.resend_in") : "Resend in") + " " + c + "s";
            } else if (rb && !rb.disabled && c === 0 && rb.textContent.indexOf("Resend in") === 0) {
              rb.disabled = false;
              rb.textContent = window.KT ? KT.t("auth.resend") : "Send a new OTP";
            }
            if (l <= 0 && showCode) {
              stop();
              draw(window.KT ? KT.t("auth.expired") : "That OTP has expired. Request a new one.", "warning");
            }
          }, 1000);
        }
      }

      function mmss(s) {
        s = Math.max(0, s | 0);
        return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
      }

      draw("", "");
      return { redraw: draw };
    },

    /** Keep the header sign-in state in sync. */
    updateHeader: function () {
      var box = document.getElementById("auth-slot");
      if (!box) return;
      var t = window.KT ? KT.t : function (k) { return k; };
      if (this.isVerified()) {
        var m = this.currentMobile();
        box.innerHTML = '<a class="btn sm ghost" href="account.html">' + fmt(m) + "</a>" +
          '<button class="btn sm ghost" type="button" id="sign-out">' + t("auth.signout") + "</button>";
        var out = box.querySelector("#sign-out");
        if (out) out.addEventListener("click", function () {
          AUTH.logout();
          location.reload();
        });
      } else {
        box.innerHTML = '<a class="btn sm" href="account.html">' + t("auth.signin") + "</a>";
      }
    }
  };

  window.KT_AUTH = AUTH;
})();
