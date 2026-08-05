# MOTIL Design System

Este documento es la fuente canónica para la interfaz del ERP MOTIL. Aplica al dashboard, módulos principales, rutas secundarias, formularios, tablas, modales y estados del sistema.

## 1. Principios

- Claridad operacional antes que decoración.
- Una pantalla debe comunicar primero qué es, después qué requiere atención y finalmente qué puede hacer el usuario.
- Mostrar datos reales. No usar métricas, estados ni ejemplos mock en producción.
- Evitar duplicar información, títulos, accesos o acciones en una misma pantalla.
- Mantener una experiencia equivalente en modo claro y oscuro.

## 2. Jerarquía de página

Cada página debe usar este orden:

1. Breadcrumb global en el header.
2. Título de página o módulo.
3. Descripción breve, de una o dos líneas.
4. Estado de sincronización o contexto, cuando sea relevante.
5. Acción primaria.
6. Contenido principal.

No repetir el mismo título en el header global y dentro de tarjetas.

### Encabezados

- Título principal: `text-2xl` o `text-3xl`, peso `font-semibold`.
- Título de sección: `text-lg`, peso `font-semibold`.
- Descripción: `text-sm text-muted-foreground`.
- Ancho máximo recomendado del contenido: `1600px`.
- Espaciado vertical estándar entre bloques: `space-y-6`.

## 3. Acciones y botones

### Límite de acciones

- Una acción primaria visible por pantalla.
- Como máximo una acción secundaria visible junto a la primaria.
- La tercera acción y posteriores deben ir en un menú `Más acciones`.
- No repetir una acción en el header y dentro del primer bloque de contenido.

### Uso de variantes

- `default`: crear, guardar, confirmar o iniciar la acción principal.
- `outline`: acción secundaria no destructiva.
- `ghost`: navegación contextual, iconos o acciones de baja prioridad.
- `destructive`: eliminar, anular o acciones irreversibles.

Los botones de solo icono siempre deben tener `aria-label` y tooltip cuando el significado no sea evidente.

## 4. Navegación

- El sidebar contiene accesos de módulo, no todas las operaciones posibles.
- Las rutas secundarias deben agruparse dentro del módulo y estar colapsadas por defecto cuando el grupo sea extenso.
- El elemento activo debe ser inequívoco.
- Los breadcrumbs no deben mostrar UUID, IDs internos ni cadenas técnicas.
- Mostrar un máximo de cuatro niveles. Los niveles intermedios se resumen con `…`.
- Toda segunda sección debe ofrecer un camino claro de regreso mediante breadcrumb; no agregar botones redundantes de “volver” cuando ya existe ese camino.

## 5. Tarjetas y métricas

- Usar tarjetas para resumir entidades o métricas, no como contenedor universal.
- Una fila de KPI debe tener entre dos y cuatro tarjetas.
- No repetir una métrica en múltiples tarjetas de la misma vista.
- Las tarjetas no deben tener sombras fuertes; usar borde y `shadow-none`.
- Evitar tarjetas anidadas.
- Una tarjeta clickeable debe ser completamente clickeable, no contener varios botones internos.

## 6. Tablas y listados

- Filtros principales visibles: búsqueda, estado y rango de fecha cuando corresponda.
- Filtros adicionales dentro de `Más filtros`.
- Acciones por fila en un menú contextual; mostrar como máximo una acción directa.
- Encabezados breves y consistentes.
- Columnas de baja prioridad se ocultan en móvil.
- Siempre incluir estados de carga, vacío, error y sin permisos.
- El estado vacío debe explicar qué falta y ofrecer una única acción relevante.

## 7. Formularios y modales

- Agrupar campos por propósito, no por estructura de base de datos.
- Etiquetas visibles; no depender solo de placeholders.
- Mensajes de error junto al campo.
- Acciones del formulario: `Cancelar` y una única acción primaria.
- Los formularios extensos deben usar secciones o pasos.
- No abrir un modal sobre otro modal.

## 8. Estados del sistema

Los estados permitidos son:

- Cargando.
- Actualizado.
- Datos parciales.
- Sin datos.
- Sin permisos.
- Error recuperable.
- Error bloqueante.

`Datos parciales` debe explicar qué fuente no está disponible. Nunca mostrarlo como una etiqueta sin contexto.

## 9. Color y accesibilidad

- Usar tokens semánticos del tema; evitar colores hardcodeados salvo estados operacionales justificados.
- Contraste mínimo WCAG AA.
- No comunicar estados únicamente mediante color.
- Foco visible en todos los elementos interactivos.
- Área mínima táctil: 40px.
- Respetar `prefers-reduced-motion`.

## 10. Responsive

- Diseñar primero para móvil y escalar a desktop.
- Los encabezados pasan a columna en pantallas pequeñas.
- Acciones secundarias se mueven a menús en móvil.
- Tablas complejas usan columnas adaptativas o vistas tipo tarjeta; no scroll horizontal sin control.
- Sidebar móvil debe cerrar después de navegar.

## 11. Reglas por rutas secundarias

Toda ruta secundaria debe cumplir:

- Breadcrumb correcto.
- Título y descripción específicos.
- Cero IDs técnicos visibles.
- Una acción primaria.
- Máximo dos botones visibles en el encabezado.
- Menú contextual para acciones adicionales.
- Estado vacío útil.
- Estado de error con reintento cuando sea posible.
- Datos provenientes de la fuente canónica correspondiente.
- Sin accesos duplicados a la misma función.

## 12. Checklist antes de publicar

- [ ] Build sin errores.
- [ ] Sin errores de runtime.
- [ ] Modo claro y oscuro revisados.
- [ ] Desktop, tablet y móvil revisados.
- [ ] Una sola acción primaria por pantalla.
- [ ] No más de dos acciones visibles en encabezados.
- [ ] No hay botones sin función.
- [ ] No hay datos mock.
- [ ] No hay texto técnico o IDs internos visibles.
- [ ] Estados de carga, vacío, error y permisos implementados.
- [ ] Breadcrumbs y navegación de regreso correctos.
