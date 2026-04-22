# PLAN DE INTEGRACIÓN: 2 MÓDULOS NUEVOS PARA ERP SEGURIA
## Producción/Planta + HSE/Compliance

---

## 1. VISIÓN GENERAL DE INTEGRACIÓN

```
┌─────────────────────────────────────────────────────────────────┐
│                    DASHBOARD EJECUTIVO                         │
│  (KPIs, Tendencias, Alertas, Compliance Status)                │
└──────────┬───────────────────────────────────────────────────────┘
           │
    ┌──────┴──────────────────────────────────────────────┐
    │                                                      │
    ▼                                                      ▼
┌─────────────────────┐                        ┌──────────────────────┐
│   PRODUCCIÓN        │                        │   HSE / COMPLIANCE   │
│  (Gemelo Operacional)                        │  (Motor Normativo)   │
├─────────────────────┤                        ├──────────────────────┤
│ • Plantas           │                        │ • Incidentes         │
│ • Áreas             │◄──────┐                │ • Inspecciones       │
│ • Líneas/Circuitos  │       │                │ • Acciones Correc.   │
│ • Equipos           │ EVENTOS                │ • Matriz Normativa   │
│ • Sensores/Tags     │ DE INTEGRACIÓN         │ • RCA                │
│ • Telemetría        │       │                │ • Residuos           │
│ • Alarmas           │       │                │ • Relaves            │
│ • Detenciones       │───────┘                │ • Cierre             │
│ • Tendencias        │                        │ • Capacitaciones     │
└─────────────────────┘                        └──────────────────────┘
    │   │   │   │                                   │   │   │
    │   │   │   │ ┌─────────────────────────────────┘   │   │
    │   │   │   │ │                                      │   │
    │   │   │   ▼ ▼                                      │   │
    │   │   │ ┌─────────────────────┐                   │   │
    │   │   └─│  MANTENIMIENTO      │◄──────────────────┘   │
    │   │     │  (OT, MTTR, Costos) │                      │
    │   │     └─────────────────────┘                      │
    │   │           │                                      │
    │   │           ▼                                      │
    │   │     ┌─────────────────────┐                     │
    │   └─────│   INVENTARIO        │◄────────────────────┘
    │         │ (Stock, Repuestos)  │
    │         └─────────────────────┘
    │                 │
    │                 ▼
    │         ┌─────────────────────┐
    └─────────│    COMPRAS          │
              │ (PO, Proveedores)   │
              └─────────────────────┘
                      │
                      ▼
              ┌─────────────────────┐
              │    FINANZAS         │
              │ (Costos, Facturas)  │
              └─────────────────────┘
                      │
                      ▼
              ┌─────────────────────┐
              │   DOCUMENTOS        │
              │ (Manuales, RCA)     │
              └─────────────────────┘
```

---

## 2. ARQUITECTURA DE 4 CAPAS

```
┌─────────────────────────────────────────────────────────┐
│   CAPA 1: MAESTRO OPERACIONAL (Postgres Relacional)    │
├─────────────────────────────────────────────────────────┤
│ Plantas | Áreas | Líneas | Equipos | Sensores         │
│ Normativas | Requisitos | Incidentes | OT | Inventario│
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│    CAPA 2: TELEMETRÍA (TimeSeries - InfluxDB)         │
├─────────────────────────────────────────────────────────┤
│ Lecturas de sensores | Alarmas | Eventos | Tendencias│
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│    CAPA 3: DOCUMENTAL (Blob Storage + Metadata)       │
├─────────────────────────────────────────────────────────┤
│ RCA | Procedimientos | Manuales | Reportes | Evidencias
└─────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│   CAPA 4: MOTOR DE REGLAS/EVENTOS (Bull Queues)       │
├─────────────────────────────────────────────────────────┤
│ Sensor fuera rango → Alerta | Alerta → OT | Etc.      │
└─────────────────────────────────────────────────────────┘
```

---

## 3. FLUJOS DE INTEGRACIÓN CRÍTICOS

### Flujo 1: Sensor Anomalía → Alerta → OT → Repuesto → Costo
```
Sensor vibración alta (Correa CV-101)
  ↓
Alerta crítica en Dashboard Producción
  ↓
OT Correctiva se crea automáticamente
  ↓
Bodega consulta stock de repuestos
  ↓
Técnico ejecuta → Stock se consume
  ↓
OT se cierra → Costo se imputa a Equipo
  ↓
KPI Disponibilidad y Finanzas se actualizan
```

### Flujo 2: Incidente HSE → Investigación → Acción Correctiva → Cierre
```
Incidente de seguridad en Área Chancado
  ↓
Sistema crea registro + solicita RCA
  ↓
Investigación: causas, medidas
  ↓
Acción correctiva se asigna con deadline
  ↓
Evidencia se adjunta
  ↓
Acción se cierra → Matriz Normativa se actualiza
```

### Flujo 3: Vencimiento Normativo → Tarea → Capacitación → Cierre
```
Requisito DS 132 vence en 5 días
  ↓
Alerta automática a Responsable
  ↓
Procedimiento debe actualizarse
  ↓
Nueva versión del documento se publica
  ↓
Capacitación obligatoria a equipo
  ↓
Registros de lectura/aceptación
  ↓
Cumplimiento verificado
```

---

## 4. ESTRUCTURAS PRINCIPALES POR MÓDULO

### MÓDULO PRODUCCIÓN

