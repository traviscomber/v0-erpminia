'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { AlertTriangle, BookOpen, ShieldCheck, Upload, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;
  return payload;
};

type HseKpiItem = {
  mes?: string | null;
  iirl?: number | string | null;
};

export function HSEDashboard() {
  const { data } = useSWR('/api/dashboard/hse', fetcher, {
    revalidateOnFocus: false,
  });

  const summary = data?.summary || {};
  const kpis = (Array.isArray(data?.kpis) ? data.kpis : []) as HseKpiItem[];
  const trainings = Array.isArray(data?.trainings) ? data.trainings : [];
  const epp = Array.isArray(data?.epp) ? data.epp : [];
  const incidents = Array.isArray(data?.incidents) ? data.incidents : [];

  const cards = [
    { label: 'Incidentes', value: summary.total_incidents || incidents.length || 0, icon: <AlertTriangle className="h-4 w-4" /> },
    { label: 'Capacitaciones', value: summary.total_trainings || trainings.length || 0, icon: <BookOpen className="h-4 w-4" /> },
    { label: 'EPP', value: summary.total_epp || epp.length || 0, icon: <ShieldCheck className="h-4 w-4" /> },
    { label: 'Investigaciones', value: summary.open_investigations || 0, icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">HSE / Sostenibilidad</h1>
        <p className="text-muted-foreground">
          Entrada de compatibilidad para Prevencion de Riesgos. La data canonica vive en
          Sostenibilidad y este panel solo redirige.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                {card.icon}
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>KPIs recientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {kpis.slice(-6).map((item, index: number) => (
              <div key={index} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-medium">{item.mes}</p>
                  <p className="text-xs text-muted-foreground">IIRL {Number(item.iirl || 0).toFixed(2)}</p>
                </div>
                <Badge variant="outline">{Number(item.iirl || 0) <= (data?.meta_iirl || 1) ? 'OK' : 'Revisar'}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accesos rapidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/sostenibilidad" className="block rounded border p-3 hover:bg-muted/40">
              Ir a Sostenibilidad
            </Link>
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/epp" className="block rounded border p-3 hover:bg-muted/40">
              EPP
            </Link>
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse" className="block rounded border p-3 hover:bg-muted/40">
              Documentos de prevencion
            </Link>
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones" className="block rounded border p-3 hover:bg-muted/40">
              Capacitaciones
            </Link>
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/inspecciones" className="block rounded border p-3 hover:bg-muted/40">
              Inspecciones
            </Link>
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/investigaciones" className="block rounded border p-3 hover:bg-muted/40">
              Investigaciones
            </Link>
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/no-conformidades" className="block rounded border p-3 hover:bg-muted/40">
              No conformidades
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Cargas rapidas por Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Link href="/dashboard/hse/incidentes/importar" className="block rounded border p-3 hover:bg-muted/40">
            Incidentes
          </Link>
          <Link href="/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse/importar" className="block rounded border p-3 hover:bg-muted/40">
            Documentos
          </Link>
          <Link href="/dashboard/sostenibilidad/prevencion-riesgos/epp/importar" className="block rounded border p-3 hover:bg-muted/40">
            Matriz EPP
          </Link>
          <Link href="/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones/importar" className="block rounded border p-3 hover:bg-muted/40">
            Capacitaciones
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
