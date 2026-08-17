import Link from 'next/link';
import { ArrowRight, Pickaxe, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductionSectionShell } from '@/components/production/production-section-shell';

export default function SondajePage() {
  return (
    <ProductionSectionShell
      title="Sondaje"
      description="Sondaje se divide en dos flujos distintos: exploración para generar conocimiento geológico del yacimiento y producción para apoyar la ejecución operacional de una mina activa."
      capabilities={[
        'Campañas y pozos de sondaje',
        'Metros perforados y avance',
        'Coordenadas, orientación y profundidad',
        'Intervalos y muestras',
        'Vinculación con geología y química',
        'Histórico por campaña y objetivo',
      ]}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/dashboard/produccion/sondaje/exploracion" className="block">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Search className="h-4 w-4" />Sondaje de Exploración</CardTitle>
              <CardDescription>Conocimiento del subsuelo, geometría, continuidad y potencial del yacimiento.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm font-medium text-primary">Abrir exploración <ArrowRight className="h-4 w-4" /></CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/produccion/sondaje/produccion" className="block">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Pickaxe className="h-4 w-4" />Sondaje de Producción</CardTitle>
              <CardDescription>Perforación operacional, avance, control de ejecución y soporte a la mina activa.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm font-medium text-primary">Abrir producción <ArrowRight className="h-4 w-4" /></CardContent>
          </Card>
        </Link>
      </div>
    </ProductionSectionShell>
  );
}
