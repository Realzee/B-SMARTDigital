import { BusinessCard, Company, LeadInquiry, User } from '../types';
import { idbDelete, idbGet, idbGetAll, idbSet } from './storage';
import {
  dbDeleteCard,
  dbDeleteCompany,
  dbDeleteLead,
  dbDeleteUser,
  dbFetchCards,
  dbFetchCompanies,
  dbFetchLeads,
  dbFetchUsers,
  dbSaveCard,
  dbSaveCompany,
  dbSaveLeadWithMonitor,
  dbSaveUser,
  dbUpdateLead,
  getApiUrl,
} from '../lib/neon';

export type SyncEntityType = 'company' | 'card' | 'user' | 'lead';
export type SyncOperationType = 'upsert' | 'delete';

export interface OfflineSyncOperation {
  id: string; // `${entityType}:${entityId}`
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperationType;
  label: string;
  payload: any;
  baseUpdatedAt?: string;
  baseSnapshot?: any;
  queuedAt: string;
  lastAttemptAt?: string;
  lastError?: string;
}

export interface ConflictFieldDiff {
  field: string;
  label: string;
  localValue: string;
  serverValue: string;
}

export interface SyncConflictItem {
  queueItem: OfflineSyncOperation;
  serverRecord: any | null;
  wasDeletedRemotely: boolean;
  conflictReason: string;
  changedFields: ConflictFieldDiff[];
}

export type ConflictChoice = 'keep_local' | 'use_server';

export interface ServerSyncSnapshot {
  companies: Company[];
  cards: BusinessCard[];
  users: User[];
  leads: LeadInquiry[];
  deletedCompanyIds: string[];
  deletedCardIds: string[];
}

const SYNC_QUEUE_KEY = 'pending_operations_v1';
export const SYNC_QUEUE_EVENT = 'bsmart-sync-queue-updated';

function emitSyncQueueUpdated(queue: OfflineSyncOperation[]) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SYNC_QUEUE_EVENT, { detail: queue }));
  }
}

export async function loadSyncQueue(): Promise<OfflineSyncOperation[]> {
  const stored = await idbGet<OfflineSyncOperation[]>('sync_queue', SYNC_QUEUE_KEY);
  return Array.isArray(stored) ? stored : [];
}

export async function saveSyncQueue(queue: OfflineSyncOperation[]): Promise<void> {
  await idbSet('sync_queue', SYNC_QUEUE_KEY, queue);
  emitSyncQueueUpdated(queue);
}

function getSnapshotKey(entityType: SyncEntityType, entityId: string): string {
  return `${entityType}:${entityId}`;
}

function normalizeComparableRecord(entityType: SyncEntityType, record: any): Record<string, any> {
  if (!record || typeof record !== 'object') return {};
  if (entityType === 'company') {
    return {
      name: record.name || '',
      tagline: record.tagline || '',
      category: record.category || '',
      categoryLabel: record.categoryLabel || '',
      logoUrl: record.logoUrl || '',
      aboutText: record.aboutText || '',
      operatingHours: record.operatingHours || '',
      website: record.website || '',
      phone: record.phone || '',
      email: record.email || '',
      address: record.address || '',
      status: record.status || 'active',
      managementMode: record.managementMode || 'self_managed',
      reportFrequency: record.reportFrequency || 'both',
      reportEmail: record.reportEmail || '',
      theme: record.theme || {},
      modules: record.modules || {},
      subscription: record.subscription || {},
    };
  }
  if (entityType === 'card') {
    return {
      companyId: record.companyId || '',
      slug: record.slug || '',
      businessName: record.businessName || '',
      tagline: record.tagline || '',
      businessType: record.businessType || '',
      businessTypeLabel: record.businessTypeLabel || '',
      contactPersonName: record.contactPersonName || '',
      designation: record.designation || '',
      bio: record.bio || '',
      logoUrl: record.logoUrl || '',
      emergencyPhone: record.emergencyPhone || '',
      aboutText: record.aboutText || '',
      operatingHours: record.operatingHours || '',
      status: record.status || 'live',
      assignedMemberId: record.assignedMemberId || '',
      theme: record.theme || {},
      socialLinks: record.socialLinks || {},
      services: record.services || [],
      banners: record.banners || [],
      galleryImages: record.galleryImages || [],
      multimedia: record.multimedia || [],
    };
  }
  if (entityType === 'user') {
    return {
      name: record.name || '',
      email: (record.email || '').toLowerCase().trim(),
      role: record.role || 'employee',
      companyId: record.companyId || '',
      companyIds: Array.isArray(record.companyIds) ? [...record.companyIds].sort() : [],
      assignedCardId: record.assignedCardId || '',
      status: record.status || 'active',
      phone: record.phone || '',
      designation: record.designation || '',
      avatarUrl: record.avatarUrl || '',
      bio: record.bio || '',
    };
  }
  // lead
  return {
    cardId: record.cardId || '',
    cardName: record.cardName || '',
    companyId: record.companyId || '',
    name: record.name || '',
    email: record.email || '',
    phone: record.phone || '',
    message: record.message || '',
    subject: record.subject || 'General Inquiry',
    preferredContact: record.preferredContact || 'whatsapp',
    preferredTime: record.preferredTime || '',
    status: record.status || 'new',
    notes: record.notes || '',
    followUpDate: record.followUpDate || '',
  };
}

