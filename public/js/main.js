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
            // Тип в URL может быть olympiad, contest, conference
            // Фильтр может быть olympiad-students, olympiad-school, olympiad-teachers
            // Нужно сопоставить. Пусть фильтр добавляет ?filter=тип
            // или просто меняет отображение на клиенте, если сервер возвращает все.
            // Для простоты, будем фильтровать на клиенте.
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
        displayEvents(events);
    } catch (error) {
        console.error("Error loading events:", error);
        document.getElementById('events-container').innerHTML = '<p>Ошибка загрузки мероприятий.</p>';
    }
}

// Отображение мероприятий в контейнере
function displayEvents(events) {
    const container = document.getElementById('events-container');
    if (!container) return; // Защита, если элемент не найден

    container.innerHTML = ''; // Очищаем контейнер

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
    // Этот код работает, если мы сначала загрузили все мероприятия для типа (например, все олимпиады)
    // и теперь фильтруем по подтипу (students, school, teachers).
    // Предположим, что в data.json у каждого мероприятия есть поле subtype
    // или мы можем определить его по названию или описанию.
    // Пока что, просто покажем все, если фильтр не определен, или покажем пустое.
    // Для полноценной фильтрации, сервер должен возвращать subtype или фильтровать.
    // Или нужно хранить исходный список и фильтровать его.
    // Пусть для олимпиад subtype будет "olympiad-students", "olympiad-school", "olympiad-teachers"
    // и т.д. для конкурсов и конференций.
    // Тогда сервер может возвращать subtype, и мы его фильтруем.
    // Загрузим снова с типом, если это главная, или с текущим типом и подтипов.
    // Проще всего: на странице олимпиад, загрузить все олимпиады, а затем фильтровать.
    // Для этого нужно, чтобы loadEvents вернула список, который можно фильтровать.
    // Изменим логику: loadEvents сохраняет исходный список в переменную.
    // Тогда filterEvents может его использовать.
    // --- Псевдокод ---
    // if (filterType === 'olympiad-students') {
    //     displayEvents(originalEvents.filter(e => e.type === 'olympiad' && e.subtype === 'students'));
    // } else if (filterType === 'olympiad-school') {
    //     displayEvents(originalEvents.filter(e => e.type === 'olympiad' && e.subtype === 'school'));
    // }
    // и т.д.
    // Пока что, просто загрузим мероприятия заново с типом, если на главной.
    // Или, если на странице типа (olympiads), то фильтруем по подтипу.
    // Текущий тип можно определить по URL.
    const currentPath = window.location.pathname;
    if (currentPath === '/') {
        // На главной, фильтруем по основному типу
        if (filterType.startsWith('olympiad')) {
            loadEvents('olympiad');
        } else if (filterType.startsWith('contest')) {
            loadEvents('contest');
        } else if (filterType.startsWith('conference')) {
            loadEvents('conference');
        }
    } else {
        // На странице типа (olympiads, contests, conferences), фильтруем по подтипу
        // Пока что, просто покажем сообщение, что фильтр не реализован на клиенте.
        // Нужно модифицировать server.js и data.json.
        // Добавим поле subtype.
        // И изменим loadEvents, чтобы она могла фильтровать по subtype тоже.
        // loadEvents('olympiad', 'students')
        // или
        // loadEvents('olympiad', filterType) // где filterType - olympiad-students
        // Для простоты, пусть subtype будет частью type, например, "olympiad-students"
        // и сервер фильтрует по нему.
        // fetch(`/api/events?type=${filterType}`)
        loadEvents(filterType);
    }
}

// Фильтрация по поиску (на клиенте)
function filterEventsBySearch(query) {
    // Требуется хранить исходный список
    // Псевдокод:
    // displayEvents(originalEvents.filter(e => e.name.toLowerCase().includes(query.toLowerCase()) || e.description.toLowerCase().includes(query.toLowerCase())));
    // Пока что, просто покажем сообщение.
    console.log("Search functionality on client side is not fully implemented yet.");
    // На практике, лучше отправлять запрос на сервер с query.
    // fetch(`/api/events?q=${query}`)
    // и сервер уже фильтрует.
    // Или использовать fuse.js для поиска на клиенте.
}


// Переход на страницу регистрации
function goToRegistration(eventId) {
    window.location.href = `/registration/${eventId}`;
}

// Функция для скачивания информационного письма
// function downloadInfoLetter(fileName) {
//     window.location.href = `/uploads/${fileName}`;
// }
// (Это можно сделать через ссылку в HTML, как в displayEvents)
