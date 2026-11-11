import { Injectable, Optional } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { usePostgresStore } from "../db/db.config";
import { PostgresService } from "../db/postgres.service";
import type { ProjectRecord, ProjectSummary } from "./project.types";

@Injectable()
export class ProjectsStore {
  private readonly memory = new Map<string, ProjectRecord>();
  private readonly preferPostgres: boolean;

  constructor(@Optional() private readonly pg?: PostgresService) {
    this.preferPostgres = usePostgresStore();
    if (!this.preferPostgres) {
      const now = new Date().toISOString();
      const demo: ProjectRecord = {
        id: "proj_demo_music",
        organization_id: process.env.API_DEMO_ORG_ID ?? "org_demo",
        name: "Demo — Music video sync",
        genre: "music_video",
        privacy_mode: "local_first",
        schema_version: 1,
        revision: 0,
        created_at: now,
        updated_at: now,
        created_by: process.env.API_DEMO_USER_ID ?? "user_demo",
      };
      this.memory.set(demo.id, demo);
    }
  }

  private get postgresMode(): boolean {
    return this.preferPostgres && Boolean(this.pg?.enabled);
  }

  private tenant(orgId: string, userId?: string) {
    return {
      org_id: orgId,
      user_id: userId ?? process.env.API_DEMO_USER_ID ?? "user_demo",
    };
  }

  /** Ensure org + membership exist under RLS (first touch). */
  private async ensureTenant(client: PoolClient, orgId: string, userId: string) {
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

  async listForOrg(orgId: string, userId?: string): Promise<ProjectSummary[]> {
    if (!this.postgresMode || !this.pg) {
      return [...this.memory.values()]
        .filter((p) => p.organization_id === orgId)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .map(toSummary);
    }
    const t = this.tenant(orgId, userId);
    return this.pg.withTenant(t, async (client) => {
      await this.ensureTenant(client, orgId, t.user_id);
      const res = await client.query<{
        id: string;
        name: string;
        genre: string;
        privacy_mode: string;
        revision: string;
        updated_at: Date;
        organization_id: string;
      }>(
        `SELECT id, name, genre, privacy_mode, revision, updated_at, organization_id
         FROM projects
         WHERE organization_id = $1
         ORDER BY updated_at DESC`,
        [orgId],
      );
      return res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        genre: r.genre,
        privacy_mode: r.privacy_mode,
        revision: Number(r.revision),
        updated_at: r.updated_at.toISOString(),
        organization_id: r.organization_id,
      }));
    });
  }

  async get(
    projectId: string,
    orgId?: string,
    userId?: string,
  ): Promise<ProjectRecord | undefined> {
    if (!this.postgresMode || !this.pg) {
      return this.memory.get(projectId);
    }
    if (!orgId) return undefined;
    return this.pg.withTenant(this.tenant(orgId, userId), async (client) => {
      const res = await client.query(
        `SELECT id, organization_id, name, genre, privacy_mode, schema_version,
                revision, created_by, created_at, updated_at
         FROM projects WHERE id = $1`,
        [projectId],
      );
      if (!res.rows[0]) return undefined;
      return rowToRecord(res.rows[0]);
    });
  }

  async create(input: {
    organization_id: string;
    name: string;
    genre: string;
    privacy_mode: string;
    created_by: string;
  }): Promise<ProjectRecord> {
    if (!this.postgresMode || !this.pg) {
      const now = new Date().toISOString();
      const record: ProjectRecord = {
        id: `proj_${randomUUID()}`,
        organization_id: input.organization_id,
        name: input.name,
        genre: input.genre,
        privacy_mode: input.privacy_mode,
        schema_version: 1,
        revision: 0,
        created_at: now,
        updated_at: now,
        created_by: input.created_by,
      };
      this.memory.set(record.id, record);
      return record;
    }
    return this.pg.withTenant(
      this.tenant(input.organization_id, input.created_by),
      async (client) => {
        await this.ensureTenant(client, input.organization_id, input.created_by);
        const id = `proj_${randomUUID()}`;
        const res = await client.query(
          `INSERT INTO projects
             (id, organization_id, name, genre, privacy_mode, schema_version, revision, created_by)
           VALUES ($1,$2,$3,$4,$5,1,0,$6)
           RETURNING id, organization_id, name, genre, privacy_mode, schema_version,
                     revision, created_by, created_at, updated_at`,
          [
            id,
            input.organization_id,
            input.name,
            input.genre,
            input.privacy_mode,
            input.created_by,
          ],
        );
        return rowToRecord(res.rows[0]);
      },
    );
  }

  async update(
    projectId: string,
    orgId: string,
    patch: Partial<Pick<ProjectRecord, "name" | "genre" | "privacy_mode">>,
    userId?: string,
  ): Promise<ProjectRecord | undefined> {
    if (!this.postgresMode || !this.pg) {
      const existing = this.memory.get(projectId);
      if (!existing || existing.organization_id !== orgId) return undefined;
      const updated: ProjectRecord = {
        ...existing,
        ...patch,
        updated_at: new Date().toISOString(),
      };
      this.memory.set(projectId, updated);
      return updated;
    }
    return this.pg.withTenant(this.tenant(orgId, userId), async (client) => {
      const res = await client.query(
        `UPDATE projects
         SET name = COALESCE($3, name),
             genre = COALESCE($4, genre),
             privacy_mode = COALESCE($5, privacy_mode),
             updated_at = now()
         WHERE id = $1 AND organization_id = $2
         RETURNING id, organization_id, name, genre, privacy_mode, schema_version,
                   revision, created_by, created_at, updated_at`,
        [projectId, orgId, patch.name ?? null, patch.genre ?? null, patch.privacy_mode ?? null],
      );
      if (!res.rows[0]) return undefined;
      return rowToRecord(res.rows[0]);
    });
  }
}

function rowToRecord(row: Record<string, unknown>): ProjectRecord {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    name: String(row.name),
    genre: String(row.genre),
    privacy_mode: String(row.privacy_mode),
    schema_version: Number(row.schema_version),
    revision: Number(row.revision),
    created_by: String(row.created_by ?? ""),
    created_at: new Date(row.created_at as string | Date).toISOString(),
    updated_at: new Date(row.updated_at as string | Date).toISOString(),
  };
}

function toSummary(p: ProjectRecord): ProjectSummary {
  return {
    id: p.id,
    name: p.name,
    genre: p.genre,
    privacy_mode: p.privacy_mode,
    revision: p.revision,
    updated_at: p.updated_at,
    organization_id: p.organization_id,
  };
}
