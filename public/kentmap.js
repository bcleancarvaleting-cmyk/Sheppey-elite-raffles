/* Kent winners map – real town coordinates (lat, lng) and a hand-traced outline of Kent and the Isle of Sheppey.
   Every Kent town in towns.js has a pin position. Add a town here if you add one there. */
(function () {
  const T = {
    'Ashford': [51.1465, 0.8750], 'Aylesford': [51.3030, 0.4790], 'Aylesham': [51.2270, 1.2020], 'Birchington': [51.3740, 1.3070],
    'Bluetown': [51.4440, 0.7480], 'Bobbing': [51.3540, 0.7130], 'Borough Green': [51.2910, 0.3060], 'Bridge': [51.2470, 1.1240],
    'Broadstairs': [51.3590, 1.4390], 'Canterbury': [51.2800, 1.0790], 'Capel-le-Ferne': [51.1000, 1.2140], 'Charing': [51.2120, 0.7940],
    'Chartham': [51.2550, 1.0180], 'Chatham': [51.3800, 0.5290], 'Cheriton': [51.0850, 1.1450], 'Cliftonville': [51.3890, 1.4050],
    'Cranbrook': [51.0960, 0.5350], 'Dartford': [51.4440, 0.2170], 'Deal': [51.2230, 1.4020], 'Ditton': [51.2960, 0.4530],
    'Dover': [51.1280, 1.3130], 'Dymchurch': [51.0260, 0.9940], 'Eastchurch': [51.4100, 0.8580], 'Eastry': [51.2470, 1.3100],
    'Ebbsfleet': [51.4430, 0.3200], 'Edenbridge': [51.1970, 0.0650], 'Faversham': [51.3160, 0.8910], 'Folkestone': [51.0810, 1.1690],
    'Gillingham': [51.3860, 0.5490], 'Gravesend': [51.4410, 0.3700], 'Greenhithe': [51.4480, 0.2850], 'Halfway Houses': [51.4190, 0.7810],
    'Harrietsham': [51.2450, 0.6720], 'Hartley': [51.3860, 0.3060], 'Hawkhurst': [51.0470, 0.5100], 'Hawkinge': [51.1170, 1.1650],
    'Headcorn': [51.1680, 0.6260], 'Herne': [51.3500, 1.1330], 'Herne Bay': [51.3700, 1.1280], 'Hextable': [51.4100, 0.1800],
    'Hollingbourne': [51.2650, 0.6420], 'Hoo St Werburgh': [51.4180, 0.5640], 'Hythe': [51.0710, 1.0840], 'Iwade': [51.3750, 0.7290],
    'Kemsley': [51.3620, 0.7380], 'Kings Hill': [51.2730, 0.4030], 'Larkfield': [51.3040, 0.4430], 'Lenham': [51.2350, 0.7200],
    'Leysdown-on-Sea': [51.3950, 0.9170], 'Littlestone': [50.9800, 0.9650], 'Longfield': [51.3960, 0.3010], 'Lordswood': [51.3330, 0.5300],
    'Lydd': [50.9510, 0.9070], 'Maidstone': [51.2720, 0.5290], 'Marden': [51.1750, 0.4930], 'Margate': [51.3860, 1.3860],
    'Meopham': [51.3670, 0.3530], 'Milton Regis': [51.3510, 0.7330], 'Minster (Thanet)': [51.3330, 1.3160], 'Minster-on-Sea': [51.4230, 0.8100],
    'New Romney': [50.9850, 0.9410], 'Northfleet': [51.4400, 0.3400], 'Otford': [51.3130, 0.1880], 'Paddock Wood': [51.1820, 0.3910],
    'Queenborough': [51.4160, 0.7500], 'Rainham (Kent)': [51.3620, 0.6100], 'Ramsgate': [51.3360, 1.4160], 'Rochester': [51.3880, 0.5050],
    'Sandgate': [51.0760, 1.1480], 'Sandhurst (Kent)': [51.0270, 0.5600], 'Sandwich': [51.2740, 1.3390], 'Sevenoaks': [51.2720, 0.1900],
    'Sheerness': [51.4400, 0.7600], 'Sittingbourne': [51.3400, 0.7330], 'Snodland': [51.3290, 0.4450], "St Margaret's at Cliffe": [51.1530, 1.3700],
    "St Mary's Bay": [51.0100, 0.9750], 'Staplehurst': [51.1620, 0.5520], 'Strood': [51.3930, 0.4800], 'Sturry': [51.3000, 1.1200],
    'Swanley': [51.3970, 0.1730], 'Swanscombe': [51.4470, 0.3070], 'Tenterden': [51.0690, 0.6890], 'Teynham': [51.3330, 0.8080],
    'Tonbridge': [51.1950, 0.2750], 'Tunbridge Wells': [51.1320, 0.2630], 'Wainscott': [51.4070, 0.5150], 'Walderslade': [51.3420, 0.5240],
    'Walmer': [51.2050, 1.3990], 'Warden': [51.4040, 0.9030], 'West Kingsdown': [51.3420, 0.2600], 'West Malling': [51.2930, 0.4100],
    'Westerham': [51.2660, 0.0710], 'Westgate-on-Sea': [51.3800, 1.3380], 'Whitstable': [51.3600, 1.0250], 'Wingham': [51.2720, 1.2150], 'Wye': [51.1840, 0.9380]
  };
  // [lng, lat]
  const KENT = [[0.155, 51.470], [0.21, 51.463], [0.25, 51.458], [0.29, 51.453], [0.33, 51.451], [0.37, 51.449], [0.40, 51.452], [0.43, 51.462], [0.46, 51.474], [0.50, 51.483],
    [0.54, 51.490], [0.59, 51.497], [0.64, 51.497], [0.68, 51.483], [0.715, 51.467], [0.72, 51.452], [0.70, 51.437], [0.66, 51.428], [0.61, 51.416], [0.565, 51.402],
    [0.53, 51.397], [0.51, 51.393], [0.535, 51.390], [0.575, 51.394], [0.62, 51.394], [0.655, 51.389], [0.70, 51.389], [0.73, 51.391], [0.752, 51.386], [0.77, 51.362],
    [0.80, 51.348], [0.85, 51.338], [0.89, 51.331], [0.93, 51.338], [0.97, 51.348], [1.01, 51.358], [1.05, 51.366], [1.10, 51.375], [1.15, 51.381], [1.21, 51.385],
    [1.27, 51.384], [1.31, 51.386], [1.35, 51.390], [1.38, 51.395], [1.42, 51.398], [1.452, 51.388], [1.453, 51.368], [1.443, 51.350], [1.426, 51.332], [1.390, 51.322],
    [1.362, 51.312], [1.368, 51.290], [1.390, 51.265], [1.410, 51.240], [1.415, 51.215], [1.410, 51.190], [1.392, 51.163], [1.374, 51.144], [1.338, 51.123], [1.300, 51.113],
    [1.255, 51.100], [1.205, 51.085], [1.170, 51.075], [1.130, 51.069], [1.085, 51.063], [1.045, 51.050], [1.008, 51.028], [0.986, 51.005], [0.976, 50.978], [0.982, 50.935],
    [0.950, 50.920], [0.900, 50.928], [0.850, 50.934], [0.795, 50.944], [0.770, 50.960], [0.760, 50.985], [0.720, 51.008], [0.680, 51.018], [0.630, 51.013], [0.590, 51.010],
    [0.545, 51.019], [0.500, 51.032], [0.460, 51.052], [0.420, 51.073], [0.380, 51.093], [0.340, 51.108], [0.300, 51.116], [0.255, 51.117], [0.220, 51.112], [0.180, 51.116],
    [0.140, 51.128], [0.100, 51.138], [0.060, 51.148], [0.032, 51.170], [0.036, 51.200], [0.042, 51.235], [0.052, 51.265], [0.062, 51.295], [0.082, 51.320], [0.108, 51.345],
    [0.122, 51.370], [0.138, 51.400], [0.148, 51.430], [0.155, 51.470]];
  const SHEPPEY = [[0.733, 51.435], [0.745, 51.448], [0.768, 51.446], [0.80, 51.438], [0.84, 51.428], [0.88, 51.416], [0.905, 51.410], [0.930, 51.400], [0.950, 51.382],
    [0.942, 51.367], [0.900, 51.364], [0.860, 51.371], [0.820, 51.381], [0.785, 51.391], [0.756, 51.397], [0.740, 51.408], [0.733, 51.425]];
  const LABELS = ['Dartford', 'Gravesend', 'Chatham', 'Maidstone', 'Sittingbourne', 'Sheerness', 'Faversham', 'Canterbury', 'Margate', 'Ramsgate', 'Deal', 'Dover', 'Folkestone', 'Ashford', 'Tonbridge', 'Tunbridge Wells', 'Sevenoaks', 'Tenterden', 'New Romney', 'Whitstable'];
  const W = 940, H = 640, L0 = 0.0, L1 = 1.48, A0 = 50.89, A1 = 51.52, K = Math.cos(51.2 * Math.PI / 180);
  const SX = W / ((L1 - L0) * K), SY = H / (A1 - A0), S = Math.min(SX, SY);
  const ox = (W - (L1 - L0) * K * S) / 2, oy = (H - (A1 - A0) * S) / 2;
  const P = (lng, lat) => [ox + (lng - L0) * K * S, oy + (A1 - lat) * S];
  const path = pts => 'M' + pts.map(([g, a]) => P(g, a).map(v => v.toFixed(1)).join(',')).join('L') + 'Z';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function render(host, winners, opts = {}) {
    const by = new Map(), outside = [];
    for (const w of winners) { const k = T[w.town]; if (!k) { outside.push(w); continue; } const e = by.get(w.town) || { town: w.town, list: [] }; e.list.push(w); by.set(w.town, e); }
    const groups = [...by.values()].sort((a, b) => a.list.length - b.list.length);
    const pin = g => { const [x, y] = P(T[g.town][1], T[g.town][0]), n = g.list.length, r = n > 1 ? 15 + Math.min(8, Math.log2(n) * 3) : 11;
      return `<g class="km-pin ${n > 1 ? 'multi' : ''}" data-town="${esc(g.town)}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})" tabindex="0" role="button" aria-label="${esc(g.town)}: ${n} winner${n > 1 ? 's' : ''}">
        <circle class="km-pulse" r="${r + 4}"/><path class="km-drop" d="M0,0 C-${r * .9},-${r * 1.1} -${r},-${r * 2.1} 0,-${r * 2.6} C${r},-${r * 2.1} ${r * .9},-${r * 1.1} 0,0Z"/>
        <circle class="km-head" cy="-${(r * 1.6).toFixed(1)}" r="${(r * .78).toFixed(1)}"/>${n > 1 ? `<text y="-${(r * 1.6 - 4.5).toFixed(1)}" text-anchor="middle">${n}</text>` : `<circle class="km-dot" cy="-${(r * 1.6).toFixed(1)}" r="3.4"/>`}</g>`; };
    const near = n => groups.some(g => { const [a, b] = P(T[g.town][1], T[g.town][0]), [c, d] = P(T[n][1], T[n][0]); return Math.abs(a - c) < 70 && Math.abs(b - d) < 34; });
    const labels = LABELS.filter(n => T[n] && !by.has(n) && !near(n)).map(n => { const [x, y] = P(T[n][1], T[n][0]); return `<g class="km-lbl"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6"/><text x="${(x + 6).toFixed(1)}" y="${(y + 4).toFixed(1)}">${n}</text></g>`; }).join('');
    // pin labels: biggest first, skip any that would overlap another label or a pin
    const placed = [], pinXY = groups.map(g => P(T[g.town][1], T[g.town][0]));
    const pinLbls = groups.slice().sort((a, b) => b.list.length - a.list.length).map(g => { const [x, y] = P(T[g.town][1], T[g.town][0]); const w = g.town.length * 7.4 + 8, box = [x - w / 2, y + 4, x + w / 2, y + 22];
      if (placed.some(q => !(box[2] < q[0] || box[0] > q[2] || box[3] < q[1] || box[1] > q[3])) || pinXY.some(([px, py]) => (px !== x || py !== y) && px > box[0] - 8 && px < box[2] + 8 && py > box[1] - 2 && py < box[3] + 34)) return '';
      placed.push(box); return `<text class="km-plbl" x="${x.toFixed(1)}" y="${(y + 18).toFixed(1)}" text-anchor="middle">${esc(g.town)}</text>`; }).join('');
    const [bx1, by1] = P(0.745, 51.398), [bx2, by2] = P(0.746, 51.386);
    host.innerHTML = `<div class="km"><svg viewBox="0 0 ${W} ${H}" class="km-svg" role="img" aria-label="Map of Kent showing where our winners live">
      <defs><radialGradient id="kmSea" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#0d1d4a"/><stop offset="1" stop-color="#050a1c"/></radialGradient>
        <linearGradient id="kmLand" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#16244f"/><stop offset="1" stop-color="#1c1740"/></linearGradient>
        <filter id="kmGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <pattern id="kmWave" width="26" height="12" patternUnits="userSpaceOnUse"><path d="M0 8 Q6.5 2 13 8 T26 8" fill="none" stroke="rgba(90,140,255,.12)" stroke-width="1.2"/></pattern></defs>
      <rect width="${W}" height="${H}" fill="url(#kmSea)"/><rect width="${W}" height="${H}" fill="url(#kmWave)"/>
      <text class="km-sea" x="${P(0.30, 51.50)[0]}" y="${P(0.30, 51.50)[1]}">THAMES ESTUARY</text>
      <text class="km-sea" x="${P(1.22, 50.935)[0]}" y="${P(1.22, 50.935)[1]}">ENGLISH CHANNEL</text>
      <path d="${path(KENT)}" class="km-land" filter="url(#kmGlow)"/><path d="${path(SHEPPEY)}" class="km-land km-shep" filter="url(#kmGlow)"/>
      <line x1="${bx1}" y1="${by1}" x2="${bx2}" y2="${by2}" class="km-bridge"/>
      ${labels}${pinLbls}${groups.map(pin).join('')}</svg>
      <div class="km-pop hidden" id="kmPop"></div></div>
      <div class="km-foot"><span>📍 <b>${winners.length - outside.length}</b> winners across <b>${by.size}</b> Kent town${by.size === 1 ? '' : 's'}</span>${outside.length ? `<span>🇬🇧 + <b>${outside.length}</b> from outside Kent</span>` : ''}<span class="muted">Tap a pin to see who won</span></div>`;
    const pop = host.querySelector('#kmPop'), svg = host.querySelector('svg');
    const show = g => { const e = by.get(g.dataset.town); if (!e) return; const r = g.getBoundingClientRect(), hr = host.querySelector('.km').getBoundingClientRect();
      pop.innerHTML = `<button class="km-x" aria-label="Close">×</button><b>📍 ${esc(e.town)}</b><small>${e.list.length} winner${e.list.length > 1 ? 's' : ''}</small>${e.list.slice(0, 8).map(w => `<a href="#comp-${esc(w.compId)}"><span>${esc(w.name)}</span><em>${esc(w.prize)}</em></a>`).join('')}${e.list.length > 8 ? `<small>+ ${e.list.length - 8} more</small>` : ''}`;
      pop.classList.remove('hidden'); const pw = pop.offsetWidth, ph = pop.offsetHeight;
      let x = r.left - hr.left + r.width / 2 - pw / 2, y = r.top - hr.top - ph - 8; x = Math.max(6, Math.min(hr.width - pw - 6, x)); if (y < 6) y = r.bottom - hr.top + 8;
      pop.style.left = x + 'px'; pop.style.top = y + 'px'; pop.querySelector('.km-x').onclick = () => pop.classList.add('hidden'); };
    svg.querySelectorAll('.km-pin').forEach(g => { g.onclick = () => show(g); g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(g); } }; });
    svg.addEventListener('click', e => { if (!e.target.closest('.km-pin')) pop.classList.add('hidden'); });
  }
  window.KentMap = { render, towns: T };
})();
