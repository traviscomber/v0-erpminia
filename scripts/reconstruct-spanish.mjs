import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const R = '\uFFFD'; // replacement char

// ── 1. List of CORRECT Spanish words/roots seen in the catalog ──
// We auto-generate their corrupted form (accent -> U+FFFD) and map back.
const CORRECT_WORDS = [
  // category roots (with digit suffixes handled via substring replace)
  'Eléctrico', 'Eléctrica', 'Ferretería', 'Neumático', 'Neumática', 'Perforación',
  'Fortificación', 'Electrónico', 'Electromagnético',
  // A
  'Abrasión', 'Acuñador', 'Acuñadores', 'Acético', 'Admisión', 'Aguarrás', 'Aislación',
  'Alemán', 'Alternador', 'Amperímetro', 'Analógica', 'Antiestática', 'Análogo', 'Análogos',
  'Apriete', 'Arandela', 'Arnés', 'Aserrín', 'Atún', 'Automática', 'Automático', 'Azúcar', 'Año',
  'aceleración', 'acrílico', 'acuñador', 'acuñadores', 'admisión', 'aguilón', 'aislación',
  'alimentación', 'alternador', 'amortiguador', 'araña', 'articulación', 'así', 'año',
  // B
  'Bastón', 'Baterías', 'Baño', 'Bidón', 'Botón', 'Bruñido', 'Bujía', 'Bujías', 'Básico',
  'botón', 'básico',
  // C
  'CICLÓN', 'CIGÜEÑAL', 'Café', 'Caimán', 'Calibración', 'Camión', 'Carbón', 'Cardán',
  'Cargador', 'Cáñamo', 'Cañería', 'Cañeria', 'Centrífuga', 'Cerámico', 'Chasís',
  'Ciclón', 'Cigüeñal', 'Cigueñal', 'Cinturón', 'Citófono', 'Clásica', 'Collarín',
  'Combustible', 'Concéntrico', 'Conexión', 'Cordón', 'Cuadrícula', 'Cuscús', 'Cuña',
  'Cámara', 'Cáncamo', 'Cónico', 'Cónicos', 'Cátodo', 'Cáustica', 'Código', 'Cotización',
  'cámara', 'cañería', 'cerámico', 'cierre', 'cigüeñal', 'cilíndrica', 'cilíndrico',
  'combinación', 'combustible', 'compresión', 'conexión', 'culatón', 'cuña', 'cuñas',
  'cónico', 'cónicos', 'cotización', 'cañonera', 'conducción',
  // D
  'Dirección', 'Distribución', 'Diálisis', 'Diámetro', 'Diésel', 'Domésticas',
  'delantero', 'depósito', 'detención', 'dieléctrica', 'diferencial', 'dirección',
  'distribución', 'diámetro', 'durocotón', 'dígitos',
  // E
  'Económia', 'Economía', 'Epóxica', 'Escobillón', 'Eslabón', 'Estaño', 'Excéntrica',
  'eléctrico', 'escalón', 'estándar', 'excéntrica',
  // F
  'Fabricación', 'Fijación', 'Flujómetro', 'Fotoeléctricas', 'Fotón', 'Fría', 'Férrula',
  'fabricación', 'fijación', 'fotoeléctrica', 'frenos', 'férrula',
  // G
  'Galón', 'Geólogo', 'Glicerina', 'Grúa', 'Guía', 'guía',
  // H
  'HIDRÁULICO', 'Halógeno', 'Hidráulica', 'Hidráulico', 'Hidraulico', 'Higiénico',
  'Homocinética', 'Horómetro', 'halógeno', 'hidráulica', 'hidráulico', 'hidráulicas',
  'hidraúlica', 'hidraúlico',
  // I
  'Imán', 'Inalámbrica', 'Inclinómetro', 'Inyección', 'ignición', 'iluminación',
  'inalámbrica', 'inalámbrico', 'intercooler', 'inyección', 'inyector', 'ionización',
  'izquierdo',
  // J
  'Jabón',
  // L
  'LÍQUIDO', 'Lámina', 'Lámpara', 'Lápiz', 'Líquido', 'lubricación', 'línea', 'líneas', 'líquido',
  // M
  'Machón', 'Magnética', 'Mandíbula', 'Manómetro', 'Mecánico', 'Mecánicos', 'Metálicas',
  'Metálico', 'Metálica', 'Milímetros', 'Muñón', 'Muñon', 'Módulo', 'Máquina', 'Metálico',
  'machón', 'mandíbula', 'mecánico', 'medida', 'metálica', 'metálico', 'milimétricas',
  'milimétrico', 'mosquetón', 'motor', 'mágica', 'médium', 'múltiple', 'móvil', 'marsón',
  // N
  'NEUMÁTICOS', 'Nescafé', 'Nitrógeno', 'Níquel', 'neumático', 'níquel', 'número',
  // O
  'Oxígeno', 'óptico', 'oxígeno',
  // P
  'Pantalón', 'Partículas', 'Pasador', 'Paté', 'Paño', 'Pañuelos', 'Perclórico',
  'Petróleo', 'Pistón', 'Piñón', 'Plastrón', 'Plástica', 'Plástico', 'Polín', 'Posición',
  'Positrón', 'Presión', 'Protección', 'Puño', 'Púas', 'Pólen',
  'pantógrafo', 'parámetros', 'pañetes', 'peldaños', 'pequeña', 'percusión', 'pistón',
  'piñón', 'plástica', 'plásticas', 'plástico', 'plásticos', 'poliéster', 'portalámpara',
  'portátil', 'posicionamiento', 'posición', 'presión', 'protección', 'puño',
  // Q
  'Química', 'Químico', 'químico',
  // R
  'RELÉ', 'REPARACIÓN', 'Receptáculo', 'Reducción', 'Relé', 'Reparación', 'Retención',
  'Retén', 'Rodamiento', 'Rodón', 'Rueda', 'Rígido', 'Rápido', 'Rótula',
  'radiador', 'reducción', 'relé', 'reparación', 'retención', 'retén', 'rotación', 'rueda',
  'rígido', 'rótula',
  // S
  'Sección', 'Según', 'Semáforo', 'Simétrico', 'Sintético', 'Subestación', 'Succión',
  'Sujeción', 'Sulfúrico', 'Sólida', 'según', 'selección', 'semicónica', 'sintético',
  'succión', 'sujeción',
  // T
  'TRACCIÓN', 'TRANSMISIÓN', 'TÓRICA', 'Tapón', 'Teflón', 'Telescópico', 'Tensión',
  'Termomagnético', 'Termómetro', 'Tóner', 'Tórica', 'Térmica', 'Térmico', 'Tracción',
  'Transmisión', 'Trifásico', 'Tubería', 'telescópica', 'telescópico', 'teléfono',
  'transmisión', 'trasero', 'traslación', 'trifásico', 'tráfico', 'tubería', 'tuberías',
  'turbo', 'tórica', 'tóricas', 'térmico',
  // U
  'Unión', 'Uñetas', 'unión',
  // V
  'Válvula', 'Válvulas', 'Vértex', 'ventilación', 'vías', 'válvula', 'válvulas',
  // accent-initial (capitalized first so they win when ambiguous with U+FFFD)
  'Ángulo', 'Índice', 'Ápex', 'Óptico', 'Útil', 'Émbolo',
  'índice', 'ángulo', 'ápex', 'óptico', 'útil', 'émbolo',
  // misc proper-ish
  'Petróleo', 'Máquina', 'Módulo',
];

