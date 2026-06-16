export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import {
  detectRiskPatterns,
  generateRecommendations,
  analyzeTrends,
  predictClosureDate,
} from '@/lib/predictive-analytics';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Fetch all NCs
    const { data: ncs, error } = await supabase
      .from('sostenibilidad_no_conformidades')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Generate insights
    const patterns = detectRiskPatterns(ncs || []);
    const recommendations = generateRecommendations(ncs || []);
    const trends = analyzeTrends(ncs || [], days);
    
    // Get predictions for open NCs
    const openNCs = (ncs || []).filter((nc: any) => nc.estado !== 'cerrada');
    const predictions = openNCs.slice(0, 10).map((nc: any) => 
      predictClosureDate(nc, ncs || [])
    );

    return NextResponse.json({
      success: true,
      data: {
        patterns,
        recommendations,
        trends,
        predictions,
        summary: {
          totalNCs: ncs.length || 0,
          openNCs: openNCs.length,
          riskPatternsCount: patterns.length,
          actionItemsCount: recommendations.length,
          averagePredictedDays: predictions.length > 0
            ? Math.round(predictions.reduce((a: any, b: any) => a + b.estimatedDays, 0) / predictions.length)
            : 0,
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
