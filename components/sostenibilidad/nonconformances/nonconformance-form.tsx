'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface NonconformanceFormProps {
  onSubmit?: (data: any) => void;
  initialData?: any;
}

export function NonconformanceForm({ onSubmit, initialData }: NonconformanceFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    category: initialData?.category || 'safety',
    severity: initialData?.severity || 'medium',
    source: initialData?.source || 'internal_audit',
    discoveredDate: initialData?.discovered_date || new Date().toISOString().split('T')[0],
    targetClosureDate: initialData?.target_closure_date || '',
    rootCause: initialData?.root_cause || '',
    impactDescription: initialData?.impact_description || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit?.(formData);
      toast.success('Non-conformance saved successfully');
    } catch (error) {
      toast.error('Failed to save non-conformance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>Non-Conformance Report</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              placeholder="e.g., Missing PPE during maintenance"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Description</Label>
            <textarea
              placeholder="Detailed description of the issue"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 border rounded text-sm"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="safety">Safety</option>
                <option value="environmental">Environmental</option>
                <option value="health">Health</option>
                <option value="documentation">Documentation</option>
                <option value="training">Training</option>
              </select>
            </div>

            <div>
              <Label>Severity</Label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Source</Label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="internal_audit">Internal Audit</option>
                <option value="external_audit">External Audit</option>
                <option value="incident">Incident</option>
                <option value="regulatory">Regulatory</option>
                <option value="customer">Customer</option>
              </select>
            </div>

            <div>
              <Label>Discovered Date</Label>
              <Input
                type="date"
                value={formData.discoveredDate}
                onChange={(e) => setFormData({ ...formData, discoveredDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label>Root Cause</Label>
            <textarea
              placeholder="Root cause analysis"
              value={formData.rootCause}
              onChange={(e) => setFormData({ ...formData, rootCause: e.target.value })}
              className="w-full p-2 border rounded text-sm"
              rows={2}
            />
          </div>

          <div>
            <Label>Impact Description</Label>
            <textarea
              placeholder="Potential impact of this non-conformance"
              value={formData.impactDescription}
              onChange={(e) => setFormData({ ...formData, impactDescription: e.target.value })}
              className="w-full p-2 border rounded text-sm"
              rows={2}
            />
          </div>

          <div>
            <Label>Target Closure Date</Label>
            <Input
              type="date"
              value={formData.targetClosureDate}
              onChange={(e) => setFormData({ ...formData, targetClosureDate: e.target.value })}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Saving...' : 'Save Non-Conformance'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
