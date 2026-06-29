export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import {
  detectRiskPatterns,
  generateRecommendations,
  analyzeTrends,
  predictClosureDate,
} from '@/lib/predictive-analytics';
import { normalizeNcStatus } from '@/lib/api/sostenibilidad-mvp';

type RawNcRow = {
  id: string;
  created_at: string | null;
  closed_at?: string | null;
  severity?: string | null;
  category?: string | null;
  area?: string | null;
  status?: string | null;
  estado?: string | null;
};

type PredictiveNcRow = {
  id: string;
  created_at: string;
  closed_at?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  area: string;
  status: string;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const days = Number.parseInt(searchParams.get('days') || '30', 10);
    const lookbackDays = Number.isFinite(days) && days > 0 ? days : 30;

    const { data: ncs, error } = await supabase
      .from('sostenibilidad_no_conformidades')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rawNcs = Array.isArray(ncs) ? (ncs as RawNcRow[]) : [];
    const normalizedNCs = rawNcs.map((nc): PredictiveNcRow => ({
      id: nc.id,
      created_at: nc.created_at || new Date().toISOString(),
      closed_at: nc.closed_at || undefined,
      severity: normalizeSeverity(nc.severity),
      category: String(nc.category || 'sin_categoria').trim(),
      area: String(nc.area || 'sin_area').trim(),
      status: normalizeNcStatus(nc.status ?? nc.estado),
    }));

    const patterns = detectRiskPatterns(normalizedNCs);
    const recommendations = generateRecommendations(normalizedNCs);
    const trends = analyzeTrends(normalizedNCs, lookbackDays);

    const openNCs = normalizedNCs.filter((nc) => nc.status !== 'closed');
    const predictions = openNCs.slice(0, 10).map((nc) => predictClosureDate(nc, normalizedNCs));
    const averagePredictedDays = predictions.length > 0
      ? Math.round(predictions.reduce((sum, prediction) => sum + prediction.estimatedDays, 0) / predictions.length)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        patterns,
        recommendations,
        trends,
        predictions,
        summary: {
          totalNCs: rawNcs.length,
          openNCs: openNCs.length,
          riskPatternsCount: patterns.length,
          actionItemsCount: recommendations.length,
          averagePredictedDays,
        },
      },
    });
  } catch (error) {
    console.error('[v0] Intelligence API error:', error);
    return NextResponse.json(
      { error: 'No se pudieron generar las alertas' },
      { status: 500 }
    );
  }
}

function normalizeSeverity(value: string | null | undefined): 'low' | 'medium' | 'high' | 'critical' {
  const normalized = String(value || 'low').trim().toLowerCase();
  if (normalized === 'critical' || normalized === 'critica') return 'critical';
  if (normalized === 'high' || normalized === 'alta') return 'high';
  if (normalized === 'medium' || normalized === 'media') return 'medium';
  return 'low';
}
