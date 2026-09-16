import React from 'react';

interface NeoCardProps {
  children: React.ReactNode;
  className?: string;
  bg?: string;
}

export const NeoCard: React.FC<NeoCardProps> = ({
  children,
  className = '',
  bg = 'bg-white',
}) => {
  return (
    <div
      className={`border-2.5 border-neoBlack shadow-[4px_4px_0px_0px_#111111] ${bg} p-5 rounded-none ${className}`}
    >
      {children}
    </div>
  );
};
