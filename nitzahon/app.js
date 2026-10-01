const CATEGORIES = [
  { id: "interpretation", label: "פרשנות חיובית", emoji: "💭" },
  { id: "tool", label: "שימוש בכלי", emoji: "🛠️" },
  { id: "hunger", label: "הקשבה לרעב-שובע", emoji: "🍽️" },
  { id: "impulse", label: "עצירה לפני דחף", emoji: "⏸️" },
  { id: "compassion", label: "חמלה עצמית", emoji: "💛" },
  { id: "social", label: "מצב חברתי / חג", emoji: "🎉" },
  { id: "other", label: "אחר", emoji: "✨" },
];

// בנק החיזוקים בסגנון יעל. בעתיד אפשר להחליף/להשלים ב-AI (שדה reinforcementSource)
const REINFORCEMENTS = {
  interpretation: [
    "פרשנות חיובית היא הדלת לכל הכלים - ואת בדיוק תרגלת אותה. כל הכבוד.",
    "זה עליות ומורדות, ואת לומדת לבחור איך להסתכל על זה. יאללה, ממשיכה ככה.",
    "את בונה זהות חדשה - יותר טובה מפעם קודמת. הרגע הזה הוא חלק מזה."
  ],
  tool: [
    "השתמשת בכלי ברגע האמת - בדיוק בשביל זה תרגלנו אותו. מאמינים בך.",
    "ככה שתיישמי יותר, ככה יהיה לך יותר טבעי ויותר קל. את בדרך הנכונה.",
    "כל פעם שנזכרת בכלי, את מחזקת את הביטחון שלך. יפה."
  ],
  hunger: [
    "הקשבה לגוף חייבת להגיע בכל רגע - ואת בדיוק עשית את זה עכשיו.",
    "לדעת לעצור בסולם הרעב-שובע זו מיומנות שדורשת תרגול, ואת מתרגלת אותה. כל הכבוד.",
    "זה בדיוק ההבדל בין להגיע רעבה מדי לבין להגיע מוכנה וברוגע. יאללה, את שם."
  ],
  impulse: [
    "החכו רגע עבד - נתת לעצמך את המרחב לבדוק אם זה חשק אמיתי או דחף רגעי. זה בדיוק זה.",
    "המרווח הקטן שיצרת לפני התגובה הוא בדיוק המקום שבו קורה השינוי.",
    "לא חייבים לעצור לגמרי - מספיק ליצור מרווח בחירה, ואת עשית את זה."
  ],
  compassion: [
    "עשית את כל מה שיכולת בצורה הכי טובה שיכולת. מכאן את נותנת לעולם לעשות את שלו.",
    "חמלה זה הכי חשוב. בחרת בה על פני ביקורת עצמית - וזה לא מובן מאליו.",
    "נפילה בודדת לא שווה ערך לכל התהליך שעשית עד עכשיו. את יודעת את זה, וגם חיה אותו עכשיו."
  ],
  social: [
    "לנווט ארוחה או אירוע חברתי מתוך מודעות זה אתגר אמיתי - וההצלחה שלך שם משמעותית מאוד.",
    "הגעת מוכנה, נשארת בבחירות מושכלות - זה בדיוק ההבדל שדיברנו עליו. כל הכבוד.",
    "זה לא הכל או כלום - אפילו סבב אחד מודע באירוע גדול הוא ניצחון."
  ],
  other: [
    "כל ניצחון שאת עוצרת לתעד הוא הוכחה שאת שמה לב לתהליך שלך. וזה עצמו כבר משהו.",
    "חמישה ניצחונות ביום, קטנים כגדולים - זה בדיוק מה שבונה את התהליך. יפה שעצרת בשביל זה.",
    "צעד קטן שנרשם הוא צעד שנחקק. ממשיכים ככה."
  ]
};

const WEEKDAYS_SUN_FIRST = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const MONTH_NAMES = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];

let victories = [];
let selectedCat = null;
let activeFilter = "all";

let calendarOpen = false;
let calMonth = new Date();
calMonth.setDate(1);
let pendingStart = null;
let pendingEnd = null;
let appliedStart = null;
let appliedEnd = null;

