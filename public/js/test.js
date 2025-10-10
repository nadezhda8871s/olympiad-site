/* js/test.js */
(function () {
  function qs(name) {
    const p = new URLSearchParams(window.location.search);
    return p.get(name);
  }
  const eventIdParam = qs('event');
  const regId = qs('reg');

  const form = document.getElementById('test-form');
  const questionsContainer = document.getElementById('questions-container');
  const resultEl = document.getElementById('test-result');
  const resultText = document.getElementById('result-text');

  function buildQuestion(q, i) {
    const block = document.createElement('div');
    block.className = 'about-section';
    block.style.margin = '1em 0';
    const answers = (q.options || []).slice(0,4).map((opt, idx) => `
      <label style="display:flex;align-items:center;gap:.5rem;margin:.25em 0;">
        <input type="radio" name="q${i}" value="${idx}" required />
        <span>${opt}</span>
      </label>
    `).join('');
    block.innerHTML = `
      <h3>Вопрос ${i+1}</h3>
      <p style="margin:.5em 0 1em 0;">${q.text}</p>
      <div>${answers}</div>
    `;
    return block;
  }

  async function init() {
    const eventIdInput = document.getElementById('event-id');
    const eventId = eventIdParam || (eventIdInput ? eventIdInput.value.trim() : '');
    if (!eventId) {
      questionsContainer.textContent = 'Не указан идентификатор мероприятия.';
      return;
    }
    if (eventIdInput) eventIdInput.value = eventId;

    const r = await fetch('/api/tests/' + encodeURIComponent(eventId));
    const d = await r.json();
    const questions = Array.isArray(d.questions) ? d.questions.slice(0,15) : [];
    if (!questions.length) {
      questionsContainer.innerHTML = '<p>Для данной олимпиады тест пока не добавлен.</p>';
      form.style.display = 'none';
      return;
    }
    questionsContainer.innerHTML = '';
    questions.forEach((q,i) => questionsContainer.appendChild(buildQuestion(q,i)));
    form.style.display = '';

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const answers = [];
      for (let i=0;i<questions.length;i++) {
        const v = fd.get(`q${i}`);
        answers.push(v !== null ? Number(v) : -1);
      }
      const rr = await fetch('/api/tests/' + encodeURIComponent(eventId) + '/submit', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ regId, answers })
      });
      const res = await rr.json();
      resultEl.style.display = '';
      resultText.innerHTML = `Ваш результат: <strong>${res.score}</strong> из <strong>${res.total}</strong>.<br/>Пожалуйста, отправьте чек на <a href="mailto:vsemnayka@gmail.com">vsemnayka@gmail.com</a>. В скором времени придут наградные документы.`;
      window.scrollTo({ top: resultEl.offsetTop - 20, behavior: 'smooth' });
    });
  }

  init().catch(() => {
    questionsContainer.textContent = 'Ошибка загрузки теста';
  });
})();
