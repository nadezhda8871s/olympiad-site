```javascript
// server.js — Final (self-contained)
// Node 20.x compatible Express server with Playwright PDF generation.
// - Built-in default events & legal texts (used on first run, then persisted to DATA_DIR)
// - /api/events         GET/POST (admin) -> manage events
// - /api/settings       GET/POST (admin) -> settings including legal texts & backgrounds
// - /api/upload-background POST (admin) -> upload PNG/JPEG as base64 stored in settings
// - /api/backgrounds-status GET -> which backgrounds loaded
// - /api/generate-pdf   POST (public) -> generate certificate/diploma/thanks via Playwright; saves participant record
// - /api/save-participant POST (public) -> alternative to save participant record
// - /api/export-participants GET (admin) -> downloads XLSX with all saved participants
//
// For Render:
// - set ADMIN_USER and ADMIN_PASS env vars (recommended).
// - set DATA_DIR env var or set RENDER=true (then DATA_DIR=/tmp/data).
// - Ensure Playwright is installed and configured before starting the server.
//
// Usage notes:
// - Client should POST JSON { template, data } to /api/generate-pdf
//   where template is one of: 'certificate', 'diploma_1', 'diploma_2', 'diploma_3', 'thanks', or 'auto'.
//   If template==='auto', server will choose diploma/certificate based on data.score.
// - The server will return application/pdf as attachment and also save participant record to participants.json.

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const multer = require('multer');
const XLSX = require('xlsx');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 10000;

// Admin credentials (set in environment for security)
const ADMIN_USER = process.env.ADMIN_USER || 'nadezhda8871s';
const ADMIN_PASS = process.env.ADMIN_PASS || '1988NAna';

// Data directory: use DATA_DIR env or /tmp/data on Render, else ./data
const DATA_DIR = process.env.DATA_DIR || (process.env.RENDER ? '/tmp/data' : path.join(__dirname, 'data'));
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PARTICIPANTS_FILE = path.join(DATA_DIR, 'participants.json');

fs.ensureDirSync(DATA_DIR);

// --- Default content (will be written only if files missing) ---
const DEFAULT_EVENTS = [
  {
    key: 'stat',
    title: 'Международная Олимпиада по статистике и прикладной математике',
    short: 'Современные подходы к анализу данных и статистическим методам.',
    audience: 'students',
    info: `Приглашаем вас принять участие в Международной Олимпиаде по Статистике — «Статистика будущего: искусство анализа данных!»

Сегодня умение анализировать большие объемы информации становится ключевым фактором успеха как в повседневной жизни, так и в профессиональной деятельности. Умение выявлять закономерности, строить прогнозы и принимать обоснованные решения на основе статистических данных определяет вашу конкурентоспособность и перспективы развития. Наша олимпиада объединяет участников со всего мира, предлагая уникальную возможность обменяться опытом и знаниями с коллегами из разных стран.

Мы убеждены, что каждый участник существенно повысит свою компетентность и станет экспертом в области статистики!

✅ Вы освоите современные методы обработки и интерпретации данных.
✅ Узнаете эффективные подходы к решению практических задач с использованием статистического инструментария.
✅ Получите ценные навыки критического мышления и способности интерпретировать полученные результаты.

🏆 Наш формат — комфортный и инновационный:
⭐ Быстрая обратная связь: результаты станут вам известны моментально после окончания испытаний.
⭐ Призовые места обеспечены: каждому участнику выдается диплом или сертификат.`,
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
    info: `Приглашаем вас принять участие в нашей уникальной олимпиаде по финансовому направлению — «Финансовое мастерство: точность вычислений!»

Сегодня финансовые знания становятся важнейшим инструментом успеха как в личной жизни, так и в профессиональной сфере. От умения грамотно рассчитать проценты, правильно распределять бюджет и планировать инвестиции зависит ваше благополучие и карьерный рост. Мы уверены, что каждый участник сможет значительно повысить свои компетенции и стать настоящим мастером финансового дела!`,
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
    info: `Уважаемые студенты и молодые специалисты в сфере экономики!

Представляем вашему вниманию уникальную возможность проявить себя в мире сложных расчетов и увлекательных научных открытий. Впервые проводится Международная Олимпиада по дисциплине «Теория вероятностей в экономике».

Цель мероприятия — проверка ваших теоретических знаний и практических навыков решения задач, связанных с применением стохастики и статистики в финансовой среде. Вы сможете продемонстрировать своё умение анализировать рынки, оценивать риски и принимать обоснованные управленческие решения.

