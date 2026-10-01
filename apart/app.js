const steps = [
  {key:'event', label:'אירוע', labelClass:'', bot:'ספרי לי מה קרה, בלי שיפוט — רק העובדות. מה ראית / שמעת / עשית?', type:'tagged_event', tags:['ארוחת חג / אירוע גדול','נשנוש בין ארוחות','דחף פתאומי','ביקורת עצמית אחרי אכילה','רעב מוגבר','אחר'], placeholder:'לדוגמה: אכלתי עוגייה מהמשרד מתוך דחף'},
  {key:'interpretation', label:'פרשנות', labelClass:'', bot:'מה אמרת לעצמך על זה שקרה? מה המשמעות שנתת לאירוע?', type:'textarea', placeholder:'לדוגמה: נפלתי שוב, לא מצליחה לשלוט בעצמי'},
  {key:'emotion', label:'רגש', labelClass:'', bot:'מה זה עורר בך? אפשר לבחור אחת או כמה, וגם להוסיף במילים שלך.', type:'chips', options:['אשמה','תסכול','עצב','בושה','כעס','חרדה','אכזבה'], placeholder:'רגש נוסף (לא חובה)'},
  {key:'response', label:'תגובה', labelClass:'', bot:'מה עשית בעקבות זה? איך הגבת בפועל?', type:'textarea', placeholder:'לדוגמה: המשכתי לנשנש עוד כמה דברים באותו רגע'},
  {key:'altInterpretation', label:'פרשנות חלופית', labelClass:'alt', bot:'עכשיו נשנה זווית. אפשר לבחון את אותו אירוע בדיוק, אבל בפרשנות אחרת? אפשר לבחור מהבנק למטה, לשלב כמה, ולערוך חופשי.', type:'bank', bank:'reframeBank', placeholder:'לדוגמה: אכלתי עוגייה כי בא לי, ואני מאפשרת לעצמי גם דברים כאלה'},
  {key:'altEmotion', label:'רגש חדש', labelClass:'alt', bot:'עם הפרשנות הזו — מה עולה עכשיו?', type:'chips', options:['רוגע','קבלה','ביטחון','חמלה','שחרור','ניטרלי'], placeholder:'רגש נוסף (לא חובה)'},
  {key:'altResponse', label:'תגובה עתידית', labelClass:'alt', bot:'ואיך היית רוצה להגיב בפעם הבאה, מתוך הפרשנות החדשה? אפשר לבחור מהבנק למטה או לכתוב חופשי.', type:'bank', bank:'responseBank', placeholder:'לדוגמה: להמשיך ביום הרגיל שלי, בלי לנעניש את עצמי ובלי להפוך את זה לעוד עוגייה'}
];

const banks = {
  reframeBank: [
    'זה עליות ומורדות — והמורדות מלמדות אותי, לא מגדירות אותי.',
    'עשיתי את מה שיכולתי עם מה שהיה לי באותו רגע. זה לא כישלון, זו נקודת נתונים.',
    'אני לומדת לשים לב קצת יותר מוקדם בכל פעם — וזה כבר התקדמות אמיתית.',
    'זה לא הכל-או-כלום. אירוע אחד לא מוחק את כל מה שבניתי עד עכשיו.',
    'אני מרשה לעצמי להיות בתהליך, לא מושלמת בתהליך.',
    'הגוף שלי ביקש משהו, ונתתי לו. זה לא בהכרח סימן לחוסר שליטה.',
    'אני יכולה להיות סקרנית לגבי מה שקרה, במקום שיפוטית.',
    'יותר טוב מפעם קודמת כבר נחשב יותר טוב.'
  ],
  responseBank: [
    'להמשיך ביום הרגיל שלי, בלי לנעניש את עצמי ובלי להפוך את זה לעוד אירוע.',
    'להשתמש בחוק החכו רגע ולתת לעצמי 5-10 דקות לפני שאני מחליטה.',
    'למלא צלחת אחת מודעת ולשבת לאכול בנחת, בלי חטיפה על הדרך.',
    'להזכיר לעצמי את המנטרה שלי ולהמשיך הלאה בלי להיתקע.',
    'לבדוק בסולם הרעב-שובע איפה אני נמצאת לפני שאני מחליטה מה לעשות.',
    'לתת לעצמי את מה שהגוף שלי מבקש, בלי דרמה מסביב.',
    'לשים לב לרגע הזה בפעם הבאה, ולזכור שכל תרגול הוא כבר ניצחון קטן.'
  ]
};

// ניסוחים אישיים שנוספו לבנק נשמרים ב-store "customBank": {id, bank, phrase, createdAt}
async function loadCustomBanks(){
  try{
    const custom = await db.getAll('customBank');
    custom.sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
    custom.forEach(c=>{
      if(banks[c.bank] && !banks[c.bank].includes(c.phrase)) banks[c.bank].push(c.phrase);
    });
  }catch(e){ console.error('bank load error', e); }
}

