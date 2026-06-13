'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface QRScannerProps {
  onScan?: (data: any) => void;
}

export function QRScanner({ onScan }: QRScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);

  const handleScan = async () => {
    if (!qrValue) {
      toast.error('Enter or scan a QR code');
      return;
    }

    setScanning(true);
    try {
      const res = await fetch(`/api/warehouse/qrvalue=${qrValue}`);
      if (!res.ok) throw new Error('QR not found');
      
      const data = await res.json();
      setScanResult(data);
      onScan?.(data);
      toast.success('QR scanned successfully');
    } catch (error) {
      toast.error('Failed to scan QR code');
    } finally {
      setScanning(false);
      setQrValue('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Code Scanner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Scan QR code..." value={qrValue} onChange={(e) => setQrValue(e.target.value)} />
          <Button onClick={handleScan} disabled={scanning}>
            {scanning ? 'Scanning...' : 'Scan'}
          </Button>
        </div>

        {scanResult && (
          <div className="p-4 bg-muted rounded space-y-2">
            <p><strong>Part:</strong> {scanResult.stock.part_name}</p>
            <p><strong>Location:</strong> {scanResult.bin.bin_location}</p>
            <p><strong>Quantity:</strong> {scanResult.stock.quantity_on_hand}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
