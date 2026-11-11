#pragma once

#include "kedov/core/rational_time.hpp"

#include <string>

namespace kedov::timeline {

struct ClipInstance {
  std::string clip_id;
  std::string asset_id;
  std::string track_id;
  kedov::core::RationalTime timeline_in;
  kedov::core::RationalTime timeline_out;
  kedov::core::RationalTime source_in;
  kedov::core::RationalTime source_out;
  /// Distinct from simultaneous multicam angles (SYN / §5.1).
  std::string take_id;
  std::string angle_id;
};

}  // namespace kedov::timeline
