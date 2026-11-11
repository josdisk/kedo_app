#include "kedov/io/media_probe.hpp"

#include <iostream>

int main(int argc, char** argv) {
  if (argc < 2) {
    std::cerr << "Usage: kedov_probe_cli <media-path>\n"
              << "Probes media metadata without modifying the source file (ING-002).\n";
    return 2;
  }

  const auto probe = kedov::io::create_default_probe();
  const auto result = probe->probe(argv[1]);
  std::cout << "backend=" << result.probe_backend << "\n"
            << "container=" << result.container << "\n"
            << "quarantined=" << (result.quarantined ? "true" : "false") << "\n";
  if (!result.quarantine_reason.empty()) {
    std::cout << "reason=" << result.quarantine_reason << "\n";
  }
  return result.quarantined ? 1 : 0;
}
