'use client';

import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: { direction: 'up' | 'down'; value: number };
  isLoading?: boolean;
}

const DashboardCard = memo(function DashboardCard({
  title,
  value,
  description,
  icon,
  trend,
  isLoading,
}: DashboardCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {isLoading ? (
          <div className="h-4 w-4 animate-pulse rounded bg-muted" />
        ) : (
          <div className="text-muted-foreground">{icon}</div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{isLoading ? '-' : value}</div>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          {trend ? (
            <>
              {trend.direction === 'up' ? (
                <TrendingUp className="h-3 w-3 text-secondary" />
              ) : (
                <TrendingDown className="h-3 w-3 text-destructive" />
              )}
              <span>{trend.value}% vs periodo anterior</span>
            </>
          ) : (
            <p>{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

interface DashboardCardsProps {
  data: Array<{
    title: string;
    value: string | number;
    description: string;
    icon: React.ReactNode;
    trend?: { direction: 'up' | 'down'; value: number };
  }>;
  isLoading?: boolean;
}

export const OptimizedDashboardCards = memo(function OptimizedDashboardCards({
  data,
  isLoading,
}: DashboardCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {data.map((card, index) => (
        <DashboardCard key={`${card.title}-${index}`} {...card} isLoading={isLoading} />
      ))}
    </div>
  );
});
