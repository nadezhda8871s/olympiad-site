const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const multer = require('multer');
const { chromium } = require('playwright');
const XLSX = require('xlsx');
const handlebars = require('handlebars');

const app = express();
const PORT = process.env.PORT || 10000;

// Настройка Multer для загрузки файлов в память
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const DATA_DIR = process.env.RENDER ? '/tmp/data' : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'participants.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const TEMPLATES_DIR = path.join(__dirname, 'templates');

// Убедимся, что директория существует
fs.ensureDirSync(DATA_DIR);

// Инициализация данных
if (!fs.existsSync(DB_FILE)) {
    fs.writeJsonSync(DB_FILE, []);
}

if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeJsonSync(SETTINGS_FILE, {
        "paymentText": "За участие в мероприятиях плата не взимается, а стоимость документов с индивидуальным номером 100 руб. Оплатить можно Онлайн на сайте через платежную систему Робокасса, реквизиты для оплаты: номер счета 40817810547119031524 Банк - получатель ФИЛИАЛ \"ЮЖНЫЙ\" ПАО \"БАНК УРАЛСИБ\". Краснодар БИК Банка 040349700, кор. счет Банка 30101810400000000700, ИНН Банка 0274062111, КПП Банка 231043001.",
        "footerEmail": "naych_kooper@mail.ru",
        "footerText": "© 2025 Все права защищены. Копирование контента без разрешения автора строго ЗАПРЕЩЕНО!",
        "backgrounds": {
            "all": null,
            "diploma": null,
            "certificate": null,
            "thanks": null
        }
    });
}

// === API ===

