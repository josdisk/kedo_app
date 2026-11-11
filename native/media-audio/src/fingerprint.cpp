#include "kedov/audio/fingerprint.hpp"

#include <algorithm>
#include <cmath>
#include <map>

namespace kedov::audio {
namespace {

constexpr float kPi = 3.14159265358979323846f;

void dft_magnitudes(const float* frame, std::size_t n, std::vector<float>& mags) {
  const std::size_t bins = n / 2;
  mags.assign(bins, 0.f);
  for (std::size_t k = 0; k < bins; ++k) {
    double re = 0.0;
    double im = 0.0;
    for (std::size_t t = 0; t < n; ++t) {
      const double ang = -2.0 * kPi * static_cast<double>(k * t) / static_cast<double>(n);
      re += frame[t] * std::cos(ang);
      im += frame[t] * std::sin(ang);
    }
    mags[k] = static_cast<float>(std::sqrt(re * re + im * im) / static_cast<double>(n));
  }
}

std::vector<float> band_energies(const std::vector<float>& mags, std::int32_t band_count) {
  std::vector<float> bands(static_cast<std::size_t>(band_count), 0.f);
  if (mags.empty() || band_count <= 0) return bands;
  // Log-ish banding: geometrically growing bin spans.
  const std::size_t usable = mags.size();
  double edge = 1.0;
  for (std::int32_t b = 0; b < band_count; ++b) {
    const double next = edge * std::pow(static_cast<double>(usable), 1.0 / band_count);
    const std::size_t i0 = std::min(usable - 1, static_cast<std::size_t>(edge));
    const std::size_t i1 = std::min(usable, static_cast<std::size_t>(std::ceil(next)));
    float acc = 0.f;
    const std::size_t count = i1 > i0 ? i1 - i0 : 1;
    for (std::size_t i = i0; i < i1; ++i) acc += mags[i];
    bands[static_cast<std::size_t>(b)] = acc / static_cast<float>(count);
    edge = next;
  }
  return bands;
}

}  // namespace

std::vector<float> onset_envelope(const std::vector<float>& mono, std::size_t hop) {
  const auto env = energy_envelope(mono, hop == 0 ? 1 : hop);
  std::vector<float> onset;
  onset.reserve(env.size());
  float prev = 0.f;
  for (float e : env) {
    const float d = e - prev;
    onset.push_back(d > 0.f ? d : 0.f);
    prev = e;
  }
  return onset;
}

AudioFingerprint build_fingerprint(const std::vector<float>& mono, std::int32_t sample_rate,
                                   std::size_t frame_size, std::size_t hop_size,
                                   std::int32_t band_count) {
  AudioFingerprint fp;
  fp.sample_rate = sample_rate;
  fp.frame_size = frame_size < 64 ? 64 : frame_size;
  fp.hop_size = hop_size < 32 ? 32 : hop_size;
  fp.band_count = band_count < 2 ? 2 : band_count;
  fp.onset_envelope = onset_envelope(mono, fp.hop_size);

  if (mono.size() < fp.frame_size) {
    return fp;
  }

  std::vector<float> mags;
  std::vector<std::vector<float>> band_series(
      static_cast<std::size_t>(fp.band_count));

  for (std::size_t start = 0; start + fp.frame_size <= mono.size(); start += fp.hop_size) {
    dft_magnitudes(mono.data() + start, fp.frame_size, mags);
    const auto bands = band_energies(mags, fp.band_count);
    for (std::int32_t b = 0; b < fp.band_count; ++b) {
      band_series[static_cast<std::size_t>(b)].push_back(bands[static_cast<std::size_t>(b)]);
    }
  }

  // Peak-pick per band across time → landmarks.
  for (std::int32_t b = 0; b < fp.band_count; ++b) {
    const auto& series = band_series[static_cast<std::size_t>(b)];
    if (series.size() < 3) continue;
    float mean = 0.f;
    for (float v : series) mean += v;
    mean /= static_cast<float>(series.size());
    const float thresh = mean * 1.35f;
    for (std::size_t i = 1; i + 1 < series.size(); ++i) {
      if (series[i] >= series[i - 1] && series[i] >= series[i + 1] && series[i] >= thresh) {
        SpectralLandmark lm;
        lm.sample_index = static_cast<std::int64_t>(i * fp.hop_size);
        lm.band = b;
        lm.strength = series[i];
        fp.landmarks.push_back(lm);
      }
    }
  }

  std::sort(fp.landmarks.begin(), fp.landmarks.end(),
            [](const SpectralLandmark& a, const SpectralLandmark& b) {
              if (a.sample_index != b.sample_index) return a.sample_index < b.sample_index;
              return a.band < b.band;
            });
  return fp;
}

FingerprintMatchResult match_fingerprints(const AudioFingerprint& reference,
                                          const AudioFingerprint& query,
                                          std::int64_t max_lag_samples) {
  FingerprintMatchResult out;
  if (reference.landmarks.empty() || query.landmarks.empty()) {
    out.note = "insufficient landmarks";
    out.best.note = out.note;
    out.best.confidence = 0.0;
    return out;
  }
  max_lag_samples = std::abs(max_lag_samples);

  // Index reference landmarks by band.
  std::vector<std::vector<const SpectralLandmark*>> by_band(
      static_cast<std::size_t>(std::max(1, reference.band_count)));
  for (const auto& lm : reference.landmarks) {
    if (lm.band < 0 || lm.band >= reference.band_count) continue;
    by_band[static_cast<std::size_t>(lm.band)].push_back(&lm);
  }

  std::map<std::int64_t, std::int32_t> votes;
  for (const auto& q : query.landmarks) {
    if (q.band < 0 || q.band >= static_cast<std::int32_t>(by_band.size())) continue;
    for (const auto* r : by_band[static_cast<std::size_t>(q.band)]) {
      const std::int64_t offset = r->sample_index - q.sample_index;
      if (std::llabs(offset) > max_lag_samples) continue;
      // Quantize to hop to coalesce nearby votes.
      const std::int64_t hop = static_cast<std::int64_t>(
          reference.hop_size > 0 ? reference.hop_size : 1);
      const std::int64_t key = (offset / hop) * hop;
      votes[key] += 1;
    }
  }

  if (votes.empty()) {
    out.note = "no landmark offset votes";
    out.best.note = out.note;
    return out;
  }

  std::vector<FingerprintMatch> ranked;
  ranked.reserve(votes.size());
  std::int32_t total = 0;
  for (const auto& [off, count] : votes) {
    total += count;
    FingerprintMatch m;
    m.sample_offset = off;
    m.vote_count = count;
    m.score = static_cast<double>(count);
    m.note = "landmark vote";
    ranked.push_back(m);
  }
  std::sort(ranked.begin(), ranked.end(),
            [](const FingerprintMatch& a, const FingerprintMatch& b) {
              if (a.vote_count != b.vote_count) return a.vote_count > b.vote_count;
              return std::llabs(a.sample_offset) < std::llabs(b.sample_offset);
            });

  const double denom = total > 0 ? static_cast<double>(total) : 1.0;
  for (auto& m : ranked) {
    m.score = static_cast<double>(m.vote_count) / denom;
  }
  out.candidates = ranked;
  if (out.candidates.size() > 8) out.candidates.resize(8);

  out.best.sample_offset = ranked.front().sample_offset;
  out.best.peak_correlation = ranked.front().score;
  out.best.confidence = ranked.front().score;
  out.best.note = "fingerprint landmark match";
  if (ranked.size() >= 2) {
    const double ratio =
        static_cast<double>(ranked[1].vote_count) / static_cast<double>(ranked[0].vote_count);
    if (ratio > 0.85) {
      out.best.ambiguous = true;
      out.best.confidence = std::min(out.best.confidence, 0.7);
      out.best.note = "fingerprint ambiguous — competing landmark peaks";
    }
  }
  out.note = "ok";
  return out;
}

SyncEstimate fingerprint_then_correlate(const std::vector<float>& master,
                                        const std::vector<float>& clip,
                                        std::int32_t sample_rate,
                                        std::int64_t max_lag_samples) {
  const auto ref = build_fingerprint(master, sample_rate);
  const auto qry = build_fingerprint(clip, sample_rate);
  const auto matched = match_fingerprints(ref, qry, max_lag_samples);
  if (matched.candidates.empty()) {
    // Fall back to pure NCC.
    auto ncc = correlate_offset(master, clip, max_lag_samples);
    ncc.note = "fingerprint empty — NCC fallback: " + ncc.note;
    return ncc;
  }

  // Refine around top fingerprint offsets with a tight NCC window.
  SyncEstimate best;
  best.confidence = 0.0;
  best.note = "no refine";
  const std::int64_t refine_radius =
      static_cast<std::int64_t>(std::max<std::size_t>(256, ref.hop_size * 4));
  for (std::size_t i = 0; i < std::min<std::size_t>(3, matched.candidates.size()); ++i) {
    const auto center = matched.candidates[i].sample_offset;
    // Search NCC only near candidate by shifting clip conceptually via lag range.
    // correlate_offset searches [-max_lag, max_lag]; we approximate by correlating
    // with a reduced max_lag around 0 after applying a pre-shift on clip/master.
    std::vector<float> shifted_clip = clip;
    // Positive offset: clip starts later → pad zeros at start of clip for refine view.
    // Instead, restrict max_lag and prefer candidate closest to NCC result.
    auto ncc = correlate_offset(master, clip, std::max(max_lag_samples, std::llabs(center) + refine_radius));
    if (std::llabs(ncc.sample_offset - center) <= refine_radius &&
        ncc.confidence >= best.confidence) {
      best = ncc;
      best.note = "fingerprint+NCC refine";
    }
  }
  if (best.confidence <= 0.0) {
    best = matched.best;
    best.note = "fingerprint only (NCC refine missed)";
  }
  // Soft-blend fingerprint vote into confidence when NCC agrees roughly.
  if (!matched.candidates.empty() &&
      std::llabs(best.sample_offset - matched.candidates.front().sample_offset) <= refine_radius) {
    best.confidence = std::min(1.0, 0.5 * best.confidence + 0.5 * matched.candidates.front().score);
  }
  if (matched.best.ambiguous) best.ambiguous = true;
  return best;
}

}  // namespace kedov::audio
