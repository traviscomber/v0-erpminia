import { MobileSimpleFlow } from '@/components/maintenance/mobile-simple-flow';

export const metadata = {
  title: 'Operación en terreno demo | Mantenimiento',
  description: 'Demostración del flujo simplificado de operación en terreno para mecánicos',
};

export default function MobileDemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <MobileSimpleFlow />
    </div>
  );
}
