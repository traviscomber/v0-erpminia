'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingUp, Brain, Lightbulb } from 'lucide-react';
import { detectRiskPatterns, generateRecommendations, analyzeTrends, predictClosureDate } from '@/lib/predictive-analytics';

interface IntelligenceDashboardProps {
  ncs: any[];
  showRecommendations?: boolean;
  showTrends?: boolean;
}

export function IntelligenceDashboard({
  ncs,
  showRecommendations = true,
  showTrends = true,
}: IntelligenceDashboardProps) {
  const patterns = useMemo(() => detectRiskPatterns(ncs), [ncs]);
  const recommendations = useMemo(() => generateRecommendations(ncs), [ncs]);
  const trends = useMemo(() => analyzeTrends(ncs), [ncs]);
  
  const trendChartData = useMemo(() => {
    return Object.entries(trends.byDay || {}).map(([day, count]) => ({
      day,
      count,
    }));
  }, [trends]);

  const severityData = useMemo(() => {
    return [
      { name: 'Low', value: trends.bySeverity?.low || 0 },
      { name: 'Medium', value: trends.bySeverity?.medium || 0 },
      { name: 'High', value: trends.bySeverity?.high || 0 },
      { name: 'Critical', value: trends.bySeverity?.critical || 0 },
    ];
  }, [trends]);

  return (
    <div className="space-y-6">
      {/* Risk Patterns Alert */}
      {patterns.length > 0 && (
        <Alert className="border-destructive bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription>
            <strong>Risk Patterns Detected:</strong> {patterns.length} pattern(s) identified
          </AlertDescription>
        </Alert>
      )}

      {/* Risk Patterns Cards */}
      {patterns.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {patterns.slice(0, 4).map((pattern, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">{pattern.pattern}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{pattern.frequency}</span>
                  <Badge
                    variant={
                      pattern.severity > 70
                        ? 'destructive'
                        : pattern.severity > 40
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {pattern.severity.toFixed(0)}%
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{pattern.recommendation}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Smart Recommendations
            </CardTitle>
            <CardDescription>AI-powered insights for improving compliance</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Trends */}
      {showTrends && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* NC Trend */}
          <Card>
            <CardHeader>
              <CardTitle>NC Trend (30 days)</CardTitle>
              <CardDescription>{trends.total} non-conformances created</CardDescription>
            </CardHeader>
            <CardContent>
              {trendChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="var(--primary)"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No data for the selected period
                </p>
              )}
            </CardContent>
          </Card>

          {/* Severity Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Severity Distribution</CardTitle>
              <CardDescription>NCs by severity level</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={severityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--primary)" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Metrics Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total NCs (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trends.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Closure Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trends.averageClosureTime} days</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Risk Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{patterns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{recommendations.length}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
