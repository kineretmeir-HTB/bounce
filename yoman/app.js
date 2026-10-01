// ---------- מבנה רשומה ----------
// entries: {
//   id, createdAt, updatedAt, eatenAt,
//   status: 'draft' | 'done'        - טיוטה = עוד לא מילאתי את "אחרי"
//   photoId, afterPhotoId            - תמונת הצלחת לפני / אחרי (מה נשאר)
//   hunger | null, notHungry: bool
//   source: null | 'craving' | 'urge' | 'emotion' | 'habit' | 'fomo'  - כשלא רעבה
//   details: {...}                   - השאלות הרפלקטיביות של כל מקור (ראו SOURCES)
//   craving | null, tools: [], decision: null | 'eat' | 'skip'
//   fullness | null, satisfaction | null
//   note, reflection
//   ai: null                         - לשלב 3 (תגובה חמה ושאלה בהשראת אפר"ת)
// }
// photos: {id, blob, thumb, createdAt} - נפרד מהרשומות כדי שהרשימה תיטען מהר

const $ = (id) => document.getElementById(id);

// ---------- תוכן מהתכנית: "כמה באמת בא לי?" ----------
const CRAVING_TEXT = {
  1: 'כמעט לא בא לי, פשוט יודעת שזה טעים.',
  3: 'יהיה נחמד, אבל גם בלי זה אני סבבה.',
  5: 'יש חשק עדין ואני כן רוצה אותו עכשיו.',
  7: 'ממש בא לי דווקא את הדבר הספציפי הזה.',
  9: 'וואו, ממש ממש בא לי אותו עכשיו 🤤',
};
const SATISFACTION_TEXT = {
  1: 'כמעט לא סופקתי, החשק עדיין ממש נמצא.',
  3: 'קיבלתי קצת, אבל עדיין חסר לי משהו.',
  5: 'די סופקתי, אבל עדיין יש רצון להמשיך.',
  7: 'אני מסופקת והחשק כבר ירד משמעותית.',
  9: 'קיבלתי בדיוק את החוויה שרציתי, סופקתי לגמרי.',
};
function pairText(table, v) {
  if (v == null) return '';
  const k = Math.floor(v) % 2 === 0 ? Math.floor(v) - 1 : Math.floor(v);
  return table[k] || '';
}

// מאיפה הרצון מגיע (כשלא רעבה), ומה שואלים על כל אחד
const SOURCES = [
  { id: 'craving', label: 'חשק',
    hint: 'בא לי משהו ספציפי, ואני רוצה לבדוק כמה.',
    fields: [{ key: 'what', type: 'text', label: 'על מה החשק?', placeholder: 'שוקולד, קרמבו, גלידה...' }] },
  { id: 'urge', label: 'דחף',
    hint: 'משהו שלא היה קודם והגיע ברגע. אפשר לעשות חכו רגע ולראות אם נשאר או חולף.',
    fields: [
      { key: 'triggers', type: 'multi', label: 'מה עורר אותו?', options: ['ראיתי', 'הרחתי', 'מישהו הציע', 'עברתי ליד', 'פרסומת / מסך'] },
      { key: 'afterWait', type: 'single', label: 'אחרי חכו רגע', options: ['הדחף נשאר', 'הדחף חלף', 'לא חיכיתי'] },
    ] },
  { id: 'emotion', label: 'רגש',
    hint: 'לבדוק אם המטרה היא שהאוכל ישנה לי את הרגש.',
    fields: [
      { key: 'feelings', type: 'multi', label: 'מה אני מרגישה?', options: ['עצב', 'לחץ', 'שעמום', 'עייפות', 'חיפוש נחמה', 'כעס', 'בדידות'] },
      { key: 'hope', type: 'text', label: 'מה אני מקווה שהאוכל ישנה?', placeholder: 'שארגיש...' },
    ] },
  { id: 'habit', label: 'הרגל',
    hint: 'רצף מוכר: סיימתי ארוחה, הכנתי קפה...',
    fields: [
      { key: 'context', type: 'multi', label: 'מה הרצף?', options: ['אחרי ארוחה', 'עם קפה / תה', 'מול מסך', 'בדרך הביתה', 'לפני שינה'] },
      { key: 'real', type: 'single', label: 'באמת בא לי, או רצף מוכר?', options: ['באמת בא לי', 'רצף מוכר', 'לא בטוחה'] },
    ] },
  { id: 'fomo', label: 'FOMO',
    hint: 'פחד לפספס.',
    fields: [
      { key: 'context', type: 'multi', label: 'מה קורה?', options: ['כולם אוכלים', 'אירוע / חגיגה', 'לא יהיה אחר כך', 'מישהו הכין במיוחד', 'הזדמנות / מבצע'] },
      { key: 'missing', type: 'text', label: 'מה אני חוששת לפספס?', placeholder: '' },
    ] },
];
const TOOLS = ['חכו רגע', 'שתייה', 'נשימה', 'הסחת דעת', 'שאלתי מה אני באמת צריכה', 'עוד לא ניסיתי'];

