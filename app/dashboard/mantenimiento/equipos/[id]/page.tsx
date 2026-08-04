import { redirect } from 'next/navigation';

type EquipmentPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EquipmentPage({ params }: EquipmentPageProps) {
  const { id } = await params;
  redirect(`/dashboard/mantenimiento/equipos/${encodeURIComponent(id)}/ficha`);
}
