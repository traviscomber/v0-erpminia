'use client';

import { useEffect, useState } from 'react';
import { Toast, toast } from 'sonner';

// Sistema de notificaciones en tiempo real para sostenibilidad
export function useSustainabilityNotifications() {
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (isListening) return;

    setIsListening(true);

    // Polling cada 30 segundos para verificar alertas
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/sostenibilidad/alerts/overdue');
        const data = await response.json();

        if (data.critical_alerts > 0) {
          toast.error(`⚠️ ${data.critical_alerts} alerta(s) crítica(s)`, {
            description: 'Revisa las no-conformidades vencidas',
          });
        }
      } catch (error) {
        console.error('[v0] Error fetching alerts:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isListening]);

  // Función para enviar notificaciones manualmente
  const notifyNCCreated = (count: number) => {
    toast.success(`${count} No-Conformidad(es) generada(s)`, {
      description: 'Se han creado automáticamente desde la inspección',
    });
  };

  const notifyCACreated = (caNumber: string) => {
    toast.info(`Acción Correctiva ${caNumber} creada`, {
      description: 'Se ha generado automáticamente',
    });
  };

  const notifyComplianceAlert = (score: number) => {
    const variant = score < 60 ? 'error' : score < 80 ? 'warning' : 'success';
    const icon = score < 60 ? '🔴' : score < 80 ? '🟡' : '🟢';

    toast[variant](`${icon} Compliance Score: ${score}%`, {
      description: score < 80 ? 'Acción requerida' : 'En buen estado',
    });
  };

  return {
    notifyNCCreated,
    notifyCACreated,
    notifyComplianceAlert,
  };
}
