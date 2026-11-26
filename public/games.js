/* Sheppey Elite Raffles – live games: Duck Race, Race Around Sheppey, Elite Banker.
   Shared by the website, the Live Games page and the admin draw studio, so everybody sees exactly the same show.
   The winner is always chosen first by the server's secure random draw – the race is the show, replayed
   identically on every screen from the saved seed and start time. */
(function () {
'use strict';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const gbp = p => '£' + (p / 100).toLocaleString('en-GB', { minimumFractionDigits: p % 100 ? 2 : 0, maximumFractionDigits: 2 });
function prng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const COLORS = ['#ff1f3d', '#1f5bff', '#ffc400', '#19c37d', '#ff7a00', '#b44dff', '#00c2d1', '#ff4fa3', '#9be15d', '#ffffff', '#ff5a36', '#3ddbd9', '#f5a623', '#7b61ff', '#e84393', '#00b894', '#fdcb6e', '#0984e3', '#d63031', '#6c5ce7', '#55efc4', '#fab1a0', '#74b9ff', '#a29bfe', '#ffeaa7'];
const LABEL = { duck: 'Duck', race: 'Car', banker: 'Player', hilo: 'Player', standard: 'Ticket' };
const wait = ms => new Promise(r => setTimeout(r, ms));

// ================= sound (WebAudio, off until the viewer turns it on) =================
const Sound = (() => {
  let ctx = null, on = false;
  try { on = localStorage.getItem('ser_sound') === '1'; } catch {}
  const ac = () => { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } } if (ctx.state === 'suspended') ctx.resume(); return ctx; };
  function tone(f, d, type = 'sine', vol = 0.15, delay = 0, slide) {
    if (!on) return; const c = ac(); if (!c) return; const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05);
  }
  function noise(d, vol = 0.08, delay = 0) {
    if (!on) return; const c = ac(); if (!c) return; const t = c.currentTime + delay;
    const b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), ch = b.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; s.buffer = b; g.gain.value = vol; s.connect(f).connect(g).connect(c.destination); s.start(t);
  }
  return {
    get on() { return on; },
    forceOn() { on = true; },
    unlocked() { const c = ac(); return !!c && c.state === 'running'; },
    unlock() { const c = ac(); if (c && c.state !== 'running') c.resume(); },
    toggle() { on = !on; try { localStorage.setItem('ser_sound', on ? '1' : '0'); } catch {} if (on) { ac(); tone(880, 0.12); } return on; },
    beep() { tone(660, 0.18, 'square', 0.08); },
    go() { tone(523, 0.5, 'sawtooth', 0.09); tone(659, 0.5, 'sawtooth', 0.07); tone(784, 0.6, 'sawtooth', 0.07); },
    tick() { tone(1200 + Math.random() * 300, 0.03, 'square', 0.03); },
    whoosh() { noise(0.35, 0.12); },
    chime(good) { good ? [784, 988, 1319].forEach((f, i) => tone(f, 0.35, 'triangle', 0.1, i * 0.08)) : [330, 262].forEach((f, i) => tone(f, 0.45, 'sawtooth', 0.07, i * 0.15)); },
    ring() { for (let k = 0; k < 2; k++) { tone(400, 0.4, 'sine', 0.12, k * 1.2); tone(450, 0.4, 'sine', 0.1, k * 1.2); tone(400, 0.4, 'sine', 0.12, k * 1.2 + 0.6); tone(450, 0.4, 'sine', 0.1, k * 1.2 + 0.6); } },
    fanfare() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.28, 'triangle', 0.12, i * 0.12)); },
    buzz() { tone(110, 0.6, 'sawtooth', 0.12, 0, 80); },
    drum() { for (let i = 0; i < 14; i++) noise(0.06, 0.05 + i * 0.005, i * 0.11); }
  };
})();
const sndBtn = () => `<button class="gx-snd" type="button" data-gx-snd aria-label="Sound">${Sound.on ? '🔊' : '🔇'}</button>`;
document.addEventListener('click', e => { const b = e.target.closest('[data-gx-snd]'); if (!b) return; const on = Sound.toggle(); document.querySelectorAll('[data-gx-snd]').forEach(x => x.textContent = on ? '🔊' : '🔇'); });

// ================= confetti =================
function confetti(host, n = 140) {
  const cv = document.createElement('canvas'); cv.className = 'gx-confetti'; host.appendChild(cv);
  const r = host.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = r.width * dpr; cv.height = r.height * dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const cols = ['#ff1f3d', '#1f5bff', '#ffc400', '#ffffff', '#ff5a6e', '#5b8cff'];
  const ps = Array.from({ length: n }, () => ({ x: r.width / 2 + (Math.random() - 0.5) * r.width * 0.4, y: r.height * 0.45, vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 13 - 4, s: 4 + Math.random() * 6, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0] }));
  let f = 0;
  (function step() {
    c.clearRect(0, 0, r.width, r.height);
    for (const p of ps) { p.x += p.vx; p.y += p.vy; p.vy += 0.32; p.vx *= 0.99; p.a += p.va; c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); }
    if (++f < 170 && cv.isConnected) requestAnimationFrame(step); else cv.remove();
  })();
}

// ================= the Isle of Sheppey =================
const W = 1600, H = 1000;
const ISLAND = [[250, 300], [330, 268], [430, 258], [520, 250], [640, 242], [760, 238], [880, 242], [980, 250], [1100, 265], [1200, 300], [1300, 360], [1362, 430], [1372, 505], [1340, 580], [1220, 640], [1080, 672], [950, 690], [820, 700], [690, 705], [560, 700], [460, 688], [385, 662], [330, 650], [300, 622], [272, 560], [250, 480], [236, 400], [238, 340]];
const MAINLAND = [[-60, 802], [120, 792], [250, 800], [334, 796], [420, 790], [600, 796], [800, 790], [1000, 786], [1200, 770], [1350, 742], [1500, 762], [1700, 772]];
const DUCKWAY = [[360, 738], [480, 748], [620, 752], [780, 750], [940, 742], [1090, 724], [1230, 692], [1350, 642], [1420, 560], [1436, 470], [1406, 370], [1330, 290], [1220, 234], [1090, 204], [940, 191], [780, 189], [620, 197], [480, 209], [360, 227], [262, 252], [200, 300], [182, 380], [188, 470], [205, 560], [236, 640], [285, 705]];
const ROAD = [[345, 598], [300, 545], [285, 460], [288, 380], [318, 318], [400, 300], [520, 292], [640, 285], [760, 281], [880, 285], [990, 293], [1110, 311], [1220, 352], [1290, 420], [1305, 500], [1270, 565], [1180, 605], [1060, 628], [930, 645], [800, 654], [670, 658], [545, 652], [450, 638], [390, 622]];
const INTRO = [[328, 990], [329, 930], [330, 870], [331, 810], [333, 750], [335, 700], [339, 648], [345, 598]];
const PLACES = [
  { n: 'Kingsferry Bridge', x: 332, y: 722 }, { n: 'Queenborough', x: 252, y: 505 }, { n: 'Sheerness', x: 268, y: 300 }, { n: 'Minster', x: 520, y: 262 },
  { n: 'Warden Point', x: 1000, y: 255 }, { n: 'Leysdown', x: 1330, y: 400 }, { n: 'Shellness', x: 1345, y: 585 }, { n: 'Harty', x: 1170, y: 650 },
  { n: 'Eastchurch', x: 930, y: 470 }, { n: 'Elmley Marshes', x: 560, y: 690 }, { n: 'the Swale', x: 800, y: 745 }, { n: 'the Sheppey Crossing', x: 405, y: 725 }
];
function catmull(pts, closed, step = 3) {
  const out = [], n = pts.length;
  const P = i => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), k = Math.max(2, Math.ceil(len / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  if (closed) out.push(out[0].slice()); else out.push(pts[n - 1].slice());
  return out;
}
function mkPath(pts, closed) {
  const p = catmull(pts, closed), cum = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  const len = cum[cum.length - 1];
  return { pts: p, len, at(d) {
    if (closed) d = ((d % len) + len) % len; else d = Math.max(0, Math.min(len, d));
    let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= d) lo = m; else hi = m; }
    const a = p[lo], b = p[hi], f = (d - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
    return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
  } };
}
let GEO = null;
function geo() {
  if (GEO) return GEO;
  GEO = { island: catmull(ISLAND, true, 4), main: catmull(MAINLAND, false, 4), duck: mkPath(DUCKWAY, true), road: mkPath(ROAD, true), intro: mkPath(INTRO, false) };
  return GEO;
}
const polyPath = (c, pts, close = true) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); if (close) c.closePath(); };

