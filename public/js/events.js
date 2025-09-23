// public/js/events.js
(function () {
  const list    = document.getElementById('eventsList');
  const form    = document.getElementById('eventsFilters');
  const yearEl  = document.getElementById('ev-year');
  const areaEl  = document.getElementById('ev-area');
  const typeEl  = document.getElementById('ev-type');
  const qEl     = document.getElementById('ev-q');
  const pastEl  = document.getElementById('ev-past');
  const prevBtn = document.getElementById('ev-prev');
  const nextBtn = document.getElementById('ev-next');
  const summary = document.getElementById('ev-summary');

  if (!list || !form) return;

  let page = 1;
  const limit = 12;

  function paramsFromUI() {
    return {
      year:    yearEl?.value || "",
      area_id: areaEl?.value || "",
      type_id: typeEl?.value || "",
      q:       qEl?.value || "",
      past:    pastEl?.checked ? "1" : "0",
      page:    String(page),
      limit:   String(limit)
    };
  }

  function updateURL(params) {
    const url = new URL(location.href);
    Object.entries(params).forEach(([k, v]) => {
      if (v && v !== "0") url.searchParams.set(k, v);
      else url.searchParams.delete(k);
    });
    history.replaceState({}, "", url.toString());
  }

  async function load() {
    const params = paramsFromUI();
    updateURL(params);
    const qs = new URLSearchParams(params).toString();

    list.innerHTML = "<p>Loading…</p>";
    try {
      const res = await fetch(`/api/events?${qs}`, { headers: { "Accept": "application/json" } });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.items)) {
        throw new Error((data && data.error) || "Failed to load events.");
      }
      render(data.items, data.total || data.items.length);
    } catch (err) {
      list.innerHTML = `<p class="error-message">${escapeHtml(err.message)}</p>`;
    }
  }

  function isPast(isoDate) {
    const d = new Date(isoDate);
    const today = new Date();
    d.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    return d < today;
  }

  function render(items, total) {
    summary.textContent = `${total} result${total === 1 ? "" : "s"}${qEl && qEl.value ? ` for “${qEl.value}”` : ""}`;

    if (!items.length) {
      list.innerHTML = "<p>No events match your filters.</p>";
      return;
    }

    list.innerHTML = items.map(ev => {
      const pastBadge = (typeof ev.isPast === "boolean" ? ev.isPast : isPast(ev.date))
        ? `<span class="badge badge-past" aria-label="Past event">Past</span>`
        : `<span class="badge badge-upcoming" aria-label="Upcoming event">Upcoming</span>`;

      return `
        <article class="card">
          <h3><a href="/events/${encodeURIComponent(ev.id)}">${escapeHtml(ev.title)}</a></h3>
          <p class="meta">
            <time datetime="${escapeHtml(ev.date)}">${fmt(ev.date)}</time>
            • ${escapeHtml(ev.area || "")}
            ${ev.type ? ` • ${escapeHtml(ev.type)}` : ""}
          </p>
          <p>${escapeHtml(ev.summary || ev.description || "").slice(0,160)}${(ev.summary||ev.description||"").length>160?"…":""}</p>
          <div class="labels">${pastBadge}</div>
        </article>`;
    }).join("");
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  // Wire up controls
  form.addEventListener("change", () => { page = 1; load(); });
  qEl && qEl.addEventListener("input", debounce(() => { page = 1; load(); }, 250));
  prevBtn && prevBtn.addEventListener("click", () => { if (page > 1) { page--; load(); } });
  nextBtn && nextBtn.addEventListener("click", () => { page++; load(); });

  // Handle back/forward navigation
  window.addEventListener("popstate", () => {
    const u = new URL(location.href);
    yearEl && (yearEl.value = u.searchParams.get('year') || '');
    areaEl && (areaEl.value = u.searchParams.get('area_id') || '');
    typeEl && (typeEl.value = u.searchParams.get('type_id') || '');
    qEl && (qEl.value = u.searchParams.get('q') || '');
    pastEl && (pastEl.checked = u.searchParams.get('past') === '1');
    page = parseInt(u.searchParams.get('page') || '1', 10) || 1;
    load();
  });

  // Helpers
  function fmt(iso) {
    try { return new Date(iso).toLocaleDateString('en-GB', {year:'numeric', month:'short', day:'numeric'}); }
    catch { return iso; }
  }
  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[c]));
  }

  // Initial load
  document.addEventListener("DOMContentLoaded", load);
})();
