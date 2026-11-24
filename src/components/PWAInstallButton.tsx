import React, { useState } from 'react';
import {
  Smartphone,
  Monitor,
  Download,
  Share,
  PlusSquare,
  X,
  Check,
  WifiOff,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { isNativeRuntime } from '../utils/nativeRuntime';
import { BSmartLogo } from './BSmartLogo';

interface PWAInstallButtonProps {
  variant?: 'header' | 'drawer' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, platform, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already running in standalone PWA mode or native .exe/.apk wrapper, suppress browser install button
  if (isInstalled || isNativeRuntime()) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 3000);
        return;
      }
    }
    setShowGuideModal(true);
  };

  const buttonContent = (
    <>
      {variant === 'header' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`min-h-[38px] px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-600/25 transition-all cursor-pointer whitespace-nowrap shrink-0 ${className}`}
          title="Install B-SMART™ App on Desktop or Mobile for offline access"
        >
          {installSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>Installed</span>
            </>
          ) : (
            <>
              {platform === 'desktop' ? (
                <Monitor className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Smartphone className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>Install App</span>
            </>
          )}
        </button>
      )}

      {variant === 'drawer' && (
        <button
          type="button"
          onClick={handleInstallClick}
          className={`w-full min-h-[48px] p-3 rounded-xl text-left flex items-center justify-between gap-2 transition-all bg-gradient-to-r from-blue-600/15 via-sky-600/10 to-transparent border border-sky-500/30 text-white cursor-pointer ${className}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/30 shrink-0">
              {platform === 'desktop' ? <Monitor className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black flex items-center gap-1.5 text-white">
                <span className="truncate">Install Local App</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] bg-sky-500/25 text-sky-300 font-extrabold uppercase shrink-0">
                  Offline Ready
                </span>
              </div>
              <div className="text-[10px] text-sky-200/80 truncate">
                Works offline on Desktop, iOS &amp; Android
              </div>
            </div>
          </div>
          <Download className="w-4 h-4 text-sky-400 shrink-0" />
        </button>
      )}

      {variant === 'banner' && (
        <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-900/60 via-sky-900/40 to-slate-900/80 border border-sky-500/30 flex items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-600/30 shrink-0">
              {platform === 'desktop' ? <Monitor className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-white">Install B-SMART™ on Your Device</div>
              <p className="text-[11px] text-sky-200/80">
                Work offline anytime across cards, companies, enquiries &amp; templates, then sync when reconnected.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold whitespace-nowrap shrink-0 shadow-md transition-all cursor-pointer"
          >
            Install Now
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {buttonContent}

      {/* Desktop & Mobile Install Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <BSmartLogo size="xs" showText={false} forceDark />
                <h3 className="text-sm font-black text-white">Install B-SMART™ Locally</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close install instructions"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p className="text-slate-300 leading-relaxed">
                Install <strong>B-SMART™</strong> as a standalone desktop or mobile app so you can keep working without internet and sync queued changes later.
              </p>

              {isIOS ? (
                <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                    iPhone / iPad (Safari)
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      Tap the <strong className="text-sky-400">Share</strong> button{' '}
                      <Share className="w-3.5 h-3.5 inline-block text-sky-400 mx-0.5" /> in Safari&apos;s toolbar.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      Scroll down and tap{' '}
                      <strong className="text-sky-400">Add to Home Screen</strong>{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline-block text-sky-400 mx-0.5" />.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                      3
                    </div>
                    <div>
                      Tap <strong className="text-sky-400">Add</strong> to save the standalone app icon.
                    </div>
                  </div>
                </div>
              ) : isAndroid ? (
                <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                    Android (Chrome / Edge)
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      Open the browser menu <strong className="text-sky-400">(⋮)</strong> in the top corner.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      Tap <strong className="text-sky-400">Install app</strong> or{' '}
                      <strong className="text-sky-400">Add to Home screen</strong>.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
                    Desktop (Windows / macOS / Linux)
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      In <strong>Chrome</strong> or <strong>Edge</strong>, click the{' '}
                      <strong className="text-sky-400">Install icon</strong> inside the right side of the address bar.
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      Or open browser menu <strong className="text-sky-400">(⋮)</strong> →{' '}
                      <strong className="text-sky-400">Cast, save, and share</strong> →{' '}
                      <strong>Install B-SMART™</strong>.
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-300">
                <WifiOff className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  Once installed, all cards, companies, enquiries, and templates remain editable offline and wait for your tap on Sync Now when online.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
