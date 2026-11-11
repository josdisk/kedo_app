#pragma once

#include "kedov/io/media_probe.hpp"

#include <optional>
#include <string>

namespace kedov::io {

/// Discovers system `ffprobe` and probes via JSON (no libav link — LGPL isolation).
class FfprobeMediaProbe final : public IMediaProbe {
 public:
  explicit FfprobeMediaProbe(std::string ffprobe_path, int timeout_ms = 15000);

  [[nodiscard]] kedov::core::ProbeResult probe(const std::filesystem::path& path) const override;
  [[nodiscard]] std::string backend_name() const override { return "ffprobe-cli"; }

  [[nodiscard]] static std::optional<std::string> find_ffprobe_binary();

 private:
  std::string ffprobe_path_;
  int timeout_ms_;
};

}  // namespace kedov::io
