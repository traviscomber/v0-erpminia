'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, CheckCircle2, FileText, Package, Shield, Wrench, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const modules = [
  { icon: BarChart3, name: 'Producción', desc: 'Resultados diarios y seguimiento de la actividad.' },
  { icon: Wrench, name: 'Mantenimiento', desc: 'Órdenes, trabajo preventivo y control de equipos.' },
  { icon: Package, name: 'Inventario', desc: 'Existencias, movimientos e historial de repuestos.' },
  { icon: Shield, name: 'Seguridad', desc: 'Inspecciones, incidentes y cumplimiento con respaldo.' },
  { icon: FileText, name: 'Documentos', desc: 'Contratos, normas y archivos en un solo lugar.' },
];

const benefits: { title: string; text: string }[] = [
  { title: 'Operación conectada', text: 'Las áreas trabajan con la misma información.' },
  { title: 'Historial completo', text: 'Cada acción queda registrada de forma clara.' },
  { title: 'Control centralizado', text: 'Usuarios, accesos y documentos se administran en un solo lugar.' },
  { title: 'Decisiones claras', text: 'Información actualizada para actuar con mayor rapidez.' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-heading text-xl font-bold tracking-tight text-foreground">Motil</Link>
          <Button asChild>
            <Link href="/auth/login">Iniciar sesión</Link>
          </Button>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mx-auto inline-flex rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            Gestión operacional
          </p>
          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
            Una operación conectada, clara y con historial
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Producción, mantenimiento, inventario, seguridad, documentos y control financiero en un solo lugar para trabajar, revisar y decidir con claridad.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <Link href="/auth/login">Ingresar a Motil <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#areas">Explorar áreas</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-4">
          {benefits.map((item) => (
            <div key={item.title}>
              <p className="font-heading text-lg font-semibold">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="areas" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-primary">Cobertura de la operación</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Áreas de trabajo conectadas</h2>
          <p className="mt-3 text-muted-foreground">Cada área conserva su función y comparte personas, documentos e información necesaria para el trabajo diario.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {modules.map((item) => (
            <Card key={item.name}>
              <CardHeader>
                <item.icon className="mb-2 h-5 w-5 text-primary" />
                <CardTitle className="text-base">{item.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-primary">Trabajo conectado</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">Del problema al cierre</h2>
              <p className="mt-3 text-muted-foreground">Motil une el problema, la acción, los recursos y el respaldo para que la información no quede dispersa.</p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2">
              {['Alerta operacional', 'Orden de trabajo', 'Repuesto o recurso', 'Control de seguridad', 'Documento o respaldo', 'Información para decidir'].map((label, index) => (
                <li key={label} className="flex items-center gap-3 rounded-md border border-border bg-background p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
                  <span className="text-sm font-medium">{label}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <Zap className="h-6 w-6 text-primary" />
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Información clara para cada persona</h2>
            <p className="mt-3 text-muted-foreground">Operadores, supervisores, mantenedores y gerencia ven solo lo necesario para cumplir su trabajo.</p>
          </div>
          <ul className="space-y-3">
            {['Menos información repetida entre áreas', 'Acciones y respaldos en un solo lugar', 'Información ordenada por empresa y trabajo', 'Navegación consistente en computador y teléfono'].map((item) => (
              <li key={item} className="flex gap-3 rounded-md border border-border p-4 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 md:py-20">
          <h2 className="text-3xl font-bold tracking-tight">Accede a tu operación</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">Utiliza las credenciales entregadas por el administrador de tu organización.</p>
          <Button asChild size="lg" className="mt-7 gap-2">
            <Link href="/auth/login">Ingresar a Motil <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center text-sm text-muted-foreground sm:px-6">Motil 2026 · N3uralia</div>
      </footer>
    </main>
  );
}
