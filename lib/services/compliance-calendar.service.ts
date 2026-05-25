export class ComplianceCalendarService {
  static async getUpcomingEvents(orgId: string, days: number = 30) {
    const mockEvents = [
      { id: '1', title: 'SERNAGEOMIN Safety Inspection', due_date: new Date(Date.now() + 7*24*60*60*1000).toISOString(), status: 'pending', type: 'inspection' },
      { id: '2', title: 'ISO 45001 Internal Audit', due_date: new Date(Date.now() + 14*24*60*60*1000).toISOString(), status: 'pending', type: 'audit' },
      { id: '3', title: 'Environmental Report Q2', due_date: new Date(Date.now() + 21*24*60*60*1000).toISOString(), status: 'pending', type: 'report' },
    ];
    return mockEvents;
  }

  static async getOverdueEvents(orgId: string) {
    const mockEvents = [
      { id: '4', title: 'Training Documentation Update', due_date: new Date(Date.now() - 7*24*60*60*1000).toISOString(), status: 'overdue', type: 'training' },
    ];
    return mockEvents;
  }

  static async getComplianceScore(orgId: string) {
    return { score: 82, lastAudit: new Date().toISOString(), trend: '+5%' };
  }

  static async createComplianceEvent(orgId: string, data: any) {
    return { id: crypto.randomUUID(), ...data, created_at: new Date().toISOString() };
  }
}
