/* CyberStorm clock: green hour ring, blue minute ring, red seconds line. No libraries. Home page only. */
(() => {
  'use strict';
  const cv = document.getElementById('clk');
  if (!cv || !cv.getContext) return;
  const $ = (id) => document.getElementById(id);
  const two = (n) => String(n).padStart(2, '0');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let utc = false;
  try { utc = localStorage.getItem('cs-clock-utc') === '1'; } catch (e) {}

  let F, Z;
  function formats() {
    const tz = utc ? 'UTC' : undefined;
    F = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    Z = new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'long' });
  }
  function now() {
    const d = new Date(), o = {};
    for (const p of F.formatToParts(d)) o[p.type] = p.value;
    return { h: +o.hour % 24, m: +o.minute, s: +o.second, ms: d.getMilliseconds(), date: (o.weekday + ', ' + o.day + ' ' + o.month + ' ' + o.year) };
  }
  function zoneName() {
    try { const p = Z.formatToParts(new Date()).find((x) => x.type === 'timeZoneName'); return p ? p.value : ''; } catch (e) { return ''; }
  }

  const ctx = cv.getContext('2d');
  let S = 0, visible = true, raf = 0, timer = 0;
  function fit() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    S = cv.getBoundingClientRect().width;
    cv.width = Math.max(1, S * dpr); cv.height = Math.max(1, S * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const GR = '#3ddc97', BL = '#4da3ff', TAU = Math.PI * 2, START = -Math.PI / 2;
  const hasConic = typeof ctx.createConicGradient === 'function';

  function draw(t) {
    const cx = S / 2, cy = S / 2;
    ctx.clearRect(0, 0, S, S);
    ctx.lineWidth = 1; ctx.lineCap = 'butt';
    for (let i = 0; i < 60; i++) {
      const a = START + i / 60 * TAU, r1 = S * 0.475, r2 = S * (i % 5 === 0 ? 0.497 : 0.486);
      ctx.strokeStyle = i % 5 === 0 ? 'rgba(159,176,204,.3)' : 'rgba(159,176,204,.16)';
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); ctx.stroke();
    }
    const rings = [
      { r: S * 0.30, f: ((t.h % 12) + t.m / 60) / 12, col: GR, n: 'H' },
      { r: S * 0.41, f: (t.m + t.s / 60) / 60, col: BL, n: 'M' }
    ];
    for (const o of rings) {
      ctx.strokeStyle = 'rgba(159,176,204,.16)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, o.r, 0, TAU); ctx.stroke();
      const a = START + o.f * TAU, trail = Math.min(o.f * TAU, 1.9);
      if (trail > 0.01) {
        let stroke = o.col;
        if (hasConic) {
          const g = ctx.createConicGradient(a - trail, cx, cy);
          g.addColorStop(0, o.col + '00'); g.addColorStop(trail / TAU, o.col + 'ff'); g.addColorStop(Math.min(1, trail / TAU + 0.0005), o.col + '00');
          stroke = g;
        }
        ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(3, S * 0.02); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(cx, cy, o.r, a - trail, a); ctx.stroke();
      }
      const x = cx + Math.cos(a) * o.r, y = cy + Math.sin(a) * o.r;
      ctx.fillStyle = '#fff'; ctx.shadowColor = o.col; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(x, y, S * 0.022, 0, TAU); ctx.fill();
      ctx.fillStyle = o.col; ctx.beginPath(); ctx.arc(x, y, S * 0.013, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = o.col; ctx.font = '700 ' + Math.max(9, S * 0.034) + 'px ui-monospace,Menlo,monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(o.n, cx, cy - o.r);
    }
    const pulse = 0.5 + 0.5 * Math.sin((t.s + t.ms / 1000) * TAU);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.24);
    g.addColorStop(0, 'rgba(77,163,255,' + (0.2 + 0.1 * pulse) + ')'); g.addColorStop(1, 'rgba(77,163,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, S * 0.24, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e6ecf5'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 ' + S * 0.13 + 'px "Space Grotesk",Inter,system-ui,sans-serif';
    ctx.fillText(two(t.h) + ':' + two(t.m), cx, cy);
  }

  const bar = $('clk-bar'), head = $('clk-head'), sn = $('clk-sec'), dateEl = $('clk-date'), zoneEl = $('clk-zone');
  let lastDate = '';
  function step() {
    const t = now();
    draw(t);
    const f = (t.s + t.ms / 1000) / 60 * 100;
    if (bar) bar.style.width = f + '%';
    if (head) head.style.left = f + '%';
    if (sn) sn.textContent = two(t.s);
    if (dateEl && t.date !== lastDate) { lastDate = t.date; dateEl.textContent = t.date; }
  }
  function loop() {
    raf = 0; step();
    if (!reduce && visible && !document.hidden) raf = requestAnimationFrame(loop);
  }
  function start() {
    clearInterval(timer);
    if (reduce) { step(); timer = setInterval(step, 1000); return; }
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
  }

  function setZone(u, save) {
    utc = u; formats();
    const bl = $('clk-local'), bu = $('clk-utc');
    if (bl) bl.setAttribute('aria-pressed', String(!utc));
    if (bu) bu.setAttribute('aria-pressed', String(utc));
    if (zoneEl) zoneEl.textContent = utc ? 'Universal Time (UTC)' : (zoneName() || 'Your local time');
    lastDate = '';
    if (save) { try { localStorage.setItem('cs-clock-utc', utc ? '1' : '0'); } catch (e) {} }
    step();
  }
  const bl = $('clk-local'), bu = $('clk-utc');
  if (bl) bl.addEventListener('click', () => setZone(false, true));
  if (bu) bu.addEventListener('click', () => setZone(true, true));

  if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; start(); }, { rootMargin: '80px' }).observe(cv);
  document.addEventListener('visibilitychange', start);
  addEventListener('resize', () => { fit(); step(); });
  fit(); setZone(utc, false); start();
})();
