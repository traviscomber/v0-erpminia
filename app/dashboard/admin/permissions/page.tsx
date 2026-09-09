import { redirect } from 'next/navigation';

export default function LegacyIndividualPermissionsPage() {
  redirect('/dashboard/admin/roles');
}
