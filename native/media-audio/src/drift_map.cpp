#include "kedov/audio/drift_map.hpp"

#include <algorithm>
#include <cmath>
#include <cstdlib>

namespace kedov::audio {
namespace {

std::int64_t gcd_i64(std::int64_t a, std::int64_t b) {
  a = std::llabs(a);
  b = std::llabs(b);
  while (b != 0) {
    const auto t = a % b;
    a = b;
    b = t;
  }
  return a == 0 ? 1 : a;
}

void reduce_slope(std::int64_t& num, std::int64_t& den) {
  if (den == 0) {
    num = 1;
    den = 1;
    return;
  }
  if (den < 0) {
    num = -num;
    den = -den;
  }
  const auto g = gcd_i64(num, den);
  num /= g;
  den /= g;
  if (num == 0) {
    den = 1;
  }
}

AffineSegment unity_segment(std::int64_t source_start, std::int64_t source_end,
                            std::int64_t master_start) {
  AffineSegment s;
  s.source_start = source_start;
  s.source_end = source_end;
  s.master_start = master_start;
  s.slope_num = 1;
  s.slope_den = 1;
  s.uncertainty_samples = 0;
  return s;
}

}  // namespace

std::int64_t map_source_to_master(const DriftMap& map, std::int64_t source_sample) {
  if (map.segments.empty()) return source_sample;
  const AffineSegment* chosen = &map.segments.front();
  for (const auto& seg : map.segments) {
    if (source_sample >= seg.source_start && source_sample <= seg.source_end) {
      chosen = &seg;
      break;
    }
    if (source_sample > seg.source_end) chosen = &seg;
  }
  const auto delta = source_sample - chosen->source_start;
  // Exact rational: master_start + delta * slope_num / slope_den (trunc toward zero for ints).
  return chosen->master_start + (delta * chosen->slope_num) / chosen->slope_den;
}

AffineSegment fit_linear_segment(const DriftAnchor& a, const DriftAnchor& b) {
  AffineSegment s;
  s.source_start = std::min(a.source_sample, b.source_sample);
  s.source_end = std::max(a.source_sample, b.source_sample);
  const DriftAnchor& left = a.source_sample <= b.source_sample ? a : b;
  const DriftAnchor& right = a.source_sample <= b.source_sample ? b : a;
  s.master_start = left.master_sample;
  const auto ds = right.source_sample - left.source_sample;
  const auto dm = right.master_sample - left.master_sample;
  if (ds == 0) {
    s.slope_num = 1;
    s.slope_den = 1;
  } else {
    s.slope_num = dm;
    s.slope_den = ds;
    reduce_slope(s.slope_num, s.slope_den);
  }
  const double conf = std::min(left.confidence, right.confidence);
  s.uncertainty_samples =
      conf >= 0.9 ? 1 : conf >= 0.7 ? 4 : conf >= 0.4 ? 16 : 64;
  return s;
}

DriftMap build_piecewise_map(const std::vector<DriftAnchor>& anchors_in) {
  DriftMap out;
  if (anchors_in.empty()) {
    out.note = "no anchors";
    return out;
  }
  auto anchors = anchors_in;
  std::sort(anchors.begin(), anchors.end(),
            [](const DriftAnchor& x, const DriftAnchor& y) {
              return x.source_sample < y.source_sample;
            });
  // Deduplicate identical source samples (keep higher confidence).
  std::vector<DriftAnchor> uniq;
  for (const auto& a : anchors) {
    if (!uniq.empty() && uniq.back().source_sample == a.source_sample) {
      if (a.confidence >= uniq.back().confidence) uniq.back() = a;
      continue;
    }
    uniq.push_back(a);
  }

  if (uniq.size() == 1) {
    out.segments.push_back(
        unity_segment(uniq[0].source_sample, uniq[0].source_sample, uniq[0].master_sample));
    out.note = "single anchor — constant offset (unity slope)";
    return out;
  }

  for (std::size_t i = 0; i + 1 < uniq.size(); ++i) {
    out.segments.push_back(fit_linear_segment(uniq[i], uniq[i + 1]));
    if (out.segments.back().slope_num != out.segments.back().slope_den) {
      out.has_drift = true;
    }
  }

  // Residuals vs map at anchors.
  double acc = 0.0;
  for (const auto& a : uniq) {
    const auto pred = map_source_to_master(out, a.source_sample);
    acc += std::llabs(pred - a.master_sample);
  }
  out.mean_abs_residual = acc / static_cast<double>(uniq.size());
  out.note = out.has_drift ? "piecewise affine drift map" : "piecewise unity / constant offset";
  return out;
}

DriftMap estimate_drift_map(const std::vector<float>& master, const std::vector<float>& clip,
                            std::int64_t max_lag_samples, std::size_t window_samples,
                            std::size_t hop_samples) {
  DriftMap out;
  if (master.empty() || clip.empty()) {
    out.note = "empty audio";
    return out;
  }
  if (window_samples < 256) window_samples = 256;
  if (hop_samples < 64) hop_samples = 64;

  std::vector<DriftAnchor> anchors;
  for (std::size_t start = 0; start + window_samples <= clip.size(); start += hop_samples) {
    std::vector<float> window(clip.begin() + static_cast<std::ptrdiff_t>(start),
                              clip.begin() + static_cast<std::ptrdiff_t>(start + window_samples));
    const auto est = correlate_offset(master, window, max_lag_samples);
    if (est.confidence < 0.35 || est.ambiguous) continue;
    // correlate_offset: positive means clip starts later vs master →
    // master_sample ≈ source_sample + sample_offset for window origin on clip.
    DriftAnchor a;
    a.source_sample = static_cast<std::int64_t>(start);
    a.master_sample = a.source_sample + est.sample_offset;
    a.confidence = est.confidence;
    anchors.push_back(a);
  }

  if (anchors.size() < 2) {
    // Fall back to whole-clip constant offset.
    const auto est = correlate_offset(master, clip, max_lag_samples);
    const std::int64_t last =
        static_cast<std::int64_t>(clip.empty() ? 0 : clip.size() - 1);
    DriftAnchor a0;
    a0.source_sample = 0;
    a0.master_sample = est.sample_offset;
    a0.confidence = est.confidence;
    DriftAnchor a1;
    a1.source_sample = last;
    a1.master_sample = last + est.sample_offset;
    a1.confidence = est.confidence;
    out = build_piecewise_map({a0, a1});
    out.note = "insufficient window anchors — constant-offset fallback";
    return out;
  }

  out = build_piecewise_map(anchors);
  return out;
}

}  // namespace kedov::audio
