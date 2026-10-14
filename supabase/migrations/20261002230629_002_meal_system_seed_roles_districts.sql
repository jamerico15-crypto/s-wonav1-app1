/*
# MEAL System - Seed Data: Roles, Permissions, Districts, Branding

## Overview
Seeds the database with initial roles, permission matrices, districts, and default branding.

## Data Created
1. **Roles**: Admin, MEAL Officer, Project Manager, Field Volunteer (all system roles)
2. **Permissions**: Full CRUD+visualize for Admin on all modules; appropriate subsets for other roles
3. **Districts**: Alto Molócuè, Namarroi (Zambézia province)
4. **Branding**: Default institutional branding row
*/

-- ============================================
-- SEED ROLES
-- ============================================
INSERT INTO roles (name, description, is_system) VALUES
  ('Admin', 'Full system access including user management, branding, and schema generation', true),
  ('MEAL Officer', 'Manage indicators, activities, and view analytics dashboards', true),
  ('Project Manager', 'Manage projects, activities, and view project-level analytics', true),
  ('Field Volunteer', 'Record beneficiary data and view assigned project activities', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SEED PERMISSIONS
-- ============================================
DO $$
DECLARE
  admin_role uuid;
  meal_role uuid;
  pm_role uuid;
  fv_role uuid;
BEGIN
  SELECT id INTO admin_role FROM roles WHERE name = 'Admin';
  SELECT id INTO meal_role FROM roles WHERE name = 'MEAL Officer';
  SELECT id INTO pm_role FROM roles WHERE name = 'Project Manager';
  SELECT id INTO fv_role FROM roles WHERE name = 'Field Volunteer';

  -- Admin: full access to everything
  INSERT INTO permissions (role_id, module, can_create, can_read, can_update, can_delete, can_visualize) VALUES
    (admin_role, 'projects', true, true, true, true, true),
    (admin_role, 'indicators', true, true, true, true, true),
    (admin_role, 'activities', true, true, true, true, true),
    (admin_role, 'beneficiaries', true, true, true, true, true),
    (admin_role, 'users', true, true, true, true, true),
    (admin_role, 'branding', true, true, true, true, true),
    (admin_role, 'schema_generator', true, true, true, true, true),
    (admin_role, 'dashboard', false, true, false, false, true),
    (admin_role, 'districts', true, true, true, true, true)
  ON CONFLICT (role_id, module) DO NOTHING;

  -- MEAL Officer: indicators, activities, beneficiaries, dashboard
  INSERT INTO permissions (role_id, module, can_create, can_read, can_update, can_delete, can_visualize) VALUES
    (meal_role, 'projects', false, true, false, false, true),
    (meal_role, 'indicators', true, true, true, true, true),
    (meal_role, 'activities', true, true, true, false, true),
    (meal_role, 'beneficiaries', true, true, true, false, true),
    (meal_role, 'users', false, true, false, false, false),
    (meal_role, 'branding', false, true, false, false, false),
    (meal_role, 'schema_generator', false, true, false, false, false),
    (meal_role, 'dashboard', false, true, false, false, true),
    (meal_role, 'districts', false, true, false, false, true)
  ON CONFLICT (role_id, module) DO NOTHING;

  -- Project Manager: projects, activities, dashboard
  INSERT INTO permissions (role_id, module, can_create, can_read, can_update, can_delete, can_visualize) VALUES
    (pm_role, 'projects', true, true, true, false, true),
    (pm_role, 'indicators', true, true, true, false, true),
    (pm_role, 'activities', true, true, true, false, true),
    (pm_role, 'beneficiaries', true, true, true, false, true),
    (pm_role, 'users', false, true, false, false, false),
    (pm_role, 'branding', false, true, false, false, false),
    (pm_role, 'schema_generator', false, true, false, false, false),
    (pm_role, 'dashboard', false, true, false, false, true),
    (pm_role, 'districts', false, true, false, false, true)
  ON CONFLICT (role_id, module) DO NOTHING;

  -- Field Volunteer: beneficiaries read/create, activities read, dashboard view
  INSERT INTO permissions (role_id, module, can_create, can_read, can_update, can_delete, can_visualize) VALUES
    (fv_role, 'projects', false, true, false, false, false),
    (fv_role, 'indicators', false, true, false, false, false),
    (fv_role, 'activities', false, true, false, false, false),
    (fv_role, 'beneficiaries', true, true, true, false, false),
    (fv_role, 'users', false, false, false, false, false),
    (fv_role, 'branding', false, true, false, false, false),
    (fv_role, 'schema_generator', false, false, false, false, false),
    (fv_role, 'dashboard', false, true, false, false, true),
    (fv_role, 'districts', false, true, false, false, false)
  ON CONFLICT (role_id, module) DO NOTHING;
END $$;

-- ============================================
-- SEED DISTRICTS
-- ============================================
INSERT INTO districts (name, province) VALUES
  ('Alto Molócuè', 'Zambézia'),
  ('Namarroi', 'Zambézia')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- SEED BRANDING
-- ============================================
INSERT INTO branding (primary_label, secondary_label, base_font, primary_color, secondary_color)
VALUES ('Moçambique', 'Missão contra a Lepra', 'Inter', '#EE3A25', '#711246')
ON CONFLICT DO NOTHING;