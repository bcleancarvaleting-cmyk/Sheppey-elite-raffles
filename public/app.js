{ const cm = /^\/c\/([a-f0-9]{16})\/?$/.exec(location.pathname); if (cm) history.replaceState(null, '', '/' + location.search + '#comp-' + cm[1]); }
/* Sheppey Elite Raffles – customer site */
(function () {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const gbp = p => '£' + (p / 100).toLocaleString('en-GB', { minimumFractionDigits: p % 100 ? 2 : 0, maximumFractionDigits: 2 });
const gbp2 = p => '£' + (p / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fdt = s => new Date(s).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const fd = s => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const initials = u => ((u.first || '?')[0] + (u.last || '')[0]).toUpperCase();
const TOWNS = window.UK_TOWNS || [];
const img = src => src ? `background-image:url('${String(src).replace(/'/g, '%27')}')` : '';
const ICON = {
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6 5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
  fb: '<svg viewBox="0 0 24 24" width="36" height="36"><path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12z"/></svg>'
};

let site = {}, comps = [], me = null, winners = [], winMap = [], winInstant = [], winTotals = { prizes: 0, value: 0, instant: 0 };
const IS_APP = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || (window.SER_DEMO && (() => { try { return localStorage.getItem('ser_demo_app') === '1'; } catch { return false; } })());
const IS_IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
if (IS_APP) document.documentElement.classList.add('is-app');
const G = window.SERGames || {};
const lbl = c => (G.LABEL && c && c.gameMode && c.gameMode !== 'standard' && G.LABEL[c.gameMode]) || 'Ticket';
let catFilter = 'All', compCache = {}, lastCheckout = null, pendingAction = null, tickTimer = null;

// ---------- api ----------
async function api(url, body, method) {
  const r = await fetch(url, { method: method || (body ? 'POST' : 'GET'), credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'SER', 'X-App': IS_APP ? '1' : '0' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'Something went wrong – please try again.'); e.status = r.status; e.data = j; throw e; }
  return j;
}
function toast(msg, bad) { const t = $('#toast'); t.textContent = msg; t.style.borderLeftColor = bad ? 'var(--red)' : 'var(--green)'; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2800); }

// ---------- basket (paid comps only) ----------
const BKEY = 'ser_basket';
let basket = [];
try { basket = JSON.parse(localStorage.getItem(BKEY)) || []; } catch { basket = []; }
let bSync = null;
const saveBasket = () => { try { localStorage.setItem(BKEY, JSON.stringify(basket)); } catch {} setTimeout(() => { try { hqAll(); bbar(); } catch {} }, 0); clearTimeout(bSync); bSync = setTimeout(() => { if (me) api('/api/me/basket', { items: basket.map(b => ({ compId: b.compId, qty: b.qty })) }).catch(() => {}); }, 1500); renderTop(); const c = document.querySelector('.icon-btn.cart.has'); if (c) { c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); } };
function addToBasket(compId, qty, tickets) {
  const it = basket.find(x => x.compId === compId);
  const row = tickets && tickets.length ? { compId, qty: tickets.length, tickets: tickets.slice().sort((a, b) => a - b) } : { compId, qty };
  if (it) Object.assign(it, row, tickets && tickets.length ? {} : { tickets: undefined }); else basket.push(row);
  saveBasket();
}
const basketCount = () => basket.reduce((a, x) => a + x.qty, 0);

// ---------- dialogs & drawers ----------
const dlg = () => $('#dlg');
function openDlg(html) { $('#dlgBody').innerHTML = html; if (!dlg().open) dlg().showModal(); }
function closeDlg() { if (dlg().open) dlg().close(); }
function openDrawer(id) { $('#pop')?.classList.remove('on'); $('#bbar')?.classList.remove('on'); $$('.drawer').forEach(d => d.classList.toggle('on', d.id === id)); $('#scrim').classList.add('on'); if (id === 'basket') renderBasket(); if (id === 'menu') renderMenu(); }
function closeDrawers() { $$('.drawer').forEach(d => d.classList.remove('on')); $('#scrim').classList.remove('on'); setTimeout(() => { try { bbar(); } catch {} }, 0); }

// ---------- header ----------
function renderTop() {
  const n = basketCount();
  $('#tbRight').innerHTML = `
    ${me ? `<button class="acct-chip" data-acc-go><span class="av">${esc(initials(me.user))}</span><span class="nm">${esc(me.user.first)}</span></button>`
      : `<button class="btn ghost sm" data-auth="login">Log in</button><button class="btn sm" data-auth="register">Register</button>`}
    <button class="icon-btn cart ${n ? 'has' : ''}" data-open="basket" aria-label="Basket${n ? ', ' + n + ' tickets' : ''}">${ICON.cart}${n ? `<span class="count">${n}</span>` : ''}</button>
    <button class="icon-btn" data-open="menu" aria-label="Menu">${ICON.menu}</button>`;
}
function renderMenu() {
  $('#menu').innerHTML = `<header><h3 class="d">Menu</h3><button class="x" data-close-drawer>×</button></header>
    <div class="inner">
      ${me ? `<div style="display:flex;gap:12px;align-items:center;padding:12px;border:1px solid var(--line2);border-radius:14px;margin-bottom:12px"><span class="av" style="width:44px;height:44px">${esc(initials(me.user))}</span><div><b>${esc(me.user.first)} ${esc(me.user.last)}</b><br><small class="muted">${esc(me.user.address.town)}</small></div></div>`
        : `<div style="display:flex;gap:8px;margin-bottom:12px"><button class="btn ghost block" data-auth="login">Log in</button><button class="btn block" data-auth="register">Register</button></div>`}
      <div class="menu-links">
        <a href="#home">🏠 Home</a><a href="#competitions">🎟️ Live competitions</a><a href="#free">🎁 Free draws</a>
        ${me ? `<a href="#account-tickets">🎫 My tickets</a><a href="#account-wins">🏆 My wins</a><a href="#account-details">👤 My details</a>` : ''}
        <a href="#winners">🥇 Winners</a><a href="#charity">❤️ Charity donations</a><a href="#" data-openchat>💬 Community chat</a><a href="#how">❓ How it works</a>
        ${site.facebookUrl ? `<a href="${esc(site.facebookUrl)}" target="_blank" rel="noopener">👥 Join our ${esc(site.facebookGroupName)}</a>` : ''}
      </div>
    </div>
    ${me ? '<footer><button class="btn ghost block" data-logout>Log out</button></footer>' : ''}`;
}
function timeAgo(t) { const m = Math.max(0, Math.round((Date.now() - Date.parse(t)) / 6e4)); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' hr ago' : Math.round(m / 1440) + ' day' + (m >= 2880 ? 's' : '') + ' ago'; }
function setCrumbs(parts) {
  document.title = parts.length > 1 ? `${parts[parts.length - 1][0]} | Sheppey Elite Raffles` : 'Sheppey Elite Raffles – win big, drawn live';
  document.body.classList.toggle('on-home', parts.length === 1);
  $('#crumbs').innerHTML = parts.map((p, i) => i === parts.length - 1 ? `<span class="cur">${esc(p[0])}</span>` : `<a href="${p[1]}">${esc(p[0])}</a><span class="sep">›</span>`).join('');
}
function setNav(key) { $$('#quicknav a').forEach(a => a.classList.toggle('on', a.dataset.nav === key)); }

// ---------- loading ----------
async function loadSite() {
  try {
    site = await api('/api/site'); document.body.classList.toggle('no-postal', site.postalOn === false);
    $('#fTerms').textContent = site.terms || '';
    $('#fContact').innerHTML = site.contactEmail ? `<a href="mailto:${esc(site.contactEmail)}">${esc(site.contactEmail)}</a>` : '';
  } catch {}
}
async function loadComps() { comps = await api('/api/comps'); }
async function loadMe() { try { const r = await api('/api/me'); me = r.user ? r : null; } catch { me = null; } renderTop(); jpWinCheck(); }
async function loadWinners() { try { const r = await api('/api/winners'); winners = Array.isArray(r) ? r : r.list || []; winTotals = r.totals || winTotals; winMap = r.map || winners; winInstant = r.instant || []; } catch { winners = []; } }

// ---------- cards ----------
function statusLine(c) {
  if (c.status === 'soldout') return '<b style="color:var(--green)">Sold out</b>';
  if (c.status === 'ended') return '<b style="color:var(--orange)">Closed</b>';
  if (c.status === 'drawing' || c.status === 'drawn') return '<b style="color:var(--blue2)">Drawn</b>';
  if (c.unlimited) return `<span><b>${c.sold.toLocaleString()}</b> entries so far</span>`;
  return `<span><b>${c.available.toLocaleString()}</b> tickets left</span>`;
}
function urgent(c) {
  if (c.status !== 'live') return '';
  if (c.endsAt) { const ms = Date.parse(c.endsAt) - Date.now(); if (ms > 0 && ms < 864e5) return `⏰ Ends today · ${new Date(c.endsAt).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' })}`; }
  if (!c.unlimited && c.pct >= 85 && c.available > 0) return `🔥 Almost gone – ${c.available} left`;
  return '';
}
// ---------- ticking countdowns (only prizes with an end date) ----------
const cdHTML = (iso, big) => `<div class="cd ${big ? 'cd-big' : ''}" data-cd="${esc(iso)}">${['Days', 'Hours', 'Mins', 'Secs'].map(l => `<span><b>--</b><small>${l}</small></span>`).join('')}</div>`;
function tickCds() {
  for (const el of document.querySelectorAll('[data-cd]')) {
    const ms = Date.parse(el.dataset.cd) - Date.now();
    if (ms <= 0) { if (!el.classList.contains('cd-done')) { el.classList.add('cd-done'); el.innerHTML = '<em>Closed – draw coming up</em>'; } continue; }
    const v = [Math.floor(ms / 864e5), Math.floor(ms / 36e5) % 24, Math.floor(ms / 6e4) % 60, Math.floor(ms / 1e3) % 60];
    el.classList.toggle('cd-hot', ms < 864e5);
    el.querySelectorAll('b').forEach((b, i) => { const t = String(v[i]).padStart(2, '0'); if (b.textContent !== t) b.textContent = t; });
  }
}
setInterval(tickCds, 1000);
// one-line instant-win summary: count | total value
const iwValue = P => P.cash || P.value || (m => m ? Math.round(parseFloat(m[1].replace(/,/g, '')) * 100) : 0)(/£\s*([\d,]+(?:\.\d+)?)/.exec(P.prize || ''));
function iwLine(list, opts = {}) {
  const L = (list || []).filter(P => P.count > 0); if (!L.length) return '';
  const left = P => P.count - (P.won || 0), n = L.reduce((a, P) => a + left(P), 0), v = L.reduce((a, P) => a + left(P) * iwValue(P), 0);
  if (!n) return '';
  if (opts.card) return `<div class="iw-line iw-card"><span>⚡ <b>${n.toLocaleString()}</b> Instant Win${n > 1 ? "s" : ""}</span></div>`;
  return `<div class="iw-cq"><${opts.btn ? 'button type="button" data-iwt' : 'div'} class="iw-line"><span>⚡ <b>${n.toLocaleString()}</b> instant win${n > 1 ? 's' : ''}</span>${v ? `<i></i><span><b>${gbp(v)}</b><span class="w-v"> <span class="w-t">total </span>value</span></span>` : ''}${opts.btn ? '<em class="iw-go">›</em>' : ''}</${opts.btn ? 'button' : 'div'}></div>`;
}
// ---------- quick add on cards (ring stepper → add) ----------
const HQ_STEPS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 300, 400, 500, 750, 1000];
const hqQty = {};
function hqMax(c) { const held = me?.myComps?.[c.id]?.held || 0;
  return Math.max(0, Math.min(c.available ?? 1000, c.maxPerPerson ? c.maxPerPerson - held : 1000, 1000)); }
const hqOk = c => c.status === 'live' && c.type === 'paid' && !c.auto && !(c.appOnly && !IS_APP) && c.price > 0 && !c.iwFrozen;
// start at roughly the target spend (default £7.50): a 1p prize starts at 750 tickets, a £9.99 prize at 1; bundles win when they're close
function hqDefault(c, mx) {
  const tgt = Number(site.quickAddTarget) || 750, raw = tgt / Math.max(1, c.price);
  let best = HQ_STEPS.reduce((a, n) => Math.abs(n * c.price - tgt) < Math.abs(a * c.price - tgt) ? n : a, 1);
  if (raw > 1000) best = 1000;
  const bun = (c.bundles || []).map(x => x.buy).filter(n => n <= mx && Math.abs(n * c.price - tgt) <= tgt * 0.35).sort((a, z) => Math.abs(a * c.price - tgt) - Math.abs(z * c.price - tgt))[0];
  return Math.max(1, Math.min(mx, bun || best));
}
// quick-pick chips on the prize page, built round the starting amount (e.g. 49p: 5 · 10 · 15 · 30 · 75)
function autoChips(c, mx) {
  if (c.type === 'free') return [1, 2, 3, 5, 10].filter(n => n <= mx);
  const d = hqDefault(c, mx), snap = x => HQ_STEPS.reduce((a, n) => Math.abs(n - x) < Math.abs(a - x) ? n : a, 1);
  const bun = (c.bundles || []).map(x => x.buy);
  return [...new Set([snap(d / 3), d, ...bun.filter(n => n >= d / 3 && n <= d * 5), snap(d * 2), snap(d * 5)].map(n => Math.max(1, n)))].filter(n => n <= mx).sort((a, z) => a - z).slice(0, 5);
}
function hqHTML(c) {
  if (!hqOk(c)) return ''; const mx = hqMax(c); if (!mx) return `<div class="hq hq-full">${c.maxPerPerson ? 'You’ve reached the limit for this prize' : ''}</div>`;
  const inB = basket.find(x => x.compId === c.id)?.qty || 0, q = Math.min(mx, hqQty[c.id] ?? (inB || hqDefault(c, mx))), held = me?.myComps?.[c.id]?.held || 0;
  const bonus = bonusFor(c, q, held), cost = gbp2(q * c.price), same = inB && q === inB;
  return `<div class="hq" data-hq="${c.id}">
    <div class="hq-row"><button type="button" class="hq-pm" data-hqs="-1" aria-label="Fewer tickets" ${q <= 1 ? 'disabled' : ''}>−</button>
      <span class="hq-num"><b>${q}</b><small>TICKET${q > 1 ? 'S' : ''}</small>${bonus ? `<em>+${bonus} FREE</em>` : ''}</span>
      <button type="button" class="hq-pm" data-hqs="1" aria-label="More tickets" ${q >= mx ? 'disabled' : ''}>+</button></div>
    ${same ? `<button type="button" class="hq-go done" data-hqgo>✓ ${inB} in basket</button>` : `<button type="button" class="btn ring hq-go" data-hqgo>${ICON.cart}<span>${inB ? 'Update' : 'Add'} · ${cost}</span></button>`}</div>`;
}
function hqAll() { $$('[data-hq]').forEach(el => hqRefresh(el.dataset.hq)); }
function hqRefresh(id) { const c = comps.find(x => x.id === id); if (!c) return; $$(`[data-hq="${id}"]`).forEach(el => { el.outerHTML = hqHTML(c); }); }
function hqStep(id, dir) { const c = comps.find(x => x.id === id); if (!c) return; const mx = hqMax(c), inB = basket.find(x => x.compId === id)?.qty || 0;
  const cur = Math.min(mx, hqQty[id] ?? (inB || hqDefault(c, mx)));
  let nx = dir > 0 ? HQ_STEPS.find(n => n > cur) ?? cur + 25 : [...HQ_STEPS].reverse().find(n => n < cur) ?? 1;
  hqQty[id] = Math.max(1, Math.min(mx, nx)); hqRefresh(id); }
function hqGo(id) { const c = comps.find(x => x.id === id); if (!c) return; const mx = hqMax(c), inB = basket.find(x => x.compId === id);
  const q = Math.min(mx, hqQty[id] ?? (inB?.qty || hqDefault(c, mx)));
  if (inB && inB.qty === q) { openDrawer('basket'); return; }
  if (inB && inB.tickets) { location.hash = 'comp-' + id; return; }
  addToBasket(id, q); delete hqQty[id]; hqRefresh(id); toast(`${q} ticket${q > 1 ? 's' : ''} added – ${c.title}`); }
// sticky basket bar (home & competitions) with the next-offer nudge
function bbar() {
  let el = $('#bbar'); const show = basket.length && /^#?(home|competitions|free)?$/.test(location.hash) && !document.querySelector('.drawer.on');
  if (!show) { if (el) el.classList.remove('on'); return; }
  if (!el) { el = document.createElement('div'); el.id = 'bbar'; document.body.appendChild(el); }
  const rows = basket.map(b => ({ b, c: comps.find(x => x.id === b.compId) })).filter(r => r.c), n = rows.reduce((a, r) => a + r.b.qty + bonusFor(r.c, r.b.qty, me?.myComps?.[r.c.id]?.held || 0), 0);
  const total = rows.reduce((a, r) => a + r.b.qty * r.c.price, 0);
  let nudge = '';
  for (const r of rows) { const held = me?.myComps?.[r.c.id]?.held || 0, now = bonusFor(r.c, r.b.qty, held), nxt = (r.c.bundles || []).map(x => Math.ceil((r.b.qty + 1) / x.buy) * x.buy).filter(q => q - r.b.qty <= 5 && bonusFor(r.c, q, held) > now).sort((a, z) => a - z)[0];
    if (nxt) { nudge = `🎁 <b>+${nxt - r.b.qty}</b> on ${esc(r.c.title.length > 18 ? r.c.title.slice(0, 17).trim() + '…' : r.c.title)} = <b>${bonusFor(r.c, nxt, held) - now} free</b>`; break; } }
  const LV = me?.level; if (!nudge && LV && LV.next && LV.next.need - total > 0 && LV.next.need - total <= 1000) nudge = `${LVL_ICON[LV.next.name] || '⭐'} <b>${gbp(LV.next.need - total)}</b> more this month for ${esc(LV.next.name)} – ${LV.next.pct}% back`;
  if (!nudge && LV && LV.next && LV.next.need - total <= 0) nudge = `${LVL_ICON[LV.next.name] || '⭐'} This basket takes you to <b>${esc(LV.next.name)}</b> – ${LV.next.pct}% back`;
  el.innerHTML = `<button type="button" class="bb-in" data-open="basket"><span class="bb-ic">${ICON.cart}<i>${rows.length}</i></span><span class="bb-t"><b>${n} ticket${n > 1 ? 's' : ''} · ${gbp2(total)}</b>${nudge ? `<small>${nudge}</small>` : ''}</span><span class="bb-go">Checkout</span></button>`;
  el.classList.add('on');
}
// scheduled launches show a 'new competition coming soon' artwork with a countdown instead of the prize photo
const soonArt = (c, big) => `<div class="soon-art ${big ? 'big' : ''}"><span class="sa-rk">🚀</span><small>NEW COMPETITION</small><b>COMING SOON</b>${c.goLiveAt ? cdHTML(c.goLiveAt, big) : ''}</div>`;
function iwSection(I) {
  const left = I.prizes.reduce((a, P) => a + P.count - P.won, 0), total = I.prizes.reduce((a, P) => a + P.count, 0);
  const myP = I.myPlays || 0;
  return `<section class="iw-sec open" id="iwSec">${myP ? `<a class="plays-cta" href="#play-${I.compId}"><span class="pc-ic">🎮</span><span><b>${myP} play${myP > 1 ? 's' : ''} waiting</b><small>Reveal your tickets${I.game && I.game !== 'none' ? ' – ' + ({ plinko: 'Plinko', wheel: 'Spin the Wheel', scratch: 'Scratchcards', slots: 'Slots', pinata: 'Smash the Piñata', penalty: 'Penalty Shoot-out' }[I.game] || '') : ''}</small></span><span class="btn sm">Play</span></a>` : ''}<button type="button" class="iw-sh" data-iwh aria-label="Show or hide instant wins"><span class="iw-st">⚡ Instant Wins</span><small>${left} of ${total} left</small><em class="iw-car">▾</em></button>
    <div class="iw-body">${I.prizes.map((P, i) => { const tk = P.tickets || [];
      return `<div class="iwp ${P.count - P.won ? '' : 'gone'}"><button type="button" class="iwp-h" data-iwp="${i}" aria-expanded="false"><span class="iwp-n">${esc(P.prize)}${iwValue(P) ? `<small>${gbp(iwValue(P))} each</small>` : ''}</span><span class="iwp-c"><b>${P.count - P.won}</b>/${P.count} left</span><em class="iw-car">▾</em><i style="width:${(P.count - P.won) / P.count * 100}%"></i></button>
        <div class="iwp-t">${tk.length ? tk.map(x => `<span class="iwt ${x.won ? 'won' : ''}"><b>#${x.t}</b>${x.won ? `<small>${esc(x.won.name)}${x.won.town ? ' · ' + esc(x.won.town) : ''}</small>` : '<small>Still to be won</small>'}</span>`).join('') : '<span class="muted">Winning numbers are shown when the competition starts.</span>'}</div></div>`; }).join('')}
      </div></section>`;
}
function card(c) {
  const free = c.type === 'free', game = c.gameMode && c.gameMode !== 'standard';
  return `<a class="ccard ${game ? 'is-game' : ''}" href="#comp-${c.id}">
    <div class="img" style="${c.status === 'scheduled' ? '' : img(c.image)}">${c.status === 'scheduled' ? soonArt(c) : ''}${stamp(c)}
      ${game ? `<span class="game-tag g-${c.gameMode}">${{ duck: '🦆 Duck Race', race: '🏁 Race', banker: '💼 Elite Banker', hilo: '🃏 Higher or Lower' }[c.gameMode]}</span>` : c.auto ? '<span class="game-tag g-banker">👑 Elite Player</span>' : `<span class="cat ${free ? 'free' : ''}">${esc(free ? 'Free draw' : c.category)}</span>`}
      ${(c.bundles || []).length && c.status === 'live' ? `<span class="cat offer">Buy ${c.bundles[0].buy} <em>+${c.bundles[0].free} free</em></span>` : ''}
    </div>
    <div class="body">
      ${(() => { const t = [c.eligibility === 'kent' ? '<span class="ct kent">📍 Kent only</span>' : '', c.appOnly ? '<span class="ct app">📱 App exclusive</span>' : '', (c.prizes || []).length > 1 && c.status !== 'drawn' ? `<span class="ct wn">🏆 ${c.prizes.length} winners</span>` : ''].join(''); return t ? `<div class="ctags">${t}</div>` : ''; })()}
      ${c.status === 'live' ? iwLine(c.instant, { card: true }) : ''}
      <h3>${esc(c.title)}</h3>
      ${c.endsAt && c.status === 'live' ? cdHTML(c.endsAt) : ''}
      <div class="ends2 ${urgent(c) ? 'hot' : ''}">${urgent(c) ? urgent(c) : c.endsAt ? '⏱ Ends ' + fd(c.endsAt) : c.status === 'live' ? '🔥 Drawn when sold out' : c.status === 'soldout' ? '✅ Sold out – drawn live soon' : c.status === 'ended' ? '⏳ Entries closed' : '🏆 Drawn'}</div>
      <div class="price-row"><div class="price">${free ? 'FREE <small>· ' + (c.maxPerPerson ? c.maxPerPerson + ' per person' : c.sold.toLocaleString() + ' entries') + '</small>' : gbp(c.price) + ' <small>per entry</small>'}</div>${c.unlimited ? '' : `<span class="pct3">${ring(c.pct)}<b>${Math.floor(c.pct)}%</b></span>`}</div>
      ${c.unlimited ? '<div class="open-line">Open to everyone</div>' : `<div class="cblocks">${blocks(c.pct)}</div>`}
      <div class="meta">${statusLine(c)}${c.unlimited ? '' : `<span>${c.sold.toLocaleString()}/${c.totalTickets.toLocaleString()}</span>`}</div>
      ${c.iwFrozen && c.status === 'live' ? `<div class="hq"><div class="iw-frozen"><b>⚡ Instant wins open soon</b><small>Card payments are on their way – instant-win prizes go live with them.</small></div></div>` : hqOk(c) ? hqHTML(c) : c.appOnly && !IS_APP && c.status === 'live' && c.type === 'paid' ? `<div class="hq hq-app"><div class="hq-ab"><img src="icon-192.png" alt=""><span><b>App exclusive</b><small>Get our app to enter</small></span></div><button type="button" class="btn ring hq-go" data-install>📱 Enter via app</button></div>` : `<span class="btn ring">${c.status === 'live' ? (free ? 'Enter free' : 'Enter now') : c.status === 'scheduled' ? '🚀 Coming soon' : 'View'}</span>`}
    </div></a>`;
}

// half-size card for the Almost sold out / Ending soon strips
function miniCard(c, kind) {
  const free = c.type === 'free', ends = c.endsAt && Date.parse(c.endsAt) > Date.now();
  return `<a class="mcard" href="#comp-${c.id}"><div class="m-img" style="${c.status === 'scheduled' ? '' : img(c.image)}">${c.status === 'scheduled' ? soonArt({}) : ''}${kind === 'almost' ? `<span class="m-badge hot">🔥 ${Math.floor(c.pct)}% sold</span>` : ''}${(c.bundles || []).length ? `<span class="m-bund">🎁 ${c.bundles[0].buy}+${c.bundles[0].free}</span>` : ''}</div>
    <div class="m-body"><b>${esc(c.title)}</b>
      ${kind === 'ending' && ends ? cdHTML(c.endsAt) : kind === 'soon' && c.goLiveAt ? cdHTML(c.goLiveAt) : ''}
      <div class="m-row"><span class="m-price">${free ? 'FREE' : gbp(c.price)}</span><small>${c.unlimited ? c.sold.toLocaleString() + ' in' : Math.floor(c.pct) + '% sold'}</small></div>
      ${c.unlimited ? '' : `<div class="m-bar"><i style="width:${Math.min(100, c.pct)}%"></i></div>`}</div></a>`;
}

