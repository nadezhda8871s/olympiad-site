(function(){
  const input = document.getElementById('searchInput');
  if(!input) return;

  const normalize = s => (s||"").toLowerCase().trim();

  input.addEventListener('input', function(){
    const q = normalize(this.value);
    document.querySelectorAll('.card, .tile').forEach(el => {
      const title = normalize((el.querySelector('.card-title,.tile-title')||{}).textContent||"");
      if(!q){ el.classList.remove('is-hidden','is-match'); return; }
      if(title.includes(q)){ el.classList.add('is-match'); el.classList.remove('is-hidden'); }
      else { el.classList.remove('is-match'); el.classList.add('is-hidden'); }
    });
  });
})();
