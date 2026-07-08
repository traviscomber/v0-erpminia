import { writeFileSync } from 'node:fs'

// Matrix captured from ROLES-INTRANET Excel inspection (sheet ROLES).
// HSEC block: header row + 7 module rows.
const HSEC_HEADER = ['HSEC','PRESIDENTE','GERENTE','SUBGERENTE OP.','JEFE SOSTENIBILIDAD','PREVENCIONISTA','ASISTENTE TÉCNICO','JEFE MINA PEUMO','JEFE MINA DON JAIME','JEFE ING. PLA MINA','JEFE GEÓLOGIA','JEFE GEOLOGÍA EXPLO.','JEFE RRHH','JEFE ADM.','JEFE ING.','JEFE PLANTA','JEFE BODEGA','JEFE MAN. EQ','JEFE MANT EQ. MINA','JEFE SONDAJE','JEFE MINA SAN PEDRO','JEFE MAN. PLANTA','JEFES DE TURNO PLANTA','ADM JAIME','ADM PEUMO','TODOS LOS CARGOS']
const HSEC_ROWS = {
  hse_kpls:            ['KPLS','LEC','LEC','LEC','ED','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','SR','SR','SR','SR','SR','SR','SR','SR','SR','SR','SR','SR'],
  hse_documentacion:   ['DOCUMENTACIÓN HSE','ED','ED','ED','ED','ED','LEC','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','LEC'],
  hse_epp:             ['EPP','LEC','LEC','LEC','ED','ED','SR','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','SR'],
  hse_incidente:       ['INCIDENTE','LEC','LEC','LEC','ED','ED','LEC','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','SR'],
  hse_riesgos:         ['RIESGOS','LEC','LEC','LEC','ED','ED','SR','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC','LEC'],
  hse_investigaciones: ['INVESTIGACIONES','LEC','LEC','LEC','ED','ED','SR','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','SR'],
  hse_capacitaciones:  ['CAPACITACIONES','LEC','LEC','LEC','ED','ED','LEC','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','ED','SR'],
}

// CONTRATOS block: header row + 5 action rows.
const CONT_HEADER = ['CONTRATOS','PRESIDENTE','GERENTE','SUBGERENTE','JEFE SOSTENIBILIDAD','PREVENCIONISTA','ASISTENTE TECNICO','JEFE MINA PEUMO','JEFE MINA DON JAIME','JEFE ADM.','JEFE ING.','','EECC']
const CONT_ROWS = {
  contratos_solicitar_link: ['SOLICITAR LINK','SR','SR','SR','ED','ED','ED','SR','SR','SR','SR','','SR'],
  contratos_subir_info:     ['SUBIR INFORMACIÓN','SR','SR','SR','ED','ED','ED','SR','SR','SR','SR','','ED'],
  contratos_aprobar:        ['APROBAR DOCUMENTACIÓN','SR','SR','SR','ED','ED','ED','SR','SR','SR','SR','','SR'],
  contratos_autorizar:      ['AUTORIZAR EMPRESA','SR','SR','SR','ED','ED','LEC','SR','SR','SR','SR','','SR'],
  contratos_visualizacion:  ['VISUALIZACIÓN DE DOCUMENTOS','LEC','LEC','LEC','ED','ED','ED','LEC','LEC','LEC','LEC','','LEC'],
}

// CONTRATOS name variants -> canonical HSEC names
const ALIASES = { 'SUBGERENTE': 'SUBGERENTE OP.', 'ASISTENTE TECNICO': 'ASISTENTE TÉCNICO' }
const norm = (c) => ALIASES[c.trim()] || c.trim()
const sql = (s) => s.replace(/'/g, "''")
const valid = (v) => ['ED','LEC','SR'].includes(v)

const matrix = {}
const ensure = (c) => { if (!matrix[c]) matrix[c] = {} }

function ingest(header, rowsObj) {
  const cargos = []
  for (let c = 1; c < header.length; c++) {
    const n = String(header[c] || '').trim()
    if (n) cargos.push({ name: norm(n), col: c })
  }
  for (const [modKey, row] of Object.entries(rowsObj)) {
    for (const { name, col } of cargos) {
      const lvl = String(row[col] || '').trim().toUpperCase()
      if (!valid(lvl)) continue
      ensure(name)
      matrix[name][modKey] = lvl
    }
  }
}

ingest(HSEC_HEADER, HSEC_ROWS)
ingest(CONT_HEADER, CONT_ROWS)

const cargoNames = Object.keys(matrix)
console.log('Cargos:', cargoNames.length)
let pairs = 0

let out = '-- Auto-generated from ROLES-INTRANET Excel matrix\n'
// Compact cargos insert
const cargoValues = cargoNames.map((name, i) => `('${sql(name)}', ${i})`).join(', ')
out += `INSERT INTO cargos (name, display_order) VALUES ${cargoValues} ON CONFLICT (name) DO UPDATE SET display_order = EXCLUDED.display_order;\n\n`

// One role_matrix insert per cargo (short readable lines)
for (const cargo of cargoNames) {
  const tuples = Object.entries(matrix[cargo]).map(([modKey, level]) => {
    pairs++
    return `('${sql(cargo)}','${modKey}','${level}')`
  })
  out += `INSERT INTO role_matrix (cargo_id, module_key, access_level) SELECT c.id, v.module_key, v.access_level FROM (VALUES ${tuples.join(',')}) AS v(cargo_name, module_key, access_level) JOIN cargos c ON c.name = v.cargo_name ON CONFLICT (cargo_id, module_key) DO UPDATE SET access_level = EXCLUDED.access_level, updated_at = now();\n`
}

writeFileSync('seed-roles.sql', out)
console.log('Matrix pairs:', pairs, '| Wrote seed-roles.sql')
