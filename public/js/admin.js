// admin.js
document.addEventListener('DOMContentLoaded', () => {
    const adminPanel = document.getElementById('admin-panel');
    const addEventForm = document.getElementById('add-event-form');
    const eventsList = document.getElementById('events-list');
    const registrationsListDiv = document.getElementById('registrations-list');
    const downloadBtn = document.getElementById('download-registrations-btn'); // Кнопка "Скачать"
    const errorMessage = document.getElementById('error-message');

    console.log("Admin page loaded, showing panel directly...");

    adminPanel.style.display = 'block';

    addEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addEventForm);
        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                addEventForm.reset();
                loadEventsList();
                errorMessage.style.display = 'none';
                console.log("Event added successfully:", result);
            } else {
                if (response.headers.get("Content-Type")?.includes("application/json")) {
                    const errorData = await response.json();
                    errorMessage.textContent = errorData.error || 'Ошибка при добавлении мероприятия.';
                } else {
                    const errorText = await response.text();
                    console.error("Add event response (non-JSON):", errorText);
                    errorMessage.textContent = `Ошибка при добавлении: ${errorText}`;
                }
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Add event error:", error);
            errorMessage.textContent = 'Ошибка при добавлении мероприятия (проверьте консоль).';
            errorMessage.style.display = 'block';
        }
    });

    // --- НОВАЯ функция для загрузки регистраций ---
    async function loadRegistrationsList() {
        console.log("Loading registrations list...");
        try {
            const response = await fetch('/api/admin/registrations');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const registrations = await response.json();
            if (!registrationsListDiv) {
                 console.error("Element with id 'registrations-list' not found in admin.html");
                 return;
            }
            registrationsListDiv.innerHTML = '';

            if (registrations.length === 0) {
                 registrationsListDiv.innerHTML = '<p>Регистраций пока нет.</p>';
                 return;
            }

            const table = document.createElement('table');
            table.className = 'registrations-table';
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
    // ---

    async function loadEventsList() {
        console.log("Loading events list...");
        try {
            const response = await fetch('/api/admin/events');

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const events = await response.json();
            eventsList.innerHTML = '';
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

    // --- НОВАЯ функция для генерации и скачивания CSV ---
    downloadBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/admin/registrations');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const registrations = await response.json();

            if (registrations.length === 0) {
                alert("Нет данных для скачивания.");
                return;
            }

            // Заголовки CSV
            const headers = ["ID", "Фамилия", "Имя", "Отчество", "Заведение", "Страна", "Город", "E-mail", "Телефон", "Дата регистрации"];
            // Данные
            const csvContent = [
                headers.join(","),
                ...registrations.map(reg => [
                    `"${reg.id}"`,
                    `"${reg.surname.replace(/"/g, '""')}"`,
                    `"${reg.name.replace(/"/g, '""')}"`,
                    `"${reg.patronymic ? reg.patronymic.replace(/"/g, '""') : ''}"`,
                    `"${reg.institution.replace(/"/g, '""')}"`,
                    `"${reg.country.replace(/"/g, '""')}"`,
                    `"${reg.city.replace(/"/g, '""')}"`,
                    `"${reg.email.replace(/"/g, '""')}"`,
                    `"${reg.phone ? reg.phone.replace(/"/g, '""') : ''}"`,
                    `"${new Date(reg.timestamp).toLocaleString()}"` // Формат даты можно изменить
                ].join(","))
            ].join("\n");

            // Создание Blob и ссылки для скачивания
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "registrations.csv"); // Имя файла
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error downloading registrations:", error);
            errorMessage.textContent = 'Ошибка при скачивании регистраций.';
            errorMessage.style.display = 'block';
        }
    });
    // ---

    window.deleteEvent = async function(eventId) {
        if (!confirm('Вы уверены, что хотите удалить это мероприятие?')) return;

        try {
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadEventsList();
                errorMessage.style.display = 'none';
            } else {
                if (response.headers.get("Content-Type")?.includes("application/json")) {
                    const errorData = await response.json();
                    errorMessage.textContent = errorData.error || 'Ошибка при удалении мероприятия.';
                } else {
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

    // Загружаем списки при загрузке админки
    loadEventsList();
    loadRegistrationsList(); // Вызываем новую функцию
});
