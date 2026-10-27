# OTP service (Cloudflare Worker)

The website is static, so it cannot send SMS by itself. This worker is the smallest
piece of server that can: it generates the OTP, sends it to the phone, and verifies it.
The browser never receives the code.

## What it enforces

| Rule | Where |
|---|---|
| one active OTP per number | the record is overwritten on every request |
| 5-minute expiry | `expiresAt = createdAt + 300` |
| resend invalidates the old code | the new record replaces the old one |
| only the newest verifies, once | verified records are deleted |
| 5 wrong attempts burn the code | `attempts` counter in the record |
| 30 s resend cooldown, 5 requests/hour | per-number counters in KV |
| no plain-text codes | only SHA-256(code + mobile + salt) is stored |
| signed session | HMAC token returned on success, 24 h |

## Deploy (about five minutes, free tier)

```bash
npm install -g wrangler
wrangler login
wrangler kv namespace create OTP_KV          # copy the id into wrangler.toml
wrangler secret put OTP_SECRET               # any long random string
wrangler secret put MSG91_AUTH_KEY           # from your MSG91 dashboard
wrangler secret put MSG91_TEMPLATE_ID        # DLT-approved OTP template
wrangler deploy
```

Then put the worker URL into the site:

```js
// assets/js/config.js
window.KT_OTP_API = "https://karnataka-otp.<your-subdomain>.workers.dev";
```

### SMS providers

Set `SMS_PROVIDER` in `wrangler.toml` and the matching secrets:

- **msg91** — `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` (DLT-approved flow template that
  contains `##OTP##`), `MSG91_SENDER_ID`.
- **fast2sms** — `FAST2SMS_API_KEY`, optional `FAST2SMS_SENDER_ID`.
- **twilio** — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`.

For Indian numbers, transactional SMS needs **DLT registration** (entity + template)
with your provider before messages are delivered. That registration is in your name,
so it has to be done on your account — the code here cannot do it for you.

With no provider configured the worker writes the code to its log (`wrangler tail`)
and returns success; nothing is texted and nothing is shown on the website.

## Test locally

```bash
node test_worker.mjs
```

13 checks covering cooldown, rotation, expiry, replay, attempt lock and the hourly cap.
