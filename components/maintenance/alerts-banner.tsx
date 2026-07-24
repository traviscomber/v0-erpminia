'use client';

import useSWR from 'swr';
import { AlertCircle, AlertTriangle, Bell, ChevronDown, ChevronUp, Package, Wrench } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

type MaintenanceAlert = {
  id: string;
  level: 'critical' | 'warning' | 'info';
  type: string;
  title: string;
  message: string;
  value: number;
  threshold: number;
  assetCode?: string;
  assetName?: string;
  workOrderNumber?: string;
  createdAt: string;
};

type AlertsSummary = {
  total: number;
  critical: number;
  warning: number;
  availabilityPct: number;
  hasAvailabilityAlert: boolean;
};

type AlertsResponse = {
  alerts: MaintenanceAlert[];
  summary: AlertsSummary;
};

function AlertIcon({ level }: { level: MaintenanceAlert['level'] }) {
  if (level === 'critical') return <AlertCircle className="h-4 w-4" />;
  if (level === 'warning') return <AlertTriangle className="h-4 w-4" />;
  return <Bell className="h-4 w-4" />;
}

function alertTypeIcon(type: string) {
  if (type === 'low_stock') return <Package className="h-3.5 w-3.5" />;
  if (type.includes('work_order')) return <Wrench className="h-3.5 w-3.5" />;
  return null;
}

const levelClass: Record<string, string> = {
  critical: 'border-destructive/50 bg-destructive/5 text-destructive [&>svg]:text-destructive',
  warning: 'border-amber-500/50 bg-amber-500/5 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-500',
  info: 'border-blue-500/40 bg-blue-500/5 text-blue-700 dark:text-blue-400',
};

const badgeVariant: Record<string, string> = {
  critical: 'destructive',
  warning: 'secondary',
};

export function AlertsBanner() {
  const [expanded, setExpanded] = useState(false);
  const { data, isLoading } = useSWR<AlertsResponse>('/api/maintenance/alerts', fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: false,
  });

  if (isLoading) return null;

  const alerts = data?.alerts ?? [];
  const summary = data?.summary;

  if (!summary || alerts.length === 0) return null;

  const visibleAlerts = expanded ? alerts : alerts.slice(0, 3);

  return (
    <div className="space-y-2">
      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {summary.total} alerta{summary.total !== 1 ? 's' : ''} activa{summary.total !== 1 ? 's' : ''}
          </span>
          {summary.critical > 0 && (
            <Badge variant="destructive" className="text-xs">
              {summary.critical} critica{summary.critical !== 1 ? 's' : ''}
            </Badge>
          )}
          {summary.warning > 0 && (
            <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs">
              {summary.warning} aviso{summary.warning !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {alerts.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                Mostrar menos <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Ver todas ({alerts.length}) <ChevronDown className="h-3 w-3" />
              </>
            )}
          </Button>
        )}
      </div>

      {/* Alert rows */}
      {visibleAlerts.map((alert) => (
        <Alert key={alert.id} className={levelClass[alert.level] ?? ''}>
          <AlertIcon level={alert.level} />
          <AlertTitle className="flex items-center gap-2 text-sm font-semibold">
            {alert.title}
            {alertTypeIcon(alert.type) && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-normal opacity-70">
                {alertTypeIcon(alert.type)}
                {alert.type === 'availability' && `${alert.value}%`}
                {alert.type === 'low_stock' && `${alert.value} uds`}
                {alert.type === 'overdue_work_order' && `${alert.value}d`}
              </span>
            )}
            {alert.workOrderNumber && (
              <Badge variant="outline" className="ml-auto font-mono text-xs">
                {alert.workOrderNumber}
              </Badge>
            )}
          </AlertTitle>
          <AlertDescription className="mt-1 text-sm">{alert.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
