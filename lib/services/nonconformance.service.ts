import { createClient } from '@supabase/supabase-js';

// Use anon key for client-side (RLS will handle security)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export class NonconformanceService {
  // Auto-generate NC number: NC-{org}-{year}-{seq}
  private static async getNextNCNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const { data } = await supabase
      .from('sostenibilidad_nonconformances')
      .select('nc_number')
      .eq('organization_id', organizationId)
      .ilike('nc_number', `NC-${year}%`)
      .order('nc_number', { ascending: false })
      .limit(1);

    const seq = data?.length ? parseInt(data[0].nc_number.split('-').pop() || '0') + 1 : 1;
    return `NC-${year}-${String(seq).padStart(4, '0')}`;
  }

  static async createNonconformance(organizationId: string, data: {
    title: string;
    description?: string;
    category: string;
    severity: string;
    source: string;
    discoveredDate: Date;
    reportedBy: string;
    assignedTo?: string;
    targetClosureDate?: Date;
    rootCause?: string;
    impactDescription?: string;
  }) {
    const ncNumber = await this.getNextNCNumber(organizationId);
    
    const { data: nc, error } = await supabase
      .from('sostenibilidad_nonconformances')
      .insert({
        organization_id: organizationId,
        nc_number: ncNumber,
        title: data.title,
        description: data.description,
        category: data.category,
        severity: data.severity,
        source: data.source,
        discovered_date: data.discoveredDate,
        reported_by: data.reportedBy,
        assigned_to: data.assignedTo,
        target_closure_date: data.targetClosureDate,
        root_cause: data.rootCause,
        impact_description: data.impactDescription,
      })
      .select()
      .single();

    if (error) throw error;
    return nc;
  }

  static async getNonconformance(ncId: string) {
    const { data, error } = await supabase
      .from('sostenibilidad_nonconformances')
      .select(`
        *,
        details:sostenibilidad_nc_details(*),
        corrective_actions:sostenibilidad_corrective_actions(*)
      `)
      .eq('id', ncId)
      .single();

    if (error) throw error;
    return data;
  }

  static async listNonconformances(organizationId: string, filters?: {
    status?: string;
    severity?: string;
    category?: string;
    assignedTo?: string;
  }) {
    let query = supabase
      .from('sostenibilidad_nonconformances')
      .select('*')
      .eq('organization_id', organizationId);

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.severity) query = query.eq('severity', filters.severity);
    if (filters?.category) query = query.eq('category', filters.category);
    if (filters?.assignedTo) query = query.eq('assigned_to', filters.assignedTo);

    const { data } = await query.order('created_at', { ascending: false });
    return data || [];
  }

  static async updateNonconformance(ncId: string, updates: any) {
    const { data, error } = await supabase
      .from('sostenibilidad_nonconformances')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', ncId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async closeNonconformance(ncId: string) {
    return this.updateNonconformance(ncId, {
      status: 'closed',
      actual_closure_date: new Date().toISOString().split('T')[0],
    });
  }

  static async addDetail(ncId: string, detail: {
    detailType: string;
    fileUrl: string;
    description?: string;
    uploadedBy: string;
  }) {
    const { data, error } = await supabase
      .from('sostenibilidad_nc_details')
      .insert({
        nc_id: ncId,
        detail_type: detail.detailType,
        file_url: detail.fileUrl,
        description: detail.description,
        uploaded_by: detail.uploadedBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getNCStats(organizationId: string) {
    const { data: all } = await supabase
      .from('sostenibilidad_nonconformances')
      .select('status', { count: 'exact' })
      .eq('organization_id', organizationId);

    const { count: openCount } = await supabase
      .from('sostenibilidad_nonconformances')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('status', 'open');

    const { count: closedCount } = await supabase
      .from('sostenibilidad_nonconformances')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .eq('status', 'closed');

    const { count: overduCount } = await supabase
      .from('sostenibilidad_nonconformances')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .lte('target_closure_date', new Date().toISOString().split('T')[0])
      .neq('status', 'closed');

    return {
      total: all?.length || 0,
      open: openCount || 0,
      closed: closedCount || 0,
      overdue: overduCount || 0,
      complianceScore: all?.length ? Math.round(((closedCount || 0) / (all.length || 1)) * 100) : 0,
    };
  }

  static async getNCsBySeverity(organizationId: string) {
    const { data } = await supabase
      .from('sostenibilidad_nonconformances')
      .select('severity', { count: 'exact' })
      .eq('organization_id', organizationId)
      .neq('status', 'closed');

    const severities = ['critical', 'high', 'medium', 'low'];
    const result: any = {};
    for (const sev of severities) {
      const { count } = await supabase
        .from('sostenibilidad_nonconformances')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('severity', sev)
        .neq('status', 'closed');
      result[sev] = count || 0;
    }
    return result;
  }

  static async getOverdueNCs(organizationId: string) {
    const { data } = await supabase
      .from('sostenibilidad_nonconformances')
      .select('*')
      .eq('organization_id', organizationId)
      .lte('target_closure_date', new Date().toISOString().split('T')[0])
      .neq('status', 'closed')
      .order('target_closure_date', { ascending: true });

    return data || [];
  }
}
