import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const MARKERS = [
  "import_sessions",
  "proxy_jobs",
  "preview_sessions",
  "sequence_states",
  "import_sessions_tenant",
  "proxy_jobs_tenant",
  "preview_sessions_tenant",
  "sequence_states_tenant",
  "organization_id",
] as const;

test("005_domain_persistence.sql covers domain tables + RLS", () => {
  const sql = readFileSync(
    join(__dirname, "../../../database/migrations/postgres/005_domain_persistence.sql"),
    "utf8",
  );
  for (const marker of MARKERS) {
    assert.ok(sql.includes(marker), `missing marker: ${marker}`);
  }
});
