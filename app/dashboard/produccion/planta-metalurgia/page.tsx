import { ProductionSectionShell } from '@/components/production/production-section-shell';

export default function PlantaMetalurgiaPage() {
  return (
    <ProductionSectionShell
      title="Planta / Metalurgia"
      description="Operación de planta y resultados metalúrgicos determinísticos por turno, manteniendo separados datos observados, cálculos y ausencia de ensayo."
      capabilities={[
        'Turnos de planta',
        'Mineral tratado y humedad',
        'Leyes de cabeza, concentrado y relave',
        'Recuperación metalúrgica',
        'Balances determinísticos y hashes',
        'Despachos de concentrado cuando estén conciliados',
      ]}
    />
  );
}