🏅 Наш формат — удобный и современный:
✨ Результаты известны мгновенно.
✨ Награды доступны сразу: по окончании испытания каждый участник получает диплом или сертификат.`,
    questions: [
      { q: 'Что такое нормальное распределение?', options: ['Нулевое значение риска', 'Единичное отклонение риска', 'Распределение Гаусса', 'Положительная прибыль'], correct: 2 },
      { q: 'Плотность вероятности — это…', options: ['Условная доходность', 'Полимодальная структура', 'Двумерная функция', 'Первая производная от функции распределения'], correct: 3 },
      { q: 'Случайная экономическая величина — это…', options: ['Критерий Фишера', 'Теорема Пуассона', 'Величина, полученная случайным процессом', 'Формула Бернулли'], correct: 2 },
      { q: 'Дискретная случайная величина — это…', options: ['Заданная плотностью', 'Равномерно распределённая на интервале', 'Принимающая значения из конечного набора'], correct: 2 },
      { q: 'Коэффициент корреляции r = 0 означает…', options: ['Нет линейной связи', 'Полная линейная зависимость', 'Один индикатор независим', 'Все индикаторы положительны'], correct: 0 }
    ]
  }
];

const DEFAULT_SETTINGS = {
  paymentText: `За участие в мероприятиях плата не взимается. Документ (диплом/сертификат) с индивидуальным номером — 100 руб.`,
  footerEmail: 'naych_kooper@mail.ru',
  footerText: '© 2025 Все права защищены. Копирование контента без разрешения автора строго ЗАПРЕЩЕНО!',
  backgrounds: { // stored as data URLs (image/png;base64,...)
    all: null,
    diploma_1: null,
    diploma_2: null,
    diploma_3: null,
    certificate: null,
    thanks: null
  },
  legal: {
    termsTitle: 'Пользовательское соглашение (публичная оферта) и Правила проведения олимпиады',
    termsText: `1. Пользовательское соглашение (публичная оферта)

1. Общие положения
1.1. Настоящее Пользовательское соглашение (далее – «Соглашение») регулирует отношения между Организатором онлайн-олимпиад и конкурсов (далее – «Организатор») и физическим лицом (далее – «Участник»), оставляющим свои данные через форму на сайте.
1.2. Отправка данных через форму означает согласие Участника с условиями Соглашения.

2. Предмет соглашения
2.1. Организатор предоставляет Участнику возможность участия в онлайн-олимпиадах и конкурсах бесплатно.
2.2. Организатор предоставляет электронный диплом или сертификат за плату — 100 рублей за документ.

3. Права и обязанности сторон
Организатор обязуется: проводить олимпиаду; обработать результаты; предоставить диплом или сертификат после оплаты.
Участник обязуется: предоставлять достоверные данные при подаче заявки; оплачивать диплом или сертификат при его заказе.

4. Ответственность сторон
Организатор не несёт ответственности за ошибки в документах, возникшие по причине неверно указанных данных или отсутствия оплаты.

5. Заключительные положения
5.1. Соглашение является публичной офертой.
5.2. Организатор имеет право вносить изменения, публикуя их на сайте.`,
    privacyTitle: 'Политика конфиденциальности и Согласие на обработку персональных данных',
    privacyText: `1. Какие данные мы собираем
ФИО, e-mail, учебное заведение, класс/возраст и иные сведения, указанные в форме заявки.

2. Цели обработки
— оформление участия в олимпиаде;
— направление заданий и результатов;
— формирование и отправка дипломов/сертификатов после оплаты;
— информирование о новых мероприятиях.

3. Защита данных
Данные хранятся в защищённой базе; не передаются третьим лицам, кроме случаев доставки документов или по требованию закона.

