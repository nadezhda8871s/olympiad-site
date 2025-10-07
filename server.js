```javascript
// server.js
// Node 20.x compatible Express server with Playwright PDF generation.
// Features:
// - GET/POST /api/events            -> read/save events (admin)
// - POST /api/generate-pdf         -> generate certificate/diploma/thanks PDF via Playwright
// - POST /api/save-participant     -> save participant record to participants.json (public)
// - GET  /api/export-participants  -> export XLSX (admin)
// - POST /api/upload-background    -> upload background images (admin)
// - GET  /api/backgrounds-status   -> report which backgrounds are loaded
//
// Important for Render:
// - set ADMIN_USER and ADMIN_PASS as environment variables
// - set RENDER=true or DATA_DIR=/tmp/data to persist to a writable location on Render
// - add playwright in dependencies and ensure `npx playwright install --with-deps` runs on build

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const bodyParser = require('body-parser');
const multer = require('multer');
const { chromium } = require('playwright'); // Playwright must be installed
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 10000;

// Admin credentials (set in Render env securely)
const ADMIN_USER = process.env.ADMIN_USER || 'nadezhda8871s';
const ADMIN_PASS = process.env.ADMIN_PASS || '1988NAna';

// Data dir (use /tmp/data on Render)
const DATA_DIR = process.env.DATA_DIR || (process.env.RENDER ? '/tmp/data' : path.join(__dirname, 'data'));
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const DB_FILE = path.join(DATA_DIR, 'participants.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

fs.ensureDirSync(DATA_DIR);

// Default settings (write if missing)
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeJsonSync(SETTINGS_FILE, {
    paymentText: "За участие плата не взимается. Документы с индивидуальным номером — 100 руб.",
    footerEmail: 'naych_kooper@mail.ru',
    footerText: '© 2025 Все права защищены. Копирование контента без разрешения автора строго ЗАПРЕЩЕНО!',
    backgrounds: {
      all: null,
      diploma_1: null,
      diploma_2: null,
      diploma_3: null,
      certificate: null,
      thanks: null
    },
    signature: null // optional base64 signature image dataURL
  }, { spaces: 2 });
}

// Default events if missing (simple fallback)
const defaultEvents = [
  {
    key: 'stat',
    title: 'Международная Олимпиада по статистике и прикладной математике',
    short: 'Современные подходы к анализу данных и статистическим методам.',
    audience: 'students',
    info: 'Подробная информация по статистике...',
    questions: []
  }
];

if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeJsonSync(EVENTS_FILE, defaultEvents, { spaces: 2 });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeJsonSync(DB_FILE, [], { spaces: 2 });
}

// Multer for uploads (memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

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

// --- API: Events ---
app.get('/api/events', (req, res) => {
  try {
    const events = fs.readJsonSync(EVENTS_FILE);
    res.json(events);
  } catch (e) {
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

// --- API: Settings & Backgrounds ---
app.get('/api/settings', (req, res) => {
  try {
    const settings = fs.readJsonSync(SETTINGS_FILE);
    res.json(settings);
  } catch (e) {
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
    fs.writeJsonSync(SETTINGS_FILE, merged, { spaces: 2 });
    res.json({ ok: true });
  } catch (e) {
    console.error('Save settings error:', e);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Upload background (admin)
app.post('/api/upload-background', requireAuth, upload.single('background'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const docType = req.body.docType; // e.g. diploma_1, certificate, thanks, all
    const validTypes = ['all', 'diploma_1', 'diploma_2', 'diploma_3', 'certificate', 'thanks'];
    if (!validTypes.includes(docType)) return res.status(400).json({ error: 'Invalid docType' });

    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `${req.file.mimetype};base64,${base64}`;

    const settings = fs.readJsonSync(SETTINGS_FILE);
    settings.backgrounds = settings.backgrounds || {};
    settings.backgrounds[docType] = dataUrl;
    fs.writeJsonSync(SETTINGS_FILE, settings, { spaces: 2 });

    res.json({ ok: true, message: `Background ${docType} saved` });
  } catch (e) {
    console.error('Upload background error:', e);
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
    res.status(500).json({ error: 'Failed to read backgrounds' });
  }
});

// --- API: Save Participant (public) ---
app.post('/api/save-participant', async (req, res) => {
  try {
    const rec = req.body;
    if (!rec || !rec.fio) return res.status(400).json({ error: 'Missing participant data' });

    const db = fs.readJsonSync(DB_FILE);
    const record = Object.assign({
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    }, rec);
    db.push(record);
    fs.writeJsonSync(DB_FILE, db, { spaces: 2 });
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
    const db = fs.readJsonSync(DB_FILE);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(db);
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
// Expected JSON body:
// {
//   template: 'certificate' | 'diploma_1' | 'diploma_2' | 'diploma_3' | 'thanks',
//   data: { fio, school, region, city, supervisor, title, date, number, score }
// }
app.post('/api/generate-pdf', async (req, res) => {
  const { template, data } = req.body || {};
  if (!template || !data) return res.status(400).json({ error: 'Missing template or data' });

  try {
    const settings = fs.readJsonSync(SETTINGS_FILE);
    const backgrounds = (settings.backgrounds) || {};
    // choose background: specific template -> certificate/diploma_x/thanks OR fallback to 'all'
    let bg = backgrounds[template] || backgrounds.all || null;

    // sanitize and prepare content
    const schoolWithBreak = (data.school || '').replace(/(универси)(тет)/gi, '$1-<br>$2');
    const today = data.date || new Date().toLocaleDateString('ru-RU');
    const number = data.number || (`2025-${String(Math.floor(Math.random()*100000)).padStart(5,'0')}`);

    // Title block logic (diploma degrees)
    let titleHtml = '';
    if (template === 'diploma_1') titleHtml = '<div style="font-size:28px;font-weight:bold;text-align:center;margin:20px 0;">ДИПЛОМ I СТЕПЕНИ</div>';
    else if (template === 'diploma_2') titleHtml = '<div style="font-size:28px;font-weight:bold;text-align:center;margin:20px 0;">ДИПЛОМ II СТЕПЕНИ</div>';
    else if (template === 'diploma_3') titleHtml = '<div style="font-size:28px;font-weight:bold;text-align:center;margin:20px 0;">ДИПЛОМ III СТЕПЕНИ</div>';
    else if (template === 'thanks') titleHtml = '<div style="font-size:24px;font-weight:bold;text-align:center;margin:20px 0;">БЛАГОДАРНОСТЬ</div>';
    else titleHtml = '<div style="font-size:24px;font-weight:bold;text-align:center;margin:20px 0;">СЕРТИФИКАТ УЧАСТНИКА</div>';

    // contentHtml
    let contentHtml = '';
    if (template === 'thanks') {
      contentHtml = `
        <div style="text-align:center; margin-bottom:20px; font-size:18px; font-weight:bold;">${escapeHtml(data.title || '')}</div>
        <div style="font-size:20px; font-weight:bold; text-align:center; margin:20px 0;">БЛАГОДАРНОСТЬ НАУЧНОМУ РУКОВОДИТЕЛЮ</div>
        <div style="font-size:20px; font-weight:bold; text-align:center; margin:10px 0;">${escapeHtml(data.supervisor || '')}</div>
        <div style="text-align:center; margin:20px 0; line-height:1.5;">Центр науки и инноваций выражает Вам признательность за подготовку участника <b>(${escapeHtml(data.fio || '')})</b>.</div>
        <div style="margin-top:40px; text-align:center; font-size:14px;">Дата: ${escapeHtml(today)}<br>№ документа ${escapeHtml(number)}</div>
      `;
    } else {
      contentHtml = `
        <div style="text-align:center; margin-bottom:20px; font-size:18px; font-weight:bold;">${escapeHtml(data.title || '')}</div>
        ${titleHtml}
        ${template.startsWith('diploma') ? '<div style="text-align:center; margin:10px 0;">награждён(а):</div>' : ''}
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
        <meta charset="utf-8">
        <style>
          @page { size: A4 landscape; margin: 0; }
          html,body { margin:0; padding:0; }
          body { font-family: "Times New Roman", serif; }
          .page { width: 297mm; height: 210mm; position: relative; overflow: hidden; }
          .bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:1; z-index:0; }
          .content { position:relative; z-index:1; padding: 40px 60px; box-sizing:border-box; height:100%; color:#000; }
        </style>
      </head>
      <body>
        <div class="page">
          ${bg ? `<img src="${bg}" class="bg" />` : ''}
          <div class="content">
            ${contentHtml}
          </div>
        </div>
      </body>
      </html>
    `;

    // Launch Playwright to render PDF
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const pagePlay = await browser.newPage();
    await pagePlay.setContent(fullHtml, { waitUntil: 'networkidle' });
    const pdfBuffer = await pagePlay.pdf({ format: 'A4', printBackground: true, landscape: true });
    await browser.close();

    // Save participant record server-side
    try {
      const db = fs.readJsonSync(DB_FILE);
      const rec = Object.assign({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        template,
      }, data);
      db.push(rec);
      fs.writeJsonSync(DB_FILE, db, { spaces: 2 });
    } catch (e) {
      console.warn('Could not save record to DB_FILE:', e.message);
    }

    // Send PDF
    const filename = `${template}-${number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);

  } catch (e) {
    console.error('generate-pdf error:', e);
    return res.status(500).json({ error: 'PDF generation failed', message: e.message });
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

// Serve static app pages
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/docs', (req, res) => res.sendFile(path.join(__dirname, 'public', 'docs.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Start
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
```