// ---- static scenery, drawn once ----
const SS = 1.6;
let STATIC = {};
function drawBridge(c, part) {
  // Kingsferry lift bridge, crossing the Swale at the west end
  if (part !== 'towers') {
    c.save(); c.shadowColor = 'rgba(0,0,0,.55)'; c.shadowBlur = 14; c.shadowOffsetY = 6;
    c.fillStyle = '#4b5568'; c.fillRect(318, 632, 30, 176);
    c.shadowColor = 'transparent'; c.fillStyle = '#2b3140'; c.fillRect(322, 632, 22, 176);
    c.strokeStyle = 'rgba(255,255,255,.65)'; c.lineWidth = 1.2; c.setLineDash([7, 7]); c.beginPath(); c.moveTo(333, 636); c.lineTo(333, 805); c.stroke(); c.setLineDash([]);
    c.strokeStyle = '#c9d2e4'; c.lineWidth = 2; c.beginPath(); c.moveTo(319, 632); c.lineTo(319, 808); c.moveTo(347, 632); c.lineTo(347, 808); c.stroke(); c.restore();
    // the Sheppey Crossing, high-level road bridge just to the east
    c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 18; c.shadowOffsetY = 10; c.strokeStyle = '#dfe6f3'; c.lineWidth = 12; c.lineCap = 'round';
    c.beginPath(); c.moveTo(392, 652); c.quadraticCurveTo(410, 725, 404, 800); c.stroke(); c.shadowColor = 'transparent';
    c.strokeStyle = '#7d8aa3'; c.lineWidth = 8; c.stroke(); c.restore();
  }
  // the two pairs of lifting towers
  c.save();
  for (const y of [690, 752]) for (const x of [312, 354]) {
    c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 10; c.shadowOffsetX = 5; c.shadowOffsetY = 8;
    c.fillStyle = '#e7ecf5'; c.fillRect(x - 6, y - 6, 12, 12); c.shadowColor = 'transparent';
    c.fillStyle = '#ff1f3d'; c.fillRect(x - 3, y - 3, 6, 6);
  }
  c.strokeStyle = 'rgba(231,236,245,.9)'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(312, 690); c.lineTo(354, 690); c.moveTo(312, 752); c.lineTo(354, 752); c.stroke();
  c.restore();
}
function label(c, text, x, y, size = 13, color = '#fff') {
  c.save(); c.font = `800 ${size}px Inter, system-ui, sans-serif`; const w = c.measureText(text).width + 14;
  c.fillStyle = 'rgba(5,10,28,.72)'; c.beginPath(); c.roundRect ? c.roundRect(x - w / 2, y - size, w, size + 9, 9) : c.rect(x - w / 2, y - size, w, size + 9); c.fill();
  c.fillStyle = color; c.textAlign = 'center'; c.fillText(text, x, y + 1); c.restore();
}
function house(c, x, y, s, col) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(x + 2, y + 2, s, s * 0.8); c.fillStyle = '#efe6d6'; c.fillRect(x, y, s, s * 0.8); c.fillStyle = col; c.beginPath(); c.moveTo(x - 1, y + 1); c.lineTo(x + s / 2, y - s * 0.45); c.lineTo(x + s + 1, y + 1); c.fill(); }
function town(c, cx, cy, n, r, seed) { const R = prng(seed); for (let i = 0; i < n; i++) house(c, cx + (R() - 0.5) * r * 2, cy + (R() - 0.5) * r, 7 + R() * 4, ['#b5523b', '#8d3b2f', '#6b7a8f', '#a0522d'][(R() * 4) | 0]); }
function buildStatic(mode) {
  if (STATIC[mode]) return STATIC[mode];
  const g = geo(), cv = document.createElement('canvas'); cv.width = W * SS; cv.height = H * SS;
  const c = cv.getContext('2d'); c.scale(SS, SS);
  // sea
  let gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#05285e'); gr.addColorStop(0.55, '#0a3f86'); gr.addColorStop(1, '#0b4a8f'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
  const R = prng(7);
  c.strokeStyle = 'rgba(140,200,255,.08)'; c.lineWidth = 1.2;
  for (let i = 0; i < 260; i++) { const x = R() * W, y = R() * H; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 9, y - 4, x + 18, y); c.stroke(); }
  // shallows
  c.save(); c.lineJoin = 'round';
  for (const [w, a] of [[90, 0.10], [56, 0.14], [30, 0.2]]) { c.strokeStyle = `rgba(56,198,214,${a})`; c.lineWidth = w; polyPath(c, g.island); c.stroke(); polyPath(c, g.main, false); c.stroke(); }
  c.restore();
  // mainland Kent
  c.save(); c.beginPath(); c.moveTo(g.main[0][0], g.main[0][1]); for (const p of g.main) c.lineTo(p[0], p[1]); c.lineTo(1700, 1100); c.lineTo(-60, 1100); c.closePath();
  gr = c.createLinearGradient(0, 780, 0, H); gr.addColorStop(0, '#3f8a46'); gr.addColorStop(1, '#2c6a36'); c.fillStyle = gr; c.fill(); c.clip();
  for (let i = 0; i < 46; i++) { c.fillStyle = `rgba(${R() > .5 ? '210,190,90' : '120,170,80'},${0.12 + R() * 0.14})`; c.save(); c.translate(R() * W, 800 + R() * 200); c.rotate((R() - 0.5) * 0.5); c.fillRect(-40, -18, 60 + R() * 70, 30 + R() * 24); c.restore(); }
  c.restore();
  c.strokeStyle = '#d9c48c'; c.lineWidth = 5; polyPath(c, g.main, false); c.stroke();
  // the island
  c.save(); polyPath(c, g.island); gr = c.createRadialGradient(800, 470, 80, 800, 470, 700); gr.addColorStop(0, '#5aa84f'); gr.addColorStop(1, '#3a8a44'); c.fillStyle = gr;
  c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 22; c.fill(); c.shadowColor = 'transparent'; c.clip();
  for (let i = 0; i < 70; i++) { c.fillStyle = `rgba(${R() > .45 ? '206,196,104' : R() > .5 ? '140,190,90' : '90,150,70'},${0.15 + R() * 0.18})`; c.save(); c.translate(300 + R() * 1050, 280 + R() * 400); c.rotate((R() - 0.5) * 0.8); c.fillRect(-30, -20, 50 + R() * 60, 30 + R() * 30); c.restore(); }
  // Elmley marshes
  c.fillStyle = 'rgba(70,140,140,.35)'; for (let i = 0; i < 40; i++) { c.beginPath(); c.ellipse(470 + R() * 260, 640 + R() * 50, 10 + R() * 18, 4 + R() * 6, 0, 0, 7); c.fill(); }
  c.restore();
  // beaches + Warden cliffs
  c.save(); polyPath(c, g.island); c.strokeStyle = '#e6d39a'; c.lineWidth = 6; c.stroke(); c.restore();
  c.strokeStyle = '#8a5a35'; c.lineWidth = 7; c.beginPath(); c.moveTo(900, 244); c.quadraticCurveTo(1000, 250, 1090, 266); c.stroke();
  // roads (always – the island has them)
  const road = (p, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = c.lineCap = 'round'; polyPath(c, p, false); c.stroke(); };
  if (mode === 'race') {
    road(g.road.pts, 34, '#c8cdd8'); road(g.road.pts, 28, '#2f3440');
    c.save(); c.setLineDash([14, 12]); road(g.road.pts, 1.6, 'rgba(255,255,255,.7)'); c.restore();
    c.save(); c.setLineDash([10, 10]); c.lineDashOffset = 0; road(g.road.pts, 34, 'rgba(255,31,61,.55)'); c.restore(); road(g.road.pts, 28, '#2f3440');
    c.save(); c.setLineDash([14, 12]); road(g.road.pts, 1.6, 'rgba(255,255,255,.7)'); c.restore();
    road(g.intro.pts, 26, '#2f3440'); c.save(); c.setLineDash([12, 10]); road(g.intro.pts, 1.5, 'rgba(255,255,255,.7)'); c.restore();
    // grandstand + pit flags at the start
    c.fillStyle = '#1f2a48'; c.fillRect(366, 560, 46, 22); c.fillStyle = '#ff1f3d'; for (let i = 0; i < 5; i++) c.fillRect(368 + i * 9, 562, 6, 6); c.fillStyle = '#1f5bff'; for (let i = 0; i < 5; i++) c.fillRect(368 + i * 9, 572, 6, 6);
  } else {
    road([[331, 990], [331, 800], [338, 650], [360, 560], [460, 470], [700, 450], [930, 470], [1150, 440], [1290, 420]], 6, 'rgba(60,60,70,.55)');
  }
  // landmarks
  town(c, 380, 352, 22, 34, 11); town(c, 300, 495, 12, 20, 12); town(c, 545, 335, 16, 30, 13); town(c, 1235, 420, 12, 24, 14); town(c, 900, 520, 10, 22, 15); town(c, 335, 905, 14, 30, 16); town(c, 1000, 330, 8, 24, 17);
  // Sheerness clock tower + docks
  c.fillStyle = '#7a8597'; c.fillRect(228, 284, 26, 10); c.strokeStyle = '#ffc400'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(232, 286); c.lineTo(222, 270); c.moveTo(246, 286); c.lineTo(240, 268); c.stroke();
  c.fillStyle = '#e9e3d0'; c.fillRect(330, 336, 7, 16); c.fillStyle = '#2b3a67'; c.beginPath(); c.arc(333.5, 338, 3, 0, 7); c.fill();
  // Minster Abbey
  c.fillStyle = '#d8cbb2'; c.fillRect(560, 345, 22, 12); c.fillRect(560, 333, 7, 14); c.fillStyle = '#8d3b2f'; c.beginPath(); c.moveTo(558, 334); c.lineTo(563.5, 322); c.lineTo(569, 334); c.fill();
  // Leysdown beach huts + wheel
  ['#ff1f3d', '#ffc400', '#1f5bff', '#19c37d', '#ff7a00', '#b44dff', '#fff'].forEach((col, i) => { c.fillStyle = col; c.fillRect(1318 + i * 2.5, 440 + i * 9, 7, 6); });
  c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(1270, 470, 13, 0, 7); for (let a = 0; a < 6.28; a += 0.785) { c.moveTo(1270, 470); c.lineTo(1270 + Math.cos(a) * 13, 470 + Math.sin(a) * 13); } c.stroke();
  // Eastchurch airfield
  c.save(); c.translate(860, 470); c.rotate(-0.25); c.fillStyle = '#9aa1ad'; c.fillRect(-60, -5, 120, 10); c.restore();
  c.fillStyle = '#fff'; c.save(); c.translate(905, 452); c.rotate(-0.25); c.fillRect(-9, -1.5, 18, 3); c.fillRect(-2, -8, 4, 16); c.fillRect(-9, -4, 3, 8); c.restore();
  // Harty church
  c.fillStyle = '#d8cbb2'; c.fillRect(1150, 600, 14, 9); c.fillStyle = '#8d3b2f'; c.beginPath(); c.moveTo(1148, 601); c.lineTo(1157, 593); c.lineTo(1166, 601); c.fill();
  // boats at Queenborough + ships off Sheerness
  for (const [x, y, a, s] of [[214, 520, 1.2, 1], [208, 492, 1.4, 1], [222, 545, 1.3, 0.8], [150, 230, 0.5, 2.2], [560, 150, 0.1, 2.6], [1480, 300, 1.8, 1.4]]) {
    c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(2, 2, 10, 3.5, 0, 0, 7); c.fill();
    c.fillStyle = s > 2 ? '#c9302c' : '#f4f6fb'; c.beginPath(); c.ellipse(0, 0, 10, 3.5, 0, 0, 7); c.fill(); c.fillStyle = s > 2 ? '#fff' : '#1f5bff'; c.fillRect(-3, -1.5, 6, 3); c.restore();
  }
  drawBridge(c, 'all');
  // place names
  label(c, 'SHEERNESS', 380, 392, 13); label(c, 'QUEENBOROUGH', 320, 470, 11); label(c, 'MINSTER', 600, 380, 13); label(c, 'WARDEN', 1000, 360, 11); label(c, 'LEYSDOWN', 1215, 470, 12);
  label(c, 'EASTCHURCH', 900, 555, 12); label(c, 'ELMLEY', 600, 625, 11); label(c, 'HARTY', 1120, 580, 11); label(c, 'KINGSFERRY BRIDGE', 238, 765, 11, '#ffd36b');
  label(c, 'THE SWALE', 820, 775, 11, '#bfe3ff'); label(c, 'THAMES ESTUARY', 760, 140, 13, '#bfe3ff'); label(c, 'RIVER MEDWAY', 110, 600, 11, '#bfe3ff'); label(c, 'ISLE OF SHEPPEY', 780, 410, 18, '#fff'); label(c, 'IWADE', 400, 940, 11);
  STATIC[mode] = cv; return cv;
}

