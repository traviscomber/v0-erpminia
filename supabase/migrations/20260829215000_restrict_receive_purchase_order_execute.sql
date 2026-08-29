-- Restrict legacy procurement receipt mutation to trusted server-side callers.
-- The API route already enforces FIN_COMPRAS write access; direct Data API
-- execution by authenticated users must not bypass that authorization boundary.

REVOKE EXECUTE ON FUNCTION public.receive_purchase_order(uuid, jsonb, text, uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.receive_purchase_order(uuid, jsonb, text, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.receive_purchase_order(uuid, jsonb, text, uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order(uuid, jsonb, text, uuid, text, text) TO service_role;
