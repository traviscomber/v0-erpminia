'use client';

import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface LegalContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx'];

export function LegalContractDialog({ open, onOpenChange, onSuccess }: LegalContractDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [contractType, setContractType] = useState('Servicios');
  const [status, setStatus] = useState('En revision');
  const [contractValue, setContractValue] = useState('');
  const [currency, setCurrency] = useState('CLP');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [responsibleArea, setResponsibleArea] = useState('Legal');
  const [complianceStatus, setComplianceStatus] = useState('Pendiente');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setContractNumber('');
    setContractType('Servicios');
    setStatus('En revision');
    setContractValue('');
    setCurrency('CLP');
    setStartDate('');
    setEndDate('');
    setContractorName('');
    setResponsibleArea('Legal');
    setComplianceStatus('Pendiente');
    setFile(null);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const extension = selectedFile.name.split('.').pop()?.toLowerCase() || '';
    if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
      toast.error('Formato no permitido. Usa PDF, DOC o DOCX.');
      event.target.value = '';
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error('El archivo excede el limite de 50MB.');
      event.target.value = '';
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!title || !contractType || !status || !contractValue || !startDate || !endDate || !file) {
      toast.error('Completa los campos requeridos y adjunta el archivo.');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('contractType', contractType);
      formData.append('status', status);
      formData.append('contractValue', contractValue);
      formData.append('currency', currency);
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      formData.append('contractorName', contractorName);
      formData.append('responsibleArea', responsibleArea);
      formData.append('complianceStatus', complianceStatus);
      if (contractNumber) {
        formData.append('contractNumber', contractNumber);
      }
      formData.append('file', file);

      const response = await fetch('/api/contracts', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload.error || 'No fue posible crear el contrato');
      }

      toast.success('Contrato creado');
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al crear contrato');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nuevo contrato legal</DialogTitle>
          <DialogDescription>
            Registra contratos, subcontratos o anexos con respaldo documental y archivo adjunto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Titulo</label>
              <Input
                placeholder="Ej: Contrato principal Operaciones La Patagua 2026"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Numero de contrato</label>
              <Input
                placeholder="CNT-2026-001"
                value={contractNumber}
                onChange={(event) => setContractNumber(event.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Contratista</label>
              <Input
                placeholder="Nombre del proveedor o contratista"
                value={contractorName}
                onChange={(event) => setContractorName(event.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Descripcion</label>
              <Textarea
                placeholder="Alcance, condiciones clave y observaciones"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isLoading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Tipo</label>
              <Select value={contractType} onValueChange={setContractType} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Servicios">Servicios</SelectItem>
                  <SelectItem value="Suministro">Suministro</SelectItem>
                  <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="Arrendamiento">Arrendamiento</SelectItem>
                  <SelectItem value="Subcontrato">Subcontrato</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Estado</label>
              <Select value={status} onValueChange={setStatus} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="En revision">En revision</SelectItem>
                  <SelectItem value="Vigente">Vigente</SelectItem>
                  <SelectItem value="Borrador">Borrador</SelectItem>
                  <SelectItem value="Por Vencer">Por Vencer</SelectItem>
                  <SelectItem value="Vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Valor contractual</label>
              <Input
                type="number"
                min="0"
                step="1"
                value={contractValue}
                onChange={(event) => setContractValue(event.target.value)}
                disabled={isLoading}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Moneda</label>
              <Select value={currency} onValueChange={setCurrency} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLP">CLP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Fecha inicio</label>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Fecha termino</label>
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Area responsable</label>
              <Input
                placeholder="Legal, Abastecimiento, Operaciones..."
                value={responsibleArea}
                onChange={(event) => setResponsibleArea(event.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Estado de cumplimiento</label>
              <Select value={complianceStatus} onValueChange={setComplianceStatus} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value="Aprobado">Aprobado</SelectItem>
                  <SelectItem value="Observado">Observado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Archivo</label>
            <div className="rounded-lg border border-dashed border-border p-5 text-center transition-colors hover:border-primary">
              <input
                id="legal-contract-file"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                disabled={isLoading}
                accept=".pdf,.doc,.docx"
              />
              <label htmlFor="legal-contract-file" className="block cursor-pointer">
                <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  {file ? file.name : 'Haz clic para adjuntar el contrato'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">PDF, DOC o DOCX, maximo 50MB</p>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !file}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Crear contrato
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
