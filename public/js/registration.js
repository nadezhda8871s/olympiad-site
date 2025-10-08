// registration.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registration-form');
    const eventIdInput = document.getElementById('event-id');
    const successDiv = document.getElementById('success-message');
    const errorDiv = document.getElementById('error-message');
    const payButton = document.getElementById('pay-button');

    // Извлекаем ID мероприятия из URL
    const pathParts = window.location.pathname.split('/');
    const eventId = pathParts[pathParts.length - 1]; // Последняя часть URL
    if (!eventId) {
        errorDiv.textContent = 'Ошибка: ID мероприятия не найден в URL.';
        errorDiv.style.display = 'block';
        return;
    }
    eventIdInput.value = eventId; // Устанавливаем значение скрытого поля

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);

        try {
            const response = await fetch('/api/registration', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                form.style.display = 'none'; // Скрываем форму
                successDiv.style.display = 'block'; // Показываем сообщение об успехе
                errorDiv.style.display = 'none'; // Скрываем ошибки
            } else {
                const errorData = await response.json();
                errorDiv.textContent = errorData.error || 'Ошибка при отправке анкеты.';
                errorDiv.style.display = 'block';
                successDiv.style.display = 'none'; // Скрываем успех
            }
        } catch (error) {
            console.error("Registration error:", error);
            errorDiv.textContent = 'Произошла ошибка при отправке анкеты.';
            errorDiv.style.display = 'block';
            successDiv.style.display = 'none'; // Скрываем успех
        }
    });

    // Обработчик кнопки "Оплатить"
    payButton.addEventListener('click', () => {
        // Перенаправляем на страницу с реквизитами
        // или открываем модальное окно с реквизитами
        // или делаем POST запрос на сервер для генерации инвойса (если будет Robokassa)
        // Пока что, просто покажем алерт с инструкцией.
        alert('Пожалуйста, оплатите оргвзнос по реквизитам, указанным в информационном письме. После оплаты пришлите работу и копию квитанции на vsemnayka@gmail.com.');
        // Или перенаправим на страницу с реквизитами
        // window.location.href = '/payment-instructions'; // Эту страницу нужно создать
        // Или просто даем пользователю инструкции на этой же странице.
        // Добавим инструкцию под кнопкой:
        const instructionHTML = `
            <div class="payment-instructions">
                <h3>Реквизиты для оплаты:</h3>
                <p>ООО "РУБИКОН-ПРИНТ"</p>
                <p>ИНН: 2311372333</p>
                <p>Р/с: 40702810620000167717</p>
                <p>Банк: ООО "Банк Точка"</p>
                <p>БИК: 044525104</p>
                <p>К/с: 30101810745374525104</p>
                <p><strong>Сумма оргвзноса: указана в информационном письме мероприятия.</strong></p>
                <p>После оплаты, пожалуйста, пришлите <strong>работу</strong> и <strong>копию квитанции</strong> на адрес: <a href="mailto:vsemnayka@gmail.com">vsemnayka@gmail.com</a>.</p>
            </div>
        `;
        successDiv.insertAdjacentHTML('afterend', instructionHTML);
        payButton.style.display = 'none'; // Скрываем кнопку, чтобы не нажимали снова
    });
});
