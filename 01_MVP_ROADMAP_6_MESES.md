# Roadmap Operacional Canonico de Motil

## Objetivo
Construir Motil como un sistema operacional conectado, basado en informacion canonica y relaciones reales entre equipos, ordenes de trabajo, inventario, compras, proveedores, documentos, personas y costos.

Principios permanentes:
- una sola fuente de verdad por entidad;
- aislamiento estricto por organizacion;
- ninguna duplicacion o dato ficticio para completar flujos;
- aprobacion humana para cambios consecuenciales;
- trazabilidad completa entre decision, aplicacion, verificacion y excepcion;
- ausencia de datos nunca equivale a mejora, ahorro, ROI o beneficio.

## Bloques 10 a 38
Estado: **Completados**

Cubren el circuito operacional base, seguridad, mantenimiento, inventario, compras, personas, telemetria, confiabilidad, repuestos, BOM, planes estandar, estrategia, ciclo de vida, renovacion, puesta en servicio, validacion, cartera y retroalimentacion verificada.

## Bloque 39 — Aplicacion controlada de retroalimentacion aceptada
Estado: **Completado**
Feedback aceptada genera una propuesta operacional separada sin modificar la fuente vigente.

## Bloque 40 — Aprobacion y aplicacion transaccional
Estado: **Completado**
Aprobacion y aplicacion son pasos distintos; la aplicacion conserva snapshots antes/despues y evita estados parciales.

## Bloque 41 — Auditoria y verificacion posterior
Estado: **Completado**
La fuente vigente se compara con el resultado aplicado; una persona cierra la verificacion como `verified`, `diverged` o `needs_follow_up`.

## Bloque 42 — Gobernanza de excepciones y seguimiento derivado
Estado: **Completado**
Solo verificaciones `diverged` o `needs_follow_up` originan seguimiento con responsable y fecha reales. El seguimiento no ejecuta rollback ni nuevos cambios.

## Bloque 43 — Escalamiento de excepciones recurrentes y decisiones derivadas
Estado: **Completado**
La recurrencia se detecta exclusivamente desde evidencia real del mismo activo/tipo de destino o desde seguimientos abiertos vencidos. Escalamiento, decision, propuesta, aplicacion y rollback permanecen separados.

## Bloque 44 — Hardening integral de Motil
Estado: **Completado**
1. Las 178 tablas publicas verificadas mantienen RLS habilitado.
2. Las superficies con `organization_id` que conservaban policies permisivas fueron reemplazadas por aislamiento de organizacion para usuarios autenticados.
3. Las superficies legacy sin `organization_id` y policy permisiva quedaron cerradas para `anon` y `authenticated`; permanecen accesibles solo desde servidor hasta una reconciliacion canonica explicita.
4. Se revocaron privilegios `TRUNCATE`, `REFERENCES` y `TRIGGER` a clientes directos sobre tablas publicas.
5. Las fuentes de escalamiento incluyen `organization_id` y se filtran por tenant en servidor.
6. El constraint de escalamiento acepta recurrencia real o seguimiento vencido.
7. Los grupos de indices duplicados detectados bajaron a 0 sin eliminar constraints unicos.
8. Las APIs de seguimiento y escalamiento no reportan exito cuando una fila no fue modificada.
9. Supabase y las migraciones del repositorio quedaron alineados.

## Bloque 45 — QA operacional y release estable
Estado: **Completado**
1. Produccion del Bloque 44 fue validada `READY` antes del cierre final.
2. Vercel no reporto errores runtime en las ultimas 24 horas durante la auditoria.
3. Las relaciones del circuito feedback -> propuesta -> verificacion -> seguimiento -> escalamiento fueron verificadas sin registros huerfanos.
4. No existen grupos duplicados de escalamientos abiertos por organizacion, activo y tipo de destino.
5. Las 178 tablas publicas continuan con RLS habilitado y ninguna superficie con policy permisiva conserva grants directos de cliente.
6. Las escrituras bajo `/api/maintenance/*` requieren ahora, ademas de autenticacion y organizacion, un rol de escritura de Mantenimiento validado en servidor: `superadmin`, `admin`, `Operaciones-Supervisor` o `jefe_mantencion`.
7. Los flujos sin evidencia real permanecen vacios; el QA no genero feedback, validaciones, seguimientos ni escalamientos ficticios para forzar casos.
8. Build y TypeScript del commit final deben pasar en Vercel antes del merge y el deployment productivo final debe quedar `READY` para declarar el release estable.

## Estado del roadmap
**CERRADO — release estable canonico.**

No se agregan Bloques 46+ a esta fase. Toda nueva capacidad funcional debe abrir un nuevo roadmap/version y partir desde el commit estable de cierre.

---

# Regla permanente de mantenimiento
Los cambios posteriores deben conservar aislamiento por organizacion, aprobacion humana en escrituras consecuenciales, migraciones trazables, ausencia de datos ficticios y validacion de build/deployment antes de produccion.
