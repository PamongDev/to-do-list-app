// ===== TODO APP (vanilla JS) =====
const KEY = "todoTasks";
const $ = (id) => document.getElementById(id);
let tasks = loadTasks(), lastAdded = null, snapshot = null, toastTimer;

const pages = { home: $("home-page"), done: $("done-page"), add: $("add-task-page"), overdue: $("overdue-page"), profile: $("profile-page") };
const NAV = ["home", "done", "add", "overdue", "profile"];
const taskForm = $("task-form"), taskInput = $("task-input"), dueInput = $("due-date");
const pill = $("nav-pill");

const PRI = {
  low:    { label: "Low",    cls: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
  medium: { label: "Medium", cls: "bg-blue-50 text-blue-600",    dot: "bg-blue-400" },
  high:   { label: "High",   cls: "bg-rose-50 text-rose-500",    dot: "bg-rose-400" }
};
const TICK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>';
const TRASH = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';

// ===== STORAGE =====
function loadTasks() {
  const s = localStorage.getItem(KEY);
  if (s) { try { return JSON.parse(s); } catch (e) { return []; } }
  const at = (d, h = 9) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, 0, 0, 0); return x.toISOString(); };
  const mk = (title, priority, createdAt, dueAt, completedAt) => ({ id: crypto.randomUUID(), title, priority, createdAt, dueAt, completed: !!completedAt, completedAt: completedAt || null });
  return [ // demo data, delete when submitting
    mk("Review JavaScript basics", "high", at(-2), at(-1)),
    mk("Finish mission UI", "medium", at(0, 8), at(1)),
    mk("Push project to GitHub", "low", at(-3), at(-1), at(-1, 14)),
    mk("Read Tailwind docs", "low", at(-4), at(-2), at(-2, 10)),
    mk("Fix navbar bug", "medium", at(-3), at(0), at(-3, 16))
  ];
}
const save = () => localStorage.setItem(KEY, JSON.stringify(tasks));

// ===== HELPERS =====
const isOverdue = (t) => !t.completed && new Date(t.dueAt) < new Date();
const pending = () => tasks.filter((t) => !t.completed);
const done = () => tasks.filter((t) => t.completed);
const overdue = () => tasks.filter(isOverdue);
const esc = (s) => { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; };
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

function fmt(d) {
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short" }) + ", " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function dueLabel(t) {
  const due = new Date(t.dueAt);
  if (t.completed) return "Due " + fmt(due);
  const diff = due - Date.now(), a = Math.abs(diff);
  const m = Math.max(1, Math.round(a / 6e4)), h = Math.round(a / 36e5), d = Math.round(a / 864e5);
  const s = m < 60 ? m + "m" : h < 48 ? h + "h" : d + "d";
  return (diff < 0 ? s + " overdue" : "Due in " + s) + " · " + fmt(due);
}
function toInput(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function quickDue(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(days === 0 ? 18 : 9, 0, 0, 0);
  if (d < new Date()) d.setTime(Date.now() + 36e5);
  dueInput.value = toInput(d);
}

// ===== CHART PIECES =====
// Donut / ring. segs = [{v, c}], max = optional denominator.
function donut(size, sw, segs, max) {
  const r = (100 - sw) / 2, C = 2 * Math.PI * r;
  const live = segs.filter((s) => s.v > 0), tot = max || live.reduce((a, s) => a + s.v, 0);
  let out = `<circle cx="50" cy="50" r="${r}" fill="none" stroke="#E6ECF6" stroke-width="${sw}" ${tot ? "" : 'stroke-dasharray="2 8" stroke-linecap="round"'}/>`;
  let off = 0;
  const gap = live.length > 1 ? sw * 1.15 : 0;
  if (tot) live.forEach((s) => {
    const len = (s.v / tot) * C;
    out += `<circle class="arc" cx="50" cy="50" r="${r}" fill="none" stroke="${s.c}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${Math.max(0.1, len - gap)} ${C}" stroke-dashoffset="${-(off + gap / 2)}" transform="rotate(-90 50 50)"/>`;
    off += len;
  });
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}">${out}</svg>`;
}

