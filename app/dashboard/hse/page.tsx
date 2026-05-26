'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandCard } from '@/components/ui/brand-card';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Shield,
  AlertCircle,
  Target,
  CheckSquare,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS_LIGHT } from '@/lib/theme-colors';
import { HSEDocumentosCard } from '@/components/hse/hse-documentos-card';
import { HSECapacitacionesCard } from '@/components/hse/hse-capacitaciones-card';
import { HSEEPPCard } from '@/components/hse/hse-epp-card';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HSEPage() {
  const [selectedFramework, setSelectedFramework] = useState('all');

  // Fetch HSE data from API
  const { data, error, isLoading, mutate } = useSWR(
    `/api/dashboard/hse${selectedFramework !== 'all' ? `?framework=${selectedFramework}` : ''}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 120000, // 2 minutes
    }
  );

  if (error) return <div className="text-red-500">Error loading HSE data</div>;
  if (isLoading) return <div className="text-gray-500">Loading HSE compliance data...</div>;

  const frameworks = data?.frameworks || [];
  const incidents = data?.incidents || [];
  const requirementsDueData = data?.requirementsDueData || [];
  const complianceByFramework = data?.complianceByFramework || [];

  const complianceByArea = [
    { area: 'Seguridad Op.', compliance: 98, target: 100 },
    { area: 'Ambiental', compliance: 94, target: 100 },
    { area: 'Residuos', compliance: 100, target: 100 },
    { area: 'Salud', compliance: 96, target: 100 },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-[var(--brand-rojo)]/20 text-[var(--brand-rojo)]';
      case 'medium':
        return 'bg-[var(--brand-naranja)]/20 text-[var(--brand-naranja)]';
      case 'low':
        return 'bg-[var(--brand-verde)]/20 text-[var(--brand-verde)]';
      default:
        return 'bg-muted/20 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'investigating':
        return <Clock className="h-4 w-4" />;
      case 'pending_action':
        return <AlertCircle className="h-4 w-4" />;
      case 'closed':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">HSE & Compliance</h1>
        <p className="text-muted-foreground">Gestión integral de seguridad, salud y ambiental con trazabilidad normativa</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Cumplimiento Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">97.3%</div>
            <p className="text-xs text-muted-foreground mt-1">De requisitos normativoss</p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Incidentes Este Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--brand-naranja)]">3</div>
            <p className="text-xs text-muted-foreground mt-1">2 En investigación</p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Requisitos Vencidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[var(--brand-rojo)]">2</div>
            <p className="text-xs text-muted-foreground mt-1">Acción inmediata requerida</p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Acciones Correctivas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">12</div>
            <p className="text-xs text-muted-foreground mt-1">7 Cerradas, 5 Abiertas</p>
          </CardContent>
        </BrandCard>
      </div>

      {/* Frameworks */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={selectedFramework === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedFramework('all')}
          className={selectedFramework === 'all' ? 'bg-[var(--brand-naranja)]' : ''}
        >
          Todos los Marcos
        </Button>
        {frameworks.map((fw: any) => (
          <Button
            key={fw.id}
            variant={selectedFramework === fw.id ? 'default' : 'outline'}
            onClick={() => setSelectedFramework(fw.id)}
            className={selectedFramework === fw.id ? 'bg-[var(--brand-verde)]' : ''}
          >
            {fw.name}
          </Button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incidents */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold">Incidentes y No Conformidades</h2>
          {incidents.map((incident: any) => (
            <Card key={incident.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-sm">{incident.type}</h3>
                      <Badge className={getSeverityColor(incident.severity)}>
                        {incident.severity === 'high' ? 'Crítica' : incident.severity === 'medium' ? 'Media' : 'Baja'}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground mb-2">{incident.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{incident.equipment}</span>
                      <span>{incident.date}</span>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(incident.status)}
                        <span>
                          {incident.status === 'investigating'
                            ? 'En investigación'
                            : incident.status === 'pending_action'
                            ? 'Pendiente acción'
                            : 'Cerrado'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Requirements Due */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Requisitos por Vencer</h2>
          <div className="space-y-2">
            {requirementsDueData.map((req: any, i: number) => (
              <Card key={i} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{req.name}</p>
                    <p className="text-xs text-muted-foreground">{req.count} requisitos</p>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      req.status === 'on_track'
                        ? 'bg-[var(--brand-verde)]/20 text-[var(--brand-verde)]'
                        : req.status === 'warning'
                        ? 'bg-[var(--brand-naranja)]/20 text-[var(--brand-naranja)]'
                        : 'bg-[var(--brand-rojo)]/20 text-[var(--brand-rojo)]'
                    }`}
                  >
                    {req.status === 'on_track' ? '✓' : req.status === 'warning' ? '⚠' : '✕'}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Compliance Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Cumplimiento por Área</CardTitle>
          <CardDescription>Comparación vs. Meta (100%)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={complianceByArea}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="area" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="compliance" fill={CHART_COLORS_LIGHT[0]} name="Cumplimiento Actual (%)" />
              <Bar dataKey="target" fill={CHART_COLORS_LIGHT[1]} name="Meta (%)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Framework Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <span className="text-sm text-muted-foreground">Incidentes</span>
                <span className="font-bold text-[var(--brand-naranja)]">{fw.incidents}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cumplimiento</span>
                <span className={`font-bold ${fw.compliance >= 95 ? 'text-[var(--brand-verde)]' : 'text-[var(--brand-naranja)]'}`}>
                  {fw.compliance}%
                </span>
              </div>
              <Button className="w-full mt-2" variant="outline">
                Ver Detalles
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
