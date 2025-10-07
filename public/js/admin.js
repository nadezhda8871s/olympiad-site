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
