// admin.js
document.addEventListener('DOMContentLoaded', () => {
    const adminPanel = document.getElementById('admin-panel');
    const errorMessage = document.getElementById('error-message');
    const eventTypeSelector = document.getElementById('event-type-selector');
    const eventTypeHidden = document.getElementById('event-type');
    const olympiadTestSection = document.getElementById('olympiad-test-section');
    const questionsContainer = document.getElementById('questions-container');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const addEventForm = document.getElementById('add-event-form');
    const editAboutForm = document.getElementById('edit-about-form');
    const downloadBtn = document.getElementById('download-registrations-btn');

    // --- Логика вкладок ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;

            // Убрать активный класс у всех кнопок и панелей
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            // Добавить активный класс текущей кнопке и панели
            button.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');

            // Загрузить данные для вкладки, если нужно
            if (tabName === 'events') {
                loadEventsList();
            } else if (tabName === 'about') {
                loadAboutData();
            }
        });
    });
    // --- Конец логики вкладок ---

    // --- Логика выбора типа мероприятия ---
    eventTypeSelector.addEventListener('change', function () {
        const selectedType = this.value;
        eventTypeHidden.value = selectedType;

        // Показать/скрыть секцию теста для олимпиад
        if (selectedType === 'olympiad') {
            olympiadTestSection.style.display = 'block';
        } else {
            olympiadTestSection.style.display = 'none';
        }
    });
    // --- Конец логики выбора типа ---

    // --- Логика добавления вопросов теста ---
    let questionCounter = 0;

    function addQuestion() {
        questionCounter++;
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-block';
        questionDiv.dataset.questionId = questionCounter;
        questionDiv.innerHTML = `
            <h4>Вопрос ${questionCounter} <button type="button" class="remove-question-btn" data-question-id="${questionCounter}">Удалить</button></h4>
            <label>Текст вопроса:</label>
            <input type="text" name="question-${questionCounter}-text" required style="width: 100%;">
            
            <label>Варианты ответов:</label>
            <div class="options-container">
                <div class="option-row">
                    <input type="radio" name="correct-answer-${questionCounter}" value="a" required> 
                    <input type="text" name="option-${questionCounter}-a" placeholder="Вариант A" required style="width: 80%;">
                </div>
                <div class="option-row">
                    <input type="radio" name="correct-answer-${questionCounter}" value="b"> 
                    <input type="text" name="option-${questionCounter}-b" placeholder="Вариант B" required style="width: 80%;">
                </div>
                <div class="option-row">
                    <input type="radio" name="correct-answer-${questionCounter}" value="c"> 
                    <input type="text" name="option-${questionCounter}-c" placeholder="Вариант C" required style="width: 80%;">
                </div>
                <div class="option-row">
                    <input type="radio" name="correct-answer-${questionCounter}" value="d"> 
                    <input type="text" name="option-${questionCounter}-d" placeholder="Вариант D" style="width: 80%;">
                </div>
            </div>
            <hr>
        `;
        questionsContainer.appendChild(questionDiv);

        // Добавить обработчик удаления для новой кнопки
        questionDiv.querySelector('.remove-question-btn').addEventListener('click', function () {
            const id = this.dataset.questionId;
            removeQuestion(id);
        });
    }

    function removeQuestion(questionId) {
        const questionBlock = document.querySelector(`.question-block[data-question-id="${questionId}"]`);
        if (questionBlock) {
            questionBlock.remove();
        }
    }

    addQuestionBtn.addEventListener('click', addQuestion);
    // --- Конец логики добавления вопросов ---

    // --- Логика отправки формы добавления мероприятия ---
    addEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(addEventForm);

        // Собрать данные теста, если это олимпиада
        const eventType = formData.get('type');
        let testQuestions = [];
        if (eventType === 'olympiad') {
            const questionBlocks = document.querySelectorAll('.question-block');
            for (let block of questionBlocks) {
                const qId = block.dataset.questionId;
                const qText = formData.get(`question-${qId}-text`);
                if (!qText) continue; // Пропустить пустые вопросы

                const options = {};
                const letters = ['a', 'b', 'c', 'd'];
                for (let letter of letters) {
                    const optValue = formData.get(`option-${qId}-${letter}`);
                    if (optValue !== null) {
                        options[letter] = optValue.trim();
                    }
                }

                const correctAnswer = formData.get(`correct-answer-${qId}`);

                if (correctAnswer && options.hasOwnProperty(correctAnswer)) {
                    testQuestions.push({
                        id: uuidv4(),
                        text: qText,
                        options: options,
                        correctAnswer: correctAnswer
                    });
                } else {
                    alert(`Ошибка в вопросе ${qId}: Не выбран или неверный правильный ответ.`);
                    return; // Прервать отправку
                }
            }
            // Добавить вопросы в FormData как JSON строку
            formData.append('testQuestions', JSON.stringify(testQuestions));
        }

        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                alert('Мероприятие добавлено успешно!');
                addEventForm.reset();
                questionsContainer.innerHTML = '';
                questionCounter = 0;
                loadEventsList(); // Обновить список
                errorMessage.style.display = 'none';
            } else {
                const errorData = await response.json();
                errorMessage.textContent = errorData.error || 'Ошибка при добавлении мероприятия.';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Add event error:", error);
            errorMessage.textContent = 'Ошибка сети при добавлении мероприятия.';
            errorMessage.style.display = 'block';
        }
    });
    // --- Конец логики отправки формы добавления ---

    // --- Логика загрузки и отображения списка мероприятий ---
    async function loadEventsList() {
        try {
            const response = await fetch('/api/admin/events');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const events = await response.json();
            const eventsListDiv = document.getElementById('events-list');
            eventsListDiv.innerHTML = '';

            if (events.length === 0) {
                eventsListDiv.innerHTML = '<p>Мероприятий пока нет.</p>';
                return;
            }

            const table = document.createElement('table');
            table.className = 'events-table';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Название</th>
                        <th>Тип</th>
                        <th>Подтип (Ярлык)</th>
                        <th>Файл</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            `;
            const tbody = table.querySelector('tbody');

            events.forEach(event => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${event.id.substring(0, 8)}...</td>
                    <td>${event.name}</td>
                    <td>${event.type}</td>
                    <td>${event.subtype || 'Нет'}</td>
                    <td>${event.infoLetterFileName ? event.infoLetterFileName.substring(0, 20) + '...' : 'Нет'}</td>
                    <td><button class="delete-event-btn" data-event-id="${event.id}">Удалить</button></td>
                `;
                tbody.appendChild(row);
            });

            eventsListDiv.appendChild(table);

            // Добавить обработчики для кнопок удаления
            document.querySelectorAll('.delete-event-btn').forEach(btn => {
                btn.addEventListener('click', async function () {
                    const eventId = this.dataset.eventId;
                    if (confirm('Вы уверены, что хотите удалить это мероприятие?')) {
                        try {
                            const response = await fetch(`/api/events/${eventId}`, {
                                method: 'DELETE'
                            });
                            if (response.ok) {
                                loadEventsList(); // Перезагрузить список
                                errorMessage.style.display = 'none';
                            } else {
                                const errorData = await response.json();
                                errorMessage.textContent = errorData.error || 'Ошибка при удалении.';
                                errorMessage.style.display = 'block';
                            }
                        } catch (error) {
                            console.error("Delete event error:", error);
                            errorMessage.textContent = 'Ошибка сети при удалении.';
                            errorMessage.style.display = 'block';
                        }
                    }
                });
            });

        } catch (error) {
            console.error("Error loading events list:", error);
            errorMessage.textContent = 'Ошибка загрузки списка мероприятий.';
            errorMessage.style.display = 'block';
        }
    }
    // --- Конец логики загрузки списка мероприятий ---

    // --- Логика работы с "О нас" ---
    async function loadAboutData() {
        try {
            const response = await fetch('/api/admin/about');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const aboutData = await response.json();

            document.getElementById('about-inn').value = aboutData.inn || '';
            document.getElementById('about-phone').value = aboutData.phone || '';
            document.getElementById('about-address').value = aboutData.address || '';
            document.getElementById('about-email').value = aboutData.email || '';
            document.getElementById('about-requisites').value = aboutData.requisites || '';

        } catch (error) {
            console.error("Error loading 'about' data:", error);
            errorMessage.textContent = 'Ошибка загрузки данных "О нас".';
            errorMessage.style.display = 'block';
        }
    }

    editAboutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(editAboutForm);
        const aboutData = {
            inn: formData.get('inn'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            email: formData.get('email'),
            requisites: formData.get('requisites')
        };

        try {
            const response = await fetch('/api/admin/about', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(aboutData)
            });

            if (response.ok) {
                alert('Данные "О нас" успешно обновлены!');
                errorMessage.style.display = 'none';
            } else {
                const errorData = await response.json();
                errorMessage.textContent = errorData.error || 'Ошибка при обновлении "О нас".';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Error updating 'about' data:", error);
            errorMessage.textContent = 'Ошибка сети при обновлении "О нас".';
            errorMessage.style.display = 'block';
        }
    });
    // --- Конец логики "О нас" ---

    // --- Логика экспорта в Excel ---
    downloadBtn.addEventListener('click', async () => {
        try {
            // 1. Получить регистрации
            const regResponse = await fetch('/api/admin/registrations');
            if (!regResponse.ok) throw new Error(`HTTP error! status: ${regResponse.status}`);
            const registrations = await regResponse.json();

            // 2. Получить результаты тестов
            const testResponse = await fetch('/api/admin/test-results'); // Нужно создать этот маршрут на сервере
            let testResults = [];
            if (testResponse.ok) {
                testResults = await testResponse.json();
            } else {
                console.warn("Could not fetch test results for export:", testResponse.status);
            }

             // 3. Получить мероприятия для сопоставления ID
             const eventsResponse = await fetch('/api/admin/events');
             let events = [];
             if (eventsResponse.ok) {
                 events = await eventsResponse.json();
             } else {
                 console.warn("Could not fetch events for export:", eventsResponse.status);
             }
             const eventsMap = {};
             events.forEach(e => eventsMap[e.id] = e);


            if (registrations.length === 0) {
                alert("Нет данных для экспорта.");
                return;
            }

            // 4. Подготовить данные для CSV
            // Заголовки
            const headers = [
                "ID Регистрации", "ID Мероприятия", "Название Мероприятия", "Тип Мероприятия", "Фамилия", "Имя", "Отчество",
                "Заведение", "Страна", "Город", "Email", "Телефон", "Дата Регистрации",
                 "ID Теста", "Баллы", "Макс. Баллы", "Дата Теста" // Данные теста
            ];
            const csvRows = [headers.join(",")];

            for (const reg of registrations) {
                const event = eventsMap[reg.eventId] || { name: 'Не найдено', type: 'Не найдено' };
                // Найти результат теста для этой регистрации (если есть)
                // Предположим, что testResult.eventId === reg.eventId и testResult.userId === reg.id
                // Или как-то ещё связаны. Для простоты, ищем по eventId.
                // Более точная связка требует userId в регистрации.
                const relatedTests = testResults.filter(tr => tr.eventId === reg.eventId); // Или другая логика связи

                if (relatedTests.length > 0) {
                    // Если есть несколько тестов, можно создать несколько строк или объединить
                    // Пока создадим строку для каждой регистрации и первый связанный тест
                    const test = relatedTests[0];
                    const row = [
                        `"${reg.id}"`,
                        `"${reg.eventId}"`,
                        `"${event.name}"`,
                        `"${event.type}"`,
                        `"${reg.surname}"`,
                        `"${reg.name}"`,
                        `"${reg.patronymic || ''}"`,
                        `"${reg.institution}"`,
                        `"${reg.country}"`,
                        `"${reg.city}"`,
                        `"${reg.email}"`,
                        `"${reg.phone || ''}"`,
                        `"${new Date(reg.timestamp).toLocaleString()}"`,
                         `"${test.id}"`,
                         `"${test.score}"`,
                         `"${test.questions ? JSON.parse(test.questions).length : 'N/A'}"`, // Предполагаем, что max балл = кол-во вопросов
                         `"${new Date(test.timestamp).toLocaleString()}"`
                    ];
                    csvRows.push(row.join(","));
                } else {
                    // Строка регистрации без теста
                    const row = [
                        `"${reg.id}"`,
                        `"${reg.eventId}"`,
                        `"${event.name}"`,
                        `"${event.type}"`,
                        `"${reg.surname}"`,
                        `"${reg.name}"`,
                        `"${reg.patronymic || ''}"`,
                        `"${reg.institution}"`,
                        `"${reg.country}"`,
                        `"${reg.city}"`,
                        `"${reg.email}"`,
                        `"${reg.phone || ''}"`,
                        `"${new Date(reg.timestamp).toLocaleString()}"`,
                         `""`, `""`, `""`, `""` // Пустые поля для теста
                    ];
                    csvRows.push(row.join(","));
                }
            }

            // 5. Создать и скачать CSV
            const csvContent = csvRows.join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "registrations_and_tests_export.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Error exporting data:", error);
            errorMessage.textContent = 'Ошибка при экспорте данных.';
            errorMessage.style.display = 'block';
        }
    });
    // --- Конец логики экспорта ---

    // --- Вспомогательная функция UUID ---
    function uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    // --- Конец вспомогательной функции ---

    // Инициализация: загрузить список мероприятий при первой загрузке админки
    loadEventsList();
});
