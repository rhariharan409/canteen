import React from 'react';

interface NeoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'dark' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const NeoButton: React.FC<NeoButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const baseStyles =
    'font-display uppercase tracking-wider font-extrabold border-2 border-neoBlack transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-neoPrimary text-neoBlack shadow-[3px_3px_0px_0px_#111111] hover:shadow-[4px_4px_0px_0px_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#111111]',
    secondary: 'bg-neoSecondary text-white shadow-[3px_3px_0px_0px_#111111] hover:shadow-[4px_4px_0px_0px_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#111111]',
    success: 'bg-neoSuccess text-neoBlack shadow-[3px_3px_0px_0px_#111111] hover:shadow-[4px_4px_0px_0px_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#111111]',
    danger: 'bg-neoDanger text-white shadow-[3px_3px_0px_0px_#111111] hover:shadow-[4px_4px_0px_0px_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#111111]',
    dark: 'bg-neoBlack text-white shadow-[3px_3px_0px_0px_#D9FF00] hover:shadow-[4px_4px_0px_0px_#D9FF00] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#D9FF00]',
    outline: 'bg-white text-neoBlack shadow-[3px_3px_0px_0px_#111111] hover:bg-slate-50 hover:shadow-[4px_4px_0px_0px_#111111] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px_#111111]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
