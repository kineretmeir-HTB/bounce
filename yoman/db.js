// עטיפה קטנה סביב IndexedDB - השמירה הקבועה במכשיר
const DB_NAME = 'bounce-yoman';
const DB_VERSION = 1;
const STORES = ['entries', 'photos'];

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      STORES.forEach(name => {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(store, mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const result = fn(t.objectStore(store));
    t.oncomplete = () => resolve(result && 'result' in result ? result.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const db = {
  getAll: (store) => tx(store, 'readonly', s => s.getAll()),
  get: (store, id) => tx(store, 'readonly', s => s.get(id)),
  put: (store, value) => tx(store, 'readwrite', s => s.put(value)),
  delete: (store, id) => tx(store, 'readwrite', s => s.delete(id)),
  clear: (store) => tx(store, 'readwrite', s => s.clear()),
  stores: STORES,
};

// בקשה מכרום לא למחוק את הנתונים לעולם
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}
