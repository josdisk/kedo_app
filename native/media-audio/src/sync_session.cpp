#include "kedov/audio/sync_session.hpp"

#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <fstream>
#include <map>
#include <sstream>

namespace kedov::audio {
namespace {

std::string json_escape(const std::string& s) {
  std::string out;
  out.reserve(s.size() + 8);
  for (char c : s) {
    switch (c) {
      case '"':
        out += "\\\"";
        break;
      case '\\':
        out += "\\\\";
        break;
      case '\n':
        out += "\\n";
        break;
      default:
        out += c;
        break;
    }
  }
  return out;
}

std::optional<std::string> extract_string(const std::string& json, const std::string& key,
                                          std::size_t from = 0) {
  const std::string pat = "\"" + key + "\"";
  auto pos = json.find(pat, from);
  if (pos == std::string::npos) return std::nullopt;
  pos = json.find(':', pos);
  if (pos == std::string::npos) return std::nullopt;
  pos = json.find('"', pos);
  if (pos == std::string::npos) return std::nullopt;
  const auto start = pos + 1;
  std::string out;
  for (std::size_t i = start; i < json.size(); ++i) {
    if (json[i] == '\\' && i + 1 < json.size()) {
      out.push_back(json[i + 1]);
      ++i;
      continue;
    }
    if (json[i] == '"') return out;
    out.push_back(json[i]);
  }
  return std::nullopt;
}

std::optional<std::int64_t> extract_int(const std::string& json, const std::string& key,
                                        std::size_t from = 0) {
  const std::string pat = "\"" + key + "\"";
  auto pos = json.find(pat, from);
  if (pos == std::string::npos) return std::nullopt;
  pos = json.find(':', pos);
  if (pos == std::string::npos) return std::nullopt;
  ++pos;
  while (pos < json.size() && (json[pos] == ' ' || json[pos] == '\t')) ++pos;
  char* end = nullptr;
  const auto v = std::strtoll(json.c_str() + pos, &end, 10);
  if (end == json.c_str() + pos) return std::nullopt;
  return v;
}

std::optional<double> extract_double(const std::string& json, const std::string& key,
                                     std::size_t from = 0) {
  const std::string pat = "\"" + key + "\"";
  auto pos = json.find(pat, from);
  if (pos == std::string::npos) return std::nullopt;
  pos = json.find(':', pos);
  if (pos == std::string::npos) return std::nullopt;
  ++pos;
  while (pos < json.size() && (json[pos] == ' ' || json[pos] == '\t')) ++pos;
  char* end = nullptr;
  const auto v = std::strtod(json.c_str() + pos, &end);
  if (end == json.c_str() + pos) return std::nullopt;
  return v;
}

bool extract_bool(const std::string& json, const std::string& key, bool default_value,
                  std::size_t from = 0) {
  const std::string pat = "\"" + key + "\"";
  auto pos = json.find(pat, from);
  if (pos == std::string::npos) return default_value;
  pos = json.find(':', pos);
  if (pos == std::string::npos) return default_value;
  const auto slice = json.substr(pos, 16);
  if (slice.find("true") != std::string::npos) return true;
  if (slice.find("false") != std::string::npos) return false;
  return default_value;
}

double mean(const std::vector<float>& v, std::size_t start, std::size_t len) {
  double s = 0.0;
  for (std::size_t i = 0; i < len; ++i) s += v[start + i];
  return s / static_cast<double>(len);
}

}  // namespace

GroupingResult group_takes_and_angles(const std::vector<GroupingInput>& clips,
                                      std::int64_t concurrence_window_ms) {
  GroupingResult out;
  if (clips.empty()) return out;

  // Explicit take IDs first; else cluster by wall-clock proximity; else one take per clip.
  std::map<std::string, std::string> asset_to_take;
  int auto_take = 1;

  for (const auto& clip : clips) {
    if (clip.explicit_take_id && !clip.explicit_take_id->empty()) {
      asset_to_take[clip.asset_id] = *clip.explicit_take_id;
      continue;
    }
    std::string assigned;
    if (clip.recorded_at_ms) {
      for (const auto& other : clips) {
        if (other.asset_id == clip.asset_id) continue;
        if (!other.recorded_at_ms) continue;
        const auto delta = std::llabs(*other.recorded_at_ms - *clip.recorded_at_ms);
        if (delta <= concurrence_window_ms) {
          auto it = asset_to_take.find(other.asset_id);
          if (it != asset_to_take.end()) {
            assigned = it->second;
            break;
          }
        }
      }
    }
    if (assigned.empty()) {
      assigned = "take_" + std::to_string(auto_take++);
    }
    asset_to_take[clip.asset_id] = assigned;
  }

  // Ensure mutual concurrence merges into same take (union-ish second pass).
  for (const auto& a : clips) {
    if (!a.recorded_at_ms) continue;
    for (const auto& b : clips) {
      if (a.asset_id == b.asset_id || !b.recorded_at_ms) continue;
      if (std::llabs(*a.recorded_at_ms - *b.recorded_at_ms) > concurrence_window_ms) continue;
      // Prefer explicit labels; otherwise unify to lexicographically smaller take id.
      if (a.explicit_take_id || b.explicit_take_id) continue;
      auto& ta = asset_to_take[a.asset_id];
      auto& tb = asset_to_take[b.asset_id];
      if (ta != tb) {
        const auto keep = ta < tb ? ta : tb;
        const auto drop = ta < tb ? tb : ta;
        for (auto& [asset, take] : asset_to_take) {
          if (take == drop) take = keep;
        }
      }
    }
  }

  std::map<std::string, Take> takes;
  for (const auto& clip : clips) {
    const auto take_id = asset_to_take[clip.asset_id];
    if (!takes.count(take_id)) {
      Take t;
      t.take_id = take_id;
      t.label = take_id;
      t.recorded_at_ms = clip.recorded_at_ms;
      takes.emplace(take_id, t);
    }
    CameraAngle angle;
    angle.angle_id = "angle_" + clip.asset_id;
    angle.take_id = take_id;
    angle.asset_id = clip.asset_id;
    angle.camera_label = clip.camera_label.empty() ? clip.asset_id : clip.camera_label;
    out.angles.push_back(angle);
  }
  for (auto& [id, t] : takes) {
    (void)id;
    out.takes.push_back(t);
  }
  std::sort(out.takes.begin(), out.takes.end(),
            [](const Take& a, const Take& b) { return a.take_id < b.take_id; });
  return out;
}

std::vector<AlignmentHypothesis> top_correlation_peaks(const std::vector<float>& master,
                                                       const std::vector<float>& clip,
                                                       std::int64_t max_lag_samples,
                                                       std::size_t max_peaks) {
  std::vector<AlignmentHypothesis> peaks;
  if (master.empty() || clip.empty() || max_peaks == 0) return peaks;

  struct Cand {
    std::int64_t lag;
    double corr;
  };
  std::vector<Cand> cands;
  cands.reserve(static_cast<std::size_t>(max_lag_samples * 2 + 1));

  for (std::int64_t lag = -max_lag_samples; lag <= max_lag_samples; lag += 8) {
    const std::size_t m0 = lag >= 0 ? static_cast<std::size_t>(lag) : 0;
    const std::size_t c0 = lag >= 0 ? 0 : static_cast<std::size_t>(-lag);
    const std::size_t len = std::min(master.size() > m0 ? master.size() - m0 : 0,
                                     clip.size() > c0 ? clip.size() - c0 : 0);
    if (len < 32) continue;
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
    if (den <= 1e-12) continue;
    cands.push_back({lag, num / den});
  }

  std::sort(cands.begin(), cands.end(),
            [](const Cand& a, const Cand& b) { return a.corr > b.corr; });

  // Non-maximum suppression: keep peaks separated by >= 200 samples.
  for (const auto& c : cands) {
    bool near = false;
    for (const auto& p : peaks) {
      if (std::llabs(p.sample_offset - c.lag) < 200) {
        near = true;
        break;
      }
    }
    if (near) continue;
    AlignmentHypothesis h;
    h.sample_offset = c.lag;
    h.peak_correlation = c.corr;
    h.confidence = std::clamp(c.corr, 0.0, 1.0);
    h.note = peaks.empty() ? "primary" : "alternate";
    peaks.push_back(h);
    if (peaks.size() >= max_peaks) break;
  }
  return peaks;
}

std::vector<ClipAlignment> align_clips_to_master(
    const std::vector<float>& master,
    const std::vector<std::pair<std::string, std::vector<float>>>& clips,
    const GroupingResult& grouping,
    std::int32_t sample_rate,
    std::int64_t fps_num,
    std::int64_t fps_den,
    std::int64_t max_lag_samples) {
  std::map<std::string, const CameraAngle*> by_asset;
  for (const auto& a : grouping.angles) by_asset[a.asset_id] = &a;

  std::vector<ClipAlignment> out;
  out.reserve(clips.size());
  for (const auto& [asset_id, mono] : clips) {
    ClipAlignment al;
    al.asset_id = asset_id;
    if (auto it = by_asset.find(asset_id); it != by_asset.end()) {
      al.take_id = it->second->take_id;
      al.angle_id = it->second->angle_id;
    } else {
      al.take_id = "take_unknown";
      al.angle_id = "angle_" + asset_id;
    }

    const auto est = correlate_offset(master, mono, max_lag_samples);
    al.sample_offset = est.sample_offset;
    al.confidence = est.confidence;
    al.peak_correlation = est.peak_correlation;
    al.ambiguous = est.ambiguous;
    al.note = est.note;
    al.frame_error_approx =
        sample_offset_to_frame_error(est.sample_offset, sample_rate, fps_num, fps_den);
    al.alternates = top_correlation_peaks(master, mono, max_lag_samples, 3);
    if (al.alternates.size() > 1 &&
        (al.alternates[0].peak_correlation - al.alternates[1].peak_correlation) < 0.05) {
      al.ambiguous = true;
      if (al.confidence > 0.85) al.confidence = 0.85;  // never fabricate certainty
      al.note = "multiple strong peaks; possible repeated chorus ambiguity";
    }
    al.anchors.push_back(SyncAnchor{
        .source_sample = 0,
        .master_sample = est.sample_offset,
        .confidence = al.confidence,
    });
    out.push_back(std::move(al));
  }
  return out;
}

bool apply_manual_override(SyncSession& session, const std::string& asset_id,
                           std::int64_t sample_offset, const std::string& note) {
  for (auto& al : session.alignments) {
    if (al.asset_id != asset_id) continue;
    al.sample_offset = sample_offset;
    al.user_override = true;
    al.ambiguous = false;
    al.confidence = 1.0;
    al.note = note;
    al.frame_error_approx = sample_offset_to_frame_error(
        sample_offset, session.sample_rate, session.fps_num, session.fps_den);
    al.anchors = {SyncAnchor{0, sample_offset, 1.0}};
    return true;
  }
  return false;
}

std::string sync_session_to_json(const SyncSession& session) {
  std::ostringstream o;
  o << "{\n";
  o << "  \"session_id\": \"" << json_escape(session.session_id) << "\",\n";
  o << "  \"project_id\": \"" << json_escape(session.project_id) << "\",\n";
  o << "  \"master_asset_id\": \"" << json_escape(session.master_asset_id) << "\",\n";
  o << "  \"algorithm_version\": \"" << json_escape(session.algorithm_version) << "\",\n";
  o << "  \"sample_rate\": " << session.sample_rate << ",\n";
  o << "  \"fps_num\": " << session.fps_num << ",\n";
  o << "  \"fps_den\": " << session.fps_den << ",\n";
  o << "  \"created_at\": \"" << json_escape(session.created_at_iso) << "\",\n";
  o << "  \"takes\": [";
  for (std::size_t i = 0; i < session.takes.size(); ++i) {
    const auto& t = session.takes[i];
    if (i) o << ",";
    o << "{\"take_id\":\"" << json_escape(t.take_id) << "\",\"label\":\"" << json_escape(t.label)
      << "\"";
    if (t.recorded_at_ms) o << ",\"recorded_at_ms\":" << *t.recorded_at_ms;
    o << "}";
  }
  o << "],\n  \"angles\": [";
  for (std::size_t i = 0; i < session.angles.size(); ++i) {
    const auto& a = session.angles[i];
    if (i) o << ",";
    o << "{\"angle_id\":\"" << json_escape(a.angle_id) << "\",\"take_id\":\""
      << json_escape(a.take_id) << "\",\"asset_id\":\"" << json_escape(a.asset_id)
      << "\",\"camera_label\":\"" << json_escape(a.camera_label) << "\"}";
  }
  o << "],\n  \"alignments\": [";
  for (std::size_t i = 0; i < session.alignments.size(); ++i) {
    const auto& al = session.alignments[i];
    if (i) o << ",";
    o << "{"
      << "\"asset_id\":\"" << json_escape(al.asset_id) << "\","
      << "\"take_id\":\"" << json_escape(al.take_id) << "\","
      << "\"angle_id\":\"" << json_escape(al.angle_id) << "\","
      << "\"sample_offset\":" << al.sample_offset << ","
      << "\"confidence\":" << al.confidence << ","
      << "\"peak_correlation\":" << al.peak_correlation << ","
      << "\"frame_error_approx\":" << al.frame_error_approx << ","
      << "\"ambiguous\":" << (al.ambiguous ? "true" : "false") << ","
      << "\"user_override\":" << (al.user_override ? "true" : "false") << ","
      << "\"note\":\"" << json_escape(al.note) << "\","
      << "\"alternates\":[";
    for (std::size_t j = 0; j < al.alternates.size(); ++j) {
      const auto& h = al.alternates[j];
      if (j) o << ",";
      o << "{\"sample_offset\":" << h.sample_offset << ",\"confidence\":" << h.confidence
        << ",\"peak_correlation\":" << h.peak_correlation << ",\"note\":\"" << json_escape(h.note)
        << "\"}";
    }
    o << "]}";
  }
  o << "]\n}\n";
  return o.str();
}

bool sync_session_from_json(const std::string& json, SyncSession& out, std::string* error) {
  auto sid = extract_string(json, "session_id");
  auto pid = extract_string(json, "project_id");
  auto mid = extract_string(json, "master_asset_id");
  if (!sid || !pid || !mid) {
    if (error) *error = "missing required session fields";
    return false;
  }
  out = SyncSession{};
  out.session_id = *sid;
  out.project_id = *pid;
  out.master_asset_id = *mid;
  if (auto v = extract_string(json, "algorithm_version")) out.algorithm_version = *v;
  if (auto v = extract_int(json, "sample_rate")) out.sample_rate = static_cast<std::int32_t>(*v);
  if (auto v = extract_int(json, "fps_num")) out.fps_num = *v;
  if (auto v = extract_int(json, "fps_den")) out.fps_den = *v;
  if (auto v = extract_string(json, "created_at")) out.created_at_iso = *v;

  // Parse alignments array entries by scanning asset_id occurrences inside "alignments".
  const auto alignments_pos = json.find("\"alignments\"");
  if (alignments_pos != std::string::npos) {
    std::size_t search = alignments_pos;
    while (true) {
      auto pos = json.find("\"asset_id\"", search);
      if (pos == std::string::npos) break;
      // Stop if we've left a reasonable region — still accept until end for R0 parser.
      ClipAlignment al;
      if (auto a = extract_string(json, "asset_id", pos)) al.asset_id = *a;
      if (auto a = extract_string(json, "take_id", pos)) al.take_id = *a;
      if (auto a = extract_string(json, "angle_id", pos)) al.angle_id = *a;
      if (auto a = extract_int(json, "sample_offset", pos)) al.sample_offset = *a;
      if (auto a = extract_double(json, "confidence", pos)) al.confidence = *a;
      if (auto a = extract_double(json, "peak_correlation", pos)) al.peak_correlation = *a;
      if (auto a = extract_double(json, "frame_error_approx", pos)) al.frame_error_approx = *a;
      al.ambiguous = extract_bool(json, "ambiguous", false, pos);
      al.user_override = extract_bool(json, "user_override", false, pos);
      if (auto a = extract_string(json, "note", pos)) al.note = *a;
      out.alignments.push_back(al);
      search = pos + 10;
    }
  }

  const auto takes_pos = json.find("\"takes\"");
  if (takes_pos != std::string::npos) {
    std::size_t search = takes_pos;
    const auto angles_pos = json.find("\"angles\"");
    while (true) {
      auto pos = json.find("\"take_id\"", search);
      if (pos == std::string::npos || (angles_pos != std::string::npos && pos >= angles_pos)) break;
      Take t;
      if (auto a = extract_string(json, "take_id", pos)) t.take_id = *a;
      if (auto a = extract_string(json, "label", pos)) t.label = *a;
      if (auto a = extract_int(json, "recorded_at_ms", pos)) t.recorded_at_ms = *a;
      // Avoid duplicating take_ids collected from alignments region.
      if (!t.take_id.empty() &&
          std::none_of(out.takes.begin(), out.takes.end(),
                       [&](const Take& x) { return x.take_id == t.take_id; })) {
        out.takes.push_back(t);
      }
      search = pos + 10;
    }
  }

  const auto angles_pos = json.find("\"angles\"");
  if (angles_pos != std::string::npos) {
    std::size_t search = angles_pos;
    const auto alignments_marker = json.find("\"alignments\"");
    while (true) {
      auto pos = json.find("\"angle_id\"", search);
      if (pos == std::string::npos ||
          (alignments_marker != std::string::npos && pos >= alignments_marker))
        break;
      CameraAngle a;
      if (auto v = extract_string(json, "angle_id", pos)) a.angle_id = *v;
      if (auto v = extract_string(json, "take_id", pos)) a.take_id = *v;
      if (auto v = extract_string(json, "asset_id", pos)) a.asset_id = *v;
      if (auto v = extract_string(json, "camera_label", pos)) a.camera_label = *v;
      out.angles.push_back(a);
      search = pos + 10;
    }
  }

  return true;
}

bool save_sync_session(const SyncSession& session, const std::string& path, std::string* error) {
  std::ofstream out(path);
  if (!out) {
    if (error) *error = "cannot write " + path;
    return false;
  }
  out << sync_session_to_json(session);
  return true;
}

bool load_sync_session(const std::string& path, SyncSession& out, std::string* error) {
  std::ifstream in(path);
  if (!in) {
    if (error) *error = "cannot read " + path;
    return false;
  }
  std::ostringstream ss;
  ss << in.rdbuf();
  return sync_session_from_json(ss.str(), out, error);
}

}  // namespace kedov::audio
