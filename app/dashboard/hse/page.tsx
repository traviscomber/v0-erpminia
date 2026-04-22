'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandCard } from '@/components/ui/brand-card';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  AlertCircle,
  BarChart3,
  Plus,
  Zap,
  TrendingDown,
  Shield,
  FileText,
  Eye,
  LogOut,
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

// Mock data
const mockIncidents = [
  {
    id: 'inc_001',
    title: 'Derrame menor de diesel',
    description: 'Fuga en área de carga de combustible - 50 litros contenidos',
    severity: 'high',
    status: 'under_investigation',
    date: new Date(Date.now() - 2 * 24 * 60 * 60000),
    reported_by: 'Carlos Mendoza',
    classification: 'ambiental',
  },
  {
    id: 'inc_002',
    title: 'Incidente sin lesiones - Caída de objeto',
    description: 'Objeto cayó desde excavadora, no causó lesiones',
    severity: 'medium',
    status: 'closed',
    date: new Date(Date.now() - 5 * 24 * 60 * 60000),
    reported_by: 'Faena Antofagasta',
    classification: 'seguridad',
  },
];

const mockAudits = [
  {
    id: 'audit_001',
    type: 'DS 132 - Seguridad Minera',
    status: 'pending',
    due_date: '2024-05-15',
    findings: 3,
    compliance_score: 78,
  },
  {
    id: 'audit_002',
    type: 'Ley 19.300 - Ambiental',
    status: 'completed',
    due_date: '2024-04-20',
    findings: 1,
    compliance_score: 92,
  },
];

const riskData = [
  { category: 'Seguridad Minera', score: 72, target: 85 },
  { category: 'Seguridad Operacional', score: 88, target: 85 },
  { category: 'Ambiental', score: 78, target: 85 },
  { category: 'Residuos', score: 85, target: 85 },
  { category: 'Relaves', score: 90, target: 85 },
];

const incidentsTrend = [
  { mes: 'Enero', operacional: 2, minera: 1, ambiental: 0 },
  { mes: 'Febrero', operacional: 3, minera: 2, ambiental: 1 },
  { mes: 'Marzo', operacional: 1, minera: 1, ambiental: 0 },
  { mes: 'Abril', operacional: 2, minera: 0, ambiental: 1 },
];

const riskMatrix = [
  { probability: 'Alta', severity: 'Crítica', count: 2, color: '#DC2626' },
  { probability: 'Media', severity: 'Alta', count: 5, color: '#F97316' },
  { probability: 'Baja', severity: 'Media', count: 8, color: '#EAB308' },
  { probability: 'Muy Baja', severity: 'Baja', count: 15, color: '#22C55E' },
];

