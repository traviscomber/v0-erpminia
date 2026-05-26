'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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
  const supabase = createClient();
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial data fetch
  const fetchInitialData = useCallback(async () => {
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
    fetchInitialData();

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
  const supabase = createClient();
  const [alarms, setAlarms] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
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
    await supabase
      .from('alarms')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('id', alarmId);

    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return { alarms, unreadCount, acknowledgeAlarm };
}
