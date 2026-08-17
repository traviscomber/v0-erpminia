import { ProductionSectionShell } from '@/components/production/production-section-shell';

export default function GeologiaPage() {
  return (
    <ProductionSectionShell
      title="Geología"
      description="Control geológico asociado a la operación y al conocimiento del yacimiento, preservando continuidad entre observaciones, muestras, sectores y decisiones productivas."
      capabilities={[
        'Sectores y unidades geológicas',
        'Muestreo y observaciones de terreno',
        'Control de leyes y mineralización',
        'Interpretación y continuidad geológica',
        'Vinculación con sondajes',
        'Histórico geológico por sector',
      ]}
    />
  );
}
