#pragma once

#include "kedov/timeline/clip_instance.hpp"
#include "kedov/timeline/edit_operation.hpp"

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

namespace kedov::timeline {

struct Track {
  std::string track_id;
  enum class Kind { video, audio } kind = Kind::video;
  bool locked = false;
};

/// Append-only revisioned sequence (TIM-008 / DAT).
class Sequence {
 public:
  Sequence(std::string sequence_id, std::int64_t fps_num, std::int64_t fps_den);

  [[nodiscard]] const std::string& id() const noexcept { return sequence_id_; }
  [[nodiscard]] std::uint64_t revision() const noexcept { return revision_; }
  [[nodiscard]] const std::vector<Track>& tracks() const noexcept { return tracks_; }
  [[nodiscard]] const std::vector<ClipInstance>& clips() const noexcept { return clips_; }

  void add_track(Track track);
  /// Apply operation if expected_revision matches; returns false on conflict.
  [[nodiscard]] bool apply(const EditOperation& op, std::uint64_t expected_revision);

 private:
  std::string sequence_id_;
  std::int64_t fps_num_;
  std::int64_t fps_den_;
  std::uint64_t revision_ = 0;
  std::vector<Track> tracks_;
  std::vector<ClipInstance> clips_;
};

}  // namespace kedov::timeline
