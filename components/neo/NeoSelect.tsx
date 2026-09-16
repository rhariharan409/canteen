import React from 'react';

interface NeoSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Array<{ value: string; label: string }>;
}

export const NeoSelect: React.FC<NeoSelectProps> = ({
  label,
  options,
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
      <select
        className={`w-full px-3.5 py-2.5 bg-white border-2 border-neoBlack shadow-[3px_3px_0px_0px_#111111] font-body text-sm font-bold text-neoBlack focus:outline-none focus:bg-amber-50 transition-all ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
