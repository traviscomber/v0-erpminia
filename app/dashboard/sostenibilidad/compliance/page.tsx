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
          <h1 className="text-3xl font-bold">Compliance Management</h1>
          <p className="text-muted-foreground">ISO 45001 & SERNAGEOMIN Compliance</p>
        </div>
        <Button onClick={() => setAuditOpen(true)}>Start Audit</Button>
      </div>

      <Tabs defaultValue="calendar" className="w-full">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="audits">Audit History</TabsTrigger>
          <TabsTrigger value="checklists">Checklists</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          <ComplianceCalendar />
        </TabsContent>

        <TabsContent value="audits">
          <div className="text-muted-foreground">Audit history coming soon...</div>
        </TabsContent>

        <TabsContent value="checklists">
          <div className="text-muted-foreground">Checklists coming soon...</div>
        </TabsContent>

        <TabsContent value="reports">
          <div className="text-muted-foreground">Reports coming soon...</div>
        </TabsContent>
      </Tabs>

      <AuditModal open={auditOpen} onOpenChange={setAuditOpen} />
    </div>
  );
}
