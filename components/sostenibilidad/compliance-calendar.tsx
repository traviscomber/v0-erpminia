'use client';

import useSWR from 'swr';
import { AlertCircle, Calendar, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Request failed');
  return response.json();
};

export default function ComplianceCalendar() {
  const { data: eventsData } = useSWR('/api/sostenibilidad/compliance-events?limit=10', fetcher);
  const { data: scoreData } = useSWR(
    '/api/sostenibilidad/compliance/calculate-score',
    fetcher
  );

  const events = eventsData?.data || [];
  const eventStats = eventsData?.stats || {
    total: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
  };
  const complianceScore = scoreData?.compliance_score || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventStats.pending}</div>
            <p className="text-xs text-muted-foreground">Pendientes y próximos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{complianceScore}%</div>
            <p className="text-xs text-green-600">Actualizado desde no conformidades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{eventStats.overdue}</div>
            <p className="text-xs text-muted-foreground">Acciones requeridas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Compliance Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No hay eventos de compliance registrados todavía.
              </div>
            ) : (
              events.map((event: any) => (
                <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  {event.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle
                      className={`h-5 w-5 mt-0.5 ${
                        event.status === 'overdue' ? 'text-red-600' : 'text-yellow-600'
                      }`}
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.due_date).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                  <Badge variant={event.status === 'completed' ? 'secondary' : 'default'}>
                    {event.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
