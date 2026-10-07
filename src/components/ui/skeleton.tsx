'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.ComponentProps<"div"> {
  variant?: "shimmer" | "pulse";
}

function Skeleton({ className, variant = "shimmer", ...props }: SkeletonProps) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-xl",
        variant === "shimmer"
          ? "animate-shimmer"
          : "animate-pulse bg-slate-200/80 dark:bg-slate-800",
        className
      )}
      {...props}
    />
  );
}

/**
 * Metric/KPI card skeleton grid
 */
function StatsGridSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-4"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-28 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-2xl" />
          </div>
          <div className="space-y-2 pt-1">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-3 w-32 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Single Card item skeleton (for pipelines, startups, programmes)
 */
function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-100 bg-white p-6 shadow-xs space-y-5",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-6 w-3/4 rounded-xl" />
        <Skeleton className="h-4 w-1/2 rounded-lg" />
      </div>
      <div className="space-y-2 pt-2 border-t border-slate-50">
        <Skeleton className="h-3.5 w-full rounded-md" />
        <Skeleton className="h-3.5 w-5/6 rounded-md" />
      </div>
      <div className="pt-2 flex items-center justify-between">
        <Skeleton className="h-8 w-24 rounded-xl" />
        <Skeleton className="h-8 w-28 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Multi-Card Grid Skeleton
 */
function CardGridSkeleton({
  count = 6,
  columns = 3,
  className,
}: {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const colClass =
    columns === 2
      ? "grid-cols-1 md:grid-cols-2"
      : columns === 4
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={cn("grid gap-6", colClass, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Table Skeleton with realistic rows and headers
 */
function TableSkeleton({
  rows = 5,
  columns = 5,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("rounded-3xl border border-slate-100 bg-white overflow-hidden shadow-xs", className)}>
      {/* Table Header Bar */}
      <div className="bg-slate-50/70 border-b border-slate-100 px-6 py-4 flex items-center justify-between gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 w-24 rounded-md" />
        ))}
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-100/80">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="px-6 py-5 flex items-center justify-between gap-4 transition-colors hover:bg-slate-50/30"
          >
            {/* Column 1: Avatar + 2 lines of text */}
            <div className="flex items-center gap-3.5 min-w-[200px] flex-1">
              <Skeleton className="h-10 w-10 rounded-2xl shrink-0" />
              <div className="space-y-1.5 flex-1 max-w-xs">
                <Skeleton className="h-4 w-3/4 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
              </div>
            </div>

            {/* Column 2: Badge or Short Tag */}
            <div className="hidden sm:block flex-1 max-w-[140px]">
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            {/* Column 3: Secondary Text */}
            <div className="hidden md:block flex-1 max-w-[160px]">
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>

            {/* Column 4: Score / Metric */}
            <div className="hidden lg:block flex-1 max-w-[120px]">
              <Skeleton className="h-5 w-14 rounded-md" />
            </div>

            {/* Column 5: Action Button */}
            <div className="flex items-center justify-end gap-2 shrink-0">
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Detailed View Skeleton (e.g. for Evaluate, Application Details, Profile)
 */
function DetailViewSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-8 animate-in fade-in duration-500", className)}>
      {/* Back button + Header toolbar */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32 rounded-xl" />
        <Skeleton className="h-9 w-40 rounded-xl" />
      </div>

      {/* Grid: Main Panel (8 cols) + Sticky Score/Action Panel (4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <div className="xl:col-span-8 space-y-6">
          <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-6">
            <div className="flex justify-between items-start border-b border-slate-50 pb-6">
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-8 w-2/3 rounded-xl" />
                <Skeleton className="h-4 w-1/3 rounded-md" />
              </div>
              <Skeleton className="h-16 w-32 rounded-2xl" />
            </div>
            <div className="space-y-4 pt-2">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-4 w-36 rounded-md" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <div className="p-8 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-6">
            <Skeleton className="h-6 w-1/2 mx-auto rounded-lg" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export {
  Skeleton,
  StatsGridSkeleton,
  CardSkeleton,
  CardGridSkeleton,
  TableSkeleton,
  DetailViewSkeleton
};
