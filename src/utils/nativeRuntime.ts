const REMOTE_SERVER_URL_KEY = 'bsmart_remote_server_url';
const DEFAULT_PRODUCTION_SERVER_URL = 'https://b-smart-online.co.za/app';

export function isElectronRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).bsmartElectron?.isElectron ||
      window.location.protocol === 'file:' ||
      (typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron'))
  );
}

export function isCapacitorRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  return Boolean(
    (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'ionic:'
  );
}

export function isNativeRuntime(): boolean {
  return isElectronRuntime() || isCapacitorRuntime();
}

export function getNativePlatformLabel(): 'Windows / Desktop App' | 'Android App' | 'Web' {
  if (isElectronRuntime()) return 'Windows / Desktop App';
  if (isCapacitorRuntime()) return 'Android App';
  return 'Web';
}

export function normalizeRemoteServerUrl(raw: string): string | null {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    let cleanPath = parsed.pathname.replace(/\/+$/, '');
    if (cleanPath.endsWith('/api')) {
      cleanPath = cleanPath.slice(0, -4);
    }
    return `${parsed.origin}${cleanPath}`;
  } catch {
    return null;
  }
}

export function getDefaultRemoteServerUrl(): string {
  const envUrl =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_REMOTE_API_URL) || '';
  return normalizeRemoteServerUrl(envUrl) || DEFAULT_PRODUCTION_SERVER_URL;
}

export function getRemoteServerUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem(REMOTE_SERVER_URL_KEY);
      const normalized = saved ? normalizeRemoteServerUrl(saved) : null;
      if (normalized) return normalized;
    } catch {
      // Ignore storage access errors
    }
  }
  return getDefaultRemoteServerUrl();
}

export function setRemoteServerUrl(rawUrl: string): string | null {
  const normalized = normalizeRemoteServerUrl(rawUrl);
  if (!normalized) return null;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(REMOTE_SERVER_URL_KEY, normalized);
      window.dispatchEvent(new CustomEvent('bsmart-remote-url-changed', { detail: { url: normalized } }));
    } catch {
      // Ignore storage access errors
    }
  }
  return normalized;
}

export function resetRemoteServerUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(REMOTE_SERVER_URL_KEY);
      window.dispatchEvent(
        new CustomEvent('bsmart-remote-url-changed', { detail: { url: getDefaultRemoteServerUrl() } })
      );
    } catch {
      // Ignore storage access errors
    }
  }
  return getDefaultRemoteServerUrl();
}

/**
 * Resolves relative server upload paths (/uploads/... or /app/uploads/...) to the
 * configured remote server origin when running inside an offline .exe or .apk bundle.
 */
export function resolveNativeAssetUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  if (!isNativeRuntime()) return rawUrl;
  if (
    rawUrl.startsWith('data:') ||
    rawUrl.startsWith('blob:') ||
    rawUrl.startsWith('http://') ||
    rawUrl.startsWith('https://')
  ) {
    return rawUrl;
  }

  const remoteBase = getRemoteServerUrl();
  try {
    const parsedRemote = new URL(remoteBase);
    if (rawUrl.startsWith('/app/uploads/')) {
      return `${parsedRemote.origin}${rawUrl}`;
    }
    if (rawUrl.startsWith('/uploads/')) {
      return `${remoteBase}${rawUrl}`;
    }
  } catch {
    // Fall back to rawUrl
  }
  return rawUrl;
}
