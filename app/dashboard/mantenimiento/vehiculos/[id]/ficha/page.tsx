import { AssetDetailView } from '@/components/maintenance/asset-detail-view';

export const metadata = {
  title: 'Ficha del activo | Mantenimiento',
  description: 'Resumen operacional, historial y acciones asociadas al vehículo.',
};

export default function VehicleFichaPage() {
  return <AssetDetailView scope="vehiculos" />;
}
