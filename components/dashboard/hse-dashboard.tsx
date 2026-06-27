'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { AlertTriangle, BookOpen, ShieldCheck, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const payload = await response.json().catch(() => null);
  if (!response.ok) return null;
  return payload;
};

export function HSEDashboard() {
  const { data } = useSWR('/api/dashboard/hse', fetcher, {
    revalidateOnFocus: false,
  });

  const summary = data?.summary || {};
  const kpis = Array.isArray(data?.kpis) ? data.kpis : [];
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
        <h1 className="text-3xl font-bold">HSE</h1>
        <p className="text-muted-foreground">Resumen operativo de seguridad, entrenamiento y control.</p>
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
            {kpis.slice(-6).map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between rounded border p-3">
                <div>
                  <p className="font-medium">{item.mes}</p>
                  <p className="text-xs text-muted-foreground">
                    IIRL {item.iirl?.toFixed?.(2) ?? item.iirl ?? 0}
                  </p>
                </div>
                <Badge variant="outline">{item.iirl <= (data?.meta_iirl || 1) ? 'OK' : 'Revisar'}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Accesos rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/hse/kpis" className="block rounded border p-3 hover:bg-muted/40">
              KPIs de seguridad
            </Link>
            <Link href="/dashboard/hse/epp" className="block rounded border p-3 hover:bg-muted/40">
              EPP
            </Link>
            <Link href="/dashboard/hse/incidentes" className="block rounded border p-3 hover:bg-muted/40">
              Incidentes
            </Link>
            <Link href="/dashboard/hse/capacitaciones" className="block rounded border p-3 hover:bg-muted/40">
              Capacitaciones
            </Link>
            <Link href="/dashboard/hse/documentos" className="block rounded border p-3 hover:bg-muted/40">
              Documentos HSE
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}