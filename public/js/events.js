/* global fetch */
document.addEventListener('DOMContentLoaded', () => {
  const grid   = document.getElementById('events-results');
  const yearEl = document.getElementById('ev-year');
  const areaEl = document.getElementById('ev-area');
  const pastEl = document.getElementById('ev-past');
  const qEl    = document.getElementById('ev-q');
  const prevEl = document.getElementById('ev-prev');
  const nextEl = document.getElementById('ev-next');

  let page = 1;
  let t = null;

  function areaSlug(name) {
    return String(name || 'sports').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function cardHTML(ev) {
    const img  = ev.image_url || ('/images/areas/' + areaSlug(ev.area) + '.jpg');
    const date = new Date(ev.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const badgeClass = ev.isPast ? 'badge-past' : 'badge-upcoming';
    const badgeText  = ev.isPast ? 'Past' : 'Upcoming';

    return (
      '<a class="event-card" href="/events/' + ev.id + '" style="--bg:url(\'' + img + '\')">' +
        '<div class="event-card__body">' +
          '<h3 class="event-card__title">' + escapeHtml(ev.title) + '</h3>' +
          '<p class="event-card__meta">' + escapeHtml(date) + ' · ' + escapeHtml(ev.area || '') + '</p>' +
          '<span class="badge ' + badgeClass + '">' + badgeText + '</span>' +
          (ev.summary ? '<p class="event-card__summary">' + escapeHtml(ev.summary) + '</p>' : '') +
        '</div>' +
      '</a>'
    );
  }

  function render(items) {
    if (!items || !items.length) {
      grid.innerHTML = '<p style="padding:1rem;">No events found.</p>';
      return;
    }
    grid.innerHTML = items.map(cardHTML).join('');
  }

  async function load() {
    if (!grid) return;
    grid.setAttribute('aria-busy', 'true');
    try {
      const params = new URLSearchParams();
      if (yearEl && yearEl.value) params.set('year', yearEl.value);
      if (areaEl && areaEl.value) params.set('area_id', areaEl.value);
      if (pastEl && pastEl.checked) params.set('past', '1');
      if (qEl && qEl.value.trim()) params.set('q', qEl.value.trim());
      params.set('page', String(page));
      params.set('limit', '12');

      const res = await fetch('/api/events?' + params.toString());
      const data = await res.json();
      render((data && data.items) ? data.items : []);
    } catch (err) {
      console.error(err);
      grid.innerHTML = '<p style="color:#b00;padding:1rem;">Failed to load events.</p>';
    } finally {
      grid.removeAttribute('aria-busy');
    }
  }

  // Filters
  [yearEl, areaEl, pastEl].forEach(function (el) {
    if (el) el.addEventListener('change', function () { page = 1; load(); });
  });

  if (qEl) {
    qEl.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () { page = 1; load(); }, 250);
    });
  }

  // Pager
  if (prevEl) {
    prevEl.addEventListener('click', function () {
      if (page > 1) { page -= 1; load(); }
    });
  }
  if (nextEl) {
    nextEl.addEventListener('click', function () {
      page += 1; load();
    });
  }

  // Initial refresh (replaces SSR when filters change)
  load();
});