// Smooth area chart of tasks completed per day (last 7 days)
function weekChart() {
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d; });
  const vals = days.map((d) => tasks.filter((t) => t.completedAt && new Date(t.completedAt).toDateString() === d.toDateString()).length);
  const total = vals.reduce((a, b) => a + b, 0), ymax = Math.max(3, ...vals);
  const X = (i) => 20 + i * 43.3, Y = (v) => 88 - (v / ymax) * 64;
  let line = `M${X(0)} ${Y(vals[0])}`;
  for (let i = 1; i < 7; i++) { const mx = (X(i - 1) + X(i)) / 2; line += ` C${mx} ${Y(vals[i - 1])},${mx} ${Y(vals[i])},${X(i)} ${Y(vals[i])}`; }
  const labels = days.map((d, i) => `<text x="${X(i)}" y="112" text-anchor="middle" font-size="9.5" font-weight="${i === 6 ? 700 : 500}" fill="${i === 6 ? "#2563EB" : "#94A3B8"}">${d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2)}</text>`).join("");
  const base = `<line x1="8" y1="88" x2="292" y2="88" stroke="#E6ECF6" stroke-width="1" ${total ? "" : 'stroke-dasharray="3 5"'}/>`;
  const svg = total
    ? `<svg viewBox="0 0 300 120" class="w-full">${base}<path class="area" d="${line} L${X(6)} 88 L${X(0)} 88Z" fill="url(#gFill)"/><path class="arc" d="${line}" fill="none" stroke="url(#gB)" stroke-width="3" stroke-linecap="round"/>${vals.map((v, i) => v ? `<circle cx="${X(i)}" cy="${Y(v)}" r="4" fill="#fff" stroke="#4F7DF3" stroke-width="2.5"/>` : "").join("")}${labels}</svg>`
    : `<svg viewBox="0 0 300 120" class="w-full">${base}${labels}<text x="150" y="56" text-anchor="middle" font-size="11" fill="#94A3B8">Finish a task to see your week</text></svg>`;
  return { svg, total };
}

// ===== RENDER =====
function card(t) {
  const p = PRI[t.priority] || PRI.low, od = isOverdue(t);

  return `<div class="task-wrap${t.id === lastAdded ? " card-in" : ""}" data-id="${t.id}">
  <article class="flex items-start gap-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-100">
    <button type="button" onclick="toggleTask('${t.id}')" aria-label="Toggle done" class="chk ${t.completed ? "checked" : ""}">${TICK}</button>
    <div class="min-w-0 flex-1">
      <p class="break-words text-[14px] font-semibold leading-snug ${t.completed ? "text-slate-400 line-through" : "text-slate-800"}">${esc(t.title)}</p>
      <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
        <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${p.cls}"><i class="h-1.5 w-1.5 rounded-full ${p.dot}"></i>${p.label}</span>
        <span class="${od ? "font-semibold text-rose-500" : "text-slate-400"}">${dueLabel(t)}</span>
      </div>
    </div>
    <button type="button" onclick="deleteTask('${t.id}')" aria-label="Delete task" class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-300 transition hover:bg-rose-50 hover:text-rose-400 active:scale-90">${TRASH}</button>
  </article></div>`;
}

