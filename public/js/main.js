(function () {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const eventsContainer = document.getElementById('events-container');
  const searchInput = document.getElementById('search-input-main');
  const searchBtn = document.getElementById('search-button-main');
  const filterButtons = document.querySelectorAll('.filter-btn');

  let currentType = '';
  let currentSearch = '';

  function escapeHTML(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderEvents(list) {
    if (!list.length) {
      eventsContainer.innerHTML = '<p>Пока нет мероприятий.</p>';
      return;
    }
    eventsContainer.innerHTML = list.map(ev => {
      const desc = escapeHTML(ev.description || '');
      return `
        <article class="event-card">
          <h3>${escapeHTML(ev.name)}</h3>
          <div class="event-description">${desc}</div>
          <div class="event-actions">
            <a class="btn-info" href="#" data-action="details" data-id="${ev.id}">Подробнее</a>
            <button class="btn-register" data-action="register" data-id="${ev.id}" data-name="${escapeHTML(ev.name)}">Зарегистрироваться</button>
          </div>
        </article>
      `;
    }).join('');
  }

  async function loadEvents() {
    const params = new URLSearchParams();
    if (currentType) params.set('type', currentType);
    if (currentSearch) params.set('search', currentSearch);
    const res = await fetch('/api/events?' + params.toString());
    const data = await res.json();
    renderEvents(data);
  }

  // Filters
  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentType = btn.dataset.type || '';
      loadEvents();
    });
  });

  // Search
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      currentSearch = String(searchInput.value || '').trim();
      loadEvents();
    });
  }
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        currentSearch = String(searchInput.value || '').trim();
        loadEvents();
      }
    });
  }

  // Registration dialog
  const dialog = document.getElementById('register-dialog');
  const regForm = document.getElementById('register-form');
  const regCancel = document.getElementById('reg-cancel');

  function openRegister(eventId) {
    document.getElementById('reg-event-id').value = eventId;
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open','');
    }
  }
  function closeRegister() {
    if (typeof dialog.close === 'function') dialog.close();
    dialog.removeAttribute('open');
    regForm.reset();
  }

  regCancel?.addEventListener('click', (e) => {
    e.preventDefault();
    closeRegister();
  });

  regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('reg-event-id').value;
    const fullName = document.getElementById('reg-fullname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    if (!fullName || !email) return;

    const res = await fetch(`/api/events/${encodeURIComponent(id)}/register`, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ fullName, email, phone })
    });
    if (!res.ok) {
      alert('Ошибка при регистрации');
      return;
    }
    const data = await res.json();
    closeRegister();
    // Резерв на оплату Robokassa: переходим на заглушку
    if (data.paymentUrl) window.location.href = data.paymentUrl;
  });

  // Click handlers on cards
  eventsContainer?.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    e.preventDefault();
    const id = target.getAttribute('data-id');
    const action = target.getAttribute('data-action');
    if (action === 'register') {
      openRegister(id);
    } else if (action === 'details') {
      // Пока просто покажем alert. Здесь можно сделать модалку с подробностями/пригласительным письмом
      window.alert('Краткое описание доступно на карточке. При необходимости добавим страницу деталей.');
    }
  });

  // Initial
  loadEvents();
})();
