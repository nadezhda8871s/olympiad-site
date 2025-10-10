(function () {
  const yearEls = document.querySelectorAll('#year');
  yearEls.forEach(el => el.textContent = new Date().getFullYear());

  const eventsContainer = document.getElementById('events-container');

  function escapeHTML(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function ensureDialog() {
    let dialog = document.getElementById('register-dialog');
    if (dialog) return dialog;

    // Создаём модалку динамически, если её нет на странице
    dialog = document.createElement('dialog');
    dialog.id = 'register-dialog';
    dialog.innerHTML = `
      <form id="register-form" method="dialog" style="min-width:min(90vw,520px)">
        <h3>Регистрация на мероприятие</h3>
        <input type="hidden" id="reg-event-id" />
        <label>ФИО <input type="text" id="reg-fullname" required /></label>
        <label>E-mail <input type="email" id="reg-email" required /></label>
        <label>Город <input type="text" id="reg-city" required /></label>
        <label>Страна <input type="text" id="reg-country" required /></label>
        <label>Номер телефона <input type="tel" id="reg-phone" required /></label>
        <label>Учебное заведение <input type="text" id="reg-organization" required /></label>
        <label>ФИО Научного руководителя (преподавателя) <input type="text" id="reg-supervisor" required /></label>
        <div style="display:flex; gap:.5rem;">
          <button type="submit" class="btn-register">Отправить</button>
          <button type="button" id="reg-cancel" class="btn-info">Отмена</button>
        </div>
        <p style="font-size:.9em;color:#6c757d;margin-top:.5rem;">
          Отправляя форму вы соглашаетесь с <a href="/docs/Политика_конфиденциальности.docx" download>политикой конфиденциальности</a> и <a href="/docs/Оферта.docx" download>офертой</a>.
        </p>
      </form>
    `;
    document.body.appendChild(dialog);

    const regCancel = dialog.querySelector('#reg-cancel');
    const regForm = dialog.querySelector('#register-form');

    function closeRegister() {
      if (typeof dialog.close === 'function') dialog.close();
      dialog.removeAttribute('open');
      regForm.reset();
    }
    regCancel?.addEventListener('click', (e) => { e.preventDefault(); closeRegister(); });

    regForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('reg-event-id').value;
      const fullName = document.getElementById('reg-fullname').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const city = document.getElementById('reg-city').value.trim();
      const country = document.getElementById('reg-country').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const organization = document.getElementById('reg-organization').value.trim();
      const supervisor = document.getElementById('reg-supervisor').value.trim();

      const res = await fetch(`/api/events/${encodeURIComponent(id)}/register`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ fullName, email, city, country, phone, organization, supervisor })
      });
      if (!res.ok) {
        const { error } = await res.json().catch(()=>({}));
        alert(error || 'Ошибка при регистрации');
        return;
      }
      const data = await res.json();
      if (data.paymentUrl) window.location.href = data.paymentUrl;
    });

    return dialog;
  }

  function infoLetterBtn(ev) {
    if (ev.infoLetterFileName) {
      return `<a class="btn-info" href="/api/events/${encodeURIComponent(ev.id)}/info-letter">Информационное письмо</a>`;
    }
    return `<a class="btn-info" style="pointer-events:none;opacity:.6">Письмо недоступно</a>`;
  }

  function renderEvents(list) {
    if (!eventsContainer) return;
    if (!list.length) {
      eventsContainer.innerHTML = '<p>Пока нет мероприятий.</p>';
      return;
    }
    eventsContainer.innerHTML = list.map(ev => `
      <article class="event-card">
        <h3>${escapeHTML(ev.name)}</h3>
        <div class="event-description">${escapeHTML(ev.description || '')}</div>
        <div class="event-actions">
          ${infoLetterBtn(ev)}
          <button class="btn-register" data-action="register" data-id="${ev.id}">Регистрация</button>
        </div>
      </article>
    `).join('');
  }

  async function fetchEvents(type, search) {
    const params = new URLSearchParams();
    if (type && !/-/.test(type)) params.set('type', type); // type only (not subtype)
    if (search) params.set('search', search);
    const res = await fetch('/api/events?' + params.toString());
    return res.json();
  }

  async function load(typeOrSubtype, search) {
    const all = await fetchEvents(typeOrSubtype && typeOrSubtype.split('-')[0], search);
    // subtype filtering on client
    let list = all;
    if (typeOrSubtype && /-/.test(typeOrSubtype)) {
      list = all.filter(ev => (ev.subtype || '').toLowerCase() === String(typeOrSubtype).toLowerCase());
    }
    renderEvents(list);
  }

  // Expose global for inline calls in your pages
  window.loadEvents = load;

  // Filters & search if present
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const dtype = btn.dataset.type || '';
      load(dtype, (document.getElementById('search-input')||{}).value || '');
    });
  });

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const active = document.querySelector('.filter-btn.active');
        const dtype = active ? (active.dataset.type || '') : '';
        load(dtype, searchInput.value.trim());
      }
    });
  }

  // Click handlers for registration button
  eventsContainer?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action="register"]');
    if (!btn) return;
    const dialog = ensureDialog();
    document.getElementById('reg-event-id').value = btn.getAttribute('data-id');
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open','');
  });

})();
