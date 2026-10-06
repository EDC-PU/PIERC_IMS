'use client';

import React from 'react';

interface LivePulseBadgeProps {
  label: string;
  variant?: 'emerald' | 'rose' | 'amber' | 'blue' | 'primary' | 'success' | 'warning' | 'danger' | 'slate' | 'neutral';
  className?: string;
  subtext?: string;
  pulse?: boolean;
}

export function LivePulseBadge({
  label,
  variant = 'emerald',
  className = '',
  subtext,
  pulse = true,
}: LivePulseBadgeProps) {
  const normalizedVariant = 
    variant === 'primary' ? 'blue' :
    variant === 'success' ? 'emerald' :
    variant === 'warning' ? 'amber' :
    variant === 'danger' ? 'rose' :
    variant === 'neutral' ? 'slate' :
    variant;

  const colorMap = {
    emerald: {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      dot: 'bg-emerald-500',
      ping: 'bg-emerald-400',
    },
    rose: {
      bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
      dot: 'bg-rose-500',
      ping: 'bg-rose-400',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
      dot: 'bg-amber-500',
      ping: 'bg-amber-400',
    },
    blue: {
      bg: 'bg-blue-50 text-blue-700 border-blue-200/80',
      dot: 'bg-blue-500',
      ping: 'bg-blue-400',
    },
    slate: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200/80',
      dot: 'bg-slate-500',
      ping: 'bg-slate-400',
    },
  };

  const scheme = colorMap[normalizedVariant] || colorMap.slate;

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold transition-all shadow-xs ${scheme.bg} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${scheme.ping}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${scheme.dot}`}
        />
      </span>
      <span>{label}</span>
      {subtext && <span className="opacity-60 font-medium">({subtext})</span>}
    </span>
  );
}
