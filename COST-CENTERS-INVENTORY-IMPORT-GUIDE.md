# Guía de Importación: Centros de Costos e Inventario Bodega

**Última actualización:** Junio 16, 2026  
**Status:** ✅ COMPLETADO

---

## 📍 Ubicación en la App

**Ruta:** `/dashboard/bodega/importar-datos`

---

## 1️⃣ CENTROS DE COSTOS (Minas y Áreas)

### ¿Qué son los Centros de Costos?

Los centros de costos son la estructura organizacional que agrupa tus operaciones:
- **Minas:** Peumo, Don Jaime, Exploración
- **Áreas:** Perforación, Tronadura, Carguo, Molienda, Flotación, etc.
- **Departamentos:** Administración, Mantenimiento, etc.

Crean una **jerarquía** que permite:
- Organizar inventario por ubicación
- Asignar presupuestos y costos
- Generar reportes por mina/área
- Integración con finanzas y mantenimiento

### Formato CSV Requerido

```
CÓDIGO REC ELEC;NOMBRE;RUTA COMPLETA;CREADOR POR;FECHA DE CREACIÓN;NOTAS
MC001;Mina Peumo;Mina Peumo;Admin;2026-01-01;Mina principal
MC002;Perforación;Mina Peumo > Perforación;Admin;2026-01-01;Área de perforación
MC003;Tronadura;Mina Peumo > Tronadura;Admin;2026-01-01;Área de tronadura
MC004;Planta;Planta;Admin;2026-01-01;Planta de procesamiento
MC005;Chancado;Planta > Chancado;Admin;2026-01-01;Etapa de chancado
```

### Columnas Obligatorias

