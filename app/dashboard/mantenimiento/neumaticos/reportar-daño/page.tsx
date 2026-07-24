import { Metadata } from 'next';
import { TireDamageForm } from '@/components/maintenance/tire-damage-form';

export const metadata: Metadata = {
  title: 'Reportar Daño de Neumatico',
  description: 'Reportar daños de neumaticos en faena',
};

export default function ReportarDañoPage() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reportar Daño</h1>
          <p className="text-muted-foreground mt-2">
            Reporta neumaticos dañados en faena para iniciar trámite de reparación
          </p>
        </div>

        {/* Form */}
        <div>
          <TireDamageForm />
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100">Instrucciones:</h3>
          <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
            <li>Escanea el código del neumatico o escribe el código manualmente</li>
            <li>Proporciona la ubicación exacta en la faena (sector, equipos cercanos)</li>
            <li>Describe el daño observado (pinchazos, cortes, desgaste anormal)</li>
            <li>Se generará una OT automáticamente</li>
            <li>Se notificará al equipo de taller para traslado</li>
          </ol>
        </div>

        {/* Info */}
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            <strong>Nota:</strong> El sistema registrará automáticamente la ubicación GPS, 
            fotografías y tiempo de reporte para trazabilidad completa.
          </p>
        </div>
      </div>
    </div>
  );
}
