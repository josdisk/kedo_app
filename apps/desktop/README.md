# KeDo Smart V Desktop

Qt 6 / QML NLE shell (agent · preview · library · timeline) over portable `native/*` libs.

**License gate:** local **LGPL-dev** builds only (`KEDOV_ENABLE_QT=ON`). Shipping / redistribution still requires sign-off in `licenses/THIRD_PARTY_APPROVAL.md`. Commercial Qt modules are not used.

## Prerequisites

- CMake ≥ 3.24, Ninja, C++20 toolchain
- Qt 6.5+ with Quick + QuickControls2
- Set prefix so CMake can find Qt, e.g.:

```bash
export CMAKE_PREFIX_PATH="${CMAKE_PREFIX_PATH}:/Users/josue/Qt/6.7.3/macos"
```

## Build & run

```bash
cd native
cmake --preset desktop-qt
cmake --build --preset desktop-qt
# macOS bundle:
open "./build/desktop-qt/kedov_desktop_build/KeDo Smart V.app"
# or run the binary inside Contents/MacOS
```

Without Qt installed, leave `KEDOV_ENABLE_QT=OFF` (default) and use the ingest CLI + studio-web scrub path.

## What this slice does

- Dense Edit workspace: tool rail, project bins, Source + Program monitors, inspector (Agent / Inspect / Colour / Sound), multi-track timeline with filmstrip/waveform chrome, audio meters
- Demo project fixture (`proj_demo_music`) with scrubbable proxy preview (PLAY-003 generations)
- **Open** → `NativeBridge` probes via `kedov::io::create_default_probe()` (stub or ffprobe backend)
- EditPlan apply stays explicit (Agent panel; API wire next)

## Qt-free native CLIs

```bash
cd native
cmake --preset dev-make
cmake --build --preset dev-make
./build/dev-make/kedov_ingest_cli scrub /path/to/media 48 ./out/f48.ppm 24 1
```
