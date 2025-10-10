// public/js/main.js
document.addEventListener('DOMContentLoaded', () => {
    const eventsContainer = document.getElementById('events-container');
    const filtersContainer = document.querySelector('.filters');
    const searchInput = document.getElementById('search-input');
    const errorMessage = document.getElementById('error-message'); // Предполагается, что есть элемент для ошибок

    // Загружаем мероприятия при загрузке страницы
    loadEvents();

    // Обработчики для фильтров (если они есть на странице)
    if (filtersContainer) {
        const filterButtons = filtersContainer.querySelectorAll('.filter-btn');
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                filterButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                const type = button.getAttribute('data-type');
                filterEvents(type);
            });
        });
    }

    // Обработчик для поиска (если он есть на странице)
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterEventsBySearch(e.target.value);
        });
    }

    // --- Убедимся, что goToRegistration доступна глобально ---
    window.goToRegistration = function(eventId) {
        window.location.href = `/registration/${eventId}`;
    }
    // --- Конец goToRegistration ---
});

async function loadEvents(type = null) {
    try {
        let url = '/api/events';
        if (type) {
            url += `?type=${type}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const events = await response.json();
        // Сохраняем оригинальный список для фильтрации
        window.originalEvents = events;
        displayEvents(events);
    } catch (error) {
        console.error("Error loading events:", error);
        const eventsContainer = document.getElementById('events-container');
        if (eventsContainer) {
            eventsContainer.innerHTML = '<p>Ошибка загрузки мероприятий.</p>';
        }
    }
}

function displayEvents(events) {
    const container = document.getElementById('events-container');
    if (!container) return;

    container.innerHTML = '';

    if (events.length === 0) {
        container.innerHTML = '<p>Мероприятия не найдены.</p>';
        return;
    }

    events.forEach(event => {
        const eventCard = document.createElement('div');
        eventCard.className = 'event-card';
        eventCard.innerHTML = `
            <h3>${event.name}</h3>
            <p class="event-description">${event.description}</p>
            <div class="event-actions">
                ${event.infoLetterFileName ? `<a href="/uploads/${event.infoLetterFileName}" class="btn-info" target="_blank">Информационное письмо</a>` : '<span>Письмо скоро</span>'}
                <button class="btn-register" onclick="goToRegistration('${event.id}')">Регистрация</button>
            </div>
        `;
        container.appendChild(eventCard);
    });
}

function filterEvents(filterType) {
    if (!window.originalEvents) {
        console.error("Original events list not available");
        return;
    }
    // Предполагаем, что subtype совпадает с filterType
    // Для "все" показываем все мероприятия
    const filtered = filterType === 'all' ? window.originalEvents : window.originalEvents.filter(e => e.subtype === filterType);
    displayEvents(filtered);
}

function filterEventsBySearch(query) {
    if (!window.originalEvents) {
        console.error("Original events list not available");
        return;
    }
    if (!query) {
        // Если запрос пустой, показываем все мероприятия
        displayEvents(window.originalEvents);
        return;
    }
    const filtered = window.originalEvents.filter(e =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.description.toLowerCase().includes(query.toLowerCase())
    );
    displayEvents(filtered);
}
