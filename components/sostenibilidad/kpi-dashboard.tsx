'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

type TopRiskItem = {
  id: string;
  nc_number: string;
  title: string;
  severity: string;
};

const getTrendLabel = (trend: string) => {
  if (trend === 'mejorando') return 'Mejorando';
  if (trend === 'empeorando') return 'Empeorando';
  return 'Estable';
};

export function SustainabilityKPIDashboard() {
  const { data: dashboardData, isLoading } = useSWR('/api/sostenibilidad/dashboard/overview', fetcher);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((index) => (
          <Card key={index}>
            <CardContent className="h-24 rounded bg-muted/50 p-6 animate-pulse" />
          </Card>
        ))}
      </div>
    );
  }

  if (!dashboardData || !dashboardData.overview) return null;

  const overview = dashboardData.overview ?? {};
  const trends = dashboardData.trends ?? [];
  const topRisks = dashboardData.top_risks ?? [];

  const getComplianceColor = (score: number) => {
    if (score >= 85) return 'text-secondary';
    if (score >= 70) return 'text-primary';
    return 'text-destructive';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'mejorando') return <TrendingUp className="h-4 w-4 text-secondary" />;
    if (trend === 'empeorando') return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Target className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Puntaje de cumplimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getComplianceColor(overview.compliance_score)}`}>
              {overview.compliance_score}%
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              {getTrendIcon(overview.trend)}
              <span>{getTrendLabel(overview.trend)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">NC abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{overview.open_ncs}</div>
            <div className="mt-2 text-xs text-muted-foreground">de {overview.total_ncs} totales</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Acciones vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${overview.overdue_cas > 0 ? 'text-destructive' : 'text-secondary'}`}>
              {overview.overdue_cas}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Requiere accion inmediata</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Tasa de cierre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-secondary">
              {overview.total_ncs > 0 ? Math.round((overview.closed_ncs / overview.total_ncs) * 100) : 0}%
            </div>
            <div className="mt-2 text-xs text-muted-foreground">{overview.closed_ncs} cerradas</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tendencia del puntaje de cumplimiento</CardTitle>
          <CardDescription>Ultimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          {trends && trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="report_period" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="compliance_score" stroke="#22C55E" name="Puntaje" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">Sin datos disponibles</div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribucion de NC por estado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Abiertas', value: overview.open_ncs },
                    { name: 'Cerradas', value: overview.closed_ncs },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#F97316" />
                  <Cell fill="#22C55E" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Principales riesgos abiertos</CardTitle>
            <CardDescription>No conformidades por cerrar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topRisks && topRisks.length > 0 ? (
                topRisks.map((risk: TopRiskItem) => (
                  <div key={risk.id} className="flex items-start gap-2 rounded bg-muted/50 p-2 text-sm">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                    <div className="flex-1">
                      <p className="font-medium">{risk.nc_number}</p>
                      <p className="text-xs text-muted-foreground">{risk.title}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={risk.severity === 'critica' ? 'bg-destructive/10' : 'bg-primary/10'}
                    >
                      {risk.severity}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Sin riesgos abiertos</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
