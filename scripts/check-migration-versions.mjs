import { readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = join(fileURLToPath(new URL('..', import.meta.url)));
const migrationsDirectory = join(repositoryRoot, 'supabase', 'migrations');
const legacyNames = new Set([
  '20260819_add_jefe_man_eq_performance.sql',
  '20260822_production_drilling_canonical_and_plan.sql',
]);

const files = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith('.sql'))
  .sort();
const versions = new Map();
const errors = [];

for (const file of files) {
  const version = basename(file).split('_', 1)[0];
  const existing = versions.get(version) ?? [];
  existing.push(file);
  versions.set(version, existing);

  if (!/^\d{14}$/.test(version) && !legacyNames.has(file)) {
    errors.push(`${file}: migration version must use a 14-digit timestamp`);
  }
}

for (const [version, versionFiles] of versions) {
  if (versionFiles.length > 1) {
    errors.push(`duplicate migration version ${version}: ${versionFiles.join(', ')}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${files.length} migration files: versions are unique.`);
}
