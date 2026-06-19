'use client';

import { useRef } from 'react';
import { Download, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProposalPage() {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch('/api/generate-proposal-pdf', { method: 'POST' });
      if (!response.ok) throw new Error('No se pudo generar el PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'n3uralia-propuesta-comercial.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('[v0] Error downloading PDF:', error);
      alert('Error al descargar el PDF. Intenta con Imprimir y guardar como PDF');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto mb-6 flex max-w-4xl gap-4 print:hidden">
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Imprimir / Guardar como PDF
        </Button>
        <Button onClick={handleDownloadPDF} className="gap-2">
          <Download className="h-4 w-4" />
          Descargar PDF
        </Button>
      </div>

      <div ref={printRef} className="mx-auto max-w-4xl bg-white p-12 print:p-0">
        <div className="mb-12 border-b pb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">n3uralia ERP</h1>
          <p className="mb-4 text-xl text-gray-600">Plataforma de Gestion Operacional para Mineria</p>
          <p className="text-sm text-gray-500">Propuesta Comercial - Desarrollo y SaaS</p>
        </div>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Resumen Ejecutivo</h2>
          <p className="mb-4 text-gray-700">
            Propuesta integral para desarrollar e implementar n3uralia ERP, una plataforma web
            empresarial para gestion operacional en empresas mineras chilenas. El proyecto incluye
            5 modulos operacionales, autenticacion avanzada, cumplimiento regulatorio
            (SERNAGEOMIN), y 1 ano de soporte SaaS.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-muted/5 p-4">
              <p className="text-sm text-gray-600">Duracion Desarrollo</p>
              <p className="text-2xl font-bold text-gray-900">7 Meses</p>
            </div>
            <div className="rounded-lg bg-muted/5 p-4">
              <p className="text-sm text-gray-600">Inversion Base</p>
              <p className="text-2xl font-bold text-gray-900">CLP 25M</p>
            </div>
            <div className="rounded-lg bg-muted/5 p-4">
              <p className="text-sm text-gray-600">SaaS Mensual</p>
              <p className="text-2xl font-bold text-gray-900">CLP 1M</p>
            </div>
          </div>
        </section>

        <section className="mb-8 page-break">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Estructura de Precios</h2>
          <div className="mb-6">
            <h3 className="mb-3 text-lg font-semibold text-foreground">Fase 1: Desarrollo (7 Meses)</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 text-gray-700">Monto Base</td>
                  <td className="py-2 text-right font-semibold">CLP 25,000,000</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-700">IVA (19%)</td>
                  <td className="py-2 text-right font-semibold">CLP 4,750,000</td>
                </tr>
                <tr className="bg-muted/5 font-bold">
                  <td className="py-2">TOTAL A PAGAR</td>
                  <td className="py-2 text-right">CLP 29,750,000</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mb-6">
            <h3 className="mb-3 text-lg font-semibold text-foreground">Fase 2: SaaS - Soporte y Operacion (Ano 1)</h3>
            <table className="w-full text-sm">
              <tbody className="divide-y">
                <tr>
                  <td className="py-2 text-gray-700">Costo Mensual (Base)</td>
                  <td className="py-2 text-right font-semibold">CLP 1,000,000</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-700">IVA Mensual (19%)</td>
                  <td className="py-2 text-right font-semibold">CLP 190,000</td>
                </tr>
                <tr className="bg-muted/5 font-bold">
                  <td className="py-2">Total Mensual</td>
                  <td className="py-2 text-right">CLP 1,190,000</td>
                </tr>
                <tr className="bg-muted/5 font-bold">
                  <td className="py-2">Total Anual (12 meses)</td>
                  <td className="py-2 text-right">CLP 14,280,000</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-[var(--secondary)]/30 bg-[var(--secondary)]/5 p-4">
            <p className="mb-1 font-semibold text-gray-900">Inversion Total Ano 1 (Desarrollo + SaaS)</p>
            <p className="text-2xl font-bold text-[var(--secondary)]">CLP 44,030,000 (con IVA)</p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Opciones de Pago - Desarrollo</h2>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold text-gray-900">Opcion 1: Por Hitos (RECOMENDADO)</h3>
              <p className="mb-3 text-sm text-gray-600">Riesgo compartido, pagos conforme avanzamos en el proyecto</p>
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  <tr><td className="py-1">Kickoff (20%)</td><td className="text-right">CLP 5,950,000</td></tr>
                  <tr><td className="py-1">Sprint 1-3 (20%)</td><td className="text-right">CLP 5,950,000</td></tr>
                  <tr><td className="py-1">Sprint 4-6 (30%)</td><td className="text-right">CLP 8,925,000</td></tr>
                  <tr><td className="py-1">Sprint 7-8 (20%)</td><td className="text-right">CLP 5,950,000</td></tr>
                  <tr><td className="py-1">Go-Live (10%)</td><td className="text-right">CLP 2,975,000</td></tr>
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold text-gray-900">Opcion 2: Mensual</h3>
              <p className="text-sm text-gray-600">12 cuotas mensuales iguales</p>
              <p className="mt-2 font-semibold">CLP 4,246,429 x 12 meses</p>
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-semibold text-gray-900">Opcion 3: Pago Unico</h3>
              <p className="text-sm text-gray-600">Descuento implicito en el total</p>
              <p className="mt-2 font-semibold">CLP 29,750,000 en kickoff</p>
            </div>
          </div>
        </section>

        <section className="mb-8 page-break">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Incluido en CLP 25M</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex gap-3"><span className="font-bold text-[var(--brand-verde)]">✓</span><span>5 modulos operacionales completos (Produccion, Mantencion, Bodega, HSE, Documentos)</span></li>
            <li className="flex gap-3"><span className="font-bold text-[var(--brand-verde)]">✓</span><span>15+ endpoints API documentados y testeados</span></li>
            <li className="flex gap-3"><span className="font-bold text-[var(--brand-verde)]">✓</span><span>Autenticacion avanzada con RBAC (6 roles definidos)</span></li>
            <li className="flex gap-3"><span className="font-bold text-[var(--brand-verde)]">✓</span><span>Testing automatizado (80%+ code coverage)</span></li>
            <li className="flex gap-3"><span className="font-bold text-[var(--brand-verde)]">✓</span><span>Documentacion tecnica y guia de usuario completa</span></li>
            <li className="flex gap-3"><span className="font-bold text-[var(--brand-verde)]">✓</span><span>2 semanas de capacitacion a equipo cliente</span></li>
            <li className="flex gap-3"><span className="font-bold text-[var(--brand-verde)]">✓</span><span>1 mes de soporte post-launch sin costo</span></li>
            <li className="flex gap-3"><span className="font-bold text-[var(--brand-verde)]">✓</span><span>Cumplimiento SERNAGEOMIN integrado</span></li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Incluido en CLP 1M/Mes (SaaS)</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex gap-3"><span className="font-bold text-[var(--brand-verde)]">✓</span><span>Hosting Vercel con infraestructura global</span></li>
            <li className="flex gap-3"><span className="font-bold text-[var(--brand-verde)]">✓</span><span>Base de datos PostgreSQL (Supabase) con backups diarios</span></li>
            <li className="flex gap-3"><span className="font-bold text-[var(--brand-verde)]">✓</span><span>SSL/TLS y seguridad OWASP Top 10</span></li>
            <li className="flex gap-3"><span className="font-bold text-[var(--brand-verde)]">✓</span><span>Monitoreo 24/7 con alertas automaticas</span></li>
            <li className="flex gap-3"><span className="font-bold text-[var(--brand-verde)]">✓</span><span>Soporte tecnico &lt;24h en horas habiles</span></li>
            <li className="flex gap-3"><span className="font-bold text-[var(--brand-verde)]">✓</span><span>SLA 99.9% de disponibilidad</span></li>
            <li className="flex gap-3"><span className="font-bold text-[var(--brand-verde)]">✓</span><span>Parches de seguridad y actualizaciones</span></li>
            <li className="flex gap-3"><span className="font-bold text-[var(--brand-verde)]">✓</span><span>Recuperacion ante desastres (RTO &lt;4h)</span></li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Timeline - 26 Semanas</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b py-2"><span>Semanas 1-2: Infraestructura y Setup</span><span className="font-semibold">Sprint 1</span></div>
            <div className="flex justify-between border-b py-2"><span>Semanas 3-4: Autenticacion y RBAC</span><span className="font-semibold">Sprint 2</span></div>
            <div className="flex justify-between border-b py-2"><span>Semanas 5-6: Core API y Base de Datos</span><span className="font-semibold">Sprint 3</span></div>
            <div className="flex justify-between border-b py-2"><span>Semanas 7-10: Modulo Produccion</span><span className="font-semibold">Sprint 4-5</span></div>
            <div className="flex justify-between border-b py-2"><span>Semanas 11-13: Modulo Mantencion</span><span className="font-semibold">Sprint 6</span></div>
            <div className="flex justify-between border-b py-2"><span>Semanas 14-16: Modulo Bodega</span><span className="font-semibold">Sprint 7</span></div>
            <div className="flex justify-between border-b py-2"><span>Semanas 17-18: Modulo HSE</span><span className="font-semibold">Sprint 8</span></div>
            <div className="flex justify-between border-b py-2"><span>Semanas 19-21: Modulo Documentos</span><span className="font-semibold">Sprint 9</span></div>
            <div className="flex justify-between border-b py-2"><span>Semanas 22-23: QA y Testing Completo</span><span className="font-semibold">Sprint 10</span></div>
            <div className="flex justify-between border-b py-2"><span>Semanas 24-25: Documentacion y Training</span><span className="font-semibold">Sprint 11</span></div>
            <div className="flex justify-between border-b py-2"><span>Semana 26: Go-Live y Deployment</span><span className="font-semibold">Go-Live</span></div>
          </div>
        </section>

        <section className="mb-8 page-break">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Equipo de Desarrollo</h2>
          <div className="space-y-3">
            <div className="rounded border p-3">
              <p className="font-semibold">Tech Lead / Arquitecto</p>
              <p className="text-sm text-gray-600">Diseno, decisiones tecnicas, quality assurance</p>
            </div>
            <div className="rounded border p-3">
              <p className="font-semibold">2 Backend Engineers</p>
              <p className="text-sm text-gray-600">APIs, base de datos, integracion de modulos</p>
            </div>
            <div className="rounded border p-3">
              <p className="font-semibold">Frontend Engineer</p>
              <p className="text-sm text-gray-600">UI/UX, componentes, integraciones frontend</p>
            </div>
            <div className="rounded border p-3">
              <p className="font-semibold">QA / DevOps Engineer</p>
              <p className="text-sm text-gray-600">Testing, CI/CD, deployment, seguridad</p>
            </div>
            <div className="rounded border p-3">
              <p className="font-semibold">Project Manager (0.5 FTE)</p>
              <p className="text-sm text-gray-600">Coordinacion, seguimiento, comunicacion</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">Total: 5.5 FTE dedicados al proyecto</p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Proyeccion Financiera</h2>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="py-2 px-2 text-left">Periodo</th>
                <th className="py-2 px-2 text-right">Ingresos</th>
                <th className="py-2 px-2 text-right">Costos</th>
                <th className="py-2 px-2 text-right">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr><td className="py-2 px-2">Meses 1-7 (Desarrollo)</td><td className="py-2 px-2 text-right">CLP 29.75M</td><td className="py-2 px-2 text-right">CLP 29.75M</td><td className="py-2 px-2 text-right">0%</td></tr>
              <tr><td className="py-2 px-2">Meses 8-12 (SaaS)</td><td className="py-2 px-2 text-right">CLP 5M</td><td className="py-2 px-2 text-right">CLP 1.8M</td><td className="py-2 px-2 text-right">64%</td></tr>
              <tr className="bg-muted/5 font-semibold"><td className="py-2 px-2">Ano 1 Completo</td><td className="py-2 px-2 text-right">CLP 34.75M</td><td className="py-2 px-2 text-right">CLP 31.55M</td><td className="py-2 px-2 text-right">9%</td></tr>
              <tr><td className="py-2 px-2">Ano 2 (SaaS)</td><td className="py-2 px-2 text-right">CLP 12M</td><td className="py-2 px-2 text-right">CLP 3.8M</td><td className="py-2 px-2 text-right">68%</td></tr>
              <tr><td className="py-2 px-2">Ano 3 (SaaS)</td><td className="py-2 px-2 text-right">CLP 12M</td><td className="py-2 px-2 text-right">CLP 4.2M</td><td className="py-2 px-2 text-right">65%</td></tr>
            </tbody>
          </table>
          <p className="mt-4 text-sm font-semibold text-gray-600">Break-even: Octubre 2027 (Mes 22)</p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">Terminos y Condiciones</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li><strong>Validez:</strong> Esta propuesta es valida hasta el 23 de mayo de 2026</li>
            <li><strong>Moneda:</strong> Todos los valores en CLP (Pesos Chilenos)</li>
            <li><strong>IVA:</strong> No incluido en los precios base (se agrega 19%)</li>
            <li><strong>Garantia:</strong> 1 ano de soporte incluido post-launch</li>
            <li><strong>SLA:</strong> 99.9% de disponibilidad comprometida</li>
            <li><strong>Propiedad Intelectual:</strong> Codigo y documentacion son propiedad del cliente</li>
            <li><strong>Inicio:</strong> Sujeto a firma de contrato y confirmacion de presupuesto</li>
          </ul>
        </section>

        <section className="border-t pt-8 text-center">
          <h3 className="mb-2 text-lg font-bold text-gray-900">n3uralia</h3>
          <p className="text-gray-600">Soluciones Tecnologicas para Mineria</p>
          <p className="mt-4 text-sm text-gray-500">Para mas informacion o consultas, contacta con nuestro equipo</p>
          <p className="mt-2 text-sm text-gray-500">Email: contacto@n3uralia.com | Web: n3uralia.com</p>
        </section>
      </div>

      <style jsx>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .max-w-4xl {
            max-width: 100%;
          }
          .page-break {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
}