function stableStringify(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val !== 'object') return String(val);
  if (Array.isArray(val)) return `[${val.map(stableStringify).join(',')}]`;
  const keys = Object.keys(val).sort();
  return `{${keys.map((k) => `${k}:${stableStringify(val[k])}`).join(',')}}`;
}

export async function saveCleanBaseSnapshots(
  entityType: SyncEntityType,
  records: any[],
  dirtyKeys: Set<string>
): Promise<void> {
  if (!Array.isArray(records)) return;
  for (const r of records) {
    if (!r || !r.id) continue;
    const key = getSnapshotKey(entityType, r.id);
    if (dirtyKeys.has(key)) continue;
    await idbSet('base_snapshots', key, {
      updatedAt: r.updatedAt || r.createdAt || undefined,
      fingerprint: stableStringify(normalizeComparableRecord(entityType, r)),
      record: r,
    });
  }
}

export async function getBaseSnapshot(
  entityType: SyncEntityType,
  entityId: string
): Promise<{ updatedAt?: string; fingerprint: string; record: any } | null> {
  return await idbGet('base_snapshots', getSnapshotKey(entityType, entityId));
}

export interface EnqueueInput {
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperationType;
  label: string;
  payload: any;
}

export async function enqueueOfflineBatch(items: EnqueueInput[]): Promise<OfflineSyncOperation[]> {
  if (!items || items.length === 0) return await loadSyncQueue();
  const queue = await loadSyncQueue();
  let nextQueue = [...queue];

  for (const item of items) {
    const opId = getSnapshotKey(item.entityType, item.entityId);
    const existingIdx = nextQueue.findIndex((q) => q.id === opId);
    const baseSnap = await getBaseSnapshot(item.entityType, item.entityId);

    // If created completely offline (never existed on server) and now deleted offline, remove from outbox
    if (item.operation === 'delete' && !baseSnap) {
      if (existingIdx >= 0) {
        nextQueue = nextQueue.filter((q) => q.id !== opId);
      }
      continue;
    }

    const nowIso = new Date().toISOString();
    if (existingIdx >= 0) {
      const existing = nextQueue[existingIdx];
      nextQueue[existingIdx] = {
        ...existing,
        operation: item.operation,
        label: item.label || existing.label,
        payload: item.payload,
        queuedAt: nowIso,
        lastError: undefined,
      };
    } else {
      nextQueue.push({
        id: opId,
        entityType: item.entityType,
        entityId: item.entityId,
        operation: item.operation,
        label: item.label,
        payload: item.payload,
        baseUpdatedAt: baseSnap?.updatedAt,
        baseSnapshot: baseSnap?.record,
        queuedAt: nowIso,
      });
    }
  }

  await saveSyncQueue(nextQueue);
  return nextQueue;
}

export async function enqueueOfflineChange(item: EnqueueInput): Promise<OfflineSyncOperation[]> {
  return await enqueueOfflineBatch([item]);
}

export async function removeQueuedOperation(opId: string): Promise<OfflineSyncOperation[]> {
  const queue = await loadSyncQueue();
  const next = queue.filter((q) => q.id !== opId);
  await saveSyncQueue(next);
  return next;
}

export async function clearSyncQueue(): Promise<void> {
  await saveSyncQueue([]);
}

