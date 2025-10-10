const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_FILE = path.join(ROOT, 'data.json');

// --- helpers ---------------------------------------------------
function ensureDataShape(d) {
  const safe = d && typeof d === 'object' ? d : {};
  if (!Array.isArray(safe.events)) safe.events = [];
  if (!Array.isArray(safe.registrations)) safe.registrations = [];
  if (!Array.isArray(safe.tests)) safe.tests = [];
  if (!Array.isArray(safe.testResults)) safe.testResults = [];
  if (!safe.about || typeof safe.about !== 'object') safe.about = { customText: '' };
  if (typeof safe.about.customText !== 'string') safe.about.customText = '';
  return safe;
}

function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return ensureDataShape(JSON.parse(raw));
  } catch (e) {
    const initial = ensureDataShape({});
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
    } catch (_e) {}
    return initial;
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(ensureDataShape(data), null, 2), 'utf8');
}

function sanitizeQuestions(questions) {
  const arr = Array.isArray(questions) ? questions : [];
  return arr.map((q, i) => {
    const qText = (q && typeof q.text === 'string') ? q.text.trim() : '';
    const opts = Array.isArray(q?.options) ? q.options.map(o => String(o ?? '')).filter(Boolean) : [];
    const correct = Number.isInteger(q?.correctIndex) ? q.correctIndex : 0;
    return {
      id: q?.id || 'q' + (i + 1),
      text: qText,
      options: opts,
      correctIndex: Math.min(Math.max(correct, 0), Math.max(opts.length - 1, 0))
    };
  }).filter(q => q.text && q.options.length > 0);
}

// --- middleware ------------------------------------------------
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

// --- pages -----------------------------------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});
app.get('/about', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'about.html'));
});
app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

// --- api: health ----------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// --- api: about -----------------------------------------------
app.get('/api/about', (req, res) => {
  const data = loadData();
  res.json({ customText: data.about?.customText || '' });
});

app.post('/api/about', (req, res) => {
  const { customText } = req.body || {};
  if (typeof customText !== 'string') {
    return res.status(400).json({ error: "Поле 'customText' обязательно и должно быть строкой." });
  }
  const data = loadData();
  data.about = { customText };
  saveData(data);
  res.json({ ok: true, customText });
});

// --- api: events ----------------------------------------------
app.get('/api/events', (req, res) => {
  const { type, search } = req.query;
  const data = loadData();
  let events = data.events || [];
  if (type) {
    events = events.filter(e => String(e.type || '') === String(type));
  }
  if (search) {
    const s = String(search).toLowerCase();
    events = events.filter(e =>
      String(e.name || '').toLowerCase().includes(s) ||
      String(e.description || '').toLowerCase().includes(s)
    );
  }
  res.json(events);
});

app.get('/api/events/:id', (req, res) => {
  const data = loadData();
  const ev = (data.events || []).find(e => e.id === req.params.id);
  if (!ev) return res.status(404).json({ error: 'Мероприятие не найдено' });
  res.json(ev);
});

app.post('/api/events', (req, res) => {
  const { name, type, description, startDate, endDate, test } = req.body || {};
  if (!name || !type) {
    return res.status(400).json({ error: "Поля 'name' и 'type' обязательны" });
  }
  const data = loadData();
  const id = 'evt_' + uuidv4();
  const event = {
    id,
    name: String(name),
    type: String(type),
    description: String(description || ''),
    startDate: startDate || '',
    endDate: endDate || ''
  };
  data.events.push(event);

  if (event.type === 'olympiad' && test?.questions?.length) {
    const testObj = { eventId: id, questions: sanitizeQuestions(test.questions) };
    const tests = data.tests || [];
    tests.push(testObj);
    data.tests = tests;
  }

  saveData(data);
  res.status(201).json(event);
});

