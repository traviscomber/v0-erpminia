'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type AuditQuestion = {
  id: string;
  number: string;
  question: string;
};

const questions: AuditQuestion[] = [
  { id: '1', number: '4.1', question: '¿Existe compromiso de liderazgo para seguridad y salud ocupacional?' },
  { id: '2', number: '4.2', question: '¿Existen políticas documentadas y vigentes?' },
  { id: '3', number: '4.3', question: '¿Está definido el proceso de identificación de peligros?' },
];

const options = ['Cumple', 'No cumple', 'Parcial', 'N/A'] as const;

export default function AuditModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [responses, setResponses] = useState<Record<string, string>>({});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sesión de auditoría ISO 45001</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {questions.map((question) => (
            <Card key={question.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {question.number} - {question.question}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  {options.map((option) => (
                    <div key={option} className="flex items-center gap-2">
                      <Checkbox
                        id={`${question.id}-${option}`}
                        checked={responses[question.id] === option}
                        onCheckedChange={() => setResponses({ ...responses, [question.id]: option })}
                      />
                      <Label htmlFor={`${question.id}-${option}`} className="cursor-pointer text-sm">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
                <Textarea placeholder="Comentarios adicionales..." className="text-sm" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onOpenChange(false)}>Cerrar auditoría</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
