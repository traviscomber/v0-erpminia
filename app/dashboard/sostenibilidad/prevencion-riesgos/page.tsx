"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  Shield, 
  GraduationCap, 
  HardHat, 
  Activity, 
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  Users,
  FileText,
  ArrowRight,
  Calendar
} from "lucide-react";

const modules = [
  {
    title: "Documentos HSE",
    description: "Politicas, procedimientos, instructivos y programas de seguridad",
    href: "/dashboard/sostenibilidad/prevencion-riesgos/documentos-hse",
    icon: FileText,
    stats: { total: 45, vigentes: 42, revision: 3 },
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Capacitaciones",
    description: "Gestion de cursos, entrenamientos y certificaciones del personal",
    href: "/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones",
    icon: GraduationCap,
    stats: { planificadas: 12, realizadas: 89, proximas: 5 },
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    title: "Articulos EPP",
    description: "Catalogo maestro, asignaciones y control de equipos de proteccion",
    href: "/dashboard/sostenibilidad/prevencion-riesgos/epp",
    icon: HardHat,
    stats: { articulos: 156, asignados: 1240, pendientes: 23 },
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    title: "KPI Prevencion",
    description: "Indicadores de seguridad, tasas de accidentabilidad y tendencias",
    href: "/dashboard/sostenibilidad/prevencion-riesgos/kpi",
    icon: Activity,
    stats: { diasSinAccidentes: 127, tasaFrec: 2.1, tasaGrav: 45.2 },
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    title: "Inspecciones Internas",
    description: "Planificacion, ejecucion y seguimiento de inspecciones de seguridad",
    href: "/dashboard/sostenibilidad/prevencion-riesgos/inspecciones-internas",
    icon: ClipboardCheck,
    stats: { programadas: 8, realizadas: 45, hallazgos: 12 },
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  {
    title: "Inspecciones Externas",
    description: "Auditorias de organismos reguladores y certificadores",
    href: "/dashboard/sostenibilidad/prevencion-riesgos/inspecciones-externas",
    icon: Shield,
    stats: { proximas: 2, aprobadas: 15, observaciones: 3 },
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
];

const alerts = [
  { type: "warning", message: "5 capacitaciones proximas a vencer en 30 dias", module: "Capacitaciones" },
  { type: "error", message: "23 EPP pendientes de entrega", module: "EPP" },
  { type: "info", message: "Inspeccion ACHS programada para el 20/05", module: "Inspecciones" },
];

export default function PrevencionRiesgosPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-orange-500/10">
            <Shield className="w-8 h-8 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Prevencion de Riesgos</h1>
            <p className="text-muted-foreground">Pilar 1 de Sostenibilidad - Gestion integral de seguridad y salud ocupacional</p>
          </div>
        </div>
        <Link href="/dashboard/sostenibilidad/calendario">
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            Ver Calendario
          </Button>
        </Link>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <Card className="border-orange-500/50 bg-orange-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <CardTitle className="text-lg">Alertas Activas</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                  <div className="flex items-center gap-3">
                    <Badge variant={alert.type === "error" ? "destructive" : alert.type === "warning" ? "default" : "secondary"}>
                      {alert.module}
                    </Badge>
                    <span className="text-sm">{alert.message}</span>
                  </div>
                  <Button variant="ghost" size="sm">Ver</Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-500">127</p>
              <p className="text-sm text-muted-foreground">Dias sin accidentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">89</p>
              <p className="text-sm text-muted-foreground">Capacitaciones realizadas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">1,240</p>
              <p className="text-sm text-muted-foreground">EPP asignados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-cyan-500">45</p>
              <p className="text-sm text-muted-foreground">Inspecciones completadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <Link key={module.href} href={module.href}>
              <Card className="h-full hover:shadow-lg transition-all cursor-pointer group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg ${module.bgColor}`}>
                      <Icon className={`w-6 h-6 ${module.color}`} />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                  <CardDescription className="text-sm">{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(module.stats).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {value}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rapidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/capacitaciones">
              <Button variant="outline" size="sm" className="gap-2">
                <GraduationCap className="w-4 h-4" />
                Nueva Capacitacion
              </Button>
            </Link>
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/epp">
              <Button variant="outline" size="sm" className="gap-2">
                <HardHat className="w-4 h-4" />
                Asignar EPP
              </Button>
            </Link>
            <Link href="/dashboard/sostenibilidad/prevencion-riesgos/inspecciones-internas">
              <Button variant="outline" size="sm" className="gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Programar Inspeccion
              </Button>
            </Link>
            <Link href="/dashboard/sostenibilidad/calendario">
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="w-4 h-4" />
                Ver Calendario
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
