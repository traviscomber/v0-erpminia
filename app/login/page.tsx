import { redirect } from 'next/navigation';

export default function PublicLoginPage() {
  redirect('/auth/login');
}
