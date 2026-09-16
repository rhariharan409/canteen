import React from 'react';
import { Utensils } from 'lucide-react';

interface NeoEmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const NeoEmptyState: React.FC<NeoEmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="border-2.5 border-neoBlack shadow-[4px_4px_0px_0px_#111111] bg-white p-8 text-center space-y-3">
      <div className="w-12 h-12 bg-neoPrimary border-2 border-neoBlack shadow-[2px_2px_0px_0px_#111111] flex items-center justify-center mx-auto text-neoBlack font-black">
        <Utensils className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-black uppercase text-neoBlack font-display tracking-tight">
        {title}
      </h3>
      {description && <p className="text-xs font-bold text-slate-600 max-w-xs mx-auto">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-2 px-4 py-2 bg-neoBlack text-neoPrimary border-2 border-neoBlack font-black text-xs uppercase shadow-[3px_3px_0px_0px_#D9FF00] hover:translate-x-[-1px] hover:translate-y-[-1px]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
