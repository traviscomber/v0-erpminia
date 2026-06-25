export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { requireAuth } from '@/lib/api/guard';

/**
 * Receives a single file chunk from the client as FormData,
 * stores it in Vercel Blob from the server side (bypassing CORS and
 * payload limits), and returns the blob URL for later assembly.
 *
 * POST body (multipart/form-data):
 *   chunk  - Blob/File with the raw bytes
 *   index  - chunk index (0-based)
 *   total  - total number of chunks
 *   fileId - unique upload session id
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const auth = await requireAuth(request);
    if (!auth.authorized || !auth.user) return auth.response! as NextResponse;

    const formData = await request.formData();
    const chunkEntry = formData.get('chunk');
    const index = Number(formData.get('index') ?? 0);
    const fileId = String(formData.get('fileId') ?? Date.now());

    if (!(chunkEntry instanceof File)) {
      return NextResponse.json({ error: 'No se recibio el chunk' }, { status: 400 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'Falta BLOB_READ_WRITE_TOKEN' }, { status: 500 });
    }

    const arrayBuffer = await chunkEntry.arrayBuffer();
    const blobPath = `compras-existencias/chunks/${fileId}/chunk-${String(index).padStart(4, '0')}`;

    const stored = await put(blobPath, arrayBuffer, {
      access: 'private',
      token,
      addRandomSuffix: false,
    });

    return NextResponse.json({ url: stored.url, index });
  } catch (error) {
    console.error('[v0] chunk upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error subiendo chunk' },
      { status: 500 },
    );
  }
}
