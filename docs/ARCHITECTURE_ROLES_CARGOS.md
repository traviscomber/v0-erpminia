# Arquitectura: Sistema de Roles, Cargos y Control de Acceso

## Visión General

El sistema Motil utiliza dos capas independientes pero integradas para controlar acceso y asignar responsabilidades:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA 1: ROL DEL SISTEMA (RBAC)               │
│                        (Control Global)                           │
│                                                                   │
│  lib/rbac.ts → Define permisos por rol del sistema              │
│  Roles: superadmin, admin, manager, technician,                 │
│         warehouse_staff, finance_officer, viewer                │
│                                                                   │
│  Determina QUÉ MÓDULOS puede acceder cada rol                   │
│  Determina QUÉ ACCIONES puede hacer (create, read, update, etc) │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (se combina con)
┌─────────────────────────────────────────────────────────────────┐
│         CAPA 2: CARGO/POSICIÓN (MATRIZ DE ROLES)                │
│                    (Control por Puesto)                          │
│                                                                   │
│  BD → Tabla 'cargos' (JEFE SOSTENIBILIDAD, JEFE MAN. EQ, etc)  │
│  BD → Tabla 'role_matrix' (mapeo cargo + módulo → nivel acceso) │
│                                                                   │
│  Determina RESTRICCIONES ADICIONALES por puesto de trabajo      │
│  Nivel acceso: ED (Editor), LEC (Solo lectura), SR (Sin acceso) │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo de Acceso de un Usuario

### 1. Crear Usuario
```
Formulario "Crear nuevo usuario"
    ↓
    ├─ Email: gonzalo@lapatagua.cl
    ├─ Nombre: Gonzalo Canales
    ├─ Rol del sistema: admin ⟵ Definido en lib/rbac.ts
    └─ Cargo: JEFE SOSTENIBILIDAD ⟵ Cargado de BD (cargos table)
    ↓
API POST /api/admin/users
    ↓
    ├─ Valida rol del sistema existe en lib/rbac.ts
    ├─ Valida cargo_id existe en BD
    └─ Crea profile en BD con (role, cargo_id)
```

### 2. Verificar Permisos
Cuando Gonzalo accede a un módulo:

```
Usuario Gonzalo (rol=admin, cargo=JEFE SOSTENIBILIDAD) 
accede a módulo 'bodega'
    ↓
Verificar Rol del Sistema (CAPA 1)
    ├─ lib/rbac.ts → admin.bodega = ['read', 'create', 'update', 'delete', ...]
    ├─ ✅ admin PUEDE acceder a bodega
    └─ Admin puede hacer: read, create, update, delete
    ↓ (combinado con)
Verificar Matriz de Cargos (CAPA 2)
    ├─ BD query: role_matrix 
    │   WHERE cargo_id = 'JEFE_SOSTENIBILIDAD' 
    │   AND module_key = 'bodega'
    ├─ Resultado: Nivel acceso = ED (Editor)
    ├─ ✅ JEFE SOSTENIBILIDAD PUEDE acceder a bodega en nivel ED
    └─ Cargo permite: Editar dentro de bodega
    ↓
PERMISOS FINALES (INTERSECCIÓN)
    ├─ Rol sistema: admin → create, read, update, delete
    ├─ Cargo matriz: JEFE_SOSTENIBILIDAD → ED (Editor)
    └─ RESULTADO FINAL: Usuario PUEDE leer y editar, pero limitado al cargo
```

## Componentes del Sistema

### 1. Base de Datos (Supabase)

#### Tabla: `cargos`
```sql
id (UUID)          -- ID único del cargo
name (TEXT)        -- Nombre: "JEFE SOSTENIBILIDAD"
display_order (INT) -- Orden de visualización
organization_id    -- Organización
created_at         -- Timestamp
```

#### Tabla: `role_matrix`
```sql
id (UUID)
cargo_id (UUID)    -- FK → cargos.id
module_key (TEXT)  -- 'bodega', 'finanzas', etc
access_level (TEXT)-- 'ED' (Editor), 'LEC' (Lectura), 'SR' (Sin acceso)
organization_id
```

#### Tabla: `profiles` (usuarios)
```sql
id (UUID)
email (TEXT)
full_name (TEXT)
role (TEXT)        -- Rol del sistema: 'admin', 'manager', etc
cargo_id (UUID)    -- FK → cargos.id (nullable, opcional)
```

### 2. Código TypeScript

