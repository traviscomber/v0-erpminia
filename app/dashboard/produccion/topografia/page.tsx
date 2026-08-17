import { ProductionSectionShell } from '@/components/production/production-section-shell';

export default function TopografiaPage() {
  return (
    <ProductionSectionShell
      title="Topografía"
      description="Control espacial de labores, avances y puntos de referencia necesarios para operar y reconciliar la mina con información geológica y productiva."
      capabilities={[
        'Levantamientos topográficos',
        'Puntos, coordenadas y cotas',
        'Avances de labores',
        'Control de frentes y sectores',
        'Reconciliación espacial con geología',
        'Histórico de levantamientos y cambios',
      ]}
    />
  );
}
