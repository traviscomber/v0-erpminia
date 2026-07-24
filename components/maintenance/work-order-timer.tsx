'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Play, Pause, StopCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WorkOrderTimerProps {
  workOrderId: string;
  status?: string;
  onActionComplete?: (action: string, totalMinutes: number) => void;
}

export function WorkOrderTimer({ workOrderId, onActionComplete }: WorkOrderTimerProps) {
  const [timerStatus, setTimerStatus] = useState<'idle' | 'running' | 'paused'>('idle');
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch initial state
  useEffect(() => {
    const fetchTimer = async () => {
      try {
        const res = await fetch(`/api/maintenance/work-orders/${workOrderId}/timer`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setTimerStatus(data.current.timer_status);
          setTotalMinutes(data.current.total_minutes);
          if (data.current.timer_start_time) {
            setStartTime(new Date(data.current.timer_start_time));
          }
        }
      } catch (err) {
        console.error('[v0] Failed to fetch timer:', err);
      }
    };
    fetchTimer();
  }, [workOrderId]);

  // Update elapsed time every second when running
  useEffect(() => {
    if (timerStatus !== 'running' || !startTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const elapsedSecs = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedMinutes(Math.floor(elapsedSecs / 60));
    }, 1000);

    return () => clearInterval(interval);
  }, [timerStatus, startTime]);

  const handleAction = useCallback(
    async (action: 'play' | 'pause' | 'resume' | 'terminate') => {
      setLoading(true);
      try {
        const res = await fetch(`/api/maintenance/work-orders/${workOrderId}/timer`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            notes: '',
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setTimerStatus(data.timer_status);
          setTotalMinutes(data.total_minutes);
          setElapsedMinutes(0);
          if (data.timer_status === 'running') {
            setStartTime(new Date());
          } else {
            setStartTime(null);
          }
          onActionComplete?.(action, data.total_minutes);
        }
      } catch (err) {
        console.error('[v0] Timer action failed:', err);
      } finally {
        setLoading(false);
      }
    },
    [workOrderId, onActionComplete]
  );

  const displayMinutes = timerStatus === 'running' ? totalMinutes + elapsedMinutes : totalMinutes;
  const hours = Math.floor(displayMinutes / 60);
  const minutes = displayMinutes % 60;

  return (
    <Card className="p-4 bg-card border-border space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Tiempo de Trabajo</h3>
      </div>

      <div className="text-center">
        <div className="text-4xl font-bold text-primary tabular-nums">
          {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}
        </div>
        <p className="text-xs text-muted-foreground mt-2 capitalize">
          Estado: {timerStatus === 'running' ? '▶ En progreso' : timerStatus === 'paused' ? '⏸ Pausado' : '⏹ Detenido'}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap justify-center">
        {(timerStatus === 'idle' || timerStatus === 'paused') && (
          <Button
            onClick={() => handleAction(timerStatus === 'idle' ? 'play' : 'resume')}
            disabled={loading}
            className="gap-2 flex-1"
            variant="default"
            size="sm"
          >
            <Play className="h-4 w-4" />
            {timerStatus === 'idle' ? 'Iniciar' : 'Reanudar'}
          </Button>
        )}

        {timerStatus === 'running' && (
          <>
            <Button
              onClick={() => handleAction('pause')}
              disabled={loading}
              className="gap-2 flex-1"
              variant="outline"
              size="sm"
            >
              <Pause className="h-4 w-4" />
              Pausa
            </Button>
            <Button
              onClick={() => handleAction('terminate')}
              disabled={loading}
              className="gap-2 flex-1"
              variant="destructive"
              size="sm"
            >
              <StopCircle className="h-4 w-4" />
              Terminar
            </Button>
          </>
        )}

        {timerStatus === 'paused' && (
          <Button
            onClick={() => handleAction('terminate')}
            disabled={loading}
            className="gap-2 w-full"
            variant="destructive"
            size="sm"
          >
            <StopCircle className="h-4 w-4" />
            Terminar
          </Button>
        )}
      </div>
    </Card>
  );
}