// ---------- views ----------
// jump (not glide) to the top on every page change – iOS can stop a smooth scroll halfway while the new page is drawing
function toTop() { const h = document.documentElement, prev = h.style.scrollBehavior; h.style.scrollBehavior = 'auto'; window.scrollTo(0, 0); requestAnimationFrame(() => { window.scrollTo(0, 0); setTimeout(() => { if (window.scrollY > 0 && !toTop.user) window.scrollTo(0, 0); h.style.scrollBehavior = prev; }, 120); }); }
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
function viewHome(scrollTo) {
  clearInterval(tickTimer);
  setCrumbs([['Home', '#home']]); setNav(scrollTo || 'home');
  const live = comps.filter(c => c.status === 'live' || c.status === 'soldout' || c.status === 'ended' || (c.status === 'drawing' && c.gameMode === 'banker'));
  const games = live.filter(c => c.gameMode && c.gameMode !== 'standard');
  const heroSlides = live.filter(c => c.status === 'live').sort((a, b) => (b.featured - a.featured) || (b.price * b.totalTickets - a.price * a.totalTickets));
  const featured = comps.find(c => c.featured && c.status === 'live') || live.filter(c => c.type === 'paid').sort((a, b) => b.price * b.totalTickets - a.price * a.totalTickets)[0] || live[0];
  const cats = ['All', ...new Set([...(site.categories || []), ...live.map(c => c.category)].filter(x => live.some(c => c.category === x || (x === 'Free' && c.type === 'free'))))];
  $('#view').innerHTML = `<div id="welcome"></div>
  <div class="hero2">
    <h1 class="d win-big"><span class="chrome">WIN BIG WITH</span><span class="rb">SHEPPEY ELITE</span></h1>
    <div class="carousel" id="carousel">
      <div class="c-track" id="cTrack"></div>
      <button class="c-arrow prev" data-car="-1" aria-label="Previous prize">‹</button>
      <button class="c-arrow next" data-car="1" aria-label="Next prize">›</button>
    </div>
    <div class="c-info" id="cInfo"></div>
    <div class="c-dots" id="cDots"></div>
  </div>

  <div class="wrap">
    <div class="trust2">${[['🎡', 'All Prizes', 'Drawn Live'], ['❤️', 'Supporting', 'Charities', '#charity'], ['📋', 'Entry Lists On', 'Every Prize'], ['✉️', 'Free Entry', 'Route']].map(([i, a, b, href], k) => segTile(i, a, b, k, href)).join('')}</div>
  </div>
  ${jpBox(site.jackpot)}

  <div id="nextLive"></div>
  <div class="ticker-band" id="statBand"></div>
  ${(() => { const L = comps.filter(c => c.status === 'live' && !c.auto);
    const almost = L.filter(c => !c.unlimited && c.pct >= 75).sort((a, b) => b.pct - a.pct);
    const ending = L.filter(c => c.endsAt && Date.parse(c.endsAt) > Date.now()).sort((a, b) => Date.parse(a.endsAt) - Date.parse(b.endsAt));
    const strip = (id, kind, a, bTxt, sub, list) => list.length ? `<section id="${id}" class="strip-sec mini"><div class="wrap"><div class="strip-head"><h2 class="d strip-title"><span class="chrome">${a}</span> <span class="rb">${bTxt}</span></h2><span class="strip-sub">${sub}</span><span class="strip-nav"><button data-strip="${id}" data-dir="-1" aria-label="Back">‹</button><button data-strip="${id}" data-dir="1" aria-label="More">›</button></span></div><div class="hstrip mini">${list.map(c => miniCard(c, kind)).join('')}</div></div></section>` : '';
    const soon = comps.filter(c => c.status === 'scheduled').sort((a, b) => Date.parse(a.goLiveAt) - Date.parse(b.goLiveAt));
    return strip('almost-gone', 'almost', 'ALMOST', 'SOLD OUT 🔥', '75%+ sold', almost) + strip('ending-soon', 'ending', 'ENDING', 'SOON ⏰', 'Closing soonest first', ending) + strip('coming-soon', 'soon', 'COMING', 'SOON 🚀', 'Save them for an alert when they launch', soon); })()}

  ${(() => { const L = comps.filter(c => c.status === 'live' && (c.instant || []).length && !c.auto); if (!L.length) return '';
    const G = [...new Set(L.map(c => c.iwGame).filter(g => g && g !== 'none'))];
    return `<section id="instant-wins"><div class="wrap"><h2 class="d win-big sec-big shine"><span class="chrome">INSTANT</span><span class="rb">WINS ⚡</span></h2>
      <p class="sec-sub">${L.some(c => c.iwFrozen) ? 'Opening soon – instant wins go live with card payments' : 'Pay by card, then play to reveal your instant wins'}</p><div id="playsCta"></div>
      ${G.length ? `<div class="iw-games-row">${G.map(g => `<span>${{ plinko: '🔴 Plinko', wheel: '🎡 Spin the Wheel', scratch: '🃏 Scratchcards', slots: '🎰 Slots', pinata: '🪅 Piñata', penalty: '⚽ Penalties' }[g] || g}</span>`).join('')}</div>` : ''}
      <div class="grid2">${L.map(card).join('')}</div></div></section>`; })()}
  <section id="competitions"><div class="wrap">
    <h2 class="d win-big sec-big shine"><span class="chrome">LIVE</span><span class="rb">COMPETITIONS</span></h2>
    <p class="sec-sub">Every prize is won – drawn live when it sells out</p>
    <div class="cats" id="cats">${cats.filter(x => x !== 'Free').map(c => `<button data-cat="${esc(c)}" class="${c === catFilter ? 'on' : ''}">${esc(c)}</button>`).join('')}</div>
    <div class="grid2" id="grid" style="margin-top:14px"></div>
  </div></section>

  ${games.length ? `<section id="games-home"><div class="wrap">
    <h2 class="d win-big sec-big shine"><span class="chrome">LIVE GAME</span><span class="rb">PRIZES</span></h2>
    <p class="sec-sub">Duck races, Race Around Sheppey and Elite Banker – played live when they sell out</p>
    <div class="grid2" style="margin-top:14px">${games.slice(0, 8).map(card).join('')}</div>
    <div style="text-align:center;margin-top:14px"><a class="pill-btn" href="#games">🎮 Live games page & results</a></div></div></section>` : ''}

  ${IS_APP ? '' : `<div class="wrap"><div class="app-banner">${segBox(`<div class="ab-in"><img src="icon-192.png" alt=""><div><b>Get the Sheppey Elite app</b><span>Free draws are app-exclusive – plus live draw alerts and faster entry</span></div><button class="btn sm ring-glow" data-install>Download app</button></div>`, 'ab-box', 30)}</div></div>`}

  ${site.facebookUrl ? `<section><div class="wrap"><div class="fb"><div class="fbi">${ICON.fb}</div><div><h3 class="d">Join our ${esc(site.facebookGroupName)}</h3><p>Live draws, new prizes first and winner announcements. Invite your friends – the more of us, the bigger the prizes.</p></div><a class="btn white" href="${esc(site.facebookUrl)}" target="_blank" rel="noopener">Join the group</a></div></div></section>` : ''}

  <section id="how"><div class="wrap">
    <div class="sec-head"><h2 class="d chrome">How it works</h2></div>
    <div class="steps">
      <div class="step"><div class="n rb">1</div><h4>Register</h4><p>Create your free account with your name, phone and town.</p></div>
      <div class="step"><div class="n rb">2</div><h4>Pick your tickets</h4><p>Choose a competition, set your tickets and check out. Free draws are added instantly.</p></div>
      <div class="step"><div class="n rb">3</div><h4>Pay by bank transfer</h4><p>Use the unique reference we give you. Your entries show <b style="color:var(--orange)">orange</b> until we confirm, then turn <b style="color:var(--green)">green</b>.</p></div>
      <div class="step"><div class="n rb">4</div><h4>Live draw</h4><p>The moment a competition sells out we draw it live on the wheel. Good luck!</p></div>
    </div>
  </div></section>

  <section id="free"><div class="wrap">
    <div class="split"><span></span><b>🎁 Free to enter</b><span></span></div>
    <h2 class="d win-big sec-big shine"><span class="chrome">FREE ENTRY</span><span class="rb">COMPETITIONS</span></h2>
    <p class="sec-sub">No payment needed – just register and claim your entries${IS_APP ? '' : ' (free draws are in the app)'}</p>
    <div class="grid2" id="freeGrid" style="margin-top:14px"></div>
  </div></section>

  <section id="numbers"><div class="wrap">
    <h2 class="d win-big sec-big shine"><span class="chrome">SHEPPEY ELITE</span><span class="rb">IN NUMBERS</span></h2>
    <div class="numgrid" id="numGrid"></div>
  </div></section>

  ${site.postalOn === false ? '' : `<section id="postal"><div class="wrap"><div class="box" style="max-width:none">
    <h2 class="d chrome" style="margin-top:0">Free postal entry route</h2>
    <p class="muted" style="margin-bottom:0">${postalText()}</p>
  </div></div></section>`}

  <section id="recent-winners"><div class="wrap">
    <div class="sec-head"><h2 class="d win-big sec-big" style="margin:0"><span class="chrome">RECENT</span><span class="rb">WINNERS</span></h2><a class="pill-btn" href="#winners">See all</a></div>
    ${winners.length ? `<div class="wmarquee"><div class="wm-track" style="--n:${Math.min(16, winners.length)}">${winners.slice(0, 16).map(winCard).join('')}${winners.slice(0, 16).map(winCard).join('')}</div></div>` : '<div class="empty">Our first winners will appear here.</div>'}
  </div></section>`;
  renderGrid();
  initCarousel(heroSlides);
  homeExtras();
  if (scrollTo && scrollTo !== 'home') requestAnimationFrame(() => { const el = document.getElementById(scrollTo); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120 }); });
  else toTop();
}
function winCard(w) {
  return `<div class="wcard"><a class="wc-img" href="#comp-${w.compId}" style="${img(w.photo || w.image)}">${w.photo ? '<span class="wc-real">📸 Winner photo</span>' : ''}</a>
    <div class="wc-body"><span class="wc-prize">${esc(w.prize)}</span><b>${esc(w.name)}</b><small>📍 ${esc(w.town || '—')} · #${w.ticket} · ${fd(w.at)}</small>
      ${w.quote ? `<q class="wc-quote">${esc(w.quote)}</q>` : ''}
      <span class="wc-links">${w.video ? `<a href="${esc(w.video)}" target="_blank" rel="noopener">▶ Watch the draw</a>` : ''}${w.proof ? `<a href="#proof-${w.compId}">🔐 Proof</a>` : ''}</span></div></div>`;
}
async function viewWinners() {
  clearInterval(tickTimer);
  setCrumbs([['Home', '#home'], ['Winners', '#winners']]); setNav('winners');
  await loadWinners();
  const pill = (k, label, val, money, soon) => `<div class="wpill ${soon ? 'soon' : ''}"><svg class="wp-ring" aria-hidden="true"><rect x="1.5" y="1.5" rx="999" pathLength="100"/></svg>
    <small>${label}</small><b class="d" ${soon ? '' : `data-count="${val}" data-money="${money ? 1 : 0}"`}>${soon ? 'Coming soon' : money ? '£0' : '0'}</b></div>`;
  $('#view').innerHTML = `<div class="wrap">
    ${bigHead('OUR', 'WINNERS', 'clamp(34px,9vw,64px)')}
    <p class="sec-sub">Every prize drawn live – here's everyone who's won with Sheppey Elite</p>
    <div class="wpills">${pill(0, 'Prizes won', winTotals.prizes)}${pill(1, 'Value won', winTotals.value, true)}${pill(2, 'Instant wins', winTotals.instant || 0, false, !site.cardPayments)}</div>
    ${site.cardPayments && winInstant.length ? `<div class="iw-strip"><div class="iws-head"><b>⚡ Instant winners</b><small>won the moment their payment was confirmed</small></div><div class="iws-row">${winInstant.map(w => `<a class="iws" href="#comp-${w.compId}"><span class="iws-img" style="${img(w.image)}"></span><span class="iws-t"><b>${esc(w.prize)}</b><span>${esc(w.name)}${w.town ? ' · ' + esc(w.town) : ''}</span><small>#${w.ticket} · ${timeAgo(w.at)}</small></span></a>`).join('')}</div></div>` : ''}
    ${winners.length ? `<div class="wgrid">${winners.map(winCard).join('')}</div>` : '<div class="empty" style="margin-top:20px">Our first winners will appear here.</div>'}
    ${winMap.length ? `<section id="winners-map"><h2 class="d win-big sec-big shine"><span class="chrome">WINNERS</span><span class="rb">ACROSS KENT</span></h2><p class="sec-sub">Every pin is a town where someone has won – the number shows how many</p><div id="kentMap"></div></section>` : ''}
  </div>`;
  toTop();
  countUp();
  if ($('#kentMap') && window.KentMap) KentMap.render($('#kentMap'), winMap);
}
function countUp() {
  const els = $$('[data-count]'); if (!els.length) return;
  const t0 = performance.now(), dur = 3200;
  const step = now => {
    const x = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - x, 3);
    for (const el of els) { if (!el.isConnected) return; const v = Math.round(+el.dataset.count * e); el.textContent = el.dataset.money === '1' ? '£' + Math.floor(v / 100).toLocaleString('en-GB') : v.toLocaleString('en-GB'); }
    if (x < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
// ---------- homepage: live countdown, stats ticker, counters ----------
let liveTick = null;
async function welcomeBack() {
  const box = $('#welcome'); if (!box || !me) return;
  const MC = me.myComps || {}, live = id => comps.find(c => c.id === id);
  const mine = Object.keys(MC).map(live).filter(c => c && (c.status === 'soldout' || c.status === 'ended' || (c.status === 'live' && ((!c.unlimited && c.pct >= 75) || (c.endsAt && Date.parse(c.endsAt) - Date.now() < 7 * 864e5)))));
  const pend = (me.orders || []).filter(o => o.status === 'pending').length, LV = me.level, cr = me.wallet?.credit || 0;
  const wonRecent = (me.wins || []).filter(w => Date.now() - Date.parse(w.at) < 14 * 864e5).length;
  const chips = [
    pend ? `<a class="wb-chip warn" href="#account-tickets">🏦 <b>${pend}</b> to pay</a>` : '',
    cr ? `<a class="wb-chip gold" href="#competitions">🎟️ <b>${gbp2(cr)}</b> credit</a>` : '',
    LV ? (LV.next ? `<a class="wb-chip" href="#account-level">${LV.level ? (LVL_ICON[LV.level] || '⭐') + ' ' + esc(LV.level) + ' · ' : '🎯 '}<b>${gbp(LV.next.need)}</b> to ${esc(LV.next.name)}</a>` : `<a class="wb-chip gold" href="#account-level">${LVL_ICON[LV.level] || '⭐'} <b>${esc(LV.level)}</b> · ${LV.pct}% back</a>`) : '',
    mine.length ? `<a class="wb-chip hot" href="#account-tickets">🔥 <b>${mine.length}</b> near the draw</a>` : '',
    wonRecent ? `<a class="wb-chip win" href="#account-wins">🏆 <b>${wonRecent}</b> win${wonRecent > 1 ? 's' : ''} lately</a>` : '',
    '<span data-wbrank hidden></span>'].filter(Boolean);
  const set = list => `<div class="wb-set">${list.join('')}</div>`;
  box.innerHTML = `<div class="wb2"><span class="wb2-hi">👋 Welcome back, <b>${esc(me.user.first)}</b></span><div class="wb2-track"><div class="wb2-move">${set(chips)}${set(chips)}</div></div></div>`;
  const go = () => { const mv = box.querySelector('.wb2-move'), tr = box.querySelector('.wb2-track'); if (!mv) return; const w = mv.firstElementChild.scrollWidth; mv.classList.toggle('run', w > tr.clientWidth); mv.style.setProperty('--d', Math.max(12, w / 28) + 's'); };
  requestAnimationFrame(go);
  if (window.scrollY > 0 && window.scrollY < 120) toTop();
  try { const d = await api('/api/board'); if (d.board && d.board.status === 'live' && d.me && d.me.rank) { $$('[data-wbrank]').forEach(r => r.outerHTML = `<a class="wb-chip" href="#leaderboard">🏅 <b>#${d.me.rank}</b> on the leaderboard</a>`); go(); } } catch { }
}
// ---------- PLAY: instant-win games ----------
let playGame = null;
async function viewPlay(compId, waitRef) {
  clearInterval(tickTimer); setNav(''); setCrumbs([['Home', '#home'], ['Instant wins', '#play']]);
  if (!me) { location.hash = 'home'; pendingAction = () => { location.hash = 'play' + (compId ? '-' + compId : ''); }; return authDialog('login', 'Log in to play your instant wins'); }
  $('#view').innerHTML = '<div class="wrap narrow" style="padding-top:24px"><div class="skeleton"></div></div>'; toTop();
  let P; try { P = await api('/api/me/plays'); } catch (e) { $('#view').innerHTML = `<div class="wrap narrow"><div class="empty" style="margin-top:30px">${esc(e.message)}</div></div>`; return; }
  let C = P.comps.find(c => c.compId === compId);
  if (waitRef && (!C || !C.tickets.length)) { // card paid – wait for DNA's confirmation, then the plays appear
    $('#view').innerHTML = `<div class="wrap narrow">${bigHead('CONFIRMING', 'PAYMENT', 'clamp(28px,7vw,48px)')}<div class="pay-wait"><span class="pw-spin"></span><b>Waiting for your card payment to be confirmed…</b><small>This usually takes a few seconds. Your instant-win plays appear here the moment it's done.</small></div></div>`;
    for (let k = 0; k < 40; k++) { await new Promise(x => setTimeout(x, 3000)); if (!location.hash.startsWith('#play')) return; try { P = await api('/api/me/plays'); } catch { } C = P.comps.find(c => c.compId === compId); if (C && C.tickets.length) break;
      if (k % 2) { try { await loadMe(); const o = (me.orders || []).find(x => x.ref === waitRef); if (o && ['cancelled', 'expired'].includes(o.status)) { location.hash = 'payfail-' + waitRef; return; } } catch { } } }
    if (!C || !C.tickets.length) { toast('Still waiting for the card payment – we’ll notify you when your plays are ready'); return viewAccount('tickets'); }
    toast('Payment confirmed – good luck! 🍀'); }
  C = C || P.comps.find(c => c.tickets.length) || P.comps[0];
  if (!C) { $('#view').innerHTML = `<div class="wrap narrow">${bigHead('INSTANT', 'WINS', 'clamp(30px,8vw,52px)')}<div class="empty" style="margin-top:16px">No plays yet – enter an instant-win competition and your tickets appear here once your payment's confirmed.<br><br><a class="btn" href="#instant-wins">See instant-win prizes</a></div></div>`; return; }
  if (playGame) { try { playGame.destroy(); } catch { } playGame = null; }
  const T = C.theme, NAMES = window.IGames ? IGames.NAMES : {};
  let left = C.tickets.slice(), wins = C.wins.slice(), busy = false;
  $('#view').innerHTML = `<div class="wrap narrow">
    ${bigHead(esc((T.title || 'INSTANT WINS').split(' ').slice(0, -1).join(' ') || 'INSTANT'), esc((T.title || 'INSTANT WINS').split(' ').slice(-1)[0]), 'clamp(28px,7vw,48px)')}
    ${P.comps.length > 1 ? `<div class="play-tabs">${P.comps.map(c => `<a href="#play-${c.compId}" class="${c.compId === C.compId ? 'on' : ''}"><span class="t" style="${img(c.image)}"></span>${esc(c.title.length > 22 ? c.title.slice(0, 21) + '…' : c.title)}${c.tickets.length ? `<i>${c.tickets.length}</i>` : ''}</a>`).join('')}</div>` : ''}
    <div class="play-head"><span class="ph-img" style="${img(C.image)}"></span><div><b>${esc(C.title)}</b><small>${esc(NAMES[C.game] || '')} · <span id="plLeft">${left.length}</span> play${left.length === 1 ? '' : 's'} left</small></div></div>
    <div id="igHost"></div>
    <div class="play-bar"><button class="btn ring" id="plOne"></button><button class="btn" id="plAll"></button></div>
    <div class="play-stat"><span>Prizes still to be won</span><span>${C.prizes.map(p => `${IGames.iconHTML(p.icon)} <b>${p.left}</b>/${p.count}`).join(' · ')}</span></div>
    <div id="plSum"></div>
    <p class="muted" style="font-size:12px;text-align:center;margin-top:14px">Results were locked when this competition opened – the game just reveals them. Prizes are paid as soon as they're revealed, and anything you don't play is revealed for you after 24 hours.</p></div>`;
  const host = $('#igHost'); playGame = IGames.create(C.game, host, { theme: T, prizes: C.prizes, logo: 'logo-sm.jpg' });
  const sb = document.createElement('button'); sb.className = 'ig-snd'; sb.textContent = IGames.Snd.on ? '🔊' : '🔇'; sb.onclick = () => { sb.textContent = IGames.Snd.toggle() ? '🔊' : '🔇'; }; host.appendChild(sb);
  const one = $('#plOne'), all = $('#plAll');
  host.addEventListener('igaction', () => { if (!one.disabled) one.click(); });
  const sum = () => { const m = new Map(); wins.forEach(w => m.set(w.prize, (m.get(w.prize) || 0) + 1));
    $('#plSum').innerHTML = wins.length ? `<div class="play-sum">🏆 <b>You've won ${wins.length} instant prize${wins.length > 1 ? 's' : ''}</b> in this competition<div class="ps-list">${[...m].map(([p, n]) => `<span>${n} × ${esc(p)}</span>`).join('')}</div></div>` : '';
    $('#plLeft').textContent = left.length; const isScr = playGame.mode === 'scratch';
    one.textContent = left.length ? playGame.labels.one : 'No plays left'; one.disabled = busy || !left.length;
    all.textContent = isScr ? playGame.labels.all : `${playGame.labels.all} (${left.length})`; all.disabled = busy || (isScr ? !(playGame.unrevealed && playGame.unrevealed()) && !left.length : !left.length); };
  const take = async (n) => { const pick = n === 'all' ? null : left.slice(0, n); const r = await api('/api/me/play', pick ? { compId: C.compId, tickets: pick } : { compId: C.compId, all: true });
    const got = new Set(r.results.map(x => x.ticket)); left = left.filter(t => !got.has(t)); r.results.filter(x => x.win).forEach(x => wins.push({ ticket: x.ticket, i: x.win.i, prize: x.win.prize })); return r.results; };
  const run = async fn => { if (busy) return; busy = true; sum(); try { await fn(); } catch (e) { toast(e.message, true); } busy = false; sum(); loadMe(); };
  one.onclick = () => run(async () => { const R = await take(playGame.mode === 'scratch' ? 21 : 1); await playGame.play(R); });
  all.onclick = () => run(async () => {
    if (playGame.mode === 'scratch') { if (!(playGame.unrevealed && playGame.unrevealed())) { const R = await take(21); playGame.deal(R); await new Promise(r => setTimeout(r, 300)); } await playGame.scratchAll(); return; }
    const R = await take('all'); await playGame.play(R);
    const w = R.filter(x => x.win).length; toast(w ? `🎉 ${w} instant win${w > 1 ? 's' : ''} from ${R.length} plays!` : `${R.length} plays revealed – no wins this time`); });
  sum();
}
async function playsCta() {
  const el = $('#playsCta'); if (!el || !me) return;
  try { const P = await api('/api/me/plays'); myPlays = P.total || 0; if (!P.total) { el.innerHTML = ''; return; } const top = P.comps.find(c => c.tickets.length);
    el.innerHTML = `<a class="plays-cta" href="#play-${top.compId}"><span class="pc-ic">🎮</span><span><b>${P.total.toLocaleString()} play${P.total > 1 ? 's' : ''} waiting</b><small>Your instant-win tickets are ready to reveal</small></span><span class="btn sm">Play now</span></a>`; } catch { }
}
let myPlays = 0;
async function homeExtras() {
  playsCta();
  welcomeBack();
  $$('[data-strip]').forEach(b => b.onclick = () => { const s = b.closest('.strip-sec').querySelector('.hstrip'); s.scrollBy({ left: +b.dataset.dir * s.clientWidth * 0.85, behavior: 'smooth' }); });
  tickCds();
  let st; try { st = await api('/api/stats'); } catch { return; }
  const off = st.serverNow - Date.now(), money = p => '£' + Math.round(p / 100).toLocaleString('en-GB');
  const band = $('#statBand');
  if (band) { const items = [`🏆 <b>${money(st.value)}</b> won by our players`, `🎟️ <b>${st.today.toLocaleString()}</b> entries in the last 24 hours`, `❤️ <b>${money(st.donated)}</b> donated to local charities`, `🎯 <b>${st.live}</b> live competitions`, `👥 <b>${st.players.toLocaleString()}</b> players`, '🎡 Every prize drawn <b>live</b>'];
    const row = items.map(x => `<span>${x}</span>`).join('<i>✦</i>'); band.innerHTML = `<div class="tb-track"><div>${row}<i>✦</i></div><div aria-hidden="true">${row}<i>✦</i></div></div>`; }
  const ng = $('#numGrid');
  if (ng) {
    ng.innerHTML = [['🏆', 'Won by players', st.value, 1], ['🎁', 'Prizes won', st.prizes, 0], ['❤️', 'Donated to charity', st.donated, 1], ['👥', 'Players', st.players, 0]]
      .map(([i, l, v, m], k) => segBox(`<div class="nb"><span>${i}</span><b class="d" data-n="${v}" data-m="${m}">${m ? '£0' : '0'}</b><small>${l}</small></div>`, 'numbox', 70 + k)).join('');
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); const els = $$('#numGrid [data-n]'), t0 = performance.now();
      const f = now => { const x = Math.min(1, (now - t0) / 2600), e = 1 - Math.pow(1 - x, 3); els.forEach(el => { const v = Math.round(+el.dataset.n * e); el.textContent = el.dataset.m === '1' ? money(v) : v.toLocaleString('en-GB'); }); if (x < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); } }, { threshold: 0.3 });
    io.observe(ng);
  }
  const nb = $('#numbers .wrap'); if (nb && st.board && !$('.lb-teaser')) nb.insertAdjacentHTML('beforeend', `<a class="lb-teaser" href="#leaderboard"><span>🏅</span><div><small>LEADERBOARD CHALLENGE${st.board.kent ? ' · KENT ONLY' : ''}</small><b>Win ${esc(st.board.prize)}</b><em>Earn points every time you play, log in & invite friends – free</em></div><i>›</i></a>`);
  clearInterval(liveTick);
  const nl = $('#nextLive'), L = st.nextLive;
  if (nl && (L || st.liveNow)) {
    const ext = L && /^https?:/.test(L.link);
    const upd = () => { if (!nl.isConnected) return clearInterval(liveTick); const ms = L ? Date.parse(L.at) - (Date.now() + off) : -1;
      const join = L ? `<a class="btn sm" href="${esc(L.link)}" ${ext ? 'target="_blank" rel="noopener"' : ''}>${ext ? 'Join on Facebook' : 'Watch'}</a>` : '<button class="btn sm" data-openchat-live>Join the live chat</button>';
      if (ms > 0) { const h = Math.floor(ms / 36e5), m = Math.floor(ms / 6e4) % 60, s2 = Math.floor(ms / 1e3) % 60;
        nl.innerHTML = `<div class="wrap"><div class="nl-box"><span class="nl-dot"></span><div class="nl-txt"><small>NEXT LIVE DRAW</small><b>${esc(L.title)}</b></div><div class="nl-cd">${h ? `<span><b>${h}</b>h</span>` : ''}<span><b>${String(m).padStart(2, '0')}</b>m</span><span><b>${String(s2).padStart(2, '0')}</b>s</span></div>${join}</div></div>`; }
      else nl.innerHTML = `<div class="wrap"><div class="nl-box now"><span class="nl-dot"></span><div class="nl-txt"><small>🔴 LIVE NOW</small><b>${esc(L ? L.title : 'Live draw')}</b></div>${join}</div></div>`; };
    upd(); liveTick = setInterval(upd, 1000);
  }
}
// ---------- hero carousel ----------
let car = { list: [], i: 0, timer: null };
function segTile(icon, a, b, k, href) {
  return `<${href ? `a href="${href}"` : 'div'} class="tile2" style="--d:${k * -1.1}s"><svg class="tseg" preserveAspectRatio="none" aria-hidden="true"><defs>
    <linearGradient id="tg${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff1f3d"/><stop offset=".5" stop-color="#9b3fe0"/><stop offset="1" stop-color="#1f5bff"/></linearGradient>
    <mask id="tm${k}"><rect class="tmask" x="2" y="2" rx="16" pathLength="100"/></mask></defs>
    <rect class="tbase" x="2" y="2" rx="16" pathLength="100"/><rect class="ton" x="2" y="2" rx="16" pathLength="100" stroke="url(#tg${k})" mask="url(#tm${k})"/></svg>
    <span class="ti">${icon}</span><span class="tt">${a}<b>${b}</b></span>${href ? '<span class="tgo">→</span>' : ''}</${href ? 'a' : 'div'}>`;
}
function ring(pct) {
  const N = 40, on = Math.min(N, Math.round(pct / 100 * N)) || (pct > 0 ? 1 : 0);
  let s = '';
  for (let i = 0; i < N; i++) { const t = i / (N - 1), col = `color-mix(in srgb,#1f5bff ${Math.round(t * 100)}%,#ff1f3d)`;
    s += `<rect x="48" y="4" width="4" height="13" rx="2" transform="rotate(${i * 360 / N} 50 50)" class="${i < on ? 'on' : ''}${i === on - 1 ? ' last' : ''}" style="--c:${col}"/>`; }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${s}</svg>`;
}
function blocks(pct, label) {
  const on = Math.min(50, Math.round(pct / 2)) || (pct > 0 ? 1 : 0);
  let h = '';
  for (let i = 0; i < 50; i++) { const t = i / 49; h += `<i class="${i < on ? 'on' : ''}${i === on - 1 ? ' last' : ''}" style="--c:color-mix(in srgb,#1f5bff ${Math.round(t * 100)}%,#ff1f3d)"></i>`; }
  return `<div class="blocks" role="img" aria-label="${label || Math.floor(pct) + '% sold'}">${h}</div>`;
}
function drawLine(c) {
  if (c.endsAt) return 'Draw ' + new Date(c.endsAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
  return 'Drawn live the moment it sells out';
}
function initCarousel(list) {
  clearInterval(car.timer);
  car.list = list; car.i = 0;
  const track = $('#cTrack'); if (!track) return;
  if (!list.length) { $('#carousel').innerHTML = '<div class="empty" style="margin:0 18px">New prizes coming soon.</div>'; return; }
  track.innerHTML = list.map((c, i) => `<a class="c-slide" data-i="${i}" href="#comp-${c.id}" aria-label="${esc(c.title)}">
      <span class="c-ring"></span>
      <span class="c-img" style="${img(c.image)}">${stamp(c)}${c.type === 'free' ? '<span class="c-tag">Free draw</span>' : c.featured ? '<span class="c-tag">Featured</span>' : ''}</span></a>`).join('');
  $('#cDots').innerHTML = list.length > 1 && list.length <= 7 ? list.map((_, i) => `<button data-dot="${i}" aria-label="Prize ${i + 1}"></button>`).join('') : list.length > 7 ? '<div class="c-count" id="cCount"></div>' : '';
  $$('.c-arrow').forEach(b => b.classList.toggle('hidden', list.length < 2));
  layoutCarousel();
  // swipe
  let x0 = null;
  track.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; stopAuto(); }, { passive: true });
  track.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) moveCarousel(dx < 0 ? 1 : -1); startAuto(); });
  track.addEventListener('click', e => { const s = e.target.closest('.c-slide'); if (s && +s.dataset.i !== car.i) { e.preventDefault(); car.i = +s.dataset.i; layoutCarousel(); } });
  $('#carousel').addEventListener('mouseenter', stopAuto); $('#carousel').addEventListener('mouseleave', startAuto);
  startAuto();
}
function startAuto() { clearInterval(car.timer); if (car.list.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) car.timer = setInterval(() => { if (!$('#cTrack')) return clearInterval(car.timer); moveCarousel(1); }, 6000); }
function stopAuto() { clearInterval(car.timer); }
function moveCarousel(d) { const n = car.list.length; car.i = (car.i + d + n) % n; layoutCarousel(); }
function layoutCarousel() {
  const n = car.list.length;
  $$('.c-slide').forEach(el => {
    let off = +el.dataset.i - car.i;
    if (n > 2) { if (off > n / 2) off -= n; if (off < -n / 2) off += n; }
    el.dataset.off = Math.max(-2, Math.min(2, off));
    el.classList.toggle('active', off === 0);
    el.tabIndex = off === 0 ? 0 : -1;
  });
  $$('#cDots button').forEach((b, i) => b.classList.toggle('on', i === car.i));
  if ($('#cCount')) $('#cCount').innerHTML = `<b>${car.i + 1}</b> / ${n}`;
  const c = car.list[car.i], free = c.type === 'free';
  $('#cInfo').innerHTML = `<div class="c-draw">Supporting our local community, one prize at a time</div>
    <h1 class="d c-title">${esc(c.title)}</h1>
    <div class="price-c"><b>${free ? 'FREE' : gbp(c.price)}</b><span>${free ? (c.maxPerPerson ? `up to ${c.maxPerPerson} entries each` : 'to enter') : 'per entry'}</span>${c.cashAlt ? `<small>Cash alternative <b>${esc(c.cashAlt)}</b></small>` : ''}</div>
    ${c.unlimited ? `<div class="entries-big"><b>${c.sold.toLocaleString()}</b> entries so far</div>` : `<div class="pbar"><div class="pbar-top"><span><b>${Math.floor(c.pct)}%</b> sold</span><span>${c.sold.toLocaleString()} / ${c.totalTickets.toLocaleString()}</span></div>${blocks(c.pct)}</div>`}
    <a class="btn lg ${free ? 'blue' : ''}" href="#comp-${c.id}">${free ? 'Enter free' : 'Enter now'}</a>`;
}

function postalText() {
  return `No purchase necessary. For a free entry into any competition, send an unenclosed postcard with your full name, address, town, phone number, email and the competition name to <b style="color:var(--text)">${esc(site.postalAddress || 'the address in our terms')}</b>. One entry per postcard. Postal entries are treated exactly the same as online entries and appear on the entry list once added.`;
}
function renderGrid() {
  const open = comps.filter(c => ['live', 'soldout', 'ended'].includes(c.status));
  const isG = c => c.gameMode && c.gameMode !== 'standard';
  const fl = open.filter(c => c.type === 'free' && !isG(c)).sort((a, b) => (a.status !== 'live') - (b.status !== 'live') || b.pct - a.pct);
  const fg = $('#freeGrid'); if (fg) fg.innerHTML = fl.length ? fl.map(card).join('') : '<div class="empty" style="grid-column:1/-1">New free competitions coming soon.</div>';
  if (catFilter === 'Free') catFilter = 'All';
  const list = open.filter(c => c.type !== 'free' && !isG(c))
    .filter(c => catFilter === 'All' || c.category === catFilter)
    .sort((a, b) => (a.status !== 'live') - (b.status !== 'live') || (b.featured - a.featured) || b.pct - a.pct);
  const g = $('#grid'); if (!g) return;
  g.innerHTML = list.length ? list.map(card).join('') : '<div class="empty" style="grid-column:1/-1">No competitions here right now – check back soon.</div>';
  bbar();
}

// ---------- charity donations ----------
async function viewCharity() {
  clearInterval(tickTimer);
  setCrumbs([['Home', '#home'], ['Charity donations', '#charity']]); setNav('charity');
  $('#view').innerHTML = '<div class="wrap" style="padding-top:24px"><div class="skeleton"></div></div>';
  toTop();
  let d; try { d = await api('/api/donations'); } catch (e) { $('#view').innerHTML = `<div class="wrap"><div class="empty" style="margin-top:30px">${esc(e.message)}</div></div>`; return; }
  const paid = d.list.filter(x => x.paid), pledged = d.list.filter(x => !x.paid);
  const dcard = x => `<div class="don ${x.paid ? 'paid' : ''}">
      <div class="don-photo" style="${img(x.paid && x.photo ? x.photo : x.image)}">${x.paid && x.photo ? '<span class="don-tag">📸 Donation made</span>' : x.paid ? '<span class="don-tag">✅ Donated</span>' : '<span class="don-tag pl">Pledged</span>'}</div>
      <div class="don-body">
        <div class="don-amt">${gbp(x.amount)}</div>
        <div class="don-to">${x.paid ? 'donated to' : 'to be donated to'}</div>
        <h3 class="d">${esc(x.charityName)}</h3>
        ${x.note ? `<p class="don-note">${esc(x.note)}</p>` : ''}
        <div class="don-meta">${x.paid ? `${x.paidAt ? new Date(x.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' : ''}` : x.unlimited ? 'When this competition closes · ' : `When sold out · ${Math.floor(x.pct)}% sold · `}<a href="#comp-${x.compId}">${esc(x.title)} →</a></div>
      </div></div>`;
  $('#view').innerHTML = `<div class="wrap">
    <div class="c-draw cp-community" style="margin-top:26px">Supporting our local community, one prize at a time</div>
    <h1 class="d win-big" style="margin-top:8px;font-size:clamp(30px,7vw,56px)"><span class="chrome">CHARITY</span><span class="rb">DONATIONS</span></h1>
    <div class="totaliser">
      <svg class="tseg" preserveAspectRatio="none" aria-hidden="true"><defs>
        <linearGradient id="tgT" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff1f3d"/><stop offset=".5" stop-color="#9b3fe0"/><stop offset="1" stop-color="#1f5bff"/></linearGradient>
        <mask id="tmT"><rect class="tmask tot" x="3" y="3" rx="22" pathLength="100"/></mask></defs>
        <rect class="tbase" x="3" y="3" rx="22" pathLength="100"/><rect class="ton" x="3" y="3" rx="22" pathLength="100" stroke="url(#tgT)" mask="url(#tmT)"/></svg>
      <div class="tot-label">Total donated to charity</div>
      <div class="tot-num rb" id="totNum">£0</div>
      <div class="tot-sub">${d.charities ? `to ${d.charities} local ${d.charities === 1 ? 'charity' : 'charities'}` : 'Our first donation is on its way'}${d.pledged ? ` · <b>${gbp(d.pledged)}</b> more pledged on live competitions` : ''}</div>
    </div>
    ${paid.length ? `<section style="padding-bottom:0"><h2 class="d chrome">Donations made</h2><div class="dons">${paid.map(dcard).join('')}</div></section>` : ''}
    ${pledged.length ? `<section><h2 class="d chrome">Coming up</h2><p class="muted" style="margin-top:-8px">Every one of these competitions donates to charity when it sells out.</p><div class="dons">${pledged.map(dcard).join('')}</div></section>` : ''}
    ${!d.list.length ? '<div class="empty" style="margin:30px 0">Charity competitions are coming soon.</div>' : ''}
    ${d.supported && d.supported.length ? `<section style="padding-bottom:0"><h2 class="d chrome">Charities we support</h2><div class="ch-list">${d.supported.map(x => `<span>❤️ <b>${esc(x.name)}</b>${x.town ? ` <small>📍 ${esc(x.town)}</small>` : ''}</span>`).join('')}</div></section>` : ''}
    <section id="suggest"><div class="sug-wrap">${segBox(`<div class="sug-in"><h2 class="d chrome" style="margin:0 0 4px">Suggest a charity</h2>
      <p class="muted" style="margin:0 0 14px">Know a local charity, club or cause that deserves a boost? Tell us – we pick charities for future prizes from your suggestions.</p>
      <form id="sugF"><div class="sug-grid"><div><label>Your name</label><input id="sgN" maxlength="60" required value="${me ? esc(me.user.first + ' ' + me.user.last) : ''}" autocomplete="name"></div>
      <div><label>Your town</label><input id="sgT" maxlength="60" required list="sgTowns" value="${me ? esc(me.user.address.town) : ''}"><datalist id="sgTowns">${[...KENT].map(t => `<option value="${esc(t)}">`).join('')}</datalist></div></div>
      <label>Charity name</label><input id="sgC" maxlength="80" required placeholder="e.g. Sheppey Sea Cadets">
      <label>Why them? <span class="muted">(optional)</span></label><textarea id="sgR" maxlength="400" rows="3" placeholder="What they do and why they matter to you"></textarea>
      <button class="btn lg block ring-glow" style="margin-top:14px">Send suggestion</button><div class="err" id="sgE"></div></form>
      <div class="good hidden" id="sgOk" style="margin-top:12px">❤️ Thank you! We've got your suggestion.</div></div>`, 'sug-box', 70)}
      ${d.suggested && d.suggested.length ? `<div class="sug-top"><h3>Most suggested so far</h3>${d.suggested.map((x, i) => `<div><i>${i + 1}</i><b>${esc(x.name)}</b><em>${x.n} ${x.n === 1 ? 'vote' : 'votes'}</em></div>`).join('')}</div>` : ''}</div></section>
  </div>`;
  $('#sugF').onsubmit = async e => { e.preventDefault(); $('#sgE').textContent = ''; try { await api('/api/charity/suggest', { name: $('#sgN').value, town: $('#sgT').value, charity: $('#sgC').value, reason: $('#sgR').value }); $('#sugF').reset(); $('#sgOk').classList.remove('hidden'); } catch (er) { $('#sgE').textContent = er.message; } };
  // count up
  const el = $('#totNum'), target = d.total, dur = 2600, t0 = performance.now();
  const step = now => { if (!document.body.contains(el)) return; const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = '£' + Math.round(target / 100 * e).toLocaleString('en-GB'); if (k < 1) requestAnimationFrame(step); else el.textContent = gbp(target); };
  requestAnimationFrame(step);
}

// ---------- competition page ----------
async function viewComp(id) {
  clearInterval(tickTimer);
  $('#view').innerHTML = '<div class="wrap" style="padding-top:24px"><div class="skeleton"></div></div>';
  toTop();
  let d;
  try { d = await api('/api/comps/' + id); } catch (e) { $('#view').innerHTML = `<div class="wrap"><div class="empty" style="margin-top:30px">${esc(e.message)} <a href="#home">Back to home</a></div></div>`; return; }
  compCache[id] = d;
  if (d.instant) { d.instant.compId = id; d.instant.game = d.comp.iwGame; if (me && d.comp.iwGame && d.comp.iwGame !== 'none') { try { const P = await api('/api/me/plays'); const m = P.comps.find(x => x.compId === id); d.instant.myPlays = m ? m.tickets.length : 0; } catch { } } }
  const c = d.comp, free = c.type === 'free';
  setCrumbs([['Home', '#home'], ['Competitions', '#competitions'], [free ? 'Free draws' : c.category, free ? '#free' : '#competitions'], [c.title, '#comp-' + c.id]]); setNav('competitions');
  const avail = c.available ?? Infinity;
  const maxQ = Math.max(0, Math.min(avail, c.maxPerPerson ? c.maxPerPerson - d.mine : avail, c.unlimited ? 500 : Infinity));
  const inBasket = basket.find(x => x.compId === c.id)?.qty || 0;
  let qty = Math.max(1, Math.min(maxQ || 1, inBasket || (free ? 1 : hqDefault(c, maxQ || 1))));
  const prizes = c.prizes.length > 1 ? c.prizes : [];
  $('#view').innerHTML = `<div class="wrap">
    ${c.charityName && c.charityAmount ? `<a class="charity-top" href="#charity"><span class="ct-heart">❤️</span><span><b>${gbp(c.charityAmount)}</b> ${['soldout', 'drawing', 'drawn'].includes(c.status) ? 'is being donated to' : 'to be donated to'} <b>${esc(c.charityName)}</b> ${['soldout', 'drawing', 'drawn'].includes(c.status) ? '– thank you to everyone who entered' : c.unlimited ? 'when this competition closes' : 'when this competition has sold out'}</span></a>` : ''}
    ${d.instant && iwLine(d.instant.prizes) ? `<div class="iw-top">${iwLine(d.instant.prizes, { btn: true })}</div>` : ''}
    <h1 class="d cp-title chrome">${esc(c.title)}</h1>
    <div class="cp-grid">
      <div><div class="cp-img" style="${c.status === 'scheduled' ? '' : img(c.image)}">${c.status === 'scheduled' ? soonArt(c, true) : ''}${stamp(c, true)}${['live', 'scheduled'].includes(c.status) ? `<button class="cp-fav ${(me?.favs || []).includes(c.id) ? 'on' : ''}" data-fav="${c.id}" aria-label="Save to favourites">${(me?.favs || []).includes(c.id) ? '❤️' : '🤍'}<span>${(me?.favs || []).includes(c.id) ? 'Saved' : 'Save'}</span></button>` : ''}</div><div class="c-draw cp-community">Supporting our local community, one prize at a time</div>
</div>
      <div>
        <div class="panel">
          <div class="price-c"><b>${free ? 'FREE' : gbp2(c.price)}</b><span>${free ? (c.maxPerPerson ? `up to ${c.maxPerPerson} entries each` : 'to enter') : 'per entry'}</span>${c.cashAlt ? `<small>Cash alternative <b>${esc(c.cashAlt)}</b></small>` : ''}</div>
          ${c.unlimited ? `<div class="entries-big"><b>${c.sold.toLocaleString()}</b> entries so far</div>` : `<div class="pbar"><div class="pbar-top"><span><b>${Math.floor(c.pct)}%</b> sold</span><span>${c.sold.toLocaleString()} / ${c.totalTickets.toLocaleString()}</span></div>${blocks(c.pct)}<div class="pbar-sub">${c.available.toLocaleString()} tickets left</div></div>`}
          ${c.endsAt && !c.winners.length && c.status === 'live' ? cdHTML(c.endsAt, true) : ''}
          <div class="ending"><span class="dot"></span><span id="countdown">${c.winners.length ? (c.status === 'drawn' ? 'Draw complete' : 'Draw in progress') : c.endsAt ? (Date.parse(c.endsAt) > Date.now() ? 'Closes ' + fdt(c.endsAt) + (c.unlimited ? '' : ' or when it sells out') : 'Entries closed') : 'Drawn live the moment it sells out'}</span></div>
          ${c.eligibility === 'kent' ? '<div class="kent-note">📍 Open to Kent residents only</div>' : ''}
          ${c.appOnly ? '<div class="kent-note app-note">📱 App-exclusive competition – enter in the Sheppey Elite app</div>' : ''}
          ${c.prizePay === 'tickets' && c.prizeTickets ? `<div class="kent-note pay-note">🎫 Won as <b>${c.prizeTickets.qty} free ticket${c.prizeTickets.qty > 1 ? 's' : ''}</b> in <a href="#comp-${esc(c.prizeTickets.compId)}">${esc(c.prizeTickets.title)}</a> – entered straight into the winner’s account${c.gameMode && c.gameMode !== 'standard' ? ' the moment the game finishes' : ''}.</div>` : ''}
          ${c.prizePay === 'credit' || c.prizePay === 'cash' ? `<div class="kent-note pay-note">${c.prizePay === 'credit' ? '🎟️ Won as <b>credit</b> – paid straight into the winner’s credit balance to spend on any competition' : '💷 Won as <b>cash</b> – paid straight into the winner’s cash balance to withdraw'}${c.gameMode && c.gameMode !== 'standard' ? ' the moment the game finishes' : ''}.</div>` : ''}
          ${c.gameMode && c.gameMode !== 'standard' ? `<div class="kent-note game-note">${{ duck: `🦆 <b>Duck Race</b> – every ticket is a numbered duck. ${c.races > 1 ? `${c.races} races of up to 25 ducks (tickets split in order)` : 'Up to 25 ducks'} race around the Isle of Sheppey live when it sells out – first duck home wins.`, race: `🏁 <b>Race Around Sheppey</b> – every ticket is a numbered car. ${c.races > 1 ? `${c.races} races of up to 25 cars. ` : ''}They cross Kingsferry Bridge to start, then race laps of the island – first past the flag wins.`, hilo: `🃏 <b>Higher or Lower</b> – when it sells out ${c.hiloPlayers} player${c.hiloPlayers > 1 ? 's are' : ' is'} picked live at random. Call higher or lower to climb the prize ladder to <b>${gbp(c.hiloMax)}</b> – cash out any time, with safe levels on the way.`, banker: `💼 <b>Elite Banker</b> – when it sells out ${c.bankerPlayers} player${c.bankerPlayers > 1 ? 's are' : ' is'} picked live at random to play for up to <b>${gbp(c.bankerMax)}</b>. 22 boxes, the Banker calls with offers – deal or no deal?` }[c.gameMode]}</div>` : ''}
          <div id="cpResult">${c.winners.length ? drawResult(c) : ''}</div>
          <div class="tabs ${c.winners.length || c.auto || site.postalOn === false ? 'hidden' : ''}" id="cpTabs"><button data-cptab="online" class="on">${free ? 'Enter free' : 'Online entry'}</button>${site.postalOn === false ? '' : '<button data-cptab="postal">Free entry route</button>'}</div>
          <div id="tabOnline">${buyPanel(c, d, maxQ, qty, inBasket)}</div>
          ${site.postalOn === false ? '' : `<div id="tabPostal" class="hidden"><p class="muted" style="margin:0">${postalText()}</p></div>`}
        </div>
        <p class="notice">🏆 ${c.unlimited ? 'Open to everyone – drawn live on the end date.' : `This prize is won when the competition sells out${c.endsAt ? ' or at its end date' : ''}.`} ${free && c.maxPerPerson ? `Limit ${c.maxPerPerson} free ticket${c.maxPerPerson > 1 ? 's' : ''} per person.` : ''}</p>
      </div>
    </div>

    ${c.gameMode && c.gameMode !== 'standard' && ['soldout', 'ended', 'drawing', 'drawn'].includes(c.status) ? `<section style="padding-bottom:0" id="gameSec"><h2 class="d chrome">${c.gameMode === 'banker' ? '💼 Elite Banker – live' : c.gameMode === 'hilo' ? '🃏 Higher or Lower – live' : c.gameMode === 'duck' ? '🦆 The Duck Race' : '🏁 Race Around Sheppey'}</h2><div id="gameBox"></div></section>` : ''}
    <div id="cpWinners">${winnersList(c)}</div>
    ${d.instant && d.instant.prizes.length ? iwSection(d.instant) : ''}

    <section style="padding-bottom:0"><div class="cp-grid" style="align-items:start">
      <div><h2 class="d chrome" style="margin-top:0">About this prize</h2><div class="desc">${esc(c.description || 'More details coming soon.')}</div></div>
      ${prizes.length ? `<div><h2 class="d chrome" style="margin-top:0">${prizes.length} winners in this draw</h2><div class="prizelist">${prizes.map((p, i) => ({ p, i })).reverse().map(({ p, i }) => i === prizes.length - 1 ? `<div class="top-prize"><span><em>Top prize</em>${esc(p)}</span><small>drawn last</small></div>` : `<div><span>${esc(p)}</span><small>drawn ${ordinal(i + 1)}</small></div>`).join('')}</div></div>` : ''}
    </div></section>

    <section><div class="re-box">
      <div class="iw-head"><b>🎟️ Recent entries</b><small>${d.today ? `${d.today} order${d.today > 1 ? 's' : ''} in the last 24 hours` : `${d.entries.length.toLocaleString()} entr${d.entries.length === 1 ? 'y' : 'ies'}`}</small></div>
      ${(d.recent || []).length ? d.recent.slice(0, 5).map(r => `<div class="re"><span class="re-av">${esc((r.name || '?')[0])}</span><span class="re-who"><b>${esc(r.name)}</b> <small>${esc(r.town || '')}</small></span><span class="re-q"><b>${r.qty}</b> ticket${r.qty > 1 ? 's' : ''}<small>${timeAgo(r.at)}</small></span></div>`).join('') : '<div class="empty" style="margin:6px 0">No entries yet – be the first!</div>'}
      ${d.entries.length ? `<button class="btn ghost block re-all" id="entAll">View the full entry list (${d.entries.length.toLocaleString()}) ›</button>` : ''}
    </div>
    <div class="pf-wrap"><a class="pf-line ${c.proofs ? 'done' : ''}" href="#proof-${c.id}"><span class="pf-ic">🔐</span><b>Provably fair</b><span class="pf-sep"></span><em>${c.proofs ? `✅ Draw certificate${c.proofs > 1 ? ` · ${c.proofs} draws` : ''}` : 'How our draws work'}</em><span class="pf-go">›</span></a></div></section>
  </div>`;
  if ($('#entAll')) $('#entAll').onclick = () => openEntries(d.entries, c);
  if ($('[data-iwt]')) $('[data-iwt]').onclick = () => { const sec = $('#iwSec'); if (!sec) return; sec.classList.add('open'); sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $$('#iwSec [data-iwh]').forEach(b => b.onclick = () => b.closest('#iwSec').classList.toggle('open'));
  $$('#iwSec [data-iwp]').forEach(b => b.onclick = () => { const r = b.closest('.iwp'); r.classList.toggle('open'); b.setAttribute('aria-expanded', r.classList.contains('open')); });
  wireBuy(c, d, maxQ, qty);
  if ($('#gameBox')) watchGame(c);
  else if (['soldout', 'ended', 'drawing'].includes(c.status)) watchLms(c);
  tickCds();
}
let gameTimer = null, gameShows = {};
// one controller per game box: banker board or synced races – identical to what admin sees
function gameController(box, c, first, o = {}) {
  const ctl = { mode: c.gameMode, played: new Set(), show: null, raceEl: null };
  if (c.gameMode === 'banker') ctl.show = G.BankerShow(box, { mine: first.mine, stream: o.stream });
  else if (c.gameMode === 'hilo') ctl.show = G.HiloShow(box, { mine: first.mine, stream: o.stream });
  else box.innerHTML = '<div class="race-pick"></div><div class="race-el"></div>';
  ctl.feed = g => {
    if (!box.isConnected) return false;
    if (c.gameMode === 'banker') { ctl.show.update(g.banker); return true; }
    if (c.gameMode === 'hilo') { ctl.show.update(g.hilo); return true; }
    const offset = g.serverNow - Date.now(), races = g.races || [];
    const pick = box.querySelector('.race-pick'), el = box.querySelector('.race-el');
    const liveR = races.find(r => Date.parse(r.race.endAt) + 4000 > g.serverNow);
    if (!races.length) { if (!el.innerHTML) el.innerHTML = `<div class="gx-idle">${c.gameMode === 'duck' ? '🦆' : '🏁'} The ${c.gameMode === 'duck' ? 'ducks are' : 'cars are'} waiting at Kingsferry Bridge – the race starts live once it’s sold out.</div>`; return true; }
    if (liveR) {
      const key = liveR.race.startAt; if (ctl.current === key) return true; ctl.current = key; pick.innerHTML = '';
      G.runRace(el, liveR.race, liveR.ticket, { live: true, offset, mine: g.mine, fill: o.stream }).then(() => { ctl.current = null; ctl.drawPicker(g); });
      return true;
    }
    if (!ctl.current && !ctl.shown) { ctl.shown = true; ctl.drawPicker(g); }
    return true;
  };
  ctl.drawPicker = g => {
    const pick = box.querySelector('.race-pick'), el = box.querySelector('.race-el'), races = g.races || []; if (!pick) return;
    pick.innerHTML = races.map((r, i) => `<button class="pill-btn ${i === races.length - 1 ? 'on' : ''}" data-rr="${i}">▶ ${r.race.of > 1 ? 'Race ' + (r.race.index + 1) : 'Replay race'}</button>`).join('');
    const show = (i, replay) => { pick.querySelectorAll('[data-rr]').forEach(b => b.classList.toggle('on', +b.dataset.rr === i)); G.runRace(el, races[i].race, races[i].ticket, { instant: !replay, mine: g.mine, fill: o.stream }); };
    pick.onclick = e => { const b = e.target.closest('[data-rr]'); if (b) show(+b.dataset.rr, true); };
    show(races.length - 1, false);
  };
  ctl.busy = () => !!(ctl.show && ctl.show.busy) || !!ctl.current;
  return ctl;
}
// ---------- stream: every end-draw reveal, synced with the draw studio ----------
const METHOD_LABEL = { wheel: '🎡 Wheel spin', number: '🔢 Google random number', reel: '🎰 Name reveal', plinko: '🪂 Sheppey Drop', scratch: '🍀 Scratch card', lms: '☠️ Last Man Standing', race: '🏁 Race Around Sheppey', duck: '🦆 Duck race' };
function drawShow(box) {
  let dv = null, busy = false, wheel = null, reel = null, played = new Set(), first = true, lms = null, host, num, rev;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const build = () => {
    lms = null;
    box.innerHTML = `<div class="sd"><div class="sd-left"><div class="sd-host"></div><div class="sd-num hidden"></div></div>
      <div class="sd-right"><div class="sd-now"></div><div class="sd-list"></div></div><div class="sd-reveal"></div></div>`;
    host = box.querySelector('.sd-host'); num = box.querySelector('.sd-num'); rev = box.querySelector('.sd-reveal');
    window.dispatchEvent(new Event('resize'));
  };
  const idleView = () => {
    if (!dv) return;
    const m = dv.method;
    if (m === 'wheel') { wheel = DrawFX.Wheel(host); requestAnimationFrame(() => wheel.set(dv.pool.tickets, dv.pool.groups)); }
    else if (m === 'number' || m === 'reel') { reel = DrawFX.NameReel(host, dv.pool.tickets, dv.pool.groups); }
    else host.innerHTML = `<div class="sd-idle"><span>${(METHOD_LABEL[m] || '🎯').split(' ')[0]}</span><b>${esc((METHOD_LABEL[m] || '').replace(/^\S+\s/, ''))}</b><small>${dv.pool.tickets.length.toLocaleString()} tickets ready</small></div>`;
  };
  const panel = (activeIdx) => {
    if (lms || !box.querySelector('.sd-now')) return;
    const done = new Map(dv.winners.map(w => [w.prizeIndex, w])), n = dv.prizes.length;
    const nextI = activeIdx ?? (dv.winners.length + dv.pending.length);
    box.querySelector('.sd-now').innerHTML = nextI < n ? `<small>${busy ? '🎯 DRAWING NOW' : 'UP NEXT'}</small><b>${esc(dv.prizes[nextI])}</b><span>${dv.pool.tickets.length.toLocaleString()} tickets in the draw</span>` : `<small>DRAW COMPLETE</small><b>🏆 Every prize drawn</b><span>Congratulations to all our winners!</span>`;
    box.querySelector('.sd-list').innerHTML = dv.prizes.map((p, i) => ({ p, i })).reverse().map(({ p, i }) => { const w = done.get(i);
      return `<div class="${w ? 'won' : i === nextI ? 'next' : ''}"><span>${i === n - 1 && n > 1 ? '⭐ ' : ''}${esc(p)}</span>${w ? `<b>#${w.ticket} ${esc(w.name)}<small>${esc(w.town || '')}</small></b>` : `<em>${i === nextI ? (busy ? 'drawing…' : 'next') : ''}</em>`}</div>`; }).join('');
  };
  async function play(p, offset) {
    busy = true;
    const k = p.show.kind || p.method, start = Date.parse(p.show.startAt), now = () => Date.now() + offset, late = now() - start;
    if (k === 'race' && p.race) {
      box.innerHTML = '<div class="race-el" style="position:absolute;inset:0"></div>';
      await G.runRace(box.firstElementChild, p.race, p.ticket, { live: true, offset, fill: true });
      await sleep(5000); build(); busy = false; idleView(); panel(); return;
    }
    if (lms || !host) { build(); idleView(); }
    panel(p.prizeIndex);
    if (late < p.show.dur - 800) {
      if (late < 0) await sleep(-late);
      const remain = Math.max(1500, p.show.dur - Math.max(0, late));
      if (k === 'wheel') { if (!wheel) { wheel = DrawFX.Wheel(host); await sleep(50); } wheel.set(dv.pool.tickets, dv.pool.groups); await wheel.spinTo(p.ticket, remain); }
      else if (k === 'number') {
        num.classList.remove('hidden'); num.innerHTML = '<small>GOOGLE RANDOM NUMBER</small><div class="sd-slots"></div>';
        await DrawFX.revealNumber(num.querySelector('.sd-slots'), p.show.number || p.ticket, dv.pool.total);
        reel = DrawFX.NameReel(host, dv.pool.tickets, dv.pool.groups); await reel.spinTo(p.ticket, Math.max(2500, remain - 2500));
      }
      else if (k === 'reel') { reel = DrawFX.NameReel(host, dv.pool.tickets, dv.pool.groups); await reel.spinTo(p.ticket, remain); }
      else if (k === 'plinko') await G.plinkoDigits(host, p.show.number || p.ticket, p.show.digits || String(dv.pool.total).length, remain, p.show.seed || 1);
      else if (k === 'scratch') await G.scratchReveal(host, p, remain);
    }
    rev.innerHTML = `<div class="sd-card"><small>🏆 ${esc(p.prize)}</small><div class="sd-tk">Winning ticket #${p.ticket}</div><b>${esc(p.name)}</b><span>📍 ${esc(p.town || '')}</span></div>`;
    rev.classList.add('on'); G.Sound.fanfare(); G.confetti(box, 220);
    await sleep(8000);
    rev.classList.remove('on'); num.classList.add('hidden'); busy = false;
    if (dv) { const keep = dv; dv = { ...keep, pool: { ...keep.pool, tickets: keep.pool.tickets.filter(t => t[0] !== p.ticket) } }; host.innerHTML = ''; wheel = null; idleView(); dv = keep; panel(); }
  }
  build();
  return {
    busy: () => busy || !!(lms && lms.busy),
    feed(d) {
      if (!box.isConnected) return;
      const offset = d.serverNow - Date.now(); dv = d;
      if (first) { first = false; idleView(); for (const p of d.pending) if (Date.parse(p.show.startAt) + p.show.dur + 9000 < d.serverNow) played.add(p.show.startAt); }
      if (busy) return;
      const p = d.pending.find(x => !played.has(x.show.startAt));
      if (p) { played.add(p.show.startAt); play(p, offset); return; }
      if (d.lms && (d.lms.phase === 'running' || Date.now() - Date.parse((d.lms.events.slice(-1)[0] || {}).at || 0) < 60000)) {
        if (!lms) { box.innerHTML = ''; lms = G.LmsShow(box, { stream: true }); window.dispatchEvent(new Event('resize')); }
        lms.update(d.lms); return;
      }
      if (lms && !lms.busy) { build(); idleView(); }
      panel();
    }
  };
}
const LVL_ICON = { Bronze: '🥉', Silver: '🥈', Gold: '🥇', Platinum: '💎', Diamond: '💎', Elite: '👑' };
// ---------- LEADERBOARD ----------
let boardTimer = null;
const EARN = [
  ['spend', '💷', 'Every £1 you spend', r => `+${r.spend}`],
  ['comps', '🎟️', 'Every different competition you enter', r => `+${r.comp}`],
  ['early', '⚡', 'Enter a competition in its first 24 hours', r => `+${r.early}`],
  ['invites', '🤝', 'Every friend who registers with your link', r => `+${r.signup}`],
  ['friendSpend', '💪', 'When that friend spends £X or more', r => `+${r.friendSpend}`],
  ['daily', '📅', 'Log in each day', r => `+${r.daily}`],
  ['streak', '🔥', '7-day login streak', r => `+${r.streak}`],
  ['notify', '🔔', 'Turn on notifications (once)', r => `+${r.notify}`],
  ['idv', '🪪', 'Verify your ID (once)', r => `+${r.idv}`],
  ['wins', '🏆', 'Every prize you win', r => `+${r.win}`],
  ['bonus', '⭐', 'Bonus points from us', () => '']];
