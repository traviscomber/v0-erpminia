'use client';

import { Check, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface MobileCompletionBadgeProps {
  onComplete: (notes?: string) => void;
  loading?: boolean;
  isValid?: boolean;
  nextOrderAvailable?: boolean;
  nextOrderNumber?: string;
}

export function MobileCompletionBadge({
  onComplete,
  loading,
  isValid = false,
  nextOrderAvailable = false,
  nextOrderNumber,
}: MobileCompletionBadgeProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');

  const handleComplete = () => {
    onComplete(notes || undefined);
    setNotes('');
    setShowNotes(false);
  };

  return (
    <Card className="w-full border-emerald-200 bg-emerald-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-600" />
          Paso 3: Completar OT
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Optional Notes */}
        {showNotes ? (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Notas (opcional):</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Algún detalle importante..."
              className="min-h-20 border-emerald-200"
            />
          </div>
        ) : (
          <Button
            onClick={() => setShowNotes(true)}
            variant="ghost"
            className="w-full text-emerald-700 text-sm"
            disabled={loading}
          >
            + Agregar notas opcionales
          </Button>
        )}

        {/* Main Completion Button */}
        <Button
          onClick={handleComplete}
          disabled={!isValid || loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 h-16 text-lg font-bold"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Completando...
            </>
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              MARCAR COMPLETADO
            </>
          )}
        </Button>

        {/* Next Order Suggestion */}
        {nextOrderAvailable && nextOrderNumber && (
          <div className="p-3 bg-white rounded-lg border border-emerald-200">
            <div className="text-xs text-gray-500 mb-1">Siguiente OT:</div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-900">{nextOrderNumber}</span>
              <ChevronRight className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xs text-gray-600 mt-2">Listo para el siguiente trabajo</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
