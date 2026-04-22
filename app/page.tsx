'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandCard } from '@/components/ui/brand-card';
import { Zap, Map, CheckCircle2, BarChart3, HelpCircle, ArrowRight, FileText, Package, Wrench, Shield, Cpu, FolderOpen } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="font-bold text-xl text-[var(--brand-naranja)]">n3uralia ERP</div>
          <Link href="/auth/login">
            <Button className="bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90">
              Iniciar Sesión
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="text-center space-y-6 mb-16">
          <div className="inline-block px-4 py-2 rounded-full bg-[var(--brand-naranja)]/10 border border-[var(--brand-naranja)]/20">
            <p className="text-sm font-semibold text-[var(--brand-naranja)]">
              Desarrollado por n3uralia para Cía. Minera La Patagua
            </p>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-foreground">
            n3uralia ERP Minería
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Plataforma integral de gestión operacional minera. Producción, Mantención, Bodega, HSE y Documentos integrados. De sensor a decisión ejecutiva en tiempo real.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link href="/auth/login">
              <Button size="lg" className="gap-2 bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90">
                Solicitar Demo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#modules">
              <Button size="lg" variant="outline" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Ver Módulos
              </Button>
            </Link>
          </div>
        </div>

        {/* Core Values */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          <BrandCard>
            <CardHeader>
              <Zap className="h-8 w-8 text-[var(--brand-naranja)] mb-2" />
              <CardTitle>Seguridad Primero</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Alertas en tiempo real, trazabilidad completa y reportes de riesgo para proteger a tu equipo.
              </p>
            </CardContent>
          </BrandCard>

          <BrandCard>
            <CardHeader>
              <CheckCircle2 className="h-8 w-8 text-[var(--brand-verde)] mb-2" />
              <CardTitle>Operaciones Eficientes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Automatiza mantenimiento, optimiza inventario y reduce tiempos de inactividad.
              </p>
            </CardContent>
          </BrandCard>

          <BrandCard>
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-[var(--brand-gold)] mb-2" />
              <CardTitle>Decisiones Informadas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Reportes detallados y métricas clave para impulsar mejoras continuas.
              </p>
            </CardContent>
          </BrandCard>
        </div>
      </section>

      {/* Features Section */}
      <section id="modules" className="bg-muted/50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">5 Módulos Integrados</h2>
            <p className="text-muted-foreground text-lg">
              Plataforma completa de gestión operacional minera integrada en tiempo real
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
            {/* Producción */}
            <Card className="border-l-4 border-l-[var(--brand-naranja)]">
              <CardHeader>
                <Zap className="h-8 w-8 text-[var(--brand-naranja)] mb-2" />
                <CardTitle className="text-base">Producción</CardTitle>
                <CardDescription>OT Real-time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs">
                  Monitoreo en vivo de equipos, sensores y KPIs operacionales
                </p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-naranja)]">→</span>
                    Sensores & Telemetría
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-naranja)]">→</span>
                    Alarmas en vivo
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-naranja)]">→</span>
                    KPIs de equipos
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Mantención */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <Wrench className="h-8 w-8 text-purple-500 mb-2" />
                <CardTitle className="text-base">Mantención</CardTitle>
                <CardDescription>OT Jerárquicas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs">
                  Árbol de fallas y órdenes de trabajo anidadas
                </p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-purple-500">→</span>
                    Diagnóstico automático
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-500">→</span>
                    OT paralelas
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-500">→</span>
                    MTTR tracking
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Bodega */}
            <Card className="border-l-4 border-l-[var(--brand-verde)]">
              <CardHeader>
                <Package className="h-8 w-8 text-[var(--brand-verde)] mb-2" />
                <CardTitle className="text-base">Bodega</CardTitle>
                <CardDescription>Control Total</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs">
                  Gestión completa de inventario con trazabilidad QR
                </p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-verde)]">→</span>
                    Códigos QR
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-verde)]">→</span>
                    FIFO automático
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-verde)]">→</span>
                    Stock alerts
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* HSE & Compliance */}
            <Card className="border-l-4 border-l-[var(--brand-rojo)]">
              <CardHeader>
                <Shield className="h-8 w-8 text-[var(--brand-rojo)] mb-2" />
                <CardTitle className="text-base">HSE</CardTitle>
                <CardDescription>Compliance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs">
                  Seguridad, incidentes y cumplimiento normativo
                </p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-rojo)]">→</span>
                    Matriz de riesgos
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-rojo)]">→</span>
                    Incidentes & RCA
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-rojo)]">→</span>
                    Auditorías
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Gestión Documental */}
            <Card className="border-l-4 border-l-[var(--brand-gold)]">
              <CardHeader>
                <FolderOpen className="h-8 w-8 text-[var(--brand-gold)] mb-2" />
                <CardTitle className="text-base">Documentos</CardTitle>
                <CardDescription>Central</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs">
                  Contratos, procedimientos y reportes versionados
                </p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-gold)]">→</span>
                    Contratos & OC
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-gold)]">→</span>
                    Procedimientos
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-gold)]">→</span>
                    Versionado
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Integrated Workflow Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">La Cascada Completa: De Sensor a Decisión</h2>
          <p className="text-muted-foreground text-lg">
            Cómo los 5 módulos se comunican automáticamente en una operación real
          </p>
        </div>

        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Producción */}
          <div className="bg-background rounded-lg border border-[var(--brand-naranja)]/20 p-6">
            <div className="flex gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-naranja)] text-white font-bold text-sm">1</div>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[var(--brand-naranja)]">Producción: Sensor Detecta Anomalía</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Sensor de vibración en excavadora dispara alerta. Sistema identifica equipoafectado y posible modo de falla.
                </p>
              </div>
            </div>
          </div>

          {/* Mantención */}
          <div className="bg-background rounded-lg border border-purple-500/20 p-6 ml-8">
            <div className="flex gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 text-white font-bold text-sm">2</div>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-purple-600">Mantención: OT Automática Creada</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  OT se genera automáticamente con árbol de fallas sugerido. Técnicos reciben asignación en sus tablets. Sistema asigna técnicos paralelos por componente.
                </p>
              </div>
            </div>
          </div>

          {/* Bodega */}
          <div className="bg-background rounded-lg border border-[var(--brand-verde)]/20 p-6 ml-16">
            <div className="flex gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-verde)] text-white font-bold text-sm">3</div>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[var(--brand-verde)]">Bodega: Stock Reservado</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Piezas necesarias se reservan automáticamente. Si falta algo, se dispara reorden. Código QR scanea cada movimiento.
                </p>
              </div>
            </div>
          </div>

          {/* HSE */}
          <div className="bg-background rounded-lg border border-[var(--brand-rojo)]/20 p-6 ml-24">
            <div className="flex gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-rojo)] text-white font-bold text-sm">4</div>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[var(--brand-rojo)]">HSE: Alertas & Requisitos</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Incidente registrado automáticamente. Se disparan requisitos normativos si aplican. Checklists de seguridad obligatorios en la OT.
                </p>
              </div>
            </div>
          </div>

          {/* Documentos */}
          <div className="bg-background rounded-lg border border-[var(--brand-gold)]/20 p-6 ml-32">
            <div className="flex gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-gold)] text-white font-bold text-sm">5</div>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[var(--brand-gold)]">Documentos: Cierre & Auditoría</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  OT cierra con evidencia (fotos, firmas). Documentos versionados y almacenados. Auditoría completa del incidente: qué, quién, cuándo, cuánto costó, qué se usó.
                </p>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-[var(--brand-naranja)]/5 rounded-lg border border-[var(--brand-naranja)]/30 p-6 mt-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-naranja)] text-white font-bold text-sm">✓</div>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Resultado: Dashboard Ejecutivo</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Gerencia ve MTTR, costo total del incidente, patrón de fallas, stock consumido, cumplimiento HSE. Todo vinculado, ningún dato duplicado, decisiones informadas en tiempo real.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles Section - Elegant & Sophisticated */}
      <section className="max-w-7xl mx-auto px-4 py-24">
        <div className="text-center mb-20">
          <h2 className="text-5xl font-bold mb-6">Diseñado para Cada Rol</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Cada persona accede exactamente a lo que necesita. Controles granulares, auditoría completa, vistas personalizadas.
          </p>
        </div>

        {/* Roles Grid - Clean & Minimal */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              role: 'Operador de Producción',
              icon: '⚙️',
              accentColor: 'border-t-2 border-t-[var(--brand-naranja)]',
              badgeBg: 'bg-[var(--brand-naranja)]/10 text-[var(--brand-naranja)]',
              badge: '4 módulos',
              description: 'Monitorea la operación en vivo, detecta anomalías y reporta fallas en tiempo real.',
              modules: ['Producción', 'Alertas'],
              tasks: ['Monitorear sensores', 'Detectar anomalías', 'Reportar fallas', 'Ver KPIs']
            },
            {
              role: 'Jefe de Mantención',
              icon: '👷',
              accentColor: 'border-t-2 border-t-purple-400',
              badgeBg: 'bg-purple-400/10 text-purple-400',
              badge: '9 módulos',
              description: 'Gestiona la mantención completa, asigna OT y supervisa progreso en vivo.',
              modules: ['Mantención', 'Work-Orders', 'Bodega', '+2'],
              tasks: ['Crear y asignar OT', 'Monitorear progreso', 'Resolver bloqueos', 'Analizar MTTR']
            },
            {
              role: 'Técnico de Campo',
              icon: '🔧',
              accentColor: 'border-t-2 border-t-sky-400',
              badgeBg: 'bg-sky-400/10 text-sky-400',
              badge: '4 módulos',
              description: 'Recibe OT en móvil/tablet con checklist, QR y captura de evidencia offline-first.',
              modules: ['Mantención', 'Work-Orders', 'Bodega'],
              tasks: ['Recibir OT', 'Checklist móvil', 'Escanear QR', 'Adjuntar evidencia']
            },
            {
              role: 'Responsable Bodega',
              icon: '📦',
              accentColor: 'border-t-2 border-t-emerald-400',
              badgeBg: 'bg-emerald-400/10 text-emerald-400',
              badge: '5 módulos',
              description: 'Controla inventario, stock y reórdenes automáticas con trazabilidad FIFO.',
              modules: ['Bodega', 'Inventario', 'Compras', '+1'],
              tasks: ['Recibir materiales', 'Gestionar stock', 'Escanear QR', 'Alertas stock']
            },
            {
              role: 'Oficial HSE/Compliance',
              icon: '✅',
              accentColor: 'border-t-2 border-t-amber-400',
              badgeBg: 'bg-amber-400/10 text-amber-400',
              badge: '10 módulos',
              description: 'Auditoría completa de OT, documentos, checklists y cumplimiento normativo.',
              modules: ['HSE', 'Documentos', 'Mantención', '+2'],
              tasks: ['Auditar OT', 'Ver documentos', 'Revisar checklists', 'Reportes']
            },
            {
              role: 'Supervisor/Gerencia',
              icon: '📊',
              accentColor: 'border-t-2 border-t-[var(--brand-naranja)]',
              badgeBg: 'bg-[var(--brand-naranja)]/15 text-[var(--brand-naranja)] font-semibold',
              badge: 'ACCESO TOTAL',
              description: 'Dashboard ejecutivo integral con KPIs, costos, tendencias y ROI en tiempo real.',
              modules: ['Todos', 'los', 'módulos'],
              tasks: ['Dashboard KPIs', 'Análisis costos', 'Tendencias fallas', 'ROI preventivo']
            },
          ].map((item, i) => (
            <div
              key={i}
              className={`${item.accentColor} rounded-xl bg-card/50 backdrop-blur-sm border border-border/40 p-6 hover:border-border/60 hover:bg-card/70 transition-all duration-300 group hover:shadow-md`}
            >
              <div className="flex justify-between items-start mb-4">
                <span className="text-4xl group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
                <span className={`${item.badgeBg} text-xs font-semibold px-3 py-1 rounded-lg`}>
                  {item.badge}
                </span>
              </div>

              <h3 className="text-lg font-bold mb-1.5 text-foreground">{item.role}</h3>
              <p className="text-sm text-muted-foreground mb-5">{item.description}</p>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wide mb-2">Acceso a</p>
                  <div className="flex flex-wrap gap-2">
                    {item.modules.map((mod, j) => (
                      <span
                        key={j}
                        className="text-xs px-2.5 py-1 rounded-md bg-muted/60 border border-border/30 text-foreground/80 font-medium"
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-border/20 pt-4">
                  <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-wide mb-2">Funciones</p>
                  <ul className="space-y-1.5">
                    {item.tasks.map((task, j) => (
                      <li key={j} className="flex gap-2.5 text-sm">
                        <span className="text-muted-foreground/40 font-light">−</span>
                        <span className="text-foreground/80">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link href="/dashboard/roles">
            <Button size="lg" className="gap-2 bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90 text-white shadow-sm">
              Ver Matriz de Permisos Detallada
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Trust & Features Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Construido para Operaciones Mineras Complejas</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">📡 Monitoreo 24/7</h3>
            <p className="text-sm text-muted-foreground">Sensores en vivo, alarmas automáticas, detección temprana de anomalías antes de que causen paradas costosas.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">🔒 Auditoría Completa</h3>
            <p className="text-sm text-muted-foreground">Historial inmutable de cada evento, quién hizo qué, cuándo. Trazabilidad legal para cumplimiento regulatorio.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">📱 Acceso Móvil</h3>
            <p className="text-sm text-muted-foreground">Técnicos en el campo con tablets/móvil. Trabajo offline sincronizado automáticamente. Cero downtime.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">🎯 Trazabilidad QR</h3>
            <p className="text-sm text-muted-foreground">Escanea equipos, piezas, ubicaciones. Sabe exactamente dónde está cada asset y su histórico completo.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">⏱️ Reportes en Vivo</h3>
            <p className="text-sm text-muted-foreground">Dashboards actualizados cada minuto. MTTR, costos, stock, KPIs de seguridad. Decisiones informadas en tiempo real.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">🔗 Integración Total</h3>
            <p className="text-sm text-muted-foreground">Todos los módulos se comunican automáticamente. De sensor a decisión ejecutiva, sin intervención manual. Un único fuente de verdad.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">🛡️ HSE First</h3>
            <p className="text-sm text-muted-foreground">Alertas de riesgo, checklists de seguridad obligatorios, cumplimiento normativo automático integrado.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">📊 Analytics Avanzado</h3>
            <p className="text-sm text-muted-foreground">Identifica patrones de fallas, optimiza frecuencia de mantención preventiva, calcula ROI por activo.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">⚡ Automatización Inteligente</h3>
            <p className="text-sm text-muted-foreground">OT automáticas, reservas de stock, alertas, RCA sugeridos. Reduce trabajo manual, acelera tiempo de respuesta.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[var(--brand-naranja)] text-white py-20">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-4xl font-bold">Listo para Transformar tus Operaciones</h2>
          <p className="text-lg opacity-90">
            Accede a una demo guiada del sistema completo. Conoce cómo mantenimiento, inventario y documentos se integran en una única plataforma.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/dashboard">
              <Button size="lg" className="bg-white text-[var(--brand-naranja)] hover:bg-gray-100 gap-2">
                Ir al Sistema
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10 gap-2" asChild>
              <Link href="/dashboard/roles">
                Ver Roles y Permisos
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10 gap-2" asChild>
              <Link href="/dashboard/guias">
                Documentación
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
              ERP SegurIA © 2026 • Powered by <a href="https://n3uralia.com" target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline">n3uralia</a>
          </p>
          <p className="text-sm text-muted-foreground">
            Una iniciativa de <span className="font-semibold">Cía. Minera La Patagua</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
