'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function CorrectiveActionModal({ open, onOpenChange, ncId, onCreate }: any) {
  const [data, setData] = useState({
    actionDescription: '',
    responsiblePerson: '',
    scheduledCompletionDate: '',
    verificationMethod: '',
  });
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sostenibilidad/corrective-actions?ncId=${ncId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        onCreate();
        onOpenChange(false);
        setData({ actionDescription: '', responsiblePerson: '', scheduledCompletionDate: '', verificationMethod: '' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Corrective Action</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Action Description</Label>
            <Textarea
              placeholder="Describe the action to be taken..."
              value={data.actionDescription}
              onChange={(e) => setData({ ...data, actionDescription: e.target.value })}
            />
          </div>
          <div>
            <Label>Responsible Person</Label>
            <Input
              placeholder="Name or ID"
              value={data.responsiblePerson}
              onChange={(e) => setData({ ...data, responsiblePerson: e.target.value })}
            />
          </div>
          <div>
            <Label>Target Completion Date</Label>
            <Input
              type="date"
              value={data.scheduledCompletionDate}
              onChange={(e) => setData({ ...data, scheduledCompletionDate: e.target.value })}
            />
          </div>
          <div>
            <Label>Verification Method</Label>
            <Select value={data.verificationMethod} onValueChange={(val) => setData({ ...data, verificationMethod: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inspection">Inspection</SelectItem>
                <SelectItem value="testing">Testing</SelectItem>
                <SelectItem value="audit">Audit</SelectItem>
                <SelectItem value="review">Document Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Action'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
