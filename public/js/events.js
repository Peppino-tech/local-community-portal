// public/js/events.js
(function () {
  const list   = document.getElementById('eventsList');
  const form   = document.getElementById('eventsFilters');
  const year   = document.getElementById('ev-year');
  const area   = document.getElementById('ev-area');
  const type   = document.getElementById('ev-type');
  const q      = document.getElementById('ev-q');
  const past   = document.getElementById('ev-past');
  const prev   = document.getElementById('ev-prev');
  const next   = document.getElementById('ev-next');
  const summary= document.getElementById('ev-summary');

  let page = 1;
  const limit = 12;

  // Restore filters from URL on first load
  (function restoreFromURL(){
    const url = new URL(location.href);
    const get = k => url.searchParams.get(k) || '';
    year.value = get('year');
    area.value = get('area_id');
    type.value = get('type_id');
    q.value    = get('q');
    const p    = url.searchParams.get('past');
    if (p === 'true' || p === 'false' || p === '') past.value = p ?? 'false';
    page = +(url.searchParams.get('page') || 1);
  })();

  function debounce(fn, ms=350){
    let t; return (...args)=>{ clearTimeout(t); t=setTimeout(()=>fn(...args), ms); };
  }

  function buildParams() {
    const sp = new URLSearchParams();
    if (year.value) sp.set('year', year.value);
    if (area.value) sp.set('area_id', area.value);
    if (type.value) sp.set('type_id', type.value);
    if (q.value.trim()) sp.set('q', q.value.trim());
    if (past.value === 'true') sp.set('past', 'true');
    if (past.value === 'false') sp.set('past', 'false');
    sp.set('page', String(page));
    sp.set('limit', String(limit));
    return sp;
  }

  function pushURL() {
    const sp = buildParams();
    const url = `${location.pathname}?${sp.toString()}`;
    history.pushState(null, '', url);
  }

  function render(items) {
    if (!items.length) {
      list.innerHTML = `<p style="grid-column:1/-1; color:#64748b;">No events match your filters.</p>`;
      return;
    }
    list.innerHTML = items.map(ev => `
      <article class="card">
        <header class="card-head">
          <h3>${escapeHtml(ev.title)}</h3>
          <small>${fmt(ev.date)} &middot; ${escapeHtml(ev.area || '')} ${ev.isPast ? '<span class="badge">Past</span>' : ''}</small>
        </header>
        <p>${escapeHtml(ev.description || '').slice(0, 180)}${(ev.description||'').length>180?'…':''}</p>
        <footer class="card-foot">
          <a class="btn" href="/events/${ev.id}">View details</a>
        </footer>
      </article>
    `).join('');
  }

  async function load() {
    list.setAttribute('aria-busy', 'true');
    try {
      const sp = buildParams();
      const res = await fetch(`/api/events?${sp.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      render(data.items || []);
      const total = +data.total || 0;
      const maxPage = Math.max(1, Math.ceil(total / limit));
      prev.disabled = page <= 1;
      next.disabled = page >= maxPage;
      summary.textContent = total ? `${total} event${total===1?'':'s'} found` : '';
      pushURL();
    } catch (err) {
      console.error(err);
      list.innerHTML = `<p style="grid-column:1/-1; color:#b91c1c;">Could not load events. ${escapeHtml(err.message||err)}</p>`;
    } finally {
      list.removeAttribute('aria-busy');
    }
  }

  // Events
  form.addEventListener('change', () => { page = 1; load(); });
  q.addEventListener('input', debounce(() => { page = 1; load(); }, 300));
  prev.addEventListener('click', () => { if (page>1) { page--; load(); } });
  next.addEventListener('click', () => { page++; load(); });

  window.addEventListener('popstate', () => {
    // When user presses back/forward, re-parse URL and reload
    const u = new URL(location.href);
    year.value = u.searchParams.get('year') || '';
    area.value = u.searchParams.get('area_id') || '';
    type.value = u.searchParams.get('type_id') || '';
    q.value    = u.searchParams.get('q') || '';
    const p    = u.searchParams.get('past');
    past.value = (p === 'true' || p === 'false') ? p : '';
    page = +(u.searchParams.get('page') || 1);
    load();
  });

  // Helpers
  function fmt(iso) {
    try { return new Date(iso).toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'}); }
    catch { return iso; }
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Initial load
  document.addEventListener('DOMContentLoaded', load);
})();
