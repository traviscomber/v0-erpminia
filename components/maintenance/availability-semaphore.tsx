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
      return 'bg-green-100 text-green-900 border-green-300';
    case 'maintenance':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'critical':
      return 'bg-red-100 text-red-900 border-red-300';
    default:
      return 'bg-gray-100 text-gray-900 border-gray-300';
  }
}

function getHealthColor(health: string): string {
  switch (health) {
    case 'excellent':
      return 'from-green-50 to-emerald-50 border-green-200';
    case 'good':
      return 'from-blue-50 to-cyan-50 border-blue-200';
    case 'warning':
      return 'from-amber-50 to-orange-50 border-amber-200';
    case 'critical':
      return 'from-red-50 to-rose-50 border-red-200';
    default:
      return 'from-gray-50 to-gray-100 border-gray-200';
  }
}

function getHealthBadgeColor(health: string): string {
  switch (health) {
    case 'excellent':
      return 'bg-green-200 text-green-900';
    case 'good':
      return 'bg-blue-200 text-blue-900';
    case 'warning':
      return 'bg-amber-200 text-amber-900';
    case 'critical':
      return 'bg-red-200 text-red-900';
    default:
      return 'bg-gray-200 text-gray-900';
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
                    ? 'text-green-600'
                    : s.availabilityPercentage >= 60
                      ? 'text-blue-600'
                      : s.availabilityPercentage >= 40
                        ? 'text-amber-600'
                        : 'text-red-600'
                }
              >
                {s.availabilityPercentage}%
              </span>
            </div>
            <p className="text-gray-600 text-sm mt-1">Equipos disponibles operando</p>
          </div>

          {/* Progress Bar */}
          <Progress
            value={s.availabilityPercentage}
            className="h-3"
            style={{
              background:
                s.availabilityPercentage >= 80
                  ? 'lightgreen'
                  : s.availabilityPercentage >= 60
                    ? 'lightblue'
                    : s.availabilityPercentage >= 40
                      ? 'lightyellow'
                      : 'lightcoral',
            }}
          />

          {/* Asset Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-green-600">{s.operational}</div>
              <p className="text-xs text-gray-600">Operando</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-amber-600">{s.maintenance}</div>
              <p className="text-xs text-gray-600">Mantenimiento</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-red-600">{s.critical}</div>
              <p className="text-xs text-gray-600">Críticos</p>
            </div>
          </div>

          {/* Warning Alert */}
          {isWarning && (
            <Alert className="border-red-300 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
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
              <Card key={zone.zone} className="border-2 border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{zone.zone}</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {zone.summary.availabilityPercentage}%
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Inline Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="p-2 bg-green-50 rounded">
                      <div className="font-bold text-green-700">{zone.summary.operational}</div>
                      <div className="text-xs text-green-600">OK</div>
                    </div>
                    <div className="p-2 bg-amber-50 rounded">
                      <div className="font-bold text-amber-700">{zone.summary.maintenance}</div>
                      <div className="text-xs text-amber-600">Mto.</div>
                    </div>
                    <div className="p-2 bg-red-50 rounded">
                      <div className="font-bold text-red-700">{zone.summary.critical}</div>
                      <div className="text-xs text-red-600">Crítico</div>
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
