import { ProductionSectionShell } from '@/components/production/production-section-shell';

export default function SondajeProduccionPage() {
  return (
    <ProductionSectionShell
      eyebrow="Producción · Sondaje"
      title="Sondaje de Producción"
      description="Perforación vinculada a la operación activa, controlando ejecución, metros, ubicación, avance y resultados necesarios para planificar y operar la mina."
      capabilities={[
        'Programa de perforación operacional',
        'Pozos y metros ejecutados',
        'Avance diario y por turno',
        'Ubicación y orientación del pozo',
        'Equipo, operador y disponibilidad',
        'Histórico de desempeño y cumplimiento',
      ]}
    />
  );
}
