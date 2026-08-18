import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

const modules = {
  produccion: {
    name: 'Producción Minera',
    title: 'Software de producción minera',
    description: 'Transporte de Mineral, planta, metalurgia, geología, topografía, química y sondaje conectados a la trazabilidad operacional.',
    capabilities: ['Transporte de Mineral', 'Planta y metalurgia', 'Geología y topografía', 'Química', 'Sondaje de producción y exploración'],
  },
  mantenimiento: {
    name: 'Mantenimiento Minero',
    title: 'Software de mantenimiento minero',
    description: 'Órdenes de trabajo, activos móviles y estáticos, planificación, vehículos, historial técnico y Maestranza.',
    capabilities: ['Órdenes de trabajo', 'Equipos móviles y estáticos', 'Vehículos', 'Planificación preventiva', 'Maestranza e historial'],
  },
  inventario: {
    name: 'Inventario Minero',
    title: 'Inventario y repuestos para minería',
    description: 'Stock, reservas, movimientos, reposición y trazabilidad de repuestos y materiales para la operación.',
    capabilities: ['Stock y movimientos', 'Reservas', 'Reposición', 'Repuestos críticos', 'Historial de consumo'],
  },
  compras: {
    name: 'Compras Mineras',
    title: 'Compras y proveedores para minería',
    description: 'Cotizaciones, comparación de proveedores, órdenes de compra y seguimiento del abastecimiento.',
    capabilities: ['Cotizaciones', 'Comparación de proveedores', 'Órdenes de compra', 'Proveedores aprobados', 'Seguimiento'],
  },
  finanzas: {
    name: 'Finanzas Mineras',
    title: 'Control financiero para operaciones mineras',
    description: 'Costos, compromisos, centros de costo y trazabilidad financiera conectados a la operación.',
    capabilities: ['Centros de costo', 'Compromisos', 'Costos operacionales', 'Trazabilidad financiera', 'Resumen certificado'],
  },
  rrhh: {
    name: 'RRHH Minería',
    title: 'RRHH y desempeño para minería',
    description: 'Personas, asignaciones laborales, competencias, desempeño, evidencia operacional y ficha laboral 360°.',
    capabilities: ['Ficha laboral 360°', 'Competencias y credenciales', 'Desempeño', 'Evidencia operacional', 'Historial laboral'],
  },
  sostenibilidad: {
    name: 'Sostenibilidad y HSE',
    title: 'HSE y sostenibilidad para minería',
    description: 'Prevención de riesgos, inspecciones, EPP, medio ambiente, comunidades y cumplimiento en una misma área.',
    capabilities: ['Prevención de riesgos', 'Inspecciones', 'EPP', 'Medio ambiente', 'Comunidades y cumplimiento'],
  },
  legal: {
    name: 'Legal Minería',
    title: 'Contratos y cumplimiento para minería',
    description: 'Contratos, documentos, permisos, vencimientos y cumplimiento con trazabilidad documental.',
    capabilities: ['Contratos', 'Documentos', 'Permisos y licencias', 'Vencimientos', 'Cumplimiento'],
  },
} as const;

type ModuleSlug = keyof typeof modules;

export function generateStaticParams() {
  return Object.keys(modules).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const mod = modules[slug as ModuleSlug];
  if (!mod) return {};
  return {
    title: `${mod.title} en Chile`,
    description: `${mod.description} Parte de MOTIL Mining OS para operaciones mineras en Chile.`,
    alternates: { canonical: `/modulos/${slug}` },
  };
}

export default async function ModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mod = modules[slug as ModuleSlug];
  if (!mod) notFound();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← MOTIL Mining OS</Link>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.14em] text-primary">Módulo MOTIL</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">{mod.title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">{mod.description}</p>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Capacidades principales</h2>
          <div className="mt-5 overflow-hidden rounded-lg border bg-card">
            {mod.capabilities.map((item) => <div key={item} className="border-b px-4 py-4 text-sm font-medium last:border-0">{item}</div>)}
          </div>
        </section>

        <section className="mt-12 grid gap-8 border-t pt-10 md:grid-cols-2">
          <div><h2 className="text-xl font-semibold">Conectado al Mining OS</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">El módulo comparte contexto con las demás áreas habilitadas sin duplicar la fuente de verdad operacional.</p></div>
          <div><h2 className="text-xl font-semibold">Trazabilidad</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Las acciones relevantes mantienen historial y evidencia para revisión operacional, auditoría y toma de decisiones.</p></div>
        </section>

        <div className="mt-12 flex gap-4"><Link className="text-sm font-medium text-primary hover:underline" href="/mineria-chile">Software para minería en Chile</Link><Link className="text-sm font-medium text-primary hover:underline" href="/">Ver todos los módulos</Link></div>
      </div>
    </main>
  );
}
