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

  /* ---------- home + archive: filters, search, swipe feeds (one per column) ---------- */
  const dataEl = $('#stories-data');
  if (!dataEl) return;
  const stories = JSON.parse(dataEl.textContent);
  let view = 'swipe';
  try { view = localStorage.getItem('cs-view') || 'swipe'; } catch (e) {}
  const state = { region: 'All', cat: 'All', q: '', country: 'All' };
  const tabsEl = $('.tabs');
  const tabbed = () => !!tabsEl && getComputedStyle(tabsEl).display !== 'none';

  const known = (t) => !!t && !/^not yet reported\.?$/i.test(String(t).trim());
  const protect = (t) => t ? `<div class="protect"><b>PROTECT YOURSELF</b><p>${esc(t)}</p></div>` : '';
  const archSlide = (s, n) => `<div class="slide arch" style="height:${100 / n}%">
    <div class="r"><span class="tag">${esc(s.kind)}</span><span class="badge ${esc(s.tone)}"><i></i>${esc(s.status)}</span></div>
    <div class="meta"><span class="year">${esc(s.when)}</span> · ${esc(s.country)}</div>
    <h3>${esc(s.headline)}</h3>
    <div class="qa">
      <div><b>WHAT HAPPENED</b><p>${esc(s.what)}</p></div>
      <div><b>HOW IT HAPPENED</b><p>${esc(s.how)}</p></div>
      <div><b>HOW IT WAS FIXED</b><p>${esc(s.fixed)}</p></div>
    </div>
    ${protect(s.protect)}
    <div class="foot"><span>Past attack</span><a href="${esc(s.sourceUrl)}" target="_blank" rel="noopener nofollow">Source: ${esc(s.sourceName)} ↗</a></div>
  </div>`;

  const storySlide = (s, n) => {
    const solved = s.group === 'solved';
    return `<div class="slide" style="height:${100 / n}%">
    <div class="r"><span class="tag">${esc(s.category)}</span><span class="badge ${esc(s.tone)}"><i></i>${esc(s.status)}</span></div>
    <div class="meta">${esc(s.country && s.country !== 'Unknown' ? s.country : 'Worldwide')}${s.region && s.region !== 'Other' ? ' · ' + esc(s.region) : ''} · ${ago(s.publishedAt)}</div>
    <h3>${esc(s.headline)}</h3>
    <div class="qa">
      <div><b>WHAT HAPPENED</b><p>${esc(s.what)}</p></div>
      ${known(s.how) ? `<div><b>HOW IT HAPPENED</b><p>${esc(s.how)}</p></div>` : ''}
      <div><b>${solved ? 'HOW IT WAS SOLVED' : 'CURRENT STATUS'}</b><p>${esc(s.statusText)}</p></div>
    </div>
    ${protect(s.advice && s.advice[0])}
    ${!solved && s.checkedAt ? `<div class="checked">Last checked ${ago(s.checkedAt)}. We update this card if new details appear.</div>` : ''}
    <div class="foot"><a href="/story/${esc(s.id)}/">Full story →</a><a href="${esc(s.sourceUrl)}" target="_blank" rel="noopener nofollow">Source: ${esc(s.sourceName)} ↗</a></div>
  </div>`;
  };
  const slide = (s, n) => (s.archive ? archSlide(s, n) : storySlide(s, n));

  const matches = (s) => {
    const q = state.q.trim().toLowerCase();
    return (state.region === 'All' || s.region === state.region) &&
      (state.country === 'All' || s.country === state.country) &&
      (state.cat === 'All' || s.category === state.cat) &&
      (!q || (s.headline + ' ' + s.country + ' ' + s.category + ' ' + s.what + ' ' + s.region + ' ' + (s.kind || '') + ' ' + (s.when || '')).toLowerCase().includes(q));
  };

  function makeFeed(col) {
    const group = col.dataset.group;
    const mine = stories.filter((s) => group === 'all' || s.group === group);
    const stage = $('.stage', col), track = $('.track', col), bar = $('.progress i', col), pos = $('.pos', col);
    const prev = $('.prev', col), next = $('.next', col), hint = $('.hint', col);
    const swipeEl = $('.swipe', col), listEl = $('.list', col), emptyEl = $('.empty', col);
    const f = { col, group, idx: 0, swiped: false, filtered: mine, count: 0 };

    function go(d) {
      const n = f.filtered.length;
      if (!n) return;
      const ni = Math.max(0, Math.min(n - 1, f.idx + d));
      if (ni !== f.idx) f.swiped = true;
      f.idx = ni;
      track.style.transform = `translateY(-${(ni * 100) / n}%)`;
      bar.style.width = ((ni + 1) / n) * 100 + '%';
      pos.textContent = ni + 1 + ' / ' + n;
      prev.disabled = ni === 0;
      next.disabled = ni >= n - 1;
      hint.hidden = f.swiped || ni !== 0;
    }

    f.render = () => {
      f.filtered = mine.filter(matches);
      const n = (f.count = f.filtered.length);
      const ids = new Set(f.filtered.map((s) => s.id));
      $$('.list > article', col).forEach((a) => { a.hidden = !ids.has(a.dataset.id); });
      emptyEl.hidden = n > 0;
      swipeEl.hidden = !(view === 'swipe' && n > 0);
      listEl.hidden = !(view === 'list' && n > 0);
      const cc = $('[data-colcount]', col);
      if (cc) cc.textContent = n;
      const tc = $('[data-tabcount="' + group + '"]');
      if (tc) tc.textContent = n;
      if (view === 'swipe' && n > 0) {
        track.style.height = n * 100 + '%';
        track.innerHTML = f.filtered.map((s) => slide(s, n)).join('');
        f.idx = Math.min(f.idx, n - 1);
        go(0);
      }
    };

    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    let p0 = null;
    const finish = (x1, y1) => {
      if (!p0) return;
      const dx = x1 - p0.x, dy = y1 - p0.y;
      p0 = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (tabbed()) switchTab(dx < 0 ? 1 : -1); return; }
      if (dy < -40) go(1); else if (dy > 40) go(-1);
    };
    stage.addEventListener('touchstart', (e) => { p0 = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
    stage.addEventListener('touchend', (e) => finish(e.changedTouches[0].clientX, e.changedTouches[0].clientY));
    stage.addEventListener('mousedown', (e) => { p0 = { x: e.clientX, y: e.clientY }; });
    stage.addEventListener('mouseup', (e) => finish(e.clientX, e.clientY));
    stage.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); go(-1); }
      else if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && tabbed()) { e.preventDefault(); switchTab(e.key === 'ArrowRight' ? 1 : -1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    return f;
  }

  const feeds = $$('.col').map(makeFeed);
  const countEl = $('#count');

  function applyAll() {
    feeds.forEach((f) => f.render());
    if (countEl) { const n = feeds.reduce((t, f) => t + f.count, 0); countEl.textContent = n + (n === 1 ? ' story' : ' stories'); }
    $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  }

  /* tabs (phones and narrow screens show one column at a time) */
  const tabBtns = $$('.tab');
  function showTab(key) {
    tabBtns.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === key)));
    feeds.forEach((f) => f.col.classList.toggle('on', f.group === key));
  }
  function switchTab(d) {
    const keys = tabBtns.map((b) => b.dataset.tab);
    const cur = keys.indexOf((tabBtns.find((b) => b.getAttribute('aria-selected') === 'true') || tabBtns[0]).dataset.tab);
    const nx = Math.max(0, Math.min(keys.length - 1, cur + d));
    if (nx !== cur) showTab(keys[nx]);
  }
  tabBtns.forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

  const setPressed = (group, value) => $$('.chip[data-group="' + group + '"]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.value === value)));
  /* country filter (set by tapping a dot on the globe) */
  const cfEl = $('#cfilter');
  function setCountry(c) {
    state.country = c || 'All';
    if (cfEl) { cfEl.hidden = !c; const n = $('#cfname'); if (n) n.textContent = c || ''; }
    document.dispatchEvent(new CustomEvent('cs-country', { detail: { country: c || null } }));
  }
  if ($('#cfclear')) $('#cfclear').addEventListener('click', () => { setCountry(null); feeds.forEach((f) => { f.idx = 0; }); applyAll(); });
  document.addEventListener('cs-pick', (e) => {
    const c = e.detail && e.detail.country; if (!c) return;
    const same = state.country === c;
    state.region = 'All'; setPressed('region', 'All');
    setCountry(same ? null : c);
    feeds.forEach((f) => { f.idx = 0; }); applyAll();
    if (!same && $('#latest')) $('#latest').scrollIntoView({ behavior: 'smooth' });
  });

  $$('.chip[data-group]').forEach((c) => c.addEventListener('click', () => {
    if (c.dataset.group === 'region' && state.country !== 'All') setCountry(null);
    state[c.dataset.group] = c.dataset.value;
    setPressed(c.dataset.group, c.dataset.value);
    feeds.forEach((f) => { f.idx = 0; });
    applyAll();
  }));
  $$('.hot').forEach((h) => h.addEventListener('click', () => {
    if (state.country !== 'All') setCountry(null);
    state.region = h.dataset.region; setPressed('region', state.region); feeds.forEach((f) => { f.idx = 0; }); applyAll();
    $('#latest').scrollIntoView({ behavior: 'smooth' });
  }));
  $$('[data-view]').forEach((b) => b.addEventListener('click', () => {
    view = b.dataset.view;
    try { localStorage.setItem('cs-view', view); } catch (e) {}
    applyAll();
  }));
  $('#search').addEventListener('input', (e) => { state.q = e.target.value; feeds.forEach((f) => { f.idx = 0; }); applyAll(); });

  applyAll();
})();