// ---- sprites ----
function drawDuck(c, x, y, ang, col, num, t, mine, lead) {
  c.save(); c.translate(x, y + Math.sin(t * 6 + num) * 1.2);
  // wake
  c.save(); c.rotate(ang); c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.6;
  for (let k = 1; k < 4; k++) { c.globalAlpha = 0.55 - k * 0.15; c.beginPath(); c.moveTo(-10 - k * 7, -6 - k * 3); c.lineTo(-6, 0); c.lineTo(-10 - k * 7, 6 + k * 3); c.stroke(); }
  c.restore(); c.globalAlpha = 1;
  if (lead || mine) { c.fillStyle = lead ? 'rgba(255,196,0,.35)' : 'rgba(34,211,107,.4)'; c.beginPath(); c.arc(0, 0, 19, 0, 7); c.fill(); }
  c.rotate(ang); if (Math.cos(ang) < 0) c.scale(1, -1);
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(1, 3, 12, 6, 0, 0, 7); c.fill();
  const g = c.createRadialGradient(-2, -3, 2, 0, 0, 13); g.addColorStop(0, '#fff7b0'); g.addColorStop(1, '#ffc400'); c.fillStyle = g;
  c.beginPath(); c.ellipse(0, 0, 12, 7.5, 0, 0, 7); c.fill();
  c.beginPath(); c.moveTo(-10, -2); c.lineTo(-15, -6); c.lineTo(-11, 2); c.fill(); // tail
  c.beginPath(); c.arc(7, -5, 5.6, 0, 7); c.fill(); // head
  c.fillStyle = '#ff7a00'; c.beginPath(); c.moveTo(11.5, -6); c.lineTo(17, -4.5); c.lineTo(11.5, -3); c.fill();
  c.fillStyle = '#111'; c.beginPath(); c.arc(8.6, -6.4, 1.1, 0, 7); c.fill();
  c.restore();
  // number badge (always upright)
  c.save(); c.translate(x, y - 15); c.fillStyle = col; c.beginPath(); c.arc(0, 0, 7.5, 0, 7); c.fill(); c.lineWidth = 1.5; c.strokeStyle = '#fff'; c.stroke();
  c.fillStyle = col === '#ffffff' || col === '#ffeaa7' || col === '#ffc400' || col === '#fdcb6e' ? '#111' : '#fff'; c.font = '900 8px Inter, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(num, 0, 0.5);
  if (mine) { c.fillStyle = '#22d36b'; c.font = '900 7px Inter'; c.fillText('YOU', 0, -12); }
  c.restore();
}
function drawCar(c, x, y, ang, col, num, mine, lead, speed) {
  c.save(); c.translate(x, y); c.rotate(ang);
  if (speed > 0.2) { c.fillStyle = 'rgba(220,220,230,.22)'; for (let k = 1; k <= 3; k++) { c.beginPath(); c.arc(-12 - k * 6, (k % 2 ? 2 : -2), 2 + k, 0, 7); c.fill(); } }
  if (lead || mine) { c.fillStyle = lead ? 'rgba(255,196,0,.4)' : 'rgba(34,211,107,.45)'; c.beginPath(); c.ellipse(0, 0, 19, 12, 0, 0, 7); c.fill(); }
  c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(-10, -5, 22, 12);
  const g = c.createLinearGradient(0, -6, 0, 6); g.addColorStop(0, col); g.addColorStop(0.5, '#ffffff'); g.addColorStop(0.52, col); g.addColorStop(1, col);
  c.fillStyle = g; c.beginPath(); c.roundRect ? c.roundRect(-12, -6, 24, 12, 4) : c.rect(-12, -6, 24, 12); c.fill();
  c.fillStyle = '#101624'; c.fillRect(2, -4.5, 5, 9); c.fillRect(-9, -4, 3, 8);
  c.fillStyle = '#fff6b0'; c.fillRect(11, -5, 2, 2.5); c.fillRect(11, 2.5, 2, 2.5);
  c.fillStyle = '#111'; c.fillRect(-9, -7.5, 5, 2); c.fillRect(-9, 5.5, 5, 2); c.fillRect(5, -7.5, 5, 2); c.fillRect(5, 5.5, 5, 2);
  c.rotate(-ang); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, 5.4, 0, 7); c.fill(); c.fillStyle = '#111'; c.font = '900 7px Inter, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(num, 0, 0.5);
  if (mine) { c.fillStyle = '#22d36b'; c.font = '900 7px Inter'; c.fillText('YOU', 0, -12); }
  c.restore();
}

// ---- race plan: the drawn winner always crosses the line first ----
function plan(race, winner) {
  const r = prng(race.seed || 1);
  return race.field.map((t, i) => {
    const win = t === winner;
    return { t, i, color: COLORS[i % COLORS.length], finish: win ? 1 : 1.025 + r() * 0.28, bias: win ? -0.2 + r() * 0.2 : -0.12 + r() * 0.32,
      waves: [0, 1].map(() => ({ a: 0.012 + r() * 0.022, f: 0.6 + r() * 1.6, ph: r() * 6.28 })), lane: r(), weave: r() * 6.28 };
  });
}
function prog(p, x) {
  const u = Math.max(0, Math.min(1, x / p.finish));
  let v = u + p.bias * u * (1 - u);
  for (const w of p.waves) v += w.a * Math.sin(u * w.f * 6.283 + w.ph) * u * (1 - u) * 2.2;
  return Math.max(0, Math.min(1, v));
}
// slow motion for the last stretch
const warp = t => t < 0.86 ? t / 0.86 * 0.9 : 0.9 + (t - 0.86) / 0.14 * 0.1;

