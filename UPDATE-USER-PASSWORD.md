# Actualizar Contraseña de Usuario en Supabase

Tu usuario `juan@n3uralia.com` ya existe en la base de datos, pero necesitamos actualizar su contraseña a "c4rlit0s".

## Opción 1: Usando SQL en Supabase Editor (Recomendado)

1. Ve a tu proyecto Supabase: https://app.supabase.com
2. Click en **SQL Editor**
3. Copia y pega este SQL:

```sql
-- Para actualizar la contraseña a "c4rlit0s"
UPDATE public.profiles
SET password_hash = crypt('c4rlit0s', gen_salt('bf'))
WHERE email = 'juan@n3uralia.com';
```

4. Click en **"Run"** o presiona `Ctrl+Enter`
5. Debería mostrar "1 row updated"

Listo! Ahora podrás hacer login con:
- Email: `juan@n3uralia.com`
- Contraseña: `c4rlit0s`

## Verificación

Para confirmar que se actualizó correctamente, ejecuta:

```sql
SELECT email, password_hash, full_name, role FROM public.profiles
WHERE email = 'juan@n3uralia.com';
```

Deberías ver un hash (algo como: `$2a$12$...`) en el campo `password_hash`.

## Troubleshooting

### Error: "crypt function not found"
Asegúrate de que la extension `pgcrypto` está instalada en Supabase. En la mayoría de proyectos ya viene instalada por defecto.

### Aún da error "Credenciales inválidas"
1. Verifica que el email sea exactamente `juan@n3uralia.com` (sin espacios)
2. Asegúrate de que `password_hash` tenga un valor después de actualizar
3. Limpia cookies del navegador (Ctrl+Shift+Delete) y intenta de nuevo

---

¿Ya lo hiciste? Intenta login ahora con juan@n3uralia.com / c4rlit0s