// Build corrupted->correct map (longest corrupted first)
function corrupt(word) {
  return word.replace(/[áéíóúñüÁÉÍÓÚÑÜ]/g, R);
}
const pairs = [];
for (const w of CORRECT_WORDS) {
  const c = corrupt(w);
  if (c.includes(R)) pairs.push([c, w]);
}
// dedupe by corrupted key, keep first; sort by length desc
const seen = new Map();
for (const [c, w] of pairs) {
  if (!seen.has(c)) seen.set(c, w);
}
const sortedPairs = [...seen.entries()].sort((a, b) => b[0].length - a[0].length);

function fixText(input) {
  if (!input) return input;
  let s = input;

  // 1. Dictionary substring replacement (longest first)
  for (const [c, w] of sortedPairs) {
    if (s.includes(c)) s = s.split(c).join(w);
  }

  // 2. Symbol rules for digit + replacement char
  // O-ring variants (O�ring, O�Ring, O�RING)
  s = s.replace(new RegExp('O' + R + '(?=[Rr]ing|RING)', 'g'), 'O-');
  // número abbreviation: N� / n� / (n�
  s = s.replace(new RegExp('N' + R, 'g'), 'N°');
  s = s.replace(new RegExp('n' + R, 'g'), 'n°');
  // fractions and dimensions -> inch (")
  s = s.replace(new RegExp('(\\d+/\\d+)' + R, 'g'), '$1"');
  s = s.replace(new RegExp('(\\dx\\d)' + R, 'g'), '$1"');
  // common angle values -> degree (°)
  s = s.replace(new RegExp('\\b(45|90|180|360|30|60|120|135|270)' + R, 'g'), '$1°');
  // °F
  s = s.replace(new RegExp(R + 'F\\b', 'g'), '°F');
  // any remaining digit + replacement -> inch
  s = s.replace(new RegExp('(\\d)' + R, 'g'), '$1"');

  // 3. Replacement char acting as separator between word chars -> space
  s = s.replace(new RegExp('([A-Za-z0-9])' + R + '([A-Za-z0-9])', 'g'), '$1 $2');

  // 4. Any leftover replacement chars -> remove
  s = s.split(R).join('');

  // collapse double spaces
  s = s.replace(/\s{2,}/g, ' ').trim();
  return s;
}

