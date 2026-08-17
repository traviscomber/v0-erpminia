'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';

type AccessLevel = 'ED' | 'LEC' | 'SR';
interface CargoOption { id: string; name: string; display_order: number }
interface ModuleDef { key: string; label: string; group: string }
interface MatrixRow { cargo_id: string; module_key: string; access_level: AccessLevel }
interface RolesResponse { cargos: CargoOption[]; matrix: MatrixRow[]; modules: ModuleDef[] }
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());
const LEVELS: AccessLevel[] = ['ED', 'LEC', 'SR'];
const LEVEL_STYLES: Record<AccessLevel, string> = { ED: 'bg-primary text-primary-foreground', LEC: 'bg-secondary text-secondary-foreground', SR: 'bg-muted text-muted-foreground' };
function nextLevel(current: AccessLevel): AccessLevel { const idx = LEVELS.indexOf(current); return LEVELS[(idx + 1) % LEVELS.length]; }

export function RoleMatrixTab() {
  const { toast } = useToast();
  const { data, isLoading } = useSWR<RolesResponse>('/api/admin/roles', fetcher);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const modulesByGroup = useMemo(() => { const groups: Record<string, ModuleDef[]> = {}; for (const m of data?.modules ?? []) (groups[m.group] ||= []).push(m); return groups; }, [data?.modules]);
  const lookup = useMemo(() => { const map = new Map<string, AccessLevel>(); for (const row of data?.matrix ?? []) map.set(`${row.cargo_id}:${row.module_key}`, row.access_level); return map; }, [data?.matrix]);

  const handleCycle = async (cargoId: string, moduleKey: string, current: AccessLevel) => {
    const newLevel = nextLevel(current);
    const reason = window.prompt(`Solicitar cambio ${current} → ${newLevel}. Indica el motivo:`)?.trim();
    if (!reason) return;
    const cellId = `${cargoId}:${moduleKey}`;
    setSavingCell(cellId);
    try {
      const res = await fetch('/api/admin/role-matrix-changes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ cargoId, moduleKey, accessLevel: newLevel, operation: 'upsert', reason }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'No se pudo crear la solicitud');
      toast({ title: 'Solicitud creada', description: 'El cambio requiere aprobación del jefe de área y luego de Gerencia.' });
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'No se pudo crear la solicitud', variant: 'destructive' });
    } finally { setSavingCell(null); }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  const cargos = data?.cargos ?? []; const modules = data?.modules ?? [];
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Matriz de roles por cargo</h3>
          <p className="mt-1 text-xs text-muted-foreground">Todo cambio genera una solicitud. Se aplica únicamente después de dos validaciones distintas: Jefe de Área → Gerencia.</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/dashboard/admin/roles/aprobaciones"><ShieldCheck className="mr-2 h-4 w-4" />Ver aprobaciones</Link></Button>
      </div>
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        <table className="border-collapse text-sm" style={{ minWidth: 'max-content', width: '100%' }}>
          <thead className="sticky top-0 z-20"><tr><th className="sticky left-0 z-30 min-w-[160px] border-b border-border bg-card px-3 py-2 text-left font-semibold">Cargo</th>{Object.entries(modulesByGroup).map(([group, mods]) => <th key={group} colSpan={mods.length} className="whitespace-nowrap border-b border-l border-border bg-card px-2 py-2 text-center font-semibold">{group}</th>)}</tr><tr><th className="sticky left-0 z-30 min-w-[160px] border-b border-border bg-card" />{modules.map((m) => <th key={m.key} className="border-b border-l border-border bg-card px-1 pb-1 pt-2 text-center align-bottom" style={{ width: 52 }}><div className="mx-auto text-xs font-medium text-muted-foreground" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 96, whiteSpace: 'nowrap', display: 'flex', alignItems: 'flex-start' }}>{m.label}</div></th>)}</tr></thead>
          <tbody>{cargos.map((cargo) => <tr key={cargo.id} className="border-t border-border hover:bg-muted/30"><td className="sticky left-0 z-10 whitespace-nowrap border-r border-border bg-card px-3 py-1.5 font-medium">{cargo.name}</td>{modules.map((m) => { const level = lookup.get(`${cargo.id}:${m.key}`) ?? 'SR'; const cellId = `${cargo.id}:${m.key}`; return <td key={m.key} className="border-l border-border p-1 text-center"><button type="button" disabled={savingCell === cellId} onClick={() => handleCycle(cargo.id, m.key, level)} className={cn('inline-flex h-7 w-11 items-center justify-center rounded text-xs font-semibold hover:opacity-80 disabled:opacity-50', LEVEL_STYLES[level])}>{savingCell === cellId ? <Loader2 className="h-3 w-3 animate-spin" /> : level}</button></td>; })}</tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
