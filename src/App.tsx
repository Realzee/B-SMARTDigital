import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CreditCard,
  Users,
  MessageSquare,
  Plus,
  Shield,
  Smartphone,
  Tablet,
  Monitor,
  ExternalLink,
  Edit,
  Eye,
  Trash2,
  Share2,
  Database,
  LogIn,
  LogOut,
  ScanFace,
  Sparkles,
  Check,
  Copy,
  Clock,
  QrCode,
  KeyRound,
  Info,
  Phone,
  MessageCircle,
  Upload,
  UserCheck,
  UserX,
  UserPlus,
  Link,
  Unlink,
  AlertCircle,
  Building2,
  ShieldCheck,
  ArrowLeft,
  Search,
  Filter,
  Globe,
  MapPin,
  Mail,
  FolderPlus,
  Layers,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  Menu,
  X,
  BookOpen,
  HelpCircle,
  Server,
  Download,
  BellRing,
} from 'lucide-react';

import { BusinessCard, Company, LeadInquiry, LeadStatus, User } from './types';
import { INITIAL_COMPANIES, INITIAL_CARDS, INITIAL_USERS, INITIAL_LEADS } from './data/defaultCards';
import { CardView } from './components/CardView';
import { CardsManager } from './components/CardsManager';
import { CardEditor } from './components/CardEditor';
import { AdminMembers } from './components/AdminMembers';
import { LeadsManager } from './components/LeadsManager';
import { AuthModal } from './components/AuthModal';
import { AdminLoginView } from './components/AdminLoginView';
import { AllocateCardModal } from './components/AllocateCardModal';
import { IssueEmployeeCardModal } from './components/IssueEmployeeCardModal';
import { CompanyModal } from './components/CompanyModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { CompanySignUpModal } from './components/CompanySignUpModal';
import { CompanyApprovalModal } from './components/CompanyApprovalModal';
import { PaymentReminderModal } from './components/PaymentReminderModal';
import { DatabaseSyncModal } from './components/DatabaseSyncModal';
import { DatabaseSaveConfirmModal } from './components/DatabaseSaveConfirmModal';
import { OnboardingWizardModal } from './components/OnboardingWizardModal';
import { HelpGuideModal } from './components/HelpGuideModal';
import { ThemeToggle } from './components/ThemeToggle';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineSyncIndicator } from './components/OfflineSyncIndicator';
import { SyncConflictModal } from './components/SyncConflictModal';
import { BSmartLogo } from './components/BSmartLogo';
import { LandingPage } from './components/LandingPage';
import { PoweredByBSmart } from './components/PoweredByBSmart';
import { useTheme } from './context/ThemeContext';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  dbFetchCards,
  dbSaveCard,
  dbDeleteCard,
  dbIncrementCardMetric,
  dbFetchUsers,
  dbSaveUser,
  dbDeleteUser,
  dbFetchLeads,
  dbSaveLead,
  dbSaveLeadWithMonitor,
  dbUpdateLeadStatus,
  dbUpdateLead,
  dbDeleteLead,
  seedCentralDatabaseIfNeeded,
  dbFetchCardBySlugOrId,
  subscribeToCentralDatabase,
  dbFetchCompanies,
  dbSaveCompanies,
  dbSaveCompany,
  dbDeleteCompany,
} from './lib/neon';
import {
  idbSet,
  idbGet,
  idbDelete,
  safeLocalStorageSet,
  safeLocalStorageGet,
  cleanupBloatedLocalStorage,
  restoreCardMediaAssets,
  deduplicateById,
  deduplicateLeads,
} from './utils/storage';
import {
  ConflictChoice,
  EnqueueInput,
  OfflineSyncOperation,
  SYNC_QUEUE_EVENT,
  ServerSyncSnapshot,
  SyncConflictItem,
  detectSyncConflicts,
  enqueueOfflineBatch,
  enqueueOfflineChange,
  executeResolvedSync,
  fetchServerSyncSnapshot,
  loadSyncQueue,
  removeQueuedOperation,
  saveCleanBaseSnapshots,
} from './utils/offlineSync';
import { getCardShareUrl, getCardDisplayPath } from './utils/cardUrl';
import {
  normalizeEmail,
  ensureUniqueSlug,
  isMasterTemplateCard,
  getUserCompanyIds,
  syncUserCompanies,
  deduplicateUsers,
  deduplicateCards,
  reconcileLinks,
} from './utils/linking';

// Run storage cleanup immediately on module evaluation
cleanupBloatedLocalStorage();

function getDeletedUserIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem('yebo_deleted_user_ids') || '[]');
  } catch {
    return [];
  }
}

function getDeletedCardIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem('yebo_deleted_card_ids') || '[]');
  } catch {
    return [];
  }
}

function getDeletedCompanyIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem('yebo_deleted_company_ids') || '[]');
  } catch {
    return [];
  }
}

function markCompanyAsDeleted(companyId: string): void {
  try {
    const current = getDeletedCompanyIds();
    if (!current.includes(companyId)) {
      localStorage.setItem('yebo_deleted_company_ids', JSON.stringify([...current, companyId]));
    }
  } catch (e) {
    console.warn('Failed to mark company as deleted:', e);
  }
}

function markCardAsDeleted(cardId: string): void {
  try {
    const current = getDeletedCardIds();
    if (!current.includes(cardId)) {
      localStorage.setItem('yebo_deleted_card_ids', JSON.stringify([...current, cardId]));
    }
  } catch (e) {
    console.warn('Failed to mark card as deleted:', e);
  }
}

function unmarkCardAsDeleted(cardId: string): void {
  try {
    const current = getDeletedCardIds();
    localStorage.setItem('yebo_deleted_card_ids', JSON.stringify(current.filter((id) => id !== cardId)));
  } catch (e) {
    console.warn('Failed to unmark card from deleted list:', e);
  }
}

function sanitizeCardMetrics(cardList: BusinessCard[]): BusinessCard[] {
  return cardList.map((c) => {
    const isMockViews = c.viewsCount === 3400 || c.viewsCount === 1890 || c.viewsCount === 1420;
    const isMockShares = c.sharesCount === 290 || c.sharesCount === 160 || c.sharesCount === 115 || c.sharesCount === 120 || c.sharesCount === 85;
    const isMockCalls = c.callClicksCount === 310 || c.callClicksCount === 220 || c.callClicksCount === 165 || c.callClicksCount === 95 || c.callClicksCount === 65;
    const isMockWA = c.whatsappClicksCount === 420 || c.whatsappClicksCount === 290 || c.whatsappClicksCount === 210 || c.whatsappClicksCount === 140 || c.whatsappClicksCount === 110;
    const isMockVcard = c.vcardDownloadsCount === 260 || c.vcardDownloadsCount === 195 || c.vcardDownloadsCount === 140 || c.vcardDownloadsCount === 88 || c.vcardDownloadsCount === 62;
    return {
      ...c,
      viewsCount: isMockViews ? 0 : (c.viewsCount || 0),
      sharesCount: isMockShares ? 0 : (c.sharesCount || 0),
      callClicksCount: isMockCalls ? 0 : (c.callClicksCount || 0),
      whatsappClicksCount: isMockWA ? 0 : (c.whatsappClicksCount || 0),
      vcardDownloadsCount: isMockVcard ? 0 : (c.vcardDownloadsCount || 0),
    };
  });
}

