#!/usr/bin/env bash
# Apply database/migrations/postgres/*.sql in lexical order.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/database/migrations/postgres"
URL="${API_DATABASE_URL:-postgresql://kedov:kedov@localhost:5432/kedov}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required to apply migrations" >&2
  exit 1
fi

echo "Migrating $URL"
for f in "$DIR"/*.sql; do
  echo "→ $(basename "$f")"
  psql "$URL" -v ON_ERROR_STOP=1 -f "$f"
done
echo "Migrations complete."
