/**
 * Karnataka Tourism Portal — OTP service (Cloudflare Worker)
 *
 * A static website cannot send SMS. This worker is the smallest piece of server
 * that can: it issues the OTP, texts it to the number, and verifies it. Deploy it
 * once (free tier is enough) and paste its URL into the site's assets/js/config.js.
 *
 * Rules implemented:
 *   - one active OTP per mobile number; issuing a new one invalidates the old one;
 *   - 5-minute expiry;
 *   - only the newest OTP verifies, and each OTP is single-use;
 *   - 5 wrong attempts burn the code; 30 s resend cooldown; 5 requests/hour per number;
 *   - only a salted hash of the code is stored, never the code itself;
 *   - the code is never returned to the browser.
 *
 * Bindings (see wrangler.toml / README):
 *   OTP_KV        KV namespace for OTP records and rate counters
 *   OTP_SECRET    long random string used to sign session tokens
 *   ALLOWED_ORIGIN  e.g. https://vasanthhg-cloud.github.io
 *   SMS_PROVIDER  msg91 | fast2sms | twilio  (leave unset to log only)
 *   MSG91_AUTH_KEY, MSG91_SENDER_ID, MSG91_TEMPLATE_ID
 *   FAST2SMS_API_KEY
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
 */

const OTP_TTL_SECONDS = 300;          // 5 minutes
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_ATTEMPTS = 5;
const MAX_PER_HOUR = 5;
const SESSION_TTL_SECONDS = 24 * 3600;
const MOBILE_RE = /^[6-9]\d{9}$/;

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    try {
      if (url.pathname === "/health") return json({ ok: true, provider: env.SMS_PROVIDER || "none" }, 200, cors);
      if (url.pathname === "/request" && request.method === "POST") return await handleRequest(request, env, cors);
      if (url.pathname === "/verify" && request.method === "POST") return await handleVerify(request, env, cors);
      return json({ ok: false, error: "not found" }, 404, cors);
    } catch (e) {
      return json({ ok: false, error: "server error" }, 500, cors);
    }
  },
};

/* ------------------------------------------------------------------ helpers */
function corsHeaders(request, env) {
  const allowed = (env.ALLOWED_ORIGIN || "*").split(",").map((s) => s.trim());
  const origin = request.headers.get("Origin") || "";
  const allow = allowed.includes("*") || allowed.includes(origin) ? origin || "*" : allowed[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body, status, cors) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

function normaliseMobile(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  return d.slice(-10);
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomCode() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(n).padStart(6, "0");
}

function randomSalt() {
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function signToken(payload, secret) {
  const body = btoa(JSON.stringify(payload));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const sig = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return body + "." + sig;
}

async function readBody(request) {
  try { return await request.json(); } catch (e) { return {}; }
}

/* --------------------------------------------------------------------- SMS */
async function sendSms(env, mobile, code) {
  const provider = (env.SMS_PROVIDER || "").toLowerCase();
  const message = `Your Karnataka Tourism verification code is ${code}. Valid for 5 minutes. Do not share it.`;

  if (provider === "msg91") {
    if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID) return { ok: false, detail: "msg91 not configured" };
    // MSG91 flow API with a DLT-approved template; template must contain ##OTP##
    const r = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: { authkey: env.MSG91_AUTH_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: env.MSG91_TEMPLATE_ID,
        sender: env.MSG91_SENDER_ID || "KATOUR",
        short_url: "0",
        recipients: [{ mobiles: "91" + mobile, OTP: code }],
      }),
    });
    return { ok: r.ok, detail: "msg91 " + r.status };
  }

  if (provider === "fast2sms") {
    if (!env.FAST2SMS_API_KEY) return { ok: false, detail: "fast2sms not configured" };
    const r = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: { authorization: env.FAST2SMS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        route: "otp", variables_values: code, numbers: mobile,
        flash: 0, sender_id: env.FAST2SMS_SENDER_ID || "",
      }),
    });
    return { ok: r.ok, detail: "fast2sms " + r.status };
  }

  if (provider === "twilio") {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM)
      return { ok: false, detail: "twilio not configured" };
    const auth = "Basic " + btoa(env.TWILIO_ACCOUNT_SID + ":" + env.TWILIO_AUTH_TOKEN);
    const body = new URLSearchParams({ To: "+91" + mobile, From: env.TWILIO_FROM, Body: message });
    const r = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      { method: "POST", headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" }, body });
    return { ok: r.ok, detail: "twilio " + r.status };
  }

  // No provider configured: log the code server-side so the flow can be tested.
  console.log(`[otp] no SMS provider configured — code for +91${mobile} is ${code}`);
  return { ok: true, detail: "console-only" };
}

