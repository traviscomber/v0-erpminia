import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

function getSupabaseClient() {
  const { createClient } = require("@supabase/supabase-js");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase env vars");
  return createClient(supabaseUrl, supabaseKey);
}

export class QRScannerService {
  static async generateQRCode(organizationId: string, stockId: string, binId?: string) {
    const supabase = getSupabaseClient();
    const qrValue = `QR-${organizationId.slice(0, 8)}-${stockId.slice(0, 8)}-${nanoid(6)}`;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('qr_codes')
      .insert({ organization_id: organizationId, qr_code_value: qrValue, stock_id: stockId, bin_id: binId })
      .select()
      .single();
    if (error) throw error;
    return { ...data, qrValue };
  }

  static async scanQRCode(qrCodeValue: string, action: string, userId: string, binId?: string) {
    const supabase = getSupabaseClient();
    const { data: qr } = await supabase.from('qr_codes').select('*').eq('qr_code_value', qrCodeValue).single();
    if (!qr) throw new Error('QR code not found');

    const { error: updateErr } = await supabase
      .from('qr_codes')
      .update({ scans_count: (qr.scans_count || 0) + 1, last_scan_date: new Date().toISOString() })
      .eq('id', qr.id);
    if (updateErr) throw updateErr;

    const { error: logErr } = await supabase.from('qr_scan_logs').insert({
      qr_code_id: qr.id,
      scanned_by: userId,
      action,
      bin_id_before: qr.bin_id,
      bin_id_after: binId,
    });
    if (logErr) throw logErr;

    return { qrCode: qr, action, scannedAt: new Date() };
  }

  static async getQRCodeData(qrCodeValue: string) {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('qr_codes')
      .select('*, stock:warehouse_stock(*), bin:warehouse_bins(*)')
      .eq('qr_code_value', qrCodeValue)
      .single();
    return data;
  }

  static async getScanHistory(qrCodeId: string) {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('qr_scan_logs')
      .select('*, scanner:users(name)')
      .eq('qr_code_id', qrCodeId)
      .order('created_at', { ascending: false })
      .limit(20);
    return data || [];
  }
}
