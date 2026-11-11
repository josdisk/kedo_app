import { Injectable, Optional } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  ensureTenant,
  postgresEnabled,
  preferPostgres,
  tenantContext,
} from "../db/tenant-bootstrap";
import { PostgresService } from "../db/postgres.service";
import { groupTakesAndAngles } from "./sync.grouping";
import type {
  ClipAlignment,
  FingerprintSummary,
  SyncSessionRecord,
} from "./sync.types";

const ALGORITHM = "kedov-sync-ncc-1.0";

@Injectable()
export class SyncStore {
  private readonly sessions = new Map<string, SyncSessionRecord>();
  private readonly preferPg: boolean;

  constructor(@Optional() private readonly pg?: PostgresService) {
    this.preferPg = preferPostgres();
    if (!this.preferPg) {
      this.seedDemo();
    }
  }

  private get postgresMode(): boolean {
    return postgresEnabled(this.pg);
  }

  private seedDemo(): void {
    const now = new Date().toISOString();
    const demo: SyncSessionRecord = {
      session_id: "sync_demo_music",
      project_id: "proj_demo_music",
      organization_id: process.env.API_DEMO_ORG_ID ?? "org_demo",
      master_asset_id: "asset_master_song",
      algorithm_version: ALGORITHM,
      sample_rate: 48000,
      fps_num: 24,
      fps_den: 1,
      created_at: now,
      updated_at: now,
      takes: [
        { take_id: "take_1", label: "Take 1 — verse", recorded_at_ms: 1_000_000 },
        { take_id: "take_2", label: "Take 2 — chorus redo", recorded_at_ms: 3_600_000 },
      ],
      angles: [
        {
          angle_id: "angle_cam_a_t1",
          take_id: "take_1",
          asset_id: "asset_cam_a_t1",
          camera_label: "Cam A",
        },
        {
          angle_id: "angle_cam_b_t1",
          take_id: "take_1",
          asset_id: "asset_cam_b_t1",
          camera_label: "Cam B",
        },
        {
          angle_id: "angle_cam_a_t2",
          take_id: "take_2",
          asset_id: "asset_cam_a_t2",
          camera_label: "Cam A",
        },
      ],
      alignments: [
        {
          asset_id: "asset_cam_a_t1",
          take_id: "take_1",
          angle_id: "angle_cam_a_t1",
          sample_offset: 4800,
          confidence: 0.92,
          peak_correlation: 0.94,
          frame_error_approx: 2.4,
          ambiguous: false,
          user_override: false,
          note: "ok",
          alternates: [
            { sample_offset: 4800, confidence: 0.92, peak_correlation: 0.94, note: "primary" },
          ],
          drift_map: {
            segments: [
              {
                source_start: 0,
                source_end: 48000,
                master_start: 4800,
                slope_num: 1,
                slope_den: 1,
                uncertainty_samples: 1,
              },
            ],
            note: "demo constant-offset map",
            mean_abs_residual: 0,
            has_drift: false,
          },
        },
        {
          asset_id: "asset_cam_b_t1",
          take_id: "take_1",
          angle_id: "angle_cam_b_t1",
          sample_offset: 4810,
          confidence: 0.88,
          peak_correlation: 0.9,
          frame_error_approx: 2.405,
          ambiguous: false,
          user_override: false,
          note: "ok",
          alternates: [],
          drift_map: {
            segments: [
              {
                source_start: 0,
                source_end: 48000,
                master_start: 100,
                slope_num: 481,
                slope_den: 480,
                uncertainty_samples: 4,
              },
            ],
            note: "demo piecewise affine drift (SYN-005)",
            mean_abs_residual: 0,
            has_drift: true,
          },
        },
        {
          asset_id: "asset_cam_a_t2",
          take_id: "take_2",
          angle_id: "angle_cam_a_t2",
          sample_offset: 4800,
          confidence: 0.55,
          peak_correlation: 0.72,
          frame_error_approx: 2.4,
          ambiguous: true,
          user_override: false,
          note: "multiple strong peaks; possible repeated chorus ambiguity",
          alternates: [
            { sample_offset: 4800, confidence: 0.72, peak_correlation: 0.72, note: "primary" },
            { sample_offset: 52800, confidence: 0.7, peak_correlation: 0.7, note: "alternate" },
          ],
        },
      ],
    };
    this.sessions.set(demo.session_id, demo);
  }

