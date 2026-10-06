'use client';

import React from 'react';
import { motion } from 'motion/react';

export interface TabOption {
  id: string;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

interface AnimatedPillTabsProps {
  options?: (TabOption | string)[];
  tabs?: (TabOption | string)[];
  activeId?: string;
  activeTab?: string;
  onChange: (id: string) => void;
  className?: string;
  pillColor?: string; // background of active pill
  layoutId?: string;
}

export function AnimatedPillTabs({
  options,
  tabs,
  activeId,
  activeTab,
  onChange,
  className = '',
  layoutId = 'activeTabPill',
}: AnimatedPillTabsProps) {
  const rawList = tabs || options || [];
  const normalizedTabs: TabOption[] = rawList.map((item) =>
    typeof item === 'string' ? { id: item, label: item } : item
  );
  const currentActive = activeTab !== undefined ? activeTab : (activeId || '');

  return (
    <div
      className={`inline-flex items-center p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/60 shadow-inner ${className}`}
    >
      {normalizedTabs.map((tab) => {
        const isActive = currentActive === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            type="button"
            className={`relative px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer select-none flex items-center gap-2 ${
              isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-[#d40924] rounded-xl shadow-md shadow-red-500/20"
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 32,
                }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {tab.label}
              {typeof tab.count === 'number' && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-full transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
