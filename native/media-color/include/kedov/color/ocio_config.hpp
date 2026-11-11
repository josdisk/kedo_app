#pragma once

#include "kedov/color/grade.hpp"

#include <cstdint>
#include <filesystem>
#include <optional>
#include <string>
#include <vector>

namespace kedov::color {

inline constexpr const char* kOcioConfigVersion = "kedov-aces-lite-1.0";

struct ColorSpaceDesc {
  std::string name;
  std::string family;
  bool is_data = false;
  std::string description;
};

struct DisplayView {
  std::string name;
  std::string colorspace;
  std::string description;
};

struct DisplayDesc {
  std::string name;
  std::vector<DisplayView> views;
};

struct OcioConfig {
  std::string schema_version = "1.0";
  std::string name;
  std::string description;
  bool ocio_compatible = true;
  bool libocio_required = false;
  std::string working_space = "ACEScg";
  std::string role_reference = "ACES2065-1";
  std::string role_scene_linear = "ACEScg";
  std::vector<ColorSpaceDesc> colorspaces;
  std::vector<DisplayDesc> displays;
  std::string source_path;
};

struct DisplayTransformRequest {
  std::string working_space = "ACEScg";
  std::string display = "sRGB";
  std::string view = "ACES";
};

struct DisplayTransformResult {
  Rgb out;
  bool ok = false;
  std::string message;
  std::string path_description;
};

/** Load packaged kedov ACES-lite JSON (COL-002). Does not link libOpenColorIO. */
[[nodiscard]] std::optional<OcioConfig> load_ocio_config(const std::filesystem::path& path,
                                                         std::string* error = nullptr);

/** Builtin packaged config embedded path helper — resolves relative to KEDOV_OCIO_CONFIG or source. */
[[nodiscard]] std::filesystem::path default_ocio_config_path();

[[nodiscard]] bool validate_ocio_config(const OcioConfig& cfg, std::vector<std::string>* errors);

/**
 * Apply display transform ACEScg → chosen display/view (COL-002/011).
 * Approximate ACES Output Transform lite — not a certified Academy OT.
 * Never mutates source media; grade stays scene-referred until this step.
 */
[[nodiscard]] DisplayTransformResult apply_display_transform(Rgb scene_linear_acescg,
                                                             const DisplayTransformRequest& req);

/** Approximate CIE76 ΔE between two display-referred RGB samples in [0,1]. */
[[nodiscard]] double delta_e76_approx(Rgb a, Rgb b);

}  // namespace kedov::color
