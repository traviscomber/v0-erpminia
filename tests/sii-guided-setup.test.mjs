import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const navigator = fs.readFileSync('components/sii/sii-setup-navigator.tsx', 'utf8');
const layout = fs.readFileSync('app/dashboard/administracion/sii/layout.tsx', 'utf8');

test('SII configuration is presented as a simple three-step flow', () => {
  assert.match(navigator, /Configura el SII en 3 pasos/);
  assert.match(navigator, /Paso \{step\.number\}/);
  assert.match(navigator, /Conectar SII/);
  assert.match(navigator, /Perfil tributario/);
  assert.match(navigator, /Revisar y activar/);
  assert.match(navigator, /Siguiente acción/);
  assert.doesNotMatch(navigator, />\s*Continuar\s*</);
  assert.match(layout, /SiiSetupNavigator/);
});

test('client requirements are explicit before configuration starts', () => {
  for (const requirement of [
    'RUT de la empresa emisora',
    'Certificado digital vigente .PFX o .P12',
    'Contraseña del certificado',
    'RUT del firmante autorizado',
    'Razón social, giro, ACTECO, dirección y resolución SII',
    'CAF DTE 33 en XML descargado desde el SII',
  ]) {
    assert.match(navigator, new RegExp(requirement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(navigator, /no se conserva/);
  assert.match(navigator, /No la envíes por correo o mensajería/);
});

test('next action is driven by real SII readiness and demo stays outside fiscal setup', () => {
  assert.match(navigator, /fetch\('\/api\/sii\/readiness'/);
  for (const key of ['company_identity', 'certificate', 'authentication', 'caf_33', 'issuer_profile']) {
    assert.match(navigator, new RegExp(key));
  }
  assert.match(navigator, /readyForProduction/);
  assert.match(navigator, /acceptedCertificationDtes/);
  assert.match(navigator, /Ir al demo seguro/);
  assert.match(navigator, /Producción seguirá bloqueada hasta que exista un DTE 33 aceptado en certificación/);
});
