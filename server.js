// server.js (обновлённый фрагмент)
// ... (предыдущий код server.js без изменений) ...

// --- Вспомогательные функции для работы с JSON файлом ---
// (readData и writeData остаются без изменений)

// --- Middleware для проверки администратора ---
// (requireAdmin остаётся без изменений)

// --- Конфигурация multer для загрузки файлов в админке ---
// (storage и upload остаются без изменений)

// --- Маршруты ---

// ... (предыдущие маршруты без изменений: '/', '/olympiads', '/contests', '/conferences', '/registration/:eventId', '/test/:eventId', '/about', '/admin') ...

// --- API маршруты ---

// ... (предыдущие API маршруты без изменений: '/api/events', '/api/admin/events', '/api/admin/registrations', '/api/events/:id', '/api/test-results', '/api/registration') ...

// --- НОВЫЕ API маршруты для работы с тестами ---

// Сохранить тест (требует аутентификации администратора)
// ИСПРАВЛЕНО: Используем urlencoded/json middleware для парсинга тела запроса
app.post('/api/admin/tests', requireAdmin, async (req, res) => {
    try {
        const { eventId, testName, questions } = req.body; // Ожидаем JSON с данными теста
        if (!eventId || !testName || !questions || !Array.isArray(questions)) {
             return res.status(400).json({ error: 'Event ID, Test Name, and Questions array are required' });
        }

        const data = await readData();
        if (!data.tests) {
            data.tests = [];
        }

        // Проверяем, существует ли уже тест для этого мероприятия
        const existingIndex = data.tests.findIndex(t => t.eventId === eventId);
        const testData = {
            id: uuidv4(), // Уникальный ID для записи теста
            eventId: eventId,
            testName: testName,
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

        await writeData(data);
        res.json({ success: true, test: testData });
    } catch (error) {
        console.error("Error saving test:", error);
        res.status(500).json({ error: 'Failed to save test' });
    }
});

// Получить тест по ID мероприятия (для клиента)
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

// --- Запуск сервера ---
// (остаётся без изменений)
// ... (предыдущий код server.js без изменений) ...
