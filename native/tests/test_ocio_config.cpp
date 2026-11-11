#include "kedov/color/ocio_config.hpp"

#include <cmath>
#include <filesystem>
#include <iostream>
#include <string>
#include <vector>

namespace {

int failures = 0;

void expect(bool cond, const char* msg) {
  if (!cond) {
    std::cerr << "FAIL: " << msg << "\n";
    ++failures;
  }
}

}  // namespace

int test_ocio_config_main() {
  using namespace kedov::color;

  const auto path = std::filesystem::path(KEDOV_OCIO_CONFIG_PATH);
  std::string err;
  const auto cfg = load_ocio_config(path, &err);
  expect(cfg.has_value(), "load packaged config");
  if (!cfg) {
    std::cerr << err << "\n";
    return failures;
  }
  expect(cfg->name == "kedov-aces-lite", "config name");
  expect(cfg->working_space == "ACEScg", "working ACEScg");
  expect(!cfg->libocio_required, "no libocio required");

  std::vector<std::string> errors;
  expect(validate_ocio_config(*cfg, &errors), "validate ok");
  expect(errors.empty(), "no validation errors");

  const Rgb mid{0.18, 0.18, 0.18};
  DisplayTransformRequest req{.working_space = "ACEScg", .display = "sRGB", .view = "ACES"};
  const auto a = apply_display_transform(mid, req);
  const auto b = apply_display_transform(mid, req);
  expect(a.ok && b.ok, "display transform ok");
  expect(delta_e76_approx(a.out, b.out) < 0.01, "deterministic display");
  expect(a.out.r > 0.0 && a.out.r < 1.0, "display in range");

  const auto self = delta_e76_approx(a.out, a.out);
  expect(self < 1.0, "deltaE self < 1");

  DisplayTransformRequest bad{.working_space = "Nope", .display = "sRGB", .view = "ACES"};
  expect(!apply_display_transform(mid, bad).ok, "unsupported fails closed");

  return failures;
}
