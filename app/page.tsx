'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandCard } from '@/components/ui/brand-card';
import { Zap, Map, CheckCircle2, BarChart3, HelpCircle, ArrowRight } from 'lucide-react';

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
          <h1 className="text-5xl md:text-6xl font-bold text-foreground">
            Gestión Minera Inteligente
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            ERP SegurIA es la plataforma integral de La Patagua para gestionar operaciones mineras con seguridad, eficiencia y sostenibilidad. Diseñada para equipos que toman decisiones críticas.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link href="/auth/login">
              <Button size="lg" className="gap-2 bg-[var(--brand-naranja)] hover:bg-[var(--brand-naranja)]/90">
                Explorar la Plataforma
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="gap-2">
                <HelpCircle className="h-4 w-4" />
                Conocer Más
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
      <section id="features" className="bg-muted/50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">3 Módulos Integrados</h2>
            <p className="text-muted-foreground text-lg">
              Todo lo que necesitas para gestionar operaciones mineras en una sola plataforma
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Árbol de Fallas */}
            <Card className="border-l-4 border-l-[var(--brand-naranja)]">
              <CardHeader>
                <Map className="h-8 w-8 text-[var(--brand-naranja)] mb-2" />
                <CardTitle>Árbol de Fallas</CardTitle>
                <CardDescription>Diagnóstico Inteligente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  Mapeo jerárquico de vehículos y componentes con identificación automática de modos de falla.
                </p>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-naranja)]">→</span>
                    Visualización de componentes expandible
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-naranja)]">→</span>
                    Síntomas y causas probables
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-naranja)]">→</span>
                    Piezas de desgaste asociadas
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Órdenes de Trabajo */}
            <Card className="border-l-4 border-l-[var(--brand-verde)]">
              <CardHeader>
                <CheckCircle2 className="h-8 w-8 text-[var(--brand-verde)] mb-2" />
                <CardTitle>Órdenes de Trabajo</CardTitle>
                <CardDescription>Gestión Jerárquica</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  Sistema de OT anidadas que permite trabajo paralelo de múltiples técnicos.
                </p>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-verde)]">→</span>
                    OT principal + Sub-OTs por componente
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-verde)]">→</span>
                    Asignación de técnicos y piezas
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-verde)]">→</span>
                    Tracking de progreso en tiempo real
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Inventario */}
            <Card className="border-l-4 border-l-[var(--brand-rojo)]">
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-[var(--brand-rojo)] mb-2" />
                <CardTitle>Inventario & Bodega</CardTitle>
                <CardDescription>Control Total</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  Gestión completa de recepción, almacenamiento y despacho con trazabilidad FIFO.
                </p>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-rojo)]">→</span>
                    Códigos QR y trazabilidad
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-rojo)]">→</span>
                    Alertas de bajo stock
                  </li>
                  <li className="flex gap-2">
                    <span className="text-[var(--brand-rojo)]">→</span>
                    Control de vencimientos
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Flujo de Trabajo Típico</h2>
          <p className="text-muted-foreground text-lg">
            De la identificación del problema a la acción correctiva en minutos
          </p>
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          {[
            { num: '1', title: 'Identificar Problema', desc: 'Accede al árbol de fallas del vehículo y selecciona el componente afectado' },
            { num: '2', title: 'Ver Modos de Falla', desc: 'Visualiza síntomas, causas probables y piezas de desgaste relacionadas' },
            { num: '3', title: 'Crear Orden', desc: 'Genera una OT jerárquica con componentes, técnicos y piezas asignadas' },
            { num: '4', title: 'Ejecutar & Trackear', desc: 'Los técnicos trabajan en paralelo. El sistema actualiza progreso automáticamente' },
            { num: '5', title: 'Reportes & Análisis', desc: 'Obtén métricas de costos, tiempos y eficiencia para optimizar futuros mantenimientos' },
          ].map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-naranja)] text-white font-bold">
                  {step.num}
                </div>
              </div>
              <div className="flex-1 pt-1">
                <h3 className="font-semibold text-lg">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-[var(--brand-naranja)] text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-4xl font-bold">Listo para Optimizar tus Operaciones</h2>
          <p className="text-lg opacity-90">
            Accede a la plataforma completa con onboarding interactivo que te guiará paso a paso.
          </p>
          <Link href="/auth/login">
            <Button size="lg" className="bg-white text-[var(--brand-naranja)] hover:bg-gray-100 gap-2">
              Comienza Ahora
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
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
