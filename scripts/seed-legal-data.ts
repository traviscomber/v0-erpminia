import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Contract {
  title: string;
  contract_number: string;
  contract_type: string;
  description: string;
  contractor_id?: string;
  start_date: string;
  end_date: string;
  contract_value: number;
  currency: string;
  status: string;
  responsible_person: string;
  responsible_area: string;
  payment_terms: string;
}

interface HSEDocument {
  nombre_documento: string;
  tipo: string;
  descripcion: string;
  version_actual: string;
  estado: string;
  fecha_actualizacion: string;
  cargos_aplica: string[];
  areas_aplica: string[];
}

async function seedLegalContracts() {
  console.log('[v0] Seeding legal contracts...');

  const contracts: Contract[] = [
    {
      title: 'Contrato Principal de Explotación - Concesión La Patagua',
      contract_number: 'CONT-2023-001',
      contract_type: 'Mining Operations',
      description: 'Contrato principal para explotación minera del depósito La Patagua con duración de 3 años',
      start_date: '2023-01-15',
      end_date: '2025-12-31',
      contract_value: 5000000,
      currency: 'USD',
      status: 'active',
      responsible_person: 'Carlos Fernández',
      responsible_area: 'Operaciones Mineras',
      payment_terms: 'Monthly invoicing',
    },
    {
      title: 'Contrato de Servicios de Mantenimiento Preventivo',
      contract_number: 'CONT-2024-002',
      contract_type: 'Services',
      description: 'Servicios de mantenimiento preventivo de equipos principales por 18 meses',
      start_date: '2024-01-01',
      end_date: '2025-06-30',
      contract_value: 850000,
      currency: 'USD',
      status: 'active',
      responsible_person: 'Roberto Silva',
      responsible_area: 'Mantenimiento',
      payment_terms: 'Monthly',
    },
    {
      title: 'Suministro de Repuestos y Componentes Industriales',
      contract_number: 'CONT-2024-003',
      contract_type: 'Supply',
      description: 'Acuerdo marco de suministro de repuestos críticos con disponibilidad 24/7',
      start_date: '2024-03-01',
      end_date: '2025-02-28',
      contract_value: 450000,
      currency: 'USD',
      status: 'active',
      responsible_person: 'María González',
      responsible_area: 'Procurement',
      payment_terms: 'Net 30',
    },
    {
      title: 'Consultoría Legal Especializada en Minería',
      contract_number: 'CONT-2024-004',
      contract_type: 'Consulting',
      description: 'Servicios de asesoría legal para temas regulatorios y compliance minero',
      start_date: '2024-06-01',
      end_date: '2026-05-31',
      contract_value: 180000,
      currency: 'USD',
      status: 'active',
      responsible_person: 'David López',
      responsible_area: 'Legal',
      payment_terms: 'Monthly retainer',
    },
    {
      title: 'Servicios de Seguridad e Inspección SERNAGEOMIN',
      contract_number: 'CONT-2023-005',
      contract_type: 'Safety Services',
      description: 'Servicios integrales de seguridad industrial y gestión SERNAGEOMIN',
      start_date: '2023-12-01',
      end_date: '2024-11-30',
      contract_value: 320000,
      currency: 'USD',
      status: 'expired',
      responsible_person: 'Jorge Acevedo',
      responsible_area: 'HSE',
      payment_terms: 'Quarterly',
    },
  ];

  for (const contract of contracts) {
    try {
      const { data, error } = await supabase.from('contracts').insert([contract]).select();

      if (error) {
        console.error(`[v0] Error inserting contract ${contract.contract_number}:`, error);
      } else {
        console.log(`[v0] Inserted contract: ${contract.title}`);
      }
    } catch (err) {
      console.error(`[v0] Exception inserting contract:`, err);
    }
  }
}

