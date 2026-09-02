-- 1. Add is_primary column
ALTER TABLE public.birth_charts
ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false;

-- 2. Backfill: oldest chart per user becomes primary
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) AS rn
  FROM public.birth_charts
)
UPDATE public.birth_charts bc
SET is_primary = true
FROM ranked r
WHERE bc.id = r.id AND r.rn = 1;

-- 3. Partial unique index: at most one primary per user
CREATE UNIQUE INDEX IF NOT EXISTS birth_charts_one_primary_per_user
ON public.birth_charts (user_id)
WHERE is_primary = true;

-- 4. Trigger function: when a chart is set primary, demote others for that user
CREATE OR REPLACE FUNCTION public.enforce_single_primary_chart()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.birth_charts
    SET is_primary = false
    WHERE user_id = NEW.user_id
      AND id <> NEW.id
      AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_primary_chart ON public.birth_charts;
CREATE TRIGGER trg_enforce_single_primary_chart
BEFORE INSERT OR UPDATE OF is_primary ON public.birth_charts
FOR EACH ROW
WHEN (NEW.is_primary = true)
EXECUTE FUNCTION public.enforce_single_primary_chart();

-- 5. Trigger function: ensure user always has a primary chart
-- 5a. On insert, if user has no primary chart, make this one primary
CREATE OR REPLACE FUNCTION public.ensure_primary_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary = false THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.birth_charts
      WHERE user_id = NEW.user_id AND is_primary = true AND id <> NEW.id
    ) THEN
      NEW.is_primary := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_primary_on_insert ON public.birth_charts;
CREATE TRIGGER trg_ensure_primary_on_insert
BEFORE INSERT ON public.birth_charts
FOR EACH ROW
EXECUTE FUNCTION public.ensure_primary_on_insert();

-- 5b. On delete of primary chart, promote the most recent remaining chart
CREATE OR REPLACE FUNCTION public.promote_after_primary_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_primary = true THEN
    UPDATE public.birth_charts
    SET is_primary = true
    WHERE id = (
      SELECT id FROM public.birth_charts
      WHERE user_id = OLD.user_id
      ORDER BY created_at DESC
      LIMIT 1
    );
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_promote_after_primary_delete ON public.birth_charts;
CREATE TRIGGER trg_promote_after_primary_delete
AFTER DELETE ON public.birth_charts
FOR EACH ROW
EXECUTE FUNCTION public.promote_after_primary_delete();