'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface ApprovalStep {
  id: string;
  level: number;
  levelName: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  assignedToName: string;
  approvedByName: string;
  comments: string;
  rejectionReason: string;
  approvedAt: string;
}

export interface ApprovalWorkflowCardProps {
  documentId: string;
  steps: ApprovalStep[];
  currentUserCanApprove: boolean;
  onApprove: (stepId: string, comments: string) => Promise<void>;
  onReject: (stepId: string, reason: string) => Promise<void>;
  isLoading?: boolean;
}

export function ApprovalWorkflowCard({
  documentId,
  steps,
  currentUserCanApprove = false,
  onApprove,
  onReject,
  isLoading = false,
}: ApprovalWorkflowCardProps) {
  const [approvingStepId, setApprovingStepId] = useState<string | null>(null);
  const [rejectingStepId, setRejectingStepId] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [key: string]: string }>({});
  const [rejectionReason, setRejectionReason] = useState<{ [key: string]: string }>({});

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-6 h-6 text-secondary" />;
      case 'rejected':
        return <XCircle className="w-6 h-6 text-destructive" />;
      case 'pending':
        return <Clock className="w-6 h-6 text-primary" />;
      default:
        return <Clock className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const getStepStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: 'Pendiente',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      skipped: 'Saltado',
    };
    return labels[status] || status;
  };

  const handleApprove = async (step: ApprovalStep) => {
    if (!onApprove) return;

    setApprovingStepId(step.id);
    try {
      await onApprove(step.id, comments[step.id] || '');
      toast.success(`${step.levelName} aprobado exitosamente`);
      setComments((prev) => ({ ...prev, [step.id]: '' }));
    } catch (error) {
      console.error('[ApprovalWorkflowCard] Approve error:', error);
      toast.error('Error al aprobar documento');
    } finally {
      setApprovingStepId(null);
    }
  };

  const handleReject = async (step: ApprovalStep) => {
    if (!onReject) return;

    if (!rejectionReason[step.id]) {
      toast.error('Por favor ingresa una razón de rechazo');
      return;
    }

    setRejectingStepId(step.id);
    try {
      await onReject(step.id, rejectionReason[step.id]);
      toast.success(`${step.levelName} rechazado`);
      setRejectionReason((prev) => ({ ...prev, [step.id]: '' }));
    } catch (error) {
      console.error('[ApprovalWorkflowCard] Reject error:', error);
      toast.error('Error al rechazar documento');
    } finally {
      setRejectingStepId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flujo de Aprobación</CardTitle>
        <CardDescription>
          {steps.length} niveles de revisión requeridos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timeline */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="space-y-3">
              {/* Step Header */}
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  {getStepIcon(step.status)}
                  {index < steps.length - 1 && (
                    <div className="w-0.5 h-12 bg-muted mt-2" />
                  )}
                </div>

                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground">{step.levelName}</h4>
                    <Badge
                      variant={
                        step.status === 'approved'
                          ? 'default'
                          : step.status === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {getStepStatusLabel(step.status)}
                    </Badge>
                  </div>

                  {step.assignedToName && (
                    <p className="text-sm text-muted-foreground">
                      Asignado a: {step.assignedToName}
                    </p>
                  )}

                  {step.approvedByName && (
                    <p className="text-sm text-muted-foreground">
                      Aprobado por: {step.approvedByName}
                    </p>
                  )}

                  {step.approvedAt && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(step.approvedAt).toLocaleDateString('es-CL')} a las{' '}
                      {new Date(step.approvedAt).toLocaleTimeString('es-CL')}
                    </p>
                  )}

                  {step.comments && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <p className="text-muted-foreground">
                        <span className="font-medium">Comentario:</span> {step.comments}
                      </p>
                    </div>
                  )}

                  {step.rejectionReason && (
                    <div className="mt-2 p-2 bg-destructive/10 rounded text-sm">
                      <p className="text-destructive">
                        <span className="font-medium">Razón de rechazo:</span>{' '}
                        {step.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons (si está pendiente y usuario puede aprobar) */}
              {step.status === 'pending' && currentUserCanApprove && (
                <div className="ml-14 space-y-3 pt-2">
                  <Textarea
                    placeholder="Comentarios (opcional)"
                    value={comments[step.id] || ''}
                    onChange={(e) =>
                      setComments((prev) => ({ ...prev, [step.id]: e.target.value }))
                    }
                    disabled={isLoading}
                    rows={2}
                  />

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-secondary hover:bg-secondary/90"
                      onClick={() => handleApprove(step)}
                      disabled={isLoading || approvingStepId !== null}
                    >
                      {approvingStepId === step.id ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Aprobando...
                        </>
                      ) : (
                        'Aprobar'
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRejectingStepId(step.id);
                      }}
                      disabled={isLoading || rejectingStepId === step.id}
                    >
                      Rechazar
                    </Button>
                  </div>

                  {/* Reject Reason Input */}
                  {rejectingStepId === step.id && (
                    <div className="space-y-2 p-3 bg-muted rounded">
                      <label className="text-sm font-medium text-foreground">
                        Razón de rechazo
                      </label>
                      <Textarea
                        placeholder="Explica por qué rechazas este documento..."
                        value={rejectionReason[step.id] || ''}
                        onChange={(e) =>
                          setRejectionReason((prev) => ({
                            ...prev,
                            [step.id]: e.target.value,
                          }))
                        }
                        disabled={isLoading}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(step)}
                          disabled={isLoading || !rejectionReason[step.id]}
                        >
                          {rejectingStepId === step.id ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Rechazando...
                            </>
                          ) : (
                            'Confirmar rechazo'
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectingStepId(null)}
                          disabled={isLoading}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