const ruleKey = { spend: 'spend', comps: 'comp', early: 'early', invites: 'signup', friendSpend: 'friendSpend', daily: 'daily', streak: 'streak', notify: 'notify', idv: 'idv', wins: 'win' };
async function viewBoard() {
  clearInterval(tickTimer); clearInterval(boardTimer); setCrumbs([['Home', '#home'], ['Leaderboard', '#leaderboard']]); setNav('leaderboard');
  let d; try { d = await api('/api/board'); } catch { d = { board: null }; }
  const B = d.board;
  if (!B) { $('#view').innerHTML = `<div class="wrap">${bigHead('THE', 'LEADERBOARD', 'clamp(34px,9vw,64px)')}<div class="empty">Our next leaderboard challenge is coming soon – turn on notifications to hear first.</div></div>`; return; }
  const live = B.status === 'live', R = B.rules || {}, pod = d.top.slice(0, 3), rest = d.top.slice(3), M = d.me;
  const boostOn = R.boostX > 1 && B.boostFrom && Date.parse(B.boostTo) > Date.now();
  const boostNow = boostOn && Date.parse(B.boostFrom) <= Date.now();
  const ways = EARN.filter(([k]) => k !== 'bonus' && R[ruleKey[k]] > 0).map(([k, ic, txt, v]) => `<div class="lb-way"><span>${ic}</span><p>${k === 'friendSpend' ? txt.replace('£X', gbp(R.friendMin || 0)) : txt}${(k === 'spend' || k === 'comps') && boostOn ? ` <em class="x2">×${R.boostX}</em>` : ''}</p><b>${v(R)}</b></div>`).join('');
  const todo = M && live && M.eligible && !M.excluded ? [
    !M.push && R.notify ? `<button class="lb-todo" data-notify>🔔 Turn on notifications <b>+${R.notify}</b></button>` : '',
    R.signup ? `<a class="lb-todo" href="#account-refer">🤝 Invite a friend <b>+${R.signup}</b></a>` : '',
    !M.idv && R.idv ? `<a class="lb-todo" href="#account-identity">🪪 Verify your ID <b>+${R.idv}</b></a>` : '',
    `<a class="lb-todo" href="#home">🎟️ Enter a competition <b>+${R.comp}${R.spend ? ' & ' + R.spend + '/£1' : ''}</b></a>`].filter(Boolean).join('') : '';
  $('#view').innerHTML = `<div class="wrap narrow">
    ${bigHead('THE', 'LEADERBOARD', 'clamp(34px,9vw,64px)')}
    ${segBox(`<div class="lb-prize"><small>${esc(B.title)}${B.eligibility === 'kent' ? ' · 📍 Kent residents only' : ''}</small><b>🏆 ${esc(B.prize)}</b><span>Top of the leaderboard ${live ? 'when it closes wins' : 'wins'} – points are added automatically as you play</span>
      ${live ? `<div class="lb-cd" data-end="${esc(B.endAt)}"></div>` : B.winner ? `<div class="good" style="margin-top:10px">🏆 Winner: <b>${esc(B.winner.name)}</b> (${esc(B.winner.town)}) with ${B.winner.points} points</div>` : '<div class="pay-note" style="margin-top:10px">Closed – winner announced soon</div>'}</div>`, 'lb-box', 81)}
    ${boostOn ? `<div class="lb-boost ${boostNow ? 'on' : ''}">⚡ <b>${R.boostX}× POINTS</b> on entries ${boostNow ? 'right now – until ' + fdt(B.boostTo) : 'from ' + fdt(B.boostFrom) + ' to ' + fdt(B.boostTo)}</div>` : ''}
    ${M ? `<div class="panel lb-me">${M.excluded ? '<div class="warn">You\'re taking a break, so you\'re off the leaderboard until it ends.</div>' : !M.eligible ? '<div class="warn">This leaderboard is for Kent residents only.</div>' : ''}
      <div class="stats2">${segBox(`<span class="sb-top">Your points</span><b class="sb-val g">${M.points}</b>`, 'stat2', 82)}${segBox(`<span class="sb-top">Rank</span><b class="sb-val rbt">${M.rank ? '#' + M.rank : '–'}</b>`, 'stat2', 83)}</div>
      ${M.gap ? `<p class="lb-gap">Just <b>${M.gap} points</b> to move up to #${M.rank - 1}${R.spend ? ` – that's about ${gbp(Math.ceil(M.gap / R.spend) * 100)} of entries` : ''}</p>` : M.rank === 1 ? '<p class="lb-gap">👑 You\'re top of the board – keep it up!</p>' : ''}
      ${Object.keys(M.parts || {}).filter(k => k !== 'total').length ? `<div class="lb-parts">${EARN.filter(([k]) => M.parts[k]).map(([k, ic]) => `<span>${ic} ${({ spend: 'Spending', comps: 'Competitions', early: 'Early entries', invites: 'Friends joined', friendSpend: 'Friends entered', daily: 'Daily logins', streak: 'Streaks', notify: 'Notifications', idv: 'ID verified', wins: 'Wins', bonus: 'Bonus' })[k]} <b>${M.parts[k]}</b></span>`).join('')}</div>` : ''}
      ${todo ? `<div class="lb-todos">${todo}</div>` : ''}</div>`
      : `<div class="panel" style="text-align:center;margin-top:14px"><p>Log in to see your points – they're added automatically.</p><button class="btn" data-auth="login">Log in</button></div>`}
    ${d.top.length ? `<div class="lb-pod">${[1, 0, 2].map(i => pod[i] ? `<div class="lp p${i + 1} ${pod[i].me ? 'me' : ''}"><span class="lp-medal">${['🥇', '🥈', '🥉'][i]}</span><b>${esc(pod[i].name)}</b><small>${esc(pod[i].town)}</small><em>${pod[i].points} pts</em></div>` : '').join('')}</div>
      <div class="lb-list">${rest.map((r, i) => `<div class="${r.me ? 'me' : ''}"><i>${i + 4}</i><b>${esc(r.name)}</b><small>${esc(r.town)}</small><em>${r.points}</em></div>`).join('')}</div>` : '<div class="empty">No points yet – be the first!</div>'}
    <h2 class="d sub-head">How to earn points</h2><div class="lb-ways">${ways}</div>
    <p class="muted" style="font-size:12px;text-align:center;margin-top:14px">${d.players} players on the board · points count from confirmed entries only · ties go to whoever reached the score first · free to take part – please play within your limits</p></div>`;
  toTop();
  const cd = $('.lb-cd'); if (cd) { const off = d.serverNow - Date.now(); const up = () => { if (!cd.isConnected) return clearInterval(boardTimer); const ms = Date.parse(cd.dataset.end) - Date.now() - off; if (ms <= 0) { cd.textContent = 'Closed'; return; } const dd = Math.floor(ms / 864e5), hh = Math.floor(ms / 36e5) % 24, mm = Math.floor(ms / 6e4) % 60, ss = Math.floor(ms / 1e3) % 60; cd.innerHTML = `${dd ? `<span><b>${dd}</b>d</span>` : ''}<span><b>${hh}</b>h</span><span><b>${String(mm).padStart(2, '0')}</b>m</span><span><b>${String(ss).padStart(2, '0')}</b>s</span>`; }; up(); boardTimer = setInterval(up, 1000); }
}

// ---------- FAQ / CONTACT / RESULTS / PLAYER PROTECTION ----------
const FAQ = () => [
  ['Entering', [
    ['How do I enter?', 'Pick a prize, choose how many tickets you want (or pick your own numbers where allowed), add them to your basket and check out. You’ll get your ticket numbers straight away – they’re confirmed as soon as your payment arrives.'],
    ['How do I pay?', `By bank transfer using the details and reference shown at checkout. Your tickets are held for ${site.reservationHours || 12} hours while you pay. You can also use any credit or cash balance in your account – if it covers the whole basket, your entries are confirmed instantly.`],
    ...(site.postalOn === false ? [] : [['Is there a free way to enter?', 'Yes – every paid competition has a free postal entry route. See <a href="#postal">Free postal entry</a> for the address and what to include. Postal entries have exactly the same chance of winning.']]),
    ['Is there a limit on how many tickets I can buy?', 'Each competition shows its own per-person limit. You can also set your own daily, weekly or monthly spending limit, or take a break, in <a href="#account-safe">Safe play</a>.'],
    ['What are bundles and promo codes?', 'Some prizes have “Buy X get Y free” offers – the free tickets are added automatically. Promo codes go in the 🏷️ Promo button in your basket.']]],
  ['Draws', [
    ['When is the draw?', 'When the competition sells out, or at its end date if it has one – whichever comes first. We draw live in our Facebook group and on the website.'],
    ['How do I know the draw is fair?', 'Every draw is provably fair: the entry list is locked and fingerprinted, and the winner comes from a public random number nobody can predict or control. Each competition has a <b>draw certificate</b> with a Verify button so you can check it yourself. <a href="#protection">How our draws work</a>.'],
    ['What are the live games?', 'Some prizes are won through live games – duck races, car races round Sheppey, Elite Banker, Higher or Lower and Last Man Standing. The players or winners are still picked by the same provable draw.'],
    ['Where can I see past results?', 'On the <a href="#results">Results</a> page, with every winner, ticket number and certificate.']]],
  ['Winning & withdrawals', [
    ['How will I know if I’ve won?', 'We announce winners live, email you and send an app notification. Your win also shows in My account → My wins.'],
    ['How do cash prizes and withdrawals work?', 'Cash prizes go into your cash balance. You can withdraw it to your bank once your ID is verified, or spend it on entries. Credit (cashback and rewards) can only be spent on entries.'],
    ['Why do you need my ID?', 'To make sure winners are over 18 and are who they say they are before we pay out. Your documents are stored encrypted and only viewed by us.']]],
  ['Your account', [
    ['What are levels and cashback?', 'Spend £100 in a month for Bronze (1% back), £200 for Silver (2%) or £300 for Gold (3%). Cashback is added to your credit at the start of the next month.'],
    ['How does the leaderboard work?', 'You earn points automatically for entries, inviting friends and logging in. The top player when it closes wins the prize. See <a href="#leaderboard">the leaderboard</a>.'],
    ['How do I close my account or take a break?', 'Go to <a href="#account-safe">Safe play</a> to set limits or take a break, or <a href="#contact">contact us</a> to close your account.']]]];
function viewFaq() {
  setCrumbs([['Home', '#home'], ['FAQ', '#faq']]); setNav(''); document.title = 'FAQ | Sheppey Elite Raffles';
  $('#view').innerHTML = `<div class="wrap narrow">${bigHead('YOUR', 'QUESTIONS', 'clamp(32px,8vw,56px)')}
    <input class="faq-search" id="faqQ" placeholder="🔍 Search the questions…" autocomplete="off">
    ${FAQ().map(([sec, qs]) => `<section class="faq-sec"><h2 class="d sub-head">${sec}</h2>${qs.map(([q, a]) => `<details class="faq"><summary>${q}</summary><div>${a}</div></details>`).join('')}</section>`).join('')}
    <div class="panel" style="text-align:center;margin-top:18px"><b>Still stuck?</b><p class="muted" style="margin:6px 0 12px">We usually reply the same day.</p><a class="btn" href="#contact">Contact us</a></div></div>`;
  $('#faqQ').oninput = e => { const q = e.target.value.toLowerCase().trim(); $$('.faq').forEach(d => { const hit = !q || d.textContent.toLowerCase().includes(q); d.style.display = hit ? '' : 'none'; if (q && hit) d.open = true; }); $$('.faq-sec').forEach(sc => sc.style.display = [...sc.querySelectorAll('.faq')].some(d => d.style.display !== 'none') ? '' : 'none'); };
}
function viewContact(complaint) {
  setCrumbs([['Home', '#home'], [complaint ? 'Make a complaint' : 'Contact us', complaint ? '#complaints' : '#contact']]); setNav(''); document.title = (complaint ? 'Complaints' : 'Contact us') + ' | Sheppey Elite Raffles';
  const u = me?.user;
  $('#view').innerHTML = `<div class="wrap narrow">${bigHead(complaint ? 'MAKE A' : 'GET IN', complaint ? 'COMPLAINT' : 'TOUCH', 'clamp(32px,8vw,56px)')}
    ${complaint ? `<p class="lead-c">We’re sorry something went wrong. Tell us what happened – you’ll get a reference straight away, a reply within <b>2 working days</b>, and we aim to resolve it within <b>14 days</b>.</p>` : `<div class="ct-ways">${site.facebookUrl ? `<a class="ct-way" href="${esc(site.facebookUrl)}" target="_blank" rel="noopener"><span>👥</span><b>Facebook group</b><small>${esc(site.facebookGroupName || 'Join us')}</small></a>` : ''}${site.contactEmail ? `<div class="ct-way"><span>✉️</span><b>Email</b><small>${esc(site.contactEmail)}</small></div>` : ''}<a class="ct-way" href="#faq"><span>❓</span><b>FAQ</b><small>Quick answers</small></a></div>`}
    <form class="panel ct-form" id="ctF">
      <div class="ct-grid"><div><label>Your name</label><input id="ctN" required maxlength="80" value="${u ? esc(u.first + ' ' + u.last) : ''}" autocomplete="name"></div>
      <div><label>Email</label><input id="ctE" type="email" required maxlength="120" value="${u ? esc(u.email) : ''}" autocomplete="email"></div>
      <div><label>Phone <span class="muted">(optional)</span></label><input id="ctP" maxlength="30" value="${u ? esc(u.phone || '') : ''}" autocomplete="tel"></div>
      <div><label>Order reference <span class="muted">(if it’s about an order)</span></label><input id="ctO" maxlength="20" placeholder="e.g. SER-AB12CD"></div></div>
      ${complaint ? '' : `<label>Subject</label><select id="ctS"><option>A question about a competition</option><option>Payments</option><option>My account</option><option>Winning & withdrawals</option><option>Something else</option></select>`}
      <label>${complaint ? 'What happened?' : 'Your message'}</label><textarea id="ctM" rows="6" required maxlength="3000"></textarea>
      <button class="btn lg block ring-glow" style="margin-top:14px">${complaint ? 'Send complaint' : 'Send message'}</button><div class="err" id="ctErr"></div></form>
    <div class="good hidden" id="ctOk" style="margin-top:14px"></div>
    <p class="muted" style="text-align:center;font-size:13px;margin-top:14px">${complaint ? '<a href="#contact">Just a question? Contact us instead</a>' : '<a href="#complaints">Need to make a formal complaint?</a>'} · <a href="#protection">Player protection</a></p></div>`;
  $('#ctF').onsubmit = async e => { e.preventDefault(); $('#ctErr').textContent = '';
    try { const r = await api('/api/contact', { kind: complaint ? 'complaint' : 'message', name: $('#ctN').value, email: $('#ctE').value, phone: $('#ctP').value, orderRef: $('#ctO').value, subject: complaint ? 'Complaint' : $('#ctS').value, message: $('#ctM').value });
      $('#ctF').classList.add('hidden'); $('#ctOk').classList.remove('hidden'); $('#ctOk').innerHTML = `✅ ${complaint ? 'Complaint' : 'Message'} sent – your reference is <b>${esc(r.ref)}</b>. We’ve emailed you a copy.`; toTop(); }
    catch (er) { $('#ctErr').textContent = er.message; } };
}
async function viewResults() {
  setCrumbs([['Home', '#home'], ['Results', '#results']]); setNav('winners'); document.title = 'Draw results | Sheppey Elite Raffles';
  $('#view').innerHTML = '<div class="wrap"><div class="empty">Loading…</div></div>';
  const d = await api('/api/results');
  const M = { wheel: '🎡 Wheel', number: '🔢 Number', reel: '🎰 Name reveal', plinko: '🪂 Sheppey Drop', scratch: '🍀 Scratch card', lms: '☠️ Last Man Standing', race: '🏁 Race', duck: '🦆 Duck race', game: '🎮 Live game', banker: '💼 Elite Banker', hilo: '🃏 Higher or Lower' };
  $('#view').innerHTML = `<div class="wrap">${bigHead('DRAW', 'RESULTS', 'clamp(32px,8vw,56px)')}<p class="sec-sub">Every finished draw, its winners and its provably fair certificate</p>
    <input class="faq-search" id="rsQ" placeholder="🔍 Search by prize, name or town…" style="max-width:520px;margin:0 auto 14px;display:block">
    <div class="rs-list">${d.list.map(r => `<div class="rs" data-txt="${esc((r.title + ' ' + r.winners.map(w => w.name + ' ' + w.town).join(' ')).toLowerCase())}">
      <a class="rs-img" href="#comp-${r.id}" style="${img(r.image)}"></a>
      <div class="rs-body"><a class="rs-title" href="#comp-${r.id}">${esc(r.title)}</a><small>${r.drawnAt ? fdt(r.drawnAt) : ''} · ${r.entries.toLocaleString()} entries</small>
        <div class="rs-wins">${r.winners.map(w => `<div><span>🏆 ${esc(w.prize)}</span><b>${esc(w.name)}</b><em>#${w.ticket} · ${esc(w.town || '')}${w.method && M[w.method] ? ' · ' + M[w.method] : ''}</em></div>`).join('')}</div>
        <div class="wc-links">${r.proofs ? `<a href="#proof-${r.id}">🔐 Draw certificate</a>` : ''}${r.video ? `<a href="${esc(r.video)}" target="_blank" rel="noopener">▶ Watch the draw</a>` : ''}</div></div></div>`).join('') || '<div class="empty">Results will appear here after our first draw.</div>'}</div></div>`;
  $('#rsQ').oninput = e => { const q = e.target.value.toLowerCase().trim(); $$('.rs').forEach(x => x.style.display = !q || x.dataset.txt.includes(q) ? '' : 'none'); };
}
function viewProtection() {
  setCrumbs([['Home', '#home'], ['Player protection', '#protection']]); setNav(''); document.title = 'Player protection & fair draws | Sheppey Elite Raffles';
  const items = [
    ['🔞', 'Over 18s only', 'Everyone confirms they’re 18 or over when they sign up, and we check photo ID before paying out any winnings.'],
    ...(site.postalOn === false ? [] : [['✉️', 'A genuine free entry route', 'Every paid competition can be entered free by post, with exactly the same chance of winning. <a href="#postal">How to enter free</a>.']]),
    ['🔐', 'Provably fair draws', 'Entry lists are locked and fingerprinted, and winners come from a public random number named before it exists. Every draw has a certificate you can verify on your own phone.'],
    ['🛡️', 'Spending limits & breaks', 'Set a daily, weekly or monthly spending limit, or take a break from 24 hours up to 5 years, in <a href="#account-safe">Safe play</a>. Lower limits work straight away; raising them waits 24 hours.'],
    ['🏦', 'No credit cards', 'Entries are paid by bank transfer, or from your own balance – never on credit.'],
    ['🏆', 'Fair prize awarding', 'Every prize is awarded – never cancelled for not selling enough. Competitions without an end date stay open until every ticket is sold, then they’re drawn live. Competitions with an end date are drawn on that date from the entries received, even if they haven’t sold out.'],
    ['📣', 'Clear rules', 'Each competition shows its price, ticket total, per-person limit, closing date and draw method before you buy, and our <a href="#terms">terms</a> are always one tap away.'],
    ['💬', 'Complaints', 'Tell us via our <a href="#complaints">complaints form</a>. You’ll get a reference straight away, a reply within 2 working days and a final answer within 14 days.']];
  $('#view').innerHTML = `<div class="wrap narrow">${bigHead('PLAYER', 'PROTECTION', 'clamp(32px,8vw,56px)')}
    <p class="lead-c">How we keep Sheppey Elite Raffles fair, safe and transparent.</p>
    ${site.dcmsCode ? `<div class="good" style="text-align:center;margin-bottom:14px">✅ We’ve signed up to the UK Government’s <b>Voluntary Code of Good Practice for Prize Draw Operators</b>.</div>` : ''}
    <div class="pp-grid">${items.map(([i, t, d]) => `<div class="pp"><span>${i}</span><b>${t}</b><p>${d}</p></div>`).join('')}</div>
    <div class="panel" style="margin-top:16px"><h3 style="margin:0 0 6px">Need support?</h3><p class="muted" style="margin:0">If gambling-style spending is becoming a problem for you or someone you know, free confidential help is available from <a href="https://www.gamcare.org.uk" target="_blank" rel="noopener">GamCare</a> (0808 8020 133, 24/7) and <a href="https://www.begambleaware.org" target="_blank" rel="noopener">BeGambleAware</a>.</p></div></div>`;
}

// ---------- DRAW CERTIFICATE (provable draws) ----------
const hexOf = buf => Array.from(new Uint8Array(buf), x => x.toString(16).padStart(2, '0')).join('');
const sha256 = async t => hexOf(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)));
const hmac256 = async (keyHex, msg) => { const k = await crypto.subtle.importKey('raw', new Uint8Array(keyHex.match(/../g).map(x => parseInt(x, 16))), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return hexOf(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg))); };
async function viewProof(id) {
  setCrumbs([['Home', '#home'], ['Draw certificate', '#proof-' + id]]); setNav('');
  $('#view').innerHTML = '<div class="wrap narrow"><div class="empty">Loading…</div></div>';
  let d; try { d = await api(`/api/comps/${id}/proof`); } catch (e) { $('#view').innerHTML = `<div class="wrap narrow"><div class="empty">${esc(e.message)}</div></div>`; return; }
  document.title = `Draw certificate – ${d.title} | Sheppey Elite Raffles`;
  const live = d.proofs.filter(x => !x.void), voided = d.proofs.filter(x => x.void);
  const src = x => x.kind === 'drand' ? `<div class="pf-kv"><span>Public random number</span><code>${esc(x.randomness)}</code><small>drand round <b>${x.round}</b> – named before it existed. <a href="${esc(d.drand.url + x.round)}" target="_blank" rel="noopener">Check it on drand ↗</a></small></div>`
    : x.kind === 'seed' ? `<div class="pf-kv"><span>Sealed random number</span><code>${esc(x.randomness)}</code><small>Made from our sealed seed (fingerprint published before the draw${d.seedAt ? ' on ' + fdt(d.seedAt) : ''}). ${d.seed ? 'The seed is now revealed below.' : 'The seed is revealed when every prize has been drawn.'}</small></div>`
    : `<div class="pf-kv"><span>How it was picked</span><b>${esc(x.note || 'Manual number')}</b><small>This draw used a number generated live on stream, so it can't be checked mathematically here – watch the recording.</small></div>`;
  const card = x => `<div class="pf ${x.void ? 'void' : ''}" data-pf="${x.n}">
    <div class="pf-head"><b>Draw ${x.n} · ${esc(x.label)}</b><small>${fdt(x.at)}</small></div>
    ${x.void ? `<div class="warn" style="margin:8px 0">❌ This draw was cancelled (${esc(x.voidWhy || 'undone')}) on ${fdt(x.voidAt)}. We show it anyway so nothing is hidden.</div>` : ''}
    <div class="pf-res">🏆 Ticket <b>#${x.ticket}</b> – ${esc(x.name)}</div>
    <div class="pf-kv"><span>Entries in this draw</span><b>${x.count.toLocaleString()}</b>${x.lines ? `<button class="linklike" data-pf-list="${x.n}">Show the locked list</button>` : ''}</div>
    ${x.fp ? `<div class="pf-kv"><span>Fingerprint of the locked list (SHA-256)</span><code>${esc(x.fp)}</code></div>` : ''}
    ${src(x)}
    ${x.mac ? `<div class="pf-kv"><span>Result</span><small>HMAC-SHA256(random number, fingerprint + ":${x.n}") ÷ ${x.count} → remainder <b>${x.idx}</b> → entry ${x.idx + 1} on the list = ticket <b>#${x.ticket}</b></small></div>` : ''}
    ${x.mac && x.lines ? `<button class="btn sm block pf-go" data-pf-verify="${x.n}">✅ Verify this draw</button><div class="pf-out" id="pfOut${x.n}"></div>` : ''}
    <pre class="pf-list hidden" id="pfList${x.n}"></pre></div>`;
  $('#view').innerHTML = `<div class="wrap narrow">
    ${bigHead('DRAW', 'CERTIFICATE', 'clamp(30px,8vw,56px)')}
    <p class="lead-c" style="margin-top:-6px"><a href="#comp-${d.id}">${esc(d.title)}</a></p>
    <div class="panel pf-how"><h3 style="margin:0 0 8px">How our draws are provably fair</h3>
      <ol><li>When a draw starts, the entry list is <b>locked</b> and we publish its fingerprint – changing a single entry would change it.</li>
      <li>The winner comes from a <b>public random number</b> from <a href="https://www.drand.love" target="_blank" rel="noopener">drand</a>, run by independent organisations. We name which number we'll use <b>before it exists</b>, so nobody – not even us – can know or choose the result.</li>
      <li>The winner = that number mixed with the fingerprint (HMAC-SHA256), divided by the number of entries – the remainder is the winning entry.</li>
      <li>The wheel, races and reveals then play out that result. Press <b>Verify</b> and your own phone re-does the maths.</li></ol>
      ${d.seedHash ? `<div class="pf-kv" style="margin-top:8px"><span>Backup sealed seed – fingerprint published${d.seedAt ? ' ' + fdt(d.seedAt) : ''}</span><code>${esc(d.seedHash)}</code>${d.seed ? `<small>Seed (revealed now the competition is finished):</small><code>${esc(d.seed)}</code>` : '<small>Only used if the public random number can\'t be reached. Revealed once every prize is drawn.</small>'}</div>` : ''}</div>
    ${live.length ? live.map(card).join('') : '<div class="empty" style="margin-top:16px">No draws yet – this page fills in live as each prize is drawn.</div>'}
    ${voided.length ? `<h2 class="d sub-head">Cancelled draws</h2>${voided.map(card).join('')}` : ''}
    ${d.winners.find(w => w.video) ? `<p style="text-align:center;margin-top:14px"><a class="btn ghost" href="${esc(d.winners.find(w => w.video).video)}" target="_blank" rel="noopener">▶ Watch the live draw</a></p>` : ''}
  </div>`;
  const byN = n => d.proofs.find(x => x.n === +n);
  $$('[data-pf-list]').forEach(b => b.onclick = () => { const x = byN(b.dataset.pfList), el = $('#pfList' + x.n); el.textContent = x.lines.map((l, i) => `${i + 1}. #${l.replace('|', '  ')}`).join('\n'); el.classList.toggle('hidden'); });
  $$('[data-pf-verify]').forEach(b => b.onclick = async () => {
    const x = byN(b.dataset.pfVerify), out = $('#pfOut' + x.n), row = (ok, t) => `<div class="${ok ? 'pf-ok' : 'pf-bad'}">${ok ? '✅' : '❌'} ${t}</div>`; out.innerHTML = '<div class="muted">Checking on your device…</div>';
    try {
      const r = []; const fp = await sha256(x.lines.join('\n')); r.push(row(fp === x.fp, `The locked list matches its fingerprint (${x.count.toLocaleString()} entries)`));
      if (x.kind === 'drand') { let got = null; try { const j = await (await fetch(d.drand.url + x.round)).json(); got = j.randomness; } catch { }
        r.push(got ? row(got === x.randomness, `drand round ${x.round} really is ${x.randomness.slice(0, 12)}… (fetched just now from drand)`) : `<div class="muted">ℹ️ Couldn't reach drand from here – use the "Check it on drand" link to compare round ${x.round} yourself.</div>`); }
      if (x.kind === 'seed' && d.seed) { r.push(row(await sha256(d.seed) === d.seedHash, 'The revealed seed matches the fingerprint published before the draw')); r.push(row(await hmac256(d.seed, 'draw:' + x.n) === x.randomness, 'The random number came from that seed')); }
      const mac = await hmac256(x.randomness, `${x.fp}:${x.n}`), idx = Number(BigInt('0x' + mac) % BigInt(x.count)), t = parseInt(x.lines[idx]);
      r.push(row(mac === x.mac && t === x.ticket, `The maths picks entry ${idx + 1} = ticket #${t}${t === x.ticket ? ' – the same winner ✔' : ' – does NOT match'}`));
      out.innerHTML = r.join('');
    } catch (e) { out.innerHTML = row(false, 'Your browser couldn\'t run the check: ' + esc(e.message)); }
  });
  toTop();
}

