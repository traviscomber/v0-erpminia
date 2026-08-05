'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, CheckCircle2, Wrench, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

type AvailabilitySummary = {
  summary: {
    totalAssets: number;
    operational: number;
    maintenance: number;
    critical: number;
    availabilityPercentage: number;
    healthStatus: 'excellent' | 'good' | 'warning' | 'critical';
  };
  timestamp: string;
};

type AvailabilityByZone = {
  byZone: Array<{
    zone: string;
    assets: Array<{
      id: string;
      assetCode: string;
      assetName: string;
      assetType: string;
      location: string;
      status: 'operational' | 'maintenance' | 'critical';
      mtbfHours: number;
      currentWorkOrder: {
        workOrderNumber: string;
        title: string;
      } | null;
    }>;
    summary: {
      total: number;
      operational: number;
      maintenance: number;
      critical: number;
      availabilityPercentage: number;
    };
  }>;
  timestamp: string;
};

function getStatusColor(status: string): string {
  switch (status) {
    case 'operational':
      return 'bg-green-950/40 text-green-300 border-green-800';
    case 'maintenance':
      return 'bg-amber-950/40 text-amber-300 border-amber-800';
    case 'critical':
      return 'bg-red-950/40 text-red-300 border-red-800';
    default:
      return 'bg-slate-900/40 text-slate-300 border-slate-700';
  }
}

function getHealthColor(health: string): string {
  switch (health) {
    case 'excellent':
      return 'from-slate-900/60 to-slate-800/60 border-green-700/50';
    case 'good':
      return 'from-slate-900/60 to-slate-800/60 border-blue-700/50';
    case 'warning':
      return 'from-slate-900/60 to-slate-800/60 border-amber-700/50';
    case 'critical':
      return 'from-slate-900/60 to-slate-800/60 border-red-700/50';
    default:
      return 'from-slate-900/60 to-slate-800/60 border-slate-700';
  }
}

function getHealthBadgeColor(health: string): string {
  switch (health) {
    case 'excellent':
      return 'bg-green-900/60 text-green-300 border border-green-700/50';
    case 'good':
      return 'bg-blue-900/60 text-blue-300 border border-blue-700/50';
    case 'warning':
      return 'bg-amber-900/60 text-amber-300 border border-amber-700/50';
    case 'critical':
      return 'bg-red-900/60 text-red-300 border border-red-700/50';
    default:
      return 'bg-slate-900/60 text-slate-300 border border-slate-700/50';
  }
}

export function AvailabilitySemaphore() {
  const { data: summary } = useSWR<AvailabilitySummary>(
    '/api/maintenance/availability/summary',
    fetcher,
    { refreshInterval: 30000 } // Refresh every 30 seconds
  );

  const { data: byZone } = useSWR<AvailabilityByZone>(
    '/api/maintenance/availability/by-zone',
    fetcher,
    { refreshInterval: 30000 }
  );

  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    if (summary?.summary.availabilityPercentage && summary.summary.availabilityPercentage < 70) {
      setIsWarning(true);
    } else {
      setIsWarning(false);
    }
  }, [summary?.summary.availabilityPercentage]);

  if (!summary?.summary) {
    return (
      <div className="text-center py-8 text-gray-500">Cargando disponibilidad...</div>
    );
  }

  const s = summary.summary;

  return (
    <div className="space-y-6">
      {/* Main Semaphore Card */}
      <Card
        className={`border-2 bg-gradient-to-br ${getHealthColor(s.healthStatus)} ${
          isWarning ? 'animate-pulse' : ''
        }`}
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Disponibilidad en Tiempo Real
            </span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${getHealthBadgeColor(
                s.healthStatus
              )}`}
            >
              {s.healthStatus === 'excellent'
                ? 'Excelente'
                : s.healthStatus === 'good'
                  ? 'Bueno'
                  : s.healthStatus === 'warning'
                    ? 'Advertencia'
                    : 'Crítico'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Large Availability Percentage */}
          <div className="text-center">
            <div className="text-6xl font-bold">
              <span
                className={
                  s.availabilityPercentage >= 80
                    ? 'text-green-400'
                    : s.availabilityPercentage >= 60
                      ? 'text-blue-400'
                      : s.availabilityPercentage >= 40
                        ? 'text-amber-400'
                        : 'text-red-400'
                }
              >
                {s.availabilityPercentage}%
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">Equipos disponibles operando</p>
          </div>

          {/* Progress Bar */}
          <Progress
            value={s.availabilityPercentage}
            className="h-3 bg-slate-800"
          />

          {/* Asset Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-slate-900/50 rounded-lg border border-green-800/50">
              <div className="text-2xl font-bold text-green-400">{s.operational}</div>
              <p className="text-xs text-green-300/70">Operando</p>
            </div>
            <div className="text-center p-3 bg-slate-900/50 rounded-lg border border-amber-800/50">
              <div className="text-2xl font-bold text-amber-400">{s.maintenance}</div>
              <p className="text-xs text-amber-300/70">Mantenimiento</p>
            </div>
            <div className="text-center p-3 bg-slate-900/50 rounded-lg border border-red-800/50">
              <div className="text-2xl font-bold text-red-400">{s.critical}</div>
              <p className="text-xs text-red-300/70">Críticos</p>
            </div>
          </div>

          {/* Warning Alert */}
          {isWarning && (
            <Alert className="border-red-800/50 bg-red-950/30">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">
                ⚠️ Disponibilidad por debajo del 70%. Revisar operaciones inmediatamente.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* By Zone Cards */}
      {byZone?.byZone && byZone.byZone.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Por Zona/Área
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {byZone.byZone.map((zone) => (
              <Card key={zone.zone} className="border border-slate-700/50 bg-slate-900/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{zone.zone}</span>
                    <span className="text-2xl font-bold text-slate-200">
                      {zone.summary.availabilityPercentage}%
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Inline Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="p-2 bg-green-950/40 rounded border border-green-800/50">
                      <div className="font-bold text-green-400">{zone.summary.operational}</div>
                      <div className="text-xs text-green-300/70">OK</div>
                    </div>
                    <div className="p-2 bg-amber-950/40 rounded border border-amber-800/50">
                      <div className="font-bold text-amber-400">{zone.summary.maintenance}</div>
                      <div className="text-xs text-amber-300/70">Mto.</div>
                    </div>
                    <div className="p-2 bg-red-950/40 rounded border border-red-800/50">
                      <div className="font-bold text-red-400">{zone.summary.critical}</div>
                      <div className="text-xs text-red-300/70">Crítico</div>
                    </div>
                  </div>

                  {/* Asset Indicators */}
                  <div className="space-y-2">
                    {zone.assets.slice(0, 2).map((asset) => (
                      <div
                        key={asset.id}
                        className={`p-2 rounded border-l-4 ${getStatusColor(asset.status)}`}
                      >
                        <div className="font-semibold text-sm">{asset.assetCode}</div>
                        <div className="text-xs text-gray-600 truncate">{asset.assetName}</div>
                        {asset.currentWorkOrder && (
                          <div className="text-xs italic text-gray-700 mt-1">
                            {asset.currentWorkOrder.workOrderNumber}
                          </div>
                        )}
                      </div>
                    ))}
                    {zone.assets.length > 2 && (
                      <div className="text-xs text-gray-500 text-center p-1">
                        +{zone.assets.length - 2} más
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className="text-xs text-gray-500 text-center">
        Actualizado: {new Date(summary.timestamp).toLocaleTimeString('es-CL')}
      </div>
    </div>
  );
}