async function addToBank(bankName, phrase){
  if(banks[bankName].includes(phrase)) return;
  banks[bankName].push(phrase);
  try{
    await db.put('customBank', {id:newId(), bank:bankName, phrase, createdAt:new Date().toISOString()});
  }catch(e){
    console.error('bank save error', e);
    toast('לא הצלחתי לשמור את הניסוח לבנק');
  }
}

let current = 0;
let entry = {tag:null};
let selectedChips = {};

const container = document.getElementById('step-container');
const progress = document.getElementById('progress');

function newId(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHtml(str){
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function formatDate(iso){
  return new Date(iso).toLocaleString('he-IL', {day:'numeric', month:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit'});
}

let toastTimer;
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('show'), 2600);
}

function buildProgress(){
  progress.innerHTML = steps.map((s,i)=>`<span class="${i<current?'done':''}"></span>`).join('');
}

function renderStep(){
  buildProgress();
  const s = steps[current];
  selectedChips[s.key] = selectedChips[s.key] || [];
  let html = `<div class="card">
    <span class="step-label ${s.labelClass}">${s.label}</span>
    <div class="bubble-bot">${s.bot}</div>`;

  if(s.type === 'textarea'){
    html += `<textarea id="input-${s.key}" placeholder="${escapeHtml(s.placeholder)}">${escapeHtml(entry[s.key])}</textarea>`;
  } else if(s.type === 'chips'){
    html += `<div class="chips" id="chips-${s.key}">` +
      s.options.map(o=>`<span class="chip" data-val="${escapeHtml(o)}">${escapeHtml(o)}</span>`).join('') +
      `</div><input type="text" id="input-${s.key}" placeholder="${escapeHtml(s.placeholder)}" value="${escapeHtml(entry[s.key+'_extra'])}">`;
  } else if(s.type === 'tagged_event'){
    html += `<div class="chips" id="chips-tag">` +
      s.tags.map(t=>`<span class="chip" data-val="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join('') +
      `</div><textarea id="input-${s.key}" placeholder="${escapeHtml(s.placeholder)}">${escapeHtml(entry[s.key])}</textarea>`;
  } else if(s.type === 'bank'){
    html += `<div class="chips" id="chips-${s.key}">` +
      banks[s.bank].map((p,i)=>`<span class="chip" data-idx="${i}">${escapeHtml(p)}</span>`).join('') +
      `</div>
      <textarea id="input-${s.key}" placeholder="${escapeHtml(s.placeholder)}">${escapeHtml(entry[s.key])}</textarea>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <input type="text" id="new-bank-phrase" placeholder="תוספת משלך לבנק, לצמיתות" style="flex:1;min-width:0;">
        <button class="btn-ghost" id="add-bank-btn" type="button" style="white-space:nowrap;flex-shrink:0;">הוסיפי לבנק</button>
      </div>`;
  }
  html += `<div class="err" id="err-${s.key}">כדאי לכתוב כמה מילים לפני שממשיכים</div></div>`;

  html += `<div class="actions">
    ${current>0 ? '<button class="btn-ghost" id="back-btn">חזרה</button>' : ''}
    <button class="btn-primary" id="next-btn">${current===steps.length-1?'סיימי וסכמי':'המשך'}</button>
  </div>`;

  container.innerHTML = html;

  if(s.type==='chips'){
    document.querySelectorAll(`#chips-${s.key} .chip`).forEach(chip=>{
      if(selectedChips[s.key].includes(chip.dataset.val)) chip.classList.add('selected');
      chip.onclick = ()=>{
        chip.classList.toggle('selected');
        const v = chip.dataset.val;
        if(selectedChips[s.key].includes(v)){
          selectedChips[s.key] = selectedChips[s.key].filter(x=>x!==v);
        } else {
          selectedChips[s.key].push(v);
        }
      };
    });
  }

  if(s.type==='tagged_event'){
    document.querySelectorAll('#chips-tag .chip').forEach(chip=>{
      if(entry.tag === chip.dataset.val) chip.classList.add('selected');
      chip.onclick = ()=>{
        document.querySelectorAll('#chips-tag .chip').forEach(c=>c.classList.remove('selected'));
        chip.classList.add('selected');
        entry.tag = chip.dataset.val;
      };
    });
  }

  if(s.type === 'bank'){
    const ta = document.getElementById(`input-${s.key}`);
    document.querySelectorAll(`#chips-${s.key} .chip`).forEach(chip=>{
      const phrase = banks[s.bank][chip.dataset.idx];
      if(ta.value.includes(phrase)) chip.classList.add('selected');
      chip.onclick = ()=>{
        if(ta.value.includes(phrase)){
          ta.value = ta.value.replace(phrase, '').replace(/\s{2,}/g,' ').trim();
          chip.classList.remove('selected');
        } else {
          ta.value = ta.value.trim() ? ta.value.trim() + ' ' + phrase : phrase;
          chip.classList.add('selected');
        }
      };
    });
    const addBtn = document.getElementById('add-bank-btn');
    addBtn.onclick = async ()=>{
      const input = document.getElementById('new-bank-phrase');
      const phrase = input.value.trim();
      if(!phrase) return;
      entry[s.key] = ta.value;
      await addToBank(s.bank, phrase);
      renderStep();
      toast('נוסף לבנק');
    };
  }

  document.getElementById('next-btn').onclick = goNext;
  const backBtn = document.getElementById('back-btn');
  if(backBtn) backBtn.onclick = ()=>{ keepDraft(); current--; renderStep(); window.scrollTo(0,0); };
}

// שומר את מה שכבר נכתב בשלב הנוכחי, כדי שלא ילך לאיבוד כשחוזרים אחורה
function keepDraft(){
  const s = steps[current];
  const inputEl = document.getElementById(`input-${s.key}`);
  if(!inputEl) return;
  if(s.type==='chips') entry[s.key+'_extra'] = inputEl.value.trim();
  else entry[s.key] = inputEl.value.trim();
}

function goNext(){
  const s = steps[current];
  const inputEl = document.getElementById(`input-${s.key}`);
  const val = inputEl.value.trim();

  if(s.type==='textarea' || s.type==='tagged_event' || s.type==='bank'){
    if(!val){
      document.getElementById(`err-${s.key}`).style.display='block';
      return;
    }
    entry[s.key] = val;
  } else if(s.type==='chips'){
    if(selectedChips[s.key].length===0 && !val){
      document.getElementById(`err-${s.key}`).style.display='block';
      return;
    }
    entry[s.key] = [...selectedChips[s.key], val].filter(Boolean).join(', ');
    entry[s.key+'_extra'] = val;
  }

  if(current === steps.length-1){
    finishEntry();
  } else {
    current++;
    renderStep();
    window.scrollTo(0,0);
  }
}

async function getEntriesSorted(){
  const list = await db.getAll('entries');
  return list.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}

async function finishEntry(){
  entry.id = newId();
  entry.createdAt = new Date().toISOString();

  let pastSimilar = [];
  try{
    const list = await getEntriesSorted();
    pastSimilar = entry.tag ? list.filter(e => e.tag === entry.tag) : [];
  }catch(e){ console.error('load error', e); }

  let saved = false;
  try{
    const toSave = {...entry};
    delete toSave.emotion_extra;
    delete toSave.altEmotion_extra;
    await db.put('entries', toSave);
    saved = true;
  }catch(e){
    console.error('save error', e);
  }

  renderSummary(saved, pastSimilar);
  window.scrollTo(0,0);
}

function buildProgressNote(pastSimilar){
  if(!pastSimilar || pastSimilar.length===0) return '';
  const count = pastSimilar.length;
  const last = pastSimilar[0];
  return `<div class="mantra" style="background:var(--sage-light);color:var(--ink);">
    <b>ההתקדמות שלך:</b> זו הפעם ה-${count+1} שאת מתרגלת סיטואציה מסוג "${escapeHtml(entry.tag)}".
    בפעם הקודמת (${escapeHtml(formatDate(last.createdAt))}) הצבת לעצמך: "${escapeHtml(last.altResponse)}".
    שווה לבדוק — האם זה מה שקרה הפעם, או שיש עוד לתרגל? כל חזרה בכיוון הזה היא כבר ניצחון.
  </div>`;
}

function renderSummary(saved, pastSimilar){
  buildProgress();
  progress.querySelectorAll('span').forEach(s=>s.classList.add('done'));

  container.innerHTML = `
  <div class="card">
    <div class="summary-row">
      <div class="label">אירוע</div>
      <div class="text">${entry.tag ? `<span style="color:var(--sage);font-size:12px;">${escapeHtml(entry.tag)}</span><br>` : ''}${escapeHtml(entry.event)}</div>
    </div>
    <div class="summary-row">
      <div class="label">פרשנות</div>
      <div class="text">${escapeHtml(entry.interpretation)}</div>
    </div>
    <div class="summary-row">
      <div class="label">רגש</div>
      <div class="text">${escapeHtml(entry.emotion)}</div>
    </div>
    <div class="summary-row">
      <div class="label">תגובה</div>
      <div class="text">${escapeHtml(entry.response)}</div>
    </div>
    <div class="divider"></div>
    <div class="summary-row">
      <div class="label alt">פרשנות חלופית</div>
      <div class="text">${escapeHtml(entry.altInterpretation)}</div>
    </div>
    <div class="summary-row">
      <div class="label alt">רגש חדש</div>
      <div class="text">${escapeHtml(entry.altEmotion)}</div>
    </div>
    <div class="summary-row">
      <div class="label alt">בפעם הבאה</div>
      <div class="text">${escapeHtml(entry.altResponse)}</div>
    </div>
    ${buildProgressNote(pastSimilar)}
    <div class="mantra">
      "אני עשיתי את כל מה שאני יכולה לעשות בצורה הכי טובה שיכולתי. מכאן אני נותנת לעולם לעשות את שלו."
    </div>
    ${saved ? '' : '<div class="err" style="display:block;margin-top:12px;">השמירה לא הצליחה הפעם. אם חשוב לך לשמור את התרגול, כדאי להעתיק את הסיכום.</div>'}
  </div>
  <div class="actions">
    <button class="btn-primary" id="new-btn">תרגול נוסף</button>
  </div>`;

  document.getElementById('new-btn').onclick = resetPractice;
}

function resetPractice(){
  current = 0;
  entry = {tag:null};
  selectedChips = {};
  renderStep();
  window.scrollTo(0,0);
}

document.querySelectorAll('.tab').forEach(tab=>{
  tab.onclick = ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    document.getElementById(tab.dataset.tab).classList.add('active');
    if(tab.dataset.tab === 'history') loadHistory();
  };
});

