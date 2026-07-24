'use client';

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
    <Card className="w-full border-amber-200 bg-amber-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="w-5 h-5 text-amber-600" />
          Paso 1: Seleccionar OT
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Select from Available Orders */}
        {workOrders.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Órdenes disponibles:</Label>
            <div className="grid gap-2">
              {workOrders.slice(0, 3).map((wo) => (
                <button
                  key={wo.id}
                  onClick={() => onQRScanned(wo.work_order_number)}
                  disabled={loading}
                  className="p-3 text-left bg-white border border-amber-200 rounded-lg hover:bg-amber-50 hover:border-amber-400 disabled:opacity-50 transition-all"
                >
                  <div className="font-semibold text-sm text-amber-900">{wo.work_order_number}</div>
                  <div className="text-xs text-gray-600">{wo.title}</div>
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
            className="w-full text-amber-700 border-amber-300"
            disabled={loading}
          >
            <Type className="w-4 h-4 mr-2" />
            O ingresa manualmente
          </Button>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="Código OT o número..."
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleManualSubmit()}
              autoFocus
              className="border-amber-200"
            />
            <Button onClick={handleManualSubmit} disabled={!manualCode.trim() || loading} className="w-full bg-amber-600 hover:bg-amber-700">
              Confirmar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
