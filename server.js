// server.js (updated)
// Fixed: saving participants, events persistence, admin auth, backgrounds status,
// export to XLSX, Playwright PDF tweaks, compatible with Render (use env vars).

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const multer = require('multer');
const { chromium } = require('playwright');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 10000;

// --- ADMIN CREDENTIALS (set these in Render env for security) ---
const ADMIN_USER = process.env.ADMIN_USER || 'nadezhda8871s';
const ADMIN_PASS = process.env.ADMIN_PASS || '1988NAna';

// --- Data directories ---
// If you deploy on Render, set RENDER=true env var (or set DATA_DIR explicitly)
const DATA_DIR = process.env.DATA_DIR || (process.env.RENDER ? '/tmp/data' : path.join(__dirname, 'data'));
const DB_FILE = path.join(DATA_DIR, 'participants.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const TEMPLATES_DIR = path.join(__dirname, 'templates');

fs.ensureDirSync(DATA_DIR);

// --- Default settings (written only if settings file missing) ---
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeJsonSync(SETTINGS_FILE, {
    paymentText: "За участие в мероприятиях плата не взимается, а стоимость документов с индивидуальным номером 100 руб. Оплатить можно Онлайн на сайте через платежную систему Робокасса, реквизиты для оплаты: номер счета 40817810547119031524 Банк - получатель ФИЛИАЛ \"ЮЖНЫЙ\" ПАО \"БАНК УРАЛСИБ\". Краснодар БИК Банка 040349700, кор. счет Банка 30101810400000000700, ИНН Банка 0274062111, КПП Банка 231043001.",
    footerEmail: 'naych_kooper@mail.ru',
    footerText: '© 2025 Все права защищены. Копирование контента без разрешения автора строго ЗАПРЕЩЕНО!',
    backgrounds: {
      all: null,
      diploma: null,
      certificate: null,
      thanks: null
    }
  });
}

