import { ProductionSectionShell } from '@/components/production/production-section-shell';

export default function TransporteMineralPage() {
  return (
    <ProductionSectionShell
      title="Transporte de Mineral"
      description="Movimiento de mineral desde mina hacia planta, con trazabilidad de origen, destino, fecha, turno, equipo/vehículo y tonelaje. Este es el término operacional oficial que utilizará MOTIL."
      capabilities={[
        'Movimientos mina → planta',
        'Origen, sector y destino',
        'Transportista, equipo y patente',
        'Tonelaje y fecha/turno',
        'Trazabilidad al registro fuente',
        'Histórico y análisis de transporte',
      ]}
    />
  );
}
