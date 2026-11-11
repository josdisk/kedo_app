import type { SyncAngle, SyncTake } from "./sync.types";

export interface ClipGroupingInput {
  asset_id: string;
  camera_label?: string;
  recorded_at_ms?: number;
  explicit_take_id?: string;
}

export function groupTakesAndAngles(
  clips: ClipGroupingInput[],
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
    if (!assigned) assigned = `take_${autoTake++}`;
    assetToTake.set(clip.asset_id, assigned);
  }

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
