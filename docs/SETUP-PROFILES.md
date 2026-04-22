# Setup de Tabla Profiles

## ¿Qué hace?

Crea una tabla `profiles` en PostgreSQL que sincroniza automáticamente con los usuarios de Supabase Auth. Esto permite:

- ✅ Almacenar información adicional del usuario (nombre, rol, etc)
- ✅ Ver todos los usuarios registrados en la base de datos
- ✅ Aplicar Row Level Security (RLS) para proteger datos
- ✅ Automatic sync cuando se registra un nuevo usuario

## Opción 1: Usar la UI (RECOMENDADO)

1. Ve a: `http://localhost:3000/admin/setup-database`
2. Click en "Iniciar Setup"
3. Espera a que se complete
4. Verás cuántos usuarios fueron sincronizados

## Opción 2: Ejecutar el SQL manualmente

1. Ve a [Supabase Console](https://app.supabase.com)
2. Tu proyecto → SQL Editor
3. Click en "New Query"
4. Copia el contenido de `scripts/001-create-profiles-table.sql`
5. Pega y ejecuta
6. Click en "Execute"

## Opción 3: Ejecutar los endpoints con curl

**Crear tabla:**
```bash
curl -X POST http://localhost:3000/api/admin/setup-profiles
```

**Sincronizar usuarios existentes:**
```bash
curl -X POST http://localhost:3000/api/admin/sync-existing-users
```

## Verificar que funcionó

Ve a Supabase Console → Database → Tables y deberías ver:
- `profiles` table con columnas: `id`, `email`, `full_name`, `role`, `created_at`, `updated_at`

O ejecuta esta query en SQL Editor:
```sql
SELECT * FROM public.profiles;
```

Deberías ver a `demo@n3uralia.com` y `juan@n3uralia.com` aquí.

## ¿Qué pasa cuando se registra un nuevo usuario?

Automáticamente:
1. Se crea un usuario en `auth.users` (Supabase Auth)
2. El trigger `on_auth_user_created` se dispara
3. Se crea automáticamente un row en `profiles` con la información del usuario

## RLS (Row Level Security)

Está habilitado para que:
- Cada usuario solo vea su propio profile
- Los admins puedan ver todos los profiles
- Otros roles tengan acceso limitado según sus permisos

---

**Próximo paso:** Una vez sincronizado, los usuarios aparecerán en la base de datos y podrás:
- Ver quién está registrado
- Asignarles roles
- Asignarles permisos específicos
- Filtrar datos por rol
