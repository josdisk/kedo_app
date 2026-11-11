#pragma once

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace kedov::audio {

struct SyncEstimate {
  /// Positive: clip starts later relative to master (clip lags).
  std::int64_t sample_offset = 0;
  double confidence = 0.0;
  double peak_correlation = 0.0;
  std::string note;
  bool ambiguous = false;
};

/// Energy envelope for coarse alignment (SYN-002).
[[nodiscard]] std::vector<float> energy_envelope(const std::vector<float>& mono,
                                                 std::size_t hop);

/// Normalized cross-correlation peak search (SYN-003).
[[nodiscard]] SyncEstimate correlate_offset(const std::vector<float>& master,
                                            const std::vector<float>& clip,
                                            std::int64_t max_lag_samples);

/// Convert sample offset to approximate video frames at rational fps.
[[nodiscard]] double sample_offset_to_frame_error(std::int64_t sample_offset,
                                                  std::int32_t sample_rate,
                                                  std::int64_t fps_num,
                                                  std::int64_t fps_den);

}  // namespace kedov::audio
