'use client';

import { useState } from 'react';
import ComplianceCalendar from '@/components/sostenibilidad/compliance-calendar';
import AuditModal from '@/components/sostenibilidad/audit-modal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function CompliancePage() {
  const [auditOpen, setAuditOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion de cumplimiento</h1>
          <p className="text-muted-foreground">ISO 45001 y SERNAGEOMIN</p>
        </div>
        <Button onClick={() => setAuditOpen(true)}>Iniciar auditoria</Button>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList>
          <TabsTrigger value="calendar">Calendario</TabsTrigger>
          <TabsTrigger value="audits">Historial</TabsTrigger>
          <TabsTrigger value="checklists">Listas</TabsTrigger>
          <TabsTrigger value="reports">Reportes</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <ComplianceCalendar />
        </TabsContent>

        <TabsContent value="audits">
          <div className="text-muted-foreground">Historial de auditorias proximamente...</div>
        </TabsContent>

        <TabsContent value="checklists">
          <div className="text-muted-foreground">Listas de verificacion proximamente...</div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="text-muted-foreground">Reportes proximamente...</div>
        </TabsContent>
      </Tabs>

      <AuditModal open={auditOpen} onOpenChange={setAuditOpen} />
    </div>
  );
}
