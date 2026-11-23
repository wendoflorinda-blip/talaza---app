-- Admin storefronts may submit hosting payments and proofs.
-- Remove the legacy trigger guard that explicitly blocked account_type=admin_store.
CREATE OR REPLACE FUNCTION private.talaza_block_admin_store_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
BEGIN
  -- Payment proof submissions for admin-created stores are now allowed.
  -- Preserve the trigger and helper function name to avoid changing unrelated trigger wiring.
  RETURN NEW;
END;
$function$;