**Entidades:**
- Plants | Areas | ProcessLines | Equipment | Subcomponents | Sensors
- ProductionEvents | TelemetryReadings | ProductionKPIs | Alarms

**Pantallas principales:**
1. Dashboard Planta (mapa sinóptico + KPIs)
2. Navegador de Plantas (jerarquía expandible)
3. Ficha de Equipo (estado, variables, OT, repuestos, documentos)
4. Explorer de Sensores (valores en vivo + históricos)
5. Tendencias Históricas (multi-plot + exportable)
6. Detenciones y Causas (análisis de pérdida productiva)

### MÓDULO HSE/COMPLIANCE

**Submódulos internos:**
- A. Seguridad Operacional (Incidentes, Investigaciones, Acciones)
- B. Seguridad Minera (DS 132)
- C. Medio Ambiente y RCA (Ley 19.300 + DS 40/17)
- D. Residuos (DS 148)
- E. Relaves (DS 248)
- F. Cierre de Faena (Ley 20.551 + DS 41)

**Entidades:**
- RegulatoryFrameworks | RegulatoryRequirements | ComplianceControls
- Incidents | CorrectiveActions | RCACommitments | RCAMonitoring
- WasteRecords | Tailings | MineClosure | TrainingRecords

**Pantallas principales:**
1. Dashboard HSE Ejecutivo (indicadores + alertas)
2. Matriz de Cumplimiento Normativo
3. Incidentes y Cuasi Incidentes
4. Acciones Correctivas
5. Matriz RCA con Monitoreos
6. Residuos y Manifiestos
7. Relaves (Inspecciones + Reportes)
8. Cierre de Faena

---

## 5. CÓMO QUEDARÍA TODO CONECTADO

### Caso Real: Vibración Alta en Correa CV-101

```
1. SENSOR DETECTA
   Vibración: 7.2 mm/s (Crítica > 7)
   
2. SISTEMA DISPARA EN CASCADA
   
   PRODUCCIÓN: Alerta en dashboard
   │
   ├─→ MANTENIMIENTO: OT Correctiva automática
   │   ├─ Equipo: Correa CV-101
   │   ├─ Causa probable: Rodamiento desgastado
   │   └─ Prioridad: CRÍTICA
   │
   ├─→ INVENTARIO: Reserva repuestos
   │   ├─ Busca: Rodamientos
   │   ├─ Stock: 2 disponibles
   │   └─ Reserva automática
   │
   ├─→ FINANZAS: Calcula impacto
   │   ├─ Pérdida producción: 50 ton/h × 2h = $25,000
   │   ├─ Costo intervención: $8,000
   │   └─ Total: $33,000
   │
   ├─→ HSE: Genera Observación
   │   ├─ Riesgo: Contacto con correa móvil
   │   ├─ Permiso trabajo + Bloqueo LOTO
   │   └─ DS 132 (seguridad minera)
   │
   └─→ DOCUMENTOS: Vincula procedimientos
       ├─ PFD de Chancado
       ├─ Manual del equipo
       └─ Procedure de intervención

3. TÉCNICO EJECUTA
   ├─ Retira rodamientos (2 consumidos)
   ├─ Stock se actualiza en tiempo real
   ├─ Adjunta fotos y observations
   └─ Completa checklist de seguridad

4. OT SE CIERRA - TODO SE ACTUALIZA
   
   PRODUCCIÓN:
   ├─ Equipo vuelve a VERDE
   ├─ Sensor: 2.1 mm/s (normal)
   └─ KPI Disponibilidad se recalcula
   
   INVENTARIO:
   ├─ Stock rodamientos: 2 → 0
   ├─ Alerta: Stock crítico
   └─ PO automática se genera
   
   FINANZAS:
   ├─ OT costificada: $9,700
   ├─ Pérdida real: $12,500
   ├─ Total: $22,200 (vs $33,000 estimado)
   └─ Dashboard ejecutivo: actualizado
   
   DOCUMENTOS:
   ├─ Foto se archiva
   ├─ Reporte en histórico de equipo
   └─ Trazabilidad completa

5. RESULTADO
   ✓ Visibilidad completa: sensor → decisión ejecutiva
   ✓ Automático: eventos en cascada
   ✓ Trazable: historial de todo
   ✓ Analizable: datos para optimizar
```

---

## 6. PLAN DE IMPLEMENTACIÓN

| Fase | Duración | Foco | Módulos | Pantallas | Integraciones |
|------|----------|------|---------|-----------|---------------|
| **1** | 4 sem | Fundamento | Producción Base + HSE Base | 5 dashboards | P↔M, P↔I, HSE↔Doc |
| **2** | 4 sem | Operación | Producción Completa + HSE Operativo | +12 pantallas | P↔F, HSE↔Inv, HSE↔Compras |
| **3** | 4 sem | Ambiental | Residuos + Relaves + Cierre | +8 pantallas | Motor eventos completo |

---

## 7. RECOMENDACIONES FINALES

1. **Diseña Entidades Compartidas Primero** - Equipment, Sensor, OT, Document, Requirement son el HUB
2. **Motor de Eventos desde Inicio** - Aunque sea simple, es crítico para cascada automática
3. **Telemetría en Fase 2** - No en Fase 1. Comienza con maestros + eventos
4. **Valida con Abogado Minero-Ambiental** - DS 132, Ley 19.300, DS 248, Ley 20.551 deben estar correctos
5. **Simula Flujos Críticos** - Antes de producción, prueba: Sensor → OT → Costo y Incidente → RCA → Cierre
