'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface Incident {
  id: string;
  asset_id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  created_at: string;
}

interface Investigation {
  id: string;
  incident_id: string;
  root_cause: string;
  corrective_actions: string;
  status: 'open' | 'closed' | 'verified';
  target_date: string;
}

export function IncidentsDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [stats, setStats] = useState({ open: 0, investigating: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [incidentsRes, investigationsRes] = await Promise.all([
          fetch('/api/hse/incidents'),
          fetch('/api/hse/investigations')
        ]);

        if (incidentsRes.ok) {
          const { data: inc } = (await incidentsRes.json()) as { data?: Incident[] };
          setIncidents(inc || []);
          setStats({
            open: (inc || []).filter((i: Incident) => i.status === 'open').length || 0,
            investigating: (inc || []).filter((i: Incident) => i.status === 'investigating').length || 0,
            resolved: (inc || []).filter((i: Incident) => i.status === 'resolved').length || 0,
          });
        }

        if (investigationsRes.ok) {
          const { investigations: inv } = (await investigationsRes.json()) as { investigations?: Investigation[] };
          setInvestigations(inv || []);
        }
      } catch (err) {
        console.error('[v0] HSE fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 120000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch(severity) {
      case 'critical': return 'bg-red-600/20 text-red-700';
      case 'high': return 'bg-orange-600/20 text-orange-700';
      case 'medium': return 'bg-yellow-600/20 text-yellow-700';
      default: return 'bg-blue-600/20 text-blue-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'closed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'investigating': return <Clock className="h-4 w-4 text-orange-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Incidentes Abiertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En Investigación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.investigating}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resueltos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incidentes Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : incidents.length === 0 ? (
            <p className="text-muted-foreground text-sm">Sin incidentes reportados.</p>
          ) : (
            <div className="space-y-3">
              {incidents.slice(0, 5).map(incident => (
                <div key={incident.id} className="flex items-start justify-between p-2 border rounded">
                  <div className="flex gap-2">
                    {getStatusIcon(incident.status)}
                    <div>
                      <p className="font-semibold text-sm">{incident.description}</p>
                      <p className="text-xs text-muted-foreground">Equipo: {incident.asset_id}</p>
                    </div>
                  </div>
                  <Badge className={getSeverityColor(incident.severity)}>
                    {incident.severity}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Investigaciones Abiertas</CardTitle>
        </CardHeader>
        <CardContent>
          {investigations.filter((i: Investigation) => i.status !== 'verified').length === 0 ? (
            <p className="text-muted-foreground text-sm">Todas las investigaciones verificadas.</p>
          ) : (
            <div className="space-y-3">
              {investigations.filter((i: Investigation) => i.status !== 'verified').slice(0, 3).map((inv: Investigation) => (
                <div key={inv.id} className="p-2 border rounded">
                  <p className="font-semibold text-sm">Causa Raíz: {inv.root_cause}</p>
                  <p className="text-xs text-muted-foreground mt-1">Acciones: {inv.corrective_actions}</p>
                  <p className="text-xs text-blue-600 mt-1">Meta: {new Date(inv.target_date).toLocaleDateString('es-CL')}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
