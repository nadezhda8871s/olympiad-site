// server.js
const express = require('express');
const multer = require('multer');
const session = require('cookie-session');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 10000;

// --- Конфигурация ---
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOAD_PATH = path.join(__dirname, 'public', 'uploads');

// --- Промежуточное ПО ---
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Конфигурация сессий
app.use(session({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'your_strong_fallback_secret_key_here_change_it'],
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,
    sameSite: 'lax'
}));

// --- Проверка и создание папки uploads при запуске ---
async function ensureUploadsDir() {
    try {
        await fs.access(UPLOAD_PATH);
        console.log("Uploads directory exists:", UPLOAD_PATH);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log("Uploads directory does not exist, creating:", UPLOAD_PATH);
            await fs.mkdir(UPLOAD_PATH, { recursive: true });
            console.log("Uploads directory created:", UPLOAD_PATH);
        } else {
            console.error("Error checking/uploads directory:", error);
            throw error;
        }
    }
}

// --- Вспомогательные функции для работы с JSON файлом ---
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        console.log("Data read successfully from:", DATA_FILE); // Лог для отладки
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading data file:", error);
        if (error.code === 'ENOENT') {
            const initialData = {
                events: [],
                // admin: { login: "admin", password: "password" }, // Удалено
                registrations: [],
                testResults: [],
                tests: [], // Для хранения тестов
                about: { // Инициализация данных "О нас"
                    inn: "231120569701",
                    phone: "89184455287",
                    address: "г. Краснодар, ул. Виноградная, 58",
                    email: "vsemnayka@gmail.com",
                    requisites: "ООО \"РУБИКОН-ПРИНТ\"\nИНН: 2311372333\nР/с: 40702810620000167717\nБанк: ООО \"Банк Точка\"\nБИК: 044525104\nК/с: 30101810745374525104",
                    customText: "Добро пожаловать! Участвуйте в олимпиадах, конкурсах научных работ, ВКР и конференциях!\nДокументы формируются в течение 5 дней. Удобная оплата. Высокий уровень мероприятий."
                }
            };
            await writeData(initialData);
            console.log("Created initial data.json file.");
            return initialData;
        } else if (error instanceof SyntaxError) {
            console.error("Syntax error in data.json:", error.message);
            return { events: [], // admin: { login: "admin", password: "password" }, registrations: [], testResults: [], tests: [], about: {} };
        } else {
            throw error;
        }
    }
}

async function writeData(data) {
    try {
        console.log("Writing data to:", DATA_FILE); // Лог для отладки
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log("Data written successfully"); // Лог для отладки
    } catch (error) {
        console.error("Error writing data file:", error);
        throw error;
    }
}

// --- Middleware для проверки администратора (открыто для всех) ---
function allowAll(req, res, next) {
    next();
}

// --- Конфигурация multer для загрузки файлов в админке ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_PATH);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// --- Маршруты ---

app.get('/', async (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'views', 'index.html'));
    } catch (error) {
        console.error("Error serving index:", error);
        res.status(500).send("Server Error");
    }
});

app.get('/olympiads', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'olympiads.html'));
});

app.get('/contests', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'contests.html'));
});

app.get('/conferences', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'conferences.html'));
});

app.get('/registration/:eventId', (req, res) => {
    if (!req.params.eventId) {
         res.status(400).send("Event ID is required");
         return;
    }
    res.sendFile(path.join(__dirname, 'views', 'registration.html'));
});

