# AGENTS.md — KeDo Smart V

Instructions for AI coding agents working in this monorepo.

## Source of truth

- Product requirements: `docs/product/` and `product_documentation/`
- Requirement IDs (`ING-*`, `SYN-*`, `TIM-*`, …) are stable; reference them in commits, tests, and status docs
- Architecture decisions: `docs/adr/`

## Stack boundaries

| Layer | Stack |
|---|---|
| Native media | C++20/23, CMake, FFmpeg (compliant), OCIO |
| Desktop UI | Qt (subject to license approval) — keep UI out of portable libs |
| Business API | NestJS + OpenAPI |
| AI gateway | Python FastAPI + Pydantic |
| Marketing | Next.js App Router → Vercel |
| Studio SaaS | Next.js App Router → ECS |
| Contracts | `packages/contracts` (JSON Schema + TS) |

Do not cross forbidden boundaries: `native/*` must not depend on Next/Nest; marketing must not ship native decoders or DB credentials; AI services must not mutate timeline rows directly.

## Implementation rules

1. Prefer working vertical slices over empty folder trees.
2. Never invent versions — pin from registries.
3. Mark deferred work in `docs/release/BACKLOG.md` and status in `IMPLEMENTATION_STATUS.md`.
4. No fake “production” connections — label demo fixtures explicitly.
5. LLMs produce schema-validated `EditPlan` only; never treat plan JSON as already applied.
6. Preserve originals; proxies and edits are disposable/append-only.
7. Sync results must report frame error + confidence; never fabricate confidence.

## Milestone order

0 Scaffold → 1 Import/timeline → 2 Take-aware sync → 3 Colour + first cut → later AI/cloud/mobile.

Complete the current slice and document next tasks rather than claiming the full product is shipped.

## Security

- Verify auth, privacy policy, media owner, target revision, schemas, and provider cost before execution.
- No LLM filesystem/shell/deploy/public-post/payment tools.
- Never commit customer footage, private keys, or heavy model weights.
