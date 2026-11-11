#pragma once

#include <cstdint>
#include <filesystem>
#include <optional>
#include <string>
#include <vector>

namespace kedov::io {

enum class ProxyJobState {
  queued,
  running,
  completed,
  failed,
  cancelled,
};

struct ProxyJobSpec {
  std::string job_id;
  std::string project_id;
  std::string asset_id;
  std::filesystem::path source_path;
  std::filesystem::path output_path;
  std::int32_t target_height = 720;
  /** Default mpeg4 keeps LGPL-friendly intent; override when counsel approves libx264. */
  std::string video_codec = "mpeg4";
  std::string audio_codec = "aac";
};

struct ProxySourceMapping {
  std::string source_uri;
  std::string proxy_uri;
  std::int32_t target_height = 720;
  std::string scale_filter;
  /** Frame-accurate intent: keep source timestamps / do not resample FPS. */
  std::string timebase_policy = "preserve_source";
};

struct ProxyJobStatus {
  std::string job_id;
  ProxyJobState state = ProxyJobState::queued;
  double progress = 0.0;
  std::string message;
};

struct ProxyEncodeResult {
  bool ok = false;
  ProxyJobStatus status;
  ProxySourceMapping mapping;
  std::string backend;  // "ffmpeg-cli" | "unavailable" | "dry-run"
  std::string message;
  bool source_unchanged = true;
};

[[nodiscard]] const char* to_string(ProxyJobState state);
[[nodiscard]] ProxyJobStatus advance_proxy_job(ProxyJobStatus current, bool succeed);

/** Scale filter that preserves aspect (even width) — ING-008 calibrated height. */
[[nodiscard]] std::string proxy_scale_filter(std::int32_t target_height);

/**
 * Build argv for ffmpeg CLI proxy encode (no shell). Never includes in-place edit of source.
 * Argv[0] is the ffmpeg binary path.
 */
[[nodiscard]] std::vector<std::string> build_proxy_ffmpeg_argv(const ProxyJobSpec& spec,
                                                               const std::string& ffmpeg_bin);

/**
 * Encode a disposable proxy beside originals (ING-008). Source file is never opened for write.
 * Uses system ffmpeg via KEDOV_FFMPEG or PATH — does not link libav.
 */
[[nodiscard]] ProxyEncodeResult encode_proxy(const ProxyJobSpec& spec);

}  // namespace kedov::io
