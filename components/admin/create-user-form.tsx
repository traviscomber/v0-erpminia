'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { UserRole } from '@/lib/rbac';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Supervisor' },
  { value: 'technician', label: 'Técnico' },
  { value: 'warehouse_staff', label: 'Bodega' },
  { value: 'finance_officer', label: 'Finanzas' },
  { value: 'viewer', label: 'Lectura' },
];

interface Cargo {
  id: string;
  name: string;
}

interface CreateUserFormProps {
  onUserCreated: () => void;
}

export function CreateUserForm({ onUserCreated }: CreateUserFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [cargoId, setCargoId] = useState<string>('');
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cargosLoading, setCargosLoading] = useState(true);

  // Load available cargos
  useEffect(() => {
    const loadCargos = async () => {
      try {
        const res = await fetch('/api/cargos');
        if (res.ok) {
          const data = await res.json();
          setCargos(data.cargos || []);
        }
      } catch (err) {
        console.error('[v0] Error loading cargos:', err);
      } finally {
        setCargosLoading(false);
      }
    };

    loadCargos();
  }, []);

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

    if (!email || !password || !fullName || !role) {
      setError('Nombre, correo, contraseña y rol son obligatorios');
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
          role,
          cargo_id: cargoId || null,
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
      setRole('viewer');
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
        <CardDescription>Agrega un usuario del equipo. Los roles y cargos se crean en el módulo "Roles y cargos".</CardDescription>
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

            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
              <p className="text-sm text-blue-800">
                <strong>Importante:</strong> Los cargos se crean en "Roles y cargos" → "Asignar cargos". Los roles del sistema están predefinidos.
              </p>
            </div>

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

            <div className="grid grid-cols-2 gap-4">
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
                <label htmlFor="role" className="text-sm font-medium">
                  Rol del sistema *
                </label>
                <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                  <SelectTrigger id="role" disabled={loading}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Roles del sistema (predefinidos)</p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="cargo" className="text-sm font-medium">
                Cargo / Posición (opcional)
              </label>
              <Select value={cargoId} onValueChange={setCargoId} disabled={cargosLoading || loading}>
                <SelectTrigger id="cargo">
                  <SelectValue placeholder="Selecciona un cargo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin cargo asignado</SelectItem>
                  {cargos.map((cargo) => (
                    <SelectItem key={cargo.id} value={cargo.id}>
                      {cargo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {cargosLoading ? 'Cargando cargos...' : 'Los cargos se crean en Roles y cargos → Asignar cargos'}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading || cargosLoading}>
              {loading ? 'Creando usuario...' : 'Crear usuario'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
