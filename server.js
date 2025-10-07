// server.js — полный автономный сервер (копировать как есть)
// Node.js + Express + Playwright (Chromium) + fs-extra + XLSX
// Хранит данные в ./data (папка создаётся автоматически).
// На Render: добавь Environment variables ADMIN_USER и ADMIN_PASS.

const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const bodyParser = require("body-parser");
const multer = require("multer");
const XLSX = require("xlsx");
const { chromium } = require("playwright");

const app = express();
const PORT = process.env.PORT || 10000;

// Admin credentials from env
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "adminpass";

// Data dir (safe default: project data folder)
const DATA_DIR = path.join(__dirname, "data");
const EVENTS_FILE = path.join(DATA_DIR, "events.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const PARTICIPANTS_FILE = path.join(DATA_DIR, "participants.json");

// Ensure folder exists
fs.ensureDirSync(DATA_DIR);

// ---------- Default data (if files missing) ----------
const DEFAULT_EVENTS = [
{
key: "stat",
title: "Международная Олимпиада по статистике и прикладной математике",
short: "Современные подходы к анализу данных и статистическим методам.",
audience: "students",
info: "Приглашаем вас принять участие в Международной Олимпиаде по Статистике — «Статистика будущего: искусство анализа данных!». Участники освоят современные методы обработки данных и получат сертификат или диплом.",
questions: [
{ q: "По формуле (∑p1q1)/(∑p0q1) рассчитывают общий индекс цен", options: ["Эджворта-Маршалла","Фишера","Ласпейреса","Пааше"], correct: 3 },
{ q: "Индекс, отражающий влияние уровня ставок по каждому кредиту на среднее изменение ставки — это индекс…", options: ["Постоянного состава","Структурных сдвигов","Переменного состава","Индивидуальный"], correct: 0 },
{ q: "В общем индексе цен Пааше в качестве весов используется…", options: ["товарооборот отчетного периода","индекс Фишера","товарооборот базисного периода","индекс Эджворта-Маршалла"], correct: 0 },
{ q: "Индекс, характеризующий изменение средней зарплаты за счет изменения зарплаты каждого работника — это индекс…", options: ["Постоянного состава","Произвольного состава","Переменного состава","Структурных сдвигов"], correct: 0 },
{ q: "Выборка называется малой, если ее объем менее…", options: ["30","40","50","100"], correct: 0 }
]
},
{
key: "fin",
title: "Международная Олимпиада по финансовым вычислениям в банковском секторе",
short: "Финансовое мастерство и точность расчётов для будущих профессионалов.",
audience: "students",
info: "Практические задания по финансовой математике, начислению процентов, дисконтированию и оценке рисков. Участники получают дипломы и сертификаты.",
questions: [
{ q: "Фактор времени учитывается с помощью", options: ["процентной ставки","дисконта","ренты","конверсии"], correct: 0 },
{ q: "Процесс наращения — это…", options: ["по исходной сумме найти ожидаемую","по будущей сумме найти исходный долг","норма дисконта","расчет доходности"], correct: 0 },
{ q: "Процесс дисконтирования — это…", options: ["по исходной сумме найти ожидаемую","по будущей сумме найти исходный долг","расчет доходности","нет верного ответа"], correct: 1 },
{ q: "Чем выше конкуренция среди заемщиков…", options: ["выше ставки по кредитам","ниже ставки по кредитам","хуже кредиторам","зависимость отсутствует"], correct: 0 },
{ q: "Капитализация процентов — это…", options: ["относительная величина дохода","абсолютная величина дохода","присоединение процентов к сумме","все ответы верны"], correct: 2 }
]
},
{
key: "prob",
title: "Международная Олимпиада «Применение Теории вероятностей в экономике»",
short: "Стохастика, риски и принятие решений в экономике.",
audience: "students",
info: "Темы: случайные процессы, распределения, оценка рисков. Участники получают оперативные результаты и документы.",
questions: [
{ q: "Что такое нормальное распределение?", options: ["Нулевое значение риска","Единичное отклонение риска","Распределение Гаусса","Положительная прибыль"], correct: 2 },
{ q: "Плотность вероятности — это…", options: ["Условная доходность","Полимодальная структура","Двумерная функция","Первая производная от функции распределения"], correct: 3 },
{ q: "Случайная экономическая величина — это…", options: ["Критерий Фишера","Теорема Пуассона","Величина, полученная случайным процессом","Формула Бернулли"], correct: 2 },
{ q: "Дискретная случайная величина — это…", options: ["Заданная плотностью","Равномерно распределённая на интервале","Принимающая значения из конечного набора"], correct: 2 },
{ q: "Коэффициент корреляции r = 0 означает…", options: ["Нет линейной связи","Полная линейная зависимость","Один индикатор независим","Все индикаторы положительны"], correct: 0 }
]
}
];

const DEFAULT_SETTINGS = {
paymentText: "За участие плата не взимается. Документы (диплом/сертификат) выдаются при оплате — 100 руб.",
footerEmail: "[naych_kooper@mail.ru](mailto:naych_kooper@mail.ru)",
footerText: "© 2025 Все права защищены.",
backgrounds: {
all: null,
diploma_1: null,
diploma_2: null,
diploma_3: null,
certificate: null,
thanks: null
},
legal: {
termsTitle: "Пользовательское соглашение и Правила",
termsText: "1. Общие положения. 1.1. Отправка данных означает согласие с условиями. 2. Предмет: участие в онлайн-олимпиадах и конкурсах. 2.1. Услуги предоставляются бесплатно; документы — платно.",
privacyTitle: "Политика конфиденциальности",
privacyText: "Мы собираем ФИО, e-mail, учебное заведение и другие данные для оформления участия и отправки документов. Данные не передаются третьим лицам без основания."
}
};

// Write files if missing
if (!fs.existsSync(EVENTS_FILE)) {
fs.writeJsonSync(EVENTS_FILE, DEFAULT_EVENTS, { spaces: 2 });
console.log("Created events.json");
}
if (!fs.existsSync(SETTINGS_FILE)) {
fs.writeJsonSync(SETTINGS_FILE, DEFAULT_SETTINGS, { spaces: 2 });
console.log("Created settings.json");
}
if (!fs.existsSync(PARTICIPANTS_FILE)) {
fs.writeJsonSync(PARTICIPANTS_FILE, [], { spaces: 2 });
console.log("Created participants.json");
}

// Multer for uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Express middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json({ limit: "30mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "30mb" }));

// Auth helpers (Basic)
function isValidAuthToken(b64token) {
if (!b64token) return false;
try {
const decoded = Buffer.from(b64token, "base64").toString();
const parts = decoded.split(":");
return parts[0] === ADMIN_USER && parts[1] === ADMIN_PASS;
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

// ---------- API: EVENTS ----------
app.get("/api/events", (req, res) => {
try {
const ev = fs.readJsonSync(EVENTS_FILE);
res.json(ev);
} catch (e) {
console.error("Read events error:", e);
res.status(500).json({ error: "Failed to read events" });
}
});

app.post("/api/events", requireAuth, (req, res) => {
try {
const events = req.body;
if (!Array.isArray(events)) return res.status(400).json({ error: "Invalid payload" });
fs.writeJsonSync(EVENTS_FILE, events, { spaces: 2 });
res.json({ ok: true });
} catch (e) {
console.error("Save events error:", e);
res.status(500).json({ error: "Failed to save events" });
}
});

// ---------- API: SETTINGS ----------
app.get("/api/settings", (req, res) => {
try {
const s = fs.readJsonSync(SETTINGS_FILE);
res.json(s);
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

// Upload background (admin) - expects multipart form-data with field 'background' and 'docType'
app.post("/api/upload-background", requireAuth, upload.single("background"), (req, res) => {
try {
if (!req.file) return res.status(400).json({ error: "No file uploaded" });
const docType = req.body.docType;
const valid = ["all","diploma_1","diploma_2","diploma_3","certificate","thanks"];
if (!valid.includes(docType)) return res.status(400).json({ error: "Invalid docType" });
const dataUrl = req.file.mimetype + ";base64," + req.file.buffer.toString("base64");
const settings = fs.readJsonSync(SETTINGS_FILE);
settings.backgrounds = settings.backgrounds || {};
settings.backgrounds[docType] = dataUrl;
fs.writeJsonSync(SETTINGS_FILE, settings, { spaces: 2 });
res.json({ ok: true });
} catch (e) {
console.error("Upload bg error:", e);
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

// ---------- Participants ----------
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

app.get("/api/export-participants", requireAuth, (req, res) => {
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

// ---------- Generate PDF ----------
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

```
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
  + "<!DOCTYPE html><html><head><meta charset='utf-8' />"
  + "<style>@page{size:A4 landscape;margin:0;}html,body{margin:0;padding:0;height:100%;}body{font-family:'Times New Roman',serif;} .page{width:297mm;height:210mm;position:relative;overflow:hidden;} .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;opacity:1;} .content{position:relative;z-index:1;padding:40px 60px;box-sizing:border-box;height:100%;color:#000;}</style>"
  + "</head><body>"
  + "<div class='page'>"
  + (background ? ("<img src='" + background + "' class='bg' alt='bg' />") : "")
  + "<div class='content'>" + contentInner + "</div></div></body></html>";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] });
const pagePlay = await browser.newPage();
await pagePlay.setContent(fullHtml, { waitUntil: "networkidle" });
const pdfBuffer = await pagePlay.pdf({ format: "A4", printBackground: true, landscape: true });
await browser.close();

// Save participant record
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

// Send PDF
const filename = template + "-" + number + ".pdf";
// also save pdf to disk under data/pdfs
try {
  const pdfsDir = path.join(DATA_DIR, "pdfs");
  fs.ensureDirSync(pdfsDir);
  const savePath = path.join(pdfsDir, filename);
  fs.writeFileSync(savePath, pdfBuffer);
} catch (e) {
  console.warn("Failed to save PDF to disk:", e);
}

res.setHeader("Content-Type", "application/pdf");
res.setHeader("Content-Disposition", 'attachment; filename="' + filename + '"');
res.send(pdfBuffer);
```

} catch (e) {
console.error("generate-pdf error:", e);
res.status(500).json({ error: "PDF generation failed", message: String(e && e.message ? e.message : e) });
}
});

// helpers
function escapeHtml(str) {
if (str === undefined || str === null) return "";
return String(str).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/"/g, """).replace(/'/g, "'");
}

// static routes
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
app.get("/docs", (req, res) => res.sendFile(path.join(__dirname, "public", "docs.html")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

// start
app.listen(PORT, () => {
console.log("Server started on port " + PORT);
console.log("Data directory: " + DATA_DIR);
});
[
{
"key": "stat",
"title": "Международная Олимпиада по статистике и прикладной математике",
"short": "Современные подходы к анализу данных и статистическим методам.",
"audience": "students",
"info": "Приглашаем вас принять участие в Международной Олимпиаде по Статистике — «Статистика будущего: искусство анализа данных!». Участники освоят современные методы обработки данных и получат сертификат или диплом.",
"questions": [
{ "q": "По формуле (∑p1q1)/(∑p0q1) рассчитывают общий индекс цен", "options": ["Эджворта-Маршалла", "Фишера", "Ласпейреса", "Пааше"], "correct": 3 },
{ "q": "Индекс, отражающий влияние уровня ставок по каждому кредиту на среднее изменение ставки — это индекс…", "options": ["Постоянного состава", "Структурных сдвигов", "Переменного состава", "Индивидуальный"], "correct": 0 },
{ "q": "В общем индексе цен Пааше в качестве весов используется…", "options": ["товарооборот отчетного периода", "индекс Фишера", "товарооборот базисного периода", "индекс Эджворта-Маршалла"], "correct": 0 },
{ "q": "Индекс, характеризующий изменение средней зарплаты за счет изменения зарплаты каждого работника — это индекс…", "options": ["Постоянного состава", "Произвольного состава", "Переменного состава", "Структурных сдвигов"], "correct": 0 },
{ "q": "Выборка называется малой, если ее объем менее…", "options": ["30", "40", "50", "100"], "correct": 0 }
]
},
{
"key": "fin",
"title": "Международная Олимпиада по финансовым вычислениям в банковском секторе",
"short": "Финансовое мастерство и точность расчётов для будущих профессионалов.",
"audience": "students",
"info": "Приглашаем вас принять участие в Международной Олимпиаде по финансовым вычислениям — «Финансовое мастерство: точность вычислений!». Участие даст практические навыки в финансовой математике и планировании денежных потоков.",
"questions": [
{ "q": "Фактор времени учитывается с помощью", "options": ["процентной ставки", "дисконта", "ренты", "конверсии"], "correct": 0 },
{ "q": "Процесс наращения — это…", "options": ["по исходной сумме найти ожидаемую", "по будущей сумме найти исходный долг", "норма дисконта", "расчет доходности"], "correct": 0 },
{ "q": "Процесс дисконтирования — это…", "options": ["по исходной сумме найти ожидаемую", "по будущей сумме найти исходный долг", "расчет доходности", "нет верного ответа"], "correct": 1 },
{ "q": "Чем выше конкуренция среди заемщиков…", "options": ["выше ставки по кредитам", "ниже ставки по кредитам", "хуже кредиторам", "зависимость отсутствует"], "correct": 0 },
{ "q": "Капитализация процентов — это…", "options": ["относительная величина дохода", "абсолютная величина дохода", "присоединение процентов к сумме", "все ответы верны"], "correct": 2 }
]
},
{
"key": "prob",
"title": "Международная Олимпиада «Применение Теории вероятностей в экономике»",
"short": "Стохастика, риски и принятие решений в экономике.",
"audience": "students",
"info": "Уважаемые студенты и молодые специалисты! Приглашаем принять участие в олимпиаде по теории вероятностей в экономике. Проверьте свои знания по стохастике, оценке рисков и моделированию.",
"questions": [
{ "q": "Что такое нормальное распределение?", "options": ["Нулевое значение риска", "Единичное отклонение риска", "Распределение Гаусса", "Положительная прибыль"], "correct": 2 },
{ "q": "Плотность вероятности — это…", "options": ["Условная доходность", "Полимодальная структура", "Двумерная функция", "Первая производная от функции распределения"], "correct": 3 },
{ "q": "Случайная экономическая величина — это…", "options": ["Критерий Фишера", "Теорема Пуассона", "Величина, полученная случайным процессом", "Формула Бернулли"], "correct": 2 },
{ "q": "Дискретная случайная величина — это…", "options": ["Заданная плотностью", "Равномерно распределённая на интервале", "Принимающая значения из конечного набора"], "correct": 2 },
{ "q": "Коэффициент корреляции r = 0 означает…", "options": ["Нет линейной связи", "Полная линейная зависимость", "Один индикатор независим", "Все индикаторы положительны"], "correct": 0 }
]
}
]
{
"paymentText": "За участие плата не взимается. Документы (диплом/сертификат) выдаются при оплате — 100 руб.",
"footerEmail": "naych_kooper@mail.ru
",
"footerText": "© 2025 Все права защищены.",
"backgrounds": {
"all": null,
"diploma_1": null,
"diploma_2": null,
"diploma_3": null,
"certificate": null,
"thanks": null
},
"legal": {
"termsTitle": "Пользовательское соглашение (публичная оферта)",
"termsText": "1. Общие положения. 1.1. Настоящее соглашение регулирует отношения между Организатором и Участником. 2. Участие: заполнение формы, регистрация, получение документов. 3. Ответственность: Организатор не несёт ответственности за ошибки, вызванные неверно указанными данными.",
"privacyTitle": "Политика конфиденциальности",
"privacyText": "Мы собираем ФИО, e-mail, учебное заведение и другие необходимые данные для оформления участия. Данные хранятся и не передаются третьим лицам без оснований."
}
}
[]
<!doctype html>

<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Олимпиады — Главная</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <header>
    <h1>Международные Олимпиады и Конкурсы</h1>
  </header>

  <main class="container">
    <section id="intro" class="card">
      <p id="paymentText">...</p>
    </section>

```
<section class="card">
  <input id="search" placeholder="Поиск мероприятия..." />
  <div id="events" class="events-grid"></div>
</section>

<section id="regPanel" class="card" style="display:none">
  <h3 id="regTitle">Регистрация</h3>
  <input id="fio" placeholder="ФИО" />
  <input id="email" placeholder="E-mail" />
  <input id="region" placeholder="Регион" />
  <input id="city" placeholder="Город" />
  <input id="school" placeholder="Учебное заведение" />
  <input id="supervisor" placeholder="Научный руководитель (ФИО, опционально)" />
  <div>
    <label><input id="agreeTerms" type="checkbox" /> Я прочитал(а) и согласен(на) с условиями</label>
  </div>
  <div>
    <button id="startTestBtn">Начать тест</button>
    <button id="payAndStartBtn" style="display:none">Оплатить документ и старт</button>
  </div>
</section>

<section id="testPanel" class="card" style="display:none">
  <h3 id="testTitle">Тест</h3>
  <div id="qBox"></div>
  <div class="row">
    <button id="prevQ">Назад</button>
    <button id="nextQ">Далее</button>
    <button id="finish" style="display:none">Завершить</button>
  </div>
</section>

<section id="resultPanel" class="card" style="display:none">
  <h3>Результат</h3>
  <p>Ваш результат: <b id="scoreText">0%</b></p>
  <div>
    <button id="downloadPdf">Скачать документ</button>
    <button id="downloadWithSup">Скачать с научным руководителем</button>
  </div>
</section>
```

  </main>

  <footer>
    <p>Почта: <a id="footerEmail" href="mailto:naych_kooper@mail.ru">naych_kooper@mail.ru</a></p>
  </footer>

  <script src="/js/main.js"></script>

</body>
</html>
<!doctype html>

<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Админка — Олимпиады</title>
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link rel="stylesheet" href="/css/admin.css" />
</head>
<body>
  <header>
    <h1>Админка</h1>
  </header>

  <main class="container">
    <section class="card">
      <h3>Вход (используются переменные окружения ADMIN_USER/ADMIN_PASS)</h3>
      <p>Для API-запросов используйте Basic Auth (логин/пароль).</p>
    </section>

```
<section class="card">
  <h3>Мероприятия</h3>
  <button id="reloadEvents">Загрузить</button>
  <div id="eventsList"></div>
  <button id="addEvent">Добавить мероприятие</button>
</section>

<section class="card">
  <h3>Фоны для PDF</h3>
  <select id="docType">
    <option value="all">all</option>
    <option value="diploma_1">diploma_1</option>
    <option value="diploma_2">diploma_2</option>
    <option value="diploma_3">diploma_3</option>
    <option value="certificate">certificate</option>
    <option value="thanks">thanks</option>
  </select>
  <input id="bgFile" type="file" accept="image/*" />
  <button id="uploadBg">Загрузить фон</button>
  <div id="bgStatus"></div>
</section>

<section class="card">
  <h3>Юридические тексты</h3>
  <input id="termsTitle" />
  <textarea id="termsText"></textarea>
  <input id="privacyTitle" />
  <textarea id="privacyText"></textarea>
  <button id="saveLegal">Сохранить</button>
</section>

<section class="card">
  <h3>Экспорт участников</h3>
  <button id="exportExcel">Скачать Excel</button>
</section>
```

  </main>

  <script src="/js/admin.js"></script>

</body>
</html>
/* main.js — логика для index.html (копировать как есть) */

async function $api(path, method = "GET", body = null) {
const opts = { method, headers: {} };
if (body) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
const res = await fetch("/api" + path, opts);
if (!res.ok) throw new Error("API error " + res.status);
return res.json();
}

let EVENTS = [];
let currentEvent = null;
let questions = [];
let qIndex = 0;
let answers = [];

async function loadSettings() {
try {
const s = await $api("/settings");
document.getElementById("paymentText").textContent = s.paymentText || "";
document.getElementById("footerEmail").textContent = s.footerEmail || "";
document.getElementById("footerEmail").href = "mailto:" + (s.footerEmail || "");
} catch (e) { console.error(e); }
}

async function loadEvents() {
try {
EVENTS = await $api("/events");
const el = document.getElementById("events");
el.innerHTML = "";
EVENTS.forEach(ev => {
const div = document.createElement("div");
div.className = "event-card";
div.innerHTML = "<h4>" + ev.title + "</h4><p>" + ev.short + "</p>";
const btnInfo = document.createElement("button"); btnInfo.textContent = "Подробнее";
btnInfo.onclick = () => openInfo(ev);
const btnReg = document.createElement("button"); btnReg.textContent = "Регистрация";
btnReg.onclick = () => openReg(ev);
div.appendChild(btnInfo); div.appendChild(btnReg);
el.appendChild(div);
});
} catch (e) { console.error(e); }
}

function openInfo(ev) {
alert(ev.info || "Нет дополнительной информации.");
}

function openReg(ev) {
currentEvent = ev;
document.getElementById("regPanel").style.display = "block";
document.getElementById("regTitle").textContent = "Регистрация: " + ev.title;
}

document.getElementById("startTestBtn")?.addEventListener("click", () => {
// gather form
const fio = document.getElementById("fio").value.trim();
const email = document.getElementById("email").value.trim();
if (!fio) { alert("Заполните ФИО"); return; }
const eventKey = currentEvent ? currentEvent.key : null;
// prepare questions
questions = currentEvent.questions || [];
answers = new Array(questions.length).fill(null);
qIndex = 0;
renderQuestion();
document.getElementById("testPanel").style.display = "block";
window.participantDraft = { fio, email, region: document.getElementById("region").value.trim(), city: document.getElementById("city").value.trim(), school: document.getElementById("school").value.trim(), supervisor: document.getElementById("supervisor").value.trim(), eventKey, title: currentEvent ? currentEvent.title : "" };
});

function renderQuestion() {
const qBox = document.getElementById("qBox");
const q = questions[qIndex];
if (!q) return;
qBox.innerHTML = "<p><b>" + (qIndex+1) + "/" + questions.length + "</b> " + q.q + "</p>";
q.options.forEach((opt, i) => {
const id = "opt_" + i;
const label = document.createElement("label");
label.className = "radio";
label.innerHTML = "<input type='radio' name='opt' value='" + i + "' /> <span>" + opt + "</span>";
qBox.appendChild(label);
});
document.getElementById("finish").style.display = (qIndex === questions.length - 1 ? "inline-block" : "none");
}

document.getElementById("nextQ")?.addEventListener("click", () => {
const sel = document.querySelector("input[name='opt']:checked");
if (!sel) { alert("Выберите ответ"); return; }
answers[qIndex] = parseInt(sel.value, 10);
if (qIndex < questions.length - 1) { qIndex++; renderQuestion(); }
});

document.getElementById("prevQ")?.addEventListener("click", () => { if (qIndex > 0) { qIndex--; renderQuestion(); } });

document.getElementById("finish")?.addEventListener("click", async () => {
const sel = document.querySelector("input[name='opt']:checked");
if (sel) answers[qIndex] = parseInt(sel.value, 10);
// calculate score
let correct = 0;
for (let i=0;i<questions.length;i++) if (answers[i] === questions[i].correct) correct++;
const score = Math.round(correct / questions.length * 100);
document.getElementById("scoreText").textContent = score + "%";
// prepare participant data
const draft = window.participantDraft || {};
const payload = Object.assign({}, draft, { score: score, date: new Date().toLocaleDateString("ru-RU") });
// save participant record first (server will also save when generating pdf)
try {
await fetch("/api/save-participant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
} catch (e) { console.warn("Could not save participant", e); }
document.getElementById("testPanel").style.display = "none";
document.getElementById("resultPanel").style.display = "block";
window.lastGeneratedData = payload;
});

document.getElementById("downloadPdf")?.addEventListener("click", async () => {
const data = window.lastGeneratedData;
if (!data) return alert("Нет данных для генерации");
const template = "auto";
const res = await fetch("/api/generate-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template, data }) });
if (!res.ok) return alert("Ошибка генерации PDF");
const blob = await res.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement("a"); a.href = url; a.download = "document.pdf"; a.click();
URL.revokeObjectURL(url);
});

document.getElementById("downloadWithSup")?.addEventListener("click", async () => {
const data = Object.assign({}, window.lastGeneratedData || {}, { includeSupervisor: true });
if (!data) return alert("Нет данных");
const res = await fetch("/api/generate-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template: "auto", data }) });
if (!res.ok) return alert("Ошибка генерации PDF");
const blob = await res.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement("a"); a.href = url; a.download = "document_with_supervisor.pdf"; a.click();
URL.revokeObjectURL(url);
});

// init
loadSettings();
loadEvents();
document.getElementById("search")?.addEventListener("input", (e) => {
const v = e.target.value.toLowerCase();
document.querySelectorAll(".event-card").forEach(card => {
card.style.display = card.textContent.toLowerCase().includes(v) ? "" : "none";
});
});
/* admin.js — простая админка, использует Basic Auth via fetch headers.
Для удобства здесь используется prompt() для ввода base64 token (можно заменить на UI) */

function basicAuthHeader() {
// admin provides base64 token via prompt OR you can set default in code (not recommended)
// Example: btoa('admin:adminpass')
const token = window.localStorage.getItem("adminBasic");
if (token) return "Basic " + token;
const got = prompt("Введите base64 token для Basic auth (btoa('user:pass')):");
if (!got) return null;
window.localStorage.setItem("adminBasic", got);
return "Basic " + got;
}

async function $api(path, method="GET", body=null, auth=true) {
const headers = {};
if (body) headers["Content-Type"] = "application/json";
if (auth) {
const h = basicAuthHeader();
if (!h) throw new Error("No auth");
headers["Authorization"] = h;
}
const res = await fetch("/api" + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
if (!res.ok) {
const txt = await res.text().catch(()=>"");
throw new Error("API error " + res.status + " " + txt);
}
try { return await res.json(); } catch (e) { return {}; }
}

async function reloadEvents() {
try {
const events = await $api("/events", "GET", null, false);
const el = document.getElementById("eventsList");
el.innerHTML = "";
events.forEach(ev => {
const row = document.createElement("div");
row.innerHTML = "<b>" + ev.title + "</b> <button data-key='" + ev.key + "' class='editEvent'>Edit</button> <button data-key='" + ev.key + "' class='delEvent'>Delete</button>";
el.appendChild(row);
});
} catch (e) { alert("Ошибка: " + e.message); }
}

document.getElementById("reloadEvents")?.addEventListener("click", reloadEvents);
document.getElementById("addEvent")?.addEventListener("click", async () => {
const title = prompt("Title:");
if (!title) return;
const key = prompt("Key (unique):", "evt-" + Date.now());
const short = prompt("Short description:");
// fetch existing events, append and save via admin auth
const events = await fetch("/api/events").then(r=>r.json()).catch(()=>[]);
events.push({ key, title, short, audience: "students", info: "", questions: [] });
try {
await $api("/events", "POST", events, true);
alert("Saved");
reloadEvents();
} catch (e) { alert("Save failed: " + e.message); }
});

document.getElementById("uploadBg")?.addEventListener("click", async () => {
const fileEl = document.getElementById("bgFile");
const docType = document.getElementById("docType").value;
if (!fileEl.files.length) return alert("Выберите файл");
const fd = new FormData();
fd.append("background", fileEl.files[0]);
fd.append("docType", docType);
const headers = {};
const h = basicAuthHeader();
if (!h) return alert("Нет авторизации");
headers["Authorization"] = h;
try {
const res = await fetch("/api/upload-background", { method: "POST", headers, body: fd });
const j = await res.json();
alert("OK: " + JSON.stringify(j));
} catch (e) { alert("Upload failed: " + e.message); }
});

document.getElementById("saveLegal")?.addEventListener("click", async () => {
const payload = { legal: { termsTitle: document.getElementById("termsTitle").value, termsText: document.getElementById("termsText").value, privacyTitle: document.getElementById("privacyTitle").value, privacyText: document.getElementById("privacyText").value } };
try {
await $api("/settings", "POST", payload, true);
alert("Saved");
} catch (e) { alert("Save failed: " + e.message); }
});

document.getElementById("exportExcel")?.addEventListener("click", () => {
const h = basicAuthHeader();
if (!h) return alert("No auth");
const link = "/api/export-participants";
fetch(link, { headers: { "Authorization": h } }).then(r => r.blob()).then(blob => {
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url; a.download = "participants.xlsx"; a.click();
URL.revokeObjectURL(url);
}).catch(e => alert("Export error: " + e.message));
});

// initial
reloadEvents();
/* Minimal styles for participants UI */
body{font-family:Inter, system-ui, Arial, sans-serif;margin:0;background:#f4f6fb;color:#1b365d}
header{background:#1b365d;color:#fff;padding:18px;text-align:center}
.container{max-width:1000px;margin:20px auto;padding:10px}
.card{background:#fff;padding:14px;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,.06);margin-bottom:12px}
.events-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.event-card{padding:12px;border-radius:8px;border:1px solid #e9eef8;background:#fff}
.event-card h4{margin:0 0 8px 0}
.row{display:flex;gap:8px;align-items:center}
input,textarea{width:100%;padding:8px;margin:6px 0;border-radius:8px;border:1px solid #e6eef7}
button{background:#1b365d;color:#fff;border:none;padding:8px 12px;border-radius:8px;cursor:pointer}
/* Admin styles */
body{font-family:Inter, Arial, sans-serif;margin:0;background:#eef2ff;color:#0f172a}
header{background:#0b3b66;color:#fff;padding:14px;text-align:center}
.container{max-width:1000px;margin:20px auto;padding:10px}
.card{background:#fff;padding:14px;border-radius:8px;margin-bottom:12px}
input,textarea,select{width:100%;padding:8px;margin:6px 0;border-radius:6px;border:1px solid #cbd5e1}
button{background:#0b3b66;color:#fff;padding:8px 10px;border-radius:6px;border:none}
