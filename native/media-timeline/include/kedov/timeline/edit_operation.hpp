#pragma once

#include "kedov/timeline/clip_instance.hpp"

#include <cstdint>
#include <string>
#include <variant>

namespace kedov::timeline {

struct InsertClip {
  ClipInstance clip;
};

struct RemoveClip {
  std::string clip_id;
};

struct RazorCut {
  std::string track_id;
  kedov::core::RationalTime at;
};

using EditPayload = std::variant<InsertClip, RemoveClip, RazorCut>;

struct EditOperation {
  std::string command_id;
  std::string actor_id;
  std::int32_t schema_version = 1;
  EditPayload payload;
};

}  // namespace kedov::timeline
