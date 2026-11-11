import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import {
  REQUIRED_RLS_MARKERS,
  canAccessAsset,
  canAccessProject,
  canMutateInOrg,
} from "./tenant-rls.js";

const actor = { user_id: "user_a", org_id: "org_a" };
const memberships = [
  { organization_id: "org_a", user_id: "user_a", role: "editor" as const },
  { organization_id: "org_b", user_id: "user_b", role: "owner" as const },
];
const projects = [
  { id: "p1", organization_id: "org_a" },
  { id: "p2", organization_id: "org_b" },
];

test("RLS intent: same-org member can access project", () => {
  assert.equal(canAccessProject(actor, projects[0]!, memberships), true);
});

test("RLS intent: cross-org project is denied", () => {
  assert.equal(canAccessProject(actor, projects[1]!, memberships), false);
});

test("RLS intent: asset follows project org", () => {
  assert.equal(
    canAccessAsset(actor, { id: "a1", project_id: "p1" }, projects, memberships),
    true,
  );
  assert.equal(
    canAccessAsset(actor, { id: "a2", project_id: "p2" }, projects, memberships),
    false,
  );
});

test("viewer cannot mutate; editor can", () => {
  assert.equal(canMutateInOrg(actor, memberships), true);
  assert.equal(
    canMutateInOrg(actor, [
      { organization_id: "org_a", user_id: "user_a", role: "viewer" },
    ]),
    false,
  );
});

test("003_rls_memberships.sql contains required policy markers", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const sqlPath = join(
    here,
    "../../../database/migrations/postgres/003_rls_memberships.sql",
  );
  const sql = readFileSync(sqlPath, "utf8");
  for (const marker of REQUIRED_RLS_MARKERS) {
    assert.ok(sql.includes(marker), `missing marker: ${marker}`);
  }
});