function runRace(el, race, winner, opts = {}) {
  const mode = race.mode === 'race' ? 'race' : 'duck', g = geo();
  const lbl = LABEL[mode], n = race.field.length, laps = race.laps || 1, dur = race.dur || (mode === 'race' ? 6000 + laps * 13000 : 2000 + laps * 15000);
  const loop = mode === 'race' ? g.road : g.duck, intro = mode === 'race' ? g.intro.len : 0, L = loop.len, D = intro + laps * L;
  const mine = new Set((opts.mine || []).map(Number));
  const ps = plan(race, winner);
  // starting grid: rows behind the line
  const cols = mode === 'race' ? 3 : 5, gap = mode === 'race' ? 26 : 20;
  ps.forEach((p, k) => { const row = Math.floor(k / cols), col = k % cols; p.s = mode === 'race' ? (Math.ceil(n / cols) - row) * gap : -row * gap; p.col = col; });
  const posAt = (p, x) => { const v = prog(p, x); return p.s + v * (D - p.s); };
  const where = (p, d, t) => {
    let pt; if (mode === 'race' && d < intro) pt = g.intro.at(d); else pt = loop.at(d - intro);
    const spread = mode === 'race' ? 9 : 30, off = ((p.col - (cols - 1) / 2) / ((cols - 1) / 2 || 1)) * spread * 0.8 + Math.sin(t * 0.8 + p.weave) * spread * 0.25;
    return { x: pt.x - Math.sin(pt.ang) * off, y: pt.y + Math.cos(pt.ang) * off, ang: pt.ang };
  };
  const title = `${mode === 'race' ? '🏁 Race Around Sheppey' : '🦆 Duck Race'}${race.of > 1 ? ` · Race ${race.index + 1} of ${race.of}` : ''}`;
  el.innerHTML = `<div class="gx gx-${mode}"><canvas class="gx-cv"></canvas>
    <div class="gx-top"><span class="gx-title">${title}</span><span class="gx-lap"></span>${sndBtn()}</div>
    <div class="gx-board"></div><canvas class="gx-mini" width="240" height="150"></canvas>
    <div class="gx-ticker"><span>Welcome to the Isle of Sheppey…</span></div><div class="gx-big"></div><div class="gx-podium"></div></div>`;
  const root = el.querySelector('.gx'), cv = root.querySelector('.gx-cv'), c = cv.getContext('2d'), mini = root.querySelector('.gx-mini'), mc = mini.getContext('2d');
  const big = root.querySelector('.gx-big'), tick = root.querySelector('.gx-ticker span'), board = root.querySelector('.gx-board'), lapEl = root.querySelector('.gx-lap'), pod = root.querySelector('.gx-podium');
  const bg = buildStatic(mode);
  let cw = 0, ch = 0, dpr = 1, phone = false;
  const size = () => { const r = root.getBoundingClientRect(); cw = r.width; phone = cw < 640 && !opts.fill; ch = opts.fill ? Math.round(el.getBoundingClientRect().height) : Math.round(cw * (phone ? 1.12 : 0.6)); root.style.height = ch + 'px'; dpr = Math.min(2.5, window.devicePixelRatio || 1); cv.width = cw * dpr; cv.height = ch * dpr; cv.style.height = ch + 'px'; };
  size(); const ro = new ResizeObserver(() => size()); ro.observe(root);
  // mini map
  const drawMiniBase = () => { mc.clearRect(0, 0, 240, 150); mc.save(); mc.scale(240 / W, 150 / H); mc.fillStyle = '#0a3f86'; mc.fillRect(0, 0, W, H); mc.fillStyle = '#3f8a46'; polyPath(mc, g.island); mc.fill(); mc.beginPath(); mc.moveTo(-60, 802); for (const p of g.main) mc.lineTo(p[0], p[1]); mc.lineTo(1700, 1100); mc.lineTo(-60, 1100); mc.fill(); mc.restore(); };
  let cam = { x: mode === 'race' ? 420 : 520, y: mode === 'race' ? 700 : 720, z: 1 }, last = '', lastLeader = null, lastLap = 0, doneShown = false, stop = false, frame = 0;
  const say = s => { if (s === last) return; last = s; tick.textContent = s; tick.classList.remove('in'); void tick.offsetWidth; tick.classList.add('in'); };
  const near = (x, y) => { let best = null, bd = 1e9; for (const P of PLACES) { const d = Math.hypot(P.x - x, P.y - y); if (d < bd) { bd = d; best = P; } } return bd < 170 ? best.n : ''; };
  const nm = t => (race.names && race.names[t] ? race.names[t].name : '') || '';
  const short = s => { const a = String(s).split(' '); return a.length > 1 ? a[0] + ' ' + a[a.length - 1][0] + '.' : s; };
  function render(x, t, phase) {
    const pos = ps.map(p => { const d = x <= 0 ? p.s : posAt(p, x); return { p, d, w: where(p, d, t) }; }).sort((a, b) => phase === 'end' ? a.p.finish - b.p.finish : (b.d - a.d) || (a.p.finish - b.p.finish));
    const lead = pos[0];
    // camera
    const zk = opts.fill ? 1.15 : 1; let tz = (phase === 'pre' ? (phone ? 1.6 : 1.25) : phase === 'end' ? (phone ? 2.4 : 1.8) : (phone ? 3.0 : 2.0)) * zk, tx = lead.w.x, ty = lead.w.y;
    if (phase === 'pre') { const s = mode === 'race' ? g.intro.at(120) : g.duck.at(-40); tx = s.x; ty = s.y - 40; }
    if (phase === 'end') { const f = loop.at(0); tx = f.x + 30; ty = f.y; }
    cam.x += (tx - cam.x) * 0.07; cam.y += (ty - cam.y) * 0.07; cam.z += (tz - cam.z) * 0.04;
    const scale = (cw / W) * cam.z; const hw = cw / 2 / scale, hh = ch / 2 / scale;
    const cx = Math.max(hw, Math.min(W - hw, cam.x)), cy = Math.max(Math.min(hh, H / 2), Math.min(H - hh, cam.y));
    c.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (cw / 2 - cx * scale), dpr * (ch / 2 - cy * scale));
    c.drawImage(bg, 0, 0, W, H);
    // shimmering water
    c.save(); c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1.3;
    for (let i = 0; i < 70; i++) { const R = prng(i * 97 + 3); const bx = R() * W, by = R() * H, ph = R() * 6.28; const a = 0.5 + 0.5 * Math.sin(t * 1.6 + ph); if (a < 0.4) continue;
      c.globalAlpha = (a - 0.4) * 0.9; const xx = bx + Math.sin(t * 0.5 + ph) * 8; c.beginPath(); c.moveTo(xx, by); c.quadraticCurveTo(xx + 7, by - 3, xx + 14, by); c.stroke(); }
    c.restore();
    // course markers
    if (mode === 'duck') { for (let k = 0; k < 28; k++) { const p = g.duck.at(k * L / 28); const bob = Math.sin(t * 3 + k) * 1.2; for (const s of [-1, 1]) { const ox = -Math.sin(p.ang) * 46 * s, oy = Math.cos(p.ang) * 46 * s; c.fillStyle = s > 0 ? '#ff1f3d' : '#ffc400'; c.beginPath(); c.arc(p.x + ox, p.y + oy + bob, 3.2, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 1; c.stroke(); } } }
    // finish line
    const f = loop.at(0), fl = mode === 'race' ? 15 : 50; c.save(); c.translate(f.x, f.y); c.rotate(f.ang);
    for (let k = -fl; k < fl; k += 5) for (let j = 0; j < 2; j++) { c.fillStyle = ((k / 5 + j) & 1) ? '#111' : '#fff'; c.fillRect(j * 5 - 5, k, 5, 5); }
    c.restore();
    if (mode === 'race') { const s = g.intro.at(205); c.save(); c.translate(s.x, s.y); c.rotate(s.ang); c.fillStyle = '#fff'; c.fillRect(-1.5, -14, 3, 28); c.restore(); }
    // racers – back to front so the leaders are on top
    for (let k = pos.length - 1; k >= 0; k--) { const { p, w } = pos[k]; const isLead = k === 0 && phase !== 'pre';
      if (mode === 'duck') drawDuck(c, w.x, w.y, w.ang, p.color, p.t, t, mine.has(p.t), isLead); else drawCar(c, w.x, w.y, w.ang, p.color, p.t, mine.has(p.t), isLead, phase === 'run' ? 1 : 0); }
    // foreground: bridge towers (ducks swim under the whole bridge)
    drawBridge(c, mode === 'duck' ? 'all' : 'towers');
    // mini map + board (a few times a second)
    if (frame++ % 4 === 0) {
      drawMiniBase(); mc.save(); mc.scale(240 / W, 150 / H);
      mc.strokeStyle = 'rgba(255,255,255,.9)'; mc.lineWidth = 14; mc.strokeRect(cx - hw, cy - hh, hw * 2, hh * 2);
      for (const { p, w } of pos) { mc.fillStyle = p.color; mc.beginPath(); mc.arc(w.x, w.y, mine.has(p.t) ? 26 : 18, 0, 7); mc.fill(); }
      mc.restore();
      const lap = Math.max(1, Math.min(laps, Math.floor((lead.d - intro) / L) + 1));
      lapEl.textContent = phase === 'pre' ? `${laps} lap${laps > 1 ? 's' : ''} · ${n} ${lbl.toLowerCase()}s` : phase === 'end' ? 'FINISHED' : (mode === 'race' && lead.d < intro ? 'Over the bridge…' : `Lap ${lap}/${laps}`);
      const top = pos.slice(0, phone ? 4 : opts.fill ? 8 : 6), my = pos.filter((q, i) => mine.has(q.p.t) && i >= top.length).slice(0, 2);
      board.innerHTML = top.concat(my).map(q => `<div class="${q.p.t === winner && phase === 'end' ? 'win' : ''} ${mine.has(q.p.t) ? 'mine' : ''}"><i>${pos.indexOf(q) + 1}</i><b style="--c:${q.p.color}">${q.p.t}</b><span>${esc(short(nm(q.p.t)))}</span></div>`).join('');
      if (phase === 'run') {
        const ld = lead.p.t;
        if (lastLeader !== ld && x > 0.04) { const pl = near(lead.w.x, lead.w.y); say(`${lbl} ${ld} ${lastLeader === null ? 'flies off the line' : 'takes the lead'}${pl ? (mode === 'race' && lead.d < intro ? ' on ' : ' at ') + pl : ''}!`); }
        else if (lap !== lastLap && lap > 1) say(`Lap ${lap} of ${laps} – ${lbl} ${ld} leads${near(lead.w.x, lead.w.y) ? ' past ' + near(lead.w.x, lead.w.y) : ''}`);
        else if (x > 0.9 && !big.dataset.photo) { const gapD = (pos[0].d - pos[1].d); big.dataset.photo = 1; if (gapD < 30) { big.innerHTML = '<div class="gx-flash">📸 PHOTO FINISH!</div>'; setTimeout(() => { if (big.querySelector('.gx-flash')) big.innerHTML = ''; }, 1800); say('It’s neck and neck – photo finish!'); } else say(`${lbl} ${ld} is heading for home!`); }
        if (x > 0.04) lastLeader = ld; lastLap = lap;
      }
    }
    return pos;
  }
  const sync = () => Date.now() + (opts.offset || 0);
  let t0 = opts.live && race.startAt ? Date.parse(race.startAt) : (opts.instant ? sync() - dur - 9000 : sync() + 3600);
  if (opts.live && sync() - t0 > dur + 6000) opts.instant = true;
  return new Promise(res => {
    let lastCount = null;
    function finish(pos) {
      if (doneShown) return; doneShown = true;
      root.classList.add('done');
      const top3 = pos.slice(0, 3);
      const who = race.names && race.names[winner] || {};
      say(`${lbl} ${winner} wins${who.name ? ' – congratulations ' + who.name : ''}!`);
      big.innerHTML = `<div class="gx-win"><small>🏆 WINNER</small><b>${lbl} ${winner}</b><span>${esc(who.name || '')}${who.town ? ' · ' + esc(who.town) : ''}</span></div>`;
      pod.innerHTML = `<div class="gx-pod">${[1, 0, 2].map(i => top3[i] ? `<div class="pd p${i + 1}"><span class="pd-dot" style="background:${top3[i].p.color}">${top3[i].p.t}</span><b>${esc(short(nm(top3[i].p.t)))}</b><i>${i + 1}</i></div>` : '').join('')}</div>`;
      if (!opts.instant) { Sound.fanfare(); confetti(root); }
      setTimeout(() => root.classList.add('podium'), opts.instant ? 0 : 2600);
      res();
    }
    function step() {
      if (stop || !root.isConnected) { ro.disconnect(); return res(); }
      const now = sync(), el2 = now - t0, t = now / 1000;
      if (el2 < 0) {
        render(0, t, 'pre');
        const sec = Math.ceil(-el2 / 1000);
        if (sec <= 3) { if (lastCount !== sec) { lastCount = sec; big.innerHTML = `<div class="gx-count">${sec}</div>`; Sound.beep(); } }
        else { big.innerHTML = `<div class="gx-wait">Starting in ${sec}s</div>`; say(mode === 'race' ? `${n} cars on the grid at Iwade – they cross Kingsferry Bridge to start!` : `${n} ducks lined up under Kingsferry Bridge…`); }
      } else if (el2 < dur) {
        if (lastCount !== 0) { lastCount = 0; big.innerHTML = '<div class="gx-count go">GO!</div>'; Sound.go(); setTimeout(() => { if (big.querySelector('.go')) big.innerHTML = ''; }, 900); }
        render(warp(el2 / dur), t, 'run');
      } else {
        const x = Math.min(1.3, 1 + (el2 - dur) / dur * 0.6);
        const pos = render(x, t, 'end');
        if (!doneShown) finish(ps.map(p => ({ p })).sort((a, b) => a.p.finish - b.p.finish));
        if (opts.instant && el2 > dur + 8000) { render(1.3, t, 'end'); }
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    el._stopRace = () => { stop = true; };
  });
}

// ================= ELITE BANKER =================
const PHONE_SVG = `<svg viewBox="0 0 120 110" class="bk-phone-svg" aria-hidden="true"><defs><linearGradient id="phg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a6e"/><stop offset="1" stop-color="#a50f25"/></linearGradient><linearGradient id="phgold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe9a3"/><stop offset="1" stop-color="#c9930a"/></linearGradient></defs>
  <path class="bk-handset" d="M14 30 C14 14 30 8 60 8 C90 8 106 14 106 30 L106 36 C106 42 100 44 94 42 L84 38 C80 37 78 34 78 30 L78 26 C70 24 50 24 42 26 L42 30 C42 34 40 37 36 38 L26 42 C20 44 14 42 14 36 Z" fill="url(#phgold)" stroke="#7a5600" stroke-width="2"/>
  <path d="M22 98 L34 52 C36 46 42 42 48 42 L72 42 C78 42 84 46 86 52 L98 98 Z" fill="url(#phg)" stroke="#5c0010" stroke-width="2"/>
  <circle cx="60" cy="72" r="19" fill="#111a33" stroke="url(#phgold)" stroke-width="3"/>${Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * 6.283 - 1.2; return `<circle cx="${(60 + Math.cos(a) * 12.5).toFixed(1)}" cy="${(72 + Math.sin(a) * 12.5).toFixed(1)}" r="2.6" fill="#ffe9a3"/>`; }).join('')}<circle cx="60" cy="72" r="5" fill="url(#phgold)"/></svg>`;

function BankerShow(el, opts = {}) {
  let st = null, lastSeq = -1, queue = [], busy = false, dead = false, hideIdx = -1;
  const admin = !!opts.admin, mine = new Set((opts.mine || []).map(Number));
  el.innerHTML = `<div class="bk2-wrap ${opts.stream ? 'stream' : ''}"><div class="bk2-badge"><i></i><span class="bk2-logo"><span>ELITE</span><b>BANKER</b></span><i></i></div><div class="bk2"><div class="bk2-head"><div class="bk2-players"></div>${sndBtn()}</div>
    <div class="bk2-msg"></div><div class="bk2-stage"><div class="bk2-col lo"></div><div class="bk2-mid"><div class="bk2-boxes"></div><div class="bk2-own"></div></div><div class="bk2-col hi"></div></div>
    <div class="bk2-ctrl"></div><div class="bk2-ov"></div></div></div>`;
  const R = el.querySelector('.bk2'), ov = R.querySelector('.bk2-ov'), msg = R.querySelector('.bk2-msg');
  if (opts.stream) R.classList.add('stream');
  const cur = () => st && st.players[st.current];
  function valuesBoard() {
    const pl = cur(), gone = pl ? pl.opened.map(o => o.value) : [];
    const vals = st.values.slice().sort((a, b) => a - b), struck = vals.map(v => { const k = gone.indexOf(v); if (k >= 0) { gone.splice(k, 1); return true; } return false; });
    const half = vals.length / 2, col = (a, b) => vals.slice(a, b).map((v, i) => `<div class="bk2-v ${struck[a + i] ? 'gone' : ''}" data-val="${v}">${gbp(v)}</div>`).join('');
    R.querySelector('.lo').innerHTML = col(0, half); R.querySelector('.hi').innerHTML = col(half, vals.length);
  }
  function boxes() {
    const pl = cur(), opened = new Map(pl ? pl.opened.map(o => [o.box, o.value]) : []), ph = pl && pl.result === null ? st.phase : 'x';
    R.querySelector('.bk2-boxes').innerHTML = Array.from({ length: 22 }, (_, i) => {
      const isMine = pl && pl.myBox === i, isOpen = opened.has(i), can = admin && !busy && ((ph === 'pick' && !isOpen) || (ph === 'open' && !isMine && !isOpen));
      if (isMine) return `<div class="bk2-box ghost"><span>${i + 1}</span></div>`;
      return `<button class="bk2-box ${isOpen ? 'open' : ''} ${can ? 'can' : ''}" data-i="${i}" ${can ? '' : 'disabled'}>${isOpen ? `<em>${i + 1}</em><b class="${opened.get(i) >= st.values[11] ? 'hi' : 'lo'}">${gbp(opened.get(i))}</b>` : `<span>${i + 1}</span>`}</button>`;
    }).join('');
    R.querySelector('.bk2-own').innerHTML = pl && pl.myBox !== null ? `<div class="bk2-pedestal ${pl.result !== null ? 'revealed' : ''}"><small>${esc(first(pl.name))}'s box</small><div class="bk2-box big"><span>${pl.myBox + 1}</span>${pl.result !== null ? `<b>${gbp(pl.ownValue)}</b>` : ''}</div></div>` : '';
  }
  const first = s => String(s || '').split(' ')[0];
  function players() {
    const tot = st.totalPlayers || 1;
    R.querySelector('.bk2-players').innerHTML = Array.from({ length: tot }, (_, i) => { const p = i === hideIdx ? null : st.players[i];
      return `<span class="bk2-pp ${i === st.current && st.phase !== 'done' ? 'on' : ''} ${p && p.done ? 'done' : ''} ${p && mine.has(p.ticket) ? 'me' : ''}">${p ? `#${p.ticket} ${esc(first(p.name))}${p.done ? ' · ' + gbp(p.result) : ''}` : `Player ${i + 1}`}</span>`; }).join('');
  }
  function controls() {
    const pl = cur(), c = R.querySelector('.bk2-ctrl');
    let m = '', b = '';
    if (!st || st.phase === 'reveal') { const k = st ? st.players.length + 1 : 1; m = `🎰 Up next: <b>Player ${k}</b> of ${st ? st.totalPlayers : '?'} – picked at random from every ticket`; if (admin) b = `<button class="btn lg gold" data-bk="reveal">🎰 Reveal player ${k}</button>`; }
    else if (st.phase === 'pick') { m = `<b>${esc(pl.name)}</b> – choose your box!`; }
    else if (st.phase === 'open') { m = `Open <b>${pl.roundLeft}</b> more box${pl.roundLeft === 1 ? '' : 'es'} before the Banker calls`; }
    else if (st.phase === 'offer') { m = `☎️ The Banker offers <b class="gold-t">${gbp(pl.offer)}</b> – Deal or No Deal?`; }
    else if (st.phase === 'result') { m = pl.dealt ? `🤝 <b>${esc(pl.name)}</b> took the deal – <b class="gold-t">${gbp(pl.result)}</b>` : `📦 <b>${esc(pl.name)}</b> went all the way – <b class="gold-t">${gbp(pl.result)}</b>`; if (admin) b = `<button class="btn lg" data-bk="next">${st.players.length >= st.totalPlayers ? '🏁 Finish game' : 'Next player →'}</button>`; }
    else if (st.phase === 'done') { m = '🏁 Game over – congratulations to all our players!'; }
    msg.innerHTML = m; c.innerHTML = busy ? '' : b;
  }
  function offerCard(amount, round, live) {
    return `<div class="bk2-offer ${live ? 'in' : ''}"><small>ROUND ${round} · THE BANKER OFFERS</small><b>${gbp(amount)}</b>
      ${admin && live ? '<div class="bk2-dd"><button class="dd deal" data-bk="deal">DEAL</button><button class="dd no" data-bk="nodeal">NO DEAL</button></div>' : '<div class="bk2-q">DEAL… OR NO DEAL?</div>'}</div>`;
  }
  function staticView() {
    if (!st) return;
    players(); valuesBoard(); boxes(); controls();
    const pl = cur();
    if (st.phase === 'offer' && pl) ov.innerHTML = `<div class="bk2-dim"></div>${offerCard(pl.offer, pl.offers.length, true)}`;
    else if (st.phase === 'done') ov.innerHTML = `<div class="bk2-dim"></div><div class="bk2-final"><small>GAME RESULTS</small>${st.players.map(p => `<div><b>#${p.ticket} ${esc(p.name)}</b><span>${esc(p.town || '')}</span><em>${p.dealt ? '🤝 Deal' : '📦 Own box'} · ${gbp(p.result)}</em></div>`).join('')}</div>`;
    else ov.innerHTML = '';
  }
  // ---- animations, one event at a time ----
  async function animate(e) {
    const pl = st.players[e.player];
    if (e.type === 'reveal') {
      const names = e.reel && e.reel.length ? e.reel : [[e.ticket, e.name, e.town]];
      const seq = []; for (let k = 0; k < 34; k++) seq.push(names[k % names.length]); seq.push([e.ticket, e.name, e.town]);
      ov.innerHTML = `<div class="bk2-dim"></div><div class="bk2-reveal"><small>🎰 SELECTING PLAYER ${e.player + 1}</small><div class="bk2-reel"><div class="bk2-strip">${seq.map(s => `<div><b>#${s[0]}</b><span>${esc(s[1])}</span></div>`).join('')}</div><i class="bk2-lens"></i></div><div class="bk2-chosen"></div></div>`;
      const strip = ov.querySelector('.bk2-strip'), rowH = 56, total = (seq.length - 1) * rowH;
      const t0 = performance.now(), d = 4800;
      await new Promise(r => { let lastI = -1; (function f(now) { const x = Math.min(1, (now - t0) / d), e2 = 1 - Math.pow(1 - x, 4); strip.style.transform = `translateY(${-e2 * total}px)`; const i = Math.floor(e2 * seq.length); if (i !== lastI) { lastI = i; Sound.tick(); } if (x < 1 && !dead) requestAnimationFrame(f); else r(); })(t0); });
      ov.querySelector('.bk2-reel').classList.add('hit'); Sound.fanfare();
      ov.querySelector('.bk2-chosen').innerHTML = `<b>Ticket #${e.ticket}</b><span>${esc(e.name)}${e.town ? ' · ' + esc(e.town) : ''}</span>${mine.has(e.ticket) ? '<em>🎉 THAT’S YOU!</em>' : ''}`;
      confetti(R, 120); await wait(2600);
    } else if (e.type === 'pick') {
      ov.innerHTML = `<div class="bk2-dim"></div><div class="bk2-pop"><div class="bk2-box big glow"><span>${e.box + 1}</span></div><b>${esc(first(pl && pl.name))} picks box ${e.box + 1}</b><small>Whatever's inside could be theirs…</small></div>`;
      Sound.whoosh(); await wait(1900);
    } else if (e.type === 'open') {
      const hi = e.value >= st.values[11];
      ov.innerHTML = `<div class="bk2-dim light"></div><div class="bk2-pop"><div class="bk2-lid"><div class="bk2-box big"><span>${e.box + 1}</span></div><div class="bk2-inside ${hi ? 'hi' : 'lo'}">${gbp(e.value)}</div></div></div>`;
      Sound.whoosh(); await wait(700); ov.querySelector('.bk2-lid').classList.add('open'); Sound.chime(!hi); await wait(1000);
      const chip = R.querySelector(`.bk2-v[data-val="${e.value}"]:not(.gone)`); if (chip) chip.classList.add('gone', 'zap');
      await wait(400);
    } else if (e.type === 'offer') {
      ov.innerHTML = `<div class="bk2-dim"></div><div class="bk2-call"><div class="bk2-rings"><i></i><i></i><i></i></div><div class="bk2-phone">${PHONE_SVG}</div><b>THE BANKER IS CALLING…</b></div>`;
      R.classList.add('shake'); Sound.ring(); await wait(2700); R.classList.remove('shake');
      ov.querySelector('.bk2-call').classList.add('answered'); await wait(500);
      ov.innerHTML = `<div class="bk2-dim"></div>${offerCard(e.amount, e.round, false)}`; await wait(80); ov.querySelector('.bk2-offer').classList.add('in'); await wait(1400);
    } else if (e.type === 'deal') {
      ov.innerHTML = `<div class="bk2-dim"></div><div class="bk2-stamp deal">DEAL!</div><div class="bk2-sub">${esc(first(pl && pl.name))} wins <b>${gbp(e.amount)}</b></div>`;
      Sound.fanfare(); confetti(R, 180); await wait(2400);
      ov.innerHTML = `<div class="bk2-dim"></div><div class="bk2-pop"><small>…but what was in their box?</small><div class="bk2-lid"><div class="bk2-box big"><span>${(pl ? pl.myBox : 0) + 1}</span></div><div class="bk2-inside ${e.own > e.amount ? 'hi' : 'lo'}">${gbp(e.own)}</div></div><b class="bk2-verdict"></b></div>`;
      Sound.drum(); await wait(1600); ov.querySelector('.bk2-lid').classList.add('open'); Sound.chime(e.own <= e.amount);
      ov.querySelector('.bk2-verdict').textContent = e.own > e.amount ? 'Ouch – their box had more!' : 'Great deal – they beat the Banker! 💰'; await wait(2400);
    } else if (e.type === 'nodeal') {
      ov.innerHTML = `<div class="bk2-dim"></div><div class="bk2-stamp no">NO DEAL!</div>`; Sound.buzz(); await wait(1500);
    } else if (e.type === 'final') {
      ov.innerHTML = `<div class="bk2-dim"></div><div class="bk2-pop"><small>THE FINAL REVEAL – box ${e.box + 1}</small><div class="bk2-lid"><div class="bk2-box big glow"><span>${e.box + 1}</span></div><div class="bk2-inside hi">${gbp(e.own)}</div></div><b class="bk2-verdict"></b></div>`;
      Sound.drum(); await wait(2200); ov.querySelector('.bk2-lid').classList.add('open'); Sound.fanfare(); confetti(R, 200);
      ov.querySelector('.bk2-verdict').innerHTML = `${esc(first(pl && pl.name))} wins <span class="gold-t">${gbp(e.own)}</span>! <small>(the last box had ${gbp(e.otherValue)})</small>`; await wait(3200);
    } else if (e.type === 'done') { Sound.fanfare(); confetti(R, 200); }
  }
  async function pump() {
    if (busy) return; busy = true; controls();
    while (queue.length && !dead) { const { e, snap } = queue.shift(); const keep = st; st = snap; staticViewPartial(e); try { await animate(e); } catch {} st = keep; }
    busy = false; if (!dead) staticView();
  }
  // before each animation show the board as it was just before that event
  function staticViewPartial(e) { hideIdx = e.type === 'reveal' ? e.player : -1; players(); hideIdx = -1; valuesBoard(); boxes(); controls(); if (e.type === 'open') { const chip = R.querySelector(`.bk2-v[data-val="${e.value}"].gone`); if (chip) chip.classList.remove('gone'); const b = R.querySelector(`.bk2-box[data-i="${e.box}"]`); if (b) { b.classList.remove('open'); b.innerHTML = `<span>${e.box + 1}</span>`; } } }
  function update(next) {
    if (!next) { st = null; R.querySelector('.bk2-boxes').innerHTML = ''; msg.innerHTML = admin ? '' : 'The game hasn’t started yet – it’s played live when the competition sells out.'; R.querySelector('.bk2-ctrl').innerHTML = admin ? '<button class="btn lg gold" data-bk="start">💼 Start Elite Banker</button>' : ''; return; }
    const fresh = lastSeq < 0;
    const evs = (next.events || []).filter(e => e.seq > lastSeq);
    st = next; lastSeq = next.seq || 0;
    if (fresh) { // joining mid-game: only replay the very latest moment if it just happened
      const recent = evs.filter(e => Date.now() - Date.parse(e.at) < 6000 && e.type !== 'start').slice(-1);
      for (const e of recent) queue.push({ e, snap: next });
    } else for (const e of evs) if (e.type !== 'start' && e.type !== 'next') queue.push({ e, snap: next });
    if (queue.length) pump(); else if (!busy) staticView();
  }
  R.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-bk],[data-i]'); if (!b || !admin || busy || !opts.onAction) return;
    let act = b.dataset.bk, body = {};
    if (b.dataset.i !== undefined) { act = st.phase === 'pick' ? 'pick' : 'open'; body = { box: +b.dataset.i }; }
    if (act === 'deal' || act === 'nodeal') { body = { deal: act === 'deal' }; act = 'answer'; }
    b.disabled = true;
    try { const s2 = await opts.onAction(act, body); if (s2) update(s2); } catch (er) { msg.innerHTML = `<span style="color:#ff5a6e">${esc(er.message)}</span>`; b.disabled = false; }
  });
  return { update, destroy() { dead = true; }, get busy() { return busy; } };
}


// ================= shared: slot-reel player reveal =================
async function reelReveal(ov, R, e, mine, label, dead) {
  const names = e.reel && e.reel.length ? e.reel : [[e.ticket, e.name, e.town]];
  const seq = []; for (let k = 0; k < 34; k++) seq.push(names[k % names.length]); seq.push([e.ticket, e.name, e.town]);
  ov.innerHTML = `<div class="bk2-dim"></div><div class="bk2-reveal"><small>🎰 ${label}</small><div class="bk2-reel"><div class="bk2-strip">${seq.map(s => `<div><b>#${s[0]}</b><span>${esc(s[1])}</span></div>`).join('')}</div><i class="bk2-lens"></i></div><div class="bk2-chosen"></div></div>`;
  const strip = ov.querySelector('.bk2-strip'), rowH = strip.firstElementChild.offsetHeight || 56, total = (seq.length - 1) * rowH, t0 = performance.now(), d = 4800;
  await new Promise(r => { let lastI = -1; (function f(now) { const x = Math.min(1, (now - t0) / d), e2 = 1 - Math.pow(1 - x, 4); strip.style.transform = `translateY(${-e2 * total}px)`; const i = Math.floor(e2 * seq.length); if (i !== lastI) { lastI = i; Sound.tick(); } if (x < 1 && !dead()) requestAnimationFrame(f); else r(); })(t0); });
  ov.querySelector('.bk2-reel').classList.add('hit'); Sound.fanfare();
  ov.querySelector('.bk2-chosen').innerHTML = `<b>Ticket #${e.ticket}</b><span>${esc(e.name)}${e.town ? ' · ' + esc(e.town) : ''}</span>${mine.has(e.ticket) ? '<em>🎉 THAT’S YOU!</em>' : ''}`;
  confetti(R, 120); await wait(2600);
}
const short = s => { const a = String(s || '').split(' '); return a.length > 1 ? a[0] + ' ' + a[a.length - 1][0] + '.' : s; };

// generic event-driven show (Banker-style): queue events, animate one at a time, then draw the static view
function eventShow(el, opts, cfg) {
  let st = null, lastSeq = -1, queue = [], busy = false, dead = false;
  const admin = !!opts.admin, mine = new Set((opts.mine || []).map(Number));
  el.innerHTML = `<div class="bk2-wrap ${cfg.cls} ${opts.stream ? 'stream' : ''}"><div class="bk2-badge"><i></i><span class="bk2-logo">${cfg.badge}</span><i></i></div><div class="bk2 ${cfg.cls}-b">${cfg.shell}<div class="bk2-msg"></div><div class="bk2-ctrl"></div><div class="bk2-ov"></div></div></div>`;
  const R = el.querySelector('.bk2'), ov = R.querySelector('.bk2-ov'), msg = R.querySelector('.bk2-msg'), ctrl = R.querySelector('.bk2-ctrl');
  if (opts.stream) R.classList.add('stream');
  const ctx = { R, ov, msg, ctrl, admin, mine, get st() { return st; }, get busy() { return busy; }, dead: () => dead };
  const view = () => { if (!dead) { cfg.render(ctx, st); if (busy) ctrl.innerHTML = ''; } };
  async function pump() {
    if (busy) return; busy = true; ctrl.innerHTML = '';
    while (queue.length && !dead) { const e = queue.shift(); if (cfg.before) cfg.before(ctx, st, e); try { await cfg.animate(ctx, st, e); } catch (er) { console.error(er); } }
    busy = false; view();
  }
  function update(next) {
    if (!next || !next.events) { st = null; cfg.render(ctx, null); return; }
    const fresh = lastSeq < 0, evs = next.events.filter(e => e.seq > lastSeq);
    st = next; lastSeq = next.seq || 0;
    if (fresh) { for (const e of evs.filter(e => Date.now() - Date.parse(e.at) < 6000 && cfg.live(e)).slice(-1)) queue.push(e); }
    else for (const e of evs) if (cfg.live(e)) queue.push(e);
    if (queue.length) pump(); else if (!busy) view();
  }
  R.addEventListener('click', async ev => {
    const b = ev.target.closest('[data-act]'); if (!b || !admin || busy || !opts.onAction) return;
    b.disabled = true;
    try { const s2 = await opts.onAction(b.dataset.act, b.dataset.body ? JSON.parse(b.dataset.body) : {}); if (s2) update(s2); } catch (er) { msg.innerHTML = `<span style="color:#ff5a6e">${esc(er.message)}</span>`; b.disabled = false; }
  });
  return { update, destroy() { dead = true; }, get busy() { return busy; } };
}

// ================= LAST MAN STANDING =================
function LmsShow(el, opts = {}) {
  let auto = false, autoT = null;
  const show = eventShow(el, opts, {
    cls: 'lm', badge: '<span>LAST MAN</span><b>STANDING</b>',
    shell: `<div class="lm-head"><div class="lm-prize"></div><div class="lm-count"><b>0</b><small>remaining</small></div></div><div class="lm-grid"></div>`,
    live: e => ['start', 'cut', 'winner'].includes(e.type),
    render(ctx, st) {
      const { R, msg, ctrl, admin } = ctx;
      const grid = R.querySelector('.lm-grid');
      if (!st) { grid.innerHTML = ''; R.querySelector('.lm-prize').innerHTML = ''; msg.innerHTML = admin ? 'Every ticket goes on the board. Each round knocks names out at random until one is left standing.' : 'Last Man Standing starts soon…'; ctrl.innerHTML = admin ? '<button class="btn lg gold" data-act="start">☠️ Start Last Man Standing</button>' : ''; return; }
      const out = new Set(st.out), n = st.field.length, size = n <= 30 ? 'l' : n <= 120 ? 'm' : 's';
      grid.className = 'lm-grid sz-' + size;
      grid.innerHTML = st.field.map(([t, nm, tw]) => `<div class="lm-chip ${out.has(t) ? 'out' : ''} ${st.winner === t ? 'win' : ''} ${ctx.mine.has(t) ? 'me' : ''}" data-t="${t}" title="${esc(nm)} · ${esc(tw)}"><b>#${t}</b>${size !== 's' ? `<span>${esc(short(nm))}</span>` : ''}</div>`).join('');
      R.querySelector('.lm-prize').innerHTML = `<small>PLAYING FOR</small><b>${esc(st.prize || '')}</b>`;
      R.querySelector('.lm-count b').textContent = st.remaining;
      const nextK = st.remaining > 12 ? Math.floor(st.remaining / 2) : 1;
      if (st.phase === 'won') { const w = st.field.find(f => f[0] === st.winner) || []; msg.innerHTML = `🏆 <b>#${st.winner} ${esc(w[1] || '')}</b> is the last one standing!`; ctrl.innerHTML = admin ? '<button class="btn lg gold" data-act="start">☠️ Play for the next prize</button>' : ''; stopAuto(); }
      else { msg.innerHTML = `Round ${st.round + 1}: <b>${nextK === 1 ? 'one name' : nextK + ' names'}</b> to be knocked out`; ctrl.innerHTML = admin ? `<button class="btn lg" data-act="next">${nextK === 1 ? '❌ Knock one out' : `❌ Knock out ${nextK}`}</button><button class="btn ghost" id="lmAuto">${auto ? '⏸ Stop auto-play' : '▶ Auto-play'}</button>` : ''; }
      const ab = R.querySelector('#lmAuto'); if (ab) ab.onclick = () => { auto = !auto; ab.textContent = auto ? '⏸ Stop auto-play' : '▶ Auto-play'; if (auto) tickAuto(); else stopAuto(); };
      if (auto && st.phase === 'running') tickAuto();
    },
    async animate(ctx, st, e) {
      const { R, ov } = ctx;
      if (e.type === 'start') { ov.innerHTML = `<div class="bk2-dim"></div><div class="bk2-pop"><small>LAST MAN STANDING</small><b class="lm-big">${e.count} tickets</b><span class="lm-sub">playing for <b>${esc(e.prize)}</b></span></div>`; Sound.go(); await wait(2200); ov.innerHTML = ''; this.render(ctx, { ...st, out: [], remaining: e.count, round: 0, phase: 'running', winner: null }); return; }
      if (e.type === 'cut') {
        const chips = e.tickets.map(t => R.querySelector(`.lm-chip[data-t="${t}"]`)).filter(Boolean);
        R.querySelectorAll('.lm-chip').forEach(c => { if (e.tickets.includes(+c.dataset.t)) c.classList.remove('out'); });
        const cnt = R.querySelector('.lm-count b'), start = e.remaining + e.tickets.length;
        if (e.tickets.length === 1) {
          const live = [...R.querySelectorAll('.lm-chip:not(.out)')], target = chips[0];
          let hops = 18 + Math.floor(Math.random() * 6), last = null;
          for (let i = 0; i < hops; i++) { if (last) last.classList.remove('hunt'); last = i === hops - 1 ? target : live[Math.floor(Math.random() * live.length)]; if (last) last.classList.add('hunt'); Sound.tick(); await wait(70 + i * i * 1.1); }
          if (last) last.classList.remove('hunt');
          const [t, nm, tw] = st.field.find(f => f[0] === e.tickets[0]) || [e.tickets[0], '', ''];
          ov.innerHTML = `<div class="bk2-dim light"></div><div class="lm-elim"><small>ELIMINATED</small><b>#${t} ${esc(nm)}</b><span>${esc(tw)}</span></div>`; Sound.buzz();
          target && target.classList.add('out', 'zap'); cnt.textContent = e.remaining; await wait(1700); ov.innerHTML = '';
        } else {
          ov.innerHTML = `<div class="lm-round"><b>ROUND ${e.round}</b><span>${e.tickets.length} knocked out!</span></div>`;
          const step = Math.max(8, Math.min(60, 2600 / chips.length));
          for (let i = 0; i < chips.length; i++) { chips[i].classList.add('out', 'zap'); cnt.textContent = start - i - 1; if (i % 3 === 0) Sound.tick(); await wait(step); }
          await wait(900); ov.innerHTML = '';
        }
        return;
      }
      if (e.type === 'winner') {
        const chip = R.querySelector(`.lm-chip[data-t="${e.ticket}"]`); if (chip) chip.classList.add('win');
        Sound.drum(); await wait(1500);
        ov.innerHTML = `<div class="bk2-dim"></div><div class="gx-win lm-winner"><small>🏆 LAST MAN STANDING</small><b>#${e.ticket}</b><span>${esc(e.name)}${e.town ? ' · ' + esc(e.town) : ''}</span><em>wins ${esc(e.prize)}</em></div>`;
        Sound.fanfare(); confetti(R, 240); await wait(5000); ov.innerHTML = '';
      }
    }
  });
  const stopAuto = () => { auto = false; clearTimeout(autoT); };
  const tickAuto = () => { clearTimeout(autoT); autoT = setTimeout(() => { if (!auto || show.busy) return; const b = el.querySelector('[data-act="next"]'); if (b) b.click(); }, 1500); };
  return show;
}

// ================= HIGHER OR LOWER =================
const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const cardHTML = (i, cls = '') => i === null || i === undefined ? `<div class="pc back ${cls}"><i></i></div>` : `<div class="pc ${cls} ${Math.floor(i / 13) % 3 ? 'red' : ''}"><b>${RANKS[i % 13]}</b><span>${SUITS[Math.floor(i / 13)]}</span><em>${SUITS[Math.floor(i / 13)]}</em></div>`;
function HiloShow(el, opts = {}) {
  return eventShow(el, opts, {
    cls: 'hl', badge: '<span>HIGHER</span><b>OR LOWER</b>',
    shell: `<div class="bk2-head"><div class="bk2-players"></div>${sndBtn()}</div><div class="hl-stage"><div class="hl-table"><div class="hl-past"></div><div class="hl-cards"></div><div class="hl-call"></div></div><div class="hl-ladder"></div></div>`,
    live: e => ['reveal', 'guess', 'cash', 'bust', 'top', 'done'].includes(e.type),
    render(ctx, st) {
      const { R, msg, ctrl, admin, mine } = ctx;
      if (!st) { R.querySelector('.hl-cards').innerHTML = cardHTML(null, 'big'); R.querySelector('.hl-ladder').innerHTML = ''; R.querySelector('.bk2-players').innerHTML = ''; msg.innerHTML = admin ? '' : 'The game starts live when the competition sells out.'; ctrl.innerHTML = admin ? '<button class="btn lg gold" data-act="start">🃏 Start Higher or Lower</button>' : ''; return; }
      const pl = st.players[st.current];
      R.querySelector('.bk2-players').innerHTML = Array.from({ length: st.totalPlayers }, (_, i) => { const p = st.players[i]; return `<span class="bk2-pp ${i === st.current && st.phase !== 'done' ? 'on' : ''} ${p && p.done ? 'done' : ''} ${p && mine.has(p.ticket) ? 'me' : ''}">${p ? `#${p.ticket} ${esc(String(p.name).split(' ')[0])}${p.done ? ' · ' + gbp(p.result) : ''}` : `Player ${i + 1}`}</span>`; }).join('');
      this.ladder(ctx, st, pl ? pl.rung : -1);
      const cards = pl ? pl.cards : [];
      R.querySelector('.hl-past').innerHTML = cards.slice(0, -1).slice(-8).map(c => cardHTML(c, 'mini')).join('');
      R.querySelector('.hl-cards').innerHTML = cards.length ? cardHTML(cards[cards.length - 1], 'big') + cardHTML(null, 'big ghost') : cardHTML(null, 'big');
      R.querySelector('.hl-call').innerHTML = '';
      let b = '';
      if (st.phase === 'reveal') { msg.innerHTML = `🎰 Up next: <b>Player ${st.players.length + 1}</b> of ${st.totalPlayers} – picked at random`; if (admin) b = `<button class="btn lg gold" data-act="reveal">🎰 Reveal player ${st.players.length + 1}</button>`; }
      else if (st.phase === 'play') { msg.innerHTML = `<b>${esc(pl.name)}</b> – higher or lower? Banked so far: <b class="gold-t">${gbp(st.ladder[pl.rung])}</b>`; if (admin) b = `<button class="hl-btn up" data-act="guess" data-body='{"guess":"higher"}'>▲ HIGHER</button><button class="hl-btn down" data-act="guess" data-body='{"guess":"lower"}'>▼ LOWER</button><button class="btn ghost" data-act="cash">💰 Cash out ${gbp(st.ladder[pl.rung])}</button>`; }
      else if (st.phase === 'result') { msg.innerHTML = `<b>${esc(pl.name)}</b> ${pl.how === 'cash' ? 'cashed out with' : pl.how === 'top' ? 'reached the top and wins' : 'drops to the safe level –'} <b class="gold-t">${gbp(pl.result)}</b>`; if (admin) b = `<button class="btn lg" data-act="next">${st.players.length >= st.totalPlayers ? '🏁 Finish game' : 'Next player →'}</button>`; }
      else if (st.phase === 'done') msg.innerHTML = '🏁 Game over – congratulations to all our players!';
      ctrl.innerHTML = b;
    },
    ladder(ctx, st, rung) {
      ctx.R.querySelector('.hl-ladder').innerHTML = st.ladder.map((v, i) => ({ v, i })).reverse().map(({ v, i }) => `<div class="hl-rung ${i === rung ? 'on' : ''} ${i < rung ? 'past' : ''} ${st.safe.includes(i) ? 'safe' : ''} ${i === st.ladder.length - 1 ? 'top' : ''}" data-r="${i}"><i>${i + 1}</i><b>${gbp(v)}</b>${st.safe.includes(i) ? '<em>🔒</em>' : ''}</div>`).join('');
    },
    async animate(ctx, st, e) {
      const { R, ov, mine } = ctx, pl = st.players[e.player ?? st.current];
      if (e.type === 'reveal') {
        await reelReveal(ov, R, e, mine, `SELECTING PLAYER ${e.player + 1}`, ctx.dead); ov.innerHTML = '';
        this.ladder(ctx, st, 0);
        R.querySelector('.hl-past').innerHTML = ''; R.querySelector('.hl-cards').innerHTML = cardHTML(e.card, 'big flip') + cardHTML(null, 'big ghost'); Sound.whoosh(); await wait(1200); return;
      }
      if (e.type === 'guess') {
        const call = R.querySelector('.hl-call'); call.innerHTML = `<div class="hl-says ${e.guess}">${e.guess === 'higher' ? '▲ HIGHER!' : '▼ LOWER!'}</div>`; Sound.beep(); await wait(1100);
        const cards = R.querySelector('.hl-cards'); const cur = cards.firstElementChild;
        cards.innerHTML = (cur ? cur.outerHTML.replace('flip', '') : '') + cardHTML(e.card, 'big flip deal'); Sound.whoosh(); await wait(900);
        call.innerHTML = `<div class="hl-out ${e.outcome}">${e.outcome === 'right' ? '✅ CORRECT!' : e.outcome === 'push' ? '🤝 SAME CARD – no change' : '❌ WRONG!'}</div>`;
        if (e.outcome === 'right') { Sound.chime(true); this.ladder(ctx, st, e.rung); const r = R.querySelector(`.hl-rung[data-r="${e.rung}"]`); r && r.classList.add('climb'); }
        else if (e.outcome === 'wrong') Sound.buzz(); else Sound.tick();
        await wait(1500);
        const past = R.querySelector('.hl-past'); if (cur) { past.insertAdjacentHTML('beforeend', cur.outerHTML.replace(/big|flip|deal/g, '').replace('class="pc', 'class="pc mini')); }
        cards.innerHTML = cardHTML(e.card, 'big') + cardHTML(null, 'big ghost'); call.innerHTML = ''; return;
      }
      if (e.type === 'cash' || e.type === 'top' || e.type === 'bust') {
        if (e.type === 'bust') { this.ladder(ctx, st, e.rung); const r = R.querySelector(`.hl-rung[data-r="${e.rung}"]`); r && r.classList.add('drop'); }
        ov.innerHTML = `<div class="bk2-dim"></div>${e.type === 'bust' ? `<div class="bk2-stamp no" style="font-size:clamp(40px,11vw,84px)">SAFE AT ${gbp(e.amount)}</div>` : `<div class="bk2-stamp deal">${e.type === 'top' ? 'TOP PRIZE!' : 'BANKED!'}</div><div class="bk2-sub">${esc(String(pl && pl.name || '').split(' ')[0])} wins <b>${gbp(e.amount)}</b></div>`}`;
        e.type === 'bust' ? Sound.buzz() : (Sound.fanfare(), confetti(R, e.type === 'top' ? 260 : 160)); await wait(2800); ov.innerHTML = ''; return;
      }
      if (e.type === 'done') { Sound.fanfare(); confetti(R, 200); }
    }
  });
}

// ================= PLINKO (one ball per digit of the winning number) =================
async function plinkoDigits(host, number, digits, dur, seed) {
  const str2 = String(number).padStart(digits, '0'), per = Math.max(1800, (dur - 1200) / digits);
  host.innerHTML = `<div class="pk"><div class="pk-num">${str2.split('').map(() => '<span></span>').join('')}</div><canvas class="pk-cv"></canvas></div>`;
  const cv = host.querySelector('.pk-cv'), c = cv.getContext('2d'), slots = host.querySelectorAll('.pk-num span');
  const Wd = 520, Ht = 560, dpr = Math.min(2.5, window.devicePixelRatio || 1); cv.width = Wd * dpr; cv.height = Ht * dpr; c.scale(dpr, dpr);
  const ROWS = 9, gap = 46, x0 = Wd / 2, y0 = 60, slotY = y0 + ROWS * gap + 24;
  const pegX = (row, k) => x0 + (k - row / 2) * gap;
  const board = (ball, hit) => {
    c.clearRect(0, 0, Wd, Ht);
    for (let r = 1; r <= ROWS; r++) for (let k = 0; k <= r; k++) { c.beginPath(); c.arc(pegX(r, k), y0 + r * gap - gap / 2, 5, 0, 7); c.fillStyle = (r + k) % 2 ? '#5b8cff' : '#ff4a63'; c.shadowColor = c.fillStyle; c.shadowBlur = 10; c.fill(); }
    c.shadowBlur = 0;
    for (let s = 0; s < 10; s++) { const x = pegX(ROWS, s) + gap / 2 - gap / 2; const on = hit === s;
      c.fillStyle = on ? '#ffc400' : 'rgba(255,255,255,.08)'; c.strokeStyle = on ? '#fff' : 'rgba(255,255,255,.25)'; c.lineWidth = 2;
      c.beginPath(); c.roundRect ? c.roundRect(x - gap / 2 + 3, slotY, gap - 6, 54, 8) : c.rect(x - gap / 2 + 3, slotY, gap - 6, 54); c.fill(); c.stroke();
      c.fillStyle = on ? '#2a1c00' : '#fff'; c.font = '400 24px "Russo One", Inter, sans-serif'; c.textAlign = 'center'; c.fillText(s, x, slotY + 36); }
    if (ball) { const g = c.createRadialGradient(ball.x - 3, ball.y - 3, 1, ball.x, ball.y, 11); g.addColorStop(0, '#fff'); g.addColorStop(1, '#ffc400'); c.fillStyle = g; c.shadowColor = '#ffc400'; c.shadowBlur = 18; c.beginPath(); c.arc(ball.x, ball.y, 10, 0, 7); c.fill(); c.shadowBlur = 0; }
  };
  board();
  for (let i = 0; i < digits; i++) {
    const d = +str2[i], R = prng(seed + i * 7919); const moves = Array.from({ length: ROWS }, (_, k) => k < d ? 1 : 0); for (let k = moves.length - 1; k > 0; k--) { const j = Math.floor(R() * (k + 1)); [moves[k], moves[j]] = [moves[j], moves[k]]; }
    // waypoints: start above the top peg, then each row
    const pts = [{ x: x0, y: 10 }]; let pos = 0;
    for (let r = 0; r < ROWS; r++) { pos += moves[r]; pts.push({ x: pegX(r + 1, pos) - (moves[r] ? gap / 2 : -gap / 2) + (moves[r] ? 0 : -gap) + gap / 2 , y: y0 + (r + 1) * gap - gap / 2 - 14 }); }
    pts.push({ x: pegX(ROWS, d), y: slotY + 26 });
    // fix x positions: ball sits between pegs → x = pegX(row,pos) shifted
    for (let r = 1; r < pts.length - 1; r++) { let p2 = 0; for (let q = 0; q < r; q++) p2 += moves[q]; pts[r].x = x0 + (p2 - r / 2) * gap; }
    const t0 = performance.now(), segT = (per - 700) / (pts.length - 1);
    await new Promise(res => { (function f(now) { const el = Math.max(0, now - t0), si = Math.min(pts.length - 2, Math.floor(el / segT)), u = Math.min(1, (el - si * segT) / segT);
      const a = pts[si], b = pts[si + 1], x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u - Math.sin(u * Math.PI) * 12;
      board({ x, y }); if (si !== f.last) { f.last = si; Sound.tick(); }
      if (el < segT * (pts.length - 1) && host.isConnected) requestAnimationFrame(f); else res(); })(t0); });
    board({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y }, d); slots[i].textContent = d; slots[i].classList.add('on'); Sound.chime(true);
    await wait(650);
  }
}

// ================= SCRATCH CARD =================
async function scratchReveal(host, w, dur) {
  host.innerHTML = `<div class="sc"><div class="sc-card"><div class="sc-top">🍀 SCRATCH TO REVEAL THE WINNER 🍀</div><div class="sc-area"><div class="sc-under"><small>${esc(w.prize || '')}</small><b>#${w.ticket}</b><span>${esc(w.name || '')}</span><em>${esc(w.town || '')}</em></div><canvas class="sc-foil"></canvas><i class="sc-coin">£</i></div></div></div>`;
  const area = host.querySelector('.sc-area'), cv = host.querySelector('.sc-foil'), coin = host.querySelector('.sc-coin');
  await wait(50);
  const Wd = area.clientWidth, Ht = area.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Wd * dpr; cv.height = Ht * dpr; const c = cv.getContext('2d'); c.scale(dpr, dpr);
  const g = c.createLinearGradient(0, 0, Wd, Ht); g.addColorStop(0, '#9aa3b5'); g.addColorStop(0.3, '#e9edf5'); g.addColorStop(0.5, '#a9b2c4'); g.addColorStop(0.7, '#eef1f7'); g.addColorStop(1, '#8e97aa'); c.fillStyle = g; c.fillRect(0, 0, Wd, Ht);
  c.fillStyle = 'rgba(80,90,110,.35)'; c.font = '800 15px Inter'; for (let y = 22; y < Ht; y += 30) for (let x = (y / 30 % 2) * 40; x < Wd; x += 80) c.fillText('★ ELITE ★', x, y);
  c.globalCompositeOperation = 'destination-out'; c.lineCap = 'round'; c.lineWidth = Math.max(34, Ht / 5);
  const passes = 7, pts = []; for (let i = 0; i <= passes; i++) { const y = (i + 0.5) * Ht / (passes + 1); pts.push([i % 2 ? Wd - 10 : 10, y], [i % 2 ? 10 : Wd - 10, y + Ht / (passes + 1) / 2]); }
  const t0 = performance.now(), D = dur * 0.8; let last = pts[0];
  await new Promise(res => { (function f(now) { const x = Math.max(0, Math.min(1, (now - t0) / D)), fi = x * (pts.length - 1), i = Math.floor(fi), u = fi - i, a = pts[i], b = pts[Math.min(pts.length - 1, i + 1)];
    const p = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; c.beginPath(); c.moveTo(last[0], last[1]); c.lineTo(p[0], p[1]); c.stroke(); last = p;
    coin.style.transform = `translate(${p[0] - 22}px,${p[1] - 22}px) rotate(${x * 900}deg)`; if (Math.random() < 0.3) Sound.tick();
    if (x < 1 && host.isConnected) requestAnimationFrame(f); else res(); })(t0); });
  cv.style.transition = 'opacity .6s'; cv.style.opacity = 0; coin.style.opacity = 0; host.querySelector('.sc-under').classList.add('shine-in'); Sound.fanfare();
  await wait(700);
}

window.SERGames = { runRace, BankerShow, LmsShow, HiloShow, plinkoDigits, scratchReveal, cardHTML, LABEL, COLORS, gbp, Sound, confetti };
})();
