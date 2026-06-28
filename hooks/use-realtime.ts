'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

const TELEMETRY_REALTIME_ENABLED = process.env.NEXT_PUBLIC_TELEMETRY_REALTIME === 'true';

interface SensorReading {
  id: string;
  equipment_id: string;
  sensor_id: string;
  value: number;
  unit: string;
  status: string;
  timestamp: string;
  received_at: string;
}

export function useRealtimeSensors(equipmentId: string) {
  const [supabase] = useState(() => {
    if (!TELEMETRY_REALTIME_ENABLED) {
      return null;
    }

    try {
      return createClient();
    } catch (error) {
      console.error('[telemetry] Realtime sensors unavailable:', error);
      return null;
    }
  });
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial data fetch
  const fetchInitialData = useCallback(async () => {
    if (!supabase) {
      setReadings([]);
      setIsConnected(false);
      setError(null);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setReadings(data || []);
      setIsConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching sensor data');
    }
  }, [supabase, equipmentId]);

  // Setup realtime subscription
  useEffect(() => {
    if (!TELEMETRY_REALTIME_ENABLED) {
      setReadings([]);
      setIsConnected(false);
      setError(null);
      return;
    }

    fetchInitialData();

    if (!supabase) {
      return;
    }

    const subscription = supabase
      .channel(`sensor-readings-${equipmentId}`)
      .on<SensorReading>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sensor_readings',
          filter: `equipment_id=eq.${equipmentId}`,
        },
        (payload: RealtimePostgresChangesPayload<SensorReading>) => {
          if (payload.eventType === 'INSERT') {
            setReadings((prev) => [payload.new as SensorReading, ...prev].slice(0, 100));
          } else if (payload.eventType === 'UPDATE') {
            setReadings((prev) =>
              prev.map((r) => (r.id === (payload.new as SensorReading).id ? payload.new as SensorReading : r))
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [equipmentId, fetchInitialData, supabase]);

  return { readings, isConnected, error };
}

export function useRealtimeAlarms() {
  const [supabase] = useState(() => {
    if (!TELEMETRY_REALTIME_ENABLED) {
      return null;
    }

    try {
      return createClient();
    } catch (error) {
      console.error('[telemetry] Realtime alarms unavailable:', error);
      return null;
    }
  });
  const [alarms, setAlarms] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!supabase) {
      setAlarms([]);
      setUnreadCount(0);
      return;
    }

    // Fetch active alarms
    const fetchAlarms = async () => {
      const { data, error } = await supabase
        .from('alarms')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!error) {
        setAlarms(data || []);
        setUnreadCount((data || []).filter((a: any) => !a.acknowledged_at).length);
      }
    };

    fetchAlarms();

    // Subscribe to new alarms
    const subscription = supabase
      .channel('alarms')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alarms',
        },
        (payload: any) => {
          setAlarms((prev) => [payload.new, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const acknowledgeAlarm = async (alarmId: string) => {
    if (!supabase) return;

    await supabase
      .from('alarms')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', alarmId);

    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return { alarms, unreadCount, acknowledgeAlarm };
}
