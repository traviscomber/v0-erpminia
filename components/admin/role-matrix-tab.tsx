'use client';

import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type AccessLevel = 'ED' | 'LEC' | 'SR';

interface CargoOption {
  id: string;
  name: string;
  display_order: number;
}

interface ModuleDef {
  key: string;
  label: string;
  group: string;
}

interface MatrixRow {
  cargo_id: string;
  module_key: string;
  access_level: AccessLevel;
}

interface RolesResponse {
  cargos: CargoOption[];
  matrix: MatrixRow[];
  modules: ModuleDef[];
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

const LEVELS: AccessLevel[] = ['ED', 'LEC', 'SR'];

const LEVEL_STYLES: Record<AccessLevel, string> = {
  ED: 'bg-primary text-primary-foreground',
  LEC: 'bg-secondary text-secondary-foreground',
  SR: 'bg-muted text-muted-foreground',
};

const LEVEL_LABEL: Record<AccessLevel, string> = {
  ED: 'ED',
  LEC: 'LEC',
  SR: 'SR',
};

function nextLevel(current: AccessLevel): AccessLevel {
  const idx = LEVELS.indexOf(current);
  return LEVELS[(idx + 1) % LEVELS.length];
}

export function RoleMatrixTab() {
  const { toast } = useToast();
  const { data, isLoading, mutate } = useSWR<RolesResponse>('/api/admin/roles', fetcher);
  const [savingCell, setSavingCell] = useState<string | null>(null);

  const modulesByGroup = useMemo(() => {
    const groups: Record<string, ModuleDef[]> = {};
    for (const m of data?.modules ?? []) {
      (groups[m.group] ||= []).push(m);
    }
    return groups;
  }, [data?.modules]);

  // Quick lookup: cargoId -> moduleKey -> level
  const lookup = useMemo(() => {
    const map = new Map<string, AccessLevel>();
    for (const row of data?.matrix ?? []) {
      map.set(`${row.cargo_id}:${row.module_key}`, row.access_level);
    }
    return map;
  }, [data?.matrix]);

  const handleCycle = async (cargoId: string, moduleKey: string, current: AccessLevel) => {
    const cellId = `${cargoId}:${moduleKey}`;
    const newLevel = nextLevel(current);
    setSavingCell(cellId);

    // Optimistic update
    mutate(
      (prev) => {
        if (!prev) return prev;
        const others = prev.matrix.filter(
          (r) => !(r.cargo_id === cargoId && r.module_key === moduleKey)
        );
        return {
          ...prev,
          matrix: [...others, { cargo_id: cargoId, module_key: moduleKey, access_level: newLevel }],
        };
      },
      { revalidate: false }
    );

    try {
      const res = await fetch('/api/admin/roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cargoId, moduleKey, accessLevel: newLevel }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo actualizar');
      }
    } catch (e) {
      mutate();
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error al actualizar la matriz',
        variant: 'destructive',
      });
    } finally {
      setSavingCell(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cargos = data?.cargos ?? [];
  const modules = data?.modules ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Matriz de roles por cargo</CardTitle>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>Haz clic en una celda para cambiar el nivel:</span>
          <span className="flex items-center gap-1.5">
            <span className={cn('rounded px-1.5 py-0.5 font-semibold', LEVEL_STYLES.ED)}>ED</span>
            Editor
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn('rounded px-1.5 py-0.5 font-semibold', LEVEL_STYLES.LEC)}>LEC</span>
            Solo lectura
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn('rounded px-1.5 py-0.5 font-semibold', LEVEL_STYLES.SR)}>SR</span>
            Sin acceso
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Double-axis scroll: horizontal for columns, vertical for rows */}
        <div className="relative w-full overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <table className="border-collapse text-sm" style={{ minWidth: 'max-content' }}>
            <thead className="sticky top-0 z-20">
              <tr>
                {/* Cargo header — sticky top-left corner */}
                <th className="sticky left-0 z-30 bg-card border-b border-border px-3 py-2 text-left font-semibold min-w-[160px]">
                  Cargo
                </th>
                {Object.entries(modulesByGroup).map(([group, mods]) => (
                  <th
                    key={group}
                    colSpan={mods.length}
                    className="border-l border-b border-border px-2 py-2 text-center font-semibold bg-card whitespace-nowrap"
                  >
                    {group}
                  </th>
                ))}
              </tr>
              <tr>
                <th className="sticky left-0 z-30 bg-card border-b border-border min-w-[160px]" />
                {modules.map((m) => (
                  <th
                    key={m.key}
                    className="border-l border-b border-border px-1 pt-2 pb-1 text-center align-bottom bg-card"
                    style={{ width: 52 }}
                  >
                    <div
                      className="mx-auto text-xs font-medium text-muted-foreground"
                      style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        height: 96,
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'flex-start',
                      }}
                    >
                      {m.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cargos.map((cargo) => (
                <tr key={cargo.id} className="border-t border-border hover:bg-muted/30">
                  <td className="sticky left-0 z-10 bg-card px-3 py-1.5 font-medium whitespace-nowrap border-r border-border">
                    {cargo.name}
                  </td>
                  {modules.map((m) => {
                    const level = lookup.get(`${cargo.id}:${m.key}`) ?? 'SR';
                    const cellId = `${cargo.id}:${m.key}`;
                    const saving = savingCell === cellId;
                    return (
                      <td key={m.key} className="border-l border-border p-1 text-center">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => handleCycle(cargo.id, m.key, level)}
                          className={cn(
                            'inline-flex h-7 w-11 items-center justify-center rounded text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50',
                            LEVEL_STYLES[level]
                          )}
                          aria-label={`${cargo.name} - ${m.label}: ${level}`}
                        >
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : LEVEL_LABEL[level]}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
