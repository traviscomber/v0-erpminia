'use client';

export default function GuidesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Centro de Guías Educativas</h1>
        <p className="text-muted-foreground mt-2">Aprende a usar cada módulo de ERP SegurIA paso a paso</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Crear Orden */}
        <a href="#crear-orden" className="border border-border rounded-lg p-6 hover:bg-muted/50 transition-colors">
          <h3 className="text-xl font-bold mb-2">Crear Órdenes de Trabajo</h3>
          <p className="text-sm text-muted-foreground mb-4">Aprende cómo crear órdenes jerárquicas desde el árbol de fallas en 6 pasos</p>
          <div className="flex items-center gap-2 text-[var(--brand-naranja)]">Ir a la guía →</div>
        </a>

        {/* Árbol */}
        <a href="#arbol" className="border border-border rounded-lg p-6 hover:bg-muted/50 transition-colors">
          <h3 className="text-xl font-bold mb-2">Usar el Árbol de Fallas</h3>
          <p className="text-sm text-muted-foreground mb-4">Navega la estructura de componentes y modos de falla en 5 pasos</p>
          <div className="flex items-center gap-2 text-[var(--brand-verde)]">Ir a la guía →</div>
        </a>

        {/* Inventario */}
        <a href="#inventario" className="border border-border rounded-lg p-6 hover:bg-muted/50 transition-colors">
          <h3 className="text-xl font-bold mb-2">Gestionar Inventario</h3>
          <p className="text-sm text-muted-foreground mb-4">Recepción, despacho y control de piezas de desgaste en 4 pasos</p>
          <div className="flex items-center gap-2 text-[var(--brand-rojo)]">Ir a la guía →</div>
        </a>

        {/* Reportes */}
        <a href="#reportes" className="border border-border rounded-lg p-6 hover:bg-muted/50 transition-colors">
          <h3 className="text-xl font-bold mb-2">Leer Alertas y Reportes</h3>
          <p className="text-sm text-muted-foreground mb-4">Interpreta métricas y toma decisiones informadas en 5 pasos</p>
          <div className="flex items-center gap-2 text-[var(--brand-gold)]">Ir a la guía →</div>
        </a>
      </div>

      {/* Content */}
      <div className="space-y-12 mt-12">
        {/* Crear Orden */}
        <div id="crear-orden" className="border-l-4 border-l-[var(--brand-naranja)] pl-6 py-6">
          <h2 className="text-3xl font-bold mb-6">Cómo Crear una Orden de Trabajo</h2>
          <ol className="space-y-4">
            <li><strong>Paso 1:</strong> Ve a Work Orders en el sidebar y haz click en "Crear Nueva Orden"</li>
            <li><strong>Paso 2:</strong> Selecciona el vehículo (Excavadora, Pala, Volqueta)</li>
            <li><strong>Paso 3:</strong> Marca los componentes a mantener (Motor, Hidráulica, etc.)</li>
            <li><strong>Paso 4:</strong> Define el tipo (Preventivo/Correctivo/Predictivo) y prioridad</li>
            <li><strong>Paso 5:</strong> Asigna técnicos responsables por componente</li>
            <li><strong>Paso 6:</strong> Sistema crea OT principal + N sub-órdenes automáticamente</li>
          </ol>
          <p className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded text-sm">
            💡 Consejo: Las sub-órdenes permiten que múltiples técnicos trabajen en paralelo, aumentando la eficiencia
          </p>
        </div>

        {/* Árbol de Fallas */}
        <div id="arbol" className="border-l-4 border-l-[var(--brand-verde)] pl-6 py-6">
          <h2 className="text-3xl font-bold mb-6">Cómo Usar el Árbol de Fallas</h2>
          <ol className="space-y-4">
            <li><strong>Paso 1:</strong> Ve a Mantenimiento → Gestión de Vehículos</li>
            <li><strong>Paso 2:</strong> Selecciona un vehículo y haz click en "Ver Árbol de Fallas"</li>
            <li><strong>Paso 3:</strong> Expande componentes (Motor, Hidráulica) para ver detalles</li>
            <li><strong>Paso 4:</strong> Visualiza síntomas, causas y piezas de desgaste asociadas</li>
            <li><strong>Paso 5:</strong> Selecciona piezas del sidebar y crea orden directamente desde el árbol</li>
          </ol>
          <p className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded text-sm">
            🎯 Ventaja: Todo el diagnóstico en un solo lugar - síntomas, causas y piezas necesarias
          </p>
        </div>

        {/* Inventario */}
        <div id="inventario" className="border-l-4 border-l-[var(--brand-rojo)] pl-6 py-6">
          <h2 className="text-3xl font-bold mb-6">Cómo Gestionar Inventario</h2>
          <ol className="space-y-4">
            <li><strong>Recepción:</strong> Bodega → Recepción → Escanea QR o busca código</li>
            <li><strong>Ingreso:</strong> Cantidad, factura → Sistema asigna ubicación y FIFO automático</li>
            <li><strong>Despacho:</strong> Bodega → Despacho → Selecciona OT</li>
            <li><strong>Registro:</strong> Sistema lista piezas necesarias → Confirma → Se genera acta</li>
          </ol>
          <p className="mt-6 p-4 bg-red-50 dark:bg-red-950 rounded text-sm">
            ⚠️ Importante: FIFO significa "First In, First Out" - se despachan las piezas más antiguas primero
          </p>
        </div>

        {/* Reportes */}
        <div id="reportes" className="border-l-4 border-l-[var(--brand-gold)] pl-6 py-6">
          <h2 className="text-3xl font-bold mb-6">Cómo Leer Alertas y Reportes</h2>
          <ol className="space-y-4">
            <li><strong>Alertas:</strong> 🔴 Crítica (acción inmediata) | 🟠 Mayor (riesgo) | 🟡 Menor (preventiva)</li>
            <li><strong>Acceso:</strong> Dashboard → Sección de Alertas muestra todos los equipos en riesgo</li>
            <li><strong>Reportes:</strong> Administración → Reportes → Selecciona período</li>
            <li><strong>Métricas:</strong> OTs completadas, costo vs presupuesto, ROI preventivo vs correctivo</li>
            <li><strong>Decisiones:</strong> Usa datos para optimizar frecuencia de mantenimiento preventivo</li>
          </ol>
          <p className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950 rounded text-sm">
            📊 Dato: Mantenimiento preventivo cuesta 30-50% menos que correctivo por parada inesperada
          </p>
        </div>
      </div>
    </div>
  );
}
