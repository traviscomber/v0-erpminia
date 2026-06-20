import { useEffect, useState } from 'react';
import { Edit2, Loader2, Trash2 } from 'lucide-react';
import type { UserRole } from '@/lib/rbac';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  email_confirmed_at: string;
  last_sign_in_at: string;
}

const ROLES: UserRole[] = ['superadmin', 'admin', 'manager', 'technician', 'warehouse_staff', 'finance_officer', 'viewer'];

const roleColors = {
  superadmin: 'bg-red-200 text-red-900',
  admin: 'bg-red-100 text-red-800',
  manager: 'bg-blue-100 text-blue-800',
  technician: 'bg-green-100 text-green-800',
  warehouse_staff: 'bg-yellow-100 text-yellow-800',
  finance_officer: 'bg-purple-100 text-purple-800',
  viewer: 'bg-gray-100 text-gray-800',
};

export function UsersList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    void fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      const data = await res.json().catch(() => null);
      setUsers(data?.users || []);
    } catch (error) {
      console.error('[v0] Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        setUsers(users.map((user) => (user.id === userId ? { ...user, role: newRole } : user)));
        setEditingId(null);
      }
    } catch (error) {
      console.error('[v0] Error updating role:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        setUsers(users.filter((user) => user.id !== userId));
      }
    } catch (error) {
      console.error('[v0] Error deleting user:', error);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
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
        <Input
          placeholder="Buscar por correo o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-sm">{user.email}</TableCell>
                  <TableCell>{user.full_name}</TableCell>
                  <TableCell>
                    {editingId === user.id ? (
                      <Select value={user.role} onValueChange={(newRole) => handleUpdateRole(user.id, newRole as UserRole)}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={roleColors[user.role]}>{user.role}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.email_confirmed_at ? (
                      <Badge variant="outline" className="bg-green-50">
                        Confirmado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50">
                        Pendiente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('es-CL') : 'Nunca'}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(editingId === user.id ? null : user.id)}
                      disabled={editingId !== null && editingId !== user.id}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            {searchTerm ? 'No se encontraron usuarios.' : 'No hay usuarios registrados.'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
