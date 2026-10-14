/*
# MEAL System - Seed Data: Projects, Indicators, Activities, Beneficiaries

## Overview
Seeds baseline project data based on real project reports for "Missão contra a Lepra Moçambique".

## Data Created

1. **Project: OLIKANASSA**
   - Continuous phase in Alto Molócuè and Namarroi
   - Leprosy detection (31 cases Namarroi 2024, 35+ Alto Molócuè 2022)
   - Skin NTDs integration, health worker capacity building
   - Stigma assessment (SARI/P-SCALE tracking)
   - 34 OPAL savings groups with 25% female leadership
   - Malnutrition tracking (708→961 admissions 2022→2024)
   - Budget: 250,000 MZN

2. **Project: Multiplying Inclusion**
   - New planned workflow for pipeline metrics
   - Budget: 180,000 MZN

3. **Indicators** for OLIKANASSA:
   - Leprosy cases detected (target: 70)
   - Skin NTD cases integrated (target: 200)
   - Health workers trained (target: 50)
   - OPAL savings groups formed (target: 34)
   - Female leadership in OPAL groups (target: 25%)
   - SARI stigma score reduction (target: 20%)
   - Malnutrition admissions tracked (target: 961)
   - Grade-2 deformities tracked (target: 15)

4. **Activities** for OLIKANASSA:
   - Active case detection in Namarroi (ongoing, 65%)
   - Active case detection in Alto Molócuè (completed, 100%)
   - Health worker training (ongoing, 80%)
   - OPAL savings group formation (completed, 100%)
   - SARI/P-SCALE stigma assessment (delayed, 30%)
   - Malnutrition screening (ongoing, 55%)

5. **Beneficiaries** for OLIKANASSA:
   - Namarroi: 961 total (410 male, 551 female, 12 G1 disability, 8 G2 disability)
   - Alto Molócuè: 1200 total (520 male, 680 female, 15 G1, 10 G2)
*/

DO $$
DECLARE
  alto_id uuid;
  namarroi_id uuid;
  olikanassa_id uuid;
  inclusion_id uuid;
