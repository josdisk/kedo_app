#include "kedov/timeline/sequence.hpp"

#include <algorithm>
#include <stdexcept>
#include <type_traits>
#include <utility>

namespace kedov::timeline {

Sequence::Sequence(std::string sequence_id, std::int64_t fps_num, std::int64_t fps_den)
    : sequence_id_(std::move(sequence_id)), fps_num_(fps_num), fps_den_(fps_den) {
  if (fps_num_ <= 0 || fps_den_ <= 0) {
    throw std::invalid_argument("fps must be positive");
  }
}

void Sequence::add_track(Track track) { tracks_.push_back(std::move(track)); }

bool Sequence::apply(const EditOperation& op, std::uint64_t expected_revision) {
  if (expected_revision != revision_) {
    return false;
  }

  const auto track_locked = [&](const std::string& track_id) {
    const auto it = std::find_if(tracks_.begin(), tracks_.end(), [&](const Track& t) {
      return t.track_id == track_id;
    });
    return it != tracks_.end() && it->locked;
  };

  std::visit(
      [&](const auto& payload) {
        using T = std::decay_t<decltype(payload)>;
        if constexpr (std::is_same_v<T, InsertClip>) {
          if (track_locked(payload.clip.track_id)) {
            throw std::runtime_error("cannot insert on locked track");
          }
          clips_.push_back(payload.clip);
        } else if constexpr (std::is_same_v<T, RemoveClip>) {
          clips_.erase(std::remove_if(clips_.begin(), clips_.end(),
                                      [&](const ClipInstance& c) {
                                        return c.clip_id == payload.clip_id;
                                      }),
                       clips_.end());
        } else if constexpr (std::is_same_v<T, RazorCut>) {
          if (track_locked(payload.track_id)) {
            throw std::runtime_error("cannot razor locked track");
          }
          std::vector<ClipInstance> next;
          next.reserve(clips_.size() + 1);
          for (const auto& clip : clips_) {
            if (clip.track_id != payload.track_id || !(clip.timeline_in < payload.at) ||
                !(payload.at < clip.timeline_out)) {
              next.push_back(clip);
              continue;
            }
            ClipInstance left = clip;
            left.timeline_out = payload.at;
            left.clip_id = clip.clip_id + "_a";
            ClipInstance right = clip;
            right.timeline_in = payload.at;
            right.clip_id = clip.clip_id + "_b";
            // Keep source mapping continuous with timeline delta.
            const auto delta = payload.at.sub(clip.timeline_in);
            right.source_in = clip.source_in.add(delta);
            left.source_out = right.source_in;
            next.push_back(left);
            next.push_back(right);
          }
          clips_ = std::move(next);
        }
      },
      op.payload);

  ++revision_;
  return true;
}

}  // namespace kedov::timeline
