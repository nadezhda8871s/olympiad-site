// server.js
const express = require('express');
const multer = require('multer'); // Для загрузки файлов в админке и обработки форм
const session = require('express-session'); // Для сессий администратора
const path = require('path');
const fs = require('fs').promises; // Для асинхронной работы с файлами
const { v4: uuidv4 } = require('uuid'); // Для генерации уникальных ID

const app = express();
const PORT = process.env.PORT || 10000; // Используем переменную PORT от Render

// --- Конфигурация ---
// Путь к JSON файлу данных
const DATA_FILE = path.join(__dirname, 'data.json');
// Путь к папке загрузок
const UPLOAD_PATH = path.join(__dirname, 'public', 'uploads');

// --- Промежуточное ПО ---
app.use(express.static('public')); // Статические файлы (CSS, JS, изображения, uploads)

// Конфигурация сессий
app.use(session({
    secret: 'your_secret_key_here', // Замените на надежный секретный ключ!
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Установите true, если используете HTTPS
}));

// --- Middleware для обработки форм ---
// Для формы регистрации (без файлов) используем multer().none()
const urlEncodedParser = multer().none();

// --- Вспомогательные функции для работы с JSON файлом ---
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Если файл не существует, создаем пустый объект
            const initialData = {
                events: [],
                admin: { login: "admin", password: "password" } // Установите пароль!
            };
            await writeData(initialData);
            console.log("Created initial data.json file.");
            return initialData;
        } else {
            console.error("Error reading data file:", error);
            throw error;
        }
    }
}

async function writeData(data) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error("Error writing data file:", error);
        throw error;
    }
}

// --- Middleware для проверки администратора ---
function requireAdmin(req, res, next) {
    if (req.session && req.session.adminLoggedIn) {
        next();
    } else {
        res.status(401).send('Unauthorized');
    }
}

// --- Конфигурация multer для загрузки файлов в админке ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_PATH); // Загружаем в public/uploads
    },
    filename: function (req, file, cb) {
        // Генерируем уникальное имя файла
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- Маршруты ---

// Главная страница
app.get('/', async (req, res) => {
    try {
        const data = await readData();
        // Отправляем HTML файл
        res.sendFile(path.join(__dirname, 'views', 'index.html'));
    } catch (error) {
        console.error("Error serving index:", error);
        res.status(500).send("Server Error");
    }
});

// Страница олимпиад
app.get('/olympiads', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'olympiads.html'));
});

// Страница конкурсов
app.get('/contests', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'contests.html'));
});

// Страница конференций
app.get('/conferences', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'conferences.html'));
});

// Страница регистрации
app.get('/registration/:eventId', (req, res) => {
    // Проверяем, что eventId есть, иначе редирект или ошибка
    if (!req.params.eventId) {
         res.status(400).send("Event ID is required");
         return;
    }
    res.sendFile(path.join(__dirname, 'views', 'registration.html'));
});

// Страница теста
app.get('/test/:eventId', (req, res) => {
    if (!req.params.eventId) {
         res.status(400).send("Event ID is required");
         return;
    }
    res.sendFile(path.join(__dirname, 'views', 'test.html'));
});

// Страница "О нас"
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

// Страница администратора
app.get('/admin', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// --- API маршруты ---

// Получить все мероприятия (для главной страницы и фильтрации)
app.get('/api/events', async (req, res) => {
    try {
        const data = await readData();
        // Фильтрация по типу (например, ?type=olympiad)
        const type = req.query.type;
        let events = data.events;
        if (type) {
            events = events.filter(event => event.type === type);
        }
        res.json(events);
    } catch (error) {
        console.error("Error fetching events:", error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Получить конкретное мероприятие (для информационного письма/регистрации)
app.get('/api/events/:id', async (req, res) => {
    try {
        const data = await readData();
        const event = data.events.find(e => e.id === req.params.id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(event);
    } catch (error) {
        console.error("Error fetching event:", error);
        res.status(500).json({ error: 'Failed to fetch event' });
    }
});

// Аутентификация администратора
app.post('/api/admin/login', async (req, res) => {
    const { login, password } = req.body;
    try {
        const data = await readData();
        if (data.admin && data.admin.login === login && data.admin.password === password) {
            req.session.adminLoggedIn = true;
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

// Выход администратора
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error during logout:", err);
            return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        res.json({ success: true });
    });
});

// Добавить мероприятие (требует аутентификации)
app.post('/api/events', requireAdmin, upload.single('infoLetterFile'), async (req, res) => {
    try {
        const data = await readData();
        const newEvent = {
            id: uuidv4(), // Уникальный ID
            name: req.body.name,
            description: req.body.description,
            type: req.body.type, // olympiad, contest, conference
            subtype: req.body.subtype || req.body.type, // subtype для фильтрации, если не передан, используем type
            infoLetterFileName: req.file ? req.file.filename : null // Имя файла, если загружен
        };
        data.events.push(newEvent);
        await writeData(data);
        res.json({ success: true, event: newEvent });
    } catch (error) {
        console.error("Error adding event:", error);
        res.status(500).json({ error: 'Failed to add event' });
    }
});

// Удалить мероприятие (требует аутентификации)
app.delete('/api/events/:id', requireAdmin, async (req, res) => {
    try {
        const data = await readData();
        const originalLength = data.events.length;
        data.events = data.events.filter(event => event.id !== req.params.id);
        if (data.events.length === originalLength) {
            // Мероприятие не найдено
            return res.status(404).json({ error: 'Event not found' });
        }
        await writeData(data);
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

// Сохранить результаты теста (пока просто в JSON, как отдельный массив)
app.post('/api/test-results', async (req, res) => {
    try {
        const { eventId, userId, answers, score } = req.body; // userId можно генерировать или получать откуда-то
        if (!eventId || !answers || score === undefined) {
             return res.status(400).json({ error: 'Event ID, answers, and score are required' });
        }
        const data = await readData();
        if (!data.testResults) {
            data.testResults = [];
        }
        data.testResults.push({
            id: uuidv4(),
            eventId: eventId,
            userId: userId || 'anonymous', // Можно улучшить генерацию ID пользователя
            answers: answers,
            score: score,
            timestamp: new Date().toISOString()
        });
        await writeData(data);
        res.json({ success: true });
    } catch (error) {
        console.error("Error saving test results:", error);
        res.status(500).json({ error: 'Failed to save test results' });
    }
});

// Отправить анкету (пока просто сохраняем в JSON)
// ИСПРАВЛЕНО: используем urlEncodedParser перед маршрутом
app.post('/api/registration', urlEncodedParser, async (req, res) => {
    try {
        const { eventId, surname, name, patronymic, institution, country, city, email, phone } = req.body;
        if (!eventId || !surname || !name || !email) {
             return res.status(400).json({ error: 'Event ID, Surname, Name, and Email are required' });
        }
        const data = await readData();
        if (!data.registrations) {
            data.registrations = [];
        }
        data.registrations.push({
            id: uuidv4(),
            eventId: eventId,
            surname: surname,
            name: name,
            patronymic: patronymic,
            institution: institution,
            country: country,
            city: city,
            email: email,
            phone: phone,
            timestamp: new Date().toISOString()
        });
        await writeData(data);
        res.json({ success: true });
    } catch (error) {
        console.error("Error saving registration:", error);
        res.status(500).json({ error: 'Failed to save registration' });
    }
});

// --- Запуск сервера ---
// Привязываем к 0.0.0.0 и используем переменную PORT
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Data file path: ${DATA_FILE}`);
    console.log(`Uploads path: ${UPLOAD_PATH}`);
});
