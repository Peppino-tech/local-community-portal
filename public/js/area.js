// public/js/area.js
(function () {
  const results = document.getElementById('area-results');
  const form = document.getElementById('areaFilters');
  const selYear = document.getElementById('af-year');
  const selPast = document.getElementById('af-past');

  function canonicalAreaName(s) {
    const raw = String(s || '').toLowerCase().trim();

    // Normalize many slug/name variants into the DB display names
    if (!raw) return '';
    if (/^sports?$/.test(raw)) return 'Sports';
    if (/^health$/.test(raw)) return 'Health';
    if (/^education$/.test(raw)) return 'Education';
    if (
      /^arts$/.test(raw) ||
      /^arts\s*&\s*culture$/.test(raw) ||
      /^arts\s*and\s*culture$/.test(raw)
    ) return 'Arts & Culture';

    // Last-ditch: if it includes both “arts” and “culture”, treat as Arts & Culture
    if (/arts/.test(raw) && /culture/.test(raw)) return 'Arts & Culture';
    return '';
  }

  function getAreaForApi() {
    // 1) Prefer server-injected name
    if (typeof window.__AREA_NAME__ === 'string' && window.__AREA_NAME__.trim()) {
      return window.__AREA_NAME__.trim();
    }

    // 2) Parse from /areas/<slug> (tolerant parsing)
    const m = location.pathname.match(/\/areas\/([^/?#]+)/i);
    if (m && m[1]) {
      const decoded = decodeURIComponent(m[1])
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/&/g, 'and'); // make "&" and "and" equivalent
      return canonicalAreaName(decoded);
    }
    return '';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return iso; }
  }

  function render(items) {
    if (!results) return;
    if (!items.length) {
      results.innerHTML = '<p>No events found for these filters.</p>';
      return;
    }
    results.innerHTML = items.map(ev => {
      const title = escapeHtml(ev.title);
      const dateStr = formatDate(ev.date);
      const badge = ev.isPast ? '<span class="badge badge-past">Past</span>'
                              : '<span class="badge badge-upcoming">Upcoming</span>';
      const img = escapeHtml(ev.image_url || '');
      return `
        <article class="tile">
          <div class="tile-media" style="${img ? `--bg:url('${img}')` : ''}"></div>
          <div class="tile-body">
            <a class="tile-title" href="/events/${ev.id}">${title}</a>
            <p class="meta"><time datetime="${escapeHtml(ev.date)}">${dateStr}</time> ${badge}</p>
            ${ev.summary ? `<p>${escapeHtml(ev.summary)}</p>` : ''}
          </div>
        </article>
      `;
    }).join('');
  }

  async function load() {
    if (!results) return;
    results.setAttribute('aria-busy', 'true');
    try {
      const area = getAreaForApi();
      if (!area) {
        results.innerHTML = '<p style="color:#b00">Missing area name.</p>';
        return;
      }
      const params = new URLSearchParams();
      params.set('area', area);
      if (selYear && selYear.value) params.set('year', selYear.value);
      if (selPast && selPast.checked) params.set('past', '1');

      const res = await fetch(`/api/area-events?${params.toString()}`);
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

  if (form) form.addEventListener('change', load);
  document.addEventListener('DOMContentLoaded', load);
})();