// ---------- STREAM SCREEN: full-screen 16:9 view for OBS / Facebook Live / a TV ----------
let streamTimer = null, streamClock = null;
function viewStream(id) {
  clearInterval(tickTimer); clearInterval(gameTimer); clearInterval(streamTimer); clearInterval(streamClock);
  document.body.classList.add('stream'); closeChat();
  G.Sound.forceOn();
  const host = (site.siteUrl || location.origin).replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  $('#view').innerHTML = `<div class="st-wrap"><div class="st-stage" id="stStage">
    <header class="st-head"><img src="logo-sm.jpg" alt=""><div class="st-brand"><b>SHEPPEY <i>ELITE</i> RAFFLES</b><span id="stTitle">Live games</span></div>
      <div class="st-live"><span class="rec"></span>LIVE</div><div class="st-clock" id="stClock"></div></header>
    <div class="st-body" id="stBody"></div>
    <footer class="st-foot"><span>Enter at <b>${esc(host)}</b></span><span id="stFoot">Every prize drawn live · Supporting our local community, one prize at a time</span></footer>
  </div><button class="st-sound hidden" id="stSound">🔊 Click once to turn the sound on</button></div>`;
  const stage = $('#stStage');
  let fit = () => { if (!stage.isConnected) return window.removeEventListener('resize', fit); const w = Math.min(innerWidth, innerHeight * 16 / 9), h = w * 9 / 16; stage.style.width = w + 'px'; stage.style.height = h + 'px'; stage.style.setProperty('--u', (w / 1920).toFixed(4)); stage.style.setProperty('--z', (w / 1600).toFixed(4)); };
  const fitBank = () => {
    for (const [sel, w, h] of [['.bk2-wrap.stream', 1600, 900], ['.st-draw .sd', 1600, 820]]) { const el = stage.querySelector(sel); if (!el) continue; const r = el.parentElement.getBoundingClientRect(); el.style.zoom = Math.min(r.width / w, r.height / h).toFixed(4); }
  };
  const fit0 = fit; fit = () => { fit0(); fitBank(); };
  fit(); window.addEventListener('resize', fit);
  const clk = () => { const c = $('#stClock'); if (!c) return clearInterval(streamClock); c.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }; clk(); streamClock = setInterval(clk, 10000);
  const snd = $('#stSound'); const chk = () => snd && snd.classList.toggle('hidden', G.Sound.unlocked()); setTimeout(chk, 800);
  snd.onclick = () => { G.Sound.unlock(); setTimeout(chk, 300); };
  document.addEventListener('pointerdown', () => { G.Sound.unlock(); setTimeout(chk, 300); }, { once: true });
  let curId = null, ctl = null;
  const body = () => $('#stBody');
  const idle = async () => {
    let d = { results: [] }; try { d = await api('/api/games'); } catch {}
    const next = comps.filter(c => c.gameMode && c.gameMode !== 'standard' && ['soldout', 'ended', 'live'].includes(c.status)).slice(0, 3);
    $('#stTitle').textContent = 'Live games';
    body().innerHTML = `<div class="st-idle"><div class="st-idle-l"><h2>🎮 NEXT UP</h2>${next.map(c => `<div class="st-next"><span style="${img(c.image)}"></span><div><b>${esc(c.title)}</b><small>${c.status === 'live' ? (c.unlimited ? c.sold + ' entries' : Math.floor(c.pct) + '% sold · ' + c.available + ' left') : 'Sold out – playing live soon'}</small></div></div>`).join('') || '<p>New games coming soon</p>'}</div>
      <div class="st-idle-r"><h2>🏆 LATEST WINNERS</h2>${d.results.slice(0, 5).map(r => `<div class="st-res"><b>${esc(r.name)}</b><small>${r.mode === 'banker' ? '💼' : r.mode === 'duck' ? '🦆' : '🏁'} #${r.ticket} · ${esc(r.town || '')}</small><em>${r.amount ? gbp2(r.amount) : '🏆'}</em></div>`).join('') || '<p>Winners appear here</p>'}</div></div>`;
  };
  let curKind = null;
  const show = (c, play) => {
    curId = c.id; curKind = 'game'; $('#stTitle').textContent = c.title;
    body().innerHTML = `<div class="st-game ${c.gameMode}"></div>`;
    ctl = gameController(body().querySelector('.st-game'), c, play, { stream: true }); ctl.feed(play); fit();
  };
  const openComp = async cid => {
    const dv = await api(`/api/comps/${cid}/drawview`);
    if (dv.method === 'game') { const g = await api(`/api/comps/${cid}/game`); show(dv.comp, g); return; }
    curId = cid; curKind = 'draw'; $('#stTitle').textContent = dv.comp.title;
    body().innerHTML = '<div class="st-draw"></div>'; ctl = drawShow(body().querySelector('.st-draw')); fit(); ctl.feed(dv);
  };
  const feedCur = async () => {
    if (curKind === 'draw') ctl.feed(await api(`/api/comps/${curId}/drawview`));
    else ctl.feed(await api(`/api/comps/${curId}/game`));
  };
  const busyNow = () => !!(ctl && ctl.busy && ctl.busy());
  const tick = async () => {
    if (!body()) { clearInterval(streamTimer); return; }
    try {
      let target = id || null;
      if (!target) target = (await api('/api/stage')).compId;
      if (target) {
        if (curId !== target && !busyNow()) await openComp(target);
        else if (curId) await feedCur();
        return;
      }
      if (curKind === 'draw' && busyNow()) { await feedCur(); return; }
      const d = await api('/api/games'); const l = d.live[0];
      if (l && l.id !== curId && !busyNow()) show(l, { ...l.play, serverNow: d.serverNow });
      else if (l && l.id === curId) ctl.feed({ ...l.play, serverNow: d.serverNow });
      else if (!l && curId !== '__idle' && !busyNow()) { curId = '__idle'; curKind = null; ctl = null; idle(); }
    } catch {}
  };
  tick(); streamTimer = setInterval(tick, 1000);
}
async function watchLms(c) {
  clearInterval(gameTimer);
  let show = null, k = 0;
  const tick = async () => {
    const dv = await api(`/api/comps/${c.id}/drawview`).catch(() => null); if (!dv) return;
    if (dv.lms && !show) { const panel = $('.cp-info') || $('#view .wrap'); if (!panel) return; panel.insertAdjacentHTML('afterend', '<div class="wrap"><section id="lmsSec" style="padding-bottom:0"><h2 class="d chrome">☠️ Last Man Standing – live</h2><div id="lmsBox"></div></section></div>'); show = G.LmsShow($('#lmsBox'), { mine: [] }); }
    if (show) show.update(dv.lms);
    if (++k % 3 === 0 && dv.winners.length !== c.winners.length && !(show && show.busy)) { const r = $('#cpResult'), w = $('#cpWinners'); c = dv.comp; if (r) r.innerHTML = drawResult(c); if (w) w.innerHTML = winnersList(c); }
  };
  tick(); gameTimer = setInterval(() => { if (!location.hash.startsWith('#comp-')) return clearInterval(gameTimer); tick(); }, 1500);
}
async function watchGame(c) {
  clearInterval(gameTimer);
  const box = $('#gameBox'); if (!box) return;
  const g = await api(`/api/comps/${c.id}/game`).catch(() => null); if (!g) return;
  const ctl = gameController(box, c, g); ctl.feed(g);
  let shown = c.winners.length, k = 0;
  gameTimer = setInterval(async () => { if (!box.isConnected) return clearInterval(gameTimer); try { ctl.feed(await api(`/api/comps/${c.id}/game`));
    if (++k % 3 === 0) { const d = await api('/api/comps/' + c.id); const nc = d.comp; if (nc.winners.length !== shown && !(ctl.busy && ctl.busy())) { shown = nc.winners.length; const r = $('#cpResult'), w = $('#cpWinners'); if (r) r.innerHTML = drawResult(nc); if (w) w.innerHTML = winnersList(nc); $('#cpTabs')?.classList.add('hidden'); $('#tabOnline')?.classList.add('hidden'); loadWinners(); } } } catch {} }, c.gameMode === 'banker' || c.gameMode === 'hilo' ? 1200 : 2500);
}
function winnersList(c) { return c.winners.length ? `<section style="padding-bottom:0"><h2 class="d chrome">Winners</h2><div class="prizelist">${c.winners.map(w => `<div><span>🏆 ${esc(w.prize)}</span><span>#${w.ticket} · ${esc(w.name)} <small>(${esc(w.town)})</small>${w.amount ? ` · <b style="color:#ffc400">${gbp2(w.amount)}</b>` : ''}</span></div>`).join('')}</div></section>` : ''; }
function drawResult(c) {
  const ws = c.winners.map((w, i) => ({ ...w, i })).reverse();
  const multi = (c.prizes || []).length > 1;
  const when = s => new Date(s).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `<div class="result"><div class="res-head">🏆 ${multi ? (c.status === 'drawn' ? 'Draw results' : `Draw in progress · ${c.winners.length} of ${c.prizes.length} drawn`) : 'Winner'}</div>
    ${ws.map((w, k) => `<div class="res ${k === 0 && c.status === 'drawn' ? 'top' : ''}">
      ${multi ? `<div class="res-prize">${esc(w.prize)}</div>` : ''}
      <div class="res-row"><div class="res-ticket"><small>Winning ${lbl(c).toLowerCase()}</small><b>#${w.ticket}</b></div>
      <div class="res-who"><b>${esc(w.name)}</b><span>📍 ${esc(w.town || '—')}</span></div></div>
      <div class="res-when">Drawn ${when(w.at)}</div></div>`).join('')}</div>`;
}
const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
const KENT = new Set((window.UK_TOWNS || {}).KENT || []);
function buyPanel(c, d, maxQ, qty, inBasket) {
  const free = c.type === 'free';
  if (c.iwFrozen && c.status === 'live') return `<div class="iw-frozen"><b>⚡ Instant wins open soon</b><small>Card payments are on their way – instant-win prizes go live with them.</small></div>`;
  if (c.auto) { const el = me && me.elite && me.elite.compId === c.id ? me.elite : null;
    return `<div class="elite-panel">${segBox(`<div class="ep-in"><span class="ep-crown">👑</span><b>Automatic entry</b><p>Make <b>any paid entry</b> this week (Monday–Sunday) and you're in – no need to do anything.</p>
      ${c.status !== 'live' ? '<div class="good">Entries for this week are closed – drawn live soon.</div>' : el ? (el.qualified ? '<div class="good">✅ <b>You\'re in this week\'s draw!</b> Good luck.</div>' : '<div class="warn">Not entered yet – enter any paid competition this week to qualify.</div><a class="btn block" href="#competitions" style="margin-top:10px">Find a competition</a>') : '<button class="btn block" data-auth="login">Log in to check if you\'re in</button>'}`, 'ep-box', 41)}</div>`; }
  if (c.appOnly && !IS_APP && c.status === 'live') return `<div class="app-only">${segBox(`<div class="ao-in"><img src="icon-192.png" alt=""><b>App-exclusive competition</b><p>This prize can only be entered in the Sheppey Elite app. It's free and takes a few seconds.</p><button class="btn lg block ring-glow" data-install>📲 Download the app</button></div>`, '', 40)}</div>`;
  if (c.eligibility === 'kent' && me && !KENT.has(me.user.address.town)) return `<div class="warn" style="text-align:center">📍 <b>Kent residents only.</b><br>This competition is only open to people living in Kent – your account town is <b>${esc(me.user.address.town)}</b>.</div>`;
  if (c.winners.length) return '';
  if (c.status === 'scheduled') return `<div class="soon-panel"><b>🚀 Launching ${fdt(c.goLiveAt)}</b><p class="muted" style="margin:0">Tap 🤍 Save and we'll tell you when it's live.</p></div>`;
  if (c.status !== 'live') return `<div class="good" style="text-align:center">${c.status === 'soldout' ? '🎉 <b>Sold out!</b> The live draw will happen soon – join our Facebook group to watch.' : c.status === 'ended' ? '<b>Entries are closed.</b> The draw will happen soon.' : '<b>This competition has been drawn.</b> See the winners below.'}</div>`;
  if (maxQ <= 0) return `<div class="warn" style="text-align:center">${d.mine ? `You've reached the limit of <b>${c.maxPerPerson}</b> entries for this competition. Good luck!` : 'All tickets are currently reserved – check back soon.'}</div>`;
  if (c.ticketMode === 'pick') {
    const quickP = autoChips(c, maxQ);
    return `<div class="pick-head"><b>Pick your lucky numbers</b><span id="pickCount">0 selected</span></div>
      ${quickP.length ? `<div class="quick">${quickP.map(n => `<button data-lucky="${n}" title="Lucky dip ${n}">${n}</button>`).join('')}</div><div class="notice" style="margin:-8px 0 12px">Tap a circle for a lucky dip, or pick numbers below</div>` : ''}
      <div class="pick-tools"><input id="pickFind" inputmode="numeric" placeholder="Jump to number…"><button class="btn ghost sm" data-clearpick>Clear</button></div>
      <div class="pick-pages" id="pickPages"></div>
      <div class="pick-grid" id="pickGrid"></div>
      <div class="legend" style="justify-content:center;margin-top:10px"><span><i class="lg-dot"></i>Available</span><span><i class="lg-dot taken"></i>Taken</span><span><i class="lg-dot mine"></i>Your picks</span></div>
      <div class="totalrow"><span class="muted" style="font-weight:700">${free ? 'Cost' : 'Total'}</span><b id="qTot">${free ? 'FREE' : gbp2(0)}</b></div><div id="odds"></div>
      <button class="btn lg block" id="buyBtn" disabled>Pick at least one number</button>
      ${d.mine ? `<p class="notice">You already have ${d.mine} entr${d.mine > 1 ? 'ies' : 'y'} in this competition.</p>` : ''}`;
  }
  const quick = autoChips(c, maxQ);
  return `
    ${quick.length > 1 ? `<div class="quick">${quick.map(n => `<button data-q="${n}" class="${n === qty ? 'on' : ''}">${n}</button>`).join('')}</div>` : ''}
    <input type="range" id="qRange" min="1" max="${maxQ}" value="${qty}" aria-label="Number of tickets">
    <div class="stepper"><button data-step="-1" aria-label="One less">−</button><div class="qty"><b id="qVal">${qty}</b><small>ticket${qty > 1 ? 's' : ''}</small></div><button data-step="1" aria-label="One more">+</button></div>
    ${(c.bundles || []).length ? `<div class="bundles">${c.bundles.map(x => `<button data-q="${Math.min(x.buy, maxQ)}" ${x.buy > maxQ ? 'disabled' : ''}>Buy ${x.buy} <em>+${x.free} free</em></button>`).join('')}</div><div class="qbonus hidden" id="qBonus"></div><div class="qnext" id="qNext"></div>` : ''}
    <div class="totalrow"><span class="muted" style="font-weight:700">${free ? 'Cost' : 'Total'}</span><b id="qTot">${free ? 'FREE' : gbp2(qty * c.price)}</b></div>
    <div id="odds"></div>
    <button class="btn lg block ${free ? 'blue' : ''}" id="buyBtn">${free ? 'Claim free entries' : inBasket ? 'Update basket' : 'Add to basket'}</button>
    ${d.mine ? `<p class="notice">You already have ${d.mine} entr${d.mine > 1 ? 'ies' : 'y'} in this competition.</p>` : ''}
    ${free ? '<p class="notice">Free entries are added to your account straight away.</p>' : ''}`;
}
function wirePick(c, d, maxQ) {
  const taken = new Set(d.entries.map(e => e.t));
  const prev = basket.find(x => x.compId === c.id);
  const picks = new Set((prev?.tickets || []).filter(t => !taken.has(t)));
  const PAGE = 100, pages = Math.ceil(c.totalTickets / PAGE);
  let page = picks.size ? Math.floor((Math.min(...picks) - 1) / PAGE) : 0;
  const free = c.type === 'free';
  const upd = () => {
    const n = picks.size;
    $('#pickCount').textContent = `${n} selected${maxQ < 1e9 ? ' · max ' + maxQ : ''}`;
    $('#qTot').textContent = free ? 'FREE' : gbp2(n * c.price);
    const od = $('#odds'); if (od) od.innerHTML = n ? oddsHTML(c, d.mine, n + bonusFor(c, n, d.mine)) : '';
    const b = $('#buyBtn'); b.disabled = !n;
    b.textContent = !n ? 'Pick at least one number' : free ? `Claim ${n} free entr${n > 1 ? 'ies' : 'y'}` : `Add ${n} ticket${n > 1 ? 's' : ''} to basket`;
    $$('.quick button').forEach(x => x.classList.remove('on'));
  };
  const drawPages = () => { $('#pickPages').innerHTML = pages > 1 ? Array.from({ length: pages }, (_, i) => `<button data-pg="${i}" class="${i === page ? 'on' : ''}">${i * PAGE + 1}–${Math.min(c.totalTickets, (i + 1) * PAGE)}</button>`).join('') : ''; const on = $('#pickPages .on'), box = $('#pickPages'); if (on) box.scrollLeft = on.offsetLeft - box.clientWidth / 2 + on.clientWidth / 2; };
  const drawGrid = () => {
    const start = page * PAGE + 1, end = Math.min(c.totalTickets, start + PAGE - 1), out = [];
    for (let t = start; t <= end; t++) out.push(`<button data-t="${t}" class="${taken.has(t) ? 'taken' : picks.has(t) ? 'mine' : ''}" ${taken.has(t) ? 'disabled' : ''}>${t}</button>`);
    $('#pickGrid').innerHTML = out.join('');
  };
  drawPages(); drawGrid(); upd();
  $('#tabOnline').onclick = e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.pg) { page = +t.dataset.pg; drawPages(); drawGrid(); }
    if (t.dataset.t) { const n = +t.dataset.t; if (picks.has(n)) picks.delete(n); else { if (picks.size >= maxQ) return toast(`You can pick up to ${maxQ}`, true); picks.add(n); } t.classList.toggle('mine', picks.has(n)); upd(); }
    if (t.dataset.lucky) {
      const want = Math.min(+t.dataset.lucky, maxQ); picks.clear();
      const pool = []; for (let n = 1; n <= c.totalTickets; n++) if (!taken.has(n)) pool.push(n);
      const rnd = new Uint32Array(want); crypto.getRandomValues(rnd);
      for (let i = 0; i < want && pool.length; i++) { const j = rnd[i] % pool.length; picks.add(pool[j]); pool[j] = pool[pool.length - 1]; pool.pop(); }
      page = Math.floor((Math.min(...picks) - 1) / PAGE); drawPages(); drawGrid(); upd(); t.classList.add('on');
      toast(`Lucky dip: #${[...picks].sort((a, b) => a - b).slice(0, 8).join(', #')}${picks.size > 8 ? '…' : ''}`);
    }
    if (t.hasAttribute('data-clearpick')) { picks.clear(); drawGrid(); upd(); }
  };
  $('#pickFind').oninput = e => { const n = parseInt(e.target.value, 10); if (n >= 1 && n <= c.totalTickets) { page = Math.floor((n - 1) / PAGE); drawPages(); drawGrid(); const el = $(`#pickGrid [data-t="${n}"]`); if (el) el.classList.add('flash'); } };
  $('#buyBtn').onclick = async () => {
    const tickets = [...picks].sort((a, b) => a - b);
    if (free) {
      const go = async () => { $('#buyBtn').disabled = true; try { const r2 = await api('/api/checkout', { items: [{ compId: c.id, qty: tickets.length, tickets }], useCredit, useCash }); lastCheckout = r2; await loadMe(); location.hash = 'checkout'; } catch (e) { toast(e.message, true); $('#buyBtn').disabled = false; if (e.data?.taken) viewComp(c.id); } };
      if (!me) { pendingAction = go; return authDialog('register', 'Register to claim your free entries'); }
      return go();
    }
    addToBasket(c.id, tickets.length, tickets); toast(`${tickets.length} ticket${tickets.length > 1 ? 's' : ''} in your basket`); openDrawer('basket');
  };
}
// ---------- odds & bundles ----------
function bonusFor(c, qty, mine) { let b = 0; for (const x of c.bundles || []) if (qty >= x.buy) b = Math.max(b, Math.floor(qty / x.buy) * x.free);
  if (b && c.maxPerPerson) b = Math.min(b, c.maxPerPerson - (mine || 0) - qty); if (b && c.available != null) b = Math.min(b, c.available - qty); return Math.max(0, b); }