async function loadHistory(){
  const list = document.getElementById('hist-list');
  list.innerHTML = '<div class="empty">טוען...</div>';
  let entries;
  try{
    entries = await getEntriesSorted();
  }catch(e){
    list.innerHTML = '<div class="empty">לא הצלחתי לטעון את ההיסטוריה כרגע.</div>';
    return;
  }
  if(entries.length===0){
    list.innerHTML = '<div class="empty">עוד לא תרגלת. כשתסיימי תרגול, הוא יופיע כאן.</div>';
    return;
  }
  list.innerHTML = entries.map(e => `
    <div class="hist-item">
      <div class="hist-date">${escapeHtml(formatDate(e.createdAt))}${e.tag ? ' · ' + escapeHtml(e.tag) : ''}</div>
      <div class="hist-field"><b>אירוע:</b> ${escapeHtml(e.event)}</div>
      <div class="hist-field"><b>פרשנות:</b> ${escapeHtml(e.interpretation)}</div>
      <div class="hist-field"><b class="alt">פרשנות חלופית:</b> ${escapeHtml(e.altInterpretation)}</div>
      <div class="hist-field"><b class="alt">בפעם הבאה:</b> ${escapeHtml(e.altResponse)}</div>
      <span class="del" data-id="${escapeHtml(e.id)}">מחיקה</span>
    </div>
  `).join('');

  list.querySelectorAll('.del').forEach(btn=>{
    btn.onclick = async ()=>{
      if(!confirm('למחוק את התרגול הזה?')) return;
      try{
        await db.delete('entries', btn.dataset.id);
      }catch(e){
        console.error('delete error', e);
        toast('המחיקה לא הצליחה');
      }
      loadHistory();
    };
  });
}

