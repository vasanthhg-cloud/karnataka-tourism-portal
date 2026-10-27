/* Mobile + OTP sign-in for the Karnataka Tourism portal.
 *
 * The OTP is generated and verified by a small backend (see otp-service/), which
 * also sends the SMS. The browser never sees the code: it only posts the mobile
 * number, then the code the user typed.
 *
 * Set the service URL in assets/js/config.js:
 *     window.KT_OTP_API = "https://karnataka-otp.<your-subdomain>.workers.dev";
 *
 * Rules enforced by the service, mirrored in the UI:
 *   - one active OTP per number, valid 5 minutes;
 *   - requesting a new OTP invalidates the previous one;
 *   - only the newest OTP verifies, once;
 *   - 5 wrong attempts burn the code; 30 s resend cooldown.
 *
 * Until KT_OTP_API is set, sign-in is switched off rather than faked.
 */
(function () {
  "use strict";

  var KEY = "kt-auth";
  var SESSION_MS = 24 * 60 * 60 * 1000;
  var API = (window.KT_OTP_API || "").replace(/\/+$/, "");

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
  function tt(key, fallback) {
    return window.KT ? KT.t(key) : fallback;
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

  var AUTH = {
    configured: !!API,
    toast: toast,

    isVerified: function () {
      var s = load();
      var sess = s.session;
      if (!sess || !sess.mobile || !sess.token) return false;
      if (sess.expiresAt && sess.expiresAt < now()) return false;
      return true;
    },
    currentMobile: function () {
      var s = load();
      return this.isVerified() ? s.session.mobile : null;
    },
    logout: function () {
      var s = load();
      delete s.session;
      save(s);
    },

    /* ------------------------------------------------------------- widget -- */
    widget: function (host, opts) {
      opts = opts || {};
      var self = this;
      var mobile = normalise(opts.mobile || "");
      var state = "idle";       // idle | sending | sent | verifying
      var expiresAt = 0;
      var cooldownUntil = 0;
      var timer = null;

      function stop() { if (timer) { clearInterval(timer); timer = null; } }

      function draw(message, kind) {
        stop();

        if (!self.configured) {
          host.innerHTML = '<div class="otp-widget">' +
            '<h3>' + tt("auth.title", "Verify your mobile number") + "</h3>" +
            '<div class="flash warning">' + tt("auth.not_configured",
              "Mobile sign-in is not connected yet. The site owner needs to deploy the OTP service " +
              "(otp-service/) and set its URL in assets/js/config.js. Until then, booking stays closed.") +
            "</div></div>";
          return;
        }

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
        html += '<p class="small muted" style="margin-top:12px">' + tt("auth.demo_note", "") + "</p></div>";
        host.innerHTML = html;

        var sendBtn = host.querySelector("#otp-send");
        var resendBtn = host.querySelector("#otp-resend");
        var verifyBtn = host.querySelector("#otp-verify");
        var mobileInput = host.querySelector("#otp-mobile");

        function requestOtp(isResend) {
          var m = normalise(mobileInput ? mobileInput.value : mobile);
          if (!validMobile(m)) return draw(tt("auth.err_mobile", "Enter a valid 10-digit Indian mobile number."), "error");
          mobile = m;
          state = "sending";
          draw("", "");
          post("/request", { mobile: m }).then(function (res) {
            var d = res.data || {};
            if (!res.status || res.status >= 400 || !d.ok) {
              state = isResend && expiresAt > now() ? "sent" : "idle";
              return draw(d.error || tt("auth.send_failed",
                "We could not send the SMS just now. Please try again."), "error");
            }
            state = "sent";
            expiresAt = now() + ((d.expires_in || 300) * 1000);
            cooldownUntil = now() + 30000;
            draw("", "");
            toast(tt("auth.sent_title", "OTP sent to"), fmt(m) + " · " +
                  tt("auth.sent_body", "Valid for 5 minutes."), "success");
            var box = host.querySelector("#otp-code");
            if (box) box.focus();
          }).catch(function () {
            state = "idle";
            draw(tt("auth.network", "Could not reach the verification service. Check your connection and try again."), "error");
          });
        }

        if (sendBtn) sendBtn.addEventListener("click", function () { requestOtp(false); });
        if (resendBtn) resendBtn.addEventListener("click", function () {
          toast(tt("auth.resent_title", "New OTP requested"), tt("auth.resent", ""), "success");
          requestOtp(true);
        });

        if (verifyBtn) verifyBtn.addEventListener("click", function () {
          var code = host.querySelector("#otp-code").value;
          state = "verifying";
          draw("", "");
          post("/verify", { mobile: mobile, code: code }).then(function (res) {
            var d = res.data || {};
            if (!d.ok) {
              state = "sent";
              draw(d.error || tt("auth.verify_failed", "Could not verify"), "error");
              toast(tt("auth.verify_failed", "Could not verify"), d.error || "", "error", 5000);
              return;
            }
            var s = load();
            s.users[mobile] = { verified: true, verifiedAt: now() };
            s.session = { mobile: mobile, token: d.token, verifiedAt: now(),
                          expiresAt: now() + ((d.expires_in || 86400) * 1000) };
            save(s);
            toast(tt("auth.verified_title", "Mobile verified"), fmt(mobile), "success");
            if (opts.onVerified) opts.onVerified({ mobile: mobile });
          }).catch(function () {
            state = "sent";
            draw(tt("auth.network", "Could not reach the verification service. Check your connection and try again."), "error");
          });
        });

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

      function mmss(s) {
        s = Math.max(0, s | 0);
        return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
      }

      draw("", "");
      return { redraw: draw };
    },

    /* ------------------------------------------------------------- header -- */
    updateHeader: function () {
      var box = document.getElementById("auth-slot");
      if (!box) return;
      if (this.isVerified()) {
        var m = this.currentMobile();
        box.innerHTML = '<a class="btn sm ghost" href="account.html">' + fmt(m) + "</a>" +
          '<button class="btn sm ghost" type="button" id="sign-out">' + tt("auth.signout", "Sign out") + "</button>";
        box.querySelector("#sign-out").addEventListener("click", function () {
          AUTH.logout();
          location.reload();
        });
      } else {
        box.innerHTML = '<a class="btn sm" href="account.html">' + tt("auth.signin", "Sign in") + "</a>";
      }
    }
  };

  window.KT_AUTH = AUTH;
})();
