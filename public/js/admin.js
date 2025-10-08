// admin.js
document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const adminPanel = document.getElementById('admin-panel');
    const loginForm = document.getElementById('admin-login-form');
    const addEventForm = document.getElementById('add-event-form');
    const eventsList = document.getElementById('events-list');
    const logoutBtn = document.getElementById('logout-btn');
    const errorMessage = document.getElementById('error-message');

    // Проверка сессии при загрузке
    checkSession();

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(loginForm);
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();
            if (data.success) {
                loginSection.style.display = 'none';
                adminPanel.style.display = 'block';
                loadEventsList(); // Загружаем список мероприятий
            } else {
                errorMessage.textContent = data.message || 'Неверный логин или пароль.';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Login error:", error);
            errorMessage.textContent = 'Ошибка при попытке входа.';
            errorMessage.style.display = 'block';
        }
    });

    addEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addEventForm);
        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                body: formData // FormData автоматически устанавливает Content-Type multipart/form-data
            });

            if (response.ok) {
                addEventForm.reset(); // Очищаем форму
                loadEventsList(); // Обновляем список
                errorMessage.style.display = 'none'; // Скрываем ошибки
            } else {
                const errorData = await response.json();
                errorMessage.textContent = errorData.error || 'Ошибка при добавлении мероприятия.';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Add event error:", error);
            errorMessage.textContent = 'Ошибка при добавлении мероприятия.';
            errorMessage.style.display = 'block';
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/admin/logout', {
                method: 'POST'
            });

            if (response.ok) {
                adminPanel.style.display = 'none';
                loginSection.style.display = 'block';
                eventsList.innerHTML = ''; // Очищаем список
                errorMessage.style.display = 'none'; // Скрываем ошибки
            }
        } catch (error) {
            console.error("Logout error:", error);
        }
    });

    async function checkSession() {
        // Простая проверка - пытаемся получить список мероприятий.
        // Если сервер вернет 401 Unauthorized, значит сессия неактивна.
        try {
            const response = await fetch('/api/events');
            if (response.status === 200) {
                // Предполагаем, что если запрос прошел, сессия может быть активна
                // На самом деле, для проверки сессии администратора, нужен отдельный эндпоинт.
                // Или админка может загружаться с сервера, а не как статичный файл.
                // Пока что, просто покажем админку, если файл загрузился.
                // Лучше: fetch('/api/admin/check-session')
                // Или: проверить, есть ли в localStorage/cookie признак админа (менее надежно).
                // Для простоты, будем считать, что пользователь сам управляет доступом к /admin.
                // Сервер проверяет сессию на каждом вызове API, защищенного requireAdmin.
                // Поэтому, если пользователь вручную откроет /admin, он не сможет вызвать API.
                // Но сам HTML файла он увидит.
                // В реальном приложении, админка должна быть защищена сервером.
                // Для Render, можно хранить пароль в секрете, и проверять его при доступе к /admin.
                // Но это усложнит логику.
                // Пусть пока будет так: админка - это HTML, а API защищено.
                // Проверим сессию через API.
                const responseCheck = await fetch('/api/events'); // Это защищенный маршрут
                if (responseCheck.status === 401) {
                    // Не авторизован
                    adminPanel.style.display = 'none';
                    loginSection.style.display = 'block';
                } else if (responseCheck.status === 200) {
                    // Авторизован
                    adminPanel.style.display = 'block';
                    loginSection.style.display = 'none';
                    loadEventsList();
                }
            } else if (response.status === 401) {
                 adminPanel.style.display = 'none';
                 loginSection.style.display = 'block';
            }
        } catch (error) {
            console.error("Session check error:", error);
            adminPanel.style.display = 'none';
            loginSection.style.display = 'block';
        }
    }

    async function loadEventsList() {
        try {
            const response = await fetch('/api/events');
            if (!response.ok) {
                if (response.status === 401) {
                    // Сессия истекла
                    adminPanel.style.display = 'none';
                    loginSection.style.display = 'block';
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const events = await response.json();
            eventsList.innerHTML = ''; // Очищаем список
            events.forEach(event => {
                const eventItem = document.createElement('div');
                eventItem.className = 'event-item';
                eventItem.innerHTML = `
                    <div>
                        <strong>${event.name}</strong> (${event.type})
                        ${event.infoLetterFileName ? `<br><small>Файл: ${event.infoLetterFileName}</small>` : '<br><small>Файл: нет</small>'}
                    </div>
                    <button onclick="deleteEvent('${event.id}')">Удалить</button>
                `;
                eventsList.appendChild(eventItem);
            });
        } catch (error) {
            console.error("Error loading events list:", error);
            errorMessage.textContent = 'Ошибка загрузки списка мероприятий.';
            errorMessage.style.display = 'block';
        }
    }

    // Глобальная функция для удаления (чтобы работал onclick в HTML)
    window.deleteEvent = async function(eventId) {
        if (!confirm('Вы уверены, что хотите удалить это мероприятие?')) return;

        try {
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadEventsList(); // Обновляем список
                errorMessage.style.display = 'none'; // Скрываем ошибки
            } else {
                const errorData = await response.json();
                errorMessage.textContent = errorData.error || 'Ошибка при удалении мероприятия.';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Delete event error:", error);
            errorMessage.textContent = 'Ошибка при удалении мероприятия.';
            errorMessage.style.display = 'block';
        }
    };
});