  async listForProject(
    projectId: string,
    orgId: string,
    userId?: string,
  ): Promise<SyncSessionRecord[]> {
    if (!this.postgresMode || !this.pg) {
      return [...this.sessions.values()].filter(
        (s) => s.project_id === projectId && s.organization_id === orgId,
      );
    }
    const t = tenantContext(orgId, userId);
    return this.pg.withTenant(t, async (client) => {
      await ensureTenant(client, orgId, t.user_id);
      const res = await client.query(
        `SELECT id, project_id, organization_id, master_asset_id, algorithm_version,
                sample_rate, fps_num, fps_den, payload, created_at, updated_at
         FROM sync_sessions WHERE project_id = $1`,
        [projectId],
      );
      return res.rows.map(rowToSession);
    });
  }

  async get(
    sessionId: string,
    orgId?: string,
    userId?: string,
  ): Promise<SyncSessionRecord | undefined> {
    if (!this.postgresMode || !this.pg) {
      return this.sessions.get(sessionId);
    }
    if (!orgId) return undefined;
    const t = tenantContext(orgId, userId);
    return this.pg.withTenant(t, async (client) => {
      const res = await client.query(
        `SELECT id, project_id, organization_id, master_asset_id, algorithm_version,
                sample_rate, fps_num, fps_den, payload, created_at, updated_at
         FROM sync_sessions WHERE id = $1`,
        [sessionId],
      );
      return res.rows[0] ? rowToSession(res.rows[0]) : undefined;
    });
  }

  async create(input: {
    project_id: string;
    organization_id: string;
    master_asset_id: string;
    sample_rate?: number;
    fps_num?: number;
    fps_den?: number;
    clips: Array<{
      asset_id: string;
      camera_label?: string;
      recorded_at_ms?: number;
      explicit_take_id?: string;
      sample_offset?: number;
      confidence?: number;
      peak_correlation?: number;
      ambiguous?: boolean;
      note?: string;
      alternates?: ClipAlignment["alternates"];
    }>;
  }): Promise<SyncSessionRecord> {
    const now = new Date().toISOString();
    const { takes, angles } = groupTakesAndAngles(input.clips);
    const sampleRate = input.sample_rate ?? 48000;
    const fpsNum = input.fps_num ?? 24;
    const fpsDen = input.fps_den ?? 1;
    const angleByAsset = new Map(angles.map((a) => [a.asset_id, a]));

    const alignments: ClipAlignment[] = input.clips.map((clip) => {
      const angle = angleByAsset.get(clip.asset_id)!;
      const offset = clip.sample_offset ?? 0;
      const conf = Math.max(0, Math.min(1, clip.confidence ?? 0.5));
      const ambiguous = Boolean(clip.ambiguous);
      return {
        asset_id: clip.asset_id,
        take_id: angle.take_id,
        angle_id: angle.angle_id,
        sample_offset: offset,
        confidence: ambiguous ? Math.min(conf, 0.85) : conf,
        peak_correlation: clip.peak_correlation ?? conf,
        frame_error_approx: (offset / sampleRate) * (fpsNum / fpsDen),
        ambiguous,
        user_override: false,
        note: clip.note ?? (ambiguous ? "ambiguous — review required" : "ok"),
        alternates: clip.alternates ?? [],
      };
    });

    const session: SyncSessionRecord = {
      session_id: `sync_${randomUUID()}`,
      project_id: input.project_id,
      organization_id: input.organization_id,
      master_asset_id: input.master_asset_id,
      algorithm_version: ALGORITHM,
      sample_rate: sampleRate,
      fps_num: fpsNum,
      fps_den: fpsDen,
      created_at: now,
      updated_at: now,
      takes,
      angles,
      alignments,
    };

    if (!this.postgresMode || !this.pg) {
      this.sessions.set(session.session_id, session);
      return session;
    }

    const t = tenantContext(input.organization_id);
    return this.pg.withTenant(t, async (client) => {
      await ensureTenant(client, input.organization_id, t.user_id);
      await client.query(
        `INSERT INTO sync_sessions
           (id, project_id, organization_id, master_asset_id, algorithm_version,
            sample_rate, fps_num, fps_den, payload, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::timestamptz,$10::timestamptz)`,
        [
          session.session_id,
          session.project_id,
          session.organization_id,
          session.master_asset_id,
          session.algorithm_version,
          session.sample_rate,
          session.fps_num,
          session.fps_den,
          JSON.stringify(payloadOf(session)),
          now,
        ],
      );
      return session;
    });
  }

