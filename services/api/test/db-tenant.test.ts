import assert from "node:assert/strict";
import { test } from "node:test";
import { isPostgresUrl, usePostgresStore } from "../src/modules/db/db.config";
import { TENANT_GUC_SQL, withTenant } from "../src/modules/db/tenant-session";

test("isPostgresUrl accepts postgres schemes only", () => {
  assert.equal(isPostgresUrl("postgresql://localhost/kedov"), true);
  assert.equal(isPostgresUrl("postgres://localhost/kedov"), true);
  assert.equal(isPostgresUrl("file:./dev.sqlite"), false);
  assert.equal(isPostgresUrl(undefined), false);
});

test("usePostgresStore follows API_DATABASE_URL", () => {
  const prev = process.env.API_DATABASE_URL;
  process.env.API_DATABASE_URL = "postgresql://kedov:kedov@localhost:5432/kedov";
  assert.equal(usePostgresStore(), true);
  process.env.API_DATABASE_URL = "file:./dev.sqlite";
  assert.equal(usePostgresStore(), false);
  if (prev === undefined) delete process.env.API_DATABASE_URL;
  else process.env.API_DATABASE_URL = prev;
});

test("withTenant sets LOCAL GUCs then commits", async () => {
  const calls: string[] = [];
  const fakeClient = {
    query: async (sql: string) => {
      calls.push(String(sql));
      return { rows: [] };
    },
    release: () => undefined,
  };
  const fakePool = {
    connect: async () => fakeClient,
  };

  await withTenant(fakePool as never, { org_id: "org_a", user_id: "user_a" }, async () => {
    return "ok";
  });

  assert.ok(calls.some((c) => c.includes("BEGIN")));
  assert.ok(calls.some((c) => c.includes(TENANT_GUC_SQL.org)));
  assert.ok(calls.some((c) => c.includes(TENANT_GUC_SQL.user)));
  assert.ok(calls.some((c) => c.includes("COMMIT")));
});

test("withTenant rolls back on failure", async () => {
  const calls: string[] = [];
  const fakeClient = {
    query: async (sql: string) => {
      calls.push(String(sql));
      return { rows: [] };
    },
    release: () => undefined,
  };
  const fakePool = { connect: async () => fakeClient };

  await assert.rejects(
    () =>
      withTenant(fakePool as never, { org_id: "org_a", user_id: "user_a" }, async () => {
        throw new Error("boom");
      }),
    /boom/,
  );
  assert.ok(calls.some((c) => c.includes("ROLLBACK")));
});
