import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
                    {user.status === 'active' ? (
                      <Badge className="border-0 bg-emerald-600 text-white">Activo</Badge>
                    ) : (
                      <Badge className="border-0 bg-zinc-600 text-white">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('es-CL') : 'Nunca'}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
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