function summarizeVal(v: any): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'string') {
    if (v.startsWith('data:image/')) return '[Uploaded Image]';
    return v.length > 90 ? `${v.slice(0, 87)}...` : v;
  }
  if (Array.isArray(v)) return `${v.length} item(s)`;
  if (typeof v === 'object') {
    const keys = Object.keys(v).filter((k) => v[k] !== undefined && v[k] !== '');
    return `${keys.length} field(s) configured`;
  }
  return String(v);
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  businessName: 'Business / Card Name',
  tagline: 'Tagline',
  categoryLabel: 'Category',
  contactPersonName: 'Contact Person',
  designation: 'Designation',
  slug: 'Card Slug',
  email: 'Email',
  phone: 'Phone',
  website: 'Website',
  address: 'Address',
  aboutText: 'About Text',
  operatingHours: 'Operating Hours',
  status: 'Status',
  assignedMemberId: 'Assigned Member',
  assignedCardId: 'Assigned Card',
  companyId: 'Company',
  notes: 'Follow-Up Notes',
  followUpDate: 'Follow-Up Date',
  preferredTime: 'Preferred Time',
  preferredContact: 'Preferred Contact',
  message: 'Enquiry Message',
  subject: 'Subject',
  logoUrl: 'Logo',
  avatarUrl: 'Avatar Photo',
  theme: 'Theme & Styling',
  socialLinks: 'Contact & Social Links',
  services: 'Services',
  banners: 'Banners',
  galleryImages: 'Gallery Images',
  multimedia: 'Multimedia',
  reportFrequency: 'Report Frequency',
  reportEmail: 'Report Email',
  managementMode: 'Management Mode',
};

function computeFieldDiffs(entityType: SyncEntityType, localRec: any, serverRec: any): ConflictFieldDiff[] {
  const normLocal = normalizeComparableRecord(entityType, localRec);
  const normServer = normalizeComparableRecord(entityType, serverRec);
  const keys = Array.from(new Set([...Object.keys(normLocal), ...Object.keys(normServer)]));
  const diffs: ConflictFieldDiff[] = [];

  for (const field of keys) {
    if (stableStringify(normLocal[field]) !== stableStringify(normServer[field])) {
      diffs.push({
        field,
        label: FIELD_LABELS[field] || field,
        localValue: summarizeVal(normLocal[field]),
        serverValue: summarizeVal(normServer[field]),
      });
    }
  }
  return diffs;
}

export async function fetchServerSyncSnapshot(): Promise<ServerSyncSnapshot> {
  const [companies, cards, users, leads] = await Promise.all([
    dbFetchCompanies(),
    dbFetchCards(),
    dbFetchUsers(),
    dbFetchLeads(),
  ]);

  let deletedCompanyIds: string[] = [];
  let deletedCardIds: string[] = [];
  try {
    deletedCompanyIds = JSON.parse(localStorage.getItem('yebo_deleted_company_ids') || '[]');
    deletedCardIds = JSON.parse(localStorage.getItem('yebo_deleted_card_ids') || '[]');
  } catch {
    // ignore
  }

  return {
    companies,
    cards,
    users,
    leads,
    deletedCompanyIds,
    deletedCardIds,
  };
}

function findServerRecord(
  op: OfflineSyncOperation,
  snapshot: ServerSyncSnapshot
): any | null {
  if (op.entityType === 'company') {
    return snapshot.companies.find((c) => c.id === op.entityId) || null;
  }
  if (op.entityType === 'card') {
    return snapshot.cards.find((c) => c.id === op.entityId) || null;
  }
  if (op.entityType === 'user') {
    return snapshot.users.find((u) => u.id === op.entityId) || null;
  }
  return snapshot.leads.find((l) => l.id === op.entityId) || null;
}

