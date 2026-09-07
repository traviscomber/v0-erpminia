import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../app/dashboard/documentos/page.tsx', import.meta.url);
const viewerUrl = new URL('../components/documents/document-viewer.tsx', import.meta.url);

test('document library preserves source errors, filters and missing dates', async () => {
  const page = await readFile(pageUrl, 'utf8');
  const viewer = await readFile(viewerUrl, 'utf8');

  assert.match(page, /if \(!response\.ok\) throw new Error/);
  assert.match(page, /`\/api\/documents\?\$\{documentsParams\.toString\(\)\}`/);
  assert.match(page, /statsLoading \|\| !stats \? '—'/);
  assert.match(page, /createdAt: doc\.createdAt \|\| doc\.uploaded_at \|\| null/);
  assert.match(page, /Biblioteca no disponible/);
  assert.doesNotMatch(page, /uploaded_at \|\| new Date\(\)\.toISOString\(\)/);

  assert.match(viewer, /createdAt: string \| null/);
  assert.match(viewer, /No informada/);
  assert.match(viewer, /const createdAt = document\.createdAt \? new Date\(document\.createdAt\) : null/);
});
