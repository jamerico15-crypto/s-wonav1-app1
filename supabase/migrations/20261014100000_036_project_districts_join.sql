-- Project-scoped district coverage.
-- Keep projects.district_ids synchronized for compatibility with existing app code.
CREATE TABLE IF NOT EXISTS public.project_districts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_districts_project_district_key UNIQUE (project_id, district_id)
);

CREATE INDEX IF NOT EXISTS project_districts_district_id_idx
  ON public.project_districts (district_id);

-- Preserve the links already stored in projects.district_ids.
INSERT INTO public.project_districts (project_id, district_id)
SELECT p.id, district_id
FROM public.projects AS p
 CROSS JOIN LATERAL unnest(COALESCE(p.district_ids, ARRAY[]::uuid[])) AS u(district_id)
WHERE district_id IS NOT NULL
ON CONFLICT (project_id, district_id) DO NOTHING;

-- Preserve district/project pairs already represented by beneficiary records.
INSERT INTO public.project_districts (project_id, district_id)
SELECT DISTINCT b.project_id, b.district_id
FROM public.beneficiaries AS b
ON CONFLICT (project_id, district_id) DO NOTHING;

-- A beneficiary may only be recorded in a district covered by that project.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'beneficiaries_project_district_fkey'
      AND conrelid = 'public.beneficiaries'::regclass
  ) THEN
    ALTER TABLE public.beneficiaries
      ADD CONSTRAINT beneficiaries_project_district_fkey
      FOREIGN KEY (project_id, district_id)
      REFERENCES public.project_districts (project_id, district_id)
      ON DELETE RESTRICT;
  END IF;
END $$;

ALTER TABLE public.project_districts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_project_districts_authenticated" ON public.project_districts;
CREATE POLICY "read_project_districts_authenticated"
  ON public.project_districts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_project_districts_authenticated" ON public.project_districts;
CREATE POLICY "insert_project_districts_authenticated"
  ON public.project_districts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "delete_project_districts_authenticated" ON public.project_districts;
CREATE POLICY "delete_project_districts_authenticated"
  ON public.project_districts FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT, DELETE ON public.project_districts TO authenticated;

-- District rows may only be created as part of a project's coverage.
DROP POLICY IF EXISTS "insert_districts_authenticated" ON public.districts;
DROP POLICY IF EXISTS "insert_districts_public" ON public.districts;
REVOKE INSERT ON public.districts FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.add_project_district(
  p_project_id uuid,
  p_district_name text,
  p_province text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_district_id uuid;
  project_province text;
BEGIN
  SELECT province INTO project_province
  FROM public.projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;

  IF project_province IS DISTINCT FROM p_province THEN
    RAISE EXCEPTION 'District province must match the project province';
  END IF;

  INSERT INTO public.districts (name, province)
  VALUES (trim(p_district_name), p_province)
  ON CONFLICT (name, province) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO resolved_district_id;

  INSERT INTO public.project_districts (project_id, district_id)
  VALUES (p_project_id, resolved_district_id)
  ON CONFLICT (project_id, district_id) DO NOTHING;

  RETURN resolved_district_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_project_district(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_project_district(uuid, text, text) TO authenticated;
