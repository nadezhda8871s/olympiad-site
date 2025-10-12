
window.performGlobalSearch = function(){
  const q = (document.getElementById('globalSearch')?.value || '').trim().toLowerCase();
  const list = document.querySelectorAll('.card, .event-card, .item'); // support various patterns
  let matches = 0;
  list.forEach(el => {
    const titleEl = el.querySelector('.card-title, .title, h3, h2');
    const t = (titleEl?.textContent || '').toLowerCase();
    const ok = q === '' || t.includes(q);
    el.style.display = ok ? '' : 'none';
    // highlight
    if (titleEl){
      const raw = titleEl.textContent;
      if (q && t.includes(q)){
        const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
        titleEl.innerHTML = raw.replace(re, '<mark>$1</mark>');
      }else{
        titleEl.innerHTML = raw;
      }
    }
    if (ok) matches++;
  });
  return false;
};

// Debounced typing
(function(){
  const i = document.getElementById('globalSearch');
  if(!i) return;
  let to = null;
  i.addEventListener('input', () => {
    clearTimeout(to);
    to = setTimeout(() => window.performGlobalSearch(), 160);
  });
})();
