#pragma once

#include "kedov/color/grade.hpp"
#include "kedov/timeline/sequence.hpp"

#include <cstdint>
#include <map>
#include <string>
#include <variant>
#include <vector>

namespace kedov::timeline {

struct PlanOpReplace {
  std::string target_clip_id;
  std::string source_asset_id;
  std::int64_t start_frame = 0;
  std::int64_t end_frame = 0;
  std::int64_t source_in_frame = 0;
};

struct PlanOpGrade {
  std::string scope;
  std::map<std::string, double> parameters;
};

struct PlanOpSlip {
  std::string clip_id;
  std::int64_t delta_frames = 0;
};

using PlanOp = std::variant<PlanOpReplace, PlanOpGrade, PlanOpSlip>;

struct PortablePlan {
  std::string sequence_id;
  std::uint64_t expected_revision = 0;
  bool preserve_master_audio = false;
  bool authenticity_lock = false;
  std::vector<PlanOp> operations;
};

struct GradeBook {
  std::map<std::string, kedov::color::GradeParams> by_scope;
};

struct PlanApplyResult {
  bool ok = false;
  std::string error;
  std::uint64_t revision = 0;
  std::size_t applied = 0;
  std::size_t skipped = 0;
};

/// Apply a portable first-cut / EditPlan projection onto Sequence + GradeBook (AGT/TIM/COL).
[[nodiscard]] PlanApplyResult apply_portable_plan(Sequence& sequence,
                                                  GradeBook& grades,
                                                  const PortablePlan& plan);

}  // namespace kedov::timeline
