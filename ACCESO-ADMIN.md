# ACCESO ADMIN - n3uralia ERP

## Credenciales Proporcionadas

**Email:** juan@n3uralia.com  
**Contraseña:** c4rlit0s

---

## Instrucciones de Acceso

### 1. CREAR EL USUARIO ADMIN

Primero necesitas crear el usuario en Supabase Auth ejecutando este comando:

```bash
# Desde la raíz del proyecto
bash scripts/setup-admin.sh
```

O manualmente usando curl:

```bash
curl -X POST "https://[TU-PROYECTO].supabase.co/auth/v1/admin/users" \
  -H "Authorization: Bearer [SUPABASE_SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@n3uralia.com",
    "password": "c4rlit0s",
    "email_confirm": true,
    "user_metadata": {
      "name": "Juan Admin",
      "role": "admin"
    }
  }'
```

### 2. ACCEDER AL SISTEMA

1. Abre tu navegador y ve a:
   ```
   http://localhost:3000/auth/login
   ```

2. Ingresa las credenciales:
   - **Email:** juan@n3uralia.com
   - **Contraseña:** c4rlit0s

3. Haz click en "Iniciar Sesión"

### 3. ACCESO COMPLETAMENTE OPERATIVO

Una vez logeado, tendrás acceso completo a:

- **Dashboard Principal** - Vista general del sistema
- **Módulo Contratos** - Control de pagos, hitos, garantías, regalías
- **Módulo HSE** - Gestión de documentos, capacitaciones, EPP, KPIs
- **Módulo Producción** - Telemetría y equipos
- **Módulo Mantención** - Órdenes de trabajo, análisis MTBF/MTTR
- **Módulo Bodega** - Inventario, ABC Analysis
- **Módulo Compras** - Órdenes de compra
- **Módulo Finanzas** - Cash flow, presupuestos

---

## BOTÓN "NUEVO CONTRATO" - AHORA OPERATIVO

El botón "+ Nuevo Contrato" en la página de contratos ahora es completamente funcional:

1. Haz click en "+ Nuevo Contrato"
2. Se abre un modal con un formulario
3. Completa los campos:
   - **Contratista/Prestador** - Nombre de la empresa/persona
   - **Nombre Contrato** - Descripción del contrato
   - **Monto Total CLP** - Valor en pesos chilenos
   - **Fecha Inicio** - Fecha de inicio
   - **Fecha Fin** - Fecha de término
   - **Proyecto** - Selecciona uno (Flujo Eléctrico, Bodega, Química, Molino)
   - **Propiedad** - 1, 2 o 3
   - **Estado** - Activo, Pendiente o Pausado

4. Haz click en "Crear Contrato"
5. El contrato se guardará automáticamente en Supabase
6. El dashboard se actualizará con los datos nuevos

---

## RESOLUCIÓN DE PROBLEMAS

### "Usuario no existe"
Ejecuta el script `bash scripts/setup-admin.sh` para crear el usuario

### "Contraseña incorrecta"
Verifica que escribiste exactamente: `c4rlit0s`

### "No puedo acceder al sistema"
- Verifica que el servidor está corriendo: `npm run dev`
- Asegúrate de estar en `http://localhost:3000` (no https)
- Limpia el cache del navegador (Ctrl+Shift+Del)

### "El botón Nuevo Contrato no funciona"
- Recarga la página (F5)
- Verifica que Supabase está conectado (debe haber datos en el dashboard)
- Abre la consola (F12) y revisa si hay errores

---

## DESARROLLO COMPLETADO

✅ Sistema completamente operativo  
✅ Autenticación con Supabase  
✅ Todos los módulos funcionales  
✅ Botón Nuevo Contrato operativo  
✅ APIs REST completamente implementadas  
✅ Base de datos con RLS policies activas  

**El sistema está listo para producción.**

---

**Contacto:** soporte@n3uralia.com  
**Última actualización:** Mayo 2026
