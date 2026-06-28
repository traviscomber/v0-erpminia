'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Question = {
  id: string;
  number: string;
  question: string;
};

const QUESTIONS: Question[] = [
  { id: '1', number: '4.1', question: 'Leadership commitment to OH&S' },
  { id: '2', number: '4.2', question: 'Documented policies in place' },
  { id: '3', number: '4.3', question: 'Hazard identification process' },
];

const OPTIONS = ['Cumple', 'No cumple', 'Parcial', 'No aplica'] as const;

export default function AuditModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const summary = useMemo(() => {
    const values = Object.values(responses);
    const nonCompliant = values.filter((value) => value === 'No cumple').length;
    const compliant = values.filter((value) => value === 'Cumple').length;
    if (nonCompliant > 0) return 'non_compliant';
    if (compliant === QUESTIONS.length) return 'compliant';
    return 'in_progress';
  }, [responses]);

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/sostenibilidad/audit-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          audit_name: 'Auditoria ISO 45001',
          category: 'ISO',
          compliance_status: summary,
          auditor: 'Sistema',
          evidence_count: Object.values(comments).filter(Boolean).length,
          responses,
          comments,
        }),
      });

      if (!response.ok) {
        throw new Error('No se pudo guardar la auditoria');
      }

      onOpenChange(false);
      setResponses({});
      setComments({});
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sesion de auditoria ISO 45001</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {QUESTIONS.map((q) => (
            <Card key={q.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {q.number} - {q.question}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {OPTIONS.map((option) => (
                    <div key={option} className="flex items-center gap-2">
                      <Checkbox
                        id={`${q.id}-${option}`}
                        checked={responses[q.id] === option}
                        onCheckedChange={() => setResponses({ ...responses, [q.id]: option })}
                      />
                      <Label htmlFor={`${q.id}-${option}`} className="cursor-pointer text-sm">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
                <Textarea
                  placeholder="Observaciones..."
                  className="text-sm"
                  value={comments[q.id] || ''}
                  onChange={(e) => setComments({ ...comments, [q.id]: e.target.value })}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Completar auditoria'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
