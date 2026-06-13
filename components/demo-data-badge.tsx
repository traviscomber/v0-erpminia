/**
 * Demo Data Badge
 * Shows when mock data is being used
 */

import { AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DemoDataBadgeProps {
  show: boolean;
  message: string;
}

export function DemoDataBadge({ show = true, message = 'Datos de demostración' }: DemoDataBadgeProps) {
  if (!show) return null;

  return (
    <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 gap-1">
      <AlertCircle className="h-3 w-3" />
      {message}
    </Badge>
  );
}

/**
 * Demo Info Banner
 * Shows at the top when using mock data
 */
export function DemoBanner() {
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-2 rounded-md flex items-start gap-3 mb-4">
      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-medium text-sm">Modo de demostración</p>
        <p className="text-xs text-amber-800 mt-1">
          Se están mostrando datos de ejemplo. Los cambios no se guardarán. Conecta una base de datos para activar el modo producción.
        </p>
      </div>
    </div>
  );
}
