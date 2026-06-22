'use client';

export default function GuidesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Centro de Guias Educativas</h1>
        <p className="mt-2 text-muted-foreground">Aprende a usar cada modulo de ERP SegurIA paso a paso</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <a href="#crear-orden" className="rounded-lg border border-border p-6 transition-colors hover:bg-muted/50">
          <h3 className="mb-2 text-xl font-bold">Crear Ordenes de Trabajo</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Aprende como crear ordenes jerarquicas desde el arbol de fallas en 6 pasos
          </p>
          <div className="flex items-center gap-2 text-[var(--brand-naranja)]">Ir a la guia -&gt;</div>
        </a>

        <a href="#arbol" className="rounded-lg border border-border p-6 transition-colors hover:bg-muted/50">
          <h3 className="mb-2 text-xl font-bold">Usar el Arbol de Fallas</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Navega la estructura de componentes y modos de falla en 5 pasos
          </p>
          <div className="flex items-center gap-2 text-[var(--brand-verde)]">Ir a la guia -&gt;</div>
        </a>

        <a href="#inventario" className="rounded-lg border border-border p-6 transition-colors hover:bg-muted/50">
          <h3 className="mb-2 text-xl font-bold">Gestionar Inventario</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Recepcion, despacho y control de piezas de desgaste en 4 pasos
          </p>
          <div className="flex items-center gap-2 text-[var(--brand-rojo)]">Ir a la guia -&gt;</div>
        </a>

        <a href="#reportes" className="rounded-lg border border-border p-6 transition-colors hover:bg-muted/50">
          <h3 className="mb-2 text-xl font-bold">Leer Alertas y Reportes</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Interpreta metricas y toma decisiones informadas en 5 pasos
          </p>
          <div className="flex items-center gap-2 text-[var(--brand-gold)]">Ir a la guia -&gt;</div>
        </a>
      </div>

      <div className="mt-12 space-y-12">
        <div id="crear-orden" className="border-l-4 border-l-[var(--brand-naranja)] py-6 pl-6">
          <h2 className="mb-6 text-3xl font-bold">Como Crear una Orden de Trabajo</h2>
          <ol className="space-y-4">
            <li><strong>Paso 1:</strong> Ve a Ordenes de Trabajo en el menu lateral y haz click en "Crear nueva orden"</li>
            <li><strong>Paso 2:</strong> Selecciona el vehiculo (Excavadora, Pala, Volqueta)</li>
            <li><strong>Paso 3:</strong> Marca los componentes a mantener (Motor, Hidraulica, etc.)</li>
            <li><strong>Paso 4:</strong> Define el tipo (Preventivo, Correctivo o Predictivo) y la prioridad</li>
            <li><strong>Paso 5:</strong> Asigna tecnicos responsables por componente</li>
            <li><strong>Paso 6:</strong> El sistema crea la OT principal y las subordenes automaticamente</li>
          </ol>
          <p className="mt-6 rounded bg-[var(--secondary)]/5 p-4 text-sm dark:bg-blue-950">
            Consejo: Las subordenes permiten que multiples tecnicos trabajen en paralelo y aumenten la eficiencia.
          </p>
        </div>

        <div id="arbol" className="border-l-4 border-l-[var(--brand-verde)] py-6 pl-6">
          <h2 className="mb-6 text-3xl font-bold">Como Usar el Arbol de Fallas</h2>
          <ol className="space-y-4">
            <li><strong>Paso 1:</strong> Ve a Mantencion -&gt; Gestion de Vehiculos</li>
            <li><strong>Paso 2:</strong> Selecciona un vehiculo y haz click en "Ver Arbol de Fallas"</li>
            <li><strong>Paso 3:</strong> Expande componentes (Motor, Hidraulica) para ver detalles</li>
            <li><strong>Paso 4:</strong> Visualiza sintomas, causas y piezas de desgaste asociadas</li>
            <li><strong>Paso 5:</strong> Selecciona piezas del menu lateral y crea una orden desde el arbol</li>
          </ol>
          <p className="mt-6 rounded bg-[var(--brand-verde)]/5 p-4 text-sm dark:bg-green-950">
            Ventaja: Todo el diagnostico en un solo lugar, con sintomas, causas y piezas necesarias.
          </p>
        </div>

        <div id="inventario" className="border-l-4 border-l-[var(--brand-rojo)] py-6 pl-6">
          <h2 className="mb-6 text-3xl font-bold">Como Gestionar Inventario</h2>
          <ol className="space-y-4">
            <li><strong>Recepcion:</strong> Bodega -&gt; Recepcion -&gt; Escanea QR o busca codigo</li>
            <li><strong>Ingreso:</strong> Cantidad, factura -&gt; El sistema asigna ubicacion y FIFO automatico</li>
            <li><strong>Despacho:</strong> Bodega -&gt; Despacho -&gt; Selecciona OT</li>
            <li><strong>Registro:</strong> El sistema lista piezas necesarias -&gt; Confirma -&gt; Se genera acta</li>
          </ol>
          <p className="mt-6 rounded bg-[var(--brand-rojo)]/5 p-4 text-sm dark:bg-red-950">
            Importante: FIFO significa "First In, First Out" y se despachan primero las piezas mas antiguas.
          </p>
        </div>

        <div id="reportes" className="border-l-4 border-l-[var(--brand-gold)] py-6 pl-6">
          <h2 className="mb-6 text-3xl font-bold">Como Leer Alertas y Reportes</h2>
          <ol className="space-y-4">
            <li><strong>Alertas:</strong> Critica (accion inmediata) | Mayor (riesgo) | Menor (preventiva)</li>
            <li><strong>Acceso:</strong> Dashboard -&gt; Seccion de Alertas muestra todos los equipos en riesgo</li>
            <li><strong>Reportes:</strong> Administracion -&gt; Reportes -&gt; Selecciona periodo</li>
            <li><strong>Metricas:</strong> OTs completadas, costo vs presupuesto, ROI preventivo vs correctivo</li>
            <li><strong>Decisiones:</strong> Usa los datos para optimizar la frecuencia de mantencion preventiva</li>
          </ol>
          <p className="mt-6 rounded bg-[var(--secondary)]/5 p-4 text-sm dark:bg-yellow-950">
            Dato: La mantencion preventiva cuesta 30-50% menos que la correctiva por una parada inesperada.
          </p>
        </div>
      </div>
    </div>
  );
}
