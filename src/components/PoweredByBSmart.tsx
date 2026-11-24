import React from 'react';

interface PoweredByBSmartProps {
  className?: string;
  onNavigateHome?: () => void;
}

export const PoweredByBSmart: React.FC<PoweredByBSmartProps> = ({
  className = '',
  onNavigateHome,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      try {
        window.history.pushState({}, '', '/');
      } catch {
        // ignore
      }
      window.location.href = '/';
    }
  };

  return (
    <div className={`py-3.5 px-4 text-center border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md select-none ${className}`}>
      <a
        href="/"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors group cursor-pointer"
        title="Powered by B-SMART™ - South Africa's Premier Smart Business Card Platform"
      >
        <span className="text-[11px] text-slate-400 font-medium">Powered by</span>
        <span className="font-black text-amber-400 group-hover:text-amber-300 underline underline-offset-2 tracking-wider">
          B-SMART™
        </span>
        <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
          • The Business Card That Consistantly Works For Your Business
        </span>
      </a>
    </div>
  );
};
