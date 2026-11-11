/** Take-aware sync session contract (SYN / §5.1). Musical time ≠ take identity. */

import type { FingerprintMatch } from "./audio-fingerprint.js";
import type { DriftMap } from "./sync-drift.js";

export const SYNC_ALGORITHM_VERSION = "kedov-sync-ncc-1.0" as const;

export interface SyncTake {
  take_id: string;
  label: string;
  recorded_at_ms?: number;
}

export interface SyncAngle {
  angle_id: string;
  take_id: string;
  asset_id: string;
  camera_label: string;
}

export interface AlignmentHypothesis {
  sample_offset: number;
  confidence: number;
  peak_correlation: number;
  note: string;
}

export interface ClipAlignment {
  asset_id: string;
  take_id: string;
  angle_id: string;
  sample_offset: number;
  confidence: number;
  peak_correlation: number;
  frame_error_approx: number;
  ambiguous: boolean;
  user_override: boolean;
  note: string;
  alternates?: AlignmentHypothesis[];
  /** Optional piecewise affine drift map (SYN-005). */
  drift_map?: DriftMap;
  /** Optional landmark fingerprint match summary (SYN-002). */
  fingerprint?: {
    algorithm_version: string;
    landmark_count_ref: number;
    landmark_count_query: number;
    candidates: FingerprintMatch[];
    ambiguous: boolean;
    note: string;
  };
}

export interface SyncSession {
  session_id: string;
  project_id: string;
  master_asset_id: string;
  algorithm_version: string;
  sample_rate: number;
  fps_num: number;
  fps_den: number;
  created_at: string;
  takes: SyncTake[];
  angles: SyncAngle[];
  alignments: ClipAlignment[];
}

export interface CreateSyncSessionInput {
  master_asset_id: string;
  sample_rate?: number;
  fps_num?: number;
  fps_den?: number;
  clips: Array<{
    asset_id: string;
    camera_label?: string;
    recorded_at_ms?: number;
    explicit_take_id?: string;
    /** Demo/offline: provide offset/confidence instead of raw audio */
    sample_offset?: number;
    confidence?: number;
    peak_correlation?: number;
    ambiguous?: boolean;
    note?: string;
    alternates?: AlignmentHypothesis[];
  }>;
}

export interface SyncOverrideInput {
  asset_id: string;
  sample_offset: number;
  note?: string;
}

export function groupTakesFromClips(
  clips: CreateSyncSessionInput["clips"],
  concurrenceWindowMs = 5000,
): { takes: SyncTake[]; angles: SyncAngle[] } {
  const assetToTake = new Map<string, string>();
  let autoTake = 1;

  for (const clip of clips) {
    if (clip.explicit_take_id) {
      assetToTake.set(clip.asset_id, clip.explicit_take_id);
      continue;
    }
    let assigned: string | undefined;
    if (clip.recorded_at_ms != null) {
      for (const other of clips) {
        if (other.asset_id === clip.asset_id || other.recorded_at_ms == null) continue;
        if (Math.abs(other.recorded_at_ms - clip.recorded_at_ms) <= concurrenceWindowMs) {
          assigned = assetToTake.get(other.asset_id);
          if (assigned) break;
        }
      }
    }
    if (!assigned) {
      assigned = `take_${autoTake++}`;
    }
    assetToTake.set(clip.asset_id, assigned);
  }

  // Unify mutual concurrent pairs (non-explicit).
  for (const a of clips) {
    if (a.recorded_at_ms == null || a.explicit_take_id) continue;
    for (const b of clips) {
      if (a.asset_id === b.asset_id || b.recorded_at_ms == null || b.explicit_take_id) continue;
      if (Math.abs(a.recorded_at_ms - b.recorded_at_ms) > concurrenceWindowMs) continue;
      const ta = assetToTake.get(a.asset_id)!;
      const tb = assetToTake.get(b.asset_id)!;
      if (ta !== tb) {
        const keep = ta < tb ? ta : tb;
        const drop = ta < tb ? tb : ta;
        for (const [asset, take] of assetToTake) {
          if (take === drop) assetToTake.set(asset, keep);
        }
      }
    }
  }

  const takeMap = new Map<string, SyncTake>();
  const angles: SyncAngle[] = [];
  for (const clip of clips) {
    const takeId = assetToTake.get(clip.asset_id)!;
    if (!takeMap.has(takeId)) {
      takeMap.set(takeId, {
        take_id: takeId,
        label: takeId,
        recorded_at_ms: clip.recorded_at_ms,
      });
    }
    angles.push({
      angle_id: `angle_${clip.asset_id}`,
      take_id: takeId,
      asset_id: clip.asset_id,
      camera_label: clip.camera_label ?? clip.asset_id,
    });
  }

  return {
    takes: [...takeMap.values()].sort((a, b) => a.take_id.localeCompare(b.take_id)),
    angles,
  };
}
