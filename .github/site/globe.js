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
  const RAD = Math.PI / 180;
  // land dots, worked out in advance by scripts/gen-globe.mjs (do not edit by hand)
  /*LAND-START*/
  const STEP = 1.5;
  const ROWS = [[-88,[0,48]],[-86.5,[0,48]],[-85,[0,48]],[-83.5,[0,48]],[-82,[0,48]],[-80.5,[0,48]],[-79,[0,48]],[-77.5,[3,17,21,31]],[-76,[6,15,25,32]],[-74.5,[9,13,29,33]],[-73,[20,4,32,36]],[-71.5,[24,1,36,37]],[-70,[26,1,44,33]],[-68.5,[54,26]],[-67,[68,14]],[-53.5,[43,2]],[-52,[44,2]],[-50.5,[45,3]],[-49,[46,4]],[-47.5,[48,4]],[-46,[49,4,161,2]],[-44.5,[51,4,166,2]],[-43,[52,5,171,2]],[-41.5,[53,5,163,1,176,1]],[-40,[55,6,182,1]],[-38.5,[56,8,170,2,185,2]],[-37,[57,9,171,5,189,1]],[-35.5,[59,8,173,7]],[-34,[60,10,110,4,164,4,175,9]],[-32.5,[61,11,112,6,166,7,177,10]],[-31,[63,11,114,7,169,22]],[-29.5,[63,13,115,9,171,23]],[-28,[64,14,116,10,174,23]],[-26.5,[65,14,117,11,176,23]],[-25,[66,15,118,12,136,1,178,24]],[-23.5,[67,16,119,13,138,2,180,23]],[-22,[68,19,120,14,139,3,182,22]],[-20.5,[69,19,121,14,140,3,187,19]],[-19,[70,19,122,15,142,3,190,16]],[-17.5,[69,21,123,16,143,4,193,15]],[-16,[68,23,124,17,145,3,195,9,207,2]],[-14.5,[68,24,125,18,147,2,200,5,208,2]],[-13,[68,25,126,18,149,1,202,4,209,1]],[-11.5,[68,26,127,18]],[-10,[67,28,127,18,215,2]],[-8.5,[67,29,128,17,193,2,211,7]],[-7,[67,29,128,18,190,4,211,7]],[-5.5,[66,31,128,18,199,2,211,6]],[-4,[67,28,128,19,188,3,200,1,209,7]],[-2.5,[67,24,127,21,188,2,194,4,201,1,208,6]],[-1,[67,21,126,23,187,3,193,5,201,1,208,2]],[0.5,[67,20,127,23,186,3,193,6,200,3]],[2,[68,19,127,24,185,2,189,1,194,5]],[3.5,[69,17,127,24,184,2,187,2,195,4]],[5,[69,17,114,5,124,28,183,1,187,1,196,3]],[6.5,[68,14,113,39,173,1,186,1,197,1]],[8,[65,2,68,13,111,41,172,1,184,2,201,2]],[9.5,[63,2,69,10,110,42,169,3,188,1,201,1]],[11,[62,2,69,2,108,39,149,3,168,3,183,1,186,3]],[12.5,[61,2,107,39,167,3,182,7]],[14,[58,5,106,38,145,3,165,4,180,7,195,1]],[15.5,[56,4,105,37,144,5,164,4,179,7]],[17,[52,7,105,35,142,8,162,6,176,8,192,1]],[18.5,[49,5,56,3,67,4,104,35,140,10,160,7,174,8]],[20,[47,6,56,3,103,34,138,12,159,8,172,8]],[21.5,[47,4,63,1,102,33,136,13,155,12,169,12]],[23,[46,5,101,32,134,13,153,29]],[24.5,[44,7,101,30,132,9,143,1,150,31,183,1]],[26,[43,7,100,29,130,8,142,38]],[27.5,[41,8,58,2,99,28,128,8,138,40]],[29,[40,10,57,2,99,26,126,50]],[30.5,[37,1,39,18,98,25,124,50]],[32,[36,21,97,17,122,49]],[33.5,[35,22,97,9,120,48,173,3]],[35,[33,24,96,9,118,46,171,4]],[36.5,[32,24,94,1,98,5,113,49,165,1,169,3]],[38,[31,24,90,5,106,2,109,12,123,34,161,1]],[39.5,[30,25,88,5,101,1,103,2,107,11,120,34,156,3,165,1]],[41,[29,26,87,5,98,2,101,15,118,38]],[42.5,[28,26,85,6,94,2,98,5,109,4,115,38,158,2]],[44,[27,27,86,7,94,6,106,3,112,40,154,2]],[45.5,[27,28,84,14,100,1,103,4,109,40]],[47,[26,28,57,1,81,64]],[48.5,[26,24,54,3,78,64]],[50,[24,25,53,2,78,60]],[51.5,[22,29,74,2,77,57]],[53,[21,19,41,9,69,1,71,2,76,53,135,2]],[54.5,[20,18,40,7,67,1,69,1,73,1,78,45,130,3]],[56,[7,1,18,17,38,7,65,2,71,1,75,44,126,2]],[57.5,[8,2,17,15,37,6,63,1,69,2,73,42,120,3]],[59,[8,2,15,15,36,4,64,4,70,41,114,4]],[60.5,[6,23,34,2,44,1,61,5,67,49]],[62,[5,23,32,2,41,3,58,4,64,47]],[63.5,[5,22,39,3,48,1,57,3,61,45]],[65,[5,21,29,4,36,4,45,2,54,3,58,44]],[66.5,[4,20,28,4,34,5,52,6,59,37]],[68,[4,13,21,2,26,3,32,6,49,6,56,34]],[69.5,[5,8,15,4,23,4,30,7,47,3,58,25]],[71,[5,1,14,3,21,3,27,8,55,18]],[72.5,[14,2,19,2,25,8,51,10]],[74,[23,7,49,5]],[75.5,[21,6,46,2]],[77,[14,2,17,8]],[78.5,[12,10]],[80,[12,3,16,6]],[81.5,[13,9]],[83,[19,2]]];
  /*LAND-END*/
  // turn the stored runs into unit vectors once, so drawing needs no trigonometry per dot
  const VX = [], VY = [], VZ = [];
  for (const [lat, runs] of ROWS) {
    const step = STEP / Math.max(0.2, Math.cos(lat * RAD)), la = lat * RAD, cl = Math.cos(la), sl = Math.sin(la);
    for (let k = 0; k < runs.length; k += 2) for (let i = runs[k]; i < runs[k] + runs[k + 1]; i++) {
      const lo = (-180 + i * step) * RAD;
      VX.push(cl * Math.cos(lo)); VY.push(cl * Math.sin(lo)); VZ.push(sl);
    }
  }
  const NDOTS = VX.length;
  const BUCKETS = 6, buckets = Array.from({ length: BUCKETS }, () => []);

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
    const sz = Math.max(1.3, Math.min(W_, H_) / 300), half = sz / 2;
    const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    for (let b = 0; b < BUCKETS; b++) { buckets[b].length = 0; }
    for (let i = 0; i < NDOTS; i++) {
      const vx = VX[i], vy = VY[i], vz = VZ[i];
      const c = vx * cyw + vy * syw, z = sp * vz + cp * c;
      if (z <= 0) continue;
      const x = cx + r * (vy * cyw - vx * syw), y = cy - r * (cp * vz - sp * c);
      buckets[Math.min(BUCKETS - 1, (z * BUCKETS) | 0)].push(x - half, y - half);
    }
    for (let b = 0; b < BUCKETS; b++) {
      const pts = buckets[b]; if (!pts.length) continue;
      ctx.fillStyle = 'rgba(120,170,235,' + (0.4 + 0.6 * (b + 0.5) / BUCKETS).toFixed(2) + ')';
      for (let k = 0; k < pts.length; k += 2) ctx.fillRect(pts[k], pts[k + 1], sz, sz);
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
