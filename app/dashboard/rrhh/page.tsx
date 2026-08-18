'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, UserRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatePanel } from '@/components/ui/state-panel';
import {
  PageHeader,
  PageHeaderContent,
  PageHeaderDescription,
  PageHeaderEyebrow,
  PageHeaderTitle,
} from '@/components/ui/page-header';

type Person = {
  id: string;
  full_name: string;
  rut: string | null;
  role_title: string | null;
  employment_status: string;
  profile_id: string | null;
  evidence: {
    caseCount: number;
    openCaseCount: number;
    evaluationCount: number;
    latestScore: number | null;
    activityCount: number;
    workOrderCount: number;
  };
};

export default function RrhhPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/rrhh/people', { credentials: 'include' })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar RRHH');
        return payload;
      })
      .then((payload) => setPeople(payload.people || []))
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudo cargar RRHH'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return people;
    return people.filter((person) => [person.full_name, person.rut, person.role_title].some((field) => String(field || '').toLowerCase().includes(value)));
  }, [people, query]);

  const active = people.filter((person) => person.employment_status === 'active').length;
  const withoutProfile = people.filter((person) => !person.profile_id).length;
  const openCases = people.reduce((sum, person) => sum + person.evidence.openCaseCount, 0);

  return (
    <div className="space-y-5">
      <PageHeader>
        <PageHeaderContent>
          <PageHeaderEyebrow>Personas · RRHH</PageHeaderEyebrow>
          <PageHeaderTitle>Recursos Humanos</PageHeaderTitle>
          <PageHeaderDescription>
            Identidad laboral canónica, evidencia operacional y trazabilidad histórica de cada persona. La cuenta de acceso al ERP es independiente de la ficha laboral.
          </PageHeaderDescription>
        </PageHeaderContent>
      </PageHeader>

      <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
        {[
          ['Personas canónicas', people.length],
          ['Activas', active],
          ['Sin usuario vinculado', withoutProfile],
          ['Casos abiertos', openCases],
        ].map(([label, value]) => (
          <div key={label} className="bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, RUT o cargo" className="pl-9" />
      </div>

      {loading ? <StatePanel tone="loading" title="Cargando personas" description="Reuniendo identidad laboral y evidencia disponible." /> : null}
      {error ? <StatePanel tone="error" title="No se pudo cargar RRHH" description={error} /> : null}
      {!loading && !error && filtered.length === 0 ? <StatePanel tone="neutral" title="Sin personas" description="No hay personas canónicas que coincidan con la búsqueda." /> : null}

      {!loading && !error && filtered.length > 0 ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          {filtered.map((person) => (
            <Link key={person.id} href={`/dashboard/rrhh/personas/${person.id}`} className="grid gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/40 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{person.full_name}</span>
                  <Badge variant={person.employment_status === 'active' ? 'secondary' : 'outline'}>{person.employment_status}</Badge>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{person.role_title || 'Cargo no informado'}{person.rut ? ` · ${person.rut}` : ''}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                {person.evidence.workOrderCount} OT · {person.evidence.activityCount} actividades · {person.evidence.caseCount} casos
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Score vigente</p>
                <p className="font-semibold tabular-nums">{person.evidence.latestScore ?? '—'}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <StatePanel tone="neutral" title="Conciliación pendiente" description="Sólo se muestran personas existentes en la entidad canónica people. Los perfiles de acceso que aún no estén vinculados no se incorporan automáticamente para evitar duplicar identidades o atribuir evidencia a la persona equivocada." />
    </div>
  );
}
