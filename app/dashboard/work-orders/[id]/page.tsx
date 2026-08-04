import { redirect } from 'next/navigation';

type WorkOrdersLegacyDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function WorkOrdersLegacyDetailPage(props: WorkOrdersLegacyDetailPageProps) {
  const { id } = await props.params;
  redirect(`/dashboard/mantenimiento/ordenes-trabajo/${id}`);
}
