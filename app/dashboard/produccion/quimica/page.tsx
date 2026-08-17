import { ProductionSectionShell } from '@/components/production/production-section-shell';

export default function QuimicaPage() {
  return (
    <ProductionSectionShell
      title="Química"
      description="Registro y control de análisis químicos que respaldan geología, planta, metalurgia y control de calidad, manteniendo método, muestra, resultado y procedencia."
      capabilities={[
        'Recepción e identificación de muestras',
        'Método y laboratorio de análisis',
        'Resultados y leyes químicas',
        'Control de calidad analítico',
        'Vinculación con geología y planta',
        'Histórico y trazabilidad de resultados',
      ]}
    />
  );
}
