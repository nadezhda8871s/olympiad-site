// public/js/admin.js
document.addEventListener('DOMContentLoaded', () => {
    const adminPanel = document.getElementById('admin-panel');
    const addEventForm = document.getElementById('add-event-form');
    const eventsList = document.getElementById('events-list');
    const registrationsListDiv = document.getElementById('registrations-list');
    const downloadBtn = document.getElementById('download-registrations-btn'); // ИСПРАВЛЕНО: добавлена кнопка
    const errorMessage = document.getElementById('error-message');

    // --- НОВОЕ: Элементы для формы "О нас" ---
    const editAboutForm = document.getElementById('edit-about-form');
    const aboutCustomText = document.getElementById('about-custom-text');
    // --- КОНЕЦ НОВОГО ---

    console.log("Admin page loaded, showing panel directly...");

    // Показываем панель управления сразу, так как аутентификация отсутствует
    adminPanel.style.display = 'block';

    // --- НОВАЯ ФУНКЦИЯ: Загрузка и отображение произвольного текста "О нас" ---
    async function loadAboutCustomText() {
        try {
            const response = await fetch('/api/admin/about/custom-text');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const aboutData = await response.json();

            aboutCustomText.value = aboutData.customText || '';
        } catch (error) {
            console.error("Error loading 'about' custom text:", error);
            errorMessage.textContent = 'Ошибка загрузки произвольного текста "О нас".';
            errorMessage.style.display = 'block';
        }
    }
    // --- КОНЕЦ НОВОЙ ФУНКЦИИ ---

    // --- НОВАЯ ФУНКЦИЯ: Сохранение произвольного текста "О нас" ---
    editAboutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(editAboutForm);
        const customText = formData.get('customText');

        try {
            const response = await fetch('/api/admin/about/custom-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ customText: customText })
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    alert('Произвольный текст "О нас" успешно обновлён!');
                    errorMessage.style.display = 'none';
                } else {
                    errorMessage.textContent = result.error || 'Ошибка при обновлении произвольного текста "О нас".';
                    errorMessage.style.display = 'block';
                }
            } else {
                const errorData = await response.json();
                errorMessage.textContent = errorData.error || 'Ошибка при обновлении произвольного текста "О нас".';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Error updating 'about' custom text:", error);
            errorMessage.textContent = 'Ошибка сети при обновлении произвольного текста "О нас".';
            errorMessage.style.display = 'block';
        }
    });
    // --- КОНЕЦ НОВОЙ ФУНКЦИИ ---

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
                const eventId = result.event.id; // Получаем ID созданного мероприятия
                
                addEventForm.reset();
                loadEventsList(); // Обновляем список
                errorMessage.style.display = 'none'; // Скрываем ошибки
                console.log("Event added successfully:", result);
            } else {
                const errorData = await response.json();
                errorMessage.textContent = errorData.error || 'Ошибка при добавлении мероприятия.';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Add event error:", error);
            errorMessage.textContent = 'Ошибка при добавлении мероприятия (проверьте консоль).';
            errorMessage.style.display = 'block';
        }
    });

    async function loadEventsList() {
        try {
            const response = await fetch('/api/admin/events');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const events = await response.json();
            eventsList.innerHTML = '';
            events.forEach(event => {
                const eventItem = document.createElement('div');
                eventItem.className = 'event-item';
                eventItem.innerHTML = `
                    <div>
                        <strong>${event.name}</strong> (${event.type})
                        ${event.subtype ? `<br><small>Подтип: ${event.subtype}</small>` : '<br><small>Подтип: не указан</small>'}
                        ${event.infoLetterFileName ? `<br><small>Файл: ${event.infoLetterFileName}</small>` : '<br><small>Файл: нет</small>'}
                    </div>
                    <!-- ИСПРАВЛЕНО: Добавлена кнопка "Удалить" -->
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

    // --- НОВАЯ ФУНКЦИЯ: Удаление мероприятия ---
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
            errorMessage.textContent = 'Ошибка при удалении мероприятия (проверьте консоль).';
            errorMessage.style.display = 'block';
        }
    };
    // --- КОНЕЦ НОВОЙ ФУНКЦИИ ---

    async function loadRegistrationsList() {
        try {
            const response = await fetch('/api/admin/registrations');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            const registrations = data.registrations || [];
            
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
            errorMessage.textContent = 'Ошибка загрузки списка регистраций.';
            errorMessage.style.display = 'block';
        }
    }

    // --- НОВАЯ ФУНКЦИЯ: Скачивание регистраций в Excel (CSV) ---
    downloadBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/admin/registrations');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            const registrations = data.registrations || [];

            if (registrations.length === 0) {
                alert("Нет данных для скачивания.");
                return;
            }

            const headers = ["ID", "Фамилия", "Имя", "Отчество", "Заведение", "Страна", "Город", "E-mail", "Телефон", "Дата регистрации"];
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
                    `"${new Date(reg.timestamp).toLocaleString()}"`
                ].join(","))
            ].join("\n");

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "registrations.csv");
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
    // --- КОНЕЦ НОВОЙ ФУНКЦИИ ---

    // --- ИНИЦИАЛИЗАЦИЯ ---
    loadEventsList();
    loadRegistrationsList();
    loadAboutCustomText(); // Загружаем произвольный текст "О нас" при инициализации
    
    // Показываем/скрываем секцию теста при изменении типа мероприятия
    document.getElementById('event-type').addEventListener('change', function() {
        const testSection = document.getElementById('olympiad-test-section');
        if (this.value === 'olympiad') {
            testSection.style.display = 'block';
        } else {
            testSection.style.display = 'none';
        }
    });
});

// Вспомогательная функция для генерации UUID (если не определена глобально)
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
