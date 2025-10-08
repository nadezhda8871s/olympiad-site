// Мероприятия (берутся с бэкенда)
let events = [];

// Загрузка мероприятий с сервера
async function loadEvents() {
    const response = await fetch('/api/events');
    events = await response.json();
    renderEvents();
}

function renderEvents() {
    const container = document.getElementById("events-container");
    const filtered = events.filter(e => currentFilter === "all" || e.category === currentFilter);

    container.innerHTML = filtered.map(e => `
        <div class="event-card">
            <h3>${e.title}</h3>
            <p class="desc">${e.desc}</p>
            <button class="btn btn-primary" onclick="showDetails(${e.id})">Подробнее</button>
            <button class="btn btn-secondary" onclick="openRegistration(${e.id})">Регистрация</button>
        </div>
    `).join("");
}

function showDetails(id) {
    alert(`Подробнее о мероприятии с ID: ${id}`);
}

function openRegistration(id) {
    currentEventId = id;
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Регистрация на мероприятие</h2>
            <form id="reg-form">
                <label>ФИО:</label><input type="text" id="fio" required><br>
                <label>Учебное заведение:</label><input type="text" id="school" required><br>
                <label>Страна:</label><input type="text" id="country" required><br>
                <label>Населенный пункт:</label><input type="text" id="city" required><br>
                <label>Email:</label><input type="email" id="email" required><br>
                <label><input type="checkbox" required> Прочитал Пользовательское соглашение</label><br>
                <label><input type="checkbox" required> Прочитал Политику конфиденциальности</label><br>
                <button type="submit">Начать</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("reg-form").addEventListener("submit", async function(e) {
        e.preventDefault();
        const data = {
            fio: document.getElementById("fio").value,
            school: document.getElementById("school").value,
            country: document.getElementById("country").value,
            city: document.getElementById("city").value,
            email: document.getElementById("email").value,
            eventId: currentEventId
        };

        await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        modal.remove();
        alert("Регистрация прошла успешно. Начинаем тест...");
        startTest();
    });
}

function startTest() {
    // Простой тест
    const questions = [
        { q: "Сколько будет 2+2?", a: ["3", "4", "5"], correct: 1 },
        { q: "Столица России?", a: ["Минск", "Москва", "Берлин"], correct: 1 }
    ];

    let html = '<div class="test"><h2>Тест</h2>';
    questions.forEach((q, i) => {
        html += `<p>${q.q}</p>`;
        q.a.forEach((opt, j) => {
            html += `<label><input type="radio" name="q${i}" value="${j}"> ${opt}</label><br>`;
        });
    });
    html += '<button onclick="submitTest()">Отправить</button></div>';
    document.body.innerHTML = html;
}

function submitTest() {
    // Подсчет результата
    const questions = [
        { q: "Сколько будет 2+2?", a: ["3", "4", "5"], correct: 1 },
        { q: "Столица России?", a: ["Минск", "Москва", "Берлин"], correct: 1 }
    ];
    let correct = 0;
    questions.forEach((q, i) => {
        const selected = document.querySelector(`input[name=q${i}]:checked`);
        if (selected && parseInt(selected.value) === q.correct) correct++;
    });

    const percent = Math.round((correct / questions.length) * 100);
    showResult(percent);
}

function showResult(percent) {
    let award = "Сертификат";
    if (percent >= 60) award = "Диплом 1 степени";
    else if (percent >= 40) award = "Диплом 2 степени";
    else if (percent >= 20) award = "Диплом 3 степени";

    const html = `
        <div class="result">
            <h2>Ваш результат: ${percent}%</h2>
            <p>Вы можете получить: ${award}</p>
            <input type="text" placeholder="Научный руководитель (преподаватель)">
            <button>Оплатить документ</button>
            <button>Оплатить благодарность руководителю</button>
        </div>
    `;
    document.body.innerHTML = html;
}

let currentFilter = "all";

document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelector(".filter-btn.active").classList.remove("active");
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        renderEvents();
    });
});

document.getElementById("search-input").addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const container = document.getElementById("events-container");
    const filtered = events.filter(e =>
        e.title.toLowerCase().includes(query) || e.desc.toLowerCase().includes(query)
    );

    container.innerHTML = filtered.map(e => `
        <div class="event-card">
            <h3>${e.title}</h3>
            <p class="desc">${e.desc}</p>
            <button class="btn btn-primary">Подробнее</button>
            <button class="btn btn-secondary" onclick="openRegistration(${e.id})">Регистрация</button>
        </div>
    `).join("");
});

loadEvents();
