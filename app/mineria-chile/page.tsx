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
  ['Producción', 'Transporte de Mineral, planta, metalurgia, geología, topografía, química y sondaje.'],
  ['Mantenimiento', 'OT, activos, planificación, vehículos, repuestos y Maestranza.'],
  ['Inventario y Compras', 'Stock, reservas, cotizaciones, proveedores y trazabilidad de abastecimiento.'],
  ['RRHH y HSE', 'Personas, competencias, desempeño, EPP, seguridad y evidencia laboral.'],
  ['Finanzas y Legal', 'Costos, centros de costo, contratos, documentos y cumplimiento.'],
];

export default function MineriaChilePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← MOTIL Mining OS</Link>
        <p className="mt-10 text-sm font-semibold uppercase tracking-[0.14em] text-primary">Minería · Chile</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl">Software operacional para conectar una faena minera completa</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">MOTIL es un Mining Operating System modular orientado a operaciones mineras que necesitan trabajar con una misma trazabilidad entre mina, planta, mantenimiento, personas, seguridad, abastecimiento, finanzas y cumplimiento.</p>

        <section className="mt-12 overflow-hidden rounded-lg border bg-card">
          {areas.map(([name, desc]) => <div key={name} className="grid gap-2 border-b px-4 py-4 last:border-0 sm:grid-cols-[200px_1fr]"><h2 className="font-semibold">{name}</h2><p className="text-sm leading-relaxed text-muted-foreground">{desc}</p></div>)}
        </section>

        <section className="mt-14 grid gap-8 md:grid-cols-2">
          <div><h2 className="text-2xl font-semibold">Trazabilidad operacional</h2><p className="mt-3 leading-relaxed text-muted-foreground">Cada módulo conserva su responsabilidad, pero conecta personas, activos, órdenes, evidencia, documentos y centros de costo mediante identificadores canónicos.</p></div>
          <div><h2 className="text-2xl font-semibold">Implementación modular</h2><p className="mt-3 leading-relaxed text-muted-foreground">Una operación puede habilitar sólo las áreas que necesita y ampliar cobertura sin construir sistemas paralelos ni perder historial.</p></div>
        </section>

        <section className="mt-14 border-t pt-10"><h2 className="text-2xl font-semibold">MOTIL Mining OS</h2><p className="mt-3 max-w-2xl text-muted-foreground">Una capa operacional común para ordenar la información de terreno, convertirla en evidencia y mantener continuidad entre áreas.</p><Button asChild className="mt-6 gap-2"><Link href="/auth/login">Ingresar a MOTIL <ArrowRight className="h-4 w-4"/></Link></Button></section>
      </div>
    </main>
  );
}
