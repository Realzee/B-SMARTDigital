import { getRemoteServerUrl, isNativeRuntime } from './nativeRuntime';

/**
 * Utility to generate universal, working card URLs across:
 * - cPanel subpath deployment (e.g. https://b-smart-online.co.za/app/card/:slug)
 * - Native Desktop (.exe) / Android (.apk) offline bundles
 * - Domain root deployments
 * - AI Studio preview environments
 */

export function getAppBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://b-smart-online.co.za/app';
  }

  if (isNativeRuntime()) {
    return getRemoteServerUrl();
  }

  const origin = window.location.origin;
  const pathname = window.location.pathname || '';
  const hostname = window.location.hostname || '';

  // If already under /app subpath
  if (pathname === '/app' || pathname.startsWith('/app/')) {
    return `${origin}/app`;
  }

  // If running on production b-smart-online.co.za domain where Passenger is mounted on /app
  if (hostname.includes('b-smart-online.co.za')) {
    return `${origin}/app`;
  }

  return origin;
}

export function getCardShareUrl(slug: string): string {
  const base = getAppBaseUrl();
  const cleanSlug = encodeURIComponent(slug.trim());
  return `${base}/card/${cleanSlug}`;
}

export function getCardDisplayPath(slug: string): string {
  if (typeof window !== 'undefined') {
    if (isNativeRuntime()) {
      const remoteBase = getRemoteServerUrl();
      return remoteBase.endsWith('/app') ? `/app/card/${slug}` : `/card/${slug}`;
    }
    const pathname = window.location.pathname || '';
    const hostname = window.location.hostname || '';
    if (pathname === '/app' || pathname.startsWith('/app/') || hostname.includes('b-smart-online.co.za')) {
      return `/app/card/${slug}`;
    }
  }
  return `/card/${slug}`;
}
