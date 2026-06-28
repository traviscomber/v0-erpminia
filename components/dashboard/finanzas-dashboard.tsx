'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Banknote, FileSpreadsheet, Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Movement = {
  id?: string | number;
  date?: string;
  description?: string;
  amount?: number;
  type?: string;
  category?: string;
};

type MovementSummary = {
  total: number;
  ingresos: number;
  egresos: number;
  balance: number;
};

const initialSummary: MovementSummary = {
  total: 0,
  ingresos: 0,
  egresos: 0,
  balance: 0,
};

export function FinanzasDashboard() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch('/api/finanzas/movements', { credentials: 'include' });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || 'No se pudieron cargar los movimientos');
        }

        if (active) {
          setMovements(Array.isArray(payload.movements) ? payload.movements : []);
          setError(null);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Error inesperado');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const summary = movements.reduce<MovementSummary>(
    (acc, movement) => {
      const amount = Number(movement.amount || 0);
      acc.total += 1;
      if ((movement.type || '').toLowerCase().includes('egres')) {
        acc.egresos += amount;
      } else {
        acc.ingresos += amount;
      }
      acc.balance += (movement.type || '').toLowerCase().includes('egres') ? -amount : amount;
      return acc;
    },
    { ...initialSummary }
  );

  const recentMovements = movements.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Seguimiento rápido de ingresos, egresos y balance para revisar el flujo financiero del proyecto.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/finanzas/importar">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Importar movimientos
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total movimientos</CardDescription>
            <CardTitle className="text-3xl">{loading ? '...' : summary.total}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Cargados desde el API financiero.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ingresos</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl text-emerald-600">
              <TrendingUp className="h-5 w-5" />
              {loading ? '...' : summary.ingresos.toLocaleString('es-CL')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Suma de movimientos no marcados como egreso.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Egresos</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl text-rose-600">
              <TrendingDown className="h-5 w-5" />
              {loading ? '...' : summary.egresos.toLocaleString('es-CL')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Gastos operacionales y de soporte.</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Balance</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Banknote className="h-5 w-5" />
              {loading ? '...' : summary.balance.toLocaleString('es-CL')}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Ingresos menos egresos.</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-5 w-5 text-[var(--brand-verde)]" />
              Movimientos recientes
            </CardTitle>
            <CardDescription>Últimos registros disponibles en el sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando movimientos...
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            ) : recentMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no hay movimientos cargados. Puedes importarlos desde Excel para comenzar.
              </p>
            ) : (
              recentMovements.map((movement, index) => (
                <div
                  key={String(movement.id ?? `${movement.date}-${movement.description}-${index}`)}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{movement.description || 'Movimiento sin descripción'}</p>
                    <p className="text-xs text-muted-foreground">
                      {movement.date || 'Sin fecha'} · {movement.category || 'general'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{Number(movement.amount || 0).toLocaleString('es-CL')}</p>
                    <p className="text-xs text-muted-foreground">{movement.type || 'ingreso'}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Siguiente paso</CardTitle>
            <CardDescription>Completa el circuito financiero con carga masiva y revisión.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              La importación por Excel ya está lista. Desde allí puedes poblar el sistema y mantener el módulo sincronizado.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/dashboard/finanzas/importar">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Ir a importar
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/finanzas/documentos">
                  Ver documentos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
