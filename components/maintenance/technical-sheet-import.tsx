'use client';

import { useRef, useState, type DragEvent } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Download, Loader2, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ImportResult = {
  success: boolean;
  message: string;
  imported_sheets?: number;
  updated_sheets?: number;
  imported_components?: number;
  updated_components?: number;
  imported_fault_modes?: number;
  updated_fault_modes?: number;
  skipped_assets?: number;
  total?: number;
  error?: string;
};

function buildTemplateCsv() {
  const headers = [
    'ASSET_CODE',
    'ASSET_NAME',
    'BRAND_NAME',
    'MODEL_NAME',
    'SOURCE_URL',
    'SOURCE_TYPE',
    'SOURCE_VERSION',
    'VALIDATED',
    'RAW_SPECS',
    'COMPONENT_CODE',
    'COMPONENT_NAME',
    'COMPONENT_LEVEL',
    'COMPONENT_CRITICALITY',
    'COMPONENT_STATUS',
    'FAULT_CODE',
    'FAULT_NAME',
    'FAULT_SEVERITY',
    'SYMPTOM',
    'CAUSE',
    'EFFECT',
    'RECOMMENDED_ACTION',
  ];

  const rows = [
    [
      'VEH-001',
      'Komatsu WA380-8',
      'Komatsu',
      'WA380-8',
      'https://www.komatsu.com/en-us/products/equipment/wheel-loaders/large-wheel-loaders/wa380-8',
      'official',
      '2026-07',
      'si',
      '{"power_kw":143,"power_hp":191,"weight_kg":19020,"bucket_m3":3.3}',
      'ENG-001',
      'Motor',
      '1',
      'alta',
      'activo',
      'ENG-001-01',
      'Sobretemperatura',
      'alta',
      'Alza rapida de temperatura y perdida de potencia',
      'Inspeccionar sistema de enfriamiento y filtros',
      'Aumento de temperatura del motor',
      'Detener, revisar y programar mantencion',
    ],
    [
      'VEH-002',
      'Cat 390F L',
      'Caterpillar',
      '390F L',
      'https://www.cat.com/en_US/products/new/equipment/excavators/large-excavators/108464.html',
      'official',
      '2026-07',
      'si',
      '{"power_hp":524,"weight_kg":87800,"bucket_m3":2.2,"dig_depth_m":10.75}',
      'HYD-001',
      'Sistema hidraulico',
      '1',
      'alta',
      'activo',
      'HYD-001-01',
      'Fuga en linea',
      'media',
      'Presion baja o rastros de aceite',
      'Revisar mangueras, sellos y acoples',
      'Perdida de presion hidraulica',
      'Aislar, reparar y probar presion',
    ],
    [
      'VEH-003',
      'Cat 324D L',
      'Caterpillar',
      '324D L',
      'https://www.miltoncat.com/machinery-equipment/new/excavators/324d-l-hydraulic-excavator',
      'official',
      '2026-07',
      'si',
      '{"power_hp":188,"weight_kg":24790,"bucket_m3":1.6,"engine":"Cat C7 ACERT"}',
      'UND-001',
      'Undercarriage',
      '1',
      'alta',
      'activo',
      'UND-001-01',
      'Desgaste de oruga',
      'media',
      'Holgura y vibracion anormal',
      'Inspeccionar rodillos, zapatas y tension',
      'Desgaste prematuro del tren de rodaje',
      'Ajustar tension y cambiar componentes desgastados',
    ],
    [
      'MCH-004',
      'Scooptram ST1030',
      'Epiroc',
      'Scooptram ST1030',
      'https://www.epiroc.com/en-us/products/loaders-and-trucks/diesel-loaders/scooptram-st1030',
      'official',
      '2026-07',
      'si',
      '{"load_ton":10,"application":"underground loading"}',
      'HDL-001',
      'Sistema de carguio',
      '1',
      'alta',
      'activo',
      'HDL-001-01',
      'Fuga hidraulica en carguio',
      'alta',
      'Perdida de fuerza o movimiento lento',
      'Revisar circuito, purgar y reemplazar elementos defectuosos',
      'Reduccion de rendimiento en carguio',
      'Aislar, revisar y reparar el circuito',
    ],
    [
      'MCH-005',
      'Boomer S1D',
      'Epiroc',
      'Boomer S1D',
      'https://www.epiroc.com/content/dam/epiroc/underground-mining-and-tunneling/tme/drilling-technical-specifications/boomer/9869_0094_01c_Boomer_S1_technical_specification_english.pdf',
      'official',
      '2026-07',
      'si',
      '{"application":"face drilling","section_m2":"33"}',
      'BOOM-001',
      'Brazo de perforacion',
      '1',
      'alta',
      'activo',
      'BOOM-001-01',
      'Juego excesivo en brazo',
      'media',
      'Deriva de posicion o imprecision',
      'Medir holguras y programar recambio de bujes o pines',
      'Menor calidad de perforacion',
      'Ajustar y calibrar brazo',
    ],
    [
      'MCH-006',
      'Cat 938H',
      'Caterpillar',
      '938H',
      'https://h-cpc.cat.com/cmms/v2?cid=406&f=product&gid=263&it=product&lid=en&nc=1&pid=17275910&sc=R160',
      'official',
      '2026-07',
      'si',
      '{"application":"loading","power_hp":"180"}',
      'HYD-001',
      'Sistema hidraulico',
      '1',
      'alta',
      'activo',
      'HYD-001-01',
      'Perdida de fuerza de levantamiento',
      'media',
      'Balde lento o poca respuesta',
      'Inspeccionar presion y componentes hidraulicos',
      'Ciclos mas largos y menor productividad',
      'Prueba hidraulica y calibracion',
    ],
    [
      'MCH-007',
      'Scooptram ST1010',
      'Epiroc',
      'ST1010',
      'https://www.epiroc.com/content/dam/epiroc/parts-and-services/service-agreements-and-audits/brochures/9865%200020%2001%20RigScan%20brochure.pdf',
      'official',
      '2026-07',
      'si',
      '{"application":"underground loading","capacity_ton":10}',
      'ENG-001',
      'Motor',
      '1',
      'alta',
      'activo',
      'ENG-001-01',
      'Falla de alimentacion',
      'alta',
      'Perdida de potencia o arranque lento',
      'Revisar combustible, filtros y presion',
      'Detencion del equipo',
      'Revisar circuito y programar mantenimiento',
    ],
    [
      'MCH-008',
      'Boomer 281',
      'Epiroc',
      'Boomer 281',
      'https://www.epiroc.com/es-cl/products/drill-rigs/face-drill-rigs/boomer-281',
      'official',
      '2026-07',
      'si',
      '{"application":"face drilling","coverage_m2":"48"}',
      'DRL-001',
      'Sistema de perforacion',
      '1',
      'alta',
      'activo',
      'DRL-001-01',
      'Baja presion de perforacion',
      'alta',
      'Bajo avance o vibracion anormal',
      'Revisar bomba, presion y circuito',
      'Rendimiento bajo',
      'Ajustar y calibrar sistema',
    ],
    [
      'MCH-009',
      'Cat 246D3',
      'Caterpillar',
      '246D3',
      'https://www.cat.com/en_GB/products/new/equipment/skid-steer-and-compact-track-loaders/skid-steer-loaders/30056688547513.html',
      'official',
      '2026-07',
      'si',
      '{"power_hp":74.3,"payload_kg":1000,"weight_kg":3392}',
      'HID-001',
      'Sistema hidraulico',
      '1',
      'alta',
      'activo',
      'HID-001-01',
      'Baja presion hidraulica',
      'alta',
      'Brazo lento o respuesta irregular',
      'Prueba de presion y revision de mangueras',
      'Menor capacidad de trabajo',
      'Inspeccionar circuito hidraulico',
    ],
    [
      'MCH-010',
      'Cat 938G',
      'Caterpillar',
      '938G',
      'https://h-cpc.cat.com/cmms/v2?cid=406&f=product&gid=263&it=product&lid=en&nc=1&pid=752990&sc=M620',
      'official',
      '2026-07',
      'si',
      '{"power_hp":160,"application":"material handling"}',
      'ENG-001',
      'Motor',
      '1',
      'alta',
      'activo',
      'ENG-001-01',
      'Perdida de potencia',
      'media',
      'Menor fuerza y respuesta lenta',
      'Inspeccionar admision, filtros y combustible',
      'Menor productividad',
      'Revisar sistema de admision',
    ],
    [
      'MCH-011',
      'QAS 500',
      'Atlas Copco',
      'QAS 500',
      'https://www.atlascopco.com/en-rs/construction-equipment/products/power-diesel-generators/mobile-europe/qas',
      'official',
      '2026-07',
      'si',
      '{"power_kva":500,"application":"power supply"}',
      'CTRL-001',
      'Control y proteccion',
      '1',
      'alta',
      'activo',
      'CTRL-001-01',
      'Falla de control',
      'media',
      'Salida inestable o alarmas',
      'Verificar tablero y sensores',
      'Riesgo de corte de energia',
      'Inspeccionar control y protecciones',
    ],
    [
      'MCH-012',
      'Simba S7',
      'Epiroc',
      'Simba S7',
      'https://www.epiroc.com/en-us/products/drill-rigs/production-drill-rigs/simba-s7',
      'official',
      '2026-07',
      'si',
      '{"application":"production drilling","type":"long-hole drill rig"}',
      'DRL-001',
      'Sistema de perforacion',
      '1',
      'alta',
      'activo',
      'DRL-001-01',
      'Baja presion de perforacion',
      'alta',
      'Bajo avance o vibracion anormal',
      'Revisar bombas, presion y avance',
      'Menor precision',
      'Calibrar y revisar circuito',
    ],
    [
      'MCH-013',
      'Simba 1254',
      'Epiroc',
      'Simba 1254',
      'https://www.epiroc.com/en-us/products/drill-rigs/production-drill-rigs/simba-1254',
      'official',
      '2026-07',
      'si',
      '{"application":"underground drilling","type":"production drill rig"}',
      'ELE-001',
      'Sistema electrico y control',
      '1',
      'media',
      'activo',
      'ELE-001-01',
      'Error de comunicacion',
      'media',
      'Alarmas o mandos intermitentes',
      'Inspeccionar conectores y diagnostico',
      'Paradas intermitentes',
      'Verificar control y sensores',
    ],
    [
      'MCH-014',
      'Toyota Hilux',
      'Toyota',
      'Hilux',
      'https://www.toyota.com.au/hilux',
      'official',
      '2026-07',
      'si',
      '{"application":"support","type":"pickup 4x4"}',
      'BRK-001',
      'Frenos y suspension',
      '1',
      'alta',
      'activo',
      'BRK-001-01',
      'Desgaste de frenos',
      'media',
      'Recorrido largo del pedal o vibracion',
      'Inspeccionar frenos y programar recambio',
      'Riesgo de seguridad',
      'Mantener y calibrar el sistema',
    ],
    [
      'MCH-015',
      'Liugong CPCD25A',
      'Liugong',
      'CPCD25A',
      'https://www.liugong.com/en/product/cpcd25/index.html',
      'official',
      '2026-07',
      'si',
      '{"application":"logistics","type":"forklift diesel"}',
      'HID-001',
      'Sistema hidraulico',
      '1',
      'alta',
      'activo',
      'HID-001-01',
      'Fuga o baja fuerza de levante',
      'alta',
      'Horquillas lentas o caida de carga',
      'Inspeccionar circuito y reemplazar elementos',
      'Menor productividad',
      'Revisar bomba y sellos',
    ],
    [
      'MCH-016',
      'Cat 320D L',
      'Caterpillar',
      '320D L',
      'https://h-cpc.cat.com/cmms/v2?cid=406&f=product&gid=329&it=product&lid=nc&nc=1&pid=18341586&sc=R760',
      'official',
      '2026-07',
      'si',
      '{"application":"excavation","type":"hydraulic excavator"}',
      'HYD-001',
      'Sistema hidraulico',
      '1',
      'alta',
      'activo',
      'HYD-001-01',
      'Perdida de presion',
      'alta',
      'Movimiento lento o irregular',
      'Prueba de presion y revision de fugas',
      'Caida de productividad',
      'Revisar circuito hidraulico',
    ],
    [
      'MCH-017',
      'Cat 928G',
      'Caterpillar',
      '928G',
      'https://h-cpc.cat.com/cmms/v2?cid=406&f=product&gid=263&it=product&lid=en&nc=1&pid=753093&sc=US',
      'official',
      '2026-07',
      'si',
      '{"application":"loading","type":"wheel loader"}',
      'HYD-001',
      'Sistema hidraulico',
      '1',
      'alta',
      'activo',
      'HYD-001-01',
      'Baja fuerza de levantamiento',
      'media',
      'Ciclos lentos o poca respuesta',
      'Inspeccionar presion y circuito',
      'Mayor tiempo de carga',
      'Revisar bombas y filtros',
    ],
    [
      'MCH-18',
      'Cat 950 GC',
      'Caterpillar',
      '950 GC',
      'https://www.cat.com/en_US/products/new/equipment/wheel-loaders/medium-wheel-loaders/1000029532.html',
      'official',
      '2026-07',
      'si',
      '{"application":"loading","type":"wheel loader"}',
      'ENG-001',
      'Motor',
      '1',
      'alta',
      'activo',
      'ENG-001-01',
      'Falla de alimentacion',
      'media',
      'Arranque lento o perdida de potencia',
      'Revisar filtros y calidad de combustible',
      'Menor eficiencia',
      'Inspeccionar sistema de admision',
    ],
    [
      'MCH-019',
      'JCB 3CX',
      'JCB',
      '3CX',
      'https://www.jcb.com/en-gb/products/backhoe-loaders/3cx',
      'official',
      '2026-07',
      'si',
      '{"application":"excavation","type":"backhoe loader"}',
      'HYD-001',
      'Sistema hidraulico',
      '1',
      'alta',
      'activo',
      'HYD-001-01',
      'Fuga hidraulica',
      'media',
      'Respuesta lenta o perdida de fuerza',
      'Revisar fugas y presion',
      'Baja capacidad operacional',
      'Inspeccionar circuito hidraulico',
    ],
    [
      'MCH-020',
      'JCB 531-70',
      'JCB',
      '531-70',
      'https://www.jcb.com/en-gb/products/loadall-telehandlers/531-70',
      'official',
      '2026-07',
      'si',
      '{"application":"lifting","type":"telehandler"}',
      'BOOM-001',
      'Brazo telescopico',
      '1',
      'alta',
      'activo',
      'BOOM-001-01',
      'Holgura o desalineacion',
      'media',
      'Movimiento impreciso o vibracion',
      'Inspeccionar holguras y cilindros',
      'Menor seguridad',
      'Calibrar y revisar brazo',
    ],
    [
      'MCH-021',
      'JCB 455ZX',
      'JCB',
      '455ZX',
      'https://www.jcb.com/en-gb/products/wheel-loaders/455zx',
      'official',
      '2026-07',
      'si',
      '{"application":"loading","type":"wheel loader"}',
      'ENG-001',
      'Motor',
      '1',
      'alta',
      'activo',
      'ENG-001-01',
      'Perdida de potencia',
      'media',
      'Respuesta lenta o baja fuerza',
      'Revisar filtros y admision',
      'Menor productividad',
      'Inspeccionar motor y filtros',
    ],
    [
      'MCH-022',
      'Atlas Copco XAS 97',
      'Atlas Copco',
      'XAS 97',
      'https://www.atlascopco.com/en-us/construction-equipment/products/portable-air-compressors/xas-97',
      'official',
      '2026-07',
      'si',
      '{"application":"compressed air","type":"portable compressor"}',
      'AIR-001',
      'Sistema de compresion',
      '1',
      'alta',
      'activo',
      'AIR-001-01',
      'Baja presion de aire',
      'alta',
      'Salida por debajo de lo esperado',
      'Prueba de presion y revision de fugas',
      'Menor suministro de aire',
      'Mantener circuito y filtros',
    ],
    [
      'VEH-023',
      'Volkswagen Amarok',
      'Volkswagen',
      'Amarok',
      'https://www.volkswagen.com.au/en/models/amarok.html',
      'official',
      '2026-07',
      'si',
      '{"application":"traslado y soporte","type":"pickup 4x4"}',
      'ENG-001',
      'Motor',
      '1',
      'alta',
      'activo',
      'ENG-001-01',
      'Falla de alimentacion',
      'media',
      'Arranque lento o perdida de potencia',
      'Revisar filtro, presion y circuito de combustible',
      'Menor disponibilidad del vehiculo',
      'Revisar y programar mantencion',
    ],
    [
      'TRK-024',
      'Foton Auman 3938',
      'Foton',
      'Auman 3938',
      'https://www.fotonmotor.com/',
      'official',
      '2026-07',
      'si',
      '{"application":"transporte pesado","type":"camion tolva 6x4"}',
      'TRN-001',
      'Transmision y tren motriz',
      '1',
      'alta',
      'activo',
      'TRN-001-01',
      'Patinamiento o cambio brusco',
      'media',
      'Golpes o perdida de arrastre',
      'Verificar caja, embrague y aceite',
      'Bajo rendimiento y desgaste acelerado',
      'Ajustar y diagnosticar tren motriz',
    ],
    [
      'CMP-025',
      'Doosan P600',
      'Doosan',
      'P600',
      'https://www.doosanportablepower.com/dpp-mea/mea/en/equipment/air-compressors/medium-air-compressors',
      'official',
      '2026-07',
      'si',
      '{"application":"aire comprimido","flow_cfm":600,"pressure_bar":6.9}',
      'AIR-001',
      'Sistema de aire',
      '1',
      'alta',
      'activo',
      'AIR-001-01',
      'Baja presion o caudal',
      'alta',
      'Salida de aire irregular o caida de presion',
      'Revisar filtros, fugas y estado del airend',
      'Menor aporte a herramientas y detencion de faena',
      'Revisar circuito de aire',
    ],
    [
      'VEH-026',
      'Mitsubishi L200',
      'Mitsubishi',
      'L200',
      'https://www.mitsubishi-motors.com/en/products/l200/',
      'official',
      '2026-07',
      'si',
      '{"application":"traslado y soporte","type":"pickup 4x4"}',
      'ENG-001',
      'Motor',
      '1',
      'alta',
      'activo',
      'ENG-001-01',
      'Falla de alimentacion',
      'media',
      'Arranque lento o perdida de potencia',
      'Revisar filtro, presion y circuito de combustible',
      'Menor disponibilidad del vehiculo',
      'Revisar y programar mantencion',
    ],
    [
      'VEH-027',
      'Nissan Terrano',
      'Nissan',
      'Terrano',
      'https://www.nissan-global.com/EN/PRODUCTS/',
      'official',
      '2026-07',
      'si',
      '{"application":"traslado y soporte","type":"pickup suv 4x4"}',
      'ENG-001',
      'Motor',
      '1',
      'alta',
      'activo',
      'ENG-001-01',
      'Perdida de potencia',
      'media',
      'Aceleracion lenta o respuesta irregular',
      'Diagnosticar circuito de combustible y admision',
      'Menor disponibilidad del vehiculo',
      'Revisar y programar mantencion',
    ],
    [
      'MCH-028',
      'Volvo L120F',
      'Volvo',
      'L120F',
      'https://www.volvoce.com/global/en/products/wheel-loaders/l120f/',
      'official',
      '2026-07',
      'si',
      '{"application":"carguio y movimiento","type":"wheel loader"}',
      'HYD-001',
      'Sistema hidraulico',
      '1',
      'alta',
      'activo',
      'HYD-001-01',
      'Baja presion hidraulica',
      'media',
      'Brazo lento o respuesta irregular',
      'Revisar circuito hidraulico y bomba',
      'Menor productividad y ciclos mas largos',
      'Inspeccionar y calibrar',
    ],
  ];

  return [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
}

export function TechnicalSheetImportComponent() {
  const [dragActive, setDragActive] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'plantilla-fichas-tecnicas.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const uploadFile = async (file: File) => {
    const valid =
      file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.xls') || file.name.toLowerCase().endsWith('.xlsx');
    if (!valid) {
      setResult({ success: false, message: 'Solo aceptamos CSV, XLS o XLSX', error: 'Formato no valido' });
      return;
    }

    setIsImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/maintenance/technical-sheets/import', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'No se pudieron importar las fichas tecnicas');
      }

      setResult({
        success: true,
        message: payload?.message || 'Importacion completada',
        imported_sheets: payload?.imported_sheets || 0,
        updated_sheets: payload?.updated_sheets || 0,
        imported_components: payload?.imported_components || 0,
        updated_components: payload?.updated_components || 0,
        imported_fault_modes: payload?.imported_fault_modes || 0,
        updated_fault_modes: payload?.updated_fault_modes || 0,
        skipped_assets: payload?.skipped_assets || 0,
        total: payload?.total || 0,
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : 'No se pudieron importar las fichas tecnicas',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Importar fichas tecnicas</h1>
          <p className="mt-2 text-muted-foreground">
            Carga fichas, componentes y fallas por activo desde CSV, XLS o XLSX con un flujo seguro y trazable.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/dashboard/mantenimiento/fichas-tecnicas">
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/70 bg-card/80 md:col-span-2">
          <CardHeader>
            <CardTitle>Cargar archivo</CardTitle>
            <CardDescription>Usa la plantilla para subir fichas tecnicas y sus componentes/fallas asociados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                dragActive ? 'border-primary bg-primary/5' : 'border-border bg-background/50'
              }`}
            >
              <Upload className="mx-auto mb-3 h-10 w-10 text-primary" />
              <p className="font-medium">Arrastra tu archivo aqui o usa el selector</p>
            <p className="mt-1 text-sm text-muted-foreground">Acepta CSV, XLS y XLSX.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              La plantilla ya incluye modelos con ficha tecnica de referencia para ayudar a empezar con data real.
            </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                  <Download className="h-4 w-4" />
                  Plantilla
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Seleccionar archivo
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFile(file);
                }}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={downloadTemplate} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Descargar plantilla
              </Button>
              {isImporting ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando...
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Formato esperado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Identifica el activo por `ASSET_CODE` o `ASSET_NAME` dentro de `maintenance_assets`.</p>
            <p>Incluye `RAW_SPECS` como JSON valido para guardar la ficha tecnica base.</p>
            <p>Los componentes se actualizan por `COMPONENT_CODE` y las fallas por `FAULT_CODE`.</p>
          </CardContent>
        </Card>
      </div>

      {result ? (
        <Alert variant={result.success ? 'default' : 'destructive'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p>{result.message}</p>
              {result.success ? (
                <div className="text-sm">
                  <p>Fichas importadas: {result.imported_sheets || 0}</p>
                  <p>Fichas actualizadas: {result.updated_sheets || 0}</p>
                  <p>Componentes importados: {result.imported_components || 0}</p>
                  <p>Componentes actualizados: {result.updated_components || 0}</p>
                  <p>Fallas importadas: {result.imported_fault_modes || 0}</p>
                  <p>Fallas actualizadas: {result.updated_fault_modes || 0}</p>
                  <p>Activos omitidos: {result.skipped_assets || 0}</p>
                  <p>Total filas: {result.total || 0}</p>
                </div>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
