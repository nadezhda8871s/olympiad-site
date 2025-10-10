// admin.js (обновлённый фрагмент)
document.addEventListener('DOMContentLoaded', () => {
    // ... (предыдущие переменные и инициализация) ...

    const uploadTestForm = document.getElementById('upload-test-form');
    const testEventIdSelect = document.getElementById('test-event-id');
    const questionsContainer = document.getElementById('questions-container');
    const addQuestionBtn = document.getElementById('add-question-btn');
    // ... (другие переменные) ...

    // --- НОВАЯ ФУНКЦИЯ: Загрузка списка мероприятий для выпадающего списка ---
    async function loadEventsForSelect() {
        try {
            const response = await fetch('/api/admin/events', {
                 credentials: 'include' // Убедитесь, что сессия передаётся, если требуется
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const events = await response.json();
            testEventIdSelect.innerHTML = ''; // Очищаем список
            events.forEach(event => {
                const option = document.createElement('option');
                option.value = event.id;
                option.textContent = `${event.name} (${event.type})`;
                testEventIdSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error loading events for select:", error);
            errorMessage.textContent = 'Ошибка загрузки списка мероприятий для выбора.';
            errorMessage.style.display = 'block';
        }
    }
    // --- КОНЕЦ НОВОЙ ФУНКЦИИ ---

    // --- НОВАЯ ФУНКЦИЯ: Добавление поля для нового вопроса ---
    let questionCounter = 0; // Для уникальных ID полей
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
        questionsContainer.appendChild(questionDiv);

        // Добавляем обработчик для кнопки удаления этого вопроса
        questionDiv.querySelector('.remove-question-btn').addEventListener('click', function() {
            removeQuestionField(this.dataset.questionNumber);
        });
    }

    function removeQuestionField(questionNumber) {
        const questionBlock = document.querySelector(`.question-block[data-question-number="${questionNumber}"]`);
        if (questionBlock) {
            questionBlock.remove();
            // Можно пересчитать номера, но для простоты оставим как есть
        }
    }
    // --- КОНЕЦ НОВОЙ ФУНКЦИИ ---

    // --- НОВАЯ ФУНКЦИЯ: Сбор данных формы теста ---
    function collectTestData() {
        const formData = new FormData(uploadTestForm);
        const eventId = formData.get('eventId');
        const testName = formData.get('testName');

        if (!eventId || !testName) {
            alert('Пожалуйста, выберите мероприятие и введите название теста.');
            return null;
        }

        const questions = [];
        const questionBlocks = document.querySelectorAll('.question-block');
        
        if (questionBlocks.length === 0) {
            alert('Пожалуйста, добавьте хотя бы один вопрос.');
            return null;
        }

        for (let block of questionBlocks) {
            const questionNumber = block.dataset.questionNumber;
            const questionText = formData.get(`question-${questionNumber}-text`);
            const correctAnswer = formData.get(`correct-answer-${questionNumber}`);

            if (!questionText) continue; // Пропустить пустые вопросы

            const options = {};
            const optionLetters = ['a', 'b', 'c', 'd'];
            for (let letter of optionLetters) {
                const optionValue = formData.get(`option-${questionNumber}-${letter}`);
                if (optionValue !== null) { // Разрешаем пустые строки, но не null
                    options[letter] = optionValue.trim();
                }
            }

            // Убедимся, что правильный ответ существует среди вариантов
            if (correctAnswer && options.hasOwnProperty(correctAnswer)) {
                questions.push({
                    id: uuidv4(), // Генерируем уникальный ID для вопроса
                    text: questionText,
                    options: options,
                    correctAnswer: correctAnswer
                });
            } else {
                alert(`Ошибка в вопросе ${questionNumber}: выбран неправильный правильный ответ или он отсутствует.`);
                return null; // Прерываем сбор данных
            }
        }

        return {
            eventId: eventId,
            testName: testName,
            questions: questions
        };
    }
    // --- КОНЕЦ НОВОЙ ФУНКЦИИ ---

    // --- НОВЫЙ ОБРАБОТЧИК: Отправка формы теста ---
    uploadTestForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const testData = collectTestData();
        if (!testData) {
            // collectTestData уже показал alert при ошибке
            return;
        }

        try {
            const response = await fetch('/api/admin/tests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // credentials: 'include' // Убедитесь, что сессия передаётся, если требуется
                },
                body: JSON.stringify(testData)
            });

            if (response.ok) {
                const result = await response.json();
                alert('Тест успешно сохранён!');
                uploadTestForm.reset();
                questionsContainer.innerHTML = ''; // Очищаем поля вопросов
                questionCounter = 0; // Сбрасываем счётчик
                loadEventsForSelect(); // Перезагружаем список мероприятий на случай изменений
                errorMessage.style.display = 'none';
            } else {
                const errorData = await response.json();
                errorMessage.textContent = errorData.error || 'Ошибка при сохранении теста.';
                errorMessage.style.display = 'block';
            }
        } catch (error) {
            console.error("Error uploading test:", error);
            errorMessage.textContent = 'Ошибка сети при сохранении теста.';
            errorMessage.style.display = 'block';
        }
    });
    // --- КОНЕЦ НОВОГО ОБРАБОТЧИКА ---

    // --- НОВЫЙ ОБРАБОТЧИК: Кнопка "Добавить вопрос" ---
    addQuestionBtn.addEventListener('click', addQuestionField);
    // --- КОНЕЦ НОВОГО ОБРАБОТЧИКА ---

    // ... (предыдущие функции и инициализации: loadEventsList, loadRegistrationsList, deleteEvent, downloadRegistrations) ...

    // --- ИНИЦИАЛИЗАЦИЯ НОВОЙ ФУНКЦИОНАЛЬНОСТИ ---
    // Загружаем список мероприятий при загрузке страницы админки
    loadEventsForSelect();
    // --- КОНЕЦ ИНИЦИАЛИЗАЦИИ ---

    // ... (остальной код admin.js без изменений) ...
});

// ... (функция uuidv4, если не была определена ранее) ...
// Если uuidv4 не определена глобально, можно использовать простую реализацию или импортировать библиотеку.
// Для простоты, добавим её сюда.
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