function chanceOf(c, m, adding) {
  const k = Math.max(1, (c.prizes || []).length || 1), T = c.unlimited ? Math.max(1, c.sold + (adding || 0)) : c.totalTickets;
  if (m <= 0) return 0; if (m >= T - k + 1) return 1;
  let lose = 1; for (let i = 0; i < k; i++) lose *= (T - m - i) / (T - i); return 1 - lose;
}
function oddsHTML(c, have, adding) {
  if (c.status !== 'live') return have ? oddsLine(c, have, 0, true) : '';
  return oddsLine(c, have + adding, adding, false, have);
}
function oddsLine(c, m, adding, closed, have) {
  const p = chanceOf(c, m, adding); if (!p) return '';
  const k = Math.max(1, (c.prizes || []).length || 1), oneIn = p >= 1 ? 1 : Math.max(1, Math.round(1 / p));
  const pct = p * 100 < 0.1 ? (p * 100).toFixed(2) : p * 100 < 10 ? (p * 100).toFixed(1) : Math.round(p * 100);
  const pb = have && adding ? chanceOf(c, have, 0) : 0;
  return `<div class="odds"><div class="od-top"><span>🎯 ${closed ? 'Your chance' : adding && have ? `Your ${m} tickets` : `${m} ticket${m > 1 ? 's' : ''}`}</span><b>${p >= 1 ? 'Guaranteed!' : `1 in ${oneIn.toLocaleString()}`}</b></div>
    <div class="od-bar"><i style="width:${Math.max(1.5, Math.min(100, p * 100))}%"></i></div>
    <small>${pct}% chance of winning${k > 1 ? ` one of the ${k} prizes` : ''}${c.unlimited ? ' if the draw was now (more entries lower the odds)' : closed ? '' : ' once it sells out'}${pb ? ` · up from 1 in ${Math.round(1 / pb).toLocaleString()}` : ''}</small></div>`;
}
function wireBuy(c, d, maxQ, qty) {
  if (c.ticketMode === 'pick') return $('#pickGrid') && wirePick(c, d, maxQ);
  const r = $('#qRange'); if (!r) return;
  const set = v => {
    qty = Math.max(1, Math.min(maxQ, v | 0)); r.value = qty;
    r.style.setProperty('--fill', (maxQ > 1 ? (qty - 1) / (maxQ - 1) * 100 : 100) + '%');
    $('#qVal').textContent = qty; $('#qVal').nextElementSibling.textContent = qty > 1 ? 'tickets' : 'ticket';
    $('#qTot').textContent = c.type === 'free' ? 'FREE' : gbp2(qty * c.price);
    const bn = bonusFor(c, qty, d.mine); const bx = $('#qBonus'); if (bx) { bx.innerHTML = bn ? `🎁 +${bn} FREE ticket${bn > 1 ? 's' : ''} – you get <b>${qty + bn}</b>` : ''; bx.classList.toggle('hidden', !bn); }
    const nb = (c.bundles || []).find(x => qty < x.buy); const nx = $('#qNext'); if (nx) nx.innerHTML = nb && nb.buy - qty <= Math.max(3, nb.buy / 2) && nb.buy <= maxQ ? `Add <b>${nb.buy - qty}</b> more to get <b>${nb.free} free</b>` : '';
    const od = $('#odds'); if (od) od.innerHTML = oddsHTML(c, d.mine, qty + bn);
    $$('.quick button').forEach(b => b.classList.toggle('on', +b.dataset.q === qty));
  };
  set(qty);
  r.oninput = () => set(+r.value);
  $('#tabOnline').onclick = e => { const t = e.target.closest('button'); if (!t) return; if (t.dataset.q) set(+t.dataset.q); if (t.dataset.step) set(qty + +t.dataset.step); };
  $('#buyBtn').onclick = async () => {
    if (c.type === 'free') {
      const go = async () => {
        $('#buyBtn').disabled = true;
        try { const r2 = await api('/api/checkout', { items: [{ compId: c.id, qty }], useCredit, useCash }); lastCheckout = r2; await loadMe(); location.hash = 'checkout'; }
        catch (e) { toast(e.message, true); $('#buyBtn').disabled = false; if (e.data?.appOnly) installDialog('This competition is app-exclusive. Download the app to enter it.'); if (e.data?.excluded || e.data?.limit) location.hash = 'account-safe'; }
      };
      if (!me) { pendingAction = go; return authDialog('register', 'Register to claim your free entries'); }
      return go();
    }
    addToBasket(c.id, qty); toast(`${qty} ticket${qty > 1 ? 's' : ''} in your basket`); openDrawer('basket');
    $('#buyBtn').textContent = 'Update basket';
  };
}
function openEntries(entries, c) {
  const m = document.createElement('div'); m.className = 'ent-modal'; m.innerHTML = `<div class="ent-card" role="dialog" aria-label="Entry list"><div class="ent-hd"><div><b>Entry list</b><small>${esc(c.title)}</small></div><button class="x" data-x aria-label="Close">×</button></div>
    <div class="legend"><span class="st pending">Pending payment</span><span class="st confirmed">Confirmed</span><span>${entries.length.toLocaleString()} entries</span></div><div id="entriesBox"></div></div>`;
  document.body.appendChild(m); document.body.classList.add('noscroll');
  const close = () => { m.remove(); document.body.classList.remove('noscroll'); window.removeEventListener('hashchange', close); };
  m.onclick = e => { if (e.target === m || e.target.closest('[data-x]')) close(); }; window.addEventListener('hashchange', close);
  renderEntries(entries, c, true);
}
function renderEntries(entries, c, noTicker) {
  const box = $('#entriesBox'); if (!box) return;
  if (!entries.length) { box.innerHTML = '<div class="empty">No entries yet – be the first!</div>'; return; }
  const recent = entries.slice().sort((a, b) => b.at.localeCompare(a.at)).slice(0, 24);
  const chip = e => `<span class="tk ${e.status}"><span class="no">#${e.t}</span>${esc(e.name)} · ${esc(e.town)}</span>`;
  const sorted = entries.slice().sort((a, b) => a.t - b.t);
  const racer = ['duck', 'race'].includes(c.gameMode) ? { ic: c.gameMode === 'duck' ? '🦆' : '🏎️', word: c.gameMode === 'duck' ? 'duck' : 'car', n: c.races || 1, per: Math.ceil(c.totalTickets / (c.races || 1)) } : null;
  let q = '', limit = 200;
  box.innerHTML = `${noTicker ? '' : `<div class="ticker"><div class="track" style="--dur:${Math.max(20, recent.length * 3)}s">${recent.map(chip).join('')}${recent.map(chip).join('')}</div></div>`}
    <input id="entSearch" placeholder="Search name, town or ticket number" style="margin-bottom:10px">
    ${racer ? `<p class="race-key">${racer.ic} Your ticket number is your ${racer.word} number in the race${racer.n > 1 ? ` – ${racer.per} ${racer.word}s per race: race 1 is ${racer.word}s 1–${racer.per}, race 2 is ${racer.per + 1}–${Math.min(c.totalTickets, racer.per * 2)}${racer.n > 2 ? ' and so on' : ''}` : ''}.</p>` : ''}
    <div class="entries-wrap"><table class="entries"><thead><tr><th>${lbl(c)}</th>${racer && racer.n > 1 ? '<th>Race</th>' : ''}<th>Name</th><th>Town</th><th>Status</th></tr></thead><tbody id="entBody"></tbody></table></div>
    <div style="text-align:center;margin-top:10px"><button class="btn ghost sm hidden" id="entMore">Show more</button></div>`;
  const draw = () => {
    const ql = q.toLowerCase();
    const list = ql ? sorted.filter(e => String(e.t) === ql.replace('#', '') || e.name.toLowerCase().includes(ql) || e.town.toLowerCase().includes(ql)) : sorted;
    $('#entBody').innerHTML = list.slice(0, limit).map(e => `<tr><td class="num">${racer ? `<span class="rn">${racer.ic} <b>${e.t}</b></span>` : '#' + e.t}</td>${racer && racer.n > 1 ? `<td class="num"><span class="rr">Race ${Math.floor((e.t - 1) / racer.per) + 1}</span></td>` : ''}<td>${esc(e.name)}</td><td>${esc(e.town)}</td><td><span class="st ${e.status}" title="${e.status === 'confirmed' ? 'Confirmed' : 'Pending'}"><span class="lbl">${e.status === 'confirmed' ? 'Confirmed' : 'Pending'}</span></span></td></tr>`).join('') || `<tr><td colspan="${racer && racer.n > 1 ? 5 : 4}" class="muted">No matching entries.</td></tr>`;
    $('#entMore').classList.toggle('hidden', list.length <= limit);
  };
  draw();
  $('#entSearch').oninput = e => { q = e.target.value.trim(); limit = 200; draw(); };
  $('#entMore').onclick = () => { limit += 300; draw(); };
}

// ---------- basket & checkout ----------
// shared bits for account / basket / checkout
const bigHead = (a, b, size) => `<h1 class="d win-big page-head" style="${size ? 'font-size:' + size : ''}"><span class="chrome">${a}</span><span class="rb">${b}</span></h1>`;
const compImg = id => (comps.find(c => c.id === id) || {}).image || '';
const segBox = (inner, cls, k) => `<div class="segbox ${cls || ''}"><svg class="tseg" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="sg${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff1f3d"/><stop offset=".5" stop-color="#9b3fe0"/><stop offset="1" stop-color="#1f5bff"/></linearGradient><mask id="sm${k}"><rect class="tmask" x="2" y="2" rx="16" pathLength="100" style="animation-delay:${k * -1.1}s"/></mask></defs><rect class="tbase" x="2" y="2" rx="16" pathLength="100"/><rect class="ton" x="2" y="2" rx="16" pathLength="100" stroke="url(#sg${k})" mask="url(#sm${k})"/></svg>${inner}</div>`;
const statusLbl = { pending: 'Pending', confirmed: 'Confirmed', expired: 'Expired', cancelled: 'Cancelled' };

