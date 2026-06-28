'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import useSWR from 'swr';
import { NonconformanceForm } from './nonconformance-form';
import { NonconformanceTable } from './nonconformance-table';

interface NCPageProps {
  organizationId: string;
}

export function NoncConformancePage({ organizationId }: NCPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const { data: stats } = useSWR(
    `/api/sostenibilidad/nonconformances/stats?orgId=${encodeURIComponent(organizationId)}`,
    async (url) => {
      const res = await fetch(url);
      return res.json().then((r) => r.data);
    }
  );

  const { data: ncs } = useSWR(
    `/api/sostenibilidad/nonconformances?orgId=${encodeURIComponent(organizationId)}${filterStatus && filterStatus !== 'overdue' ? `&status=${encodeURIComponent(filterStatus)}` : ''}`,
    async (url) => {
      const res = await fetch(url);
      return res.json();
    }
  );

  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };

  const nonconformances = Array.isArray(ncs?.nonconformances) ? ncs.nonconformances : [];
  const overdueItems = nonconformances.filter((nc: any) => {
    if (!nc?.target_closure_date) return false;
    if (nc.status === 'closed') return false;
    return new Date(nc.target_closure_date) < new Date();
  });

  const visibleRows =
    filterStatus === 'overdue'
      ? overdueItems
      : nonconformances;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">No conformidades</h1>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva NC
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.open || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats?.overdue || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">En Progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.inProgress || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Cumplimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats?.complianceScore || 0}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'open', 'closed', 'overdue'].map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? 'default' : 'outline'}
            onClick={() => setFilterStatus(status)}
            size="sm"
          >
            {status || 'Todas'}
          </Button>
        ))}
      </div>

      {/* Table */}
      <NonconformanceTable data={visibleRows} severityColors={severityColors} />

      {/* Form Modal */}
      {showForm && (
        <NonconformanceForm
          orgId={organizationId}
          onClose={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
