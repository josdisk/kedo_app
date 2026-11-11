import { Injectable, Optional } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
import {
  ensureTenant,
  postgresEnabled,
  tenantContext,
} from "../db/tenant-bootstrap";
import { PostgresService } from "../db/postgres.service";
import type { ImportSession, ProxyJob, SourceAsset } from "./asset.types";

@Injectable()
export class AssetsStore {
  private readonly assets = new Map<string, SourceAsset>();
  private readonly sessions = new Map<string, ImportSession>();
  private readonly proxyJobs = new Map<string, ProxyJob>();

  constructor(@Optional() private readonly pg?: PostgresService) {}

  private get postgresMode(): boolean {
    return postgresEnabled(this.pg);
  }

  async listAssets(projectId: string, orgId: string, userId?: string): Promise<SourceAsset[]> {
    if (!this.postgresMode || !this.pg) {
      return [...this.assets.values()].filter(
        (a) => a.project_id === projectId && a.organization_id === orgId,
      );
    }
    const t = tenantContext(orgId, userId);
    return this.pg.withTenant(t, async (client) => {
      await ensureTenant(client, orgId, t.user_id);
      const res = await client.query(`SELECT * FROM source_assets WHERE project_id = $1`, [
        projectId,
      ]);
      return res.rows.map(rowToAsset);
    });
  }

  async getAsset(
    assetId: string,
    orgId?: string,
    userId?: string,
  ): Promise<SourceAsset | undefined> {
    if (!this.postgresMode || !this.pg) {
      return this.assets.get(assetId);
    }
    if (!orgId) return undefined;
    const t = tenantContext(orgId, userId);
    return this.pg.withTenant(t, async (client) => {
      const res = await client.query(`SELECT * FROM source_assets WHERE id = $1`, [assetId]);
      return res.rows[0] ? rowToAsset(res.rows[0]) : undefined;
    });
  }

  async createSession(input: {
    project_id: string;
    organization_id: string;
    created_by: string;
  }): Promise<ImportSession> {
    const now = new Date().toISOString();
    const session: ImportSession = {
      id: `imp_${randomUUID()}`,
      project_id: input.project_id,
      organization_id: input.organization_id,
      state: "CREATED",
      created_by: input.created_by,
      created_at: now,
      updated_at: now,
      asset_ids: [],
    };
    if (!this.postgresMode || !this.pg) {
      this.sessions.set(session.id, session);
      return session;
    }
    const t = tenantContext(input.organization_id, input.created_by);
    return this.pg.withTenant(t, async (client) => {
      await ensureTenant(client, input.organization_id, input.created_by);
      await client.query(
        `INSERT INTO import_sessions
           (id, project_id, organization_id, state, created_by, asset_ids, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,'[]'::jsonb,$6::timestamptz,$6::timestamptz)`,
        [
          session.id,
          session.project_id,
          session.organization_id,
          session.state,
          session.created_by,
          now,
        ],
      );
      return session;
    });
  }

  async getSession(
    sessionId: string,
    orgId?: string,
    userId?: string,
  ): Promise<ImportSession | undefined> {
    if (!this.postgresMode || !this.pg) {
      return this.sessions.get(sessionId);
    }
    if (!orgId) return undefined;
    const t = tenantContext(orgId, userId);
    return this.pg.withTenant(t, async (client) => {
      const res = await client.query(`SELECT * FROM import_sessions WHERE id = $1`, [sessionId]);
      return res.rows[0] ? rowToSession(res.rows[0]) : undefined;
    });
  }

