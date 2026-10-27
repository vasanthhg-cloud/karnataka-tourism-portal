// minimal Web API shims (the sandbox cannot allocate undici's WASM parser)
class Req {
  constructor(url, init = {}) {
    this.url = url; this.method = init.method || 'GET';
    this._body = init.body; this._headers = init.headers || {};
    const h = {}; for (const k of Object.keys(this._headers)) h[k.toLowerCase()] = this._headers[k];
    this.headers = { get: (k) => h[String(k).toLowerCase()] ?? null };
  }
  async json() { return JSON.parse(this._body || '{}'); }
}
class Res {
  constructor(body, init = {}) {
    this._body = body || ''; this.status = init.status || 200; this.headers = init.headers || {};
  }
  async json() { return JSON.parse(this._body || '{}'); }
  async text() { return String(this._body); }
}
globalThis.Request = Req;
globalThis.Response = Res;
const worker = (await import('./worker.mjs')).default;

const store = new Map();
const env = {
  OTP_KV: {
    async get(k, type) { const v = store.get(k); return v ? (type === 'json' ? JSON.parse(v) : v) : null; },
    async put(k, v) { store.set(k, v); },
    async delete(k) { store.delete(k); },
  },
  OTP_SECRET: 'test-secret',
  ALLOWED_ORIGIN: '*',
  SMS_PROVIDER: '',
};

let lastCode = null;
const origLog = console.log;
console.log = (...a) => {
  const text = String(a[0] || '');
  const m = text.match(/is (\d{6})/);
  if (m) { lastCode = m[1]; return; }        // swallow the worker's dev log only
  origLog(...a);
};

function req(path, body, method = 'POST') {
  return worker.fetch(new Request('https://otp.test' + path, {
    method, headers: { 'Content-Type': 'application/json', Origin: 'https://site.test' },
    body: body ? JSON.stringify(body) : undefined,
  }), env);
}
const call = async (p, b) => { const r = await req(p, b); return { status: r.status, body: await r.json() }; };

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`); };

let r = await call('/health');
check('health', r.status === 200);

r = await call('/request', { mobile: '12345' });
check('invalid mobile rejected', r.status === 400, r.body.error);

r = await call('/request', { mobile: '9876543210' });
const code1 = lastCode;
check('request ok, code generated', r.status === 200 && r.body.ok && /^\d{6}$/.test(code1));
check('code is NOT returned to the browser', !('code' in r.body) && !JSON.stringify(r.body).includes(code1));

r = await call('/request', { mobile: '9876543210' });
check('resend blocked inside 30s cooldown', r.status === 429, r.body.error);

// rewind the record to allow a new request
const rec = JSON.parse(store.get('otp:9876543210')); rec.createdAt -= 40; store.set('otp:9876543210', JSON.stringify(rec));
r = await call('/request', { mobile: '9876543210' });
const code2 = lastCode;
check('resend after cooldown gives a different code', r.status === 200 && code1 !== code2, `${code1} -> ${code2}`);

r = await call('/verify', { mobile: '9876543210', code: code1 });
check('old code rejected after resend', r.status === 400 && /Incorrect/.test(r.body.error), r.body.error);

r = await call('/verify', { mobile: '9876543210', code: '000000' });
check('wrong code counts an attempt', r.status === 400 && /attempt/.test(r.body.error), r.body.error);

r = await call('/verify', { mobile: '9876543210', code: code2 });
check('newest code verifies', r.status === 200 && r.body.ok && !!r.body.token);

r = await call('/verify', { mobile: '9876543210', code: code2 });
check('code cannot be replayed', r.status === 400, r.body.error);

// expiry
await call('/request', { mobile: '9123456789' });
const codeE = lastCode;
const recE = JSON.parse(store.get('otp:9123456789')); recE.expiresAt = Math.floor(Date.now() / 1000) - 5;
store.set('otp:9123456789', JSON.stringify(recE));
r = await call('/verify', { mobile: '9123456789', code: codeE });
check('expired OTP rejected', r.status === 400 && r.body.expired === true, r.body.error);

// attempt lock
await call('/request', { mobile: '9988776655' });
for (let i = 0; i < 5; i++) await call('/verify', { mobile: '9988776655', code: '11111' + i });
r = await call('/verify', { mobile: '9988776655', code: '000000' });
check('locked after 5 wrong attempts', r.status === 429 && r.body.locked === true, r.body.error);

// hourly cap
for (let i = 0; i < 4; i++) {
  const k = 'rate:9000000000'; store.set(k, String(i + 2));
}
r = await call('/request', { mobile: '9000000000' });
check('hourly request cap enforced', r.status === 429, r.body.error);

console.log = origLog;
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
