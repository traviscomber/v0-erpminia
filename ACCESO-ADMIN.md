# ACCESO ADMIN - Motil

## Política de acceso

Las credenciales administrativas no se almacenan en el repositorio, documentación versionada, frontend, logs ni archivos de ejemplo.

El acceso administrativo debe gestionarse mediante Supabase Auth y roles de aplicación. Las contraseñas se crean o restablecen por un canal seguro y nunca deben quedar incluidas en Git.

## Acceso al sistema

1. Abrir `/auth/login` en el entorno correspondiente.
2. Iniciar sesión con una cuenta autorizada existente.
3. La autorización efectiva se determina en servidor mediante la organización y el rol del usuario.

## Roles

Los módulos deben aplicar autorización server-side. Las escrituras sensibles no deben depender de metadata editable por el usuario ni de comprobaciones exclusivamente de cliente.

## Recuperación de acceso

Si una cuenta administrativa perdió acceso, utilizar el flujo seguro de recuperación/restablecimiento de Supabase Auth o la consola administrativa correspondiente. No agregar contraseñas temporales a este archivo.

## Seguridad

- No exponer `SUPABASE_SERVICE_ROLE_KEY` ni otras claves secretas.
- No usar variables `NEXT_PUBLIC_*` para secretos.
- No documentar contraseñas reales o reutilizables.
- Revocar o rotar credenciales que hayan sido publicadas accidentalmente.
- Mantener auditoría de roles y acceso por organización.
