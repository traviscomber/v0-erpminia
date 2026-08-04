// Sostenibilidad canonical data hooks
import { createClient } from '@supabase/supabase-js';

const ORG_ID = '2bd7fe06-8e4f-4a3a-b261-e3f5d8aa3dee';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function getRisksDashboard() {
  const { data, error } = await sb
    .from('hse_risks')
    .select('*')
    .eq('organization_id', ORG_ID)
    .order('risk_score', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getControlsDashboard(filterClass?: string) {
  let query = sb
    .from('hse_document_controls')
    .select('*')
    .eq('organization_id', ORG_ID);
  
  if (filterClass) {
    query = query.eq('document_class', filterClass);
  }
  
  const { data, error } = await query.order('next_review_date', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getCredentialsDashboard() {
  const { data, error } = await sb
    .from('hse_person_credentials')
    .select('*')
    .eq('organization_id', ORG_ID)
    .order('expiry_date', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function getFacilitiesDashboard() {
  const { data, error } = await sb
    .from('hse_facilities')
    .select('*')
    .eq('organization_id', ORG_ID)
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function getCommitmentsDashboard() {
  const { data, error } = await sb
    .from('hse_commitments')
    .select('*')
    .eq('organization_id', ORG_ID)
    .order('target_date', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function getRolesDashboard() {
  const { data, error } = await sb
    .from('hse_roles')
    .select('*')
    .eq('organization_id', ORG_ID)
    .order('name', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function getSostenibilidadMetrics() {
  try {
    const [risks, controls, credentials, facilities, commitments, roles] = await Promise.all([
      getRisksDashboard(),
      getControlsDashboard(),
      getCredentialsDashboard(),
      getFacilitiesDashboard(),
      getCommitmentsDashboard(),
      getRolesDashboard(),
    ]);

    const today = new Date();

    // Critical risks
    const criticalRisks = risks.filter(r => r.risk_level === 'Crítico' || r.severity_category === 'critical');

    // Overdue and soon-to-expire controls
    const overdueControls = controls.filter(c => c.next_review_date && new Date(c.next_review_date) < today);
    const soonControls = controls.filter(c => 
      c.next_review_date && 
      new Date(c.next_review_date) > today &&
      new Date(c.next_review_date) <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    );

    // Licenses
    const validLicenses = credentials.filter(c => c.expiry_date && new Date(c.expiry_date) >= today);
    const expiredLicenses = credentials.filter(c => c.expiry_date && new Date(c.expiry_date) < today);

    // Commitments
    const pendingCommitments = commitments.filter(c => c.status !== 'Completado');
    const overdueCommitments = commitments.filter(c => c.target_date && new Date(c.target_date) < today);

    // Facilities by risk level
    const highRiskFacilities = facilities.filter(f => f.risk_level === 'Alto');

    return {
      criticalRisks: criticalRisks.length,
      totalRisks: risks.length,
      overdueControls: overdueControls.length,
      soonControls: soonControls.length,
      totalControls: controls.length,
      validLicenses: validLicenses.length,
      expiredLicenses: expiredLicenses.length,
      totalLicenses: credentials.length,
      pendingCommitments: pendingCommitments.length,
      overdueCommitments: overdueCommitments.length,
      totalCommitments: commitments.length,
      highRiskFacilities: highRiskFacilities.length,
      totalFacilities: facilities.length,
      totalRoles: roles.length,
    };
  } catch (error) {
    console.error('Error fetching sostenibilidad metrics:', error);
    throw error;
  }
}
