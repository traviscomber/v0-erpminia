'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertCircle, MapPin, Camera } from 'lucide-react';

export function TireDamageForm() {
  const [tireCode, setTireCode] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleReportDamage = async () => {
    if (!tireCode || !location) {
      setError('Código de neumatico y ubicación son requeridos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/maintenance/tires/create-damage-wo', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tire_code: tireCode,
          location,
          description,
          technician_name: 'Técnico Campo',
        }),
      });

      if (!response.ok) throw new Error('Error reportando daño');

      const data = await response.json();
      setSuccess(`OT ${data.work_order.work_order_number} creada exitosamente`);
      setTireCode('');
      setLocation('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reportar daño');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-4 bg-card border-border">
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          Reportar Daño de Neumatico
        </h3>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 text-green-700 dark:text-green-400 p-3 rounded text-sm">
            {success}
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Código Neumatico</label>
          <Input
            placeholder="Escanear o digitar código"
            value={tireCode}
            onChange={(e) => setTireCode(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Ubicación (Sector)
          </label>
          <Input
            placeholder="Ej: Mina Don Jaime - Sector Excavación"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Descripción del Daño</label>
          <textarea
            placeholder="Describe el daño observado"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full p-2 border border-border rounded bg-background text-foreground text-sm"
            rows={3}
          />
        </div>

        <Button
          onClick={handleReportDamage}
          disabled={loading || !tireCode || !location}
          className="w-full bg-destructive hover:bg-destructive/90"
        >
          {loading ? 'Reportando...' : 'Reportar Daño'}
        </Button>
      </div>
    </Card>
  );
}
