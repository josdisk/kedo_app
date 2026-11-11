#pragma once

#include "kedov/core/rational_time.hpp"

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

namespace kedov::core {

struct StreamProbe {
  enum class Kind { video, audio, data, unknown };
  Kind kind = Kind::unknown;
  std::string codec;
  std::int32_t width = 0;
  std::int32_t height = 0;
  std::int32_t rotation_degrees = 0;
  RationalTime frame_rate{0, 1};
  std::int32_t sample_rate = 0;
  std::int32_t channels = 0;
  std::string colour_primaries;
  std::string colour_transfer;
  std::optional<std::string> timecode;
};

/// Probe output for ING-002. Does not mutate the source file.
struct ProbeResult {
  std::string container;
  RationalTime duration{0, 1};
  std::vector<StreamProbe> streams;
  bool quarantined = false;
  std::string quarantine_reason;
  std::string probe_backend;  // "stub" | "ffmpeg"
};

}  // namespace kedov::core
