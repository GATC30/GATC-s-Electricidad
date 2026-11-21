'use client';

import React, { useState } from 'react';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export interface TooltipProps {
  content: React.ReactNode;
  shortcut?: string;
  position?: TooltipPosition;
  children: React.ReactNode;
  delay?: number;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  shortcut,
  position = 'top',
  children,
  delay = 200
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const t = setTimeout(() => setIsVisible(true), delay);
    setTimer(t);
  };

  const handleMouseLeave = () => {
    if (timer) clearTimeout(timer);
    setIsVisible(false);
  };

  const positionClasses: Record<TooltipPosition, string> = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div
      className="relative inline-flex items-center justify-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}

      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-50 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-200 bg-slate-950/95 border border-slate-800 rounded-lg shadow-xl shadow-black/50 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 ${positionClasses[position]}`}
        >
          <span>{content}</span>
          {shortcut && (
            <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded shadow-xs">
              {shortcut}
            </kbd>
          )}
        </div>
      )}
    </div>
  );
};
