import fs from 'node:fs';

/* Throwaway-style harness that exercises candle rules against LIVE prod.
   Run: node --use-system-ca scripts/debug/candle-probe.mjs
   (--use-system-ca needed behind TLS-intercepting proxies.)
   Expected when rules + client paths agree:
     A ok · B ok · C denied by design · D denied by cooldown. */

const env = Object.fromEntries(
  fs.readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const PID = env.PUBLIC_FIREBASE_PROJECT_ID;
const BASE = `https://firestore.googleapis.com/v1/projects/${PID}/databases/(default)`;

const j = async (url, opts = {}) => {
  const res = await fetch(url, opts);
  const body = await res.text();
  let parsed; try { parsed = JSON.parse(body); } catch { parsed = body; }
  return { status: res.status, ok: res.ok, body: parsed };
};
const short = r => r.ok ? 'ok'
  : String(r.body?.error?.message ?? JSON.stringify(r.body)).slice(0, 160);

// Anon identity via Identity Platform REST (same flow signInAnonymously uses)
const signup = await j(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${env.PUBLIC_FIREBASE_API_KEY}`,
  { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"returnSecureToken":true}' });
if (!signup.ok) { console.log('signup FAILED:', short(signup)); process.exit(1); }
const { idToken, localId: uid } = signup.body;
console.log(`anon auth: signed in (${idToken ? 'token ok' : 'NO TOKEN'})\n`);

const H = { 'authorization': `Bearer ${idToken}`, 'content-type': 'application/json' };
const docPath = p => `${BASE}/documents/${p}`;
const counterName = `projects/${PID}/databases/(default)/documents/candles/counter`;
const stampName = u => `projects/${PID}/databases/(default)/documents/candles/counter/lit/${u}`;

// Pre-state
const pre = await j(docPath('candles/counter'));
const preCount = pre.body?.fields?.count?.integerValue ?? 'missing';
console.log(`pre: counter ${pre.ok ? `count=${preCount}` : short(pre)}\n`);

const commit = writes => j(`${BASE}/documents:commit`,
  { method: 'POST', headers: H, body: JSON.stringify({ writes }) });
const countInc = { transform: { document: counterName,
  fieldTransforms: [{ fieldPath: 'count', increment: { integerValue: '1' } }] } };
const stampWrite = u => ({ update: { name: stampName(u), fields: {} },
  updateTransforms: [{ fieldPath: 'lastLitAt', setToServerValue: 'REQUEST_TIME' }] });

// Probe A FIRST — paired writes on a fresh uid (exact client flow):
// counter+1 AND fresh stamp
const n = Number(preCount) || 0;
let a;
if (preCount === 'missing') {
  a = await commit([
    { update: { name: counterName, fields: countField(1) } },
    stampWrite(uid),
  ]);
} else {
  a = await commit([countInc, stampWrite(uid)]);
}
console.log(`A paired counter+stamp : ${short(a)}`);

// Probe C — counter bump WITHOUT pairing (must be denied by design)
const c = await commit([countInc]);
console.log(`C unpaired bump        : ${short(c)}  ${c.ok ? '← SECURITY HOLE' : '(expected denial)'}`);

// Immediate re-pair (should hit the 60s cooldown if A succeeded)
if (preCount !== 'missing') {
  const d = await commit([countInc, stampWrite(uid)]);
  console.log(`D immediate re-pair    : ${d.ok ? 'ok — THROTTLE NOT ENFORCED!' : `(cooldown) ${short(d)}`}`);
}

// Probe B — own-uid stamp alone AFTER A: hits the lit-update cooldown branch
const b = await commit([stampWrite(uid)]);
console.log(`B restamp w/o counter  : ${b.ok ? 'ok' : `(cooldown) ${short(b)}`}`);

const post = await j(docPath('candles/counter'));
console.log(`\npost: count=${post.body?.fields?.count?.integerValue ?? '?'} (was ${preCount})`);
