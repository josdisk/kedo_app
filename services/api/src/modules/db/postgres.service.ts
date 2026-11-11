import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { resolveDatabaseUrl, usePostgresStore } from "./db.config";
import { withTenant, type TenantContext } from "./tenant-session";

@Injectable()
export class PostgresService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostgresService.name);
  private pool: Pool | null = null;

  get enabled(): boolean {
    return this.pool != null;
  }

  async onModuleInit(): Promise<void> {
    if (!usePostgresStore()) {
      this.logger.log("API_DATABASE_URL is not Postgres — using in-memory stores");
      return;
    }
    const connectionString = resolveDatabaseUrl()!;
    this.pool = new Pool({ connectionString, max: 10 });
    const client = await this.pool.connect();
    try {
      await client.query("SELECT 1");
      this.logger.log("Postgres pool ready (RLS tenant GUCs via withTenant)");
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  requirePool(): Pool {
    if (!this.pool) {
      throw new Error("Postgres pool not initialized");
    }
    return this.pool;
  }

  withTenant<T>(
    tenant: TenantContext,
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    return withTenant(this.requirePool(), tenant, fn);
  }
}
