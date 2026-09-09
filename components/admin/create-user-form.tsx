import { useState } from 'react';
import useSWR from 'swr';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatePanel } from '@/components/ui/state-panel';

interface Cargo {
  id: string;
  name: string;
  display_order: number;
}

interface CreateUserFormProps {
  onUserCreated: () => void;
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || 'No se pudieron cargar los cargos');
  return payload;
};

export function CreateUserForm({ onUserCreated }: CreateUserFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [cargoId, setCargoId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    data: cargosData,
    error: cargosError,
    isLoading: cargosLoading,
    mutate: mutateCargos,
  } = useSWR<{ cargos: Cargo[] }>('/api/admin/cargos', fetcher, { revalidateOnFocus: false });
  const cargos = Array.isArray(cargosData?.cargos) ? cargosData.cargos : [];

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return 'Mínimo 8 caracteres';
    if (!/[A-Z]/.test(pwd)) return 'Debe contener mayúscula';
    if (!/[0-9]/.test(pwd)) return 'Debe contener número';
    if (!/[!@#$%^&*]/.test(pwd)) return 'Debe contener símbolo (!@#$%^&*)';
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!email || !password || !fullName || !cargoId) {
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
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          cargo_id: cargoId,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Error al crear usuario');

      setSuccess(true);
      setEmail('');
      setPassword('');
      setFullName('');
      setCargoId('');
      onUserCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al crear usuario. Intenta de nuevo.');
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
          <div className="flex items-center gap-3 rounded-md border p-4">
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm">Usuario creado correctamente.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? <StatePanel tone="error" title="No fue posible crear el usuario" description={error} className="min-h-0" /> : null}
            {cargosError ? (
              <StatePanel
                tone="error"
                title="No fue posible cargar los cargos"
                description={`${cargosError.message}. La falla de la fuente no se interpreta como ausencia de cargos.`}
                actions={<Button type="button" variant="outline" size="sm" onClick={() => void mutateCargos()}>Reintentar</Button>}
                className="min-h-0"
              />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium">Nombre completo</label>
                <Input id="fullName" placeholder="Juan Pérez" value={fullName} onChange={(event) => setFullName(event.target.value)} disabled={loading} required />
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">Correo electrónico</label>
                <Input id="email" type="email" placeholder="usuario@empresa.cl" value={email} onChange={(event) => setEmail(event.target.value)} disabled={loading} required />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Contraseña</label>
              <Input id="password" type="password" placeholder="********" value={password} onChange={(event) => setPassword(event.target.value)} disabled={loading} required />
              <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, mayúscula, número y símbolo.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="cargo" className="text-sm font-medium">Cargo</label>
              <Select value={cargoId} onValueChange={setCargoId} disabled={loading || cargosLoading || Boolean(cargosError)}>
                <SelectTrigger id="cargo">
                  <SelectValue placeholder={cargosLoading ? 'Cargando...' : cargosError ? 'Cargos no disponibles' : 'Seleccionar cargo...'} />
                </SelectTrigger>
                <SelectContent>
                  {cargos.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground">No hay cargos registrados.</div>
                  ) : cargos.map((cargo) => (
                    <SelectItem key={cargo.id} value={cargo.id}>{cargo.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!cargosError ? <p className="text-xs text-muted-foreground">Los permisos se definen en la matriz de roles.</p> : null}
            </div>

            <Button type="submit" className="w-full" disabled={loading || cargosLoading || Boolean(cargosError) || !cargoId}>
              {loading ? 'Creando usuario...' : 'Crear usuario'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