// ---------- גיבוי: ייצוא וייבוא ----------
async function exportBackup(){
  try{
    const data = {app:'bounce-apart', version:1, exportedAt:new Date().toISOString()};
    for(const store of db.stores) data[store] = await db.getAll(store);
    const blob = new Blob([JSON.stringify(data, null, 1)], {type:'application/json'});
    const name = `גיבוי-אפרת-${new Date().toISOString().slice(0,10)}.json`;
    const file = new File([blob], name, {type:'application/json'});
    // בטלפון: פותח את תפריט השיתוף (שמירה לדרייב, וואטסאפ לעצמי וכו')
    if(navigator.canShare && navigator.canShare({files:[file]})){
      try{ await navigator.share({files:[file], title:name}); return; }
      catch(e){ if(e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
  }catch(e){
    console.error('export error', e);
    toast('הייצוא לא הצליח');
  }
}

async function importBackup(file){
  try{
    const data = JSON.parse(await file.text());
    if(data.app !== 'bounce-apart') throw new Error('wrong app');
    let count = 0;
    for(const store of db.stores){
      for(const item of (data[store] || [])){ await db.put(store, item); count++; }
    }
    await loadCustomBanks();
    toast(`יובאו ${count} פריטים`);
    loadHistory();
  }catch(e){
    console.error('import error', e);
    toast('הקובץ הזה לא נראה כמו גיבוי של אפר"ת');
  }
}

document.getElementById('export-btn').onclick = exportBackup;
document.getElementById('import-btn').onclick = ()=>document.getElementById('import-file').click();
document.getElementById('import-file').onchange = (e)=>{
  const f = e.target.files[0];
  if(f) importBackup(f);
  e.target.value = '';
};

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(e=>console.error('sw error', e));
}

(async function init(){
  await loadCustomBanks();
  renderStep();
})();
