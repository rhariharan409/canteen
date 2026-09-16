import React from 'react';

interface NeoStatProps {
  label: string;
  value: string | number;
  subtext?: string;
  accentBg?: string;
}

export const NeoStat: React.FC<NeoStatProps> = ({
  label,
  value,
  subtext,
  accentBg = 'bg-white',
}) => {
  return (
    <div
      className={`border-2.5 border-neoBlack shadow-[4px_4px_0px_0px_#111111] p-4 ${accentBg}`}
    >
      <div className="text-[11px] font-black uppercase text-slate-700 tracking-wider mb-1">
        {label}
      </div>
      <div className="text-3xl font-black font-display text-neoBlack tracking-tight">
        {value}
      </div>
      {subtext && <div className="text-[11px] font-bold text-slate-600 mt-1">{subtext}</div>}
    </div>
  );
};
