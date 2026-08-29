import { SiiSetupNavigator } from '@/components/sii/sii-setup-navigator';

export default function SiiAdministrationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <SiiSetupNavigator />
      {children}
    </div>
  );
}
