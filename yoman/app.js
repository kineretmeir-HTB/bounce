// ---------- מבנה רשומה ----------
// entries: {id, createdAt, updatedAt, eatenAt, photoId|null, hunger, fullness|null,
//           note, sourceTags: [], ai: null}
//   sourceTags - לשלב 2 (רעב / דחף / רגש / הרגל)
//   ai         - לשלב 3 (תגובה חמה ושאלה בהשראת אפר"ת), נשאר null בינתיים
// photos:  {id, blob, thumb, createdAt}  - נפרד מהרשומות כדי שהרשימה תיטען מהר

const $ = (id) => document.getElementById(id);

let viewDate = startOfDay(new Date());
let thumbUrls = [];
let form = null;          // מצב הטופס הפתוח
let photoTarget = 'new';  // 'new' = רשומה חדשה מהמצלמה, 'form' = החלפת תמונה בטופס

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
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}
function formatScore(v) { return v == null ? '' : String(v); }

let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ---------- פס רעב-שובע ----------
// 1 בצד ימין, 10 בצד שמאל (כיוון הקריאה בעברית)
function pos(v) { return ((v - 1) / 9) * 100; }

function barHtml(hunger, fullness) {
  let html = '<div class="bar"><div class="bar-track"></div>';
  for (let i = 1; i <= 10; i++) html += `<div class="bar-tick" style="right:${pos(i)}%"></div>`;
  if (hunger != null && fullness != null) {
    const a = Math.min(pos(hunger), pos(fullness)), b = Math.max(pos(hunger), pos(fullness));
    html += `<div class="bar-link" style="right:${a}%;width:${b - a}%"></div>`;
  }
  if (hunger != null) html += `<div class="bar-dot hunger" style="right:${pos(hunger)}%"></div>`;
  if (fullness != null) html += `<div class="bar-dot" style="right:${pos(fullness)}%"></div>`;
  return html + '</div>';
}

function scoresText(hunger, fullness) {
  const h = hunger != null ? `רעב ${formatScore(hunger)}` : 'רעב —';
  const f = fullness != null ? `שובע ${formatScore(fullness)}` : 'שובע —';
  return `${h} · ${f}`;
}

// ---------- סולם בחירה 1-10 עם חצאים ----------
function renderScale(container, value, onChange, allowClear) {
  const base = value == null ? null : Math.floor(value);
  const half = value != null && value % 1 !== 0;
  let html = '<div class="scale-grid">';
  for (let i = 1; i <= 10; i++) {
    html += `<button type="button" class="chip${base === i ? ' selected' : ''}" data-v="${i}">${i}</button>`;
  }
  html += `</div><div class="scale-extra">
    <span class="scale-ends">1 רעב קיצוני · 5 ניטרלי · 10 שובע קיצוני</span>
    <button type="button" class="chip${half ? ' selected' : ''}" data-half ${base == null || base === 10 ? 'disabled style="opacity:.4"' : ''}>+½</button>
  </div>`;
  if (allowClear && value != null) {
    html += `<button type="button" class="link-btn scale-clear" data-clear>ניקוי (אוסיף אחר כך)</button>`;
  }
  container.innerHTML = html;
  container.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
    const v = Number(b.dataset.v);
    onChange(base === v && !half ? (allowClear ? null : v) : v);
  });
  const halfBtn = container.querySelector('[data-half]');
  halfBtn.onclick = () => { if (base != null && base < 10) onChange(half ? base : base + 0.5); };
  const clearBtn = container.querySelector('[data-clear]');
  if (clearBtn) clearBtn.onclick = () => onChange(null);
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
    const open = e.fullness == null;
    el.innerHTML = `
      <div class="thumb">🍽️</div>
      <div class="entry-body">
        <div class="entry-head">
          <span class="entry-time">${escapeHtml(formatTime(e.eatenAt))}</span>
          ${open ? '<span class="open-badge">פתוחה</span>' : ''}
        </div>
        ${barHtml(e.hunger, e.fullness)}
        <div class="bar-nums"><span>${escapeHtml(scoresText(e.hunger, e.fullness))}</span></div>
        ${e.note ? `<div class="entry-note">${escapeHtml(e.note)}</div>` : ''}
      </div>`;
    el.onclick = () => openForm(e);
    tl.appendChild(el);

    if (e.photoId) {
      db.get('photos', e.photoId).then(p => {
        if (!p) return;
        const url = URL.createObjectURL(p.thumb || p.blob);
        thumbUrls.push(url);
        const img = document.createElement('img');
        img.className = 'thumb';
        img.alt = '';
        img.src = url;
        el.querySelector('.thumb').replaceWith(img);
      }).catch(() => {});
    }
  }
}

// ---------- טופס ----------
let previewUrl = null;

function setPreview(blob) {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = blob ? URL.createObjectURL(blob) : null;
  $('photo-preview').src = previewUrl || '';
  $('photo-preview').hidden = !blob;
  $('photo-empty').hidden = !!blob;
  $('photo-remove').hidden = !blob;
}

