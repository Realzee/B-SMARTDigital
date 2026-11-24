/**
 * High-Capacity Persistent Storage using IndexedDB with safe LocalStorage fallback
 * Solves QuotaExceededError by providing multi-megabyte/gigabyte storage capacity
 * and safely handling browser storage quotas.
 */

const DB_NAME = 'bsmart_mobile_communicator_db';
const DB_VERSION = 2;
const STORES = [
  'cards',
  'companies',
  'users',
  'leads',
  'sessions',
  'sync_queue',
  'base_snapshots',
  'offline_media',
] as const;

export type StoreName = typeof STORES[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function getIDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        STORES.forEach((store) => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store);
          }
        });
      };

      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      request.onerror = () => {
        console.warn('IndexedDB open error, falling back to safe local storage:', request.error);
        dbPromise = null;
        reject(request.error);
      };
    });
  }

  return dbPromise;
}

/**
 * Safely saves data to IndexedDB (asynchronously, with high capacity)
 */
export async function idbSet<T>(storeName: StoreName, key: string, value: T): Promise<void> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value, key);

      req.onsuccess = () => resolve();
      req.onerror = () => {
        console.warn(`Failed to write to IndexedDB store ${storeName}:`, req.error);
        reject(req.error);
      };
    });
  } catch {
    return Promise.resolve();
  }
}

/**
 * Safely retrieves data from IndexedDB
 */
