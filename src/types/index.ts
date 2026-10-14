export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface Permission {
  id: string;
  role_id: string;
  module: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_visualize: boolean;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email?: string | null;
  role: string | null;
  role_id?: string | null;
  created_at: string;
}

export interface District {
  id: string;
  name: string;
  province: string | null;
  created_at: string;
}

export interface ProjectDistrict {
  id: string;
  project_id: string;
  district_id: string;
  created_at: string;
}

export interface ProjectAssignment {
  user_id: string;
  project_id: string;
  created_at: string;
}

export interface Project {
  id: string;
  title: string;
  description: string | null;
  district_ids: string[];
  objectives: string | null;
  inputs: string | null;
  target_indicators: string | null;
  outcomes: string | null;
  budget: number;
  budget_spent: number;
  budget_mzn: number;
  currency: string;
  exchange_rate: number;
  province: string | null;
  status: 'planned' | 'ongoing' | 'delayed' | 'completed';
  phase: string | null;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
  indicators?: Indicator[];
  activities?: Activity[];
  beneficiaries?: Beneficiary[];
}

export interface Indicator {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  baseline_value: number;
  target_value: number;
  current_value: number;
  unit: string | null;
  disaggregation: string | null;
  category: string;
  created_at: string;
}

export interface Activity {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'planned' | 'ongoing' | 'delayed' | 'completed';
  progress: number;
  start_date: string | null;
  end_date: string | null;
  milestone: boolean;
  activity_type: string;
  budget: number;
  budget_spent: number;
  created_at: string;
  project?: Project;
}

export interface Beneficiary {
  id: string;
  project_id: string;
  district_id: string;
  total_reached: number;
  male: number;
  female: number;
  disability_grade1: number;
  disability_grade2: number;
  age_group: string | null;
  date_recorded: string;
  created_at: string;
  district?: District;
}

export interface Branding {
  id: string;
  logo_url: string | null;
  primary_label: string;
  secondary_label: string;
  base_font: string;
  primary_color: string;
  secondary_color: string;
  updated_at: string;
}

export interface CustomSchema {
  id: string;
  prompt: string;
  proposal: SchemaProposal;
  status: 'draft' | 'applied';
  table_name: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SchemaColumn {
  name: string;
  type: string;
  is_primary: boolean;
  is_foreign: boolean;
  foreign_table?: string;
  foreign_column?: string;
  nullable: boolean;
  default?: string;
}

export interface SchemaTable {
  name: string;
  description: string;
  columns: SchemaColumn[];
}

export interface SchemaProposal {
  tables: SchemaTable[];
  relationships: string[];
}

export interface AppConfig {
  id: number;
  theme: ThemeConfig;
  footer: FooterConfig;
  updated_at: string;
}

export interface ThemeConfig {
  primary_color: string;
  secondary_color: string;
  sidebar_bg: string;
  sidebar_text: string;
  widget_header_bg: string;
  text_color: string;
}

export interface FooterConfig {
  office_address: string;
  contact_phone: string;
  contact_email: string;
  institutional_description: string;
  custom_footer_text: string;
}

export interface KoboConnection {
  id: string;
  name: string;
  api_url: string;
  api_token: string;
  username: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface KoboImport {
  id: string;
  connection_id: string | null;
  form_id: string;
  form_name: string;
  field_mapping: Record<string, string> | null;
  generated_table_name: string | null;
  submission_count: number;
  status: string;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
}

export interface KoboFormConfig {
  id: string;
  connection_id: string;
  kobo_form_id: string;
  form_name: string;
  fields_schema: Array<{ name: string; type: string; label: string }>;
  is_active: boolean;
  deployed_at: string;
  last_synced_at: string | null;
  created_at: string;
}

export interface KoboUniversalSubmission {
  id: string;
  form_config_id: string;
  kobo_form_id: string;
  kobo_submission_id: string;
  submitted_at: string | null;
  answers: Record<string, unknown>;
  synced_at: string;
}

export type ModuleName =
  | 'projects'
  | 'indicators'
  | 'activities'
  | 'beneficiaries'
  | 'users'
  | 'branding'
  | 'schema_generator'
  | 'dashboard'
  | 'districts'
  | 'database_explorer'
  | 'kobo'
  | 'reports'
  | 'theme';

export type CrudAction = 'create' | 'read' | 'update' | 'delete' | 'visualize';
