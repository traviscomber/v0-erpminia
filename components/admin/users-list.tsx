import { useEffect, useMemo, useState } from 'react';
import { Loader2, MoreHorizontal, Pencil, Save, Search, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatePanel } from '@/components/ui/state-panel';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface User {
  id: string;
  email: string;
  full_name: string;
  cargo: string | null;
  role: string;
  status: string;
  created_at: string;
  email_confirmed_at: string;
  last_sign_in_at: string;
}

interface Cargo {
  id: string;
  name: string;
}

const ROLE_OPTIONS = ['viewer', 'technician', 'tecnico', 'manager', 'jefe_mantencion', 'admin', 'superadmin'];
const ROLE_LABELS: Record<string, string> = {
  viewer: 'Lectura',
  technician: 'Técnico',
  tecnico: 'Técnico',
  manager: 'Jefatura',
  jefe_mantencion: 'Jefe Mantención',
  admin: 'Administrador',
  superadmin: 'Superadmin',
};

export function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCargoId, setEditCargoId] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editRole, setEditRole] = useState('viewer');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersResponse, cargosResponse] = await Promise.all([
        fetch('/api/admin/users', { credentials: 'include' }),
        fetch('/api/admin/cargos', { credentials: 'include' }),
      ]);
      const usersPayload = await usersResponse.json().catch(() => null);
      const cargosPayload = await cargosResponse.json().catch(() => null);
      if (!usersResponse.ok) throw new Error(usersPayload?.error || 'No se pudieron cargar los usuarios');
      if (!cargosResponse.ok) throw new Error(cargosPayload?.error || 'No se pudieron cargar los cargos');
      setUsers(Array.isArray(usersPayload?.users) ? usersPayload.users : []);
      setCargos(Array.isArray(cargosPayload?.cargos) ? cargosPayload.cargos : []);
    } catch (cause) {
      setUsers([]);
      setCargos([]);
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  const beginEdit = (user: User) => {
    setActionError(null);
    setEditingId(user.id);
    setEditName(user.full_name || '');
    setEditCargoId(cargos.find((cargo) => cargo.name === user.cargo)?.id || '');
    setEditStatus(user.status === 'inactive' ? 'inactive' : 'active');
    setEditRole(user.role || 'viewer');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditCargoId('');
    setEditStatus('active');
    setEditRole('viewer');
  };

  const handleSaveUser = async (userId: string) => {
    if (!editName.trim()) {
      setActionError('El nombre es obligatorio.');
      return;
    }
    if (!editCargoId) {
      setActionError('Debes seleccionar un cargo.');
      return;
    }

    setSavingId(userId);
    setActionError(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, full_name: editName.trim(), cargo_id: editCargoId, status: editStatus, role: editRole }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo actualizar el usuario');
      cancelEdit();
      await fetchUsers();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo actualizar el usuario');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
    setDeletingId(userId);
    setActionError(null);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'No se pudo eliminar el usuario');
      setUsers((current) => current.filter((user) => user.id !== userId));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo eliminar el usuario');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      const matchesTerm = !term || [user.email, user.full_name, user.cargo, user.role].some((value) => String(value || '').toLowerCase().includes(term));
      return matchesStatus && matchesTerm;
    });
  }, [searchTerm, statusFilter, users]);

  const activeCount = users.filter((user) => user.status === 'active').length;
  const inactiveCount = users.length - activeCount;

  if (loading) {
    return <div className="flex min-h-48 items-center justify-center border-y"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (error) {
    return <StatePanel tone="error" title="No fue posible cargar los usuarios" description={`${error}. La falla de la fuente no se interpreta como una lista vacía.`} actions={<Button variant="outline" onClick={() => void fetchUsers()}>Reintentar</Button>} />;
  }

  const editFields = (user: User) => (
    <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_minmax(220px,1.25fr)_140px_170px_auto] lg:items-end">
      <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Nombre</label><Input value={editName} onChange={(event) => setEditName(event.target.value)} /></div>
      <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Cargo</label><Select value={editCargoId} onValueChange={setEditCargoId}><SelectTrigger><SelectValue placeholder="Seleccionar cargo" /></SelectTrigger><SelectContent>{cargos.map((cargo) => <SelectItem key={cargo.id} value={cargo.id}>{cargo.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Estado</label><Select value={editStatus} onValueChange={setEditStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Activo</SelectItem><SelectItem value="inactive">Inactivo</SelectItem></SelectContent></Select></div>
      <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Rol</label><Select value={editRole} onValueChange={setEditRole}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ROLE_OPTIONS.map((role) => <SelectItem key={role} value={role}>{ROLE_LABELS[role] || role}</SelectItem>)}</SelectContent></Select></div>
      <div className="flex gap-2 lg:justify-end"><Button size="sm" disabled={savingId === user.id} onClick={() => void handleSaveUser(user.id)}>{savingId === user.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar</Button><Button variant="outline" size="sm" disabled={savingId === user.id} onClick={cancelEdit}><X className="mr-2 h-4 w-4" />Cancelar</Button></div>
    </div>
  );

  return (
    <div className="space-y-4">
      {actionError ? <StatePanel tone="error" title="No fue posible completar la acción" description={actionError} className="min-h-0" /> : null}

      <div className="flex flex-col gap-3 border-y py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-medium">{users.length} usuarios</div>
          <div className="mt-1 text-xs text-muted-foreground">{activeCount} activos · {inactiveCount} inactivos</div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <div className="relative min-w-0 sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar nombre, correo o cargo" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="active">Activos</SelectItem><SelectItem value="inactive">Inactivos</SelectItem></SelectContent>
          </Select>
        </div>
      </div>

      <div className="hidden overflow-hidden border md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead>Usuario</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="w-24 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => {
              const editing = editingId === user.id;
              return editing ? (
                <TableRow key={user.id} className="bg-muted/20 hover:bg-muted/20">
                  <TableCell colSpan={5} className="p-4">
                    <div className="mb-3"><div className="font-medium">{user.email}</div><div className="mt-0.5 text-xs text-muted-foreground">Edición de cuenta</div></div>
                    {editFields(user)}
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={user.id} className="group">
                  <TableCell><div className="font-medium">{user.full_name}</div><div className="mt-0.5 text-xs text-muted-foreground">{user.email}</div></TableCell>
                  <TableCell className="max-w-[420px] text-sm text-muted-foreground"><span className="line-clamp-2">{user.cargo || 'Sin cargo'}</span></TableCell>
                  <TableCell><Badge variant={user.status === 'active' ? 'secondary' : 'outline'}>{user.status === 'active' ? 'Activo' : 'Inactivo'}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ROLE_LABELS[user.role] || user.role}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" className="min-h-10 min-w-10 px-0" onClick={() => beginEdit(user)} aria-label={`Editar ${user.email}`}><Pencil className="h-4 w-4" /></Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="min-h-10 min-w-10 px-0" aria-label={`Más acciones para ${user.email}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end"><DropdownMenuItem variant="destructive" disabled={deletingId === user.id} onClick={() => void handleDeleteUser(user.id)}><Trash2 className="h-4 w-4" />Eliminar usuario</DropdownMenuItem></DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2 md:hidden">
        {filteredUsers.map((user) => {
          const editing = editingId === user.id;
          return <Card key={user.id} className="shadow-none"><CardContent className="p-4">{editing ? <><div className="mb-4"><div className="font-medium">{user.full_name}</div><div className="mt-1 text-xs text-muted-foreground">{user.email}</div></div>{editFields(user)}</> : <div className="space-y-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="truncate font-medium">{user.full_name}</div><div className="mt-1 truncate text-xs text-muted-foreground">{user.email}</div></div><Badge variant={user.status === 'active' ? 'secondary' : 'outline'}>{user.status === 'active' ? 'Activo' : 'Inactivo'}</Badge></div><div className="text-sm text-muted-foreground">{user.cargo || 'Sin cargo'}</div><div className="flex items-center justify-between border-t pt-3"><span className="text-xs text-muted-foreground">{ROLE_LABELS[user.role] || user.role}</span><div className="flex gap-1"><Button variant="ghost" size="sm" className="min-h-10 min-w-10 px-0" onClick={() => beginEdit(user)} aria-label={`Editar ${user.email}`}><Pencil className="h-4 w-4" /></Button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="min-h-10 min-w-10 px-0" aria-label={`Más acciones para ${user.email}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem variant="destructive" onClick={() => void handleDeleteUser(user.id)}><Trash2 className="h-4 w-4" />Eliminar usuario</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div></div>}</CardContent></Card>;
        })}
      </div>

      {filteredUsers.length === 0 ? <div className="border-y py-14 text-center"><p className="font-medium">No hay usuarios para mostrar</p><p className="mt-1 text-sm text-muted-foreground">Ajusta la búsqueda o el filtro de estado.</p></div> : null}
    </div>
  );
}
