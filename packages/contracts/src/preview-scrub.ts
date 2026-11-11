/** Portable scrub / playhead contract (PLAY-003, PLAY-005) — Qt-free alternative. */

export interface RationalFps {
  num: number;
  den: number;
}

export interface Playhead {
  frame_index: number;
  fps: RationalFps;
  /** Monotonic scrub generation; only the latest should paint (PLAY-003). */
  generation: number;
}

export interface ScrubResult {
  ok: boolean;
  generation: number;
  frame_index: number;
  rational_time: string;
  seconds_approx: number;
  preview_tier: "full" | "proxy" | "thumbnail";
  message: string;
  obsolete?: boolean;
}

export function clampFrame(frameIndex: number, durationFrames: number): number {
  if (!Number.isFinite(frameIndex)) return 0;
  const max = Math.max(0, Math.trunc(durationFrames) - 1);
  return Math.min(max, Math.max(0, Math.trunc(frameIndex)));
}

export function frameToRationalString(frameIndex: number, fps: RationalFps): string {
  const frame = Math.max(0, Math.trunc(frameIndex));
  const num = frame * fps.den;
  const den = fps.num;
  return `${num}/${den}`;
}

export function frameToSecondsApprox(frameIndex: number, fps: RationalFps): number {
  if (fps.num <= 0 || fps.den <= 0) return 0;
  return (Math.max(0, frameIndex) * fps.den) / fps.num;
}

export function formatTimecode(frameIndex: number, fps: RationalFps): string {
  const seconds = frameToSecondsApprox(frameIndex, fps);
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const fpsFloat = fps.num / fps.den;
  const f = Math.trunc(frameIndex % Math.max(1, Math.round(fpsFloat)));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

/**
 * Apply a scrub completion only if it matches the latest generation.
 * Fast scrubs cancel older paints without locking the UI thread (PLAY-003).
 */
export function applyScrubResult(
  playhead: Playhead,
  result: ScrubResult,
): { playhead: Playhead; accepted: boolean; reason?: string } {
  if (result.generation !== playhead.generation) {
    return {
      playhead,
      accepted: false,
      reason: "obsolete scrub cancelled",
    };
  }
  if (!result.ok || result.obsolete) {
    return {
      playhead,
      accepted: false,
      reason: result.message || "scrub failed",
    };
  }
  return {
    playhead: {
      ...playhead,
      frame_index: result.frame_index,
    },
    accepted: true,
  };
}

/** Begin a new scrub; bumps generation so in-flight older work becomes obsolete. */
export function beginScrub(playhead: Playhead, frameIndex: number): Playhead {
  return {
    ...playhead,
    frame_index: Math.max(0, Math.trunc(frameIndex)),
    generation: playhead.generation + 1,
  };
}

export function makeScrubResult(
  playhead: Playhead,
  opts?: { ok?: boolean; preview_tier?: ScrubResult["preview_tier"]; message?: string },
): ScrubResult {
  return {
    ok: opts?.ok ?? true,
    generation: playhead.generation,
    frame_index: playhead.frame_index,
    rational_time: frameToRationalString(playhead.frame_index, playhead.fps),
    seconds_approx: frameToSecondsApprox(playhead.frame_index, playhead.fps),
    preview_tier: opts?.preview_tier ?? "proxy",
    message: opts?.message ?? "ok",
  };
}
