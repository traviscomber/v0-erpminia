import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Software para minería en Chile',
  description: 'MOTIL Mining OS conecta producción, mantenimiento, inventario, compras, finanzas, RRHH, HSE y legal para operaciones mineras en Chile.',
  alternates: { canonical: '/mineria-chile' },
};

const areas = [
  ['Producción', 'produccion', 'Transporte de Mineral, planta, metalurgia, geología, topografía, química y sondaje.'],
  ['Mantenimiento', 'mantenimiento', 'OT, activos, planificación, vehículos, repuestos y Maestranza.'],
  ['Inventario', 'inventario', 'Stock, reservas, repuestos, reposición y trazabilidad de materiales.'],
  ['Compras', 'compras', 'Cotizaciones, comparación de proveedores y órdenes de compra.'],
  ['Finanzas', 'finanzas', 'Costos, compromisos, centros de costo y trazabilidad financiera.'],
  ['RRHH', 'rrhh', 'Personas, competencias, desempeño y evidencia laboral y operacional.'],
  ['Sostenibilidad', 'sostenibilidad', 'HSE, prevención de riesgos, EPP, ambiente, comunidades y cumplimiento.'],
  ['Legal', 'legal', 'Contratos, documentos, permisos, vencimientos y cumplimiento.'],
];

const faq = [
  {
    q: '¿Qué es MOTIL Mining OS?',
    a: 'MOTIL es un sistema operativo modular para operaciones mineras. Conecta áreas operacionales y administrativas mediante una trazabilidad común de personas, activos, órdenes, documentos, costos y evidencia.',
  },
  {
    q: '¿En qué se diferencia de un ERP minero genérico?',
    a: 'MOTIL organiza el producto alrededor de flujos propios de minería, como Producción, Mantenimiento, HSE, Maestranza, Transporte de Mineral, Planta, Metalurgia, Sondaje y evidencia operacional, además de las funciones administrativas habituales.',
  },
  {
    q: '¿Se puede implementar por módulos?',
    a: 'Sí. Producción, Mantenimiento, Inventario, Compras, Finanzas, RRHH, Sostenibilidad y Legal se plantean como módulos comerciales independientes que comparten una arquitectura común.',
  },
  {
    q: '¿MOTIL está orientado a Chile?',
    a: 'Sí. El posicionamiento público, terminología y arquitectura funcional están orientados a operaciones mineras en Chile. MOTIL no afirma certificaciones, aprobaciones regulatorias ni resultados de clientes que no estén documentados públicamente.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

export default function MineriaChilePage() {
  return (
    <main className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← MOTIL Mining OS</Link>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.14em] text-primary">Minería · Chile</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">Software operacional para conectar una faena minera completa</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">MOTIL es un Mining Operating System modular orientado a operaciones mineras que necesitan trabajar con una misma trazabilidad entre mina, planta, mantenimiento, personas, seguridad, abastecimiento, finanzas y cumplimiento.</p>

        <section className="mt-12 overflow-hidden rounded-lg border bg-card" aria-label="Módulos de MOTIL Mining OS">
          {areas.map(([name, slug, desc]) => (
            <Link key={slug} href={`/modulos/${slug}`} className="grid gap-2 border-b px-4 py-4 last:border-0 hover:bg-muted/30 sm:grid-cols-[200px_1fr_24px] sm:items-center">
              <h2 className="font-semibold">{name}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
              <ArrowRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </Link>
          ))}
        </section>

        <section className="mt-14 grid gap-8 md:grid-cols-2">
          <div><h2 className="text-2xl font-semibold">Trazabilidad operacional</h2><p className="mt-3 leading-relaxed text-muted-foreground">Cada módulo conserva su responsabilidad, pero conecta personas, activos, órdenes, evidencia, documentos y centros de costo mediante identificadores canónicos.</p></div>
          <div><h2 className="text-2xl font-semibold">Implementación modular</h2><p className="mt-3 leading-relaxed text-muted-foreground">Una operación puede habilitar sólo las áreas que necesita y ampliar cobertura sin construir sistemas paralelos ni perder historial.</p></div>
        </section>

        <section className="mt-14 border-t pt-10">
          <h2 className="text-2xl font-semibold">Preguntas sobre MOTIL</h2>
          <div className="mt-5 divide-y rounded-lg border bg-card">
            {faq.map((item) => <article key={item.q} className="p-5"><h3 className="font-semibold">{item.q}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p></article>)}
          </div>
        </section>

        <section className="mt-14 border-t pt-10"><h2 className="text-2xl font-semibold">MOTIL Mining OS</h2><p className="mt-3 max-w-2xl text-muted-foreground">Una capa operacional común para ordenar la información de terreno, convertirla en evidencia y mantener continuidad entre áreas.</p><Button asChild className="mt-6 gap-2"><Link href="/auth/login">Ingresar a MOTIL <ArrowRight className="h-4 w-4"/></Link></Button></section>
      </div>
    </main>
  );
}
