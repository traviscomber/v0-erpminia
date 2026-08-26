import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProcurementForecastReadiness } from '@/components/procurement/procurement-forecast-readiness';

export default function ProcurementForecastPage(){
  return <div className="space-y-6"><section className="border-b pb-6"><Link href="/dashboard/compras/inteligencia" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4"/>Volver a inteligencia de compras</Link><p className="mt-4 text-sm font-medium text-muted-foreground">Compras · inteligencia operacional</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Preparación predictiva de abastecimiento</h1><p className="mt-2 max-w-3xl text-sm text-muted-foreground">Mide cuándo existe evidencia suficiente para proyectar tiempos de entrega sin reutilizar OC históricas como si fueran ciclos operacionales completos.</p></section><ProcurementForecastReadiness/></div>;
}