function catInfo(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// בוחר חיזוק מהבנק, ומשתדל לא לחזור על הקודם
function pickReinforcement(category, previous) {
  const arr = REINFORCEMENTS[category] || REINFORCEMENTS.other;
  const options = arr.length > 1 ? arr.filter(t => t !== previous) : arr;
  return options[Math.floor(Math.random() * options.length)];
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function renderChips() {
  const wrap = document.getElementById("catChips");
  wrap.innerHTML = "";
  CATEGORIES.forEach(cat => {
    const el = document.createElement("div");
    el.className = "chip" + (selectedCat === cat.id ? " selected" : "");
    el.textContent = cat.emoji + " " + cat.label;
    el.onclick = () => {
      selectedCat = selectedCat === cat.id ? null : cat.id;
      renderChips();
    };
    wrap.appendChild(el);
  });
}

function renderFilters() {
  const wrap = document.getElementById("filterRow");
  wrap.innerHTML = "";
  const allChip = document.createElement("div");
  allChip.className = "filter-chip" + (activeFilter === "all" ? " active" : "");
  allChip.textContent = "הכל";
  allChip.onclick = () => { activeFilter = "all"; renderFilters(); renderList(); };
  wrap.appendChild(allChip);

  CATEGORIES.forEach(cat => {
    const el = document.createElement("div");
    el.className = "filter-chip" + (activeFilter === cat.id ? " active" : "");
    el.textContent = cat.emoji + " " + cat.label;
    el.onclick = () => { activeFilter = cat.id; renderFilters(); renderList(); };
    wrap.appendChild(el);
  });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) +
    " · " + d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

function formatShort(d) {
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short" });
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(d) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d) { const x = new Date(d); x.setHours(23,59,59,999); return x; }

function updateDateFilterUI() {
  const btn = document.getElementById("dateFilterToggle");
  const label = document.getElementById("dateFilterLabel");
  const clearWrap = document.getElementById("dateClearWrap");
  clearWrap.innerHTML = "";
  if (appliedStart && appliedEnd) {
    btn.classList.add("active");
    label.textContent = sameDay(appliedStart, appliedEnd)
      ? formatShort(appliedStart)
      : formatShort(appliedStart) + " – " + formatShort(appliedEnd);
    const clearBtn = document.createElement("button");
    clearBtn.className = "date-clear";
    clearBtn.textContent = "נקה";
    clearBtn.onclick = (e) => { e.stopPropagation(); clearDateFilter(); };
    clearWrap.appendChild(clearBtn);
  } else {
    btn.classList.remove("active");
    label.textContent = "סינון לפי תאריך";
  }
}

function toggleCalendar() {
  calendarOpen = !calendarOpen;
  if (calendarOpen) {
    pendingStart = appliedStart;
    pendingEnd = appliedEnd;
    const base = appliedStart || new Date();
    calMonth = new Date(base.getFullYear(), base.getMonth(), 1);
  }
  renderCalendarPanel();
}

function changeMonth(delta) {
  calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + delta, 1);
  renderCalendarPanel();
}

function pickDay(dateObj) {
  if (!pendingStart || (pendingStart && pendingEnd)) {
    pendingStart = dateObj;
    pendingEnd = null;
  } else if (dateObj < pendingStart) {
    pendingEnd = pendingStart;
    pendingStart = dateObj;
  } else {
    pendingEnd = dateObj;
  }
  renderCalendarPanel();
}

function applyDateFilter() {
  if (pendingStart) {
    appliedStart = startOfDay(pendingStart);
    appliedEnd = endOfDay(pendingEnd || pendingStart);
  } else {
    appliedStart = null;
    appliedEnd = null;
  }
  calendarOpen = false;
  renderCalendarPanel();
  updateDateFilterUI();
  renderList();
}

function clearDateFilter() {
  appliedStart = appliedEnd = pendingStart = pendingEnd = null;
  calendarOpen = false;
  renderCalendarPanel();
  updateDateFilterUI();
  renderList();
}

function renderCalendarPanel() {
  const panel = document.getElementById("calendarPanel");
  if (!calendarOpen) {
    panel.style.display = "none";
    panel.innerHTML = "";
    return;
  }
  panel.style.display = "block";

  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const startWeekday = new Date(year, month, 1).getDay(); // 0 = יום ראשון
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const daysWithEntries = new Set(victories.map(v => new Date(v.date).toDateString()));

  // ב-RTL הכפתור הימני הוא "אחורה" (חודש קודם)
  let html = `<div class="calendar-panel"><div class="cal-header">
    <button type="button" data-month="-1" aria-label="חודש קודם">›</button>
    <div class="cal-title">${MONTH_NAMES[month]} ${year}</div>
    <button type="button" data-month="1" aria-label="חודש הבא">‹</button>
  </div>
  <div class="cal-grid">`;

  WEEKDAYS_SUN_FIRST.forEach(w => { html += `<div class="cal-weekday">${w}</div>`; });
  for (let i = 0; i < startWeekday; i++) html += `<div class="cal-day empty"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const thisDate = new Date(year, month, day);
    let cls = "cal-day";
    if (sameDay(thisDate, today)) cls += " today";
    if (daysWithEntries.has(thisDate.toDateString())) cls += " has-entry";
    if (pendingStart && sameDay(thisDate, pendingStart)) cls += " range-edge";
    else if (pendingEnd && sameDay(thisDate, pendingEnd)) cls += " range-edge";
    else if (pendingStart && pendingEnd && thisDate > pendingStart && thisDate < pendingEnd) cls += " in-range";
    html += `<div class="${cls}" data-day="${day}">${day}</div>`;
  }
  html += `</div>`;

  let hint = "בחרי תאריך התחלה, ואז תאריך סיום (או אותו תאריך שוב ליום בודד)";
  if (pendingStart && !pendingEnd) hint = "עכשיו בחרי תאריך סיום (או לחצי שוב על אותו יום)";
  html += `<div class="cal-hint">${hint}</div>`;
  html += `<div class="cal-actions">
    <button type="button" class="cal-cancel">ביטול</button>
    <button type="button" class="cal-apply">החלת סינון</button>
  </div></div>`;

  panel.innerHTML = html;
  panel.querySelectorAll("[data-month]").forEach(b => b.onclick = () => changeMonth(Number(b.dataset.month)));
  panel.querySelectorAll(".cal-day[data-day]").forEach(d => d.onclick = () => pickDay(new Date(year, month, Number(d.dataset.day))));
  panel.querySelector(".cal-cancel").onclick = toggleCalendar;
  panel.querySelector(".cal-apply").onclick = applyDateFilter;
}

function startOfWeekSunday(d) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function renderStats() {
  const statsWrap = document.getElementById("stats");
  const total = victories.length;
  const weekStart = startOfWeekSunday(new Date()).getTime();
  const thisWeek = victories.filter(v => new Date(v.date).getTime() >= weekStart).length;

  // רצף ימים: אם עוד לא נרשם ניצחון היום, הרצף של אתמול עדיין נחשב
  const dates = new Set(victories.map(v => new Date(v.date).toDateString()));
  let streak = 0;
  const cursor = new Date();
  if (!dates.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  statsWrap.innerHTML = `
    <div class="stat-box"><div class="stat-num">${total}</div><div class="stat-label">סה״כ ניצחונות</div></div>
    <div class="stat-box"><div class="stat-num">${thisWeek}</div><div class="stat-label">השבוע</div></div>
    <div class="stat-box"><div class="stat-num">${streak}</div><div class="stat-label">רצף ימים</div></div>
  `;
}

function renderList() {
  const list = document.getElementById("list");
  let filtered = activeFilter === "all" ? victories : victories.filter(v => v.category === activeFilter);

  if (appliedStart && appliedEnd) {
    filtered = filtered.filter(v => {
      const t = new Date(v.date).getTime();
      return t >= appliedStart.getTime() && t <= appliedEnd.getTime();
    });
  }

  const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (sorted.length === 0) {
    list.className = "empty-state";
    list.innerHTML = victories.length === 0
      ? `עוד אין כאן ניצחונות.<br>כל התחלה קטנה נחשבת 🌱`
      : `אין ניצחונות שתואמים את הסינון.<br>כל התחלה קטנה נחשבת 🌱`;
    return;
  }

  list.className = "";
  list.innerHTML = "";
  sorted.forEach(v => {
    const c = catInfo(v.category);
    const el = document.createElement("div");
    el.className = "entry";
    el.innerHTML = `
      <button class="entry-del" type="button" aria-label="מחיקה">✕</button>
      <div class="entry-cat"></div>
      <div class="entry-text"></div>
      <div class="entry-date"></div>
      <div class="reinforcement">
        <span class="reinforcement-text"></span>
        <button class="reinforcement-refresh" type="button" title="חיזוק אחר">🔄</button>
      </div>`;
    el.querySelector(".entry-cat").textContent = c.emoji + " " + c.label;
    el.querySelector(".entry-text").textContent = v.text;
    el.querySelector(".entry-date").textContent = formatDate(v.date);
    el.querySelector(".reinforcement-text").textContent = "💚 " + (v.reinforcement || "");
    el.querySelector(".entry-del").onclick = () => deleteVictory(v.id);
    el.querySelector(".reinforcement-refresh").onclick = () => regenerateReinforcement(v.id);
    list.appendChild(el);
  });
}

async function loadVictories() {
  try {
    victories = await db.getAll("victories");
  } catch (e) {
    console.error("load error", e);
    victories = [];
    toast("לא הצלחתי לטעון את הניצחונות");
  }
  renderStats();
  renderList();
}

async function saveVictory(v) {
  try {
    await db.put("victories", v);
    return true;
  } catch (e) {
    console.error("save error", e);
    toast("השמירה לא הצליחה");
    return false;
  }
}

async function addVictory() {
  const textEl = document.getElementById("entryText");
  const text = textEl.value.trim();
  if (!text) { textEl.focus(); return; }

  const btn = document.getElementById("addBtn");
  btn.disabled = true;

  const category = selectedCat || "other";
  const newEntry = {
    id: newId(),
    text,
    category,
    date: new Date().toISOString(),
    reinforcement: pickReinforcement(category),
    reinforcementSource: "bank",
  };
  if (await saveVictory(newEntry)) {
    victories.push(newEntry);
    textEl.value = "";
    selectedCat = null;
    renderChips();
    renderStats();
    renderList();
  }
  btn.disabled = false;
}

async function regenerateReinforcement(id) {
  const v = victories.find(x => x.id === id);
  if (!v) return;
  v.reinforcement = pickReinforcement(v.category, v.reinforcement);
  v.reinforcementSource = "bank";
  await saveVictory(v);
  renderList();
}

async function deleteVictory(id) {
  if (!confirm("למחוק את הניצחון הזה?")) return;
  try {
    await db.delete("victories", id);
    victories = victories.filter(v => v.id !== id);
  } catch (e) {
    console.error("delete error", e);
    toast("המחיקה לא הצליחה");
  }
  renderStats();
  renderList();
}

// ---------- גיבוי: ייצוא וייבוא ----------
async function exportBackup() {
  try {
    const data = { app: "bounce-nitzahon", version: 1, exportedAt: new Date().toISOString() };
    for (const store of db.stores) data[store] = await db.getAll(store);
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const name = `גיבוי-ניצחונות-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([blob], name, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }); return; }
      catch (e) { if (e.name === "AbortError") return; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  } catch (e) {
    console.error("export error", e);
    toast("הייצוא לא הצליח");
  }
}

