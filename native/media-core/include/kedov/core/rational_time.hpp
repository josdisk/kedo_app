#pragma once

#include <cstdint>
#include <compare>
#include <stdexcept>
#include <string>

namespace kedov::core {

/// Canonical media time as a reduced rational (TIM-001). Never use float seconds as source of truth.
class RationalTime {
 public:
  RationalTime() = default;
  RationalTime(std::int64_t numerator, std::int64_t denominator);

  static RationalTime from_frames(std::int64_t frame_index, std::int64_t fps_num, std::int64_t fps_den);
  static RationalTime from_samples(std::int64_t sample_index, std::int64_t sample_rate);

  [[nodiscard]] std::int64_t numerator() const noexcept { return num_; }
  [[nodiscard]] std::int64_t denominator() const noexcept { return den_; }

  [[nodiscard]] RationalTime add(const RationalTime& other) const;
  [[nodiscard]] RationalTime sub(const RationalTime& other) const;
  [[nodiscard]] std::int64_t to_frame_floor(std::int64_t fps_num, std::int64_t fps_den) const;
  [[nodiscard]] double to_seconds_approx() const;
  [[nodiscard]] std::string to_string() const;

  auto operator<=>(const RationalTime&) const = default;

 private:
  static std::int64_t gcd(std::int64_t a, std::int64_t b);
  void reduce();

  std::int64_t num_ = 0;
  std::int64_t den_ = 1;
};

}  // namespace kedov::core
