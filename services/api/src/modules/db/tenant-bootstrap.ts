import type { PoolClient } from "pg";
import { usePostgresStore } from "./db.config";
import type { PostgresService } from "./postgres.service";

export function preferPostgres(): boolean {
  return usePostgresStore();
}

export function postgresEnabled(pg?: PostgresService): boolean {
  return preferPostgres() && Boolean(pg?.enabled);
}

export function tenantContext(orgId: string, userId?: string) {
  return {
    org_id: orgId,
    user_id: userId ?? process.env.API_DEMO_USER_ID ?? "user_demo",
  };
}

/** Ensure org + membership exist under RLS (first touch). */
export async function ensureTenant(
  client: PoolClient,
  orgId: string,
  userId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO organizations (id, name, region)
     VALUES ($1, $2, 'local')
     ON CONFLICT (id) DO NOTHING`,
    [orgId, `Org ${orgId}`],
  );
  await client.query(
    `INSERT INTO organization_memberships (organization_id, user_id, role)
     VALUES ($1, $2, 'owner')
     ON CONFLICT (organization_id, user_id) DO NOTHING`,
    [orgId, userId],
  );
}
