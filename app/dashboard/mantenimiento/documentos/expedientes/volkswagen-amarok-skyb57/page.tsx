import { getExpedientDefinition } from '@/lib/maintenance/expedient-catalog';
import { ExpedientBatchView } from '@/components/maintenance/expedient-batch-view';

const definition = getExpedientDefinition('volkswagen-amarok-skyb57');

export default function VolkswagenAmarokExpedientePage() {
  if (!definition) return null;
  return <ExpedientBatchView definition={definition} />;
}
