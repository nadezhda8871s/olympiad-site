// test.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('test-form');
    const eventIdInput = document.getElementById('event-id');
    const resultDiv = document.getElementById('test-result');
    const resultText = document.getElementById('result-text');

    const pathParts = window.location.pathname.split('/');
    const eventId = pathParts[pathParts.length - 1];
    if (!eventId) {
        resultText.textContent = 'Ошибка: ID мероприятия не найден в URL.';
        resultDiv.style.display = 'block';
        return;
    }
    eventIdInput.value = eventId;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Простая проверка (замените на реальную логику проверки)
        const correctAnswers = ['a', 'c', 'b', 'a', 'c', 'b', 'a', 'c', 'b', 'a', 'c', 'b', 'a', 'c', 'c'];
        let score = 0;
        const totalQuestions = 15;

        for (let i = 1; i <= totalQuestions; i++) {
            const selectedOption = form.querySelector(`input[name="q${i}"]:checked`);
            if (selectedOption && selectedOption.value === correctAnswers[i-1]) {
                score++;
            }
        }

        sendTestResults(eventId, score, getAnswers());

        resultText.innerHTML = `Вы ответили правильно на ${score} из ${totalQuestions} вопросов.<br><br>
                                <strong>После оплаты, пожалуйста, пришлите копию квитанции на адрес: <a href="mailto:vsemnayka@gmail.com">vsemnayka@gmail.com</a>.</strong>`;
        resultDiv.style.display = 'block';
        form.style.display = 'none';
    });

    async function sendTestResults(eventId, score, answers) {
        try {
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
        for (let i = 1; i <= 15; i++) {
            const selectedOption = form.querySelector(`input[name="q${i}"]:checked`);
            answers[`q${i}`] = selectedOption ? selectedOption.value : null;
        }
        return answers;
    }
});
