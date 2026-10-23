#!/usr/bin/env bash
# One-time copy of your data from Supabase into the self-hosted database.
# Usage: SUPABASE_DB_URL='postgresql://...' DATABASE_URL='postgres://wheel:...@localhost/wheel' scripts/import-from-supabase.sh
# Run Schema.sql on the new database first. Drops owner_id since there's only one user now.
set -euo pipefail

copy() {
  local table=$1 columns=$2
  psql "$SUPABASE_DB_URL" -c "\copy (select $columns from public.$table) to stdout with csv" \
    | psql "$DATABASE_URL" -c "\copy $table ($columns) from stdin with csv"
}

copy categories "id, name, created_at"
copy projects "id, name, description, difficulty, dev_type, status, link, has_content, created_at, updated_at"
copy project_categories "project_id, category_id"

echo "Done."
