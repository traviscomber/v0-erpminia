import { AssetDetailView } from '@/components/maintenance/asset-detail-view';

export const metadata = {
  title: 'Ficha del activo | Mantenimiento',
  description: 'Resumen operacional, historial y acciones asociadas al equipo.',
};

export default function EquipmentFichaPage() {
  return <AssetDetailView scope="equipos" />;
}
