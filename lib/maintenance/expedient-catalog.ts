import { cat938hN1Batch, cat938hN1BatchSummary } from './cat-938h-n1-batch';
import { cat938hN2Batch, cat938hN2BatchSummary } from './cat-938h-n2-batch';
import { generadorAtlasCopcoQas500Batch, generadorAtlasCopcoQas500Summary } from './generador-atlas-copco-qas-500-batch';
import { positron45_150kvaBatch, positron45_150kvaSummary } from './positron-45-150kva-batch';
import { scoop7AtlasSt1030Batch, scoop7AtlasSt1030Summary } from './scoop-7-atlas-st1030-batch';
import { volkswagenAmarokLvgx54Batch, volkswagenAmarokLvgx54Summary } from './volkswagen-amarok-lvgx54-batch';

export type ExpedientSection =
  | 'ot_historica'
  | 'componentes'
  | 'arbol_fallas'
  | 'ficha_equipo'
  | 'modificaciones'
  | 'pendiente_clasificar';

export type ExpedientRecord = {
  id: string;
  source: string;
  date: string;
  title: string;
  kind: 'pauta' | 'reparacion' | 'observacion';
  canonicalSection: ExpedientSection;
  summary: string;
  cause?: string;
  solution?: string;
  components?: string[];
  extractedData?: Record<string, unknown>;
};

export type ExpedientDefinition = {
  expedientKey: string;
  assetLabel: string;
  location: string;
  title: string;
  description: string;
  records: ExpedientRecord[];
  summary: {
    asset: string;
    location: string;
    records: number;
    categories: {
      ot_historica: number;
      arbol_fallas: number;
      componentes: number;
    };
  };
};

export const EXPEDIENT_CATALOG: ExpedientDefinition[] = [
  {
    expedientKey: 'cat-938h-n1',
    assetLabel: cat938hN1BatchSummary.asset,
    location: cat938hN1BatchSummary.location,
    title: cat938hN1BatchSummary.asset,
    description: 'Lote documental del CAT 938H N°1.',
    records: cat938hN1Batch,
    summary: cat938hN1BatchSummary,
  },
  {
    expedientKey: 'cat-938h-n2',
    assetLabel: cat938hN2BatchSummary.asset,
    location: cat938hN2BatchSummary.location,
    title: cat938hN2BatchSummary.asset,
    description: 'Lote documental del CAT 938H N2.',
    records: cat938hN2Batch,
    summary: cat938hN2BatchSummary,
  },
  {
    expedientKey: 'generador-atlas-copco-qas-500-kva',
    assetLabel: generadorAtlasCopcoQas500Summary.asset,
    location: generadorAtlasCopcoQas500Summary.location,
    title: generadorAtlasCopcoQas500Summary.asset,
    description: 'Lote documental del generador Atlas Copco QAS 500 KVA.',
    records: generadorAtlasCopcoQas500Batch,
    summary: generadorAtlasCopcoQas500Summary,
  },
  {
    expedientKey: 'generador-positron-45-150kva',
    assetLabel: positron45_150kvaSummary.asset,
    location: positron45_150kvaSummary.location,
    title: positron45_150kvaSummary.asset,
    description: 'Lote documental del generador Positron 45 150 KVA.',
    records: positron45_150kvaBatch,
    summary: positron45_150kvaSummary,
  },
  {
    expedientKey: 'scoop-atlas-st1030',
    assetLabel: scoop7AtlasSt1030Summary.asset,
    location: scoop7AtlasSt1030Summary.location,
    title: scoop7AtlasSt1030Summary.asset,
    description: 'Lote documental del Scoop N°7 Atlas ST1030.',
    records: scoop7AtlasSt1030Batch,
    summary: scoop7AtlasSt1030Summary,
  },
  {
    expedientKey: 'volkswagen-amarok-skyb57',
    assetLabel: volkswagenAmarokLvgx54Summary.asset,
    location: volkswagenAmarokLvgx54Summary.location,
    title: volkswagenAmarokLvgx54Summary.asset,
    description: 'Lote documental del Volkswagen Amarok SKYB-57.',
    records: volkswagenAmarokLvgx54Batch,
    summary: volkswagenAmarokLvgx54Summary,
  },
];

export function getExpedientDefinition(expedientKey: string) {
  return EXPEDIENT_CATALOG.find((entry) => entry.expedientKey === expedientKey) || null;
}

function normalizeExpedientText(value: string | null | undefined) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

type ExpedientAssetInput = {
  assetName?: string | null;
  assetCode?: string | null;
  model?: string | null;
  assetType?: string | null;
};

export function resolveExpedientForAsset(input: ExpedientAssetInput) {
  const assetName = normalizeExpedientText(input.assetName);
  const assetCode = normalizeExpedientText(input.assetCode);
  const model = normalizeExpedientText(input.model);
  const assetType = normalizeExpedientText(input.assetType);
  const combined = [assetName, assetCode, model, assetType].filter(Boolean).join(' ');

  if (!combined) return null;

  const isCat938h = combined.includes('938h');
  const isN2 = /\bn\s*2\b|\bno\s*2\b|\bn2\b/.test(combined);
  const isN1 = /\bn\s*1\b|\bno\s*1\b|\bn1\b/.test(combined);

  if (isCat938h && isN2) {
    return 'cat-938h-n2';
  }

  if (isCat938h && isN1) {
    return 'cat-938h-n1';
  }

  if (combined.includes('atlas copco') && combined.includes('qas 500')) {
    return 'generador-atlas-copco-qas-500-kva';
  }

  if (combined.includes('scoop') && combined.includes('st1030')) {
    return 'scoop-atlas-st1030';
  }

  if (combined.includes('amarok')) {
    return 'volkswagen-amarok-skyb57';
  }

  return null;
}
