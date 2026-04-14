## Guía: Cómo Crear una Orden de Trabajo

### Paso 1: Ir al Módulo de Órdenes
- Desde el sidebar, selecciona **"Work Orders"** en la sección Minería
- Verás el listado de todas las órdenes existentes

### Paso 2: Crear Nueva Orden
- Click en botón **"+ Crear Nueva Orden"** (naranja)
- Se abrirá un wizard de 3 pasos

### Paso 3: Seleccionar Vehículo
- **Paso 1 del Wizard:** Elige el vehículo (Excavadora CAT 390F, Pala, Volqueta)
- Puedes filtrar por tipo de equipo

### Paso 4: Seleccionar Componentes
- **Paso 2 del Wizard:** Selecciona múltiples componentes que necesitan mantenimiento
- Ejemplo: Motor + Hidráulica + Enfriamiento
- Cada componente genera una sub-orden automáticamente

### Paso 5: Definir Detalles
- **Paso 3 del Wizard:** Completa:
  - **Tipo:** Preventivo / Correctivo / Predictivo
  - **Prioridad:** Crítica / Alta / Media / Baja
  - **Descripción:** Notas adicionales sobre el trabajo

### Paso 6: Asignar Técnicos (Opcional)
- Sistema sugiere técnicos disponibles
- Puedes asignar uno por componente para trabajo paralelo

### Resultado
- Se crea **1 OT Principal** que agrupa todo
- Se generan **N Sub-OTs** (una por componente)
- Cada técnico ve solo sus tareas
- Progreso se calcula automáticamente

---

## Guía: Cómo Usar el Árbol de Fallas

### Paso 1: Acceder al Árbol
- Ve a **Mantenimiento** → **Gestión de Vehículos**
- Selecciona un vehículo (ej: Excavadora CAT 390F)
- Click en **"Ver Árbol de Fallas"**

### Paso 2: Expandir Componentes
- Verás el árbol jerárquico de componentes
- Click en **+** para expandir (Motor, Hidráulica, etc.)
- Se muestran sub-componentes y modos de falla

### Paso 3: Ver Síntomas y Fallas
- Cada modo de falla muestra:
  - **Severidad:** Crítica 🔴, Mayor 🟠, Menor 🟡
  - **Síntomas:** Qué observar
  - **Causa probable:** Por qué ocurre
  - **Piezas asociadas:** Qué cambiar

### Paso 4: Seleccionar Piezas
- En el sidebar derecho, ves piezas seleccionadas
- Click en **"Agregar"** para cada pieza de desgaste
- Se calcula costo total automáticamente

### Paso 5: Crear Orden desde Árbol
- Click en **"Crear Orden de Mantenimiento"**
- Se genera automáticamente una OT con todas las piezas seleccionadas

---

## Guía: Cómo Gestionar Inventario

### Recepción de Piezas
1. **Bodega** → **Recepción**
2. Escanea código QR o busca pieza por código
3. Ingresa cantidad y número de factura
4. Sistema asigna automáticamente FIFO

### Despacho de Piezas
1. **Bodega** → **Despacho**
2. Selecciona la orden de trabajo
3. Sistema lista piezas necesarias
4. Confirma despacho → Se genera acta

### Alertas de Stock
- **Stock Bajo:** Se notifica cuando quedan pocas piezas
- **Vencimiento:** Alerta 30 días antes del vencimiento
- **No Disponible:** Si la pieza no está en stock

---

## Guía: Cómo Leer Alertas y Reportes

### Tipos de Alertas
- **🔴 Crítica:** Equipo parado, acción inmediata requerida
- **🟠 Mayor:** Degradación significativa, riesgo de inactividad
- **🟡 Menor:** Desgaste leve, programar mantenimiento próximamente

### Dashboard de Reportes
1. Ve a **Administración** → **Reportes**
2. Selecciona período (últimos 7 días, mes, etc.)
3. Visualiza:
   - Órdenes completadas vs tiempo estimado
   - Costo de mantenimiento por equipo
   - Piezas más usadas
   - Eficiencia de técnicos

### Interpretación de Métricas
- **Eficiencia OT:** % completado en tiempo estimado
- **Costo Unitario:** Gasto promedio por hora de trabajo
- **ROI Preventivo:** Ahorros por mantenimiento preventivo vs correctivo