  async completeSession(
    sessionId: string,
    orgId: string,
    files: Array<{
      filename: string;
      size_bytes: number;
      sha256?: string;
      locator_uri?: string;
      media_properties?: Record<string, unknown>;
    }>,
    userId?: string,
  ): Promise<ImportSession | undefined> {
    if (!this.postgresMode || !this.pg) {
      return this.completeSessionMemory(sessionId, orgId, files);
    }
    const t = tenantContext(orgId, userId);
    return this.pg.withTenant(t, async (client) => {
      await ensureTenant(client, orgId, t.user_id);
      const sessRes = await client.query(`SELECT * FROM import_sessions WHERE id = $1`, [
        sessionId,
      ]);
      if (!sessRes.rows[0]) return undefined;
      const session = rowToSession(sessRes.rows[0]);
      if (session.organization_id !== orgId) return undefined;

      session.state = "VALIDATING";
      for (const file of files) {
        if (file.size_bytes < 0) {
          session.state = "FAILED";
          session.error = "invalid size_bytes";
          await persistSession(client, session);
          return session;
        }
        session.state = "PROBING";
        const sha =
          file.sha256 ??
          createHash("sha256")
            .update(`${file.filename}:${file.size_bytes}:${session.id}`)
            .digest("hex");

        const existing = await client.query(
          `SELECT * FROM source_assets WHERE project_id = $1 AND sha256 = $2`,
          [session.project_id, sha],
        );
        if (existing.rows[0]) {
          const id = String(existing.rows[0].id);
          if (!session.asset_ids.includes(id)) session.asset_ids.push(id);
          continue;
        }

        const props = file.media_properties ?? {
          note: "probe pending — run kedov_ingest_cli for local probe",
        };
        const quarantined = Boolean((props as { quarantined?: boolean }).quarantined);
        const asset: SourceAsset = {
          id: `asset_${randomUUID()}`,
          project_id: session.project_id,
          organization_id: orgId,
          sha256: sha,
          size_bytes: file.size_bytes,
          original_filename: file.filename,
          locator_uri: file.locator_uri ?? `local://pending/${file.filename}`,
          media_properties: props,
          probe_backend: typeof props.probe_backend === "string" ? props.probe_backend : "api-meta",
          quarantined,
          quarantine_reason: quarantined
            ? String((props as { quarantine_reason?: string }).quarantine_reason ?? "quarantined")
            : undefined,
          created_at: new Date().toISOString(),
        };
        await client.query(
          `INSERT INTO source_assets
             (id, project_id, organization_id, sha256, size_bytes, media_properties, source_metadata,
              original_filename, locator_uri, probe_backend, quarantined, quarantine_reason)
           VALUES ($1,$2,$3,$4,$5,$6::jsonb,'{}'::jsonb,$7,$8,$9,$10,$11)`,
          [
            asset.id,
            asset.project_id,
            asset.organization_id,
            asset.sha256,
            asset.size_bytes,
            JSON.stringify(asset.media_properties),
            asset.original_filename,
            asset.locator_uri,
            asset.probe_backend ?? null,
            asset.quarantined,
            asset.quarantine_reason ?? null,
          ],
        );
        session.asset_ids.push(asset.id);
      }

      const q = await client.query(
        `SELECT id FROM source_assets WHERE id = ANY($1::text[]) AND quarantined = true`,
        [session.asset_ids],
      );
      session.state = q.rows.length > 0 ? "QUARANTINED" : "READY";
      session.updated_at = new Date().toISOString();
      await persistSession(client, session);
      return session;
    });
  }

  private completeSessionMemory(
    sessionId: string,
    orgId: string,
    files: Array<{
      filename: string;
      size_bytes: number;
      sha256?: string;
      locator_uri?: string;
      media_properties?: Record<string, unknown>;
    }>,
  ): ImportSession | undefined {
    const session = this.sessions.get(sessionId);
    if (!session || session.organization_id !== orgId) return undefined;

    session.state = "VALIDATING";
    session.updated_at = new Date().toISOString();

    for (const file of files) {
      if (file.size_bytes < 0) {
        session.state = "FAILED";
        session.error = "invalid size_bytes";
        return session;
      }
      session.state = "PROBING";
      const sha =
        file.sha256 ??
        createHash("sha256")
          .update(`${file.filename}:${file.size_bytes}:${session.id}`)
          .digest("hex");

      const existing = [...this.assets.values()].find(
        (a) => a.project_id === session.project_id && a.sha256 === sha,
      );
      if (existing) {
        if (!session.asset_ids.includes(existing.id)) session.asset_ids.push(existing.id);
        continue;
      }

      const props = file.media_properties ?? {
        note: "probe pending — run kedov_ingest_cli for local probe",
      };
      const quarantined = Boolean((props as { quarantined?: boolean }).quarantined);
      const asset: SourceAsset = {
        id: `asset_${randomUUID()}`,
        project_id: session.project_id,
        organization_id: orgId,
        sha256: sha,
        size_bytes: file.size_bytes,
        original_filename: file.filename,
        locator_uri: file.locator_uri ?? `local://pending/${file.filename}`,
        media_properties: props,
        probe_backend: typeof props.probe_backend === "string" ? props.probe_backend : "api-meta",
        quarantined,
        quarantine_reason: quarantined
          ? String((props as { quarantine_reason?: string }).quarantine_reason ?? "quarantined")
          : undefined,
        created_at: new Date().toISOString(),
      };
      this.assets.set(asset.id, asset);
      session.asset_ids.push(asset.id);
    }

    session.state = session.asset_ids.some((id) => this.assets.get(id)?.quarantined)
      ? "QUARANTINED"
      : "READY";
    session.updated_at = new Date().toISOString();
    return session;
  }