// Получить список мероприятий
app.get('/api/events', (req, res) => {
    res.json([
        {
            "key": "stat",
            "title": "Международная Олимпиада по статистике и прикладной математике",
            "short": "Современные подходы к анализу данных и статистическим методам.",
            "audience": "students",
            "info": "Приглашаем вас принять участие в Международной Олимпиаде по Статистике — «Статистика будущего: искусство анализа данных!»\n\nСегодня умение анализировать большие объемы информации становится ключевым фактором успеха как в повседневной жизни, так и в профессиональной деятельности. Умение выявлять закономерности, строить прогнозы и принимать обоснованные решения на основе статистических данных определяет вашу конкурентоспособность и перспективы развития. Наша олимпиада объединяет участников со всего мира, предлагая уникальную возможность обменяться опытом и знаниями с коллегами из разных стран.\n\nМы убеждены, что каждый участник существенно повысит свою компетентность и станет экспертом в области статистики!\n\n✅ Вы освоите современные методы обработки и интерпретации данных.\n✅ Узнаете эффективные подходы к решению практических задач с использованием статистического инструментария.\n✅ Получите ценные навыки критического мышления и способности интерпретировать полученные результаты.\n\n🏆 Наш формат — комфортный и инновационный:\n⭐ Быстрая обратная связь: результаты станут вам известны моментально после окончания испытаний.\n⭐ Призовые места обеспечены: каждому участнику выдается диплом или сертификат.",
            "questions": [
                {"q": "По формуле (∑p1q1)/(∑p0q1) рассчитывают общий индекс цен", "options": ["Эджворта-Маршалла","Фишера","Ласпейреса","Пааше"], "correct": 3},
                {"q": "Индекс, отражающий влияние уровня ставок по каждому кредиту на среднее изменение ставки — это индекс…", "options": ["Постоянного состава","Структурных сдвигов","Переменного состава","Индивидуальный"], "correct": 0},
                {"q": "В общем индексе цен Пааше в качестве весов используется…", "options": ["товарооборот отчетного периода","индекс Фишера","товарооборот базисного периода","индекс Эджворта-Маршалла"], "correct": 0},
                {"q": "Индекс, характеризующий изменение средней зарплаты за счет изменения зарплаты каждого работника — это индекс…", "options": ["Постоянного состава","Произвольного состава","Переменного состава","Структурных сдвигов"], "correct": 0},
                {"q": "Выборка называется малой, если ее объем менее…", "options": ["30","40","50","100"], "correct": 0}
            ]
        },
        {
            "key": "fin",
            "title": "Международная Олимпиада по финансовым вычислениям в банковском секторе",
            "short": "Финансовое мастерство и точность расчётов для будущих профессионалов.",
            "audience": "students",
            "info": "Приглашаем вас принять участие в нашей уникальной олимпиаде по финансовому направлению — «Финансовое мастерство: точность вычислений!»\n\nСегодня финансовые знания становятся важнейшим инструментом успеха как в личной жизни, так и в профессиональной сфере. От умения грамотно рассчитать проценты, правильно распределять бюджет и планировать инвестиции зависит ваше благополучие и карьерный рост. Мы уверены, что каждый участник сможет значительно повысить свои компетенции и стать настоящим мастером финансового дела!\n\n🔥 Почему стоит участвовать в нашей олимпиаде?\n\n— Вы получите полезные знания и практические навыки в финансовой математике.\n— Узнаете секреты эффективного планирования денежных потоков и принятия взвешенных инвестиционных решений.\n— Получите ценный опыт, участвуя в реальных ситуациях и выполняя интересные задания.\n\n🏅 Наш формат — удобный и современный:\n✨ Результаты известны мгновенно: сразу же после завершения олимпиады вы узнаете точное количество набранных вами баллов.\n✨ Награды доступны сразу: по окончании испытания каждый участник получает диплом или сертификат.",
            "questions": [
                {"q": "Фактор времени учитывается с помощью", "options": ["процентной ставки","дисконта","ренты","конверсии"], "correct": 0},
                {"q": "Процесс наращения — это…", "options": ["по исходной сумме найти ожидаемую","по будущей сумме найти исходный долг","норма дисконта","расчет доходности"], "correct": 0},
                {"q": "Процесс дисконтирования — это…", "options": ["по исходной сумме найти ожидаемую","по будущей сумме найти исходный долг","расчет доходности","нет верного ответа"], "correct": 1},
                {"q": "Чем выше конкуренция среди заемщиков…", "options": ["выше ставки по кредитам","ниже ставки по кредитам","хуже кредиторам","зависимость отсутствует"], "correct": 0},
                {"q": "Капитализация процентов — это…", "options": ["относительная величина дохода","абсолютная величина дохода","присоединение процентов к сумме","все ответы верны"], "correct": 2}
            ]
        },
        {
            "key": "prob",
            "title": "Международная Олимпиада «Применение Теории вероятностей в экономике»",
            "short": "Стохастика, риски и принятие решений в экономике.",
            "audience": "students",
            "info": "Уважаемые студенты и молодые специалисты в сфере экономики!\nПредставляем вашему вниманию уникальную возможность проявить себя в мире сложных расчетов и увлекательных научных открытий. Впервые проводится Международная Олимпиада по дисциплине «Теория вероятностей в экономике».\n\nЦель мероприятия — проверка ваших теоретических знаний и практических навыков решения задач, связанных с применением стохастики и статистики в финансовой среде. Вы сможете продемонстрировать своё умение анализировать рынки, оценивать риски и принимать обоснованные управленческие решения.\n\n🏅 Наш формат — удобный и современный:\n✨ Результаты известны мгновенно.\n✨ Награды доступны сразу: по окончании испытания каждый участник получает диплом или сертификат.",
            "questions": [
                {"q": "Что такое нормальное распределение?", "options": ["Нулевое значение риска","Единичное отклонение риска","Распределение Гаусса","Положительная прибыль"], "correct": 2},
                {"q": "Плотность вероятности — это…", "options": ["Условная доходность","Полимодальная структура","Двумерная функция","Первая производная от функции распределения"], "correct": 3},
                {"q": "Случайная экономическая величина — это…", "options": ["Критерий Фишера","Теорема Пуассона","Величина, полученная случайным процессом","Формула Бернулли"], "correct": 2},
                {"q": "Дискретная случайная величина — это…", "options": ["Заданная плотностью","Равномерно распределённая на интервале","Принимающая значения из конечного набора"], "correct": 2},
                {"q": "Коэффициент корреляции r = 0 означает…", "options": ["Нет линейной связи","Полная линейная зависимость","Один индикатор независим","Все индикаторы положительны"], "correct": 0}
            ]
        }
    ]);
});

