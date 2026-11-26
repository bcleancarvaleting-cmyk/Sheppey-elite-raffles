// Sheppey Elite Raffles – web server. Zero dependencies (Node 18+).
'use strict';
process.env.TZ = process.env.TZ || 'Europe/London';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { createApp, emptyDb } = require('./core');
const TOWNS = require('./public/towns.js');

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const PRIVATE_DIR = path.join(DATA_DIR, 'private');
const PUBLIC_DIR = path.join(__dirname, 'public');
const ADMIN_PATH = '/' + String(process.env.ADMIN_PATH || 'admin').replace(/[^a-z0-9-]/gi, '');
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
for (const d of [DATA_DIR, UPLOAD_DIR, BACKUP_DIR, PRIVATE_DIR]) fs.mkdirSync(d, { recursive: true, mode: 0o700 });

// ---------- secrets (bank-detail encryption key + push keys), created once and kept in DATA_DIR ----------
function secretFile(name, make) {
  const f = path.join(DATA_DIR, name);
  if (!fs.existsSync(f)) fs.writeFileSync(f, make(), { mode: 0o600 });
  return fs.readFileSync(f, 'utf8');
}
const DATA_KEY = process.env.DATA_KEY ? Buffer.from(process.env.DATA_KEY, 'base64') : Buffer.from(secretFile('data.key', () => crypto.randomBytes(32).toString('base64')), 'base64');
if (DATA_KEY.length !== 32) { console.error('DATA_KEY must be 32 bytes, base64-encoded.'); process.exit(1); }
const VAPID = JSON.parse(secretFile('vapid.json', () => { const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' }); return JSON.stringify(privateKey.export({ format: 'jwk' })); }));
const b64u = b => Buffer.from(b).toString('base64url');
const VAPID_PRIV = crypto.createPrivateKey({ key: VAPID, format: 'jwk' });
const VAPID_PUB = b64u(Buffer.concat([Buffer.from([4]), Buffer.from(VAPID.x, 'base64url'), Buffer.from(VAPID.y, 'base64url')]));
const VAPID_SUB = process.env.VAPID_SUBJECT || 'mailto:' + (process.env.ADMIN_EMAIL || 'admin@example.com');

function hmac(key, data) { return crypto.createHmac('sha256', key).update(data).digest(); }
async function sendPush(sub, payload) {
  const ep = new URL(sub.endpoint);
  const jwtHead = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const jwtBody = b64u(JSON.stringify({ aud: ep.origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: VAPID_SUB }));
  const sig = crypto.sign('sha256', Buffer.from(jwtHead + '.' + jwtBody), { key: VAPID_PRIV, dsaEncoding: 'ieee-p1363' });
  const jwt = jwtHead + '.' + jwtBody + '.' + b64u(sig);
  // RFC 8291 aes128gcm encryption
  const uaPub = Buffer.from(sub.keys.p256dh, 'base64url'), auth = Buffer.from(sub.keys.auth, 'base64url');
  const ecdh = crypto.createECDH('prime256v1'); const asPub = ecdh.generateKeys();
  const shared = ecdh.computeSecret(uaPub);
  const prkKey = hmac(auth, shared);
  const ikm = hmac(prkKey, Buffer.concat([Buffer.from('WebPush: info\0'), uaPub, asPub, Buffer.from([1])]));
  const salt = crypto.randomBytes(16); const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0'), Buffer.from([1])])).subarray(0, 16);
  const nonce = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), Buffer.from([1])])).subarray(0, 12);
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ct = Buffer.concat([c.update(Buffer.concat([Buffer.from(JSON.stringify(payload)), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  const body = Buffer.concat([salt, rs, Buffer.from([asPub.length]), asPub, ct]);
  const r = await fetch(sub.endpoint, { method: 'POST', body, headers: { TTL: '86400', 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', Urgency: 'normal', Authorization: `vapid t=${jwt}, k=${VAPID_PUB}` } });
  if (r.status === 404 || r.status === 410) return 'gone';
  return r.ok;
}

// ---------- DNA Payments (card) – off unless DNA_CLIENT_ID etc. are set and "Card payments" is ticked in Settings ----------
const DNA_ENV = process.env.DNA_CLIENT_ID && process.env.DNA_CLIENT_SECRET && process.env.DNA_TERMINAL_ID ? {
  id: process.env.DNA_CLIENT_ID, secret: process.env.DNA_CLIENT_SECRET, terminal: process.env.DNA_TERMINAL_ID, test: process.env.DNA_TEST !== '0'
} : null;
async function dnaToken(D, order) {
  const amount = ((order.due ?? order.total) / 100).toFixed(2);
  const form = new URLSearchParams({ grant_type: 'client_credentials', scope: 'payment integration_hosted', client_id: D.id, client_secret: D.secret, invoiceId: order.ref, amount, currency: 'GBP', terminal: D.terminal });
  const r = await fetch(D.test ? 'https://test-oauth.dnapayments.com/oauth2/token' : 'https://oauth.dnapayments.com/oauth2/token', { method: 'POST', body: form, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (!r.ok) throw new Error('DNA token ' + r.status); return r.json();
}
// keys come from the server environment, or from Admin → Settings → Card payments (stored encrypted)
async function dnaStart({ order, user, origin, cfg }) {
  const DNA = cfg || DNA_ENV; if (!DNA) throw new Error('DNA keys missing');
  const amount = ((order.due ?? order.total) / 100).toFixed(2);
  const form = new URLSearchParams({ grant_type: 'client_credentials', scope: 'payment integration_hosted', client_id: DNA.id, client_secret: DNA.secret, invoiceId: order.ref, amount, currency: 'GBP', terminal: DNA.terminal });
  const r = await fetch(DNA.test ? 'https://test-oauth.dnapayments.com/oauth2/token' : 'https://oauth.dnapayments.com/oauth2/token', { method: 'POST', body: form, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  if (!r.ok) throw new Error('DNA token ' + r.status);
  const auth = await r.json();
  const addr = { firstName: user.first, lastName: user.last, addressLine1: user.address.line1, postalCode: user.address.postcode, city: user.address.town, country: 'GB' };
  return {
    script: DNA.test ? 'https://test-pay.dnapayments.com/checkout/payment-api.js' : 'https://pay.dnapayments.com/checkout/payment-api.js',
    paymentData: { invoiceId: order.ref, description: 'Sheppey Elite Raffles ' + order.ref, amount: Number(amount), currency: 'GBP', transactionType: 'SALE',
      paymentSettings: { terminalId: DNA.terminal, returnUrl: origin + '/#paid-' + order.ref, failureReturnUrl: origin + '/#payfail-' + order.ref, callbackUrl: origin + '/api/pay/dna/callback', failureCallbackUrl: origin + '/api/pay/dna/callback' },
      customerDetails: { email: user.email, mobilePhone: user.phone, firstName: user.first, lastName: user.last, billingAddress: addr, deliveryDetails: { deliveryTimeFrame: 'ElectronicDelivery', deliveryAddress: addr } },
      auth }
  };
}

// DNA payment result check – exactly as DNA's "Payment Result" guide describes:
// HMAC-SHA256 (key = client_secret, UTF-8) over id + amount + currency + invoiceId + errorCode + success, Base64,
// compared in constant time; then the result must match the order it claims to pay.
function dnaSignatureOk(b, cfg) {
  const DNA = cfg || DNA_ENV; if (!DNA) return false;
  const isStr = v => typeof v === 'string' && v.length > 0;
  if (!isStr(b.signature) || !isStr(b.id) || !isStr(b.invoiceId)) return false;
  const zeroVerify = b.cardTokenId && !Number(b.amount) && !b.currency;
  if (!zeroVerify && !isStr(b.currency)) return false;
  const amt = b.amount == null || b.amount === '' ? '0' : String(Number(b.amount)); // plain decimal: 25.67, 65
  const ok = b.success === true || b.success === 'true' ? 'true' : 'false', ec = String(b.errorCode == null || b.errorCode === '' ? 0 : Number(b.errorCode));
  const msg = zeroVerify ? `${b.id}${b.invoiceId}${b.cardTokenId}${ec}${ok}` : `${b.id}${amt}${b.currency || ''}${b.invoiceId}${ec}${ok}`;
  const want = Buffer.from(crypto.createHmac('sha256', Buffer.from(DNA.secret, 'utf8')).update(Buffer.from(msg, 'utf8')).digest('base64'));
  const got = Buffer.from(String(b.signature));
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}
async function dnaVerify(b, order, cfg) {
  if (!dnaSignatureOk(b, cfg)) { console.warn('DNA callback: bad signature for', b.invoiceId); return false; }
  if (!(b.success === true || b.success === 'true')) return false;
  if (b.invoiceId !== order.ref) return false;
  if (String(b.currency || '').toUpperCase() !== 'GBP') return false;
  const due = (order.due ?? order.total) / 100;
  if (Math.abs(Number(b.amount) - due) > 0.001) { console.warn('DNA callback: amount', b.amount, 'does not match order', order.ref, due); return false; }
  return true;
}

// ---------- crypto helpers ----------
const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => e ? rej(e) : res(k)));
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32decode(s) {
  let bits = '', out = [];
  for (const c of s.replace(/=+$/, '').toUpperCase()) { const v = B32.indexOf(c); if (v < 0) continue; bits += v.toString(2).padStart(5, '0'); }
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
function totp(secret, step) {
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(step));
  const hm = crypto.createHmac('sha1', b32decode(secret)).update(msg).digest();
  const off = hm[hm.length - 1] & 15;
  return String(((hm.readUInt32BE(off) & 0x7fffffff) % 1e6)).padStart(6, '0');
}
const usedCodes = new Map();

const helpers = {
  now: () => Date.now(),
  rand: n => crypto.randomBytes(n),
  randInt: max => crypto.randomInt(max),
  sha: async t => crypto.createHash('sha256').update(String(t)).digest('hex'),
  hmac: async (keyHex, msg) => crypto.createHmac('sha256', Buffer.from(String(keyHex), 'hex')).update(String(msg)).digest('hex'),
  // drand quicknet public randomness – waits for the named round, tries several mirrors
  beacon: async round => {
    const chain = '52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971', due = (1692803367 + (round - 1) * 3) * 1000;
    const wait = due - Date.now() + 400; if (wait > 0) await new Promise(r => setTimeout(r, Math.min(wait, 15000)));
    for (const host of ['https://api.drand.sh', 'https://api2.drand.sh', 'https://api3.drand.sh', 'https://drand.cloudflare.com']) {
      for (let i = 0; i < 3; i++) {
        try { const r = await fetch(`${host}/${chain}/public/${round}`, { signal: AbortSignal.timeout(4000) }); if (r.ok) { const j = await r.json(); if (j.round === round && /^[0-9a-f]{64}$/.test(j.randomness)) return j; } } catch { }
        await new Promise(r => setTimeout(r, 1000));
      } }
    return null;
  },
  hash: async pw => { const salt = crypto.randomBytes(16); return 's1$' + salt.toString('hex') + '$' + (await scrypt(String(pw), salt)).toString('hex'); },
  verify: async (pw, stored) => {
    const [v, salt, h] = String(stored || '').split('$'); if (v !== 's1' || !salt || !h) return false;
    const k = await scrypt(String(pw), Buffer.from(salt, 'hex')); const hb = Buffer.from(h, 'hex');
    return hb.length === k.length && crypto.timingSafeEqual(hb, k);
  },
  supports2fa: true,
  totpSecret: () => Array.from(crypto.randomBytes(20), b => B32[b % 32]).join(''),
  totpVerify: async (secret, code) => {
    code = String(code).replace(/\s/g, ''); if (!/^\d{6}$/.test(code)) return false;
    const step = Math.floor(Date.now() / 30000);
    for (const d of [-1, 0, 1]) {
      if (crypto.timingSafeEqual(Buffer.from(totp(secret, step + d)), Buffer.from(code))) {
        const key = secret + ':' + code; if (usedCodes.has(key)) return false; // no replay
        usedCodes.set(key, Date.now()); if (usedCodes.size > 1000) usedCodes.clear();
        return true;
      }
    }
    return false;
  },
  towns: new Set(TOWNS),
  encrypt: async text => { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', DATA_KEY, iv); const ct = Buffer.concat([c.update(text, 'utf8'), c.final()]); return 'g1$' + iv.toString('base64') + '$' + ct.toString('base64') + '$' + c.getAuthTag().toString('base64'); },
  decrypt: async enc => { const [v, iv, ct, tag] = String(enc).split('$'); if (v !== 'g1') throw new Error('bad'); const d = crypto.createDecipheriv('aes-256-gcm', DATA_KEY, Buffer.from(iv, 'base64')); d.setAuthTag(Buffer.from(tag, 'base64')); return Buffer.concat([d.update(Buffer.from(ct, 'base64')), d.final()]).toString('utf8'); },
  storePrivate: async (_db, dataUrl) => {
    const mm = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl); if (!mm) throw new Error('bad image');
    const buf = Buffer.from(mm[2], 'base64'); if (buf.length > 6 * 1024 * 1024) throw new Error('too big');
    const key = crypto.randomBytes(16).toString('hex') + '.' + (mm[1] === 'jpeg' ? 'jpg' : mm[1]);
    const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', DATA_KEY, iv);
    fs.writeFileSync(path.join(PRIVATE_DIR, key + '.enc'), Buffer.concat([iv, c.update(buf), c.final(), c.getAuthTag()]), { mode: 0o600 });
    return key;
  },
  readPrivate: async (_db, key) => {
    if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(key)) throw new Error('bad key');
    const raw = fs.readFileSync(path.join(PRIVATE_DIR, key + '.enc'));
    const d = crypto.createDecipheriv('aes-256-gcm', DATA_KEY, raw.subarray(0, 12)); d.setAuthTag(raw.subarray(raw.length - 16));
    const buf = Buffer.concat([d.update(raw.subarray(12, raw.length - 16)), d.final()]);
    return `data:image/${key.endsWith('png') ? 'png' : key.endsWith('webp') ? 'webp' : 'jpeg'};base64,${buf.toString('base64')}`;
  },
  sendPush, vapidPublic: VAPID_PUB,
  dnaStart, dnaEnv: !!DNA_ENV, dnaSigned: async (b, cfg) => dnaSignatureOk(b, cfg),
  dnaTest: async cfg => { const t = await dnaToken(cfg || DNA_ENV, { ref: 'TEST-' + Date.now(), due: 100 }); return !!(t && t.access_token); },
  dnaVerify,

  kent: new Set(TOWNS.KENT || [])
};
const app = createApp(helpers);

// ---------- storage ----------
let db;
function load() {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) {
    if (fs.existsSync(DB_FILE)) { console.error('Could not read db.json – refusing to start so nothing is overwritten.', e.message); process.exit(1); }
    db = emptyDb();
  }
  const base = emptyDb();
  for (const k of Object.keys(base)) if (db[k] === undefined) db[k] = base[k];
  db.settings = { ...base.settings, ...db.settings };
  if (!db.settings._v15) { if (Number(db.settings.reservationHours) === 48) db.settings.reservationHours = 12; for (const u of db.users) u.verified = true; db.settings._v15 = true; }
}
function save() {
  const tmp = DB_FILE + '.' + process.pid + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db), { mode: 0o600 });
  fs.renameSync(tmp, DB_FILE);
}
function backup() {
  const f = path.join(BACKUP_DIR, 'db-' + new Date().toISOString().slice(0, 10) + '.json');
  if (!fs.existsSync(f) && fs.existsSync(DB_FILE)) fs.copyFileSync(DB_FILE, f);
  const all = fs.readdirSync(BACKUP_DIR).filter(x => x.startsWith('db-')).sort();
  while (all.length > 30) fs.unlinkSync(path.join(BACKUP_DIR, all.shift()));
}
load();

async function bootstrapAdmin() {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const pw = String(process.env.ADMIN_PASSWORD || '');
  // Locked out? Set ADMIN_RESET=1 with ADMIN_EMAIL + ADMIN_PASSWORD, deploy once, log in, then remove all three.
  if (process.env.ADMIN_RESET === '1' && email && pw.length >= 12) {
    let a = db.admins.find(x => x.email === email);
    if (!a) { a = { id: crypto.randomBytes(8).toString('hex'), email, name: 'Owner', createdAt: new Date().toISOString() }; db.admins.unshift(a); }
    Object.assign(a, { pass: await helpers.hash(pw), totp: null, failed: 0, lockedUntil: null, mustChange: false }); delete a.role;
    db.adminSessions = (db.adminSessions || []).filter(x => x.adminId !== a.id); save();
    console.log(`Admin password reset for ${email} (2FA cleared). Remove ADMIN_RESET and ADMIN_PASSWORD now.`); return;
  }
  if (db.admins.length) return;
  if (!email || pw.length < 12) {
    console.warn('No admin account yet. Start once with ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) to create it.');
    return;
  }
  db.admins.push({ id: crypto.randomBytes(8).toString('hex'), email, name: 'Owner', pass: await helpers.hash(pw), totp: null, createdAt: new Date().toISOString() });
  save();
  console.log(`Admin account created for ${email}. You can remove ADMIN_PASSWORD from the environment now.`);
}

// ---------- email sending ----------
let sending = false;
async function sendQueued() {
  if (sending) return; sending = true;
  try {
    const queued = db.emails.filter(e => e.status === 'queued').slice(0, 20);
    for (const e of queued) {
      if (!RESEND_API_KEY || !db.settings.emailFrom) { e.status = 'not sent – email not set up'; continue; }
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: 'Bearer ' + RESEND_API_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: db.settings.emailFrom, to: [e.to], subject: e.subject, html: e.html, text: e.text })
        });
        e.status = r.ok ? 'sent' : 'failed (' + r.status + ')';
      } catch (x) { e.status = 'failed (network)'; }
    }
    if (queued.length) save();
  } finally { sending = false; }
}

