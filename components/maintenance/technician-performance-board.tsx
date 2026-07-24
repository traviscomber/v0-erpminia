'use client';

import useSWR from 'swr';
import { useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wrench,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

type Technician = {
  name: string;
  cargo: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  preventive: number;
  corrective: number;
  predictive: number;
  totalPlannedHours: number;
  totalActualHours: number;
  completionRate: number;
  avgEfficiency: number;
  criticalCompleted: number;
  performanceScore: number;
};

type Summary = {
  totalWorkOrders: number;
  completedWorkOrders: number;
  completionRate: number;
  avgMTTR: number;
  activeTechnicians: number;
  periodDays: number;
};

type PerformanceResponse = {
  technicians: Technician[];
  summary: Summary;
};

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600 dark:text-green-400';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Regular';
  return 'Bajo';
}

function TechRow({ tech, rank }: { tech: Technician; rank: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        {/* Rank */}
        <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground">
          {rank === 1 ? <Award className="mx-auto h-4 w-4 text-yellow-500" /> : rank}
        </span>

        {/* Name and Cargo */}
        <div className="flex-1">
          <span className="font-medium block">{tech.name}</span>
          <span className="text-xs text-muted-foreground">{tech.cargo}</span>
        </div>

        {/* Score */}
        <span className={`text-xl font-bold tabular-nums ${scoreColor(tech.performanceScore)}`}>
          {tech.performanceScore}
        </span>
        <span className={`hidden text-xs sm:block ${scoreColor(tech.performanceScore)}`}>
          {scoreLabel(tech.performanceScore)}
        </span>

        {/* Quick stats */}
        <div className="hidden items-center gap-4 text-sm md:flex">
          <span className="flex items-center gap-1 text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            {tech.completed}/{tech.total}
          </span>
          {tech.overdue > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {tech.overdue} vencidas
            </span>
          )}
        </div>

        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {/* Completion bar */}
          <div className="mb-4 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tasa de completacion</span>
              <span>{tech.completionRate}%</span>
            </div>
            <Progress value={tech.completionRate} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">OT completadas</p>
              <p className="mt-1 text-2xl font-bold">{tech.completed}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">En progreso</p>
              <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{tech.inProgress}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">Vencidas</p>
              <p className={`mt-1 text-2xl font-bold ${tech.overdue > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                {tech.overdue}
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">Criticas resueltas</p>
              <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{tech.criticalCompleted}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">Horas reales</p>
              <p className="mt-1 font-semibold">{tech.totalActualHours} h</p>
              <p className="text-xs text-muted-foreground">Planificadas: {tech.totalPlannedHours} h</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">Eficiencia promedio</p>
              <p className={`mt-1 font-semibold ${tech.avgEfficiency >= 100 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {tech.avgEfficiency}%
              </p>
              <p className="text-xs text-muted-foreground">Planificado / real</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">Distribucion de trabajo</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {tech.preventive > 0 && <Badge variant="secondary" className="text-xs">{tech.preventive} prev</Badge>}
                {tech.corrective > 0 && <Badge variant="outline" className="text-xs">{tech.corrective} corr</Badge>}
                {tech.predictive > 0 && <Badge variant="outline" className="text-xs">{tech.predictive} pred</Badge>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TechnicianPerformanceBoard() {
  const [days, setDays] = useState('60');
  const { data, isLoading, error } = useSWR<PerformanceResponse>(
    `/api/maintenance/technicians/performance?days=${days}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const technicians = data?.technicians ?? [];
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Desempeno de tecnicos</h1>
          <p className="mt-1 text-muted-foreground">
            Analisis de rendimiento por tecnico basado en ordenes de trabajo reales.
          </p>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Ultimos 30 dias</SelectItem>
            <SelectItem value="60">Ultimos 60 dias</SelectItem>
            <SelectItem value="90">Ultimos 90 dias</SelectItem>
            <SelectItem value="180">Ultimos 6 meses</SelectItem>
            <SelectItem value="365">Ultimo ano</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Fleet summary cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tecnicos activos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.activeTechnicians}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">OT en el periodo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.totalWorkOrders}</p>
              <p className="text-xs text-muted-foreground">{summary.completedWorkOrders} completadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de completacion</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.completionRate}%</p>
              <Progress value={summary.completionRate} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                MTTR promedio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{summary.avgMTTR} h</p>
              <p className="text-xs text-muted-foreground">Tiempo medio de reparacion</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Ranking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Ranking de desempeno
          </CardTitle>
          <CardDescription>
            Puntaje calculado: 60% tasa completacion + 20% eficiencia de horas + 20% OT criticas resueltas.
            Haz clic en un tecnico para ver el detalle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-sm text-muted-foreground">Cargando datos...</p>
          )}
          {error && (
            <p className="text-sm text-destructive">No se pudo cargar el desempeno de tecnicos.</p>
          )}
          {!isLoading && !error && technicians.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No hay ordenes de trabajo con tecnico asignado en el periodo seleccionado.
            </div>
          )}
          {!isLoading && technicians.length > 0 && (
            <div className="space-y-2">
              {technicians.map((tech, idx) => (
                <TechRow key={tech.name} tech={tech} rank={idx + 1} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work type legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Wrench className="h-3 w-3" /> prev = preventivo</span>
        <span className="flex items-center gap-1"><Wrench className="h-3 w-3" /> corr = correctivo</span>
        <span className="flex items-center gap-1"><Wrench className="h-3 w-3" /> pred = predictivo</span>
      </div>
    </div>
  );
}
