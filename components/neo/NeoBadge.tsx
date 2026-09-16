import React from 'react';

interface NeoBadgeProps {
  variant?: 'live' | 'paused' | 'preparing' | 'ready' | 'collected' | 'soldout' | 'dark' | 'outline';
  children: React.ReactNode;
  className?: string;
}

export const NeoBadge: React.FC<NeoBadgeProps> = ({
  variant = 'live',
  children,
  className = '',
}) => {
  const base = 'inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider border-2 border-neoBlack shadow-[2px_2px_0px_0px_#111111]';

  const styles = {
    live: 'bg-neoSuccess text-neoBlack',
    paused: 'bg-neoSecondary text-white',
    preparing: 'bg-amber-300 text-neoBlack',
    ready: 'bg-neoPrimary text-neoBlack animate-pulse',
    collected: 'bg-slate-200 text-slate-700',
    soldout: 'bg-neoDanger text-white',
    dark: 'bg-neoBlack text-white border-neoPrimary shadow-[2px_2px_0px_0px_#D9FF00]',
    outline: 'bg-white text-neoBlack',
  };

  return <span className={`${base} ${styles[variant]} ${className}`}>{children}</span>;
};
