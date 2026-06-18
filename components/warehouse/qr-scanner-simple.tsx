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
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Escanear codigo QR / codigo de barras</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed py-6">
          <QrCode className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="mb-2 text-sm font-medium">Escanea con tu dispositivo</p>
            <p className="mb-4 text-xs text-muted-foreground">O ingresa manualmente el codigo</p>
          </div>
        </div>

        <div className="space-y-2">
          <Input
            placeholder="Ingresa codigo de barras aqui..."
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualInput()}
            autoFocus
          />
          <Button onClick={handleManualInput} className="w-full" disabled={!manualBarcode.trim()}>
            Registrar entrada
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