export function detectSyncConflicts(
  queue: OfflineSyncOperation[],
  snapshot: ServerSyncSnapshot
): {
  readyItems: OfflineSyncOperation[];
  conflicts: SyncConflictItem[];
} {
  const readyItems: OfflineSyncOperation[] = [];
  const conflicts: SyncConflictItem[] = [];

  for (const op of queue) {
    const serverRec = findServerRecord(op, snapshot);
    const baseRec = op.baseSnapshot;

    // 1. Delete operation
    if (op.operation === 'delete') {
      if (!serverRec) {
        // Already deleted remotely — no conflict
        readyItems.push(op);
        continue;
      }
      if (baseRec) {
        const baseFp = stableStringify(normalizeComparableRecord(op.entityType, baseRec));
        const serverFp = stableStringify(normalizeComparableRecord(op.entityType, serverRec));
        if (baseFp !== serverFp) {
          conflicts.push({
            queueItem: op,
            serverRecord: serverRec,
            wasDeletedRemotely: false,
            conflictReason: 'This record was updated on the server after you queued it for deletion offline.',
            changedFields: [
              {
                field: '_action',
                label: 'Action',
                localValue: 'Delete Record',
                serverValue: `Keep Modified Record (${serverRec.updatedAt ? new Date(serverRec.updatedAt).toLocaleString() : 'Updated on server'})`,
              },
            ],
          });
          continue;
        }
      }
      readyItems.push(op);
      continue;
    }

    // 2. Upsert operation
    if (!baseRec) {
      // Newly created offline; only conflicts if server unexpectedly has same ID
      if (serverRec) {
        const diffs = computeFieldDiffs(op.entityType, op.payload, serverRec);
        if (diffs.length > 0) {
          conflicts.push({
            queueItem: op,
            serverRecord: serverRec,
            wasDeletedRemotely: false,
            conflictReason: 'A record with the same ID already exists on the server.',
            changedFields: diffs,
          });
          continue;
        }
      }
      readyItems.push(op);
      continue;
    }

    // Existing record was edited offline
    if (!serverRec) {
      conflicts.push({
        queueItem: op,
        serverRecord: null,
        wasDeletedRemotely: true,
        conflictReason: 'This record was deleted on the server while you edited it offline.',
        changedFields: [
          {
            field: '_deleted',
            label: 'Record Status',
            localValue: 'Edited Offline (Restore / Recreate)',
            serverValue: 'Deleted on Server',
          },
        ],
      });
      continue;
    }

    const baseFp = stableStringify(normalizeComparableRecord(op.entityType, baseRec));
    const serverFp = stableStringify(normalizeComparableRecord(op.entityType, serverRec));
    const localFp = stableStringify(normalizeComparableRecord(op.entityType, op.payload));

    if (serverFp === localFp) {
      // Server already matches our local edit
      readyItems.push(op);
      continue;
    }

    if (serverFp !== baseFp) {
      // Server changed since our offline edit started
      const diffs = computeFieldDiffs(op.entityType, op.payload, serverRec);
      if (diffs.length > 0) {
        conflicts.push({
          queueItem: op,
          serverRecord: serverRec,
          wasDeletedRemotely: false,
          conflictReason: 'Modified on another device or session since your last sync.',
          changedFields: diffs,
        });
        continue;
      }
    }

    readyItems.push(op);
  }

  return { readyItems, conflicts };
}

async function uploadOfflineImageIfDataUrl(
  value: string | undefined,
  type: 'logo' | 'banner' | 'avatar',
  prefix: string
): Promise<string> {
  if (!value || !value.startsWith('data:image/')) return value || '';
  try {
    const res = await fetch(getApiUrl('/api/upload'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: value,
        filename: `${prefix}-${Date.now()}.jpg`,
        type,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.url) return data.url;
    }
  } catch {
    // Non-blocking: backend also accepts data URLs directly if upload fails
  }
  return value;
}

async function preparePayloadMediaForServer(op: OfflineSyncOperation): Promise<any> {
  if (op.operation !== 'upsert' || !op.payload) return op.payload;
  const clone = { ...op.payload };

  if (op.entityType === 'company') {
    if (clone.logoUrl?.startsWith('data:image/')) {
      clone.logoUrl = await uploadOfflineImageIfDataUrl(clone.logoUrl, 'logo', 'company-logo');
    }
    if (clone.theme?.bgImageUrl?.startsWith('data:image/')) {
      clone.theme = {
        ...clone.theme,
        bgImageUrl: await uploadOfflineImageIfDataUrl(clone.theme.bgImageUrl, 'banner', 'company-bg'),
      };
    }
  } else if (op.entityType === 'card') {
    if (clone.logoUrl?.startsWith('data:image/')) {
      clone.logoUrl = await uploadOfflineImageIfDataUrl(clone.logoUrl, 'logo', 'card-logo');
    }
    if (clone.theme?.bgImageUrl?.startsWith('data:image/')) {
      clone.theme = {
        ...clone.theme,
        bgImageUrl: await uploadOfflineImageIfDataUrl(clone.theme.bgImageUrl, 'banner', 'card-bg'),
      };
    }
    if (Array.isArray(clone.banners)) {
      clone.banners = await Promise.all(
        clone.banners.map(async (b: any, i: number) =>
          b?.imageUrl?.startsWith('data:image/')
            ? { ...b, imageUrl: await uploadOfflineImageIfDataUrl(b.imageUrl, 'banner', `banner-${i}`) }
            : b
        )
      );
    }
    if (Array.isArray(clone.galleryImages)) {
      clone.galleryImages = await Promise.all(
        clone.galleryImages.map((g: string, i: number) =>
          typeof g === 'string' && g.startsWith('data:image/')
            ? uploadOfflineImageIfDataUrl(g, 'banner', `gallery-${i}`)
            : g
        )
      );
    }
  } else if (op.entityType === 'user') {
    if (clone.avatarUrl?.startsWith('data:image/')) {
      clone.avatarUrl = await uploadOfflineImageIfDataUrl(clone.avatarUrl, 'avatar', 'avatar');
    }
  }
  return clone;
}

