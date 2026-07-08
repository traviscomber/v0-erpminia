import { useState } from 'react';
import useSWR from 'swr';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Cargo {
  id: string;
  name: string;
  display_order: number;
}

interface CreateUserFormProps {
  onUserCreated: () => void;
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

export function CreateUserForm({ onUserCreated }: CreateUserFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [cargoId, setCargoId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { data: cargosData } = useSWR<{ cargos: Cargo[] }>('/api/admin/cargos', fetcher);
  const cargos = cargosData?.cargos ?? [];

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
        body: JSON.stringify({ 
          email, 
          password, 
          full_name: fullName, 
          cargo_id: cargoId || null 
        }),
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
      setCargoId('');

      setTimeout(() => {
        setSuccess(false);
        onUserCreated();
      }, 1500);
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
        <CardTitle>Crear nuevo usuario</CardTitle>
        <CardDescription>Agrega un usuario del equipo y asigna su cargo. Los permisos se heredan de la matriz de roles.</CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800">Usuario creado exitosamente</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium">
                  Nombre completo
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
                  Correo electrónico
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

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, mayúscula, número y símbolo.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="cargo" className="text-sm font-medium">
                Cargo
              </label>
              <Select value={cargoId} onValueChange={setCargoId} disabled={cargos.length === 0}>
                <SelectTrigger id="cargo" disabled={loading || cargos.length === 0}>
                  <SelectValue placeholder="Seleccionar cargo..." />
                </SelectTrigger>
                <SelectContent>
                  {cargos.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">
                      No hay cargos. Crea uno en Administración → Roles y cargos → Asignar cargos
                    </div>
                  ) : (
                    cargos.map((cargo) => (
                      <SelectItem key={cargo.id} value={cargo.id}>
                        {cargo.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Los permisos se definen en la matriz de roles</p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creando usuario...' : 'Crear usuario'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
