/*
# Revoke anon EXECUTE on SECURITY DEFINER functions

## Overview
The security advisor flagged that apply_custom_schema and get_project_schema
are callable by the anon (unauthenticated) role. These functions should only
be available to authenticated users.

## Security Changes
- REVOKE EXECUTE on apply_custom_schema(text) FROM anon
- REVOKE EXECUTE on get_project_schema(uuid) FROM anon
- handle_new_user() is a trigger function (not called via RPC) — left as-is
*/

REVOKE EXECUTE ON FUNCTION public.apply_custom_schema(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_project_schema(uuid) FROM anon;