let useCredit = (() => { try { return localStorage.getItem('ser_usecr') !== '0'; } catch { return true; } })();
let useCash = (() => { try { return localStorage.getItem('ser_usecash') !== '0'; } catch { return true; } })();
let promoCode = (() => { try { return localStorage.getItem('ser_promo') || ''; } catch { return ''; } })(), promoQ = null, promoErr = '';
async function quotePromo(rows) {
  promoErr = ''; promoQ = null; if (!promoCode || !me || !rows.length) return;
  try { promoQ = await api('/api/checkout', { items: rows.map(({ b }) => ({ compId: b.compId, qty: b.qty, tickets: b.tickets })), promo: promoCode, quote: true }); }
  catch (e) { promoErr = e.message; }
}
async function renderBasket(requote = true) {
  const rows = basket.map(b => ({ b, c: comps.find(x => x.id === b.compId) })).filter(x => x.c);
  if (requote && promoCode) { await quotePromo(rows.filter(r => r.c.type === 'paid')); }
  const total = rows.reduce((a, x) => a + x.b.qty * x.c.price, 0), crd = me?.wallet?.credit || 0;
  const bonusOf = ({ b, c }) => c.type === 'paid' ? bonusFor(c, b.qty, 0) : 0;
  const count = rows.reduce((a, x) => a + x.b.qty + bonusOf(x), 0);
  const csh = me?.wallet?.balance || 0, disc = promoQ ? promoQ.discount : 0, afterDisc = total - disc, crUse = useCredit ? Math.min(crd, afterDisc) : 0, cashUse = useCash ? Math.min(csh, afterDisc - crUse) : 0, due0 = afterDisc - crUse - cashUse, iwB = rows.some(r => (r.c.instant || []).length), bPct = iwB ? 0 : Math.max(0, Number(site.bankDiscount) || 0), bankOff = bPct && due0 > 0 ? Math.round(due0 * bPct / 100) : 0, due = due0 - bankOff;
  // upgrades
  const ups = [];
  if (me && total > 0) {
    const LV = me.level; if (LV && LV.next) { const need = LV.next.need; if (due >= need) ups.push(`<div class="up gold">${LVL_ICON[LV.next.name] || '⭐'} This basket takes you to <b>${esc(LV.next.name)}</b> – ${LV.next.pct}% back on everything this month</div>`); else if (need - due <= 1500) ups.push(`<div class="up">${LVL_ICON[LV.next.name] || '⭐'} Just <b>${gbp2(need - due)}</b> more this month to reach ${esc(LV.next.name)} (${LV.next.pct}% back)</div>`); }
    if (BOARD && BOARD.rules) { const R = BOARD.rules, MC = me.myComps || {}; const pts = Math.floor(afterDisc * R.spend / 100) + rows.filter(r => !MC[r.c.id]).length * R.comp; if (pts > 0) ups.push(`<div class="up">🏅 Earns about <b>+${pts}</b> leaderboard points</div>`); }
  }
  for (const r of rows) { const nb = (r.c.bundles || []).find(x => r.b.qty < x.buy); if (nb && !r.b.tickets && nb.buy - r.b.qty <= 3) ups.push(`<div class="up">🎁 Add <b>${nb.buy - r.b.qty}</b> more to ${esc(r.c.title)} to get <b>${nb.free} free</b> <button class="pill-btn sm" data-bqset="${r.c.id}" data-n="${nb.buy}">Add</button></div>`); }
  const inB = new Set(rows.map(r => r.c.id));
  // quick-add row: up to 10 live prizes not in the basket – almost sold out and ending soon first
  const score = c => (!c.unlimited && c.pct >= 75 ? 3000 + c.pct : 0) + (c.endsAt && Date.parse(c.endsAt) > Date.now() ? 2000 - Math.min(1999, (Date.parse(c.endsAt) - Date.now()) / 36e5) : 0) + (c.featured ? 500 : 0) + (c.pct || 0);
  const sugg = comps.filter(c => c.status === 'live' && c.type === 'paid' && !c.auto && !c.iwFrozen && !inB.has(c.id) && !(c.appOnly && !IS_APP) && !(c.ticketMode === 'pick'))
    .sort((a, b) => score(b) - score(a)).slice(0, 10);
  const qa = sugg.length ? `<div class="qa"><div class="qa-head"><b>⚡ Quick add</b><small>choose how many, then add</small></div><div class="qa-row">${sugg.map(c => { const end = c.endsAt && Date.parse(c.endsAt) > Date.now() && Date.parse(c.endsAt) - Date.now() < 3 * 864e5, room = c.maxPerPerson || 1e9;
      const mx = Math.min(hqMax(c) || 1, 1000), d0 = hqDefault(c, mx);
      return `<div class="qa-t" title="${esc(c.title)}" data-qa="${c.id}" data-max="${mx}" data-def="${d0}"><a class="qa-img" href="#comp-${c.id}" style="${img(c.image)}" aria-label="${esc(c.title)}"><span class="qa-price">${gbp(c.price)}</span>${!c.unlimited && c.pct >= 75 ? `<span class="qa-tag hot">${Math.floor(c.pct)}%</span>` : end ? '<span class="qa-tag">⏰</span>' : ''}</a>
        <span class="qa-step"><button data-qs="-1" aria-label="Fewer">−</button><b>${d0}</b><button data-qs="1" aria-label="More">+</button></span><button class="qa-add" data-qadd aria-label="Add to basket">${ICON.cart}<span>Add</span></button></div>`; }).join('')}</div></div>` : '';
  const promoOn = !!(promoCode && promoQ);
  $('#basket').innerHTML = `<header><div class="dh"><span class="chrome">YOUR</span> <span class="rb">BASKET</span></div>${total > 0 ? `<button class="promo-pill ${promoOn ? 'on' : promoErr ? 'bad' : ''}" id="promoPill" aria-expanded="false">🏷️ ${promoOn ? esc(promoCode) + ' ✓' : 'Promo'}</button>` : ''}<button class="x" data-close-drawer>×</button></header>
    ${total > 0 ? `<div class="promo-drop ${promoErr && !promoOn ? 'open' : ''}" id="promoDrop"><form class="promo" id="promoF"><input id="promoIn" placeholder="Enter code" value="${esc(promoCode)}" autocapitalize="characters" maxlength="20"><button class="btn sm">${promoOn ? 'Update' : 'Apply'}</button></form>
      ${promoErr ? `<div class="promo-err">${esc(promoErr)} <button class="linklike" data-promo-clear>Remove</button></div>` : ''}${promoCode && !me ? '<div class="promo-err">Log in to use your code.</div>' : ''}${promoOn ? `<div class="promo-ok">✓ ${esc(promoQ.promo.label)} – saving ${gbp2(disc)} <button class="linklike" data-promo-clear>Remove</button></div>` : ''}</div>` : ''}
    <div class="inner">${rows.length ? rows.map(r => { const { b, c } = r, bn = bonusOf(r); return `<div class="bx">
      <a class="bx-img" href="#comp-${c.id}" style="${img(c.image)}"></a>
      <div class="bx-body"><a class="bx-title" href="#comp-${c.id}">${esc(c.title)}</a><div class="bx-sub">${gbp2(c.price)} per entry${c.status !== 'live' ? ' · <b style="color:var(--red2)">no longer available</b>' : ''}</div>
        ${bn ? `<div class="bx-bonus">🎁 +${bn} FREE ticket${bn > 1 ? 's' : ''}</div>` : ''}
        ${b.tickets ? `<div class="tix confirmed bx-tix">${b.tickets.map(t => `<span>#${t}</span>`).join('')}</div>` : ''}
        <div class="bx-row">${b.tickets ? `<a class="pill-btn" href="#comp-${c.id}">Change numbers</a>` : `<div class="qpill"><button data-bq="${c.id}" data-d="-1" aria-label="One less">−</button><b>${b.qty}</b><button data-bq="${c.id}" data-d="1" aria-label="One more">+</button></div>`}
          <b class="bx-amt">${gbp2(b.qty * c.price)}</b></div>
        <button class="bx-rm" data-brm="${c.id}" aria-label="Remove">Remove</button></div></div>`; }).join('')
      + (ups.length ? `<div class="ups">${ups.join('')}</div>` : '')

      : `<div class="bx-empty"><div class="be-ico">${ICON.cart}</div><b>Your basket is empty</b><p>Pick a prize and your tickets will appear here.</p><a class="btn" href="#competitions">Browse competitions</a></div>${qa}`}</div>
    ${rows.length ? `<footer>${qa}
      <div class="bx-sum"><div class="bx-sum-l"><span>${count} ticket${count > 1 ? 's' : ''} · ${gbp2(total)}</span>${disc ? `<span class="g">🏷️ −${gbp2(disc)}</span>` : ''}${bankOff ? `<span class="g bk">🏦 ${bPct}% off −${gbp2(bankOff)}</span>` : ''}${site.jackpot && site.jackpot.pct && Math.floor((due + cashUse) * site.jackpot.pct / 100) > 0 ? `<span class="jp-add">💰 +${gbp2(Math.floor((due + cashUse) * site.jackpot.pct / 100))} to the jackpot</span>` : ''}${(crd > 0 || csh > 0) && afterDisc > 0 ? `<div class="bal-chips">${crd > 0 ? `<label class="cr-chip ${useCredit ? 'on' : ''}"><input type="checkbox" id="useCr" ${useCredit ? 'checked' : ''}><i></i>Credit <b>${useCredit ? '−' + gbp2(crUse) : gbp2(crd)}</b></label>` : ''}${csh > 0 ? `<label class="cr-chip cash ${useCash ? 'on' : ''}"><input type="checkbox" id="useCash" ${useCash ? 'checked' : ''}><i></i>Cash <b>${useCash ? '−' + gbp2(cashUse) : gbp2(csh)}</b></label>` : ''}</div>` : ''}</div>
        <div class="bx-sum-r"><small>${disc || crUse || cashUse || bankOff ? 'To pay' : 'Total'}</small><b>${gbp2(due)}</b></div></div>
      <button class="btn lg block ring-glow" id="checkoutBtn">${total > 0 && due === 0 ? 'Confirm entries' : 'Checkout'}</button><p class="bx-note">${total > 0 && due === 0 ? '🎟️ Nothing to pay – entries are confirmed straight away.' : (iwB ? `💳 <b>Card payment</b> – your basket has instant wins, so you'll pay by card and can play straight away once it's confirmed.` : (bankOff ? `🏦 <b>${bPct}% off for paying by bank transfer.</b> We don’t pay card fees on bank transfers, so we pass that saving back to you – that’s why your amount isn’t a round number. It also means more prizes and more donated to local charitable causes ❤️` : '🏦 Pay by bank transfer – you\'ll get our details and your own reference next.'))}</p></footer>` : ''}`;
  const uc = $('#useCr'); if (uc) uc.onchange = () => { useCredit = uc.checked; try { localStorage.setItem('ser_usecr', useCredit ? '1' : '0'); } catch { } renderBasket(false); };
  const uh = $('#useCash'); if (uh) uh.onchange = () => { useCash = uh.checked; try { localStorage.setItem('ser_usecash', useCash ? '1' : '0'); } catch { } renderBasket(false); };
  const pp = $('#promoPill'); if (pp) pp.onclick = () => { const d = $('#promoDrop'); d.classList.toggle('open'); pp.setAttribute('aria-expanded', d.classList.contains('open')); if (d.classList.contains('open')) setTimeout(() => $('#promoIn').focus(), 50); };
  $$('.qa-t').forEach(t => { const out = t.querySelector('.qa-step b'), mx = +t.dataset.max || 50, steps = [...new Set([...HQ_STEPS.filter(n => n <= mx), +t.dataset.def])].sort((a, z) => a - z); let i = Math.max(0, steps.indexOf(+t.dataset.def));
    t.querySelectorAll('[data-qs]').forEach(b => b.onclick = () => { i = Math.max(0, Math.min(steps.length - 1, i + +b.dataset.qs)); out.textContent = steps[i]; });
    t.querySelector('[data-qadd]').onclick = () => { const id = t.dataset.qa, n = steps[i] || 1, sc = $('.qa-row') ? $('.qa-row').scrollLeft : 0, cur = basket.find(y => y.compId === id);
      addToBasket(id, (cur && !cur.tickets ? cur.qty : 0) + n); renderBasket().then(() => { const r = $('.qa-row'); if (r) r.scrollLeft = sc; }); toast(`${n} added to your basket ✓`); }; });
  const pf = $('#promoF'); if (pf) pf.onsubmit = e => { e.preventDefault(); promoCode = $('#promoIn').value.trim().toUpperCase(); try { localStorage.setItem('ser_promo', promoCode); } catch { } if (!me && promoCode) { closeDrawers(); pendingAction = () => openDrawer('basket'); return authDialog('login', 'Log in to use your promo code'); } renderBasket(); };
  $$('[data-promo-clear]').forEach(x => x.onclick = () => { promoCode = ''; promoQ = null; promoErr = ''; try { localStorage.removeItem('ser_promo'); } catch { } renderBasket(false); });
  $$('[data-addone]').forEach(x => x.onclick = () => { const sc = $('.qa-row') ? $('.qa-row').scrollLeft : 0; const cur = basket.find(y => y.compId === x.dataset.addone); addToBasket(x.dataset.addone, (cur && !cur.tickets ? cur.qty : 0) + (+x.dataset.n || 1)); renderBasket().then(() => { const r = $('.qa-row'); if (r) r.scrollLeft = sc; }); toast(`+${x.dataset.n || 1} added ✓`); });
  $$('[data-bqset]').forEach(x => x.onclick = () => { const it = basket.find(y => y.compId === x.dataset.bqset); if (it) { it.qty = +x.dataset.n; saveBasket(); } renderBasket(); });
  const cb = $('#checkoutBtn'); if (cb) cb.onclick = checkout;
}
let BOARD = null; (async () => { try { const d = await api('/api/board'); if (d.board && d.board.status === 'live') BOARD = d.board; } catch { } })();
async function checkout() {
  if (!me) { closeDrawers(); pendingAction = checkout; return authDialog('register', 'Register or log in to check out'); }
  const btn = $('#checkoutBtn'); if (btn) btn.disabled = true;
  try {
    const r = await api('/api/checkout', { items: basket.map(b => ({ compId: b.compId, qty: b.qty, tickets: b.tickets })), useCredit, useCash, promo: promoCode || undefined });
    basket = []; saveBasket(); promoCode = ''; promoQ = null; try { localStorage.removeItem('ser_promo'); } catch { } lastCheckout = r; closeDrawers(); await loadMe(); location.hash = 'checkout';
  } catch (e) {
    toast(e.message, true); if (btn) btn.disabled = false;
    if (e.data?.appOnly) { closeDrawers(); installDialog('This competition is app-exclusive. Download the app to enter it.'); }
    if (e.data?.excluded || e.data?.limit) { closeDrawers(); location.hash = 'account-safe'; }
    if (e.data?.taken) { const b = basket.find(x => x.compId === e.data.compId); if (b && b.tickets) { b.tickets = b.tickets.filter(t => !e.data.taken.includes(t)); b.qty = b.tickets.length; if (!b.qty) basket = basket.filter(x => x !== b); saveBasket(); } }
    if (e.data?.promo) { promoErr = e.message; renderBasket(false); }
    if (e.data?.compId) { await loadComps(); renderBasket(); }
  }
}
function itemCards(items, status) {
  return items.map(i => `<div class="oc ${status}"><a class="oc-img" href="#comp-${i.compId}" style="${img(compImg(i.compId))}"></a><div class="oc-body"><a class="oc-title" href="#comp-${i.compId}">${esc(i.title)}</a><div class="oc-sub">${i.qty} ticket${i.qty > 1 ? 's' : ''}${i.unit ? ' · ' + gbp2(i.amount) : ' · free'}</div><div class="tix ${status}">${i.tickets.map(t => `<span>#${t}</span>`).join('')}</div></div></div>`).join('');
}
function bankPanel(bank, ref, total) {
  const row = (k, v, copy) => `<div class="bp-row"><span>${k}</span><b>${esc(v || '—')}</b>${copy && v ? `<button class="copy" data-copy="${esc(v)}">Copy</button>` : '<i></i>'}</div>`;
  return `<div class="bankpanel"><div class="bp-amt"><small>Amount to pay</small><b>${gbp2(total)}</b></div>
    ${row('Account name', bank.accountName, true)}${row('Sort code', bank.sortCode, true)}${row('Account number', bank.accountNumber, true)}${bank.bankName ? row('Bank', bank.bankName) : ''}
    <div class="bp-ref"><small>Your payment reference – use exactly this</small><b>${esc(ref)}</b><button class="btn sm" data-copy="${esc(ref)}">Copy reference</button></div></div>`;
}
function viewCheckout() {
  setCrumbs([['Home', '#home'], ['Checkout', '#checkout']]); setNav('');
  const r = lastCheckout;
  if (!r) { location.hash = 'account-tickets'; return; }
  const p = r.pending, f = r.free, pc = r.paidByCredit;
  $('#view').innerHTML = `<div class="wrap narrow">
    ${p ? `${bigHead('NEARLY THERE,', esc(me.user.first.toUpperCase()) + '!', 'clamp(28px,7vw,52px)')}
      ${p.cardOnly ? `<p class="lead-c">Your tickets are reserved for <b>30 minutes</b>. Pay by card and your instant wins are ready to play the moment the payment's confirmed.</p>${payTimer(p.expiresAt, true)}
      <div class="card-pay"><div class="cp-in"><span>💳</span><b>${gbp2(p.due)}</b><small>to pay by card</small><button class="btn lg block ring-glow" data-card="${p.id}">Pay by card</button><em>Secure card payment by DNA Payments</em></div></div>
      <h2 class="d sub-head">Your reserved tickets</h2>${itemCards(p.items, 'pending')}` : `
      <p class="lead-c">Your tickets are reserved and <span class="st pending">Pending</span>. Send the payment by bank transfer and <b>make sure you use the reference below</b> so we can match it.</p>
      ${payTimer(p.expiresAt, true)}
      ${site.strikes ? `<p class="strk-note">⚠️ Please pay before the timer runs out – unpaid orders get a strike, and ${site.strikes.limit} strikes means a ${site.strikes.pause} pause from entering.</p>` : ''}
      ${p.bankDisc ? `<div class="bank-save"><span>🏦</span><div><b>You’ve saved ${gbp2(p.bankDisc)} by paying by bank transfer</b><small>We don’t pay card fees on bank transfers, so we pass that saving back to you – and it means more prizes and more donated to local charitable causes ❤️ That’s why your amount is <b>${gbp2(p.due)}</b> – please send that exact amount.</small></div></div>` : ''}
      ${p.credit || p.cash ? `<div class="good">${[p.credit ? `🎟️ ${gbp2(p.credit)} credit` : '', p.cash ? `💷 ${gbp2(p.cash)} cash` : ''].filter(Boolean).join(' + ')} used – just ${gbp2(p.due)} left to pay.</div>` : ''}
      ${bankPanel(p.bank, p.ref, p.due)}
      <div class="steps3"><div><b>1</b>Open your banking app</div><div><b>2</b>Pay ${gbp2(p.due)} using reference <b class="rb">${esc(p.ref)}</b></div><div><b>3</b>We confirm it and your entries turn <b style="color:var(--green)">green</b></div></div>
      ${payTimer(p.expiresAt)}
      ${site.cardPayments ? `<button class="btn lg block ghost" data-card="${p.id}" style="margin-top:12px">💳 Pay by card instead</button>` : ''}
      <div class="hold">We've emailed you these details</div>
      <h2 class="d sub-head">Your reserved tickets</h2>${itemCards(p.items, 'pending')}`}` : ''}
    ${pc ? `${bigHead('PAID FROM YOUR', 'BALANCE! 🎉', 'clamp(28px,7vw,52px)')}<p class="lead-c">${[pc.credit ? gbp2(pc.credit) + ' credit' : '', pc.cash ? gbp2(pc.cash) + ' cash' : ''].filter(Boolean).join(' and ')} used and your entries are <span class="st confirmed">Confirmed</span> – good luck!</p>${itemCards(pc.items, 'confirmed')}` : ''}
    ${f ? `${p || pc ? '<h2 class="d sub-head">Free entries confirmed 🎉</h2>' : bigHead('YOU\'RE', 'IN! 🎉', 'clamp(30px,8vw,58px)') + '<p class="lead-c">Your free entries are confirmed – good luck!</p>'}${itemCards(f.items, 'confirmed')}` : ''}
    <div class="cta-row"><a class="btn lg" href="#account-tickets">View my tickets</a><a class="btn lg ghost" href="#competitions">Enter more</a></div>
    ${site.facebookUrl ? `<div class="fb" style="margin-top:26px"><div class="fbi">${ICON.fb}</div><div><h3 class="d">Watch the live draw</h3><p>Join our ${esc(site.facebookGroupName)} and invite your friends.</p></div><a class="btn white" href="${esc(site.facebookUrl)}" target="_blank" rel="noopener">Join</a></div>` : ''}
  </div>`;
  toTop();
  startPayTimers();
}
function payTimer(at, big) { return `<div class="paytimer ${big ? 'big' : ''}" data-until="${esc(at)}"><span class="pt-clock">⏱ <b>--:--:--</b></span><span>Please pay for your entries now to avoid them being resold</span></div>`; }
let payTick = null;
function startPayTimers() {
  clearInterval(payTick);
  const upd = () => { const els = $$('[data-until]'); if (!els.length) return clearInterval(payTick);
    for (const el of els) { const ms = Date.parse(el.dataset.until) - Date.now(); const b = el.querySelector('b');
      if (ms <= 0) { b.textContent = 'Expired'; el.classList.add('late'); continue; }
      const hh = Math.floor(ms / 36e5), mm = Math.floor(ms / 6e4) % 60, ss = Math.floor(ms / 1e3) % 60;
      b.textContent = `${hh}h ${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`; el.classList.toggle('urgent', ms < 2 * 36e5); } };
  upd(); payTick = setInterval(upd, 1000);
}
// card payment didn't go through: tickets go straight back on sale, customer can try again
async function viewPayFail(ref) {
  setCrumbs([['Home', '#home'], ['Payment unsuccessful', '#home']]); setNav(''); toTop();
  let r = null; try { r = await api('/api/pay/failed', { ref }); } catch { }
  if (r && r.status === 'confirmed') { location.hash = 'paid-' + ref; return; }
  $('#view').innerHTML = `<div class="wrap narrow">${bigHead('PAYMENT', 'UNSUCCESSFUL', 'clamp(28px,7vw,48px)')}
    <div class="payfail"><span class="pf-x">✕</span><b>Your card payment didn't go through</b>
      <p>${r && r.released ? `Nothing has been taken, and the tickets from order <b>${esc(ref)}</b> have gone back on sale.${me && (me.wallet?.balance || me.wallet?.credit) ? ' Any credit or cash you used has been returned to your account.' : ''}` : r && !r.cardOnly ? `Your tickets are still reserved – you can pay by bank transfer instead, or try your card again from My tickets.` : 'Nothing has been taken.'}</p>
      ${r && r.released && r.items && r.items.length ? '<button class="btn lg block ring-glow" id="pfRetry">Try again</button>' : ''}<a class="btn lg block ghost" href="#account-tickets" style="margin-top:8px">My tickets</a></div></div>`;
  if ($('#pfRetry')) $('#pfRetry').onclick = () => { r.items.forEach(i => addToBasket(i.compId, i.qty)); openDrawer('basket'); };
  loadMe().catch(() => { });
}
// demo only – stands in for DNA's hosted card page
function demoCard(r) {
  const box = document.createElement('div'); box.className = 'ent-modal'; box.innerHTML = `<div class="ent-card democard"><div class="ent-hd"><div><b>💳 Card payment</b><small>Demo – no real card is charged</small></div><button class="x" data-x aria-label="Close">×</button></div>
    <div class="dc-amt">${gbp2(r.amount)}</div><div class="dc-card"><span>4242 4242 4242 4242</span><span>12/29 · 123</span></div>
    <button class="btn lg block ring-glow" id="dcPay">Pay ${gbp2(r.amount)}</button><button class="btn ghost block" id="dcFail" style="margin-top:8px">Simulate a declined card</button></div>`;
  document.body.appendChild(box); const close = () => box.remove(); box.onclick = e => { if (e.target === box || e.target.closest('[data-x]')) close(); };
  $('#dcPay').onclick = async () => { $('#dcPay').disabled = true; $('#dcPay').textContent = 'Processing…'; await new Promise(x => setTimeout(x, 900));
    await api('/api/pay/dna/callback', { invoiceId: r.ref, success: true, id: 'demo-' + Date.now(), amount: r.amount / 100 }); close(); location.hash = 'paid-' + r.ref; };
  $('#dcFail').onclick = async () => { $('#dcFail').disabled = true; await api('/api/pay/dna/callback', { invoiceId: r.ref, success: false, errorCode: 3010, id: 'demo-' + Date.now(), amount: r.amount / 100, message: 'Declined' }); close(); location.hash = 'payfail-' + r.ref; };
}
async function payByCard(orderId) {
  try {
    const r = await api('/api/pay/card', { orderId });
    if (r.demo) return demoCard(r);
    await new Promise((res, rej) => { if (window.DNAPayments) return res(); const sc = document.createElement('script'); sc.src = r.script; sc.onload = res; sc.onerror = rej; document.head.appendChild(sc); });
    window.DNAPayments.openPaymentPage(r.paymentData);
  } catch (e) { toast(e.message || 'Card payment couldn\u2019t start', true); }
}

// ---------- account ----------
async function viewAccount(tab) {
  clearInterval(tickTimer);
  if (!me) { await loadMe(); }
  if (!me) { location.hash = 'home'; pendingAction = () => { location.hash = 'account-' + tab; }; return authDialog('login', 'Log in to see your account'); }
  await loadMe();
  const TABS0 = [['tickets', 'My tickets', '🎟️'], ['wins', 'My wins', '🏆'], ['withdraw', 'Cash & credit', '💷'], ['payouts', 'My payouts', '🏦'], ['identity', 'My identity', '🪪'], ['level', 'My level', '🥇'], ['badges', 'Badges', '🎖️'], ['favs', 'Favourites', '❤️'], ['safe', 'Safe play', '🛡️'], ['refer', 'Refer a friend', '🤝'], ['details', 'My details', '👤']];
  const TABS = TABS0.filter(t => t[0] !== 'level' || me.level);
  if (!TABS.some(t => t[0] === tab)) tab = 'tickets';
  setCrumbs([['Home', '#home'], ['My account', '#account'], [TABS.find(t => t[0] === tab)[1], '#account-' + tab]]); setNav('');
  const u = me.user, os = me.orders, W = me.wallet || { balance: 0, ledger: [] }, SF = me.safe || { limits: {} }, ID = me.identity || { status: 'none' };
  const cnt = st => os.filter(o => o.status === st).reduce((a, o) => a + o.items.reduce((x, i) => x + i.qty, 0), 0);
  const stat = (k, top, val, cls) => segBox(`<span class="sb-top">${top}</span><b class="sb-val ${cls || ''}">${val}</b>`, 'stat2', k);
  const idBadge = { none: '<span class="st">Not uploaded</span>', pending: '<span class="st pending">Checking</span>', verified: '<span class="st confirmed">Verified</span>', rejected: '<span class="st bad">Not accepted</span>' }[ID.status];
  let body = '';
  if (tab === 'tickets') {
    const pend = os.filter(o => o.status === 'pending'), SK = me.strikes;
    var strikeBox = SK && (SK.banUntil || SK.n) ? `<div class="strk ${SK.banUntil ? 'ban' : ''}"><b>${SK.banUntil ? `⛔ Entries paused until ${fd(SK.banUntil)}` : `⚠️ ${SK.n} of ${SK.limit} strikes`}</b><div class="strk-dots">${Array.from({ length: SK.limit }, (_, i) => `<i class="${SK.banUntil || i < SK.n ? 'on' : ''}"></i>`).join('')}</div><small>${SK.banUntil ? `${SK.limit} orders weren't paid in time. You can enter again on ${fd(SK.banUntil)}.` : `An order that isn't paid before its time runs out gets a strike. ${SK.limit} strikes = a ${SK.pause} pause. Strikes clear after ${SK.days} days.`}</small></div>` : '';
    // group every ticket by competition
    const byComp = new Map();
    for (const o of os) { if (o.status === 'expired') continue; for (const i of o.items) { const g = byComp.get(i.compId) || { compId: i.compId, title: i.title, tickets: [], last: o.createdAt }; for (const t of i.tickets) g.tickets.push({ t, st: o.status }); if (o.createdAt > g.last) g.last = o.createdAt; byComp.set(i.compId, g); } }
    const MC = me.myComps || {}, info = id => comps.find(x => x.id === id) || (MC[id] ? { ...MC[id], id } : null);
    const isDone = id => { const c = info(id); return !!c && c.status === 'drawn'; };
    const groups0 = [...byComp.values()].sort((a, b) => b.last.localeCompare(a.last));
    const groups = [...groups0.filter(g => !isDone(g.compId)), ...groups0.filter(g => isDone(g.compId))];
    const firstDone = groups.findIndex(g => isDone(g.compId));
    body = (strikeBox || "") + (pend.length ? `<h2 class="d sub-head" style="margin-top:0">Waiting for payment</h2>` + pend.map(o => `<div class="ord pending">
        <div class="ord-head"><div><span class="ord-ref">${esc(o.ref)}</span><span class="ord-date">${fdt(o.createdAt)}</span></div><span class="st pending">Pending</span></div>
        ${payTimer(o.expiresAt)}
        ${itemCards(o.items, 'pending')}
        <div class="ord-foot"><span>Bank transfer${o.credit ? ` · ${gbp2(o.credit)} credit used` : ''}${o.cash ? ` · ${gbp2(o.cash)} cash used` : ''}${o.card?.reported ? ' · card payment being checked' : ''}</span><b>${gbp2(o.due ?? o.total)}</b></div>
        ${o.cardOnly ? `<button class="btn block ring-glow" data-card="${o.id}" style="margin-top:10px">💳 Pay ${gbp2(o.due ?? o.total)} by card</button><small class="muted" style="display:block;text-align:center;margin-top:6px">Instant-win orders are paid by card</small><details class="ord-pay hidden"><summary></summary>` : `<details class="ord-pay" open><summary>How to pay</summary>${bankPanel(me.bank, o.ref, o.due ?? o.total)}`}${!o.cardOnly && site.cardPayments ? `<button class="btn block ghost" data-card="${o.id}" style="margin-top:10px">💳 Pay by card</button>` : ''}</details>
      </div>`).join('') : '') +
      (groups.length ? (firstDone !== 0 ? `<h2 class="d sub-head">${pend.length ? 'All my tickets' : 'My tickets'}</h2>` : '') + groups.map((g, gi) => {
        const c = info(g.compId), done = isDone(g.compId), mw = (MC[g.compId] || {}).won || []; g.tickets.sort((a, b) => a.t - b.t);
        const head = gi === firstDone ? '<h2 class="d sub-head">🏁 Finished</h2>' : '';
        const extra = g.tickets.length - 10;
        return `${head}<div class="tgroup ${done ? 'done' : ''}"><a class="oc-img" href="#comp-${g.compId}" style="${img(compImg(g.compId) || (c && c.image) || '')}">${done ? `<span class="done-tag">${mw.length ? '🏆 WON' : 'FINISHED'}</span>` : ''}</a><div class="oc-body">
          <a class="oc-title" href="#comp-${g.compId}">${esc(g.title)}</a><div class="oc-sub">${g.tickets.length} ${c ? lbl(c).toLowerCase() : 'ticket'}${g.tickets.length > 1 ? 's' : ''}${c ? ' · ' + (c.status === 'live' ? (c.unlimited ? 'open' : Math.floor(c.pct) + '% sold') : done ? `<b class="fin">Finished${(MC[g.compId] || {}).drawnAt ? ' ' + fd(MC[g.compId].drawnAt) : ''}</b>` : c.status === 'drawing' ? '<b class="soon">drawing now</b>' : '<b class="soon">sold out – draw soon</b>') : ''}</div>${mw.length ? `<div class="good" style="margin:6px 0 4px;padding:6px 10px;font-size:13px">🏆 You won <b>${esc(mw.map(w => w.prize).join(', '))}</b> with #${mw.map(w => w.ticket).join(', #')}</div>` : done ? '<div class="muted" style="font-size:12px;margin:2px 0 4px">Not a winner this time – <a href="#comp-' + g.compId + '">see who won</a></div>' : ''}
          <div class="tix">${g.tickets.slice(0, 10).map(x => `<span class="${x.st}">#${x.t}</span>`).join('')}${extra > 0 ? `<span class="more-t" data-more-t="${g.compId}">+${extra} more</span>` : ''}</div>
          <div class="tix hidden" id="mt-${g.compId}">${g.tickets.slice(10).map(x => `<span class="${x.st}">#${x.t}</span>`).join('')}</div>
          ${extra > 0 ? `<button class="pill-btn" data-more-t="${g.compId}">View all ${g.tickets.length}</button>` : ''}</div></div>`;
      }).join('') : `<div class="bx-empty"><div class="be-ico">🎟️</div><b>No tickets yet</b><p>Your entries will show here – orange while pending, green once confirmed.</p><a class="btn" href="#competitions">Find a competition</a></div>`);
  } else if (tab === 'wins') {
    body = me.wins.length ? me.wins.map((w, k) => segBox(`<div class="win2"><div class="w2-img" style="${img(w.image)}"></div><div><span class="sb-top">🏆 You won</span><b class="sb-val rbt">${esc(w.prize)}</b><div class="w2-sub">${w.prize === w.title ? '' : esc(w.title) + ' · '}ticket #${w.ticket}</div><div class="w2-sub">${fdt(w.at)} · we'll be in touch to arrange your prize</div></div></div>`, 'wincard', 10 + k)).join('')
      : `<div class="bx-empty"><div class="be-ico">🏆</div><b>No wins yet</b><p>Your luck could change today – every prize is drawn live.</p><a class="btn" href="#competitions">Enter now</a></div>`;
  } else if (tab === 'withdraw') {
    const pendW = (me.withdrawals || []).find(w => w.status === 'pending');
    const ready = ID.status === 'verified' && me.payout;
    body = `<div class="panel wallet"><div class="wal2">${segBox(`<span class="sb-top">💷 Cash balance</span><b class="sb-val g" style="font-size:36px">${gbp2(W.balance)}</b><small class="muted">Cash prizes you win. Withdraw it to your bank or spend it on entries.</small>`, 'wbal', 50)}${segBox(`<span class="sb-top">🎟️ Credit balance</span><b class="sb-val gold" style="font-size:36px">${gbp2(W.credit || 0)}</b><small class="muted">Cashback & rewards. Used automatically on your next entries – can't be withdrawn.</small>${W.credit ? '<a class="btn sm" href="#competitions" style="margin-top:8px">Spend credit</a>' : ''}`, 'wbal', 49)}</div>
      ${!ready ? `<div class="warn" style="margin-top:14px">Before you can withdraw: ${ID.status !== 'verified' ? `<a href="#account-identity">verify your identity</a> ${idBadge}` : ''}${ID.status !== 'verified' && !me.payout ? ' and ' : ''}${!me.payout ? '<a href="#account-payouts">add your bank details</a>' : ''}</div>` : ''}
      ${pendW ? `<div class="pay-note" style="margin-top:14px">⏳ Withdrawal of <b>${gbp2(pendW.amount)}</b> requested ${fdt(pendW.at)} – we'll pay it to your account ending ${esc(me.payout?.last4 || '')} soon.</div>` :
      `<form id="wdForm" class="form2" style="margin-top:14px"><label>Amount to withdraw (£)</label><div class="row2"><div><input id="wdAmt" type="number" min="1" step="0.01" max="${(W.balance / 100).toFixed(2)}" value="${(W.balance / 100).toFixed(2)}" ${!ready || W.balance < 100 ? 'disabled' : ''}></div><div><button class="btn block" ${!ready || W.balance < 100 ? 'disabled' : ''}>Withdraw to bank</button></div></div><div class="err" id="wdErr"></div><p class="muted" style="font-size:12px">Minimum £1. Paid to your saved account${me.payout ? ` ending ${esc(me.payout.last4)}` : ''}, usually within 1 working day.</p></form>`}
      </div>
      <h2 class="d sub-head">History</h2>
      ${(me.withdrawals || []).length ? `<div class="ledger">${me.withdrawals.map(w => `<div><span>Withdrawal · ${fdt(w.at)}${w.note ? ` · <i>${esc(w.note)}</i>` : ''}</span><span class="st ${w.status === 'paid' ? 'confirmed' : w.status === 'pending' ? 'pending' : 'bad'}">${w.status === 'paid' ? 'Paid' : w.status === 'pending' ? 'Processing' : 'Returned'}</span><b>${gbp2(w.amount)}</b></div>`).join('')}</div>` : ''}
      ${W.ledger.length ? `<div class="ledger">${W.ledger.map(l => `<div><span>${esc(l.note || l.type)} · ${fdt(l.at)}</span><span class="st ${l.wallet === 'credit' ? 'pending' : 'confirmed'}">${l.wallet === 'credit' ? 'Credit' : 'Cash'}</span><b class="${l.amount > 0 ? 'g' : ''}">${l.amount > 0 ? '+' : '−'}${gbp2(Math.abs(l.amount))}</b></div>`).join('')}</div>` : '<p class="muted">No transactions yet.</p>'}`;
  } else if (tab === 'payouts') {
    body = `<div class="panel">
      <h2 class="d sub-head" style="margin-top:0">🏦 My payout account</h2>
      ${me.payout ? `<div class="saved-bank"><div><small>Name</small><b>${esc(me.payout.name)}</b></div><div><small>Sort code</small><b>${esc(me.payout.sortMask)}</b></div><div><small>Account</small><b>****${esc(me.payout.last4)}</b></div></div><p class="muted" style="font-size:12px">Saved ${fdt(me.payout.at)}. Your bank details are encrypted and only shown in full to our payout team.</p>` : '<p class="muted">Add the UK bank account you want winnings paid into. It must be in your own name.</p>'}
      <form id="poForm" class="form2"><label>Name on the account</label><input id="poN" value="${esc(me.payout?.name || u.first + ' ' + u.last)}" required>
        <div class="row2"><div><label>Sort code</label><input id="poS" inputmode="numeric" placeholder="12-34-56" maxlength="8" required></div><div><label>Account number</label><input id="poA" inputmode="numeric" placeholder="8 digits" maxlength="8" required></div></div>
        <label>Your password (to confirm)</label><input id="poP" type="password" autocomplete="current-password" required>
        <button class="btn lg block" style="margin-top:14px">${me.payout ? 'Update bank details' : 'Save bank details'}</button><div class="err" id="poErr"></div></form>
      <p class="secure-note">🔒 Encrypted with AES-256 before it's stored. We'll never ask for your card details or PIN.</p></div>`;
  } else if (tab === 'identity') {
    body = `<div class="panel">
      <h2 class="d sub-head" style="margin-top:0">🪪 Proof of identity ${idBadge}</h2>
      ${ID.status === 'verified' ? '<p>✅ Thanks – your identity is verified. You can withdraw cash winnings.</p>' :
        `<p class="muted">We need to check who you are before we pay out cash prizes. Upload a clear photo of <b>one</b> of these, showing your name and date of birth:</p>
        ${ID.status === 'pending' ? '<div class="pay-note">⏳ We\'re checking your document – this is usually done within a day.</div>' : ''}
        ${ID.status === 'rejected' ? `<div class="warn">We couldn't accept your last document${ID.note ? ': <b>' + esc(ID.note) + '</b>' : ''}. Please upload a new photo.</div>` : ''}
        <form id="idForm" class="form2"><label>Document type</label><select id="idK"><option value="passport">Passport</option><option value="licence">Driving licence</option><option value="id-card">National ID card</option></select>
        <label class="upl"><input type="file" id="idF" accept="image/*" capture="environment"><span id="idL">📷 Take or choose a photo</span></label><div id="idPrev"></div>
        <button class="btn lg block" style="margin-top:14px">Upload for checking</button><div class="err" id="idErr"></div></form>`}
      ${ID.docs?.length ? `<p class="muted" style="font-size:12px;margin-top:12px">Uploaded: ${ID.docs.map(d => esc(d.kind) + ' · ' + fd(d.at)).join(', ')}</p>` : ''}
      <p class="secure-note">🔒 Your document is encrypted and stored privately – it is never shown publicly and only our verification team can view it.</p></div>`;
  } else if (tab === 'favs') {
    const F = comps.filter(c => (me.favs || []).includes(c.id)), MC = me.myComps || {};
    const row = c => { const have = MC[c.id]?.held || 0, live = c.status === 'live', left = c.unlimited ? null : c.available;
      // exact chance now vs with one more ticket (allows for several winners; open-ended comps use entries so far)
      const p0 = chanceOf(c, have, 0), p1 = chanceOf(c, have + 1, 1), oneIn = p => p >= 1 ? 'Guaranteed' : '1 in ' + Math.max(1, Math.round(1 / p)).toLocaleString();
      const pc = p => { const v = p * 100; return v >= 99.95 ? '100%' : (v >= 10 ? v.toFixed(2) : v.toFixed(3)).replace(/\.?0+$/, '') + '%'; };
      const up = !live || p0 >= 1 ? '' : have
        ? `🎯 Your chance: <b>${pc(p0)}</b> → <b>${pc(p1)}</b> with one more ticket <span class="fv-gain">+${pc(p1 - p0)}</span>`
        : `🎯 One ticket gives you a <b>${pc(p1)}</b> chance <span class="fv-gain">${oneIn(p1)}</span>`;
      return `<div class="fv">
        <a class="fv-img" href="#comp-${c.id}" style="${c.status === 'scheduled' ? '' : img(c.image)}">${c.status === 'scheduled' ? '<span class="fv-soon">🚀<br>SOON</span>' : ''}</a>
        <div class="fv-b"><div class="fv-t"><a href="#comp-${c.id}"><b>${esc(c.title)}</b></a><button class="fv-x" data-fav="${c.id}" aria-label="Remove from favourites">❤️</button></div>
          <div class="fv-m"><span class="fv-have ${have ? 'on' : ''}">🎟️ ${have ? `<b>${have}</b> ticket${have > 1 ? 's' : ''}` : 'No tickets yet'}</span>${have && p0 ? `<span>${oneIn(p0)}</span>` : ''}<span class="fv-p">${c.type === 'free' ? 'FREE' : gbp(c.price)}</span></div>
          ${c.unlimited ? `<div class="fv-s">${c.sold.toLocaleString()} entries so far</div>` : `<div class="fv-bar"><i style="width:${Math.min(100, c.pct)}%"></i></div><div class="fv-s"><b>${Math.floor(c.pct)}%</b> sold · ${left.toLocaleString()} left${c.pct >= 75 && live ? ' · <em>🔥 nearly gone</em>' : ''}</div>`}
          ${c.status === 'scheduled' ? `<div class="fv-s">🚀 Launches ${fdt(c.goLiveAt)}</div>` : !live ? '<div class="fv-s">Entries closed</div>' : ''}
        </div>${live && up ? `<div class="fv-up"><span>${up}</span><button class="btn sm" data-fv-add="${c.id}">+1 ticket</button></div>` : ''}</div>`; };
    body = F.length ? `<div class="fv-list">${F.map(row).join('')}</div>` : '<div class="empty">Tap 🤍 Save on any competition – we’ll alert you when it’s nearly sold out or about to close.</div>';
  } else if (tab === 'badges') {
    const B = me.badges || [], T1 = B.filter(x => x.tier === 1), T2 = B.filter(x => x.tier === 2), g1 = T1.filter(x => x.got).length, g2 = T2.filter(x => x.got).length, locked = T2.some(x => x.locked), NEED = 8;
    const grid = (L, lk) => `<div class="bdg-grid">${L.map(x => `<div class="bdg ${x.got && !lk ? 'got' : ''} ${lk ? 'lk' : ''}"><span>${lk ? '🔒' : x.icon}</span><b>${esc(x.name)}</b><small>${esc(x.how)}</small></div>`).join('')}</div>`;
    const sec = (n, title, L, got, lk, sub) => `<div class="panel bdg-sec ${lk ? 'is-lk' : ''}"><div class="bdg-hd"><span class="bdg-lv">LEVEL ${n}</span><b>${title}</b><em>${got} / ${L.length}</em></div>
      <div class="bdg-bar"><i style="width:${got / Math.max(1, L.length) * 100}%"></i></div>${sub ? `<p class="bdg-sub">${sub}</p>` : ''}${grid(L, lk)}</div>`;
    body = `<h2 class="d sub-head" style="margin-top:0">Your badges <span class="muted" style="font-size:15px">${g1 + (locked ? 0 : g2)} of ${B.length}</span></h2>
      ${sec(1, 'Starter', T1, g1, false, g1 >= NEED ? (g1 === T1.length ? '✅ Level complete!' : '✅ Level 2 unlocked – keep collecting') : `Earn <b>${NEED - g1}</b> more to unlock Level 2`)}
      ${sec(2, 'Elite', T2, locked ? 0 : g2, locked, locked ? `🔒 Unlocks when you have ${NEED} Starter badges` : g2 === T2.length ? '👑 Every badge collected – you’re a Sheppey Elite legend!' : '')}`;
  } else if (tab === 'level') {
    const LV = me.level, ic = n => LVL_ICON[n] || '⭐', top = LV.tiers[LV.tiers.length - 1];
    const pct = Math.min(100, LV.spent / top.min * 100);
    body = `<div class="panel lvl">${segBox(`<div class="lv-in"><small>${esc(LV.month)}</small>
        <div class="lv-badge ${LV.level ? 'lv-' + LV.level.toLowerCase() : 'lv-none'}"><span class="lv-medal">${LV.level ? ic(LV.level) : '🎯'}</span><div><b>${LV.level ? esc(LV.level.toUpperCase()) : 'NO LEVEL YET'}</b><em>${LV.level ? `${LV.pct}% cashback this month` : `Spend ${gbp(LV.tiers[0].min)} to unlock cashback`}</em></div></div>
        <div class="lv-track"><div class="lv-fill" style="width:${pct}%"></div>${LV.tiers.map(t => `<i style="left:${t.min / top.min * 100}%" class="${LV.spent >= t.min ? 'on' : ''}"><span>${ic(t.name)}</span><small>${gbp(t.min)}</small></i>`).join('')}</div>
        <p class="lv-spent">You've spent <b>${gbp(LV.spent)}</b> this month${LV.pending ? ` <span class="muted">(+${gbp(LV.pending)} waiting for payment)</span>` : ''}</p>
        ${LV.level ? `<p class="lv-cb">💷 Cashback so far: <b>${gbp(LV.cashback)}</b> – added to your credit balance on ${fd(LV.resetAt)}</p>` : ''}
        ${LV.next ? `<p class="lv-next">${gbp(LV.next.need)} more to reach <b>${ic(LV.next.name)} ${esc(LV.next.name)}</b> (${LV.next.pct}% back on everything this month)</p>` : `<p class="lv-next">👑 Top level – you're getting the best cashback</p>`}
        <p class="muted" style="font-size:12px;margin:8px 0 0">Levels reset on ${fd(LV.resetAt)}.</p></div>`, 'lv-box', 61)}
      <h2 class="d sub-head">How levels work</h2>
      <div class="lv-tiers">${LV.tiers.map(t => `<div class="${LV.level === t.name ? 'on' : ''}"><span>${ic(t.name)}</span><b>${esc(t.name)}</b><small>Spend ${gbp(t.min)}+ in a month</small><em>${t.pct}% back</em></div>`).join('')}</div>
      <p class="muted" style="font-size:13px">Your level is based on confirmed paid entries in each calendar month. When the month ends, your cashback is added to your credit balance (to spend on entries) and everyone starts again. Free entries don't count. Please only ever spend what you can afford – you can set limits in <a href="#account-safe">Safe play</a>.</p>
      ${LV.history.length ? `<h2 class="d sub-head">Cashback history</h2><div class="ledger">${LV.history.map(x => `<div><span><b>${ic(x.level)} ${esc(x.level)}</b> · ${esc(x.month)}<br><small class="muted">spent ${gbp(x.spent)}</small></span><span></span><b class="g">+${gbp(x.amount)}</b></div>`).join('')}</div>` : ''}</div>`;
  } else if (tab === 'refer') {
    const R2 = me.referral || { code: '', invited: [], visits: 0 }, link = `${(site.siteUrl || location.origin).replace(/\/+$/, '')}/?ref=${R2.code}`, entered = R2.invited.filter(x => x.enteredAt).length;
    const shareTxt = encodeURIComponent(`Join me on Sheppey Elite Raffles – prizes drawn live every week! ${link}`);
    body = `<div class="panel refer">${segBox(`<div class="rf-in"><span class="rf-ico">🤝</span><b class="d">Invite your friends</b><p>Share your personal link. When friends join and enter, they show up here.</p>
        <div class="rf-perks">${R2.reward ? `<span>💷 <b>${gbp(R2.reward)}</b> for you when a friend spends ${gbp(R2.rewardMin || 0)}+</span>` : ''}${site.boardReferral ? `<span>🏅 <b>+${site.boardReferral}</b> leaderboard points for every friend who joins</span>` : ''}</div>
        <div class="rf-link"><input readonly value="${esc(link)}" id="rfLink"><button class="btn sm" data-copy-ref>Copy</button></div>
        <div class="rf-share"><a class="btn sm" style="background:#25d366" href="https://wa.me/?text=${shareTxt}" target="_blank" rel="noopener">WhatsApp</a><a class="btn sm" style="background:#1877f2" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}" target="_blank" rel="noopener">Facebook</a>${navigator.share ? '<button class="btn sm ghost" data-share-ref>More…</button>' : ''}</div>`, 'rf-box', 51)}
      <div class="stats2" style="margin-top:14px">${segBox(`<span class="sb-top">Link clicks</span><b class="sb-val">${R2.visits}</b>`, 'stat2', 52)}${segBox(`<span class="sb-top">Joined</span><b class="sb-val g">${R2.invited.length}</b>`, 'stat2', 53)}${segBox(`<span class="sb-top">Entered</span><b class="sb-val rbt">${entered}</b>`, 'stat2', 54)}</div>
      ${R2.earned || R2.checking ? `<div class="good" style="margin-top:12px">💷 You've earned <b>${gbp(R2.earned || 0)}</b> from referrals${R2.checking ? ` · ${R2.checking} reward${R2.checking > 1 ? 's' : ''} being checked` : ''}</div>` : ''}
      <h2 class="d sub-head">Friends you've invited</h2>
      ${R2.invited.length ? `<div class="ledger">${R2.invited.map(f => `<div><span><b>${esc(f.name)}</b> · ${esc(f.town)}<br><small class="muted">joined ${fd(f.joinedAt)}</small></span><span class="st ${f.enteredAt ? 'confirmed' : 'pending'}">${f.enteredAt ? (f.paid ? '✓ Entered' : '✓ Free entry') : 'Joined'}</span><b></b></div>`).join('')}</div>` : '<p class="muted">Nobody yet – share your link to get started.</p>'}</div>`;
  } else if (tab === 'safe') {
    const L = SF.limits || {}, sp = SF.spent || {};
    const lim = (k, name) => `<div class="lim"><div><b>${name} limit</b><small>Spent ${gbp2(sp[k] || 0)}${L[k] ? ' of ' + gbp2(L[k]) : ''}</small></div><input id="lim-${k}" type="number" min="0" step="1" placeholder="No limit" value="${L[k] ? L[k] / 100 : ''}"></div>`;
    const excl = SF.excludedUntil && Date.parse(SF.excludedUntil) > Date.now();
    body = `<div class="panel"><h2 class="d sub-head" style="margin-top:0">🛡️ Spending limits</h2>
      <p class="muted">Set how much you can spend on entries. Lowering a limit works straight away; raising or removing one takes 24 hours.</p>
      <form id="limForm" class="form2">${lim('day', 'Daily')}${lim('week', 'Weekly')}${lim('month', 'Monthly')}
      ${SF.pending ? `<div class="pay-note">⏳ Your new limits (${['day', 'week', 'month'].map(k => SF.pending.limits[k] ? gbp(SF.pending.limits[k]) + '/' + k : 'none/' + k).join(', ')}) start ${fdt(SF.pending.at)}.</div>` : ''}
      <button class="btn block" style="margin-top:12px">Save limits</button><div class="err" id="limErr"></div></form></div>
      <div class="panel" style="margin-top:14px"><h2 class="d sub-head" style="margin-top:0">⏸️ Take a break</h2>
      ${excl ? `<div class="warn">You're taking a break until <b>${fdt(SF.excludedUntil)}</b>. You can't enter competitions until then.</div>` : `<p class="muted">Block yourself from entering for a set time. This can't be undone early.</p>
      <form id="exForm" class="form2"><div class="row2"><div><label>Break for</label><select id="exP"><option value="1d">24 hours</option><option value="7d">7 days</option><option value="30d">30 days</option><option value="6m">6 months</option><option value="1y">1 year</option><option value="5y">5 years</option></select></div><div><label>Your password</label><input id="exPw" type="password" autocomplete="current-password" required></div></div>
      <button class="btn block ghost danger" style="margin-top:12px">Start my break</button><div class="err" id="exErr"></div></form>`}
      <p class="muted" style="font-size:13px;margin-top:14px">Need to talk to someone? <a href="https://www.begambleaware.org" target="_blank" rel="noopener">BeGambleAware.org</a> · National Gambling Helpline <b>0808 8020 133</b> (free, 24/7)</p></div>`;
  } else {
    const a = u.address;
    body = `<form class="panel form2" id="detForm"><h2 class="d sub-head" style="margin-top:0">My details</h2>
      <div class="row2"><div><label>First name</label><input id="dF" value="${esc(u.first)}" required></div><div><label>Last name</label><input id="dL" value="${esc(u.last)}" required></div></div>
      <div class="row2"><div><label>Email</label><input value="${esc(u.email)}" disabled></div><div><label>Phone</label><input id="dP" value="${esc(u.phone)}" required></div></div>
      ${me.bdayOn ? `<label>Birthday <span class="muted">(optional – we’ll send you a little treat 🎂)</span></label><div class="row2"><select id="dBd"><option value="">Day</option>${Array.from({ length: 31 }, (_, i) => `<option ${me.bday && +me.bday.split('-')[0] === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select><select id="dBm"><option value="">Month</option>${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => `<option value="${i + 1}" ${me.bday && +me.bday.split('-')[1] === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select></div>` : ''}
      <label>Address</label><input id="dA1" value="${esc(a.line1)}" required><input id="dA2" value="${esc(a.line2)}" placeholder="Address line 2 (optional)" style="margin-top:8px">
      <div class="row2"><div><label>Town</label>${townPicker('dT', a.town)}</div><div><label>Postcode</label><input id="dPc" value="${esc(a.postcode)}" required></div></div>
      <button class="btn lg block" style="margin-top:18px">Save details</button><div class="err" id="dErr"></div></form>
      <form class="panel form2" id="pwForm" style="margin-top:14px"><h2 class="d sub-head" style="margin-top:0">Change password</h2>
      <div class="row2"><div><label>Current password</label><input type="password" id="pC" required autocomplete="current-password"></div><div><label>New password</label><input type="password" id="pN" minlength="8" required autocomplete="new-password"></div></div>
      <button class="btn ghost block" style="margin-top:16px">Update password</button><div class="err" id="pErr"></div></form>
      <button class="btn ghost block" data-logout style="margin-top:14px">Log out</button>`;
  }
  $('#view').innerHTML = `<div class="wrap narrow">
    <div class="acc-top acc-top2"><span class="av big">${esc(initials(u))}</span>${bigHead('HI', esc(u.first.toUpperCase()), 'clamp(24px,6.5vw,40px)')}<div class="acc-sub">${esc(u.email)} · 📍 ${esc(u.address.town)}</div>${me.level ? `<a href="#account-level" class="lv-chip ${me.level.level ? 'lv-' + me.level.level.toLowerCase() : ''}">${me.level.level ? (LVL_ICON[me.level.level] || '⭐') + ' ' + esc(me.level.level) + ' · ' + me.level.pct + '% back' : '🎯 ' + (me.level.next ? gbp(me.level.next.need) + ' to ' + esc(me.level.next.name) : 'My level')}</a>` : ''}</div>
    <div class="acc-tabs2">${TABS.map(([k, n, i]) => `<button data-acct="${k}" class="${tab === k ? 'on' : ''}"><span>${i}</span>${n}</button>`).join('')}</div>
    <div class="stats2 acc-stats">${stat(0, 'Confirmed', cnt('confirmed'), 'g')}${stat(1, 'Pending', cnt('pending'), 'o')}${stat(2, 'Cash', gbp2(W.balance), 'g')}${stat(3, 'Credit', gbp2(W.credit || 0), 'gold')}</div>
    ${tab === 'tickets' ? appCard(true) : ''}
    ${body}</div>`;
  { const at = $('.acc-tabs2 .on'); if (at) at.scrollIntoView({ block: 'nearest', inline: 'center' }); }
  wireAccount(tab);
  startPayTimers();
  toTop();
}
// the app card shows a few times on My tickets, then stays out of the way (or straight away once closed)
function appCard(counted) {
  const push = 'Notification' in window && 'PushManager' in window;
  const on = push && Notification.permission === 'granted' && me?.app?.push;
  if (IS_APP && (on || !push)) return '';
  const K = 'ser_appcard_' + (IS_APP ? 'push' : 'app'); let n = 0; try { n = +localStorage.getItem(K) || 0; } catch { }
  if (counted) { if (n < 0 || n >= 4) return ''; try { localStorage.setItem(K, String(n + 1)); } catch { } }
  return `<div class="app-card">${counted ? `<button class="ac-x" data-acx="${K}" aria-label="Hide this">×</button>` : ''}${segBox(`<div class="ab-in"><img src="icon-192.png" alt=""><div><b>${IS_APP ? 'Turn on notifications' : 'Download the Sheppey Elite app'}</b><span>${IS_APP ? 'Hear first about live draws, new prizes and wins' : 'App-exclusive prizes, live draw alerts and faster entry'}</span></div>${IS_APP ? '<button class="btn sm ring-glow" data-notify>Turn on</button>' : '<button class="btn sm ring-glow" data-install>Download</button>'}</div>`, 'ab-box', 31)}</div>`;
}
function wireAccount(tab) {
  wireTownPickers();
  const on = (id, fn) => { const f = $(id); if (f) f.onsubmit = async e => { e.preventDefault(); const er = f.querySelector('.err'); er.textContent = ''; const btn = f.querySelector('button:not([type=button])'); if (btn) btn.disabled = true; try { await fn(); } catch (x) { er.textContent = x.message; } if (btn && btn.isConnected) btn.disabled = false; }; };
  on('#detForm', async () => { await api('/api/me', { first: $('#dF').value, last: $('#dL').value, phone: $('#dP').value, ...($('#dBd') ? { bday: $('#dBd').value && $('#dBm').value ? `${$('#dBd').value}-${$('#dBm').value}` : '' } : {}), address: { line1: $('#dA1').value, line2: $('#dA2').value, town: $('#dT').value, postcode: $('#dPc').value } }); toast('Details saved'); viewAccount('details'); });
  on('#pwForm', async () => { await api('/api/me/password', { current: $('#pC').value, next: $('#pN').value }); $('#pwForm').reset(); toast('Password updated'); });
  on('#poForm', async () => { await api('/api/me/payout', { name: $('#poN').value, sortCode: $('#poS').value, accountNumber: $('#poA').value, password: $('#poP').value }); toast('Bank details saved securely'); viewAccount('payouts'); });
  on('#wdForm', async () => { await api('/api/me/withdraw', { amount: Math.round(parseFloat($('#wdAmt').value) * 100) }); toast('Withdrawal requested 💷'); viewAccount('withdraw'); });
  on('#limForm', async () => { const v = k => Math.round((parseFloat($('#lim-' + k).value) || 0) * 100); const r = await api('/api/me/safe', { limits: { day: v('day'), week: v('week'), month: v('month') } }); toast(r.pending ? 'Saved – higher limits start in 24 hours' : 'Limits saved'); viewAccount('safe'); });
  on('#exForm', async () => { if (!confirm('Start your break? You won’t be able to enter until it ends, and it can’t be undone.')) return; const r = await api('/api/me/safe', { exclude: $('#exP').value, password: $('#exPw').value }); me = null; renderTop(); location.hash = 'home'; openDlg(`<h3 class="d">Your break has started</h3><p>You won't be able to enter competitions until <b>${fdt(r.until)}</b>. Look after yourself – support is available at <a href="https://www.begambleaware.org" target="_blank" rel="noopener">BeGambleAware.org</a>.</p><button class="btn block" data-close-dlg>OK</button>`); });
  const fi = $('#idF'); let idData = '';
  if (fi) fi.onchange = async () => { const f = fi.files[0]; if (!f) return; try { idData = await shrinkImage(f, 1800); $('#idPrev').innerHTML = `<img src="${idData}" alt="" class="id-prev">`; $('#idL').textContent = '✅ ' + f.name; } catch { toast('Couldn’t read that photo', true); } };
  on('#idForm', async () => { if (!idData) throw new Error('Choose a photo of your document first.'); await api('/api/me/id', { kind: $('#idK').value, dataUrl: idData }); toast('Uploaded – we’ll check it shortly'); viewAccount('identity'); });
}
function shrinkImage(file, max) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onerror = rej; r.onload = () => { const im = new Image(); im.onerror = rej; im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); res(cv.toDataURL('image/jpeg', 0.85)); }; im.src = r.result; }; r.readAsDataURL(file); });
}

// ---------- app: install, notifications, back button ----------
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; });
window.addEventListener('appinstalled', () => { api('/api/app/installed', { platform: 'android' }).catch(() => {}); toast('App installed 🎉'); });
function installDialog(msg) {
  if (IS_APP) return toast('You’re already using the app');
  const android = /android/i.test(navigator.userAgent), guess = IS_IOS ? 'apple' : android ? 'android' : '';
  openDlg(`<div style="text-align:center"><img src="icon-192.png" alt="" style="width:76px;border-radius:20px"><h3 class="d">Get the Sheppey Elite app</h3>${msg ? `<p>${esc(msg)}</p>` : '<p class="muted">Free draws are app-exclusive – plus live draw alerts and faster entry.</p>'}</div>
    <p style="text-align:center;font-weight:800;margin:6px 0 10px">Which phone do you have?</p>
    <div class="os-pick"><button class="os-btn ${guess === 'apple' ? 'sel' : ''}" data-os="apple"><span class="os-ico">${OS_ICON.apple}</span><b>iPhone / iPad</b><small>Apple</small>${guess === 'apple' ? '<i>This phone</i>' : ''}</button>
      <button class="os-btn ${guess === 'android' ? 'sel' : ''}" data-os="android"><span class="os-ico">${OS_ICON.android}</span><b>Android</b><small>Samsung, Google, Motorola…</small>${guess === 'android' ? '<i>This phone</i>' : ''}</button></div>
    <div id="osSteps"></div><button class="btn ghost block" data-close-dlg style="margin-top:10px">Close</button>`);
  const show = os => {
    $$('.os-btn').forEach(b => b.classList.toggle('sel', b.dataset.os === os));
    const box = $('#osSteps');
    if (os === 'apple') box.innerHTML = `<ol class="ios-steps"><li>Open this page in <b>Safari</b> ${IS_IOS && !/safari/i.test(navigator.userAgent.replace(/crios|fxios|edgios/ig, 'x')) ? '<em>(you’re not in Safari – copy the link and open it there)</em>' : ''}</li><li>Tap the <b>Share</b> button <span class="ios-ico">⬆︎</span> at the bottom of the screen</li><li>Scroll down and tap <b>Add to Home Screen</b> <span class="ios-ico">＋</span></li><li>Tap <b>Add</b>, then open <b>Elite Raffles</b> from your home screen and log in</li></ol>${IS_IOS ? '' : `<p class="muted" style="font-size:12px;text-align:center">Do this on your iPhone – open <b>${esc(location.host)}</b> in Safari.</p>`}`;
    else box.innerHTML = deferredInstall ? `<button class="btn lg block ring-glow" id="osInstall">📲 Install the app now</button><p class="muted" style="font-size:12px;text-align:center;margin-top:8px">Takes a few seconds – then open it from your home screen and log in.</p>`
      : `<ol class="ios-steps"><li>Open this page in <b>Chrome</b></li><li>Tap the menu <span class="ios-ico">⋮</span> in the top corner</li><li>Tap <b>Install app</b> (or <b>Add to Home screen</b>)</li><li>Open <b>Elite Raffles</b> from your home screen and log in</li></ol>${android ? '' : `<p class="muted" style="font-size:12px;text-align:center">Do this on your Android phone – open <b>${esc(location.host)}</b> in Chrome.</p>`}`;
    const ib = $('#osInstall'); if (ib) ib.onclick = () => { deferredInstall.prompt(); deferredInstall.userChoice.then(r => { if (r.outcome === 'accepted') closeDlg(); }).finally(() => { deferredInstall = null; }); };
  };
  $$('.os-btn').forEach(b => b.onclick = () => show(b.dataset.os));
  if (guess) show(guess);
}
const OS_ICON = {
  apple: '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 4.9c.7-.9 1.2-2 1-3.2-1 .1-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z"/></svg>',
  android: '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor"><path d="M17.6 9.5l1.8-3.1c.1-.2 0-.4-.1-.5-.2-.1-.4 0-.5.1l-1.8 3.2C15.6 8.6 13.9 8.2 12 8.2s-3.6.4-5 1L5.2 6c-.1-.2-.3-.2-.5-.1-.2.1-.2.3-.1.5l1.8 3.1C3.6 11 1.6 13.9 1.5 17.3h21c-.1-3.4-2.1-6.3-4.9-7.8zM7 14.6c-.6 0-1-.5-1-1s.5-1 1-1 1 .5 1 1-.4 1-1 1zm10 0c-.6 0-1-.5-1-1s.5-1 1-1 1 .5 1 1-.4 1-1 1z"/></svg>'
};
async function enableNotifications(quiet) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return toast(IS_IOS && !IS_APP ? 'Add the app to your home screen first, then turn on notifications' : 'Notifications aren’t supported on this device', true);
  try {
    const perm = await Notification.requestPermission(); if (perm !== 'granted') return toast('Notifications are off – you can turn them on in your phone settings', true);
    const { key } = await api('/api/push/key'); if (!key) return toast('Notifications aren’t set up yet', true);
    const reg = await navigator.serviceWorker.ready;
    const raw = atob(key.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - key.length % 4) % 4));
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(raw, c => c.charCodeAt(0)) });
    await api('/api/push/subscribe', { subscription: sub.toJSON() });
    try { localStorage.setItem('ser_push', '1'); } catch {}
    await loadMe(); if (!quiet) { toast('Notifications on 🔔'); closeDlg(); } $('.app-card')?.remove();
  } catch (e) { if (!quiet) toast('Couldn’t turn on notifications', true); }
}
function maybeAskNotify() {
  if (!IS_APP || !me || !('Notification' in window)) return;
  // already allowed on this phone (e.g. a new login) – link this account quietly
  if (Notification.permission === 'granted') { if (!me.app?.push) enableNotifications(true); return; }
  const key = 'ser_push_asked_' + me.user.id;
  try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch {}
  if (Notification.permission === 'denied') {
    setTimeout(() => { if (dlg().open) return; openDlg(`<div class="notify-pop"><div class="np-bell">🔕</div><h3 class="d">Notifications are switched off</h3><p>You’ll miss new free draws and live draw alerts. To turn them on:</p>
      <ol class="ios-steps" style="text-align:left">${IS_IOS ? '<li>Open your iPhone <b>Settings</b></li><li>Tap <b>Notifications</b>, then <b>Elite Raffles</b></li><li>Turn on <b>Allow Notifications</b></li>' : '<li>Press and hold the <b>Elite Raffles</b> app icon</li><li>Tap <b>App info</b> → <b>Notifications</b></li><li>Turn notifications <b>on</b>, then reopen the app</li>'}</ol>
      <button class="btn block" data-close-dlg>OK</button></div>`); }, 1200);
    return;
  }
  setTimeout(() => {
    if (dlg().open) return;
    openDlg(`<div class="notify-pop"><div class="np-bell">🔔</div><h3 class="d">Keep up to date</h3>
      <p>Turn on notifications so you never miss a thing:</p>
      <ul><li><span>🎁</span><div><b>New free draws</b><small>Free draws are app-exclusive – be first to grab your entries</small></div></li>
        <li><span>🔴</span><div><b>Live draws</b><small>When a draw fills up we’ll tell you when we’re going live${site.facebookGroupName ? ' in the ' + esc(site.facebookGroupName) : ' in the group'}</small></div></li>
        <li><span>🏆</span><div><b>Your wins</b><small>Know the moment you win – and when your entries are confirmed</small></div></li></ul>
      <button class="btn lg block ring-glow" data-notify>Turn on notifications</button><button class="btn ghost block" data-close-dlg style="margin-top:8px">Maybe later</button>
      <p class="muted" style="font-size:11.5px;text-align:center;margin:10px 0 0">We’ll remind you next time you open the app.</p></div>`);
  }, 1200);
}
function updateChrome(h) {
  $('#appBack').classList.toggle('hidden', !IS_APP || /^(home)?$/.test(h));
  const k = /^account/.test(h) ? 'account' : /^(competitions|free|games|comp-)/.test(h) ? 'comps' : /^(home)?$/.test(h) ? 'home' : '';
  $$('#botnav [data-bn]').forEach(a => a.classList.toggle('on', a.dataset.bn === k));
}
$('#appBack').onclick = () => { if (history.length > 1) history.back(); else location.hash = 'home'; };
(() => { const m2 = /[?&]ref=([A-Z0-9]{4,12})/i.exec(location.search); if (!m2) return; const code = m2[1].toUpperCase();
  try { if (localStorage.getItem('ser_ref') !== code) { localStorage.setItem('ser_ref', code); api('/api/ref/visit', { code }).then(r => { if (r.name) setTimeout(() => toast(`${r.name} invited you – welcome to Sheppey Elite! 🎉`), 2500); }).catch(() => {}); } } catch {}
  history.replaceState(null, '', location.pathname + location.hash); })();
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !window.SER_DEMO) navigator.serviceWorker.register('/sw.js').catch(() => {});
if (IS_APP) { try { if (!localStorage.getItem('ser_inst')) { localStorage.setItem('ser_inst', '1'); setTimeout(() => api('/api/app/installed', { platform: IS_IOS ? 'ios' : 'android' }).catch(() => {}), 1500); } } catch {} }

