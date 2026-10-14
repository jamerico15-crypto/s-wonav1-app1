-- =====================================================================
-- MEAL Management System — Esquema Completo da Base de Dados
-- Projeto: vzfkrxfhurpjskfkwyqm
-- 13 tabelas com chaves primárias UUID, chaves estrangeiras,
-- índices, RLS e policies.
-- Seguro de executar: usa IF NOT EXISTS (skip se a tabela já existir).
-- =====================================================================

-- ============================================================
-- 1. ROLES — Papéis dos utilizadores (Admin, MEAL Coordinator, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.roles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    description text,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='roles_name_key') THEN
        CREATE UNIQUE INDEX roles_name_key ON public.roles (name);
    END IF;
END $$;

-- ============================================================
-- 2. PERMISSIONS — Permissões por módulo e papel
-- ============================================================
CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    module text NOT NULL,
    can_create boolean NOT NULL DEFAULT false,
    can_read boolean NOT NULL DEFAULT false,
    can_update boolean NOT NULL DEFAULT false,
    can_delete boolean NOT NULL DEFAULT false,
    can_visualize boolean NOT NULL DEFAULT false
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='permissions_role_id_module_key') THEN
        CREATE UNIQUE INDEX permissions_role_id_module_key ON public.permissions (role_id, module);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_permissions_role_id') THEN
        CREATE INDEX idx_permissions_role_id ON public.permissions (role_id);
    END IF;
END $$;

-- ============================================================
-- 3. PROFILES — Perfis dos utilizadores (ligados ao auth.uid)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL PRIMARY KEY,
    full_name text,
    role_id uuid REFERENCES public.roles(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 4. DISTRICTS — Distritos e províncias
-- ============================================================
CREATE TABLE IF NOT EXISTS public.districts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    province text,
    created_at timestamptz DEFAULT now()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='districts_name_key') THEN
        CREATE UNIQUE INDEX districts_name_key ON public.districts (name);
    END IF;
END $$;

-- ============================================================
-- 5. PROJECTS — Projetos da organização
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    description text,
    district_ids uuid[] DEFAULT '{}',
    objectives text,
    inputs text,
    target_indicators text,
    outcomes text,
    budget numeric DEFAULT 0,
    budget_spent numeric DEFAULT 0,
    status text NOT NULL DEFAULT 'planned',
    phase text,
    start_date date,
    end_date date,
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    currency text NOT NULL DEFAULT 'MZN',
    exchange_rate numeric NOT NULL DEFAULT 1.0,
    budget_mzn numeric NOT NULL DEFAULT 0,
    province text
);

