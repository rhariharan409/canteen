import React from 'react';

interface NeoInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const NeoInput: React.FC<NeoInputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-black uppercase text-neoBlack mb-1 tracking-wider">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3.5 py-2.5 bg-white border-2 border-neoBlack shadow-[3px_3px_0px_0px_#111111] font-body text-sm text-neoBlack focus:outline-none focus:bg-amber-50 focus:shadow-[4px_4px_0px_0px_#111111] transition-all ${className}`}
        {...props}
      />
      {error && <p className="text-xs font-bold text-neoDanger mt-1">{error}</p>}
    </div>
  );
};
