
/**
 * Live search with debounced input, unicode/diacritics normalization,
 * and match highlighting. Works on any page that has:
 *  - an input#searchInput
 *  - a container with cards having the class .event-card
 * Each card should have either:
 *  - data-title="..." attribute, OR
 *  - a child element with .card-title containing the title text
 */
(function () {
  const $input = document.getElementById('searchInput');
  if (!$input) return; // page has no search

  const $cards = Array.from(document.querySelectorAll('.event-card'));
  const $empty = document.getElementById('noResults') || createEmptyStub();

  function createEmptyStub() {
    const el = document.createElement('div');
    el.id = 'noResults';
    el.style.display = 'none';
    el.className = 'no-results';
    el.textContent = 'Ничего не найдено';
    const list = document.getElementById('eventsList') || document.body;
    list.parentNode.insertBefore(el, list.nextSibling);
    return el;
  }

  // Simple debounce
  let t = null;
  const debounce = (fn, ms=120) => (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(null, args), ms);
  };

  // Normalize: case-insensitive, trim, collapse spaces, replace ё->е, drop diacritics
  const norm = (s) => (s || '')
    .toString()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Extract title text for a card
  const getTitle = (card) => {
    const dataTitle = card.getAttribute('data-title');
    if (dataTitle) return dataTitle;
    const titleNode = card.querySelector('.card-title, h3, h4, [data-role="title"]');
    return titleNode ? titleNode.textContent : card.textContent;
  };

  // Remove previous highlights
  function clearHighlights(card) {
    card.querySelectorAll('mark.hl').forEach(m => {
      const parent = m.parentNode;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
  }

  // Highlight all matches (simple, safe; not running on attributes, only in .card-title areas)
  function highlight(card, q) {
    clearHighlights(card);
    if (!q) return;
    const titleNode = card.querySelector('.card-title, h3, h4, [data-role="title"]') || card;
    const walk = (node) => {
      if (node.nodeType === 3) { // text
        const src = node.nodeValue;
        const srcNorm = norm(src);
        const idx = srcNorm.indexOf(q);
        if (idx >= 0) {
          // Map normalized index to original by slicing lengths
          // Build a rough matcher ignoring diacritics by using RegExp on original
          try {
            const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const re = new RegExp(safe, 'i');
            const m = re.exec(src);
            const start = m ? m.index : idx;
            const end = start + (m ? m[0].length : q.length);
            const before = document.createTextNode(src.slice(0, start));
            const mark = document.createElement('mark');
            mark.className = 'hl';
            mark.textContent = src.slice(start, end);
            const after = document.createTextNode(src.slice(end));
            const frag = document.createDocumentFragment();
            frag.appendChild(before);
            frag.appendChild(mark);
            frag.appendChild(after);
            node.parentNode.replaceChild(frag, node);
          } catch(e) {}
        }
      } else if (node.nodeType === 1 && node.childNodes) {
        node.childNodes.forEach(walk);
      }
    };
    walk(titleNode);
  }

  function applyFilter(qRaw) {
    const q = norm(qRaw);
    let shown = 0;
    $cards.forEach(card => {
      const title = norm(getTitle(card));
      const match = !q || title.includes(q);
      card.style.display = match ? '' : 'none';
      if (match) {
        shown++;
        highlight(card, q);
      } else {
        clearHighlights(card);
      }
    });
    $empty.style.display = shown ? 'none' : '';
  }

  // Initial
  applyFilter($input.value);

  // Events
  $input.addEventListener('input', debounce((e) => applyFilter(e.target.value), 120));

  // Allow clearing by ESC
  $input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $input.value = '';
      applyFilter('');
      $input.blur();
    }
  });
})();
