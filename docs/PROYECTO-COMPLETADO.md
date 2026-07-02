# n3uralia ERP MVPv2 - Estado del Proyecto

## Resumen Ejecutivo

`n3uralia ERP` es una plataforma integral para operaciones mineras y contratistas chilenos.

**Estado real**: en progreso, aprox. 60% completado.

**Lectura correcta de este documento**: ya no es un cierre de proyecto. Es una fotografia del avance y del trabajo pendiente para los proximos 4 meses.

---

## Lo que ya existe

### 1. Plataforma central
- Next.js, React, TypeScript, Supabase y Vercel
- Autenticacion y proteccion de rutas
- Base de dashboards operativos

### 2. Modulos operativos activos
- Produccion y telemetria
- Mantenimiento y ordenes de trabajo
- Bodega e inventario
- HSE y cumplimiento
- Gestion documental y aprobaciones

### 3. Integraciones y APIs
- Endpoints para importacion y consulta de datos
- Flujos server-side para operaciones criticas
- Cargas Excel en varios modulos
- Base para integracion LAN y telemetria local

### 4. Estabilizacion reciente
- Correcciones de build
- Ajustes de tipos
- Fallbacks para rutas sensibles
- CSP corregida para no bloquear Supabase WSS

---

## Lo que falta cerrar

- Consolidar sostenibilidad como modulo principal
- Estandarizar importacion Excel en todos los modulos que actualizan data
- Cerrar maquinaria, equipos y EPP con datos reales
- Terminar el flujo operativo de mantenimiento
- Endurecer telemetria LAN y su integracion con la red local
- Completar costos, indicadores y tablero gerencial
- Pulir movilidad de terreno y cierre de ordenes desde movil
- Homogeneizar aprobaciones y trazabilidad documental

---

## Roadmap de 4 meses

### Mes 1
- estabilizar sostenibilidad
- unificar importacion Excel
- cerrar maquinaria, equipos y EPP

### Mes 2
- mejorar mantenimiento y bitacoras
- consolidar telemetria LAN
- completar cargas y actualizaciones de data

### Mes 3
- costos, indicadores y dashboard gerencial
- movilidad de terreno
- documentacion y aprobaciones

### Mes 4
- hardening final
- pruebas de flujo extremo a extremo
- validacion con datos reales
- roadmap de evolucion post-MVP

---

## Criterios de cierre

- Sin errores de build
- Sin textos rotos
- Sin perdida de informacion real
- Importacion Excel consistente
- Flujo entendible para usuario operativo
- Roadmap alineado con el estado real del producto

---

## Conclusion

El producto ya tiene una base util y funcional, pero todavia no debe presentarse como terminado. La prioridad ahora es terminar los modulos debiles, mantener estabilidad y completar el cierre funcional del MVP.
