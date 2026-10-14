/*
# Assign a safe default role to every account

1. Purpose
- Remove the pending-role state for accounts created without a role.
- Make Field Volunteer the default account role.

2. Modified data
- Existing profiles with no role receive Field Volunteer.
- No profiles, accounts, passwords, or user content are deleted.

3. Modified behavior
- handle_new_user() assigns Field Volunteer to future signups.
- admin_assign_role() remains the protected elevated role-change path.

4. Security
- New and existing users receive the least-privileged standard role.
- No public password table or unrestricted user table is created.
*/

UPDATE public.profiles
SET role_id = (
  SELECT id FROM public.roles WHERE name = 'Field Volunteer' LIMIT 1
)
WHERE role_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.roles WHERE name = 'Field Volunteer'
  );
