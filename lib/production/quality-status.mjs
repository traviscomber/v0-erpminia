/**
 * @param {readonly { status?: string | null }[]} rows
 */
export function allQualityChecksPass(rows) {
  return rows.length > 0 && rows.every((row) => row.status === 'PASS');
}
