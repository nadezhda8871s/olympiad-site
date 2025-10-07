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
