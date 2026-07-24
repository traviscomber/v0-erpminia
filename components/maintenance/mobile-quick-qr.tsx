'use client';
// v2 — uses theme tokens instead of hardcoded amber bg colors
import { useState } from 'react';
import { QrCode, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MobileQuickQRProps {
  onQRScanned: (value: string) => void;
  loading?: boolean;
  workOrders?: Array<{ id: string; work_order_number: string; title: string }>;
}

export function MobileQuickQR({ onQRScanned, loading, workOrders = [] }: MobileQuickQRProps) {
  const [manualCode, setManualCode] = useState('');
  const [showManual, setShowManual] = useState(false);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onQRScanned(manualCode.trim());
      setManualCode('');
      setShowManual(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          Paso 1: Seleccionar OT
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Select from Available Orders */}
        {workOrders.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Ordenes disponibles:</Label>
            <div className="grid gap-2">
              {workOrders.slice(0, 3).map((wo) => (
                <button
                  key={wo.id}
                  onClick={() => onQRScanned(wo.work_order_number)}
                  disabled={loading}
                  className="p-3 text-left bg-card border border-border rounded-lg hover:bg-accent hover:border-primary/40 disabled:opacity-50 transition-all"
                >
                  <div className="font-semibold text-sm text-foreground">{wo.work_order_number}</div>
                  <div className="text-xs text-muted-foreground">{wo.title}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual Entry Toggle */}
        {!showManual ? (
          <Button
            onClick={() => setShowManual(true)}
            variant="outline"
            className="w-full"
            disabled={loading}
          >
            <Type className="w-4 h-4 mr-2" />
            O ingresa manualmente
          </Button>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="Codigo OT o numero..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleManualSubmit();
              }}
              autoFocus
            />
            <Button onClick={handleManualSubmit} disabled={!manualCode.trim() || loading} className="w-full">
              Confirmar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
