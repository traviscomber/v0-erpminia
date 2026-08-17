import { redirect } from 'next/navigation';

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/dashboard/mantenimiento/vehiculos/${id}/ficha`);
}
