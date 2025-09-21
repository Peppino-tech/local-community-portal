// public/js/events.js
(function () {
  const els = {
    list: document.getElementById('events-list'),
    total: document.getElementById('events-total'),
    pager: document.getElementById('events-pager'),
    form:  document.getElementById('events-filters'),
    year:  document.getElementById('ev-year'),
    area:  document.getElementById('ev-area'),
    type:  document.getElementById('ev-type'),
    q:     document.getElementById('ev-q'),
    past:  document.getElementById('ev-past'),
    limit: document.getElementById('ev-limit') || { value: 12 }
  };

  function applyFromUrl() {
    const u = new URL(location.href);
    const get = (id) => u.searchParams.get(id) || '';
    setIf(els.year, get('year'));
    setIf(els.area, get('area_id'));
    setIf(els.type, get('type_id'));
    setIf(els.q,    get('q'));
    setIf(els.past, get('past'));
  }
  function setIf(el, v) { if (el && v !== '') el.value = v; }

  function buildQuery(page=1) {
    const p = new URLSearchParams();
    if (els.year.value) p.set('year', els.year.value);
    if (els.area.value) p.set('area_id', els.area.value);
    if (els.type.value) p.set('type_id', els.type.value);
    if (els.q.value.trim()) p.set('q', els.q.value.trim());
    if (els.past.value) p.set('past', els.past.value);
    p.set('page', String(page));
    p.set('limit', String(els.limit.value || 12));
    return p;
  }

  async function load(page=1, push=true) {
    els.list.setAttribute('aria-busy', 'true');
    const qs = buildQuery(page);
    const res = await fetch(`/api/events?${qs.toString()}`);
    const data = await res.json();
    renderList(data.items || []);
    renderPager(data.page, Math.ceil((data.total || 0) / (data.limit || 12)));
    els.total.textContent = String(data.total || 0);
    els.list.removeAttribute('aria-busy');

    if (push) {
      const url = new URL(location.href);
      url.search = qs.toString();
      history.pushState({ page }, '', url);
    }
  }

  function renderList(items) {
    if (!items.length) {
      els.list.innerHTML = '<p>No matching events.</p>';
      return;
    }
    els.list.innerHTML = items.map(ev => `
      <article class="card">
        <header class="card-head">
          <h3>${escapeHtml(ev.title)}</h3>
          <small>${formatDate(ev.date)} — ${ev.isPast ? 'Past' : 'Upcoming'}${ev.type ? ` · ${escapeHtml(ev.type)}` : ''}</small>
        </header>
        <p>${escapeHtml(ev.description || '').slice(0, 180)}${ev.description && ev.description.length > 180 ? '…' : ''}</p>
        <footer class="card-foot">
          <a class="btn" href="/events/${ev.id}">View details</a>
        </footer>
      </article>
    `).join('');
  }

  function renderPager(page, pages) {
    if (!els.pager) return;
    if (pages <= 1) { els.pager.innerHTML = ''; return; }
    let html = '';
    const mk = (p, label, dis=false) =>
      `<button class="page-btn" data-page="${p}" ${dis?'disabled':''} aria-label="Go to page ${p}">${label}</button>`;
    html += mk(1, '« First', page===1);
    html += mk(Math.max(1, page-1), '‹ Prev', page===1);
    for (let i = Math.max(1, page-2); i <= Math.min(pages, page+2); i++) {
      html += `<button class="page-btn ${i===page?'active':''}" data-page="${i}" aria-current="${i===page?'page':'false'}">${i}</button>`;
    }
    html += mk(Math.min(pages, page+1), 'Next ›', page===pages);
    html += mk(pages, 'Last »', page===pages);
    els.pager.innerHTML = html;
  }

  els.form?.addEventListener('change', () => load(1, true));
  els.form?.addEventListener('submit', (e) => { e.preventDefault(); load(1, true); });
  els.pager?.addEventListener('click', (e) => {
    const btn = e.target.closest('.page-btn');
    if (!btn) return;
    const p = Number(btn.dataset.page || '1');
    load(p, true);
  });

  window.addEventListener('popstate', () => {
    applyFromUrl();
    const u = new URL(location.href);
    const p = Number(u.searchParams.get('page') || '1');
    load(p, false);
  });

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return iso; }
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyFromUrl();
    const u = new URL(location.href);
    const p = Number(u.searchParams.get('page') || '1');
    load(p, false);
  });
})();
