/** Portable proxy encode contract (ING-008) — ffmpeg CLI args, no libav link. */

export interface ProxyEncodeSpec {
  source_path: string;
  output_path: string;
  target_height?: number;
  video_codec?: string;
  audio_codec?: string;
}

export interface ProxySourceMapping {
  source_uri: string;
  proxy_uri: string;
  target_height: number;
  scale_filter: string;
  timebase_policy: "preserve_source";
}

export function proxyScaleFilter(targetHeight: number): string {
  const h = Math.min(4320, Math.max(120, Math.trunc(targetHeight)));
  return `scale=-2:${h}`;
}

/**
 * Build argv for system ffmpeg. Source is input-only; output is a separate path.
 * Default video codec mpeg4 keeps LGPL-friendly intent.
 */
export function buildProxyFfmpegArgv(
  spec: ProxyEncodeSpec,
  ffmpegBin = "ffmpeg",
): string[] {
  if (!spec.source_path || !spec.output_path) {
    throw new Error("source_path and output_path are required");
  }
  if (spec.source_path === spec.output_path) {
    throw new Error("proxy output_path must differ from source_path (ING-008)");
  }
  const height = spec.target_height ?? 720;
  const vf = proxyScaleFilter(height);
  return [
    ffmpegBin,
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    spec.source_path,
    "-vf",
    vf,
    "-c:v",
    spec.video_codec ?? "mpeg4",
    "-q:v",
    "5",
    "-c:a",
    spec.audio_codec ?? "aac",
    "-movflags",
    "+faststart",
    spec.output_path,
  ];
}

export function describeProxyMapping(spec: ProxyEncodeSpec): ProxySourceMapping {
  const height = spec.target_height ?? 720;
  return {
    source_uri: `file://${spec.source_path}`,
    proxy_uri: `file://${spec.output_path}`,
    target_height: height,
    scale_filter: proxyScaleFilter(height),
    timebase_policy: "preserve_source",
  };
}