function sourceInfo(id) { return SOURCES.find(s => s.id === id); }

let viewDate = startOfDay(new Date());
let thumbUrls = [];
let form = null;          // מצב הטופס הפתוח
let photoTarget = null;   // 'new' | 'before' | 'after'

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function sameDay(a, b) { return startOfDay(a).getTime() === startOfDay(b).getTime(); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// "2026-10-01T13:05" לשדה datetime-local, לפי השעון המקומי
function toLocalInput(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
// השעה נבחרת בקפיצות של 15 דקות - מעגלים לרבע השעה הקרוב
function roundTo15(d) {
  const x = new Date(d);
  x.setSeconds(0, 0);
  x.setMinutes(Math.round(x.getMinutes() / 15) * 15);
  return x;
}
function whenHtml(value) {
  const [date, time] = value.split('T');
  const [hh, mm] = time.split(':').map(Number);
  const p = (n) => String(n).padStart(2, '0');
  let hours = '', mins = '';
  for (let h = 0; h < 24; h++) hours += `<option value="${h}"${h === hh ? ' selected' : ''}>${p(h)}</option>`;
  for (const m of [0, 15, 30, 45]) mins += `<option value="${m}"${m === mm ? ' selected' : ''}>${p(m)}</option>`;
  return `<div class="when-row">
    <input type="date" id="eaten-date" value="${date}">
    <span class="time-pick" dir="ltr"><select id="eaten-hour" aria-label="שעה">${hours}</select><b>:</b><select id="eaten-min" aria-label="דקות">${mins}</select></span>
  </div>`;
}
function readWhen() {
  const date = $('eaten-date').value;
  if (!date) return form.eatenAt;
  const p = (n) => String(n).padStart(2, '0');
  return `${date}T${p($('eaten-hour').value)}:${p($('eaten-min').value)}`;
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

// רשומות ישנות (לפני שהיה status) - פתוחה אם אין שובע
function isDraft(e) { return e.status ? e.status === 'draft' : e.fullness == null; }

let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ---------- פס עם שתי נקודות ----------
// 1 בצד ימין, 10 בצד שמאל (כיוון הקריאה בעברית). אותו צבע לשתי הנקודות - בלי "טוב" ו"רע".
function pos(v) { return ((v - 1) / 9) * 100; }

function barHtml(a, b) {
  let html = '<div class="bar"><div class="bar-track"></div>';
  for (let i = 1; i <= 10; i++) html += `<div class="bar-tick" style="right:${pos(i)}%"></div>`;
  if (a != null && b != null) {
    const x = Math.min(pos(a), pos(b)), y = Math.max(pos(a), pos(b));
    html += `<div class="bar-link" style="right:${x}%;width:${y - x}%"></div>`;
  }
  if (a != null) html += `<div class="bar-dot hunger" style="right:${pos(a)}%"></div>`;
  if (b != null) html += `<div class="bar-dot" style="right:${pos(b)}%"></div>`;
  return html + '</div>';
}

function pairLabel(nameA, a, nameB, b) {
  return `${nameA} ${a != null ? a : '—'} · ${nameB} ${b != null ? b : '—'}`;
}

// ---------- סולם בחירה 1-10 ----------
function scaleHtml(name, value, opts) {
  const base = value == null ? null : Math.floor(value);
  const half = value != null && value % 1 !== 0;
  let html = '<div class="scale-grid">';
  for (let i = 1; i <= 10; i++) {
    html += `<button type="button" class="chip${base === i ? ' selected' : ''}" data-scale="${name}" data-v="${i}">${i}</button>`;
  }
  html += '</div><div class="scale-extra">';
  html += `<span class="scale-ends">${opts.ends}</span>`;
  if (opts.halves) {
    html += `<button type="button" class="chip${half ? ' selected' : ''}" data-scale="${name}" data-half ${base == null || base === 10 ? 'disabled style="opacity:.4"' : ''}>+½</button>`;
  }
  html += '</div>';
  if (opts.describe && value != null) html += `<div class="scale-desc">${escapeHtml(opts.describe(value))}</div>`;
  return html;
}

function chipsHtml(group, options, selected, multi) {
  return '<div class="chips">' + options.map(o => {
    const on = multi ? (selected || []).includes(o) : selected === o;
    return `<button type="button" class="chip${on ? ' selected' : ''}" data-group="${group}" data-val="${escapeHtml(o)}">${escapeHtml(o)}</button>`;
  }).join('') + '</div>';
}

// ---------- מסך היום ----------
function dayLabel(d) {
  const today = startOfDay(new Date());
  if (sameDay(d, today)) return 'היום';
  if (sameDay(d, addDays(today, -1))) return 'אתמול';
  return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
}

async function getDayEntries(d) {
  const all = await db.getAll('entries');
  return all.filter(e => sameDay(new Date(e.eatenAt), d))
    .sort((a, b) => a.eatenAt.localeCompare(b.eatenAt));
}

function loadThumb(photoId, onUrl) {
  if (!photoId) return;
  db.get('photos', photoId).then(p => {
    if (!p) return;
    const url = URL.createObjectURL(p.thumb || p.blob);
    thumbUrls.push(url);
    onUrl(url);
  }).catch(() => {});
}

async function renderDay() {
  const isToday = sameDay(viewDate, new Date());
  $('day-label').textContent = dayLabel(viewDate);
  $('next-day').disabled = isToday;
  $('today-btn').hidden = isToday;

  thumbUrls.forEach(u => URL.revokeObjectURL(u));
  thumbUrls = [];

  const tl = $('timeline');
  let entries;
  try {
    entries = await getDayEntries(viewDate);
  } catch (e) {
    console.error('load error', e);
    tl.innerHTML = '<div class="empty">לא הצלחתי לטעון את הרשומות כרגע.</div>';
    return;
  }
  if (entries.length === 0) {
    tl.innerHTML = `<div class="empty">${isToday ? 'עוד אין רשומות היום.<br>כשתאכלי, אפשר לעצור לרגע ולתעד.' : 'אין רשומות ביום הזה.'}</div>`;
    return;
  }

  tl.innerHTML = '';
  for (const e of entries) {
    const el = document.createElement('div');
    el.className = 'entry';
    const draft = isDraft(e);
    const src = e.notHungry ? sourceInfo(e.source) : null;
    let body = `
      <div class="entry-head">
        <span class="entry-time">${escapeHtml(formatTime(e.eatenAt))}</span>
        ${draft ? '<span class="open-badge">טיוטה</span>' : ''}
        ${e.notHungry ? `<span class="tag">לא רעבה${src ? ' · ' + escapeHtml(src.label) : ''}</span>` : ''}
      </div>`;
    if (e.hunger != null || e.fullness != null) {
      body += barHtml(e.hunger, e.fullness) +
        `<div class="bar-nums">${escapeHtml(pairLabel('רעב', e.hunger, 'שובע', e.fullness))}</div>`;
    }
    if (e.craving != null) {
      const label = e.decision === 'skip' ? `חשק ${e.craving}` : pairLabel('חשק', e.craving, 'סיפוק', e.satisfaction);
      body += barHtml(e.craving, e.satisfaction) + `<div class="bar-nums">${escapeHtml(label)}</div>`;
    }
    if (e.decision === 'skip') body += '<div class="entry-note">הפעם בחרתי לא לאכול</div>';
    const text = e.reflection || e.note;
    if (text) body += `<div class="entry-note">${escapeHtml(text)}</div>`;

    el.innerHTML = `<div class="thumb-wrap"><div class="thumb">🍽️</div></div><div class="entry-body">${body}</div>`;
    el.onclick = () => openForm(e);
    tl.appendChild(el);

    loadThumb(e.photoId, url => {
      const img = document.createElement('img');
      img.className = 'thumb'; img.alt = ''; img.src = url;
      el.querySelector('.thumb').replaceWith(img);
    });
    loadThumb(e.afterPhotoId, url => {
      const img = document.createElement('img');
      img.className = 'thumb-after'; img.alt = 'אחרי'; img.src = url;
      el.querySelector('.thumb-wrap').appendChild(img);
    });
  }
}

// ---------- טופס ----------
// לכל תמונה (לפני / אחרי): existingId - שמורה, fresh - חדשה שעוד לא נשמרה, removed, url לתצוגה
function photoSlot(existingId) { return { existingId: existingId || null, fresh: null, removed: false, url: null }; }

async function loadSlotUrl(slot) {
  if (!slot.existingId) return;
  const p = await db.get('photos', slot.existingId).catch(() => null);
  if (p && !slot.fresh && !slot.removed) slot.url = URL.createObjectURL(p.blob);
}

function freeSlot(slot) { if (slot && slot.url) URL.revokeObjectURL(slot.url); }

async function openForm(entry, newPhoto) {
  const e = entry || {};
  const defaultTime = sameDay(viewDate, new Date())
    ? new Date()
    : (() => { const d = new Date(viewDate); const n = new Date(); d.setHours(n.getHours(), n.getMinutes()); return d; })();

  form = {
    original: entry || null,
    wasDraft: entry ? isDraft(entry) : true,
    before: photoSlot(e.photoId),
    after: photoSlot(e.afterPhotoId),
    hunger: e.hunger ?? null,
    notHungry: !!e.notHungry,
    source: e.source || null,
    details: JSON.parse(JSON.stringify(e.details || {})),
    craving: e.craving ?? null,
    tools: [...(e.tools || [])],
    decision: e.decision || null,
    eatenAt: toLocalInput(roundTo15(entry ? new Date(e.eatenAt) : defaultTime)),
    note: e.note || '',
    fullness: e.fullness ?? null,
    satisfaction: e.satisfaction ?? null,
    reflection: e.reflection || '',
    // "אחרי" מוצג כשממשיכים טיוטה או עורכים רשומה שהושלמה; ברשומה חדשה - בלחיצה
    showAfter: !!entry,
  };
  if (newPhoto) { form.before.fresh = newPhoto; form.before.url = URL.createObjectURL(newPhoto.blob); }
  await Promise.all([loadSlotUrl(form.before), loadSlotUrl(form.after)]);

  $('form-title').textContent = !entry ? 'רשומה חדשה' : (form.wasDraft ? 'אחרי האכילה' : 'עריכת רשומה');
  $('form-delete').hidden = !entry;
  renderForm();
  $('day-view').hidden = true;
  $('form-view').hidden = false;
  window.scrollTo(0, 0);
  history.pushState({ form: true }, '');

  // חזרה לטיוטה: קופצים ישר ל"אחרי"
  if (entry && form.wasDraft) {
    setTimeout(() => { const a = $('after-section'); if (a) a.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150);
  }
}

function photoHtml(slotName, label) {
  const slot = form[slotName];
  return `
    <div class="photo-box${slot.url ? '' : ' empty-box'}">
      ${slot.url ? `<img src="${slot.url}" alt="${label}" data-zoom="${slotName}">` : `<div class="photo-empty">${label}</div>`}
    </div>
    <div class="photo-actions">
      <button type="button" class="chip" data-photo="${slotName}" data-cam="1">📷 צילום</button>
      <button type="button" class="chip" data-photo="${slotName}">🖼️ מהגלריה</button>
      ${slot.url ? `<button type="button" class="chip" data-photo-remove="${slotName}">הסרה</button>` : ''}
    </div>`;
}

function fieldHtml(src, f) {
  const val = form.details[f.key];
  let html = `<div class="sub-label">${escapeHtml(f.label)}</div>`;
  if (f.type === 'text') {
    html += `<input type="text" class="text-in" data-detail="${f.key}" value="${escapeHtml(val || '')}" placeholder="${escapeHtml(f.placeholder || '')}">`;
  } else {
    html += chipsHtml('detail:' + f.key + ':' + f.type, f.options, val, f.type === 'multi');
  }
  return html;
}

function renderForm() {
  const f = form;
  let html = '';

  // ----- לפני -----
  html += `<div class="section-title">לפני האכילה</div>`;
  html += photoHtml('before', 'תמונת הצלחת לפני');

  html += `<div class="card">
    <div class="field-label">רעב לפני</div>
    ${f.notHungry ? '' : scaleHtml('hunger', f.hunger, { halves: true, ends: '1 רעב קיצוני · 5 ניטרלי · 10 שובע קיצוני' })}
    <button type="button" class="chip wide${f.notHungry ? ' selected' : ''}" data-toggle="notHungry">לא רעבה</button>
  </div>`;

  if (f.notHungry) {
    html += `<div class="card">
      <div class="field-label">מאיפה הרצון לאכול מגיע?</div>
      ${chipsHtml('source', SOURCES.map(s => s.label), f.source ? sourceInfo(f.source).label : null, false)}`;
    const src = sourceInfo(f.source);
    if (src) {
      html += `<div class="hint">${escapeHtml(src.hint)}</div>`;
      src.fields.forEach(fl => { html += fieldHtml(src, fl); });
    }
    html += `</div>`;

    if (src) {
      html += `<div class="card">
        <div class="field-label">כמה באמת בא לי?</div>
        <div class="hint">לא כמה זה יהיה טעים ולא האם מותר לי, אלא כמה אני באמת רוצה את זה עכשיו.</div>
        ${scaleHtml('craving', f.craving, { halves: false, ends: '1 כמעט לא · 10 ממש ממש', describe: v => pairText(CRAVING_TEXT, v) })}
      </div>
      <div class="card">
        <div class="field-label">ניסיתי קודם כלי? <span class="optional">(לא חובה)</span></div>
        ${chipsHtml('tools', TOOLS, f.tools, true)}
        <div class="sub-label">ההחלטה שלי</div>
        ${chipsHtml('decision', ['אוכלת', 'הפעם לא'], f.decision === 'eat' ? 'אוכלת' : f.decision === 'skip' ? 'הפעם לא' : null, false)}
        ${f.decision === 'eat' ? '<div class="hint">אפשר לבחור לאכול. לשבת, לעשות טקס אכילה מהנה, וליהנות.</div>' : ''}
      </div>`;
    }
  }

  html += `<div class="card">
    <label class="field-label" for="eaten-date">מתי</label>
    ${whenHtml(f.eatenAt)}
    <label class="field-label" for="note" style="margin-top:14px">הערה <span class="optional">(לא חובה)</span></label>
    <textarea id="note" placeholder="מה שמתי לב אליו לפני...">${escapeHtml(f.note)}</textarea>
  </div>`;

  // ----- אחרי -----
  const skipped = f.notHungry && f.decision === 'skip';
  if (!skipped) {
    if (f.showAfter) {
      html += `<div id="after-section"><div class="section-title">אחרי האכילה</div>`;
      html += photoHtml('after', 'תמונת הצלחת אחרי (מה נשאר)');
      html += `<div class="card">
        <div class="field-label">שובע אחרי</div>
        <div class="hint">חוק חכו רגע: כדאי לחכות כמה דקות לפני שמדרגים.</div>
        ${scaleHtml('fullness', f.fullness, { halves: true, ends: '1 רעב קיצוני · 5 ניטרלי · 10 שובע קיצוני' })}
        ${f.fullness != null || f.hunger != null ? `<div class="bar-preview">${barHtml(f.hunger, f.fullness)}<div class="bar-legend"><span>1</span><span>${escapeHtml(pairLabel('רעב', f.hunger, 'שובע', f.fullness))}</span><span>10</span></div></div>` : ''}
      </div>`;
      if (f.notHungry && f.craving != null) {
        html += `<div class="card">
          <div class="field-label">כמה סופקתי?</div>
          <div class="hint">עוצרים לא בשביל לעצור, אלא כדי ליצור נקודת בקרה וללמוד ממנה.</div>
          ${scaleHtml('satisfaction', f.satisfaction, { halves: false, ends: '1 כמעט לא · 10 לגמרי', describe: v => pairText(SATISFACTION_TEXT, v) })}
        </div>`;
      }
      html += `<div class="card">
        <label class="field-label" for="reflection">רפלקציה <span class="optional">(לא חובה)</span></label>
        <textarea id="reflection" placeholder="משהו ששמתי לב אליו באכילה...">${escapeHtml(f.reflection)}</textarea>
      </div></div>`;
    } else {
      html += `<button type="button" class="ghost-btn" data-show-after>כבר סיימתי לאכול – למילוי "אחרי"</button>`;
    }
  }

  $('form-body').innerHTML = html;

  // ----- כפתורים -----
  let actions;
  if (skipped) {
    actions = `<button type="button" class="big-btn" data-save="done">שמירה</button>`;
  } else if (!f.showAfter) {
    actions = `<button type="button" class="big-btn" data-save="draft">שמירה כטיוטה – אחזור אחרי האכילה</button>`;
  } else if (f.wasDraft) {
    actions = `<button type="button" class="big-btn" data-save="done">סיום</button>
      <button type="button" class="link-btn center" data-save="draft">שמירה כטיוטה</button>`;
  } else {
    actions = `<button type="button" class="big-btn" data-save="done">שמירה</button>`;
  }
  $('form-actions').innerHTML = actions;

  bindForm();
}

function bindForm() {
  const body = $('form-body');
  const rerender = () => { captureInputs(); renderForm(); };

  body.querySelectorAll('[data-scale]').forEach(b => b.onclick = () => {
    const name = b.dataset.scale;
    const cur = form[name];
    const base = cur == null ? null : Math.floor(cur);
    if (b.hasAttribute('data-half')) {
      if (base == null || base >= 10) return;
      form[name] = cur % 1 !== 0 ? base : base + 0.5;
    } else {
      const v = Number(b.dataset.v);
      // לחיצה שנייה על אותו מספר מבטלת את הבחירה
      form[name] = (cur === v) ? null : v;
    }
    rerender();
  });

  body.querySelectorAll('[data-toggle="notHungry"]').forEach(b => b.onclick = () => {
    form.notHungry = !form.notHungry;
    if (form.notHungry) form.hunger = null;
    rerender();
  });

  body.querySelectorAll('[data-group]').forEach(b => b.onclick = () => {
    const g = b.dataset.group, v = b.dataset.val;
    if (g === 'source') {
      const s = SOURCES.find(x => x.label === v);
      form.source = form.source === s.id ? null : s.id;
      form.details = {};
    } else if (g === 'tools') {
      form.tools = form.tools.includes(v) ? form.tools.filter(x => x !== v) : [...form.tools, v];
    } else if (g === 'decision') {
      const d = v === 'אוכלת' ? 'eat' : 'skip';
      form.decision = form.decision === d ? null : d;
    } else if (g.startsWith('detail:')) {
      const [, key, type] = g.split(':');
      if (type === 'multi') {
        const arr = form.details[key] || [];
        form.details[key] = arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];
      } else {
        form.details[key] = form.details[key] === v ? null : v;
      }
    }
    rerender();
  });

  body.querySelectorAll('[data-detail]').forEach(inp => inp.oninput = () => { form.details[inp.dataset.detail] = inp.value; });
  ['eaten-date', 'eaten-hour', 'eaten-min'].forEach(id => { if ($(id)) $(id).onchange = () => { form.eatenAt = readWhen(); }; });
  if ($('note')) $('note').oninput = () => { form.note = $('note').value; };
  if ($('reflection')) $('reflection').oninput = () => { form.reflection = $('reflection').value; };

  body.querySelectorAll('[data-photo]').forEach(b => b.onclick = () => pickPhoto(b.dataset.photo, !!b.dataset.cam));
  body.querySelectorAll('[data-photo-remove]').forEach(b => b.onclick = () => {
    const slot = form[b.dataset.photoRemove];
    freeSlot(slot);
    slot.fresh = null; slot.url = null; slot.removed = true;
    rerender();
  });
  body.querySelectorAll('[data-zoom]').forEach(img => img.onclick = () => {
    $('lightbox-img').src = img.src;
    $('lightbox').hidden = false;
    history.pushState({ lightbox: true }, '');
  });
  const showAfter = body.querySelector('[data-show-after]');
  if (showAfter) showAfter.onclick = () => {
    form.showAfter = true;
    rerender();
    setTimeout(() => $('after-section').scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  $('form-actions').querySelectorAll('[data-save]').forEach(b => b.onclick = () => saveForm(b.dataset.save));
}

function captureInputs() {
  if ($('eaten-date')) form.eatenAt = readWhen();
  if ($('note')) form.note = $('note').value;
  if ($('reflection')) form.reflection = $('reflection').value;
  $('form-body').querySelectorAll('[data-detail]').forEach(inp => { form.details[inp.dataset.detail] = inp.value; });
}

function closeForm(fromPopState) {
  if (form) { freeSlot(form.before); freeSlot(form.after); }
  form = null;
  $('form-body').innerHTML = '';
  $('form-view').hidden = true;
  $('day-view').hidden = false;
  if (!fromPopState && history.state && history.state.form) history.back();
  renderDay();
}

// שומר תמונה חדשה / מוחק ישנה, ומחזיר את המזהה שיישמר ברשומה
async function commitPhoto(slot) {
  if (slot.fresh) {
    const id = newId();
    await db.put('photos', { id, blob: slot.fresh.blob, thumb: slot.fresh.thumb, createdAt: new Date().toISOString() });
    if (slot.existingId) await db.delete('photos', slot.existingId);
    return id;
  }
  if (slot.removed) {
    if (slot.existingId) await db.delete('photos', slot.existingId);
    return null;
  }
  return slot.existingId;
}

async function saveForm(mode) {
  captureInputs();
  const f = form;
  if (!f.notHungry && f.hunger == null) {
    toast('כדאי לבחור ציון רעב, או "לא רעבה"');
    return;
  }
  const when = f.eatenAt ? new Date(f.eatenAt) : new Date();
  if (isNaN(when)) { toast('השעה לא נראית תקינה'); return; }

  const btns = $('form-actions').querySelectorAll('button');
  btns.forEach(b => b.disabled = true);
  try {
    const photoId = await commitPhoto(f.before);
    const afterPhotoId = await commitPhoto(f.after);
    const now = new Date().toISOString();
    const base = f.original || { id: newId(), createdAt: now, ai: null };
    const skipped = f.notHungry && f.decision === 'skip';
    const entry = {
      ...base,
      updatedAt: now,
      status: skipped ? 'done' : mode,
      eatenAt: when.toISOString(),
      photoId,
      afterPhotoId,
      hunger: f.notHungry ? null : f.hunger,
      notHungry: f.notHungry,
      source: f.notHungry ? f.source : null,
      details: f.notHungry ? f.details : {},
      craving: f.notHungry ? f.craving : null,
      tools: f.notHungry ? f.tools : [],
      decision: f.notHungry ? f.decision : null,
      fullness: skipped ? null : f.fullness,
      satisfaction: skipped || !f.notHungry ? null : f.satisfaction,
      note: f.note.trim(),
      reflection: skipped ? '' : f.reflection.trim(),
    };
    delete entry.sourceTags;
    await db.put('entries', entry);

    viewDate = startOfDay(when);
    toast(entry.status === 'draft' ? 'נשמר כטיוטה. בתיאבון 🌿' : 'נשמר');
    closeForm();
  } catch (e) {
    console.error('save error', e);
    toast('השמירה לא הצליחה');
    btns.forEach(b => b.disabled = false);
  }
}

async function deleteEntry() {
  if (!form || !form.original) return;
  if (!confirm('למחוק את הרשומה הזו?')) return;
  try {
    const o = form.original;
    await db.delete('entries', o.id);
    if (o.photoId) await db.delete('photos', o.photoId);
    if (o.afterPhotoId) await db.delete('photos', o.afterPhotoId);
    closeForm();
  } catch (e) {
    console.error('delete error', e);
    toast('המחיקה לא הצליחה');
  }
}

// ---------- תמונות ----------
async function handleFile(file) {
  if (!file) return;
  toast('מכינה את התמונה...');
  let photo;
  try {
    photo = await compressPhoto(file);
  } catch (e) {
    console.error('photo error', e);
    toast('לא הצלחתי לקרוא את התמונה');
    return;
  }
  $('toast').classList.remove('show');
  if ((photoTarget === 'before' || photoTarget === 'after') && form) {
    captureInputs();
    const slot = form[photoTarget];
    freeSlot(slot);
    slot.fresh = photo;
    slot.removed = false;
    slot.url = URL.createObjectURL(photo.blob);
    renderForm();
  } else {
    openForm(null, photo);
  }
}

function pickPhoto(target, camera) {
  photoTarget = target;
  $(camera ? 'file-camera' : 'file-gallery').click();
}

['file-camera', 'file-gallery'].forEach(id => {
  $(id).onchange = (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    handleFile(f);
  };
});

// ---------- חיבור כפתורים ----------
$('new-camera').onclick = () => pickPhoto('new', true);
$('new-gallery').onclick = () => pickPhoto('new', false);
$('new-nophoto').onclick = () => openForm(null, null);
$('lightbox').onclick = () => history.back();
$('form-cancel').onclick = () => closeForm();
$('form-delete').onclick = deleteEntry;

$('prev-day').onclick = () => { viewDate = addDays(viewDate, -1); renderDay(); };
$('next-day').onclick = () => { viewDate = addDays(viewDate, 1); renderDay(); };
$('today-btn').onclick = () => { viewDate = startOfDay(new Date()); renderDay(); };

// כפתור "חזרה" של אנדרואיד סוגר את התמונה / הטופס במקום לצאת מהאפליקציה
window.addEventListener('popstate', () => {
  if (!$('lightbox').hidden) { $('lightbox').hidden = true; return; }
  if (form) closeForm(true);
});

// חזרה לאפליקציה ביום חדש - מציגים את היום הנוכחי
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !form) renderDay();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(e => console.error('sw error', e));
}

renderDay();
