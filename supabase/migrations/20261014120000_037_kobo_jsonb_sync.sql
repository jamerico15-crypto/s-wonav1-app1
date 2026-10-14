-- Dynamic Kobo form registry and universal JSONB submission store.
CREATE TABLE IF NOT EXISTS public.kobo_forms_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.kobo_connections(id) ON DELETE CASCADE,
  kobo_form_id text NOT NULL,
  form_name text NOT NULL,
  fields_schema jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  deployed_at timestamptz NOT NULL DEFAULT now(),
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kobo_forms_config_connection_form_key UNIQUE (connection_id, kobo_form_id)
);

CREATE TABLE IF NOT EXISTS public.kobo_universal_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_config_id uuid NOT NULL REFERENCES public.kobo_forms_config(id) ON DELETE CASCADE,
  kobo_form_id text NOT NULL,
  kobo_submission_id text NOT NULL,
  submitted_at timestamptz,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kobo_universal_submissions_form_submission_key UNIQUE (form_config_id, kobo_submission_id)
);

CREATE INDEX IF NOT EXISTS kobo_universal_submissions_config_submitted_idx
  ON public.kobo_universal_submissions (form_config_id, submitted_at DESC);

ALTER TABLE public.kobo_forms_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kobo_universal_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kobo_forms_config_authenticated_all" ON public.kobo_forms_config;
CREATE POLICY "kobo_forms_config_authenticated_all"
  ON public.kobo_forms_config FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "kobo_universal_submissions_authenticated_all" ON public.kobo_universal_submissions;
CREATE POLICY "kobo_universal_submissions_authenticated_all"
  ON public.kobo_universal_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kobo_forms_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kobo_universal_submissions TO authenticated;