// --- Default events (fallback if events.json not present) ---
const defaultEvents = [
  {
    key: 'stat',
    title: 'Международная Олимпиада по статистике и прикладной математике',
    short: 'Современные подходы к анализу данных и статистическим методам.',
    audience: 'students',
    info: `Приглашаем вас принять участие в Международной Олимпиаде по Статистике — «Статистика будущего: искусство анализа данных!»\n\nСегодня умение анализировать большие объемы информации становится ключевым фактором успеха как в повседневной жизни, так и в профессиональной деятельности. Умение выявлять закономерности, строить прогнозы и принимать обоснованные решения на основе статистических данных определяет вашу конкурентоспособность и перспективы развития. Наша олимпиада объединяет участников со всего мира, предлагая уникальную возможность обменяться опытом и знаниями с коллегами из разных стран.\n\nМы убеждены, что каждый участник существенно повысит свою компетентность и станет экспертом в области статистики!\n\n✅ Вы освоите современные методы обработки и интерпретации данных.\n✅ Узнаете эффективные подходы к решению практических задач с использованием статистического инструментария.\n✅ Получите ценные навыки критического мышления и способности интерпретировать полученные результаты.\n\n🏆 Наш формат — комфортный и инновационный:\n\n⭐ Быстрая обратная связь: результаты станут вам известны моментально после окончания испытаний.\n\n⭐ Призовые места обеспечены: каждому участнику выдается диплом или сертификат.`,
    questions: [
      { q: 'По формуле (∑p1q1)/(∑p0q1) рассчитывают общий индекс цен', options: ['Эджворта-Маршалла', 'Фишера', 'Ласпейреса', 'Пааше'], correct: 3 },
      { q: 'Индекс, отражающий влияние уровня ставок по каждому кредиту на среднее изменение ставки — это индекс…', options: ['Постоянного состава', 'Структурных сдвигов', 'Переменного состава', 'Индивидуальный'], correct: 0 },
      { q: 'В общем индексе цен Пааше в качестве весов используется…', options: ['товарооборот отчетного периода', 'индекс Фишера', 'товарооборот базисного периода', 'индекс Эджворта-Маршалла'], correct: 0 },
      { q: 'Индекс, характеризующий изменение средней зарплаты за счет изменения зарплаты каждого работника — это индекс…', options: ['Постоянного состава', 'Произвольного состава', 'Переменного состава', 'Структурных сдвигов'], correct: 0 },
      { q: 'Выборка называется малой, если ее объем менее…', options: ['30', '40', '50', '100'], correct: 0 }
    ]
  },
  {
    key: 'fin',
    title: 'Международная Олимпиада по финансовым вычислениям в банковском секторе',
    short: 'Финансовое мастерство и точность расчётов для будущих профессионалов.',
    audience: 'students',
    info: `Приглашаем вас принять участие в нашей уникальной олимпиаде по финансовому направлению — «Финансовое мастерство: точность вычислений!»\n\nСегодня финансовые знания становятся важнейшим инструментом успеха как в личной жизни, так и в профессиональной сфере. От умения грамотно рассчитать проценты, правильно распределять бюджет и планировать инвестиции зависит ваше благополучие и карьерный рост. Мы уверены, что каждый участник сможет значительно повысить свои компетенции и стать настоящим мастером финансового дела!`,
    questions: [
      { q: 'Фактор времени учитывается с помощью', options: ['процентной ставки', 'дисконта', 'ренты', 'конверсии'], correct: 0 },
      { q: 'Процесс наращения — это…', options: ['по исходной сумме найти ожидаемую', 'по будущей сумме найти исходный долг', 'норма дисконта', 'расчет доходности'], correct: 0 },
      { q: 'Процесс дисконтирования — это…', options: ['по исходной сумме найти ожидаемую', 'по будущей сумме найти исходный долг', 'расчет доходности', 'нет верного ответа'], correct: 1 },
      { q: 'Чем выше конкуренция среди заемщиков…', options: ['выше ставки по кредитам', 'ниже ставки по кредитам', 'хуже кредиторам', 'зависимость отсутствует'], correct: 0 },
      { q: 'Капитализация процентов — это…', options: ['относительная величина дохода', 'абсолютная величина дохода', 'присоединение процентов к сумме', 'все ответы верны'], correct: 2 }
    ]
  },
  {
    key: 'prob',
    title: 'Международная Олимпиада «Применение Теории вероятностей в экономике»',
    short: 'Стохастика, риски и принятие решений в экономике.',
    audience: 'students',
    info: `Уважаемые студенты и молодые специалисты в сфере экономики!\n\nПредставляем вашему вниманию уникальную возможность проявить себя в мире сложных расчетов и увлекательных научных открытий. Впервые проводится Международная Олимпиада по дисциплине «Теория вероятностей в экономике».`,
    questions: [
      { q: 'Что такое нормальное распределение?', options: ['Нулевое значение риска', 'Единичное отклонение риска', 'Распределение Гаусса', 'Положительная прибыль'], correct: 2 },
      { q: 'Плотность вероятности — это…', options: ['Условная доходность', 'Полимодальная структура', 'Двумерная функция', 'Первая производная от функции распределения'], correct: 3 },
      { q: 'Случайная экономическая величина — это…', options: ['Критерий Фишера', 'Теорема Пуассона', 'Величина, полученная случайным процессом', 'Формула Бернулли'], correct: 2 },
      { q: 'Дискретная случайная величина — это…', options: ['Заданная плотностью', 'Равномерно распределённая на интервале', 'Принимающая значения из конечного набора'], correct: 2 },
      { q: 'Коэффициент корреляции r = 0 означает…', options: ['Нет линейной связи', 'Полная линейная зависимость', 'Один индикатор независим', 'Все индикаторы положительны'], correct: 0 }
    ]
  }
];

// Ensure events file exists (initialize with defaults if absent)
if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeJsonSync(EVENTS_FILE, defaultEvents);
}

// Ensure participants DB exists
if (!fs.existsSync(DB_FILE)) {
  fs.writeJsonSync(DB_FILE, []);
}

// Multer memory storage for uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// --- Auth helpers ---
function isValidAuthToken(b64token) {
  if (!b64token) return false;
  try {
    const decoded = Buffer.from(b64token, 'base64').toString();
    const [user, pass] = decoded.split(':');
    return user === ADMIN_USER && pass === ADMIN_PASS;
  } catch (e) {
    return false;
  }
}

function checkAuthFromRequest(req) {
  // Accept either Authorization header ('Basic base64') or ?auth=base64 query param
  const header = req.headers.authorization;
  if (header && header.startsWith('Basic ')) {
    const token = header.split(' ')[1];
    return isValidAuthToken(token);
  }
  if (req.query && req.query.auth) {
    return isValidAuthToken(req.query.auth);
  }
  return false;
}