#### `lib/rbac.ts` - Roles del Sistema
```typescript
// Define permisos globales por rol
export const rolePermissions: RolePermissions = {
  admin: {
    bodega: ['create', 'read', 'update', 'delete', 'approve', 'export'],
    finanzas: ['create', 'read', 'update', 'delete', 'approve', 'export'],
    // ... otros módulos
  },
  // ... otros roles
}

// Función helper para obtener roles disponibles
export function getAvailableRoles() {
  return [
    { value: 'superadmin', label: 'Super Administrador' },
    { value: 'admin', label: 'Administrador' },
    // ...
  ]
}
```

#### `components/admin/create-user-form.tsx`
```typescript
// Carga dinámicamente:
// 1. Roles del sistema desde lib/rbac.ts → getAvailableRoles()
// 2. Cargos desde BD → /api/admin/cargos
// 3. Usuario selecciona ambos cuando crea cuenta
```

#### `app/api/admin/cargos/route.ts` - Endpoint
```typescript
// GET /api/admin/cargos
// Devuelve: { cargos: [{ id, name, display_order }, ...] }
```

#### `app/api/admin/roles/route.ts` - Endpoint
```typescript
// GET /api/admin/roles
// Devuelve: matriz de cargos + matrix de permisos por módulo
```

### 3. Admin Modules

#### `app/dashboard/admin/roles/page.tsx`
Página administrativa con 2 tabs:

**Tab 1: "Asignar cargos"**
- Gestiona tabla `cargos`
- Crear, editar, eliminar cargos (JEFE SOSTENIBILIDAD, JEFE MAN. EQ, etc)
- Estos cargos aparecen en el dropdown de CreateUserForm

**Tab 2: "Matriz de roles"**
- Gestiona tabla `role_matrix`
- Define: cargo + módulo → nivel acceso (ED, LEC, SR)
- Ejemplo: JEFE_SOSTENIBILIDAD + bodega = ED (Editor)

#### `app/dashboard/admin/users/page.tsx`
Página de gestión de usuarios:
- CreateUserForm: Crear usuario (asigna rol del sistema + cargo)
- UsersImportXls: Importar usuarios desde Excel
- UsersList: Tabla con usuarios (muestra Nombre | Cargo | Rol)

## Flujos de Integración

### Flujo A: Crear Cargo
```
Admin accede a: Roles y cargos → Asignar cargos
    ↓
Crea cargo "JEFE RECURSOS HUMANOS"
    ↓
Automáticamente disponible en:
  1. Dropdown de CreateUserForm → "Cargo / Posición"
  2. Matriz de roles → puede asignar permisos módulo por módulo
```

### Flujo B: Crear Usuario Nuevo
```
Admin accede a: Gestión de usuarios → Crear nuevo usuario
    ↓
Selecciona:
  ├─ Rol del sistema: "Administrador"
  │   └─ Cargado de: lib/rbac.ts → getAvailableRoles()
  └─ Cargo: "JEFE SOSTENIBILIDAD"
       └─ Cargado de: BD → /api/admin/cargos
    ↓
Usuario creado con (role='admin', cargo_id='xyz')
    ↓
Cuando usuario accede a módulo:
  1. Verifica: admin puede acceder a módulo? → SI
  2. Verifica: JEFE SOSTENIBILIDAD puede acceder? → SI/NO según matriz
  3. Resultado: Permisos finales = intersección de ambos
```

### Flujo C: Importar Usuarios desde Excel
```
Admin: Gestión de usuarios → Importar usuarios desde XLS
    ↓
Excel debe tener columnas:
  ├─ EMAIL
  ├─ FULL_NAME
  ├─ ROLE (admin, manager, technician, etc) ← Busca en lib/rbac.ts
  └─ CARGO (JEFE SOSTENIBILIDAD, etc) ← Busca en BD
    ↓
Sistema valida que rol y cargo existan
    ↓
Crea usuarios con asignaciones correctas
```

## Preguntas Frecuentes

### P: ¿Un usuario sin cargo asignado puede acceder?
**R:** Sí. El cargo es opcional. El usuario solo está limitado por su rol del sistema.

### P: ¿Quién controla más restricciones: rol o cargo?
**R:** Ambos. Se aplica la INTERSECCIÓN. Si el rol permite pero el cargo no, se deniega.

