// public/js/admin.js
document.addEventListener('DOMContentLoaded', () => {
    const adminPanel = document.getElementById('admin-panel');
    const addEventForm = document.getElementById('add-event-form');
    const eventsList = document.getElementById('events-list');
    const registrationsListDiv = document.getElementById('registrations-list');
    const downloadBtn = document.getElementById('download-registrations-btn');
    const errorMessage = document.getElementById('error-message');

    // --- НОВОЕ: Элементы для формы "О нас" ---
    const editAboutForm = document.getElementById('edit-about-form');
    const aboutCustomText = document.getElementById('about-custom-text');
    // --- КОНЕЦ НОВОГО ---

    // --- НОВОЕ: Элементы для редактирования мероприятия ---
    const editEventSection = document.getElementById('edit-event-section');
    const editEventForm = document.getElementById('edit-event-form');
    const currentFileNameSpan = document.getElementById('current-file-name');
    const editQuestionsContainer = document.getElementById('edit-questions-container');
    const editAddQuestionBtn = document.getElementById('edit-add-question-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    let editingEventId = null;
    let editingEvent = null;
    // --- КОНЕЦ НОВОГО ---

    console.log("Admin page loaded, showing panel directly...");

    // Показываем панель управления сразу, так как аутентификация отсутствует
    adminPanel.style.display = 'block';

    // --- НОВАЯ ФУНКЦИЯ: Загрузка и отображение данных "О нас" ---
    async function loadAboutData() {
        try {
            const response = await fetch('/api/admin/about');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const aboutData = await response.json();

            // Заполняем форму данными
            aboutCustomText.value = aboutData.customText || '';

        } catch (error) {
            console.error("Error loading 'about' ", error);
            errorMessage.textContent = 'Ошибка загрузки данных "О нас".';
            errorMessage.style.display = 'block';
        }
    }
    // --- КОНЕЦ НОВОЙ ФУНКЦИИ ---

    // --- НОВАЯ ФУНКЦИЯ: Сохранение данных "О нас" ---
    editAboutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(editAboutForm);
        const aboutData = {
            customText: formData.get('customText')
        };

        try {
            const response = await fetch('/api/admin/about', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(aboutData)
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    alert('Данные "О нас" успешно обновлены!');
                    errorMessage.style.display = 'none';
                } else {
                    errorMessage.textContent = result.error || 'Ошибка при обновлении "О нас".';
                    errorMessage.style.display = 'block';
                }
            } else {
                const errorData = await response.json();
                errorMessage.textContent = errorData.error || 'Ошибка при обновлении "О нас".';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Error updating 'about' ", error);
            errorMessage.textContent = 'Ошибка сети при обновлении "О нас".';
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
                    <input type="radio" name="correct-answer-${questionNumber}" value="d"> 
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
    // --- КОНЕЦ НОВОЙ ФУНКЦИЯ: Сбор данных формы теста ---

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
                // --- ИСПРАВЛЕНИЕ: Убрано отображение subtype ---
                eventItem.innerHTML = `
                    <div>
                        <strong>${event.name}</strong> (${event.type})
                        <!-- ${event.subtype ? `<br><small>Подтип: ${event.subtype}</small>` : '<br><small>Подтип: не указан</small>'} -->
                        ${event.infoLetterFileName ? `<br><small>Файл: ${event.infoLetterFileName}</small>` : '<br><small>Файл: нет</small>'}
                    </div>
                    <button onclick="editEvent('${event.id}')">Редактировать</button>
                    <button onclick="deleteEvent('${event.id}')">Удалить</button>
                `;
                // --- КОНЕЦ ИСПРАВЛЕНИЯ ---
                eventsList.appendChild(eventItem);
            });
        } catch (error) {
            console.error("Error loading events list:", error);
            errorMessage.textContent = 'Ошибка загрузки списка мероприятий.';
            errorMessage.style.display = 'block';
        }
    }

    // --- НОВАЯ ФУНКЦИЯ: Редактирование мероприятия ---
    window.editEvent = async function(eventId) {
        try {
            const response = await fetch(`/api/events/${eventId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const event = await response.json();
            
            editingEventId = eventId;
            editingEvent = event;

            document.getElementById('edit-event-id').value = eventId;
            document.getElementById('edit-event-name').value = event.name;
            document.getElementById('edit-event-description').value = event.description;
            document.getElementById('edit-event-type').value = event.type;
            // --- ИСПРАВЛЕНИЕ: Убрано заполнение subtype ---
            // document.getElementById('edit-event-subtype').value = event.subtype || '';
            // --- КОНЕЦ ИСПРАВЛЕНИЯ ---

            // Отображаем текущий файл
            currentFileNameSpan.textContent = event.infoLetterFileName || 'нет';

            // Показываем/скрываем секцию теста
            const editTestSection = document.getElementById('edit-olympiad-test-section');
            if (event.type === 'olympiad') {
                editTestSection.style.display = 'block';
                // Загружаем вопросы теста для редактирования
                loadTestQuestionsForEditing(eventId);
            } else {
                editTestSection.style.display = 'none';
                editQuestionsContainer.innerHTML = ''; // Очищаем вопросы
            }

            // Скрываем список мероприятий и показываем форму редактирования
            eventsList.style.display = 'none';
            editEventSection.style.display = 'block';
            errorMessage.style.display = 'none'; // Скрываем ошибки
        } catch (error) {
            console.error("Error loading event for editing:", error);
            errorMessage.textContent = 'Ошибка загрузки мероприятия для редактирования.';
            errorMessage.style.display = 'block';
        }
    };

    // --- НОВАЯ ФУНКЦИЯ: Загрузка вопросов теста для редактирования ---
    async function loadTestQuestionsForEditing(eventId) {
        try {
            const response = await fetch(`/api/tests/${eventId}`);
            if (response.ok) {
                const test = await response.json();
                displayTestQuestionsForEditing(test.questions);
            } else if (response.status === 404) {
                // Тест не найден, очищаем контейнер
                editQuestionsContainer.innerHTML = '';
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error("Error loading test questions for editing:", error);
            errorMessage.textContent = 'Ошибка загрузки вопросов теста для редактирования.';
            errorMessage.style.display = 'block';
        }
    }

    // --- НОВАЯ ФУНКЦИЯ: Отображение вопросов теста для редактирования ---
    function displayTestQuestionsForEditing(questions) {
        editQuestionsContainer.innerHTML = ''; // Очищаем контейнер
        if (!questions || questions.length === 0) {
            // Нет вопросов для редактирования
            return;
        }

        questions.forEach((q, index) => {
            const questionNumber = index + 1;
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question-block';
            questionDiv.dataset.questionNumber = questionNumber;
            questionDiv.innerHTML = `
                <h4>Вопрос ${questionNumber}</h4>
                <label>Текст вопроса:</label>
                <textarea name="edit-question-${questionNumber}-text" required>${q.text}</textarea>
                
                <label>Варианты ответов:</label>
                <div class="options-container">
                    <div class="option-row">
                        <input type="radio" name="edit-correct-answer-${questionNumber}" value="a" ${q.correctAnswer === 'a' ? 'checked' : ''} required> 
                        <input type="text" name="edit-option-${questionNumber}-a" placeholder="Вариант A" value="${q.options.a || ''}" required>
                    </div>
                    <div class="option-row">
                        <input type="radio" name="edit-correct-answer-${questionNumber}" value="b" ${q.correctAnswer === 'b' ? 'checked' : ''}> 
                        <input type="text" name="edit-option-${questionNumber}-b" placeholder="Вариант B" value="${q.options.b || ''}" required>
                    </div>
                    <div class="option-row">
                        <input type="radio" name="edit-correct-answer-${questionNumber}" value="c" ${q.correctAnswer === 'c' ? 'checked' : ''}> 
                        <input type="text" name="edit-option-${questionNumber}-c" placeholder="Вариант C" value="${q.options.c || ''}" required>
                    </div>
                    <div class="option-row">
                        <input type="radio" name="edit-correct-answer-${questionNumber}" value="d" ${q.correctAnswer === 'd' ? 'checked' : ''}> 
                        <input type="text" name="edit-option-${questionNumber}-d" placeholder="Вариант D" value="${q.options.d || ''}">
                    </div>
                </div>
                
                <button type="button" class="remove-question-btn" data-question-number="${questionNumber}">Удалить вопрос</button>
                <hr>
            `;
            editQuestionsContainer.appendChild(questionDiv);

            // Добавляем обработчик для кнопки удаления этого вопроса
            questionDiv.querySelector('.remove-question-btn').addEventListener('click', function() {
                removeQuestionField(this.dataset.questionNumber, true); // true для редактирования
            });
        });
    }

    // --- НОВАЯ ФУНКЦИЯ: Добавление вопроса в форму редактирования ---
    editAddQuestionBtn.addEventListener('click', () => {
        const questionBlocks = editQuestionsContainer.querySelectorAll('.question-block');
        const questionNumber = questionBlocks.length + 1;
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-block';
        questionDiv.dataset.questionNumber = questionNumber;
        questionDiv.innerHTML = `
            <h4>Вопрос ${questionNumber}</h4>
            <label>Текст вопроса:</label>
            <textarea name="edit-question-${questionNumber}-text" required></textarea>
            
            <label>Варианты ответов:</label>
            <div class="options-container">
                <div class="option-row">
                    <input type="radio" name="edit-correct-answer-${questionNumber}" value="a" required> 
                    <input type="text" name="edit-option-${questionNumber}-a" placeholder="Вариант A" required>
                </div>
                <div class="option-row">
                    <input type="radio" name="edit-correct-answer-${questionNumber}" value="b"> 
                    <input type="text" name="edit-option-${questionNumber}-b" placeholder="Вариант B" required>
                </div>
                <div class="option-row">
                    <input type="radio" name="edit-correct-answer-${questionNumber}" value="c"> 
                    <input type="text" name="edit-option-${questionNumber}-c" placeholder="Вариант C" required>
                </div>
                <div class="option-row">
                    <input type="radio" name="edit-correct-answer-${questionNumber}" value="d"> 
                    <input type="text" name="edit-option-${questionNumber}-d" placeholder="Вариант D">
                </div>
            </div>
            
            <button type="button" class="remove-question-btn" data-question-number="${questionNumber}">Удалить вопрос</button>
            <hr>
        `;
        editQuestionsContainer.appendChild(questionDiv);

        // Добавляем обработчик для кнопки удаления этого вопроса
        questionDiv.querySelector('.remove-question-btn').addEventListener('click', function() {
            removeQuestionField(this.dataset.questionNumber, true); // true для редактирования
        });
    });

    // --- НОВАЯ ФУНКЦИЯ: Удаление вопроса из формы редактирования ---
    function removeQuestionField(questionNumber, isEditing = false) {
        const container = isEditing ? editQuestionsContainer : document.getElementById('questions-container');
        const questionBlock = container.querySelector(`.question-block[data-question-number="${questionNumber}"]`);
        if (questionBlock) {
            questionBlock.remove();
        }
    }

    // --- НОВАЯ ФУНКЦИЯ: Сбор данных формы редактирования теста ---
    function collectEditedTestQuestions() {
        const questions = [];
        const questionBlocks = editQuestionsContainer.querySelectorAll('.question-block');
        
        questionBlocks.forEach(block => {
            const questionNumber = block.dataset.questionNumber;
            const questionText = document.querySelector(`textarea[name="edit-question-${questionNumber}-text"]`)?.value.trim();
            
            if (!questionText) return; // Пропустить пустые вопросы

            const options = {};
            const optionLetters = ['a', 'b', 'c', 'd'];
            for (let letter of optionLetters) {
                const optionInput = document.querySelector(`input[name="edit-option-${questionNumber}-${letter}"]`);
                const optionValue = optionInput ? optionInput.value.trim() : '';
                if (optionValue) { // Сохраняем только непустые варианты
                    options[letter] = optionValue;
                }
            }

            const correctAnswerRadio = document.querySelector(`input[name="edit-correct-answer-${questionNumber}"]:checked`);
            const correctAnswer = correctAnswerRadio ? correctAnswerRadio.value : null;

            // Убедимся, что правильный ответ существует среди вариантов
            if (correctAnswer && options.hasOwnProperty(correctAnswer)) {
                questions.push({
                    id: uuidv4(), // Генерируем новый ID для каждого вопроса
                    text: questionText,
                    options: options,
                    correctAnswer: correctAnswer
                });
            } else {
                console.warn(`Пропущен вопрос ${questionNumber} при редактировании: отсутствует правильный ответ или он не соответствует вариантам.`);
                // Можно показать предупреждение пользователю
            }
        });

        return questions;
    }
    // --- КОНЕЦ НОВОЙ ФУНКЦИЯ: Сбор данных формы редактирования теста ---

    // --- НОВАЯ ФУНКЦИЯ: Отправка формы редактирования мероприятия ---
    editEventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(editEventForm);
        try {
            // Сначала обновляем основные данные мероприятия
            const updateResponse = await fetch(`/api/events/${editingEventId}`, {
                method: 'PUT',
                body: formData
            });

            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                throw new Error(errorData.error || 'Ошибка при обновлении мероприятия.');
            }

            const updatedEvent = await updateResponse.json();

            // Затем обновляем тест, если мероприятие типа 'olympiad'
            const eventType = formData.get('type');
            if (eventType === 'olympiad') {
                const testName = formData.get('name') + ' - Тест (Обновлён)';
                const questions = collectEditedTestQuestions();
                
                if (questions.length > 0) {
                    const testResponse = await fetch(`/api/events/${editingEventId}/test`, {
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
                        throw new Error(testErrorData.error || 'Ошибка при обновлении теста.');
                    }
                } else {
                    // Если вопросы пустые, удаляем тест
                    const deleteTestResponse = await fetch(`/api/tests/${editingEventId}`, {
                        method: 'DELETE'
                    });
                    if (!deleteTestResponse.ok && deleteTestResponse.status !== 404) {
                        const deleteTestErrorData = await deleteTestResponse.json();
                        console.warn("Error deleting test:", deleteTestErrorData.error);
                    }
                }
            }

            // Скрываем форму редактирования и показываем список
            editEventSection.style.display = 'none';
            eventsList.style.display = 'block';
            loadEventsList(); // Обновляем список
            errorMessage.style.display = 'none'; // Скрываем ошибки
            console.log("Event updated successfully:", updatedEvent);
        } catch (error) {
            console.error("Update event error:", error);
            errorMessage.textContent = error.message || 'Ошибка при обновлении мероприятия (проверьте консоль).';
            errorMessage.style.display = 'block';
        }
    });
    // --- КОНЕЦ НОВОЙ ФУНКЦИЯ: Отправка формы редактирования мероприятия ---

    // --- НОВАЯ ФУНКЦИЯ: Отмена редактирования ---
    cancelEditBtn.addEventListener('click', () => {
        editEventSection.style.display = 'none';
        eventsList.style.display = 'block';
        editingEventId = null;
        editingEvent = null;
    });
    // --- КОНЕЦ НОВОЙ ФУНКЦИЯ: Отмена редактирования ---

    window.deleteEvent = async function(eventId) {
        if (!confirm('Вы уверены, что хотите удалить это мероприятие?')) return;

        try {
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadEventsList(); // Обновляем список
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
    loadAboutData(); // Загружаем данные "О нас" при инициализации
    
    // Показываем/скрываем секцию теста при изменении типа мероприятия
    document.getElementById('event-type').addEventListener('change', function() {
        const testSection = document.getElementById('olympiad-test-section');
        if (this.value === 'olympiad') {
            testSection.style.display = 'block';
        } else {
            testSection.style.display = 'none';
        }
    });

    // Показываем/скрываем секцию теста при изменении типа мероприятия в форме редактирования
    document.getElementById('edit-event-type').addEventListener('change', function() {
        const editTestSection = document.getElementById('edit-olympiad-test-section');
        if (this.value === 'olympiad') {
            editTestSection.style.display = 'block';
            // Если редактируем существующее мероприятие типа 'olympiad', загружаем вопросы
            if (editingEventId && editingEvent && editingEvent.type === 'olympiad') {
                loadTestQuestionsForEditing(editingEventId);
            }
        } else {
            editTestSection.style.display = 'none';
            editQuestionsContainer.innerHTML = ''; // Очищаем вопросы
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
