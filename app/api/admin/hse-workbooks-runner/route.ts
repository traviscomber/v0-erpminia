export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'

const RUN_NONCE = 'hse-20260804-7f3d9a21'

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('nonce') !== RUN_NONCE) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const token = process.env.ADMIN_INIT_TOKEN
  if (!token) return NextResponse.json({ error: 'ADMIN_INIT_TOKEN missing' }, { status: 500 })

  const origin = req.nextUrl.origin
  const reports: unknown[] = []
  let offset = 0
  const limit = 500

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const response = await fetch(`${origin}/api/admin/hse-workbooks-import`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ file: 'all', offset, limit }),
      cache: 'no-store',
    })
    const payload = await response.json()
    reports.push(payload)
    if (!response.ok) return NextResponse.json({ ok: false, offset, reports }, { status: 500 })
    if (payload.done === true) return NextResponse.json({ ok: true, finalOffset: offset, reports })
    offset = Number(payload.nextOffset || offset + limit)
  }

  return NextResponse.json({ ok: false, error: 'Maximum batches reached', reports }, { status: 500 })
}
