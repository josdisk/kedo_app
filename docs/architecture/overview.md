# Architecture overview (R0)

```text
apps/marketing  ──► Vercel
apps/studio-web ──► ECS (later) ──► services/api (NestJS)
                                 └► services/ai-api (FastAPI) ──► EditPlan (unexecuted)
apps/desktop    ──► Qt (license-gated) ──► native/* C++ media libs
```

Shared contracts: `packages/contracts` (TS) and `python/kedo-ai-core` (Pydantic).
Canonical time: `kedov::core::RationalTime`. Sync: `kedov::audio::correlate_offset`.
