import type { Metadata } from 'next';
import { SubcontractorPortal } from '@/components/subcontratistas/subcontractor-portal';

export const metadata: Metadata = {
  title: 'Portal de Subcontratistas | Motil',
  description: 'Portal externo para subir documentos de subcontratistas y revisar EECC asociadas.',
};

export default function SubcontratistasPortalPage() {
  return <SubcontractorPortal />;
}
