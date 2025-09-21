// public/js/area.js
(function () {
  const results = document.getElementById('area-results');
  const form = document.getElementById('areaFilters');
  const selYear = document.getElementById('af-year');
  const selPast = document.getElementById('af-past');

  function getAreaForApi() {
    // Prefer server-injected name, else read slug from /areas/<slug>
    const injected = (window.__AREA_NAME__ || '').trim();
    if (injected) return injected;

    const m = location.pathname.match(/\/areas\/(sports|health|education|arts)/i);
    const slug = m ? m[1].toLowerCase() : '';
    const map = { sports: 'Sports', health: 'Health', education: 'Education', arts: 'Arts & Culture' };
    return map[slug] || '';
  }

  function render(items) {
    if (!items.length) {
      results.innerHTML = '<p>No events found for these filters.</p>';
      return;
    }
    results.innerHTML = items.map(ev => `
      <article class="card">
        <header class="card-head">
          <h3>${escapeHtml(ev.title)}</h3>
          <small>${formatDate(ev.date)} — ${ev.isPast ? 'Past' : 'Upcoming'}</small>
        </header>
        <p>${escapeHtml(ev.description || '').slice(0, 180)}${ev.description && ev.description.length > 180 ? '…' : ''}</p>
        <footer class="card-foot">
          <a class="btn" href="/events/${ev.id}">View details</a>
        </footer>
      </article>
    `).join('');
  }

  async function load() {
    results.setAttribute('aria-busy', 'true');
    try {
      const area = getAreaForApi();
      const params = new URLSearchParams();
      if (area) params.set('area', area);
      if (selYear.value) params.set('year', selYear.value);
      if (selPast.value) params.set('past', selPast.value);

      const url = `/api/area-events?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      render(data.items || []);
    } catch (err) {
      console.error('Area load error:', err);
      results.innerHTML = `<p style="color:#b00">Sorry, couldn’t load events. ${escapeHtml(String(err.message || err))}</p>`;
    } finally {
      results.removeAttribute('aria-busy');
    }
  }

  form.addEventListener('change', load);
  document.addEventListener('DOMContentLoaded', load);

  // helpers
  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return iso; }
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
})();