| Columna | Descripción | Ejemplo |
|---------|-------------|---------|
| CÓDIGO REC ELEC | Código único del centro (recomendado: MC### para Minas y Centros) | MC001 |
| NOMBRE | Nombre del centro de costos | Perforación |
| RUTA COMPLETA | Jerarquía completa separada por " > " | Mina Peumo > Perforación |
| CREADOR POR | Persona que crea el registro | Admin |
| FECHA DE CREACIÓN | Fecha de creación | 2026-01-01 |
| NOTAS | Observaciones opcionales | Área principal |

### Estructura Jerárquica

```
1 Mina Peumo (Nivel 1)
  > Perforación (Nivel 2)
  > Tronadura (Nivel 2)
  > Carguo (Nivel 2)

2 Mina Don Jaime (Nivel 1)
  > Supervisión (Nivel 2)
  > Perforación (Nivel 2)

4 Planta (Nivel 1)
  > Chancado (Nivel 2)
  > Molienda (Nivel 2)
  > Flotación (Nivel 2)
```

### Cómo Importar

1. Ve a `/dashboard/bodega/importar-datos`
2. Haz clic en la pestaña "Centros de Costos"
3. Arrastra tu CSV o haz clic para seleccionar
4. El sistema procesa automáticamente la jerarquía
5. Verás confirmación de elementos importados

### Validaciones

- ✅ Código único por centro
- ✅ Validación de jerarquía (ruta > elemento)
- ✅ Manejo automático de parent_id
- ✅ Eliminación de duplicados con upsert

---

## 2️⃣ INVENTARIO BODEGA (Artículos SKU)

### ¿Qué es el Inventario?

El inventario de bodega contiene todos los artículos disponibles para:
- Órdenes de mantenimiento
- Requisiciones de compra
- Control de stock
- Consumo y reorden

Se organiza en:
- **Familias:** Acero, Bomba, Bola, etc.
- **Sub-familias:** Tuberías, Pletinas, Ángulos, etc.
- **Equipos:** Específicos o genéricos
- **Productos:** Descripción detallada del artículo

### Formato CSV Requerido

```
CÓDIGO;FAMILIA;SUB-FAMILIA;EQUIPO;PRODUCTO
Acero001;Acero;;;Ángulo Laminado 3MM 25x25MM 6000MM
Acero003;Acero;;;Ángulo Laminado 6MM 50x50MM 6000MM
Bomba001;Bomba;;;Revestimiento Prensa - Caucho Bomba Atlas 3x2
```

### Columnas Obligatorias

| Columna | Descripción | Ejemplo | Obligatorio |
|---------|-------------|---------|-------------|
| CÓDIGO | Código único del artículo (SKU) | Acero001 | ✅ Sí |
| FAMILIA | Categoría principal | Acero | ✅ Sí |
| SUB-FAMILIA | Subcategoría | (vacío para genéricos) | ❌ Opcional |
| EQUIPO | Equipo específico | (vacío para genéricos) | ❌ Opcional |
| PRODUCTO | Descripción completa del artículo | Ángulo Laminado 3MM... | ✅ Sí |

### Categorías Principales

```
- Acero (tuberías, pletinas, ángulos, discos, etc.)
- Bola (bolas de acero para molienda)
- Bomba (revestimientos, empaquetaduras, valvulas)
- Caucho (correas, sellos, amortiguadores)
- Electricidad (motores, cables, switchs)
- Hidráulica (cilindros, válvulas, acoples)
- Instrumentación (sensores, medidores)
- Mantenimiento (herramientas, lubricantes, limpieza)
- Seguridad (EPP, señalética, sistemas)
```

### Cómo Importar

1. Ve a `/dashboard/bodega/importar-datos`
2. Haz clic en la pestaña "Inventario"
3. **Opcional:** Selecciona un Centro de Costos (para asignar todo a una mina/área)
4. Arrastra tu CSV o selecciona archivo
5. El sistema importa todos los items automáticamente
6. Verás confirmación con cantidad de items importados

### Asignación a Centros de Costos

Tienes 3 opciones:

1. **Importar sin asignar:** Los items estarán disponibles en todas las áreas
2. **Importar con Centro específico:** Selecciona una mina/área antes de importar
3. **Importar separadamente por Centro:** Sube el CSV varias veces, seleccionando diferente centro cada vez

### Validaciones

- ✅ CÓDIGO debe ser único
- ✅ PRODUCTO no puede estar vacío
- ✅ SKU generado automáticamente del CÓDIGO
- ✅ Categoría extraída de FAMILIA
- ✅ Cantidad inicial = 0 (se actualiza en entradas de bodega)

---

## 3️⃣ DESPUÉS DE IMPORTAR

### Qué Sucede Automáticamente

1. **Centros de Costos:**
   - Se crean con jerarquía automática
   - Se generan parent_id basados en RUTA COMPLETA
   - Se indexan para búsquedas rápidas
   - Se asocian a Supabase RLS

2. **Inventario:**
   - Se asignan SKUs únicos
   - Se crean referencias a centros de costos (si aplica)
   - Se inicializa stock en 0
   - Se generan índices para búsqueda por familia, sub-familia, código

### Dónde Ver los Datos

1. **Centros de Costos:**
   - Dashboard de Bodega (lista jerárquica)
   - Filtros en todas las páginas de Bodega
   - Reportes por mina/área
   - Asignación en órdenes de mantenimiento

2. **Inventario:**
   - Página de Bodega (`/dashboard/bodega`)
   - Búsqueda por código, familia, producto
   - Filtrado por centro de costos
   - Integración en órdenes de compra
   - Requisiciones de mantenimiento

### Próximos Pasos

Después de importar, puedes:

1. **Confirmar datos:** Ve a `/dashboard/bodega` y busca tus items
2. **Agregar cantidades:** Registra entrada inicial de stock
3. **Configurar reorden:** Define min/max por item
4. **Crear movimientos:** Registra consumos y transferencias
5. **Generar reportes:** Analiza consumo por centro de costos

---

## ⚠️ TROUBLESHOOTING

### "No valid data found in file"

**Causa:** El archivo está vacío o mal formateado  
**Solución:**
- Verifica que el CSV tiene datos después del header
- Asegúrate de usar `;` (punto y coma) como separador
- Valida que las columnas obligatorias estén presentes

### "Failed to import"

**Causa:** Error de conexión a Supabase  
**Solución:**
- Verifica que tienes conexión a internet
- Comprueba que las variables de entorno están configuradas
- Intenta de nuevo en unos segundos

### "Código duplicado"

**Causa:** El CÓDIGO ya existe en la base de datos  
**Solución:**
- El sistema hará upsert (actualización si existe)
- Para evitar, genera códigos únicos en tu CSV
- O elimina registros antiguos primero

### Jerarquía no se creó correctamente

**Causa:** RUTA COMPLETA mal formateada  
**Solución:**
- Asegúrate de usar " > " (espacio-mayor-espacio)
- Orden correcto: "Nivel1 > Nivel2 > Nivel3"
- Ejemplo correcto: "Mina Peumo > Perforación > Norte"

---

## 📊 EJEMPLO COMPLETO

### Centros de Costos (centros.csv)

```
CÓDIGO REC ELEC;NOMBRE;RUTA COMPLETA;CREADOR POR;FECHA DE CREACIÓN;NOTAS
CC001;Mina Peumo;Mina Peumo;Admin;2026-01-01;Mina principal
CC002;Perforación;Mina Peumo > Perforación;Admin;2026-01-01;Área de perforación
CC003;Tronadura;Mina Peumo > Tronadura;Admin;2026-01-01;Área de tronadura
CC004;Planta;Planta;Admin;2026-01-01;Planta de procesamiento
CC005;Chancado;Planta > Chancado;Admin;2026-01-01;Etapa 1
CC006;Molienda;Planta > Molienda;Admin;2026-01-01;Etapa 2
```

### Inventario (bodega.csv)

```
CÓDIGO;FAMILIA;SUB-FAMILIA;EQUIPO;PRODUCTO
AC-001;Acero;;;Ángulo Laminado 3MM 25x25MM 6000MM
AC-002;Acero;;;Ángulo Laminado 6MM 50x50MM 6000MM
TUB-001;Acero;Tuberías;;Tubería ASTM 106 BSCH40 2' x 6mt
PLE-001;Acero;Pletinas;;Pletina Fierro 12MM x 38MM 6000MM
BOM-001;Bomba;;;Revestimiento Prensa Bomba Atlas 3x2
BOM-002;Bomba;Empaquetadura;;Empaquetadura Grafitada 1/4' estilo 435
```

---

## 📞 SOPORTE

Si encuentras problemas:

1. Verifica el formato del CSV
2. Revisa que no haya caracteres especiales problemáticos
3. Intenta importar un pequeño subset primero
4. Si persiste el error, contacta al administrador del sistema

---

**Status:** ✅ LISTO PARA USAR

El sistema está completamente funcional y listo para recibir tus datos.

