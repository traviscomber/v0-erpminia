import { redirect } from 'next/navigation';

export default function WorkOrdersCreateLegacyPage() {
  redirect('/dashboard/mantenimiento/ordenes-trabajo/create');
}
