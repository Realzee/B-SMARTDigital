import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export const BSMART_OFFICIAL_LOGO = '/assets/aistudio/IMG-20261030-WA0019_c157f32a.jpg';

interface BSmartLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero';
  showText?: boolean;
  subtitle?: string;
  className?: string;
  variant?: 'badge' | 'full' | 'compact';
  forceDark?: boolean;
}

export const BSmartLogo: React.FC<BSmartLogoProps> = ({
  size = 'md',
  showText = true,
  subtitle = 'Digital Business Partner',
  className = '',
  variant = 'badge',
  forceDark = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const { theme } = useTheme();
  const isDark = forceDark || theme === 'dark';

  // Dimensions for icon box - calibrated to 3:2 aspect ratio so the official logo never cuts off
  const dimensions = {
    xs: { box: 'h-6 w-9', fontTitle: 'text-xs', fontSub: 'text-[8px]' },
    sm: { box: 'h-8 w-12', fontTitle: 'text-sm', fontSub: 'text-[9px]' },
    md: { box: 'h-10 w-[60px]', fontTitle: 'text-sm sm:text-base font-black', fontSub: 'text-[9px] sm:text-[10px]' },
    lg: { box: 'h-14 w-[84px]', fontTitle: 'text-lg sm:text-xl font-black', fontSub: 'text-xs' },
    xl: { box: 'h-20 w-[120px]', fontTitle: 'text-2xl sm:text-3xl font-black', fontSub: 'text-sm' },
    '2xl': { box: 'h-28 w-[168px]', fontTitle: 'text-3xl font-black', fontSub: 'text-base' },
    hero: { box: 'h-36 w-[216px]', fontTitle: 'text-4xl font-black', fontSub: 'text-lg' },
  }[size];

  // Full-width emblem display (e.g. for banners, header spotlights)
  if (variant === 'full') {
    return (
      <div className={`inline-flex flex-col items-center select-none ${className}`}>
        <div className="relative group cursor-pointer transition-transform hover:scale-[1.02]">
          <div className="absolute -inset-1 bg-gradient-to-r from-sky-500/30 via-blue-600/30 to-amber-500/30 rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition duration-300" />
          <div className="relative rounded-xl overflow-hidden border border-sky-400/40 bg-slate-950 p-1.5 shadow-2xl flex items-center justify-center">
            <img
              src={BSMART_OFFICIAL_LOGO}
              alt="B-SMART™ Digital Business Partner"
              className="max-h-16 sm:max-h-20 w-auto object-contain rounded-lg drop-shadow-[0_10px_20px_rgba(56,189,248,0.35)]"
              onError={() => setImageError(true)}
            />
          </div>
        </div>
        {subtitle && (
          <p className="text-[10px] sm:text-xs text-sky-600 dark:text-sky-300 font-bold tracking-widest uppercase mt-1.5 drop-shadow-xs">
            {subtitle}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 select-none shrink-0 ${className}`}>
      {/* Official 3D Emblem Badge */}
      <div
        className={`${dimensions.box} relative shrink-0 rounded-xl bg-gradient-to-tr from-blue-700 via-sky-600 to-amber-500 p-0.5 shadow-lg shadow-sky-600/20 group-hover:shadow-sky-500/40 transition-all`}
      >
        <div className="w-full h-full rounded-[10px] bg-slate-950 flex items-center justify-center overflow-hidden p-0.5 relative">
          {!imageError ? (
            <img
              src={BSMART_OFFICIAL_LOGO}
              alt="B-SMART™ Logo"
              className="w-full h-full object-contain rounded-[8px] hover:scale-105 transition-transform duration-300 drop-shadow"
              onError={() => setImageError(true)}
            />
          ) : (
            /* Graceful SVG fallback in case of asset fetch interruption */
            <div className="w-full h-full bg-gradient-to-br from-slate-900 to-sky-950 flex items-center justify-center font-black text-sky-400 text-xs">
              B
            </div>
          )}
        </div>
      </div>

      {/* Typography: B-SMART™ with official signature */}
      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-none flex-nowrap">
            <span className={`${dimensions.fontTitle} tracking-tight flex items-center whitespace-nowrap`}>
              <span className="text-sky-500 dark:text-sky-400 font-extrabold">B</span>
              <span className="text-slate-400 font-bold">-</span>
              <span className={`${isDark ? 'text-white' : 'text-slate-900'} font-black`}>
                SMART
              </span>
              <span className="text-[10px] text-amber-500 dark:text-amber-400 font-black ml-0.5 align-super">™</span>
            </span>
            <span className="text-[8px] sm:text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xs tracking-wider shrink-0">
              ONLINE
            </span>
          </div>
          {subtitle && (
            <p className={`${dimensions.fontSub} ${isDark ? 'text-sky-300/90' : 'text-sky-700'} font-semibold tracking-wide mt-0.5 truncate max-w-[140px] sm:max-w-[200px]`}>
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