// ---------- live draw banner ----------
let wasLive = false;
function setLive(live) {
  const b = $('#liveBanner'); const on = !!(live && live.on);
  b.classList.toggle('hidden', !on);
  if (on) b.innerHTML = `<span class="rec"></span><b>LIVE NOW</b><span>${live.title ? 'Drawing ' + esc(live.title) : 'Live draw in progress'}</span><button class="btn sm" data-openchat-live>Join the live chat</button>`;
  document.body.classList.toggle('is-live', on);
  if (on && !wasLive) { try { if (sessionStorage.getItem('ser_live_seen') !== String(live.since || live.compId || 1)) { sessionStorage.setItem('ser_live_seen', String(live.since || live.compId || 1)); setTimeout(() => openChat('live'), 900); } } catch {} }
  wasLive = on;
}

// ---------- town picker ----------
function townPicker(id, value) {
  return `<div class="townpick"><input id="${id}" class="town-input" value="${esc(value || '')}" placeholder="Start typing your town…" autocomplete="off" required><div class="townlist hidden"></div></div>`;
}
function wireTownPickers() {
  $$('.town-input').forEach(inp => {
    const list = inp.nextElementSibling; let idx = -1, items = [];
    const show = () => {
      const q = inp.value.trim().toLowerCase();
      items = (q ? TOWNS.filter(t => t.toLowerCase().startsWith(q)).concat(TOWNS.filter(t => !t.toLowerCase().startsWith(q) && t.toLowerCase().includes(q))) : TOWNS).slice(0, 60);
      idx = -1;
      list.innerHTML = items.length ? items.map((t, i) => `<div data-i="${i}">${esc(t)}</div>`).join('') : '<div class="none">No match – try a nearby town</div>';
      list.classList.remove('hidden');
    };
    const pick = t => { inp.value = t; list.classList.add('hidden'); inp.setCustomValidity(''); };
    inp.addEventListener('focus', show);
    inp.addEventListener('input', () => { show(); inp.setCustomValidity(TOWNS.includes(inp.value) ? '' : 'Choose your town from the list'); });
    inp.addEventListener('keydown', e => {
      if (list.classList.contains('hidden')) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, Math.min(items.length - 1, idx + (e.key === 'ArrowDown' ? 1 : -1))); $$('.townlist div').forEach((d, i) => d.classList.toggle('on', i === idx)); list.children[idx]?.scrollIntoView({ block: 'nearest' }); }
      if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); pick(items[idx]); }
      if (e.key === 'Escape') list.classList.add('hidden');
    });
    list.addEventListener('mousedown', e => { const d = e.target.closest('[data-i]'); if (d) { e.preventDefault(); pick(items[+d.dataset.i]); } });
    inp.addEventListener('blur', () => setTimeout(() => {
      list.classList.add('hidden');
      const exact = TOWNS.find(t => t.toLowerCase() === inp.value.trim().toLowerCase());
      if (exact) pick(exact); else if (inp.value) inp.setCustomValidity('Choose your town from the list');
    }, 120));
  });
}

// ---------- auth ----------
function authDialog(mode, subtitle) {
  closeDrawers();
  const reg = mode === 'register';
  openDlg(`<button class="x" data-close-dlg>×</button>
    <h3 class="d">${reg ? 'Create your account' : 'Welcome back'}</h3>
    <div class="muted">${esc(subtitle || (reg ? 'Free to join – takes a minute.' : 'Log in to enter and see your tickets.'))}</div>
    <div class="seg"><button data-auth="login" class="${reg ? '' : 'on'}">Log in</button><button data-auth="register" class="${reg ? 'on' : ''}">Register</button></div>
    <form id="authForm" class="authf" novalidate>
      ${reg ? `<div class="af-sec">About you</div>
      <div class="af-2"><div><label for="aF">First name</label><input id="aF" required autocomplete="given-name"></div><div><label for="aL">Last name</label><input id="aL" required autocomplete="family-name"></div></div>` : ''}
      <label for="aE">Email</label><input id="aE" type="email" required autocomplete="email" inputmode="email" placeholder="you@example.com">
      ${reg ? `<label for="aP">Mobile number</label><input id="aP" type="tel" required autocomplete="tel" inputmode="tel" placeholder="07…">` : ''}
      <label for="aPw">Password</label><div class="af-pw"><input id="aPw" type="password" required autocomplete="${reg ? 'new-password' : 'current-password'}" ${reg ? 'minlength="8" placeholder="At least 8 characters"' : ''}><button type="button" class="af-eye" aria-label="Show password">Show</button></div>
      ${reg ? `<div class="af-sec">Your address</div>
        <label for="aA1">Address</label><input id="aA1" required autocomplete="address-line1" placeholder="House number and street">
        <div class="af-2 town"><div><label>Town</label>${townPicker('aT', '')}</div><div><label for="aPc">Postcode</label><input id="aPc" required autocomplete="postal-code" placeholder="ME12 1AA" style="text-transform:uppercase"></div></div>
        <div class="af-checks">
          <label class="af-chk"><input type="checkbox" id="a18"><i></i><span>I’m 18 or over and live in the UK</span></label>
          <label class="af-chk"><input type="checkbox" id="aCons"><i></i><span>I agree to the <a href="#terms" target="_blank" rel="noopener">terms</a> and <a href="#privacy" target="_blank" rel="noopener">privacy policy</a>, including my name and town showing on entry lists</span></label>
          <label class="af-chk"><input type="checkbox" id="aMk"><i></i><span>Email me about new competitions <em>(optional)</em></span></label>
        </div>` : ''}
      <button class="btn lg block" style="margin-top:18px">${reg ? 'Create account' : 'Log in'}</button>
      ${reg ? '' : '<button type="button" class="linkbtn" data-forgot>Forgot your password?</button>'}
      <div class="err" id="aErr"></div>
      ${!reg && window.SER_DEMO_HINT ? `<div class="good" style="font-size:13px">${window.SER_DEMO_HINT}</div>` : ''}
    </form>`);
  wireTownPickers();
  const tIn = document.querySelector('.af-2.town input'); if (tIn) tIn.placeholder = 'e.g. Sheerness';
  const eye = document.querySelector('.af-eye'); if (eye) eye.onclick = () => { const i = $('#aPw'), sh = i.type === 'password'; i.type = sh ? 'text' : 'password'; eye.textContent = sh ? 'Hide' : 'Show'; eye.setAttribute('aria-label', sh ? 'Hide password' : 'Show password'); };
  $('#authForm').onsubmit = async e => {
    e.preventDefault(); const btn = e.target.querySelector('.btn'); btn.disabled = true; $('#aErr').textContent = '';
    try {
      if (reg) await api('/api/auth/register', { first: $('#aF').value, last: $('#aL').value, email: $('#aE').value, phone: $('#aP').value, password: $('#aPw').value,
        address: { line1: $('#aA1').value, town: $('#aT').value, postcode: $('#aPc').value }, over18: $('#a18').checked, consent: $('#aCons').checked, marketing: $('#aMk').checked, ref: (() => { try { return localStorage.getItem('ser_ref') || undefined; } catch { return undefined; } })() }).then(r => { lastDevVerify = r.devVerify; return r; });
      else await api('/api/auth/login', { email: $('#aE').value, password: $('#aPw').value });
      await loadMe(); closeDlg(); toast(reg ? `Welcome ${me.user.first}! 🎉` : `Welcome back ${me.user.first}`); maybeAskNotify();
      renderVerifyBar();
      const act = pendingAction; pendingAction = null;
      if (act) await act(); else route();
    } catch (er) { $('#aErr').textContent = er.message; btn.disabled = false; }
  };
}

