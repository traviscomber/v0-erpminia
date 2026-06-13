'use client';

import { useState } from 'react';
import { reportIncident } from '@/app/actions/db-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface IncidentReportFormProps {
  onSuccess: () => void;
}

export function IncidentReportForm({ onSuccess }: IncidentReportFormProps) {
  const [formData, setFormData] = useState({
    incident_number: `INC-${Date.now()}`,
    incident_type: 'near_miss',
    severity: 'baja',
    description: '',
    location: '',
    date_occurred: new Date().toISOString().split('T')[0],
    reported_by: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const result = await reportIncident({
        ...formData,
        date_occurred: formData.date_occurred,
      });

      if (result) {
        setSuccess(true);
        setFormData({
          incident_number: `INC-${Date.now()}`,
          incident_type: 'near_miss',
          severity: 'baja',
          description: '',
          location: '',
          date_occurred: new Date().toISOString().split('T')[0],
          reported_by: '',
        });
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error reporting incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Reportar Incidente HSE</CardTitle>
        <CardDescription>
          Documenta eventos, accidentes, near misses e incumplimientos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700">Incidente reportado exitosamente</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Número Incidente</label>
              <Input value={formData.incident_number} disabled className="bg-muted" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Fecha del Incidente</label>
              <Input
                type="date"
                value={formData.date_occurred}
                onChange={(e) => setFormData({ ...formData, date_occurred: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Incidente</label>
              <Select
                value={formData.incident_type}
                onValueChange={(value) => setFormData({ ...formData, incident_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accidente">Accidente</SelectItem>
                  <SelectItem value="lesion">Lesión</SelectItem>
                  <SelectItem value="near_miss">Near Miss</SelectItem>
                  <SelectItem value="propiedad">Daño a Propiedad</SelectItem>
                  <SelectItem value="ambiental">Incidente Ambiental</SelectItem>
                  <SelectItem value="incumplimiento">Incumplimiento Normativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Severidad</label>
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData({ ...formData, severity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Ubicación del Incidente</label>
            <Input
              placeholder="Ej: Área de carga, Sector de Mantención"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Descripción del Incidente</label>
            <Textarea
              placeholder="Describe en detalle qué sucedió..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={5}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Reportado por</label>
            <Input
              placeholder="Nombre y rol del reportante"
              value={formData.reported_by}
              onChange={(e) => setFormData({ ...formData, reported_by: e.target.value })}
              required
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Reportando...' : 'Reportar Incidente'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
