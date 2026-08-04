import { getExpedientDefinition } from '@/lib/maintenance/expedient-catalog';
import { ExpedientBatchView } from '@/components/maintenance/expedient-batch-view';

const definition = getExpedientDefinition('scoop-atlas-st1030');

export default function ScoopAtlasExpedientePage() {
  if (!definition) return null;
  return <ExpedientBatchView definition={definition} />;
}
