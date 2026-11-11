#include "kedov/audio/sync_correlate.hpp"

#include <algorithm>
#include <cmath>
#include <limits>

namespace kedov::audio {

std::vector<float> energy_envelope(const std::vector<float>& mono, std::size_t hop) {
  if (hop == 0) hop = 1;
  std::vector<float> env;
  env.reserve((mono.size() / hop) + 1);
  for (std::size_t i = 0; i < mono.size(); i += hop) {
    const auto end = std::min(mono.size(), i + hop);
    double acc = 0.0;
    for (std::size_t j = i; j < end; ++j) {
      acc += static_cast<double>(mono[j]) * mono[j];
    }
    env.push_back(static_cast<float>(std::sqrt(acc / static_cast<double>(end - i))));
  }
  return env;
}

namespace {

double mean(const std::vector<float>& v, std::size_t start, std::size_t len) {
  double s = 0.0;
  for (std::size_t i = 0; i < len; ++i) s += v[start + i];
  return s / static_cast<double>(len);
}

double ncc_at(const std::vector<float>& master, const std::vector<float>& clip, std::int64_t lag,
              std::size_t min_len) {
  const std::size_t m0 = lag >= 0 ? static_cast<std::size_t>(lag) : 0;
  const std::size_t c0 = lag >= 0 ? 0 : static_cast<std::size_t>(-lag);
  const std::size_t len =
      std::min(master.size() > m0 ? master.size() - m0 : 0, clip.size() > c0 ? clip.size() - c0 : 0);
  if (len < min_len) return -std::numeric_limits<double>::infinity();
  double num = 0, den_m = 0, den_c = 0;
  const double mm = mean(master, m0, len);
  const double cm = mean(clip, c0, len);
  for (std::size_t i = 0; i < len; ++i) {
    const double a = master[m0 + i] - mm;
    const double b = clip[c0 + i] - cm;
    num += a * b;
    den_m += a * a;
    den_c += b * b;
  }
  const double den = std::sqrt(den_m * den_c);
  if (den <= 1e-12) return -std::numeric_limits<double>::infinity();
  return num / den;
}

}  // namespace

SyncEstimate correlate_offset(const std::vector<float>& master, const std::vector<float>& clip,
                              std::int64_t max_lag_samples) {
  SyncEstimate out;
  if (master.empty() || clip.empty()) {
    out.note = "empty audio";
    out.confidence = 0.0;
    return out;
  }

  // Bound lag by signal lengths so we keep meaningful overlap.
  const std::int64_t max_by_len =
      static_cast<std::int64_t>(std::max<std::size_t>(1, std::min(master.size(), clip.size()) - 32));
  max_lag_samples = std::min(std::abs(max_lag_samples), max_by_len);
  const std::size_t min_overlap = std::max<std::size_t>(64, clip.size() / 8);

  // Coarse pass on energy envelopes.
  constexpr std::size_t hop = 64;
  const auto master_env = energy_envelope(master, hop);
  const auto clip_env = energy_envelope(clip, hop);
  const auto max_lag_env = std::max<std::int64_t>(
      1, max_lag_samples / static_cast<std::int64_t>(hop));
  const std::size_t min_env = std::max<std::size_t>(8, clip_env.size() / 8);

  double best_env = -std::numeric_limits<double>::infinity();
  std::int64_t best_env_lag = 0;
  for (std::int64_t lag = -max_lag_env; lag <= max_lag_env; ++lag) {
    const std::size_t m0 = lag >= 0 ? static_cast<std::size_t>(lag) : 0;
    const std::size_t c0 = lag >= 0 ? 0 : static_cast<std::size_t>(-lag);
    const std::size_t len =
        std::min(master_env.size() > m0 ? master_env.size() - m0 : 0,
                 clip_env.size() > c0 ? clip_env.size() - c0 : 0);
    if (len < min_env) continue;
    double num = 0, den_m = 0, den_c = 0;
    const double mm = mean(master_env, m0, len);
    const double cm = mean(clip_env, c0, len);
    for (std::size_t i = 0; i < len; ++i) {
      const double a = master_env[m0 + i] - mm;
      const double b = clip_env[c0 + i] - cm;
      num += a * b;
      den_m += a * a;
      den_c += b * b;
    }
    const double den = std::sqrt(den_m * den_c);
    if (den <= 1e-12) continue;
    const double corr = num / den;
    if (corr > best_env) {
      best_env = corr;
      best_env_lag = lag;
    }
  }

  const std::int64_t center = best_env_lag * static_cast<std::int64_t>(hop);
  // Wide fine window; if coarse is weak, fall back to strided full search.
  std::int64_t window = static_cast<std::int64_t>(hop) * 32;
  if (best_env < 0.2) window = max_lag_samples;

  double best = -std::numeric_limits<double>::infinity();
  double second = -std::numeric_limits<double>::infinity();
  std::int64_t best_lag = 0;

  auto consider = [&](std::int64_t lag) {
    const double corr = ncc_at(master, clip, lag, min_overlap);
    if (corr > best) {
      second = best;
      best = corr;
      best_lag = lag;
    } else if (corr > second) {
      second = corr;
    }
  };

  const std::int64_t fine_min = std::max<std::int64_t>(-max_lag_samples, center - window);
  const std::int64_t fine_max = std::min(max_lag_samples, center + window);
  for (std::int64_t lag = fine_min; lag <= fine_max; ++lag) consider(lag);

  // Strided global refine when local peak is weak.
  if (best < 0.35) {
    for (std::int64_t lag = -max_lag_samples; lag <= max_lag_samples; lag += 4) consider(lag);
    // Polish around best.
    for (std::int64_t lag = best_lag - 8; lag <= best_lag + 8; ++lag) {
      if (lag < -max_lag_samples || lag > max_lag_samples) continue;
      consider(lag);
    }
  }

  out.sample_offset = best_lag;
  out.peak_correlation = best > -1e300 ? best : 0.0;
  const double separation = best - second;
  out.confidence =
      std::clamp(0.5 * std::max(0.0, best) + 0.5 * std::clamp(separation * 2.0, 0.0, 1.0), 0.0, 1.0);
  out.ambiguous = separation < 0.05 && best > 0.4;
  if (out.ambiguous) {
    out.note = "multiple strong peaks; possible repeated chorus ambiguity";
  } else if (best < 0.25) {
    out.note = "low correlation; treat as approximate";
    out.confidence = std::min(out.confidence, 0.2);
  } else {
    out.note = "ok";
  }
  return out;
}

double sample_offset_to_frame_error(std::int64_t sample_offset, std::int32_t sample_rate,
                                    std::int64_t fps_num, std::int64_t fps_den) {
  if (sample_rate <= 0 || fps_num <= 0 || fps_den <= 0) return 0.0;
  const double seconds = static_cast<double>(sample_offset) / static_cast<double>(sample_rate);
  const double fps = static_cast<double>(fps_num) / static_cast<double>(fps_den);
  return seconds * fps;
}

}  // namespace kedov::audio
