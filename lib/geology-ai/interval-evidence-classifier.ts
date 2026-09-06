export type IntervalEvidenceClass = 'explicit_formal_logging' | 'operational_source_interval' | 'unclassified_interval';

export function classifyIntervalEvidence(notesValue: unknown): IntervalEvidenceClass {
  const notes = String(notesValue || '').toLowerCase();
  if (/formal logging|geologist logging|logging geológico formal|validated geological logging/.test(notes)) {
    return 'explicit_formal_logging';
  }
  if (/operational observation|operator observation|production_drilling_source_reports|derived only between two consecutive explicit depth transitions|canonical geology(?:\s+\d{4})?\s+pass|exelito interval pass|geology evidence extraction/.test(notes)) {
    return 'operational_source_interval';
  }
  return 'unclassified_interval';
}
