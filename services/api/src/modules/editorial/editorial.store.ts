import { Injectable, Optional } from "@nestjs/common";
import type { EditPlan, SequenceSnapshot } from "@kedov/contracts";
import {
  ensureTenant,
  postgresEnabled,
  preferPostgres,
  tenantContext,
} from "../db/tenant-bootstrap";
import { PostgresService } from "../db/postgres.service";

const DEFAULT_SEQ: SequenceSnapshot = {
  sequence_id: "seq_main",
  revision: 0,
  clips: [
    {
      clip_id: "clip_main",
      asset_id: "asset_placeholder",
      track_id: "V1",
      start_frame: 0,
      end_frame: 24,
    },
  ],
  grade_by_scope: {},
};

@Injectable()
export class EditorialStore {
  private readonly sequences = new Map<string, SequenceSnapshot>();
  private readonly plans = new Map<string, EditPlan>();
  private readonly preferPg: boolean;

  constructor(@Optional() private readonly pg?: PostgresService) {
    this.preferPg = preferPostgres();
    if (!this.preferPg) {
      this.sequences.set("seq_main", structuredClone(DEFAULT_SEQ));
    }
  }

  private get postgresMode(): boolean {
    return postgresEnabled(this.pg);
  }

  private key(projectId: string, sequenceId: string): string {
    return `${projectId}:${sequenceId}`;
  }

  async getSequence(
    projectId: string,
    sequenceId: string,
    orgId: string,
    userId?: string,
  ): Promise<SequenceSnapshot | undefined> {
    if (!this.postgresMode || !this.pg) {
      // Memory demo uses global sequence id (legacy tests).
      return this.sequences.get(sequenceId) ?? this.sequences.get(this.key(projectId, sequenceId));
    }
    const t = tenantContext(orgId, userId);
    return this.pg.withTenant(t, async (client) => {
      await ensureTenant(client, orgId, t.user_id);
      const res = await client.query(
        `SELECT payload FROM sequence_states WHERE project_id = $1 AND sequence_id = $2`,
        [projectId, sequenceId],
      );
      if (res.rows[0]) return res.rows[0].payload as SequenceSnapshot;
      // Seed default sequence on first touch for known demo id.
      if (sequenceId === "seq_main") {
        const payload = structuredClone(DEFAULT_SEQ);
        await client.query(
          `INSERT INTO sequence_states (project_id, sequence_id, organization_id, revision, payload)
           VALUES ($1,$2,$3,$4,$5::jsonb)
           ON CONFLICT (project_id, sequence_id) DO NOTHING`,
          [projectId, sequenceId, orgId, payload.revision, JSON.stringify(payload)],
        );
        return payload;
      }
      return undefined;
    });
  }

  async saveSequence(
    projectId: string,
    orgId: string,
    sequence: SequenceSnapshot,
    userId?: string,
  ): Promise<SequenceSnapshot> {
    if (!this.postgresMode || !this.pg) {
      this.sequences.set(sequence.sequence_id, sequence);
      this.sequences.set(this.key(projectId, sequence.sequence_id), sequence);
      return sequence;
    }
    const t = tenantContext(orgId, userId);
    return this.pg.withTenant(t, async (client) => {
      await ensureTenant(client, orgId, t.user_id);
      await client.query(
        `INSERT INTO sequence_states (project_id, sequence_id, organization_id, revision, payload, updated_at)
         VALUES ($1,$2,$3,$4,$5::jsonb, now())
         ON CONFLICT (project_id, sequence_id) DO UPDATE
           SET revision = EXCLUDED.revision,
               payload = EXCLUDED.payload,
               updated_at = now()`,
        [
          projectId,
          sequence.sequence_id,
          orgId,
          sequence.revision,
          JSON.stringify(sequence),
        ],
      );
      return sequence;
    });
  }

  rememberPlan(key: string, plan: EditPlan): void {
    this.plans.set(key, plan);
  }
}
