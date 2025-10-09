// registration.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registration-form');
    const eventIdInput = document.getElementById('event-id');
    const successDiv = document.getElementById('success-message');
    const errorDiv = document.getElementById('error-message');
    const payButton = document.getElementById('pay-button'); // Кнопка "Оплатить" (временно, если не для олимпиад)

    const pathParts = window.location.pathname.split('/');
    const eventId = pathParts[pathParts.length - 1];
    if (!eventId) {
        errorDiv.textContent = 'Ошибка: ID мероприятия не найден в URL.';
        errorDiv.style.display = 'block';
        return;
    }
    eventIdInput.value = eventId;

    let eventType = null;
    fetch(`/api/events/${eventId}`)
        .then(response => response.json())
        .then(event => {
            eventType = event.type;
        })
        .catch(error => {
            console.error("Error fetching event details for type check:", error);
            eventType = 'default';
        });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);

        try {
            const response = await fetch('/api/registration', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                form.style.display = 'none';
                errorDiv.style.display = 'none';
                successDiv.style.display = 'block';

                if (eventType === 'olympiad') {
                    // Для олимпиад - показываем инструкцию и ссылку на тест
                    const instructionHTML = `
                        <div class="payment-instructions">
                            <p>После оплаты оргвзноса, пожалуйста, пришлите <strong>копию квитанции</strong> на адрес: <a href="mailto:vsemnayka@gmail.com">vsemnayka@gmail.com</a>.</p>
                            <p>Также, после оплаты, вы можете <a href="/test/${eventId}">пройти тест</a> по ссылке.</p>
                        </div>
                    `;
                    successDiv.innerHTML = instructionHTML;
                } else {
                    // Для других - показываем только инструкцию об оплате
                    const instructionHTML = `
                        <div class="payment-instructions">
                            <p>После оплаты, пожалуйста, пришлите <strong>работу</strong> и <strong>копию квитанции</strong> на адрес: <a href="mailto:vsemnayka@gmail.com">vsemnayka@gmail.com</a>.</p>
                        </div>
                    `;
                    successDiv.innerHTML = instructionHTML;
                }
            } else {
                const errorData = await response.json();
                errorDiv.textContent = errorData.error || 'Ошибка при отправке анкеты.';
                errorDiv.style.display = 'block';
                successDiv.style.display = 'none';
            }
        } catch (error) {
            console.error("Registration error:", error);
            errorDiv.textContent = 'Произошла ошибка при отправке анкеты.';
            errorDiv.style.display = 'block';
            successDiv.style.display = 'none';
        }
    });

    // Убрана логика кнопки "Оплатить" из registration.js, так как теперь инструкция вставляется в successDiv
});