// ---------- http helpers ----------
const CSP = "default-src 'self'; script-src 'self' https://pay.dnapayments.com https://test-pay.dnapayments.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://*.dnapayments.com https://api.drand.sh https://api2.drand.sh https://api3.drand.sh https://drand.cloudflare.com; frame-src https://*.dnapayments.com; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://*.dnapayments.com; object-src 'none'";
function baseHeaders(req) {
  const h = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()', 'Content-Security-Policy': CSP, 'Cross-Origin-Opener-Policy': 'same-origin' };
  if (isHttps(req)) h['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  return h;
}
const isHttps = req => TRUST_PROXY ? req.headers['x-forwarded-proto'] === 'https' : !!req.socket.encrypted;
const clientIp = req => TRUST_PROXY ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress : req.socket.remoteAddress;
// compression: pages, code and API answers are sent squeezed (typically 70–85% smaller) to any browser that accepts it
const enc = req => { const a = String(req.headers['accept-encoding'] || ''); return /\bbr\b/.test(a) ? 'br' : /\bgzip\b/.test(a) ? 'gzip' : null; };
const squeeze = (buf, how, fast) => how === 'br' ? zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: fast ? 4 : 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }) : zlib.gzipSync(buf, { level: fast ? 5 : 9 });
function json(req, res, status, body, extra = {}) {
  let out = Buffer.from(JSON.stringify(body)); const how = out.length > 1400 ? enc(req) : null, h = { ...baseHeaders(req), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Accept-Encoding', ...extra };
  if (how) { try { out = squeeze(out, how, true); h['Content-Encoding'] = how; } catch { } }
  res.writeHead(status, h); res.end(out);
}
function cookies(req) {
  const out = {}; for (const part of String(req.headers.cookie || '').split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
function cookie(req, name, value, opts) {
  const sec = isHttps(req) ? '; Secure' : '';
  return `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=${opts.same}; Path=${opts.path}; Max-Age=${value ? opts.age : 0}${sec}`;
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(Object.assign(new Error('Request too large'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { if (!chunks.length) return resolve({}); try { const v = JSON.parse(Buffer.concat(chunks)); resolve(v && typeof v === 'object' && !Array.isArray(v) ? v : {}); } catch { reject(Object.assign(new Error('Bad request'), { code: 400 })); } });
    req.on('error', reject);
  });
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' };
const ZCACHE = new Map(); // compressed copies of each file, made once
function serveFile(req, res, base, rel, extra = {}) {
  const file = path.resolve(base, '.' + path.sep + rel);
  if (!file.startsWith(base + path.sep)) return json(req, res, 404, { error: 'Not found' });
  fs.stat(file, (e, st) => {
    if (e || !st.isFile()) return json(req, res, 404, { error: 'Not found' });
    const ext = path.extname(file).toLowerCase(), etag = `"${st.size.toString(36)}-${Math.floor(st.mtimeMs).toString(36)}"`;
    const cache = ['.html', '.js', '.css', '.webmanifest'].includes(ext) ? 'no-cache' : 'public, max-age=3600, stale-while-revalidate=86400';
    const h = { ...baseHeaders(req), 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': cache, ETag: etag, Vary: 'Accept-Encoding', ...extra };
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, h); return res.end(); }  // phone already has this exact file
    const how = /\.(js|css|html|svg|json)$/.test(ext) && st.size > 1024 ? enc(req) : null;
    if (!how || st.size > 4e6) { res.writeHead(200, h); return fs.createReadStream(file).pipe(res); }
    const key = file + '|' + etag + '|' + how, hit = ZCACHE.get(key);
    const send = b => { res.writeHead(200, { ...h, 'Content-Encoding': how, 'Content-Length': b.length }); res.end(b); };
    if (hit) return send(hit);
    fs.readFile(file, (e2, buf) => { if (e2) return json(req, res, 404, { error: 'Not found' }); let z; try { z = squeeze(buf, how, false); } catch { res.writeHead(200, h); return res.end(buf); }
      if (ZCACHE.size > 200) ZCACHE.clear(); ZCACHE.set(key, z); send(z); });
  });
}

// index.html with link-preview tags (Facebook, WhatsApp, iMessage…). /c/<id> = a shareable competition link.
const escA = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
function serveIndex(req, res, compId) {
  fs.readFile(path.join(PUBLIC_DIR, 'index.html'), 'utf8', (e, html) => {
    if (e) return json(req, res, 500, { error: 'Server error' });
    const origin = (isHttps(req) ? 'https://' : 'http://') + String(req.headers.host || '').replace(/[^a-z0-9.:-]/gi, '');
    const s = db.settings || {}, site = s.siteName || 'Sheppey Elite Raffles';
    let title = site, desc = s.tagline || 'Cash, tech and treats – every prize drawn live and provably fair.', image = origin + '/logo.jpg', url = origin + '/';
    const c = compId && db.comps.find(x => x.id === compId && x.status !== 'hidden');
    if (c) {
      const price = c.type === 'free' ? 'FREE to enter' : '£' + (c.price / 100).toFixed(2) + ' per entry';
      title = `${c.title} | ${site}`; desc = `${price}${c.totalTickets ? ` · only ${Number(c.totalTickets).toLocaleString('en-GB')} tickets` : ''} · drawn live${c.endsAt ? ' · closes ' + new Date(c.endsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}`;
      if (c.image && !/^data:|\.svg$/i.test(c.image)) image = c.image.startsWith('http') ? c.image : origin + '/' + c.image.replace(/^\//, '');
      url = origin + '/c/' + c.id;
    }
    const tags = `<base href="/">
<meta property="og:type" content="website"><meta property="og:site_name" content="${escA(site)}"><meta property="og:title" content="${escA(title)}"><meta property="og:description" content="${escA(desc)}">
<meta property="og:image" content="${escA(image)}"><meta property="og:url" content="${escA(url)}"><meta name="twitter:card" content="summary_large_image">${c ? `\n<meta name="ser-comp" content="${c.id}">` : ''}`;
    const out = html.replace('<!--OG-->', tags).replace(/<title>[^<]*<\/title>/, `<title>${escA(title)}</title>`);
    res.writeHead(200, { ...baseHeaders(req), 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' }); res.end(out);
  });
}

// ---------- request handling ----------
async function handle(req, res) {
  const url = new URL(req.url, 'http://local');
  const p = url.pathname;
  const M = req.method;

  if (p.startsWith('/api/')) {
    // CSRF defence: state-changing calls must come from our own pages
    if (M !== 'GET' && p !== '/api/pay/dna/callback') {
      if (req.headers['x-requested-with'] !== 'SER') return json(req, res, 403, { error: 'Blocked request.' });
      const origin = req.headers.origin;
      if (origin && new URL(origin).host !== req.headers.host) return json(req, res, 403, { error: 'Blocked cross-site request.' });
    }
    const c = cookies(req);
    const ip = clientIp(req);

    if (p === '/api/admin/upload' && M === 'POST') {
      const who = await app.handle(db, { method: 'GET', path: '/api/admin/me', adminToken: c.ser_a, ip });
      if (who.status !== 200) return json(req, res, 401, { error: 'Please sign in.' });
      const b = await readBody(req, 8 * 1024 * 1024);
      const mm = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(b.dataUrl || ''));
      if (!mm) return json(req, res, 400, { error: 'Upload a JPG, PNG or WebP image.' });
      const buf = Buffer.from(mm[2], 'base64');
      const magic = buf.slice(0, 12).toString('hex');
      const okType = (mm[1] === 'jpeg' && magic.startsWith('ffd8ff')) || (mm[1] === 'png' && magic.startsWith('89504e47')) || (mm[1] === 'webp' && magic.startsWith('52494646') && magic.slice(16, 24) === '57454250');
      if (!okType || buf.length > 5 * 1024 * 1024) return json(req, res, 400, { error: 'That image file is not valid (max 5 MB).' });
      const name = crypto.randomBytes(12).toString('hex') + '.' + (mm[1] === 'jpeg' ? 'jpg' : mm[1]);
      fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
      return json(req, res, 200, { url: '/uploads/' + name });
    }

    const body = M === 'GET' ? {} : await readBody(req, 4 * 1024 * 1024);
    const origin = (isHttps(req) ? 'https://' : 'http://') + String(req.headers.host || '').replace(/[^a-z0-9.:-]/gi, '');
    const r = await app.handle(db, { method: M, path: p, query: url.searchParams, body, userToken: c.ser_u, adminToken: c.ser_a, previewToken: c.ser_p, ip, origin, app: req.headers['x-app'] === '1', ua: req.headers['user-agent'] || '' });
    if (r.dirty) save();
    const set = [];
    if (r.setUser !== undefined) set.push(cookie(req, 'ser_u', r.setUser, { same: 'Lax', path: '/', age: 30 * 86400 }));
    if (r.setAdmin !== undefined) set.push(cookie(req, 'ser_a', r.setAdmin, { same: 'Strict', path: '/api/admin', age: 12 * 3600 }));
    if (r.setPreview !== undefined) set.push(cookie(req, 'ser_p', r.setPreview, { same: 'Strict', path: '/api', age: 12 * 3600 }));
    json(req, res, r.status, r.body, set.length ? { 'Set-Cookie': set } : {});
    if (db.emails.some(e => e.status === 'queued')) sendQueued();
    return;
  }

  if (M !== 'GET' && M !== 'HEAD') return json(req, res, 405, { error: 'Method not allowed' });
  if (p.startsWith('/uploads/')) return serveFile(req, res, UPLOAD_DIR, p.slice(9));
  if (p === ADMIN_PATH || p === ADMIN_PATH + '/') return serveFile(req, res, PUBLIC_DIR, 'admin.html', { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' });
  if (p === '/admin.html') return json(req, res, 404, { error: 'Not found' });
  if (p === '/' || p === '/index.html') return serveIndex(req, res, null);
  { const cm = /^\/c\/([a-f0-9]{16})\/?$/.exec(p); if (cm) return serveIndex(req, res, cm[1]); }
  if (p === '/sw.js') return serveFile(req, res, PUBLIC_DIR, 'sw.js', { 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' });
  if (p === '/manifest.webmanifest') return serveFile(req, res, PUBLIC_DIR, 'manifest.webmanifest', { 'Content-Type': 'application/manifest+json' });
  return serveFile(req, res, PUBLIC_DIR, p.slice(1));
}

bootstrapAdmin().then(() => {
  setInterval(() => { try { if (app.housekeeping(db)) save(); backup(); } catch (e) { console.error(e); } }, 60e3);
  backup();
  http.createServer((req, res) => {
    handle(req, res).catch(e => { if (e.code !== 413 && e.code !== 400) console.error(e); if (!res.headersSent) json(req, res, e.code || 500, { error: e.code ? e.message : 'Something went wrong.' }); });
  }).listen(PORT, () => console.log(`Sheppey Elite Raffles running on http://localhost:${PORT}  ·  admin: ${ADMIN_PATH}`));
});
