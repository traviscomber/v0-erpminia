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
5. Las fuentes de escalamiento ahora incluyen `organization_id` y se filtran por tenant en servidor.
6. El constraint de escalamiento acepta correctamente recurrencia real o seguimiento vencido, sin exigir dos verificaciones cuando existe un vencimiento valido.
7. Los grupos de indices duplicados detectados bajaron de 19 a 0 sin eliminar constraints unicos.
8. Las APIs de seguimiento y escalamiento ya no reportan exito cuando una fila fue cerrada previamente o no existe, y eliminan filtros N x M evitables en memoria.
9. Supabase y las migraciones del repositorio quedaron alineados para todas las correcciones del bloque.

Migraciones:
- `20260807174615_block_44_harden_tenant_surfaces.sql`;
- `20260807174822_block_44_reduce_legacy_exposure_and_duplicate_indexes.sql`;
- `20260807175037_block_44_close_unscoped_authenticated_legacy_surfaces.sql`.

## Bloque 45 — QA operacional y release estable
Estado: **Siguiente**
1. Probar end-to-end los circuitos criticos con datos reales disponibles.
2. Validar permisos por rol y organizacion en flujos consecuenciales.
3. Corregir regresiones finales y limpiar rutas, codigo muerto y duplicaciones demostradas.
4. Confirmar migraciones, build, deployment y dominios productivos.
5. Congelar una version estable canonica y cerrar este roadmap.

---

# Regla de desarrollo y entrega
Cada bloque se ejecuta con rama especifica desde `main`, datos canonicos, migraciones seguras, validacion de build/tipos, Pull Request, merge y comprobacion de deployment. No se agregan bloques funcionales posteriores al 45 dentro de este roadmap; nuevas capacidades deben abrir una nueva fase/version.

## Prioridad inmediata
**Bloque 45 — QA operacional y release estable.**
