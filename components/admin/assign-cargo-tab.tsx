'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { StatePanel } from '@/components/ui/state-panel';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search } from 'lucide-react';

interface CargoOption { id: string; name: string; display_order: number }
interface UserRow { id: string; email: string; full_name: string; role: string | null; cargo_id: string | null }

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudo cargar la información');
  return payload;
};

const UNASSIGNED = '__none__';

export function AssignCargoTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: rolesData, error: rolesError, mutate: mutateRoles } = useSWR<{ cargos: CargoOption[] }>('/api/admin/roles', fetcher, { revalidateOnFocus: false });
  const { data: usersData, error: usersError, isLoading, mutate } = useSWR<{ users: UserRow[] }>('/api/admin/assign-cargo', fetcher, { revalidateOnFocus: false });

  const cargos = rolesData?.cargos ?? [];
  const users = usersData?.users ?? [];
  const sourceError = rolesError || usersError;
  const filtered = users.filter((user) => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    return user.email.toLowerCase().includes(query) || user.full_name.toLowerCase().includes(query);
  });

  const handleAssign = async (userId: string, cargoId: string) => {
    setSavingId(userId);
    const payload = cargoId === UNASSIGNED ? null : cargoId;
    try {
      const response = await fetch('/api/admin/assign-cargo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId, cargoId: payload }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'No se pudo asignar el cargo');
      await mutate();
      toast({ title: 'Cargo asignado', description: 'La asignación fue confirmada por el servidor.' });
    } catch (cause) {
      toast({ title: 'Error', description: cause instanceof Error ? cause.message : 'Error al asignar cargo', variant: 'destructive' });
      await mutate();
    } finally {
      setSavingId(null);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (sourceError) {
    return (
      <StatePanel
        tone="error"
        title="No fue posible cargar usuarios y cargos"
        description="La falla de la fuente no se interpreta como ausencia de usuarios o cargos."
        actions={<Button variant="outline" onClick={() => { void mutate(); void mutateRoles(); }}>Reintentar</Button>}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Asignar cargo a usuarios</CardTitle>
        <div className="relative mt-2 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o correo..." value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{search ? 'No se encontraron usuarios.' : 'No hay usuarios registrados.'}</p>
        ) : (
          <div className="divide-y divide-border rounded-md border border-border">
            {filtered.map((user) => (
              <div key={user.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium">{user.full_name}</p>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {savingId === user.id ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
                  <Select value={user.cargo_id ?? UNASSIGNED} onValueChange={(value) => void handleAssign(user.id, value)} disabled={savingId === user.id}>
                    <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Sin cargo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNASSIGNED}>Sin cargo</SelectItem>
                      {cargos.map((cargo) => <SelectItem key={cargo.id} value={cargo.id}>{cargo.name}</SelectItem>)}
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
