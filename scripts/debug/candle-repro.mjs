import fs from 'node:fs';

/* Feedback loop for: "candle lights once, then never again even after 60s".
   Replays the exact client flow (src/lib/firebase.ts lightCandle) against
   LIVE prod rules with a throwaway anon identity:
     step1 pair-commit (counter+1 & fresh stamp)      -> expect ok   [works once]
     step2 sleep 62s (server-enforced cooldown window)
     step3 pair-commit again                          -> expect ok   [THE BUG: denied]
     step4 stamp-only retry                           -> localises which rule fails
   Run: node --use-system-ca scripts/debug/candle-repro.mjs
   Verdict line: REPRODUCED (red) / NOT REPRODUCED (green). */

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
  : String(r.body?.error?.message ?? JSON.stringify(r.body)).slice(0, 200);

const signup = await j(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${env.PUBLIC_FIREBASE_API_KEY}`,
  { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"returnSecureToken":true}' });
if (!signup.ok) { console.log('signup FAILED:', short(signup)); process.exit(1); }
const { idToken, localId: uid } = signup.body;
console.log(`anon auth: signed in (throwaway uid)\n`);

const H = { 'authorization': `Bearer ${idToken}`, 'content-type': 'application/json' };
const counterName = `projects/${PID}/databases/(default)/documents/candles/counter`;
const stampName = `projects/${PID}/databases/(default)/documents/candles/counter/lit/${uid}`;
const commit = writes => j(`${BASE}/documents:commit`,
  { method: 'POST', headers: H, body: JSON.stringify({ writes }) });

// Client-faithful write shapes (tx.set semantics: full-document updates):
const bumpWrite = n => ({ update: { name: counterName,
  fields: { count: { integerValue: String(n) } } },
  currentDocument: { exists: true } });
const stampWrite = () => ({ update: { name: stampName, fields: {} },
  updateTransforms: [{ fieldPath: 'lastLitAt', setToServerValue: 'REQUEST_TIME' }] });

const pre = await j(`${BASE}/documents/candles/counter`);
const n0 = Number(pre.body?.fields?.count?.integerValue ?? 0);
console.log(`pre : counter count=${pre.ok ? n0 : short(pre)}`);

// Step 1 — first-ever light for this uid (lit doc = create path)
const s1 = await commit([bumpWrite(n0 + 1), stampWrite()]);
console.log(`step1 first pair-commit        : ${short(s1)}`);
if (!s1.ok) { console.log('\nVERDICT: setup failed (not the reported bug)'); process.exit(2); }

// Step 2 — outwait the cooldown window (server clock decides)
console.log('step2 waiting 62s ...');
await new Promise(r => setTimeout(r, 62_000));

// Step 3 — THE BUG: re-light after the 60s window
const s3 = await commit([bumpWrite(n0 + 2), stampWrite()]);
console.log(`step3 re-pair after 62s        : ${short(s3)}${s3.ok ? '' : '   <-- EXPECTED ok'}`);

// Step 4 — localise: is the lit-doc cooldown rule itself the blocker?
let s4;
if (!s3.ok) {
  s4 = await commit([stampWrite()]);
  console.log(`step4 stamp-only retry         : ${short(s4)}${s4.ok ? '   <-- lit rule OK; pairing/counter rule suspect' : '   <-- lit cooldown rule itself rejects'}`);
}

// Diagnostics: post-state (types only, no secret material involved)
const lit = await j(`${BASE}/documents/candles/counter/lit/${uid}`, { headers: H });
const litFields = lit.body?.fields ?? {};
console.log(`\nlit doc fields: ${Object.keys(litFields).length === 0 ? '(none)' :
  Object.entries(litFields).map(([k, v]) => `${k}:${Object.keys(v)[0]}`).join(', ')}`);
const post = await j(`${BASE}/documents/candles/counter`);
const n1 = Number(post.body?.fields?.count?.integerValue ?? -1);
console.log(`post: counter count=${post.ok ? n1 : short(post)} (was ${n0})`);

console.log(`\nVERDICT: ${s3.ok ? 'NOT REPRODUCED (green)' : 'REPRODUCED (red) — re-light after cooldown denied'}`);
process.exit(s3.ok ? 0 : 1);
