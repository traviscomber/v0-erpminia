import { NextRequest, NextResponse } from 'next/server'
import { POST as runDataset } from '../hse-canonical-import/route'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const NONCE = 'hse-20260804-9f72c4e1'
const DATASETS = ['hse_roles', 'hse_commitments', 'hse_facilities'] as const

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('nonce') !== NONCE) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const adminToken = process.env.ADMIN_INIT_TOKEN
  if (!adminToken) {
    return NextResponse.json({ error: 'ADMIN_INIT_TOKEN missing' }, { status: 500 })
  }

  const report: Record<string, unknown>[] = []

  for (const dataset of DATASETS) {
    let offset = 0
    let done = false
    let processed = 0

    while (!done) {
      const internalRequest = new NextRequest('https://internal.local/api/admin/hse-canonical-import', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-admin-token': adminToken,
        },
        body: JSON.stringify({ dataset, offset, limit: 500 }),
      })

      const response = await runDataset(internalRequest)
      const payload = await response.json()
      if (!response.ok) {
        return NextResponse.json({ error: `Import failed for ${dataset}`, payload, report }, { status: response.status })
      }

      const count = Number(payload.processed || 0)
      processed += count
      done = Boolean(payload.done)
      offset = Number(payload.nextOffset || offset + 500)

      if (count === 0) done = true
    }

    report.push({ dataset, processed })
  }

  return NextResponse.json({ ok: true, report })
}
