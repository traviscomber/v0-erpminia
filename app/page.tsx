'use client';

import Link from 'next/link';
import Script from 'next/script';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Map, CheckCircle2, BarChart3, HelpCircle, ArrowRight, FileText, Package, Wrench, Shield, Cpu, FolderOpen } from 'lucide-react';
import { organizationSchema, productSchema, faqSchema } from '@/lib/schema-markup';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Schema Markup */}
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        strategy="afterInteractive"
      />
      <Script
        id="product-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        strategy="afterInteractive"
      />
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema[0]) }}
        strategy="afterInteractive"
      />

      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="font-bold text-xl text-[var(--brand-cobre)]">Motil</div>
          <Link href="/auth/login">
            <Button className="bg-[var(--brand-cobre)] hover:bg-[var(--brand-cobre)]/90">
              Iniciar Sesión
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 md:py-32">
        <div className="text-center space-y-6 mb-16">
          <div className="inline-block px-4 py-2 rounded-sm bg-[var(--brand-cobre)]/10 border border-[var(--brand-cobre)]/20">
            <p className="text-sm font-semibold text-[var(--brand-cobre)] tracking-wide">
              SISTEMA OPERACIONAL MINERO
            </p>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold text-foreground leading-tight">
            Control Operacional Minero en Tiempo Real
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Motil conecta sensores, mantención, bodega, HSE y documentos en un flujo único: desde la alerta en terreno hasta el cierre auditado.
          </p>
          <div className="flex gap-4 justify-center pt-8">
            <Link href="/auth/login">
              <Button size="lg" className="gap-2 bg-[var(--brand-cobre)] hover:bg-[var(--brand-cobre)]/90 text-base px-8">
                Solicitar Demo
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#modules">
              <Button size="lg" variant="outline" className="gap-2 text-base px-8">
                Ver Módulos
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 border-t border-border">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-foreground mb-4">
            El Problema: Información Fragmentada en Faena
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Sensores dispersos. Órdenes de trabajo perdidas. Repuestos no localizados. HSE desconectado. Auditoría imposible.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          {[
            { icon: Cpu, label: 'Sensores Aislados', desc: 'Sin integración' },
            { icon: Wrench, label: 'Órdenes Manuales', desc: 'Sin trazabilidad' },
            { icon: Package, label: 'Bodega Ciega', desc: 'Stock descontrolado' },
            { icon: Shield, label: 'HSE Tardío', desc: 'Respuesta lenta' },
            { icon: FileText, label: 'Sin Auditoría', desc: 'Cumplimiento manual' },
          ].map((item, i) => (
            <Card key={i} className="border-border bg-card/50 hover:bg-card/80 transition-colors">
              <CardContent className="pt-6 text-center">
                <item.icon className="h-8 w-8 text-[var(--brand-cobre)] mx-auto mb-3" />
                <p className="font-semibold text-sm text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Operational Flow */}
      <section className="max-w-7xl mx-auto px-4 py-16 border-t border-border">
        <h2 className="text-4xl font-bold text-foreground mb-12 text-center">
          Flujo Operacional Integrado
        </h2>
        <div className="grid md:grid-cols-11 gap-2 items-center">
          {[
            { step: '1', label: 'Alerta', icon: Zap },
            { step: '→', label: '', icon: ArrowRight },
            { step: '2', label: 'OT Auto', icon: Wrench },
            { step: '→', label: '', icon: ArrowRight },
            { step: '3', label: 'Repuesto', icon: Package },
            { step: '→', label: '', icon: ArrowRight },
            { step: '4', label: 'HSE', icon: Shield },
            { step: '→', label: '', icon: ArrowRight },
            { step: '5', label: 'Evidencia', icon: FileText },
            { step: '→', label: '', icon: ArrowRight },
            { step: '6', label: 'KPI', icon: BarChart3 },
          ].map((item, i) => (
            item.step === '→' ? (
              <div key={i} className="text-[var(--brand-cobre)] h-5">
                <item.icon className="h-5 w-5" />
              </div>
            ) : (
              <div key={i} className="text-center">
                <div className="bg-[var(--brand-cobre)]/10 border border-[var(--brand-cobre)]/30 rounded-sm px-2 py-1 mb-2">
                  <p className="text-xs font-bold text-[var(--brand-cobre)]">{item.step}</p>
                </div>
                {item.label && (
                  <p className="text-xs font-semibold text-foreground">{item.label}</p>
                )}
              </div>
            )
          ))}
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="max-w-7xl mx-auto px-4 py-16 border-t border-border">
        <h2 className="text-4xl font-bold text-foreground mb-12 text-center">
          Módulos Operacionales
        </h2>
        <div className="grid md:grid-cols-5 gap-6">
          {[
            { icon: BarChart3, name: 'Producción', desc: 'KPIs en tiempo real, sensores integrados' },
            { icon: Wrench, name: 'Mantención', desc: 'Órdenes de trabajo, preventivo, MTTR' },
            { icon: Package, name: 'Bodega', desc: 'Stock, reorden automático, trazabilidad' },
            { icon: Shield, name: 'HSE', desc: 'Incidentes, auditoría, cumplimiento' },
            { icon: FileText, name: 'Documentos', desc: 'Contratos, normativas, evidencia auditada' },
          ].map((mod, i) => (
            <Card key={i} className="border-border bg-card">
              <CardHeader>
                <mod.icon className="h-8 w-8 text-[var(--brand-cobre)] mb-3" />
                <CardTitle>{mod.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{mod.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="max-w-7xl mx-auto px-4 py-16 border-t border-border">
        <h2 className="text-4xl font-bold text-foreground mb-12 text-center">
          Para Cada Rol
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { role: 'Operador Terreno', items: ['Alertas en tiempo real', 'Checklists HSE', 'Órdenes de trabajo'] },
            { role: 'Técnico / Jefe Mantención', items: ['MTTR optimizado', 'Stock de repuestos', 'Preventivo planificado'] },
            { role: 'Gerencia', items: ['Dashboard KPI', 'Auditoría trazable', 'Disponibilidad de equipo'] },
          ].map((section, i) => (
            <Card key={i} className="border-border bg-card">
              <CardHeader>
                <CardTitle>{section.role}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-[var(--brand-cobre)] flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Executive Benefits */}
      <section className="max-w-7xl mx-auto px-4 py-16 border-t border-border">
        <h2 className="text-4xl font-bold text-foreground mb-12 text-center">
          Beneficios Ejecutivos
        </h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { metric: '+15%', label: 'Disponibilidad de Equipos' },
            { metric: '-40%', label: 'MTTR Promedio' },
            { metric: '-25%', label: 'Costos de Mantención' },
            { metric: '100%', label: 'Trazabilidad Auditada' },
          ].map((item, i) => (
            <Card key={i} className="border-border bg-card text-center">
              <CardContent className="pt-8 pb-8">
                <p className="text-4xl font-bold text-[var(--brand-cobre)] mb-2">{item.metric}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="max-w-7xl mx-auto px-4 py-20 border-t border-border text-center">
        <h2 className="text-4xl font-bold text-foreground mb-6">
          Listo para Transformar tu Operación
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
          Conecta todos los sistemas de tu faena. Obtén visibilidad total. Optimiza disponibilidad y costos.
        </p>
        <Link href="/auth/login">
          <Button size="lg" className="gap-2 bg-[var(--brand-cobre)] hover:bg-[var(--brand-cobre)]/90 text-base px-8">
            Solicitar Demo
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 mt-20">
        <div className="max-w-7xl mx-auto px-4 py-12 text-center text-sm text-muted-foreground">
          <p>Motil © 2026 • Powered by n3uralia</p>
        </div>
      </footer>
    </div>
  );
}
