'use client';

import { useCallback, useMemo } from 'react';

type SensorReading = {
  id: string;
  equipment_id: string;
  sensor_id: string;
  value: number;
  unit: string;
  status: string;
  timestamp: string;
  received_at: string;
};

type AlarmItem = {
  id: string;
  acknowledged_at?: string | null;
};

export function useRealtimeSensors(_equipmentId: string) {
  const readings = useMemo<SensorReading[]>(() => [], []);
  const isConnected = false;
  const error = null;

  return { readings, isConnected, error };
}

export function useRealtimeAlarms() {
  const alarms = useMemo<AlarmItem[]>(() => [], []);
  const unreadCount = 0;
  const acknowledgeAlarm = useCallback(async (_alarmId: string) => {
    return;
  }, []);

  return { alarms, unreadCount, acknowledgeAlarm };
}
