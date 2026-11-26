/* Sheppey Elite – instant-win games (casino edition).
   Every result is decided on the server before the animation starts (the winning ticket numbers were locked when
   the competition was saved). These games only *reveal* the result – they never change it.
   IGames.create(kind, host, { theme, prizes, logo }) → { play(results) : Promise, mode, labels, destroy() }
   results = [{ ticket, win: null | { i, prize, icon } }]
   The host fires an 'igaction' event when a player pulls the slot lever (the page treats it like the Play button). */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const DPR = () => Math.min(2, window.devicePixelRatio || 1);
  // pre-drawn glossy balls/bulbs: drawing a gradient + glow every frame is what makes phones stutter, so draw each look once and stamp it
  const spriteCache = {};
  function orb(col, r, glow = 0, cap = false) { const k = col + '|' + r.toFixed(1) + '|' + glow + '|' + cap; if (spriteCache[k]) return spriteCache[k];
    const m = Math.ceil(r + glow + 3), d = DPR(), x = document.createElement('canvas'); x.width = x.height = m * 2 * d; const c = x.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.translate(m, m);
    if (glow) { c.shadowColor = col; c.shadowBlur = glow; } const g = c.createRadialGradient(-r * 0.35, -r * 0.35, 0.4, 0, 0, r); g.addColorStop(0, '#fff'); g.addColorStop(0.42, col); g.addColorStop(1, mix(col, -0.55)); c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill(); c.shadowBlur = 0;
    if (cap) { c.fillStyle = '#c9a02c'; c.fillRect(-1.6, -r - 2.4, 3.2, 2.6); } return (spriteCache[k] = { x, m }); }
  const stamp = (c, sp, x, y, sc = 1) => { const w = sp.m * 2 * sc; c.drawImage(sp.x, x - w / 2, y - w / 2, w, w); };
  // only animate what's on screen
  const onScreen = el => { const st = { v: true }; try { const io = new IntersectionObserver(e => { st.v = e[0].isIntersecting; }); io.observe(el); st.stop = () => io.disconnect(); } catch { st.stop = () => { }; } return st; };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rint = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isImg = v => /^(\/uploads\/|data:image\/|[a-z0-9_-]+\.(png|jpe?g|webp|svg)$)/i.test(String(v || ''));
  const iconHTML = (v, cls = '') => isImg(v) ? `<img class="ig-ic ${cls}" src="${esc(v)}" alt="">` : `<span class="ig-ic ${cls}">${esc(v || '⭐')}</span>`;
  const list = v => String(v || '').split(',').map(x => x.trim()).filter(Boolean);
  const imgCache = {};
  const loadImg = src => imgCache[src] || (imgCache[src] = new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; }));
  const DECOS = ['classic', 'xmas', 'spooky', 'party'];
  const decoOf = t => DECOS.includes(t && t.deco) ? t.deco : 'classic';
  const valOf = p => p ? (p.cash || p.value || 0) : 0;
  const topPrize = P => (P || []).slice().sort((a, z) => valOf(z) - valOf(a) || a.count - z.count)[0] || null;
  const short = p => { const m = String(p && p.prize || '').match(/£[\d,.]+[kK]?/); return m ? m[0] : String(p && p.prize || '').split(' ')[0].slice(0, 7); };
  const winText = w => w ? (w.prize || 'Winner!') : '';
  const gbp = p => '£' + (p / 100).toFixed(p % 100 ? 2 : 0);
  const hexA = (h, a) => { h = String(h || '#ffffff').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h.slice(0, 6), 16) || 0; return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  const mix = (h, k) => { h = String(h || '#000000').replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); const n = parseInt(h.slice(0, 6), 16) || 0; const f = v => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))); return `rgb(${f(n >> 16 & 255)},${f(n >> 8 & 255)},${f(n & 255)})`; };
  const put = (el, html) => { el.insertAdjacentHTML('beforeend', html); return el.lastElementChild; };
  const GOLD = ['#6e4f0e', '#f5dc8a', '#a97c17', '#fff0b8', '#8a6514'];
  const goldGrad = (c, x0, y0, x1, y1, stops = GOLD) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, k) => g.addColorStop(k / (stops.length - 1), s)); return g; };

  // ---------- sound: a small synth with a compressor – coins, fanfares, crowd ----------
  const Snd = (() => {
    let ac = null, out = null, nb = null, on = true; try { on = localStorage.getItem('ser_igsound') !== '0'; } catch { }
    const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); const comp = ac.createDynamicsCompressor(); out = ac.createGain(); out.gain.value = 0.9; comp.connect(out).connect(ac.destination); out = comp; } catch { ac = null; } } if (ac && ac.state === 'suspended') ac.resume(); return ac; };
    const tone = (f, d = 0.08, type = 'sine', v = 0.05, slide = 0, delay = 0) => { if (!on) return; const a = ctx(); if (!a) return; const t0 = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t0); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + d);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g).connect(out); o.start(t0); o.stop(t0 + d + 0.03); };
    const noise = (d = 0.4, v = 0.05, f = 1200, q = 0.8, delay = 0) => { if (!on) return; const a = ctx(); if (!a) return;
      if (!nb) { nb = a.createBuffer(1, a.sampleRate * 2, a.sampleRate); const ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
      const s = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain(), t0 = a.currentTime + delay; s.buffer = nb; bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v, t0 + d * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); s.connect(bp).connect(g).connect(out); s.start(t0, Math.random()); s.stop(t0 + d + 0.05); };
    const S = {
      tick: () => tone(1900 + Math.random() * 300, 0.022, 'square', 0.016),
      peg: () => tone(1100 + Math.random() * 900, 0.06, 'sine', 0.028),
      coin: (d = 0) => { tone(1975, 0.08, 'sine', 0.035, 0, d); tone(2637, 0.16, 'sine', 0.03, 0, d + 0.05); },
      win: () => { [523, 659, 784, 1046].forEach((f, i) => { tone(f, 0.24, 'triangle', 0.06, 0, i * 0.09); tone(f * 2, 0.12, 'sine', 0.015, 0, i * 0.09); }); for (let k = 0; k < 6; k++) S.coin(0.38 + k * 0.07); },
      big: () => { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => { tone(f, 0.3, 'triangle', 0.06, 0, i * 0.11); tone(f / 2, 0.3, 'sawtooth', 0.014, 0, i * 0.11); }); for (let k = 0; k < 16; k++) S.coin(0.5 + k * 0.06); noise(1.8, 0.03, 3200, 0.5, 0.2); },
      lose: () => { tone(392, 0.16, 'triangle', 0.035); tone(311, 0.32, 'triangle', 0.035, -60, 0.14); },
      thud: () => { tone(90, 0.18, 'sine', 0.09, -40); noise(0.08, 0.03, 420, 1); },
      stop: () => { tone(150, 0.09, 'square', 0.03, -60); noise(0.05, 0.025, 2600, 1.5); },
      whoosh: () => noise(0.35, 0.05, 900, 0.6),
      scratch: () => noise(0.04, 0.012, 5200, 2),
      pop: () => tone(620, 0.09, 'sine', 0.05, 520),
      dab: () => { tone(230, 0.08, 'sine', 0.06, -120); noise(0.06, 0.02, 1800, 1); },
      crowd: big => { noise(big ? 2.4 : 1.2, big ? 0.07 : 0.035, 700, 0.4); noise(big ? 2.2 : 1, 0.03, 1900, 0.5, 0.05); },
      antic: (d = 1.2) => tone(280, d, 'sawtooth', 0.012, 520),
      lever: () => { tone(300, 0.12, 'square', 0.02, -150); noise(0.1, 0.02, 1500, 1); },
      get on() { return on; }, toggle() { on = !on; try { localStorage.setItem('ser_igsound', on ? '1' : '0'); } catch { } return on; } };
    return S;
  })();
  const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch { } };

  // ---------- a full-size canvas on top of an element, for particle effects ----------
  function fxCanvas(root, cls) { const cv = document.createElement('canvas'); cv.className = cls; root.appendChild(cv); const r = root.getBoundingClientRect(), d = DPR(); cv.width = r.width * d; cv.height = r.height * d; const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); return { cv, c, W: r.width, H: r.height, r }; }
  function drawCoin(c, x, y, r, ph) { const sx = Math.max(0.12, Math.abs(Math.cos(ph))); c.save(); c.translate(x, y); c.scale(sx, 1);
    c.fillStyle = '#8a6514'; c.beginPath(); c.arc(0, 1.5, r, 0, TAU); c.fill(); c.fillStyle = goldGrad(c, -r, -r, r, r); c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(110,79,14,.8)'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, r * 0.72, 0, TAU); c.stroke();
    if (sx > 0.5) { c.fillStyle = 'rgba(110,79,14,.85)'; c.font = `900 ${r * 1.05}px Inter, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('£', 0, 1); } c.restore(); }
  // gold coins + the season's emojis exploding out and raining down
  function coins(root, t, n = 50, ox, oy) {
    const { cv, c, W, H } = fxCanvas(root, 'ig-burst'); const em = list(t.particles).filter(v => !isImg(v));
    const P = Array.from({ length: n }, (_, k) => { const fromTop = k % 3 === 0; return { x: fromTop ? rnd(0, W) : (ox ?? W / 2) + rnd(-20, 20), y: fromTop ? rnd(-H * 0.6, -10) : (oy ?? H * 0.45), vx: fromTop ? rnd(-1, 1) : rnd(-7, 7), vy: fromTop ? rnd(1, 4) : rnd(-13, -4), r: rnd(7, 12), ph: rnd(0, TAU), vp: rnd(0.15, 0.35), e: k % 4 === 3 && em.length ? pick(em) : null, s: rnd(16, 26), rot: rnd(0, TAU) }; });
    let f = 0; const L = 120; const step = () => { c.clearRect(0, 0, W, H); f++;
      for (const p of P) { p.vy += 0.3; p.vx *= 0.995; p.x += p.vx; p.y += p.vy; p.ph += p.vp; p.rot += 0.05; c.globalAlpha = Math.max(0, Math.min(1, (L - f) / 30));
        if (p.e) { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.font = `${p.s}px serif`; c.textAlign = 'center'; c.fillText(p.e, 0, 0); c.restore(); } else drawCoin(c, p.x, p.y, p.r, p.ph); }
      if (f < L) requestAnimationFrame(step); else cv.remove(); }; requestAnimationFrame(step);
  }
  // a small sparkle burst at a point on screen (client coordinates)
  function sparkle(root, t, cx, cy, n = 16) { const { cv, c, W, H, r } = fxCanvas(root, 'ig-burst'); const x0 = cx - r.left, y0 = cy - r.top;
    const P = Array.from({ length: n }, () => ({ x: x0, y: y0, vx: rnd(-4, 4), vy: rnd(-6, -1), s: rnd(2, 4.5), c: pick([t.accent, '#fff', t.win, '#ffe9a3']) })); let f = 0;
    const step = () => { c.clearRect(0, 0, W, H); f++; for (const p of P) { p.vy += 0.22; p.x += p.vx; p.y += p.vy; c.globalAlpha = Math.max(0, 1 - f / 50); c.fillStyle = p.c; c.save(); c.translate(p.x, p.y); c.rotate(f / 8); c.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); c.restore(); }
      if (f < 50) requestAnimationFrame(step); else cv.remove(); }; requestAnimationFrame(step); }
  // the big win / loss moment: light rays, gold card, counting cash, coin shower
  function celebrate(root, t, res, prizes) {
    return new Promise(done => {
      const w = res.win, P = w && ((prizes || []).find(p => p.i === w.i) || w), top = topPrize(prizes), big = !!(w && (prizes || []).length > 1 && top && w.i === top.i);
      const el = document.createElement('div'); el.className = 'igx-cel ' + (w ? (big ? 'is-big' : 'is-win') : 'is-lose');
      el.innerHTML = w ? `<div class="igx-rays"></div><div class="igx-card"><small>TICKET #${res.ticket}</small><em>${esc(res.label || (big ? 'BIG WIN' : 'WINNER'))}</em><div class="igx-ic">${iconHTML(w.icon)}</div>${P && P.cash ? `<strong class="igx-amt">£0</strong>` : ''}<b>${esc(winText(w))}</b>${P && P.cash ? `<i>${P.credit ? 'Added to your site credit' : 'Added to your cash balance'}</i>` : `<i>We'll be in touch to arrange your prize</i>`}</div>`
        : `<div class="igx-card l"><small>TICKET #${res.ticket}</small><b>${esc(t.lose || 'Not this time')}</b></div>`;
      root.appendChild(el); requestAnimationFrame(() => el.classList.add('on'));
      if (w) { (big ? Snd.big : Snd.win)(); coins(root, t, big ? 90 : 46); buzz(big ? [40, 60, 40, 60, 140] : [30, 40, 60]);
        const amt = el.querySelector('.igx-amt'); if (amt) { const tgt = P.cash, t0 = performance.now(), D = big ? 1500 : 900; const f = now => { const e = Math.min(1, (now - t0) / D), v = Math.round(tgt * (1 - Math.pow(1 - e, 3))); amt.textContent = gbp(v); if (e < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); } }
      else Snd.lose();
      let shut = false; const close = () => { if (shut) return; shut = true; el.classList.remove('on'); setTimeout(() => { el.remove(); done(res); }, 320); };
      el.addEventListener('click', close); setTimeout(close, w ? (big ? 3000 : 2200) : 1100);
    });
  }
  // the round-up after playing several at once
  function summary(root, t, R) {
    const W = R.filter(r => r.win); if (!W.length) return Promise.resolve();
    const m = new Map(); W.forEach(r => m.set(r.win.prize, { n: (m.get(r.win.prize) || { n: 0 }).n + 1, icon: r.win.icon }));
    return new Promise(done => { const el = document.createElement('div'); el.className = 'igx-cel is-win';
      el.innerHTML = `<div class="igx-rays"></div><div class="igx-card"><small>${R.length} PLAYS REVEALED</small><em>${W.length} INSTANT WIN${W.length > 1 ? 'S' : ''}</em><div class="igx-sum">${[...m].map(([p, v]) => `<span>${iconHTML(v.icon)} ${v.n} × ${esc(p)}</span>`).join('')}</div></div>`;
      root.appendChild(el); requestAnimationFrame(() => el.classList.add('on')); Snd.win(); coins(root, t, 60);
      let shut = false; const close = () => { if (shut) return; shut = true; el.classList.remove('on'); setTimeout(() => { el.remove(); done(); }, 320); }; el.addEventListener('click', close); setTimeout(close, 2600); });
  }

  // ---------- the cabinet: gold bezel with chasing bulbs + a seasonal ambient layer ----------
  function bulbs(host) {
    const ring = document.createElement('div'); ring.className = 'igx-bulbs'; host.appendChild(ring);
    const lay = () => { const W = host.offsetWidth, H = host.offsetHeight; if (!W || !H) return; const inset = 4.5, w = W - inset * 2, h = H - inset * 2, per = 2 * (w + h), n = Math.max(16, Math.round(per / 19));
      let html = ''; for (let k = 0; k < n; k++) { let s = k / n * per, x, y; if (s < w) { x = s; y = 0; } else if ((s -= w) < h) { x = w; y = s; } else if ((s -= h) < w) { x = w - s; y = h; } else { s -= w; x = 0; y = h - s; }
        html += `<i style="left:${(x + inset).toFixed(1)}px;top:${(y + inset).toFixed(1)}px;animation-delay:${-(k % 3) * 0.3}s" class="b${k % 3}"></i>`; } ring.innerHTML = html; };
    lay(); const ro = new ResizeObserver(lay); ro.observe(host); return () => ro.disconnect();
  }
  function ambient(root, t) {
    const dk = decoOf(t), cv = document.createElement('canvas'); cv.className = 'igx-amb'; root.prepend(cv); const c = cv.getContext('2d'); let W = 0, H = 0, raf = 0, alive = true;
    const fit = () => { const d = DPR(); W = root.clientWidth; H = root.clientHeight; cv.width = W * d; cv.height = H * d; c.setTransform(d, 0, 0, d, 0, 0); };
    const cols = { classic: [t.accent, '#fff'], xmas: ['#fff'], spooky: ['#1a0d24'], party: [t.c1, t.c2, t.accent, '#fff'] }[dk];
    const N = { classic: 16, xmas: 44, spooky: 6, party: 22 }[dk];
    const mk = init => ({ x: rnd(0, W || 380), y: init ? rnd(0, H || 500) : -12, r: rnd(1, 3.2), vy: dk === 'spooky' ? rnd(-0.2, 0.2) : rnd(0.25, 0.9), vx: dk === 'spooky' ? rnd(0.5, 1.2) * (Math.random() < 0.5 ? -1 : 1) : rnd(-0.3, 0.3), ph: rnd(0, TAU), col: pick(cols), life: rnd(60, 160), age: 0 });
    fit(); const P = Array.from({ length: N }, () => mk(true));
    const vis = onScreen(root); let lastF = 0;
    const step = now => { if (!alive) return; raf = requestAnimationFrame(step); if (document.hidden || !vis.v || now - lastF < 32) return; lastF = now; c.clearRect(0, 0, W, H);
      for (const p of P) { p.ph += 0.05; p.age++;
        if (dk === 'classic') { // twinkling glints
          const a = Math.sin(p.age / p.life * Math.PI); if (p.age > p.life) Object.assign(p, mk(true), { age: 0 }); const s = p.r * 2.4 * a; c.globalAlpha = 0.7 * a; c.fillStyle = p.col;
          c.beginPath(); c.moveTo(p.x, p.y - s * 2); c.lineTo(p.x + s * 0.4, p.y - s * 0.4); c.lineTo(p.x + s * 2, p.y); c.lineTo(p.x + s * 0.4, p.y + s * 0.4); c.lineTo(p.x, p.y + s * 2); c.lineTo(p.x - s * 0.4, p.y + s * 0.4); c.lineTo(p.x - s * 2, p.y); c.lineTo(p.x - s * 0.4, p.y - s * 0.4); c.fill(); continue; }
        p.x += p.vx + (dk === 'xmas' ? Math.sin(p.ph) * 0.35 : 0); p.y += p.vy + (dk === 'spooky' ? Math.sin(p.ph * 1.6) * 0.8 : 0);
        if (p.y > H + 12 || p.x < -30 || p.x > W + 30) Object.assign(p, mk(false), dk === 'spooky' ? { x: p.vx > 0 ? -20 : W + 20, y: rnd(10, H * 0.6) } : {});
        if (dk === 'xmas') { c.globalAlpha = 0.55 + p.r / 8; c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); }
        else if (dk === 'spooky') { const f = Math.sin(p.ph * 4) * 0.6; c.globalAlpha = 0.7; c.fillStyle = '#05020a'; c.save(); c.translate(p.x, p.y); c.scale(p.vx > 0 ? 1 : -1, 1); const s = 5 + p.r * 2;
          c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-s, -s * f - 2, -s * 1.8, s * 0.2); c.quadraticCurveTo(-s, 0, -s * 0.5, s * 0.3); c.lineTo(0, s * 0.1); c.lineTo(s * 0.5, s * 0.3); c.quadraticCurveTo(s, 0, s * 1.8, s * 0.2); c.quadraticCurveTo(s, -s * f - 2, 0, 0); c.fill(); c.restore(); }
        else { c.globalAlpha = 0.75; c.fillStyle = p.col; c.save(); c.translate(p.x, p.y); c.rotate(p.ph); c.scale(1, Math.cos(p.ph * 1.7)); c.fillRect(-p.r * 1.4, -p.r * 0.7, p.r * 2.8, p.r * 1.4); c.restore(); } }
      c.globalAlpha = 1; };
    raf = requestAnimationFrame(step); const ro = new ResizeObserver(fit); ro.observe(root);
    return () => { alive = false; cancelAnimationFrame(raf); ro.disconnect(); vis.stop(); cv.remove(); };
  }
  const canvasIn = (host, h) => { const cv = document.createElement('canvas'); host.appendChild(cv); const fit = () => { const w = host.clientWidth, d = DPR(); cv.width = w * d; cv.height = h(w) * d; cv.style.width = w + 'px'; cv.style.height = h(w) + 'px'; cv.getContext('2d').setTransform(d, 0, 0, d, 0, 0); return w; }; return { cv, fit }; };

  // =====================================================================================
  // PLINKO – drop one or drop them all. Christmas turns the board into a tree with baubles and presents.
  function Plinko(host, o) {
    const t = o.theme, dk = decoOf(t), root = o.root, ROWS = 11, BINS = ROWS + 1; host.classList.add('ig-plinko');
    const { cv, fit } = canvasIn(host, w => Math.round(w * 1.26)); const c = cv.getContext('2d');
    const pr = (o.prizes || []).slice().sort((a, z) => valOf(z) - valOf(a) || a.count - z.count);
    const bins = Array.from({ length: BINS }, () => null); pr.slice(0, 4).forEach((p, k) => { bins[k] = p; bins[BINS - 1 - k] = p; });
    let W = fit(), H = cv.clientHeight, balls = [], flash = {}, hits = {}, floats = [], raf = 0, stat = null;
    const geo = () => { const pad = W * 0.05, top = W * (dk === 'xmas' ? 0.17 : 0.11), gap = (W - pad * 2) / BINS, rowH = (H - top - W * 0.2) / ROWS; return { pad, top, gap, rowH }; };
    const peg = (r, k) => { const g = geo(); return { x: W / 2 + (k - (r + 2) / 2) * g.gap, y: g.top + r * g.rowH }; };
    const binX = k => { const g = geo(); return g.pad + g.gap * (k + 0.5); };
    const BY = () => H - W * 0.165, BH = () => W * 0.15;
    const BAUBLE = ['#e3262f', '#ffd84d', '#e8eeff', '#2f7bff'], CANDY = ['#ff4fa3', '#3ddbd9', '#ffd84d', '#9b6bff'];
    // everything that never moves is painted once
    function paintStatic() {
      stat = document.createElement('canvas'); const d = DPR(); stat.width = W * d; stat.height = H * d; const s = stat.getContext('2d'); s.setTransform(d, 0, 0, d, 0, 0); const g = geo();
      if (dk === 'xmas') {
        const sky = s.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#061a2e'); sky.addColorStop(1, '#03100c'); s.fillStyle = sky; s.fillRect(0, 0, W, H);
        const apexY = g.top - g.rowH * 1.5, baseY = g.top + (ROWS - 1) * g.rowH + g.rowH * 0.7, HT = baseY - apexY, HW = (ROWS + 3) / 2 * g.gap;
        // trunk
        const tw = g.gap * 1.3; const tg = s.createLinearGradient(W / 2 - tw / 2, 0, W / 2 + tw / 2, 0); tg.addColorStop(0, '#2a170a'); tg.addColorStop(0.5, '#6b4220'); tg.addColorStop(1, '#2a170a'); s.fillStyle = tg; s.fillRect(W / 2 - tw / 2, baseY - 4, tw, BY() - baseY + 4);
        // three tiers of branches
        [[0, 0.42, 0.5], [0.2, 0.72, 0.8], [0.45, 1, 1.07]].forEach(([a, b, wk]) => { const y0 = apexY + HT * a, y1 = apexY + HT * b, hw = HW * wk;
          const gr = s.createLinearGradient(W / 2 - hw, 0, W / 2 + hw, 0); gr.addColorStop(0, '#0a3d22'); gr.addColorStop(0.45, '#1c8a4a'); gr.addColorStop(0.55, '#23a057'); gr.addColorStop(1, '#0a3d22');
          s.fillStyle = gr; s.beginPath(); s.moveTo(W / 2, y0 - (a ? g.rowH * 0.4 : 0)); s.lineTo(W / 2 + hw, y1);
          const sc = 7; for (let i = sc; i >= 0; i--) { const x = W / 2 - hw + (2 * hw) * i / sc; s.quadraticCurveTo(x + hw / sc, y1 + g.rowH * 0.35, x, y1); } s.closePath(); s.fill();
          s.strokeStyle = 'rgba(255,255,255,.08)'; s.lineWidth = 1; s.stroke(); });
        // tinsel garlands
        [2.5, 5.5, 8.5].forEach(rr => { const y = g.top + rr * g.rowH, hw = (rr + 3.4) / 2 * g.gap; s.strokeStyle = 'rgba(255,216,77,.75)'; s.lineWidth = 2; s.setLineDash([2, 4]); s.beginPath(); s.moveTo(W / 2 - hw, y - g.rowH * 0.25); s.quadraticCurveTo(W / 2, y + g.rowH * 0.9, W / 2 + hw, y - g.rowH * 0.25); s.stroke(); s.setLineDash([]); });
        // snow on the ground
        s.fillStyle = 'rgba(235,242,255,.9)'; s.beginPath(); s.moveTo(0, BY() - 2); for (let x = 0; x <= W; x += W / 10) s.quadraticCurveTo(x + W / 20, BY() - 9, x + W / 10, BY() - 2); s.lineTo(W, BY() + 4); s.lineTo(0, BY() + 4); s.fill();
      } else if (dk === 'spooky') {
        const sky = s.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#1b0b2e'); sky.addColorStop(1, '#07030c'); s.fillStyle = sky; s.fillRect(0, 0, W, H);
        const mx = W * 0.8, my = W * 0.16, mr = W * 0.1; const mg = s.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3); mg.addColorStop(0, 'rgba(255,214,140,.35)'); mg.addColorStop(1, 'rgba(255,214,140,0)'); s.fillStyle = mg; s.fillRect(0, 0, W, H);
        s.fillStyle = '#ffe2a8'; s.beginPath(); s.arc(mx, my, mr, 0, TAU); s.fill(); s.fillStyle = 'rgba(180,140,80,.35)'; [[-0.3, -0.2, 0.22], [0.25, 0.15, 0.16], [-0.1, 0.4, 0.12]].forEach(([a, b, r]) => { s.beginPath(); s.arc(mx + a * mr, my + b * mr, r * mr, 0, TAU); s.fill(); });
        s.strokeStyle = 'rgba(255,255,255,.18)'; s.lineWidth = 0.8; for (let k = 0; k < 6; k++) { const a = k / 6 * (Math.PI / 2); s.beginPath(); s.moveTo(0, 0); s.lineTo(Math.cos(a) * W * 0.25, Math.sin(a) * W * 0.25); s.stroke(); } for (let r = 1; r < 5; r++) { s.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * (Math.PI / 2), rr = r * W * 0.055; k ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } s.stroke(); }
        s.fillStyle = '#05020a'; s.beginPath(); s.moveTo(0, BY()); for (let x = 0; x <= W; x += W / 6) s.quadraticCurveTo(x + W / 12, BY() - rnd(6, 18), x + W / 6, BY()); s.lineTo(W, BY() + 4); s.lineTo(0, BY() + 4); s.fill();
      } else {
        const bg = s.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, dk === 'party' ? mix(t.bg, 0.06) : '#0b1438'); bg.addColorStop(1, dk === 'party' ? mix(t.bg, -0.3) : '#050918'); s.fillStyle = bg; s.fillRect(0, 0, W, H);
        const gl = s.createRadialGradient(W / 2, g.top, 4, W / 2, g.top, W * 0.7); gl.addColorStop(0, hexA(t.c1, 0.32)); gl.addColorStop(1, hexA(t.c1, 0)); s.fillStyle = gl; s.fillRect(0, 0, W, H);
        const gl2 = s.createRadialGradient(W / 2, H, 4, W / 2, H, W * 0.7); gl2.addColorStop(0, hexA(t.c2, 0.3)); gl2.addColorStop(1, hexA(t.c2, 0)); s.fillStyle = gl2; s.fillRect(0, 0, W, H);
        s.strokeStyle = 'rgba(255,255,255,.035)'; s.lineWidth = 1; for (let x = -H; x < W; x += 22) { s.beginPath(); s.moveTo(x, 0); s.lineTo(x + H, H); s.stroke(); s.beginPath(); s.moveTo(x + H, 0); s.lineTo(x, H); s.stroke(); }
        if (dk === 'party') { s.strokeStyle = 'rgba(255,255,255,.5)'; s.lineWidth = 1; s.beginPath(); s.moveTo(0, 8); s.quadraticCurveTo(W / 2, 34, W, 8); s.stroke(); const fl = [t.c1, t.c2, t.accent, '#9b6bff']; for (let k = 0; k < 13; k++) { const x = (k + 0.5) / 13 * W, y = 8 + 26 * (1 - Math.pow(2 * x / W - 1, 2)) ; s.fillStyle = fl[k % 4]; s.beginPath(); s.moveTo(x - 9, y); s.lineTo(x + 9, y); s.lineTo(x, y + 15); s.fill(); } }
        // gold side rails
        [[2, 5], [W - 7, W - 2]].forEach(([a, b]) => { s.fillStyle = goldGrad(s, a, 0, b, 0); s.fillRect(a, 0, b - a, BY()); });
      }
      // bin dividers / trays
      const by = BY(), bh = BH();
      for (let k = 0; k < BINS; k++) { const x = g.pad + g.gap * k, b = bins[k], w = g.gap - 3, cx = x + g.gap / 2;
        if (dk === 'xmas') { // presents
          const wrap = b ? ['#e3262f', '#2f7bff', '#9b2bd8', '#e3262f'][pr.indexOf(b) % 4] : '#145a34'; s.fillStyle = wrap; s.beginPath(); s.roundRect(x + 1.5, by + 6, w, bh - 6, 3); s.fill();
          s.fillStyle = 'rgba(255,255,255,.12)'; s.fillRect(x + 1.5, by + 6, w, 4); s.fillStyle = b ? '#ffd84d' : 'rgba(255,216,77,.35)'; s.fillRect(cx - 1.5, by + 6, 3, bh - 6); s.fillRect(x + 1.5, by + 6 + (bh - 6) * 0.42, w, 3);
          s.beginPath(); s.ellipse(cx - 4, by + 5, 4, 2.6, -0.5, 0, TAU); s.ellipse(cx + 4, by + 5, 4, 2.6, 0.5, 0, TAU); s.fill(); }
        else if (dk === 'spooky') { s.fillStyle = b ? '#1d0f2c' : '#120a1a'; s.beginPath(); s.moveTo(x + 2, by + 8); s.lineTo(x + 2 + w, by + 8); s.quadraticCurveTo(x + 2 + w, by + bh, cx, by + bh); s.quadraticCurveTo(x + 2, by + bh, x + 2, by + 8); s.fill(); s.fillStyle = b ? '#9bff4d' : 'rgba(155,255,77,.15)'; s.fillRect(x + 1, by + 6, w + 2, 3); }
        else { const gr = s.createLinearGradient(0, by, 0, by + bh); if (b) { gr.addColorStop(0, '#fff2bd'); gr.addColorStop(0.5, '#e8bb45'); gr.addColorStop(1, '#8a6514'); } else { gr.addColorStop(0, '#1a2350'); gr.addColorStop(1, '#0a0f2a'); }
          s.fillStyle = gr; s.beginPath(); s.roundRect(x + 1.5, by, w, bh, 7); s.fill(); s.strokeStyle = b ? 'rgba(255,255,255,.6)' : 'rgba(255,216,77,.25)'; s.lineWidth = 1; s.stroke();
          if (dk === 'party' && b) { s.save(); s.beginPath(); s.roundRect(x + 1.5, by, w, bh, 7); s.clip(); s.fillStyle = 'rgba(255,79,163,.25)'; for (let i = -bh; i < w; i += 8) { s.beginPath(); s.moveTo(x + i, by + bh); s.lineTo(x + i + bh, by); s.lineTo(x + i + bh + 4, by); s.lineTo(x + i + 4, by + bh); s.fill(); } s.restore(); } }
        s.textAlign = 'center'; s.textBaseline = 'middle'; const lc = dk === 'classic' || dk === 'party' ? (b ? '#3a2600' : 'rgba(255,255,255,.35)') : (b ? '#fff' : 'rgba(255,255,255,.35)');
        if (b) { const ic = b.icon && !isImg(b.icon) ? b.icon : ''; s.fillStyle = lc; if (ic && g.gap > 22) { s.font = `${Math.min(15, g.gap * 0.5)}px serif`; s.fillText(ic, cx, by + bh * 0.42); s.font = `900 ${Math.min(10, g.gap * 0.32)}px Inter, sans-serif`; s.fillText(short(b), cx, by + bh * 0.78); }
          else { s.font = `900 ${Math.min(12, g.gap * 0.36)}px Inter, sans-serif`; s.fillText(short(b), cx, by + bh * 0.55); } }
        else { s.fillStyle = lc; s.font = `800 ${Math.min(11, g.gap * 0.36)}px Inter`; s.fillText('✕', cx, by + bh * 0.58); } }
    }
    function star(x, y, r, now) { c.save(); c.translate(x, y); c.rotate(Math.sin(now / 900) * 0.08); c.shadowColor = '#ffd84d'; c.shadowBlur = 18 + Math.sin(now / 300) * 8;
      c.fillStyle = goldGrad(c, -r, -r, r, r); c.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } c.closePath(); c.fill(); c.restore(); }
    function draw(now) {
      c.clearRect(0, 0, W, H); if (!stat) paintStatic(); c.drawImage(stat, 0, 0, W, H); const g = geo();
      if (dk === 'xmas') star(W / 2, g.top - g.rowH * 1.55, g.gap * 0.85, now);
      for (let r = 0; r < ROWS; r++) for (let k = 0; k < r + 3; k++) { const p = peg(r, k), h = hits[r + '-' + k], f = h && now - h < 260 ? 1 - (now - h) / 260 : 0;
        const col = dk === 'xmas' ? BAUBLE[(r + k) % 4] : dk === 'spooky' ? ((r + k) % 2 ? '#ff7a00' : '#a54dff') : dk === 'party' ? CANDY[(r + k) % 4] : '#cfd7ea', rr = dk === 'xmas' ? 5.4 : 4.6;
        stamp(c, orb(col, rr, dk === 'spooky' || dk === 'party' ? 7 : 0, dk === 'xmas'), p.x, p.y);
        if (f) { c.globalAlpha = f; stamp(c, orb(dk === 'classic' ? t.accent : col, rr, 14, dk === 'xmas'), p.x, p.y, 1 + f * 0.3); c.globalAlpha = 1; } }
      const by = BY(), bh = BH();
      for (const k in flash) { const f = now - flash[k] < 700 ? 1 - (now - flash[k]) / 700 : 0; if (!f) continue; const x = g.pad + g.gap * k; c.fillStyle = bins[k] ? hexA('#fff2bd', 0.65 * f) : `rgba(255,255,255,${0.2 * f})`; c.beginPath(); c.roundRect(x + 1.5, by - 2, g.gap - 3, bh + 2, 7); c.fill();
        if (bins[k]) { c.save(); c.globalAlpha = f * 0.8; const lg = c.createLinearGradient(0, by, 0, by - H * 0.35); lg.addColorStop(0, hexA(t.accent, 0.55)); lg.addColorStop(1, hexA(t.accent, 0)); c.fillStyle = lg; c.fillRect(x + 2, by - H * 0.35, g.gap - 4, H * 0.35); c.restore(); } }
      for (const fl of floats) { const e = (now - fl.t0) / 1100; if (e > 1) continue; c.globalAlpha = 1 - e; c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 3; c.font = '900 15px Inter, sans-serif'; c.textAlign = 'center'; c.strokeText(fl.txt, fl.x, fl.y - e * 50); c.fillStyle = t.accent; c.fillText(fl.txt, fl.x, fl.y - e * 50); c.globalAlpha = 1; }
      floats = floats.filter(f => now - f.t0 < 1100);
      for (const bl of balls) { const R = 7.2;
        bl.trail.forEach((p, k) => { c.globalAlpha = (k + 1) / bl.trail.length * 0.25; c.fillStyle = dk === 'xmas' ? '#fff' : t.accent; c.beginPath(); c.arc(p.x, p.y, R * (0.5 + k / bl.trail.length * 0.4), 0, TAU); c.fill(); }); c.globalAlpha = 1;
        const bc = dk === 'xmas' ? '#dbe9ff' : dk === 'spooky' ? '#9bff4d' : t.accent; c.save(); c.translate(bl.x, bl.y); c.scale(bl.sq, 1 / bl.sq); stamp(c, orb(bc, R, 12), 0, 0); c.restore(); }
    }
    function loop(now) { let busy = false;
      for (const bl of balls) { if (bl.done) continue; busy = true; const e = Math.min(1, (now - bl.t0) / bl.seg), a = bl.pts[bl.step], b = bl.pts[bl.step + 1];
        bl.x = a.x + (b.x - a.x) * e; bl.y = a.y + (b.y - a.y) * (e * e) - Math.sin(Math.PI * e) * (bl.step === 0 ? 0 : bl.hop); bl.sq = 1 + Math.max(0, 0.18 - e * 0.6);
        bl.trail.push({ x: bl.x, y: bl.y }); if (bl.trail.length > 6) bl.trail.shift();
        if (e >= 1) { bl.step++; bl.t0 = now; const r = bl.step - 1; if (r < ROWS && bl.cols[r] != null) hits[r + '-' + (bl.cols[r] + 1)] = now;
          if (bl.step < bl.pts.length - 1 && !bl.fast) Snd.peg(); else if (bl.step < bl.pts.length - 1 && Math.random() < 0.12) Snd.peg();
          if (bl.step >= bl.pts.length - 1) { bl.done = true; bl.end = now; flash[bl.bin] = now; if (bins[bl.bin]) { floats.push({ txt: bins[bl.bin].cash ? '+' + gbp(bins[bl.bin].cash) : (bins[bl.bin].icon && !isImg(bins[bl.bin].icon) ? bins[bl.bin].icon : '★'), x: binX(bl.bin), y: BY() - 8, t0: now }); } bl.cb(); } } }
      balls = balls.filter(b => !b.done || now - b.end < 250); draw(now); if (busy || balls.length || floats.length || Object.values(flash).some(f => now - f < 700)) raf = requestAnimationFrame(loop); else { raf = 0; draw(now); } }
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    function drop(res, fast) { return new Promise(done => {
      const want = res.win ? bins.map((b, k) => b && b.i === res.win.i ? k : -1).filter(k => k >= 0) : bins.map((b, k) => b ? -1 : k).filter(k => k >= 0);
      const bin = want.length ? pick(want) : Math.floor(BINS / 2);
      // a path through the pegs with exactly `bin` right-hand bounces lands in that bin
      const steps = shuffle(Array.from({ length: ROWS }, (_, i) => i < bin ? 1 : 0)); const g = geo();
      let col = 0; const cols = [], pts = [{ x: W / 2 + rnd(-3, 3), y: dk === 'xmas' ? g.top - g.rowH * 1.2 : g.top - 30 }];
      for (let r = 0; r < ROWS; r++) { cols.push(col); pts.push({ x: W / 2 + (col - r / 2) * g.gap + rnd(-1.2, 1.2), y: g.top + r * g.rowH - 9.5 }); col += steps[r]; }
      pts.push({ x: binX(Math.max(0, Math.min(BINS - 1, bin))) + rnd(-2, 2), y: BY() + BH() * 0.35 });
      balls.push({ pts, cols, step: 0, t0: performance.now(), seg: fast ? 70 : rnd(150, 175), hop: fast ? 6 : rnd(9, 13), x: pts[0].x, y: pts[0].y, sq: 1, trail: [], bin, fast, cb: () => done(res) }); kick(); }); }
    draw(performance.now()); const ro = new ResizeObserver(() => { const w = host.clientWidth; if (Math.abs(w - W) < 1) return; W = fit(); H = cv.clientHeight; stat = null; draw(performance.now()); }); ro.observe(host);
    const vis = onScreen(cv), idle = setInterval(() => { if (!raf && dk === 'xmas' && vis.v && !document.hidden) draw(performance.now()); }, 120);
    return { mode: 'drop', labels: { one: '⬇ Drop 1', all: '⬇⬇ Drop all' },
      async play(R) { if (R.length === 1) { const r = await drop(R[0], false); await sleep(250); await celebrate(root, t, r, o.prizes); return; }
        const show = R.slice(0, 80); await Promise.all(show.map((r, k) => sleep(k * 130).then(() => drop(r, true)).then(x => { if (x.win) { Snd.coin(); buzz(15); } }))); await sleep(300); await summary(root, t, R); },
      destroy() { ro.disconnect(); clearInterval(idle); vis.stop(); cancelAnimationFrame(raf); } };
  }

  // =====================================================================================
  // SPIN THE WHEEL – gold rim, blue & red bulb ring, logo hub, ticking flapper
  function Wheel(host, o) {
    const t = o.theme, dk = decoOf(t), root = o.root; host.classList.add('ig-wheel');
    const pr = (o.prizes || []).slice(0, 5), N = Math.max(10, pr.length * 2 + 6);
    const seg = Array.from({ length: N }, () => null), slots = pr.length <= 3 ? pr.concat(pr) : pr.slice(); slots.forEach((p, j) => { seg[Math.round(j * N / slots.length) % N] = p; });
    put(host, `<div class="igw-wrap"><canvas class="igw-rim"></canvas><canvas class="igw-face"></canvas><canvas class="igw-top"></canvas><div class="igw-ptr"><svg viewBox="0 0 44 62"><defs><linearGradient id="igwg" x1="0" x2="1"><stop offset="0" stop-color="#8a6514"/><stop offset=".45" stop-color="#fff0b8"/><stop offset=".6" stop-color="#e8bb45"/><stop offset="1" stop-color="#6e4f0e"/></linearGradient></defs><path d="M22 60 L4 21 A18 18 0 1 1 40 21 Z" fill="rgba(0,0,0,.45)"/><path d="M22 58 L4 18 A18 18 0 1 1 40 18 Z" fill="url(#igwg)" stroke="#5a3f08" stroke-width="2"/><circle cx="22" cy="18" r="7" fill="${esc(t.c2)}" stroke="#fff3c4" stroke-width="2"/></svg></div><div class="igw-hub"><img src="${esc(o.logo || 'logo-sm.jpg')}" alt=""></div></div>`);
    const wrap = host.querySelector('.igw-wrap'), cv = host.querySelector('.igw-rim'), c = cv.getContext('2d'), fcv = host.querySelector('.igw-face'), fc = fcv.getContext('2d'), tcv = host.querySelector('.igw-top'), tc = tcv.getContext('2d'), ptr = host.querySelector('.igw-ptr');
    let ang = 0, S = 0, icons = {}, face = null, rim = null, hl = -1, hlT = 0, flashAll = 0, raf = 0;
    const BULB = dk === 'xmas' ? ['#ff3b3b', '#3bff7a', '#ffd84d'] : dk === 'spooky' ? ['#ff9f1a', '#b06bff'] : dk === 'party' ? [t.c1, t.c2, t.accent] : ['#fff6cf', t.accent];
    Promise.all(pr.filter(p => isImg(p.icon)).map(p => loadImg(p.icon).then(im => { icons[p.icon] = im; }))).then(() => { face = null; draw(); });
    function size() { S = Math.min(host.clientWidth - 20, 430); const d = DPR(); for (const [x, g] of [[cv, c], [fcv, fc], [tcv, tc]]) { x.width = x.height = S * d; x.style.width = x.style.height = S + 'px'; g.setTransform(d, 0, 0, d, 0, 0); } wrap.style.width = wrap.style.height = S + 'px'; face = rim = null; lastKey = ''; }
    const off = () => { const x = document.createElement('canvas'), d = DPR(); x.width = x.height = S * d; const g = x.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return [x, g]; };
    const RF = () => S / 2 - S * 0.085;
    function paintFace() { const [x, g] = off(); face = x; const R = S / 2, rf = RF(), a0 = -Math.PI / 2; g.translate(R, R);
      for (let k = 0; k < N; k++) { const s0 = a0 + k / N * TAU - Math.PI / N, s1 = s0 + TAU / N, p = seg[k], col = p ? t.accent : (k % 2 ? t.c1 : t.c2);
        const gr = g.createRadialGradient(0, 0, rf * 0.15, 0, 0, rf); gr.addColorStop(0, mix(col, -0.75)); gr.addColorStop(0.55, mix(col, -0.25)); gr.addColorStop(0.92, col); gr.addColorStop(1, mix(col, 0.25));
        g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, rf, s0, s1); g.closePath(); g.fill();
        g.save(); g.rotate(a0 + k / N * TAU); g.translate(rf * 0.66, 0); g.rotate(Math.PI / 2); g.textAlign = 'center'; g.textBaseline = 'middle';
        if (p) { if (isImg(p.icon) && icons[p.icon]) g.drawImage(icons[p.icon], -14, -28, 28, 28); else { g.font = `${Math.max(18, S / 17)}px serif`; g.fillText(p.icon || '⭐', 0, -12); }
          g.fillStyle = '#2a1a00'; g.font = `900 ${Math.max(10, S / 30)}px Inter, sans-serif`; g.fillText(short(p), 0, S / 40); }
        else { g.fillStyle = 'rgba(255,255,255,.8)'; g.font = `900 ${Math.max(7.5, S / 48)}px Inter, sans-serif`; g.fillText('TRY', 0, -5); g.fillText('AGAIN', 0, 6); }
        g.restore(); }
      for (let k = 0; k < N; k++) { const a = a0 + k / N * TAU - Math.PI / N; g.strokeStyle = goldGrad(g, 0, 0, Math.cos(a) * rf, Math.sin(a) * rf); g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * rf, Math.sin(a) * rf); g.stroke();
        const px = Math.cos(a) * (rf - 6), py = Math.sin(a) * (rf - 6); const pg = g.createRadialGradient(px - 1, py - 1, 0.3, px, py, 3.6); pg.addColorStop(0, '#fff'); pg.addColorStop(1, '#a97c17'); g.fillStyle = pg; g.beginPath(); g.arc(px, py, 3.4, 0, TAU); g.fill(); } }
    function paintRim() { const [x, g] = off(); rim = x; const R = S / 2, rf = RF(); g.translate(R, R);
      g.fillStyle = goldGrad(g, -R, -R, R, R); g.beginPath(); g.arc(0, 0, R - 1, 0, TAU); g.fill();
      const ring = g.createLinearGradient(-R, 0, R, 0); ring.addColorStop(0, mix(t.c1, -0.2)); ring.addColorStop(0.5, mix(t.c1, -0.55)); ring.addColorStop(0.5, mix(t.c2, -0.55)); ring.addColorStop(1, mix(t.c2, -0.2)); g.fillStyle = ring; g.beginPath(); g.arc(0, 0, R - 5, 0, TAU); g.fill();
      const sh = g.createRadialGradient(0, 0, rf, 0, 0, R - 5); sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(0.5, 'rgba(255,255,255,.08)'); sh.addColorStop(1, 'rgba(0,0,0,.4)'); g.fillStyle = sh; g.beginPath(); g.arc(0, 0, R - 5, 0, TAU); g.fill();
      g.fillStyle = goldGrad(g, R, -R, -R, R); g.beginPath(); g.arc(0, 0, rf + 3.5, 0, TAU); g.fill(); }
    // the wheel face is drawn once and spun with a CSS transform (the phone's graphics chip does the work);
    // only the bulbs (a few times a second) and the win highlight are ever redrawn
    let faceDrawn = false, topKey = '';
    function draw(now = performance.now(), bulbsToo = true) {
      if (!face) { paintFace(); faceDrawn = false; } if (!rim) paintRim(); const R = S / 2, rf = RF();
      if (!faceDrawn) { fc.clearRect(0, 0, S, S); fc.drawImage(face, 0, 0, S, S); faceDrawn = true; }
      fcv.style.transform = `rotate(${ang}rad)`;
      if (bulbsToo) { c.clearRect(0, 0, S, S); c.drawImage(rim, 0, 0, S, S);
        const NB = 24, ph = Math.floor(now / 140); for (let k = 0; k < NB; k++) { const a = k / NB * TAU, x = R + Math.cos(a) * (R - S * 0.042), y = R + Math.sin(a) * (R - S * 0.042), lit = flashAll > now ? (Math.floor(now / 110) % 2 === 0) : ((k + ph) % 3 === 0);
          const col = BULB[k % BULB.length]; stamp(c, lit ? orb(col, S * 0.016, 10) : orb(mix(col, -0.45), S * 0.016, 0), x, y); } }
      const hk = hl >= 0 && hlT > now ? 'h' + Math.round(now / 40) : 'x' + S; if (hk === topKey) return; topKey = hk;
      tc.clearRect(0, 0, S, S);
      if (hl >= 0 && hlT > now) { const a0 = -Math.PI / 2 + hl / N * TAU - Math.PI / N + ang, f = 0.35 + 0.35 * Math.sin(now / 90); tc.fillStyle = `rgba(255,255,255,${f})`; tc.beginPath(); tc.moveTo(R, R); tc.arc(R, R, rf, a0, a0 + TAU / N); tc.closePath(); tc.fill(); }
      const gl = tc.createLinearGradient(0, 0, 0, S); gl.addColorStop(0, 'rgba(255,255,255,.22)'); gl.addColorStop(0.45, 'rgba(255,255,255,0)'); tc.fillStyle = gl; tc.beginPath(); tc.arc(R, R, rf, Math.PI, 0); tc.fill();
    }
    let spinning = false, lastKey = ''; const vis = onScreen(wrap);
    const anim = () => { raf = requestAnimationFrame(anim); if (document.hidden || (!vis.v && !spinning)) return; const n = performance.now(), key = Math.floor(n / (flashAll > n ? 110 : 140)) + '|' + (flashAll > n);
      if (key !== lastKey) { lastKey = key; draw(n, true); } else if (spinning || hlT > n) draw(n, false); }; size(); raf = requestAnimationFrame(anim);
    const ro = new ResizeObserver(() => { size(); }); ro.observe(host);
    let lastTk = 0; const tick = now => { Snd.tick(); if (now - lastTk > 45) { lastTk = now; ptr.classList.remove('tick'); void ptr.offsetWidth; ptr.classList.add('tick'); } };
    async function spin(res, dur) {
      const want = res.win ? seg.map((p, k) => p && p.i === res.win.i ? k : -1).filter(k => k >= 0) : seg.map((p, k) => p ? -1 : k).filter(k => k >= 0);
      const k = want.length ? pick(want) : 0, sw = TAU / N, target = -(k / N) * TAU + rnd(-0.3, 0.18) * sw, from = ang, turns = TAU * (dur > 2000 ? 7 : 3);
      const to = from + turns + (((target - from) % TAU) + TAU) % TAU, over = sw * 0.3, t0 = performance.now(), split = dur * 0.86; let lastSeg = null; Snd.whoosh(); spinning = true;
      await new Promise(done => { const f = now => { const el = now - t0;
        if (el < split) { const e = el / split; ang = from + (to + over - from) * (1 - Math.pow(1 - e, 3.4)); } else { const e = Math.min(1, (el - split) / (dur - split)); ang = to + over - over * (e * e * (3 - 2 * e)); }
        const sIdx = Math.floor((((ang + Math.PI / N) % TAU) + TAU) % TAU / sw); if (sIdx !== lastSeg) { if (lastSeg !== null) tick(now); lastSeg = sIdx; }
        if (el < dur) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); });
      spinning = false; ang = ((ang % TAU) + TAU) % TAU; hl = k; hlT = performance.now() + 1800; if (res.win) flashAll = performance.now() + 1800; return res;
    }
    return { mode: 'spin', labels: { one: '🎡 Spin', all: '🎡 Spin all' },
      async play(R) { if (R.length === 1) { await celebrate(root, t, await spin(R[0], 5200), o.prizes); return; }
        for (const r of R.slice(0, 12)) { const x = await spin(r, 1500); if (x.win) { Snd.coin(); buzz(20); await sleep(500); } else await sleep(120); } await summary(root, t, R); },
      destroy() { ro.disconnect(); vis.stop(); cancelAnimationFrame(raf); } };
  }

  // =====================================================================================
  // SCRATCHCARDS – metallic foil tickets, 3 across, scratch with a finger or scratch all
  const FOILS = { classic: ['#6e4f0e', '#f5dc8a', '#b8901e', '#fff0b8', '#9c7417'], xmas: ['#7d0a19', '#e94a5a', '#b3122a', '#ff8a95', '#8e0f22'], spooky: ['#2a0d47', '#7d3cc2', '#3b1460', '#a56bf0', '#2a0d47'], party: ['#ff9ad1', '#9ef0ff', '#fff59e', '#c6a6ff', '#ff9ad1'] };
  const FOIL_MARK = { classic: '★', xmas: '❄', spooky: '✦', party: '✦' };
  let flakes = null; // one shared screen-size layer for the little foil flakes
  function flake(cx, cy, cols) { if (!flakes) { const cv = document.createElement('canvas'); cv.className = 'igs-flakes'; document.body.appendChild(cv); const d = DPR(); cv.width = innerWidth * d; cv.height = innerHeight * d; const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); flakes = { cv, c, P: [], raf: 0 }; }
    for (let k = 0; k < 2; k++) flakes.P.push({ x: cx + rnd(-6, 6), y: cy + rnd(-4, 4), vx: rnd(-1.4, 1.4), vy: rnd(-1.5, 0.5), s: rnd(1.5, 3.2), r: rnd(0, 6), col: pick(cols), a: 1 });
    if (!flakes.raf) { const step = () => { const F = flakes; F.c.clearRect(0, 0, innerWidth, innerHeight); for (const p of F.P) { p.vy += 0.18; p.x += p.vx; p.y += p.vy; p.r += 0.2; p.a -= 0.025; F.c.globalAlpha = Math.max(0, p.a); F.c.fillStyle = p.col; F.c.save(); F.c.translate(p.x, p.y); F.c.rotate(p.r); F.c.fillRect(-p.s, -p.s / 2, p.s * 2, p.s); F.c.restore(); }
      F.P = F.P.filter(p => p.a > 0); if (F.P.length) F.raf = requestAnimationFrame(step); else { F.raf = 0; F.cv.remove(); flakes = null; } }; flakes.raf = requestAnimationFrame(step); } }
  function Scratch(host, o) {
    const t = o.theme, dk = decoOf(t), root = o.root; host.classList.add('ig-scratch'); const grid = put(host, '<div class="igs-grid"></div>'); let cards = [], tex = {}, summed = false;
    const FC = FOILS[dk];
    function texture(w, h) { const key = w + 'x' + h; if (tex[key]) return tex[key]; const d = DPR(), x = document.createElement('canvas'); x.width = w * d; x.height = h * d; const c = x.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
      c.fillStyle = goldGrad(c, 0, 0, w, h, FC); c.fillRect(0, 0, w, h);
      if (dk === 'party') { const hg = c.createLinearGradient(0, h, w, 0); ['rgba(255,0,150,.25)', 'rgba(0,200,255,.25)', 'rgba(255,240,0,.25)', 'rgba(150,0,255,.25)'].forEach((s, k) => hg.addColorStop(k / 3, s)); c.fillStyle = hg; c.fillRect(0, 0, w, h); }
      for (let k = 0; k < w * h / 18; k++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.1)'; c.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
      c.globalAlpha = 0.16; c.fillStyle = '#fff'; c.font = '10px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let y = 6; y < h; y += 15) for (let xx = (y / 15 % 2) * 9 + 5; xx < w; xx += 18) c.fillText(FOIL_MARK[dk], xx, y); c.globalAlpha = 1;
      const sh = c.createLinearGradient(0, 0, w, h); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,.35)'); sh.addColorStop(0.65, 'rgba(255,255,255,0)'); c.fillStyle = sh; c.fillRect(0, 0, w, h);
      const r = Math.min(w, h) * 0.3; c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.roundRect(w / 2 - w * 0.36, h / 2 - r * 0.75, w * 0.72, r * 1.5, r * 0.75); c.fill(); c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1; c.stroke();
      c.fillStyle = '#fff'; c.font = `900 ${Math.max(9, w * 0.1)}px Inter, sans-serif`; c.fillText('SCRATCH', w / 2, h / 2 - 3); c.font = `800 ${Math.max(7, w * 0.065)}px Inter`; c.fillStyle = 'rgba(255,255,255,.8)'; c.fillText('★ TO WIN ★', w / 2, h / 2 + w * 0.085);
      c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(1, h - 1); c.lineTo(1, 1); c.lineTo(w - 1, 1); c.stroke(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.moveTo(w - 1, 1); c.lineTo(w - 1, h - 1); c.lineTo(1, h - 1); c.stroke();
      return (tex[key] = x); }
    function foil(cv) { const c = cv.getContext('2d'), w = cv.clientWidth, h = cv.clientHeight, d = DPR(); cv.width = w * d; cv.height = h * d; c.setTransform(d, 0, 0, d, 0, 0); c.drawImage(texture(w, h), 0, 0, w, h); return c; }
    function makeCard(res) {
      const el = document.createElement('div'); el.className = 'igs-card ' + (res.win ? 'w' : 'l');
      el.innerHTML = `<div class="igs-under">${res.win ? `<i class="igs-sheen"></i>${iconHTML(res.win.icon)}<b>${esc(winText(res.win))}</b><em>WINNER</em>` : `<span class="igs-x">✕</span><small>${esc(t.lose || 'No win')}</small>`}<i class="igs-no">#${res.ticket}</i></div><canvas></canvas>`;
      grid.appendChild(el); const cv = el.querySelector('canvas'); let c = null, done = false, last = null, sc = 0;
      const card = { el, res }; requestAnimationFrame(() => { c = foil(cv); });
      const clear = (x, y, r = 15, fl = true) => { if (!c) return; c.globalCompositeOperation = 'destination-out'; c.beginPath(); if (last) { c.lineWidth = r * 2; c.lineCap = 'round'; c.moveTo(last.x, last.y); c.lineTo(x, y); c.stroke(); } c.arc(x, y, r, 0, TAU); c.fill(); last = { x, y };
        if (++sc % 3 === 0) Snd.scratch(); if (fl && sc % 2 === 0) { const b = cv.getBoundingClientRect(); flake(b.left + x, b.top + y, FC); } };
      const pct = () => { const d = c.getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 3; i < d.length; i += 64) if (d[i] < 40) n++; return n / (d.length / 64); };
      card.reveal = () => { if (done) return; done = true; cv.style.transition = 'opacity .4s'; cv.style.opacity = '0'; setTimeout(() => cv.remove(), 420); el.classList.add('open');
        if (res.win) { Snd.coin(); buzz(25); const b = el.getBoundingClientRect(); sparkle(root, t, b.left + b.width / 2, b.top + b.height / 2, 22); }
        if (!summed && !cards.some(k => !k.el.classList.contains('open'))) { summed = true; const R = cards.map(k => k.res); if (R.some(r => r.win)) setTimeout(() => summary(root, t, R), 500); else Snd.lose(); } };
      const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
      let down = false;
      cv.addEventListener('pointerdown', e => { down = true; last = null; cv.setPointerCapture(e.pointerId); const p = pos(e); clear(p.x, p.y); });
      cv.addEventListener('pointermove', e => { if (!down || done) return; const p = pos(e); clear(p.x, p.y); });
      const up = () => { down = false; last = null; if (!done && c && pct() > 0.4) card.reveal(); }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.style.touchAction = 'none';
      card.auto = async () => { if (done || !c) return; const w = cv.clientWidth, h = cv.clientHeight; let dir = 1;
        for (let y = 5; y < h + 6; y += 12) { last = null; const xs = []; for (let x = -8; x <= w + 8; x += 16) xs.push(x); if (dir < 0) xs.reverse(); dir = -dir; for (const x of xs) clear(x, y + Math.sin(x / 8) * 3, 12, Math.random() < 0.25); await sleep(14); } card.reveal(); };
      cards.push(card); return card;
    }
    return { mode: 'scratch', labels: { one: '🃏 Deal 21 cards', all: '✨ Scratch all' }, grid: true,
      deal(R) { grid.innerHTML = ''; cards = []; summed = false; R.forEach((r, k) => { const c = makeCard(r); c.el.style.animationDelay = (k * 0.025) + 's'; }); host.scrollTop = 0; },
      async scratchAll() { await Promise.all(cards.map((k, i) => sleep(i * 65).then(() => k.auto()))); },
      unrevealed() { return cards.filter(k => !k.el.classList.contains('open')).length; },
      async play(R) { this.deal(R); }, destroy() { } };
  }

  // =====================================================================================
  // SLOTS – a full cabinet: marquee, jackpot board, 3×3 reels, payline, lever, win meter, pay table
  function Slots(host, o) {
    const t = o.theme, dk = decoOf(t), root = o.root; host.classList.add('ig-slots');
    const prizes = o.prizes || [], top = topPrize(prizes);
    const prizeSyms = prizes.map(p => ({ v: p.icon || '⭐', i: p.i, p })), fill = list(t.fill).map(v => ({ v, i: -1 }));
    const fillers = fill.length ? fill : [{ v: '🍒', i: -1 }, { v: '🍋', i: -1 }, { v: '🔔', i: -1 }, { v: '7️⃣', i: -1 }];
    const pool = prizeSyms.concat(fillers, fillers);
    const cab = put(host, `<div class="sl-cab">
      <div class="sl-top"><div class="sl-title">${esc(t.title || 'INSTANT WINS')}</div>${top ? `<div class="sl-jp"><small>TOP PRIZE</small><b>${iconHTML(top.icon)} ${esc(top.prize)}</b></div>` : ''}</div>
      <div class="sl-body"><div class="sl-win"><span class="sl-arw l"></span><div class="sl-reels">${[0, 1, 2].map(() => '<div class="sl-reel"><div class="sl-strip"></div><i class="sl-glass"></i></div>').join('')}</div><span class="sl-arw r"></span><i class="sl-pay"></i></div>
        <div class="sl-lever" role="button" tabindex="0" aria-label="Pull the lever to spin"><i class="sl-slot"></i><i class="sl-arm"><b></b></i></div></div>
      <div class="sl-panel"><div class="sl-led"><small>TICKET</small><b class="sl-tk">– – –</b></div><div class="sl-led w"><small>WIN</small><b class="sl-wn">£0</b></div></div>
      ${prizeSyms.length ? `<div class="sl-table">${prizeSyms.map(s => `<span>${iconHTML(s.v)}${iconHTML(s.v)}${iconHTML(s.v)}<b>${esc(s.p.prize)}</b></span>`).join('')}</div>` : ''}</div>`);
    const reels = [...cab.querySelectorAll('.sl-reel')], strips = reels.map(r => r.querySelector('.sl-strip')), lever = cab.querySelector('.sl-lever'), tk = cab.querySelector('.sl-tk'), wn = cab.querySelector('.sl-wn');
    const CELL = () => reels[0].clientHeight / 3, cell = s => `<div class="sl-cell">${iconHTML(s.v)}</div>`, rndSym = () => pick(pool);
    const vis = strips.map(() => [rndSym(), rndSym(), rndSym()]); strips.forEach((s, k) => { s.innerHTML = vis[k].map(cell).join(''); });
    let spinning = false;
    const pull = () => { if (spinning) return; lever.classList.remove('pull'); void lever.offsetWidth; lever.classList.add('pull'); Snd.lever(); setTimeout(() => root.dispatchEvent(new CustomEvent('igaction', { bubbles: true })), 260); };
    lever.addEventListener('pointerdown', pull); lever.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pull(); } });
    function outcome(res) {
      if (res.win) { const s = prizeSyms.find(p => p.i === res.win.i) || prizeSyms[0]; return [s, s, s]; }
      let a; do { a = [0, 1, 2].map(rndSym); } while (a[0].v === a[1].v && a[1].v === a[2].v);
      if (Math.random() < 0.4 && prizeSyms.length) { const s = pick(prizeSyms); a[0] = s; a[1] = s; if (a[2].v === s.v) a[2] = pick(fillers); } // near miss
      return a;
    }
    async function spin(res, fast) {
      spinning = true; const out = outcome(res), h = CELL(); cab.classList.remove('won'); reels.forEach(r => r.classList.remove('antic')); strips.forEach(s => s.querySelectorAll('.hit').forEach(x => x.classList.remove('hit')));
      tk.textContent = '#' + res.ticket; wn.textContent = '£0'; const antic = out[0].v === out[1].v && out[0].i >= 0;
      if (!fast) { lever.classList.remove('pull'); void lever.offsetWidth; lever.classList.add('pull'); }
      await Promise.all(strips.map(async (s, k) => {
        const n = (fast ? 8 : 16) + k * (fast ? 3 : 6) + (antic && k === 2 ? (fast ? 5 : 14) : 0), final = [rndSym(), out[k], rndSym()];
        const seq = vis[k].concat(Array.from({ length: n }, rndSym), final); s.style.transition = 'none'; s.innerHTML = seq.map(cell).join(''); s.style.transform = 'translateY(0)'; s.classList.add('blur'); void s.offsetHeight;
        const dur = (fast ? 480 : 950) + k * (fast ? 160 : 360) + (antic && k === 2 ? (fast ? 380 : 1300) : 0);
        s.style.transition = `transform ${dur}ms cubic-bezier(.2,.75,.28,1.06)`; s.style.transform = `translateY(-${(seq.length - 3) * h}px)`;
        if (antic && k === 2) setTimeout(() => { reels[2].classList.add('antic'); if (!fast) Snd.antic(1.3); }, dur - (fast ? 380 : 1300));
        const ti = setInterval(Snd.tick, fast ? 90 : 75); await sleep(dur - 120); s.classList.remove('blur'); await sleep(120); clearInterval(ti); Snd.stop();
        s.style.transition = 'none'; s.innerHTML = final.map(cell).join(''); s.style.transform = 'translateY(0)'; vis[k] = final; reels[k].classList.remove('antic');
      }));
      if (res.win) { cab.classList.add('won'); strips.forEach(s => s.children[1].classList.add('hit')); const P = prizes.find(p => p.i === res.win.i); wn.textContent = P && P.cash ? gbp(P.cash) : short(res.win); }
      spinning = false; return res;
    }
    return { mode: 'spin', labels: { one: '🎰 Spin', all: '🎰 Auto-spin all' },
      async play(R) { if (R.length === 1) { const r = await spin(R[0], false); await sleep(r.win ? 500 : 150); await celebrate(root, t, r, prizes); return; }
        for (const r of R.slice(0, 15)) { const x = await spin(r, true); if (x.win) { Snd.coin(); buzz(25); await sleep(700); } else await sleep(140); } await summary(root, t, R); },
      destroy() { } };
  }

  // =====================================================================================
  // SMASH THE PIÑATA – three hits with the stick, then it bursts into sweets, coins and (maybe) your prize
  function starPinata(t, logo) {
    const pts = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = k % 2 ? 22 : 48; pts.push((50 + Math.cos(a) * r).toFixed(1) + ',' + (54 + Math.sin(a) * r).toFixed(1)); }
    const stripes = [t.c1, t.accent, t.c2, '#fff', t.c1, t.accent, t.c2].map((c, k) => `<stop offset="${k / 7}" stop-color="${esc(c)}"/><stop offset="${(k + 1) / 7}" stop-color="${esc(c)}"/>`).join('');
    return `<svg class="igp-svg" viewBox="0 0 100 108"><defs><linearGradient id="igps" x1="0" y1="0" x2="0" y2="1">${stripes}</linearGradient><radialGradient id="igpl" cx=".35" cy=".3"><stop offset="0" stop-color="rgba(255,255,255,.55)"/><stop offset="1" stop-color="rgba(255,255,255,0)"/></radialGradient><clipPath id="igpc"><circle cx="50" cy="54" r="15"/></clipPath></defs>
      <polygon points="${pts.join(' ')}" fill="url(#igps)" stroke="#2a1a00" stroke-width="2" stroke-linejoin="round"/>
      ${[0, 1, 2, 3, 4].map(k => { const a = -Math.PI / 2 + k * TAU / 5, x = 50 + Math.cos(a) * 48, y = 54 + Math.sin(a) * 48; return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(a * 180 / Math.PI + 90).toFixed(0)})">${[-6, -3, 0, 3, 6].map((dx, j) => `<path d="M${dx * 0.5} 0 Q${dx * 0.9} 7 ${dx * 1.3} ${13 - Math.abs(dx) * 0.4}" fill="none" stroke="${esc([t.c1, t.accent, t.c2, '#fff', t.c1][(j + k) % 5])}" stroke-width="2" stroke-linecap="round"/>`).join('')}</g>`; }).join('')}
      <polygon points="${pts.join(' ')}" fill="url(#igpl)"/><circle cx="50" cy="54" r="17" fill="#e8bb45" stroke="#6e4f0e" stroke-width="2"/><image href="${esc(logo || 'logo-sm.jpg')}" x="35" y="39" width="30" height="30" clip-path="url(#igpc)" preserveAspectRatio="xMidYMid slice"/></svg>`;
  }
  function Pinata(host, o) {
    const t = o.theme, dk = decoOf(t), root = o.root; host.classList.add('ig-pinata');
    const custom = t.pinata && t.pinata !== '🪅';
    const stage = put(host, `<div class="igp-stage"><div class="igp-spot"></div><div class="igp-swing"><div class="igp-rope"></div><button type="button" class="igp-p" aria-label="Hit the piñata">${custom ? iconHTML(t.pinata, 'big') : starPinata(t, o.logo)}<svg class="igp-crack" viewBox="0 0 100 100"><path class="c1" d="M50 20 L44 38 L54 46 L46 62"/><path class="c2" d="M54 46 L70 52 L66 66 M44 38 L28 44"/><path class="c3" d="M46 62 L36 78 M66 66 L76 80 M28 44 L22 60 L32 66"/></svg></button></div>
      <div class="igp-bat"><svg viewBox="0 0 24 140"><defs><linearGradient id="igpb" x1="0" x2="1"><stop offset="0" stop-color="#6b4220"/><stop offset=".5" stop-color="#c99560"/><stop offset="1" stop-color="#6b4220"/></linearGradient></defs><rect x="6" y="0" width="12" height="140" rx="6" fill="url(#igpb)"/>${[20, 34, 48].map(y => `<rect x="6" y="${y}" width="12" height="5" fill="${esc(t.c2)}"/>`).join('')}<rect x="5" y="104" width="14" height="34" rx="5" fill="#222"/></svg></div>
      <div class="igp-hp"><i></i><i></i><i></i></div><div class="igp-hint">Tap the piñata to smash it!</div><div class="igp-out"></div><div class="igp-floor"></div></div>`);
    const btn = stage.querySelector('.igp-p'), out = stage.querySelector('.igp-out'), hint = stage.querySelector('.igp-hint'), bat = stage.querySelector('.igp-bat'), hp = [...stage.querySelectorAll('.igp-hp i')];
    let cur = null, hits = 0, resolve = null, auto = false;
    const sweets = dk === 'xmas' ? ['🍬', '🍭', '🎁', '⭐', '🍪'] : dk === 'spooky' ? ['🍬', '🍭', '🍫', '🎃', '🍬'] : ['🍬', '🍭', '🍫', '🍬', '🧁'];
    function shower(n, win) { const { cv, c, W, H } = fxCanvas(stage, 'igp-fx'); const b = btn.getBoundingClientRect(), s = stage.getBoundingClientRect(), ox = b.left - s.left + b.width / 2, oy = b.top - s.top + b.height / 2, floor = H - 26;
      const P = Array.from({ length: n }, (_, k) => ({ x: ox + rnd(-12, 12), y: oy + rnd(-12, 12), vx: rnd(-6.5, 6.5), vy: rnd(-10, -2), coin: win ? k % 2 === 0 : k % 5 === 0, e: pick(sweets), s: rnd(18, 26), ph: rnd(0, TAU), rot: rnd(0, TAU), vr: rnd(-0.2, 0.2), rest: 0 })); let f = 0;
      const step = () => { c.clearRect(0, 0, W, H); f++; for (const p of P) { p.vy += 0.38; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.ph += 0.25;
          if (p.y > floor) { p.y = floor; p.vy *= -0.38; p.vx *= 0.72; p.vr *= 0.7; if (Math.abs(p.vy) < 1) p.vy = 0; } if (p.x < 10 || p.x > W - 10) p.vx *= -0.8;
          c.globalAlpha = f > 110 ? Math.max(0, (150 - f) / 40) : 1; if (p.coin) drawCoin(c, p.x, p.y, 9, p.ph); else { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.font = `${p.s}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(p.e, 0, 0); c.restore(); } }
        if (f < 150) requestAnimationFrame(step); else cv.remove(); }; requestAnimationFrame(step); }
    function hit() { if (!cur || btn.classList.contains('burst')) return; hits++;
      bat.classList.remove('swing'); void bat.offsetWidth; bat.classList.add('swing'); stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
      setTimeout(() => { Snd.thud(); buzz(18); btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit'); btn.dataset.crack = hits; hp.forEach((x, k) => x.classList.toggle('off', k < hits)); if (hits < 3) shower(4, false); }, 120);
      if (hits >= 3) { const r = cur; cur = null; setTimeout(async () => { btn.classList.add('burst'); Snd.whoosh(); shower(r.win ? 46 : 22, !!r.win); hint.textContent = '';
          if (auto) { out.innerHTML = r.win ? `<div class="igp-prize">${iconHTML(r.win.icon)}<b>${esc(winText(r.win))}</b><small>Ticket #${r.ticket}</small></div>` : `<div class="igp-prize l"><b>${esc(t.lose || 'Not this time')}</b><small>Ticket #${r.ticket}</small></div>`; if (r.win) Snd.coin(); await sleep(750); }
          else { out.innerHTML = r.win ? `<div class="igp-prize drop">${iconHTML(r.win.icon)}</div>` : ''; await sleep(r.win ? 700 : 300); await celebrate(root, t, r, o.prizes); }
          out.innerHTML = ''; btn.classList.remove('burst', 'hit'); btn.dataset.crack = 0; hp.forEach(x => x.classList.remove('off')); resolve && resolve(r); }, 260); } }
    btn.addEventListener('click', () => { if (!auto) hit(); });
    const one = (r, a) => new Promise(done => { cur = r; hits = 0; resolve = done; auto = a; out.innerHTML = ''; hint.textContent = a ? '' : 'Tap the piñata – 3 hits to smash it!'; if (a) (async () => { for (let k = 0; k < 3; k++) { await sleep(230); hit(); } })(); });
    return { mode: 'tap', labels: { one: '🪅 Get a piñata', all: '💥 Smash all' },
      async play(R) { if (R.length === 1) { await one(R[0], false); hint.textContent = 'Tap the piñata to smash it!'; return; } for (const r of R.slice(0, 12)) await one(r, true); hint.textContent = ''; await summary(root, t, R); },
      destroy() { } };
  }

  // =====================================================================================
  // PENALTY SHOOT-OUT – floodlit stadium, pick your spot, curl it past the keeper
  const BALL_SVG = `<svg viewBox="0 0 64 64"><defs><radialGradient id="igkb" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#e6e9f2"/><stop offset="1" stop-color="#9aa1b5"/></radialGradient></defs><circle cx="32" cy="32" r="30" fill="url(#igkb)" stroke="#333" stroke-width="1.5"/><polygon points="32,20 43,28 39,41 25,41 21,28" fill="#1b1b22"/><path d="M32 20 L32 4 M43 28 L58 23 M39 41 L48 55 M25 41 L16 55 M21 28 L6 23" stroke="#1b1b22" stroke-width="2"/><path d="M26 3 L32 4 L38 3 M55 17 L58 23 L61 30 M52 52 L48 55 L42 60 M22 60 L16 55 L12 52 M3 30 L6 23 L9 17" stroke="#1b1b22" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
  function Penalty(host, o) {
    const t = o.theme, dk = decoOf(t), root = o.root; host.classList.add('ig-pen');
    const keeper = `<svg viewBox="0 0 80 100"><g class="kp-body"><rect x="30" y="66" width="8" height="30" rx="4" fill="#1b1b22"/><rect x="42" y="66" width="8" height="30" rx="4" fill="#1b1b22"/><path d="M24 34 Q40 26 56 34 L54 70 L26 70 Z" fill="${esc(t.keeper || t.c2)}" stroke="rgba(0,0,0,.35)"/><text x="40" y="58" font-size="14" font-weight="900" text-anchor="middle" fill="#fff" font-family="Inter,sans-serif">1</text>
      <g class="kp-arm l"><rect x="6" y="34" width="22" height="8" rx="4" fill="${esc(t.keeper || t.c2)}"/><circle cx="6" cy="38" r="6.5" fill="#fff" stroke="${esc(t.accent)}" stroke-width="2"/></g><g class="kp-arm r"><rect x="52" y="34" width="22" height="8" rx="4" fill="${esc(t.keeper || t.c2)}"/><circle cx="74" cy="38" r="6.5" fill="#fff" stroke="${esc(t.accent)}" stroke-width="2"/></g>
      <circle cx="40" cy="20" r="11" fill="#f1c7a0"/><path d="M29 18 Q40 4 51 18 Q46 12 40 12 Q34 12 29 18" fill="#3a2210"/></g></svg>`;
    const Z = { tl: [14, 24], tc: [50, 18], tr: [86, 24], bl: [14, 76], bc: [50, 80], br: [86, 76] };
    const sc = put(host, `<div class="igk-scene"><div class="igk-crowd"></div><div class="igk-flashes"></div><i class="igk-light l"></i><i class="igk-light r"></i>
      <div class="igk-board"><span>${esc(t.title || 'INSTANT WINS')} ✦ SHEPPEY ELITE RAFFLES ✦ ${esc(t.title || 'INSTANT WINS')} ✦ SHEPPEY ELITE RAFFLES ✦&nbsp;</span><span>${esc(t.title || 'INSTANT WINS')} ✦ SHEPPEY ELITE RAFFLES ✦ ${esc(t.title || 'INSTANT WINS')} ✦ SHEPPEY ELITE RAFFLES ✦&nbsp;</span></div>
      <div class="igk-pitch"><i class="igk-box"></i><i class="igk-spot"></i></div>
      <div class="igk-goal"><div class="igk-net"><i class="igk-bulge"></i></div>${Object.keys(Z).map(z => `<button type="button" class="igk-z" data-z="${z}" style="left:${Z[z][0]}%;top:${Z[z][1]}%" aria-label="Shoot ${z}"><i></i></button>`).join('')}<div class="igk-keeper">${keeper}</div></div>
      <div class="igk-shadow"></div><div class="igk-ball">${BALL_SVG}</div><div class="igk-msg">Pick your spot</div></div>`);
    const kp = sc.querySelector('.igk-keeper'), ball = sc.querySelector('.igk-ball'), shadow = sc.querySelector('.igk-shadow'), msg = sc.querySelector('.igk-msg'), goal = sc.querySelector('.igk-goal'), bulge = sc.querySelector('.igk-bulge');
    let cur = null, resolve = null;
    const home = () => { const s = sc.getBoundingClientRect(); return { x: s.width / 2, y: s.height * 0.86 }; };
    const place = (x, y, sz, rot) => { ball.style.transform = `translate(${x - sz / 2}px,${y - sz / 2}px) rotate(${rot}deg)`; ball.style.width = ball.style.height = sz + 'px'; };
    const rest = () => { const h = home(); place(h.x, h.y, 44, 0); shadow.style.transform = `translate(${h.x - 22}px,${h.y + 14}px)`; shadow.style.width = '44px'; shadow.style.opacity = '.5'; }; requestAnimationFrame(rest);
    const ro = new ResizeObserver(() => { if (!sc.classList.contains('busy')) rest(); }); ro.observe(sc);
    function fly(from, to, ctrl, d, s0, s1, r0, r1, shY) { return new Promise(done => { const t0 = performance.now(); const f = now => { const e = Math.min(1, (now - t0) / d), u = 1 - e;
      const x = u * u * from.x + 2 * u * e * ctrl.x + e * e * to.x, y = u * u * from.y + 2 * u * e * ctrl.y + e * e * to.y, sz = s0 + (s1 - s0) * e; place(x, y, sz, r0 + (r1 - r0) * e);
      if (shY != null) { const sy = from.y + 14 + (shY - from.y - 14) * e; shadow.style.transform = `translate(${x - sz / 2}px,${sy}px)`; shadow.style.width = sz + 'px'; shadow.style.opacity = String(0.5 - e * 0.3); }
      if (e < 1) requestAnimationFrame(f); else done(); }; requestAnimationFrame(f); }); }
    async function shoot(z, isAuto) { if (!cur) return; const r = cur; cur = null; sc.classList.add('busy'); msg.className = 'igk-msg'; msg.textContent = '';
      const save = !r.win, others = Object.keys(Z).filter(k => k !== z && (z[1] === 'c' ? true : k[1] !== z[1])), diveTo = save ? z : pick(others);
      sc.querySelectorAll('.igk-z').forEach(b => b.classList.toggle('aim', b.dataset.z === z));
      const s = sc.getBoundingClientRect(), g = goal.getBoundingClientRect(), [px, py] = Z[z], to = { x: g.left - s.left + g.width * px / 100, y: g.top - s.top + g.height * py / 100 }, from = home();
      const curl = (px < 50 ? -1 : px > 50 ? 1 : (Math.random() < 0.5 ? -1 : 1)) * s.width * 0.12, ctrl = { x: (from.x + to.x) / 2 - curl, y: Math.min(from.y, to.y) - s.height * 0.06 };
      Snd.whoosh(); setTimeout(() => { kp.className = 'igk-keeper dive-' + diveTo; }, isAuto ? 60 : 140);
      await fly(from, to, ctrl, isAuto ? 420 : 620, 44, 22, 0, 720, g.bottom - s.top - 4); Snd.thud();
      if (save) { const away = { x: to.x + (px < 50 ? -1 : 1) * s.width * 0.22, y: to.y + s.height * 0.28 }; fly(to, away, { x: (to.x + away.x) / 2, y: to.y - 20 }, 480, 22, 30, 720, 900, null);
        msg.innerHTML = `🧤 SAVED!<small>${esc(t.lose || 'Not this time')} · #${r.ticket}</small>`; msg.classList.add('on', 'save'); Snd.crowd(false); }
      else { bulge.style.left = px + '%'; bulge.style.top = py + '%'; goal.classList.remove('scored'); void goal.offsetWidth; goal.classList.add('scored'); sc.classList.add('roar');
        msg.innerHTML = `GOAL!<small>${iconHTML(r.win.icon)} ${esc(winText(r.win))} · #${r.ticket}</small>`; msg.classList.add('on', 'goal'); Snd.crowd(true); buzz([30, 40, 60]); }
      await sleep(isAuto ? 800 : 1300);
      if (!isAuto && r.win) await celebrate(root, t, r, o.prizes); else if (!isAuto) Snd.lose(); else if (r.win) Snd.coin();
      goal.classList.remove('scored'); sc.classList.remove('roar'); kp.className = 'igk-keeper'; sc.querySelectorAll('.igk-z').forEach(b => b.classList.remove('aim')); rest(); sc.classList.remove('busy'); msg.className = 'igk-msg'; msg.textContent = 'Pick your spot';
      resolve && resolve(r); }
    sc.querySelectorAll('[data-z]').forEach(b => b.addEventListener('click', () => shoot(b.dataset.z, false)));
    const one = (r, a) => new Promise(done => { cur = r; resolve = done; msg.textContent = a ? '' : 'Pick your spot'; sc.classList.toggle('ready', !a); if (a) setTimeout(() => shoot(pick(Object.keys(Z)), true), 220); });
    return { mode: 'tap', labels: { one: '⚽ Take a penalty', all: '⚽ Shoot all' },
      async play(R) { if (R.length === 1) { await one(R[0], false); sc.classList.remove('ready'); return; } for (const r of R.slice(0, 12)) await one(r, true); await summary(root, t, R); },
      destroy() { ro.disconnect(); } };
  }

  // =====================================================================================
  // BINGO – a ball blower calls 14 numbers; complete any line on your card to win
  const LINES = (() => { const L = []; for (let r = 0; r < 5; r++) L.push([0, 1, 2, 3, 4].map(c => r * 5 + c)); for (let c = 0; c < 5; c++) L.push([0, 1, 2, 3, 4].map(r => r * 5 + c)); L.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]); return L; })();
  function Bingo(host, o) {
    const t = o.theme, dk = decoOf(t), root = o.root, CALLS = 14, COLS = 'BINGO'; host.classList.add('ig-bingo');
    const BC = [t.c1, t.c2, t.accent, t.win || '#22d36b', '#9b6bff'];
    const ballHTML = (n, cls = '') => { const k = Math.min(4, Math.floor((n - 1) / 15)); return `<span class="igb-ball ${cls}" style="--bc:${esc(BC[k])}"><i>${COLS[k]}</i><b>${n}</b></span>`; };
    const box = put(host, `<div class="igb-wrap"><div class="igb-top"><div class="igb-dome"><canvas></canvas><i class="igb-glass"></i></div><div class="igb-callbox"><small>NOW CALLING</small><div class="igb-now"></div><div class="igb-row"></div></div></div>
      <div class="igb-card"><div class="igb-head">${[...COLS].map((L, k) => `<b style="--bc:${esc(BC[k])}">${L}</b>`).join('')}</div><div class="igb-grid"></div><div class="igb-foot"><span class="igb-tk">Ticket –</span><span class="igb-calls">0 / ${CALLS} calls</span></div></div>
      <div class="igb-msg">Complete any line to win</div></div>`);
    const grid = box.querySelector('.igb-grid'), now = box.querySelector('.igb-now'), row = box.querySelector('.igb-row'), msg = box.querySelector('.igb-msg'), tkEl = box.querySelector('.igb-tk'), callsEl = box.querySelector('.igb-calls');
    // the blower: little balls bouncing inside a glass dome
    const dcv = box.querySelector('.igb-dome canvas'), dc = dcv.getContext('2d'); let DS = 0, dballs = [], agit = 0, raf = 0;
    const domeEl = box.querySelector('.igb-dome'); const dfit = () => { DS = domeEl.clientWidth; if (!DS) return; const d = DPR(); dcv.width = dcv.height = DS * d; dcv.style.width = dcv.style.height = DS + 'px'; dc.setTransform(d, 0, 0, d, 0, 0);
      if (!dballs.length) dballs = Array.from({ length: 18 }, (_, k) => ({ x: DS / 2 + rnd(-DS * 0.2, DS * 0.2), y: DS * 0.7 + rnd(-8, 8), vx: rnd(-1, 1), vy: rnd(-1, 1), c: BC[k % 5] })); };
    const dvis = onScreen(domeEl); let dLast = 0; const dstep = now => { raf = requestAnimationFrame(dstep); if (document.hidden || !dvis.v || (agit < now && now - dLast < 40)) return; dLast = now; if (domeEl.clientWidth !== DS) dfit(); if (!DS) return; dc.clearRect(0, 0, DS, DS); const R = DS / 2 - 6, cx = DS / 2, cy = DS / 2, br = Math.max(5, DS * 0.06), pw = agit > performance.now() ? 1.6 : 0.35;
      for (const b of dballs) { b.vy += 0.12 - (Math.random() < 0.08 * pw ? rnd(1.5, 4) * pw : 0); b.vx += rnd(-0.25, 0.25) * pw; b.vx *= 0.99; b.vy *= 0.99; b.x += b.vx; b.y += b.vy;
        const dx = b.x - cx, dy = b.y - cy, dd = Math.hypot(dx, dy); if (dd > R - br) { const nx = dx / dd, ny = dy / dd, dot = b.vx * nx + b.vy * ny; b.vx -= 1.8 * dot * nx; b.vy -= 1.8 * dot * ny; b.x = cx + nx * (R - br); b.y = cy + ny * (R - br); }
        stamp(dc, orb(b.c, br), b.x, b.y); } };
    dfit(); raf = requestAnimationFrame(dstep); const ro = new ResizeObserver(dfit); ro.observe(box.querySelector('.igb-dome'));
    let nums = [], marks = new Set();
    function newCard(ticket) { nums = []; for (let k = 0; k < 5; k++) { const pool = shuffle(Array.from({ length: 15 }, (_, i) => k * 15 + i + 1)).slice(0, 5).sort((a, b) => a - b); pool.forEach((n, r) => { nums[r * 5 + k] = n; }); } nums[12] = 0;
      marks = new Set([12]); grid.innerHTML = nums.map((n, i) => i === 12 ? `<div class="igb-c free on"><span>★</span><small>FREE</small></div>` : `<div class="igb-c" data-i="${i}"><span>${n}</span></div>`).join('');
      row.innerHTML = ''; now.innerHTML = ''; tkEl.textContent = 'Ticket #' + ticket; callsEl.textContent = `0 / ${CALLS} calls`; msg.className = 'igb-msg'; msg.textContent = 'Complete any line to win'; }
    const complete = (S, L) => L.every(i => S.has(i));
    function plan(win) { // which cells get called – decided from the locked result, with a near miss when it's a loss
      for (let tries = 0; tries < 60; tries++) { const target = pick(LINES), S = new Set([12]), cells = shuffle(Array.from({ length: 25 }, (_, i) => i).filter(i => i !== 12));
        const need = target.filter(i => i !== 12); let last = null;
        if (win) { need.forEach(i => S.add(i)); last = pick(need); } else { const miss = pick(need); need.forEach(i => { if (i !== miss) S.add(i); }); }
        const extra = win ? rint(2, 4) : rint(3, 5); let added = 0;
        for (const i of cells) { if (added >= extra) break; if (S.has(i)) continue; S.add(i); if (LINES.some(L => (win ? L !== target : true) && complete(S, L))) S.delete(i); else added++; }
        if (!win && LINES.some(L => complete(S, L))) continue; if (win && LINES.filter(L => complete(S, L)).length !== 1) continue;
        const onCard = [...S].filter(i => i !== 12 && i !== last).map(i => nums[i]), cardSet = new Set(nums), off = shuffle(Array.from({ length: 75 }, (_, i) => i + 1).filter(n => !cardSet.has(n)));
        const calls = shuffle(onCard.concat(off.slice(0, CALLS - onCard.length - (last != null ? 1 : 0)))); if (last != null) calls.push(nums[last]); return { calls, target };
      } return { calls: shuffle(Array.from({ length: 75 }, (_, i) => i + 1)).slice(0, CALLS), target: null };
    }
    async function game(res, fast) {
      newCard(res.ticket); const { calls } = plan(!!res.win); await sleep(fast ? 120 : 400);
      for (let k = 0; k < calls.length; k++) { const n = calls[k]; agit = performance.now() + (fast ? 150 : 520); if (!fast) await sleep(260);
        now.innerHTML = ballHTML(n, 'big igb-in'); Snd.pop(); row.insertAdjacentHTML('afterbegin', ballHTML(n)); while (row.children.length > 6) row.lastElementChild.remove(); callsEl.textContent = `${k + 1} / ${CALLS} calls`;
        const i = nums.indexOf(n); if (i >= 0) { await sleep(fast ? 40 : 200); marks.add(i); const el = grid.children[i]; el.classList.add('on', 'dab'); Snd.dab(); if (!fast) buzz(8);
          const near = new Set(); LINES.forEach(L => { if (L.filter(x => marks.has(x)).length === 4) L.forEach(x => { if (!marks.has(x)) near.add(x); }); }); [...grid.children].forEach((c, j) => c.classList.toggle('near', near.has(j)));
          if (near.size && !LINES.some(L => complete(marks, L))) { msg.textContent = near.size > 1 ? `${near.size} TO GO!` : 'ONE TO GO!'; msg.className = 'igb-msg hot'; if (!fast) Snd.antic(0.5); }
          const done = LINES.find(L => complete(marks, L)); if (done) { [...grid.children].forEach(c => c.classList.remove('near')); for (const j of done) { grid.children[j].classList.add('line'); if (!fast) { Snd.tick(); await sleep(90); } }
            msg.textContent = 'BINGO!'; msg.className = 'igb-msg bingo'; box.classList.add('won'); await sleep(fast ? 500 : 700); box.classList.remove('won'); return res; } }
        await sleep(fast ? 110 : 180); }
      msg.textContent = t.lose || 'No line this time'; msg.className = 'igb-msg lose'; await sleep(fast ? 300 : 500); return res;
    }
    return { mode: 'spin', labels: { one: '🎱 Play a card', all: '🎱 Play all cards' },
      async play(R) { if (R.length === 1) { const r = await game(R[0], false); await celebrate(root, t, r, o.prizes); return; }
        for (const r of R.slice(0, 12)) { const x = await game(r, true); if (x.win) { Snd.coin(); buzz(25); } } await summary(root, t, R); },
      destroy() { ro.disconnect(); dvis.stop(); cancelAnimationFrame(raf); } };
  }

  const KINDS = { plinko: Plinko, wheel: Wheel, scratch: Scratch, slots: Slots, pinata: Pinata, penalty: Penalty, bingo: Bingo };
  const NAMES = { plinko: 'Plinko', wheel: 'Spin the Wheel', scratch: 'Scratchcards', slots: 'Slots', pinata: 'Smash the Piñata', penalty: 'Penalty Shoot-out', bingo: 'Bingo' };
  const setVars = (host, t) => { for (const [k, v] of Object.entries({ c1: t.c1, c2: t.c2, bg: t.bg, acc: t.accent, win: t.win, keeper: t.keeper || t.c2, kit: t.kit || t.c1 })) if (v) host.style.setProperty('--ig-' + k, v); };
  // safety net: any game whose page has gone (navigated away, re-rendered) is stopped so nothing keeps running in the background
  const LIVE = new Set(); setInterval(() => { for (const g of LIVE) if (!g.host.isConnected) g.destroy(); }, 1500);
  window.IGames = {
    KINDS: Object.keys(KINDS), NAMES, DECOS, Snd, iconHTML, burst: (host, theme) => coins(host, theme, 36),
    create(kind, host, o) {
      if (host._ig) { try { host._ig.destroy(); } catch { } } host.innerHTML = '';
      const F = KINDS[kind] || KINDS.scratch, dk = decoOf(o.theme); host.className = `ig-host deco-${dk} igk-${kind}`; setVars(host, o.theme);
      const inner = document.createElement('div'); inner.className = 'igx-inner'; host.appendChild(inner);
      const stage = document.createElement('div'); stage.className = 'igx-stage'; inner.appendChild(stage);
      const stopAmb = ambient(inner, o.theme), stopBulbs = bulbs(host);
      const g = F(stage, { ...o, root: inner }); const d0 = g.destroy; let dead = false; g.destroy = () => { if (dead) return; dead = true; LIVE.delete(g); try { d0 && d0.call(g); } catch { } stopAmb(); stopBulbs(); }; g.host = host; host._ig = g; LIVE.add(g); return g;
    },
    // full-screen jackpot win moment (used on any page when the winner next opens the site)
    jackpotWin(w, theme) { const t = { c1: '#1f5bff', c2: '#ff1f3d', bg: '#070c20', accent: '#ffd84d', win: '#22d36b', particles: '💰,💷,✨,⭐', ...(theme || {}) };
      const box = document.createElement('div'); box.className = 'ig-jpwin'; setVars(box, t); document.body.appendChild(box);
      const P = [{ i: 0, prize: 'JACKPOT', icon: '💰', cash: w.amount, credit: !!w.credit, count: 1 }, { i: 1, prize: '', cash: 0, count: 1 }];
      return celebrate(box, t, { ticket: w.ticket, label: 'JACKPOT!', win: { i: 0, prize: `Jackpot – ${w.comp || ''}`.replace(/ – $/, ''), icon: '💰' } }, P).then(() => box.remove()); },
    // a set of fake results for previews (Game Centre / demo)
    sample(prizes, n) { return Array.from({ length: n }, (_, k) => ({ ticket: 100 + k * 7, win: k % 3 === 1 && prizes.length ? { ...prizes[k % prizes.length], i: prizes[k % prizes.length].i } : null })); }
  };
})();