async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== "bounce-nitzahon") throw new Error("wrong app");
    let count = 0;
    for (const store of db.stores) {
      for (const item of (data[store] || [])) { await db.put(store, item); count++; }
    }
    toast(`יובאו ${count} ניצחונות`);
    await loadVictories();
  } catch (e) {
    console.error("import error", e);
    toast("הקובץ הזה לא נראה כמו גיבוי של רשימת הניצחונות");
  }
}

// ייבוא חד-פעמי מהפרוטוטייפ הישן: אם יש מערך ניצחונות בפורמט הישן (victories-list)
// אפשר להדביק אותו כקובץ JSON רגיל - מערך של {id,text,category,date,reinforcement}
async function importLegacyArray(arr) {
  for (const v of arr) {
    if (!v || !v.text) continue;
    await db.put("victories", {
      id: v.id || newId(),
      text: v.text,
      category: v.category || "other",
      date: v.date || new Date().toISOString(),
      reinforcement: v.reinforcement || pickReinforcement(v.category),
      reinforcementSource: v.reinforcement ? "legacy" : "bank",
    });
  }
}

document.getElementById("addBtn").onclick = addVictory;
document.getElementById("dateFilterToggle").onclick = toggleCalendar;
document.getElementById("export-btn").onclick = exportBackup;
document.getElementById("import-btn").onclick = () => document.getElementById("import-file").click();
document.getElementById("import-file").onchange = async (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  // תמיכה גם במערך בפורמט של הפרוטוטייפ הישן
  try {
    const parsed = JSON.parse(await f.text());
    if (Array.isArray(parsed)) {
      await importLegacyArray(parsed);
      toast(`יובאו ${parsed.length} ניצחונות`);
      await loadVictories();
      return;
    }
  } catch (err) { /* ממשיכים לייבוא הרגיל, שיציג הודעת שגיאה */ }
  importBackup(f);
};

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(e => console.error("sw error", e));
}

renderChips();
renderFilters();
updateDateFilterUI();
loadVictories();
