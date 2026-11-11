#include "kedov/timeline/sequence.hpp"

#include <iostream>

namespace {

int failures = 0;

void expect(bool cond, const char* msg) {
  if (!cond) {
    std::cerr << "FAIL: " << msg << "\n";
    ++failures;
  }
}

}  // namespace

int test_timeline_main() {
  using namespace kedov::timeline;
  using kedov::core::RationalTime;

  Sequence seq("seq_main", 24, 1);
  seq.add_track(Track{.track_id = "V1", .kind = Track::Kind::video});

  ClipInstance clip{
      .clip_id = "clip_1",
      .asset_id = "asset_a",
      .track_id = "V1",
      .timeline_in = RationalTime(0, 1),
      .timeline_out = RationalTime(2, 1),
      .source_in = RationalTime(0, 1),
      .source_out = RationalTime(2, 1),
      .take_id = "take_1",
      .angle_id = "cam_a",
  };

  EditOperation insert{
      .command_id = "cmd_1",
      .actor_id = "user_demo",
      .schema_version = 1,
      .payload = InsertClip{clip},
  };
  expect(seq.apply(insert, 0), "insert at revision 0");
  expect(seq.revision() == 1, "revision increments");
  expect(seq.clips().size() == 1, "one clip");
  expect(!seq.apply(insert, 0), "stale revision rejected");

  EditOperation razor{
      .command_id = "cmd_2",
      .actor_id = "user_demo",
      .payload = RazorCut{.track_id = "V1", .at = RationalTime(1, 1)},
  };
  expect(seq.apply(razor, 1), "razor applies");
  expect(seq.clips().size() == 2, "razor splits into two");
  expect(seq.clips()[0].take_id == "take_1" && seq.clips()[1].take_id == "take_1",
         "take identity preserved across razor");

  return failures;
}
