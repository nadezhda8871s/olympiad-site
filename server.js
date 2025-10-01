const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.json());

const EVENTS_FILE = path.join(__dirname, 'data', 'events.json');
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');
const TEMPLATES_DIR = path.join(__dirname, 'templates');

fs.ensureDirSync(path.join(__dirname, 'data'));

if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeJsonSync(EVENTS_FILE, [
    {
      "key": "stat",
      "title": "Международная Олимпиада по статистике и прикладной математике",
      "short": "Современные подходы к анализу данных и статистическим методам.",
      "audience": "students",
      "info": "Приглашаем вас принять участие в Международной Олимпиаде по Статистике — «Статистика будущего: искусство анализа данных!»\n\nСегодня умение анализировать большие объемы информации становится ключевым фактором успеха как в повседневной жизни, так и в профессиональной деятельности.",
      "questions": [
        {"q": "По формуле (∑p1q1)/(∑p0q1) рассчитывают общий индекс цен", "options": ["Эджворта-Маршалла","Фишера","Ласпейреса","Пааше"], "correct": 3}
      ]
    }
  ]);
}

if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeJsonSync(SETTINGS_FILE, {
    "footerEmail": "naych_kooper@mail.ru",
    "footerText": "© 2025 Все права защищены. Копирование контента без разрешения автора строго ЗАПРЕЩЕНО!",
    "paymentText": "За участие в мероприятиях плата не взимается, а стоимость документов с индивидуальным номером 100 руб. Оплатить можно Онлайн на сайте через платежную систему Робокасса, реквизиты для оплаты: номер счета 40817810547119031524 Банк - получатель ФИЛИАЛ \"ЮЖНЫЙ\" ПАО \"БАНК УРАЛСИБ\". Краснодар БИК Банка 040349700, кор. счет Банка 30101810400000000700, ИНН Банка 0274062111, КПП Банка 231043001."
  });
}

// === API ===
app.get('/api/events', (req, res) => res.json(fs.readJsonSync(EVENTS_FILE)));
app.get('/api/settings', (req, res) => res.json(fs.readJsonSync(SETTINGS_FILE)));

app.post('/api/events', (req, res) => {
  fs.writeJsonSync(EVENTS_FILE, req.body);
  res.json({ ok: true });
});

app.post('/api/settings', (req, res) => {
  fs.writeJsonSync(SETTINGS_FILE, req.body);
  res.json({ ok: true });
});

app.post('/api/generate-pdf', async (req, res) => {
  const { template, data } = req.body;
  const templatePath = path.join(TEMPLATES_DIR, `${template}.html`);
  if (!fs.existsSync(templatePath)) return res.status(404).send('Шаблон не найден');

  let html = fs.readFileSync(templatePath, 'utf8');
  const replacements = {
    '{{title}}': data.title || '',
    '{{fio}}': data.fio || '',
    '{{school}}': data.school || '',
    '{{region}}': data.region || '',
    '{{city}}': data.city || '',
    '{{supervisor}}': data.supervisor || '',
    '{{date}}': data.date || new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
    '{{number}}': data.number || '2025-' + String(Math.floor(Math.random() * 100000)).padStart(5, '0')
  };

  for (const [key, value] of Object.entries(replacements)) {
    html = html.replace(new RegExp(key, 'g'), value);
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

// === Routes ===
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
