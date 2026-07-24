'use client';
import { Card } from '@/components/ui/card';
import { TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface KPICardsProps {
  data: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    completion_rate: number;
    avg_time_hours: number;
    critical_priority: number;
  };
}

export function KPICards({ data }: KPICardsProps) {
  const kpis = [
    {
      label: 'Total OT',
      value: data.total,
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      label: 'Completadas',
      value: data.completed,
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950',
    },
    {
      label: 'Pendientes',
      value: data.pending,
      icon: AlertCircle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50 dark:bg-yellow-950',
    },
    {
      label: 'Vencidas',
      value: data.overdue,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-950',
    },
    {
      label: 'Tasa Completación',
      value: `${data.completion_rate}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      label: 'Tiempo Promedio',
      value: `${data.avg_time_hours}h`,
      icon: Clock,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 dark:bg-indigo-950',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <Card key={idx} className={`p-4 ${kpi.bg} border-0`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">{kpi.label}</p>
                <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
              <Icon className={`h-6 w-6 ${kpi.color}`} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
