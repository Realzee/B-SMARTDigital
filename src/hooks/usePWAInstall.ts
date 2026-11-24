import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __bsmartDeferredInstallPrompt?: BeforeInstallPromptEvent | null;
    __bsmartInstallListenersBound?: boolean;
  }
}

const PROMPT_EVENT_NAME = 'bsmart-pwa-prompt-changed';
const INSTALLED_EVENT_NAME = 'bsmart-pwa-installed';

function checkStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function bindGlobalInstallListeners() {
  if (typeof window === 'undefined' || window.__bsmartInstallListenersBound) return;
  window.__bsmartInstallListenersBound = true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    window.__bsmartDeferredInstallPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent(PROMPT_EVENT_NAME));
  });

  window.addEventListener('appinstalled', () => {
    window.__bsmartDeferredInstallPrompt = null;
    window.dispatchEvent(new CustomEvent(INSTALLED_EVENT_NAME));
  });
}

bindGlobalInstallListeners();

export type InstallPlatform = 'desktop' | 'android' | 'ios';

function detectPlatform(): InstallPlatform {
  if (typeof window === 'undefined') return 'desktop';
  const ua = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() =>
    typeof window !== 'undefined' ? window.__bsmartDeferredInstallPrompt || null : null
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => checkStandalone());
  const [platform, setPlatform] = useState<InstallPlatform>(() => detectPlatform());

  useEffect(() => {
    bindGlobalInstallListeners();
    setIsInstalled(checkStandalone());
    setPlatform(detectPlatform());
    if (window.__bsmartDeferredInstallPrompt) {
      setDeferredPrompt(window.__bsmartDeferredInstallPrompt);
    }

    const syncPrompt = () => {
      setDeferredPrompt(window.__bsmartDeferredInstallPrompt || null);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const standaloneMq = window.matchMedia('(display-mode: standalone)');
    const wcoMq = window.matchMedia('(display-mode: window-controls-overlay)');
    const handleDisplayModeChange = () => setIsInstalled(checkStandalone());

    window.addEventListener(PROMPT_EVENT_NAME, syncPrompt);
    window.addEventListener(INSTALLED_EVENT_NAME, handleInstalled);
    standaloneMq.addEventListener?.('change', handleDisplayModeChange);
    wcoMq.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener(PROMPT_EVENT_NAME, syncPrompt);
      window.removeEventListener(INSTALLED_EVENT_NAME, handleInstalled);
      standaloneMq.removeEventListener?.('change', handleDisplayModeChange);
      wcoMq.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const install = async () => {
    const activePrompt = deferredPrompt || window.__bsmartDeferredInstallPrompt;
    if (!activePrompt) return false;
    try {
      await activePrompt.prompt();
      const { outcome } = await activePrompt.userChoice;
      if (outcome === 'accepted') {
        window.__bsmartDeferredInstallPrompt = null;
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    platform,
    install,
  };
}
