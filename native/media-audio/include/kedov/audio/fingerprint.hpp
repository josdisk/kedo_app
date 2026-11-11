#pragma once

#include "kedov/audio/sync_correlate.hpp"

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace kedov::audio {

inline constexpr const char* kFingerprintAlgorithmVersion = "kedov-fp-bands-onset-1.0";

struct SpectralLandmark {
  std::int64_t sample_index = 0;
  std::int32_t band = 0;
  float strength = 0.0f;
};

struct AudioFingerprint {
  std::string algorithm_version = kFingerprintAlgorithmVersion;
  std::int32_t sample_rate = 0;
  std::size_t frame_size = 0;
  std::size_t hop_size = 0;
  std::int32_t band_count = 0;
  std::vector<SpectralLandmark> landmarks;
  std::vector<float> onset_envelope;
};

struct FingerprintMatch {
  std::int64_t sample_offset = 0;
  double score = 0.0;
  std::int32_t vote_count = 0;
  std::string note;
};

struct FingerprintMatchResult {
  std::vector<FingerprintMatch> candidates;
  SyncEstimate best;
  std::string note;
};

/** Onset strength per hop (rectified energy derivative) — SYN-002 feature. */
[[nodiscard]] std::vector<float> onset_envelope(const std::vector<float>& mono, std::size_t hop);

/**
 * Build band-energy landmarks (lightweight spectral fingerprint, no external DSP lib).
 * Landmarks are local peaks in band energy across time — robust to mild EQ/reverb.
 */
[[nodiscard]] AudioFingerprint build_fingerprint(const std::vector<float>& mono,
                                                 std::int32_t sample_rate,
                                                 std::size_t frame_size = 1024,
                                                 std::size_t hop_size = 512,
                                                 std::int32_t band_count = 8);

/**
 * Match query fingerprint against reference via landmark offset voting (beyond NCC).
 * Returns ranked offset candidates; best SyncEstimate is populated from top vote.
 */
[[nodiscard]] FingerprintMatchResult match_fingerprints(const AudioFingerprint& reference,
                                                        const AudioFingerprint& query,
                                                        std::int64_t max_lag_samples);

/**
 * Coarse fingerprint match then optional NCC refine on waveforms (SYN-002 → SYN-003).
 */
[[nodiscard]] SyncEstimate fingerprint_then_correlate(const std::vector<float>& master,
                                                      const std::vector<float>& clip,
                                                      std::int32_t sample_rate,
                                                      std::int64_t max_lag_samples);

}  // namespace kedov::audio