4. Согласие на обработку персональных данных
«Я, ______________________, заполняя форму участия на сайте, выражаю согласие на обработку моих персональных данных (ФИО, e-mail, учебное заведение и другие сведения).
Согласие действует до его письменного отзыва.»`
  }
};

// Write defaults if missing
if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeJsonSync(EVENTS_FILE, DEFAULT_EVENTS, { spaces: 2 });
}
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeJsonSync(SETTINGS_FILE, DEFAULT_SETTINGS, { spaces: 2 });
}
if (!fs.existsSync(PARTICIPANTS_FILE)) {
  fs.writeJsonSync(PARTICIPANTS_FILE, [], { spaces: 2 });
}

// Multer memory storage for uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware
app.use(express.static('public'));
app.use(bodyParser.json({ limit: '30mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '30mb' }));

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

// --- API: EVENTS ---
app.get('/api/events', (req, res) => {
  try {
    const ev = fs.readJsonSync(EVENTS_FILE);
    res.json(ev);
  } catch (e) {
    console.error('Read events error:', e);
    res.status(500).json({ error: 'Failed to read events' });
  }
});

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

// --- API: SETTINGS / LEGAL ---
app.get('/api/settings', (req, res) => {
  try {
    const s = fs.readJsonSync(SETTINGS_FILE);
    res.json(s);
  } catch (e) {
    console.error('Read settings error:', e);
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

app.post('/api/settings', requireAuth, (req, res) => {
  try {
    const incoming = req.body || {};
    const settings = fs.readJsonSync(SETTINGS_FILE);
    const merged = Object.assign({}, settings, incoming);
    if (incoming.backgrounds) {
      merged.backgrounds = Object.assign({}, settings.backgrounds, incoming.backgrounds);
    }
    if (incoming.legal) {
      merged.legal = Object.assign({}, settings.legal, incoming.legal);
    }
    fs.writeJsonSync(SETTINGS_FILE, merged, { spaces: 2 });
    res.json({ ok: true });
  } catch (e) {
    console.error('Save settings error:', e);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// --- Upload background (admin) ---
app.post('/api/upload-background', requireAuth, upload.single('background'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const docType = req.body.docType; // all, diploma_1, diploma_2, diploma_3, certificate, thanks
    const valid = ['all', 'diploma_1', 'diploma_2', 'diploma_3', 'certificate', 'thanks'];
    if (!valid.includes(docType)) return res.status(400).json({ error: 'Invalid docType' });

    const dataUrl = `${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const settings = fs.readJsonSync(SETTINGS_FILE);
    settings.backgrounds = settings.backgrounds || {};
    settings.backgrounds[docType] = dataUrl;
    fs.writeJsonSync(SETTINGS_FILE, settings, { spaces: 2 });
    res.json({ ok: true, message: `Background ${docType} saved.` });
  } catch (e) {
    console.error('Upload bg error:', e);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.get('/api/backgrounds-status', (req, res) => {
  try {
    const settings = fs.readJsonSync(SETTINGS_FILE);
    const b = settings.backgrounds || {};
    res.json({
      backgrounds: {
        all: !!b.all,
        diploma_1: !!b.diploma_1,
        diploma_2: !!b.diploma_2,
        diploma_3: !!b.diploma_3,
        certificate: !!b.certificate,
        thanks: !!b.thanks
      }
    });
  } catch (e) {
    console.error('bg status error:', e);
    res.status(500).json({ error: 'Failed to read backgrounds' });
  }
});

// --- API: Save participant (public) ---
app.post('/api/save-participant', (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.fio) return res.status(400).json({ error: 'Missing fio' });

    const db = fs.readJsonSync(PARTICIPANTS_FILE);
    const record = Object.assign({
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    }, payload);
    db.push(record);
    fs.writeJsonSync(PARTICIPANTS_FILE, db, { spaces: 2 });
    res.json({ ok: true, id: record.id });
  } catch (e) {
    console.error('Save participant error:', e);
    res.status(500).json({ error: 'Failed to save participant' });
  }
});

