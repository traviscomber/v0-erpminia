import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const usersListUrl = new URL('../components/admin/users-list.tsx', import.meta.url);

test('admin users never turn a source error into zero registered users', async () => {
  const source = await readFile(usersListUrl, 'utf8');
  assert.match(source, /if \(!response\.ok\)/);
  assert.match(source, /No fue posible cargar los usuarios/);
  assert.match(source, /La falla de la fuente no se interpreta como una lista vacía/);
  assert.match(source, /setError\(/);
});

test('admin user deletion surfaces server failures before mutating local list', async () => {
  const source = await readFile(usersListUrl, 'utf8');
  const responseCheck = source.indexOf("if (!response.ok)");
  const localRemoval = source.indexOf('setUsers((current) => current.filter');
  assert.ok(responseCheck >= 0 && localRemoval > responseCheck);
  assert.match(source, /No fue posible completar la acción/);
});
