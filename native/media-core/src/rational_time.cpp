#include "kedov/core/rational_time.hpp"

#include <cmath>
#include <cstdlib>

namespace kedov::core {

RationalTime::RationalTime(std::int64_t numerator, std::int64_t denominator)
    : num_(numerator), den_(denominator) {
  if (den_ == 0) {
    throw std::invalid_argument("RationalTime denominator must not be zero");
  }
  reduce();
}

RationalTime RationalTime::from_frames(std::int64_t frame_index, std::int64_t fps_num,
                                       std::int64_t fps_den) {
  if (fps_num <= 0 || fps_den <= 0) {
    throw std::invalid_argument("fps must be positive");
  }
  // time = frame * (fps_den / fps_num)
  return RationalTime(frame_index * fps_den, fps_num);
}

RationalTime RationalTime::from_samples(std::int64_t sample_index, std::int64_t sample_rate) {
  if (sample_rate <= 0) {
    throw std::invalid_argument("sample_rate must be positive");
  }
  return RationalTime(sample_index, sample_rate);
}

std::int64_t RationalTime::gcd(std::int64_t a, std::int64_t b) {
  a = std::llabs(a);
  b = std::llabs(b);
  while (b != 0) {
    const auto t = a % b;
    a = b;
    b = t;
  }
  return a == 0 ? 1 : a;
}

void RationalTime::reduce() {
  if (den_ < 0) {
    num_ = -num_;
    den_ = -den_;
  }
  const auto g = gcd(num_, den_);
  num_ /= g;
  den_ /= g;
}

RationalTime RationalTime::add(const RationalTime& other) const {
  return RationalTime(num_ * other.den_ + other.num_ * den_, den_ * other.den_);
}

RationalTime RationalTime::sub(const RationalTime& other) const {
  return RationalTime(num_ * other.den_ - other.num_ * den_, den_ * other.den_);
}

std::int64_t RationalTime::to_frame_floor(std::int64_t fps_num, std::int64_t fps_den) const {
  if (fps_num <= 0 || fps_den <= 0) {
    throw std::invalid_argument("fps must be positive");
  }
  // frame = time * fps = (num/den) * (fps_num/fps_den)
  const __int128 num = static_cast<__int128>(num_) * fps_num;
  const __int128 den = static_cast<__int128>(den_) * fps_den;
  return static_cast<std::int64_t>(num / den);
}

double RationalTime::to_seconds_approx() const {
  return static_cast<double>(num_) / static_cast<double>(den_);
}

std::string RationalTime::to_string() const {
  return std::to_string(num_) + "/" + std::to_string(den_);
}

}  // namespace kedov::core