// Получить настройки
app.get('/api/settings', (req, res) => {
    res.json(fs.readJsonSync(SETTINGS_FILE));
});

// Сохранить настройки
app.post('/api/settings', (req, res) => {
    fs.writeJsonSync(SETTINGS_FILE, req.body);
    res.json({ ok: true });
});

// Загрузить фон
app.post('/api/upload-background', upload.single('background'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    const docType = req.body.docType;
    const validTypes = ['all', 'diploma', 'certificate', 'thanks'];
    if (!validTypes.includes(docType)) return res.status(400).json({ error: 'Неверный тип документа' });
    
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;
    
    const settings = fs.readJsonSync(SETTINGS_FILE);
    settings.backgrounds[docType] = dataUrl;
    fs.writeJsonSync(SETTINGS_FILE, settings);
    
    res.json({ success: true });
});

// Генерация PDF
app.post('/api/generate-pdf', async (req, res) => {
    const { template, data } = req.body;
    
    try {
        // Загружаем шаблон
        const templatePath = path.join(TEMPLATES_DIR, `${template}.hbs`);
        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({ error: 'Шаблон не найден' });
        }
        
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        const compiledTemplate = handlebars.compile(templateContent);
        
        // Загружаем настройки для фона
        const settings = fs.readJsonSync(SETTINGS_FILE);
        const backgroundImage = settings.backgrounds[template] || settings.backgrounds.all;
        
        // Перенос "универси-тет"
        const schoolWithBreak = data.school.replace(/(универси)(тет)/gi, '$1-<br>$2');
        
        // Данные для шаблона
        const templateData = {
            title: data.title,
            fio: data.fio,
            school: schoolWithBreak,
            region: data.region,
            city: data.city,
            supervisor: data.supervisor,
            date: data.date,
            number: data.number,
            backgroundImage: backgroundImage
        };
        
        // HTML
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                @page { size: A4 landscape; margin: 0; }
                body { 
                    margin: 0; 
                    padding: 0; 
                    font-family: "Times New Roman", serif; 
                    background: white;
                    position: relative;
                    width: 297mm;
                    height: 210mm;
                }
                .background {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 0;
                    opacity: 0.1;
                    object-fit: cover;
                }
                .content {
                    position: relative;
                    z-index: 1;
                    padding: 40px 60px;
                    color: black;
                    line-height: 1.4;
                    font-size: 16px;
                    height: 100%;
                    box-sizing: border-box;
                }
            </style>
        </head>
        <body>
            ${backgroundImage ? `<img src="${backgroundImage}" class="background" alt="Фон">` : ''}
            <div class="content">
                ${compiledTemplate(templateData)}
            </div>
        </body>
        </html>
        `;
        
        // Запуск Playwright
        const browser = await chromium.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--single-process'
            ]
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({ format: 'A4', printBackground: true, landscape: true });
        await browser.close();
        
        // Сохраняем участника
        const db = fs.readJsonSync(DB_FILE);
        db.push({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            template: template,
            data: data
        });
        fs.writeJsonSync(DB_FILE, db);
        
        // Отправляем PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${template}.pdf`);
        res.send(pdf);
        
    } catch (e) {
        console.error('PDF Error:', e);
        res.status(500).json({ error: 'Ошибка генерации PDF', message: e.message });
    }
});

// Роуты
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/docs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'docs.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`✅ Сервер запущен на порту ${PORT}`));