function requireAuth(req, res, next) {
  if (checkAuthFromRequest(req)) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

// --- API ---

// Get events (read from events.json so admin edits take effect)
app.get('/api/events', (req, res) => {
  try {
    const events = fs.readJsonSync(EVENTS_FILE);
    res.json(events);
  } catch (e) {
    res.json(defaultEvents);
  }
});

// Save events (admin)
app.post('/api/events', requireAuth, (req, res) => {
  try {
    const events = req.body;
    if (!Array.isArray(events)) return res.status(400).json({ error: 'Invalid payload' });
    fs.writeJsonSync(EVENTS_FILE, events, { spaces: 2 });
    res.json({ ok: true });
  } catch (e) {
    console.error('Save events error:', e);
    res.status(500).json({ error: 'Failed to save events' });
  }
});

// Get settings (public). If Authorization header is provided, require it to be valid.
app.get('/api/settings', (req, res) => {
  const settings = fs.readJsonSync(SETTINGS_FILE);
  // if client supplied Authorization header, validate it (used by admin login flow)
  if (req.headers.authorization) {
    if (!checkAuthFromRequest(req)) return res.status(401).json({ error: 'Unauthorized' });
    return res.json(settings);
  }
  // no auth header => public access to settings
  res.json(settings);
});

// Save settings (admin)
app.post('/api/settings', requireAuth, (req, res) => {
  try {
    const incoming = req.body || {};
    const settings = fs.readJsonSync(SETTINGS_FILE);
    // Merge but preserve existing backgrounds unless explicitly provided
    const newSettings = Object.assign({}, settings, incoming);
    // If backgrounds provided in incoming, merge them specifically
    if (incoming.backgrounds) {
      newSettings.backgrounds = Object.assign({}, settings.backgrounds, incoming.backgrounds);
    }
    fs.writeJsonSync(SETTINGS_FILE, newSettings, { spaces: 2 });
    res.json({ ok: true });
  } catch (e) {
    console.error('Save settings error:', e);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Upload background (admin)
app.post('/api/upload-background', requireAuth, upload.single('background'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен.' });
    const docType = req.body.docType; // 'all', 'diploma', 'certificate', 'thanks'
    const validTypes = ['all', 'diploma', 'certificate', 'thanks'];
    if (!validTypes.includes(docType)) return res.status(400).json({ error: 'Неверный тип документа.' });

    const base64String = req.file.buffer.toString('base64');
    const dataUrl = `${req.file.mimetype};base64,${base64String}`;

    const settings = fs.readJsonSync(SETTINGS_FILE);
    settings.backgrounds = settings.backgrounds || {};
    settings.backgrounds[docType] = dataUrl;
    fs.writeJsonSync(SETTINGS_FILE, settings, { spaces: 2 });

    res.json({ success: true, message: `Фон для ${docType} успешно загружен.` });
  } catch (e) {
    console.error('Upload background error:', e);
    res.status(500).json({ error: 'Ошибка при загрузке фона.' });
  }
});

// Backgrounds status (for docs page)
app.get('/api/backgrounds-status', (req, res) => {
  const settings = fs.readJsonSync(SETTINGS_FILE);
  const bgs = settings.backgrounds || {};
  const status = [
    { name: 'all', loaded: !!bgs.all },
    { name: 'diploma', loaded: !!bgs.diploma },
    { name: 'certificate', loaded: !!bgs.certificate },
    { name: 'thanks', loaded: !!bgs.thanks }
  ];
  res.json({ backgrounds: status });
});

// Generate PDF (public endpoint: called from client). We keep it public because client needs to download the generated document.
app.post('/api/generate-pdf', async (req, res) => {
  const { template, data } = req.body || {};
  if (!template || !data) return res.status(400).json({ error: 'Missing template or data' });

  try {
    const settings = fs.readJsonSync(SETTINGS_FILE);
    const backgrounds = settings.backgrounds || {};

    let backgroundImageDataUrl = null;
    if (backgrounds[template]) {
      backgroundImageDataUrl = backgrounds[template];
    } else if (backgrounds.all) {
      backgroundImageDataUrl = backgrounds.all;
    }

    // Replace 'универси-тет' with a soft line break in school name
    const schoolWithBreak = (data.school || '').replace(/(универси)(тет)/gi, '$1-<br>$2');

    let contentHtml = '';
    if (template === 'thanks') {
      contentHtml = `
        <div style="text-align:center; margin-bottom:20px; font-size:18px; font-weight:bold;">${data.title || ''}</div>
        <div style="font-size:24px; font-weight:bold; text-align:center; margin:20px 0;">БЛАГОДАРНОСТЬ НАУЧНОМУ РУКОВОДИТЕЛЮ<br>(ПРЕПОДАВАТЕЛЮ)</div>
        <div style="font-size:20px; font-weight:bold; text-align:center; margin:20px 0;">${data.supervisor || ''}</div>
        <div style="text-align:center; margin:20px 0; line-height:1.5;">
          Центр науки и инноваций выражает Вам огромную признательность и благодарность за профессиональную подготовку участника Олимпиады<br>
          <b>(${data.fio || ''})</b>.
        </div>
        <div style="margin-top:40px; text-align:center; font-size:14px;">Дата: ${data.date || ''}<br>№ документа ${data.number || ''}</div>
      `;
    } else {
      contentHtml = `
        <div style="text-align:center; margin-bottom:20px; font-size:18px; font-weight:bold;">${data.title || ''}</div>
        <div style="font-size:24px; font-weight:bold; text-align:center; margin:20px 0;">${template === 'diploma' ? 'ДИПЛОМ I СТЕПЕНИ' : 'СЕРТИФИКАТ УЧАСТНИКА'}</div>
        ${template === 'diploma' ? '<div style="text-align:center; margin:10px 0;">награждён(а):</div>' : ''}
        <div style="font-size:20px; font-weight:bold; text-align:center; margin:10px 0;">${data.fio || ''}</div>
        <div style="text-align:center;">${schoolWithBreak}, ${data.region || ''}, ${data.city || ''}</div>
        ${data.supervisor ? `<div style="margin-top:20px; text-align:center;">Научный руководитель(преподаватель):<br>${data.supervisor}</div>` : ''}
        <div style="margin-top:40px; text-align:center; font-size:14px;">Дата: ${data.date || ''}<br>№ документа ${data.number || ''}</div>
      `;
    }

    const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4 landscape; margin: 0; }
        body { margin: 0; padding: 0; font-family: "Times New Roman", serif; background: white; }
        .container { position: relative; width: 297mm; height: 210mm; }
        .background { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; opacity: 0.12; object-fit: cover; }
        .content { position: relative; z-index: 1; padding: 40px 60px; color: black; line-height: 1.4; font-size: 16px; height: 100%; box-sizing: border-box; }
      </style>
    </head>
    <body>
      <div class="container">
        ${backgroundImageDataUrl ? `<img src="${backgroundImageDataUrl}" class="background" alt="Фон">` : ''}
        <div class="content">${contentHtml}</div>
      </div>
    </body>
    </html>
    `;

    // Launch Playwright (Chromium) and create PDF
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, landscape: true });
    await browser.close();

    // Save participant record in DB
    try {
      const participantData = Object.assign({}, data);
      const participantRecord = Object.assign({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        template: template
      }, participantData);

      const db = fs.readJsonSync(DB_FILE);
      db.push(participantRecord);
      fs.writeJsonSync(DB_FILE, db, { spaces: 2 });
    } catch (e) {
      console.warn('Could not save participant record:', e.message);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${template}.pdf"`);
    res.send(pdf);

  } catch (e) {
    console.error('PDF Error:', e);
    res.status(500).json({ error: 'Ошибка генерации PDF', message: e.message });
  }
});

// Export participants (admin). Accepts Authorization header or ?auth=base64 param
app.get('/api/export-participants', (req, res) => {
  if (!checkAuthFromRequest(req)) return res.status(401).send('Unauthorized');

  try {
    const db = fs.readJsonSync(DB_FILE);
    const wb = XLSX.utils.book_new();
    // Normalize objects for sheet (ensure primitive values)
    const sheetData = db.map(item => {
      const flat = Object.assign({}, item);
      return flat;
    });
    const ws = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, ws, 'participants');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="participants.xlsx"');
    res.send(buf);
  } catch (e) {
    console.error('Export error:', e);
    res.status(500).send('Export failed');
  }
});

// Serve admin, docs and index
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/docs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'docs.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`✅ Server started on port ${PORT}`));
