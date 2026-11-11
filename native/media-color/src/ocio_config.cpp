#include "kedov/color/ocio_config.hpp"

#include <cmath>
#include <cstdlib>
#include <fstream>
#include <sstream>

namespace kedov::color {
namespace {

// Minimal JSON field extractors for our packaged config (no third-party JSON lib).
std::string extract_string(const std::string& json, const std::string& key) {
  const std::string needle = "\"" + key + "\"";
  const auto pos = json.find(needle);
  if (pos == std::string::npos) return {};
  const auto colon = json.find(':', pos);
  if (colon == std::string::npos) return {};
  const auto q1 = json.find('"', colon + 1);
  if (q1 == std::string::npos) return {};
  const auto q2 = json.find('"', q1 + 1);
  if (q2 == std::string::npos) return {};
  return json.substr(q1 + 1, q2 - q1 - 1);
}

bool extract_bool(const std::string& json, const std::string& key, bool fallback) {
  const std::string needle = "\"" + key + "\"";
  const auto pos = json.find(needle);
  if (pos == std::string::npos) return fallback;
  const auto colon = json.find(':', pos);
  if (colon == std::string::npos) return fallback;
  const auto rest = json.substr(colon + 1, 16);
  if (rest.find("true") != std::string::npos) return true;
  if (rest.find("false") != std::string::npos) return false;
  return fallback;
}

void collect_named_objects(const std::string& json, const std::string& array_key,
                           const std::string& name_field,
                           std::vector<std::string>* names) {
  const std::string needle = "\"" + array_key + "\"";
  auto pos = json.find(needle);
  if (pos == std::string::npos || !names) return;
  const auto arr = json.find('[', pos);
  if (arr == std::string::npos) return;
  const auto end = json.find(']', arr);
  if (end == std::string::npos) return;
  const auto slice = json.substr(arr, end - arr);
  const std::string field = "\"" + name_field + "\"";
  std::size_t cursor = 0;
  while (true) {
    const auto npos = slice.find(field, cursor);
    if (npos == std::string::npos) break;
    const auto colon = slice.find(':', npos);
    const auto q1 = slice.find('"', colon + 1);
    const auto q2 = slice.find('"', q1 + 1);
    if (q1 == std::string::npos || q2 == std::string::npos) break;
    names->push_back(slice.substr(q1 + 1, q2 - q1 - 1));
    cursor = q2 + 1;
  }
}

Rgb mul_mat3(const double m[9], Rgb in) {
  return Rgb{
      m[0] * in.r + m[1] * in.g + m[2] * in.b,
      m[3] * in.r + m[4] * in.g + m[5] * in.b,
      m[6] * in.r + m[7] * in.g + m[8] * in.b,
  };
}

double srgb_eotf(double lin) {
  if (lin <= 0.0031308) return 12.92 * lin;
  return 1.055 * std::pow(lin, 1.0 / 2.4) - 0.055;
}

Rgb clamp01(Rgb c) {
  auto sat = [](double v) { return std::min(1.0, std::max(0.0, v)); };
  return Rgb{sat(c.r), sat(c.g), sat(c.b)};
}

Rgb rgb_to_approx_lab(Rgb rgb) {
  // Very small CIE Lab approx via XYZ D65 for ΔE testing — not a full CMS.
  const double m[9] = {
      0.4124564, 0.3575761, 0.1804375, 0.2126729, 0.7151522,
      0.0721750, 0.0193339, 0.1191920, 0.9503041,
  };
  Rgb xyz = mul_mat3(m, rgb);
  auto f = [](double t) {
    return t > 0.008856 ? std::cbrt(t) : (7.787 * t + 16.0 / 116.0);
  };
  const double fx = f(xyz.r / 0.95047);
  const double fy = f(xyz.g / 1.00000);
  const double fz = f(xyz.b / 1.08883);
  return Rgb{116.0 * fy - 16.0, 500.0 * (fx - fy), 200.0 * (fy - fz)};
}

}  // namespace

std::filesystem::path default_ocio_config_path() {
  if (const char* env = std::getenv("KEDOV_OCIO_CONFIG")) {
    return std::filesystem::path(env);
  }
#ifdef KEDOV_OCIO_CONFIG_PATH
  return std::filesystem::path(KEDOV_OCIO_CONFIG_PATH);
#else
  return std::filesystem::path("native/media-color/ocio/kedov_aces_lite.json");
#endif
}

std::optional<OcioConfig> load_ocio_config(const std::filesystem::path& path, std::string* error) {
  std::ifstream in(path);
  if (!in) {
    if (error) *error = "cannot open OCIO config: " + path.string();
    return std::nullopt;
  }
  std::ostringstream ss;
  ss << in.rdbuf();
  const std::string json = ss.str();

  OcioConfig cfg;
  cfg.source_path = path.string();
  cfg.schema_version = extract_string(json, "schema_version");
  if (cfg.schema_version.empty()) cfg.schema_version = "1.0";
  cfg.name = extract_string(json, "name");
  cfg.description = extract_string(json, "description");
  cfg.ocio_compatible = extract_bool(json, "ocio_compatible", true);
  cfg.libocio_required = extract_bool(json, "libocio_required", false);
  cfg.working_space = extract_string(json, "working_space");
  if (cfg.working_space.empty()) cfg.working_space = "ACEScg";

  // Roles block — search within file for role keys.
  cfg.role_reference = extract_string(json, "reference");
  if (cfg.role_reference.empty()) cfg.role_reference = "ACES2065-1";
  cfg.role_scene_linear = extract_string(json, "scene_linear");
  if (cfg.role_scene_linear.empty()) cfg.role_scene_linear = "ACEScg";

  std::vector<std::string> cs_names;
  collect_named_objects(json, "colorspaces", "name", &cs_names);
  for (const auto& n : cs_names) {
    ColorSpaceDesc d;
    d.name = n;
    d.family = n.find("ACES") != std::string::npos ? "ACES"
               : n.find("Rec") != std::string::npos || n == "sRGB" ? "Display"
               : n == "Raw"                                       ? "Data"
                                                                  : "Other";
    d.is_data = (n == "Raw");
    cfg.colorspaces.push_back(d);
  }

  std::vector<std::string> display_names;
  collect_named_objects(json, "displays", "name", &display_names);
  // Prefer known packaged displays if parse is sparse.
  if (display_names.empty()) {
    display_names = {"sRGB", "Rec.709"};
  }
  for (const auto& dn : display_names) {
    DisplayDesc d;
    d.name = dn;
    if (dn == "sRGB") {
      d.views.push_back({"ACES", "sRGB", "ACEScg → sRGB display"});
      d.views.push_back({"Un-tone-mapped", "Linear Rec.709", "Linear Rec.709 view"});
    } else {
      d.views.push_back({"ACES", "sRGB", "Rec.709 monitor via sRGB EOTF approx"});
    }
    cfg.displays.push_back(d);
  }
  return cfg;
}

bool validate_ocio_config(const OcioConfig& cfg, std::vector<std::string>* errors) {
  auto fail = [&](const std::string& m) {
    if (errors) errors->push_back(m);
  };
  bool ok = true;
  if (cfg.name.empty()) {
    fail("missing name");
    ok = false;
  }
  if (cfg.working_space.empty()) {
    fail("missing working_space");
    ok = false;
  }
  if (cfg.colorspaces.empty()) {
    fail("no colorspaces");
    ok = false;
  }
  if (cfg.displays.empty()) {
    fail("no displays");
    ok = false;
  }
  bool has_working = false;
  for (const auto& cs : cfg.colorspaces) {
    if (cs.name == cfg.working_space) has_working = true;
  }
  if (!has_working) {
    fail("working_space not listed in colorspaces");
    ok = false;
  }
  return ok;
}

DisplayTransformResult apply_display_transform(Rgb scene_linear_acescg,
                                               const DisplayTransformRequest& req) {
  DisplayTransformResult out;
  if (req.working_space != "ACEScg") {
    out.message = "unsupported working_space (packaged lite supports ACEScg)";
    return out;
  }
  if (req.display != "sRGB" && req.display != "Rec.709") {
    out.message = "unsupported display";
    return out;
  }

  // ACEScg (AP1) → XYZ (D60) → linear Rec.709 (D65) — simplified public ACES matrices.
  // Source: Academy ACES documentation (approximation for packaging tests).
  static const double acescg_to_xyz[9] = {
      0.6624541811, 0.1341932422, 0.1562437705, 0.2722287168, 0.6740817658,
      0.0536895174, -0.0055746495, 0.0040607335, 1.0103391003,
  };
  static const double xyz_to_rec709[9] = {
      3.2404542, -1.5371385, -0.4985314, -0.9692660, 1.8760108,
      0.0415560, 0.0556434, -0.2040259, 1.0572252,
  };

  Rgb xyz = mul_mat3(acescg_to_xyz, scene_linear_acescg);
  Rgb lin709 = mul_mat3(xyz_to_rec709, xyz);

  if (req.view == "Un-tone-mapped") {
    out.out = lin709;
    out.ok = true;
    out.path_description = "ACEScg → XYZ → Linear Rec.709";
    out.message = "ok";
    return out;
  }

  // Soft shoulder then sRGB EOTF (lite OT stand-in).
  auto soft = [](double v) {
    const double x = std::max(0.0, v);
    return x / (x + 0.18) * 0.18 * (1.0 + x);  // gentle compress
  };
  Rgb mapped{soft(lin709.r), soft(lin709.g), soft(lin709.b)};
  out.out = clamp01(Rgb{srgb_eotf(mapped.r), srgb_eotf(mapped.g), srgb_eotf(mapped.b)});
  out.ok = true;
  out.path_description = "ACEScg → XYZ → Rec.709 → soft OT → sRGB EOTF";
  out.message = "ok";
  return out;
}

double delta_e76_approx(Rgb a, Rgb b) {
  const Rgb la = rgb_to_approx_lab(clamp01(a));
  const Rgb lb = rgb_to_approx_lab(clamp01(b));
  const double dL = la.r - lb.r;
  const double da = la.g - lb.g;
  const double db = la.b - lb.b;
  return std::sqrt(dL * dL + da * da + db * db);
}

}  // namespace kedov::color
