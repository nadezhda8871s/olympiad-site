(function () {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // --- "О нас" -------------------------------------------------
  const aboutForm = document.getElementById('edit-about-form');
  const aboutTextarea = document.getElementById('about-text');

  async function loadAbout() {
    const res = await fetch('/api/about');
    const data = await res.json();
    aboutTextarea.value = data.customText || '';
  }
  aboutForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const customText = aboutTextarea.value;
    const res = await fetch('/api/about', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ customText })
    });
    if (res.ok) {
      alert('Текст сохранён');
      await loadAbout();
    } else {
      alert('Ошибка сохранения');
    }
  });

  // --- Вспомогательные функции для тестов ---------------------
  function createQuestionBlock(q = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'question-block';
    wrap.style.border = '1px solid var(--border-color)';
    wrap.style.borderRadius = '6px';
    wrap.style.padding = '1em';
    wrap.style.marginBottom = '.75em';
    wrap.innerHTML = `
      <label>Текст вопроса
        <input type="text" class="q-text" value="${(q.text || '').replace(/"/g,'&quot;')}" required />
      </label>
      <div class="answers"></div>
      <button type="button" class="btn-add-answer" style="margin:.25em 0;">Добавить вариант</button>
      <button type="button" class="btn-remove-q" style="margin:.25em 0;">Удалить вопрос</button>
    `;

    const answersEl = wrap.querySelector('.answers');
    // стартовые варианты
    const options = Array.isArray(q.options) && q.options.length ? q.options : ['', '', '', ''];
    options.forEach((opt, idx) => {
      addAnswerRow(answersEl, opt, idx === (q.correctIndex ?? 0));
    });

    wrap.querySelector('.btn-add-answer').addEventListener('click', () => addAnswerRow(answersEl, '', false));
    wrap.querySelector('.btn-remove-q').addEventListener('click', () => wrap.remove());

    return wrap;
  }

  function addAnswerRow(container, value = '', checked = false) {
    const row = document.createElement('div');
    row.style.display = 'grid';
    row.style.gridTemplateColumns = '1fr auto auto';
    row.style.gap = '.5rem';
    row.style.alignItems = 'center';
    row.style.margin = '.25rem 0';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'ans';
    input.value = value;

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'correct-' + Math.random().toString(36).slice(2, 8);
    radio.checked = checked;
    // ensure group radio within one question
    // we'll fix radio grouping by resetting names for each question before reading

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = '×';
    delBtn.title = 'Удалить вариант';
    delBtn.style.padding = '.2rem .6rem';

    delBtn.addEventListener('click', () => row.remove());

    row.appendChild(input);
    row.appendChild(radio);
    row.appendChild(delBtn);
    container.appendChild(row);
  }

  function collectQuestions(container) {
    const blocks = Array.from(container.querySelectorAll('.question-block'));
    return blocks.map(block => {
      // normalize radio names per question
      const answersRows = Array.from(block.querySelectorAll('.answers > div'));
      const radioName = 'correct-' + Math.random().toString(36).slice(2, 8);
      answersRows.forEach(r => {
        const radio = r.querySelector('input[type="radio"]');
        radio.name = radioName;
      });

      const text = block.querySelector('.q-text').value.trim();
      const options = answersRows.map(r => r.querySelector('.ans').value.trim()).filter(Boolean);
      const correctIndex = answersRows.findIndex(r => r.querySelector('input[type="radio"]').checked);
      return { text, options, correctIndex: correctIndex >= 0 ? correctIndex : 0 };
    }).filter(q => q.text && q.options.length);
  }

  // --- Создание мероприятия -----------------------------------
  const createForm = document.getElementById('create-event-form');
  const createType = document.getElementById('create-type');
  const createTestSection = document.getElementById('create-test-section');
  const createQuestions = document.getElementById('create-questions');
  const createAddQ = document.getElementById('create-add-question');

  function toggleCreateTestSection() {
    if (createType.value === 'olympiad') {
      createTestSection.style.display = '';
    } else {
      createTestSection.style.display = 'none';
    }
  }
  createType?.addEventListener('change', toggleCreateTestSection);
  createAddQ?.addEventListener('click', () => createQuestions.appendChild(createQuestionBlock()));

  createForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(createForm);
    const payload = {
      name: fd.get('name'),
      type: fd.get('type'),
      description: fd.get('description'),
      startDate: fd.get('startDate'),
      endDate: fd.get('endDate')
    };
    if (payload.type === 'olympiad') {
      const questions = collectQuestions(createQuestions);
      payload.test = { questions };
    }
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert('Создано');
      createForm.reset();
      createQuestions.innerHTML = '';
      toggleCreateTestSection();
      await loadEvents();
    } else {
      alert('Ошибка создания');
    }
  });

  // --- Список мероприятий + редактирование --------------------
  const eventsList = document.getElementById('events-list');
  const editSection = document.getElementById('edit-event-section');
  const editForm = document.getElementById('edit-event-form');
  const editType = document.getElementById('edit-type');
  const editQuestions = document.getElementById('edit-questions');
  const editAddQ = document.getElementById('edit-add-question');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const createSection = document.getElementById('create-event-section');

  function toggleEditTestSection() {
    const inner = document.getElementById('edit-test-section-inner');
    inner.style.display = (editType.value === 'olympiad') ? '' : 'none';
  }
  editType?.addEventListener('change', toggleEditTestSection);
  editAddQ?.addEventListener('click', () => editQuestions.appendChild(createQuestionBlock()));

  async function loadEvents() {
    const res = await fetch('/api/events');
    const data = await res.json();
    eventsList.innerHTML = '';
    data.forEach(ev => {
      const item = document.createElement('div');
      item.className = 'event-item';
      item.innerHTML = `
        <div>
          <strong>${ev.name}</strong><br/>
          <small>${ev.type || ''}</small>
        </div>
        <div>
          <button data-action="edit" data-id="${ev.id}" style="margin-right:.5rem;background:linear-gradient(120deg, #17a2b8, #138496);">Редактировать</button>
          <button data-action="delete" data-id="${ev.id}">Удалить</button>
        </div>
      `;
      eventsList.appendChild(item);
    });
  }

  eventsList?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    const action = btn.getAttribute('data-action');

    if (action === 'delete') {
      if (!confirm('Удалить мероприятие?')) return;
      const res = await fetch('/api/events/' + encodeURIComponent(id), { method: 'DELETE' });
      if (res.ok) {
        await loadEvents();
      } else {
        alert('Ошибка удаления');
      }
    }

    if (action === 'edit') {
      const res = await fetch('/api/events/' + encodeURIComponent(id));
      if (!res.ok) return alert('Не удалось загрузить мероприятие');
      const ev = await res.json();

      // заполняем форму редактирования
      editForm.elements['id'].value = ev.id;
      editForm.elements['name'].value = ev.name || '';
      editForm.elements['type'].value = ev.type || 'olympiad';
      editForm.elements['description'].value = ev.description || '';
      editForm.elements['startDate'].value = ev.startDate || '';
      editForm.elements['endDate'].value = ev.endDate || '';

      // подгружаем тест (если есть)
      editQuestions.innerHTML = '';
      if ((ev.type || '') === 'olympiad') {
        const tRes = await fetch('/api/tests/' + encodeURIComponent(ev.id));
        const test = await tRes.json();
        const list = Array.isArray(test?.questions) ? test.questions : [];
        if (!list.length) {
          editQuestions.appendChild(createQuestionBlock());
        } else {
          list.forEach(q => editQuestions.appendChild(createQuestionBlock(q)));
        }
      }
      toggleEditTestSection();

      // показать секцию редактирования и скрыть создание
      editSection.style.display = '';
      createSection.style.display = 'none';
      window.scrollTo({ top: editSection.offsetTop - 20, behavior: 'smooth' });
    }
  });

  cancelEditBtn?.addEventListener('click', () => {
    editSection.style.display = 'none';
    createSection.style.display = '';
    editForm.reset();
    editQuestions.innerHTML = '';
  });

  editForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(editForm);
    const id = fd.get('id');
    const payload = {
      name: fd.get('name'),
      type: fd.get('type'),
      description: fd.get('description'),
      startDate: fd.get('startDate'),
      endDate: fd.get('endDate')
    };
    if (payload.type === 'olympiad') {
      const questions = collectQuestions(editQuestions);
      payload.test = { questions };
    }
    const res = await fetch('/api/events/' + encodeURIComponent(id), {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      alert('Сохранено');
      editSection.style.display = 'none';
      createSection.style.display = '';
      editForm.reset();
      editQuestions.innerHTML = '';
      await loadEvents();
    } else {
      alert('Ошибка сохранения');
    }
  });

  // --- Регистрации --------------------------------------------
  const regsTBody = document.querySelector('#registrations-table tbody');
  const downloadBtn = document.getElementById('download-registrations-btn');

  async function loadRegistrations() {
    const res = await fetch('/api/registrations');
    const data = await res.json();
    regsTBody.innerHTML = data.map(r => `
      <tr>
        <td>${new Date(r.createdAt).toLocaleString()}</td>
        <td>${r.eventName || r.eventId}</td>
        <td>${r.fullName}</td>
        <td>${r.email}</td>
        <td>${r.phone || ''}</td>
        <td>${(r.payment && r.payment.status) || 'pending'}</td>
      </tr>
    `).join('');
  }

  downloadBtn?.addEventListener('click', () => {
    window.location.href = '/api/registrations.csv';
  });

  // init
  Promise.all([loadAbout(), loadEvents(), loadRegistrations()]).catch(console.error);
})();
