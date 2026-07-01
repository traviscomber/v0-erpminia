'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface QRScanResult {
  stock: {
    part_name: string;
    quantity_on_hand: number;
  };
  bin: {
    bin_location: string;
  };
}

interface QRScannerProps {
  onScan?: (data: QRScanResult) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);

  const handleScan = async () => {
    if (!qrValue.trim()) {
      toast.error('Ingresa o escanea un código QR');
      return;
    }

    setScanning(true);
    try {
      const res = await fetch(`/api/warehouse/qr?value=${encodeURIComponent(qrValue)}`);
      if (!res.ok) throw new Error('QR no encontrado');

      const data = (await res.json()) as QRScanResult;
      setScanResult(data);
      onScan?.(data);
      toast.success('Código QR leído correctamente');
    } catch (error) {
      toast.error('No fue posible leer el código QR');
    } finally {
      setScanning(false);
      setQrValue('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escáner de código QR</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Escanea o escribe el código QR..."
            value={qrValue}
            onChange={(e) => setQrValue(e.target.value)}
          />
          <Button onClick={handleScan} disabled={scanning}>
            {scanning ? 'Leyendo...' : 'Escanear'}
          </Button>
        </div>

        {scanResult && (
          <div className="space-y-2 rounded bg-muted p-4">
            <p>
              <strong>Repuesto:</strong> {scanResult.stock.part_name}
            </p>
            <p>
              <strong>Ubicación:</strong> {scanResult.bin.bin_location}
            </p>
            <p>
              <strong>Cantidad:</strong> {scanResult.stock.quantity_on_hand}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
