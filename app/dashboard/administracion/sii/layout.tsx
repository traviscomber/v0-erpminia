import Link from 'next/link';

export default function SiiAdministrationLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-5xl px-6 pt-6">
        <nav aria-label="Configuración SII" className="flex flex-wrap gap-2 rounded-xl border bg-card p-2 shadow-sm">
          <Link href="/dashboard/administracion/sii" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
            Conexión y certificados
          </Link>
          <Link href="/dashboard/administracion/sii/perfil" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
            Perfil tributario
          </Link>
          <Link href="/dashboard/administracion/sii/preparacion" className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted">
            Preparación
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
