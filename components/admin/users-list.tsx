import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Save, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
        body: JSON.stringify({
          userId,
          full_name: editName.trim(),
          cargo_id: editCargoId,
          status: editStatus,
          role: editRole,
        }),
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
    if (!term) return users;
    return users.filter((user) =>
      [user.email, user.full_name, user.cargo, user.role]
        .some((value) => String(value || '').toLowerCase().includes(term)),
    );
  }, [searchTerm, users]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <StatePanel
        tone="error"
        title="No fue posible cargar los usuarios"
        description={`${error}. La falla de la fuente no se interpreta como una lista vacía.`}
        actions={<Button variant="outline" onClick={() => void fetchUsers()}>Reintentar</Button>}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestionar usuarios</CardTitle>
        <CardDescription>
          {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}. Edita nombre, cargo, estado y rol directamente aquí.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionError ? (
          <StatePanel tone="error" title="No fue posible completar la acción" description={actionError} className="min-h-0" />
        ) : null}

        <Input
          placeholder="Buscar por correo, nombre, cargo o rol..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="max-w-md"
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const editing = editingId === user.id;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-sm">{user.email}</TableCell>
                    <TableCell>
                      {editing ? (
                        <Input value={editName} onChange={(event) => setEditName(event.target.value)} className="min-w-44" />
                      ) : user.full_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {editing ? (
                        <Select value={editCargoId} onValueChange={setEditCargoId}>
                          <SelectTrigger className="min-w-52"><SelectValue placeholder="Seleccionar cargo" /></SelectTrigger>
                          <SelectContent>
                            {cargos.map((cargo) => <SelectItem key={cargo.id} value={cargo.id}>{cargo.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : user.cargo || '—'}
                    </TableCell>
                    <TableCell>
                      {editing ? (
                        <Select value={editStatus} onValueChange={setEditStatus}>
                          <SelectTrigger className="min-w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Activo</SelectItem>
                            <SelectItem value="inactive">Inactivo</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={user.status === 'active' ? 'secondary' : 'outline'}>
                          {user.status === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editing ? (
                        <Select value={editRole} onValueChange={setEditRole}>
                          <SelectTrigger className="min-w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : <span className="text-sm text-muted-foreground">{user.role}</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {editing ? (
                          <>
                            <Button variant="ghost" size="sm" disabled={savingId === user.id} onClick={() => void handleSaveUser(user.id)} aria-label={`Guardar ${user.email}`}>
                              {savingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="sm" disabled={savingId === user.id} onClick={cancelEdit} aria-label={`Cancelar edición ${user.email}`}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => beginEdit(user)} aria-label={`Editar ${user.email}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={deletingId === user.id || editing}
                          onClick={() => void handleDeleteUser(user.id)}
                          aria-label={`Eliminar ${user.email}`}
                        >
                          {deletingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {searchTerm ? 'No se encontraron usuarios.' : 'No hay usuarios registrados.'}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
