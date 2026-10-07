'use client';

import * as React from 'react';
import Link from 'next/link';
import { 
  Search, 
  Rocket, 
  ClipboardList, 
  Users, 
  Building2, 
  Calendar, 
  FolderSearch, 
  Sparkles,
  ArrowRight,
  RotateCcw,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  className?: string;
}

export interface RichEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  children?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

/**
 * Premium, rich empty state component with illuminated icon container,
 * structured typography, and clear action buttons.
 */
export function RichEmptyState({
  icon,
  title,
  description,
  badge,
  primaryAction,
  secondaryAction,
  children,
  className,
  compact = false,
}: RichEmptyStateProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center text-center rounded-3xl border-2 border-dashed border-slate-200/90 bg-white/60 backdrop-blur-xs transition-all duration-300",
        compact ? "py-10 px-6 space-y-4" : "py-16 sm:py-20 px-6 sm:px-12 space-y-5",
        className
      )}
    >
      {/* Decorative background glow */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="w-64 h-64 bg-primary/5 rounded-full blur-3xl opacity-70" />
      </div>

      {/* Elevated Icon Badge */}
      <div className="relative group">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-linear-to-b from-white to-slate-50 border border-slate-200/80 shadow-md flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:scale-105 group-hover:border-primary/30 transition-all duration-300">
          {icon || <FolderSearch className="h-8 w-8 sm:h-9 sm:w-9 text-slate-400" />}
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center text-primary shadow-xs">
          <Sparkles className="h-3 w-3" />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md space-y-2">
        {badge && (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200 font-mono text-[9px] uppercase px-2.5 py-0.5 mb-1 tracking-wider">
            {badge}
          </Badge>
        )}
        <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
          {description}
        </p>
      </div>

      {/* Children slots if extra controls/filters are needed */}
      {children && <div className="w-full max-w-sm pt-1">{children}</div>}

      {/* Action buttons */}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {primaryAction && (
            primaryAction.href ? (
              <Link
                href={primaryAction.href}
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-primary/20 bg-primary text-white hover:bg-primary/95 transition-all hover:-translate-y-0.5",
                  primaryAction.className
                )}
              >
                {primaryAction.icon || <Plus className="h-4 w-4" />}
                {primaryAction.label}
              </Link>
            ) : (
              <Button
                type="button"
                variant={primaryAction.variant || 'default'}
                onClick={primaryAction.onClick}
                className={cn(
                  "h-11 px-6 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all hover:-translate-y-0.5",
                  primaryAction.className
                )}
              >
                {primaryAction.icon || <Plus className="h-4 w-4" />}
                {primaryAction.label}
              </Button>
            )
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl font-bold text-xs border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all",
                  secondaryAction.className
                )}
              >
                {secondaryAction.icon}
                {secondaryAction.label}
              </Link>
            ) : (
              <Button
                type="button"
                variant={secondaryAction.variant || 'outline'}
                onClick={secondaryAction.onClick}
                className={cn(
                  "h-11 px-5 rounded-xl font-bold text-xs border-slate-200 text-slate-700 hover:bg-slate-50",
                  secondaryAction.className
                )}
              >
                {secondaryAction.icon}
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pre-configured empty state for search & filter zero-matches
 */
export function EmptySearchState({
  query,
  onReset,
  className,
}: {
  query?: string;
  onReset?: () => void;
  className?: string;
}) {
  return (
    <RichEmptyState
      icon={<Search className="h-8 w-8 text-slate-400" />}
      badge="No Matches Found"
      title="No matching records found"
      description={
        query
          ? `We couldn't find any results matching "${query}". Try adjusting your search query, clearing active filters, or checking for typos.`
          : "No records match the selected filters. Try broadening your criteria."
      }
      primaryAction={
        onReset
          ? {
              label: "Reset All Filters",
              onClick: onReset,
              icon: <RotateCcw className="h-3.5 w-3.5 mr-1" />,
              variant: "outline",
              className: "border-slate-300 text-slate-700 hover:bg-slate-50 shadow-none font-bold",
            }
          : undefined
      }
      className={className}
    />
  );
}

/**
 * Pre-configured empty state for evaluations pipeline
 */
export function EmptyEvaluationsState({
  isHistory = false,
  className,
}: {
  isHistory?: boolean;
  className?: string;
}) {
  return (
    <RichEmptyState
      icon={<ClipboardList className="h-8 w-8 text-primary" />}
      badge={isHistory ? "History Cleared" : "Queue Empty"}
      title={isHistory ? "No evaluation history logged yet" : "All evaluations caught up!"}
      description={
        isHistory
          ? "You haven't submitted any expert evaluations yet. Submissions evaluated in Phase 1 or Phase 2 will appear here automatically."
          : "There are currently no startup applications pending your evaluation. Check back soon or consult the committee schedule."
      }
      className={className}
    />
  );
}
