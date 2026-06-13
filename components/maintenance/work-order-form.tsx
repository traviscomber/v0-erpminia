'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface WorkOrderFormProps {
  assetId: string;
  onSuccess: () => void;
}

export function WorkOrderForm({ assetId, onSuccess }: WorkOrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    workType: 'corrective',
    priority: 'medium',
    plannedDurationHours: 1,
    scheduledDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error('Title is required');
      return;
    }
    setLoading(true);

    try {
      const res = await fetch('/api/maintenance/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          workType: formData.workType,
          priority: formData.priority,
          plannedDurationHours: parseFloat(formData.plannedDurationHours.toString()),
          scheduledDate: formData.scheduledDate,
          assetId,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create work order');
      }

      const { data } = await res.json();
      toast.success(`Work order ${data.work_order_number} created successfully`);
      onSuccess();
      setFormData({ title: '', description: '', workType: 'corrective', priority: 'medium', plannedDurationHours: 1, scheduledDate: '' });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error creating work order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Work Order</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 border rounded"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="workType">Work Type</Label>
              <Select value={formData.workType} onValueChange={(v) => setFormData({ ...formData, workType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrective">Corrective</SelectItem>
                  <SelectItem value="preventive">Preventive</SelectItem>
                  <SelectItem value="predictive">Predictive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="plannedDuration">Planned Duration (hours)</Label>
              <Input
                id="plannedDuration"
                type="number"
                step="0.5"
                value={formData.plannedDurationHours}
                onChange={(e) => setFormData({ ...formData, plannedDurationHours: parseFloat(e.target.value) })}
                required
              />
            </div>

            <div>
              <Label htmlFor="scheduledDate">Scheduled Date</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Work Order'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
