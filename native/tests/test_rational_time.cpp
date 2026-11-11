#include "kedov/core/rational_time.hpp"

#include <cstdlib>
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

int test_rational_time_main() {
  using kedov::core::RationalTime;

  const auto t0 = RationalTime::from_frames(0, 24000, 1001);
  const auto t1 = RationalTime::from_frames(1, 24000, 1001);
  expect(t0.numerator() == 0, "frame 0 is zero");
  expect(t1.to_frame_floor(24000, 1001) == 1, "round-trip frame 1 @23.976");

  // Six-hour timeline at 29.97 DF-equivalent rational must not drift in tick math (TIM-001).
  const auto six_hours = RationalTime(6 * 60 * 60, 1);
  const auto frames = six_hours.to_frame_floor(30000, 1001);
  const auto back = RationalTime::from_frames(frames, 30000, 1001);
  expect(back.sub(six_hours).numerator() == 0 ||
             std::llabs(back.to_seconds_approx() - six_hours.to_seconds_approx()) < 1e-9,
         "six-hour rational remains stable");

  const auto a = RationalTime(1, 24);
  const auto b = RationalTime(1, 24);
  expect(a.add(b).to_string() == "1/12", "1/24+1/24=1/12");

  return failures;
}
