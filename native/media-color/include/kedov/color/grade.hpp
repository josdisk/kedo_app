#pragma once

#include <cmath>
#include <string>

namespace kedov::color {

enum class RestorationClass {
  A_reversible,      // exposure/transform — authenticity lock OK
  B_estimated,       // denoise/deblur — allowed with warning
  C_generative,      // synthesis — blocked by authenticity lock
};

struct Rgb {
  double r = 0.0;
  double g = 0.0;
  double b = 0.0;
};

/// Primary grade controls (COL-007). Non-destructive: applied as params, not baked into source.
struct GradeParams {
  double lift = 0.0;          // shadows offset [-1, 1]
  double gamma = 1.0;         // midtones power (>0)
  double gain = 1.0;          // highlights scale (>0)
  double saturation = 1.0;    // 0..2
  double temperature = 0.0;   // blue↔amber [-1, 1]
  double contrast = 1.0;      // around pivot
  double pivot = 0.18;        // middle gray
  std::string working_space = "ACEScg";  // intent label; OCIO wiring later
  RestorationClass effect_class = RestorationClass::A_reversible;
};

struct GradeEvalResult {
  Rgb out;
  bool applied = false;
  std::string message;
};

[[nodiscard]] inline const char* to_string(RestorationClass c) {
  switch (c) {
    case RestorationClass::A_reversible:
      return "A";
    case RestorationClass::B_estimated:
      return "B";
    case RestorationClass::C_generative:
      return "C";
  }
  return "A";
}

/// Clamp grade params into safe ranges without mutating source pixels.
[[nodiscard]] GradeParams sanitize(GradeParams p);

/// Evaluate grade on a scene-referred RGB sample (linear-ish). Does not mutate media.
[[nodiscard]] GradeEvalResult evaluate(const GradeParams& params, Rgb in,
                                       bool authenticity_lock = false);

/// Merge delta parameters (from EditPlan adjust_grade) into a grade.
[[nodiscard]] GradeParams apply_deltas(GradeParams base,
                                       const std::string& key,
                                       double delta);

}  // namespace kedov::color
