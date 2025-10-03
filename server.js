const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.json());

// Используем /tmp для записи на Render Free
const DATA_DIR = '/tmp/data';
fs.ensureDirSync(DATA_DIR);

const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const TEMPLATES_DIR = path.join(__dirname, 'templates');

// Инициализация данных (для первого запуска)
if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeJsonSync(EVENTS_FILE, [
    {
      "key": "stat",
      "title": "Международная Олимпиада по статистике и прикладной математике",
      "short": "Современные подходы к анализу данных и статистическим методам.",
      "audience": "students",
      "info": "Полный текст олимпиады...",
      "questions": []
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

// === Генерация PDF ===
app.post('/api/generate-pdf', async (req, res) => {
  const { template, data } = req.body;

  // Валидация
  if (!['certificate', 'diploma', 'thanks'].includes(template)) {
    return res.status(400).send('Недопустимый шаблон');
  }

  let title = data.title || 'Международная Олимпиада по статистике и прикладной математике';
  let fio = data.fio || 'Иванов Иван Иванович';
  let school = data.school || 'ФГБОУ ВО Кубанский государственный аграрный университет имени И.Т. Трубилина';
  let region = data.region || 'Краснодарский край';
  let city = data.city || 'Краснодар';
  let supervisor = data.supervisor || 'Лоскутов Лоскут Лоскутович';
  let date = data.date || '30 сентября 2025 г.';
  let number = data.number || '1111111111';

  // Воссоздаём перенос как в превью: "универси-<br>тет"
  const schoolWithBreak = school.replace(/(универси)(тет)/i, '$1-<br>$2');

  let html = '';
  if (template === 'certificate') {
    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: "Times New Roman", serif; font-size: 16px; margin: 0; padding: 40px 60px; line-height: 1.4; color: black; }
          .title { text-align: center; margin-bottom: 20px; }
          .doc-type { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; }
          .fio { font-size: 20px; font-weight: bold; text-align: center; margin: 20px 0; }
          .school { text-align: center; margin: 10px 0; }
          .supervisor-line { margin-top: 20px; text-align: center; }
          .footer { margin-top: 40px; text-align: center; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="title">${title}</div>
        <div class="doc-type">СЕРТИФИКАТ УЧАСТНИКА</div>
        <div class="fio">${fio}</div>
        <div class="school">${school}, ${region}, ${city}</div>
        <div class="supervisor-line">Научный руководитель(преподаватель):<br>${supervisor}</div>
        <div class="footer">Дата: ${date}<br>№ документа ${number}</div>
      </body>
      </html>
    `;
  } else if (template === 'diploma') {
    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: "Times New Roman", serif; font-size: 16px; margin: 0; padding: 40px 60px; line-height: 1.4; color: black; }
          .title { text-align: center; margin-bottom: 20px; }
          .doc-type { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; }
          .awarded { text-align: center; margin: 10px 0; }
          .fio { font-size: 20px; font-weight: bold; text-align: center; margin: 10px 0; }
          .school { text-align: center; margin: 10px 0; }
          .supervisor-line { margin-top: 20px; text-align: center; }
          .footer { margin-top: 40px; text-align: center; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="title">${title}</div>
        <div class="doc-type">ДИПЛОМ I СТЕПЕНИ</div>
        <div class="awarded">награждён(а):</div>
        <div class="fio">${fio}</div>
        <div class="school">${schoolWithBreak}, ${region}, ${city}</div>
        <div class="supervisor-line">Научный руководитель(преподаватель):<br>${supervisor}</div>
        <div class="footer">Дата: ${date}<br>№ документа ${number}</div>
      </body>
      </html>
    `;
  } else if (template === 'thanks') {
    html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: "Times New Roman", serif; font-size: 16px; margin: 0; padding: 40px 60px; line-height: 1.4; color: black; }
          .title { text-align: center; margin-bottom: 20px; }
          .doc-type { font-size: 24px; font-weight: bold; text-align: center; margin: 20px 0; }
          .supervisor { font-size: 20px; font-weight: bold; text-align: center; margin: 20px 0; }
          .text { text-align: center; margin: 20px 0; line-height: 1.5; }
          .participant { font-weight: bold; }
          .footer { margin-top: 40px; text-align: center; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="title">${title}</div>
        <div class="doc-type">БЛАГОДАРНОСТЬ НАУЧНОМУ РУКОВОДИТЕЛЮ<br>(ПРЕПОДАВАТЕЛЮ)</div>
        <div class="supervisor">${supervisor}</div>
        <div class="text">Центр науки и инноваций выражает Вам огромную признательность и благодарность за профессиональную подготовку участника Олимпиады<br><span class="participant">(${fio})</span>.</div>
        <div class="footer">Дата: ${date}<br>№ документа ${number}</div>
      </body>
      </html>
    `;
  }

  try {
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
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
    console.error('PDF generation error:', e);
    res.status(500).send('Ошибка генерации PDF: ' + e.message);
  }
});

// === Роуты ===
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Сервер запущен на порту ${PORT}`);
});
