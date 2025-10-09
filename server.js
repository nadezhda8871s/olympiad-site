// server.js
const express = require('express');
const multer = require('multer');
const session = require('cookie-session');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 10000;

const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOAD_PATH = path.join(__dirname, 'public', 'uploads');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

app.use(session({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'your_fallback_secret_key_here'],
    maxAge: 24 * 60 * 60 * 1000
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
            console.error("Error checking uploads directory:", error);
            throw error;
        }
    }
}

ensureUploadsDir().catch(err => {
    console.error("Failed to ensure uploads directory exists:", err);
});

// --- Вспомогательные функции ---
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            const initialData = {
                events: [],
                admin: { login: "admin", password: "password" }
            };
            await writeData(initialData);
            console.log("Created initial data.json file.");
            return initialData;
        } else if (error instanceof SyntaxError) {
            console.error("Syntax error in data.json:", error.message);
            return { events: [], admin: { login: "admin", password: "password" }, registrations: [], testResults: [] };
        } else {
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

// --- Middleware для проверки администратора (теперь всегда next) ---
function requireAdmin(req, res, next) {
    next();
}

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
        const data = await readData();
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

app.get('/admin', (req, res) => {
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

app.get('/api/admin/events', requireAdmin, async (req, res) => {
    try {
        const data = await readData();
        res.json(data.events);
    } catch (error) {
        console.error("Error fetching events for admin:", error);
        res.status(500).json({ error: 'Failed to fetch events for admin' });
    }
});

// --- НОВЫЙ маршрут для скачивания регистраций ---
app.get('/api/admin/registrations', requireAdmin, async (req, res) => {
    try {
        const data = await readData();
        // Возвращаем только массив регистраций
        res.json(data.registrations || []);
    } catch (error) {
        console.error("Error fetching registrations:", error);
        res.status(500).json({ error: 'Failed to fetch registrations' });
    }
});

// ---

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

// Удалена аутентификация
app.post('/api/events', requireAdmin, upload.single('infoLetterFile'), async (req, res) => {
    try {
        const data = await readData();
        const newEvent = {
            id: uuidv4(),
            name: req.body.name,
            description: req.body.description,
            type: req.body.type,
            subtype: req.body.subtype || req.body.type, // subtype для фильтрации
            infoLetterFileName: req.file ? req.file.filename : null
        };
        data.events.push(newEvent);
        await writeData(data);
        res.json({ success: true, event: newEvent });
    } catch (error) {
        console.error("Error adding event:", error);
        res.status(500).json({ error: 'Failed to add event' });
    }
});

app.delete('/api/events/:id', requireAdmin, async (req, res) => {
    try {
        const data = await readData();
        const originalLength = data.events.length;
        data.events = data.events.filter(event => event.id !== req.params.id);
        if (data.events.length === originalLength) {
            return res.status(404).json({ error: 'Event not found' });
        }
        await writeData(data);
        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

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

// Используем multer.none() для формы регистрации
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
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Data file path: ${DATA_FILE}`);
    console.log(`Uploads path: ${UPLOAD_PATH}`);
});
