/* js/admin.js */
(function () {
  const yearEls = document.querySelectorAll('#year');
  yearEls.forEach(el => el.textContent = new Date().getFullYear());

  // About
  const aboutForm = document.getElementById('edit-about-form');
  const aboutTextarea = document.getElementById('about-text');
  async function loadAbout() {
    const r = await fetch('/api/about'); const d = await r.json();
    if (aboutTextarea) aboutTextarea.value = d.customText || '';
  }
  aboutForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const customText = aboutTextarea.value;
    const r = await fetch('/api/about', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ customText })});
    if (r.ok) { alert('Текст сохранён'); loadAbout(); } else { alert('Ошибка сохранения'); }
  });

  // Events list
  const eventsList = document.getElementById('events-list');
  const editSection = document.getElementById('edit-event-section');
  const editForm = document.getElementById('edit-event-form');
  const editType = document.getElementById('edit-type');
  const editQuestions = document.getElementById('edit-questions');
  const editAddQ = document.getElementById('edit-add-question');
  const editClearQ = document.getElementById('edit-clear-questions');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const infoLetterFile = document.getElementById('info-letter-file');
  const infoLetterUploadBtn = document.getElementById('info-letter-upload');
  const infoLetterCurrent = document.getElementById('info-letter-current');

  function qBlock(q={}) {
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
    `;
    const answersEl = wrap.querySelector('.answers');
    const options = Array.isArray(q.options) && q.options.length ? q.options : ['', '', '', ''];
    options.slice(0,4).forEach((opt, idx) => {
      const row = document.createElement('div');
      row.style.display = 'grid';
      row.style.gridTemplateColumns = '1fr auto';
      row.style.gap = '.5rem';
      row.style.alignItems = 'center';
      row.style.margin = '.25rem 0';
      row.innerHTML = `
        <input type="text" class="ans" value="${(opt || '').replace(/"/g,'&quot;')}" placeholder="Вариант ${idx+1}" />
        <label style="display:flex;align-items:center;gap:.25rem;"><input type="radio" name="correct-${Math.random().toString(36).slice(2,8)}" ${idx === (q.correctIndex ?? 0) ? 'checked' : ''}/> Правильный</label>
      `;
      answersEl.appendChild(row);
    });
    return wrap;
  }

  function collectQuestions(container) {
    const blocks = Array.from(container.querySelectorAll('.question-block'));
    return blocks.slice(0,15).map(block => {
      const answersRows = Array.from(block.querySelectorAll('.answers > div'));
      const group = 'g' + Math.random().toString(36).slice(2,8);
      answersRows.forEach(r => { r.querySelector('input[type="radio"]').name = group; });
      const text = block.querySelector('.q-text').value.trim();
      const options = answersRows.map(r => r.querySelector('.ans').value.trim()).slice(0,4);
      while (options.length < 4) options.push('');
      const correctIndex = answersRows.findIndex(r => r.querySelector('input[type="radio"]').checked);
      return { text, options, correctIndex: correctIndex >= 0 ? correctIndex : 0 };
    }).filter(q => q.text);
  }

  async function loadEvents() {
    const r = await fetch('/api/events'); const data = await r.json();
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
          <button data-action="edit" data-id="${ev.id}" style="margin-right:.5rem;background:linear-gradient(120deg,#17a2b8,#138496)">Редактировать</button>
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
      if (res.ok) loadEvents(); else alert('Ошибка удаления');
      return;
    }

    if (action === 'edit') {
      const res = await fetch('/api/events/' + encodeURIComponent(id));
      if (!res.ok) return alert('Не удалось загрузить мероприятие');
      const ev = await res.json();
      editForm.elements['id'].value = ev.id;
      editForm.elements['name'].value = ev.name || '';
      editForm.elements['type'].value = ev.type || 'olympiad';
      editForm.elements['description'].value = ev.description || '';

      if (ev.infoLetterFileName) {
        infoLetterCurrent.innerHTML = `Текущее: <a href="/api/events/${encodeURIComponent(ev.id)}/info-letter">${ev.infoLetterOriginalName || ev.infoLetterFileName}</a>`;
      } else {
        infoLetterCurrent.textContent = 'Файл не прикреплён';
      }

      editQuestions.innerHTML = '';
      if ((ev.type || '') === 'olympiad') {
        const tRes = await fetch('/api/tests/' + encodeURIComponent(ev.id));
        const test = await tRes.json();
        const list = Array.isArray(test?.questions) ? test.questions : [];
        if (!list.length) {
          editQuestions.appendChild(qBlock());
        } else {
          list.forEach(q => editQuestions.appendChild(qBlock(q)));
        }
      }
      toggleTestSection();
      editSection.style.display = '';
      window.scrollTo({ top: editSection.offsetTop - 20, behavior: 'smooth' });
    }
  });

  function toggleTestSection() {
    const inner = document.getElementById('edit-test-section-inner');
    inner.style.display = (editType.value === 'olympiad') ? '' : 'none';
  }
  editType?.addEventListener('change', toggleTestSection);

  editAddQ?.addEventListener('click', () => {
    const cnt = editQuestions.querySelectorAll('.question-block').length;
    if (cnt >= 15) { alert('Не более 15 вопросов'); return; }
    editQuestions.appendChild(qBlock());
  });
  editClearQ?.addEventListener('click', () => { editQuestions.innerHTML=''; });

  cancelEditBtn?.addEventListener('click', () => {
    editSection.style.display = 'none';
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
      description: fd.get('description')
    };
    if (payload.type === 'olympiad') {
      const qs = collectQuestions(editQuestions);
      payload.test = { questions: qs };
    }
    const r = await fetch('/api/events/' + encodeURIComponent(id), {
      method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
    });
    if (!r.ok) return alert('Ошибка сохранения');
    if (payload.type === 'olympiad') {
      await fetch('/api/tests/' + encodeURIComponent(id), {
        method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ questions: payload.test.questions })
      });
    }
    alert('Сохранено');
    editSection.style.display = 'none';
    editForm.reset();
    editQuestions.innerHTML = '';
    loadEvents();
  });

  infoLetterUploadBtn?.addEventListener('click', async () => {
    const id = editForm.elements['id'].value;
    if (!id) return alert('Сначала загрузите мероприятие для редактирования');
    const file = infoLetterFile.files[0];
    if (!file) return alert('Выберите файл');
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/api/events/' + encodeURIComponent(id) + '/info-letter', { method:'POST', body: fd });
    if (r.ok) {
      const d = await r.json();
      infoLetterCurrent.innerHTML = `Текущее: <a href="/uploads/${encodeURIComponent(d.fileName)}">${d.originalName || d.fileName}</a>`;
      alert('Файл загружен');
    } else {
      const { error } = await r.json().catch(()=>({}));
      alert(error || 'Ошибка загрузки');
    }
  });

  // Registrations table
  const regsTBody = document.querySelector('#registrations-table tbody');
  const downloadBtn = document.getElementById('download-registrations-btn');
  async function loadRegistrations() {
    const r = await fetch('/api/registrations'); const data = await r.json();
    regsTBody.innerHTML = data.map(r => `
      <tr>
        <td>${new Date(r.createdAt).toLocaleString()}</td>
        <td>${r.eventName || r.eventId}</td>
        <td>${r.eventType || ''}</td>
        <td>${r.fullName}</td>
        <td>${r.email}</td>
        <td>${r.city}</td>
        <td>${r.country}</td>
        <td>${r.phone}</td>
        <td>${r.organization}</td>
        <td>${r.supervisor}</td>
        <td>${(r.payment && r.payment.status) || 'pending'}</td>
      </tr>
    `).join('');
  }
  downloadBtn?.addEventListener('click', () => { window.location.href = '/api/registrations.csv'; });

  Promise.all([loadAbout(), loadEvents(), loadRegistrations()]).catch(console.error);
})();