function empty(icon, title, sub, cta) {
  return `<div class="relative overflow-hidden rounded-[32px] bg-white/70 px-6 py-10 text-center ring-1 ring-slate-100">
    <div class="absolute -top-10 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-sky-100 blur-2xl"></div>
    <div class="relative mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 text-blue-500 ring-8 ring-white">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</svg></div>
    <p class="relative text-sm font-bold">${title}</p>
    <p class="relative mx-auto mt-1 max-w-[230px] text-xs leading-relaxed text-slate-400">${sub}</p>
    ${cta ? `<button type="button" onclick="showAddTask()" class="relative mt-5 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-float active:scale-95">Add a task</button>` : ""}</div>`;
}
const I = { plus: '<path d="M12 5v14M5 12h14"/>', check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>' };

function renderHero() {
  const total = tasks.length, d = done().length, od = overdue().length, left = pending().length;
  const pct = total ? Math.round((d / total) * 100) : 0;
  let title, sub;
  if (!total) { title = "A fresh start"; sub = "Add your first task and get moving."; }
  else if (d === total) { title = "All done!"; sub = "Everything is checked off. Nice work."; }
  else if (od) { title = "Catch up first"; sub = `${plural(od, "task")} past the deadline.`; }
  else { title = pct >= 50 ? "Almost there" : "Keep going"; sub = `${plural(left, "task")} left to finish.`; }
  const stat = (n, l, c) => `<div class="flex-1 text-center"><p class="text-base font-bold ${c}">${n}</p><p class="text-[10px] text-slate-400">${l}</p></div>`;
  $("hero").innerHTML = `<div class="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-white via-sky-50 to-indigo-100 p-5 shadow-soft ring-1 ring-white">
    <div class="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-sky-200/50 blur-2xl"></div>
    <div class="relative flex items-center justify-between gap-4">
      <div><h2 class="text-xl font-extrabold tracking-tight">${title}</h2><p class="mt-1 max-w-[180px] text-xs leading-relaxed text-slate-500">${sub}</p></div>
      <div class="relative shrink-0">${donut(88, 9, [{ v: d, c: "url(#gB)" }], total)}<span class="absolute inset-0 grid place-items-center text-sm font-extrabold text-blue-600">${pct}%</span></div>
    </div>
    <div class="relative mt-5 flex divide-x divide-white/80 rounded-full bg-white/60 py-2.5 backdrop-blur">${stat(total, "Tasks", "text-slate-700")}${stat(d, "Done", "text-blue-600")}${stat(od, "Overdue", od ? "text-rose-500" : "text-slate-400")}</div></div>`;
}

function renderList(el, list, emptyHtml) { $(el).innerHTML = list.length ? list.map(card).join("") : emptyHtml; }

function renderAll() {
  const p = pending(), od = overdue();
  renderHero();
  $("pending-chip").textContent = p.length;
  $("delete-all-button").classList.toggle("hidden", !tasks.length);
  renderList("todo-list", p, tasks.length
    ? empty(I.sun, "All clear for now", "Every task is done. Take a break or add a new one.", true)
    : empty(I.plus, "No tasks yet", "Write down what you need to do and set a deadline.", true));
  renderList("done-list", done(), empty(I.check, "Nothing finished yet", "Tasks you complete will show up here."));
  renderList("overdue-list", od, empty(I.sun, "No overdue tasks", "You're on schedule. Keep it up!"));
  $("overdue-banner").innerHTML = od.length ? `<div class="rounded-[28px] bg-gradient-to-br from-rose-50 to-orange-50 px-5 py-4 ring-1 ring-rose-100"><p class="text-lg font-extrabold">${plural(od.length, "task")} overdue</p><p class="mt-0.5 text-xs text-slate-500">Finish them or move the deadline.</p></div>` : "";
  $("nav-dot").classList.toggle("hidden", !od.length);
  renderProfile();
  lastAdded = null;
}

function renderProfile() {
  const total = tasks.length, d = done().length, od = overdue().length, pd = pending().length - od;
  const pct = total ? Math.round((d / total) * 100) : 0;
  const week = weekChart();
  const leg = (c, l, n) => `<div class="flex items-center gap-2 text-xs"><i class="h-2.5 w-2.5 rounded-full" style="background:${c}"></i><span class="flex-1 text-slate-500">${l}</span><b>${n}</b></div>`;
  const pend = pending(), mx = Math.max(1, ...["low", "medium", "high"].map((k) => pend.filter((t) => t.priority === k).length));
  const bars = ["high", "medium", "low"].map((k) => {
    const n = pend.filter((t) => t.priority === k).length, g = { high: "#FB7185", medium: "#60A5FA", low: "#94A3B8" }[k];
    return `<div><div class="mb-1 flex justify-between text-xs"><span class="text-slate-500">${PRI[k].label}</span><b>${n}</b></div><div class="h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full transition-all duration-700" style="width:${(n / mx) * 100}%;background:${g}"></div></div></div>`;
  }).join("");
  $("profile-body").innerHTML = `
  <div class="relative overflow-hidden rounded-[36px] bg-gradient-to-br from-sky-100 via-white to-indigo-100 p-5 shadow-soft ring-1 ring-white">
    <div class="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-indigo-200/40 blur-2xl"></div>
    <div class="relative flex items-center gap-4">
      <div class="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-lg font-bold text-white ring-4 ring-white">MF</div>
      <div><h2 class="text-lg font-extrabold tracking-tight">Muhamad Fahmi Ammar</h2><p class="text-xs font-medium text-blue-600">Full-stack Developer</p><p class="mt-1 text-[11px] text-slate-400">johndoe@example.com</p><p class="text-[11px] text-slate-400">Member since January 1, 2023</p></div>
    </div></div>

  <div class="rounded-[32px] bg-white p-5 shadow-soft ring-1 ring-slate-100">
    <p class="mb-4 text-sm font-bold">Your progress</p>
    <div class="flex items-center gap-5">
      <div class="relative shrink-0">${donut(124, 11, [{ v: d, c: "url(#gB)" }, { v: pd, c: "#BFDBFE" }, { v: od, c: "#FDA4AF" }])}
        <div class="absolute inset-0 grid place-items-center text-center"><div><p class="text-2xl font-extrabold leading-none">${total ? pct + "%" : "–"}</p><p class="mt-1 text-[10px] text-slate-400">${total ? "completed" : "no data"}</p></div></div></div>
      <div class="flex-1 space-y-3">${leg("#4F7DF3", "Completed", d)}${leg("#BFDBFE", "Pending", pd)}${leg("#FDA4AF", "Overdue", od)}</div>
    </div></div>

  <div class="rounded-[32px] bg-white p-5 shadow-soft ring-1 ring-slate-100">
    <div class="mb-2 flex items-end justify-between"><p class="text-sm font-bold">This week</p><p class="text-xs text-slate-400">${plural(week.total, "task")} completed</p></div>${week.svg}</div>

  <div class="rounded-[32px] bg-white p-5 shadow-soft ring-1 ring-slate-100">
    <p class="mb-4 text-sm font-bold">Pending by priority</p><div class="space-y-3.5">${bars}</div>
    ${pend.length ? "" : '<p class="mt-4 text-center text-xs text-slate-400">Nothing pending right now.</p>'}</div>`;
}

// ===== NAVIGATION =====
function movePill(name) {
  if (name === "add") return pill.classList.add("off");   // Add: pill hilang, cukup ganti warna tombol
  const x = `translateX(${NAV.indexOf(name) * 100}%)`;
  if (pill.classList.contains("off")) {                    // muncul lagi: loncat tanpa animasi, lalu fade in
    pill.classList.add("no-anim");
    pill.style.transform = x;
    void pill.offsetWidth;
    pill.classList.remove("no-anim", "off");
  } else pill.style.transform = x;
}

function go(name) {
  // sudah di form Add → klik lagi tidak melakukan apa-apa (form tidak ke-reset)
  if (name === "add" && !pages.add.classList.contains("hidden")) return;
  NAV.forEach((n) => pages[n].classList.toggle("hidden", n !== name));
  renderAll();
  document.querySelectorAll(".nav-button").forEach((b) => b.classList.toggle("active", b.dataset.nav === name));
  movePill(name);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
const showHome = () => go("home"), showDone = () => go("done"), showOverdue = () => go("overdue"), showProfile = () => go("profile");
function showAddTask() { go("add"); setTimeout(() => taskInput.focus(), 250); }

// ===== MOTION + ACTIONS =====
function animateOut(id, cb) {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) return cb();
  const main = document.querySelector("main");
  main.style.minHeight = main.offsetHeight + "px";   // tahan tinggi halaman selama animasi
  el.style.maxHeight = el.offsetHeight + "px";
  void el.offsetHeight;
  el.classList.add("card-out");
  setTimeout(() => {
    cb();
    requestAnimationFrame(() => (main.style.minHeight = ""));   // lepas sekali, tanpa animasi
  }, 340);
}

function toggleTask(id) {
  const t = tasks.find((x) => x.id === id);
  if (!t) return;
  const btn = document.querySelector(`[data-id="${id}"] .chk`);
  if (btn) btn.classList.toggle("checked", !t.completed);
  setTimeout(() => animateOut(id, () => {
    t.completed = !t.completed;
    t.completedAt = t.completed ? new Date().toISOString() : null;
    save(); renderAll();
  }), 280);
}

function deleteTask(id) {
  snapshot = JSON.parse(JSON.stringify(tasks));
  animateOut(id, () => { tasks = tasks.filter((t) => t.id !== id); save(); renderAll(); toast("Task deleted"); });
}

$("delete-all-button").addEventListener("click", () => {
  if (!tasks.length || !confirm("Delete all tasks?")) return;
  snapshot = JSON.parse(JSON.stringify(tasks));
  tasks = []; save(); renderAll(); toast("All tasks deleted");
});

function toast(msg) {
  $("toast-msg").textContent = msg;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 4000);
}
function undo() {
  if (!snapshot) return;
  tasks = snapshot; snapshot = null; save(); renderAll();
  $("toast").classList.remove("show");
}

// ===== FORM =====
taskInput.addEventListener("input", () => { $("character-count").textContent = `${taskInput.value.length}/200`; });

taskForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title || !dueInput.value) return taskInput.focus();
  const t = {
    id: crypto.randomUUID(), title,
    priority: document.querySelector('input[name="priority"]:checked').value,
    createdAt: new Date().toISOString(), dueAt: new Date(dueInput.value).toISOString(),
    completed: false, completedAt: null
  };
  tasks.unshift(t); save();
  taskForm.reset();
  $("low").checked = true; quickDue(1);
  $("character-count").textContent = "0/200";
  lastAdded = t.id;
  showHome();
});

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  const h = new Date().getHours();
  $("greeting").textContent = h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
  $("today-date").textContent = new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
  quickDue(1);
  showHome();
});