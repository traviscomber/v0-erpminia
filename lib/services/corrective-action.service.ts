import { createClient } from '@supabase/supabase-js';

let supabase: any = null;

const getClient = () => {
  if (!supabase && typeof window === 'undefined') {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabase;
};

export class CorrectiveActionService {
  // Auto-generate CA number: CA-{nc_number}-{seq}
  private static async getNextCANumber(ncNumber: string): Promise<string> {
    return `CA-${ncNumber}-001`;
  }

  static async createCorrectiveAction(ncId: string, ncNumber: string, data: {
    actionDescription: string;
    responsiblePerson?: string;
    scheduledCompletionDate: Date;
    verificationMethod: string;
    estimatedCost?: number;
  }) {
    const caNumber = await this.getNextCANumber(ncNumber);

    const { data: ca, error } = await supabase
      .from('sostenibilidad_corrective_actions')
      .insert({
        nc_id: ncId,
        ca_number: caNumber,
        action_description: data.actionDescription,
        responsible_person: data.responsiblePerson,
        scheduled_completion_date: data.scheduledCompletionDate,
        verification_method: data.verificationMethod,
        estimated_cost: data.estimatedCost,
      })
      .select()
      .single();

    if (error) throw error;
    return ca;
  }

  static async getCorrectiveAction(caId: string) {
    const { data, error } = await supabase
      .from('sostenibilidad_corrective_actions')
      .select(`
        *,
        updates:sostenibilidad_ca_updates(*),
        nonconformance:sostenibilidad_nonconformances(*)
      `)
      .eq('id', caId)
      .single();

    if (error) throw error;
    return data;
  }

  static async listCorrectiveActions(ncId: string) {
    const { data } = await supabase
      .from('sostenibilidad_corrective_actions')
      .select('*')
      .eq('nc_id', ncId)
      .order('created_at', { ascending: false });

    return data || [];
  }

  static async updateCorrectiveAction(caId: string, updates: any) {
    const { data, error } = await supabase
      .from('sostenibilidad_corrective_actions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', caId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateCAStatus(caId: string, newStatus: string) {
    return this.updateCorrectiveAction(caId, { status: newStatus });
  }

  static async completeCorrectiveAction(caId: string, actualCost?: number) {
    return this.updateCorrectiveAction(caId, {
      status: 'completed',
      actual_completion_date: new Date().toISOString().split('T')[0],
      actual_cost: actualCost,
    });
  }

  static async verifyCorrectiveAction(caId: string) {
    return this.updateCorrectiveAction(caId, {
      status: 'verified',
    });
  }

  static async addUpdate(caId: string, update: {
    updateType: string;
    status: string;
    percentageComplete: number;
    comments?: string;
    updatedBy: string;
    attachmentUrl?: string;
  }) {
    const { data, error } = await supabase
      .from('sostenibilidad_ca_updates')
      .insert({
        ca_id: caId,
        update_type: update.updateType,
        status: update.status,
        percentage_complete: update.percentageComplete,
        comments: update.comments,
        updated_by: update.updatedBy,
        attachment_url: update.attachmentUrl,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getCAProgress(ncId: string) {
    const { data: cas } = await supabase
      .from('sostenibilidad_corrective_actions')
      .select('status', { count: 'exact' })
      .eq('nc_id', ncId);

    const { count: inProgress } = await supabase
      .from('sostenibilidad_corrective_actions')
      .select('id', { count: 'exact' })
      .eq('nc_id', ncId)
      .eq('status', 'in_progress');

    const { count: completed } = await supabase
      .from('sostenibilidad_corrective_actions')
      .select('id', { count: 'exact' })
      .eq('nc_id', ncId)
      .eq('status', 'completed');

    const { count: verified } = await supabase
      .from('sostenibilidad_corrective_actions')
      .select('id', { count: 'exact' })
      .eq('nc_id', ncId)
      .eq('status', 'verified');

    return {
      total: cas?.length || 0,
      inProgress: inProgress || 0,
      completed: completed || 0,
      verified: verified || 0,
      progressPercent: cas?.length ? Math.round(((inProgress || 0) + (completed || 0) + (verified || 0)) / (cas.length) * 100) : 0,
    };
  }

  static async getOverdueCorrectiveActions(organizationId: string) {
    const { data } = await supabase
      .from('sostenibilidad_corrective_actions')
      .select(`
        *,
        nonconformance:sostenibilidad_nonconformances(organization_id)
      `)
      .lte('scheduled_completion_date', new Date().toISOString().split('T')[0])
      .neq('status', 'completed')
      .neq('status', 'verified');

    return (data || []).filter((ca: any) => ca.nonconformance?.organization_id === organizationId);
  }

  static async getCAStats(organizationId: string) {
    const { data: all } = await supabase
      .from('sostenibilidad_corrective_actions')
      .select(`
        id,
        status,
        nc_id
      `);

    const { data: ncs } = await supabase
      .from('sostenibilidad_nonconformances')
      .select('id, organization_id')
      .eq('organization_id', organizationId);

    const ncIds = new Set((ncs || []).map((nc: any) => nc.id));
    const filtered = (all || []).filter((ca: any) => ncIds.has(ca.nc_id));
    
    const inProgress = filtered.filter((ca: any) => ca.status === 'in_progress').length;
    const completed = filtered.filter((ca: any) => ca.status === 'completed').length;
    const overdue = await this.getOverdueCorrectiveActions(organizationId);

    return {
      total: filtered.length,
      inProgress,
      completed,
      overdue: overdue.length,
      completionRate: filtered.length ? Math.round((completed / filtered.length) * 100) : 0,
    };
  }

  static async getTotalCASpend(ncId: string) {
    const { data } = await supabase
      .from('sostenibilidad_corrective_actions')
      .select('estimated_cost, actual_cost')
      .eq('nc_id', ncId);

    const estimated = (data || []).reduce((sum: number, ca: any) => sum + (ca.estimated_cost || 0), 0);
    const actual = (data || []).reduce((sum: number, ca: any) => sum + (ca.actual_cost || 0), 0);

    return { estimated, actual };
  }
}
