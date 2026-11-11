import { Injectable, Optional } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  ensureTenant,
  postgresEnabled,
  preferPostgres,
  tenantContext,
} from "../db/tenant-bootstrap";
import { PostgresService } from "../db/postgres.service";
import type { PreviewSession } from "./preview.types";

@Injectable()
export class PreviewStore {
  private readonly sessions = new Map<string, PreviewSession>();
  private readonly preferPg: boolean;

  constructor(@Optional() private readonly pg?: PostgresService) {
    this.preferPg = preferPostgres();
  }

  private get postgresMode(): boolean {
    return postgresEnabled(this.pg);
  }

  async create(input: {
    project_id: string;
    organization_id: string;
    asset_id?: string;
    duration_frames?: number;
    fps_num?: number;
    fps_den?: number;
    preview_tier?: PreviewSession["preview_tier"];
  }): Promise<PreviewSession> {
    const now = new Date().toISOString();
    const session: PreviewSession = {
      id: `prev_${randomUUID()}`,
      project_id: input.project_id,
      organization_id: input.organization_id,
      asset_id: input.asset_id,
      duration_frames: input.duration_frames ?? 240,
      fps_num: input.fps_num ?? 24,
      fps_den: input.fps_den ?? 1,
      playhead_frame: 0,
      generation: 0,
      preview_tier: input.preview_tier ?? "proxy",
      last_scrub_message: "ready",
      created_at: now,
      updated_at: now,
    };
    if (!this.postgresMode || !this.pg) {
      this.sessions.set(session.id, session);
      return session;
    }
    const t = tenantContext(input.organization_id);
    return this.pg.withTenant(t, async (client) => {
      await ensureTenant(client, input.organization_id, t.user_id);
      await client.query(
        `INSERT INTO preview_sessions
           (id, project_id, organization_id, asset_id, duration_frames, fps_num, fps_den,
            playhead_frame, generation, preview_tier, last_scrub_message)
         VALUES ($1,$2,$3,$4,$5,$6,$7,0,0,$8,$9)`,
        [
          session.id,
          session.project_id,
          session.organization_id,
          session.asset_id ?? null,
          session.duration_frames,
          session.fps_num,
          session.fps_den,
          session.preview_tier,
          session.last_scrub_message,
        ],
      );
      return session;
    });
  }

  async get(
    id: string,
    orgId?: string,
    userId?: string,
  ): Promise<PreviewSession | undefined> {
    if (!this.postgresMode || !this.pg) {
      return this.sessions.get(id);
    }
    if (!orgId) return undefined;
    const t = tenantContext(orgId, userId);
    return this.pg.withTenant(t, async (client) => {
      const res = await client.query(`SELECT * FROM preview_sessions WHERE id = $1`, [id]);
      return res.rows[0] ? rowToPreview(res.rows[0]) : undefined;
    });
  }

  async scrub(
    id: string,
    orgId: string,
    frameIndex: number,
    userId?: string,
  ): Promise<PreviewSession | undefined> {
    const session = await this.get(id, orgId, userId);
    if (!session || session.organization_id !== orgId) return undefined;
    const max = Math.max(0, session.duration_frames - 1);
    const frame = Math.min(max, Math.max(0, Math.trunc(frameIndex)));
    session.generation += 1;
    session.playhead_frame = frame;
    session.last_scrub_message = `scrub gen=${session.generation} frame=${frame}`;
    session.updated_at = new Date().toISOString();
    return this.persist(session, userId);
  }

  async setTier(
    id: string,
    orgId: string,
    tier: PreviewSession["preview_tier"],
    userId?: string,
  ): Promise<PreviewSession | undefined> {
    const session = await this.get(id, orgId, userId);
    if (!session || session.organization_id !== orgId) return undefined;
    session.preview_tier = tier;
    session.last_scrub_message = `preview_tier=${tier}`;
    session.updated_at = new Date().toISOString();
    return this.persist(session, userId);
  }

  private async persist(
    session: PreviewSession,
    userId?: string,
  ): Promise<PreviewSession> {
    if (!this.postgresMode || !this.pg) {
      this.sessions.set(session.id, session);
      return session;
    }
    const t = tenantContext(session.organization_id, userId);
    return this.pg.withTenant(t, async (client) => {
      await client.query(
        `UPDATE preview_sessions
         SET playhead_frame = $2, generation = $3, preview_tier = $4,
             last_scrub_message = $5, updated_at = $6::timestamptz
         WHERE id = $1`,
        [
          session.id,
          session.playhead_frame,
          session.generation,
          session.preview_tier,
          session.last_scrub_message,
          session.updated_at,
        ],
      );
      return session;
    });
  }
}

function rowToPreview(row: Record<string, unknown>): PreviewSession {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    organization_id: String(row.organization_id),
    asset_id: row.asset_id ? String(row.asset_id) : undefined,
    duration_frames: Number(row.duration_frames),
    fps_num: Number(row.fps_num),
    fps_den: Number(row.fps_den),
    playhead_frame: Number(row.playhead_frame),
    generation: Number(row.generation),
    preview_tier: row.preview_tier as PreviewSession["preview_tier"],
    last_scrub_message: String(row.last_scrub_message ?? "ready"),
    created_at: new Date(row.created_at as string | Date).toISOString(),
    updated_at: new Date(row.updated_at as string | Date).toISOString(),
  };
}
