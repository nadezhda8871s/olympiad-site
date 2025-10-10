// public/js/about.js
document.addEventListener('DOMContentLoaded', () => {
    const aboutSection = document.querySelector('.about-section');
    const editableTextContainer = document.getElementById('editable-about-text-container');
    const editableTextParagraph = document.getElementById('editable-about-text');
    const innSpan = document.getElementById('about-inn');
    const phoneSpan = document.getElementById('about-phone');
    const addressSpan = document.getElementById('about-address');
    const emailLink = document.getElementById('about-email');
    const requisitesPre = document.getElementById('about-requisites');

    console.log("About page loaded...");

    // Загружаем данные "О нас"
    loadAboutData();

    async function loadAboutData() {
        try {
            const response = await fetch('/api/admin/about');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const aboutData = await response.json();

           
            // Заполняем редактируемое поле
            // Предположим, что в `aboutData` есть поле `customText`
            editableTextParagraph.textContent = aboutData.customText || 'Добро пожаловать! Участвуйте в олимпиадах, конкурсах научных работ, ВКР и конференциях!\nДокументы формируются в течение 5 дней. Удобная оплата. Высокий уровень мероприятий.';

        } catch (error) {
            console.error("Error loading 'about' ", error);
            // Можно показать сообщение об ошибке пользователю
        }
    }
});
