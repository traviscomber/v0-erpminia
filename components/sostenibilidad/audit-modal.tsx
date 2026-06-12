'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export default function AuditModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [responses, setResponses] = useState<Record<string, string>>({});

  const questions = [
    { id: '1', number: '4.1', question: 'Leadership commitment to OH&S?' },
    { id: '2', number: '4.2', question: 'Documented policies in place?' },
    { id: '3', number: '4.3', question: 'Hazard identification process?' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sesion de auditoria ISO 45001</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {questions.map((q) => (
            <Card key={q.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{q.number} - {q.question}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {['Cumple', 'No cumple', 'Parcial', 'No aplica'].map((option) => (
                    <div key={option} className="flex items-center gap-2">
                      <Checkbox
                        id={`${q.id}-${option}`}
                        checked={responses[q.id] === option}
                        onCheckedChange={() => setResponses({ ...responses, [q.id]: option })}
                      />
                      <Label htmlFor={`${q.id}-${option}`} className="text-sm cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
                <Textarea placeholder="Observaciones..." className="text-sm" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Completar auditoria
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
