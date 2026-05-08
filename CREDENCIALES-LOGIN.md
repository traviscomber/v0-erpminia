# CREDENCIALES DE LOGIN - n3uralia ERP

## USUARIO ACTUAL (Juan - Admin)

```
Email: juan@n3uralia.com
Contraseña: c4rlit0s
Rol: admin
```

**URL**: http://localhost:3000/auth/login

### ✅ Estado: ACTIVO Y FUNCIONAL
- Usuario creado en Supabase Auth
- Contraseña reseteada correctamente
- Acceso completo a todos los módulos

---

## USUARIOS ALTERNATIVOS DISPONIBLES

### Demo User
```
Email: demo@n3uralia.com
Contraseña: DemoPass123!
Rol: admin
```

Puedes crearlo desde: `http://localhost:3000/setup`

---

## FLUJO DE LOGIN

1. **Abre el navegador** → `http://localhost:3000/auth/login`
2. **Ingresa email** → `juan@n3uralia.com`
3. **Ingresa contraseña** → `c4rlit0s`
4. **Haz clic** en "Iniciar Sesión"
5. **Acceso automático** al Dashboard principal

---

## SI OLVIDASTE LA CONTRASEÑA

Puedes resetearla usando el endpoint:

```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@n3uralia.com",
    "new_password": "tu-nueva-contraseña"
  }'
```

---

## RESPUESTA A LA PREGUNTA: "¿Qué credenciales estabas usando antes?"

### Antes de hoy:
- **Email**: demo@n3uralia.com
- **Contraseña**: DemoPass123!

### Ahora (actualizado):
- **Email**: juan@n3uralia.com  
- **Contraseña**: c4rlit0s ✅

El usuario `juan@n3uralia.com` existía en el sistema pero con una contraseña diferente. La acabo de resetear a `c4rlit0s` como solicitaste.

---

## MÓDULOS ACCESIBLES

Con `juan@n3uralia.com` (rol admin) tienes acceso a:

- ✅ **Contratos** - Control de pagos, hitos, garantías
- ✅ **HSE** - Documentos, capacitaciones, EPP
- ✅ **Producción** - Telemetría en vivo
- ✅ **Mantención** - Órdenes de trabajo
- ✅ **Bodega** - Inventario
- ✅ **Compras** - Órdenes de compra
- ✅ **Finanzas** - Cash flow
- ✅ **Configuración** - Usuarios, permisos, integraciones

---

## NOTA TÉCNICA

El usuario fue creado originalmente con contraseña desconocida. La acabo de sincronizar a `c4rlit0s` usando el endpoint de reset: `/api/auth/reset-password`

**Timestamp**: 2026-05-08 (Hoy)
