// main.js
document.addEventListener('DOMContentLoaded', () => {
    // Загружаем мероприятия для главной страницы
    if (window.location.pathname === '/') {
        loadEvents();
    }

    // Обработчики для фильтров на страницах олимпиад, конкурсов, конференций
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const type = button.getAttribute('data-type');
            filterEvents(type);
        });
    });

    // Обработчик для поиска
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterEventsBySearch(e.target.value);
        });
    }
});

// Загрузка мероприятий с сервера
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
        document.getElementById('events-container').innerHTML = '<p>Ошибка загрузки мероприятий.</p>';
    }
}

// Отображение мероприятий в контейнере
function displayEvents(events) {
    const container = document.getElementById('events-container');
    if (!container) return;

    container.innerHTML = '';

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

// Фильтрация мероприятий (на клиенте)
function filterEvents(filterType) {
    if (!window.originalEvents) {
        console.error("Original events list not available");
        return;
    }
    // Предполагаем, что subtype совпадает с filterType
    const filtered = window.originalEvents.filter(e => e.subtype === filterType);
    displayEvents(filtered);
}

// Фильтрация по поиску (на клиенте)
function filterEventsBySearch(query) {
    if (!window.originalEvents) {
        console.error("Original events list not available");
        return;
    }
    const filtered = window.originalEvents.filter(e =>
        e.name.toLowerCase().includes(query.toLowerCase()) ||
        e.description.toLowerCase().includes(query.toLowerCase())
    );
    displayEvents(filtered);
}

// Переход на страницу регистрации
function goToRegistration(eventId) {
    window.location.href = `/registration/${eventId}`;
}