// ── Supabase ──
const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/['"]/g, '');
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/['"]/g, '');

let supabase = null;
function getClient() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan credenciales SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!supabase) {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return supabase;
}

function parseCsv(file) {
  const buf = fs.readFileSync(file);
  let content = buf.toString('utf-8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  return content.split(/\r?\n/).filter((l) => l.trim());
}

async function run() {
  console.log('═══ RECONSTRUCCIÓN ESPAÑOL — BODEGA ═══\n');
  console.log(`Reglas de diccionario: ${sortedPairs.length}\n`);

  const lines = parseCsv(path.join(__dirname, 'bodega-fixed.csv'));
  const header = lines[0];
  console.log('Header fixed:', fixText(header));

  const records = [];
  let stillCorrupt = 0;
  const sampleCorrupt = [];

  for (const line of lines.slice(1)) {
    const v = line.split(';');
    const sku = fixText(v[0]);
    const familia = fixText(v[1]);
    const subfamilia = fixText(v[2]);
    const equipo = fixText(v[3]);
    const producto = fixText(v[4]);
    if (!sku || !producto) continue;

    if (producto.includes(R) || familia.includes(R)) {
      stillCorrupt++;
      if (sampleCorrupt.length < 20) sampleCorrupt.push(producto);
    }

    records.push({
      sku,
      name: producto,
      category: familia,
      description: [subfamilia, equipo].filter(Boolean).join(' - ') || producto,
    });
  }

  console.log(`\nTotal: ${records.length}`);
  console.log('Primeros 8 productos reconstruidos:');
  records.slice(0, 8).forEach((r, i) => console.log(`  ${i + 1}. ${r.sku} | ${r.name}`));
  console.log(`\nRegistros con caracteres aún corruptos: ${stillCorrupt}`);
  if (sampleCorrupt.length) {
    console.log('Ejemplos restantes:');
    sampleCorrupt.forEach((s) => console.log('   -', s));
  }

  if (process.argv.includes('--apply')) {
    console.log('\n📤 Actualizando Supabase (update por sku)...');
    const batchSize = 200;
    let done = 0;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await getClient()
        .from('bodega_inventory')
        .upsert(batch, { onConflict: 'sku', ignoreDuplicates: false });
      if (error) {
        console.log(`  ❌ Batch ${i / batchSize + 1}: ${error.message}`);
      } else {
        done += batch.length;
      }
      await new Promise((r) => setTimeout(r, 80));
    }
    console.log(`✅ Actualizados: ${done}/${records.length}`);
  } else {
    console.log('\n(dry-run) Ejecuta con --apply para guardar en Supabase.');
  }
}

if (process.argv.includes('--test')) {
  const tests = [
    'Curva Fierro 90' + R + " 4'",
    'Codo Met' + R + "lico de 8' en 90" + R,
    'V' + R + 'lvula de retenci' + R + "n 4' con canastillo",
    'N' + R + '7 Glyde ring Assembly',
    'N' + R + '22 Oring 560',
    '5580 Card' + R + 'n trans',
    'motor hidr' + R + 'ulico',
    'Cig' + R + 'e' + R + 'al',
    'Chas' + R + 's',
    'Neum' + R + 'tico',
    'O' + R + 'ring',
    'Tap' + R + 'n hidr' + R + 'ulico 3/4' + R,
    'Reducci' + R + 'n exc' + R + 'ntrica',
  ];
  for (const t of tests) console.log(t, '  ->  ', fixText(t));
} else {
  run();
}

export { fixText };
