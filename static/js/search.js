
/*! olympiad-site search.js (drop-in) */
(function () {
  const CSS_HREF = "/static/css/peacock-theme.css";
  function ensureThemeCss() {
    try {
      const already = Array.from(document.styleSheets).some(s => (s.href||"").includes("peacock-theme.css"));
      if (!already) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = CSS_HREF + "?v=1";
        document.head.appendChild(link);
      }
    } catch (e) { /* noop */ }
  }
  function norm(s) {
    return (s||"")
      .toLowerCase()
      .replace(/[ё]/g,"е")
      .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/\s+/g," ").trim();
  }
  function getTitleFromCard(card){
    let t = card.getAttribute("data-title");
    if (t && t.trim()) return t;
    // common title selectors
    const el = card.querySelector(".card-title, h3, h4, .title, .card__title");
    if (el) return el.textContent || "";
    return card.textContent || "";
  }
  function highlight(el, query){
    // remove old marks
    el.querySelectorAll("mark.hl").forEach(m=>{
      const parent = m.parentNode;
      if (!parent) return;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
    if (!query) return;
    const q = norm(query);
    if (!q) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      const txt = norm(node.nodeValue);
      const idx = txt.indexOf(q);
      if (idx === -1) return;
      const span = document.createElement("span");
      const orig = node.nodeValue;
      span.appendChild(document.createTextNode(orig.slice(0, idx)));
      const mark = document.createElement("mark");
      mark.className = "hl";
      mark.textContent = orig.slice(idx, idx + query.length);
      span.appendChild(mark);
      span.appendChild(document.createTextNode(orig.slice(idx + query.length)));
      node.parentNode.replaceChild(span, node);
    });
  }
  function createSearchBar(mount){
    const wrap = document.createElement("div");
    wrap.className = "searchbar-wrap";
    wrap.innerHTML = `
      <input id="searchInput" class="searchbar-input" type="search" placeholder="Поиск по названию…" autocomplete="off" />
      <button class="searchbar-clear" title="Очистить" aria-label="Очистить">&times;</button>
      <div class="no-results" style="display:none;">Ничего не найдено</div>
    `;
    mount.parentNode.insertBefore(wrap, mount);
    wrap.querySelector(".searchbar-clear").addEventListener("click", () => {
      const inp = wrap.querySelector("#searchInput");
      inp.value = "";
      inp.dispatchEvent(new Event("input"));
      inp.focus();
    });
    return wrap;
  }
  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); };}
  function boot() {
    ensureThemeCss();
    // find container of cards
    let list = document.querySelector("#eventsList");
    if (!list) {
      // find first container that has event-card children
      list = Array.from(document.querySelectorAll("main, .container, .content, body")).find(c => c.querySelector && c.querySelector(".event-card"));
    }
    if (!list) return; // nothing to do
    // ensure cards have aria labels and cache titles
    const cards = Array.from(list.querySelectorAll(".event-card"));
    if (!cards.length) return;
    const bar = document.getElementById("searchInput") ? document.getElementById("searchInput").closest(".searchbar-wrap") : createSearchBar(list);
    const input = bar.querySelector("#searchInput");
    const emptyView = bar.querySelector(".no-results");
    const doFilter = () => {
      const q = input.value;
      let visibleCount = 0;
      cards.forEach(card=>{
        // clear previous highlights only inside titles
        const titleEl = card.querySelector(".card-title, h3, h4, .title, .card__title") || card;
        highlight(titleEl, ""); // clear
        const title = getTitleFromCard(card);
        const hit = norm(title).includes(norm(q));
        card.style.display = hit ? "" : "none";
        if (hit) {
          visibleCount++;
          highlight(titleEl, q);
        }
      });
      emptyView.style.display = visibleCount ? "none" : "";
    };
    const deb = debounce(doFilter, 120);
    input.addEventListener("input", deb);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        input.value = "";
        input.dispatchEvent(new Event("input"));
      }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
