#pragma once

#include "kedov/audio/sync_correlate.hpp"

#include <cstdint>
#include <string>
#include <vector>

namespace kedov::audio {

/// One piecewise affine segment (SYN-005 / §5.1):
/// m = master_start + (s - source_start) * slope_num / slope_den
struct AffineSegment {
  std::int64_t source_start = 0;
  std::int64_t source_end = 0;
  std::int64_t master_start = 0;
  std::int64_t slope_num = 1;
  std::int64_t slope_den = 1;
  std::int64_t uncertainty_samples = 0;
};

struct DriftMap {
  std::vector<AffineSegment> segments;
  std::string note;
  double mean_abs_residual = 0.0;
  bool has_drift = false;  // any segment with slope != 1/1
};

struct DriftAnchor {
  std::int64_t source_sample = 0;
  std::int64_t master_sample = 0;
  double confidence = 0.0;
};

[[nodiscard]] std::int64_t map_source_to_master(const DriftMap& map, std::int64_t source_sample);

/** Fit a single linear segment between two anchors (rational slope reduced). */
[[nodiscard]] AffineSegment fit_linear_segment(const DriftAnchor& a, const DriftAnchor& b);

/**
 * Build a piecewise map from ordered anchors (SYN-005).
 * Adjacent pairs become segments; unity slope when insufficient span.
 */
[[nodiscard]] DriftMap build_piecewise_map(const std::vector<DriftAnchor>& anchors);

/**
 * Windowed NCC → anchors → piecewise affine map.
 * Never mutates input audio. Reports residual vs constant-offset baseline.
 */
[[nodiscard]] DriftMap estimate_drift_map(const std::vector<float>& master,
                                          const std::vector<float>& clip,
                                          std::int64_t max_lag_samples,
                                          std::size_t window_samples,
                                          std::size_t hop_samples);

}  // namespace kedov::audio
