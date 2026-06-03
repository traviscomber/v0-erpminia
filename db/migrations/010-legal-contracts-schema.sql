-- Legal contracts schema reconciliation for MVP
-- Compatible with legacy contracts tables already present in the database.

ALTER TABLE IF EXISTS public.user_roles
    ADD COLUMN IF NOT EXISTS organization_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_roles_organization_id_fkey'
    ) THEN
        ALTER TABLE public.user_roles
            ADD CONSTRAINT user_roles_organization_id_fkey
            FOREIGN KEY (organization_id)
            REFERENCES public.organizations(id)
            ON DELETE CASCADE
            NOT VALID;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_roles_organization_id
    ON public.user_roles(organization_id);

CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE public.contracts
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS contract_number TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS contract_type TEXT DEFAULT 'Principal',
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'En Revisión',
    ADD COLUMN IF NOT EXISTS contract_value NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CLP',
    ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS end_date DATE,
    ADD COLUMN IF NOT EXISTS review_due_date DATE,
    ADD COLUMN IF NOT EXISTS responsible_person TEXT,
    ADD COLUMN IF NOT EXISTS responsible_area TEXT,
    ADD COLUMN IF NOT EXISTS contractor_name TEXT,
    ADD COLUMN IF NOT EXISTS property_name TEXT,
    ADD COLUMN IF NOT EXISTS project_name TEXT,
    ADD COLUMN IF NOT EXISTS royalty_rate NUMERIC(8,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS guarantee_amount NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'Pendiente',
    ADD COLUMN IF NOT EXISTS compliance_notes TEXT,
    ADD COLUMN IF NOT EXISTS file_url TEXT,
    ADD COLUMN IF NOT EXISTS file_path TEXT,
    ADD COLUMN IF NOT EXISTS file_name TEXT,
    ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS file_mime_type TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

UPDATE public.contracts
SET
    status = COALESCE(status, 'En Revisión'),
    currency = COALESCE(currency, 'CLP'),
    paid_amount = COALESCE(paid_amount, 0),
    contract_value = COALESCE(contract_value, 0),
    royalty_rate = COALESCE(royalty_rate, 0),
    guarantee_amount = COALESCE(guarantee_amount, 0),
    compliance_status = COALESCE(compliance_status, 'Pendiente'),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW());

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'uq_contracts_org_contract_number'
    ) THEN
        CREATE UNIQUE INDEX uq_contracts_org_contract_number
            ON public.contracts(organization_id, contract_number)
            WHERE organization_id IS NOT NULL
              AND contract_number IS NOT NULL;
    END IF;
END $$;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contracts_org_isolation ON public.contracts;
CREATE POLICY contracts_org_isolation ON public.contracts
    USING (
        organization_id IN (
            SELECT organization_id
            FROM public.user_roles
            WHERE user_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_contracts_organization_id
    ON public.contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status
    ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date
    ON public.contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number
    ON public.contracts(contract_number);
