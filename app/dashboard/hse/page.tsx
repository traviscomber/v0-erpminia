import { IncidentsDashboard } from '@/components/hse/incidents-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'HSE Dashboard - Compliance & Safety',
  description: 'View incidents, investigations, and compliance status',
};

export default function HSEPage() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">HSE Dashboard</h1>
        <p className="text-muted-foreground">Safety incidents, investigations, and compliance tracking</p>
      </div>

      <IncidentsDashboard />

      <Card>
        <CardHeader>
          <CardTitle>Compliance Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">HSE Training Current</span>
              <span className="text-sm font-semibold">95%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '95%' }}></div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Incident Response Time (avg)</span>
              <span className="text-sm font-semibold">{'2.3 hours'}</span>
            </div>
            <div className="text-xs text-muted-foreground">{'Target: <2 hours'}</div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">RCA Completion Rate</span>
              <span className="text-sm font-semibold">100%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
