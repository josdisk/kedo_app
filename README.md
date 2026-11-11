# KeDo App

Desktop application, native C++ media stack, Nest/FastAPI services, and shared packages for **KeDo Smart V**.

| Area | Path |
|---|---|
| Qt / QML desktop | `apps/desktop` (`KEDOV_ENABLE_QT=ON`) |
| Native media | `native/` |
| Business API | `services/api` |
| AI gateway | `services/ai-api` |
| Contracts | `packages/contracts` |

## Desktop (LGPL-dev)

```bash
export CMAKE_PREFIX_PATH="/path/to/Qt/6.x/macos:$CMAKE_PREFIX_PATH"
cd native
cmake --preset desktop-qt
cmake --build --preset desktop-qt
open "./build/desktop-qt/kedov_desktop_build/KeDo Smart V.app"
```

See `apps/desktop/README.md` and `licenses/THIRD_PARTY_APPROVAL.md`.

## API

```bash
pnpm install
pnpm --filter @kedov/contracts build
pnpm dev:api
```

Companion web / marketing repo: [kedo_web](https://github.com/josdisk/kedo_web).