// --- API: Export participants (admin) ---
app.get('/api/export-participants', (req, res) => {
  if (!checkAuthFromRequest(req)) return res.status(401).send('Unauthorized');
  try {
    const data = fs.readJsonSync(PARTICIPANTS_FILE);
    const wb = XLSX.utils.book_new();
    // normalize: ensure keys are primitive
    const ws = XLSX.utils.json_to_sheet(data);
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

// --- API: Generate PDF via Playwright (public) ---
// Expected body:
// { template: 'certificate'|'diploma_1'|'diploma_2'|'diploma_3'|'thanks'|'auto', data: {fio, email, school, region, city, supervisor, title, score, date, number} }
app.post('/api/generate-pdf', async (req, res) => {
  const { template, data } = req.body || {};
  if (!data || !data.fio) return res.status(400).json({ error: 'Missing participant data' });

  try {
    // Load settings and choose template if 'auto'
    const settings = fs.readJsonSync(SETTINGS_FILE);
    let chosenTemplate = template || 'auto';
    if (chosenTemplate === 'auto') {
      const score = Number(data.score || 0);
      if (score > 70) chosenTemplate = 'diploma_1';
      else if (score > 50) chosenTemplate = 'diploma_2';
      else if (score > 20) chosenTemplate = 'diploma_3';
      else chosenTemplate = 'certificate';
    }

    const background = (settings.backgrounds && (settings.backgrounds[chosenTemplate] || settings.backgrounds.all)) || null;
    const today = data.date || new Date().toLocaleDateString('ru-RU');
    const number = data.number || (`2025-${String(Math.floor(Math.random()*100000)).padStart(5,'0')}`);

    // Build HTML content (similar to client version but server-side)
    const schoolWithBreak = (data.school || '').replace(/(универси)(тет)/gi, '$1-<br>$2');

    let titleBlock = '';
    if (chosenTemplate === 'diploma_1') titleBlock = '<div style="font-size:28px;font-weight:bold;text-align:center;margin:20px 0;">ДИПЛОМ I СТЕПЕНИ</div>';
    else if (chosenTemplate === 'diploma_2') titleBlock = '<div style="font-size:26px;font-weight:bold;text-align:center;margin:20px 0;">ДИПЛОМ II СТЕПЕНИ</div>';
    else if (chosenTemplate === 'diploma_3') titleBlock = '<div style="font-size:24px;font-weight:bold;text-align:center;margin:20px 0;">ДИПЛОМ III СТЕПЕНИ</div>';
    else if (chosenTemplate === 'thanks') titleBlock = '<div style="font-size:24px;font-weight:bold;text-align:center;margin:20px 0;">БЛАГОДАРНОСТЬ</div>';
    else titleBlock = '<div style="font-size:24px;font-weight:bold;text-align:center;margin:20px 0;">СЕРТИФИКАТ УЧАСТНИКА</div>';

    let contentInner = '';
    if (chosenTemplate === 'thanks') {
      contentInner = `
        <div style="text-align:center; margin-bottom:20px; font-size:18px; font-weight:bold;">${escapeHtml(data.title || '')}</div>
        <div style="font-size:20px; font-weight:bold; text-align:center; margin:20px 0;">БЛАГОДАРНОСТЬ НАУЧНОМУ РУКОВОДИТЕЛЮ</div>
        <div style="font-size:20px; font-weight:bold; text-align:center; margin:10px 0;">${escapeHtml(data.supervisor || '')}</div>
        <div style="text-align:center; margin:20px 0; line-height:1.5;">Центр науки и инноваций выражает Вам признательность за подготовку участника <b>(${escapeHtml(data.fio || '')})</b>.</div>
        <div style="margin-top:40px; text-align:center; font-size:14px;">Дата: ${escapeHtml(today)}<br>№ документа ${escapeHtml(number)}</div>
      `;
    } else {
      contentInner = `
        <div style="text-align:center; margin-bottom:20px; font-size:18px; font-weight:bold;">${escapeHtml(data.title || '')}</div>
        ${titleBlock}
        ${chosenTemplate.startsWith('diploma') ? '<div style="text-align:center; margin:10px 0;">награждён(а):</div>' : ''}
        <div style="font-size:20px; font-weight:bold; text-align:center; margin:10px 0;">${escapeHtml(data.fio || '')}</div>
        <div style="text-align:center;">${schoolWithBreak ? schoolWithBreak : ''}${(schoolWithBreak ? ', ' : '')}${escapeHtml(data.region || '')}, ${escapeHtml(data.city || '')}</div>
        ${data.supervisor ? `<div style="margin-top:20px; text-align:center;">Научный руководитель(преподаватель):<br>${escapeHtml(data.supervisor)}</div>` : ''}
        <div style="margin-top:40px; text-align:center; font-size:14px;">Дата: ${escapeHtml(today)}<br>№ документа ${escapeHtml(number)}</div>
      `;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4 landscape; margin: 0; }
          html,body{margin:0;padding:0;height:100%;}
          body{font-family:"Times New Roman", serif;}
          .page{width:297mm;height:210mm;position:relative;overflow:hidden;}
          .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;opacity:1;}
          .content{position:relative;z-index:1;padding:40px 60px;box-sizing:border-box;height:100%;color:#000;}
        </style>
      </head>
      <body>
        <div class="page">
          ${background ? `<img src="${background}" class="bg" alt="bg" />` : ''}
          <div class="content">
            ${contentInner}
          </div>
        </div>
      </body>
      </html>
    `;

    // Launch Playwright and generate PDF
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const pagePlay = await browser.newPage();
    await pagePlay.setContent(fullHtml, { waitUntil: 'networkidle' });
    const pdfBuffer = await pagePlay.pdf({ format: 'A4', printBackground: true, landscape: true });
    await browser.close();

    // Save participant record (including email) to participants.json
    try {
      const db = fs.readJsonSync(PARTICIPANTS_FILE);
      const record = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        template: chosenTemplate,
        fio: data.fio || '',
        email: data.email || '',
        school: data.school || '',
        region: data.region || '',
        city: data.city || '',
        supervisor: data.supervisor || '',
        score: data.score ?? null,
        date: today,
        number,
        eventKey: data.eventKey || null,
        eventTitle: data.title || null
      };
      db.push(record);
      fs.writeJsonSync(PARTICIPANTS_FILE, db, { spaces: 2 });
    } catch (e) {
      console.warn('Could not save participant record:', e);
    }

    // Return PDF as attachment
    const filename = `${chosenTemplate}-${number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);

  } catch (e) {
    console.error('generate-pdf error:', e);
    res.status(500).json({ error: 'PDF generation failed', message: e.message });
  }
});

// Helper: escapeHtml
function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Serve static files (public folder)
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/docs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'docs.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
});
```
