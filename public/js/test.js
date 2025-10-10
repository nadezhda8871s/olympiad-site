// test.js (обновлённый)
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('test-form');
    const eventIdInput = document.getElementById('event-id');
    const resultDiv = document.getElementById('test-result');
    const resultText = document.getElementById('result-text');
    const questionsContainer = document.getElementById('questions-container'); // Новый контейнер для вопросов

    // Извлекаем ID мероприятия из URL
    const pathParts = window.location.pathname.split('/');
    const eventId = pathParts[pathParts.length - 1];
    if (!eventId) {
        resultText.textContent = 'Ошибка: ID мероприятия не найден в URL.';
        resultDiv.style.display = 'block';
        return;
    }
    eventIdInput.value = eventId;

    // --- НОВАЯ ФУНКЦИЯ: Загрузка вопросов с сервера ---
    async function loadTestQuestions() {
        try {
            const response = await fetch(`/api/tests/${eventId}`);
            if (!response.ok) {
                if (response.status === 404) {
                     resultText.innerHTML = 'Тест для этого мероприятия не найден.';
                } else {
                     resultText.innerHTML = `Ошибка загрузки теста: ${response.statusText}`;
                }
                resultDiv.style.display = 'block';
                return;
            }
            const testData = await response.json();
            displayTestQuestions(testData.questions);
        } catch (error) {
            console.error("Error loading test questions:", error);
            resultText.textContent = 'Ошибка сети при загрузке вопросов теста.';
            resultDiv.style.display = 'block';
        }
    }

    function displayTestQuestions(questions) {
        questionsContainer.innerHTML = ''; // Очищаем контейнер
        questions.forEach((q, index) => {
            const questionNumber = index + 1;
            const questionDiv = document.createElement('div');
            questionDiv.className = 'question';
            let optionsHtml = '';
            for (const [key, value] of Object.entries(q.options)) {
                if (value) { // Показываем только непустые варианты
                    optionsHtml += `<label><input type="radio" name="q${questionNumber}" value="${key}" required> ${key.toUpperCase()}) ${value}</label><br>`;
                }
            }
            questionDiv.innerHTML = `
                <h3>Вопрос ${questionNumber}: ${q.text}</h3>
                ${optionsHtml}
            `;
            questionsContainer.appendChild(questionDiv);
        });
        form.style.display = 'block'; // Показываем форму после загрузки вопросов
    }
    // --- КОНЕЦ НОВОЙ ФУНКЦИИ ---

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Простая проверка (замените на реальную логику проверки)
        // Предположим, правильные ответы хранятся где-то (например, в тестовых данных, полученных ранее)
        // Для простоты, пусть правильные ответы будут в массиве (в реальности они должны быть в `testData`)
        // const correctAnswers = ['a', 'c', 'b', 'a', 'c', 'b', 'a', 'c', 'b', 'a', 'c', 'b', 'a', 'c', 'c']; // Пример
        
        // В реальности, мы должны получить правильные ответы из `testData`, загруженного ранее.
        // Но так как `testData` у нас локальная переменная внутри `loadTestQuestions`,
        // нам нужно либо передать её сюда, либо перезапросить.
        // Проще всего - использовать `testData` из замыкания или сделать её глобальной.
        // Переделаем немного логику.

        let testDataFromServer = null;
        try {
            const response = await fetch(`/api/tests/${eventId}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            testDataFromServer = await response.json();
        } catch (error) {
            console.error("Failed to re-fetch test data for scoring:", error);
            resultText.textContent = 'Ошибка при подсчёте результатов.';
            resultDiv.style.display = 'block';
            return;
        }

        let score = 0;
        const totalQuestions = testDataFromServer.questions.length;

        for (let i = 1; i <= totalQuestions; i++) {
            const selectedOption = form.querySelector(`input[name="q${i}"]:checked`);
            if (selectedOption) {
                const questionIndex = i - 1;
                const correctAnswer = testDataFromServer.questions[questionIndex].correctAnswer;
                if (selectedOption.value === correctAnswer) {
                    score++;
                }
            }
            // Если не выбран ответ, он не засчитывается
        }

        // Отправляем результаты на сервер
        await sendTestResults(eventId, score, getAnswers());

        // Показываем результат и инструкцию
        resultText.innerHTML = `Вы ответили правильно на ${score} из ${totalQuestions} вопросов.<br><br>
                                <strong>После оплаты, пожалуйста, пришлите копию квитанции на адрес: <a href="mailto:vsemnayka@gmail.com">vsemnayka@gmail.com</a>.</strong>`;
        resultDiv.style.display = 'block';
        form.style.display = 'none'; // Скрываем форму
    });

    async function sendTestResults(eventId, score, answers) {
        try {
            // Пока что, userId будет 'anonymous'
            const response = await fetch('/api/test-results', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    eventId: eventId,
                    userId: 'anonymous',
                    answers: answers,
                    score: score
                })
            });

            if (!response.ok) {
                console.error("Failed to save test results to server:", response.statusText);
            } else {
                console.log("Test results saved successfully.");
            }
        } catch (error) {
            console.error("Error sending test results:", error);
        }
    }

    function getAnswers() {
        const answers = {};
        // Предполагаем, что вопросы нумеруются от 1 до N
        // Нужно узнать количество вопросов. Можно взять из формы.
        const questionInputs = form.querySelectorAll('input[name^="q"]');
        const questionNumbers = [...new Set([...questionInputs].map(input => parseInt(input.name.replace('q', ''))))];
        questionNumbers.sort((a, b) => a - b);

        questionNumbers.forEach(num => {
            const selectedOption = form.querySelector(`input[name="q${num}"]:checked`);
            answers[`q${num}`] = selectedOption ? selectedOption.value : null;
        });
        return answers;
    }

    // --- ИНИЦИАЛИЗАЦИЯ: Загружаем вопросы при загрузке страницы ---
    loadTestQuestions();
    // --- КОНЕЦ ИНИЦИАЛИЗАЦИИ ---
});
