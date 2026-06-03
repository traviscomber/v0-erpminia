import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Genera alertas automáticas para vencimientos de hitos
 */
export async function generarAlertasVencimientosHitos() {
  try {
    const supabase = getSupabaseClient();
    const { data: hitos } = await supabase
      .from('contratos_hitos')
      .select('*')
      .eq('estado', 'pendiente')
      .lt('fecha_programada', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()); // 30 días

    if (!hitos) return;

    for (const hito of hitos) {
      const { data: existeAlerta } = await supabase
        .from('contratos_alertas')
        .select('id')
        .eq('hito_id', hito.id)
        .eq('tipo', 'vencimiento')
        .eq('estado', 'activa');

      if (existeAlerta && existeAlerta.length === 0) {
        await supabase.from('contratos_alertas').insert([
          {
            tipo: 'vencimiento',
            hito_id: hito.id,
            contractor_id: hito.contractor_id,
            titulo: `Hito ${hito.hito_number} vence próximamente`,
            descripcion: `${hito.hito_name} - Vencimiento: ${hito.fecha_programada}`,
            severidad: 'media',
            fecha_alerta: new Date().toISOString().split('T')[0],
            fecha_vencimiento: hito.fecha_programada,
            estado: 'activa',
          },
        ]);
      }
    }

    console.log('[v0] Generated hito expiration alerts');
  } catch (error) {
    console.error('[v0] Error generating hito alerts:', error);
  }
}

/**
 * Genera alertas para garantías próximas a vencer
 */
export async function generarAlertasGarantias() {
  try {
    const supabase = getSupabaseClient();
    const { data: garantias } = await supabase
      .from('contratos_garantias')
      .select('*, contratos_hitos(*)')
      .eq('estado', 'retenida')
      .lt('fecha_vencimiento', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

    if (!garantias) return;

    for (const garantia of garantias) {
      const hito = (garantia as any).contratos_hitos;
      const { data: existeAlerta } = await supabase
        .from('contratos_alertas')
        .select('id')
        .eq('hito_id', hito.id)
        .eq('tipo', 'garantia_vence')
        .eq('estado', 'activa');

      if (existeAlerta && existeAlerta.length === 0) {
        await supabase.from('contratos_alertas').insert([
          {
            tipo: 'garantia_vence',
            hito_id: hito.id,
            contractor_id: hito.contractor_id,
            titulo: `Garantía ${garantia.porcentaje_retencion}% vence próximamente`,
            descripcion: `Monto retenido: CLP ${garantia.monto_retenido}`,
            severidad: 'alta',
            fecha_alerta: new Date().toISOString().split('T')[0],
            fecha_vencimiento: garantia.fecha_vencimiento,
            estado: 'activa',
          },
        ]);
      }
    }

    console.log('[v0] Generated guarantee expiration alerts');
  } catch (error) {
    console.error('[v0] Error generating guarantee alerts:', error);
  }
}

/**
 * Genera alertas para documentos HSE próximos a vencer (>1 año sin actualización)
 */
export async function generarAlertasDocumentosHSE() {
  try {
    const supabase = getSupabaseClient();
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

    const { data: documentos } = await supabase
      .from('hse_documentos')
      .select('*')
      .eq('estado', 'vigente')
      .lt('fecha_actualizacion', oneYearAgo);

    if (!documentos) return;

    for (const doc of documentos) {
      const { data: existeAlerta } = await supabase
        .from('contratos_alertas')
        .select('id')
        .eq('titulo', `Documento "${doc.nombre}" requiere actualización`)
        .eq('estado', 'activa');

      if (existeAlerta && existeAlerta.length === 0) {
        await supabase.from('contratos_alertas').insert([
          {
            tipo: 'documento_vence',
            titulo: `Documento "${doc.nombre}" requiere actualización`,
            descripcion: `Última actualización: ${doc.fecha_actualizacion}. Requiere revisión inmediata.`,
            severidad: 'alta',
            fecha_alerta: new Date().toISOString().split('T')[0],
            fecha_vencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            estado: 'activa',
          },
        ]);
      }
    }

    console.log('[v0] Generated HSE document alerts');
  } catch (error) {
    console.error('[v0] Error generating HSE document alerts:', error);
  }
}

/**
 * Ejecuta todas las verificaciones de alertas
 */
export async function ejecutarVerificacionesAlertas() {
  console.log('[v0] Starting alert generation cycle...');
  await generarAlertasVencimientosHitos();
  await generarAlertasGarantias();
  await generarAlertasDocumentosHSE();
  console.log('[v0] Alert generation cycle completed');
}
