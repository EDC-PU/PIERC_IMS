'use client';

import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number; // milliseconds
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedNumber({
  value,
  duration = 1200,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const startTimestamp = useRef<number | null>(null);
  const startValue = useRef(0);
  const targetValue = useRef(value);

  useEffect(() => {
    startValue.current = displayValue;
    targetValue.current = value;
    startTimestamp.current = null;

    let animationFrameId: number;

    const easeOutExpo = (t: number) => {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    };

    const step = (timestamp: number) => {
      if (!startTimestamp.current) startTimestamp.current = timestamp;
      const progress = Math.min((timestamp - startTimestamp.current) / duration, 1);
      const easedProgress = easeOutExpo(progress);

      const current = startValue.current + (targetValue.current - startValue.current) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(targetValue.current);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  const formatted = decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toLocaleString();

  return (
    <span className={`inline-block tabular-nums font-feature-settings-tnum ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
