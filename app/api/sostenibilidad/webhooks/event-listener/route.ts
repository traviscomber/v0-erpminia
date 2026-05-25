import { getSupabaseServerClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Validar webhook signature HMAC
function validateWebhookSignature(request: NextRequest, payload: string): boolean {
  const signature = request.headers.get('x-signature');
  if (!signature) return false;

  const secret = process.env.WEBHOOK_SECRET || 'default-secret';
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(hash)
  );
}

// Webhook para procesar eventos de event_log
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    
    // Validar firma HMAC
    if (!validateWebhookSignature(request, payload)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = JSON.parse(payload);
    const { type, record } = data;

    // Validar que es un evento válido
    if (!type || !record) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // Procesar según tipo de evento
    if (type === 'INSERT' && record.source_table === 'inspecciones_internas') {
      await handleInspectionCompleted(supabase, record);
    } else if (type === 'UPDATE' && record.source_table === 'sostenibilidad_nonconformances') {
      await handleNCStatusChange(supabase, record);
    } else if (type === 'UPDATE' && record.source_table === 'sostenibilidad_corrective_actions') {
      await handleCAStatusChange(supabase, record);
    }

    return NextResponse.json({ success: true, processed: true });
  } catch (error) {
    console.error('[v0] Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handler para inspecciones completadas
async function handleInspectionCompleted(supabase: any, inspection: any) {
  try {
    console.log('[v0] Inspection completed:', inspection.id);

    // Si tiene hallazgos, auto-generar NCs
    if (inspection.hallazgos_json && inspection.hallazgos_json.length > 0) {
      const hallazgos = inspection.hallazgos_json;

      // Llamar API de auto-creación de NCs
      const response = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/sostenibilidad/nc/auto-create-from-inspection`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inspection_id: inspection.id,
            inspection_type: 'internas',
            hallazgos,
          }),
        }
      );

      const result = await response.json();
      console.log('[v0] NCs auto-created:', result.count);

      // Enviar notificación
      await sendNotification('nc_created', {
        message: `${result.count} No-Conformidades generadas desde inspección`,
        inspection_id: inspection.id,
      });
    }
  } catch (error) {
    console.error('[v0] Error handling inspection:', error);
  }
}

// Handler para cambios de estado en NCs
async function handleNCStatusChange(supabase: any, nc: any) {
  try {
    console.log('[v0] NC status changed:', nc.id, nc.status);

    // Si NC es aprobada, auto-generar CA
    if (nc.status === 'aprobada') {
      const response = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/sostenibilidad/ca/auto-create-from-nc`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nc_id: nc.id,
            created_by: nc.assigned_to,
          }),
        }
      );

      const result = await response.json();
      console.log('[v0] CA auto-created:', result.created_ca?.ca_number);

      // Enviar notificación
      await sendNotification('ca_created', {
        message: `Acción Correctiva ${result.created_ca?.ca_number} generada para NC ${nc.nc_number}`,
        nc_id: nc.id,
        ca_number: result.created_ca?.ca_number,
      });
    }

    // Si NC es cerrada, recalcular compliance score
    if (nc.status === 'cerrada') {
      const response = await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/sostenibilidad/compliance/calculate-score`,
        { method: 'GET' }
      );

      const complianceData = await response.json();
      console.log('[v0] Compliance score recalculated:', complianceData.compliance_score);

      // Enviar notificación si hay alertas
      if (complianceData.alerts.length > 0) {
        await sendNotification('compliance_alert', {
          message: `Compliance Score: ${complianceData.compliance_score}%`,
          score: complianceData.compliance_score,
          alerts: complianceData.alerts,
        });
      }
    }
  } catch (error) {
    console.error('[v0] Error handling NC status:', error);
  }
}

// Handler para cambios de estado en CAs
async function handleCAStatusChange(supabase: any, ca: any) {
  try {
    console.log('[v0] CA status changed:', ca.id, ca.status);

    // Si CA es verificada/cerrada, enviar notificación
    if (['verificada', 'cerrada'].includes(ca.status)) {
      await sendNotification('ca_verified', {
        message: `Acción Correctiva ${ca.ca_number} verificada y cerrada`,
        ca_number: ca.ca_number,
        status: ca.status,
      });

      // Recalcular compliance score
      await fetch(
        `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/sostenibilidad/compliance/calculate-score`,
        { method: 'GET' }
      );
    }
  } catch (error) {
    console.error('[v0] Error handling CA status:', error);
  }
}

// Función para enviar notificaciones
async function sendNotification(type: string, data: any) {
  try {
    console.log('[v0] Sending notification:', type, data);

    // Aquí se pueden integrar:
    // 1. Webhooks de Slack
    // 2. Email notifications
    // 3. In-app notifications
    // 4. SMS alerts

    // Por ahora, solo loguear
    // TODO: Implementar integraciones reales
  } catch (error) {
    console.error('[v0] Notification sending failed:', error);
  }
}
