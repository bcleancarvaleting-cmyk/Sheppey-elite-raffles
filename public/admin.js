/* Sheppey Elite Raffles – admin panel */
(function () {
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const gbp = p => '£' + (p / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const gbp0 = p => '£' + Math.round(p / 100).toLocaleString('en-GB');
const dt = s => s ? new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
const ago = s => { const m = Math.round((Date.now() - Date.parse(s)) / 6e4); return m < 1 ? 'just now' : m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; };
const img = src => src ? `background-image:url('${String(src).replace(/'/g, '%27')}')` : '';
const TOWNS = window.UK_TOWNS || [];
const ST = { pending: 'Pending', confirmed: 'Confirmed', expired: 'Expired', cancelled: 'Cancelled' };
let ME = null, view = '', cache = {}, ordFilter = 'pending', ordQ = '', custQ = '';

async function api(url, body, method) {
  const r = await fetch(url, { method: method || (body ? 'POST' : 'GET'), credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'SER' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401 && !url.endsWith('/login')) { ME = null; renderLogin(); throw new Error('Signed out'); }
  if (!r.ok) { const e = new Error(j.error || 'Something went wrong'); e.data = j; throw e; }
  return j;
}
function toast(m, bad) { const t = $('#toast'); t.textContent = m; t.style.borderLeftColor = bad ? 'var(--red)' : 'var(--green)'; t.classList.add('on'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 2600); }
const dlg = () => $('#dlg');
function openDlg(html, size) { $('#dlgBody').innerHTML = html; dlg().className = size || ''; if (!dlg().open) dlg().showModal(); }
const closeDlg = () => dlg().open && dlg().close();
function confirmDlg(title, html, label, fn, danger) {
  openDlg(`<h3 class="d">${title}</h3><div style="margin:10px 0 16px">${html}</div><div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn ghost" data-close>Cancel</button><button class="btn ${danger ? 'red' : ''}" id="okb">${label}</button></div><div class="err" id="okErr"></div>`);
  $('#okb').onclick = async () => { $('#okb').disabled = true; try { await fn(); closeDlg(); } catch (e) { $('#okErr').textContent = e.message; $('#okb').disabled = false; } };
}

// ================= LOGIN =================
function renderLogin(need2fa, keep) {
  document.title = 'Admin sign in';
  $('#app').innerHTML = `<div class="login"><form class="box" id="lf" autocomplete="on">
    <img src="logo.jpg" alt="">
    <h2 class="d" style="text-align:center;margin:0 0 4px">Admin sign in</h2>
    <p class="muted" style="text-align:center;margin:0 0 8px">Authorised staff only. All activity is logged.</p>
    <div ${need2fa ? 'class="hidden"' : ''}><label>Email</label><input id="le" type="email" autocomplete="username" required value="${esc(keep?.email || '')}">
    <label>Password</label><input id="lp" type="password" autocomplete="current-password" required></div>
    ${need2fa ? `<label>6-digit code from your authenticator app</label><input id="lc" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\\d{6}" required autofocus style="font-size:22px;letter-spacing:.3em;text-align:center">` : ''}
    <button class="btn lg block" style="margin-top:18px">${need2fa ? 'Verify' : 'Sign in'}</button>
    <div class="err" id="lerr"></div>
    ${window.SER_DEMO_ADMIN ? `<div class="good" style="font-size:13px">${window.SER_DEMO_ADMIN}</div>` : ''}
    <div class="lock">🔒 Encrypted session · locks after 5 failed attempts</div></form></div>`;
  if (need2fa) { $('#le').value = keep.email; $('#lp').value = keep.password; }
  $('#lf').onsubmit = async e => {
    e.preventDefault(); const b = e.target.querySelector('.btn'); b.disabled = true; $('#lerr').textContent = '';
    const creds = { email: $('#le').value, password: $('#lp').value, code: need2fa ? $('#lc').value : undefined };
    try { await api('/api/admin/login', creds); await boot(); }
    catch (er) { if (er.data?.need2fa && !need2fa) return renderLogin(true, creds); $('#lerr').textContent = er.message; b.disabled = false; }
  };
}

// ================= SHELL =================
const NAV = [['dashboard', '📊', 'Dashboard'], ['orders', '🧾', 'Orders'], ['comps', '🎟️', 'Competitions'], ['draws', '🎡', 'Draws'], ['customers', '👥', 'Customers'], ['payouts', '💷', 'Payouts & ID'], ['board', '🏅', 'Leaderboard & levels'], ['app', '📱', 'App & alerts'], ['promos', '🏷️', 'Promo codes'], ['games', '🎮', 'Game Centre'], ['jackpot', '💰', 'Jackpot'], ['hold', '🚧', 'Launch / maintenance'], ['social', '🖼️', 'Social images'], ['donations', '❤️', 'Charity'], ['chat', '💬', 'Chat'], ['inbox', '📨', 'Messages & complaints'], ['emails', '✉️', 'Emails'], ['site-settings', '⚙️', 'Settings'], ['security', '🔒', 'Security & log']];
const NAV_NEED = { games: 'settings', orders: 'orders', payouts: 'payouts', donations: 'money', promos: 'money', emails: 'money', 'site-settings': 'settings' };
const navOk = k => !NAV_NEED[k] || can(NAV_NEED[k]);
function shell(active, pending, D) {
  const todo = D?.todo || {}, payN = (todo.withdrawals || 0) + (todo.ids || 0), live = !!D?.live;
  return `<div class="shell"><aside class="side" id="side">
    <div class="logo"><img src="logo-sm.jpg" alt=""><span>SHEPPEY ELITE<br><small class="muted" style="font:700 10px Inter;letter-spacing:.2em">ADMIN</small></span></div>
    ${NAV.filter(([k]) => navOk(k)).map(([k, i, l]) => `<a href="#${k}" class="${active === k ? 'on' : ''}">${i} ${l}${k === 'orders' && pending ? `<span class="b">${pending}</span>` : ''}${k === 'payouts' && payN ? `<span class="b">${payN}</span>` : ''}</a>`).join('')}
    <div class="live-sw ${live ? 'on' : ''}"><div><b>${live ? '🔴 LIVE NOW' : 'Live mode'}</b><small>${live ? 'Chat & live banner on for everyone' : 'Turn on for the whole live draw'}</small></div><button class="sw-btn" data-golive="${live ? 0 : 1}" aria-label="Toggle live mode"><i></i></button></div>
    <a href="./#stream" target="_blank" rel="noopener">📺 Stream screen</a>
    <a href="./" target="_blank" rel="noopener">↗ View site</a>
    <div class="who">${esc(ME.email)}<br><span class="role-chip r-${ME.perms.role}">${ROLE_INFO[ME.perms.role][0]}${ME.perms.canPay && !ME.perms.money ? ' · payments' : ''}</span><br><span class="muted">${ME.twoFactor ? '🔐 2FA on' : '<span style="color:var(--orange)">⚠ 2FA off</span>'}</span><button class="btn ghost sm block" data-logout style="margin-top:8px">Sign out</button></div>
  </aside>
  <div><div class="mtop"><button class="btn ghost sm" data-side>☰</button><b class="d">Admin</b></div><main class="mainx" id="main"><div class="skeleton" style="min-height:200px"></div></main></div></div>`;
}

async function route() {
  if (!ME) return;
  const h = (location.hash || '#dashboard').slice(1);
  let m, key = h.split('-')[0];
  if (h.startsWith('comp-edit') || h === 'comps') key = 'comps';
  if (h.startsWith('draw')) key = 'draws';
  if (h.startsWith('customer')) key = 'customers';
  if (h.startsWith('payouts')) key = 'payouts';
  if (h.startsWith('app')) key = 'app';
  if (h.startsWith('board')) key = 'board';
  if (h === 'site-settings') key = 'site-settings';
  let pending = 0, D = null;
  try { D = cache.dash = await api('/api/admin/dashboard'); pending = cache.pendingCount = D.pending.count; } catch { return; }
  $('#app').innerHTML = shell(key, pending, D);
  if (!navOk(key)) { location.hash = 'dashboard'; return; }
  if (!can('write')) $('#main').insertAdjacentHTML('beforebegin', '<div class="ro-bar">👀 View-only account – you can look around but changes are switched off.</div>');
  document.title = 'Admin · ' + (NAV.find(n => n[0] === key)?.[2] || 'Dashboard');
  try {
    if (h === 'dashboard') return D.staff ? vStaffDash(D) : await vDashboard();
    if (h === 'orders') return await vOrders();
    if (h === 'comps') return await vComps();
    if ((m = /^comp-edit-(new|[a-f0-9]{16})$/.exec(h))) return await vCompEdit(m[1]);
    if (h === 'draws') return await vDraws();
    if ((m = /^draw-([a-f0-9]{16})$/.exec(h))) return await vDrawStudio(m[1]);
    if (h === 'customers') return await vCustomers();
    if ((m = /^customer-([a-f0-9]{16})$/.exec(h))) return await vCustomer(m[1]);
    if (h === 'emails') return await vEmails();
    if (h === 'payouts') return await vPayouts();
    if (h === 'board') return await vBoard();
    if (h === 'games') return await vGames();
    if (h === 'jackpot') return await vJackpot();
    if (h === 'hold') return await vHold();
    if (h === 'social') return vSocial();
    if (h === 'app') return await vApp();
    if ((m = /^app-([a-f0-9]{16})$/.exec(h))) return await vApp(m[1]);
    if (h === 'donations') return await vDonations();
    if (h === 'promos') return await vPromos();
    if (h === 'inbox') return await vInbox();
    if (h === 'chat') return await vChat();
    if (h === 'site-settings') return await vSettings();
    if (h === 'security') return await vSecurity();
    location.hash = 'dashboard';
  } catch (e) { if (e.message !== 'Signed out') $('#main').innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

// ================= DASHBOARD =================
function vStaffDash(d) {
  $('#main').innerHTML = `<div class="ph"><h1 class="d">Hi ${esc((ME.name || '').split(' ')[0])} 👋</h1><span class="muted">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>
  <div class="kpis">
    ${can('orders') ? `<a class="kpi" href="#orders" style="text-decoration:none;color:inherit"><small>Payments to check</small><b style="color:var(--orange)">${d.pending.count}</b><span>orders waiting for a bank transfer</span></a>` : ''}
    <div class="kpi"><small>Orders today</small><b>${d.ordersToday}</b></div>
    <div class="kpi"><small>New customers</small><b>${d.users.today}</b><span>${d.users.week} this week · ${d.users.total} total</span></div>
    <div class="kpi"><small>App</small><b>${d.app.installs}</b><span>installs · ${d.app.push} with alerts on</span></div></div>
  <div class="card"><h3>Competitions</h3><table class="t"><thead><tr><th>Competition</th><th>Status</th><th>Sold</th></tr></thead>${d.comps.map(c => `<tr><td><a href="#draw-${c.id}" style="color:var(--text);font-weight:700">${esc(c.title)}</a></td><td><span class="st ${c.status === 'live' ? 'confirmed' : 'pending'}">${esc(c.status)}</span></td><td>${c.unlimited ? c.taken : `${c.taken}/${c.total} · ${Math.floor(c.pct)}%`}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Nothing live.</td></tr>'}</table></div>
  <div class="card"><h3>Newest customers</h3><table class="t">${d.users.latest.map(u => `<tr><td><a href="#customer-${u.id}" style="color:var(--text);font-weight:700">${esc(u.name)}</a></td><td class="muted">${esc(u.town)}</td><td class="muted">${dt(u.at)}</td></tr>`).join('')}</table></div>`;
}
async function vDashboard() {
  const [d, CL] = await Promise.all([api('/api/admin/dashboard'), api('/api/admin/comps').catch(() => [])]);
  const ready = (Array.isArray(CL) ? CL : []).filter(c => ['soldout', 'ended', 'drawing'].includes(c.status) && (c.confirmed || 0) > 0);
  const diff = d.salesSameTimeLastWeek ? Math.round((d.salesToday - d.salesSameTimeLastWeek) / d.salesSameTimeLastWeek * 100) : null;
  $('#main').innerHTML = `
  <div class="ph"><h1 class="d">Dashboard</h1><div class="row"><span class="muted">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span><button class="btn ghost sm" data-export="summary">⬇️ Monthly summary (CSV)</button></div></div>
  <div class="kpis">
    <div class="kpi"><small>Revenue (confirmed)</small><b>${gbp(d.revenue.total)}</b><span>Today <b style="display:inline;font:inherit;color:var(--text)">${gbp(d.revenue.today)}</b> · 7 days ${gbp0(d.revenue.week)}</span></div>
    <div class="kpi"><small>Awaiting payment</small><b style="color:var(--orange)">${gbp(d.pending.value)}</b><span><a href="#orders">${d.pending.count} pending order${d.pending.count === 1 ? '' : 's'} →</a></span></div>
    <div class="kpi"><small>Top seller</small><b style="font-size:20px;line-height:1.4">${d.topSeller ? esc(d.topSeller.title) : '—'}</b><span>${d.topSeller ? `${gbp(d.topSeller.revenue)} · ${d.topSeller.pct}% sold` : 'No sales yet'}</span></div>
    <div class="kpi"><small>New users</small><b>${d.users.week}</b><span>this week · ${d.users.today} today · ${d.users.total} total</span></div>
  </div>
  ${(() => { const t = d.todo || {}; const items = [
      t.withdrawals ? `<a class="todo" href="#payouts">💷 <b>${t.withdrawals}</b> withdrawal${t.withdrawals > 1 ? 's' : ''} to pay · ${gbp(t.withdrawValue)}</a>` : '',
      t.ids ? `<a class="todo" href="#payouts">🪪 <b>${t.ids}</b> ID document${t.ids > 1 ? 's' : ''} to check</a>` : '',
      t.cardReported ? `<a class="todo" href="#orders">💳 <b>${t.cardReported}</b> card payment${t.cardReported > 1 ? 's' : ''} to check in DNA</a>` : '',
      `<a class="todo soft" href="#app">📱 <b>${d.app?.installs || 0}</b> app downloads · <b>${d.app?.push || 0}</b> with notifications</a>`].filter(Boolean);
    return `<div class="todos">${items.join('')}</div>`; })()}
  ${ready.length ? `<div class="drawnow"><div class="dn-h">🎡 <b>Ready to draw</b><small>${ready.length} prize${ready.length > 1 ? 's' : ''} sold out or closed</small></div>${ready.slice(0, 6).map(c => `<a class="dn" href="#draw-${c.id}"><span class="th" style="${img(c.image)}"></span><span class="dn-t"><b>${esc(c.title)}</b><small>${c.confirmed} confirmed tickets · ${c.status === 'drawing' ? 'draw in progress' : c.status === 'ended' ? 'closed' : 'sold out'}</small></span><span class="btn sm">Draw now →</span></a>`).join('')}${ready.length > 6 ? `<a class="dn-more" href="#draws">See all ${ready.length} →</a>` : ''}</div>` : ''}
  <div class="cards2">
    <div class="card chart"><h3>Today's sales vs last week <span class="muted" style="font-size:13px">${gbp(d.salesToday)} so far ${diff === null ? '' : `<span class="${diff >= 0 ? 'up' : 'down'}" style="color:${diff >= 0 ? 'var(--green)' : 'var(--red2)'}">${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff)}%</span>`}</span></h3>
      <div class="lg"><span><i style="background:var(--red)"></i>Today</span><span><i style="background:var(--blue2)"></i>Same day last week</span></div>${chartSvg(d.chart)}</div>
    <div class="card"><h3>New sign-ups <a href="#customers" class="muted" style="font-size:13px">All →</a></h3>
      ${d.users.latest.length ? `<table class="t">${d.users.latest.map(u => `<tr><td><a href="#customer-${u.id}" style="color:var(--text);font-weight:700">${esc(u.name)}</a><br><small class="muted">${esc(u.town)}</small></td><td class="muted" style="text-align:right">${ago(u.at)}</td></tr>`).join('')}</table>` : '<p class="muted">No sign-ups yet.</p>'}</div>
  </div>
  <div class="card" style="margin-bottom:14px"><h3>Recent orders <a href="#orders" class="muted" style="font-size:13px">All orders →</a></h3>
    <div class="tw"><table class="t"><thead><tr><th>Reference</th><th>Name</th><th>Value</th><th>Paid</th><th></th></tr></thead><tbody>
    ${d.recentOrders.map(o => `<tr><td class="ref">${esc(o.ref)}<br><small class="muted" style="font-family:Inter">${ago(o.at)}</small></td><td>${esc(o.name || '—')}</td><td><b>${o.total ? gbp(o.total) : o.source === 'postal' ? 'Postal' : o.source === 'prize' ? 'Prize' : 'Free'}</b></td><td><span class="st ${o.status}">${ST[o.status]}</span></td>
      <td style="text-align:right;white-space:nowrap">${o.status === 'pending' ? `<button class="btn sm" data-confirm="${o.id}">Confirm</button> ` : ''}${o.userId ? `<a class="btn ghost sm" href="#customer-${o.userId}">View user</a>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">No orders yet.</td></tr>'}
    </tbody></table></div></div>
  <div class="cards2 even">
    <div class="card"><h3>Live competitions</h3>${d.comps.length ? `<table class="t">${d.comps.map(c => `<tr><td><div class="mini"><div class="th" style="${img(c.image)}"></div><div><b>${esc(c.title)}</b><br><small class="muted">${c.unlimited ? c.taken + ' entries · open-ended' : c.taken + '/' + c.total + ' · ' + gbp(c.revenue)}</small></div></div></td><td style="width:34%"><div class="prog"><i style="width:${c.pct}%"></i></div><small class="muted">${c.pct}% ${c.status !== 'live' ? '· <span class="badge2 b-' + c.status + '">' + c.status + '</span>' : ''}</small></td></tr>`).join('')}</table>` : '<p class="muted">No live competitions.</p>'}</div>
    <div class="card"><h3>Where players are from</h3>${d.towns.length ? `<table class="t"><thead><tr><th>Town</th><th>Registered</th><th>Playing</th><th>Revenue</th></tr></thead>${d.towns.map(t => `<tr><td><b>${esc(t.town)}</b></td><td>${t.users}</td><td>${t.players}</td><td>${gbp(t.revenue)}</td></tr>`).join('')}</table>` : '<p class="muted">No users yet.</p>'}</div>
  </div>`;
}
function chartSvg(c) {
  const W = 640, H = 220, P = { l: 52, r: 12, t: 10, b: 26 };
  const max = Math.max(100, ...c.lastWeek, ...c.today.filter(v => v !== null));
  const nice = Math.pow(10, Math.floor(Math.log10(max))) * (max / Math.pow(10, Math.floor(Math.log10(max))) > 5 ? 10 : max / Math.pow(10, Math.floor(Math.log10(max))) > 2 ? 5 : 2);
  const x = i => P.l + i / 23 * (W - P.l - P.r), y = v => H - P.b - v / nice * (H - P.t - P.b);
  const line = (arr, col, w) => { const pts = arr.map((v, i) => v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`).filter(Boolean); return pts.length ? `<polyline fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round" points="${pts.join(' ')}"/>` : ''; };
  const area = arr => { const pts = arr.map((v, i) => v === null ? null : [x(i), y(v)]).filter(Boolean); if (!pts.length) return ''; return `<path d="M${pts[0][0]},${y(0)} ${pts.map(p => 'L' + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')} L${pts[pts.length - 1][0]},${y(0)}Z" fill="url(#ga)"/>`; };
  const grid = [0, .25, .5, .75, 1].map(f => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(nice * f)}" y2="${y(nice * f)}" stroke="#1e2b57"/><text x="${P.l - 8}" y="${y(nice * f) + 4}" text-anchor="end" fill="#94a0c4" font-size="11">£${Math.round(nice * f / 100).toLocaleString()}</text>`).join('');
  const xl = [0, 6, 12, 18, 23].map(i => `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" fill="#94a0c4" font-size="11">${String(i).padStart(2, '0')}:00</text>`).join('');
  const last = c.today[c.hour];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Cumulative sales today compared with the same day last week"><defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff1f3d" stop-opacity=".35"/><stop offset="1" stop-color="#ff1f3d" stop-opacity="0"/></linearGradient></defs>
    ${grid}${xl}${line(c.lastWeek, '#5b8cff', 2)}${area(c.today)}${line(c.today, '#ff1f3d', 3)}
    ${last !== null && last !== undefined ? `<circle cx="${x(c.hour)}" cy="${y(last)}" r="5" fill="#ff1f3d" stroke="#fff" stroke-width="2"/>` : ''}</svg>`;
}

// ================= ORDERS =================
async function vOrders() {
  const all = await api('/api/admin/orders'); cache.orders = all;
  const counts = s => all.filter(o => s === 'all' || o.status === s).length;
  const draw = () => {
    const q = ordQ.trim().toLowerCase();
    const list = all.filter(o => (ordFilter === 'all' || o.status === ordFilter) && (!q || [o.ref, o.user?.name, o.user?.email, o.user?.town, o.user?.phone, ...o.items.map(i => i.title)].some(v => String(v || '').toLowerCase().includes(q))));
    $('#otb').innerHTML = list.map(o => `<tr>
      <td class="ref">${esc(o.ref)}<br><small class="muted" style="font-family:Inter">${o.source === 'online' ? (o.cardOnly ? '💳 Card · instant wins' : 'Bank transfer') : o.source === 'free' ? 'Free entry' : o.source === 'prize' ? '🎫 Prize tickets' : 'Postal entry'}</small></td>
      <td>${o.userId ? `<a href="#customer-${o.userId}" style="color:var(--text);font-weight:700">${esc(o.user?.name)}</a>` : `<b>${esc(o.user?.name)}</b>`}<br><small class="muted">${esc(o.user?.town || '')}${o.user?.phone ? ' · ' + esc(o.user.phone) : ''}</small></td>
      <td>${o.items.map(i => `<div>${esc(i.title)} <span class="muted">×${i.qty}</span></div>`).join('')}</td>
      <td>${(() => { const due = o.due ?? o.total, bits = [o.discount ? `promo −${gbp(o.discount)}` : '', o.bankDisc ? `bank saving −${gbp(o.bankDisc)}` : '', o.pennyOff ? `unique pennies −${o.pennyOff}p` : '', o.credit ? `credit −${gbp(o.credit)}` : '', o.cash ? `cash −${gbp(o.cash)}` : ''].filter(Boolean);
        return o.source === 'online' && !o.cardOnly && o.status !== 'confirmed' && due > 0 ? `<b class="to-pay">${gbp(due)}</b><br><small class="muted">to the penny</small>${bits.length ? `<br><small class="muted">${bits.join(' · ')}</small>` : ''}` : `<b>${o.total ? gbp(o.total) : '£0.00'}</b>${bits.length ? `<br><small class="muted">${bits.join(' · ')}</small>` : ''}`; })()}</td>
      <td class="muted">${dt(o.createdAt)}${o.status === 'pending' ? `<br><small>holds until ${dt(o.expiresAt)}</small>` : o.confirmedBy ? `<br><small>by ${esc(o.confirmedBy)}</small>` : ''}</td>
      <td><span class="st ${o.status}">${ST[o.status]}</span>${o.card?.problem ? `<br><small style="color:var(--red,#ff4d6d);font-weight:700">⚠️ ${esc(o.card.problem)}</small>` : ''}${o.card?.reported ? `<br><small style="color:var(--blue2);font-weight:700">💳 card ${o.card.verified ? 'paid' : 'reported – check DNA'}</small>` : ''}</td>
      <td style="white-space:nowrap;text-align:right">${o.status === 'pending' ? `<button class="btn sm" data-confirm="${o.id}">Confirm order</button> <button class="btn ghost sm" data-cancel="${o.id}">Cancel</button>`
        : o.status === 'expired' || o.status === 'cancelled' ? `<button class="btn ghost sm" data-reopen="${o.id}">Reopen</button> <button class="btn sm" data-confirm="${o.id}">Confirm anyway</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No orders match.</td></tr>';
  };
  $('#main').innerHTML = `<div class="ph"><h1 class="d">Orders</h1><div class="row"><button class="btn ghost" id="stmtBtn">🏦 Match bank statement</button><button class="btn" data-postal>+ Add postal entry</button></div></div>
    <div class="filters">${['pending', 'confirmed', 'expired', 'cancelled', 'all'].map(s => `<button class="chipf ${ordFilter === s ? 'on' : ''}" data-of="${s}">${s === 'all' ? 'All' : ST[s]}<span class="n">${counts(s)}</span></button>`).join('')}
      <input id="oq" placeholder="Search reference, name, email, phone, town…" value="${esc(ordQ)}" style="max-width:340px;margin-left:auto"></div>
    ${ordFilter === 'pending' ? '<p class="muted" style="margin-top:0">Match the <b>reference</b> on your bank statement to an order below and check the amount, then press <b>Confirm order</b>. Every ticket in that order turns green and the customer gets an email.</p>' : ''}
    <div class="card tw" style="padding:0"><table class="t ord-t"><thead><tr><th>Reference</th><th>Customer</th><th>Entries</th><th>Value</th><th>Placed</th><th>Status</th><th></th></tr></thead><tbody id="otb"></tbody></table></div>`;
  draw();
  $('#oq').oninput = e => { ordQ = e.target.value; draw(); };
  const sb = $('#stmtBtn'); if (sb) sb.onclick = stmtDialog;
}
function orderAction(id, act) {
  const o = (cache.orders || []).find(x => x.id === id);
  const go = async () => { await api(`/api/admin/orders/${id}/${act}`, {}); toast(act === 'confirm' ? 'Order confirmed – customer emailed' : act === 'cancel' ? 'Order cancelled – tickets released' : 'Order reopened'); route(); };
  if (!o) return confirmDlg('Confirm order?', 'Only confirm once the payment is in your bank account.', 'Yes, payment received', go);
  const items = o.items.map(i => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--line)"><span>${esc(i.title)} ×${i.qty}<br><small class="muted">#${i.tickets.join(', #')}</small></span><b>${gbp(i.amount)}</b></div>`).join('');
  if (act === 'confirm') confirmDlg(`Confirm ${esc(o.ref)}?`, `<p>Only confirm when <b>${gbp(o.total)}</b> with reference <b class="ref">${esc(o.ref)}</b> is in your bank account from <b>${esc(o.user?.name)}</b>.</p>${items}<p class="muted" style="font-size:13px">All entries in this order will turn green and the customer will be emailed.</p>`, 'Yes – payment received', go);
  else if (act === 'cancel') confirmDlg(`Cancel ${esc(o.ref)}?`, `This releases ${o.items.reduce((a, i) => a + i.qty, 0)} reserved tickets back on sale.${items}`, 'Cancel order', go, true);
  else confirmDlg(`Reopen ${esc(o.ref)}?`, 'Reserves the tickets again (new numbers if the old ones were taken).', 'Reopen', go);
}
async function postalDialog() {
  const comps = (await api('/api/admin/comps')).filter(c => c.status === 'live' || c.status === 'ended');
  openDlg(`<button class="x" data-close>×</button><h3 class="d">Add postal entry</h3><p class="muted" style="margin:4px 0 0">Free entry route – added as confirmed tickets.</p>
    <form id="pf"><label>Competition</label><select id="pc" required>${comps.map(c => `<option value="${c.id}">${esc(c.title)} (${c.unlimited ? 'open-ended' : c.available + ' left'}${c.eligibility === 'kent' ? ', Kent only' : ''})</option>`).join('')}</select>
    <div class="formgrid"><div><label>First name</label><input id="pfn" required></div><div><label>Last name</label><input id="pln" required></div>
    <div><label>Town</label><select id="pt" required><option value="">Choose…</option>${TOWNS.map(t => `<option>${esc(t)}</option>`).join('')}</select></div><div><label>Tickets</label><input id="pq" type="number" min="1" value="1"></div>
    <div><label>Email (optional – links to their account)</label><input id="pe" type="email"></div><div><label>Phone (optional)</label><input id="pp"></div>
    <div class="full"><label>Address (optional)</label><input id="pa"></div></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn" ${comps.length ? '' : 'disabled'}>Add entry</button></div><div class="err" id="perr"></div></form>`, 'wide');
  $('#pf').onsubmit = async e => { e.preventDefault();
    try { const o = await api('/api/admin/postal', { compId: $('#pc').value, first: $('#pfn').value, last: $('#pln').value, town: $('#pt').value, qty: $('#pq').value, email: $('#pe').value, phone: $('#pp').value, address: $('#pa').value });
      closeDlg(); toast(`Added ticket${o.items[0].tickets.length > 1 ? 's' : ''} #${o.items[0].tickets.join(', #')}`); route(); } catch (er) { $('#perr').textContent = er.message; } };
}

// ================= COMPETITIONS =================
async function vComps() {
  const list = await api('/api/admin/comps'); cache.comps = list;
  const order = { live: 0, soldout: 1, ended: 1, drawing: 2, hidden: 3, closed: 4, drawn: 5 };
  list.sort((a, b) => order[a.status] - order[b.status]);
  $('#main').innerHTML = `<div class="ph"><h1 class="d">Competitions</h1><a class="btn" href="#comp-edit-new">+ Create competition</a></div>
  ${list.length ? `<div class="complist">${list.map(c => `<div class="ccx"><div class="top"><div class="th" style="${img(c.image)}"></div><div style="min-width:0;flex:1">
    <b>${esc(c.title)}</b><div style="margin:4px 0"><span class="badge2 b-${c.status}">${c.status}</span> ${c.type === 'free' ? '<span class="badge2 b-free">free</span>' : ''} ${c.featured ? '<span class="badge2 b-drawing">featured</span>' : ''} ${c.eligibility === 'kent' ? '<span class="badge2 b-closed">Kent only</span>' : ''} ${c.appOnly ? '<span class="badge2 b-drawing">📱 app only</span>' : ''} ${c.gameMode && c.gameMode !== 'standard' ? `<span class="badge2 b-free">${{ duck: '🦆 duck race', race: '🏁 race', banker: '💼 banker', hilo: '🃏 higher or lower' }[c.gameMode]}</span>` : ''}</div>
    <small class="muted">${esc(c.category)} · ${c.type === 'free' ? (c.maxPerPerson ? c.maxPerPerson + ' free each' : 'free, no limit') : gbp(c.price)} · ${c.ticketMode === 'pick' ? 'pick numbers' : 'random numbers'} · ${c.endsAt ? 'ends ' + dt(c.endsAt) : 'until sold out'}</small>
    <div class="prog" style="margin-top:8px"><i style="width:${c.pct}%"></i></div><small class="muted">${c.unlimited ? `${c.confirmed} entries · open-ended` : `${c.confirmed} confirmed · ${c.pending} pending · ${c.available} left of ${c.totalTickets}`}</small></div></div>
    <div class="act"><a class="btn ghost sm" href="#comp-edit-${c.id}">Edit</a>${['soldout', 'ended', 'drawing'].includes(c.status) ? `<a class="btn sm" href="#draw-${c.id}">🎡 Draw</a>` : c.status === 'drawn' ? `<a class="btn ghost sm" href="#draw-${c.id}">Winners</a>` : ''}<a class="btn ghost sm" href="./#comp-${c.id}" target="_blank" rel="noopener">View ↗</a></div></div>`).join('')}</div>`
    : '<div class="empty">No competitions yet. <a href="#comp-edit-new">Create your first one</a>.</div>'}`;
}
// stats bar shown at the top of every competition's admin pages
async function compStats(id) {
  const box = $('#cStats'); if (!box) return;
  let d; try { d = await api(`/api/admin/comps/${id}/stats`); } catch { box.remove(); return; }
  const sold = d.confirmed + d.pending, t = d.top[0];
  box.innerHTML = `<div class="cstats">
    ${'revenue' in d ? `<div class="cs"><small>Revenue</small><b class="g">${gbp(d.revenue)}</b><span>${d.pendingRevenue ? `+ ${gbp(d.pendingRevenue)} waiting for payment` : 'all confirmed'}${d.discount ? ` · ${gbp(d.discount)} promo discounts` : ''}</span></div>` : ''}
    <button class="cs-dl" data-export="entries" data-id="${id}" title="Download every entry as a spreadsheet (CSV)">⬇️ Entries CSV</button>
    <div class="cs"><small>Tickets sold</small><b>${sold.toLocaleString()}${d.total ? `<i> / ${d.total.toLocaleString()}</i>` : ''}</b><span>${d.confirmed.toLocaleString()} confirmed · ${d.pending.toLocaleString()} pending${d.bonus ? ` · ${d.bonus} free bundle tickets` : ''}</span>${d.total ? `<div class="cs-bar"><i style="width:${Math.min(100, d.confirmed / d.total * 100)}%"></i><i class="p" style="width:${Math.min(100, d.pending / d.total * 100)}%"></i></div>` : ''}</div>
    <div class="cs"><small>Who has the most</small>${t ? `<b class="cs-name">${t.userId ? `<a href="#customer-${t.userId}">${esc(t.name)}</a>` : esc(t.name)}</b><span>${t.tickets} ticket${t.tickets === 1 ? "" : "s"}${d.total ? ` · ${Math.round(t.tickets / d.total * 1000) / 10}% of all` : ''} · 📍 ${esc(t.town || '—')}</span>` : '<b>–</b><span>No entries yet</span>'}
      ${d.top.length > 1 ? `<details><summary>Top ${d.top.length} · ${d.players} players · avg ${d.avg}</summary><ol>${d.top.map(x => `<li>${x.userId ? `<a href="#customer-${x.userId}">${esc(x.name)}</a>` : esc(x.name)} <em>${x.tickets}</em></li>`).join('')}</ol></details>` : ''}</div>
  </div>`;
}
async function vCompEdit(id) {
  const [list, settings] = await Promise.all([api('/api/admin/comps'), api('/api/admin/settings')]);
  const c = id === 'new' ? { type: 'paid', quickAdd: [1, 5, 10, 25, 50], prizes: [], category: settings.categories[0], status: 'live' } : list.find(x => x.id === id);
  if (!c) throw new Error('Competition not found.');
  const drawn = (c.winners || []).length;
  const local = s => { if (!s) return ''; const d = new Date(s); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
  let prizes = c.prizes.length ? c.prizes.slice() : [''];
  let CH = { charities: [], used: [] }; try { CH = await api('/api/admin/charity'); } catch { }
  const bund = (c.bundles || []).concat([{}, {}, {}]).slice(0, 3);
  $('#main').innerHTML = `<div class="ph"><h1 class="d">${id === 'new' ? 'Create competition' : 'Edit competition'}</h1><a class="btn ghost" href="#comps">← Back</a></div>
  ${id === 'new' ? '' : '<div id="cStats" style="max-width:980px"></div>'}
  <form class="card" id="cf" style="max-width:980px"><div class="formgrid">
    <div class="full"><label>Competition name</label><input id="fTitle" value="${esc(c.title)}" required maxlength="120" placeholder="e.g. TAG Heuer Aquaracer"></div>
    <div><label>Picture</label><div class="imgdrop"><div class="th" id="imgPrev" style="${img(c.image)}">${c.image ? '' : 'No image'}</div><div><input type="file" id="fImg" accept="image/jpeg,image/png,image/webp"><div class="hint">Square images look best (at least 800×800). JPG, PNG or WebP, max 5 MB.</div></div></div><input type="hidden" id="fImgUrl" value="${esc(c.image || '')}"></div>
    <div><label>Description</label><textarea id="fDesc" rows="9" maxlength="5000">${esc(c.description)}</textarea></div>
    <div class="full"><label>Prizes – in the order they're drawn (lowest first, top prize last)</label><div id="prizes"></div>
      <button type="button" class="btn ghost sm" id="addPrize">+ Add another prize</button><div class="hint">One line = one winner. Leave a single line (or empty) for a one-winner competition.${drawn ? ` <b style="color:var(--orange)">${drawn} already drawn – those can't be changed.</b>` : ''}</div></div>
    <div class="full fsec"><h4>🎟️ Tickets &amp; price</h4></div>
    <div><label>Entry type</label><select id="fType" ${c.confirmed + c.pending ? 'disabled' : ''}><option value="paid" ${c.type !== 'free' ? 'selected' : ''}>Paid – customers pay by bank transfer</option><option value="free" ${c.type === 'free' ? 'selected' : ''}>Free – entries confirmed instantly</option></select></div>
    <div><label>Category</label><input id="fCat" list="catlist" value="${esc(c.category)}" required><datalist id="catlist">${settings.categories.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
    <div class="paid"><label>Entry cost (£)</label><input id="fPrice" type="number" step="0.01" min="0.01" value="${c.price ? (c.price / 100).toFixed(2) : ''}"></div>
    <div><label>Cash alternative (optional)</label><input id="fCash" value="${esc(c.cashAlt)}" placeholder="e.g. £1,500"></div>
    <div class="free full"><label class="switch" style="margin-top:4px"><input type="checkbox" id="fUnl" ${c.unlimited ? 'checked' : ''}> No ticket limit – open to everyone, drawn on the end date</label></div>
    <div class="lim"><label>Total tickets</label><input id="fTotal" type="number" min="1" max="100000" value="${c.totalTickets || ''}"></div>
    <div><label><span class="paid">Max tickets per person (0 = no limit)</span><span class="free">Free tickets per person (0 = no limit)</span></label><input id="fMax" type="number" min="0" value="${c.maxPerPerson ?? 0}"></div>
    <div class="lim"><label>Ticket numbers</label><select id="fMode"><option value="random" ${c.ticketMode !== 'pick' ? 'selected' : ''}>Randomly allocated</option><option value="pick" ${c.ticketMode === 'pick' ? 'selected' : ''}>Customers pick their numbers</option></select><div class="hint">With "pick", customers choose from a number grid (or use Lucky dip).</div></div>
    <div class="full fsec"><h4>👥 Who can enter</h4></div>
    <div><label>Who can enter</label><select id="fElig"><option value="all" ${c.eligibility !== 'kent' ? 'selected' : ''}>Everyone (UK)</option><option value="kent" ${c.eligibility === 'kent' ? 'selected' : ''}>Kent residents only</option></select><div class="hint">Checked against the town on the customer's account.</div></div>
    <div style="display:flex;flex-direction:column;justify-content:end;gap:6px"><label class="switch"><input type="checkbox" id="fApp" ${c.appOnly ? 'checked' : ''}> 📱 App exclusive – must enter in the app</label><label class="switch"><input type="checkbox" id="fFeat" ${c.featured ? 'checked' : ''}> ⭐ Feature in the homepage hero</label></div>
    <div class="full fsec"><h4>🎁 Offers</h4></div>
    <div class="paid full"><label>🎁 Bundle offers – buy X get Y free (optional)</label><div class="bund-row">${bund.map((x, i) => `<span>Buy <input data-bb="${i}" type="number" min="1" value="${x.buy || ''}" placeholder="5"> get <input data-bf="${i}" type="number" min="1" value="${x.free || ''}" placeholder="1"> free</span>`).join('')}</div><div class="hint">Free tickets come off the total and count towards the per-person limit. Customers get the best offer they qualify for, repeated – e.g. buy 5 get 1 free: 10 tickets = 2 free.</div></div>
    <div class="paid full"><label>⚡ Instant wins (optional)</label><div class="iw-rows">${(c.instant || []).concat([{}, {}, {}]).slice(0, Math.max(3, (c.instant || []).length + 1)).map((x, i) => `<div><span class="iw-icon"><input data-iwi="${i}" placeholder="🎁" value="${esc(/^(\/uploads|data:)/.test(x.icon || '') ? '' : x.icon || '')}" data-img="${esc(/^(\/uploads|data:)/.test(x.icon || '') ? x.icon : '')}" title="Icon – an emoji, or tap 📷 to upload an image" style="${/^(\/uploads|data:)/.test(x.icon || '') ? `background-image:url('${esc(x.icon)}')` : ''}"><label class="iw-up" title="Upload an icon image">📷<input type="file" accept="image/png,image/jpeg,image/webp" data-iwup="${i}" hidden></label></span><input data-iwp="${i}" placeholder="Prize, e.g. £10 Cash" value="${esc(x.prize || '')}"><input data-iwc="${i}" type="number" min="0" step="0.01" placeholder="Amount £" value="${x.cash ? x.cash / 100 : ''}"><select data-iwk="${i}" title="Paid into"><option value="cash" ${!x.credit ? 'selected' : ''}>💷 Cash</option><option value="credit" ${x.credit ? 'selected' : ''}>🎟️ Credit</option></select><input data-iwv="${i}" type="number" min="0" step="0.01" placeholder="Value £ (non-cash)" value="${x.value ? x.value / 100 : ''}"><input data-iwn="${i}" type="number" min="0" placeholder="How many" value="${x.count || ''}"></div>`).join('')}</div>
      <div class="iw-game"><div><label>🎮 How players reveal them</label><select id="fIwGame">${[['none', 'No game – shown straight away'], ['plinko', '🔴 Plinko – drop one or drop all (great for 1p prizes)'], ['wheel', '🎡 Spin the Wheel'], ['scratch', '🃏 Scratchcards – 21 to a screen'], ['slots', '🎰 Slots – uses your prize icons'], ['pinata', '🪅 Smash the Piñata'], ['penalty', '⚽ Penalty Shoot-out'], ['bingo', '🎱 Bingo – complete a line to win']].map(([v, l]) => `<option value="${v}" ${(c.iwGame || (id === 'new' ? 'scratch' : 'none')) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div><label>Style</label><select id="fIwTheme">${[['auto', 'Current season (Game Centre)'], ['standard', 'Standard'], ['christmas', 'Christmas'], ['halloween', 'Halloween'], ['birthday', 'Birthday']].map(([v, l]) => `<option value="${v}" ${(c.iwTheme || 'auto') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
      <div class="hint">Winning numbers are picked from unsold tickets when you save and shown on the prize page. With a game, players reveal their tickets by playing and each win is paid the moment it's revealed (or after 24 hours if they don't play); without one it's paid as soon as their payment is confirmed. Needs a fixed ticket total; tickets are always given out at random.${(c.iwTickets || []).length ? ` <b>${c.iwTickets.filter(x => x.won).length} of ${c.iwTickets.length} won so far.</b>` : ''}</div></div>
    <div class="full fsec"><h4>📅 Dates &amp; visibility</h4></div>
    <div><label>End date (optional)</label><input id="fEnd" type="datetime-local" value="${local(c.endsAt)}"><div class="hint">Leave empty to run until sold out.</div></div>
    <div><label>Visibility</label><select id="fStatus"><option value="live" ${['live', 'soldout', 'ended'].includes(c.status) ? 'selected' : ''}>Live</option><option value="hidden" ${c.status === 'hidden' ? 'selected' : ''}>Hidden (draft)</option><option value="closed" ${c.status === 'closed' ? 'selected' : ''}>Closed</option><option value="scheduled" ${c.status === 'scheduled' ? 'selected' : ''}>Scheduled launch</option></select></div>
    <div class="sched ${c.status === 'scheduled' ? '' : 'hidden'}" id="schedBox"><label>Goes live at</label><input id="fGoLive" type="datetime-local" value="${c.goLiveAt ? (d => { d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); })(new Date(c.goLiveAt)) : ''}"><label class="switch" style="margin-top:6px"><input type="checkbox" id="fLaunchPush" ${c.launchPush !== false ? 'checked' : ''}> Send an app notification to everyone when it goes live</label><div class="hint">It shows as “Coming soon” with a countdown until then. People who save it get an alert at launch.</div></div>
    <div class="full fsec"><h4>❤️ Charity</h4></div>
    <div><label>Charity donation (£, optional)</label><input id="fCharAmt" type="number" min="0" step="1" value="${c.charityAmount ? Math.round(c.charityAmount / 100) : ''}" placeholder="e.g. 1000"></div>
    <div><label>Charity name</label><input id="fCharName" list="charList" value="${esc(c.charityName || '')}" placeholder="e.g. Demelza House"><datalist id="charList">${[...new Set([...(CH.charities || []).map(x => x.name), ...(CH.used || [])])].map(n => `<option value="${esc(n)}">`).join('')}</datalist><div class="hint">Shown on the competition page: "£1,000 donated to … when sold out".</div></div>
    <div class="full gamebox"><h4>🎲 How the winner is drawn</h4><div class="formgrid">
      <div class="full"><label>Draw style</label><select id="fDraw">
        <optgroup label="Drawn on the live stream">${[['number', '🔢 Google number + name reel'], ['wheel', '🎡 Wheel spin'], ['reel', '🎰 Name reveal (slot reel)'], ['plinko', '🪂 Sheppey Drop (Plinko – a ball for each digit)'], ['scratch', '🍀 Scratch card reveal'], ['lms', '☠️ Last Man Standing']].map(([v, l]) => `<option value="std:${v}" ${(!c.gameMode || c.gameMode === 'standard') && (c.drawMethod || (c.type === 'free' ? 'wheel' : 'number')) === v ? 'selected' : ''}>${l}</option>`).join('')}</optgroup>
        <optgroup label="Live games (played when it sells out)">${[['duck', '🦆 Duck Race – each entry is a numbered duck'], ['race', '🏁 Race Around Sheppey – each entry is a car'], ['banker', '💼 Elite Banker – deal or no deal'], ['hilo', '🃏 Higher or Lower – prize ladder']].map(([v, l]) => `<option value="game:${v}" ${c.gameMode === v ? 'selected' : ''}>${l}</option>`).join('')}</optgroup></select>
        <input type="hidden" id="fGame" value="${esc(c.gameMode || 'standard')}"><input type="hidden" id="fDM" value="${esc(c.drawMethod || (c.type === 'free' ? 'wheel' : 'number'))}">
        <div class="hint">Every winner is picked by the provable random draw – this is just how it's revealed. You can still switch the reveal for each prize in the draw studio.</div></div>
      <div class="g-hilo"><label>Number of players</label><input id="fHP" type="number" min="1" max="10" value="${c.hiloPlayers || 1}"><div class="hint">Picked at random from the entrants (one go per person).</div></div>
      <div class="g-hilo"><label>Top of the ladder (£)</label><input id="fHM" type="number" min="1" step="1" value="${c.hiloMax ? Math.round(c.hiloMax / 100) : ''}" placeholder="e.g. 100"><div class="hint" id="hlEx">10 rungs scaling up to this. Safe levels at rungs 1, 4 and 7.</div></div>
      <div class="g-race"><label>Number of races</label><input id="fRaces" type="number" min="1" max="20" value="${c.races || 1}"><div class="hint">One race (and one winner) per prize. Each race has up to 25 – e.g. 50 tickets, 2 races = 25 in each.</div></div>
      <div class="g-race"><label>Laps of the island (default)</label><select id="fLaps">${[1, 2, 3, 4, 5].map(n => `<option ${n === (c.raceLaps || (c.gameMode === 'race' ? 2 : 1)) ? 'selected' : ''}>${n}</option>`).join('')}</select><div class="hint">You can change this when you start each race.</div></div>
      <div class="g-banker"><label>Number of players</label><input id="fBP" type="number" min="1" max="10" value="${c.bankerPlayers || 1}"><div class="hint">Drawn at random from the entrants (one per person).</div></div>
      <div class="g-banker"><label>Top box value (£)</label><input id="fBM" type="number" min="1" step="1" value="${c.bankerMax ? Math.round(c.bankerMax / 100) : ''}" placeholder="e.g. 50"><div class="hint">12 boxes from 1% up to this. The Banker's offer is based on the average of the boxes left.</div></div>
      <div class="g-pay"><label>Pay the prize automatically into…</label><select id="fPay">${(() => { const pv = c.prizePay || (c.cashPrize ? 'cash' : 'none'); return [['none', 'Nothing – I’ll arrange the prize myself'], ['cash', '💷 Their cash balance (can withdraw)'], ['credit', '🎟️ Their credit balance (to spend on entries)'], ['tickets', '🎫 Free tickets into another competition']].map(([v, l]) => `<option value="${v}" ${pv === v ? 'selected' : ''}>${l}</option>`).join(''); })()}</select><div class="g-tix row" style="margin-top:8px;gap:8px;flex-wrap:wrap"><select id="fTixComp" style="flex:2;min-width:180px"><option value="">Which competition?</option>${list.filter(x => x.id !== c.id && x.type === 'paid' && !x.auto && ['live', 'scheduled'].includes(x.status)).map(x => `<option value="${x.id}" ${c.prizeTicketsComp === x.id ? 'selected' : ''}>${esc(x.title)}${x.status === 'scheduled' ? ' (coming soon)' : ''}</option>`).join('')}</select><input id="fTixQty" type="number" min="1" max="1000" step="1" placeholder="How many tickets" value="${c.prizeTicketsQty || ''}" style="flex:1;min-width:120px"></div><div class="hint" id="payHint">The amount is taken from each prize line, e.g. <b>£25 Credit</b>. It's paid the moment the reveal or race animation finishes.</div></div>
      <div class="g-cash"><label>Prize value for the winners totaliser (£)</label><input id="fWorth" type="number" min="0" step="1" value="${c.prizeWorth ? Math.round(c.prizeWorth / 100) : ''}" placeholder="worked out from the prize name if blank"></div>
    </div><div class="hint" id="gEx"></div></div>
    ${drawn ? `<div class="full"><label>Winner photo – replaces the prize picture in Recent winners</label><div class="imgdrop"><div class="th" id="wpPrev" style="${img(c.winnerPhoto)}">${c.winnerPhoto ? '' : 'No photo'}</div><div><input type="file" id="fWp" accept="image/jpeg,image/png,image/webp"><div class="hint">A photo of the winner with their prize.</div>${c.winnerPhoto ? '<button type="button" class="btn ghost sm" id="wpRm" style="margin-top:6px">Remove photo</button>' : ''}</div></div></div>` : ''}
    ${drawn ? `<div class="full"><label>Winner's quote (optional)</label><textarea id="fWq" rows="2" maxlength="300" placeholder="e.g. Can't believe it – thank you so much!">${esc(c.winnerQuote || '')}</textarea></div>
      <div class="full"><label>Link to the live draw video (Facebook, YouTube…)</label><input id="fWv" value="${esc(c.videoUrl || '')}" placeholder="https://www.facebook.com/…"><button type="button" class="btn ghost sm" id="wsSave" style="margin-top:6px">Save winner story</button></div>` : ''}
  </div>
  <div style="display:flex;gap:8px;justify-content:space-between;margin-top:20px;flex-wrap:wrap"><div>${id !== 'new' && !(c.confirmed + c.pending) ? '<button type="button" class="btn red" id="delC">Delete</button>' : ''}</div><div style="display:flex;gap:8px"><a class="btn ghost" href="#comps">Cancel</a><button class="btn">${id === 'new' ? 'Create competition' : 'Save changes'}</button></div></div>
  <div class="err" id="cerr"></div></form>`;
  const syncType = () => { const f = $('#fType').value === 'free'; const u = f && $('#fUnl').checked; $$('.paid').forEach(e => e.classList.toggle('hidden', f)); $$('.free').forEach(e => e.classList.toggle('hidden', !f)); $$('.lim').forEach(e => e.classList.toggle('hidden', u)); };
  let appTouched = id !== 'new'; $('#fApp').addEventListener('change', () => { appTouched = true; });
  $('#fType').onchange = () => { syncType(); if (!appTouched) $('#fApp').checked = $('#fType').value === 'free'; }; $('#fUnl').onchange = syncType; syncType();
  $('#fDraw').onchange = () => { const [k, v] = $('#fDraw').value.split(':'); $('#fGame').value = k === 'game' ? v : 'standard'; if (k === 'std') $('#fDM').value = v; syncGame(); };
  const syncGame = () => { const g = $('#fGame').value; { const gm = g === 'banker' || g === 'hilo', fp = $('#fPay'); fp.querySelector('[value=none]').disabled = gm; if (gm && fp.value === 'none') fp.value = 'cash';
      fp.querySelector('[value=tickets]').disabled = gm; if (gm && fp.value === 'tickets') fp.value = 'cash'; $$('.g-tix').forEach(e => e.classList.toggle('hidden', fp.value !== 'tickets'));
      $('#payHint').innerHTML = gm ? 'Whatever they win in the game is paid in as soon as their game ends.' : fp.value === 'tickets' ? 'Each winner gets this many free tickets in the competition you choose – entered automatically, in their name, the moment the race or reveal finishes. Write the prize line as e.g. <b>10 tickets – £500 Cash</b>.' : fp.value === 'none' ? 'Use this for physical prizes, or pay cash/credit by hand from the customer’s page.' : `The amount is taken from each prize line, e.g. <b>£25 ${fp.value === 'credit' ? 'Credit' : 'Cash'}</b> – paid the moment the reveal or race animation finishes.`; } $$('.g-banker').forEach(e => e.classList.toggle('hidden', g !== 'banker')); $$('.g-cash').forEach(e => e.classList.toggle('hidden', g === 'banker')); $$('.g-race').forEach(e => e.classList.toggle('hidden', g !== 'duck' && g !== 'race')); $$('.g-std').forEach(e => e.classList.toggle('hidden', g !== 'standard')); $$('.g-hilo').forEach(e => e.classList.toggle('hidden', g !== 'hilo')); if (g === 'hilo') $$('.g-cash').forEach(e => e.classList.add('hidden'));
    const hm = +$('#fHM').value || 100; $('#hlEx').textContent = `Ladder: ${[0.02, 0.04, 0.07, 0.1, 0.15, 0.22, 0.32, 0.45, 0.65, 1].map(f => '£' + (Math.round(hm * f * 2) / 2)).join(' · ')} (safe at rungs 1, 4, 7)`;
    const rc = +$('#fRaces').value || 1;
    const tk = +$('#fTotal').value || 0, pr = parseFloat($('#fPrice').value || 0), mx = +$('#fBM').value || 0, pl = +$('#fBP').value || 1;
    $('#gEx').innerHTML = g === 'banker' ? `${tk || 100} tickets × £${(pr || 1).toFixed(2)} = <b>£${((tk || 100) * (pr || 1)).toFixed(2)}</b> in · ${pl} player${pl > 1 ? 's' : ''}, 22 boxes up to £${mx || 50} – <b>max £${pl * (mx || 50)}</b> out, typically around <b>£${Math.round(pl * (mx || 50) * 0.33)}</b>.` : (g === 'duck' || g === 'race') ? `${rc} race${rc > 1 ? 's' : ''} · ${Math.ceil((tk || 25 * rc) / rc)} ${g === 'duck' ? 'ducks' : 'cars'} per race (max 25)${tk > 25 * rc ? ` – <b style="color:var(--red2)">too many tickets: max ${25 * rc}</b>` : ''}. Tickets 1–${Math.ceil((tk || 25) / rc)} are race 1${rc > 1 ? ', the next lot race 2, and so on' : ''}.` : ''; };
  ['fGame', 'fBP', 'fBM', 'fTotal', 'fPrice', 'fRaces', 'fHM'].forEach(k => $('#' + k).addEventListener('input', syncGame)); $('#fPay').addEventListener('change', syncGame); syncGame();
  const wp = $('#fWp'); if (wp) wp.onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const dataUrl = await shrink(f); const r = await api('/api/admin/upload', { dataUrl }); await api(`/api/admin/comps/${id}/winner-photo`, { photo: r.url }); $('#wpPrev').style.backgroundImage = `url('${r.url}')`; $('#wpPrev').textContent = ''; toast('Winner photo saved'); } catch (er) { $('#cerr').textContent = er.message; } };
  const wss = $('#wsSave'); if (wss) wss.onclick = async () => { try { await api(`/api/admin/comps/${id}/winner-photo`, { quote: $('#fWq').value, video: $('#fWv').value }); toast('Winner story saved'); } catch (er) { $('#cerr').textContent = er.message; } };
  const wpr = $('#wpRm'); if (wpr) wpr.onclick = async () => { await api(`/api/admin/comps/${id}/winner-photo`, { photo: '' }); toast('Photo removed'); vCompEdit(id); };
  const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
  const drawPrizes = () => {
    $('#prizes').innerHTML = prizes.map((p, i) => `<div class="prow"><span class="ord">${prizes.length === 1 ? 'Prize' : i === prizes.length - 1 ? 'Drawn last' : 'Drawn ' + ordinal(i + 1)}</span><input data-pi="${i}" value="${esc(p)}" placeholder="${i === prizes.length - 1 ? 'e.g. £1,000 (top prize)' : 'e.g. £100'}" ${i < drawn ? 'disabled' : ''}>
      <button type="button" class="btn ghost sm" data-pu="${i}" ${i <= drawn ? 'disabled' : ''}>↑</button><button type="button" class="btn ghost sm" data-pd="${i}" ${i < drawn || i === prizes.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="btn ghost sm" data-px="${i}" ${i < drawn || prizes.length === 1 ? 'disabled' : ''}>✕</button></div>`).join('');
  };
  drawPrizes();
  $('#prizes').oninput = e => { if (e.target.dataset.pi) prizes[+e.target.dataset.pi] = e.target.value; };
  $('#prizes').onclick = e => { const b = e.target.closest('button'); if (!b) return; const i = +(b.dataset.pu ?? b.dataset.pd ?? b.dataset.px);
    if (b.dataset.pu) [prizes[i - 1], prizes[i]] = [prizes[i], prizes[i - 1]]; if (b.dataset.pd) [prizes[i + 1], prizes[i]] = [prizes[i], prizes[i + 1]]; if (b.dataset.px) prizes.splice(i, 1); drawPrizes(); };
  $('#addPrize').onclick = () => { prizes.push(''); drawPrizes(); $$('#prizes input').pop().focus(); };
  $$('[data-iwup]').forEach(inp => inp.onchange = async e => { const f = e.target.files[0]; if (!f) return; const ic = $(`[data-iwi="${inp.dataset.iwup}"]`);
    try { const dataUrl = await shrink(f, 160); const r = await api('/api/admin/upload', { dataUrl }); ic.dataset.img = r.url; ic.value = ''; ic.style.backgroundImage = `url('${r.url}')`; toast('Icon uploaded'); } catch (er) { toast(er.message); } });
  $$('[data-iwi]').forEach(ic => ic.addEventListener('input', () => { ic.dataset.img = ''; ic.style.backgroundImage = ''; }));
  $('#fImg').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try { const dataUrl = await shrink(f); const r = await api('/api/admin/upload', { dataUrl }); $('#fImgUrl').value = r.url; $('#imgPrev').style.backgroundImage = `url('${r.url}')`; $('#imgPrev').textContent = ''; }
    catch (er) { $('#cerr').textContent = er.message; }
  };
  $('#cf').onsubmit = async e => {
    e.preventDefault(); $('#cerr').textContent = '';
    try {
      const body = { id: id === 'new' ? undefined : id, title: $('#fTitle').value, category: $('#fCat').value, type: $('#fType').value, price: Math.round(parseFloat($('#fPrice').value || '0') * 100),
        cashAlt: $('#fCash').value, totalTickets: +$('#fTotal').value, maxPerPerson: +$('#fMax').value, endsAt: $('#fEnd').value ? new Date($('#fEnd').value).toISOString() : null,
        status: $('#fStatus').value, goLiveAt: $('#fGoLive') && $('#fGoLive').value ? new Date($('#fGoLive').value).toISOString() : '', launchPush: $('#fLaunchPush') ? $('#fLaunchPush').checked : false, featured: $('#fFeat').checked, charityName: $('#fCharName').value, ticketMode: $('#fMode').value, eligibility: $('#fElig').value, unlimited: $('#fType').value === 'free' && $('#fUnl').checked, charityAmount: Math.round(parseFloat($('#fCharAmt').value || '0') * 100), image: $('#fImgUrl').value, description: $('#fDesc').value,
        iwGame: $('#fIwGame') ? $('#fIwGame').value : 'none', iwTheme: $('#fIwTheme') ? $('#fIwTheme').value : 'auto',
        instant: $$('[data-iwp]').map(el => { const i = el.dataset.iwp, ic = $(`[data-iwi="${i}"]`); return { icon: ic.dataset.img || ic.value.trim(), credit: $(`[data-iwk="${i}"]`).value === 'credit', prize: el.value.trim(), cash: Math.round((parseFloat($(`[data-iwc="${i}"]`).value) || 0) * 100), value: Math.round((parseFloat($(`[data-iwv="${i}"]`).value) || 0) * 100), count: +$(`[data-iwn="${i}"]`).value || 0 }; }).filter(x => x.prize && x.count),
        bundles: [0, 1, 2].map(i => ({ buy: +$(`[data-bb="${i}"]`).value, free: +$(`[data-bf="${i}"]`).value })).filter(x => x.buy && x.free),
        gameMode: $('#fGame').value, appOnly: $('#fApp').checked, bankerPlayers: +$('#fBP').value, bankerMax: Math.round((parseFloat($('#fBM').value) || 0) * 100), prizePay: $('#fPay').value, prizeTicketsComp: $('#fTixComp').value, prizeTicketsQty: +$('#fTixQty').value || 0, races: +$('#fRaces').value, raceLaps: +$('#fLaps').value, drawMethod: $('#fDM').value, hiloPlayers: +$('#fHP').value, hiloMax: Math.round((parseFloat($('#fHM').value) || 0) * 100), prizeWorth: Math.round((parseFloat($('#fWorth').value) || 0) * 100), prizes: prizes.map(x => x.trim()).filter(Boolean).join('\n') };
      if (body.prizes.split('\n').length === 1 && body.prizes === body.title) body.prizes = '';
      await api('/api/admin/comps', body); toast(id === 'new' ? 'Competition created' : 'Saved'); location.hash = 'comps';
    } catch (er) { $('#cerr').textContent = er.message; }
  };
  const del = $('#delC'); if (del) del.onclick = () => confirmDlg('Delete competition?', 'This can\'t be undone.', 'Delete', async () => { await api('/api/admin/comps/' + id, null, 'DELETE'); location.hash = 'comps'; }, true);
  const fsb = $('#fStatus'); if (fsb) fsb.addEventListener('change', () => $('#schedBox').classList.toggle('hidden', fsb.value !== 'scheduled'));
  if (id !== 'new') compStats(id);
}
function shrink(file, max = 1400) {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(im.src); res(cv.toDataURL('image/jpeg', .86)); }; im.onerror = () => rej(new Error('Could not read that image.')); im.src = URL.createObjectURL(file); });
}

// ================= DRAWS =================
async function vDraws() {
  const list = await api('/api/admin/comps');
  const ready = list.filter(c => ['soldout', 'ended', 'drawing'].includes(c.status)), live = list.filter(c => c.status === 'live' && c.confirmed > 0), done = list.filter(c => c.status === 'drawn');
  const row = (c, label, cls) => `<tr><td><div class="mini"><div class="th" style="${img(c.image)}"></div><div><b>${esc(c.title)}</b><br><small class="muted">${c.confirmed} confirmed tickets · ${(c.prizes.length || 1)} prize${c.prizes.length > 1 ? 's' : ''} · ${c.gameMode && c.gameMode !== 'standard' ? { duck: '🦆 duck race', race: '🏁 Race Around Sheppey', banker: '💼 Elite Banker', hilo: '🃏 Higher or Lower' }[c.gameMode] : c.type === 'free' ? '🎡 wheel' : '🔢 Google number'}</small></div></div></td><td><span class="badge2 b-${c.status}">${c.status}</span></td><td style="text-align:right;white-space:nowrap"><a class="btn ghost sm" href="#app-${c.id}" title="Send a notification">📣 Notify</a> <a class="btn ${cls} sm" href="#draw-${c.id}">${label}</a></td></tr>`;
  $('#main').innerHTML = `<div class="ph"><h1 class="d">Draws</h1></div>
    <div class="card" style="margin-bottom:14px"><h3>Ready to draw</h3>${ready.length ? `<table class="t">${ready.map(c => row(c, '🎡 Open draw studio', '')).join('')}</table>` : '<p class="muted">Nothing is sold out yet. Competitions appear here once every ticket is confirmed (or their end date passes).</p>'}</div>
    <div class="card" style="margin-bottom:14px"><h3>Still selling</h3>${live.length ? `<table class="t">${live.map(c => row(c, 'Draw early…', 'ghost')).join('')}</table>` : '<p class="muted">—</p>'}</div>
    <div class="card"><h3>Completed</h3>${done.length ? `<table class="t">${done.map(c => `<tr><td><b>${esc(c.title)}</b></td><td>${c.winners.map(w => `${esc(w.prize)}: #${w.ticket} ${esc(w.name)}${w.ticketsGiven ? ` <small class="muted">🎫 ${w.ticketsGiven.qty} tickets in ${esc(w.ticketsGiven.title)} (${esc(w.ticketsGiven.ref)})</small>` : ''}${w.ticketsProblem ? ` <small style="color:#ff4d6d;font-weight:700">⚠️ ${esc(w.ticketsProblem)}</small>` : ''}`).join('<br>')}</td><td style="text-align:right"><a class="btn ghost sm" href="#draw-${c.id}">Open</a></td></tr>`).join('')}</table>` : '<p class="muted">—</p>'}</div>`;
}
let drawMethod = null, activeReel = null, stageBeat = null;
window.addEventListener('hashchange', () => { if (!location.hash.startsWith('#draw-') && stageBeat) { clearInterval(stageBeat); stageBeat = null; api('/api/admin/stage', { compId: null }).catch(() => {}); } });
async function vDrawStudio(id, keepMethod) {
  if (activeReel) { activeReel.stop(); activeReel = null; }
  const list = await api('/api/admin/comps'); const c = list.find(x => x.id === id); if (!c) throw new Error('Not found');
  drawMethod = c.gameMode === 'duck' || c.gameMode === 'race' ? 'game' : c.gameMode === 'banker' ? 'banker' : c.gameMode === 'hilo' ? 'hilo' : (keepMethod || c.drawMethod || (c.type === 'free' ? 'wheel' : 'number'));
  const pool = await api(`/api/admin/comps/${id}/entrants`);
  const prizes = c.prizes.length ? c.prizes : [c.title];
  const winners = c.winners || [];
  const nextI = winners.length, finished = nextI >= prizes.length, early = c.status === 'live';
  const queue = `<div class="card" style="margin-bottom:14px"><h3>Prizes – drawn in this order</h3><div class="prq">${prizes.map((p, i) => { const w = winners[i]; return `<div class="${w ? 'won' : i === nextI ? 'next' : ''}"><span>${i + 1}. ${esc(p)}</span>${w ? `<span>#${w.ticket} · ${esc(w.name)} <small>(${esc(w.town)})</small></span>` : `<small>${i === nextI ? 'next' : 'waiting'}</small>`}</div>`; }).join('')}</div></div>
    ${winners.length ? `<button class="btn ghost sm" id="undoBtn" style="margin-bottom:14px">Void last result…</button>` : ''}
    ${pool.tickets.length ? `<div class="card"><h3 style="display:block">Entrants & chances<small class="muted" style="display:block;font:600 12px Inter;margin-top:4px">1 ticket = 1 equal chance · secure random number generator</small></h3><div class="tw"><table class="t"><thead><tr><th>Entrant</th><th>Town</th><th>Tickets</th><th>Chance</th></tr></thead><tbody>${(() => { const cnt = {}; pool.tickets.forEach(([, g]) => cnt[g] = (cnt[g] || 0) + 1); return Object.entries(cnt).sort((x, y) => y[1] - x[1]).map(([g, n]) => `<tr><td><b>${esc(pool.groups[g].name)}</b></td><td class="muted">${esc(pool.groups[g].town)}</td><td>${n}</td><td style="min-width:120px"><div class="prog"><i style="width:${(n / pool.tickets.length * 100).toFixed(1)}%"></i></div><small>${(n / pool.tickets.length * 100).toFixed(1)}%</small></td></tr>`).join(''); })()}</tbody></table></div></div>` : ''}`;
  const lmsLive = c.game && c.game.kind === 'lms';
  if (drawMethod === 'lms' || (lmsLive && !keepMethod)) drawMethod = 'lms';
  const std = !c.gameMode || c.gameMode === 'standard';
  const METHODS = [['number', '🔢', 'Google number'], ['wheel', '🎡', 'Wheel spin'], ['reel', '🎰', 'Name reveal'], ['plinko', '🪂', 'Sheppey Drop'], ['scratch', '🍀', 'Scratch card'], ['lms', '☠️', 'Last Man Standing'], ['race', '🏁', 'Race (≤25)'], ['duck', '🦆', 'Duck race (≤25)']];
  const picker = std && (!finished || drawMethod === 'lms') ? `<div class="mpick">${METHODS.map(([k, i, l]) => { const off = (k === 'race' || k === 'duck') && pool.tickets.length > 25; return `<button class="${drawMethod === k ? 'on' : ''}" data-pick-method="${k}" ${off ? 'disabled title="Only when 25 or fewer tickets are left in the draw"' : ''}><span>${i}</span>${l}</button>`; }).join('')}</div>` : '';
  const tabs = std ? picker : finished ? '' : drawMethod === 'game' ? `<div class="method-tag">${c.gameMode === 'duck' ? '🦆 Duck Race' : '🏁 Race Around Sheppey'} <small>winner picked by secure random draw</small></div>` : drawMethod === 'banker' ? '<div class="method-tag">💼 Elite Banker <small>players picked at random</small></div>' : `<div class="method-tag">${drawMethod === 'wheel' ? '🎡 Wheel spin draw <small>free competition</small>' : '🔢 Google number draw <small>paid competition</small>'}</div>`;
  let stage;
  if (drawMethod === 'banker' || drawMethod === 'hilo') stage = `<div id="bkHost"></div>`;
  else if (drawMethod === 'lms') stage = `<div id="lmsHost"></div><div class="reveal" id="reveal"></div>`;
  else if (finished) stage = `<div class="good"><b>🎉 Every prize has been drawn.</b> Winners have been emailed and shown on the site.</div>`;
  else if (['reel', 'plinko', 'scratch'].includes(drawMethod)) stage = `<div id="fxHost" class="fx-host"></div><div class="reveal" id="reveal"></div><div style="text-align:center"><button class="btn lg gold" id="fxBtn" ${pool.tickets.length ? '' : 'disabled'}>${{ reel: '🎰 Reveal the winner', plinko: '🪂 Drop the balls', scratch: '🍀 Scratch the card' }[drawMethod]}</button></div>`;
  else if (drawMethod === 'race' || drawMethod === 'duck') stage = `<div id="raceHost"></div><div class="reveal" id="reveal"></div><div class="race-start"><div><b>${drawMethod === 'duck' ? '🦆 Duck race' : '🏁 Race Around Sheppey'}</b><small>${pool.tickets.length} tickets race for ${esc(prizes[nextI])}</small></div><label>Laps <select id="rLaps">${[1, 2, 3, 4, 5].map(n => `<option ${n === (drawMethod === 'race' ? 2 : 1) ? 'selected' : ''}>${n}</option>`).join('')}</select></label><button class="btn lg gold" id="raceBtn">Start race live</button></div>`;
  else if (finished) stage = `<div class="good"><b>🎉 Every prize has been drawn.</b> Winners have been emailed and shown on the site.</div>${drawMethod === 'game' && winners.length ? '<div id="raceHost" style="margin-top:12px"></div>' : ''}`;
  else if (drawMethod === 'game') { const per = Math.ceil(c.totalTickets / (c.races || 1)), lo = nextI * per + 1, hi = Math.min(c.totalTickets, (nextI + 1) * per), inR = pool.tickets.filter(t => t[0] >= lo && t[0] <= hi).length;
    stage = `<div id="raceHost"></div><div class="reveal" id="reveal"></div><div class="race-start"><div><b>${(c.races || 1) > 1 ? `Race ${nextI + 1} of ${c.races}` : 'The race'}</b><small>${c.gameMode === 'duck' ? 'Ducks' : 'Cars'} ${lo}–${hi} · ${inR} confirmed · for ${esc(prizes[nextI])}</small></div>
      <label>Laps <select id="rLaps">${[1, 2, 3, 4, 5].map(n => `<option ${n === (c.raceLaps || 1) ? 'selected' : ''}>${n}</option>`).join('')}</select></label><button class="btn lg gold" id="raceBtn" ${inR ? '' : 'disabled'}>🏁 Start race live</button></div>`; }
  else if (!drawMethod) stage = `<p class="muted" style="margin-top:0">How do you want to draw <b style="color:var(--text)">${esc(prizes[nextI])}</b>?</p>
      <div class="method">
        <button class="choice" data-method="wheel"><span class="ci">🎡</span><b>Wheel spin draw</b><small>Every entrant's name on the wheel. The system picks a random confirmed ticket and the wheel lands on it.</small></button>
        <button class="choice" data-method="number"><span class="ci">🔢</span><b>Google number draw</b><small>Generate a number from 1 to ${c.totalTickets} on Google, type it in, and the names roll to reveal the winner.</small></button>
      </div>`;
  else if (drawMethod === 'wheel') stage = `<div id="wheelHost"></div><div class="reveal" id="reveal"></div>
      <div style="text-align:center"><button class="btn lg" id="spinBtn" ${pool.tickets.length ? '' : 'disabled'}>Spin for ${esc(prizes[nextI])}</button></div>`;
  else stage = `<div id="reelHost"></div><div class="reveal" id="reveal"></div>
      <div class="numbox"><label for="gNum">Number from Google (1–${c.totalTickets})</label><div style="display:flex;gap:8px"><input id="gNum" type="number" inputmode="numeric" min="1" max="${c.totalTickets}" placeholder="e.g. 42"><button class="btn blue" id="numBtn">Reveal</button></div></div>`;
  const isGame = drawMethod === 'game' || drawMethod === 'banker' || drawMethod === 'hilo';
  api('/api/admin/stage', { compId: id }).catch(() => {});
  clearInterval(stageBeat); stageBeat = setInterval(() => { if (location.hash !== '#draw-' + id) { clearInterval(stageBeat); return api('/api/admin/stage', { compId: null }).catch(() => {}); } api('/api/admin/stage', { compId: id }).catch(() => {}); }, 15000);
  $('#main').innerHTML = `<div class="ph"><h1 class="d">Draw studio</h1><div class="row"><a class="btn gold sm" href="./#stream" target="_blank" rel="noopener">📺 Open stream screen</a><button class="btn ghost sm" data-copy="${location.href.replace(/admin(\.html)?(#.*)?$/, '').replace(/[^/]*$/, '')}#stream">Copy stream link</button><a class="btn ghost" href="#draws">← Draws</a></div></div><div id="cStats"></div>
  <div class="card remote-tip"><b>📺 One stream screen for everything</b> Keep the stream screen open on your laptop (full screen, or an OBS <i>Browser source</i> at 1920×1080). It automatically shows whichever draw you open here – wheel spins, Google number reveals, races and Elite Banker – so run the whole night from this page on your iPad or phone.</div>
  <div class="card live-bar"><div><b>Live draw chat</b> <span class="muted" id="liveState"></span></div><div id="liveBtn"></div></div>
  <div class="studio"><div class="card" style="text-align:center">
      <h2 class="d chrome" style="margin:0">${esc(c.title)}</h2>
      <div class="muted" style="margin-bottom:12px">${pool.tickets.length} tickets in the draw · ${pool.groups.length} entrants${finished ? '' : ' · drawing <b style="color:var(--text)">' + esc(prizes[nextI]) + '</b>'}</div>
      ${early && !finished ? `<div class="warn" style="margin-bottom:12px;text-align:left">${c.unlimited ? 'This open-ended draw hasn\'t reached its end date yet.' : `Not sold out yet (${c.pct}% sold).`} Only draw early if your terms allow it – drawing closes the competition to new entries.</div>` : ''}
      ${tabs}${stage}<div class="err" id="drawErr"></div></div>
    <div class="card"><h3>🔴 Live draw comments <small class="muted" style="font:600 12px Inter">updates every few seconds</small></h3><div class="acms" id="studioChat" style="max-height:340px"></div>
      <form id="scf" style="display:flex;gap:8px;margin-top:10px"><input id="scIn" maxlength="300" placeholder="Reply as host…"><button class="btn sm">Post</button></form></div>
    <div>${queue}</div></div>`;
  compStats(id);
  const pollStudio = async () => {
    const d = await api('/api/admin/chat?room=live').catch(() => null); if (!d || !$('#studioChat')) return;
    $('#liveState').textContent = d.live.on ? '· 🔴 you are live' : '· not live';
    $('#liveBtn').innerHTML = d.live.on ? '<button class="btn ghost sm" data-golive="0">End live draw</button>' : `<button class="btn red sm" data-golive="1" data-comp="${id}">🔴 Go live</button>`;
    const b = $('#studioChat'), bot = b.scrollHeight - b.scrollTop - b.clientHeight < 60; b.innerHTML = chatList(d, true); if (bot) b.scrollTop = b.scrollHeight;
  };
  pollStudio(); clearInterval(chatPoll); chatPoll = setInterval(() => { if (!location.hash.startsWith('#draw-')) return clearInterval(chatPoll); pollStudio(); }, 3000);
  $('#scf').onsubmit = async e => { e.preventDefault(); if (!$('#scIn').value.trim()) return; await api('/api/admin/chat', { room: 'live', text: $('#scIn').value }); $('#scIn').value = ''; pollStudio(); };
  const reveal = (w) => { const q = $$('.prq div')[w.prizeIndex]; if (q) { q.className = 'won'; q.innerHTML = `<span>${w.prizeIndex + 1}. ${esc(w.prize)}</span><span>#${w.ticket} · ${esc(w.name)} <small>(${esc(w.town)})</small></span>`; } $('#reveal').innerHTML = `<div class="tw">${esc(w.prize)}</div><div class="nm chrome pop">${esc(w.name)}</div><div class="tn">Ticket #${w.ticket}</div><div class="muted">${esc(w.town)}</div>`; };
  const after = r => setTimeout(() => { $('#reveal').insertAdjacentHTML('beforeend', `<button class="btn ${r.remaining ? '' : 'ghost'}" style="margin-top:12px" id="nextBtn">${r.remaining ? 'Next prize →' : 'Done'}</button>`); $('#nextBtn').onclick = () => r.remaining ? vDrawStudio(id) : (location.hash = 'draws'); }, 500);
  if (drawMethod === 'game' && finished && winners.length && $('#raceHost')) { const w = winners[winners.length - 1]; if (w.race) SERGames.runRace($('#raceHost'), w.race, w.ticket, { live: true, offset: 0 }); }
  if (drawMethod === 'game' && !finished) {
    $('#raceBtn').onclick = async () => {
      $('#raceBtn').disabled = true; $('#drawErr').textContent = '';
      try { const r = await api(`/api/admin/comps/${id}/draw`, { method: 'game', force: early, laps: +$('#rLaps').value }); $('.race-start').classList.add('hidden');
        await SERGames.runRace($('#raceHost'), r.winner.race, r.winner.ticket, { live: true, offset: r.serverNow - Date.now() }); if (!$('#reveal')) return; reveal(r.winner); toast(`${r.winner.prize}: ${r.winner.name}`); after(r); }
      catch (e) { if (!$('#drawErr')) return; $('#drawErr').textContent = e.message; $('#raceBtn').disabled = false; }
    };
  }
  $$('[data-pick-method]').forEach(b => b.onclick = () => vDrawStudio(id, b.dataset.pickMethod));
  const waitStart = async r => { const sw = r.winner.show; if (sw) await new Promise(z => setTimeout(z, Math.max(0, Date.parse(sw.startAt) - r.serverNow))); return sw; };
  if (['reel', 'plinko', 'scratch'].includes(drawMethod) && !finished) {
    if (drawMethod === 'reel') activeReel = DrawFX.NameReel($('#fxHost'), pool.tickets, pool.groups);
    else $('#fxHost').innerHTML = `<div class="sd-idle small"><span>${drawMethod === 'plinko' ? '🪂' : '🍀'}</span><b>${drawMethod === 'plinko' ? 'Sheppey Drop' : 'Scratch card'}</b><small>${pool.tickets.length} tickets in the draw</small></div>`;
    $('#fxBtn').onclick = async () => {
      $('#fxBtn').disabled = true; $('#drawErr').textContent = ''; $$('[data-pick-method]').forEach(b => b.disabled = true);
      try { const r = await api(`/api/admin/comps/${id}/draw`, { method: drawMethod, force: early }); $('#fxBtn').classList.add('hidden');
        const sw = await waitStart(r), w = r.winner;
        if (drawMethod === 'reel') { await activeReel.spinTo(w.ticket, sw.dur); activeReel = null; }
        else if (drawMethod === 'plinko') await SERGames.plinkoDigits($('#fxHost'), sw.number, sw.digits, sw.dur, sw.seed);
        else await SERGames.scratchReveal($('#fxHost'), w, sw.dur);
        reveal(w); toast(`${w.prize}: ${w.name}`); after(r); }
      catch (e) { $('#drawErr').textContent = e.message; $('#fxBtn').disabled = false; $$('[data-pick-method]').forEach(b => b.disabled = false); }
    };
  }
  if ((drawMethod === 'race' || drawMethod === 'duck') && !finished) {
    $('#raceBtn').onclick = async () => {
      $('#raceBtn').disabled = true; $('#drawErr').textContent = '';
      try { const r = await api(`/api/admin/comps/${id}/draw`, { method: drawMethod, force: early, laps: +$('#rLaps').value }); $('.race-start').classList.add('hidden');
        await SERGames.runRace($('#raceHost'), r.winner.race, r.winner.ticket, { live: true, offset: r.serverNow - Date.now() }); if (!$('#reveal')) return; reveal(r.winner); after(r); }
      catch (e) { if ($('#drawErr')) { $('#drawErr').textContent = e.message; $('#raceBtn').disabled = false; } }
    };
  }
  if (drawMethod === 'lms') {
    const show = SERGames.LmsShow($('#lmsHost'), { admin: true, onAction: async act => { $('#drawErr').textContent = ''; const st = await api(`/api/admin/comps/${id}/lms/${act}`, act === 'start' ? { force: early } : {});
      if (st.phase === 'won') setTimeout(() => { if ($('#lmsHost')) vDrawStudio(id, 'lms'); }, 9000); return st; } });
    api(`/api/admin/comps/${id}/lms`).then(st => show.update(st && st.phase ? st : null)).catch(() => show.update(null));
    if (finished && !lmsLive) show.update(null);
  }
  if (drawMethod === 'hilo') {
    const show = SERGames.HiloShow($('#bkHost'), { admin: true, onAction: async (act, body) => { $('#drawErr').textContent = ''; return api(`/api/admin/comps/${id}/hilo/${act}`, act === 'start' ? { force: early } : body); } });
    api(`/api/admin/comps/${id}/hilo`).then(st => show.update(st && st.phase ? st : null)).catch(() => show.update(null));
  }
  if (drawMethod === 'banker') {
    const show = SERGames.BankerShow($('#bkHost'), { admin: true, onAction: async (act, body) => { $('#drawErr').textContent = ''; return api(`/api/admin/comps/${id}/banker/${act}`, act === 'start' ? { force: early } : body); } });
    api(`/api/admin/comps/${id}/banker`).then(st => show.update(st && st.phase ? st : null)).catch(() => show.update(null));
  }
  if (drawMethod === 'wheel' && !finished) {
    const wheel = DrawFX.Wheel($('#wheelHost')); requestAnimationFrame(() => wheel.set(pool.tickets, pool.groups));
    $('#spinBtn').onclick = async () => {
      $('#spinBtn').disabled = true; $('#drawErr').textContent = ''; $$('[data-method],[data-pick-method]').forEach(b => b.disabled = true);
      try { const r = await api(`/api/admin/comps/${id}/draw`, { method: 'wheel', force: early }); $('#spinBtn').classList.add('hidden'); $('#reveal').innerHTML = '<div class="muted">Spinning…</div>';
        const sw = r.winner.show; if (sw) await new Promise(z => setTimeout(z, Math.max(0, Date.parse(sw.startAt) - r.serverNow)));
        await wheel.spinTo(r.winner.ticket, sw ? sw.dur : 8000); reveal(r.winner); toast(`${r.winner.prize}: ${r.winner.name}`); after(r); }
      catch (e) { $('#drawErr').textContent = e.message; $('#spinBtn').disabled = false; $$('[data-method],[data-pick-method]').forEach(b => b.disabled = false); }
    };
  }
  if (drawMethod === 'number' && !finished) {
    activeReel = DrawFX.NameReel($('#reelHost'), pool.tickets, pool.groups);
    const go = async () => {
      const n = parseInt($('#gNum').value, 10); $('#drawErr').textContent = '';
      if (!(n >= 1)) return ($('#drawErr').textContent = 'Enter the number Google gave you.');
      $('#numBtn').disabled = true; $$('[data-method],[data-pick-method]').forEach(b => b.disabled = true);
      try { const r = await api(`/api/admin/comps/${id}/draw`, { method: 'number', number: n, force: early }); $('.numbox').classList.add('hidden');
        const sn = r.winner.show; if (sn) await new Promise(z => setTimeout(z, Math.max(0, Date.parse(sn.startAt) - r.serverNow)));
        await activeReel.spinTo(r.winner.ticket, sn ? sn.dur : 6500); activeReel = null; reveal(r.winner); toast(`${r.winner.prize}: ${r.winner.name}`); after(r); }
      catch (e) { $('#drawErr').textContent = e.message; $('#numBtn').disabled = false; $$('[data-method],[data-pick-method]').forEach(b => b.disabled = false); }
    };
    $('#numBtn').onclick = go; $('#gNum').onkeydown = e => { if (e.key === 'Enter') go(); };
  }
  const ub = $('#undoBtn'); if (ub) ub.onclick = () => {
    const w = winners[winners.length - 1];
    openDlg(`<h3 class="d">Void last result?</h3><p>${esc(w.prize)}: ticket #${w.ticket} – ${esc(w.name)}. Only do this if a mistake was made (e.g. wrong number typed). This is recorded in the activity log.</p><label>Reason</label><input id="vr" required><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn ghost" data-close>Cancel</button><button class="btn red" id="vok">Void result</button></div><div class="err" id="verr"></div>`);
    $('#vok').onclick = async () => { if (!$('#vr').value.trim()) return ($('#verr').textContent = 'Give a reason.'); try { await api(`/api/admin/comps/${id}/draw/undo`, { reason: $('#vr').value }); closeDlg(); vDrawStudio(id); } catch (e) { $('#verr').textContent = e.message; } };
  };
}
window.addEventListener('hashchange', () => { if (activeReel) { activeReel.stop(); activeReel = null; } });

// ================= CUSTOMERS =================
async function vCustomers() {
  const list = await api('/api/admin/users');
  const draw = () => {
    const q = custQ.trim().toLowerCase();
    const l = list.filter(u => !q || [u.first + ' ' + u.last, u.email, u.phone, u.address.town, u.address.postcode].some(v => String(v).toLowerCase().includes(q)));
    $('#ctb').innerHTML = l.map(u => `<tr><td><a href="#customer-${u.id}" style="color:var(--text);font-weight:800">${esc(u.first)} ${esc(u.last)}</a> ${u.strikeBan ? '<span class="badge2 b-closed" title="Paused for unpaid orders">⛔ paused</span> ' : u.strikes ? `<span class="badge2" style="background:rgba(255,160,0,.18);color:#ffb84d" title="Unpaid-order strikes">⚠️ ${u.strikes}</span> ` : ''}${u.excluded ? '<span class="badge2 b-closed">self-excluded</span>' : ''}${u.idStatus === 'verified' ? '<span class="badge2 b-free">ID ✓</span>' : u.idStatus === 'pending' ? '<span class="badge2 b-soldout">ID to check</span>' : ''}${u.app ? ' 📱' : ''}${u.push ? '🔔' : ''}${u.balance ? ` <small class="muted">cash ${gbp(u.balance)}</small>` : ''}${u.credit ? ` <small class="muted">credit ${gbp(u.credit)}</small>` : ''}<br><small class="muted">${esc(u.email)}</small></td><td>${esc(u.phone)}</td><td><b>${esc(u.address.town)}</b><br><small class="muted">${esc(u.address.postcode)}</small></td>
      <td><span class="st confirmed">${u.confirmedTickets}</span></td><td>${u.pendingTickets ? `<span class="st pending">${u.pendingTickets}</span><br><small class="muted">${gbp(u.owed)} due</small>` : '<span class="muted">0</span>'}</td><td><b>${gbp(u.spent)}</b></td><td class="muted">${dt(u.createdAt)}</td></tr>`).join('') || '<tr><td colspan="7" class="muted">No customers match.</td></tr>';
    $('#ccount').textContent = l.length;
  };
  $('#main').innerHTML = `<div class="ph"><h1 class="d">Customers <span class="muted" style="font:600 16px Inter">(<span id="ccount"></span>)</span></h1><input id="cq" placeholder="Search name, email, phone, town, postcode" value="${esc(custQ)}" style="max-width:340px"></div>
    <div class="card tw" style="padding:0"><table class="t"><thead><tr><th>Customer</th><th>Phone</th><th>Town</th><th>Confirmed</th><th>Pending</th><th>Spent</th><th>Joined</th></tr></thead><tbody id="ctb"></tbody></table></div>`;
  draw(); $('#cq').oninput = e => { custQ = e.target.value; draw(); };
}
async function vCustomer(id) {
  const d = await api('/api/admin/users/' + id); const u = d.user, a = u.address;
  setTimeout(() => { const f = $('#crf'); if (f) f.onsubmit = async e => { e.preventDefault(); try { await api(`/api/admin/users/${id}/credit`, { amount: Math.round(parseFloat($('#crA').value) * 100), note: $('#crN').value, wallet: $('#crW').value }); toast('Balance updated'); vCustomer(id); } catch (er) { toast(er.message, true); } }; });
  cache.orders = d.orders.map(o => ({ ...o, user: { name: u.first + ' ' + u.last } }));
  const cnt = st => d.orders.filter(o => o.status === st).reduce((x, o) => x + o.items.reduce((y, i) => y + i.qty, 0), 0);
  $('#main').innerHTML = `<div class="ph"><h1 class="d">${esc(u.first)} ${esc(u.last)}</h1><div class="row"><button class="btn sm" data-ureset="${u.id}">🔑 Send password reset</button>${u.verified ? '' : `<button class="btn ghost sm" data-uverify="${u.id}">Mark email confirmed</button>`}<a class="btn ghost sm" href="#customers">← Customers</a></div></div>
  <div class="cards2"><div class="card"><h3>Contact & address</h3><table class="t">
    <tr><td class="muted">Email</td><td><a href="mailto:${esc(u.email)}">${esc(u.email)}</a> ${u.verified ? '<span class="st confirmed">confirmed</span>' : '<span class="st pending">not confirmed</span>'}</td></tr><tr><td class="muted">Phone</td><td><a href="tel:${esc(u.phone.replace(/\s/g, ''))}">${esc(u.phone)}</a></td></tr>
    <tr><td class="muted">Address</td><td>${esc(a.line1)}${a.line2 ? '<br>' + esc(a.line2) : ''}<br><b>${esc(a.town)}</b><br>${esc(a.postcode)} <button class="btn ghost sm" data-copy="${esc([u.first + ' ' + u.last, a.line1, a.line2, a.town, a.postcode].filter(Boolean).join('\n'))}">Copy</button></td></tr>
    <tr><td class="muted">Joined</td><td>${dt(u.createdAt)}</td></tr><tr><td class="muted">Last login</td><td>${dt(u.lastLogin)}</td></tr><tr><td class="muted">Marketing emails</td><td>${u.marketing ? 'Yes' : 'No'}</td></tr><tr><td class="muted">Agreed to terms</td><td>${u.consentAt ? dt(u.consentAt) : '—'}</td></tr></table></div>
    <div class="card"><h3>Summary</h3><div class="kpis" style="grid-template-columns:1fr 1fr;margin:0"><div class="kpi"><small>Confirmed</small><b style="color:var(--green)">${cnt('confirmed')}</b></div><div class="kpi"><small>Pending</small><b style="color:var(--orange)">${cnt('pending')}</b></div><div class="kpi"><small>Spent</small><b>${gbp(d.orders.filter(o => o.status === 'confirmed').reduce((x, o) => x + o.total, 0))}</b></div><div class="kpi"><small>Wins</small><b>${d.wins.length}</b></div></div>
    ${(u.strikes || []).length || u.strikeBan ? `<div class="card" style="margin-top:10px;border-color:rgba(255,160,0,.5)"><b>⚠️ Unpaid-order strikes: ${(u.strikes || []).length}</b>${u.strikeBan ? ` · <span style="color:#ff6b81">⛔ paused until ${dt(u.strikeBan)}</span>` : ''}${u.strikeBans ? ` · paused ${u.strikeBans}× before` : ''}
      <div class="muted" style="font-size:12px;margin:4px 0 8px">${(u.strikes || []).map(x => `${esc(x.ref)} (${dt(x.at)})`).join(' · ') || 'No current strikes'}</div>
      <button class="btn ghost sm" data-ustrikes="${u.id}">Clear strikes</button>${u.strikeBan ? ` <button class="btn sm" data-ustrikes="${u.id}" data-unban="1">Clear &amp; lift pause</button>` : ''}</div>` : ''}
    ${d.wins.map(w => `<div class="good" style="margin-top:10px">🏆 <b>${esc(w.prize)}</b> – ${esc(w.title)} · #${w.ticket}</div>`).join('')}</div></div>
  <div class="cards2">
    <div class="card" data-fin><h3>💷 Balances &amp; payouts</h3><div class="kpis" style="grid-template-columns:1fr 1fr;margin:0 0 10px"><div class="kpi"><small>Cash (withdrawable)</small><b style="color:var(--green)">${gbp(u.balance || 0)}</b></div><div class="kpi"><small>Credit (spend only)</small><b style="color:#ffc400">${gbp(u.credit || 0)}</b></div></div>
      <table class="t"><tr><td class="muted">Bank details</td><td>${u.payout ? `${esc(u.payout.name)} · ${esc(u.payout.sortMask)} · ****${esc(u.payout.last4)} <button class="btn ghost sm" data-reveal="${u.id}">Show full</button>` : '—'}</td></tr>
      <tr><td class="muted">Withdrawals</td><td>${(u.withdrawals || []).map(w => `${gbp(w.amount)} <span class="st ${w.status === 'paid' ? 'confirmed' : w.status === 'pending' ? 'pending' : 'expired'}">${w.status}</span> <small class="muted">${dt(w.at)}</small>`).join('<br>') || '—'}</td></tr></table>
      <form id="crf" class="row" style="margin-top:10px;gap:6px"><input id="crA" type="number" step="0.01" placeholder="± £" style="max-width:100px"><select id="crW" style="max-width:110px"><option value="credit">Credit</option><option value="cash">Cash</option></select><input id="crN" placeholder="Reason" style="flex:1;min-width:120px"><button class="btn ghost sm">Adjust</button></form>
      ${(u.ledger || []).length ? `<details style="margin-top:8px"><summary class="muted">Ledger</summary><table class="t">${u.ledger.map(l => `<tr><td class="muted">${dt(l.at)}</td><td>${l.wallet === 'credit' ? '<span class="st pending">credit</span> ' : '<span class="st confirmed">cash</span> '}${esc(l.note || l.type)}</td><td style="text-align:right"><b>${l.amount > 0 ? '+' : ''}${gbp(l.amount)}</b></td></tr>`).join('')}</table></details>` : ''}</div>
    <div class="card"><h3>🪪 Identity · 🛡️ Safe play</h3><table class="t">
      <tr><td class="muted">ID status</td><td><span class="st ${u.idStatus === 'verified' ? 'confirmed' : u.idStatus === 'pending' ? 'pending' : u.idStatus === 'rejected' ? 'expired' : ''}">${u.idStatus}</span>${u.idNote ? ` <small class="muted">${esc(u.idNote)}</small>` : ''}</td></tr>
      <tr data-fin><td class="muted">Documents</td><td>${(u.idDocs || []).map(dd => `<button class="btn ghost sm" data-iddoc="${u.id}" data-i="${dd.i}">View ${esc(dd.kind)} · ${dt(dd.at)}</button>`).join(' ') || '—'}</td></tr>
      <tr data-fin><td class="muted">Self-exclusion</td><td>${u.safe?.excludedUntil && Date.parse(u.safe.excludedUntil) > Date.now() ? `<b style="color:var(--red2)">until ${dt(u.safe.excludedUntil)}</b>` : 'None'}</td></tr>
      <tr data-fin><td class="muted">Spend limits</td><td>${['day', 'week', 'month'].map(k => u.safe?.limits?.[k] ? `${gbp0(u.safe.limits[k])}/${k}` : '').filter(Boolean).join(' · ') || 'None'}</td></tr>
      <tr><td class="muted">Referrals</td><td>${u.referredBy ? `Invited by <a href="#customer-${u.referredBy.id}" style="color:var(--text)">${esc(u.referredBy.name)}</a><br>` : ''}Code <b>${esc(u.refCode || '')}</b> · invited ${(u.invited || []).length}${(u.invited || []).length ? ': ' + u.invited.map(x => esc(x.name) + (x.enteredAt ? ' ✓' : '')).join(', ') : ''}</td></tr>
      <tr><td class="muted">App</td><td>${u.app ? '📱 Installed' : 'Not installed'} · ${u.push ? '🔔 Notifications on' : 'Notifications off'}</td></tr></table>
      ${u.idStatus === 'pending' || u.idStatus === 'rejected' || (u.idDocs || []).length ? `<div class="row" data-fin style="margin-top:10px"><button class="btn sm" data-idok="${u.id}">✅ Verify ID</button><button class="btn ghost sm" data-idno="${u.id}">Reject…</button></div>` : ''}</div>
  </div>
  <div class="card"><h3>Orders & tickets</h3>${d.orders.length ? d.orders.map(o => `<div class="order ${o.status}"><div class="top"><div><b class="ref">${esc(o.ref)}</b> <span class="muted">· ${dt(o.createdAt)} · ${o.total ? (o.total != null ? gbp(o.total) : '') : o.source}</span></div><div style="display:flex;gap:8px;align-items:center"><span class="st ${o.status}">${ST[o.status]}</span>${o.status === 'pending' ? `<button class="btn sm" data-confirm="${o.id}">Confirm order</button>` : ''}</div></div>
    ${o.items.map(i => `<div class="line"><b>${esc(i.title)}</b> <span class="muted">×${i.qty}</span><div class="tix ${o.status}">${i.tickets.map(t => `<span>#${t}</span>`).join('')}</div></div>`).join('')}</div>`).join('') : '<p class="muted">No orders yet.</p>'}</div>`;
  if (!can('money')) { $$('[data-fin]').forEach(x => x.remove()); $$('#main .cards2').forEach(x => { if (x.children.length === 1) x.style.gridTemplateColumns = '1fr'; }); }
}

// ================= LEADERBOARD & REFERRALS =================
const BR = [['spend', '💷 Points per £1 spent'], ['comp', '🎟️ Per different competition entered'], ['early', '⚡ Entering in a comp’s first 24h'], ['signup', '🤝 Per friend who registers'], ['friendSpend', '💪 Bonus when that friend spends…'], ['friendMin', '…this much (£)'], ['daily', '📅 Per day they log in'], ['streak', '🔥 Per 7-day login streak'], ['notify', '🔔 Turning on notifications (once)'], ['idv', '🪪 Verifying ID (once)'], ['win', '🏆 Per prize won']];
async function vBoard() {
  const [d, users, LV] = await Promise.all([api('/api/admin/board'), api('/api/admin/users'), can('money') ? api('/api/admin/levels') : null]);
  if (!d.rewards) d.rewards = [];
  const B = d.current, live = B && B.status === 'live', toLocal = iso => { const x = new Date(iso); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
  const R = B ? B.rules : { spend: 10, comp: 4, early: 5, signup: 25, friendSpend: 25, friendMin: 500, daily: 2, streak: 20, notify: 15, idv: 10, win: 0, boostX: 1 };
  const pendR = d.rewards.filter(x => x.status === 'pending');
  const PN = { spend: 'Spend', comps: 'Comps', early: 'Early', invites: 'Invites', friendSpend: 'Friends spent', daily: 'Logins', streak: 'Streaks', notify: 'Alerts', idv: 'ID', wins: 'Wins', bonus: 'Bonus' };
  $('#main').innerHTML = `<div class="ph"><h1 class="d">Leaderboard</h1><a class="btn ghost sm" href="./#leaderboard" target="_blank" rel="noopener">↗ View on site</a></div>
  <div class="cards2">
    <div class="card"><h3>${live ? '✏️ Current leaderboard' : '➕ Start a leaderboard'}</h3>
      <form id="bf"><label>Name</label><input id="bT" value="${esc(B && live ? B.title : 'December Leaderboard')}" maxlength="80">
      <label>Prize (free)</label><input id="bP" value="${esc(B && live ? B.prize : '£50 Cash')}" maxlength="80">
      <div class="formgrid"><div><label>Starts</label><input id="bS" type="datetime-local" value="${toLocal(B && live ? B.startAt : new Date().toISOString())}"></div><div><label>Ends</label><input id="bE" type="datetime-local" value="${toLocal(B && live ? B.endAt : new Date(Date.now() + 14 * 864e5).toISOString())}"></div></div>
      <label>Who can take part</label><select id="bEl"><option value="all">Everyone</option><option value="kent" ${B && live && B.eligibility === 'kent' ? 'selected' : ''}>Kent residents only</option></select>
      <label style="margin-top:12px">Points – earned automatically on the site (0 = off)</label>
      <div class="formgrid">${BR.map(([k, l]) => `<div><label class="muted">${l}</label><input data-rule="${k}" type="number" min="0" step="${k === 'friendMin' ? '0.5' : '1'}" value="${k === 'friendMin' ? (R[k] || 0) / 100 : R[k] || 0}"></div>`).join('')}</div>
      <label style="margin-top:12px">⚡ Double points window (optional)</label>
      <div class="formgrid"><div><label class="muted">Multiplier on spend & comps</label><select id="bX">${[1, 2, 3].map(x => `<option value="${x}" ${(R.boostX || 1) === x ? 'selected' : ''}>${x === 1 ? 'Off' : x + '× points'}</option>`).join('')}</select></div><div></div>
        <div><label class="muted">From</label><input id="bXf" type="datetime-local" value="${B && B.boostFrom ? toLocal(B.boostFrom) : ''}"></div><div><label class="muted">To</label><input id="bXt" type="datetime-local" value="${B && B.boostTo ? toLocal(B.boostTo) : ''}"></div></div>
      <button class="btn block" style="margin-top:12px">${live ? 'Save changes' : 'Start leaderboard'}</button><div class="err" id="bErr"></div></form>
      <p class="hint">Points only count from <b>confirmed</b> entries inside the dates (expired or cancelled orders never count). Customers who've taken a break are left off the board. Changing the points recalculates everyone straight away.</p></div>
    <div class="card"><h3>⭐ Bonus points</h3>
      ${B ? `<form id="pf2"><label>Customer</label><input id="pQ" list="pUsers" placeholder="Start typing a name…"><datalist id="pUsers">${users.map(u => `<option value="${esc(u.first + ' ' + u.last + ' – ' + u.address.town)}" data-id="${u.id}"></option>`).join('')}</datalist>
      <div class="formgrid"><div><label>Points (+/−)</label><input id="pN" type="number" value="10"></div><div><label>Reason</label><input id="pW" placeholder="e.g. Won the live quiz" maxlength="140"></div></div>
      <button class="btn block" style="margin-top:10px">Add points</button><div class="err" id="pErr2"></div></form>
      ${d.bonus.length ? `<table class="t" style="margin-top:10px">${d.bonus.slice(0, 8).map(x => `<tr><td>${esc(x.user ? x.user.name : '')}<br><small class="muted">${esc(x.note || '')}</small></td><td style="text-align:right"><b>${x.pts > 0 ? '+' : ''}${x.pts}</b></td></tr>`).join('')}</table>` : ''}` : '<p class="muted">Start a leaderboard first.</p>'}
      ${B && B.status !== 'awarded' && can('money') ? `<button class="btn gold block" id="bAward" style="margin-top:16px">🏆 ${live ? 'End now & award the prize' : 'Award the prize to No. 1'}</button>` : B && B.winner ? `<div class="good" style="margin-top:14px">🏆 Won by <b>${esc(B.winner.name)}</b> (${B.winner.points} pts)</div>` : ''}</div>
  </div>
  <div class="card" style="margin-bottom:14px"><h3>🏅 Standings</h3>${d.rows.length ? `<div class="tw"><table class="t"><thead><tr><th>#</th><th>Customer</th><th>Breakdown</th><th style="text-align:right">Points</th></tr></thead>${d.rows.slice(0, 30).map((r, i) => `<tr><td>${i + 1}</td><td><a href="#customer-${r.userId}" style="color:var(--text);font-weight:700">${esc(r.name)}</a><br><small class="muted">${esc(r.town)}</small></td><td class="muted" style="font-size:12px">${Object.entries(r.parts).filter(([k]) => k !== 'total').map(([k, v]) => `${PN[k] || k} ${v}`).join(' · ')}</td><td style="text-align:right"><b>${r.points}</b></td></tr>`).join('')}</table></div>` : '<p class="muted">No points yet.</p>'}</div>
  ${LV ? `<div class="card" style="margin-bottom:14px"><h3>🥇 Monthly levels & cashback</h3>
    <form id="lvf"><label class="switch"><input type="checkbox" id="lvOn" ${LV.on ? 'checked' : ''}> Levels on – customers earn cashback on what they spend each calendar month</label>
    <div class="lvgrid">${[0, 1, 2, 3].map(i => { const t = LV.tiers[i] || {}; return `<div><input data-lv-n="${i}" placeholder="${i === 3 ? 'Extra level (optional)' : 'Name'}" value="${esc(t.name || '')}"><label class="muted">Spend from (£)</label><input data-lv-m="${i}" type="number" min="0" step="1" value="${t.min ? t.min / 100 : ''}"><label class="muted">Cashback %</label><input data-lv-p="${i}" type="number" min="0" max="20" step="0.5" value="${t.pct || ''}"></div>`; }).join('')}</div>
    <button class="btn" style="margin-top:10px">Save levels</button></form>
    <div class="kpis" style="margin-top:14px">${LV.counts.map(c => `<div class="kpi"><small>${esc(c.name)} in ${esc(LV.month)}</small><b>${c.n}</b></div>`).join('')}<div class="kpi"><small>Credit held by customers</small><b style="color:#ffc400">${gbp(LV.creditOut)}</b><span>spend-only, can't be withdrawn</span></div><div class="kpi"><small>Cashback building up</small><b style="color:var(--green)">${gbp(LV.owed)}</b><span>paid automatically after the month ends</span></div></div>
    ${LV.rows.length ? `<details><summary class="muted">This month's spenders (${LV.rows.length})</summary><table class="t">${LV.rows.slice(0, 40).map(r => `<tr><td><a href="#customer-${r.id}" style="color:var(--text);font-weight:700">${esc(r.name)}</a> <small class="muted">${esc(r.town)}</small></td><td>${gbp(r.spent)}</td><td>${r.level ? esc(r.level) : '<span class="muted">–</span>'}</td><td style="text-align:right">${r.cashback ? gbp(r.cashback) : ''}</td></tr>`).join('')}</table></details>` : ''}
    ${LV.paid.length ? `<details><summary class="muted">Cashback paid</summary><table class="t">${LV.paid.slice(0, 50).map(x => `<tr><td>${esc(x.user ? x.user.name : '')}</td><td>${esc(x.monthName)}</td><td>${esc(x.level)} ${x.pct}%</td><td style="text-align:right">${gbp(x.amount)}</td></tr>`).join('')}</table></details>` : ''}
    <p class="hint">Only confirmed paid entries count (free and Elite Player entries don't), using the date the order was placed. Cashback goes to the customer's <b>credit balance</b> (spend-only) a few hours into the new month (after late bank transfers have had time to be confirmed), and they get a notification.</p></div>` : ''}
  <div class="cards2">
    ${can('money') ? `<div class="card"><h3>💷 Refer-a-friend reward</h3>
      <form id="rwf"><div class="formgrid"><div><label>Reward to the inviter (£, 0 = off)</label><input id="rwA" type="number" min="0" step="0.5" value="${d.refReward / 100}"></div><div><label>When their friend has spent (£)</label><input id="rwM" type="number" min="0" step="0.5" value="${d.refRewardMin / 100}"></div></div>
      <button class="btn block" style="margin-top:10px">Save reward</button></form>
      <p class="hint">Added to the inviter's credit balance (spend-only) once you approve it. Each friend only ever pays out once, and only friends who join after you switch this on count. We flag possible self-referrals (same address, postcode or surname) – check those before paying.</p>
      <h3 style="margin-top:14px">To approve <span class="muted" style="font-size:13px">${pendR.length}</span></h3>
      ${pendR.length ? `<table class="t">${pendR.map(x => `<tr><td><b>${esc(x.referrer ? x.referrer.name : '')}</b> invited <b>${esc(x.friend ? x.friend.name : '')}</b><br><small class="muted">${esc(x.friend ? x.friend.town : '')} · spent ${gbp(x.spent)} · ${dt(x.at)}</small>${x.flags.length ? `<br><span class="st pending">⚠️ ${esc(x.flags.join(', '))}</span>` : ''}</td><td style="text-align:right;white-space:nowrap"><button class="btn sm" data-rw-pay="${x.id}">Pay ${gbp(x.amount)}</button> <button class="btn ghost sm" data-rw-no="${x.id}">Reject</button></td></tr>`).join('')}</table>` : '<p class="muted">Nothing waiting.</p>'}
      ${d.rewards.filter(x => x.status !== 'pending').length ? `<details style="margin-top:8px"><summary class="muted">History</summary><table class="t">${d.rewards.filter(x => x.status !== 'pending').map(x => `<tr><td>${esc(x.referrer ? x.referrer.name : '')} ← ${esc(x.friend ? x.friend.name : '')}</td><td>${gbp(x.amount)}</td><td><span class="st ${x.status === 'paid' ? 'confirmed' : 'expired'}">${x.status}</span></td></tr>`).join('')}</table></details>` : ''}</div>
` : ''}
    <div class="card"><h3>🤝 Top referrers</h3>${d.referrers.length ? `<table class="t"><thead><tr><th>Customer</th><th>Invited</th><th>Entered</th><th>Friends</th></tr></thead>${d.referrers.map(r => `<tr><td><a href="#customer-${r.id}" style="color:var(--text);font-weight:700">${esc(r.name)}</a><br><small class="muted">${esc(r.town)}</small></td><td>${r.invited.length}</td><td>${r.invited.filter(x => x.enteredAt).length}</td><td class="muted" style="font-size:12px">${r.invited.slice(0, 6).map(x => esc(x.name)).join(', ')}${r.invited.length > 6 ? '…' : ''}</td></tr>`).join('')}</table>` : '<p class="muted">Nobody has invited friends yet. Every customer has a personal link in My account → Refer a friend.</p>'}</div>
  </div>`;
  $('#bf').onsubmit = async e => { e.preventDefault(); $('#bErr').textContent = ''; const rules = {}; $$('[data-rule]').forEach(i => rules[i.dataset.rule] = i.dataset.rule === 'friendMin' ? Math.round((parseFloat(i.value) || 0) * 100) : +i.value || 0); rules.boostX = +$('#bX').value;
    try { await api('/api/admin/board', { id: live ? B.id : undefined, title: $('#bT').value, prize: $('#bP').value, startAt: new Date($('#bS').value).toISOString(), endAt: new Date($('#bE').value).toISOString(), eligibility: $('#bEl').value, rules, boostFrom: $('#bXf').value ? new Date($('#bXf').value).toISOString() : '', boostTo: $('#bXt').value ? new Date($('#bXt').value).toISOString() : '' }); toast('Leaderboard saved'); vBoard(); } catch (er) { $('#bErr').textContent = er.message; } };
  const pf = $('#pf2'); if (pf) pf.onsubmit = async e => { e.preventDefault(); $('#pErr2').textContent = ''; const opt = [...$$('#pUsers option')].find(o => o.value === $('#pQ').value); if (!opt) return ($('#pErr2').textContent = 'Choose a customer from the list.');
      try { await api('/api/admin/board/points', { userId: opt.dataset.id, pts: +$('#pN').value, note: $('#pW').value }); toast('Points added'); vBoard(); } catch (er) { $('#pErr2').textContent = er.message; } };
  if ($('#rwf')) $('#rwf').onsubmit = async e => { e.preventDefault(); await api('/api/admin/settings', { refReward: Math.round((parseFloat($('#rwA').value) || 0) * 100), refRewardMin: Math.round((parseFloat($('#rwM').value) || 0) * 100) }); toast('Referral reward saved'); vBoard(); };
  if ($('#lvf')) $('#lvf').onsubmit = async e => { e.preventDefault(); const levels = [0, 1, 2, 3].map(i => ({ name: $(`[data-lv-n="${i}"]`).value.trim(), min: Math.round((parseFloat($(`[data-lv-m="${i}"]`).value) || 0) * 100), pct: parseFloat($(`[data-lv-p="${i}"]`).value) || 0 })).filter(x => x.name && x.min && x.pct);
    await api('/api/admin/settings', { levelsOn: $('#lvOn').checked, levels }); toast('Levels saved'); vBoard(); };
  const aw = $('#bAward'); if (aw) aw.onclick = () => confirmDlg('Award the prize?', `This ends the leaderboard and awards <b>${esc(B.prize)}</b> to whoever is No. 1 (${d.rows[0] ? esc(d.rows[0].name) + ' with ' + d.rows[0].points + ' pts' : 'nobody yet'}). They're emailed and notified.`, 'Award', async () => { await api('/api/admin/board/award', {}); toast('Prize awarded 🏆'); vBoard(); });
  $$('[data-rw-pay],[data-rw-no]').forEach(b => b.onclick = async () => { await api(`/api/admin/refrewards/${b.dataset.rwPay || b.dataset.rwNo}/${b.dataset.rwPay ? 'pay' : 'reject'}`, {}); toast(b.dataset.rwPay ? 'Reward paid 💷' : 'Rejected'); vBoard(); });
}

// ================= PAYOUTS & ID =================
async function vPayouts() {
  const [ws, users] = await Promise.all([api('/api/admin/withdrawals'), api('/api/admin/users')]);
  const pend = ws.filter(w => w.status === 'pending'), done = ws.filter(w => w.status !== 'pending').slice(0, 50), ids = users.filter(u => u.idStatus === 'pending');
  $('#main').innerHTML = `<div class="ph"><h1 class="d">Payouts &amp; ID</h1></div>
  <div class="card" style="margin-bottom:14px"><h3>💷 Withdrawals to pay <span class="muted" style="font-size:13px">${pend.length ? gbp(pend.reduce((a, w) => a + w.amount, 0)) + ' total' : ''}</span></h3>
    ${pend.length ? `<div class="tw"><table class="t"><thead><tr><th>Customer</th><th>Amount</th><th>Pay to</th><th>ID</th><th></th></tr></thead><tbody>${pend.map(w => `<tr><td><a href="#customer-${w.userId}" style="color:var(--text);font-weight:800">${esc(w.name)}</a><br><small class="muted">${dt(w.at)}</small></td><td><b>${gbp(w.amount)}</b></td><td>${esc(w.payoutName)} · ****${esc(w.payoutLast4)} <button class="btn ghost sm" data-reveal="${w.userId}">Bank details</button></td><td><span class="st ${w.idStatus === 'verified' ? 'confirmed' : 'pending'}">${w.idStatus}</span></td>
      <td style="text-align:right;white-space:nowrap"><button class="btn sm" data-wpaid="${w.id}" data-amt="${gbp(w.amount)}">Mark paid</button> <button class="btn ghost sm" data-wrej="${w.id}">Return</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No withdrawals waiting. 🎉</p>'}
    <p class="hint">Pay by bank transfer from your account, then press <b>Mark paid</b>. Bank details are encrypted – viewing them is logged.</p></div>
  <div class="card" style="margin-bottom:14px"><h3>🪪 ID documents to check</h3>${ids.length ? `<table class="t">${ids.map(u => `<tr><td><a href="#customer-${u.id}" style="color:var(--text);font-weight:800">${esc(u.first)} ${esc(u.last)}</a><br><small class="muted">${esc(u.address.town)} · joined ${dt(u.createdAt)}</small></td><td style="text-align:right"><a class="btn sm" href="#customer-${u.id}">Review</a></td></tr>`).join('')}</table>` : '<p class="muted">Nothing to check.</p>'}</div>
  <div class="card"><h3>History</h3>${done.length ? `<table class="t">${done.map(w => `<tr><td>${esc(w.name)}</td><td>${gbp(w.amount)}</td><td><span class="st ${w.status === 'paid' ? 'confirmed' : 'expired'}">${w.status}</span>${w.note ? ` <small class="muted">${esc(w.note)}</small>` : ''}</td><td class="muted">${dt(w.paidAt || w.at)}</td></tr>`).join('')}</table>` : '<p class="muted">—</p>'}</div>`;
}
// ================= APP & NOTIFICATIONS =================
async function vApp(preComp) {
  const [a, comps] = await Promise.all([api('/api/admin/app'), api('/api/admin/comps')]);
  const pc = preComp ? comps.find(c => c.id === preComp) : null;
  const fb = a.facebookUrl, grp = a.facebookGroupName || 'Facebook group';
  $('#main').innerHTML = `<div class="ph"><h1 class="d">App &amp; notifications</h1></div>
  <div class="kpis"><div class="kpi"><small>App downloads</small><b>${a.installs}</b><span>${a.installedUsers} logged-in customers</span></div><div class="kpi"><small>Notifications on</small><b style="color:var(--green)">${a.pushSubs}</b><span>devices · ${a.pushUsers.length} customers</span></div></div>
  <div class="cards2">
    <div class="card"><h3>📣 Send a notification</h3>${a.canPush ? '' : '<div class="warn" style="margin-bottom:10px">Push sending works on your live server (it isn’t available in the demo).</div>'}
      <div class="row" style="gap:6px;margin-bottom:10px"><button type="button" class="btn ghost sm" data-tpl="full">🎉 Draw full – going live</button><button type="button" class="btn ghost sm" data-tpl="live">🔴 Going live at…</button><button type="button" class="btn ghost sm" data-tpl="free">🎁 New free draw</button></div>
      <form id="pf"><label>Send to</label><select id="pA"><option value="all">Everyone with notifications on</option>${comps.filter(c => c.status !== 'hidden').map(c => `<option value="${c.id}" ${pc && pc.id === c.id ? 'selected' : ''}>Only people who entered: ${esc(c.title)}</option>`).join('')}</select>
      <div id="pLive" class="live-box hidden"><b>🔴 Going live</b><div class="formgrid" style="margin-top:6px"><div><label>Live at</label><input id="pAt" type="datetime-local"></div><div><label>Link (your Facebook live or group)</label><input id="pLink" placeholder="https://www.facebook.com/…" value="${esc(fb || '')}"></div></div>
        <label class="switch" style="margin-top:8px"><input type="checkbox" id="pRem" checked> Send a reminder automatically when it starts</label><div class="hint">The time also shows as a countdown on the homepage.</div></div>
      <label>Title</label><input id="pT" maxlength="60" placeholder="🔴 We're live!"><label>Message</label><textarea id="pB" rows="3" maxlength="160" placeholder="Drawing the £1,000 cash now – join the live chat"></textarea>
      <label id="pUl">Opens</label><select id="pU">${fb ? `<option value="${esc(fb)}">The ${esc(grp)} (Facebook)</option>` : ''}<option value="/">Home page</option><option value="/#competitions">Competitions</option><option value="/#games">Live games</option><option value="/#winners">Winners</option>${pc ? `<option value="/#comp-${pc.id}" selected>${esc(pc.title)}</option>` : ''}</select>
      <button class="btn block" style="margin-top:12px">Send to ${a.pushSubs} device${a.pushSubs === 1 ? '' : 's'}</button><div class="err" id="pErr"></div></form>
      <p class="hint">Customers are also notified automatically when you go live, when their order is confirmed, when they win and when a withdrawal is paid.</p></div>
    <div class="card"><h3>🔔 Customers with notifications on</h3>${a.pushUsers.length ? `<table class="t">${a.pushUsers.map(u => `<tr><td><a href="#customer-${u.id}" style="color:var(--text);font-weight:700">${esc(u.name)}</a></td><td class="muted">${esc(u.town)}</td></tr>`).join('')}</table>` : '<p class="muted">Nobody yet.</p>'}</div>
  </div>
  <div class="card"><h3>📱 Recent downloads</h3>${a.recentInstalls.length ? `<table class="t">${a.recentInstalls.map(i => `<tr><td>${i.user ? `<a href="#customer-${i.user.id}" style="color:var(--text);font-weight:700">${esc(i.user.name)}</a>` : '<span class="muted">Not logged in</span>'}</td><td>${esc(i.platform || '')}</td><td class="muted">${dt(i.at)}</td></tr>`).join('')}</table>` : '<p class="muted">No downloads yet.</p>'}</div>`;
  const pad = n => String(n).padStart(2, '0'), localISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const atTxt = () => { const v = $('#pAt').value; if (!v) return ''; const d = new Date(v), today = new Date().toDateString() === d.toDateString(); return (today ? 'tonight at ' : d.toLocaleDateString('en-GB', { weekday: 'long' }) + ' at ') + d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }).replace(':00', '').replace(' ', ''); };
  let mode = '';
  const fill = () => { const t = comps.find(c => c.id === $('#pA').value), nm = t ? t.title : 'the draw';
    if (mode === 'full') { $('#pT').value = `🎉 ${nm.slice(0, 40)} is FULL!`.slice(0, 60); $('#pB').value = `We're drawing it LIVE ${atTxt()} in the ${grp} – tap to join us and watch who wins! 🍀`.replace('  ', ' ').slice(0, 160); }
    if (mode === 'live') { $('#pT').value = `🔴 LIVE ${atTxt()}`.slice(0, 60); $('#pB').value = `${t ? nm + ' – ' : ''}we're drawing live ${atTxt()} in the ${grp}. Tap to join!`.slice(0, 160); } };
  const tpl = k => { const t = comps.find(c => c.id === $('#pA').value), nm = t ? t.title : 'the draw'; mode = k;
    $('#pLive').classList.toggle('hidden', k !== 'full' && k !== 'live'); $('#pU').closest('label') ; $('#pU').classList.toggle('hidden', k === 'full' || k === 'live'); $('#pUl').classList.toggle('hidden', k === 'full' || k === 'live');
    if ((k === 'full' || k === 'live') && !$('#pAt').value) { const d = new Date(Date.now() + 3600e3); d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0); $('#pAt').value = localISO(d); }
    if (k === 'full' || k === 'live') fill();
    if (k === 'free') { $('#pT').value = '🎁 New FREE draw – app only'; $('#pB').value = `${t ? nm + ' – ' : ''}grab your free entries in the app before they\'re gone!`.slice(0, 160); $('#pU').value = t ? '/#comp-' + t.id : '/#free'; if (t && !$$('#pU option').some(o => o.value === '/#comp-' + t.id)) { $('#pU').insertAdjacentHTML('beforeend', `<option value="/#comp-${t.id}">${esc(t.title)}</option>`); $('#pU').value = '/#comp-' + t.id; } } };
  $$('[data-tpl]').forEach(b => b.onclick = () => tpl(b.dataset.tpl));
  $('#pAt').addEventListener('change', fill); $('#pA').addEventListener('change', () => mode && fill());
  if (pc) tpl(['soldout', 'ended'].includes(pc.status) ? 'full' : pc.type === 'free' ? 'free' : 'live');
  $('#pf').onsubmit = async e => { e.preventDefault(); $('#pErr').textContent = ''; try { const r = await api('/api/admin/push', { title: $('#pT').value, body: $('#pB').value, url: mode === 'full' || mode === 'live' ? ($('#pLink').value.trim() || '/') : $('#pU').value, audience: $('#pA').value === 'all' ? 'all' : 'entrants', compId: $('#pA').value,
        ...(mode === 'full' || mode === 'live' ? { liveAt: $('#pAt').value ? new Date($('#pAt').value).toISOString() : null, remind: $('#pRem').checked, liveTitle: (comps.find(c => c.id === $('#pA').value) || {}).title } : {}) }); toast(`Sent to ${r.sent} device${r.sent === 1 ? '' : 's'}`); } catch (er) { $('#pErr').textContent = er.message; } };
}

// ================= DONATIONS =================
async function vDonations() {
  const list = (await api('/api/admin/comps')).filter(c => c.charityName && c.charityAmount);
  const done = list.filter(c => c.charityPaid), due = list.filter(c => !c.charityPaid);
  const sum = l => l.reduce((x, c) => x + c.charityAmount, 0);
  const row = c => `<tr><td><div class="mini"><div class="th" style="${img(c.image)}"></div><div><b>${esc(c.title)}</b><br><small class="muted">${c.status}${c.unlimited ? '' : ' · ' + c.pct + '% sold'}</small></div></div></td>
    <td><b>${gbp(c.charityAmount)}</b><br><small class="muted">${esc(c.charityName)}</small></td>
    <td>${c.charityPaid ? '<span class="st confirmed">Donated</span>' : ['soldout', 'ended', 'drawing', 'drawn'].includes(c.status) ? '<span class="st pending">Due now</span>' : '<span class="badge2 b-hidden">Pledged</span>'}</td>
    <td style="text-align:right"><button class="btn ${c.charityPaid ? 'ghost' : ''} sm" data-don="${c.id}">${c.charityPaid ? 'Edit' : 'Record donation'}</button></td></tr>`;
  const CH = await api('/api/admin/charity');
  $('#main').innerHTML = `<div class="ph"><h1 class="d">Charity</h1><a class="btn ghost" href="./#charity" target="_blank" rel="noopener">View charity page ↗</a></div>
    <div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div class="kpi"><small>Donated</small><b style="color:var(--green)">${gbp(sum(done))}</b><span>${done.length} donation${done.length === 1 ? '' : 's'}</span></div>
      <div class="kpi"><small>Due now</small><b style="color:var(--orange)">${gbp(sum(due.filter(c => ['soldout', 'ended', 'drawing', 'drawn'].includes(c.status))))}</b><span>sold out, not yet recorded</span></div>
      <div class="kpi"><small>Pledged</small><b>${gbp(sum(due))}</b><span>on unfinished competitions</span></div></div>
    <p class="muted">Add a charity and amount when you create a competition. Once you've paid it, press <b>Record donation</b> and add a photo – a screenshot of the payment or a picture of you handing it over. It then shows on the public Charity page and adds to the totaliser.</p>
    <div class="card tw" style="padding:0">${list.length ? `<table class="t"><thead><tr><th>Competition</th><th>Donation</th><th>Status</th><th></th></tr></thead><tbody>${[...due, ...done].map(row).join('')}</tbody></table>` : '<p class="muted" style="padding:20px;margin:0">No competitions have a charity donation yet – add one in Competitions → Edit.</p>'}</div>`;
  cache.donComps = list;
  const ST = { new: ['New', 'pending'], shortlisted: ['Shortlisted', 'b-hidden'], added: ['On our list', 'confirmed'], declined: ['Declined', 'expired'] };
  $('#main').insertAdjacentHTML('beforeend', `<div class="cards2" style="margin-top:14px">
    <div class="card"><h3>💡 Suggestions from customers <span class="muted" style="font-size:13px">${(CH.groups || []).reduce((a, g) => a + g.count, 0)}</span></h3>
      ${CH.groups.length ? CH.groups.map(g => `<div class="sg"><div class="sg-top"><b>${esc(g.charity)}</b><span class="st ${ST[g.status][1]}">${ST[g.status][0]}</span><em>${g.count} vote${g.count > 1 ? 's' : ''}</em></div>
        <small class="muted">📍 ${esc(g.towns.slice(0, 5).join(', '))}${g.towns.length > 5 ? '…' : ''}</small>
        <details><summary>Who suggested it</summary>${g.list.map(x => `<div class="sg-one"><b>${esc(x.name)}</b> <small class="muted">${esc(x.town)} · ${dt(x.at)}</small>${x.reason ? `<p>${esc(x.reason)}</p>` : ''}</div>`).join('')}</details>
        <div class="row" style="margin-top:6px">${g.status !== 'added' ? `<button class="btn sm" data-sg="${esc(g.key)}" data-st="added" data-name="${esc(g.charity)}" data-town="${esc(g.towns[0] || '')}">➕ Add to our charities</button>` : ''}${g.status === 'new' ? `<button class="btn ghost sm" data-sg="${esc(g.key)}" data-st="shortlisted">Shortlist</button>` : ''}${g.status !== 'declined' && g.status !== 'added' ? `<button class="btn ghost sm" data-sg="${esc(g.key)}" data-st="declined">Decline</button>` : ''}${g.status === 'declined' ? `<button class="btn ghost sm" data-sg="${esc(g.key)}" data-st="new">Undo</button>` : ''}</div></div>`).join('') : '<p class="muted">No suggestions yet – customers can suggest charities on the Charity page.</p>'}</div>
    <div class="card"><h3>❤️ Our charities</h3><p class="muted" style="margin-top:-4px">These show on the Charity page and appear as options when you add a charity to a prize.</p>
      ${(CH.charities || []).length ? `<table class="t">${CH.charities.map(x => `<tr><td><b>${esc(x.name)}</b>${x.town ? `<br><small class="muted">📍 ${esc(x.town)}</small>` : ''}</td><td style="text-align:right"><button class="btn ghost sm" data-chrm="${esc(x.name)}">Remove</button></td></tr>`).join('')}</table>` : '<p class="muted">None yet.</p>'}
      <form id="chf" class="row" style="margin-top:10px;flex-wrap:wrap"><input id="chN" placeholder="Charity name" style="flex:2;min-width:160px"><input id="chT" placeholder="Town (optional)" style="flex:1;min-width:110px"><button class="btn sm">Add</button></form></div></div>`);
  $$('[data-sg]').forEach(b => b.onclick = async () => { await api('/api/admin/charity/status', { key: b.dataset.sg, status: b.dataset.st, name: b.dataset.name, town: b.dataset.town }); toast(b.dataset.st === 'added' ? 'Added to your charities ❤️' : 'Updated'); vDonations(); });
  $$('[data-chrm]').forEach(b => b.onclick = async () => { await api('/api/admin/charities', { name: b.dataset.chrm, remove: true }); toast('Removed'); vDonations(); });
  $('#chf').onsubmit = async e => { e.preventDefault(); try { await api('/api/admin/charities', { name: $('#chN').value, town: $('#chT').value }); toast('Added ❤️'); vDonations(); } catch (er) { toast(er.message, true); } };
}
// ---- CSV exports ----
async function exportCsv(kind, id) {
  try { const r = await api(`/api/admin/export/${kind}${id ? '?id=' + id : ''}`); const blob = new Blob(['﻿' + r.csv], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = r.filename; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); toast('Download started ⬇️'); }
  catch (e) { toast(e.message, true); }
}
document.addEventListener('click', e => { const b = e.target.closest('[data-export]'); if (b) exportCsv(b.dataset.export, b.dataset.id); });
// ---- bank statement matching: upload the CSV your bank gives you, we find the order references ----
function parseCsv(t) { const rows = []; let row = [], cur = '', q = false; for (let i = 0; i < t.length; i++) { const ch = t[i];
  if (q) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; } else if (ch === '"') q = true; else if (ch === ',' || ch === ';' || ch === '\t') { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; row.push(cur); if (row.some(x => x.trim())) rows.push(row); row = []; cur = ''; } else cur += ch; }
  row.push(cur); if (row.some(x => x.trim())) rows.push(row); return rows; }
function stmtRows(text) {
  const rows = parseCsv(text); if (rows.length < 2) return [];
  const hi = rows.findIndex(r => r.some(c => /date/i.test(c)) && r.some(c => /amount|paid in|credit|money in|value|in \(/i.test(c))); const H = (rows[hi >= 0 ? hi : 0]).map(x => x.trim().toLowerCase());
  const col = re => H.findIndex(x => re.test(x)), dI = col(/date/), inI = col(/paid in|money in|credit amount|^credit|^in\b|in \(£\)/), amI = col(/^amount|value|amount \(/), outI = col(/paid out|money out|debit/);
  const tI = H.map((x, i) => /desc|ref|detail|narrative|memo|payee|name|counter|transaction|particular/.test(x) ? i : -1).filter(i => i >= 0 && i !== dI);
  const num = v => { const n = parseFloat(String(v || '').replace(/[£,\s]/g, '')); return Number.isFinite(n) ? n : 0; };
  return rows.slice((hi >= 0 ? hi : 0) + 1).map(r => { let amt = inI >= 0 ? num(r[inI]) : amI >= 0 ? num(r[amI]) : 0; if (inI < 0 && outI >= 0 && num(r[outI]) > 0) amt = -num(r[outI]);
    return { date: dI >= 0 ? r[dI] : '', text: (tI.length ? tI.map(i => r[i]) : r).join(' ').replace(/\s+/g, ' ').trim(), amount: Math.round(amt * 100) }; }).filter(x => x.amount);
}
function stmtDialog() {
  openDlg(`<h3>🏦 Match a bank statement</h3><p class="muted" style="margin-top:-4px">Download your recent transactions from online banking as a <b>CSV file</b> and choose it here. We find each order reference (e.g. SE7KQ2MD) and amount, and you confirm the matches in one go.</p>
    <input type="file" id="stF" accept=".csv,text/csv,text/plain"><div id="stOut" style="margin-top:10px"></div><div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn ghost sm" data-close>Close</button></div>`);
  $('#stF').onchange = async e => { const f = e.target.files[0]; if (!f) return; const rows = stmtRows(await f.text());
    if (!rows.length) return ($('#stOut').innerHTML = '<div class="err">Couldn’t read any transactions – check it’s the CSV export from your bank.</div>');
    const d = await api('/api/admin/statement', { rows }), R = d.rows.filter(r => r.kind !== 'skip');
    const L = { exact: ['✅ Matches', 'confirmed'], amount: ['🔎 Amount only', 'pending'], over: ['⬆️ Paid more', 'pending'], under: ['⬇️ Paid less', 'expired'], done: ['Already confirmed', 'b-hidden'], none: ['No match', 'expired'] };
    $('#stOut').innerHTML = `<p><b>${R.length}</b> money-in transactions · <b>${R.filter(r => r.kind === 'exact' && !r.seen).length}</b> exact matches ready</p>
      <div class="tw" style="max-height:50vh;overflow:auto"><table class="t"><thead><tr><th></th><th>Bank line</th><th>£</th><th>Order</th><th>Result</th></tr></thead>${R.map((r, i) => `<tr><td>${r.orderId && ['exact', 'amount', 'over'].includes(r.kind) && !r.seen && r.status !== 'confirmed' ? `<input type="checkbox" data-st="${i}" ${r.kind === 'exact' ? 'checked' : ''}>` : ''}</td>
        <td><small>${esc(r.date)}</small><br>${esc(r.text.slice(0, 70))}</td><td>${(r.amount / 100).toFixed(2)}</td><td>${r.ref ? `<b>${esc(r.ref)}</b><br><small>${esc(r.name)} · due ${gbp(r.due)}${r.status !== 'pending' ? ' · ' + esc(r.status) : ''}</small>` : r.candidates ? `<small>${r.candidates} pending orders for this amount</small>` : ''}</td>
        <td><span class="st ${L[r.kind][1]}">${r.seen ? 'Used before' : L[r.kind][0]}</span></td></tr>`).join('')}</table></div>
      <button class="btn block" id="stGo" style="margin-top:10px">Confirm ticked orders</button><p class="hint">“Amount only” means no reference was found but exactly one pending order is for that amount – check the name first. Lines you’ve already used are remembered so nothing is confirmed twice.</p>`;
    $('#stGo').onclick = async () => { const items = $$('[data-st]:checked').map(x => { const r = R[+x.dataset.st]; return { orderId: r.orderId, key: r.key }; }); if (!items.length) return toast('Tick at least one', true);
      const r = await api('/api/admin/statement/confirm', { items }); toast(`Confirmed ${r.done.length} order${r.done.length === 1 ? '' : 's'} ✅`); closeDlg(); vOrders(); }; };
}
async function vInbox() {
  const d = await api('/api/admin/inbox'), ST = { open: ['Open', 'pending'], replied: ['Replied', 'b-hidden'], closed: ['Closed', 'confirmed'] };
  const filt = sessionStorage.getItem('inboxF') || 'open';
  const list = d.list.filter(x => filt === 'all' || (filt === 'complaint' ? x.kind === 'complaint' : x.status === filt));
  const late = x => x.kind === 'complaint' && x.status === 'open' && Date.now() - Date.parse(x.at) > 2 * 864e5;
  $('#main').innerHTML = `<div class="ph"><h1 class="d">Messages & complaints</h1></div>
  <div class="row" style="margin-bottom:12px;flex-wrap:wrap">${[['open', 'Open'], ['replied', 'Replied'], ['closed', 'Closed'], ['complaint', '⚠️ Complaints'], ['all', 'All']].map(([k, l]) => `<button class="btn ${filt === k ? '' : 'ghost'} sm" data-if="${k}">${l} <span class="muted">${d.list.filter(x => k === 'all' || (k === 'complaint' ? x.kind === 'complaint' : x.status === k)).length}</span></button>`).join('')}</div>
  ${list.length ? list.map(x => `<div class="card ib ${x.kind}" style="margin-bottom:10px">
    <div class="ib-top"><b>${x.kind === 'complaint' ? '⚠️ Complaint' : '✉️ Message'} ${esc(x.ref)}</b><span class="st ${ST[x.status][1]}">${ST[x.status][0]}</span>${late(x) ? '<span class="st expired">over 2 days – reply now</span>' : ''}<small class="muted" style="margin-left:auto">${dt(x.at)}</small></div>
    <div class="ib-who"><b>${esc(x.name)}</b> · <a href="mailto:${esc(x.email)}">${esc(x.email)}</a>${x.phone ? ' · ' + esc(x.phone) : ''}${x.user ? ` · <a href="#customer-${x.userId}">customer page</a>` : ''}${x.orderRef ? ` · order <b>${esc(x.orderRef)}</b>` : ''}</div>
    ${x.subject ? `<div class="muted" style="font-size:13px;margin-top:4px">${esc(x.subject)}</div>` : ''}
    <p class="ib-msg">${esc(x.message)}</p>
    ${x.replies.map(r => `<div class="ib-rep"><small>${esc(r.by)} · ${dt(r.at)}</small><p>${esc(r.text)}</p></div>`).join('')}
    <form class="ib-form" data-ib="${x.id}"><textarea rows="3" placeholder="Write a reply – it's emailed to ${esc(x.name)}"></textarea><div class="row" style="margin-top:6px;flex-wrap:wrap"><button class="btn sm">Send reply</button>${x.status !== 'closed' ? `<button type="button" class="btn ghost sm" data-ibst="${x.id}" data-v="closed">Mark resolved</button>` : `<button type="button" class="btn ghost sm" data-ibst="${x.id}" data-v="open">Reopen</button>`}</div></form></div>`).join('') : '<div class="empty">Nothing here.</div>'}
  <p class="hint">Customers send these from the Contact and Complaints pages and get a reference by email. Complaints promise a reply within 2 working days and a final answer within 14 days.</p>`;
  $$('[data-if]').forEach(b => b.onclick = () => { sessionStorage.setItem('inboxF', b.dataset.if); vInbox(); });
  $$('[data-ib]').forEach(f => f.onsubmit = async e => { e.preventDefault(); const t = f.querySelector('textarea').value.trim(); if (!t) return; await api('/api/admin/inbox/' + f.dataset.ib, { reply: t }); toast('Reply sent ✉️'); vInbox(); });
  $$('[data-ibst]').forEach(b => b.onclick = async () => { await api('/api/admin/inbox/' + b.dataset.ibst, { status: b.dataset.v }); toast('Updated'); vInbox(); });
}
async function vPromos() {
  const d = await api('/api/admin/promos'), toLocal = iso => { if (!iso) return ''; const x = new Date(iso); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
  const desc = x => `${x.type === 'percent' ? x.value + '% off' + (x.cap ? ` (max ${gbp(x.cap)})` : '') : gbp(x.value) + ' off'}${x.minSpend ? ` · min spend ${gbp(x.minSpend)}` : ''}${x.compIds.length ? ` · ${x.compIds.length} competition${x.compIds.length > 1 ? 's' : ''} only` : ''}${x.newOnly ? ' · first-time players' : ''}`;
  const live = x => x.active && (!x.endsAt || Date.parse(x.endsAt) > Date.now()) && (!x.maxUses || x.uses < x.maxUses);
  $('#main').innerHTML = `<div class="ph"><h1 class="d">Promo codes</h1></div>
  <div class="cards2"><div class="card"><h3>➕ New code</h3><form id="prf">
    <div class="formgrid"><div><label>Code</label><input id="prC" maxlength="20" required placeholder="e.g. XMAS10" style="text-transform:uppercase"></div>
      <div><label>Discount</label><div class="row"><input id="prV" type="number" min="1" step="1" required placeholder="10" style="flex:1"><select id="prT" style="max-width:120px"><option value="percent">% off</option><option value="amount">£ off</option></select></div></div>
      <div><label>Max discount (£, % codes only)</label><input id="prCap" type="number" min="0" step="0.5" placeholder="no cap"></div>
      <div><label>Minimum spend (£)</label><input id="prMin" type="number" min="0" step="0.5" placeholder="none"></div>
      <div><label>Total uses allowed</label><input id="prMax" type="number" min="0" placeholder="unlimited"></div>
      <div><label>Uses per customer</label><input id="prPer" type="number" min="0" value="1"></div>
      <div><label>Starts</label><input id="prS" type="datetime-local"></div><div><label>Ends</label><input id="prE" type="datetime-local"></div>
      <div class="full"><label>Only these competitions (leave empty for all)</label><select id="prComps" multiple size="5">${d.comps.map(c => `<option value="${c.id}">${esc(c.title)}</option>`).join('')}</select></div>
      <div class="full"><label class="switch"><input type="checkbox" id="prNew"> First-time players only (no paid entry before)</label></div>
      <div class="full"><label>Note (just for you)</label><input id="prNote" maxlength="120" placeholder="e.g. Facebook giveaway"></div></div>
    <button class="btn block" style="margin-top:12px">Create code</button><div class="err" id="prErr"></div></form>
    <p class="hint">Codes work on paid entries only and are checked again at checkout. Free bundle tickets still apply on top. Discounts come off the order total before credit is used.</p></div>
  <div class="card"><h3>🏷️ Your codes</h3>${d.promos.length ? `<div class="tw"><table class="t"><thead><tr><th>Code</th><th>Used</th><th>Discount given</th><th></th></tr></thead>${d.promos.map(x => `<tr class="${live(x) ? '' : 'off'}"><td><b class="code">${esc(x.code)}</b>${live(x) ? '' : ' <span class="st expired">' + (!x.active ? 'off' : x.endsAt && Date.parse(x.endsAt) <= Date.now() ? 'expired' : 'used up') + '</span>'}<br><small class="muted">${esc(desc(x))}${x.endsAt ? ' · ends ' + dt(x.endsAt) : ''}${x.note ? ' · ' + esc(x.note) : ''}</small></td>
      <td>${x.uses}${x.maxUses ? ' / ' + x.maxUses : ''}</td><td>${gbp(x.given)}<br><small class="muted">on ${gbp(x.sales)} of sales</small></td>
      <td style="text-align:right"><button class="btn ghost sm" data-copy="${esc(x.code)}">Copy</button> <button class="btn ${x.active ? 'red' : ''} sm" data-prt="${x.id}" data-v="${x.active ? 0 : 1}">${x.active ? 'Switch off' : 'Switch on'}</button></td></tr>`).join('')}</table></div>` : '<p class="muted">No codes yet.</p>'}</div></div>`;
  $('#prf').onsubmit = async e => { e.preventDefault(); $('#prErr').textContent = ''; const pence = v => Math.round((parseFloat(v) || 0) * 100), T = $('#prT').value;
    try { await api('/api/admin/promos', { code: $('#prC').value, type: T, value: T === 'percent' ? +$('#prV').value : pence($('#prV').value), cap: pence($('#prCap').value), minSpend: pence($('#prMin').value), maxUses: +$('#prMax').value || 0, perUser: +$('#prPer').value || 0,
      startsAt: $('#prS').value ? new Date($('#prS').value).toISOString() : '', endsAt: $('#prE').value ? new Date($('#prE').value).toISOString() : '', compIds: [...$('#prComps').selectedOptions].map(o => o.value), newOnly: $('#prNew').checked, note: $('#prNote').value });
      toast('Promo code created 🏷️'); vPromos(); } catch (er) { $('#prErr').textContent = er.message; } };
  $$('[data-prt]').forEach(b => b.onclick = async () => { await api('/api/admin/promos/' + b.dataset.prt, { active: b.dataset.v === '1' }); toast('Updated'); vPromos(); });
}
function donationDialog(id) {
  const c = cache.donComps.find(x => x.id === id);
  const dl = c.charityPaidAt ? new Date(c.charityPaidAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  openDlg(`<button class="x" data-close>×</button><h3 class="d">${gbp(c.charityAmount)} to ${esc(c.charityName)}</h3><p class="muted" style="margin:4px 0 0">${esc(c.title)}</p>
    <form id="df"><label>Photo (payment screenshot or handing it over)</label>
    <div class="imgdrop"><div class="th" id="dPrev" style="${img(c.charityPhoto)}">${c.charityPhoto ? '' : 'No photo'}</div><div><input type="file" id="dImg" accept="image/jpeg,image/png,image/webp"><div class="hint">JPG, PNG or WebP. Blank out bank details on screenshots.</div></div></div>
    <input type="hidden" id="dUrl" value="${esc(c.charityPhoto || '')}">
    <div class="formgrid"><div><label>Date donated</label><input type="date" id="dDate" value="${dl}"></div><div style="display:flex;align-items:end"><label class="switch"><input type="checkbox" id="dPaid" checked> Donation has been made</label></div>
    <div class="full"><label>Short note (optional)</label><input id="dNote" maxlength="300" value="${esc(c.charityNote || '')}" placeholder="e.g. Handed over to the team at Demelza House, Sittingbourne"></div></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px"><button type="button" class="btn ghost" data-close>Cancel</button><button class="btn">Save</button></div><div class="err" id="dErr"></div></form>`, 'wide');
  $('#dImg').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const r = await api('/api/admin/upload', { dataUrl: await shrink(f) }); $('#dUrl').value = r.url; $('#dPrev').style.backgroundImage = `url('${r.url}')`; $('#dPrev').textContent = ''; } catch (er) { $('#dErr').textContent = er.message; } };
  $('#df').onsubmit = async e => { e.preventDefault();
    try { await api(`/api/admin/comps/${id}/donation`, { paid: $('#dPaid').checked, photo: $('#dUrl').value, note: $('#dNote').value, paidAt: $('#dDate').value }); closeDlg(); toast('Donation saved'); vDonations(); }
    catch (er) { $('#dErr').textContent = er.message; } };
}

// ================= CHAT =================
let chatRoomA = 'community', chatPoll = null;
function chatList(d, compact) {
  return d.messages.length ? d.messages.map(m => `<div class="acm ${m.staff ? 'staff' : ''}"><div><b>${esc(m.name)}</b> <small class="muted">${esc(m.town || '')} · ${new Date(m.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</small>${d.mutes.includes(m.userId) ? ' <span class="badge2 b-closed">muted</span>' : ''}<div>${esc(m.text)}</div></div>
    ${compact ? '' : `<div class="acm-act"><button class="btn ghost sm" data-delmsg="${m.id}">Delete</button>${m.userId ? `<button class="btn ghost sm" data-mute="${m.userId}" data-on="${d.mutes.includes(m.userId) ? 0 : 1}">${d.mutes.includes(m.userId) ? 'Unmute' : 'Mute'}</button>` : ''}</div>`}</div>`).join('') : '<p class="muted">No messages yet.</p>';
}
async function vChat() {
  const d = await api(`/api/admin/chat?room=${chatRoomA}`);
  $('#main').innerHTML = `<div class="ph"><h1 class="d">Chat</h1><div class="row">${d.live.on ? '<span class="st cancelled">🔴 Live now</span> <button class="btn ghost sm" data-golive="0">End live draw</button>' : ''}</div></div>
    <div class="filters"><button class="chipf ${chatRoomA === 'community' ? 'on' : ''}" data-croom="community">Community</button><button class="chipf ${chatRoomA === 'live' ? 'on' : ''}" data-croom="live">🔴 Live draw</button></div>
    <div class="card"><div class="acms" id="acms">${chatList(d)}</div>
    <form id="acf" style="display:flex;gap:8px;margin-top:12px"><input id="acIn" maxlength="300" placeholder="Post as ${esc('Sheppey Elite Raffles')}…"><button class="btn sm">Post</button></form></div>`;
  const box = $('#acms'); box.scrollTop = box.scrollHeight;
  $('#acf').onsubmit = async e => { e.preventDefault(); if (!$('#acIn').value.trim()) return; await api('/api/admin/chat', { room: chatRoomA, text: $('#acIn').value }); vChat(); };
  clearInterval(chatPoll); chatPoll = setInterval(async () => { if (location.hash !== '#chat' || document.activeElement?.id === 'acIn') return; const n = await api(`/api/admin/chat?room=${chatRoomA}`).catch(() => null); if (n && $('#acms')) { const b = $('#acms'), bot = b.scrollHeight - b.scrollTop - b.clientHeight < 60; b.innerHTML = chatList(n); if (bot) b.scrollTop = b.scrollHeight; } }, 4000);
}

// ================= EMAILS =================
async function vEmails() {
  const list = await api('/api/admin/emails'); cache.emails = list;
  $('#main').innerHTML = `<div class="ph"><h1 class="d">Emails</h1></div>
  <p class="muted" style="margin-top:0">Every automatic email: welcome on sign-up, order pending (with bank details and reference), entries confirmed, and winner. ${list.some(e => /not set up/.test(e.status)) ? '<b style="color:var(--orange)">Email sending isn\'t set up yet – see the README (RESEND_API_KEY + "Send emails from" in Settings).</b>' : ''}</p>
  <div class="card tw" style="padding:0"><table class="t"><thead><tr><th>Sent</th><th>To</th><th>Subject</th><th>Type</th><th>Status</th><th></th></tr></thead><tbody>
  ${list.map((e, i) => `<tr><td class="muted">${dt(e.at)}</td><td>${esc(e.to)}</td><td>${esc(e.subject)}</td><td><span class="badge2 b-hidden">${esc(e.kind)}</span></td><td>${/^sent|demo/.test(e.status) ? `<span class="st confirmed">${esc(e.status)}</span>` : /queued/.test(e.status) ? `<span class="st pending">${esc(e.status)}</span>` : `<span class="st cancelled">${esc(e.status)}</span>`}</td><td><button class="btn ghost sm" data-mail="${i}">View</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">No emails yet.</td></tr>'}
  </tbody></table></div>`;
}

// ================= SETTINGS =================
// ---------- GAME CENTRE: seasonal styles for the instant-win games ----------
async function vGames() {
  const site = await api('/api/site'); const T = JSON.parse(JSON.stringify(site.gameThemes || {})), keys = Object.keys(T);
  let live = site.gameSeason || 'standard', ed = live, game = 'plinko', inst = null;
  const SAMPLE = [{ i: 0, prize: '£10 Cash', icon: '💷', cash: 1000, count: 5 }, { i: 1, prize: '£2 Credit', icon: '🎟️', cash: 200, count: 20 }, { i: 2, prize: 'Hamper', icon: '🧺', value: 2500, count: 2 }];
  const field = (k, l, ph) => `<div><label>${l}</label><input data-gk="${k}" value="${esc(T[ed][k] || '')}" placeholder="${esc(ph || '')}"></div>`;
  const render = () => {
    const t = T[ed];
    $('#main').innerHTML = `<div class="ph"><h1 class="d">🎮 Game Centre</h1><div class="row"><button class="btn" id="gcSave">Save styles</button></div></div>
    <p class="muted" style="margin-top:-6px">Choose which season is live on the site, and style each one. Competitions use the live season unless you pick a style on their edit page.</p>
    <div class="gc-seasons">${keys.map(k => `<button type="button" class="gc-s ${k === live ? 'live' : ''} ${k === ed ? 'ed' : ''}" data-gcs="${k}"><b>${esc(T[k].name)}</b><small>${k === live ? '● Live now' : 'Tap to edit'}</small><span class="sw"><i style="background:${T[k].c1}"></i><i style="background:${T[k].c2}"></i><i style="background:${T[k].accent}"></i><i style="background:${T[k].bg};border:1px solid #333"></i></span></button>`).join('')}</div>
    <div class="gc-grid"><div class="card"><h3>${esc(t.name)} style ${ed === live ? '<span class="st confirmed">Live</span>' : `<button type="button" class="btn sm" id="gcLive">Make this the live season</button>`}</h3>
      <div class="gc-cols">${[['c1', 'Colour 1'], ['c2', 'Colour 2'], ['accent', 'Highlight'], ['bg', 'Background'], ['win', 'Win colour'], ['kit', 'Kit (penalty)'], ['keeper', 'Keeper']].map(([k, l]) => `<div><label>${l}</label><input type="color" data-gk="${k}" value="${esc(t[k] || '#000000')}"></div>`).join('')}</div>
      <div class="formgrid" style="margin-top:10px">${field('title', 'Game title', 'INSTANT WINS')}${field('lose', 'Losing message', 'Not this time')}${field('particles', 'Celebration emojis (comma separated)', '🎉,✨,💷')}${field('fill', 'Slot reel filler icons (comma separated)', '🍒,🍋,🔔')}${field('pinata', 'Piñata', '🪅')}<div><label>Decoration</label><select data-gk="deco">${[['classic', '✨ Casino gold'], ['xmas', '🎄 Christmas – tree Plinko, snow, presents'], ['spooky', '🎃 Halloween – moon, bats, cobwebs'], ['party', '🎈 Party – confetti, bunting']].map(([v, l]) => `<option value="${v}" ${(t.deco || 'classic') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
      <div class="hint">Each instant prize's own icon (set on the competition) is the winning symbol in Slots and shows on the wheel, Plinko bins and scratchcards.</div></div>
      <div class="card"><h3>Preview</h3><div class="gc-prev-tabs">${IGames.KINDS.map(k => `<button type="button" data-gcg="${k}" class="${k === game ? 'on' : ''}">${IGames.NAMES[k]}</button>`).join('')}</div>
        <div id="gcHost"></div><div style="display:flex;gap:8px;margin-top:10px;justify-content:center"><button type="button" class="btn ghost sm" id="gcWin">▶ Preview a win</button><button type="button" class="btn ghost sm" id="gcLose">▶ Preview a loss</button><button type="button" class="btn ghost sm" id="gcMany">▶ Play 6</button></div></div></div>`;
    const prev = () => { try { inst && inst.destroy(); } catch { } inst = IGames.create(game, $('#gcHost'), { theme: T[ed], prizes: SAMPLE, logo: 'logo-sm.jpg' }); if (inst.mode === 'scratch') inst.deal(IGames.sample(SAMPLE, 9)); };
    prev();
    $('#gcHost').addEventListener('igaction', () => one(Math.random() < 0.5));
    $$('[data-gk]').forEach(i => i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', () => { T[ed][i.dataset.gk] = i.value; clearTimeout(i._t); i._t = setTimeout(prev, 250); }));
    $$('[data-gcs]').forEach(b => b.onclick = () => { ed = b.dataset.gcs; render(); });
    $$('[data-gcg]').forEach(b => b.onclick = () => { game = b.dataset.gcg; $$('[data-gcg]').forEach(x => x.classList.toggle('on', x === b)); prev(); });
    const one = win => { if (inst.mode === 'scratch') { inst.deal(IGames.sample(SAMPLE, 9)); return inst.scratchAll(); } return inst.play([{ ticket: 123, win: win ? SAMPLE[0] : null }]); };
    $('#gcWin').onclick = () => one(true); $('#gcLose').onclick = () => one(false);
    $('#gcMany').onclick = () => { if (inst.mode === 'scratch') { inst.deal(IGames.sample(SAMPLE, 21)); return inst.scratchAll(); } inst.play(IGames.sample(SAMPLE, 6)); };
    if ($('#gcLive')) $('#gcLive').onclick = () => { live = ed; render(); toast(`${T[ed].name} will go live when you save`); };
    $('#gcSave').onclick = async () => { try { await api('/api/admin/settings', { gameSeason: live, gameThemes: T }); toast('Game styles saved'); } catch (e) { toast(e.message); } };
  };
  render();
}
// DNA Payments keys: paste them in when you're ready – card payments stay off until they're saved, tested and switched on
async function dnaPanel() {
  const box = $('#dnaCard'); if (!box) return;
  let d; try { d = await api('/api/admin/dna'); } catch (e) { box.innerHTML = `<h3>💳 Card payments (DNA Payments)</h3><p class="muted">${esc(e.message)}</p>`; return; }
  const cb = location.origin + '/api/pay/dna/callback';
  const pill = d.live ? `<span class="st confirmed">Card payments ON · ${d.test ? 'TEST' : 'LIVE'}</span>` : '<span class="st pending">Bank transfer only</span>';
  box.innerHTML = `<h3>💳 Card payments (DNA Payments) ${pill}</h3>
    ${d.fromEnv ? '<p class="muted" style="font-size:13px">Your DNA keys are set on the server (environment variables), so they can’t be edited here.</p>' : `
    <div class="formgrid">
      <div><label>Client ID</label><input id="dnaCid" value="${esc(d.clientId)}" autocomplete="off" placeholder="from DNA"></div>
      <div><label>Terminal ID</label><input id="dnaTid" value="${esc(d.terminalId)}" autocomplete="off" placeholder="from DNA"></div>
      <div><label>Client secret ${d.secretSet ? `<span class="muted">(saved ${esc(d.secretHint)})</span>` : ''}</label><input id="dnaSec" type="password" autocomplete="new-password" placeholder="${d.secretSet ? 'Leave blank to keep the saved secret' : 'Paste your client secret'}"></div>
      <div><label>Account</label><select id="dnaMode"><option value="test" ${d.test ? 'selected' : ''}>🧪 Test account (no real money)</option><option value="live" ${!d.test ? 'selected' : ''}>✅ Live account</option></select></div></div>
    <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button type="button" class="btn sm" id="dnaSave">Save keys</button><button type="button" class="btn ghost sm" id="dnaTest">Test connection</button>${d.secretSet || d.clientId ? '<button type="button" class="btn ghost sm" id="dnaDel">Remove keys</button>' : ''}
      <span class="muted" style="font-size:12px;align-self:center">${d.testedAt ? (d.testOk ? `✅ Connected ${new Date(d.testedAt).toLocaleString('en-GB')}` : `❌ Last test failed ${new Date(d.testedAt).toLocaleString('en-GB')}`) : 'Not tested yet'}</span></div>`}
    <div class="hint" style="margin-top:10px">Give DNA this <b>payment result (callback) address</b>: <code>${esc(cb)}</code> <button type="button" class="btn ghost sm" data-copy="${esc(cb)}">Copy</button><br>Every result is checked against DNA's signature and the order before anything is confirmed. Instant-win prizes stay frozen until card payments are on.</div>
    <label class="switch" style="margin-top:12px"><input type="checkbox" id="dnaOn" ${d.cardPayments && d.live ? 'checked' : ''} ${!(d.fromEnv || d.secretSet) ? 'disabled' : ''}> Offer card payments at checkout${!(d.fromEnv || d.secretSet) ? ' <span class="muted">(add your keys first)</span>' : ''}</label>`;
  const val = () => ({ clientId: $('#dnaCid').value.trim(), terminalId: $('#dnaTid').value.trim(), test: $('#dnaMode').value !== 'live', ...($('#dnaSec').value.trim() ? { secret: $('#dnaSec').value.trim() } : {}) });
  if ($('#dnaSave')) $('#dnaSave').onclick = async () => { const v = val(); if (!v.clientId || !v.terminalId || (!v.secret && !d.secretSet)) return toast('Fill in the Client ID, Terminal ID and secret');
    if (!v.test && !confirm('Save LIVE keys? Real cards will be charged once card payments are switched on.')) return; try { await api('/api/admin/dna', v); toast('DNA keys saved securely'); dnaPanel(); } catch (e) { toast(e.message); } };
  if ($('#dnaTest')) $('#dnaTest').onclick = async () => { $('#dnaTest').disabled = true; try { await api('/api/admin/dna/test', {}); toast('✅ DNA accepted your keys'); } catch (e) { toast(e.message); } dnaPanel(); };
  if ($('#dnaDel')) $('#dnaDel').onclick = async () => { if (!confirm('Remove the DNA keys? Card payments will switch off and the site goes back to bank transfer only.')) return; await api('/api/admin/dna', { clear: true }); toast('Keys removed – bank transfer only'); dnaPanel(); };
  $('#dnaOn').onchange = async e => { const on = e.target.checked;
    if (on && !confirm(`Switch card payments ON${d.test ? ' (TEST account)' : ' (LIVE – real cards)'}?\n\nInstant-win prizes unfreeze, and orders containing them must be paid by card.`)) { e.target.checked = false; return; }
    try { const r = await api('/api/admin/dna', { cardPayments: on }); toast(on ? (r.live ? '💳 Card payments are ON' : 'Saved – but keys are missing') : 'Card payments OFF – bank transfer only'); } catch (er) { toast(er.message); } dnaPanel(); };
}
async function vSettings() {
  const s = await api('/api/admin/settings');
  const f = (k, l, ph, type) => `<div><label>${l}</label><input data-k="${k}" type="${type || 'text'}" value="${esc(s[k])}" placeholder="${esc(ph || '')}"></div>`;
  $('#main').innerHTML = `<div class="ph"><h1 class="d">Settings</h1></div><form id="sf" style="max-width:980px">
  <div class="card" style="margin-bottom:14px"><h3>Bank details shown at checkout</h3><div class="formgrid">${f('accountName', 'Account name')}${f('bankName', 'Bank (optional)')}${f('sortCode', 'Sort code', '00-00-00')}${f('accountNumber', 'Account number', '12345678')}${f('reservationHours', 'Hold unpaid orders for (hours)', '12', 'number')}</div></div>
  <div class="card" style="margin-bottom:14px"><h3>👑 Weekly Elite Player draw</h3><label class="switch"><input type="checkbox" id="sElite" ${s.eliteWeekly ? 'checked' : ''}> Run a free weekly draw for everyone who makes a paid entry</label>
    <div class="formgrid" style="margin-top:8px"><div><label>Prize</label><input id="sEP" value="${esc(s.eliteWeeklyPrize || '£50 Cash')}"></div><div><label>Minimum spend that week (£, 0 = any paid entry)</label><input id="sEM" type="number" min="0" step="1" value="${(s.eliteWeeklyMin || 0) / 100}"></div>
    <div><label>Reveal</label><select id="sEX">${[['lms', '☠️ Last Man Standing'], ['wheel', '🎡 Wheel'], ['reel', '🎰 Name reveal'], ['plinko', '🪂 Sheppey Drop'], ['scratch', '🍀 Scratch card'], ['number', '🔢 Google number']].map(([v, l]) => `<option value="${v}" ${(s.eliteWeeklyMethod || 'lms') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
    <p class="muted" style="font-size:13px">A new "Weekly Elite Player" competition is created every Monday. Customers are entered automatically (one entry each) as soon as a paid entry is confirmed. It closes Sunday night and appears in Draws ready to draw live.</p></div>
  <div class="card" style="margin-bottom:14px"><h3>🎂 Birthdays & reminders</h3>
    <label class="switch"><input type="checkbox" id="sBdOn" ${s.birthdayOn ? 'checked' : ''}> Birthday credit – customers can add their birthday in My details and get free credit on the day</label>
    <div class="formgrid" style="margin-top:8px"><div><label>Birthday credit amount (£)</label><input id="sBday" type="number" min="0" step="0.5" value="${(s.birthdayCredit ?? 100) / 100}"></div><div class="hint" style="align-self:end">Credit is spend-only. A birthday can only be changed once a year, and one added in the last 30 days doesn't pay out.</div></div>
    <label class="switch"><input type="checkbox" id="sRem" ${s.remindersOn !== false ? 'checked' : ''}> Reminders: unpaid order about to expire, basket left behind (after 2 hours), favourites nearly sold out or closing</label></div>
  <div class="card" style="margin-bottom:14px"><h3>⚠️ Unpaid-order strikes</h3>
    <label class="switch"><input type="checkbox" id="sStk" ${s.strikesOn !== false ? 'checked' : ''}> When an order expires unpaid, the customer gets a strike (they're told by app notification and email)</label>
    <div class="formgrid" style="margin-top:8px"><div><label>Strikes before a pause</label><input id="sStkN" type="number" min="1" max="20" value="${s.strikeLimit ?? 5}"></div><div><label>Pause length (days)</label><input id="sStkD" type="number" min="1" max="365" value="${s.strikeBanDays ?? 7}"></div>
    <div><label>Strikes drop off after (days)</label><input id="sStkE" type="number" min="7" max="730" value="${s.strikeExpiryDays ?? 90}"></div><div class="hint" style="align-self:end">Confirming or reopening an expired order removes its strike. Clear strikes or lift a pause on the customer's page.</div></div></div>
  <div class="card" style="margin-bottom:14px"><h3>⚡ Quick add</h3>
    <div class="formgrid"><div><label>Start each prize at about (£)</label><input id="sQAT" type="number" min="1" max="100" step="0.5" value="${((s.quickAddTarget ?? 750) / 100).toFixed(2)}"></div><div class="hint" style="align-self:end">Quick add on the homepage cards and the prize page start at roughly this much – e.g. at £7.50 a 1p prize starts at 750 tickets, a 49p prize at 15 and a £9.99 prize at 1. Bundle amounts are used when they're close.</div></div></div>
  <div class="card" style="margin-bottom:14px"><h3>🏦 Bank transfer saving</h3>
    <div class="formgrid"><div><label>% off orders paid by bank transfer (0 = off)</label><input id="sBankD" type="number" min="0" max="20" step="0.05" value="${s.bankDiscount ?? 1.25}"></div><div class="hint" style="align-self:end">Shown at checkout as “we don’t pay card fees on bank transfers, so we pass that saving back to you – this means more prizes and more donated to local charitable causes”. It comes off whatever is left to pay after credit/cash, and makes transfer amounts less round so they’re easier to match on your statement. 1.25% gives the most varied amounts. Card payments don’t get it.</div></div></div>
  <div class="card" style="margin-bottom:14px"><h3>🛡️ Player protection page</h3><label class="switch"><input type="checkbox" id="sUP" ${s.uniquePence ? 'checked' : ''}> Make every bank transfer amount unique (takes 1–9p off an order when another unpaid order has the same total – makes statement matching foolproof)</label>
    <label class="switch"><input type="checkbox" id="sDcms" ${s.dcmsCode ? 'checked' : ''}> We've signed up to the UK Government's Voluntary Code of Good Practice for Prize Draw Operators</label><p class="muted" style="font-size:13px">Only tick this once you've actually signed up with DCMS – it adds a badge to the public Player protection page.</p></div>
  <div class="card" style="margin-bottom:14px" id="dnaCard"><h3>💳 Card payments (DNA Payments)</h3><div class="muted">Loading…</div></div>
  <div class="card" style="margin-bottom:14px"><h3>Site</h3><div class="formgrid">${f('siteName', 'Site name')}${f('tagline', 'Tagline')}${f('siteUrl', 'Site address', 'https://…')}${f('contactEmail', 'Contact email', '', 'email')}${f('facebookUrl', 'Facebook group link', 'https://www.facebook.com/groups/…')}${f('facebookGroupName', 'Facebook group name')}
    <div class="full"><label class="switch"><input type="checkbox" id="sPostal" ${s.postalOn !== false ? 'checked' : ''}> Offer free postal entry</label><div class="hint">When off, every mention of postal entry disappears from the site (prize pages, homepage, FAQs, footer, terms line). ⚠️ A free entry route (or a genuine skill question) is what keeps paid prize competitions outside gambling law – check with your adviser before switching it off. Postal entries you've already received can still be added in Draws → Postal entry.</div></div>
    <div class="full"><label>Free postal entry address</label><input data-k="postalAddress" value="${esc(s.postalAddress)}"></div>
    <div class="full"><label>Categories (one per line)</label><textarea data-k="categories" rows="4">${esc(s.categories.join('\n'))}</textarea></div>
    <div class="full"><label>Short terms (shown in the footer)</label><textarea data-k="terms" rows="3">${esc(s.terms)}</textarea></div></div></div>
  <div class="card" style="margin-bottom:14px"><h3>Terms &amp; privacy pages</h3><p class="muted" style="margin-top:0;font-size:13px">These are a starting template – have them checked before you launch. Start a line with <b>## </b> for a heading and <b>- </b> for a bullet point. Customers agree to both when they register.</p>
    <label>Terms &amp; conditions</label><textarea data-k="termsFull" rows="12">${esc(s.termsFull || '')}</textarea>
    <label>Privacy policy</label><textarea data-k="privacyPolicy" rows="12">${esc(s.privacyPolicy || '')}</textarea>
    <div class="row" style="margin-top:10px"><a class="btn ghost sm" href="./#terms" target="_blank" rel="noopener">View terms ↗</a><a class="btn ghost sm" href="./#privacy" target="_blank" rel="noopener">View privacy ↗</a></div></div>
  <div class="card" style="margin-bottom:14px"><h3>Emails</h3><div class="formgrid">${f('emailFrom', 'Send emails from', 'Sheppey Elite Raffles <hello@yourdomain.co.uk>')}<div class="hint" style="align-self:end">Needs a verified domain on Resend and the RESEND_API_KEY on your server (see README).</div></div></div>
  <button class="btn">Save settings</button><span class="err" id="serr" style="margin-left:12px"></span></form>`;
  dnaPanel();
  // group the cards into tabs – every field stays in the one form, so Save still saves the lot
  { const TABS = [['pay', '💷 Payments', /bank details|bank transfer|card payments|unpaid-order/i], ['players', '🙋 Players', /birthday|player protection|quick add/i], ['draws', '🎡 Draws', /elite player|draw/i], ['site', '🌐 Site & emails', /site|terms|emails/i]];
    const cards = $$('#sf > .card'); cards.forEach(c => { const t = (c.querySelector('h3')?.textContent || ''); c.dataset.stab = (TABS.find(x => x[2].test(t)) || TABS[3])[0]; });
    const bar = document.createElement('div'); bar.className = 'stabs'; bar.innerHTML = TABS.map(([k, l]) => `<button type="button" data-stab-go="${k}">${l}</button>`).join(''); $('#sf').prepend(bar);
    const show = k => { try { sessionStorage.setItem('ser_stab', k); } catch { } bar.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.stabGo === k)); cards.forEach(c => c.classList.toggle('hidden', c.dataset.stab !== k)); };
    bar.onclick = e => { const b = e.target.closest('[data-stab-go]'); if (b) show(b.dataset.stabGo); };
    let k0 = 'pay'; try { k0 = sessionStorage.getItem('ser_stab') || 'pay'; } catch { } show(k0); }
  $('#sf').onsubmit = async e => { e.preventDefault(); const b = {}; $$('[data-k]').forEach(i => b[i.dataset.k] = i.value); b.dcmsCode = $('#sDcms').checked; b.postalOn = $('#sPostal').checked; b.uniquePence = $('#sUP').checked; b.bankDiscount = parseFloat($('#sBankD').value) || 0; b.strikesOn = $('#sStk').checked; b.strikeLimit = +$('#sStkN').value; b.strikeBanDays = +$('#sStkD').value; b.strikeExpiryDays = +$('#sStkE').value; b.quickAddTarget = Math.round((parseFloat($('#sQAT').value) || 7.5) * 100); b.birthdayOn = $('#sBdOn').checked; b.remindersOn = $('#sRem').checked; b.birthdayCredit = Math.round((parseFloat($('#sBday').value) || 0) * 100);
    b.eliteWeekly = $('#sElite').checked; b.eliteWeeklyPrize = $('#sEP').value; b.eliteWeeklyMin = Math.round((parseFloat($('#sEM').value) || 0) * 100); b.eliteWeeklyMethod = $('#sEX').value;
    try { await api('/api/admin/settings', b); toast('Settings saved'); $('#serr').textContent = ''; } catch (er) { $('#serr').textContent = er.message; } };
}

// ================= SECURITY =================
async function vSecurity() {
  const [me, log, ST] = await Promise.all([api('/api/admin/me'), can('audit') ? api('/api/admin/audit') : null, can('staff') ? api('/api/admin/staff') : null]);
  $('#main').innerHTML = `<div class="ph"><h1 class="d">Security & activity</h1></div>
  <div class="cards2 even">
    <div class="card"><h3>Two-factor sign-in ${me.twoFactor ? '<span class="st confirmed">On</span>' : '<span class="st pending">Off</span>'}</h3>
      <p class="muted" style="margin-top:0">Requires a 6-digit code from Google Authenticator, Microsoft Authenticator or similar every time you sign in. Strongly recommended.</p>
      <div id="tfa">${me.twoFactor ? '<label>Current code to turn off</label><input id="tfc" inputmode="numeric" maxlength="6"><button class="btn red sm" id="tfOff" style="margin-top:10px">Turn off 2FA</button>' : '<button class="btn" id="tfSet">Set up 2FA</button>'}</div><div class="err" id="tfErr"></div></div>
    <div class="card"><h3>Password & sessions</h3><form id="pwf"><label>Current password</label><input type="password" id="pc" autocomplete="current-password" required><label>New password (12+ characters, letters and numbers)</label><input type="password" id="pn" autocomplete="new-password" minlength="12" required>
      <button class="btn sm" style="margin-top:12px">Change password</button><div class="err" id="pwErr"></div></form>
      <p class="muted" style="font-size:13px">You're signed in on ${me.sessions} device${me.sessions === 1 ? '' : 's'}. Sessions end after 2 hours idle.</p><button class="btn ghost sm" id="allOut">Sign out everywhere</button></div>
  </div>
  ${ST ? `<div class="card"><h3>👥 Staff accounts</h3>
    <div class="tw"><table class="t"><thead><tr><th>Person</th><th>Access</th><th>2FA</th><th>Last sign in</th><th></th></tr></thead>
    ${ST.staff.map(a => `<tr class="${a.disabled ? 'off' : ''}"><td><b>${esc(a.name)}</b>${a.me ? ' <span class="muted">(you)</span>' : ''}<br><small class="muted">${esc(a.email)}</small>${a.mustChange ? '<br><span class="st pending">hasn’t signed in yet</span>' : ''}${a.disabled ? '<br><span class="st expired">switched off</span>' : ''}</td>
      <td><select data-st-role="${a.id}" ${a.me ? 'disabled' : ''}>${ST.roles.map(r => `<option value="${r}" ${a.role === r ? 'selected' : ''}>${ROLE_INFO[r][0]}</option>`).join('')}</select>
        ${a.role === 'employee' || a.role === 'viewer' ? `<label class="switch" style="margin-top:6px;font-size:12px"><input type="checkbox" data-st-pay="${a.id}" ${a.canPay ? 'checked' : ''}> ${a.role === 'viewer' ? 'Can see' : 'Can check & confirm'} payments</label>` : ''}</td>
      <td>${a.twoFactor ? '🔐' : '<span class="muted">off</span>'}</td><td class="muted">${a.lastLogin ? dt(a.lastLogin) : 'never'}</td>
      <td style="text-align:right;white-space:nowrap">${a.me ? '' : `<button class="btn ghost sm" data-st-reset="${a.id}">New password</button> <button class="btn ${a.disabled ? '' : 'red'} sm" data-st-off="${a.id}" data-v="${a.disabled ? 0 : 1}">${a.disabled ? 'Switch on' : 'Switch off'}</button>`}</td></tr>`).join('')}</table></div>
    <h3 style="margin-top:16px">➕ Add a staff member</h3>
    <form id="stf"><div class="formgrid"><div><label>Name</label><input id="stN" maxlength="60" placeholder="e.g. Sam"></div><div><label>Email</label><input id="stE" type="email" required placeholder="sam@example.com"></div></div>
      <label>Access</label><div class="role-pick">${ST.roles.map(r => `<label><input type="radio" name="stR" value="${r}" ${r === 'employee' ? 'checked' : ''}><b>${ROLE_INFO[r][0]}</b><small>${ROLE_INFO[r][1]}</small></label>`).join('')}</div>
      <label class="switch" style="margin-top:8px"><input type="checkbox" id="stP"> Employee/viewer can also check and confirm bank-transfer payments (sees order amounts only – not revenue, balances, payouts or bank details)</label>
      <button class="btn" style="margin-top:12px">Create account</button><div class="err" id="stErr"></div></form>
    <p class="hint">They get a temporary password to sign in at <b>${esc(location.origin + location.pathname)}</b> and must choose their own straight away. Everything staff do is in the activity log, and anything they try that their access doesn't allow is blocked and logged. Ask everyone to turn on 2FA.</p></div>` : ''}
  ${log ? `<div class="card"><h3>Activity log</h3><div class="tw"><table class="t"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th><th>IP</th></tr></thead><tbody>
  ${log.map(l => `<tr><td class="muted" style="white-space:nowrap">${dt(l.at)}</td><td>${esc(l.who)}</td><td><b style="color:${/fail|lock|void/.test(l.action) ? 'var(--red2)' : 'var(--text)'}">${esc(l.action)}</b></td><td>${esc(l.detail)}</td><td class="muted">${esc(l.ip)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Nothing yet.</td></tr>'}</tbody></table></div></div>` : ''}`;
  const showPw = (email, pw) => openDlg(`<h3>Temporary password</h3><p>Give this to <b>${esc(email)}</b> (in person or by text – not in a group chat). They have to choose their own password as soon as they sign in.</p><div class="secret" style="font-size:22px;text-align:center">${esc(pw)}</div><p class="muted" style="font-size:13px">Sign-in page: ${esc(location.origin + location.pathname)}</p><div class="row" style="justify-content:flex-end"><button class="btn ghost sm" data-copy="${esc(pw)}">Copy</button><button class="btn sm" data-close>Done</button></div>`);
  const stf = $('#stf'); if (stf) stf.onsubmit = async e => { e.preventDefault(); $('#stErr').textContent = ''; try { const r = await api('/api/admin/staff', { name: $('#stN').value, email: $('#stE').value, role: (stf.querySelector('[name=stR]:checked') || {}).value, canPay: $('#stP').checked }); await vSecurity(); showPw(r.staff.email, r.tempPassword); } catch (er) { $('#stErr').textContent = er.message; } };
  const upd = async (id, body) => { try { await api('/api/admin/staff/' + id, body); toast('Staff access updated'); } catch (er) { toast(er.message, true); } vSecurity(); };
  $$('[data-st-role]').forEach(x => x.onchange = () => upd(x.dataset.stRole, { role: x.value }));
  $$('[data-st-pay]').forEach(x => x.onchange = () => upd(x.dataset.stPay, { canPay: x.checked }));
  $$('[data-st-off]').forEach(x => x.onclick = () => x.dataset.v === '1' ? confirmDlg('Switch off this account?', 'They’re signed out straight away and can’t sign in until you switch it back on.', 'Switch off', () => upd(x.dataset.stOff, { disabled: true })) : upd(x.dataset.stOff, { disabled: false }));
  $$('[data-st-reset]').forEach(x => x.onclick = () => confirmDlg('Give them a new password?', 'Signs them out everywhere, turns off their 2FA and creates a new temporary password.', 'Create', async () => { const r = await api(`/api/admin/staff/${x.dataset.stReset}/reset`, {}); const a = ST.staff.find(y => y.id === x.dataset.stReset); showPw(a.email, r.tempPassword); }));
  const set = $('#tfSet'); if (set) set.onclick = async () => {
    try { const r = await api('/api/admin/2fa/setup', {});
      $('#tfa').innerHTML = `<p>1. In your authenticator app, add an account and enter this key:</p><div class="secret">${esc(r.secret.replace(/(.{4})/g, '$1 ').trim())}</div><p style="margin-bottom:0">2. Enter the 6-digit code it shows:</p><input id="tfc" inputmode="numeric" maxlength="6" style="margin-top:8px"><button class="btn sm" id="tfOn" style="margin-top:10px">Turn on 2FA</button>`;
      $('#tfOn').onclick = async () => { try { await api('/api/admin/2fa/enable', { code: $('#tfc').value }); ME.twoFactor = true; toast('Two-factor sign-in is on'); route(); } catch (e) { $('#tfErr').textContent = e.message; } };
    } catch (e) { $('#tfErr').textContent = e.message; } };
  const off = $('#tfOff'); if (off) off.onclick = async () => { try { await api('/api/admin/2fa/disable', { code: $('#tfc').value }); ME.twoFactor = false; toast('2FA turned off'); route(); } catch (e) { $('#tfErr').textContent = e.message; } };
  $('#pwf').onsubmit = async e => { e.preventDefault(); try { await api('/api/admin/password', { current: $('#pc').value, next: $('#pn').value }); e.target.reset(); toast('Password changed – other devices signed out'); } catch (er) { $('#pwErr').textContent = er.message; } };
  $('#allOut').onclick = () => confirmDlg('Sign out everywhere?', 'Ends every admin session, including this one.', 'Sign out all', async () => { await api('/api/admin/logout-all', {}); ME = null; renderLogin(); });
}

// ================= EVENTS / BOOT =================
document.addEventListener('click', async e => {
  const t = e.target.closest('button, a'); if (!t) return;
  if (t.hasAttribute('data-close')) closeDlg();
  if (t.hasAttribute('data-logout')) { try { await api('/api/admin/logout', {}); } catch {} ME = null; renderLogin(); }
  if (t.hasAttribute('data-side')) $('#side').classList.toggle('on');
  if (t.closest('.side') && t.tagName === 'A') $('#side').classList.remove('on');
  if (t.dataset.confirm) { if (!cache.orders || !cache.orders.some(o => o.id === t.dataset.confirm)) cache.orders = await api('/api/admin/orders'); orderAction(t.dataset.confirm, 'confirm'); }
  if (t.dataset.cancel) orderAction(t.dataset.cancel, 'cancel');
  if (t.dataset.reopen) orderAction(t.dataset.reopen, 'reopen');
  if (t.dataset.of) { ordFilter = t.dataset.of; vOrders(); }
  if (t.hasAttribute('data-postal')) postalDialog();
  if (t.dataset.don) donationDialog(t.dataset.don);
  if (t.dataset.ustrikes) { if (!confirm(t.dataset.unban ? 'Clear strikes and let them enter again now?' : 'Clear this customer’s strikes?')) return; await api(`/api/admin/users/${t.dataset.ustrikes}/strikes`, { unban: !!t.dataset.unban }); toast('Strikes cleared'); route(); return; }
  if (t.dataset.uverify) { await api(`/api/admin/users/${t.dataset.uverify}/verify`, {}); toast('Email marked as confirmed'); route(); }
  if (t.dataset.ureset) {
    const id = t.dataset.ureset;
    confirmDlg('Send a password reset?', 'This emails the customer a link to choose a new password. It works for 24 hours, and you\'ll also get the link to send by text if they can\'t find the email.', 'Send reset link', async () => {
      const r = await api(`/api/admin/users/${id}/reset`, {});
      setTimeout(() => openDlg(`<h3 class="d">Reset link sent ✅</h3><p>Emailed to <b>${esc(r.email)}</b>. You can also copy it and text it to <b>${esc(r.phone)}</b>:</p>
        <div class="secret" style="font-size:13px;letter-spacing:0;text-align:left">${esc(r.link)}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn ghost" data-copy="${esc(r.link)}">Copy link</button><button class="btn" data-close>Done</button></div>`), 50);
    });
  }
  if (t.dataset.croom) { chatRoomA = t.dataset.croom; vChat(); }
  if (t.dataset.delmsg) { await api('/api/admin/chat/' + t.dataset.delmsg, null, 'DELETE'); toast('Message deleted'); location.hash === '#chat' ? vChat() : t.closest('.acm')?.remove(); }
  if (t.dataset.mute) { await api('/api/admin/chat/mute', { userId: t.dataset.mute, on: t.dataset.on === '1' }); toast(t.dataset.on === '1' ? 'Muted' : 'Unmuted'); vChat(); }
  if (t.dataset.golive) { await api('/api/admin/live', { on: t.dataset.golive === '1', compId: t.dataset.comp || null }); toast(t.dataset.golive === '1' ? 'You\'re live – the Live draw chat is lit up' : 'Live draw ended'); route(); }
  if (t.dataset.reveal) { try { const r = await api(`/api/admin/users/${t.dataset.reveal}/payout`); openDlg(`<h3 class="d">Bank details</h3><table class="t"><tr><td class="muted">Name</td><td><b>${esc(r.name)}</b></td></tr><tr><td class="muted">Sort code</td><td><b>${esc(r.sortCode.replace(/(\d\d)(\d\d)(\d\d)/, '$1-$2-$3'))}</b> <button class="btn ghost sm" data-copy="${esc(r.sortCode)}">Copy</button></td></tr><tr><td class="muted">Account</td><td><b>${esc(r.accountNumber)}</b> <button class="btn ghost sm" data-copy="${esc(r.accountNumber)}">Copy</button></td></tr></table><p class="muted" style="font-size:12px">Viewing is recorded in the security log.</p><button class="btn block" data-close>Close</button>`); } catch (er) { toast(er.message, true); } }
  if (t.dataset.iddoc) { try { const r = await api(`/api/admin/users/${t.dataset.iddoc}/iddoc/${t.dataset.i}`); openDlg(`<button class="x" data-close>×</button><h3 class="d">${esc(r.kind)} · ${dt(r.at)}</h3><img src="${r.dataUrl}" alt="" style="width:100%;border-radius:12px;margin-top:8px"><p class="muted" style="font-size:12px">Check the name and date of birth match the account. Viewing is logged.</p>`, 'wide'); } catch (er) { toast(er.message, true); } }
  if (t.dataset.idok) { await api(`/api/admin/users/${t.dataset.idok}/identity`, { status: 'verified' }); toast('ID verified – customer emailed'); route(); }
  if (t.dataset.idno) { const id = t.dataset.idno; openDlg(`<h3 class="d">Reject ID document</h3><label>Reason (sent to the customer)</label><input id="idr" placeholder="e.g. Photo is blurry – name not readable"><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn ghost" data-close>Cancel</button><button class="btn red" id="idrOk">Reject</button></div>`); $('#idrOk').onclick = async () => { await api(`/api/admin/users/${id}/identity`, { status: 'rejected', note: $('#idr').value }); closeDlg(); toast('Customer asked to upload again'); route(); }; }
  if (t.dataset.wpaid) confirmDlg('Mark as paid?', `Only do this once you've sent <b>${esc(t.dataset.amt)}</b> from your bank. The customer is emailed.`, 'Mark paid', async () => { await api(`/api/admin/withdrawals/${t.dataset.wpaid}/paid`, {}); toast('Marked paid'); route(); });
  if (t.dataset.wrej) { const id = t.dataset.wrej; openDlg(`<h3 class="d">Return withdrawal</h3><p class="muted">The money goes back into the customer's balance.</p><label>Reason</label><input id="wr"><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px"><button class="btn ghost" data-close>Cancel</button><button class="btn red" id="wrOk">Return to balance</button></div>`); $('#wrOk').onclick = async () => { await api(`/api/admin/withdrawals/${id}/reject`, { note: $('#wr').value }); closeDlg(); toast('Returned to balance'); route(); }; }
  if (t.dataset.copy) { try { await navigator.clipboard.writeText(t.dataset.copy); toast('Copied'); } catch { toast('Copy not available here', true); } }
  if (t.dataset.mail) { const m = cache.emails[+t.dataset.mail]; openDlg(`<button class="x" data-close>×</button><h3 class="d" style="font-size:18px">${esc(m.subject)}</h3><p class="muted" style="margin:4px 0 10px">To ${esc(m.to)} · ${dt(m.at)}</p><iframe class="mail" sandbox srcdoc="${esc(m.html)}"></iframe>`, 'wide'); }
});
window.addEventListener('hashchange', route);
function renderChangePw() {
  $('#app').innerHTML = `<div class="login"><form class="box" id="cpf"><img src="logo.jpg" alt="">
    <h2 class="d" style="text-align:center;margin:0 0 4px">Choose your password</h2>
    <p class="muted" style="text-align:center;margin:0 0 8px">Welcome ${esc(ME.name || '')}! You signed in with a temporary password – pick your own to carry on.</p>
    <label>Temporary password</label><input id="cp0" type="password" autocomplete="current-password" required>
    <label>New password (12+ characters, letters and numbers)</label><input id="cp1" type="password" autocomplete="new-password" minlength="12" required>
    <button class="btn lg block" style="margin-top:18px">Save & continue</button><div class="err" id="cperr"></div>
    <button type="button" class="btn ghost sm block" data-logout style="margin-top:10px">Sign out</button></form></div>`;
  $('#cpf').onsubmit = async e => { e.preventDefault(); try { await api('/api/admin/password', { current: $('#cp0').value, next: $('#cp1').value }); await boot(); } catch (er) { $('#cperr').textContent = er.message; } };
}
const can = k => !!(ME && ME.perms && ME.perms[k]);
const ROLE_INFO = { owner: ['👑 Owner', 'Everything, including staff accounts'], admin: ['🛡️ Admin', 'Everything except staff accounts'], employee: ['🧑‍💼 Employee', 'Competitions, draws, live, chat, customers & app alerts – no money'], viewer: ['👀 Viewer', 'Can look around but not change anything – no money'] };
async function boot() {
  try { ME = await api('/api/admin/me'); } catch { return renderLogin(); }
  if (ME.mustChange) return renderChangePw();
  if (!location.hash) location.hash = 'dashboard';
  route();
}
boot();
setInterval(() => { if (ME && !document.hidden && !dlg().open && /^#(dashboard|orders)?$/.test(location.hash || '#dashboard') && !document.activeElement?.matches('input,textarea,select')) route(); }, 60000);
// ---------- JACKPOT: a % of every confirmed order grows a pot that drops on a random ticket at a random amount ----------
async function vJackpot() {
  const d = await api('/api/admin/jackpot'), S = d.settings, R = d.round;
  const pnd = v => ((Number(v) || 0) / 100).toFixed(2);
  $('#main').innerHTML = `<div class="ph"><h1 class="d">💰 Jackpot</h1>${d.on ? '<span class="st confirmed">Running</span>' : '<span class="st pending">Off</span>'}</div>
  <p class="muted" style="margin-top:-6px">A share of every confirmed order goes into the pot. When each round starts, a secret drop point is picked at random – to the penny – between your minimum and your cap. When the pot reaches it, one confirmed ticket from this round wins the lot, paid straight to their account. Nobody, including you, can see the drop point until it drops.</p>
  <div class="jpa-grid">
    <div class="card"><h3>This round ${R ? '#' + R.n : ''}</h3>${R ? `<div class="jpa-pot">${gbp(R.pot)}</div><div class="jpa-bar"><i style="width:${Math.min(100, R.pot / R.cap * 100).toFixed(1)}%"></i></div>
      <div class="jpa-stats"><div><b>${gbp(R.min)}</b><small>Can drop from</small></div><div><b>${gbp(R.cap)}</b><small>Must drop by</small></div><div><b>${R.entries.toLocaleString()}</b><small>Entries (tickets)</small></div><div><b>${R.orders}</b><small>Orders added</small></div><div><b>${gbp(R.added)}</b><small>Added by orders</small></div><div><b>${gbp(R.seed)}</b><small>Started at</small></div></div>
      <div class="hint">Started ${new Date(R.startedAt).toLocaleString('en-GB')} · fingerprint <code style="word-break:break-all">${esc(R.commit || '…')}</code></div>
      <div class="row" style="margin-top:10px"><input id="jpTop" type="number" min="0.01" step="0.01" placeholder="£" style="max-width:110px"><button class="btn ghost sm" id="jpTopBtn">Top up the pot</button></div><div class="hint">Add your own money to make the pot bigger (e.g. a promotion). If it passes the drop point it drops straight away.</div>`
      : '<p class="muted">Switch the jackpot on to start the first round.</p>'}</div>
    <div class="card"><h3>Settings</h3>
      <label class="switch"><input type="checkbox" id="jpOn" ${d.on ? 'checked' : ''}> Jackpot on</label>
      <div class="formgrid" style="margin-top:10px">
        <div><label>% of every confirmed order</label><input id="jpPct" type="number" min="0" max="20" step="0.05" value="${S.pct}"></div>
        <div><label>Paid as</label><select id="jpPay"><option value="credit" ${S.pay !== 'cash' ? 'selected' : ''}>Site credit</option><option value="cash" ${S.pay === 'cash' ? 'selected' : ''}>Cash balance (withdrawable)</option></select></div>
        <div><label>Each new pot starts at (£)</label><input id="jpSeed" type="number" min="0" step="0.01" value="${pnd(S.seed)}"></div>
        <div><label>Won't drop before (£)</label><input id="jpMin" type="number" min="0" step="0.01" value="${pnd(S.min)}"></div>
        <div><label>Must drop by (£)</label><input id="jpCap" type="number" min="5" step="0.01" value="${pnd(S.cap)}"></div>
      </div>
      <div class="hint">Only money actually paid counts (not credit spent). Every confirmed ticket in a paid competition is an entry – including free postal entries, which keeps the free entry route open. Changes to the starting pot, minimum and cap apply from the next round; the % and payout apply straight away.</div>
      <button class="btn" id="jpSave" style="margin-top:10px">Save jackpot settings</button></div>
  </div>
  <div class="card" style="margin-top:14px"><h3>Drops</h3>${d.history.length ? `<div style="overflow-x:auto"><table class="t"><thead><tr><th>Round</th><th>Dropped</th><th>Amount</th><th>Winner</th><th>Ticket</th><th>Entries</th><th>Paid</th></tr></thead><tbody>
    ${d.history.map(x => `<tr><td>#${x.round}</td><td>${new Date(x.at).toLocaleString('en-GB')}</td><td><b>${gbp(x.amount)}</b></td><td>${esc(x.name)}${x.town ? ' · ' + esc(x.town) : ''}<div class="muted" style="font-size:11px">${esc(x.orderRef)}</div></td><td>#${x.ticket} – ${esc(x.comp)}</td><td>${x.entries.toLocaleString()}</td>
      <td>${x.manual ? (x.manualPaid ? '✅ Paid by hand' : `<span class="st pending">Postal entrant – pay by hand</span> <button class="btn sm ghost" data-jpp="${x.round}">Mark paid</button>`) : `✅ ${x.pay === 'cash' ? 'Cash' : 'Credit'}`}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">No drops yet.</p>'}</div>`;
  const P = id => Math.round((Number($(id).value) || 0) * 100);
  $('#jpSave').onclick = async () => { try { await api('/api/admin/settings', { jackpotOn: $('#jpOn').checked, jackpotPct: Number($('#jpPct').value), jackpotPay: $('#jpPay').value, jackpotSeed: P('#jpSeed'), jackpotMin: P('#jpMin'), jackpotCap: P('#jpCap') }); toast('Jackpot settings saved'); vJackpot(); } catch (e) { toast(e.message); } };
  if ($('#jpTopBtn')) $('#jpTopBtn').onclick = async () => { try { await api('/api/admin/jackpot/topup', { amount: Number($('#jpTop').value) }); toast('Pot topped up'); vJackpot(); } catch (e) { toast(e.message); } };
  $$('[data-jpp]').forEach(b => b.onclick = async () => { try { await api('/api/admin/jackpot/paid', { round: +b.dataset.jpp }); vJackpot(); } catch (e) { toast(e.message); } });
}

// ---------- LAUNCH / MAINTENANCE: close the site behind a holding page with a countdown, register + app download ----------
async function vHold() {
  const [s, d] = await Promise.all([api('/api/admin/settings'), api('/api/admin/hold')]), D = d.defaults;
  const local = iso => { if (!iso) return ''; const t = new Date(iso); return new Date(t - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };
  $('#main').innerHTML = `<div class="ph"><h1 class="d">🚧 Launch / maintenance page</h1>${s.holdOn ? '<span class="st pending">Site closed</span>' : '<span class="st confirmed">Site open</span>'}</div>
  <p class="muted" style="margin-top:-6px">Close the site behind a holding page – for your launch countdown, maintenance, or the switch from bank transfer to cards. Customers can only register (or log in), download the app and ask to be notified. Nothing can be bought. You and your staff can still use admin as normal.</p>
  <div class="card" style="max-width:760px">
    <label class="switch" style="font-size:16px;font-weight:800"><input type="checkbox" id="hOn" ${s.holdOn ? 'checked' : ''}> Show the holding page (close the site)</label>
    <div class="formgrid" style="margin-top:14px">
      <div class="full"><label>Type</label><select id="hMode">${[['launch', '🚀 Launch countdown'], ['maintenance', '🛠️ Under maintenance'], ['upgrade', '✨ Bringing new things (e.g. switching to card payments)']].map(([v, l]) => `<option value="${v}" ${(s.holdMode || 'launch') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="full"><label>Headline</label><input id="hTitle" maxlength="80" value="${esc(s.holdTitle || '')}" placeholder="${esc(D[s.holdMode || 'launch'][0])}"></div>
      <div class="full"><label>Message</label><textarea id="hText" rows="3" maxlength="600" placeholder="${esc(D[s.holdMode || 'launch'][1])}">${esc(s.holdText || '')}</textarea><div class="hint">Leave either blank to use the wording shown in grey.</div></div>
      <div><label>Countdown to (optional)</label><input id="hAt" type="datetime-local" value="${local(s.holdAt)}"></div>
      <div style="align-self:end"><label class="switch"><input type="checkbox" id="hAuto" ${s.holdAuto !== false ? 'checked' : ''}> Open the site automatically when the countdown ends</label></div>
    </div>
    <div class="hint" style="margin-top:10px">🔔 <b>${d.waiting}</b> ${d.waiting === 1 ? 'person is' : 'people are'} waiting to be told when you open. The moment the holding page comes off (by you or the countdown) they all get an app notification and an email.</div>
    <div class="row" style="margin-top:14px;gap:8px;flex-wrap:wrap"><button class="btn" id="hSave">Save</button><button class="btn ghost" id="hPrev">👀 Preview the holding page</button><button class="btn ghost" id="hReal">View the real site while closed</button></div>
  </div>`;
  $('#hMode').onchange = () => { const m = $('#hMode').value; $('#hTitle').placeholder = D[m][0]; $('#hText').placeholder = D[m][1]; };
  const pass = async () => { await api('/api/admin/hold/preview', {}); };
  $('#hPrev').onclick = async () => { await pass(); window.open('/#hold-preview', '_blank'); };
  $('#hReal').onclick = async () => { await pass(); window.open('/#home', '_blank'); };
  $('#hSave').onclick = async () => {
    const on = $('#hOn').checked;
    if (s.holdOn && !on && !confirm(`Open the site now?${d.waiting ? ` ${d.waiting} people will be notified.` : ''}`)) return;
    try { await api('/api/admin/settings', { holdOn: on, holdMode: $('#hMode').value, holdTitle: $('#hTitle').value.trim(), holdText: $('#hText').value.trim(), holdAt: $('#hAt').value ? new Date($('#hAt').value).toISOString() : '', holdAuto: $('#hAuto').checked });
      toast(on ? 'Holding page is on – the site is closed to customers' : 'Saved – the site is open'); vHold(); } catch (e) { toast(e.message); } };
}
// ---------- SOCIAL IMAGES: branded prize graphics for the site and social media ----------
function vSocial() {
  const P = { c500: ['£500', 'CASH', 'cash'], c1k: ['£1,000', 'CASH', 'cash'], c2k: ['£2,000', 'CASH', 'cash'], duck: ['£25', 'CREDIT', 'duck'] };
  const SZ = { sq: [1080, 1080, 'Square – prize card & Facebook post'], story: [1080, 1920, 'Story – Facebook/Instagram'], wide: [1200, 630, 'Wide – link preview & banner'] };
  $('#main').innerHTML = `<div class="ph"><h1 class="d">🖼️ Social images</h1></div><p class="muted" style="margin-top:-6px">Branded prize graphics in your colours and logo. Download them for prize cards on the site and for Facebook.</p>
  <div class="card" style="max-width:980px"><div class="formgrid">
    <div class="full"><label>Preset</label><div class="row" style="flex-wrap:wrap;gap:6px">${[['c500', '£500 Cash'], ['c1k', '£1,000 Cash'], ['c2k', '£2,000 Cash'], ['duck', '🦆 Duck race credit']].map(([k, l]) => `<button type="button" class="btn ghost sm" data-sp="${k}">${l}</button>`).join('')}</div></div>
    <div><label>Big text</label><input id="sgA" value="£500"></div><div><label>Under it</label><input id="sgB" value="CASH"></div>
    <div><label>Top line</label><input id="sgT" value="WIN"></div><div><label>Bottom line</label><input id="sgC" placeholder="e.g. Tickets 49p · Ends Sunday 9pm"></div>
    <div><label>Picture</label><select id="sgK"><option value="cash">💷 Cash notes</option><option value="duck">🦆 Duck race</option><option value="none">Logo only</option></select></div>
    <div><label class="switch"><input type="checkbox" id="sgDw" checked> “Drawn when sold out” sash</label></div><div><label>Size</label><select id="sgS">${Object.entries(SZ).map(([k, v]) => `<option value="${k}">${v[2]} (${v[0]}×${v[1]})</option>`).join('')}</select></div></div>
    <canvas id="sgCv" style="width:100%;max-width:520px;display:block;margin:14px auto;border-radius:14px"></canvas>
    <div class="row" style="justify-content:center;gap:8px"><button class="btn" id="sgDl">⬇ Download image</button><button class="btn ghost" id="sgAll">⬇ All 3 sizes</button></div></div>`;
  const logo = new Image(); logo.src = 'logo.jpg'; logo.onload = () => draw();
  const fit = (c, t, max, size, font) => { let f = size; do { c.font = `${font} ${f}px "Russo One", Inter, sans-serif`; f -= 4; } while (c.measureText(t).width > max && f > 20); };
  function note(c, x, y, w, rot) { const h = w * 0.52; c.save(); c.translate(x, y); c.rotate(rot); const g = c.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2); g.addColorStop(0, '#5b2a86'); g.addColorStop(0.5, '#8a4fc0'); g.addColorStop(1, '#4a1f70');
    c.fillStyle = g; c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 24; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 10); c.fill(); c.shadowBlur = 0; c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 3; c.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24);
    c.fillStyle = 'rgba(255,255,255,.9)'; c.font = `900 ${w * 0.16}px Inter`; c.textAlign = 'left'; c.fillText('£50', -w / 2 + 24, -h / 2 + w * 0.2); c.beginPath(); c.arc(w * 0.22, 0, h * 0.3, 0, 7); c.fillStyle = 'rgba(255,255,255,.18)'; c.fill(); c.restore(); }
  function render(cv, key) {
    const [W, H] = SZ[key], c = cv.getContext('2d'); cv.width = W; cv.height = H; const u = Math.min(W, H) / 1080;
    const bg = c.createRadialGradient(W / 2, H * 0.4, 50, W / 2, H / 2, Math.max(W, H) * 0.8); bg.addColorStop(0, '#16205a'); bg.addColorStop(1, '#050816'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
    [[0, H, '#1f5bff'], [W, H, '#ff1f3d'], [W / 2, 0, '#1f5bff']].forEach(([x, y, col]) => { const g = c.createRadialGradient(x, y, 0, x, y, Math.max(W, H) * 0.6); g.addColorStop(0, col + '66'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.fillRect(0, 0, W, H); });
    c.save(); c.translate(W / 2, H * 0.47); c.globalAlpha = 0.09; for (let k = 0; k < 24; k++) { c.rotate(Math.PI / 12); c.fillStyle = '#ffd84d'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-40 * u, -Math.max(W, H)); c.lineTo(40 * u, -Math.max(W, H)); c.fill(); } c.restore();
    const g2 = c.createLinearGradient(0, 0, W, 0); g2.addColorStop(0, '#1f5bff'); g2.addColorStop(1, '#ff1f3d'); c.strokeStyle = g2; c.lineWidth = 14 * u; c.beginPath(); c.roundRect(14 * u, 14 * u, W - 28 * u, H - 28 * u, 40 * u); c.stroke();
    // fixed layout per size so nothing ever overlaps: [y, font size] for each line
    const LY = { sq: { lg: [540, 140, 210], top: [318, 54], big: [458, 215], sub: [628, 104], pic: [790, 0.78], pill: [948, 40], dom: [540, 1036, 30] },
      story: { lg: [540, 250, 300], top: [500, 70], big: [680, 260], sub: [880, 130], pic: [1200, 1], pill: [1600, 48], dom: [540, 1840, 36] },
      wide: { lg: [205, 315, 300], top: [120, 44], big: [262, 170], sub: [400, 86], pic: null, pill: [520, 34], dom: [205, 510, 24] } }[key];
    const wide = key === 'wide', cx = wide ? 790 : W / 2, [lx, ly, L] = LY.lg;
    if (logo.complete && logo.naturalWidth) { c.save(); c.shadowColor = '#1f5bff'; c.shadowBlur = 40; c.beginPath(); c.arc(lx, ly, L / 2, 0, 7); c.clip(); c.drawImage(logo, lx - L / 2, ly - L / 2, L, L); c.restore(); }
    c.textAlign = 'center'; c.textBaseline = 'middle'; const maxW = wide ? 700 : W * 0.86, kind = $('#sgK').value;
    const top = $('#sgT').value.trim(); if (top) { fit(c, top.toUpperCase(), maxW, LY.top[1], '400'); c.fillStyle = '#fff'; c.fillText(top.toUpperCase(), cx, LY.top[0]); }
    const A = $('#sgA').value.trim() || '£500', y = LY.big[0]; fit(c, A, maxW, LY.big[1], '400');
    const gold = c.createLinearGradient(0, y - LY.big[1] / 2, 0, y + LY.big[1] / 2); gold.addColorStop(0, '#fff8d6'); gold.addColorStop(0.45, '#ffd84d'); gold.addColorStop(0.55, '#c8961e'); gold.addColorStop(1, '#fff0b8');
    c.lineWidth = LY.big[1] / 22; c.strokeStyle = '#3a2600'; c.strokeText(A, cx, y + 6); c.fillStyle = gold; c.shadowColor = 'rgba(255,216,77,.6)'; c.shadowBlur = 40; c.fillText(A, cx, y); c.shadowBlur = 0;
    const B = $('#sgB').value.trim(); if (B) { fit(c, B.toUpperCase(), maxW, LY.sub[1], '400'); c.fillStyle = '#fff'; c.shadowColor = '#ff1f3d'; c.shadowBlur = 30; c.fillText(B.toUpperCase(), cx, LY.sub[0]); c.shadowBlur = 0; }
    if (LY.pic && kind !== 'none') { const [py, k] = LY.pic;
      if (kind === 'cash') { note(c, W / 2 - 165 * k, py + 10 * k, 330 * k, -0.25); note(c, W / 2 + 165 * k, py + 10 * k, 330 * k, 0.22); note(c, W / 2, py - 10 * k, 350 * k, -0.02); }
      else { c.fillStyle = 'rgba(80,170,255,.3)'; c.beginPath(); c.ellipse(W / 2, py + 85 * k, 300 * k, 34 * k, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = `${200 * k}px serif`; c.fillText('🦆', W / 2, py); } }
    const C = $('#sgC').value.trim(); if (C) { const [fy, fs] = LY.pill; c.font = `800 ${fs}px Inter`; const w = Math.min(maxW + 40, c.measureText(C).width + 70); c.fillStyle = 'rgba(0,0,0,.6)'; c.beginPath(); c.roundRect(cx - w / 2, fy - fs, w, fs * 2, fs); c.fill(); c.strokeStyle = '#ffd84d'; c.lineWidth = 3; c.stroke(); c.fillStyle = '#ffd84d'; c.fillText(C, cx, fy); }
    if ($('#sgDw').checked) { const sw = key === 'wide' ? 300 : 400, th = key === 'wide' ? 46 : 62; c.save(); c.translate(W, 0); c.rotate(Math.PI / 4); c.translate(0, sw * 0.62);
      const sg = c.createLinearGradient(-sw, 0, sw, 0); sg.addColorStop(0, '#b3001e'); sg.addColorStop(0.5, '#ff1f3d'); sg.addColorStop(1, '#b3001e'); c.fillStyle = sg; c.shadowColor = 'rgba(0,0,0,.5)'; c.shadowBlur = 18; c.fillRect(-sw, -th / 2, sw * 2, th); c.shadowBlur = 0;
      c.strokeStyle = '#ffd84d'; c.lineWidth = 3; c.strokeRect(-sw, -th / 2 + 5, sw * 2, th - 10); c.fillStyle = '#fff'; c.font = `900 ${th * 0.4}px Inter`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('DRAWN WHEN SOLD OUT', 0, 1); c.restore(); }
    const [dx, dy, ds] = LY.dom; c.fillStyle = 'rgba(255,255,255,.8)'; c.font = `700 ${ds}px Inter`; c.fillText(location.hostname.replace(/^www\./, ''), dx, dy);
  }
  const draw = () => render($('#sgCv'), $('#sgS').value);
  const save = key => { const cv = document.createElement('canvas'); render(cv, key); const a = document.createElement('a'); a.download = `${($('#sgA').value + '-' + $('#sgB').value).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${key}.png`; a.href = cv.toDataURL('image/png'); a.click(); };
  $$('[data-sp]').forEach(b => b.onclick = () => { const [A, B, K] = P[b.dataset.sp]; $('#sgA').value = A; $('#sgB').value = B; $('#sgK').value = K; $('#sgT').value = K === 'duck' ? 'WIN IN THE DUCK RACE' : 'WIN'; draw(); });
  $$('#sgA,#sgB,#sgT,#sgC').forEach(i => i.addEventListener('input', draw)); $$('#sgK,#sgS,#sgDw').forEach(i => i.addEventListener('change', draw));
  $('#sgDl').onclick = () => save($('#sgS').value); $('#sgAll').onclick = () => Object.keys(SZ).forEach((k, i) => setTimeout(() => save(k), i * 400));
  document.fonts && document.fonts.ready.then(draw); draw();
}
})();

