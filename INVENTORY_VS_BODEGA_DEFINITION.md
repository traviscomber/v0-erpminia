# INVENTARIO vs BODEGA: Definición Clara para n3uralia ERP

## 🏭 Contexto: Sistema de Minería Chilena

En una empresa minera típica:
- **Múltiples ubicaciones:** Faena principal, campamentos remotos, almacenes regionales
- **Múltiples tipos de stock:** Repuestos, explosivos, combustible, herramientas, concentrados
- **Compliance crítico:** Trazabilidad, auditoría, normativas SERNAGEOMÍN

---

## 📦 BODEGA (Warehouse Management System)

### **Definición:**
Sistema de **gestión de ubicaciones físicas y movimientos de mercadería** en almacenes específicos.

### **Responsabilidades:**
1. **Múltiples almacenes/bodegas**
   - Bodega Central (Santiago)
   - Bodega Faena (Sitio Minero)
   - Bodega Regional (Puerto)
   - Campamento de Campaña

2. **Recepción de Compras**
   - Ingreso de OC confirmada
   - Inspección de calidad
   - Registro de proveedores
   - Generación de entrada

3. **Movimientos entre Bodegas**
   - Transferencia Bodega A → B
   - Despacho a faena
   - Devoluciones a proveedor
   - Destrucción/Rebaja

4. **Ubicaciones Físicas**
   - Rack/Pasillo/Fila/Columna
   - Pick-pack-ship workflow
   - Conteo físico por bodega

5. **Control de Despachos**
   - OT (Orden de Trabajo)
   - OC (Orden de Compra)
   - Salidas por autorización

### **KPIs:**
- Tiempo de picking (horas)
- Exactitud de inventario por bodega (%)
- Rotación de bodegas
- Utilización de espacio

### **Usuarios:**
- Almacenero
- Jefe de Bodega
- Operario de Faena

---

## 📊 INVENTARIO (Inventory Control)

### **Definición:**
Sistema de **análisis y control consolidado de stock** a nivel empresa con visibilidad analítica.

### **Responsabilidades:**
1. **Artículos Maestros (SKU)**
   - Código único
   - Descripción técnica
   - Unidad de medida
   - Clasificación ABC
   - Proveedor principal
   - Lead time

2. **Stock Consolidado**
   - Total empresa (suma de todas bodegas)
   - Por bodega
   - Por categoría
   - Por proveedor

3. **Valuación de Inventario**
   - Método: FIFO, LIFO, Promedio
   - Valor actual
   - Varianza de precio
   - Obsolescencia

4. **Análisis de Rotación**
   - Clasificación ABC (Pareto)
   - Items lentos/muertos
   - Rotación promedio (veces/año)
   - Valor por rotación

5. **Alertas de Reorden**
   - Punto de reorden automático
   - Stock de seguridad
   - Lead time vs demanda
   - Previsión

6. **Reportes Ejecutivos**
   - Reporte de varianza (físico vs sistema)
   - Cobertura de días (DIO)
   - Valor del inventario por categoría
   - Items con mayor riesgo

### **KPIs:**
- Exactitud de inventario general (%)
- Valor de inventario total (CLP)
- Rotación de inventario (veces/año)
- Cobertura en días (DIO)
- % de items obsoletos

### **Usuarios:**
- Gerente de Operaciones
- Planificador de Demanda
- Analista de Inventario
- CFO/Contabilidad

---

## 🔄 Integración entre Módulos

```
BODEGA → Registra movimiento → INVENTARIO se actualiza
├─ Entrada (OC)
├─ Salida (OT)
├─ Transferencia (B→B)
└─ Ajuste (conteo físico)
        ↓
    Actualiza stock en tabla central
        ↓
    INVENTARIO recalcula KPIs y alertas
```

---

## 📋 Tabla Comparativa

| Aspecto | BODEGA | INVENTARIO |
|--------|--------|-----------|
| **Scope** | Una ubicación física | Empresa completa |
| **Transacciones** | Movimientos, recepciones | Análisis, reportes |
| **Enfoque** | Operacional (diario) | Estratégico (mensual/trimestral) |
| **Usuarios** | Operarios, almaceneros | Gerentes, analistas |
| **Horizonte** | Corto plazo (hoy/semana) | Largo plazo (trimestral) |
| **Métrica** | Exactitud, rapidez | Rotación, valuación |

---

## 🛠️ Implementación en n3uralia

### Fase 1: BODEGA (Semanas 1-4)
- [ ] ABM de bodegas/almacenes
- [ ] Recepciones (OC → Bodega)
- [ ] Movimientos entre bodegas
- [ ] Despachos
- [ ] Conteo físico por bodega

### Fase 2: INVENTARIO (Semanas 5-6)
- [ ] Artículos maestros (SKU)
- [ ] Consolidación de stock
- [ ] Alertas de reorden
- [ ] Reportes ABC
- [ ] Dashboard ejecutivo

---

## ✅ Próximas Acciones
1. Separar data model (warehouse vs inventory_items)
2. Crear APIs distintas
3. UI diferenciada por rol/responsabilidad
4. Testing de integraciones
