import { AwardEvidencePanel } from '@/components/procurement/award-evidence-panel';
import { AwardOutcomeLearning } from '@/components/procurement/award-outcome-learning';
import { ProgressiveProcurementWorkflow } from '@/components/procurement/progressive-procurement-workflow';

export default function ProcurementWorkflowPage() {
  return <div className="space-y-6"><AwardEvidencePanel /><AwardOutcomeLearning /><ProgressiveProcurementWorkflow /></div>;
}
