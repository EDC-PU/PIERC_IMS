'use client';

import React from 'react';
import { AnimatedNumber } from './AnimatedNumber';

interface AnimatedProgressRingProps {
  progress?: number; // 0 to 100
  value?: number; // alias for progress
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
  color?: string;
}

export function AnimatedProgressRing({
  progress,
  value,
  size = 110,
  strokeWidth = 9,
  className = '',
  label = '',
  color = '#d40924',
}: AnimatedProgressRingProps) {
  const actualProgress = value !== undefined ? value : (progress ?? 0);
  const normalizedRadius = (size - strokeWidth * 2) / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const clampedProgress = Math.min(Math.max(actualProgress, 0), 100);
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        height={size}
        width={size}
        className="transform -rotate-90 transition-all duration-700 ease-out"
      >
        {/* Track circle */}
        <circle
          stroke="currentColor"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset: 0 }}
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
          className="text-slate-100"
        />
        {/* Progress circle */}
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{
            strokeDashoffset,
            transition: 'stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-black text-slate-900 tracking-tight flex items-baseline">
          <AnimatedNumber value={clampedProgress} duration={1200} />
          <span className="text-xs font-bold text-slate-500 ml-0.5">%</span>
        </span>
        {label && (
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 mt-0.5">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
