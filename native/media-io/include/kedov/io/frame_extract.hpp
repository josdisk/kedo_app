#pragma once

#include <cstdint>
#include <filesystem>
#include <optional>
#include <string>
#include <vector>

namespace kedov::io {

struct FrameExtractResult {
  bool ok = false;
  std::filesystem::path output_path;
  std::string message;
  std::string backend;  // "ffmpeg-cli" | "unavailable"
  std::int64_t frame_index = 0;
  std::uint64_t request_generation = 0;
};

struct ScrubRequest {
  std::uint64_t generation = 0;
  std::filesystem::path source_path;
  std::filesystem::path output_ppm;
  std::int64_t frame_index = 0;
  std::int64_t fps_num = 24;
  std::int64_t fps_den = 1;
};

/// Extract first decoded frame to PPM via system ffmpeg (optional). Never mutates source.
[[nodiscard]] FrameExtractResult extract_first_frame_ppm(const std::filesystem::path& source,
                                                         const std::filesystem::path& output_ppm);

/**
 * Extract a single frame at playhead (PLAY-003/005 path). Uses -ss after -i for frame accuracy
 * on short clips; never opens source for write.
 */
[[nodiscard]] FrameExtractResult extract_frame_at(const ScrubRequest& request);

/** Argv builder for tests — output is always a separate PPM path. */
[[nodiscard]] std::vector<std::string> build_scrub_ffmpeg_argv(const ScrubRequest& request,
                                                               const std::string& ffmpeg_bin);

/**
 * Scrub scheduler: only the latest generation is authoritative (PLAY-003).
 * Fast successive scrubs mark older generations obsolete without blocking.
 */
class ScrubScheduler {
 public:
  [[nodiscard]] std::uint64_t begin_scrub();
  [[nodiscard]] bool is_current(std::uint64_t generation) const noexcept;
  [[nodiscard]] std::uint64_t current_generation() const noexcept { return generation_; }

  /** Runs extract_frame_at only if generation is still current; otherwise returns cancelled. */
  [[nodiscard]] FrameExtractResult run_if_current(const ScrubRequest& request);

 private:
  std::uint64_t generation_ = 0;
};

[[nodiscard]] std::optional<std::string> find_ffmpeg_binary();

}  // namespace kedov::io
