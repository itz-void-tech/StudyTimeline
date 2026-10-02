// ─── IndexedDB Storage for PDFs ─────────────────────────
// Stores PDF blobs locally in the browser using IndexedDB.
// This is completely free and unlimited, but data only exists
// on this specific browser/device.

const DB_NAME = 'studytimeline-files';
const DB_VERSION = 1;
const STORE_NAME = 'pdfs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Save a PDF file blob to IndexedDB, keyed by material ID */
export async function savePDF(materialId: string, file: File): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(file, materialId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Retrieve a PDF blob from IndexedDB by material ID */
export async function getPDF(materialId: string): Promise<File | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(materialId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/** Delete a PDF blob from IndexedDB */
export async function deletePDF(materialId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(materialId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Get a temporary object URL for a stored PDF (must be revoked after use) */
export async function getPDFUrl(materialId: string): Promise<string | null> {
  const file = await getPDF(materialId);
  if (!file) return null;
  return URL.createObjectURL(file);
}