export async function idbGet<T>(storeName: StoreName, key: string): Promise<T | null> {
  try {
    const db = await getIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);

      req.onsuccess = () => {
        resolve(req.result !== undefined ? (req.result as T) : null);
      };
      req.onerror = () => {
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

/**
 * Retrieves all key/value entries from an IndexedDB store
 */
export async function idbGetAll<T>(storeName: StoreName): Promise<Array<{ key: string; value: T }>> {
  try {
    const db = await getIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const results: Array<{ key: string; value: T }> = [];
      const req = store.openCursor();

      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          results.push({ key: String(cursor.key), value: cursor.value as T });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Safely deletes an item from IndexedDB
 */
export async function idbDelete(storeName: StoreName, key: string): Promise<void> {
  try {
    const db = await getIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);

      req.onsuccess = () => resolve();
      req.onerror = () => {
        console.warn(`Failed to delete key ${key} from IndexedDB store ${storeName}:`, req.error);
        resolve();
      };
    });
  } catch {
    return Promise.resolve();
  }
}

/**
 * Clears all entries in a specific IndexedDB object store
 */
export async function idbClear(storeName: StoreName): Promise<void> {
  try {
    const db = await getIDB();
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    return Promise.resolve();
  }
}

/**
 * Prunes large base64 data URLs from an object for lightweight localStorage fallback,
 * ensuring localStorage never approaches the 5MB quota limit.
 */
function pruneHeavyDataUrls(obj: any, maxDepth = 4): any {
  if (maxDepth <= 0 || obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => pruneHeavyDataUrls(item, maxDepth - 1));
  }

  const result: any = {};
  for (const [key, val] of Object.entries(obj)) {
    // Preserve banner, logo, and avatar images so they remain visible and saved
    if (key === 'imageUrl' || key === 'logoUrl' || key === 'bgImageUrl' || key === 'avatarUrl') {
      result[key] = val;
    } else if (typeof val === 'string' && val.startsWith('data:image/') && val.length > 500000) {
      result[key] = '';
    } else if (typeof val === 'object' && val !== null) {
      result[key] = pruneHeavyDataUrls(val, maxDepth - 1);
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Merges media assets (logos, banners, gallery images) from a backup source into target cards
 * to prevent any accidental data erasure during synchronization or storage migrations.
 */
export function restoreCardMediaAssets<T extends { id: string; logoUrl?: string; banners?: any[]; galleryImages?: string[]; multimedia?: any[]; aboutText?: string }>(
  targetCards: T[],
  sourceCards: T[]
): T[] {
  if (!sourceCards || sourceCards.length === 0) return targetCards;
  const sourceMap = new Map(sourceCards.map((c) => [c.id, c]));

  return targetCards.map((target) => {
    const src = sourceMap.get(target.id);
    if (!src) return target;

    // Check if source has banners but target has none
    const effectiveBanners =
      target.banners && target.banners.length > 0
        ? target.banners
        : src.banners && src.banners.length > 0
        ? src.banners
        : target.banners;

    // Check if source has logoUrl but target has none
    const effectiveLogo = target.logoUrl || src.logoUrl || '';

    // Check gallery: if target explicitly has galleryImages (even empty []), respect it
    const effectiveGallery =
      target.galleryImages !== undefined
        ? target.galleryImages
        : src.galleryImages || [];

    // Check multimedia: if target explicitly has multimedia (even empty []), respect it
    const effectiveMultimedia =
      target.multimedia !== undefined
        ? target.multimedia
        : src.multimedia || [];

    return {
      ...target,
      logoUrl: effectiveLogo,
      banners: effectiveBanners,
      galleryImages: effectiveGallery,
      multimedia: effectiveMultimedia,
      aboutText: target.aboutText || src.aboutText || '',
    };
  });
}

/**
 * Safely sets an item in localStorage without throwing QuotaExceededError.
 * Proactively prunes heavy data URLs when payload exceeds 1.5MB to stay far beneath the 5MB browser limit.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  // If payload is already large (> 900KB), proactively prune heavy base64 data URLs in localStorage
  // (full lossless media remains safely preserved inside IndexedDB)
  let payloadToWrite = value;
  if (value.length > 900000) {
    try {
      const parsed = JSON.parse(value);
      payloadToWrite = JSON.stringify(pruneHeavyDataUrls(parsed));
    } catch {
      // Keep original
    }
  }

  try {
    localStorage.setItem(key, payloadToWrite);
    return true;
  } catch (err: any) {
    // If QuotaExceededError is still encountered
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED';

    if (isQuotaError) {
      try {
        const parsed = JSON.parse(payloadToWrite);
        const compacted = JSON.stringify(pruneHeavyDataUrls(parsed));
        localStorage.setItem(key, compacted);
        return true;
      } catch {
        // As safe fallback to keep browser origin responsive
        try {
          localStorage.removeItem(key);
        } catch {
          // ignore
        }
        return false;
      }
    }
    return false;
  }
}

/**
 * Safely retrieves an item from localStorage
 */
export function safeLocalStorageGet(key: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Deduplicates an array of objects by their `id` property, keeping the first occurrence.
 */
export function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (item && item.id && !seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

/**
 * Deduplicates leads both by their unique ID and by their content fingerprint (name + phone + message)
 */
export function deduplicateLeads(items: any[]): any[] {
  if (!Array.isArray(items)) return [];
  const seenId = new Set<string>();
  const seenContent = new Set<string>();
  const result: any[] = [];
  for (const item of items) {
    if (!item) continue;
    const contentKey = `${(item.name || '').trim().toLowerCase()}|${(item.phone || '').trim()}|${(item.message || '').trim()}`;
    if (item.id && seenId.has(item.id)) continue;
    if (contentKey !== '||' && seenContent.has(contentKey)) continue;
    if (item.id) seenId.add(item.id);
    if (contentKey !== '||') seenContent.add(contentKey);
    result.push(item);
  }
  return result;
}

/**
 * Cleanup any bloated items from localStorage upon application startup
 */
export function cleanupBloatedLocalStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const keysToCheck = ['yebocards_data', 'yebocompanies_data', 'yebousers_data', 'yeboleads_data'];
    for (const k of keysToCheck) {
      const item = localStorage.getItem(k);
      if (item && item.length > 2000000) {
        // Larger than 2MB: compact it immediately so origin quota is healthy
        try {
          const parsed = JSON.parse(item);
          const compacted = JSON.stringify(pruneHeavyDataUrls(parsed));
          localStorage.setItem(k, compacted);
        } catch {
          // Leave it or remove
        }
      }
    }
    // Deduplicate and prune yeboleads_data if bloated with duplicate inquiries
    const leadsRaw = localStorage.getItem('yeboleads_data');
    if (leadsRaw) {
      try {
        const parsed = JSON.parse(leadsRaw);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          const deduped: any[] = [];
          for (const l of parsed) {
            if (!l || !l.id) continue;
            const k = `${l.id}|${(l.name || '').trim().toLowerCase()}|${(l.message || '').trim()}`;
            if (!seen.has(l.id) && !seen.has(k)) {
              seen.add(l.id);
              seen.add(k);
              deduped.push(l);
            }
          }
          localStorage.setItem('yeboleads_data', JSON.stringify(deduped));
        }
      } catch {}
    }
  } catch {
    // Ignore any quota cleanup issues
  }
}
