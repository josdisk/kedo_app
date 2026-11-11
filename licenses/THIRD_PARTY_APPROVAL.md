# Third-party license approval gate

**Status:** Draft review checklist for R0. Nothing listed below is approved for shipping GPL-linked or proprietary binaries until counsel/engineering signs off.

| Component | Intended use | Candidate license | Approval | Notes |
|---|---|---|---|---|
| FFmpeg (LGPL build) | Probe/decode/encode | LGPL 2.1+ | Pending | Disable `--enable-gpl` / `--enable-nonfree` in CI |
| Qt 6 | Desktop shell | LGPL / commercial | **LGPL-dev only** | Local `KEDOV_ENABLE_QT=ON` builds allowed (Quick/Controls2). **Not approved to ship/redistribute** until counsel sign-off. No commercial Qt modules. |
| OpenColorIO | Colour pipeline | BSD-3 | Pending | Pin version after Conan/vcpkg integration |
| llama.cpp | Local LLM | MIT | Pending | Optional weights; not bundled |
| NestJS / Next.js / FastAPI | Services & web | MIT | OK for R0 | Standard OSS stack |
| better-sqlite3 / sql.js | Local API DB | MIT / Apache-2.0 | OK for R0 | Dev SQLite; Postgres for prod |

## CI gates (planned)

1. Fail build if FFmpeg configure enables `gpl` or `nonfree` without `ALLOW_FFMPEG_GPL=1`.
2. Fail desktop packaging if Qt commercial modules are linked without `QT_COMMERCIAL_APPROVED=1`.
3. SBOM generation on release tags.

## Decision log

| Date | Decision | Owner |
|---|---|---|
| 2026-11-08 | R0 uses LGPL-compatible assumptions; Qt desktop UI deferred behind approval flag | Engineering |
| 2026-11-08 | Milestone 1 uses optional **system ffprobe/ffmpeg CLI** (subprocess) instead of linking libav; no GPL configure flags in-tree | Engineering |
| 2026-11-10 | Ship packaged `kedov-aces-lite` OCIO-compatible JSON + display transform math; `KEDOV_ENABLE_OCIO` remains OFF until OpenColorIO pin/approval | Engineering |
| 2026-11-10 | Allow **LGPL-dev** Qt6 Quick desktop shell behind `KEDOV_ENABLE_QT`; packaging/redistribution still Pending | Engineering |
