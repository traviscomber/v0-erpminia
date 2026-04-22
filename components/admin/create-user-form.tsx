import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { UserRole } from '@/lib/rbac';

const ROLES: UserRole[] = ['admin', 'manager', 'technician', 'warehouse_staff', 'finance_officer', 'viewer'];

interface CreateUserFormProps {
  onUserCreated?: () => void;
}

export function CreateUserForm({ onUserCreated }: CreateUserFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return 'Mínimo 8 caracteres';
    if (!/[A-Z]/.test(pwd)) return 'Debe contener mayúscula';
    if (!/[0-9]/.test(pwd)) return 'Debe contener número';
    if (!/[!@#$%^&*]/.test(pwd)) return 'Debe contener símbolo (!@#$%^&*)';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validations
    if (!email || !password || !fullName) {
      setError('Todos los campos son obligatorios');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(`Contraseña débil: ${passwordError}`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Error al crear usuario');
        return;
      }

      setSuccess(true);
      setEmail('');
      setPassword('');
      setFullName('');
      setRole('viewer');

      setTimeout(() => {
        setSuccess(false);
        onUserCreated?.();
      }, 2000);
    } catch (err) {
      setError('Error al crear usuario. Intenta de nuevo.');
      console.error('[v0] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crear Nuevo Usuario</CardTitle>
        <CardDescription>
          Agrega un nuevo usuario al sistema y asigna un rol
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800">Usuario creado exitosamente</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium">
                  Nombre Completo
                </label>
                <Input
                  id="fullName"
                  placeholder="Juan Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@empresa.cl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Min 8 carac, mayúscula, número, símbolo
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="role" className="text-sm font-medium">
                  Rol
                </label>
                <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                  <SelectTrigger id="role" disabled={loading}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creando usuario...' : 'Crear Usuario'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
