'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import useSWR from 'swr';
import { CorrectiveActionCard } from '@/components/sostenibilidad/corrective-action-card';
import { CorrectiveActionModal } from '@/components/sostenibilidad/corrective-action-modal';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function CorrectiveActionsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [ncId] = useState<string | null>(null);

  const { data: stats } = useSWR('/api/sostenibilidad/corrective-actions/stats', fetcher);
  const { data: actions, mutate } = useSWR(
    ncId ? `/api/sostenibilidad/corrective-actions?ncId=${ncId}` : '/api/sostenibilidad/corrective-actions',
    fetcher
  );

  const inProgressCount = actions?.data?.filter((a: any) => a.status === 'in_progress').length || 0;
  const completedCount = actions?.data?.filter((a: any) => a.status === 'completed' || a.status === 'verified').length || 0;
  const overDueCount = actions?.data?.filter((a: any) => new Date(a.scheduled_completion_date) < new Date() && a.status !== 'completed').length || 0;
  const totalActions = actions?.data?.length || 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Acciones correctivas</h1>
          <p className="text-muted-foreground">Seguimiento y gestion de planes correctivos</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-primary" variant="default">
          <Plus className="w-4 h-4 mr-2" />
          Nueva accion
        </Button>
      </div>

      {!ncId && (
        <Card className="border-border">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Crea acciones correctivas desde una no conformidad seleccionada para mantener el vinculo con su hallazgo.
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCount || stats?.data?.in_progress || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount || stats?.data?.completed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overDueCount || stats?.data?.overdue || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de cierre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalActions
                ? Math.round((completedCount / totalActions) * 100)
                : stats?.data?.completionRate || 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Activas</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
          <TabsTrigger value="overdue">Vencidas</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actions?.data
              ?.filter((a: any) => ['planned', 'in_progress'].includes(a.status))
              .map((action: any) => (
                <CorrectiveActionCard key={action.id} action={action} onUpdate={() => mutate()} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actions?.data
              ?.filter((a: any) => ['completed', 'verified'].includes(a.status))
              .map((action: any) => (
                <CorrectiveActionCard key={action.id} action={action} onUpdate={() => mutate()} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actions?.data
              ?.filter((a: any) => new Date(a.scheduled_completion_date) < new Date() && a.status !== 'completed')
              .map((action: any) => (
                <CorrectiveActionCard key={action.id} action={action} onUpdate={() => mutate()} />
              ))}
          </div>
        </TabsContent>
      </Tabs>

      <CorrectiveActionModal open={modalOpen} onOpenChange={setModalOpen} ncId={ncId} onCreate={() => mutate()} />
    </div>
  );
}
