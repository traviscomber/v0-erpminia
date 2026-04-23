import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Try to use html2pdf library if available
    // Otherwise, return instructions for using browser's print-to-PDF
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>n3uralia ERP - Propuesta Comercial</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .page { page-break-after: always; padding: 40px; max-width: 800px; }
          h1 { font-size: 32px; margin-bottom: 20px; text-align: center; }
          h2 { font-size: 24px; margin-top: 30px; margin-bottom: 15px; }
          h3 { font-size: 18px; margin-top: 15px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background: #f5f5f5; font-weight: bold; }
          .total { background: #e8f4f8; font-weight: bold; }
          .section { margin-bottom: 20px; }
          ul { margin-left: 20px; }
          li { margin-bottom: 10px; }
          .highlight { background: #fffacd; padding: 15px; border-left: 4px solid #ffc107; }
        </style>
      </head>
      <body>
        <div class="page">
          <h1>n3uralia ERP</h1>
          <p style="text-align: center; font-size: 18px; color: #666;">Plataforma de Gestión Operacional para Minería</p>
          <p style="text-align: center; color: #999;">Propuesta Comercial - Desarrollo y SaaS</p>
          <hr style="margin: 30px 0;">
          
          <div class="section">
            <h2>Resumen Ejecutivo</h2>
            <p>Propuesta integral para desarrollar e implementar n3uralia ERP, una plataforma web enterprise para gestión operacional en empresas mineras chilenas. El proyecto incluye 5 módulos operacionales, autenticación avanzada, compliance regulatorio (SERNAGEOMIN), y 1 año de soporte SaaS.</p>
          </div>

          <div class="section">
            <h2>Estructura de Precios</h2>
            <h3>Fase 1: Desarrollo (7 Meses)</h3>
            <table>
              <tr>
                <td>Monto Base</td>
                <td style="text-align: right;">CLP 25,000,000</td>
              </tr>
              <tr>
                <td>IVA (19%)</td>
                <td style="text-align: right;">CLP 4,750,000</td>
              </tr>
              <tr class="total">
                <td>TOTAL A PAGAR</td>
                <td style="text-align: right;">CLP 29,750,000</td>
              </tr>
            </table>

            <h3>Fase 2: SaaS - Soporte y Operación (Año 1)</h3>
            <table>
              <tr>
                <td>Costo Mensual (Base)</td>
                <td style="text-align: right;">CLP 1,000,000</td>
              </tr>
              <tr>
                <td>IVA Mensual (19%)</td>
                <td style="text-align: right;">CLP 190,000</td>
              </tr>
              <tr class="total">
                <td>Total Mensual</td>
                <td style="text-align: right;">CLP 1,190,000</td>
              </tr>
              <tr class="total">
                <td>Total Anual (12 meses)</td>
                <td style="text-align: right;">CLP 14,280,000</td>
              </tr>
            </table>

            <div class="highlight">
              <strong>Inversión Total Año 1 (Desarrollo + SaaS)</strong><br>
              <span style="font-size: 20px; color: #0066cc;">CLP 44,030,000 (con IVA)</span>
            </div>
          </div>

          <div class="section">
            <h2>Opciones de Pago</h2>
            <h3>Opción 1: Por Hitos (RECOMENDADO)</h3>
            <table>
              <tr>
                <td>Kickoff (20%)</td>
                <td style="text-align: right;">CLP 5,950,000</td>
              </tr>
              <tr>
                <td>Sprint 1-3 (20%)</td>
                <td style="text-align: right;">CLP 5,950,000</td>
              </tr>
              <tr>
                <td>Sprint 4-6 (30%)</td>
                <td style="text-align: right;">CLP 8,925,000</td>
              </tr>
              <tr>
                <td>Sprint 7-8 (20%)</td>
                <td style="text-align: right;">CLP 5,950,000</td>
              </tr>
              <tr>
                <td>Go-Live (10%)</td>
                <td style="text-align: right;">CLP 2,975,000</td>
              </tr>
            </table>

            <h3>Opción 2: Mensual</h3>
            <p>12 cuotas mensuales iguales: <strong>CLP 4,246,429 × 12 meses</strong></p>

            <h3>Opción 3: Pago Único</h3>
            <p>Descuento implícito en el total: <strong>CLP 29,750,000 en kickoff</strong></p>
          </div>
        </div>

        <div class="page">
          <h2>Incluido en CLP 25M</h2>
          <ul>
            <li>5 módulos operacionales completos (Producción, Mantención, Bodega, HSE, Documentos)</li>
            <li>15+ endpoints API documentados y testeados</li>
            <li>Autenticación avanzada con RBAC (6 roles definidos)</li>
            <li>Testing automatizado (80%+ code coverage)</li>
            <li>Documentación técnica y guía de usuario completa</li>
            <li>2 semanas de capacitación a equipo cliente</li>
            <li>1 mes de soporte post-launch sin costo</li>
            <li>Compliance SERNAGEOMIN integrado</li>
          </ul>

          <h2>Incluido en CLP 1M/Mes (SaaS)</h2>
          <ul>
            <li>Hosting Vercel con infraestructura global</li>
            <li>Database PostgreSQL (Supabase) con backups diarios</li>
            <li>SSL/TLS, seguridad OWASP Top 10</li>
            <li>Monitoreo 24/7 con alertas automáticas</li>
            <li>Soporte técnico (&lt;24h respuesta en horas hábiles)</li>
            <li>SLA 99.9% de disponibilidad</li>
            <li>Parches de seguridad y actualizaciones</li>
            <li>Recuperación ante desastres (RTO &lt;4h)</li>
          </ul>

          <h2>Timeline - 26 Semanas</h2>
          <table>
            <tr>
              <th>Período</th>
              <th>Actividades</th>
            </tr>
            <tr>
              <td>Semanas 1-2</td>
              <td>Infraestructura y Setup</td>
            </tr>
            <tr>
              <td>Semanas 3-4</td>
              <td>Autenticación y RBAC</td>
            </tr>
            <tr>
              <td>Semanas 5-6</td>
              <td>Core API y Database</td>
            </tr>
            <tr>
              <td>Semanas 7-10</td>
              <td>Módulo Producción</td>
            </tr>
            <tr>
              <td>Semanas 11-13</td>
              <td>Módulo Mantención</td>
            </tr>
            <tr>
              <td>Semanas 14-16</td>
              <td>Módulo Bodega</td>
            </tr>
            <tr>
              <td>Semanas 17-18</td>
              <td>Módulo HSE</td>
            </tr>
            <tr>
              <td>Semanas 19-21</td>
              <td>Módulo Documentos</td>
            </tr>
            <tr>
              <td>Semanas 22-23</td>
              <td>QA y Testing</td>
            </tr>
            <tr>
              <td>Semanas 24-25</td>
              <td>Documentación y Training</td>
            </tr>
            <tr>
              <td>Semana 26</td>
              <td>Go-Live</td>
            </tr>
          </table>

          <h2>Equipo de Desarrollo</h2>
          <ul>
            <li><strong>Tech Lead / Arquitecto</strong> - Diseño, decisiones técnicas, quality assurance</li>
            <li><strong>2 Backend Engineers</strong> - APIs, base de datos, integración de módulos</li>
            <li><strong>Frontend Engineer</strong> - UI/UX, componentes, integraciones frontend</li>
            <li><strong>QA / DevOps Engineer</strong> - Testing, CI/CD, deployment, seguridad</li>
            <li><strong>Project Manager (0.5 FTE)</strong> - Coordinación, seguimiento, comunicación</li>
          </ul>
          <p style="margin-top: 10px;"><strong>Total: 5.5 FTE dedicados al proyecto</strong></p>
        </div>

        <div class="page">
          <h2>Proyección Financiera</h2>
          <table>
            <tr>
              <th>Período</th>
              <th>Ingresos</th>
              <th>Costos</th>
              <th>Margen</th>
            </tr>
            <tr>
              <td>Meses 1-7 (Desarrollo)</td>
              <td style="text-align: right;">CLP 29.75M</td>
              <td style="text-align: right;">CLP 29.75M</td>
              <td style="text-align: right;">0%</td>
            </tr>
            <tr>
              <td>Meses 8-12 (SaaS)</td>
              <td style="text-align: right;">CLP 5M</td>
              <td style="text-align: right;">CLP 1.8M</td>
              <td style="text-align: right;">64%</td>
            </tr>
            <tr class="total">
              <td>Año 1 Completo</td>
              <td style="text-align: right;">CLP 34.75M</td>
              <td style="text-align: right;">CLP 31.55M</td>
              <td style="text-align: right;">9%</td>
            </tr>
            <tr>
              <td>Año 2 (SaaS)</td>
              <td style="text-align: right;">CLP 12M</td>
              <td style="text-align: right;">CLP 3.8M</td>
              <td style="text-align: right;">68%</td>
            </tr>
            <tr>
              <td>Año 3 (SaaS)</td>
              <td style="text-align: right;">CLP 12M</td>
              <td style="text-align: right;">CLP 4.2M</td>
              <td style="text-align: right;">65%</td>
            </tr>
          </table>
          <p style="margin-top: 20px;"><strong>Break-even: Octubre 2027 (Mes 22)</strong></p>

          <h2>Términos y Condiciones</h2>
          <ul>
            <li><strong>Validez:</strong> Esta propuesta es válida hasta el 23 de Mayo de 2026</li>
            <li><strong>Moneda:</strong> Todos los valores en CLP (Pesos Chilenos)</li>
            <li><strong>IVA:</strong> No incluido en los precios base (se añade 19%)</li>
            <li><strong>Garantía:</strong> 1 año de soporte incluido post-launch</li>
            <li><strong>SLA:</strong> 99.9% de disponibilidad comprometida</li>
            <li><strong>Propiedad Intelectual:</strong> Código y documentación son propiedad del cliente</li>
            <li><strong>Inicio:</strong> Sujeto a firma de contrato y confirmación de presupuesto</li>
          </ul>

          <div style="margin-top: 40px; border-top: 2px solid #333; padding-top: 20px; text-align: center;">
            <h3>n3uralia</h3>
            <p>Soluciones Tecnológicas para Minería</p>
            <p style="margin-top: 10px; color: #666; font-size: 14px;">
              Email: contacto@n3uralia.com | Web: n3uralia.com
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': 'attachment; filename="n3uralia-propuesta-comercial.pdf"',
      },
    });
  } catch (error) {
    console.error('[v0] Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
