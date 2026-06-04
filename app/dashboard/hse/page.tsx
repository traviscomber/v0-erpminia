'use client';

import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BrandCard } from '@/components/ui/brand-card';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { CHART_COLORS_LIGHT } from '@/lib/theme-colors';
import { HSEDocumentosCard } from '@/components/hse/hse-documentos-card';
import { HSECapacitacionesCard } from '@/components/hse/hse-capacitaciones-card';
import { HSEEPPCard } from '@/components/hse/hse-epp-card';

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('No se pudo cargar HSE');
  }
  return response.json();
};

const riskColors = ['#dc2626', '#f97316', '#facc15', '#16a34a'];

export default function HSEPage() {
  const { data, error, isLoading } = useSWR('/api/dashboard/hse', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 120000,
  });

  if (error) {
    return <div className="text-red-500">Error al cargar el modulo HSE.</div>;
  }

  if (isLoading) {
    return <div className="text-gray-500">Cargando datos HSE...</div>;
  }

  const summary = data?.summary || {};
  const incidents = data?.incidents || [];
  const dueItems = data?.requirementsDueData || [];
  const complianceByArea = data?.complianceByArea || [];
  const frameworks = data?.frameworks || [];
  const riskDistribution = data?.riskDistribution || [];
  const trend = data?.kpis || [];
  const documents = data?.documents || [];
  const trainings = data?.trainings || [];
  const epp = data?.epp || [];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-[var(--brand-rojo)]/20 text-[var(--brand-rojo)]';
      case 'medium':
        return 'bg-[var(--brand-naranja)]/20 text-[var(--brand-naranja)]';
      default:
        return 'bg-[var(--brand-verde)]/20 text-[var(--brand-verde)]';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'investigating':
        return <Clock className="h-4 w-4" />;
      case 'closed':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">HSE y Cumplimiento</h1>
        <p className="text-muted-foreground">
          Seguridad, salud, evidencia y control normativo en una sola vista operacional.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Cumplimiento promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.complianceScore || 0}%</div>
            <p className="mt-1 text-xs text-muted-foreground">Promedio entre documentos, capacitacion, EPP y riesgos</p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Incidentes del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--brand-naranja)]">{summary.incidentsThisMonth || 0}</div>
            <p className="mt-1 text-xs text-muted-foreground">{summary.openInvestigations || 0} en investigacion</p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Requisitos por revisar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--brand-rojo)]">{summary.dueRequirements || 0}</div>
            <p className="mt-1 text-xs text-muted-foreground">Normativa, documentos y matriz de riesgos</p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Acciones correctivas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.openCorrectiveActions || 0}</div>
            <p className="mt-1 text-xs text-muted-foreground">{summary.closedCorrectiveActions || 0} cerradas</p>
          </CardContent>
        </BrandCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-lg font-semibold">Incidentes recientes</h2>
          {incidents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-sm text-muted-foreground">
                No hay incidentes registrados para mostrar.
              </CardContent>
            </Card>
          ) : (
            incidents.map((incident: any) => (
              <Card key={incident.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="text-sm font-semibold">{incident.type}</h3>
                        <Badge className={getSeverityColor(incident.severity)}>
                          {incident.severity === 'high' ? 'Critica' : incident.severity === 'medium' ? 'Media' : 'Baja'}
                        </Badge>
                      </div>
                      <p className="mb-2 text-sm text-foreground">{incident.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span>{incident.equipment}</span>
                        <span>{incident.date}</span>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(incident.status)}
                          <span>
                            {incident.status === 'investigating'
                              ? 'En investigacion'
                              : incident.status === 'pending_action'
                                ? 'Pendiente de accion'
                                : 'Cerrado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Pendientes HSE</h2>
          <div className="space-y-2">
            {dueItems.length === 0 ? (
              <Card className="p-4 text-sm text-muted-foreground">No hay pendientes proximos.</Card>
            ) : (
              dueItems.map((req: any) => (
                <Card key={req.id} className="p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{req.name}</p>
                      <p className="text-xs text-muted-foreground">{req.source}</p>
                    </div>
                    <Badge
                      className={
                        req.status === 'critical'
                          ? 'bg-[var(--brand-rojo)]/20 text-[var(--brand-rojo)]'
                          : 'bg-[var(--brand-naranja)]/20 text-[var(--brand-naranja)]'
                      }
                    >
                      {req.status === 'critical' ? 'Urgente' : 'Proximo'}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cumplimiento por frente HSE</CardTitle>
            <CardDescription>Comparacion contra meta operacional</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={complianceByArea}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="area" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="compliance" fill={CHART_COLORS_LIGHT[0]} name="Actual" />
                <Bar dataKey="target" fill={CHART_COLORS_LIGHT[1]} name="Meta" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribucion de riesgos</CardTitle>
            <CardDescription>Clasificacion segun nivel de riesgo registrado</CardDescription>
          </CardHeader>
          <CardContent>
            {riskDistribution.length === 0 ? (
              <div className="py-12 text-sm text-muted-foreground">No hay matriz de riesgos cargada.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={riskDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {riskDistribution.map((_: any, index: number) => (
                      <Cell key={index} fill={riskColors[index % riskColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tendencia de seguridad</CardTitle>
          <CardDescription>Evolucion mensual de IIRL y dias sin incidentes</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="iirl" stroke={CHART_COLORS_LIGHT[0]} strokeWidth={2} name="IIRL" />
              <Line yAxisId="right" type="monotone" dataKey="dias_sin_accidentes" stroke={CHART_COLORS_LIGHT[2]} strokeWidth={2} name="Dias sin accidentes" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <HSEDocumentosCard documentos={documents} />
        <HSECapacitacionesCard capacitaciones={trainings} />
        <HSEEPPCard entregas={epp} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {frameworks.map((fw: any) => (
          <Card key={fw.id}>
            <CardHeader>
              <CardTitle className="text-base">{fw.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Requisitos</span>
                <span className="font-bold">{fw.requirements}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Alertas</span>
                <span className="font-bold text-[var(--brand-naranja)]">{fw.incidents}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cumplimiento</span>
                <span className={`font-bold ${fw.compliance >= 95 ? 'text-[var(--brand-verde)]' : 'text-[var(--brand-naranja)]'}`}>
                  {fw.compliance}%
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