/* ----------------------------------------------------------------- handlers */
async function handleRequest(request, env, cors) {
  const body = await readBody(request);
  const mobile = normaliseMobile(body.mobile);
  if (!MOBILE_RE.test(mobile)) return json({ ok: false, error: "Enter a valid 10-digit Indian mobile number." }, 400, cors);

  const now = Math.floor(Date.now() / 1000);
  const key = "otp:" + mobile;
  const rateKey = "rate:" + mobile;

  const existing = await env.OTP_KV.get(key, "json");
  if (existing && now - existing.createdAt < RESEND_COOLDOWN_SECONDS) {
    const wait = RESEND_COOLDOWN_SECONDS - (now - existing.createdAt);
    return json({ ok: false, error: `Please wait ${wait}s before requesting another OTP.`, cooldown: wait }, 429, cors);
  }
  const hourly = Number((await env.OTP_KV.get(rateKey)) || 0);
  if (hourly >= MAX_PER_HOUR)
    return json({ ok: false, error: "Too many OTP requests for this number. Try again in an hour." }, 429, cors);

  // issuing a new OTP replaces the record, so the previous code can never verify
  const salt = randomSalt();
  const code = randomCode();
  await env.OTP_KV.put(key, JSON.stringify({
    hash: await sha256Hex(code + mobile + salt),
    salt, createdAt: now, expiresAt: now + OTP_TTL_SECONDS, attempts: 0,
  }), { expirationTtl: 900 });
  await env.OTP_KV.put(rateKey, String(hourly + 1), { expirationTtl: 3600 });

  const sent = await sendSms(env, mobile, code);
  if (!sent.ok) {
    return json({ ok: false, error: "We could not send the SMS just now. Please try again in a moment.",
                  detail: sent.detail }, 502, cors);
  }
  return json({ ok: true, mobile, expires_in: OTP_TTL_SECONDS, delivered: sent.detail !== "console-only" }, 200, cors);
}

async function handleVerify(request, env, cors) {
  const body = await readBody(request);
  const mobile = normaliseMobile(body.mobile);
  const code = String(body.code || "").replace(/\D/g, "");
  if (!MOBILE_RE.test(mobile)) return json({ ok: false, error: "Invalid mobile number." }, 400, cors);

  const key = "otp:" + mobile;
  const rec = await env.OTP_KV.get(key, "json");
  const now = Math.floor(Date.now() / 1000);
  if (!rec) return json({ ok: false, error: "No active OTP for this number. Request a new one." }, 400, cors);
  if (rec.expiresAt < now) {
    await env.OTP_KV.delete(key);
    return json({ ok: false, error: "That OTP has expired. Request a new one.", expired: true }, 400, cors);
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    await env.OTP_KV.delete(key);
    return json({ ok: false, error: "Too many wrong attempts. Request a new OTP.", locked: true }, 429, cors);
  }

  const expected = await sha256Hex(code + mobile + rec.salt);
  if (expected !== rec.hash) {
    rec.attempts += 1;
    await env.OTP_KV.put(key, JSON.stringify(rec), { expirationTtl: 900 });
    const left = MAX_ATTEMPTS - rec.attempts;
    return json({ ok: false, error: `Incorrect OTP. ${left} attempt${left === 1 ? "" : "s"} left.` }, 400, cors);
  }

  await env.OTP_KV.delete(key);       // single use
  const token = await signToken({ mobile, exp: now + SESSION_TTL_SECONDS }, env.OTP_SECRET || "dev-secret");
  return json({ ok: true, mobile, token, expires_in: SESSION_TTL_SECONDS }, 200, cors);
}
