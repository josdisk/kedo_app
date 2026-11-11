#include "kedov/color/grade.hpp"

#include <cmath>
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

int test_color_grade_main() {
  using namespace kedov::color;

  GradeParams identity;
  const Rgb mid{0.18, 0.18, 0.18};
  auto r = evaluate(identity, mid, false);
  expect(r.applied, "identity grade applies");
  expect(std::abs(r.out.r - mid.r) < 1e-9, "identity preserves mid gray r");

  GradeParams sat = identity;
  sat.saturation = 0.0;
  const Rgb vivid{0.8, 0.2, 0.1};
  r = evaluate(sat, vivid, false);
  expect(std::abs(r.out.r - r.out.g) < 1e-6 && std::abs(r.out.g - r.out.b) < 1e-6,
         "zero saturation collapses to luma");

  GradeParams lifted = identity;
  lifted.lift = 0.1;
  r = evaluate(lifted, mid, false);
  expect(r.out.r > mid.r, "positive lift brightens");

  GradeParams gen = identity;
  gen.effect_class = RestorationClass::C_generative;
  r = evaluate(gen, mid, true);
  expect(!r.applied, "authenticity lock blocks class C");
  expect(r.out.r == mid.r, "class C returns original under lock");

  GradeParams est = identity;
  est.effect_class = RestorationClass::B_estimated;
  r = evaluate(est, mid, true);
  expect(r.applied, "class B still applies under lock with warning");
  expect(r.message.find("warning") != std::string::npos, "class B warning message");

  auto merged = apply_deltas(identity, "blue_saturation_delta", -0.08);
  expect(merged.saturation < 1.0, "plan delta reduces saturation");

  auto bad = sanitize(GradeParams{.gamma = -5.0, .saturation = 99.0});
  expect(bad.gamma > 0.0 && bad.saturation <= 2.0, "sanitize clamps unsafe params");

  return failures;
}
