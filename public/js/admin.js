// public/js/admin.js
document.addEventListener('DOMContentLoaded', () => {
    const adminPanel = document.getElementById('admin-panel');
    const addEventForm = document.getElementById('add-event-form');
    const eventsList = document.getElementById('events-list');
    const registrationsListDiv = document.getElementById('registrations-list');
    const downloadBtn = document.getElementById('download-registrations-btn');
    const errorMessage = document.getElementById('error-message');

    console.log("Admin page loaded, showing panel directly...");

    // Показываем панель управления сразу, так как аутентификация отсутствует
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
                const eventId = result.event.id; // Получаем ID созданного мероприятия
                
                // --- ИСПРАВЛЕНИЕ: Отправляем тест отдельно ---
                const eventType = formData.get('type');
                if (eventType === 'olympiad') {
                    const testName = formData.get('name') + ' - Тест';
                    const questions = collectTestQuestions();
                    
                    if (questions.length > 0) {
                        const testResponse = await fetch(`/api/events/${eventId}/test`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                testName: testName,
                                questions: questions
                            })
                        });
                        
                        if (!testResponse.ok) {
                            const testErrorData = await testResponse.json();
                            console.error("Error saving test:", testErrorData.error);
                            errorMessage.textContent = testErrorData.error || 'Ошибка при сохранении теста.';
                            errorMessage.style.display = 'block';
                            return; // Прерываем, если ошибка сохранения теста
                        }
                    }
                }
                // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
                
                addEventForm.reset();
                document.getElementById('questions-container').innerHTML = ''; // Очищаем вопросы
                questionCounter = 0; // Сбрасываем счетчик
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

    // --- ИСПРАВЛЕНИЕ: Логика для работы с тестами ---
    let questionCounter = 0;

    function addQuestionField() {
        questionCounter++;
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-block';
        questionDiv.dataset.questionNumber = questionCounter;
        questionDiv.innerHTML = `
            <h4>Вопрос ${questionCounter}</h4>
            <label>Текст вопроса:</label>
            <textarea name="question-${questionCounter}-text" required></textarea>
            
            <label>Варианты ответов:</label>
            <div class="options-container">
                <div class="option-row">
                    <input type="radio" name="correct-answer-${questionCounter}" value="a" required> 
                    <input type="text" name="option-${questionCounter}-a" placeholder="Вариант A" required>
                </div>
                <div class="option-row">
                    <input type="radio" name="correct-answer-${questionCounter}" value="b"> 
                    <input type="text" name="option-${questionCounter}-b" placeholder="Вариант B" required>
                </div>
                <div class="option-row">
                    <input type="radio" name="correct-answer-${questionCounter}" value="c"> 
                    <input type="text" name="option-${questionCounter}-c" placeholder="Вариант C" required>
                </div>
                <div class="option-row">
                    <input type="radio" name="correct-answer-${questionCounter}" value="d"> 
                    <input type="text" name="option-${questionCounter}-d" placeholder="Вариант D">
                </div>
            </div>
            
            <button type="button" class="remove-question-btn" data-question-number="${questionCounter}">Удалить вопрос</button>
            <hr>
        `;
        document.getElementById('questions-container').appendChild(questionDiv);

        // Добавляем обработчик для кнопки удаления этого вопроса
        questionDiv.querySelector('.remove-question-btn').addEventListener('click', function() {
            removeQuestionField(this.dataset.questionNumber);
        });
    }

    function removeQuestionField(questionNumber) {
        const questionBlock = document.querySelector(`.question-block[data-question-number="${questionNumber}"]`);
        if (questionBlock) {
            questionBlock.remove();
        }
    }
    
    // --- НОВАЯ ФУНКЦИЯ: Сбор данных формы теста ---
    function collectTestQuestions() {
        const questions = [];
        const questionBlocks = document.querySelectorAll('.question-block');
        
        questionBlocks.forEach(block => {
            const questionNumber = block.dataset.questionNumber;
            const questionText = document.querySelector(`textarea[name="question-${questionNumber}-text"]`)?.value.trim();
            
            if (!questionText) return; // Пропустить пустые вопросы

            const options = {};
            const optionLetters = ['a', 'b', 'c', 'd'];
            for (let letter of optionLetters) {
                const optionInput = document.querySelector(`input[name="option-${questionNumber}-${letter}"]`);
                const optionValue = optionInput ? optionInput.value.trim() : '';
                if (optionValue) { // Сохраняем только непустые варианты
                    options[letter] = optionValue;
                }
            }

            const correctAnswerRadio = document.querySelector(`input[name="correct-answer-${questionNumber}"]:checked`);
            const correctAnswer = correctAnswerRadio ? correctAnswerRadio.value : null;

            // Убедимся, что правильный ответ существует среди вариантов
            if (correctAnswer && options.hasOwnProperty(correctAnswer)) {
                questions.push({
                    id: uuidv4(),
                    text: questionText,
                    options: options,
                    correctAnswer: correctAnswer
                });
            } else {
                console.warn(`Пропущен вопрос ${questionNumber}: отсутствует правильный ответ или он не соответствует вариантам.`);
                // Можно показать предупреждение пользователю
            }
        });

        return questions;
    }
    // --- КОНЕЦ НОВОЙ ФУНКЦИИ ---

    document.getElementById('add-question-btn').addEventListener('click', addQuestionField);
    // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

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
                        ${event.subtype ? `<br><small>Подтип: ${event.subtype}</small>` : ''}
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

    // --- ИНИЦИАЛИЗАЦИЯ ---
    loadEventsList();
    loadRegistrationsList();
    
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
