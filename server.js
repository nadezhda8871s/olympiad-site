// server.js

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const multer = require('multer');
const { chromium } = require('playwright');
const XLSX = require('xlsx');

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
    },
    "events": [
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
      }
    ]
  });
}

// --- Защита админки ---
const ADMIN_LOGIN = 'nadezhda8871s';
const ADMIN_PASSWORD = '1988NAna';

function isAdminAuthenticated(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Требуется авторизация' });

  const [login, password] = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
  if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Неверный логин или пароль' });
  }
}

// --- API ---

// Получить список мероприятий
app.get('/api/events', (req, res) => {
  const settings = fs.readJsonSync(SETTINGS_FILE);
  res.json(settings.events || []);
});

// Получить полную информацию об одном мероприятии
app.get('/api/event/:key', (req, res) => {
  const key = req.params.key;
  const settings = fs.readJsonSync(SETTINGS_FILE);
  const event = (settings.events || []).find(e => e.key === key);
  if (event) {
    res.json(event);
  } else {
    res.status(404).json({ error: 'Мероприятие не найдено' });
  }
});

// Получить настройки
app.get('/api/settings', (req, res) => res.json(fs.readJsonSync(SETTINGS_FILE)));

// Сохранить настройки
app.post('/api/settings', isAdminAuthenticated, (req, res) => {
  fs.writeJsonSync(SETTINGS_FILE, req.body);
  res.json({ ok: true });
});

// Загрузить фон
app.post('/api/upload-background', isAdminAuthenticated, upload.single('background'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен.' });
  const docType = req.body.docType;
  const validTypes = ['all', 'diploma', 'certificate', 'thanks'];
  if (!validTypes.includes(docType)) return res.status(400).json({ error: 'Неверный тип документа.' });

  const base64String = req.file.buffer.toString('base64');
  const dataUrl = `${req.file.mimetype};base64,${base64String}`;

  const settings = fs.readJsonSync(SETTINGS_FILE);
  settings.backgrounds[docType] = dataUrl;
  fs.writeJsonSync(SETTINGS_FILE, settings);

  res.json({ success: true, message: `Фон для ${docType} успешно загружен.` });
});

// Управление мероприятиями
app.post('/api/events', isAdminAuthenticated, (req, res) => {
  const settings = fs.readJsonSync(SETTINGS_FILE);
  settings.events = req.body;
  fs.writeJsonSync(SETTINGS_FILE, settings);
  res.json({ ok: true });
});

// Генерация PDF
app.post('/api/generate-pdf', async (req, res) => {
  const { template, data } = req.body;
  const settings = fs.readJsonSync(SETTINGS_FILE);
  const backgrounds = settings.backgrounds;

  let backgroundImageDataUrl = null;
  if (backgrounds[template]) {
    backgroundImageDataUrl = backgrounds[template];
  } else if (backgrounds.all) {
    backgroundImageDataUrl = backgrounds.all;
  }

  const schoolWithBreak = data.school.replace(/(универси)(тет)/gi, '$1-<br>$2');

  let contentHtml = '';
  if (template === 'thanks') {
    contentHtml = `
      <div style="text-align:center; margin-bottom:20px; font-size:18px; font-weight:bold;">${data.title}</div>
      <div style="font-size:24px; font-weight:bold; text-align:center; margin:20px 0;">БЛАГОДАРНОСТЬ НАУЧНОМУ РУКОВОДИТЕЛЮ<br>(ПРЕПОДАВАТЕЛЮ)</div>
      <div style="font-size:20px; font-weight:bold; text-align:center; margin:20px 0;">${data.supervisor}</div>
      <div style="text-align:center; margin:20px 0; line-height:1.5;">
        Центр науки и инноваций выражает Вам огромную признательность и благодарность за профессиональную подготовку участника Олимпиады<br>
        <b>(${data.fio})</b>.
      </div>
      <div style="margin-top:40px; text-align:center; font-size:14px;">Дата: ${data.date}<br>№ документа ${data.number}</div>
    `;
  } else {
    contentHtml = `
      <div style="text-align:center; margin-bottom:20px; font-size:18px; font-weight:bold;">${data.title}</div>
      <div style="font-size:24px; font-weight:bold; text-align:center; margin:20px 0;">${template === 'diploma' ? 'ДИПЛОМ I СТЕПЕНИ' : 'СЕРТИФИКАТ УЧАСТНИКА'}</div>
      ${template === 'diploma' ? '<div style="text-align:center; margin:10px 0;">награждён(а):</div>' : ''}
      <div style="font-size:20px; font-weight:bold; text-align:center; margin:10px 0;">${data.fio}</div>
      <div style="text-align:center;">${schoolWithBreak}, ${data.region}, ${data.city}</div>
      ${data.supervisor ? `<div style="margin-top:20px; text-align:center;">Научный руководитель(преподаватель):<br>${data.supervisor}</div>` : ''}
      <div style="margin-top:40px; text-align:center; font-size:14px;">Дата: ${data.date}<br>№ документа ${data.number}</div>
    `;
  }

  const backgroundHtml = backgroundImageDataUrl 
    ? `<img src="${backgroundImageDataUrl}" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:0; opacity:0.1; object-fit:cover;">`
    : '';

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4 landscape; margin: 0; }
        body { margin: 0; padding: 0; font-family: "Times New Roman", serif; background: white; }
        .container { position: relative; width: 297mm; height: 210mm; }
        .content { position: relative; z-index: 1; padding: 40px 60px; color: black; line-height: 1.4; font-size: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        ${backgroundHtml}
        <div class="content">${contentHtml}</div>
      </div>
    </body>
    </html>
  `;

  try {
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
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, landscape: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${template}.pdf`);
    res.send(pdf);
  } catch (e) {
    console.error('PDF Error:', e);
    res.status(500).json({ error: 'Ошибка генерации PDF', message: e.message });
  }
});

// Экспорт участников
app.get('/api/export-participants', (req, res) => {
  const participants = fs.readJsonSync(DB_FILE);

  if (participants.length === 0) {
    return res.status(400).json({ error: 'Нет данных для экспорта.' });
  }

  const worksheetData = participants.map(p => ({
    "ID": p.id,
    "Время": p.timestamp,
    "ФИО": p.data.fio,
    "Учебное заведение": p.data.school,
    "Регион": p.data.region,
    "Город": p.data.city,
    "Научный руководитель": p.data.supervisor || '',
    "Тип документа": p.template,
    "Номер документа": p.data.number,
    "Дата": p.data.date
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Участники");

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="participants.xlsx"');
  res.send(buffer);
});

// Роуты
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/docs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'docs.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`✅ Сервер запущен на порту ${PORT}`));
