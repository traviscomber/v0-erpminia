'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type ReadinessCheck = {
  key: string;
  ready: boolean;
};

type SiiReadiness = {
  readyForCertification: boolean;
  readyForProduction: boolean;
  acceptedCertificationDtes: number;
  checks: ReadinessCheck[];
};

type Step = {
  number: number;
  title: string;
  description: string;
  href: string;
  done: boolean;
};

const ROOT_PATH = '/dashboard/administracion/sii';

export function SiiSetupNavigator() {
  const pathname = usePathname();
  const [readiness, setReadiness] = useState<SiiReadiness | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch('/api/sii/readiness', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as SiiReadiness;
      })
      .then((data) => {
        if (!cancelled && data) setReadiness(data);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const checkMap = useMemo(
    () => new Map((readiness?.checks || []).map((check) => [check.key, check.ready])),
    [readiness],
  );

  const connectionDone = Boolean(
    checkMap.get('company_identity') &&
      checkMap.get('certificate') &&
      checkMap.get('authentication') &&
      checkMap.get('caf_33'),
  );
  const profileDone = Boolean(checkMap.get('issuer_profile'));

  const steps: Step[] = [
    {
      number: 1,
      title: 'Conectar SII',
      description: 'RUT, certificado, autenticación y CAF 33',
      href: ROOT_PATH,
      done: connectionDone,
    },
    {
      number: 2,
      title: 'Perfil tributario',
      description: 'Firmante, giro, ACTECO y resolución',
      href: `${ROOT_PATH}/perfil`,
      done: profileDone,
    },
    {
      number: 3,
      title: 'Revisar y activar',
      description: 'Checklist, certificación y habilitación',
      href: `${ROOT_PATH}/preparacion`,
      done: readiness?.readyForCertification === true,
    },
  ];

  const nextAction = getNextAction(checkMap, readiness);
  const showRequirements = pathname === ROOT_PATH;

  return (
    <div className="mx-auto max-w-5xl px-6 pt-6">
      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Configura el SII en 3 pasos</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Sigue el orden indicado. Motil te muestra qué falta y no habilita producción hasta completar la certificación real.
            </p>
          </div>
          <Link
            href={`${ROOT_PATH}/demo`}
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Ir al demo seguro
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {steps.map((step) => {
            const active = pathname === step.href;
            return (
              <Link
                key={step.number}
                href={step.href}
                aria-current={active ? 'step' : undefined}
                className={`flex gap-3 rounded-lg border p-4 transition-colors ${
                  active ? 'border-foreground bg-muted/40' : 'bg-background hover:bg-muted/30'
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                    step.done ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : ''
                  }`}
                >
                  {step.done ? '✓' : step.number}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">Paso {step.number} · {step.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{step.description}</span>
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-4 rounded-lg border bg-muted/20 p-4" aria-live="polite">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Siguiente acción</p>
          <p className="mt-1 text-sm font-semibold">{nextAction.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{nextAction.detail}</p>
        </div>
      </section>

      {showRequirements ? (
        <section className="mt-4 rounded-xl border border-dashed p-5">
          <h3 className="font-semibold">Antes de comenzar, ten a mano</h3>
          <div className="mt-3 grid gap-x-6 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2">
            <Requirement text="RUT de la empresa emisora" />
            <Requirement text="Certificado digital vigente .PFX o .P12" />
            <Requirement text="Contraseña del certificado" />
            <Requirement text="RUT del firmante autorizado" />
            <Requirement text="Razón social, giro, ACTECO, dirección y resolución SII" />
            <Requirement text="CAF DTE 33 en XML descargado desde el SII" />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            La contraseña se usa sólo para importar el certificado y no se conserva. No la envíes por correo o mensajería.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function Requirement({ text }: { text: string }) {
  return (
    <div className="flex gap-2">
      <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/60" />
      <span>{text}</span>
    </div>
  );
}

function getNextAction(checks: Map<string, boolean>, readiness: SiiReadiness | null) {
  if (!readiness) {
    return {
      label: 'Revisa el estado de configuración',
      detail: 'Motil cargará el checklist y te indicará exactamente qué falta.',
    };
  }

  if (!checks.get('company_identity') || !checks.get('certificate')) {
    return {
      label: 'Carga el RUT y el certificado digital',
      detail: 'Usa el archivo PFX/P12 del firmante y su contraseña.',
    };
  }

  if (!checks.get('authentication')) {
    return {
      label: 'Prueba la autenticación con el SII',
      detail: 'Motil firmará la semilla y comprobará que el certificado obtiene token.',
    };
  }

  if (!checks.get('caf_33')) {
    return {
      label: 'Carga el CAF de Factura Electrónica 33',
      detail: 'Selecciona el XML de folios descargado directamente desde el SII.',
    };
  }

  if (!checks.get('issuer_profile')) {
    return {
      label: 'Completa el perfil tributario',
      detail: 'Ingresa firmante, razón social, giro, ACTECO, dirección y resolución.',
    };
  }

  if (!readiness.readyForProduction) {
    return {
      label: 'Revisa el checklist y completa la certificación',
      detail: readiness.acceptedCertificationDtes > 0
        ? 'La evidencia de certificación existe; revisa el gate antes de producción.'
        : 'Producción seguirá bloqueada hasta que exista un DTE 33 aceptado en certificación.',
    };
  }

  return {
    label: 'Configuración SII completa',
    detail: 'Los requisitos técnicos y la evidencia de certificación están completos.',
  };
}
