const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const multer = require('multer');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка загрузки файлов
const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

// Директории
const DATA_DIR = '/tmp/data';
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.ensureDirSync(DATA_DIR);
fs.ensureDirSync(UPLOADS_DIR);

const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// Инициализация данных
if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeJsonSync(EVENTS_FILE, [
    {
      "key": "stat",
      "title": "Международная Олимпиада по статистике и прикладной математике",
      "short": "Современные подходы к анализу данных и статистическим методам.",
      "audience": "students",
      "info": "Полный текст...",
      "questions": [
        {"q": "Вопрос?", "options": ["1","2","3","4"], "correct": 0}
      ],
      "overlay": null // путь к подложке
    }
  ]);
}

if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeJsonSync(SETTINGS_FILE, {
    "paymentText": "Оплата через Робокассу. Стоимость — 100 руб за документ.",
    "footerEmail": "naych_kooper@mail.ru"
  });
}

// === API ===
app.get('/api/events', (req, res) => res.json(fs.readJsonSync(EVENTS_FILE)));
app.get('/api/settings', (req, res) => res.json(fs.readJsonSync(SETTINGS_FILE)));

// Сохранение мероприятий
app.post('/api/events', (req, res) => {
  fs.writeJsonSync(EVENTS_FILE, req.body);
  res.json({ ok: true });
});

// Сохранение настроек
app.post('/api/settings', (req, res) => {
  fs.writeJsonSync(SETTINGS_FILE, req.body);
  res.json({ ok: true });
});

// Загрузка подложки
app.post('/api/upload-overlay', upload.single('overlay'), (req, res) => {
  if (!req.file) return res.status(400).send('Файл не загружен');
  res.json({ filename: req.file.filename });
});

// Генерация PDF с подложкой
app.post('/api/generate-pdf', async (req, res) => {
  const { template, data } = req.body;
  const events = fs.readJsonSync(EVENTS_FILE);
  const event = events.find(e => e.title === data.title);
  const overlayPath = event?.overlay ? path.join(UPLOADS_DIR, event.overlay) : null;

  let html = `
    <div style="position:relative; width:210mm; height:297mm;">
      ${overlayPath ? `<img src="file://${overlayPath}" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0.05;">` : ''}
      <div style="position:relative; z-index:1; padding:40px 60px; font-family:'Times New Roman',serif; font-size:16px; color:black; line-height:1.4;">
        <div style="text-align:center; margin-bottom:20px;">${data.title}</div>
        <div style="font-size:24px; font-weight:bold; text-align:center; margin:20px 0;">${template === 'diploma' ? 'ДИПЛОМ I СТЕПЕНИ' : 'СЕРТИФИКАТ УЧАСТНИКА'}</div>
        ${template === 'diploma' ? '<div style="text-align:center; margin:10px 0;">награждён(а):</div>' : ''}
        <div style="font-size:20px; font-weight:bold; text-align:center; margin:10px 0;">${data.fio}</div>
        <div style="text-align:center;">${data.school}, ${data.region}, ${data.city}</div>
        ${data.supervisor ? `<div style="margin-top:20px; text-align:center;">Научный руководитель(преподаватель):<br>${data.supervisor}</div>` : ''}
        <div style="margin-top:40px; text-align:center; font-size:14px;">Дата: ${data.date}<br>№ документа ${data.number}</div>
      </div>
    </div>
  `;

  if (template === 'thanks') {
    html = `
      <div style="position:relative; width:210mm; height:297mm;">
        ${overlayPath ? `<img src="file://${overlayPath}" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0.05;">` : ''}
        <div style="position:relative; z-index:1; padding:40px 60px; font-family:'Times New Roman',serif; font-size:16px; color:black; line-height:1.4;">
          <div style="text-align:center; margin-bottom:20px;">${data.title}</div>
          <div style="font-size:24px; font-weight:bold; text-align:center; margin:20px 0;">БЛАГОДАРНОСТЬ НАУЧНОМУ РУКОВОДИТЕЛЮ<br>(ПРЕПОДАВАТЕЛЮ)</div>
          <div style="font-size:20px; font-weight:bold; text-align:center; margin:20px 0;">${data.supervisor}</div>
          <div style="text-align:center; margin:20px 0; line-height:1.5;">
            Центр науки и инноваций выражает Вам огромную признательность и благодарность за профессиональную подготовку участника Олимпиады<br>
            <b>(${data.fio})</b>.
          </div>
          <div style="margin-top:40px; text-align:center; font-size:14px;">Дата: ${data.date}<br>№ документа ${data.number}</div>
        </div>
      </div>
    `;
  }

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
    console.error(e);
    res.status(500).send('Ошибка генерации PDF');
  }
});

// Роуты
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/docs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'docs.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
