// admin.js
document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const adminPanel = document.getElementById('admin-panel');
    const loginForm = document.getElementById('admin-login-form');
    const addEventForm = document.getElementById('add-event-form');
    const eventsList = document.getElementById('events-list');
    const logoutBtn = document.getElementById('logout-btn');
    const errorMessage = document.getElementById('error-message');

    console.log("Admin page loaded, checking session..."); // Лог для отладки

    // Проверка сессии при загрузке
    checkSession();

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log("Login form submitted"); // Лог для отладки
        const formData = new FormData(loginForm);
        try {
            // ИСПРАВЛЕНО: добавлено credentials: 'include' для запроса входа
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                body: formData,
                credentials: 'include' // <-- ВАЖНО: отправлять куки сессии
            });

            console.log("Login response status:", response.status); // Лог для отладки

            // Попробуем обработать ответ как JSON
            let data;
            if (response.headers.get("Content-Type")?.includes("application/json")) {
                data = await response.json();
                console.log("Login response JSON:", data); // Лог для отладки
            } else {
                // Если сервер вернул текст (например, "Unauthorized"), обработаем это
                const responseText = await response.text();
                console.error("Login response (non-JSON):", responseText);
                throw new Error(`Non-JSON response: ${responseText}`);
            }

            if (response.ok && data.success) {
                loginSection.style.display = 'none';
                adminPanel.style.display = 'block';
                loadEventsList(); // Загружаем список мероприятий
                errorMessage.style.display = 'none'; // Скрываем возможные предыдущие ошибки
                console.log("Login successful, showing admin panel"); // Лог для отладки
            } else {
                // Обработка ошибки, если сервер вернул JSON с success: false или другой статус
                errorMessage.textContent = data.message || 'Неверный логин или пароль.';
                errorMessage.style.display = 'block';
                console.log("Login failed with message:", data.message); // Лог для отладки
            }
        } catch (error) {
            console.error("Login error:", error);
            // Обработка ошибки сети или парсинга JSON
            errorMessage.textContent = 'Ошибка при попытке входа (проверьте консоль).';
            errorMessage.style.display = 'block';
        }
    });

    addEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log("Add event form submitted"); // Лог для отладки
        const formData = new FormData(addEventForm);
        try {
            // ИСПРАВЛЕНО: добавлено credentials: 'include' для запроса добавления
            const response = await fetch('/api/events', {
                method: 'POST',
                body: formData, // FormData автоматически устанавливает Content-Type multipart/form-data
                credentials: 'include' // <-- ВАЖНО: отправлять куки сессии
            });

            console.log("Add event response status:", response.status); // Лог для отладки

            if (response.ok) {
                const result = await response.json(); // Ожидаем JSON при успехе
                addEventForm.reset(); // Очищаем форму
                loadEventsList(); // Обновляем список
                errorMessage.style.display = 'none'; // Скрываем ошибки
                console.log("Event added successfully:", result);
            } else {
                // Обработка ошибки, если сервер вернул JSON с ошибкой
                if (response.headers.get("Content-Type")?.includes("application/json")) {
                    const errorData = await response.json();
                    errorMessage.textContent = errorData.error || 'Ошибка при добавлении мероприятия.';
                } else {
                    // Если сервер вернул текст (например, "Unauthorized")
                    const errorText = await response.text();
                    console.error("Add event response (non-JSON):", errorText);
                    errorMessage.textContent = `Ошибка при добавлении: ${errorText}`;
                }
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Add event error:", error);
            // Обработка ошибки сети или парсинга JSON
            errorMessage.textContent = 'Ошибка при добавлении мероприятия (проверьте консоль).';
            errorMessage.style.display = 'block';
        }
    });

    logoutBtn.addEventListener('click', async () => {
        console.log("Logout button clicked"); // Лог для отладки
        try {
            // ИСПРАВЛЕНО: добавлено credentials: 'include' для запроса выхода
            const response = await fetch('/api/admin/logout', {
                method: 'POST',
                credentials: 'include' // <-- ВАЖНО: отправлять куки сессии
            });

            console.log("Logout response status:", response.status); // Лог для отладки

            if (response.ok) {
                adminPanel.style.display = 'none';
                loginSection.style.display = 'block';
                eventsList.innerHTML = ''; // Очищаем список
                errorMessage.style.display = 'none'; // Скрываем ошибки
                console.log("Logout successful, showing login panel"); // Лог для отладки
            } else {
                // Обработка ошибки logout
                if (response.headers.get("Content-Type")?.includes("application/json")) {
                    const errorData = await response.json();
                    console.error("Logout error response:", errorData);
                } else {
                    const errorText = await response.text();
                    console.error("Logout response (non-JSON):", errorText);
                }
            }
        } catch (error) {
            console.error("Logout error:", error);
        }
    });

    // Проверка сессии теперь использует защищённый маршрут и credentials
    // ИСПРАВЛЕНО: используем защищённый маршрут и credentials: 'include'
    async function checkSession() {
        console.log("Checking session..."); // Лог для отладки
        try {
            // ИСПРАВЛЕНО: используем защищённый маршрут и credentials: 'include'
            const response = await fetch('/api/admin/events', { // Используем защищённый маршрут
                credentials: 'include' // <-- ВАЖНО: отправлять куки сессии
            });

            console.log("Session check response status:", response.status); // Лог для отладки

            if (response.status === 200) {
                // Авторизован
                adminPanel.style.display = 'block';
                loginSection.style.display = 'none';
                loadEventsList(); // Загружаем список мероприятий
                errorMessage.style.display = 'none'; // Скрываем возможные предыдущие ошибки
                console.log("Session active, showing admin panel"); // Лог для отладки
            } else if (response.status === 401) {
                // Не авторизован
                adminPanel.style.display = 'none';
                loginSection.style.display = 'block';
                errorMessage.style.display = 'none'; // Скрываем возможные предыдущие ошибки
                console.log("Session inactive, showing login panel"); // Лог для отладки
            } else {
                // Другая ошибка сервера
                console.error(`Session check failed with status: ${response.status}`);
                // Оставляем на всякий случай, но обычно ошибка 500 или другая
                adminPanel.style.display = 'none';
                loginSection.style.display = 'block';
            }
        } catch (error) {
            console.error("Session check error:", error);
            // Ошибка сети или другая
            adminPanel.style.display = 'none';
            loginSection.style.display = 'block';
        }
    }

    // Загрузка списка мероприятий в админке
    // ИСПРАВЛЕНО: используем защищённый маршрут и credentials: 'include'
    async function loadEventsList() {
        console.log("Loading events list..."); // Лог для отладки
        try {
            // ИСПРАВЛЕНО: используем защищённый маршрут и credentials: 'include'
            const response = await fetch('/api/admin/events', {
                credentials: 'include' // <-- ВАЖНО: отправлять куки сессии
            });

            console.log("Load events list response status:", response.status); // Лог для отладки

            if (response.status === 401) {
                // Сессия истекла
                adminPanel.style.display = 'none';
                loginSection.style.display = 'block';
                errorMessage.textContent = 'Сессия администратора истекла. Пожалуйста, войдите снова.';
                errorMessage.style.display = 'block';
                console.log("Session expired, redirecting to login"); // Лог для отладки
                return;
            }

            if (!response.ok) {
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
            console.log("Events list loaded successfully"); // Лог для отладки
        } catch (error) {
            console.error("Error loading events list:", error);
            errorMessage.textContent = 'Ошибка загрузки списка мероприятий.';
            errorMessage.style.display = 'block';
        }
    }

    // Глобальная функция для удаления (чтобы работал onclick в HTML)
    // ИСПРАВЛЕНО: добавлено credentials: 'include' и улучшена обработка ошибок
    window.deleteEvent = async function(eventId) {
        if (!confirm('Вы уверены, что хотите удалить это мероприятие?')) return;

        console.log("Delete event button clicked for ID:", eventId); // Лог для отладки

        try {
            // ИСПРАВЛЕНО: добавлено credentials: 'include' для запроса удаления
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE',
                credentials: 'include' // <-- ВАЖНО: отправлять куки сессии
            });

            console.log("Delete event response status:", response.status); // Лог для отладки

            if (response.ok) {
                loadEventsList(); // Обновляем список
                errorMessage.style.display = 'none'; // Скрываем ошибки
            } else {
                // Обработка ошибки удаления
                if (response.headers.get("Content-Type")?.includes("application/json")) {
                    const errorData = await response.json();
                    errorMessage.textContent = errorData.error || 'Ошибка при удалении мероприятия.';
                } else {
                    // Если сервер вернул текст (например, "Unauthorized")
                    const errorText = await response.text();
                    console.error("Delete event response (non-JSON):", errorText);
                    errorMessage.textContent = `Ошибка при удалении: ${errorText}`;
                }
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Delete event error:", error);
            errorMessage.textContent = 'Ошибка при удалении мероприятия (проверьте консоль).';
            errorMessage.style.display = 'block';
        }
    };
});