BEGIN
  SELECT id INTO alto_id FROM districts WHERE name = 'Alto Molócuè';
  SELECT id INTO namarroi_id FROM districts WHERE name = 'Namarroi';

  -- ============================================
  -- PROJECT: OLIKANASSA
  -- ============================================
  INSERT INTO projects (
    title, description, district_ids, objectives, inputs, target_indicators,
    outcomes, budget, budget_spent, status, phase, start_date, end_date
  )
  VALUES (
    'OLIKANASSA',
    'Continuous phase leprosy detection and skin NTD integration project implemented in Alto Molócuè and Namarroi districts. Focuses on active case detection, health worker capacity building, stigma reduction, and community empowerment through OPAL savings groups.',
    ARRAY[alto_id, namarroi_id],
    'Reduce leprosy transmission through early detection; Integrate skin NTD management; Build health worker capacity; Reduce stigma via SARI/P-SCALE assessment; Form 34 OPAL savings groups with 25% female leadership; Track malnutrition indicators.',
    'Field volunteers; Diagnostic supplies; Training materials; Transport for active case finding; OPAL group starter kits',
    'Leprosy cases detected: 70; Skin NTD cases integrated: 200; Health workers trained: 50; OPAL groups: 34; Female leadership: 25%; SARI stigma reduction: 20%',
    'Reduced leprosy burden in target districts; Strengthened health system capacity; Improved community awareness and reduced stigma; Economic empowerment through OPAL groups; Better nutrition tracking integration',
    250000,
    165000,
    'ongoing',
    'Continuous',
    '2022-01-01',
    '2025-12-31'
  )
  RETURNING id INTO olikanassa_id;

  -- ============================================
  -- PROJECT: Multiplying Inclusion
  -- ============================================
  INSERT INTO projects (
    title, description, district_ids, objectives, inputs, target_indicators,
    outcomes, budget, budget_spent, status, phase, start_date, end_date
  )
  VALUES (
    'Multiplying Inclusion',
    'New planned workflow to track pipeline metrics for inclusive leprosy care. Focuses on multiplying inclusion approaches across new districts and scaling community-based rehabilitation models.',
    ARRAY[alto_id, namarroi_id],
    'Scale inclusive leprosy care models; Track pipeline metrics for expansion; Develop community-based rehabilitation frameworks; Expand OPAL group coverage',
    'Program design team; Baseline survey tools; Community engagement budget; Rehabilitation training resources',
    'New districts reached: 3; Pipeline metrics established: 100%; CBR models developed: 5; OPAL expansion: 20 new groups',
    'Replicable inclusion model; Expanded geographic coverage; Strengthened community-based rehabilitation; Sustainable OPAL expansion',
    180000,
    15000,
    'planned',
    'Planning',
    '2025-06-01',
    '2027-12-31'
  )
  RETURNING id INTO inclusion_id;

  -- ============================================
  -- INDICATORS: OLIKANASSA
  -- ============================================
  INSERT INTO indicators (project_id, name, description, baseline_value, target_value, current_value, unit, disaggregation, category) VALUES
    (olikanassa_id, 'Leprosy cases detected', 'Total new leprosy cases detected through active and passive case finding', 0, 70, 66, 'cases', 'district', 'output'),
    (olikanassa_id, 'Skin NTD cases integrated', 'Skin NTD cases managed through integrated leprosyscreening', 0, 200, 145, 'cases', 'gender', 'output'),
    (olikanassa_id, 'Health workers trained', 'Health workers trained in leprosy and skin NTD management', 0, 50, 42, 'persons', 'gender', 'output'),
    (olikanassa_id, 'OPAL savings groups formed', 'Community savings groups established for economic empowerment', 0, 34, 34, 'groups', 'gender', 'output'),
    (olikanassa_id, 'Female leadership in OPAL groups', 'Percentage of OPAL groups with female leadership', 0, 25, 25, 'percent', 'gender', 'outcome'),
    (olikanassa_id, 'SARI stigma score reduction', 'Reduction in SARI-measured stigma scores in target communities', 0, 20, 8, 'percent', 'district', 'outcome'),
    (olikanassa_id, 'Malnutrition admissions tracked', 'Malnutrition admissions tracked in Namarroi (708 baseline 2022 to 961 in 2024)', 708, 961, 961, 'admissions', 'district', 'output'),
    (olikanassa_id, 'Grade-2 deformities tracked', 'Number of Grade-2 disability deformities identified and tracked', 0, 15, 11, 'cases', 'disability', 'outcome')
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- INDICATORS: Multiplying Inclusion
  -- ============================================
  INSERT INTO indicators (project_id, name, description, baseline_value, target_value, current_value, unit, disaggregation, category) VALUES
    (inclusion_id, 'New districts reached', 'Number of new districts where inclusion model is implemented', 0, 3, 0, 'districts', 'district', 'output'),
    (inclusion_id, 'Pipeline metrics established', 'Percentage of pipeline metrics framework completed', 0, 100, 15, 'percent', 'none', 'output'),
    (inclusion_id, 'CBR models developed', 'Community-based rehabilitation models developed', 0, 5, 0, 'models', 'none', 'output'),
    (inclusion_id, 'OPAL expansion', 'New OPAL savings groups formed under expansion', 0, 20, 0, 'groups', 'gender', 'output')
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- ACTIVITIES: OLIKANASSA
  -- ============================================
  INSERT INTO activities (project_id, title, description, status, progress, start_date, end_date, milestone) VALUES
    (olikanassa_id, 'Active case detection - Namarroi', 'Door-to-door active case finding in Namarroi district', 'ongoing', 65, '2024-01-15', '2024-12-31', false),
    (olikanassa_id, 'Active case detection - Alto Molócuè', 'Door-to-door active case finding in Alto Molócuè district', 'completed', 100, '2022-03-01', '2023-06-30', true),
    (olikanassa_id, 'Health worker training', 'Training health workers in leprosy and skin NTD diagnosis and treatment', 'ongoing', 80, '2023-01-01', '2025-06-30', false),
    (olikanassa_id, 'OPAL savings group formation', 'Formation and support of 34 OPAL savings groups with female leadership', 'completed', 100, '2022-06-01', '2024-03-31', true),
    (olikanassa_id, 'SARI/P-SCALE stigma assessment', 'Community stigma assessment using SARI and P-SCALE tools', 'delayed', 30, '2024-03-01', '2025-03-31', false),
    (olikanassa_id, 'Malnutrition screening integration', 'Integration of malnutrition screening into leprosy active case finding', 'ongoing', 55, '2023-09-01', '2025-09-30', false)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- ACTIVITIES: Multiplying Inclusion
  -- ============================================
  INSERT INTO activities (project_id, title, description, status, progress, start_date, end_date, milestone) VALUES
    (inclusion_id, 'Baseline survey for expansion', 'Conduct baseline survey in target expansion districts', 'planned', 0, '2025-06-01', '2025-09-30', false),
    (inclusion_id, 'Inclusion model design', 'Design the inclusive leprosy care model framework', 'ongoing', 25, '2025-06-15', '2026-03-31', false),
    (inclusion_id, 'Pipeline metrics framework', 'Develop pipeline metrics tracking framework', 'planned', 10, '2025-07-01', '2026-06-30', true)
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- BENEFICIARIES: OLIKANASSA - Namarroi
  -- ============================================
  INSERT INTO beneficiaries (project_id, district_id, total_reached, male, female, disability_grade1, disability_grade2, age_group, date_recorded) VALUES
    (olikanassa_id, namarroi_id, 961, 410, 551, 12, 8, 'all-ages', '2024-12-01'),
    (olikanassa_id, namarroi_id, 708, 310, 398, 8, 5, 'all-ages', '2022-12-01'),
    (olikanassa_id, alto_id, 1200, 520, 680, 15, 10, 'all-ages', '2023-06-15'),
    (olikanassa_id, alto_id, 850, 380, 470, 10, 7, 'all-ages', '2022-06-15')
  ON CONFLICT DO NOTHING;

  -- ============================================
  -- BENEFICIARIES: Multiplying Inclusion (placeholder)
  -- ============================================
  INSERT INTO beneficiaries (project_id, district_id, total_reached, male, female, disability_grade1, disability_grade2, age_group, date_recorded) VALUES
    (inclusion_id, alto_id, 0, 0, 0, 0, 0, 'all-ages', '2025-06-01'),
    (inclusion_id, namarroi_id, 0, 0, 0, 0, 0, 'all-ages', '2025-06-01')
  ON CONFLICT DO NOTHING;

END $$;