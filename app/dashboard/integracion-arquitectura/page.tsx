'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Network, Zap, Shield, Cpu } from 'lucide-react';

export default function IntegrationArchitecturePage() {
  return (
    <div className="min-h-screen bg-background p-8 space-y-12">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Arquitectura de Integración ERP SegurIA</h1>
        <p className="text-lg text-muted-foreground">Plan de integración de 2 módulos nuevos: Producción/Planta + HSE/Compliance</p>
      </div>

      {/* 1. System Overview */}
      <div className="max-w-7xl mx-auto">
        <Card className="border-[var(--brand-naranja)]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-6 w-6 text-[var(--brand-naranja)]" />
              1. Visión General del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Dashboard Executive */}
              <div className="bg-[var(--brand-naranja)]/10 border border-[var(--brand-naranja)]/30 rounded-lg p-4 text-center">
                <p className="font-semibold text-[var(--brand-naranja)]">DASHBOARD EJECUTIVO</p>
                <p className="text-sm text-muted-foreground">KPIs, Tendencias, Alertas, Compliance Status</p>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="h-6 w-6 text-[var(--brand-naranja)]" />
              </div>

              {/* Main Modules */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Producción */}
                <div className="bg-blue-600 border border-blue-500 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2">PRODUCCIÓN (Gemelo Operacional)</h3>
                  <ul className="text-sm space-y-1 text-blue-100">
                    <li>• Plantas & Áreas</li>
                    <li>• Líneas/Circuitos</li>
                    <li>• Equipos & Subcomponentes</li>
                    <li>• Sensores/Tags</li>
                    <li>• Telemetría & Alarmas</li>
                    <li>• Eventos & Detenciones</li>
                    <li>• KPIs de Producción</li>
                  </ul>
                </div>

                {/* HSE */}
                <div className="bg-green-600 border border-green-500 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-2">HSE/COMPLIANCE (Motor Normativo)</h3>
                  <ul className="text-sm space-y-1 text-green-100">
                    <li>• Incidentes & Investigaciones</li>
                    <li>• Inspecciones</li>
                    <li>• Acciones Correctivas</li>
                    <li>• Matriz Normativa</li>
                    <li>• RCA & Monitoreos</li>
                    <li>• Residuos & Relaves</li>
                    <li>• Cierre de Faena</li>
                  </ul>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <ArrowRight className="h-6 w-6 text-[var(--brand-naranja)]" />
              </div>

              {/* Integration Points */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-purple-600 border border-purple-500 rounded-lg p-3 text-center">
                  <p className="font-semibold text-white text-sm">MANTENIMIENTO</p>
                  <p className="text-xs text-purple-100">OT, MTTR, Costos</p>
                </div>
                <div className="bg-amber-600 border border-amber-500 rounded-lg p-3 text-center">
                  <p className="font-semibold text-white text-sm">INVENTARIO</p>
                  <p className="text-xs text-amber-100">Stock, Repuestos</p>
                </div>
                <div className="bg-red-600 border border-red-500 rounded-lg p-3 text-center">
                  <p className="font-semibold text-white text-sm">COMPRAS</p>
                  <p className="text-xs text-red-100">PO, Proveedores</p>
                </div>
                <div className="bg-cyan-600 border border-cyan-500 rounded-lg p-3 text-center">
                  <p className="font-semibold text-white text-sm">FINANZAS</p>
                  <p className="text-xs text-cyan-100">Costos, Facturas</p>
                </div>
                <div className="bg-indigo-600 border border-indigo-500 rounded-lg p-3 text-center">
                  <p className="font-semibold text-white text-sm">DOCUMENTOS</p>
                  <p className="text-xs text-indigo-100">Manuales, RCA</p>
                </div>
                <div className="bg-slate-600 border border-slate-500 rounded-lg p-3 text-center">
                  <p className="font-semibold text-white text-sm">ALERTAS</p>
                  <p className="text-xs text-slate-100">Notificaciones</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Integration Flows */}
      <div className="max-w-7xl mx-auto">
        <Card className="border-[var(--brand-verde)]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-[var(--brand-verde)]" />
              2. Flujos de Integración Críticos
            </CardTitle>
            <CardDescription>Cómo los módulos se comunican automáticamente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Flow 1 */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-blue-400 mb-2">Flujo 1: Anomalía en Sensor → Cascada Completa</h3>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p><Badge className="bg-blue-500">Sensor</Badge> Vibración alta en Correa CV-101</p>
                  <p className="ml-4">↓</p>
                  <p><Badge className="bg-yellow-500">Producción</Badge> Alerta crítica en dashboard</p>
                  <p className="ml-4">↓</p>
                  <p><Badge className="bg-purple-500">Mantenimiento</Badge> OT correctiva automática</p>
                  <p className="ml-4">↓</p>
                  <p><Badge className="bg-amber-500">Inventario</Badge> Reserva repuestos automáticamente</p>
                  <p className="ml-4">↓</p>
                  <p><Badge className="bg-cyan-500">Finanzas</Badge> Impacto económico calculado</p>
                  <p className="ml-4">↓</p>
                  <p><Badge className="bg-green-500">HSE</Badge> Observación de riesgo generada</p>
                </div>
              </div>

              {/* Flow 2 */}
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-green-400 mb-2">Flujo 2: Incidente HSE → Investigación → Cierre</h3>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p><Badge className="bg-green-500">HSE</Badge> Incidente de seguridad reportado</p>
                  <p className="ml-4">↓</p>
                  <p><Badge className="bg-green-600">Investigación</Badge> RCA se inicia automáticamente</p>
                  <p className="ml-4">↓</p>
                  <p><Badge className="bg-purple-500">Acción Correctiva</Badge> Se asigna con deadline</p>
                  <p className="ml-4">↓</p>
                  <p><Badge className="bg-indigo-500">Documentos</Badge> Evidencia se adjunta</p>
                  <p className="ml-4">↓</p>
                  <p><Badge className="bg-green-700">Cierre</Badge> Matriz normativa se actualiza</p>
                </div>
              </div>

              {/* Flow 3 */}
              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-semibold text-orange-400 mb-2">Flujo 3: Requisito Normativo Vencido → Ejecución</h3>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p><Badge className="bg-orange-500">Alerta</Badge> DS 132 vence en 5 días</p>
                  <p className="ml-4">↓</p>
                  <p><Badge className="bg-indigo-500">Documentos</Badge> Procedimiento se actualiza</p>
                  <p className="ml-4">↓</p>
                  <p><Badge className="bg-blue-500">Capacitación</Badge> Obligatoria a todo equipo</p>
                  <p className="ml-4">↓</p>
                  <p><Badge className="bg-green-500">Confirmación</Badge> Registros de lectura</p>
                  <p className="ml-4">↓</p>
                  <p><Badge className="bg-green-700">Cumplido</Badge> Matriz HSE actualizada</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Shared Entities (Hub) */}
      <div className="max-w-7xl mx-auto">
        <Card className="border-[var(--brand-rojo)]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-6 w-6 text-[var(--brand-rojo)]" />
              3. Entidades Compartidas (El Corazón de la Integración)
            </CardTitle>
            <CardDescription>Entidades que conectan todos los módulos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  entity: 'Equipment (Activo)',
                  uses: ['Producción', 'Mantenimiento', 'HSE'],
                  dispara: ['Alarmas', 'OT', 'Acciones Correctivas'],
                  vincula: ['Sensores', 'Repuestos', 'Documentos'],
                  color: 'bg-blue-600 border-blue-500'
                },
                {
                  entity: 'Sensor/Tag',
                  uses: ['Producción', 'Alertas'],
                  dispara: ['Eventos de Producción'],
                  vincula: ['Equipment', 'Telemetría'],
                  color: 'bg-purple-600 border-purple-500'
                },
                {
                  entity: 'OT (Orden de Trabajo)',
                  uses: ['Mantenimiento', 'Producción', 'HSE'],
                  dispara: ['Reserva de Repuestos', 'Facturación'],
                  vincula: ['Equipment', 'Repuestos', 'Documentos'],
                  color: 'bg-green-600 border-green-500'
                },
                {
                  entity: 'Incident',
                  uses: ['HSE', 'Producción'],
                  dispara: ['Acciones Correctivas', 'Alertas'],
                  vincula: ['Equipment', 'Documentos'],
                  color: 'bg-red-600 border-red-500'
                },
                {
                  entity: 'RegulatoryRequirement',
                  uses: ['HSE', 'Documentos'],
                  dispara: ['Tareas', 'Alertas de Vencimiento'],
                  vincula: ['Procedimientos', 'Controles', 'Evidencias'],
                  color: 'bg-amber-600 border-amber-500'
                },
                {
                  entity: 'Document',
                  uses: ['Producción', 'HSE', 'Mantenimiento'],
                  dispara: ['Notificaciones de Cambio'],
                  vincula: ['Procedimientos', 'RCA', 'Evidencias'],
                  color: 'bg-indigo-600 border-indigo-500'
                },
              ].map((item, idx) => (
                <div key={idx} className={`border rounded-lg p-4 ${item.color}`}>
                  <h4 className="font-semibold mb-2 text-white">{item.entity}</h4>
                  <div className="text-xs space-y-1 text-white/90">
                    <div><span className="font-semibold">Usado por:</span> {item.uses.join(', ')}</div>
                    <div><span className="font-semibold">Dispara:</span> {item.dispara.join(', ')}</div>
                    <div><span className="font-semibold">Vincula:</span> {item.vincula.join(', ')}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Architecture Layers */}
      <div className="max-w-7xl mx-auto">
        <Card className="border-[var(--brand-gold)]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-6 w-6 text-[var(--brand-gold)]" />
              4. Arquitectura Técnica de 4 Capas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  layer: 'Capa 1: Maestro Operacional',
                  tech: 'PostgreSQL (Relacional Normalizado)',
                  content: 'Plants, Areas, Lines, Equipment, Sensors, OT, Incidents, Documents, RCA, Stock',
                  color: 'bg-blue-500 text-white'
                },
                {
                  layer: 'Capa 2: Telemetría / Historian',
                  tech: 'TimeSeries (InfluxDB o Timescale)',
                  content: 'Sensor readings (1M+ points/day), Alarmas, Estados, Eventos',
                  color: 'bg-purple-500 text-white'
                },
                {
                  layer: 'Capa 3: Documental',
                  tech: 'Vercel Blob + Metadata en Postgres',
                  content: 'RCA, Procedimientos, Manuales, Reportes, Auditorías, Certificados',
                  color: 'bg-amber-500 text-white'
                },
                {
                  layer: 'Capa 4: Motor de Reglas/Eventos',
                  tech: 'Bull Queues + Event Bus',
                  content: 'Sensor fuera rango → Alerta → OT | Incidente → Acción → Cierre',
                  color: 'bg-green-500 text-white'
                },
              ].map((layer, idx) => (
                <div key={idx} className={`${layer.color} rounded-lg p-4`}>
                  <h4 className="font-semibold text-lg mb-1">{layer.layer}</h4>
                  <p className="text-sm opacity-90 mb-2">{layer.tech}</p>
                  <p className="text-sm">{layer.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Implementation Phases */}
      <div className="max-w-7xl mx-auto">
        <Card className="border-[var(--brand-naranja)]/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-[var(--brand-naranja)]" />
              5. Plan de Implementación (12 Semanas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                {
                  phase: 'Fase 1: Fundamento',
                  duration: '4 semanas',
                  focus: 'Entidades base + Eventos simples',
                  items: [
                    'Tablas maestras (Plants, Areas, Equipment, Sensors)',
                    'Dashboard Producción básico',
                    'Dashboard HSE básico (Incidentes + Matriz)',
                    'Integración Producción → Mantenimiento (Auto OT)',
                    'Integración Producción → Inventario (Reserva repuestos)',
                  ],
                  deliverables: '15 tablas | 5 dashboards | 2 flujos'
                },
                {
                  phase: 'Fase 2: Operación',
                  duration: '4 semanas',
                  focus: 'Telemetría + Operaciones completas',
                  items: [
                    'Ingestión de sensores desde SCADA/APIs',
                    'Historian (TimeSeries)',
                    'Dashboard Producción completo (tendencias, KPIs)',
                    'Módulo Inspecciones HSE',
                    'RCA (Matriz + Monitoreos)',
                    'Integración HSE ↔ Documentos',
                  ],
                  deliverables: '+12 pantallas | Telemetría en vivo | 3 flujos más'
                },
                {
                  phase: 'Fase 3: Ambiental + IA',
                  duration: '4 semanas',
                  focus: 'Residuos, Relaves, Cierre, Analytics',
                  items: [
                    'Módulo Residuos (generación, disposición)',
                    'Módulo Relaves (DS 248)',
                    'Módulo Cierre de Faena (Ley 20.551)',
                    'Motor de reglas avanzado',
                    'Analytics predictiva (MTTR, Disponibilidad)',
                    'Scoring de riesgo por equipo',
                  ],
                  deliverables: '+8 pantallas | Motor eventos | Reportes regulatorios'
                },
              ].map((phase, idx) => (
                <div key={idx} className="border border-border rounded-lg p-4 bg-card">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-lg text-foreground">{phase.phase}</h4>
                    <Badge className="bg-[var(--brand-naranja)] text-white">{phase.duration}</Badge>
                  </div>
                  <p className="text-sm font-semibold text-[var(--brand-naranja)] mb-2">{phase.focus}</p>
                  <ul className="text-sm space-y-1 mb-3">
                    {phase.items.map((item, i) => (
                      <li key={i} className="text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                  <div className="bg-muted p-2 rounded text-xs font-semibold text-foreground">
                    {phase.deliverables}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Recommendations */}
      <div className="max-w-7xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Recomendaciones Clave</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="font-bold text-[var(--brand-naranja)]">1.</span>
                <span><strong>Diseña Entidades Compartidas Primero:</strong> Equipment, Sensor, OT, Document, Requirement son el HUB central</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[var(--brand-naranja)]">2.</span>
                <span><strong>Motor de Eventos desde Inicio:</strong> Aunque sea simple, es crítico para cascada automática</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[var(--brand-naranja)]">3.</span>
                <span><strong>Telemetría en Fase 2:</strong> No intentes SCADA en Fase 1. Comienza con maestros + eventos</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[var(--brand-naranja)]">4.</span>
                <span><strong>Valida Normativa:</strong> DS 132, Ley 19.300, DS 248, Ley 20.551 deben estar correctos desde el inicio</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-[var(--brand-naranja)]">5.</span>
                <span><strong>Simula Flujos Críticos:</strong> Antes de producción, prueba: Sensor → OT → Costo y Incidente → RCA → Cierre</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
