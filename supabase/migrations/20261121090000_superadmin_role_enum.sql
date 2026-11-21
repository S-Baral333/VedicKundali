-- Add the `superadmin` role.
--
-- Kept in its own migration: Postgres cannot use a new enum value in the same
-- transaction that adds it, and the next migration (has_role, guards, grant)
-- refers to 'superadmin'.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';