### P: ¿Cómo agregar nuevo módulo (ej: "recursos_humanos")?
**R:** 
1. Agregar en `lib/rbac.ts` → `rolePermissions` para cada rol
2. En Matriz de roles → crear permisos para cada cargo + "recursos_humanos"

### P: ¿Se puede cambiar rol o cargo de un usuario?
**R:** Sí, en la tabla de usuarios → editar botón (aún no implementado, tarea pendiente)

## Resumen de Conexiones

| Componente | Ubicación | Función | Conexión |
|-----------|-----------|---------|----------|
| Roles del sistema | `lib/rbac.ts` | Define permisos globales | → CreateUserForm (roles) |
| Cargos | BD → `cargos` table | Posiciones de trabajo | → CreateUserForm (dropdown) |
| Matriz de roles | BD → `role_matrix` table | Permisos por cargo+módulo | → Verificación de acceso |
| CreateUserForm | `components/admin/` | Crear usuario | ← carga de lib/rbac.ts + BD |
| API /api/admin/cargos | `app/api/admin/` | Endpoint de cargos | → CreateUserForm |
| API /api/admin/roles | `app/api/admin/` | Endpoint de matriz | → RoleMatrixTab admin |
| Admin Roles Page | `app/dashboard/admin/roles/` | Gestiona cargos + matriz | → Fuente de datos |
| Admin Users Page | `app/dashboard/admin/users/` | Gestiona usuarios | → Crea usuarios con rol+cargo |

## Diagrama de Flujo Completo

```
┌──────────────────────────────────────────────────────────────────┐
│  ADMINISTRACIÓN DE ROLES Y CARGOS (Roles y cargos page)         │
│  ┌────────────────────┐  ┌─────────────────────────────────────┐│
│  │ Asignar cargos     │  │ Matriz de roles                     ││
│  │ Tab 1              │  │ Tab 2                               ││
│  │                    │  │                                     ││
│  │ CREATE/EDIT:       │  │ Cargo + Módulo →                   ││
│  │ Cargos en BD       │  │ Nivel acceso (ED/LEC/SR)            ││
│  │ (JEFE SOSTen.,     │  │                                     ││
│  │  JEFE MAN. EQ)     │  │ Ejemplo:                            ││
│  │                    │  │ JEFE_SOSTENIBILIDAD + bodega = ED   ││
│  └──────┬─────────────┘  └────────────────┬────────────────────┘│
│         │                                  │                     │
│         └──────────────────┬───────────────┘                     │
│                            │                                     │
│                            ↓ (cargos + permisos)                │
│                       BD (Supabase)                             │
│                  ┌─────────────────────┐                        │
│                  │ cargos table        │                        │
│                  │ role_matrix table   │                        │
│                  └─────────────────────┘                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ↓                      ↓                      ↓
┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│ CreateUserForm   │  │ UsersImportXls  │  │ UsersList        │
│                  │  │                 │  │                  │
│ 1. Rol:          │  │ 1. Carga Excel  │  │ Muestra:         │
│  (lib/rbac)      │  │ 2. Valida rol   │  │ Nombre           │
│                  │  │ 3. Valida cargo │  │ Cargo (BD)       │
│ 2. Cargo:        │  │ 4. Crea usuario │  │ Rol (DB)         │
│  (BD)            │  │                 │  │                  │
│                  │  │                 │  │                  │
│ Submit → POST    │  │                 │  │                  │
│ /api/admin/users │  │                 │  │                  │
└──────────────────┘  └─────────────────┘  └──────────────────┘
        │                      │
        └──────────────┬───────┘
                       ↓
            ┌──────────────────────┐
            │ profiles table       │
            │ id, email, full_name │
            │ role, cargo_id       │
            └──────────────────────┘
                       │
                       ↓
          Cuando usuario accede a módulo:
          
          1. Verificar: rolePermissions[user.role][module]
             (¿El rol permite?)
          
          2. Verificar: role_matrix
             WHERE cargo_id = user.cargo_id
             AND module_key = module
             (¿El cargo permite?)
          
          3. RESULTADO = intersección de ambos
```

## Conclusión

- **Rol del Sistema** (lib/rbac.ts): Control de acceso amplio, define qué módulos puede ver
- **Cargo** (BD): Control granular, permite restringir aún más dentro de un módulo
- **Integración**: Al crear usuario seleccionas ambos, se validan contra sus fuentes de verdad respectivas
- **Resultado**: Permisos = intersección de rol + cargo, permitiendo control multi-nivel
