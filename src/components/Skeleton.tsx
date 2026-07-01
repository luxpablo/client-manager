'use client';

import React from 'react';

export function CardSkeleton() {
  return (
    <div className="bg-background border border-border rounded-2xl p-5 animate-pulse space-y-4">
      <div className="h-4 bg-muted rounded w-1/3" />
      <div className="h-8 bg-muted rounded w-1/2" />
      <div className="h-3 bg-muted rounded w-2/3" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-background border border-border rounded-2xl p-5 animate-pulse space-y-3">
      <div className="h-4 bg-muted rounded w-full mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-5 bg-muted rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatsGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
