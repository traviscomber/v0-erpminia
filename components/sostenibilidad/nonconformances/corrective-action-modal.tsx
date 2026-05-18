'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface CorrectiveActionModalProps {
  ncNumber: string;
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  initialData?: any;
}

export function CorrectiveActionModal({ ncNumber, onSubmit, onCancel, initialData }: CorrectiveActionModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    actionDescription: initialData?.action_description || '',
    responsiblePerson: initialData?.responsible_person || '',
    scheduledCompletionDate: initialData?.scheduled_completion_date || '',
    verificationMethod: initialData?.verification_method || 'inspection',
    estimatedCost: initialData?.estimated_cost || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit?.(formData);
      toast.success('Corrective action created');
    } catch (error) {
      toast.error('Failed to create corrective action');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Create Corrective Action</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">NC: {ncNumber}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Action Description</Label>
              <textarea
                placeholder="What action will be taken to correct this?"
                value={formData.actionDescription}
                onChange={(e) => setFormData({ ...formData, actionDescription: e.target.value })}
                className="w-full p-2 border rounded text-sm"
                rows={3}
                required
              />
            </div>

            <div>
              <Label>Responsible Person</Label>
              <Input
                placeholder="Name or email"
                value={formData.responsiblePerson}
                onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Scheduled Completion Date</Label>
                <Input
                  type="date"
                  value={formData.scheduledCompletionDate}
                  onChange={(e) => setFormData({ ...formData, scheduledCompletionDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Verification Method</Label>
                <select
                  value={formData.verificationMethod}
                  onChange={(e) => setFormData({ ...formData, verificationMethod: e.target.value })}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="inspection">Inspection</option>
                  <option value="measurement">Measurement</option>
                  <option value="audit">Audit</option>
                  <option value="documentation">Documentation</option>
                </select>
              </div>
            </div>

            <div>
              <Label>Estimated Cost</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.estimatedCost}
                onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Creating...' : 'Create Action'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
