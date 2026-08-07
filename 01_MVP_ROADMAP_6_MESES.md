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
1. La recurrencia se detecta exclusivamente desde verificaciones cerradas reales del mismo activo y tipo de destino.
2. Un seguimiento abierto vencido tambien puede justificar un candidato de escalamiento sin inventar severidad o impacto.
3. El escalamiento exige responsable real de la organizacion y fundamento humano explicito.
4. Cada escalamiento conserva las verificaciones y seguimientos que lo originan.
5. Solo puede existir un escalamiento abierto por organizacion, activo y tipo de destino.
6. Cerrar o cancelar exige nota humana y no modifica la fuente operacional.
7. Escalamiento, decision, propuesta, aplicacion y rollback permanecen separados.
8. Cero recurrencias o vencimientos produce cero candidatos y cero datos demo.

Entrega tecnica:
- `maintenance_feedback_exception_escalations`;
- `maintenance_feedback_exception_escalation_sources`;
- `/api/maintenance/feedback-exception-escalations`;
- `/dashboard/mantenimiento/escalamiento-excepciones`.

## Bloque 44 — Hardening integral de Motil
Estado: **Siguiente**
1. Auditar RLS, permisos server-side, aislamiento multi-tenant y superficies legacy.
2. Revisar integridad referencial, constraints, indices y consultas N+1 o no acotadas.
3. Ejecutar build, TypeScript y revision de rutas/API criticas.
4. Revisar errores, estados vacios, loading, responsive y navegacion de circuitos principales.
5. Corregir deuda tecnica y regresiones sin agregar nuevas funciones de negocio.
6. Dejar GitHub, Supabase y Vercel alineados en un unico estado productivo verificable.

## Bloque 45 — QA operacional y release estable
Estado: **Pendiente**
1. Probar end-to-end los circuitos criticos con datos reales disponibles.
2. Validar permisos por rol y organizacion en flujos consecuenciales.
3. Corregir regresiones finales y limpiar rutas, codigo muerto y duplicaciones demostradas.
4. Confirmar migraciones, build, deployment y dominios productivos.
5. Congelar una version estable canónica y cerrar este roadmap.

---

# Regla de desarrollo y entrega
Cada bloque se ejecuta con rama especifica desde `main`, datos canonicos, migraciones seguras, validacion de build/tipos, Pull Request, merge y comprobacion de deployment. No se agregan bloques funcionales posteriores al 45 dentro de este roadmap; nuevas capacidades deben abrir una nueva fase/version.

## Prioridad inmediata
**Bloque 44 — Hardening integral de Motil.**