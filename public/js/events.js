document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#filters');
  if (!form) return;

  const results = document.querySelector('#results');
  const prev = document.querySelector('#prev');
  const next = document.querySelector('#next');
  const pageInfo = document.querySelector('#pageInfo');

  let page = 1, limit = 12, total = 0;

  function params() {
    const fd = new FormData(form);
    const obj = Object.fromEntries(fd.entries());
    const usp = new URLSearchParams({ ...obj, page, limit });
    for (const [k,v] of Array.from(usp.entries())) if (v === '') usp.delete(k);
    return usp.toString();
  }

  async function load() {
    results.innerHTML = '<div class="card">Loading…</div>';
    const res = await fetch(`/api/events?${params()}`);
    const data = await res.json();
    total = data.total;
    render(data.items);
    updatePager();
  }

  function render(items) {
    if (!items.length) {
      results.innerHTML = '<div class="card">No events match your filters.</div>';
      return;
    }
    results.innerHTML = items.map(ev => `
      <article class="card">
        <h3><a href="/events/${ev.id}">${ev.title}</a></h3>
        <p class="meta">
          <strong>${new Date(ev.date).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</strong>
          • ${ev.area}${ev.type ? ' • ' + ev.type : ''}
          ${ev.isPast ? ' • <span aria-label="past event">Past</span>' : ''}
        </p>
        <p>${ev.description}</p>
        <a class="btn-outline" href="/events/${ev.id}">Details</a>
      </article>
    `).join('');
  }

  function updatePager() {
    const maxPage = Math.max(1, Math.ceil(total / limit));
    pageInfo.textContent = `Page ${page} of ${maxPage} (${total} total)`;
    prev.disabled = page <= 1;
    next.disabled = page >= maxPage;
  }

  form.addEventListener('input', () => { page = 1; load(); });
  prev.addEventListener('click', () => { if (page > 1) { page--; load(); } });
  next.addEventListener('click', () => { page++; load(); });

  load();
});