async function seedHSEDocuments() {
  console.log('[v0] Seeding HSE master documents...');

  const documents: HSEDocument[] = [
    {
      nombre_documento: 'Política Integrada de Seguridad, Salud y Ambiente',
      tipo: 'Policy',
      descripcion: 'Política corporativa que establece los principios de seguridad, salud y ambiente',
      version_actual: '3.2',
      estado: 'active',
      fecha_actualizacion: '2024-05-15',
      cargos_aplica: ['Gerente General', 'Jefe Sostenibilidad', 'Supervisores'],
      areas_aplica: ['Todas'],
    },
    {
      nombre_documento: 'Procedimiento de Investigación de Incidentes',
      tipo: 'Procedure',
      descripcion: 'Procedimiento estándar para investigación de incidentes de seguridad',
      version_actual: '2.1',
      estado: 'active',
      fecha_actualizacion: '2024-04-20',
      cargos_aplica: ['Jefe Sostenibilidad', 'Investigadores'],
      areas_aplica: ['Operaciones', 'Mantenimiento'],
    },
    {
      nombre_documento: 'Protocolo de Bioseguridad y COVID-19',
      tipo: 'Protocol',
      descripcion: 'Medidas y protocolos para prevención de enfermedades en faenas',
      version_actual: '1.8',
      estado: 'active',
      fecha_actualizacion: '2024-03-10',
      cargos_aplica: ['Personal Médico', 'Supervisores', 'Trabajadores'],
      areas_aplica: ['Todas'],
    },
    {
      nombre_documento: 'Estándar de Seguridad en Trabajos en Altura',
      tipo: 'Standard',
      descripcion: 'Requisitos de seguridad para trabajos en altura superiores a 1.8 metros',
      version_actual: '2.5',
      estado: 'active',
      fecha_actualizacion: '2024-06-01',
      cargos_aplica: ['Supervisores', 'Trabajadores'],
      areas_aplica: ['Operaciones', 'Mantenimiento'],
    },
    {
      nombre_documento: 'Plan de Respuesta a Emergencias y Evacuación',
      tipo: 'Plan',
      descripcion: 'Plan integral de respuesta a emergencias en faena minera',
      version_actual: '4.0',
      estado: 'active',
      fecha_actualizacion: '2024-02-28',
      cargos_aplica: ['Brigada de Emergencia', 'Coordinadores', 'Gerencia'],
      areas_aplica: ['Todas'],
    },
  ];

  for (const doc of documents) {
    try {
      const { data, error } = await supabase
        .from('hse_master_documents')
        .insert([{ ...doc, created_by: '00000000-0000-0000-0000-000000000000' }])
        .select();

      if (error) {
        console.error(`[v0] Error inserting document ${doc.nombre_documento}:`, error);
      } else {
        console.log(`[v0] Inserted HSE document: ${doc.nombre_documento}`);
      }
    } catch (err) {
      console.error(`[v0] Exception inserting document:`, err);
    }
  }
}

async function seedNormativeRequirements() {
  console.log('[v0] Seeding normative requirements...');

  const requirements = [
    {
      req_number: 'SERNA-2024-001',
      title: 'Cumplimiento de Resolución 1999 SERNAGEOMIN',
      description: 'Requisito de cumplimiento de la Resolución 1999 sobre seguridad minera',
      frequency: 'Continuous',
      compliance_type: 'Mandatory',
      status: 'compliant',
      deadline: '2025-12-31',
    },
    {
      req_number: 'SERNA-2024-002',
      title: 'Auditoría Anual SERNAGEOMIN',
      description: 'Auditoría anual obligatoria de SERNAGEOMIN',
      frequency: 'Annual',
      compliance_type: 'Mandatory',
      status: 'compliant',
      deadline: '2024-10-31',
    },
    {
      req_number: 'ENV-2024-001',
      title: 'Evaluación de Impacto Ambiental',
      description: 'Evaluación periódica de impacto ambiental de operaciones',
      frequency: 'Quarterly',
      compliance_type: 'Mandatory',
      status: 'compliant',
      deadline: '2025-03-31',
    },
    {
      req_number: 'ISO-2024-001',
      title: 'Certificación ISO 45001 (Seguridad)',
      description: 'Mantener certificación ISO 45001 vigente',
      frequency: 'Annual',
      compliance_type: 'Voluntary',
      status: 'compliant',
      deadline: '2025-05-15',
    },
  ];

  for (const req of requirements) {
    try {
      const { data, error } = await supabase
        .from('normative_requirements')
        .insert([
          {
            ...req,
            assigned_to: '00000000-0000-0000-0000-000000000000',
            last_checked: new Date().toISOString().split('T')[0],
          },
        ])
        .select();

      if (error) {
        console.error(`[v0] Error inserting requirement ${req.req_number}:`, error);
      } else {
        console.log(`[v0] Inserted normative requirement: ${req.title}`);
      }
    } catch (err) {
      console.error(`[v0] Exception inserting requirement:`, err);
    }
  }
}

async function main() {
  console.log('[v0] Starting data seeding...\n');

  try {
    await seedLegalContracts();
    console.log('[v0] Contracts seeded successfully\n');

    await seedHSEDocuments();
    console.log('[v0] HSE documents seeded successfully\n');

    await seedNormativeRequirements();
    console.log('[v0] Normative requirements seeded successfully\n');

    console.log('[v0] All data seeded successfully!');
  } catch (error) {
    console.error('[v0] Seeding failed:', error);
    process.exit(1);
  }
}

main();
