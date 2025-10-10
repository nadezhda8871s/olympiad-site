/* public/js/about.js */
(function () {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const aboutEl = document.getElementById('about-content');
  fetch('/api/about')
    .then(r => r.json())
    .then(({ customText }) => {
      aboutEl.textContent = customText || 'Пока текст не добавлен.';
    })
    .catch(() => {
      aboutEl.textContent = 'Не удалось загрузить текст.';
    });
})();
