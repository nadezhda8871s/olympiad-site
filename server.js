const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const multer = require('multer');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

const DATA_DIR = '/tmp/data';
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(UPLOADS_DIR);

const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// === Инициализация данных ===
if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeJsonSync(EVENTS_FILE, [
    {
      "key": "stat",
      "title": "Международная Олимпиада по статистике и прикладной математике",
      "short": "Современные подходы к анализу данных и статистическим методам.",
      "audience": "students",
      "info": "Приглашаем вас принять участие в Международной Олимпиаде по Статистике — «Статистика будущего: искусство анализа данных!»\n\nСегодня умение анализировать большие объемы информации становится ключевым фактором успеха...",
      "questions": [
        {"q": "По формуле (∑p1q1)/(∑p0q1) рассчитывают общий индекс цен", "options": ["Эджворта-Маршалла","Фишера","Ласпейреса","Пааше"], "correct": 3}
      ]
    }
  ]);
}

if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeJsonSync(SETTINGS_FILE, {
    "paymentText": "За участие в мероприятиях плата не взимается, а стоимость документов с индивидуальным номером 100 руб. Оплатить можно Онлайн на сайте через платежную систему Робокасса.",
    "footerEmail": "naych_kooper@mail.ru",
    "useOverlay": false,
    "overlayPath": null
  });
}

// === API: получение данных ===
app.get('/api/events', (req, res) => res.json(fs.readJsonSync(EVENTS_FILE)));
app.get('/api/settings', (req, res) => res.json(fs.readJsonSync(SETTINGS_FILE)));

// === API: сохранение данных ===
app.post('/api/events', (req, res) => {
  fs.writeJsonSync(EVENTS_FILE, req.body);
  res.json({ ok: true });
});

app.post('/api/settings', (req, res) => {
  fs.writeJsonSync(SETTINGS_FILE, req.body);
  res.json({ ok: true });
});

// === Загрузка подложки ===
app.post('/api/upload-overlay', upload.single('overlay'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен' });
  }
  const settings = fs.readJsonSync(SETTINGS_FILE);
  settings.overlayPath = req.file.filename;
  settings.useOverlay = true;
  fs.writeJsonSync(SETTINGS_FILE, settings);
  res.json({ success: true, filename: req.file.filename });
});

// === Генерация PDF с подложкой ===
app.post('/api/generate-pdf', async (req, res) => {
  const { template, data } = req.body;
  const settings = fs.readJsonSync(SETTINGS_FILE);
  const useOverlay = settings.useOverlay || false;
  const overlayPath = settings.overlayPath ? path.join(UPLOADS_DIR, settings.overlayPath) : null;

  // Генерация текста документа
  const schoolWithBreak = data.school.replace(/(универси)(тет)/i, '$1-<br>$2');
  let content = '';
  if (template === 'thanks') {
    content = `
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
    content = `
      <div style="text-align:center; margin-bottom:20px; font-size:18px; font-weight:bold;">${data.title}</div>
      <div style="font-size:24px; font-weight:bold; text-align:center; margin:20px 0;">${template === 'diploma' ? 'ДИПЛОМ I СТЕПЕНИ' : 'СЕРТИФИКАТ УЧАСТНИКА'}</div>
      ${template === 'diploma' ? '<div style="text-align:center; margin:10px 0;">награждён(а):</div>' : ''}
      <div style="font-size:20px; font-weight:bold; text-align:center; margin:10px 0;">${data.fio}</div>
      <div style="text-align:center;">${schoolWithBreak}, ${data.region}, ${data.city}</div>
      ${data.supervisor ? `<div style="margin-top:20px; text-align:center;">Научный руководитель(преподаватель):<br>${data.supervisor}</div>` : ''}
      <div style="margin-top:40px; text-align:center; font-size:14px;">Дата: ${data.date}<br>№ документа ${data.number}</div>
    `;
  }

  // Фон из загруженной подложки
  let backgroundHtml = '';
  if (useOverlay && overlayPath && fs.existsSync(overlayPath)) {
    try {
      const { convert } = require('pdf2pic');
      const convertOptions = {
        density: 150,
        width: 1654,
        height: 2339,
        format: "png",
        save: false,
      };
      const result = await convert(overlayPath, convertOptions)(1);
      const base64Image = result.base64;
      backgroundHtml = `<img src="data:image/png;base64,${base64Image}" style="position:absolute; top:0; left:0; width:100%; height:100%; z-index:0;">`;
    } catch (e) {
      console.error('Ошибка конвертации подложки:', e);
    }
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 0; }
        body { margin: 0; padding: 0; font-family: "Times New Roman", serif; }
        .container { position: relative; width: 210mm; height: 297mm; }
        .content { position: relative; z-index: 1; padding: 40px 60px; color: black; line-height: 1.4; font-size: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        ${backgroundHtml}
        <div class="content">${content}</div>
      </div>
    </body>
    </html>
  `;

  try {
    const browser = await puppeteer.launch({
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
    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${template}.pdf`);
    res.send(pdf);
  } catch (e) {
    console.error('PDF Error:', e);
    res.status(500).json({ error: 'Ошибка генерации PDF', message: e.message });
  }
});

// === Роуты ===
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/docs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'docs.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`✅ Сервер запущен на порту ${PORT}`));
