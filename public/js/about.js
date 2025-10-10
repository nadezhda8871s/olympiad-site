/* js/about.js */
(function () {
  const el = document.getElementById('about-content');
  fetch('/api/about')
    .then(r => r.json())
    .then(({ customText }) => el && (el.textContent = customText || 'Пока текст не добавлен.'))
    .catch(() => el && (el.textContent = 'Не удалось загрузить текст.'));
})();
