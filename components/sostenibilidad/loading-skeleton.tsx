'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface LoadingSkeletonProps {
  rows: number;
}

export function LoadingSkeleton({ rows = 5 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}
