const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(multer().none());

// Папки
const uploadsDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

// Путь к Excel файлу
const excelPath = path.join(dataDir, 'users.xlsx');

// Начальные мероприятия
let events = [
    { id: 1, title: "Олимпиада по математике", desc: "Тест по алгебре и геометрии", category: "student" },
    { id: 2, title: "Конкурс по русскому языку", desc: "Орфография и пунктуация", category: "school" },
    { id: 3, title: "Методический семинар", desc: "Для преподавателей", category: "teacher" }
];

// Начальные пользователи
let users = [];

// Email настройки
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-password' // используйте App Password
    }
});

// API: Получить мероприятия
app.get('/api/events', (req, res) => {
    res.json(events);
});

// API: Добавить мероприятие (админ)
app.post('/api/events', (req, res) => {
    const { title, desc, category } = req.body;
    const newEvent = {
        id: events.length + 1,
        title,
        desc,
        category
    };
    events.push(newEvent);
    res.json({ success: true });
});

// API: Регистрация
app.post('/api/register', async (req, res) => {
    const data = req.body;
    data.id = users.length + 1;
    users.push(data);

    // Отправка на почту
    await transporter.sendMail({
        to: 'info@example.com',
        subject: 'Новая регистрация',
        text: `ФИО: ${data.fio}, Email: ${data.email}, Учебное заведение: ${data.school}`
    });

    // Сохранить в Excel
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(users);
    xlsx.utils.book_append_sheet(wb, ws, "Users");
    xlsx.writeFile(wb, excelPath);

    res.json({ success: true });
});

// API: Получить пользователей
app.get('/api/users', (req, res) => {
    res.json(users);
});

// API: Документы
app.post('/api/docs', (req, res) => {
    const { content } = req.body;
    fs.writeFileSync(path.join(uploadsDir, 'docs.txt'), content);
    res.json({ success: true });
});

// Обслуживание статики из папки frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Обработка SPA: все маршруты, кроме API, возвращают index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Использовать порт из переменной окружения или 10000
const port = process.env.PORT || 10000;
app.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
});