export default function HSEPage() {
  const [selectedIncident, setSelectedIncident] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed':
        return 'bg-green-500/20 text-green-700';
      case 'under_investigation':
        return 'bg-yellow-500/20 text-yellow-700';
      case 'pending':
        return 'bg-blue-500/20 text-blue-700';
      case 'non_compliant':
        return 'bg-red-500/20 text-red-700';
      default:
        return 'bg-gray-500/20 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">HSE & Compliance</h1>
          <p className="text-muted-foreground mt-1">
            Gestión integral de seguridad, salud ocupacional y cumplimiento normativo
          </p>
        </div>
        <Button className="gap-2" onClick={() => alert('Reportar incidente próximamente')}>
          <Plus className="h-4 w-4" />
          Reportar Incidente
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Score Cumplimiento Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">83.5%</div>
            <p className="text-xs text-muted-foreground mt-1">Meta: 85%</p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Incidentes Este Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">3</div>
            <p className="text-xs text-muted-foreground mt-1">2 bajo investigación</p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Hallazgos Abiertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">7</div>
            <p className="text-xs text-muted-foreground mt-1">3 críticos</p>
          </CardContent>
        </BrandCard>

        <BrandCard>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Requisitos Vigentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">156</div>
            <p className="text-xs text-muted-foreground mt-1">Normas activas</p>
          </CardContent>
        </BrandCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Incidents */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Incidentes Recientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {mockIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className={`p-3 rounded border cursor-pointer transition-all ${
                    selectedIncident === incident.id
                      ? 'border-[var(--brand-naranja)] bg-[var(--brand-naranja)]/5'
                      : 'border-border hover:bg-muted'
                  }`}
                  onClick={() => setSelectedIncident(incident.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm line-clamp-1">{incident.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{incident.reported_by}</p>
                    </div>
                    <Badge className={getStatusColor(incident.status)}>
                      {incident.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline">{incident.classification}</Badge>
                    <Badge
                      variant="outline"
                      className={
                        incident.severity === 'high'
                          ? 'bg-red-500/10 text-red-700'
                          : incident.severity === 'medium'
                            ? 'bg-yellow-500/10 text-yellow-700'
                            : 'bg-blue-500/10 text-blue-700'
                      }
                    >
                      {incident.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Audits & Inspections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Auditorías Normativas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockAudits.map((audit) => (
                <div key={audit.id} className="p-3 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm">{audit.type}</p>
                    <Badge
                      className={getStatusColor(audit.status)}
                      variant="outline"
                    >
                      {audit.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    <div>
                      <p className="text-muted-foreground">Vencimiento</p>
                      <p className="font-semibold">{audit.due_date}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Hallazgos</p>
                      <p className="font-semibold">{audit.findings}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cumplimiento</p>
                      <p className="font-semibold text-green-600">{audit.compliance_score}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Center: Charts */}
        <div className="lg:col-span-1 space-y-4">
          {/* Risk Score by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Cumplimiento por Área</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={riskData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} fontSize={11} />
                  <YAxis fontSize={12} domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Bar dataKey="score" fill="#FF6B35" name="Score Actual" />
                  <Bar dataKey="target" fill="#004E89" name="Meta" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Incidents Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Tendencia de Incidentes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={incidentsTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="operacional"
                    stroke="#FF6B35"
                    name="Operacional"
                  />
                  <Line type="monotone" dataKey="minera" stroke="#F97316" name="Minera" />
                  <Line type="monotone" dataKey="ambiental" stroke="#EAB308" name="Ambiental" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Right: Risk Matrix & Details */}
        <div className="lg:col-span-1 space-y-4">
          {/* Risk Matrix */}
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Riesgo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {riskMatrix.map((risk, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded"
                      style={{ backgroundColor: risk.color }}
                    />
                    <div className="flex-1">
                      <p className="text-xs font-semibold">
                        {risk.probability} x {risk.severity}
                      </p>
                    </div>
                    <Badge variant="outline">{risk.count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected Incident Detail */}
          {selectedIncident && mockIncidents.find((i) => i.id === selectedIncident) && (
            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardHeader>
                <CardTitle className="text-base">
                  {mockIncidents.find((i) => i.id === selectedIncident)?.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {(() => {
                  const inc = mockIncidents.find((i) => i.id === selectedIncident);
                  return (
                    <>
                      <div>
                        <p className="text-muted-foreground font-semibold mb-1">Descripción</p>
                        <p>{inc?.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-muted-foreground mb-1">Clasificación</p>
                          <Badge variant="outline">{inc?.classification}</Badge>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Severidad</p>
                          <Badge
                            variant="outline"
                            className={
                              inc?.severity === 'high'
                                ? 'bg-red-500/10 text-red-700'
                                : 'bg-yellow-500/10 text-yellow-700'
                            }
                          >
                            {inc?.severity}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <p className="text-muted-foreground mb-1">Fecha de Reporte</p>
                        <p>{inc?.date.toLocaleDateString('es-CL')}</p>
                      </div>

                      <div className="pt-2 space-y-2">
                        <Button className="w-full gap-2" variant="outline">
                          <Eye className="h-4 w-4" />
                          Ver Investigación
                        </Button>
                        <Button className="w-full gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Crear Acción Correctiva
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
