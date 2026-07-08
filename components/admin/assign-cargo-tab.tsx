'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search } from 'lucide-react';

interface CargoOption {
  id: string;
  name: string;
  display_order: number;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role: string | null;
  cargo_id: string | null;
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

const UNASSIGNED = '__none__';

export function AssignCargoTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: rolesData } = useSWR<{ cargos: CargoOption[] }>('/api/admin/roles', fetcher);
  const {
    data: usersData,
    isLoading,
    mutate,
  } = useSWR<{ users: UserRow[] }>('/api/admin/assign-cargo', fetcher);

  const cargos = rolesData?.cargos ?? [];
  const users = usersData?.users ?? [];

  const filtered = users.filter((u) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return u.email.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q);
  });

  const handleAssign = async (userId: string, cargoId: string) => {
    setSavingId(userId);
    const payload = cargoId === UNASSIGNED ? null : cargoId;

    // Optimistic update
    mutate(
      (prev) =>
        prev
          ? { users: prev.users.map((u) => (u.id === userId ? { ...u, cargo_id: payload } : u)) }
          : prev,
      { revalidate: false }
    );

    try {
      const res = await fetch('/api/admin/assign-cargo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, cargoId: payload }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo asignar el cargo');
      }
      toast({ title: 'Cargo asignado', description: 'El cargo se actualizó correctamente.' });
    } catch (e) {
      mutate(); // revert to server truth
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error al asignar cargo',
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Asignar cargo a usuarios</CardTitle>
        <div className="relative mt-2 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No se encontraron usuarios.
          </p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.full_name}</p>
                  <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {savingId === u.id && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  <Select
                    value={u.cargo_id ?? UNASSIGNED}
                    onValueChange={(val) => handleAssign(u.id, val)}
                  >
                    <SelectTrigger className="w-full sm:w-64">
                      <SelectValue placeholder="Sin cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Sin cargo</SelectItem>
                      {cargos.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
