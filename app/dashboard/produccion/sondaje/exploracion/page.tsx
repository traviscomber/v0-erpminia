import Link from 'next/link';
import { ArrowRight, Gem } from 'lucide-react';
import { ProductionSectionShell } from '@/components/production/production-section-shell';

export default function SondajeExploracionPage() {
  return (
    <ProductionSectionShell
      eyebrow="Producción · Perforación"
      title="Campañas exploratorias"
      description="Seguimiento operacional de la perforación exploratoria: campaña, equipo, avance, profundidad y ejecución. La interpretación geológica, continuidad, mineralización y evidencia del pozo se revisan en Geología → Sondajes."
      capabilities={[
        'Campañas y objetivos operacionales de perforación',
        'Metros perforados y avance',
        'Sondas, operadores y estado de ejecución',
        'Profundidad planificada versus ejecutada',
        'Incidencias y trazabilidad operacional',
        'Vínculo al sondaje canónico compartido con Geología',
      ]}
    >
      <div className="rounded-lg border bg-muted/15 px-4 py-3 text-sm">
        <p className="font-medium">La interpretación no se duplica aquí.</p>
        <p className="mt-1 text-muted-foreground">Esta vista responde “¿cómo se está ejecutando la campaña?”. Para “¿qué significa geológicamente este sondaje?”, usa el expediente geológico canónico.</p>
        <Link href="/dashboard/produccion/geologia?tab=holes" className="mt-3 inline-flex items-center gap-2 font-medium text-primary hover:underline">
          <Gem className="h-4 w-4" /> Abrir Geología → Sondajes <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </ProductionSectionShell>
  );
}
