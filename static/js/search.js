(function() {
  const input = document.getElementById('event-search');
  const box = document.getElementById('search-suggestions');
  if (!input || !box) return;

  let last = '';
  input.addEventListener('input', async () => {
    const q = input.value.trim();
    if (q === '') { box.style.display='none'; return; }
    if (q === last) return; last = q;
    try {
      const r = await fetch('/api/search?q=' + encodeURIComponent(q));
      const data = await r.json();
      const results = data.results || [];
      if (!results.length) { box.style.display='none'; return; }
      box.innerHTML = results.map(item => {
        const t = item.title;
        const i = t.toLowerCase().indexOf(q.toLowerCase());
        let highlighted = t;
        if (i >= 0) {
          const before = t.slice(0, i);
          const match = t.slice(i, i + q.length);
          const after  = t.slice(i + q.length);
          highlighted = `${before}<mark>${match}</mark>${after}`;
        }
        return `<div class="item" data-url="${item.url}">${highlighted}</div>`;
      }).join('');
      box.style.display = 'block';
      box.querySelectorAll('.item').forEach(el => {
        el.addEventListener('click', () => { window.location = el.dataset.url; });
      });
    } catch (e) {
      box.style.display='none';
    }
  });

  document.addEventListener('click', (ev) => {
    if (!box.contains(ev.target) && ev.target !== input) box.style.display = 'none';
  });
})();
