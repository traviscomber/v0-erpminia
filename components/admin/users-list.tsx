import { useEffect, useMemo, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

export function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/users', { credentials: 'include' });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudieron cargar los usuarios');
      }
      setUsers(Array.isArray(payload?.users) ? payload.users : []);
    } catch (cause) {
      setUsers([]);
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

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
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudo eliminar el usuario');
      }
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
          {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
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
                <TableHead>Activo</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-sm">{user.email}</TableCell>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{user.cargo || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === 'active' ? 'secondary' : 'outline'}>
                      {user.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('es-CL') : 'Nunca'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={deletingId === user.id}
                      onClick={() => void handleDeleteUser(user.id)}
                      aria-label={`Eliminar ${user.email}`}
                    >
                      {deletingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
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
