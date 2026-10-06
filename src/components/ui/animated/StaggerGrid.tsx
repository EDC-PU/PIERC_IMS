'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface StaggerGridProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerGrid({ children, className = '' }: StaggerGridProps) {
  return (
    <motion.div
      layout
      className={className}
      transition={{
        layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
      }}
    >
      <AnimatePresence mode="popLayout">{children}</AnimatePresence>
    </motion.div>
  );
}

interface StaggerItemProps {
  id: string | number;
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({ id, children, className = '' }: StaggerItemProps) {
  return (
    <motion.div
      key={id}
      layout
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      transition={{
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