-- ============================================================
-- 6. INDICATORS — Indicadores dos projetos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.indicators (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    baseline_value numeric DEFAULT 0,
    target_value numeric DEFAULT 0,
    current_value numeric DEFAULT 0,
    unit text,
    disaggregation text,
    category text DEFAULT 'output',
    created_at timestamptz DEFAULT now()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_indicators_project_id') THEN
        CREATE INDEX idx_indicators_project_id ON public.indicators (project_id);
    END IF;
END $$;

-- ============================================================
-- 7. ACTIVITIES — Atividades dos projetos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.activities (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'planned',
    progress integer NOT NULL DEFAULT 0,
    start_date date,
    end_date date,
    milestone boolean NOT NULL DEFAULT false,
    created_at timestamptz DEFAULT now(),
    activity_type text NOT NULL DEFAULT 'other',
    budget numeric NOT NULL DEFAULT 0,
    budget_spent numeric NOT NULL DEFAULT 0
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_activities_project_id') THEN
        CREATE INDEX idx_activities_project_id ON public.activities (project_id);
    END IF;
END $$;

-- ============================================================
-- 8. BENEFICIARIES — Beneficiários atingidos por projeto/distrito
-- ============================================================
CREATE TABLE IF NOT EXISTS public.beneficiaries (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    district_id uuid NOT NULL REFERENCES public.districts(id) ON DELETE RESTRICT,
    total_reached integer NOT NULL DEFAULT 0,
    male integer NOT NULL DEFAULT 0,
    female integer NOT NULL DEFAULT 0,
    disability_grade1 integer NOT NULL DEFAULT 0,
    disability_grade2 integer NOT NULL DEFAULT 0,
    age_group text,
    date_recorded date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_beneficiaries_project_id') THEN
        CREATE INDEX idx_beneficiaries_project_id ON public.beneficiaries (project_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_beneficiaries_district_id') THEN
        CREATE INDEX idx_beneficiaries_district_id ON public.beneficiaries (district_id);
    END IF;
END $$;

-- ============================================================
-- 9. BRANDING — Logótipo, nome, cores e fonte da aplicação
-- ============================================================
CREATE TABLE IF NOT EXISTS public.branding (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    logo_url text,
    primary_label text NOT NULL DEFAULT 'Moçambique',
    secondary_label text NOT NULL DEFAULT 'Missão contra a Lepra',
    base_font text NOT NULL DEFAULT 'Inter',
    primary_color text NOT NULL DEFAULT '#EE3A25',
    secondary_color text NOT NULL DEFAULT '#711246',
    updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 10. APP_CONFIG — Tema (cores) e rodapé da aplicação
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_config (
    id integer NOT NULL DEFAULT 1 PRIMARY KEY,
    theme jsonb NOT NULL DEFAULT '{"sidebar_bg": "#1a1a2e", "text_color": "#1e293b", "sidebar_text": "#ffffff", "primary_color": "#EE3A25", "secondary_color": "#711246", "widget_header_bg": "#f8fafc"}'::jsonb,
    footer jsonb NOT NULL DEFAULT '{"contact_email": "", "contact_phone": "", "office_address": "", "custom_footer_text": "", "institutional_description": ""}'::jsonb,
    updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 11. CUSTOM_SCHEMAS — Esquemas personalizados gerados pelo utilizador
-- ============================================================
CREATE TABLE IF NOT EXISTS public.custom_schemas (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    prompt text NOT NULL,
    proposal jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'draft',
    table_name text,
    created_by uuid,
    created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 12. KOBO_CONNECTIONS — Ligações ao KoboToolbox
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kobo_connections (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    api_url text NOT NULL,
    api_token text NOT NULL,
    username text,
    is_active boolean NOT NULL DEFAULT true,
    last_synced_at timestamptz,
    created_by uuid,
    created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 13. KOBO_IMPORTS — Importações de dados do KoboToolbox
-- ============================================================
CREATE TABLE IF NOT EXISTS public.kobo_imports (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    connection_id uuid REFERENCES public.kobo_connections(id) ON DELETE CASCADE,
    form_id text NOT NULL,
    form_name text NOT NULL,
    field_mapping jsonb,
    generated_table_name text,
    submission_count integer DEFAULT 0,
    status text NOT NULL DEFAULT 'pending',
    error_message text,
    created_by uuid,
    created_at timestamptz DEFAULT now()
);

-- =====================================================================
-- ROW LEVEL SECURITY — Ativar em todas as tabelas
-- =====================================================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kobo_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kobo_imports ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- POLICIES — Leitura pública para branding e app_config;
-- authenticated para todas as operações nas restantes tabelas.
-- =====================================================================

-- BRANDING: leitura pública (anon + authenticated), escrita authenticated
DO $$ BEGIN
    DROP POLICY IF EXISTS "read_branding_public" ON public.branding;
    CREATE POLICY "read_branding_public" ON public.branding FOR SELECT TO anon, authenticated USING (true);
END $$;
DO $$ BEGIN
    DROP POLICY IF EXISTS "insert_branding_authenticated" ON public.branding;
    CREATE POLICY "insert_branding_authenticated" ON public.branding FOR INSERT TO authenticated WITH CHECK (true);
END $$;
DO $$ BEGIN
    DROP POLICY IF EXISTS "update_branding_authenticated" ON public.branding;
    CREATE POLICY "update_branding_authenticated" ON public.branding FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
END $$;
DO $$ BEGIN
    DROP POLICY IF EXISTS "delete_branding_authenticated" ON public.branding;
    CREATE POLICY "delete_branding_authenticated" ON public.branding FOR DELETE TO authenticated USING (true);
END $$;

-- APP_CONFIG: leitura pública (anon + authenticated), escrita authenticated
DO $$ BEGIN
    DROP POLICY IF EXISTS "read_app_config_public" ON public.app_config;
    CREATE POLICY "read_app_config_public" ON public.app_config FOR SELECT TO anon, authenticated USING (true);
END $$;
DO $$ BEGIN
    DROP POLICY IF EXISTS "insert_app_config_authenticated" ON public.app_config;
    CREATE POLICY "insert_app_config_authenticated" ON public.app_config FOR INSERT TO authenticated WITH CHECK (true);
END $$;
DO $$ BEGIN
    DROP POLICY IF EXISTS "update_app_config_authenticated" ON public.app_config;
    CREATE POLICY "update_app_config_authenticated" ON public.app_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
END $$;
DO $$ BEGIN
    DROP POLICY IF EXISTS "delete_app_config_authenticated" ON public.app_config;
    CREATE POLICY "delete_app_config_authenticated" ON public.app_config FOR DELETE TO authenticated USING (true);
END $$;

-- Tabelas autenticadas: SELECT, INSERT, UPDATE, DELETE para authenticated
-- (aplicar a: roles, permissions, profiles, districts, projects,
--  indicators, activities, beneficiaries, custom_schemas,
--  kobo_connections, kobo_imports)
DO $$
DECLARE
    tbl text;
    pfx text;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'roles','permissions','profiles','districts','projects',
        'indicators','activities','beneficiaries','custom_schemas',
        'kobo_connections','kobo_imports'
    ] LOOP
        pfx := tbl;
        -- SELECT
        EXECUTE format('DROP POLICY IF EXISTS "read_%s_authenticated" ON public.%I', pfx, tbl);
        EXECUTE format('CREATE POLICY "read_%s_authenticated" ON public.%I FOR SELECT TO authenticated USING (true)', pfx, tbl);
        -- INSERT
        EXECUTE format('DROP POLICY IF EXISTS "insert_%s_authenticated" ON public.%I', pfx, tbl);
        EXECUTE format('CREATE POLICY "insert_%s_authenticated" ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', pfx, tbl);
        -- UPDATE
        EXECUTE format('DROP POLICY IF EXISTS "update_%s_authenticated" ON public.%I', pfx, tbl);
        EXECUTE format('CREATE POLICY "update_%s_authenticated" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', pfx, tbl);
        -- DELETE
        EXECUTE format('DROP POLICY IF EXISTS "delete_%s_authenticated" ON public.%I', pfx, tbl);
        EXECUTE format('CREATE POLICY "delete_%s_authenticated" ON public.%I FOR DELETE TO authenticated USING (true)', pfx, tbl);
    END LOOP;
END $$;
