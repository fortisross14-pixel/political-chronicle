const DB_NAME = 'political-chronicle-db';
const DB_VERSION = 1;
const STORE = 'worlds';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open save database'));
  });
}

async function transact(mode, callback) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    let request;
    try { request = callback(store); }
    catch (error) { db.close(); reject(error); return; }
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error || new Error('Save operation failed'));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error('Save transaction failed')); };
  });
}

export async function saveWorld(key, world) {
  const payload = { savedAt: Date.now(), meta: { year: world.date.year, week: world.date.week, seed: world.seed, activePoliticians: world.politicians.filter((p) => p.status === 'Active').length, presidentName: world.politicians.find((p) => p.id === world.government.presidentId)?.name || 'Unknown' }, world };
  return transact('readwrite', (store) => store.put(payload, key));
}

export async function loadWorld(key) {
  const payload = await transact('readonly', (store) => store.get(key));
  return payload?.world || null;
}

export async function deleteWorld(key) {
  return transact('readwrite', (store) => store.delete(key));
}

export async function getSaveMetadata(keys) {
  const entries = await Promise.all(keys.map(async (key) => {
    try {
      const payload = await transact('readonly', (store) => store.get(key));
      return [key, payload ? { ...payload.meta, savedAt: payload.savedAt } : null];
    } catch {
      return [key, null];
    }
  }));
  return Object.fromEntries(entries);
}