export async function executeResolvedSync(
  queue: OfflineSyncOperation[],
  resolutions: Record<string, ConflictChoice>,
  serverSnapshot: ServerSyncSnapshot
): Promise<{
  syncedCount: number;
  keptServerCount: number;
  failedItems: OfflineSyncOperation[];
  remainingQueue: OfflineSyncOperation[];
}> {
  // Process entities in dependency-safe order: companies -> cards -> users -> leads (upserts before deletes, except deletes clean up cleanly)
  const orderWeight: Record<SyncEntityType, number> = {
    company: 1,
    card: 2,
    user: 3,
    lead: 4,
  };

  const ordered = [...queue].sort((a, b) => {
    if (a.operation !== b.operation) {
      return a.operation === 'upsert' ? -1 : 1;
    }
    return orderWeight[a.entityType] - orderWeight[b.entityType];
  });

  let syncedCount = 0;
  let keptServerCount = 0;
  const failedItems: OfflineSyncOperation[] = [];
  const nextQueue: OfflineSyncOperation[] = [];

  for (const op of ordered) {
    const choice = resolutions[op.id];
    if (choice === 'use_server') {
      keptServerCount += 1;
      const serverRec = findServerRecord(op, serverSnapshot);
      if (serverRec) {
        await idbSet('base_snapshots', op.id, {
          updatedAt: serverRec.updatedAt || serverRec.createdAt,
          fingerprint: stableStringify(normalizeComparableRecord(op.entityType, serverRec)),
          record: serverRec,
        });
      } else {
        await idbDelete('base_snapshots', op.id);
      }
      continue;
    }

    let ok = false;
    let errorMsg = '';

    try {
      if (op.operation === 'delete') {
        if (op.entityType === 'company') ok = await dbDeleteCompany(op.entityId);
        else if (op.entityType === 'card') ok = await dbDeleteCard(op.entityId);
        else if (op.entityType === 'user') ok = await dbDeleteUser(op.entityId);
        else if (op.entityType === 'lead') ok = await dbDeleteLead(op.entityId);

        if (ok) {
          await idbDelete('base_snapshots', op.id);
        }
      } else {
        const prepared = await preparePayloadMediaForServer(op);
        if (op.entityType === 'company') {
          ok = await dbSaveCompany(prepared);
        } else if (op.entityType === 'card') {
          ok = await dbSaveCard(prepared);
        } else if (op.entityType === 'user') {
          ok = await dbSaveUser(prepared);
        } else if (op.entityType === 'lead') {
          const existsOnServer = serverSnapshot.leads.some((l) => l.id === op.entityId);
          if (existsOnServer) {
            const patchRes = await dbUpdateLead(op.entityId, prepared);
            ok = patchRes.ok;
          } else {
            const postRes = await dbSaveLeadWithMonitor(prepared);
            ok = postRes.ok;
          }
        }

        if (ok) {
          await idbSet('base_snapshots', op.id, {
            updatedAt: prepared.updatedAt || new Date().toISOString(),
            fingerprint: stableStringify(normalizeComparableRecord(op.entityType, prepared)),
            record: prepared,
          });
        }
      }
    } catch (err: any) {
      ok = false;
      errorMsg = err?.message || 'Network or server error during sync';
    }

    if (ok) {
      syncedCount += 1;
    } else {
      const updatedFailed: OfflineSyncOperation = {
        ...op,
        lastAttemptAt: new Date().toISOString(),
        lastError: errorMsg || 'Server rejected or connection interrupted during sync',
      };
      failedItems.push(updatedFailed);
      nextQueue.push(updatedFailed);
    }
  }

  await saveSyncQueue(nextQueue);
  return {
    syncedCount,
    keptServerCount,
    failedItems,
    remainingQueue: nextQueue,
  };
}