app.get('/test/:eventId', (req, res) => {
    if (!req.params.eventId) {
         res.status(400).send("Event ID is required");
         return;
    }
    res.sendFile(path.join(__dirname, 'views', 'test.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

// Страница администратора - теперь доступна всем, без проверки сессии
app.get('/admin', allowAll, (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// --- API маршруты ---

app.get('/api/events', async (req, res) => {
    try {
        const data = await readData();
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

// Получить все мероприятия (для админки - теперь доступно без аутентификации)
app.get('/api/admin/events', allowAll, async (req, res) => {
    try {
        const data = await readData();
        res.json(data.events);
    } catch (error) {
        console.error("Error fetching events for admin:", error);
        res.status(500).json({ error: 'Failed to fetch events for admin' });
    }
});

// Получить регистрации (для админки - теперь доступно без аутентификации)
app.get('/api/admin/registrations', allowAll, async (req, res) => {
    try {
        const data = await readData();
        res.json({
            registrations: data.registrations || [],
            events: data.events || [],
            testResults: data.testResults || []
        });
    } catch (error) {
        console.error("Error fetching registrations:", error);
        res.status(500).json({ error: 'Failed to fetch registrations' });
    }
});

// Получить результаты тестов (для админки - теперь доступно без аутентификации)
app.get('/api/admin/test-results', allowAll, async (req, res) => {
    try {
        const data = await readData();
        res.json(data.testResults || []);
    } catch (error) {
        console.error("Error fetching test results:", error);
        res.status(500).json({ error: 'Failed to fetch test results' });
    }
});

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

// --- НОВЫЕ API маршруты для работы с "О нас" ---

// Получить данные "О нас" (для админки - теперь доступно без аутентификации)
app.get('/api/admin/about', allowAll, async (req, res) => {
    try {
        const data = await readData();
        const aboutData = {
            inn: data.about?.inn || '',
            phone: data.about?.phone || '',
            address: data.about?.address || '',
            email: data.about?.email || '',
            requisites: data.about?.requisites || '',
            customText: data.about?.customText || ''
        };
        res.json(aboutData);
    } catch (error) {
        console.error("Error fetching 'about' ", error);
        res.status(500).json({ error: 'Failed to fetch about data' });
    }
});

// Обновить данные "О нас" (для админки - теперь доступно без аутентификации)
app.post('/api/admin/about', allowAll, async (req, res) => {
    try {
        const { inn, phone, address, email, requisites, customText } = req.body;
        const data = await readData();

        if (!data.about) {
            data.about = {};
        }

        data.about.inn = inn;
        data.about.phone = phone;
        data.about.address = address;
        data.about.email = email;
        data.about.requisites = requisites;
        data.about.customText = customText; // Сохраняем произвольный текст

        await writeData(data);
        res.json({ success: true });
    } catch (error) {
        console.error("Error updating 'about' ", error);
        res.status(500).json({ error: 'Failed to update about data' });
    }
});
// --- КОНЕЦ НОВЫХ API маршрутов для "О нас" ---

// --- НОВЫЙ маршрут: Получить тест по ID мероприятия ---
app.get('/api/tests/:eventId', async (req, res) => {
    try {
        const data = await readData();
        if (!data.tests) {
             return res.status(404).json({ error: 'Test not found' });
        }
        const test = data.tests.find(t => t.eventId === req.params.eventId);
        if (!test) {
            return res.status(404).json({ error: 'Test not found for this event' });
        }
        res.json(test);
    } catch (error) {
        console.error("Error fetching test:", error);
        res.status(500).json({ error: 'Failed to fetch test' });
    }
});
// --- КОНЕЦ НОВОГО маршрута ---

// --- НОВЫЙ маршрут: Добавить мероприятие с тестом ---
app.post('/api/events', allowAll, upload.single('infoLetterFile'), async (req, res) => {
    try {
        const data = await readData();
        const { name, description, type, subtype, testQuestions } = req.body; // Добавлено testQuestions

        const newEvent = {
            id: uuidv4(),
            name: name,
            description: description,
            type: type,
            subtype: subtype || type,
            infoLetterFileName: req.file ? req.file.filename : null
        };

        // Обработка теста для олимпиад
        if (type === 'olympiad' && testQuestions) {
            try {
                const questions = JSON.parse(testQuestions);
                if (Array.isArray(questions) && questions.length > 0) {
                    if (!data.tests) data.tests = [];
                    const testId = uuidv4();
                    data.tests.push({
                        id: testId,
                        eventId: newEvent.id,
                        testName: `${name} - Тест`,
                        questions: questions, // Массив объектов вопросов
                        createdAt: new Date().toISOString()
                    });
                }
            } catch (parseError) {
                console.error("Error parsing test questions:", parseError);
                // Можно вернуть ошибку, если тест обязателен
                // return res.status(400).json({ error: 'Некорректный формат данных теста.' });
            }
        }

        data.events.push(newEvent);
        await writeData(data);
        res.json({ success: true, event: newEvent });
    } catch (error) {
        console.error("Error adding event:", error);
        res.status(500).json({ error: 'Failed to add event' });
    }
});
// --- КОНЕЦ НОВОГО маршрута ---

// --- НОВЫЙ маршрут: Обновить мероприятие ---
app.put('/api/events/:id', allowAll, upload.single('infoLetterFile'), async (req, res) => {
    try {
        const data = await readData();
        const eventId = req.params.id;
        const { name, description, type, subtype, testQuestions } = req.body; // Добавлено testQuestions

        const eventIndex = data.events.findIndex(e => e.id === eventId);
        if (eventIndex === -1) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const updatedEvent = {
            id: eventId,
            name: name,
            description: description,
            type: type,
            subtype: subtype || type,
            infoLetterFileName: req.file ? req.file.filename : data.events[eventIndex].infoLetterFileName // Сохраняем старое имя файла, если новый не загружен
        };

        data.events[eventIndex] = updatedEvent;

        // Обработка теста для олимпиад при обновлении
        if (type === 'olympiad' && testQuestions) {
            try {
                const questions = JSON.parse(testQuestions);
                if (Array.isArray(questions) && questions.length > 0) {
                    if (!data.tests) data.tests = [];
                    // Проверяем, существует ли уже тест для этого мероприятия
                    const existingIndex = data.tests.findIndex(t => t.eventId === eventId);
                    const testData = {
                        id: uuidv4(),
                        eventId: eventId,
                        testName: `${name} - Тест (Обновлён)`,
                        questions: questions, // Массив объектов вопросов
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };

                    if (existingIndex >= 0) {
                        // Обновляем существующий тест
                        testData.id = data.tests[existingIndex].id; // Сохраняем ID
                        testData.createdAt = data.tests[existingIndex].createdAt; // Сохраняем дату создания
                        data.tests[existingIndex] = testData;
                    } else {
                        // Добавляем новый тест
                        data.tests.push(testData);
                    }
                } else {
                    // Если вопросы пустые, удаляем тест
                    if (data.tests) {
                        data.tests = data.tests.filter(t => t.eventId !== eventId);
                    }
                }
            } catch (parseError) {
                console.error("Error parsing test questions for update:", parseError);
                // Можно вернуть ошибку, если тест обязателен
                // return res.status(400).json({ error: 'Некорректный формат данных теста при обновлении.' });
            }
        }

        await writeData(data);
        res.json({ success: true, event: updatedEvent });
    } catch (error) {
        console.error("Error updating event:", error);
        res.status(500).json({ error: 'Failed to update event' });
    }
});
// --- КОНЕЦ НОВОГО маршрута ---

// --- НОВЫЙ маршрут: Удалить мероприятие ---
app.delete('/api/events/:id', allowAll, async (req, res) => {
    try {
        const data = await readData();
        const originalLength = data.events.length;
        data.events = data.events.filter(event => event.id !== req.params.id);
        if (data.events.length === originalLength) {
            // Мероприятие не найдено
            return res.status(404).json({ error: 'Event not found' });
        }
        // Также удаляем связанный тест, если он есть
        if (data.tests) {
            data.tests = data.tests.filter(test => test.eventId !== req.params.id);
        }
        await writeData(data);
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});
// --- КОНЕЦ НОВОГО маршрута ---

app.post('/api/test-results', async (req, res) => {
    try {
        const { eventId, userId, answers, score } = req.body;
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
            userId: userId || 'anonymous',
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

const urlEncodedParser = multer().none();
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
(async () => {
    try {
        await ensureUploadsDir(); // Убедимся, что папка uploads существует
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
            console.log(`Data file path: ${DATA_FILE}`);
            console.log(`Uploads path: ${UPLOAD_PATH}`);
        });
    } catch (err) {
        console.error("Failed to start server due to setup error:", err);
        process.exit(1);
    }
})();
