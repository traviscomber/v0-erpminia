'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandCard } from '@/components/ui/brand-card';
import { Zap, Map, CheckCircle2, BarChart3, HelpCircle, ArrowRight, FileText, Package, Wrench } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="font-bold text-xl text-[var(--brand-naranja)]">ERP SegurIA</div>
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
            ERP SegurIA
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Plataforma integral de gestión operacional minera. De la identificación de fallas hasta el reporte de costos, todo integrado en un solo sistema.
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
            <h2 className="text-4xl font-bold mb-4">3 Módulos Integrados</h2>
            <p className="text-muted-foreground text-lg">
              Todo lo que necesitas para gestionar operaciones mineras en una sola plataforma
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Mantenimiento de Maquinarias */}
            <Card className="border-l-4 border-l-[var(--brand-naranja)]">
              <CardHeader>
                <Wrench className="h-8 w-8 text-[var(--brand-naranja)] mb-2" />
                <CardTitle>Mantenimiento de Maquinarias</CardTitle>
                <CardDescription>Árbol de Fallas & OT</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  Sistema integrado de diagnóstico y gestión de órdenes de trabajo jerárquicas con trabajo paralelo de técnicos.
                </p>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-naranja)]">→</span>
                    Árbol de fallas con modos de falla
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-naranja)]">→</span>
                    Órdenes anidadas por componente
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-naranja)]">→</span>
                    Tracking de progreso en tiempo real
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Inventario y Bodega */}
            <Card className="border-l-4 border-l-[var(--brand-verde)]">
              <CardHeader>
                <Package className="h-8 w-8 text-[var(--brand-verde)] mb-2" />
                <CardTitle>Inventario y Bodega</CardTitle>
                <CardDescription>Control Total</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  Gestión completa de recepción, almacenamiento y despacho con trazabilidad FIFO y códigos QR.
                </p>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-verde)]">→</span>
                    Códigos QR y trazabilidad completa
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-verde)]">→</span>
                    Alertas de bajo stock automáticas
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-verde)]">→</span>
                    Control de vencimientos FIFO
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Gestión Documental */}
            <Card className="border-l-4 border-l-[var(--brand-rojo)]">
              <CardHeader>
                <FileText className="h-8 w-8 text-[var(--brand-rojo)] mb-2" />
                <CardTitle>Gestión Documental</CardTitle>
                <CardDescription>Trazabilidad Legal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  Gestión centralizada de documentos, reportes y registros de cumplimiento normativo y HSE.
                </p>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-rojo)]">→</span>
                    Almacenamiento centralizado seguro
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-rojo)]">→</span>
                    Versionado y auditoría completa
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-rojo)]">→</span>
                    Cumplimiento normativo HSE
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Integrated Workflow Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 bg-muted/30 rounded-2xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">El Flujo Integrado: De Falla a Cierre</h2>
          <p className="text-muted-foreground text-lg">
            Cómo los 3 módulos trabajan juntos en una operación real de minería
          </p>
        </div>

        <div className="space-y-6 max-w-4xl mx-auto">
          {/* Mantenimiento */}
          <div className="bg-background rounded-lg border border-[var(--brand-naranja)]/20 p-6">
            <div className="flex gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-naranja)] text-white font-bold text-sm">1-3</div>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[var(--brand-naranja)]">Mantenimiento: Identificar → Diagnosticar → Crear OT</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Técnico identifica falla en excavadora → Sistema muestra árbol de fallas → Selecciona modo de falla probable → Sistema sugiere piezas necesarias → OT se crea automáticamente con técnicos y componentes asignados
                </p>
              </div>
            </div>
          </div>

          {/* Inventario */}
          <div className="bg-background rounded-lg border border-[var(--brand-verde)]/20 p-6">
            <div className="flex gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-verde)] text-white font-bold text-sm">4-5</div>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[var(--brand-verde)]">Inventario: Reservar → Consumir → Reponer</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  OT solicita piezas → Bodega las reserva → Técnico las consume en el sitio (código QR) → Sistema actualiza stock automáticamente → Alerta si cae bajo mínimo → Se genera reorden
                </p>
              </div>
            </div>
          </div>

          {/* Documental */}
          <div className="bg-background rounded-lg border border-[var(--brand-rojo)]/20 p-6">
            <div className="flex gap-4 mb-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-rojo)] text-white font-bold text-sm">6-7</div>
              </div>
              <div>
                <h3 className="font-semibold text-lg text-[var(--brand-rojo)]">Documental: Evidencia → Cierre → Auditoría</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Técnico adjunta fotos, checklist firmado, y manual de procedimiento a la OT → Sistema cierra OT → Documentos quedan asociados y versionados → Auditoría: historial completo de intervención, costos, tiempo, stock usado
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
                <h3 className="font-semibold text-lg">Resultado: Datos Integrados</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Gerencia ve en dashboards: MTTR, costo por activo, patrón de fallas repetidas, consumo de stock, cumplimiento HSE. Todo vinculado, nada duplicado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Diseñado para Cada Rol</h2>
          <p className="text-muted-foreground text-lg">
            Cada persona en tu equipo ve exactamente lo que necesita
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              role: 'Jefe de Mantención',
              icon: '👷',
              tasks: ['Asignar OT', 'Ver progreso en tiempo real', 'Resolver bloqueos', 'Analizar MTTR']
            },
            {
              role: 'Técnico de Campo',
              icon: '🔧',
              tasks: ['Recibir OT', 'Checklist en tablet/móvil', 'Consumir piezas (QR)', 'Adjuntar evidencia']
            },
            {
              role: 'Responsable Bodega',
              icon: '📦',
              tasks: ['Recibir materiales', 'Gestionar stock', 'Escanear movimientos', 'Alertas de bajo stock']
            },
            {
              role: 'HSE/Compliance',
              icon: '✅',
              tasks: ['Auditar OT cerradas', 'Ver documentos versionados', 'Checklists firmados', 'Reportes de cumplimiento']
            },
            {
              role: 'Supervisor/Gerencia',
              icon: '📊',
              tasks: ['Dashboard de KPIs', 'Análisis de costos', 'Tendencias de fallas', 'ROI preventivo']
            },
            {
              role: 'Contratistas',
              icon: '🤝',
              tasks: ['Documentos requeridos', 'OT asignadas', 'Historial de trabajos', 'Evaluación']
            },
          ].map((item, i) => (
            <BrandCard key={i}>
              <CardHeader>
                <div className="text-3xl mb-2">{item.icon}</div>
                <CardTitle className="text-lg">{item.role}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  {item.tasks.map((task, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="text-[var(--brand-naranja)]">•</span>
                      {task}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </BrandCard>
          ))}
        </div>
      </section>

      {/* Trust & Features Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Construido para Confianza Operacional</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">🔒 Auditoría Completa</h3>
            <p className="text-sm text-muted-foreground">Historial inmutable de cada cambio, quién lo hizo y cuándo. Trazabilidad legal para cumplimiento.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">📱 Acceso Móvil & Offline</h3>
            <p className="text-sm text-muted-foreground">Técnicos trabajan sin conexión. La app sincroniza cuando regresa la cobertura. Cero downtime de campo.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">🎯 Trazabilidad QR</h3>
            <p className="text-sm text-muted-foreground">Escanea piezas, equipos, ubicaciones. Sabe exactamente dónde está cada asset y su histórico.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">⏱️ Reportes en Vivo</h3>
            <p className="text-sm text-muted-foreground">Dashboards actualizados cada minuto. MTTR, costos, stock, KPIs de seguridad en tiempo real.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">🔗 Integración Total</h3>
            <p className="text-sm text-muted-foreground">Mantenimiento, inventario y documentos hablan entre sí. Datos sincronizados, un único fuente de verdad.</p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">🛡️ HSE First</h3>
            <p className="text-sm text-muted-foreground">Alertas de riesgo, checklists de seguridad obligatorios, cumplimiento normativo automático.</p>
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
            <Link href="/auth/login">
              <Button size="lg" className="bg-white text-[var(--brand-naranja)] hover:bg-gray-100 gap-2">
                Solicitar Demo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10 gap-2" asChild>
              <Link href="/dashboard/guias">
                Ver Documentación
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