async function openForm(entry, newPhoto) {
  const editing = !!entry;
  const defaultTime = sameDay(viewDate, new Date())
    ? new Date()
    : (() => { const d = new Date(viewDate); const n = new Date(); d.setHours(n.getHours(), n.getMinutes()); return d; })();

  form = {
    id: editing ? entry.id : null,
    original: entry || null,
    hunger: editing ? entry.hunger : null,
    fullness: editing ? entry.fullness : null,
    photoId: editing ? entry.photoId : null,  // התמונה השמורה כרגע
    newPhoto: newPhoto || null,               // תמונה חדשה שעוד לא נשמרה
    removePhoto: false,
  };

  $('form-title').textContent = editing ? 'עריכת רשומה' : 'רשומה חדשה';
  $('eaten-at').value = toLocalInput(editing ? new Date(entry.eatenAt) : defaultTime);
  $('note').value = editing ? (entry.note || '') : '';
  $('form-delete').hidden = !editing;

  setPreview(newPhoto ? newPhoto.blob : null);
  if (!newPhoto && form.photoId) {
    const p = await db.get('photos', form.photoId).catch(() => null);
    if (p && form && form.photoId === p.id) setPreview(p.blob);
  }

  renderFormScales();
  $('day-view').hidden = true;
  $('form-view').hidden = false;
  window.scrollTo(0, 0);
  history.pushState({ form: true }, '');

  // רשומה פתוחה: מקפיצים ישר לשובע
  if (editing && entry.fullness == null) {
    setTimeout(() => $('fullness-scale').closest('.card').scrollIntoView({ behavior: 'smooth', block: 'center' }), 150);
  }
}

function renderFormScales() {
  renderScale($('hunger-scale'), form.hunger, v => { form.hunger = v; renderFormScales(); }, false);
  renderScale($('fullness-scale'), form.fullness, v => { form.fullness = v; renderFormScales(); }, true);
  $('bar-preview').innerHTML = barHtml(form.hunger, form.fullness) +
    `<div class="bar-legend"><span>1</span><span>${escapeHtml(scoresText(form.hunger, form.fullness))}</span><span>10</span></div>
     <div class="bar-key"><span><i></i>רעב לפני</span><span><i class="full"></i>שובע אחרי</span></div>`;
}

function closeForm(fromPopState) {
  form = null;
  setPreview(null);
  $('form-view').hidden = true;
  $('day-view').hidden = false;
  if (!fromPopState && history.state && history.state.form) history.back();
  renderDay();
}

async function saveForm() {
  if (form.hunger == null) {
    toast('כדאי לבחור ציון רעב לפני ששומרים');
    $('hunger-scale').closest('.card').scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const when = $('eaten-at').value ? new Date($('eaten-at').value) : new Date();
  if (isNaN(when)) { toast('השעה לא נראית תקינה'); return; }

  const btn = $('form-save');
  btn.disabled = true;
  try {
    let photoId = form.photoId;
    const oldPhotoId = form.photoId;
    if (form.newPhoto) {
      photoId = newId();
      await db.put('photos', { id: photoId, blob: form.newPhoto.blob, thumb: form.newPhoto.thumb, createdAt: new Date().toISOString() });
    } else if (form.removePhoto) {
      photoId = null;
    }

    const now = new Date().toISOString();
    const base = form.original || { id: newId(), createdAt: now, sourceTags: [], ai: null };
    const entry = {
      ...base,
      updatedAt: now,
      eatenAt: when.toISOString(),
      photoId,
      hunger: form.hunger,
      fullness: form.fullness,
      note: $('note').value.trim(),
    };
    await db.put('entries', entry);
    if (oldPhotoId && oldPhotoId !== photoId) await db.delete('photos', oldPhotoId);

    viewDate = startOfDay(when);
    toast(entry.fullness == null ? 'נשמר. אפשר להוסיף שובע אחר כך' : 'נשמר');
    closeForm();
  } catch (e) {
    console.error('save error', e);
    toast('השמירה לא הצליחה');
  } finally {
    btn.disabled = false;
  }
}

async function deleteEntry() {
  if (!form || !form.original) return;
  if (!confirm('למחוק את הרשומה הזו?')) return;
  try {
    await db.delete('entries', form.original.id);
    if (form.original.photoId) await db.delete('photos', form.original.photoId);
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
  if (photoTarget === 'form' && form) {
    form.newPhoto = photo;
    form.removePhoto = false;
    setPreview(photo.blob);
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
$('photo-camera').onclick = () => pickPhoto('form', true);
$('photo-gallery').onclick = () => pickPhoto('form', false);
$('photo-remove').onclick = () => {
  form.newPhoto = null;
  form.removePhoto = true;
  setPreview(null);
};
$('photo-preview').onclick = () => {
  if (!previewUrl) return;
  $('lightbox-img').src = previewUrl;
  $('lightbox').hidden = false;
  history.pushState({ lightbox: true }, '');
};
$('lightbox').onclick = () => history.back();

$('form-cancel').onclick = () => closeForm();
$('form-save').onclick = saveForm;
$('form-delete').onclick = deleteEntry;

$('prev-day').onclick = () => { viewDate = addDays(viewDate, -1); renderDay(); };
$('next-day').onclick = () => { viewDate = addDays(viewDate, 1); renderDay(); };
$('today-btn').onclick = () => { viewDate = startOfDay(new Date()); renderDay(); };

// כפתור "חזרה" של אנדרואיד סוגר את הטופס במקום לצאת מהאפליקציה
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
