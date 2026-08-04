import { redirect } from 'next/navigation';

export default function CrearTareaPage() {
  redirect('/dashboard/mantenimiento/ordenes-trabajo/create');
}
