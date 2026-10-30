/* CyberStorm globe: draws the Attack map as a 3D globe (no libraries). Loaded on the home page only. */
(() => {
  'use strict';
  const card = document.getElementById('map');
  const cv = document.getElementById('globe');
  const dataEl = document.getElementById('stories-data');
  if (!card || !cv || !dataEl || !cv.getContext) { if (card) card.dataset.mapview = '2d'; return; }
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let stories = [];
  try { stories = JSON.parse(dataEl.textContent); } catch (e) {}

  // centre points [longitude, latitude] for countries the feed can name
  const C = {'United States':[-98,39],'Canada':[-100,58],'Mexico':[-102,23],'Brazil':[-52,-10],'Argentina':[-64,-35],'Chile':[-71,-31],'Colombia':[-73,4],'Peru':[-75,-10],
 'United Kingdom':[-2,54],'Ireland':[-8,53],'France':[2.5,46.5],'Germany':[10.4,51],'Spain':[-3.7,40.2],'Italy':[12.5,42.8],'Netherlands':[5.3,52.2],'Poland':[19,52],'Ukraine':[31,49],'Russia':[60,60],'Sweden':[16,62],'Norway':[9,61],'Turkey':[35,39],
 'India':[78,22],'China':[103,35],'Japan':[138,36.5],'South Korea':[127.8,36.4],'Singapore':[103.8,1.35],'Indonesia':[114,-2],'Pakistan':[69.5,30],'Israel':[34.9,31.5],'Iran':[54,32],'Saudi Arabia':[45,24],'United Arab Emirates':[54,24],'Vietnam':[106,16],'Thailand':[101,15],'Philippines':[122,12],
 'Nigeria':[8,9.5],'South Africa':[25,-29],'Kenya':[38,0.5],'Egypt':[30,26.5],'Ghana':[-1.2,7.9],'Morocco':[-6.5,32],'Ethiopia':[39.5,8.5],
 'Australia':[134,-25],'New Zealand':[172,-41.5]};
  // simplified world outlines [lon, lat], enough for a dot globe
  const L = [
// Eurasia
[[-9,37],[-9,43],[-2,43.5],[-1.5,46],[-4.5,48.5],[-1.5,49.5],[1.5,50.5],[4,51.5],[8,53.5],[8.5,57],[10.5,57.5],[10.5,54.5],[14,54],[19,54.5],[21,57],[23.5,59.2],[29,60],[22,60.5],[21.5,62.5],[25,65],[21.5,65.5],[17.5,62.5],[18.5,60],[16,56.5],[12.5,56],[11,59],[8,58],[5,59],[5,62],[10,64],[14,67.5],[20,70],[26,71],[31,70],[40,67],[33,66],[41,66.5],[44,68],[54,68.5],[60,69],[68,69],[70,73],[80,73],[87,75],[100,77],[112,74],[130,71],[140,72.5],[160,70],[170,70],[180,69],[180,65],[178,64.5],[170,60],[163,59.5],[163,57.5],[162,54],[156,51],[155.5,57],[150,59.5],[142,59],[137,54],[141,53],[140,48],[135,43.5],[131,42.5],[129.5,40.5],[127.5,39.5],[129.5,36],[126.5,34.5],[126,37.5],[125,39.5],[121.5,39],[121.5,40.8],[118,39],[119,37],[122.5,37],[120,35],[121.5,31.5],[122,29.5],[120,26],[117,23.5],[113.5,22],[110,21],[108,21.5],[106.5,19],[109,15],[109,12],[105,8.5],[105,10],[101,12.5],[100.5,13.5],[99.5,10],[101,6.5],[103.5,4],[104,1.5],[103.5,1.5],[101,3],[100.5,5.5],[98.5,8],[98.5,10.5],[97.5,16.5],[95,16],[94.5,19],[92,21],[90.5,22],[88,21.5],[86.5,20],[84.5,19],[82.5,17],[80,15],[80,13],[79.8,10.5],[78.5,8.5],[77,8],[76,10.5],[74.5,14],[73,17.5],[72.8,20.5],[70,21],[68.5,23.5],[66.5,25],[62,25],[57,25.5],[56.5,27],[54,26.5],[51,28],[48.5,30],[48,29.5],[50,26],[51.5,24.5],[54,24],[56,26],[56.5,24.5],[59.5,22.5],[57.5,19],[54,17],[52,16],[48,14],[45,12.8],[43.5,13],[42.5,16],[39,21.5],[37,25],[35,28],[34.9,29.5],[34.2,31.3],[35,33],[36,36],[34,36.5],[30.5,36.3],[27.5,36.8],[26.5,38.5],[26.3,40],[26,40.9],[24,40.8],[22.8,40.3],[23.8,38],[22.5,36.5],[21,38],[19.5,40.5],[19.5,42],[16,43.5],[13.5,45.5],[12.3,45.3],[12.5,44],[16,41.5],[18.5,40.2],[17,39],[16,38],[15.7,40],[12.5,41.5],[10.5,43],[8.8,44.3],[7,43.7],[3.5,43.3],[3,42],[0.5,40.5],[-0.5,38.5],[-2,36.8],[-5.5,36.1],[-7.5,37.2]],
// Africa
[[-9.8,29.5],[-9.5,32],[-6.5,34],[-5.5,35.8],[-2,35],[2,36.8],[10,37.3],[11,35],[10,33.5],[15.5,32.3],[20,32],[20,30.5],[24,32],[30,31.3],[32.3,31.2],[32.6,30],[33.5,27.5],[35.5,24],[37.2,21],[38.5,18],[40,15.5],[43,12.5],[44.5,10.5],[51.2,11.8],[48,5],[43,-1],[40.5,-3],[39,-6.5],[40.5,-10.5],[40.5,-15],[35,-20],[35.5,-24],[33,-26],[32.8,-28.8],[30,-31.5],[26,-34],[20,-34.8],[18.5,-34],[17.5,-30],[15,-26.5],[14,-22],[12,-17],[13.5,-12],[12.5,-6],[9,-1],[9.5,4],[6,4.3],[4,6.3],[-2,4.8],[-7.5,4.4],[-12,7.5],[-15,11],[-17,14.7],[-16.5,19],[-17,21],[-13,27.5]],
// North America
[[-168,65.5],[-162,70],[-156,71.3],[-141,69.7],[-125,69.5],[-114,68],[-98,68],[-91,68.5],[-90,64],[-94,60],[-93,57],[-88,56.5],[-85,55.2],[-82,52.8],[-79.5,51.5],[-79,54.5],[-77,58],[-78,62],[-73,62.5],[-70,60],[-65,60.3],[-61.5,56.5],[-57,53],[-60,50.3],[-66,50],[-69,48.5],[-64,48.5],[-61,46],[-66,44.5],[-70,43.5],[-70.5,41.8],[-74,40.5],[-76,37],[-76,35],[-81,31.5],[-80,27],[-80.3,25.2],[-81.8,26.5],[-82.8,28],[-84,30],[-87,30.4],[-89.5,30],[-90,29],[-94,29.5],[-97.2,27.5],[-97.5,24],[-97.8,21.5],[-96,19],[-94.5,18.2],[-91.5,18.5],[-90.5,21],[-87,21.5],[-87.5,18],[-88.5,15.8],[-83.5,15],[-83.5,11],[-82,9],[-79.5,9.5],[-77.4,8.6],[-80,7.5],[-82.5,8.3],[-85.5,10],[-87.5,13],[-92,14.5],[-94.5,16],[-98,16],[-102,18],[-105.5,20],[-105.5,23],[-109.5,26],[-112.8,29.5],[-114.7,31.7],[-115.8,30],[-117,32.5],[-120.5,34.5],[-122.5,37.5],[-124,40.5],[-124.5,43],[-124,46.5],[-123,48.5],[-125,50],[-128,51],[-130.5,54.5],[-134,57.5],[-138,59],[-144,60],[-148,60.5],[-152,59],[-155,57],[-160,56],[-164,54.7],[-158,58.5],[-162,59.8],[-165,61],[-165,63],[-161,64.5]],
// South America
[[-77.4,8.6],[-75,11],[-72,12],[-71.5,10.5],[-68,10.7],[-64,10.5],[-61,10.5],[-57,6],[-52,5],[-50,1.5],[-50,-0.5],[-44,-2.5],[-39,-3.5],[-35,-5.5],[-35,-9],[-37.5,-12.5],[-39,-17],[-40.5,-22],[-44,-23],[-48,-25.5],[-48.5,-28.5],[-52,-32],[-54,-34.8],[-58,-34.5],[-57,-36.5],[-57.5,-38.2],[-62,-39],[-62.5,-41],[-65,-41],[-64,-42.5],[-65.5,-45],[-67.5,-46.5],[-66,-48],[-68.5,-50],[-69,-52],[-68,-53.5],[-71,-54],[-74,-52],[-75.5,-48],[-74,-43],[-73.5,-37],[-71.5,-32],[-71.5,-28],[-70.5,-23],[-70.2,-18.5],[-75,-15.5],[-77,-12],[-79,-8],[-81,-5],[-80,-2.5],[-80,0.5],[-78.8,1.8],[-77.5,4]],
// Greenland
[[-73,78],[-60,82],[-30,83.5],[-20,81],[-18,77],[-20,72],[-22,70],[-27,68.5],[-35,66],[-40,65],[-42,61],[-45,60],[-49,61],[-52,64.5],[-54,67],[-55,70],[-60,76],[-68,76.5]],
// Australia, Tasmania, NZ north + south
[[113.5,-22],[114,-26],[115,-34],[118,-35],[123.5,-34],[129,-31.5],[134,-32.5],[138,-35],[140,-38],[144,-38.5],[147,-39],[150,-37.5],[153,-31],[153.5,-27],[152.5,-24.5],[149,-21],[146,-18.8],[145.5,-15],[143.5,-14],[142.5,-10.8],[141.5,-13],[141.5,-17],[139,-17.5],[136,-15],[137,-12],[132.5,-11.5],[130,-12.5],[129.5,-15],[125,-14.5],[122.5,-17],[121,-19.5],[118,-20.5]],
[[144.5,-41],[148,-41],[147,-43.5],[145.5,-42.5]],
[[173,-35],[175.5,-37],[178,-37.7],[176.5,-40],[174.5,-41.5],[174.5,-39.5]],
[[172.5,-40.5],[174.3,-41.7],[172.5,-43.5],[170.5,-46],[166.5,-46],[168,-44]],
// UK, Ireland, Iceland
[[-5.5,50],[1.5,51],[1.7,52.8],[-0.5,54.5],[-2,56],[-2,57.6],[-3.5,58.6],[-5,58.5],[-6,56.5],[-5,55],[-3,54.8],[-4.5,53.2],[-3.2,51.5]],
[[-10,51.7],[-6,52],[-6,54.2],[-8,55.2],[-10,54]],
[[-24,65.5],[-22,66.4],[-15,66.4],[-13.5,65],[-18,63.4],[-22.5,63.8]],
// Japan, Taiwan, Sri Lanka
[[130.5,31.3],[132,33],[135,33.5],[137,34.5],[140,35],[141,38],[142,40],[141.5,41.5],[140,40.5],[139.8,38],[136.5,37],[133,35.5],[131,34.3]],
[[140,42],[141.5,45.4],[145.5,43.3],[143,42],[141,41.7]],
[[120.2,23],[121.5,25],[122,24.5],[121,22]],
[[80,9.8],[81.8,7.5],[81.2,6.2],[80,6],[79.8,8]],
// Indonesia, PNG, Philippines
[[95.3,5.5],[98.5,3.5],[103.5,-0.5],[106,-3.5],[105.8,-5.9],[102.3,-4],[99,0.5],[95.5,3]],
[[109,1.5],[111,2.2],[114,4.5],[117,7],[119,5.2],[117.5,1.5],[116.5,-2],[114.5,-4],[110.5,-3],[109,-0.5]],
[[105.3,-6.8],[108,-6.3],[112,-6.8],[114.5,-7.8],[114.4,-8.7],[110,-8.2],[106,-7.2]],
[[119.5,-5.5],[120.5,-2],[119.7,0.8],[121,1.3],[125,1.5],[123,0],[121.5,-0.8],[123,-1.3],[121.5,-4],[122.5,-5.5],[120.5,-5.8]],
[[131,-0.8],[134,-0.8],[138,-1.6],[141,-2.7],[145,-4.3],[147.5,-6],[150.5,-10.5],[147,-10],[143.5,-8.5],[141,-9],[138,-8.3],[137.5,-5],[133,-4],[132,-2.5]],
[[120,18.5],[122,18.4],[122,16],[121.5,14],[124,13],[121,13.5],[120.5,15.5]],
[[122,7],[126.5,7.5],[126,9.3],[125.5,9.8],[123.5,8.5]],
// Madagascar, Cuba, Hispaniola, Newfoundland
[[49.3,-12],[50.5,-15.5],[49.5,-18],[47.5,-24.5],[45,-25.5],[43.5,-22],[44.3,-16.5],[47.5,-14.5]],
[[-85,22],[-81,23],[-77,21.5],[-74.2,20.2],[-77.5,19.9],[-80,21.5],[-83.5,22]],
[[-74.4,18.4],[-72,19.9],[-68.4,18.6],[-71,17.8]],
[[-59.3,47.6],[-53,46.7],[-52.8,49.5],[-55.5,51.5],[-57.5,50]],
// Arctic Canada islands
[[-80,73.5],[-72,71.5],[-67,69.5],[-62,66.5],[-65,63.5],[-72,64.5],[-78,64.5],[-74,67.5],[-85,70],[-89,73]],
[[-118,72],[-105,73],[-101,69.5],[-114,69],[-119,70]],
[[-90,76.5],[-80,76],[-65,82],[-80,83],[-92,81]],
// Antarctica
[[-180,-90],[-180,-79],[-160,-77.5],[-140,-75],[-120,-74],[-100,-73.5],[-80,-73],[-68,-71],[-62,-66],[-58,-63.5],[-65,-68],[-60,-75],[-40,-78],[-25,-76],[-10,-71],[10,-70],[30,-69.5],[50,-67.5],[70,-68],[90,-66],[110,-66],[130,-66.5],[150,-69],[165,-71.5],[170,-77],[180,-78],[180,-90]]
];
  // inland seas cut out of the land
  const W = [
[[28,41.5],[28,44],[30,46],[33,46],[35,45],[38,47],[41.5,42],[41,41],[36,41.7],[31,41.2]],
[[47,45],[50,46.5],[53,45.5],[53,40],[54,37],[51,36.7],[49,38.5],[49,41],[47.5,43]]
];

  const inside = (pt, poly) => { let c = false; const [x, y] = pt; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const isLand = (lon, lat) => L.some((p) => inside([lon, lat], p)) && !W.some((p) => inside([lon, lat], p));
  const RAD = Math.PI / 180;
  const dots = [];
  for (let lat = -88; lat <= 86; lat += 1.5) {
    const step = 1.5 / Math.max(0.2, Math.cos(lat * RAD));
    for (let lon = -180; lon < 180; lon += step) if (isLand(lon, lat)) dots.push([lon * RAD, lat * RAD]);
  }

  /* ---------- hotspots from the real stories ---------- */
  const GROUPS = { current: ['Current', '#ff4d5a'], solved: ['Solved', '#3ddc97'], unresolved: ['Unresolved', '#8a97b0'] };
  const on = { current: true, solved: true, unresolved: true };
  let hot = [];
  function buildHot() {
    const by = {};
    for (const s of stories) {
      const c = s.country, ll = C[c];
      if (!ll || !on[s.group]) continue;
      const h = (by[c] = by[c] || { country: c, lon: ll[0] * RAD, lat: ll[1] * RAD, n: 0, g: { current: 0, solved: 0, unresolved: 0 } });
      h.n++; h.g[s.group]++;
    }
    hot = Object.values(by).map((h) => ({ ...h, main: h.g.current ? 'current' : h.g.unresolved ? 'unresolved' : 'solved' })).sort((a, b) => b.n - a.n);
  }

  /* ---------- drawing ---------- */
  const ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let yaw = 1.2, pitch = 0.45, auto = !reduce, sel = null, drag = null, W_ = 0, H_ = 0, visible = true, raf = 0;
  const t0 = performance.now();
  function fit() {
    const dpr = Math.min(2, devicePixelRatio || 1), r = cv.getBoundingClientRect();
    W_ = r.width; H_ = r.height; cv.width = Math.max(1, W_ * dpr); cv.height = Math.max(1, H_ * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const R = () => Math.min(W_, H_) * 0.45;
  function proj(lon, lat) {
    const r = R(), cx = W_ / 2, cy = H_ / 2, dl = lon - yaw;
    return {
      x: cx + r * Math.cos(lat) * Math.sin(dl),
      y: cy - r * (Math.cos(pitch) * Math.sin(lat) - Math.sin(pitch) * Math.cos(lat) * Math.cos(dl)),
      z: Math.sin(pitch) * Math.sin(lat) + Math.cos(pitch) * Math.cos(lat) * Math.cos(dl)
    };
  }
  function frame(now) {
    raf = 0;
    const t = (now - t0) / 1000;
    if (auto && !drag) yaw += 0.0022;
    ctx.clearRect(0, 0, W_, H_);
    const r = R(), cx = W_ / 2, cy = H_ / 2;
    const g = ctx.createRadialGradient(cx - r * .3, cy - r * .35, r * .1, cx, cy, r * 1.05);
    g.addColorStop(0, '#12254a'); g.addColorStop(1, '#070d1c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(77,163,255,.55)'; ctx.lineWidth = 1.4; ctx.shadowColor = '#4da3ff'; ctx.shadowBlur = 18; ctx.stroke(); ctx.shadowBlur = 0;
    const sz = Math.max(1.3, Math.min(W_, H_) / 300);
    for (let i = 0; i < dots.length; i++) {
      const p = proj(dots[i][0], dots[i][1]); if (p.z <= 0) continue;
      ctx.fillStyle = 'rgba(120,170,235,' + (0.4 + 0.6 * p.z) + ')';
      ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    const base = Math.max(5, Math.min(W_, H_) / 70);
    for (const h of hot) {
      const p = proj(h.lon, h.lat); if (p.z <= 0.02) { h.px = undefined; continue; }
      h.px = p.x; h.py = p.y;
      const col = GROUPS[h.main][1], rr = base + Math.min(8, h.n * 1.6), pulse = (((t * 0.8 + h.lon) % 1) + 1) % 1;
      ctx.globalAlpha = 0.55 * (1 - pulse); ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y, rr + pulse * rr * 2.2, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
      const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr * 2.4);
      gl.addColorStop(0, col + 'aa'); gl.addColorStop(1, col + '00');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(p.x, p.y, rr * 2.4, 0, 7); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x, p.y, rr * 0.55, 0, 7); ctx.fill();
      if (sel === h.country) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, rr + 3, 0, 7); ctx.stroke(); }
      if (h.n > 1) { ctx.fillStyle = '#fff'; ctx.font = '600 ' + Math.max(10, rr * 0.9) + 'px ui-monospace,Menlo,monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(h.n, p.x, p.y + 0.5); }
    }
    if (!reduce || drag) schedule();
  }
  function schedule() { if (!raf && visible && !document.hidden && card.dataset.mapview === '3d') raf = requestAnimationFrame(frame); }
  const redraw = () => { if (!raf && card.dataset.mapview === '3d') raf = requestAnimationFrame(frame); };

  /* ---------- touch and mouse ---------- */
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener('pointerdown', (e) => { try { cv.setPointerCapture(e.pointerId); } catch (x) {} const [x, y] = pos(e); drag = { x, y, yaw, pitch, moved: false }; });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const [x, y] = pos(e), dx = x - drag.x, dy = y - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    if (drag.moved) { yaw = drag.yaw - dx / R(); pitch = Math.max(-1.2, Math.min(1.2, drag.pitch + dy / R())); redraw(); }
  });
  cv.addEventListener('pointerup', (e) => {
    const d = drag; drag = null; schedule(); if (!d || d.moved) return;
    const [x, y] = pos(e); let best = null, bd = 1e9;
    for (const h of hot) { if (h.px === undefined) continue; const dist = Math.hypot(h.px - x, h.py - y); if (dist < bd) { bd = dist; best = h; } }
    if (best && bd < 30) { auto = false; document.dispatchEvent(new CustomEvent('cs-pick', { detail: { country: best.country } })); }
  });
  cv.addEventListener('pointercancel', () => { drag = null; schedule(); });
  cv.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [-.25, 0], ArrowRight: [.25, 0], ArrowUp: [0, -.2], ArrowDown: [0, .2] }[e.key];
    if (k) { e.preventDefault(); auto = false; yaw += k[0]; pitch = Math.max(-1.2, Math.min(1.2, pitch + k[1])); redraw(); }
  });

  /* ---------- legend, top countries, 3D / 2D switch ---------- */
  const legendEl = $('#glegend'), topEl = $('#gtop'), subEl = $('#mapsub');
  function renderLegend() {
    if (!legendEl) return;
    legendEl.innerHTML = Object.entries(GROUPS).map(([k, [name, col]]) => {
      const n = stories.filter((s) => s.group === k && C[s.country]).length;
      return '<button type="button" data-k="' + k + '" aria-pressed="' + on[k] + '"><i style="background:' + col + '"></i>' + name + '<small>' + n + '</small></button>';
    }).join('');
    legendEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { on[b.dataset.k] = !on[b.dataset.k]; buildHot(); renderLegend(); renderTop(); redraw(); }));
  }
  function renderTop() {
    if (!topEl) return;
    topEl.innerHTML = hot.slice(0, 6).map((h) => '<button type="button" data-c="' + esc(h.country) + '" aria-pressed="' + (sel === h.country) + '">' + esc(h.country) + '<small>' + h.n + '</small></button>').join('');
    topEl.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { auto = false; document.dispatchEvent(new CustomEvent('cs-pick', { detail: { country: b.dataset.c } })); }));
  }
  // the page tells us which country is selected (or none)
  document.addEventListener('cs-country', (e) => {
    sel = e.detail && e.detail.country || null;
    const h = sel && hot.find((x) => x.country === sel);
    if (h) { yaw = h.lon; pitch = Math.max(-1, Math.min(1, h.lat * 0.8)); }
    renderTop(); redraw();
  });

  const lowEnd = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) || (navigator.deviceMemory && navigator.deviceMemory <= 2);
  let mode = null;
  try { mode = localStorage.getItem('cs-map'); } catch (e) {}
  if (mode !== '3d' && mode !== '2d') mode = (reduce || lowEnd) ? '2d' : '3d';
  function setMode(m, save) {
    card.dataset.mapview = m;
    document.querySelectorAll('[data-mapbtn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mapbtn === m)));
    if (subEl) subEl.textContent = m === '3d' ? 'Drag to turn the globe. Tap a glowing dot to see that country’s stories.' : 'Tap a glowing dot to filter stories by region';
    if (save) { try { localStorage.setItem('cs-map', m); } catch (e) {} }
    if (m === '3d') { fit(); schedule(); redraw(); }
  }
  document.querySelectorAll('[data-mapbtn]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mapbtn, true)));

  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) schedule(); }, { rootMargin: '120px' }).observe(cv);
  document.addEventListener('visibilitychange', schedule);
  addEventListener('resize', () => { if (card.dataset.mapview === '3d') { fit(); redraw(); } });

  buildHot(); renderLegend(); renderTop(); setMode(mode, false);
})();
