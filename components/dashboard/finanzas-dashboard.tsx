'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Banknote, Building2, FileSpreadsheet, Loader2, ShoppingCart, TrendingDown, TrendingUp, Users } from 'lucide-react';
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

type SupplierSummary = {
  total: number;
};

type MaintenanceEquipmentCostSummary = {
  rows: number;
  totalCost: number;
  matchedRows: number;
  unmatchedRows: number;
  assets: number;
  averageCostPerAsset: number;
};

const initialSummary: MovementSummary = {
  total: 0,
  ingresos: 0,
  egresos: 0,
  balance: 0,
};

const initialMaintenanceEquipmentCosts: MaintenanceEquipmentCostSummary = {
  rows: 0,
  totalCost: 0,
  matchedRows: 0,
  unmatchedRows: 0,
  assets: 0,
  averageCostPerAsset: 0,
};

export function FinanzasDashboard() {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [supplierSummary, setSupplierSummary] = useState<SupplierSummary>({ total: 0 });
  const [supplierLoading, setSupplierLoading] = useState(true);
  const [maintenanceEquipmentCosts, setMaintenanceEquipmentCosts] = useState<MaintenanceEquipmentCostSummary>(initialMaintenanceEquipmentCosts);
  const [maintenanceEquipmentCostsLoading, setMaintenanceEquipmentCostsLoading] = useState(true);

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

  useEffect(() => {
    let active = true;

    const loadSuppliers = async () => {
      try {
        const response = await fetch('/api/compras/suppliers?page=0&pageSize=1', { credentials: 'include' });
        const payload = await response.json().catch(() => ({}));

        if (response.ok && active) {
          setSupplierSummary({ total: Number(payload?.pagination?.total || 0) });
        }
      } catch {
        if (active) {
          setSupplierSummary({ total: 0 });
        }
      } finally {
        if (active) setSupplierLoading(false);
      }
    };

    void loadSuppliers();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadMaintenanceEquipmentCosts = async () => {
      try {
        const response = await fetch('/api/maintenance/equipment-costs?view=summary', { credentials: 'include' });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.error || 'No se pudieron cargar los costos de equipos');
        }

        if (active) {
          setMaintenanceEquipmentCosts({
            rows: Number(payload?.summary?.rows || 0),
            totalCost: Number(payload?.summary?.totalCost || 0),
            matchedRows: Number(payload?.summary?.matchedRows || 0),
            unmatchedRows: Number(payload?.summary?.unmatchedRows || 0),
            assets: Number(payload?.summary?.assets || 0),
            averageCostPerAsset: Number(payload?.summary?.averageCostPerAsset || 0),
          });
        }
      } catch {
        if (active) {
          setMaintenanceEquipmentCosts(initialMaintenanceEquipmentCosts);
        }
      } finally {
        if (active) setMaintenanceEquipmentCostsLoading(false);
      }
    };

    void loadMaintenanceEquipmentCosts();
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
        acc.balance -= amount;
      } else {
        acc.ingresos += amount;
        acc.balance += amount;
      }
      return acc;
    },
    { ...initialSummary },
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
              <p className="text-sm text-muted-foreground">Aún no hay movimientos cargados. Puedes importarlos desde Excel para comenzar.</p>
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
              La importación por Excel ya está lista. Desde ahí puedes poblar el sistema y mantener el módulo sincronizado.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link href="/dashboard/finanzas/importar">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Ir a importar
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/finanzas/proveedores">Ver proveedores</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/finanzas/documentos">Ver documentos</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/90">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-[var(--brand-verde)]" />
              Proveedores
            </CardTitle>
            <CardDescription>
              Sección separada para revisar proveedores, contacto y acciones asociadas sin mezclarlo con otros módulos.
            </CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/finanzas/proveedores">
              <Users className="mr-2 h-4 w-4" />
              Abrir directorio
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total de proveedores</CardDescription>
                <CardTitle className="text-3xl">{supplierLoading ? '...' : supplierSummary.total}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Base real compartida con Compras y Bodega.</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Acciones directas</CardDescription>
                <CardTitle className="text-3xl">3</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Copiar dato, abrir compras y revisar ficha completa.</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Estado</CardDescription>
                <CardTitle className="text-3xl">Real</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Sin mock visible y con la tabla real del sistema.</CardContent>
            </Card>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="justify-between sm:flex-1">
              <Link href="/dashboard/finanzas/proveedores">
                <Users className="mr-2 h-4 w-4" />
                Ver proveedores
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between sm:flex-1">
              <Link href="/dashboard/compras/importar-existencias">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Importar base
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between sm:flex-1">
              <Link href="/dashboard/compras">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Ir a compras
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/90">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-5 w-5 text-[var(--brand-verde)]" />
              Costos de equipos desde Mantenimiento
            </CardTitle>
            <CardDescription>
              Resumen cruzado desde el ledger real de mantenimiento. La data vive en Mantenimiento y aquí solo se visualiza.
            </CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/mantenimiento/costos/equipos">
              <ArrowRight className="mr-2 h-4 w-4" />
              Abrir ledger
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Registros</CardDescription>
                <CardTitle className="text-3xl">{maintenanceEquipmentCostsLoading ? '...' : maintenanceEquipmentCosts.rows}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Filas importadas desde Excel.</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Costo total</CardDescription>
                <CardTitle className="text-3xl">
                  {maintenanceEquipmentCostsLoading ? '...' : maintenanceEquipmentCosts.totalCost.toLocaleString('es-CL')}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Suma total cruzada con activos y centros de costo.</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Con cruce</CardDescription>
                <CardTitle className="text-3xl">{maintenanceEquipmentCostsLoading ? '...' : maintenanceEquipmentCosts.matchedRows}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Filas asociadas a maquinaria real o centros de costo.</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Sin cruce</CardDescription>
                <CardTitle className="text-3xl">{maintenanceEquipmentCostsLoading ? '...' : maintenanceEquipmentCosts.unmatchedRows}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Quedan para revisar nombre, familia o categoría.</CardContent>
            </Card>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="justify-between sm:flex-1">
              <Link href="/dashboard/mantenimiento/costos/equipos">
                <ArrowRight className="mr-2 h-4 w-4" />
                Ver costos de equipos
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between sm:flex-1">
              <Link href="/dashboard/mantenimiento/costos/equipos/importar">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Importar Excel de costos
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
