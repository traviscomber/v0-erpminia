'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Pause, StopCircle, Clock } from 'lucide-react';

interface TireActionButtonsProps {
  workOrderId: string;
  tireId: string;
  onActionComplete?: () => void;
}

export function TireActionButtons({ workOrderId, tireId, onActionComplete }: TireActionButtonsProps) {
  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'playing') {
      interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${mins}m ${secs}s`;
  };

  const handleAction = async (action: 'play' | 'pause' | 'resume' | 'terminate') => {
    setLoading(true);

    try {
      const response = await fetch('/api/maintenance/tires/action', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_order_id: workOrderId,
          tire_id: tireId,
          action,
          notes: `${action} action by technician`,
        }),
      });

      if (!response.ok) throw new Error(`Error: ${action}`);

      if (action === 'play') setStatus('playing');
      else if (action === 'pause') setStatus('paused');
      else if (action === 'resume') setStatus('playing');
      else if (action === 'terminate') {
        setStatus('idle');
        onActionComplete?.();
      }
    } catch (error) {
      console.error('Action error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 bg-card border-border">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Tiempo Transcurrido</span>
          <div className="flex items-center gap-2 font-mono text-lg font-bold text-foreground">
            <Clock className="h-5 w-5" />
            {formatTime(elapsedSeconds)}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {status === 'idle' && (
            <Button
              onClick={() => handleAction('play')}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Play className="h-4 w-4 mr-1" />
              Iniciar
            </Button>
          )}

          {status === 'playing' && (
            <>
              <Button
                onClick={() => handleAction('pause')}
                disabled={loading}
                className="bg-yellow-600 hover:bg-yellow-700"
                size="sm"
              >
                <Pause className="h-4 w-4 mr-1" />
                Pausa
              </Button>
              <Button
                onClick={() => handleAction('terminate')}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 col-span-2"
                size="sm"
              >
                <StopCircle className="h-4 w-4 mr-1" />
                Terminar
              </Button>
            </>
          )}

          {status === 'paused' && (
            <>
              <Button
                onClick={() => handleAction('resume')}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <Play className="h-4 w-4 mr-1" />
                Reanudar
              </Button>
              <Button
                onClick={() => handleAction('terminate')}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 col-span-2"
                size="sm"
              >
                <StopCircle className="h-4 w-4 mr-1" />
                Terminar
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