  async override(
    sessionId: string,
    orgId: string,
    assetId: string,
    sampleOffset: number,
    note?: string,
    userId?: string,
  ): Promise<SyncSessionRecord | undefined> {
    const session = await this.get(sessionId, orgId, userId);
    if (!session || session.organization_id !== orgId) return undefined;
    const al = session.alignments.find((a) => a.asset_id === assetId);
    if (!al) return undefined;
    al.sample_offset = sampleOffset;
    al.user_override = true;
    al.ambiguous = false;
    al.confidence = 1;
    al.note = note ?? "manual override";
    al.frame_error_approx =
      (sampleOffset / session.sample_rate) * (session.fps_num / session.fps_den);
    session.updated_at = new Date().toISOString();
    return this.persist(session, userId);
  }

  async attachDrift(
    sessionId: string,
    orgId: string,
    assetId: string,
    anchors: Array<{ source_sample: number; master_sample: number; confidence: number }>,
    userId?: string,
  ): Promise<SyncSessionRecord | undefined> {
    const session = await this.get(sessionId, orgId, userId);
    if (!session || session.organization_id !== orgId) return undefined;
    const al = session.alignments.find((a) => a.asset_id === assetId);
    if (!al) return undefined;
    const { buildPiecewiseMap } = await import("@kedov/contracts");
    al.drift_map = buildPiecewiseMap(anchors);
    session.updated_at = new Date().toISOString();
    return this.persist(session, userId);
  }

  async attachFingerprint(
    sessionId: string,
    orgId: string,
    input: {
      asset_id: string;
      algorithm_version?: string;
      landmark_count_ref: number;
      landmark_count_query: number;
      candidates: FingerprintSummary["candidates"];
      ambiguous?: boolean;
      note?: string;
    },
    userId?: string,
  ): Promise<SyncSessionRecord | undefined> {
    const session = await this.get(sessionId, orgId, userId);
    if (!session || session.organization_id !== orgId) return undefined;
    const al = session.alignments.find((a) => a.asset_id === input.asset_id);
    if (!al) return undefined;
    const candidates = input.candidates ?? [];
    al.fingerprint = {
      algorithm_version: input.algorithm_version ?? "kedov-fp-bands-onset-1.0",
      landmark_count_ref: input.landmark_count_ref,
      landmark_count_query: input.landmark_count_query,
      candidates,
      ambiguous: Boolean(input.ambiguous),
      note: input.note ?? "ok",
    };
    if (candidates[0] && !al.user_override) {
      al.sample_offset = candidates[0].sample_offset;
      al.peak_correlation = candidates[0].score;
      al.confidence = Math.min(1, Math.max(al.confidence, candidates[0].score));
      al.frame_error_approx =
        (al.sample_offset / session.sample_rate) * (session.fps_num / session.fps_den);
      if (input.ambiguous) {
        al.ambiguous = true;
        al.confidence = Math.min(al.confidence, 0.7);
      }
      al.note = input.note ?? "fingerprint landmark match (SYN-002)";
      al.alternates = candidates.slice(0, 5).map((c) => ({
        sample_offset: c.sample_offset,
        confidence: c.score,
        peak_correlation: c.score,
        note: c.note,
      }));
    }
    session.updated_at = new Date().toISOString();
    return this.persist(session, userId);
  }

  private async persist(
    session: SyncSessionRecord,
    userId?: string,
  ): Promise<SyncSessionRecord> {
    if (!this.postgresMode || !this.pg) {
      this.sessions.set(session.session_id, session);
      return session;
    }
    const t = tenantContext(session.organization_id, userId);
    return this.pg.withTenant(t, async (client) => {
      await client.query(
        `UPDATE sync_sessions
         SET payload = $2::jsonb, updated_at = $3::timestamptz
         WHERE id = $1`,
        [session.session_id, JSON.stringify(payloadOf(session)), session.updated_at],
      );
      return session;
    });
  }
}

function payloadOf(session: SyncSessionRecord) {
  return {
    takes: session.takes,
    angles: session.angles,
    alignments: session.alignments,
  };
}

function rowToSession(row: Record<string, unknown>): SyncSessionRecord {
  const payload = (row.payload as Record<string, unknown>) ?? {};
  return {
    session_id: String(row.id),
    project_id: String(row.project_id),
    organization_id: String(row.organization_id),
    master_asset_id: String(row.master_asset_id),
    algorithm_version: String(row.algorithm_version),
    sample_rate: Number(row.sample_rate),
    fps_num: Number(row.fps_num),
    fps_den: Number(row.fps_den),
    created_at: new Date(row.created_at as string | Date).toISOString(),
    updated_at: new Date(row.updated_at as string | Date).toISOString(),
    takes: (payload.takes as SyncSessionRecord["takes"]) ?? [],
    angles: (payload.angles as SyncSessionRecord["angles"]) ?? [],
    alignments: (payload.alignments as SyncSessionRecord["alignments"]) ?? [],
  };
}