export default function App() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Persistence state for companies
  const [companies, setCompanies] = useState<Company[]>(() => {
    try {
      const saved = safeLocalStorageGet('yebocompanies_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        const deletedCompIds = getDeletedCompanyIds();
        if (Array.isArray(parsed) && parsed.length > 0) {
          return deduplicateById(parsed.filter((c: Company) => !deletedCompIds.includes(c.id)));
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_COMPANIES;
  });

  // Persistence state for cards
  const [cards, setCards] = useState<BusinessCard[]>(() => {
    try {
      const saved = safeLocalStorageGet('yebocards_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        const deletedCardIds = getDeletedCardIds();
        if (Array.isArray(parsed) && parsed.length > 0) {
          return deduplicateCards(parsed, deletedCardIds);
        }
      }
    } catch {
      // ignore
    }
    return deduplicateCards(INITIAL_CARDS, getDeletedCardIds());
  });

  // Persistence state for users
  const [users, setUsers] = useState<User[]>(() => {
    const deletedUserIds = getDeletedUserIds();
    try {
      const saved = safeLocalStorageGet('yebousers_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = [...parsed];
          for (const initUser of INITIAL_USERS) {
            if (deletedUserIds.includes(initUser.id)) continue;
            if (
              !merged.some(
                (u) =>
                  normalizeEmail(u.email) === normalizeEmail(initUser.email) ||
                  u.id === initUser.id
              )
            ) {
              merged.push(initUser);
            }
          }
          return deduplicateUsers(merged, deletedUserIds);
        }
      }
    } catch {
      // ignore
    }
    return deduplicateUsers(INITIAL_USERS, deletedUserIds);
  });

  // Persistence state for leads
  const [leads, setLeads] = useState<LeadInquiry[]>(() => {
    try {
      const saved = safeLocalStorageGet('yeboleads_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return deduplicateLeads(parsed);
      }
    } catch {
      // ignore
    }
    return INITIAL_LEADS;
  });

  // Track whether initial high-capacity storage hydration has completed
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  // Current logged in administrator (must be logged in before accessing the system)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedSession = localStorage.getItem('yebo_admin_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.role === 'admin') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Session parse error:', e);
    }
    return null;
  });

  // Active view: 'dashboard' | 'editor' | 'members' | 'leads' | 'preview_standalone'
  const [activeView, setActiveView] = useState<'dashboard' | 'editor' | 'members' | 'leads' | 'preview_standalone' | 'cards'>(() => {
    try {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const cardMatch = path.match(/\/card\/([a-zA-Z0-9_.-]+)/);
      const paramSlug = searchParams.get('card') || searchParams.get('slug') || searchParams.get('id');
      const hashMatch = hash.match(/#\/?card\/([a-zA-Z0-9_.-]+)/);
      if (cardMatch || paramSlug || hashMatch) {
        return 'preview_standalone';
      }
    } catch {
      // ignore
    }
    return 'dashboard';
  });

  const [isUrlCardLoading, setIsUrlCardLoading] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      return !!(path.match(/\/card\/([a-zA-Z0-9_.-]+)/) || searchParams.get('card') || searchParams.get('slug') || searchParams.get('id') || hash.match(/#\/?card\/([a-zA-Z0-9_.-]+)/));
    } catch {
      return false;
    }
  });

  // Route detection: whether viewing the management App (/app) or the public Landing Page (/)
  const [isAppRoute, setIsAppRoute] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return true;
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      if (
        path.startsWith('/app') ||
        path.includes('/card/') ||
        searchParams.get('card') ||
        searchParams.get('slug') ||
        searchParams.get('view') === 'app' ||
        hash.includes('card')
      ) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleUrlSync = () => {
      const path = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      if (
        path.startsWith('/app') ||
        path.includes('/card/') ||
        searchParams.get('card') ||
        searchParams.get('slug') ||
        searchParams.get('view') === 'app'
      ) {
        setIsAppRoute(true);
      } else {
        setIsAppRoute(false);
      }
    };
    window.addEventListener('popstate', handleUrlSync);
    return () => window.removeEventListener('popstate', handleUrlSync);
  }, []);
  // Navigation inside company hierarchy:
  // selectedCompanyId === null -> Main Home Page (Company Directory only)
  // selectedCompanyId !== null -> Inside a Company Workspace (Cards, Details, Editing)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Selected card for preview or editing inside a company
  const [selectedCardId, setSelectedCardId] = useState<string>(() => {
    try {
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const cardMatch = path.match(/\/card\/([a-zA-Z0-9_.-]+)/);
      const paramSlug = searchParams.get('card') || searchParams.get('slug') || searchParams.get('id');
      const hashMatch = hash.match(/#\/?card\/([a-zA-Z0-9_.-]+)/);
      const targetSlug = cardMatch?.[1] || paramSlug || hashMatch?.[1];
      if (targetSlug) {
        const norm = targetSlug.toLowerCase().trim();
        const cleanNorm = norm.replace(/[^a-z0-9]/g, '');
        const saved = safeLocalStorageGet('yebocards_data');
        const list: BusinessCard[] = saved ? JSON.parse(saved) : INITIAL_CARDS;
        const found = list.find(
          (c) =>
            c.id === targetSlug ||
            c.slug.toLowerCase().trim() === norm ||
            c.slug.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanNorm
        );
        if (found) return found.id;
        const initFound = INITIAL_CARDS.find(
          (c) =>
            c.id === targetSlug ||
            c.slug.toLowerCase().trim() === norm ||
            c.slug.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanNorm
        );
        if (initFound) return initFound.id;
        return targetSlug;
      }
    } catch {
      // ignore
    }
    return INITIAL_CARDS[0]?.id || '';
  });
  const [editingCard, setEditingCard] = useState<BusinessCard | null>(null);

  // Company Workspace tab: 'allocated' | 'employees' | 'template' | 'cards'
  const [companyWorkspaceTab, setCompanyWorkspaceTab] = useState<'allocated' | 'employees' | 'template' | 'cards'>('allocated');
  const [showLinkEmployeeModal, setShowLinkEmployeeModal] = useState<boolean>(false);
  const [linkEmployeeSearch, setLinkEmployeeSearch] = useState<string>('');

  // Modals & form states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showIssueEmployeeModal, setShowIssueEmployeeModal] = useState(false);
  const [issueCardTargetUser, setIssueCardTargetUser] = useState<User | null>(null);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [allocateModalMode, setAllocateModalMode] = useState<'single' | 'bulk'>('single');
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [showCompanySignUpModal, setShowCompanySignUpModal] = useState<boolean>(false);
  const [showCompanyApprovalModal, setShowCompanyApprovalModal] = useState<boolean>(false);
  const [companyForApproval, setCompanyForApproval] = useState<Company | null>(null);
  const [showPaymentReminderModal, setShowPaymentReminderModal] = useState<boolean>(false);
  const [companyForPaymentReminder, setCompanyForPaymentReminder] = useState<Company | null>(null);
  const [companyStatusFilter, setCompanyStatusFilter] = useState<'all' | 'pending' | 'active' | 'inactive'>('all');
  const [cardToAllocate, setCardToAllocate] = useState<BusinessCard | null>(null);
  const [cardToDelete, setCardToDelete] = useState<BusinessCard | null>(null);
  const [showOnboardingWizardModal, setShowOnboardingWizardModal] = useState<boolean>(false);
  const [showHelpGuideModal, setShowHelpGuideModal] = useState<boolean>(false);
  const [previewSectionScale, setPreviewSectionScale] = useState<'standard' | 'large' | 'xl'>('large');
  const [toastMessage, setToastMessage] = useState('');
  const [dbOnline, setDbOnline] = useState<boolean>(true);
  const [isSyncingDb, setIsSyncingDb] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Database Action Confirmation Modal State (Enforces explicit confirmation before database saves)
  const [saveConfirmModalConfig, setSaveConfirmModalConfig] = useState<{
    isOpen: boolean;
    title?: string;
    entityName: string;
    entityType: 'card' | 'company' | 'member' | 'lead' | 'employee';
    actionType: 'create' | 'update';
    detailsSummary?: string;
    onSaveLocally: () => Promise<void> | void;
    onSaveAndSyncImmediately: () => Promise<void> | void;
  } | null>(null);

  // Database Sync Authorization Modal State (Enforces admin password confirmation for cPanel syncs)
  const [dbSyncModalConfig, setDbSyncModalConfig] = useState<{
    isOpen: boolean;
    title?: string;
    description?: string;
    targetDetails?: string;
    onConfirmSync: (adminPassword: string) => Promise<boolean | void> | boolean | void;
  } | null>(null);

  // Search & Filter state for companies home page
  const [searchCompanyQuery, setSearchCompanyQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  const { isOnline, isChecking: isCheckingNetwork, checkNow: checkConnectionNow } = useOnlineStatus();
  const [syncQueue, setSyncQueue] = useState<OfflineSyncOperation[]>([]);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);
  const [showConflictModal, setShowConflictModal] = useState<boolean>(false);
  const [pendingSyncConflictState, setPendingSyncConflictState] = useState<{
    queue: OfflineSyncOperation[];
    conflicts: SyncConflictItem[];
    readyCount: number;
    snapshot: ServerSyncSnapshot;
  } | null>(null);

  const prevOnlineRef = useRef<boolean>(isOnline);

  // Sync dbOnline badge with accurate useOnlineStatus()
  useEffect(() => {
    setDbOnline(isOnline);
  }, [isOnline]);

  // Load & subscribe to offline sync queue updates in IndexedDB
  useEffect(() => {
    let active = true;
    loadSyncQueue()
      .then((q) => {
        if (active) setSyncQueue(q);
      })
      .catch(console.warn);

    const handleQueueUpdate = (e: Event) => {
      const detail = (e as CustomEvent<OfflineSyncOperation[]>).detail;
      if (Array.isArray(detail)) {
        setSyncQueue(detail);
      } else {
        loadSyncQueue().then(setSyncQueue).catch(console.warn);
      }
    };

    window.addEventListener(SYNC_QUEUE_EVENT, handleQueueUpdate);
    return () => {
      active = false;
      window.removeEventListener(SYNC_QUEUE_EVENT, handleQueueUpdate);
    };
  }, []);

  // Reconnect transition: NEVER auto-upload; notify user to tap Sync Now
  useEffect(() => {
    if (!prevOnlineRef.current && isOnline && syncQueue.length > 0) {
      setToastMessage(
        `Connection restored — tap Sync Now to upload ${syncQueue.length} pending offline change(s).`
      );
      setTimeout(() => setToastMessage(''), 5000);
    }
    prevOnlineRef.current = isOnline;
  }, [isOnline, syncQueue.length]);

  const lastSyncTimestampRef = useRef<number>(0);
  const allocatingEmployeeIdsRef = useRef<Set<string>>(new Set());

  // Master Central Database Synchronization (Queue-safe local-first merge + clean base snapshot capture)
  const syncCentralDatabase = useCallback(async (isManual = false) => {
    const now = Date.now();
    if (!isManual && now - lastSyncTimestampRef.current < 8000) {
      return; // Skip rapid duplicates within 8s
    }
    lastSyncTimestampRef.current = now;

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setDbOnline(false);
      return;
    }

    setIsSyncingDb(true);
    try {
      const reachable = await checkConnectionNow();
      if (!reachable) {
        setDbOnline(false);
        if (isManual) {
          setToastMessage('Device is offline — working seamlessly from local IndexedDB storage.');
          setTimeout(() => setToastMessage(''), 3500);
        }
        return;
      }

      const activeQueue = await loadSyncQueue();
      const dirtyKeys = new Set(activeQueue.map((q) => q.id));

      // Fetch all entities from Central DB in parallel
      const [realCompanies, realCards, realUsers, realLeads] = await Promise.all([
        dbFetchCompanies(),
        dbFetchCards(),
        dbFetchUsers(),
        dbFetchLeads(),
      ]);

      const deletedCompIds = getDeletedCompanyIds();
      const deletedCardIds = getDeletedCardIds();
      const deletedUserIds = getDeletedUserIds();

      // Merge companies while preserving any queued offline edits/deletes
      let rawCompanies = realCompanies
        ? deduplicateById(realCompanies.filter((c) => !deletedCompIds.includes(c.id)))
        : undefined;
      if (rawCompanies) {
        for (const q of activeQueue.filter((op) => op.entityType === 'company')) {
          if (q.operation === 'delete') {
            rawCompanies = rawCompanies.filter((c) => c.id !== q.entityId);
          } else if (q.payload) {
            const exists = rawCompanies.some((c) => c.id === q.entityId);
            rawCompanies = exists
              ? rawCompanies.map((c) => (c.id === q.entityId ? q.payload : c))
              : [q.payload, ...rawCompanies];
          }
        }
      }

      // Merge cards & templates while preserving any queued offline edits/deletes
      let rawCards = realCards
        ? sanitizeCardMetrics(
            realCards.filter(
              (c) => !deletedCardIds.includes(c.id) && c.slug !== 'system-companies-registry'
            )
          )
        : undefined;
      if (rawCards) {
        for (const q of activeQueue.filter((op) => op.entityType === 'card')) {
          if (q.operation === 'delete') {
            rawCards = rawCards.filter((c) => c.id !== q.entityId);
          } else if (q.payload) {
            const exists = rawCards.some((c) => c.id === q.entityId);
            rawCards = exists
              ? rawCards.map((c) => (c.id === q.entityId ? q.payload : c))
              : [q.payload, ...rawCards];
          }
        }
      }

      // Merge users while preserving any queued offline edits/deletes
      let rawUsers: User[] | undefined;
      if (realUsers && Array.isArray(realUsers)) {
        let mergedUsers = [...realUsers];
        for (const initUser of INITIAL_USERS) {
          if (deletedUserIds.includes(initUser.id)) continue;
          if (
            !mergedUsers.some(
              (u) =>
                normalizeEmail(u.email) === normalizeEmail(initUser.email) ||
                u.id === initUser.id
            )
          ) {
            mergedUsers.push(initUser);
          }
        }
        for (const q of activeQueue.filter((op) => op.entityType === 'user')) {
          if (q.operation === 'delete') {
            mergedUsers = mergedUsers.filter((u) => u.id !== q.entityId);
          } else if (q.payload) {
            const exists = mergedUsers.some((u) => u.id === q.entityId);
            mergedUsers = exists
              ? mergedUsers.map((u) => (u.id === q.entityId ? q.payload : u))
              : [...mergedUsers, q.payload];
          }
        }
        rawUsers = mergedUsers;
      }

      const reconciled = reconcileLinks(
        rawCompanies ?? INITIAL_COMPANIES,
        rawUsers ?? INITIAL_USERS,
        rawCards ?? INITIAL_CARDS,
        {
          deletedCompanyIds: deletedCompIds,
          deletedCardIds,
          deletedUserIds,
        }
      );

      if (rawCompanies) {
        setCompanies(reconciled.companies);
        safeLocalStorageSet('yebocompanies_data', JSON.stringify(reconciled.companies));
        await idbSet('companies', 'all_companies', reconciled.companies);
        await saveCleanBaseSnapshots('company', realCompanies, dirtyKeys);
      }

      if (rawCards) {
        setCards(reconciled.cards);
        safeLocalStorageSet('yebocards_data', JSON.stringify(reconciled.cards));
        await idbSet('cards', 'all_cards', reconciled.cards);
        await saveCleanBaseSnapshots('card', realCards, dirtyKeys);
      }

      if (rawUsers) {
        setUsers(reconciled.users);
        safeLocalStorageSet('yebousers_data', JSON.stringify(reconciled.users));
        await idbSet('users', 'all_users', reconciled.users);
        await saveCleanBaseSnapshots('user', realUsers, dirtyKeys);
        setCurrentUser((prev) => {
          if (!prev) return null;
          const freshSelf = reconciled.users.find(
            (u) =>
              (u.id === prev.id || normalizeEmail(u.email) === normalizeEmail(prev.email)) &&
              u.role === 'admin'
          );
          return freshSelf || prev;
        });
      }

      // Authoritative leads merged with queued offline lead edits/creates/deletes
      if (realLeads) {
        let mergedLeads = [...realLeads];
        for (const q of activeQueue.filter((op) => op.entityType === 'lead')) {
          if (q.operation === 'delete') {
            mergedLeads = mergedLeads.filter((l) => l.id !== q.entityId);
          } else if (q.payload) {
            const exists = mergedLeads.some((l) => l.id === q.entityId);
            mergedLeads = exists
              ? mergedLeads.map((l) => (l.id === q.entityId ? q.payload : l))
              : [q.payload, ...mergedLeads];
          }
        }
        const cleanLeads = deduplicateLeads(mergedLeads);
        const sorted = [...cleanLeads].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setLeads(sorted);
        safeLocalStorageSet('yeboleads_data', JSON.stringify(sorted));
        await idbSet('leads', 'all_leads', sorted);
        await saveCleanBaseSnapshots('lead', realLeads, dirtyKeys);
      }

      setDbOnline(true);
      setLastSyncTime(new Date());
      if (isManual) {
        setToastMessage(
          activeQueue.length > 0
            ? `Refreshed from server while preserving ${activeQueue.length} pending offline edit(s).`
            : 'Database live & synced with Central DB!'
        );
        setTimeout(() => setToastMessage(''), 3000);
      }
    } catch (err) {
      console.warn('Central DB sync notice:', err);
      setDbOnline(false);
    } finally {
      setIsSyncingDb(false);
    }
  }, [checkConnectionNow]);

  // User-triggered Sync Now workflow with Conflict Detection
  const handleSyncNow = async () => {
    if (isSyncingQueue) return;
    setIsSyncingQueue(true);
    try {
      const reachable = await checkConnectionNow();
      if (!reachable) {
        setToastMessage('Still offline — your edits remain safely queued locally.');
        setTimeout(() => setToastMessage(''), 3500);
        return;
      }

      const activeQueue = await loadSyncQueue();
      if (activeQueue.length === 0) {
        await syncCentralDatabase(true);
        return;
      }

      const serverSnapshot = await fetchServerSyncSnapshot();
      const { readyItems, conflicts } = detectSyncConflicts(activeQueue, serverSnapshot);

      if (conflicts.length > 0) {
        setPendingSyncConflictState({
          queue: activeQueue,
          conflicts,
          readyCount: readyItems.length,
          snapshot: serverSnapshot,
        });
        setShowConflictModal(true);
        return;
      }

      const result = await executeResolvedSync(activeQueue, {}, serverSnapshot);
      await syncCentralDatabase(false);
      setLastSyncTime(new Date());

      if (result.failedItems.length > 0) {
        setToastMessage(
          `Synced ${result.syncedCount} item(s); ${result.failedItems.length} item(s) stayed in queue to retry.`
        );
      } else {
        setToastMessage(`Synced ${result.syncedCount} offline change(s) to the server!`);
      }
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.warn('Manual Sync Now error:', err);
      setToastMessage('Could not reach server — changes stay safely queued.');
      setTimeout(() => setToastMessage(''), 3500);
    } finally {
      setIsSyncingQueue(false);
    }
  };

  const handleResolveConflicts = async (choices: Record<string, ConflictChoice>) => {
    if (!pendingSyncConflictState) return;
    setIsSyncingQueue(true);
    try {
      const result = await executeResolvedSync(
        pendingSyncConflictState.queue,
        choices,
        pendingSyncConflictState.snapshot
      );
      setShowConflictModal(false);
      setPendingSyncConflictState(null);
      await syncCentralDatabase(false);
      setLastSyncTime(new Date());

      const summaryParts: string[] = [];
      if (result.syncedCount > 0) summaryParts.push(`uploaded ${result.syncedCount}`);
      if (result.keptServerCount > 0) summaryParts.push(`kept ${result.keptServerCount} server version(s)`);
      if (result.failedItems.length > 0) summaryParts.push(`${result.failedItems.length} failed`);

      setToastMessage(`Sync complete: ${summaryParts.join(', ') || 'up to date'}.`);
      setTimeout(() => setToastMessage(''), 4500);
    } finally {
      setIsSyncingQueue(false);
    }
  };

  const handleDiscardQueuedOp = async (opId: string) => {
    await removeQueuedOperation(opId);
    if (isOnline) {
      await syncCentralDatabase(false);
    }
    setToastMessage('Removed pending change from offline outbox.');
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Manual Database Sync Trigger with Administrator Password Authorization
  const triggerManualDatabaseSync = () => {
    if (syncQueue.length > 0) {
      handleSyncNow();
      return;
    }
    setDbSyncModalConfig({
      isOpen: true,
      title: 'Manual Database Synchronization',
      description: 'Authorize full two-way synchronization of companies, smart cards, and team members with the central production database.',
      targetDetails: `Sync all records: ${companies.length} companies, ${cards.length} smart cards, ${users.length} members`,
      onConfirmSync: async () => {
        await syncCentralDatabase(true);
      },
    });
  };

  // Direct card URL routing detection (e.g. /card/:slug, ?card=slug, #card/slug)
  const cardsRef = useRef<BusinessCard[]>(cards);
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    const detectUrlCard = async () => {
      try {
        const path = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash;

        const cardMatch = path.match(/\/card\/([a-zA-Z0-9_.-]+)/);
        const paramSlug = searchParams.get('card') || searchParams.get('slug') || searchParams.get('id');
        const hashMatch = hash.match(/#\/?card\/([a-zA-Z0-9_.-]+)/);

        const targetSlug = cardMatch?.[1] || paramSlug || hashMatch?.[1];

        if (targetSlug) {
          const norm = decodeURIComponent(targetSlug).toLowerCase().trim();
          const cleanNorm = norm.replace(/[^a-z0-9]/g, '');

          const isMatch = (c: BusinessCard) => {
            const cSlug = c.slug.toLowerCase().trim();
            const cClean = cSlug.replace(/[^a-z0-9]/g, '');
            return (
              cSlug === norm ||
              c.id === targetSlug ||
              cClean === cleanNorm ||
              (cleanNorm === 'bsmart' && (cClean === 'besmart' || cClean === 'bsmart')) ||
              (cleanNorm === 'besmart' && (cClean === 'bsmart' || cClean === 'besmart'))
            );
          };

          const found = cardsRef.current.find(isMatch);

          if (found) {
            setSelectedCardId(found.id);
            if (found.companyId) {
              setSelectedCompanyId(found.companyId);
            }
            setActiveView('preview_standalone');
            setIsUrlCardLoading(false);
          } else {
            setIsUrlCardLoading(true);
            try {
              // Direct query from Central DB in case card was created on another device
              const remoteCard = await dbFetchCardBySlugOrId(targetSlug);
              const deletedCardIds = getDeletedCardIds();
              if (remoteCard && !deletedCardIds.includes(remoteCard.id)) {
                if ((remoteCard as any)._company) {
                  const comp = (remoteCard as any)._company;
                  setCompanies((prev) => {
                    const exists = prev.some((c) => c.id === comp.id);
                    return exists ? prev.map((c) => (c.id === comp.id ? comp : c)) : [comp, ...prev];
                  });
                }
                if ((remoteCard as any)._companyTemplate) {
                  const tmpl = (remoteCard as any)._companyTemplate;
                  setCards((prev) => {
                    const exists = prev.some((c) => c.id === tmpl.id);
                    return exists ? prev.map((c) => (c.id === tmpl.id ? tmpl : c)) : [tmpl, ...prev];
                  });
                }
                if ((remoteCard as any)._member) {
                  const mem = (remoteCard as any)._member;
                  setUsers((prev) => {
                    const exists = prev.some((u) => u.id === mem.id);
                    return exists ? prev.map((u) => (u.id === mem.id ? mem : u)) : [mem, ...prev];
                  });
                }
                setCards((prev) => {
                  const exists = prev.some((c) => c.id === remoteCard.id);
                  return exists ? prev.map((c) => (c.id === remoteCard.id ? remoteCard : c)) : [remoteCard, ...prev];
                });
                setSelectedCardId(remoteCard.id);
                if (remoteCard.companyId) {
                  setSelectedCompanyId(remoteCard.companyId);
                }
                setActiveView('preview_standalone');
              }
            } catch (err) {
              console.warn('Remote card fetch notice:', err);
            } finally {
              setIsUrlCardLoading(false);
            }
          }
        } else {
          setIsUrlCardLoading(false);
        }
      } catch (e) {
        console.error('URL card detection notice:', e);
        setIsUrlCardLoading(false);
      }
    };

    detectUrlCard();
    window.addEventListener('popstate', detectUrlCard);
    window.addEventListener('hashchange', detectUrlCard);
    return () => {
      window.removeEventListener('popstate', detectUrlCard);
      window.removeEventListener('hashchange', detectUrlCard);
    };
  }, [cards.length]);

  // Initial startup data hydration: load local cache first, then fetch live from Central DB
  useEffect(() => {
    let isMounted = true;

    async function startupHydrate() {
      // 1. Immediately hydrate from IndexedDB high-capacity local storage
      try {
        const [savedCards, savedCompanies, savedUsers, savedLeads] = await Promise.all([
          idbGet<BusinessCard[]>('cards', 'all_cards'),
          idbGet<Company[]>('companies', 'all_companies'),
          idbGet<User[]>('users', 'all_users'),
          idbGet<LeadInquiry[]>('leads', 'all_leads'),
        ]);

        if (isMounted) {
          const deletedCardIds = getDeletedCardIds();
          const deletedUserIds = getDeletedUserIds();
          const deletedCompanyIds = getDeletedCompanyIds();

          const hydratedCompanies =
            savedCompanies && savedCompanies.length > 0
              ? deduplicateById(savedCompanies.filter((c) => !deletedCompanyIds.includes(c.id)))
              : null;

          const hydratedCards =
            savedCards && savedCards.length > 0
              ? deduplicateCards(
                  restoreCardMediaAssets(
                    savedCards.filter((c) => !deletedCardIds.includes(c.id)),
                    cardsRef.current
                  ),
                  deletedCardIds
                )
              : null;

          let hydratedUsers: User[] | null = null;
          if (savedUsers && savedUsers.length > 0) {
            const merged = [...savedUsers];
            for (const initUser of INITIAL_USERS) {
              if (deletedUserIds.includes(initUser.id)) continue;
              if (
                !merged.some(
                  (u) =>
                    normalizeEmail(u.email) === normalizeEmail(initUser.email) ||
                    u.id === initUser.id
                )
              ) {
                merged.push(initUser);
              }
            }
            hydratedUsers = deduplicateUsers(merged, deletedUserIds);
          }

          if (hydratedCompanies || hydratedCards || hydratedUsers) {
            const reconciled = reconcileLinks(
              hydratedCompanies ?? INITIAL_COMPANIES,
              hydratedUsers ?? INITIAL_USERS,
              hydratedCards ?? INITIAL_CARDS,
              { deletedCompanyIds, deletedCardIds, deletedUserIds }
            );
            if (hydratedCompanies) setCompanies(reconciled.companies);
            if (hydratedCards) setCards(reconciled.cards);
            if (hydratedUsers) setUsers(reconciled.users);
          }

          if (savedLeads && savedLeads.length > 0) setLeads(deduplicateLeads(savedLeads));
          setIsInitialLoadDone(true);
        }
      } catch (err) {
        console.warn('IndexedDB initial load notice:', err);
      } finally {
        if (isMounted) setIsInitialLoadDone(true);
      }

      // 2. Seed database if needed and fetch authoritative data from Central DB / API
      try {
        await seedCentralDatabaseIfNeeded();
        await syncCentralDatabase(false);
      } catch (err) {
        console.warn('Central DB startup sync notice:', err);
      }
    }

    startupHydrate();

    // Connection health monitoring subscription
    const unsubscribe = subscribeToCentralDatabase({
      onStatusChange: (isLive) => {
        if (isMounted) setDbOnline(isLive);
      },
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [syncCentralDatabase]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const isAdmin = currentUser?.role === 'admin';

  // Active company when inside a company workspace
  const activeCompany = useMemo(() => {
    return selectedCompanyId
      ? companies.find((c) => c.id === selectedCompanyId) || undefined
      : null;
  }, [selectedCompanyId, companies]);

  // Linked cards for the currently selected company
  const companyCards = useMemo(() => {
    return activeCompany
      ? cards.filter(
          (c) =>
            c.companyId === activeCompany.id ||
            (!c.companyId &&
              (c.businessName.toLowerCase().trim() === activeCompany.name.toLowerCase().trim() ||
                users.some(
                  (u) =>
                    getUserCompanyIds(u).includes(activeCompany.id) &&
                    (u.assignedCardId === c.id || c.assignedMemberId === u.id)
                )))
        )
      : [];
  }, [activeCompany, cards, users]);

  // All employees linked to the currently selected company
  const companyEmployees = useMemo(() => {
    return activeCompany
      ? users.filter(
          (u) =>
            getUserCompanyIds(u).includes(activeCompany.id) ||
            companyCards.some((c) => c.assignedMemberId === u.id || u.assignedCardId === c.id)
        )
      : [];
  }, [activeCompany, users, companyCards]);

  // Company Master Corporate Template Card (dedicated unassigned company template only)
  const companyTemplateCard = useMemo(() => {
    if (!activeCompany) return null;
    const compSlug = activeCompany.name.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    return (
      companyCards.find(
        (c) =>
          !c.assignedMemberId &&
          (c.id === `card-${activeCompany.id}-master` ||
            c.id.endsWith('-master') ||
            c.slug === compSlug ||
            c.id === activeCompany.id)
      ) ||
      companyCards.find((c) => isMasterTemplateCard(c)) ||
      companyCards.find((c) => !c.assignedMemberId) ||
      null
    );
  }, [activeCompany, companyCards]);

  // Issued / Allocated cards specifically assigned to employees under this company
  const allocatedCompanyCards = useMemo(() => {
    return activeCompany
      ? companyCards.filter(
          (c) =>
            !isMasterTemplateCard(c) &&
            (!!c.assignedMemberId || companyEmployees.some((u) => u.assignedCardId === c.id))
        )
      : [];
  }, [activeCompany, companyCards, companyEmployees]);

  const activeCard = useMemo(() => {
    // When in standalone card preview mode, strictly match the card by ID or slug
    if (activeView === 'preview_standalone') {
      const norm = (selectedCardId || '').toLowerCase().trim();
      const cleanNorm = norm.replace(/[^a-z0-9]/g, '');
      const match = cards.find(
        (c) =>
          c.id === selectedCardId ||
          c.slug.toLowerCase().trim() === norm ||
          c.slug.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanNorm
      );
      return match || null;
    }

    // Inside a company workspace, strictly resolve cards belonging to this company ONLY.
    // Never simulate a card from another user/company when the active company has no cards yet.
    if (activeCompany) {
      const norm = (selectedCardId || '').toLowerCase().trim();
      return (
        companyCards.find((c) => c.id === selectedCardId) ||
        companyCards.find((c) => norm && c.slug.toLowerCase() === norm) ||
        allocatedCompanyCards[0] ||
        companyTemplateCard ||
        companyCards[0] ||
        null
      );
    }

    return (
      cards.find((c) => c.id === selectedCardId) ||
      cards.find((c) => c.slug.toLowerCase() === selectedCardId.toLowerCase()) ||
      cards[0] ||
      null
    );
  }, [activeView, activeCompany, cards, selectedCardId, companyCards, allocatedCompanyCards, companyTemplateCard]);

  // If member is logged in, their assigned card
  const memberAssignedCard = useMemo(() => {
    return !isAdmin && currentUser
      ? cards.find((c) => c.id === currentUser.assignedCardId) || cards[0]
      : null;
  }, [isAdmin, currentUser, cards]);

  // Handlers for companies (Local-first with offline outbox + explicit confirmation and admin password sync)
  const commitCompanySaveLocally = async (
    savedCompany: Company,
    options: { enqueueToOutbox?: boolean } = {}
  ): Promise<{ stampedCompany: Company; updatedCompanies: Company[]; affectedCards: BusinessCard[] }> => {
    const now = new Date().toISOString();
    const stampedCompany: Company = {
      ...savedCompany,
      createdAt: savedCompany.createdAt || now,
      updatedAt: now,
    };
    const exists = companies.some((c) => c.id === stampedCompany.id);
    const updatedCompanies = exists
      ? companies.map((c) => (c.id === stampedCompany.id ? stampedCompany : c))
      : [stampedCompany, ...companies];

    setCompanies(updatedCompanies);

    // Also update companyId on legacy cards matching this company name only if companyId is not already set
    const affectedCards: BusinessCard[] = [];
    const updatedCards = cards.map((c) => {
      if (
        c.companyId === stampedCompany.id ||
        (!c.companyId && c.businessName.toLowerCase().trim() === stampedCompany.name.toLowerCase().trim())
      ) {
        const updatedC = {
          ...c,
          companyId: stampedCompany.id,
          businessName: stampedCompany.name,
          tagline: c.tagline || stampedCompany.tagline,
          logoUrl: c.logoUrl || stampedCompany.logoUrl,
          updatedAt: now,
        };
        affectedCards.push(updatedC);
        return updatedC;
      }
      return c;
    });
    setCards(updatedCards);

    // Immediately persist to IndexedDB and LocalStorage
    await idbSet('companies', 'all_companies', updatedCompanies);
    safeLocalStorageSet('yebocompanies_data', JSON.stringify(updatedCompanies));
    await idbSet('cards', 'all_cards', updatedCards);
    safeLocalStorageSet('yebocards_data', JSON.stringify(updatedCards));

    if (options.enqueueToOutbox !== false) {
      await enqueueOfflineChange({
        entityType: 'company',
        entityId: stampedCompany.id,
        operation: 'upsert',
        label: stampedCompany.name,
        payload: stampedCompany,
      });
    }

    setShowCompanyModal(false);
    setEditingCompany(null);

    if (!exists) {
      const linkedToNew = updatedCards.filter((c) => c.companyId === stampedCompany.id);
      setSelectedCompanyId(stampedCompany.id);
      if (linkedToNew.length > 0) {
        setSelectedCardId(linkedToNew[0].id);
        setCompanyWorkspaceTab('allocated');
      } else {
        setSelectedCardId('');
        setCompanyWorkspaceTab('template');
      }
    }

    return { stampedCompany, updatedCompanies, affectedCards };
  };

  const handleSaveCompany = (savedCompany: Company) => {
    const exists = companies.some((c) => c.id === savedCompany.id);
    if (!isOnline) {
      commitCompanySaveLocally(savedCompany, { enqueueToOutbox: true })
        .then(({ stampedCompany }) => {
          showToast(`Company "${stampedCompany.name}" saved offline — queued for Sync Now!`);
        })
        .catch(console.warn);
      return;
    }

    setSaveConfirmModalConfig({
      isOpen: true,
      title: exists ? 'Confirm Database Action: Update Company' : 'Confirm Database Action: Create Company',
      entityName: savedCompany.name,
      entityType: 'company',
      actionType: exists ? 'update' : 'create',
      detailsSummary: `Category: ${savedCompany.categoryLabel || savedCompany.category} · Email: ${savedCompany.email || 'N/A'}`,
      onSaveLocally: async () => {
        const { stampedCompany } = await commitCompanySaveLocally(savedCompany, { enqueueToOutbox: true });
        setSaveConfirmModalConfig(null);
        showToast(`Company "${stampedCompany.name}" saved locally & queued for Sync Now!`);
      },
      onSaveAndSyncImmediately: async () => {
        const { stampedCompany } = await commitCompanySaveLocally(savedCompany, { enqueueToOutbox: true });
        setSaveConfirmModalConfig(null);
        setDbSyncModalConfig({
          isOpen: true,
          title: 'Authorize Database Sync for Company',
          description: `Confirm writing company "${stampedCompany.name}" to the central production database.`,
          targetDetails: `Company: ${stampedCompany.name}`,
          onConfirmSync: async () => {
            const ok = await dbSaveCompany(stampedCompany);
            if (ok) {
              await removeQueuedOperation(`company:${stampedCompany.id}`);
              await saveCleanBaseSnapshots('company', [stampedCompany], new Set());
              showToast(`Company "${stampedCompany.name}" saved & synced to central database!`);
            } else {
              showToast(`Could not reach server — "${stampedCompany.name}" stays queued for Sync Now.`);
            }
          },
        });
      },
    });
  };

  const handleCompanyRegistered = async (
    newCompany: Company,
    adminContact: { name: string; email: string; phone: string }
  ) => {
    const now = new Date().toISOString();
    const stampedCompany: Company = { ...newCompany, updatedAt: now };
    // 1. Add registered company (defaults to status: 'pending_approval')
    const updatedCompanies = [...companies.filter((c) => c.id !== stampedCompany.id), stampedCompany];
    setCompanies(updatedCompanies);
    safeLocalStorageSet('yebocompanies_data', JSON.stringify(updatedCompanies));
    await idbSet('companies', 'all_companies', updatedCompanies);

    // 2. Register or link primary representative user account without creating email duplicates
    const existingRep = users.find(
      (u) => normalizeEmail(u.email) === normalizeEmail(adminContact.email)
    );
    const savedRepUser: User = existingRep
      ? syncUserCompanies(
          {
            ...existingRep,
            name: existingRep.name || adminContact.name,
            phone: existingRep.phone || adminContact.phone,
            updatedAt: now,
          },
          { addCompanyIds: [stampedCompany.id], primaryCompanyId: existingRep.companyId || stampedCompany.id }
        )
      : {
          id: `user-${Date.now()}`,
          name: adminContact.name,
          email: adminContact.email.trim(),
          phone: adminContact.phone,
          role: 'employee',
          companyId: stampedCompany.id,
          companyIds: [stampedCompany.id],
          designation: 'Company Manager / Contact',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        };

    const updatedUsers = deduplicateUsers(
      existingRep
        ? users.map((u) => (u.id === existingRep.id ? savedRepUser : u))
        : [...users, savedRepUser],
      getDeletedUserIds()
    );
    setUsers(updatedUsers);
    safeLocalStorageSet('yebousers_data', JSON.stringify(updatedUsers));
    await idbSet('users', 'all_users', updatedUsers);

    // 3. Sync immediately if online, else queue offline
    let compOk = false;
    let userOk = false;
    if (isOnline) {
      compOk = await dbSaveCompany(stampedCompany);
      userOk = await dbSaveUser(savedRepUser);
    }

    const toQueue: EnqueueInput[] = [];
    if (!compOk) {
      toQueue.push({
        entityType: 'company',
        entityId: stampedCompany.id,
        operation: 'upsert',
        label: stampedCompany.name,
        payload: stampedCompany,
      });
    } else {
      await saveCleanBaseSnapshots('company', [stampedCompany], new Set());
    }
    if (!userOk) {
      toQueue.push({
        entityType: 'user',
        entityId: savedRepUser.id,
        operation: 'upsert',
        label: savedRepUser.name,
        payload: savedRepUser,
      });
    } else {
      await saveCleanBaseSnapshots('user', [savedRepUser], new Set());
    }
    if (toQueue.length > 0) {
      await enqueueOfflineBatch(toQueue);
    }

    showToast(
      toQueue.length > 0
        ? `Company "${stampedCompany.name}" saved offline — queued for Sync Now!`
        : `Company "${stampedCompany.name}" registered! Status: Inactive pending B-SMART™ approval.`
    );
  };

  const handleUpdateCompanyGovernance = async (updatedCompany: Company) => {
    const stampedCompany: Company = { ...updatedCompany, updatedAt: new Date().toISOString() };
    const updatedCompanies = companies.map((c) => (c.id === stampedCompany.id ? stampedCompany : c));
    setCompanies(updatedCompanies);
    safeLocalStorageSet('yebocompanies_data', JSON.stringify(updatedCompanies));
    await idbSet('companies', 'all_companies', updatedCompanies);

    let ok = false;
    if (isOnline) {
      ok = await dbSaveCompany(stampedCompany);
    }
    if (ok) {
      await removeQueuedOperation(`company:${stampedCompany.id}`);
      await saveCleanBaseSnapshots('company', [stampedCompany], new Set());
      showToast(`Company "${stampedCompany.name}" updated! Status: ${(stampedCompany.status || 'ACTIVE').toUpperCase()}`);
    } else {
      await enqueueOfflineChange({
        entityType: 'company',
        entityId: stampedCompany.id,
        operation: 'upsert',
        label: stampedCompany.name,
        payload: stampedCompany,
      });
      showToast(`Company "${stampedCompany.name}" updated offline — queued for Sync Now.`);
    }
  };

  const handleCompleteOnboardingWizard = async (data: {
    company: Company;
    templateCard: BusinessCard;
    teamMembers: Array<{
      user: User;
      card: BusinessCard;
    }>;
  }) => {
    const now = new Date().toISOString();
    const stampedCompany: Company = { ...data.company, updatedAt: now };
    const updatedCompanies = [stampedCompany, ...companies.filter((c) => c.id !== stampedCompany.id)];
    setCompanies(updatedCompanies);

    // 2. Ensure unique slugs and merge/deduplicate any existing user by normalized email
    let workingCards = [...cards];
    let workingUsers = [...users];
    const modifiedCards: BusinessCard[] = [];
    const modifiedUsers: User[] = [];

    const uniqueTemplateSlug = ensureUniqueSlug(
      data.templateCard.slug || stampedCompany.name,
      workingCards,
      data.templateCard.id
    );
    const cleanTemplateCard: BusinessCard = {
      ...data.templateCard,
      slug: uniqueTemplateSlug,
      assignedMemberId: undefined,
      updatedAt: now,
    };
    unmarkCardAsDeleted(cleanTemplateCard.id);
    workingCards = [cleanTemplateCard, ...workingCards.filter((c) => c.id !== cleanTemplateCard.id)];
    modifiedCards.push(cleanTemplateCard);

    let firstMemberCardId: string | null = null;
    for (const item of data.teamMembers) {
      const existingByEmail = workingUsers.find(
        (u) => normalizeEmail(u.email) && normalizeEmail(u.email) === normalizeEmail(item.user.email)
      );
      const canonicalUserId = existingByEmail ? existingByEmail.id : item.user.id;
      const existingCardForUser = existingByEmail?.assignedCardId
        ? workingCards.find((c) => c.id === existingByEmail.assignedCardId)
        : undefined;

      // Clear previous card link if user is moving to a new card
      if (existingCardForUser && existingCardForUser.id !== item.card.id) {
        const clearedOldCard = { ...existingCardForUser, assignedMemberId: undefined, updatedAt: now };
        workingCards = workingCards.map((c) => (c.id === clearedOldCard.id ? clearedOldCard : c));
        modifiedCards.push(clearedOldCard);
      }

      const uniqueCardSlug = ensureUniqueSlug(item.card.slug || `${stampedCompany.name}-${item.user.name}`, workingCards, item.card.id);
      const cleanCard: BusinessCard = {
        ...item.card,
        slug: uniqueCardSlug,
        assignedMemberId: canonicalUserId,
        updatedAt: now,
      };
      unmarkCardAsDeleted(cleanCard.id);
      workingCards = [cleanCard, ...workingCards.filter((c) => c.id !== cleanCard.id)];
      modifiedCards.push(cleanCard);
      if (!firstMemberCardId) firstMemberCardId = cleanCard.id;

      const cleanUser: User = syncUserCompanies(
        {
          ...(existingByEmail || item.user),
          id: canonicalUserId,
          name: item.user.name,
          designation: item.user.designation || existingByEmail?.designation,
          phone: item.user.phone || existingByEmail?.phone,
          assignedCardId: cleanCard.id,
          updatedAt: now,
        },
        { addCompanyIds: [stampedCompany.id], primaryCompanyId: stampedCompany.id }
      );
      workingUsers = existingByEmail
        ? workingUsers.map((u) => (u.id === canonicalUserId ? cleanUser : u))
        : [...workingUsers, cleanUser];
      modifiedUsers.push(cleanUser);
    }

    const reconciled = reconcileLinks(updatedCompanies, workingUsers, workingCards, {
      deletedCompanyIds: getDeletedCompanyIds(),
      deletedCardIds: getDeletedCardIds(),
      deletedUserIds: getDeletedUserIds(),
    });
    setCards(reconciled.cards);
    setUsers(reconciled.users);

    await idbSet('companies', 'all_companies', reconciled.companies);
    safeLocalStorageSet('yebocompanies_data', JSON.stringify(reconciled.companies));
    await idbSet('cards', 'all_cards', reconciled.cards);
    safeLocalStorageSet('yebocards_data', JSON.stringify(reconciled.cards));
    await idbSet('users', 'all_users', reconciled.users);
    safeLocalStorageSet('yebousers_data', JSON.stringify(reconciled.users));

    // Sync immediately if online, else enqueue entire batch
    const toQueue: EnqueueInput[] = [];
    const compSaved = isOnline ? await dbSaveCompany(stampedCompany) : false;
    if (!compSaved) {
      toQueue.push({
        entityType: 'company',
        entityId: stampedCompany.id,
        operation: 'upsert',
        label: stampedCompany.name,
        payload: stampedCompany,
      });
    } else {
      await saveCleanBaseSnapshots('company', [stampedCompany], new Set());
    }

    for (const c of modifiedCards) {
      const ok = isOnline ? await dbSaveCard(c) : false;
      if (!ok) {
        toQueue.push({
          entityType: 'card',
          entityId: c.id,
          operation: 'upsert',
          label: `${c.businessName}${c.contactPersonName ? ` · ${c.contactPersonName}` : ''}`,
          payload: c,
        });
      } else {
        await saveCleanBaseSnapshots('card', [c], new Set());
      }
    }

    for (const u of modifiedUsers) {
      const ok = isOnline ? await dbSaveUser(u) : false;
      if (!ok) {
        toQueue.push({
          entityType: 'user',
          entityId: u.id,
          operation: 'upsert',
          label: u.name,
          payload: u,
        });
      } else {
        await saveCleanBaseSnapshots('user', [u], new Set());
      }
    }

    if (toQueue.length > 0) {
      await enqueueOfflineBatch(toQueue);
    }

    setSelectedCompanyId(stampedCompany.id);
    setSelectedCardId(firstMemberCardId || cleanTemplateCard.id);
    setShowOnboardingWizardModal(false);

    showToast(
      toQueue.length > 0
        ? `Onboarded ${stampedCompany.name} offline (${toQueue.length} item(s) queued for Sync Now).`
        : `Successfully onboarded ${stampedCompany.name} and ${data.teamMembers.length} team members!`
    );
  };

  const handleDeleteCompany = (company: Company) => {
    setCompanyToDelete(company);
  };

  const executeDeleteCompany = async (targetCompany: Company) => {
    const now = new Date().toISOString();
    markCompanyAsDeleted(targetCompany.id);
    const updatedCompanies = companies.filter((c) => c.id !== targetCompany.id);
    setCompanies(updatedCompanies);
    safeLocalStorageSet('yebocompanies_data', JSON.stringify(updatedCompanies));

    // Find all cards belonging to this company to delete from DB and state
    const cardsToDelete = cards.filter(
      (c) =>
        c.companyId === targetCompany.id ||
        (!c.companyId && c.businessName.toLowerCase().trim() === targetCompany.name.toLowerCase().trim())
    );
    const deletedCardIdSet = new Set(cardsToDelete.map((c) => c.id));

    for (const card of cardsToDelete) {
      markCardAsDeleted(card.id);
    }

    const updatedCards = cards.filter((c) => !deletedCardIdSet.has(c.id));
    setCards(updatedCards);
    safeLocalStorageSet('yebocards_data', JSON.stringify(updatedCards));

    // Preserve unrelated multi-company affiliations and clear assignedCardId only if that card was deleted
    const modifiedUsers: User[] = [];
    const updatedUsers = users.map((u) => {
      const hasCompany = getUserCompanyIds(u).includes(targetCompany.id);
      const hasDeletedCard = u.assignedCardId && deletedCardIdSet.has(u.assignedCardId);
      if (!hasCompany && !hasDeletedCard) return u;
      const synced = syncUserCompanies(u, { removeCompanyIds: [targetCompany.id] });
      const updatedUser: User = {
        ...synced,
        assignedCardId: hasDeletedCard ? undefined : synced.assignedCardId,
        updatedAt: now,
      };
      modifiedUsers.push(updatedUser);
      return updatedUser;
    });
    setUsers(updatedUsers);
    safeLocalStorageSet('yebousers_data', JSON.stringify(updatedUsers));
    await idbSet('users', 'all_users', updatedUsers);

    if (selectedCompanyId === targetCompany.id) {
      setSelectedCompanyId(null);
    }
    setCompanyToDelete(null);

    await idbSet('companies', 'all_companies', updatedCompanies);
    await idbDelete('companies', targetCompany.id);
    await idbSet('cards', 'all_cards', updatedCards);
    for (const card of cardsToDelete) {
      await idbDelete('cards', card.id);
    }

    const queueItems: EnqueueInput[] = [
      {
        entityType: 'company',
        entityId: targetCompany.id,
        operation: 'delete',
        label: targetCompany.name,
        payload: { id: targetCompany.id },
      },
      ...cardsToDelete.map((card) => ({
        entityType: 'card' as const,
        entityId: card.id,
        operation: 'delete' as const,
        label: card.businessName,
        payload: { id: card.id },
      })),
      ...modifiedUsers.map((u) => ({
        entityType: 'user' as const,
        entityId: u.id,
        operation: 'upsert' as const,
        label: u.name,
        payload: u,
      })),
    ];
    await enqueueOfflineBatch(queueItems);

    if (!isOnline) {
      showToast(`Company "${targetCompany.name}" deleted offline — queued for Sync Now!`);
      return;
    }

    showToast(`Company "${targetCompany.name}" deleted locally.`);

    // Password authorization for removing from production central DB
    setDbSyncModalConfig({
      isOpen: true,
      title: 'Authorize Database Sync: Delete Company',
      description: `Confirm permanently removing company "${targetCompany.name}" and ${cardsToDelete.length} linked card(s) from the central production database.`,
      targetDetails: `Delete Company: ${targetCompany.name}`,
      onConfirmSync: async () => {
        const compDeleted = await dbDeleteCompany(targetCompany.id);
        if (compDeleted) {
          await removeQueuedOperation(`company:${targetCompany.id}`);
          await idbDelete('base_snapshots', `company:${targetCompany.id}`);
        }
        for (const card of cardsToDelete) {
          const ok = await dbDeleteCard(card.id);
          if (ok) {
            await removeQueuedOperation(`card:${card.id}`);
            await idbDelete('base_snapshots', `card:${card.id}`);
          }
        }
        for (const u of modifiedUsers) {
          const ok = await dbSaveUser(u);
          if (ok) {
            await removeQueuedOperation(`user:${u.id}`);
            await saveCleanBaseSnapshots('user', [u], new Set());
          }
        }
        showToast(`Company "${targetCompany.name}" removed permanently from central DB.`);
      },
    });
  };

  // Handlers for cards (Local-first with explicit confirmation and admin password sync)
  const commitCardSaveLocally = async (
    savedCard: BusinessCard
  ): Promise<{
    cardWithTimestamp: BusinessCard;
    extraModifiedCards: BusinessCard[];
    modifiedUsers: User[];
  }> => {
    unmarkCardAsDeleted(savedCard.id);
    const now = new Date().toISOString();
    const uniqueSlug = ensureUniqueSlug(
      savedCard.slug || savedCard.businessName,
      cards,
      savedCard.id
    );
    const targetMemberId = savedCard.assignedMemberId || undefined;

    const cardWithTimestamp: BusinessCard = {
      ...savedCard,
      slug: uniqueSlug,
      assignedMemberId: targetMemberId,
      updatedAt: now,
    };

    const exists = cards.some((c) => c.id === cardWithTimestamp.id);
    const baseCards = exists
      ? cards.map((c) => (c.id === cardWithTimestamp.id ? cardWithTimestamp : c))
      : [cardWithTimestamp, ...cards];

    // Enforce 1-to-1: clear assignedMemberId on any OTHER card still pointing to targetMemberId
    const extraModifiedCards: BusinessCard[] = [];
    const updatedCards = baseCards.map((c) => {
      if (targetMemberId && c.id !== cardWithTimestamp.id && c.assignedMemberId === targetMemberId) {
        const cleared = { ...c, assignedMemberId: undefined, updatedAt: now };
        extraModifiedCards.push(cleared);
        return cleared;
      }
      return c;
    });

    setCards(updatedCards);
    setSelectedCardId(cardWithTimestamp.id);
    if (cardWithTimestamp.companyId) {
      setSelectedCompanyId(cardWithTimestamp.companyId);
    }

    // Sync member assignment & multi-company affiliation bidirectionally
    const modifiedUsers: User[] = [];
    const nextUsers = users.map((u) => {
      if (targetMemberId && u.id === targetMemberId) {
        const synced = syncUserCompanies(
          { ...u, assignedCardId: cardWithTimestamp.id, updatedAt: now },
          { addCompanyIds: [cardWithTimestamp.companyId] }
        );
        modifiedUsers.push(synced);
        return synced;
      }
      if (u.assignedCardId === cardWithTimestamp.id && u.id !== targetMemberId) {
        const cleared = { ...u, assignedCardId: undefined, updatedAt: now };
        modifiedUsers.push(cleared);
        return cleared;
      }
      return u;
    });
    setUsers(nextUsers);
    safeLocalStorageSet('yebousers_data', JSON.stringify(nextUsers));
    await idbSet('users', 'all_users', nextUsers);

    setEditingCard(null);
    setActiveView('dashboard');

    // Immediately persist to safe localStorage and high-capacity IndexedDB
    safeLocalStorageSet('yebocards_data', JSON.stringify(updatedCards));
    try {
      await Promise.all([
        idbSet('cards', 'all_cards', updatedCards),
        idbSet('cards', cardWithTimestamp.id, cardWithTimestamp),
      ]);
    } catch (e) {
      console.warn('IDB write notice:', e);
    }

    // Queue all touched card & user records into offline outbox
    await enqueueOfflineBatch([
      {
        entityType: 'card',
        entityId: cardWithTimestamp.id,
        operation: 'upsert',
        label: `${cardWithTimestamp.businessName}${cardWithTimestamp.contactPersonName ? ` · ${cardWithTimestamp.contactPersonName}` : ''}`,
        payload: cardWithTimestamp,
      },
      ...extraModifiedCards.map((c) => ({
        entityType: 'card' as const,
        entityId: c.id,
        operation: 'upsert' as const,
        label: c.businessName,
        payload: c,
      })),
      ...modifiedUsers.map((u) => ({
        entityType: 'user' as const,
        entityId: u.id,
        operation: 'upsert' as const,
        label: u.name,
        payload: u,
      })),
    ]);

    return { cardWithTimestamp, extraModifiedCards, modifiedUsers };
  };

  const handleSaveCard = (savedCard: BusinessCard) => {
    const exists = cards.some((c) => c.id === savedCard.id);
    const previewSlug = ensureUniqueSlug(savedCard.slug || savedCard.businessName, cards, savedCard.id);
    if (!isOnline) {
      commitCardSaveLocally(savedCard)
        .then(({ cardWithTimestamp }) => {
          showToast(`Smart Card "${cardWithTimestamp.businessName}" saved offline — queued for Sync Now!`);
        })
        .catch(console.warn);
      return;
    }

    setSaveConfirmModalConfig({
      isOpen: true,
      title: exists ? 'Confirm Database Action: Update Smart Card' : 'Confirm Database Action: Create Smart Card',
      entityName: savedCard.businessName || savedCard.contactPersonName || 'Smart Card',
      entityType: 'card',
      actionType: exists ? 'update' : 'create',
      detailsSummary: `Contact: ${savedCard.contactPersonName || 'N/A'} · Slug: /${previewSlug}`,
      onSaveLocally: async () => {
        const { cardWithTimestamp } = await commitCardSaveLocally(savedCard);
        setSaveConfirmModalConfig(null);
        showToast(`Smart Card "${cardWithTimestamp.businessName}" saved locally & queued for Sync Now!`);
      },
      onSaveAndSyncImmediately: async () => {
        const { cardWithTimestamp, extraModifiedCards, modifiedUsers } = await commitCardSaveLocally(savedCard);
        setSaveConfirmModalConfig(null);
        setDbSyncModalConfig({
          isOpen: true,
          title: 'Authorize Database Sync for Card',
          description: `Confirm writing digital smart card "${cardWithTimestamp.businessName}" to the central production database.`,
          targetDetails: `Card: ${cardWithTimestamp.businessName} (/${cardWithTimestamp.slug})`,
          onConfirmSync: async () => {
            const mainOk = await dbSaveCard(cardWithTimestamp);
            if (mainOk) {
              await removeQueuedOperation(`card:${cardWithTimestamp.id}`);
              await saveCleanBaseSnapshots('card', [cardWithTimestamp], new Set());
            }
            for (const c of extraModifiedCards) {
              const ok = await dbSaveCard(c);
              if (ok) {
                await removeQueuedOperation(`card:${c.id}`);
                await saveCleanBaseSnapshots('card', [c], new Set());
              }
            }
            for (const u of modifiedUsers) {
              const ok = await dbSaveUser(u);
              if (ok) {
                await removeQueuedOperation(`user:${u.id}`);
                await saveCleanBaseSnapshots('user', [u], new Set());
              }
            }
            showToast(
              mainOk
                ? `Smart Card "${cardWithTimestamp.businessName}" saved & synced to central database!`
                : `Server unreachable — "${cardWithTimestamp.businessName}" stays queued for Sync Now.`
            );
          },
        });
      },
    });
  };

  const handleDeleteCard = (cardId: string) => {
    const targetCard = cards.find((c) => c.id === cardId);
    if (!targetCard) return;
    setCardToDelete(targetCard);
  };

  const executeDeleteCard = async (targetCard: BusinessCard) => {
    const cardId = targetCard.id;
    const now = new Date().toISOString();
    markCardAsDeleted(cardId);
    
    const updatedCards = cards.filter((c) => c.id !== cardId);
    setCards(updatedCards);

    // Clear assignment from any user that had this card assigned
    const modifiedUsers: User[] = [];
    const updatedUsers = users.map((u) => {
      if (u.assignedCardId === cardId) {
        const cleared = { ...u, assignedCardId: undefined, updatedAt: now };
        modifiedUsers.push(cleared);
        return cleared;
      }
      return u;
    });
    setUsers(updatedUsers);
    safeLocalStorageSet('yebousers_data', JSON.stringify(updatedUsers));
    await idbSet('users', 'all_users', updatedUsers);

    if (selectedCardId === cardId) {
      const remaining = updatedCards.filter((c) => c.companyId === targetCard.companyId);
      if (remaining.length > 0) {
        setSelectedCardId(remaining[0].id);
      } else if (!selectedCompanyId && updatedCards.length > 0) {
        setSelectedCardId(updatedCards[0].id);
      } else {
        setSelectedCardId('');
      }
    }

    setCardToDelete(null);
    safeLocalStorageSet('yebocards_data', JSON.stringify(updatedCards));
    await idbSet('cards', 'all_cards', updatedCards);
    await idbDelete('cards', cardId);

    await enqueueOfflineBatch([
      {
        entityType: 'card',
        entityId: cardId,
        operation: 'delete',
        label: targetCard.businessName,
        payload: { id: cardId },
      },
      ...modifiedUsers.map((u) => ({
        entityType: 'user' as const,
        entityId: u.id,
        operation: 'upsert' as const,
        label: u.name,
        payload: u,
      })),
    ]);

    if (!isOnline) {
      showToast(`Card "${targetCard.businessName}" deleted offline — queued for Sync Now!`);
      return;
    }

    showToast(`Card "${targetCard.businessName}" permanently deleted locally.`);

    // Password authorization for removing from production central DB
    setDbSyncModalConfig({
      isOpen: true,
      title: 'Authorize Database Sync: Delete Card',
      description: `Confirm permanently removing digital smart card "${targetCard.businessName}" from the central production database.`,
      targetDetails: `Delete Card: ${targetCard.businessName} (/${targetCard.slug})`,
      onConfirmSync: async () => {
        const deleted = await dbDeleteCard(cardId);
        if (deleted) {
          await removeQueuedOperation(`card:${cardId}`);
          await idbDelete('base_snapshots', `card:${cardId}`);
        }
        for (const u of modifiedUsers) {
          const ok = await dbSaveUser(u);
          if (ok) {
            await removeQueuedOperation(`user:${u.id}`);
            await saveCleanBaseSnapshots('user', [u], new Set());
          }
        }
        showToast(`Card "${targetCard.businessName}" removed permanently from central DB.`);
      },
    });
  };

  // Handlers for members & profiles (Local-first with explicit confirmation and admin password sync)
  const handleAddMember = (newMemberData: Omit<User, 'id' | 'createdAt'>) => {
    const cleanEmail = normalizeEmail(newMemberData.email);
    const duplicateUser = cleanEmail
      ? users.find((u) => normalizeEmail(u.email) === cleanEmail)
      : undefined;
    if (duplicateUser) {
      showToast(`Duplicate blocked: "${duplicateUser.name}" already uses ${newMemberData.email}. Edit or link the existing user instead.`);
      return;
    }

    const baseUser: User = syncUserCompanies({
      ...newMemberData,
      email: newMemberData.email.trim(),
      id: `user-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const commitNewMemberLocally = async () => {
      const now = new Date().toISOString();
      let finalUser = { ...baseUser };
      const modifiedCards: BusinessCard[] = [];
      const extraModifiedUsers: User[] = [];
      let nextUsers = [...users, finalUser];
      let nextCards = [...cards];

      if (finalUser.assignedCardId) {
        const selectedCard = nextCards.find((c) => c.id === finalUser.assignedCardId);
        if (selectedCard) {
          if (selectedCard.assignedMemberId && selectedCard.assignedMemberId !== finalUser.id) {
            nextUsers = nextUsers.map((u) => {
              if (u.id === selectedCard.assignedMemberId) {
                const cleared = { ...u, assignedCardId: undefined, updatedAt: now };
                extraModifiedUsers.push(cleared);
                return cleared;
              }
              return u;
            });
          }
          const updatedCard: BusinessCard = {
            ...selectedCard,
            assignedMemberId: finalUser.id,
            contactPersonName: finalUser.name,
            designation: finalUser.designation || selectedCard.designation,
            updatedAt: now,
          };
          nextCards = nextCards.map((c) => (c.id === updatedCard.id ? updatedCard : c));
          modifiedCards.push(updatedCard);
          finalUser = syncUserCompanies(finalUser, {
            addCompanyIds: [updatedCard.companyId],
          });
          nextUsers = nextUsers.map((u) => (u.id === finalUser.id ? finalUser : u));
        } else {
          finalUser = { ...finalUser, assignedCardId: undefined };
          nextUsers = nextUsers.map((u) => (u.id === finalUser.id ? finalUser : u));
        }
      }

      setUsers(nextUsers);
      await idbSet('users', 'all_users', nextUsers);
      safeLocalStorageSet('yebousers_data', JSON.stringify(nextUsers));

      if (modifiedCards.length > 0) {
        setCards(nextCards);
        await idbSet('cards', 'all_cards', nextCards);
        safeLocalStorageSet('yebocards_data', JSON.stringify(nextCards));
      }

      await enqueueOfflineBatch([
        {
          entityType: 'user',
          entityId: finalUser.id,
          operation: 'upsert',
          label: finalUser.name,
          payload: finalUser,
        },
        ...extraModifiedUsers.map((u) => ({
          entityType: 'user' as const,
          entityId: u.id,
          operation: 'upsert' as const,
          label: u.name,
          payload: u,
        })),
        ...modifiedCards.map((c) => ({
          entityType: 'card' as const,
          entityId: c.id,
          operation: 'upsert' as const,
          label: c.businessName,
          payload: c,
        })),
      ]);

      return { finalUser, extraModifiedUsers, modifiedCards };
    };

    if (!isOnline) {
      commitNewMemberLocally()
        .then(({ finalUser }) => {
          showToast(`${finalUser.role === 'admin' ? 'Admin' : 'Member'} "${finalUser.name}" added offline — queued for Sync Now!`);
        })
        .catch(console.warn);
      return;
    }

    setSaveConfirmModalConfig({
      isOpen: true,
      title: `Confirm Database Action: Add ${baseUser.role === 'admin' ? 'Administrator' : 'Team Member'}`,
      entityName: baseUser.name,
      entityType: 'member',
      actionType: 'create',
      detailsSummary: `Role: ${baseUser.role} · Email: ${baseUser.email} · Designation: ${baseUser.designation || 'Staff'}`,
      onSaveLocally: async () => {
        const { finalUser } = await commitNewMemberLocally();
        setSaveConfirmModalConfig(null);
        showToast(`${finalUser.role === 'admin' ? 'Admin' : 'Member'} "${finalUser.name}" saved locally & queued for Sync Now!`);
      },
      onSaveAndSyncImmediately: async () => {
        const { finalUser, extraModifiedUsers, modifiedCards } = await commitNewMemberLocally();
        setSaveConfirmModalConfig(null);
        setDbSyncModalConfig({
          isOpen: true,
          title: 'Authorize Database Sync for Member',
          description: `Confirm writing ${finalUser.role} profile for "${finalUser.name}" to the central production database.`,
          targetDetails: `User: ${finalUser.name} (${finalUser.email})`,
          onConfirmSync: async () => {
            for (const c of modifiedCards) {
              const ok = await dbSaveCard(c);
              if (ok) {
                await removeQueuedOperation(`card:${c.id}`);
                await saveCleanBaseSnapshots('card', [c], new Set());
              }
            }
            for (const u of extraModifiedUsers) {
              const ok = await dbSaveUser(u);
              if (ok) {
                await removeQueuedOperation(`user:${u.id}`);
                await saveCleanBaseSnapshots('user', [u], new Set());
              }
            }
            const userOk = await dbSaveUser(finalUser);
            if (userOk) {
              await removeQueuedOperation(`user:${finalUser.id}`);
              await saveCleanBaseSnapshots('user', [finalUser], new Set());
            }
            showToast(`${finalUser.role === 'admin' ? 'Admin' : 'Member'} "${finalUser.name}" saved & synced to central database!`);
          },
        });
      },
    });
  };

  const commitUpdateUserLocally = async (updatedUser: User) => {
    const now = new Date().toISOString();
    const targetCardId = updatedUser.assignedCardId || undefined;
    const assignedCardObj = targetCardId ? cards.find((c) => c.id === targetCardId) : undefined;

    const userWithTimestamp: User = syncUserCompanies(
      {
        ...updatedUser,
        email: updatedUser.email.trim(),
        assignedCardId: assignedCardObj ? assignedCardObj.id : undefined,
        updatedAt: now,
      },
      { addCompanyIds: [assignedCardObj?.companyId] }
    );

    const extraModifiedUsers: User[] = [];
    const nextUsers = users.map((u) => {
      if (u.id === userWithTimestamp.id) return userWithTimestamp;
      // Clear any other user who previously pointed to this newly claimed card
      if (assignedCardObj && u.assignedCardId === assignedCardObj.id) {
        const cleared = { ...u, assignedCardId: undefined, updatedAt: now };
        extraModifiedUsers.push(cleared);
        return cleared;
      }
      return u;
    });
    setUsers(nextUsers);

    await idbSet('users', 'all_users', nextUsers);
    safeLocalStorageSet('yebousers_data', JSON.stringify(nextUsers));

    if (currentUser && currentUser.id === userWithTimestamp.id) {
      setCurrentUser(userWithTimestamp);
      safeLocalStorageSet('yebo_admin_session', JSON.stringify(userWithTimestamp));
    }

    // Bidirectionally sync cards: unlink old cards & update contact info on the linked card
    const updatedCardsToSave: BusinessCard[] = [];
    const nextCards = cards.map((c) => {
      const isTargetCard = assignedCardObj && c.id === assignedCardObj.id;
      const wasLinkedToUser = c.assignedMemberId === userWithTimestamp.id;

      if (isTargetCard) {
        const updatedCard: BusinessCard = {
          ...c,
          assignedMemberId: userWithTimestamp.id,
          contactPersonName: userWithTimestamp.name,
          designation: userWithTimestamp.designation || c.designation,
          companyId: c.companyId || userWithTimestamp.companyId,
          socialLinks: {
            ...c.socialLinks,
            phone: userWithTimestamp.phone || c.socialLinks?.phone || '',
            whatsapp: userWithTimestamp.phone || c.socialLinks?.whatsapp || '',
            email: userWithTimestamp.email || c.socialLinks?.email || '',
          },
          updatedAt: now,
        };
        updatedCardsToSave.push(updatedCard);
        return updatedCard;
      }

      if (wasLinkedToUser && (!assignedCardObj || c.id !== assignedCardObj.id)) {
        const unlinkedCard: BusinessCard = {
          ...c,
          assignedMemberId: undefined,
          updatedAt: now,
        };
        updatedCardsToSave.push(unlinkedCard);
        return unlinkedCard;
      }

      return c;
    });

    if (updatedCardsToSave.length > 0) {
      setCards(nextCards);
      await idbSet('cards', 'all_cards', nextCards);
      safeLocalStorageSet('yebocards_data', JSON.stringify(nextCards));
    }

    await enqueueOfflineBatch([
      {
        entityType: 'user',
        entityId: userWithTimestamp.id,
        operation: 'upsert',
        label: userWithTimestamp.name,
        payload: userWithTimestamp,
      },
      ...extraModifiedUsers.map((u) => ({
        entityType: 'user' as const,
        entityId: u.id,
        operation: 'upsert' as const,
        label: u.name,
        payload: u,
      })),
      ...updatedCardsToSave.map((c) => ({
        entityType: 'card' as const,
        entityId: c.id,
        operation: 'upsert' as const,
        label: c.businessName,
        payload: c,
      })),
    ]);

    return { userWithTimestamp, extraModifiedUsers, updatedCardsToSave };
  };

  const handleUpdateUser = (updatedUser: User) => {
    const cleanEmail = normalizeEmail(updatedUser.email);
    const conflict = cleanEmail
      ? users.find((u) => u.id !== updatedUser.id && normalizeEmail(u.email) === cleanEmail)
      : undefined;
    if (conflict) {
      showToast(`Email conflict: "${conflict.name}" already uses ${updatedUser.email}.`);
      return;
    }

    if (!isOnline) {
      commitUpdateUserLocally(updatedUser)
        .then(({ userWithTimestamp }) => {
          showToast(`Profile "${userWithTimestamp.name}" updated offline — queued for Sync Now!`);
        })
        .catch(console.warn);
      return;
    }

    setSaveConfirmModalConfig({
      isOpen: true,
      title: `Confirm Database Action: Update ${updatedUser.role === 'admin' ? 'Administrator' : 'Team Member'} Profile`,
      entityName: updatedUser.name,
      entityType: 'member',
      actionType: 'update',
      detailsSummary: `Designation: ${updatedUser.designation || 'Staff'} · Email: ${updatedUser.email}`,
      onSaveLocally: async () => {
        const { userWithTimestamp } = await commitUpdateUserLocally(updatedUser);
        setSaveConfirmModalConfig(null);
        showToast(`Profile "${userWithTimestamp.name}" updated locally & queued for Sync Now!`);
      },
      onSaveAndSyncImmediately: async () => {
        const { userWithTimestamp, extraModifiedUsers, updatedCardsToSave } = await commitUpdateUserLocally(updatedUser);
        setSaveConfirmModalConfig(null);
        setDbSyncModalConfig({
          isOpen: true,
          title: 'Authorize Database Sync for Profile',
          description: `Confirm writing profile updates for "${userWithTimestamp.name}" to the central production database.`,
          targetDetails: `User: ${userWithTimestamp.name} (${userWithTimestamp.email})`,
          onConfirmSync: async () => {
            for (const cardToSave of updatedCardsToSave) {
              const ok = await dbSaveCard(cardToSave);
              if (ok) {
                await removeQueuedOperation(`card:${cardToSave.id}`);
                await saveCleanBaseSnapshots('card', [cardToSave], new Set());
              }
            }
            for (const extraUser of extraModifiedUsers) {
              const ok = await dbSaveUser(extraUser);
              if (ok) {
                await removeQueuedOperation(`user:${extraUser.id}`);
                await saveCleanBaseSnapshots('user', [extraUser], new Set());
              }
            }
            const userOk = await dbSaveUser(userWithTimestamp);
            if (userOk) {
              await removeQueuedOperation(`user:${userWithTimestamp.id}`);
              await saveCleanBaseSnapshots('user', [userWithTimestamp], new Set());
            }
            showToast(`Profile "${userWithTimestamp.name}" updated & synced to central database!`);
          },
        });
      },
    });
  };

  const handleUpdateMemberPassword = async (userId: string, newPass: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    const updatedUser: User = { ...targetUser, password: newPass, updatedAt: new Date().toISOString() };
    const nextUsers = users.map((u) => (u.id === userId ? updatedUser : u));
    setUsers(nextUsers);
    safeLocalStorageSet('yebousers_data', JSON.stringify(nextUsers));
    await idbSet('users', 'all_users', nextUsers);

    await enqueueOfflineChange({
      entityType: 'user',
      entityId: updatedUser.id,
      operation: 'upsert',
      label: updatedUser.name,
      payload: updatedUser,
    });

    if (!isOnline) {
      showToast(`Password updated offline for ${updatedUser.name} — queued for Sync Now!`);
      return;
    }

    setDbSyncModalConfig({
      isOpen: true,
      title: 'Authorize Database Sync: Password Reset',
      description: `Confirm writing password update for "${updatedUser.name}" to the central production database.`,
      targetDetails: `Password change for: ${updatedUser.name} (${updatedUser.email})`,
      onConfirmSync: async () => {
        const ok = await dbSaveUser(updatedUser);
        if (ok) {
          await removeQueuedOperation(`user:${updatedUser.id}`);
          await saveCleanBaseSnapshots('user', [updatedUser], new Set());
        }
        showToast(`Password updated & synced to central database for ${updatedUser.name}!`);
      },
    });
  };

  const handleAssignCard = async (userId: string, cardId: string | undefined) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    const targetCard = cardId ? cards.find((c) => c.id === cardId) : undefined;

    // Never directly overwrite a Company Master Template; clone/reuse an employee card instead
    if (targetCard && isMasterTemplateCard(targetCard)) {
      await handleAllocateCard(targetCard.id, userId, true);
      return;
    }

    const now = new Date().toISOString();
    const modifiedCards: BusinessCard[] = [];
    const nextCards = cards.map((c) => {
      if (targetCard && c.id === targetCard.id) {
        const updatedCard: BusinessCard = {
          ...c,
          assignedMemberId: userId,
          contactPersonName: targetUser.name,
          designation: targetUser.designation || c.designation,
          socialLinks: {
            ...c.socialLinks,
            phone: targetUser.phone || c.socialLinks?.phone || '',
            whatsapp: targetUser.phone || c.socialLinks?.whatsapp || '',
            email: targetUser.email || c.socialLinks?.email || '',
          },
          updatedAt: now,
        };
        modifiedCards.push(updatedCard);
        return updatedCard;
      }
      // Clear any previous card that was linked to this user
      if (c.assignedMemberId === userId || c.id === targetUser.assignedCardId) {
        const clearedCard: BusinessCard = { ...c, assignedMemberId: undefined, updatedAt: now };
        modifiedCards.push(clearedCard);
        return clearedCard;
      }
      return c;
    });

    if (modifiedCards.length > 0) {
      setCards(nextCards);
      safeLocalStorageSet('yebocards_data', JSON.stringify(nextCards));
      await idbSet('cards', 'all_cards', nextCards);
    }

    const modifiedUsers: User[] = [];
    const updatedUser: User = syncUserCompanies(
      {
        ...targetUser,
        assignedCardId: targetCard ? targetCard.id : undefined,
        updatedAt: now,
      },
      { addCompanyIds: [targetCard?.companyId] }
    );
    modifiedUsers.push(updatedUser);

    const nextUsers = users.map((u) => {
      if (u.id === userId) return updatedUser;
      // Clear previous owner if card belonged to another user
      if (targetCard && u.assignedCardId === targetCard.id) {
        const clearedUser: User = { ...u, assignedCardId: undefined, updatedAt: now };
        modifiedUsers.push(clearedUser);
        return clearedUser;
      }
      return u;
    });

    setUsers(nextUsers);
    safeLocalStorageSet('yebousers_data', JSON.stringify(nextUsers));
    await idbSet('users', 'all_users', nextUsers);

    await enqueueOfflineBatch([
      ...modifiedCards.map((c) => ({
        entityType: 'card' as const,
        entityId: c.id,
        operation: 'upsert' as const,
        label: c.businessName,
        payload: c,
      })),
      ...modifiedUsers.map((u) => ({
        entityType: 'user' as const,
        entityId: u.id,
        operation: 'upsert' as const,
        label: u.name,
        payload: u,
      })),
    ]);

    if (!isOnline) {
      showToast(
        targetCard
          ? `Card /${targetCard.slug} assigned offline to ${targetUser.name} — queued for Sync Now!`
          : `Unlinked smart card from ${targetUser.name} offline — queued for Sync Now.`
      );
      return;
    }

    showToast(
      targetCard
        ? `Card /${targetCard.slug} assigned to ${targetUser.name}!`
        : `Unlinked smart card from ${targetUser.name}.`
    );

    // Authorize sync with central database
    setDbSyncModalConfig({
      isOpen: true,
      title: 'Authorize Database Sync: Card Allocation',
      description: `Confirm saving card assignment changes for "${targetUser.name}" to the central production database.`,
      targetDetails: targetCard ? `Assign /${targetCard.slug} to: ${targetUser.name}` : `Unassign card from: ${targetUser.name}`,
      onConfirmSync: async () => {
        for (const c of modifiedCards) {
          const ok = await dbSaveCard(c);
          if (ok) {
            await removeQueuedOperation(`card:${c.id}`);
            await saveCleanBaseSnapshots('card', [c], new Set());
          }
        }
        for (const u of modifiedUsers) {
          const ok = await dbSaveUser(u);
          if (ok) {
            await removeQueuedOperation(`user:${u.id}`);
            await saveCleanBaseSnapshots('user', [u], new Set());
          }
        }
        showToast(`Card link changes synced to central database for ${targetUser.name}!`);
      },
    });
  };

  const handleDeleteMember = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const nextUsers = users.filter((u) => u.id !== userId);
    setUsers(nextUsers);

    // Clear assignment on all cards linked to this user
    const now = new Date().toISOString();
    const unlinkedCards: BusinessCard[] = [];
    const nextCards = cards.map((c) => {
      if (c.assignedMemberId === userId || (targetUser?.assignedCardId && c.id === targetUser.assignedCardId)) {
        const cleared = { ...c, assignedMemberId: undefined, updatedAt: now };
        unlinkedCards.push(cleared);
        return cleared;
      }
      return c;
    });
    if (unlinkedCards.length > 0) {
      setCards(nextCards);
      safeLocalStorageSet('yebocards_data', JSON.stringify(nextCards));
      await idbSet('cards', 'all_cards', nextCards);
    }

    try {
      const deletedIds = getDeletedUserIds();
      if (!deletedIds.includes(userId)) {
        deletedIds.push(userId);
        localStorage.setItem('yebo_deleted_user_ids', JSON.stringify(deletedIds));
      }
    } catch {
      // ignore
    }

    safeLocalStorageSet('yebousers_data', JSON.stringify(nextUsers));
    await idbSet('users', 'all_users', nextUsers);

    await enqueueOfflineBatch([
      {
        entityType: 'user',
        entityId: userId,
        operation: 'delete',
        label: targetUser?.name || userId,
        payload: { id: userId },
      },
      ...unlinkedCards.map((c) => ({
        entityType: 'card' as const,
        entityId: c.id,
        operation: 'upsert' as const,
        label: c.businessName,
        payload: c,
      })),
    ]);

    if (!isOnline) {
      showToast(`Member "${targetUser?.name || userId}" deleted offline — queued for Sync Now!`);
      return;
    }

    showToast(`Member "${targetUser?.name || userId}" deleted locally.`);

    // Password authorization for removing from central DB
    setDbSyncModalConfig({
      isOpen: true,
      title: 'Authorize Database Sync: Delete Member',
      description: `Confirm permanently removing ${targetUser?.role === 'admin' ? 'administrator' : 'team member'} "${targetUser?.name || userId}" from the central production database.`,
      targetDetails: `Delete User: ${targetUser?.name || userId} (${targetUser?.email || ''})`,
      onConfirmSync: async () => {
        for (const c of unlinkedCards) {
          const ok = await dbSaveCard(c);
          if (ok) {
            await removeQueuedOperation(`card:${c.id}`);
            await saveCleanBaseSnapshots('card', [c], new Set());
          }
        }
        const userDeleted = await dbDeleteUser(userId);
        if (userDeleted) {
          await removeQueuedOperation(`user:${userId}`);
          await idbDelete('base_snapshots', `user:${userId}`);
        }
        showToast('Member removed permanently from central DB.');
      },
    });
  };

  const handleAdminLoginSuccess = (admin: User) => {
    setCurrentUser(admin);
    safeLocalStorageSet('yebo_admin_session', JSON.stringify(admin));
    showToast(`Welcome back, ${admin.name}!`);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('yebo_admin_session');
    } catch {
      // ignore
    }
    setIsMobileMenuOpen(false);
    setShowAuthModal(false);
    setCurrentUser(null);
    showToast('Signed out successfully.');
  };

  const handleUpdateCurrentProfilePhoto = async (dataUrl: string) => {
    if (!currentUser) return;
    const updated: User = { ...currentUser, avatarUrl: dataUrl, updatedAt: new Date().toISOString() };
    setCurrentUser(updated);
    const nextUsers = users.map((u) => (u.id === updated.id ? updated : u));
    setUsers(nextUsers);
    safeLocalStorageSet('yebo_admin_session', JSON.stringify(updated));
    safeLocalStorageSet('yebousers_data', JSON.stringify(nextUsers));
    await idbSet('users', 'all_users', nextUsers);

    const ok = isOnline ? await dbSaveUser(updated) : false;
    if (ok) {
      await removeQueuedOperation(`user:${updated.id}`);
      await saveCleanBaseSnapshots('user', [updated], new Set());
      showToast('Profile photo updated & saved to Central DB!');
    } else {
      await enqueueOfflineChange({
        entityType: 'user',
        entityId: updated.id,
        operation: 'upsert',
        label: updated.name,
        payload: updated,
      });
      showToast('Profile photo saved offline — queued for Sync Now!');
    }
  };

  const handleDirectPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const size = Math.min(img.width, img.height);
          const targetDim = 512;
          canvas.width = targetDim;
          canvas.height = targetDim;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const startX = (img.width - size) / 2;
            const startY = (img.height - size) / 2;
            ctx.drawImage(img, startX, startY, size, size, 0, 0, targetDim, targetDim);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            await handleUpdateCurrentProfilePhoto(compressed);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  // Dedicated Card Allocation
  const handleAllocateCard = async (
    cardId: string,
    employeeId: string | null,
    syncContactInfo: boolean
  ) => {
    const targetCard = cards.find((c) => c.id === cardId);
    if (!targetCard) return;

    const now = new Date().toISOString();
    const newEmployee = employeeId ? users.find((u) => u.id === employeeId) : null;

    if (!newEmployee) {
      // Unallocating card cleanly on both card and all users pointing to it
      const updatedCard: BusinessCard = { ...targetCard, assignedMemberId: undefined, updatedAt: now };
      const nextCards = cards.map((c) => (c.id === cardId ? updatedCard : c));
      setCards(nextCards);
      safeLocalStorageSet('yebocards_data', JSON.stringify(nextCards));
      await idbSet('cards', 'all_cards', nextCards);

      const affectedUsers = users.filter(
        (u) => u.assignedCardId === cardId || u.id === targetCard.assignedMemberId
      );
      const affectedSet = new Set(affectedUsers.map((u) => u.id));
      const modifiedUsersList = affectedUsers.length > 0
        ? users.map((u) => (affectedSet.has(u.id) ? { ...u, assignedCardId: undefined, updatedAt: now } : u))
        : users;

      if (affectedUsers.length > 0) {
        setUsers(modifiedUsersList);
        safeLocalStorageSet('yebousers_data', JSON.stringify(modifiedUsersList));
        await idbSet('users', 'all_users', modifiedUsersList);
      }

      const toQueue: EnqueueInput[] = [];
      const cardOk = isOnline ? await dbSaveCard(updatedCard) : false;
      if (!cardOk) {
        toQueue.push({
          entityType: 'card',
          entityId: updatedCard.id,
          operation: 'upsert',
          label: updatedCard.businessName,
          payload: updatedCard,
        });
      } else {
        await saveCleanBaseSnapshots('card', [updatedCard], new Set());
      }

      for (const u of modifiedUsersList.filter((x) => affectedSet.has(x.id))) {
        const uOk = isOnline ? await dbSaveUser(u) : false;
        if (!uOk) {
          toQueue.push({
            entityType: 'user',
            entityId: u.id,
            operation: 'upsert',
            label: u.name,
            payload: u,
          });
        } else {
          await saveCleanBaseSnapshots('user', [u], new Set());
        }
      }

      if (toQueue.length > 0) await enqueueOfflineBatch(toQueue);
      showToast(
        toQueue.length > 0
          ? `Card "${targetCard.businessName}" unallocated offline — queued for Sync Now.`
          : `Card "${targetCard.businessName}" is now unallocated.`
      );
      return;
    }

    const isCompanyMasterTemplate = isMasterTemplateCard(targetCard);
    const resolvedCompId =
      targetCard.companyId ||
      (companies.find((comp) => comp.id === targetCard.id) ? targetCard.id : undefined);

    let finalCardToSave: BusinessCard;
    let isNewCardCreated = false;

    if (isCompanyMasterTemplate) {
      // Reuse existing employee card in the same company if already allocated so we never create duplicates
      const existingEmpCardInCompany = cards.find(
        (c) =>
          !isMasterTemplateCard(c) &&
          (c.assignedMemberId === newEmployee.id || c.id === newEmployee.assignedCardId) &&
          (!resolvedCompId || c.companyId === resolvedCompId)
      );

      if (existingEmpCardInCompany) {
        finalCardToSave = {
          ...existingEmpCardInCompany,
          companyId: resolvedCompId || existingEmpCardInCompany.companyId,
          assignedMemberId: newEmployee.id,
          contactPersonName: syncContactInfo ? newEmployee.name : existingEmpCardInCompany.contactPersonName,
          designation: syncContactInfo
            ? newEmployee.designation || existingEmpCardInCompany.designation
            : existingEmpCardInCompany.designation,
          socialLinks: {
            ...existingEmpCardInCompany.socialLinks,
            phone: syncContactInfo
              ? newEmployee.phone || existingEmpCardInCompany.socialLinks?.phone || ''
              : existingEmpCardInCompany.socialLinks?.phone,
            whatsapp: syncContactInfo
              ? newEmployee.phone || existingEmpCardInCompany.socialLinks?.whatsapp || ''
              : existingEmpCardInCompany.socialLinks?.whatsapp,
            email: syncContactInfo
              ? newEmployee.email || existingEmpCardInCompany.socialLinks?.email || ''
              : existingEmpCardInCompany.socialLinks?.email,
          },
          updatedAt: now,
        };
      } else {
        // CLONE a unique employee card from the company template so the template stays untouched
        isNewCardCreated = true;
        const newCardId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `c-alloc-${Date.now()}`;
        const compSlug = (targetCard.slug || 'card')
          .split('-')[0]
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '');
        const namePart = newEmployee.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        const baseSlug = (namePart ? `${compSlug}-${namePart}` : `${compSlug}-member`).slice(0, 32);
        const uniqueSlug = ensureUniqueSlug(baseSlug, cards, newCardId);

        finalCardToSave = {
          ...targetCard,
          id: newCardId,
          companyId: resolvedCompId,
          slug: uniqueSlug,
          businessName: targetCard.businessName,
          contactPersonName: newEmployee.name,
          designation: newEmployee.designation || targetCard.designation,
          assignedMemberId: newEmployee.id,
          logoUrl: targetCard.logoUrl,
          socialLinks: {
            ...targetCard.socialLinks,
            phone: newEmployee.phone || targetCard.socialLinks?.phone || '',
            whatsapp: newEmployee.phone || targetCard.socialLinks?.whatsapp || '',
            email: newEmployee.email || targetCard.socialLinks?.email || '',
          },
          status: 'live',
          viewsCount: 0,
          sharesCount: 0,
          callClicksCount: 0,
          whatsappClicksCount: 0,
          vcardDownloadsCount: 0,
          createdAt: now,
          updatedAt: now,
        };
      }
    } else {
      // Reassigning/updating an existing non-template card
      finalCardToSave = {
        ...targetCard,
        assignedMemberId: newEmployee.id,
        contactPersonName: syncContactInfo ? newEmployee.name : targetCard.contactPersonName,
        designation: syncContactInfo
          ? newEmployee.designation || targetCard.designation
          : targetCard.designation,
        socialLinks: {
          ...targetCard.socialLinks,
          phone: syncContactInfo
            ? newEmployee.phone || targetCard.socialLinks?.phone || ''
            : targetCard.socialLinks?.phone,
          whatsapp: syncContactInfo
            ? newEmployee.phone || targetCard.socialLinks?.whatsapp || ''
            : targetCard.socialLinks?.whatsapp,
          email: syncContactInfo
            ? newEmployee.email || targetCard.socialLinks?.email || ''
            : targetCard.socialLinks?.email,
        },
        updatedAt: now,
      };
    }

    // Clear assignedMemberId on any OTHER card previously owned by newEmployee to enforce 1-to-1
    const unlinkedOldCards: BusinessCard[] = [];
    let updatedCardsList = isNewCardCreated ? [finalCardToSave, ...cards] : [...cards];
    updatedCardsList = updatedCardsList.map((c) => {
      if (c.id === finalCardToSave.id) return finalCardToSave;
      if (c.assignedMemberId === newEmployee.id || c.id === newEmployee.assignedCardId) {
        const cleared = { ...c, assignedMemberId: undefined, updatedAt: now };
        unlinkedOldCards.push(cleared);
        return cleared;
      }
      return c;
    });

    setCards(updatedCardsList);
    safeLocalStorageSet('yebocards_data', JSON.stringify(updatedCardsList));
    await idbSet('cards', 'all_cards', updatedCardsList);
    unmarkCardAsDeleted(finalCardToSave.id);

    // Update newEmployee (preserving multi-company companyIds) and clear any previous owner of targetCard
    const updatedEmp: User = syncUserCompanies(
      {
        ...newEmployee,
        assignedCardId: finalCardToSave.id,
        updatedAt: now,
      },
      { addCompanyIds: [finalCardToSave.companyId] }
    );

    const modifiedUsers: User[] = [updatedEmp];
    const nextUsersList = users.map((u) => {
      if (u.id === newEmployee.id) return updatedEmp;
      if (u.assignedCardId === finalCardToSave.id || u.id === targetCard.assignedMemberId) {
        const clearedPrev = { ...u, assignedCardId: undefined, updatedAt: now };
        modifiedUsers.push(clearedPrev);
        return clearedPrev;
      }
      return u;
    });

    setUsers(nextUsersList);
    safeLocalStorageSet('yebousers_data', JSON.stringify(nextUsersList));
    await idbSet('users', 'all_users', nextUsersList);

    const toQueue: EnqueueInput[] = [];
    for (const c of [finalCardToSave, ...unlinkedOldCards]) {
      const ok = isOnline ? await dbSaveCard(c) : false;
      if (!ok) {
        toQueue.push({
          entityType: 'card',
          entityId: c.id,
          operation: 'upsert',
          label: `${c.businessName}${c.contactPersonName ? ` · ${c.contactPersonName}` : ''}`,
          payload: c,
        });
      } else {
        await saveCleanBaseSnapshots('card', [c], new Set());
      }
    }
    for (const u of modifiedUsers) {
      const ok = isOnline ? await dbSaveUser(u) : false;
      if (!ok) {
        toQueue.push({
          entityType: 'user',
          entityId: u.id,
          operation: 'upsert',
          label: u.name,
          payload: u,
        });
      } else {
        await saveCleanBaseSnapshots('user', [u], new Set());
      }
    }
    if (toQueue.length > 0) await enqueueOfflineBatch(toQueue);

    setSelectedCardId(finalCardToSave.id);
    showToast(
      toQueue.length > 0
        ? `Card allocated offline to ${newEmployee.name} — queued for Sync Now!`
        : `Unique card allocated to ${newEmployee.name} (/card/${finalCardToSave.slug})!`
    );
  };

  // Dedicated Bulk Card Allocation (Allocating cards to multiple employees simultaneously & saving to database)
  const handleBulkAllocateCards = async (
    companyCardId: string,
    employeeIds: string[],
    syncContactInfo: boolean
  ) => {
    const templateCard = cards.find((c) => c.id === companyCardId) || cards[0];
    if (!templateCard || employeeIds.length === 0) return;

    const now = new Date().toISOString();
    let updatedCardsList = [...cards];
    let updatedUsersList = [...users];
    const assignedCompId =
      templateCard.companyId ||
      (companies.find((comp) => comp.id === templateCard.id) ? templateCard.id : undefined);
    const touchedCards: BusinessCard[] = [];
    const touchedUsers: User[] = [];

    for (const empId of employeeIds) {
      const emp = updatedUsersList.find((u) => u.id === empId);
      if (!emp) continue;

      // Never hijack a Master Template as an employee's personal card
      let empCard = updatedCardsList.find(
        (c) =>
          !isMasterTemplateCard(c) &&
          (c.assignedMemberId === emp.id || (emp.assignedCardId && c.id === emp.assignedCardId)) &&
          (!assignedCompId || c.companyId === assignedCompId)
      );

      // If employee previously owned a card elsewhere, clear its assignedMemberId to preserve 1-to-1
      const otherOwnedCards = updatedCardsList.filter(
        (c) =>
          c.id !== empCard?.id &&
          (c.assignedMemberId === emp.id || (emp.assignedCardId && c.id === emp.assignedCardId))
      );
      for (const oldCard of otherOwnedCards) {
        const clearedOld = { ...oldCard, assignedMemberId: undefined, updatedAt: now };
        updatedCardsList = updatedCardsList.map((c) => (c.id === clearedOld.id ? clearedOld : c));
        touchedCards.push(clearedOld);
      }

      const cardId = empCard
        ? empCard.id
        : typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `c-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      const compSlug = (templateCard.slug || 'card')
        .split('-')[0]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
      const namePart = emp.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const baseSlug = (namePart ? `${compSlug}-${namePart}` : `${compSlug}-member`).slice(0, 32);

      const uniqueSlug = empCard
        ? empCard.slug
        : ensureUniqueSlug(baseSlug, updatedCardsList, cardId);

      const newOrUpdatedCard: BusinessCard = {
        ...(empCard || templateCard),
        id: cardId,
        companyId: assignedCompId ?? empCard?.companyId,
        slug: uniqueSlug,
        businessName: templateCard.businessName,
        tagline: templateCard.tagline,
        businessType: templateCard.businessType,
        businessTypeLabel: templateCard.businessTypeLabel,
        contactPersonName: syncContactInfo ? emp.name : empCard?.contactPersonName || emp.name,
        designation: syncContactInfo
          ? emp.designation || templateCard.designation
          : empCard?.designation || emp.designation || templateCard.designation,
        logoUrl: templateCard.logoUrl,
        theme: templateCard.theme,
        banners: templateCard.banners,
        aboutText: templateCard.aboutText,
        services: templateCard.services,
        galleryImages: templateCard.galleryImages,
        multimedia: templateCard.multimedia || [],
        operatingHours: templateCard.operatingHours,
        assignedMemberId: emp.id,
        status: 'live',
        viewsCount: empCard ? empCard.viewsCount : 0,
        sharesCount: empCard ? empCard.sharesCount : 0,
        callClicksCount: empCard ? empCard.callClicksCount : 0,
        whatsappClicksCount: empCard ? empCard.whatsappClicksCount : 0,
        vcardDownloadsCount: empCard ? empCard.vcardDownloadsCount : 0,
        createdAt: empCard ? empCard.createdAt : now,
        socialLinks: {
          ...templateCard.socialLinks,
          phone: syncContactInfo
            ? emp.phone || templateCard.socialLinks?.phone || ''
            : empCard?.socialLinks?.phone || emp.phone || '',
          whatsapp: syncContactInfo
            ? emp.phone || templateCard.socialLinks?.whatsapp || ''
            : empCard?.socialLinks?.whatsapp || emp.phone || '',
          email: syncContactInfo
            ? emp.email || templateCard.socialLinks?.email || ''
            : empCard?.socialLinks?.email || emp.email || '',
        },
        updatedAt: now,
      };

      unmarkCardAsDeleted(cardId);
      const existingIdx = updatedCardsList.findIndex((c) => c.id === cardId);
      if (existingIdx >= 0) {
        updatedCardsList[existingIdx] = newOrUpdatedCard;
      } else {
        updatedCardsList.unshift(newOrUpdatedCard);
      }
      touchedCards.push(newOrUpdatedCard);

      const empIdx = updatedUsersList.findIndex((u) => u.id === empId);
      if (empIdx >= 0) {
        const updatedEmp: User = syncUserCompanies(
          {
            ...updatedUsersList[empIdx],
            assignedCardId: cardId,
            updatedAt: now,
          },
          { addCompanyIds: [assignedCompId] }
        );
        updatedUsersList[empIdx] = updatedEmp;
        touchedUsers.push(updatedEmp);
      }
    }

    setCards(updatedCardsList);
    setUsers(updatedUsersList);
    safeLocalStorageSet('yebocards_data', JSON.stringify(updatedCardsList));
    safeLocalStorageSet('yebousers_data', JSON.stringify(updatedUsersList));
    await idbSet('cards', 'all_cards', updatedCardsList);
    await idbSet('users', 'all_users', updatedUsersList);

    const toQueue: EnqueueInput[] = [];
    for (const c of touchedCards) {
      const ok = isOnline ? await dbSaveCard(c) : false;
      if (!ok) {
        toQueue.push({
          entityType: 'card',
          entityId: c.id,
          operation: 'upsert',
          label: `${c.businessName}${c.contactPersonName ? ` · ${c.contactPersonName}` : ''}`,
          payload: c,
        });
      } else {
        await saveCleanBaseSnapshots('card', [c], new Set());
      }
    }
    for (const u of touchedUsers) {
      const ok = isOnline ? await dbSaveUser(u) : false;
      if (!ok) {
        toQueue.push({
          entityType: 'user',
          entityId: u.id,
          operation: 'upsert',
          label: u.name,
          payload: u,
        });
      } else {
        await saveCleanBaseSnapshots('user', [u], new Set());
      }
    }
    if (toQueue.length > 0) await enqueueOfflineBatch(toQueue);

    showToast(
      toQueue.length > 0
        ? `Allocated cards offline to ${employeeIds.length} employee(s) — queued for Sync Now!`
        : `Successfully allocated unique cards to ${employeeIds.length} employee(s) & saved to database!`
    );
  };

  // Dedicated helper to unlink an employee from a card cleanly on both sides
  const handleUnlinkEmployeeCard = async (employeeId: string, cardId?: string) => {
    const now = new Date().toISOString();
    const targetEmployee = users.find((u) => u.id === employeeId);
    const targetCardId = cardId || targetEmployee?.assignedCardId;
    const toQueue: EnqueueInput[] = [];

    const matchingCards = cards.filter(
      (c) => (targetCardId && c.id === targetCardId) || c.assignedMemberId === employeeId
    );
    if (matchingCards.length > 0) {
      const matchingCardIds = new Set(matchingCards.map((c) => c.id));
      const nextCards = cards.map((c) =>
        matchingCardIds.has(c.id) ? { ...c, assignedMemberId: undefined, updatedAt: now } : c
      );
      setCards(nextCards);
      safeLocalStorageSet('yebocards_data', JSON.stringify(nextCards));
      await idbSet('cards', 'all_cards', nextCards);
      for (const c of nextCards.filter((x) => matchingCardIds.has(x.id))) {
        const ok = isOnline ? await dbSaveCard(c) : false;
        if (!ok) {
          toQueue.push({ entityType: 'card', entityId: c.id, operation: 'upsert', label: c.businessName, payload: c });
        } else {
          await saveCleanBaseSnapshots('card', [c], new Set());
        }
      }
    }

    const matchingUserIds = new Set(
      users
        .filter((u) => u.id === employeeId || (targetCardId && u.assignedCardId === targetCardId))
        .map((u) => u.id)
    );
    if (matchingUserIds.size > 0) {
      const nextUsers = users.map((u) =>
        matchingUserIds.has(u.id) ? { ...u, assignedCardId: undefined, updatedAt: now } : u
      );
      setUsers(nextUsers);
      safeLocalStorageSet('yebousers_data', JSON.stringify(nextUsers));
      await idbSet('users', 'all_users', nextUsers);
      for (const u of nextUsers.filter((x) => matchingUserIds.has(x.id))) {
        const ok = isOnline ? await dbSaveUser(u) : false;
        if (!ok) {
          toQueue.push({ entityType: 'user', entityId: u.id, operation: 'upsert', label: u.name, payload: u });
        } else {
          await saveCleanBaseSnapshots('user', [u], new Set());
        }
      }
    }

    if (toQueue.length > 0) await enqueueOfflineBatch(toQueue);
    if (targetEmployee) {
      showToast(
        toQueue.length > 0
          ? `Unlinked ${targetEmployee.name} offline — queued for Sync Now.`
          : `Unlinked ${targetEmployee.name} from smart card.`
      );
    }
  };

  // Dedicated helper to select (and optionally auto-allocate on explicit click) an employee card for live preview
  const handleSelectEmployeeForPreview = async (
    emp: User,
    options: { autoCreate?: boolean } = {}
  ) => {
    const { autoCreate = false } = options;
    const latestCards = cardsRef.current;
    const targetComp =
      activeCompany ||
      companies.find((c) => c.id === emp.companyId || getUserCompanyIds(emp).includes(c.id)) ||
      companies[0];

    // Strict ID-based lookup (never fuzzy name matching)
    let empCard =
      latestCards.find((c) => c.assignedMemberId === emp.id) ||
      (emp.assignedCardId ? latestCards.find((c) => c.id === emp.assignedCardId) : undefined);

    if (!empCard && !autoCreate) {
      showToast(`No card allocated to ${emp.name} yet. Click "Allocate & Simulate" or "Issue Card".`);
      return;
    }

    if (!empCard && autoCreate && targetComp) {
      if (allocatingEmployeeIdsRef.current.has(emp.id)) {
        return; // Prevent rapid double-click duplicate card minting
      }
      allocatingEmployeeIdsRef.current.add(emp.id);

      try {
        const templateCard =
          companyTemplateCard ||
          latestCards.find((c) => c.companyId === targetComp.id && !c.assignedMemberId) ||
          companyCards.find((c) => !c.assignedMemberId) ||
          companyCards[0] ||
          latestCards[0];

        if (templateCard) {
          const now = new Date().toISOString();
          const cardId =
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `c-emp-${Date.now()}`;
          const compSlug = (templateCard.slug || targetComp.name || 'card')
            .split('-')[0]
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '');
          const namePart = emp.name
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/(^-|-$)/g, '');
          const desigPart = (emp.designation || 'staff')
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/(^-|-$)/g, '');
          const baseSlug = `${compSlug}-${namePart}-${desigPart}`.slice(0, 40);
          const uniqueSlug = ensureUniqueSlug(baseSlug, latestCards, cardId);

          empCard = {
            ...templateCard,
            id: cardId,
            companyId: targetComp.id,
            slug: uniqueSlug,
            businessName: templateCard.businessName || targetComp.name,
            tagline: templateCard.tagline || targetComp.tagline || '',
            contactPersonName: emp.name,
            designation: emp.designation || templateCard.designation,
            assignedMemberId: emp.id,
            logoUrl: targetComp.logoUrl || templateCard.logoUrl,
            theme: targetComp.theme || templateCard.theme,
            banners: templateCard.banners || [],
            services: templateCard.services || [],
            galleryImages: templateCard.galleryImages || [],
            multimedia: templateCard.multimedia || [],
            operatingHours: templateCard.operatingHours || targetComp.operatingHours || '',
            aboutText: emp.bio || templateCard.aboutText || targetComp.aboutText || '',
            socialLinks: {
              ...templateCard.socialLinks,
              phone: emp.phone || templateCard.socialLinks?.phone || '',
              whatsapp: emp.phone || templateCard.socialLinks?.whatsapp || '',
              email: emp.email || templateCard.socialLinks?.email || '',
              website: targetComp.website || templateCard.socialLinks?.website || '',
              address: targetComp.address || templateCard.socialLinks?.address || '',
            },
            status: 'live',
            viewsCount: 0,
            sharesCount: 0,
            callClicksCount: 0,
            whatsappClicksCount: 0,
            vcardDownloadsCount: 0,
            createdAt: now,
            updatedAt: now,
          };

          unmarkCardAsDeleted(empCard.id);
          const nextCards = [empCard, ...latestCards];
          setCards(nextCards);
          safeLocalStorageSet('yebocards_data', JSON.stringify(nextCards));
          await idbSet('cards', 'all_cards', nextCards);

          const updatedEmp: User = syncUserCompanies(
            { ...emp, assignedCardId: cardId, updatedAt: now },
            { addCompanyIds: [targetComp.id] }
          );
          const nextUsers = users.map((u) => (u.id === emp.id ? updatedEmp : u));
          setUsers(nextUsers);
          safeLocalStorageSet('yebousers_data', JSON.stringify(nextUsers));
          await idbSet('users', 'all_users', nextUsers);

          const toQueue: EnqueueInput[] = [];
          const cardOk = isOnline ? await dbSaveCard(empCard) : false;
          if (!cardOk) {
            toQueue.push({
              entityType: 'card',
              entityId: empCard.id,
              operation: 'upsert',
              label: `${empCard.businessName} · ${emp.name}`,
              payload: empCard,
            });
          } else {
            await saveCleanBaseSnapshots('card', [empCard], new Set());
          }
          const userOk = isOnline ? await dbSaveUser(updatedEmp) : false;
          if (!userOk) {
            toQueue.push({
              entityType: 'user',
              entityId: updatedEmp.id,
              operation: 'upsert',
              label: updatedEmp.name,
              payload: updatedEmp,
            });
          } else {
            await saveCleanBaseSnapshots('user', [updatedEmp], new Set());
          }
          if (toQueue.length > 0) await enqueueOfflineBatch(toQueue);
        }
      } finally {
        allocatingEmployeeIdsRef.current.delete(emp.id);
      }
    }

    if (empCard) {
      setSelectedCardId(empCard.id);
      showToast(`Simulating ${emp.name}'s unique smart card (/card/${empCard.slug})`);

      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setTimeout(() => {
          const simEl = document.getElementById('company-live-simulator');
          if (simEl) {
            simEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    }
  };

  // Dedicated helper to unlink an employee from a specific company (preserving other company affiliations)
  const handleUnlinkEmployeeFromCompany = async (employeeId: string, companyId: string) => {
    const now = new Date().toISOString();
    const targetEmployee = users.find((u) => u.id === employeeId);
    if (!targetEmployee) return;

    const toQueue: EnqueueInput[] = [];
    const linkedCompanyCards = cards.filter(
      (c) =>
        c.companyId === companyId &&
        (c.assignedMemberId === employeeId || targetEmployee.assignedCardId === c.id)
    );
    const linkedCardIds = new Set(linkedCompanyCards.map((c) => c.id));

    if (linkedCompanyCards.length > 0) {
      const nextCards = cards.map((c) =>
        linkedCardIds.has(c.id) ? { ...c, assignedMemberId: undefined, updatedAt: now } : c
      );
      setCards(nextCards);
      safeLocalStorageSet('yebocards_data', JSON.stringify(nextCards));
      await idbSet('cards', 'all_cards', nextCards);
      for (const c of nextCards.filter((x) => linkedCardIds.has(x.id))) {
        const ok = isOnline ? await dbSaveCard(c) : false;
        if (!ok) {
          toQueue.push({ entityType: 'card', entityId: c.id, operation: 'upsert', label: c.businessName, payload: c });
        } else {
          await saveCleanBaseSnapshots('card', [c], new Set());
        }
      }
    }

    const clearedCompanyUser = syncUserCompanies(targetEmployee, { removeCompanyIds: [companyId] });
    const updatedUser: User = {
      ...clearedCompanyUser,
      assignedCardId:
        targetEmployee.assignedCardId && linkedCardIds.has(targetEmployee.assignedCardId)
          ? undefined
          : targetEmployee.assignedCardId,
      updatedAt: now,
    };
    const nextUsers = users.map((u) => (u.id === employeeId ? updatedUser : u));
    setUsers(nextUsers);
    safeLocalStorageSet('yebousers_data', JSON.stringify(nextUsers));
    await idbSet('users', 'all_users', nextUsers);

    const userOk = isOnline ? await dbSaveUser(updatedUser) : false;
    if (!userOk) {
      toQueue.push({ entityType: 'user', entityId: updatedUser.id, operation: 'upsert', label: updatedUser.name, payload: updatedUser });
    } else {
      await saveCleanBaseSnapshots('user', [updatedUser], new Set());
    }
    if (toQueue.length > 0) await enqueueOfflineBatch(toQueue);
    showToast(
      toQueue.length > 0
        ? `Unlinked ${targetEmployee.name} offline — queued for Sync Now.`
        : `Unlinked ${targetEmployee.name} from company.`
    );
  };

  // Dedicated helper to link an existing employee to a company (preserving existing companies)
  const handleLinkEmployeeToCompany = async (employeeId: string, companyId: string) => {
    const targetEmployee = users.find((u) => u.id === employeeId);
    if (!targetEmployee) return;

    const targetCompany = companies.find((c) => c.id === companyId);
    const updatedUser: User = syncUserCompanies(
      { ...targetEmployee, updatedAt: new Date().toISOString() },
      { addCompanyIds: [companyId], primaryCompanyId: targetEmployee.companyId || companyId }
    );
    const nextUsers = users.map((u) => (u.id === employeeId ? updatedUser : u));
    setUsers(nextUsers);
    safeLocalStorageSet('yebousers_data', JSON.stringify(nextUsers));
    await idbSet('users', 'all_users', nextUsers);

    const ok = isOnline ? await dbSaveUser(updatedUser) : false;
    if (!ok) {
      await enqueueOfflineChange({
        entityType: 'user',
        entityId: updatedUser.id,
        operation: 'upsert',
        label: updatedUser.name,
        payload: updatedUser,
      });
    } else {
      await removeQueuedOperation(`user:${updatedUser.id}`);
      await saveCleanBaseSnapshots('user', [updatedUser], new Set());
    }

    setShowLinkEmployeeModal(false);
    showToast(
      ok
        ? `Linked ${targetEmployee.name} to ${targetCompany?.name || 'company'}!`
        : `Linked ${targetEmployee.name} offline — queued for Sync Now.`
    );
  };

  // Issue Company Card to Employee (Local-first with explicit confirmation and admin password sync)
  const commitIssueEmployeeCardLocally = async (
    cardToSave: BusinessCard,
    newEmployee?: User
  ): Promise<{
    finalCard: BusinessCard;
    unlinkedCards: BusinessCard[];
    modifiedUsers: User[];
  }> => {
    const now = new Date().toISOString();
    unmarkCardAsDeleted(cardToSave.id);

    const uniqueSlug = ensureUniqueSlug(cardToSave.slug || cardToSave.businessName, cards, cardToSave.id);
    let workingUsers = [...users];
    const modifiedUsers: User[] = [];

    // 1. Add or update User if newEmployee is provided OR sync existing assignedMemberId user
    let targetUserId = cardToSave.assignedMemberId;
    if (newEmployee) {
      const cleanEmail = normalizeEmail(newEmployee.email);
      const existingByEmailOrId = workingUsers.find(
        (u) => u.id === newEmployee.id || (cleanEmail && normalizeEmail(u.email) === cleanEmail)
      );
      targetUserId = existingByEmailOrId ? existingByEmailOrId.id : newEmployee.id;

      const syncedEmployee = syncUserCompanies(
        {
          ...(existingByEmailOrId || newEmployee),
          id: targetUserId,
          name: newEmployee.name,
          email: newEmployee.email.trim(),
          phone: newEmployee.phone || existingByEmailOrId?.phone,
          designation: newEmployee.designation || existingByEmailOrId?.designation,
          assignedCardId: cardToSave.id,
          updatedAt: now,
        },
        { addCompanyIds: [cardToSave.companyId] }
      );

      workingUsers = existingByEmailOrId
        ? workingUsers.map((u) => (u.id === targetUserId ? syncedEmployee : u))
        : [...workingUsers, syncedEmployee];
      modifiedUsers.push(syncedEmployee);
    } else if (targetUserId) {
      workingUsers = workingUsers.map((u) => {
        if (u.id === targetUserId) {
          const synced = syncUserCompanies(
            { ...u, assignedCardId: cardToSave.id, updatedAt: now },
            { addCompanyIds: [cardToSave.companyId] }
          );
          modifiedUsers.push(synced);
          return synced;
        }
        if (u.assignedCardId === cardToSave.id) {
          const cleared = { ...u, assignedCardId: undefined, updatedAt: now };
          modifiedUsers.push(cleared);
          return cleared;
        }
        return u;
      });
    }

    // Clear any other user that still claimed cardToSave.id
    if (targetUserId) {
      workingUsers = workingUsers.map((u) => {
        if (u.id !== targetUserId && u.assignedCardId === cardToSave.id) {
          const cleared = { ...u, assignedCardId: undefined, updatedAt: now };
          modifiedUsers.push(cleared);
          return cleared;
        }
        return u;
      });
    }

    const finalCard: BusinessCard = {
      ...cardToSave,
      slug: uniqueSlug,
      assignedMemberId: targetUserId,
      updatedAt: now,
    };

    // 2. Enforce 1-to-1 on cards: unlink any other card that previously belonged to targetUserId
    const unlinkedCards: BusinessCard[] = [];
    const exists = cards.some((c) => c.id === finalCard.id);
    let updatedCards = exists
      ? cards.map((c) => (c.id === finalCard.id ? finalCard : c))
      : [finalCard, ...cards];

    updatedCards = updatedCards.map((c) => {
      if (targetUserId && c.id !== finalCard.id && c.assignedMemberId === targetUserId) {
        const cleared = { ...c, assignedMemberId: undefined, updatedAt: now };
        unlinkedCards.push(cleared);
        return cleared;
      }
      return c;
    });

    setCards(updatedCards);
    setSelectedCardId(finalCard.id);
    await idbSet('cards', 'all_cards', updatedCards);
    safeLocalStorageSet('yebocards_data', JSON.stringify(updatedCards));

    setUsers(workingUsers);
    await idbSet('users', 'all_users', workingUsers);
    safeLocalStorageSet('yebousers_data', JSON.stringify(workingUsers));

    await enqueueOfflineBatch([
      {
        entityType: 'card',
        entityId: finalCard.id,
        operation: 'upsert',
        label: `${finalCard.businessName}${finalCard.contactPersonName ? ` · ${finalCard.contactPersonName}` : ''}`,
        payload: finalCard,
      },
      ...unlinkedCards.map((c) => ({
        entityType: 'card' as const,
        entityId: c.id,
        operation: 'upsert' as const,
        label: c.businessName,
        payload: c,
      })),
      ...modifiedUsers.map((u) => ({
        entityType: 'user' as const,
        entityId: u.id,
        operation: 'upsert' as const,
        label: u.name,
        payload: u,
      })),
    ]);

    return { finalCard, unlinkedCards, modifiedUsers };
  };

  const handleIssueEmployeeCard = async (newCard: BusinessCard, newEmployee?: User) => {
    const cardToSave: BusinessCard = {
      ...newCard,
      companyId: newCard.companyId || selectedCompanyId || undefined,
    };
    const isUpdateExisting = cards.some((c) => c.id === cardToSave.id);
    const previewSlug = ensureUniqueSlug(cardToSave.slug || cardToSave.businessName, cards, cardToSave.id);

    if (!isOnline) {
      const { finalCard } = await commitIssueEmployeeCardLocally(cardToSave, newEmployee);
      setShowIssueEmployeeModal(false);
      setIssueCardTargetUser(null);
      showToast(`Smart Card "${finalCard.contactPersonName || finalCard.businessName}" issued offline — queued for Sync Now!`);
      return;
    }

    setSaveConfirmModalConfig({
      isOpen: true,
      title: isUpdateExisting
        ? 'Confirm Database Action: Update Employee Smart Card'
        : 'Confirm Database Action: Issue Employee Smart Card',
      entityName: cardToSave.contactPersonName || cardToSave.businessName,
      entityType: 'employee',
      actionType: isUpdateExisting ? 'update' : 'create',
      detailsSummary: `Employee: ${cardToSave.contactPersonName || 'Staff'} · Card: ${cardToSave.businessName} (/${previewSlug})`,
      onSaveLocally: async () => {
        const { finalCard } = await commitIssueEmployeeCardLocally(cardToSave, newEmployee);
        setShowIssueEmployeeModal(false);
        setIssueCardTargetUser(null);
        setSaveConfirmModalConfig(null);
        showToast(`Smart Card "${finalCard.contactPersonName || finalCard.businessName}" saved locally & queued for Sync Now!`);
      },
      onSaveAndSyncImmediately: async () => {
        const { finalCard, unlinkedCards, modifiedUsers } = await commitIssueEmployeeCardLocally(cardToSave, newEmployee);
        setShowIssueEmployeeModal(false);
        setIssueCardTargetUser(null);
        setSaveConfirmModalConfig(null);
        setDbSyncModalConfig({
          isOpen: true,
          title: 'Authorize Database Sync: Issue Card',
          description: `Confirm issuing and writing smart card for "${finalCard.contactPersonName || finalCard.businessName}" to the central production database.`,
          targetDetails: `Card: ${finalCard.businessName} (/${finalCard.slug})`,
          onConfirmSync: async () => {
            const ok = await dbSaveCard(finalCard);
            if (ok) {
              await removeQueuedOperation(`card:${finalCard.id}`);
              await saveCleanBaseSnapshots('card', [finalCard], new Set());
            }
            for (const oldCard of unlinkedCards) {
              const oldOk = await dbSaveCard(oldCard);
              if (oldOk) {
                await removeQueuedOperation(`card:${oldCard.id}`);
                await saveCleanBaseSnapshots('card', [oldCard], new Set());
              }
            }
            for (const u of modifiedUsers) {
              const uOk = await dbSaveUser(u);
              if (uOk) {
                await removeQueuedOperation(`user:${u.id}`);
                await saveCleanBaseSnapshots('user', [u], new Set());
              }
            }
            showToast(`Smart Card "${finalCard.contactPersonName || finalCard.businessName}" issued & synced to central database!`);
          },
        });
      },
    });
  };

  const handleLeadSubmit = async (leadData: Omit<LeadInquiry, 'id' | 'createdAt' | 'status'>) => {
    const now = new Date().toISOString();
    const newLead: LeadInquiry = {
      ...leadData,
      id: `lead-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      status: 'new',
    };
    const nextLeads = [newLead, ...leads.filter((l) => l.id !== newLead.id)];
    setLeads(nextLeads);
    safeLocalStorageSet('yeboleads_data', JSON.stringify(nextLeads));
    await idbSet('leads', 'all_leads', nextLeads);

    const savedRes = isOnline ? await dbSaveLeadWithMonitor(newLead) : { ok: false };
    if (savedRes.ok && savedRes.lead) {
      const synced = nextLeads.map((l) => (l.id === newLead.id ? { ...l, ...savedRes.lead } : l));
      setLeads(synced);
      safeLocalStorageSet('yeboleads_data', JSON.stringify(synced));
      await idbSet('leads', 'all_leads', synced);
      await saveCleanBaseSnapshots('lead', [savedRes.lead], new Set());
      showToast(
        savedRes.emailNotification?.status === 'sent'
          ? `Inquiry saved & cardholder alerted (${savedRes.emailNotification.recipientEmail})`
          : `Inquiry saved (#${newLead.id.slice(-6).toUpperCase()}) & cardholder alert activated!`
      );
    } else {
      await enqueueOfflineChange({
        entityType: 'lead',
        entityId: newLead.id,
        operation: 'upsert',
        label: `${newLead.name} (${newLead.cardName || 'Enquiry'})`,
        payload: newLead,
      });
      showToast(`Enquiry saved offline (#${newLead.id.slice(-6).toUpperCase()}) — queued for Sync Now!`);
    }
  };

  const handleUpdateLead = async (id: string, updates: Partial<LeadInquiry>) => {
    const now = new Date().toISOString();
    const targetLead = leads.find((l) => l.id === id);
    const updatedLead: LeadInquiry | null = targetLead
      ? { ...targetLead, ...updates, updatedAt: now }
      : null;

    const nextLeads = leads.map((l) => (l.id === id ? { ...l, ...updates, updatedAt: now } : l));
    setLeads(nextLeads);
    safeLocalStorageSet('yeboleads_data', JSON.stringify(nextLeads));
    await idbSet('leads', 'all_leads', nextLeads);

    const result = isOnline ? await dbUpdateLead(id, updates) : { ok: false };
    if (result.ok) {
      await removeQueuedOperation(`lead:${id}`);
      if (result.lead) {
        const syncedLeads = nextLeads.map((l) => (l.id === id ? { ...l, ...result.lead } : l));
        setLeads(syncedLeads);
        safeLocalStorageSet('yeboleads_data', JSON.stringify(syncedLeads));
        await idbSet('leads', 'all_leads', syncedLeads);
        await saveCleanBaseSnapshots('lead', [result.lead], new Set());
      } else if (updatedLead) {
        await saveCleanBaseSnapshots('lead', [updatedLead], new Set());
      }
      if (result.emailNotification) {
        const eml = result.emailNotification;
        showToast(
          eml.status === 'sent'
            ? `Lead updated & cardholder notified (${eml.recipientEmail})`
            : `Lead updated & follow-up alert active for ${eml.recipientEmail}`
        );
      } else {
        showToast('Lead record updated.');
      }
    } else if (updatedLead) {
      await enqueueOfflineChange({
        entityType: 'lead',
        entityId: updatedLead.id,
        operation: 'upsert',
        label: `${updatedLead.name} (${updatedLead.cardName || 'Enquiry'})`,
        payload: updatedLead,
      });
      showToast('Enquiry update saved offline — queued for Sync Now!');
    }
  };

  const handleAddManualLead = async (leadData: Omit<LeadInquiry, 'id' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const newLead: LeadInquiry = {
      ...leadData,
      id: `lead-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };
    const nextLeads = [newLead, ...leads];
    setLeads(nextLeads);
    safeLocalStorageSet('yeboleads_data', JSON.stringify(nextLeads));
    await idbSet('leads', 'all_leads', nextLeads);

    const savedRes = isOnline ? await dbSaveLeadWithMonitor(newLead) : { ok: false };
    if (savedRes.ok && savedRes.lead) {
      const synced = nextLeads.map((l) => (l.id === newLead.id ? { ...l, ...savedRes.lead } : l));
      setLeads(synced);
      safeLocalStorageSet('yeboleads_data', JSON.stringify(synced));
      await idbSet('leads', 'all_leads', synced);
      await saveCleanBaseSnapshots('lead', [savedRes.lead], new Set());
      showToast('Customer inquiry recorded & cardholder alert activated!');
    } else {
      await enqueueOfflineChange({
        entityType: 'lead',
        entityId: newLead.id,
        operation: 'upsert',
        label: `${newLead.name} (${newLead.cardName || 'Enquiry'})`,
        payload: newLead,
      });
      showToast('Customer inquiry saved offline — queued for Sync Now!');
    }
  };

  const handleActionClick = async (type: 'call' | 'whatsapp' | 'share' | 'vcard' | 'view') => {
    if (!activeCard) return;
    const cardId = activeCard.id;

    if (type === 'view') {
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId ? { ...c, viewsCount: (c.viewsCount || 0) + 1 } : c
        )
      );
      await dbIncrementCardMetric(cardId, 'view');
    } else if (type === 'call') {
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId ? { ...c, callClicksCount: (c.callClicksCount || 0) + 1 } : c
        )
      );
      await dbIncrementCardMetric(cardId, 'call');
    } else if (type === 'whatsapp') {
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, whatsappClicksCount: (c.whatsappClicksCount || 0) + 1 }
            : c
        )
      );
      await dbIncrementCardMetric(cardId, 'whatsapp');
    } else if (type === 'share') {
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId ? { ...c, sharesCount: (c.sharesCount || 0) + 1 } : c
        )
      );
      await dbIncrementCardMetric(cardId, 'share');
    } else if (type === 'vcard') {
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? { ...c, vcardDownloadsCount: (c.vcardDownloadsCount || 0) + 1 }
            : c
        )
      );
      await dbIncrementCardMetric(cardId, 'vcard');
    }
  };

  const pendingApprovalsCount = useMemo(() => {
    return companies.filter((c) => c.status === 'pending_approval').length;
  }, [companies]);

  const activeCompaniesCount = useMemo(() => {
    return companies.filter((c) => !c.status || c.status === 'active').length;
  }, [companies]);

  const inactiveCompaniesCount = useMemo(() => {
    return companies.filter((c) => c.status === 'inactive' || c.status === 'suspended').length;
  }, [companies]);

  // Filtered companies for the Home Page Directory
  const filteredCompanies = useMemo(() => {
    return companies.filter((comp) => {
      const matchesSearch =
        !searchCompanyQuery ||
        comp.name.toLowerCase().includes(searchCompanyQuery.toLowerCase()) ||
        comp.tagline.toLowerCase().includes(searchCompanyQuery.toLowerCase()) ||
        comp.categoryLabel.toLowerCase().includes(searchCompanyQuery.toLowerCase());

      const matchesCategory =
        selectedCategoryFilter === 'all' || comp.category === selectedCategoryFilter;

      const compStatus = comp.status || 'active';
      const matchesStatus =
        companyStatusFilter === 'all' ||
        (companyStatusFilter === 'pending' && compStatus === 'pending_approval') ||
        (companyStatusFilter === 'active' && compStatus === 'active') ||
        (companyStatusFilter === 'inactive' && (compStatus === 'inactive' || compStatus === 'suspended'));

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [companies, searchCompanyQuery, selectedCategoryFilter, companyStatusFilter]);

  // Unique categories list for filters
  const availableCategories = useMemo(() => {
    return Array.from(
      new Set(companies.map((c) => c.category).filter(Boolean))
    );
  }, [companies]);

  // STANDALONE PREVIEW VIEW
  if (activeView === 'preview_standalone') {
    const handleCloseStandaloneCard = () => {
      try {
        window.close();
      } catch {
        // ignore
      }
      if (currentUser && currentUser.role === 'admin') {
        setActiveView('dashboard');
        try {
          window.history.pushState({}, '', '/app');
        } catch {
          window.location.hash = '';
        }
      } else if (window.history.length > 1) {
        window.history.back();
      } else {
        setIsAppRoute(false);
        setActiveView('dashboard');
        try {
          window.history.pushState({}, '', '/');
        } catch {
          window.location.hash = '';
        }
      }
    };

    if (isUrlCardLoading && !activeCard) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4 shadow-2xl max-w-sm w-full">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">Loading Digital Smart Card</h3>
            <p className="text-xs text-slate-400 font-mono">Connecting to B-SMART™ Network...</p>
          </div>
          <div className="mt-8 text-center text-xs text-slate-500 font-medium">
            Powered by <a href="/" className="text-amber-400 font-bold hover:underline">B-SMART™</a>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-start items-center p-0 sm:py-6 overflow-y-auto">
        <div className="w-full flex-1 flex flex-col items-center justify-start p-0 sm:p-4">
          {activeCard ? (
            <CardView
              card={activeCard}
              allocatedMember={
                users.find((u) => u.id === activeCard.assignedMemberId) ||
                users.find((u) => u.assignedCardId === activeCard.id) ||
                (activeCard as any)._member ||
                null
              }
              company={companies.find((c) => c.id === (activeCard.companyId || users.find((u) => u.id === activeCard.assignedMemberId)?.companyId)) || (activeCard as any)._company || undefined}
              companyTemplate={cards.find((c) => c.companyId === activeCard.companyId && !c.assignedMemberId) || (activeCard as any)._companyTemplate || undefined}
              onLeadSubmit={handleLeadSubmit}
              onActionClick={handleActionClick}
              isStandalone={true}
              onClose={handleCloseStandaloneCard}
            />
          ) : (
            <div className="my-auto p-8 max-w-sm mx-auto text-center rounded-2xl border bg-slate-900 border-slate-800 space-y-3.5 shadow-2xl">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <h3 className="text-base font-bold text-white">Card Link Unavailable</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This digital smart card could not be located or may have been updated.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsAppRoute(false);
                  setActiveView('dashboard');
                  try {
                    window.history.pushState({}, '', '/');
                  } catch {
                    window.location.hash = '';
                  }
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-colors cursor-pointer"
              >
                Go to B-SMART™ Home
              </button>
            </div>
          )}
        </div>
        <OfflineSyncIndicator
          isOnline={isOnline}
          isChecking={isCheckingNetwork}
          queue={syncQueue}
          isSyncing={isSyncingQueue}
          onSyncNow={handleSyncNow}
          onCheckConnection={checkConnectionNow}
          onDiscardOperation={handleDiscardQueuedOp}
        />
        <SyncConflictModal
          isOpen={showConflictModal}
          conflicts={pendingSyncConflictState?.conflicts || []}
          readyCount={pendingSyncConflictState?.readyCount || 0}
          isApplying={isSyncingQueue}
          onResolve={handleResolveConflicts}
          onCancel={() => {
            setShowConflictModal(false);
            setPendingSyncConflictState(null);
          }}
        />
      </div>
    );
  }

  // If at root '/' and not explicitly on the '/app' route or standalone card view: Show the rich Landing Page!
  if (!isAppRoute) {
    return (
      <>
        <LandingPage
          onLaunchApp={() => {
            setIsAppRoute(true);
            try {
              window.history.pushState({}, '', '/app');
            } catch {
              // ignore
            }
          }}
          onOpenSignUpModal={() => setShowCompanySignUpModal(true)}
          sampleCard={cards[0]}
        />
        {showCompanySignUpModal && (
          <CompanySignUpModal
            isOpen={showCompanySignUpModal}
            onClose={() => setShowCompanySignUpModal(false)}
            onCompanyRegistered={handleCompanyRegistered}
          />
        )}
        <OfflineSyncIndicator
          isOnline={isOnline}
          isChecking={isCheckingNetwork}
          queue={syncQueue}
          isSyncing={isSyncingQueue}
          onSyncNow={handleSyncNow}
          onCheckConnection={checkConnectionNow}
          onDiscardOperation={handleDiscardQueuedOp}
        />
        <SyncConflictModal
          isOpen={showConflictModal}
          conflicts={pendingSyncConflictState?.conflicts || []}
          readyCount={pendingSyncConflictState?.readyCount || 0}
          isApplying={isSyncingQueue}
          onResolve={handleResolveConflicts}
          onCancel={() => {
            setShowConflictModal(false);
            setPendingSyncConflictState(null);
          }}
        />
      </>
    );
  }

  // ADMIN ACCESS GUARD: Make sure admins are logged in before accessing the system
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="relative">
        <AdminLoginView
          users={users && users.length > 0 ? users : INITIAL_USERS}
          onLoginSuccess={(adminUser) => {
            safeLocalStorageSet('yebo_admin_session', JSON.stringify(adminUser));
            setCurrentUser(adminUser);
            showToast(`Welcome back, ${adminUser.name}!`);
          }}
          onOpenSignUpModal={() => setShowCompanySignUpModal(true)}
          onBackToLanding={() => {
            setIsAppRoute(false);
            try {
              window.history.pushState({}, '', '/');
            } catch {}
          }}
        />
        {showCompanySignUpModal && (
          <CompanySignUpModal
            isOpen={showCompanySignUpModal}
            onClose={() => setShowCompanySignUpModal(false)}
            onCompanyRegistered={handleCompanyRegistered}
          />
        )}
        <OfflineSyncIndicator
          isOnline={isOnline}
          isChecking={isCheckingNetwork}
          queue={syncQueue}
          isSyncing={isSyncingQueue}
          onSyncNow={handleSyncNow}
          onCheckConnection={checkConnectionNow}
          onDiscardOperation={handleDiscardQueuedOp}
        />
        <SyncConflictModal
          isOpen={showConflictModal}
          conflicts={pendingSyncConflictState?.conflicts || []}
          readyCount={pendingSyncConflictState?.readyCount || 0}
          isApplying={isSyncingQueue}
          onResolve={handleResolveConflicts}
          onCancel={() => {
            setShowConflictModal(false);
            setPendingSyncConflictState(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950`}>
      {/* Top Main Navigation Bar */}
      <header className={`sticky top-0 z-40 border-b ${isDark ? 'border-slate-800/80 bg-slate-950/90' : 'border-slate-200 bg-white/90'} backdrop-blur-md`}>
        {/* Row 1: Brand & Always-Visible Global Controls (Mobile, Tablet & Desktop) */}
        <div className="max-w-7xl mx-auto px-2 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-3">
          {/* Brand Logo & Name */}
          <div
            onClick={() => {
              setSelectedCompanyId(null);
              setActiveView('dashboard');
            }}
            className="flex items-center gap-2 cursor-pointer select-none group min-w-0 shrink-0"
            title="b-Smart Mobile Communicator"
          >
            <BSmartLogo
              size="md"
              subtitle="Enterprise Mobile Communicator"
              className="[&>div:first-child]:h-7 [&>div:first-child]:w-10 sm:[&>div:first-child]:h-10 sm:[&>div:first-child]:w-[60px] [&_p]:hidden sm:[&_p]:block"
            />
          </div>

          {/* Right Header Actions — Never clipped or hidden at any viewport width */}
          <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
            {/* Help & Visual Guide Button */}
            <button
              type="button"
              onClick={() => setShowHelpGuideModal(true)}
              className={`h-8 w-8 sm:w-auto sm:min-h-[36px] sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-amber-400'
                  : 'bg-white hover:bg-slate-50 border-slate-300 text-amber-600 shadow-sm'
              }`}
              title="Open Step-by-Step Onboarding Guide with Screenshots"
              aria-label="Help and Guide"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="hidden lg:inline font-bold whitespace-nowrap">Help & Guide</span>
            </button>

            {/* Quick Step-by-Step Onboarding Button */}
            <button
              type="button"
              onClick={() => setShowOnboardingWizardModal(true)}
              className="h-8 w-8 sm:w-auto sm:min-h-[36px] sm:px-2.5 sm:py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/20 transition-all cursor-pointer"
              title="Launch 4-Step Simplified Onboarding Wizard"
              aria-label="Guided Onboarding"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline whitespace-nowrap">Guided Onboard</span>
            </button>

            {/* Live Database Sync Status & Refresh Button */}
            <button
              type="button"
              onClick={() => triggerManualDatabaseSync()}
              disabled={isSyncingDb || isSyncingQueue}
              className={`h-8 px-1.5 sm:min-h-[36px] sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                dbOnline
                  ? syncQueue.length > 0
                    ? isDark
                      ? 'bg-sky-950/60 hover:bg-sky-900/60 border-sky-500/60 text-sky-300'
                      : 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-700'
                    : isDark
                      ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-800/60 text-emerald-400'
                      : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700'
                  : isDark
                  ? 'bg-amber-950/40 hover:bg-amber-900/50 border-amber-800/60 text-amber-400'
                  : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700'
              }`}
              title={
                syncQueue.length > 0
                  ? `${syncQueue.length} pending offline change(s). Click to Sync Now.`
                  : `Database is ${dbOnline ? 'Live & In Sync' : 'Offline Mode'}. Last synced: ${lastSyncTime.toLocaleTimeString()}.`
              }
              aria-label="Database sync status"
            >
              <span className={`inline-flex rounded-full h-2 w-2 shrink-0 ${dbOnline ? (syncQueue.length > 0 ? 'bg-sky-400' : 'bg-emerald-500') : 'bg-amber-500'}`} />
              <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncingDb || isSyncingQueue ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden md:inline font-bold whitespace-nowrap tabular-nums">
                {isSyncingDb || isSyncingQueue
                  ? 'Syncing...'
                  : !dbOnline
                    ? `Offline (${syncQueue.length})`
                    : syncQueue.length > 0
                      ? `Sync (${syncQueue.length})`
                      : 'DB Live'}
              </span>
            </button>

            {/* Live Zero-SMTP Enquiry & Follow-up Alert Bell (Always visible on Mobile, Tablet & Desktop) */}
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0];
              const alertCount = leads.filter((l) => {
                if (!l || l.status === 'resolved' || l.status === 'archived') return false;
                if (l.status === 'new') return true;
                return Boolean(l.followUpDate && l.followUpDate <= todayStr);
              }).length;
              return (
                <button
                  type="button"
                  onClick={() => setActiveView('leads')}
                  className={`relative h-8 w-8 sm:h-[36px] sm:w-[36px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                    alertCount > 0
                      ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-400'
                      : isDark
                      ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
                      : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 shadow-sm'
                  }`}
                  title={
                    alertCount > 0
                      ? `${alertCount} enquiries or due follow-ups monitored (Click to open CRM & Alert Monitor)`
                      : 'Enquiry & Follow-Up Monitor'
                  }
                  aria-label="Enquiry and Follow-Up Monitor Alerts"
                >
                  <BellRing className={`w-4 h-4 ${alertCount > 0 ? 'animate-pulse text-amber-400' : ''}`} />
                  {alertCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border border-slate-950">
                      {alertCount > 99 ? '99+' : alertCount}
                    </span>
                  )}
                </button>
              );
            })()}

            {/* Dark / Light Theme Mode Switcher */}
            <ThemeToggle showLabel={false} className="h-8 w-8 sm:h-[36px] sm:w-[36px] justify-center p-0 sm:p-2" />

            {/* Tablet & Desktop Current User / Switch User Button (visible from sm: upwards) */}
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className={`hidden sm:flex min-h-[36px] items-center gap-2 p-1 pr-2.5 rounded-xl border ${
                isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-800' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 shadow-sm'
              } transition-colors cursor-pointer`}
              title="Click to switch administrator user profile"
            >
              <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-800 border border-amber-500/30 shrink-0">
                {currentUser.avatarUrl ? (
                  <img src={currentUser.avatarUrl || undefined} alt={currentUser.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-amber-400">
                    {currentUser.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="hidden md:block text-left">
                <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'} leading-none truncate max-w-[100px]`}>
                  {currentUser.name.split(' ')[0]}
                </div>
                <div className="text-[10px] text-amber-400 font-semibold leading-tight flex items-center gap-1">
                  <span>Switch User</span>
                </div>
              </div>
            </button>

            {/* Tablet & Desktop Direct Photo Upload Button (visible from sm: upwards) */}
            <label
              className={`hidden sm:flex min-h-[36px] px-2.5 py-1.5 rounded-xl ${isDark ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 shadow-sm'} border cursor-pointer transition-colors items-center justify-center gap-1.5`}
              title="Upload your profile photo directly"
              aria-label="Upload photo"
            >
              <Upload className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span className="text-[11px] font-bold hidden lg:inline">Photo</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                onChange={handleDirectPhotoUpload}
                className="hidden"
              />
            </label>

            {/* Explicit Sign Out / Log Out Button (ALWAYS VISIBLE on Mobile, Tablet & Desktop) */}
            <button
              type="button"
              onClick={handleLogout}
              className={`h-8 w-8 sm:w-auto sm:min-h-[36px] sm:px-3 sm:py-1.5 rounded-xl border transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 ${
                isDark
                  ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/35 hover:border-red-400/60 text-red-400 hover:text-red-300'
                  : 'bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 shadow-sm'
              }`}
              title="Sign Out / Log Out"
              aria-label="Log Out"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="text-[11px] font-bold hidden sm:inline whitespace-nowrap">Log Out</span>
            </button>

            {/* Mobile Menu Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`sm:hidden h-8 px-2 rounded-xl border flex items-center gap-1 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                isMobileMenuOpen
                  ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                  : isDark
                  ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-sm'
              }`}
              title="Toggle Mobile Navigation Menu"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4 text-sky-400" />}
              <span>Menu</span>
            </button>
          </div>
        </div>

        {/* Row 2 (Tablet & Desktop >= 640px): Dedicated Navigation Bar — Zero Wrapping, Zero Hidden Tabs */}
        <nav className={`hidden sm:block border-t ${isDark ? 'border-slate-800/70 bg-slate-950/70' : 'border-slate-200/80 bg-slate-50/90'}`}>
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-1.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedCompanyId(null);
                  setActiveView('dashboard');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeView === 'dashboard'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>Companies Directory</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('members')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeView === 'members'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>Team Members</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  isDark ? 'bg-slate-800 text-amber-400' : 'bg-slate-200 text-slate-700'
                }`}>
                  {users.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('leads')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 relative whitespace-nowrap cursor-pointer ${
                  activeView === 'leads'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>Inquiries</span>
                {leads.filter((l) => l.status === 'new').length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveView('cards')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeView === 'cards'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : isDark ? 'text-slate-300 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5 shrink-0" />
                <span>Cards Management</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsAppRoute(false);
                  try {
                    window.history.pushState({}, '', '/');
                  } catch {}
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isDark ? 'text-slate-300 hover:text-white hover:bg-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
                title="View Public Landing Page (www.b-smart-online.co.za)"
              >
                <Globe className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Landing Page</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowIssueEmployeeModal(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 shrink-0" />
                <span>Issue Card</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingCard(null);
                  setActiveView('editor');
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeView === 'editor'
                    ? 'bg-sky-600 text-white border-sky-600'
                    : isDark
                    ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-sky-400'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-sky-700'
                }`}
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>New Card</span>
              </button>

              <PWAInstallButton variant="header" />
            </div>
          </div>
        </nav>

        {/* ALWAYS-VISIBLE MOBILE NAVIGATION MENU STRIP (< 640px) */}
        <div className={`sm:hidden border-t ${isDark ? 'border-slate-800/80 bg-slate-950/95' : 'border-slate-200 bg-white/95'} px-2.5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar`}>
          <button
            type="button"
            onClick={() => {
              setSelectedCompanyId(null);
              setActiveView('dashboard');
              setIsMobileMenuOpen(false);
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeView === 'dashboard'
                ? 'bg-sky-600 text-white shadow-sm'
                : isDark ? 'bg-slate-900 text-slate-300 border border-slate-800' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Companies</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView('members');
              setIsMobileMenuOpen(false);
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeView === 'members'
                ? 'bg-sky-600 text-white shadow-sm'
                : isDark ? 'bg-slate-900 text-slate-300 border border-slate-800' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Members</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
              activeView === 'members' ? 'bg-sky-950 text-sky-300' : 'bg-sky-500/20 text-sky-400'
            }`}>
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView('leads');
              setIsMobileMenuOpen(false);
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 relative cursor-pointer ${
              activeView === 'leads'
                ? 'bg-sky-600 text-white shadow-sm'
                : isDark ? 'bg-slate-900 text-slate-300 border border-slate-800' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Inquiries</span>
            {leads.filter((l) => l.status === 'new').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView('cards');
              setIsMobileMenuOpen(false);
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeView === 'cards'
                ? 'bg-sky-600 text-white shadow-sm'
                : isDark ? 'bg-slate-900 text-slate-300 border border-slate-800' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCard(null);
              setActiveView('editor');
              setIsMobileMenuOpen(false);
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeView === 'editor'
                ? 'bg-sky-600 text-white shadow-sm'
                : isDark ? 'bg-slate-900 text-slate-300 border border-slate-800' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Card</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowIssueEmployeeModal(true);
              setIsMobileMenuOpen(false);
            }}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white shadow-md shadow-sky-600/25 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Issue Card</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAppRoute(false);
              setIsMobileMenuOpen(false);
              try {
                window.history.pushState({}, '', '/');
              } catch {}
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              isDark ? 'bg-slate-900 text-slate-300 border border-slate-800' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-amber-500" />
            <span>Landing</span>
          </button>

          <PWAInstallButton variant="header" />
        </div>
      </header>

      {/* EXPANDABLE MOBILE MENU DRAWER */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <React.Fragment key="mobile-drawer-fragment">
            {/* Backdrop overlay */}
            <motion.div
              key="mobile-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="sm:hidden fixed inset-0 top-[98px] bg-slate-950/75 backdrop-blur-sm z-40"
            />

            {/* Slide-down Drawer Menu — Fixed bounds stay cleanly above bottom nav dock */}
            <motion.div
              key="mobile-drawer-panel"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18 }}
              className={`sm:hidden fixed top-[98px] bottom-[66px] inset-x-0 z-50 border-b flex flex-col overflow-hidden ${
                isDark ? 'bg-slate-950/98 border-slate-800 text-slate-100' : 'bg-white/98 border-slate-200 text-slate-900 shadow-2xl'
              } backdrop-blur-xl`}
            >
              {/* Menu Title & Close (Pinned Top) */}
              <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-800/40">
                <BSmartLogo size="sm" subtitle="Mobile Menu & Controls" />

                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} transition-colors cursor-pointer`}
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Navigation Links Grid */}
              <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCompanyId(null);
                    setActiveView('dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                    activeView === 'dashboard'
                      ? 'bg-sky-600 text-white font-bold shadow-md'
                      : isDark ? 'hover:bg-slate-900 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      activeView === 'dashboard' ? 'bg-white/20 text-white' : 'bg-sky-500/10 text-sky-400'
                    }`}>
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black">Companies Directory</div>
                      <div className={`text-[10px] ${activeView === 'dashboard' ? 'text-white/80 font-medium' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Browse corporate profiles & department cards
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-70" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveView('members');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                    activeView === 'members'
                      ? 'bg-sky-600 text-white font-bold shadow-md'
                      : isDark ? 'hover:bg-slate-900 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      activeView === 'members' ? 'bg-white/20 text-white' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black flex items-center gap-1.5">
                        <span>Team Members Directory</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                          activeView === 'members' ? 'bg-sky-950 text-sky-300' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {users.length}
                        </span>
                      </div>
                      <div className={`text-[10px] ${activeView === 'members' ? 'text-white/80 font-medium' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Manage company team members, assign cards & share links
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-70" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveView('leads');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                    activeView === 'leads'
                      ? 'bg-sky-600 text-white font-bold shadow-md'
                      : isDark ? 'hover:bg-slate-900 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      activeView === 'leads' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black flex items-center gap-1.5">
                        <span>Inquiries & Leads</span>
                        {leads.filter((l) => l.status === 'new').length > 0 && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </div>
                      <div className={`text-[10px] ${activeView === 'leads' ? 'text-white/80 font-medium' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Incoming customer contacts and requests
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-70" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveView('cards');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                    activeView === 'cards'
                      ? 'bg-sky-600 text-white font-bold shadow-md'
                      : isDark ? 'hover:bg-slate-900 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      activeView === 'cards' ? 'bg-white/20 text-white' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black">Cards Management</div>
                      <div className={`text-[10px] ${activeView === 'cards' ? 'text-white/80 font-medium' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        View templates, employee cards & status links
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-70" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingCard(null);
                    setActiveView('editor');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                    activeView === 'editor'
                      ? 'bg-sky-600 text-white font-bold shadow-md'
                      : isDark ? 'hover:bg-slate-900 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      activeView === 'editor' ? 'bg-white/20 text-white' : 'bg-purple-500/10 text-purple-400'
                    }`}>
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black">Smart Card Editor</div>
                      <div className={`text-[10px] ${activeView === 'editor' ? 'text-white/80 font-medium' : isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Create or edit cards with custom branding
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-70" />
                </button>

                {/* Step-by-Step Onboarding */}
                <button
                  type="button"
                  onClick={() => {
                    setShowOnboardingWizardModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                    isDark ? 'hover:bg-slate-900 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black">Guided Step-by-Step Onboarding</div>
                      <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Simplified 4-step wizard to set up company & team members
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-70" />
                </button>

                {/* Help & Visual Guide */}
                <button
                  type="button"
                  onClick={() => {
                    setShowHelpGuideModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                    isDark ? 'hover:bg-slate-900 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black">Help & Visual Guide (Screenshots)</div>
                      <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Illustrated user manual with workflows & best practices
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-70" />
                </button>

                {/* PWA Mobile App Installation Prompt */}
                <PWAInstallButton variant="drawer" />

                <button
                  type="button"
                  onClick={() => {
                    setShowIssueEmployeeModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                    isDark ? 'hover:bg-slate-900 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black">Issue Team Member Card</div>
                      <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Generate instant live smart card for a team member
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-70" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingCompany(null);
                    setShowCompanyModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                    isDark ? 'hover:bg-slate-900 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <FolderPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black">Register New Company</div>
                      <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Add organization profile, brand logo & theme
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-70" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsAppRoute(false);
                    setIsMobileMenuOpen(false);
                    try {
                      window.history.pushState({}, '', '/');
                    } catch {}
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                    isDark ? 'hover:bg-slate-900 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black">Public Landing Page</div>
                      <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        View www.b-smart-online.co.za showcase & plans
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 opacity-70" />
                </button>
              </div>

              {/* Pinned Account & Logout Footer inside Mobile Drawer — Always Visible Above Bottom Dock */}
              <div className={`shrink-0 px-4 py-3 border-t ${isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2.5`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-800 border border-amber-500/40 shrink-0">
                      {currentUser.avatarUrl ? (
                        <img src={currentUser.avatarUrl || undefined} alt={currentUser.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-amber-400">
                          {currentUser.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'} leading-none truncate`}>
                        {currentUser.name}
                      </div>
                      <div className="text-[10px] text-amber-500 font-semibold mt-0.5 truncate capitalize">
                        {currentUser.role} Account · {currentUser.email}
                      </div>
                    </div>
                  </div>

                  <ThemeToggle showLabel={false} />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAuthModal(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                    }`}
                  >
                    <ScanFace className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">Switch</span>
                  </button>

                  <label
                    className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">Photo</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      onChange={(e) => {
                        handleDirectPhotoUpload(e);
                        setIsMobileMenuOpen(false);
                      }}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`py-2 px-2 rounded-xl border text-[11px] font-black flex items-center justify-center gap-1 cursor-pointer ${
                      isDark
                        ? 'bg-red-500/15 hover:bg-red-500/25 border-red-500/40 text-red-400'
                        : 'bg-red-50 hover:bg-red-100 border-red-300 text-red-600'
                    }`}
                  >
                    <LogOut className="w-3.5 h-3.5 shrink-0" />
                    <span>Log Out</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      triggerManualDatabaseSync();
                      setIsMobileMenuOpen(false);
                    }}
                    className={`font-bold flex items-center gap-1.5 cursor-pointer ${
                      dbOnline ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    <RefreshCw className={`w-3 h-3 ${isSyncingDb ? 'animate-spin' : ''}`} />
                    <span>Database {dbOnline ? 'Live' : 'Offline'} · Sync Now</span>
                  </button>
                  <span className="text-[10px] text-slate-500">v2.0</span>
                </div>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key="app-toast-alert"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 p-3 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-semibold shadow-xl flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 pb-28 sm:pb-8">
        {/* VIEW 1: CARD EDITOR */}
        {activeView === 'editor' && (
          <CardEditor
            card={editingCard}
            defaultCompany={activeCompany}
            companies={companies}
            members={users}
            existingCards={cards}
            onSave={handleSaveCard}
            onCancel={() => {
              setEditingCard(null);
              setActiveView('dashboard');
            }}
          />
        )}

        {/* VIEW 2: USERS & EMPLOYEE MANAGEMENT */}
        {activeView === 'members' && (
          <AdminMembers
            members={users}
            cards={cards}
            companies={companies}
            currentUserId={currentUser.id}
            onAddMember={handleAddMember}
            onUpdateUser={handleUpdateUser}
            onUpdateMemberPassword={handleUpdateMemberPassword}
            onAssignCard={handleAssignCard}
            onDeleteMember={handleDeleteMember}
            onOpenAllocateModal={(cardId) => {
              const c = cards.find((x) => x.id === cardId) || cards[0];
              setCardToAllocate(c);
              setAllocateModalMode('single');
              setShowAllocateModal(true);
            }}
            onOpenBulkAllocateModal={() => {
              setCardToAllocate(cards[0]);
              setAllocateModalMode('bulk');
              setShowAllocateModal(true);
            }}
            onOpenIssueCardModal={(targetUser) => {
              setIssueCardTargetUser(targetUser || null);
              setShowIssueEmployeeModal(true);
            }}
            onEditCard={(card) => {
              setEditingCard(card);
              setActiveView('editor');
            }}
            onDeleteCard={(cardId) => {
              handleDeleteCard(cardId);
            }}
            onPreviewCard={(card) => {
              setSelectedCardId(card.id);
              if (card.companyId) {
                setSelectedCompanyId(card.companyId);
              }
              setActiveView('preview_standalone');
            }}
            onSelectEmployeeForPreview={async (user) => {
              const targetComp =
                companies.find(
                  (c) => c.id === user.companyId || getUserCompanyIds(user).includes(c.id)
                ) || companies[0];
              if (targetComp) {
                setSelectedCompanyId(targetComp.id);
              }
              await handleSelectEmployeeForPreview(user, { autoCreate: false });
              setActiveView('dashboard');
            }}
          />
        )}

        {/* VIEW 3b: CARDS MANAGEMENT */}
        {activeView === 'cards' && (
          <CardsManager
            cards={cards}
            companies={companies}
            users={users}
            onEditCard={(card) => {
              setEditingCard(card);
              setActiveView('editor');
            }}
            onDeleteCard={handleDeleteCard}
          />
        )}

        {/* VIEW 3: LEADS & INQUIRIES MANAGER */}
        {activeView === 'leads' && (
          <LeadsManager
            leads={leads}
            companies={companies}
            cards={cards}
            selectedCompanyId={selectedCompanyId}
            onSelectCompany={(compId) => setSelectedCompanyId(compId)}
            onOpenCardPreview={(cardId) => {
              setSelectedCardId(cardId);
              setActiveView('preview_standalone');
            }}
            onUpdateStatus={async (id, status) => {
              const now = new Date().toISOString();
              const target = leads.find((l) => l.id === id);
              const nextLeads = leads.map((l) => (l.id === id ? { ...l, status, updatedAt: now } : l));
              setLeads(nextLeads);
              safeLocalStorageSet('yeboleads_data', JSON.stringify(nextLeads));
              await idbSet('leads', 'all_leads', nextLeads);

              const ok = isOnline ? await dbUpdateLeadStatus(id, status) : false;
              if (ok) {
                await removeQueuedOperation(`lead:${id}`);
                if (target) await saveCleanBaseSnapshots('lead', [{ ...target, status, updatedAt: now }], new Set());
                showToast(`Lead marked as ${status.replace('_', ' ')}.`);
              } else if (target) {
                await enqueueOfflineChange({
                  entityType: 'lead',
                  entityId: id,
                  operation: 'upsert',
                  label: `${target.name} (${target.cardName || 'Enquiry'})`,
                  payload: { ...target, status, updatedAt: now },
                });
                showToast(`Lead status saved offline — queued for Sync Now!`);
              }
            }}
            onUpdateLead={handleUpdateLead}
            onAddLead={handleAddManualLead}
            onShowToast={showToast}
            onDeleteLead={async (id) => {
              const target = leads.find((l) => l.id === id);
              const nextLeads = leads.filter((l) => l.id !== id);
              setLeads(nextLeads);
              safeLocalStorageSet('yeboleads_data', JSON.stringify(nextLeads));
              await idbSet('leads', 'all_leads', nextLeads);

              await enqueueOfflineChange({
                entityType: 'lead',
                entityId: id,
                operation: 'delete',
                label: target?.name || id,
                payload: { id },
              });

              if (!isOnline) {
                showToast('Lead inquiry removed offline — queued for Sync Now!');
                return;
              }

              showToast('Lead inquiry removed locally.');
              setDbSyncModalConfig({
                isOpen: true,
                title: 'Authorize Database Sync: Delete Lead',
                description: `Confirm permanently removing inquiry record for "${target?.name || id}" from the central production database.`,
                targetDetails: `Delete Lead: ${target?.name || id}`,
                onConfirmSync: async () => {
                  const ok = await dbDeleteLead(id);
                  if (ok) {
                    await removeQueuedOperation(`lead:${id}`);
                    await idbDelete('base_snapshots', `lead:${id}`);
                  }
                  showToast('Lead inquiry removed permanently from central DB.');
                },
              });
            }}
          />
        )}

        {/* VIEW 4: MAIN DASHBOARD */}
        {activeView === 'dashboard' && (
          <>
            {/* LEVEL 1: MAIN HOME PAGE - ONLY COMPANIES DIRECTORY */}
            {!selectedCompanyId ? (
              <div className="space-y-6">
                {/* Home Page Top Banner & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Building2 className="w-5 h-5" />
                      </span>
                      <h2 className={`text-xl sm:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'} tracking-tight`}>
                        Companies & Organizations
                      </h2>
                    </div>
                    <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
                      Select a company to manage its linked digital cards, issue team member links, and customize branding.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowHelpGuideModal(true)}
                      className={`px-3 py-2.5 rounded-xl ${
                        isDark ? 'bg-slate-900 hover:bg-slate-800 text-sky-400 border-slate-800' : 'bg-white hover:bg-slate-50 text-sky-600 border-slate-300 shadow-sm'
                      } border font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer`}
                      title="Open Step-by-Step Onboarding Guide with Screenshots"
                    >
                      <BookOpen className="w-4 h-4 text-sky-400" />
                      <span>Help & Guide</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowOnboardingWizardModal(true)}
                      className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-600/25 transition-all cursor-pointer"
                      title="Launch Step-by-Step Company & Members Onboarding Wizard"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Guided Onboarding</span>
                    </button>

                    <button
                      onClick={() => setActiveView('members')}
                      className={`px-3.5 py-2.5 rounded-xl ${
                        isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                      } border font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer`}
                      title="Manage team members, roles, card links, and allocations"
                    >
                      <Users className="w-4 h-4 text-sky-400" />
                      <span>Team Members</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCompanySignUpModal(true)}
                      className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                      title="Open new company registration form"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>New Company Sign-Up</span>
                      {pendingApprovalsCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-950 text-amber-400 text-[10px] font-black animate-pulse">
                          {pendingApprovalsCount}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setEditingCompany(null);
                        setShowCompanyModal(true);
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-sky-400" />
                      <span>Add Company (Admin)</span>
                    </button>
                  </div>
                </div>

                {/* Directory Stats Overview Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div
                    onClick={() => setCompanyStatusFilter('all')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      companyStatusFilter === 'all'
                        ? 'border-amber-500 bg-amber-500/10'
                        : isDark ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Total Companies
                    </span>
                    <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'} mt-0.5`}>
                      {companies.length}
                    </div>
                  </div>

                  <div
                    onClick={() => setCompanyStatusFilter(companyStatusFilter === 'pending' ? 'all' : 'pending')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      pendingApprovalsCount > 0
                        ? 'border-amber-500/80 bg-amber-500/15 ring-1 ring-amber-400/50'
                        : isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${pendingApprovalsCount > 0 ? 'text-amber-400 font-black' : isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Pending Approvals
                      </span>
                      {pendingApprovalsCount > 0 && (
                        <span className="text-[9px] font-bold text-slate-950 bg-amber-500 px-1.5 py-0.2 rounded-full animate-pulse">
                          Action Required
                        </span>
                      )}
                    </div>
                    <div className={`text-xl font-black mt-0.5 ${pendingApprovalsCount > 0 ? 'text-amber-400' : isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {pendingApprovalsCount}
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Active Cards Linked
                    </span>
                    <div className="text-xl font-black text-sky-400 mt-0.5">
                      {cards.length}
                    </div>
                  </div>

                  {/* Clickable Active Team Members Card */}
                  <div
                    onClick={() => setActiveView('members')}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                      isDark ? 'bg-slate-900/70 hover:bg-slate-900 border-slate-800 hover:border-amber-500/60 shadow-sm hover:shadow-amber-950/20' : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm hover:border-amber-400'
                    }`}
                    title="Click to view and manage company team members"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Active Team Members
                      </span>
                      <span className="text-[10px] font-bold text-amber-500 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                        <span>Manage</span>
                        <span>→</span>
                      </span>
                    </div>
                    <div className={`text-xl font-black ${isDark ? 'text-slate-200' : 'text-slate-800'} mt-0.5`}>
                      {users.length}
                    </div>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-3`}>
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-80">
                      <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      <input
                        type="text"
                        placeholder="Search company by name or industry..."
                        value={searchCompanyQuery}
                        onChange={(e) => setSearchCompanyQuery(e.target.value)}
                        className={`w-full pl-9 pr-4 py-2 rounded-xl ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                        } border text-xs focus:outline-none focus:border-amber-500`}
                      />
                    </div>

                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-semibold overflow-x-auto w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setCompanyStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg transition-colors ${
                          companyStatusFilter === 'all'
                            ? 'bg-amber-500 text-slate-950 font-bold shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All ({companies.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setCompanyStatusFilter('pending')}
                        className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                          companyStatusFilter === 'pending'
                            ? 'bg-amber-500 text-slate-950 font-bold shadow'
                            : pendingApprovalsCount > 0
                            ? 'text-amber-400 font-bold animate-pulse'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Pending ({pendingApprovalsCount})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCompanyStatusFilter('active')}
                        className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                          companyStatusFilter === 'active'
                            ? 'bg-amber-500 text-slate-950 font-bold shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Active ({activeCompaniesCount})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCompanyStatusFilter('inactive')}
                        className={`px-3 py-1.5 rounded-lg transition-colors ${
                          companyStatusFilter === 'inactive'
                            ? 'bg-amber-500 text-slate-950 font-bold shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Inactive ({inactiveCompaniesCount})</span>
                      </button>
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto w-full pb-1 pt-1 border-t border-slate-800/40">
                    <button
                      onClick={() => setSelectedCategoryFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors shrink-0 ${
                        selectedCategoryFilter === 'all'
                          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                          : isDark ? 'bg-slate-950 hover:bg-slate-800 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      All Categories
                    </button>
                    {availableCategories.map((cat, catIdx) => (
                      <button
                        key={`cat-filter-${cat}-${catIdx}`}
                        onClick={() => setSelectedCategoryFilter(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors shrink-0 ${
                          selectedCategoryFilter === cat
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                            : isDark ? 'bg-slate-950 hover:bg-slate-800 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Companies Grid (Only Companies shown on home page) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredCompanies.map((comp, compIdx) => {
                    const linkedCards = cards.filter(
                      (c) =>
                        c.companyId === comp.id ||
                        (!c.companyId && c.businessName.toLowerCase().trim() === comp.name.toLowerCase().trim())
                    );
                    const totalViews = linkedCards.reduce((acc, c) => acc + (c.viewsCount || 0), 0);
                    const totalEmployees = users.filter((u) =>
                      getUserCompanyIds(u).includes(comp.id) ||
                      linkedCards.some((c) => c.assignedMemberId === u.id || u.assignedCardId === c.id)
                    ).length;

                    return (
                      <div
                        key={`comp-${comp.id}-${compIdx}`}
                        onClick={() => {
                          setSelectedCompanyId(comp.id);
                          if (linkedCards.length > 0) {
                            setSelectedCardId(linkedCards[0].id);
                            setCompanyWorkspaceTab('allocated');
                          } else {
                            setSelectedCardId('');
                            setCompanyWorkspaceTab('template');
                          }
                        }}
                        className={`group p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isDark
                            ? 'bg-slate-900/80 hover:bg-slate-900 border-slate-800 hover:border-amber-500/60 shadow-lg hover:shadow-amber-950/20'
                            : 'bg-white hover:bg-slate-50/90 border-slate-200 shadow-sm hover:shadow-md hover:border-amber-400'
                        }`}
                      >
                        <div>
                          {/* Top Status Alert if Pending Approval or Inactive */}
                          {comp.status === 'pending_approval' && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setCompanyForApproval(comp);
                                setShowCompanyApprovalModal(true);
                              }}
                              className="mb-3 p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between gap-2 shadow-xs"
                            >
                              <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-black">
                                <Clock className="w-3.5 h-3.5 animate-pulse" />
                                <span>Inactive · Pending Approval</span>
                              </div>
                              <button
                                type="button"
                                className="px-2 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] transition-colors"
                              >
                                Review & Approve
                              </button>
                            </div>
                          )}

                          {comp.status === 'inactive' && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setCompanyForApproval(comp);
                                setShowCompanyApprovalModal(true);
                              }}
                              className="mb-3 p-1.5 px-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-bold flex items-center justify-between"
                            >
                              <span>Account Suspended / Inactive</span>
                              <span className="text-white underline hover:text-red-300">Activate</span>
                            </div>
                          )}

                          {/* Top row: Logo thumbnail & Category Badge */}
                          <div className="flex items-start justify-between gap-3">
                            <div
                              className={`w-14 h-14 rounded-2xl ${isDark ? 'bg-slate-950' : 'bg-slate-100'} p-0.5 border overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform`}
                              style={{ borderColor: comp.theme?.primaryColor || '#f59e0b' }}
                            >
                              {comp.logoUrl ? (
                                <img
                                  src={comp.logoUrl || undefined}
                                  alt={comp.name}
                                  className="w-full h-full object-contain p-0.5 rounded-xl bg-slate-950"
                                />
                              ) : (
                                <div className={`w-full h-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'} flex items-center justify-center`}>
                                  <Building2 className="w-6 h-6 text-amber-500" />
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-1.5 min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-wrap items-center justify-end gap-1.5 w-full">
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold truncate max-w-[130px] sm:max-w-[190px] ${
                                    isDark ? 'bg-amber-950/50 text-amber-400 border border-amber-800/40' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}
                                  title={comp.categoryLabel || comp.category}
                                >
                                  {comp.categoryLabel || comp.category}
                                </span>

                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    onClick={() => {
                                      setCompanyForApproval(comp);
                                      setShowCompanyApprovalModal(true);
                                    }}
                                    className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-amber-400' : 'hover:bg-slate-100 text-slate-500 hover:text-amber-600'} transition-colors cursor-pointer`}
                                    title="Manage Modules, Approvals & Access"
                                    aria-label="Manage modules"
                                  >
                                    <Shield className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCompanyForPaymentReminder(comp);
                                      setShowPaymentReminderModal(true);
                                    }}
                                    className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-emerald-400' : 'hover:bg-slate-100 text-slate-500 hover:text-emerald-600'} transition-colors cursor-pointer`}
                                    title="Subscription & Payment Reminders"
                                    aria-label="Payment reminders"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingCompany(comp);
                                      setShowCompanyModal(true);
                                    }}
                                    className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'} transition-colors cursor-pointer`}
                                    title="Edit Company Profile"
                                    aria-label="Edit company"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCompany(comp)}
                                    className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-red-950/40 text-slate-500 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-600'} transition-colors cursor-pointer`}
                                    title="Delete Company"
                                    aria-label="Delete company"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Mode Badge & Plan Badge */}
                              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                  comp.managementMode === 'bsmart_managed'
                                    ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                                    : 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                }`}>
                                  {comp.managementMode === 'bsmart_managed' ? 'Managed by B-SMART™' : 'Self-Managed'}
                                </span>

                                {comp.subscription && (
                                  <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                                    comp.subscription.billingStatus === 'paid'
                                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  }`}>
                                    {comp.subscription.planName || 'Standard'} · {comp.subscription.billingStatus || 'Active'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Company Name & Tagline */}
                          <div className="mt-3">
                            <h3 className={`text-base font-bold ${isDark ? 'text-white group-hover:text-amber-400' : 'text-slate-900 group-hover:text-amber-600'} transition-colors leading-snug line-clamp-1`}>
                              {comp.name}
                            </h3>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1 line-clamp-2 leading-relaxed`}>
                              {comp.tagline || comp.aboutText || 'Digital smart communicators and team member profiles.'}
                            </p>
                          </div>

                          {/* Linked Cards Count & Active Personnel Badge */}
                          <div className="mt-4 pt-3 border-t border-slate-800/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-amber-500">
                              <CreditCard className="w-4 h-4 shrink-0" />
                              <span>{linkedCards.length} {linkedCards.length === 1 ? 'Card Linked' : 'Cards Linked'}</span>
                            </div>

                            <div className={`flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium`}>
                              <Users className="w-3.5 h-3.5" />
                              <span>{totalEmployees} {totalEmployees === 1 ? 'Team Member' : 'Team Members'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom CTA to Enter Company Workspace */}
                        <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center justify-between">
                          <div className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'} font-medium`}>
                            {totalViews.toLocaleString()} total views
                          </div>

                          <span className="text-xs font-bold text-amber-500 group-hover:translate-x-1 transition-transform flex items-center gap-1">
                            <span>Open Workspace</span>
                            <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredCompanies.length === 0 && (
                  <div className={`p-12 text-center rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} space-y-3`}>
                    <Building2 className="w-12 h-12 text-slate-500 mx-auto opacity-40" />
                    <h3 className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      No companies match your search
                    </h3>
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      Try adjusting your keywords or filter to find the organization you are looking for.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* LEVEL 2: INSIDE A COMPANY WORKSPACE - Cards Details, Adding, Editing & Live Phone Preview */
              <div className="space-y-6">
                {/* Company Workspace Breadcrumbs & Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedCompanyId(null)}
                      className={`px-3 py-2 rounded-xl ${
                        isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      } border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer`}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Companies</span>
                    </button>

                    <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>/</span>

                    <div className="flex items-center gap-2 min-w-0">
                      <h2 className={`text-lg sm:text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'} truncate`}>
                        {activeCompany?.name}
                      </h2>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        isDark ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {activeCompany?.categoryLabel || activeCompany?.category}
                      </span>
                    </div>
                  </div>

                  {activeCompany && (
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => setActiveView('members')}
                        className={`px-3 py-2 rounded-xl ${
                          isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                        } border text-xs font-bold flex items-center gap-1.5 transition-colors`}
                        title="Manage team members and allocations"
                      >
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>Team Members</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCompanyForApproval(activeCompany);
                          setShowCompanyApprovalModal(true);
                        }}
                        className={`px-3 py-2 rounded-xl ${
                          isDark ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-amber-500/30' : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300'
                        } border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer`}
                        title="Configure modules, approval status, and management mode"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Access & Modules</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCompanyForPaymentReminder(activeCompany);
                          setShowPaymentReminderModal(true);
                        }}
                        className={`px-3 py-2 rounded-xl ${
                          isDark ? 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                        } border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer`}
                        title="View subscription plan, due dates, and payment reminders"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Billing & Reminders</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingCompany(activeCompany);
                          setShowCompanyModal(true);
                        }}
                        className={`px-3 py-2 rounded-xl ${
                          isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                        } border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit Company</span>
                      </button>

                      <button
                        onClick={() => setShowIssueEmployeeModal(true)}
                        className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-600/25 transition-all cursor-pointer"
                        title="Issue a team member smart card for this company"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Issue Team Member Card</span>
                      </button>

                      <button
                        onClick={() => {
                          setEditingCard(null);
                          setActiveView('editor');
                        }}
                        className={`px-3 py-2 rounded-xl ${
                          isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                        } border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer`}
                        title="Create a new card variant from scratch"
                      >
                        <Plus className="w-4 h-4" />
                        <span>New Card</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Status Alert Banner: Pending Approval or Inactive */}
                {activeCompany && activeCompany.status === 'pending_approval' && (
                  <div className="p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
                        <Clock className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">
                            Company Status: Inactive · Pending B-SMART™ Approval
                          </h4>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 font-bold">
                            Review Required
                          </span>
                        </div>
                        <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'} mt-0.5`}>
                          This company registration is currently inactive pending authorization by the B-SMART™ administrative team. Once approved, all fleet features will be unlocked.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setCompanyForApproval(activeCompany);
                          setShowCompanyApprovalModal(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-colors cursor-pointer"
                      >
                        Review & Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const text = encodeURIComponent(`Hi B-SMART™! Following up on company registration approval for "${activeCompany.name}".`);
                          window.open(`https://wa.me/27834915468?text=${text}`, '_blank');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp Care</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Management Mode Banner: Managed by B-SMART™ */}
                {activeCompany && activeCompany.managementMode === 'bsmart_managed' && (
                  <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <Shield className="w-4 h-4 text-sky-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-200">
                        <strong>Managed by B-SMART™ Concierge:</strong> All smart cards, graphics, and team allocations for {activeCompany.name} are curated directly by our digital team.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const text = encodeURIComponent(`Hello B-SMART™ Concierge! I would like to request changes or card updates for "${activeCompany.name}".`);
                        window.open(`https://wa.me/27834915468?text=${text}`, '_blank');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Request Concierge Changes</span>
                    </button>
                  </div>
                )}

                {/* Payment Due Notice Banner */}
                {activeCompany && activeCompany.subscription && (activeCompany.subscription.billingStatus === 'payment_due' || activeCompany.subscription.billingStatus === 'overdue') && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-semibold text-amber-300">
                        Payment Due: Subscription fee of R{activeCompany.subscription.amountZAR?.toLocaleString()} ZAR ({activeCompany.subscription.planName}) is due on {activeCompany.subscription.nextBillingDate}.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCompanyForPaymentReminder(activeCompany);
                        setShowPaymentReminderModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 transition-colors"
                    >
                      View Invoice & Banking Details
                    </button>
                  </div>
                )}

                {/* Company Overview Header Banner */}
                {activeCompany && (
                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} space-y-4`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-16 h-16 rounded-2xl ${isDark ? 'bg-slate-950' : 'bg-slate-100'} p-0.5 border overflow-hidden shrink-0 shadow-md`}
                          style={{ borderColor: activeCompany.theme?.primaryColor || '#f59e0b' }}
                        >
                          {activeCompany.logoUrl ? (
                            <img
                              src={activeCompany.logoUrl || undefined}
                              alt={activeCompany.name}
                              className="w-full h-full object-contain p-0.5 rounded-xl bg-slate-950"
                            />
                          ) : (
                            <div className={`w-full h-full ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-500'} flex items-center justify-center`}>
                              <Building2 className="w-8 h-8 text-amber-500" />
                            </div>
                          )}
                        </div>

                        <div>
                          <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {activeCompany.name}
                          </h3>
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5`}>
                            {activeCompany.tagline}
                          </p>
                          <div className={`flex flex-wrap items-center gap-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-2`}>
                            {activeCompany.website && (
                              <a
                                href={activeCompany.website}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 hover:text-amber-400 transition-colors"
                              >
                                <Globe className="w-3.5 h-3.5 text-amber-500" />
                                <span>{activeCompany.website.replace(/^https?:\/\//, '')}</span>
                              </a>
                            )}
                            {activeCompany.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-amber-500" />
                                <span>{activeCompany.phone}</span>
                              </span>
                            )}
                            {activeCompany.address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5 text-amber-500" />
                                <span>{activeCompany.address}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Company Linked Cards Count Banner */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setCompanyWorkspaceTab('allocated')}
                          className={`p-2.5 sm:p-3 px-3 sm:px-4 rounded-xl border text-center transition-all cursor-pointer ${
                            companyWorkspaceTab === 'allocated' || companyWorkspaceTab === 'cards'
                              ? 'bg-sky-500/15 border-sky-500/50 shadow-sm ring-1 ring-sky-500/30'
                              : isDark ? 'bg-slate-950 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'} block truncate`}>
                            Issued Cards
                          </span>
                          <div className="text-base sm:text-lg font-black text-sky-400">
                            {allocatedCompanyCards.length}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCompanyWorkspaceTab('employees')}
                          className={`p-2.5 sm:p-3 px-3 sm:px-4 rounded-xl border text-center transition-all cursor-pointer ${
                            companyWorkspaceTab === 'employees'
                              ? 'bg-sky-500/15 border-sky-500/50 shadow-sm ring-1 ring-sky-500/30'
                              : isDark ? 'bg-slate-950 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'} block truncate`}>
                            Team Members
                          </span>
                          <div className="text-base sm:text-lg font-black text-sky-400">
                            {companyEmployees.length}
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCompanyWorkspaceTab('template')}
                          className={`p-2.5 sm:p-3 px-3 sm:px-4 rounded-xl border text-center transition-all cursor-pointer ${
                            companyWorkspaceTab === 'template'
                              ? 'bg-purple-500/15 border-purple-500/50 shadow-sm ring-1 ring-purple-500/30'
                              : isDark ? 'bg-slate-950 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'} block truncate`}>
                            Template
                          </span>
                          <div className="text-base sm:text-lg font-black text-purple-400">
                            {companyTemplateCard ? 'Active' : 'Base'}
                          </div>
                        </button>

                        <div className={`p-2.5 sm:p-3 px-3 sm:px-4 rounded-xl ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'} border text-center`}>
                          <span className={`text-[10px] uppercase font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'} block truncate`}>
                            Total Views
                          </span>
                          <div className="text-base sm:text-lg font-black text-emerald-400">
                            {companyCards.reduce((acc, c) => acc + (c.viewsCount || 0), 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Workspace Two-Column Grid: Cards or Employee List (Left) + Interactive Phone Simulator (Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left Column */}
                  <div className={`${previewSectionScale === 'xl' ? 'lg:col-span-5' : 'lg:col-span-6'} space-y-4 transition-all duration-300`}>
                    {/* Workspace Tab Switcher Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/60">
                      <div className={`p-1 rounded-xl border flex flex-wrap sm:flex-nowrap items-center gap-1 w-full sm:w-auto ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                        <button
                          type="button"
                          onClick={() => setCompanyWorkspaceTab('allocated')}
                          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            companyWorkspaceTab === 'allocated' || companyWorkspaceTab === 'cards'
                              ? 'bg-sky-600 text-white shadow-md'
                              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <CreditCard className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Issued Cards ({allocatedCompanyCards.length})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCompanyWorkspaceTab('employees')}
                          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            companyWorkspaceTab === 'employees'
                              ? 'bg-sky-600 text-white shadow-md'
                              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            Team Members ({companyEmployees.length})
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCompanyWorkspaceTab('template')}
                          className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            companyWorkspaceTab === 'template'
                              ? 'bg-sky-600 text-white shadow-md'
                              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Building2 className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Template</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const companySource = companyTemplateCard || companyCards[0];
                            if (!companySource) {
                              showToast(`Create a master template card for ${activeCompany?.name || 'this company'} first.`);
                              setEditingCard(null);
                              setActiveView('editor');
                              return;
                            }
                            setCardToAllocate(companySource);
                            setAllocateModalMode('bulk');
                            setShowAllocateModal(true);
                          }}
                          className={`min-h-[34px] px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                            isDark ? 'bg-sky-500/15 text-sky-400 border-sky-500/30 hover:bg-sky-500/25' : 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100 shadow-sm'
                          }`}
                          title="Allocate cards to multiple team members simultaneously"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>Bulk Allocate Cards</span>
                        </button>

                        {companyWorkspaceTab === 'employees' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setShowLinkEmployeeModal(true)}
                              className={`min-h-[34px] px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                isDark ? 'bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-800' : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-sm'
                              }`}
                              title="Link an existing personnel to this company"
                            >
                              <UserPlus className="w-3.5 h-3.5 text-sky-400" />
                              <span>Link Personnel</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!companyTemplateCard && companyCards.length === 0) {
                                  showToast(`Create a master template card for ${activeCompany?.name || 'this company'} first.`);
                                  setEditingCard(null);
                                  setActiveView('editor');
                                  return;
                                }
                                setShowIssueEmployeeModal(true);
                              }}
                              className="min-h-[34px] px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                              title="Add a new team member and allocate a card"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>New Team Member</span>
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (!companyTemplateCard && companyCards.length === 0) {
                                showToast(`Create a master template card for ${activeCompany?.name || 'this company'} first.`);
                                setEditingCard(null);
                                setActiveView('editor');
                                return;
                              }
                              setShowIssueEmployeeModal(true);
                            }}
                            className="min-h-[34px] px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{!companyTemplateCard && companyCards.length === 0 ? 'Create Template First' : 'Issue Team Member Card'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* View 1: ALLOCATED & ISSUED CARDS TAB */}
                    {(companyWorkspaceTab === 'allocated' || companyWorkspaceTab === 'cards') && (
                      <div className="space-y-3">
                        {allocatedCompanyCards.map((card, cardIdx) => {
                          const isSelected = card.id === selectedCardId;
                          const assignedMember =
                            users.find((u) => u.id === card.assignedMemberId) ||
                            users.find((u) => u.assignedCardId === card.id);
                          const cardUrl = getCardShareUrl(card.slug);

                          return (
                            <div
                              key={`card-${card.id}-${cardIdx}`}
                              onClick={() => {
                                setSelectedCardId(card.id);
                                showToast(`Simulating ${assignedMember?.name || card.contactPersonName || card.businessName}'s card`);
                              }}
                              className={`p-4 rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                                isSelected
                                  ? isDark
                                    ? 'bg-slate-900 border-amber-500/80 shadow-xl shadow-amber-950/20 ring-2 ring-amber-500/60'
                                    : 'bg-amber-50/90 border-amber-500 shadow-md ring-2 ring-amber-400/60'
                                  : isDark
                                  ? 'bg-slate-900/60 hover:bg-slate-900 border-slate-800'
                                  : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {/* Member Avatar / Photo */}
                                  <div
                                    className={`w-12 h-12 rounded-xl ${isDark ? 'bg-slate-950' : 'bg-slate-100'} p-0.5 border overflow-hidden shrink-0 shadow-sm`}
                                    style={{ borderColor: activeCompany?.theme?.primaryColor || card.theme.primaryColor || '#ef4444' }}
                                  >
                                    {assignedMember?.avatarUrl || (card.logoUrl && card.logoUrl !== activeCompany?.logoUrl) ? (
                                      <img
                                        src={assignedMember?.avatarUrl || card.logoUrl || undefined}
                                        alt={card.contactPersonName || card.businessName}
                                        className="w-full h-full object-cover rounded-lg"
                                      />
                                    ) : (
                                      <div className={`w-full h-full ${isDark ? 'bg-amber-950/60 text-amber-400' : 'bg-amber-100 text-amber-700'} flex items-center justify-center font-bold text-xs`}>
                                        {(card.contactPersonName || assignedMember?.name || 'EM')
                                          .split(' ')
                                          .map((p) => p[0])
                                          .join('')
                                          .slice(0, 2)
                                          .toUpperCase()}
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'} leading-tight truncate`}>
                                        {card.contactPersonName || assignedMember?.name || card.businessName}
                                      </h3>
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold shrink-0 ${
                                          card.status === 'live'
                                            ? isDark
                                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
                                            : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
                                        }`}
                                      >
                                        {card.status}
                                      </span>

                                      {isSelected && (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                          Live Simulator Active
                                        </span>
                                      )}
                                    </div>

                                    {/* Role & Company Brand Affiliation Tag */}
                                    <p className="text-xs text-amber-500 font-semibold mt-0.5 flex items-center gap-1 truncate">
                                      <UserCheck className="w-3.5 h-3.5 shrink-0" />
                                      <span className="truncate">
                                        {card.designation || assignedMember?.designation || 'Team Member'} • {activeCompany?.name}
                                      </span>
                                    </p>

                                    <div className={`flex flex-wrap items-center gap-2 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1.5 font-mono`}>
                                      <span className="truncate">/card/<strong>{card.slug}</strong></span>
                                      <span>•</span>
                                      <span>{card.viewsCount} views</span>
                                      {card.socialLinks?.phone && (
                                        <>
                                          <span>•</span>
                                          <span className="font-sans">{card.socialLinks.phone}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Card action buttons */}
                                <div className="flex flex-wrap items-center justify-start sm:justify-end gap-1.5 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-800/40 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
                                  {/* Preview in Simulator */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedCardId(card.id);
                                      showToast(`Simulating ${card.contactPersonName || card.businessName}'s card in live simulator`);
                                    }}
                                    className={`min-h-[34px] px-2.5 py-1.5 rounded-xl ${
                                      isSelected
                                        ? 'bg-amber-500 text-slate-950 font-bold'
                                        : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                    } text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0`}
                                    title="View this card in the live simulator on the right"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                                    <span>{isSelected ? 'Simulating' : 'Preview'}</span>
                                  </button>

                                  {/* Quick Copy Link button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(cardUrl);
                                      showToast(`Card link copied: /card/${card.slug}`);
                                    }}
                                    className="min-h-[34px] min-w-[34px] p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                                    title="Copy direct team member card link"
                                    aria-label="Copy card link"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Allocate / Reassign Card to Team Member */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCardToAllocate(card);
                                      setShowAllocateModal(true);
                                    }}
                                    className={`min-h-[34px] p-1.5 px-2.5 rounded-xl ${
                                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                                    } border text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm cursor-pointer shrink-0`}
                                    title={assignedMember ? "Reassign or unassign this card" : "Allocate this card to a team member"}
                                    aria-label="Allocate card"
                                  >
                                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                                    <span>{assignedMember ? 'Reassign' : 'Allocate'}</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setEditingCard(card);
                                      setActiveView('editor');
                                    }}
                                    className={`min-h-[34px] min-w-[34px] p-2 rounded-xl ${
                                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                                    } border transition-colors flex items-center justify-center cursor-pointer shrink-0`}
                                    title="Edit Card"
                                    aria-label="Edit card"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedCardId(card.id);
                                      setActiveView('preview_standalone');
                                    }}
                                    className={`min-h-[34px] min-w-[34px] p-2 rounded-xl ${
                                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                                    } border transition-colors flex items-center justify-center cursor-pointer shrink-0`}
                                    title="Fullscreen Preview"
                                    aria-label="Fullscreen preview"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCard(card.id)}
                                    className={`min-h-[34px] min-w-[34px] p-2 rounded-xl ${
                                      isDark ? 'text-slate-400 hover:text-red-400 hover:bg-red-950/30' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                    } transition-colors flex items-center justify-center cursor-pointer shrink-0`}
                                    title="Delete Card"
                                    aria-label="Delete card"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {allocatedCompanyCards.length === 0 && (
                          <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} space-y-3`}>
                            <CreditCard className="w-10 h-10 text-slate-500 mx-auto opacity-40" />
                            {!companyTemplateCard && companyCards.length === 0 ? (
                              <>
                                <h3 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                  Create a master template for {activeCompany?.name} first
                                </h3>
                                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} max-w-md mx-auto leading-relaxed`}>
                                  Set up {activeCompany?.name}&apos;s branding template (logo, colors, banners, services, and contact details) before simulating or issuing team member cards.
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCard(null);
                                      setActiveView('editor');
                                    }}
                                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                                  >
                                    <Plus className="w-4 h-4" />
                                    <span>Create Template Card</span>
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <h3 className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                  No cards allocated to team members under {activeCompany?.name} yet
                                </h3>
                                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  Issue individual smart cards for each team member. Every allocated card has a unique link while maintaining the same {activeCompany?.name} branding.
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                  <button
                                    onClick={() => setShowIssueEmployeeModal(true)}
                                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                    <span>Issue Team Member Card</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCardToAllocate(companyTemplateCard || companyCards[0]);
                                      setAllocateModalMode('bulk');
                                      setShowAllocateModal(true);
                                    }}
                                    className={`px-4 py-2 rounded-xl ${
                                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                    } font-bold text-xs inline-flex items-center gap-1.5 border border-slate-700 cursor-pointer`}
                                  >
                                    <Users className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Bulk Allocate Team Cards</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* View 2: EMPLOYEES DIRECTORY TAB */}
                    {companyWorkspaceTab === 'employees' && (
                      <div className="space-y-3">
                        {(() => {
                          if (!activeCompany) return null;

                          if (companyEmployees.length === 0) {
                            return (
                              <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} space-y-3`}>
                                <Users className="w-10 h-10 text-slate-500 mx-auto opacity-40" />
                                <h3 className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                  No employees registered under {activeCompany.name} yet
                                </h3>
                                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                  Link existing personnel or issue a new card to add employees directly to this company.
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                  <button
                                    onClick={() => setShowLinkEmployeeModal(true)}
                                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                                  >
                                    <UserPlus className="w-4 h-4" />
                                    <span>Link Existing Personnel</span>
                                  </button>
                                  <button
                                    onClick={() => setShowIssueEmployeeModal(true)}
                                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                    <span>Issue Employee Card</span>
                                  </button>
                                </div>
                              </div>
                            );
                          }

                          return companyEmployees.map((emp, empIdx) => {
                            const assignedCard =
                              cards.find((c) => c.id === emp.assignedCardId) ||
                              companyCards.find((c) => c.assignedMemberId === emp.id);
                            const isAdminUser = emp.role === 'admin';
                            const isCurrentlyActiveInSimulator =
                              !!activeCard &&
                              ((assignedCard && activeCard.id === assignedCard.id) ||
                                activeCard.assignedMemberId === emp.id);

                            return (
                              <div
                                key={`emp-${emp.id}-${empIdx}`}
                                onClick={() => handleSelectEmployeeForPreview(emp, { autoCreate: false })}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                  isCurrentlyActiveInSimulator
                                    ? isDark
                                      ? 'bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/40 shadow-lg'
                                      : 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                                    : isDark
                                    ? 'bg-slate-900/70 border-slate-800 hover:border-amber-500/50 hover:bg-slate-900'
                                    : 'bg-white border-slate-200 shadow-sm hover:border-amber-400 hover:bg-slate-50'
                                } space-y-3`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {/* Employee Avatar */}
                                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 shadow-sm flex items-center justify-center relative">
                                      {emp.avatarUrl ? (
                                        <img src={emp.avatarUrl || undefined} alt={emp.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-sm font-bold text-amber-400">
                                          {emp.name
                                            .split(' ')
                                            .map((p) => p[0])
                                            .join('')
                                            .slice(0, 2)
                                            .toUpperCase()}
                                        </span>
                                      )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'} truncate`}>
                                          {emp.name}
                                        </h4>
                                        <span
                                          className={`px-1.5 py-0.2 rounded text-[9px] uppercase font-bold shrink-0 ${
                                            isAdminUser
                                              ? isDark
                                                ? 'bg-amber-950/80 text-amber-300 border border-amber-800/40'
                                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                                              : isDark
                                              ? 'bg-sky-950/80 text-sky-300 border border-sky-800/40'
                                              : 'bg-sky-50 text-sky-800 border border-sky-200'
                                          }`}
                                        >
                                          {isAdminUser ? 'Admin' : 'Employee'}
                                        </span>

                                        {isCurrentlyActiveInSimulator && (
                                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Live Simulator Active
                                          </span>
                                        )}
                                      </div>

                                      <p className="text-xs text-amber-500 font-semibold mt-0.5 truncate">
                                        {emp.designation || 'Company Employee'}
                                      </p>

                                      <div className={`flex flex-wrap items-center gap-3 text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
                                        {emp.email && <span className="truncate">{emp.email}</span>}
                                        {emp.phone && (
                                          <span className="flex items-center gap-1 truncate">
                                            <span>•</span>
                                            <span>{emp.phone}</span>
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Employee Actions */}
                                  <div className="flex items-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/40 shrink-0" onClick={(e) => e.stopPropagation()}>
                                    {/* Unlink from Company Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleUnlinkEmployeeFromCompany(emp.id, activeCompany.id)}
                                      className={`min-h-[34px] px-2.5 py-1.5 rounded-xl ${
                                        isDark ? 'bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-400 border-slate-700' : 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border-slate-200'
                                      } border text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer`}
                                      title={`Unlink ${emp.name} from ${activeCompany.name}`}
                                    >
                                      <Unlink className="w-3.5 h-3.5" />
                                      <span>Unlink Company</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Linked Card Status Bar */}
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectEmployeeForPreview(emp, { autoCreate: false });
                                  }}
                                  className={`p-2.5 rounded-xl border cursor-pointer transition-colors ${
                                    assignedCard
                                      ? isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                                      : isDark ? 'bg-amber-950/20 border-amber-500/20 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                                  } flex flex-col sm:flex-row sm:items-center justify-between gap-2`}
                                >
                                  {assignedCard ? (
                                    <>
                                      <div className="flex items-center gap-2 min-w-0">
                                        <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'} truncate`}>
                                              {assignedCard.businessName}
                                            </span>
                                            <span className="text-[10px] font-mono text-emerald-400">/card/{assignedCard.slug}</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectEmployeeForPreview(emp, { autoCreate: false });
                                          }}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                            isCurrentlyActiveInSimulator
                                              ? 'bg-amber-500 text-slate-950 font-bold'
                                              : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                                          } transition-colors flex items-center gap-1 cursor-pointer`}
                                          title="View card simulation in simulator"
                                        >
                                          <Eye className="w-3 h-3 text-amber-400" />
                                          <span>{isCurrentlyActiveInSimulator ? 'Simulating' : 'Preview'}</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            navigator.clipboard.writeText(getCardShareUrl(assignedCard.slug));
                                            showToast(`Copied ${emp.name}'s card link!`);
                                          }}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                            isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                                          } transition-colors flex items-center gap-1 cursor-pointer`}
                                          title="Copy direct profile link"
                                        >
                                          <Copy className="w-3 h-3" />
                                          <span>Copy Link</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingCard(assignedCard);
                                            setActiveView('editor');
                                          }}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                            isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                                          } transition-colors flex items-center gap-1 cursor-pointer`}
                                          title="Edit this card"
                                        >
                                          <Edit className="w-3 h-3 text-sky-400" />
                                          <span>Edit Card</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleDeleteCard(assignedCard.id)}
                                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 transition-colors flex items-center gap-1 cursor-pointer"
                                          title="Delete this card"
                                        >
                                          <Trash2 className="w-3 h-3 text-red-400" />
                                          <span>Delete</span>
                                        </button>

                                        {/* Unlink Card Button */}
                                        <button
                                          type="button"
                                          onClick={() => handleUnlinkEmployeeCard(emp.id, assignedCard.id)}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                            isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                                          } transition-colors flex items-center gap-1 cursor-pointer`}
                                          title={`Unlink card from ${emp.name}`}
                                        >
                                          <UserX className="w-3 h-3" />
                                          <span>Unlink</span>
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                                        <span className="text-xs font-medium">No smart card allocated to this employee yet</span>
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectEmployeeForPreview(emp, { autoCreate: true });
                                          }}
                                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
                                        >
                                          <UserCheck className="w-3 h-3" />
                                          <span>Allocate & Simulate</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setIssueCardTargetUser(emp);
                                            setShowIssueEmployeeModal(true);
                                          }}
                                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                            isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                                          } transition-colors flex items-center gap-1 cursor-pointer`}
                                        >
                                          <Plus className="w-3 h-3" />
                                          <span>Issue Card</span>
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    )}

                    {/* View 3: COMPANY MASTER TEMPLATE TAB */}
                    {companyWorkspaceTab === 'template' && (
                      <div className="space-y-4">
                        {companyTemplateCard ? (
                          <div
                            className={`p-5 rounded-2xl border transition-all ${
                              activeCard?.id === companyTemplateCard.id
                                ? isDark
                                  ? 'bg-slate-900 border-amber-500 ring-2 ring-amber-500/40 shadow-xl'
                                  : 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/40 shadow-md'
                                : isDark
                                ? 'bg-slate-900/80 border-slate-800'
                                : 'bg-white border-slate-200 shadow-sm'
                            } space-y-4`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div
                                  className="w-14 h-14 rounded-2xl bg-slate-950 p-0.5 border overflow-hidden shrink-0 shadow-md"
                                  style={{ borderColor: activeCompany?.theme?.primaryColor || companyTemplateCard.theme?.primaryColor || '#f59e0b' }}
                                >
                                  {companyTemplateCard.logoUrl ? (
                                    <img
                                      src={companyTemplateCard.logoUrl || undefined}
                                      alt={companyTemplateCard.businessName}
                                      className="w-full h-full object-contain p-0.5 rounded-xl bg-slate-950"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                      <Building2 className="w-7 h-7 text-amber-500" />
                                    </div>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'} leading-tight truncate`}>
                                      {companyTemplateCard.businessName}
                                    </h3>
                                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                      Master Brand Template
                                    </span>
                                    {activeCard?.id === companyTemplateCard.id && (
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        Simulating in Live Phone
                                      </span>
                                    )}
                                  </div>

                                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} mt-0.5 truncate`}>
                                    {companyTemplateCard.tagline || activeCompany?.tagline}
                                  </p>

                                  <div className="flex items-center gap-2 text-[11px] text-sky-400 font-mono mt-1">
                                    <span>/card/<strong>{companyTemplateCard.slug}</strong></span>
                                    <span>•</span>
                                    <span>{companyTemplateCard.viewsCount || 0} views</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCardId(companyTemplateCard.id);
                                    showToast(`Simulating ${companyTemplateCard.businessName} Master Corporate Template`);
                                  }}
                                  className={`px-3 py-2 rounded-xl ${
                                    activeCard?.id === companyTemplateCard.id
                                      ? 'bg-sky-600 text-white font-black'
                                      : isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                  } text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer`}
                                >
                                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                                  <span>{activeCard?.id === companyTemplateCard.id ? 'Simulating Template' : 'Simulate Template'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCard(companyTemplateCard);
                                    setActiveView('editor');
                                  }}
                                  className={`p-2 rounded-xl ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'} border border-slate-700 transition-colors cursor-pointer`}
                                  title="Edit Template Guidelines"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteCard(companyTemplateCard.id)}
                                  className={`p-2 rounded-xl ${isDark ? 'text-slate-400 hover:text-red-400 hover:bg-red-950/30' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'} border border-slate-700 transition-colors cursor-pointer`}
                                  title="Delete Template Card"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Brand Guidelines Inheritance Banner */}
                            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-3`}>
                              <div className="flex items-center justify-between text-xs font-bold">
                                <span className="text-amber-400 flex items-center gap-1.5">
                                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                                  Corporate Branding Standards
                                </span>
                                <span className="text-slate-400 text-[11px]">Strictly applied to all employee cards</span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
                                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Brand Accent</span>
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <div
                                      className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-sm shrink-0"
                                      style={{ backgroundColor: activeCompany?.theme?.primaryColor || companyTemplateCard.theme?.primaryColor || '#f59e0b' }}
                                    />
                                    <span className="font-mono text-white text-[11px] truncate">
                                      {activeCompany?.theme?.primaryColor || companyTemplateCard.theme?.primaryColor || '#f59e0b'}
                                    </span>
                                  </div>
                                </div>

                                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Hero Banners</span>
                                  <span className="font-bold text-white text-[11px] block mt-1 truncate">
                                    {companyTemplateCard.banners?.length || 0} slide(s)
                                  </span>
                                </div>

                                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Services</span>
                                  <span className="font-bold text-white text-[11px] block mt-1 truncate">
                                    {companyTemplateCard.services?.length || 0} listed
                                  </span>
                                </div>

                                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Theme Mode</span>
                                  <span className="font-bold text-white text-[11px] block mt-1 capitalize truncate">
                                    {companyTemplateCard.theme?.bgType || 'Image / Glass'}
                                  </span>
                                </div>

                                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Schedule</span>
                                  <span className="font-bold text-amber-400 text-[11px] block mt-1 truncate" title={companyTemplateCard.operatingHours || activeCompany?.operatingHours}>
                                    {companyTemplateCard.operatingHours || activeCompany?.operatingHours || 'Mon - Fri 08:00 - 17:00'}
                                  </span>
                                </div>
                              </div>

                              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>
                                All team member smart cards issued under <strong>{activeCompany?.name}</strong> automatically inherit this corporate design, theme colors, banners, and logo. Each team member receives a unique direct link and contact profile while brand identity remains uniform across the organization.
                              </p>

                              <div className="pt-2 flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setShowIssueEmployeeModal(true)}
                                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                >
                                  <CreditCard className="w-3.5 h-3.5" />
                                  <span>Issue Team Member from Template</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCardToAllocate(companyTemplateCard);
                                    setAllocateModalMode('bulk');
                                    setShowAllocateModal(true);
                                  }}
                                  className={`px-3 py-2 rounded-xl ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'} font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer`}
                                >
                                  <Users className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Bulk Allocate to Team</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className={`p-8 text-center rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'} space-y-3`}>
                            <Building2 className="w-10 h-10 text-slate-500 mx-auto opacity-40" />
                            <h3 className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                              No master template card for {activeCompany?.name}
                            </h3>
                            <button
                              onClick={() => {
                                setEditingCard(null);
                                setActiveView('editor');
                              }}
                              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Create Template Card</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Interactive Phone Preview (Scalable preview section size) */}
                  <div id="company-live-simulator" className={`${previewSectionScale === 'xl' ? 'lg:col-span-7' : 'lg:col-span-6'} flex flex-col items-center transition-all duration-300`}>
                    {/* Preview Toolbar */}
                    <div className={`w-full ${previewSectionScale === 'xl' ? 'max-w-[560px]' : previewSectionScale === 'large' ? 'max-w-[490px]' : 'max-w-[420px]'} mb-3 flex flex-wrap items-center justify-between gap-2 text-xs px-2 transition-all duration-300`}>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 font-bold text-slate-300">
                          <Smartphone className="w-4 h-4 text-amber-400" />
                          <span>Live Card Simulator</span>
                        </div>
                        {/* Size Switcher */}
                        <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
                          {(['standard', 'large', 'xl'] as const).map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => setPreviewSectionScale(sz)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                                previewSectionScale === sz
                                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                              title={`Set simulator preview size to ${sz}`}
                            >
                              {sz === 'standard' ? 'Normal' : sz === 'large' ? 'Large' : 'XL'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isAdmin && activeCard && (
                          <button
                            onClick={() => {
                              setCardToAllocate(activeCard);
                              setShowAllocateModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 text-[11px] font-bold transition-colors cursor-pointer"
                            title="Allocate this card to an employee"
                          >
                            <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                            <span>Allocate</span>
                            {activeCard.assignedMemberId && (
                              <span className="text-[10px] text-emerald-400 font-normal hidden sm:inline">
                                ({users.find((u) => u.id === activeCard.assignedMemberId)?.name?.split(' ')[0] || 'Assigned'})
                              </span>
                            )}
                          </button>
                        )}

                        {isAdmin && activeCard && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCard(activeCard);
                              setActiveView('editor');
                            }}
                            className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-colors"
                            title="Edit this active card"
                          >
                            <Edit className="w-3.5 h-3.5 text-amber-400" />
                            <span>Edit</span>
                          </button>
                        )}

                        {isAdmin && activeCard && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCard(activeCard.id)}
                            className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-800/40 text-red-300 flex items-center gap-1 text-[11px] font-bold cursor-pointer transition-colors"
                            title="Delete this active card"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            <span>Delete</span>
                          </button>
                        )}

                        {activeCard && (
                          <button
                            onClick={() => setActiveView('preview_standalone')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                            title="Open Fullscreen"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Fullscreen</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile Phone Mockup Container */}
                    <div className="w-full flex justify-center">
                      {activeCard ? (
                        <div className={`w-full ${previewSectionScale === 'xl' ? 'max-w-[560px]' : previewSectionScale === 'large' ? 'max-w-[490px]' : 'max-w-[420px]'} h-[780px] rounded-[32px] border-4 border-slate-800/80 shadow-2xl overflow-hidden relative bg-slate-950 flex flex-col`}>
                          <CardView
                            card={activeCard}
                            allocatedMember={
                              users.find((u) => u.id === activeCard.assignedMemberId) ||
                              users.find((u) => u.assignedCardId === activeCard.id) ||
                              null
                            }
                            company={activeCompany || companies.find((c) => c.id === (activeCard.companyId || users.find((u) => u.id === activeCard.assignedMemberId)?.companyId))}
                            companyTemplate={
                              companyTemplateCard ||
                              cards.find((c) => c.companyId === (activeCard.companyId || activeCompany?.id) && !c.assignedMemberId) ||
                              null
                            }
                            maxWidthClass="w-full max-w-none"
                            onLeadSubmit={handleLeadSubmit}
                            onActionClick={handleActionClick}
                            isStandalone={false}
                          />
                        </div>
                      ) : (
                        <div className={`w-full ${previewSectionScale === 'xl' ? 'max-w-[560px]' : previewSectionScale === 'large' ? 'max-w-[490px]' : 'max-w-[420px]'} min-h-[460px] rounded-[32px] border-2 border-dashed ${isDark ? 'bg-slate-900/60 border-slate-700/80 text-slate-300' : 'bg-white border-slate-300 text-slate-700'} flex flex-col items-center justify-center p-6 sm:p-8 text-center space-y-4`}>
                          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg">
                            <Building2 className="w-8 h-8" />
                          </div>
                          <div className="space-y-2 max-w-xs">
                            <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-400 border border-sky-500/30">
                              Template Required
                            </span>
                            <h3 className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              Create Company Template First
                            </h3>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>
                              {activeCompany
                                ? `No master template card exists for ${activeCompany.name} yet. Create the company branding template first to unlock the live simulation preview and issue team cards.`
                                : 'Create or select a company template card to view the live simulation preview.'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCard(null);
                              setActiveView('editor');
                            }}
                            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-amber-950/30 transition-all cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Create Template Card</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Global Footer: Powered by B-SMART linking to landing page */}
        <div className="mt-16">
          <PoweredByBSmart
            className="rounded-2xl border border-slate-800/80"
            onNavigateHome={() => {
              setIsAppRoute(false);
              try {
                window.history.pushState({}, '', '/');
              } catch {}
            }}
          />
        </div>
      </main>

      {/* MODAL 1: Authentication / Profile Switcher Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          users={users}
          onLoginSuccess={(user: User) => {
            setCurrentUser(user);
            setShowAuthModal(false);
            showToast(`Logged in as ${user.name} (${user.role.toUpperCase()})`);
          }}
          onOpenSignUpModal={() => {
            setShowAuthModal(false);
            setShowCompanySignUpModal(true);
          }}
        />
      )}

      {/* MODAL 2: Issue Company Card to Employee Modal */}
      {showIssueEmployeeModal && (
        <IssueEmployeeCardModal
          isOpen={showIssueEmployeeModal}
          onClose={() => {
            setShowIssueEmployeeModal(false);
            setIssueCardTargetUser(null);
          }}
          companies={cards}
          allCards={cards}
          defaultCompanyId={selectedCompanyId || undefined}
          existingEmployees={users}
          targetEmployee={issueCardTargetUser}
          onIssueCard={handleIssueEmployeeCard}
          onOpenCardPreview={(cardId, slug) => {
            setSelectedCardId(cardId);
            const found = cards.find((c) => c.id === cardId);
            const finalSlug = slug || found?.slug;
            if (finalSlug) {
              try {
                window.history.pushState({}, '', getCardDisplayPath(finalSlug));
              } catch {
                window.location.hash = `card/${finalSlug}`;
              }
            }
            setActiveView('preview_standalone');
          }}
        />
      )}

      {/* MODAL 3: Allocate Business Card Modal */}
      {showAllocateModal && (
        <AllocateCardModal
          isOpen={showAllocateModal}
          onClose={() => setShowAllocateModal(false)}
          card={cardToAllocate}
          employees={users}
          allCards={cards}
          onAllocate={handleAllocateCard}
          onBulkAllocate={handleBulkAllocateCards}
          initialMode={allocateModalMode}
        />
      )}

      {/* MODAL 4: Company Create / Edit Modal */}
      {showCompanyModal && (
        <CompanyModal
          isOpen={showCompanyModal}
          onClose={() => {
            setShowCompanyModal(false);
            setEditingCompany(null);
          }}
          company={editingCompany}
          onSave={handleSaveCompany}
        />
      )}

      {/* MODAL 4B: Company Sign Up Modal (Registration for new organizations) */}
      {showCompanySignUpModal && (
        <CompanySignUpModal
          isOpen={showCompanySignUpModal}
          onClose={() => setShowCompanySignUpModal(false)}
          onCompanyRegistered={handleCompanyRegistered}
        />
      )}

      {/* MODAL 4C: Company Approval & Module Governance Modal */}
      {showCompanyApprovalModal && companyForApproval && (
        <CompanyApprovalModal
          isOpen={showCompanyApprovalModal}
          onClose={() => {
            setShowCompanyApprovalModal(false);
            setCompanyForApproval(null);
          }}
          company={companyForApproval}
          onSaveCompany={handleUpdateCompanyGovernance}
          currentAdminName={currentUser?.name || 'Administrator'}
        />
      )}

      {/* MODAL 4D: Subscriptions & Payment Reminder Modal */}
      {showPaymentReminderModal && companyForPaymentReminder && (
        <PaymentReminderModal
          isOpen={showPaymentReminderModal}
          onClose={() => {
            setShowPaymentReminderModal(false);
            setCompanyForPaymentReminder(null);
          }}
          company={companyForPaymentReminder}
          onUpdateCompany={handleUpdateCompanyGovernance}
        />
      )}
      {cardToDelete && (
        <ConfirmationModal
          isOpen={!!cardToDelete}
          onClose={() => setCardToDelete(null)}
          onConfirm={() => {
            if (cardToDelete) executeDeleteCard(cardToDelete);
          }}
          title="Delete Smart Card"
          highlightText={cardToDelete?.businessName}
          message="Are you sure you want to permanently delete this digital business card? All active QR links and personalized shares for this card will stop responding."
          confirmLabel="Yes, Delete Card"
          cancelLabel="Keep Card"
          type="danger"
        />
      )}

      {/* MODAL 6: Professional Confirmation Modal for Company Deletion */}
      {companyToDelete && (
        <ConfirmationModal
          isOpen={!!companyToDelete}
          onClose={() => setCompanyToDelete(null)}
          onConfirm={() => {
            if (companyToDelete) executeDeleteCompany(companyToDelete);
          }}
          title="Delete Company & Linked Cards"
          highlightText={companyToDelete?.name}
          message="Are you sure you want to delete this company? All associated digital business cards, employee links, and brand settings linked to this company will also be removed."
          confirmLabel="Yes, Delete Company"
          cancelLabel="Cancel"
          type="danger"
        />
      )}

      {/* MODAL 7: Link Existing Personnel to Company */}
      {showLinkEmployeeModal && activeCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`w-full max-w-lg rounded-2xl border ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
            } overflow-hidden max-h-[85vh] flex flex-col`}
          >
            {/* Modal Header */}
            <div className={`p-4 sm:p-5 border-b ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Link Personnel to {activeCompany.name}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Select an existing employee or administrator to associate with this company.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowLinkEmployeeModal(false);
                  setLinkEmployeeSearch('');
                }}
                className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'} cursor-pointer`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search filter */}
            <div className="p-4 border-b border-slate-800/40">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search personnel by name, email, designation..."
                  value={linkEmployeeSearch}
                  onChange={(e) => setLinkEmployeeSearch(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 rounded-xl ${
                    isDark ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                  } border text-xs focus:outline-none focus:border-amber-500`}
                />
              </div>
            </div>

            {/* List of unlinked / other employees */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {(() => {
                const availablePersonnel = users.filter((u) => {
                  const matchesSearch =
                    !linkEmployeeSearch ||
                    u.name.toLowerCase().includes(linkEmployeeSearch.toLowerCase()) ||
                    u.email.toLowerCase().includes(linkEmployeeSearch.toLowerCase()) ||
                    (u.designation && u.designation.toLowerCase().includes(linkEmployeeSearch.toLowerCase()));
                  return matchesSearch;
                });

                if (availablePersonnel.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No personnel matching your search.
                    </div>
                  );
                }

                return availablePersonnel.map((u, uIdx) => {
                  const isAlreadyLinked = getUserCompanyIds(u).includes(activeCompany.id);
                  const currentCompany = companies.find((c) => c.id === u.companyId);

                  return (
                    <div
                      key={`personnel-${u.id}-${uIdx}`}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                        isAlreadyLinked
                          ? isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
                          : isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl || undefined} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-amber-400">
                              {u.name
                                .split(' ')
                                .map((p) => p[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'} truncate`}>
                            {u.name}
                          </h4>
                          <p className="text-[11px] text-amber-500 font-medium truncate">
                            {u.designation || (u.role === 'admin' ? 'Administrator' : 'Employee')}
                          </p>
                          <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'} truncate`}>
                            {currentCompany ? `Current: ${currentCompany.name}` : 'Unassigned to any company'}
                          </p>
                        </div>
                      </div>

                      {isAlreadyLinked ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                          Already Linked
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleLinkEmployeeToCompany(u.id, activeCompany.id)}
                          className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1 transition-colors shadow-sm shrink-0 cursor-pointer"
                        >
                          <Link className="w-3 h-3" />
                          <span>Link to {activeCompany.name.split(' ')[0]}</span>
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className={`p-3 px-4 border-t ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'} flex items-center justify-end`}>
              <button
                type="button"
                onClick={() => {
                  setShowLinkEmployeeModal(false);
                  setLinkEmployeeSearch('');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                } transition-colors cursor-pointer`}
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL 8: Step-by-Step Onboarding Wizard Modal */}
      {showOnboardingWizardModal && (
        <OnboardingWizardModal
          isOpen={showOnboardingWizardModal}
          onClose={() => setShowOnboardingWizardModal(false)}
          existingCards={cards}
          existingUsers={users}
          onComplete={handleCompleteOnboardingWizard}
        />
      )}

      {/* MODAL 9: Help & Onboarding Guide with Screenshots Modal */}
      {showHelpGuideModal && (
        <HelpGuideModal
          isOpen={showHelpGuideModal}
          onClose={() => setShowHelpGuideModal(false)}
          onStartOnboarding={() => setShowOnboardingWizardModal(true)}
        />
      )}


      {/* MODAL 11: Database Save Action Confirmation Modal */}
      {saveConfirmModalConfig && (
        <DatabaseSaveConfirmModal
          isOpen={saveConfirmModalConfig.isOpen}
          onClose={() => setSaveConfirmModalConfig(null)}
          onSaveLocally={saveConfirmModalConfig.onSaveLocally}
          onSaveAndSyncImmediately={saveConfirmModalConfig.onSaveAndSyncImmediately}
          title={saveConfirmModalConfig.title}
          entityName={saveConfirmModalConfig.entityName}
          entityType={saveConfirmModalConfig.entityType}
          actionType={saveConfirmModalConfig.actionType}
          detailsSummary={saveConfirmModalConfig.detailsSummary}
        />
      )}

      {/* MODAL 12: cPanel Database Sync Authorization Modal (Admin Password Required) */}
      {dbSyncModalConfig && (
        <DatabaseSyncModal
          isOpen={dbSyncModalConfig.isOpen}
          onClose={() => setDbSyncModalConfig(null)}
          onConfirmSync={dbSyncModalConfig.onConfirmSync}
          title={dbSyncModalConfig.title}
          description={dbSyncModalConfig.description}
          targetDetails={dbSyncModalConfig.targetDetails}
          currentUser={currentUser}
          adminUsers={users.filter((u) => u.role === 'admin')}
          isLoading={isSyncingDb}
        />
      )}

      {/* MODAL 13: Offline Sync Conflict Resolution Modal */}
      <SyncConflictModal
        isOpen={showConflictModal}
        conflicts={pendingSyncConflictState?.conflicts || []}
        readyCount={pendingSyncConflictState?.readyCount || 0}
        isApplying={isSyncingQueue}
        onResolve={handleResolveConflicts}
        onCancel={() => {
          setShowConflictModal(false);
          setPendingSyncConflictState(null);
        }}
      />

      {/* Floating Offline & Pending Sync Indicator */}
      <OfflineSyncIndicator
        isOnline={isOnline}
        isChecking={isCheckingNetwork}
        queue={syncQueue}
        isSyncing={isSyncingQueue}
        onSyncNow={handleSyncNow}
        onCheckConnection={checkConnectionNow}
        onDiscardOperation={handleDiscardQueuedOp}
      />





      {/* Mobile Bottom Navigation Dock for instant 1-tap thumb navigation */}
      <div className={`sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t ${
        isDark ? 'bg-slate-950/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-xl'
      } backdrop-blur-lg px-2 py-1.5 flex items-center justify-around safe-area-bottom`}>
        {/* 1. Companies */}
        <button
          type="button"
          onClick={() => {
            setSelectedCompanyId(null);
            setActiveView('dashboard');
            setIsMobileMenuOpen(false);
          }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            activeView === 'dashboard' && !isMobileMenuOpen
              ? 'text-sky-400'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Companies</span>
        </button>

        {/* 2. Employees */}
        <button
          type="button"
          onClick={() => {
            setActiveView('members');
            setIsMobileMenuOpen(false);
          }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-bold transition-colors relative cursor-pointer ${
            activeView === 'members' && !isMobileMenuOpen
              ? 'text-sky-400'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Employees</span>
          {users.length > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 absolute top-1 right-3" />
          )}
        </button>

        {/* 3. Center Highlight: New Card */}
        <button
          type="button"
          onClick={() => {
            setEditingCard(null);
            setActiveView('editor');
            setIsMobileMenuOpen(false);
          }}
          className="flex flex-col items-center -mt-3 shrink-0 cursor-pointer"
          title="Create New Smart Card"
        >
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 via-sky-500 to-sky-600 p-0.5 shadow-lg shadow-sky-600/35 flex items-center justify-center text-white active:scale-95 transition-transform">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[9px] font-black text-sky-400 mt-0.5">New Card</span>
        </button>

        {/* 4. Inquiries */}
        <button
          type="button"
          onClick={() => {
            setActiveView('leads');
            setIsMobileMenuOpen(false);
          }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-bold transition-colors relative cursor-pointer ${
            activeView === 'leads' && !isMobileMenuOpen
              ? 'text-sky-400'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Inquiries</span>
          {leads.filter((l) => l.status === 'new').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 absolute top-0.5 right-3 animate-pulse" />
          )}
        </button>

        {/* 5. Mobile Menu Drawer Toggle */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer ${
            isMobileMenuOpen
              ? 'text-sky-400'
              : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>Menu</span>
        </button>
      </div>
    </div>
  );
}
