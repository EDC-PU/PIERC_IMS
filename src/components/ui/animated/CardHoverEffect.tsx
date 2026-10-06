'use client';

import React from 'react';
import { motion } from 'motion/react';

interface CardHoverEffectProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function CardHoverEffect({
  children,
  className = '',
  delay = 0,
}: CardHoverEffectProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{
        y: -4,
        transition: { duration: 0.2, ease: 'easeOut' },
      }}
      className={`transition-shadow hover:shadow-xl hover:shadow-slate-200/50 ${className}`}
    >
      {children}
    </motion.div>
  );
}
