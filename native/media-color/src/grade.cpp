#include "kedov/color/grade.hpp"

#include <algorithm>

namespace kedov::color {

GradeParams sanitize(GradeParams p) {
  p.lift = std::clamp(p.lift, -1.0, 1.0);
  p.gamma = std::max(0.01, p.gamma);
  p.gain = std::max(0.0, p.gain);
  p.saturation = std::clamp(p.saturation, 0.0, 2.0);
  p.temperature = std::clamp(p.temperature, -1.0, 1.0);
  p.contrast = std::max(0.01, p.contrast);
  p.pivot = std::clamp(p.pivot, 0.0, 1.0);
  return p;
}

namespace {

double luma(const Rgb& c) { return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; }

Rgb lift_gamma_gain(Rgb c, const GradeParams& p) {
  c.r = (c.r + p.lift) * p.gain;
  c.g = (c.g + p.lift) * p.gain;
  c.b = (c.b + p.lift) * p.gain;
  auto tonemap = [&](double v) {
    v = std::max(0.0, v);
    return std::pow(v, 1.0 / p.gamma);
  };
  c.r = tonemap(c.r);
  c.g = tonemap(c.g);
  c.b = tonemap(c.b);
  return c;
}

Rgb apply_contrast(Rgb c, const GradeParams& p) {
  c.r = (c.r - p.pivot) * p.contrast + p.pivot;
  c.g = (c.g - p.pivot) * p.contrast + p.pivot;
  c.b = (c.b - p.pivot) * p.contrast + p.pivot;
  return c;
}

Rgb apply_sat_temp(Rgb c, const GradeParams& p) {
  const double y = luma(c);
  c.r = y + (c.r - y) * p.saturation;
  c.g = y + (c.g - y) * p.saturation;
  c.b = y + (c.b - y) * p.saturation;
  // Temperature: shift R/B oppositely (simple creative control, not full WB math).
  c.r += p.temperature * 0.05;
  c.b -= p.temperature * 0.05;
  return c;
}

}  // namespace

GradeEvalResult evaluate(const GradeParams& raw, Rgb in, bool authenticity_lock) {
  GradeEvalResult result;
  const auto params = sanitize(raw);
  if (authenticity_lock && params.effect_class == RestorationClass::C_generative) {
    result.out = in;
    result.applied = false;
    result.message = "authenticity lock blocks class C generative colour/restoration";
    return result;
  }
  auto out = lift_gamma_gain(in, params);
  out = apply_contrast(out, params);
  out = apply_sat_temp(out, params);
  result.out = out;
  result.applied = true;
  result.message = authenticity_lock && params.effect_class == RestorationClass::B_estimated
                       ? "applied class B estimated grade under authenticity lock (warning)"
                       : "ok";
  return result;
}

GradeParams apply_deltas(GradeParams base, const std::string& key, double delta) {
  if (key == "lift" || key == "lift_delta") base.lift += delta;
  else if (key == "gamma" || key == "gamma_delta") base.gamma += delta;
  else if (key == "gain" || key == "gain_delta") base.gain += delta;
  else if (key == "saturation" || key == "saturation_delta" || key == "blue_saturation_delta") {
    base.saturation += delta;
  } else if (key == "temperature" || key == "temperature_delta") base.temperature += delta;
  else if (key == "contrast" || key == "contrast_delta") base.contrast += delta;
  return sanitize(base);
}

}  // namespace kedov::color