  async createProxyJob(input: {
    project_id: string;
    organization_id: string;
    asset_id: string;
    target_height?: number;
  }): Promise<ProxyJob | undefined> {
    const now = new Date().toISOString();
    const job: ProxyJob = {
      id: `proxy_${randomUUID()}`,
      project_id: input.project_id,
      organization_id: input.organization_id,
      asset_id: input.asset_id,
      state: "QUEUED",
      progress: 0,
      message: "queued",
      target_height: input.target_height ?? 720,
      created_at: now,
      updated_at: now,
    };

    if (!this.postgresMode || !this.pg) {
      const asset = this.assets.get(input.asset_id);
      if (!asset || asset.organization_id !== input.organization_id) return undefined;
      this.proxyJobs.set(job.id, job);
      return job;
    }

    const t = tenantContext(input.organization_id);
    return this.pg.withTenant(t, async (client) => {
      await ensureTenant(client, input.organization_id, t.user_id);
      const asset = await client.query(`SELECT id FROM source_assets WHERE id = $1`, [
        input.asset_id,
      ]);
      if (!asset.rows[0]) return undefined;
      await client.query(
        `INSERT INTO proxy_jobs
           (id, project_id, organization_id, asset_id, state, progress, message, target_height)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          job.id,
          job.project_id,
          job.organization_id,
          job.asset_id,
          job.state,
          job.progress,
          job.message,
          job.target_height,
        ],
      );
      return job;
    });
  }

  async getProxyJob(
    jobId: string,
    orgId?: string,
    userId?: string,
  ): Promise<ProxyJob | undefined> {
    if (!this.postgresMode || !this.pg) {
      return this.proxyJobs.get(jobId);
    }
    if (!orgId) return undefined;
    const t = tenantContext(orgId, userId);
    return this.pg.withTenant(t, async (client) => {
      const res = await client.query(`SELECT * FROM proxy_jobs WHERE id = $1`, [jobId]);
      return res.rows[0] ? rowToProxy(res.rows[0]) : undefined;
    });
  }

  async tickProxyJob(
    jobId: string,
    orgId: string,
    succeed = true,
    userId?: string,
  ): Promise<ProxyJob | undefined> {
    if (!this.postgresMode || !this.pg) {
      const job = this.proxyJobs.get(jobId);
      if (!job || job.organization_id !== orgId) return undefined;
      if (job.state === "QUEUED") {
        job.state = "RUNNING";
        job.progress = 0.1;
        job.message = "proxy worker claimed job";
      } else if (job.state === "RUNNING" && !succeed) {
        job.state = "FAILED";
        job.message = "proxy failed";
      }
      job.updated_at = new Date().toISOString();
      return job;
    }
    const t = tenantContext(orgId, userId);
    return this.pg.withTenant(t, async (client) => {
      const res = await client.query(`SELECT * FROM proxy_jobs WHERE id = $1`, [jobId]);
      if (!res.rows[0]) return undefined;
      const job = rowToProxy(res.rows[0]);
      if (job.organization_id !== orgId) return undefined;
      if (job.state === "QUEUED") {
        job.state = "RUNNING";
        job.progress = 0.1;
        job.message = "proxy worker claimed job";
      } else if (job.state === "RUNNING" && !succeed) {
        job.state = "FAILED";
        job.message = "proxy failed";
      }
      job.updated_at = new Date().toISOString();
      await persistProxy(client, job);
      return job;
    });
  }

  async completeProxyJob(
    jobId: string,
    orgId: string,
    input: {
      proxy_uri: string;
      source_mapping: {
        source_uri: string;
        proxy_uri: string;
        target_height: number;
        scale_filter: string;
        timebase_policy: "preserve_source";
      };
      encode_backend?: string;
      source_unchanged?: boolean;
      message?: string;
    },
    userId?: string,
  ): Promise<ProxyJob | undefined> {
    if (!this.postgresMode || !this.pg) {
      return this.completeProxyJobMemory(jobId, orgId, input);
    }
    const t = tenantContext(orgId, userId);
    return this.pg.withTenant(t, async (client) => {
      const res = await client.query(`SELECT * FROM proxy_jobs WHERE id = $1`, [jobId]);
      if (!res.rows[0]) return undefined;
      const job = rowToProxy(res.rows[0]);
      if (job.organization_id !== orgId) return undefined;
      if (job.state === "COMPLETED" || job.state === "CANCELLED") return job;
      if (job.state === "QUEUED") {
        job.state = "RUNNING";
        job.progress = 0.1;
      }
      if (input.source_unchanged === false) {
        job.state = "FAILED";
        job.message = input.message ?? "source changed during encode — refused";
        job.updated_at = new Date().toISOString();
        await persistProxy(client, job);
        return job;
      }
      const assetRes = await client.query(`SELECT * FROM source_assets WHERE id = $1`, [
        job.asset_id,
      ]);
      if (!assetRes.rows[0]) {
        job.state = "FAILED";
        job.message = "asset missing at complete";
        job.updated_at = new Date().toISOString();
        await persistProxy(client, job);
        return job;
      }
      const asset = rowToAsset(assetRes.rows[0]);
      const sourceSha = asset.sha256;
      const sourceLocator = asset.locator_uri;
      await client.query(
        `UPDATE source_assets
         SET proxy_uri = $2, proxy_mapping = $3::jsonb
         WHERE id = $1 AND sha256 = $4 AND locator_uri = $5`,
        [
          asset.id,
          input.proxy_uri,
          JSON.stringify(input.source_mapping),
          sourceSha,
          sourceLocator,
        ],
      );
      job.state = "COMPLETED";
      job.progress = 1;
      job.proxy_uri = input.proxy_uri;
      job.source_mapping = { ...input.source_mapping };
      job.encode_backend = input.encode_backend ?? "ffmpeg-cli";
      job.source_unchanged = true;
      job.message = input.message ?? "proxy ready";
      job.updated_at = new Date().toISOString();
      await persistProxy(client, job);
      return job;
    });
  }

  private completeProxyJobMemory(
    jobId: string,
    orgId: string,
    input: {
      proxy_uri: string;
      source_mapping: NonNullable<ProxyJob["source_mapping"]>;
      encode_backend?: string;
      source_unchanged?: boolean;
      message?: string;
    },
  ): ProxyJob | undefined {
    const job = this.proxyJobs.get(jobId);
    if (!job || job.organization_id !== orgId) return undefined;
    if (job.state === "COMPLETED" || job.state === "CANCELLED") return job;
    if (job.state === "QUEUED") {
      job.state = "RUNNING";
      job.progress = 0.1;
    }
    if (input.source_unchanged === false) {
      job.state = "FAILED";
      job.message = input.message ?? "source changed during encode — refused";
      job.updated_at = new Date().toISOString();
      return job;
    }
    const asset = this.assets.get(job.asset_id);
    if (!asset) {
      job.state = "FAILED";
      job.message = "asset missing at complete";
      job.updated_at = new Date().toISOString();
      return job;
    }
    const sourceSha = asset.sha256;
    const sourceLocator = asset.locator_uri;
    asset.proxy_uri = input.proxy_uri;
    asset.proxy_mapping = { ...input.source_mapping };
    if (asset.sha256 !== sourceSha || asset.locator_uri !== sourceLocator) {
      job.state = "FAILED";
      job.message = "source identity mutated — refused";
      job.updated_at = new Date().toISOString();
      return job;
    }
    job.state = "COMPLETED";
    job.progress = 1;
    job.proxy_uri = input.proxy_uri;
    job.source_mapping = { ...input.source_mapping };
    job.encode_backend = input.encode_backend ?? "ffmpeg-cli";
    job.source_unchanged = true;
    job.message = input.message ?? "proxy ready";
    job.updated_at = new Date().toISOString();
    return job;
  }
}

async function persistSession(client: { query: Function }, session: ImportSession) {
  await client.query(
    `UPDATE import_sessions
     SET state = $2, asset_ids = $3::jsonb, error = $4, updated_at = $5::timestamptz
     WHERE id = $1`,
    [
      session.id,
      session.state,
      JSON.stringify(session.asset_ids),
      session.error ?? null,
      session.updated_at,
    ],
  );
}

async function persistProxy(client: { query: Function }, job: ProxyJob) {
  await client.query(
    `UPDATE proxy_jobs
     SET state = $2, progress = $3, message = $4, encode_backend = $5,
         proxy_uri = $6, source_mapping = $7::jsonb, source_unchanged = $8,
         updated_at = $9::timestamptz
     WHERE id = $1`,
    [
      job.id,
      job.state,
      job.progress,
      job.message,
      job.encode_backend ?? null,
      job.proxy_uri ?? null,
      job.source_mapping ? JSON.stringify(job.source_mapping) : null,
      job.source_unchanged ?? null,
      job.updated_at,
    ],
  );
}

function rowToAsset(row: Record<string, unknown>): SourceAsset {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    organization_id: String(row.organization_id ?? ""),
    sha256: String(row.sha256),
    size_bytes: Number(row.size_bytes),
    original_filename: String(row.original_filename ?? ""),
    locator_uri: String(row.locator_uri ?? ""),
    media_properties: (row.media_properties as Record<string, unknown>) ?? {},
    probe_backend: row.probe_backend ? String(row.probe_backend) : undefined,
    proxy_uri: row.proxy_uri ? String(row.proxy_uri) : undefined,
    proxy_mapping: (row.proxy_mapping as SourceAsset["proxy_mapping"]) ?? undefined,
    quarantined: Boolean(row.quarantined),
    quarantine_reason: row.quarantine_reason ? String(row.quarantine_reason) : undefined,
    created_at: new Date(row.created_at as string | Date).toISOString(),
  };
}

function rowToSession(row: Record<string, unknown>): ImportSession {
  const ids = row.asset_ids;
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    organization_id: String(row.organization_id),
    state: row.state as ImportSession["state"],
    created_by: String(row.created_by),
    created_at: new Date(row.created_at as string | Date).toISOString(),
    updated_at: new Date(row.updated_at as string | Date).toISOString(),
    asset_ids: Array.isArray(ids) ? (ids as string[]) : [],
    error: row.error ? String(row.error) : undefined,
  };
}

function rowToProxy(row: Record<string, unknown>): ProxyJob {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    organization_id: String(row.organization_id),
    asset_id: String(row.asset_id),
    state: row.state as ProxyJob["state"],
    progress: Number(row.progress),
    message: String(row.message ?? ""),
    target_height: Number(row.target_height),
    encode_backend: row.encode_backend ? String(row.encode_backend) : undefined,
    proxy_uri: row.proxy_uri ? String(row.proxy_uri) : undefined,
    source_mapping: (row.source_mapping as ProxyJob["source_mapping"]) ?? undefined,
    source_unchanged:
      row.source_unchanged == null ? undefined : Boolean(row.source_unchanged),
    created_at: new Date(row.created_at as string | Date).toISOString(),
    updated_at: new Date(row.updated_at as string | Date).toISOString(),
  };
}
