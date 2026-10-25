(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const ago = (iso) => {
    const h = (Date.now() - new Date(iso)) / 36e5;
    if (h < 1) return Math.max(1, Math.round(h * 60)) + 'm ago';
    if (h < 24) return Math.round(h) + 'h ago';
    const d = Math.round(h / 24);
    return d < 30 ? d + 'd ago' : fmtDate(iso);
  };
  const tick = () => {
    $$('time[datetime]').forEach((t) => { t.textContent = ago(t.getAttribute('datetime')); });
    const l = $('#live');
    if (l && l.dataset.updated) l.textContent = 'Live · updated ' + ago(l.dataset.updated);
  };
  tick();
  setInterval(tick, 60000);

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  /* ---------- timeline page: type filter ---------- */
  const tl = $('[data-timeline]');
  if (tl) {
    const chips = $$('.chip', tl.parentElement);
    const apply = (cat) => {
      chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.value === cat)));
      $$('.ev', tl).forEach((e) => { e.hidden = !(cat === 'All' || e.dataset.cat === cat); });
      $$('.mgroup', tl).forEach((g) => { g.hidden = !$$('.ev', g).some((e) => !e.hidden); });
    };
    chips.forEach((c) => c.addEventListener('click', () => apply(c.dataset.value)));
  }

  /* ---------- home page: filters, search, swipe feed ---------- */
  const dataEl = $('#stories-data');
  if (!dataEl) return;
  const stories = JSON.parse(dataEl.textContent);
  const byId = Object.fromEntries(stories.map((s) => [s.id, s]));
  let view = 'swipe';
  try { view = localStorage.getItem('cs-view') || 'swipe'; } catch (e) {}
  const state = { region: 'All', cat: 'All', q: '', idx: 0, swiped: false };
  let filtered = stories;

  const stage = $('#stage'), track = $('#track'), bar = $('#bar'), pos = $('#pos');
  const prev = $('#prev'), next = $('#next'), hint = $('#hint');
  const swipeEl = $('#swipe'), listEl = $('#list'), emptyEl = $('#empty'), countEl = $('#count');

  const archSlide = (s, n) => `<div class="slide arch" style="height:${100 / n}%">
    <div class="r"><span class="tag">${esc(s.kind)}</span><span class="badge ${esc(s.tone)}"><i></i>${esc(s.status)}</span></div>
    <div class="meta"><span class="year">${esc(s.when)}</span> · ${esc(s.country)}</div>
    <h3>${esc(s.headline)}</h3>
    <div class="qa">
      <div><b>WHAT HAPPENED</b><p>${esc(s.what)}</p></div>
      <div><b>HOW IT HAPPENED</b><p>${esc(s.how)}</p></div>
      <div><b>HOW IT WAS FIXED</b><p>${esc(s.fixed)}</p></div>
    </div>
    <div class="protect"><b>PROTECT YOURSELF</b><p>${esc(s.protect)}</p></div>
    <div class="foot"><span>Past attack</span><a href="${esc(s.sourceUrl)}" target="_blank" rel="noopener nofollow">Source: ${esc(s.sourceName)} ↗</a></div>
  </div>`;

  const slide = (s, n) => s.archive ? archSlide(s, n) : `<div class="slide" style="height:${100 / n}%">
    <div class="r"><span class="tag">${esc(s.category)}</span><span class="badge ${esc(s.tone)}"><i></i>${esc(s.status)}</span></div>
    <div class="meta">${esc(s.country && s.country !== 'Unknown' ? s.country : 'Worldwide')}${s.region && s.region !== 'Other' ? ' · ' + esc(s.region) : ''} · ${ago(s.publishedAt)}</div>
    <h3>${esc(s.headline)}</h3>
    <div class="qa">
      <div><b>WHAT HAPPENED</b><p>${esc(s.what)}</p></div>
      <div><b>HOW IT HAPPENED</b><p>${esc(s.how)}</p></div>
      <div><b>CURRENT STATUS</b><p>${esc(s.statusText)}</p></div>
    </div>
    <div class="foot"><a href="/story/${esc(s.id)}/">Full story →</a><a href="${esc(s.sourceUrl)}" target="_blank" rel="noopener nofollow">Source: ${esc(s.sourceName)} ↗</a></div>
  </div>`;

  function go(d) {
    const n = filtered.length;
    if (!n) return;
    const ni = Math.max(0, Math.min(n - 1, state.idx + d));
    if (ni !== state.idx) { state.swiped = true; }
    state.idx = ni;
    track.style.transform = `translateY(-${(ni * 100) / n}%)`;
    bar.style.width = ((ni + 1) / n) * 100 + '%';
    pos.textContent = ni + 1 + ' / ' + n;
    prev.disabled = ni === 0;
    next.disabled = ni >= n - 1;
    hint.hidden = state.swiped || ni !== 0;
  }

  function apply() {
    const q = state.q.trim().toLowerCase();
    filtered = stories.filter((s) =>
      (state.region === 'All' || s.region === state.region) &&
      (state.cat === 'All' || s.category === state.cat) &&
      (!q || (s.headline + ' ' + s.country + ' ' + s.category + ' ' + s.what + ' ' + s.region + ' ' + (s.kind || '') + ' ' + (s.when || '')).toLowerCase().includes(q)));
    const n = filtered.length;
    countEl.textContent = n + (n === 1 ? ' story' : ' stories');
    const ids = new Set(filtered.map((s) => s.id));
    $$('#list > article').forEach((a) => { a.hidden = !ids.has(a.dataset.id); });
    emptyEl.hidden = n > 0;
    swipeEl.hidden = !(view === 'swipe' && n > 0);
    listEl.hidden = !(view === 'list' && n > 0);
    $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    if (view === 'swipe' && n > 0) {
      track.style.height = n * 100 + '%';
      track.innerHTML = filtered.map((s) => slide(s, n)).join('');
      state.idx = Math.min(state.idx, n - 1);
      go(0);
    }
  }

  const setPressed = (group, value) => $$('.chip[data-group="' + group + '"]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.value === value)));
  $$('.chip[data-group]').forEach((c) => c.addEventListener('click', () => {
    state[c.dataset.group] = c.dataset.value;
    setPressed(c.dataset.group, c.dataset.value);
    state.idx = 0;
    apply();
  }));
  $$('.hot').forEach((h) => h.addEventListener('click', () => {
    state.region = h.dataset.region; setPressed('region', state.region); state.idx = 0; apply();
    $('#latest').scrollIntoView({ behavior: 'smooth' });
  }));
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => {
    view = b.dataset.view;
    try { localStorage.setItem('cs-view', view); } catch (e) {}
    apply();
  }));
  $('#search').addEventListener('input', (e) => { state.q = e.target.value; state.idx = 0; apply(); });

  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  let y0 = null;
  const finish = (y1) => { if (y0 === null) return; const dy = y1 - y0; y0 = null; if (dy < -40) go(1); else if (dy > 40) go(-1); };
  stage.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener('touchend', (e) => finish(e.changedTouches[0].clientY));
  stage.addEventListener('mousedown', (e) => { y0 = e.clientY; });
  stage.addEventListener('mouseup', (e) => finish(e.clientY));
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });

  apply();
})();