app.put('/api/events/:id', (req, res) => {
  const id = req.params.id;
  const { name, type, description, startDate, endDate, test } = req.body || {};

  const data = loadData();
  const idx = (data.events || []).findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Мероприятие не найдено' });

  const current = data.events[idx];
  const nextType = type ?? current.type;

  data.events[idx] = {
    ...current,
    ...(name !== undefined ? { name } : {}),
    ...(nextType !== undefined ? { type: nextType } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(startDate !== undefined ? { startDate } : {}),
    ...(endDate !== undefined ? { endDate } : {})
  };

  if (nextType === 'olympiad') {
    if (test?.questions) {
      const sanitized = sanitizeQuestions(test.questions);
      let tests = data.tests || [];
      const tIdx = tests.findIndex(t => t.eventId === id);
      const obj = { eventId: id, questions: sanitized };
      if (tIdx >= 0) tests[tIdx] = obj; else tests.push(obj);
      data.tests = tests;
    }
  } else {
    // удаляем тест, если тип изменился на не-олимпиаду
    data.tests = (data.tests || []).filter(t => t.eventId !== id);
  }

  saveData(data);
  res.json(data.events[idx]);
});

app.delete('/api/events/:id', (req, res) => {
  const id = req.params.id;
  const data = loadData();
  const before = data.events.length;
  data.events = (data.events || []).filter(e => e.id !== id);
  data.tests = (data.tests || []).filter(t => t.eventId !== id);
  data.registrations = (data.registrations || []).filter(r => r.eventId !== id);
  saveData(data);
  res.json({ removed: before - data.events.length });
});

// --- api: tests -----------------------------------------------
app.get('/api/tests/:eventId', (req, res) => {
  const data = loadData();
  const test = (data.tests || []).find(t => t.eventId === req.params.eventId);
  res.json(test || { eventId: req.params.eventId, questions: [] });
});

app.put('/api/tests/:eventId', (req, res) => {
  const eventId = req.params.eventId;
  const data = loadData();
  const ev = (data.events || []).find(e => e.id === eventId);
  if (!ev) return res.status(404).json({ error: 'Мероприятие не найдено' });

  const sanitized = sanitizeQuestions((req.body && req.body.questions) || []);
  let tests = data.tests || [];
  const idx = tests.findIndex(t => t.eventId === eventId);
  const obj = { eventId, questions: sanitized };
  if (idx >= 0) tests[idx] = obj; else tests.push(obj);
  data.tests = tests;
  saveData(data);
  res.json(obj);
});

// --- api: registrations ---------------------------------------
app.post('/api/events/:id/register', (req, res) => {
  const id = req.params.id;
  const { fullName, email, phone, extra } = req.body || {};

  const data = loadData();
  const ev = (data.events || []).find(e => e.id === id);
  if (!ev) return res.status(404).json({ error: 'Мероприятие не найдено' });
  if (!fullName || !email) return res.status(400).json({ error: "Поля 'fullName' и 'email' обязательны" });

  const reg = {
    id: 'reg_' + uuidv4(),
    eventId: id,
    eventName: ev.name,
    fullName: String(fullName),
    email: String(email),
    phone: String(phone || ''),
    extra: extra || {},
    createdAt: new Date().toISOString(),
    payment: {
      provider: 'robokassa',
      status: 'pending',
      stubUrl: '' // заполним ниже после вычисления id
    }
  };
  reg.payment.stubUrl = `/payment-stub?reg=${encodeURIComponent(reg.id)}`;

  data.registrations = data.registrations || [];
  data.registrations.push(reg);
  saveData(data);

  res.status(201).json({ registration: reg, paymentUrl: reg.payment.stubUrl });
});

app.get('/api/registrations', (req, res) => {
  const data = loadData();
  res.json(data.registrations || []);
});

app.get('/api/registrations.csv', (req, res) => {
  const data = loadData();
  const regs = data.registrations || [];
  const headers = ['id','eventId','eventName','fullName','email','phone','createdAt','paymentStatus'];
  const lines = [headers.join(',')].concat(regs.map(r => {
    const row = [
      r.id, r.eventId, r.eventName, r.fullName, r.email, r.phone, r.createdAt, (r.payment?.status || '')
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`);
    return row.join(',');
  }));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.send(lines.join('\n'));
});

// --- payment stub & callback reserve --------------------------
app.get('/payment-stub', (req, res) => {
  const regId = String(req.query.reg || '');
  const html = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Оплата Robokassa — заглушка</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <main class="about-section" style="max-width:860px;margin:2rem auto;">
    <h1>Оплата — Robokassa (резервная заглушка)</h1>
    <p>Регистрация <strong>${regId}</strong> создана.</p>
    <p>Здесь будет перенаправление на оплату Robokassa после интеграции.</p>
    <p><strong>Точки интеграции:</strong></p>
    <ul>
      <li>Редирект пользователя на страницу/виджет Robokassa после успешной регистрации.</li>
      <li>Обработка уведомлений: <code>POST /api/payments/robokassa/callback</code></li>
      <li>Обновление статуса оплаты у регистрации (<code>payment.status</code> = <em>paid</em>/<em>failed</em>).</li>
    </ul>
    <a class="btn-register" href="/">Вернуться на главную</a>
  </main>
</body>
</html>`;
  res.status(200).send(html);
});

// Пока просто заглушка — чтобы была точка входа для веб-хуков Robokassa
app.post('/api/payments/robokassa/callback', (req, res) => {
  res.json({ ok: true, note: 'Заглушка для Robokassa. Реальную подпись/валидацию необходимо добавить.' });
});

// --- 404 fallback for pretty routes ----------------------------
app.use((req, res, next) => {
  if (req.method === 'GET' && req.accepts('html') && !req.path.startsWith('/api/')) {
    return res.status(404).sendFile(path.join(PUBLIC_DIR, 'index.html'));
  }
  next();
});

// --- start -----------------------------------------------------
app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});
