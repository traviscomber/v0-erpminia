'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MobileQuickQR } from './mobile-quick-qr';
import { MobilePhotoCapture } from './mobile-photo-capture';
import { MobileCompletionBadge } from './mobile-completion-badge';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

type WorkOrder = {
  id: string;
  work_order_number: string;
  title: string;
  status: string;
  asset_id: string | null;
};

type Step = 'qr' | 'photo' | 'complete' | 'success';

export function MobileSimpleFlow() {
  const [currentStep, setCurrentStep] = useState<Step>('qr');
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [photoData, setPhotoData] = useState<{ file: File; timestamp: string } | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const { data: workOrders = [] } = useSWR<WorkOrder[]>(
    '/api/maintenance/work-orders?status=open&limit=5',
    fetcher
  );

  const handleQRScanned = async (code: string) => {
    const wo = workOrders.find(
      (w) =>
        w.work_order_number === code ||
        w.id === code ||
        w.title.toLowerCase().includes(code.toLowerCase())
    );

    if (wo) {
      setSelectedWorkOrder(wo);
      setCurrentStep('photo');
    } else {
      toast.error('Orden de trabajo no encontrada');
    }
  };

  const handlePhotoCapture = (data: { file: File; timestamp: string }) => {
    setPhotoData(data);
    setCurrentStep('complete');
  };

  const handleComplete = async (notes?: string) => {
    if (!selectedWorkOrder) return;

    setIsCompleting(true);
    try {
      const response = await fetch('/api/mantenimiento/mobile-quick-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          workOrderId: selectedWorkOrder.id,
          notes,
          photoUrl: photoData?.file.name,
          completedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to complete');

      const result = await response.json();

      toast.success('Orden completada exitosamente');
      setCurrentStep('success');

      // Reset after 3 seconds
      setTimeout(() => {
        setCurrentStep('qr');
        setSelectedWorkOrder(null);
        setPhotoData(null);
      }, 3000);
    } catch (error) {
      toast.error('Error al completar la orden');
    } finally {
      setIsCompleting(false);
    }
  };

  if (currentStep === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-emerald-50 to-white p-4">
        <div className="text-center space-y-4">
          <CheckCircle2 className="w-20 h-20 text-emerald-600 mx-auto animate-bounce" />
          <h1 className="text-3xl font-bold text-emerald-900">Trabajo Completado</h1>
          <p className="text-gray-600">
            {selectedWorkOrder?.work_order_number} - {selectedWorkOrder?.title}
          </p>
          <p className="text-sm text-gray-500">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Panel de Trabajo</h1>
          <p className="text-sm text-gray-600">Completa tu orden en 3 pasos</p>
        </div>

        {/* Error Alert */}
        {currentStep === 'qr' && workOrders.length === 0 && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              No hay órdenes disponibles en este momento
            </AlertDescription>
          </Alert>
        )}

        {/* Step 1: QR Selection */}
        {currentStep === 'qr' && (
          <MobileQuickQR
            onQRScanned={handleQRScanned}
            loading={isCompleting}
            workOrders={workOrders}
          />
        )}

        {/* Step 2: Photo */}
        {currentStep === 'photo' && selectedWorkOrder && (
          <div className="space-y-3">
            <Card className="border-gray-200 bg-white">
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600">
                  <strong>Orden:</strong> {selectedWorkOrder.work_order_number}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Trabajo:</strong> {selectedWorkOrder.title}
                </div>
              </CardContent>
            </Card>
            <MobilePhotoCapture onPhotoCapture={handlePhotoCapture} loading={isCompleting} />
          </div>
        )}

        {/* Step 3: Complete */}
        {currentStep === 'complete' && selectedWorkOrder && photoData && (
          <MobileCompletionBadge
            onComplete={handleComplete}
            loading={isCompleting}
            isValid={true}
            nextOrderAvailable={workOrders.length > 1}
          />
        )}

        {/* Progress Indicator */}
        <div className="flex gap-1 pt-4">
          <div
            className={`flex-1 h-1 rounded-full transition-colors ${
              ['qr', 'photo', 'complete', 'success'].indexOf(currentStep) >= 0
                ? 'bg-amber-600'
                : 'bg-gray-200'
            }`}
          />
          <div
            className={`flex-1 h-1 rounded-full transition-colors ${
              ['photo', 'complete', 'success'].indexOf(currentStep) >= 0
                ? 'bg-blue-600'
                : 'bg-gray-200'
            }`}
          />
          <div
            className={`flex-1 h-1 rounded-full transition-colors ${
              ['complete', 'success'].indexOf(currentStep) >= 0
                ? 'bg-emerald-600'
                : 'bg-gray-200'
            }`}
          />
        </div>
      </div>
    </div>
  );
}
