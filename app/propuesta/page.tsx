'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText } from 'lucide-react';
import { useRef } from 'react';

export default function ProposalPage() {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await fetch('/api/generate-proposal-pdf', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

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
      alert('Error al descargar el PDF. Intenta con Print → Save as PDF');
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Controls */}
      <div className="max-w-4xl mx-auto mb-6 flex gap-4">
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <FileText className="h-4 w-4" />
          Imprimir / Guardar como PDF
        </Button>
        <Button onClick={handleDownloadPDF} className="gap-2">
          <Download className="h-4 w-4" />
          Descargar PDF
        </Button>
      </div>

      {/* Proposal Document */}
      <div ref={printRef} className="max-w-4xl mx-auto bg-white p-12 print:p-0">
        {/* Header */}
        <div className="mb-12 text-center border-b pb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">n3uralia ERP</h1>
          <p className="text-xl text-gray-600 mb-4">Plataforma de Gestión Operacional para Minería</p>
          <p className="text-sm text-gray-500">Propuesta Comercial - Desarrollo y SaaS</p>
        </div>

        {/* Executive Summary */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Resumen Ejecutivo</h2>
          <p className="text-gray-700 mb-4">
            Propuesta integral para desarrollar e implementar n3uralia ERP, una plataforma web enterprise para gestión operacional en empresas mineras chilenas. El proyecto incluye 5 módulos operacionales, autenticación avanzada, compliance regulatorio (SERNAGEOMIN), y 1 año de soporte SaaS.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Duración Desarrollo</p>
              <p className="text-2xl font-bold text-gray-900">7 Meses</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Inversión Base</p>
              <p className="text-2xl font-bold text-gray-900">CLP 25M</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">SaaS Mensual</p>
              <p className="text-2xl font-bold text-gray-900">CLP 1M</p>
            </div>
          </div>
        </section>

        {/* Financial Terms */}
        <section className="mb-8 page-break">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Estructura de Precios</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Fase 1: Desarrollo (7 Meses)</h3>
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
                <tr className="bg-gray-50 font-bold">
                  <td className="py-2">TOTAL A PAGAR</td>
                  <td className="py-2 text-right">CLP 29,750,000</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Fase 2: SaaS - Soporte y Operación (Año 1)</h3>
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
                <tr className="bg-gray-50 font-bold">
                  <td className="py-2">Total Mensual</td>
                  <td className="py-2 text-right">CLP 1,190,000</td>
                </tr>
                <tr className="bg-gray-50 font-bold">
                  <td className="py-2">Total Anual (12 meses)</td>
                  <td className="py-2 text-right">CLP 14,280,000</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="font-semibold text-gray-900 mb-1">Inversión Total Año 1 (Desarrollo + SaaS)</p>
            <p className="text-2xl font-bold text-blue-600">CLP 44,030,000 (con IVA)</p>
          </div>
        </section>

        {/* Payment Options */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Opciones de Pago - Desarrollo</h2>
          
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Opción 1: Por Hitos (RECOMENDADO)</h3>
              <p className="text-sm text-gray-600 mb-3">Riesgo compartido, pagos conforme avanzamos en el proyecto</p>
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  <tr>
                    <td className="py-1">Kickoff (20%)</td>
                    <td className="text-right">CLP 5,950,000</td>
                  </tr>
                  <tr>
                    <td className="py-1">Sprint 1-3 (20%)</td>
                    <td className="text-right">CLP 5,950,000</td>
                  </tr>
                  <tr>
                    <td className="py-1">Sprint 4-6 (30%)</td>
                    <td className="text-right">CLP 8,925,000</td>
                  </tr>
                  <tr>
                    <td className="py-1">Sprint 7-8 (20%)</td>
                    <td className="text-right">CLP 5,950,000</td>
                  </tr>
                  <tr>
                    <td className="py-1">Go-Live (10%)</td>
                    <td className="text-right">CLP 2,975,000</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Opción 2: Mensual</h3>
              <p className="text-sm text-gray-600">12 cuotas mensuales iguales</p>
              <p className="mt-2 font-semibold">CLP 4,246,429 × 12 meses</p>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Opción 3: Pago Único</h3>
              <p className="text-sm text-gray-600">Descuento implícito en el total</p>
              <p className="mt-2 font-semibold">CLP 29,750,000 en kickoff</p>
            </div>
          </div>
        </section>

        {/* Deliverables */}
        <section className="mb-8 page-break">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Incluido en CLP 25M</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>5 módulos operacionales completos (Producción, Mantención, Bodega, HSE, Documentos)</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>15+ endpoints API documentados y testeados</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>Autenticación avanzada con RBAC (6 roles definidos)</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>Testing automatizado (80%+ code coverage)</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>Documentación técnica y guía de usuario completa</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>2 semanas de capacitación a equipo cliente</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>1 mes de soporte post-launch sin costo</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>Compliance SERNAGEOMIN integrado</span>
            </li>
          </ul>
        </section>

        {/* SaaS Services */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Incluido en CLP 1M/Mes (SaaS)</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>Hosting Vercel con infraestructura global</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>Database PostgreSQL (Supabase) con backups diarios</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>SSL/TLS, seguridad OWASP Top 10</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>Monitoreo 24/7 con alertas automáticas</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>{'Soporte técnico (<24h respuesta en horas hábiles)'}</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>SLA 99.9% de disponibilidad</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>Parches de seguridad y actualizaciones</span>
            </li>
            <li className="flex gap-3">
              <span className="text-green-600 font-bold">✓</span>
              <span>{'Recuperación ante desastres (RTO <4h)'}</span>
            </li>
          </ul>
        </section>

        {/* Timeline */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Timeline - 26 Semanas</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span>Semanas 1-2: Infraestructura y Setup</span>
              <span className="font-semibold">Sprint 1</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Semanas 3-4: Autenticación y RBAC</span>
              <span className="font-semibold">Sprint 2</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Semanas 5-6: Core API y Database</span>
              <span className="font-semibold">Sprint 3</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Semanas 7-10: Módulo Producción</span>
              <span className="font-semibold">Sprint 4-5</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Semanas 11-13: Módulo Mantención</span>
              <span className="font-semibold">Sprint 6</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Semanas 14-16: Módulo Bodega</span>
              <span className="font-semibold">Sprint 7</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Semanas 17-18: Módulo HSE</span>
              <span className="font-semibold">Sprint 8</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Semanas 19-21: Módulo Documentos</span>
              <span className="font-semibold">Sprint 9</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Semanas 22-23: QA y Testing Completo</span>
              <span className="font-semibold">Sprint 10</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Semanas 24-25: Documentación y Training</span>
              <span className="font-semibold">Sprint 11</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span>Semana 26: Go-Live y Deployment</span>
              <span className="font-semibold">Go-Live</span>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="mb-8 page-break">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Equipo de Desarrollo</h2>
          <div className="space-y-3">
            <div className="border rounded p-3">
              <p className="font-semibold">Tech Lead / Arquitecto</p>
              <p className="text-sm text-gray-600">Diseño, decisiones técnicas, quality assurance</p>
            </div>
            <div className="border rounded p-3">
              <p className="font-semibold">2 Backend Engineers</p>
              <p className="text-sm text-gray-600">APIs, base de datos, integración de módulos</p>
            </div>
            <div className="border rounded p-3">
              <p className="font-semibold">Frontend Engineer</p>
              <p className="text-sm text-gray-600">UI/UX, componentes, integraciones frontend</p>
            </div>
            <div className="border rounded p-3">
              <p className="font-semibold">QA / DevOps Engineer</p>
              <p className="text-sm text-gray-600">Testing, CI/CD, deployment, seguridad</p>
            </div>
            <div className="border rounded p-3">
              <p className="font-semibold">Project Manager (0.5 FTE)</p>
              <p className="text-sm text-gray-600">Coordinación, seguimiento, comunicación</p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">Total: 5.5 FTE dedicados al proyecto</p>
        </section>

        {/* Financial Projections */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Proyección Financiera</h2>
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-2 text-left">Período</th>
                <th className="py-2 px-2 text-right">Ingresos</th>
                <th className="py-2 px-2 text-right">Costos</th>
                <th className="py-2 px-2 text-right">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="py-2 px-2">Meses 1-7 (Desarrollo)</td>
                <td className="py-2 px-2 text-right">CLP 29.75M</td>
                <td className="py-2 px-2 text-right">CLP 29.75M</td>
                <td className="py-2 px-2 text-right">0%</td>
              </tr>
              <tr>
                <td className="py-2 px-2">Meses 8-12 (SaaS)</td>
                <td className="py-2 px-2 text-right">CLP 5M</td>
                <td className="py-2 px-2 text-right">CLP 1.8M</td>
                <td className="py-2 px-2 text-right">64%</td>
              </tr>
              <tr className="bg-gray-50 font-semibold">
                <td className="py-2 px-2">Año 1 Completo</td>
                <td className="py-2 px-2 text-right">CLP 34.75M</td>
                <td className="py-2 px-2 text-right">CLP 31.55M</td>
                <td className="py-2 px-2 text-right">9%</td>
              </tr>
              <tr>
                <td className="py-2 px-2">Año 2 (SaaS)</td>
                <td className="py-2 px-2 text-right">CLP 12M</td>
                <td className="py-2 px-2 text-right">CLP 3.8M</td>
                <td className="py-2 px-2 text-right">68%</td>
              </tr>
              <tr>
                <td className="py-2 px-2">Año 3 (SaaS)</td>
                <td className="py-2 px-2 text-right">CLP 12M</td>
                <td className="py-2 px-2 text-right">CLP 4.2M</td>
                <td className="py-2 px-2 text-right">65%</td>
              </tr>
            </tbody>
          </table>
          <p className="text-sm text-gray-600 mt-4 font-semibold">Break-even: Octubre 2027 (Mes 22)</p>
        </section>

        {/* Terms and Conditions */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Términos y Condiciones</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li><strong>Validez:</strong> Esta propuesta es válida hasta el 23 de Mayo de 2026</li>
            <li><strong>Moneda:</strong> Todos los valores en CLP (Pesos Chilenos)</li>
            <li><strong>IVA:</strong> No incluido en los precios base (se añade 19%)</li>
            <li><strong>Garantía:</strong> 1 año de soporte incluido post-launch</li>
            <li><strong>SLA:</strong> 99.9% de disponibilidad comprometida</li>
            <li><strong>Propiedad Intelectual:</strong> Código y documentación son propiedad del cliente</li>
            <li><strong>Inicio:</strong> Sujeto a firma de contrato y confirmación de presupuesto</li>
          </ul>
        </section>

        {/* Contact */}
        <section className="text-center border-t pt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-2">n3uralia</h3>
          <p className="text-gray-600">Soluciones Tecnológicas para Minería</p>
          <p className="text-gray-500 text-sm mt-4">
            Para más información o consultas, contacta con nuestro equipo
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Email: contacto@n3uralia.com | Web: n3uralia.com
          </p>
        </section>
      </div>

      {/* Print Styles */}
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
