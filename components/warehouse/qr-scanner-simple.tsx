'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, X } from 'lucide-react';

interface QRScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [manualBarcode, setManualBarcode] = useState('');

  const handleManualInput = () => {
    if (manualBarcode.trim()) {
      onScan(manualBarcode);
      setManualBarcode('');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Escanear Código QR / Código de Barras</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4 py-6 border-2 border-dashed rounded-lg">
          <QrCode className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="text-sm font-medium mb-2">Escanea con tu dispositivo</p>
            <p className="text-xs text-muted-foreground mb-4">O ingresa manualmente el código</p>
          </div>
        </div>

        <div className="space-y-2">
          <Input
            placeholder="Ingresa código de barras aquí..."
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualInput()}
            autoFocus
          />
          <Button 
            onClick={handleManualInput}
            className="w-full"
            disabled={!manualBarcode.trim()}
          >
            Registrar Entrada
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
