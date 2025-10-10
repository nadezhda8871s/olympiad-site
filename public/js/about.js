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

            // Заполняем статические поля
            innSpan.textContent = aboutData.inn || '231120569701';
            phoneSpan.textContent = aboutData.phone || '89184455287';
            addressSpan.textContent = aboutData.address || 'г. Краснодар, ул. Виноградная, 58';
            emailLink.href = `mailto:${aboutData.email || 'vsemnayka@gmail.com'}`;
            emailLink.textContent = aboutData.email || 'vsemnayka@gmail.com';
            requisitesPre.textContent = aboutData.requisites || 'ООО "РУБИКОН-ПРИНТ"\nИНН: 2311372333\nР/с: 40702810620000167717\nБанк: ООО "Банк Точка"\nБИК: 044525104\nК/с: 30101810745374525104';

            // Заполняем редактируемое поле
            // Предположим, что в `aboutData` есть поле `customText`
            editableTextParagraph.textContent = aboutData.customText || 'Добро пожаловать! Участвуйте в олимпиадах, конкурсах научных работ, ВКР и конференциях!\nДокументы формируются в течение 5 дней. Удобная оплата. Высокий уровень мероприятий.';

        } catch (error) {
            console.error("Error loading 'about' ", error);
            // Можно показать сообщение об ошибке пользователю
        }
    }
});
