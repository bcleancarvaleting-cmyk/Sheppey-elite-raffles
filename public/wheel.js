/* Draw studio visuals: name wheel + slot-style number reveal. The winner is always decided by the server first. */
(function () {
  'use strict';
  const COLS = [['#1f5bff', '#fff'], ['#ff1f3d', '#fff'], ['#eef1fa', '#0a1230'], ['#0d1a45', '#fff'], ['#3f74ff', '#fff'], ['#c8102e', '#fff']];

  function Wheel(host) {
    host.innerHTML = '<div class="wh"><div class="wh-ptr"></div><canvas></canvas><div class="wh-hub"><img src="logo-sm.jpg" alt=""></div></div>';
    const wrap = host.querySelector('.wh'), cv = host.querySelector('canvas');
    let tickets = [], groups = [], rot = 0, runs = [];
    function draw() {
      const size = wrap.clientWidth || 360, dpr = window.devicePixelRatio || 1;
      cv.width = size * dpr; cv.height = size * dpr; cv.style.width = cv.style.height = size + 'px';
      const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, size * dpr / 2, size * dpr / 2);
      const r = size / 2 - 8, n = tickets.length || 1;
      runs = [];
      tickets.forEach((x, i) => { const L = runs[runs.length - 1]; if (L && L.g === x[1]) L.n++; else runs.push({ g: x[1], s: i, n: 1 }); });
      if (!runs.length) runs.push({ g: -1, s: 0, n: 1 });
      runs.forEach((run, k) => {
        const a0 = -Math.PI / 2 + run.s / n * 2 * Math.PI, a1 = -Math.PI / 2 + (run.s + run.n) / n * 2 * Math.PI;
        let ci = k % COLS.length; if (k === runs.length - 1 && k > 0 && ci === 0) ci = 3;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, a0, a1); ctx.closePath();
        ctx.fillStyle = run.g < 0 ? '#0d1a45' : COLS[ci][0]; ctx.fill();
        ctx.lineWidth = runs.length > 150 ? .4 : 1.5; ctx.strokeStyle = '#050a1c'; ctx.stroke();
        const span = a1 - a0;
        if (span > .045 && run.g >= 0) {
          ctx.save(); ctx.rotate((a0 + a1) / 2); ctx.fillStyle = COLS[ci][1];
          const fs = Math.max(9, Math.min(17, span * r * .42, size / 24));
          ctx.font = `800 ${fs}px Inter, system-ui, sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
          let label = groups[run.g]?.name || ''; if (span > .14 && run.n > 1) label += ` ×${run.n}`;
          while (ctx.measureText(label).width > r * .66 && label.length > 4) label = label.slice(0, -2) + '…';
          ctx.fillText(label, r - 14, 0); ctx.restore();
        }
      });
      const g = ctx.createLinearGradient(-r, 0, r, 0); g.addColorStop(0, '#1f5bff'); g.addColorStop(1, '#ff1f3d');
      ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, 2 * Math.PI); ctx.lineWidth = 8; ctx.strokeStyle = g; ctx.stroke();
      for (let i = 0; i < 40; i++) { const a = i / 40 * 2 * Math.PI; ctx.beginPath(); ctx.arc(Math.cos(a) * (r + 3), Math.sin(a) * (r + 3), 2.3, 0, 2 * Math.PI); ctx.fillStyle = i % 2 ? '#fff' : '#ffd6dc'; ctx.fill(); }
    }
    function set(t, g) { tickets = t.slice(); groups = g; cv.style.transition = 'none'; rot %= 360; cv.style.transform = `rotate(${rot}deg)`; draw(); }
    function spinTo(ticket, ms = 8000) {
      return new Promise(res => {
        const i = tickets.findIndex(x => x[0] === ticket), n = tickets.length;
        const centre = ((i + .5 + (Math.random() - .5) * .7) / n) * 360;
        rot = Math.ceil(rot / 360) * 360 + 360 * 9 + (360 - centre);
        void cv.offsetWidth;
        cv.style.transition = `transform ${ms}ms cubic-bezier(.1,.62,.06,1)`; cv.style.transform = `rotate(${rot}deg)`;
        let done = false; const fin = () => { if (done) return; done = true; wrap.classList.add('hit'); setTimeout(() => wrap.classList.remove('hit'), 900); res(); };
        cv.addEventListener('transitionend', fin, { once: true }); setTimeout(fin, ms + 400);
      });
    }
    window.addEventListener('resize', () => tickets.length && draw());
    return { set, spinTo };
  }

  // Slot-machine style digit reveal for a known number
  function revealNumber(host, number, maxNumber) {
    const digits = String(Math.max(number, maxNumber || number)).length;
    const target = String(number).padStart(digits, '0');
    host.innerHTML = `<div class="slots">${Array.from({ length: digits }, () => '<div class="slot"><div class="reel"></div></div>').join('')}</div>`;
    const reels = [...host.querySelectorAll('.reel')];
    return Promise.all(reels.map((reel, i) => new Promise(res => {
      const spins = 3 + i * 2, final = +target[i], seq = [];
      for (let s = 0; s < spins; s++) for (let d = 0; d < 10; d++) seq.push(d);
      for (let d = 0; d <= final; d++) seq.push(d);
      reel.innerHTML = seq.map(d => `<span>${d}</span>`).join('');
      const h = reel.firstElementChild.offsetHeight || reel.firstElementChild.getBoundingClientRect().height || 90;
      reel.style.transform = 'translateY(0)'; void reel.offsetWidth;
      const ms = 2200 + i * 900;
      reel.style.transition = `transform ${ms}ms cubic-bezier(.15,.7,.1,1)`;
      reel.style.transform = `translateY(-${(seq.length - 1) * h}px)`;
      setTimeout(() => { reel.parentElement.classList.add('done'); res(); }, ms + 80);
    })));
  }

  // Letterbox reel: names roll slowly, then spin and land on the winning ticket
  function NameReel(host, tickets, groups) {
    const ROW = 64;
    host.innerHTML = '<div class="lb"><div class="lb-win"><div class="lb-strip"></div></div><div class="lb-line"></div></div>';
    const strip = host.querySelector('.lb-strip');
    const row = (t, g) => `<div class="lb-row"><b>#${t}</b><span>${esc(groups[g]?.name || '')}</span><small>${esc(groups[g]?.town || '')}</small></div>`;
    const sample = n => { const out = []; for (let i = 0; i < n; i++) out.push(tickets[Math.floor(Math.random() * tickets.length)]); return out; };
    let y = 0, raf = 0, idleRows = [];
    function idle() {
      cancelAnimationFrame(raf);
      idleRows = tickets.length > 30 ? sample(30) : tickets.slice();
      if (!idleRows.length) { strip.innerHTML = '<div class="lb-row"><span>No confirmed entries</span></div>'; return; }
      strip.style.transition = 'none';
      strip.innerHTML = idleRows.concat(idleRows).map(x => row(x[0], x[1])).join('');
      const loop = idleRows.length * ROW; let last = performance.now();
      const step = now => { y -= (now - last) * .045; last = now; if (-y >= loop) y += loop; strip.style.transform = `translateY(${y}px)`; raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
    }
    function spinTo(ticket, ms = 6500) {
      cancelAnimationFrame(raf);
      const win = tickets.find(x => x[0] === ticket) || [ticket, -1];
      const others = tickets.filter(x => x[1] !== win[1]); const pickOther = () => (others.length ? others : tickets)[Math.floor(Math.random() * (others.length || tickets.length))];
      const rows = sample(Math.min(70, Math.max(40, tickets.length)));
      rows.push(pickOther(), win, pickOther(), pickOther());
      strip.style.transition = 'none'; strip.style.transform = 'translateY(0)';
      strip.innerHTML = rows.map(x => row(x[0], x[1])).join('');
      const target = -((rows.length - 3) * ROW - ROW); // winner in the middle of 3 visible rows
      void strip.offsetWidth;
      return new Promise(res => {
        strip.style.transition = `transform ${ms}ms cubic-bezier(.12,.7,.08,1)`;
        strip.style.transform = `translateY(${target}px)`;
        setTimeout(() => { strip.children[rows.length - 3].classList.add('hit'); host.querySelector('.lb').classList.add('won'); res(); }, ms + 60);
      });
    }
    idle();
    return { idle, spinTo, stop: () => cancelAnimationFrame(raf) };
  }
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const css = `.wh{position:relative;width:min(560px,84vw,calc(100vh - 300px));min-width:260px;aspect-ratio:1;margin:10px auto}
  .wh canvas{display:block;border-radius:50%;box-shadow:0 0 50px rgba(31,91,255,.45),0 0 90px rgba(255,31,61,.25);will-change:transform}
  .wh-ptr{position:absolute;top:-10px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:20px solid transparent;border-right:20px solid transparent;border-top:38px solid #fff;z-index:3;filter:drop-shadow(0 3px 0 #ff1f3d) drop-shadow(0 0 10px rgba(31,91,255,.9))}
  .wh-hub{position:absolute;inset:0;margin:auto;width:23%;height:23%;border-radius:50%;overflow:hidden;border:4px solid #fff;z-index:2;box-shadow:0 0 20px rgba(0,0,0,.6)}
  .wh-hub img{width:100%;height:100%;object-fit:cover}
  .wh.hit .wh-ptr{animation:whp .9s ease}
  @keyframes whp{30%{transform:translateX(-50%) translateY(-8px) scale(1.15)}}
  .slots{display:flex;gap:10px;justify-content:center;margin:10px 0}
  .slot{width:76px;height:100px;border-radius:14px;overflow:hidden;background:linear-gradient(180deg,#050a1c,#101c40 50%,#050a1c);border:2px solid #2a3a70;box-shadow:inset 0 0 20px rgba(0,0,0,.7)}
  .slot.done{border-color:#ff1f3d;box-shadow:0 0 22px rgba(255,31,61,.55),inset 0 0 20px rgba(0,0,0,.7)}
  .reel span{display:flex;height:100px;align-items:center;justify-content:center;font:400 62px "Russo One",Inter,sans-serif;color:#fff;text-shadow:0 0 14px rgba(31,91,255,.8)}
  .lb{position:relative;max-width:520px;margin:10px auto;border-radius:18px;padding:4px;background:linear-gradient(90deg,#1f5bff,#ff1f3d);box-shadow:0 0 30px rgba(31,91,255,.35),0 0 30px rgba(255,31,61,.25)}
  .lb-win{height:192px;overflow:hidden;border-radius:14px;background:linear-gradient(180deg,#050a1c 0%,#0d1a45 50%,#050a1c 100%);-webkit-mask:linear-gradient(180deg,transparent,#000 22%,#000 78%,transparent);mask:linear-gradient(180deg,transparent,#000 22%,#000 78%,transparent)}
  .lb-row{height:64px;display:flex;align-items:center;gap:14px;padding:0 18px;color:#fff;font:700 20px Inter,sans-serif;white-space:nowrap}
  .lb-row b{font:400 24px "Russo One",Inter;color:#8fb0ff;min-width:84px}
  .lb-row span{flex:1;overflow:hidden;text-overflow:ellipsis;text-align:left}
  .lb-row small{color:#94a0c4;font-size:14px;font-weight:600}
  .lb-row.hit b{color:#ff5a6e}.lb-row.hit{font-size:23px}
  .lb-line{position:absolute;left:4px;right:4px;top:50%;height:64px;transform:translateY(-50%);border-top:2px solid rgba(255,255,255,.75);border-bottom:2px solid rgba(255,255,255,.75);pointer-events:none;box-shadow:0 0 18px rgba(255,255,255,.18) inset}
  .lb.won .lb-line{border-color:#ff1f3d;box-shadow:0 0 24px rgba(255,31,61,.55) inset}
  @media (max-width:520px){.lb-row{font-size:16px;padding:0 12px;gap:10px}.lb-row b{font-size:19px;min-width:62px}.lb-row small{display:none}
  .slot{width:56px;height:76px}.reel span{height:76px;font-size:46px}}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  window.DrawFX = { Wheel, revealNumber, NameReel };
})();
