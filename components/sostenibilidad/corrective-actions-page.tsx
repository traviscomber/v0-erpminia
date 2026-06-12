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

type CorrectiveAction = {
  id: string;
  ca_number: string;
  action_description: string;
  status: 'planned' | 'in_progress' | 'completed' | 'verified' | 'on_hold';
  scheduled_completion_date?: string | null;
  responsible_person_name?: string | null;
  responsible_person?: string | null;
  percentage_complete?: number;
};

type ActionsResponse = {
  data?: CorrectiveAction[];
};

export function CorrectiveActionsPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [ncId] = useState<string | null>(null);

  const { data: stats } = useSWR('/api/sostenibilidad/corrective-actions/stats', fetcher);
  const { data: actions, mutate } = useSWR<ActionsResponse>(
    ncId ? `/api/sostenibilidad/corrective-actions?ncId=${ncId}` : '/api/sostenibilidad/corrective-actions',
    fetcher
  );

  const actionList = actions?.data || [];
  const inProgressCount = actionList.filter((action) => action.status === 'in_progress').length || 0;
  const completedCount =
    actionList.filter((action) => action.status === 'completed' || action.status === 'verified').length || 0;
  const overDueCount =
    actionList.filter((action) => new Date(action.scheduled_completion_date || 0) < new Date() && action.status !== 'completed').length || 0;
  const totalActions = actions?.data?.length || 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Acciones correctivas</h1>
          <p className="text-muted-foreground">Seguimiento y gestión de planes correctivos.</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-primary" variant="default">
          <Plus className="w-4 h-4 mr-2" />
          Nueva acción
        </Button>
      </div>

      {!ncId && (
        <Card className="border-border">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Crea acciones correctivas desde una no conformidad seleccionada para mantener el vínculo con el hallazgo.
          </CardContent>
        </Card>
      )}

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

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Activas</TabsTrigger>
          <TabsTrigger value="completed">Completadas</TabsTrigger>
          <TabsTrigger value="overdue">Vencidas</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actionList
              .filter((action) => ['planned', 'in_progress'].includes(action.status))
              .map((action) => (
                <CorrectiveActionCard key={action.id} action={action} onUpdate={() => mutate()} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actionList
              .filter((action) => ['completed', 'verified'].includes(action.status))
              .map((action) => (
                <CorrectiveActionCard key={action.id} action={action} onUpdate={() => mutate()} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="overdue" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actionList
              .filter(
                (action) =>
                  new Date(action.scheduled_completion_date || 0) < new Date() && action.status !== 'completed'
              )
              .map((action) => (
                <CorrectiveActionCard key={action.id} action={action} onUpdate={() => mutate()} />
              ))}
          </div>
        </TabsContent>
      </Tabs>

      <CorrectiveActionModal open={modalOpen} onOpenChange={setModalOpen} ncId={ncId} onCreate={() => mutate()} />
    </div>
  );
}
