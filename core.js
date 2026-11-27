/* Sheppey Elite Raffles – core engine.
 * All business rules live here and run unchanged on the Node server and in the online demo.
 * createApp(helpers) -> { handle(db, req) } ; handle returns { status, body, setUser, setAdmin, dirty }
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SERCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const DAY = 864e5, HOUR = 36e5;
  const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  const DEFAULT_SETTINGS = {
    siteName: 'Sheppey Elite Raffles',
    tagline: 'Play • Win • Be Elite',
    siteUrl: '',
    emailFrom: '',
    contactEmail: '',
    bankName: '', accountName: '', sortCode: '', accountNumber: '',
    reservationHours: 12, jackpotOn: false, jackpotPct: 0.75, jackpotSeed: 0, jackpotMin: 1000, jackpotCap: 25000, jackpotPay: 'credit', eliteWeekly: false, eliteWeeklyPrize: '£50 Cash', eliteWeeklyMin: 0, eliteWeeklyMethod: 'lms',
    refReward: 0, refRewardMin: 500, refRewardFrom: null,
    levelsOn: true, levelsFrom: null, levels: [{ name: 'Bronze', min: 10000, pct: 1 }, { name: 'Silver', min: 20000, pct: 2 }, { name: 'Gold', min: 30000, pct: 3 }],
    cardPayments: false,
    postalAddress: '', postalOn: true, holdOn: false, holdMode: 'launch', holdTitle: '', holdText: '', holdAt: '', holdAuto: true,
    facebookUrl: '',
    dcmsCode: true,
    gameSeason: 'standard', gameThemes: null, // instant-win game styles (Game Centre); null = built-in defaults
    bankDiscount: 1.25, // % off whatever is paid by bank transfer (0 = off)
    strikesOn: true, strikeLimit: 5, strikeBanDays: 7, strikeExpiryDays: 90, // unpaid-order strikes
    quickAddTarget: 750, // quick add starts at about this much per prize (pence)
    birthdayOn: false, birthdayCredit: 100, remindersOn: true, uniquePence: false,
    facebookGroupName: 'Sheppey Raffle Group',
    categories: ['Cash', 'Watches', 'Tech', 'Sweets & Treats', 'Free'],
    termsFull: "## About these terms\nThese terms apply to every competition run by Sheppey Elite Raffles (\"we\", \"us\") on this website. By entering, you agree to them. Please read them carefully.\n\n## Who can enter\nYou must be 18 or over and live in the UK. Some competitions are open only to residents of Kent; this is checked against the town on your account. Our staff and their households may not enter. We may ask for proof of age, identity and address before awarding a prize.\n\n## How to enter\nYou can enter online by buying tickets, or for free using our postal route (below). Each ticket gets a number. Paid tickets are reserved when you check out and show as Pending until we have received your bank transfer. Once we have matched your payment to your reference, your tickets are Confirmed. Reservations not paid in time are released.\n\n## Free postal entry\nNo purchase is necessary. For a free entry, send an unenclosed postcard with your full name, address, town, phone number, email address and the competition name to the postal address shown on our website. One entry per postcard. Postal entries must arrive before the competition sells out or closes, and are treated in exactly the same way as online entries.\n\n## Limits\nEach competition shows the maximum number of entries per person. Entries over the limit, and entries made using more than one account, are void. One account per person; accounts are linked to a single email address and mobile number.\n\n## The draw\nEach competition is drawn once every ticket has been confirmed, or on its end date if it has one. Only confirmed tickets are included. Draws are made live using our random wheel (free competitions) or a number from Google's random number generator (paid competitions). Where a competition has several prizes, they are drawn in the order shown, with the top prize drawn last. If a draw is made in error (for example, a number is entered incorrectly), we may void that result and draw again; this is recorded.\n\n## Winners and prizes\nWinners are contacted by email and phone, and shown on our website with their first name, surname initial or full name and town. Prizes are as described. Where a cash alternative is shown, the winner may choose it instead. If we cannot contact a winner within 14 days, we may redraw the prize. Prizes are not transferable.\n\n## Public entry lists\nTo keep our draws transparent, every competition shows a public list of ticket numbers with each entrant's name and town. By entering, you agree to this.\n\n## Charity donations\nWhere a competition shows a charity donation, we will make that donation once the competition has sold out (or closed), and publish it on our Charity page.\n\n## Changes and cancellation\nWe may change or cancel a competition if something outside our control prevents it running fairly. If a paid competition is cancelled, we will refund confirmed entries.\n\n## Contact\nQuestions about these terms: please use the contact email shown on our website.",
    privacyPolicy: "## Who we are\nSheppey Elite Raffles (\"we\") runs this website. We are responsible for the personal information you give us.\n\n## What we collect\nWhen you register: your name, email address, mobile number, address, town and postcode, and your password (stored securely in scrambled form \u2013 we cannot see it). When you enter: the competitions, ticket numbers and orders you place. When you use the chat: your messages. We also keep basic technical records such as login times to keep accounts secure.\n\n## Why we use it\n- To run your account and your entries, and match your bank transfer to your order.\n- To contact you about your orders, and if you win.\n- To show the public entry lists (name and town only) and announce winners.\n- To check that entrants are 18+, in the UK, and (where relevant) in Kent, and to stop duplicate accounts.\n- To understand which areas our players come from (we use town, not your full address).\n- To send you news about competitions, only if you ticked the box to receive it.\n\n## Legal basis\nWe use your information to carry out our agreement with you (running the competitions you enter), for our legitimate interests (keeping draws fair and secure), to meet legal obligations, and with your consent for marketing emails.\n\n## What is public\nYour name and town appear next to your ticket numbers on entry lists, and if you win. Chat messages show your first name, surname initial and town. Your email, phone number and address are never shown publicly.\n\n## Who we share it with\nWe do not sell your information. We use trusted providers to host the website and send emails. We may share information if required by law.\n\n## How long we keep it\nWe keep account and entry records for as long as your account is open, and for up to 6 years afterwards for legal and accounting purposes.\n\n## Your rights\nYou can ask to see, correct or delete your information, or object to how we use it. You can turn off marketing emails at any time. To make a request, contact us using the email shown on our website. You can also complain to the Information Commissioner's Office (ico.org.uk).\n\n## Cookies\nWe only use the cookies needed to keep you logged in and remember your basket. We do not use advertising or tracking cookies.",
    terms: 'Entrants must be 18+ and UK residents. Every competition is drawn once all tickets are sold (or at its end date if one is shown). A free postal entry route is available for every competition. Entry lists show entrants’ names and towns.'
  };

  const DRAW_METHODS = ['number', 'wheel', 'reel', 'plinko', 'scratch', 'lms'];
  function emptyDb() {
    return { settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)), comps: [], users: [], orders: [], sessions: [],
      admins: [], adminSessions: [], audit: [], emails: [], seq: 0, chat: [], mutes: [], live: { on: false }, withdrawals: [], pushSubs: [], installs: [], private: {}, boards: [], points: [], refRewards: [], levelPayouts: [], levelMonths: {}, promos: [], charitySugs: [], charities: [], messages: [] };
  }

  // ---------- small utils ----------
  const str = (v, max = 200) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  const text = (v, max = 5000) => String(v ?? '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '').trim().slice(0, max);
  const int = v => { const n = Number(v); return Number.isFinite(n) ? Math.floor(n) : NaN; };
  const emailOk = e => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]{2,}$/.test(e) && e.length <= 120;
  const phoneOk = p => /^[+\d][\d\s()-]{8,18}$/.test(p);
  const postcodeOk = p => /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(p);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gbp = p => '£' + (p / 100).toFixed(2);
  const fullName = u => `${u.first} ${u.last}`.trim();
  const iso = t => new Date(t).toISOString();

  function createApp(h) {
    const ipHits = new Map(); // login throttling per IP (memory)

    const now = () => h.now();
    const hex = n => Array.from(h.rand(n), b => b.toString(16).padStart(2, '0')).join('');
    const newId = () => hex(8);
    function newRef(db) {
      let r;
      do { r = 'SE' + Array.from(h.rand(6), b => REF_CHARS[b % REF_CHARS.length]).join(''); }
      while (db.orders.some(o => o.ref === r));
      return r;
    }
    const ok = (body, extra) => Object.assign({ status: 200, body }, extra || {});
    const err = (status, error, extra) => ({ status, body: Object.assign({ error }, extra || {}) });

    function throttle(key, limit, windowMs) {
      const t = now(); const e = ipHits.get(key) || { n: 0, t };
      if (t - e.t > windowMs) { e.n = 0; e.t = t; }
      e.n++; ipHits.set(key, e);
      if (ipHits.size > 5000) { for (const [k, v] of ipHits) if (t - v.t > 3600e3) ipHits.delete(k); if (ipHits.size > 5000) { let n = 0; for (const k of ipHits.keys()) { if (n++ > 1000) break; ipHits.delete(k); } } } // never wipe every counter at once
      return e.n > limit;
    }
    const tooMany = (key, limit, windowMs) => { const e = ipHits.get(key); return !!e && now() - e.t <= windowMs && e.n >= limit; };

    // ---------- tickets & stats ----------
    function holdings(db, compId) {
      const map = new Map(); // ticket -> {order, item}
      for (const o of db.orders) {
        if (o.status !== 'pending' && o.status !== 'confirmed') continue;
        for (const it of o.items) if (it.compId === compId) for (const t of it.tickets) map.set(t, o);
      }
      return map;
    }
    const unl = c => c.type === 'free' && !c.totalTickets;
    function stats(db, c) {
      let confirmed = 0, pending = 0;
      for (const o of db.orders) {
        if (o.status !== 'pending' && o.status !== 'confirmed') continue;
        for (const it of o.items) if (it.compId === c.id) { if (o.status === 'confirmed') confirmed += it.qty; else pending += it.qty; }
      }
      const taken = confirmed + pending;
      if (unl(c)) return { confirmed, pending, taken, available: null, pct: 0 };
      return { confirmed, pending, taken, available: Math.max(0, c.totalTickets - taken), pct: Math.min(100, Math.round(taken / c.totalTickets * 1000) / 10) };
    }
    function allocate(db, c, qty, picks) {
      const held = holdings(db, c.id), out = (picks || []).slice();
      if (unl(c)) { let n = held.size ? Math.max(...held.keys()) : 0; const res = []; while (res.length < qty) res.push(++n); return res; }
      const taken = new Set(out);
      const free = [];
      for (let t = 1; t <= c.totalTickets; t++) if (!held.has(t) && !taken.has(t)) free.push(t);
      while (out.length < qty && free.length) { const j = h.randInt(free.length); out.push(free[j]); free[j] = free[free.length - 1]; free.pop(); }
      return out.length === qty ? out.sort((a, b) => a - b) : null;
    }
    function refreshComp(db, c) {
      if (c.status === 'live') {
        const s = stats(db, c);
        if (!unl(c) && s.confirmed >= c.totalTickets) c.status = 'soldout';
        else if (c.endsAt && Date.parse(c.endsAt) <= now()) c.status = 'ended';
      }
    }
    const weekStart = t => { const d = new Date(t); const day = (d.getUTCDay() + 6) % 7; d.setUTCHours(0, 0, 0, 0); return d.getTime() - day * DAY; };
    function eliteQualifiers(db, c) {
      const from = Date.parse(c.eliteWeek), to = from + 7 * DAY, min = db.settings.eliteWeeklyMin || 0, spend = new Map();
      for (const o of db.orders) if (o.userId && o.status === 'confirmed' && paidAmt(o) > 0 && o.source !== 'elite') { const at = Date.parse(o.createdAt); if (at >= from && at < to) spend.set(o.userId, (spend.get(o.userId) || 0) + paidAmt(o)); }
      return [...spend].filter(([, v]) => v >= min).map(([id]) => id);
    }
    function syncElite(db, c) {
      if (!c.auto || c.status !== 'live') return false;
      const have = new Set(db.orders.filter(o => o.source === 'elite' && o.items[0].compId === c.id).map(o => o.userId)); let d = false;
      for (const uid of eliteQualifiers(db, c)) if (!have.has(uid)) {
        const tickets = allocate(db, c, 1); if (!tickets) break;
        db.orders.push({ id: newId(), ref: newRef(db), userId: uid, source: 'elite', status: 'confirmed', total: 0, createdAt: iso(now()), confirmedAt: iso(now()), confirmedBy: 'auto', items: [{ compId: c.id, title: c.title, qty: 1, unit: 0, amount: 0, tickets }] });
        d = true;
      }
      return d;
    }
    function ensureElite(db) {
      const s = db.settings; if (!s.eliteWeekly) return false;
      const ws = weekStart(now()), key = iso(ws);
      if (db.comps.some(c => c.auto && c.eliteWeek === key)) return false;
      const d = new Date(ws);
      db.comps.push({ id: newId(), auto: true, eliteWeek: key, title: `Weekly Elite Player – w/c ${d.getUTCDate()} ${d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })}`, category: 'Free', type: 'free', price: 0, totalTickets: 0, unlimited: true, maxPerPerson: 1,
        prizes: [s.eliteWeeklyPrize || '£50 Cash'], description: `Our thank-you to everyone who plays. Make any paid entry this week (Monday to Sunday)${s.eliteWeeklyMin ? ` totalling ${gbp(s.eliteWeeklyMin)} or more` : ''} and you're automatically entered – no need to do anything. Drawn live after Sunday night.`,
        image: 'elite-week.svg', status: 'live', createdAt: iso(now()), endsAt: iso(ws + 7 * DAY - 60000), winners: [], gameMode: 'standard', drawMethod: s.eliteWeeklyMethod || 'lms', eligibility: 'all', quickAdd: [1], featured: false, cashPrize: /£/.test(s.eliteWeeklyPrize || '£') });
      return true;
    }
    function eliteStatus(db, u) {
      const c = db.comps.filter(x => x.auto && x.status === 'live').sort((a, z) => z.eliteWeek.localeCompare(a.eliteWeek))[0]; if (!c) return null;
      return { compId: c.id, title: c.title, prize: c.prizes[0], endsAt: c.endsAt, qualified: eliteQualifiers(db, c).includes(u.id) };
    }
    // ---------- bundles & promo codes ----------
    function bundleBonus(c, qty) { let best = 0; for (const x of c.bundles || []) if (qty >= x.buy) best = Math.max(best, Math.floor(qty / x.buy) * x.free); return best; }
    const promoUses = (db, code, uid) => db.orders.filter(o => o.promo === code && (o.status === 'pending' || o.status === 'confirmed') && (!uid || o.userId === uid)).length;
    // returns { discount, promo } or { error }
    function applyPromo(db, u, raw, lines) {
      const code = String(raw || '').trim().toUpperCase(); if (!code) return { discount: 0 };
      const P = (db.promos || []).find(x => x.code === code);
      const bad = msg => ({ error: msg, discount: 0 });
      if (!P || !P.active) return bad('That promo code isn’t valid.');
      if (P.startsAt && Date.parse(P.startsAt) > now()) return bad('That promo code isn’t live yet.');
      if (P.endsAt && Date.parse(P.endsAt) <= now()) return bad('That promo code has expired.');
      if (P.maxUses && promoUses(db, code) >= P.maxUses) return bad('That promo code has been fully used.');
      if (u && P.perUser && promoUses(db, code, u.id) >= P.perUser) return bad(P.perUser === 1 ? 'You’ve already used that code.' : `You’ve used that code ${P.perUser} times already.`);
      if (u && P.newOnly && db.orders.some(o => o.userId === u.id && o.status === 'confirmed' && o.total > 0)) return bad('That code is for first-time players only.');
      const el = lines.filter(l => !P.compIds?.length || P.compIds.includes(l.c.id));
      const base = el.reduce((a, l) => a + l.gross, 0);
      if (!base) return bad(P.compIds?.length ? 'That code doesn’t apply to anything in your basket.' : 'Add a paid entry to use that code.');
      if (P.minSpend && base < P.minSpend) return bad(`Spend ${gbp(P.minSpend)} or more to use that code.`);
      let disc = P.type === 'percent' ? Math.floor(base * Math.min(100, P.value) / 100) : Math.min(base, P.value);
      if (P.type === 'percent' && P.cap) disc = Math.min(disc, P.cap);
      // spread the discount over the eligible lines
      let left = disc; el.forEach((l, i) => { const share = i === el.length - 1 ? left : Math.floor(disc * l.gross / base); l.disc = (l.disc || 0) + share; left -= share; });
      return { discount: disc, promo: { code, label: P.type === 'percent' ? `${P.value}% off${P.cap ? ` (up to ${gbp(P.cap)})` : ''}` : `${gbp(P.value)} off` } };
    }
    function priceLines(db, u, paid, promoCode) {
      const lines = paid.map(x => ({ ...x, gross: x.c.price * x.qty, disc: 0 }));
      const pr = applyPromo(db, u, promoCode, lines);
      const subtotal = lines.reduce((a, l) => a + l.gross, 0);
      return { lines, subtotal, discount: pr.discount || 0, total: subtotal - (pr.discount || 0), promo: pr.promo || null, promoError: pr.error || null };
    }
    // money we actually received and approved (credit spent is not new money)
    const paidAmt = o => Math.max(0, (o.total || 0) - (o.credit || 0));
    // bank transfer saving: no card fees on bank transfers, so a % comes off whatever is left to pay by transfer
    const bankOff = (s, due) => { const pct = Math.max(0, Math.min(20, Number(s.bankDiscount) || 0)); return pct && due > 0 ? Math.round(due * pct / 100) : 0; };
    function applyBankDisc(s, o) {
      const off = bankOff(s, o.due); if (!off) return; o.bankDisc = off; o.due -= off; o.total -= off;
      const base = o.items.reduce((a, i) => a + i.amount, 0) || 1; let left = off;
      o.items.forEach((it, k) => { const d = k === o.items.length - 1 ? left : Math.min(left, Math.round(off * it.amount / base)); it.amount -= d; it.bankOff = d; left -= d; });
    }
    // ---- unpaid-order strikes: an order left unpaid until it expires = 1 strike; reach the limit = a break from entering ----
    const liveStrikes = (s, u) => (u.strikes || []).filter(x => now() - Date.parse(x.at) < (Number(s.strikeExpiryDays) || 90) * DAY);
    const pauseLbl = s => { const d = Number(s.strikeBanDays) || 7; return d % 7 === 0 ? `${d / 7}-week` : `${d}-day`; };
    const strikeBan = u => u.strikeBanUntil && Date.parse(u.strikeBanUntil) > now() ? u.strikeBanUntil : null;
    function addStrike(db, u, o) {
      const s = db.settings; if (!s.strikesOn || !u) return;
      u.strikes = liveStrikes(s, u).filter(x => x.ref !== o.ref); u.strikes.push({ at: iso(now()), ref: o.ref });
      const lim = Math.max(1, Number(s.strikeLimit) || 5), n = u.strikes.length;
      if (n >= lim) {
        u.strikeBanUntil = iso(now() + (Number(s.strikeBanDays) || 7) * DAY); u.strikeBans = (u.strikeBans || 0) + 1; u.strikes = [];
        const until = new Date(u.strikeBanUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'Europe/London' });
        db.audit.unshift({ at: iso(now()), adminId: null, who: 'system', ip: '', action: 'strike ban', detail: `${u.first} ${u.last} – ${lim} unpaid orders, can't enter until ${until}` });
        pushTo(db, x => x.userId === u.id, { title: '⛔ Entries paused', body: `${lim} orders weren't paid in time, so you can't enter until ${until}.`, url: '/#account-tickets' });
        queueEmail(db, u.email, 'Your entries are paused', 'strike', wrapEmail(db, 'Your entries are paused', `<p>Hi ${esc(u.first)}, order <b>${esc(o.ref)}</b> wasn't paid before its reservation ran out. That's ${lim} unpaid orders, so you can't place new orders until <b>${until}</b>.</p><p>Unpaid orders hold tickets other players could have bought – thanks for understanding.</p>`));
      } else {
        pushTo(db, x => x.userId === u.id, { title: `⚠️ Strike ${n} of ${lim}`, body: `Order ${o.ref} wasn't paid in time. ${lim} strikes = a ${pauseLbl(s)} break from entering.`, url: '/#account-tickets' });
        queueEmail(db, u.email, `Order ${o.ref} expired – strike ${n} of ${lim}`, 'strike', wrapEmail(db, `Strike ${n} of ${lim}`, `<p>Hi ${esc(u.first)}, order <b>${esc(o.ref)}</b> wasn't paid before its reservation ran out, so the tickets went back on sale and you've got a strike.</p><p>Strikes clear after ${Number(s.strikeExpiryDays) || 90} days. If you get ${lim}, you won't be able to enter for ${(Number(s.strikeBanDays) || 7)} days. If you did pay, just reply with your payment details and we'll sort it.</p>`));
      }
    }
    const clearStrike = (db, o) => { const u = o.userId && db.users.find(x => x.id === o.userId); if (u && u.strikes) u.strikes = u.strikes.filter(x => x.ref !== o.ref); };
    function undoBankDisc(o) { if (!o.bankDisc) return; o.due += o.bankDisc; o.total += o.bankDisc; o.items.forEach(it => { it.amount += it.bankOff || 0; delete it.bankOff; }); delete o.bankDisc; }
    function housekeeping(db) {
      let dirty = false; const t = now();
      if (ensureElite(db)) dirty = true;
      if (!db.refRewards) db.refRewards = [];
      if (queueRefRewards(db)) dirty = true;
      if (payLevels(db)) dirty = true;
      if (settleInstant(db)) dirty = true;
      if (jackpotSweep(db)) dirty = true;
      if (db.settings.holdOn && db.settings.holdAuto && db.settings.holdAt && Date.parse(db.settings.holdAt) <= now() && openSite(db, 'countdown')) dirty = true;
      if (settleWins(db)) dirty = true; // pay live-game / reveal wins once their animation has finished
      if (nudges(db)) dirty = true;
      for (const c of db.comps) if (c.status === 'scheduled' && c.goLiveAt && Date.parse(c.goLiveAt) <= now()) { c.status = 'live'; c.createdAt = iso(now()); dirty = true; refreshComp(db, c);
        for (const u of db.users) if ((u.favs || []).includes(c.id)) pushTo(db, x => x.userId === u.id, { title: '❤️ It’s live!', body: `${c.title} has just launched – get your tickets.`, url: '/#comp-' + c.id });
        if (c.launchPush) pushTo(db, () => true, { title: '🚀 New competition live!', body: `${c.title} – ${c.type === 'free' ? 'FREE to enter' : gbp(c.price) + ' a ticket'}. Get in early!`, url: '/#comp-' + c.id }); }
      for (const c of db.comps) if (c.auto && syncElite(db, c)) dirty = true;
      for (const o of db.orders) if (o.status === 'pending' && Date.parse(o.expiresAt) < t) { if (o.cardOnly) { failOrder(db, o, 'card-timeout'); dirty = true; continue; } o.status = 'expired'; releaseCredit(db, o, 'expired'); dirty = true; if (o.userId && o.source === 'online' && !o.cardOnly && (o.due ?? o.total) > 0) addStrike(db, db.users.find(x => x.id === o.userId), o); }
      for (const c of db.comps) { const before = c.status; refreshComp(db, c); if (c.status !== before) dirty = true; }
      if (db.pushQueue && db.pushQueue.length) {
        const due = db.pushQueue.filter(q => Date.parse(q.at) <= t);
        if (due.length) { db.pushQueue = db.pushQueue.filter(q => Date.parse(q.at) > t); dirty = true;
          for (const q of due) { let who = () => true; if (q.audience === 'entrants' && q.compId) { const ids = new Set(db.orders.filter(o => o.userId && o.status === 'confirmed' && o.items.some(i => i.compId === q.compId)).map(o => o.userId)); who = sub => ids.has(sub.userId); } pushTo(db, who, q.payload); } }
      }
      if (db.nextLive && Date.parse(db.nextLive.at) < t - 3 * 3600e3) { db.nextLive = null; dirty = true; }
      const sl = db.sessions.length; db.sessions = db.sessions.filter(s => s.exp > t); if (db.sessions.length !== sl) dirty = true;
      const al = db.adminSessions.length; db.adminSessions = db.adminSessions.filter(s => s.exp > t && s.idle > t); if (db.adminSessions.length !== al) dirty = true;
      return dirty;
    }
    const userHeld = (db, userId, compId) => db.orders.filter(o => o.userId === userId && (o.status === 'pending' || o.status === 'confirmed'))
      .reduce((a, o) => a + o.items.filter(i => i.compId === compId).reduce((x, i) => x + i.qty, 0), 0);

    // ---------- public shapes ----------
    function publicComp(db, c) {
      const s = stats(db, c);
      return { id: c.id, title: c.title, description: c.description, image: c.image, category: c.category, type: c.type,
        price: c.price, cashAlt: c.cashAlt, totalTickets: c.totalTickets, maxPerPerson: c.maxPerPerson, quickAdd: c.quickAdd,
        endsAt: c.endsAt, goLiveAt: c.status === 'scheduled' ? c.goLiveAt : null, featured: !!c.featured, status: c.status, prizes: c.prizes, createdAt: c.createdAt,
        bundles: (c.type === 'paid' && !c.auto && c.bundles) || [], iwGame: iwGameOf(c), iwTheme: c.iwTheme || 'auto', iwFrozen: hasIW(c) && !cardLive(db.settings), instant: (c.instant || []).map((P, i) => ({ prize: P.prize, icon: P.icon || '', credit: !!P.credit, count: P.count, cash: P.cash || 0, value: P.value || 0, won: (c.iwTickets || []).filter(x => x.i === i && wonShown(x)).length })), seedHash: c.seedHash || null, proofs: (c.proofs || []).filter(x => !x.void).length,
        charityName: c.charityName || '', charityAmount: c.charityAmount || 0, charityPaid: !!c.charityPaid, ticketMode: (c.instant || []).length ? 'random' : c.ticketMode || 'random', unlimited: unl(c), eligibility: c.eligibility || 'all',
        appOnly: !!c.appOnly, gameMode: c.gameMode || 'standard', drawMethod: c.drawMethod || (c.type === 'free' ? 'wheel' : 'number'), hiloPlayers: c.hiloPlayers || 1, hiloMax: c.hiloMax || 0,
        auto: !!c.auto, eliteWeek: c.eliteWeek || null, cashPrize: !!c.cashPrize, prizePay: payOf(c), prizeTicketsComp: c.prizeTicketsComp || '', prizeTicketsQty: c.prizeTicketsQty || 0, prizeTickets: payOf(c) === 'tickets' ? (() => { const tc = db.comps.find(x => x.id === c.prizeTicketsComp); return tc ? { compId: tc.id, title: tc.title, qty: c.prizeTicketsQty } : null; })() : null, prizeWorth: c.prizeWorth || 0,
        bankerPlayers: c.bankerPlayers || 1, bankerMax: c.bankerMax || 0, winnerPhoto: c.winnerPhoto || '',
        sold: s.taken, confirmed: s.confirmed, pending: s.pending, available: s.available, pct: s.pct,
        races: c.races || 1, raceLaps: c.raceLaps || 1,
        winners: shownWinners(c).map(w => ({ prize: w.prize, ticket: w.ticket, name: w.name, town: w.town, at: w.at, amount: w.amount || 0, method: w.method, dealt: !!w.dealt })), drawnAt: c.drawnAt || null, game: !!c.game,
        ...(shownWinners(c).length < (c.winners || []).length ? { status: 'drawing' } : {}) };
    }
    const shownWinners = c => (c.winners || []).filter(w => !w.revealAt || Date.parse(w.revealAt) <= now());
    function settleWins(db) {
      let d = false;
      for (const c of db.comps) for (const w of c.winners || []) if (w.notifyPending && Date.parse(w.revealAt) <= now()) { w.notifyPending = false; finishWin(db, c, w); d = true; }
      return d;
    }
    function entrantOf(db, o) {
      if (o.userId) { const u = db.users.find(x => x.id === o.userId); if (u) return { name: fullName(u), town: u.address.town }; }
      return { name: o.postal ? `${o.postal.first} ${o.postal.last}` : 'Entrant', town: o.postal?.town || '' };
    }
    function ensureRef(db, u) {
      if (u.refCode) return u.refCode;
      const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code;
      do { code = (u.first || 'X').replace(/[^a-z]/gi, '').slice(0, 4).toUpperCase() + Array.from({ length: 4 }, () => abc[h.randInt(abc.length)]).join(''); } while (db.users.some(x => x.refCode === code));
      u.refCode = code; return code;
    }
    function invitedBy(db, u) {
      return db.users.filter(x => x.referredBy === u.id).map(x => { const fo = db.orders.filter(o => o.userId === x.id && o.status === 'confirmed').sort((a, z) => a.createdAt.localeCompare(z.createdAt))[0];
        return { id: x.id, name: `${x.first} ${(x.last || '')[0] || ''}.`, town: x.address?.town || '', joinedAt: x.createdAt, enteredAt: fo ? fo.confirmedAt || fo.createdAt : null, paid: db.orders.some(o => o.userId === x.id && o.status === 'confirmed' && o.total > 0) }; });
    }
    function activeBoard(db) {
      const bs = (db.boards || []).slice().sort((a, z) => z.createdAt.localeCompare(a.createdAt)); const b0 = bs[0]; if (!b0) return null;
      if (b0.status === 'live' && Date.parse(b0.endAt) <= now()) b0.status = 'ended';
      return b0;
    }
    function boardPublic(bd) { return { id: bd.id, title: bd.title, prize: bd.prize, startAt: bd.startAt, endAt: bd.endAt, eligibility: bd.eligibility, rules: boardRules(bd), boostFrom: bd.boostFrom || null, boostTo: bd.boostTo || null, status: bd.status, winner: bd.winner || null }; }
    const userBrief = (db, id) => { const u = db.users.find(x => x.id === id); return u ? { id: u.id, name: `${u.first} ${u.last}`, town: u.address.town } : null; };
    // Points are earned on the site – nothing to claim. Every rule is set per leaderboard by the admin.
    const BOARD_RULES = { spend: 10, comp: 4, signup: 25, friendSpend: 25, friendMin: 500, daily: 2, streak: 20, early: 5, notify: 15, idv: 10, win: 0, boostX: 1 };
    const dayKey = t => new Date(t).toISOString().slice(0, 10);
    function boardRules(bd) { return { ...BOARD_RULES, ...(bd.rules || {}) }; }
    function boardRows(db, bd) {
      const from = Date.parse(bd.startAt), to = Date.parse(bd.endAt), R = boardRules(bd), inW = t => t >= from && t < to;
      const bF = Date.parse(bd.boostFrom || 0) || 0, bT = Date.parse(bd.boostTo || 0) || 0, boost = t => (R.boostX > 1 && bF && t >= bF && t < bT) ? R.boostX : 1;
      const acc = new Map(), first = new Map();
      const add = (uid, k, pts, at) => { if (!pts) return; let a = acc.get(uid); if (!a) acc.set(uid, a = { total: 0 }); a[k] = (a[k] || 0) + pts; a.total += pts; if (!first.has(uid) || at < first.get(uid)) first.set(uid, at); };
      const conf = db.orders.filter(o => o.userId && o.status === 'confirmed');
      const compsSeen = new Map();
      for (const o of conf) { const t = Date.parse(o.confirmedAt || o.createdAt); if (!inW(t) || o.source === 'elite') continue;
        if (paidAmt(o) > 0) add(o.userId, 'spend', Math.floor(paidAmt(o) * R.spend / 100) * boost(t), t);
        for (const it of o.items) { const key = o.userId + ':' + it.compId; if (compsSeen.has(key)) continue; compsSeen.set(key, 1);
          add(o.userId, 'comps', R.comp * boost(t), t);
          const c = db.comps.find(x => x.id === it.compId); if (R.early && c && t - Date.parse(c.createdAt) < 864e5) add(o.userId, 'early', R.early, t); } }
      for (const u of db.users) {
        if (u.referredBy) { const j = Date.parse(u.createdAt); if (inW(j)) add(u.referredBy, 'invites', R.signup, j);
          if (R.friendSpend) { let sum = 0, hit = 0; for (const o of conf.filter(o => o.userId === u.id).sort((a, z) => Date.parse(a.confirmedAt || a.createdAt) - Date.parse(z.confirmedAt || z.createdAt))) { sum += paidAmt(o); if (sum >= R.friendMin) { hit = Date.parse(o.confirmedAt || o.createdAt); break; } }
            if (hit && inW(hit)) add(u.referredBy, 'friendSpend', R.friendSpend, hit); } }
        const days = (u.days || []).filter(d => inW(Date.parse(d + 'T12:00:00Z')) || d === dayKey(from)).sort();
        if (days.length && R.daily) add(u.id, 'daily', days.length * R.daily, Date.parse(days[0]));
        if (R.streak && days.length >= 7) { let run = 1, st = 0; for (let i = 1; i < days.length; i++) { if (Date.parse(days[i]) - Date.parse(days[i - 1]) === 864e5) { run++; if (run % 7 === 0) st++; } else run = 1; } if (st) add(u.id, 'streak', st * R.streak, Date.parse(days[days.length - 1])); }
        if (R.notify && db.pushSubs.some(x => x.userId === u.id)) add(u.id, 'notify', R.notify, from);
        if (R.idv && u.idStatus === 'verified') add(u.id, 'idv', R.idv, Date.parse(u.idCheckedAt || 0) || from);
      }
      if (R.win) for (const c of db.comps) for (const w of shownWinners(c)) if (w.userId && inW(Date.parse(w.at))) add(w.userId, 'wins', R.win, Date.parse(w.at));
      for (const x of db.points) if (x.boardId === bd.id && x.status === 'approved') add(x.userId, 'bonus', x.pts, Date.parse(x.at));
      return [...acc].map(([uid, a]) => { const u = db.users.find(x => x.id === uid); if (!u) return null;
        if (bd.eligibility === 'kent' && !(h.kent && h.kent.has(u.address.town))) return null;
        if (u.safe?.excludedUntil && Date.parse(u.safe.excludedUntil) > now()) return null; // taking a break = off the board
        return { userId: uid, name: `${u.first} ${(u.last || '')[0] || ''}.`, town: u.address.town, points: a.total, parts: a, first: first.get(uid) }; })
        .filter(r => r && r.points > 0).sort((a, z) => z.points - a.points || a.first - z.first);
    }
    // ---------- Monthly levels: spend in a calendar month → Bronze/Silver/Gold → % cashback paid early next month ----------
    const monthKey = t => new Date(t).toISOString().slice(0, 7);
    const monthStart = key => Date.UTC(+key.slice(0, 4), +key.slice(5, 7) - 1, 1);
    const nextMonth = key => monthKey(Date.UTC(+key.slice(0, 4), +key.slice(5, 7), 1));
    const monthName = key => new Date(monthStart(key)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const tiers = s => (s.levels || []).filter(x => x.min > 0 && x.pct > 0).sort((a, z) => a.min - z.min);
    function monthSpend(db, uid, key) { const a = monthStart(key), z = monthStart(nextMonth(key));
      return db.orders.filter(o => o.userId === uid && o.status === 'confirmed' && o.total > 0 && o.source !== 'elite' && Date.parse(o.createdAt) >= a && Date.parse(o.createdAt) < z).reduce((x, o) => x + paidAmt(o), 0); }
    function levelOf(s, spent) { let L = null; for (const t of tiers(s)) if (spent >= t.min) L = t; return L; }
    function levelStatus(db, u) {
      const s = db.settings; if (!s.levelsOn || !tiers(s).length) return null;
      const key = monthKey(now()), spent = monthSpend(db, u.id, key), L = levelOf(s, spent), T = tiers(s), nx = T.find(t => t.min > spent) || null;
      const pend = db.orders.filter(o => o.userId === u.id && o.status === 'pending' && o.total > 0 && monthKey(Date.parse(o.createdAt)) === key).reduce((x, o) => x + (o.due ?? o.total), 0);
      const prev = monthKey(monthStart(key) - 1), lp = (db.levelPayouts || []).find(x => x.userId === u.id && x.month === prev);
      return { month: monthName(key), resetAt: new Date(monthStart(nextMonth(key))).toISOString(), spent, pending: pend, level: L ? L.name : null, pct: L ? L.pct : 0, cashback: L ? Math.floor(spent * L.pct / 100) : 0,
        next: nx ? { name: nx.name, pct: nx.pct, need: nx.min - spent, min: nx.min } : null, tiers: T,
        last: lp ? { month: monthName(prev), level: lp.level, amount: lp.amount } : null, history: (db.levelPayouts || []).filter(x => x.userId === u.id).slice(-6).reverse().map(x => ({ month: monthName(x.month), level: x.level, amount: x.amount, spent: x.spent })) };
    }
    function payLevels(db) {
      const s = db.settings; if (!s.levelsOn || !tiers(s).length) return false;
      if (!db.levelMonths) db.levelMonths = {}; if (!db.levelPayouts) db.levelPayouts = [];
      if (!s.levelsFrom) { s.levelsFrom = iso(now()); return true; }
      const prev = monthKey(monthStart(monthKey(now())) - 1);
      if (db.levelMonths[prev]) return false;
      if (Date.parse(s.levelsFrom) >= monthStart(nextMonth(prev))) { db.levelMonths[prev] = 'before-start'; return true; }
      // wait for late bank transfers on orders made at the end of the month to be confirmed
      if (now() < monthStart(nextMonth(prev)) + (s.reservationHours || 12) * HOUR + HOUR) return false;
      db.levelMonths[prev] = iso(now());
      for (const u of db.users) { const spent = monthSpend(db, u.id, prev), L = levelOf(s, spent); if (!L) continue;
        const amount = Math.floor(spent * L.pct / 100); if (amount <= 0) continue;
        addCredit(u, amount, 'cashback', `${L.name} cashback – ${monthName(prev)} (${L.pct}% of ${gbp(spent)})`);
        db.levelPayouts.push({ id: newId(), month: prev, userId: u.id, level: L.name, pct: L.pct, spent, amount, at: iso(now()) });
        pushTo(db, sub => sub.userId === u.id, { title: `${L.name} cashback paid 💷`, body: `${gbp(amount)} credit added for ${monthName(prev)} – use it on your next entries. New month, new level – go again!`, url: '/#account-level' }); }
      return true;
    }
    // Referral cash reward: friend joins with your link and spends £X → you get £Y (admin approves first).
    function queueRefRewards(db) {
      const s = db.settings; if (!(s.refReward > 0)) return false; let d = false;
      if (!s.refRewardFrom) { s.refRewardFrom = iso(now()); return true; } // only friends who join from now on
      const from = Date.parse(s.refRewardFrom || 0) || 0;
      for (const u of db.users) { if (!u.referredBy || u.refRewardQueued || Date.parse(u.createdAt) < from) continue;
        const spent = db.orders.filter(o => o.userId === u.id && o.status === 'confirmed').reduce((a, o) => a + paidAmt(o), 0);
        if (spent < (s.refRewardMin || 0) || spent <= 0) continue;
        const r = db.users.find(x => x.id === u.referredBy); if (!r) continue;
        const flags = []; const pc = x => String(x.address?.postcode || '').replace(/\s/g, '').toUpperCase();
        if (pc(r) && pc(r) === pc(u)) flags.push('Same postcode');
        if ((r.address?.line1 || '').toLowerCase().trim() === (u.address?.line1 || '').toLowerCase().trim()) flags.push('Same address');
        if ((r.last || '').toLowerCase() === (u.last || '').toLowerCase()) flags.push('Same surname');
        u.refRewardQueued = true; db.refRewards.push({ id: newId(), referrerId: r.id, friendId: u.id, amount: s.refReward, spent, status: 'pending', at: iso(now()), flags }); d = true;
        pushTo(db, sub => sub.userId === r.id, { title: 'Your friend entered! 🎉', body: `${u.first} has spent ${gbp(s.refRewardMin)}+ – your ${gbp(s.refReward)} reward is being checked`, url: '/#account-refer' }); }
      return d;
    }
    function publicUser(u) {
      return { id: u.id, first: u.first, last: u.last, email: u.email, phone: u.phone, address: u.address, createdAt: u.createdAt, verified: u.verified !== false };
    }
    const parsePence = t => { const m = /£\s?([\d,]+(?:\.\d{1,2})?)/.exec(String(t || '')); return m ? Math.round(parseFloat(m[1].replace(/,/g, '')) * 100) : 0; };
    const ensureWallet = u => { if (typeof u.balance !== 'number') u.balance = 0; if (typeof u.credit !== 'number') u.credit = 0; if (!Array.isArray(u.ledger)) u.ledger = []; return u; };
    // Credit balance: spend-only (cashback, rewards, goodwill). Used automatically at checkout, never withdrawable.
    function addCredit(u, amount, type, note) { ensureWallet(u); u.credit = Math.max(0, u.credit + amount); u.ledger.unshift({ at: iso(now()), amount, type, note: str(note, 160), balance: u.credit, wallet: 'credit' }); if (u.ledger.length > 300) u.ledger.length = 300; }
    function releaseCredit(db, o, why) { const u = db.users.find(x => x.id === o.userId); if (!u) return;
      if (o.credit > 0 && !o.creditBack) { addCredit(u, o.credit, 'refund', `Order ${o.ref} ${why} – credit returned`); o.creditBack = true; }
      if (o.cash > 0 && !o.cashBack) { credit(u, o.cash, 'refund', `Order ${o.ref} ${why} – cash returned`); o.cashBack = true; } }
    const credit_ = (...a) => credit(...a);
    function credit(u, amount, type, note) { ensureWallet(u); u.balance += amount; u.ledger.unshift({ at: iso(now()), amount, type, note: str(note, 160), balance: u.balance }); if (u.ledger.length > 300) u.ledger.length = 300; }
    function safeOf(u) { if (!u.safe) u.safe = { excludedUntil: null, limits: { day: 0, week: 0, month: 0 }, pending: null }; return u.safe; }
    function applyPendingLimits(u) { const sf = safeOf(u); if (sf.pending && Date.parse(sf.pending.at) <= now()) { sf.limits = sf.pending.limits; sf.pending = null; } return sf; }
    function spentSince(db, u, ms) { const t = now() - ms; return db.orders.filter(o => o.userId === u.id && (o.status === 'pending' || o.status === 'confirmed') && Date.parse(o.createdAt) >= t).reduce((a, o) => a + o.total, 0); }
    const winValue = (c, w) => w.amount || parsePence(w.prize) || (c.prizes.length <= 1 ? (c.prizeWorth || parsePence(c.cashAlt)) : 0);
    function pushTo(db, filter, payload) {
      if (!h.sendPush) return 0; let n = 0;
      for (const sub of db.pushSubs) if (filter(sub)) { n++; h.sendPush(sub, payload).then(okk => { if (okk === 'gone') db.pushSubs = db.pushSubs.filter(x => x !== sub); }).catch(() => {}); }
      return n;
    }
    const normPhone = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('44')) d = '0' + d.slice(2); return d; };
    async function makeToken(u, kind, ms) { const t = hex(24); u[kind + 'Hash'] = await h.sha(t); u[kind + 'Exp'] = now() + ms; return t; }
    async function findByToken(db, kind, token) {
      if (!token || typeof token !== 'string' || token.length > 100) return null;
      const hs = await h.sha(token);
      return db.users.find(u => u[kind + 'Hash'] === hs && u[kind + 'Exp'] > now()) || null;
    }
    const linkFor = (req, db, hash) => { const base = (db.settings.siteUrl || req.origin || '').replace(/\/+$/, ''); return base + (/\.html$/.test(base) ? '#' : '/#') + hash; };
    const btn = (href, label) => `<p style="margin:22px 0"><a href="${esc(href)}" style="display:inline-block;background:linear-gradient(90deg,#1f5bff,#e0102a);color:#fff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:10px">${esc(label)}</a></p><p style="color:#8f9ac0;font-size:12px;word-break:break-all">Or copy this link: ${esc(href)}</p>`;
    function emailVerify(db, u, link) {
      queueEmail(db, u.email, 'Confirm your email address', 'verify', wrapEmail(db, `Confirm your email, ${u.first}`, `<p>Please confirm this is your email address so you can start entering competitions.</p>${btn(link, 'Confirm my email')}<p style="color:#8f9ac0;font-size:13px">This link works for 3 days. If you didn't create an account, you can ignore this email.</p>`), `Confirm your email: ${link}`);
    }
    function emailReset(db, u, link) {
      queueEmail(db, u.email, 'Reset your password', 'reset', wrapEmail(db, 'Reset your password', `<p>Hi ${esc(u.first)}, we received a request to reset your password.</p>${btn(link, 'Choose a new password')}<p style="color:#8f9ac0;font-size:13px">This link works for 1 hour and can only be used once. If you didn't ask for this, you can ignore this email – your password won't change.</p>`), `Reset your password: ${link}`);
    }
    function orderView(o) {
      return { id: o.id, ref: o.ref, source: o.source, status: o.status, total: o.total, credit: o.credit || 0, cash: o.cash || 0, due: o.due ?? o.total, card: o.card ? { reported: o.card.reported, verified: !!o.card.verified, at: o.card.at, problem: o.card.problem || '' } : null, createdAt: o.createdAt, confirmedAt: o.confirmedAt || null, expiresAt: o.expiresAt || null,
        discount: o.discount || 0, cardOnly: !!o.cardOnly, bankDisc: o.bankDisc || 0, pennyOff: o.pennyOff || 0, promo: o.promo || null, items: o.items.map(i => ({ compId: i.compId, title: i.title, qty: i.qty, bonus: i.bonus || 0, unit: i.unit, amount: i.amount, tickets: i.tickets })) };
    }
    const bankOf = s => ({ bankName: s.bankName, accountName: s.accountName, sortCode: s.sortCode, accountNumber: s.accountNumber });

    // ---------- emails ----------
    function wrapEmail(db, title, bodyHtml) {
      const s = db.settings;
      return `<!doctype html><html><body style="margin:0;background:#060b1d;font-family:Arial,Helvetica,sans-serif;color:#e9edf8">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#060b1d;padding:24px 0"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0c1430;border:1px solid #23305e;border-radius:14px;overflow:hidden">
<tr><td style="background:linear-gradient(90deg,#1747ff,#e0102a);padding:18px 24px;font-size:20px;font-weight:bold;color:#fff;letter-spacing:.5px">${esc(s.siteName)}</td></tr>
<tr><td style="padding:24px"><h2 style="margin:0 0 14px;color:#fff;font-size:20px">${esc(title)}</h2>${bodyHtml}
<p style="color:#8f9ac0;font-size:12px;margin-top:28px;border-top:1px solid #23305e;padding-top:14px">Prizes are won when competitions sell out. ${s.facebookUrl ? `Join our <a style="color:#7fa2ff" href="${esc(s.facebookUrl)}">${esc(s.facebookGroupName)}</a> and invite your friends. ` : ''}${s.contactEmail ? 'Questions? ' + esc(s.contactEmail) : ''}</p>
</td></tr></table></td></tr></table></body></html>`;
    }
    function itemsTable(items, colour) {
      return `<table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:12px 0;font-size:14px">${items.map(i => `<tr style="border-bottom:1px solid #23305e"><td style="color:#fff"><b>${esc(i.title)}</b><br><span style="color:${colour}">Tickets: ${i.tickets.map(t => '#' + t).join(', ')}</span></td><td align="right" style="color:#fff;white-space:nowrap">${i.qty} × ${i.unit ? gbp(i.unit) : 'FREE'}</td></tr>`).join('')}</table>`;
    }
    function bankHtml(db, ref, total) {
      const s = db.settings;
      const row = (k, v) => `<tr><td style="color:#8f9ac0;padding:6px 0">${k}</td><td align="right" style="color:#fff;font-weight:bold;padding:6px 0">${esc(v || '—')}</td></tr>`;
      return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#060b1d;border:2px solid #ff9f1a;border-radius:10px;padding:10px 14px;margin:14px 0">${row('Amount', gbp(total))}${row('Account name', s.accountName)}${row('Sort code', s.sortCode)}${row('Account number', s.accountNumber)}${s.bankName ? row('Bank', s.bankName) : ''}${row('Reference', ref)}</table>`;
    }
    function queueEmail(db, to, subject, kind, html, textBody) {
      if (!to) return;
      db.emails.unshift({ id: newId(), to, subject, kind, html, text: textBody, at: iso(now()), status: 'queued' });
      if (db.emails.length > 1000) db.emails.length = 1000;
    }
    function emailWelcome(db, u) {
      const s = db.settings;
      queueEmail(db, u.email, `Welcome to ${s.siteName}!`, 'welcome', wrapEmail(db, `Welcome, ${u.first}!`, `
        <p>Your account is ready. Here's how it works:</p>
        <ol style="line-height:1.7;padding-left:18px">
          <li>Pick a competition and add tickets to your basket.</li>
          <li>Check out – you'll get our bank details and your <b>own unique payment reference</b>.</li>
          <li>Pay by bank transfer using that exact reference. Your entries show as <b style="color:#ff9f1a">Pending (orange)</b>.</li>
          <li>Once we've matched your payment, your entries turn <b style="color:#22d36b">Confirmed (green)</b> and we'll email you.</li>
          <li>Every prize is drawn live once the competition sells out.</li>
        </ol>
        <p>Free competitions are added to your account straight away – no payment needed.</p>`),
        `Welcome ${u.first}! Pick a competition, check out, pay by bank transfer using your unique reference. Entries show pending until we confirm payment. Prizes are drawn once competitions sell out.`);
    }
    function emailPending(db, u, o) {
      queueEmail(db, u.email, `Order ${o.ref} – payment needed`, 'pending', wrapEmail(db, `Order received – ${o.ref}`, `
        <p>Thanks ${esc(u.first)}! Your tickets are reserved and <b style="color:#ff9f1a">pending</b>.</p>
        <p><b>Please pay by bank transfer and make sure you use the correct reference</b>, or we can't match your payment:</p>
        ${bankHtml(db, o.ref, o.due ?? o.total)}${o.bankDisc ? `<p style="color:#22d36b">🏦 You've saved ${gbp(o.bankDisc)} by paying by bank transfer – we don't pay card fees on transfers, so we pass that back to you – and it means more prizes and more donated to local charitable causes. Please send the exact amount shown.</p>` : ''}${o.credit || o.cash ? `<p>${[o.credit ? `£${(o.credit / 100).toFixed(2)} credit` : '', o.cash ? `£${(o.cash / 100).toFixed(2)} cash balance` : ''].filter(Boolean).join(' and ')} was used – the amount above is what's left to pay.</p>` : ''}
        ${itemsTable(o.items, '#ff9f1a')}
        <p style="color:#8f9ac0;font-size:13px">Tickets are held until ${new Date(o.expiresAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}. You'll get another email once your entries are confirmed.</p>`),
        `Order ${o.ref}: pay ${gbp(o.due ?? o.total)} to ${db.settings.accountName} ${db.settings.sortCode} ${db.settings.accountNumber} using reference ${o.ref}.`);
    }
    function emailConfirmed(db, u, o) {
      queueEmail(db, u.email, o.source === 'free' ? 'Your free entries are confirmed' : `Entries confirmed – ${o.ref}`, 'confirmed', wrapEmail(db, o.source === 'free' ? 'Free entries confirmed ✅' : 'Entries confirmed ✅', `
        <p>Good luck ${esc(u.first)}! ${o.source === 'free' ? 'Your free entries have been added.' : `We've received your payment for order <b>${o.ref}</b>.`} Your entries are now <b style="color:#22d36b">confirmed</b>:</p>
        ${itemsTable(o.items, '#22d36b')}
        <p>Draws happen live as soon as each competition sells out.</p>`),
        `Entries confirmed for ${o.ref}: ` + o.items.map(i => `${i.title} #${i.tickets.join(', #')}`).join('; '));
    }
    function emailWinner(db, email, first, c, w) {
      queueEmail(db, email, `You've won ${w.prize}! 🎉`, 'winner', wrapEmail(db, `Congratulations ${first}! 🏆`, `
        <p>Your ticket <b>#${w.ticket}</b> has been drawn in <b>${esc(c.title)}</b>.</p><p style="font-size:22px;color:#fff"><b>${esc(w.prize)}</b></p><p>${w.ticketsGiven ? `We've entered you into <b>${esc(w.ticketsGiven.title)}</b> with <b>${w.ticketsGiven.qty} free ticket${w.ticketsGiven.qty > 1 ? 's' : ''}</b> – you'll find them in My tickets. Good luck!` : w.credited && w.paidTo === 'credit' ? `We've added <b>${gbp(w.amount)}</b> to your credit balance – use it on any competition.` : w.credited ? `We've added <b>${gbp(w.amount)}</b> to your cash balance – you can withdraw it from your account.` : "We'll be in touch to arrange your prize."}</p>`),
        `You won ${w.prize} in ${c.title} with ticket #${w.ticket}!`);
    }

    // ---------- auth ----------
    async function startUserSession(db, u) {
      const token = hex(32);
      db.sessions.push({ hash: await h.sha(token), userId: u.id, exp: now() + 30 * DAY });
      u.lastLogin = iso(now());
      return token;
    }
    async function currentUser(db, token) {
      if (!token || typeof token !== 'string' || token.length > 200) return null;
      const hs = await h.sha(token);
      const s = db.sessions.find(x => x.hash === hs && x.exp > now());
      return s ? db.users.find(u => u.id === s.userId) || null : null;
    }
    async function currentAdmin(db, token) {
      if (!token || typeof token !== 'string' || token.length > 200) return null;
      const hs = await h.sha(token);
      const s = db.adminSessions.find(x => x.hash === hs && x.exp > now() && x.idle > now());
      if (!s) return null;
      s.idle = now() + 2 * HOUR;
      const a = db.admins.find(x => x.id === s.adminId && !x.disabled);
      return a ? { admin: a, session: s } : null;
    }
    function audit(db, admin, action, detail, ip) {
      db.audit.unshift({ at: iso(now()), adminId: admin?.id || null, who: admin?.email || '—', action, detail: str(detail, 300), ip: ip || '' });
      if (db.audit.length > 3000) db.audit.length = 3000;
    }
    function cleanAddress(a = {}) {
      return { line1: str(a.line1, 120), line2: str(a.line2, 120), town: str(a.town, 80), postcode: str(a.postcode, 10).toUpperCase().replace(/\s+/g, ' ') };
    }
    function validTown(t) { return h.towns.has(t); }

    // ---------- comps ----------
    function compFromBody(db, b, existing) {
      const type = b.type === 'free' ? 'free' : 'paid';
      const quick = String(b.quickAdd ?? '1,5,10,25,50').split(/[\s,]+/).map(int).filter(n => n >= 1 && n <= 100000);
      const prizes = String(b.prizes ?? '').split('\n').map(x => str(x, 80)).filter(Boolean).slice(0, 50);
      let endsAt = null;
      if (b.endsAt) { const t = Date.parse(b.endsAt); if (!Number.isFinite(t)) return { error: 'End date is not valid.' }; endsAt = iso(t); }
      let goLiveAt = null; if (b.status === 'scheduled') { const t = Date.parse(b.goLiveAt || ''); if (!Number.isFinite(t) || t <= now()) return { error: 'Choose a launch time in the future.' }; goLiveAt = iso(t); if (endsAt && Date.parse(endsAt) <= t) return { error: 'The end date must be after the launch time.' }; }
      const f = { goLiveAt, launchPush: !!b.launchPush,
        title: str(b.title, 120), description: text(b.description, 5000), image: str(b.image, 3_000_000),
        category: str(b.category, 40) || 'Cash', type, price: type === 'free' ? 0 : int(b.price), cashAlt: str(b.cashAlt, 80),
        totalTickets: int(b.totalTickets), maxPerPerson: Math.max(0, int(b.maxPerPerson) || 0),
        quickAdd: [...new Set(quick)].sort((a, c) => a - c).slice(0, 6), endsAt, featured: !!b.featured, prizes,
        bundles: (Array.isArray(b.bundles) ? b.bundles : []).slice(0, 4).map(x => ({ buy: Math.max(1, Math.min(1000, int(x.buy) || 0)), free: Math.max(0, Math.min(1000, int(x.free) || 0)) })).filter(x => x.buy >= 1 && x.free >= 1).sort((a, z) => a.buy - z.buy),
        charityName: str(b.charityName, 80), charityAmount: Math.max(0, int(b.charityAmount) || 0), ticketMode: b.ticketMode === 'pick' ? 'pick' : 'random', eligibility: b.eligibility === 'kent' ? 'kent' : 'all',
        appOnly: !!b.appOnly, gameMode: ['duck', 'race', 'banker', 'hilo'].includes(b.gameMode) ? b.gameMode : 'standard',
        drawMethod: DRAW_METHODS.includes(b.drawMethod) ? b.drawMethod : (type === 'free' ? 'wheel' : 'number'),
        hiloPlayers: Math.min(10, Math.max(1, int(b.hiloPlayers) || 1)), hiloMax: Math.max(0, int(b.hiloMax) || 0),
        iwGame: IW_GAMES.includes(b.iwGame) ? b.iwGame : 'none', iwTheme: ['auto', 'standard', 'christmas', 'halloween', 'birthday'].includes(b.iwTheme) ? b.iwTheme : 'auto',
        prizePay: ['cash', 'credit', 'none', 'tickets'].includes(b.prizePay) ? b.prizePay : (b.cashPrize ? 'cash' : 'none'), cashPrize: false,
        prizeTicketsComp: str(b.prizeTicketsComp, 20), prizeTicketsQty: Math.min(1000, Math.max(0, int(b.prizeTicketsQty) || 0)), prizeWorth: Math.max(0, int(b.prizeWorth) || 0),
        bankerPlayers: Math.min(10, Math.max(1, int(b.bankerPlayers) || 1)), bankerMax: Math.max(0, int(b.bankerMax) || 0),
        races: Math.min(20, Math.max(1, int(b.races) || 1)), raceLaps: Math.min(5, Math.max(1, int(b.raceLaps) || 1))
      };
      if (!f.title) return { error: 'Give the competition a name.' };
      if (f.charityAmount && !f.charityName) return { error: 'Add the charity name for the donation.' };
      if ((f.gameMode === 'banker' || f.gameMode === 'hilo') && (f.prizePay === 'none' || f.prizePay === 'tickets')) f.prizePay = 'cash'; // game winnings are always paid automatically, in money
      if (f.prizePay === 'tickets') {
        const tc = db.comps.find(x => x.id === f.prizeTicketsComp);
        if (!tc || tc.type !== 'paid' || tc.auto || !['live', 'scheduled'].includes(tc.status) || (existing && tc.id === existing.id)) return { error: 'Choose which live competition the winner gets free tickets in.' };
        if (!(f.prizeTicketsQty >= 1)) return { error: 'Enter how many free tickets the winner gets (1–1,000).' };
      } else { f.prizeTicketsComp = ''; f.prizeTicketsQty = 0; }
      f.cashPrize = f.prizePay === 'cash' || f.prizePay === 'credit';
      if (f.gameMode === 'banker') {
        if (!(f.bankerMax >= 100)) return { error: 'Elite Banker needs a top prize of at least £1.' };
        f.prizes = Array.from({ length: f.bankerPlayers }, (_, i) => `Elite Banker – player ${i + 1}`);
      }
      if (f.gameMode === 'hilo') {
        if (!(f.hiloMax >= 100)) return { error: 'Set the top prize for Higher or Lower (at least £1).' };
        f.prizes = Array.from({ length: f.hiloPlayers }, (_, i) => `Higher or Lower – player ${i + 1}`);
      }
      if (f.gameMode === 'duck' || f.gameMode === 'race') {
        const what = f.gameMode === 'duck' ? 'ducks' : 'cars';
        if (type === 'free' && b.unlimited) return { error: 'Races need a set number of tickets (up to 25 per race).' };
        if (f.prizes.length > 1 && f.prizes.length !== f.races) return { error: `You've set ${f.races} race${f.races > 1 ? 's' : ''} – add one prize per race (one line each), or just one line to use the same prize for every race.` };
        if (f.races > 1 && f.prizes.length <= 1) { const base = f.prizes[0] || f.title; f.prizes = Array.from({ length: f.races }, (_, i) => `Race ${i + 1} – ${base}`); }
        if (f.totalTickets > 25 * f.races) return { error: `Each race has up to 25 ${what}. With ${f.races} race${f.races > 1 ? 's' : ''} the most tickets you can have is ${25 * f.races} – or add more races.` };
        if (f.totalTickets < f.races) return { error: 'Each race needs at least one ticket.' };
      }
      if (f.image && !/^(\/uploads\/[a-f0-9]+\.(jpg|png|webp)|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+|[a-z0-9_-]+\.(jpg|jpeg|png|webp|svg))$/i.test(f.image)) return { error: 'Image is not valid – upload it again.' };
      if (type === 'paid' && !(f.price >= 1)) return { error: 'Entry cost must be at least 1p.' };
      if (type === 'free' && b.unlimited) {
        f.totalTickets = 0; f.ticketMode = 'random';
        if (!f.endsAt) return { error: 'Open-ended free draws need an end date – that\u2019s when they\u2019re drawn.' };
      } else if (!(f.totalTickets >= 1 && f.totalTickets <= 100000)) return { error: 'Total tickets must be between 1 and 100,000.' };
      if (!f.quickAdd.length) f.quickAdd = [1, 5, 10, 25, 50].filter(n => !f.totalTickets || n <= f.totalTickets);
      if (existing) {
        const held = holdings(db, existing.id); const maxHeld = held.size ? Math.max(...held.keys()) : 0;
        if (f.totalTickets && f.totalTickets < maxHeld) return { error: `Total tickets can't go below ${maxHeld} – that ticket number is already taken.` };
        if (existing.winners?.length && f.prizes.length < existing.winners.length) return { error: "You can't remove prizes that have already been drawn." };
      }
      return { f };
    }

    // ---------- analytics ----------
    function dashboard(db) {
      const t = now(), d0 = new Date(t); d0.setHours(0, 0, 0, 0); const today = d0.getTime();
      const conf = db.orders.filter(o => o.status === 'confirmed');
      const sum = l => l.reduce((a, o) => a + o.total, 0);
      const confirmedAt = o => Date.parse(o.confirmedAt || o.createdAt);
      const live = db.orders.filter(o => o.status !== 'cancelled' && o.status !== 'expired' && o.total > 0);
      const series = start => { const arr = new Array(24).fill(0); for (const o of live) { const c = Date.parse(o.createdAt); if (c >= start && c < start + DAY) arr[new Date(c).getHours()] += o.total; } let acc = 0; return arr.map(v => (acc += v)); };
      const nowHour = new Date(t).getHours();
      const todaySeries = series(today).map((v, i) => i <= nowHour ? v : null);
      const lastWeekSeries = series(today - 7 * DAY);
      const sameTimeLastWeek = lastWeekSeries[nowHour];
      const perComp = db.comps.map(c => {
        let rev = 0, tickets = 0;
        for (const o of conf) for (const i of o.items) if (i.compId === c.id) { rev += i.amount; tickets += i.qty; }
        const s = stats(db, c);
        return { id: c.id, title: c.title, image: c.image, status: c.status, type: c.type, revenue: rev, confirmedTickets: tickets, pct: s.pct, taken: s.taken, total: c.totalTickets, unlimited: unl(c) };
      });
      const top = perComp.filter(x => x.type === 'paid').sort((a, b) => b.revenue - a.revenue)[0] || null;
      const towns = new Map();
      for (const u of db.users) { const k = u.address.town || 'Unknown'; const e = towns.get(k) || { town: k, users: 0, revenue: 0, players: new Set() }; e.users++; towns.set(k, e); }
      for (const o of conf) { if (!o.userId) continue; const u = db.users.find(x => x.id === o.userId); if (!u) continue; const e = towns.get(u.address.town); if (e) { e.revenue += o.total; e.players.add(u.id); } }
      const userName = id => { const u = db.users.find(x => x.id === id); return u ? fullName(u) : null; };
      return {
        revenue: { total: sum(conf), today: sum(conf.filter(o => confirmedAt(o) >= today)), week: sum(conf.filter(o => confirmedAt(o) >= t - 7 * DAY)), month: sum(conf.filter(o => confirmedAt(o) >= t - 30 * DAY)) },
        pending: { count: db.orders.filter(o => o.status === 'pending').length, value: sum(db.orders.filter(o => o.status === 'pending')) },
        todo: { withdrawals: db.withdrawals.filter(w => w.status === 'pending').length, withdrawValue: db.withdrawals.filter(w => w.status === 'pending').reduce((a, w) => a + w.amount, 0), ids: db.users.filter(u => u.idStatus === 'pending').length, cardReported: db.orders.filter(o => o.status === 'pending' && o.card?.reported).length },
        app: { installs: db.installs.length, push: db.pushSubs.length }, live: !!(db.live && db.live.on),
        salesToday: todaySeries[nowHour] || 0, salesSameTimeLastWeek: sameTimeLastWeek,
        ordersToday: db.orders.filter(o => Date.parse(o.createdAt) >= today && o.total > 0).length,
        users: { total: db.users.length, today: db.users.filter(u => Date.parse(u.createdAt) >= today).length, week: db.users.filter(u => Date.parse(u.createdAt) >= t - 7 * DAY).length,
          latest: [...db.users].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map(u => ({ id: u.id, name: fullName(u), town: u.address.town, at: u.createdAt })) },
        chart: { today: todaySeries, lastWeek: lastWeekSeries, hour: nowHour },
        topSeller: top,
        comps: perComp.filter(c => ['live', 'soldout', 'ended', 'drawing'].includes(c.status)).sort((a, b) => b.pct - a.pct),
        towns: [...towns.values()].map(e => ({ town: e.town, users: e.users, players: e.players.size, revenue: e.revenue })).sort((a, b) => b.users - a.users).slice(0, 12),
        recentOrders: [...db.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10)
          .map(o => ({ id: o.id, ref: o.ref, name: o.userId ? userName(o.userId) : entrantOf(db, o).name, userId: o.userId, total: o.total, status: o.status, source: o.source, at: o.createdAt }))
      };
    }

    // =================== ROUTER ===================
    // One-at-a-time locks for anything that pauses mid-request (password hashing, the bank, public randomness for draws).
    // Buying tickets never pauses between "is it free?" and "it's yours", so two buyers can't get the same ticket;
    // these locks close the remaining gaps (double-tapped draws, two sign-ups with one email, repeated payment messages).
    const LOCKS = new Map();
    async function locked(key, fn) {
      const prev = LOCKS.get(key) || Promise.resolve(); let release; const mine = new Promise(r => { release = r; }); const tail = prev.then(() => mine); LOCKS.set(key, tail);
      await prev; try { return await fn(); } finally { release(); if (LOCKS.get(key) === tail) LOCKS.delete(key); }
    }
    const lockKey = req => { const { method: M, path: p } = req; if (M === 'GET') return null;
      let m; if ((m = p.match(/^\/api\/admin\/comps\/([a-f0-9]+)\//))) return 'comp:' + m[1];
      if (p.startsWith('/api/admin/')) return 'admin';
      if (p === '/api/auth/register' || p === '/api/auth/reset') return 'accounts';
      if (p.startsWith('/api/pay/')) return 'pay';
      return req.userToken ? 'u:' + String(req.userToken).slice(0, 64) : null; };
    async function handle(db, req) {
      const key = lockKey(req); if (key) return locked(key, () => handle1(db, req));
      return handle1(db, req);
    }
    async function handle1(db, req) {
      let dirty = housekeeping(db); if (settleWins(db)) dirty = true;
      const r = await route(db, req);
      r.dirty = dirty || !!r.dirty;
      return r;
    }

    async function route(db, req) {
      const { method: M, path: p } = req;
      const b = req.body || {};
      const s = db.settings;
      let m;
      // closed (launch countdown / maintenance): customers can only see the holding page, register, log in and ask to be told when we open
      if (s.holdOn && /^\/api\//.test(p) && !/^\/api\/admin\b/.test(p) && !holdAllowed(M, p) && !holdPass(db, req.previewToken))
        return err(503, s.holdMode === 'launch' ? 'We’re not open yet – register now and we’ll tell you the moment we launch.' : 'We’re closed for a short while – we’ll let you know the moment we’re back.', { hold: true });

      // ---------------- public ----------------
      if (p === '/api/site' && M === 'GET') {
        const jpd = await jpCommit(db);
        return ok({ siteName: s.siteName, tagline: s.tagline, contactEmail: s.contactEmail, postalOn: s.postalOn !== false, postalAddress: s.postalOn !== false ? s.postalAddress : '', terms: s.postalOn !== false ? s.terms : String(s.terms || '').replace(/\s*A free postal entry route is available for every competition\.?/i, ''),
          facebookUrl: s.facebookUrl, facebookGroupName: s.facebookGroupName, dcmsCode: !!s.dcmsCode, gameSeason: s.gameSeason || 'standard', gameThemes: themesOf(s), quickAddTarget: Number(s.quickAddTarget) || 750, strikes: s.strikesOn ? { limit: Math.max(1, Number(s.strikeLimit) || 5), pause: pauseLbl(s) } : null, bankDiscount: Math.max(0, Number(s.bankDiscount) || 0), categories: s.categories, reservationHours: s.reservationHours, termsFull: s.postalOn !== false ? s.termsFull : noPostal(s.termsFull), privacyPolicy: s.privacyPolicy, cardPayments: cardLive(s), hold: holdView(db, req), jackpot: jpPublic(db), live: !!(db.live && db.live.on), boardReferral: (() => { const bd = activeBoard(db); return bd && bd.status === 'live' ? boardRules(bd).signup || 0 : 0; })(), refReward: s.refReward || 0, refRewardMin: s.refRewardMin || 0 });
      }
      if (p === '/api/comps' && M === 'GET') {
        return ok(db.comps.filter(c => c.status !== 'hidden').map(c => publicComp(db, c)));
      }
      if ((m = /^\/api\/comps\/([a-f0-9]{16})$/.exec(p)) && M === 'GET') {
        const c = db.comps.find(x => x.id === m[1] && x.status !== 'hidden');
        if (!c) return err(404, 'Competition not found.');
        const entries = [];
        for (const o of db.orders) {
          if (o.status !== 'pending' && o.status !== 'confirmed') continue;
          const who = entrantOf(db, o);
          for (const it of o.items) if (it.compId === c.id) for (const t of it.tickets) entries.push({ t, name: who.name, town: who.town, status: o.status, at: o.confirmedAt && o.status === 'confirmed' ? o.confirmedAt : o.createdAt });
        }
        const u = await currentUser(db, req.userToken);
        // recent activity: real orders only, newest first
        const recent = db.orders.filter(o => (o.status === 'pending' || o.status === 'confirmed') && o.items.some(it => it.compId === c.id)).sort((x, z) => String(z.createdAt).localeCompare(String(x.createdAt))).slice(0, 8)
          .map(o => { const who = entrantOf(db, o), it = o.items.find(i => i.compId === c.id); return { name: who.name, town: who.town, qty: it.qty, at: o.createdAt }; });
        const since = now() - DAY, today = db.orders.filter(o => (o.status === 'pending' || o.status === 'confirmed') && Date.parse(o.createdAt) > since && o.items.some(it => it.compId === c.id)).length;
        return ok({ comp: publicComp(db, c), entries, mine: u ? userHeld(db, u.id, c.id) : 0, recent, today, instant: instantPublic(c) });
      }
      if (p === '/api/donations' && M === 'GET') {
        const list = db.comps.filter(c => c.charityName && c.charityAmount && c.status !== 'hidden').map(c => ({
          compId: c.id, title: c.title, image: c.image, status: c.status, charityName: c.charityName, amount: c.charityAmount,
          paid: !!c.charityPaid, paidAt: c.charityPaidAt || null, photo: c.charityPhoto || '', note: c.charityNote || '', pct: stats(db, c).pct, unlimited: unl(c) }))
          .sort((a, b) => (b.paid - a.paid) || String(b.paidAt || '').localeCompare(String(a.paidAt || '')));
        const paid = list.filter(x => x.paid);
        return ok({ total: paid.reduce((a, x) => a + x.amount, 0), pledged: list.filter(x => !x.paid).reduce((a, x) => a + x.amount, 0),
          charities: new Set(paid.map(x => x.charityName)).size, list,
          supported: (db.charities || []).map(c => ({ name: c.name, town: c.town })),
          suggested: (() => { const g = new Map(); for (const x of db.charitySugs || []) { if (x.status === 'declined') continue; const k = x.charity.toLowerCase().replace(/[^a-z0-9]/g, ''); const e = g.get(k) || { name: x.charity, n: 0 }; e.n++; g.set(k, e); } return [...g.values()].sort((a, z) => z.n - a.n).slice(0, 8); })() });
      }
      if (p === '/api/charity/suggest' && M === 'POST') {
        if (throttle('cs:' + req.ip, 5, 60 * 60e3)) return err(429, 'Thanks! You’ve sent a few suggestions already – try again later.');
        const u = await currentUser(db, req.userToken);
        const name = str(b.name, 60), town = str(b.town, 60), charity = str(b.charity, 80), reason = text(b.reason, 400);
        if (!name || !town || charity.length < 3) return err(400, 'Please add your name, your town and the charity.');
        (db.charitySugs = db.charitySugs || []).push({ id: newId(), name, town, charity, reason, userId: u ? u.id : null, at: iso(now()), status: 'new' });
        return ok({ ok: true }, { dirty: true });
      }
      if (p === '/api/activity' && M === 'GET') {
        const out = [];
        for (const o of db.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))) {
          if (out.length >= 25) break;
          if ((o.status !== 'pending' && o.status !== 'confirmed') || !o.userId) continue;
          const u = db.users.find(x => x.id === o.userId); if (!u) continue;
          const it = o.items[0]; const c = db.comps.find(x => x.id === it.compId); if (!c || c.status === 'hidden') continue;
          out.push({ name: u.first, town: u.address.town, compId: c.id, title: c.title, image: c.image, qty: o.items.reduce((a, i) => a + i.qty, 0), free: o.source === 'free', at: o.createdAt });
        }
        return ok(out);
      }
      if (p === '/api/chat' && M === 'GET') {
        const room = req.query?.get?.('room') === 'live' ? 'live' : 'community';
        const after = req.query?.get?.('after') || '';
        const list = db.chat.filter(m => m.room === room && (!after || m.at > after)).slice(-80)
          .map(m => ({ id: m.id, name: m.name, town: m.town, text: m.text, at: m.at, staff: !!m.staff, mine: false, uid: m.userId }));
        const u = await currentUser(db, req.userToken);
        for (const m of list) { m.mine = !!u && m.uid === u.id; delete m.uid; }
        const lv = db.live || {}; const lc = lv.on && lv.compId ? db.comps.find(c => c.id === lv.compId) : null;
        return ok({ messages: list, live: { on: !!lv.on, title: lc ? lc.title : '', compId: lc ? lc.id : null }, ids: db.chat.filter(m => m.room === room).slice(-80).map(m => m.id) });
      }
      if (p === '/api/chat' && M === 'POST') {
        const u = await currentUser(db, req.userToken); if (!u) return err(401, 'Log in to join the chat.');
        if ((db.mutes || []).includes(u.id)) return err(403, 'You\u2019ve been muted in the chat.');
        if (throttle('chat:' + u.id, 1, 3000)) return err(429, 'Slow down – one message every few seconds.');
        const room = b.room === 'live' ? 'live' : 'community';
        const t = str(b.text, 300);
        if (!t) return err(400, 'Type a message first.');
        const m = { id: newId(), room, userId: u.id, name: `${u.first} ${(u.last || '')[0] || ''}.`.trim(), town: u.address.town, text: t, at: iso(now()) };
        db.chat.push(m); if (db.chat.length > 2000) db.chat.splice(0, db.chat.length - 2000);
        return ok({ id: m.id }, { status: 201, dirty: true });
      }
      if ((m = /^\/api\/comps\/([a-f0-9]{16})\/game$/.exec(p)) && M === 'GET') {
        const c = db.comps.find(x => x.id === m[1] && x.status !== 'hidden'); if (!c) return err(404, 'Not found.');
        const u = await currentUser(db, req.userToken);
        return ok(gamePayload(db, c, u));
      }
      if (p === '/api/board' && M === 'GET') {
        const u = await currentUser(db, req.userToken);
        const bd = activeBoard(db); if (!bd) return ok({ board: null });
        const rows = boardRows(db, bd);
        const me2 = u ? rows.findIndex(r => r.userId === u.id) : -1;
        return ok({ board: boardPublic(bd), top: rows.slice(0, 25).map(r => ({ name: r.name, town: r.town, points: r.points, me: !!u && r.userId === u.id })),
          me: u ? { rank: me2 >= 0 ? me2 + 1 : null, points: me2 >= 0 ? rows[me2].points : 0, parts: me2 >= 0 ? rows[me2].parts : {}, gap: me2 > 0 ? rows[me2 - 1].points - rows[me2].points + 1 : null,
            eligible: bd.eligibility !== 'kent' || !!(h.kent && h.kent.has(u.address.town)), excluded: !!(u.safe?.excludedUntil && Date.parse(u.safe.excludedUntil) > now()),
            today: (u.days || []).includes(dayKey(now())), push: db.pushSubs.some(x => x.userId === u.id), idv: u.idStatus === 'verified', refCode: ensureRef(db, u) } : null,
          players: rows.length, serverNow: now(), refReward: s.refReward || 0, refRewardMin: s.refRewardMin || 0 });
      }
      if (p === '/api/ref/visit' && M === 'POST') {
        const r = db.users.find(x => x.refCode === String(b.code || '').toUpperCase().slice(0, 12));
        if (r && !throttle('rv:' + req.ip + r.id, 1, DAY)) { r.refVisits = (r.refVisits || 0) + 1; return ok({ ok: true, name: r.first }, { dirty: true }); }
        return ok({ ok: !!r, name: r ? r.first : null });
      }
      if (p === '/api/stats' && M === 'GET') {
        let value = 0, prizes = 0; for (const c of db.comps) for (const w of shownWinners(c)) { value += winValue(c, w); prizes++; }
        const donated = db.comps.filter(c => c.charityPaid).reduce((a, c) => a + (c.charityAmount || 0), 0);
        const since = now() - DAY; let today = 0;
        for (const o of db.orders) if ((o.status === 'confirmed' || o.status === 'pending') && Date.parse(o.createdAt) > since) today += o.items.reduce((a, i) => a + i.qty, 0);
        const players = new Set(db.orders.filter(o => o.status === 'confirmed' && o.userId).map(o => o.userId)).size;
        const nl = db.nextLive && Date.parse(db.nextLive.at) > now() - 2 * 3600e3 ? db.nextLive : null;
        return ok({ serverNow: now(), value, prizes, donated, today, players, live: db.comps.filter(c => c.status === 'live').length, nextLive: nl, liveNow: !!(db.live && db.live.on), board: (() => { const bd = activeBoard(db); return bd && bd.status === 'live' ? { title: bd.title, prize: bd.prize, endAt: bd.endAt, kent: bd.eligibility === 'kent' } : null; })() });
      }
      if (p === '/api/stage' && M === 'GET') {
        const st = db.stage && Date.parse(db.stage.at) > now() - 45000 ? db.stage.compId : null;
        return ok({ serverNow: now(), compId: st && db.comps.some(c => c.id === st) ? st : null });
      }
      // ---- contact & complaints ----
      if (p === '/api/contact' && M === 'POST') {
        if (throttle('ct:' + req.ip, 6, 60 * 60e3)) return err(429, 'You’ve sent a few messages already – please try again later.');
        const u = await currentUser(db, req.userToken), kind = b.kind === 'complaint' ? 'complaint' : 'message';
        const name = str(b.name, 80), email = str(b.email, 120).toLowerCase(), msg = text(b.message, 3000);
        if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || msg.length < 5) return err(400, 'Please add your name, a valid email and your message.');
        db.messages = db.messages || [];
        const ref = (kind === 'complaint' ? 'C' : 'M') + String(db.messages.filter(x => x.kind === kind).length + 1001);
        const x = { id: newId(), ref, kind, name, email, phone: str(b.phone, 30), subject: str(b.subject, 120), orderRef: str(b.orderRef, 20), message: msg, userId: u ? u.id : null, at: iso(now()), status: 'open', replies: [] };
        db.messages.push(x);
        queueEmail(db, email, kind === 'complaint' ? `We’ve received your complaint (${ref})` : `Thanks for your message (${ref})`, 'contact', wrapEmail(db, kind === 'complaint' ? 'Complaint received' : 'Message received',
          kind === 'complaint' ? `<p>Hi ${esc(name)}, thanks for letting us know. Your complaint reference is <b>${ref}</b>.</p><p>We’ll reply within 2 working days and aim to resolve it within 14 days. If you’re not happy with our final answer, you can ask for it to be reviewed by someone else at Sheppey Elite Raffles.</p>` : `<p>Hi ${esc(name)}, thanks for getting in touch – we’ll reply as soon as we can. Your reference is <b>${ref}</b>.</p>`), `Your reference is ${ref}.`);
        return ok({ ok: true, ref }, { dirty: true });
      }
      // ---- results: every finished draw ----
      if (p === '/api/results' && M === 'GET') {
        const list = db.comps.filter(c => c.status !== 'hidden' && shownWinners(c).length).map(c => ({ id: c.id, title: c.title, image: c.image, status: c.status, drawnAt: c.drawnAt || shownWinners(c).slice(-1)[0].at, video: c.videoUrl || null, proofs: (c.proofs || []).filter(x => !x.void).length,
          entries: stats(db, c).confirmed, winners: shownWinners(c).map(w => ({ prize: w.prize, ticket: w.ticket, name: w.name, town: w.town, method: w.method || null })) })).sort((a, z) => String(z.drawnAt).localeCompare(String(a.drawnAt)));
        return ok({ list: list.slice(0, 200) });
      }
      if ((m = /^\/api\/comps\/([a-f0-9]{16})\/proof$/.exec(p)) && M === 'GET') {
        const c = db.comps.find(x => x.id === m[1] && x.status !== 'hidden'); if (!c) return err(404, 'Competition not found.');
        let fresh = false; if (!c.seedHash && c.status === 'live') { await ensureSeed(c); fresh = true; }
        const done = c.status === 'drawn';
        return ok({ id: c.id, title: c.title, status: c.status, prizes: c.prizes.length ? c.prizes : [c.title], seedHash: c.seedHash || null, seedAt: c.seedAt || null, seed: done ? (c.seed || null) : null,
          drand: { chain: DRAND.chain, genesis: DRAND.genesis, period: DRAND.period, url: 'https://api.drand.sh/' + DRAND.chain + '/public/' },
          proofs: (c.proofs || []).map(({ voidBy, ...x }) => x), winners: shownWinners(c).map(w => ({ prize: w.prize, ticket: w.ticket, name: w.name, town: w.town, at: w.at, video: w.video || c.videoUrl || null })) }, fresh ? { dirty: true } : undefined);
      }
      if ((m = /^\/api\/comps\/([a-f0-9]{16})\/drawview$/.exec(p)) && M === 'GET') {
        const c = db.comps.find(x => x.id === m[1] && x.status !== 'hidden'); if (!c) return err(404, 'Not found.');
        const pool = entrantPool(db, c), groups = pool.groups.map(g => ({ name: g.name, town: g.town })), tickets = pool.tickets.slice();
        const shown = shownWinners(c), hidden = (c.winners || []).filter(w => !shown.includes(w));
        for (const w of hidden) { groups.push({ name: w.name, town: w.town }); tickets.push([w.ticket, groups.length - 1]); }
        const prizes = c.prizes.length ? c.prizes : [c.title];
        return ok({ serverNow: now(), comp: publicComp(db, c), method: c.gameMode && c.gameMode !== 'standard' ? 'game' : (c.drawMethod || (c.type === 'free' ? 'wheel' : 'number')), prizes, lms: lmsPublic(c),
          winners: shown.map(w => ({ prizeIndex: w.prizeIndex, prize: w.prize, ticket: w.ticket, name: w.name, town: w.town })),
          pending: hidden.filter(w => w.show || w.race).map(w => ({ prizeIndex: w.prizeIndex, prize: w.prize, ticket: w.ticket, name: w.name, town: w.town, method: w.method, show: w.show || { kind: 'race', startAt: w.race.startAt, dur: w.race.dur + 6000 }, race: w.race || null })),
          pool: { tickets, groups, total: unl(c) ? Math.max(1, ...tickets.map(t => t[0])) : c.totalTickets } });
      }
      if (p === '/api/games' && M === 'GET') {
        const u = await currentUser(db, req.userToken);
        const gs = db.comps.filter(c => c.gameMode && c.gameMode !== 'standard' && c.status !== 'hidden');
        const isLive = c => c.gameMode === 'banker' || c.gameMode === 'hilo' ? !!(c.game && c.game.phase !== 'done') : (c.winners || []).some(w => w.race && Date.parse(w.race.endAt) + 20000 > now());
        const results = [];
        for (const c of gs) for (const w of shownWinners(c)) results.push({ how: w.hiloHow || null, compId: c.id, title: c.title, mode: c.gameMode, image: c.winnerPhoto || c.image, prize: w.prize, ticket: w.ticket, name: w.name, town: w.town, at: w.at, amount: w.amount || 0, dealt: !!w.dealt, ownBox: w.ownBox ?? null });
        results.sort((a, z) => z.at.localeCompare(a.at));
        return ok({ serverNow: now(), live: gs.filter(isLive).map(c => ({ ...publicComp(db, c), play: gamePayload(db, c, u) })), results: results.slice(0, 40) });
      }
      if (p === '/api/winners' && M === 'GET') {
        const list = []; let value = 0;
        for (const c of db.comps) for (const w of shownWinners(c)) { const v = winValue(c, w); value += v; list.push({ compId: c.id, title: c.title, image: c.image, photo: c.winnerPhoto || '', quote: c.winnerQuote || '', video: c.videoUrl || '', proof: (c.proofs || []).length > 0, prize: w.prize, ticket: w.ticket, name: w.name, town: w.town, at: w.at, value: v }); }
        list.sort((a, b) => b.at.localeCompare(a.at));
        return ok({ list: list.slice(0, 60), map: list.slice(0, 3000).map(w => ({ compId: w.compId, name: w.name, town: w.town, prize: w.prize })), totals: { prizes: list.length, value, instant: db.comps.reduce((n, c) => n + (c.iwTickets || []).filter(wonShown).length, 0) }, instant: db.comps.flatMap(c => (c.iwTickets || []).filter(wonShown).map(x => ({ compId: c.id, title: c.title, image: c.image, prize: c.instant[x.i].prize, ticket: x.ticket, name: x.won.name, town: x.won.town, at: x.won.at }))).sort((a, z) => z.at.localeCompare(a.at)).slice(0, 20) });
      }

      // ---------------- customer auth ----------------
      if (p === '/api/auth/register' && M === 'POST') {
        if (throttle('reg:' + req.ip, 10, HOUR)) return err(429, 'Too many sign-ups from this connection. Try again later.');
        const first = str(b.first, 40), last = str(b.last, 40), email = str(b.email, 120).toLowerCase(), phone = str(b.phone, 20);
        const pw = String(b.password || ''); const address = cleanAddress(b.address);
        if (!first || !last) return err(400, 'Please enter your first and last name.');
        if (!emailOk(email)) return err(400, 'Please enter a valid email address.');
        if (!phoneOk(phone)) return err(400, 'Please enter a valid phone number.');
        if (pw.length < 8 || pw.length > 200) return err(400, 'Password must be at least 8 characters.');
        if (!address.line1) return err(400, 'Please enter your address.');
        if (!validTown(address.town)) return err(400, 'Please choose your town from the list.');
        if (!postcodeOk(address.postcode)) return err(400, 'Please enter a valid UK postcode.');
        if (!b.over18) return err(400, 'You must confirm you are 18 or over and a UK resident.');
        if (!b.consent) return err(400, 'Please agree to the terms and privacy policy.');
        if (db.users.some(u => u.email === email)) return err(409, 'An account with this email already exists – please log in, or use "Forgot password".');
        if (db.users.some(u => normPhone(u.phone) === normPhone(phone))) return err(409, 'An account with this mobile number already exists – please log in, or use "Forgot password". Only one account per person.');
        const refBy = b.ref ? db.users.find(x => x.refCode === String(b.ref).toUpperCase().slice(0, 12)) : null;
        const pass = await h.hash(pw);
        if (db.users.some(x => x.email === email || normPhone(x.phone) === normPhone(phone))) return err(409, 'An account with these details already exists – please log in.');
        const u = { id: newId(), referredBy: refBy ? refBy.id : null, first, last, email, phone, address, pass, createdAt: iso(now()), marketing: !!b.marketing, consentAt: iso(now()), verified: true, balance: 0, ledger: [] };
        if (db.settings.holdOn) u.holdNotify = true; db.users.push(u); ensureRef(db, u);
        if (refBy) { refBy.refJoins = (refBy.refJoins || 0) + 1; pushTo(db, sub => sub.userId === refBy.id, { title: 'Your friend joined! 🎉', body: `${first} signed up with your link – thanks for spreading the word`, url: '/#account-refer' }); }
        emailWelcome(db, u);
        const token = await startUserSession(db, u);
        return ok({ user: publicUser(u) }, { status: 201, setUser: token, dirty: true });
      }
      if (p === '/api/auth/verify' && M === 'POST') {
        const u = await findByToken(db, 'verify', b.token);
        if (!u) return err(400, 'This confirmation link has expired or already been used. Log in and press "Resend" to get a new one.');
        u.verified = true; delete u.verifyHash; delete u.verifyExp;
        return ok({ ok: true, first: u.first }, { dirty: true });
      }
      if (p === '/api/auth/resend-verify' && M === 'POST') {
        const u = await currentUser(db, req.userToken); if (!u) return err(401, 'Please log in.');
        if (u.verified !== false) return ok({ ok: true, already: true });
        if (throttle('rv:' + u.id, 3, HOUR)) return err(429, 'We\u2019ve sent a few already – check your spam folder, or try again in an hour.');
        const vt = await makeToken(u, 'verify', 3 * DAY); emailVerify(db, u, linkFor(req, db, 'verify-' + vt));
        return ok({ ok: true, devVerify: h.demo ? 'verify-' + vt : undefined }, { dirty: true });
      }
      if (p === '/api/auth/forgot' && M === 'POST') {
        if (throttle('fg:' + req.ip, 8, HOUR)) return err(429, 'Too many requests. Please try again later.');
        const email = str(b.email, 120).toLowerCase();
        const u = db.users.find(x => x.email === email);
        let dev;
        if (u && !throttle('fgu:' + u.id, 4, HOUR)) { const t = await makeToken(u, 'reset', HOUR); emailReset(db, u, linkFor(req, db, 'reset-' + t)); dev = h.demo ? 'reset-' + t : undefined; }
        return ok({ ok: true, devReset: dev }, { dirty: true });
      }
      if (p === '/api/auth/reset' && M === 'POST') {
        const u = await findByToken(db, 'reset', b.token);
        if (!u) return err(400, 'This reset link has expired or already been used. Please ask for a new one.');
        const pw = String(b.password || ''); if (pw.length < 8 || pw.length > 200) return err(400, 'Password must be at least 8 characters.');
        u.pass = await h.hash(pw); delete u.resetHash; delete u.resetExp;
        u.verified = true; // they proved they own the email
        db.sessions = db.sessions.filter(x => x.userId !== u.id);
        const token = await startUserSession(db, u);
        return ok({ user: publicUser(u) }, { setUser: token, dirty: true });
      }
      if (p === '/api/auth/login' && M === 'POST') {
        if (throttle('ul:' + req.ip, 20, 15 * 60e3)) return err(429, 'Too many attempts. Please wait 15 minutes.');
        const email = str(b.email, 120).toLowerCase();
        const u = db.users.find(x => x.email === email);
        if (u && tooMany('ulf:' + u.id, 8, 15 * 60e3)) return err(429, 'Too many wrong passwords for this account. Wait 15 minutes, or use “Forgot password”.');
        const good = u ? await h.verify(String(b.password || ''), u.pass) : (await h.hash('x'), false);
        if (!good) { if (u) throttle('ulf:' + u.id, 8, 15 * 60e3); return err(401, 'Wrong email or password.'); }
        const token = await startUserSession(db, u);
        return ok({ user: publicUser(u) }, { setUser: token, dirty: true });
      }
      if (p === '/api/auth/logout' && M === 'POST') {
        if (req.userToken) { const hs = await h.sha(req.userToken); db.sessions = db.sessions.filter(x => x.hash !== hs); }
        return ok({ ok: true }, { setUser: '', dirty: true });
      }
      if (p === '/api/me' && M === 'GET') {
        const u = await currentUser(db, req.userToken);
        if (!u) return ok({ user: null });
        const orders = db.orders.filter(o => o.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(orderView);
        const wins = [];
        for (const c of db.comps) for (const w of shownWinners(c)) if (w.userId === u.id) wins.push({ compId: c.id, title: c.title, image: c.image, prize: w.prize, ticket: w.ticket, at: w.at });
        for (const c of db.comps) for (const x of c.iwTickets || []) if (wonShown(x) && x.won.userId === u.id) wins.push({ compId: c.id, title: c.title, image: c.image, prize: '⚡ ' + c.instant[x.i].prize, ticket: x.ticket, at: x.won.at, instant: true });
        wins.sort((a, z) => String(z.at).localeCompare(String(a.at)));
        const sf = applyPendingLimits(u); ensureWallet(u);
        const dk = dayKey(now()); let seen = false; if (!Array.isArray(u.days)) u.days = []; if (!u.days.includes(dk)) { u.days.push(dk); if (u.days.length > 120) u.days.splice(0, u.days.length - 120); seen = true; }
        ensureRef(db, u); const inv = invitedBy(db, u);
        return ok({ user: publicUser(u), orders, wins, bank: bankOf(s), reservationHours: s.reservationHours,
          referral: { code: u.refCode, visits: u.refVisits || 0, invited: inv.map(({ id, ...r }) => r), reward: s.refReward || 0, rewardMin: s.refRewardMin || 0, earned: (db.refRewards || []).filter(x => x.referrerId === u.id && x.status === 'paid').reduce((a, x) => a + x.amount, 0), checking: (db.refRewards || []).filter(x => x.referrerId === u.id && x.status === 'pending').length },
          elite: eliteStatus(db, u), level: levelStatus(db, u), jackpotWin: u.jackpotWin && !u.jackpotWin.seen ? u.jackpotWin : null, favs: u.favs || [], badges: badgesOf(db, u), bday: u.bday || '', bdayOn: !!(s.birthdayOn && s.birthdayCredit > 0), bdayCredit: s.birthdayCredit || 0, strikes: s.strikesOn ? { n: liveStrikes(s, u).length, limit: Math.max(1, Number(s.strikeLimit) || 5), banUntil: strikeBan(u), pause: pauseLbl(s), days: Number(s.strikeExpiryDays) || 90, list: liveStrikes(s, u) } : null,
          myComps: (() => { const ids = new Set(); for (const o of db.orders) if (o.userId === u.id) for (const i of o.items) ids.add(i.compId); const out = {};
            for (const id of ids) { const c = db.comps.find(x => x.id === id); if (!c) continue; const ws = shownWinners(c);
              out[id] = { status: c.status, image: c.image || '', gameMode: c.gameMode || 'standard', drawnAt: ws.length ? ws[ws.length - 1].at : null, winners: ws.length, won: ws.filter(w => w.userId === u.id).map(w => ({ prize: w.prize, ticket: w.ticket })), held: userHeld(db, u.id, id) }; }
            return out; })(),
          wallet: { balance: u.balance, credit: u.credit || 0, ledger: u.ledger.slice(0, 50) },
          withdrawals: db.withdrawals.filter(w => w.userId === u.id).map(w => ({ id: w.id, amount: w.amount, status: w.status, at: w.at, paidAt: w.paidAt || null, note: w.note || '' })),
          payout: u.payout ? { name: u.payout.name, last4: u.payout.last4, sortMask: u.payout.sortMask, at: u.payout.at } : null,
          identity: { status: u.idStatus || 'none', note: u.idNote || '', docs: (u.idDocs || []).map(d => ({ kind: d.kind, at: d.at })) },
          safe: { excludedUntil: sf.excludedUntil, limits: sf.limits, pending: sf.pending, spent: { day: spentSince(db, u, DAY), week: spentSince(db, u, 7 * DAY), month: spentSince(db, u, 30 * DAY) } },
          app: { installed: db.installs.some(i => i.userId === u.id), push: db.pushSubs.some(x => x.userId === u.id) } }, seen ? { dirty: true } : undefined);
      }
      if (p === '/api/me' && M === 'POST') {
        const u = await currentUser(db, req.userToken); if (!u) return err(401, 'Please log in.');
        const first = str(b.first, 40), last = str(b.last, 40), phone = str(b.phone, 20), address = cleanAddress(b.address);
        if (!first || !last) return err(400, 'Please enter your first and last name.');
        if (!phoneOk(phone)) return err(400, 'Please enter a valid phone number.');
        if (db.users.some(x => x !== u && normPhone(x.phone) === normPhone(phone))) return err(409, 'That mobile number is already used on another account.');
        if (!address.line1 || !validTown(address.town) || !postcodeOk(address.postcode)) return err(400, 'Please enter your full address and choose your town from the list.');
        Object.assign(u, { first, last, phone, address });
        if ('bday' in b) { const m2 = /^(\d{1,2})-(\d{1,2})$/.exec(String(b.bday || '')); if (b.bday && !m2) return err(400, 'Choose your birthday day and month.'); if (u.bday && u.bdaySetAt && b.bday !== u.bday && now() - Date.parse(u.bdaySetAt) < 365 * DAY) return err(400, 'Your birthday can only be changed once a year.'); if (b.bday && b.bday !== u.bday) { u.bday = `${+m2[1]}-${+m2[2]}`; u.bdaySetAt = iso(now()); } }
        return ok({ user: publicUser(u) }, { dirty: true });
      }
      // ---- favourites, basket sync ----
      if (p === '/api/me/fav' && M === 'POST') {
        const u = await currentUser(db, req.userToken); if (!u) return err(401, 'Please log in to save favourites.');
        const id = str(b.compId, 16); if (!db.comps.some(c => c.id === id)) return err(404, 'Not found.');
        u.favs = (u.favs || []).filter(x => db.comps.some(c => c.id === x && ['live', 'soldout', 'drawing', 'scheduled'].includes(c.status)));
        if (b.on) { if (!u.favs.includes(id)) u.favs.push(id); } else u.favs = u.favs.filter(x => x !== id);
        return ok({ favs: u.favs }, { dirty: true });
      }
      if (p === '/api/me/basket' && M === 'POST') {
        const u = await currentUser(db, req.userToken); if (!u) return ok({ ok: false });
        const items = (Array.isArray(b.items) ? b.items : []).slice(0, 30).map(x => ({ compId: str(x.compId, 16), qty: Math.max(1, Math.min(1000, int(x.qty) || 1)) })).filter(x => db.comps.some(c => c.id === x.compId));
        u.basket = items.length ? { items, at: iso(now()), reminded: false } : null; return ok({ ok: true }, { dirty: true });
      }
      // ---- instant-win games: my plays ----
      if (p === '/api/jackpot' && M === 'GET') {
        const d = await jpCommit(db); const J = db.jackpot || { history: [] };
        return ok({ now: jpPublic(db), history: (J.history || []).slice(0, 30).map(x => ({ round: x.round, amount: x.amount, at: x.at, startedAt: x.startedAt, name: x.name, town: x.town, ticket: x.ticket, compId: x.compId, comp: x.comp, entries: x.entries, pick: x.pick, commit: x.commit, salt: x.salt, dropAt: x.dropAt })) }, d ? { dirty: true } : undefined);
      }
      if (p === '/api/hold/notify' && M === 'POST') {
        const u = await currentUser(db, req.userToken); if (!u) return err(401, 'Log in or register so we know who to tell.'); u.holdNotify = true; return ok({ ok: true });
      }
      if (p === '/api/me/jackpot-seen' && M === 'POST') {
        const u = await currentUser(db, req.userToken); if (!u) return err(401, 'Please log in.'); if (u.jackpotWin) { u.jackpotWin.seen = true; return ok({ ok: true }, { dirty: true }); } return ok({ ok: true });
      }
      if (p === '/api/me/plays' && M === 'GET') {
        const u = await currentUser(db, req.userToken); if (!u) return ok({ comps: [], total: 0 });
        settleInstant(db); const out = [];
        for (const c of db.comps) { if (iwGameOf(c) === 'none' || !(c.iwTickets || []).length) continue;
          const mine = []; for (const o of db.orders) if (o.userId === u.id && o.status === 'confirmed') for (const it of o.items) if (it.compId === c.id) mine.push(...it.tickets);
          if (!mine.length) continue; const played = new Set(c.iwPlayed || []), left = mine.filter(t => !played.has(t)).sort((a, z) => a - z);
          const wins = c.iwTickets.filter(x => x.won && x.won.userId === u.id && played.has(x.ticket)).map(x => ({ ticket: x.ticket, i: x.i, prize: c.instant[x.i].prize }));
          out.push({ compId: c.id, title: c.title, image: c.image, game: iwGameOf(c), theme: themeFor(s, c), prizes: c.instant.map((P, i) => ({ i, prize: P.prize, icon: P.icon || '', cash: P.cash || 0, value: P.value || 0, credit: !!P.credit, count: P.count, left: P.count - c.iwTickets.filter(x => x.i === i && wonShown(x)).length })), tickets: left, played: mine.length - left.length, total: mine.length, wins }); }
        out.sort((a, z) => z.tickets.length - a.tickets.length);
        return ok({ comps: out, total: out.reduce((a, c) => a + c.tickets.length, 0) });
      }
      if (p === '/api/me/play' && M === 'POST') {
        const u = await currentUser(db, req.userToken); if (!u) return err(401, 'Please log in.');
        const c = db.comps.find(x => x.id === str(b.compId, 16)); if (!c || iwGameOf(c) === 'none') return err(404, 'Game not found.'); settleInstant(db);
        const mine = new Set(); for (const o of db.orders) if (o.userId === u.id && o.status === 'confirmed') for (const it of o.items) if (it.compId === c.id) it.tickets.forEach(t => mine.add(t));
        c.iwPlayed = c.iwPlayed || []; const played = new Set(c.iwPlayed);
        const want = (b.all ? [...mine] : (Array.isArray(b.tickets) ? b.tickets : []).map(int)).filter(t => mine.has(t) && !played.has(t)).sort((a, z) => a - z).slice(0, 1000);
        if (!want.length) return err(400, 'No plays left for this competition.');
        const quiet = want.length > 1, got = [];
        const results = want.map(t => { c.iwPlayed.push(t); const x = c.iwTickets.find(z => z.ticket === t && z.won && z.won.userId === u.id);
          if (!x) return { ticket: t, win: null }; if (x.won.pending) { payInstant(db, c, x, false, quiet); got.push(x); } const P = c.instant[x.i]; return { ticket: t, win: { i: x.i, prize: P.prize, icon: P.icon || '', cash: P.cash || 0, credit: !!P.credit } }; });
        if (quiet) iwSummary(db, c, u, got, false);
        return ok({ results, left: [...mine].filter(t => !c.iwPlayed.includes(t)).length }, { dirty: true });
      }
      if (p === '/api/me/password' && M === 'POST') {
        const u = await currentUser(db, req.userToken); if (!u) return err(401, 'Please log in.');
        if (!(await h.verify(String(b.current || ''), u.pass))) return err(400, 'Your current password is wrong.');
        if (String(b.next || '').length < 8) return err(400, 'New password must be at least 8 characters.');
        u.pass = await h.hash(String(b.next));
        return ok({ ok: true }, { dirty: true });
      }

      // ---------------- wallet / safe play / identity ----------------
      if (p === '/api/me/payout' && M === 'POST') {
        const u = await currentUser(db, req.userToken); if (!u) return err(401, 'Please log in.');
        if (!(await h.verify(String(b.password || ''), u.pass))) return err(400, 'Enter your password to change payout details.');
        const name = str(b.name, 80), sort = String(b.sortCode || '').replace(/\D/g, ''), acc = String(b.accountNumber || '').replace(/\D/g, '');
        if (!name) return err(400, 'Enter the name on the account.');
        if (sort.length !== 6) return err(400, 'Sort code must be 6 digits.');
        if (acc.length !== 8) return err(400, 'Account number must be 8 digits.');
        u.payout = { enc: await h.encrypt(JSON.stringify({ name, sortCode: sort, accountNumber: acc })), name, last4: acc.slice(-4), sortMask: '**-**-' + sort.slice(-2), at: iso(now()) };
        return ok({ ok: true }, { dirty: true });
      }
      if (p === '/api/me/withdraw' && M === 'POST') {
        const u = await currentUser(db, req.userToken); if (!u) return err(401, 'Please log in.'); ensureWallet(u);
        const amount = int(b.amount);
        if (!(amount >= 100)) return err(400, 'The minimum withdrawal is £1.');
        if (amount > u.balance) return err(400, `You can withdraw up to ${gbp(u.balance)}.`);
        if (u.idStatus !== 'verified') return err(400, 'We need to verify your identity before paying out – upload your ID in My Identity.', { needId: true });
        if (!u.payout) return err(400, 'Add your bank details in My Payouts first.', { needPayout: true });
        if (db.withdrawals.some(w => w.userId === u.id && w.status === 'pending')) return err(400, 'You already have a withdrawal being processed.');
        const w = { id: newId(), userId: u.id, amount, status: 'pending', at: iso(now()), payoutLast4: u.payout.last4 };
        db.withdrawals.unshift(w); credit(u, -amount, 'withdrawal', 'Withdrawal requested');
        return ok({ ok: true }, { dirty: true });
      }
      if (p === '/api/me/id' && M === 'POST') {
        const u = await currentUser(db, req.userToken); if (!u) return err(401, 'Please log in.');
        if (u.idStatus === 'verified') return err(400, 'Your identity is already verified.');
        const kind = ['passport', 'licence', 'id-card', 'address'].includes(b.kind) ? b.kind : 'passport';
        if (!/^data:image\/(jpeg|png|webp);base64,/.test(String(b.dataUrl || ''))) return err(400, 'Upload a photo (JPG, PNG or WebP).');
        u.idDocs = (u.idDocs || []).slice(-5);
        u.idDocs.push({ key: await h.storePrivate(db, String(b.dataUrl)), kind, at: iso(now()) });
        u.idStatus = 'pending'; u.idNote = '';
        return ok({ ok: true }, { dirty: true });
      }
      if (p === '/api/me/safe' && M === 'POST') {
        const u = await currentUser(db, req.userToken); if (!u) return err(401, 'Please log in.');
        const sf = applyPendingLimits(u);
        if (b.exclude) {
          const days = { '1d': 1, '7d': 7, '30d': 30, '6m': 182, '1y': 365, '5y': 1826 }[b.exclude];
          if (!days) return err(400, 'Choose how long to take a break.');
          if (!(await h.verify(String(b.password || ''), u.pass))) return err(400, 'Enter your password to confirm.');
          const until = now() + days * DAY;
          sf.excludedUntil = iso(Math.max(until, Date.parse(sf.excludedUntil || 0) || 0));
          db.sessions = db.sessions.filter(x => x.userId !== u.id);
          return ok({ ok: true, until: sf.excludedUntil }, { setUser: '', dirty: true });
        }
        const next = {}; for (const k of ['day', 'week', 'month']) next[k] = Math.max(0, int(b.limits?.[k]) || 0);
        const looser = ['day', 'week', 'month'].some(k => (sf.limits[k] && (!next[k] || next[k] > sf.limits[k])));
        if (looser) { sf.pending = { limits: next, at: iso(now() + DAY) }; return ok({ ok: true, pending: sf.pending }, { dirty: true }); }
        sf.limits = next; sf.pending = null;
        return ok({ ok: true }, { dirty: true });
      }

      // ---------------- app & notifications ----------------
      if (p === '/api/app/installed' && M === 'POST') {
        const u = await currentUser(db, req.userToken);
        const plat = str(b.platform, 20);
        if (u && !db.installs.some(i => i.userId === u.id)) db.installs.push({ userId: u.id, at: iso(now()), platform: plat });
        else if (!u) { if (throttle('inst:' + req.ip, 3, DAY)) return ok({ ok: true }); db.installs.push({ userId: null, at: iso(now()), platform: plat }); }
        if (db.installs.length > 20000) db.installs.splice(0, 1000);
        return ok({ ok: true }, { dirty: true });
      }
      if (p === '/api/push/key' && M === 'GET') return ok({ key: h.vapidPublic || null });
      if (p === '/api/push/subscribe' && M === 'POST') {
        const u = await currentUser(db, req.userToken);
        const sub = b.subscription; const ep = str(sub?.endpoint, 600);
        if (!/^https:\/\//.test(ep) || !sub.keys?.p256dh || !sub.keys?.auth) return err(400, 'Bad subscription.');
        db.pushSubs = db.pushSubs.filter(x => x.endpoint !== ep);
        db.pushSubs.push({ endpoint: ep, keys: { p256dh: str(sub.keys.p256dh, 200), auth: str(sub.keys.auth, 100) }, userId: u ? u.id : null, at: iso(now()), consent: true });
        if (db.pushSubs.length > 50000) db.pushSubs.splice(0, 1000);
        return ok({ ok: true }, { dirty: true });
      }
      if (p === '/api/push/unsubscribe' && M === 'POST') { const ep = str(b.endpoint, 600); db.pushSubs = db.pushSubs.filter(x => x.endpoint !== ep); return ok({ ok: true }, { dirty: true }); }

      // ---------------- card payments (DNA Payments) ----------------
      if (p === '/api/pay/card' && M === 'POST') {
        const u = await currentUser(db, req.userToken); if (!u) return err(401, 'Please log in.');
        if (!cardLive(s)) return err(400, 'Card payments aren\u2019t switched on yet – please pay by bank transfer.');
        const o = db.orders.find(x => x.id === str(b.orderId, 20) && x.userId === u.id && x.status === 'pending');
        if (!o) return err(404, 'Order not found or already paid.');
        if (o.bankDisc) { undoBankDisc(o); o.cardNoDisc = true; } // the bank-transfer saving doesn't apply to card payments
        try { return ok(await h.dnaStart({ order: o, user: u, origin: (s.siteUrl || req.origin || '').replace(/\/+$/, ''), cfg: await dnaConfig(db) })); }
        catch (e) { return err(502, 'Card payment couldn\u2019t start – please try again or pay by bank transfer.'); }
      }
      if (p === '/api/pay/failed' && M === 'POST') {
        const u = await currentUser(db, req.userToken); if (!u) return err(401, 'Please log in.');
        const o = db.orders.find(x => x.ref === str(b.ref, 20) && x.userId === u.id); if (!o) return err(404, 'Order not found.');
        if (o.status === 'confirmed') return ok({ status: 'confirmed' });
        const released = o.cardOnly && !(o.card && o.card.verified) ? (failOrder(db, o, 'card-abandoned') || (o.status === 'cancelled' && /^card-/.test(o.cancelReason || ''))) : false;
        return ok({ status: o.status, released, cardOnly: !!o.cardOnly, items: o.items.map(i => ({ compId: i.compId, qty: i.paidQty || i.qty })) }, { dirty: true });
      }
      if (p === '/api/pay/dna/callback' && M === 'POST') {
        const o = db.orders.find(x => x.ref === str(b.invoiceId, 20)); if (!o) return ok({ ok: true });
        if (o.status === 'confirmed' && o.card && o.card.verified) return ok({ ok: true }); // already paid – ignore repeats
        const tid = str(b.id, 80), reused = tid && db.orders.some(x => x !== o && x.card && x.card.id === tid && x.card.verified);
        o.card = { reported: !!(b.success === true || b.success === 'true'), at: iso(now()), id: tid, amount: Number(b.amount) || 0, message: str(b.message, 200), code: b.errorCode ?? null };
        if (reused) { o.card.problem = 'This DNA transaction ID was already used on another order'; return ok({ ok: true }, { dirty: true }); }
        const cfg = await dnaConfig(db), signed = h.dnaSigned ? await h.dnaSigned(b, cfg) : false;
        // declined / failed: release the tickets straight away (only on a genuine, signed result from DNA)
        if (!o.card.reported) { if (signed && o.status === 'pending') { if (o.cardOnly) failOrder(db, o, 'card-declined'); else { const u = o.userId && db.users.find(x => x.id === o.userId); if (u) pushTo(db, x => x.userId === u.id, { title: '❌ Card payment unsuccessful', body: `Your card payment for ${o.ref} didn't go through – you can still pay by bank transfer before your tickets expire.`, url: '/#account-tickets' }); } } return ok({ ok: true }, { dirty: true }); }
        // a success arriving after we released the order (e.g. the customer closed the page) – take it back if the tickets are still free
        if (o.status === 'cancelled' && /^card-/.test(o.cancelReason || '')) o.status = 'expired';
        if (!['pending', 'expired'].includes(o.status)) { o.card.problem = `Payment arrived but the order is ${o.status} – check in DNA and refund or reopen`; return ok({ ok: true }, { dirty: true }); }
        if (o.card.reported && h.dnaVerify && await h.dnaVerify(b, o, cfg)) {
          if (o.status === 'pending' || o.status === 'expired') { if (o.status === 'expired') { const e = reallocate(db, o); if (e) { o.card.problem = e; return ok({ ok: true }, { dirty: true }); } } clearStrike(db, o); o.status = 'confirmed'; o.confirmedAt = iso(now()); o.confirmedBy = 'DNA Payments'; const cu = db.users.find(x => x.id === o.userId); if (cu) emailConfirmed(db, cu, o); settleInstant(db); jackpotSweep(db); }
          o.card.verified = true;
        }
        return ok({ ok: true }, { dirty: true });
      }

      // ---------------- checkout ----------------
      if (p === '/api/checkout' && M === 'POST') {
        const u = await currentUser(db, req.userToken); if (!u) return err(401, 'Please log in or register to check out.');
        const sf = applyPendingLimits(u);
        if (strikeBan(u)) return err(403, `${Math.max(1, Number(s.strikeLimit) || 5)} orders weren’t paid in time, so new entries are paused until ${new Date(u.strikeBanUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'Europe/London' })}.`, { strikeBan: u.strikeBanUntil });
        if (sf.excludedUntil && Date.parse(sf.excludedUntil) > now()) return err(403, `You've taken a break from playing until ${new Date(sf.excludedUntil).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}. You can't enter until then.`, { excluded: true });
        const raw = Array.isArray(b.items) ? b.items.slice(0, 30) : [];
        const merged = new Map(), pickMap = new Map();
        for (const it of raw) {
          const q = int(it.qty); if (!(q >= 1)) return err(400, 'Basket quantities must be at least 1.');
          const id = String(it.compId); merged.set(id, (merged.get(id) || 0) + q);
          if (Array.isArray(it.tickets) && it.tickets.length) pickMap.set(id, (pickMap.get(id) || []).concat(it.tickets.slice(0, 1000).map(int)));
        }
        if (!merged.size) return err(400, 'Your basket is empty.');
        const paid = [], free = [];
        for (const [compId, qty] of merged) {
          const c = db.comps.find(x => x.id === compId);
          if (!c || c.status !== 'live') return err(400, `${c ? c.title : 'A competition in your basket'} is no longer open.`, { compId });
          if (c.auto) return err(400, `${c.title} is automatic – make a paid entry this week and you're in.`, { compId });
          if (c.appOnly && !req.app) return err(403, `${c.title} is an app-exclusive competition – download our app to enter.`, { compId, appOnly: true });
          if (c.eligibility === 'kent' && !(h.kent && h.kent.has(u.address.town))) return err(403, `${c.title} is only open to people living in Kent. Your account town is ${u.address.town}.`, { compId });
          const have = userHeld(db, u.id, c.id);
          if (c.maxPerPerson && have + qty > c.maxPerPerson) return err(400, `${c.title}: limit is ${c.maxPerPerson} per person${have ? ` – you already have ${have}` : ''}.`, { compId });
          const st = stats(db, c);
          if (st.available !== null && qty > st.available) return err(409, st.available ? `${c.title}: only ${st.available} tickets left.` : `${c.title} has no tickets left.`, { compId });
          let picks = null;
          if (pickMap.has(compId)) {
            if (c.ticketMode !== 'pick' || unl(c) || (c.instant || []).length) return err(400, `${c.title}: ticket numbers are allocated at random.`, { compId });
            picks = pickMap.get(compId);
            if (picks.length > qty || new Set(picks).size !== picks.length || picks.some(t => !(t >= 1 && t <= c.totalTickets))) return err(400, `${c.title}: please check your chosen numbers.`, { compId });
            const held = holdings(db, c.id); const gone = picks.filter(t => held.has(t));
            if (gone.length) return err(409, `${c.title}: ticket${gone.length > 1 ? 's' : ''} #${gone.slice(0, 5).join(', #')} ${gone.length > 1 ? 'have' : 'has'} just been taken – please pick another.`, { compId, taken: gone });
          }
          let bonus = c.type === 'paid' ? bundleBonus(c, qty) : 0;
          if (bonus) { if (c.maxPerPerson) bonus = Math.min(bonus, c.maxPerPerson - have - qty); if (st.available !== null) bonus = Math.min(bonus, st.available - qty); bonus = Math.max(0, bonus); }
          (c.type === 'free' ? free : paid).push({ c, qty, picks, bonus });
        }
        const PR = priceLines(db, u, paid, b.promo);
        if (b.promo && PR.promoError) return err(400, PR.promoError, { promo: true });
        if (b.quote) return ok({ lines: PR.lines.map(l => ({ compId: l.c.id, qty: l.qty, bonus: l.bonus, gross: l.gross, disc: l.disc })), subtotal: PR.subtotal, discount: PR.discount, total: PR.total, promo: PR.promo, credit: Math.min(ensureWallet(u).credit, PR.total), cash: u.balance || 0, bankPct: Math.max(0, Number(s.bankDiscount) || 0) });
        const spend = PR.total;
        if (spend) for (const [k, ms, label] of [['day', DAY, 'daily'], ['week', 7 * DAY, 'weekly'], ['month', 30 * DAY, 'monthly']]) {
          const lim = sf.limits[k]; if (!lim) continue;
          const used = spentSince(db, u, ms);
          if (used + spend > lim) return err(403, `This would take you over your ${label} spend limit of ${gbp(lim)} (you've spent ${gbp(used)}). You can change limits in Safe Play.`, { limit: true });
        }
        const mk = list => list.map(({ c, qty, picks, bonus, disc }) => {
          let tickets = allocate(db, c, qty, picks);
          if (bonus && tickets) { const tmp = { status: 'pending', items: [{ compId: c.id, qty, tickets }] }; db.orders.push(tmp); const extra = allocate(db, c, bonus, null); db.orders.pop(); if (extra) tickets = tickets.concat(extra).sort((a, z) => a - z); else bonus = 0; }
          return { compId: c.id, title: c.title, qty: qty + (bonus || 0), paidQty: qty, bonus: bonus || 0, unit: c.price, gross: c.price * qty, amount: c.price * qty - (disc || 0), tickets };
        });
        const out = {};
        const iwLines = PR.lines.filter(x => hasIW(x.c));
        if (iwLines.length && !cardLive(s)) return err(400, `${iwLines[0].c.title} has instant wins – these open as soon as card payments go live. Remove it from your basket to check out.`, { compId: iwLines[0].c.id, iwFrozen: true });
        if (paid.length) {
          const cardOnly = iwLines.length > 0;
          const o = { id: newId(), ref: newRef(db), userId: u.id, source: 'online', status: 'pending', items: [], total: 0, createdAt: iso(now()),
            expiresAt: iso(now() + (cardOnly ? CARD_HOLD : (Number(s.reservationHours) || 48) * HOUR)) };
          if (cardOnly) o.cardOnly = true;
          db.orders.push(o); // push first so allocation sees earlier items of this order
          for (const x of PR.lines) { const [it] = mk([x]); o.items.push(it); }
          o.total = o.items.reduce((a, i) => a + i.amount, 0); o.due = o.total; ensureWallet(u);
          if (PR.discount) { o.subtotal = PR.subtotal; o.discount = PR.discount; o.promo = PR.promo.code; }
          if (b.useCredit !== false && u.credit > 0) { const use = Math.min(u.credit, o.total); o.credit = use; o.due = o.total - use; addCredit(u, -use, 'spent', `Used on order ${o.ref}`); }
          if (b.useCash !== false && u.balance > 0 && o.due > 0) { const use = Math.min(u.balance, o.due); o.cash = use; o.due -= use; credit(u, -use, 'spent', `Used on order ${o.ref}`); }
          if (!o.cardOnly) applyBankDisc(s, o);
          if (!o.cardOnly && s.uniquePence && o.due > 100 && db.orders.some(x => x !== o && x.status === 'pending' && (x.due ?? x.total) === o.due)) { for (let pp = 1; pp <= 9; pp++) { const v = o.due - pp; if (!db.orders.some(x => x !== o && x.status === 'pending' && (x.due ?? x.total) === v)) { o.due = v; o.total -= pp; o.pennyOff = pp; const li = o.items[o.items.length - 1]; li.amount -= pp; break; } } }
          if (o.due === 0) { o.status = 'confirmed'; o.confirmedAt = iso(now()); o.confirmedBy = 'credit'; delete o.expiresAt; emailConfirmed(db, u, o); jackpotSweep(db); out.paidByCredit = orderView(o); }
          else if (o.cardOnly) out.pending = { ...orderView(o), cardOnly: true };
          else { emailPending(db, u, o); out.pending = { ...orderView(o), bank: bankOf(s) }; }
        }
        if (free.length) {
          const o = { id: newId(), ref: newRef(db), userId: u.id, source: 'free', status: 'confirmed', items: [], total: 0, createdAt: iso(now()), confirmedAt: iso(now()) };
          db.orders.push(o);
          for (const x of free) { const [it] = mk([x]); o.items.push(it); }
          emailConfirmed(db, u, o);
          out.free = orderView(o);
        }
        for (const { c } of [...paid, ...free]) refreshComp(db, c);
        return ok(out, { status: 201, dirty: true });
      }

      // ---------------- admin auth ----------------
      if (p === '/api/admin/login' && M === 'POST') {
        if (throttle('al:' + req.ip, 10, 15 * 60e3)) return err(429, 'Too many attempts from this connection. Wait 15 minutes.');
        const email = str(b.email, 120).toLowerCase();
        const a = db.admins.find(x => x.email === email && !x.disabled);
        if (a && a.lockedUntil && Date.parse(a.lockedUntil) > now()) return err(423, 'This account is locked after too many failed attempts. Try again later.');
        const good = a ? await h.verify(String(b.password || ''), a.pass) : (await h.hash('x'), false);
        if (!good) {
          if (a) { a.failed = (a.failed || 0) + 1; if (a.failed >= 5) { a.lockedUntil = iso(now() + 30 * 60e3); a.failed = 0; audit(db, a, 'account locked', '5 failed logins', req.ip); } }
          audit(db, a || { email }, 'login failed', '', req.ip);
          const r = err(401, 'Wrong email or password.'); r.dirty = true; return r;
        }
        if (a.totp) {
          if (!b.code) return err(401, 'Enter the 6-digit code from your authenticator app.', { need2fa: true });
          if (!(await h.totpVerify(a.totp, String(b.code)))) { audit(db, a, 'login failed', 'bad 2FA code', req.ip); return err(401, 'That code is wrong or expired.', { need2fa: true }); }
        }
        a.failed = 0; a.lockedUntil = null; a.lastLogin = iso(now());
        const token = hex(32);
        db.adminSessions.push({ hash: await h.sha(token), adminId: a.id, created: now(), exp: now() + 12 * HOUR, idle: now() + 2 * HOUR, ip: req.ip, ua: str(req.ua, 160) });
        audit(db, a, 'login', '', req.ip);
        return ok({ admin: { email: a.email, name: a.name, twoFactor: !!a.totp, role: roleOf(a), mustChange: !!a.mustChange } }, { setAdmin: token, dirty: true });
      }

      if (p.startsWith('/api/admin/')) {
        const ctx = await currentAdmin(db, req.adminToken);
        if (!ctx) { const r = err(401, 'Please sign in.'); r.setAdmin = ''; return r; }
        const r = await staffGate(db, req, ctx);
        r.dirty = true; // idle timer refreshed
        return r;
      }
      return err(404, 'Not found');
    }

    // ---------------- staff roles ----------------
    // owner: everything + staff accounts · admin: everything but staff accounts
    // employee: runs comps, draws, live, chat, customers – no money (optional: confirm payments) · viewer: look only, no money
    const ROLES = ['owner', 'admin', 'employee', 'viewer'];
    const roleOf = a => ROLES.includes(a.role) ? a.role : 'owner';
    const seesMoney = a => ['owner', 'admin'].includes(roleOf(a));
    function permsOf(a) { const r = roleOf(a), fin = seesMoney(a);
      return { role: r, money: fin, staff: r === 'owner', audit: fin, settings: fin, payouts: fin, orders: fin || (r === 'employee' && !!a.canPay) || (r === 'viewer' && !!a.canPay), write: r !== 'viewer', canPay: !!a.canPay }; }
    const MONEY_KEYS = new Set(['balance', 'credit', 'ledger', 'payout', 'withdrawals', 'idDocs', 'spent', 'spend', 'revenue', 'cashback', 'owed', 'creditOut', 'rewards', 'refReward', 'refRewardMin', 'amount', 'value', 'total', 'due']);
    const stripMoney = (v, keep) => Array.isArray(v) ? v.map(x => stripMoney(x, keep)) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => !MONEY_KEYS.has(k) || (keep && keep.has(k))).map(([k, x]) => [k, stripMoney(x, keep)])) : v;
    async function staffGate(db, req, ctx) {
      const { admin } = ctx, p = req.path, M = req.method, P = permsOf(admin);
      const own = /^\/api\/admin\/(me|logout|logout-all|password|2fa\/(setup|enable|disable))$/.test(p);
      const no = msg => { audit(db, admin, 'blocked', `${M} ${p}`, req.ip); return err(403, msg || 'Your staff account doesn’t have access to this. Ask the owner.'); };
      if (admin.mustChange && !own) return err(403, 'Please choose a new password first.', { mustChange: true });
      if (!own) {
        if (!P.write && M !== 'GET') return no('Your account is view-only.');
        if (/^\/api\/admin\/staff/.test(p) && !P.staff) return no('Only the owner can manage staff accounts.');
        if (/^\/api\/admin\/audit/.test(p) && !P.audit) return no();
        if (!P.money) {
          if (/^\/api\/admin\/(withdrawals|levels|emails|refrewards|promos|jackpot)/.test(p)) return no();
          if (p === '/api/admin/settings' && M !== 'GET') return no();
          if (/^\/api\/admin\/users\/[a-f0-9]{16}\/(credit|iddoc|identity|payout)/.test(p)) return no();
          if (/\/donation$/.test(p)) return no();
          if (/^\/api\/admin\/(orders|statement)/.test(p) && !P.orders) return no();
          if (p === '/api/admin/export/summary') return no();
          if (/^\/api\/admin\/board\/award/.test(p)) return no('Only the owner or an admin can award the prize.');
        }
      }
      if (!P.money && p === '/api/admin/dashboard' && M === 'GET') return ok(staffDashboard(db));
      const r = await adminRoute(db, req, ctx);
      if (P.money || r.status !== 200) return r;
      if (p === '/api/admin/settings' && M === 'GET') r.body = { categories: r.body.categories, siteName: r.body.siteName };
      else if (/^\/api\/admin\/comps\/[a-f0-9]{16}\/stats$/.test(p)) r.body = { ...stripMoney(r.body), top: r.body.top.map(({ spent, ...x }) => x), total: r.body.total };
      else if (/^\/api\/admin\/users/.test(p) || /^\/api\/admin\/board/.test(p)) r.body = stripMoney(r.body, P.orders && /^\/api\/admin\/users\/[a-f0-9]{16}$/.test(p) ? new Set(['total', 'due', 'credit']) : null);
      if (r.body && r.body.user) { delete r.body.user.safe; }
      return r;
    }
    function staffDashboard(db) {
      const t = now(), d0 = new Date(t); d0.setHours(0, 0, 0, 0); const today = d0.getTime();
      const full = dashboard(db);
      return { staff: true, pending: { count: full.pending.count }, live: full.live, app: full.app, ordersToday: full.ordersToday, users: full.users,
        comps: full.comps.map(({ revenue, ...c }) => c), todo: { chat: 0 } };
    }

    // ---------------- admin routes ----------------
    async function adminRoute(db, req, { admin, session }) {
      const { method: M, path: p } = req; const b = req.body || {}; const s = db.settings; let m;
      const log = (action, detail) => audit(db, admin, action, detail, req.ip);

      if (p === '/api/admin/me' && M === 'GET') return ok({ id: admin.id, perms: permsOf(admin), mustChange: !!admin.mustChange, email: admin.email, name: admin.name, twoFactor: !!admin.totp, supports2fa: !!h.supports2fa, sessions: db.adminSessions.filter(x => x.adminId === admin.id).length });
      if (p === '/api/admin/logout' && M === 'POST') { db.adminSessions = db.adminSessions.filter(x => x !== session); log('logout'); return ok({ ok: true }, { setAdmin: '' }); }
      if (p === '/api/admin/logout-all' && M === 'POST') { db.adminSessions = db.adminSessions.filter(x => x.adminId !== admin.id); log('signed out all sessions'); return ok({ ok: true }, { setAdmin: '' }); }
      if (p === '/api/admin/password' && M === 'POST') {
        if (!(await h.verify(String(b.current || ''), admin.pass))) return err(400, 'Current password is wrong.');
        const nx = String(b.next || '');
        if (nx.length < 12 || !/[A-Za-z]/.test(nx) || !/\d/.test(nx)) return err(400, 'Use at least 12 characters with letters and numbers.');
        if (await h.verify(nx, admin.pass)) return err(400, 'Choose a different password from the current one.');
        admin.pass = await h.hash(nx); admin.mustChange = false;
        db.adminSessions = db.adminSessions.filter(x => x.adminId !== admin.id || x === session);
        log('changed password'); return ok({ ok: true });
      }
      // ---- staff accounts (owner only – enforced in staffGate) ----
      const staffView = a => ({ id: a.id, email: a.email, name: a.name || '', role: roleOf(a), canPay: !!a.canPay, disabled: !!a.disabled, twoFactor: !!a.totp, lastLogin: a.lastLogin || null, createdAt: a.createdAt || null, mustChange: !!a.mustChange, me: a.id === admin.id });
      const tempPass = () => { const A = 'abcdefghjkmnpqrstuvwxyz', D = '23456789'; let x = ''; for (let i = 0; i < 10; i++) x += A[h.randInt(A.length)]; return x.slice(0, 5) + '-' + D[h.randInt(8)] + D[h.randInt(8)] + '-' + x.slice(5) + D[h.randInt(8)]; };
      const owners = () => db.admins.filter(a => roleOf(a) === 'owner' && !a.disabled);
      if (p === '/api/admin/staff' && M === 'GET') return ok({ staff: db.admins.map(staffView), roles: ROLES });
      if (p === '/api/admin/staff' && M === 'POST') {
        const email = str(b.email, 120).toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err(400, 'Enter a valid email address.');
        if (db.admins.some(a => a.email === email)) return err(409, 'There’s already a staff account with that email.');
        const role = ROLES.includes(b.role) ? b.role : 'employee', pw = tempPass();
        const a = { id: newId(), email, name: str(b.name, 60) || email.split('@')[0], role, canPay: !!b.canPay, pass: await h.hash(pw), totp: null, createdAt: iso(now()), createdBy: admin.email, mustChange: true };
        db.admins.push(a); log('added staff account', `${email} as ${role}${a.canPay ? ' (can confirm payments)' : ''}`);
        return ok({ staff: staffView(a), tempPassword: pw });
      }
      if ((m = /^\/api\/admin\/staff\/([a-f0-9]{16})(\/reset)?$/.exec(p)) && M === 'POST') {
        const a = db.admins.find(x => x.id === m[1]); if (!a) return err(404, 'Staff account not found.');
        if (m[2]) { if (a.id === admin.id) return err(400, 'Use “Change password” for your own account.');
          const pw = tempPass(); a.pass = await h.hash(pw); a.mustChange = true; a.totp = null; a.failed = 0; a.lockedUntil = null; db.adminSessions = db.adminSessions.filter(x => x.adminId !== a.id);
          log('reset staff password', a.email); return ok({ tempPassword: pw }); }
        const role = ROLES.includes(b.role) ? b.role : roleOf(a), disabled = 'disabled' in b ? !!b.disabled : !!a.disabled;
        if (a.id === admin.id && (role !== 'owner' || disabled)) return err(400, 'You can’t remove your own owner access – ask another owner.');
        if (roleOf(a) === 'owner' && (role !== 'owner' || disabled) && owners().length <= 1) return err(400, 'There must always be at least one owner.');
        const was = `${roleOf(a)}${a.canPay ? '+pay' : ''}${a.disabled ? ' (off)' : ''}`;
        a.role = role; a.canPay = 'canPay' in b ? !!b.canPay : !!a.canPay; a.disabled = disabled; if (b.name) a.name = str(b.name, 60);
        if (disabled) db.adminSessions = db.adminSessions.filter(x => x.adminId !== a.id);
        log(disabled ? 'switched off staff account' : 'changed staff access', `${a.email}: ${was} → ${role}${a.canPay ? '+pay' : ''}${disabled ? ' (off)' : ''}`);
        return ok({ staff: staffView(a) });
      }
      if (p === '/api/admin/2fa/setup' && M === 'POST') {
        if (!h.supports2fa) return err(400, 'Two-factor sign-in is available on the live site.');
        admin.totpPending = h.totpSecret();
        return ok({ secret: admin.totpPending, uri: `otpauth://totp/${encodeURIComponent(s.siteName + ':' + admin.email)}?secret=${admin.totpPending}&issuer=${encodeURIComponent(s.siteName)}` });
      }
      if (p === '/api/admin/2fa/enable' && M === 'POST') {
        if (!admin.totpPending || !(await h.totpVerify(admin.totpPending, String(b.code || '')))) return err(400, 'That code is wrong – check the time on your phone and try again.');
        admin.totp = admin.totpPending; delete admin.totpPending; log('enabled 2FA'); return ok({ ok: true });
      }
      if (p === '/api/admin/2fa/disable' && M === 'POST') {
        if (!admin.totp || !(await h.totpVerify(admin.totp, String(b.code || '')))) return err(400, 'Enter a current code to turn off 2FA.');
        admin.totp = null; log('disabled 2FA'); return ok({ ok: true });
      }

      if (p === '/api/admin/dashboard' && M === 'GET') return ok(dashboard(db));

      // ---- orders ----
      if (p === '/api/admin/orders' && M === 'GET') {
        const userName = id => { const u = db.users.find(x => x.id === id); return u ? { name: fullName(u), email: u.email, phone: u.phone, town: u.address.town } : null; };
        return ok(db.orders.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(o => ({ ...orderView(o), userId: o.userId, user: o.userId ? userName(o.userId) : { name: entrantOf(db, o).name, town: entrantOf(db, o).town, email: o.postal?.email || '', phone: o.postal?.phone || '' }, confirmedBy: o.confirmedBy || null })));
      }
      if ((m = /^\/api\/admin\/orders\/([a-f0-9]{16})\/(confirm|cancel|reopen)$/.exec(p)) && M === 'POST') {
        const o = db.orders.find(x => x.id === m[1]); if (!o) return err(404, 'Order not found.');
        const u = o.userId ? db.users.find(x => x.id === o.userId) : null;
        if (m[2] === 'confirm') {
          if (o.status === 'confirmed') return err(400, 'Already confirmed.');
          const e = confirmOrder(db, o, admin.email); if (e) return err(409, e);
          log('confirmed order', `${o.ref} ${gbp(o.total)}`);
        } else if (m[2] === 'cancel') {
          if (o.status === 'confirmed') return err(400, 'Confirmed orders can’t be cancelled here.');
          o.status = 'cancelled'; releaseCredit(db, o, 'cancelled'); log('cancelled order', o.ref);
        } else {
          if (o.status !== 'expired' && o.status !== 'cancelled') return err(400, 'Only expired or cancelled orders can be reopened.');
          const e = reallocate(db, o); if (e) return err(409, e);
          clearStrike(db, o); o.status = 'pending'; o.expiresAt = iso(now() + (Number(s.reservationHours) || 48) * HOUR); if (o.creditBack || o.cashBack) { if (o.creditBack) { o.credit = 0; o.creditBack = false; } if (o.cashBack) { o.cash = 0; o.cashBack = false; } o.due = o.total - (o.credit || 0) - (o.cash || 0); } log('reopened order', o.ref);
        }
        for (const it of o.items) { const c = db.comps.find(x => x.id === it.compId); if (c) refreshComp(db, c); }
        return ok(orderView(o));
      }
      if (p === '/api/admin/postal' && M === 'POST') {
        const c = db.comps.find(x => x.id === b.compId);
        if (!c || !['live', 'ended'].includes(c.status)) return err(400, 'Choose a competition that is open for entries.');
        const first = str(b.first, 40), last = str(b.last, 40), town = str(b.town, 80), qty = Math.max(1, int(b.qty) || 1);
        if (!first || !last) return err(400, 'Enter the entrant’s first and last name.');
        if (!validTown(town)) return err(400, 'Choose the entrant’s town from the list.');
        if (c.eligibility === 'kent' && !(h.kent && h.kent.has(town))) return err(400, `${c.title} is Kent residents only – ${town} isn’t in Kent.`);
        if (stats(db, c).available !== null && qty > stats(db, c).available) return err(409, 'Not enough tickets left.');
        const email = str(b.email, 120).toLowerCase(); const u = email ? db.users.find(x => x.email === email) : null;
        const tickets = allocate(db, c, qty);
        const o = { id: newId(), ref: newRef(db), userId: u ? u.id : null, source: 'postal', status: 'confirmed', total: 0, createdAt: iso(now()), confirmedAt: iso(now()), confirmedBy: admin.email,
          postal: { first, last, town, email, phone: str(b.phone, 20), address: str(b.address, 200) }, items: [{ compId: c.id, title: c.title, qty, unit: 0, amount: 0, tickets }] };
        db.orders.push(o); refreshComp(db, c);
        if (u) emailConfirmed(db, u, o);
        jackpotSweep(db); log('added postal entry', `${c.title} – ${first} ${last} ×${qty}`);
        return ok(orderView(o));
      }

      // ---- users ----
      if (p === '/api/admin/users' && M === 'GET') {
        return ok(db.users.map(u => {
          const os = db.orders.filter(o => o.userId === u.id);
          const q = st => os.filter(o => o.status === st).reduce((a, o) => a + o.items.reduce((x, i) => x + i.qty, 0), 0);
          return { ...publicUser(u), lastLogin: u.lastLogin || null, confirmedTickets: q('confirmed'), pendingTickets: q('pending'), balance: u.balance || 0, credit: u.credit || 0, idStatus: u.idStatus || 'none',
            excluded: !!(u.safe?.excludedUntil && Date.parse(u.safe.excludedUntil) > now()), strikes: liveStrikes(s, u).length, strikeBan: strikeBan(u), app: db.installs.some(i => i.userId === u.id), push: db.pushSubs.some(x => x.userId === u.id),
            spent: os.filter(o => o.status === 'confirmed').reduce((a, o) => a + o.total, 0), owed: os.filter(o => o.status === 'pending').reduce((a, o) => a + o.total, 0), orders: os.length };
        }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      }
      if ((m = /^\/api\/admin\/users\/([a-f0-9]{16})\/(reset|verify)$/.exec(p)) && M === 'POST') {
        const u = db.users.find(x => x.id === m[1]); if (!u) return err(404, 'Customer not found.');
        if (m[2] === 'verify') { u.verified = true; delete u.verifyHash; delete u.verifyExp; log('marked email verified', `${u.first} ${u.last}`); return ok({ ok: true }); }
        const t = await makeToken(u, 'reset', 24 * HOUR), link = linkFor(req, db, 'reset-' + t);
        emailReset(db, u, link); log('sent password reset', `${u.first} ${u.last}`);
        return ok({ link, email: u.email, phone: u.phone });
      }
      if ((m = /^\/api\/admin\/users\/([a-f0-9]{16})$/.exec(p)) && M === 'GET') {
        const u = db.users.find(x => x.id === m[1]); if (!u) return err(404, 'Customer not found.');
        const wins = []; for (const c of db.comps) for (const w of c.winners || []) if (w.userId === u.id) wins.push({ title: c.title, prize: w.prize, ticket: w.ticket, at: w.at });
        return ok({ user: { ...publicUser(u), lastLogin: u.lastLogin || null, marketing: !!u.marketing, consentAt: u.consentAt || null, balance: u.balance || 0, credit: u.credit || 0, ledger: (u.ledger || []).slice(0, 30),
          idStatus: u.idStatus || 'none', idNote: u.idNote || '', idDocs: (u.idDocs || []).map((d, i) => ({ i, kind: d.kind, at: d.at })), payout: u.payout ? { name: u.payout.name, last4: u.payout.last4, sortMask: u.payout.sortMask } : null,
          safe: u.safe || null, strikes: liveStrikes(s, u), strikeBan: strikeBan(u), strikeBans: u.strikeBans || 0, referredBy: u.referredBy ? userBrief(db, u.referredBy) : null, invited: invitedBy(db, u), refCode: ensureRef(db, u), app: db.installs.some(i => i.userId === u.id), push: db.pushSubs.some(x => x.userId === u.id), withdrawals: db.withdrawals.filter(w => w.userId === u.id) }, orders: db.orders.filter(o => o.userId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(orderView), wins });
      }

      // ---- comps ----
      if (p === '/api/admin/comps' && M === 'GET') return ok(db.comps.map(c => ({ ...publicComp(db, c), winners: c.winners || [], charityPhoto: c.charityPhoto || '', charityNote: c.charityNote || '', charityPaidAt: c.charityPaidAt || null })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      if (p === '/api/admin/comps' && M === 'POST') {
        const existing = b.id ? db.comps.find(x => x.id === b.id) : null;
        if (b.id && !existing) return err(404, 'Competition not found.');
        const { f, error } = compFromBody(db, b, existing); if (error) return err(400, error);
        let c;
        if (existing) {
          c = existing;
          if (c.type !== f.type && holdings(db, c.id).size) return err(400, 'You can’t switch free/paid once tickets are taken.');
          Object.assign(c, f);
          if (['live', 'hidden', 'closed', 'scheduled'].includes(b.status) && !['drawing', 'drawn'].includes(c.status)) { if (b.status === 'scheduled' && holdings(db, c.id).size) return err(400, 'This competition already has entries – it can’t be scheduled.'); c.status = b.status; }
          if (c.status === 'ended' && (!c.endsAt || Date.parse(c.endsAt) > now())) c.status = 'live';
          await ensureSeed(c); log('edited competition', c.title);
        } else {
          c = { id: newId(), ...f, status: ['hidden', 'scheduled'].includes(b.status) ? b.status : 'live', winners: [], createdAt: iso(now()) };
          await ensureSeed(c); db.comps.push(c); log('created competition', c.title);
        }
        if (Array.isArray(b.instant)) { const err2 = await setInstant(db, c, b.instant); if (err2) return err(400, err2); }
        if ((c.instant || []).length) c.ticketMode = 'random'; // winning numbers are public, so nobody can pick them
        if (!s.categories.includes(c.category)) s.categories.push(c.category);
        refreshComp(db, c);
        return ok(publicComp(db, c));
      }
      if ((m = /^\/api\/admin\/comps\/([a-f0-9]{16})$/.exec(p)) && M === 'DELETE') {
        const c = db.comps.find(x => x.id === m[1]); if (!c) return err(404, 'Not found.');
        if (holdings(db, c.id).size || db.orders.some(o => o.items.some(i => i.compId === c.id))) return err(400, 'This competition has entries – set it to Hidden or Closed instead.');
        db.comps = db.comps.filter(x => x !== c); log('deleted competition', c.title); return ok({ ok: true });
      }
      if ((m = /^\/api\/admin\/comps\/([a-f0-9]{16})\/entrants$/.exec(p)) && M === 'GET') {
        const c = db.comps.find(x => x.id === m[1]); if (!c) return err(404, 'Not found.');
        return ok(entrantPool(db, c));
      }
      if ((m = /^\/api\/admin\/comps\/([a-f0-9]{16})\/draw$/.exec(p)) && M === 'POST') {
        const c = db.comps.find(x => x.id === m[1]); if (!c) return err(404, 'Not found.');
        const prizes = c.prizes.length ? c.prizes : [c.title];
        c.winners = c.winners || [];
        if (c.status === 'drawn' || c.winners.length >= prizes.length) return err(400, 'Every prize in this competition has been drawn.');
        if (!['soldout', 'ended', 'drawing'].includes(c.status)) {
          if (!b.force) return err(400, 'This competition hasn’t sold out yet.', { needsForce: true });
          if (c.status !== 'live' && c.status !== 'closed') return err(400, 'This competition can’t be drawn.');
        }
        const gmode = c.gameMode || 'standard';
        if (gmode === 'banker') return err(400, 'Elite Banker competitions are played in the game studio.');
        if (gmode === 'banker') return err(400, 'Elite Banker is played from the game board.');
        if (gmode === 'hilo') return err(400, 'Higher or Lower is played from the game board.');
        if (gmode !== 'standard' && b.method !== 'game') return err(400, 'Use the race start button for this game.');
        if (gmode === 'standard' && !['number', 'wheel', 'reel', 'plinko', 'scratch', 'race', 'duck'].includes(b.method)) return err(400, 'Choose how to reveal the winner.');
        if (c.winners.some(w => (w.race && Date.parse(w.race.endAt) > now()) || (w.show && Date.parse(w.revealAt) > now()))) return err(400, 'Wait for the current reveal to finish.');
        if (c.game && c.game.kind === 'lms' && c.game.phase === 'running') return err(400, 'Finish the Last Man Standing game first.');
        { const ub = unpaidBlock(db, c); if (ub) return err(409, ub, { unpaid: true }); }
        const pool = entrantPool(db, c);
        if (!pool.tickets.length) return err(400, 'There are no confirmed tickets left to draw from.');
        let pick, gameRange = null;
        if (b.method === 'number') {
          const n = int(b.number);
          pick = pool.tickets.find(x => x[0] === n);
          if (pick) { c.proofs = c.proofs || []; c.proofs.push({ n: c.proofs.length + 1, label: `${prizes[c.winners.length]} – Google number`, at: iso(now()), kind: 'manual', count: pool.tickets.length, ticket: n, name: pool.groups[pick[1]].name, note: 'Number generated on Google by the host, live on stream' }); }
          if (!pick) return err(400, c.winners.some(w => w.ticket === n) ? `Ticket #${n} has already won a prize – generate another number.` : `Ticket #${n} isn’t a confirmed entry – generate another number (1–${c.totalTickets}).`);
        } else if (b.method === 'race' || b.method === 'duck') {
          if (pool.tickets.length > 25) return err(400, `A race can have up to 25 entrants – this draw has ${pool.tickets.length} tickets. Choose another reveal.`);
          gameRange = pool.tickets; pick = (await provablePick(db, c, gameRange, pool, `${prizes[c.winners.length]} – ${b.method === 'duck' ? 'duck race' : 'race'}`)).pick;
        } else if (b.method === 'game') {
          const ri = c.winners.length, per = Math.ceil(c.totalTickets / (c.races || 1)), lo = ri * per + 1, hi = Math.min(c.totalTickets, (ri + 1) * per);
          gameRange = pool.tickets.filter(x => x[0] >= lo && x[0] <= hi);
          if (!gameRange.length) return err(400, `There are no confirmed entries in race ${ri + 1} (tickets ${lo}–${hi}).`);
          if (c.winners.some(w => w.race && Date.parse(w.race.endAt) > now())) return err(400, 'Wait for the current race to finish.');
          pick = (await provablePick(db, c, gameRange, pool, `${prizes[c.winners.length]} – race ${ri + 1}`)).pick;
        } else pick = (await provablePick(db, c, pool.tickets, pool, `${prizes[c.winners.length]} – ${({ wheel: 'wheel spin', reel: 'name reveal', plinko: 'Sheppey Drop', scratch: 'scratch card' })[b.method]}`)).pick;
        const g = pool.groups[pick[1]];
        const extra = { method: b.method };
        if (gameRange) {
          const rmode = b.method === 'game' ? gmode : b.method;
          const laps = Math.min(5, Math.max(1, int(b.laps) || c.raceLaps || 1)), startAt = now() + 4500, dur = raceDur(rmode, laps);
          extra.race = { field: gameRange.map(x => x[0]).sort((a, z) => a - z), names: {}, seed: h.randInt(1e9), mode: rmode, laps, startAt: iso(startAt), dur, endAt: iso(startAt + dur + 2500), index: c.winners.length, of: b.method === 'game' ? (c.races || 1) : prizes.length };
          for (const [t, gi] of gameRange) extra.race.names[t] = { name: pool.groups[gi].name, town: pool.groups[gi].town };
          extra.revealAt = extra.race.endAt;
        }
        if (['wheel', 'number', 'reel', 'plinko', 'scratch'].includes(b.method)) {
          const startAt = now() + 1500, digits = String(unl(c) ? Math.max(1, ...pool.tickets.map(t => t[0])) : c.totalTickets).length;
          const dur = { wheel: 8000, number: 6500, reel: 7000, plinko: digits * 2600 + 2200, scratch: 7500 }[b.method];
          extra.show = { kind: b.method, startAt: iso(startAt), dur, number: ['number', 'plinko'].includes(b.method) ? pick[0] : null, digits, seed: h.randInt(1e9) };
          extra.revealAt = iso(startAt + dur + 1500);
        }
        const w = recordWin(db, c, g, pick[0], extra, admin);
        log('drew winner', `${c.title} – ${w.prize}: #${w.ticket} ${w.name} (${w.method}${w.method === 'number' ? ' ' + w.ticket : ''})`);
        return ok({ winner: w, remaining: prizes.length - c.winners.length, status: c.status, pool, serverNow: now() });
      }
      if ((m = /^\/api\/admin\/comps\/([a-f0-9]{16})\/lms\/(start|next)$/.exec(p)) && M === 'POST') {
        const c = db.comps.find(x => x.id === m[1]); if (!c) return err(404, 'Not found.');
        if (m[2] === 'start') { const ub = unpaidBlock(db, c); if (ub) return err(409, ub, { unpaid: true }); }
        if (c.gameMode && c.gameMode !== 'standard') return err(400, 'Last Man Standing is a reveal for normal competitions.');
        const prizes = c.prizes.length ? c.prizes : [c.title]; c.winners = c.winners || [];
        let gm = c.game && c.game.kind === 'lms' ? c.game : null;
        const ev = (type, data) => { gm.seq = (gm.seq || 0) + 1; gm.events.push({ seq: gm.seq, type, at: iso(now()), ...data }); if (gm.events.length > 80) gm.events.splice(0, gm.events.length - 80); };
        if (m[2] === 'start') {
          if (gm && gm.phase === 'running') return err(400, 'A game is already running.');
          if (c.winners.length >= prizes.length) return err(400, 'Every prize has been drawn.');
          if (c.winners.some(w => (w.race && Date.parse(w.race.endAt) > now()) || (w.revealAt && Date.parse(w.revealAt) > now()))) return err(400, 'Wait for the current reveal to finish.');
          if (!['soldout', 'ended', 'drawing'].includes(c.status) && !(b.force && ['live', 'closed'].includes(c.status))) return err(400, 'This competition hasn’t sold out yet.', { needsForce: true });
          const pool = entrantPool(db, c); if (pool.tickets.length < 2) return err(400, 'Last Man Standing needs at least 2 tickets.');
          const { pick: win, rand } = await provablePick(db, c, pool.tickets, pool, `${prizes[c.winners.length]} – Last Man Standing`);
          const others = seededShuffle(pool.tickets.filter(t => t !== win).map(t => t[0]), rand);
          c.game = gm = { kind: 'lms', phase: 'running', prizeIndex: c.winners.length, prize: prizes[c.winners.length], field: pool.tickets.map(([t, gi]) => [t, pool.groups[gi].name, pool.groups[gi].town]).sort((a, z) => a[0] - z[0]),
            order: others.concat([win[0]]), win: { ticket: win[0], gi: win[1] }, out: 0, round: 0, events: gm ? gm.events : [], seq: gm ? gm.seq : 0 };
          gm._group = pool.groups[win[1]]; c.status = 'drawing';
          ev('start', { count: gm.field.length, prize: gm.prize }); log('started Last Man Standing', `${c.title} – ${gm.prize} (${gm.field.length} tickets)`);
          return ok(lmsPublic(c));
        }
        if (!gm || gm.phase !== 'running') return err(400, 'Start a Last Man Standing game first.');
        const rem = gm.field.length - gm.out, want = Math.floor(Number(b.n)), k = want >= 1 && want <= 1000 ? want : rem > 12 ? Math.floor(rem / 2) : 1;
        const cut = gm.order.slice(gm.out, gm.out + Math.min(k, rem - 1)); gm.out += cut.length; gm.round++;
        const left = gm.field.length - gm.out;
        ev('cut', { round: gm.round, tickets: cut, remaining: left });
        if (left === 1) {
          const g = gm._group || entrantPool(db, c).groups[gm.win.gi];
          gm.phase = 'won'; ev('winner', { ticket: gm.win.ticket, name: g.name, town: g.town, prize: gm.prize });
          recordWin(db, c, g, gm.win.ticket, { method: 'lms', revealAt: iso(now() + 2500) }, admin);
          delete gm._group;
          log('Last Man Standing winner', `${c.title} – #${gm.win.ticket} ${g.name}`);
        }
        return ok(lmsPublic(c));
      }
      if ((m = /^\/api\/admin\/comps\/([a-f0-9]{16})\/hilo\/(start|reveal|guess|cash|next)$/.exec(p)) && M === 'POST') {
        const c = db.comps.find(x => x.id === m[1]); if (!c || c.gameMode !== 'hilo') return err(404, 'Not a Higher or Lower competition.');
        if (m[2] === 'start') { const ub = unpaidBlock(db, c); if (ub) return err(409, ub, { unpaid: true }); }
        const act = m[2]; let gm = c.game;
        const ev = (type, data) => { gm.seq = (gm.seq || 0) + 1; gm.events.push({ seq: gm.seq, type, at: iso(now()), ...data }); };
        if (act === 'start') {
          if (gm) return err(400, 'The game has already started.');
          if (!['soldout', 'ended'].includes(c.status) && !(b.force && c.status === 'live')) return err(400, 'This competition hasn’t sold out yet.', { needsForce: true });
          if (!entrantPool(db, c).tickets.length) return err(400, 'No confirmed entries yet.');
          c.game = gm = { kind: 'hilo', phase: 'reveal', current: -1, ladder: hiloLadder(c.hiloMax), safe: [0, 3, 6], players: [], events: [], seq: 0 };
          c.status = 'drawing'; ev('start', { players: c.hiloPlayers }); log('started Higher or Lower', c.title);
          return ok(hiloPublic(c));
        }
        if (!gm) return err(400, 'Start the game first.');
        if (act === 'reveal') {
          if (gm.phase !== 'reveal') return err(400, 'Finish the current player first.');
          const pool = entrantPool(db, c), used = new Set(gm.players.map(x => x.gi));
          const cand = pool.tickets.filter(t => !used.has(t[1])); if (!cand.length) return err(400, 'Everyone who entered has already played.');
          const { pick: [t, gi], rand } = await provablePick(db, c, cand, pool, `${gm.prize || prizes[c.winners.length] || c.title} – Higher or Lower player ${gm.players.length + 1}`), g = pool.groups[gi];
          const deck = seededShuffle(Array.from({ length: 52 }, (_, i) => i), rand);
          gm.players.push({ ticket: t, gi, name: g.name, town: g.town, userId: g.userId, ref: g.ref, email: g.email, deck, pos: 0, rung: 0, cards: [deck[0]], result: null, how: null });
          gm.current = gm.players.length - 1; gm.phase = 'play';
          const reel = shuffle(cand.filter(x => x[0] !== t).slice()).slice(0, 30).map(([tt, gg]) => [tt, pool.groups[gg].name, pool.groups[gg].town]);
          ev('reveal', { player: gm.current, ticket: t, name: g.name, town: g.town, reel, total: pool.total, card: deck[0] });
          if (g.userId) pushTo(db, sub => sub.userId === g.userId, { title: 'You\'re playing Higher or Lower! 🃏', body: `Ticket #${t} was picked in ${c.title} – watch live now`, url: '/#games' });
          return ok(hiloPublic(c));
        }
        const pl = gm.players[gm.current];
        if (act === 'next') {
          if (!pl || pl.result === null) return err(400, 'Finish this player first.');
          if (gm.players.length >= c.hiloPlayers) { gm.phase = 'done'; c.status = 'drawn'; c.drawnAt = iso(now()); ev('done', {}); }
          else { gm.phase = 'reveal'; ev('next', { player: gm.players.length }); }
          return ok(hiloPublic(c));
        }
        if (!pl || pl.result !== null || gm.phase !== 'play') return err(400, 'Reveal the next player first.');
        const top = gm.ladder.length - 1;
        const finish = (amount, how) => {
          pl.result = amount; pl.how = how; gm.phase = 'result';
          ev(how, { player: gm.current, amount, rung: pl.rung });
          recordWin(db, c, { userId: pl.userId, ref: pl.ref, name: pl.name, town: pl.town, email: pl.email }, pl.ticket,
            { method: 'hilo', amount, prize: `Higher or Lower – ${gbp(amount)}`, hiloHow: how, revealAt: iso(now() + 4000) }, admin);
          log('Higher or Lower result', `${c.title}: #${pl.ticket} ${pl.name} ${how} – ${gbp(amount)}`);
        };
        if (act === 'cash') { finish(gm.ladder[pl.rung], 'cash'); return ok(hiloPublic(c)); }
        const guess = b.guess === 'lower' ? 'lower' : 'higher';
        if (pl.pos + 1 >= 52) { finish(gm.ladder[pl.rung], 'cash'); return ok(hiloPublic(c)); }
        const prev = pl.deck[pl.pos], next = pl.deck[pl.pos + 1]; pl.pos++; pl.cards.push(next);
        const rv = x => (x % 13) + 2, a = rv(prev), z = rv(next);
        const outcome = z === a ? 'push' : (z > a) === (guess === 'higher') ? 'right' : 'wrong';
        if (outcome === 'right') pl.rung++;
        ev('guess', { player: gm.current, guess, card: next, outcome, rung: pl.rung });
        if (outcome === 'wrong') { const safe = Math.max(...gm.safe.filter(r => r <= pl.rung)); pl.rung = safe; finish(gm.ladder[safe], 'bust'); }
        else if (pl.rung >= top) finish(gm.ladder[top], 'top');
        return ok(hiloPublic(c));
      }
      if ((m = /^\/api\/admin\/comps\/([a-f0-9]{16})\/(lms|hilo)$/.exec(p)) && M === 'GET') {
        const c = db.comps.find(x => x.id === m[1]); if (!c) return err(404, 'Not found.');
        return ok({ ...(m[2] === 'lms' ? lmsPublic(c) : hiloPublic(c)), serverNow: now() });
      }
      if ((m = /^\/api\/admin\/comps\/([a-f0-9]{16})\/banker\/(start|reveal|pick|open|answer|next)$/.exec(p)) && M === 'POST') {
        const c = db.comps.find(x => x.id === m[1]); if (!c || c.gameMode !== 'banker') return err(404, 'Not an Elite Banker competition.');
        if (m[2] === 'start') { const ub = unpaidBlock(db, c); if (ub) return err(409, ub, { unpaid: true }); }
        const act = m[2]; let gm = c.game;
        const ev = (type, data) => { gm.seq = (gm.seq || 0) + 1; gm.events.push({ seq: gm.seq, type, at: iso(now()), ...data }); };
        if (act === 'start') {
          if (gm) return err(400, 'The game has already started.');
          if (!['soldout', 'ended'].includes(c.status) && !(b.force && c.status === 'live')) return err(400, 'This competition hasn’t sold out yet.', { needsForce: true });
          if (!entrantPool(db, c).tickets.length) return err(400, 'No confirmed entries yet.');
          c.game = gm = { phase: 'reveal', current: -1, values: bankerValues(c.bankerMax), startedAt: iso(now()), players: [], events: [], seq: 0 };
          c.status = 'drawing'; ev('start', { players: c.bankerPlayers }); log('started Elite Banker', c.title);
          return ok(bankerPublic(c));
        }
        if (!gm) return err(400, 'Start the game first.');
        if (act === 'reveal') {
          if (gm.phase !== 'reveal') return err(400, 'Finish the current player first.');
          const pool = entrantPool(db, c), used = new Set(gm.players.map(x => x.gi));
          const cand = pool.tickets.filter(t => !used.has(t[1]));
          if (!cand.length) return err(400, 'Everyone who entered has already played.');
          const { pick: [t, gi], rand } = await provablePick(db, c, cand, pool, `${c.title} – Elite Banker player ${gm.players.length + 1}`), g = pool.groups[gi];
          gm.players.push({ ticket: t, gi, name: g.name, town: g.town, userId: g.userId, ref: g.ref, email: g.email, boxes: seededShuffle(gm.values.slice(), rand), myBox: null, opened: [], offers: [], offer: null, round: 0, roundLeft: BK_ROUNDS[0], result: null, dealt: false });
          gm.current = gm.players.length - 1; gm.phase = 'pick';
          const reel = shuffle(cand.filter(x => x[0] !== t).slice()).slice(0, 30).map(([tt, gg]) => [tt, pool.groups[gg].name, pool.groups[gg].town]);
          ev('reveal', { player: gm.current, ticket: t, name: g.name, town: g.town, reel, total: pool.total });
          if (g.userId) pushTo(db, sub => sub.userId === g.userId, { title: 'You\'re playing Elite Banker! 💼', body: `Ticket #${t} was picked in ${c.title} – watch live now`, url: '/#games' });
          log('Elite Banker player', `${c.title}: #${t} ${g.name}`);
          return ok(bankerPublic(c));
        }
        const pl = gm.players[gm.current];
        if (act === 'next') {
          if (!pl || pl.result === null) return err(400, 'Finish this player first.');
          if (gm.players.length >= c.bankerPlayers) { gm.phase = 'done'; c.status = 'drawn'; c.drawnAt = iso(now()); ev('done', {}); }
          else { gm.phase = 'reveal'; ev('next', { player: gm.players.length }); }
          return ok(bankerPublic(c));
        }
        if (!pl || pl.result !== null) return err(400, 'Reveal the next player first.');
        if (act === 'pick') {
          const n = int(b.box); if (gm.phase !== 'pick') return err(400, 'Box already chosen.'); if (!(n >= 0 && n < 22)) return err(400, 'Choose a box.');
          pl.myBox = n; gm.phase = 'open'; ev('pick', { player: gm.current, box: n });
        } else if (act === 'open') {
          const n = int(b.box);
          if (gm.phase !== 'open') return err(400, gm.phase === 'offer' ? 'Answer the Banker’s offer first.' : 'Pick the player’s box first.');
          if (n === pl.myBox || pl.opened.includes(n) || !(n >= 0 && n < 22)) return err(400, 'Pick an unopened box.');
          pl.opened.push(n); pl.roundLeft--;
          ev('open', { player: gm.current, box: n, value: pl.boxes[n], left: pl.roundLeft });
          if (pl.roundLeft <= 0) {
            const left = [...Array(22).keys()].filter(i => !pl.opened.includes(i)).map(i => pl.boxes[i]);
            const avg = left.reduce((a, v) => a + v, 0) / left.length;
            pl.offer = niceP(avg * BK_FACTOR[Math.min(pl.round, BK_FACTOR.length - 1)]);
            pl.offers.push(pl.offer); gm.phase = 'offer'; ev('offer', { player: gm.current, amount: pl.offer, round: pl.round + 1 });
          }
        } else if (act === 'answer') {
          if (gm.phase !== 'offer') return err(400, 'There’s no offer to answer.');
          if (b.deal) { pl.result = pl.offer; pl.dealt = true; ev('deal', { player: gm.current, amount: pl.offer, own: pl.boxes[pl.myBox] }); }
          else if (pl.opened.length >= 20) {
            const other = [...Array(22).keys()].find(i => i !== pl.myBox && !pl.opened.includes(i));
            pl.result = pl.boxes[pl.myBox]; ev('nodeal', { player: gm.current, amount: pl.offer, final: true });
            ev('final', { player: gm.current, box: pl.myBox, own: pl.boxes[pl.myBox], other, otherValue: pl.boxes[other] });
          } else { ev('nodeal', { player: gm.current, amount: pl.offer }); pl.round++; pl.roundLeft = BK_ROUNDS[pl.round]; pl.offer = null; gm.phase = 'open'; }
          if (pl.result !== null) {
            gm.phase = 'result';
            recordWin(db, c, { userId: pl.userId, ref: pl.ref, name: pl.name, town: pl.town, email: pl.email }, pl.ticket,
              { method: 'banker', amount: pl.result, prize: `Elite Banker – ${gbp(pl.result)}`, dealt: pl.dealt, ownBox: pl.boxes[pl.myBox], revealAt: iso(now() + 7000) }, admin);
            log('Elite Banker result', `${c.title}: #${pl.ticket} ${pl.name} ${pl.dealt ? 'took the deal' : 'went all the way'} – ${gbp(pl.result)}`);
          }
        }
        return ok(bankerPublic(c));
      }
      if ((m = /^\/api\/admin\/comps\/([a-f0-9]{16})\/banker$/.exec(p)) && M === 'GET') {
        const c = db.comps.find(x => x.id === m[1]); if (!c) return err(404, 'Not found.'); return ok({ ...bankerPublic(c), serverNow: now() });
      }
      if ((m = /^\/api\/admin\/comps\/([a-f0-9]{16})\/winner-photo$/.exec(p)) && M === 'POST') {
        const c = db.comps.find(x => x.id === m[1]); if (!c) return err(404, 'Not found.');
        const photo = str(b.photo, 3_000_000);
        if (photo && !/^(\/uploads\/[a-f0-9]+\.(jpg|png|webp)|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+)$/i.test(photo)) return err(400, 'Photo is not valid.');
        if ('photo' in b) c.winnerPhoto = photo;
        if ('quote' in b) c.winnerQuote = text(b.quote, 300);
        if ('video' in b) { const v = str(b.video, 300); if (v && !/^https:\/\/[^\s"'<>]+$/i.test(v)) return err(400, 'The video link must start with https://'); c.videoUrl = v; }
        log('updated winner story', c.title); return ok({ ok: true });
      }
      if ((m = /^\/api\/admin\/comps\/([a-f0-9]{16})\/draw\/undo$/.exec(p)) && M === 'POST') {
        const c = db.comps.find(x => x.id === m[1]); if (!c || !c.winners?.length) return err(400, 'Nothing to undo.');
        if (c.gameMode === 'banker') return err(400, 'Elite Banker results can\u2019t be voided here.');
        const w = c.winners.pop(); voidProof(c, w.ticket, str(b.reason, 120) || 'Draw undone by the host', admin.email);
        if (w.ticketsGiven) { const po = db.orders.find(x => x.ref === w.ticketsGiven.ref); if (po && po.status === 'confirmed') { po.status = 'cancelled'; po.cancelReason = 'voided win'; const tc = db.comps.find(x => x.id === po.items[0].compId); if (tc) refreshComp(db, tc); } }
        else if (w.credited && w.userId) { const wu = db.users.find(x => x.id === w.userId); if (wu) { if (w.paidTo === 'credit') addCredit(wu, -w.amount, 'void', `Voided win: ${c.title}`); else credit(wu, -w.amount, 'void', `Voided win: ${c.title}`); } }
        c.status = c.winners.length ? 'drawing' : (stats(db, c).confirmed >= c.totalTickets ? 'soldout' : 'ended');
        c.drawnAt = null;
        log('voided draw', `${c.title} – ${w.prize}: #${w.ticket} ${w.name} (reason: ${str(b.reason, 120) || 'none given'})`);
        return ok({ ok: true });
      }

      // ---- settings / misc ----
      if ((m = /^\/api\/admin\/comps\/([a-f0-9]{16})\/donation$/.exec(p)) && M === 'POST') {
        const c = db.comps.find(x => x.id === m[1]); if (!c) return err(404, 'Not found.');
        if (!c.charityName || !c.charityAmount) return err(400, 'Add a charity and amount to this competition first.');
        const photo = str(b.photo, 3_000_000);
        if (photo && !/^(\/uploads\/[a-f0-9]+\.(jpg|png|webp)|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+|[a-z0-9_-]+\.(jpg|jpeg|png|webp|svg))$/i.test(photo)) return err(400, 'Photo is not valid – upload it again.');
        c.charityPaid = !!b.paid; c.charityPhoto = photo; c.charityNote = text(b.note, 500);
        c.charityPaidAt = c.charityPaid ? (b.paidAt && Number.isFinite(Date.parse(b.paidAt)) ? iso(Date.parse(b.paidAt)) : c.charityPaidAt || iso(now())) : null;
        log(c.charityPaid ? 'recorded donation' : 'unmarked donation', `${gbp(c.charityAmount)} to ${c.charityName} (${c.title})`);
        return ok({ ok: true });
      }
      if (p === '/api/admin/chat' && M === 'GET') {
        const room = req.query?.get?.('room') === 'live' ? 'live' : 'community';
        return ok({ messages: db.chat.filter(m => m.room === room).slice(-150), mutes: db.mutes || [], live: db.live || { on: false } });
      }
      if (p === '/api/admin/chat' && M === 'POST') {
        const t = str(b.text, 300); if (!t) return err(400, 'Type a message.');
        db.chat.push({ id: newId(), room: b.room === 'live' ? 'live' : 'community', userId: null, staff: true, name: s.siteName, town: '', text: t, at: iso(now()) });
        return ok({ ok: true });
      }
      if ((m = /^\/api\/admin\/chat\/([a-f0-9]{16})$/.exec(p)) && M === 'DELETE') {
        const msg = db.chat.find(x => x.id === m[1]); db.chat = db.chat.filter(x => x.id !== m[1]);
        if (msg) log('deleted chat message', `${msg.name}: ${msg.text.slice(0, 80)}`); return ok({ ok: true });
      }
      if (p === '/api/admin/chat/mute' && M === 'POST') {
        const id = str(b.userId, 20); db.mutes = (db.mutes || []).filter(x => x !== id); if (b.on) db.mutes.push(id);
        const u = db.users.find(x => x.id === id); log(b.on ? 'muted in chat' : 'unmuted in chat', u ? `${u.first} ${u.last}` : id); return ok({ ok: true });
      }
      if (p === '/api/admin/board' && M === 'GET') {
        const bd = db.boards.slice().sort((a, z) => z.createdAt.localeCompare(a.createdAt));
        const cur = bd[0] || null;
        return ok({ boards: bd.map(boardPublic), current: cur ? boardPublic(cur) : null, rows: cur ? boardRows(db, cur).slice(0, 100) : [],
          rewards: (db.refRewards || []).slice().reverse().slice(0, 60).map(x => ({ ...x, referrer: userBrief(db, x.referrerId), friend: userBrief(db, x.friendId) })),
          refReward: s.refReward || 0, refRewardMin: s.refRewardMin || 0,
          bonus: cur ? db.points.filter(x => x.boardId === cur.id && x.status === 'approved').slice(-20).reverse().map(x => ({ ...x, user: userBrief(db, x.userId) })) : [],
          referrers: db.users.map(u => ({ id: u.id, name: `${u.first} ${u.last}`, town: u.address.town, invited: invitedBy(db, u) })).filter(r => r.invited.length).sort((a, z) => z.invited.length - a.invited.length).slice(0, 30) });
      }
      if (p === '/api/admin/board' && M === 'POST') {
        const title = str(b.title, 80), prize = str(b.prize, 80);
        if (!title || !prize) return err(400, 'Give the leaderboard a name and a prize.');
        const startAt = Date.parse(b.startAt) || now(), endAt = Date.parse(b.endAt);
        if (!(endAt > startAt)) return err(400, 'Set an end date after the start.');
        const rules = {}; for (const k of Object.keys(BOARD_RULES)) { const lim = k === 'friendMin' ? 100000 : k === 'boostX' ? 3 : 1000; rules[k] = Math.max(k === 'boostX' ? 1 : 0, Math.min(lim, int(b.rules?.[k]) || 0)); }
        const bF = Date.parse(b.boostFrom || ''), bT = Date.parse(b.boostTo || '');
        let bd = b.id ? db.boards.find(x => x.id === b.id) : null;
        if (!bd) { bd = { id: newId(), createdAt: iso(now()), status: 'live' }; db.boards.forEach(x => { if (x.status === 'live') x.status = 'ended'; }); db.boards.push(bd); }
        Object.assign(bd, { title, prize, startAt: iso(startAt), endAt: iso(endAt), eligibility: b.eligibility === 'kent' ? 'kent' : 'all', rules, boostFrom: rules.boostX > 1 && bT > bF ? iso(bF) : null, boostTo: rules.boostX > 1 && bT > bF ? iso(bT) : null });
        log('saved leaderboard', title); return ok(boardPublic(bd));
      }
      if (p === '/api/admin/board/points' && M === 'POST') {
        const bd = activeBoard(db); if (!bd) return err(400, 'Create a leaderboard first.');
        const u = db.users.find(x => x.id === str(b.userId, 20)); if (!u) return err(404, 'Choose a customer.');
        const pts = Math.max(-5000, Math.min(5000, int(b.pts) || 0)); if (!pts) return err(400, 'Enter the points to add (or minus to take away).');
        db.points.push({ id: newId(), boardId: bd.id, userId: u.id, kind: 'bonus', pts, at: iso(now()), status: 'approved', by: admin.email, note: str(b.note, 140) });
        log('added leaderboard points', `${u.first} ${u.last} ${pts > 0 ? '+' : ''}${pts}${b.note ? ' – ' + str(b.note, 140) : ''}`); return ok({ ok: true });
      }
      if ((m = /^\/api\/admin\/refrewards\/([a-f0-9]{16})\/(pay|reject)$/.exec(p)) && M === 'POST') {
        const x = (db.refRewards || []).find(y => y.id === m[1]); if (!x || x.status !== 'pending') return err(404, 'Not found.');
        const r = db.users.find(y => y.id === x.referrerId), f = db.users.find(y => y.id === x.friendId);
        if (m[2] === 'pay') { if (!r) return err(404, 'Customer not found.'); x.status = 'paid'; addCredit(r, x.amount, 'referral', `Refer a friend: ${f ? f.first : 'friend'}`);
          pushTo(db, sub => sub.userId === r.id, { title: `${gbp(x.amount)} credit added 🎉`, body: `Thanks for inviting ${f ? f.first : 'a friend'}!`, url: '/#account-wins' }); }
        else { x.status = 'rejected'; x.note = str(b.note, 140); }
        x.by = admin.email; x.doneAt = iso(now()); log(m[2] === 'pay' ? 'paid referral reward' : 'rejected referral reward', `${r ? r.first + ' ' + r.last : ''} ${gbp(x.amount)} (friend ${f ? f.first + ' ' + f.last : ''})`); return ok({ ok: true });
      }
      // ---- bank statement upload ----
      if (p === '/api/admin/statement' && M === 'POST') return ok({ rows: matchStatement(db, Array.isArray(b.rows) ? b.rows : []) });
      if (p === '/api/admin/statement/confirm' && M === 'POST') {
        db.stmtSeen = db.stmtSeen || []; const done = [], failed = [];
        for (const x of (Array.isArray(b.items) ? b.items : []).slice(0, 500)) { const o = db.orders.find(y => y.id === x.orderId); if (!o || o.status === 'confirmed') { failed.push(x.orderId); continue; }
          const e = confirmOrder(db, o, admin.email + ' (bank statement)'); if (e) { failed.push(o.ref); continue; } done.push(o.ref); if (x.key) db.stmtSeen.push(String(x.key).slice(0, 400)); }
        if (db.stmtSeen.length > 20000) db.stmtSeen.splice(0, db.stmtSeen.length - 20000);
        log('confirmed orders from bank statement', `${done.length} order${done.length === 1 ? '' : 's'}: ${done.slice(0, 30).join(', ')}`);
        return ok({ done, failed });
      }
      // ---- exports (CSV) ----
      if ((m = /^\/api\/admin\/export\/(entries|summary)$/.exec(p)) && M === 'GET') {
        const q = v => { const t = String(v ?? ''); return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; }, rowsToCsv = r => r.map(x => x.map(q).join(',')).join('\n');
        if (m[1] === 'entries') { const id = String(req.query?.get ? req.query.get('id') : ''), c = db.comps.find(x => x.id === id); if (!c) return err(404, 'Competition not found.');
          const out = [['Ticket', 'Name', 'Town', 'Email', 'Phone', 'Order ref', 'Status', 'Paid', 'Ordered', 'Confirmed']];
          for (const o of db.orders) { if (!['confirmed', 'pending'].includes(o.status)) continue; const it = o.items.find(i => i.compId === c.id); if (!it) continue; const u = o.userId && db.users.find(x => x.id === o.userId), who = entrantOf(db, o);
            for (const t of it.tickets) out.push([t, who.name, who.town, u ? u.email : o.postal?.email || '', u ? u.phone : '', o.ref, o.status, (it.amount / 100).toFixed(2), o.createdAt, o.confirmedAt || '']); }
          out.splice(1, out.length, ...out.slice(1).sort((a, z) => a[0] - z[0]));
          log('exported entries', c.title); return ok({ filename: `entries-${c.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`, csv: rowsToCsv(out) }); }
        const months = new Map(), mk2 = t => String(t).slice(0, 7), get = k => { if (!months.has(k)) months.set(k, { orders: 0, tickets: 0, sales: 0, promo: 0, credit: 0, cash: 0, bank: 0, cashback: 0, instant: 0, withdrawals: 0, players: new Set() }); return months.get(k); };
        for (const o of db.orders) if (o.status === 'confirmed') { const e = get(mk2(o.confirmedAt || o.createdAt)); e.orders++; e.tickets += o.items.reduce((a, i) => a + i.qty, 0); e.sales += o.total; e.promo += o.discount || 0; e.credit += o.credit || 0; e.cash += o.cash || 0; e.bank += (o.due ?? o.total); if (o.userId) e.players.add(o.userId); }
        for (const x of db.levelPayouts || []) get(mk2(x.at)).cashback += x.amount;
        for (const u of db.users) for (const l of u.ledger || []) if (l.type === 'instant') get(mk2(l.at)).instant += l.amount;
        for (const w of db.withdrawals || []) if (w.status === 'paid') get(mk2(w.paidAt || w.at)).withdrawals += w.amount;
        const out = [['Month', 'Orders', 'Tickets', 'Players', 'Sales £', 'Promo discounts £', 'Paid with credit £', 'Paid with cash balance £', 'Paid by bank/card £', 'Cashback given £', 'Instant cash wins £', 'Withdrawals paid £']];
        for (const [k, e] of [...months].sort()) out.push([k, e.orders, e.tickets, e.players.size, ...[e.sales, e.promo, e.credit, e.cash, e.bank, e.cashback, e.instant, e.withdrawals].map(v => (v / 100).toFixed(2))]);
        log('exported monthly summary', ''); return ok({ filename: 'monthly-summary.csv', csv: rowsToCsv(out) });
      }
      // ---- inbox: messages & complaints ----
      if (p === '/api/admin/inbox' && M === 'GET') return ok({ list: (db.messages || []).slice().reverse().map(x => ({ ...x, user: x.userId ? userBrief(db, x.userId) : null })) });
      if ((m = /^\/api\/admin\/inbox\/([a-f0-9]{16})$/.exec(p)) && M === 'POST') {
        const x = (db.messages || []).find(y => y.id === m[1]); if (!x) return err(404, 'Not found.');
        if (b.reply) { const t = text(b.reply, 4000); x.replies.push({ at: iso(now()), by: admin.name || admin.email, text: t });
          queueEmail(db, x.email, `Re: ${x.subject || (x.kind === 'complaint' ? 'Your complaint' : 'Your message')} (${x.ref})`, 'contact-reply', wrapEmail(db, x.kind === 'complaint' ? `Your complaint ${x.ref}` : 'Our reply', `<p>Hi ${esc(x.name)},</p><p>${esc(t).replace(/\n/g, '<br>')}</p>`), `Hi ${x.name},\n\n${t}`);
          if (x.status === 'open') x.status = 'replied'; }
        if (['open', 'replied', 'closed'].includes(b.status)) x.status = b.status;
        if ('note' in b) x.note = text(b.note, 1000);
        log(b.reply ? 'replied to ' + x.kind : 'updated ' + x.kind, x.ref); return ok({ ok: true });
      }
      // ---- promo codes ----
      if (p === '/api/admin/promos' && M === 'GET') {
        const used = new Map(); for (const o of db.orders) if (o.promo && (o.status === 'pending' || o.status === 'confirmed')) { const e = used.get(o.promo) || { uses: 0, given: 0, sales: 0 }; e.uses++; e.given += o.discount || 0; e.sales += o.total; used.set(o.promo, e); }
        return ok({ promos: (db.promos || []).slice().reverse().map(x => ({ ...x, ...(used.get(x.code) || { uses: 0, given: 0, sales: 0 }) })), comps: db.comps.filter(c => c.type === 'paid' && !c.auto && ['live', 'hidden', 'closed'].includes(c.status)).map(c => ({ id: c.id, title: c.title })) });
      }
      if ((m = /^\/api\/admin\/promos(?:\/([a-f0-9]{16}))?$/.exec(p)) && M === 'POST') {
        if (!db.promos) db.promos = [];
        let P = m[1] ? db.promos.find(x => x.id === m[1]) : null; if (m[1] && !P) return err(404, 'Not found.');
        if (P && Object.keys(b).length === 1 && 'active' in b) { P.active = !!b.active; log(P.active ? 'switched on promo code' : 'switched off promo code', P.code); return ok({ ok: true }); }
        const code = str(b.code, 20).toUpperCase().replace(/[^A-Z0-9]/g, ''); if (code.length < 3) return err(400, 'Codes need 3–20 letters or numbers.');
        if (db.promos.some(x => x.code === code && x !== P)) return err(409, 'That code already exists.');
        const type = b.type === 'amount' ? 'amount' : 'percent', value = type === 'percent' ? Math.max(1, Math.min(100, int(b.value) || 0)) : Math.max(1, Math.min(100000, int(b.value) || 0));
        const f = { code, type, value, cap: type === 'percent' ? Math.max(0, int(b.cap) || 0) : 0, minSpend: Math.max(0, int(b.minSpend) || 0), maxUses: Math.max(0, int(b.maxUses) || 0), perUser: Math.max(0, int(b.perUser) || 0),
          newOnly: !!b.newOnly, compIds: (Array.isArray(b.compIds) ? b.compIds : []).filter(id => db.comps.some(c => c.id === id)).slice(0, 50),
          startsAt: b.startsAt && Number.isFinite(Date.parse(b.startsAt)) ? iso(Date.parse(b.startsAt)) : null, endsAt: b.endsAt && Number.isFinite(Date.parse(b.endsAt)) ? iso(Date.parse(b.endsAt)) : null, note: str(b.note, 120) };
        if (P) Object.assign(P, f); else db.promos.push(P = { id: newId(), ...f, active: true, createdAt: iso(now()), by: admin.email });
        log(m[1] ? 'edited promo code' : 'created promo code', `${code} – ${type === 'percent' ? value + '%' : gbp(value)} off`); return ok({ ok: true });
      }
      // ---- charity suggestions & charity list ----
      if (p === '/api/admin/charity' && M === 'GET') {
        const g = new Map(); for (const x of db.charitySugs || []) { const k = x.charity.toLowerCase().replace(/[^a-z0-9]/g, ''); const e = g.get(k) || { key: k, charity: x.charity, count: 0, towns: new Set(), list: [], status: 'new' }; e.count++; e.towns.add(x.town); e.list.push(x); if (x.status && x.status !== 'new') e.status = x.status; g.set(k, e); }
        return ok({ groups: [...g.values()].map(e => ({ ...e, towns: [...e.towns], list: e.list.slice().reverse() })).sort((a, z) => z.count - a.count || z.list[0].at.localeCompare(a.list[0].at)),
          charities: db.charities || [], used: [...new Set(db.comps.filter(c => c.charityName).map(c => c.charityName))] });
      }
      if (p === '/api/admin/charity/status' && M === 'POST') {
        const k = str(b.key, 120), st = ['new', 'shortlisted', 'added', 'declined'].includes(b.status) ? b.status : 'new'; let n = 0;
        for (const x of db.charitySugs || []) if (x.charity.toLowerCase().replace(/[^a-z0-9]/g, '') === k) { x.status = st; n++; }
        if (st === 'added') { const name = str(b.name, 80); if (name && !(db.charities || []).some(c => c.name.toLowerCase() === name.toLowerCase())) (db.charities = db.charities || []).push({ id: newId(), name, town: str(b.town, 60), note: str(b.note, 200), addedAt: iso(now()) }); }
        log('charity suggestion ' + st, str(b.name || k, 80)); return ok({ ok: true, n });
      }
      if (p === '/api/admin/charities' && M === 'POST') {
        const name = str(b.name, 80); if (!name) return err(400, 'Add the charity name.'); db.charities = db.charities || [];
        if (b.remove) { db.charities = db.charities.filter(c => c.name !== name); log('removed charity from list', name); return ok({ ok: true }); }
        if (db.charities.some(c => c.name.toLowerCase() === name.toLowerCase())) return err(409, 'Already on your list.');
        db.charities.push({ id: newId(), name, town: str(b.town, 60), note: str(b.note, 200), addedAt: iso(now()) }); log('added charity to list', name); return ok({ ok: true });
      }
      // ---- per-competition stats ----
      if ((m = /^\/api\/admin\/comps\/([a-f0-9]{16})\/stats$/.exec(p)) && M === 'GET') {
        const c = db.comps.find(x => x.id === m[1]); if (!c) return err(404, 'Not found.');
        let revenue = 0, pendingRev = 0, conf = 0, pend = 0, bonus = 0, discount = 0, credit = 0; const per = new Map();
        for (const o of db.orders) { if (o.status !== 'confirmed' && o.status !== 'pending') continue;
          for (const it of o.items) if (it.compId === c.id) {
            if (o.status === 'confirmed') { revenue += it.amount; conf += it.qty; } else { pendingRev += it.amount; pend += it.qty; }
            bonus += it.bonus || 0; if (o.discount && it.gross) discount += it.gross - it.amount;
            if (o.credit && o.total) credit += Math.round(o.credit * it.amount / o.total);
            const k = o.userId || 'postal:' + (o.postal?.name || o.id); const e = per.get(k) || { userId: o.userId || null, name: '', town: '', tickets: 0, confirmed: 0, spent: 0 };
            e.tickets += it.qty; if (o.status === 'confirmed') { e.confirmed += it.qty; e.spent += it.amount; }
            if (!e.name) { const u = o.userId && db.users.find(x => x.id === o.userId); e.name = u ? `${u.first} ${u.last}` : (o.postal?.name || 'Postal entry'); e.town = u ? u.address.town : (o.postal?.town || ''); }
            per.set(k, e); } }
        const top = [...per.values()].sort((a, z) => z.tickets - a.tickets).slice(0, 10);
        return ok({ revenue, pendingRevenue: pendingRev, confirmed: conf, pending: pend, total: unl(c) ? null : c.totalTickets, players: per.size, bonus, discount, creditUsed: credit, top,
          avg: per.size ? Math.round((conf + pend) / per.size * 10) / 10 : 0 });
      }
      if (p === '/api/admin/board/award' && M === 'POST') {
        const bd = activeBoard(db) || db.boards[db.boards.length - 1]; if (!bd) return err(400, 'No leaderboard.');
        const rows = boardRows(db, bd); if (!rows.length) return err(400, 'Nobody has any points yet.');
        const w = rows[0], u = db.users.find(x => x.id === w.userId);
        bd.status = 'awarded'; bd.winner = { userId: w.userId, name: w.name, town: w.town, points: w.points, at: iso(now()) };
        if (u) { queueEmail(db, u.email, `You won the ${bd.title}! 🏆`, 'board', wrapEmail(db, 'You topped the leaderboard! 🏆', `<p>Hi ${esc(u.first)}, you finished top of the <b>${esc(bd.title)}</b> with ${w.points} points and win <b>${esc(bd.prize)}</b>. We'll be in touch to arrange it.</p>`), `You won ${bd.prize}`);
          pushTo(db, sub => sub.userId === u.id, { title: 'You topped the leaderboard! 🏆', body: `${bd.prize} is yours – well done!`, url: '/#leaderboard' }); }
        log('awarded leaderboard', `${bd.title} → ${w.name} (${w.points} pts)`); return ok(boardPublic(bd));
      }
      if (p === '/api/admin/stage' && M === 'POST') {
        const c = b.compId ? db.comps.find(x => x.id === str(b.compId, 20)) : null;
        db.stage = c ? { compId: c.id, at: iso(now()) } : null;
        return ok({ ok: true });
      }
      if (p === '/api/admin/withdrawals' && M === 'GET') {
        return ok(db.withdrawals.map(w => { const u = db.users.find(x => x.id === w.userId); return { ...w, name: u ? `${u.first} ${u.last}` : '—', email: u?.email, idStatus: u?.idStatus || 'none', payoutName: u?.payout?.name || '', payoutLast4: u?.payout?.last4 || '' }; }));
      }
      if ((m = /^\/api\/admin\/withdrawals\/([a-f0-9]{16})\/(paid|reject)$/.exec(p)) && M === 'POST') {
        const w = db.withdrawals.find(x => x.id === m[1]); if (!w || w.status !== 'pending') return err(400, 'Withdrawal not found or already handled.');
        const u = db.users.find(x => x.id === w.userId);
        if (m[2] === 'paid') { w.status = 'paid'; w.paidAt = iso(now()); w.by = admin.email; if (u) { queueEmail(db, u.email, 'Your withdrawal has been paid', 'payout', wrapEmail(db, 'Withdrawal paid 💷', `<p>Hi ${esc(u.first)}, we've sent <b>${gbp(w.amount)}</b> to your bank account ending ${esc(w.payoutLast4 || '')}. It can take up to 2 hours to arrive.</p>`), `We've paid ${gbp(w.amount)} to your account ending ${w.payoutLast4}.`); pushTo(db, x => x.userId === u.id, { title: 'Withdrawal paid 💷', body: `${gbp(w.amount)} is on its way to your bank`, url: '/#account-withdraw' }); } }
        else { w.status = 'rejected'; w.note = str(b.note, 200); if (u) credit(u, w.amount, 'refund', 'Withdrawal returned: ' + (w.note || 'not processed')); }
        log(m[2] === 'paid' ? 'paid withdrawal' : 'rejected withdrawal', `${u ? u.first + ' ' + u.last : ''} ${gbp(w.amount)}`);
        return ok({ ok: true });
      }
      if ((m = /^\/api\/admin\/users\/([a-f0-9]{16})\/payout$/.exec(p)) && M === 'GET') {
        const u = db.users.find(x => x.id === m[1]); if (!u || !u.payout) return err(404, 'No payout details saved.');
        log('viewed bank details', `${u.first} ${u.last}`);
        return ok(JSON.parse(await h.decrypt(u.payout.enc)));
      }
      if ((m = /^\/api\/admin\/users\/([a-f0-9]{16})\/iddoc\/(\d+)$/.exec(p)) && M === 'GET') {
        const u = db.users.find(x => x.id === m[1]); const d = u && (u.idDocs || [])[int(m[2])]; if (!d) return err(404, 'Document not found.');
        log('viewed ID document', `${u.first} ${u.last} (${d.kind})`);
        return ok({ dataUrl: await h.readPrivate(db, d.key), kind: d.kind, at: d.at });
      }
      if ((m = /^\/api\/admin\/users\/([a-f0-9]{16})\/identity$/.exec(p)) && M === 'POST') {
        const u = db.users.find(x => x.id === m[1]); if (!u) return err(404, 'Not found.');
        u.idStatus = b.status === 'verified' ? 'verified' : 'rejected'; u.idNote = str(b.note, 200); u.idCheckedBy = admin.email; u.idCheckedAt = iso(now());
        log(u.idStatus === 'verified' ? 'verified ID' : 'rejected ID', `${u.first} ${u.last}${u.idNote ? ' – ' + u.idNote : ''}`);
        queueEmail(db, u.email, u.idStatus === 'verified' ? 'Your identity is verified' : 'We couldn\u2019t verify your ID', 'identity', wrapEmail(db, u.idStatus === 'verified' ? 'Identity verified ✅' : 'ID not verified', u.idStatus === 'verified' ? '<p>Thanks – your identity is verified. You can now withdraw your winnings.</p>' : `<p>We couldn't verify the document you uploaded${u.idNote ? ': ' + esc(u.idNote) : ''}. Please upload a clear photo in My Identity.</p>`), u.idStatus);
        return ok({ ok: true });
      }
      if ((m = /^\/api\/admin\/users\/([a-f0-9]{16})\/strikes$/.exec(p)) && M === 'POST') {
        const u = db.users.find(x => x.id === m[1]); if (!u) return err(404, 'Customer not found.');
        u.strikes = []; if (b.unban) delete u.strikeBanUntil; log(b.unban ? 'cleared strikes and lifted pause' : 'cleared strikes', `${u.first} ${u.last}`); return ok({ ok: true });
      }
      if ((m = /^\/api\/admin\/users\/([a-f0-9]{16})\/credit$/.exec(p)) && M === 'POST') {
        const u = db.users.find(x => x.id === m[1]); if (!u) return err(404, 'Not found.');
        const amount = int(b.amount); if (!amount || Math.abs(amount) > 10000000) return err(400, 'Enter an amount.');
        ensureWallet(u); const cr = b.wallet === 'credit';
        if ((cr ? u.credit : u.balance) + amount < 0) return err(400, `That would make the ${cr ? 'credit' : 'cash'} balance negative.`);
        if (cr) addCredit(u, amount, 'adjustment', str(b.note, 120) || 'Added by us'); else credit(u, amount, 'adjustment', str(b.note, 120) || 'Manual adjustment');
        log(cr ? 'adjusted credit' : 'adjusted balance', `${u.first} ${u.last} ${gbp(amount)}`);
        return ok({ balance: u.balance, credit: u.credit });
      }
      if (p === '/api/admin/app' && M === 'GET') {
        const nm = id => { const u = id && db.users.find(x => x.id === id); return u ? { id: u.id, name: `${u.first} ${u.last}`, town: u.address.town } : null; };
        return ok({ facebookUrl: s.facebookUrl || '', facebookGroupName: s.facebookGroupName || '', installs: db.installs.length, installedUsers: new Set(db.installs.filter(i => i.userId).map(i => i.userId)).size, pushSubs: db.pushSubs.length,
          pushUsers: [...new Set(db.pushSubs.filter(x => x.userId).map(x => x.userId))].map(nm).filter(Boolean),
          recentInstalls: db.installs.slice(-30).reverse().map(i => ({ at: i.at, platform: i.platform, user: nm(i.userId) })), canPush: !!h.sendPush && !!h.vapidPublic });
      }
      if (p === '/api/admin/push' && M === 'POST') {
        const title = str(b.title, 60), body2 = str(b.body, 160);
        const okLink = u => /^\/#?[a-z0-9-]*$/i.test(u || '') || (s.facebookUrl && u === s.facebookUrl) || /^https:\/\/(www\.|m\.|web\.)?(facebook\.com|fb\.watch|fb\.me|fb\.com)\/[^\s"<>]{0,300}$/i.test(u || '');
        if (b.url && !okLink(b.url)) return err(400, 'Links must be a page on this site or a Facebook link.');
        const url = b.url || '/';
        if (!title || !body2) return err(400, 'Enter a title and message.');
        let who = () => true, label = 'everyone';
        if (b.audience === 'entrants') {
          const c = db.comps.find(x => x.id === str(b.compId, 20)); if (!c) return err(400, 'Choose the competition.');
          const ids = new Set(db.orders.filter(o => o.userId && o.status === 'confirmed' && o.items.some(i => i.compId === c.id)).map(o => o.userId));
          who = sub => ids.has(sub.userId); label = 'entrants of ' + c.title;
        }
        const n = pushTo(db, who, { title, body: body2, url });
        if (b.liveAt) {
          const at = Date.parse(b.liveAt); if (!Number.isFinite(at)) return err(400, 'Live time is not valid.');
          const c = b.compId && db.comps.find(x => x.id === b.compId);
          db.nextLive = { at: iso(at), title: str(b.liveTitle, 80) || (c ? c.title : 'Live draw'), link: url, compId: c ? c.id : null };
          if (b.remind && at > now() + 60000) {
            db.pushQueue = (db.pushQueue || []).filter(q => q.kind !== 'live-reminder');
            db.pushQueue.push({ kind: 'live-reminder', at: iso(at), audience: b.audience === 'entrants' ? 'entrants' : 'all', compId: c ? c.id : null,
              payload: { title: '🔴 We\'re LIVE now!', body: `${db.nextLive.title} – the live draw is starting now. Tap to watch!`.slice(0, 160), url } });
          }
        }
        log('sent notification', `${title} → ${n} devices (${label})${b.liveAt ? ' · live ' + b.liveAt : ''}`); return ok({ sent: n });
      }
      if (p === '/api/admin/live' && M === 'POST') {
        const c = b.compId ? db.comps.find(x => x.id === b.compId) : null;
        db.live = { on: !!b.on, compId: c ? c.id : null, at: iso(now()) };
        if (b.on) db.chat.push({ id: newId(), room: 'live', userId: null, staff: true, name: s.siteName, town: '', text: `🔴 We're live! Drawing ${c ? c.title : 'now'} – good luck everyone!`, at: iso(now()) });
        if (b.on) pushTo(db, () => true, { title: '🔴 We\'re live!', body: c ? `Live draw: ${c.title} – join the chat now` : 'Live draw starting now – join the chat', url: c ? '/#comp-' + c.id : '/' });
        log(b.on ? 'went live' : 'ended live draw', c ? c.title : ''); return ok(db.live);
      }
      if (p === '/api/admin/levels' && M === 'GET') {
        const key = monthKey(now()), T = tiers(s);
        const rows = db.users.map(u => { const sp = monthSpend(db, u.id, key), L = levelOf(s, sp); return { id: u.id, name: `${u.first} ${u.last}`, town: u.address.town, spent: sp, level: L ? L.name : null, cashback: L ? Math.floor(sp * L.pct / 100) : 0 }; }).filter(r => r.spent > 0).sort((a, z) => z.spent - a.spent);
        return ok({ on: !!s.levelsOn, tiers: T, month: monthName(key), rows: rows.slice(0, 100), counts: T.map(t => ({ name: t.name, n: rows.filter(r => r.level === t.name).length })), owed: rows.reduce((a, r) => a + r.cashback, 0), creditOut: db.users.reduce((a, u) => a + (u.credit || 0), 0),
          paid: (db.levelPayouts || []).slice(-100).reverse().map(x => ({ ...x, monthName: monthName(x.month), user: userBrief(db, x.userId) })) });
      }
      if (p === '/api/admin/settings' && M === 'GET') { const { dna, ...rest } = s; return ok({ ...rest, dnaConfigured: dnaKeysSet(s), dnaFromEnv: !!h.dnaEnv, cardLive: cardLive(s) }); }
      // ---- DNA Payments keys (owner only). The secret is encrypted at rest and never sent back to the browser.
      if (p === '/api/admin/hold' && M === 'GET') return ok({ waiting: db.users.filter(u => u.holdNotify).length, defaults: HOLD_DEFAULTS });
      if (p === '/api/admin/hold/preview' && M === 'POST') {
        const token = [...h.rand(18)].map(x => x.toString(16).padStart(2, '0')).join(''); db.holdPasses = (db.holdPasses || []).filter(x => Date.parse(x.exp) > now()).slice(-20);
        db.holdPasses.push({ token, exp: iso(now() + 12 * 3600e3) }); return ok({ ok: true }, { setPreview: token });
      }
      if (p === '/api/admin/jackpot' && M === 'GET') {
        await jpCommit(db); const J = db.jackpot || { history: [], round: null }, R = J.round;
        const T = R ? jpTickets(db, R.id) : [];
        return ok({ on: jpOn(s), round: R ? { n: R.n, startedAt: R.startedAt, pot: R.pot, seed: R.seed, cap: R.cap, min: R.min, added: R.added, orders: R.orders, entries: T.length, commit: R.commit } : null,
          history: (J.history || []).slice(0, 50).map(x => ({ ...x, salt: undefined })), settings: { pct: s.jackpotPct, seed: s.jackpotSeed, min: s.jackpotMin, cap: s.jackpotCap, pay: s.jackpotPay } }, { dirty: true });
      }
      if (p === '/api/admin/jackpot/topup' && M === 'POST') {
        const J = db.jackpot; if (!jpOn(s) || !J || !J.round) return err(400, 'Switch the jackpot on first.');
        const amt = Math.round(Number(b.amount) * 100); if (!(amt > 0) || amt > 100000) return err(400, 'Enter an amount between £0.01 and £1,000.');
        J.round.pot += amt; J.round.topups = (J.round.topups || 0) + amt; log('jackpot top-up', gbp(amt)); if (J.round.pot >= J.round.dropAt) jpDrop(db);
        return ok({ ok: true, pot: db.jackpot.round.pot });
      }
      if (p === '/api/admin/jackpot/paid' && M === 'POST') {
        const x = ((db.jackpot || {}).history || []).find(h0 => h0.round === int(b.round)); if (!x) return err(404, 'Round not found.');
        x.manualPaid = iso(now()); log('jackpot paid by hand', `Round ${x.round} – ${x.name} ${gbp(x.amount)}`); return ok({ ok: true });
      }
      if (p === '/api/admin/dna' && M === 'GET') {
        if (roleOf(admin) !== 'owner') return err(403, 'Only an owner can see payment keys.');
        const d = s.dna || {}; return ok({ fromEnv: !!h.dnaEnv, clientId: d.clientId || '', terminalId: d.terminalId || '', secretSet: !!d.secretEnc, secretHint: d.secretHint || '', test: d.test !== false, savedAt: d.savedAt || null, testedAt: d.testedAt || null, testOk: d.testOk ?? null, cardPayments: !!s.cardPayments, live: cardLive(s) });
      }
      if (p === '/api/admin/dna' && M === 'POST') {
        if (roleOf(admin) !== 'owner') return err(403, 'Only an owner can change payment keys.');
        const d = { ...(s.dna || {}) };
        if (b.clear) { delete s.dna; s.cardPayments = false; log('removed DNA Payments keys', 'card payments switched off'); return ok({ ok: true }); }
        if ('clientId' in b) d.clientId = str(b.clientId, 120); if ('terminalId' in b) d.terminalId = str(b.terminalId, 60); if ('test' in b) d.test = b.test !== false;
        if (b.secret) { const sec = String(b.secret).trim().slice(0, 300); d.secretEnc = await h.encrypt(sec); d.secretHint = '••••' + sec.slice(-4); }
        d.savedAt = iso(now()); d.testOk = null; s.dna = d; if ('cardPayments' in b) s.cardPayments = !!b.cardPayments && dnaKeysSet(s);
        log('updated DNA Payments keys', `${d.test !== false ? 'TEST' : 'LIVE'} terminal ${d.terminalId || '—'}${'cardPayments' in b ? ' · card payments ' + (s.cardPayments ? 'ON' : 'off') : ''}`);
        return ok({ ok: true, live: cardLive(s) });
      }
      if (p === '/api/admin/dna/test' && M === 'POST') {
        if (roleOf(admin) !== 'owner') return err(403, 'Only an owner can test payment keys.');
        if (!dnaKeysSet(s) || !h.dnaTest) return err(400, 'Add your DNA keys first.');
        let okT = false, why = ''; try { okT = await h.dnaTest(await dnaConfig(db)); } catch (e) { why = String(e.message || e).slice(0, 120); }
        if (s.dna) { s.dna.testedAt = iso(now()); s.dna.testOk = okT; } log('tested DNA Payments connection', okT ? 'OK' : 'failed ' + why);
        return okT ? ok({ ok: true }) : err(400, `DNA didn't accept these keys${why ? ' (' + why + ')' : ''}. Check the Client ID, Secret, Terminal ID and test/live setting.`);
      }
      if (p === '/api/admin/settings' && M === 'POST') {
        if ('termsFull' in b) s.termsFull = text(b.termsFull, 30000);
        if ('privacyPolicy' in b) s.privacyPolicy = text(b.privacyPolicy, 30000);
        const keys = ['siteName', 'tagline', 'siteUrl', 'emailFrom', 'contactEmail', 'bankName', 'accountName', 'sortCode', 'accountNumber', 'postalAddress', 'facebookUrl', 'facebookGroupName'];
        for (const k of keys) if (k in b) s[k] = str(b[k], 300);
        if (s.facebookUrl && !/^https:\/\//.test(s.facebookUrl)) return err(400, 'Facebook link must start with https://');
        if (s.siteUrl && !/^https?:\/\//.test(s.siteUrl)) return err(400, 'Site address must start with https://');
        if ('terms' in b) s.terms = text(b.terms, 8000);
        if ('reservationHours' in b) s.reservationHours = Math.min(336, Math.max(1, int(b.reservationHours) || 12));
        if ('cardPayments' in b) s.cardPayments = (b.cardPayments === true || b.cardPayments === 'true' || b.cardPayments === 'on') && dnaKeysSet(s);
        if ('eliteWeekly' in b) s.eliteWeekly = !!b.eliteWeekly;
        if ('eliteWeeklyPrize' in b) s.eliteWeeklyPrize = str(b.eliteWeeklyPrize, 60) || '£50 Cash';
        if ('eliteWeeklyMin' in b) s.eliteWeeklyMin = Math.max(0, int(b.eliteWeeklyMin) || 0);
        if ('refReward' in b) { const v = Math.max(0, Math.min(10000, int(b.refReward) || 0)); if (v > 0 && !(s.refReward > 0)) s.refRewardFrom = iso(now()); s.refReward = v; }
        if ('gameSeason' in b && DEFAULT_THEMES[b.gameSeason]) s.gameSeason = b.gameSeason;
        if (b.gameThemes && typeof b.gameThemes === 'object') { const out = {}; const col = v => /^#[0-9a-f]{6}$/i.test(String(v)) ? String(v) : null;
          for (const k of Object.keys(DEFAULT_THEMES)) { const t = b.gameThemes[k]; if (!t || typeof t !== 'object') continue; const o = {};
            for (const f of ['c1', 'c2', 'bg', 'accent', 'win', 'keeper', 'kit']) { const v = col(t[f]); if (v) o[f] = v; }
            for (const f of ['name', 'title', 'lose']) if (t[f] != null) o[f] = str(t[f], 40);
            for (const f of ['particles', 'fill']) if (t[f] != null) o[f] = String(t[f]).split(',').map(iwIcon).filter(Boolean).slice(0, 10).join(',');
            for (const f of ['pinata', 'ball']) if (t[f] != null) o[f] = iwIcon(t[f]);
            if (['classic', 'xmas', 'spooky', 'party'].includes(t.deco)) o.deco = t.deco;
            out[k] = o; }
          s.gameThemes = { ...(s.gameThemes || {}), ...out }; }
        if ('jackpotOn' in b) s.jackpotOn = !!b.jackpotOn; if ('jackpotPct' in b) s.jackpotPct = Math.max(0, Math.min(20, Math.round((Number(b.jackpotPct) || 0) * 100) / 100));
        if ('jackpotSeed' in b) s.jackpotSeed = Math.max(0, Math.min(100000, int(b.jackpotSeed) || 0)); if ('jackpotPay' in b) s.jackpotPay = b.jackpotPay === 'cash' ? 'cash' : 'credit';
        if ('jackpotCap' in b) s.jackpotCap = Math.max(500, Math.min(1000000, int(b.jackpotCap) || 25000)); if ('jackpotMin' in b) s.jackpotMin = Math.max(0, Math.min(s.jackpotCap - 100, int(b.jackpotMin) || 0));
        if (['jackpotOn', 'jackpotPct', 'jackpotSeed', 'jackpotCap', 'jackpotMin', 'jackpotPay'].some(k => k in b)) jackpotSweep(db);
        if ('postalOn' in b) s.postalOn = !!b.postalOn;
        if ('holdMode' in b) s.holdMode = ['launch', 'maintenance', 'upgrade'].includes(b.holdMode) ? b.holdMode : 'launch';
        if ('holdTitle' in b) s.holdTitle = str(b.holdTitle, 80); if ('holdText' in b) s.holdText = text(b.holdText, 600); if ('holdAuto' in b) s.holdAuto = !!b.holdAuto;
        if ('holdAt' in b) { const t0 = Date.parse(b.holdAt); s.holdAt = b.holdAt && !isNaN(t0) ? new Date(t0).toISOString() : ''; }
        if ('holdOn' in b) { if (b.holdOn) s.holdOn = true; else openSite(db, admin.email); }
        if ('dcmsCode' in b) s.dcmsCode = !!b.dcmsCode; if ('strikesOn' in b) s.strikesOn = !!b.strikesOn; if ('strikeLimit' in b) s.strikeLimit = Math.max(1, Math.min(20, int(b.strikeLimit) || 5)); if ('strikeBanDays' in b) s.strikeBanDays = Math.max(1, Math.min(365, int(b.strikeBanDays) || 7)); if ('strikeExpiryDays' in b) s.strikeExpiryDays = Math.max(7, Math.min(730, int(b.strikeExpiryDays) || 90)); if ('quickAddTarget' in b) s.quickAddTarget = Math.max(100, Math.min(10000, int(b.quickAddTarget) || 750)); if ('bankDiscount' in b) s.bankDiscount = Math.max(0, Math.min(20, Math.round((Number(b.bankDiscount) || 0) * 100) / 100)); if ('uniquePence' in b) s.uniquePence = !!b.uniquePence;
        if ('birthdayOn' in b) s.birthdayOn = !!b.birthdayOn; if ('remindersOn' in b) s.remindersOn = !!b.remindersOn;
        if ('birthdayCredit' in b) s.birthdayCredit = Math.max(0, Math.min(2000, int(b.birthdayCredit) || 0));
        if ('levelsOn' in b) { s.levelsOn = !!b.levelsOn; if (s.levelsOn && !s.levelsFrom) s.levelsFrom = iso(now()); }
        if (Array.isArray(b.levels)) s.levels = b.levels.slice(0, 6).map(x => ({ name: str(x.name, 20) || 'Level', min: Math.max(0, Math.min(10000000, int(x.min) || 0)), pct: Math.max(0, Math.min(20, Number(x.pct) || 0)) })).filter(x => x.min > 0 && x.pct > 0);
        if ('refRewardMin' in b) s.refRewardMin = Math.max(0, Math.min(100000, int(b.refRewardMin) || 0));
        if ('eliteWeeklyMethod' in b) s.eliteWeeklyMethod = DRAW_METHODS.includes(b.eliteWeeklyMethod) ? b.eliteWeeklyMethod : 'lms';
        if ('categories' in b) s.categories = String(b.categories).split(/\n|,/).map(x => str(x, 40)).filter(Boolean).slice(0, 30);
        log('updated settings'); return ok(s);
      }
      if (p === '/api/admin/emails' && M === 'GET') return ok(db.emails.slice(0, 200));
      if (p === '/api/admin/audit' && M === 'GET') return ok(db.audit.slice(0, 300));
      return err(404, 'Not found');
    }

    function reallocate(db, o) {
      for (const it of o.items) {
        const c = db.comps.find(x => x.id === it.compId);
        if (!c || ['drawing', 'drawn'].includes(c.status)) return `${it.title} has already been drawn – refund this customer.`;
        const held = holdings(db, c.id);
        if (it.tickets.every(t => !held.has(t))) continue;
        const fresh = allocate(db, c, it.qty);
        if (!fresh) return `Not enough tickets left in ${it.title} – refund this customer.`;
        it.tickets = fresh;
      }
      return null;
    }
    // how a win is paid out automatically: 'cash' (withdrawable), 'credit' (spend-only) or 'none' (arranged by hand)
    const payOf = c => c.prizePay || (c.cashPrize ? 'cash' : 'none');
    const GAME_LABEL = { duck: 'Duck race', race: 'Race Around Sheppey', banker: 'Elite Banker' };
    function recordWin(db, c, g, ticket, extra, admin) {
      const prizes = c.prizes.length ? c.prizes : [c.title];
      const idx = c.winners.length;
      const w = Object.assign({ prize: prizes[idx], prizeIndex: idx, ticket, userId: g.userId, orderRef: g.ref, name: g.name, town: g.town, at: iso(now()), by: admin.email }, extra);
      if (!w.amount && (payOf(c) === 'cash' || payOf(c) === 'credit')) w.amount = parsePence(w.prize);
      c.winners.push(w);
      c.status = c.winners.length >= prizes.length ? 'drawn' : 'drawing';
      if (c.status === 'drawn') c.drawnAt = iso(now());
      w.email = g.email || '';
      if (w.revealAt && Date.parse(w.revealAt) > now()) w.notifyPending = true; else finishWin(db, c, w);
      return w;
    }
    // a prize of free tickets: a confirmed £0 order in the chosen competition, in the winner's name
    function giveTickets(db, c, w, wu) {
      if (w.ticketsGiven || w.ticketsProblem) return;
      const tc = db.comps.find(x => x.id === c.prizeTicketsComp), want = c.prizeTicketsQty || 0;
      if (!tc || tc.status !== 'live' || !want) { w.ticketsProblem = `${tc ? tc.title + ' isn’t open' : 'The competition no longer exists'} – give the ${want} tickets by hand.`; return; }
      const av = stats(db, tc).available, qty = av === null ? want : Math.min(want, av);
      if (!qty) { w.ticketsProblem = `${tc.title} has sold out – give the winner something else.`; return; }
      const tickets = allocate(db, tc, qty), name = String(w.name || '').split(' ');
      const o = { id: newId(), ref: newRef(db), userId: wu ? wu.id : null, source: 'prize', status: 'confirmed', total: 0, createdAt: iso(now()), confirmedAt: iso(now()), confirmedBy: `Prize – ${c.title}`,
        items: [{ compId: tc.id, title: tc.title, qty, unit: 0, amount: 0, tickets }], prizeOf: { compId: c.id, title: c.title, ticket: w.ticket } };
      if (!wu) o.postal = { first: name[0] || 'Winner', last: name.slice(1).join(' ') || '-', town: w.town || '', email: w.email || '' };
      db.orders.push(o); refreshComp(db, tc);
      w.ticketsGiven = { compId: tc.id, title: tc.title, qty, ref: o.ref, first: tickets[0], last: tickets[tickets.length - 1] }; w.paidTo = 'tickets'; w.credited = true;
      if (qty < want) w.ticketsProblem = `Only ${qty} of ${want} tickets were left in ${tc.title} – make up the difference by hand.`;
      jackpotSweep(db);
    }
    function finishWin(db, c, w) {
      const wu = w.userId ? db.users.find(x => x.id === w.userId) : null;
      if (payOf(c) === 'tickets') giveTickets(db, c, w, wu);
      // paid when the reveal / race animation has finished (finishWin runs then)
      if (wu && payOf(c) !== 'none' && w.amount && !w.credited) { if (payOf(c) === 'credit') { addCredit(wu, w.amount, 'win', `${c.title} – ${w.prize}`); w.paidTo = 'credit'; } else { credit(wu, w.amount, 'win', `${c.title} – ${w.prize}`); w.paidTo = 'cash'; } w.credited = true; }
      if (wu) emailWinner(db, wu.email, wu.first, c, w); else if (w.email) emailWinner(db, w.email, w.name.split(' ')[0], c, w);
      if (wu) pushTo(db, sub => sub.userId === wu.id, { title: 'You\'ve won! 🏆', body: w.ticketsGiven ? `${w.ticketsGiven.qty} free tickets in ${w.ticketsGiven.title} – from ticket #${w.ticket} in ${c.title}` : `${w.prize} in ${c.title} – ticket #${w.ticket}`, url: '/#account-wins' });
    }
    const raceDur = (mode, laps) => mode === 'race' ? 6000 + laps * 13000 : 2000 + laps * 15000;
    const BK_FRACS = [0.002, 0.005, 0.01, 0.02, 0.03, 0.05, 0.075, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1];
    const BK_ROUNDS = [5, 3, 3, 3, 3, 3], BK_FACTOR = [0.3, 0.45, 0.6, 0.72, 0.84, 0.95];
    const niceP = v => v < 100 ? Math.max(1, Math.round(v / 5) * 5) : v < 1000 ? Math.round(v / 25) * 25 : Math.round(v / 50) * 50;
    function bankerValues(max) {
      const out = [];
      for (const f of BK_FRACS.slice(0, -1)) { let v = niceP(max * f); while (out.includes(v)) v += v < 100 ? 5 : v < 1000 ? 25 : 50; out.push(Math.min(v, max - 1)); }
      out.push(max); return out;
    }
    // ---------- progressive jackpot ----------
    // A % of the money paid on every confirmed order goes into the pot. Each round has a secret drop point between the
    // minimum and the "must drop by" cap, picked at random when the round starts and committed to with a hash.
    // When the pot reaches it, one confirmed ticket bought (or entered free by post) during the round wins.
    // with postal entry switched off, take its section and mentions out of the full terms the site shows
    const noPostal = t => String(t || '').replace(/\n?#+\s*Free postal entry[\s\S]*?(?=\n#+\s|$)/i, '').replace(/,? or for free using our postal route \(below\)/i, '');
    // ---------- holding page: launch countdown / maintenance / switching to cards ----------
    const HOLD_DEFAULTS = { launch: ['WE’RE LAUNCHING SOON', 'Register now so you’re ready to play the second we open – and download the app so you never miss a draw.'],
      maintenance: ['UNDER MAINTENANCE', 'We’re making a few improvements behind the scenes. We’ll be back very shortly – register or download the app and we’ll tell you the moment we’re back.'],
      upgrade: ['BRINGING NEW THINGS', 'We’re switching on card payments and instant wins! Back very soon – register or download the app and we’ll tell you the moment we’re back.'] };
    const holdAllowed = (M, p) => (M === 'GET' && (p === '/api/site' || p === '/api/me' || p === '/api/push/key')) || /^\/api\/auth\//.test(p) || p === '/api/hold/notify' || /^\/api\/push\//.test(p);
    const holdPass = (db, tok) => !!(tok && (db.holdPasses || []).some(x => x.token === tok && Date.parse(x.exp) > now()));
    const holdView = (db, req) => { const s = db.settings, pass = holdPass(db, req.previewToken); if (!s.holdOn && !pass) return null; const mode = HOLD_DEFAULTS[s.holdMode] ? s.holdMode : 'launch';
      return { mode, title: s.holdTitle || HOLD_DEFAULTS[mode][0], text: s.holdText || HOLD_DEFAULTS[mode][1], at: s.holdAt || null, auto: !!s.holdAuto, previewing: pass, off: !s.holdOn }; };
    function openSite(db, by) {
      const s = db.settings; if (!s.holdOn) return false; const mode = s.holdMode; s.holdOn = false; let n = 0;
      for (const u of db.users) { if (!u.holdNotify) continue; u.holdNotify = false; n++;
        const t = mode === 'launch' ? '🚀 We’re live!' : '✅ We’re back!', body = mode === 'launch' ? 'Sheppey Elite Raffles is open – the first prizes are waiting for you.' : mode === 'upgrade' ? 'Card payments and instant wins are now live – come and play!' : 'Everything’s back up and running – come and play!';
        pushTo(db, x => x.userId === u.id, { title: t, body, url: '/#home' });
        queueEmail(db, u.email, t, 'open', wrapEmail(db, t, `<p>Hi ${esc(u.first)},</p><p>${body}</p>`)); }
      db.audit.unshift({ at: iso(now()), adminId: null, who: by || 'system', ip: '', action: 'opened the site', detail: `${n} people notified` }); return true;
    }
    const jpOn = s => !!s.jackpotOn && Number(s.jackpotCap) > 0;
    function jpStart(db, carry = 0) {
      const s = db.settings, J = db.jackpot = db.jackpot || { rounds: 0, history: [], round: null };
      const seed = Math.max(0, int(s.jackpotSeed) || 0) + Math.max(0, carry), cap = Math.max(100, int(s.jackpotCap) || 25000), lo = Math.min(cap, Math.max(seed + 1, int(s.jackpotMin) || 0));
      const dropAt = lo + h.randInt(cap - lo + 1), salt = [...h.rand(12)].map(b => b.toString(16).padStart(2, '0')).join('');
      J.rounds++; J.round = { id: 'J' + J.rounds, n: J.rounds, startedAt: iso(now()), pot: seed, seed, cap, min: lo, dropAt, salt, commit: null, orders: 0, added: 0 };
      return J.round;
    }
    const jpTickets = (db, rid) => { const T = []; for (const o of db.orders) { if (o.jp !== rid || o.status !== 'confirmed') continue;
      for (const it of o.items) { const c = db.comps.find(x => x.id === it.compId); if (!c || c.type !== 'paid' || c.auto) continue; for (const t of it.tickets || []) T.push({ o, it, c, t }); } }
      return T.sort((a, z) => String(a.o.confirmedAt).localeCompare(String(z.o.confirmedAt)) || a.o.ref.localeCompare(z.o.ref) || a.t - z.t); };
    function jpDrop(db) {
      const s = db.settings, J = db.jackpot, R = J.round, T = jpTickets(db, R.id); if (!T.length) return false; // nobody to win yet – it drops on the next confirmed order
      const k = h.randInt(T.length), w = T[k], amt = R.dropAt, u = w.o.userId && db.users.find(x => x.id === w.o.userId), who = entrantOf(db, w.o), credit = s.jackpotPay !== 'cash';
      if (u) { const note = `💰 Jackpot round ${R.n} – ticket #${w.t} in ${w.c.title}`; if (credit) addCredit(u, amt, 'jackpot', note); else credit_(u, amt, 'jackpot', note);
        u.jackpotWin = { amount: amt, round: R.n, ticket: w.t, comp: w.c.title, credit, at: iso(now()) };
        pushTo(db, x => x.userId === u.id, { title: '💰 YOU WON THE JACKPOT!', body: `${gbp(amt)} – ticket #${w.t} in ${w.c.title}`, url: '/#jackpot' });
        queueEmail(db, u.email, `💰 You’ve won the ${gbp(amt)} jackpot!`, 'jackpot', wrapEmail(db, '💰 Jackpot winner!', `<p>Hi ${esc(u.first)}, the Sheppey Elite jackpot just dropped – and your ticket <b>#${w.t}</b> in <b>${esc(w.c.title)}</b> won it!</p><p><b>${gbp(amt)}</b> has been added to your ${credit ? 'site credit' : 'cash balance'}.</p>`)); }
      pushTo(db, x => !u || x.userId !== u.id, { title: '💰 The jackpot just dropped!', body: `${who.name}${who.town ? ' from ' + who.town : ''} won ${gbp(amt)}. A new pot is growing now…`, url: '/#jackpot' });
      J.history.unshift({ round: R.n, amount: amt, at: iso(now()), startedAt: R.startedAt, name: who.name, town: who.town || '', userId: u ? u.id : null, ticket: w.t, compId: w.c.id, comp: w.c.title, orderRef: w.o.ref,
        entries: T.length, pick: k + 1, orders: R.orders, commit: R.commit, salt: R.salt, dropAt: R.dropAt, pay: credit ? 'credit' : 'cash', manual: !u });
      if (J.history.length > 100) J.history.length = 100;
      const carry = R.pot - R.dropAt; jpStart(db, carry); return true;
    }
    function jackpotSweep(db) {
      const s = db.settings; let d = false;
      if (!jpOn(s)) { for (const o of db.orders) if (o.status === 'confirmed' && !o.jp) { o.jp = 'off'; d = true; } return d; }
      if (!db.jackpot || !db.jackpot.round) { jpStart(db); for (const o of db.orders) if (o.status === 'confirmed' && !o.jp) o.jp = 'pre'; return true; }
      const R = db.jackpot.round;
      for (const o of db.orders) { if (o.status !== 'confirmed' || o.jp) continue; o.jp = R.id; d = true; const add = Math.floor(paidAmt(o) * Math.max(0, Number(s.jackpotPct) || 0) / 100);
        if (add > 0) { R.pot += add; R.added += add; R.orders++; o.jpAdd = add; } }
      if (db.jackpot.round.pot >= db.jackpot.round.dropAt && jpDrop(db)) d = true;
      return d;
    }
    async function jpCommit(db) { const R = db.jackpot && db.jackpot.round; if (R && !R.commit) { R.commit = await h.sha(`${R.dropAt}:${R.salt}`); return true; } return false; }
    const jpPublic = db => { const s = db.settings, J = db.jackpot; if (!jpOn(s) || !J || !J.round) return null; const R = J.round, L = J.history[0];
      return { pot: R.pot, cap: R.cap, pct: Number(s.jackpotPct) || 0, round: R.n, startedAt: R.startedAt, commit: R.commit, pay: s.jackpotPay === 'cash' ? 'cash' : 'credit',
        last: L ? { amount: L.amount, at: L.at, name: L.name, town: L.town, ticket: L.ticket, comp: L.comp, round: L.round } : null,
        recent: J.history.slice(0, 12).map(x => ({ amount: x.amount, at: x.at, name: x.name, town: x.town })) }; };
    function confirmOrder(db, o, by) {
      if (o.status !== 'pending') { const e = reallocate(db, o); if (e) return e; }
      o.status = 'confirmed'; o.confirmedAt = iso(now()); o.confirmedBy = by; clearStrike(db, o); jackpotSweep(db);
      const u = o.userId ? db.users.find(x => x.id === o.userId) : null;
      if (u) { emailConfirmed(db, u, o); pushTo(db, x => x.userId === u.id, { title: 'Entries confirmed ✅', body: `Payment received for ${o.ref} – good luck!`, url: '/#account-tickets' }); }
      return null;
    }
    // ---------- bank statement matching ----------
    const refIn = t => { const out = new Set(); const T = String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, ' '); for (const m of T.matchAll(/S\s?E\s?([A-Z0-9](?:\s?[A-Z0-9]){5})/g)) out.add('SE' + m[1].replace(/\s/g, '')); return [...out]; };
    function matchStatement(db, rows) {
      db.stmtSeen = db.stmtSeen || [];
      return rows.slice(0, 3000).map(r => {
        const amount = Math.round(Number(r.amount) || 0), text = String(r.text || '').slice(0, 300), date = String(r.date || '').slice(0, 30), key = `${date}|${text}|${amount}`;
        const row = { date, text, amount, key, seen: db.stmtSeen.includes(key) };
        if (amount <= 0) return { ...row, kind: 'skip' };
        const refs = refIn(text), byRef = db.orders.filter(o => refs.includes(o.ref));
        const pick = byRef.find(o => o.status === 'pending' || o.status === 'expired') || byRef[0];
        const view = o => ({ orderId: o.id, ref: o.ref, due: o.due ?? o.total, status: o.status, name: entrantOf(db, o).name, at: o.createdAt });
        if (pick) { const due = pick.due ?? pick.total;
          return { ...row, ...view(pick), kind: pick.status === 'confirmed' ? 'done' : amount === due ? 'exact' : amount > due ? 'over' : 'under' }; }
        const same = db.orders.filter(o => o.status === 'pending' && (o.due ?? o.total) === amount);
        if (same.length === 1) return { ...row, ...view(same[0]), kind: 'amount' };
        return { ...row, kind: 'none', candidates: same.length };
      });
    }
    // ---------- reminders, favourites alerts, birthdays ----------
    function nudges(db) {
      const s = db.settings, t = now(); let d = false; if (s.remindersOn === false) return false;
      const hasPush = uid => db.pushSubs.some(x => x.userId === uid);
      for (const o of db.orders) { // unpaid order about to expire
        if (o.status !== 'pending' || o.remind1 || !o.userId || !o.expiresAt || (o.due ?? o.total) <= 0) continue;
        const left = Date.parse(o.expiresAt) - t; if (left > 2 * HOUR || left < 5 * 60e3) continue;
        o.remind1 = true; d = true; const u = db.users.find(x => x.id === o.userId); if (!u) continue;
        pushTo(db, x => x.userId === u.id, { title: '⏳ Your tickets are still reserved', body: `Pay ${gbp(o.due ?? o.total)} with reference ${o.ref} in the next ${Math.round(left / 6e4)} minutes to keep them.`, url: '/#account-tickets' });
        if (!hasPush(u.id)) queueEmail(db, u.email, `Reminder: pay for order ${o.ref} to keep your tickets`, 'remind', wrapEmail(db, 'Your tickets are still reserved', `<p>Hi ${esc(u.first)}, your order <b>${o.ref}</b> expires in about ${Math.round(left / 6e4)} minutes. Pay <b>${gbp(o.due ?? o.total)}</b> using reference <b>${o.ref}</b> to keep your tickets.</p>${bankHtml(db, o.ref, o.due ?? o.total)}`));
      }
      for (const u of db.users) {
        if (u.safe?.excludedUntil && Date.parse(u.safe.excludedUntil) > t) continue;
        // basket left without checking out (push only, once, after 2 hours)
        if (u.basket && !u.basket.reminded && t - Date.parse(u.basket.at) > 2 * HOUR && t - Date.parse(u.basket.at) < 2 * DAY && hasPush(u.id)) {
          u.basket.reminded = true; d = true;
          const ordered = db.orders.some(o => o.userId === u.id && Date.parse(o.createdAt) > Date.parse(u.basket.at));
          const c = db.comps.find(x => x.id === u.basket.items[0].compId && x.status === 'live');
          if (!ordered && c) { const st = stats(db, c); pushTo(db, x => x.userId === u.id, { title: '🛒 Your tickets are waiting', body: `${c.title}${!unl(c) && st.available != null ? ` – only ${st.available} left` : ''}. Finish your entry before it sells out!`, url: '/#comp-' + c.id }); }
        }
        // favourites: nearly sold out / closing within 24h (once each)
        for (const id of u.favs || []) { const c = db.comps.find(x => x.id === id); if (!c || c.status !== 'live') continue; u.favAlert = u.favAlert || {};
          const st = stats(db, c), pct = unl(c) ? 0 : st.pct;
          if (pct >= 90 && !u.favAlert[id + ':90']) { u.favAlert[id + ':90'] = 1; d = true; pushTo(db, x => x.userId === u.id, { title: '❤️ Nearly sold out', body: `${c.title} is ${Math.floor(pct)}% sold – last chance to enter!`, url: '/#comp-' + c.id }); }
          if (c.endsAt && Date.parse(c.endsAt) - t < DAY && Date.parse(c.endsAt) > t && !u.favAlert[id + ':end']) { u.favAlert[id + ':end'] = 1; d = true; pushTo(db, x => x.userId === u.id, { title: '❤️ Closing soon', body: `${c.title} closes ${new Date(c.endsAt).toLocaleString('en-GB', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Europe/London' })}.`, url: '/#comp-' + c.id }); }
        }
        // birthday bonus (once a year, credit)
        if (u.bday && s.birthdayOn && s.birthdayCredit > 0) { const today = new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', timeZone: 'Europe/London' }).split('/').map(Number), yr = new Date(t).getUTCFullYear();
          const [bdD, bdM] = u.bday.split('-').map(Number);
          if (today[0] === bdD && today[1] === bdM && u.bdayYear !== yr && (!u.bdaySetAt || t - Date.parse(u.bdaySetAt) > 30 * DAY)) { u.bdayYear = yr; d = true; addCredit(u, s.birthdayCredit, 'birthday', 'Happy birthday from Sheppey Elite! 🎂');
            pushTo(db, x => x.userId === u.id, { title: `🎂 Happy birthday ${u.first}!`, body: `We’ve added ${gbp(s.birthdayCredit)} credit to your account – have a great day!`, url: '/#account-withdraw' });
            queueEmail(db, u.email, `🎂 Happy birthday, ${u.first}!`, 'birthday', wrapEmail(db, 'Happy birthday! 🎂', `<p>Hi ${esc(u.first)}, happy birthday from everyone at Sheppey Elite! We’ve added <b>${gbp(s.birthdayCredit)} credit</b> to your account to spend on any competition.</p>`)); } }
      }
      return d;
    }
    // badges – worked out from what customers have done (never from how much they spend)
    function badgesOf(db, u) {
      const conf = db.orders.filter(o => o.userId === u.id && o.status === 'confirmed'), comps = new Set(conf.flatMap(o => o.items.map(i => i.compId)));
      const wins = db.comps.reduce((a, c) => a + shownWinners(c).filter(w => w.userId === u.id).length, 0), iw = db.comps.reduce((a, c) => a + (c.iwTickets || []).filter(x => wonShown(x) && x.won.userId === u.id).length, 0);
      const inv = db.users.filter(x => x.referredBy === u.id).length, days = (u.days || []).slice().sort(); let best = days.length ? 1 : 0, run = 1;
      for (let i = 1; i < days.length; i++) { run = Date.parse(days[i]) - Date.parse(days[i - 1]) === DAY ? run + 1 : 1; best = Math.max(best, run); }
      const myOrders = db.orders.filter(o => o.userId === u.id && (o.status === 'confirmed' || o.status === 'pending'));
      const entered = comps.size ? [...comps].map(id => db.comps.find(c => c.id === id)).filter(Boolean) : [];
      const cats = new Set(entered.filter(c => c.type !== 'free').map(c => c.category)), games = new Set(entered.map(c => c.gameMode).filter(g => g && g !== 'standard'));
      const early = conf.some(o => o.items.some(i => { const c = db.comps.find(x => x.id === i.compId); const st = c && (c.goLiveAt || c.createdAt); return st && Date.parse(o.createdAt) - Date.parse(st) < DAY; }));
      const fullHouse = entered.some(c => !unl(c) && ['soldout', 'drawing', 'drawn'].includes(c.status));
      const L1 = [['first', '🎟️', 'First entry', 'Make your first entry', comps.size >= 1], ['five', '🖐️', 'Getting going', 'Enter 5 different competitions', comps.size >= 5],
        ['free', '🎁', 'Freebie', 'Enter a free draw', entered.some(c => c.type === 'free')], ['fav', '❤️', 'Wishlist', 'Save a favourite', (u.favs || []).length >= 1],
        ['app', '📱', 'Insider', 'Turn on notifications', db.pushSubs.some(x => x.userId === u.id)], ['streak3', '📅', 'Hat-trick', 'Log in 3 days in a row', best >= 3],
        ['game', '🦆', 'Game on', 'Enter a live game', games.size >= 1], ['cats3', '🧭', 'Explorer', 'Enter 3 different categories', cats.size >= 3],
        ['friend', '🤝', 'Connector', 'Invite a friend who joins', inv >= 1], ['idv', '🪪', 'Verified', 'Verify your ID', u.idStatus === 'verified'],
        ['early', '🐦', 'Early bird', 'Enter within 24 hours of a launch', early],
        db.settings.birthdayOn ? ['bday', '🎂', 'Party time', 'Add your birthday', !!u.bday] : ['fav3', '💞', 'Collector', 'Save 3 favourites', (u.favs || []).length >= 3]];
      const L2 = [['ten', '🔟', 'Regular', 'Enter 10 different competitions', comps.size >= 10], ['twentyfive', '🎯', 'Committed', 'Enter 25 different competitions', comps.size >= 25],
        ['fifty', '💯', 'Veteran', 'Enter 50 different competitions', comps.size >= 50], ['hundred', '👑', 'Legend', 'Enter 100 different competitions', comps.size >= 100],
        ['win', '🏆', 'Winner', 'Win a prize', wins >= 1], ['win3', '🥇', 'Lucky streak', 'Win 3 prizes', wins >= 3], ['iw', '⚡', 'Lightning', 'Win an instant prize', iw >= 1],
        ['streak7', '🔥', 'On fire', 'Log in 7 days in a row', best >= 7], ['days30', '🗓️', 'Part of the family', 'Visit on 30 different days', days.length >= 30],
        ['five', '👥', 'Ambassador', 'Invite 5 friends who join', inv >= 5], ['allgames', '🎮', 'Games master', 'Enter all 4 live games', games.size >= 4],
        ['full', '🏠', 'Full house', 'Be in a competition that sells out', fullHouse]];
      const got1 = L1.filter(x => x[4]).length, NEED = 8;
      return L1.map(x => [...x, 1]).concat(L2.map(x => [x[0] === 'five' ? 'five2' : x[0], ...x.slice(1), 2])).map(([id, icon, name, how, got, tier]) => ({ id, icon, name, how, got: !!got, tier, locked: tier === 2 && got1 < NEED }));
    }
    // ---------- instant wins ----------
    // Winning ticket numbers are chosen when the prizes are set, sealed (SHA-256 of the list + a secret salt is shown publicly) and revealed once the competition ends.
    async function setInstant(db, c, rows) {
      const list = rows.slice(0, 20).map(r => ({ prize: str(r.prize, 80), cash: Math.max(0, Math.min(10000000, int(r.cash) || 0)), count: Math.max(0, Math.min(500, int(r.count) || 0)), value: Math.max(0, Math.min(10000000, int(r.value) || 0)), icon: iwIcon(r.icon), credit: !!r.credit })).filter(r => r.prize && r.count);
      const key = L => JSON.stringify(L.map(r => [r.prize, r.cash, r.count]));
      if (key(list) === key(c.instant || [])) { list.forEach((r, i) => { c.instant[i].value = r.cash ? 0 : r.value; c.instant[i].icon = r.icon; c.instant[i].credit = r.credit; }); return null; } // only the shown value changed
      list.forEach(r => { if (r.cash) r.value = 0; });
      if ((c.iwTickets || []).some(x => x.won)) return 'Instant wins have already been won in this competition – they can’t be changed now.';
      if (list.length && (unl(c) || !c.totalTickets)) return 'Instant wins need a fixed number of tickets.';
      const total = list.reduce((a, r) => a + r.count, 0); if (total > c.totalTickets / 2) return 'Too many instant wins for the number of tickets.';
      const taken = new Set(); for (const o of db.orders) if (o.status === 'confirmed' || o.status === 'pending') for (const it of o.items) if (it.compId === c.id) it.tickets.forEach(t => taken.add(t));
      const pool = []; for (let t = 1; t <= c.totalTickets; t++) if (!taken.has(t)) pool.push(t);
      if (pool.length < total) return 'Not enough unsold tickets left for that many instant wins.';
      for (let i = pool.length - 1; i > 0; i--) { const j = h.randInt(i + 1); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      let k = 0; c.iwTickets = []; list.forEach((r, i) => { for (let n = 0; n < r.count; n++) c.iwTickets.push({ ticket: pool[k++], i, won: null }); });
      c.iwTickets.sort((a, z) => a.ticket - z.ticket); c.instant = list;
      c.iwSalt = Array.from({ length: 16 }, () => h.randInt(256).toString(16).padStart(2, '0')).join('');
      c.iwHash = list.length ? await h.sha(c.iwTickets.map(x => `${x.ticket}:${list[x.i].prize}`).join(',') + '|' + c.iwSalt) : null; c.iwAt = iso(now());
      return null;
    }
    // instant wins need card payments: with bank transfer only they're frozen; with cards on, orders containing them are card-only
    const dnaKeysSet = s => !!(h.dnaEnv || (s.dna && s.dna.clientId && s.dna.terminalId && s.dna.secretEnc));
    const cardLive = s => !!(s.cardPayments && h.dnaStart && dnaKeysSet(s));
    // keys typed into Admin → Settings → Card payments (secret stored encrypted); env vars on the host win if both are set
    async function dnaConfig(db) { const d = db.settings.dna; if (h.dnaEnv || !d || !d.secretEnc) return null; try { return { id: d.clientId, terminal: d.terminalId, secret: await h.decrypt(d.secretEnc), test: d.test !== false }; } catch { return null; } }
    // payment didn't go through: tickets straight back on sale, any credit/cash returned, customer told
    function failOrder(db, o, reason) {
      if (o.status !== 'pending') return false; o.status = 'cancelled'; o.cancelledAt = iso(now()); o.cancelReason = reason; releaseCredit(db, o, 'payment unsuccessful');
      const u = o.userId && db.users.find(x => x.id === o.userId), n = o.items.reduce((a, i) => a + i.qty, 0);
      if (u) { pushTo(db, x => x.userId === u.id, { title: '❌ Payment unsuccessful', body: `Order ${o.ref} wasn't paid, so your ${n} ticket${n > 1 ? 's have' : ' has'} gone back on sale. You can try again.`, url: '/#account-tickets' });
        queueEmail(db, u.email, `Payment unsuccessful – order ${o.ref}`, 'payfail', wrapEmail(db, 'Payment unsuccessful', `<p>Hi ${esc(u.first)}, your card payment for order <b>${esc(o.ref)}</b> didn't go through, so your ${n} ticket${n > 1 ? 's have' : ' has'} been released back into the competition.${o.credit || o.cash ? ' Any credit or cash balance you used has been returned to your account.' : ''}</p><p>Nothing has been taken. You're welcome to try again – tickets are subject to availability.</p>`)); }
      return true;
    }
    // every ticket in a draw must be paid for: draws and live games wait until no order for this prize is awaiting payment
    function unpaidBlock(db, c) {
      const P = db.orders.filter(o => o.status === 'pending' && o.items.some(i => i.compId === c.id)); if (!P.length) return null;
      const n = P.reduce((a, o) => a + o.items.filter(i => i.compId === c.id).reduce((x, i) => x + i.qty, 0), 0);
      return `${n} ticket${n > 1 ? 's are' : ' is'} still awaiting payment (order${P.length > 1 ? 's' : ''} ${P.slice(0, 5).map(o => o.ref).join(', ')}${P.length > 5 ? '…' : ''}). Only paid tickets can be drawn – confirm or cancel ${P.length > 1 ? 'them' : 'it'} in Orders first.`;
    }
    const hasIW = c => !!(c && (c.iwTickets || []).length);
    const CARD_HOLD = 30 * 60 * 1000;
    const IW_GAMES = ['none', 'plinko', 'wheel', 'scratch', 'slots', 'pinata', 'penalty', 'bingo'];
    const wonShown = x => !!(x.won && !x.won.pending);
    const iwGameOf = c => IW_GAMES.includes(c.iwGame) ? c.iwGame : 'none';
    const DEFAULT_THEMES = {
      standard: { name: 'Standard', c1: '#1f5bff', c2: '#ff1f3d', bg: '#070c20', accent: '#ffd84d', win: '#22d36b', deco: 'classic', title: 'INSTANT WINS', particles: '🎉,✨,💷,⭐', lose: 'Not this time', pinata: '🪅', ball: '', fill: '🍒,🍋,🔔,⭐,💎,7️⃣', keeper: '#ff1f3d', kit: '#1f5bff' },
      christmas: { name: 'Christmas', c1: '#19a35b', c2: '#e3262f', bg: '#06140f', accent: '#ffd84d', win: '#ffd84d', deco: 'xmas', title: 'CHRISTMAS INSTANT WINS', particles: '❄️,🎄,🎁,⭐', lose: 'Ho ho – not this one', pinata: '🎁', ball: '', fill: '🎄,🎅,⛄,🦌,🔔,🍪', keeper: '#e3262f', kit: '#19a35b' },
      halloween: { name: 'Halloween', c1: '#ff7a00', c2: '#8a2be2', bg: '#0c0612', accent: '#ff9f1a', win: '#9bff4d', deco: 'spooky', title: 'SPOOKY INSTANT WINS', particles: '🎃,🦇,👻,🍬', lose: 'Boo – try again', pinata: '🎃', ball: '', fill: '🎃,👻,🦇,🕸️,🍬,💀', keeper: '#8a2be2', kit: '#ff7a00' },
      birthday: { name: 'Birthday', c1: '#ff4fa3', c2: '#3ddbd9', bg: '#120a1c', accent: '#ffd84d', win: '#ffd84d', deco: 'party', title: 'BIRTHDAY INSTANT WINS', particles: '🎈,🎂,🎉,🎁', lose: 'Not this time', pinata: '🪅', ball: '', fill: '🎈,🎂,🎁,🍰,🎉,🧁', keeper: '#3ddbd9', kit: '#ff4fa3' } };
    const themesOf = s => { const T = {}; for (const k of Object.keys(DEFAULT_THEMES)) T[k] = { ...DEFAULT_THEMES[k], ...((s.gameThemes || {})[k] || {}) }; return T; };
    const themeFor = (s, c) => { const T = themesOf(s), k = c && c.iwTheme && T[c.iwTheme] ? c.iwTheme : (T[s.gameSeason] ? s.gameSeason : 'standard'); return { key: k, ...T[k] }; };
    const iwIcon = v => { v = String(v || '').trim(); return /^(\/uploads\/[a-f0-9]+\.(jpg|png|webp)|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+|[a-z0-9_-]+\.(png|jpg|jpeg|webp|svg))$/i.test(v) ? v : [...v].slice(0, 4).join(''); };
    // pay out an instant win (straight away for comps without a game, on reveal / after 24 h for comps with one)
    function payInstant(db, c, x, auto, quiet) {
      const P = c.instant[x.i], u = x.won.userId && db.users.find(z => z.id === x.won.userId), t = x.ticket;
      x.won.pending = false; x.won.revealedAt = iso(now()); if (auto) x.won.autoRevealed = true;
      if (u && P.cash) { if (P.credit) addCredit(u, P.cash, 'instant', `⚡ Instant win: ${P.prize} – ${c.title} #${t}`); else credit(u, P.cash, 'instant', `⚡ Instant win: ${P.prize} – ${c.title} #${t}`); }
      if (u && !quiet) { pushTo(db, sub => sub.userId === u.id, { title: '⚡ INSTANT WIN!', body: `Ticket #${t} won ${P.prize} in ${c.title}!`, url: '/#account-wins' });
        queueEmail(db, u.email, `⚡ You’ve won ${P.prize} instantly!`, 'instant', wrapEmail(db, '⚡ Instant win!', `<p>Hi ${esc(u.first)}, your ticket <b>#${t}</b> in <b>${esc(c.title)}</b> is an instant winner – you’ve won <b>${esc(P.prize)}</b>!${P.cash ? ` We’ve added it to your ${P.credit ? 'credit' : 'cash'} balance.` : ' We’ll be in touch to arrange your prize.'}${auto ? ' (We revealed it for you as it hadn’t been played after 24 hours.)' : ''}</p>`)); }
    }
    // one round-up message for many wins at once (play all / automatic reveal)
    function iwSummary(db, c, u, wins, auto) {
      if (!u || !wins.length) return; const L = new Map(); for (const x of wins) { const P = c.instant[x.i]; L.set(P.prize, (L.get(P.prize) || 0) + 1); }
      const txt = [...L].map(([p, n]) => `${n} × ${p}`).join(', '), cash = wins.reduce((a, x) => a + (c.instant[x.i].credit ? 0 : c.instant[x.i].cash || 0), 0), cr = wins.reduce((a, x) => a + (c.instant[x.i].credit ? c.instant[x.i].cash || 0 : 0), 0);
      pushTo(db, sub => sub.userId === u.id, { title: `⚡ ${wins.length} instant win${wins.length > 1 ? 's' : ''}!`, body: `${txt} in ${c.title}`, url: '/#account-wins' });
      queueEmail(db, u.email, `⚡ You’ve won ${wins.length} instant prize${wins.length > 1 ? 's' : ''}!`, 'instant', wrapEmail(db, '⚡ Instant wins!', `<p>Hi ${esc(u.first)}, ${auto ? 'we revealed your unplayed tickets' : 'you played your tickets'} in <b>${esc(c.title)}</b> and won <b>${esc(txt)}</b>.</p>${cash ? `<p>${gbp(cash)} has been added to your cash balance.</p>` : ''}${cr ? `<p>${gbp(cr)} has been added to your credit balance.</p>` : ''}`));
    }
    function settleInstant(db) {
      let d = false;
      for (const o of db.orders) {
        if (o.status !== 'confirmed' || o.iwDone) continue; o.iwDone = true; d = true;
        for (const it of o.items) { const c = db.comps.find(x => x.id === it.compId); if (!c || !(c.iwTickets || []).length) continue;
          const who = entrantOf(db, o), u = o.userId && db.users.find(x => x.id === o.userId);
          const game = iwGameOf(c) !== 'none' && u; let plays = 0;
          for (const t of it.tickets) { if (game) plays++; const w = c.iwTickets.find(x => x.ticket === t && !x.won); if (!w) continue; const P = c.instant[w.i];
            w.won = { userId: o.userId || null, name: who.name, town: who.town, at: iso(now()), orderRef: o.ref };
            if (game) { w.won.pending = true; w.won.revealBy = iso(now() + DAY); continue; } // revealed by playing the game (or automatically after 24 h)
            if (u && P.cash) { if (P.credit) addCredit(u, P.cash, 'instant', `⚡ Instant win: ${P.prize} – ${c.title} #${t}`); else credit(u, P.cash, 'instant', `⚡ Instant win: ${P.prize} – ${c.title} #${t}`); }
            if (u) { pushTo(db, sub => sub.userId === u.id, { title: '⚡ INSTANT WIN!', body: `Ticket #${t} won ${P.prize} in ${c.title}!`, url: '/#account-wins' });
              queueEmail(db, u.email, `⚡ You’ve won ${P.prize} instantly!`, 'instant', wrapEmail(db, '⚡ Instant win!', `<p>Hi ${esc(u.first)}, your ticket <b>#${t}</b> in <b>${esc(c.title)}</b> is an instant winner – you’ve won <b>${esc(P.prize)}</b>!</p><p>${P.cash ? 'It’s been added to your cash balance – withdraw it or spend it on more entries.' : 'We’ll be in touch to arrange your prize.'}</p>`)); }
            }
          if (game && plays) pushTo(db, sub => sub.userId === u.id, { title: `🎮 ${plays} instant-win play${plays > 1 ? 's' : ''} ready!`, body: `Your entries in ${c.title} are confirmed – play now to see if you've won.`, url: '/#play-' + c.id });
        } }
      // anything not played within 24 hours is revealed (and paid) automatically
      for (const c of db.comps) { const due = (c.iwTickets || []).filter(x => x.won && x.won.pending && Date.parse(x.won.revealBy) <= now()); if (!due.length) continue; c.iwPlayed = c.iwPlayed || []; const byU = new Map();
        for (const x of due) { if (!c.iwPlayed.includes(x.ticket)) c.iwPlayed.push(x.ticket); payInstant(db, c, x, true, true); const k = x.won.userId || ''; byU.set(k, (byU.get(k) || []).concat(x)); } d = true;
        for (const [uid, ws] of byU) iwSummary(db, c, db.users.find(z => z.id === uid), ws, true); }
      return d;
    }
    function instantPublic(c) {
      if (!(c.iwTickets || []).length) return null; const reveal = ['drawn', 'ended', 'soldout'].includes(c.status) && (c.status !== 'soldout' || c.iwTickets.every(wonShown));
      return { prizes: c.instant.map((P, i) => ({ prize: P.prize, cash: P.cash, value: P.value || 0, count: P.count, tickets: c.iwTickets.filter(x => x.i === i).map(x => ({ t: x.ticket, won: wonShown(x) ? { name: x.won.name, town: x.won.town, at: x.won.at } : null })), won: c.iwTickets.filter(x => x.i === i && wonShown(x)).length })),
        wins: c.iwTickets.filter(wonShown).map(x => ({ ticket: x.ticket, prize: c.instant[x.i].prize, name: x.won.name, town: x.won.town, at: x.won.at })).sort((a, z) => z.at.localeCompare(a.at)),
        hash: c.iwHash, sealedAt: c.iwAt, revealed: reveal ? { salt: c.iwSalt, list: c.iwTickets.map(x => `${x.ticket}:${c.instant[x.i].prize}`) } : null };
    }
    // ---------- provable draws ----------
    // Every winner/player pick = HMAC-SHA256(key = public random number, msg = fingerprint of the locked entry list + ':' + draw no.) mod entries.
    // The public random number comes from drand (League of Entropy, quicknet) for a round named before it exists;
    // if that can't be reached, a sealed seed whose SHA-256 was published beforehand is used instead and revealed once all prizes are drawn.
    const DRAND = { chain: '52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971', genesis: 1692803367, period: 3 };
    const drandRoundAt = t => Math.floor((t / 1000 - DRAND.genesis) / DRAND.period) + 1;
    const hexMod = (hex, n) => Number(BigInt('0x' + hex) % BigInt(n));
    async function ensureSeed(c) { if (!c.seed) { c.seed = Array.from({ length: 32 }, () => h.randInt(256).toString(16).padStart(2, '0')).join(''); c.seedHash = await h.sha(c.seed); c.seedAt = iso(now()); } }
    async function provablePick(db, c, list, pool, label) {
      const lines = list.map(([t, gi]) => `${t}|${pool.groups[gi].name}`).sort((a, z) => parseInt(a) - parseInt(z));
      const fp = await h.sha(lines.join('\n')); c.proofs = c.proofs || []; const n = c.proofs.length + 1;
      let src = null;
      if (h.beacon) { const round = drandRoundAt(now()) + 2; try { const r = await h.beacon(round); if (r && r.randomness) src = { kind: 'drand', round, randomness: r.randomness, chain: DRAND.chain }; } catch { } }
      if (!src) { await ensureSeed(c); src = { kind: 'seed', randomness: await h.hmac(c.seed, `draw:${n}`), seedHash: c.seedHash }; }
      const mac = await h.hmac(src.randomness, `${fp}:${n}`), idx = hexMod(mac, lines.length);
      const ticket = parseInt(lines[idx]), pick = list.find(x => x[0] === ticket);
      c.proofs.push({ n, label, at: iso(now()), fp, count: lines.length, lines: lines.length <= 25000 ? lines : null, ...src, mac, idx, ticket, name: pool.groups[pick[1]].name });
      return { pick, rand: mac };
    }
    // deterministic shuffle from a provable random number (for Banker boxes / Higher or Lower decks)
    function seededShuffle(a, hex) { let x = BigInt('0x' + hex.slice(0, 16)) | 1n, y = BigInt('0x' + hex.slice(16, 32)) | 1n; const M = (1n << 64n) - 1n;
      const next = () => { let s1 = x; const s0 = y; x = s0; s1 ^= (s1 << 23n) & M; s1 ^= s1 >> 17n; s1 ^= s0; s1 ^= s0 >> 26n; y = s1; return (x + y) & M; };
      for (let i = a.length - 1; i > 0; i--) { const j = Number(next() % BigInt(i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function voidProof(c, ticket, why, by) { const pr = (c.proofs || []).slice().reverse().find(x => x.ticket === ticket && !x.void); if (pr) { pr.void = true; pr.voidWhy = why || 'Draw undone'; pr.voidAt = iso(now()); pr.voidBy = by; } }
    function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = h.randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    const HILO_FRACS = [0.02, 0.04, 0.07, 0.1, 0.15, 0.22, 0.32, 0.45, 0.65, 1];
    function hiloLadder(max) { const out = []; for (const f of HILO_FRACS.slice(0, -1)) { let v = niceP(max * f); while (out.includes(v) || (out.length && v <= out[out.length - 1])) v += v < 100 ? 5 : v < 1000 ? 25 : 50; out.push(Math.min(v, max - 1)); } out.push(max); return out; }
    function hiloPublic(c) {
      const gm = c.game; if (!gm || gm.kind !== 'hilo') return null;
      return { kind: 'hilo', phase: gm.phase, current: gm.current, ladder: gm.ladder, safe: gm.safe, totalPlayers: c.hiloPlayers, seq: gm.seq || 0, events: gm.events,
        players: gm.players.map(p => ({ ticket: p.ticket, name: p.name, town: p.town, rung: p.rung, cards: p.cards, result: p.result, how: p.how, done: p.result !== null })) };
    }
    function lmsPublic(c) {
      const gm = c.game; if (!gm || gm.kind !== 'lms') return null;
      return { kind: 'lms', phase: gm.phase, prize: gm.prize, prizeIndex: gm.prizeIndex, field: gm.field, out: gm.order.slice(0, gm.out), remaining: gm.field.length - gm.out, round: gm.round,
        winner: gm.phase === 'won' ? gm.win.ticket : null, seq: gm.seq || 0, events: gm.events };
    }
    function bankerPublic(c) {
      const gm = c.game; if (!gm) return null;
      return { phase: gm.phase, current: gm.current, values: gm.values, max: c.bankerMax, totalPlayers: c.bankerPlayers, seq: gm.seq || 0, events: gm.events || [],
        players: gm.players.map(p => ({ ticket: p.ticket, name: p.name, town: p.town, myBox: p.myBox, opened: p.opened.map(n => ({ box: n, value: p.boxes[n] })),
          offers: p.offers, offer: p.offer, result: p.result, dealt: p.dealt, ownValue: p.result !== null ? p.boxes[p.myBox] : null, round: p.round, roundLeft: p.roundLeft, done: p.result !== null })) };
    }
    function gamePayload(db, c, u) {
      const mine = [];
      if (u) for (const o of db.orders) if (o.userId === u.id && o.status === 'confirmed') for (const it of o.items) if (it.compId === c.id) mine.push(...it.tickets);
      return { serverNow: now(), mode: c.gameMode || 'standard', status: c.status, laps: c.raceLaps || 1, mine,
        banker: c.gameMode === 'banker' ? bankerPublic(c) : null, hilo: c.gameMode === 'hilo' ? hiloPublic(c) : null,
        races: (c.winners || []).filter(w => w.race).map(w => { const shown = !w.revealAt || Date.parse(w.revealAt) <= now(); return { prize: w.prize, ticket: w.ticket, name: shown ? w.name : '', town: shown ? w.town : '', at: w.at, race: w.race }; }) };
    }
    function entrantPool(db, c) {
      const won = new Set((c.winners || []).map(w => w.ticket));
      const groups = [], idx = new Map(), tickets = [];
      for (const o of db.orders) {
        if (o.status !== 'confirmed') continue;
        for (const it of o.items) {
          if (it.compId !== c.id) continue;
          const key = o.userId || ('p:' + o.id);
          if (!idx.has(key)) { const who = entrantOf(db, o); idx.set(key, groups.length); groups.push({ name: who.name, town: who.town, userId: o.userId || null, ref: o.ref, email: o.postal?.email || '' }); }
          for (const t of it.tickets) if (!won.has(t)) tickets.push([t, idx.get(key)]);
        }
      }
      tickets.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
      return { groups, tickets, total: c.totalTickets };
    }

    return { handle, housekeeping, dashboard };
  }

  return { createApp, emptyDb, DEFAULT_SETTINGS };
});
