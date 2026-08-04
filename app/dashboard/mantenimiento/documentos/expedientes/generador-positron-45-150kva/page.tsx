import { getExpedientDefinition } from '@/lib/maintenance/expedient-catalog';
import { ExpedientBatchView } from '@/components/maintenance/expedient-batch-view';

const definition = getExpedientDefinition('generador-positron-45-150kva');

export default function GeneradorPositronExpedientePage() {
  if (!definition) return null;
  return <ExpedientBatchView definition={definition} />;
}
