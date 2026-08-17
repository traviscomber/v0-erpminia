import { ProductionSectionShell } from '@/components/production/production-section-shell';

export default function SondajeExploracionPage() {
  return (
    <ProductionSectionShell
      eyebrow="Producción · Sondaje"
      title="Sondaje de Exploración"
      description="Campañas orientadas a conocer el subsuelo y reducir incertidumbre geológica: continuidad, geometría, mineralización y potencial del yacimiento."
      capabilities={[
        'Campañas y objetivos exploratorios',
        'Collar, azimut, inclinación y profundidad',
        'Metros perforados y recuperación',
        'Intervalos geológicos y muestras',
        'Resultados químicos asociados',
        'Interpretación y seguimiento de campaña',
      ]}
    />
  );
}
