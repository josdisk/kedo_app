#include "kedov/timeline/plan_apply.hpp"

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

int test_plan_apply_main() {
  using namespace kedov::timeline;

  Sequence seq("seq_main", 24, 1);
  seq.add_track(Track{.track_id = "V1", .kind = Track::Kind::video});
  GradeBook grades;

  PortablePlan stale{.sequence_id = "seq_main", .expected_revision = 3};
  auto bad = apply_portable_plan(seq, grades, stale);
  expect(!bad.ok, "stale revision rejected");

  PortablePlan plan;
  plan.sequence_id = "seq_main";
  plan.expected_revision = 0;
  plan.preserve_master_audio = true;
  plan.operations.push_back(PlanOpReplace{
      .target_clip_id = "clip_main",
      .source_asset_id = "asset_take4_close",
      .start_frame = 0,
      .end_frame = 48,
      .source_in_frame = 10,
  });
  plan.operations.push_back(PlanOpGrade{
      .scope = "genre_music_video",
      .parameters = {{"saturation_delta", -0.08}, {"contrast_delta", 0.04}},
  });
  plan.operations.push_back(PlanOpReplace{
      .target_clip_id = "clip_main",
      .source_asset_id = "master_replace_forbidden",
      .start_frame = 48,
      .end_frame = 96,
      .source_in_frame = 0,
  });

  auto ok = apply_portable_plan(seq, grades, plan);
  expect(ok.ok, "plan applies");
  expect(ok.applied >= 2, "replace + grade applied");
  expect(ok.skipped >= 1, "master replace skipped");
  expect(seq.revision() > 0, "revision advanced");
  expect(grades.by_scope.count("genre_music_video") == 1, "grade scope stored");
  expect(grades.by_scope["genre_music_video"].saturation < 1.0, "saturation delta applied");

  // Authenticity lock forces class A on grades.
  Sequence seq2("seq_main", 24, 1);
  seq2.add_track(Track{.track_id = "V1", .kind = Track::Kind::video});
  GradeBook g2;
  PortablePlan locked{.sequence_id = "seq_main", .expected_revision = 0, .authenticity_lock = true};
  locked.operations.push_back(PlanOpGrade{.scope = "look", .parameters = {{"saturation_delta", 0.1}}});
  auto r2 = apply_portable_plan(seq2, g2, locked);
  expect(r2.ok, "locked grade plan ok");
  expect(g2.by_scope["look"].effect_class == kedov::color::RestorationClass::A_reversible,
         "lock forces class A");

  return failures;
}
