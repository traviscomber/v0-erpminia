-- EECC (Empresas de Servicios Complementarios) catalog schema
-- Stores the roster of contractor companies used across the contracts module.

CREATE TABLE IF NOT EXISTS public.eecc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rut TEXT,
    representative TEXT,
    email TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Unique RUT per organization (when both present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'uq_eecc_org_rut'
    ) THEN
        CREATE UNIQUE INDEX uq_eecc_org_rut
            ON public.eecc(organization_id, rut)
            WHERE organization_id IS NOT NULL AND rut IS NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_eecc_organization_id ON public.eecc(organization_id);
CREATE INDEX IF NOT EXISTS idx_eecc_name ON public.eecc(name);
CREATE INDEX IF NOT EXISTS idx_eecc_is_active ON public.eecc(is_active);

ALTER TABLE public.eecc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eecc_org_isolation ON public.eecc;
CREATE POLICY eecc_org_isolation ON public.eecc
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.user_roles
            WHERE user_id = auth.uid()
        )
    );

-- Optional link from contracts to an EECC record
ALTER TABLE public.contracts
    ADD COLUMN IF NOT EXISTS eecc_id UUID REFERENCES public.eecc(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_eecc_id ON public.contracts(eecc_id);
