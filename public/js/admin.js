// admin.js
document.addEventListener('DOMContentLoaded', () => {
    const adminPanel = document.getElementById('admin-panel');
    const addEventForm = document.getElementById('add-event-form');
    const eventsList = document.getElementById('events-list');
    const registrationsListDiv = document.getElementById('registrations-list'); // Добавлено
    // const logoutBtn = document.getElementById('logout-btn'); // УДАЛЕНО
    const errorMessage = document.getElementById('error-message');

    console.log("Admin page loaded, showing panel directly..."); // Лог для отладки

    // Показываем панель управления сразу, так как аутентификация отсутствует
    adminPanel.style.display = 'block';
    // loginSection.style.display = 'none'; // loginSection больше нет в admin.html

    // loginForm больше нет, удаляем обработчик

    addEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log("Add event form submitted"); // Лог для отладки
        const formData = new FormData(addEventForm);
        try {
            // ИСПРАВЛЕНО: УБРАНО credentials: 'include', так как сессия не нужна
            const response = await fetch('/api/events', {
                method: 'POST',
                body: formData, // FormData автоматически устанавливает Content-Type multipart/form-data
                // credentials: 'include' // <-- УДАЛЕНО: не отправлять куки сессии
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

    // logoutBtn больше нет, удаляем обработчик

    // loadEventsList теперь не требует проверки сессии
    async function loadEventsList() {
        console.log("Loading events list..."); // Лог для отладки
        try {
            // ИСПРАВЛЕНО: УБРАНО credentials: 'include', так как сессия не нужна
            const response = await fetch('/api/admin/events'/*, {
                credentials: 'include' // <-- УДАЛЕНО: не отправлять куки сессии
            }*/);

            console.log("Load events list response status:", response.status); // Лог для отладки

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

    // loadRegistrationsList - добавлено для загрузки регистраций
    async function loadRegistrationsList() {
        console.log("Loading registrations list..."); // Лог для отладки
        try {
            // ИСПРАВЛЕНО: УБРАНО credentials: 'include', так как сессия не нужна
            const response = await fetch('/api/admin/registrations'/*, {
                credentials: 'include' // <-- УДАЛЕНО: не отправлять куки сессии
            }*/);

            console.log("Load registrations list response status:", response.status); // Лог для отладки

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const registrations = await response.json();
            if (!registrationsListDiv) {
                 console.error("Element with id 'registrations-list' not found in admin.html");
                 return; // Если элемента нет, выходим
            }
            registrationsListDiv.innerHTML = ''; // Очищаем список

            if (registrations.length === 0) {
                 registrationsListDiv.innerHTML = '<p>Регистраций пока нет.</p>';
                 return;
            }

            // Создаём простую таблицу для отображения регистраций
            const table = document.createElement('table');
            table.className = 'registrations-table'; // Добавим класс для стилей
            const headerRow = document.createElement('tr');
            headerRow.innerHTML = `
                <th>ID</th>
                <th>Фамилия</th>
                <th>Имя</th>
                <th>Отчество</th>
                <th>Заведение</th>
                <th>Страна</th>
                <th>Город</th>
                <th>E-mail</th>
                <th>Телефон</th>
                <th>Дата регистрации</th>
            `;
            table.appendChild(headerRow);

            registrations.forEach(reg => {
                 const row = document.createElement('tr');
                 // Убираем теги <script> из данных (на всякий случай)
                 const safeReg = {
                     id: reg.id,
                     surname: reg.surname.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''),
                     name: reg.name.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''),
                     patronymic: reg.patronymic?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') || '',
                     institution: reg.institution.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''),
                     country: reg.country.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''),
                     city: reg.city.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''),
                     email: reg.email.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''),
                     phone: reg.phone?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') || '',
                     timestamp: reg.timestamp
                 };
                 row.innerHTML = `
                     <td>${safeReg.id}</td>
                     <td>${safeReg.surname}</td>
                     <td>${safeReg.name}</td>
                     <td>${safeReg.patronymic}</td>
                     <td>${safeReg.institution}</td>
                     <td>${safeReg.country}</td>
                     <td>${safeReg.city}</td>
                     <td>${safeReg.email}</td>
                     <td>${safeReg.phone}</td>
                     <td>${new Date(safeReg.timestamp).toLocaleString()}</td>
                 `;
                 table.appendChild(row);
            });
            registrationsListDiv.appendChild(table);
        } catch (error) {
            console.error("Error loading registrations list:", error);
            if (registrationsListDiv) {
                 registrationsListDiv.innerHTML = '<p>Ошибка загрузки списка регистраций.</p>';
            }
        }
    }

    // Глобальная функция для удаления (чтобы работал onclick в HTML)
    // ИСПРАВЛЕНО: УБРАНО credentials: 'include' и улучшена обработка ошибок
    window.deleteEvent = async function(eventId) {
        if (!confirm('Вы уверены, что хотите удалить это мероприятие?')) return;

        console.log("Delete event button clicked for ID:", eventId); // Лог для отладки

        try {
            // ИСПРАВЛЕНО: УБРАНО credentials: 'include', так как сессия не нужна
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE'
                // credentials: 'include' // <-- УДАЛЕНО: не отправлять куки сессии
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

    // Загружаем список мероприятий и регистраций при загрузке страницы
    loadEventsList();
    loadRegistrationsList(); // Вызываем новую функцию
});
