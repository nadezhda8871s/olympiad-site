```javascript
// server.js — финальная версия (Single-file)
// Express + Playwright PDF generation + events/settings/participants persistence
// IMPORTANT:
// - Use Node 20+
// - package.json should include playwright dependency and postinstall: "npx playwright install chromium"
// - On Render set environment variables DATA_DIR (optional), ADMIN_USER, ADMIN_PASS
// - This file avoids backticks and multiline template literals to be safe for Render

const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const bodyParser = require("body-parser");
const multer = require("multer");
const XLSX = require("xlsx");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 10000;

// Admin credentials (set these in Render Environment variables)
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "adminpass";

// DATA_DIR: prefer env var; on Render you can set DATA_DIR to a persistent volume mount point.
// Fallback: if running locally, uses ./data
const DATA_DIR = process.env.DATA_DIR || (process.env.RENDER ? "/tmp/data" : path.join(__dirname, "data"));
const EVENTS_FILE = path.join(DATA_DIR, "events.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const PARTICIPANTS_FILE = path.join(DATA_DIR, "participants.json");

fs.ensureDirSync(DATA_DIR);

// ----------------- DEFAULT DATA (written at first run if files missing) -----------------
const DEFAULT_EVENTS = [
  {
    key: "stat",
    title: "Международная Олимпиада по статистике и прикладной математике",
    short: "Современные подходы к анализу данных и статистическим методам.",
    audience: "students",
    info: "Приглашаем вас принять участие в Международной Олимпиаде по Статистике — «Статистика будущего: искусство анализа данных!». Сегодня умение анализировать большие объемы информации становится ключевым фактором успеха как в повседневной жизни, так и в профессиональной деятельности. Умение выявлять закономерности, строить прогнозы и принимать обоснованные решения на основе статистических данных определяет вашу конкурентоспособность и перспективы развития. Наша олимпиада объединяет участников со всего мира, предлагая уникальную возможность обменяться опытом и знаниями с коллегами из разных стран. Каждый участник получит диплом или сертификат.",
    questions: [
      { q: "По формуле (∑p1q1)/(∑p0q1) рассчитывают общий индекс цен", options: ["Эджворта-Маршалла", "Фишера", "Ласпейреса", "Пааше"], correct: 3 },
      { q: "Индекс, отражающий влияние уровня ставок по каждому кредиту на среднее изменение ставки — это индекс…", options: ["Постоянного состава", "Структурных сдвигов", "Переменного состава", "Индивидуальный"], correct: 0 },
      { q: "В общем индексе цен Пааше в качестве весов используется…", options: ["товарооборот отчетного периода", "индекс Фишера", "товарооборот базисного периода", "индекс Эджворта-Маршалла"], correct: 0 },
      { q: "Индекс, характеризующий изменение средней зарплаты за счет изменения зарплаты каждого работника — это индекс…", options: ["Постоянного состава", "Произвольного состава", "Переменного состава", "Структурных сдвигов"], correct: 0 },
      { q: "Выборка называется малой, если ее объем менее…", options: ["30", "40", "50", "100"], correct: 0 }
    ]
  },
  {
    key: "fin",
    title: "Международная Олимпиада по финансовым вычислениям в банковском секторе",
    short: "Финансовое мастерство и точность расчётов для будущих профессионалов.",
    audience: "students",
    info: "Приглашаем вас принять участие в Международной Олимпиаде по финансовым вычислениям — «Финансовое мастерство: точность вычислений!». Участие даст практические навыки в финансовой математике, планировании денежных потоков и оценке доходности. После окончания участникам выдаются дипломы или сертификаты.",
    questions: [
      { q: "Фактор времени учитывается с помощью", options: ["процентной ставки", "дисконта", "ренты", "конверсии"], correct: 0 },
      { q: "Процесс наращения — это…", options: ["по исходной сумме найти ожидаемую", "по будущей сумме найти исходный долг", "норма дисконта", "расчет доходности"], correct: 0 },
      { q: "Процесс дисконтирования — это…", options: ["по исходной сумме найти ожидаемую", "по будущей сумме найти исходный долг", "расчет доходности", "нет верного ответа"], correct: 1 },
      { q: "Чем выше конкуренция среди заемщиков…", options: ["выше ставки по кредитам", "ниже ставки по кредитам", "хуже кредиторам", "зависимость отсутствует"], correct: 0 },
      { q: "Капитализация процентов — это…", options: ["относительная величина дохода", "абсолютная величина дохода", "присоединение процентов к сумме", "все ответы верны"], correct: 2 }
    ]
  },
  {
    key: "prob",
    title: "Международная Олимпиада «Применение Теории вероятностей в экономике»",
    short: "Стохастика, риски и принятие решений в экономике.",
    audience: "students",
    info: "Уважаемые студенты и молодые специалисты! Приглашаем принять участие в олимпиаде по теории вероятностей в экономике. Проверьте свои знания по стохастике, оценке рисков и моделированию. Участникам гарантированы дипломы и сертификаты после окончания испытаний.",
    questions: [
      { q: "Что такое нормальное распределение?", options: ["Нулевое значение риска", "Единичное отклонение риска", "Распределение Гаусса", "Положительная прибыль"], correct: 2 },
      { q: "Плотность вероятности — это…", options: ["Условная доходность", "Полимодальная структура", "Двумерная функция", "Первая производная от функции распределения"], correct: 3 },
      { q: "Случайная экономическая величина — это…", options: ["Критерий Фишера", "Теорема Пуассона", "Величина, полученная случайным процессом", "Формула Бернулли"], correct: 2 },
      { q: "Дискретная случайная величина — это…", options: ["Заданная плотностью", "Равномерно распределённая на интервале", "Принимающая значения из конечного набора"], correct: 2 },
      { q: "Коэффициент корреляции r = 0 означает…", options: ["Нет линейной связи", "Полная линейная зависимость", "Один индикатор независим", "Все индикаторы положительны"], correct: 0 }
    ]
  }
];

const DEFAULT_SETTINGS = {
  paymentText: "За участие в мероприятиях плата не взимается. Документ (диплом/сертификат) с индивидуальным номером - 100 руб.",
  footerEmail: "naych_kooper@mail.ru",
  footerText: "© 2025 Все права защищены. Копирование контента без разрешения автора строго ЗАПРЕЩЕНО!",
  backgrounds: {
    all: null,
    diploma_1: null,
    diploma_2: null,
    diploma_3: null,
    certificate: null,
    thanks: null
  },
  legal: {
    termsTitle: "Пользовательское соглашение (публичная оферта) и Правила проведения олимпиады",
    termsText: "1. Общие положения\\n1.1. Настоящее Пользовательское соглашение регулирует отношения между Организатором и Участником.\\n2. Предмет соглашения\\n2.1. Организатор предоставляет возможность участия в онлайн-олимпиадах бесплатно.\\n2.2. Документы выдаются за плату в размере 100 руб.",
    privacyTitle: "Политика конфиденциальности и Согласие на обработку персональных данных",
    privacyText: "1. Какие данные мы собираем: ФИО, e-mail, учебное заведение и др.\\n2. Цели обработки: оформление участия, направление результатов, отправка документов после оплаты.\\n3. Защита данных: данные хранятся и не передаются третьим лицам без необходимости."
  }
};

// initialize files if missing
if (!fs.existsSync(EVENTS_FILE)) {
  fs.writeJsonSync(EVENTS_FILE, DEFAULT_EVENTS, { spaces: 2 });
}
if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeJsonSync(SETTINGS_FILE, DEFAULT_SETTINGS, { spaces: 2 });
}
if (!fs.existsSync(PARTICIPANTS_FILE)) {
  fs.writeJsonSync(PARTICIPANTS_FILE, [], { spaces: 2 });
}

// multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// express middleware
app.use(express.static("public"));
app.use(bodyParser.json({ limit: "30mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "30mb" }));

// ----------------- AUTH HELPERS -----------------
function isValidAuthToken(b64token) {
  if (!b64token) return false;
  try {
    const decoded = Buffer.from(b64token, "base64").toString();
    const parts = decoded.split(":");
    const user = parts[0] || "";
    const pass = parts[1] || "";
    return user === ADMIN_USER && pass === ADMIN_PASS;
  } catch (e) {
    return false;
  }
}
function checkAuthFromRequest(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Basic ")) {
    const token = header.split(" ")[1];
    return isValidAuthToken(token);
  }
  if (req.query && req.query.auth) {
    return isValidAuthToken(req.query.auth);
  }
  return false;
}
function requireAuth(req, res, next) {
  if (checkAuthFromRequest(req)) return next();
  res.status(401).json({ error: "Unauthorized" });
}

// ----------------- EVENTS endpoints -----------------
app.get("/api/events", (req, res) => {
  try {
    const events = fs.readJsonSync(EVENTS_FILE);
    res.json(events);
  } catch (e) {
    console.error("Read events error:", e);
    res.status(500).json({ error: "Failed to read events" });
  }
});

app.post("/api/events", requireAuth, (req, res) => {
  try {
    const incoming = req.body;
    if (!Array.isArray(incoming)) return res.status(400).json({ error: "Invalid payload" });
    const safe = incoming.map(ev => {
      return {
        key: ev.key || ("evt-" + Date.now()),
        title: ev.title || "",
        short: ev.short || "",
        audience: ev.audience || "students",
        info: ev.info || "",
        questions: Array.isArray(ev.questions) ? ev.questions : []
      };
    });
    fs.writeJsonSync(EVENTS_FILE, safe, { spaces: 2 });
    res.json({ ok: true });
  } catch (e) {
    console.error("Save events error:", e);
    res.status(500).json({ error: "Failed to save events" });
  }
});

// ----------------- SETTINGS and backgrounds -----------------
app.get("/api/settings", (req, res) => {
  try {
    const settings = fs.readJsonSync(SETTINGS_FILE);
    res.json(settings);
  } catch (e) {
    console.error("Read settings error:", e);
    res.status(500).json({ error: "Failed to read settings" });
  }
});

app.post("/api/settings", requireAuth, (req, res) => {
  try {
    const incoming = req.body || {};
    const settings = fs.readJsonSync(SETTINGS_FILE);
    const merged = Object.assign({}, settings, incoming);
    if (incoming.backgrounds) merged.backgrounds = Object.assign({}, settings.backgrounds, incoming.backgrounds);
    if (incoming.legal) merged.legal = Object.assign({}, settings.legal, incoming.legal);
    fs.writeJsonSync(SETTINGS_FILE, merged, { spaces: 2 });
    res.json({ ok: true });
  } catch (e) {
    console.error("Save settings error:", e);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

app.post("/api/upload-background", requireAuth, upload.single("background"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const docType = req.body.docType;
    const valid = ["all", "diploma_1", "diploma_2", "diploma_3", "certificate", "thanks"];
    if (!valid.includes(docType)) return res.status(400).json({ error: "Invalid docType" });
    const dataUrl = req.file.mimetype + ";base64," + req.file.buffer.toString("base64");
    const settings = fs.readJsonSync(SETTINGS_FILE);
    settings.backgrounds = settings.backgrounds || {};
    settings.backgrounds[docType] = dataUrl;
    fs.writeJsonSync(SETTINGS_FILE, settings, { spaces: 2 });
    res.json({ ok: true, message: "Background saved for " + docType });
  } catch (e) {
    console.error("Upload background error:", e);
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/api/backgrounds-status", (req, res) => {
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
    console.error("bg status error:", e);
    res.status(500).json({ error: "Failed to read backgrounds" });
  }
});

// ----------------- Participants save/export -----------------
app.post("/api/save-participant", (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.fio) return res.status(400).json({ error: "Missing fio" });
    const db = fs.readJsonSync(PARTICIPANTS_FILE);
    const record = Object.assign({ id: Date.now().toString(), timestamp: new Date().toISOString() }, payload);
    db.push(record);
    fs.writeJsonSync(PARTICIPANTS_FILE, db, { spaces: 2 });
    res.json({ ok: true, id: record.id });
  } catch (e) {
    console.error("Save participant error:", e);
    res.status(500).json({ error: "Failed to save participant" });
  }
});

app.get("/api/export-participants", (req, res) => {
  if (!checkAuthFromRequest(req)) return res.status(401).send("Unauthorized");
  try {
    const data = fs.readJsonSync(PARTICIPANTS_FILE);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "participants");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="participants.xlsx"');
    res.send(buf);
  } catch (e) {
    console.error("Export error:", e);
    res.status(500).send("Export failed");
  }
});

// ----------------- Generate PDF (Playwright) -----------------
app.post("/api/generate-pdf", async (req, res) => {
  const body = req.body || {};
  const data = body.data || {};
  if (!data.fio) return res.status(400).json({ error: "Missing fio" });

  try {
    const settings = fs.readJsonSync(SETTINGS_FILE);
    let template = body.template || "auto";
    if (template === "auto") {
      const score = Number(data.score || 0);
      if (score > 70) template = "diploma_1";
      else if (score > 50) template = "diploma_2";
      else if (score > 20) template = "diploma_3";
      else template = "certificate";
    }

    const background = (settings.backgrounds && (settings.backgrounds[template] || settings.backgrounds.all)) || null;
    const today = data.date || new Date().toLocaleDateString("ru-RU");
    const number = data.number || ("2025-" + String(Math.floor(Math.random() * 100000)).padStart(5, "0"));
    const schoolWithBreak = (data.school || "").replace(/(универси)(тет)/gi, "$1-<br>$2");

    let titleBlock = "";
    if (template === "diploma_1") titleBlock = '<div style="font-size:28px;font-weight:bold;text-align:center;margin:20px 0;">ДИПЛОМ I СТЕПЕНИ</div>';
    else if (template === "diploma_2") titleBlock = '<div style="font-size:26px;font-weight:bold;text-align:center;margin:20px 0;">ДИПЛОМ II СТЕПЕНИ</div>';
    else if (template === "diploma_3") titleBlock = '<div style="font-size:24px;font-weight:bold;text-align:center;margin:20px 0;">ДИПЛОМ III СТЕПЕНИ</div>';
    else if (template === "thanks") titleBlock = '<div style="font-size:24px;font-weight:bold;text-align:center;margin:20px 0;">БЛАГОДАРНОСТЬ</div>';
    else titleBlock = '<div style="font-size:24px;font-weight:bold;text-align:center;margin:20px 0;">СЕРТИФИКАТ УЧАСТНИКА</div>';

    let contentInner = "";
    if (template === "thanks") {
      contentInner = ""
        + '<div style="text-align:center; margin-bottom:20px; font-size:18px; font-weight:bold;">' + escapeHtml(data.title || "") + "</div>"
        + '<div style="font-size:20px; font-weight:bold; text-align:center; margin:20px 0;">БЛАГОДАРНОСТЬ НАУЧНОМУ РУКОВОДИТЕЛЮ</div>'
        + '<div style="font-size:20px; font-weight:bold; text-align:center; margin:10px 0;">' + escapeHtml(data.supervisor || "") + "</div>"
        + '<div style="text-align:center; margin:20px 0; line-height:1.5;">Центр науки и инноваций выражает признательность за подготовку участника (' + escapeHtml(data.fio || "") + ').</div>'
        + '<div style="margin-top:40px; text-align:center; font-size:14px;">Дата: ' + escapeHtml(today) + '<br>№ документа ' + escapeHtml(number) + "</div>";
    } else {
      contentInner = ""
        + '<div style="text-align:center; margin-bottom:20px; font-size:18px; font-weight:bold;">' + escapeHtml(data.title || "") + "</div>"
        + titleBlock
        + (template.indexOf("diploma") === 0 ? '<div style="text-align:center; margin:10px 0;">награждён(а):</div>' : "")
        + '<div style="font-size:20px; font-weight:bold; text-align:center; margin:10px 0;">' + escapeHtml(data.fio || "") + "</div>"
        + '<div style="text-align:center;">' + (schoolWithBreak ? schoolWithBreak : "") + (schoolWithBreak ? ", " : "") + escapeHtml(data.region || "") + ", " + escapeHtml(data.city || "") + "</div>"
        + (data.supervisor ? ('<div style="margin-top:20px; text-align:center;">Научный руководитель(преподаватель):<br>' + escapeHtml(data.supervisor) + "</div>") : "")
        + '<div style="margin-top:40px; text-align:center; font-size:14px;">Дата: ' + escapeHtml(today) + '<br>№ документа ' + escapeHtml(number) + "</div>";
    }

    const fullHtml = ""
      + "<!DOCTYPE html><html><head><meta charset=\"utf-8\" />"
      + "<style>@page{size:A4 landscape;margin:0;}html,body{margin:0;padding:0;height:100%;}body{font-family:\"Times New Roman\", serif;} .page{width:297mm;height:210mm;position:relative;overflow:hidden;} .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;opacity:1;} .content{position:relative;z-index:1;padding:40px 60px;box-sizing:border-box;height:100%;color:#000;}</style>"
      + "</head><body>"
      + "<div class=\"page\">"
      + (background ? ("<img src=\"" + background + "\" class=\"bg\" alt=\"bg\" />") : "")
      + "<div class=\"content\">" + contentInner + "</div></div></body></html>";

    const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] });
    const pagePlay = await browser.newPage();
    await pagePlay.setContent(fullHtml, { waitUntil: "networkidle" });
    const pdfBuffer = await pagePlay.pdf({ format: "A4", printBackground: true, landscape: true });
    await browser.close();

    // save participant
    try {
      const db = fs.readJsonSync(PARTICIPANTS_FILE);
      const record = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        template: template,
        fio: data.fio || "",
        email: data.email || "",
        school: data.school || "",
        region: data.region || "",
        city: data.city || "",
        supervisor: data.supervisor || "",
        score: data.score != null ? data.score : null,
        date: today,
        number: number,
        eventKey: data.eventKey || null,
        eventTitle: data.title || null
      };
      db.push(record);
      fs.writeJsonSync(PARTICIPANTS_FILE, db, { spaces: 2 });
    } catch (e) {
      console.warn("Could not save participant record:", e);
    }

    const filename = template + "-" + number + ".pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');
    res.send(pdfBuffer);

  } catch (e) {
    console.error("generate-pdf error:", e);
    res.status(500).json({ error: "PDF generation failed", message: e.message });
  }
});

// ----------------- helpers, static, start -----------------
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
app.get("/docs", (req, res) => res.sendFile(path.join(__dirname, "public", "docs.html")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, () => {
  console.log("Server started on port " + PORT);
  console.log("Data directory: " + DATA_DIR);
});
```