// ---------- password reset / email confirmation ----------
let lastDevVerify = null;
function forgotDialog(prefill) {
  openDlg(`<button class="x" data-close-dlg>×</button><h3 class="d">Forgot your password?</h3>
    <div class="muted">Enter your email and we'll send you a link to choose a new one.</div>
    <form id="fgForm"><label>Email</label><input id="fgE" type="email" required autocomplete="email" value="${esc(prefill || '')}">
    <button class="btn lg block" style="margin-top:18px">Send reset link</button><div class="err" id="fgErr"></div>
    <button type="button" class="linkbtn" data-auth="login">← Back to log in</button></form>`);
  $('#fgForm').onsubmit = async e => {
    e.preventDefault(); const b = e.target.querySelector('.btn'); b.disabled = true;
    try {
      const r = await api('/api/auth/forgot', { email: $('#fgE').value });
      openDlg(`<button class="x" data-close-dlg>×</button><h3 class="d">Check your email 📧</h3>
        <p>If there's an account for <b>${esc($('#fgE')?.value || '')}</b>, we've sent a link to reset your password. It works for 1 hour.</p>
        <p class="muted" style="font-size:14px">Not arrived? Check your spam folder, or contact us and we can send one for you.</p>
        ${r.devReset ? `<div class="good" style="font-size:13px">Demo: emails aren't really sent. <a href="#${r.devReset}">Open the reset link</a></div>` : ''}
        <button class="btn ghost block" data-close-dlg style="margin-top:12px">Done</button>`);
    } catch (er) { $('#fgErr').textContent = er.message; b.disabled = false; }
  };
}
function resetDialog(token) {
  openDlg(`<button class="x" data-close-dlg>×</button><h3 class="d">Choose a new password</h3>
    <form id="rsForm"><label>New password</label><input id="rsP" type="password" minlength="8" required autocomplete="new-password" placeholder="At least 8 characters">
    <label>Type it again</label><input id="rsP2" type="password" minlength="8" required autocomplete="new-password">
    <button class="btn lg block" style="margin-top:18px">Save new password</button><div class="err" id="rsErr"></div></form>`);
  $('#rsForm').onsubmit = async e => {
    e.preventDefault(); $('#rsErr').textContent = '';
    if ($('#rsP').value !== $('#rsP2').value) return ($('#rsErr').textContent = 'The two passwords don\'t match.');
    try { await api('/api/auth/reset', { token, password: $('#rsP').value }); closeDlg(); await loadMe(); renderVerifyBar(); toast('Password changed – you\'re logged in'); location.hash = 'account-tickets'; }
    catch (er) { $('#rsErr').innerHTML = esc(er.message) + ' <button type="button" class="linkbtn" data-forgot>Send a new link</button>'; }
  };
}
async function doVerify() { history.replaceState(null, '', '#home'); route(); }
function renderVerifyBar() { $('#verifyBar')?.remove(); }
function legalPage(kind) {
  clearInterval(tickTimer);
  const t = kind === 'terms' ? site.termsFull : site.privacyPolicy;
  setCrumbs([['Home', '#home'], [kind === 'terms' ? 'Terms & conditions' : 'Privacy policy', '#' + kind]]); setNav('');
  let html = '', list = [], para = [];
  const flush = () => { if (para.length) html += `<p>${para.map(esc).join('<br>')}</p>`; if (list.length) html += `<ul>${list.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`; para = []; list = []; };
  for (const raw of String(t || '').split('\n')) {
    const l = raw.trim();
    if (!l) { flush(); continue; }
    if (l.startsWith('## ')) { flush(); html += `<h2 class="d sub-head">${esc(l.slice(3))}</h2>`; }
    else if (l.startsWith('- ')) { if (para.length) { html += `<p>${para.map(esc).join('<br>')}</p>`; para = []; } list.push(l.slice(2)); }
    else { if (list.length) { html += `<ul>${list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`; list = []; } para.push(l); }
  }
  flush();
  $('#view').innerHTML = `<div class="wrap narrow legal">${bigHead(kind === 'terms' ? 'TERMS &amp;' : 'PRIVACY', kind === 'terms' ? 'CONDITIONS' : 'POLICY', 'clamp(30px,7vw,52px)')}<div class="panel">${html || '<p class="muted">Coming soon.</p>'}</div>
    <p class="muted" style="text-align:center;font-size:13px;margin-top:16px"><a href="#${kind === 'terms' ? 'privacy' : 'terms'}">${kind === 'terms' ? 'Privacy policy' : 'Terms & conditions'}</a>${site.postalOn === false ? '' : ' · <a href="#postal">Free postal entry</a>'}</p></div>`;
  toTop();
}

// ---------- router ----------
async function route() {
  if (holdActive()) return renderHold();
  closeDrawers(); clearInterval(gameTimer); clearInterval(streamTimer);
  if (playGame) { try { playGame.destroy(); } catch { } playGame = null; } // stop the last game's animations as soon as we leave it
  const h = (location.hash || '#home').slice(1);
  let sm;
  if (h === 'postal' && site.postalOn === false) { location.replace('#home'); return; }
  if (!['competitions', 'free', 'how', 'postal'].includes(h)) toTop();
  if ((sm = /^stream(?:-([a-f0-9]{16}))?$/.exec(h))) return viewStream(sm[1]);
  document.body.classList.remove('stream');
  updateChrome(h);
  let m;
  if (h === 'winners') return viewWinners();
  if (h === 'games') return viewGames();
  if ((m = /^paid-([A-Z0-9-]+)$/.exec(h))) { await loadMe().catch(() => { }); const o = (me?.orders || []).find(x => x.ref === m[1]); const iw = o && o.items.map(i => comps.find(c => c.id === i.compId)).find(c => c && c.iwGame && c.iwGame !== 'none');
    if (iw) { history.replaceState(null, '', '#play-' + iw.id); return viewPlay(iw.id, m[1]); } }
  if ((m = /^payfail-([A-Z0-9-]+)$/.exec(h))) return viewPayFail(m[1]);
  if ((m = /^(paid|payfail)-([A-Z0-9-]+)$/.exec(h))) { history.replaceState(null, '', '#account-tickets'); toast(m[1] === 'paid' ? 'Thanks – we\u2019re confirming your card payment' : 'Card payment didn\u2019t go through – you can still pay by bank transfer', m[1] !== 'paid'); return viewAccount('tickets'); }
  if ((m = /^comp-([a-f0-9]{16})$/.exec(h))) return viewComp(m[1]);
  if ((m = /^proof-([a-f0-9]{16})$/.exec(h))) return viewProof(m[1]);
  if (h === 'checkout') return viewCheckout();
  if (h === 'charity') return viewCharity();
  if (h === 'jackpot') return viewJackpot();
  if (h === 'terms' || h === 'privacy') return legalPage(h);
  if (h === 'faq') return viewFaq();
  if (h === 'contact' || h === 'complaints') return viewContact(h === 'complaints');
  if (h === 'results') return viewResults();
  if (h === 'protection' || h === 'fair-draws') return viewProtection();
  if ((m = /^reset-([a-f0-9]{48})$/.exec(h))) { history.replaceState(null, '', '#home'); viewHome('home'); return resetDialog(m[1]); }
  if ((m = /^verify-([a-f0-9]{48})$/.exec(h))) return doVerify(m[1]);
  if ((m = /^account(?:-(tickets|wins|details|withdraw|payouts|identity|safe|refer|level|badges|favs))?$/.exec(h))) return viewAccount(m[1] || 'tickets');
  if (h === 'leaderboard') return viewBoard();
  if (h === 'play' || /^play-[a-f0-9]{16}$/.test(h)) return viewPlay(h.slice(5) || null);
  return viewHome(['competitions', 'free', 'how', 'postal'].includes(h) ? h : 'home');
}
async function viewGames() {
  clearInterval(tickTimer); clearInterval(gameTimer); setCrumbs([['Home', '#home'], ['Live games', '#games']]); setNav('games');
  const gs = comps.filter(c => c.gameMode && c.gameMode !== 'standard' && c.status !== 'hidden');
  const how = [['🦆', 'Duck Race', 'Every entry is a numbered duck. Up to 25 ducks race around the island in the sea, under Kingsferry Bridge – first home wins.'], ['🏁', 'Race Around Sheppey', 'Every entry is a numbered car. They cross Kingsferry Bridge to start, then race laps of the island – first past the flag wins.'], ['💼', 'Elite Banker', 'Players are picked live at random. 22 boxes, the Banker rings with offers – deal or no deal?'], ['🃏', 'Higher or Lower', 'A player picked at random calls higher or lower to climb the prize ladder – cash out any time.']];
  let d = { live: [], results: [] }; try { d = await api('/api/games'); } catch {}
  const upcoming = gs.filter(c => ['soldout', 'ended'].includes(c.status) && !d.live.some(l => l.id === c.id));
  const resLine = r => `<a href="#comp-${r.compId}"><span class="gi" style="${img(r.image)}"></span><span><b>${esc(r.name)}</b><small>${r.mode === 'banker' ? '💼 Ticket' : r.mode === 'hilo' ? '🃏 Ticket' : r.mode === 'duck' ? '🦆 Duck' : '🏁 Car'} #${r.ticket} · ${esc(r.town || '')}</small><small>${esc(r.title)} · ${fd(r.at)}</small></span><em>${r.amount ? gbp2(r.amount) : '🏆'}<small>${r.mode === 'hilo' ? (r.how === 'cash' ? 'cashed out' : r.how === 'top' ? 'top of the ladder' : 'safe level') : r.mode === 'banker' ? (r.dealt ? 'took the deal' : 'opened own box') : /^Race \d+/.test(r.prize) ? esc(r.prize.split(' – ')[0]) : 'winner'}</small></em></a>`;
  $('#view').innerHTML = `<div class="wrap">${bigHead('LIVE', 'GAMES', 'clamp(34px,9vw,64px)')}<p class="sec-sub">Paid and free games, played live the moment they sell out</p>
    <div id="liveGames">${d.live.map(l => `<section class="games-live"><h2 class="d"><span class="live-pip"></span>LIVE NOW · ${esc(l.title)}</h2><div class="live-game" data-lg="${l.id}"></div></section>`).join('')}</div>
    ${upcoming.length ? `<section class="games-live"><h2 class="d chrome">⏳ Coming up next</h2><div class="grid2">${upcoming.map(card).join('')}</div></section>` : ''}
    <section class="games-res"><h2 class="d chrome">🏆 Game results</h2>${d.results.length ? `<div class="gres">${d.results.map(resLine).join('')}</div>` : '<div class="empty">Results appear here as soon as each game is played.</div>'}</section>
    <section><h2 class="d chrome">How the games work</h2><div class="trust2">${how.map(([i, a, b], k) => segBox(`<div class="gh"><span style="font-size:30px">${i}</span><b class="d">${a}</b><small>${b}</small></div>`, 'gtile', 60 + k)).join('')}</div></section>
    <section><h2 class="d chrome">Enter a game</h2><div class="grid2">${gs.filter(c => c.status === 'live').map(card).join('') || '<div class="empty">New live games are coming soon – turn on notifications to hear first.</div>'}</div></section></div>`;
  toTop();
  const ctls = {};
  const feed = data => {
    for (const l of data.live) {
      let host = document.querySelector(`[data-lg="${l.id}"]`);
      if (!host) { const lg = $('#liveGames'); if (!lg) return; lg.insertAdjacentHTML('beforeend', `<section class="games-live"><h2 class="d"><span class="live-pip"></span>LIVE NOW · ${esc(l.title)}</h2><div class="live-game" data-lg="${l.id}"></div></section>`); host = document.querySelector(`[data-lg="${l.id}"]`); }
      if (!ctls[l.id]) ctls[l.id] = gameController(host, l, l.play);
      ctls[l.id].feed({ ...l.play, serverNow: data.serverNow });
    }
  };
  feed(d);
  gameTimer = setInterval(async () => { if (location.hash !== '#games') return clearInterval(gameTimer); try { const n = await api('/api/games'); feed(n); if (n.results.length !== d.results.length) { d = n; const box = document.querySelector('.games-res'); if (box) box.innerHTML = `<h2 class="d chrome">🏆 Game results</h2><div class="gres">${n.results.map(resLine).join('')}</div>`; } } catch {} }, 1300);
}

// ---------- events ----------
document.addEventListener('click', async e => {
  const t = e.target.closest('button, a'); if (!t) return;
  if (t.dataset.open) { e.preventDefault(); openDrawer(t.dataset.open); }
  if (t.hasAttribute('data-acc-go')) { location.hash = 'account-tickets'; }
  if (t.hasAttribute('data-close-drawer')) closeDrawers();
  if (t.hasAttribute('data-close-dlg')) { closeDlg(); pendingAction = null; }
  if (t.dataset.auth) { e.preventDefault(); authDialog(t.dataset.auth); }
  if (t.hasAttribute('data-logout')) { await api('/api/auth/logout', {}); me = null; renderTop(); closeDrawers(); toast('Logged out'); location.hash = 'home'; route(); }
  if (t.dataset.car) { moveCarousel(+t.dataset.car); startAuto(); }
  if (t.dataset.dot) { car.i = +t.dataset.dot; layoutCarousel(); startAuto(); }
  if (t.dataset.cat) { catFilter = t.dataset.cat; $$('#cats button').forEach(b => b.classList.toggle('on', b.dataset.cat === catFilter)); renderGrid(); }
  if (t.dataset.cptab) { $$('#cpTabs button').forEach(b => b.classList.toggle('on', b === t)); $('#tabOnline').classList.toggle('hidden', t.dataset.cptab !== 'online'); $('#tabPostal').classList.toggle('hidden', t.dataset.cptab !== 'postal'); }
  if (t.hasAttribute('data-openchat')) { e.preventDefault(); closeDrawers(); openChat(); }
  if (t.hasAttribute('data-forgot')) { e.preventDefault(); forgotDialog($('#aE')?.value); }
  if (false && t.hasAttribute('data-resend')) { try { const r = await api('/api/auth/resend-verify', {}); if (r.devVerify) lastDevVerify = r.devVerify; if (r.already) { await loadMe(); renderVerifyBar(); return toast('Your email is already confirmed'); } renderVerifyBar(); toast('Sent – check your inbox (and spam)'); } catch (er) { toast(er.message, true); } }
  if (t.dataset.acct) location.hash = 'account-' + t.dataset.acct;
  if (t.hasAttribute('data-install')) installDialog();
  if (t.dataset.hqs) { e.preventDefault(); e.stopPropagation(); hqStep(t.closest('[data-hq]').dataset.hq, +t.dataset.hqs); return; }
  if (t.hasAttribute('data-hqgo')) { e.preventDefault(); e.stopPropagation(); hqGo(t.closest('[data-hq]').dataset.hq); return; }
  if (t.dataset.acx) { try { localStorage.setItem(t.dataset.acx, '-1'); } catch { } t.closest('.app-card')?.remove(); return; }
  if (t.dataset.fvAdd) { const id = t.dataset.fvAdd, cur = basket.find(x => x.compId === id); if (cur && cur.tickets) { location.hash = 'comp-' + id; return; } addToBasket(id, (cur?.qty || 0) + 1); toast('+1 ticket added to your basket 🎟️'); openDrawer('basket'); return; }
  if (t.dataset.fav) { if (!me) { pendingAction = null; return authDialog('login', 'Log in to save favourites and get alerts'); } const on = !(me.favs || []).includes(t.dataset.fav);
    api('/api/me/fav', { compId: t.dataset.fav, on }).then(r => { me.favs = r.favs; t.classList.toggle('on', on); t.innerHTML = t.classList.contains('cp-fav') ? `${on ? '❤️' : '🤍'}<span>${on ? 'Saved' : 'Save'}</span>` : on ? '❤️ Saved' : '🤍 Save'; if (location.hash === '#account-favs') route(); toast(on ? 'Saved – we’ll tell you when it’s nearly sold out ❤️' : 'Removed from favourites'); }).catch(e => toast(e.message)); }
  if (t.hasAttribute('data-copy-ref')) { const i = $('#rfLink'); i.select(); try { navigator.clipboard.writeText(i.value); } catch { document.execCommand('copy'); } toast('Link copied – share it with your friends!'); }
  if (t.hasAttribute('data-share-ref')) navigator.share({ title: 'Sheppey Elite Raffles', text: 'Join me on Sheppey Elite Raffles – prizes drawn live every week!', url: $('#rfLink').value }).catch(() => {});
  if (t.hasAttribute('data-notify')) enableNotifications();
  if (t.dataset.card) payByCard(t.dataset.card);
  if (t.dataset.moreT) { $('#mt-' + t.dataset.moreT)?.classList.remove('hidden'); $$(`[data-more-t="${t.dataset.moreT}"]`).forEach(x => x.remove()); }
  if (t.hasAttribute('data-openchat-live')) openChat('live');
  if (t.dataset.bq) { const b = basket.find(x => x.compId === t.dataset.bq); const c = comps.find(x => x.id === t.dataset.bq); if (b && c) { const lim = Math.min(c.available ?? 1e9, c.maxPerPerson || 1e9); b.qty = Math.max(1, Math.min(lim, b.qty + +t.dataset.d)); saveBasket(); renderBasket(); } }
  if (t.dataset.brm) { basket = basket.filter(x => x.compId !== t.dataset.brm); saveBasket(); renderBasket(); }
  if (t.dataset.copy) { try { await navigator.clipboard.writeText(t.dataset.copy); t.textContent = 'Copied'; setTimeout(() => (t.textContent = 'Copy'), 1500); } catch { toast('Copy not available – please write it down', true); } }
  if (t.tagName === 'A' && t.getAttribute('href') === location.hash && !t.dataset.open) route();
});
$('#scrim').addEventListener('click', closeDrawers);
dlg().addEventListener('close', () => { pendingAction = pendingAction && dlg().open ? pendingAction : pendingAction; });
window.addEventListener('hashchange', route);
window.addEventListener('hashchange', () => setTimeout(() => { try { bbar(); } catch {} }, 60));
// taps anywhere on a card's quick-add area never open the prize page
document.addEventListener('click', e => { if (e.target.closest && e.target.closest('.hq')) e.preventDefault(); }, true);
$('#yr').textContent = new Date().getFullYear();

// ---------- "just entered" pop-ups ----------
let acts = [], actI = 0, seenAct = new Set();
async function loadActivity() { try { acts = await api('/api/activity'); } catch { acts = []; } }
function showPop() {
  if (/^#(account|checkout|stream)/.test(location.hash)) return;
  if (document.hidden || !acts.length || dlg().open || $('#chat').classList.contains('on') || document.querySelector('.drawer.on')) return;
  const a = acts[actI++ % acts.length];
  const mins = Math.max(1, Math.round((Date.now() - Date.parse(a.at)) / 6e4));
  const ago = mins < 60 ? mins + ' min' + (mins > 1 ? 's' : '') + ' ago' : mins < 1440 ? Math.round(mins / 60) + 'h ago' : Math.round(mins / 1440) + 'd ago';
  const el = $('#pop');
  el.innerHTML = `<a href="#comp-${a.compId}"><span class="pi" style="${img(a.image)}"></span><span class="pt"><b>${esc(a.name)} from ${esc(a.town)}</b> just ${a.free ? 'claimed free entries in' : 'entered'} <em>${esc(a.title)}</em><small>${ago}</small></span></a><button class="px" aria-label="Close">×</button>`;
  el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 5500);
  el.querySelector('.px').onclick = e => { e.preventDefault(); el.classList.remove('on'); };
}

// ---------- community chat ----------
let chatRoom = 'community', chatLast = '', chatTimer = null, chatIds = '';
async function loadChat(full) {
  try {
    const d = await api(`/api/chat?room=${chatRoom}`);
    $('#liveDot').classList.toggle('hidden', !d.live.on); setLive(d.live);
    $('#chat').classList.toggle('live-lock', d.live.on);
    $$('.chat-tabs [data-room="live"]').forEach(b => b.classList.toggle('pulse', d.live.on));
    const lv = $('#chatLive');
    lv.classList.toggle('hidden', !(chatRoom === 'live'));
    lv.innerHTML = d.live.on ? `<span class="rec"></span> LIVE NOW${d.live.title ? ` – drawing <a href="#comp-${d.live.compId}">${esc(d.live.title)}</a>` : ''}` : 'No live draw right now – chat here during our next one!';
    lv.classList.toggle('is-live', d.live.on);
    const key = d.messages.map(m => m.id).join();
    if (key === chatIds && !full) return; chatIds = key;
    const box = $('#chatMsgs'), atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
    box.innerHTML = d.messages.length ? d.messages.map(m => `<div class="cm ${m.mine ? 'me' : ''} ${m.staff ? 'staff' : ''}"><div class="cmh"><b>${esc(m.name)}</b>${m.staff ? '<span class="staff-b">Host</span>' : m.town ? `<span>${esc(m.town)}</span>` : ''}<time>${new Date(m.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</time></div><div class="cmt">${esc(m.text)}</div></div>`).join('') : '<div class="empty" style="margin:20px 0">No messages yet – say hello! 👋</div>';
    if (atBottom || full) box.scrollTop = box.scrollHeight;
  } catch {}
}
function openChat(room) {
  if (room) chatRoom = room;
  $$('.chat-tabs button').forEach(b => b.classList.toggle('on', b.dataset.room === chatRoom));
  $('#chat').classList.add('on'); $('#chat').classList.remove('mini'); $('#pop').classList.remove('on');
  $('#chatIn').placeholder = me ? (chatRoom === 'live' ? 'Comment on the live draw…' : 'Say something…') : 'Log in to chat';
  loadChat(true); clearInterval(chatTimer); chatTimer = setInterval(() => loadChat(), 3000);
}
function closeChat() { if ($('#chat').classList.contains('live-lock')) { $('#chat').classList.toggle('mini'); return; } $('#chat').classList.remove('on'); clearInterval(chatTimer); chatTimer = setInterval(() => loadChat(), 20000); }
$('#chatFab').onclick = () => $('#chat').classList.contains('on') && !$('#chat').classList.contains('mini') ? closeChat() : openChat();
$('#chatX').onclick = closeChat;
$('#chat').addEventListener('click', e => { const b = e.target.closest('[data-room]'); if (b) { chatRoom = b.dataset.room; chatIds = ''; openChat(); } });
$('#chatIn').addEventListener('focus', () => { if (!me) { pendingAction = () => openChat(); authDialog('login', 'Log in to join the chat'); } });
$('#chatForm').onsubmit = async e => {
  e.preventDefault(); if (!me) return authDialog('login', 'Log in to join the chat');
  const t = $('#chatIn').value.trim(); if (!t) return;
  try { await api('/api/chat', { room: chatRoom, text: t }); $('#chatIn').value = ''; chatIds = ''; loadChat(true); } catch (er) { toast(er.message, true); }
};

(async function init() {
  renderTop();
  await Promise.all([loadSite(), loadMe(), loadComps().catch(() => {}), loadWinners()]);
  if (holdActive()) return renderHold(); // closed: just the holding page – no feeds, chat or timers
  if (site.hold && site.hold.previewing && !site.hold.off) document.body.insertAdjacentHTML('afterbegin', `<div class="hold-preview-bar">👀 Staff preview – customers currently see the “${esc(site.hold.title)}” page · <a href="#hold-preview">see it</a></div>`);
  basket = basket.filter(b => comps.some(c => c.id === b.compId && c.status === 'live' && c.type === 'paid')); saveBasket();
  setLive(site.live ? { on: true } : null); route(); maybeAskNotify();
  loadActivity().then(() => setTimeout(showPop, 6000));
  setInterval(showPop, 16000); setInterval(loadActivity, 60000);
  loadChat(); chatTimer = setInterval(() => loadChat(), 20000);
  setInterval(async () => {
    if (document.hidden || dlg().open) return;
    try { const jd = await api('/api/jackpot'); const was = JSON.stringify(site.jackpot || null); site.jackpot = jd.now; const box = document.querySelector('.jp-sec'); if (box && JSON.stringify(site.jackpot || null) !== was) box.outerHTML = jpBox(site.jackpot); } catch { }
    try { await loadComps(); if (!location.hash || /^#(home|competitions|free)?$/.test(location.hash)) renderGrid(); } catch {}
  }, 30000);
})();
// ---------- progressive jackpot ----------
function jpBox(J, page) {
  if (!J) return '';
  const pct = Math.min(100, J.pot / J.cap * 100), last = J.last, fresh = last && Date.now() - Date.parse(last.at) < 4 * 86400e3;
  const inner = `<div class="jp-in"><div class="jp-neon"><span>DROPS</span> <b>ANY TIME</b></div>
    <div class="jp-lbl">💰 SHEPPEY ELITE JACKPOT</div>
    <div class="jp-amt" data-jp="${J.pot}">${gbp2(J.pot)}</div>
    <div class="jp-meter">${blocks(pct, 'Jackpot ' + gbp2(J.pot) + ', must drop by ' + gbp2(J.cap))}<div class="jp-mt"><span>⬆ Growing with every ticket</span><span>Must drop by <b>${gbp2(J.cap)}</b></span></div></div>
    <p class="jp-how"><b>${J.pct}%</b> of every confirmed order goes into the pot · every ticket you hold this round is an entry</p>
    ${jpScroll(J.recent)}
    ${page ? '' : '<span class="jp-more">How the jackpot works ›</span>'}</div>`;
  return page ? `<div class="jp jp-page">${segBox(inner, 'jp-box', 91)}</div>` : `<section class="jp-sec"><div class="wrap"><a class="jp" href="#jackpot" aria-label="Jackpot – how it works">${segBox(inner, 'jp-box', 90)}</a></div></section>`;
}
function jpWhen(at) { const d = new Date(at), t = d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', ''), day = new Date(); day.setHours(0, 0, 0, 0);
  return d >= day ? 'today ' + t : d >= day - 864e5 ? 'yesterday ' + t : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + t; }
function jpScroll(R) {
  if (!R || !R.length) return '<div class="jp-scroll empty-s"><span class="jp-chip">💰 First jackpot drop coming soon – every ticket is an entry</span></div>';
  const chip = x => `<span class="jp-chip">💰 <b>${esc(x.name)}</b>${x.town ? ' from ' + esc(x.town) : ''} won <em>${gbp2(x.amount)}</em> · ${jpWhen(x.at)}</span>`;
  const row = R.map(chip).join(''); return `<div class="jp-scroll" aria-label="Recent jackpot winners"><small>RECENT JACKPOT WINNERS</small><div class="jp-track" style="--dur:${Math.max(14, R.length * 7)}s">${row}${row}</div></div>`;
}
function jpCount() { $$('.jp-amt[data-jp]').forEach(el => { const to = +el.dataset.jp, t0 = performance.now(), D = 1400; const f = n => { const e = Math.min(1, (n - t0) / D); el.textContent = gbp2(Math.round(to * (1 - Math.pow(1 - e, 3)))); if (e < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }); }
new MutationObserver(() => { const el = document.querySelector('.jp-amt[data-jp]:not([data-done])'); if (el) { $$('.jp-amt[data-jp]:not([data-done])').forEach(x => x.dataset.done = 1); jpCount(); } }).observe(document.documentElement, { childList: true, subtree: true });
async function viewJackpot() {
  setCrumbs([['Home', '#home'], ['Jackpot', '#jackpot']]); setNav('home');
  let d; try { d = await api('/api/jackpot'); } catch (e) { d = { now: null, history: [] }; }
  const J = d.now;
  $('#view').innerHTML = `<div class="wrap narrow">${bigHead('THE', 'JACKPOT', 'clamp(34px,9vw,60px)')}
    ${J ? jpBox(J, true) : '<div class="empty">The jackpot isn’t running right now – check back soon.</div>'}
    ${J ? `<div class="panel jp-steps"><h3>How it works</h3><ol>
      <li><b>Every order grows it.</b> When we confirm your payment, ${J.pct}% of what you paid goes straight into the pot.</li>
      <li><b>Every ticket is an entry.</b> Every ticket confirmed in any of our paid competitions since the last drop${site.postalOn === false ? '' : ' (including free postal entries)'} is in with a chance – the more tickets you hold, the better your chance.</li>
      <li><b>It drops at a random moment.</b> The drop point was picked at random, to the penny, when this round started – it always drops before it reaches ${gbp2(J.cap)}.</li>
      <li><b>Paid automatically.</b> The winning ticket is picked at random and the pot is added to the winner’s ${J.pay === 'cash' ? 'cash balance (withdrawable)' : 'site credit'} instantly. Then a new pot starts growing.</li></ol></div>
    <div class="panel jp-fair"><h3>🔒 Fair drops</h3><p class="muted">Before this round started we locked in the secret drop point and published its fingerprint below. When it drops, we reveal the drop point and the key, so anyone can check we didn’t change it.</p>
      <div class="jp-hash"><small>Round ${J.round} fingerprint (SHA-256)</small><code>${esc(J.commit || 'being generated…')}</code></div></div>` : ''}
    <h2 class="d chrome" style="margin:22px 0 10px">Past drops</h2>
    ${d.history.length ? `<div class="jp-hist">${d.history.map((x, k) => `<details class="jp-h"><summary><span class="jp-h-amt">${gbp2(x.amount)}</span><span class="jp-h-who"><b>${esc(x.name)}</b>${x.town ? ' · ' + esc(x.town) : ''}<small>Round ${x.round} · ${fdt(x.at)} · ticket #${x.ticket} in ${esc(x.comp)}</small></span></summary>
      <div class="jp-h-body"><div>Entries this round: <b>${x.entries.toLocaleString()}</b> · winning entry: <b>${x.pick.toLocaleString()}</b></div><div>Drop point: <b>${gbp2(x.dropAt)}</b> · key: <code>${esc(x.salt)}</code></div><div>Fingerprint: <code>${esc(x.commit || '')}</code></div>
      <button class="btn sm ghost" data-jpv="${k}">Check it</button> <span class="jp-ok" id="jpv${k}"></span></div></details>`).join('')}</div>` : '<div class="empty">No drops yet – the first one could be any minute.</div>'}
  </div>`;
  $$('[data-jpv]').forEach(b => b.onclick = async () => { const x = d.history[+b.dataset.jpv]; const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${x.dropAt}:${x.salt}`)); const hx = [...new Uint8Array(buf)].map(v => v.toString(16).padStart(2, '0')).join('');
    $('#jpv' + b.dataset.jpv).innerHTML = hx === x.commit ? '✅ Matches – the drop point was fixed before the round began' : '❌ Doesn’t match'; });
}
let jpShown = false;
function jpWinCheck() {
  const w = me && me.jackpotWin; if (!w || jpShown || !window.IGames || !IGames.jackpotWin) return; jpShown = true;
  setTimeout(() => { IGames.jackpotWin(w, (site.gameThemes || {}).standard).then(() => api('/api/me/jackpot-seen', {}).catch(() => { })); }, 900);
}

// ---------- animation governor: the rings, meters and glows only run while they're on screen ----------
(() => {
  if (!('IntersectionObserver' in window)) return;
  const SEL = '.c-ring,.btn,.blocks,.pct2,.pct3,.tseg,.game-tag,.rb,.bn-ring,.jp-in,.jp-neon,.jp-track,.top-prize,.nb-beam,.nb-glow,.nb-grid,.sa-rk,.tb-track,.wm-track';
  const io = new IntersectionObserver(es => { for (const e of es) e.target.classList.toggle('anim-off', !e.isIntersecting); }, { rootMargin: '120px 0px' });
  const seen = new WeakSet(); let q = false;
  const scan = () => { q = false; document.querySelectorAll(SEL).forEach(el => { if (!seen.has(el)) { seen.add(el); el.classList.add('anim-off'); io.observe(el); } }); };
  new MutationObserver(() => { if (!q) { q = true; requestAnimationFrame(scan); } }).observe(document.body, { childList: true, subtree: true }); scan();
})();
// ---------- holding page: launch countdown / maintenance / switching to cards ----------
const holdActive = () => !!(site.hold && ((!site.hold.previewing && !site.hold.off) || location.hash === '#hold-preview'));
let holdTimer = null;
function renderHold() {
  const H = site.hold || { mode: 'launch', title: 'WE’RE LAUNCHING SOON', text: '' }; document.body.classList.add('holding'); closeDrawers && closeDrawers();
  const at = H.at && Date.parse(H.at) > Date.now() ? Date.parse(H.at) : 0, icon = { launch: '🚀', maintenance: '🛠️', upgrade: '✨' }[H.mode] || '🚀';
  const words = String(H.title).trim().split(/\s+/), last = words.pop();
  $('#view').innerHTML = `<div class="hold"><div class="wrap narrow">
    <img class="hold-logo" src="logo.jpg" alt="Sheppey Elite Raffles">
    ${segBox(`<div class="hold-in"><div class="hold-ico">${icon}</div>
      <h1 class="hold-title"><span class="chrome">${esc(words.join(' '))}</span> <span class="rb">${esc(last || '')}</span></h1>
      <p class="hold-text">${esc(H.text)}</p>
      ${at ? `<div class="hold-cd" aria-label="Countdown">${['days', 'hours', 'mins', 'secs'].map(k => `<div><b data-hc="${k}">00</b><small>${k}</small></div>`).join('')}</div><div class="hold-when">${H.mode === 'launch' ? 'Opening' : 'Back'} ${new Date(at).toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}</div>` : ''}
      <div class="hold-cta">${me ? `<div class="hold-ok">✅ You’re on the list, ${esc(me.user.first)}!<small>We’ll message you the moment we ${H.mode === 'launch' ? 'open' : 'are back'}${'Notification' in window && Notification.permission !== 'granted' ? ' – turn on notifications so you don’t miss it' : ''}.</small></div>
          ${'Notification' in window && Notification.permission !== 'granted' ? '<button class="btn ghost" id="hNotify">🔔 Turn on notifications</button>' : ''}`
        : `<button class="btn big" id="hReg">${H.mode === 'launch' ? 'Register now – be ready to play' : 'Register & get notified'}</button><button class="lnk" id="hLog">Already registered? Log in to get notified</button>`}
        ${IS_APP ? '' : '<button class="btn ghost" data-install>📱 Download the app</button>'}</div>
      ${site.facebookUrl ? `<a class="hold-fb" href="${esc(site.facebookUrl)}" target="_blank" rel="noopener">Join ${esc(site.facebookGroupName || 'our Facebook group')} for updates ›</a>` : ''}
    </div>`, 'hold-box', 93)}
    <p class="hold-foot">18+ · UK residents · <a href="#" id="hTerms">Terms</a></p></div></div>`;
  const after = async () => { try { await api('/api/hold/notify', {}); } catch { } await loadMe(); renderHold(); };
  if ($('#hReg')) $('#hReg').onclick = () => { pendingAction = after; authDialog('register', H.mode === 'launch' ? 'Register now and you’ll be ready to play the moment we launch' : 'Register and we’ll tell you the moment we’re back'); };
  if ($('#hLog')) $('#hLog').onclick = () => { pendingAction = after; authDialog('login', 'Log in and we’ll tell you the moment we open'); };
  if ($('#hNotify')) $('#hNotify').onclick = async () => { try { await enableNotifications(); } catch { } setTimeout(renderHold, 800); };
  $('#hTerms').onclick = e => { e.preventDefault(); openDlg(`<h3 class="d">Terms</h3><p class="muted" style="white-space:pre-wrap">${esc(site.terms || '')}</p><button class="btn" data-close-dlg>Close</button>`); };
  if (me && !me.user.holdNotify) api('/api/hold/notify', {}).catch(() => { });
  clearInterval(holdTimer);
  if (at) { const tick = () => { const d = Math.max(0, at - Date.now()), v = { days: Math.floor(d / 864e5), hours: Math.floor(d / 36e5) % 24, mins: Math.floor(d / 6e4) % 60, secs: Math.floor(d / 1e3) % 60 };
      for (const k in v) { const el = document.querySelector(`[data-hc="${k}"]`); if (el) { const t = String(v[k]).padStart(2, '0'); if (el.textContent !== t) { el.textContent = t; el.classList.remove('flip'); void el.offsetWidth; el.classList.add('flip'); } } }
      if (!d) { clearInterval(holdTimer); if (H.auto) setTimeout(() => location.reload(), 4000); } };
    tick(); holdTimer = setInterval(tick, 1000); }
  // check every minute whether we've opened again
  setTimeout(async function chk() { try { const s2 = await api('/api/site'); if (!s2.hold) return location.reload(); } catch { } if (holdActive()) setTimeout(chk, 60000); }, 60000);
}
// SOLD OUT / WINNER DRAWN stamp over a prize's picture
function stamp(c, big) { const t = c.status === 'drawn' ? ['WINNER', 'DRAWN', 'won'] : ['soldout', 'ended', 'drawing'].includes(c.status) ? ['SOLD', 'OUT', 'so'] : null;
  return t ? `<span class="stamp ${t[2]} ${big ? 'big' : ''}" aria-label="${t[0]} ${t[1]}"><b>${t[0]}</b><b>${t[1]}</b></span>` : ''; }
})();

