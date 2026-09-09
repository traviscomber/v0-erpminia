'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { Loader2, ShieldCheck } from 'lucide-react';

type AccessLevel = 'ED' | 'LEC' | 'SR';
interface CargoOption { id: string; name: string; display_order: number }
interface ModuleDef { key: string; label: string; group: string }
interface MatrixRow { cargo_id: string; module_key: string; access_level: AccessLevel }
interface RolesResponse { cargos: CargoOption[]; matrix: MatrixRow[]; modules: ModuleDef[] }

const fetcher = async (url: string): Promise<RolesResponse> => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la matriz de roles');
  return payload;
};

const LEVELS: AccessLevel[] = ['ED', 'LEC', 'SR'];
const LEVEL_STYLES: Record<AccessLevel, string> = {
  ED: 'bg-primary text-primary-foreground',
  LEC: 'bg-secondary text-secondary-foreground',
  SR: 'bg-muted text-muted-foreground',
};
function nextLevel(current: AccessLevel): AccessLevel {
  const idx = LEVELS.indexOf(current);
  return LEVELS[(idx + 1) % LEVELS.length];
}

export function RoleMatrixTab() {
  const { toast } = useToast();
  const { data, error, isLoading, mutate } = useSWR<RolesResponse>('/api/admin/roles', fetcher, { revalidateOnFocus: false });
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const modulesByGroup = useMemo(() => {
    const groups: Record<string, ModuleDef[]> = {};
    for (const module of data?.modules ?? []) (groups[module.group] ||= []).push(module);
    return groups;
  }, [data?.modules]);
  const lookup = useMemo(() => {
    const map = new Map<string, AccessLevel>();
    for (const row of data?.matrix ?? []) map.set(`${row.cargo_id}:${row.module_key}`, row.access_level);
    return map;
  }, [data?.matrix]);

  const handleCycle = async (cargoId: string, moduleKey: string, current: AccessLevel) => {
    const newLevel = nextLevel(current);
    const reason = window.prompt(`Solicitar cambio ${current} → ${newLevel}. Indica el motivo:`)?.trim();
    if (!reason) return;
    const cellId = `${cargoId}:${moduleKey}`;
    setSavingCell(cellId);
    try {
      const response = await fetch('/api/admin/role-matrix-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cargoId, moduleKey, accessLevel: newLevel, operation: 'upsert', reason }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No se pudo crear la solicitud');
      toast({ title: 'Solicitud creada', description: 'El cambio requiere aprobación del jefe de área y luego de Gerencia.' });
    } catch (cause) {
      toast({ title: 'Error', description: cause instanceof Error ? cause.message : 'No se pudo crear la solicitud', variant: 'destructive' });
    } finally {
      setSavingCell(null);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error) {
    return (
      <StatePanel
        tone="error"
        title="No fue posible cargar la matriz de roles"
        description={`${error.message}. La falla de la fuente no se interpreta como una matriz vacía.`}
        actions={<Button variant="outline" onClick={() => void mutate()}>Reintentar</Button>}
      />
    );
  }

  const cargos = data?.cargos ?? [];
  const modules = data?.modules ?? [];

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Matriz de roles por cargo</h3>
          <p className="mt-1 text-xs text-muted-foreground">Todo cambio genera una solicitud. Se aplica únicamente después de dos validaciones distintas: Jefe de Área → Gerencia.</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/dashboard/admin/roles/aprobaciones"><ShieldCheck className="mr-2 h-4 w-4" />Ver aprobaciones</Link></Button>
      </div>

      {cargos.length === 0 || modules.length === 0 ? (
        <StatePanel tone="neutral" title="Matriz sin configuración" description="La fuente respondió correctamente, pero no hay cargos o módulos configurados para mostrar." className="m-4" />
      ) : (
        <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
          <table className="border-collapse text-sm" style={{ minWidth: 'max-content', width: '100%' }}>
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="sticky left-0 z-30 min-w-[160px] border-b border-border bg-card px-3 py-2 text-left font-semibold">Cargo</th>
                {Object.entries(modulesByGroup).map(([group, groupModules]) => <th key={group} colSpan={groupModules.length} className="whitespace-nowrap border-b border-l border-border bg-card px-2 py-2 text-center font-semibold">{group}</th>)}
              </tr>
              <tr>
                <th className="sticky left-0 z-30 min-w-[160px] border-b border-border bg-card" />
                {modules.map((module) => <th key={module.key} className="border-b border-l border-border bg-card px-1 pb-1 pt-2 text-center align-bottom" style={{ width: 52 }}><div className="mx-auto text-xs font-medium text-muted-foreground" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 96, whiteSpace: 'nowrap', display: 'flex', alignItems: 'flex-start' }}>{module.label}</div></th>)}
              </tr>
            </thead>
            <tbody>
              {cargos.map((cargo) => (
                <tr key={cargo.id} className="border-t border-border hover:bg-muted/30">
                  <td className="sticky left-0 z-10 whitespace-nowrap border-r border-border bg-card px-3 py-1.5 font-medium">{cargo.name}</td>
                  {modules.map((module) => {
                    const level = lookup.get(`${cargo.id}:${module.key}`) ?? 'SR';
                    const cellId = `${cargo.id}:${module.key}`;
                    return (
                      <td key={module.key} className="border-l border-border p-1 text-center">
                        <button
                          type="button"
                          disabled={savingCell === cellId}
                          onClick={() => handleCycle(cargo.id, module.key, level)}
                          className={cn('inline-flex h-7 w-11 items-center justify-center rounded text-xs font-semibold hover:opacity-80 disabled:opacity-50', LEVEL_STYLES[level])}
                        >
                          {savingCell === cellId ? <Loader2 className="h-3 w-3 animate-spin" /> : level}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
