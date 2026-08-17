'use client';

import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

const fetcher = async (url: string) => { const r = await fetch(url, { credentials: 'include' }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d; };

export default function RoleMatrixApprovalsPage() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/role-matrix-changes', fetcher);
  const requests = data?.requests || [];
  const actor = data?.actor;

  const decide = async (id: string, stage: 'area_manager' | 'management', approve: boolean) => {
    const reason = approve ? null : window.prompt('Motivo del rechazo:')?.trim();
    if (!approve && !reason) return;
    const r = await fetch('/api/admin/role-matrix-changes', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: id, stage, approve, reason }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { window.alert(d.error || 'No se pudo procesar'); return; }
    await mutate();
  };

  if (isLoading) return <StatePanel tone="loading" title="Cargando solicitudes" />;
  if (error) return <StatePanel tone="error" title="No fue posible cargar las solicitudes" description={error.message} />;

  return <div className="space-y-6">
    <div><p className="text-sm font-medium text-primary">Administración · Accesos</p><h1 className="mt-1 text-3xl font-semibold">Aprobaciones de matriz</h1><p className="mt-2 text-sm text-muted-foreground">Cada modificación necesita dos validadores distintos: primero Jefe de Área y luego Gerencia.</p></div>
    <div className="space-y-3">{requests.length === 0 ? <StatePanel tone="neutral" title="No hay solicitudes" /> : requests.map((req: any) => {
      const canArea = req.status === 'pending_area_manager' && actor?.canApproveArea;
      const canManagement = req.status === 'pending_management' && actor?.canApproveManagement;
      return <Card key={req.id}><CardHeader><div className="flex items-start justify-between gap-4"><div><CardTitle className="text-base">{req.cargos?.name || 'Cargo'} · {req.module_key}</CardTitle><CardDescription>{req.operation === 'delete' ? 'Eliminar acceso' : `Nuevo nivel: ${req.requested_access_level}`}</CardDescription></div><Badge variant="outline">{req.status}</Badge></div></CardHeader><CardContent className="space-y-3"><p className="text-sm">{req.reason}</p><p className="text-xs text-muted-foreground">Solicitado: {new Date(req.requested_at).toLocaleString('es-CL')}</p>{(canArea || canManagement) ? <div className="flex gap-2"><Button onClick={() => decide(req.id, canArea ? 'area_manager' : 'management', true)}>Aprobar</Button><Button variant="destructive" onClick={() => decide(req.id, canArea ? 'area_manager' : 'management', false)}>Rechazar</Button></div> : null}</CardContent></Card>;
    })}</div>
  </div>;
}
