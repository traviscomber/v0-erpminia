import { EquipmentCostsLedger } from '@/components/maintenance/equipment-costs-ledger';

export const metadata = {
  title: 'Costos de equipos',
  description: 'Ledger de costos importados por equipo, vehiculo y categoria',
};

export default function EquipmentCostsPage() {
  return <EquipmentCostsLedger />;
}
