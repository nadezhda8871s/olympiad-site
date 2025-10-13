/*! search.js minimal */
(function(){
  function $(sel){return document.querySelector(sel);}
  function debounce(fn, wait){let t;return function(){clearTimeout(t);t=setTimeout(()=>fn.apply(this, arguments), wait);}}
  function norm(s){return (s||'').toLowerCase().replace(/[ё]/g,'е').replace(/\s+/g,' ').trim();}
  function collectCards(){
    return Array.from(document.querySelectorAll('.card')).map(c=>({el:c,title:(c.querySelector('h3')||c).textContent||''}));
  }
  function filter(){
    const q = norm($('#event-search')?.value||$('#globalSearch')?.value||'');
    const cards = collectCards();
    cards.forEach(({el,title})=>{
      const show = !q || norm(title).includes(q);
      el.style.display = show ? '' : 'none';
    });
  }
  const handler = debounce(filter, 200);
  document.addEventListener('input', function(e){
    if(e.target && (e.target.id==='event-search' || e.target.id==='globalSearch')) handler();
  });
})();
