// Predictive Analytics Engine
// Analyzes historical data to predict NC/CA closure times and identify risk patterns

import { format, subDays, parseISO } from 'date-fns';

interface NCData {
  id: string;
  created_at: string;
  closed_at?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  area: string;
  status: string;
}

interface CAPrediction {
  ncId: string;
  predictedClosureDate: Date;
  confidence: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  estimatedDays: number;
  similarCases: number;
}

interface RiskIndicator {
  pattern: string;
  severity: number; // 0-100
  frequency: number;
  recommendation: string;
}

// Calculate average closure time by severity
export function calculateAverageClosureTime(ncs: NCData[]): Record<string, number> {
  const grouped: Record<string, number[]> = {};

  ncs.forEach((nc) => {
    if (!nc.closed_at) return;

    const severity = nc.severity;
    if (!grouped[severity]) grouped[severity] = [];

    const created = parseISO(nc.created_at);
    const closed = parseISO(nc.closed_at);
    const days = Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    grouped[severity].push(days);
  });

  const result: Record<string, number> = {};
  Object.entries(grouped).forEach(([severity, days]) => {
    result[severity] = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
  });

  return result;
}

// Predict NC/CA closure date
export function predictClosureDate(
  nc: NCData,
  historicalData: NCData[]
): CAPrediction {
  const averageTimes = calculateAverageClosureTime(historicalData);
  const estimatedDays = averageTimes[nc.severity] || 14;

  const predictedDate = new Date(parseISO(nc.created_at));
  predictedDate.setDate(predictedDate.getDate() + estimatedDays);

  // Find similar cases for confidence calculation
  const similarCases = historicalData.filter(
    (h) => h.severity === nc.severity && h.category === nc.category && h.closed_at
  ).length;

  const confidence = Math.min(100, 50 + (similarCases * 5)); // Base 50% + 5% per similar case

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (nc.severity === 'critical' || nc.severity === 'high') riskLevel = 'high';
  else if (nc.severity === 'medium') riskLevel = 'medium';

  return {
    ncId: nc.id,
    predictedClosureDate: predictedDate,
    confidence,
    riskLevel,
    estimatedDays,
    similarCases,
  };
}

// Detect anomalies and risk patterns
export function detectRiskPatterns(ncs: NCData[]): RiskIndicator[] {
  const patterns: RiskIndicator[] = [];

  // Pattern 1: High severity NCs taking too long
  const averageTimes = calculateAverageClosureTime(ncs);
  const highSeverityAvg = averageTimes['critical'] || averageTimes['high'] || 20;

  const overdueCritical = ncs.filter((nc) => {
    if (nc.severity !== 'critical' || nc.closed_at) return false;
    const days = Math.ceil((Date.now() - parseISO(nc.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return days > highSeverityAvg * 1.5;
  }).length;

  if (overdueCritical > 0) {
    patterns.push({
      pattern: 'Critical NCs Overdue',
      severity: Math.min(100, overdueCritical * 20),
      frequency: overdueCritical,
      recommendation: `${overdueCritical} critical NCs are overdue. Escalate to management immediately.`,
    });
  }

  // Pattern 2: Category with high recurrence
  const categoryCount: Record<string, number> = {};
  ncs.forEach((nc) => {
    categoryCount[nc.category] = (categoryCount[nc.category] || 0) + 1;
  });

  Object.entries(categoryCount).forEach(([category, count]) => {
    if (count > ncs.length * 0.15) { // More than 15% of all NCs
      patterns.push({
        pattern: `High Recurrence: ${category}`,
        severity: Math.min(100, (count / ncs.length) * 100),
        frequency: count,
        recommendation: `${category} is recurring frequently. Consider root cause analysis and preventive measures.`,
      });
    }
  });

  // Pattern 3: Area with compliance issues
  const areaCount: Record<string, number> = {};
  ncs.forEach((nc) => {
    areaCount[nc.area] = (areaCount[nc.area] || 0) + 1;
  });

  Object.entries(areaCount).forEach(([area, count]) => {
    if (count > ncs.length * 0.2) { // More than 20% from one area
      patterns.push({
        pattern: `Area Focus Required: ${area}`,
        severity: Math.min(100, (count / ncs.length) * 80),
        frequency: count,
        recommendation: `${area} has many NCs. Schedule audit and training for this area.`,
      });
    }
  });

  return patterns.sort((a, b) => b.severity - a.severity);
}

// Smart recommendations
export function generateRecommendations(ncs: NCData[]): string[] {
  const recommendations: string[] = [];
  const openNCs = ncs.filter((nc) => nc.status !== 'closed');
  const closedNCs = ncs.filter((nc) => nc.status === 'closed');

  const closeRate = closedNCs.length / (closedNCs.length + openNCs.length);

  if (closeRate < 0.7) {
    recommendations.push('Increase resources for NC closure. Current closure rate is below 70%.');
  }

  if (openNCs.length > 20) {
    recommendations.push('Consider prioritization framework. You have more than 20 open NCs.');
  }

  const riskPatterns = detectRiskPatterns(ncs);
  riskPatterns.forEach((pattern) => {
    if (pattern.severity > 70) {
      recommendations.push(pattern.recommendation);
    }
  });

  return recommendations;
}

// Trend analysis
export function analyzeTrends(ncs: NCData[], days: number = 30) {
  const cutoffDate = subDays(new Date(), days);
  const recentNCs = ncs.filter((nc) => parseISO(nc.created_at) > cutoffDate);

  const trend = {
    total: recentNCs.length,
    byDay: {} as Record<string, number>,
    bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
    byCategory: {} as Record<string, number>,
    averageClosureTime: 0,
  };

  recentNCs.forEach((nc) => {
    const day = format(parseISO(nc.created_at), 'yyyy-MM-dd');
    trend.byDay[day] = (trend.byDay[day] || 0) + 1;
    trend.bySeverity[nc.severity]++;

    trend.byCategory[nc.category] = (trend.byCategory[nc.category] || 0) + 1;

    if (nc.closed_at) {
      const days = Math.ceil((parseISO(nc.closed_at).getTime() - parseISO(nc.created_at).getTime()) / (1000 * 60 * 60 * 24));
      trend.averageClosureTime = Math.max(trend.averageClosureTime, days);
    }
  });

  return trend;
}
