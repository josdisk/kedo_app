#pragma once

#include "kedov/audio/sync_correlate.hpp"

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

namespace kedov::audio {

inline constexpr const char* kSyncAlgorithmVersion = "kedov-sync-ncc-1.0";

/// Physically distinct performance (SYN / §5.1). Never collapse with another take.
struct Take {
  std::string take_id;
  std::string label;
  /// Optional wall-clock hint (unix ms); used for concurrence grouping only.
  std::optional<std::int64_t> recorded_at_ms;
};

/// Camera view of a particular take — simultaneous with sibling angles.
struct CameraAngle {
  std::string angle_id;
  std::string take_id;
  std::string asset_id;
  std::string camera_label;
};

struct SyncAnchor {
  std::int64_t source_sample = 0;
  std::int64_t master_sample = 0;
  double confidence = 0.0;
};

struct AlignmentHypothesis {
  std::int64_t sample_offset = 0;
  double confidence = 0.0;
  double peak_correlation = 0.0;
  std::string note;
};

/// Per-clip alignment to master music clock. Musical time ≠ take identity.
struct ClipAlignment {
  std::string asset_id;
  std::string take_id;
  std::string angle_id;
  std::int64_t sample_offset = 0;
  double confidence = 0.0;
  double peak_correlation = 0.0;
  double frame_error_approx = 0.0;
  bool ambiguous = false;
  bool user_override = false;
  std::string note;
  std::vector<AlignmentHypothesis> alternates;
  std::vector<SyncAnchor> anchors;
};

struct SyncSession {
  std::string session_id;
  std::string project_id;
  std::string master_asset_id;
  std::string algorithm_version = kSyncAlgorithmVersion;
  std::int32_t sample_rate = 0;
  std::int64_t fps_num = 24;
  std::int64_t fps_den = 1;
  std::vector<Take> takes;
  std::vector<CameraAngle> angles;
  std::vector<ClipAlignment> alignments;
  std::string created_at_iso;
};

/// Group clips into takes vs concurrent angles (SYN-009).
/// Clips with wall-clock within `concurrence_window_ms` share a take; others get distinct takes
/// even when they align to the same musical offset.
struct GroupingInput {
  std::string asset_id;
  std::string camera_label;
  std::optional<std::int64_t> recorded_at_ms;
  /// Optional explicit take label from slate/user; wins over wall-clock.
  std::optional<std::string> explicit_take_id;
};

struct GroupingResult {
  std::vector<Take> takes;
  std::vector<CameraAngle> angles;
};

[[nodiscard]] GroupingResult group_takes_and_angles(
    const std::vector<GroupingInput>& clips,
    std::int64_t concurrence_window_ms = 5000);

/// Build alignments for clips against master mono PCM (SYN-003/004/010).
[[nodiscard]] std::vector<ClipAlignment> align_clips_to_master(
    const std::vector<float>& master,
    const std::vector<std::pair<std::string, std::vector<float>>>& clips,
    const GroupingResult& grouping,
    std::int32_t sample_rate,
    std::int64_t fps_num,
    std::int64_t fps_den,
    std::int64_t max_lag_samples);

/// Apply manual slip override; marks user_override and clears fabricated certainty (SYN-010).
[[nodiscard]] bool apply_manual_override(SyncSession& session,
                                         const std::string& asset_id,
                                         std::int64_t sample_offset,
                                         const std::string& note = "manual override");

[[nodiscard]] std::string sync_session_to_json(const SyncSession& session);
[[nodiscard]] bool sync_session_from_json(const std::string& json, SyncSession& out,
                                          std::string* error = nullptr);
[[nodiscard]] bool save_sync_session(const SyncSession& session,
                                     const std::string& path,
                                     std::string* error = nullptr);
[[nodiscard]] bool load_sync_session(const std::string& path,
                                     SyncSession& out,
                                     std::string* error = nullptr);

/// Top-N correlation peaks for chorus ambiguity review.
[[nodiscard]] std::vector<AlignmentHypothesis> top_correlation_peaks(
    const std::vector<float>& master,
    const std::vector<float>& clip,
    std::int64_t max_lag_samples,
    std::size_t max_peaks = 3);

}  // namespace kedov::audio
