'use client';

import Link from 'next/link';
import Script from 'next/script';
import { ArrowRight, BarChart3, CheckCircle2, Cpu, FileText, Package, Shield, Wrench, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { faqSchema, organizationSchema, productSchema } from '@/lib/schema-markup';

const painPoints = [
  { icon: Cpu, label: 'Sensores aislados', desc: 'Sin integración ni contexto operativo' },
  { icon: Wrench, label: 'Órdenes manuales', desc: 'Sin trazabilidad de punta a punta' },
  { icon: Package, label: 'Bodega ciega', desc: 'Stock descontrolado y sin visibilidad' },
  { icon: Shield, label: 'HSE tardío', desc: 'Respuesta lenta ante incidentes' },
  { icon: FileText, label: 'Sin auditoría', desc: 'Cumplimiento manual y disperso' },
];

const modules = [
  { icon: BarChart3, name: 'Producción', desc: 'KPIs operacionales, sensores integrados y seguimiento de actividad' },
  { icon: Wrench, name: 'Mantención', desc: 'Órdenes de trabajo, planificación preventiva y control de equipos' },
  { icon: Package, name: 'Bodega', desc: 'Stock, movimientos y trazabilidad de repuestos' },
  { icon: Shield, name: 'HSE', desc: 'Incidentes, inspecciones y cumplimiento con evidencia' },
  { icon: FileText, name: 'Documentos', desc: 'Contratos, normativas y respaldo centralizado' },
];

const roles = [
  { role: 'Operador de terreno', items: ['Alertas operacionales', 'Checklists HSE', 'Órdenes de trabajo'] },
  { role: 'Técnico / Jefe de mantención', items: ['Control de tiempos', 'Stock de repuestos', 'Preventivo planificado'] },
  { role: 'Gerencia', items: ['Dashboard KPI', 'Auditoría trazable', 'Disponibilidad de equipos'] },
];

const benefits = [
  { metric: 'Una vista', label: 'Operación conectada entre áreas' },
  { metric: 'Trazabilidad', label: 'Historial y evidencia centralizados' },
  { metric: 'Control', label: 'Seguimiento de tareas, equipos y costos' },
  { metric: 'Decisión', label: 'Indicadores para priorizar acciones' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Script id="organization-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} strategy="afterInteractive" />
      <Script id="product-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} strategy="afterInteractive" />
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema[0]) }} strategy="afterInteractive" />

      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="text-xl font-bold text-[var(--brand-cobre)]">Motil</div>
          <Button asChild className="bg-[var(--brand-cobre)] hover:bg-[var(--brand-cobre)]/90">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-4 py-16 md:py-32">
        <div className="mb-16 space-y-6 text-center">
          <div className="inline-block rounded-sm border border-[var(--brand-cobre)]/20 bg-[var(--brand-cobre)]/10 px-4 py-2">
            <p className="text-sm font-semibold tracking-wide text-[var(--brand-cobre)]">PLATAFORMA OPERACIONAL MINERA</p>
          </div>
          <h1 className="text-5xl font-bold leading-tight text-foreground md:text-7xl">Control operacional minero en tiempo real</h1>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Conecta producción, mantención, bodega, HSE, documentos y gerencia en un flujo trazable desde terreno hasta dirección.
          </p>
          <div className="flex flex-col justify-center gap-4 pt-8 sm:flex-row">
            <Button asChild size="lg" className="gap-2 bg-[var(--brand-cobre)] px-8 text-base hover:bg-[var(--brand-cobre)]/90">
              <Link href="/login">
                Ingresar a la plataforma
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="gap-2 px-8 text-base">
              <Link href="#modules">Explorar módulos</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Trazabilidad operativa para equipos que necesitan reaccionar rápido, auditar mejor y ejecutar con menos fricción.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl border-t border-border px-4 py-16">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold text-foreground">El problema: información fragmentada en faena</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Sensores dispersos. Órdenes de trabajo perdidas. Repuestos no localizados. HSE desconectado. Auditoría imposible.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {painPoints.map((item) => (
            <Card key={item.label} className="border-border bg-card/50 transition-colors hover:bg-card/80">
              <CardContent className="pt-6 text-center">
                <item.icon className="mx-auto mb-3 h-8 w-8 text-[var(--brand-cobre)]" />
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl border-t border-border px-4 py-16">
        <h2 className="mb-12 text-center text-4xl font-bold text-foreground">Flujo operacional integrado</h2>
        <p className="mx-auto mb-8 max-w-4xl text-center text-muted-foreground">
          Evento operacional &gt; alerta &gt; orden de trabajo &gt; repuestos &gt; HSE &gt; evidencia &gt; auditoría &gt; KPIs
        </p>
        <div className="grid items-center gap-2 md:grid-cols-11">
          {[
            { step: '1', label: 'Alerta', icon: Zap },
            { step: 'arrow', label: '', icon: ArrowRight },
            { step: '2', label: 'Orden de trabajo', icon: Wrench },
            { step: 'arrow', label: '', icon: ArrowRight },
            { step: '3', label: 'Repuesto', icon: Package },
            { step: 'arrow', label: '', icon: ArrowRight },
            { step: '4', label: 'HSE', icon: Shield },
            { step: 'arrow', label: '', icon: ArrowRight },
            { step: '5', label: 'Evidencia', icon: FileText },
            { step: 'arrow', label: '', icon: ArrowRight },
            { step: '6', label: 'KPI', icon: BarChart3 },
          ].map((item, index) =>
            item.step === 'arrow' ? (
              <div key={index} className="h-5 text-[var(--brand-cobre)]">
                <item.icon className="h-5 w-5" />
              </div>
            ) : (
              <div key={index} className="text-center">
                <div className="mb-2 rounded-sm border border-[var(--brand-cobre)]/30 bg-[var(--brand-cobre)]/10 px-2 py-1">
                  <p className="text-xs font-bold text-[var(--brand-cobre)]">{item.step}</p>
                </div>
                <p className="text-xs font-semibold text-foreground">{item.label}</p>
              </div>
            ),
          )}
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-7xl border-t border-border px-4 py-16">
        <h2 className="mb-12 text-center text-4xl font-bold text-foreground">Módulos operacionales</h2>
        <div className="grid gap-6 md:grid-cols-5">
          {modules.map((mod) => (
            <Card key={mod.name} className="border-border bg-card">
              <CardHeader>
                <mod.icon className="mb-3 h-8 w-8 text-[var(--brand-cobre)]" />
                <CardTitle>{mod.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{mod.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl border-t border-border px-4 py-16">
        <h2 className="mb-12 text-center text-4xl font-bold text-foreground">Para cada rol</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {roles.map((section) => (
            <Card key={section.role} className="border-border bg-card">
              <CardHeader>
                <CardTitle>{section.role}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--brand-cobre)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl border-t border-border px-4 py-16">
        <h2 className="mb-12 text-center text-4xl font-bold text-foreground">Beneficios ejecutivos</h2>
        <div className="grid gap-6 md:grid-cols-4">
          {benefits.map((item) => (
            <Card key={item.label} className="border-border bg-card text-center">
              <CardContent className="pb-8 pt-8">
                <p className="mb-2 text-2xl font-bold text-[var(--brand-cobre)]">{item.metric}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl border-t border-border px-4 py-20 text-center">
        <h2 className="mb-6 text-4xl font-bold text-foreground">Una operación conectada y trazable</h2>
        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
          Producción, mantención, bodega, HSE, documentos y gerencia en una sola plataforma operacional.
        </p>
        <Button asChild size="lg" className="gap-2 bg-[var(--brand-cobre)] px-8 text-base hover:bg-[var(--brand-cobre)]/90">
          <Link href="/login">
            Ingresar a Motil
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>

      <footer className="mt-20 border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center text-sm text-muted-foreground">
          <p>Motil 2026 · N3uralia</p>
        </div>
      </footer>
    </div>
  );
}
