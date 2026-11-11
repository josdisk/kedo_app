import type { Pool, PoolClient } from "pg";

export interface TenantContext {
  org_id: string;
  user_id: string;
}

/**
 * Run work inside a transaction with SET LOCAL tenant GUCs for RLS.
 * Always rolls back on error; commits on success.
 */
export async function withTenant<T>(
  pool: Pool,
  tenant: TenantContext,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  if (!tenant.org_id?.trim() || !tenant.user_id?.trim()) {
    throw new Error("tenant org_id and user_id are required");
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // set_config(..., true) == SET LOCAL (transaction-scoped).
    await client.query(`SELECT set_config('app.current_org_id', $1, true)`, [
      tenant.org_id,
    ]);
    await client.query(`SELECT set_config('app.current_user_id', $1, true)`, [
      tenant.user_id,
    ]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore rollback errors
    }
    throw err;
  } finally {
    client.release();
  }
}

/** SQL fragments asserted by unit tests (must match withTenant). */
export const TENANT_GUC_SQL = {
  org: "set_config('app.current_org_id'",
  user: "set_config('app.current_user_id'",
} as const;
