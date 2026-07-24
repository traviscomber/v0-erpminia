import { MobileSimpleFlow } from '@/components/maintenance/mobile-simple-flow';

export const metadata = {
  title: 'Panel Móvil Demo | Mantenimiento',
  description: 'Demostración del panel móvil simplificado para mecánicos',
};

export default function MobileDemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <MobileSimpleFlow />
    </div>
  );
}
