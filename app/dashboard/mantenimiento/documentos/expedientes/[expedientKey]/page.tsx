import { notFound } from 'next/navigation';
import { ExpedientBatchView } from '@/components/maintenance/expedient-batch-view';
import { getExpedientDefinition } from '@/lib/maintenance/expedient-catalog';

type ExpedientPageProps = {
  params: Promise<{
    expedientKey: string;
  }>;
};

export default async function ExpedientDetailPage({ params }: ExpedientPageProps) {
  const { expedientKey } = await params;
  const definition = getExpedientDefinition(expedientKey);

  if (!definition) {
    notFound();
  }

  return <ExpedientBatchView definition={definition} />;
}
