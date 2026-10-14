/*
# Fix districts unique constraint
- Drop the unique constraint on just "name" — it prevents the same district name in different provinces
- Add a unique constraint on (name, province) instead
*/

ALTER TABLE districts DROP CONSTRAINT IF EXISTS districts_name_key;
ALTER TABLE districts ADD CONSTRAINT districts_name_province_key UNIQUE (name, province);
