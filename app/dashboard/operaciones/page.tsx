'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  HardHat,
  MapPin,
  Users,
  Zap,
  AlertCircle,
  TrendingUp,
  Clock,
  Plus,
} from 'lucide-react';

export default function OperacionesPage() {
  const sites = [
    {
      id: 1,
      name: 'Faena Central',
      status: 'active',
      shift: 'Turno 1 (06:00-14:00)',
      crew: 45,
      maxCrew: 50,
      equipment: 12,
      incidents: 1,
      production: 94,
    },
    {
      id: 2,
      name: 'Faena Antacaña',
      status: 'active',
      shift: 'Turno 1 (06:00-14:00)',
      crew: 32,
      maxCrew: 40,
      equipment: 8,
      incidents: 0,
      production: 87,
    },
    {
      id: 3,
      name: 'Faena Mapocho',
      status: 'maintenance',
      shift: 'Parada Preventiva',
      crew: 0,
      maxCrew: 35,
      equipment: 5,
      incidents: 0,
      production: 0,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Operaciones Mineras</h1>
        <p className="text-muted-foreground mt-2">
          Gestión de faenas, turnos y personal operativo
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faenas Activas</p>
                <p className="text-3xl font-bold text-primary mt-2">2</p>
              </div>
              <HardHat className="h-8 w-8 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Personal Total</p>
                <p className="text-3xl font-bold text-accent mt-2">77</p>
              </div>
              <Users className="h-8 w-8 text-accent opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Equipos Operacionales</p>
                <p className="text-3xl font-bold text-secondary-foreground mt-2">20</p>
              </div>
              <Zap className="h-8 w-8 text-secondary-foreground opacity-60" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Incidentes Hoy</p>
                <p className="text-3xl font-bold text-destructive mt-2">1</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive opacity-60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sites Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estado de Faenas</CardTitle>
              <CardDescription>Vista en tiempo real de operaciones por sitio</CardDescription>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nueva Faena
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sites.map((site) => (
              <div
                key={site.id}
                className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <h3 className="font-semibold">{site.name}</h3>
                      <p className="text-sm text-muted-foreground">{site.shift}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      site.status === 'active'
                        ? 'bg-accent/10 text-accent'
                        : 'bg-muted/50 text-muted-foreground'
                    }
                  >
                    {site.status === 'active' ? 'Operativo' : 'Mantenimiento'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground text-xs">Personal</p>
                    <p className="font-semibold">
                      {site.crew}/{site.maxCrew}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground text-xs">Equipos</p>
                    <p className="font-semibold">{site.equipment}</p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground text-xs">Incidentes</p>
                    <p className={`font-semibold ${site.incidents > 0 ? 'text-destructive' : 'text-accent'}`}>
                      {site.incidents}
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded p-2">
                    <p className="text-muted-foreground text-xs">Producción</p>
                    <p className="font-semibold text-accent">{site.production}%</p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    Ver Detalles
                  </Button>
                  <Button variant="outline" size="sm">
                    <Clock className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
